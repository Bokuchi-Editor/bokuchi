# セキュリティ管理

## 概要

このプロジェクトでは、Tauriフレームワークの制約により、いくつかのセキュリティ警告を無視しています。これらの警告は直接的なセキュリティリスクではありませんが、Tauriの更新により解決される可能性があるため、定期的な監視が必要です。

## 無視している警告

### 1. glib関連の警告 (RUSTSEC-2024-0429)

**問題**: glib 0.18.5 に unsoundness の問題が存在
**影響**: `glib::VariantStrIter` の `Iterator` と `DoubleEndedIterator` 実装
**現在の状況**: Tauri の依存関係により glib 0.20.0 への更新が不可能

**対応方針**:
- Dependabot で glib の更新を無視
- cargo audit で RUSTSEC-2024-0429 を無視
- Tauri が glib 0.20.0 をサポートするまで待機

**リスク評価**: 低リスク（アプリケーションの主要機能に直接影響しない）

### 2. GTK3関連の警告 (RUSTSEC-2024-0411〜0420)

**影響**: `atk`, `atk-sys`, `gdk`, `gdk-sys`, `gdkwayland-sys`, `gdkx11`, `gdkx11-sys`, `gtk`, `gtk-sys`, `gtk3-macros`
**理由**: GTK3バインディングがメンテナンスされていない
**対応**: TauriのWebViewエンジン（wry）がGTK3に依存しているため、直接的な置き換えは不可能

### 3. その他の非メンテナンス依存関係

以下のライブラリは非メンテナンス状態ですが、Tauri の依存関係のため直接制御できません：

- **derivative** (RUSTSEC-2024-0388): `zbus`経由で使用
- **fxhash** (RUSTSEC-2025-0057): `selectors`経由で使用
- **proc-macro-error** (RUSTSEC-2024-0370): `gtk3-macros`経由で使用

## 対応方針

### 1. 警告の無視設定
- GitHub Actionsのセキュリティ監査ワークフローで警告を無視
- Dependabotテストワークフローでも同様の設定を適用

### 2. 監視体制
- **週次セキュリティ監査**: GitHub Actions で自動実行
- **Dependabot**: 利用可能な更新を自動検出
- **Tauri の更新**: `tauri-update-monitor.yml`でTauriの更新を監視

### 3. 定期的な確認
- 月1回程度、これらの警告の状況を確認
- 新しいTauriバージョンがリリースされた際に、これらの警告の状況を確認

### 4. 将来的な対応
- Tauriが新しいバージョンでこれらの依存関係を更新した場合、対応を検討
- 将来的にTauriがGTK4や他のUIライブラリに移行した場合、対応を検討

## 技術的詳細

### 無視設定のコマンド例

```bash
cargo audit --ignore RUSTSEC-2024-0429 \
  --ignore RUSTSEC-2024-0411 --ignore RUSTSEC-2024-0412 \
  --ignore RUSTSEC-2024-0413 --ignore RUSTSEC-2024-0414 \
  --ignore RUSTSEC-2024-0415 --ignore RUSTSEC-2024-0416 \
  --ignore RUSTSEC-2024-0417 --ignore RUSTSEC-2024-0418 \
  --ignore RUSTSEC-2024-0419 --ignore RUSTSEC-2024-0420 \
  --ignore RUSTSEC-2024-0370 --ignore RUSTSEC-2024-0388 \
  --ignore RUSTSEC-2025-0057
```

### Dependabot設定

```yaml
# glibはTauriの制約により更新できない（Tauri更新時に再検討）
- dependency-name: "glib"
  update-types: ["version-update:semver-major", "version-update:semver-minor", "version-update:semver-patch"]
```

## 注意事項

これらの警告は**メンテナンスされていない**または**unsoundness**に関するものであり、直接的なセキュリティリスクではありません。ただし、Tauriの更新により解決される可能性があるため、定期的な確認が必要です。

## 更新履歴

- 2025-09-10: セキュリティドキュメントを統合・整理
- 2025-09-10: glib の unsoundness 警告を無視する設定を追加
- 2025-09-10: GTK3関連の警告を無視する設定を追加
