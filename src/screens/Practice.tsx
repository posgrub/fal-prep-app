import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UserProfile } from '../db/db';
import { startPractice } from '../db/session';
import { blueprints, topicLabel } from '../content';
import type { ExamCode } from '../types';
import { Card, Header, pct } from '../components/ui';

export default function Practice({ profile }: { profile: UserProfile }) {
  const nav = useNavigate();
  const [exam, setExam] = useState<ExamCode>('TFM11');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const bankCounts = useLiveQuery(async () => {
    const qs = await db.question.filter(q => !q.retired).toArray();
    const m: Record<string, number> = {};
    qs.forEach(q => { m[q.exam] = (m[q.exam] ?? 0) + 1; q.topicTags.forEach(t => { m[t] = (m[t] ?? 0) + 1; }); });
    return m;
  }, []);
  const recent = useLiveQuery(() => db.testAttempt.where('[userId+kind]').equals([profile.id, 'practice']).filter(a => !!a.submittedAt).reverse().sortBy('startedAt'), [profile.id]);

  async function start() {
    setBusy(true);
    try {
      const a = await startPractice(profile.id, exam, count, topic || undefined);
      if (a.questionIds.length === 0) { alert('No questions in the bank for that selection yet.'); return; }
      nav(`/test/${a.id}`);
    } finally { setBusy(false); }
  }

  const topics = blueprints[exam].topics;
  return (
    <>
      <Header title="Practice" />
      <Card>
        <p className="muted small">Untimed, instant feedback. Does not affect your daily unlocks, but does update spaced repetition.</p>
        <label className="field"><span>Exam</span>
          <select value={exam} onChange={e => { setExam(e.target.value as ExamCode); setTopic(''); }}>
            <option value="TFM11">TFM11 – Statutes & Rules ({bankCounts?.TFM11 ?? 0} questions)</option>
            <option value="TFM12">TFM12 – Technical ({bankCounts?.TFM12 ?? 0} questions)</option>
          </select></label>
        <label className="field"><span>Topic</span>
          <select value={topic} onChange={e => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {topics.map(t => <option key={t.tag} value={t.tag}>{topicLabel(t.tag)} ({bankCounts?.[t.tag] ?? 0})</option>)}
          </select></label>
        <label className="field"><span>Questions</span>
          <select value={count} onChange={e => setCount(Number(e.target.value))}>
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select></label>
        <button className="btn btn--primary btn--block" onClick={start} disabled={busy}>Start practice</button>
      </Card>
      <Card>
        <h3>Recent practice</h3>
        {!recent?.length && <p className="muted small">No practice sessions yet.</p>}
        <ul className="list">
          {recent?.slice(0, 10).map(a => (
            <li key={a.id} className="list__item">
              <Link to={`/results/${a.id}`}>{a.exam} · {a.questionIds.length} questions</Link>
              <span className="small muted">{pct(a.score ?? 0)} · {a.submittedAt?.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
