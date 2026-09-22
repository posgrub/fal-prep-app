import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, todayIso } from '../db/db';
import { useAuth } from '../auth/AuthContext';
import { updateProfileName } from '../auth/api';
import { Card } from '../components/ui';

export default function Onboarding() {
  const nav = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [startDate, setStartDate] = useState(todayIso());
  const [tfm11, setTfm11] = useState('');
  const [tfm12, setTfm12] = useState('');
  const [days, setDays] = useState(5);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setBusy(true);
    await db.userProfile.add({
      id: user.id, name: name.trim(), role: user.role === 'admin' ? 'admin' : 'learner', startDate, studyDaysPerWeek: days,
      tfm11ExamDate: tfm11 || undefined, tfm12ExamDate: tfm12 || undefined,
      createdAt: new Date().toISOString(),
    });
    if (name.trim() !== user.name) updateProfileName(name.trim()).then(setUser).catch(() => undefined);
    nav('/', { replace: true });
  }

  return (
    <div className="page">
      <Card className="card--hero">
        <h1>Welcome to FAL Prep</h1>
        <p className="muted">Signed in as {user?.email} ({user?.role === 'admin' ? 'admin' : 'student'}). Review, then pass a daily test to unlock the next day.</p>
      </Card>
      <form onSubmit={submit}>
        <Card>
          <label className="field"><span>Your name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" required autoComplete="name" /></label>
          <label className="field"><span>Class start date</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></label>
          <label className="field"><span>Study days per week</span>
            <select value={days} onChange={e => setDays(Number(e.target.value))}>
              {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select></label>
        </Card>
        <Card>
          <h2>Target exam dates <span className="muted small">(optional, you can add later)</span></h2>
          <label className="field"><span>TFM11 – Statutes & Rules</span>
            <input type="date" value={tfm11} onChange={e => setTfm11(e.target.value)} /></label>
          <label className="field"><span>TFM12 – Technical</span>
            <input type="date" value={tfm12} onChange={e => setTfm12(e.target.value)} /></label>
          <p className="small muted">Real exams: 50 questions, 70% to pass, once per week, max 3 tries per 12 months. The app will tell you when you are ready to schedule.</p>
        </Card>
        <button className="btn btn--primary btn--block" disabled={busy || !name.trim()}>Start the course</button>
        <button type="button" className="btn btn--ghost btn--block" onClick={logout} style={{ marginTop: 8 }}>Sign out</button>
      </form>
    </div>
  );
}
