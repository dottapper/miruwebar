// src/architecture/abstraction-layers.js
// 抽象化レイヤーの統一システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from '../utils/unified-logger.js';
import { designPhilosophyManager, ABSTRACTION_LEVELS } from './design-philosophy.js';

/**
 * レイヤー間の通信プロトコル
 */
export const LAYER_PROTOCOLS = {
  EVENT_BUS: 'event-bus',           // イベントバス
  DEPENDENCY_INJECTION: 'di',       // 依存性注入
  INTERFACE_CONTRACT: 'interface',  // インターフェース契約
  MESSAGE_PASSING: 'message'        // メッセージパッシング
};

/**
 * レイヤー責任の定義
 */
export const LAYER_RESPONSIBILITIES = {
  [ABSTRACTION_LEVELS.SYSTEM]: {
    name: 'システムレイヤー',
    description: 'システム全体の統合・調整・監視',
    responsibilities: [
      'アプリケーション全体の初期化',
      'レイヤー間の通信調整',
      'グローバル状態の管理',
      'エラーハンドリングの統合',
      'パフォーマンス監視'
    ],
    interfaces: [
      'SystemInitializer',
      'LayerCoordinator',
      'GlobalStateManager',
      'ErrorAggregator',
      'PerformanceMonitor'
    ],
    dependencies: [],
    dependents: [ABSTRACTION_LEVELS.APPLICATION]
  },
  
  [ABSTRACTION_LEVELS.APPLICATION]: {
    name: 'アプリケーションレイヤー',
    description: 'アプリケーション機能の実装・制御',
    responsibilities: [
      'ビジネスロジックの実装',
      'ユーザーフローの制御',
      '画面遷移の管理',
      'データフローの調整',
      '機能間の連携'
    ],
    interfaces: [
      'ApplicationController',
      'BusinessLogicService',
      'UserFlowManager',
      'ScreenNavigator',
      'DataFlowCoordinator'
    ],
    dependencies: [ABSTRACTION_LEVELS.SYSTEM],
    dependents: [ABSTRACTION_LEVELS.SERVICE, ABSTRACTION_LEVELS.COMPONENT]
  },
  
  [ABSTRACTION_LEVELS.SERVICE]: {
    name: 'サービスレイヤー',
    description: 'ビジネスロジック・データ管理・外部連携',
    responsibilities: [
      'データの永続化',
      '外部APIとの通信',
      'ビジネスルールの実装',
      'データ変換・検証',
      'キャッシュ管理'
    ],
    interfaces: [
      'DataService',
      'ApiService',
      'BusinessRuleService',
      'DataTransformer',
      'CacheManager'
    ],
    dependencies: [ABSTRACTION_LEVELS.APPLICATION],
    dependents: [ABSTRACTION_LEVELS.COMPONENT]
  },
  
  [ABSTRACTION_LEVELS.COMPONENT]: {
    name: 'コンポーネントレイヤー',
    description: 'UIコンポーネント・画面管理・ユーザーインタラクション',
    responsibilities: [
      'UIコンポーネントの実装',
      '画面の表示・非表示制御',
      'ユーザーインタラクションの処理',
      '状態の表示・更新',
      'イベントの管理'
    ],
    interfaces: [
      'UIComponent',
      'ScreenManager',
      'InteractionHandler',
      'StateRenderer',
      'EventManager'
    ],
    dependencies: [ABSTRACTION_LEVELS.APPLICATION, ABSTRACTION_LEVELS.SERVICE],
    dependents: [ABSTRACTION_LEVELS.DOM]
  },
  
  [ABSTRACTION_LEVELS.DOM]: {
    name: 'DOMレイヤー',
    description: 'DOM操作・イベント処理・ブラウザAPI連携',
    responsibilities: [
      'DOM要素の操作',
      'イベントリスナーの管理',
      'ブラウザAPIの利用',
      'スタイルの適用',
      'アニメーションの制御'
    ],
    interfaces: [
      'DOMOperator',
      'EventListenerManager',
      'BrowserApiAdapter',
      'StyleManager',
      'AnimationController'
    ],
    dependencies: [ABSTRACTION_LEVELS.COMPONENT],
    dependents: []
  }
};

