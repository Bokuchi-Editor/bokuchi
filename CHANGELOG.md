# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.8.0...HEAD)

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

