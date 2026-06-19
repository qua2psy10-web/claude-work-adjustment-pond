import type { BasicConditions, LandUseType } from '../../types'
import type { PrefectureStandard } from '../../standards/index'

const LAND_USE_LABELS: Record<LandUseType, string> = {
  residential_high: '住宅地（高密度）',
  residential_low:  '住宅地（低密度）',
  commercial:       '商業・業務地',
  industrial:       '工業地',
  paddy:            '水田',
  upland:           '畑地',
  forest:           '山地・森林',
  road:             '道路',
}

interface Props {
  value: BasicConditions
  standard: PrefectureStandard
  onChange: (v: BasicConditions) => void
}

export function BasicConditionsForm({ value, standard, onChange }: Props) {
  const set = <K extends keyof BasicConditions>(key: K, v: BasicConditions[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-700">基本条件</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">案件名</label>
          <input
            type="text"
            value={value.projectName}
            onChange={(e) => set('projectName', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="例: ○○団地調整池設計"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
          <select
            value={value.prefecture}
            onChange={(e) => set('prefecture', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="ibaraki">茨城県</option>
            <option value="chiba">千葉県</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">計画確率年 (年)</label>
          <select
            value={value.returnPeriodYears}
            onChange={(e) => set('returnPeriodYears', Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {standard.availableReturnPeriods.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">流域面積 (ha)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={value.basinAreaHa || ''}
            onChange={(e) => set('basinAreaHa', parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">土地利用区分</label>
          <select
            value={value.landUse}
            onChange={(e) => set('landUse', e.target.value as LandUseType)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {Object.entries(LAND_USE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">許容放流量 (m³/s)</label>
          <input
            type="number"
            min={0}
            step={0.001}
            value={value.allowableDischargeM3s || ''}
            onChange={(e) => set('allowableDischargeM3s', parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">流出係数 C</label>
          <input
            type="text"
            readOnly
            value={standard.runoffCoefficients[value.landUse]}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">土地利用区分から自動設定</p>
        </div>
      </div>
    </div>
  )
}