/**
 * 抽象化レイヤー管理クラス
 */
class AbstractionLayerManager {
  constructor() {
    this.layers = new Map();
    this.interfaces = new Map();
    this.dependencies = new Map();
    this.violations = [];
    this.setupDefaultLayers();
  }

  /**
   * デフォルトレイヤーを設定
   */
  setupDefaultLayers() {
    Object.entries(LAYER_RESPONSIBILITIES).forEach(([level, config]) => {
      this.registerLayer(level, config);
    });
  }

  /**
   * レイヤーを登録
   * @param {string} level - レイヤーレベル
   * @param {Object} config - 設定
   */
  registerLayer(level, config) {
    this.layers.set(level, {
      ...config,
      level,
      registeredAt: Date.now(),
      violations: []
    });
    
    // インターフェースを登録
    config.interfaces.forEach(interfaceName => {
      this.registerInterface(interfaceName, level);
    });
    
    logger.debug(`レイヤーを登録しました: ${level}`, { config });
  }

  /**
   * インターフェースを登録
   * @param {string} interfaceName - インターフェース名
   * @param {string} layer - 所属レイヤー
   */
  registerInterface(interfaceName, layer) {
    this.interfaces.set(interfaceName, {
      name: interfaceName,
      layer,
      registeredAt: Date.now()
    });
  }

  /**
   * 依存関係を登録
   * @param {string} fromLayer - 依存元レイヤー
   * @param {string} toLayer - 依存先レイヤー
   * @param {string} interfaceName - 使用するインターフェース
   */
  registerDependency(fromLayer, toLayer, interfaceName) {
    const dependency = {
      from: fromLayer,
      to: toLayer,
      interface: interfaceName,
      registeredAt: Date.now()
    };
    
    if (!this.dependencies.has(fromLayer)) {
      this.dependencies.set(fromLayer, []);
    }
    this.dependencies.get(fromLayer).push(dependency);
    
    // 依存関係の妥当性をチェック
    this.validateDependency(dependency);
  }

  /**
   * 依存関係の妥当性をチェック
   * @param {Object} dependency - 依存関係
   */
  validateDependency(dependency) {
    const fromLayer = this.layers.get(dependency.from);
    const toLayer = this.layers.get(dependency.to);
    
    if (!fromLayer || !toLayer) {
      this.recordViolation({
        type: 'invalid-dependency',
        message: `存在しないレイヤーへの依存関係: ${dependency.from} -> ${dependency.to}`,
        dependency
      });
      return;
    }
    
    // 許可された依存関係かチェック
    if (!toLayer.dependents.includes(dependency.from)) {
      this.recordViolation({
        type: 'unauthorized-dependency',
        message: `許可されていない依存関係: ${dependency.from} -> ${dependency.to}`,
        dependency,
        allowedDependents: toLayer.dependents
      });
    }
    
    // インターフェースの所属レイヤーをチェック
    const interfaceInfo = this.interfaces.get(dependency.interface);
    if (interfaceInfo && interfaceInfo.layer !== dependency.to) {
      this.recordViolation({
        type: 'interface-mismatch',
        message: `インターフェースの所属レイヤーが一致しません: ${dependency.interface}`,
        dependency,
        expectedLayer: dependency.to,
        actualLayer: interfaceInfo.layer
      });
    }
  }

  /**
   * 違反を記録
   * @param {Object} violation - 違反情報
   */
  recordViolation(violation) {
    this.violations.push({
      ...violation,
      recordedAt: Date.now(),
      severity: this.calculateViolationSeverity(violation)
    });
    
    logger.warn('抽象化レイヤーの違反を記録しました', violation);
  }

  /**
   * 違反の深刻度を計算
   * @param {Object} violation - 違反情報
   * @returns {string} 深刻度
   */
  calculateViolationSeverity(violation) {
    switch (violation.type) {
      case 'unauthorized-dependency':
        return 'critical';
      case 'interface-mismatch':
        return 'high';
      case 'invalid-dependency':
        return 'high';
      default:
        return 'medium';
    }
  }

