// ─────────────────────────────────────────────────────────────────────────────
// GL-0 · THE DISPATCHER'S REFUSAL VOCABULARY — closed, frozen, derived type.
//
// ⚠️ **THIS RETIRES THE STRINGLY-REASON CLASS.** `CommandResult.reason` is
// documented *"the machine-readable rejection reason"* and is typed
// `reason?: string` — **FREE-FORM, AND MACHINE-READABLE BY GREP ONLY.** Nine
// templated prefixes were assembled inline at nine call sites in
// `dispatcher.ts`, so nothing could enumerate them, nothing could translate
// them, and a tenth could be introduced by typing a new string literal.
//
// The `ENFORCEMENT_MODES` treatment, exactly: a frozen array is the ONE
// vocabulary, the type DERIVES from it, and the members are constructed here
// rather than spelled at the call site.
//
// ── ⚠️ THE TYPE STAYS `string`, AND THAT IS DELIBERATE ──────────────────────
//   `CommandResult.reason` is NOT narrowed to `CommandRefusal`. The wire value
//   is `PREFIX` or `PREFIX:detail` — the detail is runtime data (a role name, a
//   state pair, a field list), so the full string is not a member of any closed
//   set and never can be. What IS closed is the PREFIX, and `refusalKindOf`
//   is the total function from the wire value back to it. Narrowing the field
//   would have forced the detail out of the reason and into a second field
//   nothing reads — a bigger change, and not this batch's (GL-1 owns the
//   refusal SITES).
//
// ── WHY IT MATTERS BEYOND TIDINESS ──────────────────────────────────────────
//   `HALAL-REFUSAL-DEAD-ENDS-01`: a refusal that tells you only that you are
//   stuck. A refusal cannot acquire a definition, a translation, or a remedy
//   route until something can NAME the set of refusals. This is that naming.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * THE CLOSED SET. **Deliberately not counted here** — the sentence that stood
 * in this spot opened *"THE NINE"* and there are ten as of 1c
 * (`FLOOR-IN-PROSE-01`: a cardinality in prose above the array that is the
 * cardinality). Derived from `dispatcher.ts` and pinned by `refusals.test.ts` in
 * BOTH directions: a prefix constructed there and missing here is red, and a
 * member here that the dispatcher never constructs is red. **The list cannot
 * drift from the code that emits it**, which is the whole reason it is worth
 * having (`ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01` — the derivation is
 * authority; this array is the pinned copy, not the source).
 *
 * Ordered as the dispatcher evaluates them, so the array doubles as the refusal
 * PRECEDENCE: an input can fail several of these at once and the caller sees
 * the first. That ordering is a fact about the machine, not a formatting
 * choice — do not sort this array.
 *
 * ⚠️ **AND AS OF 1c THE ORDER IS GATED RATHER THAN ASSERTED IN THIS COMMENT.**
 * `refusals.test.ts` now derives the dispatcher's CONSTRUCTION ORDER from
 * source and pins it to this array position for position. Before that, both
 * directions of the membership check were gated and the ORDER — the half the
 * comment calls "a fact about the machine" — was enforced by nothing, so a
 * tenth kind could have been appended to the end while being evaluated fourth
 * and no test would have noticed.
 *
 * ⚠️ **THE SCOPE REFUSALS ARE NOT MEMBERS, AND THAT IS A REAL GAP IN THIS
 * PRECEDENCE.** `SCOPE_DENIED` and `NOT_FOUND` are THROWN `DataError`s, not
 * returned reasons, so they are absent here while being evaluated BEFORE
 * `ROLE_NOT_PERMITTED`. Read this array as the precedence of the RETURNED
 * refusals; the thrown pair sits ahead of all of them.
 */
