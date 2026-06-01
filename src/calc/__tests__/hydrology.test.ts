import { describe, it, expect } from 'vitest'
import { calcRainfallIntensity, calcPeakFlow, calcRequiredStorage } from '../hydrology'
import { ibarakiStandard } from '../../standards/ibaraki'

describe('calcRainfallIntensity', () => {
  it('10年確率・60分の降雨強度を計算する', () => {
    // r = 3300 / (60 + 15)^0.72
    // (75)^0.72 ≈ 22.39
    // r ≈ 147.4 mm/hr
    const result = calcRainfallIntensity(60, 10, ibarakiStandard)
    expect(result).toBeCloseTo(147.4, 0)
  })

  it('降雨継続時間が短いほど強度が大きくなる', () => {
    const r30 = calcRainfallIntensity(30, 10, ibarakiStandard)
    const r60 = calcRainfallIntensity(60, 10, ibarakiStandard)
    expect(r30).toBeGreaterThan(r60)
  })
})

describe('calcPeakFlow', () => {
  it('合理式による流出量を計算する', () => {
    // Q = (1/360) × C × r × A
    // C=0.7, r=140, A=2.0ha → Q = (1/360) × 0.7 × 140 × 2.0 ≈ 0.544 m³/s
    const result = calcPeakFlow(0.7, 140, 2.0)
    expect(result).toBeCloseTo(0.544, 2)
  })
})

describe('calcRequiredStorage', () => {
  it('必要貯留量を計算する（複数継続時間で最大値を返す）', () => {
    // 流域面積2ha、流出係数0.7、10年確率、許容放流量0.1m³/s、到達時間30分
    const result = calcRequiredStorage({
      basinAreaHa: 2.0,
      runoffCoefficient: 0.7,
      returnPeriod: 10,
      allowableDischargeM3s: 0.1,
      concentrationTimeMin: 30,
      standard: ibarakiStandard,
    })
    expect(result.requiredStorageM3).toBeGreaterThan(0)
    expect(result.criticalDurationMin).toBeGreaterThan(0)
    expect(result.peakFlowM3s).toBeGreaterThan(result.requiredStorageM3 / 3600) // 粗チェック
  })

  it('許容放流量が流出量以上なら必要貯留量は0になる', () => {
    const result = calcRequiredStorage({
      basinAreaHa: 0.1,
      runoffCoefficient: 0.3,
      returnPeriod: 5,
      allowableDischargeM3s: 10.0, // 十分大きな許容放流量
      concentrationTimeMin: 30,
      standard: ibarakiStandard,
    })
    expect(result.requiredStorageM3).toBe(0)
  })
})
