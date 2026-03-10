# Testing Guide

This document describes the test architecture, how to run tests, and where test files are located.

## Test Tiers

The project has three tiers of tests. Day-to-day development only requires Tier 1 and 2.

| Tier | Scope | Tool | Build required |
|------|-------|------|---------------|
| 1 | Rust unit tests | `cargo test` | No |
| 2 | TypeScript unit / integration tests | Vitest + React Testing Library | No |
| 3 | E2E tests | (suspended) | Yes |

## Running Tests

### All Tests (Tier 1 + 2)

```bash
npm run test:all
```

This runs Rust unit tests (`cargo test`) followed by TypeScript unit + integration tests (Vitest).

### TypeScript Tests

```bash
npm run test:unit          # Single run
npm run test:unit:watch    # Watch mode (re-runs on file changes)
npm run test:unit:coverage # With coverage report (outputs to coverage/)
```

### Rust Tests

```bash
npm run test:rust          # Standard run
npm run test:rust:verbose  # With verbose output
```

> **Note:** Rust tests that touch global state (`FRONTEND_READY`, `PENDING_FILE_PATHS`) must run single-threaded. The npm scripts pass `--test-threads=1` automatically.

## Test File Locations

| Category | Location | Approx. count |
|----------|----------|---------------|
| Rust unit tests | `src-tauri/src/tests.rs` | 59 |
| TS utility tests | `src/utils/__tests__/*.test.ts` | 37 |
| TS API tests | `src/api/__tests__/*.test.ts` | 94+ |
| TS reducer tests | `src/reducers/__tests__/*.test.ts` | 16 |
| TS component tests | `src/components/__tests__/*.test.tsx` | 7 |
| TS theme tests | `src/themes/__tests__/*.test.ts` | 10 |
| TS integration tests | `src/__tests__/integration/*.test.tsx` | 30 |

## CI

Unit tests are run automatically on every pull request targeting `main`. See [`.github/workflows/unit-tests.yml`](../.github/workflows/unit-tests.yml) for configuration.

Two jobs run in parallel:

- **TypeScript (Vitest)** — `npm run test:unit`
- **Rust (cargo test)** — `cargo test --verbose -- --test-threads=1`

If a new push is made to the same PR, the previous CI run is automatically cancelled.

## E2E Tests (Suspended)

E2E test code exists in `tests/e2e/` and `wdio.conf.ts` but is currently **not executable**. `tauri-driver` (the WebDriver proxy for Tauri apps) only supports Linux (WebKitGTK) and has compatibility concerns with Tauri v2. The npm scripts and wdio dependencies have been removed.

Test coverage for UI logic and component interactions is handled by Tier 1 & 2 (Vitest + RTL) instead.

## Test Strategy

For the full list of planned test cases and implementation strategy, see [TEST_STRATEGY.md](./TEST_STRATEGY.md).
