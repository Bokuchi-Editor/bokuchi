/**
 * Platform detection utilities
 */

export type Platform = 'mac' | 'windows' | 'linux' | 'unknown';

/**
 * Get the current platform
 */
export const getPlatform = (): Platform => {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  // Check for macOS (including both Intel and Apple Silicon)
  if (userAgent.includes('mac') || platform.includes('mac')) {
    return 'mac';
  }

  // Check for Windows
  if (userAgent.includes('win') || platform.includes('win')) {
    return 'windows';
  }

  // Check for Linux
  if (userAgent.includes('linux') || platform.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
};

/**
 * Get the appropriate modifier key symbol for the current platform
 */
export const getModifierKey = (): string => {
  const platform = getPlatform();

  switch (platform) {
    case 'mac':
      return '⌘';
    case 'windows':
    case 'linux':
      return 'Ctrl';
    default:
      return 'Ctrl';
  }
};

/**
 * Get the appropriate shift key symbol for the current platform
 */
export const getShiftKey = (): string => {
  const platform = getPlatform();

  switch (platform) {
    case 'mac':
      return '⇧';
    case 'windows':
    case 'linux':
      return 'Shift';
    default:
      return 'Shift';
  }
};

/**
 * Format keyboard shortcut for the current platform
 */
export const formatKeyboardShortcut = (key: string, withShift = false): string => {
  const modifier = getModifierKey();
  const shift = withShift ? `+${getShiftKey()}` : '';

  return `${modifier}${shift}+${key}`;
};
