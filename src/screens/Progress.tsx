import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db, type UserProfile } from '../db/db';
import { computeStreak, currentDay } from '../db/progress';
import { computeReadiness } from '../engine/readiness';
import { blueprints, config, curriculum, topicLabel } from '../content';
import type { AnswerRecord, ExamCode, MockResult } from '../types';
import { Badge, Card, Header, pct } from '../components/ui';

export default function Progress({ profile }: { profile: UserProfile }) {
  const progress = useLiveQuery(() => db.dayProgress.where('userId').equals(profile.id).toArray(), [profile.id]);
  const attempts = useLiveQuery(() => db.testAttempt.where('userId').equals(profile.id).filter(a => !!a.submittedAt).sortBy('submittedAt'), [profile.id]);
  const data = useLiveQuery(async () => {
    const atts = await db.testAttempt.where('userId').equals(profile.id).filter(a => !!a.submittedAt).sortBy('submittedAt');
    const answers: AnswerRecord[] = [];
    for (const a of atts) {
      const rows = await db.attemptAnswer.where('attemptId').equals(a.id).sortBy('position');
      const qs = await db.question.bulkGet(rows.map(r => r.questionId));
      rows.forEach((r, i) => { const q = qs[i]; if (q) answers.push({ questionId: q.id, exam: q.exam, topicTags: q.topicTags, correct: !!r.correct, answeredAt: r.answeredAt ?? a.submittedAt! }); });
    }
    const mocks: MockResult[] = atts.filter(a => a.kind === 'mock').map(a => ({ exam: a.exam, score: a.score ?? 0, submittedAt: a.submittedAt! }));
    return { answers, mocks };
  }, [profile.id]);

  if (!progress || !attempts || !data) return <p className="muted">Loading…</p>;

  const cur = currentDay(progress);
  const streak = computeStreak(attempts);
  const scheduled14 = Math.min(14, Math.round((14 / 7) * profile.studyDaysPerWeek));
  const completed14 = new Set(attempts.filter(a => a.kind === 'daily' && a.passed && Date.now() - new Date(a.submittedAt!).getTime() < 14 * 86400000).map(a => a.curriculumDay)).size;

  const readiness = (exam: ExamCode) => computeReadiness({
    exam, blueprint: blueprints[exam], answers: data.answers, mocks: data.mocks,
    scheduledDaysLast14: scheduled14, completedDaysLast14: Math.min(completed14, scheduled14),
  }, config.readinessThreshold);

  const topicStats = (exam: ExamCode) => blueprints[exam].topics.map(t => {
    const recent = data.answers.filter(a => a.exam === exam && a.topicTags.includes(t.tag)).slice(-30);
    return { tag: t.tag, n: recent.length, acc: recent.length ? recent.filter(a => a.correct).length / recent.length : null };
  });

  return (
    <>
      <Header title="Progress" />
      <div className="stat-grid">
        <div className="stat"><div className="stat__value">{progress.filter(p => p.passedAt).length}</div><div className="stat__label">Days passed</div></div>
        <div className="stat"><div className="stat__value">{streak}</div><div className="stat__label">Streak</div></div>
        <div className="stat"><div className="stat__value">{data.answers.length}</div><div className="stat__label">Answers</div></div>
      </div>

      {(['TFM11', 'TFM12'] as ExamCode[]).map(exam => {
        const r = readiness(exam);
        return (
          <Card key={exam}>
            <div className="row row--between"><h3>{exam} readiness</h3><Badge tone={r.ready ? 'good' : 'neutral'}>{r.score}/100</Badge></div>
            {r.reasons.length > 0 && <ul className="small muted">{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            {r.ready
              ? <a className="btn btn--primary btn--block" href={config.psiSchedulingUrl} target="_blank" rel="noopener noreferrer">I'm ready to schedule {exam} at PSI</a>
              : <button className="btn btn--block" disabled>I'm ready to schedule (locked)</button>}
            <p className="small muted" style={{ marginTop: 8 }}>Real exams allow one attempt per week and three per 12 months, so the app only unlocks scheduling after two mock exams at 80%+. Mock exams arrive in the next release.</p>
          </Card>
        );
      })}

      <Card>
        <h3>Days</h3>
        <div className="heat">
          {curriculum.days.map(d => {
            const p = progress.find(x => x.day === d.day);
            const cls = 'heat__cell' + (p?.passedAt ? ' heat__cell--pass' : p?.attempts ? ' heat__cell--fail' : '') + (d.day === cur.day ? ' heat__cell--current' : '');
            return <Link key={d.day} to={`/review/${d.day}`} className={cls} title={d.title}>{d.day}</Link>;
          })}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Green = passed, red = attempted, outline = today.</p>
      </Card>

      {(['TFM11', 'TFM12'] as ExamCode[]).map(exam => (
        <Card key={exam + 't'}>
          <h3>{exam} by topic <span className="muted small">(last 30 answers each)</span></h3>
          <ul className="list">
            {topicStats(exam).map(t => (
              <li key={t.tag} className="list__item">
                <span>{topicLabel(t.tag)}</span>
                <span className="small" style={{ color: t.acc === null ? 'var(--muted)' : t.acc >= 0.8 ? 'var(--good)' : 'var(--bad)' }}>{t.acc === null ? 'not started' : `${pct(t.acc)} (${t.n})`}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card>
        <h3>Recent tests</h3>
        <ul className="list">
          {attempts.slice(-15).reverse().map(a => (
            <li key={a.id} className="list__item">
              <Link to={`/results/${a.id}`}>{a.kind === 'daily' ? `Day ${a.curriculumDay} test` : a.kind === 'practice' ? `${a.exam} practice` : `${a.exam} mock`}</Link>
              <span className="small muted">{pct(a.score ?? 0)} {a.passed ? '✓' : ''} · {a.submittedAt?.slice(0, 10)}</span>
            </li>
          ))}
          {attempts.length === 0 && <li className="muted small">Nothing yet. Start with today's review.</li>}
        </ul>
      </Card>
    </>
  );
}
