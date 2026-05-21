// src/utils/unified-logger.js
// logger.js への互換性レイヤー
// 注: このファイルは logger.js に統合されました。
// 既存のインポートとの互換性のために維持しています。

export { 
  logger, 
  createLogger,
  Logger,
  LOG_LEVELS, 
  LOG_CATEGORIES,
  LOG_PREFIXES
} from './logger.js';

export default logger;

// logger.js から logger インスタンスを再インポート
import { logger } from './logger.js';
