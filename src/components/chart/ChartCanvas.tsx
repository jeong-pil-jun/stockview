import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Bar } from '../../data/market';
import { formatNumber } from '../../lib/format';

export type Tool = 'cursor' | 'trend' | 'hline' | 'erase';
export type ChartType = 'candle' | 'line' | 'area';
export interface DrawPoint {
  t: number;
  p: number;
}
export interface Drawing {
  id: string;
  type: 'trend' | 'hline';
  points: DrawPoint[];
}
export interface Overlay {
  id: string;
  label: string;
  color: string;
  values: number[];
}
export interface PaneSeries {
  label: string;
  color: string;
  values: number[];
  type: 'line' | 'hist';
}
export interface SubPane {
  id: string;
  label: string;
  series: PaneSeries[];
  fixed?: { min: number; max: number };
  levels?: number[];
}

export interface ChartProps {
  bars: Bar[];
  tfSec: number;
  tfLabel: string;
  title: string;
  decimals: number;
  chartType: ChartType;
  showVolume: boolean;
  overlays: Overlay[];
  panes: SubPane[];
  colors: { up: string; down: string };
  tool: Tool;
  drawings: Drawing[];
  onAddDrawing: (d: Drawing) => void;
  onRemoveDrawing: (id: string) => void;
  resetKey: string;
}

export interface ChartHandle {
  toImage: () => string;
  resetView: () => void;
}

const AXIS_W = 76;
const AXIS_H = 26;
const C = {
  bg: '#0f131b',
  grid: 'rgba(140,150,175,0.07)',
  text: '#8b94a7',
  strong: '#e7eaf0',
  cross: 'rgba(200,206,222,0.5)',
  border: '#232b3b',
  accent: '#8b7bff',
  labelBg: '#323a4d',
};
const FONT = '11px Pretendard, "Malgun Gothic", system-ui, sans-serif';
const FONT_B = '600 13px Pretendard, "Malgun Gothic", system-ui, sans-serif';

interface View {
  rightIdx: number;
  spacing: number;
  len: number;
}
interface Layout {
  plotW: number;
  mainH: number;
  xOf: (i: number) => number;
  idxAt: (x: number) => number;
  yOf: (p: number) => number;
  priceAt: (y: number) => number;
  idxOfTime: (t: number) => number;
  timeOfIdx: (i: number) => number;
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(raw));
  const f = raw / e;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e;
}

const pad = (n: number) => String(n).padStart(2, '0');

