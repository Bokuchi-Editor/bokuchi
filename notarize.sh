#!/bin/bash

# macOS公証（Notarization）用スクリプト
# Apple Developer Programの認証情報を使用して公証します

set -e  # エラーが発生したら即座に終了

echo "🔐 macOS公証を開始します..."

# 必要な環境変数をチェック
if [ -z "$APPLE_ID" ]; then
    echo "❌ APPLE_ID環境変数が設定されていません"
    echo "   export APPLE_ID=\"your-apple-id@example.com\""
    exit 1
fi

if [ -z "$APPLE_PASSWORD" ]; then
    echo "❌ APPLE_PASSWORD環境変数が設定されていません"
    echo "   export APPLE_PASSWORD=\"your-app-specific-password\""
    exit 1
fi

if [ -z "$APPLE_TEAM_ID" ]; then
    echo "❌ APPLE_TEAM_ID環境変数が設定されていません"
    echo "   export APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
    exit 1
fi

# アプリケーションパスを確認
APP_PATH="src-tauri/target/release/bundle/macos/Bokuchi.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ アプリケーションが見つかりません: $APP_PATH"
    echo "   まず署名済みビルドを実行してください: ./build-macos-signed.sh"
    exit 1
fi

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
xcrun notarytool log \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait

echo "📋 公証ステープルを追加中..."
xcrun stapler staple "$APP_PATH"

echo "🧹 一時ファイルを削除中..."
rm -f "$ZIP_PATH"

echo "✅ 公証が正常に完了しました！"
echo ""
echo "📁 公証済みアプリケーション:"
echo "   $APP_PATH"
echo ""
echo "🎉 アプリケーションは公証され、配布準備が整いました！"
