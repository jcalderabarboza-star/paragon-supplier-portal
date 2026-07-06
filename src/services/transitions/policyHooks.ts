// ────────────────────────────────────────────────────────────────────────────
// Policy-hook NAME registry (v2.2 Step 3.1).
//
// Flow definitions reference policy hooks BY NAME (never as embedded closures),
// so the metadata stays serialisable and inspectable. The dispatcher (Step 3.4)
// binds each name to its implementation. This module owns the allowlist of known
// names; `validate.ts` rejects any flow referencing an unregistered hook.
// ────────────────────────────────────────────────────────────────────────────

const REGISTERED = new Set<string>();

/** Register a policy-hook name so flows may reference it. Idempotent. */
export function registerPolicyHook(name: string): void {
  REGISTERED.add(name);
}

/** True if `name` has been registered. */
export function isRegisteredPolicyHook(name: string): boolean {
  return REGISTERED.has(name);
}

/** All registered hook names, sorted (for inspection / tests). */
export function getRegisteredPolicyHooks(): readonly string[] {
  return [...REGISTERED].sort();
}

// — Seed hooks referenced by the shipped flows ───────────────────────────────
// Named business rules; the dispatcher binds each name to its implementation at
// Step 3.4. Registered eagerly on import so a flow that references one validates.
export const POLICY_HOOKS = {
  /** PO confirm: each confirmed line qty must be > 0 and ≤ the ordered qty. */
  PO_CONFIRM_QTY_WITHIN_ORDERED: 'po_confirm_qty_within_ordered',
  /** ASN create: the parent PO (payload.poReference) must be Confirmed. */
  ASN_CREATE_PO_CONFIRMED: 'asn_create_po_confirmed',
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);
