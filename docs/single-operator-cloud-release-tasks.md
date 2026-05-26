# Single Operator Cloud Release Tasks

## Goal

編集者は当面1人に限定し、下書きはローカル、クライアントに渡す公開物はクラウド上の固定Release URLにする。

完成判定は次の1本の導線が通ること。

```txt
Studioで編集
  -> 下書き保存
  -> Cloud Release公開
  -> project.json + assets が公開ストレージに保存される
  -> QRがRelease固定URLを開く
  -> Viewerが公開project.jsonだけで開始画面/ガイド/ARを表示する
```

## Non Goals

今は以下を作らない。

- 複数ユーザー編集
- クライアント編集画面
- ワークスペース/組織管理
- 課金
- 本格的なDB設計
- 公開SaaS向けの権限ロール
- 自然画像トラッキング本番化

## Phase 0: Verification Hygiene

- [x] `vitest` が `.claude/worktrees/**` を拾わないようにする。
- [x] `npm run test:run` の失敗を本体コードだけに絞れる状態にする。
- [x] `tests/start-screen-after-fix.png` など検証生成物が残らないようにする。
- [x] `npm run build` が成功する。
- [x] `npm run check:start` が成功する。

Done when:

- `npm run test:run` の対象が本体リポジトリだけになる。
- テスト失敗時に、古いworktreeや生成物が原因かどうかで迷わない。

## Phase 1: Public Contract Lock

- [x] 公開用 `project.json` の唯一の現行スキーマを決める。
- [x] `schemaVersion: 2` を公開JSONに含める。
- [x] `releaseId` を公開JSONに必ず含める。
- [x] `assets.marker`, `assets.models`, `experience.startScreen`, `experience.loadingScreen`, `experience.guideScreen`, `effects` の配置を固定する。
- [x] 旧形式はViewer入口でだけ正規化し、保存/公開側では新形式へ寄せる。
- [x] サンプル `project.json v2` を `docs/` に置く。

Done when:

- Studio、Publish API、Viewerが同じ公開スキーマ名で会話している。
- 「どのプロパティを読めば正しいか」がコードを追わなくても分かる。

## Phase 2: Draft Save Boundary

- [x] 下書き保存の責務を `localStorage + IndexedDB` に限定する。
- [x] 下書き保存データと公開Releaseデータを明確に分ける。
- [x] モデル本体はIndexedDB、軽量設定はプロジェクト一覧に保存する方針を維持する。
- [x] `saveProject()` の返り値と呼び出し側の成功判定を統一する。
- [x] loading/start/guide/marker/model設定の保存元を1つずつ決める。

Done when:

- 下書き保存が公開URLやBlobに依存しない。
- 公開処理がライブDOMや一時的なグローバル状態を読まない。

## Phase 3: Cloud Release Boundary

- [x] 公開先をまず `Vercel Blob` に固定する。
- [x] Firebaseや他providerは互換扱いに下げ、通常導線から外す。
- [x] `publishRelease()` を公開処理の唯一の入口にする。
- [x] 公開時に `project.json + assets` をRelease単位で保存する。
- [x] Releaseは上書きせず、毎回新しい `releaseId` を作る。
- [x] `localStorage` / `IndexedDB` / 開発PCの `public/projects` に依存した公開URLをクライアントに渡さない。
- [x] Vercel Blobのサーバー経由Base64アップロードのサイズ上限を明文化する。
- [x] クライアントワークで必要なGLBサイズを決め、大きい場合はdirect uploadへ切り替えるタスクを追加する。

Done when:

- クライアントに渡すURLが、開発PCやローカル保存に依存しない。
- 公開後に下書きを編集しても、既存QRの内容が壊れない。

## Phase 4: QR And Release History

- [x] QRは必ずRelease固定のViewer URLを指す。
- [x] プロジェクト一覧には最新ReleaseのURLと公開日時だけを表示する。
- [x] 必要ならRelease履歴をlocalStorageに保持する。
- [x] DBを使う場合でも、保存するのは `projectId`, `releaseId`, `projectUrl`, `viewerUrl`, `publishedAt`, `note` 程度に限定する。
- [x] AR本体、画像、GLB、音声、`project.json` をDBに入れない。

Done when:

- QR画面で「これは下書きURLか、公開Release URLか」が曖昧にならない。

## Phase 5: Viewer Single Input

- [x] Viewerは `src=<公開project.json URL>` を唯一の本番入力にする。
- [x] Viewerは公開 `project.json` と公開assetsだけで動く。
- [x] Viewerから編集/アップロード/保存機能を切り離す。
- [x] ガイド画像、開始画面、ローディング画面が公開JSON由来で表示されることを確認する。
- [x] `applyProjectDesign()` のガイド画像DOM仕様とテストを一致させる。
- [x] AR表示前に asset欠落、JSON不正、カメラ不可を読めるエラーで出す。

Done when:

- 別ブラウザ、別端末、シークレットウィンドウでも公開URLだけでViewerが開始画面まで表示できる。

## Phase 6: One Golden Flow Test

**現状 (2026-05-26 確認)**: Phase 0-5 は完了。ローカル自動スモークは概ね通る。クラウド Release 固定 URL までの E2E と実機 QA が Phase 6 の残り。

### 6.1 基準プロジェクト（何を「正」とするか）

| 用途 | パス / ID | 状態 |
|------|-----------|------|
| ローカル Viewer スモーク | `public/projects/sample-keep-me/` | [x] 資産同梱（`sample.glb` 約 3MB） |
| 公開 JSON v2 の参照 | `docs/sample-project-v2.json` | [x] `schemaVersion: 2` + `experience.*` |
| ローカル実体の v2 同期 | `public/projects/sample-keep-me/project.json` | [x] `docs/sample-project-v2.json` と同等（`releaseId: rel-sample-local`） |
| クラウド golden Release | Studio → `publishRelease()` → Blob | [ ] 1 件の `viewerUrl` / `projectUrl` を記録する（下書きは `docs/golden-release-notes.md` など任意） |

ローカル確認 URL（開発時）:

```txt
http://localhost:3000/#/viewer?src=/projects/sample-keep-me/project.json
```

`npm run check:start` は上記 `src`（`PROJECT_ID=sample-keep-me` がデフォルト）を Puppeteer で開く。

### 6.2 自動スモーク（ローカル / CI）

| チェック | コマンド / 実装 | 状態 | 備考 |
|----------|-----------------|------|------|
| ビルド | `npm run build` | [x] | Phase 0 で確認済み |
| ユニット / 統合 | `npm run test:run` | [x] | `src/utils/apply-project.spec.js` 含む（開始 / ローディング / ガイド DOM） |
| 開始画面レイアウト | `npm run check:start` | [x] | `scripts/check-start-screen.js`（開始画面のみ。スクリーンショットは `tests/start-screen-after-fix.png`） |
| 公開 JSON の fetch | 上記 `check:start` 経由 | [x] | `/projects/sample-keep-me/project.json` を読み込む |
| ガイド画面（ヘッドレス） | 未整備 | [ ] | `scripts/verify-journey.cjs` は旧 DOM（`.unified-loading-screen`）前提で現行 Viewer と不一致。更新するか `check:start` を拡張する |
| クラウド Release URL | 未整備 | [ ] | `BLOB_READ_WRITE_TOKEN` 付き環境での E2E は手動。自動化は Phase 6 完了条件の後でも可 |

リリース前の最低コマンド:

```bash
npm run build && npm run test:run && npm run check:start
```

### 6.3 クラウド Release ゴールデン導線（手動・必須）

Studio で `sample-keep-me` 相当を編集し、次を満たす 1 本を通す。

1. 下書き保存（ローカルのみ）
2. **Cloud Release 公開**（`publishRelease()` → Vercel Blob）
3. 返却された **Release 固定** `viewerUrl` を QR に載せる
4. シークレットウィンドウまたは別端末で `viewerUrl` を開く
5. 開始画面 → ガイド → カメラ許可まで進む

注意:

- `sample.glb` は約 3MB。サーバー経由公開の上限（`docs/vercel-blob-implementation.md` の `MAX_BLOB_MODEL_BYTES`）に近い。超過時は 413 または direct upload タスク（Phase 3 記載）へ。
- ローカル `public/projects/...` の URL をクライアント QR に使わない（Phase 3 完了条件）。

### 6.4 実機 QA（手動・必須）

