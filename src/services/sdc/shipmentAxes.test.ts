// @vitest-environment node
// ────────────────────────────────────────────────────────────────────────────
// THE TWO AXES — a derived value may never stand in for a stored one.
//
// ⚠️ **THIS FILE EXISTS BECAUSE THE DEFECT WAS FOUND BY WALKING, NOT BY A
// FAILING TEST.** Wave D surfaced three verbs on `/supplier/forecasts` and
// discovered, by dispatching them and watching the card, that the store moved
// three states while the display did not. Nothing in the suite could see it:
// the old selector had tests, and they asserted the collapse was working.
//
// The SidePanel batch is the precedent for why that matters — applying that fix
// turned ZERO of 3809 tests red, because no spec encoded the defect. A structural
// fix with no named guard is one refactor away from returning.
//
// ── WHAT ACTUALLY ENFORCES THE FIX ──────────────────────────────────────────
// The TYPES do. `IncomingShipmentView` has no field meaning "the lifecycle to
// display", and `AsnTracking` is an object that cannot be assigned where a
// `ShipmentLifecycle` is expected. `asnStatusToLifecycle` — the translator that
// made the two vocabularies interchangeable — is deleted. This file catches the
// REGRESSION of that, and names it when it happens.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { asnTrackingFor } from './shipment';
import * as shipmentModule from './shipment';
import { INCOMING_SHIPMENTS } from './fixtures';
import type { IncomingShipment, ShipmentLifecycle } from './types';
import type { AsnStatus } from '../data/types';

const ALL_ASN_STATUSES: readonly AsnStatus[] = [
  'Draft',
  'Submitted',
  'In Transit',
  'Delivered',
  'Discrepancy',
];

const ALL_LIFECYCLES: readonly ShipmentLifecycle[] = [
  'Booked',
  'Shipped',
  'Arrived',
  'Cancelled',
];

const leg = (over: Partial<IncomingShipment> = {}): IncomingShipment =>
  ({
    id: 'ish-test',
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-3310',
    direction: 'to-paragon',
    lifecycle: 'Booked',
    qty: 100,
    uom: 'KG',
    asnRef: 'ASN-2025-00301',
    provenance: INCOMING_SHIPMENTS[0].provenance,
    ...over,
  }) as IncomingShipment;

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE COLLAPSE IS GONE — the named guard.
// ─────────────────────────────────────────────────────────────────────────────

