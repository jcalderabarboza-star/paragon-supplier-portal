// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE SOURCING GATE READS THE STORE, NOT A SNAPSHOT (B-S4c).
//
// **THIS IS THE PROBE FOR THE SHARPEST DEFECT P3 COULD HAVE SHIPPED, AND IT IS
// AIMED AT A BINDING THIS TREE REALLY CARRIED.** Until this batch, five read
// sites bound the FROZEN `PSL_LISTINGS` module array as a default parameter or
// a direct read:
//
//   pslSourcingSeam.ts   — `pslStatusFor(…, rows = PSL_LISTINGS)`
//   rfqSourcingGate.ts   — `pslExemptionFor(…, listings = PSL_LISTINGS)`
//   rfqSourcingGate.ts   — `decideSourcing(…,  listings = PSL_LISTINGS)`
//   PslStatusCell.tsx    — `rows = PSL_LISTINGS`
//   BuyerSupplierProfile — `listingsForSupplier(PSL_LISTINGS, …)`
//
// P3 gave the lane eight verbs. Had those defaults survived, **every one of
// them would have been invisible to the sourcing gate**: a newly granted Sole
// Source listing would not have suspended competitive bidding, and a withdrawn
// Mandatory one would have kept suspending it.
//
// ⚠️ **AND NOTHING WOULD HAVE GONE RED**, which is the part worth dwelling on.
// Every spec in this lane passes its rows EXPLICITLY — that is what makes them
// good specs, and it is exactly why not one of them could have caught this. The
// defect lives in the DEFAULT, and a suite that never takes the default never
// asks about it.
//
// ── ⚠️ THE PROBE MUST BE ABLE TO FAIL, SO IT RUNS BOTH BINDINGS ────────────
//   A probe that only asserted "the store row is visible" would pass on a tree
//   where the store happened to equal the fixture. So each spec below fires the
//   SAME shipped function twice — once on its default, once on a SNAPSHOT taken
//   before the dispatch, which is precisely what the old binding was — and
//   requires the two to DISAGREE. The snapshot call is the old wiring, running
//   here, failing to see the row.
//
//   That is `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` honoured rather than
//   approximated: the subject is not synthetic, it is the binding this file's
//   own batch removed.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './mock/MockCommandService';
import { seedPslListings } from './mock/pslSeed';
import { pslStore } from './mock/stores/pslStore';
import { DECLARED_PRESENT } from './fixturePresent';
import { NO_PERSON } from '../../context/noPerson';
import { pslStatusFor } from './pslSourcingSeam';
import { decideSourcing, pslExemptionFor, rosterStatusOf } from './rfqSourcingGate';
import type { PslListing } from './pslListing';
import type { QueryScope } from './types';

const P = DECLARED_PRESENT;

/** The lane that raises a listing. */
const PROCUREMENT: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};
/** The lane that decides one. Narrow, so the restrictive-designation check
 *  admits — see `pslLeadCheck.ts`. */
const COMPLIANCE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/**
 * A supplier and a material that NO SEEDED LISTING covers, so the row raised
 * below is genuinely new to the corpus rather than a duplicate of one already
 * in it.
 *
 * ⚠️ Asserted rather than assumed, in the REACH block: a probe built on a pair
 * the seed already covers would be measuring nothing.
 */
const NEW_SUPPLIER = 'sup-001';
const NEW_CODE = 'RM-EMUL-3310';

let commands: MockCommandService;
/** The corpus as it stood BEFORE the new row — the old binding, captured. */
let snapshot: readonly PslListing[];

beforeEach(async () => {
  pslStore.reset();
  const outcome = await seedPslListings();
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
  commands = new MockCommandService();
  snapshot = [...pslStore.all()];
});

