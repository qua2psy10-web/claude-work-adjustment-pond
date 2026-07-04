import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { AppState, HydrologyResult } from '../types'
import type { StructureCalcResult } from '../calc/structure'
import type { DischargeCalcResult } from '../calc/discharge'
import { prefectureStandards } from '../standards/ibaraki'
import { calcRainfallIntensity, calcPeakFlow } from '../calc/hydrology'
import { XYChart, PondSection } from './charts'

// Noto Sans JP（publicディレクトリにバンドル）で日本語フォントを登録
const base = import.meta.env.BASE_URL.replace(/\/$/, '')
Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: `${base}/fonts/NotoSansJP-Regular.ttf`, fontWeight: 'normal' },
    { src: `${base}/fonts/NotoSansJP-Bold.ttf`, fontWeight: 'bold' },
  ],
})

// FORUM8「調整池・調節池の計算」出力例に準拠したスタイル
const styles = StyleSheet.create({
  // 表紙（枠なし・中央寄せ）
  coverPage: { padding: 60, fontSize: 11, fontFamily: 'NotoSansJP', color: '#000' },
  coverTitle: { fontSize: 20, textAlign: 'center', marginTop: 150, lineHeight: 1.8 },
  coverMid: { fontSize: 14, textAlign: 'center', marginTop: 90 },
  coverSub: { fontSize: 13, textAlign: 'center', marginTop: 100, lineHeight: 1.9 },
  coverDate: { fontSize: 11, textAlign: 'center', marginTop: 60 },

  // 本文ページ（全面枠＋右上ページ番号）
  page: {
    paddingTop: 46, paddingBottom: 44, paddingHorizontal: 52,
    fontSize: 9, fontFamily: 'NotoSansJP', color: '#000', lineHeight: 1.5,
  },
  frame: {
    position: 'absolute', top: 30, bottom: 30, left: 36, right: 36,
    borderWidth: 1, borderColor: '#000',
  },
  pageNo: { position: 'absolute', top: 16, right: 44, fontSize: 9 },

  chapterTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  sectionTitle: { fontSize: 10.5, fontWeight: 'bold', marginTop: 10, marginBottom: 6 },
  clause: { fontSize: 9, marginTop: 10, marginBottom: 4 },

  // 罫線表（黒罫・FORUM8風）
  table: { borderWidth: 1, borderColor: '#000', marginBottom: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#000' },
  rowLast: { flexDirection: 'row' },
  // 名称／値 2列表
  kvLabel: { width: 130, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderRightColor: '#000' },
  kvValue: { flex: 1, paddingVertical: 3, paddingHorizontal: 5 },
  // 項目・単位・数値・備考 4列表
  hCell: { paddingVertical: 3, paddingHorizontal: 4, textAlign: 'center', fontWeight: 'bold' },
  cItem: { flex: 2.4, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderRightColor: '#000' },
  cUnit: { flex: 0.8, paddingVertical: 3, paddingHorizontal: 4, textAlign: 'center', borderRightWidth: 0.5, borderRightColor: '#000' },
  cValue: { flex: 1.3, paddingVertical: 3, paddingHorizontal: 5, textAlign: 'right', borderRightWidth: 0.5, borderRightColor: '#000' },
  cNote: { flex: 2.4, paddingVertical: 3, paddingHorizontal: 5 },
  // 数値表（等幅列）
  nCell: { flex: 1, paddingVertical: 2, paddingHorizontal: 4, textAlign: 'right', borderRightWidth: 0.5, borderRightColor: '#000' },
  nCellLast: { flex: 1, paddingVertical: 2, paddingHorizontal: 4, textAlign: 'right' },
  nHead: { flex: 1, paddingVertical: 3, paddingHorizontal: 2, textAlign: 'center', borderRightWidth: 0.5, borderRightColor: '#000' },
  nHeadLast: { flex: 1, paddingVertical: 3, paddingHorizontal: 2, textAlign: 'center' },

  // 計算過程（逐次表示）
  calcBlock: { marginTop: 4, marginBottom: 6, marginLeft: 14, lineHeight: 1.7 },
  calcLine: { marginBottom: 1 },
  calcIndent: { marginLeft: 40, marginBottom: 1 },

  // 目次
  tocTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  tocRow: { flexDirection: 'row', marginBottom: 3 },
  tocChapter: { flex: 1 },
  tocSection: { flex: 1, marginLeft: 14 },
  tocPage: { width: 40, textAlign: 'right' },
})

interface Props {
  state: AppState
  hydrologyResult: HydrologyResult | null
  structureResult: StructureCalcResult | null
  dischargeResult: DischargeCalcResult | null
}

const LAND_USE_LABELS: Record<string, string> = {
  residential_high: '住宅地（高密度）',
  residential_low:  '住宅地（低密度）',
  commercial:       '商業・業務地',
  industrial:       '工業地',
  paddy:            '水田',
  upland:           '畑地',
  forest:           '山地・森林',
  road:             '道路',
}

// 本文ページ共通の枠・ページ番号
function PageChrome({ pageNo }: { pageNo: number }) {
  return (
    <>
      <Text style={styles.pageNo} fixed>- {pageNo} -</Text>
      <View style={styles.frame} fixed />
    </>
  )
}

function KVRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.rowLast : styles.row}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  )
}

