// src/scripts/cleanup-project-duplicates.js
// 既存のプロジェクトファイルから重複editorSettingsを除去するクリーンアップスクリプト

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeProjectData, reportSizeReduction, checkDuplicateEditorSettings } from '../utils/project-data-normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 指定ディレクトリ内のproject.jsonファイルを再帰的に検索
 * @param {string} dir - 検索開始ディレクトリ
 * @returns {Array<string>} - 見つかったproject.jsonファイルのパス配列
 */
async function findProjectFiles(dir) {
  const projectFiles = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 再帰的にサブディレクトリを検索
        const subFiles = await findProjectFiles(fullPath);
        projectFiles.push(...subFiles);
      } else if (entry.name === 'project.json') {
        projectFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`ディレクトリ読み込みエラー: ${dir}`, error.message);
  }
  
  return projectFiles;
}

/**
 * プロジェクトファイルをクリーンアップ
 * @param {string} filePath - クリーンアップするproject.jsonファイルのパス
 * @returns {boolean} - 変更があったかどうか
 */
async function cleanupProjectFile(filePath) {
  try {
    // 元ファイルを読み込み
    const originalContent = await fs.readFile(filePath, 'utf-8');
    const originalData = JSON.parse(originalContent);
    
    // 重複チェック
    const duplicates = checkDuplicateEditorSettings(originalData);
    if (duplicates.length === 0) {
      console.log(`✅ ${path.basename(filePath)}: 重複なし`);
      return false;
    }
    
    console.log(`🔍 ${path.basename(filePath)}: 重複発見 (${duplicates.length}件)`);
    duplicates.forEach(dup => {
      console.log(`  - ${dup.path}: ${dup.message}`);
    });
    
    // 正規化実行
    const normalizedData = normalizeProjectData(originalData);
    
    // サイズ削減レポート
    reportSizeReduction(originalData, normalizedData);
    
    // バックアップ作成
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, originalContent, 'utf-8');
    console.log(`📦 バックアップ作成: ${path.basename(backupPath)}`);
    
    // 正規化されたデータを保存
    const normalizedContent = JSON.stringify(normalizedData, null, 2);
    await fs.writeFile(filePath, normalizedContent, 'utf-8');
    
    console.log(`✅ ${path.basename(filePath)}: クリーンアップ完了`);
    return true;
    
  } catch (error) {
    console.error(`❌ ${path.basename(filePath)}: クリーンアップ失敗`, error.message);
    return false;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 プロジェクトファイル重複クリーンアップを開始します...');
  
  const publicProjectsDir = path.join(__dirname, '../../../public/projects');
  const distProjectsDir = path.join(__dirname, '../../../dist/projects');
  
  let totalProcessed = 0;
  let totalCleaned = 0;
  
  // public/projectsディレクトリをクリーンアップ
  try {
    console.log(`\n📂 public/projects/ の検索中...`);
    const publicFiles = await findProjectFiles(publicProjectsDir);
    console.log(`見つかったファイル: ${publicFiles.length}件`);
    
    for (const filePath of publicFiles) {
      const wasChanged = await cleanupProjectFile(filePath);
      totalProcessed++;
      if (wasChanged) totalCleaned++;
    }
  } catch (error) {
    console.warn('public/projects/ の処理をスキップ:', error.message);
  }
  
  // dist/projectsディレクトリをクリーンアップ
  try {
    console.log(`\n📂 dist/projects/ の検索中...`);
    const distFiles = await findProjectFiles(distProjectsDir);
    console.log(`見つかったファイル: ${distFiles.length}件`);
    
    for (const filePath of distFiles) {
      const wasChanged = await cleanupProjectFile(filePath);
      totalProcessed++;
      if (wasChanged) totalCleaned++;
    }
  } catch (error) {
    console.warn('dist/projects/ の処理をスキップ:', error.message);
  }
  
  console.log('\n🎉 クリーンアップ完了！');
  console.log(`📊 処理結果: ${totalProcessed}件中 ${totalCleaned}件をクリーンアップ`);
  
  if (totalCleaned > 0) {
    console.log('\n💡 元のファイルは .backup ファイルとして保存されています');
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}