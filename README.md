# Bokuchi

A lightweight, cross-platform Markdown editor built with Tauri, React, and Rust.

**Version**: 0.2.0

## Features

### Core Functionality

- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Lightweight**: Built with Tauri for minimal resource usage
- **Real-time preview**: Live Markdown preview with syntax highlighting
- **Standalone**: No external dependencies or server required

### Editor Features

- **Tab management**: Multiple files editing with tabs
- **Search and replace**: Built-in search functionality
- **Zoom functionality**: Adjustable zoom levels for editor and preview
- **Interactive checkboxes**: GitHub-style Markdown checkboxes with clickable preview
- **State persistence**: Automatically saves and restores application state

### File Operations

- **Native file operations**: Full file system access with native dialogs (Open, Save, Save As)
- **File change detection**: Automatically detects external file changes
- **File not found handling**: Graceful handling of restored tabs when files are missing
- **HTML export**: Export preview as HTML files

### Customization & Themes

- **Multiple themes**: Default, Dark, Pastel, Vivid, and Darcula themes
- **Variable system**: Support for custom variables in Markdown (local and global)
- **Internationalization**: Support for English and Japanese
- **Responsive design**: Optimized for different screen sizes

### System Integration

- **Single instance**: Prevents multiple application instances
- **System integration**: Native OS integration and file associations
- **Offline functionality**: Works completely offline without internet connection

## Development

### Prerequisites

- Node.js 18+
- Rust (for Tauri)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:

   ```bash
   # Start desktop app (with quality checks)
   npm run tauri:dev
   ```

### Development Workflow

The development process includes automatic quality checks to ensure code quality:

#### Quality Checks

Before starting the application, the following checks are automatically performed:

- **ESLint**: Code linting with zero warnings policy
- **TypeScript**: Type checking without emitting files

```bash
# Manual quality checks
npm run check        # Run both ESLint and TypeScript checks
npm run lint         # Run ESLint only
npm run type-check   # Run TypeScript type checking only
```

#### Development Commands

```bash
# Start development with quality checks (recommended)
npm run tauri:dev

# Start development without quality checks (if needed)
npm run dev

# Build and start (alternative)
npm run build && npm run tauri:dev
```

#### File Watching

- **File watching is disabled** to prevent EMFILE errors
- **Manual refresh required**: After code changes, manually refresh the browser (F5 or Cmd+R)
- **Quality checks**: Run `npm run check` before committing changes

### Building the Application

#### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- Platform-specific build tools:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: Build essentials (gcc, make, etc.)

#### Build Commands

**Development Build:**

```bash
npm run tauri:dev
```

**Development (Dynamic Port - Recommended for Production-like Testing):**

```bash
npm run tauri:dev:dynamic
```

**Production Build:**

```bash
npm run tauri:build
```

**Build for Specific Platform:**

```bash
# macOS
npm run tauri:build -- --target universal-apple-darwin

# Windows (from macOS)
npm run tauri:build -- --target x86_64-pc-windows-gnu

# Linux
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

#### Build Output

After successful build, the application will be available in:

- **macOS**: `src-tauri/target/release/bundle/dmg/` (DMG installer)
- **Windows**: `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/` (NSIS installer)
- **Linux**: `src-tauri/target/release/bundle/appimage/` (AppImage)

#### Prerequisites for Windows Build (from macOS)

To build Windows binaries from macOS, you need to install additional tools:

```bash
# Install required tools via Homebrew
brew install mingw-w64 llvm nsis

# Add Windows GNU target to Rust
rustup target add x86_64-pc-windows-gnu

# Ensure llvm-rc is available in PATH
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
```

#### Windows Build Commands (from macOS)

**One-time setup:**

```bash
# Set up environment variables for Windows cross-compilation
export CC_x86_64_pc_windows_gnu=x86_64-w64-mingw32-gcc
export CXX_x86_64_pc_windows_gnu=x86_64-w64-mingw32-g++
export AR_x86_64_pc_windows_gnu=x86_64-w64-mingw32-ar
export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc
```

**Build Windows executable:**

```bash
# Build Windows version
npm run tauri:build -- --target x86_64-pc-windows-gnu
```

**Complete build script:**

```bash
#!/bin/bash
# Set up environment
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
export CC_x86_64_pc_windows_gnu=x86_64-w64-mingw32-gcc
export CXX_x86_64_pc_windows_gnu=x86_64-w64-mingw32-g++
export AR_x86_64_pc_windows_gnu=x86_64-w64-mingw32-ar
export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc

# Build Windows version
npm run tauri:build -- --target x86_64-pc-windows-gnu
```

**Note**: Cross-platform compilation is experimental and may not support all features. For full compatibility, consider using a Windows host or GitHub Actions for Windows builds.

#### Troubleshooting

**Common Build Issues:**

1. **TypeScript Errors**: Run `npm run build:desktop` to check for TypeScript errors
2. **Rust Dependencies**: Ensure Rust is up to date with `rustup update`
3. **Platform Tools**: Install required build tools for your platform
4. **Permissions**: Ensure proper file permissions in the project directory
5. **Windows Build from macOS**:
   - Use `x86_64-pc-windows-gnu` target instead of `x86_64-pc-windows-msvc`
   - Ensure `llvm-rc` is available in PATH
   - Install NSIS for installer generation
   - **Avoid brew rustup conflicts**: Use only official rustup, not brew version
   - If you have brew rustup installed, remove it: `brew uninstall rustup-init`
   - Reinstall official rustup: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`

