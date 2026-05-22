/**
 * ARビューアテスト用 url-params モック
 */
import { vi } from 'vitest';

export const mockGetProjectSrc = vi.fn(() => null);

vi.mock('../../src/utils/url-params.js', () => ({
  getProjectSrc: (...args) => mockGetProjectSrc(...args),
  getParam: vi.fn((name) => (name === 'src' ? mockGetProjectSrc() : null))
}));
