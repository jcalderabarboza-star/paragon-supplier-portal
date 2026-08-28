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
import { COMMAND_REFUSAL_GLOSSARY } from '../../lib/glossary';

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
