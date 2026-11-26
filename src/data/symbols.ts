export type MarketType = 'INDEX' | 'KR' | 'US' | 'CRYPTO' | 'FX' | 'COMMODITY';

export interface SymbolInfo {
  symbol: string;
  name: string;
  market: MarketType;
  exchange: string;
  sector: string;
  base: number; // 기준가(전일 종가)
  vol: number; // 일간 변동성
  decimals: number;
  currency: 'KRW' | 'USD' | 'JPY' | '';
  cap?: number; // 시가총액 (해당 통화)
  avgVol: number; // 일평균 거래량
}

export const MARKET_LABEL: Record<MarketType, string> = {
  INDEX: '지수',
  KR: '국내주식',
  US: '해외주식',
  CRYPTO: '암호화폐',
  FX: '외환',
  COMMODITY: '원자재',
};

// 주의: 아래 가격/시가총액은 시뮬레이션용 기준값이며 실제 시세가 아닙니다.
export const SYMBOLS: SymbolInfo[] = [
  { symbol: 'KOSPI', name: '코스피', market: 'INDEX', exchange: 'KRX', sector: '지수', base: 2550, vol: 0.009, decimals: 2, currency: '', avgVol: 4.2e8 },
  { symbol: 'KOSDAQ', name: '코스닥', market: 'INDEX', exchange: 'KRX', sector: '지수', base: 720, vol: 0.012, decimals: 2, currency: '', avgVol: 9.5e8 },
  { symbol: 'SPX', name: 'S&P 500', market: 'INDEX', exchange: 'US', sector: '지수', base: 5900, vol: 0.008, decimals: 2, currency: '', avgVol: 2.5e9 },
  { symbol: 'NDX', name: '나스닥 100', market: 'INDEX', exchange: 'US', sector: '지수', base: 20800, vol: 0.011, decimals: 2, currency: '', avgVol: 1.1e9 },
  { symbol: 'DJI', name: '다우존스', market: 'INDEX', exchange: 'US', sector: '지수', base: 43000, vol: 0.007, decimals: 2, currency: '', avgVol: 3.5e8 },
  { symbol: 'N225', name: '닛케이 225', market: 'INDEX', exchange: 'JP', sector: '지수', base: 38500, vol: 0.011, decimals: 2, currency: '', avgVol: 1.4e9 },

  { symbol: '005930', name: '삼성전자', market: 'KR', exchange: 'KOSPI', sector: '반도체', base: 58000, vol: 0.018, decimals: 0, currency: 'KRW', cap: 3.46e14, avgVol: 1.8e7 },
  { symbol: '000660', name: 'SK하이닉스', market: 'KR', exchange: 'KOSPI', sector: '반도체', base: 180000, vol: 0.026, decimals: 0, currency: 'KRW', cap: 1.31e14, avgVol: 3.5e6 },
  { symbol: '373220', name: 'LG에너지솔루션', market: 'KR', exchange: 'KOSPI', sector: '2차전지', base: 380000, vol: 0.025, decimals: 0, currency: 'KRW', cap: 8.9e13, avgVol: 3.0e5 },
  { symbol: '207940', name: '삼성바이오로직스', market: 'KR', exchange: 'KOSPI', sector: '바이오', base: 950000, vol: 0.019, decimals: 0, currency: 'KRW', cap: 6.76e13, avgVol: 6.0e4 },
  { symbol: '005380', name: '현대차', market: 'KR', exchange: 'KOSPI', sector: '자동차', base: 220000, vol: 0.018, decimals: 0, currency: 'KRW', cap: 4.6e13, avgVol: 7.0e5 },
  { symbol: '000270', name: '기아', market: 'KR', exchange: 'KOSPI', sector: '자동차', base: 95000, vol: 0.019, decimals: 0, currency: 'KRW', cap: 3.8e13, avgVol: 1.2e6 },
  { symbol: '068270', name: '셀트리온', market: 'KR', exchange: 'KOSPI', sector: '바이오', base: 180000, vol: 0.021, decimals: 0, currency: 'KRW', cap: 3.9e13, avgVol: 8.0e5 },
  { symbol: '035420', name: 'NAVER', market: 'KR', exchange: 'KOSPI', sector: '인터넷', base: 190000, vol: 0.02, decimals: 0, currency: 'KRW', cap: 3.0e13, avgVol: 7.5e5 },
  { symbol: '035720', name: '카카오', market: 'KR', exchange: 'KOSPI', sector: '인터넷', base: 37000, vol: 0.022, decimals: 0, currency: 'KRW', cap: 1.64e13, avgVol: 2.5e6 },
  { symbol: '005490', name: 'POSCO홀딩스', market: 'KR', exchange: 'KOSPI', sector: '철강', base: 300000, vol: 0.022, decimals: 0, currency: 'KRW', cap: 2.5e13, avgVol: 4.0e5 },
  { symbol: '105560', name: 'KB금융', market: 'KR', exchange: 'KOSPI', sector: '금융', base: 85000, vol: 0.017, decimals: 0, currency: 'KRW', cap: 3.4e13, avgVol: 1.5e6 },
  { symbol: '012450', name: '한화에어로스페이스', market: 'KR', exchange: 'KOSPI', sector: '방산', base: 380000, vol: 0.03, decimals: 0, currency: 'KRW', cap: 1.9e13, avgVol: 6.0e5 },

  { symbol: 'AAPL', name: 'Apple', market: 'US', exchange: 'NASDAQ', sector: '하드웨어', base: 230, vol: 0.015, decimals: 2, currency: 'USD', cap: 3.5e12, avgVol: 5.5e7 },
  { symbol: 'MSFT', name: 'Microsoft', market: 'US', exchange: 'NASDAQ', sector: '소프트웨어', base: 420, vol: 0.014, decimals: 2, currency: 'USD', cap: 3.1e12, avgVol: 2.1e7 },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US', exchange: 'NASDAQ', sector: '반도체', base: 140, vol: 0.032, decimals: 2, currency: 'USD', cap: 3.4e12, avgVol: 2.5e8 },
  { symbol: 'AMZN', name: 'Amazon', market: 'US', exchange: 'NASDAQ', sector: '이커머스', base: 200, vol: 0.019, decimals: 2, currency: 'USD', cap: 2.1e12, avgVol: 4.2e7 },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'US', exchange: 'NASDAQ', sector: '인터넷', base: 170, vol: 0.018, decimals: 2, currency: 'USD', cap: 2.1e12, avgVol: 2.8e7 },
  { symbol: 'META', name: 'Meta Platforms', market: 'US', exchange: 'NASDAQ', sector: '인터넷', base: 560, vol: 0.022, decimals: 2, currency: 'USD', cap: 1.4e12, avgVol: 1.3e7 },
  { symbol: 'TSLA', name: 'Tesla', market: 'US', exchange: 'NASDAQ', sector: '자동차', base: 330, vol: 0.038, decimals: 2, currency: 'USD', cap: 1.05e12, avgVol: 9.0e7 },
  { symbol: 'AVGO', name: 'Broadcom', market: 'US', exchange: 'NASDAQ', sector: '반도체', base: 170, vol: 0.026, decimals: 2, currency: 'USD', cap: 8.0e11, avgVol: 2.6e7 },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'US', exchange: 'NYSE', sector: '금융', base: 240, vol: 0.013, decimals: 2, currency: 'USD', cap: 6.8e11, avgVol: 9.0e6 },
  { symbol: 'NFLX', name: 'Netflix', market: 'US', exchange: 'NASDAQ', sector: '미디어', base: 880, vol: 0.021, decimals: 2, currency: 'USD', cap: 3.8e11, avgVol: 3.4e6 },

  { symbol: 'BTCUSD', name: '비트코인', market: 'CRYPTO', exchange: 'CRYPTO', sector: '암호화폐', base: 95000, vol: 0.03, decimals: 2, currency: 'USD', cap: 1.88e12, avgVol: 3.5e5 },
  { symbol: 'ETHUSD', name: '이더리움', market: 'CRYPTO', exchange: 'CRYPTO', sector: '암호화폐', base: 3400, vol: 0.04, decimals: 2, currency: 'USD', cap: 4.1e11, avgVol: 4.5e6 },
  { symbol: 'SOLUSD', name: '솔라나', market: 'CRYPTO', exchange: 'CRYPTO', sector: '암호화폐', base: 240, vol: 0.055, decimals: 2, currency: 'USD', cap: 1.14e11, avgVol: 2.5e7 },
  { symbol: 'XRPUSD', name: '리플', market: 'CRYPTO', exchange: 'CRYPTO', sector: '암호화폐', base: 1.4, vol: 0.06, decimals: 4, currency: 'USD', cap: 8.0e10, avgVol: 4.0e9 },

  { symbol: 'USDKRW', name: '달러/원', market: 'FX', exchange: 'FX', sector: '외환', base: 1395, vol: 0.004, decimals: 2, currency: 'KRW', avgVol: 1.0e5 },
  { symbol: 'EURUSD', name: '유로/달러', market: 'FX', exchange: 'FX', sector: '외환', base: 1.05, vol: 0.004, decimals: 5, currency: 'USD', avgVol: 1.0e5 },
  { symbol: 'USDJPY', name: '달러/엔', market: 'FX', exchange: 'FX', sector: '외환', base: 154, vol: 0.005, decimals: 3, currency: 'JPY', avgVol: 1.0e5 },

  { symbol: 'XAUUSD', name: '금', market: 'COMMODITY', exchange: 'COMEX', sector: '귀금속', base: 2650, vol: 0.01, decimals: 2, currency: 'USD', avgVol: 2.0e5 },
  { symbol: 'WTI', name: 'WTI 원유', market: 'COMMODITY', exchange: 'NYMEX', sector: '에너지', base: 69, vol: 0.02, decimals: 2, currency: 'USD', avgVol: 3.0e5 },
];

export const SYMBOL_MAP: Record<string, SymbolInfo> = Object.fromEntries(SYMBOLS.map((s) => [s.symbol, s]));

export function getSymbol(symbol: string | undefined): SymbolInfo | undefined {
  return symbol ? SYMBOL_MAP[symbol.toUpperCase()] : undefined;
}
