import { documentGroups, type StudyDocument } from '../content';
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
              const inApp = d.type !== 'external';
              return (
                <li key={d.id} className="list__item" style={{ display: 'block' }}>
                  <div className="row row--between">
                    {link
                      ? <a href={link} target={inApp ? '_self' : '_blank'} rel="noopener noreferrer" style={{ fontWeight: 600 }}>{d.title}</a>
                      : <strong>{d.title}</strong>}
                  </div>
                  <div className="small muted">{d.purpose}</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <Badge tone={d.required ? 'info' : 'neutral'}>{d.required ? 'Required' : 'Optional'}</Badge>
                    <Badge tone={d.cost === 'free' ? 'good' : 'warn'}>{d.cost}</Badge>
                    <Badge>{inApp ? 'In app' : 'External'}</Badge>
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
