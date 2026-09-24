// ────────────────────────────────────────────────────────────────────────────
// PSL P3 — THE DEMONSTRABLE LISTINGS, GROWN THROUGH THE MACHINE.
//
// P1 shipped nine `PslListing` LITERALS in `mock/fixtures/pslListings.ts`. P3
// retires that file and grows the same nine through the real verbs, on
// `applicationSeed.ts`'s precedent and in its words:
//
//   *"It would have been three lines to push three literals into the store.
//   Those lines would be documents in a state no act put them in, carrying a
//   `submittedAt` nobody submitted at and a `submittedBy` nobody set — rendered
//   on a review queue beside rows a real dispatch produced, WITH NOTHING TO
//   TELL THEM APART."*
//
// Every row below goes through `t_psl_propose`, so it passes
// `PSL_SUPPLIER_RESOLVED`, `PSL_SCOPE_WELL_FORMED`, `PSL_STATUS_KNOWN`,
// `PSL_VALIDITY_ORDERED` and `PSL_JUSTIFICATION_AUTHORED` exactly as a later
// act will, lands in the DR-10 trail, and takes a store-assigned `psl-NNN` id.
//
// ── ⚠️ THE SCOPES ARE LANE-CORRECT, AND THAT IS THE POINT (ruling h) ───────
//
//   Derived, not assumed: `psl:propose` and `psl:publish` sit in `procurement`
//   and `psl:decide` / `psl:cap-set` sit in `compliance` (`businessRoles.ts`).
//   Seeding under one wide seat would have worked and would have quietly
//   modelled one person raising a listing and approving it — the segregation
//   defect already filed at §76d. **A seed is a worked example of the system's
//   own rules**, so it uses two narrow scopes and never the default seat.
//
//   ⚠️ It is also the only way the seed CAN run: `PSL_RESTRICTIVE_STATUS_
//   APPROVED` refuses a `Mandatory` or `Sole Source` decision from a seat
//   holding both authorities, and six of the nine rows below are restrictive.
//   A seed under the default buyer seat would be refused by the platform it is
//   demonstrating, which is the correct outcome and a useful thing to know.
//
// ── ⚠️ THE DATES: AUTHORED AND RE-ANCHORED, vs STORE-ASSIGNED ──────────────
//
//   `validFrom` / `validUntil` are AUTHORED against `SHARED_CONTRACT_ANCHOR`
//   and shifted onto `DECLARED_PRESENT` HERE, before dispatch, through the same
//   `shiftIso` on the same `psl` family — so the coherent window and both its
//   pinned edges survive the move from a fixture to a seed, and
//   `pslListings.fixture.test.ts` still re-derives them from `PSL_SEEDS_RAW`.
//
//   Everything else — every `statusHistory.at`, `publishedAt`, `capDecidedAt` —
//   is STORE-ASSIGNED at the instant of the act, because those fields are
//   forbidden to a caller (the `pinnedAt` discipline: a caller that could set
//   them could backdate its own audit entry).
//
//   ⚠️ **SO A SEEDED ROW'S LEDGER SAYS IT WAS RECORDED TODAY, ON A DESIGNATION
//   THAT MAY HAVE RUN LAST YEAR — AND THAT IS A BACKFILL, NOT A DEFECT.** It is
//   the normal way an existing preferred supplier list enters a new portal on
//   day one. The ledger `at` says when Paragon learned of the designation;
//   `validFrom` / `validUntil` say when it applies. They are different axes and
//   they are legitimately different — the same split `publishedAt` already
//   makes against validity, one field over.
//
// ── ⚠️ ROWS STOP WHERE THE SURFACE STILL HAS WORK (ruling h) ───────────────
//
//   `psl-008` stays `Proposed` — the queue would otherwise open on an empty
//   pile and the grant/reject verbs would have nothing to act on. Four rows
//   stay UNPUBLISHED, so the publish verb has a subject and the internal /
//   published split is visible on the profile tab. A seed that walked every row
//   to its end would delete the thing the surfaces exist to demonstrate.
//
// ── ⚠️ ONE ARM IS DELIBERATELY NOT SEEDED, AND IT IS NAMED (ruling h) ──────
//
//   The retired corpus carried `psl-005` with a **2000-day cap override**, to
//   exercise `CEILING_BOUNDED` from DATA. `PSL_CAP_WITHIN_CEILING` now refuses
//   any override above `PSL_CAP_CEILING_DAYS`, so the machine cannot produce
//   that row — and weakening the hook to let a fixture through would be
//   authoring a defect to keep a test green. `psl-005` is seeded WITHOUT the
//   override, and `CEILING_BOUNDED` moves to SYNTHETIC coverage in
//   `pslProjection.test.ts`, which says so at the site. **No other arm moved**;
//   the arm-by-arm accounting is in `pslSeed.test.ts`, derived rather than
//   listed here.
// ────────────────────────────────────────────────────────────────────────────

