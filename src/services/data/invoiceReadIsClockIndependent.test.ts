// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE INVOICE READ DOES NOT DEPEND ON THE WALL CLOCK.
//
// ⚠️ **WHAT THIS CLOSES, AND WHY ANCHORING THE FIXTURES WAS ONLY HALF OF IT.**
// #354 made `invoice` a real anchored family: the corpus is shifted onto
// `DECLARED_PRESENT` at module load. **The thing that READ it was still calling
// `new Date()`**, so the partition was correct on the day of the merge and
// decayed from there — measured through this very seam, day by day: the corpus'
// authored intent (exactly one overdue row) broke 18 days after `P`, and 40 days
// after `P` both `Pending Match` and `Approved` rendered ZERO. That is the state
// #354 existed to repair, coming back on a calendar day with nobody touching a
// file.
//
// ⚠️ **AND NOTHING WOULD HAVE SAID SO.** `clockDrift` binds to families a reader
// can still see a STORED clock-state on; `invoice` stores none (law 0.5 —
// `Overdue` is computed at read, and `DISPLAY_STATES` classes it
// `computed-at-read`), so `familyDrift` returns `computed` before it ever
// computes headroom. The scheduled drift gate is silent for this family at every
// date, which is why the property has to be asserted here instead.
//
// ── WHY IT GOES THROUGH THE SERVICE, NOT THE PROJECTION ─────────────────────
//   `toBuyerLabel(inv, now)` is a pure function of the `now` it is handed — it
//   was never the defect, and asserting it proves nothing about which `now`
//   arrives. The defect lived in the CALLER. So every assertion below calls
//   `getBuyerInvoices` / `getSupplierInvoices`, the seam the pages actually use.
//
// ── WHY THE INSTANTS ARE OFFSETS AND NOT LITERALS ──────────────────────────
//   Each probe instant is an offset from `DECLARED_PRESENT` or from the real
//   clock, never a dated literal. The property is *"identical output"*, never
//   *"this particular output"* — so there is no day on which this file starts
//   failing with no commit involved, which is exactly the trap the fixtures
//   themselves fell into.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { MockProcurementService } from './mock/MockProcurementService';
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';
import { DECLARED_PRESENT, FAMILY_ANCHORS } from './fixturePresent';
import type { QueryScope } from './types';

const reads = new MockProcurementService();
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};
const sup007: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
};

const REAL = globalThis.Date;
const MS = 86_400_000;
const P_MS = REAL.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/** Move the calendar the code reads, without faking timers. */
function installClock(atMs: number): () => void {
  const offset = atMs - REAL.now();
  globalThis.Date = new Proxy(REAL, {
    construct: (t, a) =>
      a.length === 0
        ? new t(REAL.now() + offset)
        : new t(...(a as ConstructorParameters<DateConstructor>)),
    get: (t, p, r) => (p === 'now' ? () => REAL.now() + offset : Reflect.get(t, p, r)),
  }) as DateConstructor;
  return () => {
    globalThis.Date = REAL;
  };
}

/** The instants. `P + 18` and `P + 40` are the two dates the decay was measured
 *  at; the rest bracket them widely, in both directions. */
const INSTANTS: ReadonlyArray<readonly [string, number]> = [
  ['the real wall clock', REAL.now()],
  ['P + 18d (the authored intent broke here)', P_MS + 18 * MS],
  ['P + 40d (both labels emptied here)', P_MS + 40 * MS],
  ['P + 5 years', P_MS + 1826 * MS],
  ['P − 1 year', P_MS - 365 * MS],
];

const partition = (rows: ReadonlyArray<{ id: string; status: string }>): string => {
  const m = new Map<string, string[]>();
  for (const r of rows) m.set(r.status, [...(m.get(r.status) ?? []), r.id]);
  return [...m.keys()]
    .sort()
    .map((k) => `${k}=[${[...m.get(k)!].sort().join(',')}]`)
    .join(' ');
};

const buyerPartition = async (): Promise<string> =>
  partition((await reads.getBuyerInvoices(buyer)).items);

const supplierPartition = async (): Promise<string> =>
  partition((await reads.getSupplierInvoices(sup007)).items);

/** Every `daysOutstanding` the buyer surface renders, by row. */
const buyerAging = async (): Promise<string> =>
  (await reads.getBuyerInvoices(buyer)).items
    .map((r) => `${r.id}:${r.daysOutstanding}`)
    .sort()
    .join(' ');

describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('⚠️ FIRST — the clock proxy really moves the calendar the code reads', () => {
    // EMPTY-INPUT-REPORTS-CLEAN-01 / §86: every assertion in this file is an
    // EQUALITY between two runs, and equality is exactly what a harness that
    // FAILED TO MOVE THE CLOCK also produces. Without this the file is a set of
    // tests that cannot fail.
    const before = new Date().toISOString().slice(0, 10);
    const restore = installClock(P_MS + 40 * MS);
    try {
      expect(new Date().toISOString().slice(0, 10)).not.toBe(before);
      expect(new Date().toISOString().slice(0, 10)).toBe(
        new REAL(P_MS + 40 * MS).toISOString().slice(0, 10),
      );
    } finally {
      restore();
    }
    expect(new Date().toISOString().slice(0, 10)).toBe(before);
  });

  it('the read returns rows at all, and the instants really differ', async () => {
    expect((await reads.getBuyerInvoices(buyer)).items.length).toBeGreaterThan(1);
    expect((await reads.getSupplierInvoices(sup007)).items.length).toBeGreaterThan(0);
    expect(new Set(INSTANTS.map(([, ms]) => ms)).size).toBe(INSTANTS.length);
  });
});

describe('⚠️ THE BUYER INVOICE PARTITION IS INVARIANT UNDER THE WALL CLOCK', () => {
  it('every label and its members are identical at every instant', async () => {
    const baseline = await buyerPartition();
    // The baseline is not vacuous: it names members, and the three labels the
    // decay emptied are all present. A partition of `{}` would satisfy every
    // equality below.
    expect(baseline).toContain('Pending Match=[');
    expect(baseline).toContain('Approved=[');
    expect(baseline).toContain('Overdue=[');

    for (const [label, at] of INSTANTS) {
      const restore = installClock(at);
      try {
        expect(await buyerPartition(), `the buyer partition moved at ${label}`).toBe(baseline);
      } finally {
        restore();
      }
    }
  });

  it('the aging numbers the surface renders are identical too', async () => {
    // A partition can hold while `daysOutstanding` drifts underneath it — the
    // label is a threshold, the number is not, and BOTH are rendered
    // (`buyerInvoices.table.daysOverdue`). So both are pinned.
    const baseline = await buyerAging();
    expect(baseline).toMatch(/inv-evo-0188:[1-9]/); // the overdue row really is aging
    for (const [label, at] of INSTANTS) {
      const restore = installClock(at);
      try {
        expect(await buyerAging(), `the aging numbers moved at ${label}`).toBe(baseline);
      } finally {
        restore();
      }
    }
  });
});

describe('⚠️ THE SUPPLIER INVOICE PARTITION IS INVARIANT TOO', () => {
  it('every label and its members are identical at every instant', async () => {
    const baseline = await supplierPartition();
    expect(baseline.length).toBeGreaterThan(0);
    for (const [label, at] of INSTANTS) {
      const restore = installClock(at);
      try {
        expect(await supplierPartition(), `the supplier partition moved at ${label}`).toBe(
          baseline,
        );
      } finally {
        restore();
      }
    }
  });
});

describe('⚠️ THE SWEEP THAT FOUND THE DECAY, COMMITTED AS THE REGRESSION', () => {
  it('no day in a horizon wider than the declared tolerance moves the partition', async () => {
    // The range is DERIVED from the family's own declared tolerance rather than
    // written as a number here, so widening the window widens the probe with
    // nobody editing this line. The lower bound is asserted so a tolerance that
    // shrank could not quietly shrink the sweep past the measured decay dates.
    const tolerance = FAMILY_ANCHORS.invoice.toleranceDays;
    expect(tolerance, 'the invoice family must declare a tolerance').not.toBeNull();
    const span = tolerance! * 4;
    expect(span, 'the sweep must reach past both measured decay dates').toBeGreaterThan(40);

    const baseline = await buyerPartition();
    const moved: string[] = [];
    for (let d = 0; d <= span; d++) {
      const restore = installClock(P_MS + d * MS);
      try {
        if ((await buyerPartition()) !== baseline) moved.push(`P+${d}d`);
      } finally {
        restore();
      }
    }
    expect(moved, 'the partition changed on these days of the sweep').toEqual([]);
  });
});
