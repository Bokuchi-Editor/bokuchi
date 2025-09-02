# Bokuchi

A lightweight, cross-platform Markdown editor built with Tauri, React, and Rust.

## Features

- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Lightweight**: Built with Tauri for minimal resource usage
- **Real-time preview**: Live Markdown preview with syntax highlighting
- **Dark/Light mode**: Toggle between themes
- **Variable system**: Support for custom variables in Markdown
- **Tab management**: Multiple files editing with tabs
- **Search and replace**: Built-in search functionality
- **HTML export**: Export preview as HTML files
- **Standalone**: No external dependencies or server required
- **State persistence**: Automatically saves and restores application state
- **Native file operations**: Full file system access with native dialogs
- **Dynamic port allocation**: Automatically finds available ports to prevent conflicts

## Current Status

### Desktop Version (Current)

- ✅ Full file system access with native dialogs
- ✅ Native file operations (Open, Save, Save As)
- ✅ System integration
- ✅ Offline functionality
- ✅ Variable system (file-local and global variables)
- ✅ Tab management with state persistence
- ✅ Search and replace functionality
- ✅ Dark/Light mode
- ✅ HTML export
- ✅ Standalone operation (no HTTP server)
- ✅ Application state persistence across sessions
- ✅ File not found handling for restored tabs

### Web Version (Legacy)

- ⚠️ Limited file operations (browser security restrictions)
- ⚠️ Requires HTTP server (Go backend)

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
   # Start desktop app
   npm run tauri:dev
   ```

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

# Windows
npm run tauri:build -- --target x86_64-pc-windows-msvc

# Linux
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

#### Build Output

After successful build, the application will be available in:

- **macOS**: `src-tauri/target/release/bundle/dmg/` (DMG installer)
- **Windows**: `src-tauri/target/release/bundle/msi/` (MSI installer)
- **Linux**: `src-tauri/target/release/bundle/appimage/` (AppImage)

#### Troubleshooting

**Common Build Issues:**

1. **TypeScript Errors**: Run `npm run build:desktop` to check for TypeScript errors
2. **Rust Dependencies**: Ensure Rust is up to date with `rustup update`
3. **Platform Tools**: Install required build tools for your platform
4. **Permissions**: Ensure proper file permissions in the project directory

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
md-editor/
├── src/                 # React frontend
│   ├── components/      # React components
│   │   ├── Editor.tsx   # Monaco editor component
│   │   ├── Preview.tsx  # Markdown preview
│   │   ├── TabBar.tsx   # Tab management
│   │   ├── SaveFileDialog.tsx # File save dialog
│   │   └── VariableSettings.tsx # Variable configuration
│   ├── hooks/          # Custom hooks
│   │   ├── useTabs.ts  # Tab management hook (web)
│   │   └── useTabsDesktop.ts # Tab management hook (desktop)
│   ├── reducers/       # State management
│   │   └── tabReducer.ts # Tab state reducer
│   ├── types/          # TypeScript types
│   │   └── tab.ts      # Tab and state types
│   ├── api/            # Tauri API clients
│   │   ├── desktopApi.ts # Desktop file operations
│   │   ├── fileApi.ts  # File operations (web)
│   │   ├── variableApi.ts # Variable processing
│   │   └── storeApi.ts # State persistence
│   ├── App.tsx         # Main app component (web)
│   └── AppDesktop.tsx  # Main app component (desktop)
└── src-tauri/          # Tauri configuration and Rust backend
    ├── src/lib.rs      # Rust backend (variables, file I/O, state persistence)
    ├── src/main.rs     # Tauri entry point
    ├── tauri.conf.json # Tauri configuration
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

## Roadmap

- [x] Phase 1: Basic Markdown editor (reading, saving, preview)
- [x] Phase 2: Syntax highlighting and dark mode
- [x] Phase 3: Variable functionality
- [x] Phase 4: Tab functionality and search/replace
- [x] Phase 5: Tauri desktop version with full file system access
- [x] Phase 6: Migration from Go to Rust backend
- [x] Phase 7: State persistence and file restoration
- [ ] Phase 8: Advanced features and optimizations

### Phase 8: Advanced Features and Optimizations

#### 1. Enhanced Settings and Customization

- [ ] Advanced settings panel with categories
- [ ] Customizable editor themes and syntax highlighting
- [ ] Configurable keyboard shortcuts
- [ ] User preferences persistence
- [ ] Custom CSS for preview styling

#### 2. Performance Optimizations

- [ ] Large file handling improvements
- [ ] Memory usage optimization
- [ ] Startup time reduction
- [ ] Real-time preview performance tuning
- [ ] Lazy loading for large documents

#### 3. Advanced Editor Features

- [ ] Auto-save functionality
- [ ] File change detection and reload
- [ ] Multiple cursor support
- [ ] Code folding for Markdown
- [ ] Git integration (show changes, diff view)

#### 4. Enhanced Variable System

- [ ] Variable validation and error handling
- [ ] Nested variable support
- [ ] Variable templates and presets
- [ ] Variable usage statistics
- [ ] Import/export variable sets

#### 5. User Experience Improvements

- [ ] Welcome screen and tutorials
- [ ] Keyboard shortcuts reference
- [ ] Context menus and right-click actions
- [ ] Drag and drop file support
- [ ] Recent files list

#### 6. Export and Sharing Features

- [ ] PDF export
- [ ] Multiple export formats (HTML, PDF, DOCX)
- [ ] Custom export templates
- [ ] Share functionality
- [ ] Print support

#### 7. Error Handling and Stability

- [ ] Comprehensive error handling
- [ ] Crash recovery
- [ ] Data backup and recovery
- [ ] Logging and debugging tools
- [ ] User feedback system

#### 8. Final Polish

- [ ] Application icons and branding
- [ ] Installer creation
- [ ] Documentation completion
- [ ] Performance testing
- [ ] User acceptance testing

## License

MIT
