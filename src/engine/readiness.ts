import { AnswerRecord, Blueprint, ExamCode, MockResult } from '../types';

export interface ReadinessInput {
  exam: ExamCode;
  blueprint: Blueprint;
  answers: AnswerRecord[];          // all answers, newest last
  mocks: MockResult[];              // newest last
  scheduledDaysLast14: number;
  completedDaysLast14: number;
}

export interface Readiness {
  score: number;                    // 0..100
  ready: boolean;
  weakTags: string[];               // weakest 3 topics
  reasons: string[];                // plain-language blockers
}

/** 50% mock avg (last 3) + 30% topic coverage + 20% consistency; needs ≥2 mocks at ≥80%. */
export function computeReadiness(i: ReadinessInput, readyThreshold = 80): Readiness {
  const mocks = i.mocks.filter(m => m.exam === i.exam);
  const last3 = mocks.slice(-3);
  const mockAvg = last3.length ? last3.reduce((s, m) => s + m.score, 0) / last3.length : 0;

  const topicAcc = i.blueprint.topics.map(t => {
    const recent = i.answers.filter(a => a.exam === i.exam && a.topicTags.includes(t.tag)).slice(-30);
    const acc = recent.length ? recent.filter(a => a.correct).length / recent.length : 0;
    return { tag: t.tag, acc, n: recent.length };
  });
  const coverage = topicAcc.length ? topicAcc.filter(t => t.acc >= 0.8 && t.n >= 5).length / topicAcc.length : 0;
  const consistency = i.scheduledDaysLast14 ? Math.min(1, i.completedDaysLast14 / i.scheduledDaysLast14) : 0;

  const score = Math.round((mockAvg * 0.5 + coverage * 0.3 + consistency * 0.2) * 100);
  const strongMocks = mocks.filter(m => m.score >= 0.8).length;

  const reasons: string[] = [];
  if (strongMocks < 2) reasons.push(`Score 80% or higher on ${2 - strongMocks} more mock exam(s).`);
  if (score < readyThreshold) reasons.push(`Raise readiness to ${readyThreshold} (now ${score}).`);

  const weakTags = [...topicAcc].sort((a, b) => a.acc - b.acc).slice(0, 3).map(t => t.tag);
  return { score, ready: reasons.length === 0, weakTags, reasons };
}
