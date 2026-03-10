# Bokuchi Test Strategy

This document defines the comprehensive test strategy for the Bokuchi Markdown editor. It covers the testing infrastructure, all planned test cases (Rust Unit, TypeScript Unit, E2E), and an implementation roadmap.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Testing Infrastructure Setup](#2-testing-infrastructure-setup)
3. [Rust Unit Test Cases](#3-rust-unit-test-cases)
4. [TypeScript Unit Test Cases](#4-typescript-unit-test-cases)
5. [E2E / Integration Test Cases](#5-e2e--integration-test-cases)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Current State

| Area | Status |
|------|--------|
| Rust unit tests | 24 tests in `src-tauri/src/tests.rs` (VariableProcessor, types, commands) |
| TypeScript unit tests | None. No test framework installed. |
| E2E tests | None. |
| Frontend test framework | Not configured (no Vitest / Jest) |
| CI test execution | `npm run test` runs `cargo test` only |

### Coverage Gaps

- **Rust**: File I/O commands (`read_file`, `save_file`, `read_directory`), `file_operations.rs`, `file_association.rs` have zero test coverage.
- **TypeScript**: All utility functions, reducers, hooks, and components are untested.
- **E2E**: No integration or end-to-end tests exist.

---

## 2. Testing Infrastructure Setup

### 2.1 TypeScript: Vitest + React Testing Library

#### Why Vitest

- Native integration with the existing Vite build toolchain (`vite.config.ts`)
- Compatible API with Jest (easy migration path)
- Built-in support for `jsdom` environment (required for `DOMParser` in `htmlTableToMarkdown`)
- Fast execution with Vite's transform pipeline

#### Packages to Install

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

#### Configuration: `vitest.config.ts`

Create a separate config file at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**', 'src/locales/**'],
    },
  },
});
```

#### Test Setup File: `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
```

#### Tauri API Mock Strategy

Tauri APIs are not available outside the Tauri runtime. All modules under `@tauri-apps/*` must be mocked.

Create mock files:

- `src/__mocks__/@tauri-apps/api/core.ts` -- mock `invoke()`
- `src/__mocks__/@tauri-apps/api/event.ts` -- mock `listen()`, `emit()`
- `src/__mocks__/@tauri-apps/api/window.ts` -- mock `getCurrentWindow()`
- `src/__mocks__/@tauri-apps/plugin-store.ts` -- mock `Store`
- `src/__mocks__/@tauri-apps/plugin-dialog.ts` -- mock `open()`, `save()`
- `src/__mocks__/@tauri-apps/plugin-fs.ts` -- mock `readFile()`, `writeFile()`
- `src/__mocks__/@tauri-apps/plugin-opener.ts` -- mock `openUrl()`
- `src/__mocks__/@tauri-apps/plugin-clipboard-manager.ts` -- mock clipboard
- `src/__mocks__/@tauri-apps/plugin-updater.ts` -- mock updater
- `src/__mocks__/@tauri-apps/plugin-process.ts` -- mock `relaunch()`

Example mock for `invoke`:

```typescript
// src/__mocks__/@tauri-apps/api/core.ts
import { vi } from 'vitest';

export const invoke = vi.fn();
```

In tests, control the mock return values:

```typescript
import { invoke } from '@tauri-apps/api/core';
vi.mocked(invoke).mockResolvedValue('mocked result');
```

#### package.json Scripts

Add the following scripts:

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:rust": "cd src-tauri && cargo test",
    "test:rust:verbose": "cd src-tauri && cargo test --verbose",
    "test:all": "npm run test:rust && npm run test:unit"
  }
}
```

### 2.2 Rust: cargo test + tempfile

#### dev-dependencies to Add

In `src-tauri/Cargo.toml`:

```toml
[dev-dependencies]
tempfile = "3"
```

This enables creating temporary files and directories for testing file I/O commands without polluting the real filesystem.

#### Test Structure

Continue using `src-tauri/src/tests.rs` with `#[cfg(test)] mod tests;` in `lib.rs`. New test modules can be added as the file grows:

```
src-tauri/src/
├── tests.rs                    # Existing tests (extend here)
├── tests/                      # Optional: split into submodules
│   ├── variable_processor_tests.rs
│   ├── file_operations_tests.rs
│   ├── commands_tests.rs
│   └── file_association_tests.rs
```

### 2.3 E2E: Two-Tier Approach

#### Tier 1: Component Integration Tests (Vitest + RTL)

These are technically unit/integration tests but test complete user flows with mocked Tauri APIs. They live alongside other TypeScript tests in `src/**/*.test.tsx`.

No additional infrastructure needed beyond Section 2.1.

#### Tier 2: Tauri WebDriver Tests (tauri-driver + WebDriverIO)

For native OS interactions that cannot be mocked:

```bash
# Install tauri-driver (requires WebDriver-compatible browser driver)
cargo install tauri-driver

# Install WebDriverIO
npm install -D @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter
```

Configuration: `wdio.conf.ts`

```typescript
export const config = {
  runner: 'local',
  specs: ['./tests/e2e/**/*.spec.ts'],
  capabilities: [{
    'tauri:options': {
      application: './src-tauri/target/release/bokuchi',
    },
  }],
  framework: 'mocha',
  reporters: ['spec'],
};
```

**Prerequisites**: The app must be built (`npm run tauri build`) before running Tier 2 tests.

### 2.4 CI Integration Notes

```yaml
# GitHub Actions example
jobs:
  test-rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd src-tauri && cargo test

  test-typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit

  # Tier 2 E2E (optional, runs on release branches only)
  test-e2e:
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run tauri build
      - run: cargo install tauri-driver
      - run: npx wdio run wdio.conf.ts
```

---

## 3. Rust Unit Test Cases

### 3.1 variable_processor.rs

#### Existing Tests (10 tests)

| ID | Test Name | Description |
|----|-----------|-------------|
| R-VP-01 | `test_variable_processor_new` | `VariableProcessor::new()` creates empty instance |
| R-VP-02 | `test_set_and_get_global_variable` | Set and retrieve a global variable |
| R-VP-03 | `test_get_all_global_variables` | Retrieve all global variables |
| R-VP-04 | `test_parse_variables_from_markdown` | Parse `<!-- @var -->` comments |
| R-VP-05 | `test_parse_variables_from_markdown_no_variables` | Content without variables remains unchanged |
| R-VP-06 | `test_process_variables` | Expand `{{var}}` with local and global |
| R-VP-07 | `test_process_variables_priority` | Local variables override global |
| R-VP-08 | `test_process_variables_undefined_variable` | Undefined `{{var}}` remains as-is |
| R-VP-09 | `test_load_variables_from_yaml` | Load variables from YAML string |
| R-VP-10 | `test_export_variables_to_yaml` | Export variables to YAML string |

#### New Test Cases

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-VP-11 | `test_empty_variable_name` | Set a variable with empty name -- should store without error | P2 |
| R-VP-12 | `test_special_chars_in_value` | Value containing `{{`, `}}`, `<!-- -->`, newlines | P1 |
| R-VP-13 | `test_duplicate_variable_override` | Setting the same variable name twice overwrites the first | P1 |
| R-VP-14 | `test_parse_malformed_var_comment` | `<!-- @var missing_colon -->` should be ignored | P1 |
| R-VP-15 | `test_parse_var_with_extra_whitespace` | `<!--  @var  name :  value  -->` should still parse | P2 |
| R-VP-16 | `test_process_variables_empty_content` | Empty string input returns empty string | P1 |
| R-VP-17 | `test_yaml_invalid_format` | Invalid YAML string returns error | P1 |

### 3.2 commands.rs -- File I/O Commands

All tests use `tempfile` for filesystem isolation.

#### read_file

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-CMD-01 | `test_read_file_md` | Read a valid `.md` file | P0 |
| R-CMD-02 | `test_read_file_txt` | Read a valid `.txt` file | P0 |
| R-CMD-03 | `test_read_file_unsupported_ext` | Reject `.pdf` file with error | P0 |
| R-CMD-04 | `test_read_file_too_large` | Reject file >10MB with error | P1 |
| R-CMD-05 | `test_read_file_not_found` | Non-existent path returns error | P0 |
| R-CMD-06 | `test_read_file_empty` | Read empty `.md` file returns empty string | P1 |
| R-CMD-07 | `test_read_file_no_extension` | File without extension is allowed (no ext check fires) | P2 |
| R-CMD-08 | `test_read_file_utf8_content` | Read file with Japanese/Unicode content | P1 |

#### save_file

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-CMD-09 | `test_save_file_new` | Save to a new `.md` path creates the file | P0 |
| R-CMD-10 | `test_save_file_overwrite` | Save to an existing file overwrites content | P0 |
| R-CMD-11 | `test_save_file_creates_parent_dirs` | Save to a path with non-existent parent directories | P1 |
| R-CMD-12 | `test_save_file_unsupported_ext` | Reject `.html` file with error | P0 |
| R-CMD-13 | `test_save_file_utf8_content` | Save file with Japanese/Unicode content | P1 |

#### read_directory

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-CMD-14 | `test_read_directory_basic` | List files and directories | P0 |
| R-CMD-15 | `test_read_directory_dirs_first` | Directories sorted alphabetically before files | P1 |
| R-CMD-16 | `test_read_directory_hidden_files_excluded` | Files starting with `.` are not returned | P1 |
| R-CMD-17 | `test_read_directory_filter_md_txt` | With `show_all_files=false`, only .md/.txt/.markdown shown | P0 |
| R-CMD-18 | `test_read_directory_show_all_files` | With `show_all_files=true`, all files shown | P1 |
| R-CMD-19 | `test_read_directory_empty` | Empty directory returns empty vec | P2 |
| R-CMD-20 | `test_read_directory_not_a_directory` | File path (not dir) returns error | P1 |

#### get_file_hash

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-CMD-21 | `test_get_file_hash_normal` | Returns correct SHA256 hash, modified_time, file_size | P0 |
| R-CMD-22 | `test_get_file_hash_large_file` | File >10MB returns `hash: "large_file"` | P1 |
| R-CMD-23 | `test_get_file_hash_not_found` | Non-existent file returns error | P1 |

### 3.3 file_operations.rs

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-FO-01 | `test_calculate_file_hash_sha256` | SHA256 hash matches known value for known content | P0 |
| R-FO-02 | `test_calculate_file_hash_metadata` | `modified_time` > 0 and `file_size` matches actual size | P1 |
| R-FO-03 | `test_calculate_file_hash_large_file` | >10MB file returns `"large_file"` hash | P1 |
| R-FO-04 | `test_calculate_file_hash_not_found` | Non-existent path returns error | P0 |

### 3.4 file_association.rs

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| R-FA-01 | `test_is_frontend_ready_default` | Initially returns `false` | P1 |
| R-FA-02 | `test_set_frontend_ready` | After calling `set_frontend_ready()`, returns `true` | P1 |
| R-FA-03 | `test_get_pending_file_paths_empty` | Initially returns empty vec | P1 |
| R-FA-04 | `test_get_pending_file_paths_clears` | After retrieval, buffer is cleared | P1 |
| R-FA-05 | `test_pending_paths_buffer` | Manually push paths via `PENDING_FILE_PATHS`, then retrieve | P2 |

> **Note**: `file_association.rs` uses `OnceLock<Mutex<>>` globals. Tests that modify global state must be aware of cross-test interference. Use `cargo test -- --test-threads=1` if needed, or initialize with known state.

### 3.5 Existing Tests (Types & Integration)

| ID | Test Name | Description |
|----|-----------|-------------|
| R-TY-01 | `test_variable_creation` | `Variable` struct creation |
| R-TY-02 | `test_variable_set_creation` | `VariableSet` struct creation |
| R-TY-03 | `test_file_hash_info_creation` | `FileHashInfo` struct creation |
| R-INT-01 | `test_variable_processing_integration` | Full variable processing flow |
| R-INT-02 | `test_yaml_roundtrip` | YAML export then import preserves variables |

### Rust Test Summary

| Module | Existing | New | Total |
|--------|----------|-----|-------|
| variable_processor.rs | 10 | 7 | 17 |
| commands.rs (variable cmds) | 7 | 0 | 7 |
| commands.rs (file I/O) | 0 | 23 | 23 |
| file_operations.rs | 0 | 4 | 4 |
| file_association.rs | 0 | 5 | 5 |
| Types & integration | 5 | 0 | 5 |
| **Total** | **22** | **39** | **61** |

---

## 4. TypeScript Unit Test Cases

### 4.1 tableConverter.ts

File: `src/utils/__tests__/tableConverter.test.ts`

#### htmlTableToMarkdown

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-TC-01 | `converts a simple 2x2 table` | `<table>` with header + 1 row -> valid Markdown table | P0 |
| T-TC-02 | `converts multi-row table` | 3+ rows produce correct Markdown | P1 |
| T-TC-03 | `escapes pipe characters in cells` | Cell containing `|` becomes `\|` | P1 |
| T-TC-04 | `handles empty cells` | Empty `<td>` becomes single space | P1 |
| T-TC-05 | `throws when no table in HTML` | HTML without `<table>` throws error | P0 |
| T-TC-06 | `handles cells with whitespace and newlines` | Newlines and multiple spaces collapsed | P2 |

#### validateMarkdownTable

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-TC-07 | `returns true for valid table` | Header row + separator + data row | P0 |
| T-TC-08 | `returns false for too few lines` | Single line input | P1 |
| T-TC-09 | `returns false for missing pipes` | First line doesn't start/end with `|` | P1 |
| T-TC-10 | `returns false for missing separator` | Second line doesn't contain `---` | P1 |

#### convertTsvCsvToMarkdown

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-TC-11 | `converts TSV input` | Tab-separated values -> Markdown table | P0 |
| T-TC-12 | `converts CSV input` | Comma-separated values -> Markdown table | P0 |
| T-TC-13 | `escapes pipe in cell content` | Cell with `|` character escaped | P1 |
| T-TC-14 | `skips empty lines` | Input with blank lines doesn't produce empty rows | P2 |
| T-TC-15 | `throws when no delimiter found` | Single-column input with no tabs or commas | P1 |

### 4.2 headingExtractor.ts

File: `src/utils/__tests__/headingExtractor.test.ts`

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-HE-01 | `extracts h1 through h6` | Each heading level produces correct `level` value | P0 |
| T-HE-02 | `returns correct line numbers` | 1-based line numbers match heading positions | P0 |
| T-HE-03 | `skips headings inside fenced code blocks` | Headings between ``` fences are ignored | P0 |
| T-HE-04 | `skips headings inside tilde code blocks` | Headings between ~~~ fences are ignored | P1 |
| T-HE-05 | `handles empty content` | Empty string returns empty array | P1 |
| T-HE-06 | `strips trailing hash marks` | `## Title ##` extracts `"Title"` | P1 |
| T-HE-07 | `handles mixed heading levels` | h1, h3, h2 in sequence all captured in order | P1 |
| T-HE-08 | `ignores lines that are not headings` | Regular text, lists, blockquotes not captured | P2 |

### 4.3 platform.ts

File: `src/utils/__tests__/platform.test.ts`

> **Mock strategy**: Override `window.navigator.userAgent` and `window.navigator.platform` using `Object.defineProperty` or `vi.stubGlobal`.

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-PF-01 | `detects macOS platform` | userAgent containing "mac" returns `'mac'` | P1 |
| T-PF-02 | `detects Windows platform` | userAgent containing "win" returns `'windows'` | P1 |
| T-PF-03 | `detects Linux platform` | userAgent containing "linux" returns `'linux'` | P1 |
| T-PF-04 | `returns unknown for unrecognized` | Empty/unrecognized userAgent returns `'unknown'` | P2 |
| T-PF-05 | `formatKeyboardShortcut on mac` | Returns `'⌘+S'` for key='S' | P1 |
| T-PF-06 | `formatKeyboardShortcut on windows` | Returns `'Ctrl+S'` for key='S' | P1 |
| T-PF-07 | `formatKeyboardShortcut with shift` | Returns `'⌘+⇧+S'` for key='S', withShift=true on mac | P2 |

### 4.4 tabReducer.ts

File: `src/reducers/__tests__/tabReducer.test.ts`

> **Note**: Pure reducer -- no mocking needed. Test by calling `tabReducer(state, action)` directly.

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-TR-01 | `ADD_TAB adds tab and sets active` | Tab appended, `activeTabId` set to new tab ID | P0 |
| T-TR-02 | `REMOVE_TAB activates next tab` | Remove middle tab, next tab becomes active | P0 |
| T-TR-03 | `REMOVE_TAB last tab leaves null` | Remove only tab, `activeTabId` becomes null | P0 |
| T-TR-04 | `REMOVE_TAB non-active tab preserves active` | Remove inactive tab, `activeTabId` unchanged | P1 |
| T-TR-05 | `SET_ACTIVE_TAB with valid ID` | Sets `activeTabId` to given ID | P0 |
| T-TR-06 | `SET_ACTIVE_TAB with non-existent ID` | Sets `activeTabId` to null | P1 |
| T-TR-07 | `UPDATE_TAB_CONTENT sets content and isModified` | Content updated, `isModified` set to true | P0 |
| T-TR-08 | `UPDATE_TAB_TITLE updates title` | Title changed for matching tab | P1 |
| T-TR-09 | `SET_TAB_MODIFIED toggles modified flag` | `isModified` set to given boolean value | P1 |
| T-TR-10 | `SET_TAB_FILE_PATH sets path` | `filePath` updated for matching tab | P1 |
| T-TR-11 | `SET_TAB_NEW sets isNew flag` | `isNew` updated for matching tab | P2 |
| T-TR-12 | `UPDATE_TAB_FILE_HASH updates hash info` | `fileHashInfo` updated for matching tab | P2 |
| T-TR-13 | `REORDER_TABS preserves activeTabId` | Active tab still exists after reorder | P1 |
| T-TR-14 | `REORDER_TABS falls back to first tab` | If active tab removed in reorder, first tab selected | P1 |
| T-TR-15 | `LOAD_STATE validates activeTabId` | If `activeTabId` not in loaded tabs, falls back to first | P1 |
| T-TR-16 | `unknown action returns same state` | Unknown action type returns state unchanged | P2 |

### 4.5 fileChangeDetection.ts

File: `src/utils/__tests__/fileChangeDetection.test.ts`

> **Mock strategy**: Mock `desktopApi.getFileHash` via `vi.mock('../api/desktopApi')`.

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-FC-01 | `returns false when all fields match` | Same hash, size, time -> no change | P0 |
| T-FC-02 | `returns true when file size differs` | Different `file_size` -> change detected | P0 |
| T-FC-03 | `returns true when modified time differs` | Different `modified_time` -> change detected | P1 |
| T-FC-04 | `returns true when hash differs` | Different `hash` -> change detected | P1 |
| T-FC-05 | `returns false for new file (isNew=true)` | Tab with `isNew: true` skips detection | P1 |
| T-FC-06 | `returns false when no fileHashInfo` | Tab without `fileHashInfo` skips detection | P1 |
| T-FC-07 | `returns false on API error` | `getFileHash` throws -> returns false | P2 |

### 4.6 Component Tests

#### Preview.tsx -- Checkbox Toggle

File: `src/components/__tests__/Preview.test.tsx`

> **Mock strategy**: Mock `variableApi.processMarkdown` to return content as-is, mock `@tauri-apps/plugin-opener` and `@tauri-apps/plugin-fs`. Render `Preview` with `content` containing checkboxes and verify `onContentChange` is called.

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-PV-01 | `clicking unchecked checkbox calls onContentChange with [x]` | Render `- [ ] item`, click checkbox, verify callback | P0 |
| T-PV-02 | `clicking checked checkbox calls onContentChange with [ ]` | Render `- [x] item`, click checkbox, verify callback | P0 |
| T-PV-03 | `targets correct checkbox by index` | Two checkboxes, click second, only second toggled | P1 |

#### SearchReplacePanel.tsx -- Search Logic

File: `src/components/__tests__/SearchReplacePanel.test.tsx`

> **Mock strategy**: Mock Monaco editor ref with a fake editor object exposing `getModel()`, `deltaDecorations()`, `revealLineInCenter()`.

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| T-SR-01 | `finds matches for basic search term` | Search "hello" in content with "hello world" | P1 |
| T-SR-02 | `case-sensitive search distinguishes case` | "Hello" does not match "hello" when case-sensitive | P1 |
| T-SR-03 | `regex search works` | Search `\d+` matches numbers in content | P2 |
| T-SR-04 | `replace all replaces all occurrences` | Replace "foo" with "bar" across multiple matches | P1 |

### TypeScript Test Summary

| Module | Test Count |
|--------|------------|
| tableConverter.ts | 15 |
| headingExtractor.ts | 8 |
| platform.ts | 7 |
| tabReducer.ts | 16 |
| fileChangeDetection.ts | 7 |
| Preview.tsx | 3 |
| SearchReplacePanel.tsx | 4 |
| **Total** | **60** |

---

## 5. E2E / Integration Test Cases

### 5.1 Tier 1: Component Integration Tests (Vitest + RTL)

These tests verify complete user flows with mocked Tauri APIs. They do not require a Tauri runtime or app binary.

File location: `src/__tests__/integration/`

| ID | Test Name | Description | Preconditions | Steps | Expected Result | Priority |
|----|-----------|-------------|---------------|-------|-----------------|----------|
| E-INT-01 | New document flow | Editor renders with default content | App mounts with default tab | 1. Render AppContent 2. Verify editor has content 3. Verify preview shows rendered HTML | Editor and preview display default content | P0 |
| E-INT-02 | Tab creation | New tab is created and activated | One default tab exists | 1. Call onNewTab 2. Verify two tabs exist 3. Verify new tab is active | New tab active, old tab preserved | P0 |
| E-INT-03 | Tab switching | Switch between tabs preserves content | Two tabs with different content | 1. Set active tab to tab 2 2. Verify editor shows tab 2 content 3. Switch back to tab 1 4. Verify tab 1 content | Each tab retains its content | P0 |
| E-INT-04 | Tab close | Closing active tab activates next | Three tabs, second is active | 1. Close tab 2 2. Verify tab 2 removed 3. Verify tab 3 (or tab 1) becomes active | Adjacent tab becomes active | P1 |
| E-INT-05 | Checkbox toggle flow | Clicking preview checkbox updates editor | Split view with `- [ ] item` content | 1. Render Preview 2. Click checkbox 3. Verify onContentChange called with `[x]` | Editor content reflects toggle | P0 |
| E-INT-06 | Outline headings | Heading extraction shown in outline | Content with h1, h2, h3 headings | 1. Render with markdown content 2. Extract headings 3. Verify correct TOC items | Outline shows all headings at correct levels | P1 |
| E-INT-07 | Zoom level change | Zoom in/out changes font size | Default zoom (1.0) | 1. Trigger zoom in 2. Verify zoom > 1.0 3. Trigger zoom out 4. Verify zoom < previous | Zoom level changes within min/max bounds | P2 |

### 5.2 Tier 2: Tauri WebDriver Tests (tauri-driver + WebDriverIO)

These tests require a built app binary and test native OS interactions that cannot be mocked. They are typically run in CI only.

File location: `tests/e2e/`

| ID | Test Name | Description | Preconditions | Steps | Expected Result | Priority |
|----|-----------|-------------|---------------|-------|-----------------|----------|
| E-WD-01 | File open via dialog | Open a file through the native file dialog | App is running, test .md file exists | 1. Trigger file open (Cmd/Ctrl+O) 2. Select test file in dialog 3. Verify content loaded in editor | File content displayed in editor tab | P0 |
| E-WD-02 | File save | Save edited content to disk | File opened in editor | 1. Edit content 2. Trigger save (Cmd/Ctrl+S) 3. Read file from disk | File on disk matches editor content | P0 |
| E-WD-03 | File change detection | External file modification triggers dialog | File opened in editor | 1. Modify file externally 2. Wait for detection interval (~5s) 3. Verify reload dialog appears | FileChangeDialog shown with reload option | P1 |
| E-WD-04 | External link opens browser | Clicking link in preview opens OS browser | Preview with external URL | 1. Click external link in preview 2. Verify `openUrl` was invoked | OS default browser opens the URL | P2 |
| E-WD-05 | Window state persistence | Window size/position restored on relaunch | App has been resized | 1. Resize window 2. Close app 3. Relaunch app 4. Verify window dimensions | Window size matches previous session | P2 |
| E-WD-06 | File association (macOS) | Opening .md file from Finder launches app | .md file exists, app registered for .md | 1. Open .md file from Finder 2. Verify app launches 3. Verify file content in editor | App opens with file content in a new tab | P2 |
| E-WD-07 | Auto-save | Modified file is auto-saved after delay | Auto-save enabled, file opened | 1. Edit content 2. Wait 3+ seconds 3. Read file from disk | File on disk matches latest editor content | P1 |

### E2E Test Summary

| Tier | Test Count |
|------|------------|
| Tier 1: Component Integration | 7 |
| Tier 2: Tauri WebDriver | 7 |
| **Total** | **14** |

---

## 6. Implementation Roadmap

### Phase 1: Infrastructure Setup (Estimated: 1-2 days)

1. Install TypeScript test dependencies (`vitest`, `@testing-library/react`, `jsdom`, etc.)
2. Create `vitest.config.ts`
3. Create `src/test/setup.ts`
4. Create Tauri API mock files under `src/__mocks__/@tauri-apps/`
5. Add `tempfile` to Rust `[dev-dependencies]`
6. Add npm scripts (`test:unit`, `test:all`, etc.)
7. Verify green test run with a single trivial test

### Phase 2: Pure Utility Unit Tests (Estimated: 2-3 days)

Priority: **Highest** -- No external dependencies, maximum value.

1. `tabReducer.test.ts` (16 tests)
2. `headingExtractor.test.ts` (8 tests)
3. `tableConverter.test.ts` (15 tests)
4. `platform.test.ts` (7 tests)

### Phase 3: Rust Unit Test Expansion (Estimated: 2-3 days)

1. File I/O command tests with `tempfile` (R-CMD-01 through R-CMD-23)
2. `file_operations.rs` tests (R-FO-01 through R-FO-04)
3. `file_association.rs` tests (R-FA-01 through R-FA-05)
4. `variable_processor.rs` edge cases (R-VP-11 through R-VP-17)

### Phase 4: Mocked API & Component Tests (Estimated: 2-3 days)

1. `fileChangeDetection.test.ts` (7 tests)
2. `Preview.test.tsx` checkbox toggle (3 tests)
3. `SearchReplacePanel.test.tsx` (4 tests)

### Phase 5: Component Integration Tests (Estimated: 2-3 days)

1. E-INT-01 through E-INT-07 (Tier 1 component integration tests)

### Phase 6: Tauri WebDriver E2E (Estimated: 3-5 days)

1. Install and configure `tauri-driver` + WebDriverIO
2. Implement E-WD-01 through E-WD-07
3. Integrate into CI pipeline (macOS runner)

### Priority Matrix

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | ~30 | Core functionality, must pass for release |
| P1 | ~55 | Important edge cases and secondary features |
| P2 | ~28 | Nice-to-have, low-risk areas |

### Total Test Count

| Category | Count |
|----------|-------|
| Rust Unit Tests (existing) | 22 |
| Rust Unit Tests (new) | 39 |
| TypeScript Unit Tests | 60 |
| E2E / Integration Tests | 14 |
| **Grand Total** | **135** |
