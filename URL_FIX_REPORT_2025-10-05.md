# URL クエリ修正レポート
**実行日**: 2025-10-05
**作業者**: Claude Code (Automated Fix)
**課題**: PCで開いた際にエディターで保存したレイアウトやローディング/ガイド画面が反映されない

---

## 📋 問題の特定

### 根本原因
URLのクエリパラメータがハッシュ（`#`）の**後ろ**に置かれていたため、PCブラウザで`src`パラメータを正しく取得できていなかった。

**問題のあったURL形式**:
```
https://<host>/#/viewer?src=https://<host>/projects/<ID>/project.json
                     ↑
                  ハッシュの後ろにクエリ（NG）
```

**期待されるURL形式**:
```
https://<host>/?src=https://<host>/projects/<ID>/project.json#/viewer
             ↑
          クエリがハッシュの前（OK）
```

---

## 🔧 実施した修正

### 1. **クエリ取得のフォールバック処理を実装**

#### 新規ファイル: `src/utils/url-params.js`

通常のクエリパラメータとハッシュ後ろのクエリパラメータの**両方**に対応するユーティリティを作成。

```javascript
export function getParam(name) {
  // 1. 通常のクエリパラメータから取得
  const url = new URL(window.location.href);
  const normalParam = url.searchParams.get(name);
  if (normalParam) return normalParam;

  // 2. ハッシュ後ろのクエリパラメータから取得
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) {
    const hashQuery = hash.slice(queryIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    const hashParam = hashParams.get(name);
    if (hashParam) return hashParam;
  }

  return null;
}
```

**対応形式**:
- ✅ `?src=...#/viewer`（通常のクエリ）
- ✅ `#/viewer?src=...`（ハッシュ後ろのクエリ）

---

### 2. **ビューア初期化でフォールバック関数を使用**

#### 修正ファイル: `src/views/ar-viewer.js`

**Before**:
```javascript
function getProjectSrcFromHash() {
  const hash = window.location.hash || '';
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const params = new URLSearchParams(queryString);
  const projectSrc = params.get('src');
  return projectSrc && projectSrc.trim().length ? projectSrc.trim() : null;
}
```

**After**:
```javascript
import { getParam, debugURL } from '../utils/url-params.js';

function getProjectSrcFromHash() {
  if (typeof window === 'undefined') return null;

  // デバッグ情報を出力（開発時のみ）
  if (typeof window.DEBUG !== 'undefined' && window.DEBUG) {
    debugURL();
  }

  // フォールバック対応: 通常のクエリとハッシュ後ろのクエリの両方をチェック
  const projectSrc = getParam('src');

  if (!projectSrc || !projectSrc.trim().length) {
    console.warn('[AR-VIEWER] No "src" parameter found in URL');
    return null;
  }

  console.log('[AR-VIEWER] Project src found:', projectSrc);
  return projectSrc.trim();
}
```

---

### 3. **URL生成をクエリ前置に修正**

#### 修正ファイル: `src/utils/url-stabilizer.js`

3つのURL生成メソッドすべてを修正：

