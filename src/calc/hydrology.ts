import type { PrefectureStandard } from '../standards/index'

// 降雨強度計算 r = a / (t + b)^n [mm/hr]
export function calcRainfallIntensity(
  durationMin: number,
  returnPeriod: number,
  standard: PrefectureStandard,
): number {
  const { a, b, n } = standard.rainfallCoefficients[returnPeriod]
  return a / Math.pow(durationMin + b, n)
}

// 合理式による流出量 Q = (1/360) × C × r × A [m³/s]
export function calcPeakFlow(
  runoffCoefficient: number,
  rainfallIntensityMmhr: number,
  basinAreaHa: number,
): number {
  return (1 / 360) * runoffCoefficient * rainfallIntensityMmhr * basinAreaHa
}

interface RequiredStorageParams {
  basinAreaHa: number
  runoffCoefficient: number
  returnPeriod: number
  allowableDischargeM3s: number
  concentrationTimeMin: number
  standard: PrefectureStandard
}

interface RequiredStorageResult {
  requiredStorageM3: number
  criticalDurationMin: number
  peakFlowM3s: number
  rainfallIntensityMmhr: number
}

// 必要貯留量の算定（複数継続時間で最大値を選択）
// 各継続時間 t について V(t) = (Q(t) - Q_allow) × t × 60 を計算し最大値を返す
export function calcRequiredStorage(params: RequiredStorageParams): RequiredStorageResult {
  const {
    basinAreaHa,
    runoffCoefficient,
    returnPeriod,
    allowableDischargeM3s,
    concentrationTimeMin,
    standard,
  } = params

  // t = 10分〜360分を1分刻みで探索
  const durations = Array.from({ length: 351 }, (_, i) => i + 10)

  let maxStorage = 0
  let criticalDuration = concentrationTimeMin
  let criticalIntensity = 0

  // 到達時間でのピーク流量を計算
  const peakIntensity = calcRainfallIntensity(concentrationTimeMin, returnPeriod, standard)
  const peakFlow = calcPeakFlow(runoffCoefficient, peakIntensity, basinAreaHa)

  for (const t of durations) {
    const r = calcRainfallIntensity(t, returnPeriod, standard)
    const q = calcPeakFlow(runoffCoefficient, r, basinAreaHa)
    const excess = q - allowableDischargeM3s
    if (excess <= 0) continue
    const v = excess * t * 60 // [m³]
    if (v > maxStorage) {
      maxStorage = v
      criticalDuration = t
      criticalIntensity = r
    }
  }

  return {
    requiredStorageM3: Math.ceil(maxStorage),
    criticalDurationMin: criticalDuration,
    peakFlowM3s: peakFlow,
    rainfallIntensityMmhr: criticalIntensity,
  }
}
