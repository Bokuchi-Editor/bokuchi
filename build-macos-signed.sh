#!/bin/bash

# macOS版署名済みビルド用シェルスクリプト
# Apple Developer Programの証明書を使用して署名します

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

echo "🦀 Rustアプリケーションをビルド中..."
npm run tauri:build

# 設定を元に戻す
echo "🔄 設定を元に戻しています..."
mv src-tauri/tauri.conf.json.backup src-tauri/tauri.conf.json
rm -f src-tauri/tauri.conf.json.tmp

echo "✅ macOS版署名済みビルドが完了しました！"
echo ""
echo "📁 ビルド成果物:"
echo "   アプリケーション: src-tauri/target/release/bundle/macos/Bokuchi.app"
echo "   DMGインストーラー: src-tauri/target/release/bundle/dmg/Bokuchi_0.2.0_aarch64.dmg"
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
