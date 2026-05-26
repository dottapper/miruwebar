/**
 * 公開 project.json からマーカー AR エンジンを解決する
 */

/**
 * @param {Object|null|undefined} project
 * @returns {'mindar'|'marker'}
 */
export function resolveMarkerEngineType(project) {
  const marker = project?.assets?.marker || project?.marker;
  if (marker?.type === 'imageTarget') return 'mindar';
  if (marker?.engine === 'mindar') return 'mindar';
  return 'marker';
}

/**
 * @param {Object|null|undefined} project
 * @returns {string|null} .mind ターゲットの URL
 */
export function resolveImageTargetSrc(project) {
  const marker = project?.assets?.marker || project?.marker;
  return marker?.targetUrl || project?.imageTargetSrc || null;
}

/**
 * 自然画像（非正方形）なら imageTarget を推奨
 * @param {number} width
 * @param {number} height
 * @returns {'pattern'|'imageTarget'}
 */
export function inferMarkerTypeFromDimensions(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return 'pattern';
  }
  const ratio = w / h;
  const nearSquare = ratio >= 0.85 && ratio <= 1.15;
  return nearSquare ? 'pattern' : 'imageTarget';
}
