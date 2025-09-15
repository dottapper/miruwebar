// src/architecture/design-philosophy.js
// 設計思想の統一システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from '../utils/unified-logger.js';

/**
 * 設計原則
 */
export const DESIGN_PRINCIPLES = {
  STABILITY_FIRST: 'stability-first',      // 安定性優先
  CONSISTENT_ABSTRACTION: 'consistent-abstraction', // 一貫した抽象化
  SINGLE_RESPONSIBILITY: 'single-responsibility',   // 単一責任
  OPEN_CLOSED: 'open-closed',             // 開放閉鎖原則
  DEPENDENCY_INVERSION: 'dependency-inversion'      // 依存関係逆転
};

/**
 * 抽象化レベル
 */
export const ABSTRACTION_LEVELS = {
  DOM: 'dom',                    // DOM操作レベル
  COMPONENT: 'component',        // コンポーネントレベル
  SERVICE: 'service',           // サービスレベル
  APPLICATION: 'application',   // アプリケーションレベル
  SYSTEM: 'system'             // システムレベル
};

/**
 * 機能の優先度
 */
export const FEATURE_PRIORITY = {
  CRITICAL: 'critical',         // クリティカル（既存機能の安定化）
  HIGH: 'high',                 // 高（新機能追加）
  MEDIUM: 'medium',             // 中（改善・最適化）
  LOW: 'low'                    // 低（実験的機能）
};

/**
 * 設計思想管理クラス
 */
class DesignPhilosophyManager {
  constructor() {
    this.principles = new Map();
    this.abstractionLayers = new Map();
    this.featureRegistry = new Map();
    this.technicalDebt = [];
    this.setupDefaultPrinciples();
  }

  /**
   * デフォルトの設計原則を設定
   */
  setupDefaultPrinciples() {
    // 安定性優先原則
    this.principles.set(DESIGN_PRINCIPLES.STABILITY_FIRST, {
      name: '安定性優先',
      description: '既存機能の安定化を新機能追加より優先する',
      rules: [
        '新機能追加前に既存機能のテストカバレッジを100%にする',
        '既存機能に影響する変更は段階的に実施する',
        '技術的負債の蓄積を防ぐため、リファクタリングを定期的に実施する'
      ],
      metrics: {
        testCoverage: 0.9,      // 90%以上のテストカバレッジ
        bugRate: 0.05,          // 5%以下のバグ率
        refactorFrequency: 0.1  // 10%の時間をリファクタリングに充てる
      }
    });

    // 一貫した抽象化原則
    this.principles.set(DESIGN_PRINCIPLES.CONSISTENT_ABSTRACTION, {
      name: '一貫した抽象化',
      description: '同じ抽象化レベル内で一貫したインターフェースを提供する',
      rules: [
        '高レベル（統合システム）と低レベル（DOM操作）を混在させない',
        '各レイヤーは明確な責任を持つ',
        'レイヤー間の依存関係は一方向にする'
      ],
      layers: {
        [ABSTRACTION_LEVELS.SYSTEM]: 'システム全体の統合・調整',
        [ABSTRACTION_LEVELS.APPLICATION]: 'アプリケーション機能の実装',
        [ABSTRACTION_LEVELS.SERVICE]: 'ビジネスロジック・データ管理',
        [ABSTRACTION_LEVELS.COMPONENT]: 'UIコンポーネント・画面管理',
        [ABSTRACTION_LEVELS.DOM]: 'DOM操作・イベント処理'
      }
    });

    // 単一責任原則
    this.principles.set(DESIGN_PRINCIPLES.SINGLE_RESPONSIBILITY, {
      name: '単一責任',
      description: '各クラス・関数は一つの責任のみを持つ',
      rules: [
        '一つのクラスは一つの変更理由のみを持つ',
        '関数は一つの明確な目的のみを持つ',
        '責任が複数ある場合は分割する'
      ]
    });

    // 開放閉鎖原則
    this.principles.set(DESIGN_PRINCIPLES.OPEN_CLOSED, {
      name: '開放閉鎖',
      description: '拡張に対して開いており、修正に対して閉じている',
      rules: [
        '新機能は既存コードを変更せずに追加する',
        'インターフェースを定義して実装を分離する',
        'プラグインアーキテクチャを採用する'
      ]
    });

    // 依存関係逆転原則
    this.principles.set(DESIGN_PRINCIPLES.DEPENDENCY_INVERSION, {
      name: '依存関係逆転',
      description: '高レベルモジュールは低レベルモジュールに依存してはいけない',
      rules: [
        '抽象に依存し、具象に依存しない',
        '依存性注入を使用する',
        'インターフェースを定義して実装を分離する'
      ]
    });
  }

