// src/scripts/cleanup-single-file.js
// 単一のproject.jsonファイルをクリーンアップ

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeProjectData, reportSizeReduction, checkDuplicateEditorSettings } from '../utils/project-data-normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanupSingleFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    console.log(`🔍 クリーンアップ対象: ${absolutePath}`);
    
    // 元ファイルを読み込み
    const originalContent = await fs.readFile(absolutePath, 'utf-8');
    const originalData = JSON.parse(originalContent);
    
    console.log(`📄 元ファイルサイズ: ${originalContent.length} 文字`);
    
    // 重複チェック
    const duplicates = checkDuplicateEditorSettings(originalData);
    console.log(`🔍 重複チェック結果: ${duplicates.length}件の重複`);
    
    duplicates.forEach(dup => {
      console.log(`  - ${dup.path}: ${dup.message}`);
    });
    
    if (duplicates.length === 0) {
      console.log(`✅ 重複が見つからないため処理をスキップ`);
      return;
    }
    
    // 正規化実行
    const normalizedData = normalizeProjectData(originalData);
    
    // サイズ削減レポート
    reportSizeReduction(originalData, normalizedData);
    
    // バックアップ作成
    const backupPath = `${absolutePath}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, originalContent, 'utf-8');
    console.log(`📦 バックアップ作成: ${backupPath}`);
    
    // 正規化されたデータを保存
    const normalizedContent = JSON.stringify(normalizedData, null, 2);
    await fs.writeFile(absolutePath, normalizedContent, 'utf-8');
    
    console.log(`✅ クリーンアップ完了`);
    console.log(`📄 新ファイルサイズ: ${normalizedContent.length} 文字`);
    
  } catch (error) {
    console.error(`❌ クリーンアップ失敗:`, error.message);
  }
}

// コマンドライン引数から対象ファイルを取得
const targetFile = process.argv[2];

if (!targetFile) {
  console.error('使用方法: node cleanup-single-file.js <対象ファイルパス>');
  console.log('例: node cleanup-single-file.js public/projects/1756629464782/project.json');
  process.exit(1);
}

cleanupSingleFile(targetFile).catch(console.error);