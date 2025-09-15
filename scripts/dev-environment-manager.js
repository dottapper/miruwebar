#!/usr/bin/env node
// scripts/dev-environment-manager.js
// 開発環境の安定化と管理

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * 開発環境管理クラス
 */
class DevEnvironmentManager {
  constructor() {
    this.ports = {
      dev: 3000,
      preview: 4173,
      server: 3001
    };
    this.processes = new Map();
    this.logFile = path.join(projectRoot, 'dev-server.log');
  }

  /**
   * ポートの使用状況をチェック
   * @param {number} port - チェックするポート
   * @returns {boolean} ポートが使用中かどうか
   */
  isPortInUse(port) {
    try {
      execSync(`lsof -ti:${port}`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ポートを解放
   * @param {number} port - 解放するポート
   */
  killPort(port) {
    try {
      const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
      if (pids) {
        const pidList = pids.split('\n').filter(pid => pid.trim());
        for (const pid of pidList) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
            console.log(`✅ ポート ${port} のプロセス ${pid} を終了しました`);
          } catch (killError) {
            console.warn(`⚠️ プロセス ${pid} の終了に失敗:`, killError.message);
          }
        }
      }
    } catch (error) {
      console.log(`ℹ️ ポート ${port} は使用されていません`);
    }
  }

  /**
   * すべての開発ポートを解放
   */
  killAllDevPorts() {
    console.log('🧹 開発ポートをクリーンアップ中...');
    Object.values(this.ports).forEach(port => {
      this.killPort(port);
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    console.log('🧹 キャッシュをクリア中...');
    
    const cacheDirs = [
      '.vite',
      'node_modules/.vite',
      'dist',
      'coverage',
      'test-results'
    ];

    cacheDirs.forEach(dir => {
      const fullPath = path.join(projectRoot, dir);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`✅ ${dir} を削除しました`);
        } catch (error) {
          console.warn(`⚠️ ${dir} の削除に失敗:`, error.message);
        }
      }
    });
  }

  /**
   * ブラウザキャッシュをクリアするためのヘッダーを設定
   */
  setupCacheHeaders() {
    const viteConfigPath = path.join(projectRoot, 'vite.config.js');
    let configContent = fs.readFileSync(viteConfigPath, 'utf8');
    
    // キャッシュ無効化ヘッダーが設定されているかチェック
    if (!configContent.includes('Cache-Control')) {
      console.log('⚠️ キャッシュ無効化ヘッダーが設定されていません');
    } else {
      console.log('✅ キャッシュ無効化ヘッダーが設定されています');
    }
  }

