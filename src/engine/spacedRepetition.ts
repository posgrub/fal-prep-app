import { SrState } from '../types';

/** Leitner intervals in days for boxes 1..5 */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16] as const;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function newState(questionId: string, today: string): SrState {
  return { questionId, box: 1, dueDate: today, timesSeen: 0, timesCorrect: 0 };
}

/** Correct → move up one box; wrong → back to box 1 and due tomorrow. */
export function updateState(s: SrState, correct: boolean, today: string): SrState {
  const box = (correct ? Math.min(5, s.box + 1) : 1) as SrState['box'];
  return {
    ...s,
    box,
    dueDate: addDays(today, BOX_INTERVAL_DAYS[box - 1]),
    timesSeen: s.timesSeen + 1,
    timesCorrect: s.timesCorrect + (correct ? 1 : 0),
  };
}

export function isDue(s: SrState, today: string): boolean { return s.dueDate <= today; }
