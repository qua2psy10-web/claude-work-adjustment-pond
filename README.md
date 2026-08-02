# 調整池設計計算アプリ

雨水調整池（調整池・調節池）の設計計算を行い、FORUM8「調整池・調節池の計算」形式の
設計計算書PDFを出力する Web アプリです。React + TypeScript の SPA として動作し、
サーバー側の処理を持たずブラウザ内で全ての計算・PDF生成を完結します。

## 主な機能

- **基本条件の入力**: 案件名、都道府県、流域面積、土地利用区分、確率年、許容放流量
- **水文計算**: タルボット型降雨強度式と合理式による計画流出量・必要調節容量の算出
  （降雨継続時間を振って最大貯留量となる時間を探索）
- **構造設計**: 池形状（矩形／台形）から実容量を計算し、必要調節容量との比較判定
- **放流施設計算**: オリフィス・越流堰の放流量計算と許容放流量との比較判定
- **平面図・断面図**: 池形状の図面プレビュー
- **設計計算書PDF出力**: FORUM8形式（表紙・目次・章立て・罫線表・計算過程の逐次表示・
  ハイドログラフ／貯留量曲線グラフ・断面図・総括表）に準拠したPDFレポートをダウンロード
- **対応都道府県基準**: 茨城県、千葉県（`src/standards/` に基準データを追加することで拡張可能）

## 技術構成

- [Vite](https://vitejs.dev/) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) によるUIスタイリング
- [@react-pdf/renderer](https://react-pdf.org/) によるPDF生成（Noto Sans JPフォント同梱）
- [Vitest](https://vitest.dev/) + Testing Library によるユニットテスト
- GitHub Actions による GitHub Pages への自動デプロイ

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

## ビルド

```bash
npm run build
```

`tsc -b` で型チェック後、`vite build` で `dist/` に静的ファイルを出力します。

## テスト

```bash
npm run test
```

## Lint

```bash
npm run lint
```

## ディレクトリ構成

```
src/
  calc/            水文・構造・放流の計算ロジック（+ ユニットテスト）
  standards/       都道府県別の設計基準データ（降雨強度式係数・流出係数など）
  components/
    forms/         各入力フォーム
    drawings/      平面図・断面図の描画
    report/        PDFダウンロードUI
  pdf/             PDF報告書のレイアウト・グラフ描画（@react-pdf/renderer）
  types.ts         アプリ全体で使う型定義
```

## デプロイ

`main` ブランチへの push をトリガーに GitHub Actions（`.github/workflows/`）が
ビルドを行い、GitHub Pages へ自動反映します。
