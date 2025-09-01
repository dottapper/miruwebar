# miru-WebAR

あなただけの 3D 世界を現実に。エディタで制作 → 保存 → QR 配布 → 実機 AR 表示までを、ローカル開発で一気通貫に体験できます。

## ドキュメント運用（統一ルール）

- 仕様/方針の決定: `docs/adr/` に ADR を追加（テンプレ: `docs/adr/TEMPLATE.md`）
- ルート追加/変更: `docs/routes.md` を更新（ハッシュルート名と画面概要）
- UI/UX 影響: 本 README を更新し、必要であればスクリーンショットを添付
- PR 運用/承認: `CONTRIBUTING.md`（必読）と `CODEOWNERS` に従うこと

## クイックスタート

- 開発サーバー（Vite + 内蔵 API）: `npm run dev`
- 本番ビルド: `npm run build`
- ビルド検証: `npm run build:verify`
- ビルドプレビュー: `npm run preview`
- シンプル静的サーバー（ビルド → 配信）: `npm run start`

推奨の開発フローは Vite です。Vite の開発サーバーが API を提供するため、別サーバーの起動は不要です（下記参照）。

### ビルドとキャッシュ

#### 決定性のあるビルド

このプロジェクトでは、**決定性のあるビルド**を実現するため、以下の設定を採用しています：

- **ハッシュベースのファイル名**: `[hash:8]` を使用（8 文字の固定長ハッシュ）
- **Date.now()の排除**: タイムスタンプによる非決定的なファイル名を回避
- **固定チャンク分割**: Three.js、QRCode、ベンダーライブラリを固定チャンクに分離

#### キャッシュ戦略

```bash
# 開発時のキャッシュクリア
npm run dev:fresh

# ビルドキャッシュのクリア
rm -rf .vite/
rm -rf dist/

# 完全クリーンビルド
npm run build:clean

# ビルド検証（推奨）
npm run build:verify
```

#### ビルド検証

CI/CD では以下の項目を自動検証します：

- ✅ 必要なファイルの存在確認
- ✅ ファイル名パターンの妥当性（8 文字ハッシュ）
- ✅ ファイルサイズの妥当性
- ✅ アセット参照の整合性
- ✅ Date.now()の使用禁止

```bash
# ローカルでのビルド検証
npm run build:verify

# 詳細なビルドチェック
npm run build:check
```

## ログ制御

### 環境変数によるログレベル制御

本番環境でのログノイズを削減するため、環境変数によるログレベル制御を実装しています。

#### ログレベル

- `DEBUG`: デバッグ情報（開発環境のみ）
- `INFO`: 一般情報
- `WARN`: 警告
- `ERROR`: エラー

#### 使用方法

```bash
# 開発環境（デバッグログ有効）
npm run dev:debug

# 開発環境（情報ログのみ）
npm run dev:info

# 本番環境（警告・エラーのみ）
npm run dev:warn
npm run dev:error

# 本番ビルド（警告・エラーのみ）
npm run build:prod
```

#### 環境変数設定

```bash
# .env ファイル
VITE_LOG_LEVEL=INFO  # クライアント側
LOG_LEVEL=WARN       # サーバー側
```

### 統一ロガーシステム

- `src/utils/logger.js`: クライアント側統一ロガー
- `server/utils/logger.js`: サーバー側統一ロガー
- モジュール別ロガー作成機能
- 本番環境での自動ログ制御

## モジュール形式の統一

### ESM形式への移行
プロジェクト全体をESM（ECMAScript Modules）形式に統一し、CommonJSとESMの混在による実行時エラーを解決しました。

#### 修正内容
- **`server/controllers/settingsController.js`**: `require`/`module.exports` → `import`/`export`
- **`server/models/LoadingScreenSettings.js`**: `module.exports` → `export default`
- **`server/routes/api.js`**: `require`/`module.exports` → `import`/`export`
- **`server/utils/logger.js`**: `module.exports` → `export`

#### 動的インポート対応
- **`server/utils/module-loader.js`**: ESM形式での動的インポートを適切に処理
- **条件付きインポート**: 存在しないモジュールの安全な処理
- **並行インポート**: 複数モジュールの効率的な読み込み

