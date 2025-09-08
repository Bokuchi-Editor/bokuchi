#!/bin/bash

# macOS版署名・公証・DMG作成用シェルスクリプト
# Apple Developer Programの証明書を使用して署名し、公証してからDMGを作成します

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（buildディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🍎 macOS版署名・公証・DMG作成を開始します..."

# 必要な環境変数をチェック
NOTARIZE_ENABLED=true
if [ -z "$APPLE_ID" ]; then
    echo "⚠️  APPLE_ID環境変数が設定されていません"
    echo "   export APPLE_ID=\"your-apple-id@example.com\""
    NOTARIZE_ENABLED=false
fi

if [ -z "$APPLE_PASSWORD" ]; then
    echo "⚠️  APPLE_PASSWORD環境変数が設定されていません"
    echo "   export APPLE_PASSWORD=\"your-app-specific-password\""
    NOTARIZE_ENABLED=false
fi

if [ -z "$APPLE_TEAM_ID" ]; then
    echo "⚠️  APPLE_TEAM_ID環境変数が設定されていません"
    echo "   export APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
    NOTARIZE_ENABLED=false
fi

if [ "$NOTARIZE_ENABLED" = false ]; then
    echo ""
    echo "⚠️  公証化がスキップされます（署名のみ実行）"
    echo "   公証化を有効にするには、上記の環境変数を設定してください"
    echo ""
    exit
fi

# 証明書の存在確認
echo "🔐 署名証明書を確認中..."
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "❌ Developer ID Application証明書が見つかりません"
    echo "   Apple Developer Programで証明書を作成してください"
    echo "   証明書の作成方法:"
    echo "   1. Xcode > Preferences > Accounts"
    echo "   2. Apple IDでログイン"
    echo "   3. Manage Certificates > + > Developer ID Application"
    exit 1
fi

# 証明書情報を取得
CERT_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | cut -d'"' -f2)
echo "✅ 署名証明書が見つかりました: $CERT_IDENTITY"

# tauri.conf.jsonの署名設定を更新
echo "🔧 署名設定を更新中..."
TEAM_ID=$(echo "$CERT_IDENTITY" | grep -o '([A-Z0-9]*)' | tr -d '()')
CERT_NAME=$(echo "$CERT_IDENTITY" | sed 's/ (.*//')

# バックアップを作成
cp src-tauri/tauri.conf.json src-tauri/tauri.conf.json.backup

# 署名設定を更新
sed -i.tmp "s/\"signingIdentity\": \".*\"/\"signingIdentity\": \"$CERT_IDENTITY\"/" src-tauri/tauri.conf.json
sed -i.tmp "s/\"providerShortName\": \".*\"/\"providerShortName\": \"$TEAM_ID\"/" src-tauri/tauri.conf.json

# ビルド実行
echo "📦 フロントエンドをビルド中..."
npm run build

echo "🦀 Rustアプリケーションをユニバーサルビルド中..."
echo "   Apple Silicon (aarch64-apple-darwin) と Intel Mac (x86_64-apple-darwin) の両方に対応"

# 必要なRustターゲットをチェック・インストール
echo "🎯 必要なRustターゲットをチェック中..."

# rustupがインストールされているかチェック
if ! command -v rustup &> /dev/null; then
    echo "📦 rustupをインストール中..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# 環境変数を確実に設定
export PATH="$HOME/.cargo/bin:$PATH"
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"

# 環境変数を確認
echo "🔧 環境変数を確認中..."
echo "   PATH: $PATH"
echo "   CARGO_HOME: $CARGO_HOME"
echo "   RUSTUP_HOME: $RUSTUP_HOME"

# Intel Macターゲットがインストールされているかチェック
if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
    echo "📦 Intel Macターゲット (x86_64-apple-darwin) をインストール中..."
    rustup target add x86_64-apple-darwin
fi

# Apple Siliconターゲットがインストールされているかチェック
if ! rustup target list --installed | grep -q "aarch64-apple-darwin"; then
    echo "📦 Apple Siliconターゲット (aarch64-apple-darwin) をインストール中..."
    rustup target add aarch64-apple-darwin
fi

echo "✅ 必要なターゲットがすべてインストールされています"

# ユニバーサルビルドの実行
echo "🚀 ユニバーサルビルドを開始します..."
echo "   ターゲット: universal-apple-darwin"
echo "   環境変数: PATH=$PATH"

# 環境変数を確実に設定してからビルド実行
export PATH="$HOME/.cargo/bin:$PATH"
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"

