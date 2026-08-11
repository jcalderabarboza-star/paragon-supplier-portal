// ─────────────────────────────────────────────────────────────────────────────
// DISCOVERY-ENDORSEMENT-01 — THE RETRACTION, PINNED.
//
// The defect: every global-supplier card rendered a list of named REAL
// corporations under a heading asserting they had validated the supplier, with a
// green check per brand and a FILTER TOGGLE on the attribute. The ruling that
// separates it from every other row in the honesty census:
//
//   ⚠️ **NO MARKER, PILL OR DISCLAIMER WOULD HAVE MADE IT ACCEPTABLE.**
//
// Everything else in the census is answerable by disclosure. This is not:
// disclosure is a remedy for OVERSTATEMENT, not for speaking on a third party's
// behalf. A "Sample data" pill beside `✓ L'Oréal` does not convert an
// unauthorised statement about a corporation into a permissible one — it
// converts it into a disclosed one.
//
// ── ⚠️ WHY THIS TEST CENSUSES STRINGS INSTEAD OF ASSERTING ABSENCE ──────────
//   The obvious test — "the card does not render a brand pill" — passes the
//   moment the block is deleted and then never speaks again. It cannot see the
//   name coming BACK, which is the only failure that matters here: a fixture is
//   the easiest file in the repo to add a plausible-looking name to. So the
//   guard sweeps every shipped discovery string — fixture values AND both
//   locales — for a named list of real corporations, and goes red on
//   re-introduction anywhere, in any field, in either language.
//
//   The list is the one the defect actually shipped, plus the chemical majors
//   the same field named. It is deliberately NOT exhaustive of real companies —
//   nothing could be — and that limit is the finding's, not the test's:
//   `DISCOVERY-REAL-SUBJECTS-01` (OPEN) records that the SUPPLIER identities
//   below are themselves real corporations carrying fabricated attributes, and
//   that widening the remedy to them is an operator ruling, not a sweep.
// ─────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { discoveryEn, discoveryId } from '../lib/i18n/discovery';
import {
  GLOBAL_SUPPLIERS,
  SINGLE_SOURCE,
} from '../services/data/mock/fixtures/buyerDiscovery';
import BuyerDiscovery from './BuyerDiscovery';

/** The corporations the retracted field named, plus the majors it listed. */
const REAL_CORPORATIONS = [
  "L'Oréal",
  'Unilever',
  'P&G',
  'Shiseido',
  'LVMH',
  'Estée Lauder',
  'Beiersdorf',
  'Henkel',
  'Colgate-Palmolive',
  'Johnson & Johnson',
  'Amorepacific',
  'Wings Group',
  'Indofood',
  'BASF',
] as const;

// ⚠️ SCOPE, STATED — this sweeps the ENDORSEMENT SURFACE ONLY: the
// global-supplier rows the field hung off, plus both locales. It does NOT sweep
// `SINGLE_SOURCE` / `RECOMMENDED`, which still name real corporations in a
// different role (current source, suggested alternative). That is not an
// oversight the reader has to detect — it is `DISCOVERY-REAL-SUBJECTS-01`, and
// the test below pins the residue so the limit cannot pass for coverage.
const shippedStrings = (): string[] => [
  ...Object.values(discoveryEn),
  ...Object.values(discoveryId),
  ...GLOBAL_SUPPLIERS.flatMap((s) => [
    s.name,
    s.country,
    s.region,
    s.description,
    ...s.categories,
    ...s.certifications,
  ]),
];

describe('DISCOVERY-ENDORSEMENT-01 — the endorsement is deleted, not relabelled', () => {
  it.each(REAL_CORPORATIONS)(
    'no shipped discovery string names %s',
    (brand) => {
      const hits = shippedStrings().filter((s) => s.includes(brand));
      expect(hits).toEqual([]);
    },
  );

  it('the fixture carries no endorsement field at all — deleted, not emptied', () => {
    // An empty array would still be a field the page could render a heading
    // over, and a field a future batch could refill. The key is gone.
    for (const supplier of GLOBAL_SUPPLIERS) {
      expect(Object.keys(supplier)).not.toContain('validatedBy');
    }
    expect(GLOBAL_SUPPLIERS.length).toBeGreaterThan(0);
  });

  it('neither locale keeps a label or filter for the retracted field', () => {
    for (const dict of [discoveryEn, discoveryId]) {
      expect(dict['discovery.card.validatedBy']).toBeUndefined();
      expect(dict['discovery.toggle.major']).toBeUndefined();
    }
  });

  it('the hero no longer asserts that anyone validated these suppliers', () => {
    // The card label was retracted at D-CENSUS-8 while THIS string, one field
    // above it, kept making the same claim — the join the earlier pass missed.
    // `validated` / `divalidasi` are the assertion verbs the string used.
    expect(discoveryEn['discovery.hero.body']).not.toMatch(/validated by/i);
    expect(discoveryId['discovery.hero.body']).not.toMatch(/divalidasi/i);
    // …and the retraction landed in BOTH locales, not just the authored one.
    expect(discoveryEn['discovery.hero.body']).toBeTruthy();
    expect(discoveryId['discovery.hero.body']).toBeTruthy();
  });

  // ── ⚠️ BILATERAL, AND THIS HALF IS THE ONE THAT ROTS ──────────────────────
  //   `looseEndCensus` precedent: an exemption that outlives its subject is a
  //   document asserting a defect the tree no longer has. So the residue this
  //   batch deliberately did NOT fix is pinned here, in the direction nothing
  //   normally checks — if somebody cleans `SINGLE_SOURCE` up, this goes RED and
  //   forces `DISCOVERY-REAL-SUBJECTS-01` to be closed rather than left standing.
  it('DISCOVERY-REAL-SUBJECTS-01 is still OPEN — the residue is pinned, not implied', () => {
    const attributions = SINGLE_SOURCE.flatMap((row) => [
      row.currentSupplier,
      ...row.suggestedAlternatives,
    ]);
    // Fabricated NEGATIVE claims against a named real corporation — a different
    // and arguably worse shape than the endorsement this batch removed. Left in
    // place because renaming these without renaming `GlobalSupplier.name` would
    // be incoherent, and that is one operator ruling, not a sweep-batch call.
    expect(attributions).toContain('BASF Personal Care DE');
    expect(attributions).toContain('Givaudan DE');
    // ⚠️ The RATING is what reaches a reader — browser-verified. The `risk` prose
    // beside it is fixture-only and renders nowhere, so it is pinned separately
    // and NOT described as shipped.
    expect(SINGLE_SOURCE.map((r) => r.riskLevel)).toContain('High');
    expect(SINGLE_SOURCE.some((r) => r.risk.includes('quality issues'))).toBe(true);
  });

  it('renders the supplier search with no endorsement heading and no brand pill', async () => {
    renderWithProviders(<BuyerDiscovery />);
    expect(await screen.findByText('Supplier Discovery')).toBeInTheDocument();
    expect(screen.queryByText(/Market validated by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reference brands claimed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Claims a major brand/i)).not.toBeInTheDocument();
    for (const brand of REAL_CORPORATIONS) {
      expect(screen.queryByText(brand)).not.toBeInTheDocument();
    }
  });
});
