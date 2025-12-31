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
  // プロジェクト直下（start / startScreen）を最優先、templateSettingsは補完のみ
  const merged = shallowMerge(base, tpl, direct);

  // backgroundImageとbackgroundの両方をサポート（backgroundImageを優先）
  const bgImage = merged.backgroundImage || merged.background || merged.bg;

  return {
    title: merged.title || merged.titleText,
    titlePosition: merged.titlePosition,
    titleSize: merged.titleSize,
    textColor: merged.textColor || merged.titleColor,
    backgroundColor: merged.backgroundColor || merged.bgColor,
    backgroundImage: bgImage,
    // apply-project-design.jsとの互換性のためbackgroundにも設定
    background: bgImage,
    buttonText: merged.buttonText || merged.ctaText || '開始',
    buttonColor: merged.buttonColor || merged.ctaColor,
    buttonTextColor: merged.buttonTextColor || merged.ctaTextColor,
    buttonPosition: merged.buttonPosition,
    buttonSize: merged.buttonSize,
    logo: merged.logo || merged.logoImage || merged.logoUrl,
    logoPosition: merged.logoPosition,
    logoSize: merged.logoSize
  };
}

function normalizeLoadingScreen({ tpl = {}, direct = {} }) {
  const base = defaultTemplateSettings?.loadingScreen || {};
  // プロジェクト直下（loading / loadingScreen）を最優先、templateSettingsは補完のみ
  const tplMapped = {
    backgroundColor: tpl.backgroundColor || tpl.bgColor,
    textColor: tpl.textColor,
    progressColor: tpl.progressColor,
    message: tpl.message || tpl.loadingMessage || tpl.text,
    showProgress: tpl.showProgress,
    logo: tpl.logo || tpl.image,
    logoPosition: tpl.logoPosition,
    logoSize: tpl.logoSize,
    textPosition: tpl.textPosition,
    background: tpl.background || tpl.backgroundImage
  };
  const directMapped = {
    backgroundColor: direct.backgroundColor || direct.bgColor,
    textColor: direct.textColor,
    message: direct.message || direct.text,
    image: direct.image || direct.logo,
    logo: direct.logo || direct.image,
    background: direct.background || direct.backgroundImage
  };
  const merged = shallowMerge(base, tplMapped, directMapped);
  return merged;
}

function normalizeGuideScreen({ tpl = {}, direct = {} }) {
  const base = defaultTemplateSettings?.guideScreen || {};
  // プロジェクト直下（guide / guideScreen）を最優先、templateSettingsは補完のみ
  const merged = shallowMerge(base, tpl, direct);
  // marker画像と文言にフォーカスして正規化
  const markerSrc = merged.marker?.src || merged.markerImage || merged.markerImageUrl || merged.guideImage || merged.imageUrl;
  const bgImage = merged.backgroundImage || merged.background || merged.bg;

  return {
    backgroundColor: merged.backgroundColor || merged.bgColor,
    textColor: merged.textColor,
    background: bgImage,
    mode: merged.mode || (direct.mode),
    title: merged.title || merged.surfaceDetection?.title || merged.worldTracking?.title,
    description: merged.description || merged.surfaceDetection?.description || merged.worldTracking?.description,
    message: merged.message, // 旧API互換
    marker: markerSrc ? { src: markerSrc } : undefined,
    // apply-project-design.jsとの互換性
    markerImage: markerSrc
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

