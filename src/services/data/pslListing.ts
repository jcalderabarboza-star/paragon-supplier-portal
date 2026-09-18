// ─────────────────────────────────────────────────────────────────────────────
// THE PREFERRED SUPPLIER LIST — P1 · THE RECORD.
//
// A `PslListing` is a GOVERNANCE DECISION about one supplier at one scope: this
// supplier is pre-qualified to be bought from, on these terms, until this date.
// It is MASTER DATA the portal owns. It is NOT the supplier roster — the roster
// is identity carried from S/4 (`types/supplier.types.ts`), one row per company;
// a supplier may hold SEVERAL listings and most hold none.
//
// ── ⚠️ WHAT THIS FILE IS NOT, STATED FIRST BECAUSE IT IS WHAT A READER ASSUMES
//   **P1 IS READ-ONLY DATA PLUS SURFACES. THERE IS NO VERB HERE.** No flow, no
//   `CommandTarget`, no transition, no store that writes. A listing is authored
//   in the fixture and read; `t_psl_propose` / `_grant` / `_withdraw` /
//   `_publish` and the cap-setting verb are P3. Nothing below may be written by
//   a caller, which is why every field is `readonly`.
//
// ── THE SCOPE UNION — AND ONLY ONE MEMBER HAS A PRODUCER ────────────────────
//   ⚠️ **`kind: 'material'` IS THE ONLY MEMBER P1 SHIPS.** `'group'` and
//   `'category'` exist in the type with NO producer, NO fixture row and NO
//   surface arm that can be reached. They are declared now because the grain is
//   the one decision a master-data record cannot change later without a
//   migration, and because a discriminated union costs nothing to widen and
//   everything to retrofit. **A reader must not infer from their presence that
//   a group- or category-scoped listing is expressible today: it is not.**
//
//   The grain is `supplierId × materialCode[]`, and it was chosen by
//   measurement rather than by taste. The tree holds FOUR incompatible
//   vocabularies on the "category" axis — `Supplier.category` (4 values, one
//   per supplier), `RFQCategory` (6), `ComplianceRegistryEntry.materialCategory`
//   (6, differently spelled) and `MaterialMaster.materialGroup` (9) — and the
//   RFQ page's map between the first two is NOT injective: `Emulsifiers` and
//   `Botanical` both resolve to exactly `['Raw Material']`, so a category-grained
//   listing cannot tell an emulsifier from a botanical. `materialCode` is the
//   one key C9 §3 makes contractually opaque, and it is the grain
//   `ComplianceRegistryEntry` already uses — which is what makes a listing and a
//   halal certificate comparable at all.
//
// ── ⚠️ STATED LIMITS. THESE ARE NOT TODO ITEMS; THEY ARE WHAT P1 REFUSES ────
//   1. **INDIRECT MATERIALS AND SERVICES ARE OUT OF SCOPE AND P1 DOES NOT
//      PRETEND OTHERWISE.** The policy names them; `MATERIAL_MASTER` holds 42
//      DIRECT codes and nothing else, so a listing for a service has no code to
//      name. That is an OPEN OPERATOR DECISION, not an omission to be patched
//      by widening `materialCodes` to free text — free text here would be the
//      second vocabulary this record exists to avoid.
//   2. **THE CONTRACT-TERM EXCEPTION IS NOT BUILDABLE AND IS NOT BUILT.** The
//      policy says validity is capped *or the signed contract term if longer*.
//      `Contract` (`data/mockContracts.ts`) carries `supplierId`, `type` and
//      `category` and **no material codes** — so nothing can say WHICH contract
//      covers WHICH listed material. Contracts are an S/4 fact the portal does
//      not mint. There is deliberately **no `contractId` field below**: an
//      operator-typed contract id would be a CLAIM wearing a fact's clothes,
//      and the cap would then be bounded by an unverifiable string.
//   3. **THE CEILING'S VALUE AWAITS A RULING** — see `PSL_CAP_CEILING_DAYS` in
//      `pslProjection.ts`. The design does not depend on the number.
//
// ── LAW 0.5 — NO COMPUTED CLOCK STATE IS STORED ─────────────────────────────
//   `validFrom` and `validUntil` are AUTHORED dates. Everything clock-relative
//   — in force, expiring, expired, days remaining, the effective end date after
//   the cap — is computed at read by `pslProjection.ts` from `(row, nowIso)`.
//   There is no `daysRemaining`, no `isExpired`, no `status: 'Expired'`. The
//   corpses that prove this is not theoretical are in the tree:
//   `buyerCompliance.ts` c-006/c-008 stored `daysRemaining: 873`, last true on
//   2025-04-11.
//
// ── ⚠️ PUBLICATION IS A SEPARATE AXIS FROM EVERYTHING ELSE ──────────────────
//   Operator ruling: a listing is INTERNAL until the team deliberately
//   PUBLISHES it, and only then may the supplier see it. Publication is an
//   explicit act, **never a side effect of granting or changing a status.**
//
//   It is recorded as `publishedAt` + `publishedBy`, NOT as a `lifecycle`
//   member, and the reason is that a lifecycle member would CONFLATE the two
//   axes at the type level: a listing must be able to be published AND expired,
//   or in force AND unpublished, and a union cannot hold both at once. The
//   shape copies `SupplierDocument`'s refusal triple
//   (`rejectionReason`/`rejectedAt`/`rejectedBy`) — an optional fact recorded
//   BESIDE a status, whose members travel together or not at all.
//
//   **`publishedAt === null` IS "UNPUBLISHED", AND IT IS DECIDED WITHOUT A
//   CLOCK.** Null or not-null is the whole test; no date comparison, no
//   projection, no `now`. That is deliberate — a publication state that needed
//   the clock to be read would be a computed state on a stored field, which is
//   the thing law 0.5 forbids.
//
//   ⚠️ **AND NO SUPPLIER-FACING READ EXISTS IN P1, PUBLISHED OR NOT.** The
//   publish VERB is P3 and the supplier VIEW is P4. `pslNoSupplierRead.test.ts`
//   asserts the absence, which is what makes P4 safe to build later.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';

