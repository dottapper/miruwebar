#!/usr/bin/env node

/**
 * ビルドの整合性を検証するスクリプト
 * 
 * このスクリプトは以下の項目を検証します：
 * 1. 必要なファイルが存在するか
 * 2. ファイル名のパターンが正しいか（ハッシュが8文字以上）
 * 3. ファイルサイズが妥当か
 * 4. ビルドの決定性（同じ入力で同じ出力が得られるか）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');

// 検証結果
let hasErrors = false;
const errors = [];
const warnings = [];

console.log('🔍 ビルドの整合性を検証中...\n');

// 1. distディレクトリの存在確認
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ distディレクトリが見つかりません');
  process.exit(1);
}

// 2. 必要なファイルの存在確認
const requiredFiles = [
  'index.html',
  'assets/'
];

console.log('📁 必要なファイルの存在確認:');
for (const file of requiredFiles) {
  const filePath = path.join(DIST_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 見つかりません`);
    errors.push(`Required file missing: ${file}`);
    hasErrors = true;
  }
}

// 3. assetsディレクトリの内容確認
const assetsDir = path.join(DIST_DIR, 'assets');
if (fs.existsSync(assetsDir)) {
  console.log('\n📦 assetsディレクトリの内容:');
  const assets = fs.readdirSync(assetsDir);
  
  if (assets.length === 0) {
    console.log('  ⚠️  assetsディレクトリが空です');
    warnings.push('Assets directory is empty');
  } else {
    console.log(`  📊 ファイル数: ${assets.length}`);
    
    // ファイル名パターンの検証
    console.log('\n🔍 ファイル名パターンの検証:');
    // Viteの実際の出力パターンに合わせて修正（大文字小文字数字を含む8文字以上）
    const hashPattern = /\.[A-Za-z0-9]{8,}\./;
    
    for (const asset of assets) {
      if (hashPattern.test(asset)) {
        console.log(`  ✅ ${asset}`);
      } else {
        // 静的アセット（画像、GLBファイルなど）はハッシュが不要
        const staticAssetPattern = /\.(png|jpg|jpeg|gif|svg|ico|glb|gltf|mp4|webm|mp3|wav|psd)$/i;
        if (staticAssetPattern.test(asset)) {
          console.log(`  ✅ ${asset} (静的アセット)`);
        } else {
          console.log(`  ❌ ${asset} - 不正なハッシュパターン`);
          errors.push(`Invalid hash pattern: ${asset}`);
          hasErrors = true;
        }
      }
    }
    
    // ファイルサイズの確認
    console.log('\n📏 ファイルサイズの確認:');
    let totalSize = 0;
    
    for (const asset of assets) {
      const assetPath = path.join(assetsDir, asset);
      const stats = fs.statSync(assetPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      totalSize += stats.size;
      
      console.log(`  📄 ${asset}: ${sizeKB} KB`);
      
      // ファイルサイズの妥当性チェック
      if (stats.size === 0) {
        console.log(`    ⚠️  ${asset} のサイズが0です`);
        warnings.push(`Zero size file: ${asset}`);
      } else if (stats.size > 10 * 1024 * 1024) { // 10MB以上
        console.log(`    ⚠️  ${asset} が大きすぎます (${sizeKB} KB)`);
        warnings.push(`Large file: ${asset} (${sizeKB} KB)`);
      }
    }
    
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`\n📊 合計サイズ: ${totalSizeMB} MB`);
    
    if (totalSize > 50 * 1024 * 1024) { // 50MB以上
      console.log(`  ⚠️  ビルドサイズが大きすぎます (${totalSizeMB} MB)`);
      warnings.push(`Build size too large: ${totalSizeMB} MB`);
    }
  }
} else {
  console.log('  ❌ assetsディレクトリが見つかりません');
  errors.push('Assets directory missing');
  hasErrors = true;
}

// 4. index.htmlの内容確認
const indexHtmlPath = path.join(DIST_DIR, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  console.log('\n📄 index.htmlの内容確認:');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // 必要な要素の存在確認
  const requiredElements = [
    '<title>',
    '<script',
    '<link'
  ];
  
  for (const element of requiredElements) {
    if (indexHtml.includes(element)) {
      console.log(`  ✅ ${element} が見つかりました`);
    } else {
      console.log(`  ❌ ${element} が見つかりません`);
      errors.push(`Required element missing in index.html: ${element}`);
      hasErrors = true;
    }
  }
  
  // アセットの参照確認
  const assetReferences = indexHtml.match(/assets\/[^"']*\.(js|css|png|jpg|jpeg|gif|svg|ico)/g);
  if (assetReferences) {
    console.log(`  📦 アセット参照数: ${assetReferences.length}`);
    
    for (const ref of assetReferences) {
      const refPath = path.join(DIST_DIR, ref);
      if (fs.existsSync(refPath)) {
        console.log(`    ✅ ${ref}`);
      } else {
        console.log(`    ❌ ${ref} - 参照されているが存在しません`);
        errors.push(`Referenced asset missing: ${ref}`);
        hasErrors = true;
      }
    }
  }
}

// 5. ビルド設定の確認
console.log('\n⚙️ ビルド設定の確認:');
const viteConfigPath = path.join(__dirname, '..', 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  // Date.now()の使用確認
  if (viteConfig.includes('Date.now()')) {
    console.log('  ❌ Date.now()が使用されています（非決定的なビルド）');
    errors.push('Date.now() usage detected in vite.config.js');
    hasErrors = true;
  } else {
    console.log('  ✅ Date.now()は使用されていません');
  }
  
  // ハッシュパターンの確認
  if (viteConfig.includes('[hash:8]')) {
    console.log('  ✅ 8文字ハッシュが設定されています');
  } else {
    console.log('  ⚠️  ハッシュ長が明示されていません');
    warnings.push('Hash length not explicitly set');
  }
}

// 結果の表示
console.log('\n📋 検証結果:');

if (errors.length > 0) {
  console.log('\n❌ エラー:');
  for (const error of errors) {
    console.log(`  - ${error}`);
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️ 警告:');
  for (const warning of warnings) {
    console.log(`  - ${warning}`);
  }
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ すべての検証が成功しました！');
} else if (errors.length === 0) {
  console.log('\n✅ エラーはありませんが、警告があります');
} else {
  console.log('\n❌ 検証に失敗しました');
}

// 終了コード
process.exit(hasErrors ? 1 : 0);
