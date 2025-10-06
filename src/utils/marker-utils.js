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

export function createPatternBlob(patternString) {
  if (!patternString) throw new Error('patternString が未定義です');
  const blob = new Blob([patternString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url)
  };
}
