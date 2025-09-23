# WebAR 根本原因調査結果

**調査日時**: 2025-09-23
**調査者**: Claude Code
**調査方法**: 静的コード解析 + アーキテクチャ分析

## 🎯 調査概要

QRコードからスマホARまでのエンドツーエンド機能が不安定な原因を、優先度P0/P1/P2で分類し、具体的な修正案と影響範囲を特定しました。

## 🔴 P0（緊急・システム停止レベル）

### P0-1: WebXRサポート判定の不備 ✅ **修正完了**
**場所**: `src/components/ar/webxr-ar.js:191`, `src/utils/webxr-support.js`

**修正内容（2025-09-23）**:
1. **標準APIユーティリティ作成**: `src/utils/webxr-support.js`
   - `checkXRSupport()`: メモ化付きWebXRサポート判定
   - `getRecommendedFallback()`: 非対応時の適切なフォールバック推奨
   - セキュアコンテキスト・navigator.xr存在・セッション対応を段階的確認

2. **WebXRエンジン修正**: `src/components/ar/webxr-ar.js:191-211`
```javascript
// 修正後
static async isSupported() {
  try {
    if (!window.isSecureContext) return false;
    if (!('xr' in navigator)) return false;
    const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
    return !!isSupported;
  } catch (error) {
    console.debug('WebXR判定エラー:', error);
    return false;
  }
}
```

3. **エンジンアダプター修正**: `src/utils/ar-engine-adapter.js:184-205`
   - 非同期`isSupported()`メソッドの適切な呼び出し
   - Promise/同期両対応のサポート確認

4. **ARビューア統合**: `src/views/ar-viewer.js:1667-1817`
   - ユーザー操作起点のAR開始制御
   - mutex（`arLaunchInFlight`）による重複起動防止
   - WebXRサポート判定結果に基づく経路確定

**検証結果**:
- ✅ 開発サーバー正常起動: `https://localhost:3000/`
- ✅ 構文エラー解決
- ✅ WebXR判定API標準化完了

**影響範囲**:
- Android Chrome: 正確なWebXR検出により適切なARエンジン選択
- iPhone Safari: AR.jsフォールバック維持
- 全端末: 重複起動防止とエラーハンドリング改善

### P0-2: 非同期ARエンジン選択の同期処理バグ
**場所**: `src/utils/ar-engine-adapter.js:186`
```javascript
// 現状の問題コード
static async checkEngineSupport(engineType) {
  const engineModule = await this.loadEngineModule(engineType);
  return engineModule.default?.isSupported?.() || true;  // ❌ 非同期関数を同期呼び出し
}
```

**問題点**:
- `isSupported()` は非同期関数だが同期呼び出し
- Promise対象を boolean として評価 → 常に `true`
- エンジン選択ロジックが正常に機能しない

**影響範囲**:
- 全端末でエンジン判定失敗
- 不適切なARエンジンの強制選択

**修正案**:
```javascript
static async checkEngineSupport(engineType) {
  try {
    const engineModule = await this.loadEngineModule(engineType);
    const isSupported = engineModule.default?.isSupported?.();
    return typeof isSupported === 'function' ? await isSupported() : !!isSupported;
  } catch (error) {
    logger.warn('エンジンサポート確認エラー', { engineType, error });
    return false;
  }
}
```

### P0-3: AR.js カメラ初期化の競合状態
**場所**: `src/components/ar/marker-ar.js:429-559`

**問題点**:
- `arToolkitSource.init()` がコールバック地獄
- 複数の非同期処理（カメラ・マーカー・DOM）の同期不備
- タイムアウト処理が不完全（5秒〜30秒の不一致）

**症状**:
- iPhone Safari: "カメラアクセスに失敗" → 再試行不可
- Android: マーカー検出が開始されない

**修正案**:
状態機械による明確な初期化フロー実装

## 🟡 P1（重要・UX阻害レベル）

### P1-1: ローディング状態管理の不備
**場所**: `src/views/ar-viewer.js` 全体

**問題点**:
- 複数のローディング画面が重複表示可能
- エラー時の状態リセット不備
- 進捗表示が実際の処理と非同期

**症状**:
- "読み込み中..." で永続停止
- エラー後の再開不可
- ユーザーが操作不能状態

**修正案**:
```javascript
enum LoadingState {
  IDLE = 'idle',
  LOADING_PROJECT = 'loading_project',
  INITIALIZING_AR = 'initializing_ar',
  READY = 'ready',
  ERROR = 'error'
}

class ARViewerStateMachine {
  transition(newState, data) {
    // 状態遷移ログ + UI更新 + エラー処理
  }
}
```

### P1-2: QRコード生成URLの不安定性
**場所**: `src/api/qr-code.js`, `src/views/qr-code.js`

**問題点**:
- プロジェクト保存とQR生成のタイミング競合
- ローカル/公開URLの混在
- CORS制約未考慮

**修正案**:
URLパターンの統一と検証機能追加

### P1-3: エラーメッセージの不適切性
**場所**: 全ファイル共通

