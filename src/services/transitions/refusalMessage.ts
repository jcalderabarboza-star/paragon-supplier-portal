// ─────────────────────────────────────────────────────────────────────────────
// THE REFUSAL-CODE TRANSLATOR — the one route from a dispatcher wire value to
// the prose the glossary already holds for it.
//
// ⚠️ **WHAT WAS ON THE SCREEN.** Browser QA on `SupplierOrders`, commercial
// seat: *"The order could not be confirmed (ROLE_NOT_PERMITTED:po:confirm)"*.
// The refusal arrives through `onSuccess` — the mutation RESOLVES carrying
// `{status:'failed', reason}` — and the copy interpolated `reason` verbatim, so
// a supplier read a dispatcher constant in both languages. `refusalKindOf` was
// the total function from that wire value back to its kind and
// `COMMAND_REFUSAL_GLOSSARY` already defined all nine in EN and ID; the two had
// simply never been introduced. **This module is that introduction, and it adds
// no vocabulary of its own** — no tenth kind, no second copy of the prose.
//
// ── ⚠️ THE DETAIL IS RETAINED, AND THAT IS NOT A PREFERENCE ─────────────────
//   Four of the nine definitions FORWARD-REFER to the suffix in their own
//   words: `ROLE_NOT_PERMITTED` says *"Someone holding **the named role** must
//   do it"*, `ILLEGAL_TRANSITION` *"**names the state** it is actually in"*,
//   `MISSING_FIELDS` *"**names each missing field**"*, `POLICY_REJECTED`
//   *"**names which rule** and … why"*. Rendering the sentence WITHOUT the
//   suffix would turn each of those into a promise with nothing behind it —
//   `FORWARD-PROMISE-HAS-NO-HANDLER-01`, manufactured by the very change that
//   was meant to make the refusal readable. So the head is replaced by prose
//   and the detail is kept beside it.
//
//   Derived, not assumed: SEVEN of the nine carry a detail and TWO are bare
//   (`UNKNOWN_TRANSITION`, `MISSING_ENTITY_ID`) — read off the nine `refusal()`
//   construction sites in `dispatcher.ts`, which are the only producers of
//   `CommandResult.reason` in this tree.
//
// ── ⚠️ `null` IS THE HONEST ANSWER, AND EVERY CALLER'S FALLBACK SURVIVES ────
//   An unrecognised head returns `null`, NOT a guessed member and NOT a
//   generic apology. `CommandResult.reason` is typed `string` and a future
//   producer may put anything in it; laundering a foreign string into this
//   vocabulary would make the refusal READ as governed when it was not — the
//   `UNRECOGNISED_MODE` lesson, one layer over, and the same argument
//   `refusalKindOf` makes for its own `null`.
//
//   The consequence at the call sites is the point: every one of them reads
//   `describeRefusal(...) ?? <exactly what it did before>`, so an unrecognised
//   or absent reason renders BYTE-IDENTICALLY to today. The translator can only
//   ever ADD a sentence it can defend; it can never absorb one.
// ─────────────────────────────────────────────────────────────────────────────

import { refusalKindOf } from './refusals';
import { POLICY_HOOKS } from './policyHooks';
import { COMMAND_REFUSAL_GLOSSARY, DATA_ERROR_GLOSSARY } from '../../lib/glossary';

/**
 * The locale split used by the glossary page (`pages-v2/Glossary.tsx`), copied
 * as a predicate rather than as a second convention: an `i18n.language` of
 * `id`, `id-ID` or `ID` all mean Indonesian, and anything else falls to EN.
 */
function indonesian(language: string | undefined): boolean {
  return language?.toLowerCase().startsWith('id') ?? false;
}

/**
 * The suffix a refusal carries after its kind — the role atom, the state pair,
 * the field list, the hook name and its reason. Empty for the two bare members
 * and for any reason that is not a refusal at all.
 */
