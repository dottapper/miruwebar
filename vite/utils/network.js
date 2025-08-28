import os from 'os';

// サーバーのネットワークIPアドレスを動的に取得
export function getServerNetworkIP() {
  const networkInterfaces = os.networkInterfaces();

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

  // WiFi/Ethernet系インターフェースから検索
  for (const [interfaceName, configs] of Object.entries(networkInterfaces)) {
    const lower = interfaceName.toLowerCase();
    if (lower.includes('wifi') || lower.includes('wlan') || lower.includes('eth') || lower.includes('en')) {
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

