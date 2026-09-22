import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { createUser, deleteUser, listUsers, resetUserPassword, updateUser, type Account, type AccountRole } from '../auth/api';
import { useAuth } from '../auth/AuthContext';
import { Badge, Card, Header } from '../components/ui';

function tempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AccountRole>('learner');
  const [password, setPassword] = useState(tempPassword());
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const reload = () => listUsers().then(setUsers).catch(e => setError(e.message));
  useEffect(() => { reload(); }, []);

  if (me && me.role !== 'admin') return <Navigate to="/settings" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const u = await createUser({ email: email.trim(), name: name.trim() || undefined, role, password });
      setCreated({ email: u.email, password });
      setEmail(''); setName(''); setRole('learner'); setPassword(tempPassword());
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create user.'); }
    finally { setBusy(false); }
  }

  async function reset(u: Account) {
    const pw = tempPassword();
    if (!confirm(`Reset ${u.email}'s password to a new temporary one?`)) return;
    try { await resetUserPassword(u.id, pw); setCreated({ email: u.email, password: pw }); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not reset password.'); }
  }
  async function toggleRole(u: Account) {
    const next: AccountRole = u.role === 'admin' ? 'learner' : 'admin';
    if (!confirm(`Make ${u.email} ${next === 'admin' ? 'an admin' : 'a student'}?`)) return;
    try { await updateUser(u.id, { role: next }); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update user.'); }
  }
  async function remove(u: Account) {
    if (!confirm(`Delete the account ${u.email}? Their study progress stays on their own device.`)) return;
    try { await deleteUser(u.id); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete user.'); }
  }

  return (
    <>
      <Header title="Users" back="/settings" />
      {created && (
        <Card style={{ borderColor: 'var(--good)' }}>
          <h3>Share these sign-in details</h3>
          <p className="small">Email: <strong>{created.email}</strong><br />Temporary password: <code style={{ fontSize: '1.1rem' }}>{created.password}</code></p>
          <p className="small muted">They will be asked to choose their own password at first sign-in. This password is shown only once.</p>
          <div className="row">
            <button className="btn btn--sm" onClick={() => navigator.clipboard?.writeText(`FAL Prep: https://${location.host}\nEmail: ${created.email}\nTemporary password: ${created.password}`)}>Copy</button>
            <button className="btn btn--sm btn--ghost" onClick={() => setCreated(null)}>Dismiss</button>
          </div>
        </Card>
      )}
      <form onSubmit={submit}>
        <Card>
          <h3>Add a student</h3>
          <label className="field"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required inputMode="email" /></label>
          <label className="field"><span>Name <span className="muted">(optional)</span></span><input value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="field"><span>Role</span>
            <select value={role} onChange={e => setRole(e.target.value as AccountRole)}>
              <option value="learner">Student</option>
              <option value="admin">Admin</option>
            </select></label>
          <label className="field"><span>Temporary password</span>
            <div className="row"><input value={password} onChange={e => setPassword(e.target.value)} minLength={8} required style={{ flex: 1 }} /><button type="button" className="btn btn--sm" onClick={() => setPassword(tempPassword())}>New</button></div></label>
          {error && <p className="error small">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={busy || !email}>Create account</button>
        </Card>
      </form>
      <Card>
        <h3>Accounts {users && <span className="muted small">({users.length})</span>}</h3>
        {!users && !error && <p className="muted small">Loading…</p>}
        <ul className="list">
          {users?.map(u => (
            <li key={u.id} className="list__item" style={{ display: 'block' }}>
              <div className="row row--between">
                <div><strong>{u.name}</strong> <span className="muted small">{u.email}</span></div>
                <Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role === 'admin' ? 'Admin' : 'Student'}</Badge>
              </div>
              <div className="small muted">{u.lastLoginAt ? `Last sign-in ${u.lastLoginAt.slice(0, 10)}` : 'Never signed in'}{u.mustChangePassword ? ' · temporary password' : ''}</div>
              {u.id !== me?.id && (
                <div className="row" style={{ marginTop: 6 }}>
                  <button className="btn btn--sm" onClick={() => reset(u)}>Reset password</button>
                  <button className="btn btn--sm" onClick={() => toggleRole(u)}>{u.role === 'admin' ? 'Make student' : 'Make admin'}</button>
                  <button className="btn btn--sm" style={{ color: 'var(--bad)' }} onClick={() => remove(u)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
