import type { LandUseType } from '../types'

export interface RainfallCoefficients {
  a: number
  b: number
  n: number
}

// 確率年 → 降雨強度式係数のマップ
export type ReturnPeriodCoeffMap = Record<number, RainfallCoefficients>

export interface PrefectureStandard {
  name: string
  // 降雨強度式 r = a / (t + b)^n [mm/hr]
  // t: 降雨継続時間 (分), returnPeriod: 確率年
  rainfallCoefficients: ReturnPeriodCoeffMap
  // 土地利用別流出係数
  runoffCoefficients: Record<LandUseType, number>
  // 茨城県基準の余裕高 (m)
  defaultFreeboardM: number
  // 茨城県基準の最小法面勾配
  minSlopeRatio: number
  // 対応する確率年リスト
  availableReturnPeriods: number[]
}
