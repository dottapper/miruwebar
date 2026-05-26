// src/effects/effects-runtime.js
/**
 * project.json の effects[] を Viewer AR シーンで再生するランタイム
 */

import { createLogger } from '../utils/logger.js';
import { PortalEffect } from './portal-effect.js';

const log = createLogger('EffectsRuntime');

/**
 * @param {Array<unknown>|undefined} raw
 * @returns {Array<Object>}
 */
export function normalizeEffects(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === 'object' && typeof e.type === 'string')
    .map((e, index) => ({
      id: e.id || `effect-${index}`,
      type: e.type,
      trigger: e.trigger || 'markerFound',
      ...e
    }));
}

/**
 * markerFound 時にモデル自動配置を遅延すべきか
 * @param {Array<Object>} effects
 */
export function shouldDeferModelPlacement(effects) {
  return effects.some(
    (e) => e.trigger === 'markerFound' && e.type === 'portal'
  );
}

export class EffectsRuntime {
  /**
   * @param {Object} options
   * @param {Object} options.engine - MarkerAR インスタンス
   * @param {Object} options.project - project.json
   */
  constructor({ engine, project }) {
    this.engine = engine;
    this.project = project || {};
    this.effects = normalizeEffects(project.effects);
    this.activeById = new Map();
    this._mounted = false;
    this._rafId = null;
    this._prevOnMarkerFound = null;
    this._prevOnMarkerLost = null;
    this._handlingFound = false;
  }

  attach() {
    if (this._mounted || !this.engine || this.effects.length === 0) {
      return;
    }
    this._mounted = true;

    if (shouldDeferModelPlacement(this.effects)) {
      this.engine.autoPlaceOnMarkerFound = false;
      log.info('マーカー検出時のモデル配置を Portal 完了後に遅延');
    }

    this._prevOnMarkerFound = this.engine.onMarkerFound;
    this._prevOnMarkerLost = this.engine.onMarkerLost;

    this.engine.onMarkerFound = () => {
      this._handleMarkerFound().catch((err) => {
        log.error('markerFound 演出エラー', err);
      });
      if (typeof this._prevOnMarkerFound === 'function') {
        this._prevOnMarkerFound();
      }
    };

    this.engine.onMarkerLost = () => {
      this._handleMarkerLost();
      if (typeof this._prevOnMarkerLost === 'function') {
        this._prevOnMarkerLost();
      }
    };

    this._startUpdateLoop();
    log.info('EffectsRuntime 接続', { count: this.effects.length });
  }

  detach() {
    if (!this._mounted) return;
    this._mounted = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._handleMarkerLost();
    if (this.engine) {
      this.engine.onMarkerFound = this._prevOnMarkerFound;
      this.engine.onMarkerLost = this._prevOnMarkerLost;
      this.engine.autoPlaceOnMarkerFound = true;
    }
    log.info('EffectsRuntime 切断');
  }

  async _handleMarkerFound() {
    if (this._handlingFound) return;
    this._handlingFound = true;
    try {
      const triggered = this.effects.filter((e) => e.trigger === 'markerFound');
      for (const config of triggered) {
        if (config.type === 'portal') {
          const portal = new PortalEffect({
            engine: this.engine,
            config,
            project: this.project
          });
          this.activeById.set(config.id, portal);
          await portal.play();
          if (!this.engine.autoPlaceOnMarkerFound) {
            const hasModels = (this.engine.loadedModels?.length || 0) > 0;
            if (hasModels && !this.engine.placedModel && !this.engine.placedGroup) {
              this.engine.placeModel();
            }
          }
        }
      }
    } finally {
      this._handlingFound = false;
    }
  }

  _handleMarkerLost() {
    for (const effect of this.activeById.values()) {
      effect.dispose?.();
    }
    this.activeById.clear();
  }

  _startUpdateLoop() {
    const tick = (now) => {
      if (!this._mounted) return;
      for (const effect of this.activeById.values()) {
        effect.update?.(now);
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }
}

/**
 * Marker エンジンに effects ランタイムを接続するファクトリ
 * @param {Object} engine
 * @param {Object} project
 * @returns {EffectsRuntime|null}
 */
export function attachEffectsRuntime(engine, project) {
  const effects = normalizeEffects(project?.effects);
  if (!engine || effects.length === 0) return null;
  const runtime = new EffectsRuntime({ engine, project });
  runtime.attach();
  return runtime;
}
