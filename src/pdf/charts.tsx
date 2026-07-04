import { Svg, Line, Polyline, Circle, Text as SvgText } from '@react-pdf/renderer'
import type { PoolShape } from '../types'

const FONT = 'NotoSansJP'
const AXIS_FONT = { fontFamily: FONT, fontSize: 6.5 }
const LABEL_FONT = { fontFamily: FONT, fontSize: 7 }

// データ最大値から切りのよい軸最大値と目盛間隔を求める
function niceScale(maxV: number): { max: number; step: number } {
  if (maxV <= 0) return { max: 1, step: 0.25 }
  const raw = maxV / 4
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / pow
  const stepM = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10
  const step = stepM * pow
  return { max: Math.ceil(maxV / step) * step, step }
}

export interface ChartSeries {
  label: string
  points: { x: number; y: number }[]
  dashed?: boolean
}

interface XYChartProps {
  width?: number
  height?: number
  xMax: number
  xStep: number
  xLabel: string
  yLabel: string
  yFmt?: (v: number) => string
  series: ChartSeries[]
  marker?: { x: number; y: number; label: string }
  legendPos?: 'tr' | 'tl'
}

// 汎用折れ線グラフ（モノクロ・黒罫線、FORUM8出力例の図表風）
export function XYChart({
  width = 470, height = 230, xMax, xStep, xLabel, yLabel,
  yFmt = (v) => String(v), series, marker, legendPos = 'tr',
}: XYChartProps) {
  const mL = 56, mR = 14, mT = 18, mB = 30
  const pw = width - mL - mR
  const ph = height - mT - mB
  const dataMax = Math.max(
    ...series.flatMap((s) => s.points.map((p) => p.y)),
    marker?.y ?? 0,
    1e-9,
  )
  const { max: yMax, step: yStep } = niceScale(dataMax)
  const sx = (x: number) => mL + (x / xMax) * pw
  const sy = (y: number) => mT + ph - (y / yMax) * ph

  const xTicks: number[] = []
  for (let x = 0; x <= xMax + 1e-9; x += xStep) xTicks.push(x)
  const yTicks: number[] = []
  for (let y = 0; y <= yMax + yStep * 0.01; y += yStep) yTicks.push(y)

  const legendX = legendPos === 'tr' ? mL + pw - 110 : mL + 10

  return (
    <Svg width={width} height={height}>
      {/* 横罫線（グリッド）と外枠 */}
      {yTicks.map((y) => (
        <Line
          key={`gy${y}`}
          x1={sx(0)} y1={sy(y)} x2={sx(xMax)} y2={sy(y)}
          stroke="#000" strokeWidth={y === 0 ? 0.8 : 0.3}
          strokeDasharray={y === 0 ? undefined : '1.5,2'}
        />
      ))}
      {xTicks.map((x) => (
        <Line
          key={`gx${x}`}
          x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(yMax)}
          stroke="#000" strokeWidth={x === 0 ? 0.8 : 0.3}
          strokeDasharray={x === 0 ? undefined : '1.5,2'}
        />
      ))}
      {/* 目盛ラベル */}
      {yTicks.map((y) => (
        <SvgText key={`ty${y}`} x={mL - 4} y={sy(y) + 2.4} textAnchor="end" style={AXIS_FONT}>
          {yFmt(y)}
        </SvgText>
      ))}
      {xTicks.map((x) => (
        <SvgText key={`tx${x}`} x={sx(x)} y={mT + ph + 9} textAnchor="middle" style={AXIS_FONT}>
          {String(x)}
        </SvgText>
      ))}
      {/* 軸名 */}
      <SvgText x={mL - 4} y={mT - 7} textAnchor="start" style={LABEL_FONT}>{yLabel}</SvgText>
      <SvgText x={mL + pw} y={mT + ph + 21} textAnchor="end" style={LABEL_FONT}>{xLabel}</SvgText>
      {/* 系列 */}
      {series.map((s, i) => (
        <Polyline
          key={`s${i}`}
          points={s.points.map((p) => `${sx(p.x)},${sy(Math.min(p.y, yMax))}`).join(' ')}
          fill="none" stroke="#000" strokeWidth={1}
          strokeDasharray={s.dashed ? '4,2' : undefined}
        />
      ))}
      {/* 凡例 */}
      {series.map((s, i) => (
        <Line
          key={`ll${i}`}
          x1={legendX} y1={mT + 8 + i * 10} x2={legendX + 18} y2={mT + 8 + i * 10}
          stroke="#000" strokeWidth={1}
          strokeDasharray={s.dashed ? '4,2' : undefined}
        />
      ))}
      {series.map((s, i) => (
        <SvgText key={`lt${i}`} x={legendX + 22} y={mT + 10.5 + i * 10} textAnchor="start" style={LABEL_FONT}>
          {s.label}
        </SvgText>
      ))}
      {/* 最大値マーカー */}
      {marker && (
        <>
          <Line
            x1={sx(marker.x)} y1={sy(marker.y)} x2={sx(marker.x)} y2={sy(0)}
            stroke="#000" strokeWidth={0.5} strokeDasharray="2,2"
          />
          <Circle cx={sx(marker.x)} cy={sy(marker.y)} r={2.2} fill="#000" />
          <SvgText x={sx(marker.x) + 5} y={sy(marker.y) - 5} textAnchor="start" style={LABEL_FONT}>
            {marker.label}
          </SvgText>
        </>
      )}
    </Svg>
  )
}

