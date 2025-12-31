/**
 * Vercel Serverless Function: ネットワーク情報API
 * GET /api/network-info
 * 
 * Vercel環境では、実際のサーバーIPアドレスは取得できません。
 * リクエストヘッダーからホスト情報を返します。
 */

export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GETのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercel環境では、リクエストヘッダーからホスト情報を取得
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const scheme = req.headers['x-forwarded-proto'] || 'https';
    
    // ポート情報（Vercelでは通常ポート番号は含まれない）
    const port = host.includes(':') ? Number(host.split(':').pop()) : (scheme === 'https' ? 443 : 80);

    const networkInfo = {
      networkIP: host.split(':')[0], // ホスト名またはIP
      host, // 完全なホスト情報
      scheme, // プロトコル（http/https）
      port,
      timestamp: Date.now(),
      message: '⚠️ Vercel環境: 実際のサーバーIPは取得できません。ホスト情報を返します。'
    };

    return res.status(200).json(networkInfo);
  } catch (error) {
    console.error('❌ /api/network-info 失敗:', error);
    return res.status(500).json({
      error: 'network info failed',
      message: error.message
    });
  }
}