import { MockCommandService } from './MockCommandService';
import { pslStore } from './stores/pslStore';
import { shiftFields } from '../fixturePresent';
import { NO_PERSON } from '../../../context/noPerson';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import type { PslLifecycle, PslListing, PslStatus } from '../pslListing';
import type { CommandResult, QueryScope } from '../types';

/**
 * WHAT HAPPENS TO A ROW AFTER IT IS PROPOSED.
 *
 * A closed union rather than a set of booleans: `grant` and `reject` are
 * mutually exclusive and `publish` is only reachable from `Listed`, so booleans
 * would make three unreachable combinations expressible and one of them would
 * eventually be authored.
 */
export type PslSeedWalk =
  | 'propose'
  | 'grant'
  | 'grant+publish'
  | 'grant+withdraw'
  /**
   * PSL P4 · PUBLISHED, THEN STOPPED.
   *
   * ⚠️ **THE MEMBER EXISTS BECAUSE OPERATOR RULING R5(b) MAKES THE STATE
   * REACHABLE AND NOTHING SEEDED IT.** Publication is never undone; a listing
   * that must stop is WITHDRAWN. So a supplier CAN be told about a designation
   * that is later withdrawn, and the supplier surface has to say something
   * honest when it is — measured before P4: `published && Withdrawn` rows in
   * the corpus = **0**, so that arm of the supplier view was an unreachable
   * branch with no data behind it.
   *
   * It is a separate member rather than a boolean pair for the reason the
   * union's own header gives: booleans would make `withdraw` expressible
   * without `grant`, and one of those combinations would eventually be
   * authored.
   */
  | 'grant+publish+withdraw'
  | 'reject';

/** One row's worth of authored intent. */
export interface PslSeedRow {
  /** Why this row exists. Stated per row so a later edit cannot quietly delete
   *  a case while leaving a plausible row behind. */
  readonly intent: string;
  readonly supplierId: string;
  /** REAL `MATERIAL_MASTER` keys. `PSL_SCOPE_WELL_FORMED` proves it. */
  readonly materialCodes: readonly string[];
  readonly status: PslStatus;
  /** RAW — authored against `SHARED_CONTRACT_ANCHOR`, shifted at dispatch. */
  readonly validFrom: string;
  /** RAW. See `validFrom`. */
  readonly validUntil: string;
  readonly justification: string;
  readonly evidenceRefs: readonly string[];
  /** The ledger entry the PROPOSAL writes. */
  readonly proposeReason: string;
  readonly walk: PslSeedWalk;
  /** The ledger entry the DECISION writes. Required on every walk but
   *  `'propose'`; the type cannot say "required when", so `seedPslListings`
   *  refuses a row that omits it rather than inventing one. */
  readonly decideReason?: string;
  /** Only on `'grant+withdraw'`. */
  readonly withdrawReason?: string;
  /** Only on a granted row. All four cap fields are written together by
   *  `t_psl_cap_override`, which is why this is one object and not two. */
  readonly capOverride?: { readonly days: number; readonly justification: string };
}

/**
 * THE NINE, IN ID ORDER.
 *
 * ⚠️ **THE ORDER IS LOAD-BEARING AND IS NOT COSMETIC.** `pslStore.nextId()`
 * mints `psl-001`, `psl-002`, … in dispatch order, and these ids are DEEP-LINK
 * TARGETS: `/buyer/suppliers/sup-002?id=psl-003` opens the profile tab on one
 * listing, and `recordAnchorId` renders them into the DOM. Seeding in any other
 * order would silently repoint every link anybody has copied out of this portal
 * at a different governance decision.
 */