function ItemRow({ item, unit, value, note, last }: {
  item: string; unit: string; value: string; note?: string; last?: boolean
}) {
  return (
    <View style={last ? styles.rowLast : styles.row}>
      <Text style={styles.cItem}>{item}</Text>
      <Text style={styles.cUnit}>{unit}</Text>
      <Text style={styles.cValue}>{value}</Text>
      <Text style={styles.cNote}>{note ?? ''}</Text>
    </View>
  )
}

function ItemHeader() {
  return (
    <View style={styles.row}>
      <Text style={[styles.cItem, styles.hCell]}>項目</Text>
      <Text style={[styles.cUnit, styles.hCell]}>単位</Text>
      <Text style={[styles.cValue, styles.hCell]}>数値</Text>
      <Text style={[styles.cNote, styles.hCell]}>備考</Text>
    </View>
  )
}

const f1 = (n: number) => n.toFixed(1)
const f2 = (n: number) => n.toFixed(2)
const f3 = (n: number) => n.toFixed(3)
const fi = (n: number) => Math.round(n).toLocaleString()

export function PondReportPDF({ state, hydrologyResult, structureResult, dischargeResult }: Props) {
  const { basic, hydrologyInput, structureInput, dischargeInput } = state
  const standard = prefectureStandards[basic.prefecture]
  const prefectureName = standard?.name ?? basic.prefecture
  const coeff = standard?.rainfallCoefficients[basic.returnPeriodYears]
  const runoffC = standard?.runoffCoefficients[basic.landUse] ?? 0

  // 必要調節容量の計算過程表（20分刻み）
  const storageRows = coeff
    ? Array.from({ length: 18 }, (_, i) => (i + 1) * 20).map((t) => {
        const r = calcRainfallIntensity(t, basic.returnPeriodYears, standard)
        const q = calcPeakFlow(runoffC, r, basic.basinAreaHa)
        const v = Math.max(0, (q - basic.allowableDischargeM3s) * t * 60)
        return { t, r, q, v }
      })
    : []

  // グラフ描画用の細かい刻み（10分刻み）の曲線データ
  const curveRows = coeff
    ? Array.from({ length: 36 }, (_, i) => (i + 1) * 10).map((t) => {
        const r = calcRainfallIntensity(t, basic.returnPeriodYears, standard)
        const q = calcPeakFlow(runoffC, r, basic.basinAreaHa)
        const v = Math.max(0, (q - basic.allowableDischargeM3s) * t * 60)
        return { t, q, v }
      })
    : []

  const shapeLabel = structureInput.shape === 'rectangular' ? '矩形' : '台形'
  const dischargeTypeLabel =
    dischargeInput.type === 'orifice' ? 'オリフィス'
    : dischargeInput.type === 'weir' ? '越流堰'
    : 'オリフィス＋越流堰'
  const hasOrifice = dischargeInput.type === 'orifice' || dischargeInput.type === 'both'
  const hasWeir = dischargeInput.type === 'weir' || dischargeInput.type === 'both'
  const orificeArea = Math.PI * Math.pow(dischargeInput.orificeDiameterM / 2, 2)
  const weirHead = structureInput.waterDepthM * 0.1

  return (
    <Document>
      {/* ============ 表紙 ============ */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>調整池・調節池の計算{'\n'}設計計算書</Text>
        <Text style={styles.coverMid}>{basic.projectName || '（案件名未入力）'}</Text>
        <Text style={styles.coverSub}>
          防災調整池（恒久施設）準拠{'\n'}{prefectureName}基準　確率年 1/{basic.returnPeriodYears}年
        </Text>
        <Text style={styles.coverDate}>作成日: {new Date().toLocaleDateString('ja-JP')}</Text>
      </Page>

      {/* ============ 目次 ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.frame} fixed />
        <Text style={styles.tocTitle}>目次</Text>
        <View style={styles.tocRow}><Text style={styles.tocChapter}>1章 設計条件</Text><Text style={styles.tocPage}>1</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocSection}>1.1 名称及び年確率</Text><Text style={styles.tocPage}>1</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocSection}>1.2 基本条件</Text><Text style={styles.tocPage}>1</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocChapter}>2章 流域</Text><Text style={styles.tocPage}>2</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocSection}>2.1 流域条件及び必要調節容量</Text><Text style={styles.tocPage}>2</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocSection}>2.2 ハイドログラフ及び貯留量曲線</Text><Text style={styles.tocPage}>3</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocChapter}>3章 貯留施設</Text><Text style={styles.tocPage}>4</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocSection}>3.1 貯留施設の容量</Text><Text style={styles.tocPage}>4</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocChapter}>4章 放流施設</Text><Text style={styles.tocPage}>5</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocSection}>4.1 放流量計算</Text><Text style={styles.tocPage}>5</Text></View>
        <View style={styles.tocRow}><Text style={styles.tocChapter}>5章 総括表</Text><Text style={styles.tocPage}>6</Text></View>
      </Page>

      {/* ============ 1章 設計条件 ============ */}
      <Page size="A4" style={styles.page}>
        <PageChrome pageNo={1} />
        <Text style={styles.chapterTitle}>1章 設計条件</Text>

        <Text style={styles.sectionTitle}>1.1 名称及び年確率</Text>
        <View style={styles.table}>
          <KVRow label="適用基準" value={`防災調整池（恒久施設）　${prefectureName}基準`} />
          <KVRow label="年確率" value={`1/${basic.returnPeriodYears}年`} last />
        </View>

        <Text style={styles.sectionTitle}>1.2 基本条件</Text>
        <View style={styles.table}>
          <KVRow label="案件名" value={basic.projectName || '未入力'} />
          <KVRow label="都道府県" value={prefectureName} />
          <KVRow label="流域面積 A (ha)" value={f3(basic.basinAreaHa)} />
          <KVRow label="土地利用区分" value={LAND_USE_LABELS[basic.landUse] ?? basic.landUse} />
          <KVRow label="流出係数 f" value={f3(runoffC)} />
          <KVRow label="許容放流量 Qa (m³/s)" value={f3(basic.allowableDischargeM3s)} />
          <KVRow label="洪水到達時間 tc (min)" value={f1(hydrologyInput.concentrationTimeMin)} last />
        </View>
      </Page>

      {/* ============ 2章 流域 ============ */}
      <Page size="A4" style={styles.page}>
        <PageChrome pageNo={2} />
        <Text style={styles.chapterTitle}>2章 流域</Text>
        <Text style={styles.sectionTitle}>2.1 流域条件及び必要調節容量</Text>

        <View style={styles.table}>
          <KVRow label="降雨強度式名称" value="タルボット型" />
          <KVRow label="確率年（年）" value={String(basic.returnPeriodYears)} />
          <KVRow
            label="計算時使用降雨強度式"
            value={coeff ? `r = a / (t + b)^n [ a=${coeff.a.toFixed(3)} b=${coeff.b.toFixed(4)} n=${coeff.n.toFixed(4)} ]` : '－'}
          />
          <KVRow label="流出係数 f" value={f3(runoffC)} />
          <KVRow label="流域面積 A (ha)" value={f3(basic.basinAreaHa)} last />
        </View>

        <Text style={styles.clause}>1) 降雨強度式</Text>
        <View style={styles.calcBlock}>
          <Text style={styles.calcLine}>
            r = a / (t + b)^n{coeff ? ` [ a=${coeff.a.toFixed(3)} b=${coeff.b.toFixed(4)} n=${coeff.n.toFixed(4)} ]` : ''}
          </Text>
        </View>

        <Text style={styles.clause}>2) 計画流出量（合理式）</Text>
        <View style={styles.calcBlock}>
          <Text style={styles.calcLine}>Q = 1/360 ・ f ・ r ・ A</Text>
          {hydrologyResult && coeff && (
            <>
              <Text style={styles.calcLine}>
                r(tc) = {coeff.a.toFixed(3)} / ({f1(hydrologyInput.concentrationTimeMin)} + {coeff.b.toFixed(4)})^{coeff.n.toFixed(4)}
                {' '}= {f3(calcRainfallIntensity(hydrologyInput.concentrationTimeMin, basic.returnPeriodYears, standard))} (mm/hr)
              </Text>
              <Text style={styles.calcLine}>
                Q = 1/360 × {f3(runoffC)} × {f3(calcRainfallIntensity(hydrologyInput.concentrationTimeMin, basic.returnPeriodYears, standard))} × {f3(basic.basinAreaHa)}
              </Text>
              <Text style={styles.calcIndent}>= {f3(hydrologyResult.peakFlowM3s)} (m³/s)</Text>
            </>
          )}
        </View>

        <Text style={styles.clause}>3) 必要調節容量</Text>
        <View style={styles.calcBlock}>
          <Text style={styles.calcLine}>V(t) = ( Q(t) - Qa ) × t × 60</Text>
          <Text style={styles.calcLine}>Qa = {f3(basic.allowableDischargeM3s)} (m³/s)</Text>
        </View>
        {storageRows.length > 0 && (
          <View style={[styles.table, { width: 360 }]}>
            <View style={styles.row}>
              <Text style={[styles.nHead, styles.hCell]}>継続時間 t{'\n'}(min)</Text>
              <Text style={[styles.nHead, styles.hCell]}>降雨強度 r{'\n'}(mm/hr)</Text>
              <Text style={[styles.nHead, styles.hCell]}>流出量 Q{'\n'}(m³/s)</Text>
              <Text style={[styles.nHeadLast, styles.hCell]}>貯留量 V{'\n'}(m³)</Text>
            </View>
            {storageRows.map(({ t, r, q, v }, i) => (
              <View key={t} style={i === storageRows.length - 1 ? styles.rowLast : styles.row}>
                <Text style={styles.nCell}>{t}</Text>
                <Text style={styles.nCell}>{f2(r)}</Text>
                <Text style={styles.nCell}>{f3(q)}</Text>
                <Text style={styles.nCellLast}>{fi(v)}</Text>
              </View>
            ))}
          </View>
        )}
        {hydrologyResult && (
          <View style={styles.calcBlock}>
            <Text style={styles.calcLine}>
              最大貯留量となる継続時間 t = {hydrologyResult.criticalDurationMin} (min)
            </Text>
            <Text style={styles.calcLine}>
              ∴ 必要調節容量 V = {fi(hydrologyResult.requiredStorageM3)} (m³)
            </Text>
          </View>
        )}
      </Page>

      {/* ============ 2.2 ハイドログラフ・貯留量曲線 ============ */}
      <Page size="A4" style={styles.page}>
        <PageChrome pageNo={3} />
        <Text style={styles.sectionTitle}>2.2 ハイドログラフ及び貯留量曲線</Text>

        <Text style={styles.clause}>1) 流入量曲線（ハイドログラフ）</Text>
        {curveRows.length > 0 ? (
          <>
            <XYChart
              xMax={360}
              xStep={60}
              xLabel="継続時間 t (min)"
              yLabel="流量 (m³/s)"
              yFmt={(v) => v.toFixed(2)}
              series={[
                { label: '流入量 Q(t)', points: curveRows.map(({ t, q }) => ({ x: t, y: q })) },
                {
                  label: '許容放流量 Qa',
                  points: [{ x: 0, y: basic.allowableDischargeM3s }, { x: 360, y: basic.allowableDischargeM3s }],
                  dashed: true,
                },
              ]}
              legendPos="tr"
            />
            <Text style={[styles.calcLine, { marginLeft: 14, marginBottom: 8 }]}>
              流入量 Q(t) と許容放流量 Qa の差が調節池による調節量となる。
            </Text>

            <Text style={styles.clause}>2) 必要調節容量曲線</Text>
            <XYChart
              xMax={360}
              xStep={60}
              xLabel="継続時間 t (min)"
              yLabel="貯留量 (m³)"
              yFmt={(v) => Math.round(v).toLocaleString()}
              series={[
                { label: '貯留量 V(t)', points: curveRows.map(({ t, v }) => ({ x: t, y: v })) },
              ]}
              marker={hydrologyResult ? {
                x: hydrologyResult.criticalDurationMin,
                y: hydrologyResult.requiredStorageM3,
                label: `Vmax = ${fi(hydrologyResult.requiredStorageM3)} m³ (t = ${hydrologyResult.criticalDurationMin} min)`,
              } : undefined}
              legendPos="tl"
            />
            {hydrologyResult && (
              <Text style={[styles.calcLine, { marginLeft: 14 }]}>
                貯留量 V(t) は継続時間 t = {hydrologyResult.criticalDurationMin} (min) で最大となり、
                必要調節容量 V = {fi(hydrologyResult.requiredStorageM3)} (m³) を得る。
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.clause}>※ 降雨強度式が未設定のためグラフを描画できません。</Text>
        )}
      </Page>

      {/* ============ 3章 貯留施設 ============ */}
      <Page size="A4" style={styles.page}>
        <PageChrome pageNo={4} />
        <Text style={styles.chapterTitle}>3章 貯留施設</Text>
        <Text style={styles.sectionTitle}>3.1 貯留施設の容量</Text>

        <Text style={styles.clause}>1) 貯留施設情報</Text>
        <View style={styles.table}>
          <KVRow label="断面形状" value={shapeLabel} />
          <KVRow label="池底幅 B (m)" value={f2(structureInput.bottomWidthM)} />
          <KVRow label="池長 L (m)" value={f2(structureInput.poolLengthM)} />
          <KVRow label="設計水深 h (m)" value={f2(structureInput.waterDepthM)} />
          <KVRow label="法面勾配" value={structureInput.shape === 'rectangular' ? '－' : `1 : ${structureInput.slopeRatio}`} />
          <KVRow label="余裕高 (m)" value={f2(structureInput.freeboardM)} last />
        </View>

        <Text style={styles.clause}>2) 断面図</Text>
        <PondSection
          shape={structureInput.shape}
          bottomWidthM={structureInput.bottomWidthM}
          slopeRatio={structureInput.slopeRatio}
          waterDepthM={structureInput.waterDepthM}
          freeboardM={structureInput.freeboardM}
        />

        {structureResult ? (
          <>
            <Text style={styles.clause}>3) 容量計算</Text>
            <View style={styles.calcBlock}>
              {structureInput.shape === 'rectangular' ? (
                <>
                  <Text style={styles.calcLine}>V' = B × h × L</Text>
                  <Text style={styles.calcLine}>
                    = {f2(structureInput.bottomWidthM)} × {f2(structureInput.waterDepthM)} × {f2(structureInput.poolLengthM)}
                  </Text>
                  <Text style={styles.calcLine}>= {fi(structureResult.actualVolumeM3)} (m³)</Text>
                </>
              ) : (
                <>
                  <Text style={styles.calcLine}>
                    天端幅 T = B + 2 × n × h = {f2(structureInput.bottomWidthM)} + 2 × {structureInput.slopeRatio} × {f2(structureInput.waterDepthM)} = {f2(structureResult.topWidthM)} (m)
                  </Text>
                  <Text style={styles.calcLine}>
                    断面積 A = ( B + T ) / 2 × h = ( {f2(structureInput.bottomWidthM)} + {f2(structureResult.topWidthM)} ) / 2 × {f2(structureInput.waterDepthM)} = {f2(((structureInput.bottomWidthM + structureResult.topWidthM) / 2) * structureInput.waterDepthM)} (m²)
                  </Text>
                  <Text style={styles.calcLine}>
                    V' = A × L = {f2(((structureInput.bottomWidthM + structureResult.topWidthM) / 2) * structureInput.waterDepthM)} × {f2(structureInput.poolLengthM)} = {fi(structureResult.actualVolumeM3)} (m³)
                  </Text>
                </>
              )}
              <Text style={styles.calcLine}>
                全深 = h + 余裕高 = {f2(structureInput.waterDepthM)} + {f2(structureInput.freeboardM)} = {f2(structureResult.totalDepthM)} (m)
              </Text>
            </View>

            <Text style={styles.clause}>4) 容量の判定</Text>
            <View style={styles.table}>
              <ItemHeader />
              <ItemRow item="必要調節容量 V" unit="m³" value={hydrologyResult ? fi(hydrologyResult.requiredStorageM3) : '－'} />
              <ItemRow item="貯留容量 V'" unit="m³" value={fi(structureResult.actualVolumeM3)} />
              <ItemRow
                item="容量の判定"
                unit="－"
                value={structureResult.isCapacityOk ? 'OK' : 'NG'}
                note={hydrologyResult
                  ? `V' = ${fi(structureResult.actualVolumeM3)} ${structureResult.isCapacityOk ? '≥' : '<'} V = ${fi(hydrologyResult.requiredStorageM3)}`
                  : ''}
                last
              />
            </View>
            <View style={styles.calcBlock}>
              <Text style={styles.calcLine}>
                {structureResult.isCapacityOk
                  ? '∴ 貯留容量は必要調節容量を満足する。'
                  : '∴ 貯留容量が不足している。池形状の見直しが必要である。'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.clause}>※ 構造設計未完了</Text>
        )}
      </Page>

      {/* ============ 4章 放流施設 ============ */}
      <Page size="A4" style={styles.page}>
        <PageChrome pageNo={5} />
        <Text style={styles.chapterTitle}>4章 放流施設</Text>
        <Text style={styles.sectionTitle}>4.1 放流量計算</Text>

        <View style={styles.table}>
          <KVRow label="放流施設形式" value={dischargeTypeLabel} />
          {hasOrifice && <KVRow label="オリフィス孔径 D (m)" value={f3(dischargeInput.orificeDiameterM)} />}
          {hasOrifice && <KVRow label="オリフィス個数" value={`${dischargeInput.orificeCount} 個`} />}
          {hasWeir && <KVRow label="越流長 Lw (m)" value={f2(dischargeInput.weirLengthM)} />}
          <KVRow label="設計水深 h (m)" value={f2(structureInput.waterDepthM)} last />
        </View>

        {dischargeResult ? (
          <>
            {hasOrifice && (
              <>
                <Text style={styles.clause}>1) オリフィス放流量</Text>
                <View style={styles.calcBlock}>
                  <Text style={styles.calcLine}>Q1 = C ・ A ・ √(2gH) × 個数　（C = 0.6）</Text>
                  <Text style={styles.calcLine}>
                    A = π/4 × D² = π/4 × {f3(dischargeInput.orificeDiameterM)}² = {orificeArea.toFixed(4)} (m²)
                  </Text>
                  <Text style={styles.calcLine}>H = {f2(structureInput.waterDepthM)} (m)</Text>
                  <Text style={styles.calcLine}>
                    Q1 = 0.6 × {orificeArea.toFixed(4)} × √(2 × 9.81 × {f2(structureInput.waterDepthM)}) × {dischargeInput.orificeCount}
                  </Text>
                  <Text style={styles.calcIndent}>= {f3(dischargeResult.orificeDischargeM3s)} (m³/s)</Text>
                </View>
              </>
            )}
            {hasWeir && (
              <>
                <Text style={styles.clause}>{hasOrifice ? '2)' : '1)'} 越流堰放流量</Text>
                <View style={styles.calcBlock}>
                  <Text style={styles.calcLine}>Q2 = C ・ Lw ・ H^(3/2)　（C = 1.6）</Text>
                  <Text style={styles.calcLine}>H = 0.1 × h = {f3(weirHead)} (m)</Text>
                  <Text style={styles.calcLine}>
                    Q2 = 1.6 × {f2(dischargeInput.weirLengthM)} × {f3(weirHead)}^(3/2)
                  </Text>
                  <Text style={styles.calcIndent}>= {f3(dischargeResult.weirDischargeM3s)} (m³/s)</Text>
                </View>
              </>
            )}

            <Text style={styles.clause}>{hasOrifice && hasWeir ? '3)' : '2)'} 放流量の判定</Text>
            <View style={styles.table}>
              <ItemHeader />
              {hasOrifice && <ItemRow item="オリフィス放流量 Q1" unit="m³/s" value={f3(dischargeResult.orificeDischargeM3s)} />}
              {hasWeir && <ItemRow item="越流堰放流量 Q2" unit="m³/s" value={f3(dischargeResult.weirDischargeM3s)} />}
              <ItemRow item="合計放流量 Q" unit="m³/s" value={f3(dischargeResult.totalDischargeM3s)} />
              <ItemRow item="許容放流量 Qa" unit="m³/s" value={f3(basic.allowableDischargeM3s)} />
              <ItemRow
                item="放流量の判定"
                unit="－"
                value={dischargeResult.isDischargeOk ? 'OK' : 'NG'}
                note={`Q = ${f3(dischargeResult.totalDischargeM3s)} ${dischargeResult.isDischargeOk ? '≤' : '>'} Qa = ${f3(basic.allowableDischargeM3s)}`}
                last
              />
            </View>
            <View style={styles.calcBlock}>
              <Text style={styles.calcLine}>
                {dischargeResult.isDischargeOk
                  ? '∴ 放流量は許容放流量以下である。'
                  : '∴ 放流量が許容放流量を超過している。放流施設の見直しが必要である。'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.clause}>※ 放流設備設計未完了</Text>
        )}
      </Page>

      {/* ============ 5章 総括表 ============ */}
      <Page size="A4" style={styles.page}>
        <PageChrome pageNo={6} />
        <Text style={styles.chapterTitle}>5章 総括表</Text>
        <Text style={styles.sectionTitle}>5.1 {basic.projectName || '（案件名未入力）'}</Text>

        <View style={styles.table}>
          <ItemHeader />
          <ItemRow item="流出域面積 A" unit="ha" value={f3(basic.basinAreaHa)} />
          <ItemRow item="降雨強度式" unit="－" value="r=a/(t+b)^n" note={coeff ? `a=${coeff.a.toFixed(1)} b=${coeff.b.toFixed(1)} n=${coeff.n.toFixed(4)}` : ''} />
          <ItemRow item="計画降雨超過確率" unit="年" value={String(basic.returnPeriodYears)} />
          <ItemRow item="流出率 f" unit="－" value={f3(runoffC)} note={LAND_USE_LABELS[basic.landUse] ?? ''} />
          <ItemRow item="洪水到達時間" unit="min" value={f1(hydrologyInput.concentrationTimeMin)} />
          <ItemRow item="許容放流量 Qa" unit="m³/s" value={f3(basic.allowableDischargeM3s)} />
          <ItemRow item="計画流出量 Q" unit="m³/s" value={hydrologyResult ? f3(hydrologyResult.peakFlowM3s) : '－'} />
          <ItemRow item="臨界継続時間" unit="min" value={hydrologyResult ? String(hydrologyResult.criticalDurationMin) : '－'} />
          <ItemRow item="必要調節容量 V" unit="m³" value={hydrologyResult ? fi(hydrologyResult.requiredStorageM3) : '－'} />
          <ItemRow item="断面形状" unit="－" value={shapeLabel} />
          <ItemRow item="池底幅 B" unit="m" value={f2(structureInput.bottomWidthM)} />
          <ItemRow item="池長 L" unit="m" value={f2(structureInput.poolLengthM)} />
          <ItemRow item="法面勾配" unit="－" value={structureInput.shape === 'rectangular' ? '－' : `1:${structureInput.slopeRatio}`} />
          <ItemRow item="設計水深 h" unit="m" value={f2(structureInput.waterDepthM)} />
          <ItemRow item="余裕高" unit="m" value={f2(structureInput.freeboardM)} />
          <ItemRow item="全深" unit="m" value={structureResult ? f2(structureResult.totalDepthM) : '－'} />
          <ItemRow item="天端幅 T" unit="m" value={structureResult ? f2(structureResult.topWidthM) : '－'} />
          <ItemRow item="貯留容量 V'" unit="m³" value={structureResult ? fi(structureResult.actualVolumeM3) : '－'} />
          <ItemRow
            item="容量の判定"
            unit="－"
            value={structureResult ? (structureResult.isCapacityOk ? 'OK' : 'NG') : '－'}
            note={structureResult && hydrologyResult
              ? `V' ${structureResult.isCapacityOk ? '≥' : '<'} V`
              : ''}
          />
          <ItemRow item="放流施設形式" unit="－" value={dischargeTypeLabel} />
          {hasOrifice && <ItemRow item="オリフィス孔径 / 個数" unit="m / 個" value={`${f3(dischargeInput.orificeDiameterM)} / ${dischargeInput.orificeCount}`} />}
          {hasWeir && <ItemRow item="越流長 Lw" unit="m" value={f2(dischargeInput.weirLengthM)} />}
          <ItemRow item="合計放流量 Q" unit="m³/s" value={dischargeResult ? f3(dischargeResult.totalDischargeM3s) : '－'} />
          <ItemRow
            item="放流量の判定"
            unit="－"
            value={dischargeResult ? (dischargeResult.isDischargeOk ? 'OK' : 'NG') : '－'}
            note={dischargeResult ? `Q ${dischargeResult.isDischargeOk ? '≤' : '>'} Qa` : ''}
            last
          />
        </View>
      </Page>
    </Document>
  )
}
