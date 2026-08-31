/**
 * 根据系统语言（navigator.language）检测最匹配的应用语言代码。
 * 支持的语言：en, ja, zh-CN, zh-Hant, es, hi, ru, ko, pt-BR, ar, fr, de, id, vi。
 * 仅在用户从未手动设置过语言时调用。
 */
const SUPPORTED_LANGUAGES = [
  'en', 'ja', 'zh-CN', 'zh-Hant', 'es', 'hi', 'ru', 'ko', 'pt-BR', 'ar', 'fr', 'de', 'id', 'vi',
];

export function detectSystemLanguage(): string {
  const raw = navigator.language || (navigator.languages?.[0] ?? '');
  if (!raw) return 'en';

  const lower = raw.toLowerCase();

  // 精确匹配（忽略大小写）
  const exact = SUPPORTED_LANGUAGES.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;

  // 繁体中文：zh-TW、zh-HK、zh-MO → zh-Hant
  if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo') || lower.startsWith('zh-hant')) {
    return 'zh-Hant';
  }
  // 其他中文 → zh-CN
  if (lower.startsWith('zh')) return 'zh-CN';

  // 葡萄牙语：pt-BR、pt-PT 都映射到 pt-BR
  if (lower.startsWith('pt')) return 'pt-BR';

  // 按语言前缀匹配
  const prefix = lower.split('-')[0];
  const byPrefix = SUPPORTED_LANGUAGES.find((l) => l.toLowerCase().split('-')[0] === prefix);
  if (byPrefix) return byPrefix;

  return 'en';
}