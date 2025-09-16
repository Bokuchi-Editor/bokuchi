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

### 6. NSIS Template and Icon Issues

**Symptoms:**

```
Error while loading icon from "..\..\..\..\..\icons\bokuchi.ico": can't open file
Error in script installer.nsi on line X -- aborting creation process
failed to bundle project: `No such file or directory (os error 2)`
```

**Cause:**
- NSIS template has incorrect file paths for icons
- Tauri's NSIS configuration conflicts with custom templates
- File paths are relative to NSIS execution directory, not project root

**Solution:**

1. **Fix NSIS template paths:**
   - Icons should use relative paths from NSIS execution directory
   - Use `..\..\..\..\..\icons\bokuchi.ico` format for Windows paths
   - Verify file existence before referencing

2. **Avoid Tauri NSIS configuration conflicts:**
   - Remove custom NSIS settings from `tauri.conf.json` if causing issues
   - Let Tauri handle NSIS generation, then manually move files if needed

3. **Verify file paths:**
   ```bash
   # Check NSIS execution directory
   cd src-tauri/target/x86_64-pc-windows-gnu/release/nsis/x64
   ls -la ../../../../../icons/
   # Should show bokuchi.ico and other icon files
   ```

4. **Use absolute paths in NSIS template if relative paths fail:**
   ```nsis
   !define MUI_ICON "C:\full\path\to\icons\bokuchi.ico"
   ```

### 7. Tauri NSIS Bundle Process Failures

**Symptoms:**

```
failed to bundle project: `No such file or directory (os error 2)`
Error failed to bundle project: `No such file or directory (os error 2)`
```

**Cause:**
- Tauri cannot find or move the generated NSIS installer
- Output directory structure mismatch
- NSIS generates files in unexpected locations

**Solution:**

1. **Let Tauri handle NSIS generation:**
   - Remove custom NSIS configuration from `tauri.conf.json`
   - Use Tauri's default NSIS process

2. **Manual file handling if needed:**
   ```bash
   # Check where Tauri generates the installer
   find src-tauri/target -name "*.exe" -type f

   # Move to expected location if needed
   mkdir -p src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis
   mv src-tauri/target/x86_64-pc-windows-gnu/release/nsis/x64/Bokuchi_*.exe \
      src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
   ```

3. **Verify final output:**
   ```bash
   ls -la src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
   # Should contain Bokuchi_0.4.0_x64-setup.exe
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
- [ ] NSIS template file paths are correct relative to execution directory
- [ ] Icon files exist and are accessible from NSIS execution directory
- [ ] Tauri NSIS configuration doesn't conflict with custom templates
- [ ] Generated installer is in expected location (`bundle/nsis/`)

## Additional Resources

- [Rust Cross-Compilation Guide](https://rust-lang.github.io/rustup/cross-compilation.html)
- [Tauri Cross-Platform Build](https://tauri.app/v1/guides/building/cross-platform/)
- [MinGW-w64 Documentation](https://www.mingw-w64.org/)

## Key Lessons Learned

### NSIS Template Development
1. **File Paths**: Always use relative paths from NSIS execution directory (`nsis/x64/`)
2. **Icon Format**: Use `.ico` files for `MUI_ICON`, avoid unsupported formats
3. **Path Verification**: Test file paths before referencing in templates
4. **Tauri Integration**: Avoid conflicting NSIS configurations in `tauri.conf.json`

### Build Process Optimization
1. **Let Tauri Handle NSIS**: Remove custom NSIS configs to avoid conflicts
2. **File Movement**: Use build scripts to move generated files to expected locations
3. **Error Handling**: Always verify file existence before operations
4. **Debugging**: Use verbose logging to identify exact failure points

### Common Pitfalls to Avoid
- ❌ Mixing Tauri's NSIS handling with custom templates
- ❌ Using absolute paths in NSIS templates
- ❌ Assuming file locations without verification
- ❌ Overcomplicating the build process
- ✅ Keep it simple: Let Tauri generate, manually move if needed
- ✅ Test each step independently
- ✅ Verify file paths and existence

---

**Last Updated**: September 16, 2024
**Version**: 2.0
