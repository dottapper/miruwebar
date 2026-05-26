# Image Target And Release Size Tasks

## Goal

本の表紙、ポスター、商品パッケージのような長方形の自然画像をARの認識対象にできるようにする。

同時に、公開 `project.json` から巨大な `data:image/...;base64` を取り除き、QRから開いたViewerが黒い「Project取得中」で長く止まらないようにする。

完成判定は次の1本の導線が通ること。

```txt
Studioで表紙画像を登録
  -> imageTarget用ターゲットを用意
  -> Cloud Release公開
  -> project.json は軽量なURL参照だけを持つ
  -> QRがRelease固定URLを開く
  -> ViewerがMindAR image targetで表紙を認識する
  -> マーカー検出後、モデルまたはPortal演出が表示される
```

## Current Evidence

2026-05-26 の実機報告と公開URL確認で分かったこと。

- 公開URLは新しいViewerコードを配信している。
- 公開 `project.json` は `schemaVersion: 2`、`type: "marker"`、モデル1件、`markerPattern` 12 blocks。
- Viewerは `MarkerAR開始`、`プロジェクトモデル読み込み開始: 1`、`3Dモデル読み込み完了` まで到達する。
- `Pattern Data read error` は出ていない。
- 認識対象画像は 555 x 800 の縦長自然画像。
- `project.json` は約 534KB。主因は `experience.startScreen.logo` が `data:image/png;base64,...` のまま埋め込まれていること。
- 現在の `pattern` 方式は自然画像全体のトラッキングではない。表紙/ポスターは `imageTarget` として扱う必要がある。

## Non Goals

今は以下を同時に作らない。

- 複数ユーザー編集
- クライアント自身によるアップロード/編集
- 汎用AR SDK比較の長期調査
- 既存 `pattern` マーカー導線の削除
- 既存Release URLの破壊的移行
- 大容量GLBのdirect upload本格対応

## Implementation Decision

最初の本番候補は **MindAR image tracking** とする。

理由:

- MindARはImage Trackingをサポートしている。
- MindAR v1.2系はES Module化され、Three.js連携が用意されている。
- ターゲットファイルが `.mind` 1つにまとまるため、公開JSON/Blob管理がAR.js NFTの3ファイル構成より単純。
- 現行ViewerはThree.jsベースなので、A-FrameではなくMindAR Three.js版を優先する。

AR.js NFTは代替候補として残すが、最初の実装ルートにはしない。

参考:

- MindAR docs: https://hiukim.github.io/mind-ar-js-doc/
- MindAR compile target: https://hiukim.github.io/mind-ar-js-doc/quick-start/compile/
- AR.js image tracking docs: https://ar-js-org.github.io/AR.js-Docs/image-tracking/

## Phase 0: Baseline Lock

- [ ] 今回の公開URLを診断用ケースとして記録する。
- [ ] 現在の `project.json` サイズ、marker画像サイズ、モデルURL、Viewerログを短いメモに残す。
- [ ] `pattern` 方式で表紙画像が認識できないケースを、再現条件として明文化する。
- [ ] 既存 `pattern` golden project は壊さない基準として残す。

Done when:

- 「コード未反映」「JSON不正」「モデル未読込」「認識方式違い」を区別できる証拠が残っている。

## Phase 1: project.json Size Reduction

公開JSONからbase64画像を排除する。

- [ ] `api/publish-project.js` に screen asset アップロード helper を追加する。
- [ ] `experience.startScreen.logo` / `logoImage` が data URL の場合、Vercel BlobへアップロードしてURLに置き換える。
- [ ] `experience.startScreen.background` / `backgroundImage` が data URL の場合もURL化する。
- [ ] `experience.loadingScreen.logo` / `logoImage` は既存処理をhelperへ寄せ、重複を減らす。
- [ ] `experience.guideScreen` 配下の `guideImage`, `markerImage`, `background`, `backgroundImage` も data URL ならURL化する。
- [ ] 旧互換フィールド `startScreen`, `loadingScreen`, `guideScreen` にもURL化後の値だけを入れる。
- [ ] `project.json` に `data:image/` が残っていたら、公開APIで警告ログを出す。
- [ ] 公開後の `project.json` サイズ目標を 100KB 未満にする。最低でも 150KB 未満を合格ラインにする。
- [ ] ローカルFS公開 (`publishToLocalFs`) でも同じURL化ルールにそろえる。
- [ ] base64ロゴ入りfixtureで、公開JSONに data URL が残らないテストを追加する。

Done when:

- 現在のようなロゴ入りReleaseでも `project.json` が軽量化され、Viewer初期表示の黒画面時間が短くなる。
- `project.json` は設定とURL参照だけを持ち、画像本体はBlob assetとして保存される。

## Phase 2: project.json Schema Expansion

`pattern` と `imageTarget` を同じ `assets.marker` 契約で扱えるようにする。

- [ ] `assets.marker.type` を `"pattern"` または `"imageTarget"` にする。
- [ ] `imageTarget` 用に `sourceImageUrl`, `targetUrl`, `engine`, `physicalAspectRatio` を追加する。
- [ ] 旧 `markerImage`, `markerPattern`, `assets.marker.url` はViewer入口で正規化する。
- [ ] `docs/product-spec.md` の `project.json v2` 例に `imageTarget` を追記する。
- [ ] `docs/sample-project-v2.json` は `pattern` のまま維持し、別途 `docs/sample-project-image-target.json` を追加する。

想定スキーマ:

