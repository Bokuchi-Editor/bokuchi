#!/bin/bash

# macOS版ビルド用シェルスクリプト
# 署名なしでビルドします（開発・テスト用）

set -e  # エラーが発生したら即座に終了

echo "🍎 macOS版ビルドを開始します..."

# 署名設定を一時的に無効化
echo "🔧 署名設定を無効化中..."
sed -i.bak 's/"signingIdentity": "Developer ID Application"/"signingIdentity": null/' src-tauri/tauri.conf.json

# ビルド実行
echo "📦 フロントエンドをビルド中..."
npm run build

echo "🦀 Rustアプリケーションをビルド中..."
npm run tauri:build

# 署名設定を元に戻す
echo "🔄 署名設定を元に戻しています..."
mv src-tauri/tauri.conf.json.bak src-tauri/tauri.conf.json

echo "✅ macOS版ビルドが完了しました！"
echo ""
echo "📁 ビルド成果物:"
echo "   アプリケーション: src-tauri/target/release/bundle/macos/Bokuchi.app"
echo ""
echo "⚠️  注意: このアプリケーションは署名されていません"
echo "   ファイル関連付けを使用するには、手動で署名する必要があります"
echo ""
echo "🎉 ビルドが正常に完了しました！"
