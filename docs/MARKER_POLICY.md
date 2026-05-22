# マーカーAR技術ポリシー

## ⚠️ 重要: HIROマーカーの使用禁止

**このプロジェクトでは、HIROマーカー（patt.hiro）の使用を禁止しています。**

ユーザーがアップロードしたカスタム画像のみをマーカーとして使用してください。

本ドキュメントは技術ポリシーです。プロダクト全体の方針は
[product-spec.md](product-spec.md) を参照してください。

---

## 技術的背景

### AR.jsのマーカー検出技術

AR.jsには2種類のマーカー検出技術があります：

1. **パターンマーカー（Pattern Marker）** ← **現在使用中**
   - 画像を `.patt` 形式に変換して使用
   - HIROマーカーもカスタムマーカーも同じ技術
   - 高速だが、画像の特徴量が少ないと誤検出しやすい
   - 現在の実装では画像中央を正方形に切り出して小さなパターンに変換する
   - 長方形の本の表紙やポスター全体をそのまま追跡する方式ではない

2. **NFTマーカー（Natural Feature Tracking）**
   - 任意の画像をそのまま使用可能
   - 本の表紙、ポスター、商品パッケージのような長方形画像に向く
   - より自然な画像に対応
   - AR.js 3.0以降で追加
   - 処理負荷が高い
   - 事前にターゲットファイルを生成して公開アセットとして保存する必要がある

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

### 現在のパターン変換の制約

`src/utils/marker-utils.js` は、アップロード画像の短辺に合わせて中央を正方形にクロップし、
既定では 16x16 のパターンへ変換します。

そのため、以下の素材は見た目どおりには追跡されません。

- 長方形の本の表紙
- ポスター全体
- 商品パッケージ正面全体
- 文字だけで構成された細かいデザイン
- 中央以外に重要な特徴がある画像

本やポスターを使う場合、短期的にはデザイン内に正方形の追跡エリアを作り、
その部分をマーカーとして登録してください。

例:

```txt
本の表紙全体: クライアント向けの見た目
表紙内の正方形エンブレム: AR追跡用マーカー
```

この正方形エリアは無意味な記号である必要はありません。ロゴ、紋章、ラベル、カード、
装飾フレームなど、クライアントの世界観に合うデザインで構いません。

### 良いパターンマーカーの条件

- 高コントラスト
- 左右対称すぎない
- 余白だけの面が少ない
- 繰り返し模様だけではない
- 小さな文字だけに依存しない
- 印刷時に反射しにくい
- カメラで 20-50cm 程度から十分に見えるサイズ

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
- 本の表紙、ポスター、商品パッケージなどの長方形画像を扱いやすい

**デメリット:**
- 処理負荷が高い（特にモバイル）
- 事前処理（NFT Marker Creator）が必要
- AR.js 3.0以降が必要

### markerType の将来仕様

プロジェクト仕様として、将来的に以下の分岐を持つ:

```json
{
  "marker": {
    "type": "pattern",
    "sourceImage": "assets/marker.png",
    "patternUrl": "assets/marker.patt"
  }
}
```

```json
{
  "marker": {
    "type": "imageTarget",
    "sourceImage": "assets/book-cover.jpg",
    "targetFiles": {
      "iset": "assets/book-cover.iset",
      "fset": "assets/book-cover.fset",
      "fset3": "assets/book-cover.fset3"
    }
  }
}
```

短期実装は `pattern` を安定させる。`imageTarget` は本の表紙やポスターを正式対応するための
検証フェーズで採用可否を決める。

### WebXR平面検出

「マーカーなし」モードでは WebXR の平面検出機能を使用：

- ARCore（Android）/ ARKit（iOS）ベース
- 床や壁などの平面を自動検出
- マーカー画像は不要
- 対応デバイス/ブラウザが限定的

