// ─────────────────────────────────────────────────────────────────────────────
// WHO RAISES A CONTRACT — READ FROM THE FLOW, NEVER AUTHORED.
//
// ⚠️ **THIS EXISTS SO THE REFUSAL CANNOT DRIFT FROM THE DECLARATION.** #311
// re-declared all four contract verbs `surfaced: false · because: 'external-fact'
// · owner: 's4hana'`, and the surface never followed — `BuyerContracts` kept
// offering "New contract", kept minting `ctr-new-${Date.now()}`, and kept
// prepending a fabricated row to a list a reader believes. That is
// `CTR-FABRICATION-01`, and it is the same class as Arc C's notice one lane
// over: **a declaration that changed without its surface following.**
//
// The remedy is not to write "S/4HANA" into a locale file. It is to read the
// owner off `t_contract_draft` at render, so the day the operator re-rules the
// owner — or re-surfaces the verb — the refusal changes with it or stops
// rendering, with nobody editing this file.
//
// ⚠️ **AND IT REFUSES TO GUESS.** `null` is returned when the verb is surfaced,
// missing, or not-surfaced for a reason that names no owner. A fallback owner
// would be the silent mislabel `externalFactOwner.ts` exists to forbid, one
// layer up — and a refusal that names the wrong system is worse than no refusal,
// because a reader will go looking in it.
//
// ── ⚠️ THIS IS NOT A HANDOFF, AND THE DISTINCTION IS THE RULING ──────────────
//   `HandoffNotice` says A ROLE IS THE OBSTACLE — "Awaiting Finance" — and it
//   is right whenever the seat could hold the atom and does not. Here the seat
//   DOES hold `contract:draft` and the act still cannot happen, because the
//   LANE does not support it. Naming an owner-role there would say a colleague
//   is the obstacle when the obstacle is another system.
//
//   The precedent is Wave D's, re-asserted at `SupplierForecastsAdvance.test.
//   tsx:455`: *"the deferral is not a handoff notice. This seat HOLDS all three
//   atoms — naming an owner would say a role is the obstacle when the obstacle
//   is another machine."* Same distinction, different fact, and
//   `pages-v2/contracts/contractRaisedElsewhere.test.tsx` asserts BOTH halves
//   on one surface: the
//   `New contract` entry point DOES render a handoff when the seat lacks
//   `contract:draft` (a role obstacle, correctly named), and the terminal panel
//   NEVER does (a lane obstacle, correctly not).

// ── ⚠️ WHY THIS LIVES IN `services/transitions/` AND NOT BESIDE THE PAGE ──
//   It was written at `pages-v2/contracts/` — next to its only consumer, which
//   is where it reads best — and `surfaceable.test.ts` went RED on it:
//
//     t_contract_draft — declared NOT surfaced (external-fact) yet an
//     operator can fire it
//
//   **Nothing here dispatches anything.** That census marks a transition
//   operator-firable when a file under `pages-v2/` or `components/` CONTAINS
//   its quoted id; it PREFERS a `transitionId: '<id>'` site in its sort, but
//   does not REQUIRE one — so a module that merely NAMES a verb, in order to
//   read who owns it, is indistinguishable from one that fires it. §83's class
//   exactly: a scan matched a mention and the conclusion needed a dispatch.
//
//   ⚠️ **THE GATE IS NOT WIDENED TO ACCOMMODATE THIS, DELIBERATELY.** Requiring
//   a dispatch shape would NARROW a census whose whole value is that it errs
//   toward catching a path nobody intended, and a blind spot bought to silence
//   one true-negative is a bad trade (heuristic rule 2). The module moves
//   instead: asking the registry who owns a verb is a transitions question, and
//   this is where transitions questions live. **The false positive is filed,
//   not fixed** — the next module that names a verb id from a surface file will
//   trip it again, and should move rather than widen.
// ─────────────────────────────────────────────────────────────────────────────

import { getFlow } from './registry';
import type { ExternalFactOwner } from './schema';

/** The transition that would raise a contract, if Paragon raised contracts. */
export const CONTRACT_DRAFT_TRANSITION = 't_contract_draft';

/**
 * WHICH SYSTEM OWNS RAISING A CONTRACT — or `null` if this tree no longer says
 * that anybody outside Paragon does.
 *
 * Read at call time rather than frozen into a const: the registry is the
 * authority, and a module-scope snapshot would be a second copy of a
 * declaration whose whole point is that it can be re-ruled.
 */
export function contractDraftOwner(): ExternalFactOwner | null {
  const flow = getFlow('contract');
  const draft = flow?.transitions.find((t) => t.id === CONTRACT_DRAFT_TRANSITION);
  if (!draft) return null;
  const s = draft.surfaceable;
  // The discriminated union does the work: only the `external-fact` arm carries
  // an owner, so there is no branch here in which a name is invented.
  if (s.surfaced) return null;
  if (s.because !== 'external-fact') return null;
  return s.owner;
}
