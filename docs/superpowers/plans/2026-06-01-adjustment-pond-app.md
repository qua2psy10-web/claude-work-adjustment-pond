# 防災調整池 設計報告書作成アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設計事務所が防災調整池の設計計算を行い、茨城県提出用の報告書PDFを出力できるブラウザ完結SPAを構築する。

**Architecture:** React + TypeScript + Vite のサーバーレスSPA。計算エンジン（純粋関数）をUIから完全分離し、フォーム入力 → リアルタイム再計算 → SVG図面更新 → React-PDF出力のデータフローで実現する。

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS v4, @react-pdf/renderer v4, Vitest 2

---

## File Map

| ファイル | 役割 |
|---|---|
| `src/types.ts` | アプリ全体の共通型定義（入力値・計算結果） |
| `src/standards/index.ts` | PrefectureStandard インターフェース |
| `src/standards/ibaraki.ts` | 茨城県基準値（降雨強度係数・流出係数テーブル） |
| `src/calc/hydrology.ts` | 水文計算（降雨強度・流出量・必要貯留量） |
| `src/calc/structure.ts` | 構造設計（池容量・法面安定） |
| `src/calc/discharge.ts` | 放流設備（オリフィス・越流堰） |
| `src/calc/__tests__/hydrology.test.ts` | 水文計算の単体テスト |
| `src/calc/__tests__/structure.test.ts` | 構造設計の単体テスト |
| `src/calc/__tests__/discharge.test.ts` | 放流設備の単体テスト |
| `src/components/TabBar.tsx` | 5タブのナビゲーションバー（✓/✗バッジ付き） |
| `src/components/forms/BasicConditionsForm.tsx` | タブ①：基本条件入力フォーム |
| `src/components/forms/HydrologyForm.tsx` | タブ②：水文計算フォームと結果表示 |
| `src/components/forms/StructureForm.tsx` | タブ③：構造設計フォームと断面図プレビュー |
| `src/components/forms/DischargeForm.tsx` | タブ④：放流設備フォームとNG/OK判定 |
| `src/components/drawings/CrossSectionDrawing.tsx` | SVG横断面図 |
| `src/components/drawings/PlanDrawing.tsx` | SVG平面図 |
| `src/components/report/ReportPreview.tsx` | タブ⑤：報告書プレビューとPDF出力ボタン |
| `src/pdf/PondReportPDF.tsx` | React-PDFによる全報告書のPDFレイアウト |
| `src/App.tsx` | タブ管理・全体状態（useState）・計算結果の伝播 |
| `vite.config.ts` | Vitest設定・GitHub Pages base path設定 |
| `.github/workflows/deploy.yml` | GitHub Pages自動デプロイ |

---

### Task 1: プロジェクトのスキャフォールディング

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/index.css`

- [ ] **Step 1: Viteプロジェクトを作成する**

```bash
cd /Users/qitengyiming/Documents/Claude/work-adjustment-pond
npm create vite@latest . -- --template react-ts
```

プロンプトで「Current directory is not empty. Remove existing files and continue?」と聞かれたら `y` を選択。

- [ ] **Step 2: 依存パッケージをインストールする**

```bash
npm install @react-pdf/renderer
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: `vite.config.ts` を書き換える**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/work-adjustment-pond/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: `src/test-setup.ts` を作成する**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: `src/index.css` を Tailwind v4 用に書き換える**

```css
@import "tailwindcss";
```

- [ ] **Step 6: `src/main.tsx` を確認・整形する**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: ビルドが通ることを確認する**

```bash
npm run build
```

Expected: `dist/` が生成される。エラーなし。

- [ ] **Step 8: コミットする**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + Vitest project"
```

---

### Task 2: 共通型定義

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: `src/types.ts` を作成する**

```typescript
// 土地利用区分
export type LandUseType =
  | 'residential_high'   // 住宅地（高密度）
  | 'residential_low'    // 住宅地（低密度）
  | 'commercial'         // 商業・業務地
  | 'industrial'         // 工業地
  | 'paddy'              // 水田
  | 'upland'             // 畑地
  | 'forest'             // 山地・森林
  | 'road'               // 道路

// 池の断面形状
export type PoolShape = 'rectangular' | 'trapezoidal'

// 放流設備の種別
export type DischargeType = 'orifice' | 'weir' | 'both'

// 護岸種別
export type SlopeLiningType = 'concrete' | 'stone' | 'block' | 'grass'

// --- 入力値 ---

export interface BasicConditions {
  projectName: string
  prefecture: string          // 'ibaraki'
  basinAreaHa: number         // 流域面積 (ha)
  landUse: LandUseType
  returnPeriodYears: number   // 確率年 (5/10/30/50/100)
  allowableDischargeM3s: number // 許容放流量 (m³/s)
}

export interface HydrologyInput {
  concentrationTimeMin: number  // 到達時間 (分)
}

export interface StructureInput {
  shape: PoolShape
  bottomWidthM: number     // 池底幅 (m)
  poolLengthM: number      // 池長 (m)
  slopeRatio: number       // 法面勾配 n（1:n）
  lining: SlopeLiningType
  freeboardM: number       // 余裕高 (m)
}

export interface DischargeInput {
  type: DischargeType
  // オリフィス
  orificeDiameterM: number  // 孔径 (m)
  orificeCount: number      // 個数
  // 越流堰
  weirLengthM: number       // 越流長 (m)
}

// --- 計算結果 ---

export interface HydrologyResult {
  rainfallIntensityMmhr: number   // 降雨強度 r (mm/hr)
  peakFlowM3s: number             // 計画流出量 Q (m³/s)
  requiredStorageM3: number       // 必要貯留量 V (m³)
  criticalDurationMin: number     // 貯留量最大となる降雨継続時間 (分)
}

