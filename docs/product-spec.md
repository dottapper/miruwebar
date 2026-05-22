# miru-WebAR プロダクト仕様

**最終更新**: 2026-05-22  
**ステータス**: 大幅リニューアル時の基準仕様

---

## 1. プロダクト方針

miru-WebAR は、現時点では「誰でもWeb上でARを作れるSaaS」ではなく、**制作者/運用者が使うAR制作・管理アプリ** として開発する。

プロダクトは以下の2面に分ける。

### Miru Studio

制作者/運用者が使う管理画面。

- プロジェクトを作成する
- 3Dモデル、マーカー、画像、音声、演出設定を管理する
- ローカルでプレビューする
- 公開リリースを作成する
- QRコード/公開URLを発行する

### Miru Viewer

クライアント、来場者、一般ユーザーがQRから開く閲覧専用ビューア。

- 公開済み `project.json` を読む
- 公開済み assets を読む
- AR体験を表示する
- 編集、アップロード、設定変更はできない

この分離により、制作者が品質を管理し、閲覧者には安定したAR体験だけを提供する。

---

## 2. やらないこと

現在のリニューアルでは以下を対象外にする。

- 第三者が自由にARを作れる公開SaaS
- 複数ユーザー/複数組織のワークスペース管理
- クライアント自身によるアセットアップロード
- 課金、容量制限、利用規約違反対応、通報/モデレーション
- UGCギャラリー
- 本格的な3D DCCツール化
- GLBを置くだけの汎用ビューアとしての競争

これらは将来検討してよいが、現段階の設計判断には入れない。

---

## 3. 目標体験

目標は「QRを開いた人ががっかりしないAR」を提供すること。

理想の流れ:

1. QRを開く
2. ブランドに合った開始画面がすぐ出る
3. カメラ許可とガイドがわかりやすい
4. マーカー検出または平面検出後、数秒以内に強い演出が出る
5. マーカー検出、タップ、時間経過に応じてARが反応する
6. 失敗時は原因と次の操作がわかる

このプロダクトは「GLB表示ツール」ではなく、**軽量AR演出を作る体験デザイナー** として育てる。

---

## 4. 最初の看板機能

### Portal Marker

最初の看板機能は **Portal Marker** とする。

マーカー面が穴のように開き、奥に別世界があるように見える演出。そこからモデル、粒子、字幕、音が連動して出る。

MVPで必要なもの:

- マーカーに追従するポータル面
- 開くアニメーション
- 奥行き感のある軽量シェーダーまたはCanvasTexture
- 任意の粒子演出
- 任意のタップ反応
- 任意の短い音声

最初は現実空間を本当に切り抜くのではなく、マーカー面の上に「穴に見える描画」を重ねる。スマホWebARではこの方が軽く、安定しやすい。

---

## 5. 利用者の役割

### Operator

制作・管理する人。現時点では主にアプリ所有者。

できること:

- プロジェクト作成
- プロジェクト編集
- アセットアップロード
- AR演出設定
- ローカルプレビュー
- 公開リリース作成
- QR発行
- 公開停止または新リリースへの差し替え

### Viewer

QRからARを見る人。

できること:

- AR体験を開く
- カメラ許可をする
- ガイドに沿ってマーカーを写す
- タップなどの簡単な操作をする

できないこと:

- プロジェクト編集
- アセットアップロード
- 公開内容の変更

### Client Reviewer（将来）

将来的に、クライアント確認用の軽い権限を追加してよい。

候補:

- ドラフトプレビューを見る
- 承認/差し戻し
- コメント

ただし最初のリニューアルでは必須ではない。

---

## 6. 保存と公開

### 下書き保存

当面の下書き保存はブラウザローカルでよい。

- モデル本体: `IndexedDB`
- プロジェクト一覧/軽量設定: `localStorage` または IndexedDB

理由:

- Miru Studio は制作側専用の管理アプリであり、現段階では共同編集SaaSではない
- ローカル保存なら実装と運用が軽い
- 公開時にだけ安定した永続ストレージへ出せばよい

### 公開保存

公開済みARは、以下に依存してはいけない。

- `localStorage`
- `IndexedDB`
- Vercel `/tmp`
- 開発PC上の `public/projects`
- 開発サーバーが起動していること

公開済みARは、永続的に読める object storage / CDN に保存する。

最初の推奨:

- Vercel Blob

将来候補:

- Cloudflare R2
- AWS S3 + CloudFront
- Firebase Storage（CORSと公開ルールを明確に管理できる場合）

### 公開パス

公開物は release 単位で不変にする。

```txt
projects/{projectId}/releases/{releaseId}/project.json
projects/{projectId}/releases/{releaseId}/assets/{assetName}
```

QRは特定の release を指す。

```txt
/#/viewer?src=https://cdn.example.com/projects/{projectId}/releases/{releaseId}/project.json
```

これにより、編集途中の壊れた下書きがクライアントのQRに出る事故を防ぐ。

### 公開ルール

- 公開リリースは immutable とする
- 編集は draft に対して行う
- 再公開は新しい `releaseId` を作る
- 既存QRは明示的に公開停止しない限り動き続ける
- `latest` ポインタは将来追加してよいが、クライアント納品QRは release 固定を優先する

---

## 7. project.json v2

公開 `project.json` は Studio と Viewer の安定した契約にする。

新規公開は v2 を使う。Viewer は古い形式を正規化して読めるようにする。

推奨形:

