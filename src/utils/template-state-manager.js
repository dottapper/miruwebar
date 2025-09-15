/**
 * テンプレート状態管理システム
 * selectedScreenIdとloadingScreen.templateの二重管理を統一し、
 * データの整合性を保証する
 */

import { createLogger } from './logger.js';
import { migrateProjectProperties } from '../components/loading-screen/template-manager.js';

const logger = createLogger('TemplateStateManager');

/**
 * テンプレート状態管理クラス
 * 単一の真実の源（Single Source of Truth）を提供
 */
class TemplateStateManager {
  constructor() {
    this.listeners = new Set();
    this.state = {
      currentTemplateId: null,
      isInitialized: false,
      lastSync: null,
      pendingSave: false
    };
  }

  /**
   * 状態管理システムを初期化
   * @param {Object} initialData - 初期データ
   */
  initialize(initialData = {}) {
    try {
      // 既存データから正規化されたテンプレートIDを取得
      const normalizedTemplateId = this.normalizeTemplateId(initialData);
      
      this.state = {
        ...this.state,
        currentTemplateId: normalizedTemplateId,
        isInitialized: true,
        lastSync: Date.now()
      };
      
      logger.info('テンプレート状態管理システム初期化完了:', {
        templateId: normalizedTemplateId,
        initialData
      });
      
      // リスナーに通知
      this.notifyListeners('initialize', this.state);
      
      return this.state.currentTemplateId;
    } catch (error) {
      logger.error('初期化エラー:', error);
      throw error;
    }
  }

  /**
   * テンプレートIDを正規化
   * selectedScreenIdとloadingScreen.templateから統一されたIDを決定
   * @param {Object} data - プロジェクトまたはエディターデータ
   * @returns {string} 正規化されたテンプレートID
   */
  normalizeTemplateId(data) {
    // 優先順位:
    // 1. loadingScreen.template (新形式)
    // 2. loadingScreen.selectedScreenId (旧形式)
    // 3. selectedScreenId (最古形式)
    // 4. 'default' (フォールバック)

    let templateId = null;

    // 新形式チェック
    if (data.loadingScreen?.template && data.loadingScreen.template !== 'none') {
      templateId = data.loadingScreen.template;
    }
    // 旧形式チェック
    else if (data.loadingScreen?.selectedScreenId && data.loadingScreen.selectedScreenId !== 'none') {
      templateId = data.loadingScreen.selectedScreenId;
    }
    // 最古形式チェック
    else if (data.selectedScreenId && data.selectedScreenId !== 'none') {
      templateId = data.selectedScreenId;
    }

    // フォールバック
    if (!templateId || templateId === 'none') {
      templateId = 'default';
    }

    logger.debug('テンプレートID正規化:', {
      input: data,
      output: templateId,
      sources: {
        template: data.loadingScreen?.template,
        selectedScreenId: data.loadingScreen?.selectedScreenId,
        rootSelectedScreenId: data.selectedScreenId
      }
    });

    return templateId;
  }

  /**
   * 現在のテンプレートIDを取得
   * @returns {string} テンプレートID
   */
  getCurrentTemplateId() {
    if (!this.state.isInitialized) {
      logger.warn('状態管理システムが初期化されていません');
      return 'default';
    }
    return this.state.currentTemplateId || 'default';
  }