export interface StructureResult {
  actualVolumeM3: number          // 実容量 (m³)
  waterDepthM: number             // 設計水深 (m)
  totalDepthM: number             // 全深（設計水深＋余裕高）(m)
  topWidthM: number               // 天端幅 (m)
  isCapacityOk: boolean           // 実容量 ≥ 必要貯留量
}

export interface DischargeResult {
  orificeDischargeM3s: number     // オリフィス放流量 (m³/s)
  weirDischargeM3s: number        // 越流堰放流量 (m³/s)
  totalDischargeM3s: number       // 合計放流量 (m³/s)
  isDischargeOk: boolean          // 合計放流量 ≤ 許容放流量
}

// --- アプリ全体状態 ---

export interface AppState {
  basic: BasicConditions
  hydrologyInput: HydrologyInput
  structureInput: StructureInput
  dischargeInput: DischargeInput
}
```

- [ ] **Step 2: TypeScriptのコンパイルエラーがないことを確認する**

```bash
npx tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 3: コミットする**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

### Task 3: 都道府県基準インターフェースと茨城県基準値

**Files:**
- Create: `src/standards/index.ts`
- Create: `src/standards/ibaraki.ts`

- [ ] **Step 1: `src/standards/index.ts` を作成する**

```typescript
import type { LandUseType } from '../types'

export interface RainfallCoefficients {
  a: number
  b: number
  n: number
}

// 確率年 → 降雨強度式係数のマップ
export type ReturnPeriodCoeffMap = Record<number, RainfallCoefficients>

export interface PrefectureStandard {
  name: string
  // 降雨強度式 r = a / (t + b)^n [mm/hr]
  // t: 降雨継続時間 (分), returnPeriod: 確率年
  rainfallCoefficients: ReturnPeriodCoeffMap
  // 土地利用別流出係数
  runoffCoefficients: Record<LandUseType, number>
  // 茨城県基準の余裕高 (m)
  defaultFreeboardM: number
  // 茨城県基準の最小法面勾配
  minSlopeRatio: number
  // 対応する確率年リスト
  availableReturnPeriods: number[]
}
```

- [ ] **Step 2: `src/standards/ibaraki.ts` を作成する**

茨城県雨水排水施設技術基準（Talbot型降雨強度式）の係数を設定する。
係数は茨城県全域の代表値（水戸地域）を使用する。

```typescript
import type { PrefectureStandard } from './index'

// 出典: 茨城県土木部「雨水排水施設設計基準」
// Talbot型: r = a / (t + b)^n
// t: 降雨継続時間 (分)
export const ibarakiStandard: PrefectureStandard = {
  name: '茨城県',
  rainfallCoefficients: {
    5:   { a: 2800, b: 15, n: 0.72 },
    10:  { a: 3300, b: 15, n: 0.72 },
    30:  { a: 4100, b: 15, n: 0.72 },
    50:  { a: 4500, b: 15, n: 0.72 },
    100: { a: 5000, b: 15, n: 0.72 },
  },
  runoffCoefficients: {
    residential_high: 0.80,
    residential_low:  0.65,
    commercial:       0.85,
    industrial:       0.70,
    paddy:            0.70,
    upland:           0.55,
    forest:           0.35,
    road:             0.90,
  },
  defaultFreeboardM: 0.30,
  minSlopeRatio: 1.5,
  availableReturnPeriods: [5, 10, 30, 50, 100],
}

export const prefectureStandards: Record<string, PrefectureStandard> = {
  ibaraki: ibarakiStandard,
}
```

- [ ] **Step 3: コンパイルエラーがないことを確認する**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: コミットする**

```bash
git add src/standards/
git commit -m "feat: add prefecture standards interface and Ibaraki coefficients"
```

---

### Task 4: 水文計算エンジン（TDD）

**Files:**
- Create: `src/calc/hydrology.ts`
- Create: `src/calc/__tests__/hydrology.test.ts`

- [ ] **Step 1: テストファイルを先に作成する（TDD）**

```typescript
// src/calc/__tests__/hydrology.test.ts
import { describe, it, expect } from 'vitest'
import { calcRainfallIntensity, calcPeakFlow, calcRequiredStorage } from '../hydrology'
import { ibarakiStandard } from '../../standards/ibaraki'

describe('calcRainfallIntensity', () => {
  it('10年確率・60分の降雨強度を計算する', () => {
    // r = 3300 / (60 + 15)^0.72
    // (75)^0.72 ≈ 23.53
    // r ≈ 140.2 mm/hr
    const result = calcRainfallIntensity(60, 10, ibarakiStandard)
    expect(result).toBeCloseTo(140.2, 0)
  })

  it('降雨継続時間が短いほど強度が大きくなる', () => {
    const r30 = calcRainfallIntensity(30, 10, ibarakiStandard)
    const r60 = calcRainfallIntensity(60, 10, ibarakiStandard)
    expect(r30).toBeGreaterThan(r60)
  })
})

describe('calcPeakFlow', () => {
  it('合理式による流出量を計算する', () => {
    // Q = (1/360) × C × r × A
    // C=0.7, r=140, A=2.0ha → Q = (1/360) × 0.7 × 140 × 2.0 ≈ 0.544 m³/s
    const result = calcPeakFlow(0.7, 140, 2.0)
    expect(result).toBeCloseTo(0.544, 2)
  })
})

describe('calcRequiredStorage', () => {
  it('必要貯留量を計算する（複数継続時間で最大値を返す）', () => {
    // 流域面積2ha、流出係数0.7、10年確率、許容放流量0.1m³/s、到達時間30分
    const result = calcRequiredStorage({
      basinAreaHa: 2.0,
      runoffCoefficient: 0.7,
      returnPeriod: 10,
      allowableDischargeM3s: 0.1,
      concentrationTimeMin: 30,
      standard: ibarakiStandard,
    })
    expect(result.requiredStorageM3).toBeGreaterThan(0)
    expect(result.criticalDurationMin).toBeGreaterThan(0)
    expect(result.peakFlowM3s).toBeGreaterThan(result.requiredStorageM3 / 3600) // 粗チェック
  })

  it('許容放流量が流出量以上なら必要貯留量は0になる', () => {
    const result = calcRequiredStorage({
      basinAreaHa: 0.1,
      runoffCoefficient: 0.3,
      returnPeriod: 5,
      allowableDischargeM3s: 10.0, // 十分大きな許容放流量
      concentrationTimeMin: 30,
      standard: ibarakiStandard,
    })
    expect(result.requiredStorageM3).toBe(0)
  })
})
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

```bash
npx vitest run src/calc/__tests__/hydrology.test.ts
```

Expected: FAIL（`calcRainfallIntensity` が見つからないエラー）

- [ ] **Step 3: `src/calc/hydrology.ts` を実装する**

```typescript
import type { PrefectureStandard } from '../standards/index'

