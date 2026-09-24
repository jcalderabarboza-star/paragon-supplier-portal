// ────────────────────────────────────────────────────────────────────────────
// Policy-hook BINDINGS (v2.2 Step 3.4) — resolve a registered hook NAME to its
// function. `policyHooks.ts` owns the name allowlist (schema-time); this module
// binds each name to its runtime implementation, which the dispatcher resolves.
// Kept separate so flow metadata stays serialisable (names, never closures).
// ────────────────────────────────────────────────────────────────────────────

import type { PurchaseOrder, Invoice } from '../data/types';
import { RFQ_CATEGORIES, isRfqCategoryMember, type RFQ } from '../../data/mockRfqs';
import { CODE_LESS_REASONS, isCodeLessReason } from '../../data/materialCatalogReason';
import { DECLARED_PRESENT } from '../data/fixturePresent';
import {
  awardIntegrity,
  decideSourcing,
  quotationOwnerOf,
  rosterStatusOf,
  COMPETITION_FLOOR_INVITEES,
} from '../data/rfqSourcingGate';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';
import type { PolicyHookFn } from './dispatcher';
import { POLICY_HOOKS } from './policyHooks';
import { personRefusalToken } from '../identity/personLabel';
import { isSampleActor } from '../identity/sampleRoster';
import { deriveHeaderDisposition, type GrHeaderDisposition } from './grRollup';
import { isMatched } from './invoiceRollup';
import { BASE_CURRENCY, BID_CURRENCIES, isBidCurrency } from '../../lib/currencyPolicy';
import { isUsableRate } from '../../lib/fxPin';
import {
  ENFORCEMENT_MODES,
  GOVERNED_CHECK_IDS,
  MAXIMUM_RIGOUR,
  UNATTRIBUTED_REASONS,
  asActorAttribution,
  isAttributed,
  isEnforcementMode,
  isGovernedCheckId,
  isReviewDay,
  rigour,
  settingInForce,
  type ActorAttribution,
  type EnforcementSetting,
} from '../../lib/enforcement';

import {
  CUSTOM_ROLE_TEXT,
  I18N_NAMESPACE_PREFIX,
  addableAtomRefusal,
  copyableParentRefusal,
  grantableIdRefusal,
} from './customRoles';
import { SYSTEM_ROLES, type SystemRoleId } from './businessRoles';
import { catalogRoles } from './roles';
import { atomsForSeat } from './customRoles';
import { mockSuppliers } from '../../data/mockSuppliers';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import {
  isPslStatus,
  isPublished,
  PSL_STATUSES,
  type PslListing,
  type PslStatus,
} from '../data/pslListing';
import {
  effectiveCap,
  effectiveValidUntil,
  PSL_CAP_CEILING_DAYS,
} from '../data/pslProjection';
import { restrictiveDecisionVerdict } from '../data/pslLeadCheck';
import {
  APPLICATION_REQUEST_TYPES,
  VENDOR_BEARING_REQUEST_TYPE,
  isApplicationRequestType,
  isApplicationDeclaration,
} from './flows/supplierApplication.flow';

const BINDINGS = new Map<string, PolicyHookFn>();

export function bindPolicyHook(name: string, fn: PolicyHookFn): void {
  BINDINGS.set(name, fn);
}

export function resolvePolicyHook(name: string): PolicyHookFn | undefined {
  return BINDINGS.get(name);
}

// — PO confirm: each confirmed line qty must be > 0 and ≤ the ordered qty, and
//   the confirmation must cover every line (count matches). ————————————————————

/**
 * The ONE expression of the per-line confirm bound — shared between the policy
 * hook below (the LAW) and the SupplierOrders surface (a courtesy mirror that
 * disables Confirm and explains the bound in the operator's language). One
 * expression, two consumers, so the mirror structurally cannot drift from the
 * policy (CP-0 · 2f-c, operator constraint). The policy remains authoritative:
 * a dispatch that bypasses the UI is still refused here, in this voice.
 *
 * `Number.isFinite` (2f-c, SE-Team spec edit): the previous
 * `typeof q !== 'number'` admitted NaN — `typeof NaN === 'number'`, and NaN
 * fails BOTH comparisons (`NaN <= 0` and `NaN > ordered` are false), so a
 * hand-crafted dispatch could stamp `confirmedQty: NaN` into the store and
 * poison `expectedValue` (Σ confirmedQty × unitPrice), the 3-way-match input.
 * The 4a-FIND-01 `num()` class, closed here because this policy is the lock
 * the 2f-c parse gate is built in front of.
 */
export const confirmedQtyWithinBounds = (q: number, ordered: number): boolean =>
  Number.isFinite(q) && q > 0 && q <= ordered;

