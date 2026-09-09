// ─────────────────────────────────────────────────────────────────────────────
// `dayProjection` — the ONE day-count, and the divergence it closed.
//
// ⚠️ **THE CENTRAL ASSERTION IS THAT THE CLOCK MOVES THE ANSWER.** A projection
// that ignores its injected `now` is law 0.5's defect wearing the fix's clothes:
// it would pass every "is the number right today?" test and be exactly as stale
// as the literal it replaced. So every function here is fed TWO different `now`
// values and the output must MOVE.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  daysUntil,
  documentExpiry,
  DOCUMENT_EXPIRING_WINDOW_DAYS,
} from './dayProjection';
import { DOCUMENTS } from './mock/fixtures/supplierDocuments';
import type { SupplierDocument } from './types';
import { DECLARED_PRESENT, shiftDays } from './fixturePresent';

const EARLY = '2026-09-08T00:00:00.000Z';
const LATER = '2027-03-08T00:00:00.000Z';

describe('daysUntil — pure, injected, and the clock actually moves it', () => {
  it('counts whole days forward and backward', () => {
    expect(daysUntil('2026-09-18', EARLY)).toBe(10);
    expect(daysUntil('2026-08-29', EARLY)).toBe(-10);
    expect(daysUntil('2026-09-08', EARLY)).toBe(0);
  });

  it('⚠️ MOVES when `now` moves — the anti-pin assertion', () => {
    const a = daysUntil('2027-01-01', EARLY);
    const b = daysUntil('2027-01-01', LATER);
    expect(a).not.toBe(b);
    expect(a!).toBeGreaterThan(b!);
  });

  it('is INDEPENDENT of the time of day — the truncation that makes rounding exact', () => {
    expect(daysUntil('2026-09-18', '2026-09-08T00:00:00.000Z')).toBe(
      daysUntil('2026-09-18', '2026-09-08T23:59:59.999Z'),
    );
  });

  it('returns null for an absent date, and for an unreadable one', () => {
    expect(daysUntil(null, EARLY)).toBeNull();
    expect(daysUntil(undefined, EARLY)).toBeNull();
    expect(daysUntil('not-a-date', EARLY)).toBeNull();
  });

  it('reads a PIN as what it is — the two retired pins disagreed by 23 days', () => {
    // The exact defect this module retired: one deadline, two "todays".
    const deadline = '2026-05-20';
    const sourcingPin = daysUntil(deadline, '2026-05-18T00:00:00.000Z');
    const rfqPin = daysUntil(deadline, '2026-04-25T00:00:00.000Z');
    expect(sourcingPin).toBe(2);
    expect(rfqPin).toBe(25);
    expect(rfqPin! - sourcingPin!).toBe(23);
  });
});

