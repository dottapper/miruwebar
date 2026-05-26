// src/utils/design-extractor.js
// Editor/Project に保存される複数のスキーマから
// Start/Loading/Guide のデザインを単一の形に正規化して返す

import { defaultTemplateSettings } from '../components/loading-screen/template-manager.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function shallowMerge(...parts) {
  const out = {};
  for (const p of parts) {
    if (!isObj(p)) continue;
    // undefined 値で先行レイヤー（テンプレート等）を上書きしないようにする
    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined) out[k] = v;
    }
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

// ローディング画面の設定を単一形式へマッピング
// エディタの保存スキーマ（loadingMessage / brandName / subTitle / logoType 等）を
// 取りこぼさないよう、両スキーマのキーを吸収する。
function mapLoadingScreen(src = {}) {
  return {
    backgroundColor: src.backgroundColor || src.bgColor,
    textColor: src.textColor,
    accentColor: src.accentColor,
    progressColor: src.progressColor || src.accentColor,
    // message と loadingMessage の双方向エイリアス
    message: src.message || src.loadingMessage || src.text,
    loadingMessage: src.loadingMessage || src.message || src.text,
    brandName: src.brandName,
    subTitle: src.subTitle,
    showProgress: src.showProgress,
    image: src.image || src.logo,
    logo: src.logo || src.image,
    logoType: src.logoType,
    logoPosition: src.logoPosition,
    logoSize: src.logoSize,
    fontScale: src.fontScale,
    textPosition: src.textPosition,
    background: src.background || src.backgroundImage
  };
}

function normalizeLoadingScreen({ tpl = {}, direct = {} }) {
  const base = defaultTemplateSettings?.loadingScreen || {};
  // プロジェクト直下（loading / loadingScreen）を最優先、templateSettingsは補完のみ
  const merged = shallowMerge(mapLoadingScreen(base), mapLoadingScreen(tpl), mapLoadingScreen(direct));
  return merged;
}

function normalizeGuideScreen({ tpl = {}, direct = {}, projectType = null, projectMarkerImage = null }) {
  const base = defaultTemplateSettings?.guideScreen || {};
  // プロジェクト直下（guide / guideScreen）を最優先、templateSettingsは補完のみ
  const merged = shallowMerge(base, tpl, direct);

  // ★ markerタイプのプロジェクトではガイドモードをmarkerに強制
  const mode = (projectType === 'marker') ? 'marker' : (merged.mode || direct.mode || 'surface');

  // エディタが実際に編集するのはモード別のネスト設定（surfaceDetection / worldTracking）。
  // marker モードは surfaceDetection のUIで編集される。
  const surface = merged.surfaceDetection || {};
  const world = merged.worldTracking || {};
  const modeConfig = (mode === 'world') ? world : surface;

  // マーカー画像は「プロジェクト編集画面（ARエディタ）でアップロードした画像」を唯一のソースとする。
  // ローディング画面エディタ側の guideImage 設定は廃止済み。
  // ただし旧データ互換のためフォールバックとして既存パスも参照する。
  const markerSrc = projectMarkerImage
    || merged.marker?.src || merged.markerImage || merged.markerImageUrl
    || merged.guideImage || merged.imageUrl
    || modeConfig.guideImage || surface.guideImage;
  const bgImage = merged.backgroundImage || merged.background || merged.bg;

  // modeに応じた適切なタイトル/説明を選択。
  // モード別ネスト設定を最優先し、レガシーのトップレベル title/description
  // （常に既定値 'ガイド画面' / '準備中' が入る）は補完のみとする。
  const title = modeConfig.title || merged.title;
  const description = modeConfig.description || merged.description;
  const instructionText = modeConfig.instructionText;

  return {
    backgroundColor: merged.backgroundColor || merged.bgColor,
    textColor: merged.textColor,
    background: bgImage,
    mode,
    title,
    description,
    message: merged.message || instructionText, // 旧API互換
    marker: markerSrc ? { src: markerSrc } : undefined,
    // apply-project-design.jsとの互換性
    markerImage: markerSrc,
    // ビューア側でモード別表示を行う場合のためにネスト設定も保持
    surfaceDetection: merged.surfaceDetection,
    worldTracking: merged.worldTracking
  };
}

export function extractDesign(project = {}) {
  const ts = project?.loadingScreen?.templateSettings || {};
  const projectType = project.type || project.mode || null;
  // v2 (docs/product-spec.md §7) を最優先、レガシーへフォールバック
  const projectMarkerImage =
    project.assets?.marker?.url
    || project.markerImage
    || project.markerImageUrl
    || null;

  // プロジェクト直下の表現を v2 → 旧 → 最旧 の順で吸収
  const exp = project.experience || {};
  const startDirect = exp.startScreen || project.startScreen || project.start || {};
  const loadingDirect = exp.loadingScreen || project.loadingScreen || project.loading || {};
  const guideDirect = exp.guideScreen || project.guideScreen || project.guide || {};

  const startScreen = normalizeStartScreen({ tpl: ts.startScreen || {}, direct: startDirect });
  const loadingScreen = normalizeLoadingScreen({ tpl: ts.loadingScreen || {}, direct: loadingDirect });
  const guideScreen = normalizeGuideScreen({ tpl: ts.guideScreen || {}, direct: guideDirect, projectType, projectMarkerImage });

  return { startScreen, loadingScreen, guideScreen };
}

export default extractDesign;

