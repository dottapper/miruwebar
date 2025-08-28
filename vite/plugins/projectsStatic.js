import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();

// /projects 下の project.json を静的配信
export function projectsStaticPlugin() {
  return {
    name: 'project-static-json',
    configureServer(server) {
      server.middlewares.use('/projects', (req, res, next) => {
        if (!(req.method === 'GET' && req.url?.endsWith('.json'))) return next();

        console.log('📡 project.json配信:', req.url);
        const relativePath = req.url; // 例: /1755953302605/project.json
        const filePath = path.join(ROOT, 'public', 'projects', relativePath);
        console.log('📁 ファイルパス:', filePath);

        if (fs.existsSync(filePath)) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          const content = fs.readFileSync(filePath, 'utf8');
          console.log('✅ project.json配信成功');
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

