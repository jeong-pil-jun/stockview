import { createStore, useStore } from './store';
import { getQuote, subscribeMarket, type TimeframeId } from '../data/market';
import { SYMBOL_MAP } from '../data/symbols';
import { formatPrice } from '../lib/format';
import type { ChartType, Drawing } from '../components/chart/ChartCanvas';

// ---------- 관심종목 ----------
export const watchlistStore = createStore<string[]>(
  ['KOSPI', '005930', '000660', '035420', 'AAPL', 'NVDA', 'TSLA', 'BTCUSD', 'ETHUSD', 'USDKRW'],
  'sv.watchlist',
);
export function toggleWatch(symbol: string) {
  watchlistStore.set((l) => (l.includes(symbol) ? l.filter((s) => s !== symbol) : [...l, symbol]));
}

// ---------- 설정 ----------
export type ColorMode = 'kr' | 'global';
export const settingsStore = createStore<{ colorMode: ColorMode }>({ colorMode: 'kr' }, 'sv.settings');

const COLORS: Record<ColorMode, { up: string; down: string }> = {
  kr: { up: '#f04452', down: '#3b82f6' },
  global: { up: '#14b886', down: '#f04452' },
};
export function useColors() {
  return COLORS[useStore(settingsStore).colorMode];
}

// ---------- 차트 설정 ----------
export interface IndicatorPrefs {
  volume: boolean;
  sma20: boolean;
  sma50: boolean;
  ema20: boolean;
  bb: boolean;
  rsi: boolean;
  macd: boolean;
}
export const chartPrefsStore = createStore<{
  tf: TimeframeId;
  chartType: ChartType;
  indicators: IndicatorPrefs;
  lastSymbol: string;
}>(
  {
    tf: '15m',
    chartType: 'candle',
    indicators: { volume: true, sma20: true, sma50: false, ema20: false, bb: false, rsi: true, macd: false },
    lastSymbol: '005930',
  },
  'sv.chartPrefs',
);

// ---------- 그리기 ----------
export const drawingsStore = createStore<Record<string, Drawing[]>>({}, 'sv.drawings');

// ---------- 검색 모달 ----------
export const searchStore = createStore<{ open: boolean; mode: 'navigate' | 'watchlist' }>({
  open: false,
  mode: 'navigate',
});
export function openSearch(mode: 'navigate' | 'watchlist' = 'navigate') {
  searchStore.set({ open: true, mode });
}

// ---------- 토스트 ----------
export interface Toast {
  id: number;
  title: string;
  body: string;
}
export const toastStore = createStore<Toast[]>([]);
let toastId = 0;
export function pushToast(title: string, body: string) {
  const id = ++toastId;
  toastStore.set((l) => [...l, { id, title, body }]);
  setTimeout(() => toastStore.set((l) => l.filter((t) => t.id !== id)), 6000);
}

// ---------- 가격 알림 ----------
export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggeredAt?: number;
}
export const alertsStore = createStore<PriceAlert[]>([], 'sv.alerts');

export function addAlert(symbol: string, price: number) {
  const q = getQuote(symbol);
  if (!q || !(price > 0)) return;
  alertsStore.set((l) => [
    ...l,
    {
      id: Math.random().toString(36).slice(2),
      symbol,
      price,
      direction: price >= q.price ? 'above' : 'below',
      createdAt: Date.now(),
    },
  ]);
}

export function startAlertWatcher() {
  subscribeMarket(() => {
    const list = alertsStore.get();
    let changed = false;
    const next = list.map((a) => {
      if (a.triggeredAt) return a;
      const q = getQuote(a.symbol);
      const info = SYMBOL_MAP[a.symbol];
      if (!q || !info) return a;
      const hit = a.direction === 'above' ? q.price >= a.price : q.price <= a.price;
      if (!hit) return a;
      changed = true;
      pushToast(
        `${info.name} 가격 알림`,
        `${formatPrice(a.price, info)} ${a.direction === 'above' ? '이상' : '이하'} 도달 · 현재 ${formatPrice(q.price, info)}`,
      );
      return { ...a, triggeredAt: Date.now() };
    });
    if (changed) alertsStore.set(next);
  });
}
