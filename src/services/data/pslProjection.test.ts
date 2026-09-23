// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE PSL PROJECTION, THE CAP AND THE BEST-STATUS LADDER.
//
// Every assertion below takes its instant as an OFFSET from `DECLARED_PRESENT`,
// never as a dated literal. The property is *"this arm is taken"*, never *"on
// this date"* — so there is no day on which this file starts failing with no
// commit involved, which is the trap `invoiceReadIsClockIndependent`'s header
// names and the one an expiry spec falls into first.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';

import { DECLARED_PRESENT } from './fixturePresent';
import { PSL_DEFAULT_CAP_SETTING_ID } from './mock/stores/pslCapSettingStore';
import type { ActorAttribution } from '../../lib/enforcement';
import { seedPslListings } from './mock/pslSeed';
import { pslStore } from './mock/stores/pslStore';
import {
  PSL_STATUSES,
  PSL_LIFECYCLES,
  isPublished,
  type PslListing,
} from './pslListing';
import {
  PSL_CAP_CEILING_DAYS,
  PSL_DEFAULT_CAP_DAYS,
  PSL_EXPIRING_WINDOW_DAYS,
  bestPslStatus,
  effectiveCap,
  effectiveValidUntil,
  isPslInForce,
  listingsForSupplier,
  pslDisplayStatus,
} from './pslProjection';

/**
 * THE CORPUS, GROWN RATHER THAN IMPORTED.
 *
 * ⚠️ **`PSL_LISTINGS` IS GONE AND THIS IS ITS REPLACEMENT** (PSL P3, operator
 * ruling h). The nine rows are no longer `PslListing` literals in a frozen
 * fixture — they are PAYLOADS in `pslSeed.ts`, dispatched through
 * `t_psl_propose` and its siblings under LANE-CORRECT scopes. So the corpus
 * does not exist until the seed has run, which is why this is a FUNCTION and
 * not a const: a module-scope read would capture `[]`.
 *
 * ⚠️ **AND THAT IS THE `EMPTY-INPUT-REPORTS-CLEAN-01` SHAPE, WHICH IS WHY THE
 * SEED'S OWN OUTCOME IS ASSERTED BELOW AND EVERY POPULATION GUARD IN THIS FILE
 * ASSERTS MEMBERSHIP.** "No row is malformed" passes vacuously over `[]`.
 */
const pslRows = (): readonly PslListing[] => pslStore.all();

// ⚠️ SEEDED ONCE, THROUGH THE REAL VERBS. `pslStore.reset()` runs first so the
// file does not depend on whatever order vitest loaded modules in.
beforeAll(async () => {
  pslStore.reset();
  const outcome = await seedPslListings();
  // The seed's own refusal is REPORTED rather than swallowed: a half-seeded
  // store would make every assertion below a different, quieter test.
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});


const MS = 86_400_000;
/** An instant `n` days from the declared present. */
const at = (n: number): string =>
  new Date(Date.parse(DECLARED_PRESENT) + n * MS).toISOString();

const byId = (id: string): PslListing => {
  const row = pslRows().find((r) => r.id === id);
  if (!row) throw new Error(`fixture row ${id} is gone — this spec is vacuous`);
  return row;
};

/** The one actor this tree can construct. Named once so the synthetic ledgers
 *  below cannot differ from the synthetic rows. */
const NOBODY: ActorAttribution = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' };

/** A synthetic row, for the arms no shipped corpus should be bent to reach —
 *  and after P3 that includes `CEILING_BOUNDED`, which the cap VERBS refuse to
 *  produce. See the ceiling spec below for why the arm still exists. */
