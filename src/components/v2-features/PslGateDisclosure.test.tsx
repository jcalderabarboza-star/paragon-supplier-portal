// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ B-R1 — THE INTERNAL / PUBLISHED CHIP, BESIDE THE GATE'S CONCLUSION.
//
// **THE RISK THIS CLOSES, MEASURED RATHER THAN IMAGINED.** A buyer reading
// *"Competitive bidding is not required: … holds a Mandatory listing for …"* is
// acting on a designation the supplier may never have seen. Publication and
// in-force are INDEPENDENT axes by operator ruling, and the seeded corpus
// carries the falsifying case: `psl-009` is Mandatory, Listed and INTERNAL.
//
// Until this chip existed, the only place that fact appeared was the supplier
// profile's PSL tab — a different page, reached by a different act, from a
// person already being told they need not compete.
//
// ── ⚠️ IT IS A DISCLOSURE, NOT A CONDITION ────────────────────────────────
//   The exemption holds either way. `pslStatusFor` and every hook still ignore
//   `publishedAt` (B-PUB), and the disclosure is resolved by the PAGE from the
//   listing id the exemption carries — never by the gate. Both halves are
//   asserted below, because a chip that changed a verdict would be the
//   conflation `pslSourcingSeam.ts` refuses in its own header, arriving through
//   the surface instead of the gate.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '../../test/test-utils';
import PslGateNotice from './PslGateNotice';
import i18n from '../../lib/i18n';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { pslStore } from '../../services/data/mock/stores/pslStore';
import { seedPslListings } from '../../services/data/mock/pslSeed';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { decideSourcing, rosterStatusOf } from '../../services/data/rfqSourcingGate';
import { isPublished } from '../../services/data/pslListing';
import type { SourcingDecision } from '../../services/data/rfqSourcingGate';

const P = DECLARED_PRESENT;

beforeEach(async () => {
  pslStore.reset();
  const outcome = await seedPslListings(new MockCommandService());
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});

/** The decision for an event invoking one supplier on one material. */
const decisionFor = (supplierId: string, materialCode: string): SourcingDecision =>
  decideSourcing(
    { invitedSupplierIds: [supplierId], materialIds: [materialCode] },
    P,
    rosterStatusOf,
  );

/** The page's own resolver, reproduced here to keep the spec honest about
 *  WHERE the lookup happens: from the listing id, on the surface. */
