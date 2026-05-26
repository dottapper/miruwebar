/**
 * 公開 project.json 用アセット処理（api/publish-project.js / Vite dev 共通）
 * data:image/... を Blob / ローカルファイル URL に置き換える。
 */

import { inferMarkerTypeFromDimensions } from '../src/utils/marker-engine-resolve.js';

/** data URL から { buffer, contentType } を取り出す。data URL でなければ null */
export function decodeDataUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('data:')) return null;
  const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const contentType = match[1] || 'application/octet-stream';
  const base64 = (match[3] || '').split(',').pop();
  return { buffer: Buffer.from(base64, 'base64'), contentType };
}

/** Base64 文字列（data URL なし）を buffer 化 */
export function decodeBase64Payload(value, contentType = 'application/octet-stream') {
  if (typeof value !== 'string' || !value.trim()) return null;
  const base64 = value.includes(',') ? value.split(',').pop() : value;
  try {
    return { buffer: Buffer.from(base64, 'base64'), contentType };
  } catch {
    return null;
  }
}

export function extFromContentType(contentType) {
  if (!contentType) return 'bin';
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  const part = contentType.split('/')[1];
  return (part || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
}

/** 公開 JSON 内に残っている data:image/ のパスを列挙 */
export function collectDataImagePaths(value, trail = '') {
  const hits = [];
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    hits.push(trail || '(root)');
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...collectDataImagePaths(item, `${trail}[${index}]`));
    });
    return hits;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      hits.push(...collectDataImagePaths(nested, trail ? `${trail}.${key}` : key));
    }
  }
  return hits;
}

/**
 * オブジェクト内の data:image/ を再帰的に URL 化
 * @param {*} value
 * @param {(dataUrl: string) => Promise<string>} uploadDataUrl
 * @param {{ skipKeys?: string[] }} [options]
 */
export async function externalizeDataUrls(value, uploadDataUrl, options = {}) {
  const { skipKeys = [] } = options;
  if (value == null) return value;
  if (typeof value === 'string') {
    if (!value.startsWith('data:image/')) return value;
    return uploadDataUrl(value);
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      out.push(await externalizeDataUrls(item, uploadDataUrl, options));
    }
    return out;
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (skipKeys.includes(key)) {
        out[key] = nested;
        continue;
      }
      out[key] = await externalizeDataUrls(nested, uploadDataUrl, options);
    }
    return out;
  }
  return value;
}

const SCREEN_SKIP_KEYS = ['templateSettings'];

/**
 * 開始 / ローディング / ガイド画面の data URL 画像を URL 参照へ変換
 */
export async function preparePublishedScreens(screens, uploadDataUrl) {
  const { startScreen, loadingScreen, guideScreen } = screens;
  const opts = { skipKeys: SCREEN_SKIP_KEYS };
  return {
    startScreen: startScreen
      ? await externalizeDataUrls({ ...startScreen }, uploadDataUrl, opts)
      : null,
    loadingScreen: loadingScreen
      ? await externalizeDataUrls({ ...loadingScreen }, uploadDataUrl, opts)
      : null,
    guideScreen: guideScreen
      ? await externalizeDataUrls({ ...guideScreen }, uploadDataUrl, opts)
      : null
  };
}

/**
 * マーカーアセットを公開用に構築（pattern / imageTarget）
 */
export async function buildMarkerAssetForPublish(
  { markerImage, markerPattern, marker },
  { uploadImage, uploadFile }
) {
  let markerType = marker?.type || 'pattern';
  const imgW = Number(marker?.imageWidth);
  const imgH = Number(marker?.imageHeight);
  if (imgW > 0 && imgH > 0) {
    const inferred = inferMarkerTypeFromDimensions(imgW, imgH);
    if (inferred === 'imageTarget') markerType = 'imageTarget';
  }

  if (markerType === 'imageTarget') {
    let targetUrl = marker?.targetUrl || null;
    if (!targetUrl || String(targetUrl).startsWith('data:')) {
      const mindRaw =
        marker?.targetMind
        || marker?.targetMindBase64
        || (String(targetUrl || '').startsWith('data:') ? targetUrl : null);
      const decoded =
        decodeDataUrl(mindRaw)
        || decodeBase64Payload(mindRaw, 'application/octet-stream');
      if (!decoded) {
        throw Object.assign(
          new Error('imageTarget requires .mind target file (targetUrl or targetMind)'),
          { status: 400, code: 'IMAGE_TARGET_MIND_MISSING' }
        );
      }
      targetUrl = await uploadFile(decoded.buffer, 'marker-target.mind', 'application/octet-stream');
    }

    let sourceImageUrl =
      marker?.sourceImageUrl
      || marker?.sourceImage
      || markerImage
      || null;
    if (sourceImageUrl && String(sourceImageUrl).startsWith('data:')) {
      sourceImageUrl = await uploadImage(sourceImageUrl, 'marker-source');
    }

    let physicalAspectRatio = marker?.physicalAspectRatio ?? null;
    if (physicalAspectRatio == null && marker?.imageWidth && marker?.imageHeight) {
      const w = Number(marker.imageWidth);
      const h = Number(marker.imageHeight);
      if (w > 0 && h > 0) physicalAspectRatio = w / h;
    }

    return {
      asset: {
        type: 'imageTarget',
        engine: 'mindar',
        sourceImageUrl: sourceImageUrl || null,
        targetUrl,
        url: sourceImageUrl || null,
        physicalAspectRatio,
        patternUrl: null
      },
      markerImageUrl: sourceImageUrl || null,
      markerPattern: null
    };
  }

  let markerImageUrl = markerImage;
  if (markerImageUrl && String(markerImageUrl).startsWith('data:')) {
    markerImageUrl = await uploadImage(markerImageUrl, 'marker');
  }

  return {
    asset: markerImageUrl
      ? { type: 'pattern', url: markerImageUrl, patternUrl: markerPattern || null }
      : null,
    markerImageUrl: markerImageUrl || null,
    markerPattern: markerPattern || null
  };
}
