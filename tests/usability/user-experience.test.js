// tests/usability/user-experience.test.js
// ユーザー体験管理システムのテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { userExperienceManager, ERROR_TYPES, ERROR_LEVELS, UserExperienceManager } from '../../src/utils/user-experience-manager.js';

describe('UserExperienceManager', () => {
  let manager;

  beforeEach(() => {
    manager = new UserExperienceManager();
  });

  describe('エラータイプ判定', () => {
    it('ネットワークエラーを正しく判定する', () => {
      const error = new Error('Network request failed');
      const errorType = manager.determineErrorType(error);
      expect(errorType).toBe(ERROR_TYPES.NETWORK);
    });

    it('権限エラーを正しく判定する', () => {
      const error = new Error('Permission denied for camera');
      const errorType = manager.determineErrorType(error);
      expect(errorType).toBe(ERROR_TYPES.PERMISSION);
    });

    it('互換性エラーを正しく判定する', () => {
      const error = new Error('WebRTC not supported');
      const errorType = manager.determineErrorType(error);
      expect(errorType).toBe(ERROR_TYPES.COMPATIBILITY);
    });

    it('データエラーを正しく判定する', () => {
      const error = new Error('Invalid JSON data');
      const context = { dataError: true };
      const errorType = manager.determineErrorType(error, context);
      expect(errorType).toBe(ERROR_TYPES.DATA);
    });

    it('レンダリングエラーを正しく判定する', () => {
      const error = new Error('Three.js rendering failed');
      const context = { renderingError: true };
      const errorType = manager.determineErrorType(error, context);
      expect(errorType).toBe(ERROR_TYPES.RENDERING);
    });

    it('不明なエラーを正しく判定する', () => {
      const error = new Error('Unknown error');
      const errorType = manager.determineErrorType(error);
      expect(errorType).toBe(ERROR_TYPES.UNKNOWN);
    });
  });

  describe('エラーレベル判定', () => {
    it('権限エラーが高レベルと判定される', () => {
      const level = manager.determineErrorLevel(ERROR_TYPES.PERMISSION);
      expect(level).toBe(ERROR_LEVELS.HIGH);
    });

    it('互換性エラーが高レベルと判定される', () => {
      const level = manager.determineErrorLevel(ERROR_TYPES.COMPATIBILITY);
      expect(level).toBe(ERROR_LEVELS.HIGH);
    });

    it('ネットワークエラーが中レベルと判定される', () => {
      const level = manager.determineErrorLevel(ERROR_TYPES.NETWORK);
      expect(level).toBe(ERROR_LEVELS.MEDIUM);
    });

    it('データエラーが低レベルと判定される', () => {
      const level = manager.determineErrorLevel(ERROR_TYPES.DATA);
      expect(level).toBe(ERROR_LEVELS.LOW);
    });

    it('レンダリングエラーが低レベルと判定される', () => {
      const level = manager.determineErrorLevel(ERROR_TYPES.RENDERING);
      expect(level).toBe(ERROR_LEVELS.LOW);
    });
  });

  describe('エラーガイダンス取得', () => {
    it('ネットワークエラーのガイダンスが正しく取得される', () => {
      const error = new Error('Network request failed');
      const guidance = manager.getErrorGuidance(error);
      
      expect(guidance.type).toBe(ERROR_TYPES.NETWORK);
      expect(guidance.title).toContain('ネットワーク');
      expect(guidance.autoRetry).toBe(true);
      expect(guidance.recoverySteps).toHaveLength(3);
    });

    it('権限エラーのガイダンスが正しく取得される', () => {
      const error = new Error('Permission denied');
      const guidance = manager.getErrorGuidance(error);
      
      expect(guidance.type).toBe(ERROR_TYPES.PERMISSION);
      expect(guidance.title).toContain('カメラ');
      expect(guidance.autoRetry).toBe(false);
      expect(guidance.showSettings).toBe(true);
    });

    it('互換性エラーのガイダンスが正しく取得される', () => {
      const error = new Error('WebRTC not supported');
      const guidance = manager.getErrorGuidance(error);
      
      expect(guidance.type).toBe(ERROR_TYPES.COMPATIBILITY);
      expect(guidance.title).toContain('ブラウザ');
      expect(guidance.autoRetry).toBe(false);
      expect(guidance.showBrowserCheck).toBe(true);
    });
  });

  describe('エラーヒストリー', () => {
    it('エラーがヒストリーに追加される', () => {
      const error = new Error('Test error');
      manager.getErrorGuidance(error);
      
      expect(manager.errorHistory).toHaveLength(1);
      expect(manager.errorHistory[0].message).toBe('Test error');
    });

    it('最大ヒストリー数が制限される', () => {
      // 最大ヒストリー数を超えるエラーを追加
      for (let i = 0; i < 60; i++) {
        const error = new Error(`Error ${i}`);
        manager.getErrorGuidance(error);
      }
      
      expect(manager.errorHistory).toHaveLength(50);
    });

    it('エラーヒストリーがフィルターされる', () => {
      // 異なるタイプのエラーを追加
      manager.getErrorGuidance(new Error('Data error 1'), { dataError: true });
      manager.getErrorGuidance(new Error('Permission error'));
      manager.getErrorGuidance(new Error('Data error 2'), { dataError: true });
      
      const dataErrors = manager.getErrorHistory({ type: ERROR_TYPES.DATA });
      expect(dataErrors).toHaveLength(2);
    });
  });

  describe('エラー表示UI作成', () => {
    it('エラー表示要素が正しく作成される', () => {
      const guidance = {
        title: 'Test Error',
        message: 'Test message',
        icon: '❌',
        recoverySteps: ['Step 1', 'Step 2'],
        autoRetry: true
      };
      
      const element = manager.createErrorDisplay(guidance);
      
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.className).toBe('error-display-container');
      expect(element.querySelector('.error-title').textContent).toBe('Test Error');
      expect(element.querySelector('.error-message').textContent).toBe('Test message');
      expect(element.querySelectorAll('.recovery-step')).toHaveLength(2);
    });

    it('リトライボタンが正しく作成される', () => {
      const guidance = {
        title: 'Test Error',
        message: 'Test message',
        icon: '❌',
        recoverySteps: ['Step 1'],
        autoRetry: true
      };
      
      let retryCalled = false;
      const element = manager.createErrorDisplay(guidance, () => {
        retryCalled = true;
      });
      
      const retryBtn = element.querySelector('.retry-button');
      expect(retryBtn).toBeTruthy();
      
      retryBtn.click();
      expect(retryCalled).toBe(true);
    });

    it('設定ボタンが正しく作成される', () => {
      const guidance = {
        title: 'Test Error',
        message: 'Test message',
        icon: '❌',
        recoverySteps: ['Step 1'],
        showSettings: true
      };
      
      const element = manager.createErrorDisplay(guidance);
      const settingsBtn = element.querySelector('.settings-button');
      expect(settingsBtn).toBeTruthy();
    });
  });

  describe('ブラウザ互換性チェック', () => {
    it('WebRTCサポートが正しくチェックされる', () => {
      const isSupported = manager.checkWebRTCSupport();
      expect(typeof isSupported).toBe('boolean');
    });

    it('WebGLサポートが正しくチェックされる', () => {
      const isSupported = manager.checkWebGLSupport();
      expect(typeof isSupported).toBe('boolean');
    });

    it('カメラAPIサポートが正しくチェックされる', () => {
      const isSupported = manager.checkCameraAPISupport();
      expect(typeof isSupported).toBe('boolean');
    });

    it('IndexedDBサポートが正しくチェックされる', () => {
      const isSupported = manager.checkIndexedDBSupport();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('自動リトライ', () => {
    it('自動リトライが正しく実行される', async () => {
      const guidance = {
        autoRetry: true,
        retryDelay: 100
      };
      
      let retryCount = 0;
      const retryFunction = () => {
        retryCount++;
        if (retryCount < 2) {
          throw new Error('Retry error');
        }
      };
      
      await manager.executeAutoRetry(retryFunction, guidance, 3);
      expect(retryCount).toBe(2);
    });

    it('最大リトライ回数に達した場合に停止する', async () => {
      const guidance = {
        autoRetry: true,
        retryDelay: 100
      };
      
      let retryCount = 0;
      const retryFunction = () => {
        retryCount++;
        throw new Error('Always fails');
      };
      
      await manager.executeAutoRetry(retryFunction, guidance, 2);
      expect(retryCount).toBe(2);
    });
  });

  describe('ユーザー設定', () => {
    it('ユーザー設定が正しく更新される', () => {
      const newPreferences = {
        showDetailedErrors: true,
        autoRetry: false
      };
      
      manager.updateUserPreferences(newPreferences);
      
      expect(manager.userPreferences.showDetailedErrors).toBe(true);
      expect(manager.userPreferences.autoRetry).toBe(false);
    });
  });

  describe('エラーレポート生成', () => {
    it('エラーレポートが正しく生成される', () => {
      // テスト用のエラーを追加
      manager.getErrorGuidance(new Error('Error 1'), { dataError: true });
      manager.getErrorGuidance(new Error('Error 2'));
      
      const report = manager.generateErrorReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('totalErrors');
      expect(report).toHaveProperty('errorsByType');
      expect(report).toHaveProperty('errorsByLevel');
      expect(report).toHaveProperty('recentErrors');
      expect(report).toHaveProperty('userPreferences');
      expect(report.totalErrors).toBe(2);
    });
  });
});
