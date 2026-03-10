import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress console.error/warn output during tests.
// Source code uses these for expected error-handling paths, and
// they clutter test output without providing useful information.
// Individual tests can still spy on console.error if they need to
// assert that it was called.
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
