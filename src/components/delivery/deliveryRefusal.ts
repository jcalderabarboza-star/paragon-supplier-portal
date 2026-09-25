// ─────────────────────────────────────────────────────────────────────────────
// A DELIVERY REFUSAL, IN THE READER'S LANGUAGE.
//
// `pslRefusal.ts`'s shape, copied with its reasons rather than re-derived. The
// dispatcher's `describeRefusal` owns the generic refusal KINDS and correctly
// renders a policy rejection as *"a rule refused this"* plus the hook's own
// English sentence — a sentence written for a developer reading an audit trail,
// and English in both locales. Browser QA (Wave E) found an Indonesian operator
// reading exactly such a sentence; that is why this pattern exists and why a
// lane with five new hooks adopts it in the same batch as the hooks.
//
// ── ⚠️ KEYED TO THE REFUSAL HEAD, NEVER TO A SUBSTRING OF THE PROSE ────────
//   Every delivery hook refuses with `<HEAD>: <sentence>`. The HEAD is the
//   stable part — a test can pin it — and the sentence is free to be rewritten.
//   Matching the prose would make every copy edit a silent behaviour change.
//
// ── ⚠️ AND `SAMPLE_ACTOR_CANNOT_LOOSEN` IS DELIBERATELY NOT HERE ───────────
//   It names a PERSON, so it belongs to `PERSON_NAMING_REFUSAL_KEYS` — the map
//   whose gate asserts that a person-naming refusal renders through the ONE
//   resolver, with the `(SAMPLE)` marker, and never prints a raw `personId`.
//
//   ⚠️ **AND IT WAS EXEMPT FROM THAT GATE UNTIL THIS BATCH, ON A PREMISE THIS
//   BATCH FALSIFIES.** The exemption read *"UNREACHABLE — no surface dispatches
//   `t_enforcement_set`"*, which was true and is still true. But the head is
//   emitted by a SECOND hook now, `delivery_policy_governed`, and that one IS
//   reachable: the tolerance editor on the contract's Delivery Agreements tab
//   dispatches it. The derivation returns a SET of heads, so the exemption
//   would have covered the new emission silently — the gate would have stayed
//   green while a `sim-usr-*` id reached an operator's screen. The exemption is
//   removed and the head is owned. That is the one door that file holds open,
//   and this batch is what walked up to it.
//
// ── ⚠️ `null` IS THE HONEST ANSWER AND EVERY FALLBACK SURVIVES ─────────────
//   An unrecognised reason returns `null`, so a call site reads
//   `deliveryRefusalKey(r) ?? personNamingRefusalKey(r) ?? refusalText(r) ?? r`
//   and an unrecognised refusal renders exactly as it would have without this
//   module. A translator that absorbed a foreign string would make an
//   ungoverned refusal READ as governed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The refusal heads the delivery hooks emit, each mapped to its
 * `delivery.refusal.*` key.
 *
 * ⚠️ **GATED IN BOTH DIRECTIONS** by `deliveryRefusal.test.ts`, which derives
 * every head `policies.ts` actually emits from the delivery hooks: every
 * emitted head must have a key (a new hook cannot ship untranslated), and every
 * key must name an emitted head (a key cannot outlive its refusal —
 * `FORWARD-PROMISE-HAS-NO-HANDLER-01`). A one-sided assertion would pass over
 * an empty map (§39).
 */
export const DELIVERY_REFUSAL_KEYS: Readonly<Record<string, string>> = Object.freeze({
  DELIVERY_ACTOR_UNATTRIBUTED: 'delivery.refusal.actorUnattributed',
  DELIVERY_RELEASE_BACKDATED: 'delivery.refusal.releaseBackdated',
  DELIVERY_ADJUST_EMPTY: 'delivery.refusal.adjustEmpty',
  DELIVERY_ADJUST_QTY_NOT_A_QUANTITY: 'delivery.refusal.adjustQtyNotANumber',
  DELIVERY_ADJUST_DATE_UNREADABLE: 'delivery.refusal.adjustDateUnreadable',
  DELIVERY_ADJUST_DATE_BACKDATED: 'delivery.refusal.adjustDateBackdated',
  DELIVERY_ALREADY_CONFIRMED: 'delivery.refusal.alreadyConfirmed',
  DELIVERY_NOTHING_TO_CONFIRM: 'delivery.refusal.nothingToConfirm',
  DELIVERY_POLICY_MODE_UNKNOWN: 'delivery.refusal.policyModeUnknown',
  DELIVERY_POLICY_TOLERANCE_NOT_A_NUMBER: 'delivery.refusal.policyToleranceNotANumber',
  DELIVERY_POLICY_REASON_BLANK: 'delivery.refusal.policyReasonBlank',
  DELIVERY_POLICY_NO_CHANGE: 'delivery.refusal.policyNoChange',
  DELIVERY_POLICY_LOOSENING_UNATTRIBUTED: 'delivery.refusal.policyLooseningUnattributed',
});

/**
 * The `delivery.refusal.*` key for a dispatcher reason, or `null`.
 *
 * The reason arrives as `POLICY_REJECTED:<hook>:<HEAD>: <sentence>`, so the head
 * is looked for anywhere in the string rather than at position zero — the
 * dispatcher owns the prefix and may change how it composes one.
 */
export function deliveryRefusalKey(reason: string | undefined): string | null {
  if (!reason) return null;
  for (const head of Object.keys(DELIVERY_REFUSAL_KEYS)) {
    // ⚠️ THE COLON IS LOAD-BEARING. Without it `DELIVERY_ADJUST_DATE_UNREADABLE`
    // could be found inside a longer head that happens to start with it, and
    // `DELIVERY_ACTOR_UNATTRIBUTED` shares its first two words with two others.
    if (reason.includes(`${head}:`)) return DELIVERY_REFUSAL_KEYS[head];
  }
  return null;
}
