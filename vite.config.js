// vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * サーバーのネットワークIPアドレスを動的に取得
 */
function getServerNetworkIP() {
  const networkInterfaces = os.networkInterfaces();
  
  // 優先順位: WiFi > Ethernet > その他
  const preferredInterfaces = ['wlan0', 'wlp3s0', 'WiFi', 'Wi-Fi', 'eth0', 'en0', 'en1'];
  
  console.log('🔍 利用可能なネットワークインターfaces:', Object.keys(networkInterfaces));
  
  // 優先インターフェースから検索
  for (const interfaceName of preferredInterfaces) {
    const iface = networkInterfaces[interfaceName];
    if (iface) {
      for (const config of iface) {
        if (config.family === 'IPv4' && !config.internal) {
          console.log(`✅ 優先インターフェース ${interfaceName} からIP取得:`, config.address);
          return config.address;
        }
      }
    }
  }
  
  // 全インターフェースから検索（WiFi/Ethernetパターンを含む）
  for (const [interfaceName, configs] of Object.entries(networkInterfaces)) {
    if (interfaceName.toLowerCase().includes('wifi') || 
        interfaceName.toLowerCase().includes('wlan') || 
        interfaceName.toLowerCase().includes('eth') ||
        interfaceName.toLowerCase().includes('en')) {
      
      for (const config of configs) {
        if (config.family === 'IPv4' && !config.internal) {
          console.log(`✅ インターフェース ${interfaceName} からIP取得:`, config.address);
          return config.address;
        }
      }
    }
  }
  
  // フォールバック: 最初の非内部IPv4アドレス
  for (const [interfaceName, configs] of Object.entries(networkInterfaces)) {
    for (const config of configs) {
      if (config.family === 'IPv4' && !config.internal) {
        console.log(`⚠️ フォールバック - インターフェース ${interfaceName} からIP取得:`, config.address);
        return config.address;
      }
    }
  }
  
  console.warn('❌ ネットワークIP検出失敗 - localhostを使用');
  return 'localhost';
}

