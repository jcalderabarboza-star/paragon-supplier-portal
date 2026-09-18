// ─────────────────────────────────────────────────────────────────────────────
// THE SOURCING GATE'S DECISION — pure, synchronous, store-free, clock-free.
//
// P1 shipped the PSL record, its projection and `pslSourcingSeam`. This module
// is what P2 adds on top: the three decisions a sourcing policy hook needs, as
// pure functions over structural inputs. The HOOKS live in
// `services/transitions/policies.ts` and do nothing but call these and translate
// the answer into a `PolicyDecision`.
//
// ── ⚠️ WHY THE DECISION IS NOT INSIDE THE HOOK ──────────────────────────────
//   **`PolicyDecision` IS `{ ok, reason? }` AND THE DISPATCHER READS `reason`
//   ONLY WHEN `ok` IS FALSE** (`dispatcher.ts` — `if (!decision.ok)`). So a hook
//   can refuse with a sentence and can ALLOW WITH NOTHING. The operator's
//   ruling needs an allowance that carries a note — *exactly two invitees is
//   legal, and the buyer should be told three is the standard* — and that note
//   cannot travel through the hook at all.
//
//   The remedy is the one this tree already uses for the FX pin: ONE expression
//   of the rule, two readers. `handlePinConfirm` disables its own button on the
//   refusal `rfq_fx_pin_well_formed` will give, and says so at the site — *"the
//   dialog's own button is already disabled on a refusal; this is the structural
//   twin, so a keyboard or a future caller cannot route around it."* Here the
//   hook asks `UNDER_FLOOR` and the wizard asks `AT_FLOOR`, off the same call.
//
// ── ⚠️ THE INSTANT IS A PARAMETER, ALL THE WAY DOWN ─────────────────────────
//   Nothing here reads a clock. `PolicyHookFn`'s ctx carries no instant (derived:
//   its six members are `entityId`, `currentState`, `toState`, `payload`,
//   `target`, `scope`), so the hook supplies `DECLARED_PRESENT` and every
//   function below takes it as an argument. A gate must be able to answer "as of
//   when?", and `pslReadIsClockIndependent.test.ts` holds the whole PSL lane —
//   this module included — to that by source scan AND by behaviour.
//
// ── ⚠️ PUBLICATION IS NEVER READ ────────────────────────────────────────────
//   Carried from P1 unchanged and re-pinned AT THE HOOK rather than only at the
//   seam: being IN FORCE decides what a listing grants; being PUBLISHED decides
//   who may see it. An unpublished-but-in-force Sole Source listing must still
//   suspend competitive bidding, or a governance outcome would depend on whether
//   anybody had pressed publish.
//
// ── ⚠️ WHAT THIS GATE DOES NOT DO, STATED RATHER THAN IMPLIED ───────────────
//   **THERE IS NO VALUE THRESHOLD, SO EVERY NON-EXEMPT EVENT REQUIRES
//   COMPETITION REGARDLESS OF VALUE.** The policy names a PASS threshold above
//   which bidding is mandatory; no such number exists anywhere in this tree
//   (`approvalLevel` is authored text — `types.ts`, guarded by
//   `approvalBandAuthored.guard.test.ts`) and P2 does not invent one. A floor
//   invented here would be a number nobody ruled on, applied to every event.
// ─────────────────────────────────────────────────────────────────────────────

import { mockSuppliers } from '../../data/mockSuppliers';
import { SupplierStatus } from '../../types/supplier.types';
import { quotationStore } from './mock/stores/quotationStore';
import { PSL_LISTINGS } from './mock/fixtures/pslListings';
import { pslStatusFor, suspendsCompetitiveBidding } from './pslSourcingSeam';
import type { PslListing } from './pslListing';
import type { PslStatus } from './pslProjection';

// ── THE TWO CONSTANTS ───────────────────────────────────────────────────────

/**
 * FEWER THAN THIS MANY ELIGIBLE INVITEES IS NOT A COMPETITIVE EVENT.
 *
 * Operator ruling (PSL P2): *"fewer than 2 → REFUSE the event; exactly 2 →
 * ALLOW, with a visible note that three is the standard; 3 or more → allow,
 * silently."*
 *
 * ⚠️ **THIS IS THE ONLY NUMBER THE HOOK MAY READ, AND THE TARGET BELOW IS THE
 * ONLY NUMBER THE SURFACE MAY READ.** Keeping them apart is what stops the
 * floor quietly becoming three — a refusal at three would turn a STANDARD into
 * a BAR, which is the opposite of what was ruled, and one shared constant is
 * how that happens by accident. `rfqSourcingGate.test.ts` pins both directions.
 */
