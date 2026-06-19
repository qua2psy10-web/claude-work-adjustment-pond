import type { PrefectureStandard } from './index'

// 出典: 千葉県土木部「雨水排水施設設計基準」
// Talbot型: r = a / (t + b)^n
// t: 降雨継続時間 (分)
export const chibaStandard: PrefectureStandard = {
  name: '千葉県',
  rainfallCoefficients: {
    5:   { a: 2600, b: 15, n: 0.70 },
    10:  { a: 3000, b: 15, n: 0.70 },
    30:  { a: 3800, b: 15, n: 0.70 },
    50:  { a: 4200, b: 15, n: 0.70 },
    100: { a: 4700, b: 15, n: 0.70 },
  },
  runoffCoefficients: {
    residential_high: 0.80,
    residential_low:  0.65,
    commercial:       0.85,
    industrial:       0.70,
    paddy:            0.70,
    upland:           0.55,
    forest:           0.35,
    road:             0.90,
  },
  defaultFreeboardM: 0.30,
  minSlopeRatio: 1.5,
  availableReturnPeriods: [5, 10, 30, 50, 100],
}