const row = (over: Partial<PslListing>): PslListing => ({
  id: 'psl-synthetic',
  supplierId: 'sup-002',
  scope: { kind: 'material', materialCodes: ['RM-PSTN-7150'] },
  status: 'Validated',
  lifecycle: 'Listed',
  validFrom: DECLARED_PRESENT,
  validUntil: DECLARED_PRESENT,
  capDaysOverride: null,
  capJustification: null,
  capDecidedBy: null,
  capDecidedAt: null,
  justification: 'synthetic',
  evidenceRefs: [],
  proposedBy: NOBODY,
  decidedBy: null,
  publishedAt: null,
  publishedBy: null,
  statusHistory: [],
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the corpus reaches every arm, else every spec below is vacuous', () => {
  it('the population is non-empty and was read from the shipped fixture', () => {
    expect(pslRows().length).toBeGreaterThan(5);
    expect(pslRows().every((r) => r.id.startsWith('psl-'))).toBe(true);
  });

  it('⚠️ every DISPLAY arm is reached by a NAMED row at the declared present', () => {
    const shown = new Map(
      pslRows().map((r) => [r.id, pslDisplayStatus(r, DECLARED_PRESENT)]),
    );
    // A NAMED MEMBER per arm, reached through a VALUE — never a count. Replace
    // the corpus and this goes red (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-
    // CORPUS-01`), which a row-count control would not.
    expect(shown.get('psl-001')).toBe('Listed');
    expect(shown.get('psl-002')).toBe('Expiring');
    expect(shown.get('psl-003')).toBe('Expired');
    expect(shown.get('psl-006')).toBe('Withdrawn');
    expect(shown.get('psl-007')).toBe('Rejected');
    expect(shown.get('psl-008')).toBe('Proposed');
    expect(shown.get('psl-009')).toBe('Scheduled');
  });

  it('⚠️ the cap sources reachable BY DATA are reached by data', () => {
    // ⚠️ **ONE ARM MOVED FROM SEEDED TO SYNTHETIC AT P3, AND THE MOVE IS
    // RECORDED HERE RATHER THAN LEFT TO BE NOTICED.** This read
    // `effectiveCap(byId('psl-005')).source === 'CEILING_BOUNDED'`, because the
    // retired corpus carried a 2000-day override on that row precisely to
    // exercise the arm from DATA. `PSL_CAP_WITHIN_CEILING` now REFUSES any
    // override above the ceiling, so the machine cannot produce that row — and
    // weakening the hook to keep a fixture would be authoring a defect to keep
    // a test green (operator ruling h).
    //
    // `CEILING_BOUNDED` is covered synthetically below, at
    // *"the ceiling BOUNDS a cap recorded under a HIGHER ceiling"*, with the
    // reason the arm still exists stated at the site.
    expect(effectiveCap(byId('psl-004')).source).toBe('LISTING_OVERRIDE');
    expect(effectiveCap(byId('psl-001')).source).toBe('NO_SETTING_RECORDED');
    // ⚠️ AND THE HALF THAT KEEPS THE SENTENCE ABOVE HONEST: no seeded row
    // reaches the ceiling arm, which is what makes the synthetic coverage
    // necessary rather than merely convenient.
    expect(pslRows().map((r) => effectiveCap(r).source)).not.toContain('CEILING_BOUNDED');
  });

  it('⚠️ BOTH publication states are reached, on rows that are NOT both in force', () => {
    // The independence claim is worthless if every published row happens to be
    // in force and every unpublished one happens not to be.
    expect(isPublished(byId('psl-001'))).toBe(true);
    expect(isPslInForce(byId('psl-001'), DECLARED_PRESENT)).toBe(true);
    expect(isPublished(byId('psl-002'))).toBe(false);
    expect(isPslInForce(byId('psl-002'), DECLARED_PRESENT)).toBe(true);
    expect(isPublished(byId('psl-003'))).toBe(true);
    expect(isPslInForce(byId('psl-003'), DECLARED_PRESENT)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pslDisplayStatus — every arm', () => {
  it('an in-force listing beyond the window reads its stored lifecycle', () => {
    const r = row({ validFrom: at(-10), validUntil: at(PSL_EXPIRING_WINDOW_DAYS + 5) });
    expect(pslDisplayStatus(r, at(0))).toBe('Listed');
  });

  it('inside the window it reads Expiring — at the boundary itself', () => {
    const r = row({ validFrom: at(-10), validUntil: at(PSL_EXPIRING_WINDOW_DAYS) });
    expect(pslDisplayStatus(r, at(0))).toBe('Expiring');
  });

  it('one day outside the boundary it does NOT — the window is a window', () => {
    const r = row({ validFrom: at(-10), validUntil: at(PSL_EXPIRING_WINDOW_DAYS + 1) });
    expect(pslDisplayStatus(r, at(0))).toBe('Listed');
  });

  it('past its effective end it reads Expired — and TODAY IS PAST', () => {
    // `isPast` is `days <= 0`, decided once in `dayProjection`. Asserting the
    // zero day here is what keeps this projection on the tree's convention
    // rather than on a second one that agrees most of the time.
    expect(pslDisplayStatus(row({ validFrom: at(-10), validUntil: at(0) }), at(0))).toBe(
      'Expired',
    );
    expect(pslDisplayStatus(row({ validFrom: at(-10), validUntil: at(-1) }), at(0))).toBe(
      'Expired',
    );
  });

  // ── THE IN-FORCE GUARD, BOTH ACQUITTALS ────────────────────────────────────
  it('⚠️ ACQUITTAL — a Withdrawn listing PAST its end date is NOT expired', () => {
    const r = byId('psl-006');
    // The control that the guard is doing work rather than decorating: strip
    // the guard and this row's dates alone WOULD convict it.
    expect(Date.parse(effectiveValidUntil(r)!)).toBeLessThan(Date.parse(DECLARED_PRESENT));
    expect(pslDisplayStatus(r, DECLARED_PRESENT)).toBe('Withdrawn');
  });

  it('⚠️ ACQUITTAL — a Rejected listing INSIDE its date range is not in force', () => {
    const r = byId('psl-007');
    expect(Date.parse(effectiveValidUntil(r)!)).toBeGreaterThan(
      Date.parse(DECLARED_PRESENT),
    );
    expect(pslDisplayStatus(r, DECLARED_PRESENT)).toBe('Rejected');
    expect(isPslInForce(r, DECLARED_PRESENT)).toBe(false);
  });

  it('a Proposed listing whose window has opened is still not in force', () => {
    expect(isPslInForce(byId('psl-008'), DECLARED_PRESENT)).toBe(false);
  });

  it('⚠️ null days keeps the stored lifecycle — absence is not an alarm', () => {
    const r = row({ validFrom: 'not-a-date', validUntil: 'not-a-date' });
    expect(effectiveValidUntil(r)).toBeNull();
    expect(pslDisplayStatus(r, at(0))).toBe('Listed');
  });

  it('every lifecycle that is not in force passes through unchanged', () => {
    for (const lifecycle of PSL_LIFECYCLES) {
      if (lifecycle === 'Listed') continue;
      const r = row({ lifecycle, validFrom: at(-500), validUntil: at(-400) });
      expect(pslDisplayStatus(r, at(0)), lifecycle).toBe(lifecycle);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the cap (R2–R4)', () => {
  it('the ceiling is longer than the default and is not unbounded', () => {
    // ⚠️ A RANGE, NEVER AN EQUALITY. The ceiling's VALUE is an open operator
    // decision; this pins only the property the design depends on, so a ruling
    // that moves the number does not redden a test that was never about it.
    expect(PSL_CAP_CEILING_DAYS).toBeGreaterThan(PSL_DEFAULT_CAP_DAYS);
    expect(PSL_CAP_CEILING_DAYS).toBeLessThanOrEqual(365 * 5);
  });

  it('an override applies, and it BINDS the authored validUntil', () => {
    const r = byId('psl-004');
    expect(effectiveCap(r)).toEqual({ days: 150, source: 'LISTING_OVERRIDE' });
    // The authored end is later than the capped end — so the cap is not a
    // no-op on this row, which is what makes the assertion worth making.
    expect(effectiveValidUntil(r)!.localeCompare(r.validUntil.slice(0, 10))).toBeLessThan(0);
  });

  it('with no override the portal default applies, and says nothing was decided', () => {
    expect(effectiveCap(byId('psl-001'))).toEqual({
      days: PSL_DEFAULT_CAP_DAYS,
      source: 'NO_SETTING_RECORDED',
    });
  });

  it('⚠️ the ceiling BOUNDS a cap recorded under a HIGHER ceiling — named, not silent', () => {
    // ── ⚠️ SYNTHETIC, AND WHY THE ARM STILL EXISTS ────────────────────────
    // Both cap verbs refuse a value above `PSL_CAP_CEILING_DAYS`, so NO
    // DISPATCH can produce a row or a setting that lands here. What can is a
    // later ruling that LOWERS the ceiling: a 700-day override recorded
    // legitimately under a 730-day ceiling exceeds a 365-day one the day it is
    // ruled, and this arm is what stops that cap staying silently in force
    // above the new bound. Delete the arm and the ceiling becomes advisory for
    // every row recorded before it moved.
    //
    // ⚠️ Its coverage MOVED here from `psl-005` at P3 (operator ruling h) —
    // see the REACH block above for the accounting.
    // `validUntil` is put far past the ceiling deliberately: the cap only
    // BINDS when it falls earlier than the authored end, and a synthetic row
    // whose end sat inside the cap would exercise the other branch while
    // looking like it exercised this one.
    const r = row({
      validFrom: DECLARED_PRESENT,
      validUntil: at(3000),
      capDaysOverride: PSL_CAP_CEILING_DAYS + 1,
    });
    expect(r.capDaysOverride!).toBeGreaterThan(PSL_CAP_CEILING_DAYS);
    expect(effectiveCap(r)).toEqual({
      days: PSL_CAP_CEILING_DAYS,
      source: 'CEILING_BOUNDED',
    });
    const from = Date.parse(r.validFrom.slice(0, 10));
    expect(effectiveValidUntil(r)).toBe(
      new Date(from + PSL_CAP_CEILING_DAYS * MS).toISOString().slice(0, 10),
    );
  });

  it('⚠️ and it bounds an over-long PORTAL DEFAULT too, by the same arm', () => {
    // The other route into `CEILING_BOUNDED`, and the reason `effectiveCap`
    // bounds the default as well as the override: a ruling that lowers the
    // ceiling below a recorded default must not leave the default in force
    // above it.
    const ledger = [
      {
        settingId: PSL_DEFAULT_CAP_SETTING_ID,
        days: PSL_CAP_CEILING_DAYS + 100,
        setBy: NOBODY,
        setAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(effectiveCap(row({ capDaysOverride: null }), ledger)).toEqual({
      days: PSL_CAP_CEILING_DAYS,
      source: 'CEILING_BOUNDED',
    });
  });

  it('⚠️ A RECORDED PORTAL DEFAULT IS `PORTAL_DEFAULT`, NOT `NO_SETTING_RECORDED`', () => {
    // ⚠️ **THE WHOLE POINT OF `t_psl_cap_set`, AND THE SENTENCE P1 PROMISED:**
    // *"`NO_SETTING_RECORDED` starts meaning what it says."* The two answers
    // are different sentences — *"nothing has been decided"* versus
    // *"somebody chose this"* — and an operator acts on the difference.
    const uncapped = row({ capDaysOverride: null });
    expect(effectiveCap(uncapped, []).source).toBe('NO_SETTING_RECORDED');
    const ledger = [
      {
        settingId: PSL_DEFAULT_CAP_SETTING_ID,
        days: 200,
        setBy: NOBODY,
        setAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(effectiveCap(uncapped, ledger)).toEqual({ days: 200, source: 'PORTAL_DEFAULT' });
  });

  it('⚠️ a LISTING OVERRIDE still beats a recorded portal default', () => {
    // The precedence the record's own header states: the per-listing override
    // if present, else the portal default. A ledger that could override an
    // override would make the four cap fields decorative.
    const ledger = [
      {
        settingId: PSL_DEFAULT_CAP_SETTING_ID,
        days: 200,
        setBy: NOBODY,
        setAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(effectiveCap(row({ capDaysOverride: 30 }), ledger)).toEqual({
      days: 30,
      source: 'LISTING_OVERRIDE',
    });
  });

  it('⚠️ THE LAST APPEND WINS — a ledger is superseded by appending, never edited', () => {
    const mk = (days: number, setAt: string) => ({
      settingId: PSL_DEFAULT_CAP_SETTING_ID,
      days,
      setBy: NOBODY,
      setAt,
    });
    const ledger = [mk(100, '2026-01-01T00:00:00.000Z'), mk(250, '2026-02-01T00:00:00.000Z')];
    expect(effectiveCap(row({ capDaysOverride: null }), ledger).days).toBe(250);
  });

  it('the earlier of the authored end and the cap wins — in both directions', () => {
    const short = row({ validFrom: at(0), validUntil: at(10), capDaysOverride: 500 });
    expect(effectiveValidUntil(short)).toBe(at(10).slice(0, 10));
    const capped = row({ validFrom: at(0), validUntil: at(500), capDaysOverride: 10 });
    expect(effectiveValidUntil(capped)).toBe(at(10).slice(0, 10));
  });

  it('⚠️ the cap takes NO clock — it is arithmetic over two authored dates', () => {
    const r = byId('psl-004');
    // Same answer at three wildly different instants: the function has no
    // `now` parameter at all, and this is the assertion that says so.
    expect(effectiveValidUntil(r)).toBe(effectiveValidUntil(r));
    expect(effectiveCap(r).days).toBe(150);
  });

  it('⚠️ THE FOUR OVERRIDE FIELDS TRAVEL TOGETHER, across the whole corpus', () => {
    for (const r of pslRows()) {
      const present = [
        r.capDaysOverride,
        r.capJustification,
        r.capDecidedBy,
        r.capDecidedAt,
      ].map((v) => v !== null);
      expect(new Set(present).size, `${r.id}: cap fields must be all-or-nothing`).toBe(1);
    }
    // BILATERAL: and at least one row actually carries them, else the loop
    // above is satisfied by a corpus that has no overrides at all.
    expect(pslRows().some((r) => r.capDaysOverride !== null)).toBe(true);
    expect(pslRows().some((r) => r.capDaysOverride === null)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('bestPslStatus — restrictiveness, after the clock', () => {
  it('the ladder is read off the vocabulary`s own declaration order', () => {
    expect([...PSL_STATUSES]).toEqual(['Sole Source', 'Mandatory', 'Validated']);
  });

  it('Sole Source beats Mandatory beats Validated', () => {
    const live = { validFrom: at(-10), validUntil: at(400) };
    expect(
      bestPslStatus(
        [row({ ...live, status: 'Mandatory' }), row({ ...live, status: 'Validated' })],
        at(0),
      ),
    ).toBe('Mandatory');
    expect(
      bestPslStatus(
        [row({ ...live, status: 'Mandatory' }), row({ ...live, status: 'Sole Source' })],
        at(0),
      ),
    ).toBe('Sole Source');
  });

  it('⚠️ STAGE 1 FIRST — an EXPIRED Mandatory loses to an IN-FORCE Validated', () => {
    // The whole reason the clock runs before the ladder. An expired Mandatory
    // grants nothing: *an expired status reopens the field to competitive
    // bidding*. A ladder applied first would tell a buyer not to bid when they
    // must.
    const expiredMandatory = row({
      status: 'Mandatory',
      validFrom: at(-500),
      validUntil: at(-1),
    });
    const liveValidated = row({
      status: 'Validated',
      validFrom: at(-10),
      validUntil: at(400),
    });
    expect(bestPslStatus([expiredMandatory, liveValidated], at(0))).toBe('Validated');
    // and the control: with the clock moved back, the Mandatory wins again.
    expect(bestPslStatus([expiredMandatory, liveValidated], at(-400))).toBe('Mandatory');
  });

  it('⚠️ a WITHDRAWN Sole Source never outranks anything', () => {
    const withdrawn = row({
      status: 'Sole Source',
      lifecycle: 'Withdrawn',
      validFrom: at(-10),
      validUntil: at(400),
    });
    const live = row({ status: 'Validated', validFrom: at(-10), validUntil: at(400) });
    expect(bestPslStatus([withdrawn, live], at(0))).toBe('Validated');
  });

  it('empty after stage 1 → null, which a surface renders as "Not listed"', () => {
    expect(bestPslStatus([], at(0))).toBeNull();
    expect(bestPslStatus([row({ lifecycle: 'Rejected' })], at(0))).toBeNull();
  });

  it('⚠️ publication does NOT affect the ladder — the same row, both ways', () => {
    const base = { status: 'Mandatory' as const, validFrom: at(-10), validUntil: at(400) };
    const internal = row({ ...base, publishedAt: null, publishedBy: null });
    const published = row({
      ...base,
      publishedAt: at(-5),
      publishedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
    });
    expect(bestPslStatus([internal], at(0))).toBe('Mandatory');
    expect(bestPslStatus([published], at(0))).toBe('Mandatory');
    expect(isPslInForce(internal, at(0))).toBe(isPslInForce(published, at(0)));
  });

  it('the fixture`s multi-listing supplier resolves to its most restrictive LIVE row', () => {
    const sup002 = pslRows().filter((r) => r.supplierId === 'sup-002');
    expect(sup002.length).toBeGreaterThan(2);
    // psl-003 is Mandatory and EXPIRED; psl-001 is Sole Source and live.
    expect(bestPslStatus(sup002, DECLARED_PRESENT)).toBe('Sole Source');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('listingsForSupplier — a stable order a surface can render', () => {
  it('in-force rows come first', () => {
    const rows = listingsForSupplier(pslRows(), 'sup-002', DECLARED_PRESENT);
    const live = rows.map((r) => isPslInForce(r, DECLARED_PRESENT));
    expect(live).toEqual([...live].sort((a, b) => Number(b) - Number(a)));
    expect(live).toContain(true);
    expect(live).toContain(false);
  });

  it('a supplier with no listing gets an empty array, never a throw', () => {
    expect(listingsForSupplier(pslRows(), 'sup-001', DECLARED_PRESENT)).toEqual([]);
  });
});
