export type ExamCode = 'TFM11' | 'TFM12';
export type QuestionType = 'multiple_choice' | 'true_false';

export interface Option { id: string; text: string }
export interface Citation { documentId: string; section: string }

export interface Question {
  id: string;
  exam: ExamCode;
  type: QuestionType;
  topicTags: string[];
  difficulty: 1 | 2 | 3;
  stem: string;
  options: Option[];
  answer: string;
  explanation: string;
  citation: Citation;
  figureAsset?: string;
  needsReview: boolean;
  sourceVerified?: boolean;
  retired?: boolean;
}

export interface CurriculumDay {
  day: number; week: number; dayOfWeek: number; id: string; title: string; exam: ExamCode;
  topicTags: string[];               // may include wildcard like 'tfm12.*'
  review: { estimatedMinutes: number; objectives: string[]; readings: { documentId: string; section: string }[]; keyTerms: string[] };
}

export interface CourseConfig {
  dailyTest: { newQuestions: number; reviewQuestions: number; passPercent: number };
  mockExam: { questions: number; passPercent: number; timeLimitMinutes: number };
}

export interface Blueprint { questions: number; topics: { tag: string; weight: number }[] }

/** Leitner spaced-repetition state per user+question */
export interface SrState {
  questionId: string;
  box: 1 | 2 | 3 | 4 | 5;
  dueDate: string;                   // ISO yyyy-mm-dd
  timesSeen: number;
  timesCorrect: number;
}

export interface AnswerRecord { questionId: string; exam: ExamCode; topicTags: string[]; correct: boolean; answeredAt: string }
export interface MockResult { exam: ExamCode; score: number; submittedAt: string }
