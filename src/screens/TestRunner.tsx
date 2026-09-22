import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UserProfile } from '../db/db';
import { loadAttemptQuestions, recordAnswer, submitAttempt, toggleFlag } from '../db/session';
import type { Question } from '../types';
import { Badge, Card, CitationText, Header, ProgressBar, UnreviewedBadge } from '../components/ui';

/** One question per screen. Daily tests give feedback only at the end; practice gives instant feedback. */
export default function TestRunner({ profile }: { profile: UserProfile }) {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const attempt = useLiveQuery(() => db.testAttempt.get(attemptId!), [attemptId]);
  const answers = useLiveQuery(() => db.attemptAnswer.where('attemptId').equals(attemptId!).sortBy('position'), [attemptId]);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (attempt) loadAttemptQuestions(attempt).then(setQuestions);
  }, [attempt?.id]);

  // Resume where the learner left off.
  useEffect(() => {
    if (answers && questions && idx === 0) {
      const first = answers.findIndex(a => !a.selected);
      if (first > 0) setIdx(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!answers, !!questions]);

  if (attempt === undefined || !answers || !questions) return <p className="muted">Loading…</p>;
  if (!attempt || attempt.userId !== profile.id) return <Navigate to="/" replace />;
  if (attempt.submittedAt) return <Navigate to={`/results/${attempt.id}`} replace />;
  if (questions.length === 0) return <><Header title="Test" back="/" /><Card><p>No questions available for this day yet.</p></Card></>;

  const instant = attempt.kind === 'practice';
  const q = questions[Math.min(idx, questions.length - 1)];
  const a = answers.find(x => x.questionId === q.id);
  const answeredCount = answers.filter(x => x.selected).length;
  const unanswered = answers.filter(x => !x.selected).length;
  const flagged = answers.filter(x => x.flagged).length;
  const title = attempt.kind === 'daily' ? `Day ${attempt.curriculumDay} test` : 'Practice';

  async function choose(optionId: string) {
    if (instant && a?.selected) return;               // locked after feedback
    await recordAnswer(attempt!.id, q.id, optionId, optionId === q.answer);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await submitAttempt(attempt!, questions!, answers!);
      nav(`/results/${attempt!.id}`, { replace: true });
    } finally { setBusy(false); }
  }

  if (reviewing) {
    return (
      <>
        <Header title="Review before submit" />
        <Card>
          <p>{answeredCount} of {questions.length} answered{flagged ? `, ${flagged} flagged` : ''}.</p>
          {unanswered > 0 && <p className="small" style={{ color: 'var(--warn)' }}>Unanswered questions count as wrong.</p>}
          <ul className="list">
            {questions.map((qq, i) => {
              const aa = answers.find(x => x.questionId === qq.id);
              return (
                <li key={qq.id} className="list__item" role="button" onClick={() => { setIdx(i); setReviewing(false); }}>
                  <span>{i + 1}. {qq.stem.slice(0, 60)}{qq.stem.length > 60 ? '…' : ''}</span>
                  <span className="row">{aa?.flagged && <span>🚩</span>}{aa?.selected ? <Badge tone="good">Answered</Badge> : <Badge tone="bad">Blank</Badge>}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="stack">
          <button className="btn btn--primary btn--block" onClick={submit} disabled={busy}>Submit {title.toLowerCase()}</button>
          <button className="btn btn--block" onClick={() => setReviewing(false)}>Keep working</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={title} back={attempt.kind === 'daily' ? '/' : '/practice'}
        right={<button className="flag" aria-label="Flag question" onClick={() => toggleFlag(attempt.id, q.id)}>{a?.flagged ? '🚩' : '⚑'}</button>} />
      <div className="row row--between small muted" style={{ marginBottom: 6 }}>
        <span>Question {idx + 1} of {questions.length}</span>
        <span><Badge tone="info">{q.exam}</Badge> <UnreviewedBadge q={q} /></span>
      </div>
      <ProgressBar value={idx + 1} max={questions.length} />

      <Card>
        <p className="question__stem">{q.stem}</p>
        {q.figureAsset && <img src={q.figureAsset} alt="Figure" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12 }} />}
        {q.options.map(o => {
          let cls = 'option';
          if (instant && a?.selected) {
            if (o.id === q.answer) cls += ' option--correct';
            else if (o.id === a.selected) cls += ' option--wrong';
          } else if (a?.selected === o.id) cls += ' option--selected';
          return (
            <button key={o.id} className={cls} onClick={() => choose(o.id)} disabled={instant && !!a?.selected}>
              <span className="option__key">{o.id.toUpperCase()}</span><span>{o.text}</span>
            </button>
          );
        })}
        {instant && a?.selected && (
          <div className={'explain ' + (a.selected === q.answer ? 'explain--good' : 'explain--bad')}>
            <strong>{a.selected === q.answer ? 'Correct.' : 'Not quite.'}</strong> {q.explanation}
            <div><CitationText q={q} /></div>
          </div>
        )}
      </Card>

      <div className="row row--between">
        <button className="btn" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>‹ Back</button>
        {idx < questions.length - 1
          ? <button className="btn btn--primary" onClick={() => setIdx(i => i + 1)}>Next ›</button>
          : <button className="btn btn--primary" onClick={() => (instant ? submit() : setReviewing(true))} disabled={busy}>Finish</button>}
      </div>
      {!instant && <p className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>Answers and explanations are shown after you submit.</p>}
      <p style={{ textAlign: 'center', marginTop: 6 }}><button className="btn btn--ghost btn--sm" onClick={() => setReviewing(true)}>Review all / submit</button></p>
    </>
  );
}
