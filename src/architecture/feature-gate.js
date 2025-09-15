// src/architecture/feature-gate.js
// 機能追加制御システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from '../utils/unified-logger.js';
import { designPhilosophyManager, FEATURE_PRIORITY } from './design-philosophy.js';
import { abstractionLayerManager, ABSTRACTION_LEVELS } from './abstraction-layers.js';

/**
 * 機能の状態
 */
export const FEATURE_STATES = {
  PROPOSED: 'proposed',           // 提案中
  APPROVED: 'approved',           // 承認済み
  IN_DEVELOPMENT: 'in-development', // 開発中
  TESTING: 'testing',             // テスト中
  STABLE: 'stable',               // 安定
  DEPRECATED: 'deprecated',       // 非推奨
  REMOVED: 'removed'              // 削除済み
};

/**
 * 機能の影響範囲
 */
export const FEATURE_IMPACT = {
  NONE: 'none',                   // 影響なし
  MINOR: 'minor',                 // 軽微
  MODERATE: 'moderate',           // 中程度
  MAJOR: 'major',                 // 重大
  CRITICAL: 'critical'            // クリティカル
};

/**
 * 機能ゲート管理クラス
 */
class FeatureGateManager {
  constructor() {
    this.features = new Map();
    this.gates = new Map();
    this.policies = new Map();
    this.setupDefaultPolicies();
  }

  /**
   * デフォルトポリシーを設定
   */
  setupDefaultPolicies() {
    // 安定性優先ポリシー
    this.policies.set('stability-first', {
      name: '安定性優先ポリシー',
      description: '既存機能の安定化を新機能追加より優先する',
      rules: [
        {
          condition: 'critical-features-unstable',
          action: 'block',
          message: 'クリティカル機能が不安定な場合は新機能追加をブロック'
        },
        {
          condition: 'test-coverage-low',
          action: 'block',
          message: 'テストカバレッジが80%未満の場合は新機能追加をブロック'
        },
        {
          condition: 'technical-debt-high',
          action: 'warn',
          message: '技術的負債が高い場合は警告を表示'
        }
      ]
    });

    // 抽象化一貫性ポリシー
    this.policies.set('abstraction-consistency', {
      name: '抽象化一貫性ポリシー',
      description: '抽象化レベルの一貫性を保つ',
      rules: [
        {
          condition: 'mixed-abstraction-levels',
          action: 'block',
          message: '異なる抽象化レベルが混在する場合はブロック'
        },
        {
          condition: 'unauthorized-layer-dependency',
          action: 'block',
          message: '許可されていないレイヤー間依存関係がある場合はブロック'
        }
      ]
    });

    // 段階的リリースポリシー
    this.policies.set('gradual-release', {
      name: '段階的リリースポリシー',
      description: '機能を段階的にリリースする',
      rules: [
        {
          condition: 'new-feature',
          action: 'require-approval',
          message: '新機能は承認が必要'
        },
        {
          condition: 'breaking-change',
          action: 'require-migration-plan',
          message: '破壊的変更は移行計画が必要'
        }
      ]
    });
  }

  /**
   * 機能を登録
   * @param {string} name - 機能名
   * @param {Object} config - 設定
   */
  registerFeature(name, config) {
    const feature = {
      name,
      state: FEATURE_STATES.PROPOSED,
      priority: config.priority || FEATURE_PRIORITY.MEDIUM,
      impact: config.impact || FEATURE_IMPACT.MINOR,
      abstractionLevel: config.abstractionLevel || ABSTRACTION_LEVELS.COMPONENT,
      dependencies: config.dependencies || [],
      requirements: config.requirements || {},
      stabilityScore: 0,
      registeredAt: Date.now(),
      ...config
    };

    this.features.set(name, feature);
    logger.info(`機能を登録しました: ${name}`, { 
      priority: feature.priority,
      impact: feature.impact,
      abstractionLevel: feature.abstractionLevel
    });
  }