/**
 * The OTHER half of the same problem, and it is a different vocabulary rather
 * than a tenth member of the one above.
 *
 * ⚠️ **A DISPATCHER REFUSAL IS RETURNED; A SCOPE REFUSAL IS THROWN.** The nine
 * `COMMAND_REFUSALS` arrive as `CommandResult.reason` and read
 * `KIND:detail` — which is what `refusalKindOf` splits on. A `DataError` does
 * not: `dispatcher.ts` throws `SCOPE_DENIED` with the message *"creation of
 * supplierDocument denied: unresolved owner"*, whose head is a sentence and
 * matches no member, so `describeRefusal` correctly returns `null` and the
 * caller falls back to the raw string.
 *
 * **Measured in browser QA (Wave E), not predicted:** an Indonesian operator
 * whose request was refused read an English sentence assembled out of a
 * dispatcher constant — the `ROLE_NOT_PERMITTED:po:confirm` defect that
 * created this module, reappearing through the door it does not cover. The
 * code is already on the error and `DATA_ERROR_GLOSSARY` already defines every
 * member in EN and ID; as with `describeRefusal`, **this adds no vocabulary of
 * its own** and returns `null` for anything it does not own, so every caller's
 * existing fallback survives byte-for-byte.
 */
export function describeDataError(
  code: string | undefined,
  language: string | undefined,
): string | null {
  if (!code) return null;
  const entry = (DATA_ERROR_GLOSSARY as Record<string, { en: string; id: string }>)[code];
  if (!entry) return null;
  return indonesian(language) ? entry.id : entry.en;
}

export function refusalDetailOf(reason: string | undefined): string {
  const kind = refusalKindOf(reason);
  if (!kind || !reason || reason.length <= kind.length + 1) return '';
  return reason.slice(kind.length + 1);
}

/**
 * A dispatcher refusal, in the reader's language, with its detail kept.
 *
 * Returns `null` when the reason is absent or was not produced by `refusal()` —
 * the caller then renders whatever it rendered before, which is why adopting
 * this helper cannot change what an unrecognised refusal says.
 */
export function describeRefusal(
  reason: string | undefined,
  language: string | undefined,
): string | null {
  const kind = refusalKindOf(reason);
  if (!kind) return null;
  const entry = COMMAND_REFUSAL_GLOSSARY[kind];
  const sentence = indonesian(language) ? entry.id : entry.en;
  const detail = refusalDetailOf(reason);
  return detail ? `${sentence} (${detail})` : sentence;
}

/** The hook ids `POLICY_HOOKS` declares — the only legal right-hand side below. */
export type PolicyHookId = (typeof POLICY_HOOKS)[keyof typeof POLICY_HOOKS];

/**
 * Did this dispatch fail because ONE NAMED policy hook said no?
 *
 * ⚠️ **A POLICY-HOOK REASON IS NESTED, AND TESTING IT BY ITS HEAD IS ALWAYS
 * FALSE.** `dispatcher.ts` builds the wire value as
 * `POLICY_REJECTED:<hook>:<the hook's own reason>`, so a code the hook itself
 * emits — `UNDECLARED_MATERIAL`, `UNKNOWN_MATERIAL` — sits behind a prefix
 * dozens of characters long. Two shipped surfaces tested those codes with
 * `reason.startsWith('UNDECLARED_MATERIAL')` and
 * `reason.startsWith('UNKNOWN_MATERIAL')`; **both conditions were structurally
 * unsatisfiable**, so two remedial sentences with full EN+ID copy had never
 * once rendered. Neither guard could ever have been noticed failing, because a
 * guard that never fires and a guard whose case never arises are the same
 * observation from outside.
 *
 * ⚠️ **THE PREFIX IS BUILT FROM THE HOOK CONSTANT, NEVER RETYPED** — the shape
 * `quotationSubmitModel` already got right, promoted here so there is ONE
 * construction rather than a third copy. A renamed hook then breaks the type,
 * not the behaviour: retyping the id is how the surface's message silently
 * detaches from the refusal it explains.
 *
 * This deliberately identifies the HOOK, not the code inside its reason. The
 * hook is what the dispatcher names and what the type can check; the code is
 * free text the hook may reword. Where a hook has exactly one refusal — as
 * both of these do — the two are equivalent and only one of them is checkable.
 */
export function refusedByPolicy(
  reason: string | undefined,
  hook: PolicyHookId,
): boolean {
  return reason?.startsWith(`POLICY_REJECTED:${hook}:`) ?? false;
}
