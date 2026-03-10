import { vi } from 'vitest';

const mockWindow = {
  setFocus: vi.fn().mockResolvedValue(undefined),
  setTitle: vi.fn().mockResolvedValue(undefined),
  onCloseRequested: vi.fn().mockResolvedValue(vi.fn()),
  onFocusChanged: vi.fn().mockResolvedValue(vi.fn()),
  listen: vi.fn().mockResolvedValue(vi.fn()),
  emit: vi.fn().mockResolvedValue(undefined),
};

export const getCurrentWindow = vi.fn().mockReturnValue(mockWindow);
export const Window = vi.fn().mockReturnValue(mockWindow);
