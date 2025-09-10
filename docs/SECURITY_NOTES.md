# セキュリティに関する注意事項

## 既知の制約

### glib の unsoundness 警告 (RUSTSEC-2024-0429)

**問題**: glib 0.18.5 に unsoundness の問題が存在
**影響**: `glib::VariantStrIter` の `Iterator` と `DoubleEndedIterator` 実装
**現在の状況**: Tauri の依存関係により glib 0.20.0 への更新が不可能

**対応方針**:
- Dependabot で glib の更新を無視
- cargo audit で RUSTSEC-2024-0429 を無視
- Tauri が glib 0.20.0 をサポートするまで待機

**リスク評価**:
- 低リスク: アプリケーションの主要機能に直接影響しない
- 監視継続: Tauri の更新で解決される可能性が高い

## その他の非メンテナンス依存関係

以下のライブラリは非メンテナンス状態ですが、Tauri の依存関係のため直接制御できません：

- GTK3 関連ライブラリ (atk, gdk, gtk など)
- derivative
- fxhash
- proc-macro-error

**対応方針**: Tauri フレームワークの更新に依存

## 監視方法

1. **週次セキュリティ監査**: GitHub Actions で自動実行
2. **Dependabot**: 利用可能な更新を自動検出
3. **Tauri の更新**: 定期的に Tauri のバージョンアップを確認

## 更新履歴

- 2025-09-10: glib の unsoundness 警告を無視する設定を追加