  /**
   * レイヤー間の通信を実行
   * @param {string} fromLayer - 送信元レイヤー
   * @param {string} toLayer - 送信先レイヤー
   * @param {string} interfaceName - 使用するインターフェース
   * @param {any} data - 送信データ
   * @returns {Promise<any>} 応答データ
   */
  async communicate(fromLayer, toLayer, interfaceName, data) {
    // 依存関係の存在確認
    const dependency = this.findDependency(fromLayer, toLayer, interfaceName);
    if (!dependency) {
      throw new Error(`依存関係が存在しません: ${fromLayer} -> ${toLayer} (${interfaceName})`);
    }
    
    // レイヤーの存在確認
    const fromLayerInfo = this.layers.get(fromLayer);
    const toLayerInfo = this.layers.get(toLayer);
    if (!fromLayerInfo || !toLayerInfo) {
      throw new Error(`存在しないレイヤー: ${fromLayer} -> ${toLayer}`);
    }
    
    // インターフェースの存在確認
    const interfaceInfo = this.interfaces.get(interfaceName);
    if (!interfaceInfo || interfaceInfo.layer !== toLayer) {
      throw new Error(`インターフェースが存在しないか、所属レイヤーが一致しません: ${interfaceName}`);
    }
    
    logger.debug(`レイヤー間通信を実行: ${fromLayer} -> ${toLayer}`, { 
      interface: interfaceName,
      dataType: typeof data
    });
    
    // 実際の通信処理（実装は各レイヤーに委譲）
    return await this.executeCommunication(fromLayer, toLayer, interfaceName, data);
  }

  /**
   * 依存関係を検索
   * @param {string} fromLayer - 送信元レイヤー
   * @param {string} toLayer - 送信先レイヤー
   * @param {string} interfaceName - インターフェース名
   * @returns {Object|null} 依存関係
   */
  findDependency(fromLayer, toLayer, interfaceName) {
    const dependencies = this.dependencies.get(fromLayer) || [];
    return dependencies.find(dep => 
      dep.to === toLayer && dep.interface === interfaceName
    );
  }