function fmtAxisTime(t: number, tfSec: number, prevT: number | null): string {
  const d = new Date(t * 1000);
  const prev = prevT == null ? null : new Date(prevT * 1000);
  if (tfSec >= 604800) {
    if (prev && prev.getFullYear() !== d.getFullYear()) return String(d.getFullYear());
    return `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth() + 1)}`;
  }
  if (tfSec >= 86400) {
    if (prev && prev.getFullYear() !== d.getFullYear()) return String(d.getFullYear());
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (prev && prev.toDateString() !== d.toDateString()) return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtFullTime(t: number, tfSec: number): string {
  const d = new Date(t * 1000);
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return tfSec >= 86400 ? date : `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtVal(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  return formatNumber(v, a >= 1000 ? 0 : a >= 1 ? 2 : 4);
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function render(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ChartProps,
  v: View,
  mouse: { x: number; y: number } | null,
  pending: DrawPoint | null,
): Layout | null {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  const { bars } = p;
  const n = bars.length;
  if (!n) return null;

  const plotW = Math.max(10, w - AXIS_W);
  const avail = h - AXIS_H;
  const nSub = p.panes.length;
  const subH = nSub ? Math.max(64, Math.min(140, avail * 0.2)) : 0;
  const mainH = Math.max(60, avail - subH * nSub);
  const s = v.spacing;
  const R = v.rightIdx;
  const xOf = (i: number) => plotW - (R - i + 0.5) * s;
  const idxAt = (x: number) => R + 0.5 - (plotW - x) / s;
  const t0 = bars[0].time;
  const idxOfTime = (t: number) => (t - t0) / p.tfSec;
  const timeOfIdx = (i: number) => t0 + i * p.tfSec;

  const leftIdx = R - plotW / s;
  const first = Math.max(0, Math.floor(leftIdx) - 1);
  const last = Math.min(n - 1, Math.ceil(R) + 1);

  // ---- 가격 범위 ----
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = first; i <= last; i++) {
    const b = bars[i];
    if (p.chartType === 'candle') {
      if (b.low < lo) lo = b.low;
      if (b.high > hi) hi = b.high;
    } else {
      if (b.close < lo) lo = b.close;
      if (b.close > hi) hi = b.close;
    }
    for (const o of p.overlays) {
      const val = o.values[i];
      if (Number.isFinite(val)) {
        if (val < lo) lo = val;
        if (val > hi) hi = val;
      }
    }
  }
  if (!Number.isFinite(lo)) {
    lo = bars[n - 1].close * 0.99;
    hi = bars[n - 1].close * 1.01;
  }
  if (hi - lo < 1e-12) {
    const d = Math.abs(hi) * 0.01 || 1;
    lo -= d;
    hi += d;
  }
  const range = hi - lo;
  hi += range * 0.08;
  lo -= range * (p.showVolume ? 0.22 : 0.08);
  const yOf = (pr: number) => ((hi - pr) / (hi - lo)) * mainH;
  const priceAt = (y: number) => hi - (y / mainH) * (hi - lo);

  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;

  // ---- 그리드 ----
  const steps = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];
  const k = steps.find((x) => x * s >= 90) ?? Math.ceil(90 / s);
  const timeTicks: number[] = [];
  for (let i = Math.ceil(leftIdx / k) * k; i <= R; i += k) timeTicks.push(i);
  const pStep = niceStep((hi - lo) / Math.max(2, mainH / 56));
  const priceTicks: number[] = [];
  for (let val = Math.ceil(lo / pStep) * pStep; val <= hi; val += pStep) priceTicks.push(val);

  ctx.strokeStyle = C.grid;
  ctx.beginPath();
  for (const i of timeTicks) {
    const x = Math.round(xOf(i)) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, avail);
  }
  for (const val of priceTicks) {
    const y = Math.round(yOf(val)) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(plotW, y);
  }
  ctx.stroke();

  // ---- 메인 패널 (클립) ----
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, plotW, mainH);
  ctx.clip();

  let bw = Math.max(1, Math.round(s * 0.7));
  if (bw > 1 && bw % 2 === 0) bw -= 1;

  if (p.showVolume) {
    let maxV = 0;
    for (let i = first; i <= last; i++) maxV = Math.max(maxV, bars[i].volume);
    const volH = mainH * 0.18;
    for (let i = first; i <= last; i++) {
      const b = bars[i];
      const hh = maxV ? (b.volume / maxV) * volH : 0;
      ctx.fillStyle = hexA(b.close >= b.open ? p.colors.up : p.colors.down, 0.3);
      ctx.fillRect(Math.round(xOf(i)) - Math.floor(bw / 2), mainH - hh, bw, hh);
    }
  }

  if (p.chartType === 'candle') {
    for (let i = first; i <= last; i++) {
      const b = bars[i];
      const col = b.close >= b.open ? p.colors.up : p.colors.down;
      const x = Math.round(xOf(i));
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, Math.round(yOf(b.high)));
      ctx.lineTo(x + 0.5, Math.round(yOf(b.low)));
      ctx.stroke();
      const yo = yOf(b.open);
      const yc = yOf(b.close);
      const top = Math.round(Math.min(yo, yc));
      const bh = Math.max(1, Math.round(Math.abs(yc - yo)));
      ctx.fillRect(x - Math.floor(bw / 2), top, bw, bh);
    }
  } else {
    const path = new Path2D();
    for (let i = first; i <= last; i++) {
      const x = xOf(i);
      const y = yOf(bars[i].close);
      if (i === first) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    if (p.chartType === 'area') {
      const fill = new Path2D(path);
      fill.lineTo(xOf(last), mainH);
      fill.lineTo(xOf(first), mainH);
      fill.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, mainH);
      g.addColorStop(0, hexA(C.accent, 0.35));
      g.addColorStop(1, hexA(C.accent, 0));
      ctx.fillStyle = g;
      ctx.fill(fill);
    }
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.stroke(path);
    ctx.lineWidth = 1;
  }

  // 오버레이 (이동평균 등)
  ctx.lineWidth = 1.5;
  for (const o of p.overlays) {
    ctx.strokeStyle = o.color;
    ctx.beginPath();
    let pen = false;
    for (let i = first; i <= last; i++) {
      const val = o.values[i];
      if (!Number.isFinite(val)) {
        pen = false;
        continue;
      }
      const x = xOf(i);
      const y = yOf(val);
      if (pen) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke();
  }

  // 그리기 객체
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = C.accent;
  ctx.fillStyle = C.accent;
  for (const d of p.drawings) {
    if (d.type === 'trend' && d.points.length === 2) {
      const [a, b] = d.points;
      const x1 = xOf(idxOfTime(a.t));
      const y1 = yOf(a.p);
      const x2 = xOf(idxOfTime(b.t));
      const y2 = yOf(b.p);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.type === 'hline') {
      const y = Math.round(yOf(d.points[0].p)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
    }
  }
  if (pending && mouse && p.tool === 'trend') {
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(xOf(idxOfTime(pending.t)), yOf(pending.p));
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 현재가 라인
  const lb = bars[n - 1];
  const prevClose = n > 1 ? bars[n - 2].close : lb.open;
  const lastCol = lb.close >= prevClose ? p.colors.up : p.colors.down;
  const ly = Math.round(yOf(lb.close)) + 0.5;
  ctx.lineWidth = 1;
  ctx.strokeStyle = hexA(lastCol, 0.7);
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(0, ly);
  ctx.lineTo(plotW, ly);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ---- 보조 패널 ----
  const paneInfo: { top: number; min: number; max: number }[] = [];
  p.panes.forEach((pane, pi) => {
    const top = mainH + pi * subH;
    let mn = Infinity;
    let mx = -Infinity;
    if (pane.fixed) {
      mn = pane.fixed.min;
      mx = pane.fixed.max;
    } else {
      for (const se of pane.series) {
        if (se.type === 'hist') {
          mn = Math.min(mn, 0);
          mx = Math.max(mx, 0);
        }
        for (let i = first; i <= last; i++) {
          const val = se.values[i];
          if (Number.isFinite(val)) {
            mn = Math.min(mn, val);
            mx = Math.max(mx, val);
          }
        }
      }
      if (!Number.isFinite(mn)) {
        mn = -1;
        mx = 1;
      }
      const r = mx - mn || 1;
      mn -= r * 0.1;
      mx += r * 0.1;
    }
    const innerTop = top + 6;
    const innerH = subH - 12;
    const yP = (val: number) => innerTop + ((mx - val) / (mx - mn)) * innerH;
    paneInfo.push({ top, min: mn, max: mx });

    ctx.strokeStyle = C.border;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(top) + 0.5);
    ctx.lineTo(w, Math.round(top) + 0.5);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top + 1, plotW, subH - 1);
    ctx.clip();
    if (pane.levels) {
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(140,150,175,0.35)';
      ctx.beginPath();
      for (const lv of pane.levels) {
        const y = Math.round(yP(lv)) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const se of pane.series) {
      if (se.type === 'hist') {
        const y0 = yP(0);
        for (let i = first; i <= last; i++) {
          const val = se.values[i];
          if (!Number.isFinite(val)) continue;
          const y = yP(val);
          ctx.fillStyle = hexA(val >= 0 ? p.colors.up : p.colors.down, 0.6);
          ctx.fillRect(Math.round(xOf(i)) - Math.floor(bw / 2), Math.min(y, y0), bw, Math.max(1, Math.abs(y - y0)));
        }
      } else {
        ctx.strokeStyle = se.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let pen = false;
        for (let i = first; i <= last; i++) {
          const val = se.values[i];
          if (!Number.isFinite(val)) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(xOf(i), yP(val));
          else ctx.moveTo(xOf(i), yP(val));
          pen = true;
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    ctx.restore();
  });

  // ---- 축 ----
  ctx.fillStyle = C.bg;
  ctx.fillRect(plotW, 0, AXIS_W, h);
  ctx.fillRect(0, avail, w, AXIS_H);
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.moveTo(Math.round(plotW) + 0.5, 0);
  ctx.lineTo(Math.round(plotW) + 0.5, h);
  ctx.moveTo(0, Math.round(avail) + 0.5);
  ctx.lineTo(w, Math.round(avail) + 0.5);
  ctx.stroke();

  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  for (const val of priceTicks) {
    const y = yOf(val);
    if (y < 8 || y > mainH - 8) continue;
    ctx.fillText(formatNumber(val, p.decimals), plotW + 8, y);
  }
  p.panes.forEach((pane, pi) => {
    const { top, min, max } = paneInfo[pi];
    const innerTop = top + 6;
    const innerH = subH - 12;
    const vals = pane.levels ?? [max - (max - min) * 0.1, min + (max - min) * 0.1];
    ctx.fillStyle = C.text;
    for (const val of vals) {
      ctx.fillText(fmtVal(val), plotW + 8, innerTop + ((max - val) / (max - min)) * innerH);
    }
  });

  ctx.textAlign = 'center';
  let prevT: number | null = null;
  for (const i of timeTicks) {
    const t = timeOfIdx(i);
    ctx.fillStyle = C.text;
    ctx.fillText(fmtAxisTime(t, p.tfSec, prevT), xOf(i), avail + AXIS_H / 2);
    prevT = t;
  }
  ctx.textAlign = 'left';

  const axisLabel = (y: number, text: string, bg: string) => {
    ctx.fillStyle = bg;
    ctx.fillRect(plotW + 1, Math.round(y - 9), AXIS_W - 1, 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, plotW + 8, y);
  };
  for (const d of p.drawings) {
    if (d.type === 'hline') {
      const y = yOf(d.points[0].p);
      if (y > 0 && y < mainH) axisLabel(y, formatNumber(d.points[0].p, p.decimals), C.accent);
    }
  }
  if (ly > 0 && ly < mainH) axisLabel(ly, formatNumber(lb.close, p.decimals), lastCol);

  // ---- 크로스헤어 ----
  let legendIdx = n - 1;
  if (mouse && mouse.x >= 0 && mouse.x < plotW && mouse.y >= 0 && mouse.y < avail) {
    const ci = Math.round(idxAt(mouse.x));
    legendIdx = Math.max(0, Math.min(n - 1, ci));
    const cx = Math.round(xOf(ci)) + 0.5;
    const cy = Math.round(mouse.y) + 0.5;
    ctx.strokeStyle = C.cross;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, avail);
    ctx.moveTo(0, cy);
    ctx.lineTo(plotW, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    let label = '';
    if (mouse.y < mainH) label = formatNumber(priceAt(mouse.y), p.decimals);
    else {
      const pi = Math.min(nSub - 1, Math.floor((mouse.y - mainH) / subH));
      const info = paneInfo[pi];
      if (info) {
        const innerTop = info.top + 6;
        const innerH = subH - 12;
        label = fmtVal(info.max - ((mouse.y - innerTop) / innerH) * (info.max - info.min));
      }
    }
    if (label) axisLabel(mouse.y, label, C.labelBg);

    const tl = fmtFullTime(timeOfIdx(ci), p.tfSec);
    const tw = ctx.measureText(tl).width + 16;
    const tx = Math.max(0, Math.min(plotW - tw, cx - tw / 2));
    ctx.fillStyle = C.labelBg;
    ctx.fillRect(tx, avail + 1, tw, AXIS_H - 2);
    ctx.fillStyle = '#fff';
    ctx.fillText(tl, tx + 8, avail + AXIS_H / 2);
  }

  // ---- 범례 ----
  const b = bars[legendIdx];
  const prev = legendIdx > 0 ? bars[legendIdx - 1].close : b.open;
  const ch = b.close - prev;
  const legendCol = ch >= 0 ? p.colors.up : p.colors.down;
  ctx.textBaseline = 'top';
  let lx = 12;
  ctx.font = FONT_B;
  ctx.fillStyle = C.strong;
  const title = `${p.title} · ${p.tfLabel}`;
  ctx.fillText(title, lx, 10);
  lx += ctx.measureText(title).width + 14;
  ctx.font = FONT;
  const items: [string, number][] = [
    ['시', b.open],
    ['고', b.high],
    ['저', b.low],
    ['종', b.close],
  ];
  for (const [k2, val] of items) {
    ctx.fillStyle = C.text;
    ctx.fillText(k2, lx, 12);
    lx += ctx.measureText(k2).width + 4;
    ctx.fillStyle = legendCol;
    const t = formatNumber(val, p.decimals);
    ctx.fillText(t, lx, 12);
    lx += ctx.measureText(t).width + 10;
  }
  ctx.fillStyle = legendCol;
  ctx.fillText(`${ch >= 0 ? '+' : ''}${formatNumber(ch, p.decimals)} (${((ch / prev) * 100).toFixed(2)}%)`, lx, 12);

  let oy = 32;
  let ox = 12;
  for (const o of p.overlays) {
    const t = `${o.label} ${fmtVal(o.values[legendIdx])}`;
    ctx.fillStyle = o.color;
    ctx.fillText(t, ox, oy);
    ox += ctx.measureText(t).width + 14;
    if (ox > plotW - 160) {
      ox = 12;
      oy += 16;
    }
  }

  p.panes.forEach((pane, pi) => {
    const top = paneInfo[pi].top;
    let px = 12;
    ctx.fillStyle = C.text;
    ctx.fillText(pane.label, px, top + 6);
    px += ctx.measureText(pane.label).width + 10;
    for (const se of pane.series) {
      const val = se.values[legendIdx];
      ctx.fillStyle = se.type === 'hist' ? (val >= 0 ? p.colors.up : p.colors.down) : se.color;
      const t = fmtVal(val);
      ctx.fillText(t, px, top + 6);
      px += ctx.measureText(t).width + 10;
    }
  });
  ctx.textBaseline = 'middle';

  return { plotW, mainH, xOf, idxAt, yOf, priceAt, idxOfTime, timeOfIdx };
}

export const ChartCanvas = forwardRef<ChartHandle, ChartProps>(function ChartCanvas(props, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const viewRef = useRef<View>({ rightIdx: props.bars.length + 4, spacing: 8, len: props.bars.length });
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const pendingRef = useRef<DrawPoint | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const rafRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; rightIdx: number; moved: boolean } | null>(null);

  // draw/schedule/clamp는 ref만 읽으므로 어떤 렌더의 클로저든 동일하게 동작한다.
  const draw = () => {
    const c = canvasRef.current;
    const { w, h, dpr } = sizeRef.current;
    if (!c || !w || !h) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutRef.current = render(ctx, w, h, propsRef.current, viewRef.current, mouseRef.current, pendingRef.current);
  };
  const schedule = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      draw();
    });
  };
  const clampView = () => {
    const v = viewRef.current;
    const plotW = Math.max(10, sizeRef.current.w - AXIS_W);
    const visible = plotW / v.spacing;
    v.rightIdx = Math.max(5, Math.min(v.len - 1 + visible * 0.8, v.rightIdx));
  };
  const resetView = () => {
    const v = viewRef.current;
    v.spacing = 8;
    v.rightIdx = v.len + 4;
    schedule();
  };

  useImperativeHandle(ref, () => ({
    toImage: () => canvasRef.current?.toDataURL('image/png') ?? '',
    resetView,
  }));

  useEffect(() => {
    const v = viewRef.current;
    v.len = props.bars.length;
    v.rightIdx = props.bars.length + 4;
    pendingRef.current = null;
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.resetKey]);

  useEffect(() => {
    const v = viewRef.current;
    const n = props.bars.length;
    if (n !== v.len) {
      // 오른쪽 끝을 보고 있으면 새 봉을 따라간다
      if (v.rightIdx >= v.len - 2) v.rightIdx += n - v.len;
      v.len = n;
    }
    schedule();
  });

  useEffect(() => {
    if (props.tool !== 'trend') pendingRef.current = null;
  }, [props.tool]);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const c = canvasRef.current!;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: r.width, h: r.height, dpr };
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      c.style.width = r.width + 'px';
      c.style.height = r.height + 'px';
      draw();
    });
    ro.observe(wrap);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const v = viewRef.current;
      const plotW = Math.max(10, sizeRef.current.w - AXIS_W);
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        v.rightIdx += (e.deltaX || e.deltaY) / v.spacing;
      } else {
        const ax = Math.min(e.clientX - rect.left, plotW);
        const i0 = v.rightIdx + 0.5 - (plotW - ax) / v.spacing;
        v.spacing = Math.max(1.5, Math.min(60, v.spacing * Math.exp(-e.deltaY * 0.0015)));
        v.rightIdx = i0 - 0.5 + (plotW - ax) / v.spacing;
      }
      clampView();
      schedule();
    };
    c.addEventListener('wheel', onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingRef.current) {
        pendingRef.current = null;
        schedule();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      ro.disconnect();
      c.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handleClick = (pt: { x: number; y: number }) => {
    const L = layoutRef.current;
    const P = propsRef.current;
    if (!L || pt.x > L.plotW || pt.y > L.mainH) return;
    const idx = Math.round(L.idxAt(pt.x));
    const dp = { t: L.timeOfIdx(idx), p: L.priceAt(pt.y) };
    const id = Math.random().toString(36).slice(2);
    if (P.tool === 'trend') {
      if (!pendingRef.current) pendingRef.current = dp;
      else {
        P.onAddDrawing({ id, type: 'trend', points: [pendingRef.current, dp] });
        pendingRef.current = null;
      }
    } else if (P.tool === 'hline') {
      P.onAddDrawing({ id, type: 'hline', points: [dp] });
    } else if (P.tool === 'erase') {
      for (let i = P.drawings.length - 1; i >= 0; i--) {
        const d = P.drawings[i];
        let dist = Infinity;
        if (d.type === 'hline') dist = Math.abs(L.yOf(d.points[0].p) - pt.y);
        else if (d.points.length === 2) {
          const [a, b] = d.points;
          dist = distToSeg(pt.x, pt.y, L.xOf(L.idxOfTime(a.t)), L.yOf(a.p), L.xOf(L.idxOfTime(b.t)), L.yOf(b.p));
        }
        if (dist < 7) {
          P.onRemoveDrawing(d.id);
          break;
        }
      }
    }
    schedule();
  };

  return (
    <div ref={wrapRef} className="chart-canvas-wrap">
      <canvas
        ref={canvasRef}
        style={{ cursor: props.tool === 'erase' ? 'pointer' : 'crosshair' }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          canvasRef.current!.setPointerCapture(e.pointerId);
          const pt = pos(e);
          dragRef.current = { ...pt, rightIdx: viewRef.current.rightIdx, moved: false };
        }}
        onPointerMove={(e) => {
          const pt = pos(e);
          mouseRef.current = pt;
          const d = dragRef.current;
          if (d) {
            const dx = pt.x - d.x;
            if (Math.abs(dx) > 3 || Math.abs(pt.y - d.y) > 3) d.moved = true;
            if (d.moved) {
              viewRef.current.rightIdx = d.rightIdx - dx / viewRef.current.spacing;
              clampView();
            }
          }
          schedule();
        }}
        onPointerUp={(e) => {
          const d = dragRef.current;
          dragRef.current = null;
          if (d && !d.moved) handleClick(pos(e));
        }}
        onPointerLeave={() => {
          mouseRef.current = null;
          schedule();
        }}
        onDoubleClick={resetView}
      />
    </div>
  );
});
