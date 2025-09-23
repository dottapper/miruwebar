# WebAR システム資産調査結果

**調査日時**: 2025-09-23
**調査者**: Claude Code
**調査範囲**: miru-WebARプロジェクトのWebAR機能全体

## 📋 エグゼクティブサマリー

miru-WebARは3D/ARエディタとビューアを統合したWebアプリケーションです。エディタで3Dプロジェクトを作成し、QRコードを生成してモバイル端末でAR体験を可能にします。

### 主要な技術構成
- **フロントエンド**: Vite + Three.js 0.165 + ESM
- **AR技術**: WebXR（Android Chrome）+ AR.js（iPhone Safari）の二本立て
- **ストレージ**: IndexedDB（ローカル開発）+ 物理ファイル（公開時）
- **QRコード**: プロジェクトへの直接リンク生成

### 重要な課題
- WebXRとAR.jsの複雑な分岐制御
- ローディング状態の管理不備
- HTTPS/権限取得の前提条件
- エラーハンドリングとフォールバック不足

## 🏗️ アーキテクチャ構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    miru-WebAR システム                      │
├─────────────────────────────────────────────────────────────┤
│ エディタ側（開発・制作）                                     │
│ ┌─────────────┐  保存   ┌─────────────┐  公開   ┌─────────┐ │
│ │ 3Dエディタ   │ ────→ │ IndexedDB   │ ────→ │ QRコード │ │
│ │ (Three.js)  │        │ + localStorage│        │ 生成     │ │
│ └─────────────┘        └─────────────┘        └─────────┘ │
│                              │                            │
│                              ▼                            │
│                        ┌─────────────┐                    │
│                        │ 公開API     │                    │
│                        │ /projects/  │                    │
│                        └─────────────┘                    │
├─────────────────────────────────────────────────────────────┤
│ ビューア側（実機AR表示）                                    │
│ ┌─────────────┐  ?src=  ┌──────────────┐  選択   ┌────────┐ │
│ │ QRスキャン   │ ────→ │ ARアダプター  │ ────→ │ AR表示  │ │
│ │ (Mobile)    │        │ (自動選択)   │        │        │ │
│ └─────────────┘        └──────────────┘        └────────┘ │
│                              │                            │
│                        ┌─────┴─────┐                      │
│                        │           │                      │
│                   ┌────▼────┐ ┌───▼───┐                   │
│                   │ WebXR   │ │ AR.js │                   │
│                   │(Android)│ │(iPhone)│                   │
│                   └─────────┘ └───────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 主要コンポーネント詳細

### 1. 保存層（Data Storage）

**場所**: `src/storage/`, `vite/plugins/`

**責任**: プロジェクトデータの永続化と配信

**構成**:
```
IndexedDB (開発時)
├── 3Dモデル (Base64, ~50MB/file)
├── プロジェクト設定 (JSON)
└── アセット参照

↓ 公開時

Physical Files (/public/projects/<id>/)
├── project.json (メタデータ + 設定)
├── model.glb (3Dモデルバイナリ)
└── assets/ (テクスチャ等)
```

**API エンドポイント**:
- `POST /api/projects/:id/save` - プロジェクト保存
- `POST /api/publish-project` - 公開用ファイル生成
- `GET /projects/:id/project.json` - 公開プロジェクト取得

### 2. QRコード生成（QR Generation）

**場所**: `src/api/qr-code.js`, `src/views/qr-code.js`

**責任**: AR表示用URLの生成とQRエンコード

**エンコード内容**:
```
https://<hostname>/#/viewer?src=<project_url>
```

**主要なURLパターン**:
- ローカルテスト: `#/viewer?src=/projects/<id>/project.json`
- 公開URL: `#/viewer?src=<full_url>/projects/<id>/project.json`

### 3. ARビューア（AR Viewer）

**場所**: `src/views/ar-viewer.js`

**責任**: QRコードからプロジェクトを読み込みAR表示を管理

**状態遷移**:
```
URLパース → プロジェクト取得 → AR初期化 →
ローディング → ガイド表示 → AR開始 → 3D配置
```

### 4. ARエンジンアダプター（AR Engine Adapter）

**場所**: `src/utils/ar-engine-adapter.js`

**責任**: 端末差異を吸収し最適なARエンジンを自動選択

**選択ロジック**:
```javascript
// 端末・ブラウザ判定
if (Android && Chrome && WebXR対応) → WebXR
if (iOS && Safari) → AR.js マーカー
else → AR.js フォールバック
```

### 5. WebXR ARエンジン（WebXR Engine）

**場所**: `src/components/ar/webxr-ar.js`

**責任**: マーカーレスARの実装（空間認識+タップ配置）

**主要機能**:
- Hit Test APIによる平面検出
- レチクル（照準）表示
- タッチイベントでオブジェクト配置
- アンカーによる空間固定

**対応端末**:
- Android Chrome (主力)
- Desktop Chrome/Edge (開発・テスト)

### 6. AR.js マーカーエンジン（Marker Engine）

**場所**: `src/components/ar/marker-ar.js`

**責任**: マーカーベースARの実装（iPhone Safari対応）

**主要機能**:
- ARToolkitによるマーカー検出
- Hiroパターン認識
- マーカー上の3D配置
- カメラ背景合成

**対応端末**:
- iPhone/iPad Safari (主力)
- 他ブラウザ (フォールバック)

### 7. ローディング画面システム

**場所**: `src/utils/unified-loading-screen.js`, `src/components/loading-screen/`

