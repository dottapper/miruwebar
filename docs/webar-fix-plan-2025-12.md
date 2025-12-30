# WebAR 統合修正プラン（2025年12月版）

**策定日**: 2025-12-30
**ステータス**: 最新
**前提**: `webar-fix-plan.md`（2025-09-23）、`webar-master-fix-plan.md` を統合・更新

---

## 現状サマリー

### 完了済み（過去のプランから）
- ✅ P0-P1修正完了（コミット `834ca83`）
- ✅ 診断ページとスモークテストページの実装
- ✅ プロジェクト整理・不要ファイル削除
- ✅ Feature flags による UI 制御（`DEV_TAKEOVER_UI=false` 等）
- ✅ 単一フェッチ・重複検知の仕組み導入

### 残存する問題（優先度順）

| 優先度 | 問題 | 影響 |
|--------|------|------|
| **P0** | `cleanup()` メソッド未定義エラー | destroy() 呼び出しでクラッシュ |
| **P0** | `markerController` 未定義参照 | マーカー登録失敗 |
| **P1** | ar-state-machine 未使用 | 状態遷移が予測不可能 |
| **P1** | デバッグコード混在（XXXXX ログ等） | 本番ログ汚染 |
| **P1** | ar-viewer.js 肥大化（3,598行） | 保守性低下 |
| **P2** | 二重 UI 乗っ取りメカニズム | UI 重複表示リスク |
| **P2** | Fetch 重複（HEAD + GET） | パフォーマンス低下 |
| **P2** | GLTFLoader バージョン混在 | Three.js 競合リスク |

---

## Phase 1: P0 クリティカル修正

### PR-1: cleanup/destroy パイプライン修正
**ブランチ**: `fix/cleanup-destroy-pipeline`
**対象ファイル**:
- `src/components/ar/marker-ar.js`
- `src/views/ar-viewer.js`

**修正内容**:
```javascript
// marker-ar.js: cleanup() メソッドを追加、または destroy() 内で dispose() を呼び出す
destroy() {
  try {
    this.dispose(); // cleanup() → dispose() に統一
  } catch (error) {
    console.warn('MarkerAR dispose error:', error);
  }
}
```

**検証**:
- [ ] destroy() 呼び出しでエラーが出ないこと
- [ ] メモリリークがないこと（DevTools Memory タブ）

---

### PR-2: markerController 参照修正
**ブランチ**: `fix/marker-controller-reference`
**対象ファイル**: `src/views/ar-viewer.js:691, 721, 743`

**修正内容**:
- markerController の初期化確認
- または AREngineAdapter 経由でマーカー登録

**検証**:
- [ ] マーカー画像が正常に登録されること
- [ ] コンソールに undefined エラーがないこと

---

## Phase 2: P1 重要修正

### PR-3: デバッグコード除去
**ブランチ**: `chore/remove-debug-code`
**対象ファイル**: `src/views/ar-viewer.js`

**除去対象**:
```javascript
// 行 2342 付近
console.log('XXXXX このログが見えますか？ XXXXX')  // 削除

// 行 2344-2377 付近
// 緊急修正コード → 正式なロジックに統合または削除
```

**検証**:
- [ ] `XXXXX` を含むログが出力されないこと
- [ ] 機能が正常に動作すること

---

### PR-4: ar-state-machine 統合
**ブランチ**: `feat/integrate-state-machine`
**対象ファイル**:
- `src/views/ar-viewer.js`
- `src/utils/ar-state-machine.js`

**修正方針**:
```javascript
// ar-viewer.js で状態機械を使用
import { ARStateMachine } from '../utils/ar-state-machine.js';

class ARViewer {
  constructor() {
    this.stateMachine = new ARStateMachine();
    this.stateMachine.on('stateChange', this.handleStateChange.bind(this));
  }

  async onStartClick() {
    await this.stateMachine.transition('LOADING');
  }

  handleStateChange(newState, oldState) {
    // UI 更新を一元管理
  }
}
```

**状態遷移図**:
```
IDLE → LOADING → MARKER_GUIDE → AR_ACTIVE → (PAUSED) → CLEANUP
         ↓           ↓              ↓
       ERROR ←←←←←←←←←←←←←←←←←←←←←←
```

**検証**:
- [ ] 状態遷移ログが正常に出力されること
- [ ] 「スタート → ローディング → ガイド → AR」の順で遷移すること

---

### PR-5: ar-viewer.js 責任分離（リファクタリング）
**ブランチ**: `refactor/ar-viewer-split`
**新規ファイル**:
- `src/services/project-loader.js` - プロジェクト読み込み・正規化
- `src/services/marker-pipeline.js` - マーカー処理パイプライン
- `src/services/ar-session-manager.js` - ARセッション管理

**分離後の ar-viewer.js**:
```javascript
// 3,598行 → 約800行に削減
class ARViewer {
  constructor() {
    this.projectLoader = new ProjectLoader();
    this.markerPipeline = new MarkerPipeline();
    this.sessionManager = new ARSessionManager();
    this.stateMachine = new ARStateMachine();
  }

  async initialize(projectSrc) {
    const project = await this.projectLoader.load(projectSrc);
    await this.markerPipeline.prepare(project);
    await this.sessionManager.start();
  }
}
```

---

## Phase 3: P2 改善

### PR-6: UI 乗っ取りメカニズム統一
**ブランチ**: `fix/unify-ui-takeover`
**方針**: `takeover-viewer-standalone.js` を廃止、`ar-viewer.js` に一本化

---

### PR-7: Fetch 最適化
**ブランチ**: `perf/fetch-optimization`
**修正内容**:
- HEAD リクエストを廃止
- GET リクエストで存在確認と取得を同時実行
- キャッシュ活用

---

### PR-8: Three.js/GLTFLoader 統一
**ブランチ**: `fix/threejs-version-unification`
**方針**: 全ファイルで動的インポート + バージョン固定

---

## 実装優先順位

```
Week 1: PR-1, PR-2 (P0クリティカル)
Week 2: PR-3, PR-4 (デバッグ除去・状態機械)
Week 3-4: PR-5 (リファクタリング)
Week 5+: PR-6, PR-7, PR-8 (改善)
```

---

## 検証環境

### 必須テスト端末
- iPhone Safari（最新iOS）
- Android Chrome（最新）
- PC Chrome（開発用）

### テストURL
```
https://localhost:3000/?src=/projects/sample-keep-me/project.json#/viewer
```

### 成功基準
- [ ] Network: project.json 1回のみ
- [ ] Console: エラー0件、`[FETCH] DUPLICATE` 0件
- [ ] Flow: スタート → ローディング → ガイド → AR
- [ ] destroy() 呼び出しでエラーなし

---

## 緊急時対応

### ロールバック手順
```bash
# 直前のコミットに戻す
git revert HEAD
npm run build && npm run preview
```

### Feature Flag による無効化
```javascript
// src/config/feature-flags.js
export const FEATURE_NEW_STATE_MACHINE = false;  // 新機能を無効化
```

---

## 参考リンク

- 旧プラン: [webar-fix-plan.md](./webar-fix-plan.md)
- マスタープラン: [webar-master-fix-plan.md](./webar-master-fix-plan.md)