export const PSL_SEEDS_RAW: readonly PslSeedRow[] = Object.freeze([
  // ── sup-002 · PT Sample Specialty Fats — THE MULTI-LISTING SUPPLIER ──────
  Object.freeze({
    intent:
      'IN FORCE, comfortably, and PUBLISHED. The Directory best-status badge ' +
      'for sup-002 must read Sole Source because of this row.',
    supplierId: 'sup-002',
    materialCodes: Object.freeze(['RM-PSTN-7150', 'RM-STEAR-7300']),
    status: 'Sole Source' as PslStatus,
    validFrom: '2026-02-23',
    validUntil: '2027-02-28',
    justification:
      'Sole regional source for pressed stearin at food-grade specification; ' +
      'no qualified alternative within the lead-time window.',
    evidenceRefs: Object.freeze(['doc-101', 'doc-102']),
    proposeReason: 'Raised after the single-source review flagged no alternative.',
    walk: 'grant+publish' as PslSeedWalk,
    decideReason: 'Exclusivity evidence accepted.',
  }),
  Object.freeze({
    intent:
      'IN FORCE BUT EXPIRING (inside the 90-day window at the anchor), and ' +
      'deliberately UNPUBLISHED — the operator "in force and internal" case, ' +
      'which is what proves publication and in-force are independent axes.',
    supplierId: 'sup-002',
    materialCodes: Object.freeze(['RM-MYRST-7310']),
    status: 'Validated' as PslStatus,
    validFrom: '2026-03-25',
    validUntil: '2026-07-08',
    justification:
      'Pre-qualified on quality and lead time; competitive bidding still applies.',
    evidenceRefs: Object.freeze(['doc-101']),
    proposeReason: 'Raised by the sourcing squad on completed pre-qualification.',
    walk: 'grant' as PslSeedWalk,
    decideReason: 'Pre-qualification completed by the sourcing squad.',
  }),
  Object.freeze({
    intent:
      'PUBLISHED AND SINCE EXPIRED — the third diagonal, and the row that ' +
      'proves the two axes do not move together. It must NOT contribute to ' +
      'sup-002 best status (stage 1 discards it) even though it carries the ' +
      'more restrictive designation.',
    supplierId: 'sup-002',
    materialCodes: Object.freeze(['RM-EMUL-9410']),
    status: 'Mandatory' as PslStatus,
    validFrom: '2025-07-28',
    validUntil: '2026-04-24',
    justification: 'Directed spend under the approved emulsifier sourcing strategy.',
    evidenceRefs: Object.freeze(['doc-102']),
    proposeReason: 'Raised under the approved emulsifier sourcing strategy.',
    walk: 'grant+publish' as PslSeedWalk,
    decideReason: 'Sourcing strategy approved; supply directed for the term.',
  }),

  // ── sup-005 · Sample Personal Care Emulsifiers GmbH ──────────────────────
  Object.freeze({
    intent:
      'A PER-LISTING CAP OVERRIDE THAT BINDS. The authored validUntil sits ' +
      'well past the 150-day override measured from validFrom, so a reader ' +
      'ignoring the cap would show this listing running months longer than ' +
      'it does. It is also the LATE edge of the anchor window.',
    supplierId: 'sup-005',
    materialCodes: Object.freeze(['AI-NIAC-6601', 'AI-PANTO-6640']),
    status: 'Mandatory' as PslStatus,
    validFrom: '2026-04-24',
    validUntil: '2026-12-10',
    justification:
      'Directed source for actives under the approved 2026 sourcing strategy.',
    evidenceRefs: Object.freeze(['doc-201', 'doc-202']),
    proposeReason: 'Raised under the approved 2026 actives strategy.',
    walk: 'grant+publish' as PslSeedWalk,
    decideReason: 'Approved with a shortened validity, justification recorded.',
    capOverride: Object.freeze({
      days: 150,
      justification:
        'Shortened against the default: the qualification rests on a single ' +
        'audit cycle and must be re-taken before the next campaign.',
    }),
  }),
  Object.freeze({
    intent:
      'THE EARLY EDGE of the anchor window (one day sooner it has not ' +
      'STARTED and reads Scheduled). ⚠️ It carried a 2000-day override in the ' +
      'retired corpus, to exercise CEILING_BOUNDED from data; the machine ' +
      'refuses that override now, so the arm is covered synthetically and ' +
      'this row is seeded without it. The EDGE is what it still proves.',
    supplierId: 'sup-005',
    materialCodes: Object.freeze(['AI-HYALU-6610']),
    status: 'Validated' as PslStatus,
    validFrom: '2026-05-04',
    validUntil: '2028-11-09',
    justification: 'Pre-qualified on quality; continues to compete on price.',
    evidenceRefs: Object.freeze(['doc-201']),
    proposeReason: 'Raised for the packaging-campaign pre-qualification.',
    walk: 'grant' as PslSeedWalk,
    decideReason: 'Pre-qualification accepted for the packaging campaign.',
  }),

  // ── sup-007 · PT Sample Packaging Indonesia — THE ACQUITTAL CONTROLS ─────
  Object.freeze({
    intent:
      'THE Withdrawn ACQUITTAL. It sits PAST its own effective end date, so ' +
      'a bare isPast(validUntil) classifier would call it Expired. It must ' +
      'read Withdrawn: it did not run out, it was stopped.',
    supplierId: 'sup-007',
    materialCodes: Object.freeze(['PK-PETB-8804']),
    status: 'Validated' as PslStatus,
    validFrom: '2025-11-05',
    validUntil: '2026-05-19',
    justification: 'Pre-qualified for PET bottle supply.',
    evidenceRefs: Object.freeze(['doc-001']),
    proposeReason: 'Raised for PET bottle supply.',
    walk: 'grant+withdraw' as PslSeedWalk,
    decideReason: 'Pre-qualification completed.',
    withdrawReason: 'Withdrawn after the tooling change was not re-qualified.',
  }),
  Object.freeze({
    intent:
      'THE Rejected ACQUITTAL, and the opposite direction of the same guard. ' +
      'It sits COMFORTABLY INSIDE its date range, so a classifier reading ' +
      'dates alone would call it in force. It grants nothing.',
    supplierId: 'sup-007',
    materialCodes: Object.freeze(['PK-ALCP-2450']),
    status: 'Mandatory' as PslStatus,
    validFrom: '2025-12-25',
    validUntil: '2027-03-20',
    justification: 'Proposed as a directed source for aluminium closures.',
    evidenceRefs: Object.freeze([]),
    proposeReason: 'Raised by the category team.',
    walk: 'reject' as PslSeedWalk,
    decideReason:
      'Refused: a second qualified closure supplier exists, so the monopoly ' +
      'ground does not hold.',
  }),
  Object.freeze({
    intent:
      'THE Proposed ARM — not yet decided, so not in force even though its ' +
      'window has opened, and decidedBy is null. It is also what the QUEUE ' +
      'page opens on: without it the grant and reject verbs have no subject.',
    supplierId: 'sup-007',
    materialCodes: Object.freeze(['FR-ROUD-4470']),
    status: 'Sole Source' as PslStatus,
    validFrom: '2026-05-29',
    validUntil: '2027-05-29',
    justification:
      'Proposed on exclusivity for the rose-oud accord; awaiting sign-off.',
    evidenceRefs: Object.freeze(['doc-002']),
    proposeReason: 'Raised on a claimed exclusive formulation.',
    walk: 'propose' as PslSeedWalk,
  }),
  Object.freeze({
    intent:
      'THE Scheduled ARM — granted and decided, but its validity has not ' +
      'opened yet, so it must NOT be in force and must NOT contribute to ' +
      'sup-005 best status. ⚠️ A PROBE CONVICTED THE FIRST PROJECTION here: ' +
      'it read only the END of a validity, so a listing effective next ' +
      'quarter suspended bidding the day it was typed.',
    supplierId: 'sup-005',
    materialCodes: Object.freeze(['RM-EMUL-9440']),
    status: 'Mandatory' as PslStatus,
    validFrom: '2026-07-03',
    validUntil: '2027-10-06',
    justification:
      'Directed source from the start of the next campaign, once the current ' +
      'qualification lapses.',
    evidenceRefs: Object.freeze(['doc-202']),
    proposeReason: 'Raised ahead of the campaign, effective on its start date.',
    walk: 'grant' as PslSeedWalk,
    decideReason: 'Approved ahead of the campaign, effective on its start date.',
  }),

  // ── sup-007 · PT Sample Packaging Indonesia — THE DEFAULT SUPPLIER SEAT ──
  //
  // ⚠️ **THESE TWO EXIST BECAUSE P4 MEASURED THAT THE SUPPLIER-FACING VIEW
  // WOULD RENDER EMPTY FOR THE ONE SEAT ANYBODY ACTUALLY OPENS.** `SidebarV2`
  // and `Login` both seed `sup-007`, and of its three listings above NONE is
  // published — so the first supplier view this portal ever shipped would have
  // photographed an empty state and looked correct doing it. That is
  // `EMPTY-INPUT-REPORTS-CLEAN-01` with a screenshot attached, and browser QA
  // is precisely the instrument that would not have caught it.
  //
  // ⚠️ **APPENDED, NEVER INSERTED.** `pslStore.nextId()` mints in dispatch
  // order and those ids are DEEP-LINK TARGETS (`/buyer/suppliers/sup-002?id=
  // psl-003`). Placing either of these earlier would silently repoint every
  // link anybody has copied out of this portal at a different governance
  // decision. They take `psl-010` and `psl-011`; nothing above moves.
  //
  // ⚠️ **THE DATES ARE AUTHORED RAW AGAINST THE SHARED ANCHOR, like every
  // row above**, and shifted onto `DECLARED_PRESENT` by `anchoredValidity`. The
  // landings below are what the shift PRODUCES, not what is typed here, and
  // `pslSeed.test.ts` re-derives them rather than trusting this comment.
  Object.freeze({
    intent:
      'PUBLISHED AND EXPIRING — the supplier-facing lapse line has a subject. ' +
      'Lands inside PSL_EXPIRING_WINDOW_DAYS at the declared present, on the ' +
      'DEFAULT supplier seat, so /supplier/performance is not an empty page.',
    supplierId: 'sup-007',
    materialCodes: Object.freeze(['PK-PETB-8810', 'PK-CAPF-8820']),
    status: 'Mandatory' as PslStatus,
    validFrom: '2025-12-23',
    validUntil: '2026-06-24',
    justification:
      'Directed source for the 250ml bottle and its closure while the ' +
      'second-source qualification runs; renew or re-compete before it lapses.',
    // doc-005 is sup-007's ISO 9001 quality certificate — a real row in
    // `supplierDocuments.ts`. The first draft cited `doc-301`, which does not
    // exist, and `pslListings.fixture.test.ts` caught it by name.
    evidenceRefs: Object.freeze(['doc-005']),
    proposeReason: 'Raised to hold the closure pairing through the current campaign.',
    walk: 'grant+publish' as PslSeedWalk,
    decideReason: 'Directed sourcing accepted for the campaign window.',
  }),
  Object.freeze({
    intent:
      'PUBLISHED, THEN WITHDRAWN — the R5(b) case, which the corpus held ZERO ' +
      'of before P4. The supplier was told, and then the designation was ' +
      'stopped rather than un-published. The supplier view must say so.',
    supplierId: 'sup-007',
    materialCodes: Object.freeze(['PK-CART-9901']),
    status: 'Validated' as PslStatus,
    validFrom: '2026-01-20',
    validUntil: '2026-12-10',
    justification:
      'Pre-qualified for mono-carton supply alongside the incumbent; kept in ' +
      'competition rather than directed.',
    evidenceRefs: Object.freeze(['doc-008']),
    proposeReason: 'Raised after the carton audit closed with no findings.',
    walk: 'grant+publish+withdraw' as PslSeedWalk,
    decideReason: 'Qualification accepted; supplier competes alongside the incumbent.',
    withdrawReason:
      'Carton volumes consolidated onto a single plant; the qualification is ' +
      'no longer used and is stopped rather than left to lapse.',
  }),

  // ── sup-008 · PT Sample Carton Packaging — THE LAPSED EXAMPLE ─────────────
  //
  // ⚠️ **THIS ROW EXISTS BECAUSE THE TWO ABOVE DESTROYED A CASE THE TREE
  // ALREADY DEMONSTRATED, AND IT IS THE PRICE OF THEM RATHER THAN AN ADDITION
  // ON ITS OWN ACCOUNT.** `psl-010` is PUBLISHED AND EXPIRING, and `Expiring`
  // IS in force (`isPslInForce` admits `Listed` and `Expiring`) — so sup-007's
  // Directory verdict moved `LAPSED` → `IN_FORCE`, and measured across the
  // whole roster afterwards **no supplier was LAPSED at all**. Three shipped
  // specs assert that the Directory renders three VISIBLY DIFFERENT cells and
  // that a lapsed Packaging supplier is still invitable; with no lapsed
  // supplier anywhere those assertions can only be LOOSENED, which is the one
  // repair this batch is forbidden to make.
  //
  // ⚠️ **AND IT IS DELIBERATELY UNPUBLISHED.** The supplier-facing view must
  // not gain a row it was never meant to demonstrate: this exists for the
  // BUYER's Directory and sourcing surfaces. Internal is also the truthful
  // state for a qualification that was stopped before anyone was told.
  //
  // sup-008 is category `Packaging`, which is what `BuyerSourcingPsl`'s
  // derived control requires — it filters rather than naming a supplier, so it
  // needs no edit; `BuyerSuppliersPsl` names one and is re-pointed here.
  Object.freeze({
    intent:
      'LAPSED — held a designation, holds none in force. Restores the third ' +
      'Directory cell that psl-010 took away by putting sup-007 in force.',
    supplierId: 'sup-008',
    materialCodes: Object.freeze(['PK-CART-9910']),
    status: 'Validated' as PslStatus,
    validFrom: '2025-10-25',
    validUntil: '2026-07-25',
    justification:
      'Pre-qualified as a second carton source for the lotion line during the ' +
      'incumbent capacity review.',
    // ⚠️ EMPTY, AND DELIBERATELY SO: the document corpus holds rows for
    // sup-002, sup-005 and sup-007 ONLY. Citing a document sup-008 does not
    // have would be a reference to a claim nobody made — the exact thing
    // `evidenceRefs`' own doc comment warns about one level up.
    evidenceRefs: Object.freeze([]),
    proposeReason: 'Raised during the carton capacity review.',
    walk: 'grant+withdraw' as PslSeedWalk,
    decideReason: 'Second-source qualification accepted for the review period.',
    withdrawReason:
      'The capacity review closed with the incumbent retained; the ' +
      'second-source qualification is stopped.',
  }),
] as const);

