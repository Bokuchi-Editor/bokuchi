export type ViewMode = 'split' | 'editor' | 'preview';

const VIEW_MODES: ViewMode[] = ['split', 'editor', 'preview'];

/**
 * Rotate to the next view mode in the cycle: split → editor → preview → split.
 */
export const rotateViewMode = (currentMode: ViewMode): ViewMode => {
  const currentIndex = VIEW_MODES.indexOf(currentMode);
  const nextIndex = (currentIndex + 1) % VIEW_MODES.length;
  return VIEW_MODES[nextIndex];
};

/**
 * Calculate the next tab index in a circular fashion.
 */
export const getNextTabIndex = (
  currentIndex: number,
  tabsLength: number,
  direction: 'next' | 'prev' = 'next'
): number => {
  if (tabsLength === 0) return -1;
  if (direction === 'next') {
    return (currentIndex + 1) % tabsLength;
  } else {
    return (currentIndex - 1 + tabsLength) % tabsLength;
  }
};

/**
 * Calculate the scroll fraction from scroll parameters.
 */
export const calculateScrollFraction = (
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number => {
  const maxScroll = scrollHeight - clientHeight;
  return maxScroll > 0 ? scrollTop / maxScroll : 0;
};