**責任**: AR初期化の進捗とガイダンス表示

**画面構成**:
1. **スタート画面**: ユーザー操作起点の開始ボタン
2. **ローディング画面**: 初期化進捗バー
3. **ガイド画面**: マーカー/平面検出の説明

## 🔗 依存関係とファイル関係

### 外部ライブラリ
```json
{
  "three": "0.165.0",     // 3D描画エンジン（統一バージョン）
  "qrcode": "^1.5.4",     // QRコード生成
  "idb-keyval": "^6.2.2", // IndexedDB簡易アクセス
  "vite": "^6.2.0"        // 開発サーバー
}
```

### AR.js (外部CDN)
- **Primary**: `https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar-threex.js`
- **Fallback**: `/arjs/ar-threex.js` (ローカル)

### 設定ファイル
- **package.json**: ESMモード (`"type": "module"`)
- **vite.config.js**: プラグイン管理とHTTPS設定
- **CLAUDE.md**: プロジェクト固有の開発ルール

### ディレクトリ構造
```
src/
├── views/
│   ├── ar-viewer.js          # メインビューア
│   └── qr-code.js           # QRコード生成画面
├── components/
│   └── ar/
│       ├── webxr-ar.js      # WebXRエンジン
│       └── marker-ar.js     # AR.jsエンジン
├── utils/
│   ├── ar-engine-adapter.js # エンジン選択
│   └── unified-loading-screen.js # ローディング管理
├── api/
│   └── qr-code.js          # QR生成API
└── storage/
    └── project-store.js    # データ永続化
```

## 🌐 ルーティング/ホスティング

### URLルーティング（HashRouter）
```
/#/projects     - プロジェクト一覧
/#/editor?id=X  - エディタ（プロジェクトID指定）
/#/qr-code?id=X - QRコード生成
/#/viewer?src=Y - ARビューア（プロジェクトURL指定）
```

### HTTPS設定
- **開発時**: Vite + `@vitejs/plugin-basic-ssl` (自己署名証明書)
- **本番時**: 外部リバースプロキシまたはCDN推奨

### Service Worker
- **現状**: 未実装
- **推奨**: キャッシュ戦略によるオフライン対応

## ⚠️ 既知の技術的課題

### 1. ブラウザ互換性
- **WebXR**: Android Chrome限定、iOS Safari未対応
- **AR.js**: 古いライブラリ、メンテナンス問題
- **カメラ権限**: HTTPS必須、ユーザー操作起点必須

### 2. エラーハンドリング
- **初期化失敗**: ARエンジンの初期化タイムアウト処理不備
- **ネットワークエラー**: CDN障害時のフォールバック不完全
- **権限拒否**: カメラ/センサー権限拒否時のUX課題

### 3. パフォーマンス
- **初回読み込み**: AR.js CDN取得によるレイテンシ
- **メモリ使用量**: 大容量GLBファイルによるブラウザ負荷
- **バッテリー消費**: 連続AR動作による端末負荷

### 4. 状態管理
- **ローディング**: 複雑な非同期初期化の状態追跡困難
- **エラー復旧**: 中途失敗からの再開ロジック不備
- **デバッグ**: 実機での問題診断ツール不足

## 📊 テスト環境とデバッグ

### 対応ブラウザ行列
| デバイス | ブラウザ | AR技術 | 対応状況 | 課題 |
|---------|---------|--------|----------|------|
| iPhone/iPad | Safari | AR.js | ✅ 対応 | マーカー品質依存 |
| Android | Chrome | WebXR | ✅ 対応 | 端末性能依存 |
| Desktop | Chrome/Edge | WebXR | ✅ 開発用 | デバッグ専用 |
| その他 | Firefox等 | AR.js | ⚠️ 限定的 | 動作保証なし |

### デバッグ機能
- **コンソールログ**: `window.DEBUG = true` で詳細ログ
- **URLパラメータ**: `?engine=marker`, `?cube=on` でテスト
- **ネットワーク診断**: `/api/network-info` で接続確認

### 実機テスト方法
1. **ngrok**: 開発サーバーをHTTPS公開
2. **Cloudflare Tunnel**: 永続的なHTTPS URL
3. **自己署名証明書**: ローカルネットワーク内テスト

## 🔧 保守性と拡張性

### アーキテクチャの利点
- **モジュラー設計**: ARエンジンの分離によるメンテナンス性
- **統一インターフェース**: `AREngineInterface`による抽象化
- **段階的フォールバック**: WebXR → AR.js → 簡易ビュー

### 改善が必要な点
- **状態機械**: ローディング/エラー状態の明確な定義
- **設定管理**: 環境別のパラメータ外部化
- **テストカバレッジ**: 自動テストの整備
- **ドキュメント**: API仕様とトラブルシューティング

## 📋 今後の開発方針

### 短期（1-2週間）
1. 安定性向上: エラーハンドリング強化
2. デバッグ改善: 実機診断ツール整備
3. ドキュメント整備: トラブルシューティング拡充

### 中期（1-3ヶ月）
1. 代替AR技術: WebXR Polyfill等の調査
2. パフォーマンス最適化: アセット圧縮とローディング
3. ユーザビリティ: エラー時の誘導改善

### 長期（3ヶ月以上）
1. クロスプラットフォーム: 統一AR技術への移行
2. オフライン対応: Service Worker導入
3. 商用化: 認証・課金システム統合

---

**次のステップ**: フェーズ1（再現性確立）に進み、実機での具体的な問題点を特定します。