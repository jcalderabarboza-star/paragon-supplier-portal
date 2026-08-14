// ─────────────────────────────────────────────────────────────────────────────
// §43 · THE SETTLE-FAULT VOCABULARY — closed, derived type, classified AT THE
// BOUNDARY.
//
// ⚠️ **WHY THIS IS NOT IN `registry.ts`, WHICH IS WHERE THE ERRORS ARE THROWN.**
// The ruling that ordered this split named the throw site: `registry.ts` raises
// three BARE `Error`s (`:25` duplicate flow key, `:30` duplicate transition id,
// `validate.ts:169` malformed flow), so a caller cannot tell a permanent
// misconfiguration from a runtime failure — neither is typed. Typing them THERE
// would have made a leaf module import the dispatcher's error vocabulary: the
// registry is imported by the flows, the catalog view, the flow graph and the
// census gates, none of which command anything. **The general form, and it is
// the finding:**
//
//   THE SPLIT IS A PROPERTY OF HOW A FAILURE IS HANDLED, NOT OF WHERE IT WAS
//   THROWN.
//
// The dispatcher's settle boundary already imports `DataError` and already
// catches everything, so classifying THERE gets the same distinction with no
// new coupling and no edit to any leaf.
//
// ── ⚠️ WHAT THIS CAN AND CANNOT SEE, STATED RATHER THAN IMPLIED ─────────────
//   The boundary can see whether a throw came through the GOVERNED failure
//   channel (`DataError`) and, if so, whether its code is one the dispatcher
//   ITSELF constructs. It CANNOT see permanent-versus-transient inside the
//   ungoverned class: a `TypeError` from a target and a hypothetical socket
//   reset both arrive as a bare `Error` carrying nothing that separates them.
//   So `UNGOVERNED` is named for what is TRUE of it — it did not come through
//   the governed channel — and NOT for a permanence this code cannot observe.
//   Inventing a `MISCONFIGURED` member would be a member with no definition,
//   which is exactly what GL-0's satisfies-pin exists to stop.
//
//   The RULING still lands, through `SETTLE_FAULT_RETRYABLE`: `UNGOVERNED`
//   defaults to NOT retryable. A permanent misconfiguration cannot read as a
//   retryable blip, because nothing ungoverned is offered as retryable at all.
// ─────────────────────────────────────────────────────────────────────────────

import { DataError } from '../data/types';
import type { DataErrorCode } from '../data/types';

/**
 * THE THREE. Each member is a predicate over what actually reached the catch,
 * not a guess about what caused it. Pinned bilaterally by `settleFaults.test.ts`:
 * a member the classifier can never return is red, and an input the classifier
 * cannot place is red.
 */
export const SETTLE_FAULTS = [
  /**
   * A `DataError` carrying one of the codes THE DISPATCHER ITSELF constructs.
   * A governed refusal that travelled by throw rather than by return — the
   * world said no, and it said no in the vocabulary.
   */
  'REFUSED',
  /**
   * A `DataError` carrying any OTHER code. The data layer's own failure
   * channel: a transport that did not answer, or the dev fault injector.
   */
  'TRANSPORT',
  /**
   * Not a `DataError` at all — it did not come through the governed channel.
   * This is where `registry.ts`'s three bare `Error`s land.
   */
  'UNGOVERNED',
] as const;

/** The closed settle-fault vocabulary. DERIVED — never hand-listed again. */
export type SettleFault = (typeof SETTLE_FAULTS)[number];

/**
 * The codes `dispatcher.ts` constructs itself — `SCOPE_DENIED` (`:221`, `:229`,
 * `:239`) and `NOT_FOUND` (`:242`). **Derived from the throw sites and pinned**
 * (`settleFaults.test.ts`), so a third dispatcher throw code cannot be laundered
 * into `TRANSPORT` by being forgotten here.
 *
 * ⚠️ This is why the split keys on the CODE and not on `instanceof DataError`.
 * Under F1 `httpDataService` will throw `DataError('UPSTREAM', …)` for a dead
 * backend; an `instanceof` test would file that as a governed refusal, which is
 * the exact misreading the ruling forbids, arriving from the exact direction
 * that makes the split worth having.
 */
export const DISPATCHER_THROWN_CODES: readonly DataErrorCode[] = Object.freeze([
  'NOT_FOUND',
  'SCOPE_DENIED',
]);

const DISPATCHER_CODES: ReadonlySet<string> = new Set(DISPATCHER_THROWN_CODES);

/** Whether re-attempting the settle can help. ONE place, derived from the class. */
export const SETTLE_FAULT_RETRYABLE: Readonly<Record<SettleFault, boolean>> = Object.freeze({
  // The governed answer does not change on a second ask.
  REFUSED: false,
  // The only class where the next attempt can legitimately differ.
  TRANSPORT: true,
  // Not retryable BY DEFAULT and deliberately so — see the header.
  UNGOVERNED: false,
});

/** Classify a throw caught at the settle boundary. TOTAL over `unknown`. */
export function classifySettleFault(err: unknown): SettleFault {
  if (err instanceof DataError) {
    return DISPATCHER_CODES.has(err.code) ? 'REFUSED' : 'TRANSPORT';
  }
  return 'UNGOVERNED';
}

/**
 * The detail half of the wire value: what the throw called itself. A
 * `DataError`'s own code, else the constructor name — never the MESSAGE, which
 * is free-form prose and would put a stringly matcher back in the vocabulary.
 */
export function settleFaultDetail(err: unknown): string {
  if (err instanceof DataError) return err.code;
  const ctor = (err as { constructor?: { name?: unknown } } | null | undefined)?.constructor?.name;
  return typeof ctor === 'string' && ctor !== '' ? ctor : 'unknown';
}

const MEMBERS: ReadonlySet<string> = new Set(SETTLE_FAULTS);

/**
 * Build a settle-fault wire value for `TransitionEvent.reason`. Same shape as
 * `refusal()` — `PREFIX` or `PREFIX:detail` — and deliberately a SEPARATE
 * vocabulary from `COMMAND_REFUSALS`, which is documented as the dispatcher's
 * refusal PRECEDENCE over the linear validation path. These fire post-apply, on
 * a second act, and appending them there would have made that ordering claim
 * false.
 */
export function settleFault(kind: SettleFault, detail?: string): string {
  return detail === undefined || detail === '' ? kind : `${kind}:${detail}`;
}

/**
 * The total function from a wire value back to its kind — `null` when the
 * string was not produced by `settleFault()`.
 *
 * ⚠️ `null` IS A REAL ANSWER, for the same reason `refusalKindOf`'s is:
 * `TransitionEvent.reason` also carries `COMMAND_REFUSALS` values, and folding
 * one vocabulary into the other would make a census of either silently wrong.
 */
export function settleFaultKindOf(reason: string | undefined): SettleFault | null {
  if (!reason) return null;
  const head = reason.split(':', 1)[0];
  return MEMBERS.has(head) ? (head as SettleFault) : null;
}
