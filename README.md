# miru-WebAR

## ドキュメント運用
- 変更でUI/UXに影響がある場合は、必ず本READMEも更新し、スクリーンショットを添付
- 仕様や方針の決定は `docs/` のADR（簡易決定記録）に追記（テンプレは `docs/adr/TEMPLATE.md`）
- 新規ルートやページを追加した場合は、`docs/routes.md` に反映

## 通知ルール（重要）
- デザインに影響が波及する変更時は、PRで @dottapper にメンションし、ラベル `design-impact` を付与
- アラート送信はPR作成時点で行い、承認が得られるまでマージ禁止
- クリティカル変更（スタート画面/共通スタイル/主要導線）は、事前にIssueを立てて合意を取る

## 開発
- 起動: `npm run dev`
- ビルド: `npm run build`
- プレビュー: `npm run preview`

詳細な貢献ルールは `CONTRIBUTING.md` を参照してください。
