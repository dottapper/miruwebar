// src/utils/url-params.js
/**
 * URL パラメータ取得ユーティリティ
 * 通常のクエリパラメータとハッシュ後ろのクエリパラメータの両方に対応
 */

/**
 * プロジェクトsrcパラメータを取得（統一された取得ロジック）
 * @returns {string|null} プロジェクトのsrc URL（絶対URL）
 *
 * 優先順位:
 * 1. 通常のクエリパラメータ (?src=...)
 * 2. ハッシュ後ろのクエリパラメータ (#/viewer?src=...)
 * 3. sessionStorageに保存された値（早取り退避）
 */
export function getProjectSrc() {
  if (typeof window === 'undefined') return null;

  try {
    // 1. 通常のクエリパラメータから取得
    const u = new URL(location.href);
    const s1 = u.searchParams.get('src');
    if (s1) {
      const normalized = new URL(s1, location.origin).toString();
      console.log('[URL-PARAMS] getProjectSrc: found in normal query:', normalized);
      return normalized;
    }

    // 2. ハッシュ後ろのクエリパラメータから取得
    const h = location.hash || '';
    const qi = h.indexOf('?');
    if (qi >= 0) {
      const qs = new URLSearchParams(h.slice(qi + 1));
      const s2 = qs.get('src');
      if (s2) {
        const normalized = new URL(s2, location.origin).toString();
        console.log('[URL-PARAMS] getProjectSrc: found in hash query:', normalized);
        return normalized;
      }
    }

    // 3. sessionStorageから取得（早取り退避）
    const s3 = sessionStorage.getItem('project_src');
    if (s3) {
      console.log('[URL-PARAMS] getProjectSrc: found in sessionStorage:', s3);
      return s3;
    }

    console.warn('[URL-PARAMS] getProjectSrc: not found');
    return null;
  } catch (e) {
    console.error('[URL-PARAMS] getProjectSrc: error:', e);
    return null;
  }
}

/**
 * クエリパラメータを取得（フォールバック対応）
 * @param {string} name - パラメータ名
 * @returns {string|null} パラメータ値
 *
 * 対応形式:
 * - ?src=...#/viewer（通常のクエリ）
 * - #/viewer?src=...（ハッシュ後ろのクエリ）
 */
export function getParam(name) {
  if (typeof window === 'undefined') return null;

  // 1. 通常のクエリパラメータから取得を試みる
  const url = new URL(window.location.href);
  const normalParam = url.searchParams.get(name);
  if (normalParam) {
    console.log(`[URL-PARAMS] Found "${name}" in normal query:`, normalParam);
    return normalParam;
  }

  // 2. ハッシュ後ろのクエリパラメータから取得を試みる
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) {
    const hashQuery = hash.slice(queryIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    const hashParam = hashParams.get(name);
    if (hashParam) {
      console.log(`[URL-PARAMS] Found "${name}" in hash query:`, hashParam);
      return hashParam;
    }
  }

  console.log(`[URL-PARAMS] Parameter "${name}" not found`);
  return null;
}

/**
 * すべてのクエリパラメータを取得（フォールバック対応）
 * @returns {Object} パラメータのキーバリューペア
 */
export function getAllParams() {
  if (typeof window === 'undefined') return {};

  const params = {};

  // 通常のクエリパラメータ
  const url = new URL(window.location.href);
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  // ハッシュ後ろのクエリパラメータ
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) {
    const hashQuery = hash.slice(queryIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    for (const [key, value] of hashParams.entries()) {
      // 通常のクエリパラメータを優先
      if (!params[key]) {
        params[key] = value;
      }
    }
  }

  return params;
}

/**
 * searchパラメータを保持したままURL書き換えを行う
 * @param {string} newHash - 新しいハッシュ（例: '#/viewer'）
 */
export function navigateWithSearch(newHash) {
  if (typeof window === 'undefined') return;

  const currentSearch = window.location.search;
  const newUrl = window.location.pathname + currentSearch + newHash;

  console.log('[URL-PARAMS] navigateWithSearch:', {
    from: window.location.href,
    to: newUrl,
    search: currentSearch,
    hash: newHash
  });

  history.replaceState(null, '', newUrl);
}

/**
 * デバッグ用: URL構造をログ出力
 */
export function debugURL() {
  if (typeof window === 'undefined') return;

  console.group('[URL-PARAMS] Debug Info');
  console.log('Full URL:', window.location.href);
  console.log('Origin:', window.location.origin);
  console.log('Pathname:', window.location.pathname);
  console.log('Search:', window.location.search);
  console.log('Hash:', window.location.hash);
  console.log('All Params:', getAllParams());
  console.groupEnd();
}
