import tic from '../../content/study/tic-6002.json';
import tac from '../../content/study/tac-34-600.json';
import testInfo from '../../content/study/tdi-test-info.json';
import faq from '../../content/study/tdi-faq.json';
import insurance from '../../content/study/tdi-insurance.json';
import fingerprints from '../../content/study/tdi-fingerprints.json';
import smoke from '../../content/study/tdi-smoke-alarm-notice.json';
import alarmLicensing from '../../content/study/tdi-alarm-licensing.json';
import mapJson from '../../content/study_map.json';

/** Bundled public-domain study text (Texas statute, rules, and SFMO pages) with a retrieved-on date. */
export type StudyBlock =
  | { type: 'p' | 'note'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] };

export interface StudySection {
  id: string;
  heading: string;
  level: number;
  subchapter?: string;
  sourceUrl?: string;
  reviewDate?: string | null;
  blocks: StudyBlock[];
}

export interface StudySource {
  id: string;
  title: string;
  sourceUrl: string;
  retrievedOn: string;
  license: string;
  sections: StudySection[];
}

export const studySources: StudySource[] = [
  tic, tac, testInfo, faq, insurance, fingerprints, smoke, alarmLicensing,
] as unknown as StudySource[];

export const studySourceById = new Map(studySources.map(s => [s.id, s]));

const sectionIndex = new Map<string, { source: StudySource; section: StudySection }>();
studySources.forEach(source => source.sections.forEach(section => sectionIndex.set(section.id, { source, section })));

export interface DayReading { intro?: string; sections: { source: StudySource; section: StudySection }[] }

const dayMap = (mapJson as { days: Record<string, { intro?: string; sections: string[] }> }).days;

/** Resolve a curriculum day to concrete study sections ('src:*' expands to the whole source). */
export function readingsForDay(day: number): DayReading | undefined {
  const entry = dayMap[String(day)];
  if (!entry) return undefined;
  const out: DayReading['sections'] = [];
  const seen = new Set<string>();
  for (const ref of entry.sections) {
    if (ref.endsWith(':*')) {
      const src = studySourceById.get(ref.slice(0, -2));
      src?.sections.forEach(section => { if (!seen.has(section.id)) { seen.add(section.id); out.push({ source: src, section }); } });
    } else {
      const hit = sectionIndex.get(ref);
      if (hit && !seen.has(ref)) { seen.add(ref); out.push(hit); }
    }
  }
  return { intro: entry.intro, sections: out };
}

/** Rough reading time: 200 words per minute. */
export function readingMinutes(sections: { section: StudySection }[]): number {
  const words = sections.reduce((n, { section }) => n + section.blocks.reduce((m, b) => {
    if (b.type === 'list') return m + b.items.join(' ').split(/\s+/).length;
    if (b.type === 'table') return m + b.rows.flat().join(' ').split(/\s+/).length;
    return m + b.text.split(/\s+/).length;
  }, 0), 0);
  return Math.max(1, Math.round(words / 200));
}

export function blockText(b: StudyBlock): string {
  if (b.type === 'list') return b.items.join(' ');
  if (b.type === 'table') return b.rows.flat().join(' ');
  return b.text;
}

/** Simple full-text search across every bundled source. */
export function searchStudy(query: string, limit = 40): { source: StudySource; section: StudySection; snippet: string }[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: { source: StudySource; section: StudySection; snippet: string }[] = [];
  for (const source of studySources) {
    for (const section of source.sections) {
      const text = section.heading + ' ' + section.blocks.map(blockText).join(' ');
      const i = text.toLowerCase().indexOf(q);
      if (i >= 0) {
        const start = Math.max(0, i - 60);
        out.push({ source, section, snippet: (start > 0 ? '…' : '') + text.slice(start, i + q.length + 90) + '…' });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