  /**
   * 開発サーバーを起動
   * @param {Object} options - 起動オプション
   */
  startDevServer(options = {}) {
    const {
      port = this.ports.dev,
      force = false,
      clearCache = false,
      logLevel = 'info'
    } = options;

    console.log('🚀 開発サーバーを起動中...');

    // ポート競合をチェック
    if (this.isPortInUse(port)) {
      if (force) {
        console.log(`⚠️ ポート ${port} が使用中です。強制終了します...`);
        this.killPort(port);
      } else {
        console.error(`❌ ポート ${port} が使用中です。別のポートを使用するか --force オプションを使用してください`);
        process.exit(1);
      }
    }

    // キャッシュクリア
    if (clearCache) {
      this.clearCache();
    }

    // 開発サーバーを起動
    const env = {
      ...process.env,
      VITE_LOG_LEVEL: logLevel.toUpperCase()
    };

    // 直接 Vite を起動して循環起動を回避
    const devProcess = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--host', '0.0.0.0', '--port', port.toString()], {
      cwd: projectRoot,
      env,
      stdio: 'pipe'
    });

    this.processes.set('dev', devProcess);

    // ログをファイルに出力
    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    
    devProcess.stdout.on('data', (data) => {
      const message = data.toString();
      console.log(message);
      logStream.write(`[${new Date().toISOString()}] ${message}`);
    });

    devProcess.stderr.on('data', (data) => {
      const message = data.toString();
      console.error(message);
      logStream.write(`[${new Date().toISOString()}] ERROR: ${message}`);
    });

    devProcess.on('close', (code) => {
      console.log(`開発サーバーが終了しました (コード: ${code})`);
      logStream.end();
    });

    // プロセス終了時のクリーンアップ
    process.on('SIGINT', () => {
      console.log('\n🛑 開発サーバーを停止中...');
      this.stopAllProcesses();
      process.exit(0);
    });

    return devProcess;
  }

  /**
   * すべてのプロセスを停止
   */
  stopAllProcesses() {
    console.log('🛑 すべてのプロセスを停止中...');
    
    this.processes.forEach((process, name) => {
      try {
        process.kill('SIGTERM');
        console.log(`✅ ${name} プロセスを停止しました`);
      } catch (error) {
        console.warn(`⚠️ ${name} プロセスの停止に失敗:`, error.message);
      }
    });

    this.processes.clear();
  }

  /**
   * 開発環境の状態をチェック
   */
  checkEnvironment() {
    console.log('🔍 開発環境の状態をチェック中...');
    
    const issues = [];

    // ポートの使用状況をチェック
    Object.entries(this.ports).forEach(([name, port]) => {
      if (this.isPortInUse(port)) {
        issues.push(`ポート ${port} (${name}) が使用中です`);
      }
    });

    // 必要なファイルの存在をチェック
    const requiredFiles = [
      'package.json',
      'vite.config.js',
      'src/main.js'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        issues.push(`必要なファイルが見つかりません: ${file}`);
      }
    });

    // 依存関係のチェック
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      issues.push('node_modules が見つかりません。npm install を実行してください');
    }

    if (issues.length === 0) {
      console.log('✅ 開発環境は正常です');
    } else {
      console.log('⚠️ 以下の問題が見つかりました:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    return issues.length === 0;
  }

  /**
   * 開発環境をリセット
   */
  resetEnvironment() {
    console.log('🔄 開発環境をリセット中...');
    
    // すべてのプロセスを停止
    this.stopAllProcesses();
    
    // すべてのポートを解放
    this.killAllDevPorts();
    
    // キャッシュをクリア
    this.clearCache();
    
    // 依存関係を再インストール
    console.log('📦 依存関係を再インストール中...');
    try {
      execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ 依存関係の再インストールが完了しました');
    } catch (error) {
      console.error('❌ 依存関係の再インストールに失敗しました:', error.message);
    }
    
    console.log('✅ 開発環境のリセットが完了しました');
  }

  /**
   * ログファイルを表示
   */
  showLogs() {
    if (fs.existsSync(this.logFile)) {
      console.log('📋 開発サーバーログ:');
      console.log('─'.repeat(50));
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      console.log(logContent);
    } else {
      console.log('📋 ログファイルが見つかりません');
    }
  }

  /**
   * ヘルプを表示
   */
  showHelp() {
    console.log(`
🔧 開発環境管理ツール

使用方法:
  node scripts/dev-environment-manager.js <command> [options]

コマンド:
  start [options]     開発サーバーを起動
  stop                すべてのプロセスを停止
  reset               開発環境をリセット
  check               環境の状態をチェック
  logs                ログを表示
  help                このヘルプを表示

オプション:
  --port <port>       ポート番号を指定 (デフォルト: 3000)
  --force             ポート競合時も強制起動
  --clear-cache       起動前にキャッシュをクリア
  --log-level <level> ログレベルを指定 (debug, info, warn, error)

例:
  node scripts/dev-environment-manager.js start --port 3000 --force
  node scripts/dev-environment-manager.js reset
  node scripts/dev-environment-manager.js check
    `);
  }
}

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++; // 次の引数をスキップ
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

// メイン実行
async function main() {
  const { command, options } = parseArgs();
  const manager = new DevEnvironmentManager();

  switch (command) {
    case 'start':
      manager.startDevServer(options);
      break;
    case 'stop':
      manager.stopAllProcesses();
      break;
    case 'reset':
      manager.resetEnvironment();
      break;
    case 'check':
      manager.checkEnvironment();
      break;
    case 'logs':
      manager.showLogs();
      break;
    case 'help':
    case '--help':
    case '-h':
      manager.showHelp();
      break;
    default:
      console.error(`❌ 不明なコマンド: ${command}`);
      manager.showHelp();
      process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  });
}

export default DevEnvironmentManager;
