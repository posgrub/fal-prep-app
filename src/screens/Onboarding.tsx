import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, todayIso, uid } from '../db/db';
import { Card } from '../components/ui';

export default function Onboarding() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'learner' | 'reviewer' | 'admin'>('learner');
  const [startDate, setStartDate] = useState(todayIso());
  const [tfm11, setTfm11] = useState('');
  const [tfm12, setTfm12] = useState('');
  const [days, setDays] = useState(5);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await db.userProfile.add({
      id: uid(), name: name.trim(), role, startDate, studyDaysPerWeek: days,
      tfm11ExamDate: tfm11 || undefined, tfm12ExamDate: tfm12 || undefined,
      createdAt: new Date().toISOString(),
    });
    nav('/', { replace: true });
  }

  return (
    <div className="page">
      <Card className="card--hero">
        <h1>FAL Prep</h1>
        <p className="muted">Texas Fire Alarm Technician license: TFM11 (statutes & rules) and TFM12 (technical). Review, then pass a daily test to unlock the next day.</p>
      </Card>
      <form onSubmit={submit}>
        <Card>
          <label className="field"><span>Your name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" required autoComplete="name" /></label>
          <label className="field"><span>Role</span>
            <select value={role} onChange={e => setRole(e.target.value as typeof role)}>
              <option value="learner">Learner (studying for the license)</option>
              <option value="reviewer">Reviewer (licensed FAL / APS)</option>
              <option value="admin">Admin / manager</option>
            </select></label>
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
      </form>
    </div>
  );
}
