// ────────────────────────────────────────────────────────────────────────────
// B2 — THE DEMONSTRABLE APPLICATIONS, GROWN THROUGH THE MACHINE.
//
// B1 shipped the supplierApplication machine headless and its store SEEDS
// EMPTY, deliberately: nobody has ever applied. B2 builds the review lane over
// it — and a review lane with nothing in it is a page that can only ever show
// its empty state. The walk needs rows.
//
// ⚠️ **SO THE ROWS ARE GROWN, NOT WRITTEN**, on `requisitionSeed.ts`'s
// precedent and for its reason. It would have been three lines to push three
// literals into the store. Those lines would be documents in a state no act put
// them in, carrying a `submittedAt` nobody submitted at and a `submittedBy`
// nobody set — rendered on a review queue beside rows a real dispatch produced,
// with nothing to tell them apart.
//
// Every row here goes through `t_application_submit`, so it passes
// `APPLICATION_REQUEST_TYPE_KNOWN`, `APPLICATION_INTERNAL_VENDOR_RESOLVED` and
// `APPLICATION_DECLARATIONS_WELL_FORMED` exactly as a later act will, lands in
// the DR-10 trail, and takes a store-assigned `APP-2026-…` number that names
// the row it is printed on.
//
// ── ⚠️ THEY STOP AT `Submitted`, AND THAT IS THE WHOLE POINT ────────────────
//
// A seed that walked a row to `Approved` would remove the thing B2 exists to
// demonstrate. The reviewing is the operator's act on the surface; the seed's
// job is to put something on the pile.
//
// ── ⚠️ THE SCOPE IS `procurement`, WHICH IS THE ONLY LANE THAT HOLDS THE VERB
//
// Derived, not assumed: `application:submit` sits in `procurement` and the
// deciding atoms sit in `compliance` (`businessRoles.ts`). Seeding under a wide
// seat would have worked and would have quietly modelled one person raising an
// application and deciding it — the segregation defect already filed at §76d.
// A seed is a worked example of the system's own rules.
//
// ── ⚠️ NO `Internal SR` ROW, AND THE REASON IS A MEASURED BLOCKER ───────────
//
// An extension request must name an existing vendor that resolves against the
// platform roster, and the roster's identifiers are `sapBpNumber`
// (`BP-100012xx`) while `/register`'s field asks for a `1000456`-shaped S/4HANA
// vendor number that exists nowhere in this tree. That mismatch is B3's
// precondition, filed. Seeding an Internal SR here would mean choosing one side
// of an unreconciled identifier space and baking it into the demonstration data
// — so the seed uses the two request types that touch no roster at all, and
// says so rather than quietly picking.
// ────────────────────────────────────────────────────────────────────────────

import { MockCommandService } from './MockCommandService';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { NO_PERSON } from '../../../context/noPerson';
import type { CommandResult, QueryScope } from '../types';

/**
 * The applications the seed raises. Two, and two is a decision:
 *
 *   · ONE is not enough — the walk needs a second row to refuse, and refusing
 *     the only row on the page would leave the queue empty at the end of it.
 *   · THREE would be furniture. The surface's behaviour is proven by the two.
 *
 * Both are plainly fictional in the `complianceRegistry.ts` house style
 * (`DISCOVERY-REAL-SUBJECTS-01`): a plausible invented name reproduces the
 * problem with better luck, because the next census cannot tell it from a real
 * one and neither can a reader.
 */
const SEEDS = Object.freeze([
  Object.freeze({
    requestType: 'External SR',
    companyName: 'PT Sample Emulsifiers (illustrative)',
    declarations: Object.freeze([
      Object.freeze({ kind: 'npwp', reference: 'SAMPLE-NPWP-9001' }),
      Object.freeze({ kind: 'nib', reference: 'SAMPLE-NIB-9001' }),
      Object.freeze({ kind: 'halal', reference: 'SAMPLE-HALAL-9001' }),
    ]),
  }),
  Object.freeze({
    requestType: 'KOL',
    companyName: 'PT Sample Creator Studio (illustrative)',
    declarations: Object.freeze([
      Object.freeze({ kind: 'npwp', reference: 'SAMPLE-NPWP-9002' }),
    ]),
  }),
] as const);

/** The lane that raises an application, and holds no power to decide one. */
const PROCUREMENT_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

export interface ApplicationSeedOutcome {
  /**
   * `seeded` — every application was raised and sits at `Submitted`.
   * `already-seeded` — the store already holds rows; skipped untouched.
   * `refused` — a dispatch refused. THE STORE IS LEFT WHEREVER THE MACHINE LEFT
   *   IT, never nudged: a half-seeded queue is the truth, and a better artifact
   *   than a full one the machine declined to produce.
   */
  readonly status: 'seeded' | 'already-seeded' | 'refused';
  /** The application numbers minted, in order. */
  readonly applicationNumbers?: readonly string[];
  /** Which company refused, and the dispatcher's own words. */
  readonly refusedAt?: string;
  readonly reason?: string;
}

/**
 * Grow the review queue.
 *
 * Idempotent on a NON-EMPTY store: re-running finds rows and skips. That is the
 * correct test here rather than a marker row — the store's empty seed is what
 * makes "is anything in it?" a complete question, and a marker would be a fact
 * about the seed rather than about the queue.
 */
export async function seedSupplierApplications(
  commands: MockCommandService = new MockCommandService(),
): Promise<ApplicationSeedOutcome> {
  if (supplierApplicationStore.all().length > 0) {
    return {
      status: 'already-seeded',
      applicationNumbers: supplierApplicationStore.all().map((a) => a.applicationNumber),
    };
  }

  const minted: string[] = [];
  for (const seed of SEEDS) {
    const result: CommandResult = await commands.dispatch(PROCUREMENT_SCOPE, {
      transitionId: 't_application_submit',
      entity: 'supplierApplication',
      payload: {
        requestType: seed.requestType,
        companyName: seed.companyName,
        declarations: seed.declarations.map((d) => ({ ...d })),
      },
    });
    if (result.status === 'failed' || !result.entityId) {
      return {
        status: 'refused',
        applicationNumbers: minted,
        refusedAt: seed.companyName,
        reason: result.reason,
      };
    }
    minted.push(supplierApplicationStore.get(result.entityId)!.applicationNumber);
  }

  return { status: 'seeded', applicationNumbers: minted };
}
