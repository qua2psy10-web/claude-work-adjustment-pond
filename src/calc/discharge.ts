import type { DischargeType } from '../types'

const GRAVITY = 9.81
const ORIFICE_COEFF = 0.6
const WEIR_COEFF = 1.6

interface OrificeParams {
  diameterM: number
  count: number
  headM: number
}

// オリフィス放流量 Q = C × A × √(2gH)
export function calcOrificeDischarge(params: OrificeParams): number {
  const { diameterM, count, headM } = params
  const area = Math.PI * Math.pow(diameterM / 2, 2)
  return ORIFICE_COEFF * area * Math.sqrt(2 * GRAVITY * headM) * count
}

interface WeirParams {
  lengthM: number
  headM: number
}

// 越流堰放流量 Q = C × L × H^(3/2)
export function calcWeirDischarge(params: WeirParams): number {
  const { lengthM, headM } = params
  return WEIR_COEFF * lengthM * Math.pow(headM, 1.5)
}

interface DischargeCalcInput {
  type: DischargeType
  orificeDiameterM: number
  orificeCount: number
  weirLengthM: number
  waterDepthM: number         // 設計水深（=オリフィス水頭、堰天端は池底から）
  allowableDischargeM3s: number
}

export interface DischargeCalcResult {
  orificeDischargeM3s: number
  weirDischargeM3s: number
  totalDischargeM3s: number
  isDischargeOk: boolean
}

export function calcDischargeResult(params: DischargeCalcInput): DischargeCalcResult {
  const { type, orificeDiameterM, orificeCount, weirLengthM, waterDepthM, allowableDischargeM3s } = params

  const orificeQ = (type === 'orifice' || type === 'both')
    ? calcOrificeDischarge({ diameterM: orificeDiameterM, count: orificeCount, headM: waterDepthM })
    : 0

  // 越流堰の水頭は設計水深の10%（堰天端が設計水位より10%低い位置にある想定）
  const weirHead = waterDepthM * 0.1
  const weirQ = (type === 'weir' || type === 'both')
    ? calcWeirDischarge({ lengthM: weirLengthM, headM: weirHead })
    : 0

  const totalQ = orificeQ + weirQ

  return {
    orificeDischargeM3s: Math.round(orificeQ * 1000) / 1000,
    weirDischargeM3s: Math.round(weirQ * 1000) / 1000,
    totalDischargeM3s: Math.round(totalQ * 1000) / 1000,
    isDischargeOk: totalQ <= allowableDischargeM3s,
  }
}