/** Raise and grant one Sole Source listing, returning its id. */
async function grantSoleSource(): Promise<string> {
  const proposed = await commands.dispatch(PROCUREMENT, {
    transitionId: 't_psl_propose',
    entity: 'psl',
    payload: {
      supplierId: NEW_SUPPLIER,
      materialCodes: [NEW_CODE],
      status: 'Sole Source',
      validFrom: P,
      validUntil: '2099-01-01',
      justification: 'the only qualified source for this grade',
      reason: 'raised for the probe',
    },
  });
  expect(proposed.status, proposed.reason ?? '').not.toBe('failed');
  const id = proposed.entityId!;
  const granted = await commands.dispatch(COMPLIANCE, {
    transitionId: 't_psl_grant',
    entity: 'psl',
    entityId: id,
    payload: { reason: 'exclusivity accepted' },
  });
  expect(granted.status, granted.reason ?? '').not.toBe('failed');
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the probe has something to measure', () => {
  it('the corpus is seeded and the probe pair is genuinely uncovered', () => {
    // MEMBERSHIP first: over an unseeded store every claim below would pass
    // having examined nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    expect(pslStore.all().map((r) => r.id)).toContain('psl-001');
    // The pair the probe uses must not already be listed, or "the store sees a
    // row the snapshot does not" would be true of a row that was always there.
    expect(pslStatusFor(NEW_SUPPLIER, { materialCode: NEW_CODE }, P).kind).toBe(
      'NOT_LISTED',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ A ROW THE OLD DEFAULT COULD NOT SEE', () => {
  it('⚠️ `pslStatusFor` SEES IT ON ITS DEFAULT — and the snapshot does NOT', async () => {
    await grantSoleSource();

    // THE SHIPPED CALL, on its default corpus.
    const live = pslStatusFor(NEW_SUPPLIER, { materialCode: NEW_CODE }, P);
    expect(live.kind).toBe('IN_FORCE');
    expect(live.kind === 'IN_FORCE' && live.status).toBe('Sole Source');

    // ⚠️ THE OLD BINDING, RUNNING HERE. `snapshot` is the corpus as it stood
    // before the dispatch — which is exactly what a frozen module array is.
    // If the default were still bound that way, THIS is the answer the gate
    // would give, and the two lines below are the probe failing against it.
    const frozen = pslStatusFor(NEW_SUPPLIER, { materialCode: NEW_CODE }, P, snapshot);
    expect(frozen.kind).toBe('NOT_LISTED');
    expect(frozen).not.toEqual(live);
  });

  it('⚠️ `pslExemptionFor` SEES IT — the gate exempts an event it would have competed', async () => {
    const id = await grantSoleSource();

    const live = pslExemptionFor([NEW_SUPPLIER], [NEW_CODE], P);
    expect(live.kind).toBe('EXEMPT');
    expect(live.kind === 'EXEMPT' && live.listingId).toBe(id);

    const frozen = pslExemptionFor([NEW_SUPPLIER], [NEW_CODE], P, snapshot);
    expect(frozen.kind).not.toBe('EXEMPT');
  });

  it('⚠️ `decideSourcing` SEES IT — competition is NOT REQUIRED where it would have been', async () => {
    await grantSoleSource();
    const event = { invitedSupplierIds: [NEW_SUPPLIER], materialIds: [NEW_CODE] };

    const live = decideSourcing(event, P, rosterStatusOf);
    expect(live.competition.kind).toBe('NOT_REQUIRED');

    // ⚠️ THE CONSEQUENCE, SPELLED OUT: on the old binding this event is
    // UNDER_FLOOR — one invitee and no exemption — so a buyer would have been
    // refused at publish on an event the platform had already exempted.
    const frozen = decideSourcing(event, P, rosterStatusOf, snapshot);
    expect(frozen.competition.kind).not.toBe('NOT_REQUIRED');
    expect(live.competition.kind).not.toBe(frozen.competition.kind);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ AND THE OTHER DIRECTION — A WITHDRAWAL STOPS EXEMPTING', () => {
  it('withdrawing the listing retracts the exemption, on the default corpus', async () => {
    const id = await grantSoleSource();
    expect(pslExemptionFor([NEW_SUPPLIER], [NEW_CODE], P).kind).toBe('EXEMPT');

    const withdrawn = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_withdraw',
      entity: 'psl',
      entityId: id,
      payload: { reason: 'the second source qualified' },
    });
    expect(withdrawn.status, withdrawn.reason ?? '').not.toBe('failed');

    // ⚠️ **THE EXPENSIVE DIRECTION, AND THE ONE A SNAPSHOT GETS WRONG IN THE
    // DANGEROUS WAY.** A stale corpus that misses a GRANT makes a buyer compete
    // an event they need not; a stale corpus that misses a WITHDRAWAL tells
    // them not to compete one they must.
    expect(pslExemptionFor([NEW_SUPPLIER], [NEW_CODE], P).kind).toBe('NOT_EXEMPT');
  });
});
