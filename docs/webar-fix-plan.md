# WebAR 修正計画（小粒PR戦略）

**策定日時**: 2025-09-23
**対象**: P0緊急問題 → P1重要問題の段階的修正
**方針**: ロールバック容易な小粒PR + 段階的デプロイ

## 🎯 修正戦略

### 基本方針
1. **P0緊急問題優先**: システム停止レベルを即座に修正
2. **小粒PR**: 1機能1PR、独立性確保
3. **後方互換**: 既存機能への影響最小化
4. **段階的検証**: 実機テスト → ステージング → 本番

### リスク軽減策
- 各PRに機能フラグ導入
- ロールバック手順事前準備
- 実機テスト必須化

## 🔴 Phase 1: P0緊急修正（1週間）

### PR-1: WebXR判定API修正 ⚡
**ブランチ**: `fix/webxr-support-detection`
**所要時間**: 2-3時間
**影響範囲**: Android Chrome のWebXR検出

#### 修正対象ファイル
- `src/components/ar/webxr-ar.js:190-192`
- `src/utils/ar-engine-adapter.js:162-176`

#### 修正内容
```javascript
// src/components/ar/webxr-ar.js
static async isSupported() {
  try {
    if (!navigator.xr) return false;
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch (error) {
    console.debug('WebXR判定エラー:', error);
    return false;
  }
}

// src/utils/ar-engine-adapter.js
static async checkWebXRSupport() {
  try {
    if (!navigator.xr) {
      logger.debug('navigator.xr が存在しません');
      return false;
    }

    const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
    logger.debug('WebXRサポート確認完了', { isSupported });

    return isSupported;
  } catch (error) {
    logger.debug('WebXRサポート確認エラー', error);
    return false;
  }
}
```

#### テスト手順
1. Android Chrome: WebXR対応端末で正常検出
2. iPhone Safari: WebXR非対応でAR.jsフォールバック
3. Desktop: 開発環境でのWebXR検出

#### 成功指標
- Android Chrome: WebXRエンジン選択率 0% → 80%+
- 全体的なAR初期化成功率向上

---

### PR-2: 非同期エンジン選択修正 ⚡
**ブランチ**: `fix/async-engine-selection`
**所要時間**: 1-2時間
**影響範囲**: ARエンジン自動選択ロジック

#### 修正対象ファイル
- `src/utils/ar-engine-adapter.js:184-192`

#### 修正内容
```javascript
static async checkEngineSupport(engineType) {
  try {
    const engineModule = await this.loadEngineModule(engineType);
    const supportMethod = engineModule.default?.isSupported;

    if (!supportMethod) {
      logger.warn('isSupported メソッドが存在しません', { engineType });
      return true; // フォールバック: 利用可能とみなす
    }

    // 同期・非同期両対応
    const result = supportMethod();
    const isSupported = result instanceof Promise ? await result : result;

    logger.debug('エンジンサポート確認完了', { engineType, isSupported });
    return !!isSupported;

  } catch (error) {
    logger.warn('エンジンサポート確認エラー', { engineType, error: error.message });
    return false;
  }
}
```

#### テスト手順
1. 各エンジンの `isSupported()` 呼び出し確認
2. 非同期/同期メソッド両方の対応確認
3. エンジン選択ログの正常性確認

---

### PR-3: AR.js初期化フロー安定化 🔧
**ブランチ**: `fix/arjs-initialization-flow`
**所要時間**: 1日
**影響範囲**: iPhone Safari のカメラ初期化

#### 修正対象ファイル
- `src/components/ar/marker-ar.js:429-714`

