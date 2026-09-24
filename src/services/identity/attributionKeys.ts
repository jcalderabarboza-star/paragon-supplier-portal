// ─────────────────────────────────────────────────────────────────────────────
// THE ATTRIBUTION KEYS — C10 §6.2's payload refusal, GENERALISED (R-PAYLOAD).
//
// §6.2 has two halves and records that the second is the one that gets
// forgotten: the resolved actor comes from the SESSION, and **a payload-supplied
// `RESOLVED` actor is REFUSED BY NAME ON WRITE** — *"not ignored, not
// overwritten, not silently replaced by the session's. Refused, loudly."*
//
// It shipped for ONE verb (`PR_APPROVAL_ATTRIBUTED`, `policies.ts`) and for one
// key. This is the generalisation, and it sits in the DISPATCHER rather than in
// a policy hook per flow, because a per-flow hook is a list and a list decays
// silently every time a flow is added. The dispatcher sees every verb.
//
// ⚠️ **THE POPULATION IS DERIVED FROM THE TYPE, NOT FROM THE WRITE SITES — AND
// THE FIRST DERIVATION WAS WRONG IN EXACTLY THE WAY RULE 1 PREDICTS.** Grepping
// `\w+By:\s*scope\.actor` returns SIX keys and reads like an answer. It misses
// `proposedBy`, `publishedBy` and `capDecidedBy`, because `MockCommandService`
// assigns those through a local (`const actor: ActorAttribution = scope.actor ??
// NO_PERSON`) rather than inline — `RESOLVE-NON-LITERAL-IDS-01`, on a census of
// write sites instead of one of dispatch ids. It also misses `setBy` and
// `overriddenBy`, which are not written from `scope.actor` at all yet.
//
// So the population is **every field in the tree declared `ActorAttribution`**,
// which is the property that actually matters: a key under which a `RESOLVED`
// actor could come to rest. `attributionKeys.test.ts` re-derives that set from
// source every run and pins it EQUAL to this array in both directions, so a
// twelfth attributed field cannot be added without either joining this list or
// turning the suite red.
//
// ⚠️ **REFUSED BY KEY, NEVER BY VALUE-SHAPE**, on the shipped precedent's own
// reasoning: *"Refusing only a well-formed `RESOLVED` actor would let a
// malformed one through to be dropped silently, which is the same silent
// correction wearing a type error."* The caller has no business writing any of
// these keys at all — the payload is not where attribution lives.
//
// ⚠️ **AN `UNATTRIBUTED` SESSION ACTOR STAYS LEGAL, AND MUST.** This refuses a
// payload KEY; it says nothing about what `scope.actor` may be. An
// `UNATTRIBUTED` actor is a claim about a FAILURE TO RESOLVE, which is exactly
// what this platform has today and exactly what makes the gap countable.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every payload key under which a `RESOLVED` actor could arrive.
 *
 * Pinned EQUAL — both directions — to the fields declared `ActorAttribution`
 * in `src/`, derived from source by `attributionKeys.test.ts`. This array is
 * the runtime half of that bilateral assertion, never an independent list.
 */
export const ATTRIBUTION_KEYS: readonly string[] = Object.freeze([
  // ⚠️ **`approvedBy` AND `attribution` WERE BOTH MISSING FROM THE FIRST DRAFT
  // OF THIS ARRAY, AND THE BILATERAL PIN IS WHAT FOUND THEM.** That is the pin
  // earning its place rather than decorating the file:
  //
  //   · `approvedBy` (`data/types.ts`) was already refused — by
  //     `PR_APPROVAL_ATTRIBUTED`, a policy hook on ONE verb. The whole point of
  //     this array is that the refusal stops being per-verb, and the hand-written
  //     first draft reproduced the very gap it was written to close.
  //   · `attribution` (`transitions/events.ts`) is C10 §6.4's event field. The
  //     dispatcher mints it from the TRIGGER and no payload reaches it today —
  //     but it is a field on a stored record, which is this array's stated rule,
  //     and an exception argued once is an exception argued again later.
  'approvedBy',
  'attribution',
  'by',
  'capDecidedBy',
  'decidedBy',
  'declaredBy',
  'grantedBy',
  'overriddenBy',
  'proposedBy',
  'publishedBy',
  'rejectedBy',
  'setBy',
  'submittedBy',
]);

const KEYS: ReadonlySet<string> = new Set(ATTRIBUTION_KEYS);

/**
 * Which attribution keys does this payload carry? Empty when it is clean.
 *
 * ⚠️ **PRESENCE, NOT TRUTHINESS.** `'setBy' in payload` is the test, so
 * `{ setBy: undefined }` is refused too. A caller that wrote the key meant to
 * write the key, and a boundary that let an undefined one through would admit
 * exactly the request a forging caller sends after its first refusal.
 */
export function attributionKeysIn(
  payload: Readonly<Record<string, unknown>>,
): readonly string[] {
  return ATTRIBUTION_KEYS.filter((k) => k in payload);
}

/** Is this key one under which an actor could arrive? */
export function isAttributionKey(key: string): boolean {
  return KEYS.has(key);
}