// ─── The vocabulary ──────────────────────────────────────────────────────────

/**
 * THE THREE DESIGNATIONS, ORDERED BY HOW MUCH COMPETITION THEY SUSPEND.
 *
 * ⚠️ **THE ORDER IS THE DATA, NOT A COMMENT.** `bestPslStatus` reads this array
 * rather than a second ladder, so the ranking and the vocabulary cannot drift.
 * Declaration order is MOST restrictive first.
 *
 *   Sole Source — no suitable alternative exists. No competitive bidding.
 *   Mandatory   — must be used over other suppliers. No competitive bidding.
 *   Validated   — pre-qualified AND STILL COMPETES. Bidding stays mandatory.
 */
export const PSL_STATUSES = Object.freeze([
  'Sole Source',
  'Mandatory',
  'Validated',
] as const);

export type PslStatus = (typeof PSL_STATUSES)[number];

export function isPslStatus(value: string): value is PslStatus {
  return (PSL_STATUSES as readonly string[]).includes(value);
}

/**
 * THE STORED TRANSITION-STATE. Every member is entered by a HUMAN ACT; not one
 * is entered by the clock, which is why `Expired` is absent — it is a
 * projection (`pslProjection.ts`), never a state.
 *
 * Mirrors `SupplierApplicationStatus`'s shape, which is the nearest governed
 * review lane the tree already ships.
 */
export const PSL_LIFECYCLES = Object.freeze([
  'Proposed',
  'Listed',
  'Withdrawn',
  'Rejected',
] as const);

export type PslLifecycle = (typeof PSL_LIFECYCLES)[number];

/**
 * The lifecycles a clock may act on. A listing that was withdrawn or refused is
 * not "expired" — it never ran out, it was stopped — and a `Proposed` listing
 * has not started. The `CONTRACT_LIVE_STATES` discipline: a clock may only
 * retire something that is still running.
 */
export const PSL_IN_FORCE_LIFECYCLES: readonly PslLifecycle[] = Object.freeze([
  'Listed',
]);

// ─── The scope ───────────────────────────────────────────────────────────────

/**
 * WHAT A LISTING COVERS.
 *
 * ⚠️ Only `'material'` has a producer in P1 — see the header. The other two
 * members are declared for the grain's sake and are unreachable today.
 */
export type PslScope =
  | {
      /** The one shipped member. Codes are `MATERIAL_MASTER` keys.
       *
       * ⚠️ **NAMED `materialCodes`, NOT `codes`, AND THE NAME IS LOAD-BEARING.**
       * It is the SAME key `ComplianceRegistryEntry` uses for the same thing, so
       * the two are one vocabulary rather than two that happen to agree — which
       * was the whole argument for choosing this grain. It is also what
       * `materialIdentity`'s derived census reads: a generic `codes` would have
       * widened that set with a fifth identity field name for no gain, and the
       * census caught it the day it was typed. */
      readonly kind: 'material';
      readonly materialCodes: readonly string[];
    }
  | {
      /** NO PRODUCER IN P1. A `MaterialMaster.materialGroup` (`MG-nn`). */
      readonly kind: 'group';
      readonly group: string;
    }
  | {
      /** NO PRODUCER IN P1. Deliberately not typed to any of the four
       *  incompatible category vocabularies — picking one here would elect a
       *  winner a ruling has not made. */
      readonly kind: 'category';
      readonly category: string;
    };

// ─── History ─────────────────────────────────────────────────────────────────

/**
 * ONE entry in the append-only status ledger.
 *
 * Follows `t_enforcement_set`'s shape: the ledger only ever grows, `at` is
 * STORE-ASSIGNED and never a payload field (a caller that could set it could
 * backdate its own audit entry — the `pinnedAt` / `setAt` discipline), and the
 * actor is an `ActorAttribution` rather than a name.
 */
