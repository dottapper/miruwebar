# テスト環境

このディレクトリには、ミルウェブARプロジェクトの自動テストが含まれています。

## テスト構成

### 1. ユニットテスト
- `storage/indexeddb-storage.test.js` - IndexedDBストレージ機能のテスト
- `api/projects.test.js` - プロジェクトAPI機能のテスト

### 2. 統合テスト
- `integration/storage-integration.test.js` - ストレージ機能の統合テスト

### 3. テスト環境設定
- `setup.js` - テスト環境のセットアップとモック設定

## 実行方法

### 基本的なテスト実行
```bash
# 全テストを実行
npm test

# テストを一度だけ実行（CI用）
npm run test:run

# カバレッジ付きでテスト実行
npm run test:coverage

# UIモードでテスト実行（開発用）
npm run test:ui
```

### 特定のテストファイルを実行
```bash
# 特定のテストファイルのみ実行
npm test tests/storage/indexeddb-storage.test.js

# 特定のテストスイートのみ実行
npm test -- --grep "IndexedDB Storage"
```

## テストカバレッジ

テストカバレッジレポートは以下の場所に生成されます：
- HTML: `coverage/index.html`
- JSON: `coverage/coverage.json`
- LCOV: `coverage/lcov.info`

## ログ機能

テストでは `src/utils/logger.js` の `testLogger` を使用して、テスト中の操作を記録します：

```javascript
import { testLogger } from '../../src/utils/logger.js';

// テスト中のログを確認
const logs = testLogger.getLogs();
const errors = testLogger.getErrors();
const successLogs = testLogger.getLogs('SUCCESS');
```

## モック機能

### ブラウザAPIのモック
- `localStorage` / `sessionStorage`
- `indexedDB`
- `FileReader`
- `Blob` / `File`
- `fetch`
- `URL.createObjectURL`

### 外部ライブラリのモック
- `idb-keyval`
- `qrcode`
- `three`

## CI/CD

GitHub Actionsで以下のテストが自動実行されます：

1. **ユニットテスト** - Node.js 18.x, 20.xで実行
2. **カバレッジテスト** - コードカバレッジの測定
3. **UIテスト** - ブラウザ環境でのテスト
4. **リントチェック** - コード品質の確認
5. **セキュリティ監査** - 脆弱性のチェック

## テストの追加

新しいテストを追加する際は、以下のガイドラインに従ってください：

### 1. ファイル命名規則
- ユニットテスト: `[機能名].test.js`
- 統合テスト: `[機能名]-integration.test.js`

### 2. テスト構造
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testLogger } from '../../src/utils/logger.js';
import { resetMocks } from '../setup.js';

describe('機能名', () => {
  beforeEach(() => {
    resetMocks();
    testLogger.clearLogs();
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // テスト実装
  });
});
```

### 3. エラーハンドリングのテスト
```javascript
it('should handle errors gracefully', async () => {
  // エラーを発生させる
  mockFunction.mockRejectedValue(new Error('Test error'));
  
  // エラーが適切に処理されることを確認
  await expect(functionUnderTest()).rejects.toThrow('適切なエラーメッセージ');
});
```

## トラブルシューティング

### テストが失敗する場合

1. **モックのリセット**
   ```javascript
   beforeEach(() => {
     resetMocks();
     testLogger.clearLogs();
     vi.clearAllMocks();
   });
   ```

2. **非同期処理の待機**
   ```javascript
   await expect(asyncFunction()).resolves.toBe(expectedValue);
   ```

3. **ログの確認**
   ```javascript
   const logs = testLogger.getLogs();
   console.log('Test logs:', logs);
   ```

### カバレッジが低い場合

1. 未テストの関数を特定
2. エッジケースのテストを追加
3. エラーハンドリングのテストを追加

## パフォーマンス

- テスト実行時間: 通常30秒以内
- メモリ使用量: 100MB以下
- 並列実行: 可能（Vitestの並列実行機能を使用）

## 品質基準

- **カバレッジ**: 80%以上を目標
- **実行時間**: 30秒以内
- **エラー率**: 0%（テスト自体のエラー）
- **保守性**: テストコードも本番コードと同様の品質を維持
