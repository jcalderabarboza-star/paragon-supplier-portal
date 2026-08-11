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
import * as discoveryFixtures from '../services/data/mock/fixtures/buyerDiscovery';
import {
  SINGLE_SOURCE,
  RECOMMENDED,
  QUALIFICATIONS,
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

// ⚠️ SCOPE, RESTATED AT BATCH C — THE OLD LIMIT IS GONE, SO THE NOTE THAT
// DESCRIBED IT MUST GO TOO. This used to sweep the endorsement surface ONLY,
// because `SINGLE_SOURCE` / `RECOMMENDED` still named real corporations and that
// residue was pinned rather than fixed. C removed the residue: the
// global-supplier rows are DELETED outright and the three surviving reads took
// batch A's treatment. So the sweep now covers everything the page ships.
//
// The ONE thing still excluded is `SINGLE_SOURCE[].material` — it carries
// `Givaudan Floral Accord FG-2847`, a real TRADEMARK in a material identity,
// which is batch B's relocation case. Named here so the exclusion is a stated
// scope and not an unexamined pass.
const shippedStrings = (): string[] => [
  ...Object.values(discoveryEn),
  ...Object.values(discoveryId),
  ...SINGLE_SOURCE.flatMap((r) => [r.currentSupplier, r.risk, ...r.suggestedAlternatives]),
  ...RECOMMENDED.flatMap((r) => [r.name, r.whyRecommended, r.riskNote ?? '']),
  ...QUALIFICATIONS.map((q) => q.supplier),
];

/** Subject-position identities the page ships — the population batch C had to
 *  clean. `material` is excluded by scope above (batch B). */
const subjectIdentities = (): string[] => [
  ...SINGLE_SOURCE.flatMap((r) => [r.currentSupplier, ...r.suggestedAlternatives]),
  ...RECOMMENDED.map((r) => r.name),
  ...QUALIFICATIONS.map((q) => q.supplier),
];

describe('DISCOVERY-ENDORSEMENT-01 — the endorsement is deleted, not relabelled', () => {
  it.each(REAL_CORPORATIONS)(
    'no shipped discovery string names %s',
    (brand) => {
      const hits = shippedStrings().filter((s) => s.includes(brand));
      expect(hits).toEqual([]);
    },
  );

  it('the candidate pool is gone from the fixture entirely — not emptied, not renamed', () => {
    // At batch C the endorsement's HOST went too. An empty `GLOBAL_SUPPLIERS`
    // array would still be an export a future batch could refill, and the ruling
    // is that real candidate names must be UNREACHABLE, not merely absent — so
    // the export itself must not exist. (Its type and service method go with it;
    // `tsc` guards those, which is why they are not re-asserted here.)
    expect(Object.keys(discoveryFixtures)).not.toContain('GLOBAL_SUPPLIERS');
    // Non-vacuous: the reads that SURVIVE are still exported and populated.
    expect(SINGLE_SOURCE.length).toBeGreaterThan(0);
    expect(RECOMMENDED.length).toBeGreaterThan(0);
    expect(QUALIFICATIONS.length).toBeGreaterThan(0);
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

  // ── ⚠️ THIS PIN HAS INVERTED, AND THAT IS THE POINT OF HAVING WRITTEN IT ───
  //   It used to assert the residue was PRESENT — `toContain('BASF Personal Care
  //   DE')` — so that a later batch could not clean it up quietly and leave
  //   `DISCOVERY-REAL-SUBJECTS-01` standing as an open finding about a tree that
  //   no longer had the defect. Batch C is that later batch. The pin did its job:
  //   it went RED and forced this file to be updated deliberately.
  //
  //   It is now inverted rather than deleted. Deleting it would remove the only
  //   thing checking the direction nothing else checks — the guard must not be
  //   deleted along with the data it guarded. A denylist over subject identities
  //   is the weak instrument (§11e), so the assertion is a DERIVATION: every
  //   subject-position identity the page ships must carry the `Sample` marker.
  //   A real name returning here reddens this without anyone editing a list.
  it('DISCOVERY-REAL-SUBJECTS-01 · every subject identity is fictional by marker', () => {
    const subjects = subjectIdentities();
    const unmarked = subjects.filter(
      (s) => !/\bSample\b/.test(s) && s !== 'Not yet sourced',
    );
    expect(
      unmarked,
      `discovery subject identity without the Sample marker: ${unmarked.join(' | ')}`,
    ).toEqual([]);
    expect(subjects.length).toBeGreaterThan(8); // non-vacuous
  });

  it('the ratings and risk levels SURVIVED the substitution — the subject was the defect', () => {
    // The arc's thesis, asserted where it can regress: C removed the real parties
    // and kept every assessment. A batch that quietly dropped the risk levels
    // while renaming would have been a different, lossier remedy.
    expect(SINGLE_SOURCE.map((r) => r.riskLevel)).toContain('High');
    expect(SINGLE_SOURCE.map((r) => r.riskLevel)).toContain('Critical');
    expect(RECOMMENDED.every((r) => typeof r.matchScore === 'number')).toBe(true);
    // …and the one sentence that WAS a claim about a real firm's competence is
    // gone with it. It never rendered; it was still the worst string in the file.
    expect(SINGLE_SOURCE.some((r) => r.risk.includes('quality issues'))).toBe(false);
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
