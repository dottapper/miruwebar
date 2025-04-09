// src/api/projects.js
// プロジェクト関連のAPI機能

const STORAGE_KEY = 'miruwebAR_projects';

/**
 * プロジェクトデータの構造を生成
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 構造化されたプロジェクトデータ
 */
function createProjectData(data, viewerInstance) {
    // 新規プロジェクト用のIDを生成
    const projectId = data.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
        id: projectId,
        name: data.name,
        description: data.description || '',
        type: data.type || 'markerless', // ARタイプ
        models: viewerInstance ? viewerInstance.controls.getAllModels() : [],
        settings: {
            arScale: data.arScale || 1,
            isPublic: data.isPublic || false,
        },
        markerImage: data.markerImage || null,
        thumbnail: data.thumbnail || null, // サムネイル画像
        created: data.created || Date.now(),
        updated: Date.now()
    };
}

/**
 * プロジェクト一覧を取得
 * @returns {Array} - プロジェクトの配列
 */
export function getProjects() {
    const projectsJson = localStorage.getItem(STORAGE_KEY);
    return projectsJson ? JSON.parse(projectsJson) : [];
}

/**
 * プロジェクトを保存
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 保存されたプロジェクトデータ
 */
export function saveProject(data, viewerInstance) {
    const projects = getProjects();
    const projectData = createProjectData(data, viewerInstance);
    
    // 既存プロジェクトの更新または新規追加
    const existingIndex = projects.findIndex(p => p.id === projectData.id);
    if (existingIndex >= 0) {
        // 既存の作成日時を保持
        projectData.created = projects[existingIndex].created;
        projects[existingIndex] = projectData;
    } else {
        projects.push(projectData);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projectData;
}

/**
 * プロジェクトを取得
 * @param {string} id - プロジェクトID
 * @returns {Object|null} - プロジェクトデータ
 */
export function getProject(id) {
    const projects = getProjects();
    return projects.find(p => p.id === id) || null;
}

/**
 * プロジェクトを削除
 * @param {string} id - プロジェクトID
 * @returns {boolean} - 削除成功の場合true
 */
export function deleteProject(id) {
    const projects = getProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    // プロジェクト数が変わっていなければ削除失敗
    if (filteredProjects.length === projects.length) {
        return false;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));
    return true;
}
