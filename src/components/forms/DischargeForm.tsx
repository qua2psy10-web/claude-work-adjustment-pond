import type { DischargeInput, DischargeType } from '../../types'
import type { DischargeCalcResult } from '../../calc/discharge'

interface Props {
  value: DischargeInput
  result: DischargeCalcResult | null
  waterDepthM: number
  allowableDischargeM3s: number
  onChange: (v: DischargeInput) => void
}

export function DischargeForm({ value, result, waterDepthM, allowableDischargeM3s, onChange }: Props) {
  const set = <K extends keyof DischargeInput>(key: K, v: DischargeInput[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-700">放流設備設計</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">設備種別</label>
            <select value={value.type} onChange={(e) => set('type', e.target.value as DischargeType)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="orifice">オリフィス</option>
              <option value="weir">越流堰</option>
              <option value="both">オリフィス + 越流堰</option>
            </select>
          </div>
          {(value.type === 'orifice' || value.type === 'both') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">孔径 (m)</label>
                <input type="number" min={0.05} step={0.01} value={value.orificeDiameterM}
                  onChange={(e) => set('orificeDiameterM', parseFloat(e.target.value) || 0.2)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">個数</label>
                <input type="number" min={1} step={1} value={value.orificeCount}
                  onChange={(e) => set('orificeCount', parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </>
          )}
          {(value.type === 'weir' || value.type === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">越流長 (m)</label>
              <input type="number" min={0.1} step={0.1} value={value.weirLengthM}
                onChange={(e) => set('weirLengthM', parseFloat(e.target.value) || 1.0)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          )}
          <div className="text-sm text-gray-500 bg-gray-50 rounded p-3 space-y-1">
            <div>設計水深: <strong>{waterDepthM} m</strong>（オリフィス水頭に使用）</div>
            <div>許容放流量: <strong>{allowableDischargeM3s} m³/s</strong></div>
            {(value.type === 'weir' || value.type === 'both') && (
              <div className="text-xs text-amber-600">※ 越流水頭 = 設計水深 × 10%（堰天端を設計水位の90%位置と仮定）</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {result && (
            <div className={`rounded p-4 ${result.isDischargeOk ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-sm font-semibold mb-3 ${result.isDischargeOk ? 'text-green-700' : 'text-red-600'}`}>
                {result.isDischargeOk ? '✓ 放流量 OK' : '✗ 放流量超過'}
              </div>
              <div className="space-y-1 text-sm">
                {(value.type === 'orifice' || value.type === 'both') && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">オリフィス放流量</span>
                    <span className="font-mono">{result.orificeDischargeM3s.toFixed(3)} m³/s</span>
                  </div>
                )}
                {(value.type === 'weir' || value.type === 'both') && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">越流堰放流量</span>
                    <span className="font-mono">{result.weirDischargeM3s.toFixed(3)} m³/s</span>
                  </div>
                )}
                <hr className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-700">合計放流量</span>
                  <span className={`font-mono ${result.isDischargeOk ? 'text-green-700' : 'text-red-600'}`}>
                    {result.totalDischargeM3s.toFixed(3)} m³/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">許容放流量</span>
                  <span className="font-mono">{allowableDischargeM3s} m³/s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