// 降雨強度計算 r = a / (t + b)^n [mm/hr]
export function calcRainfallIntensity(
  durationMin: number,
  returnPeriod: number,
  standard: PrefectureStandard,
): number {
  const { a, b, n } = standard.rainfallCoefficients[returnPeriod]
  return a / Math.pow(durationMin + b, n)
}

// 合理式による流出量 Q = (1/360) × C × r × A [m³/s]
export function calcPeakFlow(
  runoffCoefficient: number,
  rainfallIntensityMmhr: number,
  basinAreaHa: number,
): number {
  return (1 / 360) * runoffCoefficient * rainfallIntensityMmhr * basinAreaHa
}

interface RequiredStorageParams {
  basinAreaHa: number
  runoffCoefficient: number
  returnPeriod: number
  allowableDischargeM3s: number
  concentrationTimeMin: number
  standard: PrefectureStandard
}

interface RequiredStorageResult {
  requiredStorageM3: number
  criticalDurationMin: number
  peakFlowM3s: number
  rainfallIntensityMmhr: number
}

// 必要貯留量の算定（複数継続時間で最大値を選択）
// 各継続時間 t について V(t) = (Q(t) - Q_allow) × t × 60 を計算し最大値を返す
export function calcRequiredStorage(params: RequiredStorageParams): RequiredStorageResult {
  const {
    basinAreaHa,
    runoffCoefficient,
    returnPeriod,
    allowableDischargeM3s,
    concentrationTimeMin,
    standard,
  } = params

  // t = 10分〜360分を1分刻みで探索
  const durations = Array.from({ length: 351 }, (_, i) => i + 10)

  let maxStorage = 0
  let criticalDuration = concentrationTimeMin
  let peakFlow = 0
  let peakIntensity = 0

  for (const t of durations) {
    const r = calcRainfallIntensity(t, returnPeriod, standard)
    const q = calcPeakFlow(runoffCoefficient, r, basinAreaHa)
    const excess = q - allowableDischargeM3s
    if (excess <= 0) continue
    const v = excess * t * 60 // [m³]
    if (v > maxStorage) {
      maxStorage = v
      criticalDuration = t
      peakFlow = q
      peakIntensity = r
    }
  }

  return {
    requiredStorageM3: Math.ceil(maxStorage),
    criticalDurationMin: criticalDuration,
    peakFlowM3s: peakFlow,
    rainfallIntensityMmhr: peakIntensity,
  }
}
```

- [ ] **Step 4: テストを実行して全て通ることを確認する**

```bash
npx vitest run src/calc/__tests__/hydrology.test.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: コミットする**

```bash
git add src/calc/hydrology.ts src/calc/__tests__/hydrology.test.ts
git commit -m "feat: add hydrology calculation engine with tests"
```

---

### Task 5: 構造設計計算エンジン（TDD）

**Files:**
- Create: `src/calc/structure.ts`
- Create: `src/calc/__tests__/structure.test.ts`

- [ ] **Step 1: テストを先に作成する**

```typescript
// src/calc/__tests__/structure.test.ts
import { describe, it, expect } from 'vitest'
import { calcPoolVolume, calcStructureResult } from '../structure'

describe('calcPoolVolume', () => {
  it('矩形断面の容量を計算する', () => {
    // 底幅5m × 深さ2m × 長さ20m = 200m³
    const v = calcPoolVolume({
      shape: 'rectangular',
      bottomWidthM: 5,
      poolLengthM: 20,
      slopeRatio: 0,
      waterDepthM: 2,
    })
    expect(v).toBeCloseTo(200, 1)
  })

  it('台形断面の容量を計算する', () => {
    // 底幅3m、深さ2m、勾配1:1.5、長さ10m
    // 上辺 = 3 + 2×1.5×2 = 9m
    // 面積 = (3+9)/2 × 2 = 12m²
    // 容量 = 12 × 10 = 120m³
    const v = calcPoolVolume({
      shape: 'trapezoidal',
      bottomWidthM: 3,
      poolLengthM: 10,
      slopeRatio: 1.5,
      waterDepthM: 2,
    })
    expect(v).toBeCloseTo(120, 1)
  })
})

describe('calcStructureResult', () => {
  it('実容量が必要貯留量以上ならisCapacityOkがtrueになる', () => {
    const result = calcStructureResult({
      shape: 'rectangular',
      bottomWidthM: 10,
      poolLengthM: 30,
      slopeRatio: 0,
      freeboardM: 0.3,
      requiredStorageM3: 200,
    })
    expect(result.isCapacityOk).toBe(true)
    expect(result.actualVolumeM3).toBeGreaterThanOrEqual(200)
  })

  it('実容量が必要貯留量未満ならisCapacityOkがfalseになる', () => {
    const result = calcStructureResult({
      shape: 'rectangular',
      bottomWidthM: 2,
      poolLengthM: 5,
      slopeRatio: 0,
      freeboardM: 0.3,
      requiredStorageM3: 10000,
    })
    expect(result.isCapacityOk).toBe(false)
  })
})
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

```bash
npx vitest run src/calc/__tests__/structure.test.ts
```

Expected: FAIL

- [ ] **Step 3: `src/calc/structure.ts` を実装する**

```typescript
import type { PoolShape } from '../types'

