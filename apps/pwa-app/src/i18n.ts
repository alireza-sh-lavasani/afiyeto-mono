import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './languages/en.ts';
import ar from './languages/ar.ts';
import ti from './languages/ti.ts';
import { ESupportedLanguages } from './languages/language.enums.ts';

// Get language from localStorage, default to English
const savedLanguage = localStorage.getItem('afiyet_lang') || ESupportedLanguages.ENGLISH;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      ti: { translation: ti },
    },
    lng: savedLanguage,
    fallbackLng: ESupportedLanguages.ENGLISH,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Apply document direction for RTL
const rtlLanguages = [ESupportedLanguages.ARABIC];
document.documentElement.dir = rtlLanguages.includes(savedLanguage as ESupportedLanguages) ? 'rtl' : 'ltr';
document.documentElement.lang = savedLanguage;

export default i18n;
export { ESupportedLanguages };
