import path from 'path';
import fs from 'fs-extra';
import { getServerNetworkIP } from '../utils/network.js';

const ROOT = process.cwd();

export function projectsApiPlugin() {
  return {
    name: 'project-api',
    configureServer(server) {
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
      // POST /api/projects/:id/save => write public/projects/:id/project.json
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST') return next();
        const m = req.url && req.url.match(/^\/api\/projects\/([^/]+)\/save$/);
        if (!m) return next();
        try {
          let body = '';
          req.on('data', (chunk) => { body += chunk.toString(); });
          await new Promise((resolve) => req.on('end', resolve));
          const parsed = JSON.parse(body || '{}');
          const projectData = parsed.projectData || parsed;
          const id = sanitizeId(m[1]);
          const dir = path.join(ROOT, 'public', 'projects', id);
          await fs.ensureDir(dir);
          await fs.writeJson(path.join(dir, 'project.json'), projectData, { spaces: 2 });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: `/projects/${id}/project.json` }));
        } catch (e) {
          console.error('❌ /api/projects/:id/save 失敗:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'save failed', message: e.message }));
        }
      });

      // POST /api/publish-project => write public/projects/:id/(project.json + glb files)
      server.middlewares.use(async (req, res, next) => {
        if (!(req.method === 'POST' && req.url === '/api/publish-project')) return next();
        try {
          let body = '';
          req.on('data', (chunk) => { body += chunk.toString(); });
          await new Promise((resolve) => req.on('end', resolve));
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
              console.warn('⚠️ モデル書き込み失敗（継続）:', e.message);
            }
          }
          const projectJson = { id, type, loadingScreen, models: modelEntries };
          await fs.writeJson(path.join(dir, 'project.json'), projectJson, { spaces: 2 });
          const scheme = server.config.server.https ? 'https' : 'http';
          // 実際のネットワークIPで返す（スマホでの動作を優先）
          const host = getServerNetworkIP();
          const port = server.config.server.port || 3000;
          const viewerUrl = `${scheme}://${host}:${port}/#/viewer?src=${scheme}://${host}:${port}/projects/${id}/project.json`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, viewerUrl, projectUrl: `${scheme}://${host}:${port}/projects/${id}/project.json` }));
        } catch (e) {
          console.error('❌ /api/publish-project 失敗:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'publish failed', message: e.message }));
        }
      });
    }
  };
}
