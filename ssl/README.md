# SSL 証明書について

このプロジェクトでは **リポジトリ内の証明書ファイルは使用していません**。

## 実際に使っている証明書

- **Vite 開発サーバー**: `@vitejs/plugin-basic-ssl` が `.vite/ssl/cert.pem` と `.vite/ssl/key.pem` を自動生成（`.vite/` は .gitignore 対象）
- **simple-server.js（HTTPS 時）**: 上記と同じ `.vite/ssl/cert.pem` と `.vite/ssl/key.pem` を参照

開発で HTTPS を使う場合は、`npm run dev` で Vite を一度起動すると `.vite/ssl/` が作成されます。simple-server を HTTPS で動かす場合も同じパスを参照します。

## この ssl/ フォルダ

以前 `server.crt` / `server.key` が ssl/ と ssl/ssl/ の二重で存在していましたが、コードから参照されていなかったため削除し、取り違えのリスクをなくしました。

カスタム証明書を使いたい場合は、simple-server や vite.config の参照先を変更する対応が必要です。
