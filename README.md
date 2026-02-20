# Bokuchi

![Screen Shot](https://raw.githubusercontent.com/shinya/image-storage/master/bokuchi/ss.png)

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
npm run test           # Run Rust tests
npm run test:verbose   # Run Rust tests with verbose output

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

- [ ] Outline / TOC panel
- [ ] Folder tree sidebar
- [ ] KaTeX math rendering
- [ ] PDF export
- [ ] Command palette
- [ ] Mermaid / PlantUML diagrams
- [ ] Split editor (two files side by side)
- [ ] Tab pinning
- [ ] Image paste / drop management
- [ ] Frontend tests (Vitest + Testing Library)
- [ ] Cross-tab search
- [ ] File rename from tab
- [ ] Standalone HTML export (inline CSS)
- [ ] Word / character count with reading time
- [ ] Undo / redo history persistence
- [ ] Markdown snippets / templates
