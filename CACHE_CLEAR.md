# ブラウザキャッシュクリア手順

## 変更が反映されない場合の対処法

### 1. ハードリロード
- **Chrome/Firefox**: Ctrl+Shift+R (Windows) または Cmd+Shift+R (Mac)
- **Safari**: Cmd+Option+R

### 2. 開発者ツールでキャッシュ無効化
1. F12で開発者ツールを開く
2. Networkタブ → "Disable cache"にチェック
3. ページをリロード

### 3. プライベート/シークレットモードでテスト
- 新しいシークレットウィンドウで https://localhost:3000/ にアクセス

### 4. 完全キャッシュクリア
- Chrome: Ctrl+Shift+Delete → "全期間" → "キャッシュされた画像とファイル"
- Firefox: Ctrl+Shift+Delete → "すべて" → "キャッシュ"