  /**
   * 通信を実行
   * @param {string} fromLayer - 送信元レイヤー
   * @param {string} toLayer - 送信先レイヤー
   * @param {string} interfaceName - インターフェース名
   * @param {any} data - 送信データ
   * @returns {Promise<any>} 応答データ
   */
  async executeCommunication(fromLayer, toLayer, interfaceName, data) {
    // 実際の実装では、各レイヤーの実装を呼び出す
    // ここでは抽象的な実装を提供
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          from: fromLayer,
          to: toLayer,
          interface: interfaceName,
          data: data,
          timestamp: Date.now()
        });
      }, 0);
    });
  }

  /**
   * レイヤーの責任をチェック
   * @param {string} layer - レイヤー名
   * @param {string} responsibility - 責任
   * @returns {boolean} 責任を持つかどうか
   */
  hasResponsibility(layer, responsibility) {
    const layerInfo = this.layers.get(layer);
    if (!layerInfo) return false;
    
    return layerInfo.responsibilities.includes(responsibility);
  }

  /**
   * レイヤーの抽象化レベルを取得
   * @param {string} layer - レイヤー名
   * @returns {string|null} 抽象化レベル
   */
  getAbstractionLevel(layer) {
    const layerInfo = this.layers.get(layer);
    return layerInfo ? layerInfo.level : null;
  }

  /**
   * レイヤー間の距離を計算
   * @param {string} fromLayer - 送信元レイヤー
   * @param {string} toLayer - 送信先レイヤー
   * @returns {number} 距離（-1は無効）
   */
  calculateLayerDistance(fromLayer, toLayer) {
    const levels = Object.keys(ABSTRACTION_LEVELS);
    const fromIndex = levels.indexOf(fromLayer);
    const toIndex = levels.indexOf(toLayer);
    
    if (fromIndex === -1 || toIndex === -1) return -1;
    
    return Math.abs(fromIndex - toIndex);
  }

  /**
   * 抽象化の一貫性をチェック
   * @param {Array} operations - 操作リスト
   * @returns {Object} チェック結果
   */
  checkAbstractionConsistency(operations) {
    const violations = [];
    const layerOperations = new Map();
    
    // レイヤー別に操作をグループ化
    operations.forEach(op => {
      const layer = op.layer || this.detectLayerFromOperation(op);
      if (!layerOperations.has(layer)) {
        layerOperations.set(layer, []);
      }
      layerOperations.get(layer).push(op);
    });
    
    // 各レイヤー内での一貫性をチェック
    layerOperations.forEach((ops, layer) => {
      const layerInfo = this.layers.get(layer);
      if (!layerInfo) return;
      
      // レイヤーの責任範囲内かチェック
      ops.forEach(op => {
        if (!this.isOperationInLayerResponsibility(op, layerInfo)) {
          violations.push({
            type: 'responsibility-violation',
            layer,
            operation: op,
            message: `操作「${op.name}」はレイヤー「${layer}」の責任範囲外です`
          });
        }
      });
      
      // 抽象化レベルの一貫性をチェック
      const abstractionLevels = ops.map(op => this.detectAbstractionLevel(op));
      const uniqueLevels = [...new Set(abstractionLevels)];
      if (uniqueLevels.length > 1) {
        violations.push({
          type: 'abstraction-level-inconsistency',
          layer,
          levels: uniqueLevels,
          message: `レイヤー「${layer}」内で複数の抽象化レベルが混在しています`
        });
      }
    });
    
    return {
      consistent: violations.length === 0,
      violations,
      layerOperations: Object.fromEntries(layerOperations)
    };
  }

  /**
   * 操作からレイヤーを検出
   * @param {Object} operation - 操作
   * @returns {string} レイヤー名
   */
  detectLayerFromOperation(operation) {
    // DOM操作の検出
    if (operation.type === 'dom' || operation.name.includes('DOM') || operation.name.includes('querySelector')) {
      return ABSTRACTION_LEVELS.DOM;
    }
    
    // コンポーネント操作の検出
    if (operation.type === 'component' || operation.name.includes('Component') || operation.name.includes('Screen')) {
      return ABSTRACTION_LEVELS.COMPONENT;
    }
    
    // サービス操作の検出
    if (operation.type === 'service' || operation.name.includes('Service') || operation.name.includes('Data')) {
      return ABSTRACTION_LEVELS.SERVICE;
    }
    
    // アプリケーション操作の検出
    if (operation.type === 'application' || operation.name.includes('Application') || operation.name.includes('Controller')) {
      return ABSTRACTION_LEVELS.APPLICATION;
    }
    
    // システム操作の検出
    if (operation.type === 'system' || operation.name.includes('System') || operation.name.includes('Global')) {
      return ABSTRACTION_LEVELS.SYSTEM;
    }
    
    return ABSTRACTION_LEVELS.COMPONENT; // デフォルト
  }

  /**
   * 操作がレイヤーの責任範囲内かチェック
   * @param {Object} operation - 操作
   * @param {Object} layerInfo - レイヤー情報
   * @returns {boolean} 責任範囲内かどうか
   */
  isOperationInLayerResponsibility(operation, layerInfo) {
    // 責任のキーワードマッチング
    const responsibilityKeywords = layerInfo.responsibilities.map(r => 
      r.toLowerCase().split(' ').join('')
    );
    
    const operationKeywords = operation.name.toLowerCase().split(/(?=[A-Z])/).join(' ');
    
    return responsibilityKeywords.some(keyword => 
      operationKeywords.includes(keyword) || operationKeywords.includes(keyword.replace(/\s/g, ''))
    );
  }

  /**
   * 操作の抽象化レベルを検出
   * @param {Object} operation - 操作
   * @returns {string} 抽象化レベル
   */
  detectAbstractionLevel(operation) {
    if (operation.name.includes('querySelector') || operation.name.includes('addEventListener')) {
      return 'low';
    }
    if (operation.name.includes('render') || operation.name.includes('update')) {
      return 'medium';
    }
    if (operation.name.includes('coordinate') || operation.name.includes('manage')) {
      return 'high';
    }
    return 'medium';
  }

  /**
   * 抽象化レイヤーレポートを生成
   * @returns {Object} レポート
   */
  generateAbstractionReport() {
    return {
      timestamp: new Date().toISOString(),
      layers: Object.fromEntries(this.layers),
      interfaces: Object.fromEntries(this.interfaces),
      dependencies: Object.fromEntries(this.dependencies),
      violations: {
        total: this.violations.length,
        byType: this.groupViolationsByType(),
        bySeverity: this.groupViolationsBySeverity()
      },
      quality: {
        consistency: this.calculateConsistencyScore(),
        separation: this.calculateSeparationScore(),
        coupling: this.calculateCouplingScore()
      },
      recommendations: this.generateLayerRecommendations()
    };
  }

  /**
   * 違反をタイプ別にグループ化
   * @returns {Object} グループ化された違反
   */
  groupViolationsByType() {
    const groups = {};
    this.violations.forEach(violation => {
      groups[violation.type] = (groups[violation.type] || 0) + 1;
    });
    return groups;
  }

  /**
   * 違反を深刻度別にグループ化
   * @returns {Object} グループ化された違反
   */
  groupViolationsBySeverity() {
    const groups = { critical: 0, high: 0, medium: 0, low: 0 };
    this.violations.forEach(violation => {
      groups[violation.severity] = (groups[violation.severity] || 0) + 1;
    });
    return groups;
  }

  /**
   * 一貫性スコアを計算
   * @returns {number} 一貫性スコア（0-1）
   */
  calculateConsistencyScore() {
    if (this.violations.length === 0) return 1;
    
    const totalViolations = this.violations.length;
    const criticalViolations = this.violations.filter(v => v.severity === 'critical').length;
    const highViolations = this.violations.filter(v => v.severity === 'high').length;
    
    const penalty = (criticalViolations * 0.5 + highViolations * 0.3) / totalViolations;
    return Math.max(0, 1 - penalty);
  }

  /**
   * 分離スコアを計算
   * @returns {number} 分離スコア（0-1）
   */
  calculateSeparationScore() {
    // レイヤー間の依存関係の複雑さを計算
    const totalDependencies = Array.from(this.dependencies.values())
      .reduce((sum, deps) => sum + deps.length, 0);
    
    const maxPossibleDependencies = this.layers.size * (this.layers.size - 1);
    const dependencyRatio = totalDependencies / maxPossibleDependencies;
    
    return Math.max(0, 1 - dependencyRatio);
  }

  /**
   * 結合度スコアを計算
   * @returns {number} 結合度スコア（0-1、低いほど良い）
   */
  calculateCouplingScore() {
    // レイヤー間の平均距離を計算
    let totalDistance = 0;
    let distanceCount = 0;
    
    this.dependencies.forEach((deps, fromLayer) => {
      deps.forEach(dep => {
        const distance = this.calculateLayerDistance(fromLayer, dep.to);
        if (distance > 0) {
          totalDistance += distance;
          distanceCount++;
        }
      });
    });
    
    if (distanceCount === 0) return 0;
    
    const averageDistance = totalDistance / distanceCount;
    const maxDistance = Object.keys(ABSTRACTION_LEVELS).length - 1;
    
    return averageDistance / maxDistance;
  }

  /**
   * レイヤー推奨事項を生成
   * @returns {Array} 推奨事項
   */
  generateLayerRecommendations() {
    const recommendations = [];
    const report = this.generateAbstractionReport();
    
    if (report.quality.consistency < 0.8) {
      recommendations.push({
        type: 'consistency',
        priority: 'high',
        action: 'レイヤー間の一貫性を向上',
        current: `${(report.quality.consistency * 100).toFixed(1)}%`,
        target: '80%'
      });
    }
    
    if (report.quality.separation < 0.7) {
      recommendations.push({
        type: 'separation',
        priority: 'medium',
        action: 'レイヤー間の分離を改善',
        current: `${(report.quality.separation * 100).toFixed(1)}%`,
        target: '70%'
      });
    }
    
    if (report.quality.coupling > 0.5) {
      recommendations.push({
        type: 'coupling',
        priority: 'medium',
        action: 'レイヤー間の結合度を削減',
        current: `${(report.quality.coupling * 100).toFixed(1)}%`,
        target: '50%'
      });
    }
    
    return recommendations;
  }
}

/**
 * グローバル抽象化レイヤー管理インスタンス
 */
export const abstractionLayerManager = new AbstractionLayerManager();

export default abstractionLayerManager;
