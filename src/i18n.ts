import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// `en` is the fallback language and must be available synchronously before
// any settings are loaded, so it stays a static import. Every other language
// is fetched on demand by loadLanguage() to avoid parsing ~500KB of JSON for
// 13 languages the user isn't using.
import enTranslation from './locales/en.json';

const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  ja: () => import('./locales/ja.json'),
  'zh-CN': () => import('./locales/zh-CN.json'),
  'zh-Hant': () => import('./locales/zh-Hant.json'),
  es: () => import('./locales/es.json'),
  hi: () => import('./locales/hi.json'),
  ru: () => import('./locales/ru.json'),
  ko: () => import('./locales/ko.json'),
  'pt-BR': () => import('./locales/pt-BR.json'),
  ar: () => import('./locales/ar.json'),
  fr: () => import('./locales/fr.json'),
  de: () => import('./locales/de.json'),
  id: () => import('./locales/id.json'),
  vi: () => import('./locales/vi.json'),
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })
  .then(() => {
  })
  .catch((error) => {
    console.error('Failed to initialize i18n:', error);
  });

/**
 * Switches the active language, fetching its translation bundle on first use
 * (cached by i18next afterward via hasResourceBundle). `en` is already loaded.
 */
export async function loadLanguage(lang: string): Promise<void> {
  const loader = localeLoaders[lang];
  if (loader && !i18n.hasResourceBundle(lang, 'translation')) {
    const bundle = await loader();
    i18n.addResourceBundle(lang, 'translation', bundle.default);
  }
  await i18n.changeLanguage(lang);
}

export default i18n;
