/**
 * MindAR .mind ターゲットの localStorage 読み書き
 */

const STORAGE_KEY = 'markerTargetMind';

export function getStoredMindTarget() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function clearStoredMindTarget() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/**
 * .mind ファイルを base64 で localStorage に保存
 * @param {File} file
 * @returns {Promise<{ fileName: string, size: number }>}
 */
export function storeMindTargetFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('ファイルが選択されていません'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
        reject(new Error('.mind ファイルの読み込みに失敗しました'));
        return;
      }
      const base64 = dataUrl.split(',')[1];
      try {
        localStorage.setItem(STORAGE_KEY, base64);
        resolve({ fileName: file.name, size: file.size });
      } catch (error) {
        if (error?.name === 'QuotaExceededError') {
          reject(new Error('ストレージ容量が不足しています。.mind ファイルが大きすぎる可能性があります。'));
        } else {
          reject(error);
        }
      }
    };
    reader.onerror = () => reject(reader.error || new Error('.mind ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

export function formatMindTargetStatus(stored) {
  if (!stored) {
    return { registered: false, label: '未登録', detail: '' };
  }
  const approxBytes = Math.round((stored.length * 3) / 4);
  const kb = Math.max(1, Math.round(approxBytes / 1024));
  return {
    registered: true,
    label: '登録済み',
    detail: `約 ${kb} KB`
  };
}
