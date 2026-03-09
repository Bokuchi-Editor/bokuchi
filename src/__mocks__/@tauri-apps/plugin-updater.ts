import { vi } from 'vitest';

export const check = vi.fn().mockResolvedValue(null);
export const onUpdaterEvent = vi.fn().mockResolvedValue(vi.fn());