#### 修正内容：状態機械導入
```javascript
class MarkerARStateMachine {
  constructor(markerAR) {
    this.markerAR = markerAR;
    this.state = 'IDLE';
    this.timeouts = new Map();
  }

  async transition(newState, data = {}) {
    const oldState = this.state;
    logger.debug(`AR状態遷移: ${oldState} → ${newState}`, data);

    // 前状態のクリーンアップ
    this.cleanup(oldState);

    this.state = newState;

    // 新状態の初期化
    try {
      await this.enter(newState, data);
    } catch (error) {
      logger.error(`状態遷移エラー: ${newState}`, error);
      await this.transition('ERROR', { error, fromState: oldState });
    }
  }

  async enter(state, data) {
    switch (state) {
      case 'CAMERA_INITIALIZING':
        return this.initializeCamera();
      case 'CONTEXT_INITIALIZING':
        return this.initializeContext();
      case 'READY':
        return this.startMarkerDetection();
      case 'ERROR':
        return this.handleError(data.error);
    }
  }

  cleanup(state) {
    // タイムアウトクリア
    const timeout = this.timeouts.get(state);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(state);
    }
  }
}
```

#### テスト手順
1. iPhone Safari: カメラ権限許可 → 正常初期化
2. カメラ権限拒否 → エラーハンドリング → 再試行
3. ネットワーク断 → タイムアウト → 適切なエラー表示

---

## 🟡 Phase 2: P1重要修正（2週間）

### PR-4: ローディング状態管理統一 📊
**ブランチ**: `feat/unified-loading-state`
**所要時間**: 2-3日
**影響範囲**: 全ARビューア画面

#### 修正対象ファイル
- `src/views/ar-viewer.js` (全体リファクタリング)
- `src/utils/unified-loading-screen.js`

#### 新機能：LoadingStateManager
```javascript
class LoadingStateManager {
  constructor() {
    this.state = 'IDLE';
    this.progress = 0;
    this.message = '';
    this.error = null;
    this.callbacks = new Map();
  }

  setState(newState, options = {}) {
    const oldState = this.state;
    this.state = newState;
    this.progress = options.progress || 0;
    this.message = options.message || '';
    this.error = options.error || null;

    // UI更新
    this.updateUI();

    // コールバック実行
    this.callbacks.get(newState)?.forEach(cb => cb(options));

    logger.debug('ローディング状態変更', {
      from: oldState,
      to: newState,
      progress: this.progress
    });
  }

  on(state, callback) {
    if (!this.callbacks.has(state)) {
      this.callbacks.set(state, []);
    }
    this.callbacks.get(state).push(callback);
  }
}
```

---

### PR-5: QRコード生成URL安定化 🔗
**ブランチ**: `fix/qr-url-stability`
**所要時間**: 1日
**影響範囲**: QRコード生成とプロジェクト公開

#### 修正対象ファイル
- `src/api/qr-code.js`
- `src/views/qr-code.js`

#### 修正内容
```javascript
class ProjectURLManager {
  static async generateStableURL(projectId, options = {}) {
    // 1. プロジェクト保存完了確認
    await this.waitForProjectSave(projectId);

    // 2. URL可用性確認
    const baseUrl = options.baseUrl || window.location.origin;
    const projectUrl = `${baseUrl}/projects/${projectId}/project.json`;

    await this.validateURL(projectUrl);

    // 3. QRコード用URL生成
    const viewerUrl = `${baseUrl}/#/viewer?src=${encodeURIComponent(projectUrl)}`;

    return {
      projectUrl,
      viewerUrl,
      qrData: viewerUrl
    };
  }

  static async validateURL(url) {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`プロジェクトURL不正: ${response.status}`);
    }
  }
}
```

---

### PR-6: ユーザーフレンドリーエラー 💬
**ブランチ**: `feat/user-friendly-errors`
**所要時間**: 1-2日
**影響範囲**: 全エラーメッセージ

#### 新機能：ErrorMessageManager
```javascript
class UserFriendlyError extends Error {
  constructor({ message, action, technical, code }) {
    super(message);
    this.userMessage = message;
    this.userAction = action;
    this.technicalDetails = technical;
    this.errorCode = code;
    this.name = 'UserFriendlyError';
  }
}

