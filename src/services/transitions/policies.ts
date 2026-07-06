// ────────────────────────────────────────────────────────────────────────────
// Policy-hook BINDINGS (v2.2 Step 3.4) — resolve a registered hook NAME to its
// function. `policyHooks.ts` owns the name allowlist (schema-time); this module
// binds each name to its runtime implementation, which the dispatcher resolves.
// Kept separate so flow metadata stays serialisable (names, never closures).
// ────────────────────────────────────────────────────────────────────────────

import type { PurchaseOrder } from '../data/types';
import type { PolicyHookFn } from './dispatcher';
import { POLICY_HOOKS } from './policyHooks';

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