const poConfirmQtyWithinOrdered: PolicyHookFn = ({ entityId, payload, target }) => {
  const po = target.readEntity(entityId) as PurchaseOrder | null;
  if (!po) return { ok: false, reason: 'entity missing' };
  const qtys = payload.confirmedQuantities;
  if (!Array.isArray(qtys) || qtys.length !== po.lineItems.length) {
    return { ok: false, reason: 'confirmedQuantities must cover every line' };
  }
  for (let i = 0; i < qtys.length; i++) {
    const q = qtys[i];
    const ordered = po.lineItems[i].quantity;
    if (typeof q !== 'number' || !confirmedQtyWithinBounds(q, ordered)) {
      return { ok: false, reason: `line ${i + 1}: confirmed qty out of bounds (0 < q ≤ ${ordered})` };
    }
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED, poConfirmQtyWithinOrdered);

// — GR header disposition = ROLLUP of the per-line sub-flow (census G2). Each
//   disposition verb is legal ONLY when the lines roll up to its terminal, so
//   the header is provably derived, never asserted. Reads the GR's own lines
//   (same-entity), so it binds here rather than in the cross-entity mock layer. —
const grRollup = (want: GrHeaderDisposition): PolicyHookFn => ({ entityId, target }) => {
  const gr = target.readEntity(entityId) as GoodsReceipt | null;
  if (!gr) return { ok: false, reason: 'entity missing' };
  const got = deriveHeaderDisposition(gr.inspectionResults);
  return got === want
    ? { ok: true }
    : { ok: false, reason: `line rollup is '${got}', not '${want}'` };
};

bindPolicyHook(POLICY_HOOKS.GR_ROLLUP_APPROVED, grRollup('Approved'));
bindPolicyHook(POLICY_HOOKS.GR_ROLLUP_PARTIAL, grRollup('Partially Approved'));
bindPolicyHook(POLICY_HOOKS.GR_ROLLUP_REJECTED, grRollup('Rejected'));

// — Invoice match = ROLLUP of the match sub-flow (census G2). The header advance
//   `Submitted → Matched` is legal ONLY when the invoice's match axis has rolled
//   up to a clean Matched — so the header is derived, never asserted. Reads the
//   invoice's own matchStatus (same-entity), so it binds here. ————————————————
const invoiceRollupMatched: PolicyHookFn = ({ entityId, target }) => {
  const inv = target.readEntity(entityId) as Invoice | null;
  if (!inv) return { ok: false, reason: 'entity missing' };
  return isMatched(inv)
    ? { ok: true }
    : { ok: false, reason: `match axis is '${inv.matchStatus}', not 'Matched'` };
};

bindPolicyHook(POLICY_HOOKS.INVOICE_ROLLUP_MATCHED, invoiceRollupMatched);

// — Quotation submit: the bid currency must be one the platform PERMITS
//   (CP-0 · 2e-c-2). ————————————————————————————————————————————————————————
//
// `requiredFields` proves the field is non-empty; it says nothing about what is
// IN it. Without this, 'CNY' / 'Rp' / 'usd' / 'gold' all clear the floor and get
// stored as the denomination of a real bid.
//
// Reads `payload` only — no entity exists yet on a creation verb, and the answer
// depends on nothing but the token and the policy list.
//
// It shares `isBidCurrency` with the supplier's quote form, on the
// `confirmedQtyWithinBounds` precedent (2f-c): ONE expression of the rule, two
// consumers — the policy is the LAW and refuses any dispatch that skips the UI,
// while the form is a courtesy mirror that never offers an off-list option in
// the first place. Sharing the expression is what stops the mirror from drifting
// away from the law.
//
// REFUSES BY NAME. The rejected token is quoted back verbatim and the permitted
// set is spelled out, because "invalid currency" tells a supplier neither what
// they sent nor what they may send. Deliberately NOT a coercion to the base
// currency: silently making a foreign bid domestic is the exact defect 2e-c-2
// exists to close, and doing it in the policy layer would be the same lie with
// better manners.
const quotationSubmitCurrencyPermitted: PolicyHookFn = ({ payload }) => {
  const currency = payload.currency;
  if (typeof currency !== 'string') {
    return { ok: false, reason: `currency must be a string, got ${typeof currency}` };
  }
  return isBidCurrency(currency)
    ? { ok: true }
    : {
        ok: false,
        reason: `currency '${currency}' is not permitted (${BID_CURRENCIES.join(', ')})`,
      };
};

bindPolicyHook(
  POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED,
  quotationSubmitCurrencyPermitted,
);

// — RFQ FX pin: the recorded basis must be WELL-FORMED (CP-0 · 2e-c-3) ————————
//
// An ABSENT pin is safe — the engine refuses `FX_UNPINNED` and says so. A
// MALFORMED pin is not: it is a basis a comparison would happily be ranked on,
// producing a plausible number and the wrong winner. So the gate sits here, at
// the moment the fact is recorded, rather than being re-litigated by every
// reader.
//
// Reads `payload` only — the RFQ's own state does not bear on whether a rate is
// well-formed, and a pin is legal from every state the verb is legal from.
//
// It shares `isUsableRate` and `isBidCurrency` with the scoring engine, on the
// `confirmedQtyWithinBounds` precedent: one expression of the rule, policy as
// law, engine as the reader that must never see a value this refused.
const rfqFxPinWellFormed: PolicyHookFn = ({ payload }) => {
  const quote = payload.quote;
  if (typeof quote !== 'string' || !isBidCurrency(quote)) {
    return { ok: false, reason: `quote currency '${String(quote)}' is not permitted (${BID_CURRENCIES.join(', ')})` };
  }
  // Pinning the base to itself is not a harmless no-op: it would put a rate on
  // the ledger for a currency whose rate is 1 BY DEFINITION, and any value other
  // than 1 would silently re-denominate every domestic bid on the RFQ.
  if (quote === BASE_CURRENCY) {
    return { ok: false, reason: `${BASE_CURRENCY} is the comparison base — it has no rate to pin` };
  }
  if (!isUsableRate(payload.rate)) {
    // Names the value: '0', 'NaN' and a missing rate are different mistakes.
    return { ok: false, reason: `rate must be a finite number greater than 0, got ${String(payload.rate)}` };
  }
  const asOf = payload.asOf;
  if (typeof asOf !== 'string' || !Number.isFinite(new Date(asOf).getTime())) {
    return { ok: false, reason: `asOf must be a readable date, got ${String(asOf)}` };
  }
  if (payload.source !== 'MANUAL' && payload.source !== 'SAP_EXHGRATE') {
    // Provenance is part of the fact. A pin whose source cannot be named is a
    // number nobody is accountable for.
    return { ok: false, reason: `source must be MANUAL or SAP_EXHGRATE, got ${String(payload.source)}` };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.RFQ_FX_PIN_WELL_FORMED, rfqFxPinWellFormed);

// — Enforcement set: the recorded relaxation must be GOVERNED (CP-3 · E2) ——————
//
// THE DIRECTION RULE, as the operator dispatched it: TIGHTENING IS ALWAYS
// LEGAL; LOOSENING REQUIRES `reviewBy` AND A NAMED ACTOR. Read the asymmetry
// the right way round — this is not "loosening needs paperwork", it is
//
//   THE SAFEST ACT IS ALWAYS AVAILABLE TO ANYBODY.
//
// Setting a check to full rigour needs no review date, no resolved identity and
// no argument. Everything below it does. Failing in the strict direction costs a
// blocked dock; failing in the other costs an anonymous unlock, and only one of
// those is recoverable after the goods have moved.
//
// FOUR REFUSALS, each by name:
//   1. an unrecognised MODE. Note the direction: `effectiveEnforcement` RANKS an
//      unknown mode at the ceiling (the class rule), but this verb REFUSES it.
//      Reading and writing want opposite behaviours — a stored typo must not
//      relax anything, and an authoring typo must be told, not silently
//      maximised into a block nobody asked for.
//   2. a malformed ACTOR — including a `RESOLVED` one missing either field.
//      Coercing it to UNATTRIBUTED would give every typo a legitimate-looking
//      absence to hide in.
//   3. a relaxation with NO READABLE `reviewBy`. The type already forbids it;
//      this is the runtime half, because the payload crosses a seam and a type
//      guarantee is only as strong as the authoring on the other side.
//   4. a LOOSENING by an unattributed actor.
//
// The baseline for "loosening" is the LAST RECORDED MODE, not the effective
// (possibly ratcheted) one — two reasons, and both matter. A lapse is a
// CONSEQUENCE, not a decision, so comparing against it would let the calendar
// silently re-classify an unchanged decision as a relaxation; and legality would
// then depend on WHEN the command was dispatched, which is a clock deciding a
// transition by another route. An unset check baselines at MAXIMUM_RIGOUR, so
// THE FIRST EVER SETTING BELOW FULL RIGOUR IS A LOOSENING and must be named.
const enforcementSetGoverned: PolicyHookFn = ({ entityId, payload, target, scope }) => {
  const mode = payload.mode;
  if (typeof mode !== 'string' || !isEnforcementMode(mode)) {
    return {
      ok: false,
      reason: `mode '${String(mode)}' is not an enforcement mode (${ENFORCEMENT_MODES.join(', ')})`,
    };
  }
  if (!isGovernedCheckId(entityId)) {
    // Defence in depth: `readState` already answers null for an unknown check,
    // so the dispatcher raised NOT_FOUND before this ran. Stated anyway, because
    // "the target happens to check it" is a convention and this is a rule.
    return {
      ok: false,
      reason: `'${entityId}' is not a governed check (${GOVERNED_CHECK_IDS.join(', ')})`,
    };
  }
  // ⚠️ **THE ACTOR COMES FROM THE SESSION. IT USED TO COME FROM THE PAYLOAD,
  // AND C10 §8.3 FILED THAT AGAINST US FOR AS LONG AS IT STOOD.** `setBy` was a
  // `requiredField` — *"the caller states who acted, and the platform records
  // the statement"* — which §6.2 names ATTRIBUTION BY ASSERTION. It was
  // harmless for exactly one reason: nothing could construct a `RESOLVED`
  // actor. The sample roster is what removes that reason, so the seam flips in
  // the same batch rather than after it.
  //
  // The dispatcher now refuses the `setBy` KEY outright (`ACTOR_IN_PAYLOAD`),
  // so a caller cannot reach this line with one. This reads the only source
  // that remains.
  const actor = asActorAttribution(scope.actor);
  if (!actor) {
    return {
      ok: false,
      reason:
        'the commanding scope carries no actor — a governed enforcement setting that cannot ' +
        'say who took it is not a record, and UNATTRIBUTED is available to any caller that ' +
        'has no person',
    };
  }
  if (mode !== MAXIMUM_RIGOUR && !isReviewDay(payload.reviewBy)) {
    return {
      ok: false,
      reason: `a relaxation to ${mode} requires reviewBy as a readable YYYY-MM-DD, got ${String(payload.reviewBy)}`,
    };
  }
  const ledger = target.readEntity(entityId) as readonly EnforcementSetting[] | null;
  const current = settingInForce(ledger ?? undefined, entityId);
  const baseline = current && isEnforcementMode(current.mode) ? current.mode : MAXIMUM_RIGOUR;
  // ⚠️ **THE LOOSENING GATE RUNS OPPOSITE TO EVERY FOUR-EYES CHECK IN THIS
  // FILE, AND THAT IS WHY IT NEEDED A SECOND CLAUSE WHEN THE ROSTER LANDED.**
  //
  // The four-eyes predicates make the platform STRICTER once an actor resolves:
  // a check that admitted everything starts refusing. This one runs the other
  // way. It refused every relaxation in this tree's history — and it did so
  // SOLELY because nothing could name a person, not because anything decided a
  // relaxation was wrong. A roster would therefore have OPENED it, silently, as
  // a side effect of a demo convenience, and the append-only enforcement ledger
  // would then record that a `sim-usr-*` person accepted a governance risk.
  //
  // That is C10 §6.3's MANUFACTURED PROVENANCE arriving through the front door.
  // The ledger cannot be edited, only appended over, so the original claim
  // survives whatever is written after it.
  //
  // ⚠️ **TWO CLAUSES, NOT ONE WIDENED PREDICATE, BECAUSE THEY REFUSE DIFFERENT
  // FACTS AND A READER MUST BE TOLD WHICH.** `UNATTRIBUTED` means *nobody could
  // be named*; a sample actor means *somebody was named and they are not real*.
  // Collapsing them into "not an acceptable actor" would give both the same
  // message and make the first one look answered — the `SYSTEM`-reason defect
  // one layer up.
  if (rigour(mode) < rigour(baseline) && !isAttributed(actor)) {
    return {
      ok: false,
      reason: `loosening ${entityId} from ${baseline} to ${mode} requires a NAMED actor (setBy.kind is UNATTRIBUTED: ${actor.reason})`,
    };
  }
  // ⚠️ ROSTER MEMBERSHIP, NEVER A `sim-usr-` PREFIX MATCH. The prefix may be
  // read as a string to decide something in exactly ONE place —
  // `simUsrNamespace.test.ts`, the C10 §6.3 pin, whose job is to police the
  // spelling. Here the question is *is this one of our fixture people?*, and a
  // lookup answers it without accepting an id a caller merely spelled to look
  // like one.
  //
  // The `isAttributed` re-test is not redundant: the clause above returns only
  // when the mode is ALSO a loosening, so an UNATTRIBUTED actor on a TIGHTENING
  // reaches this line. It is what narrows the union, and it is what keeps a
  // tightening available to anybody (`lib/enforcement.ts` — the safest act is
  // always reachable).
  if (
    rigour(mode) < rigour(baseline) &&
    isAttributed(actor) &&
    isSampleActor(actor.person.personId)
  ) {
    return {
      ok: false,
      reason:
        `SAMPLE_ACTOR_CANNOT_LOOSEN: ${personRefusalToken(actor.person.personId)} is a SAMPLE ` +
        `identity and may not loosen ${entityId} from ${baseline} to ${mode}. A sample identity ` +
        'cannot accept governance risk — that needs a real signed-in person, and Paragon has no ' +
        'sign-in yet.',
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.ENFORCEMENT_SET_GOVERNED, enforcementSetGoverned);

// ── THE PRIVILEGE GRANT (duplicate-and-narrow) ──────────────────────────────
//
// ⚠️ **EVERY REFUSAL HERE NAMES THE THING IT REFUSED.** The tenancy arm names
// the ATOM and both SIDES, because "invalid role" would send somebody to read
// the form when the answer is that the boundary held.
//
// ⚠️ **AND THE TENANCY CHECK IS DELIBERATELY NOT THE FORM'S.** The surface
// offers only same-side atoms, so a well-behaved caller never reaches this
// branch — which is exactly why it must exist. A boundary that has held by
// construction since the beginning must not become a boundary that holds
// because a dropdown was populated correctly.
//
// ⚠️ **`grantedBy` IS VALIDATED, NEVER REQUIRED TO BE *NAMED*, AND THE
// DIFFERENCE IS THE D2 RULING.** `enforcementSetGoverned` refuses a LOOSENING by
// an unattributed actor — and a custom role is additive, so every grant is a
// loosening, 100% of the time. Applying that rule verbatim would refuse every
// grant this platform can currently make, because `CurrentIdentity.actor` is
// always `UNATTRIBUTED: NO_PERSON_IN_SESSION`. What pays for the difference is
// that a grant DOES NOT SURVIVE THE SESSION (`customRoles.ts`): an anonymous
// privilege grant that cannot outlive the browser tab is a demonstrable act,
// not a durable ungoverned one. **The day an IdP answers, this is where the
// `isAttributed` guard lands and where durability becomes arguable.**
const roleGrantGoverned: PolicyHookFn = ({ entityId, payload, scope }) => {
  const parentRefusal = copyableParentRefusal(entityId);
  if (parentRefusal) return { ok: false, reason: parentRefusal };
  const parent = entityId as SystemRoleId;

  const roleId = payload.roleId;
  if (typeof roleId !== 'string') {
    return { ok: false, reason: `roleId must be a string, got ${typeof roleId}` };
  }
  const idRefusal = grantableIdRefusal(roleId);
  if (idRefusal) return { ok: false, reason: idRefusal };

  // ⚠️ `displayName` AND `description` ARE RENDERED BY PASSING THEM TO `t()`
  // AS THEIR OWN KEY (`roleModel.ts`), so user text comes back verbatim in both
  // locales. The only string that would resolve to something else is one
  // prefixed with this app's loaded namespace — refused by name. Punctuation is
  // NOT refused: it was probed and does not truncate.
  for (const field of ['displayName', 'description'] as const) {
    const value = payload[field];
    if (typeof value !== 'string' || !CUSTOM_ROLE_TEXT.test(value.trim())) {
      return { ok: false, reason: `${field} must be 2-80 characters of text` };
    }
    if (I18N_NAMESPACE_PREFIX.test(value.trim())) {
      return {
        ok: false,
        reason: `${field} may not begin with a translation namespace - it would render truncated`,
      };
    }
  }

  const adds = payload.adds;
  if (!Array.isArray(adds) || adds.some((a) => typeof a !== 'string')) {
    return { ok: false, reason: 'adds must be an array of permission strings' };
  }
  const catalog = catalogRoles();
  const held = new Set<string>(SYSTEM_ROLES[parent]);
  for (const atom of adds as readonly string[]) {
    if (held.has(atom)) {
      return {
        ok: false,
        reason: `'${atom}' is already held by '${parent}' - an addition must add something`,
      };
    }
    const refusal = addableAtomRefusal(parent, atom, catalog);
    if (refusal) return { ok: false, reason: refusal };
  }

  if (!asActorAttribution(scope.actor)) {
    return {
      ok: false,
      reason:
        'the commanding scope carries no actor — a role grant that cannot say who made it ' +
        `is not a record, and UNATTRIBUTED (${UNATTRIBUTED_REASONS.join(', ')}) is available ` +
        'to any caller that has no person',
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.ROLE_GRANT_GOVERNED, roleGrantGoverned);

// ── §67 · PR REJECT — THE REASON IS SUBSTANCE, NOT PRESENCE ──────────────────
//
// `requiredFields: ['rejectionReason']` proves the key is there. This proves
// somebody wrote something in it. Both are needed and the split is the point:
// the dispatcher's rule 5 is `isEmpty`, and `isEmpty('   ')` is FALSE — so a
// "required" reason without this hook admits the space bar, and A REQUIRED
// FIELD THAT ADMITS THE SPACE BAR IS A SUGGESTION WITH A VALIDATION MESSAGE.
//
// ⚠️ THE LIMIT, STATED: it proves a non-blank string. It cannot prove the text
// is TRUE, relevant, or responsive to the requisition — no value-level guard
// can, exactly as `RR_SUBMIT_QTY_FLOOR` cannot tell 2400 from 2.4. The surface
// disables its own submit until the box is non-empty; this is what stands
// behind a hand-crafted dispatch that never sees the surface.
bindPolicyHook(POLICY_HOOKS.PR_REJECT_REASON_AUTHORED, ({ payload }) => {
  const value = payload.rejectionReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `rejectionReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'rejectionReason is blank — a rejected requisition must say something ' +
        'the requester can read and revise against',
    };
  }
  return { ok: true };
});

// ── §68 · PR REVISE — WHAT CHANGED IS SUBSTANCE, NOT PRESENCE ───────────────
//
// The twin of `PR_REJECT_REASON_AUTHORED`, and the field it guards had been
// REQUIRED since PF-1a while being discarded before the document was written.
// A required field whose value evaporates is a validation message, not a
// record; a required field that admits the space bar is a suggestion with a
// validation message. Both halves are now closed on this verb.
bindPolicyHook(POLICY_HOOKS.PR_REVISION_NOTE_AUTHORED, ({ payload }) => {
  const value = payload.revisionNote;
  if (typeof value !== 'string') {
    return { ok: false, reason: `revisionNote must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'revisionNote is blank — a requisition returning to the approval queue must say what ' +
        'changed, or the approver sees the document they already declined',
    };
  }
  return { ok: true };
});

// ── §82 · SUPPLIERDOC REJECT — THE REASON THE SUPPLIER WILL READ ────────────
//
// The third instance of the same lesson, and the one with a reader on the other
// end: §80's `RefusalBlock` renders this text word for word to the supplier the
// refusal is about. A blank reason there is not a validation gap, it is a
// refusal notice with nothing written in it — the dead end §80 existed to end,
// restored by the space bar.
bindPolicyHook(POLICY_HOOKS.SUPPLIERDOC_REFUSAL_AUTHORED, ({ payload }) => {
  const value = payload.rejectionReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `rejectionReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'rejectionReason is blank — the supplier reads this text verbatim on their own ' +
        'documents page, so a refusal with nothing written in it tells them only that ' +
        'they failed',
    };
  }
  return { ok: true };
});

// ── §68 · PR APPROVE — THE DECIDER IS NAMED, AND NOT BY THE CALLER ──────────
//
// ⚠️ **THIS IS C10 §6.2's SECOND HALF, AND IT IS THE FIRST IMPLEMENTATION OF
// IT IN THE TREE.** §6.2 states the rule in two parts and records that the
// second is the one that gets forgotten:
//
//   1. the resolved actor comes from the SESSION, never from a payload;
//   2. a payload-supplied `RESOLVED` actor is REFUSED BY NAME ON WRITE — *"not
//      ignored, not overwritten, not silently replaced by the session's.
//      Refused, loudly."*
//
// The overwrite is the tempting build and it is the one §6.2 rules out: a
// silent correction of an attribution is a caller that believes it attributed
// an act and a record that says somebody else did.
//
// ⚠️ **AND THE REFUSAL IS BY KEY, NOT BY VALUE-SHAPE.** Refusing only a
// well-formed `RESOLVED` actor would let a malformed one through to be dropped
// silently, which is the same silent correction wearing a type error. Anything
// under `approvedBy` is refused, because the caller has no business writing
// that key at all — the payload is not where attribution lives.
//
// ⚠️ **AN `UNATTRIBUTED` SESSION ACTOR IS ACCEPTED, AND MUST BE.** It is a
// claim about a FAILURE TO RESOLVE, which is exactly what this platform has
// today (`NO_PERSON_IN_SESSION`) and exactly what makes the gap countable.
// Refusing it would make approval unreachable and would replace an honest
// absence with no record at all.
bindPolicyHook(POLICY_HOOKS.PR_APPROVAL_ATTRIBUTED, ({ payload, scope }) => {
  if ('approvedBy' in payload) {
    return {
      ok: false,
      reason:
        'approvedBy is REFUSED in the payload — an approval is attributed from the session, ' +
        'never from the caller (C10 §6.2). A caller that could set it could backdate its own ' +
        'audit entry',
    };
  }
  const actor = asActorAttribution(scope.actor);
  if (!actor) {
    return {
      ok: false,
      reason:
        'the commanding scope carries no actor — an approval that cannot say who decided it ' +
        'is not a record, and UNATTRIBUTED is available to any caller that has no person',
    };
  }
  return { ok: true };
});

// ── B1 · SUPPLIER APPLICATION — THE BIRTH GUARDS ────────────────────────────
//
// All three are PURE: they read the payload and, for the vendor rule, the
// TARGET's own resolver. No roster, no fixture and no store crosses into this
// layer — which is what lets the resolution live in the data layer that owns
// the roster while the OBLIGATION lives here, next to every other obligation.

// The request type is one of three, and an unknown token is refused BY NAME.
// `requiredFields` proves presence; nothing else proves membership, so without
// this a hand-crafted dispatch stores a request type no reader recognises and
// every downstream branch takes its else-arm silently.
bindPolicyHook(POLICY_HOOKS.APPLICATION_REQUEST_TYPE_KNOWN, ({ payload }) => {
  const value = payload.requestType;
  if (!isApplicationRequestType(value)) {
    return {
      ok: false,
      reason:
        `requestType ${JSON.stringify(value)} is not one of ` +
        `${APPLICATION_REQUEST_TYPES.join(' | ')} — an unrecognised request type would be ` +
        'stored as one and read by nothing',
    };
  }
  return { ok: true };
});

// ── THE VENDOR RESOLUTION, MADE BINDING ─────────────────────────────────────
//
// ⚠️ **THE RESOLVER IS THE TARGET'S `creationOwner`, READ THROUGH `ctx.target`
// — THERE IS EXACTLY ONE OF IT, AND THIS HOOK DOES NOT CONTAIN A SECOND.** A
// hook that re-implemented the roster lookup would be the copy that drifts, and
// it would put the platform roster inside the transitions layer, which knows
// about no data at all.
//
// ⚠️ **WHY THIS IS NOT `requireCreationOwner: true`, MEASURED.** That flag is
// per-TARGET: the dispatcher refuses ANY buyer creation whose owner resolves
// null. Two of the three request types have no existing vendor by definition,
// so their owner is legitimately null and the flag would refuse them — the
// majority path, including every genuinely new supplier. The flag cannot say
// "required when", and this is the layer that can.
//
// ⚠️ **THE LIMIT, STATED.** It proves the named vendor EXISTS on the roster. It
// cannot prove the applicant is that vendor, or that the person filling the
// form meant that one — no value-level guard can, exactly as the quantity floor
// cannot tell 2400 from 2.4.
bindPolicyHook(
  POLICY_HOOKS.APPLICATION_INTERNAL_VENDOR_RESOLVED,
  ({ payload, target }) => {
    if (payload.requestType !== VENDOR_BEARING_REQUEST_TYPE) return { ok: true };
    if (!target.creationOwner) {
      return {
        ok: false,
        reason:
          'the target implements no creationOwner, so the named vendor cannot be resolved ' +
          'against anything — an application claiming an existing vendor must be checked, ' +
          'never taken on the payload’s word',
      };
    }
    if (target.creationOwner(payload) === null) {
      return {
        ok: false,
        reason:
          `s4Vendor ${JSON.stringify(payload.s4Vendor ?? null)} resolves to no vendor the ` +
          'governed roster names — a request to extend a supplier that does not exist would ' +
          'sit in the queue forever with nobody able to say who it is about',
      };
    }
    return { ok: true };
  },
);

// The refusal a person will eventually have to deliver. Fourth instance of the
// substance-not-presence guard, and the one whose reader is furthest from the
// act: the applicant has no seat here, so whoever tells them has nothing but
// this text to tell them with.
bindPolicyHook(POLICY_HOOKS.APPLICATION_REFUSAL_AUTHORED, ({ payload }) => {
  const value = payload.rejectionReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `rejectionReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'rejectionReason is blank — a refused application is the one record anybody will have ' +
        'when the applicant asks why, and an empty one answers nothing',
    };
  }
  return { ok: true };
});

// Declarations are OPTIONAL — an application carrying none is legal and common.
// A declarations key that is PRESENT and malformed is not: reading the good
// entries and dropping the rest would subtract from data somebody supplied,
// silently, and leave nothing anywhere saying which claim went missing.
bindPolicyHook(POLICY_HOOKS.APPLICATION_DECLARATIONS_WELL_FORMED, ({ payload }) => {
  if (!('declarations' in payload) || payload.declarations === undefined) {
    return { ok: true };
  }
  const value = payload.declarations;
  if (!Array.isArray(value)) {
    return {
      ok: false,
      reason: `declarations must be a list, got ${typeof value}`,
    };
  }
  const bad = value
    .map((d, i) => (isApplicationDeclaration(d) ? null : i))
    .filter((i): i is number => i !== null);
  if (bad.length > 0) {
    return {
      ok: false,
      reason:
        `declarations ${bad.join(', ')} name no known document or carry a blank reference — ` +
        'a declaration is a claim somebody will later be asked to stand behind, and one with ' +
        'nothing in it cannot be looked up or refused',
    };
  }
  return { ok: true };
});

// ── R8 · THE MATERIAL-REQUEST HOOKS ─────────────────────────────────────────

// The category is one of the wizard's own six, and an unknown token is refused
// BY NAME. `requiredFields` proves presence; nothing else proves membership, so
// without this a hand-crafted dispatch stores a category the picker cannot
// render and no filter can find.
//
// ⚠️ **AND IT PROVES `catalogReason` IN THE SAME HOOK RATHER THAN IN A SIXTH.**
// The two are one question — *"are the closed-union fields on this payload
// actually members?"* — and `catalogReason` is OPTIONAL, so it cannot be a
// `requiredField` and would otherwise be proven nowhere. Splitting it would add
// a hook whose refusal a reader could not tell from this one's.
bindPolicyHook(POLICY_HOOKS.MATERIALREQUEST_CATEGORY_KNOWN, ({ payload }) => {
  const category = payload.category;
  if (!isRfqCategoryMember(category)) {
    return {
      ok: false,
      reason:
        `category ${JSON.stringify(category)} is not one of ` +
        `${RFQ_CATEGORIES.join(' | ')} — a category the picker cannot render ` +
        'would file the request where nobody looking for it can find it',
    };
  }
  // Absent is legal: a standalone request picked nothing from the catalog, so
  // there is no reason to carry. PRESENT and off-list is not.
  const reason = payload.catalogReason;
  if (reason !== undefined && reason !== null && !isCodeLessReason(reason)) {
    return {
      ok: false,
      reason:
        `catalogReason ${JSON.stringify(reason)} is not one of ` +
        `${CODE_LESS_REASONS.join(' | ')} — the reason is the reviewer's triage ` +
        '(waiting on master data, waiting on a human, or never getting a code), and an ' +
        'unrecognised one triages nothing',
    };
  }
  return { ok: true };
});

// The one field a master-data person acts on. Fifth instance of the
// substance-not-presence guard, and the reader has the least else to go on:
// deciding whether a label already exists under another name, they have the
// requested label — which is exactly the string the catalog already failed to
// resolve — and this text.
bindPolicyHook(POLICY_HOOKS.MATERIALREQUEST_NEED_AUTHORED, ({ payload }) => {
  const value = payload.need;
  if (typeof value !== 'string') {
    return { ok: false, reason: `need must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'need is blank — a master-data reviewer decides whether this material already exists ' +
        'under another name, and the requested label is the string the catalog already failed ' +
        'to resolve, so a blank need leaves them nothing they did not already have',
    };
  }
  return { ok: true };
});

// ── THE RFQ RESOLUTION, MADE BINDING ────────────────────────────────────────
//
// ⚠️ **THE RESOLVER IS THE TARGET'S `creationOwner`, READ THROUGH `ctx.target`
// — THERE IS EXACTLY ONE OF IT, AND THIS HOOK DOES NOT CONTAIN A SECOND.** A
// hook that re-implemented the store lookup would be the copy that drifts, and
// it would put the RFQ store inside the transitions layer, which knows about no
// data at all. `APPLICATION_INTERNAL_VENDOR_RESOLVED`'s shape exactly.
//
// ⚠️ **WHY THIS IS NOT `requireCreationOwner: true`, MEASURED.** That flag is
// per-TARGET: the dispatcher refuses ANY buyer creation whose owner resolves
// null. A STANDALONE request names no RFQ by definition, so its owner is
// legitimately null and the flag would refuse the entire page entrance. The flag
// cannot say "required when", and this is the layer that can.
//
// ⚠️ **THE LIMIT, STATED.** It proves the named event EXISTS. It cannot prove
// the request was discovered on that event, or that the buyer meant that one —
// no value-level guard can.
bindPolicyHook(POLICY_HOOKS.MATERIALREQUEST_RFQ_RESOLVED, ({ payload, target }) => {
  const stated = payload.raisedFromRfqId;
  if (stated === undefined || stated === null || stated === '') return { ok: true };
  if (!target.creationOwner) {
    return {
      ok: false,
      reason:
        'the target implements no creationOwner, so the named sourcing event cannot be ' +
        'resolved against anything — a request claiming it came from an RFQ must be checked, ' +
        'never taken on the payload’s word',
    };
  }
  if (target.creationOwner(payload) === null) {
    return {
      ok: false,
      reason:
        `raisedFromRfqId ${JSON.stringify(stated)} resolves to no sourcing event this platform ` +
        'holds — a request whose provenance names nothing leaves a reviewer unable to see what ' +
        'the buyer was trying to buy',
    };
  }
  return { ok: true };
});

// The refusal a buyer will read themselves. Sixth instance, and kept separate
// from MATERIALREQUEST_NEED_AUTHORED because the two read different payload
// fields: a shared hook would have to branch on `toState` to know which, after
// which reading the guard no longer tells you what it guards.
bindPolicyHook(POLICY_HOOKS.MATERIALREQUEST_REFUSAL_AUTHORED, ({ payload }) => {
  const value = payload.justification;
  if (typeof value !== 'string') {
    return { ok: false, reason: `justification must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'justification is blank — a declined request is the one record telling the buyer ' +
        'whether to re-request with a better description or stop asking, and an empty one ' +
        'answers neither',
    };
  }
  return { ok: true };
});

// ── FOUR-EYES: BUILT, TYPED FOR, AND UNABLE TO FIRE TODAY ───────────────────
//
// ⚠️ **THIS HOOK ADMITS EVERY ACT IN THIS TREE, AND SAYING SO HERE IS THE POINT
// — ITS GREEN MUST NEVER BE READ AS A WORKING CHECK.** `CurrentIdentity.actor`
// is `UNATTRIBUTED: NO_PERSON_IN_SESSION` on both personas, so `isAttributed`
// is false on both sides, the comparison never happens, and the hook returns
// ok. That direction is correct — **an unattributed act is not evidence of
// self-approval** — and refusing instead would make the lane unusable to
// demonstrate a rule nobody can yet break.
//
// It is `pslListing`'s ruling executed rather than restated: *"Four-eyes
// (proposer ≠ decider) is UNBUILDABLE today for exactly that reason: every
// actor in this tree is `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so there are no
// two values to compare. Typing these as `string` now would make the check a
// migration later instead of a one-line predicate."* The predicate below IS
// that one line, in place and waiting, so F1 costs no edit here.
//
// ⚠️ **THE DOCUMENT IS READ THROUGH `ctx.target.readEntity`, WHICH IS
// DOCUMENTED FOR EXACTLY THIS** — *"Full entity for policy hooks to inspect"* —
// and four shipped hooks already do it. The belief that a hook cannot reach the
// entity is false and has stopped a batch before.
//
// ⚠️ **AND IT IS THE PER-DOCUMENT HALF, WHICH THE ATOM SPLIT DOES NOT COVER.**
// `materialrequest:submit` is `procurement`'s and `:review`/`:decide` are
// `planning`'s, so the two authorities CAN be separated — but the default buyer
// seat holds all six lane bundles, so today one seat holds both. Lane
// segregation makes narrowing possible; only an attributed actor makes
// self-decision refusable.
//
// ⚠️ **PROBED BOTH WAYS, BECAUSE A ONE-SIDED PROBE OVER A POPULATION WHERE IT
// CANNOT FIRE PROVES NOTHING** (rule 4, and `CLEAN-AFTER-THE-FIX-REPORTS-THE-
// FIX-01`'s neighbour): `materialRequestCommand.test.ts` fires it at a
// SYNTHETIC RESOLVED pair and requires a refusal BY NAME, beside the real-tree
// run requiring an admit.
bindPolicyHook(
  POLICY_HOOKS.MATERIALREQUEST_DECIDER_NOT_REQUESTER,
  ({ entityId, target, scope }) => {
    const row = target.readEntity?.(entityId) as
      | { submittedBy?: ActorAttribution }
      | null
      | undefined;
    const requester = row?.submittedBy;
    const decider = scope.actor;
    if (
      requester &&
      decider &&
      isAttributed(requester) &&
      isAttributed(decider) &&
      requester.person.personId === decider.person.personId
    ) {
      return {
        ok: false,
        // ⚠️ **THE HEAD IS WHAT MAKES THIS REFUSAL TRANSLATABLE, AND IT WAS
        // MISSING — WHICH IS HOW A `personId` REACHED A READER.** Without a head
        // there is nothing for a surface to key on, so `describeRefusal` fell
        // back to appending this developer sentence verbatim and the toast
        // rendered *"the requester (sim-usr-procurement-1) may not also
        // decide…"*. The sentence itself is correct and stays: it is the
        // trail a developer reads, and `materialRequestCommand.test.ts` pins
        // that it names the `personId` (C10 §8.2 / D-ID-1 — the id is stable,
        // a label is not). What changed is that a reader no longer sees it.
        //
        // The head follows `PSL_DECIDER_IS_PROPOSER`'s shape deliberately —
        // `<HEAD>: <sentence>` is the contract `pslRefusal.ts` already reads,
        // and copying it is what let this lane reuse the instrument instead of
        // inventing a second one.
        reason:
          `MATERIALREQUEST_DECIDER_IS_REQUESTER: the requester ` +
          `(${personRefusalToken(requester.person.personId)}) may not also ` +
          'decide this request — raising a material request and ruling on it are two authorities',
      };
    }
    return { ok: true };
  },
);

// ── PSL P2 · THE SOURCING GATE ──────────────────────────────────────────────
//
// ⚠️ **THE INSTANT IS `DECLARED_PRESENT`, IMPORTED HERE, AND THIS IS THE FIRST
// DIRECT FIXTURE-CLOCK IMPORT IN THE TRANSITIONS LAYER. IT IS NAMED RATHER THAN
// SLIPPED IN.** Derived before it was written: `PolicyHookFn`'s ctx carries six
// members and NONE is an instant; `dispatcher.ts` contains no `new Date` or
// `Date.now` at all; and before this batch no module under
// `services/transitions/` imported `fixturePresent`. So a hook that must judge
// whether a listing is in force has exactly three places to get "now" from, and
// two of them are wrong:
//   · the WALL CLOCK — wrong, because the listings are anchored at `P` and a
//     projection read at any other instant is answering a different question;
//   · the PAYLOAD — refused. A caller-supplied instant is C10 §6.2's
//     attribution-by-assertion shape one axis over: a buyer could backdate
//     their way past an expiry, and the gate would have no way to know.
//   · the DECLARED PRESENT — the only one that is a fact about the fixture
//     corpus rather than about the machine or the caller.
//
// Everything below passes it DOWN as a parameter; nothing in
// `rfqSourcingGate.ts` reads a clock, and `pslReadIsClockIndependent.test.ts`
// covers both files by source scan and by behaviour.
//
// ⚠️ **AND THE CORPUS NEVER REACHES THIS FILE.** The roster and the quotation
// store are read through `rosterStatusOf` / `quotationOwnerOf`, which live in
// `services/data` where synchronous fixture reads belong. That is the whole
// reason `pslSourcingSeam` was built as a seam in P1: the transitions layer
// learns an ANSWER, never a corpus.

/** The RFQ a publish/award hook is judging, or `null` if the entity is gone. */
function readRfq(target: { readEntity(id: string): unknown }, entityId: string): RFQ | null {
  const entity = target.readEntity(entityId);
  return entity && typeof entity === 'object' ? (entity as RFQ) : null;
}

// — Publish (1 of 2): every invitee may be invited at all ————————————————————
//
// RUNS FIRST. `t_rfq_publish.policyHooks` lists this before the competition
// hook and the dispatcher evaluates them in array order, so an ineligible
// invitee is refused BEFORE any count is taken — which is what makes "a refused
// invitee is not counted toward the floor" a fact about the machine rather than
// a convention two hooks have to keep. `rfqSourcingGate.test.ts` pins the order
// in the flow definition itself, so re-ordering the array reddens.
bindPolicyHook(POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE, ({ entityId, target }) => {
  const rfq = readRfq(target, entityId);
  if (rfq === null) return { ok: true }; // existence is the dispatcher's answer, not this hook's
  const { eligibility } = decideSourcing(rfq, DECLARED_PRESENT, rosterStatusOf);
  if (eligibility.kind === 'ALL_ELIGIBLE') return { ok: true };
  // Names WHO and WHY. A refusal that said only "an invitee is not eligible"
  // would send the buyer back to a list of suppliers to guess between.
  const named = eligibility.offenders.map((o) => `${o.supplierId} (${o.status})`).join(', ');
  return {
    ok: false,
    reason: `INVITEE_NOT_ELIGIBLE: ${named} may not be invited to a sourcing event`,
  };
});

// — Publish (2 of 2): the event is competitive, or does not need to be ————————
//
// THE FLOOR ONLY. `AT_FLOOR` is an ALLOWANCE and returns `ok: true` — the note
// that three is the standard is rendered by the wizard from the same call,
// because `PolicyDecision` has no channel for it.
//
// ⚠️ An UNDECIDABLE material question does NOT refuse here. It blocks the
// EXEMPTION and nothing else (operator ruling): the event then runs under the
// ordinary competition rule, and the surface says the standing could not be
// checked. The type makes that structural — `SourcingRefusalReason` has no
// undecidable member for this to map onto.
bindPolicyHook(POLICY_HOOKS.RFQ_PUBLISH_COMPETITION, ({ entityId, target }) => {
  const rfq = readRfq(target, entityId);
  if (rfq === null) return { ok: true };
  const { competition } = decideSourcing(rfq, DECLARED_PRESENT, rosterStatusOf);
  if (competition.kind !== 'UNDER_FLOOR') return { ok: true };
  return {
    ok: false,
    reason:
      `COMPETITION_UNDER_FLOOR: ${competition.eligible} eligible supplier(s) invited, ` +
      `a competitive event needs at least ${COMPETITION_FLOOR_INVITEES}`,
  };
});

// — Award: the awardee owns the awarded quotation, and was invited ————————————
//
// Reads the PAYLOAD for both award fields, because that is where they arrive
// and where they disagree. The quotation's own supplier comes from the STORE,
// so a quotation raised at runtime is checkable too.
bindPolicyHook(POLICY_HOOKS.RFQ_AWARD_AWARDEE_INTEGRITY, ({ entityId, payload, target }) => {
  const rfq = readRfq(target, entityId);
  if (rfq === null) return { ok: true };
  const awardedSupplierId = typeof payload.awardedSupplierId === 'string' ? payload.awardedSupplierId : '';
  const awardedQuotationId = typeof payload.awardedQuotationId === 'string' ? payload.awardedQuotationId : '';
  const verdict = awardIntegrity(
    { invitedSupplierIds: rfq.invitedSupplierIds, awardedSupplierId, awardedQuotationId },
    quotationOwnerOf,
  );
  if (verdict.kind === 'OK') return { ok: true };
  if (verdict.kind === 'AWARDEE_NOT_INVITED') {
    return {
      ok: false,
      reason: `AWARDEE_NOT_INVITED: ${verdict.supplierId} was not invited to this event`,
    };
  }
  return {
    ok: false,
    reason:
      `AWARDEE_NOT_THE_QUOTING_SUPPLIER: the award names ${verdict.supplierId}, but ` +
      `${verdict.quotationId} was submitted by ${verdict.quotingSupplierId || '(no such quotation)'}`,
  };
});

// ── PSL P3 · THE GOVERNANCE VERBS ───────────────────────────────────────────
//
// ⚠️ **THE INSTANT IS `DECLARED_PRESENT`, AS IT ALREADY IS FOR THE P2 SOURCING
// GATE, AND ONLY TWO HOOKS BELOW NEED ONE AT ALL.** `PolicyHookFn`'s ctx
// carries six members and none is an instant; the wall clock is wrong because
// the corpus is anchored at `P`; and a payload-supplied instant is C10 §6.2's
// attribution-by-assertion shape one axis over — a proposer could backdate
// their way past a cap. Everything below that needs "now" takes it from the
// same declared present the sourcing gate does.
//
// ⚠️ **AND MOST OF THEM NEED NO CLOCK AT ALL, WHICH IS THE DESIGN.**
// `PSL_VALIDITY_ORDERED` compares two AUTHORED dates against each other;
// `PSL_RENEWAL_EXTENDS` compares a proposed end against the effective end;
// `PSL_RENEWAL_WITHIN_CAP` compares a duration against a cap. Not one of them
// asks whether a date has passed, because a verb that refused an already-past
// validity would put the clock inside a transition (law 0.5) and would refuse
// the day-one BACKFILL that is how an existing PSL enters this portal.

/** The listing a PSL hook is judging, or `null` if the entity is gone. */
function readPslListing(
  target: { readEntity(id: string): unknown },
  entityId: string,
): PslListing | null {
  const entity = target.readEntity(entityId);
  return entity && typeof entity === 'object' ? (entity as PslListing) : null;
}

/** A payload string with something written in it. The dispatcher's
 *  `requiredFields` check admits a string of spaces, which is why every
 *  authored-text rule below is a HOOK and not a required field. */
const authored = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// — propose: the supplier must be on the roster ————————————————————————————
//
// A listing for a company the world does not name is a grant to nobody, and it
// would sit on the Directory beside real suppliers with nothing to distinguish
// it. `creationOwner` cannot express this: that seam answers TENANCY, and a PSL
// listing has no tenant (`pslTarget.readScopeOwner` is null by design), so the
// resolution has to happen where a refusal can say what went wrong.
bindPolicyHook(POLICY_HOOKS.PSL_SUPPLIER_RESOLVED, ({ payload }) => {
  const supplierId = authored(payload.supplierId);
  if (mockSuppliers.some((s) => s.id === supplierId)) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_SUPPLIER_UNKNOWN: ${supplierId || '(none given)'} is not on the ` +
      'supplier roster. Pick the supplier from the directory rather than typing an id.',
  };
});

// — propose: the scope must name real material codes ——————————————————————
//
// ⚠️ **MEMBERSHIP, NEVER PRESENCE — THE `QUOTATION_SUBMIT_CURRENCY_PERMITTED`
// LESSON IN ITS THIRD LANE.** `requiredFields` would admit `['anything']`, and
// the listing would then cover a code no sourcing event can ever match: the
// grant would be silently unreachable while the record looked granted, and
// `pslStatusFor`'s narrowed query would simply never return it.
bindPolicyHook(POLICY_HOOKS.PSL_SCOPE_WELL_FORMED, ({ payload }) => {
  // ⚠️ **BLANKS ARE DROPPED BEFORE THE EMPTINESS TEST, AND THAT IS WHAT MAKES
  // THE `PSL_SCOPE_EMPTY` ARM REACHABLE AT ALL.** A literally empty array is
  // caught by the dispatcher's `requiredFields` check first and refused as
  // `MISSING_FIELDS:materialCodes` — correct, and it answers before any hook.
  // What the dispatcher CANNOT see is a list of blanks: `['  ']` is present and
  // non-empty and names no material. Same gap as the whitespace-justification
  // case, one field over, and the same remedy.
  const codes = Array.isArray(payload.materialCodes)
    ? (payload.materialCodes as readonly unknown[])
        .map((c) => authored(c))
        .filter((c) => c !== '')
    : [];
  if (codes.length === 0) {
    return {
      ok: false,
      reason:
        'PSL_SCOPE_EMPTY: a listing must name at least one material code. ' +
        'Add the materials this designation covers.',
    };
  }
  const unknown = codes.filter((c) => !(c in MATERIAL_MASTER));
  if (unknown.length === 0) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_SCOPE_UNKNOWN_CODE: ${unknown.join(', ')} ` +
      (unknown.length === 1 ? 'is not a material' : 'are not materials') +
      ' this platform carries. Pick the codes from the material catalog, or ' +
      'raise a material request for one that does not exist yet.',
  };
});

// — propose / change status: the designation must be a known one ——————————
bindPolicyHook(POLICY_HOOKS.PSL_STATUS_KNOWN, ({ payload }) => {
  const status = authored(payload.status);
  if (isPslStatus(status)) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_STATUS_UNKNOWN: ${status || '(none given)'} is not a designation ` +
      `this platform recognises. It must be one of ${PSL_STATUSES.join(', ')}.`,
  };
});

// — propose: the validity must run forwards ————————————————————————————————
//
// ⚠️ **TWO AUTHORED DATES AGAINST EACH OTHER, AND NEVER AGAINST `now`.** See
// this block's header: an already-past validity is a BACKFILL, which is the
// normal shape of a day-one load, and refusing it would put a clock inside a
// transition.
bindPolicyHook(POLICY_HOOKS.PSL_VALIDITY_ORDERED, ({ payload }) => {
  const from = authored(payload.validFrom).slice(0, 10);
  const until = authored(payload.validUntil).slice(0, 10);
  if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(until))) {
    return {
      ok: false,
      reason:
        'PSL_VALIDITY_UNREADABLE: the validity dates must both be real days. ' +
        'Enter them as calendar dates.',
    };
  }
  if (from <= until) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_VALIDITY_INVERTED: the designation would end (${until}) before it ` +
      `begins (${from}). Correct the dates.`,
  };
});