const ERROR_MESSAGES = {
  CAMERA_PERMISSION_DENIED: {
    message: 'カメラの使用許可が必要です',
    action: 'ブラウザの設定でカメラアクセスを許可してください',
    retry: true
  },
  WEBXR_NOT_SUPPORTED: {
    message: 'お使いのブラウザはARに対応していません',
    action: 'Chrome for Android をご利用ください',
    retry: false
  },
  NETWORK_ERROR: {
    message: 'ネットワーク接続を確認してください',
    action: 'インターネット接続を確認して再試行してください',
    retry: true
  }
};
```

---

## 🟢 Phase 3: P2改善（1か月）

### PR-7: デバッグ機能強化 🔍
**ブランチ**: `feat/enhanced-debugging`

#### 新機能
- リモートログ収集
- 実機状態監視
- パフォーマンス分析

### PR-8: Three.js依存関係統一 📦
**ブランチ**: `fix/threejs-dependency-unification`

#### 対応内容
- バージョン固定化
- AR.js互換性確認
- ビルド最適化

---

## 📋 PR作成・マージ手順

### 1. PR作成前チェックリスト
- [ ] 実機テスト完了（iPhone Safari + Android Chrome）
- [ ] エラーケーステスト完了
- [ ] 後方互換性確認
- [ ] ドキュメント更新

### 2. PR作成テンプレート
```markdown
## 修正内容
- P0/P1/P2: [問題の説明]
- 修正方法: [技術的な説明]

## テスト結果
### iPhone Safari
- [ ] カメラ起動
- [ ] マーカー検出
- [ ] 3D表示

### Android Chrome
- [ ] WebXR起動
- [ ] 平面検出
- [ ] タップ配置

### エラー処理
- [ ] 権限拒否ハンドリング
- [ ] ネットワークエラー回復
- [ ] タイムアウト処理

## 影響範囲
- [変更されるファイル一覧]
- [API変更の有無]
- [設定変更の有無]

## リスク評価
- リスクレベル: 低/中/高
- ロールバック手順: [手順説明]
- フォールバック: [代替手段]
```

### 3. マージ基準
- [ ] 全テストケース通過
- [ ] コードレビュー承認（2名以上）
- [ ] ステージング環境での動作確認
- [ ] パフォーマンスチェック
- [ ] セキュリティチェック

### 4. デプロイ手順
```bash
# 1. ステージング環境でのテスト
npm run deploy:staging
npm run test:e2e:staging

# 2. 段階的本番デプロイ
npm run deploy:prod:canary  # 10%のトラフィック
npm run deploy:prod:50      # 50%のトラフィック
npm run deploy:prod:full    # 100%のトラフィック
```

## 📊 成功指標（KPI）

### Phase 1完了後（P0修正）
- **AR初期化成功率**: 30% → 70%
- **WebXR検出率（Android）**: 0% → 80%
- **クリティカルエラー**: 80%減少

### Phase 2完了後（P1修正）
- **ユーザー体験完了率**: 40% → 80%
- **エラーからの復旧率**: 5% → 60%
- **サポート問い合わせ**: 70%減少

### Phase 3完了後（P2改善）
- **パフォーマンス**: 初回起動時間30%短縮
- **安定性**: クラッシュ率90%減少
- **開発効率**: デバッグ時間50%短縮

## 🚨 緊急時対応手順

### エスカレーション基準
1. **即座にロールバック**: 全ユーザーのAR機能停止
2. **一時的無効化**: 特定ブラウザでのみ問題発生
3. **ホットフィックス**: データ消失やセキュリティ問題

### ロールバック手順
```bash
# 1. 前回安定版へ即座復帰
git revert <commit-hash>
npm run deploy:prod:immediate

# 2. 機能フラグによる無効化
FEATURE_WEBXR_ENABLED=false npm run deploy:prod

# 3. 問題分析・修正・再デプロイ
npm run debug:analyze
npm run fix:hotfix
npm run deploy:prod:verified
```

## 📞 実装支援

### チーム体制
- **リードエンジニア**: P0修正の技術責任
- **フロントエンド**: UI/UX改善担当
- **QA**: 実機テスト専任
- **DevOps**: デプロイ・監視担当

### 開発支援ツール
- **リモートデバッグ**: Browserstack等
- **実機テスト**: 複数デバイス準備
- **監視**: Sentry等のエラー追跡
- **分析**: Google Analytics カスタムイベント

---

**実装準備完了**: P0問題から段階的に修正を開始し、WebARシステムの安定化を図ります。