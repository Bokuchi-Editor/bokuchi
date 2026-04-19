#!/bin/bash

# macOS版署名済みビルド用シェルスクリプト
# Apple Developer Programの証明書を使用して署名します

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（buildディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🍎 macOS版署名済みビルドを開始します..."

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
npm run tauri:build -- --target universal-apple-darwin

# 設定を元に戻す
echo "🔄 設定を元に戻しています..."
mv src-tauri/tauri.conf.json.backup src-tauri/tauri.conf.json
rm -f src-tauri/tauri.conf.json.tmp

echo "✅ macOS版署名済みビルドが完了しました！"
echo ""
echo "📁 ビルド成果物:"
echo "   アプリケーション: src-tauri/target/universal-apple-darwin/release/bundle/macos/Bokuchi.app"
echo "   DMGインストーラー: src-tauri/target/universal-apple-darwin/release/bundle/dmg/Bokuchi_0.8.0_universal.dmg"
echo ""
echo "🔐 署名情報:"
echo "   証明書: $CERT_IDENTITY"
echo "   チームID: $TEAM_ID"
echo ""
echo "🎉 署名済みビルドが正常に完了しました！"
echo ""
echo "📋 次のステップ:"
echo "   1. アプリケーションをテストしてください"
echo "   2. 必要に応じて公証（notarization）を実行してください"
echo "   3. DMGを配布してください"
