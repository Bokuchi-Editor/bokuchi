# Cross-Compilation for Windows on Mac - Troubleshooting Guide

## Overview

This document summarizes potential issues and their solutions when cross-compiling the Bokuchi application for Windows from a macOS environment.

## Prerequisites

### Required Tools

```bash
# Install via Homebrew
brew install mingw-w64 llvm nsis

# Add Rust Windows target
rustup target add x86_64-pc-windows-gnu
```

### Environment Variables

```bash
# Add llvm-rc to PATH
export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
```

## Common Issues and Solutions

### 1. `can't find crate for 'core'` Error

**Symptoms:**

```
error[E0463]: can't find crate for `core`
  |
  = note: the `x86_64-pc-windows-gnu` target may not be installed
  = help: consider downloading the target with `rustup target add x86_64-pc-windows-gnu`
```

**Cause:**
This occurs when Homebrew-installed Rust and rustup-managed Rust are mixed.

**Solution:**

1. **Check current Rust status:**

   ```bash
   which rustc
   which cargo
   rustc --version
   rustup --version
   ```

2. **If using Homebrew Rust, switch to rustup:**

   ```bash
   # Uninstall Homebrew Rust
   brew uninstall rust

   # Install rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env

   # Add Windows target
   rustup target add x86_64-pc-windows-gnu
   ```

### 2. `linker 'x86_64-w64-mingw32-gcc' not found` Error

**Symptoms:**

```
error: linker `x86_64-w64-mingw32-gcc` not found
```

**Cause:**
The MinGW-w64 cross-compiler is not properly installed or not in PATH.

**Solution:**

1. **Install MinGW-w64:**

   ```bash
   brew install mingw-w64
   ```

2. **Verify installation:**

   ```bash
   x86_64-w64-mingw32-gcc --version
   ```

3. **If not found, add to PATH:**
   ```bash
   export PATH="/opt/homebrew/bin:$PATH"
   ```

### 3. `llvm-rc` Not Found Error

**Symptoms:**

```
error: failed to run custom build command for `embed-resource v3.0.5`
error: process didn't exit successfully: `llvm-rc` (exit code: 127)
```

**Cause:**
The `llvm-rc` tool is not available in PATH.

**Solution:**

1. **Install LLVM:**

   ```bash
   brew install llvm
   ```

2. **Add to PATH:**

   ```bash
   export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"
   ```

3. **Verify installation:**
   ```bash
   llvm-rc --version
   ```

### 4. NSIS Installer Creation Fails

**Symptoms:**

```
error: failed to bundle project: error running bundle_nsis.sh
```

**Cause:**
NSIS is not installed or not properly configured.

**Solution:**

1. **Install NSIS:**

   ```bash
   brew install nsis
   ```

2. **Verify installation:**
   ```bash
   makensis --version
   ```

### 5. WebView2 Runtime Issues

**Symptoms:**

```
error: WebView2 runtime not found
```

**Cause:**
The WebView2 runtime is required for Tauri applications on Windows.

**Solution:**

1. **Download WebView2 runtime:**

   - Download from Microsoft's official site
   - Or use the bundled version in the build output

2. **Verify in build output:**
   ```bash
   ls src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
   # Should include WebView2Loader.dll
   ```

## Build Process

### Complete Build Command

```bash
# Set environment variables
export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"

# Build for Windows
npm run tauri build -- --target x86_64-pc-windows-gnu
```

### Build Script

Create a build script for easier cross-compilation:

```bash
#!/bin/bash
# build-windows.sh

echo "🍎 Building Windows version from macOS..."

# Set environment variables
export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"

# Verify tools
echo "🔍 Verifying tools..."
x86_64-w64-mingw32-gcc --version
llvm-rc --version
makensis --version

# Build
echo "🔨 Building..."
npm run tauri build -- --target x86_64-pc-windows-gnu

echo "✅ Build complete!"
```

## Verification

### Check Build Output

```bash
# Check if Windows executable was created
ls -la src-tauri/target/x86_64-pc-windows-gnu/release/

# Check installer
ls -la src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
```

### Test on Windows

1. Copy the installer to a Windows machine
2. Run the installer
3. Verify the application launches correctly

## Environment Setup Script

Create a setup script for consistent environment:

```bash
#!/bin/bash
# setup-cross-compile.sh

echo "🔧 Setting up cross-compilation environment..."

# Install required tools
brew install mingw-w64 llvm nsis

# Add Rust Windows target
rustup target add x86_64-pc-windows-gnu

# Set environment variables
echo 'export PATH="/opt/homebrew/Cellar/llvm/21.1.0/bin:$PATH"' >> ~/.zshrc

echo "✅ Setup complete! Please restart your terminal or run:"
echo "   source ~/.zshrc"
```

## Troubleshooting Checklist

- [ ] Rust is installed via rustup (not Homebrew)
- [ ] Windows target is added: `rustup target add x86_64-pc-windows-gnu`
- [ ] MinGW-w64 is installed: `brew install mingw-w64`
- [ ] LLVM is installed: `brew install llvm`
- [ ] NSIS is installed: `brew install nsis`
- [ ] Environment variables are set correctly
- [ ] All tools are in PATH

## Additional Resources

- [Rust Cross-Compilation Guide](https://rust-lang.github.io/rustup/cross-compilation.html)
- [Tauri Cross-Platform Build](https://tauri.app/v1/guides/building/cross-platform/)
- [MinGW-w64 Documentation](https://www.mingw-w64.org/)

---

**Last Updated**: September 10, 2025
**Version**: 1.0
