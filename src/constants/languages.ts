/**
 * Supported UI language options for the Settings dialog.
 * `value` matches the i18next language code; `translationKey` is the
 * i18n key under `settings.language.*` for the display name.
 */
export interface LanguageOption {
  value: string;
  translationKey: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', translationKey: 'settings.language.english' },
  { value: 'ja', translationKey: 'settings.language.japanese' },
  { value: 'zh-CN', translationKey: 'settings.language.chinese' },
  { value: 'zh-Hant', translationKey: 'settings.language.chineseTraditional' },
  { value: 'es', translationKey: 'settings.language.spanish' },
  { value: 'hi', translationKey: 'settings.language.hindi' },
  { value: 'ru', translationKey: 'settings.language.russian' },
  { value: 'ko', translationKey: 'settings.language.korean' },
  { value: 'pt-BR', translationKey: 'settings.language.portuguese' },
  { value: 'ar', translationKey: 'settings.language.arabic' },
  { value: 'fr', translationKey: 'settings.language.french' },
  { value: 'de', translationKey: 'settings.language.german' },
  { value: 'id', translationKey: 'settings.language.indonesian' },
  { value: 'vi', translationKey: 'settings.language.vietnamese' },
];
