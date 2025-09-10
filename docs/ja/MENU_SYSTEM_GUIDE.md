# Tauri アプリケーションでのシステムメニュー実装ガイド

## 概要

このドキュメントでは、Tauri アプリケーションでシステムメニュー（macOS のメニューバー）を実装する際の重要な注意点とベストプラクティスについて説明します。特に、メニューイベントの重複登録防止、デバウンス処理、プラットフォーム固有の実装など、実装者が陥りがちな問題とその解決策を詳しく解説します。

## 目次

1. [システムメニューの基本構造](#システムメニューの基本構造)
2. [重要な実装上の注意点](#重要な実装上の注意点)
3. [デバウンス処理の実装](#デバウンス処理の実装)
4. [重複登録の防止](#重複登録の防止)
5. [プラットフォーム固有の考慮事項](#プラットフォーム固有の考慮事項)
6. [トラブルシューティング](#トラブルシューティング)
7. [ベストプラクティス](#ベストプラクティス)

## システムメニューの基本構造

### バックエンド（Rust）側の実装

```rust
// 1. 既定メニューを生成
let menu = Menu::default(&app.handle())?;

// 2. 既存のサブメニューを探して項目を追加
for item in menu.items()? {
    if let MenuItemKind::Submenu(file_sm) = item {
        let text = file_sm.text()?;
        if text == "File" || text == "ファイル" {
            // カスタムメニュー項目を追加
            let save = MenuItem::with_id(
                app, "save", "Save",
                true, Some("CmdOrCtrl+S")
            )?;
            file_sm.insert(&save, 1)?;
        }
    }
}

// 3. アプリメニューとして反映
app.set_menu(menu)?;

// 4. イベントハンドラーの設定
app.on_menu_event(|app, ev| {
    match ev.id().0.as_str() {
        "save" => {
            let result = app.emit("menu-save", ());
        }
        _ => {}
    }
});
```

### フロントエンド（TypeScript/React）側の実装

```typescript
useEffect(() => {
  // 重複登録防止のためのグローバルフラグ
  if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
    return;
  }

  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    true;

  const setupMenuListeners = async () => {
    const { listen } = await import("@tauri-apps/api/event");

    // デバウンス処理用のグローバル変数
    const globalDebounce = window as unknown as {
      lastMenuEventTime?: number;
      DEBOUNCE_DELAY: number;
    };

    if (!globalDebounce.lastMenuEventTime) {
      globalDebounce.lastMenuEventTime = 0;
    }
    globalDebounce.DEBOUNCE_DELAY = 100;

    const unlisten = await listen("menu-save", () => {
      const now = Date.now();
      const timeDiff = now - globalDebounce.lastMenuEventTime!;

      if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
        return; // デバウンス
      }

      globalDebounce.lastMenuEventTime = now;
      handleSaveFile();
    });

    return unlisten;
  };

  setupMenuListeners();
}, []);
```

## 重要な実装上の注意点

### 1. プラットフォーム固有の実装

- **macOS のみ**: システムメニューは macOS でのみ利用可能
- **条件コンパイル**: `#[cfg(target_os = "macos")]` を使用してプラットフォーム固有のコードを分離
- **多言語対応**: メニューテキストは "File" と "ファイル" の両方をチェック

### 2. メニュー項目の挿入位置

```rust
// 位置を指定してメニュー項目を挿入
file_sm.insert(&save, 1)?;        // 位置1に挿入
file_sm.insert(&new_file, 2)?;    // 位置2に挿入
file_sm.insert(&open_file, 3)?;   // 位置3に挿入
```

### 3. ショートカットキーの設定

```rust
let save = MenuItem::with_id(
    app, "save", "Save",
    true, Some("CmdOrCtrl+S")  // ショートカットキーを指定
)?;
```

## デバウンス処理の実装

### 問題点

メニューイベントは短時間に複数回発火する可能性があり、これにより以下の問題が発生します：

1. **重複実行**: 同じアクションが複数回実行される
2. **パフォーマンス問題**: 不要な処理の重複実行
3. **UI の不整合**: 予期しない動作やエラー

### 解決策

```typescript
// グローバルなデバウンス変数
const globalDebounce = window as unknown as {
  lastMenuEventTime?: number;
  DEBOUNCE_DELAY: number;
};

// デバウンス処理
const now = Date.now();
const timeDiff = now - globalDebounce.lastMenuEventTime!;

if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
  console.log(`Event debounced (time diff: ${timeDiff}ms)`);
  return;
}

globalDebounce.lastMenuEventTime = now;
// 実際の処理を実行
```

### デバウンス時間の設定

- **推奨値**: 100ms
- **調整のポイント**:
  - 短すぎる: デバウンスが効かない
  - 長すぎる: ユーザー体験が悪化

## 重複登録の防止

### 問題点

React の Strict Mode や開発環境でのホットリロードにより、イベントリスナーが重複登録される可能性があります。

### 解決策

```typescript
// グローバルフラグによる重複登録防止
if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
  console.log("Menu listeners already set up, skipping...");
  return;
}

(window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
  true;

// クリーンアップ時にフラグをリセット
return () => {
  if (unlisten) unlisten();
  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    false;
};
```

## プラットフォーム固有の考慮事項

### macOS での注意点

1. **メニューの言語**: システム言語に応じて "File" または "ファイル" をチェック
2. **ショートカットキー**: `CmdOrCtrl+S` で macOS では `Cmd+S` になる
3. **メニューの順序**: macOS の標準的なメニュー順序に従う

### クロスプラットフォーム対応

```rust
#[cfg(target_os = "macos")]
{
    // macOS 固有のメニュー実装
}

#[cfg(not(target_os = "macos"))]
{
    // 他のプラットフォームでの代替実装
    println!("Menu system is only available on macOS");
}
```

## トラブルシューティング

### よくある問題と解決策

#### 1. メニューイベントが発火しない

**症状**: メニューをクリックしても何も起こらない

**原因**: イベントリスナーが正しく登録されていない

**診断手順**:

```bash
# バックエンドのログを確認
# 以下のようなログが出力されるはず
[1234567890] Menu event received: save (thread: ThreadId(1))
[1234567890] Save menu item clicked - calling frontend function
[1234567890] Emit result: Ok(())
```

**解決策**:

- バックエンドでの `app.emit()` の呼び出しを確認
- フロントエンドでの `listen()` の呼び出しを確認
- コンソールログでイベントの流れを追跡

**デバッグコード**:

```typescript
// フロントエンドでのデバッグ
const unlisten = await listen("menu-save", (event) => {
  console.log("Menu event received:", event);
  console.log("Event payload:", event.payload);
  handleSaveFile();
});
```

#### 2. 重複実行が発生する

**症状**: メニューを 1 回クリックしたのに、処理が複数回実行される

**原因**: デバウンス処理が不十分

**診断手順**:

```typescript
// デバウンス処理のログを確認
console.log(`[${now}] Menu Save event received (time diff: ${timeDiff}ms)`);
if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
  console.log(`[${now}] Menu Save event debounced`);
  return;
}
```

**解決策**:

- デバウンス時間を調整（100ms → 200ms）
- グローバル変数の初期化を確認
- 重複登録の防止フラグを確認

**修正例**:

```typescript
// デバウンス時間を調整
globalDebounce.DEBOUNCE_DELAY = 200; // 100ms → 200ms

// グローバル変数の初期化を確実にする
if (!globalDebounce.lastMenuEventTime) {
  globalDebounce.lastMenuEventTime = 0;
}
```

#### 3. メニュー項目が表示されない

**症状**: カスタムメニュー項目が表示されない

**原因**: メニューの挿入位置やテキストの不一致

**診断手順**:

```rust
// バックエンドでのデバッグログ
for item in menu.items()? {
    if let MenuItemKind::Submenu(file_sm) = item {
        let text = file_sm.text()?;
        println!("Found submenu: {}", text); // このログを確認

        if text == "File" || text == "ファイル" {
            println!("Found File menu, adding custom items...");
            // メニュー項目の追加処理
        }
    }
}
```

**解決策**:

- サブメニューのテキストを確認（"File" vs "ファイル"）
- 挿入位置のインデックスを確認
- メニューの構造を確認

**修正例**:

```rust
// より柔軟なテキストマッチング
if text.to_lowercase().contains("file") || text.contains("ファイル") {
    println!("Found File menu, adding custom items...");
    // メニュー項目の追加処理
}
```

#### 4. キーボードショートカットが競合する

**症状**: メニューとキーボードショートカットの両方が発火する

**原因**: イベントの優先順位が適切に設定されていない

**診断手順**:

```typescript
// キーボードイベントのログを確認
const handleKeyDown = useCallback(
  (event: KeyboardEvent) => {
    console.log(
      "Key pressed:",
      event.key,
      "metaKey:",
      event.metaKey,
      "ctrlKey:",
      event.ctrlKey
    );

    if ((event.metaKey || event.ctrlKey) && event.key === "S") {
      console.log("Save shortcut triggered");
      event.preventDefault();
      handleSaveFile();
    }
  },
  [handleSaveFile]
);
```

**解決策**:

- イベントの優先順位を調整
- `preventDefault()` の呼び出しを確認
- キャプチャフェーズでのイベント処理

**修正例**:

```typescript
// キャプチャフェーズでイベントを処理
window.addEventListener("keydown", handleKeyDown, true);

// イベントの伝播を停止
if ((event.metaKey || event.ctrlKey) && event.key === "S") {
  event.preventDefault();
  event.stopPropagation();
  handleSaveFile();
}
```

#### 5. React Strict Mode での重複実行

**症状**: 開発環境でメニューイベントが 2 回実行される

**原因**: React Strict Mode による useEffect の重複実行

**診断手順**:

```typescript
// 重複登録の防止フラグを確認
if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
  console.log("Menu listeners already set up, skipping...");
  return;
}
```

**解決策**:

- グローバルフラグによる重複登録防止
- 適切なクリーンアップ処理

**修正例**:

```typescript
useEffect(() => {
  // 重複登録防止
  if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
    return;
  }

  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    true;

  // リスナー設定...

  return () => {
    // クリーンアップ
    (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
      false;
  };
}, []); // 依存配列を空にする
```

### デバッグ用のログ設定

#### バックエンド（Rust）でのログ

```rust
// 詳細なログ出力
app.on_menu_event(|app, ev| {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    println!("[{}] Menu event received: {} (thread: {:?})",
        timestamp, ev.id().0, std::thread::current().id());

    match ev.id().0.as_str() {
        "save" => {
            println!("[{}] Save menu item clicked", timestamp);
            let result = app.emit("menu-save", ());
            println!("[{}] Emit result: {:?}", timestamp, result);
        }
        _ => {
            println!("[{}] Unknown menu item: {}", timestamp, ev.id().0);
        }
    }
});
```

#### フロントエンド（TypeScript）でのログ

```typescript
// デバウンス処理のログ
const unlisten = await listen("menu-save", () => {
  const now = Date.now();
  const timeDiff = now - globalDebounce.lastMenuEventTime!;

  console.log(`[${now}] Menu Save event received (time diff: ${timeDiff}ms)`);

  if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
    console.log(`[${now}] Menu Save event debounced`);
    return;
  }

  globalDebounce.lastMenuEventTime = now;
  console.log(`[${now}] Executing Menu Save event`);
  handleSaveFile();
});
```

### パフォーマンス監視

#### メニューイベントの応答時間測定

```typescript
// パフォーマンス測定
const unlisten = await listen("menu-save", () => {
  const startTime = performance.now();

  handleSaveFile().then(() => {
    const endTime = performance.now();
    console.log(`Menu save operation took ${endTime - startTime} milliseconds`);
  });
});
```

#### メモリ使用量の監視

```typescript
// メモリリークの監視
const checkMemoryUsage = () => {
  if (performance.memory) {
    console.log("Memory usage:", {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + " MB",
      total:
        Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + " MB",
      limit:
        Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + " MB",
    });
  }
};

// 定期的にメモリ使用量をチェック
setInterval(checkMemoryUsage, 30000); // 30秒ごと
```

## キーボードショートカットとの競合回避

### 問題点

システムメニューとフロントエンドのキーボードショートカットが重複すると、以下の問題が発生します：

1. **二重実行**: メニューとキーボードショートカットの両方が発火
2. **予期しない動作**: デバウンス処理が正しく機能しない
3. **ユーザー体験の悪化**: 操作が重複して実行される

### 解決策

#### 1. メニューとキーボードショートカットの統一

```rust
// バックエンド: メニュー項目にショートカットを設定
let save = MenuItem::with_id(
    app, "save", "Save",
    true, Some("CmdOrCtrl+S")  // フロントエンドと同じショートカット
)?;
```

```typescript
// フロントエンド: キーボードショートカットの処理
const handleKeyDown = useCallback(
  (event: KeyboardEvent) => {
    // Command + S: Save
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "S" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSaveFile(); // メニューと同じ処理
    }
  },
  [handleSaveFile]
);
```

#### 2. イベントの優先順位制御

```typescript
// キャプチャフェーズでイベントを処理（優先度を上げる）
window.addEventListener("keydown", handleKeyDown, true);
```

### プラットフォーム固有のショートカット対応

```typescript
// プラットフォーム別のショートカット表示
const formatKeyboardShortcut = (key: string, shift = false) => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifier = isMac ? "⌘" : "Ctrl";
  const shiftModifier = shift ? "⇧" : "";
  return `${modifier}${shiftModifier}${key}`;
};
```

## スレッド安全性とタイミング制御

### バックエンドでのタイムスタンプ管理

```rust
app.on_menu_event(|app, ev| {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    println!("[{}] Menu event received: {} (thread: {:?})",
        timestamp, ev.id().0, std::thread::current().id());

    // イベント発火
    let result = app.emit("menu-save", ());
    println!("[{}] Emit result: {:?}", timestamp, result);
});
```

### フロントエンドでの同期処理

```typescript
// グローバルなデバウンス変数（スレッドセーフ）
const globalDebounce = window as unknown as {
  lastMenuEventTime?: number;
  DEBOUNCE_DELAY: number;
};

// タイムスタンプベースのデバウンス
const now = Date.now();
const timeDiff = now - globalDebounce.lastMenuEventTime!;

if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
  console.log(`[${now}] Event debounced (time diff: ${timeDiff}ms)`);
  return;
}

globalDebounce.lastMenuEventTime = now;
console.log(`[${now}] Executing event`);
```

## 開発環境での特別な考慮事項

### React Strict Mode 対応

```typescript
// Strict Mode での重複実行を防ぐ
useEffect(() => {
  // グローバルフラグで重複登録を防ぐ
  if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
    console.log("Menu listeners already set up, skipping...");
    return;
  }

  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    true;

  // リスナー設定...

  return () => {
    // クリーンアップ時にフラグをリセット
    (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
      false;
  };
}, []); // 依存配列を空にして、一度だけ登録
```

### ホットリロード対応

```typescript
// 開発環境でのホットリロード時にリスナーを適切にクリーンアップ
const setupMenuListeners = async () => {
  // 既存のリスナーをクリーンアップ
  if (window.menuUnlisteners) {
    window.menuUnlisteners.forEach((unlisten) => unlisten());
  }

  // 新しいリスナーを設定
  const unlisteners = [];
  // ... リスナー設定 ...

  window.menuUnlisteners = unlisteners;
};
```

## パフォーマンス最適化

### 遅延インポートの活用

```typescript
const setupMenuListeners = async () => {
  // 必要な時だけ Tauri API をインポート
  const { listen } = await import("@tauri-apps/api/event");

  // リスナー設定...
};
```

### メモリリークの防止

```typescript
// 適切なクリーンアップ
return () => {
  if (unlistenMenu) unlistenMenu();
  if (unlistenNewFile) unlistenNewFile();
  if (unlistenOpenFile) unlistenOpenFile();

  // グローバル変数のクリーンアップ
  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    false;
  delete (window as unknown as { lastMenuEventTime?: number })
    .lastMenuEventTime;
};
```

## ベストプラクティス

### 1. ログ出力の活用

```rust
println!("[{}] Menu event received: {} (thread: {:?})",
    timestamp, ev.id().0, std::thread::current().id());
```

```typescript
console.log(`[${now}] Menu Save event received (time diff: ${timeDiff}ms)`);
```

### 2. エラーハンドリング

```typescript
try {
  await openFile();
} catch (error) {
  console.error("Failed to open file from menu:", error);
}
```

### 3. 型安全性の確保

```typescript
(window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
  true;
```

### 4. クリーンアップの徹底

```typescript
return () => {
  if (unlistenMenu) unlistenMenu();
  if (unlistenNewFile) unlistenNewFile();
  if (unlistenOpenFile) unlistenOpenFile();
  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    false;
};
```

### 5. デバッグ情報の充実

```typescript
// 詳細なデバッグ情報を出力
console.log("🔍 Key Analysis:", {
  isZoomInKey,
  isZoomOutKey,
  isResetKey,
  key: event.key,
  code: event.code,
  shiftKey: event.shiftKey,
  semicolonWithShift: event.code === "Semicolon" && event.shiftKey,
});
```

### 6. プラットフォーム固有の処理

```rust
#[cfg(target_os = "macos")]
{
    // macOS 固有のメニュー実装
    println!("Setting up custom menu for macOS...");
}

#[cfg(not(target_os = "macos"))]
{
    println!("Menu system is only available on macOS");
}
```

---

_このドキュメントは Bokuchi プロジェクトの実装経験に基づいて作成されました。_
