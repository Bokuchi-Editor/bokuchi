#!/bin/bash

# Windows版ビルド用シェルスクリプト
# macOSからWindows用の実行ファイルをビルドします

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Windows版ビルドを開始します..."

# 必要なツールがインストールされているかチェック
echo "📋 必要なツールをチェック中..."

# mingw-w64のチェック
if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    echo "❌ mingw-w64がインストールされていません"
    echo "   以下のコマンドでインストールしてください:"
    echo "   brew install mingw-w64"
    exit 1
fi

# llvmのチェック
if ! command -v llvm-rc &> /dev/null; then
    echo "❌ llvmがインストールされていません"
    echo "   以下のコマンドでインストールしてください:"
    echo "   brew install llvm"
    exit 1
fi

# nsisのチェック
if ! command -v makensis &> /dev/null; then
    echo "❌ nsisがインストールされていません"
    echo "   以下のコマンドでインストールしてください:"
    echo "   brew install nsis"
    exit 1
fi

# RustのWindowsターゲットのチェック
if ! rustup target list --installed | grep -q "x86_64-pc-windows-gnu"; then
    echo "❌ Windows GNUターゲットがインストールされていません"
    echo "   以下のコマンドでインストールしてください:"
    echo "   rustup target add x86_64-pc-windows-gnu"
    exit 1
fi

echo "✅ 必要なツールがすべてインストールされています"

# 環境変数を設定
echo "🔧 環境変数を設定中..."
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
export CC_x86_64_pc_windows_gnu=x86_64-w64-mingw32-gcc
export CXX_x86_64_pc_windows_gnu=x86_64-w64-mingw32-g++
export AR_x86_64_pc_windows_gnu=x86_64-w64-mingw32-ar
export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc

echo "📦 フロントエンドをビルド中..."
npm run build

echo "🦀 Rustアプリケーションをビルド中..."
npm run tauri:build -- --target x86_64-pc-windows-gnu

echo "✅ Windows版ビルドが完了しました！"
echo ""
echo "📁 ビルド成果物:"
echo "   実行ファイル: src-tauri/target/x86_64-pc-windows-gnu/release/bokuchi.exe"
echo "   インストーラー: src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/Bokuchi_0.1.1_x64-setup.exe"
echo ""
echo "🎉 ビルドが正常に完了しました！"
