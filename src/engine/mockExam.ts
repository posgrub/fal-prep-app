import { Blueprint, ExamCode, Question } from '../types';
import { questionMatches, rng, shuffle } from './random';

/**
 * Builds a PSI-style mock exam using blueprint weights.
 * coveredTags (optional) limits early-week mocks to topics already studied.
 * Uses largest-remainder rounding so topic counts sum exactly to blueprint.questions.
 */
export function buildMockExam(exam: ExamCode, bank: Question[], blueprint: Blueprint, seed: number, coveredTags?: string[]): Question[] {
  const rand = rng(seed);
  const live = bank.filter(q => q.exam === exam && !q.retired);
  const topics = blueprint.topics.filter(t => !coveredTags || coveredTags.some(c => c === t.tag || (c.endsWith('.*') && t.tag.startsWith(c.slice(0, -1)))));
  const wSum = topics.reduce((s, t) => s + t.weight, 0) || 1;
  const n = blueprint.questions;

  const raw = topics.map(t => ({ tag: t.tag, exact: (t.weight / wSum) * n }));
  const counts = raw.map(r => ({ tag: r.tag, count: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let left = n - counts.reduce((s, c) => s + c.count, 0);
  [...counts].sort((a, b) => b.rem - a.rem).forEach(c => { if (left > 0) { c.count++; left--; } });

  const used = new Set<string>();
  const out: Question[] = [];
  for (const c of counts) {
    const pool = shuffle(live.filter(q => !used.has(q.id) && questionMatches(q, [c.tag])), rand).slice(0, c.count);
    pool.forEach(q => { used.add(q.id); out.push(q); });
  }
  // Fill any shortfall (thin topics) from the rest of the exam's bank.
  if (out.length < n) {
    shuffle(live.filter(q => !used.has(q.id)), rand).slice(0, n - out.length).forEach(q => out.push(q));
  }
  return shuffle(out, rand);
}