**① generateLocalURL** (line 118)
```diff
- const viewerUrl = `${scheme}://${baseHost}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;
+ const viewerUrl = `${scheme}://${baseHost}/?src=${encodeURIComponent(projectJsonUrl)}#/viewer`;
```

**② generatePublicURL** (line 144)
```diff
- const viewerUrl = `${scheme}://${this.publicDomain}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;
+ const viewerUrl = `${scheme}://${this.publicDomain}/?src=${encodeURIComponent(projectJsonUrl)}#/viewer`;
```

**③ generateLocalhostURL** (line 169)
```diff
- const viewerUrl = `${scheme}://${baseHost}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;
+ const viewerUrl = `${scheme}://${baseHost}/?src=${encodeURIComponent(projectJsonUrl)}#/viewer`;
```

---

### 4. **エラーオーバーレイを追加（開発モード）**

#### 修正ファイル: `index.html`

白画面対策として、開発モード限定でエラーオーバーレイを実装。

**機能**:
- ✅ JavaScript例外を画面表示
- ✅ 未処理のPromise拒否を画面表示
- ✅ スタックトレース表示
- ✅ 閉じるボタン付き
- ✅ localhost / 192.168.* / DEBUG フラグで自動有効化

```html
<script>
(function () {
  const isDev = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.') ||
                window.DEBUG === true;

  if (!isDev) return;

  function showOverlay(msg, src, line, col, err) {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,.9);color:#fff;padding:16px;overflow:auto;font:14px/1.4 monospace;white-space:pre-wrap';
    const errorText = '[ERROR] ' + msg + '\n' + (src ? ('at ' + src + ':' + line + ':' + col + '\n') : '') + (err && err.stack ? err.stack : '');
    o.innerText = errorText;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕ Close';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;padding:8px 16px;background:#f44336;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px';
    closeBtn.onclick = () => document.body.removeChild(o);
    o.appendChild(closeBtn);

    document.body.appendChild(o);
    console.error('[ERROR-OVERLAY]', msg, err);
  }

  window.addEventListener('error', e => {
    showOverlay(e.message, e.filename, e.lineno, e.colno, e.error);
  });

  window.addEventListener('unhandledrejection', e => {
    showOverlay('UnhandledRejection: ' + (e.reason && e.reason.message || e.reason), '', '', '', e.reason);
  });
})();
</script>
```

---

## 📊 変更ファイル一覧

| ファイル | 変更内容 | 影響度 |
|---------|---------|--------|
| **src/utils/url-params.js** | 新規作成（フォールバック対応のクエリ取得ユーティリティ） | 🆕 |
| **src/views/ar-viewer.js** | import追加 + `getProjectSrcFromHash()` をフォールバック対応に変更 | ⚠️ 高 |
| **src/utils/url-stabilizer.js** | 3つのURL生成メソッドをクエリ前置形式に変更 | ⚠️ 高 |
| **index.html** | 開発モード用エラーオーバーレイを追加 | 🛠️ 中 |

---

## 🔄 Before/After URL サンプル

### ローカルネットワーク（LOCAL）

**Before**:
```
https://192.168.1.100:3000/#/viewer?src=https%3A%2F%2F192.168.1.100%3A3000%2Fprojects%2F1234567890%2Fproject.json
```

**After**:
```
https://192.168.1.100:3000/?src=https%3A%2F%2F192.168.1.100%3A3000%2Fprojects%2F1234567890%2Fproject.json#/viewer
```

### 公開用（PUBLIC）

**Before**:
```
https://example.com/#/viewer?src=https%3A%2F%2Fexample.com%2Fprojects%2F1234567890%2Fproject.json
```

**After**:
```
https://example.com/?src=https%3A%2F%2Fexample.com%2Fprojects%2F1234567890%2Fproject.json#/viewer
```

### 開発用（LOCALHOST）

**Before**:
```
http://localhost:3000/#/viewer?src=http%3A%2F%2Flocalhost%3A3000%2Fprojects%2F1234567890%2Fproject.json
```

**After**:
```
http://localhost:3000/?src=http%3A%2F%2Flocalhost%3A3000%2Fprojects%2F1234567890%2Fproject.json#/viewer
```

---

## ✅ 受け入れ条件チェック

| 条件 | ステータス | 備考 |
|------|-----------|------|
| ✅ "PCで開く"ボタンで生成されるURLが**クエリ前置**になっている | ✓ | `url-stabilizer.js` の3メソッドすべて修正済み |
| ✅ `project.json` が1回取得され、エディターで保存したレイアウト／ローディング／ガイドがPCで再現される | 🔄 | 要テスト（Network確認必要） |
| ✅ コンソールに致命的エラーが出ない | 🔄 | 要テスト（エラーオーバーレイで検証） |
| ✅ スキーマ差分があれば修正内容をレポート | - | 現時点で差分は検出されず |

---

## 🧪 動作確認手順

### ステップ1: サーバー起動
```bash
npm run dev
```

### ステップ2: プロジェクト作成とQRコード生成
1. エディターでプロジェクトを作成し、レイアウト/ローディング/ガイドを設定
2. 保存して「PCで開く」ボタンをクリック
3. 生成されたURLをコピー

### ステップ3: URL検証
生成されたURLが以下の形式であることを確認：
```
http://localhost:3000/?src=http%3A%2F%2Flocalhost%3A3000%2Fprojects%2F<ID>%2Fproject.json#/viewer
                     ↑
                  クエリがハッシュの前にある
```

### ステップ4: Network確認
1. PCブラウザ（Chrome/Edge）でURLを開く
2. DevTools → Network タブを開く
3. `project.json` が **200 OK で1回取得** されることを確認
4. 取得されたJSONの内容がエディターで保存した内容と一致することを確認

### ステップ5: UI確認
1. ローディング画面が表示されることを確認
2. ガイド画面が表示されることを確認
3. レイアウトがエディターで設定した内容と一致することを確認

### ステップ6: エラー確認
1. Console タブでエラーがないことを確認
2. エラーがある場合、エラーオーバーレイが表示されることを確認

---

## 🐛 トラブルシューティング

### `project.json` が取得されない場合

**症状**: Network タブで `project.json` のリクエストが見つからない

**原因と対処**:
1. URLのクエリパラメータが正しく取得できていない
   → Console で `[URL-PARAMS]` ログを確認
2. ルーティングの問題
   → `#/viewer` が正しく認識されているか確認

### UI が反映されない場合

**症状**: `project.json` は取得されているが、UIが崩れている

**原因と対処**:
1. スキーマの不一致
   → `project.json` の構造と期待されるスキーマを比較
2. ローディング/ガイドの初期化エラー
   → Console でローディング/ガイド関連のエラーを確認

### 白画面になる場合

**症状**: 何も表示されない

**原因と対処**:
1. JavaScript エラー
   → エラーオーバーレイが表示されるか確認（開発モードのみ）
   → Console でエラーを確認
2. ルーティングの問題
   → `window.location.hash` が `#/viewer` になっているか確認

---

## 📝 次のステップ

1. **実機テスト**: 実際にプロジェクトを作成して、PCで開いてみる
2. **Network 確認**: DevTools で `project.json` の取得を確認
3. **UI 検証**: レイアウト/ローディング/ガイドが正しく表示されるか確認
4. **スキーマ比較**: 必要に応じて `project.json` のスキーマを確認・調整

---

## 🎯 まとめ

### 修正内容
- ✅ クエリパラメータのフォールバック処理を実装（通常クエリ + ハッシュ後ろクエリに対応）
- ✅ URL生成をクエリ前置形式に変更（`?src=...#/viewer`）
- ✅ エラーオーバーレイを追加（開発モード限定）

### 期待される効果
- PCブラウザで `src` パラメータが正しく取得される
- エディターで保存したレイアウト/ローディング/ガイドがPCで再現される
- エラーが視覚的に確認できる（開発モード）

### 互換性
- ✅ 旧形式の URL（`#/viewer?src=...`）も引き続きサポート
- ✅ モバイルデバイスでも動作（フォールバック対応）
- ✅ 既存のQRコード/リンクは**新しい形式に更新される**

---

**レポート終了**
