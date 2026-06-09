# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.9.1...HEAD)

## [0.9.1](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.9.0...v0.9.1) - 2026-06-09

### Security

- Markdown preview now sanitizes embedded HTML before rendering. `<script>`, event-handler attributes (`onerror`, `onload`, …) and `javascript:` URLs are stripped via DOMPurify on both the live preview and the HTML export path, where previously raw HTML present in a Markdown file was injected as-is.
- Hardened the preview against CSS-injection UI redressing ([GHSA-5qr5-6vh4-6g2j](https://github.com/Bokuchi-Editor/bokuchi/security/advisories/GHSA-5qr5-6vh4-6g2j)). Overlay positioning (`position: fixed/absolute/sticky`, including `var()`-indirected and `!important` variants) is stripped from inline `style`, `<style>` blocks are forbidden, and the preview pane establishes a CSS containing block / stacking context as defense-in-depth. A crafted file can no longer cover the application with a full-screen overlay or fake dialog, run scripts, or lock the user out of the UI. The same sanitization protects exported HTML.

## [0.9.0](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.5...v0.9.0) - 2026-06-07

### Added

- Visual table editing: edit Markdown tables directly in both the editor and the preview. A dedicated table edit modal plus inline cell editing (multi-line text areas) let you add/remove rows and columns and edit cells, backed by new `tableFormatter` / `tableEditorActions` utilities that write normalized Markdown back. A table action was also added to the editor toolbar
- Auto-hiding vertical tab bar that stays tucked away and slides out on hover, plus a new focus mode (Rin, 臨) that maximizes the editing area by hiding the surrounding UI
- Four new color themes: Dawn, Twilight, Silk, and Ink (with full MUI palette and CSS-variable coverage)
- Marp: configurable theme directory and support for loading external CSS files, so slides can use custom themes beyond the built-ins
- Option to choose the placement of the Add Tab (New) button, including directly below the currently open tab
- Setting to show or hide the Markdown formatting toolbar
- Frequently used settings surfaced directly in the status bar for quicker access

### Changed

- Scroll synchronization now defaults to two-way (previously one-way)
- Inline table cell editing in Live mode switched from a single-line text box to a multi-line text area
- Large internal refactor for separation of concerns: `Preview.tsx` and `Settings.tsx` were split into focused hooks (`src/components/preview/*`) and per-tab settings components (`src/components/settings/*`); removed dead code along the way
- Dependency updates: dev-side bumps for the `vite` group (vite 7.3.3 → 7.3.5, vite-plugin-checker 0.13.0 → 0.14.1), the `vitest` group (vitest / `@vitest/coverage-v8` 4.1.7 → 4.1.8), the `typescript-eslint` group (8.59.4 → 8.60.0), and `eslint` (10.4.0 → 10.4.1)

### Fixed

- Fixed a bug that could cause tabs to misbehave while being dragged to reorder them

## [0.8.5](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.4...v0.8.5) - 2026-06-01

### Changed

- Pinned `katex` to the `0.16.x` line and added a dependabot ignore rule for it: KaTeX 0.17.0 throws an unsuppressable `TypeError` when an accent command (`\tilde`, `\hat`, …) wraps a command that has its own `htmlBuilder` (e.g. `\mathbf`)
- `processKatex` now renders math to inert placeholders **before** `marked` runs and swaps the rendered HTML back in afterward (in both the preview and HTML export), so KaTeX output can never collide with Markdown syntax such as GFM strikethrough (`~…~`) or table cell separators (`|`)
- Hardened the `process_markdown` / `get_expanded_markdown` Tauri commands with `catch_unwind` so a panic in variable processing surfaces as a command error instead of taking down the whole app process
- Removed the now-unused `processRenderingExtensions` helper
- Dependency updates: dev-side bumps for the `vitest` group (4.1.6 → 4.1.7), the `typescript-eslint` group (8.59.3 → 8.59.4) and `@types/react` (19.2.14 → 19.2.15); Rust-side bumps for `serde_json` (1.0.149 → 1.0.150) and the indirect `tar` (0.4.45 → 0.4.46)

### Fixed

- Fixed math formulas breaking the preview or rendering blank — two separate issues with the same root cause: KaTeX accent output (a literal `~`) being paired by GFM strikethrough across two expressions and injecting `<del>` into the math markup (#354), and single-bar absolute values like `$|x - y|$` inside a table being split into extra cells by the table parser (#358). Both are resolved by the placeholder pipeline above
- Fixed a panic that crashed the app on every keystroke producing `<!-- @var -->`: the prefix's trailing space and the suffix's leading space are the same character, so the previous `strip_prefix(...).unwrap().strip_suffix(...).unwrap()` chain underflowed. Now guarded by a length check that slices the comment body directly
- Marp front matter is now only detected at the very start of the document — a `marp: true` example shown inside a fenced code block or in body text no longer switches the file into Marp mode
- Mermaid no longer leaves stray empty elements (a bare `<svg>`, `#cy`, `.mermaidTooltip`, etc.) at the bottom of the window; `cleanupMermaidArtifacts()` sweeps them after every render pass, fixing the mystery element that appeared during fullscreen/layout transitions

## [0.8.4](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.3...v0.8.4) - 2026-05-21

### Changed

- Closing multiple tabs at once no longer silently skips tabs with unsaved changes — the bulk-close flow in `useAppState` / `useFileOperations` now loops through dirty tabs and shows a save prompt for each one
- Editor mode toggle keyboard shortcut moved to Cmd/Ctrl+Shift+D (was conflicting with another shortcut on Windows); Help text and keyboard-shortcut tests updated
- Dependency updates: `katex` 0.16.45 → 0.16.47, `tauri` 2.11.1 → 2.11.2, `tauri-build` 2.6.1 → 2.6.2, plus dev-side bumps for `eslint` 10.3.0 → 10.4.0 and `@tauri-apps/cli` 2.11.1 → 2.11.2
- Security: tightened `npm-audit-allowlist` after the dependency review (`.github/workflows/security-audit.yml`)

### Fixed

- Marp continuous-mode preview scrollbar no longer jumps back to the first slide on every keystroke — `MarpPreview` now captures `srcDoc` once per session and applies subsequent content/CSS updates imperatively via DOM mutation inside a `useLayoutEffect`, preserving the user's scroll position; extracted `buildContinuousStyleContent` as the single source of truth for the continuous-mode stylesheet, with regression tests guarding it against `buildAllSlidesDocument`

## [0.8.3](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.2...v0.8.3) - 2026-05-18

### Added

- Configurable table column width — choose how Markdown table columns are sized in both the preview and the exported HTML (equal widths, fit-to-content with wrapping, or fit-to-content with horizontal scroll); new setting `tableLayout` with translations across all 14 locales

### Changed

- Brightened the Darcula theme code block background (`#2B2B2B` → `#3C3F41`) so syntax-highlighted code is easier to read
- Dependency updates: `mermaid` 11.14.0 → 11.15.0, `react` 19.2.5 → 19.2.6, `@mui/icons-material` 7.3.10 → 7.3.11, plus dev-side bumps for `vite`, `@tauri-apps/cli`, the `vitest` group, and the `typescript-eslint` group; removed the obsolete `uuid` package override

### Fixed

- Mermaid code blocks now render as diagrams inside Marp slides instead of being emitted as raw `<pre><code>` markup; the Marp render path now invokes `processMermaidBlocks` (dark-mode aware, with sizing CSS for the iframe srcdoc), and the mermaid block regex was loosened to match Marp's `<pre is="marp-pre" data-auto-scaling="…">` output in addition to the plain `<pre>` emitted by `marked`

## [0.8.2](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.1...v0.8.2) - 2026-05-07

### Added

- Rendering-disabled notice — when a file contains KaTeX, Mermaid, or Marp content but the corresponding rendering option is off, a one-time notification points the user at the relevant setting

### Changed

- Tab tooltip now shows the full file path on hover, making same-name tabs easier to tell apart
- Dependency updates: `tauri` 2.10.3 → 2.11.1, `@tauri-apps/api` 2.10.1 → 2.11.0, `@tauri-apps/cli` 2.10.1 → 2.11.0, `@tauri-apps/plugin-dialog` 2.7.0 → 2.7.1, `@tauri-apps/plugin-fs` 2.5.0 → 2.5.1, `@tauri-apps/plugin-opener` 2.5.3 → 2.5.4, `@tauri-apps/plugin-store` 2.4.2 → 2.4.3, `tauri-plugin-dialog` / `tauri-plugin-opener` / `tauri-plugin-store` / `tauri-plugin-single-instance` (Rust-side counterparts), `eslint` 10.2.1 → 10.3.0

### Fixed

- Esc key now reliably exits Marp slideshow fullscreen mode
- Preview checkbox toggle did not always propagate the change back to the document

## [0.8.1](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.0...v0.8.1) - 2026-04-30

### Changed

- Auto-update check is now throttled to once every 24 hours (persisted across launches) instead of running on every launch

### Fixed

- Marp slideshow fullscreen now respects the current slide instead of always starting at the first slide
- Marp preview scrollbar not appearing immediately after launching the application
- Links inside Marp slides are now always opened in the OS browser instead of navigating inside the slide iframe
- Save and tab restore reliability on Windows for files opened via OS file association from outside the user's Documents/Desktop/Downloads folders (also surfaces the underlying OS error in the failure message)
- Windows-only race condition where rapid keystrokes during slow IPC could replace the document with stale content and jump the cursor to the end of the file
- Preview link and checkbox listeners not attaching after switching from a Marp tab to a non-Marp tab
- Duplicate file detection now matches paths case-insensitively, so the same file no longer opens in two tabs on Windows / default macOS volumes

## [0.8.0](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.7.2...v0.8.0) - 2026-04-19

### Added

- Marp presentation preview — render Markdown with `marp: true` front-matter as slide presentations (gated by a new `enableMarp` setting)
- Tab context menu (right-click) — pin/unpin, rename, copy path/filename, close other/right/all tabs
- Tab pinning — pinned tabs are excluded from bulk close
- Tab rename — rename saved files on disk or change the title of unsaved tabs
- Auto tab title from the first line for unsaved buffers
- Tab close-button position setting (left/right)
- Scroll sync mode option (one-way (default) / bidirectional / off) for split view
- Redesigned Split/Editor/Preview view-mode toggle icons and refreshed app editor icon

### Changed

- Refactoring: extracted shared utilities (`imagePathResolver`, `marpImageInliner`, `marpSlideRanges`, `useResizableSidebar`, layout/language constants) and hoisted magic numbers
- i18n: all 14 locales updated for the new features and settings
- Dependency updates (React, MUI icons, TypeScript-ESLint, Vitest, DOMPurify, @marp-team/marp-core, and others)

### Fixed

- External file changes not loaded correctly in preview mode (when the editor was unmounted)
- Image loading edge cases in Marp mode
- Preview scroll position not preserved across tab switches

## [0.7.2](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.7.1...v0.7.2) - 2026-04-11

### Fixed

- File change detection not working properly on Windows

## [0.7.1](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.7.0...v0.7.1) - 2026-04-07

### Fixed

- Undo/redo affecting all tabs instead of only the focused tab
- KaTeX math expressions inside Markdown table cells rendering as raw SVG path strings
- Search & Replace shortcut (Cmd+H / Ctrl+H) not showing the replace input field
- Image links in preview navigating within the app instead of opening in an external browser

## [0.7.0](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.6.1...v0.7.0) - 2026-03-29

### Added

- KaTeX math rendering support (`$...$` and `$$...$$` syntax) with toggle in Settings
- Mermaid diagram rendering support (```mermaid blocks) with dark-mode aware theming
- Editor minimap, togglable in Settings
- Cross-tab search in Search & Replace panel
- Welcome screen (empty state) when no files are open
- File rename from folder tree context menu
- HTML export style improvements with theme-aware colors

### Changed

- Drag & drop migrated from HTML5 to Tauri native API for reliable file-path detection
- Cross-platform file association handling (was macOS-only)
- New tabs start with empty content instead of placeholder text
- Menu event debounce logic refactored and consolidated
- Search & Replace panel layout made responsive

### Fixed

- Closed tab caches not released immediately (memory leak)
- File association bug on Windows
- Several minor bugs discovered during integration testing

## [0.6.1](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.6.0...v0.6.1) - 2026-03-17

### Added

- What's New dialog — new features and changes are shown automatically after an update

### Changed

- Save feedback is now shown in the status bar instead of a pop-up notification
- Dependency updates (TypeScript-ESLint, Vitest coverage, i18next, Tauri, tempfile, undici, DOM Purify, ESLint, MUI, and others)
- Documentation and CI updates

### Fixed

- Preview checkboxes not reflecting changes when clicked

## [0.6.0](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.5.0...v0.6.0) - 2026-03-06

### Added

- Folder tree panel for browsing and opening files from a directory
- Outline panel for navigating headings in the current document
- License document

### Changed

- Improved link handling in preview (open external links via system browser)
- i18n translation updates for new features (all 14 languages)
- Dependency updates (ESLint, TypeScript-ESLint, i18next, Rollup, anyhow, and others)
- CI dependency updates (actions/checkout, actions/setup-node, actions/upload-artifact)

### Fixed

- Theme changes via the status bar not applying correctly
- Folder tree panel display and interaction issues

### Security

- Resolved known vulnerabilities and updated exclusion lists

## [0.5.0](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.4.1...v0.5.0) - 2025-02-22

### Added

- Automatic update feature
- i18n translation updates

### Changed

- Redesigned search and replace for easier use
- Refactoring and README maintenance
- Dependency updates (React, Tauri, ESLint, Vite, and others)

### Fixed

- Behavior when opening files via file association
- Focus not being applied correctly when opening files

