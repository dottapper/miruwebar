// src/effects/effect-presets.js
/** Studio / 公開 JSON 用の AR 演出プリセット（詳細編集は Phase 7 MVP では行わない） */

export const EFFECT_PRESET_NONE = 'none';
export const EFFECT_PRESET_PORTAL_DEEP_SPACE = 'portal-deep-space';

export const EFFECT_PRESET_OPTIONS = [
  { id: EFFECT_PRESET_NONE, label: 'なし（モデルのみ）' },
  { id: EFFECT_PRESET_PORTAL_DEEP_SPACE, label: 'Portal Marker（深宇宙）' }
];

/**
 * プリセット ID から project.json の effects 配列を生成する
 * @param {string} presetId
 * @returns {Array<Object>}
 */
export function buildEffectsFromPreset(presetId) {
  switch (presetId) {
    case EFFECT_PRESET_PORTAL_DEEP_SPACE:
      return [
        {
          id: 'portal-0',
          type: 'portal',
          trigger: 'markerFound',
          style: 'deep-space',
          openDurationMs: 1200,
          particle: true
        }
      ];
    case EFFECT_PRESET_NONE:
    default:
      return [];
  }
}

/**
 * 保存済み effects からプリセット ID を推定する
 * @param {Array<Object>|undefined} effects
 * @returns {string}
 */
export function inferPresetFromEffects(effects) {
  if (!Array.isArray(effects) || effects.length === 0) {
    return EFFECT_PRESET_NONE;
  }
  const portal = effects.find((e) => e && e.type === 'portal');
  if (portal?.style === 'deep-space') {
    return EFFECT_PRESET_PORTAL_DEEP_SPACE;
  }
  if (portal) {
    return EFFECT_PRESET_PORTAL_DEEP_SPACE;
  }
  return EFFECT_PRESET_NONE;
}
