import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { loadAttemptQuestions, startDailyTest } from '../db/session';
import { config, curriculum, dayById, topicLabel } from '../content';
import type { Question } from '../types';
import { Badge, Card, CitationText, Header, UnreviewedBadge, pct } from '../components/ui';

export default function Results() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const attempt = useLiveQuery(() => db.testAttempt.get(attemptId!), [attemptId]);
  const answers = useLiveQuery(() => db.attemptAnswer.where('attemptId').equals(attemptId!).sortBy('position'), [attemptId]);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (attempt) loadAttemptQuestions(attempt).then(setQuestions); }, [attempt?.id]);

  if (attempt === undefined || !answers || !questions) return <p className="muted">Loading…</p>;
  if (!attempt) return <Navigate to="/" replace />;
  if (!attempt.submittedAt) return <Navigate to={`/test/${attempt.id}`} replace />;

  const score = attempt.score ?? 0;
  const passMark = attempt.kind === 'daily' ? config.dailyTest.passPercent : config.mockExam.passPercent;
  const passed = !!attempt.passed;
  const day = attempt.curriculumDay ? dayById(attempt.curriculumDay) : undefined;
  const isLastDay = day ? day.day >= curriculum.days.length : false;
  const byTopic = new Map<string, { right: number; total: number }>();
  questions.forEach(q => {
    const a = answers.find(x => x.questionId === q.id);
    q.topicTags.forEach(t => {
      const cur = byTopic.get(t) ?? { right: 0, total: 0 };
      cur.total++; if (a?.correct) cur.right++;
      byTopic.set(t, cur);
    });
  });

  async function retry() {
    if (!day) return;
    setBusy(true);
    const next = await startDailyTest(attempt!.userId, day);
    nav(`/test/${next.id}`, { replace: true });
  }

  return (
    <>
      <Header title="Results" back={attempt.kind === 'daily' ? '/' : '/practice'} />
      <Card className={passed ? '' : ''}>
        <div className="row row--between">
          <div>
            <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>{pct(score)}</div>
            <div className="muted small">{answers.filter(a => a.correct).length} of {questions.length} correct · pass mark {passMark}%</div>
          </div>
          <Badge tone={passed ? 'good' : 'bad'}>{passed ? 'Passed' : 'Not yet'}</Badge>
        </div>
        {attempt.kind === 'daily' && day && (
          <p style={{ marginTop: 10 }}>
            {passed
              ? isLastDay ? 'You finished the course. Keep practicing until your exam.' : `Day ${day.day + 1} is unlocked. See you tomorrow.`
              : `Go back over Day ${day.day}'s review, then retry with a reshuffled set.`}
          </p>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          {attempt.kind === 'daily' && !passed && day && <>
            <Link to={`/review/${day.day}`} className="btn">Review again</Link>
            <button className="btn btn--primary" onClick={retry} disabled={busy}>Retry test</button>
          </>}
          {attempt.kind === 'daily' && passed && <Link to="/" className="btn btn--primary">Back to Today</Link>}
          {attempt.kind === 'practice' && <Link to="/practice" className="btn btn--primary">Practice again</Link>}
        </div>
      </Card>

      <Card>
        <h3>By topic</h3>
        <ul className="list">
          {[...byTopic.entries()].map(([t, s]) => (
            <li key={t} className="list__item"><span>{topicLabel(t)}</span><span className={s.right === s.total ? 'small' : 'small'} style={{ color: s.right / s.total >= 0.8 ? 'var(--good)' : 'var(--bad)' }}>{s.right}/{s.total}</span></li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>Every question</h3>
        {questions.map((q, i) => {
          const a = answers.find(x => x.questionId === q.id);
          const chosen = q.options.find(o => o.id === a?.selected);
          const right = q.options.find(o => o.id === q.answer);
          return (
            <div key={q.id} className="result-q">
              <div className="row row--between small muted"><span>Question {i + 1} · {q.topicTags.map(topicLabel).join(', ')}</span><span>{a?.correct ? <Badge tone="good">Correct</Badge> : <Badge tone="bad">Wrong</Badge>} <UnreviewedBadge q={q} /></span></div>
              <p style={{ fontWeight: 600, margin: '6px 0' }}>{q.stem}</p>
              {!a?.correct && <p className="small" style={{ color: 'var(--bad)' }}>Your answer: {chosen ? `${chosen.id.toUpperCase()}. ${chosen.text}` : 'blank'}</p>}
              <p className="small" style={{ color: 'var(--good)' }}>Correct: {right ? `${right.id.toUpperCase()}. ${right.text}` : q.answer}</p>
              <div className={'explain ' + (a?.correct ? 'explain--good' : 'explain--bad')}>
                {q.explanation}
                <div><CitationText q={q} /></div>
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}
