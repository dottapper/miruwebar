/**
 * プロジェクトデータマッピング層
 * データの正規化、バリデーション、マイグレーション処理を専門的に扱う
 */

/**
 * デフォルトローディング画面設定を生成
 * @returns {Object} デフォルトローディング画面設定
 */
export function createDefaultLoadingScreen() {
    return {
        enabled: true,
        template: 'default',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        progressColor: '#4CAF50',
        logoImage: null, // Base64画像データまたはnull
        message: 'ARコンテンツを準備中...',
        showProgress: true,
        customCSS: null
        // selectedScreenId は廃止: template プロパティに統一済み
    };
}

/**
 * ローディング画面設定のマイグレーション
 * selectedScreenId → template の変換処理
 * @param {Object} loadingScreenData - 元のローディング画面データ
 * @returns {Object} マイグレーション済みローディング画面設定
 */
export function migrateLoadingScreenData(loadingScreenData) {
    if (!loadingScreenData) {
        return createDefaultLoadingScreen();
    }
    
    const defaultSettings = createDefaultLoadingScreen();
    const migratedLoadingScreen = { ...defaultSettings, ...loadingScreenData };
    
    // selectedScreenId → template のマイグレーション
    if (migratedLoadingScreen.selectedScreenId && !migratedLoadingScreen.template) {
        migratedLoadingScreen.template = migratedLoadingScreen.selectedScreenId === 'none' 
            ? 'default' 
            : migratedLoadingScreen.selectedScreenId;
    }
    
    // 旧プロパティを削除
    delete migratedLoadingScreen.selectedScreenId;
    
    return migratedLoadingScreen;
}

/**
 * 文字列の安全な正規化（長さ制限付き）
 * @param {any} value - 正規化する値
 * @param {number} maxLength - 最大文字数
 * @param {string} defaultValue - デフォルト値
 * @returns {string} 正規化された文字列
 */
export function normalizeString(value, maxLength, defaultValue = '') {
    return String(value || defaultValue).substring(0, maxLength);
}

/**
 * 数値の安全な正規化（小数点2桁まで）
 * @param {any} value - 正規化する値
 * @param {number} defaultValue - デフォルト値
 * @returns {number} 正規化された数値
 */
export function normalizeNumber(value, defaultValue = 0) {
    const num = Number(value) || defaultValue;
    return Math.round(num * 100) / 100;
}

/**
 * プロジェクトの基本情報を正規化
 * @param {Object} data - 元のプロジェクトデータ
 * @param {string} projectId - プロジェクトID
 * @returns {Object} 正規化されたプロジェクト基本情報
 */
export function normalizeProjectBasicInfo(data, projectId) {
    return {
        id: projectId,
        name: normalizeString(data.name, 50, 'Untitled'),
        description: normalizeString(data.description, 200),
        type: data.type || 'markerless',
        created: data.created || Date.now(),
        updated: Date.now()
    };
}

/**
 * プロジェクト設定を正規化
 * @param {Object} data - 元のプロジェクトデータ
 * @returns {Object} 正規化されたプロジェクト設定
 */
export function normalizeProjectSettings(data) {
    return {
        arScale: normalizeNumber(data.arScale, 1),
        isPublic: Boolean(data.isPublic)
    };
}

/**
 * 軽量プロジェクトデータ構造を生成
 * モデル設定とその他の正規化されたデータを統合
 * @param {Object} basicInfo - 正規化された基本情報
 * @param {Object} settings - 正規化された設定
 * @param {Array} modelSettings - モデル設定配列
 * @param {Array} savedModelIds - 保存済みモデルID配列
 * @param {Object} loadingScreen - マイグレーション済みローディング画面設定
 * @param {string} markerImage - マーカー画像データ
 * @returns {Object} 統合された軽量プロジェクトデータ
 */
export function createLightweightProjectData(
    basicInfo,
    settings,
    modelSettings,
    savedModelIds,
    loadingScreen,
    markerImage,
    startScreen = null,
    guideScreen = null
) {
    return {
        ...basicInfo,
        
        // モデル設定（IndexedDB参照IDを含む）
        modelSettings: modelSettings,
        modelCount: modelSettings.length,
        savedModelIds: savedModelIds, // IndexedDBに保存されたモデルID一覧
        
        // 基本設定
        settings: settings,
        
        // ローディング画面設定（マイグレーション処理済み）
        loadingScreen: loadingScreen,
        // スタート/ガイド画面設定（軽量）
        startScreen: startScreen || null,
        guideScreen: guideScreen || null,
        
        // マーカー画像（Base64で保存、容量小）
        markerImage: markerImage || null
    };
}
