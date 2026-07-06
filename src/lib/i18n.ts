// ────────────────────────────────────────────────────────────────────────────
// i18n primitive (Phase 0.6; extended v2.2 I18N-01).
//
// react-i18next pipeline. Bilingual EN/ID is a platform requirement (I18N-01):
// strings are externalized as keys, ID-first for supplier surfaces. The
// PO-confirm proof (Step 3.10) is the FIRST surface on the pattern — its keys
// carry real EN + an ID stub. The existing-page key sweep is Phase 3′; new
// surfaces use keys from here on. English stays the default runtime locale
// until the sweep flips ID-first.
// ────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      'app.title': 'Paragon Supplier Portal',
      // — PO confirm (Step 3.10 proof surface) —
      'po.confirm.action': 'Confirm order',
      'po.confirm.submitting': 'Confirming…',
      'po.confirm.success.title': '{{poNumber}} confirmed',
      'po.confirm.success.desc': '{{correlationId}} recorded. Procurement notification pending live channel.',
      'po.confirm.failed.title': 'Could not confirm {{poNumber}}',
      'po.confirm.failed.desc': 'The order could not be confirmed ({{reason}}).',
      'po.confirm.denied.title': 'Not authorized',
      'po.confirm.denied.desc': 'You are not authorized to confirm this order.',
    },
  },
  id: {
    translation: {
      'app.title': 'Portal Pemasok Paragon',
      // — PO confirm (ID stub — refined in the Phase 3′ ID-first sweep) —
      'po.confirm.action': 'Konfirmasi pesanan',
      'po.confirm.submitting': 'Mengonfirmasi…',
      'po.confirm.success.title': '{{poNumber}} dikonfirmasi',
      'po.confirm.success.desc': '{{correlationId}} tercatat. Notifikasi pengadaan menunggu kanal langsung.',
      'po.confirm.failed.title': 'Tidak dapat mengonfirmasi {{poNumber}}',
      'po.confirm.failed.desc': 'Pesanan tidak dapat dikonfirmasi ({{reason}}).',
      'po.confirm.denied.title': 'Tidak berwenang',
      'po.confirm.denied.desc': 'Anda tidak berwenang mengonfirmasi pesanan ini.',
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
