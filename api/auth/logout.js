/**
 * Vercel Serverless Function: ログアウトAPI
 * POST /api/auth/logout
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

  res.setHeader('Set-Cookie', [
    'app-auth=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure'
  ]);
  return res.status(200).json({ success: true });
}
