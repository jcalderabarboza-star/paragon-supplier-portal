// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — THE GATE.
//
// ⚠️ **THE POPULATION IS DERIVED FROM THE FIXTURE SOURCE, NOT FROM THE EXPORTED
// FIXTURE, AND THAT IS THE PART WORTH COPYING (§86).** The exports are already
// SHIFTED, so deriving a family's coherent window from them would measure the
// shift rather than the authored data — and worse, a mutation to `shiftDays`
// would move the population and the assertion TOGETHER, so the gate could not
// tell "I caught it" from "I have nothing to look at". Reading the raw literals
// off disk sits upstream of every function under test.
//
// ⚠️ **AND THE CENTRAL CLAIM IS CHECKED AS A FUNCTION OF THE ANCHOR, NOT ONLY AT
// THE ANCHOR WE SHIPPED.** `coherentAt()` is evaluated INSIDE and OUTSIDE each
// window in the same run, so the suite proves the window is a real boundary
// rather than proving that today's numbers happen to line up. A gate that only
// ever sees the passing case is unprobed whatever its output says.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DECLARED_PRESENT,
  MANDATE_LEAD_DAYS,
  FAMILY_ANCHORS,
  ABSOLUTE_DATES,
  shiftDays,
  shiftIso,
  shiftFields,
  SDC_WINDOW,
  SHARED_CONTRACT_ANCHOR,
  SHARED_ANCHOR_FAMILIES,
  SHARED_ANCHOR_INTERSECTION,
  type FixtureFamily,
} from './fixturePresent';
import { BPJPH_MANDATE_DATE } from './complianceProjection';
import { DOCUMENTS } from './mock/fixtures/supplierDocuments';
import { documentExpiry } from './dayProjection';
import { mockInventory } from '../../data/mockInventory';

/**
 * Strip comments PROPERLY rather than by line prefix.
 *
 * ⚠️ The line-prefix version of this (drop lines starting with a slash-slash, a
 * star, or a slash-star) MISSED JSX COMMENTS — a JSX comment opens with a BRACE
 * before the slash-star — and produced a false accusation against a file whose
 * comment said it did NOT do the thing. Rule 2:
 * a widened matcher creates false accusations as readily as a narrow one
 * creates blind spots. Every use below carries a both-directions control.
 */
const codeOnly = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

const MS = 86_400_000;
const dayMs = (v: string) => Date.parse(`${v.slice(0, 10)}T00:00:00.000Z`);
const dU = (d: string, o: string) => Math.round((dayMs(d) - dayMs(o)) / MS);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

// ── RAW literals, read off disk — upstream of every shift ────────────────────
const rawPairs = (file: string, dateKey: string, idPrefix: string) => {
  const parts = readFileSync(file, 'utf8').split(new RegExp(`id:\\s*'(?=${idPrefix})`));
  parts.shift();
  return parts.map((p) => ({
    id: /^([^']+)'/.exec(p)?.[1] ?? '',
    status: /status:\s*'([^']*)'/.exec(p)?.[1] ?? null,
    date: new RegExp(`${dateKey}:\\s*'(\\d{4}-\\d{2}-\\d{2})'`).exec(p)?.[1] ?? null,
  }));
};

const rawDocs = rawPairs('src/services/data/mock/fixtures/supplierDocuments.ts', 'expiryDate', 'doc-')
  .filter((r) => r.date && (r.status === 'Valid' || r.status === 'Expiring Soon'));
const rawObls = rawPairs('src/data/mockObligations.ts', 'dueDate', 'obl-')
  .filter((r) => r.date && (r.status === 'Upcoming' || r.status === 'Overdue'));

/**
 * Contracts need TWO dates per row, so they get their own parser rather than a
 * widened `rawPairs` — widening the shared one to carry an optional second key
 * would change what it returns for documents and obligations too, and rule 2 is
 * that a widened matcher creates false accusations as readily as a narrow one
 * creates blind spots.
 */
