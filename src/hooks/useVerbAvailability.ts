// ────────────────────────────────────────────────────────────────────────────
// useVerbAvailability — the seat's authority over ONE atom, as a hook.
//
// ⚠️ **THIS IS ERGONOMICS, NOT A CAPABILITY GAP, AND THE DISTINCTION IS THE
// POINT.** `availabilityOfAtom(atom, seatRoles)` already answers the whole
// question and takes NO document — it is pure, it is testable headlessly, and
// it stays where it is. What this removes is the two-line preamble every
// consumer would otherwise repeat: reach for `useCurrentIdentity()`, remember
// that the second argument is `identity.businessRoles` and not `identity`, and
// re-run on every render because `availabilityOfAtom` allocates.
//
// The reason that preamble is worth removing is not typing effort. It is that
// `identity.businessRoles` is the ONE input, and a surface that reads it by
// hand can read something else by hand — a persona, a supplierId, a status —
// and produce an availability the dispatcher will not agree with. A hook that
// takes an atom and nothing else cannot be passed the wrong input.
//
// ── WHAT THIS DOES NOT DO ───────────────────────────────────────────────────
// It does not decide WHICH verbs a surface offers. That is a state question
// (`invoiceActionsForSeat` asks it from a lifecycle state) and it is separate:
// availability is per-atom and document-independent, legality is per-document.
// Conflating them is how a display layer starts answering a machine question.
// ────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { availabilityOfAtom, type VerbAvailability } from '../services/transitions/handoff';
import { nextActFor, type NextAct } from '../services/transitions/nextAct';
import type { TransitionRole } from '../services/transitions/schema';

/**
 * Does this seat hold `atom`, and if not, whose act is it?
 *
 * Memoised on the seat's roles and the atom, so a surface may call it once per
 * verb at the top of a component without re-deriving on unrelated renders.
 */
export function useVerbAvailability(atom: TransitionRole): VerbAvailability {
  const { identity } = useCurrentIdentity();
  const roles = identity.businessRoles;
  return useMemo(() => availabilityOfAtom(atom, roles), [atom, roles]);
}

/**
 * WHO ACTS NEXT on one document, for THIS seat — the composition, as a hook.
 *
 * ⚠️ **IT READS THE SEAT FROM THE SAME PLACE `useVerbAvailability` DOES, AND
 * THAT IS THE POINT.** Two readers of "what may this seat do?" that disagree
 * about what the seat IS would put a line on screen that contradicts the button
 * beside it. One source (`identity.businessRoles`), one answer.
 *
 * ⚠️ **PASS THE CANONICAL STATE, NEVER A DISPLAY LABEL.** `legality.ts` states
 * the rule at length: a projection collapses states on purpose (`toBuyerLabel`
 * turns `Approved` into `Overdue` past its due date), so a label asked a machine
 * question returns a confident wrong answer. Callers hold the canonical state —
 * `po.status` IS the flow's state string — and pass that.
 */
export function useNextAct(
  entity: string,
  state: string | null | undefined,
): NextAct | null {
  const { identity } = useCurrentIdentity();
  const roles = identity.businessRoles;
  return useMemo(
    // No document selected is not a state the machine can answer about, and
    // `null` is how a caller renders nothing rather than guessing.
    () => (state ? nextActFor(entity, state, roles) : null),
    [entity, state, roles],
  );
}

/**
 * The same question asked of several atoms at once, keyed by the caller's own
 * names — the shape a surface with four or seven verbs actually wants.
 *
 * ⚠️ **THE ATOMS ARE READ FROM A LITERAL THE CALLER OWNS, AND THE KEYS ARE
 * PRESERVED.** Returning a positional array would make a caller line up two
 * lists by index, which is the defect `RfqDraftRefusal` avoided by
 * discriminating on a field rather than on an order.
 *
 * The memo key is the atom list, not the object identity: a caller writing the
 * literal inline (the readable way) would otherwise re-derive every render.
 */
export function useVerbAvailabilities<K extends string>(
  atoms: Readonly<Record<K, TransitionRole>>,
): Readonly<Record<K, VerbAvailability>> {
  const { identity } = useCurrentIdentity();
  const roles = identity.businessRoles;
  const keys = Object.keys(atoms) as K[];
  // Stable across renders for an inline literal with the same contents.
  const signature = keys.map((k) => `${k}=${atoms[k]}`).join('|');

  return useMemo(() => {
    const out = {} as Record<K, VerbAvailability>;
    for (const k of keys) out[k] = availabilityOfAtom(atoms[k], roles);
    return out;
    // `signature` stands in for `atoms`; `keys` is derived from it. (No lint
    // layer in this repo enforces the dep list — the note is for the reader.)
  }, [signature, roles]);
}
