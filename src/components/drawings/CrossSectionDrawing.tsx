import type { StructureInput } from '../../types'
import type { StructureCalcResult } from '../../calc/structure'

interface Props {
  input: StructureInput
  result: StructureCalcResult | null
}

export function CrossSectionDrawing({ input, result }: Props) {
  if (!result) return <div className="text-sm text-gray-400">構造設計を入力してください</div>

  const W = 500
  const H = 300
  const margin = 60
  const { bottomWidthM, slopeRatio, freeboardM } = input
  const { waterDepthM, topWidthM, totalDepthM } = result

  const drawWidth = W - margin * 2
  const drawHeight = H - margin * 2
  const scaleX = drawWidth / (topWidthM * 1.4)
  const scaleY = drawHeight / (totalDepthM * 1.4)

  const cx = W / 2
  const groundY = margin + drawHeight * 0.1
  const bottomY = groundY + totalDepthM * scaleY
  const waterY = groundY + freeboardM * scaleY
  const halfTopPx = (topWidthM / 2) * scaleX
  const halfBottomPx = (bottomWidthM / 2) * scaleX

  const trapezoidPoints = [
    `${cx - halfTopPx},${groundY}`,
    `${cx + halfTopPx},${groundY}`,
    `${cx + halfBottomPx},${bottomY}`,
    `${cx - halfBottomPx},${bottomY}`,
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-gray-200 rounded bg-white">
      {/* 池断面 */}
      <polygon points={trapezoidPoints} fill="#e0f2fe" stroke="#1e40af" strokeWidth="2" />
      {/* 設計水位線 */}
      <line x1={cx - halfTopPx + 5} y1={waterY} x2={cx + halfTopPx - 5} y2={waterY}
        stroke="#2563eb" strokeWidth="1.5" strokeDasharray="6,3" />
      {/* 余裕高注記 */}
      <text x={cx + halfTopPx + 5} y={(groundY + waterY) / 2}
        fontSize="10" fill="#6b7280">余裕高 {freeboardM}m</text>
      {/* 水深注記 */}
      <text x={cx + halfTopPx + 5} y={(waterY + bottomY) / 2}
        fontSize="10" fill="#1d4ed8">h={waterDepthM}m</text>
      {/* 底幅注記 */}
      <line x1={cx - halfBottomPx} y1={bottomY + 15} x2={cx + halfBottomPx} y2={bottomY + 15}
        stroke="#374151" strokeWidth="1" />
      <text x={cx} y={bottomY + 27} textAnchor="middle" fontSize="10" fill="#374151">
        {bottomWidthM}m
      </text>
      {/* 天端幅注記 */}
      <line x1={cx - halfTopPx} y1={groundY - 12} x2={cx + halfTopPx} y2={groundY - 12}
        stroke="#374151" strokeWidth="1" />
      <text x={cx} y={groundY - 16} textAnchor="middle" fontSize="10" fill="#374151">
        {topWidthM}m
      </text>
      {/* 勾配注記 */}
      {input.shape === 'trapezoidal' && (
        <text x={cx - halfTopPx + 8} y={(groundY + bottomY) / 2}
          fontSize="9" fill="#374151">1:{slopeRatio}</text>
      )}
      {/* タイトル */}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#374151">
        標準横断面図
      </text>
    </svg>
  )
}
