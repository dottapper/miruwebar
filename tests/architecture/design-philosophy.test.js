// tests/architecture/design-philosophy.test.js
// 設計思想管理システムのテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { designPhilosophyManager, DESIGN_PRINCIPLES, FEATURE_PRIORITY } from '../../src/architecture/design-philosophy.js';

describe('DesignPhilosophyManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DesignPhilosophyManager();
  });

  describe('設計原則の管理', () => {
    it('デフォルトの設計原則が設定される', () => {
      expect(manager.principles.has(DESIGN_PRINCIPLES.STABILITY_FIRST)).toBe(true);
      expect(manager.principles.has(DESIGN_PRINCIPLES.CONSISTENT_ABSTRACTION)).toBe(true);
      expect(manager.principles.has(DESIGN_PRINCIPLES.SINGLE_RESPONSIBILITY)).toBe(true);
    });

    it('設計原則の詳細が正しく取得される', () => {
      const principle = manager.principles.get(DESIGN_PRINCIPLES.STABILITY_FIRST);
      expect(principle.name).toBe('安定性優先');
      expect(principle.description).toContain('既存機能の安定化');
      expect(principle.rules).toHaveLength(3);
      expect(principle.metrics).toHaveProperty('testCoverage');
    });
  });

  describe('機能の登録', () => {
    it('機能が正しく登録される', () => {
      manager.registerFeature('test-feature', {
        priority: FEATURE_PRIORITY.HIGH,
        testCoverage: 0.9,
        documented: true,
        usageDuration: 1000 * 60 * 60 * 24 * 30, // 30日
        bugRate: 0.1
      });

      const feature = manager.featureRegistry.get('test-feature');
      expect(feature).toBeTruthy();
      expect(feature.priority).toBe(FEATURE_PRIORITY.HIGH);
      expect(feature.stabilityScore).toBeGreaterThan(0);
    });

    it('安定性スコアが正しく計算される', () => {
      const config = {
        testCoverage: 0.9,
        documented: true,
        usageDuration: 1000 * 60 * 60 * 24 * 180, // 6ヶ月
        bugRate: 0.05
      };

      const score = manager.calculateStabilityScore(config);
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('技術的負債の管理', () => {
    it('技術的負債が正しく記録される', () => {
      manager.recordTechnicalDebt({
        description: 'テストコードの重複',
        impactScope: 'component',
        difficulty: 'low',
        urgency: 'medium'
      });

      expect(manager.technicalDebt).toHaveLength(1);
      expect(manager.technicalDebt[0].severity).toBe('medium');
    });

    it('技術的負債の深刻度が正しく計算される', () => {
      const criticalDebt = {
        description: 'システム全体の設計問題',
        impactScope: 'system',
        difficulty: 'high',
        urgency: 'critical'
      };

      const severity = manager.calculateDebtSeverity(criticalDebt);
      expect(severity).toBe('critical');
    });
  });

  describe('機能追加の可否判定', () => {
    beforeEach(() => {
      // テスト用の機能を登録
      manager.registerFeature('critical-feature', {
        priority: FEATURE_PRIORITY.CRITICAL,
        testCoverage: 0.95,
        documented: true,
        usageDuration: 1000 * 60 * 60 * 24 * 90,
        bugRate: 0.02
      });

      manager.registerFeature('unstable-feature', {
        priority: FEATURE_PRIORITY.CRITICAL,
        testCoverage: 0.5,
        documented: false,
        usageDuration: 1000 * 60 * 60 * 24 * 7,
        bugRate: 0.3
      });
    });

    it('安定したシステムでは新機能追加が許可される', () => {
      const result = manager.canAddFeature('new-feature', {
        priority: FEATURE_PRIORITY.MEDIUM,
        testCoverage: 0.8
      });

      expect(result.canAdd).toBe(true);
    });

    it('不安定なシステムでは新機能追加がブロックされる', () => {
      // 不安定な機能をクリティカルに設定
      const unstableFeature = manager.featureRegistry.get('unstable-feature');
      unstableFeature.priority = FEATURE_PRIORITY.CRITICAL;

      const result = manager.canAddFeature('new-feature', {
        priority: FEATURE_PRIORITY.HIGH,
        testCoverage: 0.8
      });

      expect(result.canAdd).toBe(false);
      expect(result.reasons).toContain('クリティカル機能の安定性が不足');
    });
  });

  describe('安定性要件のチェック', () => {
    it('クリティカル機能の安定性がチェックされる', () => {
      manager.registerFeature('critical-feature', {
        priority: FEATURE_PRIORITY.CRITICAL,
        stabilityScore: 0.5
      });

      const result = manager.checkStabilityRequirements([
        manager.featureRegistry.get('critical-feature')
      ]);

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('クリティカル機能「critical-feature」の安定性が不足');
    });

    it('テストカバレッジがチェックされる', () => {
      // モックのテストカバレッジを設定
      manager.calculateOverallTestCoverage = () => 0.5;

      const result = manager.checkStabilityRequirements([]);
      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('全体のテストカバレッジが不足');
    });
  });

  describe('技術的負債レベルのチェック', () => {
    it('技術的負債レベルがチェックされる', () => {
      // 高レベルの技術的負債を追加
      for (let i = 0; i < 10; i++) {
        manager.recordTechnicalDebt({
          description: `負債 ${i}`,
          impactScope: 'system',
          difficulty: 'high',
          urgency: 'critical'
        });
      }

      const result = manager.checkDebtLevel(0.8);
      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('技術的負債レベルが高すぎます');
    });
  });

  describe('抽象化一貫性のチェック', () => {
    it('抽象化レベルの混在がチェックされる', () => {
      const result = manager.checkAbstractionConsistency({
        levels: ['system', 'dom']
      });

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('高レベル（統合システム）と低レベル（DOM操作）が混在');
    });

    it('一貫した抽象化レベルは許可される', () => {
      const result = manager.checkAbstractionConsistency({
        levels: ['component', 'service']
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('推奨事項の生成', () => {
    it('安定性問題に対する推奨事項が生成される', () => {
      const checks = {
        stability: { passed: false, violations: [] },
        debt: { passed: true, violations: [] },
        abstraction: { passed: true, violations: [] }
      };

      const recommendations = manager.generateRecommendations(checks);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('stability');
      expect(recommendations[0].priority).toBe('high');
    });

    it('技術的負債問題に対する推奨事項が生成される', () => {
      const checks = {
        stability: { passed: true, violations: [] },
        debt: { passed: false, violations: [] },
        abstraction: { passed: true, violations: [] }
      };

      const recommendations = manager.generateRecommendations(checks);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('debt');
    });
  });

  describe('設計品質レポートの生成', () => {
    it('設計品質レポートが正しく生成される', () => {
      // テスト用のデータを追加
      manager.registerFeature('test-feature', {
        priority: FEATURE_PRIORITY.HIGH,
        testCoverage: 0.9
      });

      manager.recordTechnicalDebt({
        description: 'テスト負債',
        impactScope: 'component',
        difficulty: 'low',
        urgency: 'medium'
      });

      const report = manager.generateDesignQualityReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('principles');
      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('quality');
      expect(report).toHaveProperty('technicalDebt');
      expect(report).toHaveProperty('recommendations');
    });

    it('平均安定性が正しく計算される', () => {
      manager.registerFeature('feature1', { stabilityScore: 0.8 });
      manager.registerFeature('feature2', { stabilityScore: 0.6 });

      const average = manager.calculateAverageStability();
      expect(average).toBe(0.7);
    });

    it('全体の安定性スコアが正しく計算される', () => {
      manager.registerFeature('feature1', { stabilityScore: 0.8 });
      manager.calculateOverallTestCoverage = () => 0.9;
      manager.getTechnicalDebtLevel = () => 0.2;

      const score = manager.calculateOverallStabilityScore();
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('エラーレポートの生成', () => {
    it('エラーレポートが正しく生成される', () => {
      // テスト用のエラーを追加
      manager.addToErrorHistory({
        type: 'network',
        level: 'high',
        message: 'Network error',
        timestamp: Date.now(),
        context: {}
      });

      const report = manager.generateErrorReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('totalErrors');
      expect(report).toHaveProperty('errorsByType');
      expect(report).toHaveProperty('errorsByLevel');
      expect(report).toHaveProperty('recentErrors');
      expect(report).toHaveProperty('userPreferences');
    });
  });
});
