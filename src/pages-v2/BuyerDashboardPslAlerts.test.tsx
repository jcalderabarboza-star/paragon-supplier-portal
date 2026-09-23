// ─────────────────────────────────────────────────────────────────────────────
// PSL P4 · R-C — THE TWO BUYER ALERTS, AND THE ONE PREDICATE BEHIND THEM.
//
// ⚠️ **THE RISK THIS FILE EXISTS FOR IS NOT "DOES THE CARD RENDER" — IT IS
// "DOES THE CARD AGREE WITH THE PAGE IT LINKS TO".**
// `COUNT-RESTATED-ACROSS-INSTRUMENTS-01`'s lesson is that a wrong number WITH AN
// EXPLANATION gets believed, so the equality below is asserted BY NAMED IDS
// rather than by comparing two totals: two totals agree by accident, a named
// set does not.
//
// ⚠️ **AND THE EXPECTATION IS DERIVED FROM THE STORE, ABOVE THE PREDICATE.**
// Deriving it by calling `pslExpiringRows` would make the test agree with the
// shipped code by construction — §86's defect, where mutating the predicate
// moves the population and the assertion with it, so the gate cannot tell "I
// caught it" from "I have nothing to look at". The expectations here are
// computed from `pslDisplayStatus` and `lifecycle` directly.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerDashboard from './BuyerDashboard';
import BuyerPreferredSuppliers from './BuyerPreferredSuppliers';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { pslStore } from '../services/data/mock/stores/pslStore';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { pslDisplayStatus } from '../services/data/pslProjection';
import { alertGroups } from './dashboard/buyerDashboardDerivations';
import i18n from '../lib/i18n';

const PRESENT = DECLARED_PRESENT;

/** Independently derived — NOT by calling the predicate under test. */
const expiringIds = (): string[] =>
  pslStore
    .all()
    .filter((r) => pslDisplayStatus(r, PRESENT) === 'Expiring')
    .map((r) => r.id)
    .sort();

const expiredListedIds = (): string[] =>
  pslStore
    .all()
    .filter((r) => r.lifecycle === 'Listed' && pslDisplayStatus(r, PRESENT) === 'Expired')
    .map((r) => r.id)
    .sort();

beforeAll(async () => {
  const outcome = await seedPslListings();
  expect(['seeded', 'already-seeded'], outcome.reason ?? '').toContain(outcome.status);
  await i18n.changeLanguage('en');
});

describe('REACH — both signals have a subject in this corpus', () => {
  it('⚠️ NEITHER POPULATION IS EMPTY — otherwise every assertion below is vacuous', () => {
    // A zero-count group is FILTERED OUT of the strip by design, so an empty
    // population would make "the card is absent" pass for the wrong reason.
    expect(expiringIds().length).toBeGreaterThan(0);
    expect(expiredListedIds().length).toBeGreaterThan(0);
  });

  it('⚠️ AND THEY ARE DISJOINT — a row cannot satisfy both, so neither card double-counts', () => {
    const both = expiringIds().filter((id) => expiredListedIds().includes(id));
    expect(both).toEqual([]);
  });
});

describe('⚠️ THE ALERT GROUPS CARRY THE DERIVED MEMBERS', () => {
  const groupsNow = () =>
    alertGroups({
      invoices: [],
      receipts: [],
      registry: [],
      obligations: [],
      contracts: [],
      responses: [],
      listings: pslStore.all(),
      nowIso: PRESENT,
    });

  it('pslExpiring counts exactly the independently derived rows', () => {
    const g = groupsNow().find((x) => x.id === 'pslExpiring');
    expect(g, 'the pslExpiring group is absent').toBeDefined();
    expect(g!.count).toBe(expiringIds().length);
    expect(g!.severity).toBe('warning');
    expect(g!.route).toBe('/buyer/preferred-suppliers?tab=expiring');
  });

  it('pslExpiredListed counts exactly the independently derived rows, and is CRITICAL', () => {
    const g = groupsNow().find((x) => x.id === 'pslExpiredListed');
    expect(g, 'the pslExpiredListed group is absent').toBeDefined();
    expect(g!.count).toBe(expiredListedIds().length);
    expect(g!.severity).toBe('critical');
    expect(g!.route).toBe('/buyer/preferred-suppliers?tab=expiredListed');
  });

  it('⚠️ KNOWN-BAD CONTROL — with NO listings both groups vanish from the strip', () => {
    // `alertGroups` filters `count > 0`. Without this, "the group is present"
    // is consistent with a group that is always present.
    const groups = alertGroups({
      invoices: [],
      receipts: [],
      registry: [],
      obligations: [],
      contracts: [],
      responses: [],
      listings: [],
      nowIso: PRESENT,
    });
    expect(groups.map((g) => g.id)).not.toContain('pslExpiring');
    expect(groups.map((g) => g.id)).not.toContain('pslExpiredListed');
  });

  it('⚠️ THE CLOCK DECIDES — far past the present, Expiring empties and Expired fills', () => {
    const far = '2030-01-01';
    const groups = alertGroups({
      invoices: [],
      receipts: [],
      registry: [],
      obligations: [],
      contracts: [],
      responses: [],
      listings: pslStore.all(),
      nowIso: far,
    });
    expect(groups.find((g) => g.id === 'pslExpiring')).toBeUndefined();
    const expired = groups.find((g) => g.id === 'pslExpiredListed');
    expect(expired!.count).toBeGreaterThan(expiredListedIds().length);
  });
});

