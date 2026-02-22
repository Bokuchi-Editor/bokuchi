# バージョンアップ時のチェックリスト

## 更新が必要なファイル

### 1. メインバージョンファイル

- [ ] `package.json` - `"version": "現在のバージョン"` を新しいバージョンに変更
- [ ] `package-lock.json` - 2 箇所の `"version": "現在のバージョン"` を新しいバージョンに変更
- [ ] `src-tauri/Cargo.toml` - `version = "現在のバージョン"` を新しいバージョンに変更
- [ ] `src-tauri/tauri.conf.json` - `"version": "現在のバージョン"` を新しいバージョンに変更

### 2. ビルドスクリプト

- [ ] `build-macos-signed.sh` - DMG ファイル名のバージョン部分を更新
  - 例: `Bokuchi_0.2_aarch64.dmg` → `Bokuchi_新バージョン_aarch64.dmg`
- [ ] `build-windows.sh` - インストーラーファイル名のバージョン部分を更新
  - 例: `Bokuchi_0.2_x64-setup.exe` → `Bokuchi_新バージョン_x64-setup.exe`

### 3. その他の可能性のあるファイル

- [ ] `README.md` - バージョン情報が記載されている場合は更新
- [ ] `CHANGELOG.md` - 新バージョン用に更新:
  1. `[Unreleased]` の見出しを `[X.Y.Z] - YYYY-MM-DD` に変更（新バージョンと日付）
  2. 先頭に空の `## [Unreleased]` セクションを追加（今後の変更用）
  3. 末尾の比較リンクを更新: `[Unreleased]` → `vX.Y.Z...HEAD`、`[X.Y.Z]` → `v前バージョン...vX.Y.Z` を追加
- [ ] その他のドキュメントファイル

## 更新手順

1. 上記のファイルを順番に確認・更新
2. バージョン番号の一貫性を確認
3. ビルドテストを実行して問題がないことを確認
4. 必要に応じて `npm install` を実行して package-lock.json を再生成

## 注意事項

- `package-lock.json`は自動生成されるファイルですが、バージョン情報は手動で更新が必要
- `src-tauri/Cargo.lock`は自動生成されるため、手動更新は不要
- ビルドスクリプトのファイル名は実際のビルド成果物のファイル名と一致させる必要がある

## 現在のバージョン: 0.5.0

最終更新日: 2025年2月22日
