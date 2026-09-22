import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(email.trim(), password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="page">
      <Card className="card--hero">
        <h1>FAL Prep</h1>
        <p className="muted">Texas Fire Alarm Technician license trainer: TFM11 and TFM12.</p>
      </Card>
      <form onSubmit={submit}>
        <Card>
          <h2>Sign in</h2>
          <label className="field"><span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" inputMode="email" required autoFocus /></label>
          <label className="field"><span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          {error && <p className="error small">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="small muted" style={{ marginTop: 10 }}>No account? Ask your manager to create one for you.</p>
        </Card>
      </form>
    </div>
  );
}
