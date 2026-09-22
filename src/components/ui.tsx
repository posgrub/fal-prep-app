import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Question } from '../types';
import { documentsById } from '../content';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'good' | 'bad' | 'info' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function UnreviewedBadge({ q }: { q: Pick<Question, 'needsReview'> }) {
  return q.needsReview ? <Badge tone="warn">Unreviewed</Badge> : null;
}

export function Header({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <header className="header">
      {back ? <Link to={back} className="header__back" aria-label="Back">‹</Link> : <span />}
      <h1 className="header__title">{title}</h1>
      <span className="header__right">{right}</span>
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'card ' + className}>{children}</section>;
}

export function CitationText({ q }: { q: Question }) {
  const doc = documentsById.get(q.citation.documentId);
  const label = doc ? doc.title : q.citation.documentId;
  return (
    <span className="citation">
      {doc?.url ? <a href={doc.url} target="_blank" rel="noopener noreferrer">{label}</a> : label}
      {q.citation.section ? ` — ${q.citation.section}` : ''}
    </span>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}><div className="progress__fill" style={{ width: pct + '%' }} /></div>;
}

export function pct(n: number): string { return Math.round(n * 100) + '%'; }