/**
 * THE LIFECYCLE EACH WALK LEAVES A ROW IN — derived from the walk rather than
 * authored beside it, so the two cannot disagree.
 */
const LIFECYCLE_OF: Readonly<Record<PslSeedWalk, PslLifecycle>> = Object.freeze({
  propose: 'Proposed',
  grant: 'Listed',
  'grant+publish': 'Listed',
  'grant+withdraw': 'Withdrawn',
  'grant+publish+withdraw': 'Withdrawn',
  reject: 'Rejected',
});

/**
 * WHICH WALKS PUBLISH, AND WHICH WITHDRAW — SETS RATHER THAN EQUALITY TESTS.
 *
 * ⚠️ **THE EXECUTOR USED `walk === 'grant+publish'` AND `walk ===
 * 'grant+withdraw'`, AND A THIRD WALK THAT DOES BOTH IS EXACTLY WHAT AN
 * EQUALITY TEST CANNOT EXPRESS.** Adding `|| walk === 'grant+publish+withdraw'`
 * to each line twice would work and would have to be edited twice again for the
 * next member. A membership set is edited once, in the place that names the
 * property, and `Record<PslSeedWalk, …>` above still forces every member to
 * declare its lifecycle.
 *
 * ⚠️ **NOT A SUBSTRING TEST.** `walk.includes('publish')` would read the
 * same today and would silently claim a future `'publish-only'` member that the
 * grant branch never reaches.
 */