// — the authored-text guards ———————————————————————————————————————————————
//
// Two hooks rather than one, because a refusal must name the FIELD a person has
// to go and fill. A shared hook would have to branch on `toState` to know
// which, after which reading the guard no longer tells you what it guards —
// `MATERIALREQUEST_REFUSAL_AUTHORED`'s own note, one lane over.
bindPolicyHook(POLICY_HOOKS.PSL_JUSTIFICATION_AUTHORED, ({ payload }) => {
  if (authored(payload.justification) !== '') return { ok: true };
  return {
    ok: false,
    reason:
      'PSL_JUSTIFICATION_BLANK: a listing needs a written justification — it ' +
      'is the one sentence that says why this supplier holds a designation ' +
      'that may suspend competitive bidding. Write why, then propose again.',
  };
});

bindPolicyHook(POLICY_HOOKS.PSL_DECISION_AUTHORED, ({ payload }) => {
  if (authored(payload.reason) !== '') return { ok: true };
  return {
    ok: false,
    reason:
      'PSL_DECISION_BLANK: every entry in a listing ledger carries a reason — ' +
      'a silent change of designation is forbidden. Write the reason, then act again.',
  };
});

// ── FOUR-EYES: BUILT, TYPED FOR, AND UNABLE TO FIRE TODAY ───────────────────
//
// ⚠️ **THIS HOOK ADMITS EVERY ACT IN THIS TREE, AND SAYING SO HERE IS THE POINT
// — ITS GREEN MUST NEVER BE READ AS A WORKING CHECK.** `CurrentIdentity.actor`
// is `UNATTRIBUTED: NO_PERSON_IN_SESSION` on both personas, so `isAttributed`
// is false on both sides, the comparison never happens, and the hook returns
// ok. That direction is correct — **an unattributed act is not evidence of
// self-approval** — and refusing instead would make the lane unusable to
// demonstrate a rule nobody can yet break.
//
// It is `pslListing.ts`'s OWN ruling executed rather than restated: *"Four-eyes
// (proposer ≠ decider) is UNBUILDABLE today for exactly that reason: every
// actor in this tree is `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so there are no
// two values to compare. Typing these as `string` now would make the check a
// migration later instead of a one-line predicate."* The predicate below IS
// that one line, in place and waiting, so F1 costs no edit here.
//
// ⚠️ **AND IT IS THE PER-DOCUMENT HALF. THE PER-SEAT HALF FIRES TODAY AND IS A
// DIFFERENT HOOK** — `PSL_RESTRICTIVE_STATUS_APPROVED`, below. Saying so is
// what stops the pair being read as one check written twice: this one asks
// *did this PERSON raise it*, that one asks *does this SEAT hold both
// authorities*, and only the second is answerable without an IdP.
//
// ⚠️ **PROBED BOTH WAYS, BECAUSE A ONE-SIDED PROBE OVER A POPULATION WHERE IT
// CANNOT FIRE PROVES NOTHING** (rule 4): `pslCommand.test.ts` fires it at a
// SYNTHETIC RESOLVED pair and requires a refusal BY NAME, beside the real-tree
// run requiring an admit.
bindPolicyHook(POLICY_HOOKS.PSL_DECIDER_NOT_PROPOSER, ({ entityId, target, scope }) => {
  const row = readPslListing(target, entityId);
  const proposer = row?.proposedBy;
  const decider = scope.actor;
  if (
    proposer &&
    decider &&
    isAttributed(proposer) &&
    isAttributed(decider) &&
    proposer.person.personId === decider.person.personId
  ) {
    return {
      ok: false,
      reason:
        `PSL_DECIDER_IS_PROPOSER: ${personRefusalToken(proposer.person.personId)} proposed ` +
        'this listing and may not also decide it — raising a designation and ruling ' +
        'on it are two authorities. Route it to somebody else.',
    };
  }
  return { ok: true };
});