  /**
   * 機能ゲートを設定
   * @param {string} featureName - 機能名
   * @param {Object} gateConfig - ゲート設定
   */
  setFeatureGate(featureName, gateConfig) {
    const gate = {
      featureName,
      enabled: gateConfig.enabled || false,
      conditions: gateConfig.conditions || [],
      policies: gateConfig.policies || [],
      overrides: gateConfig.overrides || {},
      setAt: Date.now()
    };

    this.gates.set(featureName, gate);
    logger.debug(`機能ゲートを設定しました: ${featureName}`, { gate });
  }

  /**
   * 機能の追加可否を判定
   * @param {string} featureName - 機能名
   * @param {Object} context - コンテキスト
   * @returns {Object} 判定結果
   */
  canAddFeature(featureName, context = {}) {
    const feature = this.features.get(featureName);
    if (!feature) {
      return {
        allowed: false,
        reason: '機能が登録されていません',
        recommendations: ['機能を先に登録してください']
      };
    }

    // ポリシーチェック
    const policyResults = this.checkPolicies(feature, context);
    
    // 安定性チェック
    const stabilityResults = this.checkStabilityRequirements(feature, context);
    
    // 抽象化一貫性チェック
    const abstractionResults = this.checkAbstractionConsistency(feature, context);
    
    // 依存関係チェック
    const dependencyResults = this.checkDependencies(feature, context);

    const allPassed = policyResults.passed && 
                     stabilityResults.passed && 
                     abstractionResults.passed && 
                     dependencyResults.passed;

    return {
      allowed: allPassed,
      reason: allPassed ? 'すべての条件を満たしています' : '条件を満たしていません',
      details: {
        policies: policyResults,
        stability: stabilityResults,
        abstraction: abstractionResults,
        dependencies: dependencyResults
      },
      recommendations: this.generateRecommendations({
        policies: policyResults,
        stability: stabilityResults,
        abstraction: abstractionResults,
        dependencies: dependencyResults
      })
    };
  }

  /**
   * ポリシーをチェック
   * @param {Object} feature - 機能
   * @param {Object} context - コンテキスト
   * @returns {Object} チェック結果
   */
  checkPolicies(feature, context) {
    const violations = [];
    let passed = true;

    // 各ポリシーをチェック
    this.policies.forEach((policy, policyName) => {
      policy.rules.forEach(rule => {
        const conditionResult = this.evaluateCondition(rule.condition, feature, context);
        
        if (conditionResult.met) {
          if (rule.action === 'block') {
            passed = false;
            violations.push({
              policy: policyName,
              rule: rule.message,
              severity: 'high'
            });
          } else if (rule.action === 'warn') {
            violations.push({
              policy: policyName,
              rule: rule.message,
              severity: 'medium'
            });
          } else if (rule.action === 'require-approval') {
            if (!context.approved) {
              passed = false;
              violations.push({
                policy: policyName,
                rule: rule.message,
                severity: 'high'
              });
            }
          }
        }
      });
    });

    return {
      passed,
      violations,
      policyCount: this.policies.size
    };
  }

  /**
   * 条件を評価
   * @param {string} condition - 条件
   * @param {Object} feature - 機能
   * @param {Object} context - コンテキスト
   * @returns {Object} 評価結果
   */
  evaluateCondition(condition, feature, context) {
    switch (condition) {
      case 'critical-features-unstable':
        return {
          met: this.areCriticalFeaturesUnstable(),
          details: 'クリティカル機能の安定性をチェック'
        };
      
      case 'test-coverage-low':
        const coverage = this.getTestCoverage();
        return {
          met: coverage < 0.8,
          details: `テストカバレッジ: ${(coverage * 100).toFixed(1)}%`
        };
      
      case 'technical-debt-high':
        const debtLevel = this.getTechnicalDebtLevel();
        return {
          met: debtLevel > 0.7,
          details: `技術的負債レベル: ${(debtLevel * 100).toFixed(1)}%`
        };
      
      case 'mixed-abstraction-levels':
        return {
          met: this.hasMixedAbstractionLevels(feature),
          details: '抽象化レベルの混在をチェック'
        };
      
      case 'unauthorized-layer-dependency':
        return {
          met: this.hasUnauthorizedDependencies(feature),
          details: 'レイヤー間依存関係をチェック'
        };
      
      case 'new-feature':
        return {
          met: feature.state === FEATURE_STATES.PROPOSED,
          details: '新機能の承認が必要'
        };
      
      case 'breaking-change':
        return {
          met: feature.impact === FEATURE_IMPACT.CRITICAL || feature.impact === FEATURE_IMPACT.MAJOR,
          details: '破壊的変更の移行計画が必要'
        };
      
      default:
        return { met: false, details: '未知の条件' };
    }
  }

