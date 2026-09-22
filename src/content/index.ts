import curriculumJson from '../../content/curriculum.json';
import blueprintsJson from '../../content/exam_blueprints.json';
import documentsJson from '../../content/documents.json';
import localJson from '../../content/local_resources.json';
import tfm11 from '../../content/questions/tfm11_seed.json';
import tfm12 from '../../content/questions/tfm12_seed.json';
import type { Blueprint, CourseConfig, CurriculumDay, ExamCode, Question } from '../types';

export interface MockSchedule { week: number; id: string; exam: ExamCode; blueprint: ExamCode; label: string; note?: string }

export interface Curriculum extends CourseConfig {
  contentVersion: string;
  course: string;
  studyDaysPerWeek: number;
  days: CurriculumDay[];
  mockExams: MockSchedule[];
}

export interface StudyDocument {
  id: string;
  title: string;
  purpose: string;
  type: 'external' | 'bundled' | 'uploaded';
  url?: string;
  file?: string;
  required: boolean;
  cost: string;
  edition?: string;
  lastVerified: string;
  copyrightNote?: string;
  allowOfflineCopy?: boolean;
}
export interface DocumentGroup { id: string; title: string; items: StudyDocument[] }

export interface LocalItem { label: string; type: 'url' | 'phone' | 'email' | 'note' | 'address'; value: string; lastVerified?: string }
export interface LocalSection { id: string; title: string; items: LocalItem[] }

export const curriculum = curriculumJson as unknown as Curriculum;
export const blueprints = blueprintsJson as unknown as Record<ExamCode, Blueprint> & { note?: string };
export const documentGroups = (documentsJson as { groups: DocumentGroup[] }).groups;
export const localResources = localJson as { contentVersion: string; region: string; lastVerified: string; sections: LocalSection[] };

export const seedQuestions: Question[] = [
  ...(tfm11.questions as Question[]),
  ...(tfm12.questions as Question[]),
];

export const contentVersion = curriculum.contentVersion;

/** Single place to change adopted code editions (28 TAC §34.607, eff. Sept 1, 2023). */
export const config = {
  adoptedEditions: {
    nfpa72: 'NFPA 72 (2019)',
    nec: 'NFPA 70 / NEC (2020)',
    adoptedBy: '28 TAC §34.607, effective Sept 1, 2023',
  },
  dailyTest: curriculum.dailyTest,
  mockExam: curriculum.mockExam,
  readinessThreshold: 80,
  psiSchedulingUrl: 'https://www.psiexams.com/txfire',
};

export const documentsById = new Map<string, StudyDocument>(
  documentGroups.flatMap(g => g.items).map(d => [d.id, d]),
);

export function dayById(day: number): CurriculumDay | undefined {
  return curriculum.days.find(d => d.day === day);
}

/** Learn-friendly label for a topic tag, e.g. 'tfm11.labels' -> 'Labels'. */
export function topicLabel(tag: string): string {
  const part = tag.split('.')[1] ?? tag;
  const names: Record<string, string> = {
    overview: 'Overview', definitions: 'Definitions', licensing: 'Licensing', scope: 'License scope',
    applications: 'Applications', insurance: 'Insurance', fees: 'Fees & renewals', standards: 'Adopted standards',
    installation: 'Installation', service: 'Service & inspection', labels: 'Labels & tags', monitoring: 'Monitoring',
    residential: 'Residential', enforcement: 'Enforcement', records: 'Records',
    orientation: 'NFPA 72 orientation', documentation: 'Documentation', fundamentals: 'Fundamentals', pathways: 'Pathways',
    nec760: 'NEC Art. 760', nec300: 'NEC Art. 300', initiating: 'Initiating devices', heat: 'Heat detectors',
    smoke: 'Smoke detectors', audible: 'Audible notification', visual: 'Visual notification', voice: 'Voice / EVACS',
    ecf: 'Emergency control functions', premises: 'Protected premises', supervising: 'Supervising stations',
    itm: 'Inspection, testing & maintenance', related: 'Related NFPA',
    '*': 'Weak areas (app-selected)',
  };
  return names[part] ?? part;
}
