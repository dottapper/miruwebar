// server/utils/module-loader.js
// ESM形式での動的インポートを適切に処理するためのヘルパー関数

import { createLogger } from './logger.js';

const moduleLoaderLogger = createLogger('ModuleLoader');

/**
 * 動的にモジュールをインポートする
 * @param {string} modulePath - モジュールのパス
 * @param {string} exportName - エクスポート名（デフォルトエクスポートの場合は 'default'）
 * @returns {Promise<any>} - インポートされたモジュール
 */
export async function dynamicImport(modulePath, exportName = 'default') {
  try {
    moduleLoaderLogger.debug(`モジュールを動的インポート中: ${modulePath}`);
    
    const module = await import(modulePath);
    
    if (exportName === 'default') {
      return module.default;
    }
    
    if (module[exportName]) {
      return module[exportName];
    }
    
    throw new Error(`エクスポート '${exportName}' が見つかりません: ${modulePath}`);
  } catch (error) {
    moduleLoaderLogger.error(`モジュールインポートエラー: ${modulePath}`, error);
    throw error;
  }
}

/**
 * コントローラーを動的にインポートする
 * @param {string} controllerName - コントローラー名
 * @returns {Promise<Object>} - コントローラーオブジェクト
 */
export async function loadController(controllerName) {
  const controllerPath = `../controllers/${controllerName}.js`;
  return await dynamicImport(controllerPath);
}

/**
 * ミドルウェアを動的にインポートする
 * @param {string} middlewareName - ミドルウェア名
 * @returns {Promise<Function>} - ミドルウェア関数
 */
export async function loadMiddleware(middlewareName) {
  const middlewarePath = `../middleware/${middlewareName}.js`;
  return await dynamicImport(middlewarePath);
}

/**
 * モデルを動的にインポートする
 * @param {string} modelName - モデル名
 * @returns {Promise<Function>} - モデル関数
 */
export async function loadModel(modelName) {
  const modelPath = `../models/${modelName}.js`;
  return await dynamicImport(modelPath);
}

/**
 * ルートを動的にインポートする
 * @param {string} routeName - ルート名
 * @returns {Promise<Object>} - ルーターオブジェクト
 */
export async function loadRoute(routeName) {
  const routePath = `../routes/${routeName}.js`;
  return await dynamicImport(routePath);
}

/**
 * 複数のモジュールを並行してインポートする
 * @param {Array<{path: string, name: string}>} modules - インポートするモジュールの配列
 * @returns {Promise<Object>} - インポートされたモジュールのオブジェクト
 */
export async function loadMultipleModules(modules) {
  try {
    moduleLoaderLogger.debug(`複数モジュールを並行インポート中: ${modules.length}個`);
    
    const importPromises = modules.map(async ({ path, name }) => {
      const module = await dynamicImport(path);
      return { name, module };
    });
    
    const results = await Promise.all(importPromises);
    
    const modulesObject = {};
    results.forEach(({ name, module }) => {
      modulesObject[name] = module;
    });
    
    moduleLoaderLogger.success(`複数モジュールのインポート完了: ${Object.keys(modulesObject).join(', ')}`);
    return modulesObject;
  } catch (error) {
    moduleLoaderLogger.error('複数モジュールのインポートエラー', error);
    throw error;
  }
}

/**
 * 条件付きでモジュールをインポートする
 * @param {string} modulePath - モジュールのパス
 * @param {boolean} condition - インポートするかどうかの条件
 * @param {any} fallback - 条件がfalseの場合のフォールバック値
 * @returns {Promise<any>} - インポートされたモジュールまたはフォールバック値
 */
export async function conditionalImport(modulePath, condition, fallback = null) {
  if (!condition) {
    moduleLoaderLogger.debug(`条件付きインポートをスキップ: ${modulePath}`);
    return fallback;
  }
  
  try {
    return await dynamicImport(modulePath);
  } catch (error) {
    moduleLoaderLogger.warn(`条件付きインポートでエラー、フォールバックを使用: ${modulePath}`, error);
    return fallback;
  }
}
