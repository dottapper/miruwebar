# デバイスデバッグ・実機テスト手順書

**更新日**: 2025-09-23
**対象**: miru-WebAR実機テスト・デバッグ

## 🎯 概要

WebARアプリケーションを実機（iPhone Safari、Android Chrome）でテスト・デバッグするための詳細手順です。

## 🔧 事前準備

### 開発環境要件
- **PC**: macOS/Windows/Linux（Vite開発サーバー用）
- **Node.js**: v18以上
- **ブラウザ**: Chrome/Edge（デスクトップデバッグ用）
- **ネットワーク**: PC・スマホが同一Wi-Fiに接続

### 必要なツール
```bash
# 1. 基本開発環境
npm install

# 2. HTTPS公開ツール（いずれか1つ）
npm install -g ngrok              # 推奨: 簡単設定
# or
npm install -g @cloudflare/wrangler  # 代替: Cloudflare Tunnel
```

## 🌐 HTTPS環境構築（必須）

WebARはHTTPS環境でのみ動作するため、以下のいずれかの方法でHTTPS公開します。

### 方法1: ngrok（推奨）

```bash
# 1. 開発サーバー起動
npm run dev  # localhost:3000

# 2. 別ターミナルでngrok実行
ngrok http 3000

# 3. 出力されたHTTPS URLをメモ
# 例: https://abc123.ngrok-free.app -> localhost:3000
```

**メリット**:
- 簡単設定
- 有効なHTTPS証明書
- 外部からのアクセス可能

**デメリット**:
- URL変動（無料版）
- レイテンシ若干増加

### 方法2: 自己署名証明書（ローカルネットワーク内）

```bash
# 1. HTTPS開発サーバー起動
npm run server:https  # https://localhost:3000

# 2. PC側でIPアドレス確認
npm run dev  # コンソールに "Network: https://192.168.x.x:3000" 表示

# 3. モバイル端末で https://192.168.x.x:3000 にアクセス
# 4. 証明書警告を許可
```

**メリット**:
- レイテンシなし
- プライベートネットワーク内
- 高速通信

**デメリット**:
- 証明書警告の手動許可必要
- ネットワーク依存

### 方法3: Cloudflare Tunnel（永続URL）

```bash
# 1. Cloudflared インストール
brew install cloudflare/cloudflare/cloudflared

# 2. 開発サーバー起動
npm run dev

# 3. トンネル開始
cloudflared tunnel --url localhost:3000

# 4. 出力されたHTTPS URLをメモ
# 例: https://abc-123-def.trycloudflare.com
```

## 📱 実機テスト手順

### iPhone/iPad（Safari）での手順

1. **初期アクセス**
   ```
   Safari → HTTPS URL → 証明書許可（自己署名の場合）
   ```

2. **カメラ権限確認**
   ```
   設定 → Safari → Webサイトの設定 → カメラ → 許可
   ```

3. **AR開始手順**
   ```
   プロジェクト選択 → QRコード生成 → QRスキャン → AR開始
   ```

4. **マーカー印刷**
   ```bash
   # Hiroマーカーを印刷（A4サイズ推奨）
   curl -o hiro-marker.pdf https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png
   ```

### Android（Chrome）での手順

1. **初期アクセス**
   ```
   Chrome → HTTPS URL → 証明書許可（自己署名の場合）
   ```

2. **WebXR権限確認**
   ```
   設定 → サイト設定 → カメラ → 許可
   設定 → サイト設定 → センサー → 許可
   ```

3. **AR開始手順**
   ```
   プロジェクト選択 → QRコード生成 → QRスキャン → WebXR開始
   ```

## 🔍 デバッグ方法

### 1. リモートデバッグ（iOS Safari）

```bash
# 1. Mac + iPhone をUSB接続
# 2. iPhone: 設定 → Safari → 詳細 → Webインスペクタ → ON
# 3. Mac Safari: 開発 → [デバイス名] → [ページ名]
```

**できること**:
- コンソールログ確認
- ネットワークリクエスト監視
- DOM/CSS検査
- JavaScript実行

### 2. リモートデバッグ（Android Chrome）

```bash
# 1. PC + Android をUSB接続
# 2. Android: 開発者オプション → USBデバッグ → ON
# 3. PC Chrome: chrome://inspect/#devices
```

**できること**:
- コンソールログ確認
- ネットワークリクエスト監視
- Performance分析
- Memory使用量確認

### 3. オンデバイスデバッグ

```bash
# URL末尾にデバッグパラメータを追加
https://your-domain.com/#/viewer?src=project.json&debug=1
```

**利用可能なパラメータ**:
```
?debug=1          # 詳細ログ出力
?engine=marker    # AR.js強制使用
?engine=webxr     # WebXR強制使用
?cube=on          # デバッグ用キューブ表示
?mat=normal       # MeshNormalMaterial使用
```

### 4. ネットワーク診断

```bash
# 開発サーバー起動後
curl http://localhost:3000/api/network-info

# レスポンス例
{
  "ip": "192.168.1.100",
  "port": 3000,
  "protocol": "https",
  "url": "https://192.168.1.100:3000"
}
```

