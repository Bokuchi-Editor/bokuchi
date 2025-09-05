#!/bin/bash

# リリースビルドの検証スクリプト
# 開発時にもリリースビルドの問題を早期発見するために使用

set -e  # エラー時に停止

echo "🔍 リリースビルドの検証を開始します..."

# 1. フロントエンドのビルド
echo "📦 フロントエンドをビルド中..."
npm run build

# 2. Rustの依存関係をクリーンアップ
echo "🧹 Rustキャッシュをクリーンアップ中..."
cd src-tauri
cargo clean

# 3. 依存関係を更新
echo "🔄 依存関係を更新中..."
cargo update

# 4. 開発ビルドのチェック
echo "🔧 開発ビルドをチェック中..."
cargo check

# 5. リリースビルドのチェック
echo "🚀 リリースビルドをチェック中..."
cargo check --release

# 6. リリースビルドの実行
echo "🏗️ リリースビルドを実行中..."
cargo build --release

echo "✅ リリースビルドの検証が完了しました！"
echo "🎉 すべてのビルドが成功しました。"
