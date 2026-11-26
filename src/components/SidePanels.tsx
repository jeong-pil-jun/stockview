import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuote } from '../data/market';
import { MARKET_LABEL, SYMBOL_MAP, type SymbolInfo } from '../data/symbols';
import { changeClass, formatCap, formatCompact, formatPct, formatPrice, formatSigned } from '../lib/format';
import { addAlert, alertsStore, openSearch, watchlistStore } from '../store/app';
import { useStore } from '../store/store';
import { ChangePct, LivePrice, StarButton, currentPrice } from './common';

export function SymbolDetail({ info }: { info: SymbolInfo }) {
  const q = useQuote(info.symbol);
  if (!q) return null;
  const rangePos = q.high > q.low ? ((q.price - q.low) / (q.high - q.low)) * 100 : 50;
  return (
    <section className="panel detail">
      <div className="detail-head">
        <div>
          <div className="detail-name">{info.name}</div>
          <div className="muted small">
            {info.symbol} · {info.exchange} · {MARKET_LABEL[info.market]}
          </div>
        </div>
        <StarButton symbol={info.symbol} />
      </div>
      <div className="detail-price">
        <LivePrice info={info} className="big" />
        <span className="muted small">{info.currency}</span>
      </div>
      <div className={`detail-change ${changeClass(q.change)}`}>
        {formatSigned(q.change, info.decimals)} ({formatPct(q.changePct)})
      </div>
      <div className="range">
        <div className="range-labels">
          <span>{formatPrice(q.low, info)}</span>
          <span className="muted">일중 범위</span>
          <span>{formatPrice(q.high, info)}</span>
        </div>
        <div className="range-bar">
          <i style={{ left: `${rangePos}%` }} />
        </div>
      </div>
      <dl className="stats">
        <dt>시가</dt>
        <dd>{formatPrice(q.open, info)}</dd>
        <dt>전일 종가</dt>
        <dd>{formatPrice(q.prevClose, info)}</dd>
        <dt>거래량</dt>
        <dd>{formatCompact(q.volume)}</dd>
        <dt>시가총액</dt>
        <dd>{formatCap(info.cap, info.currency)}</dd>
        <dt>섹터</dt>
        <dd>{info.sector}</dd>
      </dl>
    </section>
  );
}

function WatchRow({ symbol, active }: { symbol: string; active: boolean }) {
  const info = SYMBOL_MAP[symbol];
  const navigate = useNavigate();
  if (!info) return null;
  return (
    <div className={`watch-row ${active ? 'active' : ''}`} onClick={() => navigate(`/chart/${symbol}`)}>
      <div className="wr-main">
        <div className="wr-sym">{info.name}</div>
        <div className="wr-sub">{info.symbol}</div>
      </div>
      <div className="wr-price">
        <LivePrice info={info} />
        <ChangePct symbol={symbol} />
      </div>
      <button
        className="icon-btn wr-del"
        title="삭제"
        onClick={(e) => {
          e.stopPropagation();
          watchlistStore.set((l) => l.filter((s) => s !== symbol));
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function Watchlist({ activeSymbol }: { activeSymbol?: string }) {
  const list = useStore(watchlistStore);
  return (
    <section className="panel grow">
      <div className="panel-head">
        <h3>관심종목</h3>
        <button className="btn-ghost sm" onClick={() => openSearch('watchlist')}>
          + 추가
        </button>
      </div>
      <div className="watch-list">
        {list.length === 0 && <div className="empty">관심종목을 추가해 보세요</div>}
        {list.map((s) => (
          <WatchRow key={s} symbol={s} active={s === activeSymbol} />
        ))}
      </div>
    </section>
  );
}

export function AlertsPanel({ info }: { info: SymbolInfo }) {
  const alerts = useStore(alertsStore);
  const [price, setPrice] = useState('');
  return (
    <section className="panel grow">
      <div className="panel-head">
        <h3>가격 알림</h3>
      </div>
      <form
        className="alert-form"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseFloat(price.replace(/,/g, ''));
          if (v > 0) {
            addAlert(info.symbol, v);
            setPrice('');
          }
        }}
      >
        <input
          className="input"
          inputMode="decimal"
          placeholder={`${info.name} 목표가 (현재 ${formatPrice(currentPrice(info.symbol), info)})`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button className="btn-primary sm" type="submit">
          추가
        </button>
      </form>
      <div className="alert-list">
        {alerts.length === 0 && <div className="empty">목표가에 도달하면 알려드립니다</div>}
        {[...alerts].reverse().map((a) => {
          const s = SYMBOL_MAP[a.symbol];
          if (!s) return null;
          return (
            <div key={a.id} className={`alert-row ${a.triggeredAt ? 'done' : ''}`}>
              <div>
                <div className="wr-sym">{s.name}</div>
                <div className="wr-sub">
                  {a.direction === 'above' ? '≥' : '≤'} {formatPrice(a.price, s)}
                </div>
              </div>
              <span className={`tag ${a.triggeredAt ? 'tag-done' : 'tag-live'}`}>{a.triggeredAt ? '도달' : '대기 중'}</span>
              <button
                className="icon-btn"
                title="삭제"
                onClick={() => alertsStore.set((l) => l.filter((x) => x.id !== a.id))}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
