// ────────────────────────────────────────────────────────────────────────────
// i18n primitive (Phase 0.6). Establishes the react-i18next pipeline with a
// single proof key (app.title). No translation pass or key extraction yet —
// strings migrate to keys opportunistically as Phase 1' touches each page.
//
// English is the only bundled locale; id-ID can be added as a resource later.
// ────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      'app.title': 'Paragon Supplier Portal',
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18n;