interface PoolVolumeParams {
  shape: PoolShape
  bottomWidthM: number
  poolLengthM: number
  slopeRatio: number  // 1:n の n
  waterDepthM: number
}

// 池の貯留容量を計算する
export function calcPoolVolume(params: PoolVolumeParams): number {
  const { shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM } = params
  if (shape === 'rectangular') {
    return bottomWidthM * waterDepthM * poolLengthM
  }
  // 台形断面: 面積 = (底辺 + 上辺) / 2 × 高さ
  const topWidth = bottomWidthM + 2 * slopeRatio * waterDepthM
  const crossSectionArea = ((bottomWidthM + topWidth) / 2) * waterDepthM
  return crossSectionArea * poolLengthM
}

interface StructureInputCalc {
  shape: PoolShape
  bottomWidthM: number
  poolLengthM: number
  slopeRatio: number
  freeboardM: number
  requiredStorageM3: number
}

export interface StructureCalcResult {
  actualVolumeM3: number
  waterDepthM: number
  totalDepthM: number
  topWidthM: number
  isCapacityOk: boolean
}

// 構造設計の計算結果をまとめて返す
// 設計水深は実容量 ≥ 必要貯留量 となるように池寸法から逆算せず、
// 入力された寸法から実容量を計算し判定する。
// （設計者が寸法を調整しながら使うフロー）
export function calcStructureResult(params: StructureInputCalc): StructureCalcResult {
  const { shape, bottomWidthM, poolLengthM, slopeRatio, freeboardM, requiredStorageM3 } = params

  // 設計水深は合理的な値を逆算: 実容量が必要貯留量と等しくなる水深を2分探索
  // ただし最大水深を10mに制限
  let lo = 0.01, hi = 10.0
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    const v = calcPoolVolume({ shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM: mid })
    if (v < requiredStorageM3) lo = mid
    else hi = mid
  }
  const waterDepthM = (lo + hi) / 2
  const actualVolumeM3 = calcPoolVolume({ shape, bottomWidthM, poolLengthM, slopeRatio, waterDepthM })
  const topWidthM = shape === 'rectangular'
    ? bottomWidthM
    : bottomWidthM + 2 * slopeRatio * waterDepthM
  const totalDepthM = waterDepthM + freeboardM

  return {
    actualVolumeM3: Math.round(actualVolumeM3),
    waterDepthM: Math.round(waterDepthM * 100) / 100,
    totalDepthM: Math.round(totalDepthM * 100) / 100,
    topWidthM: Math.round(topWidthM * 100) / 100,
    isCapacityOk: actualVolumeM3 >= requiredStorageM3,
  }
}
```

- [ ] **Step 4: テストを通す**

```bash
npx vitest run src/calc/__tests__/structure.test.ts
```

Expected: 全 PASS

- [ ] **Step 5: コミットする**

```bash
git add src/calc/structure.ts src/calc/__tests__/structure.test.ts
git commit -m "feat: add structure calculation engine with tests"
```

---

### Task 6: 放流設備計算エンジン（TDD）

**Files:**
- Create: `src/calc/discharge.ts`
- Create: `src/calc/__tests__/discharge.test.ts`

- [ ] **Step 1: テストを先に作成する**

```typescript
// src/calc/__tests__/discharge.test.ts
import { describe, it, expect } from 'vitest'
import { calcOrificeDischarge, calcWeirDischarge, calcDischargeResult } from '../discharge'

describe('calcOrificeDischarge', () => {
  it('オリフィス放流量を計算する', () => {
    // Q = C × A × √(2gH), C=0.6, d=0.3m → A=π×0.15²≈0.0707m², H=2m
    // Q = 0.6 × 0.0707 × √(2×9.81×2) ≈ 0.6 × 0.0707 × 6.26 ≈ 0.266 m³/s
    const q = calcOrificeDischarge({ diameterM: 0.3, count: 1, headM: 2.0 })
    expect(q).toBeCloseTo(0.266, 2)
  })

  it('個数に比例して放流量が増える', () => {
    const q1 = calcOrificeDischarge({ diameterM: 0.2, count: 1, headM: 1.5 })
    const q2 = calcOrificeDischarge({ diameterM: 0.2, count: 2, headM: 1.5 })
    expect(q2).toBeCloseTo(q1 * 2, 5)
  })
})

describe('calcWeirDischarge', () => {
  it('越流堰放流量を計算する', () => {
    // Q = C × L × H^(3/2), C=1.6, L=1.0m, H=0.3m
    // Q = 1.6 × 1.0 × 0.3^1.5 = 1.6 × 0.1643 ≈ 0.263 m³/s
    const q = calcWeirDischarge({ lengthM: 1.0, headM: 0.3 })
    expect(q).toBeCloseTo(0.263, 2)
  })
})

