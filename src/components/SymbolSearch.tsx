import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKET_LABEL, SYMBOLS, type MarketType } from '../data/symbols';
import { searchStore, watchlistStore } from '../store/app';
import { useStore } from '../store/store';
import { ChangePct, LivePrice, SymbolBadge } from './common';

const TABS: ('ALL' | MarketType)[] = ['ALL', 'KR', 'US', 'INDEX', 'CRYPTO', 'FX', 'COMMODITY'];

export function SymbolSearch() {
  const { open, mode } = useStore(searchStore);
  const watch = useStore(watchlistStore);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'ALL' | MarketType>('ALL');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    return SYMBOLS.filter(
      (s) =>
        (tab === 'ALL' || s.market === tab) &&
        (!k || s.symbol.toLowerCase().includes(k) || s.name.toLowerCase().includes(k) || s.sector.includes(k)),
    );
  }, [q, tab]);

  useEffect(() => setSel(0), [q, tab]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;
  const close = () => searchStore.set({ open: false, mode });
  const choose = (symbol: string) => {
    if (mode === 'watchlist') {
      if (!watch.includes(symbol)) watchlistStore.set([...watch, symbol]);
    } else navigate(`/chart/${symbol}`);
    close();
  };

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="search-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-head">
          <span className="search-title">{mode === 'watchlist' ? '관심종목 추가' : '종목 검색'}</span>
          <button className="icon-btn" onClick={close} aria-label="닫기">
            ✕
          </button>
        </div>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="종목명 · 코드 · 섹터 (예: 삼성, NVDA, 반도체)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(results.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter' && results[sel]) choose(results[sel].symbol);
            else if (e.key === 'Escape') close();
          }}
        />
        <div className="chips">
          {TABS.map((t) => (
            <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'ALL' ? '전체' : MARKET_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="search-list" ref={listRef}>
          {results.length === 0 && <div className="empty">검색 결과가 없습니다</div>}
          {results.map((s, i) => (
            <div
              key={s.symbol}
              data-i={i}
              className={`search-row ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => choose(s.symbol)}
            >
              <SymbolBadge info={s} />
              <div className="sr-main">
                <div className="sr-name">{s.name}</div>
                <div className="sr-sub">
                  {s.symbol} · {MARKET_LABEL[s.market]} · {s.exchange}
                </div>
              </div>
              <div className="sr-price">
                <LivePrice info={s} />
                <ChangePct symbol={s.symbol} />
              </div>
              {mode === 'watchlist' && watch.includes(s.symbol) && <span className="tag">추가됨</span>}
            </div>
          ))}
        </div>
        <div className="search-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 이동
          </span>
          <span>
            <kbd>Enter</kbd> 선택
          </span>
          <span>
            <kbd>Esc</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
