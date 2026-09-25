// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE BACK-DATING GUARD DOES NOT FALSIFY THE SEEDED LINES — MEASURED.
//
// The guard refuses transmitting a line whose date is already past. Every
// seeded released line in this lane IS past-dated today, so the obvious worry
// is that the batch has just declared its own fixtures illegal.
//
// **It has not, and the reason is a fact about the seed rather than an
// exemption in the code.** Each demo calendar was released by the SAME pure
// verb at fixture-build time with an INJECTED stamp of `2026-03-15`, and every
// date it released falls AFTER that stamp. Those lines were transmitted while
// their dates were still in the future — which is exactly what the rule
// requires of a release. The rule is true of the seed; it is not waived for it.
//
// ⚠️ **SO THE ASSERTION IS `releasedAt <= releaseDate`, NOT "the guard skips
// fixtures".** An exemption would be a hole; this is a property. If a future
// batch seeded a line released AFTER its own due date, this goes red and says
// so — which is the correct outcome, because such a line would be a fabricated
// commitment.
//
// ⚠️ **AND IT IS DERIVED OVER THE LIVE CORPUS, BY NAMED MEMBER.**
// `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`: a row count would be
// preserved by a replacement, and an id-only control is exactly what a
// `shiftFields` re-anchor walks through. The claim here depends on VALUES
// (two dates and their order), so the values are what is pinned.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { schedulingAgreementStore } from '../stores/schedulingAgreementStore';
import { DECLARED_PRESENT } from '../../data/fixturePresent';
import { DELIVERY_SEED_ACTOR } from '../seedActor';

/** Every seeded RELEASED line across the whole store, with its address. */
function seededReleasedLines() {
  return schedulingAgreementStore.all().flatMap((a) =>
    a.items.flatMap((i) =>
      i.scheduleLines
        .filter((l) => l.state === 'released')
        .map((l) => ({ agreementId: a.id, lineSeq: i.lineSeq, line: l })),
    ),
  );
}

describe('REACH — the probe examines a real, non-empty population', () => {
  it('⚠️ THERE ARE SEEDED RELEASED LINES AT ALL', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: over zero released lines every assertion
    // below passes having examined nothing.
    expect(seededReleasedLines().length).toBeGreaterThan(0);
  });

  it('⚠️ AND AT LEAST ONE OF THEM IS PAST-DATED TODAY — the worry is real', () => {
    // If none were past-dated, this whole file would be proving something that
    // could not have gone wrong, which is `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`.
    const past = seededReleasedLines().filter((r) => r.line.releaseDate < DECLARED_PRESENT);
    expect(past.length).toBeGreaterThan(0);
  });

  it('⚠️ AND THE DEMO ANCHOR IS FOUND BY NAME, THROUGH A VALUE', () => {
    // A named member reached through a VALUE, not an id: replace the corpus and
    // this goes red. `supplierDocumentRefusal.test.ts` is the specimen copied.
    const demo = seededReleasedLines().filter((r) => r.agreementId === 'sa-0002');
    expect(demo.length).toBeGreaterThan(0);
    expect(demo.every((r) => r.line.releasedAt === '2026-03-15T00:00:00.000Z')).toBe(true);
  });
});

describe('⚠️ EVERY SEEDED RELEASE WAS LEGAL WHEN IT HAPPENED', () => {
  it('releasedAt is never AFTER the line it released', () => {
    const offenders = seededReleasedLines()
      .filter((r) => (r.line.releasedAt ?? '').slice(0, 10) > r.line.releaseDate)
      .map((r) => `${r.agreementId}#${r.lineSeq}/${r.line.releaseSeq}`);
    expect(
      offenders,
      'these seeded lines were released after their own due date — a fabricated ' +
        'commitment, and the back-dating guard would be right to refuse them',
    ).toEqual([]);
  });

  it('⚠️ AND THE PRISTINE ANCHOR IS STILL ALL-DRAFT', () => {
    // ctr-003 / sa-0001 is the untouched reference calendar. It stays all-draft
    // STRUCTURALLY (nothing releases it), not by special-casing — so if this
    // ever goes red, something has started writing the reference.
    const anchor = schedulingAgreementStore.get('sa-0001')!;
    expect(anchor.items.every((i) => i.scheduleLines.every((l) => l.state === 'draft'))).toBe(true);
  });
});

describe('⚠️ A SEEDED ACT NAMES NOBODY, AND SAYS SO', () => {
  it('every seeded released line carries the UNATTRIBUTED seed actor', () => {
    // Not a `RESOLVED` person. Inventing one would put manufactured provenance
    // into seed data (C10 §6.3) through the one door with no dispatcher in
    // front of it, and the change-history view would render a name for an act
    // nobody took.
    for (const r of seededReleasedLines()) {
      expect(r.line.releasedBy).toEqual(DELIVERY_SEED_ACTOR);
    }
    expect(DELIVERY_SEED_ACTOR.kind).toBe('UNATTRIBUTED');
  });
});