  /**
   * クリティカル機能が不安定かチェック
   * @returns {boolean} 不安定かどうか
   */
  areCriticalFeaturesUnstable() {
    const criticalFeatures = Array.from(this.features.values())
      .filter(f => f.priority === FEATURE_PRIORITY.CRITICAL);
    
    return criticalFeatures.some(f => f.stabilityScore < 0.8);
  }

  /**
   * テストカバレッジを取得
   * @returns {number} テストカバレッジ（0-1）
   */
  getTestCoverage() {
    // 設計思想管理から取得
    const report = designPhilosophyManager.generateDesignQualityReport();
    return report.quality.testCoverage;
  }

  /**
   * 技術的負債レベルを取得
   * @returns {number} 技術的負債レベル（0-1）
   */
  getTechnicalDebtLevel() {
    // 設計思想管理から取得
    const report = designPhilosophyManager.generateDesignQualityReport();
    return report.quality.technicalDebtLevel;
  }

  /**
   * 抽象化レベルの混在をチェック
   * @param {Object} feature - 機能
   * @returns {boolean} 混在しているかどうか
   */
  hasMixedAbstractionLevels(feature) {
    // 機能の抽象化レベルと既存システムの抽象化レベルを比較
    const systemLevels = this.getSystemAbstractionLevels();
    const featureLevel = feature.abstractionLevel;
    
    // 異なる抽象化レベルが混在しているかチェック
    return systemLevels.some(level => 
      this.calculateAbstractionDistance(level, featureLevel) > 2
    );
  }

  /**
   * システムの抽象化レベルを取得
   * @returns {Array} 抽象化レベル
   */
  getSystemAbstractionLevels() {
    const report = abstractionLayerManager.generateAbstractionReport();
    return Object.keys(report.layers);
  }

  /**
   * 抽象化レベルの距離を計算
   * @param {string} level1 - レベル1
   * @param {string} level2 - レベル2
   * @returns {number} 距離
   */
  calculateAbstractionDistance(level1, level2) {
    const levels = Object.keys(ABSTRACTION_LEVELS);
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);
    
    if (index1 === -1 || index2 === -1) return Infinity;
    
