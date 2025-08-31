// tests/api/projects.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveProject, 
  getProject, 
  getProjects, 
  deleteProject,
  exportProjectBundleById,
  loadProjectModels
} from '../../src/api/projects.js';
import { testLogger } from '../../src/utils/logger.js';
import { createMockFile, resetMocks } from '../setup.js';

// 依存関係のモック
vi.mock('../../src/storage/indexeddb-storage.js', () => ({
  saveModelToIDB: vi.fn(),
  loadModelBlob: vi.fn(),
  loadModelMeta: vi.fn(),
  removeModel: vi.fn(),
  getStorageInfo: vi.fn(),
  clearAllModels: vi.fn()
}));

vi.mock('../../src/utils/publish.js', () => ({
  exportProjectBundle: vi.fn()
}));

import { saveModelToIDB, loadModelBlob, loadModelMeta, removeModel } from '../../src/storage/indexeddb-storage.js';
import { exportProjectBundle } from '../../src/utils/publish.js';

describe('Projects API', () => {
  beforeEach(() => {
    resetMocks();
    testLogger.clearLogs();
    vi.clearAllMocks();
    
    // localStorageのモック設定
    const mockProjects = [
      { id: 'project1', name: 'Test Project 1' },
      { id: 'project2', name: 'Test Project 2' }
    ];
    
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'miruwebAR_projects') {
        return JSON.stringify(mockProjects);
      }
      return null;
    });
    
    localStorage.setItem.mockImplementation(() => {});
  });

  describe('saveProject', () => {
    it('should save project successfully', async () => {
      const projectData = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      };

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue([])
        }
      };

      saveModelToIDB.mockResolvedValue('model-id');

      const result = await saveProject(projectData, mockViewerInstance);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-project');
      expect(result.name).toBe('Test Project');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should save project with models', async () => {
      const projectData = {
        id: 'test-project-with-models',
        name: 'Test Project with Models'
      };

      const mockModels = [
        {
          fileName: 'model1.glb',
          fileSize: 1024,
          modelData: createMockFile('model1.glb', 'mock-data-1')
        },
        {
          fileName: 'model2.glb',
          fileSize: 2048,
          modelData: createMockFile('model2.glb', 'mock-data-2')
        }
      ];

      const mockViewerInstance = {
        controls: {
          getAllModels: vi.fn().mockReturnValue(mockModels)
        }
      };

      saveModelToIDB.mockResolvedValue('model-id');

      const result = await saveProject(projectData, mockViewerInstance);

      expect(result).toBeDefined();
      expect(result.modelSettings).toHaveLength(2);
      expect(saveModelToIDB).toHaveBeenCalledTimes(2);
    });

    it('should handle save errors gracefully', async () => {
      const projectData = { id: 'error-project', name: 'Error Project' };
      
      localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      await expect(saveProject(projectData)).rejects.toThrow('プロジェクト設定の保存に失敗しました');
    });
  });

  describe('getProject', () => {
    it('should load project successfully', async () => {
      const projectId = 'project1';
      const mockProject = {
        id: 'project1',
        name: 'Test Project 1',
        modelSettings: [
          { modelId: 'model1', fileName: 'model1.glb' }
        ]
      };

      localStorage.getItem.mockReturnValue(JSON.stringify([mockProject]));

      const result = await getProject(projectId);

      expect(result).toBeDefined();
      expect(result.id).toBe('project1');
    });

    it('should return null for non-existent project', async () => {
      const projectId = 'non-existent';
      
      localStorage.getItem.mockReturnValue(JSON.stringify([]));

      const result = await getProject(projectId);

      expect(result).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      const projectId = 'error-project';
      
      localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = await getProject(projectId);
      expect(result).toBeNull();
    });
  });

  describe('getProjects', () => {
    it('should return all projects', async () => {
      const mockProjects = [
        { id: 'project1', name: 'Project 1' },
        { id: 'project2', name: 'Project 2' }
      ];

      localStorage.getItem.mockReturnValue(JSON.stringify(mockProjects));

      const result = getProjects();

      // getProjectsは実際のAPIではloadingScreenを追加するので、それを考慮
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('project1');
      expect(result[1].id).toBe('project2');
    });

    it('should return empty array when no projects exist', async () => {
      localStorage.getItem.mockReturnValue(null);

      const result = getProjects();

      expect(result).toEqual([]);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const projectId = 'project1';
      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        modelSettings: [
          { modelId: 'model1' },
          { modelId: 'model2' }
        ],
        savedModelIds: ['model1', 'model2']
      };

      localStorage.getItem.mockReturnValue(JSON.stringify([mockProject]));
      localStorage.setItem.mockImplementation(() => {});
      removeModel.mockResolvedValue(undefined);

      const result = await deleteProject(projectId);

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(removeModel).toHaveBeenCalledTimes(2);
    });

    it('should handle delete errors gracefully', async () => {
      const projectId = 'error-project';
      
      localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = await deleteProject(projectId);
      expect(result).toBe(false);
    });
  });

  describe('exportProjectBundleById', () => {
    it('should export project successfully', async () => {
      const projectId = 'project1';
      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        modelSettings: []
      };

      localStorage.getItem.mockReturnValue(JSON.stringify([mockProject]));
      exportProjectBundle.mockResolvedValue('exported-data');

      const result = await exportProjectBundleById(projectId);

      expect(result).toBe('exported-data');
      expect(exportProjectBundle).toHaveBeenCalled();
    });

    it('should handle export errors gracefully', async () => {
      const projectId = 'non-existent';
      
      localStorage.getItem.mockReturnValue(JSON.stringify([]));

      await expect(exportProjectBundleById(projectId)).rejects.toThrow('プロジェクトが見つかりません');
    });
  });

  describe('loadProjectModels', () => {
    it('should load project models successfully', async () => {
      const projectId = 'project1';
      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        modelSettings: [
          { modelId: 'model1', fileName: 'model1.glb' }
        ]
      };

      localStorage.getItem.mockReturnValue(JSON.stringify([mockProject]));
      loadModelBlob.mockResolvedValue(createMockFile('model1.glb', 'mock-data'));

      const result = await loadProjectModels(projectId);

      expect(result).toBeDefined();
      expect(loadModelBlob).toHaveBeenCalledWith('model1');
    });

    it('should return empty array for non-existent project', async () => {
      const projectId = 'non-existent';
      
      localStorage.getItem.mockReturnValue(JSON.stringify([]));

      const result = await loadProjectModels(projectId);

      expect(result).toEqual([]);
    });
  });

  describe('Logger Integration', () => {
    it('should log operations using testLogger', async () => {
      const projectData = { id: 'test-project', name: 'Test Project' };
      
      const result = await saveProject(projectData);

      const logs = testLogger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
