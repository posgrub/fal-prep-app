import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { db, type UserProfile } from '../db/db';
import { computeStreak, currentDay, daysUntil } from '../db/progress';
import { startDailyTest } from '../db/session';
import { curriculum, topicLabel } from '../content';
import { Badge, Card, Header, ProgressBar, pct } from '../components/ui';
import { useState } from 'react';

export default function Today({ profile }: { profile: UserProfile }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const progress = useLiveQuery(() => db.dayProgress.where('userId').equals(profile.id).toArray(), [profile.id]);
  const attempts = useLiveQuery(() => db.testAttempt.where('userId').equals(profile.id).toArray(), [profile.id]);
  const open = useLiveQuery(() => db.testAttempt.where('[userId+kind]').equals([profile.id, 'daily']).filter(a => !a.submittedAt).last(), [profile.id]);

  if (!progress || !attempts) return <p className="muted">Loading…</p>;

  const day = currentDay(progress);
  const dp = progress.find(p => p.day === day.day);
  const passedCount = progress.filter(p => p.passedAt).length;
  const allDone = passedCount >= curriculum.days.length;
  const streak = computeStreak(attempts);
  const reviewDone = !!dp?.reviewCompletedAt;
  const d11 = daysUntil(profile.tfm11ExamDate);
  const d12 = daysUntil(profile.tfm12ExamDate);

  async function takeTest() {
    setBusy(true);
    try {
      const attempt = open && open.curriculumDay === day.day ? open : await startDailyTest(profile.id, day);
      nav(`/test/${attempt.id}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      <Header title={`Hi, ${profile.name.split(' ')[0]}`} right={<Link to="/settings" aria-label="Settings">⚙️</Link>} />
      <Card className="card--hero">
        <p className="muted small">{allDone ? 'Course complete' : `Week ${day.week} · Day ${day.day} of ${curriculum.days.length}`} · <Badge tone="info">{day.exam}</Badge></p>
        <h2>{day.title}</h2>
        <p className="muted small">{day.topicTags.map(topicLabel).join(', ')} · about {day.review.estimatedMinutes} min review + daily test (up to {curriculum.dailyTest.newQuestions + curriculum.dailyTest.reviewQuestions} questions)</p>
        <div className="row" style={{ marginTop: 12 }}>
          <Link to={`/review/${day.day}`} className={'btn ' + (reviewDone ? 'btn--ghost' : 'btn--light')} style={reviewDone ? { color: '#fff' } : undefined}>
            {reviewDone ? '✓ Review done' : 'Start review'}
          </Link>
          <button className="btn btn--light" onClick={takeTest} disabled={busy || !reviewDone}>
            {open && open.curriculumDay === day.day ? 'Resume test' : dp?.attempts ? 'Retry test' : "Take today's test"}
          </button>
        </div>
        {!reviewDone && <p className="small muted" style={{ marginTop: 8 }}>Finish the review to unlock today's test.</p>}
        {dp?.attempts ? <p className="small muted" style={{ marginTop: 8 }}>Best score so far: {pct(dp.bestTestScore ?? 0)} (need {curriculum.dailyTest.passPercent}% to unlock Day {day.day + 1})</p> : null}
      </Card>

      <div className="stat-grid">
        <div className="stat"><div className="stat__value">{streak}</div><div className="stat__label">Day streak</div></div>
        <div className="stat"><div className="stat__value">{d11 === undefined ? '–' : d11}</div><div className="stat__label">Days to TFM11</div></div>
        <div className="stat"><div className="stat__value">{d12 === undefined ? '–' : d12}</div><div className="stat__label">Days to TFM12</div></div>
      </div>

      <Card>
        <div className="row row--between"><h3>Course progress</h3><span className="muted small">{passedCount}/{curriculum.days.length} days</span></div>
        <ProgressBar value={passedCount} max={curriculum.days.length} />
        <p className="small muted" style={{ marginTop: 8 }}>
          {d11 === undefined && d12 === undefined ? <>No exam dates yet. <Link to="/settings">Add them in Settings</Link> to see countdowns.</> : 'Saturdays: 50-question timed mock exam (coming in the next release).'}
        </p>
      </Card>
    </>
  );
}
