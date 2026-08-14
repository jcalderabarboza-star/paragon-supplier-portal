// ────────────────────────────────────────────────────────────────────────────
// Document-level locale sync (HTML-LANG-STUCK-AT-EN-01, findings §39c).
//
// THE DEFECT THIS CLOSES: `<html lang>` was set once in `app/index.html` and
// updated by NOTHING — not the language menu, not `changeLanguage`, not
// `AppShellV2` (which re-keys `<main>` on `i18n.language` and stops there). With
// every visible string rendering Bahasa Indonesia, the document still declared
// itself English, so SCREEN READERS ANNOUNCED INDONESIAN TEXT WITH ENGLISH
// PHONEMES — app-wide, every page, and at FIRST PAINT for a returning reader
// whose choice was restored from localStorage, before any interaction at all.
// Nothing on screen looks different, so no visual QA in either locale can see it.
//
// ⚠️ WHY THIS LIVES ON THE i18n INSTANCE AND NOT IN A ROOT `useEffect`.
// A root effect FIXES the defect; it does not make it IMPOSSIBLE. Any surface
// that does not mount that root — a future shell, an error boundary, a
// standalone route — silently loses the sync and nothing goes red. The toggle
// owning it is worse still: it leaves the BOOT path uncovered, and boot is the
// failing case. Registered here, the document's locale is written by the module
// that OWNS the language, at the instant the language changes. There is no way
// to change the language except through the instance, so there is no code path
// that can desync it — including callers that do not exist yet.
//
// The document-level locale is THREE properties, kept together deliberately:
//   · `lang`  — what the defect was about; the phoneme set.
//   · `dir`   — currently `ltr` for both locales, so writing it changes nothing
//               TODAY. It is written anyway so that adding an RTL locale cannot
//               re-open this finding: `i18n.dir()` derives it from the language.
//   · `title` — the SECOND of the shape, one line below `lang` in the same
//               `app/index.html`, updated by nothing, while `app.title` DOES
//               translate in the top bar. A screen reader announces the document
//               title on load and on window/tab switch; it is the accessible
//               name of the document.
// ────────────────────────────────────────────────────────────────────────────

import type { i18n as I18nInstance } from 'i18next';

/**
 * Write the current language onto the document element and title. Idempotent,
 * and a no-op where there is no document.
 */
export function applyDocumentLocale(i18n: I18nInstance): void {
  if (typeof document === 'undefined') return;

  const el = document.documentElement;
  // `i18n.language` IS the language — never a copy of it, never a re-derivation.
  // The pin asserts equality against this same expression, so the attribute
  // cannot drift from the instance without the suite going red.
  el.setAttribute('lang', i18n.language);
  el.setAttribute('dir', i18n.dir());

  const title = i18n.t('app.documentTitle');
  // i18next is configured `returnNull: false`, so a missing key returns the key
  // string. Refusing that is what keeps a typo from writing "app.documentTitle"
  // into the browser tab.
  if (title && title !== 'app.documentTitle') document.title = title;
}

/**
 * Bind the document's locale to the i18n instance for the life of the app:
 * apply it once (the BOOT path — a restored `id` choice must not paint an
 * `en` document), then on every subsequent change.
 *
 * Returns an unsubscribe so a test can prove the binding is what is doing the
 * work rather than something else in the module graph.
 */
export function syncDocumentLocale(i18n: I18nInstance): () => void {
  const handler = () => applyDocumentLocale(i18n);
  i18n.on('languageChanged', handler);
  applyDocumentLocale(i18n);
  return () => i18n.off('languageChanged', handler);
}