export const COMPETITION_FLOOR_INVITEES = 2;

/**
 * THE STANDARD A BUYER IS HELD TO — NOT A BAR THEY MUST CLEAR.
 *
 * Operator ruling (PSL P2): three invitees is the standard, and an event at the
 * floor is ALLOWED with a note saying so. Read by the surface only; a hook that
 * read this would be refusing the ruling.
 */
export const COMPETITION_TARGET_INVITEES = 3;

/**
 * THE INVITEE STATUSES A PUBLISH REFUSES — **DERIVED FROM `SupplierStatus`,
 * never hand-listed**, so a fourth member of that enum arrives here as a
 * decision somebody has to make rather than as a silent omission.
 *
 * ⚠️ **MEMBERSHIP IS `Suspended` ONLY, AND THAT CONTRADICTS THE LEAN IT WAS
 * DISPATCHED WITH — BECAUSE THE CORPUS CONTRADICTS IT.** The ruling's stated
 * ground was *"inviting a supplier who cannot yet transact wastes their bid"*.
 * Measured against the tree: an `Onboarding` supplier CAN transact and DOES —
 * `sup-010` and `sup-011` hold three quotations between them (`qt-001c` and
 * `qt-003c` are `Under Review`, i.e. a buyer is evaluating their bids right
 * now; `qt-006b` was `Rejected` on an awarded event). `Suspended` holds ZERO.
 * So the premise is false for exactly one of the two members, and refusing
 * `Onboarding` would refuse events this platform currently presents as
 * legitimate in-flight sourcing.
 *
 * `Onboarding` is also, by its name, the state a supplier occupies WHILE being
 * brought on board; inviting them to bid is part of that, not a violation of it.
 *
 * **Flipping this is one line plus a red test that names what changes** — the
 * spec pins `Onboarding`'s absence together with the quotation evidence, so the
 * other reading cannot be adopted silently in either direction.
 */
export const INELIGIBLE_INVITEE_STATUSES: readonly SupplierStatus[] = Object.freeze(
  Object.values(SupplierStatus).filter((s) => s === SupplierStatus.SUSPENDED),
);

/** Does this status stop a supplier being invited to a sourcing event? */
export function isIneligibleInvitee(status: SupplierStatus | null | undefined): boolean {
  return status != null && INELIGIBLE_INVITEE_STATUSES.includes(status);
}

// ── THE REFUSAL VOCABULARY ──────────────────────────────────────────────────

/**
 * THE CLOSED SET OF SOURCING REFUSALS. Glossary-registered (EN + ID) exactly as
 * `HalalNotSatisfiedReason` is, so each refusal has a definition a reader can
 * reach rather than a code assembled at a call site (`HALAL-REFUSAL-DEAD-ENDS-01`).
 *
 * ⚠️ **NOTE WHAT IS ABSENT: THERE IS NO `UNDECIDABLE` MEMBER.** An undecidable
 * material question blocks the EXEMPTION, never the event (operator ruling), so
 * it is not a refusal and must not be expressible as one. That is enforced by
 * this union rather than by a comment: `PslExemption`'s `UNDECIDABLE` arm has no
 * refusal to map onto.
 */
export type SourcingRefusalReason =
  | 'INVITEE_NOT_ELIGIBLE'
  | 'COMPETITION_UNDER_FLOOR'
  | 'AWARDEE_NOT_INVITED'
  | 'AWARDEE_NOT_THE_QUOTING_SUPPLIER';

// ── ELIGIBILITY ─────────────────────────────────────────────────────────────

/** One invitee a publish refuses, with the status that refuses it. Named, so a
 *  refusal can say WHO and WHY rather than that something was wrong. */
export interface IneligibleInvitee {
  readonly supplierId: string;
  readonly status: SupplierStatus;
}

export type EligibilityVerdict =
  | { readonly kind: 'ALL_ELIGIBLE'; readonly eligible: readonly string[] }
  | {
      readonly kind: 'INELIGIBLE_INVITEES';
      readonly offenders: readonly IneligibleInvitee[];
      readonly eligible: readonly string[];
    };

