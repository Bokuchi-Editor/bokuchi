# System Menu Implementation Guide for Tauri Applications

## Overview

This document explains important considerations and best practices when implementing system menus (macOS menu bar) in Tauri applications. It provides detailed explanations of common issues that developers encounter and their solutions, including preventing duplicate event registration, debounce processing, and platform-specific implementations.

## Table of Contents

1. [Basic System Menu Structure](#basic-system-menu-structure)
2. [Important Implementation Considerations](#important-implementation-considerations)
3. [Debounce Processing Implementation](#debounce-processing-implementation)
4. [Preventing Duplicate Registration](#preventing-duplicate-registration)
5. [Platform-Specific Considerations](#platform-specific-considerations)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Basic System Menu Structure

### Backend (Rust) Implementation

```rust
// 1. Generate default menu
let menu = Menu::default(&app.handle())?;

// 2. Find existing submenus and add items
for item in menu.items()? {
    if let MenuItemKind::Submenu(file_sm) = item {
        let text = file_sm.text()?;
        if text == "File" || text == "ファイル" {
            // Add custom menu items
            let save = MenuItem::with_id(
                app, "save", "Save",
                true, Some("CmdOrCtrl+S")
            )?;
            file_sm.insert(&save, 1)?;
        }
    }
}

// 3. Apply as app menu
app.set_menu(menu)?;

// 4. Set event handlers
app.on_menu_event(|app, ev| {
    match ev.id().0.as_str() {
        "save" => {
            let result = app.emit("menu-save", ());
        }
        _ => {}
    }
});
```

### Frontend (TypeScript) Implementation

```typescript
// Event listener setup
useEffect(() => {
  const setupMenuListeners = async () => {
    const unlistenSave = await listen("menu-save", () => {
      // Handle menu event
      handleSave();
    });

    return () => {
      unlistenSave();
    };
  };

  setupMenuListeners();
}, []);
```

## Important Implementation Considerations

### 1. Debounce Processing

**Problem**: Menu events can be triggered multiple times rapidly, causing duplicate operations.

**Solution**: Implement timestamp-based debounce processing.

```typescript
// Global debounce object
const globalDebounce = {
  lastMenuEventTime: 0,
  DEBOUNCE_DELAY: 100, // milliseconds
};

// In event listener
const unlistenSave = await listen("menu-save", () => {
  const now = Date.now();
  const timeDiff = now - globalDebounce.lastMenuEventTime;

  if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
    console.log("Menu event debounced");
    return;
  }

  globalDebounce.lastMenuEventTime = now;
  console.log("Executing menu event");
  handleSave();
});
```

### 2. Preventing Duplicate Registration

**Problem**: React Strict Mode or hot reloads can cause multiple event listeners to be registered.

**Solution**: Use a global flag to prevent duplicate registration.

```typescript
// Global flag to prevent duplicate registration
if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
  console.log("Menu listeners already set up, skipping...");
  return;
}

(window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
  true;
```

### 3. State Synchronization Issues

**Problem**: Event listeners capture stale state from their creation scope.

**Solution**: Use `useCallback` with proper dependencies.

```typescript
const handleSave = useCallback(async () => {
  // Always reference latest state
  if (activeTab) {
    await saveTab(activeTab.id);
  }
}, [activeTab, saveTab]); // Include all dependencies

// In useEffect
useEffect(() => {
  const setupListeners = async () => {
    const unlisten = await listen("menu-save", handleSave);
    return () => unlisten();
  };

  setupListeners();
}, [handleSave]); // Include function in dependencies
```

## Debounce Processing Implementation

### Timestamp-Based Debounce

```typescript
interface DebounceConfig {
  lastEventTime: number;
  delay: number;
}

const createDebounceHandler = (config: DebounceConfig, handler: () => void) => {
  return () => {
    const now = Date.now();
    const timeDiff = now - config.lastEventTime;

    if (timeDiff < config.delay) {
      console.log(`Event debounced (${timeDiff}ms < ${config.delay}ms)`);
      return;
    }

    config.lastEventTime = now;
    handler();
  };
};

// Usage
const debouncedSave = createDebounceHandler(
  { lastEventTime: 0, delay: 100 },
  () => handleSave()
);
```

### Advanced Debounce with Event Types

```typescript
interface MenuDebounce {
  [eventType: string]: {
    lastEventTime: number;
    delay: number;
  };
}

const menuDebounce: MenuDebounce = {
  save: { lastEventTime: 0, delay: 100 },
  open: { lastEventTime: 0, delay: 200 },
  new: { lastEventTime: 0, delay: 150 },
};

const createMenuHandler = (eventType: string, handler: () => void) => {
  return () => {
    const config = menuDebounce[eventType];
    const now = Date.now();
    const timeDiff = now - config.lastEventTime;

    if (timeDiff < config.delay) {
      console.log(`${eventType} event debounced`);
      return;
    }

    config.lastEventTime = now;
    handler();
  };
};
```

## Preventing Duplicate Registration

### Method 1: Global Flag

```typescript
// Global flag approach
const setupMenuListeners = async () => {
  if ((window as { menuListenersSetup?: boolean }).menuListenersSetup) {
    return;
  }

  (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
    true;

  const unlistenSave = await listen("menu-save", handleSave);

  return () => {
    unlistenSave();
    (window as unknown as { menuListenersSetup: boolean }).menuListenersSetup =
      false;
  };
};
```

### Method 2: Dependency Array Management

```typescript
// Proper dependency management
useEffect(() => {
  const setupListeners = async () => {
    const unlistenSave = await listen("menu-save", handleSave);
    const unlistenOpen = await listen("menu-open", handleOpen);

    return () => {
      unlistenSave();
      unlistenOpen();
    };
  };

  setupListeners();
}, [handleSave, handleOpen]); // Include all handlers in dependencies
```

### Method 3: Cleanup-First Approach

```typescript
useEffect(() => {
  let cleanup: (() => void) | undefined;

  const setupListeners = async () => {
    // Clean up existing listeners first
    if (cleanup) {
      cleanup();
    }

    const unlistenSave = await listen("menu-save", handleSave);

    cleanup = () => {
      unlistenSave();
    };
  };

  setupListeners();

  return () => {
    if (cleanup) {
      cleanup();
    }
  };
}, [handleSave]);
```

## Platform-Specific Considerations

### macOS

```rust
#[cfg(target_os = "macos")]
{
    // macOS-specific menu implementation
    let menu = Menu::default(&app.handle())?;

    // Add macOS-specific menu items
    let about = MenuItem::with_id(app, "about", "About Bokuchi", true, None::<&str>)?;
    menu.append(&about)?;
}
```

### Windows

```rust
#[cfg(target_os = "windows")]
{
    // Windows-specific menu implementation
    // Note: Windows doesn't have a global menu bar like macOS
    // Implement context menus or application menus instead
}
```

### Linux

```rust
#[cfg(target_os = "linux")]
{
    // Linux-specific menu implementation
    // Similar to Windows, implement application-specific menus
}
```

## Troubleshooting

### Common Issues

#### 1. Menu Events Not Triggering

**Symptoms**: Menu items are visible but clicking doesn't trigger events.

**Causes**:

- Event listeners not properly registered
- Incorrect event names
- Rust backend not emitting events

**Solutions**:

```typescript
// Check event registration
console.log('Setting up menu listeners...');

const unlisten = await listen('menu-save', (event) => {
    console.log('Menu save event received:', event);
    handleSave();
});

// Verify in Rust
app.on_menu_event(|app, ev| {
    println!("Menu event received: {}", ev.id().0);
    let result = app.emit("menu-save", ());
    println!("Emit result: {:?}", result);
});
```

#### 2. Duplicate Event Execution

**Symptoms**: Single menu click triggers multiple executions.

**Causes**:

- Multiple event listeners registered
- No debounce processing
- React Strict Mode causing double registration

**Solutions**:

```typescript
// Implement debounce
const debouncedHandler = debounce(handleSave, 100);

// Prevent duplicate registration
if (window.menuListenersSetup) return;
```

#### 3. Stale State in Event Handlers

**Symptoms**: Event handlers use outdated state values.

**Causes**:

- Event listeners capturing stale closures
- Missing dependencies in useCallback

**Solutions**:

```typescript
// Use useCallback with proper dependencies
const handleSave = useCallback(async () => {
  if (activeTab) {
    await saveTab(activeTab.id);
  }
}, [activeTab, saveTab]);

// Include in useEffect dependencies
useEffect(() => {
  setupListeners();
}, [handleSave]);
```

## Best Practices

### 1. Event Handler Design

```typescript
// Good: Proper error handling and logging
const handleSave = useCallback(async () => {
  try {
    if (!activeTab) {
      setSnackbar({
        open: true,
        message: "No active tab to save",
        severity: "error",
      });
      return;
    }

    const success = await saveTab(activeTab.id);
    if (success) {
      setSnackbar({
        open: true,
        message: "File saved successfully",
        severity: "success",
      });
    }
  } catch (error) {
    console.error("Save failed:", error);
    setSnackbar({
      open: true,
      message: "Save failed",
      severity: "error",
    });
  }
}, [activeTab, saveTab, setSnackbar]);
```

### 2. Menu Structure Organization

```rust
// Organize menu items logically
let file_menu = Submenu::new(app, "File")?;
file_menu.append(&new_item)?;
file_menu.append(&open_item)?;
file_menu.append(&save_item)?;
file_menu.append(&save_as_item)?;

let edit_menu = Submenu::new(app, "Edit")?;
edit_menu.append(&undo_item)?;
edit_menu.append(&redo_item)?;
edit_menu.append(&cut_item)?;
edit_menu.append(&copy_item)?;
edit_menu.append(&paste_item)?;
```

### 3. Keyboard Shortcuts

```rust
// Consistent keyboard shortcuts
let save_item = MenuItem::with_id(
    app, "save", "Save",
    true, Some("CmdOrCtrl+S")
)?;

let save_as_item = MenuItem::with_id(
    app, "save_as", "Save As",
    true, Some("CmdOrCtrl+Shift+S")
)?;

let new_item = MenuItem::with_id(
    app, "new", "New",
    true, Some("CmdOrCtrl+N")
)?;
```

### 4. Error Handling

```rust
// Robust error handling in Rust
app.on_menu_event(|app, ev| {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    match ev.id().0.as_str() {
        "save" => {
            println!("[{}] Save menu clicked", timestamp);
            match app.emit("menu-save", ()) {
                Ok(_) => println!("[{}] Save event emitted successfully", timestamp),
                Err(e) => eprintln!("[{}] Failed to emit save event: {:?}", timestamp, e),
            }
        }
        _ => {
            println!("[{}] Unknown menu item: {}", timestamp, ev.id().0);
        }
    }
});
```

### 5. Testing

```typescript
// Test menu event handling
describe("Menu System", () => {
  it("should handle save menu event", async () => {
    const mockSave = jest.fn();
    const { result } = renderHook(() => useMenuHandlers());

    // Simulate menu event
    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockSave).toHaveBeenCalled();
  });

  it("should debounce rapid menu events", async () => {
    const mockHandler = jest.fn();
    const debouncedHandler = debounce(mockHandler, 100);

    // Trigger multiple events rapidly
    debouncedHandler();
    debouncedHandler();
    debouncedHandler();

    // Wait for debounce delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
```

## Performance Considerations

### 1. Event Listener Cleanup

```typescript
// Always clean up event listeners
useEffect(() => {
  let cleanup: (() => void) | undefined;

  const setupListeners = async () => {
    const unlistenSave = await listen("menu-save", handleSave);
    const unlistenOpen = await listen("menu-open", handleOpen);

    cleanup = () => {
      unlistenSave();
      unlistenOpen();
    };
  };

  setupListeners();

  return () => {
    if (cleanup) {
      cleanup();
    }
  };
}, [handleSave, handleOpen]);
```

### 2. Memory Management

```typescript
// Avoid memory leaks with proper cleanup
const useMenuListeners = () => {
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  useEffect(() => {
    return () => {
      // Clean up all listeners
      listeners.forEach((cleanup) => cleanup());
    };
  }, [listeners]);

  const addListener = useCallback((cleanup: () => void) => {
    setListeners((prev) => [...prev, cleanup]);
  }, []);

  return { addListener };
};
```

## Conclusion

Implementing system menus in Tauri applications requires careful attention to event handling, state management, and platform-specific considerations. By following the patterns and best practices outlined in this guide, you can create robust and reliable menu systems that work consistently across different platforms and scenarios.

### Key Takeaways

1. **Always implement debounce processing** to prevent duplicate operations
2. **Use proper dependency management** in React hooks to avoid stale state
3. **Implement robust error handling** in both Rust and TypeScript
4. **Clean up event listeners** to prevent memory leaks
5. **Test thoroughly** with different scenarios and edge cases

---

**Last Updated**: September 10, 2025
**Version**: 1.0
