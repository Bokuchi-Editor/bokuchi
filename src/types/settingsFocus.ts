/**
 * Targets the Settings dialog can be opened to. Used to deep-link from UI
 * affordances (e.g. the "this feature is OFF" preview notice) directly to
 * the relevant toggle.
 */
export type SettingsFocusTarget =
  | 'rendering.enableMermaid'
  | 'rendering.enableMarp'
  | 'rendering.enableKatex';

/** Tab index inside the Settings dialog for each focus target. */
export const SETTINGS_FOCUS_TAB_INDEX: Record<SettingsFocusTarget, number> = {
  'rendering.enableMermaid': 4,
  'rendering.enableMarp': 4,
  'rendering.enableKatex': 4,
};

/** DOM element id wrapping each focus target's setting row. */
export const SETTINGS_FOCUS_ELEMENT_ID: Record<SettingsFocusTarget, string> = {
  'rendering.enableMermaid': 'setting-rendering-enableMermaid',
  'rendering.enableMarp': 'setting-rendering-enableMarp',
  'rendering.enableKatex': 'setting-rendering-enableKatex',
};