export interface PslStatusChange {
  /** Store-assigned. Never a payload field. */
  readonly at: string;
  /** `null` on the first entry — there was no prior designation. */
  readonly from: PslStatus | null;
  readonly to: PslStatus;
  readonly lifecycle: PslLifecycle;
  /** Why. A silent change of designation is forbidden — `CommandDecision`'s
   *  own rule, one layer down (*"a silent override is forbidden"*). */
  readonly reason: string;
  readonly by: ActorAttribution;
}

// ─── The record ──────────────────────────────────────────────────────────────

export interface PslListing {
  /** Store-assigned. `SupplierApplication.id`'s rule: the store mints identity,
   *  never the caller. */
  readonly id: string;
  /** The roster FK. Same key `ComplianceRegistryEntry.supplierId` uses. */
  readonly supplierId: string;
  readonly scope: PslScope;
  readonly status: PslStatus;
  readonly lifecycle: PslLifecycle;

  /** Authored. The day the designation takes effect. */
  readonly validFrom: string;
  /** Authored. The day the designation was granted until — BEFORE the cap.
   *  ⚠️ This is NOT what a reader sees: `effectiveValidUntil` bounds it by the
   *  cap, and the projection is what a surface renders. */
  readonly validUntil: string;

  /**
   * ⚠️ **THE FOUR CAP FIELDS TRAVEL TOGETHER OR NOT AT ALL.** An override with
   * no justification is an unexplained exception; a justification with no
   * decider is an exception nobody owns; a decider with no timestamp is an
   * approval with no date. `pslListings.fixture.test.ts` asserts the
   * co-presence in BOTH directions, so a later row cannot seed half of one —
   * the `SupplierDocument` refusal-triple discipline, at four.
   *
   * All four `null` = no override; the portal default applies.
   */
  readonly capDaysOverride: number | null;
  readonly capJustification: string | null;
  readonly capDecidedBy: ActorAttribution | null;
  /** Store-assigned when the override is recorded. Never a payload field. */
  readonly capDecidedAt: string | null;

  /** Why this supplier holds this designation for this scope. Free prose. */
  readonly justification: string;

  /**
   * `SupplierDocument` ids backing the qualification — the tree's nearest
   * existing "validated" concept (`status: 'Valid'`).
   *
   * ⚠️ **A REFERENCE TO A CLAIM, NOT TO AN ARTEFACT.** `SupplierDocument`'s own
   * header is explicit: *"WHAT A SUPPLIER STATES ABOUT A CERTIFICATE — AND THE
   * WORD IS STATES, NOT UPLOADS. No file crosses this boundary."* A listing
   * that cited these as evidence of a *document* would overstate what the tree
   * holds.
   */
  readonly evidenceRefs: readonly string[];

  /** Who proposed it. ⚠️ `ActorAttribution`, NEVER `string` — the type is what
   *  forces a surface to RENDER the unattributed reason instead of printing a
   *  name it does not have (`SupplierDocument.rejectedBy`'s rule). Four-eyes
   *  (proposer ≠ decider) is UNBUILDABLE today for exactly that reason: every
   *  actor in this tree is `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so there are
   *  no two values to compare. Typing these as `string` now would make the
   *  check a migration later instead of a one-line predicate. */
  readonly proposedBy: ActorAttribution;
  /** `null` while `Proposed`. */
  readonly decidedBy: ActorAttribution | null;

  /**
   * ⚠️ **THE PUBLICATION AXIS — INDEPENDENT OF LIFECYCLE AND OF THE CLOCK.**
   * `null` = internal to the buyer team. Non-null = published to the supplier.
   * Read the header: this is deliberately a field pair rather than a lifecycle
   * member, so "published and expired" and "in force and unpublished" are both
   * expressible. `publishedAt` is STORE-ASSIGNED; `publishedBy` is an
   * `ActorAttribution`. Neither is ever a payload field.
   *
   * Nothing in P1 acts on this and no supplier surface reads it. It is stored
   * now so that adding the verb (P3) and the view (P4) is not a migration.
   */
  readonly publishedAt: string | null;
  readonly publishedBy: ActorAttribution | null;

  /** Append-only. Oldest first. */
  readonly statusHistory: readonly PslStatusChange[];
}

/** Is this listing's lifecycle one a clock may act on? */
export function isInForceLifecycle(lifecycle: PslLifecycle): boolean {
  return PSL_IN_FORCE_LIFECYCLES.includes(lifecycle);
}

/**
 * Is this listing PUBLISHED to its supplier?
 *
 * ⚠️ **NO CLOCK. NO PROJECTION.** Null or not-null, and nothing else — see the
 * header for why publication must be decidable without an instant.
 */
export function isPublished(row: Pick<PslListing, 'publishedAt'>): boolean {
  return row.publishedAt !== null;
}