// — the restrictive-designation check (the "Lead" half that IS buildable) ——
//
// ⚠️ **ONE EXPRESSION, TWO READERS.** The rule lives in
// `services/data/pslLeadCheck.ts` and the panel asks the SAME function off the
// same call, on `handlePinConfirm` / `PslGateNotice`'s precedent — because an
// authorisation decision taken inside a hook is invisible to
// `useVerbAvailability`, and a surface that trusted the role gate alone would
// offer the verb and the dispatcher would refuse it.
//
// ⚠️ **IT IS SEAT SEGREGATION, NOT SENIORITY, AND THE MODULE SAYS SO AT
// LENGTH.** There is no `Lead` role and one may not be minted (C10 §3.4, plus
// the bilateral bundle gate). What is checkable is that the deciding seat does
// not also hold the raising authority — and that is what the refusal says.
//
// ⚠️ **THE DEFAULT BUYER SEAT HOLDS BOTH** (§76d: `SEEDED_SEAT_ROLES.buyer` is
// all six lanes), so out of the box this hook REFUSES a Mandatory or Sole
// Source decision until somebody narrows the seat on the identity panel. The
// queue page keeps proposing and deciding out of one panel; that is a SURFACE
// mitigation and it is not enforcement. This hook is the enforcement.
bindPolicyHook(
  POLICY_HOOKS.PSL_RESTRICTIVE_STATUS_APPROVED,
  ({ entityId, target, payload, scope }) => {
    // The designation under judgement: the payload's on a change, the row's on
    // a grant or a renew (neither of which carries one).
    const stated = authored(payload.status);
    const row = readPslListing(target, entityId);
    const status = (isPslStatus(stated) ? stated : row?.status) as PslStatus | undefined;
    if (!status) return { ok: true };
    const verdict = restrictiveDecisionVerdict(
      status,
      atomsForSeat(scope.businessRoles ?? []),
    );
    if (verdict.kind !== 'SEAT_HOLDS_BOTH') return { ok: true };
    return {
      ok: false,
      reason:
        `PSL_SEAT_HOLDS_BOTH_AUTHORITIES: a ${verdict.status} designation ` +
        'suspends competitive bidding, so it may not be decided by a seat that ' +
        'also raises listings. Narrow the seat to the deciding lane on the ' +
        'identity panel, or route the decision to somebody who holds it.',
    };
  },
);