**Clean Build:**

```bash
# Clean all build artifacts
npm run clean
# or manually
rm -rf src-tauri/target
rm -rf dist-desktop
```

### Desktop Development

For Tauri desktop version (standalone):

```bash
npm run tauri:dev
```

### Dynamic Port Allocation

This application includes a dynamic port allocation system to prevent port conflicts:

**Features:**

- **Development Mode**: Uses fixed port 1420 for consistency
- **Production Mode**: Automatically finds available ports (30000+ preferred, 10000+ fallback)
- **Conflict Resolution**: Automatically tries alternative ports if the preferred port is in use
- **Random Fallback**: Uses random ports in the 30000-65535 range if all preferred ports are occupied

**Usage:**

```bash
# Development with fixed port (default)
npm run tauri:dev

# Development with dynamic port (recommended for production testing)
npm run tauri:dev:dynamic
```

**Port Priority:**

1. **Preferred Range**: 30000-30009 (high port numbers to avoid conflicts)
2. **Fallback Range**: 10000-10009 (if preferred ports are unavailable)
3. **Random Range**: 30000-65535 (if all preferred and fallback ports are occupied)

This ensures that multiple instances of the application can run simultaneously without port conflicts, making it ideal for development and testing scenarios.

## Project Structure

```
bokuchi/
├── src/                 # React frontend
│   ├── components/      # React components
│   │   ├── AppHeader.tsx # Application header component
│   │   ├── AppContent.tsx # Main content component
│   │   ├── AppDialogs.tsx # Dialog components
│   │   ├── Editor.tsx   # Monaco editor component
│   │   ├── Preview.tsx  # Markdown preview
│   │   ├── TabBar.tsx   # Tab management
│   │   ├── SaveFileDialog.tsx # File save dialog
│   │   └── VariableSettings.tsx # Variable configuration
│   ├── hooks/          # Custom hooks
│   │   ├── useAppState.ts # Main application state hook
│   │   ├── useTabs.ts  # Tab management hook (web)
│   │   ├── useTabsDesktop.ts # Tab management hook (desktop)
│   │   └── useZoom.ts  # Zoom functionality hook
│   ├── styles/         # CSS styles
│   │   ├── variables.css # CSS variables for theming
│   │   ├── base.css    # Base styles
│   │   ├── markdown.css # Markdown preview styles
│   │   └── syntax.css  # Syntax highlighting styles
│   ├── locales/        # Internationalization
│   │   ├── en.json     # English translations
│   │   └── ja.json     # Japanese translations
│   ├── reducers/       # State management
│   │   └── tabReducer.ts # Tab state reducer
│   ├── types/          # TypeScript types
│   │   └── tab.ts      # Tab and state types
│   ├── api/            # Tauri API clients
│   │   ├── desktopApi.ts # Desktop file operations
│   │   ├── fileApi.ts  # File operations (web)
│   │   ├── variableApi.ts # Variable processing
│   │   └── storeApi.ts # State persistence
│   ├── App.tsx         # Main app component
│   └── i18n.ts         # Internationalization setup
└── src-tauri/          # Tauri configuration and Rust backend
    ├── src/lib.rs      # Rust backend (variables, file I/O, state persistence)
    ├── src/main.rs     # Tauri entry point
    ├── tauri.conf.json # Tauri configuration
    ├── entitlements.plist # macOS entitlements
    └── capabilities/   # Tauri v2 capabilities
        └── default.json # File system and store permissions
```

## Key Features

### State Persistence

The application automatically saves and restores its state:

- **First launch**: Creates a single new tab
- **Subsequent launches**: Restores previous state including:
  - All open tabs
  - Active tab selection
  - Tab content for unsaved files
  - File paths for saved files
- **File restoration**: Automatically reloads content from saved file paths
- **Error handling**: Shows "ファイルが見つかりません。" (File not found) for missing files

### Variable System

#### File-local Variables

```markdown
<!-- @var title: My Document -->
<!-- @var author: John Doe -->

# {{title}}

Author: {{author}}
```

#### Global Variables

Set global variables through the Variables settings panel. These are available across all files.

### File Operations

- **Open File**: Native file dialog with Markdown file filtering
- **Save**: Save current tab to its associated file path
- **Save As**: Save current tab with a new file path
- **New File**: Create a new untitled tab

## Migration from Go Backend

This project has been migrated from a Go HTTP backend to a pure Rust implementation using Tauri:

### Benefits of the Migration

1. **No HTTP Server**: Eliminates port conflicts and network dependencies
2. **Single Binary**: Easier distribution and installation
3. **Better Performance**: Direct file system access without network overhead
4. **Improved Security**: No network exposure, direct system integration
5. **Simplified Architecture**: Single technology stack (Rust + TypeScript)
6. **State Persistence**: Automatic application state saving and restoration

