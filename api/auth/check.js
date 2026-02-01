/**
 * Vercel Serverless Function: 認証状態チェックAPI
 * GET /api/auth/check
 *
 * AUTH_SECRET を Vercel 環境変数に設定してください。
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    return res.status(200).json({ authenticated: true, authRequired: false });
  }

  const cookies = req.headers.cookie || '';
  const appAuthMatch = cookies.match(/app-auth=([^;]+)/);
  const authToken = appAuthMatch ? decodeURIComponent(appAuthMatch[1].trim()) : null;

  const authenticated = authToken === authSecret;
  return res.status(200).json({ authenticated, authRequired: true });
}
