// FAL Prep API + static server. Dependency-free: node:http + node:sqlite (Node 22.13+).
// Accounts live in SQLite; study progress stays in the browser (IndexedDB) per user.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DIST = process.env.DIST_DIR || path.join(__dirname, '..', 'dist');
const COOKIE = 'fal_session';
const SESSION_DAYS = 30;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'falprep.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('admin','learner')),
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );
`);

// ---- secrets & seed --------------------------------------------------------
function meta(key, makeDefault) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  if (row) return row.value;
  const v = makeDefault();
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(key, v);
  return v;
}
const SECRET = process.env.SESSION_SECRET || meta('session_secret', () => crypto.randomBytes(32).toString('hex'));

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [, saltHex, hashHex] = stored.split('$');
  const hash = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

/** SEED_USERS="email:role:password;email:role:password" — only creates accounts that don't exist. */
function seed() {
  const spec = process.env.SEED_USERS || '';
  for (const entry of spec.split(';').map(s => s.trim()).filter(Boolean)) {
    const [email, role, password] = entry.split(':');
    if (!email || !password) continue;
    const e = email.toLowerCase();
    if (db.prepare('SELECT 1 FROM account WHERE email = ?').get(e)) continue;
    db.prepare('INSERT INTO account (id, email, name, role, password_hash, must_change_password, created_by, created_at) VALUES (?,?,?,?,?,1,?,?)')
      .run(crypto.randomUUID(), e, e.split('@')[0], role === 'admin' ? 'admin' : 'learner', hashPassword(password), 'seed', new Date().toISOString());
    console.log(`[seed] created ${role} ${e}`);
  }
}
seed();

// ---- sessions --------------------------------------------------------------
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => { const [k, ...v] = c.trim().split('='); if (k) out[k] = decodeURIComponent(v.join('=')); });
  return out;
}
function sessionCookie(token, maxAgeSec) {
  const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === '1';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}
function currentUser(req) {
  const p = verify(parseCookies(req)[COOKIE]);
  if (!p) return null;
  return db.prepare('SELECT id, email, name, role, must_change_password, created_at, last_login_at FROM account WHERE id = ?').get(p.uid) || null;
}
const publicUser = u => u && ({ id: u.id, email: u.email, name: u.name, role: u.role, mustChangePassword: !!u.must_change_password, createdAt: u.created_at, lastLoginAt: u.last_login_at });

// ---- tiny rate limit on login --------------------------------------------
const fails = new Map();
function tooManyFails(ip) {
  const f = fails.get(ip);
  return f && f.count >= 10 && Date.now() - f.at < 15 * 60 * 1000;
}
function noteFail(ip) { const f = fails.get(ip) || { count: 0, at: Date.now() }; if (Date.now() - f.at > 15 * 60 * 1000) { f.count = 0; f.at = Date.now(); } f.count++; fails.set(ip, f); }

// ---- helpers ---------------------------------------------------------------
function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 64 * 1024) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });
}
const emailOk = e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;
const pwOk = p => typeof p === 'string' && p.length >= 8 && p.length <= 200;

// ---- API -------------------------------------------------------------------
async function api(req, res, url) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const m = req.method;
  const p = url.pathname;

  if (p === '/api/health') return json(res, 200, { ok: true });

  if (p === '/api/auth/login' && m === 'POST') {
    if (tooManyFails(ip)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const { email, password } = await readJson(req);
    const u = emailOk(email) ? db.prepare('SELECT * FROM account WHERE email = ?').get(email.toLowerCase()) : null;
    if (!u || !verifyPassword(String(password ?? ''), u.password_hash)) { noteFail(ip); return json(res, 401, { error: 'Wrong email or password.' }); }
    db.prepare('UPDATE account SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), u.id);
    const token = sign({ uid: u.id, exp: Date.now() + SESSION_DAYS * 86400000 });
    return json(res, 200, { user: publicUser(u) }, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
  }
  if (p === '/api/auth/logout' && m === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });

  const me = currentUser(req);
  if (!me) return json(res, 401, { error: 'Not signed in.' });

  if (p === '/api/auth/me' && m === 'GET') return json(res, 200, { user: publicUser(me) });

  if (p === '/api/auth/password' && m === 'POST') {
    const { current, next } = await readJson(req);
    const full = db.prepare('SELECT password_hash FROM account WHERE id = ?').get(me.id);
    if (!verifyPassword(String(current ?? ''), full.password_hash)) return json(res, 400, { error: 'Current password is wrong.' });
    if (!pwOk(next)) return json(res, 400, { error: 'New password must be at least 8 characters.' });
    db.prepare('UPDATE account SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hashPassword(next), me.id);
    return json(res, 200, { user: publicUser({ ...me, must_change_password: 0 }) });
  }
  if (p === '/api/auth/profile' && m === 'POST') {
    const { name } = await readJson(req);
    if (typeof name !== 'string' || !name.trim() || name.length > 120) return json(res, 400, { error: 'Name is required.' });
    db.prepare('UPDATE account SET name = ? WHERE id = ?').run(name.trim(), me.id);
    return json(res, 200, { user: publicUser({ ...me, name: name.trim() }) });
  }

  // ---- admin ----
  if (!p.startsWith('/api/users')) return json(res, 404, { error: 'Not found' });
  if (me.role !== 'admin') return json(res, 403, { error: 'Admins only.' });

  if (p === '/api/users' && m === 'GET') {
    const rows = db.prepare('SELECT id, email, name, role, must_change_password, created_at, last_login_at FROM account ORDER BY role, email').all();
    return json(res, 200, { users: rows.map(publicUser) });
  }
  if (p === '/api/users' && m === 'POST') {
    const { email, name, role, password } = await readJson(req);
    if (!emailOk(email)) return json(res, 400, { error: 'Enter a valid email.' });
    if (!pwOk(password)) return json(res, 400, { error: 'Temporary password must be at least 8 characters.' });
    const e = email.toLowerCase();
    if (db.prepare('SELECT 1 FROM account WHERE email = ?').get(e)) return json(res, 409, { error: 'That email already has an account.' });
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO account (id, email, name, role, password_hash, must_change_password, created_by, created_at) VALUES (?,?,?,?,?,1,?,?)')
      .run(id, e, (name || '').trim() || e.split('@')[0], role === 'admin' ? 'admin' : 'learner', hashPassword(password), me.id, new Date().toISOString());
    return json(res, 201, { user: publicUser(db.prepare('SELECT * FROM account WHERE id = ?').get(id)) });
  }
  const mm = p.match(/^\/api\/users\/([^/]+)(?:\/(password))?$/);
  if (!mm) return json(res, 404, { error: 'Not found' });
  const target = db.prepare('SELECT * FROM account WHERE id = ?').get(mm[1]);
  if (!target) return json(res, 404, { error: 'No such user.' });

  if (mm[2] === 'password' && m === 'POST') {
    const { password } = await readJson(req);
    if (!pwOk(password)) return json(res, 400, { error: 'Password must be at least 8 characters.' });
    db.prepare('UPDATE account SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hashPassword(password), target.id);
    return json(res, 200, { ok: true });
  }
  if (!mm[2] && m === 'PATCH') {
    const { role, name } = await readJson(req);
    if (target.id === me.id && role && role !== 'admin') return json(res, 400, { error: 'You cannot demote yourself.' });
    if (role && !['admin', 'learner'].includes(role)) return json(res, 400, { error: 'Bad role.' });
    db.prepare('UPDATE account SET role = COALESCE(?, role), name = COALESCE(?, name) WHERE id = ?').run(role ?? null, typeof name === 'string' && name.trim() ? name.trim() : null, target.id);
    return json(res, 200, { user: publicUser(db.prepare('SELECT * FROM account WHERE id = ?').get(target.id)) });
  }
  if (!mm[2] && m === 'DELETE') {
    if (target.id === me.id) return json(res, 400, { error: 'You cannot delete yourself.' });
    db.prepare('DELETE FROM account WHERE id = ?').run(target.id);
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

// ---- static ----------------------------------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.txt': 'text/plain', '.map': 'application/json' };
function serveStatic(req, res, url) {
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  let stat = fs.existsSync(file) ? fs.statSync(file) : null;
  if (stat?.isDirectory()) { file = path.join(file, 'index.html'); stat = fs.existsSync(file) ? fs.statSync(file) : null; }
  if (!stat) { file = path.join(DIST, 'index.html'); stat = fs.statSync(file); }   // SPA fallback
  const ext = path.extname(file).toLowerCase();
  const immutable = url.pathname.startsWith('/assets/');
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  if (ext === '.pdf') headers['Content-Disposition'] = 'inline';
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'Server error' });
  }
}).listen(PORT, () => console.log(`FAL Prep listening on :${PORT}, data in ${DATA_DIR}`));
