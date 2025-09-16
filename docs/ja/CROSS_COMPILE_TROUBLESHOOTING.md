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

### 4. NSISテンプレートとアイコンの問題

**症状:**
```
Error while loading icon from "..\..\..\..\..\icons\bokuchi.ico": can't open file
Error in script installer.nsi on line X -- aborting creation process
failed to bundle project: `No such file or directory (os error 2)`
```

**原因:**
- NSISテンプレートのアイコンファイルパスが間違っている
- TauriのNSIS設定とカスタムテンプレートが競合している
- ファイルパスがNSIS実行ディレクトリからの相対パスになっていない

**解決方法:**

1. **NSISテンプレートのパスを修正:**
   - アイコンはNSIS実行ディレクトリからの相対パスを使用
   - Windowsパス形式で `..\..\..\..\..\icons\bokuchi.ico` を使用
   - 参照前にファイルの存在を確認

2. **TauriのNSIS設定の競合を回避:**
   - 問題が発生する場合は `tauri.conf.json` からカスタムNSIS設定を削除
   - TauriにNSIS生成を任せ、必要に応じて手動でファイル移動

3. **ファイルパスの確認:**
   ```bash
   # NSIS実行ディレクトリを確認
   cd src-tauri/target/x86_64-pc-windows-gnu/release/nsis/x64
   ls -la ../../../../../icons/
   # bokuchi.icoとその他のアイコンファイルが表示されるはず
   ```

4. **相対パスが失敗する場合は絶対パスを使用:**
   ```nsis
   !define MUI_ICON "C:\full\path\to\icons\bokuchi.ico"
   ```

### 5. Tauri NSISバンドルプロセスの失敗

**症状:**
```
failed to bundle project: `No such file or directory (os error 2)`
Error failed to bundle project: `No such file or directory (os error 2)`
```

**原因:**
- Tauriが生成されたNSISインストーラーを見つけられない、または移動できない
- 出力ディレクトリ構造の不一致
- NSISが予期しない場所にファイルを生成している

**解決方法:**

1. **TauriにNSIS生成を任せる:**
   - `tauri.conf.json` からカスタムNSIS設定を削除
   - TauriのデフォルトNSISプロセスを使用

2. **必要に応じて手動でファイル処理:**
   ```bash
   # Tauriがインストーラーを生成する場所を確認
   find src-tauri/target -name "*.exe" -type f

   # 必要に応じて期待される場所に移動
   mkdir -p src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis
   mv src-tauri/target/x86_64-pc-windows-gnu/release/nsis/x64/Bokuchi_*.exe \
      src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
   ```

3. **最終出力の確認:**
   ```bash
   ls -la src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
   # Bokuchi_0.4.0_x64-setup.exe が含まれているはず
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
- [ ] NSISテンプレートのファイルパスがNSIS実行ディレクトリからの相対パスになっているか
- [ ] アイコンファイルがNSIS実行ディレクトリからアクセス可能か
- [ ] TauriのNSIS設定がカスタムテンプレートと競合していないか
- [ ] 生成されたインストーラーが期待される場所（`bundle/nsis/`）にあるか

## 重要な教訓

### NSISテンプレート開発
1. **ファイルパス**: 常にNSIS実行ディレクトリ（`nsis/x64/`）からの相対パスを使用
2. **アイコン形式**: `MUI_ICON`には`.ico`ファイルを使用、サポートされていない形式は避ける
3. **パス検証**: テンプレートで参照する前にファイルパスをテスト
4. **Tauri統合**: `tauri.conf.json`のカスタムNSIS設定との競合を避ける

### ビルドプロセスの最適化
1. **TauriにNSIS処理を任せる**: 競合を避けるためカスタムNSIS設定を削除
2. **ファイル移動**: 生成されたファイルを期待される場所に移動するビルドスクリプトを使用
3. **エラーハンドリング**: 操作前に常にファイルの存在を確認
4. **デバッグ**: 正確な失敗ポイントを特定するため詳細ログを使用

### 避けるべき一般的な落とし穴
- ❌ TauriのNSIS処理とカスタムテンプレートの混在
- ❌ NSISテンプレートでの絶対パス使用
- ❌ 検証なしでのファイル場所の仮定
- ❌ ビルドプロセスの複雑化
- ✅ シンプルに保つ: Tauriに生成させ、必要に応じて手動移動
- ✅ 各ステップを個別にテスト
- ✅ ファイルパスと存在を確認

## 関連ファイル

- `build/build-windows.sh` - Windows版ビルドスクリプト
- `src-tauri/Cargo.toml` - Rustプロジェクト設定
- `src-tauri/tauri.conf.json` - Tauri設定ファイル
- `src-tauri/templates/installer.nsi` - NSISインストーラーテンプレート

---

**最終更新:** 2024年9月16日
**対象バージョン:** Bokuchi 0.4.0
