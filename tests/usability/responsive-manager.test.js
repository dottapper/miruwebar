// tests/usability/responsive-manager.test.js
// レスポンシブ管理システムのテスト

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { responsiveManager, BREAKPOINTS, DEVICE_TYPES, ORIENTATIONS, ResponsiveManager } from '../../src/utils/responsive-manager.js';

// ウィンドウサイズをモック
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
};

// グローバルオブジェクトをモック
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

describe('ResponsiveManager', () => {
  let manager;

  beforeEach(() => {
    // デフォルトのウィンドウサイズを設定
    mockWindow.innerWidth = 1024;
    mockWindow.innerHeight = 768;
    manager = new ResponsiveManager();
  });

  describe('ブレークポイント判定', () => {
    it('超小画面を正しく判定する', () => {
      mockWindow.innerWidth = 400;
      const breakpoint = manager.getCurrentBreakpoint();
      expect(breakpoint).toBe('xs');
    });

    it('小画面を正しく判定する', () => {
      mockWindow.innerWidth = 600;
      const breakpoint = manager.getCurrentBreakpoint();
      expect(breakpoint).toBe('sm');
    });

    it('中画面を正しく判定する', () => {
      mockWindow.innerWidth = 800;
      const breakpoint = manager.getCurrentBreakpoint();
      expect(breakpoint).toBe('md');
    });

    it('大画面を正しく判定する', () => {
      mockWindow.innerWidth = 1000;
      const breakpoint = manager.getCurrentBreakpoint();
      expect(breakpoint).toBe('lg');
    });

    it('超大画面を正しく判定する', () => {
      mockWindow.innerWidth = 1300;
      const breakpoint = manager.getCurrentBreakpoint();
      expect(breakpoint).toBe('xl');
    });

    it('超超大画面を正しく判定する', () => {
      mockWindow.innerWidth = 1500;
      const breakpoint = manager.getCurrentBreakpoint();
      expect(breakpoint).toBe('xxl');
    });
  });

  describe('デバイスタイプ判定', () => {
    it('モバイルデバイスを正しく判定する', () => {
      mockWindow.innerWidth = 400;
      const deviceType = manager.getCurrentDeviceType();
      expect(deviceType).toBe(DEVICE_TYPES.MOBILE);
    });

    it('タブレットデバイスを正しく判定する', () => {
      mockWindow.innerWidth = 800;
      const deviceType = manager.getCurrentDeviceType();
      expect(deviceType).toBe(DEVICE_TYPES.TABLET);
    });

    it('デスクトップデバイスを正しく判定する', () => {
      mockWindow.innerWidth = 1200;
      const deviceType = manager.getCurrentDeviceType();
      expect(deviceType).toBe(DEVICE_TYPES.DESKTOP);
    });

    it('大デスクトップデバイスを正しく判定する', () => {
      mockWindow.innerWidth = 1500;
      const deviceType = manager.getCurrentDeviceType();
      expect(deviceType).toBe(DEVICE_TYPES.LARGE_DESKTOP);
    });
  });

  describe('画面向き判定', () => {
    it('縦向きを正しく判定する', () => {
      mockWindow.innerWidth = 400;
      mockWindow.innerHeight = 800;
      const orientation = manager.getCurrentOrientation();
      expect(orientation).toBe(ORIENTATIONS.PORTRAIT);
    });

    it('横向きを正しく判定する', () => {
      mockWindow.innerWidth = 800;
      mockWindow.innerHeight = 400;
      const orientation = manager.getCurrentOrientation();
      expect(orientation).toBe(ORIENTATIONS.LANDSCAPE);
    });
  });

  describe('デバイス判定ヘルパー', () => {
    it('モバイル判定が正しく動作する', () => {
      mockWindow.innerWidth = 400;
      expect(manager.isMobile()).toBe(true);
      expect(manager.isTablet()).toBe(false);
      expect(manager.isDesktop()).toBe(false);
    });

    it('タブレット判定が正しく動作する', () => {
      mockWindow.innerWidth = 800;
      expect(manager.isMobile()).toBe(false);
      expect(manager.isTablet()).toBe(true);
      expect(manager.isDesktop()).toBe(false);
    });

    it('デスクトップ判定が正しく動作する', () => {
      mockWindow.innerWidth = 1200;
      expect(manager.isMobile()).toBe(false);
      expect(manager.isTablet()).toBe(false);
      expect(manager.isDesktop()).toBe(true);
    });

    it('向き判定が正しく動作する', () => {
      mockWindow.innerWidth = 400;
      mockWindow.innerHeight = 800;
      expect(manager.isPortrait()).toBe(true);
      expect(manager.isLandscape()).toBe(false);
    });
  });

  describe('メディアクエリマッチング', () => {
    it('メディアクエリが正しくマッチする', () => {
      // モックのmatchMediaを設定
      mockWindow.matchMedia.mockImplementation((query) => ({
        matches: query.includes('max-width: 767px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      expect(manager.matches('mobile')).toBe(true);
      expect(manager.matches('desktop')).toBe(false);
    });
  });

  describe('レスポンシブクラス適用', () => {
    it('レスポンシブクラスが正しく適用される', () => {
      const element = document.createElement('div');
      const addedClasses = [];
      element.classList.add = vi.fn((className) => {
        addedClasses.push(className);
      });
      element.classList.contains = vi.fn((className) => {
        return addedClasses.includes(className);
      });
      
      manager.applyResponsiveClasses(element, {
        prefix: 'test',
        includeBreakpoint: true,
        includeDevice: true,
        includeOrientation: true
      });

      expect(element.classList.contains('test-xs')).toBe(true);
      expect(element.classList.contains('test-mobile')).toBe(true);
      expect(element.classList.contains('test-portrait')).toBe(true);
    });

    it('既存のレスポンシブクラスが削除される', () => {
      const element = document.createElement('div');
      const addedClasses = [];
      const removedClasses = [];
      
      element.classList.add = vi.fn((className) => {
        addedClasses.push(className);
      });
      element.classList.remove = vi.fn((className) => {
        removedClasses.push(className);
        const index = addedClasses.indexOf(className);
        if (index > -1) {
          addedClasses.splice(index, 1);
        }
      });
      element.classList.contains = vi.fn((className) => {
        return addedClasses.includes(className);
      });
      
      // 既存のクラスを追加
      element.classList.add('test-lg', 'test-desktop');
      
      manager.applyResponsiveClasses(element, { prefix: 'test' });
      
      expect(element.classList.contains('test-lg')).toBe(false);
      expect(element.classList.contains('test-desktop')).toBe(false);
    });
  });

  describe('レスポンシブスタイル適用', () => {
    it('レスポンシブスタイルが正しく適用される', () => {
      const element = document.createElement('div');
      const styles = {
        mobile: { fontSize: '14px', padding: '10px' },
        desktop: { fontSize: '16px', padding: '20px' },
        default: { color: 'black' }
      };

      mockWindow.innerWidth = 400; // モバイルサイズ
      manager.applyResponsiveStyles(element, styles);

      expect(element.style.fontSize).toBe('14px');
      expect(element.style.padding).toBe('10px');
      expect(element.style.color).toBe('black');
    });
  });

  describe('レスポンシブ画像設定', () => {
    it('レスポンシブ画像が正しく設定される', () => {
      const img = document.createElement('img');
      const sources = {
        mobile: 'mobile-image.jpg',
        desktop: 'desktop-image.jpg',
        default: 'default-image.jpg'
      };

      mockWindow.innerWidth = 400; // モバイルサイズ
      manager.setResponsiveImage(img, sources);

      // 画像のsrcが設定されていることを確認（完全なURLになる可能性がある）
      expect(img.src).toContain('mobile-image.jpg');
    });
  });

  describe('レスポンシブレイアウト調整', () => {
    it('レスポンシブレイアウトが正しく調整される', () => {
      const container = document.createElement('div');
      const layout = {
        mobile: {
          grid: {
            columns: '1fr',
            rows: 'auto 1fr auto',
            gap: '10px'
          }
        },
        desktop: {
          grid: {
            columns: '200px 1fr 200px',
            rows: '1fr',
            gap: '20px'
          }
        }
      };

      mockWindow.innerWidth = 400; // モバイルサイズ
      manager.adjustLayout(container, layout);

      expect(container.style.display).toBe('grid');
      expect(container.style.gridTemplateColumns).toBe('1fr');
      expect(container.style.gridTemplateRows).toBe('auto 1fr auto');
      expect(container.style.gap).toBe('10px');
    });
  });

  describe('リスナー管理', () => {
    it('リスナーが正しく追加される', () => {
      const callback = vi.fn();
      manager.addListener('resize', callback);
      
      expect(manager.listeners.has('resize')).toBe(true);
      expect(manager.listeners.get('resize')).toContain(callback);
    });

    it('リスナーが正しく削除される', () => {
      const callback = vi.fn();
      manager.addListener('resize', callback);
      manager.removeListener('resize', callback);
      
      expect(manager.listeners.get('resize')).not.toContain(callback);
    });
  });

  describe('現在の状態取得', () => {
    it('現在の状態が正しく取得される', () => {
      mockWindow.innerWidth = 800;
      mockWindow.innerHeight = 600;
      
      const state = manager.getCurrentState();
      
      expect(state).toHaveProperty('breakpoint');
      expect(state).toHaveProperty('deviceType');
      expect(state).toHaveProperty('orientation');
      expect(state).toHaveProperty('width');
      expect(state).toHaveProperty('height');
      expect(state).toHaveProperty('isMobile');
      expect(state).toHaveProperty('isTablet');
      expect(state).toHaveProperty('isDesktop');
      expect(state).toHaveProperty('isPortrait');
      expect(state).toHaveProperty('isLandscape');
    });
  });

  describe('レスポンシブ設定取得', () => {
    it('レスポンシブ設定が正しく取得される', () => {
      const config = manager.getResponsiveConfig();
      
      expect(config).toHaveProperty('breakpoints');
      expect(config).toHaveProperty('deviceTypes');
      expect(config).toHaveProperty('orientations');
      expect(config).toHaveProperty('currentState');
      expect(config).toHaveProperty('mediaQueries');
      expect(config.breakpoints).toEqual(BREAKPOINTS);
      expect(config.deviceTypes).toEqual(DEVICE_TYPES);
      expect(config.orientations).toEqual(ORIENTATIONS);
    });
  });
});
