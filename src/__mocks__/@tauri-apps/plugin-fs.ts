import { vi } from 'vitest';

export const readFile = vi.fn().mockResolvedValue(new Uint8Array());
export const writeFile = vi.fn().mockResolvedValue(undefined);
export const readTextFile = vi.fn().mockResolvedValue('');
export const writeTextFile = vi.fn().mockResolvedValue(undefined);
export const exists = vi.fn().mockResolvedValue(false);
export const mkdir = vi.fn().mockResolvedValue(undefined);
export const readDir = vi.fn().mockResolvedValue([]);
export const remove = vi.fn().mockResolvedValue(undefined);
export const rename = vi.fn().mockResolvedValue(undefined);
export const stat = vi.fn().mockResolvedValue({});
export const BaseDirectory = {
  AppData: 'AppData',
  Desktop: 'Desktop',
  Document: 'Document',
  Home: 'Home',
};
