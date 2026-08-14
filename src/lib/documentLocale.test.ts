// ────────────────────────────────────────────────────────────────────────────
// THE PIN for HTML-LANG-STUCK-AT-EN-01 (findings §39c).
//
// The fix is one line; the pin is the deliverable. What is asserted here is the
// INVARIANT — "the document's declared locale IS the i18n instance's language" —
// derived over every registered locale, not the two cases someone happened to
// think of. Add a third locale to `resources` and it is covered on the next run
// without anyone remembering to extend this file.
//
// ⚠️ EVERY CASE POISONS THE ATTRIBUTES FIRST, AND THAT IS THE WHOLE POINT.
// `app/index.html` ships `lang="en"`. So an assertion that `lang === 'en'` after
// switching to English PASSES WITH THE FIX REMOVED — right for the wrong reason,
// a guard probed in one direction only, which is exactly the class the standing
// rules are about. Setting `lang='zz' dir='rtl' title='POISONED'` before each
// switch means the assertion can only pass if the binding actually WROTE.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import i18n, { resources } from './i18n';
import { applyDocumentLocale, syncDocumentLocale } from './documentLocale';

// Derived, never listed: the locales the app actually registers.
const LOCALES = Object.keys(resources);

const POISON = () => {
  document.documentElement.setAttribute('lang', 'zz');
  document.documentElement.setAttribute('dir', 'rtl');
  document.title = 'POISONED';
};

describe('document locale — the population and the control', () => {
  // EMPTY-INPUT-REPORTS-CLEAN-01: a derivation over nothing agrees with every
  // claim made about it. Membership, not a count.
  it('derives a non-empty locale population containing both shipped locales', () => {
    expect(LOCALES.length).toBeGreaterThan(0);
    expect(LOCALES).toContain('en');
    expect(LOCALES).toContain('id');
  });

  it('every registered locale carries the browser-tab title key', () => {
    for (const lng of LOCALES) {
      const title = i18n.getFixedT(lng)('app.documentTitle');
      expect(title, `app.documentTitle missing for ${lng}`).not.toBe('app.documentTitle');
      expect(title.length).toBeGreaterThan(0);
    }
  });
});

describe('document locale — the BOOT path', () => {
  // Runs before any changeLanguage in this file, deliberately: this is the case
  // the filed finding did not cover and the browser QA proved was worst — a
  // reader whose Indonesian choice is restored from localStorage got an `en`
  // document at first paint, before touching anything.
  it('declares the boot language on the document without any interaction', () => {
    expect(document.documentElement.getAttribute('lang')).toBe(i18n.language);
    expect(document.documentElement.getAttribute('dir')).toBe(i18n.dir());
    expect(document.title).toBe(i18n.t('app.documentTitle'));
  });
});

describe('document locale — tracks the language, both directions', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each(LOCALES)('switching to %s writes lang, dir and title', async (lng) => {
    POISON();
    await i18n.changeLanguage(lng);

    expect(document.documentElement.getAttribute('lang')).toBe(lng);
    // Asserted against the instance, not against a literal: the attribute is
    // pinned to the language rather than to a value that has to be maintained.
    expect(document.documentElement.getAttribute('lang')).toBe(i18n.language);
    expect(document.documentElement.getAttribute('dir')).toBe(i18n.dir());
    expect(document.title).toBe(i18n.getFixedT(lng)('app.documentTitle'));
  });

  it('round-trips en → id → en without sticking', async () => {
    await i18n.changeLanguage('en');
    POISON();
    await i18n.changeLanguage('id');
    expect(document.documentElement.getAttribute('lang')).toBe('id');

    POISON();
    await i18n.changeLanguage('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('the ID document is never left declaring English', async () => {
    await i18n.changeLanguage('id');
    // The live-DOM shape the browser QA found: exactly one element carries a
    // `lang`, and if it says `en` while the strings are Bahasa, every assistive
    // reader gets English phonemes over Indonesian text.
    expect(document.documentElement.getAttribute('lang')).not.toBe('en');
    expect(document.title).not.toBe(i18n.getFixedT('en')('app.documentTitle'));
  });
});

describe('document locale — the binding, not the coincidence', () => {
  // Every assertion above would still pass if something ELSE in the module
  // graph happened to write `lang`. This tests `syncDocumentLocale`'s contract
  // in isolation, on a stand-in instance, so the listener is proved to be what
  // does the work — and it never disturbs the real singleton.
  const fakeInstance = () => {
    const handlers: Array<() => void> = [];
    const inst = {
      language: 'en',
      dir: () => (inst.language === 'ar' ? 'rtl' : 'ltr'),
      t: () => 'FAKE TITLE',
      on: (_evt: string, fn: () => void) => handlers.push(fn),
      off: (_evt: string, fn: () => void) => {
        const i = handlers.indexOf(fn);
        if (i >= 0) handlers.splice(i, 1);
      },
      setLanguage: (lng: string) => {
        inst.language = lng;
        handlers.forEach((h) => h());
      },
    };
    return inst;
  };

  it('writes on change while bound, and stops writing once unsubscribed', () => {
    const inst = fakeInstance();
    const unsubscribe = syncDocumentLocale(inst as never);

    POISON();
    inst.setLanguage('id');
    expect(document.documentElement.getAttribute('lang')).toBe('id');

    inst.setLanguage('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');

    unsubscribe();
    document.documentElement.setAttribute('lang', 'zz');
    inst.setLanguage('en');
    // Unsubscribed: nothing corrected the poison — so the writes above were the
    // subscription's doing and not some ambient effect.
    expect(document.documentElement.getAttribute('lang')).toBe('zz');
  });

  it('applyDocumentLocale is idempotent', () => {
    applyDocumentLocale(i18n);
    const first = document.documentElement.getAttribute('lang');
    applyDocumentLocale(i18n);
    expect(document.documentElement.getAttribute('lang')).toBe(first);
  });
});
