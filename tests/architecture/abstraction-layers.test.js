// tests/architecture/abstraction-layers.test.js
// 抽象化レイヤー管理システムのテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { abstractionLayerManager, ABSTRACTION_LEVELS, LAYER_PROTOCOLS } from '../../src/architecture/abstraction-layers.js';

describe('AbstractionLayerManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AbstractionLayerManager();
  });

  describe('レイヤーの登録', () => {
    it('レイヤーが正しく登録される', () => {
      const config = {
        name: 'テストレイヤー',
        description: 'テスト用のレイヤー',
        responsibilities: ['テスト実行', '結果検証'],
        interfaces: ['TestRunner', 'ResultValidator'],
        dependencies: [],
        dependents: []
      };

      manager.registerLayer('test-layer', config);

      const layer = manager.layers.get('test-layer');
      expect(layer).toBeTruthy();
      expect(layer.name).toBe('テストレイヤー');
      expect(layer.responsibilities).toHaveLength(2);
    });

    it('インターフェースが正しく登録される', () => {
      manager.registerInterface('TestInterface', 'test-layer');

      const interfaceInfo = manager.interfaces.get('TestInterface');
      expect(interfaceInfo).toBeTruthy();
      expect(interfaceInfo.name).toBe('TestInterface');
      expect(interfaceInfo.layer).toBe('test-layer');
    });
  });

  describe('依存関係の管理', () => {
    beforeEach(() => {
      // テスト用のレイヤーを登録
      manager.registerLayer('layer1', {
        name: 'レイヤー1',
        responsibilities: ['責任1'],
        interfaces: ['Interface1'],
        dependencies: [],
        dependents: ['layer2']
      });

      manager.registerLayer('layer2', {
        name: 'レイヤー2',
        responsibilities: ['責任2'],
        interfaces: ['Interface2'],
        dependencies: ['layer1'],
        dependents: []
      });

      manager.registerInterface('Interface1', 'layer1');
      manager.registerInterface('Interface2', 'layer2');
    });

    it('有効な依存関係が登録される', () => {
      manager.registerDependency('layer2', 'layer1', 'Interface1');

      const dependencies = manager.dependencies.get('layer2');
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].from).toBe('layer2');
      expect(dependencies[0].to).toBe('layer1');
      expect(dependencies[0].interface).toBe('Interface1');
    });

    it('無効な依存関係が検出される', () => {
      manager.registerDependency('layer1', 'layer2', 'Interface2');

      const violations = manager.violations;
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('unauthorized-dependency');
    });

    it('存在しないレイヤーへの依存関係が検出される', () => {
      manager.registerDependency('layer1', 'nonexistent', 'Interface1');

      const violations = manager.violations;
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('invalid-dependency');
    });
  });

  describe('レイヤー間通信', () => {
    beforeEach(() => {
      manager.registerLayer('sender', {
        name: '送信レイヤー',
        responsibilities: ['送信'],
        interfaces: ['SenderInterface'],
        dependencies: [],
        dependents: ['receiver']
      });

      manager.registerLayer('receiver', {
        name: '受信レイヤー',
        responsibilities: ['受信'],
        interfaces: ['ReceiverInterface'],
        dependencies: ['sender'],
        dependents: []
      });

      manager.registerInterface('SenderInterface', 'sender');
      manager.registerInterface('ReceiverInterface', 'receiver');
      manager.registerDependency('receiver', 'sender', 'SenderInterface');
    });

    it('有効な通信が実行される', async () => {
      const result = await manager.communicate('receiver', 'sender', 'SenderInterface', { test: 'data' });

      expect(result.success).toBe(true);
      expect(result.from).toBe('receiver');
      expect(result.to).toBe('sender');
      expect(result.interface).toBe('SenderInterface');
    });

    it('存在しない依存関係での通信がエラーになる', async () => {
      await expect(
        manager.communicate('sender', 'receiver', 'ReceiverInterface', { test: 'data' })
      ).rejects.toThrow('依存関係が存在しません');
    });
  });

  describe('レイヤーの責任チェック', () => {
    beforeEach(() => {
      manager.registerLayer('test-layer', {
        name: 'テストレイヤー',
        responsibilities: ['テスト実行', '結果検証'],
        interfaces: ['TestRunner'],
        dependencies: [],
        dependents: []
      });
    });

    it('レイヤーが責任を持つ場合にtrueを返す', () => {
      const hasResponsibility = manager.hasResponsibility('test-layer', 'テスト実行');
      expect(hasResponsibility).toBe(true);
    });

    it('レイヤーが責任を持たない場合にfalseを返す', () => {
      const hasResponsibility = manager.hasResponsibility('test-layer', '存在しない責任');
      expect(hasResponsibility).toBe(false);
    });
  });

  describe('抽象化レベルの取得', () => {
    it('レイヤーの抽象化レベルが正しく取得される', () => {
      manager.registerLayer('test-layer', {
        name: 'テストレイヤー',
        level: ABSTRACTION_LEVELS.COMPONENT,
        responsibilities: [],
        interfaces: [],
        dependencies: [],
        dependents: []
      });

      const level = manager.getAbstractionLevel('test-layer');
      expect(level).toBe(ABSTRACTION_LEVELS.COMPONENT);
    });

    it('存在しないレイヤーでnullを返す', () => {
      const level = manager.getAbstractionLevel('nonexistent');
      expect(level).toBeNull();
    });
  });

  describe('レイヤー間距離の計算', () => {
    it('レイヤー間の距離が正しく計算される', () => {
      const distance = manager.calculateLayerDistance(ABSTRACTION_LEVELS.DOM, ABSTRACTION_LEVELS.SYSTEM);
      expect(distance).toBe(4); // DOM(0) から SYSTEM(4) まで
    });

    it('同じレイヤー間の距離が0になる', () => {
      const distance = manager.calculateLayerDistance(ABSTRACTION_LEVELS.COMPONENT, ABSTRACTION_LEVELS.COMPONENT);
      expect(distance).toBe(0);
    });

    it('存在しないレイヤーで-1を返す', () => {
      const distance = manager.calculateLayerDistance('nonexistent1', 'nonexistent2');
      expect(distance).toBe(-1);
    });
  });

  describe('抽象化一貫性のチェック', () => {
    it('一貫した操作は許可される', () => {
      const operations = [
        { name: 'renderComponent', layer: 'component' },
        { name: 'updateComponent', layer: 'component' }
      ];

      const result = manager.checkAbstractionConsistency(operations);
      expect(result.consistent).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('混在した抽象化レベルが検出される', () => {
      const operations = [
        { name: 'querySelector', layer: 'dom' },
        { name: 'coordinateSystem', layer: 'system' }
      ];

      const result = manager.checkAbstractionConsistency(operations);
      expect(result.consistent).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('操作のレイヤー検出', () => {
    it('DOM操作が正しく検出される', () => {
      const operation = { name: 'querySelector', type: 'dom' };
      const layer = manager.detectLayerFromOperation(operation);
      expect(layer).toBe(ABSTRACTION_LEVELS.DOM);
    });

    it('コンポーネント操作が正しく検出される', () => {
      const operation = { name: 'renderComponent', type: 'component' };
      const layer = manager.detectLayerFromOperation(operation);
      expect(layer).toBe(ABSTRACTION_LEVELS.COMPONENT);
    });

    it('サービス操作が正しく検出される', () => {
      const operation = { name: 'fetchData', type: 'service' };
      const layer = manager.detectLayerFromOperation(operation);
      expect(layer).toBe(ABSTRACTION_LEVELS.SERVICE);
    });
  });

  describe('抽象化レイヤーレポートの生成', () => {
    it('抽象化レイヤーレポートが正しく生成される', () => {
      // テスト用のデータを追加
      manager.registerLayer('test-layer', {
        name: 'テストレイヤー',
        responsibilities: ['テスト'],
        interfaces: ['TestInterface'],
        dependencies: [],
        dependents: []
      });

      manager.registerInterface('TestInterface', 'test-layer');

      const report = manager.generateAbstractionReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('layers');
      expect(report).toHaveProperty('interfaces');
      expect(report).toHaveProperty('dependencies');
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('quality');
      expect(report).toHaveProperty('recommendations');
    });

    it('一貫性スコアが正しく計算される', () => {
      const score = manager.calculateConsistencyScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('分離スコアが正しく計算される', () => {
      const score = manager.calculateSeparationScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('結合度スコアが正しく計算される', () => {
      const score = manager.calculateCouplingScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('違反のグループ化', () => {
    beforeEach(() => {
      // テスト用の違反を追加
      manager.recordViolation({
        type: 'unauthorized-dependency',
        message: 'テスト違反1',
        severity: 'critical'
      });

      manager.recordViolation({
        type: 'interface-mismatch',
        message: 'テスト違反2',
        severity: 'high'
      });
    });

    it('違反がタイプ別にグループ化される', () => {
      const groups = manager.groupViolationsByType();
      expect(groups['unauthorized-dependency']).toBe(1);
      expect(groups['interface-mismatch']).toBe(1);
    });

    it('違反が深刻度別にグループ化される', () => {
      const groups = manager.groupViolationsBySeverity();
      expect(groups.critical).toBe(1);
      expect(groups.high).toBe(1);
    });
  });

  describe('レイヤー推奨事項の生成', () => {
    it('一貫性が低い場合の推奨事項が生成される', () => {
      // 一貫性スコアを低く設定
      manager.calculateConsistencyScore = () => 0.5;

      const recommendations = manager.generateLayerRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('consistency');
    });

    it('分離が不十分な場合の推奨事項が生成される', () => {
      // 分離スコアを低く設定
      manager.calculateSeparationScore = () => 0.3;

      const recommendations = manager.generateLayerRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('separation');
    });

    it('結合度が高い場合の推奨事項が生成される', () => {
      // 結合度スコアを高く設定
      manager.calculateCouplingScore = () => 0.8;

      const recommendations = manager.generateLayerRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('coupling');
    });
  });
});