/**
 * Which invitees may be invited at all.
 *
 * `statusOf` returns `null` for an id the roster does not hold. **An UNKNOWN
 * supplier is NOT refused here** — it is not eligible either, so it is simply
 * absent from `eligible` and therefore does not count toward the floor. Refusing
 * it would make this hook an existence oracle for the roster, which is the
 * `readScopeOwner` lesson (§86) one seam over; letting it COUNT would let a
 * typo manufacture competition.
 */
export function eligibleInvitees(
  invitedSupplierIds: readonly string[],
  statusOf: (supplierId: string) => SupplierStatus | null,
): EligibilityVerdict {
  const offenders: IneligibleInvitee[] = [];
  const eligible: string[] = [];
  for (const supplierId of invitedSupplierIds) {
    const status = statusOf(supplierId);
    if (status === null) continue; // unknown: neither refused nor counted
    if (isIneligibleInvitee(status)) offenders.push({ supplierId, status });
    else eligible.push(supplierId);
  }
  if (offenders.length > 0) return { kind: 'INELIGIBLE_INVITEES', offenders, eligible };
  return { kind: 'ALL_ELIGIBLE', eligible };
}

// ── THE PSL EXEMPTION ───────────────────────────────────────────────────────

export type PslExemption =
  /** An in-force Mandatory or Sole Source listing removes the need to compete.
   *  Carries the supplier, the designation AND the material that produced it —
   *  an exemption that cannot name its own material cannot be constructed. */
  | {
      readonly kind: 'EXEMPT';
      readonly supplierId: string;
      readonly status: PslStatus;
      readonly materialCode: string;
    }
  /** Nothing in force exempts this event. The ordinary answer. */
  | { readonly kind: 'NOT_EXEMPT' }
  /** The event's materials are not codes this build can look a listing up by,
   *  so the question could not be asked. **Blocks the exemption, not the
   *  event.** */
  | {
      readonly kind: 'UNDECIDABLE';
      readonly because: 'UNMAPPED_MATERIAL';
      readonly codes: readonly string[];
    };

/**
 * ⚠️ **RULING 1 — ANY-SUFFICES.** If ANY invited supplier holds an in-force
 * `Mandatory` or `Sole Source` listing for ANY material on the event,
 * competition is not required.
 *
 * **THE REASON, recorded at the site: the policy designates SUPPLIERS, NOT
 * BASKETS.** All-must-be-covered was the alternative and it makes the exemption
 * unreachable on any mixed event — a two-material RFQ where one material has a
 * sole source and the other has none would still have to be competed, which
 * turns a rule about supplier designation into a rule about basket composition.
 *
 * **THE COST, recorded with equal weight: one Sole Source line can exempt a
 * basket of otherwise competitive materials.** That is a real consequence of
 * the ruling and not an implementation detail, so it is written where the rule
 * is rather than in a report nobody reads twice. `rfqSourcingGate.test.ts`
 * carries the counterfactual — the same row under all-must-be-covered gives the
 * OPPOSITE verdict — so the ruling is probed rather than merely obeyed.
 *
 * ⚠️ **AND `UNDECIDABLE` NEVER GRANTS.** An unmapped material yields the third
 * arm, which no refusal maps onto and which the caller treats as "not exempt"
 * for the purpose of competing. A material code this build cannot resolve must
 * never silently widen a grant — the same rule `pslStatusFor` applies to a
 * `group`/`category` scope it has no producer for.
 */
export function pslExemptionFor(
  invitedSupplierIds: readonly string[],
  materialCodes: readonly string[],
  nowIso: string,
  listings: readonly PslListing[] = PSL_LISTINGS,
): PslExemption {
  const known = new Set(listings.flatMap((l) => scopeCodesOf(l)));
  const unmapped = materialCodes.filter((c) => !known.has(c));

  for (const materialCode of materialCodes) {
    for (const supplierId of invitedSupplierIds) {
      const standing = pslStatusFor(supplierId, { materialCode }, nowIso, listings);
      if (suspendsCompetitiveBidding(standing) && standing.kind === 'IN_FORCE') {
        return { kind: 'EXEMPT', supplierId, status: standing.status, materialCode };
      }
    }
  }
  // Only AFTER no exemption was found does an unmapped code matter: a mixed
  // event whose mapped half already exempts is decided, and reporting it
  // undecidable would ask the buyer about a code that changed nothing.
  if (unmapped.length === materialCodes.length && materialCodes.length > 0) {
    return { kind: 'UNDECIDABLE', because: 'UNMAPPED_MATERIAL', codes: unmapped };
  }
  return { kind: 'NOT_EXEMPT' };
}

