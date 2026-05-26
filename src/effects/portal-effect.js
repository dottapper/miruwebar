// src/effects/portal-effect.js
/**
 * マーカー検出時の Portal Marker 演出（最小 MVP）
 * - 開くアニメーション（リングのスケール）
 * - 奥行き表現（内側の暗い円盤 + エミッシブリング）
 * - 任意の粒子
 * - 任意の音声（project.assets.audio の audioId）
 */

import * as THREE from 'three';
import { createLogger } from '../utils/logger.js';

const log = createLogger('PortalEffect');

const STYLE_PALETTES = {
  'deep-space': {
    ringColor: 0x6c5ce7,
    innerColor: 0x0a0a1a,
    particleColor: 0x00cec9,
    ambient: 0x9b59b6
  },
  default: {
    ringColor: 0x6c5ce7,
    innerColor: 0x111122,
    particleColor: 0xffffff,
    ambient: 0x8888ff
  }
};

function resolveAudioUrl(project, audioId, baseUrl) {
  if (!audioId || !project?.assets?.audio) return null;
  const entry = project.assets.audio.find((a) => a && a.id === audioId);
  if (!entry?.url) return null;
  const url = entry.url;
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  try {
    const folder = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    return new URL(url, folder).href;
  } catch {
    return url;
  }
}

/** Web Audio で短い開門音（アセット無し時のフォールバック） */
function playSyntheticPortalChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close().catch(() => {});
  } catch (e) {
    log.debug('合成ポータル音の再生をスキップ', e?.message);
  }
}

export class PortalEffect {
  /**
   * @param {Object} options
   * @param {import('../components/ar/marker-ar.js').MarkerAR} options.engine
   * @param {Object} options.config - effect 定義
   * @param {Object} options.project - project.json
   */
  constructor({ engine, config, project }) {
    this.engine = engine;
    this.config = config || {};
    this.project = project || {};
    this.group = null;
    this.particles = null;
    this.particleVelocities = null;
    this.startedAt = 0;
    this.openDurationMs = Number(config.openDurationMs) || 1200;
    this._disposed = false;
    this._audioEl = null;
    this.palette = STYLE_PALETTES[config.style] || STYLE_PALETTES.default;
  }

  /**
   * 演出を開始し、開門アニメーション完了まで待つ
   * @returns {Promise<void>}
   */
  async play() {
    const T = this.engine._T || THREE;
    const markerRoot = this.engine.markerRoot;
    if (!markerRoot) {
      log.warn('markerRoot がありません');
      return;
    }

    this._playAudio();

    this.group = new T.Group();
    this.group.position.set(0, 0.02, 0);
    this.group.rotation.x = -Math.PI / 2;
    this.group.scale.set(0.01, 0.01, 0.01);

    const ringGeo = new T.TorusGeometry(0.42, 0.04, 16, 48);
    const ringMat = new T.MeshStandardMaterial({
      color: this.palette.ringColor,
      emissive: this.palette.ringColor,
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.35,
      transparent: true,
      opacity: 0.95
    });
    const ring = new T.Mesh(ringGeo, ringMat);
    this.group.add(ring);

    const innerGeo = new T.CircleGeometry(0.32, 32);
    const innerMat = new T.MeshBasicMaterial({
      color: this.palette.innerColor,
      transparent: true,
      opacity: 0.92,
      side: T.DoubleSide
    });
    const inner = new T.Mesh(innerGeo, innerMat);
    inner.position.z = 0.002;
    this.group.add(inner);

    const glowGeo = new T.RingGeometry(0.28, 0.38, 32);
    const glowMat = new T.MeshBasicMaterial({
      color: this.palette.particleColor,
      transparent: true,
      opacity: 0.35,
      side: T.DoubleSide,
      blending: T.AdditiveBlending
    });
    const glow = new T.Mesh(glowGeo, glowMat);
    glow.position.z = 0.003;
    this.group.add(glow);

    if (this.config.particle !== false) {
      this._createParticles(T);
    }

    markerRoot.add(this.group);
    this.startedAt = performance.now();

    await new Promise((resolve) => {
      const check = () => {
        if (this._disposed) {
          resolve();
          return;
        }
        const t = (performance.now() - this.startedAt) / this.openDurationMs;
        const eased = 1 - Math.pow(1 - Math.min(t, 1), 3);
        const s = 0.01 + eased * 0.99;
        if (this.group) {
          this.group.scale.set(s, s, s);
          glowMat.opacity = 0.2 + eased * 0.5;
        }
        if (t >= 1) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });

    log.info('Portal 開門アニメーション完了');
  }

  _createParticles(T) {
    const count = 64;
    const positions = new Float32Array(count * 3);
    this.particleVelocities = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.05 + Math.random() * 0.2;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      this.particleVelocities.push({
        x: (Math.random() - 0.5) * 0.002,
        y: (Math.random() - 0.5) * 0.002,
        z: 0.004 + Math.random() * 0.006
      });
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    const mat = new T.PointsMaterial({
      color: this.palette.particleColor,
      size: 0.04,
      transparent: true,
      opacity: 0.9,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    this.particles = new T.Points(geo, mat);
    this.particles.position.z = 0.01;
    this.group.add(this.particles);
  }

  _playAudio() {
    const baseUrl = this.project.__sourceUrl || (typeof location !== 'undefined' ? location.href : '');
    const audioUrl = resolveAudioUrl(this.project, this.config.audioId, baseUrl);
    if (audioUrl) {
      try {
        this._audioEl = new Audio(audioUrl);
        this._audioEl.volume = 0.6;
        this._audioEl.play().catch((e) => {
          log.debug('ポータル音声再生失敗', e?.message);
          playSyntheticPortalChime();
        });
      } catch {
        playSyntheticPortalChime();
      }
    } else {
      playSyntheticPortalChime();
    }
  }

  /**
   * フレーム更新（粒子の漂い）
   * @param {number} now - performance.now()
   */
  update(now) {
    if (this._disposed || !this.particles || !this.particleVelocities) return;
    const pos = this.particles.geometry.attributes.position;
    for (let i = 0; i < this.particleVelocities.length; i++) {
      const v = this.particleVelocities[i];
      pos.array[i * 3] += v.x;
      pos.array[i * 3 + 1] += v.y;
      pos.array[i * 3 + 2] += v.z;
      const dist = Math.hypot(pos.array[i * 3], pos.array[i * 3 + 1]);
      if (dist > 0.55) {
        const angle = Math.random() * Math.PI * 2;
        pos.array[i * 3] = Math.cos(angle) * 0.08;
        pos.array[i * 3 + 1] = Math.sin(angle) * 0.08;
        pos.array[i * 3 + 2] = 0;
      }
    }
    pos.needsUpdate = true;
    const pulse = 0.85 + Math.sin(now * 0.004) * 0.15;
    if (this.group) {
      this.group.children.forEach((child) => {
        if (child.material?.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = pulse;
        }
      });
    }
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this._audioEl) {
      try {
        this._audioEl.pause();
      } catch (_) {}
      this._audioEl = null;
    }
    if (this.group && this.engine?.markerRoot) {
      try {
        this.engine.markerRoot.remove(this.group);
      } catch (_) {}
      this.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.group = null;
    }
    this.particles = null;
    this.particleVelocities = null;
  }
}
