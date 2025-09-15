// src/architecture/legacy-refactor.js
// レガシーコードの設計思想統一

import { logger, LOG_LEVELS, LOG_CATEGORIES } from '../utils/unified-logger.js';
import { designPhilosophyManager, FEATURE_PRIORITY } from './design-philosophy.js';
import { abstractionLayerManager, ABSTRACTION_LEVELS } from './abstraction-layers.js';
import { featureGateManager, FEATURE_STATES } from './feature-gate.js';

/**
 * レガシーコードの分析結果
 */
export const LEGACY_ISSUES = {
  MIXED_ABSTRACTION: 'mixed-abstraction',           // 抽象化レベルの混在
  DIRECT_DOM_MANIPULATION: 'direct-dom',            // 直接DOM操作
  INCONSISTENT_ERROR_HANDLING: 'inconsistent-error', // 一貫性のないエラーハンドリング
  DUPLICATE_CODE: 'duplicate-code',                 // 重複コード
  TIGHT_COUPLING: 'tight-coupling',                 // 密結合
  MISSING_ABSTRACTION: 'missing-abstraction',       // 抽象化の欠如
  INCONSISTENT_NAMING: 'inconsistent-naming',       // 一貫性のない命名
  MISSING_VALIDATION: 'missing-validation'          // 検証の欠如
};

/**
 * リファクタリング戦略
 */
export const REFACTOR_STRATEGIES = {
  EXTRACT_ABSTRACTION: 'extract-abstraction',       // 抽象化の抽出
  INTRODUCE_LAYER: 'introduce-layer',               // レイヤーの導入
  UNIFY_INTERFACES: 'unify-interfaces',             // インターフェースの統一
  DECOMPOSE_FUNCTION: 'decompose-function',         // 関数の分解
  INTRODUCE_VALIDATION: 'introduce-validation',     // 検証の導入
  STANDARDIZE_NAMING: 'standardize-naming',         // 命名の標準化
  ELIMINATE_DUPLICATION: 'eliminate-duplication'    // 重複の排除
};

/**
 * レガシーリファクタリング管理クラス
 */
class LegacyRefactorManager {
  constructor() {
    this.issues = new Map();
    this.strategies = new Map();
    this.refactorPlan = [];
    this.setupDefaultStrategies();
  }

  /**
   * デフォルト戦略を設定
   */
  setupDefaultStrategies() {
    // 抽象化の抽出戦略
    this.strategies.set(REFACTOR_STRATEGIES.EXTRACT_ABSTRACTION, {
      name: '抽象化の抽出',
      description: '低レベル操作を高レベル抽象化に変換',
      steps: [
        '低レベル操作を特定',
        '共通パターンを抽出',
        '抽象化インターフェースを定義',
        '実装を抽象化に置換'
      ],
      examples: [
        'DOM操作 → UIComponent抽象化',
        'イベント処理 → EventManager抽象化',
        'データ操作 → DataService抽象化'
      ]
    });

    // レイヤーの導入戦略
    this.strategies.set(REFACTOR_STRATEGIES.INTRODUCE_LAYER, {
      name: 'レイヤーの導入',
      description: '適切な抽象化レイヤーを導入',
      steps: [
        '現在の抽象化レベルを分析',
        '適切なレイヤーを決定',
        'レイヤー間のインターフェースを定義',
        'コードをレイヤーに再配置'
      ],
      examples: [
        'DOM操作 → Component Layer',
        'ビジネスロジック → Service Layer',
        '統合制御 → Application Layer'
      ]
    });

    // インターフェースの統一戦略
    this.strategies.set(REFACTOR_STRATEGIES.UNIFY_INTERFACES, {
      name: 'インターフェースの統一',
      description: '一貫したインターフェースを提供',
      steps: [
        '既存のインターフェースを分析',
        '共通パターンを特定',
        '統一インターフェースを設計',
        '既存実装を統一インターフェースに移行'
      ],
      examples: [
        '各種Managerクラスの統一',
        'API呼び出しの統一',
        'エラーハンドリングの統一'
      ]
    });
  }