/** A listing's own codes, without importing the projection's whole surface. */
function scopeCodesOf(listing: PslListing): readonly string[] {
  return listing.scope.kind === 'material' ? listing.scope.materialCodes : [];
}

// ── COMPETITION ─────────────────────────────────────────────────────────────

export type CompetitionVerdict =
  /** An in-force designation removes the event. */
  | { readonly kind: 'NOT_REQUIRED'; readonly exemption: Extract<PslExemption, { kind: 'EXEMPT' }> }
  /** At or above the target. Nothing is rendered and nothing is refused. */
  | { readonly kind: 'SATISFIED'; readonly eligible: number }
  /** Exactly at the floor. **AN ALLOWANCE WITH A NOTE, NEVER A REFUSAL.** */
  | { readonly kind: 'AT_FLOOR'; readonly eligible: number }
  /** Below the floor. The one arm the hook refuses on. */
  | { readonly kind: 'UNDER_FLOOR'; readonly eligible: number };

/**
 * ⚠️ **THE COUNT IS TAKEN OVER *ELIGIBLE* INVITEES, AND THE ORDERING IS
 * STRUCTURAL RATHER THAN CONVENTIONAL.** This function has no access to the raw
 * invitee list — it takes a number that `eligibleInvitees` produced — so an
 * ineligible invitee CANNOT count toward the floor by construction. Operator
 * ruling: the eligibility hook runs first and the count is taken over eligible
 * invitees.
 *
 * Writing it the other way (pass the invitee list, filter inside) would leave
 * the ordering as a habit two callers have to keep. `rfqSourcingGate.test.ts`
 * pins it, and probes (i) and (j) fire at the two ways it could be broken.
 */
export function competitionVerdict(
  eligibleCount: number,
  exemption: PslExemption,
): CompetitionVerdict {
  if (exemption.kind === 'EXEMPT') return { kind: 'NOT_REQUIRED', exemption };
  if (eligibleCount < COMPETITION_FLOOR_INVITEES) return { kind: 'UNDER_FLOOR', eligible: eligibleCount };
  if (eligibleCount < COMPETITION_TARGET_INVITEES) return { kind: 'AT_FLOOR', eligible: eligibleCount };
  return { kind: 'SATISFIED', eligible: eligibleCount };
}

// ── THE ONE CALL A SURFACE AND A HOOK SHARE ─────────────────────────────────

/** What a publish decision needs to know about the event. Structural, so the
 *  wizard's DRAFT and the store's RFQ both satisfy it — which is what makes the
 *  step-1 mirror the same computation and not a second opinion. */
export interface SourcingEventInput {
  readonly invitedSupplierIds: readonly string[];
  readonly materialIds: readonly string[];
}

export interface SourcingDecision {
  readonly eligibility: EligibilityVerdict;
  readonly exemption: PslExemption;
  readonly competition: CompetitionVerdict;
}

/**
 * THE WHOLE PUBLISH DECISION, in the order the hooks run it.
 *
 * Eligibility first (ruling 2), then the exemption, then the count over what
 * eligibility left. Returning all three rather than a single verdict is what
 * lets the two hooks refuse on their own grounds while the surface renders the
 * allowance note off the same call.
 */
export function decideSourcing(
  event: SourcingEventInput,
  nowIso: string,
  statusOf: (supplierId: string) => SupplierStatus | null,
  listings: readonly PslListing[] = PSL_LISTINGS,
): SourcingDecision {
  const eligibility = eligibleInvitees(event.invitedSupplierIds, statusOf);
  const exemption = pslExemptionFor(eligibility.eligible, event.materialIds, nowIso, listings);
  return {
    eligibility,
    exemption,
    competition: competitionVerdict(eligibility.eligible.length, exemption),
  };
}

// ── AWARDEE INTEGRITY ───────────────────────────────────────────────────────

