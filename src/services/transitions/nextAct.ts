// ────────────────────────────────────────────────────────────────────────────
// WHO ACTS NEXT ON THIS DOCUMENT, IN THIS STATE, FOR THIS SEAT.
//
// The tree already answered two thirds of this question and never joined them:
//
//   · `nextActorFrom(entity, state)`      — PERSONA grain, state-aware, and it
//                                            goes SILENT exactly where the
//                                            question is interesting: a state
//                                            with no surfaceable exit returns
//                                            `stranded`, and `stranded` renders
//                                            nothing by design.
//   · `availabilityOfAtom(atom, seatRoles)` — ROLE grain, and STATE-BLIND. It
//                                            answers "may this seat fire this
//                                            atom", which is a question about
//                                            the seat, never about the document.
//
// A purchase order in `Confirmed` is where both halves fail together: every exit
// is an S/4HANA goods movement, so there is no surfaceable verb for
// `availabilityOfAtom` to be asked about, and `nextActorFrom` says `stranded` —
// which the surface renders as nothing at all. **Both parties are waiting, and
// the instrument is silent.** This composes them and answers the silence.
//
// ⚠️ **NEITHER HALF'S SIGNATURE CHANGES, AND THAT IS NOT A COINCIDENCE — IT IS
// WHY THIS IS BUILDABLE.** The composition calls both as they stand. What it
// adds is a THIRD READ that neither exposes: the NON-surfaceable exits.
// `userVerbsFrom` filters those out on purpose (it answers "what may I offer?",
// and offering one would be the `PF-1a` shape — an affordance promising an edge
// the surface does not own). But "what may I offer?" and "what is this document
// waiting for?" are different questions, and the second one is answered by
// precisely the edges the first one discards.
//
// ⚠️ **IT SAYS WHO ACTS. IT NEVER GRANTS.** `mine` means the seat holds the
// atom for a verb that is legal from this state — the same two facts the
// dispatcher checks — but the dispatcher still checks them, plus scope, plus
// required fields, plus every policy hook. A caller must not read `mine` as
// permission; it is a sentence about a document, and the only affordance it may
// unlock is one that was already gated by `useVerbAvailability`.
//
// ⚠️ **EVERY ARM IS DERIVED FROM DATA THE SCHEMA ALREADY CARRIES.** No arm is
// keyed on a projection label, on a status constant, or on an authored map from
// state to actor — that is the `BuyerInvoices` footer-verb defect
// (`invoiceActionModel.ts` header) and this file exists downstream of it. Move a
// verb between roles, or between owners, and every sentence here moves with it.
// ────────────────────────────────────────────────────────────────────────────

import type { ExternalFactOwner, TransitionDef, TransitionId } from './schema';
import type { SystemRoleId, BusinessRoleId } from './businessRoles';
import { getFlow } from './registry';
import { userVerbsFrom, isTerminalState } from './legality';
import { availabilityOfAtom, ROLE_ORDER } from './handoff';

/**
 * WHY A DOCUMENT SAYS NOTHING. Two reasons that must never merge, kept apart for
 * the same reason `NextActor` keeps `ended` and `stranded` apart: they render
 * identically (nothing) and they mean opposite things to the next batch.
 *
 * · `no-exit`          — nothing leaves this state, by transition OR by
 *                        settlement. A genuine dead end. **S1 does not invent a
 *                        sentence for it** (operator ruling): a state we cannot
 *                        name honestly stays unnamed, and the census carries it.
 * · `ruled-unsurfaced` — every exit is an act a PERSON could take that a
 *                        standing ruling refuses to put on a screen. Nameable in
 *                        principle; deliberately NOT given an arm here, because
 *                        minting reader-facing copy for it is a ruling nobody
 *                        has made. It is one state today (`compliance/Under
 *                        Review`) and it is recorded rather than absorbed.
 * · `unowned`          — a surfaceable verb whose atom NO assignable role holds.
 *                        "Awaiting nobody" is worse than silence; this is the
 *                        same refusal `VerbAvailability.unowned` already makes.
 */
export type SilentBecause = 'no-exit' | 'ruled-unsurfaced' | 'unowned';

/**
 * WHOSE ACT IS NEXT. The arms are the AXES — each names a genuinely different
 * kind of answer, and no arm is a polite way of saying another.
 *
 * · `mine`     — this seat holds the atom for a verb legal from here.
 * · `theirs`   — a different assignable ROLE in this portal holds it.
 * · `external` — a system OUTSIDE Paragon owns the act. Paragon never
 *                originates it (`ExternalFactOwner`).
 * · `settling` — ⚠️ **OURS, IN FLIGHT.** Paragon originated the act, handed it
 *                across the SAP boundary, and is waiting on the callback.
 *                **This is NOT `external`, and collapsing it into `external`
 *                would invert the owner union's whole meaning** — it would name
 *                S/4HANA as the OWNER of an act Paragon performed. The owner
 *                union says what the portal never originates; a settling state
 *                is the one case where the portal DID.
 * · `computed` — the platform derives the next move from what it already holds.
 * · `ended`    — a declared terminal. Nobody acts; the document is done.
 * · `silent`   — renders nothing. See `SilentBecause`.
 */
