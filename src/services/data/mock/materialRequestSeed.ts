// ────────────────────────────────────────────────────────────────────────────
// R8 — THE DEMONSTRABLE MATERIAL REQUESTS, GROWN THROUGH THE MACHINE.
//
// `materialRequestStore` SEEDS EMPTY, deliberately: nobody has ever asked for a
// material. But a master-data queue with nothing in it is a page that can only
// ever show its empty state, so the walk needs rows.
//
// ⚠️ **SO THE ROWS ARE GROWN, NOT WRITTEN**, on `applicationSeed.ts` and
// `requisitionSeed.ts`'s precedent and for their reason. It would have been two
// lines to push two literals into the store. Those lines would be requests in a
// state no act put them in, carrying a `submittedAt` nobody submitted at and a
// `submittedBy` nobody set — rendered on a queue beside rows a real dispatch
// produced, with nothing to tell them apart.
//
// Every row here goes through `t_materialrequest_submit`, so it passes
// `MATERIALREQUEST_CATEGORY_KNOWN`, `_NEED_AUTHORED` and `_RFQ_RESOLVED`
// exactly as a later act will, lands in the DR-10 trail, and takes a
// store-assigned `MR-2026-…` number that names the row it is printed on.
//
// ── ⚠️ THE FIRST ROW NEEDS AN RFQ WITH A CODE-LESS PICK, AND THE SEED RAISES
//     ONE RATHER THAN POINTING AT A SEEDED EVENT (operator ruling) ───────────
//
// Measured: all 14 seeded RFQs predate the catalog's codes and every one of
// their `materialIds` entries is a real `MATERIAL_MASTER` key. So a request
// hung off a seeded event would point at an RFQ whose own materials ALL
// RESOLVE — **a fixture that quietly contradicts the reason the wizard entrance
// exists.** The seed therefore raises its own event through `t_rfq_create` with
// a code-less material selected, and then the request from it.
//
// ⚠️ **THAT WAS MEASURED SAFE BEFORE IT WAS BUILT, NOT ASSUMED.** Growing the
// RFQ population is only invisible to the rest of the suite because:
//   · no spec sees a seeded row without NAMING the seed (bilateral control:
//     `seedSupplierApplications` is invoked by 3 spec files; a fabricated name
//     by none), and `src/test/setup.ts` invokes no seed at all;
//   · every RFQ assertion that pins a SET or an ID LIST reads the FROZEN
//     `mockRfqs` fixture — `BuyerSourcingGate.test.tsx:133`,
//     `materialMasterAuthoring.test.ts:143/242/263` — and `t_rfq_create` writes
//     `rfqStore`, which it cannot reach;
//   · every assertion that reads `rfqStore` is RELATIVE (`const before =
//     rfqStore.all().length`) or a floor (`toBeGreaterThan(0)`).
// If any of those stops being true, this seed is the thing to change — not the
// specs it would otherwise disturb.
//
// ── ⚠️ BOTH ROWS STOP AT `Submitted`, AND THAT IS THE WHOLE POINT ───────────
//
// A seed that walked a row to `Approved` would remove the thing this exists to
// demonstrate. The reviewing is the operator's act on the surface; the seed's
// job is to put something on the pile.
//
// ── ⚠️ THE SCOPE IS `procurement`, WHICH HOLDS THE RAISING AND NOT THE
//     DECIDING ───────────────────────────────────────────────────────────────
//
// Derived, not assumed: `materialrequest:submit` sits in `procurement` and the
// deciding atoms sit in `planning`. Seeding under a wide seat would have worked
// and would have quietly modelled one person raising a request and deciding it
// — the segregation defect already filed at §76d. **A seed is a worked example
// of the system's own rules**, so it holds exactly the atoms the acts need.
// ────────────────────────────────────────────────────────────────────────────

import { MockCommandService } from './MockCommandService';
import { materialRequestStore } from './stores/materialRequestStore';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import type { CommandResult, QueryScope } from '../types';

/**
 * The event the seed raises so the first request has honest provenance.
 *
 * ⚠️ **`materials` IS EMPTY, AND THAT IS THE FIXTURE BEING FAITHFUL RATHER THAN
 * LAZY.** `codesOfKeys` is a FILTER: a code-less selection contributes nothing
 * to `materialIds`. So an RFQ whose only picked material is `PET Bottle 100ml`
 * genuinely carries NO codes — which is exactly the state a buyer reaches, and
 * the reason a material request has anywhere to be raised from. Writing a code
 * here to make the row look fuller would model the defect the catalog batch
 * removed.
 */
const SEED_RFQ = Object.freeze({
  title: 'Sample — 100ml PET bottles for the Q1 serum line (illustrative)',
  materialCategory: 'Packaging',
  materials: Object.freeze([] as readonly string[]),
  totalQty: 24000,
  uom: 'PCS',
  responseDeadline: '2026-11-14',
  awardDeadline: '2026-11-28',
  invitedSupplierIds: Object.freeze(['sup-002', 'sup-005', 'sup-007'] as readonly string[]),
});

