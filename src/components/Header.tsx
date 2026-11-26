import { Link, NavLink, useLocation } from 'react-router-dom';
import { chartPrefsStore, openSearch, settingsStore } from '../store/app';
import { useStore } from '../store/store';
import { Logo } from './common';

export function Header() {
  const prefs = useStore(chartPrefsStore);
  const settings = useStore(settingsStore);
  const { pathname } = useLocation();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <Logo />
        <span>StockView</span>
      </Link>
      <nav className="nav">
        <NavLink to="/" end>
          시장
        </NavLink>
        <NavLink to={`/chart/${prefs.lastSymbol}`} className={pathname.startsWith('/chart') ? 'active' : ''}>
          차트
        </NavLink>
        <NavLink to="/screener">스크리너</NavLink>
      </nav>
      <button className="search-trigger" onClick={() => openSearch('navigate')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span>종목, 지수, 코인 검색</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="topbar-right">
        <span className="sim-badge" title="모든 시세는 브라우저에서 생성한 시뮬레이션 데이터입니다">
          <i /> 시뮬레이션 시세
        </span>
        <div className="seg" title="상승/하락 색상">
          <button
            className={settings.colorMode === 'kr' ? 'on' : ''}
            onClick={() => settingsStore.set({ colorMode: 'kr' })}
          >
            <b className="dot" style={{ background: '#f04452' }} />
            국내식
          </button>
          <button
            className={settings.colorMode === 'global' ? 'on' : ''}
            onClick={() => settingsStore.set({ colorMode: 'global' })}
          >
            <b className="dot" style={{ background: '#14b886' }} />
            해외식
          </button>
        </div>
      </div>
    </header>
  );
}
