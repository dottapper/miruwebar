import { getServerNetworkIP } from '../utils/network.js';

// /api/network-info エンドポイント提供
export function networkInfoPlugin() {
  return {
    name: 'project-api-network-info',
    configureServer(server) {
      const DEBUG = process.env.DEBUG === '1' || process.env.VERBOSE === '1';
      server.middlewares.use('/api/network-info', (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (DEBUG) console.log('🌐 ネットワーク情報API呼び出し');

        // 実際にリッスンしているポートを推定
        let port = 3000;
        try {
          const hostHeader = req.headers.host || '';
          const fromHeader = hostHeader.includes(':') ? Number(hostHeader.split(':').pop()) : undefined;
          const addr = server.httpServer && server.httpServer.address ? server.httpServer.address() : undefined;
          const fromServer = (addr && typeof addr === 'object') ? addr.port : undefined;
          port = fromHeader || fromServer || server.config.server.port || 3000;
        } catch (_) {}

        const networkInfo = {
          networkIP: getServerNetworkIP(),
          port,
          timestamp: Date.now()
        };
        if (DEBUG) console.log('📡 送信するネットワーク情報:', networkInfo);

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
