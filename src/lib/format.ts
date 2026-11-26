import type { SymbolInfo } from '../data/symbols';

const nfCache = new Map<number, Intl.NumberFormat>();
export function formatNumber(v: number, decimals: number): string {
  let nf = nfCache.get(decimals);
  if (!nf) {
    nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    nfCache.set(decimals, nf);
  }
  return nf.format(v);
}

export function formatPrice(v: number, s: SymbolInfo): string {
  return formatNumber(v, s.decimals);
}

export function formatSigned(v: number, decimals: number): string {
  return (v > 0 ? '+' : '') + formatNumber(v, decimals);
}

export function formatPct(p: number): string {
  return (p > 0 ? '+' : '') + p.toFixed(2) + '%';
}

const koCompact = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });
const enCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export function formatCompact(v: number): string {
  return koCompact.format(v);
}

export function formatCap(v: number | undefined, currency: SymbolInfo['currency']): string {
  if (v == null) return '—';
  if (currency === 'KRW') return koCompact.format(v) + '원';
  if (currency === 'USD') return '$' + enCompact.format(v);
  return enCompact.format(v);
}

export function capInKrw(s: SymbolInfo): number {
  if (!s.cap) return 0;
  return s.currency === 'USD' ? s.cap * 1400 : s.cap;
}

export function changeClass(v: number): string {
  return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
}
