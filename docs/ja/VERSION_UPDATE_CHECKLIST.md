# バージョンアップ時のチェックリスト

## 更新が必要なファイル

### 1. メインバージョンファイル

- [ ] `package.json` - `"version": "現在のバージョン"` を新しいバージョンに変更
- [ ] `package-lock.json` - 2 箇所の `"version": "現在のバージョン"` を新しいバージョンに変更
- [ ] `src-tauri/Cargo.toml` - `version = "現在のバージョン"` を新しいバージョンに変更
- [ ] `src-tauri/tauri.conf.json` - `"version": "現在のバージョン"` を新しいバージョンに変更

### 2. ビルドスクリプト

- [ ] `build/build-macos-signed.sh` - DMG ファイル名のバージョン部分を更新
- [ ] `build/build-macos-notarized.sh` - DMG ファイル名のバージョン部分を更新
- [ ] `build/build-macos.sh` - DMG ファイル名のバージョン部分を更新
- [ ] `build/build-windows.sh` - インストーラーファイル名のバージョン部分を更新

### 3. What's New ダイアログ

バージョン更新後の初回起動時に「What's New」モーダルが自動表示されます。

- [ ] `src/whatsNew.ts` - `version` を新バージョンに変更し、`changes` 配列を新リリースの内容に差し替え
- [ ] ロケールファイル (`src/locales/*.json`) - 全14言語の `whatsNew.changes` セクションを更新

#### `src/whatsNew.ts` の更新方法

変更するのは `version` と `changes` の2箇所だけです。

```ts
export const whatsNewContent: WhatsNewContent = {
  version: '0.7.0', // ← package.json のバージョンと一致させる
  changes: [
    {
      type: 'feature',           // 'feature' | 'fix' | 'improvement'
      titleKey: 'whatsNew.changes.katex.title',
      descriptionKey: 'whatsNew.changes.katex.description', // 省略可
    },
    // 必要に応じて追加
  ],
};
```

#### ロケールファイルの更新方法

`src/locales/` 配下の各ロケールファイルで、`whatsNew.changes` の中身だけを差し替えます。`title`、`gotIt`、`type` の翻訳は固定なので変更不要です。

```json
"whatsNew": {
  "title": "...",          // ← 変更不要
  "gotIt": "...",          // ← 変更不要
  "type": { ... },        // ← 変更不要
  "changes": {            // ← ここだけ毎リリース差し替え
    "katex": {
      "title": "数式レンダリング（KaTeX）",
      "description": "$...$ や $$...$$ 構文で数式を表示できるようになりました。"
    }
  }
}
```

> **注意:** `changes` 内のキー（例: `katex`）は `src/whatsNew.ts` で参照するキー（`whatsNew.changes.katex.title`）と一致させてください。

### 4. その他の可能性のあるファイル

- [ ] `README.md` - バージョン情報が記載されている場合は更新
- [ ] `CHANGELOG.md` - 新バージョン用に更新:
  1. `[Unreleased]` の見出しを `[X.Y.Z] - YYYY-MM-DD` に変更（新バージョンと日付）
  2. 先頭に空の `## [Unreleased]` セクションを追加（今後の変更用）
  3. 末尾の比較リンクを更新: `[Unreleased]` → `vX.Y.Z...HEAD`、`[X.Y.Z]` → `v前バージョン...vX.Y.Z` を追加
- [ ] その他のドキュメントファイル

## 更新手順

1. 上記のファイルを順番に確認・更新
2. バージョン番号の一貫性を確認
3. ビルドテストを実行して問題がないことを確認
4. 必要に応じて `npm install` を実行して package-lock.json を再生成

## 注意事項

- `package-lock.json`は自動生成されるファイルですが、バージョン情報は手動で更新が必要
- `src-tauri/Cargo.lock`は自動生成されるため、手動更新は不要
- ビルドスクリプトのファイル名は実際のビルド成果物のファイル名と一致させる必要がある

---

**最終更新日**: 2026年3月17日
**バージョン**: 1.2