  /**
   * テンプレートIDを設定（即座に同期）
   * @param {string} templateId - 新しいテンプレートID
   * @param {Object} options - オプション
   * @returns {Promise<boolean>} 更新成功時true
   */
  async setTemplateId(templateId, options = {}) {
    try {
      if (!templateId || templateId === this.state.currentTemplateId) {
        return false; // 変更なし
      }

      const oldTemplateId = this.state.currentTemplateId;
      
      // 状態更新
      this.state = {
        ...this.state,
        currentTemplateId: templateId,
        lastSync: Date.now(),
        pendingSave: true
      };

      logger.info('テンプレートID更新:', {
        from: oldTemplateId,
        to: templateId,
        options
      });

      // DOM要素の同期
      await this.syncToDOM(templateId);

      // プロジェクトデータの同期（即座に実行）
      if (options.saveImmediately !== false) {
        await this.syncToProject(templateId);
      }

      // リスナーに通知
      this.notifyListeners('templateIdChanged', {
        oldTemplateId,
        newTemplateId: templateId,
        state: this.state
      });

      this.state.pendingSave = false;
      return true;
    } catch (error) {
      logger.error('テンプレートID設定エラー:', error);
      this.state.pendingSave = false;
      throw error;
    }
  }

  /**
   * DOM要素と同期
   * @param {string} templateId - テンプレートID
   */
  async syncToDOM(templateId) {
    try {
      const loadingScreenSelect = document.getElementById('loading-screen-select');
      if (loadingScreenSelect && loadingScreenSelect.value !== templateId) {
        loadingScreenSelect.value = templateId;
        
        // change イベントを発火（他のイベントハンドラーが反応するため）
        const event = new Event('change', { bubbles: true });
        loadingScreenSelect.dispatchEvent(event);
        
        logger.debug('DOM要素同期完了:', { templateId });
      }
    } catch (error) {
      logger.warn('DOM同期エラー:', error);
    }
  }

  /**
   * プロジェクトデータと同期
   * @param {string} templateId - テンプレートID
   */
  async syncToProject(templateId) {
    try {
      // 現在のプロジェクトデータを取得
      const projectsJson = localStorage.getItem('miruwebAR_projects');
      if (!projectsJson) return;

      const projects = JSON.parse(projectsJson);
      let updated = false;

      // 全プロジェクトのテンプレート参照を統一
      const updatedProjects = projects.map(project => {
        // 現在編集中のプロジェクトのみ更新（必要に応じて条件を調整）
        if (this.shouldUpdateProject(project)) {
          const updatedProject = this.updateProjectTemplateId(project, templateId);
          if (updatedProject !== project) {
            updated = true;
          }
          return updatedProject;
        }
        return project;
      });

      if (updated) {
        localStorage.setItem('miruwebAR_projects', JSON.stringify(updatedProjects));
        logger.info('プロジェクトデータ同期完了:', { templateId });
      }
    } catch (error) {
      logger.error('プロジェクト同期エラー:', error);
    }
  }

  /**
   * プロジェクトを更新対象かどうか判定
   * @param {Object} project - プロジェクトデータ
   * @returns {boolean} 更新対象の場合true
   */
  shouldUpdateProject(project) {
    // 現在編集中のプロジェクトを特定する必要がある
    // ここでは簡単に、最近更新されたプロジェクトを対象とする
    const recentThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24時間
    return project.updated && project.updated > recentThreshold;
  }

  /**
   * プロジェクトのテンプレートIDを統一形式で更新
   * @param {Object} project - プロジェクトデータ
   * @param {string} templateId - 新しいテンプレートID
   * @returns {Object} 更新されたプロジェクト
   */
  updateProjectTemplateId(project, templateId) {
    const updated = { ...project };

    // loadingScreen構造を正規化
    if (!updated.loadingScreen) {
      updated.loadingScreen = {};
    }

    // 統一形式で設定
    updated.loadingScreen.template = templateId;

    // 旧形式のプロパティは削除（段階的移行）
    if (updated.loadingScreen.selectedScreenId !== undefined) {
      delete updated.loadingScreen.selectedScreenId;
    }
    if (updated.selectedScreenId !== undefined) {
      delete updated.selectedScreenId;
    }

    // プロパティマイグレーションも適用
    return migrateProjectProperties(updated);
  }

