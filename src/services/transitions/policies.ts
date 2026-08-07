// ────────────────────────────────────────────────────────────────────────────
// Policy-hook BINDINGS (v2.2 Step 3.4) — resolve a registered hook NAME to its
// function. `policyHooks.ts` owns the name allowlist (schema-time); this module
// binds each name to its runtime implementation, which the dispatcher resolves.
// Kept separate so flow metadata stays serialisable (names, never closures).
// ────────────────────────────────────────────────────────────────────────────

import type { PurchaseOrder, Invoice } from '../data/types';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';
import type { PolicyHookFn } from './dispatcher';
import { POLICY_HOOKS } from './policyHooks';
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
  type EnforcementSetting,
} from '../../lib/enforcement';

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
const enforcementSetGoverned: PolicyHookFn = ({ entityId, payload, target }) => {
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
  const actor = asActorAttribution(payload.setBy);
  if (!actor) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`,
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
  if (rigour(mode) < rigour(baseline) && !isAttributed(actor)) {
    return {
      ok: false,
      reason: `loosening ${entityId} from ${baseline} to ${mode} requires a NAMED actor (setBy.kind is UNATTRIBUTED: ${actor.reason})`,
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.ENFORCEMENT_SET_GOVERNED, enforcementSetGoverned);