const rawCtrs = (() => {
  const src = readFileSync('src/data/mockContracts.ts', 'utf8');
  const parts = src.split(/id:\s*'(?=ctr-)/);
  parts.shift();
  return parts.map((p) => ({
    id: /^([^']+)'/.exec(p)?.[1] ?? '',
    status: /status:\s*'([^']*)'/.exec(p)?.[1] ?? '',
    startDate: /startDate:\s*'(\d{4}-\d{2}-\d{2})'/.exec(p)?.[1] ?? '',
    endDate: /endDate:\s*'(\d{4}-\d{2}-\d{2})'/.exec(p)?.[1] ?? '',
  }));
})();

/** `documentExpiry`'s own classification, applied to a RAW date at a candidate anchor. */
const docStateAt = (date: string, anchor: string) => {
  const n = dU(date, anchor);
  return n <= 0 ? 'Expired' : n <= 180 ? 'Expiring Soon' : 'Valid';
};
const docsCoherentAt = (anchor: string) =>
  rawDocs.every((r) => docStateAt(r.date!, anchor) === r.status);
const oblsCoherentAt = (anchor: string) =>
  rawObls.every((r) => (dU(r.date!, anchor) >= 0 ? 'Upcoming' : 'Overdue') === r.status);

/**
 * ⚠️ **THERE IS NO SHIPPED CONTRACT CLASSIFIER, AND THE RULE BELOW SAYS SO
 * RATHER THAN PRETENDING OTHERWISE.** `displayStates.ts` groups `contract`
 * `Expiring` / `Expired` as `stored-in-fixtures` with ZERO non-fixture writes —
 * nothing computes them. So unlike `documentExpiry` (which the document window
 * calls directly) this predicate cannot BE the shipped one.
 *
 * It is instead the weakest rule the two SHIPPED clock-reading predicates make
 * falsifiable, and both are named so a reader can check the provenance:
 *   · `matchesGroup` (`BuyerContracts.tsx`) — the 'expiring' band is 0..90 days
 *   · `expiryTone`   (`contracts/contractView.tsx`) — <0 is danger, <90 warning
 * Only TENSE-BEARING statuses constrain the origin; `Draft` / `Renewed` /
 * `Terminated` make no claim about now and are deliberately unconstrained.
 *
 * ⚠️ This SUPERSEDES the #319 window, which was derived from five authored
 * "bands" that no shipped code implements and put the early bound at 2026-05-17.
 * The corrected bound is 2026-03-17 (ctr-007). The shared anchor is unchanged
 * because `obligation` binds both edges of the intersection either way.
 */
const ctrsCoherentAt = (anchor: string) =>
  rawCtrs.every((r) => {
    const n = dU(r.endDate, anchor);
    if (r.status === 'Expired') return n < 0;
    if (r.status === 'Expiring') return n >= 0 && n <= 90;
    if (r.status === 'Active') return n >= 0 && dU(r.startDate, anchor) <= 0;
    return true;
  });

// ─────────────────────────────────────────────────────────────────────────────

describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('the raw literal populations are non-empty and were read from source', () => {
    expect(rawDocs.length).toBe(8);
    expect(rawObls.length).toBe(17);
    // Known-good / known-bad membership, so a broken parser cannot read as clean.
    expect(rawDocs.map((r) => r.id)).toContain('doc-005');
    expect(rawDocs.map((r) => r.id)).not.toContain('doc-003'); // expiryDate: null
    expect(rawObls.map((r) => r.id)).toContain('obl-007a');
  });

  it('⚠️ the RAW literals are NOT the exported ones — the shift is real', () => {
    // If this ever passes trivially the whole module has become a no-op.
    const doc001 = DOCUMENTS.find((d) => d.id === 'doc-001')!;
    expect(doc001.expiryDate).not.toBe('2026-05-15');
    expect(shiftDays('supplierDocument')).not.toBe(0);
  });
});