describe('⚠️ THE ALERT AND THE QUEUE PAGE AGREE — by NAMED IDS, at the same instant', () => {
  it('the expiring tab renders exactly the rows the card counted', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, {
      identity: BUYER,
      route: '/buyer/preferred-suppliers',
    });
    const tab = await screen.findByTestId('psl-queue-tab-expiring');
    tab.click();
    const expected = expiringIds();
    await waitFor(() => {
      for (const id of expected)
        expect(screen.getByTestId(`psl-queue-row-${id}`)).toBeInTheDocument();
    });
    // and NOTHING else — the set, not a superset.
    const rendered = [...document.querySelectorAll('[data-testid^="psl-queue-row-"]')]
      .map((el) => el.getAttribute('data-testid')!.replace('psl-queue-row-', ''))
      .sort();
    expect(rendered).toEqual(expected);
  });

  it('the expired-still-listed tab renders exactly the rows that card counted', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, {
      identity: BUYER,
      route: '/buyer/preferred-suppliers',
    });
    const tab = await screen.findByTestId('psl-queue-tab-expiredListed');
    tab.click();
    const expected = expiredListedIds();
    await waitFor(() => {
      for (const id of expected)
        expect(screen.getByTestId(`psl-queue-row-${id}`)).toBeInTheDocument();
    });
    const rendered = [...document.querySelectorAll('[data-testid^="psl-queue-row-"]')]
      .map((el) => el.getAttribute('data-testid')!.replace('psl-queue-row-', ''))
      .sort();
    expect(rendered).toEqual(expected);
  });

  it('⚠️ THE ALERT ROUTE OPENS THAT TAB — the drill-down lands on the counted rows', async () => {
    // The card's `route` carries `?tab=expiring`; the page reads it as its
    // INITIAL tab. Without this the two halves agree in a test and disagree for
    // the reader, which is the whole failure mode R-C names.
    renderWithProviders(<BuyerPreferredSuppliers />, {
      identity: BUYER,
      route: '/buyer/preferred-suppliers?tab=expiredListed',
    });
    const expected = expiredListedIds();
    await waitFor(() => {
      for (const id of expected)
        expect(screen.getByTestId(`psl-queue-row-${id}`)).toBeInTheDocument();
    });
    const rendered = [...document.querySelectorAll('[data-testid^="psl-queue-row-"]')]
      .map((el) => el.getAttribute('data-testid')!.replace('psl-queue-row-', ''))
      .sort();
    expect(rendered).toEqual(expected);
  });

  it('⚠️ KNOWN-BAD CONTROL — an unknown tab value falls back, it does not empty the page', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, {
      identity: BUYER,
      route: '/buyer/preferred-suppliers?tab=not-a-tab',
    });
    // The default tab is `proposed`; a reader-supplied value must not be cast.
    await waitFor(() =>
      expect(screen.getByTestId('psl-queue-tab-proposed').className).toContain('border-action'),
    );
  });
});

describe('⚠️ BOTH ALERTS RENDER ON THE DASHBOARD, IN BOTH LOCALES', () => {
  it('EN — the two cards are on the strip with their derived counts', async () => {
    renderWithProviders(<BuyerDashboard />, { identity: BUYER, route: '/buyer/dashboard' });
    const expiring = await screen.findByTestId('alert-pslExpiring');
    expect(expiring.textContent).toContain('Preferred-supplier listings expiring');
    expect(expiring.textContent).toContain(String(expiringIds().length));

    const expired = await screen.findByTestId('alert-pslExpiredListed');
    expect(expired.textContent).toContain('expired but still listed');
    expect(expired.textContent).toContain('Critical');
    // ⚠️ THE PLURAL IS PINNED, BECAUSE ONLY BROWSER QA SAW IT WRONG. The detail
    // read "Across 1 suppliers" and every spec passed — a count assertion
    // cannot see an ungrammatical sentence around the number. The corpus has
    // exactly one affected supplier, so the SINGULAR branch is the live one.
    const suppliers = new Set(
      pslStore.all().filter((r) => expiredListedIds().includes(r.id)).map((r) => r.supplierId),
    );
    expect(suppliers.size).toBe(1);
    expect(expired.textContent).toContain('At 1 supplier');
    expect(expired.textContent).not.toContain('1 suppliers');
  });

  it('ID — the same two cards are translated, on a divergent token', async () => {
    // `i18n-probe-needs-divergent-token`: "Pencatatan pemasok pilihan" shares no
    // word with the English label, so this assertion can actually fail.
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerDashboard />, { identity: BUYER, route: '/buyer/dashboard' });
      const expiring = await screen.findByTestId('alert-pslExpiring');
      expect(expiring.textContent).toContain('Pencatatan pemasok pilihan akan kedaluwarsa');
      expect(expiring.textContent).not.toContain('Preferred-supplier listings expiring');
      const expired = await screen.findByTestId('alert-pslExpiredListed');
      expect(expired.textContent).toContain('Kritis');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
