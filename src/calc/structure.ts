import type { PoolShape } from '../types'

interface PoolVolumeParams {
  shape: PoolShape
  bottomWidthM: number
  poolLengthM: number
  slopeRatio: number  // 1:n の n
  waterDepthM: number
}

// 池の貯留容量を計算する
export function calcPoolVolume(params: PoolVolumeParams): number {
  const { shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM } = params
  if (shape === 'rectangular') {
    return bottomWidthM * waterDepthM * poolLengthM
  }
  // 台形断面: 面積 = (底辺 + 上辺) / 2 × 高さ
  const topWidth = bottomWidthM + 2 * slopeRatio * waterDepthM
  const crossSectionArea = ((bottomWidthM + topWidth) / 2) * waterDepthM
  return crossSectionArea * poolLengthM
}

interface StructureInputCalc {
  shape: PoolShape
  bottomWidthM: number
  poolLengthM: number
  slopeRatio: number
  freeboardM: number
  requiredStorageM3: number
}

export interface StructureCalcResult {
  actualVolumeM3: number
  waterDepthM: number
  totalDepthM: number
  topWidthM: number
  isCapacityOk: boolean
}

// 構造設計の計算結果をまとめて返す
// 設計水深は実容量 ≥ 必要貯留量 となるように池寸法から逆算せず、
// 入力された寸法から実容量を計算し判定する。
// （設計者が寸法を調整しながら使うフロー）
export function calcStructureResult(params: StructureInputCalc): StructureCalcResult {
  const { shape, bottomWidthM, poolLengthM, slopeRatio, freeboardM, requiredStorageM3 } = params

  // 設計水深は合理的な値を逆算: 実容量が必要貯留量と等しくなる水深を2分探索
  // ただし最大水深を10mに制限
  let lo = 0.01, hi = 10.0
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    const v = calcPoolVolume({ shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM: mid })
    if (v < requiredStorageM3) lo = mid
    else hi = mid
  }
  const waterDepthM = (lo + hi) / 2
  const actualVolumeM3 = calcPoolVolume({ shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM })
  const topWidthM = shape === 'rectangular'
    ? bottomWidthM
    : bottomWidthM + 2 * slopeRatio * waterDepthM
  const totalDepthM = waterDepthM + freeboardM

  return {
    actualVolumeM3: Math.round(actualVolumeM3),
    waterDepthM: Math.round(waterDepthM * 100) / 100,
    totalDepthM: Math.round(totalDepthM * 100) / 100,
    topWidthM: Math.round(topWidthM * 100) / 100,
    isCapacityOk: actualVolumeM3 >= requiredStorageM3,
  }
}
