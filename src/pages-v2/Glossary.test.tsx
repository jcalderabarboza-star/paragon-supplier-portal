// ─────────────────────────────────────────────────────────────────────────────
// GL-1 · THE GLOSSARY SURFACE GATE.
//
// The derivation is held by `glossary/appearances.test.ts` and the chip
// attachment by `glossary/chipCoverage.test.ts`. What is left for a rendered
// page to be wrong about:
//
//   · that it draws EVERY defined term, in BOTH locales, rather than the ones
//     someone remembered to list,
//   · that an empty derivation renders NOTHING — no placeholder, no guess,
//   · that the honest marker keeps saying the definitions are PROVISIONAL, so
//     the page cannot quietly become settled vocabulary (§37), and
//   · that the ROUTING half stays visibly open — the failure this batch was
//     explicitly warned against is shipping a second dead end with better
//     manners.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, afterAll } from 'vitest';
import { screen, fireEvent, act, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import { GLOSSARY_REGISTRIES, ALL_GLOSSARY_TERMS } from '../lib/glossary';
import { buildGlossaryView } from './glossary/appearances';
import Glossary from './Glossary';

const view = buildGlossaryView();
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Glossary — every defined term reaches the page', () => {
  it('renders one card per registered term, and no card it invented', async () => {
    const { container } = renderWithProviders(<Glossary />, { route: '/glossary' });
    const cards = [...container.querySelectorAll('[data-testid^="glossary-term-"]')].map((n) =>
      (n.getAttribute('data-testid') ?? '').replace('glossary-term-', ''),
    );
    // Derived on both sides. A page that dropped a term, and a page that grew
    // one the registries never defined, both fail here.
    expect(cards.sort()).toEqual(view.map((v) => v.anchor).sort());
    expect(cards.length).toBe(ALL_GLOSSARY_TERMS.length);
  });

  it('names the source union beside every term — the review needs to point', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    for (const r of GLOSSARY_REGISTRIES) {
      expect(screen.getByTestId(`glossary-group-${r.sourceType}`)).toBeInTheDocument();
    }
  });

  it('shows the AUTHORED definition, and it is the one on the entry', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    const card = screen.getByTestId('glossary-term-QtyRefusalReason.AMBIGUOUS_QTY');
    const entry = view.find((v) => v.anchor === 'QtyRefusalReason.AMBIGUOUS_QTY');
    expect(card.textContent).toContain(entry?.entry.en.slice(0, 60));
  });
});

describe('Glossary — the derivations render, and their absence renders nothing', () => {
  it('draws the appearance list where the registry gives one', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    // `Under Review` is a declared state in three machines. The page says all
    // three rather than picking one.
    const card = screen.getByTestId('glossary-term-ComplianceDisplayStatus.Under Review');
    for (const entity of ['compliance', 'quotation', 'supplierDocument']) {
      expect(within(card).getByText(entity)).toBeInTheDocument();
    }
  });

  it('renders NO appearance section for a term no machine spells', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    // A refusal reason describes what happened INSTEAD of a transition, so it is
    // in no transition table. The page must show nothing, not "none" and not a
    // plausible-looking list.
    const card = screen.getByTestId('glossary-term-QtyRefusalReason.EMPTY_QTY');
    expect(within(card).queryByText(/Appears in these flows/i)).toBeNull();
    expect(within(card).queryByText(/Related terms/i)).toBeNull();
  });

  it('links the halal and BPOM twins to each other, both ways', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    const halal = screen.getByTestId('glossary-term-HalalRefusalReason.UNKNOWN_MATERIAL');
    expect(within(halal).getByText('BpomRefusalReason.UNKNOWN_MATERIAL')).toBeInTheDocument();
    const bpom = screen.getByTestId('glossary-term-BpomRefusalReason.UNKNOWN_MATERIAL');
    expect(within(bpom).getByText('HalalRefusalReason.UNKNOWN_MATERIAL')).toBeInTheDocument();
  });
});

