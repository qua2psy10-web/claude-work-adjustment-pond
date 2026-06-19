import type { PrefectureStandard } from './index'
import { chibaStandard } from './chiba'

// 出典: 茨城県土木部「雨水排水施設設計基準」
// Talbot型: r = a / (t + b)^n
// t: 降雨継続時間 (分)
export const ibarakiStandard: PrefectureStandard = {
  name: '茨城県',
  rainfallCoefficients: {
    5:   { a: 2800, b: 15, n: 0.72 },
    10:  { a: 3300, b: 15, n: 0.72 },
    30:  { a: 4100, b: 15, n: 0.72 },
    50:  { a: 4500, b: 15, n: 0.72 },
    100: { a: 5000, b: 15, n: 0.72 },
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

export const prefectureStandards: Record<string, PrefectureStandard> = {
  ibaraki: ibarakiStandard,
  chiba:   chibaStandard,
}
