import { useEffect, useRef, useState } from 'react';
import { generateHistory, getQuote, subscribeMarket, TIMEFRAMES, type Bar, type TimeframeId } from '../data/market';

/** 과거 봉 + 실시간 틱으로 갱신되는 봉 배열 */
export function useBars(symbol: string, tf: TimeframeId): Bar[] {
  const key = symbol + '|' + tf;
  const [state, setState] = useState(() => ({ key, bars: generateHistory(symbol, tf) }));
  let current = state;
  if (state.key !== key) {
    current = { key, bars: generateHistory(symbol, tf) };
    setState(current);
  }
  const lastUpdate = useRef(0);

  useEffect(() => {
    const sec = TIMEFRAMES.find((t) => t.id === tf)!.sec;
    lastUpdate.current = getQuote(symbol)?.updatedAt ?? 0;
    return subscribeMarket(() => {
      const q = getQuote(symbol);
      if (!q || q.updatedAt === lastUpdate.current) return;
      lastUpdate.current = q.updatedAt;
      setState((prev) => {
        if (prev.key !== key) return prev;
        const bars = prev.bars;
        const last = bars[bars.length - 1];
        const t = Math.floor(q.updatedAt / 1000 / sec) * sec;
        let next: Bar[];
        if (t > last.time) {
          next = bars.slice(1);
          next.push({ time: t, open: last.close, high: Math.max(last.close, q.price), low: Math.min(last.close, q.price), close: q.price, volume: q.lastTickVolume });
        } else {
          next = bars.slice();
          next[next.length - 1] = {
            ...last,
            high: Math.max(last.high, q.price),
            low: Math.min(last.low, q.price),
            close: q.price,
            volume: last.volume + q.lastTickVolume,
          };
        }
        return { key, bars: next };
      });
    });
  }, [symbol, tf, key]);

  return current.bars;
}