const WALKS_THAT_PUBLISH: readonly PslSeedWalk[] = Object.freeze([
  'grant+publish',
  'grant+publish+withdraw',
]);

const WALKS_THAT_WITHDRAW: readonly PslSeedWalk[] = Object.freeze([
  'grant+withdraw',
  'grant+publish+withdraw',
]);

/**
 * WHAT THE PROJECTION SEES, WITH THE DATES STILL RAW.
 *
 * ⚠️ **THIS IS THE ANCHOR-WINDOW ORACLE AND IT REPLACES `__pslRaw`.**
 * `fixturePresent`'s algebra: a row authored at `d` renders at `d + (P − A)`,
 * so its day-count at `P` is `d − A`; reading the RAW row at a candidate anchor
 * `A'` gives `d − A'` — the same number. Sweeping anchors over these is exactly
 * sweeping the seeded corpus over presents, with no second implementation of
 * the shift to disagree with the first.
 *
 * ⚠️ **THE IDS ARE POSITIONAL, AND THAT IS A FACT ABOUT THE STORE RATHER THAN
 * AN ASSUMPTION HERE.** `pslStore.nextId()` mints `psl-001`, `psl-002`, … in
 * dispatch order and this array IS the dispatch order — which is why the store
 * pads to three digits and why `pslSeed.test.ts` asserts the correspondence
 * against the seeded rows rather than trusting this comment.
 */
