import { vi } from 'vitest';

const mockStore = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  length: vi.fn().mockResolvedValue(0),
  has: vi.fn().mockResolvedValue(false),
  onKeyValueChange: vi.fn().mockResolvedValue(vi.fn()),
};

export const load = vi.fn().mockResolvedValue(mockStore);
export const Store = vi.fn().mockImplementation(() => mockStore);
export const LazyStore = vi.fn().mockImplementation(() => mockStore);
