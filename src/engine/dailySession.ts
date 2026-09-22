import { CourseConfig, CurriculumDay, Question, SrState } from '../types';
import { isDue } from './spacedRepetition';
import { questionMatches, rng, shuffle } from './random';

export interface DailySessionInput {
  day: CurriculumDay;
  bank: Question[];
  srStates: Map<string, SrState>;           // keyed by questionId
  completedDayTags: string[];               // topic tags from days already passed
  weakTags?: string[];                      // from readiness engine; used for 'tfm1x.*' weak-area days
  config: CourseConfig;
  today: string;                            // ISO date
  seed: number;                             // change on retry to reshuffle
}

/**
 * Builds the 15-question daily test:
 *  - N new questions on today's topics (prefer never-seen, then lowest box)
 *  - M review questions from earlier topics (due first, then lowest box)
 * Unreviewed questions are allowed but callers must label them in the UI.
 */
export function buildDailySession(input: DailySessionInput): Question[] {
  const { day, bank, srStates, completedDayTags, config, today, seed } = input;
  const rand = rng(seed);
  const live = bank.filter(q => !q.retired);

  // Weak-area days use wildcard tags; narrow them to the learner's weakest topics when known.
  const todayTags = day.topicTags.some(t => t.endsWith('.*')) && input.weakTags?.length
    ? input.weakTags
    : day.topicTags;

  const rank = (q: Question) => {
    const s = srStates.get(q.id);
    if (!s || s.timesSeen === 0) return 0;          // never seen first
    return s.box;                                    // then weakest box
  };

  const todayPool = shuffle(live.filter(q => questionMatches(q, todayTags)), rand).sort((a, b) => rank(a) - rank(b));
  const picked = todayPool.slice(0, config.dailyTest.newQuestions);
  const pickedIds = new Set(picked.map(q => q.id));

  const reviewPool = live.filter(q =>
    !pickedIds.has(q.id) &&
    questionMatches(q, completedDayTags) &&
    srStates.has(q.id));
  const due = shuffle(reviewPool.filter(q => isDue(srStates.get(q.id)!, today)), rand)
    .sort((a, b) => srStates.get(a.id)!.box - srStates.get(b.id)!.box);
  const notDue = shuffle(reviewPool.filter(q => !isDue(srStates.get(q.id)!, today)), rand)
    .sort((a, b) => srStates.get(a.id)!.box - srStates.get(b.id)!.box);
  const review = [...due, ...notDue].slice(0, config.dailyTest.reviewQuestions);

  // If the bank is thin, top up from today's pool so the learner still gets a full test.
  const total = config.dailyTest.newQuestions + config.dailyTest.reviewQuestions;
  let session = [...picked, ...review];
  if (session.length < total) {
    const ids = new Set(session.map(q => q.id));
    session = session.concat(todayPool.filter(q => !ids.has(q.id)).slice(0, total - session.length));
  }
  return shuffle(session, rand);
}

export function scoreSession(questions: Question[], answers: Record<string, string>): number {
  if (questions.length === 0) return 0;
  const right = questions.filter(q => answers[q.id] === q.answer).length;
  return right / questions.length;
}

export function passedDaily(score: number, config: CourseConfig): boolean {
  return score * 100 >= config.dailyTest.passPercent;
}
