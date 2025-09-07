#!/bin/bash

# macOS公証化状態確認用シェルスクリプト
# ビルドしたアプリケーションの公証状態を詳しく確認します

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（buildディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 macOS公証化状態確認を開始します..."

# アプリケーションパス
APP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/Bokuchi.app"

# アプリケーションの存在確認
if [ ! -d "$APP_PATH" ]; then
    echo "❌ アプリケーションが見つかりません: $APP_PATH"
    echo "   まずビルドを実行してください: ./build-macos-notarized.sh"
    exit 1
fi

echo "📱 アプリケーション: $APP_PATH"
echo ""

# 1. 基本的な情報
echo "📋 基本情報:"
echo "   アプリケーション名: $(basename "$APP_PATH")"
echo "   パス: $APP_PATH"
echo "   サイズ: $(du -sh "$APP_PATH" | cut -f1)"
echo ""

# 2. 署名状態の確認
echo "🔐 署名状態:"
if codesign -dv "$APP_PATH" 2>&1 | grep -q "not signed"; then
    echo "   ❌ 署名されていません"
    SIGNED=false
else
    echo "   ✅ 署名済み"
    SIGNED=true

    # 署名の詳細情報
    echo "   📝 署名詳細:"
    codesign -dv "$APP_PATH" 2>&1 | while read line; do
        echo "      $line"
    done
fi
echo ""

# 3. Gatekeeperによる検証
echo "🛡️  Gatekeeper検証:"
GATEKEEPER_RESULT=$(spctl -a -v "$APP_PATH" 2>&1)
if echo "$GATEKEEPER_RESULT" | grep -q "accepted"; then
    echo "   ✅ Gatekeeper承認済み"
    if echo "$GATEKEEPER_RESULT" | grep -q "Notarized"; then
        echo "   🎉 公証済みアプリケーションとして認識されています"
        NOTARIZED=true
    else
        echo "   ⚠️  署名済みですが、公証化は検出されませんでした"
        NOTARIZED=false
    fi
else
    echo "   ❌ Gatekeeperに拒否されました"
    echo "   詳細: $GATEKEEPER_RESULT"
    NOTARIZED=false
fi
echo ""

# 4. 公証ステープルの確認
echo "🎫 公証ステープル確認:"
if [ "$SIGNED" = true ]; then
    STAPLE_RESULT=$(xcrun stapler validate "$APP_PATH" 2>&1)
    if echo "$STAPLE_RESULT" | grep -q "worked"; then
        echo "   ✅ 公証ステープル有効"
        echo "   📋 ステープル詳細:"
        echo "$STAPLE_RESULT" | while read line; do
            echo "      $line"
        done
    else
        echo "   ❌ 公証ステープルが見つからないか無効です"
        echo "   詳細: $STAPLE_RESULT"
    fi
else
    echo "   ⚠️  署名されていないため、ステープル確認をスキップ"
fi
echo ""

# 5. 署名の詳細検証
echo "🔍 署名詳細検証:"
if [ "$SIGNED" = true ]; then
    echo "   📊 署名検証結果:"
    codesign -vvv "$APP_PATH" 2>&1 | while read line; do
        echo "      $line"
    done
else
    echo "   ⚠️  署名されていないため、詳細検証をスキップ"
fi
echo ""

# 6. 公証化の履歴確認（可能な場合）
echo "📜 公証化履歴:"
if [ "$SIGNED" = true ]; then
    # 署名情報から公証化関連の情報を抽出
    SIGNATURE_INFO=$(codesign -dv "$APP_PATH" 2>&1)
    if echo "$SIGNATURE_INFO" | grep -q "Authority.*Developer ID"; then
        echo "   ✅ Developer ID証明書で署名済み"
    fi

    # 公証化のタイムスタンプを確認
    if [ "$NOTARIZED" = true ]; then
        echo "   🕒 公証化状態: 有効"
        echo "   📅 最終確認: $(date)"
    else
        echo "   ⚠️  公証化状態: 未確認または無効"
    fi
else
    echo "   ⚠️  署名されていないため、履歴確認をスキップ"
fi
echo ""

# 7. 配布準備状態の総合判定
echo "🎯 配布準備状態:"
if [ "$SIGNED" = true ] && [ "$NOTARIZED" = true ]; then
    echo "   🎉 完全に配布準備完了！"
    echo "   ✅ 署名済み"
    echo "   ✅ 公証済み"
    echo "   ✅ Gatekeeper承認済み"
    echo ""
    echo "📦 このアプリケーションは以下の方法で配布できます:"
    echo "   • 直接appファイルとして配布"
    echo "   • DMGファイルとして配布"
    echo "   • ユーザーは警告なしでインストール可能"
elif [ "$SIGNED" = true ]; then
    echo "   ⚠️  署名済みですが、公証化が必要です"
    echo "   ✅ 署名済み"
    echo "   ❌ 公証化未完了"
    echo ""
    echo "📋 次のステップ:"
    echo "   1. 環境変数を設定:"
    echo "      export APPLE_ID=\"your-apple-id@example.com\""
    echo "      export APPLE_PASSWORD=\"your-app-specific-password\""
    echo "      export APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
    echo "   2. 公証化を実行: ./build-macos-notarized.sh"
else
    echo "   ❌ 配布準備未完了"
    echo "   ❌ 署名未完了"
    echo "   ❌ 公証化未完了"
    echo ""
    echo "📋 次のステップ:"
    echo "   1. 署名済みビルドを実行: ./build-macos-signed.sh"
    echo "   2. または公証化付きビルドを実行: ./build-macos-notarized.sh"
fi
echo ""

# 8. 追加の診断情報
echo "🔧 診断情報:"
echo "   macOS バージョン: $(sw_vers -productVersion)"
echo "   Xcode コマンドラインツール: $(xcode-select -p)"
echo "   確認日時: $(date)"
echo ""

echo "✅ 公証化状態確認が完了しました！"