  /**
   * 抽象化レイヤーを登録
   * @param {string} level - 抽象化レベル
   * @param {Object} config - 設定
   */
  registerAbstractionLayer(level, config) {
    this.abstractionLayers.set(level, {
      ...config,
      level,
      registeredAt: Date.now()
    });
    logger.debug(`抽象化レイヤーを登録しました: ${level}`, { config });
  }

  /**
   * 機能を登録
   * @param {string} name - 機能名
   * @param {Object} config - 設定
   */
  registerFeature(name, config) {
    const feature = {
      name,
      ...config,
      registeredAt: Date.now(),
      stabilityScore: this.calculateStabilityScore(config)
    };
    
    this.featureRegistry.set(name, feature);
    logger.info(`機能を登録しました: ${name}`, { 
      priority: config.priority,
      stabilityScore: feature.stabilityScore
    });
  }

  /**
   * 安定性スコアを計算
   * @param {Object} config - 機能設定
   * @returns {number} 安定性スコア（0-1）
   */
  calculateStabilityScore(config) {
    let score = 0;
    
    // テストカバレッジ
    if (config.testCoverage) {
      score += config.testCoverage * 0.3;
    }
    
    // ドキュメント化
    if (config.documented) {
      score += 0.2;
    }
    
    // 使用期間
    if (config.usageDuration) {
      const months = config.usageDuration / (1000 * 60 * 60 * 24 * 30);
      score += Math.min(months / 6, 1) * 0.2; // 6ヶ月で最大0.2
    }
    
    // バグ率
    if (config.bugRate !== undefined) {
      score += (1 - config.bugRate) * 0.3;
    }
    
    return Math.min(score, 1);
  }

  /**
   * 技術的負債を記録
   * @param {Object} debt - 技術的負債情報
   */
  recordTechnicalDebt(debt) {
    this.technicalDebt.push({
      ...debt,
      recordedAt: Date.now(),
      severity: this.calculateDebtSeverity(debt)
    });
    
    logger.warn('技術的負債を記録しました', { 
      description: debt.description,
      severity: debt.severity
    });
  }

