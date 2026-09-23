// ─────────────────────────────────────────────────────────────────────────────
// PSL P4 · THE SUPPLIER'S STANDING, ON THE SCREEN.
//
// The service-level guarantees live in `pslSupplierView.test.ts`. This file
// asserts the SURFACE: that `/supplier/performance` renders what R-B shows,
// says the two R-D sentences, carries the R-F lapse line, and puts none of the
// hidden values into the DOM.
//
// ⚠️ **THE DOM IS CHECKED, NOT THE DTO.** A service that withholds a field and
// a page that re-derives it from somewhere else would both pass a DTO check.
// The page's own text is the thing a supplier actually reads.
//
// ⚠️ **AND R-E's PLACEMENT IS ASSERTED HERE TOO.** The section must be on the
// PRIVATE performance page and must not have followed a component onto the
// PUBLIC storefront — the ruling's whole reason for moving it off
// `/supplier/storefront`, which carries a "Preview public profile" control.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import SupplierPerformance from './SupplierPerformance';
import SupplierMyStorefront from './SupplierMyStorefront';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { pslStore } from '../services/data/mock/stores/pslStore';
import { isPublished } from '../services/data/pslListing';
import { effectiveValidUntil } from '../services/data/pslProjection';
import { formatDate } from '../lib/format';
import i18n from '../lib/i18n';

const seatFor = (supplierId: string, supplierName: string): CurrentIdentity => ({
  ...SUPPLIER,
  supplierId,
  supplierName,
});

const SUP_002 = seatFor('sup-002', 'PT Sample Specialty Fats');

/**
 * The rendered listing rows.
 *
 * ⚠️ **WAITING ON THE SECTION IS NOT WAITING ON THE DATA, AND THE FIRST
 * DRAFT OF THIS FILE DID EXACTLY THAT.** The section renders SYNCHRONOUSLY —
 * with its empty state — while `useMyPslListings` is still pending, so
 * `waitFor(getByTestId('supplier-psl-section'))` resolves on the first tick and
 * every content assertion after it read an empty page. Three specs failed that
 * way and would have been "fixed" by loosening them. Wait for the ROWS.
 */
const rowsOf = (): NodeListOf<Element> =>
  screen
    .getByTestId('supplier-psl-section')
    .querySelectorAll('[data-testid^="supplier-psl-row-"]');

const waitForRows = async (expected: number): Promise<void> => {
  await waitFor(() => expect(rowsOf().length).toBe(expected));
};

beforeAll(async () => {
  const outcome = await seedPslListings();
  expect(['seeded', 'already-seeded'], outcome.reason ?? '').toContain(outcome.status);
  await i18n.changeLanguage('en');
});

describe('⚠️ THE SECTION RENDERS FOR THE DEFAULT SUPPLIER SEAT (sup-007)', () => {
  it('shows both published rows, and neither of the three internal ones', async () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance',
    });
    // Two rows, derived from the store ABOVE the service rather than counted.
    const published = pslStore
      .all()
      .filter((r) => r.supplierId === 'sup-007' && isPublished(r));
    expect(published.length).toBe(2);
    await waitForRows(published.length);

    // ⚠️ KNOWN-GOOD + KNOWN-BAD in the same run. sup-007 holds three INTERNAL
    // listings; if publication ever stopped gating the surface they appear here.
    expect(screen.getByTestId('supplier-psl-section').textContent).toContain('PK-PETB-8810');
    expect(screen.getByTestId('supplier-psl-section').textContent).not.toContain('FR-ROUD-4470');
  });

  it('⚠️ THE LAPSE LINE (R-F) RENDERS, AND NAMES ITS CODES AND ITS DATE', async () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance',
    });
    const line = await screen.findByTestId('supplier-psl-expiring-line');
    expect(line.textContent).toContain('PK-PETB-8810');
    expect(line.textContent).toContain('lapses on');
  });

  it('⚠️ THE WITHDRAWN LINE (R-D) RENDERS — the R5(b) case has a sentence', async () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance',
    });
    const line = await screen.findByTestId('supplier-psl-withdrawn-line');
    expect(line.textContent).toContain('was withdrawn on');
    expect(line.textContent).toContain('no longer applies');
    // ⚠️ AND IT NAMES THE WITHDRAWAL, NOT THE VALIDITY END. The first draft
    // rendered *"withdrawn on 19 Mar 2027"* — a future date for something
    // already stopped — and only browser QA saw it, because both strings are
    // dates and no assertion compared them.
    const row = pslStore.all().find((r) => r.id === 'psl-011')!;
    const ends = formatDate(effectiveValidUntil(row)!);
    expect(line.textContent, 'the line names the validity end').not.toContain(ends);
  });

  it('⚠️ AND NO INTERNAL REASON IS ON THE PAGE — the sentence says what, never why', async () => {
    const { container } = renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance',
    });
    await waitForRows(2);
    const text = container.textContent ?? '';
    for (const r of pslStore.all().filter((x) => x.supplierId === 'sup-007')) {
      expect(text.includes(r.justification), `justification of ${r.id} on the page`).toBe(false);
      for (const h of r.statusHistory)
        expect(text.includes(h.reason), `ledger reason of ${r.id} on the page`).toBe(false);
      for (const e of r.evidenceRefs)
        expect(text.includes(e), `evidenceRef ${e} on the page`).toBe(false);
      expect(text.includes(r.id), `listing id ${r.id} on the page`).toBe(false);
    }
  });
});