#### 使用方法
```javascript
// 動的インポート
import { loadController, loadMiddleware } from '../utils/module-loader.js';

// コントローラーの読み込み
const controller = await loadController('settingsController');

// 条件付きインポート
const middleware = await conditionalImport('../middleware/auth.js', false);
```

#### 外部依存関係の対応
- **Sequelize**: ESM形式に対応済み
- **Express**: ESM形式に対応済み
- **Multer**: ESM形式に対応済み
- **その他**: 必要に応じて`createRequire`を使用

### 初回起動時の注意事項

**現在の既知の問題があるため、以下の手順を推奨します：**

1. **ブラウザのストレージクリア**（初回のみ）:

   ```bash
   # 開発者ツールで実行
   localStorage.clear();
   indexedDB.deleteDatabase('keyval-store');
   ```

2. **サーバー起動**:

   ```bash
   npm run dev
   ```

3. **問題が発生した場合**:
   - ブラウザキャッシュをクリア
   - 別のブラウザで試行
   - 開発者ツールでエラーを確認

**推奨ブラウザ**: Chrome/Edge（PC）、Safari（iOS）

## サーバー構成（一本化の方針）

- 開発時は Vite のプラグインが API を提供します。
  - `GET /api/network-info`: 端末 IP 検出（`vite/plugins/networkInfo.js`）
  - `GET /projects/:id/project.json`: 公開済み `project.json` 配信（`vite/plugins/projectsStatic.js`）
  - `POST /api/projects/:id/save`: `project.json` 保存（`vite/plugins/projectsApi.js`）
  - `POST /api/publish-project`: モデル(GLB)と `project.json` を `public/projects/<id>/` に保存
- `server/simple-server.js` と `server/app.js` はレガシー/検証用です。通常は使用しません。
  - どうしても単体 Node で配信したい場合のみ `npm run start` を使用（`dist/` を配信）。

注意: モバイルのカメラ権限は原則 HTTPS が必要です。Vite は `@vitejs/plugin-basic-ssl` により自己署名証明書で HTTPS を提供します。スマホ初回アクセス時は証明書の許可が必要です。

## 制作から実機表示まで（標準手順）

1. `npm run dev` を起動。端末 IP は `GET /api/network-info` で検出され、UI からも表示されます。
2. エディタでプロジェクト作成 → 保存。
3. QR 表示から「公開」すると、`/api/publish-project` で `public/projects/<id>/` に `project.json` と GLB が書き出されます。
4. スマホで QR を読み取り、`#/viewer?src=.../projects/<id>/project.json` を開くと表示できます。

ヒント（ネットワーク/HTTPS）:

- `network-info` が `localhost` の場合は「同一端末のみ」アクセス可能です。実機では PC とスマホを同一ネットワークに接続してください。
- iOS/Safari は HTTP ページでカメラが使えないため、HTTPS でアクセスしてください。

## ブランチ運用（重要）

- メインブランチ: `indexeddb-storage-refactor`（最新の機能を含む）
- 直コミット禁止。feature ブランチ → PR → 承認後にマージ。

ブランチ復旧の手順:

```bash
# 現在のブランチを確認
git branch

# 最新ブランチへ戻る
git checkout indexeddb-storage-refactor
git pull origin indexeddb-storage-refactor

# 起動
npm run dev
```

## Vite 開発サーバーの構成（要点）

- `vite.config.js`: サーバー設定とプラグイン読み込み
- `vite/plugins/networkInfo.js`: `GET /api/network-info`
- `vite/plugins/projectsStatic.js`: `GET /projects/:id/project.json`
- `vite/plugins/projectsApi.js`: `POST /api/projects/:id/save`, `POST /api/publish-project`
- `vite/utils/network.js`: ネットワーク IP 検出

## トラブルシューティング

- アプリが起動しない: `indexeddb-storage-refactor` ブランチに戻る
- 機能が動作しない: `npm install` で依存を再取得
- スタイル崩れ: ブラウザキャッシュをクリア
- 実機でカメラが起動しない: HTTPS でアクセスしているか確認（自己署名証明書の許可が必要）

