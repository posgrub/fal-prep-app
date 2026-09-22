import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UserProfile } from '../db/db';
import { isDayUnlocked, markReviewComplete } from '../db/progress';
import { startDailyTest } from '../db/session';
import { dayById, documentsById, topicLabel } from '../content';
import { Badge, Card, Header } from '../components/ui';

export default function Review({ profile }: { profile: UserProfile }) {
  const { day: dayParam } = useParams();
  const nav = useNavigate();
  const dayNum = Number(dayParam);
  const day = dayById(dayNum);
  const progress = useLiveQuery(() => db.dayProgress.where('userId').equals(profile.id).toArray(), [profile.id]);
  const flashcards = useLiveQuery(async () => {
    if (!day) return [];
    const qs = await db.question.filter(q => !q.retired && q.topicTags.some(t => day.topicTags.some(p => p.endsWith('.*') ? t.startsWith(p.slice(0, -1)) : p === t))).toArray();
    return qs.slice(0, 10);
  }, [dayNum]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  if (!day) return <Navigate to="/" replace />;
  if (!progress || !flashcards) return <p className="muted">Loading…</p>;
  if (!isDayUnlocked(day.day, progress)) {
    return <><Header title="Locked" back="/" /><Card><p>Pass Day {day.day - 1}'s test first to unlock this lesson.</p></Card></>;
  }
  const dp = progress.find(p => p.day === day.day);

  async function finish(goToTest: boolean) {
    setBusy(true);
    await markReviewComplete(profile.id, day!.day);
    if (goToTest) {
      const open = await db.testAttempt.where('curriculumDay').equals(day!.day).filter(a => !a.submittedAt && a.userId === profile.id).last();
      const attempt = open ?? await startDailyTest(profile.id, day!);
      nav(`/test/${attempt.id}`, { replace: true });
    } else nav('/', { replace: true });
  }

  return (
    <>
      <Header title={`Day ${day.day} review`} back="/" />
      <Card>
        <p className="muted small">Week {day.week} · <Badge tone="info">{day.exam}</Badge> · {day.review.estimatedMinutes} min</p>
        <h2>{day.title}</h2>
        <p className="small muted">Topics: {day.topicTags.map(topicLabel).join(', ')}</p>
      </Card>

      <Card>
        <h3>Objectives</h3>
        <ul>{day.review.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
      </Card>

      <Card>
        <h3>Reading assignment</h3>
        <ul className="list">
          {day.review.readings.map((r, i) => {
            const doc = documentsById.get(r.documentId);
            const href = doc?.type === 'bundled' && doc.file ? `/docs/${doc.file.split('/').pop()}` : doc?.url;
            return (
              <li key={i} className="list__item" style={{ display: 'block' }}>
                <div>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{doc?.title ?? r.documentId}</a> : <strong>{doc?.title ?? r.documentId}</strong>}</div>
                <div className="small muted">{r.section}</div>
                {doc?.copyrightNote && <div className="small muted">{doc.copyrightNote}</div>}
              </li>
            );
          })}
        </ul>
        <p className="small muted">All documents are listed under <Link to="/settings/documents">Settings › Study Documents</Link>.</p>
      </Card>

      {day.review.keyTerms.length > 0 && (
        <Card>
          <h3>Key terms</h3>
          <div className="row">{day.review.keyTerms.map(t => <Badge key={t}>{t}</Badge>)}</div>
        </Card>
      )}

      <Card>
        <h3>Flashcards <span className="muted small">(tap to flip)</span></h3>
        {flashcards.length === 0 && <p className="muted small">No flashcards for this topic yet. A reviewer can add questions to the bank.</p>}
        <div className="stack">
          {flashcards.map(q => {
            const back = q.options.find(o => o.id === q.answer)?.text ?? q.answer;
            const isBack = !!flipped[q.id];
            return (
              <div key={q.id} className={'flashcard' + (isBack ? ' flashcard--back' : '')} role="button" tabIndex={0}
                onClick={() => setFlipped(f => ({ ...f, [q.id]: !f[q.id] }))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setFlipped(f => ({ ...f, [q.id]: !f[q.id] })); }}>
                <div>
                  {isBack ? <><strong>{back}</strong><div className="small muted" style={{ marginTop: 6 }}>{q.explanation}</div></> : q.stem}
                  {q.needsReview && <div style={{ marginTop: 6 }}><Badge tone="warn">Unreviewed</Badge></div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="stack">
        <button className="btn btn--primary btn--block" disabled={busy} onClick={() => finish(true)}>
          {dp?.reviewCompletedAt ? "Go to today's test" : 'I finished the review → Daily Test'}
        </button>
        <button className="btn btn--block" disabled={busy} onClick={() => finish(false)}>Mark review complete, test later</button>
      </div>
    </>
  );
}
