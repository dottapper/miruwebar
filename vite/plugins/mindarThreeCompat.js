/**
 * mind-ar 1.2.x は Three.js r151 以前の sRGBEncoding / outputEncoding API を参照する。
 * 本プロジェクトの three@0.165 向けにビルド時変換する。
 */
export function mindarThreeCompatPlugin() {
  return {
    name: 'mindar-three-compat',
    transform(code, id) {
      if (!id.includes('mind-ar') || !id.includes('mindar-image-three')) {
        return null;
      }
      let next = code.replace(
        /sRGBEncoding as (\w+)/g,
        'SRGBColorSpace as $1'
      );
      next = next.replace(
        /\.outputEncoding = (\w+)/g,
        '.outputColorSpace = $1'
      );
      return { code: next, map: null };
    }
  };
}
