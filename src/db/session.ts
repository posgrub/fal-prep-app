import { config } from '../content';
import { buildDailySession, passedDaily, scoreSession } from '../engine/dailySession';
import { newState, updateState } from '../engine/spacedRepetition';
import type { CurriculumDay, Question, SrState } from '../types';
import { db, todayIso, uid, type AttemptAnswer, type QuestionRow, type SrRow, type TestAttempt } from './db';
import { completedDayTags } from './progress';

export async function liveBank(): Promise<QuestionRow[]> {
  return db.question.filter(q => !q.retired).toArray();
}

export async function srMap(userId: string): Promise<Map<string, SrState>> {
  const rows = await db.srState.where('userId').equals(userId).toArray();
  return new Map(rows.map(r => [r.questionId, r]));
}

/** Create a daily test attempt for the given day (a new seed each time => reshuffled retry). */
export async function startDailyTest(userId: string, day: CurriculumDay): Promise<TestAttempt> {
  const [bank, srStates, progress] = await Promise.all([
    liveBank(), srMap(userId), db.dayProgress.where('userId').equals(userId).toArray(),
  ]);
  const prior = await db.testAttempt.where('curriculumDay').equals(day.day).count();
  const seed = (Date.now() ^ (prior * 7919)) >>> 0;
  const questions = buildDailySession({
    day, bank, srStates, completedDayTags: completedDayTags(progress),
    config: { dailyTest: config.dailyTest, mockExam: config.mockExam },
    today: todayIso(), seed,
  });
  const attempt: TestAttempt = {
    id: uid(), userId, kind: 'daily', exam: day.exam, curriculumDay: day.day,
    startedAt: new Date().toISOString(), questionIds: questions.map(q => q.id),
  };
  await db.transaction('rw', db.testAttempt, db.attemptAnswer, async () => {
    await db.testAttempt.add(attempt);
    await db.attemptAnswer.bulkAdd(questions.map((q, i) => ({
      attemptId: attempt.id, questionId: q.id, position: i, flagged: false,
    })));
  });
  return attempt;
}

/** Practice attempt: N questions from an exam (and optional topic), untimed, instant feedback. */
export async function startPractice(userId: string, exam: 'TFM11' | 'TFM12', count: number, topic?: string): Promise<TestAttempt> {
  const bank = (await liveBank()).filter(q => q.exam === exam && (!topic || q.topicTags.includes(topic)));
  const shuffled = bank.slice().sort(() => Math.random() - 0.5).slice(0, count);
  const attempt: TestAttempt = {
    id: uid(), userId, kind: 'practice', exam,
    startedAt: new Date().toISOString(), questionIds: shuffled.map(q => q.id),
  };
  await db.transaction('rw', db.testAttempt, db.attemptAnswer, async () => {
    await db.testAttempt.add(attempt);
    await db.attemptAnswer.bulkAdd(shuffled.map((q, i) => ({ attemptId: attempt.id, questionId: q.id, position: i, flagged: false })));
  });
  return attempt;
}

export async function loadAttemptQuestions(attempt: TestAttempt): Promise<Question[]> {
  const rows = await db.question.bulkGet(attempt.questionIds);
  return rows.filter((q): q is QuestionRow => !!q);
}

export async function recordAnswer(attemptId: string, questionId: string, selected: string, correct: boolean): Promise<void> {
  await db.attemptAnswer.update([attemptId, questionId], { selected, correct, answeredAt: new Date().toISOString() });
}

export async function toggleFlag(attemptId: string, questionId: string): Promise<void> {
  const row = await db.attemptAnswer.get([attemptId, questionId]);
  if (row) await db.attemptAnswer.update([attemptId, questionId], { flagged: !row.flagged });
}

export interface SubmitResult { score: number; passed: boolean }

/** Score, persist the attempt, update Leitner state, and (daily) update day progress. */
export async function submitAttempt(attempt: TestAttempt, questions: Question[], answers: AttemptAnswer[]): Promise<SubmitResult> {
  const answerMap: Record<string, string> = {};
  answers.forEach(a => { if (a.selected) answerMap[a.questionId] = a.selected; });
  const score = scoreSession(questions, answerMap);
  const cfg = { dailyTest: config.dailyTest, mockExam: config.mockExam };
  const passed = attempt.kind === 'daily' ? passedDaily(score, cfg) : score * 100 >= config.mockExam.passPercent;
  const today = todayIso();
  const now = new Date().toISOString();

  await db.transaction('rw', db.testAttempt, db.attemptAnswer, db.srState, db.dayProgress, async () => {
    await db.testAttempt.update(attempt.id, { submittedAt: now, score, passed });
    for (const q of questions) {
      const correct = answerMap[q.id] === q.answer;
      await db.attemptAnswer.update([attempt.id, q.id], { correct, selected: answerMap[q.id], answeredAt: now });
      const prev = (await db.srState.get([attempt.userId, q.id])) ?? { ...newState(q.id, today), userId: attempt.userId };
      const next: SrRow = { ...prev, ...updateState(prev, correct, today), userId: attempt.userId, lastSeenAt: now };
      await db.srState.put(next);
    }
    if (attempt.kind === 'daily' && attempt.curriculumDay) {
      const key: [string, number] = [attempt.userId, attempt.curriculumDay];
      const dp = await db.dayProgress.get(key);
      await db.dayProgress.put({
        userId: attempt.userId, day: attempt.curriculumDay,
        reviewCompletedAt: dp?.reviewCompletedAt,
        attempts: (dp?.attempts ?? 0) + 1,
        bestTestScore: Math.max(dp?.bestTestScore ?? 0, score),
        passedAt: dp?.passedAt ?? (passed ? now : undefined),
      });
    }
  });
  return { score, passed };
}
