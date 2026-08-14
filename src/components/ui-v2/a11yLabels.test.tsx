// ────────────────────────────────────────────────────────────────────────────
// THE PIN for the third of the HTML-LANG-STUCK-AT-EN-01 shape: accessible names
// in SHARED ui-v2 primitives that were English literals, so a reader on
// assistive technology heard English controls on a fully Indonesian page —
// on EVERY page, since these three render portal-wide.
//
// ⚠️ THE ASSERTION THAT MATTERS IS THE SECOND ONE IN EACH CASE. Checking that
// the ID render matches the ID string is the easy half; a hardcoded English
// literal would fail that, but so would a hundred harmless things. The half
// that names the DEFECT is `not.toBe(<the English literal>)` — the exact state
// the portal shipped in. Same class as MARKER-I18N-HOLE-01: invisible to visual
// QA in either locale, which is why it needs a test rather than a screenshot.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import i18n from '../../lib/i18n';
import SearchBar from './SearchBar';
import SidePanel from './SidePanel';
import Toast from './Toast';

const LOCALES = ['en', 'id'] as const;

// The literals as they stood in the tree before this batch. Named here so the
// negative assertion is against the real prior state, not against a guess.
const SHIPPED_ENGLISH = {
  'ui.clearSearch': 'Clear search',
  'ui.closePanel': 'Close panel',
  'ui.dismiss': 'Dismiss',
} as const;

const CASES = [
  {
    key: 'ui.clearSearch' as const,
    name: 'SearchBar clear button',
    render: () => render(<SearchBar value="glycerin" onChange={() => {}} />),
  },
  {
    key: 'ui.closePanel' as const,
    name: 'SidePanel close button',
    render: () =>
      render(
        <SidePanel open onClose={() => {}} title="Panel">
          <div />
        </SidePanel>,
      ),
  },
  {
    key: 'ui.dismiss' as const,
    name: 'Toast dismiss button',
    render: () =>
      render(<Toast id="t1" title="Recorded" onDismiss={() => {}} />),
  },
];

describe('shared ui-v2 primitives — accessible names follow the locale', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  // Control (rule 4): the two locales must actually differ for this key, or the
  // negative assertion below would be unfalsifiable — a key whose ID string IS
  // the English string would pass "not English" only by accident of comparison.
  it.each(Object.keys(SHIPPED_ENGLISH))(
    '%s is genuinely translated (EN and ID differ)',
    (key) => {
      const en = i18n.getFixedT('en')(key);
      const id = i18n.getFixedT('id')(key);
      expect(en).toBe(SHIPPED_ENGLISH[key as keyof typeof SHIPPED_ENGLISH]);
      expect(id).not.toBe(en);
      expect(id.length).toBeGreaterThan(0);
    },
  );

  for (const c of CASES) {
    for (const lng of LOCALES) {
      it(`${c.name} is named in ${lng}`, async () => {
        await i18n.changeLanguage(lng);
        c.render();

        const expected = i18n.getFixedT(lng)(c.key);
        expect(screen.getByLabelText(expected)).toBeInTheDocument();

        if (lng === 'id') {
          // The defect, stated as an assertion: an Indonesian surface must not
          // hand a screen reader the English control name.
          expect(screen.queryByLabelText(SHIPPED_ENGLISH[c.key])).toBeNull();
        }
        cleanup();
      });
    }
  }
});
