import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslation from './locales/en.json';
import jaTranslation from './locales/ja.json';
import zhCNTranslation from './locales/zh-CN.json';
import zhHantTranslation from './locales/zh-Hant.json';
import esTranslation from './locales/es.json';
import hiTranslation from './locales/hi.json';
import ruTranslation from './locales/ru.json';
import koTranslation from './locales/ko.json';
import ptBRTranslation from './locales/pt-BR.json';
import arTranslation from './locales/ar.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';
import idTranslation from './locales/id.json';
import viTranslation from './locales/vi.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  ja: {
    translation: jaTranslation,
  },
  'zh-CN': {
    translation: zhCNTranslation,
  },
  'zh-Hant': {
    translation: zhHantTranslation,
  },
  es: {
    translation: esTranslation,
  },
  hi: {
    translation: hiTranslation,
  },
  ru: {
    translation: ruTranslation,
  },
  ko: {
    translation: koTranslation,
  },
  'pt-BR': {
    translation: ptBRTranslation,
  },
  ar: {
    translation: arTranslation,
  },
  fr: {
    translation: frTranslation,
  },
  de: {
    translation: deTranslation,
  },
  id: {
    translation: idTranslation,
  },
  vi: {
    translation: viTranslation,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })
  .then(() => {
    console.log('i18n initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize i18n:', error);
  });

export default i18n;
