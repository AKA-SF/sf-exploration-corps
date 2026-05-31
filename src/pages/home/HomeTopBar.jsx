import { Sparkles } from 'lucide-react';

export default function HomeTopBar({ navItems, onResetCoordinateMap, systemReady }) {
  return (
    <header className="home-topbar">
      <a className="brand-mark" href="#top" aria-label="SF 탐사단 홈">
        <Sparkles aria-hidden="true" />
        <span>SF 탐사단</span>
        <em>INTERSTELLAR ARCHIVE VESSEL</em>
      </a>
      <nav className="top-nav" aria-label="주요 메뉴">
        {navItems.map(item => (
          <a key={item.label} href={item.href} onClick={item.href === '#coordinates' ? onResetCoordinateMap : undefined}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="system-status">
        <span>SYSTEM STATUS</span>
        <strong><i /> {systemReady ? 'ONLINE' : 'PARTIAL'}</strong>
      </div>
    </header>
  );
}
