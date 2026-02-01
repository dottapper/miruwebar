// vite/plugins/authMiddleware.js
// 開発サーバー用のシンプルなパスワード認証ミドルウェア

/**
 * 認証ミドルウェアプラグイン
 * - app-auth CookieでセッションをチェックDeveloperError
 * - 認証されていない場合は /auth-login へリダイレクト
 * - 特定のパスは認証をスキップ
 */
export function authMiddlewarePlugin() {
  return {
    name: 'vite-plugin-auth-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const pathname = url.split('?')[0];

        // 認証をスキップするパス
        const skipPaths = [
          '/api/auth/',        // 認証API
          '/@vite',            // Vite内部
          '/@fs',              // ファイルシステム
          '/__vite',           // Vite HMR
          '/node_modules',     // node_modules
          '/src',              // ソースファイル（開発時）
          '/assets',           // 静的アセット
          '/public',           // publicディレクトリ
          '/favicon',          // ファビコン
          '.js',               // JSファイル
          '.css',              // CSSファイル
          '.svg',              // SVGファイル
          '.png',              // 画像
          '.jpg',              // 画像
          '.gif',              // 画像
          '.glb',              // 3Dモデル
          '.gltf',             // 3Dモデル
          '.woff',             // フォント
          '.woff2',            // フォント
          '.json',             // JSON
          '.map',              // ソースマップ
        ];

        // ハッシュベースのルーティングをチェック
        // auth-loginページへのアクセスは許可
        if (url.includes('#/auth-login')) {
          return next();
        }

        // スキップパスに該当する場合は認証をスキップ
        const shouldSkip = skipPaths.some(path => 
          pathname.startsWith(path) || pathname.includes(path)
        );

        if (shouldSkip) {
          return next();
        }

        // ルートパス（index.html）は認証チェック対象
        // ただし、フロントエンドルーティング（ハッシュ）はここでは判定できないため、
        // フロントエンド側でも認証チェックを行う

        // Cookieからapp-authを取得
        const cookies = parseCookies(req.headers.cookie || '');
        const authToken = cookies['app-auth'];
        const authSecret = process.env.AUTH_SECRET;

        // AUTH_SECRETが設定されていない場合は認証をスキップ（開発便宜）
        if (!authSecret) {
          console.log('⚠️ [Auth] AUTH_SECRET が設定されていません。認証をスキップします。');
          return next();
        }

        // 認証チェック
        if (authToken === authSecret) {
          return next();
        }

        // 認証されていない場合
        // API リクエストの場合は 401 を返す
        if (pathname.startsWith('/api/')) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // HTMLリクエストの場合はindex.htmlを返す（フロントエンドで認証チェック）
        // Viteの開発サーバーでは、ハッシュルーティングを使用しているため、
        // サーバーサイドでのリダイレクトではなく、フロントエンドでの認証チェックを行う
        return next();
      });

      // 認証API: POST /api/auth/login
      server.middlewares.use('/api/auth/login', (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { password } = JSON.parse(body || '{}');
            const authPassword = process.env.AUTH_PASSWORD;
            const authSecret = process.env.AUTH_SECRET;

            if (!authPassword || !authSecret) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: '認証設定が不完全です' }));
              return;
            }

            if (password === authPassword) {
              // 認証成功
              const maxAge = 7 * 24 * 60 * 60; // 7日間
              res.setHeader('Set-Cookie', [
                `app-auth=${authSecret}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/`
              ]);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } else {
              // 認証失敗
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'パスワードが間違っています' }));
            }
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'リクエストの解析に失敗しました' }));
          }
        });
      });

      // 認証API: POST /api/auth/logout
      server.middlewares.use('/api/auth/logout', (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        // Cookieを削除
        res.setHeader('Set-Cookie', [
          'app-auth=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/'
        ]);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      });

      // 認証状態チェックAPI: GET /api/auth/check
      server.middlewares.use('/api/auth/check', (req, res, next) => {
        if (req.method !== 'GET') {
          return next();
        }

        const cookies = parseCookies(req.headers.cookie || '');
        const authToken = cookies['app-auth'];
        const authSecret = process.env.AUTH_SECRET;

        // AUTH_SECRETが設定されていない場合は認証不要
        if (!authSecret) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ authenticated: true, authRequired: false }));
          return;
        }

        const authenticated = authToken === authSecret;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ authenticated, authRequired: true }));
      });
    }
  };
}

/**
 * Cookie文字列をパースしてオブジェクトに変換
 * @param {string} cookieString - Cookie文字列
 * @returns {Object} パースされたCookieオブジェクト
 */
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;

  cookieString.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value.trim());
    }
  });

  return cookies;
}

export default authMiddlewarePlugin;
