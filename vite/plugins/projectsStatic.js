import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();

// /projects 下の project.json を静的配信
export function projectsStaticPlugin() {
  return {
    name: 'project-static-json',
    configureServer(server) {
      const DEBUG = process.env.DEBUG === '1' || process.env.VERBOSE === '1';
      // ベースディレクトリ外への参照を防ぐ安全な結合
      const safeJoin = (base, target) => {
        const sanitized = String(target || '').replace(/^\/+/, '');
        const resolved = path.resolve(base, sanitized);
        const baseResolved = path.resolve(base);
        if (!resolved.startsWith(baseResolved)) return null;
        return resolved;
      };

      server.middlewares.use('/projects', (req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];
        if (!(req.method === 'GET' && urlPath.endsWith('.json'))) return next();

        if (DEBUG) console.log('📡 project.json配信:', urlPath);
        const baseDir = path.join(ROOT, 'public', 'projects');
        const trimmed = (urlPath || '/').replace(/^\/+/, '');
        const filePath = safeJoin(baseDir, trimmed);
        if (DEBUG) console.log('📁 ファイルパス:', filePath);

        if (filePath && fs.existsSync(filePath)) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          const content = fs.readFileSync(filePath, 'utf8');
          if (DEBUG) console.log('✅ project.json配信成功');
          res.end(content);
        } else {
          console.error('❌ project.jsonファイルが見つかりません:', filePath);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'プロジェクトが見つかりません' }));
        }
      });
    }
  };
}
