import curriculum from '../../../content/curriculum.json';
import blueprints from '../../../content/exam_blueprints.json';
import b11 from '../../../content/questions/tfm11_seed.json';
import b12 from '../../../content/questions/tfm12_seed.json';
import { Question, CurriculumDay, CourseConfig, Blueprint } from '../../types';
import { buildDailySession, scoreSession, passedDaily } from '../dailySession';
import { buildMockExam } from '../mockExam';
import { newState, updateState } from '../spacedRepetition';
import { computeReadiness } from '../readiness';

const bank = [...b11.questions, ...b12.questions] as Question[];
const cfg = curriculum as unknown as CourseConfig & { days: CurriculumDay[] };

test('curriculum has 60 days and every question answer exists in its options', () => {
  expect(cfg.days).toHaveLength(60);
  bank.forEach(q => expect(q.options.map(o => o.id)).toContain(q.answer));
});

test('daily session returns up to 15 unique questions on today\'s topic', () => {
  const day = cfg.days[4]; // license scope day
  const s = buildDailySession({ day, bank, srStates: new Map(), completedDayTags: [], config: cfg, today: '2026-10-01', seed: 1 });
  expect(new Set(s.map(q => q.id)).size).toBe(s.length);
  expect(s.length).toBeLessThanOrEqual(15);
  expect(s.some(q => q.topicTags.includes('tfm11.scope'))).toBe(true);
});

test('retry with a different seed reshuffles', () => {
  const day = cfg.days[0];
  const a = buildDailySession({ day, bank, srStates: new Map(), completedDayTags: ['tfm11.*'], config: cfg, today: '2026-10-01', seed: 1 }).map(q => q.id);
  const b = buildDailySession({ day, bank, srStates: new Map(), completedDayTags: ['tfm11.*'], config: cfg, today: '2026-10-01', seed: 2 }).map(q => q.id);
  expect(a.join()).not.toEqual(b.join());
});

test('scoring and pass mark', () => {
  const qs = bank.slice(0, 5);
  const ans = Object.fromEntries(qs.map((q, i) => [q.id, i < 4 ? q.answer : 'zz']));
  expect(scoreSession(qs, ans)).toBeCloseTo(0.8);
  expect(passedDaily(0.8, cfg)).toBe(true);
  expect(passedDaily(0.79, cfg)).toBe(false);
});

test('leitner: correct moves up, wrong resets', () => {
  let s = newState('x', '2026-10-01');
  s = updateState(s, true, '2026-10-01');
  expect(s.box).toBe(2); expect(s.dueDate).toBe('2026-10-03');
  s = updateState(s, false, '2026-10-03');
  expect(s.box).toBe(1); expect(s.dueDate).toBe('2026-10-04');
});

test('mock exam only draws from its exam and has no duplicates', () => {
  const m = buildMockExam('TFM11', bank, (blueprints as any).TFM11 as Blueprint, 7);
  expect(m.every(q => q.exam === 'TFM11')).toBe(true);
  expect(new Set(m.map(q => q.id)).size).toBe(m.length);
  expect(m.length).toBeLessThanOrEqual(50);
});

test('readiness requires two strong mocks', () => {
  const r = computeReadiness({ exam: 'TFM11', blueprint: (blueprints as any).TFM11, answers: [], mocks: [{ exam: 'TFM11', score: 0.9, submittedAt: '' }], scheduledDaysLast14: 10, completedDaysLast14: 10 });
  expect(r.ready).toBe(false);
  expect(r.reasons[0]).toMatch(/1 more mock/);
});
