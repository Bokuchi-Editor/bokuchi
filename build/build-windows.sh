#!/bin/bash

# Windows版ビルド用シェルスクリプト
# macOSからWindows用の実行ファイルをビルドします

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（buildディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

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
LLVM_RC_PATH=""
if command -v llvm-rc &> /dev/null; then
    LLVM_RC_PATH="llvm-rc"
else
    # Homebrewのllvmのbinディレクトリを探す
    for llvm_path in /opt/homebrew/Cellar/llvm/*/bin/llvm-rc /usr/local/Cellar/llvm/*/bin/llvm-rc; do
        if [ -f "$llvm_path" ]; then
            LLVM_RC_PATH="$llvm_path"
            break
        fi
    done

    if [ -z "$LLVM_RC_PATH" ]; then
        echo "❌ llvmがインストールされていません"
        echo "   以下のコマンドでインストールしてください:"
        echo "   brew install llvm"
        exit 1
    fi
fi

# nsisのチェック
if ! command -v makensis &> /dev/null; then
    echo "❌ nsisがインストールされていません"
    echo "   以下のコマンドでインストールしてください:"
    echo "   brew install nsis"
    exit 1
fi

# RustのWindowsターゲットのチェックとインストール
echo "🦀 RustのWindowsターゲットをチェック中..."

# rustupがインストールされているかチェック
if ! command -v rustup &> /dev/null; then
    echo "📦 rustupをインストール中..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# Windowsターゲットがインストールされているかチェック
if ! rustup target list --installed | grep -q "x86_64-pc-windows-gnu"; then
    echo "⚠️  Windowsターゲットがインストールされていません"
    echo "🎯 Windowsターゲットを追加中..."
    rustup target add x86_64-pc-windows-gnu
else
    echo "✅ Windowsターゲットは既にインストールされています"
fi

echo "✅ 必要なツールがすべてインストールされています"

# 環境変数を設定
echo "🔧 環境変数を設定中..."
# llvmのbinディレクトリをPATHに追加
if [ -n "$LLVM_RC_PATH" ]; then
    LLVM_BIN_DIR="$(dirname "$LLVM_RC_PATH")"
    export PATH="$LLVM_BIN_DIR:$PATH"
fi
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
echo "   インストーラー: src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/Bokuchi_0.4.0_x64-setup.exe"
echo ""
echo "🎉 ビルドが正常に完了しました！"
