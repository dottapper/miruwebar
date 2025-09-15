/**
 * プロジェクトメンテナンス層
 * プロジェクトの削除、エクスポート、クリーンアップなどのメンテナンス操作を専門的に扱う
 */

import { getProjects, getProject } from '../storage/project-store.js';
import { removeModel } from '../storage/indexeddb-storage.js';
import { exportProjectBundle } from '../utils/publish.js';
import { createLogger } from '../utils/logger.js';

const projectLogger = createLogger('ProjectMaintenance');

const PROJECTS_STORAGE_KEY = 'miruwebAR_projects';

/**
 * IndexedDB対応プロジェクト削除
 * @param {string} id - プロジェクトID
 * @returns {Promise<boolean>} - 削除成功の場合true
 */
export async function deleteProject(id) {
    try {
        const projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === id);
        
        if (projectIndex === -1) {
            return false;
        }
        
        const project = projects[projectIndex];
        
        // IndexedDBからモデルファイルを削除
        if (project.savedModelIds && Array.isArray(project.savedModelIds)) {
            for (const modelId of project.savedModelIds) {
                try {
                    await removeModel(modelId);
                } catch (modelDeleteError) {
                    console.warn('⚠️ モデルファイル削除失敗:', modelId);
                }
            }
        }
        
        // プロジェクト設定をlocalStorageから削除
        const filteredProjects = projects.filter(p => p.id !== id);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filteredProjects));
        
        return true;
        
    } catch (error) {
        console.error('❌ プロジェクト削除エラー:', error);
        return false;
    }
}

/**
 * プロジェクトの公開用ZIPエクスポート
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<Blob>} ZIP Blob
 */
export async function exportProjectBundleById(projectId) {
    const project = getProject(projectId);
    if (!project) {
        throw new Error('プロジェクトが見つかりません');
    }
    
    // project.jsonの組み立て（viewer用の簡易形式）
    const projectJson = {
        name: project.name,
        description: project.description,
        type: project.type,
        loadingScreen: project.loadingScreen,
        startScreen: project.startScreen || null,
        guideScreen: project.guideScreen || null,
        // viewer側ではURLで読み込むため、assets配列を生成（IndexedDBは同梱対象外）
        models: (project.modelSettings || []).map((m) => ({
            url: `/assets/${m.fileName}`,
            fileName: m.fileName,
            fileSize: m.fileSize
        }))
    };

    // 同梱対象のアセットURL（ローカルのpublic/assetsから取得を想定）
    const assetUrls = (project.modelSettings || [])
        .filter(m => m.fileName)
        .map(m => `${window.location.origin}/assets/${m.fileName}`);

    return await exportProjectBundle({ project: projectJson, assetUrls });
}

/**
 * 緊急クリーンアップ実行
 * localStorageの不要なデータを削除してストレージ容量を回復
 * @param {boolean} confirmDelete - 削除確認をスキップするかどうか
 */
export function emergencyCleanup(confirmDelete = false) {
    if (!confirmDelete && !confirm('⚠️ 全てのプロジェクトデータが削除されます。\n本当に実行しますか？')) {
        return;
    }
    
    try {
        const beforeSize = JSON.stringify(localStorage).length;
        
        // 重要でないデータを削除
        const keysToRemove = [];
        for (let key in localStorage) {
            // プロジェクトデータ以外を削除対象にする
            if (!key.startsWith('miruwebAR_projects') || 
                key.includes('backup_') || 
                key.includes('temp_') ||
                key.includes('cache_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        const afterSize = JSON.stringify(localStorage).length;
        const freedSize = beforeSize - afterSize;
        
        projectLogger.info('緊急クリーンアップ完了:', {
            削除項目数: keysToRemove.length,
            解放容量: (freedSize / 1024).toFixed(2) + 'KB',
            残り容量: (afterSize / 1024).toFixed(2) + 'KB'
        });
        
        alert(`クリーンアップ完了！\n${keysToRemove.length}個のアイテムを削除\n${(freedSize / 1024).toFixed(2)}KB の容量を解放しました`);
        
    } catch (error) {
        console.error('❌ 緊急クリーンアップエラー:', error);
        alert('クリーンアップに失敗しました。ブラウザの設定から手動でlocalStorageをクリアしてください。');
    }
}

/**
 * プロジェクトストレージの使用量統計を取得
 * @returns {Object} ストレージ統計情報
 */
export function getStorageUsageStats() {
    try {
        const projects = getProjects();
        const totalProjects = projects.length;
        const totalModels = projects.reduce((sum, project) => 
            sum + (project.modelCount || 0), 0
        );
        
        const localStorageSize = JSON.stringify(localStorage).length;
        
        return {
            totalProjects,
            totalModels,
            localStorageSize: Math.round(localStorageSize / 1024), // KB
            projects: projects.map(project => ({
                id: project.id,
                name: project.name,
                modelCount: project.modelCount || 0,
                created: project.created,
                updated: project.updated
            }))
        };
        
    } catch (error) {
        console.error('❌ ストレージ統計取得エラー:', error);
        return {
            totalProjects: 0,
            totalModels: 0,
            localStorageSize: 0,
            projects: []
        };
    }
}

/**
 * 古いプロジェクトの自動クリーンアップ
 * 指定日数より古いプロジェクトを自動削除
 * @param {number} daysOld - 削除対象の日数（デフォルト30日）
 * @returns {Promise<number>} 削除されたプロジェクト数
 */
export async function autoCleanupOldProjects(daysOld = 30) {
    try {
        const projects = getProjects();
        const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        
        const oldProjects = projects.filter(project => 
            project.updated && project.updated < cutoffDate
        );
        
        let deletedCount = 0;
        for (const project of oldProjects) {
            const deleted = await deleteProject(project.id);
            if (deleted) {
                deletedCount++;
                console.log(`🗑️ 古いプロジェクトを削除: ${project.name} (${new Date(project.updated).toLocaleDateString()})`);
            }
        }
        
        if (deletedCount > 0) {
            projectLogger.info(`自動クリーンアップ完了: ${deletedCount}個の古いプロジェクトを削除`);
        }
        
        return deletedCount;
        
    } catch (error) {
        console.error('❌ 自動クリーンアップエラー:', error);
        return 0;
    }
}