export function pslSeedRawRows(): readonly {
  readonly id: string;
  readonly lifecycle: PslLifecycle;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly capDaysOverride: number | null;
}[] {
  return PSL_SEEDS_RAW.map((row, i) => ({
    id: `psl-${String(i + 1).padStart(3, '0')}`,
    lifecycle: LIFECYCLE_OF[row.walk],
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    capDaysOverride: row.capOverride?.days ?? null,
  }));
}

/**
 * THE LANE THAT RAISES A LISTING AND TELLS THE SUPPLIER, and holds no power to
 * decide one.
 */
const PROCUREMENT_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  // A SAMPLE PROPOSER (R4). Every seeded listing therefore carries a
  // `proposedBy` that a demo operator can BE, which is what makes
  // `PSL_DECIDER_NOT_PROPOSER`'s REFUSED direction reachable from the seeded
  // corpus rather than only from rows raised by hand.
  actor: SAMPLE_ACTORS.procurement1,
};

/**
 * THE LANE THAT DECIDES A LISTING AND BOUNDS IT, and holds no power to raise
 * one — which is exactly what `PSL_RESTRICTIVE_STATUS_APPROVED` requires for
 * the six restrictive rows above.
 */
const COMPLIANCE_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  // A DIFFERENT SAMPLE PERSON, and the difference is the point: it is what makes
  // the ADMITTED direction reachable on the same corpus. Seeding both sides as
  // one person would leave every seeded row self-decided and the admit arm
  // untestable without hand-raising a listing first.
  actor: SAMPLE_ACTORS.compliance1,
};

