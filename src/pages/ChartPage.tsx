import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ChartCanvas, type ChartHandle, type ChartType, type Drawing, type Overlay, type SubPane, type Tool } from '../components/chart/ChartCanvas';
import { useClickOutside } from '../components/common';
import { AlertsPanel, SymbolDetail, Watchlist } from '../components/SidePanels';
import { TIMEFRAMES, type Bar } from '../data/market';
import { getSymbol, type SymbolInfo } from '../data/symbols';
import { useBars } from '../hooks/useBars';
import { bollinger, ema, macd, rsi, sma } from '../lib/indicators';
import { chartPrefsStore, drawingsStore, openSearch, useColors, type IndicatorPrefs } from '../store/app';
import { useStore } from '../store/store';

const EMPTY: Drawing[] = [];

const INDICATORS: { key: keyof IndicatorPrefs; label: string; desc: string }[] = [
  { key: 'volume', label: '거래량', desc: '봉별 거래량 막대' },
  { key: 'sma20', label: 'SMA 20', desc: '단순 이동평균 20' },
  { key: 'sma50', label: 'SMA 50', desc: '단순 이동평균 50' },
  { key: 'ema20', label: 'EMA 20', desc: '지수 이동평균 20' },
  { key: 'bb', label: '볼린저 밴드', desc: '20, 2σ' },
  { key: 'rsi', label: 'RSI', desc: '상대강도지수 14' },
  { key: 'macd', label: 'MACD', desc: '12, 26, 9' },
];

function buildIndicators(bars: Bar[], ind: IndicatorPrefs) {
  const closes = bars.map((b) => b.close);
  const overlays: Overlay[] = [];
  const panes: SubPane[] = [];
  if (ind.sma20) overlays.push({ id: 'sma20', label: 'SMA 20', color: '#f5a524', values: sma(closes, 20) });
  if (ind.sma50) overlays.push({ id: 'sma50', label: 'SMA 50', color: '#38bdf8', values: sma(closes, 50) });
  if (ind.ema20) overlays.push({ id: 'ema20', label: 'EMA 20', color: '#e879f9', values: ema(closes, 20) });
  if (ind.bb) {
    const b = bollinger(closes);
    overlays.push({ id: 'bbu', label: 'BB 상단', color: '#7dd3c0', values: b.upper });
    overlays.push({ id: 'bbm', label: 'BB 중심', color: '#94a3b8', values: b.mid });
    overlays.push({ id: 'bbl', label: 'BB 하단', color: '#7dd3c0', values: b.lower });
  }
  if (ind.rsi)
    panes.push({
      id: 'rsi',
      label: 'RSI 14',
      fixed: { min: 0, max: 100 },
      levels: [30, 70],
      series: [{ label: 'RSI', color: '#a78bfa', values: rsi(closes, 14), type: 'line' }],
    });
  if (ind.macd) {
    const m = macd(closes);
    panes.push({
      id: 'macd',
      label: 'MACD 12 26 9',
      series: [
        { label: 'Hist', color: '#888', values: m.hist, type: 'hist' },
        { label: 'MACD', color: '#38bdf8', values: m.line, type: 'line' },
        { label: 'Signal', color: '#f5a524', values: m.signal, type: 'line' },
      ],
    });
  }
  return { overlays, panes };
}

