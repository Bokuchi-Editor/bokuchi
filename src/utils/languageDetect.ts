/**
 * Detects the best-matching app language code from the system language (navigator.language).
 * Supported languages: en, ja, zh-CN, zh-Hant, es, hi, ru, ko, pt-BR, ar, fr, de, id, vi.
 * Called only when the user has never manually set a language.
 */
const SUPPORTED_LANGUAGES = [
  'en', 'ja', 'zh-CN', 'zh-Hant', 'es', 'hi', 'ru', 'ko', 'pt-BR', 'ar', 'fr', 'de', 'id', 'vi',
];

export function detectSystemLanguage(): string {
  const raw = navigator.language || (navigator.languages?.[0] ?? '');
  if (!raw) return 'en';

  const lower = raw.toLowerCase();

  // Exact match (case-insensitive)
  const exact = SUPPORTED_LANGUAGES.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;

  // Traditional Chinese: zh-TW, zh-HK, zh-MO → zh-Hant
  if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo') || lower.startsWith('zh-hant')) {
    return 'zh-Hant';
  }
  // Other Chinese variants → zh-CN
  if (lower.startsWith('zh')) return 'zh-CN';

  // Portuguese: pt-BR and pt-PT both map to pt-BR
  if (lower.startsWith('pt')) return 'pt-BR';

  // Match by language prefix
  const prefix = lower.split('-')[0];
  const byPrefix = SUPPORTED_LANGUAGES.find((l) => l.toLowerCase().split('-')[0] === prefix);
  if (byPrefix) return byPrefix;

  return 'en';
}
