# ねだんメモ（レシート価格調査アプリ）

レシートを撮ると店舗名・日付・品目・価格を読み取り、商品ごと・お店ごとに価格を記録して比べられる iPhone / Android アプリです。Expo（React Native + TypeScript）製。

## 主な機能

- レシートの OCR（ML Kit 日本語モデル、端末内で処理）と品目の自動仕分け
- 商品のバーコード（JAN）読み取り → Yahoo!ショッピング API / Open Food Facts で商品名・画像を取得
- 「この店のこの略称 = この商品」を覚えて次回から自動で紐づけ
- 商品詳細でお店ごとの最安値・最新価格を比較、店頭調査の手入力
- 現在地から近い順のお店一覧、お店ごとの「最安の商品数」
- パステルカラーの UI（ミント = 最安、ピーチ = 高い）

## 開発

```bash
npm install
npm test            # レシート解析・JAN・OCR行まとめのテスト
npm run typecheck
npx expo start      # Expo Go / Web で画面確認（OCR は手入力で代用）
```

レシートの OCR は Expo Go では動かないため、実機では開発用ビルドを使います。

```bash
npx eas-cli@latest build --profile development --platform ios   # または android
```

## 構成

| 場所 | 内容 |
| --- | --- |
| `src/app/` | 画面（Expo Router） |
| `src/db/` | SQLite のテーブル定義とクエリ |
| `src/lib/receiptParser.ts` | OCR テキスト → 店舗名・日付・品目・合計 |
| `src/lib/ocr.ts`, `ocrRows.ts` | ML Kit 呼び出しと行の再構成 |
| `src/lib/janLookup.ts` | JAN から商品名・画像を検索 |
| `src/theme/colors.ts` | パステルカラーのテーマ |
