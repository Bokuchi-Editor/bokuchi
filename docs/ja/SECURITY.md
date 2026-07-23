# セキュリティ管理

## 概要

このプロジェクトでは、Tauriフレームワークの制約により、いくつかのセキュリティ警告を無視・許容しています。これらの警告は直接的なセキュリティリスクではありませんが、Tauriの更新により解決される可能性があるため、定期的な監視が必要です。

## 無視している警告

### Rust (Cargo) 側

#### 1. glib関連の警告 (RUSTSEC-2024-0429)

**問題**: glib 0.18.5 に unsoundness の問題が存在
**影響**: `glib::VariantStrIter` の `Iterator` と `DoubleEndedIterator` 実装
**現在の状況**: Tauri の依存関係により glib 0.20.0 への更新が不可能

**対応方針**:

- Dependabot で glib の更新を無視
- cargo audit で RUSTSEC-2024-0429 を明示的に無視
- Tauri が glib 0.20.0 をサポートするまで待機

**リスク評価**: 低リスク（アプリケーションの主要機能に直接影響しない）

#### 2. GTK3関連の警告 (RUSTSEC-2024-0411〜0420)

**影響**: `atk`, `atk-sys`, `gdk`, `gdk-sys`, `gdkwayland-sys`, `gdkx11`, `gdkx11-sys`, `gtk`, `gtk-sys`, `gtk3-macros`
**理由**: GTK3バインディングがメンテナンスされていない
**対応**: TauriのWebViewエンジン（wry）がGTK3に依存しているため、直接的な置き換えは不可能。CIではブロッキングしない警告として許容。

#### 3. その他の非メンテナンス依存関係

以下のライブラリは非メンテナンス状態ですが、Tauri の依存関係のため直接制御できません。CIではブロッキングしない警告として許容しています。

- **fxhash** (RUSTSEC-2025-0057): `selectors`経由で使用
- **proc-macro-error** (RUSTSEC-2024-0370): `gtk3-macros`経由で使用

### npm 側

#### 解決済み: dompurify `CUSTOM_ELEMENT_HANDLING` バイパス (GHSA-c2j3-45gr-mqc4)

dompurify 3.4.12 で解決済み（2026-07-24）。修正は **`package.json` の直接依存 `dompurify` + `overrides` エントリ**を通じて適用され、monaco-editor / mermaid にも修正版が強制される。

**落とし穴 — dompurify の advisory に `npm audit fix --force` を使わないこと**: monaco-editor は古い dompurify を完全固定で宣言しており、`npm audit fix` は **`overrides` を考慮せずに**修正を計算する。そのため直接依存の `dompurify` を上げれば十分な場合でも、monaco-editor を 0.53.0 へダウングレードする（破壊的変更）解を提案してくる。正しい修正は `npm update dompurify`（または直接依存のバージョンアップ）。

#### 解決済み: dompurify XSS 脆弱性 (GHSA-v2wj-7wpq-c8vv)

dompurify 3.4.11（> 3.3.1）で解決済み。CI の許可リスト登録は削除済み。

## 現在の依存関係バージョン

| 依存関係 | バージョン | 備考 |
|---|---|---|
| Tauri | 2.11.5 | コアフレームワーク |
| wry | 0.55.1 | WebViewエンジン（LinuxではGTK3に依存） |
| glib | 0.18.5 | Tauriの制約により更新不可 |
| gtk | 0.18.2 | GTK3バインディング（非メンテナンス） |
| dompurify | 3.4.12（直接依存 + `overrides`） | `overrides` により monaco-editor / mermaid にも強制適用 |

## CIワークフロー

### 1. セキュリティ監査 (`security-audit.yml`)

- **スケジュール**: 毎週月曜日 9:00 (JST)
- **トリガー**: 週次スケジュール、mainへのプルリクエスト、手動実行
- **内容**:
  - `audit-ci --moderate` による npm audit（許可リストなし。low 深刻度は閾値未満。現在既知の脆弱性は 0 件）
  - `cargo audit`（RUSTSEC-2024-0429 を明示的に無視、他の警告はブロッキングしない）
  - Rust テスト
  - npm と Cargo の両方で古いパッケージのチェック