// — change status: it must actually change ————————————————————————————————
bindPolicyHook(POLICY_HOOKS.PSL_STATUS_ACTUALLY_CHANGES, ({ entityId, target, payload }) => {
  const row = readPslListing(target, entityId);
  const next = authored(payload.status);
  if (!row || next !== row.status) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_STATUS_UNCHANGED: this listing is already ${row.status}. A ledger ` +
      'entry with no change in it records nothing; pick a different designation ' +
      'or leave it as it stands.',
  };
});

// — renew: it must extend ——————————————————————————————————————————————————
bindPolicyHook(POLICY_HOOKS.PSL_RENEWAL_EXTENDS, ({ entityId, target, payload }) => {
  const row = readPslListing(target, entityId);
  if (!row) return { ok: true };
  const next = authored(payload.validUntil).slice(0, 10);
  if (!Number.isFinite(Date.parse(next))) {
    return {
      ok: false,
      reason:
        'PSL_RENEWAL_UNREADABLE: the new end date must be a real day. Enter it ' +
        'as a calendar date.',
    };
  }
  const current = effectiveValidUntil(row) ?? row.validUntil.slice(0, 10);
  if (next > current) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_RENEWAL_DOES_NOT_EXTEND: this designation already runs to ${current}. ` +
      'A renewal moves the end date later; to shorten a validity, record a cap ' +
      'override with its justification instead.',
  };
});