export const COMMAND_REFUSALS = [
  /** No transition in the registry carries this id. */
  'UNKNOWN_TRANSITION',
  /** No CommandTarget is registered for this entity key. */
  'UNKNOWN_ENTITY',
  /** A non-creation command arrived without an entity id. */
  'MISSING_ENTITY_ID',
  /** The scope's roles do not include the transition's `requiredRole`. */
  'ROLE_NOT_PERMITTED',
  /**
   * The caller supplied `expectedState` and the entity is in a different one.
   *
   * ⚠️ **POSITION IS SEMANTIC.** It sits AFTER `ROLE_NOT_PERMITTED` so a caller
   * without the atom learns nothing about the document's state, and BEFORE
   * `ILLEGAL_TRANSITION` so a caller whose premise is stale is told THAT rather
   * than merely that the act is illegal — the two answers point at different
   * remedies, and folding this into `ILLEGAL_TRANSITION`'s detail string would
   * be the stringly-reason class GL-0 retired, reintroduced one layer down.
   */
  'STALE_STATE',
  /** The entity's current state is not in the transition's `from` set. */
  'ILLEGAL_TRANSITION',
  /** One or more `requiredFields` were absent or empty in the payload. */
  'MISSING_FIELDS',
  /** The transition names a policy hook that no registration resolves. */
  'UNBOUND_HOOK',
  /** A resolved policy hook returned `ok: false`. */
  'POLICY_REJECTED',
  /** A `creation` transition on a target that implements no `create`. */
  'UNSUPPORTED_CREATION',
] as const;

/** The closed refusal vocabulary. DERIVED — never hand-listed a second time. */
export type CommandRefusal = (typeof COMMAND_REFUSALS)[number];

const MEMBERS: ReadonlySet<string> = new Set(COMMAND_REFUSALS);

/**
 * Build a refusal wire value. `detail` is appended after a colon; omit it for
 * the two bare members. Constructing refusals HERE rather than at the call site
 * is what makes the vocabulary closed — a tenth kind now requires editing this
 * file, where the bilateral test can see it.
 */
export function refusal(kind: CommandRefusal, detail?: string): string {
  return detail === undefined || detail === '' ? kind : `${kind}:${detail}`;
}

/**
 * The total function from a wire value back to its kind — `null` when the
 * string was not produced by `refusal()`.
 *
 * ⚠️ **`null` IS A REAL ANSWER AND MUST STAY ONE.** `CommandResult.reason` is
 * typed free-form `string`, so any future producer may put anything in it, and
 * defaulting an unrecognised reason to some member would launder a foreign
 * string into this vocabulary and make the census of refusals silently wrong —
 * the `UNRECOGNISED_MODE` lesson from `ENFORCEMENT_MODE_SOURCES`, one layer
 * over.
 *
 * ⚠️ **AND THE SHARPEST FOREIGN STRING IS ONE THAT LOOKS EXACTLY LIKE A
 * REFUSAL.** `SETTLE_FAULTS` is a deliberately SEPARATE vocabulary built by
 * `settleFault()` in the SAME `PREFIX` / `PREFIX:detail` shape, so a guessing
 * translator would render one vocabulary's wire value under the other's
 * definition. Nothing about the FORMAT distinguishes them; only membership
 * does, which is what this function tests.
 *
 * ⚠️ **CORRECTED — THE SENTENCE THAT STOOD HERE WAS MEASURED FALSE.** It read
 * that `CommandResult.reason` *"also carries … `settle()`'s SAP-boundary
 * outcomes"*. It does not: `settle()` returns `CommandStatus | null`, and
 * `CommandStatus` is `{ correlationId, transitionId, status, ts }` — there is no
 * `reason` field on it to carry them. Settle faults travel on
 * `TransitionEvent.reason`, a different field on a different object. The
 * CONCLUSION it supported was right, which is exactly what would have carried it
 * past a reader (`FALSE-MECHANISM-MUST-NOT-BE-FILED-01`), so it is replaced with
 * the true mechanism above rather than deleted.
 */
export function refusalKindOf(reason: string | undefined): CommandRefusal | null {
  if (!reason) return null;
  const head = reason.split(':', 1)[0];
  return MEMBERS.has(head) ? (head as CommandRefusal) : null;
}
