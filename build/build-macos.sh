#!/bin/bash

# macOS版ビルド用シェルスクリプト
# 署名なしでビルドします（開発・テスト用）

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（buildディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🍎 macOS版ビルドを開始します..."

# 署名設定を一時的に無効化
echo "🔧 署名設定を無効化中..."
sed -i.bak 's/"signingIdentity": "Developer ID Application"/"signingIdentity": null/' src-tauri/tauri.conf.json

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

# 署名設定を元に戻す
echo "🔄 署名設定を元に戻しています..."
mv src-tauri/tauri.conf.json.bak src-tauri/tauri.conf.json

echo "✅ macOS版ビルドが完了しました！"
echo ""
echo "📁 ビルド成果物:"
echo "   アプリケーション: src-tauri/target/universal-apple-darwin/release/bundle/macos/Bokuchi.app"
echo "   DMGインストーラー: src-tauri/target/universal-apple-darwin/release/bundle/dmg/Bokuchi_0.8.0_universal.dmg"
echo ""
echo "⚠️  注意: このアプリケーションは署名されていません"
echo "   ファイル関連付けを使用するには、手動で署名する必要があります"
echo ""
echo "🎉 ビルドが正常に完了しました！"
