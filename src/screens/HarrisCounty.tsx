import { localResources, type LocalItem } from '../content';
import { Card, Header } from '../components/ui';

function Item({ item }: { item: LocalItem }) {
  const verified = item.lastVerified ?? localResources.lastVerified;
  let body: JSX.Element;
  switch (item.type) {
    case 'phone': body = <a href={`tel:${item.value.replace(/[^\d+]/g, '')}`}>📞 {item.value}</a>; break;
    case 'email': body = <a href={`mailto:${item.value}`}>✉️ {item.value}</a>; break;
    case 'url': body = <a href={item.value} target="_blank" rel="noopener noreferrer">🔗 {item.value.replace(/^https?:\/\//, '').slice(0, 50)}</a>; break;
    case 'address': body = <a href={`https://maps.google.com/?q=${encodeURIComponent(item.value)}`} target="_blank" rel="noopener noreferrer">📍 {item.value}</a>; break;
    default: body = <span>{item.value}</span>;
  }
  return (
    <li className="list__item" style={{ display: 'block' }}>
      <div className="small muted">{item.label}</div>
      <div>{body}</div>
      <div className="small muted">Last verified {verified}</div>
    </li>
  );
}

export default function HarrisCounty() {
  return (
    <>
      <Header title="Harris County" back="/settings" />
      <p className="muted small">{localResources.region}. Tap a phone number to call, an address to open maps.</p>
      {localResources.sections.map(s => (
        <Card key={s.id}>
          <h3>{s.title}</h3>
          <ul className="list">{s.items.map((it, i) => <Item key={i} item={it} />)}</ul>
        </Card>
      ))}
    </>
  );
}