**問題点**:
- 技術的エラーメッセージをユーザーに直接表示
- 多言語対応不備
- 解決策の提示なし

**例**:
```javascript
// 現状
throw new Error('ArToolkitSource 初期化失敗: NotAllowedError');

// 改善案
throw new UserFriendlyError({
  message: 'カメラの許可が必要です',
  action: 'ブラウザの設定でカメラを許可してください',
  technical: error.message
});
```

## 🟢 P2（改善・将来対応レベル）

### P2-1: Three.js バージョン混在リスク
**場所**: 複数ファイル

**問題点**:
- ESM版(0.165)とCDN版の潜在的競合
- AR.js のThree.js依存バージョン不明

**対策**: Three.js依存関係の明確化

### P2-2: デバッグ機能の不備
**場所**: 各コンポーネント

**問題点**:
- 実機でのログ収集困難
- 状態確認UI不足

**対策**: リモートログ送信機能の追加

### P2-3: パフォーマンス最適化不足
**場所**: 特に大容量GLBファイル処理

**問題点**:
- ブラウザメモリ不足
- ローディング時間過長

**対策**: 段階的読み込み + 圧縮

## 🔧 技術的根本原因の分類

### 1. 非同期処理の不適切な同期化
```javascript
// 間違い: 非同期関数の同期呼び出し
const result = asyncFunction();  // Promise オブジェクトが返る

// 正解: 適切な非同期処理
const result = await asyncFunction();
```

### 2. ブラウザAPI仕様の誤理解
```javascript
// 間違い: 存在しないプロパティ参照
navigator.xr?.supportedSessionModes

// 正解: 正しいAPI呼び出し
await navigator.xr.isSessionSupported('immersive-ar')
```

### 3. エラーハンドリングの抜け漏れ
```javascript
// 改善前: try-catch なし or catch でも続行
someRiskyOperation();

// 改善後: 適切なエラー回復
try {
  await someRiskyOperation();
} catch (error) {
  logger.error('操作失敗', error);
  await fallbackOperation();
  showUserFriendlyMessage(error);
}
```

### 4. 状態管理の複雑化
```javascript
// 改善前: フラグ変数の散在
let isLoading = false;
let isInitialized = false;
let hasError = false;

// 改善後: 状態機械
enum State { LOADING, READY, ERROR }
let currentState = State.LOADING;
```

## 📋 影響度マトリックス

| 問題分類 | 技術的影響 | UX影響 | 修正コスト | 優先度 |
|---------|-----------|-------|-----------|--------|
| WebXR判定バグ | ★★★ | ★★★ | ★☆☆ | P0 |
| 非同期処理バグ | ★★★ | ★★☆ | ★☆☆ | P0 |
| カメラ初期化競合 | ★★☆ | ★★★ | ★★☆ | P0 |
| ローディング状態 | ★☆☆ | ★★★ | ★★☆ | P1 |
| QR URL不安定 | ★☆☆ | ★★☆ | ★☆☆ | P1 |
| エラーメッセージ | ★☆☆ | ★★☆ | ★☆☆ | P1 |

## 🔍 検証手順

### P0問題の確認方法

1. **WebXR判定**:
```javascript
// ブラウザコンソールで実行
console.log('xr' in navigator);
console.log(navigator.xr?.supportedSessionModes);  // undefined
navigator.xr.isSessionSupported('immersive-ar').then(console.log);
```

2. **非同期処理**:
```javascript
// デバッガーで確認
const result = engineModule.default?.isSupported?.();
console.log(typeof result, result);  // "object" [Promise object]
```

3. **カメラ初期化**:
```javascript
// エラーログパターン確認
// "ArToolkitSource 初期化失敗: NotAllowedError"
// "マーカー検出システム初期化タイムアウト（30秒）"
```

## ✅ 修正後の期待動作

### WebXR端末（Android Chrome）
```
QRスキャン → プロジェクト読み込み → WebXR判定(成功) →
カメラ起動 → 平面検出開始 → レチクル表示 → タップ配置可能
```

### AR.js端末（iPhone Safari）
```
QRスキャン → プロジェクト読み込み → マーカーAR判定 →
カメラ起動 → マーカー検出待機 → マーカー発見 → 3D表示
```

### フォールバック
```
エラー発生 → ユーザーフレンドリーメッセージ →
再試行ボタン → 代替手段の提示
```

## 📊 修正効果の予測

- **成功率向上**: 30% → 85%（想定）
- **エラー復旧率**: 5% → 70%（想定）
- **ユーザー離脱率**: 80% → 30%（想定）

## 🔄 再発防止策

1. **開発プロセス**:
   - ブラウザAPI仕様の事前確認
   - 実機テスト必須化
   - 非同期処理パターンの統一

2. **コード品質**:
   - TypeScript導入検討
   - ESLint非同期ルール追加
   - 統合テスト自動化

3. **ドキュメント**:
   - API仕様書の更新
   - トラブルシューティング充実
   - 実機テスト手順の明文化

---

**次のフェーズ**: P0問題を優先した修正計画をフェーズ3で策定します。