# miru-WebAR

あなただけの 3D 世界を現実に。エディタで制作 → 保存 → QR 配布 → 実機 AR 表示までを、ブラウザだけで一気通貫に体験できます。

## プロダクト方針

miru-WebAR は、当面 **制作側が使うAR制作・管理アプリ** として開発します。

- **Miru Studio**: 制作者/運用者がプロジェクトを作成・管理・公開する画面
- **Miru Viewer**: QRから開く、クライアント/来場者向けの閲覧専用ARビューア

第三者がWeb上で自由にARを作るSaaSではなく、まずは「制作者が品質管理し、クライアントには安定したAR体験を見せる」構成に絞ります。
詳細は [プロダクト仕様](docs/product-spec.md) を参照してください。

**特徴:**
- ログイン不要（オプションでパスワード認証可能）
- PC専用エディタ
- ブラウザだけで編集・共有
- サーバーにデータを保持しない（BYOホスティング）

---

## クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（Vite + 内蔵API）
npm run dev

# 本番ビルド
npm run build

# ビルドプレビュー
npm run preview
```

### 主なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run dev:fresh` | キャッシュクリアして起動 |
| `npm run build` | 本番ビルド |
| `npm run build:verify` | ビルド検証 |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run start` | ビルド＋静的サーバー起動 |
| `npm run test` | テスト実行 |

---

## 制作から実機表示までの流れ

1. **サーバー起動**: `npm run dev` を実行
2. **プロジェクト作成**: エディタで GLB ファイルをアップロード、AR 設定を編集
3. **保存**: プロジェクトはブラウザ内（IndexedDB）に保存
4. **公開**: QR 表示画面から「公開」で `public/projects/<id>/` に書き出し
5. **AR 表示**: スマホで QR を読み取り、AR ビューアで 3D モデルを表示

---

## AR機能

### 対応AR技術

| デバイス | ブラウザ | AR技術 | 方式 |
|---------|---------|--------|------|
| iPhone/iPad | Safari | マーカーAR | マーカー画像を基準に表示 |
| Android | Chrome | WebXR | 空間認識＋平面検出 |
| PC | Chrome/Edge | WebXR | 開発・テスト用 |

デバイスとブラウザに応じて最適なAR技術が自動選択されます。

### マーカーAR（iPhone/iPad）
1. カメラを起動
2. マーカーをカメラでスキャン
3. マーカー上に3Dオブジェクトが表示

現在のマーカー方式は AR.js のパターンマーカーです。アップロード画像は中央の正方形領域をもとに `.patt` 化されるため、長方形の本の表紙やポスター全体をそのまま追跡する方式ではありません。表紙・ポスター対応は将来の自然画像トラッキングとして扱います。詳細は [マーカーポリシー](docs/MARKER_POLICY.md) を参照してください。

### WebXR（Android/PC）
1. 空間をスキャンして平面を検出
2. 画面をタップして3Dオブジェクトを配置

---

## 認証システム

### パスワード認証（オプション）

環境変数で認証を有効化できます：

```bash
# .env
AUTH_ENABLED=true
AUTH_PASSWORD=your-password
```

- 認証が無効（デフォルト）: 誰でもアクセス可能
- 認証が有効: パスワード入力が必要

### Vercel デプロイ時

Vercel の環境変数に `AUTH_ENABLED` と `AUTH_PASSWORD` を設定してください。

---

## データ保存

### ローカル保存（デフォルト）

- **編集中**: IndexedDB（ブラウザ内）
- **開発時公開**: `public/projects/<id>/` に物理ファイル出力
- **本番公開**: 永続的な object storage / CDN（Vercel Blob, Cloudflare R2, S3等）を使用する方針

### 公開方法

エクスポート ZIP を生成して、静的ホスティングサービスにアップロード：
- Vercel / Cloudflare Pages / Netlify（ドラッグ＆ドロップ）
- GitHub Pages
- S3 + CloudFront

本番運用では、公開済みARは `project.json` と assets を immutable release として保存します。QRコードは編集途中の下書きではなく、特定の公開リリースURLを参照します。

公開後の URL 例：
```
https://your-domain.com/viewer.html?src=https://your-domain.com/projects/xxx/project.json
```

---

## 開発環境

### サーバー構成

- **開発時**: Vite のプラグインが API を提供
  - `GET /api/network-info`: 端末 IP 検出
  - `POST /api/projects/:id/save`: プロジェクト保存
  - `POST /api/publish-project`: 公開用ファイル出力

### HTTPS について

モバイルのカメラ権限は HTTPS が必要です。Vite は自己署名証明書で HTTPS を提供します。

**実機テストの方法:**

```bash
# 方法1: ngrok（推奨）
npm run dev
ngrok http 3000  # 別ターミナル

# 方法2: Cloudflare Tunnel
npm run dev
cloudflared tunnel --url localhost:3000
```

---

## プロジェクト構成

```
src/
├── views/          # ページコンポーネント
│   ├── editor.js   # エディタ画面
│   ├── ar-viewer.js # AR ビューア
│   ├── projects.js # プロジェクト一覧
│   └── login.js    # ログイン画面
├── components/     # 再利用可能なコンポーネント
├── utils/          # ユーティリティ関数
├── storage/        # データ永続化
├── api/            # API 通信
├── firebase/       # Firebase 連携
└── styles/         # CSS

api/                # Vercel API Routes
vite/               # Vite プラグイン
docs/               # ドキュメント
```

---

## ブランチ運用

- **メインブランチ**: `main`
- **開発ブランチ**: `develop`
- 直コミット禁止。feature ブランチ → PR → 承認後にマージ

詳細は `CONTRIBUTING.md` を参照してください。

---

## トラブルシューティング

### アプリが起動しない
```bash
npm install
npm run dev:fresh
```

### スタイルが崩れる
ブラウザキャッシュをクリア（Cmd+Shift+R / Ctrl+Shift+R）

### カメラが起動しない
- HTTPS でアクセスしているか確認
- 自己署名証明書の許可が必要

### ARが動作しない
1. HTTPS 接続を確認
2. ブラウザ対応を確認（Chrome/Safari 推奨）
3. コンソールログでエラーを確認

### マーカーが認識されない
- マーカーの印刷品質を確認
- 照明環境を改善
- カメラとマーカーの距離を調整（20-50cm）

---

## ドキュメント

- [ルート定義](docs/routes.md)
- [プロダクト仕様](docs/product-spec.md)
- [Vercel デプロイ](docs/vercel-deployment.md)
- [Firebase Storage 設定](docs/firebase-storage-rules.md)
- [CORS 設定](docs/firebase-cors-setup.md)
- [マーカーポリシー](docs/MARKER_POLICY.md)

---

## 技術スタック

- **フロントエンド**: Vanilla JS + Three.js
- **AR**: AR.js（マーカーAR）/ WebXR API（マーカーレスAR）
- **ビルド**: Vite
- **ストレージ**: IndexedDB / Firebase Storage（オプション）
- **デプロイ**: Vercel / 静的ホスティング

---

## ライセンス

このプロジェクトはプライベートです。