```json
{
  "assets": {
    "marker": {
      "type": "imageTarget",
      "engine": "mindar",
      "sourceImageUrl": "assets/book-cover.jpg",
      "targetUrl": "assets/book-cover.mind",
      "physicalAspectRatio": 0.694
    }
  }
}
```

Done when:

- Viewerが `assets.marker.type` だけで `pattern` / `imageTarget` の分岐を決められる。

## Phase 3: MindAR Target Preparation

まずは確実に動く公開導線を作るため、2段階に分ける。

### 3A: Manual Target File MVP

- [ ] Studioで `.mind` ファイルを登録できるようにする。
- [ ] 表紙画像と `.mind` ファイルの対応関係をプロジェクトに保存する。
- [ ] `.mind` が無い `imageTarget` プロジェクトは公開不可にする。
- [ ] 公開APIで `.mind` をVercel Blobへアップロードする。

Done when:

- 外部MindAR compilerで作った `.mind` を使って、まず1本のReleaseが動く。

### 3B: In-App Compiler

- [ ] MindAR compilerをブラウザ内で使えるかスパイクする。
- [ ] 重い処理はWeb Worker化する。
- [ ] 生成中の進捗、失敗、画像特徴量不足をStudioに表示する。
- [ ] 生成した `.mind` を下書き保存し、公開時にBlobへ送る。

Done when:

- Operatorが外部ツールなしで表紙画像から `.mind` を作れる。

## Phase 4: MindAR Image Target Engine

`AREngineInterface` に沿って新しいエンジンを追加する。

- [ ] `mind-ar` を依存関係に追加する。
- [ ] `src/components/ar/mindar-image-ar.js` を追加する。
- [ ] `MindARThree` を `mind-ar/dist/mindar-image-three.prod.js` から読み込む。
- [ ] `imageTargetSrc` に公開 `.mind` URLを渡す。
- [ ] `addAnchor(0)` でターゲットアンカーを作る。
- [ ] 既存 `MarkerAR.start(projectData)` と同じようにGLBを読み込み、アンカー配下に配置する。
- [ ] `targetFound` / `targetLost` を既存の `markerFound` / `markerLost` 相当イベントへ変換する。
- [ ] `effects-runtime` が `imageTarget` でも動くようにする。
- [ ] `destroy()` でMindAR、renderer、camera stream、requestAnimationFrameを確実に止める。
- [ ] `AREngineAdapter` に `imageTarget` / `mindar` を追加する。

Done when:

- `assets.marker.type === "imageTarget"` のReleaseではMindARエンジンが選ばれ、`pattern` Releaseでは既存MarkerARがそのまま選ばれる。

## Phase 5: Studio UX

- [ ] マーカー設定に「Pattern marker」と「Image target」を追加する。
- [ ] 本の表紙/ポスターを使う場合は `Image target` を推奨表示する。
- [ ] `Pattern marker` では正方形・高コントラスト向けの警告を出す。
- [ ] `Image target` では `.mind` 必須、または生成待ち状態を表示する。
- [ ] ガイド画面には認識対象の表紙画像全体を表示する。
- [ ] `physicalAspectRatio` を画像の縦横比から自動計算し、必要なら手動補正できるようにする。

Done when:

- Operatorが「どの方式を選ぶべきか」で迷わない。

## Phase 6: Publish And Release Contract

- [ ] `storage-provider.js` から `marker.type`, `sourceImage`, `.mind` asset を送れるようにする。
- [ ] `api/publish-project.js` が `imageTarget` assetをBlobへ保存する。
- [ ] 公開JSONには `.mind` と source image のURLだけを入れる。
- [ ] `markerPattern` は `pattern` のときだけ保持する。
- [ ] 既存 `pattern` Releaseの後方互換を維持する。

Done when:

- `pattern` と `imageTarget` のどちらも同じCloud Release UIから公開できる。

## Phase 7: Verification

自動確認:

- [ ] `npm run build`
- [ ] `npm run test:run`
- [ ] `npm run check:start`
- [ ] 公開JSON size check: `project.json < 100KB` を目標、`< 150KB` を合格ライン
- [ ] `data:image/` が公開JSONに残っていないこと
- [ ] `pattern` golden project が従来どおり起動すること
- [ ] `imageTarget` golden project がMindARエンジンを選ぶこと

ブラウザ確認:

- [ ] 公開 `#/viewer?src=...project.json` で開始画面が出る
- [ ] Start後にMindARエンジンが初期化される
- [ ] `.mind` の取得が200である
- [ ] モデルGLBが200で読める
- [ ] `targetFound` ログが出る

実機確認:

- [ ] iPhone Safari: 表紙画像を認識する
- [ ] Android Chrome: 表紙画像を認識する
- [ ] マーカー検出後3秒以内にモデルまたはPortal演出が出る
- [ ] カメラ権限拒否、`.mind` 欠落、画像特徴量不足が読めるエラーになる

Done when:

- 今回の表紙画像で、新しいRelease QRを第三者端末が開き、表紙認識後にAR表示できる。

## Phase 8: Rollout

- [ ] 既存Releaseは変更しない。
- [ ] 新規Releaseだけ `imageTarget` を使えるようにする。
- [ ] 既存プロジェクトは初期値 `pattern` のまま。
- [ ] 表紙/ポスター画像を使っているプロジェクトだけ `imageTarget` に切り替える。
- [ ] 失敗時は `pattern` fallback ではなく、「image target targetUrl missing」など明確なエラーを出す。

Done when:

- 既存の正方形マーカー案件を壊さず、本の表紙案件だけ自然画像トラッキングへ移行できる。

