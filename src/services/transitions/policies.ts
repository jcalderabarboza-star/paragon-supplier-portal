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

const BINDINGS = new Map<string, PolicyHookFn>();

export function bindPolicyHook(name: string, fn: PolicyHookFn): void {
  BINDINGS.set(name, fn);
}

export function resolvePolicyHook(name: string): PolicyHookFn | undefined {
  return BINDINGS.get(name);
}

// — PO confirm: each confirmed line qty must be > 0 and ≤ the ordered qty, and
//   the confirmation must cover every line (count matches). ————————————————————
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
    if (typeof q !== 'number' || q <= 0 || q > ordered) {
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
