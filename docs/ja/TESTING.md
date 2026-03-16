# テストガイド

このドキュメントでは、テストのアーキテクチャ、テストの実行方法、およびテストファイルの配置場所について説明します。

## テスト階層

プロジェクトには3つの階層のテストがあります。日常の開発では Tier 1 と Tier 2 のみ必要です。

| 階層 | スコープ | ツール | ビルド要否 |
|------|----------|--------|-----------|
| 1 | Rust ユニットテスト | `cargo test` | 不要 |
| 2 | TypeScript ユニット / 結合テスト | Vitest + React Testing Library | 不要 |
| 3 | E2E テスト | (停止中) | 必要 |

## テストの実行

### 全テスト (Tier 1 + 2)

```bash
npm run test:all
```

Rust ユニットテスト (`cargo test`) に続いて、TypeScript ユニット + 結合テスト (Vitest) を実行します。

### TypeScript テスト

```bash
npm run test:unit          # 単発実行
npm run test:unit:watch    # ウォッチモード (ファイル変更時に自動再実行)
npm run test:unit:coverage # カバレッジレポート付き (coverage/ に出力)
```

### Rust テスト

```bash
npm run test:rust          # 通常実行
npm run test:rust:verbose  # 詳細出力付き
```

> **注意:** グローバル状態 (`FRONTEND_READY`, `PENDING_FILE_PATHS`) を操作する Rust テストはシングルスレッドで実行する必要があります。npm スクリプトでは `--test-threads=1` が自動的に渡されます。

## テストファイルの配置

| カテゴリ | パス | テスト数 (概算) |
|----------|------|----------------|
| Rust ユニットテスト | `src-tauri/src/tests.rs` | 59 |
| TS ユーティリティテスト | `src/utils/__tests__/*.test.ts` | 167 |
| TS API テスト | `src/api/__tests__/*.test.ts` | 173 |
| TS リデューサーテスト | `src/reducers/__tests__/*.test.ts` | 20 |
| TS コンポーネントテスト | `src/components/__tests__/*.test.tsx` | 173 |
| TS フックテスト | `src/hooks/__tests__/*.test.ts(x)` | 80 |
| TS テーマテスト | `src/themes/__tests__/*.test.ts` | 14 |
| TS 結合テスト | `src/__tests__/integration/*.test.tsx` | 37 |

## CI

ユニットテストは `main` ブランチを対象とするすべてのプルリクエストで自動的に実行されます。設定については [`.github/workflows/unit-tests.yml`](../.github/workflows/unit-tests.yml) を参照してください。

2つのジョブが並列で実行されます:

- **TypeScript (Vitest)** — `npm run test:unit`
- **Rust (cargo test)** — `cargo test --verbose -- --test-threads=1`

同じ PR に新しいプッシュが行われた場合、前回の CI 実行は自動的にキャンセルされます。

## E2E テスト (停止中)

E2E テストのコードは `tests/e2e/` と `wdio.conf.ts` に存在しますが、現在**実行不可**の状態です。`tauri-driver` (Tauri アプリ用の WebDriver プロキシ) は Linux (WebKitGTK) のみ対応しており、Tauri v2 との互換性にも懸念があります。npm スクリプトと wdio の依存関係は削除済みです。

UI ロジックとコンポーネントの相互作用に関するテストカバレッジは、代わりに Tier 1 & 2 (Vitest + RTL) で対応しています。
