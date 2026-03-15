# Security Management

## Overview

This project ignores or tolerates several security warnings due to Tauri framework constraints. While these warnings do not pose direct security risks, they may be resolved through Tauri updates, requiring regular monitoring.

## Ignored Warnings

### Rust (Cargo) Side

#### 1. glib-related Warning (RUSTSEC-2024-0429)

**Issue**: glib 0.18.5 has an unsoundness problem
**Impact**: `glib::VariantStrIter`'s `Iterator` and `DoubleEndedIterator` implementation
**Current Status**: Unable to update to glib 0.20.0 due to Tauri dependencies

**Response Strategy**:

- Ignore glib updates in Dependabot
- Explicitly ignore RUSTSEC-2024-0429 in cargo audit
- Wait for Tauri to support glib 0.20.0

**Risk Assessment**: Low risk (does not directly affect core application functionality)

#### 2. GTK3-related Warnings (RUSTSEC-2024-0411~0420)

**Impact**: `atk`, `atk-sys`, `gdk`, `gdk-sys`, `gdkwayland-sys`, `gdkx11`, `gdkx11-sys`, `gtk`, `gtk-sys`, `gtk3-macros`
**Reason**: GTK3 bindings are unmaintained
**Response**: Direct replacement is impossible as Tauri's WebView engine (wry) depends on GTK3. These warnings are tolerated in CI (non-blocking).

#### 3. Other Unmaintained Dependencies

The following libraries are unmaintained but cannot be directly controlled due to Tauri dependencies. These are tolerated in CI (non-blocking).

- **fxhash** (RUSTSEC-2025-0057): Used via `selectors`
- **proc-macro-error** (RUSTSEC-2024-0370): Used via `gtk3-macros`

### npm Side

#### dompurify XSS Vulnerability (GHSA-v2wj-7wpq-c8vv)

**Issue**: dompurify XSS vulnerability (transitive dependency via monaco-editor)
**Current Status**: No upstream fix available yet — allowlisted in CI until dompurify > 3.3.1 is released
**Risk Assessment**: Low risk (Monaco editor sanitizes inputs internally)

## Current Dependency Versions

| Dependency | Version | Notes |
|---|---|---|
| Tauri | 2.10.3 | Core framework |
| wry | 0.54.1 | WebView engine (depends on GTK3 on Linux) |
| glib | 0.18.5 | Cannot update due to Tauri constraints |
| gtk | 0.18.2 | GTK3 bindings (unmaintained) |
| dompurify | via monaco-editor | Transitive dependency |

## CI Workflows

### 1. Security Audit (`security-audit.yml`)

- **Schedule**: Every Monday at 9:00 AM JST
- **Triggers**: Weekly schedule, pull requests to main, manual dispatch
- **Actions**:
  - npm audit via `audit-ci` (allowlists GHSA-v2wj-7wpq-c8vv)
  - `cargo audit` (explicitly ignores RUSTSEC-2024-0429, other warnings are non-blocking)
  - Rust tests
  - Outdated package checks for both npm and Cargo

### 2. Dependabot (`dependabot.yml`)

- **Schedule**: Every Monday at 9:00 AM JST
- **Ecosystems**: npm, Cargo, GitHub Actions
- **Ignore Rules**:
  - Major version updates for all packages (manual review required)
  - Major version updates for Tauri and Tauri plugins (cautious updates)
  - All updates for glib (blocked by Tauri constraints)

### 3. Dependabot Test (`dependabot-test.yml`)

- **Trigger**: Pull requests from Dependabot
- **Actions**: Lint, type-check, Rust tests, build test, security audit
- **Result**: Automatically comments on PR with pass/fail status

### 4. Auto-merge Dependabot (`auto-merge-dependabot.yml`)

- **Scope**: Patch version updates only
- **Action**: Enables auto-merge (squash) for Dependabot PRs with patch-level updates

### 5. Tauri Update Monitor (`tauri-update-monitor.yml`)

- **Schedule**: Every Tuesday at 10:00 AM JST
- **Actions**:
  - Checks for Tauri updates via `cargo outdated`
  - Checks glib compatibility
  - Creates a GitHub issue if updates are available

## Response Strategy

### Regular Verification

- Check the status of warnings approximately once a month
- Verify warning status when new Tauri versions are released

### Future Response

- Consider response when Tauri updates these dependencies in new versions
- Consider response if Tauri migrates to GTK4 or other UI libraries in the future
- Monitor dompurify fix upstream and remove allowlist once resolved

## Technical Details

### Cargo Audit Command (CI)

```bash
cargo audit --ignore RUSTSEC-2024-0429
```

Other warnings (GTK3, fxhash, proc-macro-error) are tolerated as non-blocking in CI.

### npm Audit Command (CI)

```bash
npx audit-ci --moderate --allowlist GHSA-v2wj-7wpq-c8vv
```

### Dependabot Ignore Configuration (glib)

```yaml
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
- 2026-03-06: Updated to reflect current CI configuration and dependency versions
- 2026-03-06: Added npm dompurify vulnerability (GHSA-v2wj-7wpq-c8vv)
- 2026-03-06: Added CI workflow details and auto-merge Dependabot documentation

---

**Last Updated**: March 6, 2026
**Version**: 2.0
