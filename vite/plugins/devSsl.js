import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

function getAllLanIPs() {
  const ips = new Set(['127.0.0.1']);
  for (const configs of Object.values(os.networkInterfaces())) {
    for (const config of configs) {
      if (config.family === 'IPv4' && !config.internal) {
        ips.add(config.address);
      }
    }
  }
  return [...ips];
}

function certNeedsRegen(certPath, metaPath, currentIPs) {
  if (!fs.existsSync(certPath) || !fs.existsSync(metaPath)) {
    return true;
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return meta.ips !== [...currentIPs].sort().join(',');
  } catch {
    return true;
  }
}

function generateCert(certDir, ips) {
  fs.mkdirSync(certDir, { recursive: true });

  const keyPath = path.join(certDir, 'dev-key.pem');
  const certPath = path.join(certDir, 'dev-cert.pem');
  const metaPath = path.join(certDir, 'meta.json');
  const cnfPath = path.join(certDir, 'openssl.cnf');

  const altLines = ['DNS.1 = localhost'];
  ips.forEach((ip, index) => {
    altLines.push(`IP.${index + 1} = ${ip}`);
  });

  const cnf = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = miruwebar-dev

[v3_req]
subjectAltName = @alt_names

[alt_names]
${altLines.join('\n')}
`;

  fs.writeFileSync(cnfPath, cnf);

  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -config "${cnfPath}" -extensions v3_req`,
    { stdio: 'pipe' }
  );

  fs.writeFileSync(metaPath, JSON.stringify({
    ips: [...ips].sort().join(','),
    generatedAt: new Date().toISOString()
  }));

  return { keyPath, certPath };
}

function readHttpsOptions(certDir) {
  const keyPath = path.join(certDir, 'dev-key.pem');
  const certPath = path.join(certDir, 'dev-cert.pem');

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

/**
 * LAN IP を SAN に含む開発用 HTTPS 証明書を生成する。
 * @vitejs/plugin-basic-ssl は localhost のみのため、スマホから IP アクセスすると証明書エラーになる。
 */
export function devSslPlugin() {
  const certDir = path.join(process.cwd(), '.vite', 'dev-ssl');

  return {
    name: 'miruwebar-dev-ssl',
    config() {
      const ips = getAllLanIPs();
      const certPath = path.join(certDir, 'dev-cert.pem');
      const metaPath = path.join(certDir, 'meta.json');

      if (certNeedsRegen(certPath, metaPath, ips)) {
        console.log('\n[dev-ssl] LAN 向け HTTPS 証明書を生成中...');
        console.log('[dev-ssl] 対象 IP:', ips.join(', '));
        generateCert(certDir, ips);
      }

      const https = readHttpsOptions(certDir);

      return {
        server: { https },
        preview: { https }
      };
    },
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const ips = getAllLanIPs().filter((ip) => ip !== '127.0.0.1');
        const port = server.config.server.port || 3000;

        console.log('\n📱 スマホでテストする手順:');
        console.log('   1. PC とスマホを同じ Wi-Fi に接続');
        console.log('   2. スマホのブラウザで次の URL を開く');
        ips.forEach((ip) => {
          console.log(`      → https://${ip}:${port}/`);
        });
        console.log('   3. 「安全ではない」警告 → 詳細 → 続行（証明書を信頼）');
        console.log('   4. ログイン画面または AR ビューアが表示されれば OK\n');
      });
    }
  };
}

export default devSslPlugin;