export default defineConfig({
  // ★★★ HMR設定の改善 ★★★
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: true, // エラーオーバーレイを有効化
      port: 3000
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  plugins: [
    // 開発用の簡易HTTPSを有効化（スマホのカメラ許可要件を満たす）
    basicSsl(),
    {
      name: 'project-api',
      configureServer(server) {
        // ネットワーク情報APIエンドポイント
        server.middlewares.use('/api/network-info', (req, res, next) => {
          if (req.method === 'GET') {
            console.log('🌐 ネットワーク情報API呼び出し');
            
            // Viteサーバーのネットワーク情報を取得
            const networkInfo = {
              networkIP: getServerNetworkIP(),
              port: server.config.server.port || 3000,
              timestamp: Date.now()
            };
            
            console.log('📡 送信するネットワーク情報:', networkInfo);
            
            res.writeHead(200, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(JSON.stringify(networkInfo));
          } else {
            next();
          }
        });

        // 静的project.json配信ミドルウェア
        server.middlewares.use('/projects', (req, res, next) => {
          if (req.method === 'GET' && req.url?.endsWith('.json')) {
            console.log('📡 project.json配信:', req.url);
            
            // /projects/1755953302605/project.json -> /1755953302605/project.json
            const relativePath = req.url; // 既に /1755953302605/project.json
            const filePath = path.join(__dirname, 'public', 'projects', relativePath);
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
          } else {
            next();
          }
        });

        server.middlewares.use('/api/projects', (req, res, next) => {
          if (req.method === 'POST' && req.url?.endsWith('/save')) {
            console.log('🔄 プロジェクト保存API呼び出し:', req.url);
            
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                const parsedBody = JSON.parse(body);
                const projectData = parsedBody.projectData;
                const projectId = req.url.split('/')[1];
                
                console.log('🔍 デバッグ情報:', {
                  projectId,
                  bodyType: typeof body,
                  parsedBodyType: typeof parsedBody,
                  projectDataType: typeof projectData,
                  projectDataKeys: projectData ? Object.keys(projectData) : 'null',
                  projectDataName: projectData?.name,
                  fullProjectData: projectData
                });
                
                // projectDataが文字列の場合は再パースを試行
                let finalProjectData = projectData;
                if (typeof projectData === 'string') {
                  try {
                    finalProjectData = JSON.parse(projectData);
                    console.log('🔄 文字列データを再パース:', typeof finalProjectData);
                  } catch (parseError) {
                    console.error('❌ projectData再パースエラー:', parseError);
                    throw new Error('無効なプロジェクトデータ形式');
                  }
                }
                
                if (!finalProjectData || typeof finalProjectData !== 'object') {
                  throw new Error('プロジェクトデータが正しく受信されませんでした');
                }
                
                // プロジェクトディレクトリを作成
                const projectDir = path.join(__dirname, 'public', 'projects', projectId);
                await fs.ensureDir(projectDir);
                
                // viewer用の簡易project.jsonを生成
                const viewerProject = {
                  name: finalProjectData.name,
                  description: finalProjectData.description,
                  type: finalProjectData.type,
                  loadingScreen: finalProjectData.loadingScreen,
                  models: (finalProjectData.modelSettings || []).map((m) => ({
                    url: `/assets/${m.fileName}`,
                    fileName: m.fileName,
                    fileSize: m.fileSize
                  }))
                };
                
                // project.jsonファイルを保存
                const projectFilePath = path.join(projectDir, 'project.json');
                await fs.writeJson(projectFilePath, viewerProject, { spaces: 2 });
                
                console.log(`✅ プロジェクトファイル保存完了: ${projectFilePath}`);
                const scheme = server.config.server.https ? 'https' : 'http';
                console.log(`🔗 アクセスURL: ${scheme}://localhost:3000/projects/${projectId}/project.json`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  success: true, 
                  projectId,
                  filePath: projectFilePath,
                  url: `/projects/${projectId}/project.json`
                }));
                
              } catch (error) {
                console.error('❌ プロジェクト保存エラー:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'プロジェクト保存に失敗しました',
                  message: error.message 
                }));
              }
            });
          } else {
            next();
          }
        });

        // ローカル公開API（Vite開発サーバー用）
        server.middlewares.use('/api/publish-project', async (req, res, next) => {
          if (req.method !== 'POST') return next();
          try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            await new Promise(resolve => req.on('end', resolve));

            const parsed = JSON.parse(body || '{}');
            const { id, type, loadingScreen, models } = parsed;
            if (!id) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'id is required' }));
              return;
            }

            const projectDir = path.join(__dirname, 'public', 'projects', id);
            await fs.ensureDir(projectDir);

            const modelEntries = [];
            if (Array.isArray(models)) {
              for (const m of models) {
                try {
                  const fileName = m.fileName || 'model.glb';
                  const base64 = String(m.dataBase64 || '').split(',').pop();
                  if (!base64) continue;
                  const buffer = Buffer.from(base64, 'base64');
                  const filePath = path.join(projectDir, fileName);
                  await fs.writeFile(filePath, buffer);
                  modelEntries.push({ url: `/projects/${id}/${fileName}`, fileName, fileSize: buffer.length });
                } catch (e) {
                  console.warn('モデル保存に失敗:', e);
                }
              }
            }

            const projectJson = { id, type: type || 'markerless', loadingScreen: loadingScreen || null, models: modelEntries };
            await fs.writeJson(path.join(projectDir, 'project.json'), projectJson, { spaces: 2 });

            const scheme = server.config.server.https ? 'https' : 'http';
            const host = server.config.server.host === true ? getServerNetworkIP() : 'localhost';
            const port = server.config.server.port || 3000;
            const viewerUrl = `${scheme}://${host}:${port}/#/viewer?src=${scheme}://${host}:${port}/projects/${id}/project.json`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, viewerUrl, projectUrl: `${scheme}://${host}:${port}/projects/${id}/project.json` }));
          } catch (error) {
            console.error('❌ publish-project (vite) エラー:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'publish failed', message: error.message }));
          }
        });
      }
    }
  ],
  build: {
    // チャンクサイズの警告制限を調整（Three.jsを含むため）
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // ファイル名にタイムスタンプを強制追加
        entryFileNames: `assets/[name]-${Date.now()}.[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}.[hash].js`,
        assetFileNames: `assets/[name]-${Date.now()}.[hash].[ext]`,
        // 手動チャンク分割の設定
        manualChunks: {
          // Three.jsを別チャンクに分離
          'three': ['three'],
          // QRCodeライブラリを別チャンクに分離
          'qrcode': ['qrcode'],
          // ベンダーライブラリを分離
          'vendor': ['uuid', 'idb-keyval']
        }
      }
    }
  },
  // ★★★ optimizeDeps の設定 ★★★
  optimizeDeps: {
    exclude: ['three'], // Three.js を事前バンドル対象から除外
    force: true // 依存関係を強制的に再ビルド
  },
  // ★★★ キャッシュ無効化 ★★★
  esbuild: {
    loader: {
      '.js': 'js'
    }
  },
  // ★★★ LocatorJS警告の抑制 ★★★
  define: {
    __LOCATOR_DEV__: false
  }
});
