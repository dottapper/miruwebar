// src/effects/effects-runtime.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeEffects,
  shouldDeferModelPlacement,
  EffectsRuntime
} from './effects-runtime.js';
import {
  buildEffectsFromPreset,
  inferPresetFromEffects,
  EFFECT_PRESET_PORTAL_DEEP_SPACE,
  EFFECT_PRESET_NONE
} from './effect-presets.js';

describe('effect-presets', () => {
  it('portal-deep-space プリセットで effects を生成', () => {
    const effects = buildEffectsFromPreset(EFFECT_PRESET_PORTAL_DEEP_SPACE);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('portal');
    expect(effects[0].trigger).toBe('markerFound');
  });

  it('保存済み effects からプリセットを推定', () => {
    const effects = buildEffectsFromPreset(EFFECT_PRESET_PORTAL_DEEP_SPACE);
    expect(inferPresetFromEffects(effects)).toBe(EFFECT_PRESET_PORTAL_DEEP_SPACE);
    expect(inferPresetFromEffects([])).toBe(EFFECT_PRESET_NONE);
  });
});

describe('effects-runtime', () => {
  it('normalizeEffects は不正要素を除外する', () => {
    const out = normalizeEffects([
      null,
      { type: 'portal', trigger: 'markerFound' },
      { trigger: 'markerFound' }
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('effect-0');
  });

  it('portal があるときモデル配置を遅延する', () => {
    expect(shouldDeferModelPlacement([])).toBe(false);
    expect(
      shouldDeferModelPlacement([{ type: 'portal', trigger: 'markerFound' }])
    ).toBe(true);
  });

  describe('EffectsRuntime.attach', () => {
    let engine;

    beforeEach(() => {
      engine = {
        autoPlaceOnMarkerFound: true,
        onMarkerFound: null,
        onMarkerLost: null,
        loadedModels: [],
        placedModel: null,
        placedGroup: null,
        placeModel: vi.fn()
      };
    });

    it('effects が空なら attach しない', () => {
      const runtime = new EffectsRuntime({ engine, project: { effects: [] } });
      runtime.attach();
      expect(runtime._mounted).toBe(false);
    });

    it('portal 設定で autoPlaceOnMarkerFound をオフにする', () => {
      const project = {
        effects: [{ id: 'p0', type: 'portal', trigger: 'markerFound', style: 'deep-space' }]
      };
      const runtime = new EffectsRuntime({ engine, project });
      runtime.attach();
      expect(engine.autoPlaceOnMarkerFound).toBe(false);
      runtime.detach();
      expect(engine.autoPlaceOnMarkerFound).toBe(true);
    });
  });
});
