import type { BasicConditions, HydrologyInput, HydrologyResult } from '../../types'
import type { PrefectureStandard } from '../../standards/index'

interface Props {
  value: HydrologyInput
  basic: BasicConditions
  result: HydrologyResult | null
  standard: PrefectureStandard
  onChange: (v: HydrologyInput) => void
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono font-medium">{value} <span className="text-gray-400 text-xs">{unit}</span></span>
    </div>
  )
}

export function HydrologyForm({ value, basic, result, standard, onChange }: Props) {
  const runoffCoeff = standard.runoffCoefficients[basic.landUse]

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-700">水文計算</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-600">入力値</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">到達時間 (分)</label>
            <input
              type="number"
              min={5}
              max={360}
              step={1}
              value={value.concentrationTimeMin}
              onChange={(e) =>
                onChange({ concentrationTimeMin: parseInt(e.target.value) || 30 })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="text-sm text-gray-500 space-y-1 bg-gray-50 rounded p-3">
            <div>流域面積: <strong>{basic.basinAreaHa} ha</strong></div>
            <div>流出係数 C: <strong>{runoffCoeff}</strong></div>
            <div>確率年: <strong>{basic.returnPeriodYears} 年</strong></div>
            <div>許容放流量: <strong>{basic.allowableDischargeM3s} m³/s</strong></div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-600">計算結果</h3>
          {result ? (
            <div className="bg-blue-50 rounded p-4">
              <ResultRow label="降雨強度 r" value={result.rainfallIntensityMmhr.toFixed(1)} unit="mm/hr" />
              <ResultRow label="計画流出量 Q" value={result.peakFlowM3s.toFixed(3)} unit="m³/s" />
              <ResultRow label="必要貯留量 V" value={result.requiredStorageM3.toLocaleString()} unit="m³" />
              <ResultRow label="臨界継続時間" value={String(result.criticalDurationMin)} unit="分" />
            </div>
          ) : (
            <div className="text-sm text-gray-400 bg-gray-50 rounded p-4">
              基本条件を入力すると自動計算されます
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
