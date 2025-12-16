// src/utils/design-extractor.js
// Editor/Project に保存される複数のスキーマから
// Start/Loading/Guide のデザインを単一の形に正規化して返す

import { defaultTemplateSettings } from '../components/loading-screen/template-manager.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function shallowMerge(...parts) {
  const out = {};
  for (const p of parts) {
    if (isObj(p)) Object.assign(out, p);
  }
  return out;
}

function normalizeStartScreen({ tpl = {}, direct = {} }) {
  const base = defaultTemplateSettings?.startScreen || {};
  // templateSettings を最優先、次にプロジェクト直下（start / startScreen）
  const merged = shallowMerge(base, direct, tpl);
  return {
    title: merged.title,
    titlePosition: merged.titlePosition,
    titleSize: merged.titleSize,
    textColor: merged.textColor,
    backgroundColor: merged.backgroundColor,
    backgroundImage: merged.backgroundImage,
    buttonText: merged.buttonText,
    buttonColor: merged.buttonColor,
    buttonTextColor: merged.buttonTextColor,
    buttonPosition: merged.buttonPosition,
    buttonSize: merged.buttonSize,
    logo: merged.logo || merged.logoImage,
    logoPosition: merged.logoPosition,
    logoSize: merged.logoSize
  };
}

function normalizeLoadingScreen({ tpl = {}, direct = {} }) {
  const base = defaultTemplateSettings?.loadingScreen || {};
  // templateSettings を最優先、次にプロジェクト直下（loading / loadingScreen）
  const tplMapped = {
    backgroundColor: tpl.backgroundColor,
    textColor: tpl.textColor,
    progressColor: tpl.progressColor,
    message: tpl.message || tpl.loadingMessage,
    showProgress: tpl.showProgress,
    logo: tpl.logo,
    logoPosition: tpl.logoPosition,
    logoSize: tpl.logoSize,
    textPosition: tpl.textPosition
  };
  const directMapped = {
    backgroundColor: direct.backgroundColor,
    textColor: direct.textColor,
    message: direct.message,
    image: direct.image || direct.logo
  };
  const merged = shallowMerge(base, directMapped, tplMapped);
  return merged;
}

function normalizeGuideScreen({ tpl = {}, direct = {} }) {
  const base = defaultTemplateSettings?.guideScreen || {};
  const merged = shallowMerge(base, direct, tpl);
  // marker画像と文言にフォーカスして正規化
  const markerSrc = merged.marker?.src || merged.markerImageUrl || merged.guideImage || merged.imageUrl;
  return {
    backgroundColor: merged.backgroundColor,
    textColor: merged.textColor,
    mode: merged.mode || (direct.mode),
    title: merged.title || merged.surfaceDetection?.title || merged.worldTracking?.title,
    description: merged.description || merged.surfaceDetection?.description || merged.worldTracking?.description,
    message: merged.message, // 旧API互換
    marker: markerSrc ? { src: markerSrc } : undefined
  };
}

export function extractDesign(project = {}) {
  const ts = project?.loadingScreen?.templateSettings || {};

  // プロジェクト直下の表現（旧/新）を吸収
  const startDirect = project.start || project.startScreen || {};
  const loadingDirect = project.loading || project.loadingScreen || {};
  const guideDirect = project.guide || project.guideScreen || {};

  const startScreen = normalizeStartScreen({ tpl: ts.startScreen || {}, direct: startDirect });
  const loadingScreen = normalizeLoadingScreen({ tpl: ts.loadingScreen || {}, direct: loadingDirect });
  const guideScreen = normalizeGuideScreen({ tpl: ts.guideScreen || {}, direct: guideDirect });

  return { startScreen, loadingScreen, guideScreen };
}

export default extractDesign;

