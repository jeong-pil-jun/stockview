import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChangePct, LivePrice, Sparkline, StarButton, SymbolBadge } from '../components/common';
import { Watchlist } from '../components/SidePanels';
import { generateHistory, useQuotes } from '../data/market';
import { SYMBOLS, SYMBOL_MAP, type SymbolInfo } from '../data/symbols';
import { capInKrw, changeClass, formatCompact, formatPct, formatPrice } from '../lib/format';
import { useColors } from '../store/app';

const HEADLINE = ['KOSPI', 'KOSDAQ', 'SPX', 'NDX', 'BTCUSD', 'USDKRW'];

function TickerTape() {
  const quotes = useQuotes();
  const navigate = useNavigate();
  const items = SYMBOLS.filter((s) => s.market !== 'KR' || (s.cap ?? 0) > 3e13);
  const row = (suffix: string) =>
    items.map((s) => {
      const q = quotes[s.symbol];
      return (
        <button key={s.symbol + suffix} className="tape-item" onClick={() => navigate(`/chart/${s.symbol}`)}>
          <b>{s.name}</b>
          <span className="num">{formatPrice(q.price, s)}</span>
          <span className={`num ${changeClass(q.change)}`}>{formatPct(q.changePct)}</span>
        </button>
      );
    });
  return (
    <div className="tape">
      <div className="tape-track">
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}

function IndexCard({ info, spark }: { info: SymbolInfo; spark: number[] }) {
  const navigate = useNavigate();
  const quotes = useQuotes();
  const colors = useColors();
  const q = quotes[info.symbol];
  const values = [...spark.slice(0, -1), q.price];
  return (
    <button className="index-card" onClick={() => navigate(`/chart/${info.symbol}`)}>
      <div className="ic-top">
        <span className="ic-name">{info.name}</span>
        <ChangePct symbol={info.symbol} badge />
      </div>
      <LivePrice info={info} className="ic-price" />
      <Sparkline values={values} width={220} height={46} color={q.change >= 0 ? colors.up : colors.down} />
    </button>
  );
}

function MoversTable({ title, list }: { title: string; list: SymbolInfo[] }) {
  const navigate = useNavigate();
  const quotes = useQuotes();
  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      <table className="table compact">
        <tbody>
          {list.map((s) => {
            const q = quotes[s.symbol];
            return (
              <tr key={s.symbol} onClick={() => navigate(`/chart/${s.symbol}`)}>
                <td>
                  <div className="cell-sym">
                    <SymbolBadge info={s} />
                    <div>
                      <div className="wr-sym">{s.name}</div>
                      <div className="wr-sub">{s.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="r num">{formatPrice(q.price, s)}</td>
                <td className="r">
                  <span className={`num pct-badge ${changeClass(q.change)}`}>{formatPct(q.changePct)}</span>
                </td>
                <td className="r num muted">{formatCompact(q.volume)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Heatmap({ title, list }: { title: string; list: SymbolInfo[] }) {
  const navigate = useNavigate();
  const quotes = useQuotes();
  const sorted = [...list].sort((a, b) => capInKrw(b) - capInKrw(a));
  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
        <span className="muted small">크기: 시가총액 · 색: 등락률</span>
      </div>
      <div className="heatmap">
        {sorted.map((s, i) => {
          const q = quotes[s.symbol];
          const pct = q.changePct;
          const strength = Math.min(100, (Math.abs(pct) / 3) * 85 + 12);
          const base = pct >= 0 ? 'var(--up)' : 'var(--down)';
          const size = i < 2 ? 'xl' : i < 5 ? 'lg' : '';
          return (
            <button
              key={s.symbol}
              className={`hm-tile ${size}`}
              style={{ background: `color-mix(in srgb, ${base} ${strength}%, #1a1f2b)` }}
              onClick={() => navigate(`/chart/${s.symbol}`)}
              title={`${s.name} ${formatPct(pct)}`}
            >
              <b>{s.name}</b>
              <span className="num">{formatPct(pct)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const quotes = useQuotes();
  const sparks = useMemo(
    () => Object.fromEntries(HEADLINE.map((s) => [s, generateHistory(s, '15m', 96).map((b) => b.close)])),
    [],
  );
  const stocks = SYMBOLS.filter((s) => s.market === 'KR' || s.market === 'US');
  const byChange = [...stocks].sort((a, b) => quotes[b.symbol].changePct - quotes[a.symbol].changePct);
  const crypto = SYMBOLS.filter((s) => s.market === 'CRYPTO' || s.market === 'COMMODITY' || s.market === 'FX');

  return (
    <div className="home">
      <TickerTape />
      <div className="home-inner">
        <section className="hero">
          <div>
            <h1>오늘의 시장</h1>
            <p className="muted">지수 · 주식 · 코인 · 환율을 한 화면에서. 카드를 누르면 차트로 이동합니다.</p>
          </div>
        </section>

        <div className="index-grid">
          {HEADLINE.map((s) => (
            <IndexCard key={s} info={SYMBOL_MAP[s]} spark={sparks[s]} />
          ))}
        </div>

        <div className="home-grid">
          <div className="home-col">
            <div className="two-col">
              <MoversTable title="상승 상위" list={byChange.slice(0, 6)} />
              <MoversTable title="하락 상위" list={byChange.slice(-6).reverse()} />
            </div>
            <Heatmap title="국내 주식 히트맵" list={SYMBOLS.filter((s) => s.market === 'KR')} />
            <Heatmap title="미국 주식 히트맵" list={SYMBOLS.filter((s) => s.market === 'US')} />
          </div>
          <aside className="home-side">
            <Watchlist />
            <section className="card">
              <div className="card-head">
                <h3>코인 · 원자재 · 외환</h3>
              </div>
              <div className="mini-list">
                {crypto.map((s) => (
                  <MiniRow key={s.symbol} info={s} />
                ))}
              </div>
            </section>
          </aside>
        </div>
        <footer className="foot muted small">
          StockView는 학습·데모용 프로젝트입니다. 표시되는 모든 시세는 실제 시장 데이터가 아닌 시뮬레이션이며 투자 판단의 근거로 사용할 수 없습니다.
        </footer>
      </div>
    </div>
  );
}

function MiniRow({ info }: { info: SymbolInfo }) {
  const navigate = useNavigate();
  return (
    <div className="watch-row" onClick={() => navigate(`/chart/${info.symbol}`)}>
      <div className="wr-main">
        <div className="wr-sym">{info.name}</div>
        <div className="wr-sub">{info.symbol}</div>
      </div>
      <div className="wr-price">
        <LivePrice info={info} />
        <ChangePct symbol={info.symbol} />
      </div>
      <StarButton symbol={info.symbol} />
    </div>
  );
}