describe('documentExpiry — the states, and the window', () => {
  const doc = (expiryDate: string | null) => ({ expiryDate });

  it('classifies across the window boundary', () => {
    expect(documentExpiry(doc(null), EARLY)).toBe('no-expiry');
    expect(documentExpiry(doc('2026-09-08'), EARLY)).toBe('expired');
    expect(documentExpiry(doc('2026-09-07'), EARLY)).toBe('expired');
    expect(documentExpiry(doc('2026-09-09'), EARLY)).toBe('expiring');
    expect(documentExpiry(doc('2027-03-07'), EARLY)).toBe('expiring');
    expect(documentExpiry(doc('2027-03-08'), EARLY)).toBe('current');
  });

  it('the window boundary is exactly DOCUMENT_EXPIRING_WINDOW_DAYS, and one day past it is not', () => {
    // 2026-09-08 + 180d = 2027-03-07. Derived, not eyeballed: the first version
    // of this test asserted 2027-03-08 and the projection was right.
    expect(daysUntil('2027-03-07', EARLY)).toBe(DOCUMENT_EXPIRING_WINDOW_DAYS);
    expect(documentExpiry(doc('2027-03-07'), EARLY)).toBe('expiring');
    expect(daysUntil('2027-03-08', EARLY)).toBe(DOCUMENT_EXPIRING_WINDOW_DAYS + 1);
    expect(documentExpiry(doc('2027-03-08'), EARLY)).toBe('current');
  });

  it('⚠️ MOVES when `now` moves — a current document becomes expiring, then expired', () => {
    const d = doc('2027-03-09');
    expect(documentExpiry(d, EARLY)).toBe('current');
    expect(documentExpiry(d, LATER)).toBe('expiring');
    expect(documentExpiry(d, '2028-01-01T00:00:00.000Z')).toBe('expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE DIVERGENCE — named documents, so a regression says WHICH one broke.
// ─────────────────────────────────────────────────────────────────────────────

const byId = (id: string): SupplierDocument => {
  const d = DOCUMENTS.find((x) => x.id === id);
  if (!d) throw new Error(`fixture ${id} is gone — this test's subject, not its instrument`);
  return d;
};

describe('⚠️ THE STORED `status` LITERAL vs THE CLOCK — the divergence, and its retirement', () => {
  // ── ⚠️ THIS BLOCK'S SUBJECT NO LONGER EXISTS ─────────────────────────────
  //   It asserted that the stored literal and the clock AGREE. There is no
  //   stored clock literal any more: `doc-001` and `doc-202` hold `'Valid'`, a
  //   declared flow state, and `'Expiring Soon'` has left
  //   `SupplierDocumentStatus` entirely. `tsc` says so — the comparisons below
  //   were `TS2367: types 'SupplierDocumentStatus' and '"Expiring Soon"' have
  //   no overlap`, which is the type finding what the prose would have missed.
  //
  //   RETIRED, quoted rather than deleted — including the §71 reasoning that
  //   built it, because that reasoning is still right and will be wanted again:
  //
  //     it('⚠️ NO document diverges at the declared present — the divergence is
  //         CLOSED', … (d.status === 'Expiring Soon') !== (documentExpiry(d,
  //         PRESENT) === 'expiring') … expect(diverging).toEqual([]))
  //
  //     it('⚠️ THE INSTRUMENT STILL FIRES — the same five names, at the
  //         pre-anchor geometry', … expect(diverging).toEqual(['doc-001',
  //         'doc-005', 'doc-008', 'doc-101', 'doc-202']))
  //
  //     it('doc-001 — the MUI halal certificate — stores "Expiring Soon" and
  //         now IS expiring', … expect(doc.status).toBe('Expiring Soon'))
  //
  //   and the note that justified the pair:
  //     "A CLEAN READING TAKEN RIGHT AFTER THE FIX IS A REPORT ABOUT THE FIX
  //      (CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01, §71). An expect(diverging)
  //      .toEqual([]) alone would be exactly that: a real population, a correct
  //      matcher, an honest zero — and no evidence the instrument can still
  //      fire."
  //
  //   ⚠️ **THE §71 SECOND TEST IS THE ONE WORTH MOURNING, AND IT IS ALSO THE
  //   ONE THAT PROVES THE RETIREMENT IS RIGHT.** It fired the instrument at a
  //   past geometry and recovered five names. With nothing stored, it would
  //   compare the clock to itself at that instant and recover NONE — not
  //   because the tree improved, but because one side of the comparison is
  //   gone. A guard that can no longer fail is worse than none, so it goes
  //   rather than being re-pinned to a zero it cannot help returning.
  //
  //   What survives is below and in `documentDisplayState.test.ts`: the CLOCK
  //   half, asserted directly, at instants that move.
  const PRESENT = `${DECLARED_PRESENT}T00:00:00.000Z`;

  it('the fixture population is present — no assertion below is vacuous', () => {
    expect(DOCUMENTS.length).toBeGreaterThan(10);
    expect(DOCUMENTS.some((d) => d.id === 'doc-001')).toBe(true);
    expect(DOCUMENTS.some((d) => d.id === 'doc-999')).toBe(false);
  });

  it('⚠️ doc-001 stores a DECLARED FLOW STATE now, and still computes expiring', () => {
    // The exclusion closing, at the row it was about: `'Valid'` is in
    // `getFlow('supplierDocument').states`, `'Expiring Soon'` never was.
    const doc = byId('doc-001');
    expect(doc.status).toBe('Valid');
    expect(documentExpiry(doc, PRESENT)).toBe('expiring');
    expect(daysUntil(doc.expiryDate, PRESENT)).toBeGreaterThan(0);
  });

  it('⚠️ AND THE CLOCK STILL MOVES doc-001 — the instrument that replaced the divergence probe', () => {
    // §71's concern survives its test: a zero taken after a fix reports the
    // fix. So rather than assert an absence, assert that the classifier still
    // DISCRIMINATES — three instants, three different answers, on the row the
    // retired block was named for.
    const doc = byId('doc-001');
    expect(documentExpiry(doc, '2026-01-01T00:00:00.000Z')).toBe('current');
    expect(documentExpiry(doc, PRESENT)).toBe('expiring');
    expect(documentExpiry(doc, '2030-01-01T00:00:00.000Z')).toBe('expired');
  });

  it('doc-005 / doc-008 / doc-101 store "Valid" and are genuinely current', () => {
    for (const id of ['doc-005', 'doc-008', 'doc-101']) {
      const doc = byId(id);
      expect(doc.status, id).toBe('Valid');
      expect(documentExpiry(doc, PRESENT), id).toBe('current');
    }
  });
});
