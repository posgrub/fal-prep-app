import { curriculum, dayById } from '../content';
import { addDays } from '../engine/spacedRepetition';
import { db, todayIso, type DayProgress, type TestAttempt, type UserProfile } from './db';
import type { CurriculumDay } from '../types';

/** The learner's current day = first curriculum day not yet passed. */
export function currentDay(progress: DayProgress[]): CurriculumDay {
  const passed = new Set(progress.filter(p => p.passedAt).map(p => p.day));
  const next = curriculum.days.find(d => !passed.has(d.day));
  return next ?? curriculum.days[curriculum.days.length - 1];
}

export function isDayUnlocked(day: number, progress: DayProgress[]): boolean {
  if (day <= 1) return true;
  return progress.some(p => p.day === day - 1 && p.passedAt);
}

/** Topic tags from all days already passed (feeds the spaced-repetition pool). */
export function completedDayTags(progress: DayProgress[]): string[] {
  const passed = new Set(progress.filter(p => p.passedAt).map(p => p.day));
  const tags = new Set<string>();
  curriculum.days.filter(d => passed.has(d.day)).forEach(d => d.topicTags.forEach(t => tags.add(t)));
  return [...tags];
}

/** Consecutive calendar days (ending today or yesterday) with at least one submitted attempt. */
export function computeStreak(attempts: TestAttempt[], today = todayIso()): number {
  const days = new Set(attempts.filter(a => a.submittedAt).map(a => a.submittedAt!.slice(0, 10)));
  let streak = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
  return streak;
}

export function daysUntil(iso: string | undefined, today = todayIso()): number | undefined {
  if (!iso) return undefined;
  const a = new Date(iso + 'T00:00:00Z').getTime();
  const b = new Date(today + 'T00:00:00Z').getTime();
  return Math.round((a - b) / 86400000);
}

export async function markReviewComplete(userId: string, day: number): Promise<void> {
  const existing = await db.dayProgress.get([userId, day]);
  await db.dayProgress.put({
    userId, day,
    attempts: existing?.attempts ?? 0,
    bestTestScore: existing?.bestTestScore,
    passedAt: existing?.passedAt,
    reviewCompletedAt: existing?.reviewCompletedAt ?? new Date().toISOString(),
  });
}

export async function getProfile(): Promise<UserProfile | undefined> {
  return (await db.userProfile.toCollection().first()) ?? undefined;
}

export function dayTitle(day: number): string {
  const d = dayById(day);
  return d ? `Week ${d.week} · Day ${d.day} — ${d.title}` : `Day ${day}`;
}
