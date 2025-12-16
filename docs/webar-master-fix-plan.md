# WEBAR Master Fix Plan (Consolidated)

- 対象 URL: https://localhost:3000/?src=/projects/sample-keep-me/project.json#/viewer
- 目的: 統合 UI 停止、ビューア UI 一本化、単一フェッチ、デザイン 100%適用、ガイド →AR 遷移安定化

## 受け入れ条件（Done）

- Network: project.json 1 回、409KB 内蔵サンプル 0 件、start-bg.jpg/loading.png/marker.png 200OK
- Console: [APPLY] Design applied on boot 1 回、[FETCH] DUPLICATE detected 0 件、window.\_\_fetchReport() 有効
- Flow: スタート → ローディング → マーカーガイド →AR 開始、CTA 一つ、再入禁止、?src 優先

## 決定方針

- DEV_TAKEOVER_UI=false で統合 UI を停止
- DEV_APPLY_OVERRIDE=true でレイアウト抑制を無効化し、DOM へ強制適用
- DEV_STRICT_MODE=true でビルトインフォールバックを禁止
- 画面生成・表示は ar-viewer.js 側が一元管理

## 主要変更

- src/config/feature-flags.js
  - 追加: DEV_APPLY_OVERRIDE=true, DEV_TAKEOVER_UI=false
  - 更新: DEV_STRICT_MODE=true
- src/utils/apply-project-design.js
  - フラグ有効時、統合 UI 検知があってもタイトル位置/サイズ等を強制適用
- src/views/ar-viewer.js
  - \_\_takeoverStartUI 呼び出しをフラグでガード（デフォルト無効）
  - 既存の統合マークアップで start/loading/guide を生成し、一元制御

## 検証手順

1. npm run build → npm run preview -- --https
2. 開く: https://localhost:3000/?src=/projects/sample-keep-me/project.json#/viewer
3. Network: project.json が 1 回、画像が 200OK
4. Console: [APPLY] Design applied on boot 1 回、[FETCH] DUPLICATE detected 0 件
5. window.\_\_fetchReport() で Count:1 を確認
6. 画面が「スタート → ローディング → ガイド →AR」順で遷移、CTA は 1 つ

## 参考（統合元レポート要旨）

- SINGLE_LOAD_FIX: fetchOnce で重複監視/サイズ検知、再入禁止
- SRC_PARAM_FIX: getProjectSrc() に統一、?src=...#/viewer 形式
- UI_WIRING_FIX: applyProjectDesign() で start/loading/guide を DOM 直接適用
- DIAGNOSIS_GUIDE: 診断パネル・Network/Console 確認手順

