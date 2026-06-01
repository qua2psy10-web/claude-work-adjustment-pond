import { describe, it, expect } from 'vitest'
import { calcPoolVolume, calcStructureResult } from '../structure'

describe('calcPoolVolume', () => {
  it('矩形断面の容量を計算する', () => {
    // 底幅5m × 深さ2m × 長さ20m = 200m³
    const v = calcPoolVolume({
      shape: 'rectangular',
      bottomWidthM: 5,
      poolLengthM: 20,
      slopeRatio: 0,
      waterDepthM: 2,
    })
    expect(v).toBeCloseTo(200, 1)
  })

  it('台形断面の容量を計算する', () => {
    // 底幅3m、深さ2m、勾配1:1.5、長さ10m
    // 上辺 = 3 + 2×1.5×2 = 9m
    // 面積 = (3+9)/2 × 2 = 12m²
    // 容量 = 12 × 10 = 120m³
    const v = calcPoolVolume({
      shape: 'trapezoidal',
      bottomWidthM: 3,
      poolLengthM: 10,
      slopeRatio: 1.5,
      waterDepthM: 2,
    })
    expect(v).toBeCloseTo(120, 1)
  })
})

describe('calcStructureResult', () => {
  it('実容量が必要貯留量以上ならisCapacityOkがtrueになる', () => {
    const result = calcStructureResult({
      shape: 'rectangular',
      bottomWidthM: 10,
      poolLengthM: 30,
      slopeRatio: 0,
      freeboardM: 0.3,
      requiredStorageM3: 200,
    })
    expect(result.isCapacityOk).toBe(true)
    expect(result.actualVolumeM3).toBeGreaterThanOrEqual(200)
  })

  it('実容量が必要貯留量未満ならisCapacityOkがfalseになる', () => {
    const result = calcStructureResult({
      shape: 'rectangular',
      bottomWidthM: 2,
      poolLengthM: 5,
      slopeRatio: 0,
      freeboardM: 0.3,
      requiredStorageM3: 10000,
    })
    expect(result.isCapacityOk).toBe(false)
  })
})