## 📊 ログ収集と分析

### ログ出力設定

```javascript
// ブラウザコンソールで実行
window.DEBUG = true;  // 詳細ログ有効化
localStorage.setItem('DEBUG', 'true');  // 永続化
```

### 重要なログ項目

1. **AR初期化**
   ```
   🚀 WebXRAR初期化開始
   ✅ WebXRAR初期化完了
   ❌ WebXRAR初期化失敗: [エラー詳細]
   ```

2. **権限取得**
   ```
   📹 カメラアクセス初期化開始
   ✅ ArToolkitSource 初期化成功
   ❌ カメラアクセスに失敗: NotAllowedError
   ```

3. **プロジェクト読み込み**
   ```
   📂 プロジェクト読み込み開始: /projects/xxx/project.json
   ✅ 3Dモデル読み込み完了
   ❌ 3Dモデル読み込み失敗: 404
   ```

### ログ収集手順

```bash
# 1. ブラウザコンソールを開く
# 2. 以下のコマンドで全ログを出力
console.save = function(data, filename){
    var blob = new Blob([data], {type: 'text/plain'});
    var elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}

# 3. ログ保存実行
console.save(window.logHistory.join('\n'), 'ar-debug.log');
```

## 🚨 よくある問題と対処法

### 1. カメラが起動しない

**症状**: 黒い画面、"カメラアクセスに失敗"エラー

**原因と対処**:
```bash
# HTTPアクセスの場合
→ HTTPSでアクセスし直す

# 権限拒否の場合
→ ブラウザ設定でカメラ権限を許可

# 他アプリ使用中の場合
→ カメラ使用中のアプリを終了
```

### 2. マーカーが認識されない（AR.js）

**症状**: マーカーをかざしても3Dオブジェクトが表示されない

**対処法**:
```bash
# マーカー品質チェック
1. Hiroマーカーを鮮明に印刷（コントラスト高く）
2. 照明を調整（明るすぎず暗すぎず）
3. カメラ距離を調整（20-50cm）
4. マーカー角度を垂直に保つ
```

### 3. WebXRで平面検出されない

**症状**: レチクル（照準）が表示されない

**対処法**:
```bash
# 環境調整
1. 明るい照明環境
2. テクスチャのある平面（木目、カーペット等）
3. ゆっくりとデバイスを動かす
4. 床・机など明確な水平面を見る
```

### 4. ローディングが進まない

**症状**: "読み込み中..."から進行しない

**デバッグ手順**:
```bash
# 1. ネットワーク確認
curl -I https://your-domain.com/projects/xxx/project.json

# 2. ブラウザコンソールでエラー確認
Network タブでHTTP Status確認

# 3. プロジェクトデータ整合性確認
JSON Validatorでproject.json検証
```

## 📋 テストチェックリスト

### 基本動作確認

- [ ] **HTTPS アクセス**: 証明書警告なくアクセス可能
- [ ] **プロジェクト一覧**: 作成済みプロジェクトが表示
- [ ] **QRコード生成**: QRコードが正常に表示
- [ ] **QRスキャン**: モバイルカメラでQR読み取り可能

### iPhone Safari テスト

- [ ] **カメラ起動**: Safari でカメラアクセス許可
- [ ] **マーカー検出**: Hiroマーカーで3D表示
- [ ] **オブジェクト表示**: 3Dモデルが正常にレンダリング
- [ ] **回転追従**: マーカー移動に合わせてオブジェクト追従

### Android Chrome テスト

- [ ] **WebXR セッション**: "AR を開始"ボタンで WebXR 起動
- [ ] **平面検出**: レチクル（白い輪）が床面に表示
- [ ] **タップ配置**: 画面タップで3Dオブジェクト配置
- [ ] **空間固定**: デバイス移動でもオブジェクト位置固定

### パフォーマンステスト

- [ ] **初回読み込み**: 10秒以内にAR開始
- [ ] **フレームレート**: 滑らかな3D描画（目安: 30fps以上）
- [ ] **メモリ使用量**: ブラウザクラッシュなし（5分間連続動作）
- [ ] **バッテリー消費**: 異常な発熱・消費なし

## 📞 トラブルシューティング連絡先

### 開発チーム用

```bash
# 問題報告時に必要な情報
1. デバイス情報: iPhone 14 Pro / iOS 17.1 / Safari
2. URL: https://xxx.ngrok.io/#/viewer?src=yyy
3. エラーメッセージ: "カメラアクセスに失敗しました"
4. 再現手順: QRスキャン → AR開始ボタン → エラー
5. コンソールログ: （添付）
```

### ユーザー向けサポート

```
Q: カメラが起動しません
A: 設定 → Safari → Webサイトの設定 → カメラ → 許可 を確認してください

Q: 3Dオブジェクトが表示されません
A: マーカーを明るい場所で、カメラから20-50cm離してかざしてください

Q: 動作が重いです
A: 他のアプリを終了し、ブラウザを再起動してお試しください
```

---

**次のフェーズ**: 実機テストで発見された具体的な問題点をフェーズ2で優先度付けして分析します。