#!/usr/bin/env node

// プロジェクトデータクリーンアップスクリプト
// 指定されたproject.jsonファイルの重複・肥大化問題を修正

import fs from 'fs';
import path from 'path';
import { normalizeProjectData, reportSizeReduction, checkDuplicateEditorSettings } from '../src/utils/project-data-normalizer.js';

const PROJECT_ID = process.env.PROJECT_ID || 'sample-keep-me';
const TARGET_FILE = path.resolve(process.cwd(), 'public', 'projects', PROJECT_ID, 'project.json');

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

// 実行
cleanupProjectFile();
