import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { AppState, HydrologyResult } from '../types'
import type { StructureCalcResult } from '../calc/structure'
import type { DischargeCalcResult } from '../calc/discharge'

// Noto Sans JP（Google Fonts CDN）で日本語フォントを登録
Font.register({
  family: 'NotoSansJP',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFJGj75vY0rw-oME.ttf',
      fontWeight: 'bold',
    },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'NotoSansJP', color: '#111' },
  coverTitle: { fontSize: 20, textAlign: 'center', marginTop: 100, marginBottom: 20 },
  coverSub: { fontSize: 12, textAlign: 'center', color: '#555', marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 16, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 2 },
  table: { borderWidth: 1, borderColor: '#aaa' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  cellLabel: { flex: 2, padding: 4, borderRightWidth: 1, borderRightColor: '#ccc' },
  cellValue: { flex: 1, padding: 4, textAlign: 'right', borderRightWidth: 1, borderRightColor: '#ccc' },
  cellUnit: { flex: 1, padding: 4 },
  ngText: { color: '#dc2626' },
  okText: { color: '#16a34a' },
  formula: { fontFamily: 'Courier', fontSize: 9, backgroundColor: '#f9fafb', padding: 4, marginBottom: 4 },
})

interface Props {
  state: AppState
  hydrologyResult: HydrologyResult | null
  structureResult: StructureCalcResult | null
  dischargeResult: DischargeCalcResult | null
}

function TableRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellUnit}>{unit}</Text>
    </View>
  )
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

export function PondReportPDF({ state, hydrologyResult, structureResult, dischargeResult }: Props) {
  const { basic, hydrologyInput, structureInput, dischargeInput } = state

  return (
    <Document>
      {/* 表紙 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>防災調整池 設計計算書</Text>
        <Text style={styles.coverSub}>{basic.projectName || '（案件名未入力）'}</Text>
        <Text style={styles.coverSub}>茨城県 確率年 {basic.returnPeriodYears} 年</Text>
        <Text style={[styles.coverSub, { marginTop: 40 }]}>作成日: {new Date().toLocaleDateString('ja-JP')}</Text>
      </Page>

      {/* 設計条件 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>1. 設計条件</Text>
        <View style={styles.table}>
          <TableRow label="案件名" value={basic.projectName || '未入力'} unit="" />
          <TableRow label="都道府県" value="茨城県" unit="" />
          <TableRow label="計画確率年" value={String(basic.returnPeriodYears)} unit="年" />
          <TableRow label="流域面積" value={String(basic.basinAreaHa)} unit="ha" />
          <TableRow label="土地利用区分" value={LAND_USE_LABELS[basic.landUse] ?? basic.landUse} unit="" />
          <TableRow label="許容放流量" value={String(basic.allowableDischargeM3s)} unit="m³/s" />
        </View>
      </Page>

      {/* 水文計算 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>2. 水文計算</Text>
        <Text style={styles.formula}>
          降雨強度式（Talbot型）: r = a / (t + b)^n{'\n'}
          合理式: Q = (1/360) × C × r × A{'\n'}
          必要貯留量: V = max[(Q(t) - Q_allow) × t × 60]
        </Text>
        {hydrologyResult ? (
          <View style={styles.table}>
            <TableRow label="到達時間" value={String(hydrologyInput.concentrationTimeMin)} unit="分" />
            <TableRow label="臨界継続時間" value={String(hydrologyResult.criticalDurationMin)} unit="分" />
            <TableRow label="降雨強度 r" value={hydrologyResult.rainfallIntensityMmhr.toFixed(1)} unit="mm/hr" />
            <TableRow label="計画流出量 Q" value={hydrologyResult.peakFlowM3s.toFixed(3)} unit="m³/s" />
            <TableRow label="必要貯留量 V" value={hydrologyResult.requiredStorageM3.toLocaleString()} unit="m³" />
          </View>
        ) : (
          <Text style={{ color: '#dc2626', fontSize: 9 }}>※ 水文計算未完了</Text>
        )}
      </Page>

      {/* 構造設計 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>3. 構造設計</Text>
        {structureResult ? (
          <>
            <View style={styles.table}>
              <TableRow label="断面形状" value={structureInput.shape === 'rectangular' ? '矩形' : '台形'} unit="" />
              <TableRow label="池底幅" value={String(structureInput.bottomWidthM)} unit="m" />
              <TableRow label="池長" value={String(structureInput.poolLengthM)} unit="m" />
              <TableRow label="法面勾配" value={`1:${structureInput.slopeRatio}`} unit="" />
              <TableRow label="余裕高" value={String(structureInput.freeboardM)} unit="m" />
              <TableRow label="設計水深" value={String(structureResult.waterDepthM)} unit="m" />
              <TableRow label="全深" value={String(structureResult.totalDepthM)} unit="m" />
              <TableRow label="天端幅" value={String(structureResult.topWidthM)} unit="m" />
              <TableRow label="実容量" value={structureResult.actualVolumeM3.toLocaleString()} unit="m³" />
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={structureResult.isCapacityOk ? styles.okText : styles.ngText}>
                判定: {structureResult.isCapacityOk ? '✓ OK（実容量 ≥ 必要貯留量）' : '✗ NG（容量不足）'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ color: '#dc2626', fontSize: 9 }}>※ 構造設計未完了</Text>
        )}
      </Page>

      {/* 放流設備 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>4. 放流設備設計</Text>
        <Text style={styles.formula}>
          オリフィス: Q = C × A × √(2gH)  (C=0.6){'\n'}
          越流堰: Q = C × L × H^(3/2)  (C=1.6)
        </Text>
        {dischargeResult ? (
          <>
            <View style={styles.table}>
              <TableRow label="設備種別" value={dischargeInput.type === 'orifice' ? 'オリフィス' : dischargeInput.type === 'weir' ? '越流堰' : 'オリフィス+越流堰'} unit="" />
              {(dischargeInput.type === 'orifice' || dischargeInput.type === 'both') && (
                <>
                  <TableRow label="孔径" value={String(dischargeInput.orificeDiameterM)} unit="m" />
                  <TableRow label="個数" value={String(dischargeInput.orificeCount)} unit="個" />
                </>
              )}
              {(dischargeInput.type === 'weir' || dischargeInput.type === 'both') && (
                <TableRow label="越流長" value={String(dischargeInput.weirLengthM)} unit="m" />
              )}
              {(dischargeInput.type === 'orifice' || dischargeInput.type === 'both') && (
                <TableRow label="オリフィス放流量" value={dischargeResult.orificeDischargeM3s.toFixed(3)} unit="m³/s" />
              )}
              {(dischargeInput.type === 'weir' || dischargeInput.type === 'both') && (
                <TableRow label="越流堰放流量" value={dischargeResult.weirDischargeM3s.toFixed(3)} unit="m³/s" />
              )}
              <TableRow label="合計放流量" value={dischargeResult.totalDischargeM3s.toFixed(3)} unit="m³/s" />
              <TableRow label="許容放流量" value={String(basic.allowableDischargeM3s)} unit="m³/s" />
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={dischargeResult.isDischargeOk ? styles.okText : styles.ngText}>
                判定: {dischargeResult.isDischargeOk ? '✓ OK（放流量 ≤ 許容放流量）' : '✗ NG（放流量超過）'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ color: '#dc2626', fontSize: 9 }}>※ 放流設備設計未完了</Text>
        )}
      </Page>
    </Document>
  )
}
