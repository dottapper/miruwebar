// src/utils/marker-utils.js
// マーカー画像を AR.js (.patt) 形式へ変換する共通ユーティリティ

const DEFAULT_PATTERN_SIZE = 16;

function drawImageToCanvas(image, size = DEFAULT_PATTERN_SIZE) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas コンテキストの取得に失敗しました');
  }

  const shortest = Math.min(image.width, image.height) || 1;
  const sx = (image.width - shortest) / 2;
  const sy = (image.height - shortest) / 2;
  ctx.drawImage(image, sx, sy, shortest, shortest, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

async function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (event) => {
      console.error('❌ 画像読み込みエラー詳細:', {
        url: dataUrl,
        urlの長さ: dataUrl?.length,
        urlの先頭100文字: dataUrl?.substring(0, 100),
        イベント: event,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      reject(new Error(`マーカー画像の読み込みに失敗しました: ${dataUrl?.substring(0, 100)}...`));
    };
    img.src = dataUrl;
  });
}

function generatePatternStringFromImageData(imageData) {
  const { width, height, data } = imageData;
  const channels = [];

  for (let channel = 0; channel < 3; channel += 1) {
    const rows = [];
    for (let y = 0; y < height; y += 1) {
      const cols = [];
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4 + channel;
        const value = Math.max(0, Math.min(255, Math.round(data[idx])));
        cols.push(value.toString().padStart(3, ' '));
      }
      rows.push(cols.join(' '));
    }
    channels.push(rows.join('\n'));
  }

  return `${channels[0]}\n\n${channels[1]}\n\n${channels[2]}`;
}

async function generatePatternWithTHREEx(dataUrl) {
  if (typeof window === 'undefined') return null;
  const loader = window.THREEx?.ArPatternFile;
  if (!loader || typeof loader.encodeImageURL !== 'function') return null;

  return new Promise((resolve, reject) => {
    try {
      loader.encodeImageURL(dataUrl, (pattern) => {
        if (pattern) {
          resolve(pattern);
        } else {
          reject(new Error('THREEx.ArPatternFile.encodeImageURL が失敗しました'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateMarkerPatternFromImage(dataUrl, { size = DEFAULT_PATTERN_SIZE } = {}) {
  if (!dataUrl) throw new Error('marker image dataUrl が未定義です');

  const patternFromToolkit = await generatePatternWithTHREEx(dataUrl).catch(() => null);
  if (patternFromToolkit) return patternFromToolkit;

  try {
    const image = await loadImage(dataUrl);
    const imageData = drawImageToCanvas(image, size);
    return generatePatternStringFromImageData(imageData);
  } catch (error) {
    console.warn('❌ 画像読み込み失敗、フォールバック画像を試行:', error.message);
    
    // フォールバック画像を試す
    const fallbackUrls = [
      '/assets/sample.png',
      '/assets/logo.png',
      '/assets/main-low.jpg'
    ];
    
    for (const fallbackUrl of fallbackUrls) {
      try {
        console.log('🔄 フォールバック画像を試行:', fallbackUrl);
        const fallbackImage = await loadImage(fallbackUrl);
        const imageData = drawImageToCanvas(fallbackImage, size);
        console.log('✅ フォールバック画像で成功:', fallbackUrl);
        return generatePatternStringFromImageData(imageData);
      } catch (fallbackError) {
        console.warn('⚠️ フォールバック画像も失敗:', fallbackUrl, fallbackError.message);
      }
    }
    
    throw new Error(`マーカー画像の読み込みに失敗しました。元のエラー: ${error.message}`);
  }
}

/**
 * マーカー画像の品質を解析する。
 *
 * 実際に .patt 化されるのは「画像中央の正方形クロップ範囲」だけなので、
 * その範囲を対象にコントラストと特徴量（模様の豊富さ）を評価する。
 * drawImageToCanvas() と同じクロップ規則を使うため、評価対象は
 * 実際のマーカー認識範囲と一致する。
 *
 * @param {string} dataUrl - 解析対象画像の dataURL もしくは URL
 * @param {{ size?: number }} options - 解析用の縮小サイズ（既定 64）
 * @returns {Promise<{
 *   naturalWidth: number, naturalHeight: number, isSquare: boolean,
 *   contrast: number, detail: number, brightness: number,
 *   level: 'good'|'warning'|'poor', issues: string[]
 * }>}
 */
export async function analyzeMarkerImage(dataUrl, { size = 64 } = {}) {
  if (!dataUrl) throw new Error('marker image dataUrl が未定義です');

  const image = await loadImage(dataUrl);
  const naturalWidth = image.width || 0;
  const naturalHeight = image.height || 0;
  // 短辺/長辺の差が 2% 未満なら正方形とみなす
  const longest = Math.max(naturalWidth, naturalHeight) || 1;
  const isSquare = naturalWidth > 0 && naturalHeight > 0 &&
    Math.abs(naturalWidth - naturalHeight) / longest < 0.02;

  // 中央正方形クロップ（.patt 変換と同じ範囲）を縮小して解析する
  const { data } = drawImageToCanvas(image, size);
  const pixelCount = size * size;

  // 輝度マップを作成しつつ平均輝度を求める
  const luminance = new Float32Array(pixelCount);
  let sum = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const lum = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    luminance[i] = lum;
    sum += lum;
  }
  const mean = sum / pixelCount;

  // コントラスト = 輝度の標準偏差
  let variance = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const d = luminance[i] - mean;
    variance += d * d;
  }
  const contrast = Math.sqrt(variance / pixelCount);

  // 特徴量 = 隣接ピクセル間の輝度差の平均（エッジ密度の指標）
  let gradientSum = 0;
  let gradientCount = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = y * size + x;
      if (x + 1 < size) {
        gradientSum += Math.abs(luminance[idx] - luminance[idx + 1]);
        gradientCount += 1;
      }
      if (y + 1 < size) {
        gradientSum += Math.abs(luminance[idx] - luminance[idx + size]);
        gradientCount += 1;
      }
    }
  }
  const detail = gradientCount > 0 ? gradientSum / gradientCount : 0;

  // 評価レベルを決定（good → warning → poor の一方向にのみ降格）
  const issues = [];
  let level = 'good';
  const demote = (next) => {
    if (next === 'poor' || (next === 'warning' && level === 'good')) level = next;
  };

  if (contrast < 25) {
    demote('poor');
    issues.push('コントラストが低すぎます。明暗の差がはっきりした画像を使ってください。');
  } else if (contrast < 45) {
    demote('warning');
    issues.push('コントラストがやや低めです。明暗の差が大きいほうが安定して認識されます。');
  }

  if (detail < 8) {
    demote('poor');
    issues.push('模様や特徴が少なすぎます。中央付近に複雑な模様がある画像が向いています。');
  } else if (detail < 15) {
    demote('warning');
    issues.push('模様や特徴がやや乏しめです。中央に細かい模様を入れると認識が安定します。');
  }

  return {
    naturalWidth,
    naturalHeight,
    isSquare,
    contrast: Math.round(contrast * 10) / 10,
    detail: Math.round(detail * 10) / 10,
    brightness: Math.round(mean),
    level,
    issues
  };
}

export function createPatternBlob(patternString) {
  if (!patternString) throw new Error('patternString が未定義です');
  const blob = new Blob([patternString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url)
  };
}
