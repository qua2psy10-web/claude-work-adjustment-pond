import type { StructureInput, DischargeInput } from '../../types'
import type { StructureCalcResult } from '../../calc/structure'

interface Props {
  structureInput: StructureInput
  dischargeInput: DischargeInput
  structureResult: StructureCalcResult | null
}

export function PlanDrawing({ structureInput, dischargeInput, structureResult }: Props) {
  if (!structureResult) return <div className="text-sm text-gray-400">構造設計を入力してください</div>

  const W = 500
  const H = 300
  const margin = 50
  const { bottomWidthM, poolLengthM } = structureInput
  const { topWidthM } = structureResult

  const drawW = W - margin * 2
  const drawH = H - margin * 2
  const scaleX = drawW / (topWidthM * 1.3)
  const scaleY = drawH / (poolLengthM * 1.3)

  const cx = W / 2
  const cy = H / 2
  const halfTopPx = (topWidthM / 2) * scaleX
  const halfBottomPx = (bottomWidthM / 2) * scaleX
  const halfLengthTopPx = (poolLengthM / 2) * scaleY + halfTopPx * 0.3
  const halfLengthBottomPx = (poolLengthM / 2) * scaleY

  const outerPoints = [
    `${cx - halfTopPx},${cy - halfLengthTopPx}`,
    `${cx + halfTopPx},${cy - halfLengthTopPx}`,
    `${cx + halfTopPx},${cy + halfLengthTopPx}`,
    `${cx - halfTopPx},${cy + halfLengthTopPx}`,
  ].join(' ')

  const innerPoints = [
    `${cx - halfBottomPx},${cy - halfLengthBottomPx}`,
    `${cx + halfBottomPx},${cy - halfLengthBottomPx}`,
    `${cx + halfBottomPx},${cy + halfLengthBottomPx}`,
    `${cx - halfBottomPx},${cy + halfLengthBottomPx}`,
  ].join(' ')

  const dischargeX = cx
  const dischargeY = cy + halfLengthBottomPx - 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-gray-200 rounded bg-white">
      {/* 外形（法肩） */}
      <polygon points={outerPoints} fill="none" stroke="#1e40af" strokeWidth="2" />
      {/* 池底 */}
      <polygon points={innerPoints} fill="#e0f2fe" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
      {/* 放流設備 */}
      <circle cx={dischargeX} cy={dischargeY} r={8} fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" />
      <text x={dischargeX + 12} y={dischargeY + 4} fontSize="9" fill="#92400e">
        {dischargeInput.type === 'orifice' ? 'オリフィス' : '越流堰'}
      </text>
      {/* 寸法注記 */}
      <text x={cx} y={margin - 8} textAnchor="middle" fontSize="10" fill="#374151">
        {topWidthM}m（天端幅）
      </text>
      <text x={margin - 8} y={cy} textAnchor="middle" fontSize="10" fill="#374151"
        transform={`rotate(-90, ${margin - 8}, ${cy})`}>
        {poolLengthM}m
      </text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#374151">
        平面図
      </text>
    </svg>
  )
}