    return Math.abs(index1 - index2);
  }

  /**
   * 許可されていない依存関係をチェック
   * @param {Object} feature - 機能
   * @returns {boolean} 許可されていない依存関係があるかどうか
   */
  hasUnauthorizedDependencies(feature) {
    // 抽象化レイヤー管理から違反を取得
    const report = abstractionLayerManager.generateAbstractionReport();
    return report.violations.total > 0;
  }

  /**
   * 安定性要件をチェック
   * @param {Object} feature - 機能
   * @param {Object} context - コンテキスト
   * @returns {Object} チェック結果
   */
  checkStabilityRequirements(feature, context) {
    const violations = [];
    let passed = true;

    // 既存機能の安定性チェック
    if (feature.priority === FEATURE_PRIORITY.HIGH && this.areCriticalFeaturesUnstable()) {
      passed = false;
      violations.push({
        type: 'critical-features-unstable',
        message: 'クリティカル機能が不安定なため新機能追加をブロック',
        severity: 'high'
      });
    }

    // テストカバレッジチェック
    const coverage = this.getTestCoverage();
    if (coverage < 0.8) {
      passed = false;
      violations.push({
        type: 'test-coverage-low',
        message: `テストカバレッジが不足（${(coverage * 100).toFixed(1)}%）`,
        severity: 'high'
      });
    }

    return { passed, violations };
  }

  /**
   * 抽象化一貫性をチェック
   * @param {Object} feature - 機能
   * @param {Object} context - コンテキスト
   * @returns {Object} チェック結果
   */
  checkAbstractionConsistency(feature, context) {
    const violations = [];
    let passed = true;

    // 抽象化レベルの混在チェック
    if (this.hasMixedAbstractionLevels(feature)) {
      passed = false;
      violations.push({
        type: 'mixed-abstraction-levels',
        message: '異なる抽象化レベルが混在しています',
        severity: 'high'
      });
    }

    // レイヤー間依存関係チェック
    if (this.hasUnauthorizedDependencies(feature)) {
      passed = false;
      violations.push({
        type: 'unauthorized-dependencies',
        message: '許可されていないレイヤー間依存関係があります',
        severity: 'high'
      });
    }

    return { passed, violations };
  }

  /**
   * 依存関係をチェック
   * @param {Object} feature - 機能
   * @param {Object} context - コンテキスト
   * @returns {Object} チェック結果
   */
  checkDependencies(feature, context) {
    const violations = [];
    let passed = true;

    // 機能の依存関係をチェック
    feature.dependencies.forEach(depName => {
      const depFeature = this.features.get(depName);
      if (!depFeature) {
        passed = false;
        violations.push({
          type: 'missing-dependency',
          message: `依存機能「${depName}」が存在しません`,
          severity: 'high'
        });
      } else if (depFeature.state !== FEATURE_STATES.STABLE) {
        passed = false;
        violations.push({
          type: 'unstable-dependency',
          message: `依存機能「${depName}」が不安定です（状態: ${depFeature.state}）`,
          severity: 'high'
        });
      }
    });

    return { passed, violations };
  }

  /**
   * 推奨事項を生成
   * @param {Object} results - チェック結果
   * @returns {Array} 推奨事項
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (!results.policies.passed) {
      recommendations.push({
        type: 'policy-violation',
        priority: 'high',
        action: 'ポリシー違反を解決してください',
        details: results.policies.violations.map(v => v.rule)
      });
    }

    if (!results.stability.passed) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        action: '既存機能の安定化を優先してください',
        details: results.stability.violations.map(v => v.message)
      });
    }

    if (!results.abstraction.passed) {
      recommendations.push({
        type: 'abstraction',
        priority: 'medium',
        action: '抽象化レベルの一貫性を保ってください',
        details: results.abstraction.violations.map(v => v.message)
      });
    }

    if (!results.dependencies.passed) {
      recommendations.push({
        type: 'dependencies',
        priority: 'high',
        action: '依存関係を解決してください',
        details: results.dependencies.violations.map(v => v.message)
      });
    }

    return recommendations;
  }

  /**
   * 機能の状態を更新
   * @param {string} featureName - 機能名
   * @param {string} newState - 新しい状態
   * @param {Object} context - コンテキスト
   */
  updateFeatureState(featureName, newState, context = {}) {
    const feature = this.features.get(featureName);
    if (!feature) {
      throw new Error(`機能「${featureName}」が存在しません`);
    }

    const oldState = feature.state;
    feature.state = newState;
    feature.updatedAt = Date.now();
    feature.updateContext = context;

    logger.info(`機能の状態を更新しました: ${featureName}`, {
      from: oldState,
      to: newState,
      context
    });
  }

  /**
   * 機能ゲートレポートを生成
   * @returns {Object} レポート
   */
  generateFeatureGateReport() {
    const features = Array.from(this.features.values());
    const gates = Array.from(this.gates.values());

    return {
      timestamp: new Date().toISOString(),
      features: {
        total: features.length,
        byState: this.groupFeaturesByState(features),
        byPriority: this.groupFeaturesByPriority(features),
        byImpact: this.groupFeaturesByImpact(features)
      },
      gates: {
        total: gates.length,
        enabled: gates.filter(g => g.enabled).length,
        disabled: gates.filter(g => !g.enabled).length
      },
      policies: {
        total: this.policies.size,
        active: this.policies.size
      },
      quality: {
        stabilityScore: this.calculateOverallStabilityScore(features),
        consistencyScore: this.calculateConsistencyScore(features),
        gateEffectiveness: this.calculateGateEffectiveness(gates)
      },
      recommendations: this.generateOverallRecommendations(features, gates)
    };
  }

  /**
   * 機能を状態別にグループ化
   * @param {Array} features - 機能リスト
   * @returns {Object} グループ化された機能
   */
  groupFeaturesByState(features) {
    const groups = {};
    features.forEach(feature => {
      groups[feature.state] = (groups[feature.state] || 0) + 1;
    });
    return groups;
  }

  /**
   * 機能を優先度別にグループ化
   * @param {Array} features - 機能リスト
   * @returns {Object} グループ化された機能
   */
  groupFeaturesByPriority(features) {
    const groups = {};
    features.forEach(feature => {
      groups[feature.priority] = (groups[feature.priority] || 0) + 1;
    });
    return groups;
  }

  /**
   * 機能を影響度別にグループ化
   * @param {Array} features - 機能リスト
   * @returns {Object} グループ化された機能
   */
  groupFeaturesByImpact(features) {
    const groups = {};
    features.forEach(feature => {
      groups[feature.impact] = (groups[feature.impact] || 0) + 1;
    });
    return groups;
  }

  /**
   * 全体の安定性スコアを計算
   * @param {Array} features - 機能リスト
   * @returns {number} 安定性スコア（0-1）
   */
  calculateOverallStabilityScore(features) {
    if (features.length === 0) return 0;
    
    const totalScore = features.reduce((sum, f) => sum + f.stabilityScore, 0);
    return totalScore / features.length;
  }

  /**
   * 一貫性スコアを計算
   * @param {Array} features - 機能リスト
   * @returns {number} 一貫性スコア（0-1）
   */
  calculateConsistencyScore(features) {
    if (features.length === 0) return 0;
    
    // 抽象化レベルの一貫性を計算
    const levels = features.map(f => f.abstractionLevel);
    const uniqueLevels = [...new Set(levels)];
    
    // 一貫性が高いほどスコアが高い
    return 1 - (uniqueLevels.length - 1) / (Object.keys(ABSTRACTION_LEVELS).length - 1);
  }

  /**
   * ゲートの有効性を計算
   * @param {Array} gates - ゲートリスト
   * @returns {number} 有効性スコア（0-1）
   */
  calculateGateEffectiveness(gates) {
    if (gates.length === 0) return 0;
    
    const enabledGates = gates.filter(g => g.enabled);
    return enabledGates.length / gates.length;
  }

  /**
   * 全体の推奨事項を生成
   * @param {Array} features - 機能リスト
   * @param {Array} gates - ゲートリスト
   * @returns {Array} 推奨事項
   */
  generateOverallRecommendations(features, gates) {
    const recommendations = [];
    const report = this.generateFeatureGateReport();
    
    if (report.quality.stabilityScore < 0.8) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        action: '全体の安定性スコアを向上',
        current: `${(report.quality.stabilityScore * 100).toFixed(1)}%`,
        target: '80%'
      });
    }
    
    if (report.quality.consistencyScore < 0.7) {
      recommendations.push({
        type: 'consistency',
        priority: 'medium',
        action: '抽象化レベルの一貫性を向上',
        current: `${(report.quality.consistencyScore * 100).toFixed(1)}%`,
        target: '70%'
      });
    }
    
    if (report.quality.gateEffectiveness < 0.8) {
      recommendations.push({
        type: 'gates',
        priority: 'medium',
        action: '機能ゲートの有効性を向上',
        current: `${(report.quality.gateEffectiveness * 100).toFixed(1)}%`,
        target: '80%'
      });
    }
    
    return recommendations;
  }
}

/**
 * グローバル機能ゲート管理インスタンス
 */
export const featureGateManager = new FeatureGateManager();

export default featureGateManager;
