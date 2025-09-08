# Mac で Windows 版クロスコンパイル - トラブルシューティングガイド

## 概要

このドキュメントは、macOS環境からWindows版のBokuchiアプリケーションをクロスコンパイルする際に発生する可能性のある問題とその解決方法をまとめています。

## 前提条件

### 必要なツール

```bash
# Homebrewでインストール
brew install mingw-w64 llvm nsis

# RustのWindowsターゲットを追加
rustup target add x86_64-pc-windows-gnu
```

### 環境変数の設定

```bash
# llvm-rcをPATHに追加
export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
```

## よくある問題と解決方法

### 1. `can't find crate for 'core'` エラー

**症状:**
```
error[E0463]: can't find crate for `core`
  |
  = note: the `x86_64-pc-windows-gnu` target may not be installed
  = help: consider downloading the target with `rustup target add x86_64-pc-windows-gnu`
```

**原因:**
HomebrewでインストールしたRustとrustupで管理されたRustが混在している場合に発生します。

**解決方法:**

1. **現在のRustの状況を確認:**
   ```bash
   which rustc
   which cargo
   rustc --version
   rustup --version
   ```

2. **Homebrew版のRustをアンインストール:**
   ```bash
   brew list | grep rust
   brew uninstall rust
   ```

3. **rustupで管理されたRustが使用されていることを確認:**
   ```bash
   which rustc
   # 出力例: /Users/username/.cargo/bin/rustc
   which cargo
   # 出力例: /Users/username/.cargo/bin/cargo
   ```

4. **Windowsターゲットを再インストール:**
   ```bash
   rustup target remove x86_64-pc-windows-gnu
   rustup target add x86_64-pc-windows-gnu
   ```

5. **ビルドを再実行:**
   ```bash
   export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
   ./build/build-windows.sh
   ```

### 2. `llvm-rc` が見つからないエラー

**症状:**
```
which llvm-rc
# 出力: llvm-rc not found
```

**解決方法:**

1. **llvm-rcの場所を検索:**
   ```bash
   find /opt/homebrew -name "llvm-rc" 2>/dev/null
   ```

2. **最新バージョンのllvm-rcをPATHに追加:**
   ```bash
   export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
   ```

3. **確認:**
   ```bash
   which llvm-rc
   # 出力例: /opt/homebrew/Cellar/llvm/21.1.0/bin/llvm-rc
   ```

### 3. ビルドが途中で失敗する

**症状:**
ビルドプロセスが途中で停止し、エラーメッセージが表示される。

**解決方法:**

1. **Cargoのキャッシュをクリア:**
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   ```

2. **Rustツールチェーンを更新:**
   ```bash
   rustup update
   ```

3. **Windowsターゲットを再インストール:**
   ```bash
   rustup target remove x86_64-pc-windows-gnu
   rustup target add x86_64-pc-windows-gnu
   ```

4. **ビルドを再実行:**
   ```bash
   export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
   ./build/build-windows.sh
   ```

## 推奨される環境設定

### 1. Rustの管理方法

**推奨:** rustupのみを使用してRustを管理する

```bash
# Homebrew版のRustをアンインストール
brew uninstall rust

# rustupでRustをインストール（既にインストール済みの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. 環境変数の永続化

`.zshrc`または`.bash_profile`に以下を追加:

```bash
# Windows版クロスコンパイル用
export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
```

### 3. 必要なツールの確認

ビルド前に以下のコマンドで必要なツールが揃っているか確認:

```bash
# 必要なツールの確認
which x86_64-w64-mingw32-gcc
which llvm-rc
which makensis
which rustc
which cargo

# Windowsターゲットの確認
rustup target list --installed | grep x86_64-pc-windows-gnu
```

## ビルド成功時の出力例

```
🚀 Windows版ビルドを開始します...
📋 必要なツールをチェック中...
🦀 RustのWindowsターゲットをチェック中...
✅ Windowsターゲットは既にインストールされています
✅ 必要なツールがすべてインストールされています
🔧 環境変数を設定中...
📦 フロントエンドをビルド中...
🦀 Rustアプリケーションをビルド中...
✅ Windows版ビルドが完了しました！

📁 ビルド成果物:
   実行ファイル: src-tauri/target/x86_64-pc-windows-gnu/release/bokuchi.exe
   インストーラー: src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/Bokuchi_0.3.1_x64-setup.exe
```

## 注意事項

1. **クロスプラットフォームコンパイルの制限:**
   - 実験的機能のため、一部の機能が制限される可能性があります
   - 完全な互換性を求める場合は、Windows環境でのビルドを推奨

2. **署名について:**
   - macOSからのビルドでは署名がスキップされます
   - 署名が必要な場合は、Windows環境でのビルドまたはカスタム署名コマンドの設定が必要

3. **パフォーマンス:**
   - クロスコンパイルは時間がかかる場合があります
   - 初回ビルド時は依存関係のダウンロードに時間がかかります

## トラブルシューティングチェックリスト

- [ ] Homebrew版のRustがアンインストールされているか
- [ ] rustupで管理されたRustが使用されているか
- [ ] Windowsターゲットが正しくインストールされているか
- [ ] llvm-rcがPATHに含まれているか
- [ ] 必要なツール（mingw-w64, nsis）がインストールされているか
- [ ] Cargoのキャッシュがクリアされているか（必要に応じて）

## 関連ファイル

- `build/build-windows.sh` - Windows版ビルドスクリプト
- `src-tauri/Cargo.toml` - Rustプロジェクト設定
- `src-tauri/tauri.conf.json` - Tauri設定ファイル

---

**最終更新:** 2025年1月
**対象バージョン:** Bokuchi 0.3.1
