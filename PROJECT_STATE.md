# PROJECT_STATE.md — miru-WebAR

> プロジェクトの永続メモリ。簡潔・事実ベース・最新を維持する。長いチャットログはここに貼らない。

## Product summary

- **Product name:** miru-WebAR（miruwebar）
- **One-sentence purpose:** ブラウザだけで WebAR コンテンツを編集し、QR / 静的ホスティングで実機 AR 表示まで行う PC 向けエディタ
- **Primary users:** AR コンテンツ制作者（PC 編集）、閲覧者（スマホ AR 表示）
- **Current stage:** Active development

## Technology and runtime

- **Framework / language:** Vanilla JavaScript (ES modules) + Vite 7
- **3D / AR:** Three.js 0.165, AR.js（マーカー AR）, WebXR（マーカーレス AR）
- **Package manager:** npm
- **Test command:** `npm run test:run`
- **Lint command:** なし（未導入）
- **Typecheck command:** なし（未導入）
- **Build command:** `npm run build` / `npm run build:verify`
- **Dev command:** `npm run dev`（port 3000, HTTPS, `host: true`）
- **Deployment / hosting:** Vercel（オプション）/ ユーザー自身の静的ホスティング（BYO）

## Non-negotiable product constraints

- 編集・保存はブラウザ内（IndexedDB / localStorage）。作品データをサーバーに恒久保持しない（BYO ホスティング）
- エディタは **PC 専用**。管理 UI のモバイル対応は必須としない
- 公開ビューアは `#/viewer?src=<project.json URL>` で動作する固定 URL 方式
- 共有は QR コード。Export ZIP（`project.json + assets + viewer.html`）を標準公開手段とする
- API キー（Firebase 等）は **保存しない**（入力 → 当回のみ利用）
- 公開先 CDN では CORS 許可が必要（`Access-Control-Allow-Origin: *` 推奨）
- UI 文言で「ログイン不要（オプション認証）」「PC 専用」「データ非保持」を明示する

## Architecture snapshot

- **Entry points:**
  - `src/main.js` — ハッシュルーティング、ビュー動的 import
  - `index.html` — Vite エントリ
  - `viewer.html` — Export ZIP 同梱の固定ビューア
- **Routing:** Hash-based（`#/login`, `#/editor`, `#/viewer`, 等）。一覧は `docs/routes.md`
- **Core data flow:**
  1. エディタで GLB / 設定を編集
  2. IndexedDB に保存
  3. 公開時 `public/projects/<id>/` へ書き出し、または Export ZIP 生成
  4. `#/viewer?src=` で `project.json` を fetch → AR 表示
- **State management:** IndexedDB（`src/storage/`）、localStorage（補助）、セッション内メモリ
- **Data sources:** ローカル IndexedDB、公開 JSON（`project.json`）、オプション Firebase Storage
- **Authentication / authorization:** オプション（`AUTH_ENABLED` / `AUTH_PASSWORD`）。デフォルトは無認証
- **External services:** Firebase Storage（任意）、Vercel（デプロイ）、開発用 Vite プラグイン API

### Directory map（主要）

```
src/
├── views/        # ページ（editor, ar-viewer, projects, login, qr-code, …）
├── components/   # 再利用 UI / AR 部品
├── storage/      # IndexedDB, マイグレーション
├── utils/        # URL, fetch, AR adapter, loading 等
├── firebase/     # 任意クラウド連携
├── styles/       # ページ別 CSS
└── config/       # feature flags
vite/plugins/     # dev API, auth, projects static
docs/             # ルート, デプロイ, 監査メモ
```

## Decided and locked

| Date | Decision | Why | Scope / affected files |
|------|----------|-----|------------------------|
| 2025-12 | BYO ホスティング方針 | ユーザーデータ非保持・低コスト運用 | 公開フロー全体, `src/utils/publish.js` |
| 2025-12 | 固定ビューア + `?src=` | URL/QR を固定し更新は JSON 差し替え | `#/viewer`, `viewer.html`, `ar-viewer.js` |
| 2025-12 | IndexedDB を編集時の正 | オフライン編集・サーバー非依存 | `src/storage/` |
| 2026-01 | メインブランチは `main` | README / リモートと整合 | Git 運用 |
| 2026-01 | 開発ブランチは `develop` | feature → PR → merge | Git 運用 |
| 2026-01 | AI オーケストレーション文書 | 指揮官/作業者の役割を固定 | `AGENTS.md`, 本ファイル |

