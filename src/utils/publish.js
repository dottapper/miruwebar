// src/utils/publish.js
import JSZip from 'jszip';

/**
 * プロジェクトの公開用ZIPを生成
 * - project.json
 * - assets/（指定された相対パス）
 * - viewer.html（#/viewer?src=対応の固定ページ）
 */
export async function exportProjectBundle({ project, assetUrls = [] }) {
  const zip = new JSZip();

  // 1. project.json
  const projectJson = JSON.stringify(project, null, 2);
  zip.file('project.json', projectJson);

  // 2. assets（URLから取得して同梱）
  const assetsFolder = zip.folder('assets');
  for (const url of assetUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const name = url.split('/').pop() || 'asset.bin';
      const arrayBuffer = await blob.arrayBuffer();
      assetsFolder.file(name, arrayBuffer);
    } catch (e) {
      console.warn('資産の取得に失敗:', url, e);
    }
  }

  // 3. viewer.html（最小版）
  const viewerHtml = `<!doctype html>
<html lang="ja">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>miru-webAR Viewer</title>
<style>
  html,body,#app{height:100%;margin:0;background:#0a0a0a;color:#fff;font-family:sans-serif}
  .center{display:flex;align-items:center;justify-content:center;height:100%;}
  a{color:#7C4DFF}
</style>
<div id="app"></div>
<script type="module">
  // 固定ビューア。?src= で project.json を指定
  async function start() {
    const hash = window.location.hash || '#/viewer';
    if (!hash.startsWith('#/viewer')) {
      document.getElementById('app').innerHTML = '<div class="center">#/viewer?src= を指定してください</div>';
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const src = params.get('src') || 'project.json';
    const appUrl = '${location.origin}';
    const url = src;
    const res = await fetch(url);
    if (!res.ok) throw new Error('project.json fetch failed');
    const project = await res.json();
    document.getElementById('app').innerHTML = '<div class="center">公開用プロジェクトを読み込みました。<br>ホスト側のアプリで開いてください。</div>';
  }
  start().catch(e=>{
    document.getElementById('app').innerHTML = '<div class="center">読み込みに失敗しました: '+e.message+'</div>';
  });
</script>
`;
  zip.file('viewer.html', viewerHtml);

  // ZIPをBlobで返す
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}