### Technical Changes

- **Backend**: Go HTTP server → Rust Tauri commands
- **API**: HTTP REST endpoints → Tauri invoke commands
- **File I/O**: Network requests → Direct file system access
- **Variables**: Server-side processing → Client-side Rust processing
- **State Management**: Manual state → Automatic persistence with Tauri Store

## Recent Updates

### Interactive Checkboxes (v0.2.0)

Added GitHub-style interactive Markdown checkboxes with full preview synchronization:

#### Features

- **Clickable Checkboxes**: Checkboxes in preview are now interactive and clickable
- **Visual Feedback**: Checked items show background color changes for better UX
- **Editor Synchronization**: Changes in preview are immediately reflected in the editor
- **Position-based Matching**: Handles duplicate checkbox text correctly using position indexing
- **Real-time Updates**: Instant visual feedback with immediate editor content updates

#### Technical Implementation

- **HTML Post-processing**: Custom regex-based processing of marked.js output
- **Event Handling**: Change event listeners for checkbox interactions
- **State Management**: Position-based content matching for accurate updates
- **CSS Styling**: Enhanced checkbox styling with hover effects and theme support

### Code Refactoring (Previous)

The codebase has been significantly refactored to improve maintainability and organization:

#### 1. Component Architecture

- **AppHeader**: Extracted header component with menu and controls
- **AppContent**: Main content area with editor, preview, and tabs
- **AppDialogs**: Centralized dialog management
- **useAppState**: Unified application state management hook

#### 2. CSS Organization

- **CSS Variables**: Centralized theming with CSS custom properties
- **Modular Styles**: Separated base, markdown, and syntax styles
- **Theme Support**: Enhanced theme system with consistent variables

#### 3. Shell Scripts

- **Directory Independence**: All build scripts now work from any directory
- **Cross-platform**: Improved Windows and macOS build scripts
- **Error Handling**: Better error messages and validation

#### 4. Code Quality

- **English Comments**: All code comments translated to English
- **TypeScript**: Improved type safety and error handling
- **ESLint**: Zero-warning policy enforced

#### 5. New Features

- **Single Instance**: Prevents multiple application instances
- **File Change Detection**: Automatic external file change detection
- **Zoom Functionality**: Adjustable zoom levels for editor and preview
- **Internationalization**: Full English/Japanese support

## Roadmap

- [x] Phase 1: Basic Markdown editor (reading, saving, preview)
- [x] Phase 2: Syntax highlighting and dark mode
- [x] Phase 3: Variable functionality
- [x] Phase 4: Tab functionality and search/replace
- [x] Phase 5: Tauri desktop version with full file system access
- [x] Phase 6: Migration from Go to Rust backend
- [x] Phase 7: State persistence and file restoration
- [x] Phase 8: Code refactoring and architecture improvements
- [x] Phase 8.1: Interactive checkboxes with preview synchronization
- [ ] Phase 9: User Experience & Core Features
- [ ] Phase 10: Advanced Editor Features
- [ ] Phase 11: Export & Sharing Features
- [ ] Phase 12: Performance & Polish

### Phase 9: User Experience & Core Features

#### 1. Enhanced Settings Panel

- [x] Advanced settings panel with categories
- [x] Customizable editor themes and syntax highlighting
- [x] User preferences persistence

#### 2. Recent Files & Navigation

- [x] Recent files list
- [x] Quick file switching
- [x] File history tracking

#### 3. Advanced Editor Features

- [ ] Multiple cursor support
- [ ] Code folding for Markdown
- [ ] Enhanced text selection

#### 4. Help & Documentation

- [x] Welcome screen and tutorials
- [x] In-app help system
- [x] Feature guides and tips
- [x] Context-sensitive help

### Phase 10: Advanced Editor Features

#### 1. Enhanced Variable System

- [ ] Variable validation and error handling
- [ ] Nested variable support
- [ ] Variable templates and presets
- [ ] Variable usage statistics
- [ ] Import/export variable sets

#### 2. Performance Optimizations

- [ ] Large file handling improvements
- [ ] Memory usage optimization
- [ ] Startup time reduction
- [ ] Real-time preview performance tuning
- [ ] Lazy loading for large documents

#### 3. Error Handling and Stability

- [ ] Comprehensive error handling
- [ ] Crash recovery
- [ ] Data backup and recovery
- [ ] Logging and debugging tools

### Phase 11: Export & Sharing Features

#### 1. Export Formats

- [ ] PDF export
- [ ] Multiple export formats (HTML, PDF, DOCX)
- [ ] Custom export templates
- [ ] Print support

#### 2. Sharing & Collaboration

- [ ] Share functionality
- [ ] Export sharing options

### Phase 12: Performance & Polish

#### 1. User Experience Enhancements

- [ ] Keyboard shortcuts reference
- [ ] Context menus and right-click actions
- [ ] Drag and drop file support
- [ ] User feedback system
- [ ] Custom CSS for preview styling

#### 2. Final Polish

- [ ] Application icons and branding
- [ ] Installer creation
- [ ] Documentation completion
- [ ] Performance testing
- [ ] User acceptance testing