// — renew: it must stay within the cap ————————————————————————————————————
//
// ⚠️ **REFUSED HERE RATHER THAN BOUNDED AT READ** (operator ruling e).
// `effectiveValidUntil` would clamp a longer renewal silently, so a person
// would record two more years, the record would say two years and the surface
// would say one. A governance bound that only ever appears in a projection is a
// bound the decider never meets.
//
// ⚠️ **AND THE ASYMMETRY WITH `t_psl_propose` IS DELIBERATE, NOT AN OVERSIGHT.**
// A proposal's `validUntil` is NOT cap-checked, because the cap is a READ-TIME
// bound on a stated term: `effectiveValidUntil`, `PslCapSource` and the whole
// "Effective until" line exist precisely to render a term the platform has
// bounded. Refusing at propose would make every one of them unreachable. A
// RENEWAL is different in kind — its entire payload IS the end date, so
// recording it and then not moving the date is the act failing while reporting
// success.
bindPolicyHook(POLICY_HOOKS.PSL_RENEWAL_WITHIN_CAP, ({ entityId, target, payload }) => {
  const row = readPslListing(target, entityId);
  if (!row) return { ok: true };
  const next = authored(payload.validUntil).slice(0, 10);
  if (!Number.isFinite(Date.parse(next))) return { ok: true }; // named by the hook above
  const cap = effectiveCap(row);
  const from = Date.parse(row.validFrom.slice(0, 10));
  if (!Number.isFinite(from)) return { ok: true };
  const limit = new Date(from + cap.days * 86_400_000).toISOString().slice(0, 10);
  if (next <= limit) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_RENEWAL_EXCEEDS_CAP: the validity cap in force is ${cap.days} days ` +
      `from ${row.validFrom.slice(0, 10)}, so this designation may run to ${limit} ` +
      `at the latest — not ${next}. Record a cap override with its justification ` +
      'first, or renew to a date within the cap.',
  };
});

// — publish: once, and only once ——————————————————————————————————————————
//
// `publishedAt` is write-once history (ruling b): it records that the supplier
// was told. A second publish would either overwrite the instant they were
// actually told or be a no-op reported as a success, and both are worse than a
// refusal that says it is already published.
bindPolicyHook(POLICY_HOOKS.PSL_NOT_ALREADY_PUBLISHED, ({ entityId, target }) => {
  const row = readPslListing(target, entityId);
  if (!row || !isPublished(row)) return { ok: true };
  return {
    ok: false,
    reason:
      'PSL_ALREADY_PUBLISHED: this listing has already been shared with the ' +
      'supplier, and the date it was shared is a record that is not overwritten. ' +
      'Changes to the designation reach the supplier without publishing again.',
  };
});

// — the cap verbs ——————————————————————————————————————————————————————————
//
// ⚠️ **THE REFUSALS STATE THE CEILING, WHICH IS WHY IT STOPPED BEING A
// PLACEHOLDER** (ruling i). A number a surface quotes back to somebody is a
// ruling, whatever a comment says; `pslProjection.ts`'s own doc comment was
// corrected in the same batch.
bindPolicyHook(POLICY_HOOKS.PSL_CAP_WITHIN_CEILING, ({ payload }) => {
  const days = Number(payload.capDaysOverride);
  if (!Number.isInteger(days) || days <= 0) {
    return {
      ok: false,
      reason:
        'PSL_CAP_NOT_A_DURATION: a validity cap is a whole number of days ' +
        'greater than zero. Enter the number of days this designation may run.',
    };
  }
  if (days <= PSL_CAP_CEILING_DAYS) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_CAP_ABOVE_CEILING: ${days} days exceeds the platform ceiling of ` +
      `${PSL_CAP_CEILING_DAYS} days. Record a cap within the ceiling, or take ` +
      'the longer term to whoever can move the ceiling.',
  };
});

bindPolicyHook(POLICY_HOOKS.PSL_CAP_JUSTIFICATION_AUTHORED, ({ payload }) => {
  if (authored(payload.capJustification) !== '') return { ok: true };
  return {
    ok: false,
    reason:
      'PSL_CAP_JUSTIFICATION_BLANK: an override with no justification is an ' +
      'unexplained exception. Write why this listing runs to a different cap ' +
      'from every other one, then record it again.',
  };
});

bindPolicyHook(POLICY_HOOKS.PSL_DEFAULT_CAP_WITHIN_CEILING, ({ payload }) => {
  const days = Number(payload.days);
  if (!Number.isInteger(days) || days <= 0) {
    return {
      ok: false,
      reason:
        'PSL_DEFAULT_CAP_NOT_A_DURATION: the portal default cap is a whole ' +
        'number of days greater than zero.',
    };
  }
  if (days <= PSL_CAP_CEILING_DAYS) return { ok: true };
  return {
    ok: false,
    reason:
      `PSL_DEFAULT_CAP_ABOVE_CEILING: ${days} days exceeds the platform ceiling ` +
      `of ${PSL_CAP_CEILING_DAYS} days. A default above the ceiling would be ` +
      'bounded on every read, which is a setting nobody could act on.',
  };
});
