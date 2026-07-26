# Development Guide

How to build, run, and test Bokuchi locally.

## Prerequisites

- Node.js 18+
- Rust (for Tauri)
- Platform-specific build tools:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: Build essentials (gcc, make, etc.)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run tauri:dev
   ```

## Commands

```bash
# Development
npm run tauri:dev      # Start desktop app (with lint + type-check)
npm run dev            # Vite dev server only

# Quality checks
npm run check          # Run both ESLint and TypeScript checks
npm run lint           # Run ESLint only
npm run type-check     # Run TypeScript type checking only

# Build
npm run build          # TypeScript + Vite build
npm run tauri:build    # Production native app build
```

## Testing

```bash
npm run test:all           # Run all tests (Rust + TypeScript)
npm run test:unit          # Run TypeScript unit tests (Vitest)
npm run test:rust          # Run Rust unit tests
npm run test:unit:coverage # Run TypeScript tests with coverage report
```

For details on test tiers, file locations, and CI configuration, see [TESTING.md](TESTING.md).

## Building for Production

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

## Further Documentation

- [Testing Guide](TESTING.md) — Test architecture, running tests, CI
- [Menu System Guide](MENU_SYSTEM_GUIDE.md) — Menu architecture and customization
- [Security](SECURITY.md) — Security policy and reporting
- [Cross Compile Troubleshooting](CROSS_COMPILE_TROUBLESHOOTING.md)
- [macOS Notarization Guide](MACOS_NOTARIZATION_GUIDE.md)
- [Version Update Checklist](VERSION_UPDATE_CHECKLIST.md)
- [Monkey Test Case](MONKEY_TEST_CASE.md) — Manual UI integration test cases