export interface PslSeedOutcome {
  /**
   * `seeded` — every listing was raised and walked to its authored stop.
   * `already-seeded` — the store already holds rows; skipped untouched.
   * `refused` — a dispatch refused. THE STORE IS LEFT WHEREVER THE MACHINE
   *   LEFT IT, never nudged: a half-seeded register is the truth, and a better
   *   artifact than a full one the machine declined to produce.
   */
  readonly status: 'seeded' | 'already-seeded' | 'refused';
  /** The listing ids minted, in order. */
  readonly listingIds?: readonly string[];
  /** Which row refused, by its own intent line, and the dispatcher's words. */
  readonly refusedAt?: string;
  readonly reason?: string;
}

/**
 * THE AUTHORED VALIDITIES, RE-TIMED ONTO `DECLARED_PRESENT` BY THE SHARED
 * HELPER — one `shiftFields` over a `PslListing`-typed array.
 *
 * ⚠️ **THE TYPE AND THE HELPER ARE BOTH LOAD-BEARING, AND THE FIRST DRAFT OF
 * THIS FILE LOST BOTH — `readingInstantGate` IS WHAT CAUGHT IT.** That draft
 * shifted each day with a bare `shiftIso(raw, 'psl')`, which is arithmetically
 * identical and instrumentally invisible: the gate derives an anchored family's
 * ENTITY TYPE from its `shiftFields(rows, '<family>', …)` call and then finds
 * every projection reader that touches that type. With no such call, `psl`
 * resolved to `NO-CALL-SITES` — *a read nothing can prove happens at the
 * declared present* — and the family silently left the gate's reach.
 *
 * `PslListingsSection`'s own header had already named this failure shape for a
 * different reason. It is repaired here rather than exempted: the corpus is
 * re-timed the way every other anchored family is re-timed, over the entity
 * type its readers actually carry.
 *
 * ⚠️ Only the two AUTHORED days are listed. Every other date on a seeded row —
 * each `statusHistory.at`, `publishedAt`, `capDecidedAt` — is store-assigned at
 * the instant of the act and has nothing to re-anchor.
 */
/**
 * A COMPLETE, INERT `PslListing` carrying only the two authored days.
 *
 * ⚠️ **IT IS BUILT IN FULL RATHER THAN CAST FROM A PARTIAL, AND THE FIRST
 * DRAFT DID CAST.** `{ validFrom, validUntil } as PslListing` type-checks,
 * runs correctly (`shiftFields` reads only the fields it is given) and is a
 * LIE to the checker — the one kind of `as` that a reader has to take on
 * trust. `shiftFields<T>` needs `T` to BE `PslListing` for
 * `readingInstantGate` to name the family's entity type, so the type is the
 * price of the instrument; paying it honestly costs eleven inert fields.
 *
 * Nothing reads any field but the two days: the id is a marker that would be
 * obvious in any output it ever reached, and `lifecycle` is `Proposed` because
 * that is what a row with no decision on it is.
 */
const validityCarrier = (validFrom: string, validUntil: string): PslListing => ({
  id: 'psl-anchor-carrier',
  supplierId: '',
  scope: { kind: 'material', materialCodes: [] },
  status: 'Validated',
  lifecycle: 'Proposed',
  validFrom,
  validUntil,
  capDaysOverride: null,
  capJustification: null,
  capDecidedBy: null,
  capDecidedAt: null,
  justification: '',
  evidenceRefs: [],
  proposedBy: NO_PERSON,
  decidedBy: null,
  publishedAt: null,
  publishedBy: null,
  statusHistory: [],
});

/**
 * ⚠️ **EXPORTED FOR ONE READER — `actInstantCoherence.test.ts`'S CORPUS
 * BINDING — AND THE REASON IS A PROPERTY OF THIS FAMILY RATHER THAN A
 * CONVENIENCE.** That gate binds every anchored family to the rows its shift
 * produced, and every other family can hand it an exported fixture array.
 * **`psl` cannot: ruling (h) retired the fixture and the store seeds `[]`, so
 * at module load this family has no rows at all.** What the shift actually
 * moved is THIS array, so this is what the gate is given, and the gate reads
 * only the two fields it names — which are the only two that carry anything.
 */
export const PSL_ANCHORED_VALIDITY: readonly PslListing[] = shiftFields(
  PSL_SEEDS_RAW.map((r) => validityCarrier(r.validFrom, r.validUntil)),
  'psl',
  ['validFrom', 'validUntil'],
);

