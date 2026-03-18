import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationRU from './locales/ru.json';
import translationEN from './locales/en.json';
import translationUZ from './locales/uz.json';

const resources = {
    en: { translation: translationEN.translation },
    ru: { translation: translationRU.translation },
    uz: { translation: translationUZ.translation }
};

// Попытка загрузить сохраненный язык из localStorage
const savedLanguage = localStorage.getItem('appLanguage') || 'ru';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: savedLanguage,
        fallbackLng: 'ru',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
