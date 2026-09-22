import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StudyBlock, StudySection, StudySource } from '../content/study';

function Block({ b }: { b: StudyBlock }) {
  if (b.type === 'list') return <ul className="study__list">{b.items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
  if (b.type === 'table') {
    const [head, ...rows] = b.rows;
    return (
      <div className="study__tablewrap">
        <table className="study__table">
          <thead><tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  if (b.type === 'note') return <p className="study__note">{b.text}</p>;
  // Statute/rule paragraphs: indent lettered / numbered subdivisions by nesting depth.
  const m = b.text.match(/^(\([a-z]\)|\(\d+\)|\([A-Z]\)|\([ivx]+\))\s/);
  const depth = !m ? 0 : /^\([a-z]\)/.test(m[1]) ? 0 : /^\(\d+\)/.test(m[1]) ? 1 : /^\([A-Z]\)/.test(m[1]) ? 2 : 3;
  return <p className={'study__p study__p--d' + depth}>{b.text}</p>;
}

/** One section of bundled study text, collapsible. */
export function StudySectionView({ source, section, open: initiallyOpen = false, showSource = true }:
  { source: StudySource; section: StudySection; open?: boolean; showSource?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <section className={'study' + (open ? ' study--open' : '')} id={section.id}>
      <button className="study__head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{section.heading}</span>
        <span className="study__chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="study__body">
          {section.blocks.map((b, i) => <Block key={i} b={b} />)}
          {showSource && (
            <p className="study__src">
              From <Link to={`/guide/${source.id}`}>{source.title}</Link>. Retrieved {source.retrievedOn}
              {section.reviewDate ? `, chapter review date ${section.reviewDate}` : ''}.{' '}
              <a href={section.sourceUrl || source.sourceUrl} target="_blank" rel="noopener noreferrer">Live source ↗</a>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
