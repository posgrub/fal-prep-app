export type AccountRole = 'admin' | 'learner';
export interface Account {
  id: string; email: string; name: string; role: AccountRole;
  mustChangePassword: boolean; createdAt: string; lastLoginAt?: string | null;
}

const CACHE_KEY = 'fal-auth-user';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || `Request failed (${res.status})`);
  return body as T;
}

export function cachedUser(): Account | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function cache(u: Account | null) {
  try { if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u)); else localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/** Returns the signed-in account. Offline: falls back to the cached account so the PWA keeps working. */
export async function fetchMe(): Promise<Account | null> {
  try {
    const { user } = await call<{ user: Account }>('/api/auth/me');
    cache(user); return user;
  } catch (e) {
    if (e instanceof ApiError) { if (e.status === 401) cache(null); return e.status === 401 ? null : cachedUser(); }
    return cachedUser();                        // network failure → offline mode
  }
}

export async function login(email: string, password: string): Promise<Account> {
  const { user } = await call<{ user: Account }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  cache(user); return user;
}
export async function logout(): Promise<void> {
  await call('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  cache(null);
}
export async function changePassword(current: string, next: string): Promise<Account> {
  const { user } = await call<{ user: Account }>('/api/auth/password', { method: 'POST', body: JSON.stringify({ current, next }) });
  cache(user); return user;
}
export async function updateProfileName(name: string): Promise<Account> {
  const { user } = await call<{ user: Account }>('/api/auth/profile', { method: 'POST', body: JSON.stringify({ name }) });
  cache(user); return user;
}

// ---- admin ----
export const listUsers = () => call<{ users: Account[] }>('/api/users').then(r => r.users);
export const createUser = (data: { email: string; name?: string; role?: AccountRole; password: string }) =>
  call<{ user: Account }>('/api/users', { method: 'POST', body: JSON.stringify(data) }).then(r => r.user);
export const resetUserPassword = (id: string, password: string) =>
  call('/api/users/' + id + '/password', { method: 'POST', body: JSON.stringify({ password }) });
export const updateUser = (id: string, data: { role?: AccountRole; name?: string }) =>
  call<{ user: Account }>('/api/users/' + id, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.user);
export const deleteUser = (id: string) => call('/api/users/' + id, { method: 'DELETE' });
