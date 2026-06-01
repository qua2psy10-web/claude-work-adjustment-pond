import type { StructureInput, PoolShape, SlopeLiningType } from '../../types'
import type { StructureCalcResult } from '../../calc/structure'
import { CrossSectionDrawing } from '../drawings/CrossSectionDrawing'

interface Props {
  value: StructureInput
  result: StructureCalcResult | null
  requiredStorageM3: number
  onChange: (v: StructureInput) => void
}

export function StructureForm({ value, result, requiredStorageM3, onChange }: Props) {
  const set = <K extends keyof StructureInput>(key: K, v: StructureInput[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-700">構造設計</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">断面形状</label>
            <select value={value.shape} onChange={(e) => set('shape', e.target.value as PoolShape)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="rectangular">矩形</option>
              <option value="trapezoidal">台形</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">池底幅 (m)</label>
            <input type="number" min={0.5} step={0.1} value={value.bottomWidthM}
              onChange={(e) => set('bottomWidthM', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">池長 (m)</label>
            <input type="number" min={1} step={0.5} value={value.poolLengthM}
              onChange={(e) => set('poolLengthM', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">設計水深 (m)</label>
            <input type="number" min={0.1} step={0.1} value={value.waterDepthM}
              onChange={(e) => set('waterDepthM', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          {value.shape === 'trapezoidal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">法面勾配 (1:n)</label>
              <input type="number" min={0.5} step={0.1} value={value.slopeRatio}
                onChange={(e) => set('slopeRatio', parseFloat(e.target.value) || 1.5)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">護岸種別</label>
            <select value={value.lining} onChange={(e) => set('lining', e.target.value as SlopeLiningType)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="concrete">コンクリート張り</option>
              <option value="stone">石張り</option>
              <option value="block">コンクリートブロック</option>
              <option value="grass">芝張り</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">余裕高 (m)</label>
            <input type="number" min={0.1} step={0.05} value={value.freeboardM}
              onChange={(e) => set('freeboardM', parseFloat(e.target.value) || 0.3)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-4">
          {result && (
            <div className={`rounded p-4 ${result.isCapacityOk ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-sm font-semibold mb-3 ${result.isCapacityOk ? 'text-green-700' : 'text-red-600'}`}>
                {result.isCapacityOk ? '✓ 容量 OK' : '✗ 容量不足'}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">必要貯留量</span>
                  <span className="font-mono">{requiredStorageM3.toLocaleString()} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">実容量</span>
                  <span className={`font-mono ${result.isCapacityOk ? 'text-green-700' : 'text-red-600'}`}>
                    {result.actualVolumeM3.toLocaleString()} m³
                  </span>
                </div>
                <hr className="my-1" />
                <div className="flex justify-between">
                  <span className="text-gray-600">設計水深</span>
                  <span className="font-mono">{result.waterDepthM} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">全深（余裕高含む）</span>
                  <span className="font-mono">{result.totalDepthM} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">天端幅</span>
                  <span className="font-mono">{result.topWidthM} m</span>
                </div>
              </div>
            </div>
          )}
          <CrossSectionDrawing input={value} result={result} />
        </div>
      </div>
    </div>
  )
}
