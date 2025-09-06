// src/utils/project-data-normalizer.js
// プロジェクトデータの重複・冗長構造を正規化するユーティリティ

/**
 * プロジェクトデータから重複したeditorSettingsを除去する正規化処理
 * @param {Object} projectData - 正規化するプロジェクトデータ
 * @returns {Object} - 正規化されたプロジェクトデータ
 */
export function normalizeProjectData(projectData) {
  if (!projectData || typeof projectData !== 'object') {
    return projectData;
  }

  // Deep cloneを作成
  const normalized = JSON.parse(JSON.stringify(projectData));

  // loadingScreen内のeditorSettingsを正規化
  if (normalized.loadingScreen?.editorSettings) {
    console.log('🔄 loadingScreen.editorSettingsを正規化中...');
    
    // editorSettings内のeditorSettingsを削除（再帰的重複を防ぐ）
    const cleanEditorSettings = { ...normalized.loadingScreen.editorSettings };
    if (cleanEditorSettings.editorSettings) {
      console.warn('⚠️ editorSettings内の重複editorSettingsを削除');
      delete cleanEditorSettings.editorSettings;
    }
    
    normalized.loadingScreen.editorSettings = cleanEditorSettings;
    console.log('✅ loadingScreen.editorSettings正規化完了');
  }

  // startScreen内のeditorSettingsも正規化（将来の対応）
  if (normalized.startScreen?.editorSettings) {
    console.log('🔄 startScreen.editorSettingsを正規化中...');
    const cleanEditorSettings = { ...normalized.startScreen.editorSettings };
    if (cleanEditorSettings.editorSettings) {
      console.warn('⚠️ startScreen内の重複editorSettingsを削除');
      delete cleanEditorSettings.editorSettings;
    }
    normalized.startScreen.editorSettings = cleanEditorSettings;
    console.log('✅ startScreen.editorSettings正規化完了');
  }

  // guideScreen内のeditorSettingsも正規化（将来の対応）
  if (normalized.guideScreen?.editorSettings) {
    console.log('🔄 guideScreen.editorSettingsを正規化中...');
    const cleanEditorSettings = { ...normalized.guideScreen.editorSettings };
    if (cleanEditorSettings.editorSettings) {
      console.warn('⚠️ guideScreen内の重複editorSettingsを削除');
      delete cleanEditorSettings.editorSettings;
    }
    normalized.guideScreen.editorSettings = cleanEditorSettings;
    console.log('✅ guideScreen.editorSettings正規化完了');
  }

  return normalized;
}

/**
 * プロジェクトデータのサイズを計算
 * @param {Object} data - 計算するデータ
 * @returns {number} - データサイズ（バイト）
 */
export function calculateDataSize(data) {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * 正規化前後のサイズ差を報告
 * @param {Object} originalData - 元のデータ
 * @param {Object} normalizedData - 正規化後のデータ
 */
export function reportSizeReduction(originalData, normalizedData) {
  const originalSize = calculateDataSize(originalData);
  const normalizedSize = calculateDataSize(normalizedData);
  const reduction = originalSize - normalizedSize;
  const reductionPercent = ((reduction / originalSize) * 100).toFixed(1);

  if (reduction > 0) {
    console.log(`📊 データサイズ削減: ${originalSize}B → ${normalizedSize}B (-${reduction}B, -${reductionPercent}%)`);
  } else {
    console.log(`📊 データサイズ: ${normalizedSize}B (変更なし)`);
  }
}

/**
 * editorSettingsの重複レベルをチェック
 * @param {Object} projectData - チェックするプロジェクトデータ
 * @returns {Array} - 見つかった重複の配列
 */
export function checkDuplicateEditorSettings(projectData) {
  const duplicates = [];

  if (projectData?.loadingScreen?.editorSettings?.editorSettings) {
    duplicates.push({
      path: 'loadingScreen.editorSettings.editorSettings',
      message: 'loadingScreen内でeditorSettingsが二重に存在'
    });
  }

  if (projectData?.startScreen?.editorSettings?.editorSettings) {
    duplicates.push({
      path: 'startScreen.editorSettings.editorSettings',
      message: 'startScreen内でeditorSettingsが二重に存在'
    });
  }

  if (projectData?.guideScreen?.editorSettings?.editorSettings) {
    duplicates.push({
      path: 'guideScreen.editorSettings.editorSettings',
      message: 'guideScreen内でeditorSettingsが二重に存在'
    });
  }

  return duplicates;
}