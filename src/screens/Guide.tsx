import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { config, curriculum, documentsById } from '../content';
import { readingMinutes, searchStudy, studySourceById, studySources } from '../content/study';
import { StudySectionView } from '../components/StudyText';
import { Badge, Card, Header } from '../components/ui';

/** Study Guide index: bundled public sources + the copyrighted ones we can only link. */
export function GuideIndex() {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchStudy(q), [q]);
  const nfpa = ['nfpa-free', 'nfpa-72-2019', 'nec-2020'].map(id => documentsById.get(id)).filter(Boolean);
  return (
    <>
      <Header title="Study Guide" back="/settings" />
      <Card>
        <label className="field" style={{ marginBottom: 0 }}><span>Search the statute, rules, and SFMO pages</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. yellow label, $100,000, branch office" inputMode="search" /></label>
        {q.trim().length >= 2 && (
          <ul className="list" style={{ marginTop: 10 }}>
            {results.length === 0 && <li className="muted small">No matches.</li>}
            {results.map(r => (
              <li key={r.section.id} className="list__item" style={{ display: 'block' }}>
                <Link to={`/guide/${r.source.id}?s=${encodeURIComponent(r.section.id)}`} style={{ fontWeight: 600 }}>{r.section.heading}</Link>
                <div className="small muted">{r.source.title}</div>
                <div className="small">{r.snippet}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3>TFM11 – Statutes & Rules <Badge tone="good">Full text in app</Badge></h3>
        <p className="small muted">Every TFM11 question comes from these two texts. They are bundled here in full, organized by section, with the SFMO pages that explain them.</p>
        <ul className="list">
          {studySources.map(s => (
            <li key={s.id} className="list__item" style={{ display: 'block' }}>
              <Link to={`/guide/${s.id}`} style={{ fontWeight: 600 }}>{s.title}</Link>
              <div className="small muted">{s.sections.length} sections · about {readingMinutes(s.sections.map(section => ({ section })))} min · retrieved {s.retrievedOn}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>TFM12 – Technical <Badge tone="warn">Links only</Badge></h3>
        <p className="small">NFPA 72 ({config.adoptedEditions.nfpa72}) and the NEC ({config.adoptedEditions.nec}) are copyrighted by NFPA and cannot be copied into this app. Read them free online at NFPA (sign-in required) or buy the books. Questions in the app cite the section to look up.</p>
        <ul className="list">
          {nfpa.map(d => d && (
            <li key={d.id} className="list__item" style={{ display: 'block' }}>
              <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>{d.title} ↗</a>
              <div className="small muted">{d.purpose}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>By study day</h3>
        <p className="small muted">Each day's Review screen shows its readings inline. Jump to a day:</p>
        <div className="heat">
          {curriculum.days.filter(d => d.exam === 'TFM11').map(d => <Link key={d.day} to={`/review/${d.day}`} className="heat__cell" title={d.title}>{d.day}</Link>)}
        </div>
      </Card>
    </>
  );
}

/** One bundled source, all sections collapsible, with optional ?s=sectionId to open and scroll to. */
export function GuideSource() {
  const { sourceId } = useParams();
  const [params] = useSearchParams();
  const target = params.get('s');
  const source = studySourceById.get(sourceId ?? '');
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    if (target) setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [target, sourceId]);

  if (!source) return <><Header title="Study Guide" back="/guide" /><Card><p>Unknown source.</p></Card></>;

  // Group statute sections by subchapter when present.
  const groups: { title: string; sections: typeof source.sections }[] = [];
  source.sections.forEach(s => {
    const t = s.subchapter ?? '';
    const g = groups[groups.length - 1];
    if (g && g.title === t) g.sections.push(s); else groups.push({ title: t, sections: [s] });
  });

  return (
    <>
      <Header title={source.id.startsWith('tic') ? 'TIC 6002' : source.id.startsWith('tac') ? '28 TAC §34.600' : 'SFMO'} back="/guide"
        right={<button className="btn btn--sm btn--ghost" onClick={() => setExpandAll(e => !e)}>{expandAll ? 'Collapse' : 'Expand all'}</button>} />
      <Card>
        <h2>{source.title}</h2>
        <p className="small muted">{source.sections.length} sections · about {readingMinutes(source.sections.map(section => ({ section })))} min to read. {source.license}</p>
        <p className="small muted">Retrieved {source.retrievedOn} · <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">Live source ↗</a></p>
      </Card>
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <h3 className="study__group">{g.title}</h3>}
          {g.sections.map(s => <StudySectionView key={s.id + (expandAll ? '1' : '0') + (s.id === target ? 't' : '')} source={source} section={s} open={expandAll || s.id === target} showSource={false} />)}
        </div>
      ))}
    </>
  );
}