  /**
   * 技術的負債の深刻度を計算
   * @param {Object} debt - 技術的負債情報
   * @returns {string} 深刻度
   */
  calculateDebtSeverity(debt) {
    let score = 0;
    
    // 影響範囲
    if (debt.impactScope === 'system') score += 3;
    else if (debt.impactScope === 'application') score += 2;
    else if (debt.impactScope === 'component') score += 1;
    
    // 修正の難易度
    if (debt.difficulty === 'high') score += 3;
    else if (debt.difficulty === 'medium') score += 2;
    else if (debt.difficulty === 'low') score += 1;
    
    // 緊急度
    if (debt.urgency === 'critical') score += 3;
    else if (debt.urgency === 'high') score += 2;
    else if (debt.urgency === 'medium') score += 1;
    
    if (score >= 7) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * 機能追加の可否を判定
   * @param {string} featureName - 機能名
   * @param {Object} requirements - 要件
   * @returns {Object} 判定結果
   */
  canAddFeature(featureName, requirements) {
    const existingFeature = this.featureRegistry.get(featureName);
    const criticalFeatures = this.getCriticalFeatures();
    const technicalDebtLevel = this.getTechnicalDebtLevel();
    
    // 既存機能の安定性チェック
    const stabilityCheck = this.checkStabilityRequirements(criticalFeatures);
    
    // 技術的負債レベルチェック
    const debtCheck = this.checkDebtLevel(technicalDebtLevel);
    
    // 抽象化レベル一貫性チェック
    const abstractionCheck = this.checkAbstractionConsistency(requirements);
    
    const canAdd = stabilityCheck.passed && debtCheck.passed && abstractionCheck.passed;
    
    return {
      canAdd,
      reasons: [
        ...stabilityCheck.reasons,
        ...debtCheck.reasons,
        ...abstractionCheck.reasons
      ],
      recommendations: this.generateRecommendations({
        stability: stabilityCheck,
        debt: debtCheck,
        abstraction: abstractionCheck
      })
    };
  }

  /**
   * 安定性要件をチェック
   * @param {Array} criticalFeatures - クリティカル機能
   * @returns {Object} チェック結果
   */
  checkStabilityRequirements(criticalFeatures) {
    const reasons = [];
    let passed = true;
    
    // クリティカル機能の安定性チェック
    for (const feature of criticalFeatures) {
      const stabilityScore = feature.stabilityScore || 0;
      if (stabilityScore < 0.8) {
        passed = false;
        reasons.push(`クリティカル機能「${feature.name}」の安定性が不足（スコア: ${stabilityScore}）`);
      }
    }
    
    // テストカバレッジチェック
    const overallCoverage = this.calculateOverallTestCoverage();
    if (overallCoverage < 0.9) {
      passed = false;
      reasons.push(`全体のテストカバレッジが不足（${(overallCoverage * 100).toFixed(1)}%）`);
    }
    
    return { passed, reasons };
  }

  /**
   * 技術的負債レベルをチェック
   * @param {number} debtLevel - 負債レベル
   * @returns {Object} チェック結果
   */
  checkDebtLevel(debtLevel) {
    const reasons = [];
    let passed = true;
    
    if (debtLevel > 0.7) {
      passed = false;
      reasons.push('技術的負債レベルが高すぎます（70%超）');
    }
    
    const criticalDebt = this.technicalDebt.filter(d => d.severity === 'critical');
    if (criticalDebt.length > 0) {
      passed = false;
      reasons.push(`${criticalDebt.length}件のクリティカルな技術的負債が未解決`);
    }
    
    return { passed, reasons };
  }

  /**
   * 抽象化一貫性をチェック
   * @param {Object} requirements - 要件
   * @returns {Object} チェック結果
   */
  checkAbstractionConsistency(requirements) {
    const reasons = [];
    let passed = true;
    
    // 抽象化レベルの混在チェック
    if (requirements.levels && requirements.levels.length > 1) {
      const hasHighLevel = requirements.levels.some(l => 
        l === ABSTRACTION_LEVELS.SYSTEM || l === ABSTRACTION_LEVELS.APPLICATION
      );
      const hasLowLevel = requirements.levels.some(l => 
        l === ABSTRACTION_LEVELS.DOM || l === ABSTRACTION_LEVELS.COMPONENT
      );
      
      if (hasHighLevel && hasLowLevel) {
        passed = false;
        reasons.push('高レベル（統合システム）と低レベル（DOM操作）が混在しています');
      }
    }
    
    return { passed, reasons };
  }

  /**
   * 推奨事項を生成
   * @param {Object} checks - チェック結果
   * @returns {Array} 推奨事項
   */
  generateRecommendations(checks) {
    const recommendations = [];
    
    if (!checks.stability.passed) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        action: '既存機能の安定化を優先してください',
        details: [
          'テストカバレッジを90%以上に向上',
          'クリティカル機能のバグ修正',
          'リファクタリングの実施'
        ]
      });
    }
    
    if (!checks.debt.passed) {
      recommendations.push({
        type: 'debt',
        priority: 'high',
        action: '技術的負債の解消を優先してください',
        details: [
          'クリティカルな技術的負債の修正',
          'コードの重複排除',
          'アーキテクチャの整理'
        ]
      });
    }
    
    if (!checks.abstraction.passed) {
      recommendations.push({
        type: 'abstraction',
        priority: 'medium',
        action: '抽象化レベルの統一を図ってください',
        details: [
          'レイヤー間の責任分離',
          'インターフェースの統一',
          '依存関係の整理'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * クリティカル機能を取得
   * @returns {Array} クリティカル機能
   */
  getCriticalFeatures() {
    return Array.from(this.featureRegistry.values())
      .filter(f => f.priority === FEATURE_PRIORITY.CRITICAL);
  }

  /**
   * 技術的負債レベルを取得
   * @returns {number} 負債レベル（0-1）
   */
  getTechnicalDebtLevel() {
    if (this.technicalDebt.length === 0) return 0;
    
    const totalDebt = this.technicalDebt.length;
    const criticalDebt = this.technicalDebt.filter(d => d.severity === 'critical').length;
    const highDebt = this.technicalDebt.filter(d => d.severity === 'high').length;
    
    return (criticalDebt * 0.5 + highDebt * 0.3 + (totalDebt - criticalDebt - highDebt) * 0.1) / totalDebt;
  }

  /**
   * 全体のテストカバレッジを計算
   * @returns {number} テストカバレッジ（0-1）
   */
  calculateOverallTestCoverage() {
    const features = Array.from(this.featureRegistry.values());
    if (features.length === 0) return 0;
    
    const totalCoverage = features.reduce((sum, f) => sum + (f.testCoverage || 0), 0);
    return totalCoverage / features.length;
  }

  /**
   * 設計品質レポートを生成
   * @returns {Object} 設計品質レポート
   */
  generateDesignQualityReport() {
    const criticalFeatures = this.getCriticalFeatures();
    const technicalDebtLevel = this.getTechnicalDebtLevel();
    const overallCoverage = this.calculateOverallTestCoverage();
    
    return {
      timestamp: new Date().toISOString(),
      principles: Object.fromEntries(this.principles),
      abstractionLayers: Object.fromEntries(this.abstractionLayers),
      features: {
        total: this.featureRegistry.size,
        critical: criticalFeatures.length,
        averageStability: this.calculateAverageStability()
      },
      quality: {
        testCoverage: overallCoverage,
        technicalDebtLevel,
        stabilityScore: this.calculateOverallStabilityScore()
      },
      technicalDebt: {
        total: this.technicalDebt.length,
        bySeverity: this.groupDebtBySeverity()
      },
      recommendations: this.generateOverallRecommendations()
    };
  }

  /**
   * 平均安定性を計算
   * @returns {number} 平均安定性
   */
  calculateAverageStability() {
    const features = Array.from(this.featureRegistry.values());
    if (features.length === 0) return 0;
    
    const totalStability = features.reduce((sum, f) => sum + f.stabilityScore, 0);
    return totalStability / features.length;
  }

  /**
   * 全体の安定性スコアを計算
   * @returns {number} 安定性スコア
   */
  calculateOverallStabilityScore() {
    const coverage = this.calculateOverallTestCoverage();
    const debtLevel = this.getTechnicalDebtLevel();
    const averageStability = this.calculateAverageStability();
    
    return (coverage * 0.4 + (1 - debtLevel) * 0.4 + averageStability * 0.2);
  }

  /**
   * 技術的負債を深刻度別にグループ化
   * @returns {Object} グループ化された負債
   */
  groupDebtBySeverity() {
    const groups = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    this.technicalDebt.forEach(debt => {
      groups[debt.severity] = (groups[debt.severity] || 0) + 1;
    });
    
    return groups;
  }

  /**
   * 全体の推奨事項を生成
   * @returns {Array} 推奨事項
   */
  generateOverallRecommendations() {
    const recommendations = [];
    const report = this.generateDesignQualityReport();
    
    if (report.quality.testCoverage < 0.9) {
      recommendations.push({
        type: 'test-coverage',
        priority: 'high',
        action: 'テストカバレッジを90%以上に向上',
        current: `${(report.quality.testCoverage * 100).toFixed(1)}%`,
        target: '90%'
      });
    }
    
    if (report.quality.technicalDebtLevel > 0.5) {
      recommendations.push({
        type: 'technical-debt',
        priority: 'high',
        action: '技術的負債を50%以下に削減',
        current: `${(report.quality.technicalDebtLevel * 100).toFixed(1)}%`,
        target: '50%'
      });
    }
    
    if (report.quality.stabilityScore < 0.8) {
      recommendations.push({
        type: 'stability',
        priority: 'medium',
        action: '全体の安定性スコアを80%以上に向上',
        current: `${(report.quality.stabilityScore * 100).toFixed(1)}%`,
        target: '80%'
      });
    }
    
    return recommendations;
  }
}

/**
 * グローバル設計思想管理インスタンス
 */
export const designPhilosophyManager = new DesignPhilosophyManager();

export default designPhilosophyManager;