# npm run tauri:build を実行し、環境変数を確実に渡す
env PATH="$PATH" CARGO_HOME="$CARGO_HOME" RUSTUP_HOME="$RUSTUP_HOME" npm run tauri:build -- --target universal-apple-darwin

# 設定を元に戻す
echo "🔄 設定を元に戻しています..."
mv src-tauri/tauri.conf.json.backup src-tauri/tauri.conf.json
rm -f src-tauri/tauri.conf.json.tmp

# アプリケーションパス（ユニバーサルビルドの場合）
if [ -d "src-tauri/target/universal-apple-darwin/release/bundle/macos/Bokuchi.app" ]; then
    APP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/Bokuchi.app"
    echo "✅ ユニバーサルビルドのアプリケーションを発見: $APP_PATH"
else
    APP_PATH="src-tauri/target/release/bundle/macos/Bokuchi.app"
    echo "✅ 通常ビルドのアプリケーションを発見: $APP_PATH"
fi

# アプリケーションの存在確認
if [ ! -d "$APP_PATH" ]; then
    echo "❌ アプリケーションが見つかりません: $APP_PATH"
    exit 1
fi

echo "✅ 署名済みビルドが完了しました！"

# 公証化プロセス
if [ "$NOTARIZE_ENABLED" = true ]; then
    echo "🔐 公証化を開始します..."

    echo "📦 アプリケーションをZIPに圧縮中..."
    ZIP_PATH="Bokuchi.zip"
    ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

    echo "🚀 Appleに公証を送信中..."
    xcrun notarytool submit "$ZIP_PATH" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$APPLE_TEAM_ID" \
        --wait

    echo "✅ 公証が完了しました！"

    echo "🔍 公証結果を確認中..."
    # 公証ログの確認（オプション）
    echo "   公証は正常に完了しました"

    echo "📋 公証ステープルを追加中..."
    xcrun stapler staple "$APP_PATH"

    echo "🧹 一時ZIPファイルを削除中..."
    rm -f "$ZIP_PATH"

    echo "✅ 公証化が完了しました！"
else
    echo "⏭️  公証化をスキップします（環境変数が設定されていません）"
fi

# DMG作成プロセス
echo "💿 公証済みアプリケーションからDMGを作成中..."

# DMG作成用の一時ディレクトリ
DMG_TEMP_DIR="dmg_temp"
DMG_APP_DIR="$DMG_TEMP_DIR/Bokuchi.app"

# 既存のDMGファイルを削除
rm -f "src-tauri/target/release/bundle/dmg/"*.dmg

# 一時ディレクトリを作成
mkdir -p "$DMG_TEMP_DIR"

# 公証済みアプリケーションをコピー
echo "📋 公証済みアプリケーションをコピー中..."
cp -R "$APP_PATH" "$DMG_APP_DIR"

# DMG作成
DMG_NAME="Bokuchi_$(date +%Y%m%d_%H%M%S)_universal_notarized.dmg"
DMG_PATH="src-tauri/target/release/bundle/dmg/$DMG_NAME"

echo "💿 DMGファイルを作成中: $DMG_NAME"

# シンプルなhdiutilを使用してDMGを作成
echo "📦 シンプルなDMGを作成中..."
hdiutil create -volname "Bokuchi" -srcfolder "$DMG_TEMP_DIR" -ov -format UDZO "$DMG_PATH"

# 一時ディレクトリを削除
rm -rf "$DMG_TEMP_DIR"

# DMGに署名
echo "🔐 DMGに署名中..."
codesign --force --sign "$CERT_IDENTITY" "$DMG_PATH"

echo "✅ DMG作成が完了しました！"

echo ""
echo "🎉 署名・DMG作成が正常に完了しました！"
echo ""
echo "📁 成果物:"
if [ "$NOTARIZE_ENABLED" = true ]; then
    echo "   公証済みアプリケーション: $APP_PATH"
    echo "   公証済みDMG: $DMG_PATH"
else
    echo "   署名済みアプリケーション: $APP_PATH"
    echo "   署名済みDMG: $DMG_PATH"
fi
echo ""
echo "🔐 署名情報:"
echo "   証明書: $CERT_IDENTITY"
echo "   チームID: $TEAM_ID"
echo ""
echo "📋 配布準備完了:"
if [ "$NOTARIZE_ENABLED" = true ]; then
    echo "   - アプリケーションは公証済みです"
    echo "   - DMGは署名済みです"
    echo "   - 配布可能な状態です"
else
    echo "   - アプリケーションは署名済みです"
    echo "   - DMGは署名済みです"
    echo "   - 公証化を実行するには環境変数を設定してください"
fi
echo ""
echo "🎉 すべての処理が正常に完了しました！"
