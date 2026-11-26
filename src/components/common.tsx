import { useEffect, useRef, useState } from 'react';
import { getQuote, useQuote } from '../data/market';
import type { SymbolInfo } from '../data/symbols';
import { changeClass, formatPct, formatPrice } from '../lib/format';
import { toastStore, toggleWatch, watchlistStore } from '../store/app';
import { useStore } from '../store/store';

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="svlogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#svlogo)" />
      <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#fff" opacity=".7" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="#fff" opacity=".85" />
      <rect x="21" y="7" width="4" height="18" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** 값이 바뀔 때 잠깐 깜빡이는 가격 */
export function LivePrice({ info, className = '' }: { info: SymbolInfo; className?: string }) {
  const q = useQuote(info.symbol);
  const prev = useRef(q?.price);
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('');
  useEffect(() => {
    if (!q || prev.current === undefined) return;
    if (q.price !== prev.current) {
      setFlash(q.price > prev.current ? 'flash-up' : 'flash-down');
      const t = setTimeout(() => setFlash(''), 450);
      prev.current = q.price;
      return () => clearTimeout(t);
    }
  }, [q]);
  if (!q) return null;
  return <span className={`num ${className} ${flash}`}>{formatPrice(q.price, info)}</span>;
}

export function ChangePct({ symbol, badge = false }: { symbol: string; badge?: boolean }) {
  const q = useQuote(symbol);
  if (!q) return null;
  return <span className={`num ${changeClass(q.change)} ${badge ? 'pct-badge' : ''}`}>{formatPct(q.changePct)}</span>;
}

export function Sparkline({
  values,
  width = 120,
  height = 36,
  color,
}: {
  values: number[];
  width?: number;
  height?: number;
  color: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const r = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - min) / r) * (height - 4)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const id = 'sg' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function StarButton({ symbol }: { symbol: string }) {
  const list = useStore(watchlistStore);
  const on = list.includes(symbol);
  return (
    <button
      className={`icon-btn star ${on ? 'on' : ''}`}
      title={on ? '관심종목에서 제거' : '관심종목에 추가'}
      onClick={(e) => {
        e.stopPropagation();
        toggleWatch(symbol);
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function SymbolBadge({ info }: { info: SymbolInfo }) {
  const palette = ['#7c6cff', '#22d3ee', '#f59e0b', '#ec4899', '#10b981', '#6366f1', '#f97316'];
  let h = 0;
  for (const c of info.symbol) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bg = palette[h % palette.length];
  return (
    <span className="sym-badge" style={{ background: bg }}>
      {info.name.slice(0, 1)}
    </span>
  );
}

export function Toaster() {
  const toasts = useStore(toastStore);
  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <div className="toast-title">{t.title}</div>
          <div className="toast-body">{t.body}</div>
        </div>
      ))}
    </div>
  );
}

export function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOutside, active]);
}

export function currentPrice(symbol: string): number {
  return getQuote(symbol)?.price ?? 0;
}
