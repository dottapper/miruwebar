/**
 * Vercel Serverless Function: ログインAPI
 * POST /api/auth/login
 *
 * AUTH_PASSWORD と AUTH_SECRET を Vercel 環境変数に設定してください。
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = {};
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } else {
      const raw = await readRequestBody(req);
      body = JSON.parse(raw || '{}');
    }
    const { password } = body;

    const authPassword = process.env.AUTH_PASSWORD;
    const authSecret = process.env.AUTH_SECRET;

    if (!authPassword || !authSecret) {
      return res.status(500).json({ error: '認証設定が不完全です' });
    }

    if (password === authPassword) {
      const maxAge = 7 * 24 * 60 * 60; // 7日間
      res.setHeader('Set-Cookie', [
        `app-auth=${authSecret}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/; Secure`
      ]);
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ error: 'パスワードが間違っています' });
  } catch (error) {
    console.error('❌ /api/auth/login 失敗:', error);
    return res.status(400).json({ error: 'リクエストの解析に失敗しました' });
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
