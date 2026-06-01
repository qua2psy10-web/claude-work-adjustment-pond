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
  waterDepthM: number
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
// 設計者が寸法（幅・長さ・水深）を入力 → 実容量を計算 → 必要貯留量と比較
export function calcStructureResult(params: StructureInputCalc): StructureCalcResult {
  const { shape, bottomWidthM, poolLengthM, waterDepthM, slopeRatio, freeboardM, requiredStorageM3 } = params

  const actualVolumeM3 = calcPoolVolume({ shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM })
  const topWidthM = shape === 'rectangular'
    ? bottomWidthM
    : bottomWidthM + 2 * slopeRatio * waterDepthM
  const totalDepthM = waterDepthM + freeboardM

  return {
    actualVolumeM3: Math.round(actualVolumeM3),
    waterDepthM,
    totalDepthM: Math.round(totalDepthM * 100) / 100,
    topWidthM: Math.round(topWidthM * 100) / 100,
    isCapacityOk: Math.round(actualVolumeM3) >= requiredStorageM3,
  }
}