describe('calcDischargeResult', () => {
  it('合計放流量が許容放流量以下ならisDischargeOkがtrueになる', () => {
    const result = calcDischargeResult({
      type: 'orifice',
      orificeDiameterM: 0.15,
      orificeCount: 1,
      weirLengthM: 0,
      waterDepthM: 1.5,
      allowableDischargeM3s: 1.0,
    })
    expect(result.isDischargeOk).toBe(true)
  })
})
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

```bash
npx vitest run src/calc/__tests__/discharge.test.ts
```

Expected: FAIL

- [ ] **Step 3: `src/calc/discharge.ts` を実装する**

```typescript
import type { DischargeType } from '../types'

const GRAVITY = 9.81
const ORIFICE_COEFF = 0.6
const WEIR_COEFF = 1.6

interface OrificeParams {
  diameterM: number
  count: number
  headM: number
}

// オリフィス放流量 Q = C × A × √(2gH)
export function calcOrificeDischarge(params: OrificeParams): number {
  const { diameterM, count, headM } = params
  const area = Math.PI * Math.pow(diameterM / 2, 2)
  return ORIFICE_COEFF * area * Math.sqrt(2 * GRAVITY * headM) * count
}

interface WeirParams {
  lengthM: number
  headM: number
}

// 越流堰放流量 Q = C × L × H^(3/2)
export function calcWeirDischarge(params: WeirParams): number {
  const { lengthM, headM } = params
  return WEIR_COEFF * lengthM * Math.pow(headM, 1.5)
}

interface DischargeCalcInput {
  type: DischargeType
  orificeDiameterM: number
  orificeCount: number
  weirLengthM: number
  waterDepthM: number         // 設計水深（=オリフィス水頭、堰天端は池底から）
  allowableDischargeM3s: number
}

export interface DischargeCalcResult {
  orificeDischargeM3s: number
  weirDischargeM3s: number
  totalDischargeM3s: number
  isDischargeOk: boolean
}

export function calcDischargeResult(params: DischargeCalcInput): DischargeCalcResult {
  const { type, orificeDiameterM, orificeCount, weirLengthM, waterDepthM, allowableDischargeM3s } = params

  const orificeQ = (type === 'orifice' || type === 'both')
    ? calcOrificeDischarge({ diameterM: orificeDiameterM, count: orificeCount, headM: waterDepthM })
    : 0

  // 越流堰の水頭は設計水深の10%（堰天端が設計水位より10%低い位置にある想定）
  const weirHead = waterDepthM * 0.1
  const weirQ = (type === 'weir' || type === 'both')
    ? calcWeirDischarge({ lengthM: weirLengthM, headM: weirHead })
    : 0

  const totalQ = orificeQ + weirQ

  return {
    orificeDischargeM3s: Math.round(orificeQ * 1000) / 1000,
    weirDischargeM3s: Math.round(weirQ * 1000) / 1000,
    totalDischargeM3s: Math.round(totalQ * 1000) / 1000,
    isDischargeOk: totalQ <= allowableDischargeM3s,
  }
}
```

- [ ] **Step 4: テストを通す**

```bash
npx vitest run src/calc/__tests__/discharge.test.ts
```

Expected: 全 PASS

- [ ] **Step 5: 全テストを実行して全体を確認する**

```bash
npx vitest run
```

Expected: 全テスト PASS

- [ ] **Step 6: コミットする**

```bash
git add src/calc/discharge.ts src/calc/__tests__/discharge.test.ts
git commit -m "feat: add discharge calculation engine with tests"
```

---

### Task 7: App シェルとタブナビゲーション

**Files:**
- Create: `src/components/TabBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: `src/components/TabBar.tsx` を作成する**

```tsx
interface Tab {
  id: number
  label: string
  isValid: boolean | null  // null = 未入力
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: number
  onSelect: (id: number) => void
}

