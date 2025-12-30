# マーカーAR技術ポリシー

## ⚠️ 重要: HIROマーカーの使用禁止

**このプロジェクトでは、HIROマーカー（patt.hiro）の使用を禁止しています。**

ユーザーがアップロードしたカスタム画像のみをマーカーとして使用してください。

---

## 技術的背景

### AR.jsのマーカー検出技術

AR.jsには2種類のマーカー検出技術があります：

1. **パターンマーカー（Pattern Marker）** ← **現在使用中**
   - 画像を `.patt` 形式に変換して使用
   - HIROマーカーもカスタムマーカーも同じ技術
   - 高速だが、画像の特徴量が少ないと誤検出しやすい

2. **NFTマーカー（Natural Feature Tracking）**
   - 任意の画像をそのまま使用可能
   - より自然な画像に対応
   - AR.js 3.0以降で追加
   - 処理負荷が高い

### HIROマーカーとは

- AR.jsに最初からバンドルされているサンプルマーカー
- 特定の白黒パターン画像
- テスト/デモ用途で広く使われている
- **本番環境では使用すべきではない**

### カスタムマーカーの処理フロー

```
ユーザーがアップロードした画像
    ↓
marker-utils.js: generateMarkerPatternFromImage()
    ↓
.patt形式のパターン文字列に変換
    ↓
Blobとして保存
    ↓
MarkerAR: ArMarkerControls に渡す
    ↓
AR.jsがパターン検出を実行
```

---

## 禁止事項

### ❌ やってはいけないこと

1. **patt.hiro へのフォールバック**
   ```javascript
   // ❌ 禁止: HIROマーカーをフォールバックに使う
   const markerCandidates = [
     customMarkerUrl,
     '/arjs/patt.hiro',  // ← これは禁止
   ];
   ```

2. **HIROマーカーURLの参照**
   ```javascript
   // ❌ 禁止: HIROマーカーのURLを使用
   'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/patt.hiro'
   'https://cdn.jsdelivr.net/npm/ar.js@2.2.2/data/patt.hiro'
   ```

3. **カスタムマーカーなしでのAR起動**
   ```javascript
   // ❌ 禁止: マーカーがない場合にデフォルトを使う
   const markerUrl = customMarkerUrl || '/arjs/patt.hiro';
   ```

### ✅ 正しい実装

1. **カスタムマーカー必須**
   ```javascript
   // ✅ 正しい: カスタムマーカーがなければエラー
   if (!customMarkerUrl) {
     throw new Error('カスタムマーカー画像が設定されていません');
   }
   ```

2. **フォールバックは同じプロジェクト内の画像のみ**
   ```javascript
   // ✅ 正しい: フォールバックはプロジェクト内の画像
   const markerCandidates = [
     project.markerImageUrl,
     '/assets/sample.png',  // プロジェクトのサンプル画像
   ];
   ```

---

## 関連ファイル

### 主要ファイル

- `src/components/ar/marker-ar.js` - マーカーAR実装
- `src/utils/marker-utils.js` - マーカー画像→.patt変換
- `src/views/ar-viewer.js` - ARビューア統合

### 設定箇所

1. **marker-ar.js: マーカーURL候補リスト**
   - カスタムマーカーを最優先
   - フォールバックにHIROを使わない

2. **ar-viewer.js: markerUrlOption の処理**
   - null の場合はエラー表示
   - HIROにフォールバックしない

---

## 変更履歴

- **2025-12-30**: HIROマーカー使用禁止ポリシー策定
  - 理由: ユーザーがアップロードした画像のみを使用する要件
  - 影響: marker-ar.js, ar-viewer.js のフォールバックロジック変更

---

## 将来の検討事項

### NFTマーカーへの移行

現在の「パターンマーカー」から「NFTマーカー」への移行を検討する場合：

**メリット:**
- より自然な画像を使用可能
- 誤検出が少ない
- ユーザー体験の向上

**デメリット:**
- 処理負荷が高い（特にモバイル）
- 事前処理（NFT Marker Creator）が必要
- AR.js 3.0以降が必要

### WebXR平面検出

「マーカーなし」モードでは WebXR の平面検出機能を使用：

- ARCore（Android）/ ARKit（iOS）ベース
- 床や壁などの平面を自動検出
- マーカー画像は不要
- 対応デバイス/ブラウザが限定的

