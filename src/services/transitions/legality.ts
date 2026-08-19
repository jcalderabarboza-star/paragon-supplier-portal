// ────────────────────────────────────────────────────────────────────────────
// WHAT CAN A SURFACE OFFER FROM HERE — legality, derived from the machine.
//
// Reads `surfaceable` since §51. See the note on `userVerbsFrom` for why that is
// not a correction of an error.
//
// ⚠️ **THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE.** `BuyerInvoices` chose its
// footer verb from a hand-authored `Record<BuyerInvoiceStatus, string>` keyed on
// the PROJECTION LABEL. The projection is lossy ON PURPOSE — `toBuyerLabel`
// collapses `Approved` to `Overdue` once the due date passes (DR-8, a clock
// derivation, law 0.5) — so the surface asked a question the label could not
// answer and got a confident wrong answer: **`Escalate` (a toast) on an invoice
// the machine says is releasable.** Both of the tree's Approved invoices are
// past due, so that was 2 of 2 — the release affordance was unreachable at the
// real clock while its spec stayed green under a pinned one.
//
// The rule the seam encodes: **LEGALITY IS A QUESTION FOR THE MACHINE, ASKED
// WITH THE CANONICAL STATE.** A display label may summarise, colour, sort or
// warn; it may never be the input to "what may I do?". Aging is a display axis;
// release legality is a machine fact; the old code fused them and the fusion is
// what decayed.
//
// Pure and total: no registry mutation, no clock, no scope. Callers pass the
// canonical state they hold.
// ────────────────────────────────────────────────────────────────────────────

import type { PersonaType } from '../../context/CurrentIdentityContext';
import type { TransitionDef } from './schema';
import { getFlow } from './registry';
import { PERSONA_ROLES, personaCan } from './roles';

/**
 * Every transition a SURFACE MAY OFFER from `state` on `entity`, in declaration
 * order, derived from the registered flow.
 *
 * ⚠️ **THE FILTER IS `surfaceable`, AND THE FUNCTION WAS NEVER WRONG TO HAVE
 * READ `trigger` BEFORE.** This shipped filtering on `trigger === 'user'`, and
 * that was the correct implementation of this function's purpose — *verbs a
 * human should reach* — for as long as ONE FIELD ANSWERED BOTH QUESTIONS. §50
 * split them: `trigger` says what FIRES an act, `surfaceable` says whether a
 * Paragon screen is ever meant to OFFER it. **The two questions were the same
 * question until that batch made them two, so the next reader should not read
 * this change as a bug being fixed — it is what a correctly-split field looks
 * like from the consumer's side.**
 *
 * The move is not a field swap. Filtering on `surfaceable.surfaced === true`
 * (never on `trigger`, and never on `surfaced !== false`) is what keeps the
 * two verbs RULED unsurfaced on the identity ruling — `t_invoice_approve`
 * (C10 §2.4) and `t_enforcement_set` — out of a census of acts a person cannot
 * reach. They are not gaps; they are decisions, and a swap would have promoted
 * both to findings.
 *
 * `cascade` and unsurfaced `system` verbs stay out because they are declared
 * `surfaced: false` — rendering one would be the `PF-1a` shape, an affordance
 * promising an edge the surface does not own. `creation` verbs have no `from`
 * and so can never appear here whatever their value.
 *
 * Returns `[]` for an unknown entity, an unknown state, and a genuine dead end
 * alike. **That is deliberate: all three mean "offer nothing", and a caller that
 * needs to tell them apart is asking the wrong question of this function.**
 */
export function userVerbsFrom(entity: string, state: string): readonly TransitionDef[] {
  const flow = getFlow(entity);
  if (!flow) return [];
  return flow.transitions.filter((t) => t.surfaceable.surfaced && t.from.includes(state));
}

/**
 * Whether `state` is declared an END of its flow. Distinct from "nothing to
 * offer": a non-terminal state with no user verb is a state the surface cannot
 * leave, which is a FINDING, not an ending. Kept separate so no caller can
 * quietly read one as the other — that conflation is the census class in
 * CLAUDE.md's derivation rules, and the invoice surface is where it bit.
 */
export function isTerminalState(entity: string, state: string): boolean {
  return getFlow(entity)?.terminals.includes(state) ?? false;
}

/**
 * WHOSE ACT IS NEXT — the same question as `userVerbsFrom`, asked about the
 * ACTOR rather than the verb.
 *
 * ⚠️ **THIS EXISTS BECAUSE A STATE A SUPPLIER CAN SEE AND CANNOT ACT ON, WITH
 * NO INDICATION OF WHO ACTS, IS THE DEAD-END SHAPE** (`HALAL-REFUSAL-DEAD-ENDS-01`,
 * one lane over). The supplier's own responses list rendered a bare status word
 * — `Submitted`, `UnderReview`, `Disputed` — for three states whose every exit
 * belongs to the BUYER by `requiredRole`. Nothing on the surface said so, and
 * "nothing is happening" and "someone else is acting" look identical when the
 * only thing on screen is a noun.
 *
 * ⚠️ **AND IT IS DERIVED, NOT MAPPED, FOR THE REASON THIS FILE ALREADY STATES
 * AT LENGTH.** The obvious implementation is a hand-authored
 * `Record<Status, Actor>` beside the pill — which is precisely the
 * `BuyerInvoices` footer-verb defect in a new costume: a display concern
 * answering a question only the machine can answer. Read-only-with-the-actor-
 * named is a RULING here (every RR exit is the buyer's, deliberately), and a
 * ruling that is transcribed into a page's constant is a ruling that silently
 * stops tracking the machine the day a verb's role changes.
 *
 * Total, and the three outcomes are kept DISTINCT on purpose — `userVerbsFrom`
 * returns `[]` for a dead end and an ending alike, which is right for "what may
 * I offer?" and wrong for "who acts next?". A caller must not be able to render
 * "Complete" over a state the surface simply cannot leave:
 *   · `ended`    — a declared terminal. Nobody acts; the flow is over.
 *   · `stranded` — NOT terminal and no surfaceable exit. A FINDING, never copy.
 *   · `actors`   — the personas that own at least one surfaceable exit.
 */
export type NextActor =
  | { readonly kind: 'ended' }
  | { readonly kind: 'stranded' }
  | { readonly kind: 'actors'; readonly personas: readonly PersonaType[] };

export function nextActorFrom(entity: string, state: string): NextActor {
  const verbs = userVerbsFrom(entity, state);
  if (verbs.length === 0) {
    return isTerminalState(entity, state) ? { kind: 'ended' } : { kind: 'stranded' };
  }
  const personas = (Object.keys(PERSONA_ROLES) as PersonaType[]).filter((p) =>
    verbs.some((v) => personaCan(p, v.requiredRole)),
  );
  // A surfaceable verb whose role NO persona holds is unreachable by anyone —
  // `stranded` is the honest reading, not an empty actor list a caller would
  // render as blank.
  return personas.length === 0 ? { kind: 'stranded' } : { kind: 'actors', personas };
}