const TOOLS: { id: Tool; label: string; icon: JSX.Element }[] = [
  {
    id: 'cursor',
    label: '커서 (드래그로 이동)',
    icon: <path d="M5 3l14 8-6 1.5L10 19z" strokeLinejoin="round" />,
  },
  {
    id: 'trend',
    label: '추세선 (두 번 클릭)',
    icon: (
      <>
        <path d="M4 19L20 5" />
        <circle cx="4" cy="19" r="2" />
        <circle cx="20" cy="5" r="2" />
      </>
    ),
  },
  {
    id: 'hline',
    label: '수평선 (클릭)',
    icon: (
      <>
        <path d="M2 12h20" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    id: 'erase',
    label: '지우개 (도형 클릭)',
    icon: <path d="M16 3l5 5-11 11H5l-3-3zM9 20h12" strokeLinejoin="round" />,
  },
];

function ChartView({ info }: { info: SymbolInfo }) {
  const prefs = useStore(chartPrefsStore);
  const colors = useColors();
  const tf = TIMEFRAMES.find((t) => t.id === prefs.tf) ?? TIMEFRAMES[2];
  const bars = useBars(info.symbol, tf.id);
  const [tool, setTool] = useState<Tool>('cursor');
  const [menu, setMenu] = useState(false);
  const [sideTab, setSideTab] = useState<'watch' | 'alerts'>('watch');
  const menuRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartHandle>(null);
  const allDrawings = useStore(drawingsStore);
  const drawings = allDrawings[info.symbol] ?? EMPTY;

  useEffect(() => {
    if (chartPrefsStore.get().lastSymbol !== info.symbol) chartPrefsStore.set((p) => ({ ...p, lastSymbol: info.symbol }));
    document.title = `${info.name} ${info.symbol} — StockView`;
  }, [info]);

  const closeMenu = useCallback(() => setMenu(false), []);
  useClickOutside(menuRef, closeMenu, menu);

  const { overlays, panes } = useMemo(() => buildIndicators(bars, prefs.indicators), [bars, prefs.indicators]);

  const setPrefs = (patch: Partial<typeof prefs>) => chartPrefsStore.set((p) => ({ ...p, ...patch }));
  const toggleInd = (k: keyof IndicatorPrefs) =>
    chartPrefsStore.set((p) => ({ ...p, indicators: { ...p.indicators, [k]: !p.indicators[k] } }));

  const setDrawings = (fn: (l: Drawing[]) => Drawing[]) =>
    drawingsStore.set((all) => ({ ...all, [info.symbol]: fn(all[info.symbol] ?? []) }));

  const activeCount = Object.values(prefs.indicators).filter(Boolean).length;

  const snapshot = () => {
    const url = chartRef.current?.toImage();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${info.symbol}_${tf.id}.png`;
    a.click();
  };

  return (
    <div className="chart-page">
      <div className="chart-toolbar">
        <button className="sym-btn" onClick={() => openSearch('navigate')} title="종목 변경">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <b>{info.symbol}</b>
          <span className="muted">{info.name}</span>
        </button>
        <div className="divider" />
        <div className="tf-group">
          {TIMEFRAMES.map((t) => (
            <button key={t.id} className={`tf ${t.id === tf.id ? 'on' : ''}`} onClick={() => setPrefs({ tf: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="divider" />
        <div className="tf-group">
          {(
            [
              ['candle', '캔들'],
              ['line', '라인'],
              ['area', '영역'],
            ] as [ChartType, string][]
          ).map(([id, label]) => (
            <button key={id} className={`tf ${prefs.chartType === id ? 'on' : ''}`} onClick={() => setPrefs({ chartType: id })}>
              {label}
            </button>
          ))}
        </div>
        <div className="divider" />
        <div className="dropdown" ref={menuRef}>
          <button className={`tf ${menu ? 'on' : ''}`} onClick={() => setMenu((m) => !m)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 17l5-6 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            보조지표 <span className="count">{activeCount}</span>
          </button>
          {menu && (
            <div className="menu">
              {INDICATORS.map((it) => (
                <label key={it.key} className="menu-item">
                  <input type="checkbox" checked={prefs.indicators[it.key]} onChange={() => toggleInd(it.key)} />
                  <span>
                    <b>{it.label}</b>
                    <small>{it.desc}</small>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="spacer" />
        <button className="tf" onClick={() => chartRef.current?.resetView()} title="보기 초기화 (더블클릭)">
          초기화
        </button>
        <button className="tf" onClick={snapshot} title="차트 이미지 저장">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <circle cx="12" cy="13" r="3.5" />
            <path d="M8 6l1.5-2h5L16 6" />
          </svg>
          스냅샷
        </button>
      </div>

      <div className="chart-body">
        <div className="draw-tools">
          {TOOLS.map((t) => (
            <button key={t.id} className={`tool ${tool === t.id ? 'on' : ''}`} title={t.label} onClick={() => setTool(t.id)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {t.icon}
              </svg>
            </button>
          ))}
          <div className="tool-sep" />
          <button
            className="tool"
            title="이 종목의 그림 모두 지우기"
            disabled={drawings.length === 0}
            onClick={() => setDrawings(() => [])}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="chart-main">
          <ChartCanvas
            ref={chartRef}
            bars={bars}
            tfSec={tf.sec}
            tfLabel={tf.label}
            title={`${info.name}`}
            decimals={info.decimals}
            chartType={prefs.chartType}
            showVolume={prefs.indicators.volume}
            overlays={overlays}
            panes={panes}
            colors={colors}
            tool={tool}
            drawings={drawings}
            onAddDrawing={(d) => setDrawings((l) => [...l, d])}
            onRemoveDrawing={(id) => setDrawings((l) => l.filter((d) => d.id !== id))}
            resetKey={info.symbol + tf.id}
          />
          {tool !== 'cursor' && (
            <div className="tool-hint">
              {tool === 'trend' && '시작점과 끝점을 클릭하세요 · Esc 취소'}
              {tool === 'hline' && '가격 위치를 클릭하면 수평선이 그려집니다'}
              {tool === 'erase' && '지울 선을 클릭하세요'}
            </div>
          )}
        </div>

        <aside className="side">
          <SymbolDetail info={info} />
          <div className="side-tabs">
            <button className={sideTab === 'watch' ? 'on' : ''} onClick={() => setSideTab('watch')}>
              관심종목
            </button>
            <button className={sideTab === 'alerts' ? 'on' : ''} onClick={() => setSideTab('alerts')}>
              알림
            </button>
          </div>
          {sideTab === 'watch' ? <Watchlist activeSymbol={info.symbol} /> : <AlertsPanel info={info} />}
        </aside>
      </div>
    </div>
  );
}

export default function ChartPage() {
  const { symbol } = useParams();
  const info = getSymbol(symbol);
  const last = chartPrefsStore.get().lastSymbol;
  if (!info) return <Navigate to={`/chart/${getSymbol(last) ? last : '005930'}`} replace />;
  return <ChartView info={info} />;
}
