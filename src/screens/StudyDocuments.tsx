import { Link } from 'react-router-dom';
import { documentGroups, type StudyDocument } from '../content';
import { studySourceById } from '../content/study';
import { Badge, Card, Header } from '../components/ui';

function href(d: StudyDocument): string | undefined {
  if (d.type === 'bundled' && d.file) return `/docs/${d.file.split('/').pop()}`;
  return d.url;
}

export default function StudyDocuments() {
  return (
    <>
      <Header title="Study Documents" back="/settings" />
      {documentGroups.map(g => (
        <Card key={g.id}>
          <h3>{g.title}</h3>
          <ul className="list">
            {g.items.map(d => {
              const link = href(d);
              const bundledText = studySourceById.get(d.id);
              const inApp = d.type !== 'external' || !!bundledText;
              return (
                <li key={d.id} className="list__item" style={{ display: 'block' }}>
                  <div className="row row--between">
                    {bundledText
                      ? <Link to={`/guide/${d.id}`} style={{ fontWeight: 600 }}>{d.title}</Link>
                      : link
                        ? <a href={link} target={d.type === 'external' ? '_blank' : '_self'} rel="noopener noreferrer" style={{ fontWeight: 600 }}>{d.title}{d.type === 'external' ? ' ↗' : ''}</a>
                        : <strong>{d.title}</strong>}
                  </div>
                  <div className="small muted">{d.purpose}</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <Badge tone={d.required ? 'info' : 'neutral'}>{d.required ? 'Required' : 'Optional'}</Badge>
                    <Badge tone={d.cost === 'free' ? 'good' : 'warn'}>{d.cost}</Badge>
                    <Badge tone={inApp ? 'good' : 'neutral'}>{bundledText ? 'Full text in app' : inApp ? 'In app' : 'External'}</Badge>
                    {d.edition && <Badge>{d.edition} edition</Badge>}
                  </div>
                  {d.copyrightNote && <div className="small" style={{ color: 'var(--warn)', marginTop: 4 }}>{d.copyrightNote}</div>}
                  <div className="small muted" style={{ marginTop: 4 }}>Last verified {d.lastVerified}</div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </>
  );
}