  /**
   * レガシーコードを分析
   * @param {string} filePath - ファイルパス
   * @param {string} content - ファイル内容
   * @returns {Object} 分析結果
   */
  analyzeLegacyCode(filePath, content) {
    const issues = [];
    const lines = content.split('\n');

    // 抽象化レベルの混在をチェック
    const abstractionIssues = this.detectMixedAbstractionLevels(lines, filePath);
    issues.push(...abstractionIssues);

    // 直接DOM操作をチェック
    const domIssues = this.detectDirectDOMManipulation(lines, filePath);
    issues.push(...domIssues);

    // 一貫性のないエラーハンドリングをチェック
    const errorIssues = this.detectInconsistentErrorHandling(lines, filePath);
    issues.push(...errorIssues);

    // 重複コードをチェック
    const duplicationIssues = this.detectDuplicateCode(lines, filePath);
    issues.push(...duplicationIssues);

    // 密結合をチェック
    const couplingIssues = this.detectTightCoupling(lines, filePath);
    issues.push(...couplingIssues);

    // 抽象化の欠如をチェック
    const abstractionGapIssues = this.detectMissingAbstraction(lines, filePath);
    issues.push(...abstractionGapIssues);

    // 一貫性のない命名をチェック
    const namingIssues = this.detectInconsistentNaming(lines, filePath);
    issues.push(...namingIssues);

    // 検証の欠如をチェック
    const validationIssues = this.detectMissingValidation(lines, filePath);
    issues.push(...validationIssues);

    return {
      filePath,
      totalIssues: issues.length,
      issues,
      severity: this.calculateFileSeverity(issues),
      recommendations: this.generateFileRecommendations(issues)
    };
  }

  /**
   * 抽象化レベルの混在を検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectMixedAbstractionLevels(lines, filePath) {
    const issues = [];
    let hasHighLevel = false;
    let hasLowLevel = false;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 高レベル操作の検出
      if (this.isHighLevelOperation(line)) {
        hasHighLevel = true;
      }
      
      // 低レベル操作の検出
      if (this.isLowLevelOperation(line)) {
        hasLowLevel = true;
      }
    });

    if (hasHighLevel && hasLowLevel) {
      issues.push({
        type: LEGACY_ISSUES.MIXED_ABSTRACTION,
        severity: 'high',
        line: 0,
        message: '高レベル（統合システム）と低レベル（DOM操作）が混在しています',
        suggestion: 'レイヤーを分離して抽象化レベルを統一してください'
      });
    }

    return issues;
  }

  /**
   * 高レベル操作かどうか判定
   * @param {string} line - コード行
   * @returns {boolean} 高レベル操作かどうか
   */
  isHighLevelOperation(line) {
    const highLevelPatterns = [
      /screenManager\./,
      /unifiedLoading\./,
      /settingsMerger\./,
      /errorHandler\./,
      /performanceManager\./,
      /userExperienceManager\./,
      /responsiveManager\./
    ];
    
    return highLevelPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 低レベル操作かどうか判定
   * @param {string} line - コード行
   * @returns {boolean} 低レベル操作かどうか
   */
  isLowLevelOperation(line) {
    const lowLevelPatterns = [
      /querySelector/,
      /addEventListener/,
      /style\./,
      /innerHTML/,
      /appendChild/,
      /removeChild/,
      /createElement/
    ];
    
    return lowLevelPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 直接DOM操作を検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectDirectDOMManipulation(lines, filePath) {
    const issues = [];
    const domPatterns = [
      { pattern: /\.querySelector\(/, message: 'querySelectorの直接使用' },
      { pattern: /\.addEventListener\(/, message: 'addEventListenerの直接使用' },
      { pattern: /\.style\./, message: 'styleの直接操作' },
      { pattern: /\.innerHTML\s*=/, message: 'innerHTMLの直接設定' },
      { pattern: /\.appendChild\(/, message: 'appendChildの直接使用' }
    ];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      domPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line)) {
          issues.push({
            type: LEGACY_ISSUES.DIRECT_DOM_MANIPULATION,
            severity: 'medium',
            line: lineNum,
            message: `${message}が検出されました`,
            suggestion: 'DOM操作を抽象化レイヤーに委譲してください'
          });
        }
      });
    });