describe('the declared present', () => {
  it('is the mandate minus the declared lead, and reads no clock', () => {
    expect(DECLARED_PRESENT).toBe(iso(dayMs(BPJPH_MANDATE_DATE) - MANDATE_LEAD_DAYS * MS));
    // Frozen: two reads in the same process are identical, and it is a literal
    // date rather than an instant.
    expect(DECLARED_PRESENT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('⚠️ the source contains no wall-clock read — option (b) is what this module refuses', () => {
    const src = readFileSync('src/services/data/fixturePresent.ts', 'utf8');
    const code = codeOnly(src);
    expect(/new\s+Date\s*\(\s*\)/.test(code)).toBe(false);
    expect(/Date\.now\s*\(/.test(code)).toBe(false);
    // CONTROL both ways: the stripper did not eat the file, and it DOES see a
    // parameterised `new Date(` — so the two negatives above are measurements.
    expect(code).toContain('DECLARED_PRESENT');
    expect(code).toContain('new Date(');
  });
});

describe('⚠️ THE ABSOLUTE CLASS — dates that must not move', () => {
  it('BPJPH_MANDATE_DATE is a member and is imported, never restated', () => {
    expect(ABSOLUTE_DATES.BPJPH_MANDATE_DATE).toBe(BPJPH_MANDATE_DATE);
    expect(BPJPH_MANDATE_DATE).toBe('2026-10-17');
  });

  it('⚠️ no surface carries its own copy of a regulatory date any more', () => {
    // BuyerCompliance held `new Date('2026-10-17')` — a duplicate that would not
    // have moved with the constant. It reads the constant now.
    const src = readFileSync('src/pages-v2/BuyerCompliance.tsx', 'utf8');
    const code = codeOnly(src);
    expect(code).not.toContain("new Date('2026-10-17')");
    expect(code).toContain('new Date(BPJPH_MANDATE_DATE)');
  });

  it('⚠️ shifting can never reach an absolute date — the shift is a no-op on a non-date', () => {
    // The class is enforced by NOT routing these through a family. Prove the
    // negative control too: a real date DOES move, so the assertion above is not
    // passing because shiftIso is broken.
    expect(shiftIso('2026-10-17', 'shipment')).not.toBe('2026-10-17');
    expect(shiftIso('not-a-date', 'shipment')).toBe('not-a-date');
  });
});

describe('⚠️ EVERY ANCHOR SITS INSIDE ITS OWN FAMILY’S COHERENT WINDOW', () => {
  it('supplierDocument — declared window and anchor agree with the raw literals', () => {
    const [lo, hi] = FAMILY_ANCHORS.supplierDocument.window!;
    expect(docsCoherentAt(lo)).toBe(true);
    expect(docsCoherentAt(hi)).toBe(true);
    expect(docsCoherentAt(FAMILY_ANCHORS.supplierDocument.anchor)).toBe(true);
    // ⚠️ THE BOUNDARY IS REAL — one day outside, either side, and it breaks.
    expect(docsCoherentAt(iso(dayMs(lo) - MS))).toBe(false);
    expect(docsCoherentAt(iso(dayMs(hi) + MS))).toBe(false);
  });

  // ── ⚠️ THE RETRACTION THIS FILE OWED, PAID IN FULL ─────────────────────────
  //   At #320 the operator ruled a false sentence retracted at BOTH sites it
  //   shipped to — `fixturePresent.ts` and HERE, line 157 as it then stood —
  //   with the instruction to QUOTE what was retired rather than delete it. It
  //   was quoted in the module and in `docs/findings.md`, and at this site the
  //   whole test carrying it was replaced, so the sentence vanished from the
  //   one file a reader chasing the mechanism would open. Restored below,
  //   verbatim, as the ruling asked. It read:
  //
  //       "the calendar is read by the DELIVERY lane, which runs on
  //        `SDC_SIMULATED_NOW`, and that clock is not anchored in this batch.
  //        Moving the schedule while its clock stands still is the SDC-4
  //        collision the `sdcClock` module exists to prevent."
  //
  //   **MEASURED FALSE at #320.** `services/delivery` imports nothing from
  //   `mockContracts` and no clock at all; shifting both families with the
  //   clock standing still broke 2 files / 11 tests and not one failure was a
  //   clock-vs-schedule collision. The deferral it justified was correct; its
  //   mechanism was not — §70, one turn too late to stop it shipping.
  //
  // ── ⚠️ AND WHAT THESE LITERALS ARE NOW FOR, WHICH HAS CHANGED ─────────────
  //   `obligation/Upcoming` and `obligation/Overdue` are `computed-at-read` as
  //   of this batch: no reader sees the stored literal any more. So this
  //   assertion is no longer "a surface is still telling the truth" — it is the
  //   ORACLE check. The literals record what the fixture AUTHOR meant, and
  //   `obligationProjection.test.ts` requires the classifier to reproduce them
  //   with zero misclassifications. Holding the window here is what keeps that
  //   oracle honest if the raw dates are ever re-authored.
  //
  //   `clockDrift.ts` reads the same fact from the other side and reports
  //   obligation as `computed` rather than drift-bound — derived from
  //   `DISPLAY_STATES`, so neither file had to be told.
  it('obligation — ANCHORED, and its literals now serve as the projection`s ORACLE', () => {
    const [lo, hi] = FAMILY_ANCHORS.obligation.window!;
    expect(oblsCoherentAt(lo)).toBe(true);
    expect(oblsCoherentAt(hi)).toBe(true);
    expect(oblsCoherentAt(FAMILY_ANCHORS.obligation.anchor)).toBe(true);
    expect(oblsCoherentAt(iso(dayMs(lo) - MS))).toBe(false);
    expect(oblsCoherentAt(iso(dayMs(hi) + MS))).toBe(false);
  });

  it('contract — ANCHORED, window re-derived from the two shipped predicates', () => {
    const [lo, hi] = FAMILY_ANCHORS.contract.window!;
    expect(ctrsCoherentAt(lo)).toBe(true);
    expect(ctrsCoherentAt(hi)).toBe(true);
    expect(ctrsCoherentAt(FAMILY_ANCHORS.contract.anchor)).toBe(true);
    expect(ctrsCoherentAt(iso(dayMs(lo) - MS))).toBe(false);
    expect(ctrsCoherentAt(iso(dayMs(hi) + MS))).toBe(false);
  });

  it('⚠️ contract and obligation SHARE one anchor — they are not two numbers', () => {
    // Obligations name contract ids, so a due date is only meaningful against
    // its contract's window: a CROSS-family comparison, the kind P does not
    // cancel for. Asserted as identity, not as two equal literals.
    for (const f of SHARED_ANCHOR_FAMILIES) {
      expect(FAMILY_ANCHORS[f].anchor, f).toBe(SHARED_CONTRACT_ANCHOR);
    }
    // And the shared anchor is the midpoint of the INTERSECTION, derived here
    // rather than trusted from the constant.
    const [lo, hi] = SHARED_ANCHOR_INTERSECTION;
    expect(lo).toBe(iso(Math.max(dayMs(FAMILY_ANCHORS.contract.window![0]),
                                 dayMs(FAMILY_ANCHORS.obligation.window![0]))));
    expect(hi).toBe(iso(Math.min(dayMs(FAMILY_ANCHORS.contract.window![1]),
                                 dayMs(FAMILY_ANCHORS.obligation.window![1]))));
    const span = Math.round((dayMs(hi) - dayMs(lo)) / MS);
    expect(SHARED_CONTRACT_ANCHOR).toBe(iso(dayMs(lo) + Math.floor(span / 2) * MS));
    // BOTH families are coherent AT the shared anchor — the point of sharing.
    expect(ctrsCoherentAt(SHARED_CONTRACT_ANCHOR)).toBe(true);
    expect(oblsCoherentAt(SHARED_CONTRACT_ANCHOR)).toBe(true);
  });

  it('⚠️ THE INTERSECTION OF supplierDocument AND obligation IS STILL EMPTY', () => {
    // The measurement that ruled out ONE global present, and it does not stop
    // being true because both families are now anchored — it is exactly WHY
    // they are anchored separately. Bound late by doc-005 (expires 2026-11-09,
    // stored 'Valid' — needs > 180d) and early by obl-007a (due 2026-05-16,
    // stored 'Overdue'). If this ever becomes non-empty, option (a) is back on
    // the table and this module is over-built.
    const d = FAMILY_ANCHORS.supplierDocument.window!;
    const o = FAMILY_ANCHORS.obligation.window!;
    expect(dayMs(d[1])).toBeLessThan(dayMs(o[0]));
    expect(Math.round((dayMs(o[0]) - dayMs(d[1])) / MS)).toBe(5);
  });

  it('the stated tolerance is half the window — and half the INTERSECTION when shared', () => {
    // ⚠️ A shared anchor is only as free as the narrower constraint the pair
    // JOINTLY satisfies, so `contract` may not claim half of its own 80-day
    // window. Deriving the divisor per family is what keeps that honest.
    for (const f of Object.keys(FAMILY_ANCHORS) as FixtureFamily[]) {
      const a = FAMILY_ANCHORS[f];
      if (!a.window) {
        expect(a.toleranceDays, f).toBeNull();
        continue;
      }
      const [lo, hi] = (SHARED_ANCHOR_FAMILIES as readonly string[]).includes(f)
        ? SHARED_ANCHOR_INTERSECTION
        : a.window;
      // ⚠️ THE NEARER EDGE, NOT HALF THE SPAN. The old rule was
      // `round(span / 2)`, which OVERSTATES whenever the anchor is not exactly
      // centred: supplierDocument declared 41 while its early edge is 40 days
      // away, so the field promised one day of drift it did not have. A
      // tolerance is the distance to the edge that breaks FIRST.
      expect(a.toleranceDays, f).toBe(
        Math.min(dU(a.anchor, lo), dU(hi, a.anchor)),
      );
    }
  });

  it('⚠️ THE DECLARED PRESENT SITS INSIDE THE SDC WINDOW — P`s hostage, made checkable', () => {
    // `sdc` is the one family coherent WITHOUT being shifted: P was moved to
    // meet it. That makes SDC_WINDOW a live constraint on MANDATE_LEAD_DAYS,
    // and this is the assertion that fires the day sa-0002 seq 6 is re-authored
    // or the lead is bumped past the boundary. Anchoring `sdc` (option 1) is
    // what would retire this test rather than re-pin it.
    const [lo, hi] = SDC_WINDOW;
    expect(DECLARED_PRESENT >= lo).toBe(true);
    expect(DECLARED_PRESENT <= hi).toBe(true);
    // CONTROL both ways — one day outside either edge is outside.
    expect(iso(dayMs(lo) - MS) >= lo).toBe(false);
    expect(iso(dayMs(hi) + MS) <= hi).toBe(false);
  });

  it('⚠️ every family in the union has an anchor, and every anchor a family', () => {
    // Bilateral, so an added family with no anchor is as red as an orphan one.
    const declared = Object.keys(FAMILY_ANCHORS).sort();
    expect(declared).toEqual(
      ['contract', 'goodsReceipt', 'inventory', 'obligation', 'shipment', 'supplierDocument'],
    );
    for (const f of declared as FixtureFamily[]) {
      expect(FAMILY_ANCHORS[f].anchor, f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(FAMILY_ANCHORS[f].why.length, f).toBeGreaterThan(20);
    }
  });
});

describe('⚠️ THE PAYOFF — stored states are TRUE at the declared present', () => {
  it('every dated document’s stored status now matches documentExpiry AT the present', () => {
    const dated = DOCUMENTS.filter(
      (d) => d.expiryDate && (d.status === 'Valid' || d.status === 'Expiring Soon'),
    );
    expect(dated.length).toBe(8);
    for (const d of dated) {
      const projected = documentExpiry(d, `${DECLARED_PRESENT}T00:00:00.000Z`);
      const asStored = d.status === 'Expiring Soon' ? 'expiring' : 'current';
      expect(projected, `${d.id} (${d.expiryDate}) stored '${d.status}'`).toBe(asStored);
    }
  });

  it('⚠️ THE #317 DIVERGENCE IS CLOSED — it was five documents, by name', () => {
    // dayProjection.test.ts pinned the divergence at 2026-09-08: doc-001, doc-005,
    // doc-008, doc-101, doc-202 all disagreed with their stored status. The
    // fixture set was never wrong — it had MOVED — and anchoring is what says so.
    const diverging = DOCUMENTS.filter(
      (d) =>
        d.expiryDate &&
        (d.status === 'Expiring Soon') !==
          (documentExpiry(d, `${DECLARED_PRESENT}T00:00:00.000Z`) === 'expiring'),
    ).map((d) => d.id);
    expect(diverging).toEqual([]);
  });

  it('⚠️ inventory moved a YEAR and is now current — the largest shift in the tree', () => {
    expect(shiftDays('inventory')).toBeGreaterThan(500);
    for (const r of mockInventory) {
      expect(Math.abs(dU(r.lastUpdated, DECLARED_PRESENT)), r.materialCode).toBeLessThanOrEqual(5);
    }
  });
});

describe('shiftFields — the mechanics', () => {
  it('preserves a time and a UTC offset rather than truncating to a day', () => {
    const out = shiftIso('2026-08-18T09:24:00+07:00', 'supplierDocument');
    expect(out.endsWith('T09:24:00+07:00')).toBe(true);
    expect(out.slice(0, 10)).not.toBe('2026-08-18');
  });

  it('leaves null / undefined / empty exactly as they are — absence is a real answer', () => {
    const rows = [{ a: null, b: undefined, c: '', d: '2026-01-01' }] as Array<{
      a: string | null; b?: string; c: string; d: string;
    }>;
    const out = shiftFields(rows, 'shipment', ['a', 'b', 'c', 'd']);
    expect(out[0].a).toBeNull();
    expect(out[0].b).toBeUndefined();
    expect(out[0].c).toBe('');
    expect(out[0].d).not.toBe('2026-01-01');
  });

  it('shifts every row by the SAME whole number of days — spacing is preserved', () => {
    const gapBefore = dU('2026-03-01', '2026-01-01');
    const a = shiftIso('2026-01-01', 'shipment');
    const b = shiftIso('2026-03-01', 'shipment');
    expect(dU(b, a)).toBe(gapBefore);
  });

  it('does not mutate the rows it is given', () => {
    const rows = [{ d: '2026-01-01' }];
    shiftFields(rows, 'shipment', ['d']);
    expect(rows[0].d).toBe('2026-01-01');
  });
});