  /**
   * 整合性チェック
   * @returns {Object} チェック結果
   */
  checkConsistency() {
    const result = {
      isConsistent: true,
      issues: [],
      recommendations: [],
      checkedAt: new Date().toISOString(),
      summary: {
        totalProjects: 0,
        inconsistentProjects: 0,
        domMismatch: false,
        templateIdSources: {}
      }
    };

    try {
      // DOM要素との整合性チェック
      const loadingScreenSelect = document.getElementById('loading-screen-select');
      if (loadingScreenSelect) {
        const domValue = loadingScreenSelect.value;
        if (domValue !== this.state.currentTemplateId) {
          result.isConsistent = false;
          result.summary.domMismatch = true;
          result.issues.push({
            type: 'dom_mismatch',
            message: `DOM要素(${domValue})と内部状態(${this.state.currentTemplateId})が不一致`,
            severity: 'warning',
            details: {
              domValue,
              stateValue: this.state.currentTemplateId
            }
          });
          result.recommendations.push('DOM要素との同期を実行してください');
        }
      }

      // プロジェクトデータとの整合性チェック（詳細版）
      this.checkProjectConsistency(result);

      // 整合性レポートの生成
      this.generateConsistencyReport(result);

      logger.debug('整合性チェック結果:', result);
      return result;
    } catch (error) {
      logger.error('整合性チェックエラー:', error);
      result.isConsistent = false;
      result.issues.push({
        type: 'check_error',
        message: error.message,
        severity: 'error',
        stack: error.stack
      });
      return result;
    }
  }

  /**
   * プロジェクトデータとの整合性チェック
   * @param {Object} result - チェック結果オブジェクト
   */
  checkProjectConsistency(result) {
    try {
      const projectsJson = localStorage.getItem('miruwebAR_projects');
      if (!projectsJson) {
        result.summary.totalProjects = 0;
        return;
      }

      const projects = JSON.parse(projectsJson);
      result.summary.totalProjects = projects.length;
      
      let inconsistentProjects = 0;
      const detailedIssues = [];

      projects.forEach((project, index) => {
        const normalizedId = this.normalizeTemplateId(project);
        
        // 各プロジェクトのテンプレートIDソースを収集
        const sources = {
          template: project.loadingScreen?.template,
          selectedScreenId: project.loadingScreen?.selectedScreenId,
          rootSelectedScreenId: project.selectedScreenId
        };
        
        const validSources = Object.entries(sources).filter(([key, value]) => value && value !== 'none');
        
        if (validSources.length > 1) {
          inconsistentProjects++;
          
          detailedIssues.push({
            projectIndex: index,
            projectId: project.id,
            projectName: project.name || `プロジェクト ${index + 1}`,
            normalizedId,
            sources,
            conflictingSources: validSources
          });
        }
        
        // ソース統計を更新
        validSources.forEach(([sourceType, value]) => {
          if (!result.summary.templateIdSources[sourceType]) {
            result.summary.templateIdSources[sourceType] = {};
          }
          if (!result.summary.templateIdSources[sourceType][value]) {
            result.summary.templateIdSources[sourceType][value] = 0;
          }
          result.summary.templateIdSources[sourceType][value]++;
        });
      });

      result.summary.inconsistentProjects = inconsistentProjects;

      if (inconsistentProjects > 0) {
        result.isConsistent = false;
        result.issues.push({
          type: 'project_inconsistency',
          message: `${inconsistentProjects}個のプロジェクトで二重管理が検出されました`,
          severity: 'warning',
          details: {
            inconsistentCount: inconsistentProjects,
            totalProjects: projects.length,
            issues: detailedIssues
          }
        });
        result.recommendations.push('プロジェクトデータの正規化を実行してください');
        result.recommendations.push('forceSynchronization()メソッドで強制同期を実行できます');
      }
    } catch (error) {
      logger.warn('プロジェクト整合性チェックエラー:', error);
      result.issues.push({
        type: 'project_check_error',
        message: `プロジェクト整合性チェック中にエラーが発生: ${error.message}`,
        severity: 'error'
      });
    }
  }

