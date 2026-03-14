import { vi } from 'vitest';

/**
 * Cast a vi.fn() mock to a specific function type so it can be passed to props.
 * Use when TypeScript rejects Mock<...> for callback props (e.g. onClose: () => void).
 * The returned value is the same reference, so expect(mock).toHaveBeenCalled() still works.
 */
export function asMock<T>(fn: ReturnType<typeof vi.fn>): T {
  return fn as unknown as T;
}