interface PondSectionProps {
  shape: PoolShape
  bottomWidthM: number
  slopeRatio: number
  waterDepthM: number
  freeboardM: number
  width?: number
  height?: number
}

// 貯留施設の横断面図（矩形／台形）
export function PondSection({
  shape, bottomWidthM, slopeRatio, waterDepthM, freeboardM,
  width = 440, height = 150,
}: PondSectionProps) {
  const mL = 58, mR = 58, mT = 22, mB = 26
  const pw = width - mL - mR
  const ph = height - mT - mB

  const totalDepth = waterDepthM + freeboardM
  const n = shape === 'rectangular' ? 0 : slopeRatio
  const fullTopW = bottomWidthM + 2 * n * totalDepth   // 天端（地盤面）での幅
  const waterTopW = bottomWidthM + 2 * n * waterDepthM // 設計水位での幅

  const sxw = pw / fullTopW
  const syh = ph / totalDepth

  const yTop = mT
  const yBot = mT + ph
  const yWater = mT + freeboardM * syh

  const xTL = mL
  const xTR = mL + pw
  const xBL = mL + n * totalDepth * sxw
  const xBR = xTR - n * totalDepth * sxw
  const xWL = mL + ((fullTopW - waterTopW) / 2) * sxw
  const xWR = xTR - ((fullTopW - waterTopW) / 2) * sxw

  return (
    <Svg width={width} height={height}>
      {/* 地盤面（天端から左右に延長） */}
      <Line x1={xTL - 22} y1={yTop} x2={xTL} y2={yTop} stroke="#000" strokeWidth={1} />
      <Line x1={xTR} y1={yTop} x2={xTR + 22} y2={yTop} stroke="#000" strokeWidth={1} />
      {/* 池の輪郭（左法面→底→右法面） */}
      <Polyline
        points={`${xTL},${yTop} ${xBL},${yBot} ${xBR},${yBot} ${xTR},${yTop}`}
        fill="none" stroke="#000" strokeWidth={1.2}
      />
      {/* 設計水位（破線）と記号 */}
      <Line x1={xWL} y1={yWater} x2={xWR} y2={yWater} stroke="#000" strokeWidth={0.8} strokeDasharray="5,2" />
      <SvgText x={xWR - 2} y={yWater - 4} textAnchor="end" style={LABEL_FONT}>▽ H.W.L</SvgText>
      {/* 寸法ラベル */}
      <SvgText x={(xBL + xBR) / 2} y={yBot + 11} textAnchor="middle" style={LABEL_FONT}>
        {`B = ${bottomWidthM.toFixed(2)} m`}
      </SvgText>
      <SvgText x={(xTL + xTR) / 2} y={yTop - 6} textAnchor="middle" style={LABEL_FONT}>
        {shape === 'rectangular' ? `B = ${bottomWidthM.toFixed(2)} m` : `T' = ${fullTopW.toFixed(2)} m`}
      </SvgText>
      {/* 右側: 水深・余裕高 */}
      <Line x1={xTR + 12} y1={yTop} x2={xTR + 12} y2={yWater} stroke="#000" strokeWidth={0.5} />
      <Line x1={xTR + 12} y1={yWater} x2={xTR + 12} y2={yBot} stroke="#000" strokeWidth={0.5} />
      <Line x1={xTR + 9} y1={yTop} x2={xTR + 15} y2={yTop} stroke="#000" strokeWidth={0.5} />
      <Line x1={xTR + 9} y1={yWater} x2={xTR + 15} y2={yWater} stroke="#000" strokeWidth={0.5} />
      <Line x1={xTR + 9} y1={yBot} x2={xTR + 15} y2={yBot} stroke="#000" strokeWidth={0.5} />
      <SvgText x={xTR + 18} y={(yTop + yWater) / 2 + 2.5} textAnchor="start" style={LABEL_FONT}>
        {`Hf = ${freeboardM.toFixed(2)}`}
      </SvgText>
      <SvgText x={xTR + 18} y={(yWater + yBot) / 2 + 2.5} textAnchor="start" style={LABEL_FONT}>
        {`h = ${waterDepthM.toFixed(2)}`}
      </SvgText>
      {/* 法面勾配 */}
      {shape !== 'rectangular' && (
        <SvgText x={(xTL + xBL) / 2 - 8} y={(yTop + yBot) / 2} textAnchor="end" style={LABEL_FONT}>
          {`1:${slopeRatio}`}
        </SvgText>
      )}
    </Svg>
  )
}