describe('⚠️ A DIFFERENT SEAT SEES A DIFFERENT PAGE (sup-002)', () => {
  it('renders psl-001 and psl-003 only, with the expired sentence on psl-003', async () => {
    const { container } = renderWithProviders(<SupplierPerformance />, {
      identity: SUP_002,
      route: '/supplier/performance',
    });
    await waitForRows(2);

    const psl001 = pslStore.all().find((r) => r.id === 'psl-001')!;
    const psl002 = pslStore.all().find((r) => r.id === 'psl-002')!;
    const text = container.textContent ?? '';
    // psl-001 is published → its codes are on the page.
    for (const c of psl001.scope.kind === 'material' ? psl001.scope.materialCodes : [])
      expect(text).toContain(c);
    // psl-002 is sup-002's OWN row and is UNPUBLISHED → its codes must not be.
    // (It carries codes psl-001 does not, which is what makes this decidable.)
    const ownUnpublished = (
      psl002.scope.kind === 'material' ? psl002.scope.materialCodes : []
    ).filter((c) => !text.includes(c));
    expect(ownUnpublished.length, 'psl-002 has no code of its own to test with').toBeGreaterThan(
      0,
    );

    // The expired sentence, on the published-and-expired psl-003.
    expect(screen.getByTestId('supplier-psl-expired-line').textContent).toContain(
      'ran until',
    );
  });
});

describe('⚠️ A SUPPLIER WITH NOTHING PUBLISHED SEES AN HONEST EMPTY STATE', () => {
  it('sup-001 holds no listing at all and is told so, not shown a broken page', async () => {
    const seat = seatFor('sup-001', 'PT Sample Oleochemicals');
    expect(pslStore.all().filter((r) => r.supplierId === 'sup-001')).toEqual([]);
    renderWithProviders(<SupplierPerformance />, { identity: seat, route: '/supplier/performance' });
    await waitFor(() => expect(screen.getByTestId('supplier-psl-empty')).toBeInTheDocument());
    expect(rowsOf().length).toBe(0);
  });
});

describe('⚠️ R-E · THE SECTION IS PRIVATE — it is not on the PUBLIC storefront', () => {
  it('SupplierMyStorefront renders no PSL section for the same seat', async () => {
    const { container } = renderWithProviders(<SupplierMyStorefront />, {
      identity: SUPPLIER,
      route: '/supplier/storefront',
    });
    await waitFor(() => expect(container.textContent?.length ?? 0).toBeGreaterThan(50));
    expect(screen.queryByTestId('supplier-psl-section')).not.toBeInTheDocument();
    // And by CONTENT, not only by test id: the storefront must not carry the
    // designation words for a listing this supplier holds.
    const text = container.textContent ?? '';
    expect(text).not.toContain('PK-PETB-8810');
  });

  it('⚠️ KNOWN-GOOD CONTROL — the same assertion FINDS the section on the private page', async () => {
    // Without this, "the storefront has no PSL section" is satisfied by a
    // section that renders nowhere at all.
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance',
    });
    await waitFor(() => expect(screen.getByTestId('supplier-psl-section')).toBeInTheDocument());
  });
});

describe('⚠️ BOTH LOCALES — and the probe uses a token that DIFFERS between them', () => {
  it('the section title and the lapse line are translated, not echoed', async () => {
    // `i18n-probe-needs-divergent-token`: asserting on a word spelled the same
    // in EN and ID makes an assertion that cannot fail. "Your preferred-supplier
    // standing" / "Status pemasok pilihan Anda" share no token.
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierPerformance />, {
        identity: SUPPLIER,
        route: '/supplier/performance',
      });
      await waitForRows(2);
      const section = screen.getByTestId('supplier-psl-section');
      expect(section.textContent).toContain('Status pemasok pilihan Anda');
      expect(section.textContent).not.toContain('Your preferred-supplier standing');
      // The status WORDS come from `statusLabel`, which P4 did not re-key —
      // `Mandatory` is `Wajib` in ID, so this proves the central map is in play.
      expect(section.textContent).toContain('Wajib');
      expect(screen.getByTestId('supplier-psl-expiring-line').textContent).toContain(
        'berakhir pada',
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
