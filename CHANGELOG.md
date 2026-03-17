# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/Bokuchi-Editor/bokuchi/compare/v0.6.1...HEAD)

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

