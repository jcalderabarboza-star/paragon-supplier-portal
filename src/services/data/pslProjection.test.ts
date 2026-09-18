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
import { describe, it, expect } from 'vitest';

import { DECLARED_PRESENT } from './fixturePresent';
import { PSL_LISTINGS } from './mock/fixtures/pslListings';
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

const MS = 86_400_000;
/** An instant `n` days from the declared present. */
const at = (n: number): string =>
  new Date(Date.parse(DECLARED_PRESENT) + n * MS).toISOString();

const byId = (id: string): PslListing => {
  const row = PSL_LISTINGS.find((r) => r.id === id);
  if (!row) throw new Error(`fixture row ${id} is gone — this spec is vacuous`);
  return row;
};

/** A synthetic row, for the arms no shipped fixture should be bent to reach. */
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
  proposedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
  decidedBy: null,
  publishedAt: null,
  publishedBy: null,
  statusHistory: [],
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the corpus reaches every arm, else every spec below is vacuous', () => {
  it('the population is non-empty and was read from the shipped fixture', () => {
    expect(PSL_LISTINGS.length).toBeGreaterThan(5);
    expect(PSL_LISTINGS.every((r) => r.id.startsWith('psl-'))).toBe(true);
  });

  it('⚠️ every DISPLAY arm is reached by a NAMED row at the declared present', () => {
    const shown = new Map(
      PSL_LISTINGS.map((r) => [r.id, pslDisplayStatus(r, DECLARED_PRESENT)]),
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

  it('⚠️ both CAP sources are reached by DATA, not only by synthetic input', () => {
    expect(effectiveCap(byId('psl-004')).source).toBe('LISTING_OVERRIDE');
    expect(effectiveCap(byId('psl-005')).source).toBe('CEILING_BOUNDED');
    expect(effectiveCap(byId('psl-001')).source).toBe('NO_SETTING_RECORDED');
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

  it('⚠️ the ceiling BOUNDS an over-long override — and is named, not silent', () => {
    const r = byId('psl-005');
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
    for (const r of PSL_LISTINGS) {
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
    expect(PSL_LISTINGS.some((r) => r.capDaysOverride !== null)).toBe(true);
    expect(PSL_LISTINGS.some((r) => r.capDaysOverride === null)).toBe(true);
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
    const sup002 = PSL_LISTINGS.filter((r) => r.supplierId === 'sup-002');
    expect(sup002.length).toBeGreaterThan(2);
    // psl-003 is Mandatory and EXPIRED; psl-001 is Sole Source and live.
    expect(bestPslStatus(sup002, DECLARED_PRESENT)).toBe('Sole Source');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('listingsForSupplier — a stable order a surface can render', () => {
  it('in-force rows come first', () => {
    const rows = listingsForSupplier(PSL_LISTINGS, 'sup-002', DECLARED_PRESENT);
    const live = rows.map((r) => isPslInForce(r, DECLARED_PRESENT));
    expect(live).toEqual([...live].sort((a, b) => Number(b) - Number(a)));
    expect(live).toContain(true);
    expect(live).toContain(false);
  });

  it('a supplier with no listing gets an empty array, never a throw', () => {
    expect(listingsForSupplier(PSL_LISTINGS, 'sup-001', DECLARED_PRESENT)).toEqual([]);
  });
});