### 2. Dependabot (`dependabot.yml`)

- **スケジュール**: 毎週月曜日 9:00 (JST)
- **対象エコシステム**: npm、Cargo、GitHub Actions
- **サプライチェーン対策**: 全エコシステムに 3 日間のクールダウン（公開から 3 日以上経過したリリースのみ更新対象とし、公開直後に取り下げられる悪意あるリリースの取り込みを回避）
- **無視ルール**:
  - 全パッケージのメジャーバージョンアップ（手動確認が必要）
  - Tauri および Tauri プラグインのメジャーバージョンアップ（慎重に更新）
  - glib の全更新（Tauriの制約によりブロック）
  - KaTeX のマイナー/メジャー更新（0.16 系に固定 — 0.17.0 でアクセントコマンド × `\mathbf` がクラッシュ、issue #354 参照）

### 3. Dependabot テスト (`dependabot-test.yml`)

- **トリガー**: Dependabot からのプルリクエスト
- **内容**: Lint、型チェック、Rustテスト、ビルドテスト、セキュリティ監査
- **結果**: PRに合格/不合格のコメントを自動投稿

### 4. Dependabot 自動マージ (`auto-merge-dependabot.yml`)

- **対象**: パッチバージョンの更新のみ
- **動作**: パッチレベルの更新を含む Dependabot PR に対して自動マージ（squash）を有効化

### 5. Tauri 更新モニター (`tauri-update-monitor.yml`)

- **スケジュール**: 毎週火曜日 10:00 (JST)
- **内容**:
  - `cargo outdated` で Tauri の更新を確認
  - glib の互換性をチェック
  - 更新がある場合は GitHub Issue を自動作成

## 対応方針

### 定期的な確認

- 月1回程度、これらの警告の状況を確認
- 新しいTauriバージョンがリリースされた際に警告の状況を確認

### 将来的な対応

- Tauriが新しいバージョンでこれらの依存関係を更新した場合、対応を検討
- 将来的にTauriがGTK4や他のUIライブラリに移行した場合、対応を検討
- monaco-editor / mermaid が自ら修正済み dompurify の範囲を宣言したら、`dompurify` の override を削除

## 技術的詳細

### cargo audit コマンド（CI）

```bash
cargo audit --ignore RUSTSEC-2024-0429
```

その他の警告（GTK3、fxhash、proc-macro-error）はCIでブロッキングしない警告として許容しています。

### npm audit コマンド（CI）

```bash
npx audit-ci --moderate
```

low 深刻度の advisory は `--moderate` の閾値未満のため、CIをブロックしません。

### Dependabot 無視設定（glib）

```yaml
- dependency-name: "glib"
  update-types: ["version-update:semver-major", "version-update:semver-minor", "version-update:semver-patch"]
```

## 注意事項

これらの警告は**メンテナンスされていない**または**unsoundness**に関するものであり、直接的なセキュリティリスクではありません。ただし、Tauriの更新により解決される可能性があるため、定期的な確認が必要です。

## 更新履歴

- 2025-09-10: セキュリティドキュメントを統合・整理
- 2025-09-10: glib の unsoundness 警告を無視する設定を追加
- 2025-09-10: GTK3関連の警告を無視する設定を追加
- 2026-03-06: 現在のCI設定と依存関係バージョンに合わせて更新
- 2026-03-06: npm の dompurify 脆弱性 (GHSA-v2wj-7wpq-c8vv) を追加
- 2026-03-06: CIワークフロー詳細と Dependabot 自動マージの説明を追加
- 2026-07-23: GHSA-v2wj-7wpq-c8vv を解決済みに変更（dompurify 3.4.11、CI許可リスト削除）、GHSA-c2j3-45gr-mqc4（low、非ブロッキング）を追加、依存関係バージョンを更新（Tauri 2.11.5、wry 0.55.1）、Dependabot のクールダウンと KaTeX 固定を記載
- 2026-07-24: dompurify 3.4.12 への更新で GHSA-c2j3-45gr-mqc4 を解決。`npm audit fix --force` の落とし穴（audit が `overrides` を無視するため monaco-editor の破壊的ダウングレードを提案する）を記載

---

**最終更新日**: 2026年7月24日
**バージョン**: 2.2
