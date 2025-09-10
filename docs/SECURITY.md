# Security Management

## Overview

This project ignores several security warnings due to Tauri framework constraints. While these warnings do not pose direct security risks, they may be resolved through Tauri updates, requiring regular monitoring.

## Ignored Warnings

### 1. glib-related Warning (RUSTSEC-2024-0429)

**Issue**: glib 0.18.5 has an unsoundness problem
**Impact**: `glib::VariantStrIter`'s `Iterator` and `DoubleEndedIterator` implementation
**Current Status**: Unable to update to glib 0.20.0 due to Tauri dependencies

**Response Strategy**:

- Ignore glib updates in Dependabot
- Ignore RUSTSEC-2024-0429 in cargo audit
- Wait for Tauri to support glib 0.20.0

**Risk Assessment**: Low risk (does not directly affect core application functionality)

### 2. GTK3-related Warnings (RUSTSEC-2024-0411~0420)

**Impact**: `atk`, `atk-sys`, `gdk`, `gdk-sys`, `gdkwayland-sys`, `gdkx11`, `gdkx11-sys`, `gtk`, `gtk-sys`, `gtk3-macros`
**Reason**: GTK3 bindings are unmaintained
**Response**: Direct replacement is impossible as Tauri's WebView engine (wry) depends on GTK3

### 3. Other Unmaintained Dependencies

The following libraries are unmaintained but cannot be directly controlled due to Tauri dependencies:

- **derivative** (RUSTSEC-2024-0388): Used via `zbus`
- **fxhash** (RUSTSEC-2025-0057): Used via `selectors`
- **proc-macro-error** (RUSTSEC-2024-0370): Used via `gtk3-macros`

## Response Strategy

### 1. Warning Ignore Configuration

- Ignore warnings in GitHub Actions security audit workflow
- Apply similar settings in Dependabot test workflow

### 2. Monitoring System

- **Weekly Security Audits**: Automatically executed via GitHub Actions
- **Dependabot**: Automatically detects available updates
- **Tauri Updates**: Monitor Tauri updates with `tauri-update-monitor.yml`

### 3. Regular Verification

- Check the status of these warnings approximately once a month
- Verify warning status when new Tauri versions are released

### 4. Future Response

- Consider response when Tauri updates these dependencies in new versions
- Consider response if Tauri migrates to GTK4 or other UI libraries in the future

## Technical Details

### Ignore Configuration Command Example

```bash
cargo audit --ignore RUSTSEC-2024-0429 \
  --ignore RUSTSEC-2024-0411 --ignore RUSTSEC-2024-0412 \
  --ignore RUSTSEC-2024-0413 --ignore RUSTSEC-2024-0414 \
  --ignore RUSTSEC-2024-0415 --ignore RUSTSEC-2024-0416 \
  --ignore RUSTSEC-2024-0417 --ignore RUSTSEC-2024-0418 \
  --ignore RUSTSEC-2024-0419 --ignore RUSTSEC-2024-0420 \
  --ignore RUSTSEC-2024-0370 --ignore RUSTSEC-2024-0388 \
  --ignore RUSTSEC-2025-0057
```

### Dependabot Configuration

```yaml
# glib cannot be updated due to Tauri constraints (reconsider when Tauri updates)
- dependency-name: "glib"
  update-types:
    [
      "version-update:semver-major",
      "version-update:semver-minor",
      "version-update:semver-patch",
    ]
```

## Important Notes

These warnings are related to **unmaintained** or **unsoundness** issues and do not pose direct security risks. However, they may be resolved through Tauri updates, requiring regular verification.

## Update History

- 2025-09-10: Integrated and organized security documentation
- 2025-09-10: Added configuration to ignore glib unsoundness warnings
- 2025-09-10: Added configuration to ignore GTK3-related warnings

---

**Last Updated**: September 10, 2025
**Version**: 1.0
