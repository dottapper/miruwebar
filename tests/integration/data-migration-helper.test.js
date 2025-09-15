/**
 * DataMigrationHelperの統合テスト
 * selectedScreenId → loadingScreen.template の移行処理をテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataMigrationHelper } from '../../src/utils/data-migration-helper.js';
import { resetMocks } from '../setup.js';

describe('DataMigrationHelper - selectedScreenId移行テスト', () => {
  let migrationHelper;

  beforeEach(() => {
    resetMocks();
    migrationHelper = new DataMigrationHelper();
  });

  describe('selectedScreenId → loadingScreen.template 移行', () => {
    it('selectedScreenIdが正しくloadingScreen.templateに移行される', () => {
      // 旧形式のプロジェクトデータ（selectedScreenIdのみ）
      const legacyProject = {
        id: 'test-project',
        name: 'Test Project',
        selectedScreenId: 'legacy-template'
      };

      // マイグレーション実行
      const migratedProject = migrationHelper.migrateProject(legacyProject);

      // 移行結果の検証
      expect(migratedProject).toBeDefined();
      expect(migratedProject.loadingScreen).toBeDefined();
      expect(migratedProject.loadingScreen.template).toBe('legacy-template');
      expect(migratedProject.loadingScreen.enabled).toBe(true);
      expect(migratedProject.selectedScreenId).toBeUndefined(); // 旧プロパティは削除
      expect(migratedProject._migrated).toBe(true); // マイグレーション実行済みフラグ
    });

    it('既存のloadingScreen.templateがdefaultの場合はselectedScreenIdで上書きされる', () => {
      // 中間形式のプロジェクトデータ（両方存在、templateがdefault）
      const mixedProject = {
        id: 'test-project',
        name: 'Test Project',
        selectedScreenId: 'legacy-template',
        loadingScreen: {
          enabled: true,
          template: 'default'
        }
      };

      // マイグレーション実行
      const migratedProject = migrationHelper.migrateProject(mixedProject);

      // 移行結果の検証
      expect(migratedProject.loadingScreen.template).toBe('legacy-template');
      expect(migratedProject.selectedScreenId).toBeUndefined();
      expect(migratedProject._migrated).toBe(true);
    });

    it('既存のloadingScreen.templateがdefault以外の場合はselectedScreenIdで上書きされない', () => {
      // 中間形式のプロジェクトデータ（両方存在、templateが既に設定済み）
      const mixedProject = {
        id: 'test-project',
        name: 'Test Project',
        selectedScreenId: 'legacy-template',
        loadingScreen: {
          enabled: true,
          template: 'existing-template'
        }
      };

      // マイグレーション実行
      const migratedProject = migrationHelper.migrateProject(mixedProject);

      // 移行結果の検証（既存のtemplateが保持される）
      expect(migratedProject.loadingScreen.template).toBe('existing-template');
      expect(migratedProject.selectedScreenId).toBeUndefined();
      expect(migratedProject._migrated).toBe(true);
    });

    it('loadingScreenが存在しない場合は新規作成される', () => {
      // 最小限のプロジェクトデータ
      const minimalProject = {
        id: 'test-project',
        name: 'Test Project',
        selectedScreenId: 'legacy-template'
      };

      // マイグレーション実行
      const migratedProject = migrationHelper.migrateProject(minimalProject);

      // 移行結果の検証
      expect(migratedProject.loadingScreen).toBeDefined();
      expect(migratedProject.loadingScreen.template).toBe('legacy-template');
      expect(migratedProject.loadingScreen.enabled).toBe(true);
      expect(migratedProject._migrated).toBe(true);
    });

    it('selectedScreenIdが存在しない場合はマイグレーションされない', () => {
      // 新形式のプロジェクトデータ（selectedScreenIdなし）
      const newFormatProject = {
        id: 'test-project',
        name: 'Test Project',
        loadingScreen: {
          enabled: true,
          template: 'new-template'
        }
      };

      // マイグレーション実行
      const migratedProject = migrationHelper.migrateProject(newFormatProject);

      // 移行結果の検証（変更なし）
      expect(migratedProject.loadingScreen.template).toBe('new-template');
      expect(migratedProject.selectedScreenId).toBeUndefined();
      expect(migratedProject._migrated).toBeUndefined(); // マイグレーションなし
    });
  });

  describe('複数プロジェクトの一括マイグレーション', () => {
    it('複数のプロジェクトが正しく一括マイグレーションされる', () => {
      // 複数のプロジェクトデータ
      const projects = [
        {
          id: 'project1',
          name: 'Project 1',
          selectedScreenId: 'template1'
        },
        {
          id: 'project2',
          name: 'Project 2',
          selectedScreenId: 'template2',
          loadingScreen: {
            enabled: true,
            template: 'default'
          }
        },
        {
          id: 'project3',
          name: 'Project 3',
          loadingScreen: {
            enabled: true,
            template: 'existing-template'
          }
        }
      ];

      // 一括マイグレーション実行
      const migratedProjects = projects.map(project => 
        migrationHelper.migrateProject(project)
      );

      // 各プロジェクトの移行結果を検証
      expect(migratedProjects[0].loadingScreen.template).toBe('template1');
      expect(migratedProjects[0].selectedScreenId).toBeUndefined();
      expect(migratedProjects[0]._migrated).toBe(true);

      expect(migratedProjects[1].loadingScreen.template).toBe('template2');
      expect(migratedProjects[1].selectedScreenId).toBeUndefined();
      expect(migratedProjects[1]._migrated).toBe(true);

      expect(migratedProjects[2].loadingScreen.template).toBe('existing-template');
      expect(migratedProjects[2].selectedScreenId).toBeUndefined();
      expect(migratedProjects[2]._migrated).toBeUndefined(); // マイグレーションなし
    });
  });

  describe('エラー処理', () => {
    it('無効なプロジェクトデータはnullを返す', () => {
      const invalidProjects = [
        null,
        undefined,
        'invalid',
        123,
        []
      ];

      invalidProjects.forEach((invalidProject, index) => {
        const result = migrationHelper.migrateProject(invalidProject, index);
        expect(result).toBeNull();
      });
    });

    it('空のオブジェクトは復元される', () => {
      const emptyProject = {};
      const result = migrationHelper.migrateProject(emptyProject);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.loadingScreen).toBeDefined();
      expect(result._fixed).toBe(true);
    });

    it('マイグレーション履歴が正しく記録される', () => {
      const legacyProject = {
        id: 'test-project',
        name: 'Test Project',
        selectedScreenId: 'legacy-template'
      };

      // マイグレーション実行
      migrationHelper.migrateProject(legacyProject);

      // マイグレーション履歴の確認
      const history = migrationHelper.getMigrationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('project');
      expect(history[0].id).toBe('test-project');
      expect(history[0].migrated).toBe(true);
    });
  });
});
