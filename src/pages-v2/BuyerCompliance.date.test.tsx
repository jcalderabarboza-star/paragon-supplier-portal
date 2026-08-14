// ────────────────────────────────────────────────────────────────────────────
// THE PIN for the compliance surface's dates (§47).
//
// BuyerCompliance rendered certificate expiries through a page-local helper that
// hardcoded 'en-GB', so an Indonesian reader saw "20 Aug 2026" on the compliance
// PAGE while the same field on the same domain's WIDGETS — which already import
// the canonical `formatDate` — rendered "20 Agu 2026". A regulatory record
// disagreeing with its own summary tile is worse than either rendering alone.
//
// ⚠️ THE FIRST TEST IS NOT CEREMONY — IT IS WHAT MAKES THE OTHER TWO MEAN
// ANYTHING. en-GB and id-ID produce BYTE-IDENTICAL `dd MMM yyyy` output for
// SEVEN OF TWELVE MONTHS (Jan Feb Mar Apr Jun Jul Nov). Only May→Mei, Aug→Agu,
// Sept→Sep, Oct→Okt and Dec→Des differ. So a locale-parity assertion written
// against a January date PASSES WHILE SEEING NOTHING, and would go on passing
// with the fix removed. The control asserts the chosen date is one of the five
// that discriminate — if a future fixture edit moves it to a silent month, this
// test fails LOUDLY instead of the two below quietly ceasing to test anything.
//
// This is the ambiguity axis stated as a guard: THE OBVIOUS GATE IS BLIND TO
// THIS DEFECT BY CONSTRUCTION FOR MOST INPUTS, so the input must be proved
// capable of showing it before the result is believed.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import { formatDate } from '../lib/format';
import BuyerCompliance from './BuyerCompliance';

// A STORED fixture expiry (complianceRegistry.ts), not a projected or clock-
// derived value: the assertion cannot decay with the calendar.
const PINNED_EXPIRY = '2026-08-20';

const renderedIn = async (lng: string) => {
  await i18n.changeLanguage(lng);
  return formatDate(PINNED_EXPIRY);
};

describe('BuyerCompliance — expiry dates follow the reader, not the author', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('CONTROL — the pinned date falls in a month where EN and ID actually differ', async () => {
    const en = await renderedIn('en');
    const id = await renderedIn('id');
    expect(en).toBe('20 Aug 2026');
    expect(id).toBe('20 Agu 2026');
    // The whole point: if these were equal the two tests below would be green
    // and blind, which is true for 7 of the 12 months.
    expect(id).not.toBe(en);
  });

  it('renders the English abbreviation in EN and never the Indonesian one', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<BuyerCompliance />, { route: '/buyer/compliance' });

    expect(await screen.findByText('20 Aug 2026')).toBeInTheDocument();
    expect(screen.queryByText('20 Agu 2026')).toBeNull();
  });

  it('renders the Indonesian abbreviation in ID and never the English one', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCompliance />, { route: '/buyer/compliance' });

    // The defect, stated as an assertion: an Indonesian reader must not be shown
    // an English month on a regulatory record.
    expect(await screen.findByText('20 Agu 2026')).toBeInTheDocument();
    expect(screen.queryByText('20 Aug 2026')).toBeNull();
  });
});
