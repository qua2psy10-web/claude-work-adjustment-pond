import { useState, useMemo } from 'react'
import { TabBar } from './components/TabBar'
import { BasicConditionsForm } from './components/forms/BasicConditionsForm'
import { HydrologyForm } from './components/forms/HydrologyForm'
import { StructureForm } from './components/forms/StructureForm'
import { DischargeForm } from './components/forms/DischargeForm'
import { ReportPreview } from './components/report/ReportPreview'
import { prefectureStandards } from './standards/ibaraki'
import { calcRequiredStorage } from './calc/hydrology'
import { calcStructureResult } from './calc/structure'
import { calcDischargeResult } from './calc/discharge'
import type { AppState, HydrologyResult } from './types'
import type { StructureCalcResult } from './calc/structure'
import type { DischargeCalcResult } from './calc/discharge'

const defaultState: AppState = {
  basic: {
    projectName: '',
    prefecture: 'ibaraki',
    basinAreaHa: 0,
    landUse: 'residential_low',
    returnPeriodYears: 10,
    allowableDischargeM3s: 0,
  },
  hydrologyInput: { concentrationTimeMin: 30 },
  structureInput: {
    shape: 'trapezoidal',
    bottomWidthM: 5,
    poolLengthM: 20,
    slopeRatio: 1.5,
    lining: 'concrete',
    freeboardM: 0.3,
  },
  dischargeInput: {
    type: 'orifice',
    orificeDiameterM: 0.2,
    orificeCount: 1,
    weirLengthM: 1.0,
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState(1)
  const [state, setState] = useState<AppState>(defaultState)

  const standard = prefectureStandards[state.basic.prefecture]

  const hydrologyResult = useMemo<HydrologyResult | null>(() => {
    if (!standard || state.basic.basinAreaHa <= 0) return null
    const runoffCoeff = standard.runoffCoefficients[state.basic.landUse]
    const res = calcRequiredStorage({
      basinAreaHa: state.basic.basinAreaHa,
      runoffCoefficient: runoffCoeff,
      returnPeriod: state.basic.returnPeriodYears,
      allowableDischargeM3s: state.basic.allowableDischargeM3s,
      concentrationTimeMin: state.hydrologyInput.concentrationTimeMin,
      standard,
    })
    return {
      rainfallIntensityMmhr: res.rainfallIntensityMmhr,
      peakFlowM3s: res.peakFlowM3s,
      requiredStorageM3: res.requiredStorageM3,
      criticalDurationMin: res.criticalDurationMin,
    }
  }, [state.basic, state.hydrologyInput, standard])

  const structureResult = useMemo<StructureCalcResult | null>(() => {
    if (!hydrologyResult) return null
    return calcStructureResult({
      ...state.structureInput,
      requiredStorageM3: hydrologyResult.requiredStorageM3,
    })
  }, [state.structureInput, hydrologyResult])

  const dischargeResult = useMemo<DischargeCalcResult | null>(() => {
    if (!structureResult) return null
    return calcDischargeResult({
      ...state.dischargeInput,
      waterDepthM: structureResult.waterDepthM,
      allowableDischargeM3s: state.basic.allowableDischargeM3s,
    })
  }, [state.dischargeInput, structureResult, state.basic.allowableDischargeM3s])

  const tabs = [
    { id: 1, label: '① 基本条件', isValid: state.basic.projectName !== '' && state.basic.basinAreaHa > 0 },
    { id: 2, label: '② 水文計算', isValid: hydrologyResult !== null },
    { id: 3, label: '③ 構造設計', isValid: structureResult?.isCapacityOk ?? null },
    { id: 4, label: '④ 放流設備', isValid: dischargeResult?.isDischargeOk ?? null },
    { id: 5, label: '⑤ 報告書', isValid: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-3">
        <h1 className="text-lg font-bold text-gray-800">防災調整池 設計計算書作成システム</h1>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow">
          <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
          <div className="p-6">
            {activeTab === 1 && (
              <BasicConditionsForm
                value={state.basic}
                standard={standard}
                onChange={(basic: any) => setState((s) => ({ ...s, basic }))}
              />
            )}
            {activeTab === 2 && (
              <HydrologyForm
                value={state.hydrologyInput}
                basic={state.basic}
                result={hydrologyResult}
                standard={standard}
                onChange={(hydrologyInput: any) => setState((s) => ({ ...s, hydrologyInput }))}
              />
            )}
            {activeTab === 3 && (
              <StructureForm
                value={state.structureInput}
                result={structureResult}
                requiredStorageM3={hydrologyResult?.requiredStorageM3 ?? 0}
                onChange={(structureInput: any) => setState((s) => ({ ...s, structureInput }))}
              />
            )}
            {activeTab === 4 && (
              <DischargeForm
                value={state.dischargeInput}
                result={dischargeResult}
                waterDepthM={structureResult?.waterDepthM ?? 0}
                allowableDischargeM3s={state.basic.allowableDischargeM3s}
                onChange={(dischargeInput: any) => setState((s) => ({ ...s, dischargeInput }))}
              />
            )}
            {activeTab === 5 && (
              <ReportPreview
                state={state}
                hydrologyResult={hydrologyResult}
                structureResult={structureResult}
                dischargeResult={dischargeResult}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
