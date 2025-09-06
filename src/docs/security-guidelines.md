# セキュリティガイドライン - innerHTML利用制限

## 概要
本プロジェクトでは、XSS（Cross-Site Scripting）攻撃を防ぐため、innerHTML の利用を制限し、より安全な代替手段を推奨します。

## 危険度の分類

### 🚨 高危険度 - 即座に修正が必要
- **動的文字列の innerHTML への挿入**
- ユーザー入力やAPI応答を含むテキストの innerHTML 設定
- エラーメッセージの innerHTML 表示
- 例: `element.innerHTML = 'エラー: ' + errorMessage;`

### ⚠️ 中危険度 - 将来的リスク
- **テンプレートリテラルでの innerHTML**
- 変数を含むHTMLテンプレートの動的生成
- 例: `element.innerHTML = \`<div>${message}</div>\`;`

### ✅ 低危険度 - 注意して利用可能
- **静的HTML構造の初期化**
- 固定されたHTMLテンプレートの設定（変数を含まない）
- 例: `container.innerHTML = '<div class="loading">読み込み中...</div>';`

## 推奨される代替手段

### 1. テキストのみの場合
```javascript
// ❌ 危険
element.innerHTML = message;

// ✅ 安全
element.textContent = message;
```

### 2. スタイル付きテキストの場合
```javascript
// ❌ 危険
element.innerHTML = `<span class="${type}">${message}</span>`;

// ✅ 安全
element.textContent = ''; // クリア
const span = document.createElement('span');
span.className = type;
span.textContent = message;
element.appendChild(span);
```

### 3. 複数要素の場合
```javascript
// ❌ 危険
container.innerHTML = `
  <div class="header">${title}</div>
  <div class="content">${content}</div>
`;

// ✅ 安全
container.textContent = ''; // クリア
const header = document.createElement('div');
header.className = 'header';
header.textContent = title;

const content = document.createElement('div');
content.className = 'content';
content.textContent = content;

container.appendChild(header);
container.appendChild(content);
```

### 4. HTMLエスケープを使用する場合
```javascript
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// ✅ 一応安全（ただしtextContentの方が確実）
element.innerHTML = escapeHTML(userInput);
```

## 例外的に innerHTML を許可する場合

### 1. 静的テンプレートの初期化
```javascript
// ✅ 許可：完全に静的なHTML
container.innerHTML = `
  <div class="app-layout">
    <header class="app-header">
      <h1>タイトル</h1>
    </header>
    <main class="app-main">
      <!-- 静的コンテンツのみ -->
    </main>
  </div>
`;
```

### 2. 設定によるHTML生成（信頼できるソースのみ）
```javascript
// ⚠️ 注意付きで許可：設定値は信頼できるソースからのみ
function createTemplate(config) {
  // configは管理画面や設定ファイルからの信頼できるデータ
  return `<div style="color: ${config.color}; background: ${config.bg};">`;
}
```

## 修正済みファイル一覧

### ✅ 修正完了
- `src/views/ar-viewer.js:590` - updateInstruction関数
- `src/views/ar-viewer.js:577` - updateStatus関数  
- `src/views/ar-viewer.js:373` - addToDebugConsole関数
- `src/utils/publish.js:62` - エラーメッセージ表示
- `src/counter.js:5` - デモ用カウンター表示

### ⏳ 要レビュー（低優先度）
- `src/views/projects.js` - プロジェクトカード生成
- `src/views/editor.js` - エディターUI初期化
- `src/views/loading-screen-editor.js` - ファイル名表示
- `src/components/ui.js` - モーダル生成

## 開発時のチェックリスト

### コードレビュー時
- [ ] innerHTML を使用している箇所はないか？
- [ ] 動的な文字列を HTML として挿入していないか？
- [ ] ユーザー入力やAPI応答を直接DOM に挿入していないか？
- [ ] エラーメッセージや通知メッセージが安全に表示されているか？

### 新機能開発時
- [ ] テキスト表示は textContent を使用する
- [ ] HTML構造が必要な場合は createElement を使用する  
- [ ] HTMLエスケープが必要な場合は専用関数を使用する
- [ ] 外部入力を受け取る場合は特に注意深く実装する

## 今後の改善方針

1. **段階的な修正**: 高危険度から順次修正
2. **ESLintルール追加**: innerHTML使用を警告するルールを検討
3. **テンプレートエンジン導入**: 安全なHTML生成の仕組みを検討
4. **定期的な監査**: セキュリティリスクの定期チェック

## 参考資料

- [OWASP XSS Prevention Cheat Sheet](https://owasp.org/www-project-cheat-sheets/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Element.innerHTML](https://developer.mozilla.org/ja/docs/Web/API/Element/innerHTML)
- [MDN: Node.textContent](https://developer.mozilla.org/ja/docs/Web/API/Node/textContent)