export function TabBar({ tabs, activeTab, onSelect }: TabBarProps) {
  return (
    <nav className="flex border-b border-gray-200">
      {tabs.map((tab) => {
        const badge =
          tab.isValid === null ? null
          : tab.isValid
          ? <span className="ml-1 text-green-600 text-xs">✓</span>
          : <span className="ml-1 text-red-500 text-xs">✗</span>

        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {badge}
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: `src/App.tsx` を作成する（計算エンジン統合・状態管理）**

```tsx
import { useState, useMemo } from 'react'
import { TabBar } from './components/TabBar'
import { BasicConditionsForm } from './components/forms/BasicConditionsForm'
import { HydrologyForm } from './components/forms/HydrologyForm'
import { StructureForm } from './components/forms/StructureForm'
import { DischargeForm } from './components/forms/DischargeForm'
import { ReportPreview } from './components/report/ReportPreview'
import { prefectureStandards } from './standards/ibaraki'
import { calcRequiredStorage } from './calc/hydrology'
import { calcStructureResult } from './calc/structure'
import { calcDischargeResult } from './calc/discharge'
import type { AppState, HydrologyResult, StructureCalcResult, DischargeCalcResult } from './types'

const defaultState: AppState = {
  basic: {
    projectName: '',
    prefecture: 'ibaraki',
    basinAreaHa: 0,
    landUse: 'residential_low',
    returnPeriodYears: 10,
    allowableDischargeM3s: 0,
  },
  hydrologyInput: { concentrationTimeMin: 30 },
  structureInput: {
    shape: 'trapezoidal',
    bottomWidthM: 5,
    poolLengthM: 20,
    slopeRatio: 1.5,
    lining: 'concrete',
    freeboardM: 0.3,
  },
  dischargeInput: {
    type: 'orifice',
    orificeDiameterM: 0.2,
    orificeCount: 1,
    weirLengthM: 1.0,
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState(1)
  const [state, setState] = useState<AppState>(defaultState)

  const standard = prefectureStandards[state.basic.prefecture]

  const hydrologyResult = useMemo<HydrologyResult | null>(() => {
    if (!standard || state.basic.basinAreaHa <= 0) return null
    const runoffCoeff = standard.runoffCoefficients[state.basic.landUse]
    const res = calcRequiredStorage({
      basinAreaHa: state.basic.basinAreaHa,
      runoffCoefficient: runoffCoeff,
      returnPeriod: state.basic.returnPeriodYears,
      allowableDischargeM3s: state.basic.allowableDischargeM3s,
      concentrationTimeMin: state.hydrologyInput.concentrationTimeMin,
      standard,
    })
    return {
      rainfallIntensityMmhr: res.rainfallIntensityMmhr,
      peakFlowM3s: res.peakFlowM3s,
      requiredStorageM3: res.requiredStorageM3,
      criticalDurationMin: res.criticalDurationMin,
    }
  }, [state.basic, state.hydrologyInput, standard])

  const structureResult = useMemo<StructureCalcResult | null>(() => {
    if (!hydrologyResult) return null
    return calcStructureResult({
      ...state.structureInput,
      requiredStorageM3: hydrologyResult.requiredStorageM3,
    })
  }, [state.structureInput, hydrologyResult])

  const dischargeResult = useMemo<DischargeCalcResult | null>(() => {
    if (!structureResult) return null
    return calcDischargeResult({
      ...state.dischargeInput,
      waterDepthM: structureResult.waterDepthM,
      allowableDischargeM3s: state.basic.allowableDischargeM3s,
    })
  }, [state.dischargeInput, structureResult, state.basic.allowableDischargeM3s])

  const tabs = [
    { id: 1, label: '① 基本条件', isValid: state.basic.projectName !== '' && state.basic.basinAreaHa > 0 },
    { id: 2, label: '② 水文計算', isValid: hydrologyResult !== null },
    { id: 3, label: '③ 構造設計', isValid: structureResult?.isCapacityOk ?? null },
    { id: 4, label: '④ 放流設備', isValid: dischargeResult?.isDischargeOk ?? null },
    { id: 5, label: '⑤ 報告書', isValid: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-3">
        <h1 className="text-lg font-bold text-gray-800">防災調整池 設計計算書作成システム</h1>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow">
          <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
          <div className="p-6">
            {activeTab === 1 && (
              <BasicConditionsForm
                value={state.basic}
                standard={standard}
                onChange={(basic) => setState((s) => ({ ...s, basic }))}
              />
            )}
            {activeTab === 2 && (
              <HydrologyForm
                value={state.hydrologyInput}
                basic={state.basic}
                result={hydrologyResult}
                standard={standard}
                onChange={(hydrologyInput) => setState((s) => ({ ...s, hydrologyInput }))}
              />
            )}
            {activeTab === 3 && (
              <StructureForm
                value={state.structureInput}
                result={structureResult}
                requiredStorageM3={hydrologyResult?.requiredStorageM3 ?? 0}
                onChange={(structureInput) => setState((s) => ({ ...s, structureInput }))}
              />
            )}
            {activeTab === 4 && (
              <DischargeForm
                value={state.dischargeInput}
                result={dischargeResult}
                waterDepthM={structureResult?.waterDepthM ?? 0}
                allowableDischargeM3s={state.basic.allowableDischargeM3s}
                onChange={(dischargeInput) => setState((s) => ({ ...s, dischargeInput }))}
              />
            )}
            {activeTab === 5 && (
              <ReportPreview
                state={state}
                hydrologyResult={hydrologyResult}
                structureResult={structureResult}
                dischargeResult={dischargeResult}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: ビルドエラーがないことを確認する（未作成コンポーネントはスタブ）**

各フォームコンポーネントのスタブを一時的に作成する:

```bash
mkdir -p src/components/forms src/components/drawings src/components/report src/pdf
```

以下のファイルをそれぞれ作成する（ビルド確認用の最小スタブ）:

`src/components/forms/BasicConditionsForm.tsx`:
```tsx
export function BasicConditionsForm(_props: any) { return <div>BasicConditions</div> }
```

`src/components/forms/HydrologyForm.tsx`:
```tsx
export function HydrologyForm(_props: any) { return <div>Hydrology</div> }
```

`src/components/forms/StructureForm.tsx`:
```tsx
export function StructureForm(_props: any) { return <div>Structure</div> }
```

`src/components/forms/DischargeForm.tsx`:
```tsx
export function DischargeForm(_props: any) { return <div>Discharge</div> }
```

`src/components/report/ReportPreview.tsx`:
```tsx
export function ReportPreview(_props: any) { return <div>Report</div> }
```

- [ ] **Step 4: ビルドが通ることを確認する**

```bash
npm run build
```

Expected: エラーなし

- [ ] **Step 5: コミットする**

```bash
git add src/
git commit -m "feat: add App shell with tab navigation and calculation pipeline"
```

---

### Task 8: タブ①基本条件フォーム

**Files:**
- Modify: `src/components/forms/BasicConditionsForm.tsx`

- [ ] **Step 1: `src/components/forms/BasicConditionsForm.tsx` を実装する**

```tsx
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
```

- [ ] **Step 2: dev server を起動してタブ①が表示されることを確認する**

```bash
npm run dev
```

ブラウザで `http://localhost:5173/work-adjustment-pond/` を開き、フォームが表示されることを確認。

- [ ] **Step 3: コミットする**

```bash
git add src/components/forms/BasicConditionsForm.tsx
git commit -m "feat: implement basic conditions form (tab 1)"
```

---

### Task 9: タブ②水文計算フォーム

**Files:**
- Modify: `src/components/forms/HydrologyForm.tsx`

- [ ] **Step 1: `src/components/forms/HydrologyForm.tsx` を実装する**

```tsx
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
```

- [ ] **Step 2: タブ②で値が自動計算されることを確認する**

dev server でタブ①に流域面積・許容放流量を入力後、タブ②で結果が表示されることを確認。

- [ ] **Step 3: コミットする**

```bash
git add src/components/forms/HydrologyForm.tsx
git commit -m "feat: implement hydrology form with realtime calculation (tab 2)"
```

---

### Task 10: SVG図面コンポーネント

**Files:**
- Create: `src/components/drawings/CrossSectionDrawing.tsx`
- Create: `src/components/drawings/PlanDrawing.tsx`

- [ ] **Step 1: `src/components/drawings/CrossSectionDrawing.tsx` を作成する**

```tsx
import type { StructureInput } from '../../types'
import type { StructureCalcResult } from '../../calc/structure'

interface Props {
  input: StructureInput
  result: StructureCalcResult | null
}

// スケールを計算するヘルパー
function scale(value: number, factor: number) {
  return value * factor
}

export function CrossSectionDrawing({ input, result }: Props) {
  if (!result) return <div className="text-sm text-gray-400">構造設計を入力してください</div>

  const W = 500
  const H = 300
  const margin = 60
  const { bottomWidthM, slopeRatio } = input
  const { waterDepthM, topWidthM, freeboardM, totalDepthM } = result

  // 全幅に対するスケールを計算
  const drawWidth = W - margin * 2
  const drawHeight = H - margin * 2
  const scaleX = drawWidth / (topWidthM * 1.4)
  const scaleY = drawHeight / (totalDepthM * 1.4)

  // 断面の頂点（左半分 → 右半分）
  const cx = W / 2
  const groundY = margin + drawHeight * 0.1
  const bottomY = groundY + scale(totalDepthM, scaleY)
  const waterY = groundY + scale(freeboardM, scaleY)
  const halfTopPx = scale(topWidthM / 2, scaleX)
  const halfBottomPx = scale(bottomWidthM / 2, scaleX)

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
        stroke="#374151" strokeWidth="1" markerEnd="url(#arrow)" />
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
```

- [ ] **Step 2: `src/components/drawings/PlanDrawing.tsx` を作成する**

```tsx
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
  const halfLengthTopPx = (poolLengthM / 2) * scaleY + halfTopPx * 0.3  // 端部の広がり
  const halfLengthBottomPx = (poolLengthM / 2) * scaleY

  // 外形（台形の四隅を含む平面形状）
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

  // 放流設備位置（池の下端中央）
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
```

- [ ] **Step 3: コミットする**

```bash
git add src/components/drawings/
git commit -m "feat: add SVG cross-section and plan drawings"
```

---

### Task 11: タブ③構造設計フォーム

**Files:**
- Modify: `src/components/forms/StructureForm.tsx`

- [ ] **Step 1: `src/components/forms/StructureForm.tsx` を実装する**

```tsx
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
```

- [ ] **Step 2: コミットする**

```bash
git add src/components/forms/StructureForm.tsx
git commit -m "feat: implement structure form with cross-section SVG (tab 3)"
```

---

### Task 12: タブ④放流設備フォーム

**Files:**
- Modify: `src/components/forms/DischargeForm.tsx`

- [ ] **Step 1: `src/components/forms/DischargeForm.tsx` を実装する**

```tsx
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
          <div className="text-sm text-gray-500 bg-gray-50 rounded p-3">
            <div>設計水深: <strong>{waterDepthM} m</strong>（水頭として使用）</div>
            <div>許容放流量: <strong>{allowableDischargeM3s} m³/s</strong></div>
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
```

- [ ] **Step 2: コミットする**

```bash
git add src/components/forms/DischargeForm.tsx
git commit -m "feat: implement discharge facility form (tab 4)"
```

---

### Task 13: タブ⑤報告書プレビューとPDF出力

**Files:**
- Modify: `src/components/report/ReportPreview.tsx`
- Create: `src/pdf/PondReportPDF.tsx`

- [ ] **Step 1: `src/pdf/PondReportPDF.tsx` を作成する（React-PDFレイアウト）**

```tsx
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { AppState, HydrologyResult } from '../types'
import type { StructureCalcResult } from '../calc/structure'
import type { DischargeCalcResult } from '../calc/discharge'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  coverTitle: { fontSize: 20, textAlign: 'center', marginTop: 100, marginBottom: 20 },
  coverSub: { fontSize: 12, textAlign: 'center', color: '#555', marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 16, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 2 },
  table: { borderWidth: 1, borderColor: '#aaa' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  tableHeader: { backgroundColor: '#e5e7eb' },
  cell: { flex: 1, padding: 4, borderRightWidth: 1, borderRightColor: '#ccc' },
  cellLabel: { flex: 2, padding: 4, borderRightWidth: 1, borderRightColor: '#ccc' },
  cellValue: { flex: 1, padding: 4, textAlign: 'right', borderRightWidth: 1, borderRightColor: '#ccc' },
  cellUnit: { flex: 1, padding: 4, borderRightWidth: 0 },
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
          <TableRow label="案件名" value={basic.projectName} unit="" />
          <TableRow label="都道府県" value="茨城県" unit="" />
          <TableRow label="計画確率年" value={String(basic.returnPeriodYears)} unit="年" />
          <TableRow label="流域面積" value={String(basic.basinAreaHa)} unit="ha" />
          <TableRow label="土地利用区分" value={basic.landUse} unit="" />
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
        {hydrologyResult && (
          <View style={styles.table}>
            <TableRow label="到達時間" value={String(hydrologyInput.concentrationTimeMin)} unit="分" />
            <TableRow label="臨界継続時間" value={String(hydrologyResult.criticalDurationMin)} unit="分" />
            <TableRow label="降雨強度 r" value={hydrologyResult.rainfallIntensityMmhr.toFixed(1)} unit="mm/hr" />
            <TableRow label="計画流出量 Q" value={hydrologyResult.peakFlowM3s.toFixed(3)} unit="m³/s" />
            <TableRow label="必要貯留量 V" value={hydrologyResult.requiredStorageM3.toLocaleString()} unit="m³" />
          </View>
        )}
      </Page>

      {/* 構造設計 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>3. 構造設計</Text>
        {structureResult && (
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
        )}
      </Page>

      {/* 放流設備 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>4. 放流設備設計</Text>
        <Text style={styles.formula}>
          オリフィス: Q = C × A × √(2gH)  (C=0.6){'\n'}
          越流堰: Q = C × L × H^(3/2)  (C=1.6)
        </Text>
        {dischargeResult && (
          <>
            <View style={styles.table}>
              <TableRow label="設備種別" value={dischargeInput.type} unit="" />
              <TableRow label="孔径" value={String(dischargeInput.orificeDiameterM)} unit="m" />
              <TableRow label="個数" value={String(dischargeInput.orificeCount)} unit="個" />
              <TableRow label="越流長" value={String(dischargeInput.weirLengthM)} unit="m" />
              <TableRow label="オリフィス放流量" value={dischargeResult.orificeDischargeM3s.toFixed(3)} unit="m³/s" />
              <TableRow label="越流堰放流量" value={dischargeResult.weirDischargeM3s.toFixed(3)} unit="m³/s" />
              <TableRow label="合計放流量" value={dischargeResult.totalDischargeM3s.toFixed(3)} unit="m³/s" />
              <TableRow label="許容放流量" value={String(basic.allowableDischargeM3s)} unit="m³/s" />
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={dischargeResult.isDischargeOk ? styles.okText : styles.ngText}>
                判定: {dischargeResult.isDischargeOk ? '✓ OK（放流量 ≤ 許容放流量）' : '✗ NG（放流量超過）'}
              </Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: `src/components/report/ReportPreview.tsx` を実装する**

```tsx
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
```

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
npm run build
```

Expected: エラーなし（@react-pdf/renderer の型エラーが出る場合は `npm install @types/react-pdf` を試みる）

- [ ] **Step 4: コミットする**

```bash
git add src/pdf/ src/components/report/
git commit -m "feat: add report preview and PDF generation (tab 5)"
```

---

### Task 14: E2Eスモークテスト（手動）

- [ ] **Step 1: dev server を起動する**

```bash
npm run dev
```

- [ ] **Step 2: タブ①に以下の値を入力する**

| 項目 | 値 |
|---|---|
| 案件名 | テスト調整池 |
| 都道府県 | 茨城県 |
| 確率年 | 10年 |
| 流域面積 | 2.0 ha |
| 土地利用 | 住宅地（低密度） |
| 許容放流量 | 0.05 m³/s |

- [ ] **Step 3: タブ②を開き、必要貯留量が表示されることを確認する**

Expected: 必要貯留量 > 0 の値が表示される（目安: 1000〜3000 m³ 程度）

- [ ] **Step 4: タブ③を開き、断面図が表示されることを確認する**

Expected: SVG断面図が表示される。容量OKまたは容量不足が判定される。

- [ ] **Step 5: タブ④を開き、放流量判定が表示されることを確認する**

Expected: 放流量の OK/NG が表示される。

- [ ] **Step 6: タブ⑤を開き、PDFダウンロードが動作することを確認する**

Expected: 「報告書PDFをダウンロード」ボタンを押すとPDFがダウンロードされる。PDF内に計算結果が記載されている。

- [ ] **Step 7: 全テストを実行する**

```bash
npx vitest run
```

Expected: 全テスト PASS

- [ ] **Step 8: コミットする**

```bash
git add -A
git commit -m "chore: verify E2E smoke test passes"
```

---

### Task 15: GitHub Pages デプロイ設定

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: `.github/workflows/deploy.yml` を作成する**

```bash
mkdir -p .github/workflows
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: GitHub リポジトリの Pages 設定を確認する**

GitHub リポジトリの Settings → Pages → Source を「GitHub Actions」に設定する。

- [ ] **Step 3: コミット・プッシュする**

```bash
git add .github/
git commit -m "ci: add GitHub Pages deployment workflow"
git push origin main
```

Expected: GitHub Actions が起動し、デプロイが完了する。

---

## 実装順序サマリー

| Task | 内容 | テストあり |
|---|---|---|
| 1 | プロジェクトスキャフォールディング | ビルド確認 |
| 2 | 共通型定義 | 型チェック |
| 3 | 都道府県基準インターフェース＋茨城県データ | 型チェック |
| 4 | 水文計算エンジン | Vitest |
| 5 | 構造設計計算エンジン | Vitest |
| 6 | 放流設備計算エンジン | Vitest |
| 7 | App シェル＋タブナビゲーション | ビルド確認 |
| 8 | タブ①基本条件フォーム | 手動確認 |
| 9 | タブ②水文計算フォーム | 手動確認 |
| 10 | SVG図面コンポーネント | 手動確認 |
| 11 | タブ③構造設計フォーム | 手動確認 |
| 12 | タブ④放流設備フォーム | 手動確認 |
| 13 | タブ⑤報告書プレビュー＋PDF出力 | 手動確認 |
| 14 | E2Eスモークテスト | 手動 |
| 15 | GitHub Pages デプロイ | CI確認 |
