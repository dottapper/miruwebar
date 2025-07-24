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
    try {
        console.log('🔄 createProjectData開始');
        
        // 新規プロジェクト用のIDを生成
        const projectId = data.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('✅ プロジェクトID:', projectId);
        
        // 軽量化された3Dモデルデータを保存（Base64形式で圧縮）
        let modelSettings = [];
        
        console.log('🔍 viewerInstance チェック:', {
            hasViewerInstance: !!viewerInstance,
            hasControls: !!viewerInstance?.controls,
            hasGetAllModels: !!viewerInstance?.controls?.getAllModels
        });
        
        if (viewerInstance && viewerInstance.controls && viewerInstance.controls.getAllModels) {
            console.log('🔄 モデルデータ取得開始...');
            try {
                const allModels = viewerInstance.controls.getAllModels();
                console.log('✅ モデル数:', allModels.length);
                
                if (!Array.isArray(allModels)) {
                    console.error('❌ getAllModels()の戻り値が配列ではありません:', typeof allModels);
                    throw new Error('モデルデータの取得に失敗しました');
                }
        
        modelSettings = allModels.map((model, index) => {
            console.log(`🔍 モデル${index}の処理:`, {
                fileName: model.fileName,
                hasPosition: !!model.position,
                hasRotation: !!model.rotation,
                hasScale: !!model.scale,
                hasAnimations: model.hasAnimations,
                hasModelData: !!model.modelData
            });
            
            // モデルデータと設定の両方を保存
            const safeModel = {
                // ファイル情報
                fileName: String(model.fileName || `model_${index + 1}`).substring(0, 50),
                fileSize: String(model.fileSize || 0).substring(0, 10),
                // 3Dモデルデータ（Base64形式で保存）
                modelData: model.modelData || null,
                modelUrl: model.modelUrl || null,
                // 変換設定
                transform: {
                    position: {
                        x: Math.round((Number(model.position?.x || 0) || 0) * 100) / 100,
                        y: Math.round((Number(model.position?.y || 0) || 0) * 100) / 100,
                        z: Math.round((Number(model.position?.z || 0) || 0) * 100) / 100
                    },
                    rotation: {
                        x: Math.round((Number(model.rotation?.x || 0) || 0) * 100) / 100,
                        y: Math.round((Number(model.rotation?.y || 0) || 0) * 100) / 100,
                        z: Math.round((Number(model.rotation?.z || 0) || 0) * 100) / 100
                    },
                    scale: {
                        x: Math.round((Number(model.scale?.x || 1) || 1) * 100) / 100,
                        y: Math.round((Number(model.scale?.y || 1) || 1) * 100) / 100,
                        z: Math.round((Number(model.scale?.z || 1) || 1) * 100) / 100
                    }
                },
                visible: Boolean(model.visible !== false),
                hasAnimations: Boolean(model.hasAnimations),
                order: index
            };
            
            console.log(`✅ モデル${index}の保存データ:`, {
                fileName: safeModel.fileName,
                hasModelData: !!safeModel.modelData,
                hasModelUrl: !!safeModel.modelUrl
            });
            return safeModel;
                 });
         
         console.log('保存する設定データ:', modelSettings);
            } catch (modelError) {
                console.error('❌ モデルデータ処理エラー:', modelError);
                throw new Error(`モデルデータの処理に失敗しました: ${modelError.message}`);
            }
        } else {
            console.log('ℹ️ モデルデータが利用できません（viewerInstanceまたはgetAllModelsが存在しない）');
        }
    
    // 超軽量化プロジェクトデータ（容量制限対策）
    const lightweightProject = {
        id: projectId,
        name: String(data.name || 'Untitled').substring(0, 30), // 名前を30文字に制限
        description: String(data.description || '').substring(0, 100), // 説明を100文字に制限
        type: data.type || 'markerless',
        
        // モデル設定のみ保存（実際のファイルは保存しない）
        modelSettings: modelSettings,
        modelCount: modelSettings.length,
        
        // 最小限の設定
        settings: {
            arScale: Math.round((data.arScale || 1) * 100) / 100,
            isPublic: Boolean(data.isPublic)
        },
        
        // マーカー画像データを保存
        markerImage: data.markerImage || null,
        
        created: data.created || Date.now(),
        updated: Date.now()
    };
    
    console.log('🔍 軽量化後のプロジェクトデータサイズ:', JSON.stringify(lightweightProject).length, 'characters');
    
    return lightweightProject;
    } catch (error) {
        console.error('❌ createProjectData エラー:', error);
        throw new Error(`プロジェクトデータの作成に失敗しました: ${error.message}`);
    }
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
    try {
        console.log('🔄 saveProject開始:', {
            dataKeys: Object.keys(data || {}),
            hasViewerInstance: !!viewerInstance,
            viewerHasControls: !!viewerInstance?.controls
        });
        
        const projects = getProjects();
        console.log('✅ 既存プロジェクト数:', projects.length);
        
        const projectData = createProjectData(data, viewerInstance);
        console.log('✅ プロジェクトデータ作成完了:', {
            id: projectData.id,
            name: projectData.name,
            modelCount: projectData.modelSettings?.length || 0
        });
        
        console.log('保存するプロジェクトデータのサイズ（概算）:', JSON.stringify(projectData).length, 'characters');
        
        // 既存プロジェクトの更新または新規追加
        const existingIndex = projects.findIndex(p => p.id === projectData.id);
        console.log('既存プロジェクトインデックス:', existingIndex);
        
        if (existingIndex >= 0) {
            // 既存の作成日時を保持
            projectData.created = projects[existingIndex].created;
            projects[existingIndex] = projectData;
            console.log('✅ 既存プロジェクトを更新');
        } else {
            projects.push(projectData);
            console.log('✅ 新規プロジェクトを追加');
        }
        
        // JSON変換のテスト
        let dataToSave;
        try {
            console.log('🔄 JSONシリアライゼーション開始...');
            dataToSave = JSON.stringify(projects);
            console.log('✅ JSONシリアライゼーション成功');
        } catch (jsonError) {
            console.error('❌ JSON変換エラー:', jsonError);
            throw new Error(`プロジェクトデータのJSON変換に失敗しました: ${jsonError.message}`);
        }
        
        const dataSizeKB = Math.round(dataToSave.length / 1024);
        const dataSizeMB = Math.round(dataSizeKB / 1024 * 100) / 100;
        console.log(`📊 データサイズ: ${dataToSave.length} characters (${dataSizeKB}KB / ${dataSizeMB}MB)`);
        
        // localStorageの推定容量チェック（約5-10MBが一般的な制限）
        if (dataSizeKB > 5000) { // 5MB以上の場合は警告
            console.warn('⚠️ データサイズが大きすぎます:', dataSizeKB, 'KB');
            console.warn('プロジェクト数を減らすか、モデルを削除してください');
        }
        
        // localStorageの容量制限チェック
        console.log('🔄 localStorageへの保存を開始...');
        try {
            localStorage.setItem(STORAGE_KEY, dataToSave);
            console.log('✅ localStorage保存成功');
        } catch (storageError) {
            console.error('❌ localStorage保存エラー:', storageError.name, storageError.message);
            console.error('- エラー詳細:', storageError);
            if (storageError.name === 'QuotaExceededError') {
                console.error('❌ localStorage容量制限エラー発生');
                console.log('🔄 容量制限対応を開始します...');
                
                // 現在の使用量を確認
                const currentProjects = getProjects();
                console.log('- 現在のプロジェクト数:', currentProjects.length);
                
                // 古いプロジェクトを削除して容量を確保
                if (currentProjects.length > 5) {
                    console.log('🧹 古いプロジェクトを削除して容量を確保中...');
                    // 作成日時でソートして古い順に削除
                    const sortedProjects = currentProjects.sort((a, b) => (a.created || 0) - (b.created || 0));
                    const keepProjects = sortedProjects.slice(-3); // 最新3つのみ保持
                    console.log('- 保持するプロジェクト数:', keepProjects.length);
                    
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(keepProjects));
                        console.log('✅ 古いプロジェクト削除完了');
                        
                        // 現在のプロジェクトを追加
                        const updatedProjects = [...keepProjects, projectData];
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
                        console.log('✅ 新規プロジェクト保存成功（容量確保後）');
                        return projectData;
                    } catch (retryError) {
                        console.error('❌ 容量確保後の保存も失敗:', retryError);
                    }
                }
                
                // 最終手段：全削除してから現在のプロジェクトのみ保存
                console.log('🔄 最終手段：全削除してから現在のプロジェクトのみ保存');
                localStorage.removeItem(STORAGE_KEY);
                
                try {
                    // 現在のプロジェクトのみを保存
                    const singleProjectArray = [projectData];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(singleProjectArray));
                    console.log('新規プロジェクトのみの保存に成功しました');
                    return projectData;
                } catch (singleSaveError) {
                    console.error('単一プロジェクトの保存も失敗:', singleSaveError);
                    
                    // 最後の手段：非常に軽量化されたプロジェクトデータを作成
                    const ultraLightProject = {
                        id: projectData.id,
                        name: projectData.name,
                        description: projectData.description,
                        type: projectData.type,
                        modelCount: projectData.modelSettings.length,
                        created: projectData.created,
                        updated: projectData.updated
                    };
                    
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify([ultraLightProject]));
                        console.log('超軽量化プロジェクトの保存に成功しました');
                        return ultraLightProject;
                    } catch (ultraError) {
                        console.error('超軽量化保存も失敗:', ultraError);
                        throw new Error('プロジェクトデータが大きすぎて保存できません。ブラウザのlocalStorageをクリアしてください。');
                    }
                }
            } else {
                throw storageError;
            }
        }
        
        return projectData;
    } catch (error) {
        console.error('プロジェクト保存処理でエラー:', error);
        throw error;
    }
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
