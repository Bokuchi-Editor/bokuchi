# macOS 公証化（Notarization）完全ガイド

## 概要

このドキュメントは、macOS アプリケーションの公証化（Notarization）と公証ステープル（Stapling）について、開発者が理解すべき技術的詳細と実践的な手順を説明します。

## 目次

1. [公証化とは](#公証化とは)
2. [公証ステープルとは](#公証ステープルとは)
3. [公証化の流れ](#公証化の流れ)
4. [技術的詳細](#技術的詳細)
5. [トラブルシューティング](#トラブルシューティング)
6. [実践的な手順](#実践的な手順)
7. [検証と確認](#検証と確認)

## 公証化とは

### 基本的な概念

**公証化（Notarization）**は、Apple が提供するセキュリティサービスです：

- **目的**: アプリケーションに悪意のあるコードが含まれていないかを Apple がスキャン
- **対象**: Developer ID で署名されたアプリケーション
- **結果**: 公証チケット（Notarization Ticket）の発行

### 公証化の利点

#### ユーザー体験の向上

- **警告なしインストール**: 「このアプリを開きますか？」の警告が表示されない
- **信頼性の向上**: Apple が承認したアプリケーションとして認識される
- **セキュリティの保証**: 悪意のあるコードが含まれていないことを証明

#### 開発者にとっての利点

- **配布の簡素化**: ユーザーに特別な設定を要求しない
- **ブランド信頼性**: Apple の承認を受けたアプリケーションとして配布可能
- **Gatekeeper 対応**: macOS のセキュリティシステムとの完全な互換性

## 公証ステープルとは

### 公証ステープルの仕組み

**公証ステープル（Notarization Stapling）**は、公証チケットをアプリケーションバンドルに直接埋め込むプロセスです：

1. **公証チケットの取得**: Apple のサーバーから公証チケットをダウンロード
2. **バンドルへの埋め込み**: アプリケーションバンドルにチケットを埋め込む
3. **オフライン検証**: インターネット接続なしでも公証状態を確認可能

### 公証ステープルの技術的詳細

#### 公証チケットの内容

```
cdhash: bbe5e239f64756bd48ad9e7f19ea95e95a44e336
signingId: com.pemomomo.bokuchi
teamId: RNGXZZHG98
secureTimestamp: 2025-09-09 15:42:23 +0000
```

#### 保存場所

- **Apple CloudKit**: `api.apple-cloudkit.com` で管理
- **レコード名**: `2/2/{cdhash}`
- **一時保存**: `/var/folders/.../{uuid}.ticket`

## 公証化の流れ

### 1. 署名（Code Signing）

```bash
# アプリケーションの署名
codesign --force --deep --sign "Developer ID Application: Your Name (TEAM_ID)" YourApp.app
```

### 2. 公証化（Notarization）

```bash
# 公証化の実行
xcrun notarytool submit YourApp.zip --keychain-profile "notarytool-profile" --wait
```

### 3. ステープル（Stapling）

```bash
# 公証ステープルの実行
xcrun stapler staple YourApp.app
```

### 4. 検証（Validation）

```bash
# 公証ステープルの検証
xcrun stapler validate YourApp.app
```

## 技術的詳細

### 公証チケットの構造

公証チケットは以下の情報を含みます：

- **cdhash**: アプリケーションの一意のハッシュ値
- **signingId**: アプリケーションの識別子
- **teamId**: 開発者チーム ID
- **secureTimestamp**: 署名時刻
- **signedTicket**: デジタル署名されたチケットデータ

### Apple CloudKit との連携

公証チケットは Apple CloudKit で管理され、以下の API エンドポイントを使用します：

```
https://api.apple-cloudkit.com/database/1/com.apple.gk.ticket-delivery/production/public/records/lookup
```

### セキュリティの仕組み

1. **改ざん検出**: アプリケーションが変更されていないか確認
2. **信頼性の証明**: Apple が承認したアプリケーションであることを証明
3. **Gatekeeper 対応**: macOS のセキュリティシステムとの連携

## トラブルシューティング

### よくある問題と解決策

#### 1. 公証ステープルが失敗する

**症状**: `Bokuchi.app does not have a ticket stapled to it.`

**原因**: 公証は成功したが、ステープルが実行されていない

**解決策**:

```bash
# 手動でステープルを実行
xcrun stapler staple YourApp.app
```

#### 2. 公証化が失敗する

**症状**: 公証化プロセスでエラーが発生

**原因**:

- 署名の問題
- アプリケーションの構造の問題
- ネットワークの問題

**解決策**:

```bash
# 署名の確認
codesign --verify --deep --verbose=2 YourApp.app

# 公証化の再実行
xcrun notarytool submit YourApp.zip --keychain-profile "profile" --wait
```

#### 3. Gatekeeper で警告が表示される

**症状**: ユーザーがアプリケーションを開く際に警告が表示される

**原因**: 公証ステープルが適用されていない

**解決策**:

```bash
# 公証ステープルの確認
xcrun stapler validate YourApp.app

# 必要に応じてステープルを実行
xcrun stapler staple YourApp.app
```

### エラーコードの意味

- **Exit Code 65**: 公証ステープルが見つからない
- **Exit Code 1**: 署名の問題
- **Exit Code 2**: ネットワークの問題

## 実践的な手順

### 完全な公証化プロセス

#### 1. 事前準備

```bash
# 開発者証明書の確認
security find-identity -v -p codesigning

# キーチェーンプロファイルの設定
xcrun notarytool store-credentials "notarytool-profile" \
  --apple-id "your-apple-id@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "app-specific-password"
```

#### 2. アプリケーションの署名

```bash
# 署名の実行
codesign --force --deep --sign "Developer ID Application: Your Name (TEAM_ID)" YourApp.app

# 署名の確認
codesign --verify --deep --verbose=2 YourApp.app
```

#### 3. 公証化の実行

```bash
# ZIPファイルの作成
ditto -c -k --keepParent YourApp.app YourApp.zip

# 公証化の実行
xcrun notarytool submit YourApp.zip --keychain-profile "notarytool-profile" --wait
```

#### 4. ステープルの実行

```bash
# 公証ステープルの実行
xcrun stapler staple YourApp.app

# ステープルの確認
xcrun stapler validate YourApp.app
```

### 自動化スクリプトの例

```bash
#!/bin/bash

# 公証化の完全なプロセスを自動化
APP_NAME="YourApp"
TEAM_ID="YOUR_TEAM_ID"
PROFILE_NAME="notarytool-profile"

echo "🔐 署名を実行中..."
codesign --force --deep --sign "Developer ID Application: Your Name ($TEAM_ID)" "$APP_NAME.app"

echo "📦 ZIPファイルを作成中..."
ditto -c -k --keepParent "$APP_NAME.app" "$APP_NAME.zip"

echo "🍎 公証化を実行中..."
xcrun notarytool submit "$APP_NAME.zip" --keychain-profile "$PROFILE_NAME" --wait

echo "📌 ステープルを実行中..."
xcrun stapler staple "$APP_NAME.app"

echo "✅ 検証を実行中..."
xcrun stapler validate "$APP_NAME.app"

echo "🎉 公証化が完了しました！"
```

## 検証と確認

### 公証ステープルの確認

#### 基本的な確認

```bash
# 公証ステープルの確認
xcrun stapler validate YourApp.app
```

#### 詳細な確認

```bash
# 詳細な情報を表示
xcrun stapler validate -v YourApp.app
```

#### 公証チケットの内容確認

```bash
# 公証チケットの詳細情報
spctl -a -v YourApp.app
```

### 署名の確認

```bash
# 署名の詳細確認
codesign --verify --deep --verbose=2 YourApp.app

# 署名情報の表示
codesign -dv --verbose=4 YourApp.app
```

### Gatekeeper の確認

```bash
# Gatekeeperの検証
spctl --assess --verbose YourApp.app
```

## ベストプラクティス

### 1. 自動化の実装

- ビルドプロセスに公証化を組み込む
- CI/CD パイプラインでの自動実行
- エラーハンドリングの実装

### 2. モニタリング

- 公証化の成功/失敗の監視
- 公証ステープルの状態確認
- ユーザーフィードバックの収集

### 3. ドキュメント化

- 公証化プロセスの記録
- トラブルシューティングガイドの作成
- チーム内での知識共有

## まとめ

公証化と公証ステープルは、macOS アプリケーションの配布において重要なセキュリティ機能です。適切に実装することで、ユーザー体験の向上とセキュリティの確保を両立できます。

### 重要なポイント

1. **公証化は必須**: Developer ID で署名されたアプリケーションは公証化が必要
2. **ステープルが重要**: 公証ステープルによりオフライン検証が可能
3. **自動化が推奨**: 手動プロセスはエラーの原因となる
4. **継続的な監視**: 公証化の状態を定期的に確認する

### 参考リンク

- [Apple Developer Documentation - Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Apple Developer Documentation - Code Signing](https://developer.apple.com/documentation/security/code_signing_services)
- [Apple Developer Documentation - Gatekeeper](https://developer.apple.com/documentation/security/gatekeeper)

---

**最終更新**: 2025 年 9 月 10 日
**作成者**: Bokuchi Development Team
**バージョン**: 1.0