describe('Glossary — search and filter', () => {
  it('filters to one vocabulary and back', async () => {
    const { container } = renderWithProviders(<Glossary />, { route: '/glossary' });
    fireEvent.click(screen.getByTestId('glossary-filter-CertType'));
    const shown = () => container.querySelectorAll('[data-testid^="glossary-term-"]').length;
    expect(shown()).toBe(view.filter((v) => v.sourceType === 'CertType').length);
    fireEvent.click(screen.getByTestId('glossary-filter-all'));
    expect(shown()).toBe(view.length);
  });

  it('searches DEFINITIONS, not only term names', async () => {
    const { container } = renderWithProviders(<Glossary />, { route: '/glossary' });
    const box = screen.getByRole('textbox', { name: /search terms and definitions/i });
    fireEvent.change(box, { target: { value: 'quarantine' } });
    const cards = [...container.querySelectorAll('[data-testid^="glossary-term-"]')];
    expect(cards.length).toBeGreaterThan(0);
    // The word is in the DEFINITION of ACCEPTED_TO_QUARANTINE, and in the term
    // itself — but the point is that a definition-only hit would also land.
    expect(
      cards.some((c) => (c.getAttribute('data-testid') ?? '').includes('ACCEPTED_TO_QUARANTINE')),
    ).toBe(true);
  });

  it('says so when nothing matches, rather than showing an empty page', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    const box = screen.getByRole('textbox', { name: /search terms and definitions/i });
    fireEvent.change(box, { target: { value: 'zzzzz-no-such-word' } });
    expect(screen.getByText(/zzzzz-no-such-word/)).toBeInTheDocument();
  });
});

describe('Glossary — the honest marker, and the half that stays open', () => {
  it('says the definitions are PROVISIONAL and being elicited (§37)', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    expect(screen.getByText(/not yet the procurement team's|not yet the procurement team’s/i))
      .toBeInTheDocument();
  });

  it('separates what is READ from what is WRITTEN', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    expect(screen.getByText(/Authored, not derived/i)).toBeInTheDocument();
    expect(screen.getByText(/Real: the terms/i)).toBeInTheDocument();
  });

  it('states that the REMEDY ROUTE does not exist — the row must not read closed', async () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    const gap = screen.getByTestId('glossary-remedy-gap');
    expect(gap.textContent).toMatch(/does not say what to do next/i);
    // The fence, held as a test: no entry may quietly acquire a remedy route
    // while D-COMP-HALAL-4 is open, because a populated route makes the row read
    // as finished when nothing was finished.
    expect(ALL_GLOSSARY_TERMS.filter((t) => t.remedyRoute !== undefined)).toEqual([]);
  });

  it('never renders a green liveness claim — there is no live data here at all', async () => {
    const { container } = renderWithProviders(<Glossary />, { route: '/glossary' });
    expect(container.querySelectorAll('.text-success, .bg-success').length).toBe(0);
  });
});

describe('Glossary — Indonesian is a first-class locale, not a fallback', () => {
  it('renders the ID definition for every term when the locale is ID', async () => {
    await setLang('id');
    const { container } = renderWithProviders(<Glossary />, { route: '/glossary' });
    const text = container.textContent ?? '';
    // Every ID definition, not a sample — the page cannot half-translate.
    const missing = view.filter((v) => !text.includes(v.entry.id.slice(0, 45)));
    expect(missing.map((v) => v.anchor)).toEqual([]);
    // …and none of the EN definitions leaked through as a fallback.
    const leaked = view.filter((v) => text.includes(v.entry.en.slice(0, 45)));
    expect(leaked.map((v) => v.anchor)).toEqual([]);
    await setLang('en');
  });

  it('translates the page chrome too, not only the definitions', async () => {
    await setLang('id');
    renderWithProviders(<Glossary />, { route: '/glossary' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Glosarium' })).toBeInTheDocument();
    expect(screen.getByText(/Yang belum diberitahukan halaman ini/i)).toBeInTheDocument();
    await setLang('en');
  });
});

describe('Glossary — a chip lands on its term', () => {
  it('highlights the deep-linked term', async () => {
    renderWithProviders(<Glossary />, {
      route: '/glossary?term=HalalRefusalReason.UNDETERMINED_APPLICABILITY',
    });
    const card = await screen.findByTestId(
      'glossary-term-HalalRefusalReason.UNDETERMINED_APPLICABILITY',
    );
    expect(card.className).toContain('ring-teal');
  });

  it('does not narrow the list to something that hides the linked term', async () => {
    const { container } = renderWithProviders(<Glossary />, {
      route: '/glossary?term=HalalRefusalReason.UNDETERMINED_APPLICABILITY',
    });
    // A link that lands on a filtered page missing its own target is the shape
    // of a broken link, even when the URL is right.
    expect(container.querySelectorAll('[data-testid^="glossary-term-"]').length).toBe(view.length);
  });
});
