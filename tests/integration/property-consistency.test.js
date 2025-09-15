/**
 * プロパティ不整合検知テスト
 * テンプレート管理システムとプロジェクトデータ間の整合性を検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetMocks } from '../setup.js';
import dataMigrationHelper from '../../src/utils/data-migration-helper.js';
import templateStateManager from '../../src/utils/template-state-manager.js';

describe('プロパティ不整合検知と修復', () => {
  beforeEach(() => {
    resetMocks();
    dataMigrationHelper.reset();
    templateStateManager.reset();
    
    // LocalStorageのモック初期化
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  describe('データマイグレーション', () => {
    it('旧プロパティが新プロパティに正しく変換される', () => {
      // 旧プロパティを持つテンプレートデータ
      const oldTemplateData = JSON.stringify([
        {
          id: 'test-template',
          name: 'Test Template',
          logoImage: 'data:image/png;base64,test', // 旧プロパティ
          createdAt: '2023-01-01T00:00:00.000Z',  // 旧プロパティ
          updatedAt: '2023-01-01T12:00:00.000Z',  // 旧プロパティ
          settings: {
            loadingScreen: {
              message: 'Loading...', // 旧プロパティ
              logoSrc: 'test-logo.png' // 旧プロパティ
            },
            startScreen: {
              logoImage: 'start-logo.png', // 旧プロパティ
              message: 'Start Message'     // 旧プロパティ
            }
          }
        }
      ]);

      global.localStorage.getItem.mockReturnValue(oldTemplateData);

      // マイグレーション実行
      const result = dataMigrationHelper.safeLoadTemplates(oldTemplateData);

      expect(result.templates).toHaveLength(1);
      expect(result.migrated).toBe(1);
      
      const migratedTemplate = result.templates[0];
      
      // 旧プロパティが新プロパティに変換されていることを確認
      expect(migratedTemplate.logo).toBe('data:image/png;base64,test');
      expect(migratedTemplate.logoImage).toBeUndefined();
      
      expect(migratedTemplate.created).toBeDefined();
      expect(migratedTemplate.updated).toBeDefined();
      expect(migratedTemplate.createdAt).toBeUndefined();
      expect(migratedTemplate.updatedAt).toBeUndefined();

      // settings内のプロパティも変換されていることを確認
      expect(migratedTemplate.settings.loadingScreen.loadingMessage).toBe('Loading...');
      expect(migratedTemplate.settings.loadingScreen.message).toBeUndefined();
      
      expect(migratedTemplate.settings.startScreen.logo).toBe('start-logo.png');
      expect(migratedTemplate.settings.startScreen.logoImage).toBeUndefined();
      expect(migratedTemplate.settings.startScreen.title).toBe('Start Message');
      expect(migratedTemplate.settings.startScreen.message).toBeUndefined();
    });

    it('破損したテンプレートデータが修復される', () => {
      // 破損データ（必須プロパティが欠損）
      const corruptedData = JSON.stringify([
        {
          // idが欠損
          name: null, // null値
          settings: null // 設定オブジェクトが欠損
        },
        {
          id: 'partial-template',
          name: 'Partial Template',
          settings: {
            loadingScreen: {
              // 必須プロパティが一部欠損
              backgroundColor: '#000000'
            }
            // startScreen, guideScreenが欠損
          }
        }
      ]);

      const result = dataMigrationHelper.safeLoadTemplates(corruptedData);

      expect(result.templates).toHaveLength(3); // 2つ + デフォルト
      expect(result.errors).toBe(1); // 1つ目は修復不可
      expect(result.created).toBe(2); // フォールバック + デフォルト

      // 2つ目のテンプレートが修復されていることを確認
      const repairedTemplate = result.templates.find(t => t.id === 'partial-template');
      expect(repairedTemplate).toBeDefined();
      expect(repairedTemplate.settings.startScreen).toBeDefined();
      expect(repairedTemplate.settings.guideScreen).toBeDefined();
      expect(repairedTemplate.settings.loadingScreen.logoType).toBe('none'); // デフォルト値
    });

    it('プロジェクトの二重管理プロパティが統一される', () => {
      // selectedScreenId と loadingScreen.template の両方を持つプロジェクト
      const inconsistentProjectData = JSON.stringify([
        {
          id: 'inconsistent-project',
          name: 'Inconsistent Project',
          selectedScreenId: 'template1',           // 旧形式
          loadingScreen: {
            selectedScreenId: 'template2',         // 中間形式
            template: 'template3',                 // 新形式
            enabled: true
          }
        }
      ]);

      const result = dataMigrationHelper.safeLoadProjects(inconsistentProjectData);

      expect(result.projects).toHaveLength(1);
      expect(result.migrated).toBe(1);

      const normalizedProject = result.projects[0];
      
      // 新形式の template が優先されることを確認
      expect(normalizedProject.loadingScreen.template).toBe('template3');
      
      // 旧プロパティが削除されていることを確認
      expect(normalizedProject.selectedScreenId).toBeUndefined();
      expect(normalizedProject.loadingScreen.selectedScreenId).toBeUndefined();
    });
  });

  describe('統一状態管理', () => {
    it('テンプレートIDの正規化が正しく動作する', () => {
      // 複数のソースからテンプレートIDを正規化
      const testCases = [
        {
          input: { loadingScreen: { template: 'new-template' } },
          expected: 'new-template'
        },
        {
          input: { loadingScreen: { selectedScreenId: 'old-template' } },
          expected: 'old-template'
        },
        {
          input: { selectedScreenId: 'very-old-template' },
          expected: 'very-old-template'
        },
        {
          input: { loadingScreen: { template: 'none' } },
          expected: 'default'
        },
        {
          input: {},
          expected: 'default'
        }
      ];

      testCases.forEach(({ input, expected }, index) => {
        const normalized = templateStateManager.normalizeTemplateId(input);
        expect(normalized).toBe(expected, `Test case ${index + 1} failed`);
      });
    });

    it('整合性チェックが不整合を検出する', async () => {
      // 不整合データをセットアップ
      const inconsistentProjects = [
        {
          id: 'project1',
          loadingScreen: {
            selectedScreenId: 'template1',
            template: 'template2'
          }
        },
        {
          id: 'project2',
          selectedScreenId: 'template3',
          loadingScreen: {
            template: 'template4'
          }
        }
      ];

      global.localStorage.getItem.mockReturnValue(JSON.stringify(inconsistentProjects));

      // DOM要素の模擬
      const mockSelect = {
        value: 'template5'
      };
      global.document = {
        getElementById: vi.fn(() => mockSelect)
      };

      // 状態管理システム初期化
      templateStateManager.initialize({ loadingScreen: { template: 'template6' } });

      // 整合性チェック実行
      const result = templateStateManager.checkConsistency();

      expect(result.isConsistent).toBe(false);
      expect(result.summary.domMismatch).toBe(true);
      expect(result.summary.inconsistentProjects).toBe(2);
      expect(result.issues).toHaveLength(2); // DOM不整合 + プロジェクト不整合

      // 推奨アクションが含まれていることを確認
      expect(result.recommendations).toContain('DOM要素との同期を実行してください');
      expect(result.recommendations).toContain('プロジェクトデータの正規化を実行してください');
    });

    it('強制同期が不整合を修復する', async () => {
      // 不整合状態をセットアップ
      templateStateManager.initialize({ loadingScreen: { template: 'correct-template' } });

      // DOM要素の模擬
      const mockSelect = {
        value: 'wrong-template',
        dispatchEvent: vi.fn()
      };
      global.document = {
        getElementById: vi.fn(() => mockSelect)
      };

      // プロジェクトデータの模擬
      const projects = [
        {
          id: 'test-project',
          updated: Date.now() - 1000, // 最近更新されたプロジェクト
          loadingScreen: {
            selectedScreenId: 'old-template'
          }
        }
      ];
      global.localStorage.getItem.mockReturnValue(JSON.stringify(projects));

      // 強制同期実行
      const syncResult = await templateStateManager.forceSynchronization();

      expect(syncResult.success).toBe(true);
      expect(mockSelect.value).toBe('correct-template');
      expect(mockSelect.dispatchEvent).toHaveBeenCalled();

      // LocalStorageが更新されていることを確認
      const setItemCalls = global.localStorage.setItem.mock.calls;
      expect(setItemCalls.length).toBeGreaterThan(0);

      // 最終的な整合性チェック結果も含まれていることを確認
      expect(syncResult.consistencyCheck).toBeDefined();
    });
  });

  describe('エラー境界', () => {
    it('JSON解析エラーが適切にハンドリングされる', () => {
      // 破損したJSONデータ
      const corruptedJSON = '{"invalid": json data}';
      
      const result = dataMigrationHelper.safeJsonParse(corruptedJSON, { fallback: true });
      
      expect(result).toEqual({ fallback: true });
      expect(dataMigrationHelper.getErrorLog()).toHaveLength(1);
      
      const errorLog = dataMigrationHelper.getErrorLog()[0];
      expect(errorLog.type).toBe('json_parse_error');
      expect(errorLog.message).toContain('JSON');
    });

    it('JSON修復機能が動作する', () => {
      // 修復可能な破損JSON（末尾カンマ、未閉じ括弧）
      const fixableJSON = '{"name": "test", "data": {"value": 1,}}';
      
      const result = dataMigrationHelper.safeJsonParse(fixableJSON, null, { repair: true });
      
      expect(result).toEqual({
        name: 'test',
        data: { value: 1 }
      });
    });

    it('破損データ時のフォールバック機能が動作する', () => {
      // 完全に破損したデータ
      const totallyCorrupted = 'not json at all';
      
      const templateResult = dataMigrationHelper.safeLoadTemplates(totallyCorrupted);
      
      expect(templateResult.templates).toHaveLength(1); // デフォルトテンプレート
      expect(templateResult.templates[0].id).toBe('default');
      expect(templateResult.created).toBe(1);
      expect(templateResult.errors).toBe(1);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データのマイグレーションが効率的に処理される', () => {
      // 1000個のテンプレートデータを生成
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(), // 旧プロパティ
        logoImage: `logo-${i}.png`, // 旧プロパティ
        settings: {
          loadingScreen: {
            message: `Loading ${i}...`, // 旧プロパティ
          }
        }
      }));

      const startTime = performance.now();
      const result = dataMigrationHelper.safeLoadTemplates(JSON.stringify(largeDataset));
      const endTime = performance.now();

      expect(result.templates).toHaveLength(1001); // 1000 + デフォルト
      expect(result.migrated).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内

      // 統計情報の確認
      const stats = dataMigrationHelper.getStats();
      expect(stats.totalMigrations).toBe(1000);
      expect(stats.templateMigrations).toBe(1000);
    });

    it('整合性チェックが大量プロジェクトで効率的に動作する', () => {
      // 大量の不整合プロジェクト
      const projects = Array.from({ length: 500 }, (_, i) => ({
        id: `project-${i}`,
        selectedScreenId: `template-${i}`,
        loadingScreen: {
          template: `different-template-${i}`
        }
      }));

      global.localStorage.getItem.mockReturnValue(JSON.stringify(projects));
      templateStateManager.initialize({ loadingScreen: { template: 'current' } });

      const startTime = performance.now();
      const result = templateStateManager.checkConsistency();
      const endTime = performance.now();

      expect(result.summary.totalProjects).toBe(500);
      expect(result.summary.inconsistentProjects).toBe(500);
      expect(endTime - startTime).toBeLessThan(500); // 500ms以内
    });
  });

  describe('実際のデータシナリオ', () => {
    it('レガシーシステムからの移行データが正しく処理される', () => {
      // 実際のレガシーデータ形式をシミュレート
      const legacyData = {
        templates: JSON.stringify([
          {
            id: 'legacy-template',
            name: 'Legacy Template',
            createdAt: '2022-12-01T10:00:00Z',
            logoImage: 'legacy-logo.png',
            backgroundImage: '#ffffff',
            textColor: '#000000',
            settings: {
              loadingScreen: {
                logo: 'loading-logo.png',
                msg: 'Please wait...',
              }
            }
          }
        ]),
        projects: JSON.stringify([
          {
            id: 'legacy-project',
            name: 'Legacy Project',
            createDate: 1670000000000,
            lastModified: 1670086400000,
            selectedScreenId: 'legacy-template',
            loadingScreen: {
              enabled: true
            }
          }
        ])
      };

      // テンプレートマイグレーション
      const templateResult = dataMigrationHelper.safeLoadTemplates(legacyData.templates);
      expect(templateResult.migrated).toBe(1);
      
      const migratedTemplate = templateResult.templates.find(t => t.id === 'legacy-template');
      expect(migratedTemplate.logo).toBe('legacy-logo.png');
      expect(migratedTemplate.created).toBeDefined();
      expect(migratedTemplate.backgroundColor).toBe('#ffffff');

      // プロジェクトマイグレーション
      const projectResult = dataMigrationHelper.safeLoadProjects(legacyData.projects);
      expect(projectResult.migrated).toBe(1);
      
      const migratedProject = projectResult.projects[0];
      expect(migratedProject.loadingScreen.template).toBe('legacy-template');
      expect(migratedProject.created).toBeDefined();
      expect(migratedProject.updated).toBeDefined();
    });
  });
});