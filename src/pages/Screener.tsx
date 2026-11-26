import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkline, StarButton, SymbolBadge } from '../components/common';
import { generateHistory, useQuotes } from '../data/market';
import { MARKET_LABEL, SYMBOLS, type MarketType } from '../data/symbols';
import { rsi } from '../lib/indicators';
import { capInKrw, changeClass, formatCap, formatCompact, formatPct, formatPrice } from '../lib/format';
import { useColors } from '../store/app';

type SortKey = 'name' | 'price' | 'change' | 'volume' | 'cap' | 'rsi';
const TABS: ('ALL' | MarketType)[] = ['ALL', 'KR', 'US', 'INDEX', 'CRYPTO', 'FX', 'COMMODITY'];

export default function Screener() {
  const quotes = useQuotes();
  const colors = useColors();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'ALL' | MarketType>('ALL');
  const [q, setQ] = useState('');
  const [rsiFilter, setRsiFilter] = useState<'all' | 'over' | 'under'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'cap', dir: -1 });

  const tech = useMemo(() => {
    const out: Record<string, { rsi: number; spark: number[]; perf30: number }> = {};
    for (const s of SYMBOLS) {
      const closes = generateHistory(s.symbol, '1D', 120).map((b) => b.close);
      const r = rsi(closes, 14);
      out[s.symbol] = {
        rsi: r[r.length - 1],
        spark: closes.slice(-30),
        perf30: (closes[closes.length - 1] / closes[closes.length - 31] - 1) * 100,
      };
    }
    return out;
  }, []);

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    const list = SYMBOLS.filter(
      (s) =>
        (tab === 'ALL' || s.market === tab) &&
        (!k || s.name.toLowerCase().includes(k) || s.symbol.toLowerCase().includes(k) || s.sector.includes(k)) &&
        (rsiFilter === 'all' || (rsiFilter === 'over' ? tech[s.symbol].rsi >= 70 : tech[s.symbol].rsi <= 30)),
    );
    const val = (s: (typeof SYMBOLS)[number]): number | string => {
      const qt = quotes[s.symbol];
      switch (sort.key) {
        case 'name':
          return s.name;
        case 'price':
          return qt.price;
        case 'change':
          return qt.changePct;
        case 'volume':
          return qt.volume;
        case 'cap':
          return capInKrw(s);
        case 'rsi':
          return tech[s.symbol].rsi;
      }
    };
    return list.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === 'string') return va.localeCompare(vb as string, 'ko') * sort.dir;
      return ((va as number) - (vb as number)) * sort.dir;
    });
  }, [q, tab, rsiFilter, sort, quotes, tech]);

  const th = (key: SortKey, label: string, right = true) => (
    <th
      className={`${right ? 'r' : ''} sortable ${sort.key === key ? 'sorted' : ''}`}
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}
    >
      {label}
      {sort.key === key && <span className="arrow">{sort.dir === 1 ? '▲' : '▼'}</span>}
    </th>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>스크리너</h1>
          <p className="muted">조건으로 종목을 골라내고 열 제목을 눌러 정렬하세요. ({rows.length}개)</p>
        </div>
        <input className="input search-box" placeholder="이름, 코드, 섹터 필터" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="filter-bar">
        <div className="chips">
          {TABS.map((t) => (
            <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'ALL' ? '전체' : MARKET_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="chips">
          <span className="muted small">RSI(14)</span>
          {(
            [
              ['all', '전체'],
              ['over', '과매수 ≥70'],
              ['under', '과매도 ≤30'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={`chip ${rsiFilter === id ? 'on' : ''}`} onClick={() => setRsiFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th />
              {th('name', '종목', false)}
              <th>시장</th>
              <th>섹터</th>
              {th('price', '현재가')}
              {th('change', '등락률')}
              {th('volume', '거래량')}
              {th('cap', '시가총액')}
              {th('rsi', 'RSI(14)')}
              <th className="r">30일 추이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const qt = quotes[s.symbol];
              const t = tech[s.symbol];
              return (
                <tr key={s.symbol} onClick={() => navigate(`/chart/${s.symbol}`)}>
                  <td className="w-star">
                    <StarButton symbol={s.symbol} />
                  </td>
                  <td>
                    <div className="cell-sym">
                      <SymbolBadge info={s} />
                      <div>
                        <div className="wr-sym">{s.name}</div>
                        <div className="wr-sub">{s.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{MARKET_LABEL[s.market]}</td>
                  <td className="muted">{s.sector}</td>
                  <td className="r num">{formatPrice(qt.price, s)}</td>
                  <td className="r">
                    <span className={`num pct-badge ${changeClass(qt.change)}`}>{formatPct(qt.changePct)}</span>
                  </td>
                  <td className="r num">{formatCompact(qt.volume)}</td>
                  <td className="r num">{formatCap(s.cap, s.currency)}</td>
                  <td className="r">
                    <span className={`num rsi ${t.rsi >= 70 ? 'hot' : t.rsi <= 30 ? 'cold' : ''}`}>{t.rsi.toFixed(1)}</span>
                  </td>
                  <td className="r">
                    <Sparkline values={t.spark} width={96} height={28} color={t.perf30 >= 0 ? colors.up : colors.down} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty pad">조건에 맞는 종목이 없습니다</div>}
      </div>
    </div>
  );
}
