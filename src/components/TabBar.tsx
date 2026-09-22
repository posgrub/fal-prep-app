import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Today', icon: '📅' },
  { to: '/practice', label: 'Practice', icon: '✏️' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => 'tab' + (isActive ? ' tab--active' : '')}>
          <span className="tab__icon" aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