## Open decisions

| Priority | Question | Options considered | Decision owner / next action |
|----------|----------|-------------------|------------------------------|
| Medium | `ar-viewer.js` 分割方針 | 機能モジュール分割 / AR engine 別ファイル | 次のリファクタ PR で段階分割 |
| Medium | Firebase を必須にするか | 現状オプション維持 / 第一級機能化 | プロダクト方針確認 |
| Low | lint / typecheck 導入 | ESLint のみ / JSDoc + TS 段階導入 | 別タスクとして検討 |

## Current work queue

- [ ] 共有 URL / `?src=` 読み込みの安定化（`url-stabilizer.js`, `ar-viewer.js`）
- [ ] AR ビューアの cleanup / destroy パイプライン修正（`docs/webar-fix-plan-2025-12.md` P0）
- [ ] `ar-viewer.js` の段階的分割（3k 行超の保守性改善）
- [ ] QR 発行 UI：Local(LAN) / Web 公開 URL タブの UX 確認
- [ ] Export ZIP エンドツーエンド動作確認（`src/utils/publish.js`）

## In progress

- **Task:** 共有ビューア URL 安定化・Firebase storage 調整
- **Owner / agent:** 未割当（ワーキングツリーに未コミット変更あり）
- **Files being touched:** `src/views/ar-viewer.js`, `src/utils/url-stabilizer.js`, `src/main.js`, `src/components/ui.js`, `src/firebase/storage.js`
- **Acceptance criteria:** `#/viewer?src=` がリロード・共有後も安定して `project.json` を取得できる
- **Status:** In progress（未コミット）

## Known risks and technical debt

| Risk / debt | Impact | Current mitigation | When to revisit |
|-------------|--------|-------------------|-----------------|
| `ar-viewer.js` 肥大化（~3k 行） | High | feature flags, 段階分割計画 | リファクタ PR 時 |
| cleanup / markerController 未定義参照 | High | `docs/webar-fix-plan-2025-12.md` に修正手順 | P0 修正 PR |
| デバッグコード・takeover UI 混在 | Medium | `DEV_TAKEOVER_UI` 等の flags | 本番向け整理 PR |
| GLTFLoader / Three.js バージョン混在 | Medium | 依存固定 `three@0.165.0` | アセット読込変更時 |
| CONTRIBUTING と README のブランチ記述不一致 | Low | CONTRIBUTING を `main` 基準に修正済み | 次回ドキュメント更新時 |
| lint / typecheck 未導入 | Low | テスト + 手動確認 | 品質基盤強化タスク |

## Recent changes

| Date | Change | Validation | Notes |
|------|--------|------------|-------|
| 2026-07 | 依存脆弱性 overrides（protobufjs, ws） | PR #8 merge | Dependabot 対応 |
| 2026-01 | Vite SSL / 設定リファクタ | `npm run build` | commit `3d31e1a` |
| 2025-12 | WebAR 統合修正プラン策定 | — | `docs/webar-fix-plan-2025-12.md` |
| 2025-12 | Export ZIP / publish ユーティリティ | 手動確認 | `src/utils/publish.js` |
| 2025-12 | `#/viewer?src=` 汎用ビューア | 実機 AR 確認 | `src/views/ar-viewer.js` |

## Handoff notes for the next agent

- 作業前に `AGENTS.md` と本ファイルを読むこと。
- コーディング詳細は `.cursor/rules/webar.mdc`、ルート一覧は `docs/routes.md`。
- 現在の作業キューと未コミット変更を確認してから着手する。
- 未承認の計画（`docs/webar-fix-plan-*.md`）を実装決定と混同しない。
- 曖昧な場合は既存挙動を維持し、指揮官に判断をエスカレーションする。
- Validation は最低限 `npm run test:run` と `npm run build:verify` を検討する。
