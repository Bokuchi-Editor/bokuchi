# Bokuchi

![Screen Shot](https://raw.githubusercontent.com/shinya/image-storage/master/bokuchi/ss2.png)

A lightweight, cross-platform Markdown editor built with Tauri, React, and Rust.

## Features

### Core Functionality

- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Lightweight**: Built with Tauri for minimal resource usage
- **Real-time preview**: Live Markdown preview with syntax highlighting
- **Standalone**: No external dependencies or server required

### Editor Features

- **Tab management**: Multiple files editing with tabs
- **Search and replace**: Floating search panel with match highlighting, navigation, and replace
- **Zoom functionality**: Adjustable zoom levels for editor and preview
- **Interactive checkboxes**: GitHub-style Markdown checkboxes with clickable preview
- **Synchronized scrolling**: Editor and preview scroll positions are linked
- **Markdown toolbar**: Quick-access toolbar for headings, bold, italic, lists, links, tables, and more
- **Auto-save**: Automatic saving with debounce
- **State persistence**: Automatically saves and restores application state

### File Operations

- **Native file operations**: Full file system access with native dialogs (Open, Save, Save As)
- **File change detection**: Automatically detects external file changes
- **File not found handling**: Graceful handling of restored tabs when files are missing
- **HTML export**: Export preview as HTML files
- **Table conversion**: Paste HTML tables or TSV/CSV data as Markdown tables

### Customization & Themes

- **Multiple themes**: Default, Dark, Pastel, Vivid, and Darcula themes
- **Variable system**: Support for custom variables in Markdown (local and global)
- **Internationalization**: Multi-language support (14 languages)
- **Responsive design**: Optimized for different screen sizes

### System Integration

- **Single instance**: Prevents multiple application instances
- **System integration**: Native OS integration and file associations
- **Offline functionality**: Works completely offline without internet connection

## Supported Languages

Bokuchi supports 14 languages for the user interface:

| Language              | Code      | Native Name        |
| --------------------- | --------- | ------------------ |
| English               | `en`      | English            |
| Japanese              | `ja`      | 日本語             |
| Chinese (Simplified)  | `zh-CN`   | 中文 (简体)        |
| Chinese (Traditional) | `zh-Hant` | 中文 (繁體)        |
| Spanish               | `es`      | Español            |
| Hindi                 | `hi`      | हिन्दी             |
| Russian               | `ru`      | Русский            |
| Korean                | `ko`      | 한국어             |
| Portuguese (Brazil)   | `pt-BR`   | Português (Brasil) |
| Arabic                | `ar`      | العربية            |
| French                | `fr`      | Français           |
| German                | `de`      | Deutsch            |
| Indonesian            | `id`      | Bahasa Indonesia   |
| Vietnamese            | `vi`      | Tiếng Việt         |

You can change the language in Settings > Language.

**Please submit a pull request if you find any translation errors.**

## Development

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- Platform-specific build tools:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: Build essentials (gcc, make, etc.)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run tauri:dev
   ```

### Commands

```bash
# Development
npm run tauri:dev      # Start desktop app (with lint + type-check)
npm run dev            # Vite dev server only

# Quality checks
npm run check          # Run both ESLint and TypeScript checks
npm run lint           # Run ESLint only
npm run type-check     # Run TypeScript type checking only

# Testing
npm run test:all           # Run all tests (Rust + TypeScript)
npm run test:unit          # Run TypeScript unit tests (Vitest)
npm run test:unit:watch    # Run TypeScript tests in watch mode
npm run test:unit:coverage # Run TypeScript tests with coverage report
npm run test:rust          # Run Rust unit tests
npm run test:rust:verbose  # Run Rust tests with verbose output

# Build
npm run build          # TypeScript + Vite build
npm run tauri:build    # Production native app build
```

### Building for Production

```bash
# macOS (Universal - Apple Silicon + Intel)
npm run tauri:build -- --target universal-apple-darwin

# macOS (Native only)
npm run tauri:build

# Windows
npm run tauri:build -- --target x86_64-pc-windows-gnu

# Linux
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

Build output locations:

- **macOS**: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`
- **Windows**: `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`

### Testing

The project has three tiers of tests. Day-to-day development only requires Tier 1 and 2.

#### Tier 1 & 2: Unit / Integration Tests (no build required)

```bash
# Run everything except E2E — this is the everyday command
npm run test:all
```

This runs Rust unit tests (`cargo test`) followed by TypeScript unit + integration tests (Vitest).

**TypeScript tests only:**

```bash
npm run test:unit          # Single run
npm run test:unit:watch    # Watch mode (re-runs on file changes)
npm run test:unit:coverage # With coverage report (outputs to coverage/)
```

**Rust tests only:**

```bash
npm run test:rust          # Standard run
npm run test:rust:verbose  # With verbose output
```

Test files are located at:

| Category | Location | Count |
|----------|----------|-------|
| Rust unit tests | `src-tauri/src/tests.rs` | 59 |
| TS utility tests | `src/utils/__tests__/*.test.ts` | 37 |
| TS reducer tests | `src/reducers/__tests__/*.test.ts` | 16 |
| TS component tests | `src/components/__tests__/*.test.tsx` | 7 |
| TS integration tests | `src/__tests__/integration/*.test.tsx` | 30 |

#### Tier 3: E2E Tests (suspended)

E2E test code exists in `tests/e2e/` and `wdio.conf.ts` but is currently **not executable**. `tauri-driver` (the WebDriver proxy for Tauri apps) only supports Linux (WebKitGTK) and has compatibility concerns with Tauri v2. The npm scripts and wdio dependencies have been removed.

Test coverage for UI logic and component interactions is handled by Tier 1 & 2 (Vitest + RTL) instead.

## Variable System

### File-local Variables

```markdown
<!-- @var title: My Document -->
<!-- @var author: John Doe -->

# {{title}}

Author: {{author}}
```

### Global Variables

Set global variables through the Variables settings panel. These are available across all files.

## Roadmap

- [ ] KaTeX math rendering
- [ ] PDF export
- [ ] Command palette
- [ ] Mermaid / PlantUML diagrams
- [ ] Split editor (two files side by side)
- [ ] Tab pinning
- [ ] Image paste / drop management
- [x] Frontend tests (Vitest + Testing Library)
- [ ] Cross-tab search
- [ ] File rename from tab
- [ ] Standalone HTML export (inline CSS)
- [ ] Word / character count with reading time
- [ ] Undo / redo history persistence
- [ ] Markdown snippets / templates
