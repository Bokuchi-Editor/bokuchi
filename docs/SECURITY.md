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

#### Resolved: dompurify `CUSTOM_ELEMENT_HANDLING` Bypass (GHSA-c2j3-45gr-mqc4)

Resolved as of dompurify 3.4.12 (2026-07-24). The fix is applied through the **direct `dompurify` dependency + the `overrides` entry** in `package.json`, which forces the patched version into monaco-editor and mermaid.

**Pitfall — do NOT run `npm audit fix --force` for dompurify advisories**: monaco-editor pins an exact older dompurify version, and `npm audit fix` computes fixes **without considering `overrides`**. It therefore proposes downgrading monaco-editor to 0.53.0 (a breaking downgrade) even though bumping the direct `dompurify` dependency is sufficient. The correct fix is `npm update dompurify` (or bumping the direct dependency).

#### Resolved: dompurify XSS Vulnerability (GHSA-v2wj-7wpq-c8vv)

Resolved as of dompurify 3.4.11 (> 3.3.1). The CI allowlist entry has been removed.

## Current Dependency Versions

| Dependency | Version | Notes |
|---|---|---|
| Tauri | 2.11.5 | Core framework |
| wry | 0.55.1 | WebView engine (depends on GTK3 on Linux) |
| glib | 0.18.5 | Cannot update due to Tauri constraints |
| gtk | 0.18.2 | GTK3 bindings (unmaintained) |
| dompurify | 3.4.12 (direct + `overrides`) | Forced into monaco-editor / mermaid via `overrides` |

## CI Workflows

### 1. Security Audit (`security-audit.yml`)

- **Schedule**: Every Monday at 9:00 AM JST
- **Triggers**: Weekly schedule, pull requests to main, manual dispatch
- **Actions**:
  - npm audit via `audit-ci --moderate` (no allowlist; low-severity advisories are below the threshold. Currently 0 known vulnerabilities)
  - `cargo audit` (explicitly ignores RUSTSEC-2024-0429, other warnings are non-blocking)
  - Rust tests
  - Outdated package checks for both npm and Cargo

### 2. Dependabot (`dependabot.yml`)

- **Schedule**: Every Monday at 9:00 AM JST
- **Ecosystems**: npm, Cargo, GitHub Actions
- **Supply-chain hardening**: 3-day cooldown on all ecosystems (only updates to releases at least 3 days old, to avoid pulling a malicious release that gets yanked shortly after publication)
- **Ignore Rules**:
  - Major version updates for all packages (manual review required)
  - Major version updates for Tauri and Tauri plugins (cautious updates)
  - All updates for glib (blocked by Tauri constraints)
  - Minor/major updates for KaTeX (pinned to 0.16.x — 0.17.0 crashes with accent commands × `\mathbf`, see issue #354)

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
- Remove the `dompurify` override once monaco-editor and mermaid declare patched dompurify ranges themselves

## Technical Details

### Cargo Audit Command (CI)

```bash
cargo audit --ignore RUSTSEC-2024-0429
```

Other warnings (GTK3, fxhash, proc-macro-error) are tolerated as non-blocking in CI.

### npm Audit Command (CI)

```bash
npx audit-ci --moderate
```

Low-severity advisories are below the `--moderate` threshold and do not block CI.

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
- 2026-07-23: Marked GHSA-v2wj-7wpq-c8vv as resolved (dompurify 3.4.11, CI allowlist removed); added GHSA-c2j3-45gr-mqc4 (low, non-blocking); updated dependency versions (Tauri 2.11.5, wry 0.55.1); documented Dependabot cooldown and KaTeX pin
- 2026-07-24: Resolved GHSA-c2j3-45gr-mqc4 by updating dompurify to 3.4.12; documented the `npm audit fix --force` pitfall (proposes a breaking monaco-editor downgrade because audit ignores `overrides`)

---

**Last Updated**: July 24, 2026
**Version**: 2.2
