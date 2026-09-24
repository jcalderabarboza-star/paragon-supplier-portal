// ─────────────────────────────────────────────────────────────────────────────
// THE ONE READ-TIME PERSON RESOLVER (C10 §8.2 / D-ID-7, amended 2026-09-24).
//
// ⚠️ **THIS IS THE LOAD-BEARING SAMPLE MARKER, AND THE `LivenessPill` ENTRY IS
// NOT.** A pill in a page corner says *this page's data is a sample*. It does
// not travel to the row where a person's label is printed, and the label is
// where a demo identity is mistaken for a real one. So the marker attaches
// HERE, at the single point every rendered person passes through, and a surface
// cannot print a person without it.
//
// ⚠️ **STRUCTURAL, NOT CONVENTIONAL — AND THE DIFFERENCE IS WHAT §8.2 BOUGHT.**
// While a record stored its own `displayName`, five surfaces each read that
// field and each would have needed its own marker; a sixth surface joining them
// would have shipped unmarked and nothing would have said so. With the name
// resolved at read there is exactly one producer of a person's label, so
// "(SAMPLE)" is a property of resolution rather than a thing five call sites
// remember to do. `personLabelGuard.test.ts` derives the population from source
// and holds that closed.
//
// ⚠️ **AN UNRESOLVABLE `personId` IS NAMED AS UNKNOWN, NEVER GUESSED PAST AND
// NEVER PRINTED RAW.** Printing the id would leak an internal token onto a
// governed surface; falling back to "some person" would manufacture provenance.
// Both are refusals this tree already makes elsewhere, and this is the same one.
// ─────────────────────────────────────────────────────────────────────────────

import { ROLE_LABEL_KEY } from '../transitions/handoff';
import { resolveSamplePerson } from './sampleRoster';

/**
 * The translator, structurally typed so this module needs no react-i18next
 * import and stays callable from a spec with a stub.
 */
export type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Resolve a `personId` to the label a reader sees.
 *
 * ⚠️ **THE ROLE NAME IS DERIVED FROM `ROLE_LABEL_KEY`, THE SAME VOCABULARY THE
 * HANDOFF LINE AND THE ROLES CATALOGUE READ.** The roster stores a
 * `SystemRoleId` and an ordinal, never a label string, so a role renamed in one
 * place is renamed everywhere and a roster row cannot start saying
 * "Procurement" after the atom has moved. That is the whole reason the roster is
 * not a second vocabulary.
 *
 * Returns the label ALREADY MARKED for a sample person. A caller that wants the
 * bare role name is asking the wrong question — there is no reader-facing
 * context in this portal where an unmarked sample person is the honest render.
 */
export function personLabel(personId: string, t: TranslateFn): string {
  const person = resolveSamplePerson(personId);
  if (person === undefined) return t('identity.actor.unknown');
  const role = t(ROLE_LABEL_KEY[person.role]);
  return t('identity.actor.sample', { label: `${role} ${person.ordinal}` });
}

/**
 * The label WITHOUT the sample marker and without i18n — for a service-layer
 * refusal message, which is plain English by convention in this tree.
 *
 * ⚠️ **IT RETURNS THE `personId`, AND THAT IS THE POINT RATHER THAN A
 * SHORTCUT.** A policy refusal is read by a developer and, through
 * `CommandResult`, sometimes by a user; the `personId` is role-shaped by
 * construction (`sim-usr-<role>-<ordinal>`), unambiguous, needs no locale, and
 * — the part that matters — is NOT a name. D-ID-3's rule is that no surface may
 * capture or print an actor as typed text; naming the stable identifier honours
 * it without inventing an English label map in the service layer.
 */
export function personRefusalToken(personId: string): string {
  return personId;
}
