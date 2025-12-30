AR.js Assets - ローカルオフライン使用

=== ⚠️ 重要: HIROマーカー使用禁止 ===
このプロジェクトでは、patt.hiro（HIROマーカー）の使用を禁止しています。
ユーザーがアップロードしたカスタム画像のみをマーカーとして使用します。
詳細は docs/MARKER_POLICY.md を参照してください。

patt.hiro ファイルは互換性テスト用に残していますが、
本番環境では使用されません。

=== 必須ファイル ===
- camera_para.dat: ARToolKit カメラパラメータ
  ※ このファイルはAR.jsの初期化に必要です

=== カスタムマーカー ===
カスタムマーカーは以下の流れで処理されます：
1. ユーザーが画像をアップロード
2. src/utils/marker-utils.js で .patt 形式に変換
3. Blob URL として MarkerAR に渡される

=== 提供されるパス ===
- /arjs/camera_para.dat - カメラパラメータ（必須）
- /arjs/patt.hiro - HIROマーカー（使用禁止・互換性テスト用）
- /arjs/ar-threex.js - AR.jsライブラリ

=== 注意事項 ===
- CDNがHTMLエラーページを返す場合、アプリはそれを検出してスキップします
- camera_para.dat は通常 1KB以上のサイズが必要です
- サーバーはこれらのファイルをリダイレクトなしで静的配信する必要があります
