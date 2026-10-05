// ────────────────────────────────────────────────────────────────────────────
// SDC-3 · the supplier-collaboration refusal heads a surface renders in the
// seat's own language — the `deliveryRefusal.ts` shape. A dispatcher reason
// arrives as `POLICY_REJECTED:<hook>:<HEAD>: <sentence>`; the head is found
// anywhere in the string (the dispatcher owns the prefix), with its colon, so a
// head that is the start of a longer one cannot be matched by mistake.
//
// GATED IN BOTH DIRECTIONS by `sdcRefusal.test.ts`: every head the hooks emit
// has a key, and every key names a head a hook emits.
// ────────────────────────────────────────────────────────────────────────────

export const SDC_REFUSAL_KEYS: Readonly<Record<string, string>> = Object.freeze({
  RR_REVIEW_ACTOR_UNATTRIBUTED: 'sdc.refusal.reviewActorUnattributed',
  RR_REVISION_ALREADY_DRAFTED: 'sdc.refusal.revisionAlreadyDrafted',
});

/** The `sdc.refusal.*` key for a dispatcher reason, or `null`. */
export function sdcRefusalKey(reason: string | undefined): string | null {
  if (!reason) return null;
  for (const head of Object.keys(SDC_REFUSAL_KEYS)) {
    if (reason.includes(`${head}:`)) return SDC_REFUSAL_KEYS[head];
  }
  return null;
}
