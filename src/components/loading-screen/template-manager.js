/**
 * ローディング画面テンプレート管理
 */

const TEMPLATES_STORAGE_KEY = 'miruwebAR_loading_templates';

/**
 * デフォルト設定定義
 */
export const defaultTemplateSettings = {
  startScreen: {
    logoPosition: 25,
    logoSize: 1.0,
    title: 'AR体験を開始',
    titlePosition: 50,
    titleSize: 1.0,
    buttonText: '開始',
    buttonPosition: 75,
    buttonSize: 1.0,
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    buttonColor: '#6c5ce7',
    buttonTextColor: '#ffffff'
  },
  loadingScreen: {
    backgroundColor: '#1a1a1a',
    logoType: 'none',
    logoPosition: 25,
    logoSize: 1.0,
    brandName: 'Your Brand',
    subTitle: 'AR Experience',
    loadingMessage: '読み込み中...',
    fontScale: 1.0,
    animation: 'fade'
  },
  guideScreen: {
    mode: 'surface',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    surfaceDetection: {
      title: '画像の上にカメラを向けて合わせてください',
      description: 'マーカー画像を画面内に収めてください',
      markerSize: 1.0
    },
    worldTracking: {
      title: '画面をタップしてください',
      description: '平らな面を見つけて画面をタップしてください'
    }
  }
};

/**
 * 全テンプレートを取得
 * @returns {Array} テンプレート配列
 */
export function getAllTemplates() {
  try {
    const templatesJson = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const templates = templatesJson ? JSON.parse(templatesJson) : [];
    
    // デフォルトテンプレートが存在しない場合は追加
    const hasDefault = templates.some(t => t.id === 'default');
    if (!hasDefault) {
      const defaultTemplate = {
        id: 'default',
        name: 'デフォルト',
        description: '標準テンプレート',
        settings: { ...defaultTemplateSettings },
        isDefault: true,
        created: Date.now(),
        updated: Date.now()
      };
      templates.unshift(defaultTemplate);
      saveAllTemplates(templates);
    }
    
    return templates;
  } catch (error) {
    console.error('❌ テンプレート一覧取得エラー:', error);
    return [];
  }
}

/**
 * テンプレートをIDで取得
 * @param {string} templateId テンプレートID
 * @returns {Object|null} テンプレートデータ
 */
export function getTemplate(templateId) {
  try {
    const templates = getAllTemplates();
    return templates.find(t => t.id === templateId) || null;
  } catch (error) {
    console.error('❌ テンプレート取得エラー:', error);
    return null;
  }
}

/**
 * テンプレートを保存
 * @param {Object} templateData テンプレートデータ
 * @returns {Object} 保存されたテンプレート
 */
export function saveTemplate(templateData) {
  try {
    const templates = getAllTemplates();
    
    // 新規テンプレートの場合はIDを生成
    if (!templateData.id) {
      templateData.id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      templateData.created = Date.now();
    }
    
    templateData.updated = Date.now();
    
    // 既存テンプレートの更新または新規追加
    const existingIndex = templates.findIndex(t => t.id === templateData.id);
    
    if (existingIndex >= 0) {
      // 作成日時を保持
      templateData.created = templates[existingIndex].created;
      templates[existingIndex] = templateData;
    } else {
      templates.push(templateData);
    }
    
    saveAllTemplates(templates);
    return templateData;
  } catch (error) {
    console.error('❌ テンプレート保存エラー:', error);
    throw new Error(`テンプレートの保存に失敗しました: ${error.message}`);
  }
}

/**
 * テンプレートを削除
 * @param {string} templateId テンプレートID
 * @returns {boolean} 削除成功の場合true
 */
export function deleteTemplate(templateId) {
  try {
    // デフォルトテンプレートは削除不可
    if (templateId === 'default') {
      console.warn('⚠️ デフォルトテンプレートは削除できません');
      return false;
    }
    
    const templates = getAllTemplates();
    const filteredTemplates = templates.filter(t => t.id !== templateId);
    
    if (filteredTemplates.length === templates.length) {
      return false; // テンプレートが見つからない
    }
    
    saveAllTemplates(filteredTemplates);
    return true;
  } catch (error) {
    console.error('❌ テンプレート削除エラー:', error);
    return false;
  }
}

/**
 * テンプレートを複製
 * @param {string} templateId 複製元テンプレートID
 * @param {string} newName 新しいテンプレート名
 * @returns {Object|null} 複製されたテンプレート
 */
export function duplicateTemplate(templateId, newName) {
  try {
    const originalTemplate = getTemplate(templateId);
    if (!originalTemplate) {
      return null;
    }
    
    const duplicatedTemplate = {
      ...originalTemplate,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName || `${originalTemplate.name} のコピー`,
      description: `${originalTemplate.description} (複製)`,
      isDefault: false,
      created: Date.now(),
      updated: Date.now()
    };
    
    return saveTemplate(duplicatedTemplate);
  } catch (error) {
    console.error('❌ テンプレート複製エラー:', error);
    return null;
  }
}

/**
 * 全テンプレートを保存（内部関数）
 * @param {Array} templates テンプレート配列
 */
function saveAllTemplates(templates) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('❌ テンプレート配列保存エラー:', error);
    throw error;
  }
}

/**
 * テンプレート使用数を取得（プロジェクトで使用されている数）
 * @param {string} templateId テンプレートID
 * @returns {number} 使用数
 */
export function getTemplateUsageCount(templateId) {
  try {
    const projectsJson = localStorage.getItem('miruwebAR_projects');
    const projects = projectsJson ? JSON.parse(projectsJson) : [];
    
    return projects.filter(project => 
      project.loadingScreen && project.loadingScreen.template === templateId
    ).length;
  } catch (error) {
    console.error('❌ テンプレート使用数取得エラー:', error);
    return 0;
  }
}

/**
 * テンプレート一覧をHTMLで生成
 * @param {string} activeTemplateId 現在選択中のテンプレートID
 * @returns {string} HTML文字列
 */
export function generateTemplateListHTML(activeTemplateId = 'default') {
  try {
    const templates = getAllTemplates();
    
    return templates.map(template => {
      const isActive = template.id === activeTemplateId;
      const usageCount = getTemplateUsageCount(template.id);
      
      return `
        <div class="loading-screen-editor__template-item ${isActive ? 'loading-screen-editor__template-item--active' : ''}" 
             data-template-id="${template.id}">
          <div class="loading-screen-editor__template-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
          </div>
          <div class="loading-screen-editor__template-info">
            <div class="loading-screen-editor__template-name">${template.name}</div>
            <div class="loading-screen-editor__template-desc">
              ${template.description}${usageCount > 0 ? ` • ${usageCount}個のプロジェクトで使用中` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('❌ テンプレート一覧HTML生成エラー:', error);
    return '';
  }
}