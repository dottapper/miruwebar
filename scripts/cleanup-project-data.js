#!/usr/bin/env node

// プロジェクトデータクリーンアップスクリプト
// 指定されたproject.jsonファイルの重複・肥大化問題を修正

import fs from 'fs';
import path from 'path';
import { normalizeProjectData, reportSizeReduction, checkDuplicateEditorSettings } from '../src/utils/project-data-normalizer.js';

const TARGET_FILE = '/Users/harasawamakiko/miruwebar/public/projects/1756795802459/project.json';

async function cleanupProjectFile() {
  console.log('🔍 プロジェクトデータクリーンアップ開始');
  console.log('対象ファイル:', TARGET_FILE);

  try {
    // ファイル存在確認
    if (!fs.existsSync(TARGET_FILE)) {
      console.error('❌ ファイルが見つかりません:', TARGET_FILE);
      process.exit(1);
    }

    // ファイルサイズ確認
    const stats = fs.statSync(TARGET_FILE);
    console.log(`📊 現在のファイルサイズ: ${stats.size} bytes (${(stats.size/1024).toFixed(1)} KB)`);

    // 現在のデータを読み込み
    console.log('📖 データを読み込み中...');
    const rawData = fs.readFileSync(TARGET_FILE, 'utf8');
    const projectData = JSON.parse(rawData);

    // 重複チェック
    console.log('\n🔍 重複editorSettings検出中...');
    const duplicates = checkDuplicateEditorSettings(projectData);
    
    if (duplicates.length > 0) {
      console.log(`⚠️  検出された重複: ${duplicates.length}件`);
      duplicates.forEach(dup => {
        console.log(`   - ${dup.path}: ${dup.message}`);
      });
    } else {
      console.log('✅ 重複editorSettingsは検出されませんでした');
    }

    // バックアップ作成
    const backupFile = TARGET_FILE + '.backup.' + Date.now();
    fs.writeFileSync(backupFile, rawData, 'utf8');
    console.log(`💾 バックアップ作成: ${path.basename(backupFile)}`);

    // 正規化実行
    console.log('\n🔄 データ正規化を実行中...');
    const normalizedData = normalizeProjectData(projectData);

    // サイズ比較
    reportSizeReduction(projectData, normalizedData);

    // 正規化後の重複チェック
    const remainingDuplicates = checkDuplicateEditorSettings(normalizedData);
    if (remainingDuplicates.length === 0) {
      console.log('✅ 正規化後: 重複editorSettingsは存在しません');
    } else {
      console.warn('⚠️ 正規化後も重複が残存:', remainingDuplicates.length);
    }

    // 正規化されたデータを保存
    const normalizedJson = JSON.stringify(normalizedData, null, 2);
    fs.writeFileSync(TARGET_FILE, normalizedJson, 'utf8');

    // 結果レポート
    const newStats = fs.statSync(TARGET_FILE);
    const sizeReduction = stats.size - newStats.size;
    const reductionPercent = ((sizeReduction / stats.size) * 100).toFixed(1);

    console.log('\n📈 クリーンアップ完了');
    console.log(`📊 ファイルサイズ: ${stats.size}B → ${newStats.size}B (-${sizeReduction}B, -${reductionPercent}%)`);
    console.log(`💾 バックアップ: ${backupFile}`);
    
    if (sizeReduction > 0) {
      console.log('🎉 データサイズの削減に成功しました！');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// 追加: 既存の正規化ユーティリティを改良
function enhancedNormalizeProjectData(projectData) {
  // 既存の正規化処理を実行
  let normalized = normalizeProjectData(projectData);
  
  // 追加の最適化処理
  
  // 1. templateSettings が重複している場合の処理
  if (normalized.loadingScreen?.templateSettings) {
    console.log('🔄 templateSettings 重複チェック中...');
    
    // loadingScreen直下とeditorSettings内で重複する可能性のあるフィールドをクリーンアップ
    const templateSettings = normalized.loadingScreen.templateSettings;
    const editorSettings = normalized.loadingScreen.editorSettings;
    
    if (editorSettings && templateSettings) {
      // 重複するフィールドを検出・削除
      const duplicateFields = [];
      for (const key in templateSettings) {
        if (editorSettings[key] && JSON.stringify(templateSettings[key]) === JSON.stringify(editorSettings[key])) {
          duplicateFields.push(key);
        }
      }
      
      if (duplicateFields.length > 0) {
        console.log(`🧹 重複フィールド削除: ${duplicateFields.join(', ')}`);
        duplicateFields.forEach(field => delete templateSettings[field]);
      }
    }
  }
  
  // 2. 空のオブジェクト・不要なフィールドを削除
  normalized = removeEmptyObjects(normalized);
  
  return normalized;
}

function removeEmptyObjects(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(removeEmptyObjects).filter(item => item !== null && item !== undefined);
  }
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanedValue = removeEmptyObjects(value);
    
    // 空のオブジェクトや配列は除外
    if (cleanedValue !== null && cleanedValue !== undefined) {
      if (typeof cleanedValue === 'object') {
        if (Array.isArray(cleanedValue)) {
          if (cleanedValue.length > 0) cleaned[key] = cleanedValue;
        } else {
          if (Object.keys(cleanedValue).length > 0) cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = cleanedValue;
      }
    }
  }
  
  return cleaned;
}

// 実行
cleanupProjectFile();