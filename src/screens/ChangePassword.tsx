import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../auth/api';
import { useAuth } from '../auth/AuthContext';
import { Card, Header } from '../components/ui';

export default function ChangePassword({ forced = false }: { forced?: boolean }) {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== again) { setError('New passwords do not match.'); return; }
    setBusy(true); setError(null);
    try { setUser(await changePassword(current, next)); if (!forced) nav('/settings'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not change password.'); }
    finally { setBusy(false); }
  }

  return (
    <div className={forced ? 'page' : ''}>
      <Header title={forced ? 'Set a new password' : 'Change password'} back={forced ? undefined : '/settings'} />
      <form onSubmit={submit}>
        <Card>
          {forced && <p className="small">Welcome, {user?.name}. You signed in with a temporary password. Choose your own to continue.</p>}
          <label className="field"><span>{forced ? 'Temporary password' : 'Current password'}</span>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required /></label>
          <label className="field"><span>New password (8+ characters)</span>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <label className="field"><span>Repeat new password</span>
            <input type="password" value={again} onChange={e => setAgain(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
          {error && <p className="error small">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={busy}>Save password</button>
          {forced && <button type="button" className="btn btn--ghost btn--block" onClick={logout} style={{ marginTop: 8 }}>Sign out</button>}
        </Card>
      </form>
    </div>
  );
}