export type AwardIntegrityVerdict =
  | { readonly kind: 'OK' }
  | { readonly kind: 'AWARDEE_NOT_INVITED'; readonly supplierId: string }
  | {
      readonly kind: 'AWARDEE_NOT_THE_QUOTING_SUPPLIER';
      readonly supplierId: string;
      readonly quotingSupplierId: string;
      readonly quotationId: string;
    };

/**
 * ⚠️ **THE AWARD HOLE IS WORSE THAN "THE AWARDEE WAS NEVER INVITED", AND THIS
 * CHECKS THE STRONGER THING.**
 *
 * `t_rfq_award.requiredFields` is `['awardedQuotationId', 'awardedSupplierId']`
 * and the target writes each **independently from the payload** with no
 * cross-check (`MockCommandService.ts` — `awardedQuotationId: typeof
 * payload.awardedQuotationId === 'string' ? … ` and the same shape one line
 * below). So a dispatch can record supplier A as the awardee of supplier B's
 * quotation, and nothing in the machine notices.
 *
 * ⚠️ **AND THE WEAKER CHECK IS VACUOUS AGAINST THIS CORPUS, WHICH IS WHY IT IS
 * NOT THE CHECK.** Derived: 0 of 25 seeded quotations belong to an uninvited
 * supplier, and the quotation target's own `creationOwner` resolves through
 * `rfq.invitedSupplierIds.includes(sid)` — so an uninvited supplier cannot even
 * RAISE a quotation. A test for "awardee not invited" can therefore never be
 * reached from a fixture; it is reachable only through a hand-crafted dispatch,
 * and both arms below are probed that way.
 *
 * `quotationOwner` returns `null` for an id nothing holds. That is reported as
 * `AWARDEE_NOT_THE_QUOTING_SUPPLIER` with an empty quoting id rather than as a
 * silent pass: an award naming a quotation that does not exist is not an award.
 */
export function awardIntegrity(
  input: {
    readonly invitedSupplierIds: readonly string[];
    readonly awardedSupplierId: string;
    readonly awardedQuotationId: string;
  },
  quotationOwner: (quotationId: string) => string | null,
): AwardIntegrityVerdict {
  const quoting = quotationOwner(input.awardedQuotationId);
  if (quoting !== input.awardedSupplierId) {
    return {
      kind: 'AWARDEE_NOT_THE_QUOTING_SUPPLIER',
      supplierId: input.awardedSupplierId,
      quotingSupplierId: quoting ?? '',
      quotationId: input.awardedQuotationId,
    };
  }
  if (!input.invitedSupplierIds.includes(input.awardedSupplierId)) {
    return { kind: 'AWARDEE_NOT_INVITED', supplierId: input.awardedSupplierId };
  }
  return { kind: 'OK' };
}

// ── THE FIXTURE-BACKED DEFAULTS A HOOK USES ─────────────────────────────────
//
// ⚠️ **THE RESOLVERS ARE HERE, NOT IN THE HOOK, AND THAT IS THE WHOLE REASON
// THIS MODULE SITS IN `services/data`.** A `PolicyHookFn` has no data service,
// no query client and no `await`, so whatever it needs must already be a
// synchronous read — and the layer that owns synchronous fixture reads is this
// one. `MockCommandService` (also under `services/data`) already value-imports
// `mockSuppliers`, so this is the existing shape rather than a new one; what
// would be new is the TRANSITIONS layer reaching for a corpus, which is exactly
// what these exports exist to prevent.
//
// Both are passed as PARAMETERS by every function above, so a test supplies its
// own and neither the roster nor the store is reachable from a spec that did
// not ask for it (`verifyHalalAtReceipt`'s shape, and `pslStatusFor`'s).

/** The governed roster's answer for one supplier, or `null` if it holds none. */
export function rosterStatusOf(supplierId: string): SupplierStatus | null {
  return mockSuppliers.find((s) => s.id === supplierId)?.status ?? null;
}

/**
 * Which supplier submitted a quotation, read from the STORE and not from the
 * fixture — a quotation raised at runtime must be checkable too, and the
 * fixture stops being the whole population the moment a supplier submits.
 */
export function quotationOwnerOf(quotationId: string): string | null {
  return quotationStore.get(quotationId)?.supplierId ?? null;
}
