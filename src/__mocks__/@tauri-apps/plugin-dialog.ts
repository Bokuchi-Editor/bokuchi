import { vi } from 'vitest';

export const open = vi.fn().mockResolvedValue(null);
export const save = vi.fn().mockResolvedValue(null);
export const message = vi.fn().mockResolvedValue(undefined);
export const ask = vi.fn().mockResolvedValue(false);
export const confirm = vi.fn().mockResolvedValue(false);
