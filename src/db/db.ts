import Dexie, { type Table } from 'dexie';
import type { ExamCode, Question, SrState } from '../types';
import { contentVersion, seedQuestions } from '../content';

/** Mirrors db/schema.sql tables as Dexie stores. */

export interface UserProfile {
  id: string;
  name: string;
  role: 'learner' | 'reviewer' | 'admin';
  startDate: string;              // ISO date the class started
  studyDaysPerWeek: number;
  tfm11ExamDate?: string;
  tfm12ExamDate?: string;
  reminderTime?: string;
  createdAt: string;
}

export interface ContentMeta { key: string; value: string }

export interface QuestionRow extends Question {
  reviewedBy?: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface QuestionRevision { id?: number; questionId: string; snapshot: string; editedBy: string; editedAt: string }

export interface DayProgress {
  userId: string;
  day: number;
  reviewCompletedAt?: string;
  bestTestScore?: number;         // 0..1
  passedAt?: string;
  attempts: number;
}

export type AttemptKind = 'daily' | 'practice' | 'mock';

export interface TestAttempt {
  id: string;
  userId: string;
  kind: AttemptKind;
  exam: ExamCode;
  curriculumDay?: number;
  mockId?: string;
  startedAt: string;
  submittedAt?: string;
  timeLimitSec?: number;
  score?: number;                 // 0..1
  passed?: boolean;
  questionIds: string[];          // ordered, so a session can be resumed / reviewed
}

export interface AttemptAnswer {
  attemptId: string;
  questionId: string;
  position: number;
  selected?: string;
  correct?: boolean;
  flagged: boolean;
  answeredAt?: string;
}

export interface SrRow extends SrState { userId: string; lastSeenAt?: string }

export class FalPrepDb extends Dexie {
  userProfile!: Table<UserProfile, string>;
  contentMeta!: Table<ContentMeta, string>;
  question!: Table<QuestionRow, string>;
  questionRevision!: Table<QuestionRevision, number>;
  dayProgress!: Table<DayProgress, [string, number]>;
  testAttempt!: Table<TestAttempt, string>;
  attemptAnswer!: Table<AttemptAnswer, [string, string]>;
  srState!: Table<SrRow, [string, string]>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      userProfile: 'id',
      contentMeta: 'key',
      question: 'id, exam, [exam+retired], needsReview',
      questionRevision: '++id, questionId',
      dayProgress: '[userId+day], userId',
      testAttempt: 'id, userId, [userId+kind], curriculumDay, startedAt',
      attemptAnswer: '[attemptId+questionId], attemptId, questionId',
      srState: '[userId+questionId], userId, dueDate',
    });
  }
}

/**
 * One IndexedDB database per signed-in account, so several people can share a phone
 * without mixing progress. `db` is a live binding: App calls openDbForUser() before
 * rendering any screen that reads it.
 */
export let db: FalPrepDb = new FalPrepDb('fal-prep');

export function openDbForUser(accountId: string): FalPrepDb {
  const name = `fal-prep-${accountId}`;
  if (db.name !== name) {
    if (db.isOpen()) db.close();
    db = new FalPrepDb(name);
  }
  return db;
}

/**
 * Load the bundled question bank into IndexedDB the first time (or when contentVersion changes).
 * Reviewer edits (M4) are preserved: a seed row only overwrites a stored row when the stored row
 * still needs review, so an approved question never gets reverted by a content update.
 */
export async function ensureContentLoaded(): Promise<void> {
  const meta = await db.contentMeta.get('contentVersion');
  if (meta?.value === contentVersion) return;
  await db.transaction('rw', db.question, db.contentMeta, async () => {
    const now = new Date().toISOString();
    for (const q of seedQuestions) {
      const existing = await db.question.get(q.id);
      if (existing && !existing.needsReview) continue;
      await db.question.put({ ...q, updatedAt: now });
    }
    await db.contentMeta.put({ key: 'contentVersion', value: contentVersion });
  });
}

export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
