import { PDFDownloadLink } from '@react-pdf/renderer'
import { PondReportPDF } from '../../pdf/PondReportPDF'
import type { AppState, HydrologyResult } from '../../types'
import type { StructureCalcResult } from '../../calc/structure'
import type { DischargeCalcResult } from '../../calc/discharge'

interface Props {
  state: AppState
  hydrologyResult: HydrologyResult | null
  structureResult: StructureCalcResult | null
  dischargeResult: DischargeCalcResult | null
}

export function ReportPreview({ state, hydrologyResult, structureResult, dischargeResult }: Props) {
  const allOk = structureResult?.isCapacityOk && dischargeResult?.isDischargeOk

  const checks = [
    { label: '基本条件', ok: state.basic.projectName !== '' && state.basic.basinAreaHa > 0 },
    { label: '水文計算', ok: hydrologyResult !== null },
    { label: '構造設計（容量OK）', ok: structureResult?.isCapacityOk === true },
    { label: '放流設備（放流量OK）', ok: dischargeResult?.isDischargeOk === true },
  ]

  const fileName = `調整池設計計算書_${state.basic.projectName || '未設定'}_${new Date().toISOString().slice(0, 10)}.pdf`

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-700">報告書出力</h2>
      <div className="bg-gray-50 rounded p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">チェック状況</h3>
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span className={ok ? 'text-green-600' : 'text-red-500'}>{ok ? '✓' : '✗'}</span>
            <span className={ok ? 'text-gray-700' : 'text-red-600'}>{label}</span>
          </div>
        ))}
      </div>
      {!allOk && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded p-3">
          NG項目があります。PDFは出力できますが、エラー箇所を確認してください。
        </p>
      )}
      <PDFDownloadLink
        document={
          <PondReportPDF
            state={state}
            hydrologyResult={hydrologyResult}
            structureResult={structureResult}
            dischargeResult={dischargeResult}
          />
        }
        fileName={fileName}
      >
        {({ loading }) => (
          <button
            className="w-full py-3 rounded text-white font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            disabled={loading}
          >
            {loading ? 'PDF生成中...' : '📄 報告書PDFをダウンロード'}
          </button>
        )}
      </PDFDownloadLink>
    </div>
  )
}