```json
{
  "schemaVersion": 2,
  "id": "project-id",
  "releaseId": "release-id",
  "type": "marker",
  "title": "Project Title",
  "assets": {
    "marker": {
      "type": "pattern",
      "url": "assets/marker.png",
      "patternUrl": "assets/marker.patt"
    },
    "models": [
      {
        "id": "model-0",
        "url": "assets/model.glb",
        "transform": {
          "position": [0, 0, 0],
          "rotation": [0, 0, 0],
          "scale": [1, 1, 1]
        }
      }
    ],
    "audio": [
      {
        "id": "portal-open",
        "url": "assets/portal-open.mp3"
      }
    ]
  },
  "experience": {
    "startScreen": {},
    "loadingScreen": {},
    "guideScreen": {}
  },
  "effects": [
    {
      "id": "portal-0",
      "type": "portal",
      "trigger": "markerFound",
      "style": "deep-space"
    }
  ]
}
```

---

## 8. 技術スタック方針

### 継続するもの

- Vite
- Three.js
- iPhone Safari向けの AR.js marker mode
- Android Chrome向けの WebXR
- IndexedDBによるローカル下書き保存

### 改善するもの

- `ar-viewer.js` の責務分離
- `project.json` のスキーマ固定
- 公開保存の永続化
- AR演出レイヤーの新設
- マーカー品質チェック
- 失敗時のUIと診断ログ

### 評価するもの

- MindAR による自然画像トラッキング
- AR.js NFT image tracking
- 8th Wall open-source components

ただし、Portal Marker MVP ができるまでは全体スタックを丸ごと置き換えない。

---

## 9. マーカー仕様

### 現在の方式

現在は AR.js のパターンマーカーを使う。

重要な制約:

- アップロード画像の中央を正方形にクロップする
- 小さな `.patt` パターンに変換する
- 長方形の本の表紙、ポスター、商品パッケージ全体をそのまま追跡する方式ではない

そのため、本の表紙を使うと、見た目は良くても追跡が不安定になることがある。

### 短期方針

パターンマーカーでは、正方形の追跡エリアを使う。

良い条件:

- 高コントラスト
- 左右対称すぎない
- 内部に識別しやすいディテールがある
- 余白だけではない
- 小さい文字だけに依存しない
- 繰り返し模様だけではない
- 印刷時に反射しにくい
- 現実のサイズが小さすぎない

マーカーは無意味な記号である必要はない。ロゴ、紋章、ラベル、カード、装飾フレームなど、クライアントの世界観に合わせてよい。

### 本の表紙・ポスター

本の表紙やポスターを使う方向は正しい。ただし、それは現在の `pattern` とは別の `imageTarget` として扱う。

短期対応:

- 表紙/ポスター内に正方形の追跡エリアを設ける
- その正方形部分をパターンマーカーにする
- 表紙全体はガイド画面やビジュアルとして使う
- Portal Marker はその正方形部分から開く

長期対応:

- `markerType: "imageTarget"` を追加する
- 本の表紙、ポスター、商品パッケージなどの長方形画像を自然画像トラッキングする
- 必要なターゲットファイルを公開時に生成/保存する

将来形:

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
    },
    "physicalAspectRatio": 0.68
  }
}
```

---

## 10. AR演出ランタイム

AR演出はリニューアル後の中核機能にする。

初期トリガー:

- `start`
- `markerFound`
- `markerLost`
- `tap`
- `time`
- `modelLoaded`

初期エフェクト:

- `portal`
- `scanReveal`
- `particleAura`
- `caption`
- `tapTransform`

Viewer は `effects` を宣言的に読み、ARシーン内で再生する。演出ランタイムは編集UIに依存させない。

---

## 11. 用意するアセット

Portal Marker の初期サンプルで用意したいもの:

- 正方形の追跡マーカー画像（1024px以上推奨）
- 必要なら表紙/ポスター全体の画像
- 透過PNGまたはSVGのロゴ
- ブランドカラー
- 代表GLB（できれば 5MB 以下）
- ポータル世界観の参考画像または言語化された方向性
- 1秒前後の音声
  - ポータルが開く音
  - タップ音
  - 出現音
- 短い文言
  - 開始画面タイトル
  - 開始ボタン
  - ガイド文
  - AR内キャプション

---

## 12. 品質基準

クライアントに見せる前に満たす基準:

- QRが正しい release URL を開く
- `project.json` が1回で読める
- 通常のモバイル回線で開始画面が2秒以内に出る
- カメラ許可の導線がわかりやすい
- ガイド画像と実際のマーカーが一致している
- マーカー検出後3秒以内に主要演出が出る
- 公開ARがローカル下書きデータに依存しない
- asset欠落時に読めるエラーが出る
- 下書き編集で既存QRが壊れない

---

## 13. リニューアル計画

### Phase 1: 仕様固定

- 本仕様書を基準にする
- `project.json` v2 を定義する
- 公開保存/release の契約を決める
- マーカー仕様を更新する

### Phase 2: Portal Marker MVP

- `effects-runtime` を追加する
- `portal` effect をパターンマーカー向けに実装する
- 正方形マーカーのサンプルを作る
- iPhone Safari / Android Chrome で実機確認する

### Phase 3: 公開保存の安定化

- Vercel Blob などの storage provider を実装する
- release単位で `project.json` と assets を保存する
- QR生成を release URL ベースにする

### Phase 4: 自然画像トラッキング検証

- 本の表紙/ポスター全体を対象に検証する
- AR.js NFT、MindAR、その他候補を比較する
- `imageTarget` を本番仕様に入れるか決める

### Phase 5: Studio UX リニューアル

- GLB中心の編集から演出プリセット中心へ移行する
- マーカー品質チェックを追加する
- assetサイズ警告を追加する
- クライアント納品前のPreview/Release画面を作る

