// tests/security/security-manager.test.js
// セキュリティ管理システムのテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { securityManager, security } from '../../src/utils/security-manager.js';

describe('SecurityManager', () => {
  let securityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
  });

  describe('HTMLエスケープ', () => {
    it('基本的なHTMLエスケープが正しく動作する', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      expect(securityManager.escapeHTML(input)).toBe(expected);
    });

    it('属性値のエスケープが正しく動作する', () => {
      const input = '"><script>alert("XSS")</script>';
      const expected = '&quot;&gt;&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      expect(securityManager.escapeAttribute(input)).toBe(expected);
    });

    it('空文字列やnullを安全に処理する', () => {
      expect(securityManager.escapeHTML('')).toBe('');
      expect(securityManager.escapeHTML(null)).toBe('null');
      expect(securityManager.escapeHTML(undefined)).toBe('undefined');
    });
  });

  describe('URLサニタイズ', () => {
    it('安全なURLを許可する', () => {
      const safeUrls = [
        'https://example.com',
        'http://localhost:3000',
        '/relative/path',
        './relative/path',
        '../relative/path',
        '#anchor',
        '?query=value'
      ];

      safeUrls.forEach(url => {
        expect(securityManager.sanitizeURL(url)).toBe(url);
      });
    });

    it('危険なURLをブロックする', () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd'
      ];

      dangerousUrls.forEach(url => {
        expect(securityManager.sanitizeURL(url)).toBe('');
      });
    });
  });

  describe('HTMLサニタイズ', () => {
    it('許可されたタグのみを保持する', () => {
      const input = '<div><script>alert("XSS")</script><p>Safe content</p></div>';
      const result = securityManager.sanitizeHTML(input);
      expect(result).toContain('<div>');
      expect(result).toContain('<p>Safe content</p>');
      expect(result).not.toContain('<script>');
    });

    it('危険な属性を除去する', () => {
      const input = '<div onclick="alert(\'XSS\')" class="safe">Content</div>';
      const result = securityManager.sanitizeHTML(input);
      expect(result).toContain('class="safe"');
      expect(result).not.toContain('onclick');
    });

    it('タグを完全に除去するオプションが動作する', () => {
      const input = '<div><p>Content</p></div>';
      const result = securityManager.sanitizeHTML(input, { stripTags: true });
      expect(result).toBe('Content');
    });
  });

  describe('入力検証', () => {
    it('必須フィールドの検証が正しく動作する', () => {
      const result = securityManager.validateInput('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('必須項目です');
    });

    it('文字列の長さ制限が正しく動作する', () => {
      const longText = 'a'.repeat(1001);
      const result = securityManager.validateInput(longText, { maxLength: 1000 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最大1000文字まで入力可能です');
    });

    it('メールアドレスの検証が正しく動作する', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      
      const validResult = securityManager.validateInput(validEmail, { type: 'email' });
      const invalidResult = securityManager.validateInput(invalidEmail, { type: 'email' });
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('URLの検証が正しく動作する', () => {
      const validUrl = 'https://example.com';
      const invalidUrl = 'not-a-url';
      
      const validResult = securityManager.validateInput(validUrl, { type: 'url' });
      const invalidResult = securityManager.validateInput(invalidUrl, { type: 'url' });
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('安全な要素作成', () => {
    it('安全な要素が正しく作成される', () => {
      const element = securityManager.createSafeElement('div', { class: 'test' }, 'Content');
      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test');
      expect(element.textContent).toBe('Content');
    });

    it('危険な属性が除去される', () => {
      const element = securityManager.createSafeElement('div', { 
        class: 'safe', 
        onclick: 'alert("XSS")' 
      }, 'Content');
      expect(element.getAttribute('class')).toBe('safe');
      expect(element.getAttribute('onclick')).toBeNull();
    });
  });

  describe('ファイル名サニタイズ', () => {
    it('危険な文字が除去される', () => {
      const dangerousName = 'file<>:"/\\|?*.txt';
      const sanitized = securityManager.sanitizeFilename(dangerousName);
      expect(sanitized).toBe('file___________.txt');
    });

    it('相対パスが安全化される', () => {
      const dangerousName = '../../../etc/passwd';
      const sanitized = securityManager.sanitizeFilename(dangerousName);
      expect(sanitized).toBe('___etc_passwd');
    });
  });

  describe('データサニタイズ', () => {
    it('文字列データがサニタイズされる', () => {
      const data = '<script>alert("XSS")</script>';
      const sanitized = securityManager.sanitizeData(data);
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('オブジェクトデータが再帰的にサニタイズされる', () => {
      const data = {
        name: '<script>alert("XSS")</script>',
        description: 'Safe content',
        nested: {
          value: '<img src="x" onerror="alert(\'XSS\')">'
        }
      };
      const sanitized = securityManager.sanitizeData(data);
      expect(sanitized.name).toContain('&lt;script&gt;');
      expect(sanitized.description).toBe('Safe content');
      expect(sanitized.nested.value).toContain('&lt;img');
    });
  });
});

describe('Security Helper Functions', () => {
  describe('security.escape', () => {
    it('HTMLエスケープが正しく動作する', () => {
      const input = '<script>alert("XSS")</script>';
      const result = security.escape(input);
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('security.sanitizeURL', () => {
    it('安全なURLが許可される', () => {
      const url = 'https://example.com';
      expect(security.sanitizeURL(url)).toBe(url);
    });

    it('危険なURLがブロックされる', () => {
      const url = 'javascript:alert("XSS")';
      expect(security.sanitizeURL(url)).toBe('');
    });
  });

  describe('security.validate', () => {
    it('入力検証が正しく動作する', () => {
      const result = security.validate('test@example.com', { type: 'email' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('security.createElement', () => {
    it('安全な要素が作成される', () => {
      const element = security.createElement('div', { class: 'test' }, 'Content');
      expect(element.tagName).toBe('DIV');
      expect(element.textContent).toBe('Content');
    });
  });

  describe('security.setContent', () => {
    it('安全なコンテンツが設定される', () => {
      const element = document.createElement('div');
      security.setContent(element, '<script>alert("XSS")</script>');
      expect(element.innerHTML).toContain('&lt;script&gt;');
    });
  });
});
