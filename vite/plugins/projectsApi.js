import path from 'path';
import fs from 'fs-extra';
import { getServerNetworkIP } from '../utils/network.js';

const ROOT = process.cwd();

export function projectsApiPlugin() {
  return {
    name: 'project-api',
    configureServer(server) {
      const DEBUG = process.env.DEBUG === '1' || process.env.VERBOSE === '1';
      const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'project';
      const sanitizeFileName = (name) => {
        const base = (name || 'model.glb').toString();
        const just = base.split(/[\\/]/).pop();
        const safe = just.replace(/[^a-zA-Z0-9._-]/g, '_');
        return safe.slice(0, 100) || 'model.glb';
      };
      const isAllowedExt = (name) => /\.(glb|gltf)$/i.test(name);
      const MAX_MODEL_BYTES = 50 * 1024 * 1024; // 50MB/1 file
      const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100MB/req
      const MAX_BODY_BYTES = 150 * 1024 * 1024; // 上限（保護用。モデル合計100MB+余裕）

      function readRequestBody(req) {
        return new Promise((resolve, reject) => {
          let size = 0;
          let body = '';
          req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
              reject(Object.assign(new Error('Payload Too Large'), { status: 413 }));
              return;
            }
            body += chunk.toString();
          });
          req.on('end', () => resolve(body));
          req.on('error', reject);
        });
      }
      // POST /api/projects/:id/save => write public/projects/:id/project.json
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST') return next();
        const m = req.url && req.url.match(/^\/api\/projects\/([^/]+)\/save$/);
        if (!m) return next();
        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}');
          const projectData = parsed.projectData || parsed;
          const id = sanitizeId(m[1]);
          const dir = path.join(ROOT, 'public', 'projects', id);
          await fs.ensureDir(dir);
          await fs.writeJson(path.join(dir, 'project.json'), projectData, { spaces: 2 });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: `/projects/${id}/project.json` }));
        } catch (e) {
          if (e && e.status === 413) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'payload too large' }));
            return;
          }
          console.error('❌ /api/projects/:id/save 失敗:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'save failed', message: e.message }));
        }
      });

      // POST /api/publish-project => write public/projects/:id/(project.json + assets)
      server.middlewares.use(async (req, res, next) => {
        if (!(req.method === 'POST' && req.url === '/api/publish-project')) return next();
        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}');
          const { id: rawId, type = 'markerless', loadingScreen = null, models = [] } = parsed;
          const id = sanitizeId(rawId);
          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'id is required' }));
            return;
          }
          const dir = path.join(ROOT, 'public', 'projects', id);
          await fs.ensureDir(dir);
          const assetsDir = path.join(dir, 'assets');
          await fs.ensureDir(assetsDir);
          const modelEntries = [];
          let totalBytes = 0;
          for (const m of models) {
            try {
              let fileName = sanitizeFileName(m.fileName || 'model.glb');
              if (!isAllowedExt(fileName)) fileName = fileName + '.glb';
              const base64 = String(m.dataBase64 || '').split(',').pop();
              if (!base64) continue;
              const buf = Buffer.from(base64, 'base64');
              if (buf.length > MAX_MODEL_BYTES) {
                throw new Error(`file too large: ${fileName} (${buf.length} bytes)`);
              }
              totalBytes += buf.length;
              if (totalBytes > MAX_TOTAL_BYTES) {
                throw new Error(`total size exceeded (${totalBytes} bytes)`);
              }
              await fs.writeFile(path.join(dir, fileName), buf);
              modelEntries.push({ url: `/projects/${id}/${fileName}`, fileName, fileSize: buf.length });
            } catch (e) {
              if (DEBUG) console.warn('⚠️ モデル書き込み失敗（継続）:', e.message);
            }
          }
          // loadingScreen のアセット処理（ロゴ）
          let lsOut = loadingScreen ? { ...loadingScreen } : null;
          try {
            if (lsOut && typeof lsOut.logoImage === 'string' && /^data:image\//.test(lsOut.logoImage)) {
              const mime = (lsOut.logoImage.split(';')[0] || '').replace('data:', '') || 'image/png';
              const ext = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'png');
              const base64 = lsOut.logoImage.split(',')[1] || '';
              const buf = Buffer.from(base64, 'base64');
              // 画像は最大 2MB 程度に制限（安全策）
              if (buf.length > 2 * 1024 * 1024) throw new Error('logo too large');
              const logoName = `loading-logo.${ext}`;
              const logoPath = path.join(assetsDir, logoName);
              await fs.writeFile(logoPath, buf);
              lsOut.logo = `/projects/${id}/assets/${logoName}`;
              delete lsOut.logoImage;
            }
          } catch (e) {
            console.warn('⚠️ ロゴ画像の書き出し失敗（継続）:', e.message);
          }

          const projectJson = { id, type, loadingScreen: lsOut, models: modelEntries };
          await fs.writeJson(path.join(dir, 'project.json'), projectJson, { spaces: 2 });

          // 実際にリッスン中のポート/スキームを推定
          const scheme = (req.headers['x-forwarded-proto'] || (server.config.server.https ? 'https' : 'http'));
          const host = getServerNetworkIP();
          let port = 3000;
          try {
            const hostHeader = req.headers.host || '';
            const fromHeader = hostHeader.includes(':') ? Number(hostHeader.split(':').pop()) : undefined;
            const addr = server.httpServer && server.httpServer.address ? server.httpServer.address() : undefined;
            const fromServer = (addr && typeof addr === 'object') ? addr.port : undefined;
            port = fromHeader || fromServer || server.config.server.port || 3000;
          } catch (_) {}

          const viewerUrl = `${scheme}://${host}:${port}/#/viewer?src=${scheme}://${host}:${port}/projects/${id}/project.json`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, viewerUrl, projectUrl: `${scheme}://${host}:${port}/projects/${id}/project.json` }));
        } catch (e) {
          if (e && e.status === 413) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'payload too large' }));
            return;
          }
          console.error('❌ /api/publish-project 失敗:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'publish failed', message: e.message }));
        }
      });
    }
  };
}