詳細な貢献ルールは `CONTRIBUTING.md` を参照してください。

## データ保存仕様（ハイブリッド方式）

### 保存方式の選択

**ローカル保存（デフォルト - 高速開発）:**

- 開発中はブラウザ内に保存（オフライン対応）
- 大容量モデルも高速処理
- 公開時のみサーバーにアップロード

**サーバー保存（チーム・商用向け）:**

- 全データをサーバーで一元管理
- 端末・ブラウザに依存しない永続保存
- URL 共有でチーム連携

### プロジェクトデータ（3D モデル・AR 設定）

#### ローカル保存モード

**保存場所:**

- **開発中**: IndexedDB（ブラウザ内蔵 DB）+ localStorage（軽量設定のみ）
- **公開時**: `/public/projects/<id>/project.json` + GLB ファイル

**保存データの種類:**

1. **重量データ（IndexedDB）**: 3D モデルファイルの Base64 データ（50MB/ファイル）
2. **軽量データ（localStorage）**: プロジェクト設定、変換パラメータ、メタデータ
3. **公開データ**: QR 配布用の JSON + GLB ファイル（物理ファイル）

**データ同期:**

- IP 間同期機能により、同一ブラウザ・同一 localStorage 内で異なる IP アドレスからアクセスしても同じデータを利用可能
- ブラウザが異なる場合や端末が異なる場合はエクスポート/インポート機能を使用

#### サーバー保存モード（開発予定）

**保存場所:**

- **開発中**: サーバー（ユーザーアカウント管理）
- **公開時**: 同一サーバー内で公開設定変更

**特徴:**

- レンタルサーバー対応
- 自動バックアップ・永続保存
- プロジェクト URL 共有機能
- チーム連携・権限管理

### ローディング画面設定

**保存場所:**

- **通常**: localStorage（`loadingScreenSettings` キー）
- **IP 間同期**: localStorage（`loadingScreenSettings_cross_ip_sync` キー）
- **テンプレート履歴**: localStorage（`lastUsedTemplateId` + 同期キー）

**データ構造:**

```json
{
  "version": "1.0",
  "timestamp": 1693276800000,
  "exportedAt": "2023-08-29T12:00:00.000Z",
  "source": "miruwebAR-loading-screen-editor",
  "settings": {
    "startScreen": { "title": "...", "backgroundColor": "#..." },
    "loadingScreen": { "brandName": "...", "loadingMessage": "..." },
    "guideScreen": { "mode": "surface", "title": "..." }
  }
}
```

### エクスポート/インポート機能

**エクスポート:**

- ファイル名: `loading-screen-settings-YYYY-MM-DD.json`
- 形式: JSON（メタデータ含む）
- 内容: 全画面設定、画像データ（Base64）、バージョン情報

**インポート:**

- 対応形式: `.json` ファイルのみ
- バリデーション: 必須フィールドの存在確認
- 適用方法: デフォルト値とマージ後、localStorage 保存 → ページリロード

**使用シナリオ:**

1. **バックアップ**: 設定を JSON ファイルとして保存
2. **端末間移行**: PC → スマホ、異なるブラウザ間での設定共有
3. **チーム共有**: 設定ファイルを SSD/USB で持ち運び、出先での作業
4. **ローカル ↔ サーバー移行**: 保存方式を切り替える際のデータ移行

### データ容量制限

**ローディング画面設定:**

- 個別画像: 2MB 以内（自動圧縮）
- 全体設定: 3MB 以内
- 超過時: 画像なしで保存、段階的圧縮適用

**プロジェクトデータ:**

- **ローカル保存**: IndexedDB 使用量に依存（通常数 GB 利用可能）
- **サーバー保存**: アップロード上限 50MB/ファイル、100MB/リクエスト
- 大容量モデルは GLB 最適化推奨

### トラブルシューティング

**データが見つからない場合:**

1. IP 間同期による自動復元を確認
2. エクスポートファイルからのインポートを実行
3. ブラウザの localStorage/IndexedDB クリアを避ける

**容量エラーの場合:**

1. 画像を手動で圧縮してから再アップロード
2. 不要なプロジェクトデータを削除
3. ブラウザストレージクリーンアップの実行
