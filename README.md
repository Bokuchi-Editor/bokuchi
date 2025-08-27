えらーめっせーじ x# MD Editor

A lightweight, cross-platform Markdown editor built with Tauri, React, and Go.

## Features

- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Lightweight**: Built with Tauri for minimal resource usage
- **Real-time preview**: Live Markdown preview with syntax highlighting
- **Dark/Light mode**: Toggle between themes
- **Variable system**: Support for custom variables in Markdown
- **Tab management**: Multiple files editing with tabs
- **Search and replace**: Built-in search functionality
- **HTML export**: Export preview as HTML files

## Current Status

### Web Version (Current)

- ✅ Basic Markdown editor with real-time preview
- ✅ Variable system (file-local and global variables)
- ✅ Tab management
- ✅ Search and replace functionality
- ✅ Dark/Light mode
- ✅ HTML export
- ⚠️ File operations: Download/Upload via browser (limited by browser security)

### Desktop Version (Current)

- ✅ Full file system access
- ✅ Native file operations
- ✅ System integration
- ✅ Offline functionality
- ✅ All web version features

## Development

### Prerequisites

- Node.js 18+
- Go 1.21+
- Rust (for Tauri)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd backend && go mod tidy
   ```
3. Start development server:

   ```bash
   # Start backend
   cd backend && go run .

   # Start frontend (in another terminal)
   npm run dev
   ```

### Docker Development

For consistent development environment:

```bash
docker-compose up
```

### Desktop Development

For Tauri desktop version:

```bash
npm run tauri:dev
```

## Project Structure

```
md-editor/
├── src/                 # React frontend
│   ├── components/      # React components
│   ├── hooks/          # Custom hooks
│   ├── reducers/       # State management
│   ├── types/          # TypeScript types
│   ├── api/            # API clients
│   └── App.tsx         # Main app component
├── backend/            # Go backend
│   ├── main.go        # Backend server
│   └── variables.go   # Variable processing
├── src-tauri/         # Tauri configuration
└── docker-compose.yml # Docker development setup
```

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

- [x] Phase 1: Basic Markdown editor (reading, saving, preview)
- [x] Phase 2: Syntax highlighting and dark mode
- [x] Phase 3: Variable functionality
- [x] Phase 4: Tab functionality and search/replace
- [x] Phase 5: Tauri desktop version with full file system access
- [ ] Phase 6: Advanced features and optimizations

### Phase 6: Advanced Features and Optimizations

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