  /**
   * 整合性レポートを生成
   * @param {Object} result - チェック結果オブジェクト
   */
  generateConsistencyReport(result) {
    const report = [];
    
    report.push('=== テンプレート状態整合性レポート ===');
    report.push(`チェック日時: ${result.checkedAt}`);
    report.push(`総合判定: ${result.isConsistent ? '✅ 整合性OK' : '⚠️ 問題あり'}`);
    report.push('');
    
    // サマリー情報
    report.push('--- サマリー ---');
    report.push(`総プロジェクト数: ${result.summary.totalProjects}`);
    report.push(`不整合プロジェクト数: ${result.summary.inconsistentProjects}`);
    report.push(`DOM不整合: ${result.summary.domMismatch ? 'あり' : 'なし'}`);
    report.push('');
    
    // テンプレートIDソース分析
    if (Object.keys(result.summary.templateIdSources).length > 0) {
      report.push('--- テンプレートIDソース分析 ---');
      Object.entries(result.summary.templateIdSources).forEach(([sourceType, values]) => {
        report.push(`${sourceType}:`);
        Object.entries(values).forEach(([templateId, count]) => {
          report.push(`  ${templateId}: ${count}個のプロジェクト`);
        });
      });
      report.push('');
    }
    
    // 問題詳細
    if (result.issues.length > 0) {
      report.push('--- 検出された問題 ---');
      result.issues.forEach((issue, index) => {
        report.push(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      });
      report.push('');
    }
    
    // 推奨アクション
    if (result.recommendations.length > 0) {
      report.push('--- 推奨アクション ---');
      result.recommendations.forEach((rec, index) => {
        report.push(`${index + 1}. ${rec}`);
      });
    }
    
    result.report = report.join('\n');
    
    // コンソールにも出力（デバッグ時）
    if (logger.level <= 0) { // DEBUG レベル
      console.log(result.report);
    }
  }

  /**
   * 強制同期（整合性修正）
   * @returns {Promise<Object>} 同期結果
   */
  async forceSynchronization() {
    try {
      logger.info('強制同期開始');
      
      const currentTemplateId = this.state.currentTemplateId;
      
      // DOM同期
      await this.syncToDOM(currentTemplateId);
      
      // プロジェクト同期
      await this.syncToProject(currentTemplateId);
      
      // 状態更新
      this.state.lastSync = Date.now();
      this.state.pendingSave = false;
      
      // 最終整合性チェック
      const consistencyResult = this.checkConsistency();
      
      const result = {
        success: true,
        templateId: currentTemplateId,
        syncTime: this.state.lastSync,
        consistencyCheck: consistencyResult
      };
      
      logger.info('強制同期完了:', result);
      
      // リスナーに通知
      this.notifyListeners('forceSynchronization', result);
      
      return result;
    } catch (error) {
      logger.error('強制同期エラー:', error);
      return {
        success: false,
        error: error.message,
        templateId: this.state.currentTemplateId
      };
    }
  }

  /**
   * イベントリスナーを追加
   * @param {Function} listener - リスナー関数
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * イベントリスナーを削除
   * @param {Function} listener - リスナー関数
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * リスナーに通知
   * @param {string} event - イベント名
   * @param {Object} data - データ
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        logger.warn('リスナー通知エラー:', error);
      }
    });
  }

  /**
   * 状態をリセット
   */
  reset() {
    this.state = {
      currentTemplateId: null,
      isInitialized: false,
      lastSync: null,
      pendingSave: false
    };
    logger.info('状態管理システムをリセットしました');
  }
}

// グローバルインスタンス
const globalTemplateStateManager = new TemplateStateManager();

// デバッグ用グローバル露出
if (typeof window !== 'undefined') {
  window.templateStateManager = globalTemplateStateManager;
}

export { TemplateStateManager };
export default globalTemplateStateManager;