// ────────────────────────────────────────────────────────────────────────────
// S2b — THE COUNTRY SELECT, IN BOTH LANGUAGES, AND THE VALUE/LABEL SPLIT THAT
// KEEPS THE STORED COUNTRY CANONICAL.
//
// ⚠️ **THE PROBE IS AIMED AT `Singapore` AND `Philippines`, NOT AT `Indonesia`,
// AND THAT CHOICE IS THE WHOLE DESIGN OF THIS FILE.** `Indonesia` is spelled
// identically in both arms, so every assertion about it passes whether or not the
// value/label split exists — a test that cannot fail is not evidence, however
// central the token it names. The two tokens whose arms actually differ are the
// only ones that can distinguish a correct implementation from a mistake.
//
// ⚠️ **AND THE PROVINCE GATE IS TESTED THROUGH THE VALUE, NOT THE LABEL.**
// `form.country === 'Indonesia'` decides whether province renders (and whether
// `validateStep1` demands it). Selecting a country by its OPTION VALUE and
// watching province disappear is what proves the gate reads the stored value; if
// the value were ever localized, `getByDisplayValue`/`selectOptions` by the
// canonical string is the assertion that goes red.
//
// Every assertion drives the real entrance — the type selector, then Continue —
// because `CompanyInfoStep` is not exported and a test that reached it another
// way would be testing a component no reader can arrive at.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import SupplierRegistration from './SupplierRegistration';

/** The canonical `<option value>`s. These are LOGIC and must never localize. */
const CANONICAL_VALUES = [
  'Indonesia',
  'Malaysia',
  'Singapore',
  'Thailand',
  'Vietnam',
  'Philippines',
  'Other',
] as const;

/** The two tokens whose display actually differs between the arms. */
const DIVERGENT = [
  { value: 'Singapore', en: 'Singapore', id: 'Singapura' },
  { value: 'Philippines', en: 'Philippines', id: 'Filipina' },
] as const;

const COUNTRY_KEYS = [
  'registration.country.indonesia',
  'registration.country.malaysia',
  'registration.country.singapore',
  'registration.country.thailand',
  'registration.country.vietnam',
  'registration.country.philippines',
] as const;

/** Walk the real entrance: pick a registration type, continue to company info. */
async function reachCompanyStep(): Promise<HTMLSelectElement> {
  renderWithProviders(<SupplierRegistration />);
  fireEvent.click(
    await screen.findByText(i18n.t('registration.type.external.label')),
  );
  fireEvent.click(
    await screen.findByRole('button', {
      name: i18n.t('registration.selector.continue'),
    }),
  );
  // ⚠️ FOUND BY CONTENT, NOT BY DOM SHAPE. `Field` renders its <label> as a
  // SIBLING of the control, so `closest()` from the label text reaches a node
  // that holds no combobox — and the step renders several selects. The country
  // select is the one offering `Malaysia`, a value no other select on this step
  // carries, and the uniqueness assertion below is what keeps that a derivation
  // rather than a guess: if a second select ever offers it, this goes red instead
  // of silently testing the wrong control.
  await screen.findByText(
    i18n.t('registration.step.company.field.country.label'),
  );
  const matches = screen
    .getAllByRole('combobox')
    .filter((el) =>
      Array.from((el as HTMLSelectElement).options).some(
        (o) => o.value === 'Malaysia',
      ),
    );
  expect(matches, 'exactly one select must offer Malaysia').toHaveLength(1);
  return matches[0] as HTMLSelectElement;
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('registration country · CONTROLS — the instrument can see', () => {
  it('CONTROL — the divergent tokens really do differ between the arms', async () => {
    // If this were ever false, every ID assertion below would pass by rendering
    // the English string, which is the exact defect they exist to catch.
    for (const { value, en, id } of DIVERGENT) {
      const key = `registration.country.${value.toLowerCase()}`;
      await i18n.changeLanguage('en');
      expect(i18n.t(key), `${key} EN`).toBe(en);
      await i18n.changeLanguage('id');
      expect(i18n.t(key), `${key} ID`).toBe(id);
      expect(id).not.toBe(en);
    }
  });

  it('CONTROL — the ID arm holds its OWN row for every country, fallback or not', async () => {
    // Four of six are the same word in both languages, so output cannot tell a
    // real ID row from a `fallbackLng` hit. Read the resource maps directly.
    const { resources } = await import('../lib/i18n');
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const key of COUNTRY_KEYS) {
      expect(en[key], `${key} missing from EN resources`).toBeDefined();
      expect(id[key], `${key} missing from ID resources`).toBeDefined();
    }
  });

  it('CONTROL — the EN arm is byte-identical to the literals it replaced', async () => {
    await i18n.changeLanguage('en');
    for (const value of CANONICAL_VALUES.filter((v) => v !== 'Other')) {
      expect(i18n.t(`registration.country.${value.toLowerCase()}`)).toBe(value);
    }
    // `Other` deliberately reuses the shared key rather than minting a seventh.
    expect(i18n.t('registration.option.other')).toBe('Other');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('registration country · the select speaks both languages', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] every option label resolves from the ${lang} arm`, async () => {
      await i18n.changeLanguage(lang);
      const select = await reachCompanyStep();
      const options = Array.from(select.options);
      expect(options.map((o) => o.value)).toEqual([...CANONICAL_VALUES]);
      for (const { value, [lang]: expected } of DIVERGENT) {
        const opt = options.find((o) => o.value === value);
        expect(opt?.textContent?.trim(), `${value} in ${lang}`).toBe(expected);
      }
    });
  }

  it('⚠️ the stored value stays canonical English while the label localizes', async () => {
    // THE named test the value/label split exists for. Flip `value={c.value}` to
    // `value={t(c.key)}` and this is what goes red — the option that a submission
    // and the province gate both read would carry `Singapura`.
    await i18n.changeLanguage('id');
    const select = await reachCompanyStep();
    const options = Array.from(select.options);
    expect(options.map((o) => o.value)).toEqual([...CANONICAL_VALUES]);
    for (const { value, id } of DIVERGENT) {
      const opt = options.find((o) => o.value === value);
      expect(opt, `no option with canonical value ${value}`).toBeDefined();
      expect(opt?.textContent?.trim()).toBe(id);
    }
  });

  it('⚠️ [id] no English country name survives in the select', async () => {
    await i18n.changeLanguage('id');
    const select = await reachCompanyStep();
    const texts = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(texts).not.toContain('Singapore');
    expect(texts).not.toContain('Philippines');
    expect(texts).not.toContain('Other');
    expect(texts).toContain('Lainnya');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('registration country · the province gate reads the VALUE', () => {
  it('[id] province renders while the canonical value is Indonesia', async () => {
    await i18n.changeLanguage('id');
    await reachCompanyStep();
    expect(
      await screen.findByText(
        i18n.t('registration.step.company.field.province.label'),
      ),
    ).toBeInTheDocument();
  });

  it('⚠️ [id] selecting a country BY ITS CANONICAL VALUE closes the province gate', async () => {
    // Selection is by value, not by visible text: that is what makes this an
    // assertion about the stored country rather than about the rendered label.
    await i18n.changeLanguage('id');
    const select = await reachCompanyStep();
    fireEvent.change(select, { target: { value: 'Singapore' } });
    expect(select.value).toBe('Singapore');
    expect(
      screen.queryByText(
        i18n.t('registration.step.company.field.province.label'),
      ),
    ).toBeNull();
  });
});
