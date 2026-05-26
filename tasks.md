# タスク一覧

## project.json 軽量化

公開 `project.json` に `data:image/...;base64` を埋め込まない。開始画面ロゴ・ガイド画像などは公開 API で Blob / ローカル assets URL に置き換える。

- [x] `api/publish-assets.js` 共通 helper（画面・マーカーの data URL 外部化）
- [x] `api/publish-project.js` — `experience.startScreen` / `guideScreen` / `loadingScreen` を URL 化
- [x] `vite/plugins/projectsApi.js` — ローカル公開でも同ルール
- [x] 残存 `data:image/` の警告ログ
- [x] `tests/unit/publish-assets.test.js`

**運用**: 表紙案件は再公開すると JSON が軽量化される。既存 Release URL は変更しない。

## MindAR imageTarget 追加

表紙・ポスターなど自然画像は `assets.marker.type === "imageTarget"` で MindAR エンジンを使う。

- [x] スキーマ: `assets.marker` に `type`, `engine`, `sourceImageUrl`, `targetUrl`, `physicalAspectRatio`
- [x] `src/components/ar/mindar-image-ar.js` + `AREngineAdapter` の `mindar` 分岐
- [x] `src/views/ar-viewer.js` — `imageTarget` 時は MindAR、それ以外は既存 MarkerAR
- [x] 公開 API — `.mind`（`marker.targetMind`）とソース画像の Blob 保存
- [x] エディタ — 非正方形画像は `imageTarget` を自動推定（`.mind` は `localStorage.markerTargetMind`）
- [ ] Studio UI で `.mind` アップロード（手動登録は localStorage / 公開 payload 経由）
- [ ] ブラウザ内 MindAR compiler（Phase 3B）

**imageTarget を使う手順（現状）**:

1. [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/quick-start/compile/) で `.mind` を生成
2. 開発者ツール等で `localStorage.setItem('markerTargetMind', '<base64>')` を設定（今後 UI 化）
3. 縦長表紙画像をマーカーに設定して再公開
4. 公開 JSON の `assets.marker.type` が `imageTarget` であることを確認