describe('the shadowed lifecycle — a derived value never stands in for a stored one', () => {
  it('⚠️ THE STORED LIFECYCLE SURVIVES EVERY ASN STATUS — the defect, asserted directly', () => {
    // The old behaviour: on a to-paragon leg, EVERY one of the five ASN statuses
    // mapped, so the derived value always won and `shipment.lifecycle` was never
    // what a reader got. Here the leg's own state is untouched by all five.
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const asnStatus of ALL_ASN_STATUSES) {
        const s = leg({ lifecycle });
        const tracking = asnTrackingFor(s, asnStatus);
        expect(
          s.lifecycle,
          `A ${asnStatus} ASN CHANGED THE LEG'S DECLARED STATE from ${lifecycle}.\n` +
            'The two axes have been collapsed back into one — the exact defect this\n' +
            'module was rewritten to remove. See sdc/shipment.ts.',
        ).toBe(lifecycle);
        // …and the ASN axis reports the ASN's OWN word, unmapped.
        expect(tracking?.asnStatus).toBe(asnStatus);
      }
    }
  });

  it('⚠️ `Cancelled` IS REPRESENTABLE — the state the old map could not express', () => {
    // `asnStatusToLifecycle`'s range was Booked | Shipped | Arrived. A cancelled
    // to-paragon leg was therefore unrenderable as cancelled, whatever the
    // supplier did. It is now just the stored value, like any other.
    const s = leg({ lifecycle: 'Cancelled' });
    expect(s.lifecycle).toBe('Cancelled');
    expect(asnTrackingFor(s, 'Delivered')?.asnStatus).toBe('Delivered');
  });

  it('⚠️ THE TRANSLATOR IS GONE — `asnStatusToLifecycle` must not come back', () => {
    // A mapping between the two vocabularies is what made substitution possible
    // and reasonable-looking. Its absence is load-bearing, so its absence is
    // asserted rather than assumed.
    expect(
      'asnStatusToLifecycle' in shipmentModule,
      'THE ASN→LIFECYCLE TRANSLATOR IS BACK. It is the mechanism of the collapse:\n' +
        'once the ASN can speak in leg words, it can be rendered as the leg state.',
    ).toBe(false);
    expect(
      'shipmentDisplayLifecycle' in shipmentModule,
      'THE COLLAPSING SELECTOR IS BACK — it returned one ShipmentLifecycle for\n' +
        'two different facts.',
    ).toBe(false);

    // ⚠️ THE KNOWN-GOOD CONTROL. Every assertion above is an absence and would
    // ALL pass against an empty module, a renamed file, or a broken import —
    // `EMPTY-INPUT-REPORTS-CLEAN-01`. This proves the module under test is the
    // real one and is populated.
    expect('asnTrackingFor' in shipmentModule).toBe(true);
    expect(typeof shipmentModule.asnTrackingFor).toBe('function');
  });

  it('the ASN axis carries no lifecycle-typed field at all', () => {
    // The structural half: even a reader who WANTED to substitute has nothing
    // to reach for. If a future edit adds a `lifecycle` back onto the tracking
    // object, this names it.
    const tracking = asnTrackingFor(leg(), 'In Transit')!;
    expect(Object.keys(tracking).sort()).toEqual(['asnRef', 'asnStatus']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE VOCABULARIES ARE GENUINELY DISJOINT — why the type barrier bites.
// ─────────────────────────────────────────────────────────────────────────────

describe('the two vocabularies do not overlap enough to be confused', () => {
  it('⚠️ THE INTERSECTION IS EMPTY — not one word is shared, in either direction', () => {
    // Measured, and it corrected the weaker claim this test first made: I wrote
    // that TWO ASN statuses were not lifecycle members. All FIVE are not. The
    // two vocabularies share nothing at all, which is why the old
    // `asnStatusToLifecycle` had to be a full translation — and why deleting it
    // removes the only bridge between them.
    const shared = ALL_ASN_STATUSES.filter((a) =>
      (ALL_LIFECYCLES as readonly string[]).includes(a),
    );
    expect(
      shared,
      'AN ASN STATUS IS NOW ALSO A ShipmentLifecycle MEMBER. The vocabularies\n' +
        'have started to converge, and a shared word is the first step back to a\n' +
        'shared field.',
    ).toEqual([]);

    // Paired membership so the empty result above is not vacuous — both unions
    // are populated and this test really compared them.
    expect(ALL_ASN_STATUSES.length).toBe(5);
    expect(ALL_LIFECYCLES.length).toBe(4);
    // …and `Cancelled` is the asymmetry that proves these are two FACTS rather
    // than two spellings of one: only the supplier can call a leg off, and no
    // ASN state means it.
    expect(ALL_LIFECYCLES).toContain('Cancelled');
    expect(ALL_ASN_STATUSES as readonly string[]).not.toContain('Cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE ASN AXIS IS ABSENT WHERE PARAGON HAS NOTHING TO SAY.
// ─────────────────────────────────────────────────────────────────────────────

describe('asnTrackingFor — three honest nulls, kept distinct from "has not moved"', () => {
  it('a principal-to-distributor leg has no ASN axis, whatever is passed', () => {
    const p2d = leg({ direction: 'principal-to-distributor', asnRef: undefined });
    for (const st of ALL_ASN_STATUSES) expect(asnTrackingFor(p2d, st)).toBeNull();
    // Even a p2d leg that somehow carried a ref gets no axis — direction decides.
    expect(asnTrackingFor(leg({ direction: 'principal-to-distributor' }), 'Delivered')).toBeNull();
  });

  it('a to-paragon leg with no ref, or an unresolved link, has no ASN axis', () => {
    expect(asnTrackingFor(leg({ asnRef: undefined }), 'Delivered')).toBeNull();
    expect(asnTrackingFor(leg(), null)).toBeNull();
  });

  it('THE KNOWN-GOOD CONTROL — a resolved to-paragon leg DOES get one', () => {
    // §39: every assertion above is a null and would all pass on a function that
    // returned null unconditionally.
    const t = asnTrackingFor(leg(), 'In Transit');
    expect(t).not.toBeNull();
    expect(t!.asnRef).toBe('ASN-2025-00301');
    expect(t!.asnStatus).toBe('In Transit');
  });
});