- [ ] iPhone Safari: Release 固定 QR → 開始画面 → カメラ導線
- [ ] Android Chrome: 同上
- [ ] 実機: マーカー検出後、モデル（または将来の `effects`）が表示される

Done when:

- 1 つの案件について、Studio で編集 → Cloud Release 公開 → **第三者端末**が Release 固定 URL だけで Viewer を開始画面まで開ける。
- 上記「リリース前の最低コマンド」がローカルで緑である。

## Phase 7: Portal Marker MVP

**実装 (2026-05-26)**: Viewer / Studio / 公開 API までコード反映済み。実機 QR 確認は Phase 6 と同様に手動。

契約: `docs/product-spec.md` §7 の `effects[]`（`type: "portal"` など）。

- [x] `effects` を Viewer が読む入口を作る（`src/effects/effects-runtime.js` → `ar-viewer.js` の marker 経路）。
- [x] `portal` effect を marker モードで実装する（`src/effects/portal-effect.js`）。
- [x] 開くアニメーション、奥行き表現、任意の粒子、任意の音を最小構成で入れる（音は `assets.audio` または Web Audio フォールバック）。
- [x] Studio 側はプリセット選択のみ（マーカー型エディター `#ar-effect-preset`）。
- [x] ローカル golden: `public/projects/sample-keep-me/project.json` に `effects` を 1 件載せた。
- [ ] クラウド Release の `project.json` に `effects` を載せ、QR から実機で Portal を確認する。

実装メモ:

| 項目 | パス |
|------|------|
| ランタイム | `src/effects/effects-runtime.js` |
| Portal 演出 | `src/effects/portal-effect.js` |
| Studio プリセット | `src/effects/effect-presets.js` |
| 公開ペイロード | `storage-provider.js`, `api/publish-project.js`, `vite/plugins/projectsApi.js` |
| テスト | `src/effects/effects-runtime.spec.js` |

ローカル確認:

```txt
/#/viewer?src=/projects/sample-keep-me/project.json
```

マーカー検出 → ポータル開門（約 1.2s）→ GLB 表示。

Done when:

- QR から開いた Viewer で、マーカー検出後に Portal Marker 演出が見える（クラウド Release での実機確認が残り）。

**Phase 6 との境界**: Phase 6 は「モデルがマーカー上に出る」まで。Portal は Phase 7。

## Review Checklist

タスク完了後、チェック時に見る項目。

### Phase 0-5（完了済みの再確認）

- [x] 公開URLがローカル保存に依存していない（設計・実装）。
- [x] `project.json` と assets が同じ Release として Blob に保存される（`publishRelease` / `api/publish-project.js`）。
- [x] QR が Release 固定 URL を指す。
- [x] Viewer が公開 JSON + 公開 assets だけで開始〜ガイドまで表示（ローカル `sample-keep-me` でスモーク可）。
- [x] 下書き編集で既存 QR が壊れない（immutable `releaseId`）。
- [x] `npm run test:run` の対象が本体のみ（worktree 除外）。
- [x] 生成物がリポジトリに残りにくい（`tests/start-screen-after-fix.png` は `check:start` 実行時のみ）。

### Phase 6（未完了の確認）

- [ ] クラウド golden: 実際に Blob へ 1 回公開し、記録した `viewerUrl` が第三者端末で開ける。
- [ ] 実機（iOS / Android）で QR → 開始 → ガイド → カメラ → マーカー上にモデル表示。
- [ ] ローカル golden とクラウド golden を混同していない（QR は Blob の Release URL のみ）。

### Phase 7 着手前

- [ ] Phase 6 の Done when を満たしている。
- [ ] `effects` のスキーマが `docs/product-spec.md` と実装で一致している。

## Priority

**完了**: Phase 0 〜 Phase 5（下書き境界、Blob 公開、QR、Viewer 単一入力）。

**現在の最優先**: **Phase 6** — クラウド Release 固定 URL の golden 1 本と実機 QA。ここが通るまで Portal や大きな UI 改善は入れない。

**次**: Phase 7（Portal Marker MVP）— Phase 6 の実機確認後。

ローカル開発だけなら `public/projects/sample-keep-me` + `npm run check:start` で開始画面まで確認できるが、**クライアント納品の完了判定は Phase 6.3 / 6.4** とする。