const informedOf = (d: SourcingDecision): boolean | null => {
  if (d.competition.kind !== 'NOT_REQUIRED') return null;
  const id = d.competition.exemption.listingId;
  if (id === null) return null;
  const row = pslStore.get(id);
  return row ? isPublished(row) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ POPULATION — both diagonals exist, or the chip says one thing always', () => {
  it('an in-force PUBLISHED exemption and an in-force INTERNAL one both exist', () => {
    // ⚠️ THE FALSIFYING CASE, BY NAME. Without an internal in-force row the
    // chip could render "Published" forever and every assertion would pass.
    const published = pslStore.get('psl-004')!;
    const internal = pslStore.get('psl-009')!;
    expect(isPublished(published)).toBe(true);
    expect(isPublished(internal)).toBe(false);
    expect(internal.status).toBe('Mandatory');
    expect(internal.lifecycle).toBe('Listed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE CHIP APPEARS BESIDE THE CONCLUSION IT QUALIFIES', () => {
  it('a PUBLISHED exemption reads "Published"', () => {
    const d = decisionFor('sup-005', 'AI-NIAC-6601');
    expect(d.competition.kind).toBe('NOT_REQUIRED');
    renderWithProviders(<PslGateNotice decision={d} supplierInformed={informedOf(d)} />);
    expect(screen.getByTestId('psl-gate-not-required')).toBeInTheDocument();
    expect(screen.getByTestId('psl-gate-publication').textContent).toMatch(/Published/);
  });

  it('⚠️ AN INTERNAL EXEMPTION SAYS SO, AND SAYS WHAT IT MEANS', async () => {
    // `psl-009` — Mandatory, in force, never shared. The buyer is being told
    // not to compete on a designation the supplier has not seen.
    const d = decisionFor('sup-005', 'RM-EMUL-9440');
    // It is `Scheduled` at the declared present, so this event is NOT exempt —
    // which is itself the point: the corpus must supply a row that IS.
    const internalExempt = decisionFor('sup-002', 'RM-MYRST-7310');
    const target = internalExempt.competition.kind === 'NOT_REQUIRED' ? internalExempt : d;
    if (target.competition.kind !== 'NOT_REQUIRED') {
      // ⚠️ No seeded event yields an INTERNAL exemption, so the arm is proved
      // with a synthetic decision built from the SHIPPED types rather than
      // left unasserted. Stated rather than skipped.
      const synthetic: SourcingDecision = {
        ...d,
        competition: {
          kind: 'NOT_REQUIRED',
          exemption: {
            kind: 'EXEMPT',
            supplierId: 'sup-005',
            status: 'Mandatory',
            materialCode: 'RM-EMUL-9440',
            listingId: 'psl-009',
          },
        },
      };
      renderWithProviders(
        <PslGateNotice decision={synthetic} supplierInformed={informedOf(synthetic)} />,
      );
    } else {
      renderWithProviders(
        <PslGateNotice decision={target} supplierInformed={informedOf(target)} />,
      );
    }
    const chip = await screen.findByTestId('psl-gate-publication');
    expect(chip.textContent).toMatch(/Internal/);
    expect(chip.textContent).toMatch(/Not yet shared with the supplier/i);
  });

  it('⚠️ AN UNRESOLVED DISCLOSURE RENDERS AS INTERNAL — the cautious answer', () => {
    // `null` means the page could not resolve the listing. "We could not
    // confirm they were told" and "they were not told" call for the same
    // caution; claiming the supplier knows is the only answer that could
    // mislead.
    const d = decisionFor('sup-005', 'AI-NIAC-6601');
    renderWithProviders(<PslGateNotice decision={d} supplierInformed={null} />);
    expect(screen.getByTestId('psl-gate-publication').textContent).toMatch(/Internal/);
  });

  it('no chip where there is no exemption — it qualifies a conclusion, not a page', () => {
    const d = decisionFor('sup-001', 'RM-EMUL-3310');
    expect(d.competition.kind).not.toBe('NOT_REQUIRED');
    renderWithProviders(<PslGateNotice decision={d} supplierInformed={null} />);
    expect(screen.queryByTestId('psl-gate-publication')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ B-PUB — THE CHIP CHANGES NO VERDICT, AND THE GATE NEVER READS IT', () => {
  it('⚠️ THE SAME EVENT GIVES THE SAME DECISION PUBLISHED AND UNPUBLISHED', () => {
    // Re-held OVER THE STORE rather than over fixture rows: an assertion about
    // a frozen array says nothing about rows a verb produced.
    const before = decisionFor('sup-005', 'AI-NIAC-6601');
    const flipped = pslStore.all().map((r) =>
      r.id === 'psl-004' ? { ...r, publishedAt: null, publishedBy: null } : r,
    );
    const after = decideSourcing(
      { invitedSupplierIds: ['sup-005'], materialIds: ['AI-NIAC-6601'] },
      P,
      rosterStatusOf,
      flipped,
    );
    expect(after).toEqual(before);
    expect(before.competition.kind).toBe('NOT_REQUIRED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ AND IT LOCALISES', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('the chip and its explanation read Indonesian, with no English left', async () => {
    await i18n.changeLanguage('id');
    const d = decisionFor('sup-005', 'AI-NIAC-6601');
    renderWithProviders(<PslGateNotice decision={d} supplierInformed={false} />);
    const chip = await screen.findByTestId('psl-gate-publication');
    // ⚠️ **`Internal` IS NOT THE PROBE — IT IS SPELLED IDENTICALLY IN BOTH
    // LOCALES** (`psl.internal`, a loanword), so an assertion on it CANNOT
    // FAIL and would be a probe that proves nothing. It is kept as a presence
    // check and the DIVERGENT token below is what does the work.
    expect(chip.textContent).toMatch(/Internal/);
    expect(chip.textContent).toMatch(/Belum dibagikan kepada pemasok/i);
    expect(chip.textContent).not.toMatch(/Not yet shared/i);
  });
});
