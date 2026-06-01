// 土地利用区分
export type LandUseType =
  | 'residential_high'   // 住宅地（高密度）
  | 'residential_low'    // 住宅地（低密度）
  | 'commercial'         // 商業・業務地
  | 'industrial'         // 工業地
  | 'paddy'              // 水田
  | 'upland'             // 畑地
  | 'forest'             // 山地・森林
  | 'road'               // 道路

// 池の断面形状
export type PoolShape = 'rectangular' | 'trapezoidal'

// 放流設備の種別
export type DischargeType = 'orifice' | 'weir' | 'both'

// 護岸種別
export type SlopeLiningType = 'concrete' | 'stone' | 'block' | 'grass'

// --- 入力値 ---

export interface BasicConditions {
  projectName: string
  prefecture: string          // 'ibaraki'
  basinAreaHa: number         // 流域面積 (ha)
  landUse: LandUseType
  returnPeriodYears: number   // 確率年 (5/10/30/50/100)
  allowableDischargeM3s: number // 許容放流量 (m³/s)
}

export interface HydrologyInput {
  concentrationTimeMin: number  // 到達時間 (分)
}

export interface StructureInput {
  shape: PoolShape
  bottomWidthM: number     // 池底幅 (m)
  poolLengthM: number      // 池長 (m)
  waterDepthM: number      // 設計水深 (m)
  slopeRatio: number       // 法面勾配 n（1:n）
  lining: SlopeLiningType
  freeboardM: number       // 余裕高 (m)
}

export interface DischargeInput {
  type: DischargeType
  // オリフィス
  orificeDiameterM: number  // 孔径 (m)
  orificeCount: number      // 個数
  // 越流堰
  weirLengthM: number       // 越流長 (m)
}

// --- 計算結果 ---

export interface HydrologyResult {
  rainfallIntensityMmhr: number   // 降雨強度 r (mm/hr)
  peakFlowM3s: number             // 計画流出量 Q (m³/s)
  requiredStorageM3: number       // 必要貯留量 V (m³)
  criticalDurationMin: number     // 貯留量最大となる降雨継続時間 (分)
}

export interface StructureResult {
  actualVolumeM3: number          // 実容量 (m³)
  waterDepthM: number             // 設計水深 (m)
  totalDepthM: number             // 全深（設計水深＋余裕高）(m)
  topWidthM: number               // 天端幅 (m)
  isCapacityOk: boolean           // 実容量 ≥ 必要貯留量
}

export interface DischargeResult {
  orificeDischargeM3s: number     // オリフィス放流量 (m³/s)
  weirDischargeM3s: number        // 越流堰放流量 (m³/s)
  totalDischargeM3s: number       // 合計放流量 (m³/s)
  isDischargeOk: boolean          // 合計放流量 ≤ 許容放流量
}

// --- アプリ全体状態 ---

export interface AppState {
  basic: BasicConditions
  hydrologyInput: HydrologyInput
  structureInput: StructureInput
  dischargeInput: DischargeInput
}
