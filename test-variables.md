<!-- @var title: テストドキュメント -->
<!-- @var author: テストユーザー -->
<!-- @var date: 2024-01-15 -->

# {{title}}

このドキュメントは変数機能のテスト用です。

## 基本情報

- **作成者**: {{author}}
- **作成日**: {{date}}
- **バージョン**: {{version}}
- **会社**: {{company}}

## 変数の使用例

### 1. ファイル内変数
ファイル内で定義された変数（title, author, date）は優先的に使用されます。

### 2. グローバル変数
グローバル変数（version, company）は設定画面で管理されます。

### 3. 未定義の変数
未定義の変数（{{undefined_variable}}）はそのまま表示されます。

## コード例

```javascript
// 変数を使用したテンプレート例
const template = `
# {{title}}
作成者: {{author}}
日付: {{date}}
`;

console.log(template);
```

## まとめ

変数機能により、動的なコンテンツの生成が可能になりました。