/** The re-timed validity of the seed row at `index`. */
const anchoredValidity = (index: number): { from: string; until: string } => ({
  from: PSL_ANCHORED_VALIDITY[index].validFrom,
  until: PSL_ANCHORED_VALIDITY[index].validUntil,
});

/**
 * Grow the preferred supplier list.
 *
 * Idempotent on a NON-EMPTY store: re-running finds rows and skips. That is the
 * correct test here rather than a marker row — the store's empty seed is what
 * makes "is anything in it?" a complete question.
 */
export async function seedPslListings(
  commands: MockCommandService = new MockCommandService(),
): Promise<PslSeedOutcome> {
  if (pslStore.all().length > 0) {
    return { status: 'already-seeded', listingIds: pslStore.all().map((r) => r.id) };
  }

  const minted: string[] = [];
  let index = -1;
  const refuse = (row: PslSeedRow, result: CommandResult): PslSeedOutcome => ({
    status: 'refused',
    listingIds: minted,
    refusedAt: row.intent,
    reason: result.reason,
  });

  for (const row of PSL_SEEDS_RAW) {
    index += 1;
    const validity = anchoredValidity(index);
    // ⚠️ A row whose walk needs a decision reason and omits one is REFUSED
    // here rather than given an invented one. `requiredFields` cannot say
    // "required when", and a seed that manufactured the sentence would be
    // authoring the ledger entry the verb exists to collect.
    if (row.walk !== 'propose' && !row.decideReason) {
      return {
        status: 'refused',
        listingIds: minted,
        refusedAt: row.intent,
        reason: 'the seed row states a walk past Proposed and no decideReason',
      };
    }

    const proposed = await commands.dispatch(PROCUREMENT_SCOPE, {
      transitionId: 't_psl_propose',
      entity: 'psl',
      payload: {
        supplierId: row.supplierId,
        materialCodes: [...row.materialCodes],
        status: row.status,
        validFrom: validity.from,
        validUntil: validity.until,
        justification: row.justification,
        evidenceRefs: [...row.evidenceRefs],
        reason: row.proposeReason,
      },
    });
    if (proposed.status === 'failed' || !proposed.entityId) return refuse(row, proposed);
    const id = proposed.entityId;
    minted.push(id);

    if (row.walk === 'propose') continue;

    if (row.walk === 'reject') {
      const rejected = await commands.dispatch(COMPLIANCE_SCOPE, {
        transitionId: 't_psl_reject',
        entity: 'psl',
        entityId: id,
        payload: { reason: row.decideReason },
      });
      if (rejected.status === 'failed') return refuse(row, rejected);
      continue;
    }

    const granted = await commands.dispatch(COMPLIANCE_SCOPE, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: id,
      payload: { reason: row.decideReason },
    });
    if (granted.status === 'failed') return refuse(row, granted);

    // The cap override is its OWN act with its own decider, which is why it
    // runs after the grant and under the lane that holds `psl:cap-set`.
    if (row.capOverride) {
      const capped = await commands.dispatch(COMPLIANCE_SCOPE, {
        transitionId: 't_psl_cap_override',
        entity: 'psl',
        entityId: id,
        payload: {
          capDaysOverride: row.capOverride.days,
          capJustification: row.capOverride.justification,
        },
      });
      if (capped.status === 'failed') return refuse(row, capped);
    }

    // ⚠️ PUBLISH BEFORE WITHDRAW, AND THE ORDER IS THE RULING RATHER THAN A
    // convenience: R5(b) says publication is never undone, so the only way a
    // supplier can hold a withdrawn designation is to have been told about it
    // FIRST. Withdrawing then publishing would announce a designation that had
    // already stopped, which is a different and dishonest sequence.
    if (WALKS_THAT_PUBLISH.includes(row.walk)) {
      const published = await commands.dispatch(PROCUREMENT_SCOPE, {
        transitionId: 't_psl_publish',
        entity: 'psl',
        entityId: id,
        payload: {},
      });
      if (published.status === 'failed') return refuse(row, published);
    }

    if (WALKS_THAT_WITHDRAW.includes(row.walk)) {
      const withdrawn = await commands.dispatch(COMPLIANCE_SCOPE, {
        transitionId: 't_psl_withdraw',
        entity: 'psl',
        entityId: id,
        payload: { reason: row.withdrawReason ?? row.decideReason },
      });
      if (withdrawn.status === 'failed') return refuse(row, withdrawn);
    }
  }

  return { status: 'seeded', listingIds: minted };
}