    return issues;
  }

  /**
   * 一貫性のないエラーハンドリングを検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectInconsistentErrorHandling(lines, filePath) {
    const issues = [];
    const errorPatterns = [
      { pattern: /console\.error/, message: 'console.errorの使用' },
      { pattern: /console\.warn/, message: 'console.warnの使用' },
      { pattern: /throw new Error/, message: 'throw new Errorの使用' },
      { pattern: /try\s*{/, message: 'try-catchブロック' }
    ];

    let hasConsoleError = false;
    let hasThrowError = false;
    let hasTryCatch = false;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      if (/console\.error/.test(line)) hasConsoleError = true;
      if (/throw new Error/.test(line)) hasThrowError = true;
      if (/try\s*{/.test(line)) hasTryCatch = true;
    });

    // 複数のエラーハンドリング方法が混在している場合
    const errorMethods = [hasConsoleError, hasThrowError, hasTryCatch].filter(Boolean).length;
    if (errorMethods > 1) {
      issues.push({
        type: LEGACY_ISSUES.INCONSISTENT_ERROR_HANDLING,
        severity: 'medium',
        line: 0,
        message: '複数のエラーハンドリング方法が混在しています',
        suggestion: '統一されたエラーハンドリングシステムを使用してください'
      });
    }

    return issues;
  }

  /**
   * 重複コードを検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectDuplicateCode(lines, filePath) {
    const issues = [];
    const codeBlocks = new Map();
    const minBlockSize = 3; // 最小ブロックサイズ

    // コードブロックを抽出
    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n');
      const normalizedBlock = this.normalizeCodeBlock(block);
      
      if (codeBlocks.has(normalizedBlock)) {
        codeBlocks.get(normalizedBlock).push(i + 1);
      } else {
        codeBlocks.set(normalizedBlock, [i + 1]);
      }
    }

    // 重複を検出
    codeBlocks.forEach((lineNumbers, block) => {
      if (lineNumbers.length > 1) {
        issues.push({
          type: LEGACY_ISSUES.DUPLICATE_CODE,
          severity: 'low',
          line: lineNumbers[0],
          message: `重複コードが検出されました（${lineNumbers.length}箇所）`,
          suggestion: '共通関数として抽出してください',
          duplicateLines: lineNumbers
        });
      }
    });

    return issues;
  }

  /**
   * コードブロックを正規化
   * @param {string} block - コードブロック
   * @returns {string} 正規化されたブロック
   */
  normalizeCodeBlock(block) {
    return block
      .replace(/\s+/g, ' ')  // 空白を統一
      .replace(/\/\/.*$/gm, '')  // コメントを削除
      .replace(/\/\*[\s\S]*?\*\//g, '')  // ブロックコメントを削除
      .trim();
  }

  /**
   * 密結合を検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectTightCoupling(lines, filePath) {
    const issues = [];
    const couplingPatterns = [
      { pattern: /new\s+\w+\(/, message: '直接インスタンス化' },
      { pattern: /\.\w+\.\w+\.\w+/, message: '深いオブジェクト参照' },
      { pattern: /global\./, message: 'グローバル変数の直接参照' },
      { pattern: /window\./, message: 'windowオブジェクトの直接参照' }
    ];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      couplingPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line)) {
          issues.push({
            type: LEGACY_ISSUES.TIGHT_COUPLING,
            severity: 'medium',
            line: lineNum,
            message: `${message}が検出されました`,
            suggestion: '依存性注入やインターフェースを使用して結合度を下げてください'
          });
        }
      });
    });

    return issues;
  }

  /**
   * 抽象化の欠如を検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectMissingAbstraction(lines, filePath) {
    const issues = [];
    const longFunctions = [];
    let currentFunction = null;
    let functionLength = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 関数の開始を検出
      if (/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+/.test(line)) {
        if (currentFunction && functionLength > 20) {
          longFunctions.push({
            name: currentFunction,
            startLine: index - functionLength + 1,
            length: functionLength
          });
        }
        currentFunction = this.extractFunctionName(line);
        functionLength = 1;
      } else if (currentFunction) {
        functionLength++;
      }
    });

    // 長い関数をチェック
    longFunctions.forEach(func => {
      issues.push({
        type: LEGACY_ISSUES.MISSING_ABSTRACTION,
        severity: 'medium',
        line: func.startLine,
        message: `長い関数「${func.name}」が検出されました（${func.length}行）`,
        suggestion: '関数を小さな単位に分解してください'
      });
    });

    return issues;
  }

  /**
   * 関数名を抽出
   * @param {string} line - コード行
   * @returns {string} 関数名
   */
  extractFunctionName(line) {
    const functionMatch = line.match(/function\s+(\w+)/);
    if (functionMatch) return functionMatch[1];
    
    const constMatch = line.match(/const\s+(\w+)\s*=/);
    if (constMatch) return constMatch[1];
    
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];
    
    return 'unknown';
  }

  /**
   * 一貫性のない命名を検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectInconsistentNaming(lines, filePath) {
    const issues = [];
    const namingPatterns = [
      { pattern: /[a-z]+[A-Z]/, message: 'camelCaseとPascalCaseの混在' },
      { pattern: /[a-z]+_[a-z]+/, message: 'camelCaseとsnake_caseの混在' },
      { pattern: /[A-Z]+_[A-Z]+/, message: 'PascalCaseとUPPER_SNAKE_CASEの混在' }
    ];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      namingPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line)) {
          issues.push({
            type: LEGACY_ISSUES.INCONSISTENT_NAMING,
            severity: 'low',
            line: lineNum,
            message: `${message}が検出されました`,
            suggestion: '命名規則を統一してください'
          });
        }
      });
    });

    return issues;
  }

  /**
   * 検証の欠如を検出
   * @param {Array} lines - コード行
   * @param {string} filePath - ファイルパス
   * @returns {Array} 問題リスト
   */
  detectMissingValidation(lines, filePath) {
    const issues = [];
    const validationPatterns = [
      { pattern: /if\s*\(\s*!\w+/, message: 'nullチェック' },
      { pattern: /typeof\s+\w+\s*===/, message: '型チェック' },
      { pattern: /\.length\s*[><=]/, message: '長さチェック' },
      { pattern: /isNaN\s*\(/, message: '数値チェック' }
    ];

    let hasValidation = false;
    lines.forEach(line => {
      validationPatterns.forEach(({ pattern }) => {
        if (pattern.test(line)) {
          hasValidation = true;
        }
      });
    });

    if (!hasValidation) {
      issues.push({
        type: LEGACY_ISSUES.MISSING_VALIDATION,
        severity: 'medium',
        line: 0,
        message: '入力検証が不足しています',
        suggestion: '適切な入力検証を追加してください'
      });
    }

    return issues;
  }

  /**
   * ファイルの深刻度を計算
   * @param {Array} issues - 問題リスト
   * @returns {string} 深刻度
   */
  calculateFileSeverity(issues) {
    const criticalCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    if (criticalCount > 0) return 'critical';
    if (mediumCount > 3) return 'high';
    if (mediumCount > 0 || lowCount > 5) return 'medium';
    return 'low';
  }

  /**
   * ファイルの推奨事項を生成
   * @param {Array} issues - 問題リスト
   * @returns {Array} 推奨事項
   */
  generateFileRecommendations(issues) {
    const recommendations = [];
    const issueTypes = [...new Set(issues.map(i => i.type))];

    issueTypes.forEach(type => {
      const strategy = this.getStrategyForIssue(type);
      if (strategy) {
        recommendations.push({
          type,
          strategy: strategy.name,
          description: strategy.description,
          steps: strategy.steps
        });
      }
    });

    return recommendations;
  }

  /**
   * 問題タイプに対応する戦略を取得
   * @param {string} issueType - 問題タイプ
   * @returns {Object|null} 戦略
   */
  getStrategyForIssue(issueType) {
    const strategyMap = {
      [LEGACY_ISSUES.MIXED_ABSTRACTION]: REFACTOR_STRATEGIES.INTRODUCE_LAYER,
      [LEGACY_ISSUES.DIRECT_DOM_MANIPULATION]: REFACTOR_STRATEGIES.EXTRACT_ABSTRACTION,
      [LEGACY_ISSUES.INCONSISTENT_ERROR_HANDLING]: REFACTOR_STRATEGIES.UNIFY_INTERFACES,
      [LEGACY_ISSUES.DUPLICATE_CODE]: REFACTOR_STRATEGIES.ELIMINATE_DUPLICATION,
      [LEGACY_ISSUES.TIGHT_COUPLING]: REFACTOR_STRATEGIES.UNIFY_INTERFACES,
      [LEGACY_ISSUES.MISSING_ABSTRACTION]: REFACTOR_STRATEGIES.EXTRACT_ABSTRACTION,
      [LEGACY_ISSUES.INCONSISTENT_NAMING]: REFACTOR_STRATEGIES.STANDARDIZE_NAMING,
      [LEGACY_ISSUES.MISSING_VALIDATION]: REFACTOR_STRATEGIES.INTRODUCE_VALIDATION
    };

    const strategyName = strategyMap[issueType];
    return strategyName ? this.strategies.get(strategyName) : null;
  }

  /**
   * リファクタリング計画を生成
   * @param {Array} analysisResults - 分析結果
   * @returns {Object} リファクタリング計画
   */
  generateRefactorPlan(analysisResults) {
    const plan = {
      totalFiles: analysisResults.length,
      totalIssues: analysisResults.reduce((sum, r) => sum + r.totalIssues, 0),
      phases: [],
      timeline: {},
      resources: {}
    };

    // 問題を深刻度別にグループ化
    const criticalFiles = analysisResults.filter(r => r.severity === 'critical');
    const highFiles = analysisResults.filter(r => r.severity === 'high');
    const mediumFiles = analysisResults.filter(r => r.severity === 'medium');
    const lowFiles = analysisResults.filter(r => r.severity === 'low');

    // フェーズ1: クリティカル問題の解決
    if (criticalFiles.length > 0) {
      plan.phases.push({
        phase: 1,
        name: 'クリティカル問題の解決',
        files: criticalFiles,
        duration: '1-2週間',
        priority: 'critical'
      });
    }

    // フェーズ2: 高優先度問題の解決
    if (highFiles.length > 0) {
      plan.phases.push({
        phase: 2,
        name: '高優先度問題の解決',
        files: highFiles,
        duration: '2-3週間',
        priority: 'high'
      });
    }

    // フェーズ3: 中優先度問題の解決
    if (mediumFiles.length > 0) {
      plan.phases.push({
        phase: 3,
        name: '中優先度問題の解決',
        files: mediumFiles,
        duration: '3-4週間',
        priority: 'medium'
      });
    }

    // フェーズ4: 低優先度問題の解決
    if (lowFiles.length > 0) {
      plan.phases.push({
        phase: 4,
        name: '低優先度問題の解決',
        files: lowFiles,
        duration: '4-6週間',
        priority: 'low'
      });
    }

    return plan;
  }

  /**
   * レガシーリファクタリングレポートを生成
   * @param {Array} analysisResults - 分析結果
   * @returns {Object} レポート
   */
  generateLegacyRefactorReport(analysisResults) {
    const totalIssues = analysisResults.reduce((sum, r) => sum + r.totalIssues, 0);
    const issuesByType = this.groupIssuesByType(analysisResults);
    const issuesBySeverity = this.groupIssuesBySeverity(analysisResults);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: analysisResults.length,
        totalIssues,
        averageIssuesPerFile: totalIssues / analysisResults.length
      },
      issues: {
        byType: issuesByType,
        bySeverity: issuesBySeverity
      },
      files: {
        critical: analysisResults.filter(r => r.severity === 'critical').length,
        high: analysisResults.filter(r => r.severity === 'high').length,
        medium: analysisResults.filter(r => r.severity === 'medium').length,
        low: analysisResults.filter(r => r.severity === 'low').length
      },
      refactorPlan: this.generateRefactorPlan(analysisResults),
      recommendations: this.generateOverallRecommendations(analysisResults)
    };
  }

  /**
   * 問題をタイプ別にグループ化
   * @param {Array} analysisResults - 分析結果
   * @returns {Object} グループ化された問題
   */
  groupIssuesByType(analysisResults) {
    const groups = {};
    analysisResults.forEach(result => {
      result.issues.forEach(issue => {
        groups[issue.type] = (groups[issue.type] || 0) + 1;
      });
    });
    return groups;
  }

  /**
   * 問題を深刻度別にグループ化
   * @param {Array} analysisResults - 分析結果
   * @returns {Object} グループ化された問題
   */
  groupIssuesBySeverity(analysisResults) {
    const groups = { critical: 0, high: 0, medium: 0, low: 0 };
    analysisResults.forEach(result => {
      result.issues.forEach(issue => {
        groups[issue.severity] = (groups[issue.severity] || 0) + 1;
      });
    });
    return groups;
  }

  /**
   * 全体の推奨事項を生成
   * @param {Array} analysisResults - 分析結果
   * @returns {Array} 推奨事項
   */
  generateOverallRecommendations(analysisResults) {
    const recommendations = [];
    const report = this.generateLegacyRefactorReport(analysisResults);

    if (report.files.critical > 0) {
      recommendations.push({
        type: 'critical',
        priority: 'critical',
        action: 'クリティカルな問題を即座に解決',
        count: report.files.critical,
        details: 'システムの安定性に影響する問題を優先的に修正してください'
      });
    }

    if (report.files.high > 0) {
      recommendations.push({
        type: 'high',
        priority: 'high',
        action: '高優先度問題を段階的に解決',
        count: report.files.high,
        details: '設計の一貫性を向上させるため、高優先度問題を修正してください'
      });
    }

    if (report.summary.averageIssuesPerFile > 5) {
      recommendations.push({
        type: 'refactor',
        priority: 'medium',
        action: '大規模リファクタリングを実施',
        details: 'ファイルあたりの問題数が多いため、大規模なリファクタリングを検討してください'
      });
    }

    return recommendations;
  }
}

/**
 * グローバルレガシーリファクタリング管理インスタンス
 */
export const legacyRefactorManager = new LegacyRefactorManager();

export default legacyRefactorManager;
