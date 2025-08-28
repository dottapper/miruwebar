import { getServerNetworkIP } from '../utils/network.js';

// /api/network-info エンドポイント提供
export function networkInfoPlugin() {
  return {
    name: 'project-api-network-info',
    configureServer(server) {
      server.middlewares.use('/api/network-info', (req, res, next) => {
        if (req.method !== 'GET') return next();

        console.log('🌐 ネットワーク情報API呼び出し');
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
      });
    }
  };
}

