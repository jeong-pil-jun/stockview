import { useSyncExternalStore } from 'react';
import { SYMBOLS, SYMBOL_MAP, type SymbolInfo } from './symbols';
import { gauss, hashString, mulberry32 } from '../lib/rng';

export interface Quote {
  symbol: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePct: number;
  lastTickVolume: number;
  dir: -1 | 0 | 1;
  updatedAt: number;
}

export interface Bar {
  time: number; // unix seconds (bar start)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeframeId = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

export const TIMEFRAMES: { id: TimeframeId; label: string; sec: number }[] = [
  { id: '1m', label: '1분', sec: 60 },
  { id: '5m', label: '5분', sec: 300 },
  { id: '15m', label: '15분', sec: 900 },
  { id: '1h', label: '1시간', sec: 3600 },
  { id: '4h', label: '4시간', sec: 14400 },
  { id: '1D', label: '일', sec: 86400 },
  { id: '1W', label: '주', sec: 604800 },
];

export function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function makeQuote(
  s: SymbolInfo,
  price: number,
  prevClose: number,
  open: number,
  high: number,
  low: number,
  volume: number,
  lastTickVolume: number,
  dir: -1 | 0 | 1,
  updatedAt: number,
): Quote {
  const change = roundTo(price - prevClose, s.decimals);
  return {
    symbol: s.symbol,
    price,
    prevClose,
    open,
    high,
    low,
    volume,
    change,
    changePct: (change / prevClose) * 100,
    lastTickVolume,
    dir,
    updatedAt,
  };
}

function initQuote(s: SymbolInfo): Quote {
  const r = mulberry32(hashString(s.symbol + ':quote'));
  const d = s.decimals;
  const prevClose = s.base;
  const open = roundTo(prevClose * (1 + gauss(r) * s.vol * 0.25), d);
  const price = roundTo(prevClose * (1 + gauss(r) * s.vol * 0.8), d);
  const high = roundTo(Math.max(open, price) * (1 + Math.abs(gauss(r)) * s.vol * 0.25), d);
  const low = roundTo(Math.min(open, price) * (1 - Math.abs(gauss(r)) * s.vol * 0.25), d);
  const volume = Math.round(s.avgVol * (0.3 + r() * 0.5));
  return makeQuote(s, price, prevClose, open, high, low, volume, 0, 0, Date.now());
}

let snapshot: Record<string, Quote> = Object.fromEntries(SYMBOLS.map((s) => [s.symbol, initQuote(s)]));
const listeners = new Set<() => void>();

function tick() {
  const now = Date.now();
  const next: Record<string, Quote> = {};
  for (const s of SYMBOLS) {
    const q = snapshot[s.symbol];
    // 체결이 없는 틱 (암호화폐는 항상 체결)
    if (s.market !== 'CRYPTO' && Math.random() < 0.25) {
      next[s.symbol] = q;
      continue;
    }
    const sigma = s.vol * Math.sqrt(1 / 86400) * 5;
    const pull = -Math.log(q.price / q.prevClose) * 0.002; // 약한 평균회귀
    let price = roundTo(q.price * Math.exp(gauss(Math.random) * sigma + pull), s.decimals);
    if (!(price > 0)) price = q.price;
    const tv = Math.max(1, Math.round((s.avgVol / 23400) * (0.2 + Math.random() * 1.8)));
    const dir = price > q.price ? 1 : price < q.price ? -1 : 0;
    next[s.symbol] = makeQuote(s, price, q.prevClose, q.open, Math.max(q.high, price), Math.min(q.low, price), q.volume + tv, tv, dir, now);
  }
  snapshot = next;
  listeners.forEach((l) => l());
}

setInterval(tick, 1000);

export function subscribeMarket(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQuote(symbol: string): Quote | undefined {
  return snapshot[symbol];
}

export function getQuotes(): Record<string, Quote> {
  return snapshot;
}

export function useQuote(symbol: string): Quote | undefined {
  return useSyncExternalStore(subscribeMarket, () => snapshot[symbol]);
}

export function useQuotes(): Record<string, Quote> {
  return useSyncExternalStore(subscribeMarket, getQuotes);
}

/** 심볼·타임프레임별로 결정적인(seeded) 과거 봉 데이터를 생성하고 현재가에 맞춰 이어 붙인다. */
export function generateHistory(symbol: string, tfId: TimeframeId, count?: number): Bar[] {
  const s = SYMBOL_MAP[symbol];
  const tf = TIMEFRAMES.find((t) => t.id === tfId)!;
  const n = count ?? (tfId === '1W' ? 300 : 600);
  const q = snapshot[symbol];
  const rng = mulberry32(hashString(symbol + ':' + tfId));
  const sigma = s.vol * Math.sqrt(tf.sec / 86400);
  const ph1 = rng() * Math.PI * 2;
  const ph2 = rng() * Math.PI * 2;
  const end = Math.floor(Date.now() / 1000 / tf.sec) * tf.sec;
  const bars: Bar[] = new Array(n);
  let c = q.price;
  for (let i = n - 1; i >= 0; i--) {
    const trend = Math.sin(i / 37 + ph1) * 0.18 * sigma + Math.sin(i / 113 + ph2) * 0.12 * sigma;
    const r = gauss(rng) * sigma + trend;
    const o = c / Math.exp(r);
    const hi = Math.max(o, c) * (1 + Math.abs(gauss(rng)) * sigma * 0.4);
    const lo = Math.min(o, c) * (1 - Math.abs(gauss(rng)) * sigma * 0.4);
    const volume = Math.round(s.avgVol * (tf.sec / 86400) * (0.5 + rng()) * (1 + (Math.abs(r) / sigma) * 0.5));
    bars[i] = {
      time: end - (n - 1 - i) * tf.sec,
      open: roundTo(o, s.decimals),
      high: roundTo(hi, s.decimals),
      low: roundTo(lo, s.decimals),
      close: roundTo(c, s.decimals),
      volume,
    };
    c = o;
  }
  return bars;
}