/**
 * The requests the seed raises. Two, and two is a decision on
 * `applicationSeed.ts`'s arithmetic:
 *
 *   · ONE is not enough — the walk needs a second row to decline, and declining
 *     the only row on the page would leave the queue empty at the end of it.
 *   · THREE would be furniture. The surface's behaviour is proven by the two.
 *
 * The FIRST carries the wizard's provenance (`fromRfq`), the SECOND is
 * standalone — so both entrances are represented in the demonstration data and
 * a reader can see that the record is the same either way.
 *
 * Both are plainly fictional in the `complianceRegistry.ts` house style
 * (`DISCOVERY-REAL-SUBJECTS-01`): a plausible invented name reproduces the
 * problem with better luck, because the next census cannot tell it from a real
 * one and neither can a reader.
 *
 * ⚠️ `PET Bottle 100ml` is the catalog's own `AMBIGUOUS_IN_MASTER` entry, used
 * because it is the entry the operator already chose for the code-less walk:
 * an ordinary material a buyer would really pick, not the `Custom material`
 * row, which is `NOT_A_MATERIAL` and will never acquire a code.
 */
const SEEDS = Object.freeze([
  Object.freeze({
    requestedLabel: 'PET Bottle 100ml',
    category: 'Packaging',
    need:
      'Sample request (illustrative) — the Q1 serum line needs a 100ml PET bottle and the ' +
      'catalog offers no master code for one.',
    catalogReason: 'AMBIGUOUS_IN_MASTER',
    fromRfq: true,
    expectedUom: 'PCS',
  }),
  Object.freeze({
    requestedLabel: 'Sample Amber Dropper 30ml (illustrative)',
    category: 'Packaging',
    need:
      'Sample request (illustrative) — raised outside a sourcing event; no existing dropper ' +
      'in the master fits a 30ml fill.',
    catalogReason: undefined,
    fromRfq: false,
    expectedUom: 'PCS',
  }),
] as const);

/** The lane that raises a request, and holds no power to decide one. */
const PROCUREMENT_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  // A SAMPLE REQUESTER (R4) — the same person the PSL seed proposes as, so one
  // demo seat reaches BOTH four-eyes refusals. The deciding lane is `planning`
  // here and `compliance` there, so the admitted direction differs per lane and
  // neither is reachable by accident.
  actor: SAMPLE_ACTORS.procurement1,
};

export interface MaterialRequestSeedOutcome {
  /**
   * `seeded` — every request was raised and sits at `Submitted`.
   * `already-seeded` — the store already holds rows; skipped untouched.
   * `refused` — a dispatch refused. THE STORE IS LEFT WHEREVER THE MACHINE LEFT
   *   IT, never nudged: a half-seeded queue is the truth, and a better artifact
   *   than a full one the machine declined to produce.
   */
  readonly status: 'seeded' | 'already-seeded' | 'refused';
  /** The request numbers minted, in order. */
  readonly requestNumbers?: readonly string[];
  /** The id of the event the seed raised, when it got that far. */
  readonly rfqId?: string;
  /** Which request refused, and the dispatcher's own words. */
  readonly refusedAt?: string;
  readonly reason?: string;
}

/**
 * Grow the master-data queue.
 *
 * Idempotent on a NON-EMPTY store: re-running finds rows and skips. That is the
 * correct test here rather than a marker row — the store's empty seed is what
 * makes "is anything in it?" a complete question, and a marker would be a fact
 * about the seed rather than about the queue.
 */
export async function seedMaterialRequests(
  commands: MockCommandService = new MockCommandService(),
): Promise<MaterialRequestSeedOutcome> {
  if (materialRequestStore.all().length > 0) {
    return {
      status: 'already-seeded',
      requestNumbers: materialRequestStore.all().map((r) => r.requestNumber),
    };
  }

  // The event first, so the wizard-provenance row has a real id to RESOLVE
  // against rather than a value the seed invented.
  const event: CommandResult = await commands.dispatch(PROCUREMENT_SCOPE, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: { ...SEED_RFQ, materials: [...SEED_RFQ.materials], invitedSupplierIds: [...SEED_RFQ.invitedSupplierIds] },
  });
  if (event.status === 'failed' || !event.entityId) {
    return { status: 'refused', refusedAt: 't_rfq_create', reason: event.reason };
  }
  const rfqId = event.entityId;

  const minted: string[] = [];
  for (const seed of SEEDS) {
    const result: CommandResult = await commands.dispatch(PROCUREMENT_SCOPE, {
      transitionId: 't_materialrequest_submit',
      entity: 'materialRequest',
      payload: {
        requestedLabel: seed.requestedLabel,
        category: seed.category,
        need: seed.need,
        ...(seed.catalogReason ? { catalogReason: seed.catalogReason } : {}),
        ...(seed.fromRfq ? { raisedFromRfqId: rfqId } : {}),
        expectedUom: seed.expectedUom,
      },
    });
    if (result.status === 'failed' || !result.entityId) {
      return {
        status: 'refused',
        requestNumbers: minted,
        rfqId,
        refusedAt: seed.requestedLabel,
        reason: result.reason,
      };
    }
    minted.push(materialRequestStore.get(result.entityId)!.requestNumber);
  }

  return { status: 'seeded', requestNumbers: minted, rfqId };
}
