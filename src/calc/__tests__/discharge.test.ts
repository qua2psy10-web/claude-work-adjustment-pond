import { describe, it, expect } from 'vitest'
import { calcOrificeDischarge, calcWeirDischarge, calcDischargeResult } from '../discharge'

describe('calcOrificeDischarge', () => {
  it('オリフィス放流量を計算する', () => {
    // Q = C × A × √(2gH), C=0.6, d=0.3m → A=π×0.15²≈0.0707m², H=2m
    // Q = 0.6 × 0.0707 × √(2×9.81×2) ≈ 0.6 × 0.0707 × 6.26 ≈ 0.266 m³/s
    const q = calcOrificeDischarge({ diameterM: 0.3, count: 1, headM: 2.0 })
    expect(q).toBeCloseTo(0.266, 2)
  })

  it('個数に比例して放流量が増える', () => {
    const q1 = calcOrificeDischarge({ diameterM: 0.2, count: 1, headM: 1.5 })
    const q2 = calcOrificeDischarge({ diameterM: 0.2, count: 2, headM: 1.5 })
    expect(q2).toBeCloseTo(q1 * 2, 5)
  })
})

describe('calcWeirDischarge', () => {
  it('越流堰放流量を計算する', () => {
    // Q = C × L × H^(3/2), C=1.6, L=1.0m, H=0.3m
    // Q = 1.6 × 1.0 × 0.3^1.5 = 1.6 × 0.1643 ≈ 0.263 m³/s
    const q = calcWeirDischarge({ lengthM: 1.0, headM: 0.3 })
    expect(q).toBeCloseTo(0.263, 2)
  })
})

describe('calcDischargeResult', () => {
  it('合計放流量が許容放流量以下ならisDischargeOkがtrueになる', () => {
    const result = calcDischargeResult({
      type: 'orifice',
      orificeDiameterM: 0.15,
      orificeCount: 1,
      weirLengthM: 0,
      waterDepthM: 1.5,
      allowableDischargeM3s: 1.0,
    })
    expect(result.isDischargeOk).toBe(true)
  })
})
