# タスク一覧

運用の詳細チェックリストは `docs/image-target-release-size-tasks.md` を参照。

---

## 実機診断ケース（2026-05-26）

**症状**: QR 後に黒画面 → スタート（レイアウトはみ出し）→ マーカー合わせ画面 → カメラは起動するが映像が見えない／スキャンできない。

**公開ビューア**:

`https://www.miruwebar.com/#/viewer?src=https%3A%2F%2Flm9dvmyd54vtbk7m.public.blob.vercel-storage.com%2Fprojects%2F1779415497138%2Freleases%2Frel-mpm9i8mz-2g6p4c%2Fproject.json`

**公開 JSON の事実**（`rel-mpm9i8mz-2g6p4c`）:

| 項目 | 値 | 問題 |
|------|-----|------|
| `assets.marker.type` | `pattern` | 縦長表紙には不適切 |
| `assets.marker.patternUrl` | `null` | `.patt` なし |
| `assets.marker.targetUrl` | なし | `.mind` なし |
| マーカー画像 | 555×800 JPEG | 自然画像（imageTarget 向き） |
| `project.json` サイズ | 約 548KB | `startScreen.logo` が base64 埋め込み |

**原因の整理**（「縁取り」誤解の解消）:

- 画面上の枠線ではなく、**認識方式の違い**が本質。
- 縦長の表紙・ポスター全体を追うには **MindAR + `.mind`**（`imageTarget`）が必要。
- `pattern`（AR.js）は正方形パターン向け。長方形は中央正方形相当のみしか認識しない。
- 黒画面の一因は **巨大な `project.json` のダウンロード待ち**。
- 映像が見えない一因は **ガイドの静止マーカー画像がカメラの上に重なる** UI（本番未デプロイ時は未修正）。

### この案件の再公開手順（運用）

- [ ] [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/quick-start/compile/) で表紙 JPG から `.mind` を生成
- [ ] エディタで `.mind` を登録（現状: `localStorage.markerTargetMind` または公開 payload の `marker.targetMind`）
- [ ] Cloud Release で **新しい releaseId** を発行（既存 `rel-mpm9i8mz-2g6p4c` は中身を変えられない）
- [ ] 新 `project.json` を確認: `assets.marker.type === "imageTarget"`、`targetUrl` に `.mind` URL
- [ ] 新 `project.json` で `startScreen.logo` が URL 参照のみ（base64 なし、目標 150KB 未満）
- [ ] 新 QR で実機確認: ライブカメラ表示 → 実物の表紙をかざす → モデル表示

---

## project.json 軽量化

公開 `project.json` に `data:image/...;base64` を埋め込まない。開始画面ロゴ・ガイド画像などは公開 API で Blob / ローカル assets URL に置き換える。

- [x] `api/publish-assets.js` 共通 helper（画面・マーカーの data URL 外部化）
- [x] `api/publish-project.js` — `experience.startScreen` / `guideScreen` / `loadingScreen` を URL 化
- [x] `vite/plugins/projectsApi.js` — ローカル公開でも同ルール
- [x] 残存 `data:image/` の警告ログ
- [x] `tests/unit/publish-assets.test.js`
- [ ] 診断ケース `1779415497138` を再公開し、JSON が 150KB 未満になることを確認

**運用**: 表紙案件は再公開すると JSON が軽量化される。既存 Release URL は変更しない。

---

## MindAR imageTarget（表紙・ポスター）

表紙・ポスターなど自然画像は `assets.marker.type === "imageTarget"` で MindAR エンジンを使う。

### 実装済み（ローカル）

- [x] スキーマ: `assets.marker` に `type`, `engine`, `sourceImageUrl`, `targetUrl`, `physicalAspectRatio`
- [x] `src/components/ar/mindar-image-ar.js` + `AREngineAdapter` の `mindar` 分岐
- [x] `src/views/ar-viewer.js` — `imageTarget` 時は MindAR、それ以外は MarkerAR
- [x] 公開 API — `.mind`（`marker.targetMind`）とソース画像の Blob 保存
- [x] `resolveMarkerEngineType` — `targetUrl` / `imageTargetSrc` があれば `mindar` に解決
- [x] 公開 API — 非正方形（`imageWidth` / `imageHeight`）なら `imageTarget` に昇格（`publish-assets.js`）
- [x] エディタ保存 — 画像縦横比から `markerType` を再推定（`editor.js`）
- [x] マーカーアップロード — 長方形は `imageTarget` を保存、`.mind` 未登録時にアラート（`marker-upload.js`）
- [x] 公開前バリデーション — `imageTarget` なのに `.mind` 無し → Cloud Release をブロック＋画面で案内
- [x] ビューア — AR 中は静止ガイド画像を隠しライブカメラ＋枠ガイド（`ar-viewer.js`）
- [x] MindAR — video / 透明 canvas の表示補正（`mindar-image-ar.js`）
- [x] スタート画面 — `overflow: hidden` でレイアウトはみ出し抑制
- [x] `takeover-viewer-standalone.js` — 開始時に `#ar-start-btn` へ転送（`__takeoverStartUI` 時）

### 未完了

- [ ] **本番デプロイ**（`www.miruwebar.com`）— 上記ビューア・公開推定の反映
- [ ] Studio UI で `.mind` アップロード（現状は Compiler + `localStorage.markerTargetMind` 手動）
- [ ] ブラウザ内 MindAR compiler（Phase 3B、`docs/image-target-release-size-tasks.md`）
- [ ] マーカーアップロード画面の文言を imageTarget 前提に統一（「中央正方形のみ」は pattern 限定と明記）

**imageTarget を使う手順（現状）**:

1. [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/quick-start/compile/) で `.mind` を生成
2. `localStorage.setItem('markerTargetMind', '<base64>')` または今後の UI アップロード
3. 縦長表紙をマーカーに設定して Cloud Release
4. 公開 JSON で `assets.marker.type === "imageTarget"` と `targetUrl` を確認

---

## Viewer UX（QR 導線）

- [ ] 本番で黒画面時間を計測（軽量 JSON 再公開前後）
- [ ] ガイド表示中も背面カメラが見えることを iOS Safari / Android Chrome で確認
- [ ] `__takeoverStartUI` 付き URL を本番 QR に使わない（開発用。AR 未起動の原因になる）
- [ ] エラー表示: `imageTarget` なのに `targetUrl` 欠落時の日本語メッセージを実機確認

---

## テスト・回帰

- [ ] `resolveMarkerEngineType` のユニットテスト（`targetUrl` のみで `mindar`）
- [x] 公開 fixture: 555×800 + `targetMind` → `imageTarget` + Blob URL
- [ ] 既存 `pattern` 正方形マーカーの golden project が壊れていないこと
