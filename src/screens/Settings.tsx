import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db, type UserProfile } from '../db/db';
import { contentVersion } from '../content';
import { Card, Header } from '../components/ui';

export default function Settings({ profile }: { profile: UserProfile }) {
  const [form, setForm] = useState({ name: profile.name, tfm11: profile.tfm11ExamDate ?? '', tfm12: profile.tfm12ExamDate ?? '', days: profile.studyDaysPerWeek, reminder: profile.reminderTime ?? '' });
  const [saved, setSaved] = useState(false);

  async function save() {
    await db.userProfile.update(profile.id, {
      name: form.name.trim() || profile.name,
      tfm11ExamDate: form.tfm11 || undefined,
      tfm12ExamDate: form.tfm12 || undefined,
      studyDaysPerWeek: form.days,
      reminderTime: form.reminder || undefined,
    });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  async function reset() {
    if (!confirm('Delete all local progress, attempts and your profile on this device? This cannot be undone.')) return;
    await db.delete();
    location.href = '/';
  }

  return (
    <>
      <Header title="Settings" />
      <Card>
        <ul className="list">
          <Link to="/settings/documents" className="list__item"><span>📚 Study Documents</span><span className="list__chev">›</span></Link>
          <Link to="/settings/harris-county" className="list__item"><span>📍 Harris County resources</span><span className="list__chev">›</span></Link>
          <Link to="/settings/about" className="list__item"><span>ℹ️ About / content version</span><span className="list__chev">›</span></Link>
        </ul>
      </Card>
      <Card>
        <h3>Profile</h3>
        <label className="field"><span>Name</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field"><span>TFM11 exam date</span><input type="date" value={form.tfm11} onChange={e => setForm({ ...form, tfm11: e.target.value })} /></label>
        <label className="field"><span>TFM12 exam date</span><input type="date" value={form.tfm12} onChange={e => setForm({ ...form, tfm12: e.target.value })} /></label>
        <label className="field"><span>Study days per week</span>
          <select value={form.days} onChange={e => setForm({ ...form, days: Number(e.target.value) })}>{[3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="field"><span>Daily reminder time <span className="muted">(notifications come in a later release)</span></span><input type="time" value={form.reminder} onChange={e => setForm({ ...form, reminder: e.target.value })} /></label>
        <button className="btn btn--primary btn--block" onClick={save}>{saved ? 'Saved ✓' : 'Save'}</button>
        <p className="small muted" style={{ marginTop: 8 }}>Role: {profile.role} · content version {contentVersion}</p>
      </Card>
      <Card>
        <h3>Danger zone</h3>
        <button className="btn btn--block" onClick={reset} style={{ color: 'var(--bad)' }}>Reset all local data</button>
      </Card>
    </>
  );
}
