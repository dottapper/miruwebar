// tests/integration/storage-integration.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveProject, 
  getProject, 
  getProjects, 
  deleteProject 
} from '../../src/api/projects.js';
import { 
  saveModelToIDB, 
  loadModelBlob, 
  loadModelMeta, 
  removeModel 
} from '../../src/storage/indexeddb-storage.js';
import { testLogger } from '../../src/utils/logger.js';
import { createMockFile, resetMocks } from '../setup.js';

describe('Storage Integration Tests', () => {
  beforeEach(() => {
    resetMocks();
    testLogger.clearLogs();
    vi.clearAllMocks();
    
    // localStorageの初期化
    localStorage.getItem.mockReturnValue(JSON.stringify([]));
    localStorage.setItem.mockImplementation(() => {});
  });

  describe('Project Save and Load Flow', () => {
    it('should complete full save and load cycle', async () => {
      // 1. プロジェクトの保存
      const projectData = {
        id: 'integration-test-project',
        name: 'Integration Test Project',
        description: 'Test project for integration testing'
      };

      const mockModels = [
        {
          fileName: 'integration-model1.glb',
          fileSize: 1024,
          modelData: createMockFile('integration-model1.glb', 'mock-data-1')
        },
        {
          fileName: 'integration-model2.glb',
          fileSize: 2048,
          modelData: createMockFile('integration-model2.glb', 'mock-data-2')
        }
      ];

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue(mockModels)
        }
      };

      // IndexedDB保存のモック
      saveModelToIDB.mockImplementation((modelId, data, meta) => {
        return Promise.resolve(modelId);
      });

      const savedProject = await saveProject(projectData, mockViewerInstance);

      // 保存結果の検証
      expect(savedProject).toBeDefined();
      expect(savedProject.id).toBe('integration-test-project');
      expect(savedProject.modelSettings).toHaveLength(2);
      expect(saveModelToIDB).toHaveBeenCalledTimes(2);

      // 2. プロジェクトの読み込み
      const mockProjectData = [savedProject];

      localStorage.getItem.mockReturnValue(JSON.stringify(mockProjectData));

      // IndexedDB読み込みのモック
      loadModelBlob.mockImplementation((modelId) => {
        return Promise.resolve(createMockFile(`${modelId}.glb`, 'mock-data'));
      });

      loadModelMeta.mockImplementation((modelId) => {
        return Promise.resolve({
          modelId,
          fileName: `${modelId}.glb`,
          fileSize: 1024
        });
      });

      const loadedProject = await getProject(savedProject.id);

      // 読み込み結果の検証
      expect(loadedProject).toBeDefined();
      expect(loadedProject.id).toBe(savedProject.id);
    });
  });

  describe('Multiple Projects Management', () => {
    it('should handle multiple projects correctly', async () => {
      // 複数のプロジェクトを作成
      const projects = [
        { id: 'project1', name: 'Project 1' },
        { id: 'project2', name: 'Project 2' },
        { id: 'project3', name: 'Project 3' }
      ];

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue([])
        }
      };

      saveModelToIDB.mockResolvedValue('model-id');

      // 各プロジェクトを保存
      for (const projectData of projects) {
        await saveProject(projectData, mockViewerInstance);
      }

      // 全プロジェクトの取得
      const mockProjectsData = [
        { id: 'project1', name: 'Project 1', modelSettings: [] },
        { id: 'project2', name: 'Project 2', modelSettings: [] },
        { id: 'project3', name: 'Project 3', modelSettings: [] }
      ];

      localStorage.getItem.mockReturnValue(JSON.stringify(mockProjectsData));

      const allProjects = getProjects();

      expect(allProjects).toHaveLength(3);
      expect(allProjects.map(p => p.name)).toEqual(['Project 1', 'Project 2', 'Project 3']);
    });
  });

  describe('Project Deletion with Models', () => {
    it('should delete project and associated models', async () => {
      // プロジェクトを作成
      const projectData = {
        id: 'delete-test-project',
        name: 'Delete Test Project'
      };

      const mockModels = [
        {
          fileName: 'delete-model1.glb',
          fileSize: 1024,
          modelData: createMockFile('delete-model1.glb', 'mock-data')
        }
      ];

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue(mockModels)
        }
      };

      saveModelToIDB.mockResolvedValue('model-id');

      const savedProject = await saveProject(projectData, mockViewerInstance);

      // プロジェクト削除のモック
      removeModel.mockResolvedValue(undefined);

      const mockProjectData = [savedProject];

      localStorage.getItem.mockReturnValue(JSON.stringify(mockProjectData));

      const result = await deleteProject(savedProject.id);

      // 削除の検証
      expect(result).toBe(true);
      expect(removeModel).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle IndexedDB errors gracefully', async () => {
      const projectData = {
        id: 'error-test-project',
        name: 'Error Test Project'
      };

      const mockModels = [
        {
          fileName: 'error-model.glb',
          fileSize: 1024,
          modelData: createMockFile('error-model.glb', 'mock-data')
        }
      ];

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue(mockModels)
        }
      };

      // IndexedDB保存でエラーを発生
      saveModelToIDB.mockRejectedValue(new Error('IndexedDB error'));

      await expect(saveProject(projectData, mockViewerInstance))
        .rejects.toThrow('プロジェクト設定の保存に失敗しました');
    });

    it('should handle localStorage errors gracefully', async () => {
      const projectData = {
        id: 'localstorage-error-project',
        name: 'localStorage Error Project'
      };

      localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      await expect(saveProject(projectData))
        .rejects.toThrow('プロジェクト設定の保存に失敗しました');
    });
  });

  describe('Logger Integration in Storage Operations', () => {
    it('should log all storage operations', async () => {
      const projectData = {
        id: 'logging-test-project',
        name: 'Logging Test Project'
      };

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue([])
        }
      };

      saveModelToIDB.mockResolvedValue('model-id');

      await saveProject(projectData, mockViewerInstance);

      const logs = testLogger.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      // 成功ログの確認
      const successLogs = testLogger.getLogs('SUCCESS');
      expect(successLogs.length).toBeGreaterThan(0);

      // エラーログの確認（エラーがない場合）
      const errorLogs = testLogger.getLogs('ERROR');
      expect(errorLogs.length).toBe(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const projectData = {
        id: 'consistency-test-project',
        name: 'Consistency Test Project'
      };

      const mockModels = [
        {
          fileName: 'consistency-model.glb',
          fileSize: 1024,
          modelData: createMockFile('consistency-model.glb', 'mock-data')
        }
      ];

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue(mockModels)
        }
      };

      saveModelToIDB.mockResolvedValue('model-id');

      // 保存
      const savedProject = await saveProject(projectData, mockViewerInstance);

      // 保存されたデータの構造を検証
      expect(savedProject).toHaveProperty('id');
      expect(savedProject).toHaveProperty('name');
      expect(savedProject).toHaveProperty('modelSettings');
      expect(savedProject).toHaveProperty('created');
      expect(savedProject).toHaveProperty('updated');

      // モデル設定の検証
      expect(savedProject.modelSettings).toHaveLength(1);
      expect(savedProject.modelSettings[0]).toHaveProperty('modelId');
      expect(savedProject.modelSettings[0]).toHaveProperty('fileName');
      expect(savedProject.modelSettings[0]).toHaveProperty('fileSize');
    });
  });
});
