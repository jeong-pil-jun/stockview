# StockView

차트 분석 · 시장 개요 · 스크리너를 제공하는 React 기반 웹앱입니다.
화면과 브랜드는 직접 새로 디자인했고, 차트 엔진은 외부 차트 라이브러리 없이 Canvas로 구현했습니다.

> ⚠️ 모든 시세는 브라우저에서 생성하는 **시뮬레이션 데이터**입니다. 실제 시장 데이터가 아니며 투자 판단에 사용할 수 없습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 체크 + 프로덕션 빌드 (dist/)
```

## 기능

| 화면 | 내용 |
| --- | --- |
| **시장** `/` | 흐르는 시세 띠, 주요 지수 카드(스파크라인), 상승/하락 상위, 국내·미국 히트맵, 관심종목 |
| **차트** `/chart/:symbol` | 캔들/라인/영역 차트, 1분~주봉, 드래그 이동 · 휠 확대 · 더블클릭 초기화, 크로스헤어 · OHLC 범례 |
| | 보조지표: 거래량, SMA 20/50, EMA 20, 볼린저밴드, RSI, MACD |
| | 그리기: 추세선, 수평선, 지우개, 전체 삭제 (종목별 자동 저장) |
| | 종목 정보, 관심종목, 가격 알림(목표가 도달 시 알림 표시), 차트 PNG 스냅샷 |
| **스크리너** `/screener` | 시장 필터, 검색, RSI 과매수/과매도 필터, 열 정렬, 30일 추이 |
| 공통 | `Ctrl+K` 종목 검색, 상승/하락 색상 전환(국내식 빨강↑ / 해외식 초록↑) |

관심종목 · 차트 설정 · 그림 · 알림은 `localStorage`에 저장됩니다.

## 구조

```
src/
  data/symbols.ts          종목 목록 (시뮬레이션 기준가)
  data/market.ts           실시간 시세 엔진(1초 틱) + 과거 봉 생성기
  hooks/useBars.ts         과거 봉 + 실시간 틱 결합
  lib/indicators.ts        SMA/EMA/볼린저/RSI/MACD
  components/chart/        Canvas 차트 엔진
  components/              헤더, 검색 모달, 사이드 패널, 공통 UI
  pages/                   Home, ChartPage, Screener
  store/                   경량 전역 스토어 (useSyncExternalStore)
```

## 실제 시세로 바꾸려면

`src/data/market.ts`의 `tick()`(실시간)과 `generateHistory()`(과거 봉)만 실제 API 호출로 교체하면 됩니다.
나머지 화면은 `Quote` / `Bar` 타입만 사용하므로 그대로 동작합니다.