export type NextAct =
  | { readonly kind: 'mine'; readonly verbs: readonly TransitionDef[] }
  | { readonly kind: 'theirs'; readonly owners: readonly SystemRoleId[] }
  | { readonly kind: 'external'; readonly owners: readonly ExternalFactOwner[] }
  | { readonly kind: 'settling'; readonly boundary: TransitionId; readonly settlesTo: string }
  | { readonly kind: 'computed' }
  | { readonly kind: 'ended' }
  | { readonly kind: 'silent'; readonly because: SilentBecause };

/**
 * A DECLARED order for owner lists, for the reason `ROLE_ORDER` is declared:
 * `Object.keys` on the union's record is stable today and is not a contract, so
 * sorting on a declared order means a line cannot re-order itself under a
 * refactor. Asserted TOTAL over `ExternalFactOwner` in `nextAct.test.ts` — a
 * missing member does not fail loudly, it silently vanishes from a line.
 */
export const EXTERNAL_OWNER_ORDER: readonly ExternalFactOwner[] = ['s4hana', 'tms', 'bank'];

/**
 * THE THIRD READ — the exits `userVerbsFrom` discards.
 *
 * Derived from the flow, never from a list: it re-decides itself the day a verb
 * is added, re-owned, or surfaced. (`CENSUS-MUST-DERIVE-01`.)
 */
function unsurfacedExitsFrom(entity: string, state: string): readonly TransitionDef[] {
  const flow = getFlow(entity);
  if (!flow) return [];
  return flow.transitions.filter((t) => !t.surfaceable.surfaced && t.from.includes(state));
}

/**
 * Is this state one the platform is WAITING OUT across the SAP boundary?
 *
 * Derived from `sapBoundary` + `settlesTo`, which is the only place that fact
 * lives: the state is the `to` of a boundary verb, and settlement lands the
 * entity in `settlesTo`. A census that ignores these edges reports both working
 * SAP boundaries as dead ends — which is exactly what the pre-S1 derivation did
 * before `settlesTo` was folded in.
 */
function settlementOut(
  entity: string,
  state: string,
): { boundary: TransitionId; settlesTo: string } | null {
  const flow = getFlow(entity);
  if (!flow) return null;
  for (const t of flow.transitions) {
    const settlesTo = (t as { settlesTo?: string }).settlesTo;
    if ((t as { sapBoundary?: boolean }).sapBoundary && t.to === state && settlesTo) {
      return { boundary: t.id, settlesTo };
    }
  }
  return null;
}

/**
 * WHO ACTS NEXT — the composition.
 *
 * ⚠️ **THE ORDER OF THE BRANCHES IS LOAD-BEARING AND EACH STEP EARNS ITS PLACE.**
 *
 * 1. `ended` FIRST. A declared terminal is over. Reading exits first would let a
 *    terminal state that still declares an inbound-shaped edge speak.
 * 2. The SURFACEABLE exits next, because if a person here can act, that is the
 *    answer — no amount of external machinery outranks "it is your move".
 * 3. `settling` BEFORE the unsurfaced exits. A state can in principle be both a
 *    settlement landing and hold external exits; when it is, the act Paragon
 *    ALREADY PERFORMED is the true answer, and naming an external owner instead
 *    would credit S/4HANA with our own act.
 * 4. `external` BEFORE `computed`, and the ASN is why: `Submitted` and
 *    `In Transit` hold BOTH a carrier feed and the GR-mismatch cascade. The
 *    carrier feed is what the document is actually waiting for; the cascade is a
 *    conditional consequence that may never fire, so leading with it would name
 *    the less likely half of a real wait.
 */
export function nextActFor(
  entity: string,
  state: string,
  seatRoles: readonly BusinessRoleId[],
): NextAct {
  if (isTerminalState(entity, state)) return { kind: 'ended' };

  const offered = userVerbsFrom(entity, state);
  if (offered.length > 0) {
    const mine = offered.filter(
      (v) => availabilityOfAtom(v.requiredRole, seatRoles).kind === 'held',
    );
    if (mine.length > 0) return { kind: 'mine', verbs: mine };

    const owners = new Set<SystemRoleId>();
    for (const v of offered) {
      const a = availabilityOfAtom(v.requiredRole, seatRoles);
      if (a.kind === 'withheld') for (const o of a.owners) owners.add(o);
    }
    // Every offered verb was `unowned`: no assignable role holds any of them.
    // "Awaiting nobody" promises an act that will never come.
    if (owners.size === 0) return { kind: 'silent', because: 'unowned' };
    return { kind: 'theirs', owners: ROLE_ORDER.filter((r) => owners.has(r)) };
  }

  const settling = settlementOut(entity, state);
  if (settling) return { kind: 'settling', ...settling };

  const exits = unsurfacedExitsFrom(entity, state);
  if (exits.length === 0) return { kind: 'silent', because: 'no-exit' };

  const owners = new Set<ExternalFactOwner>();
  for (const t of exits) {
    const s = t.surfaceable;
    if (!s.surfaced && s.because === 'external-fact') owners.add(s.owner);
  }
  if (owners.size > 0) {
    return { kind: 'external', owners: EXTERNAL_OWNER_ORDER.filter((o) => owners.has(o)) };
  }
  if (exits.some((t) => !t.surfaceable.surfaced && t.surfaceable.because === 'computed')) {
    return { kind: 'computed' };
  }
  return { kind: 'silent', because: 'ruled-unsurfaced' };
}
