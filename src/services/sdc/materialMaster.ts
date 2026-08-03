// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · B1 — THE ONE MATERIAL-MASTER LOOKUP.
//
// Before this file, "the material master does not resolve this code" was
// re-decided ad hoc at TWELVE sites: seven silently defaulted the unit to 'KG'
// and five crashed with an unnamed TypeError. Same condition, twelve answers.
// This module makes the condition ONE thing with exactly THREE legal outcomes,
// so the split cannot be reintroduced by the next caller.
//
// ── OPERATOR RULING · D-OPS-MASTERMISS (2026-08-03): REFUSE OUTRIGHT ─────────
//   A dispatch naming a material the master cannot resolve is REFUSED BY NAME.
//   No quarantine, no accept-with-marker. Rationale on record: quarantine
//   creates a class of stored facts that exist but are not trustworthy, which is
//   the thing this platform refuses to do. At F2, when SOMO's live feed names an
//   unresolvable code, it gets a loud error AT WIRE TIME rather than a silent
//   backlog. Same principle as FX_UNPINNED.
//
// ── THE DISTINCTION THAT MATTERS: A UNIT IS NOT A LABEL ─────────────────────
//   Echoing a raw code back on a DISPLAY miss is honest — the reader sees the
//   token the data actually carried. Defaulting a UNIT fabricates a claim with
//   ARITHMETIC consequences: a PCS material read as KG poisons every quantity
//   comparison downstream (coverage sums, drawdown, short-confirmation checks),
//   and nothing on the surface says a unit was invented. So:
//     · WRITE path   → `requireUom` behind a named policy refusal (nothing lands)
//     · DISPLAY path → `uomOf(...).ok === false` → the em-dash convention
//     · AUTHOR time  → `requireUom` throws, NAMING the missing code
//
// ── WHY NOT A DEFAULT PARAMETER ON `master` EVERYWHERE ──────────────────────
//   Defaulted so the ~dozen call sites read cleanly against the one real master,
//   injectable so the tests can prove the refusal without mutating a frozen
//   fixture. The SDC selector convention (inputs as arguments) is preserved.
// ─────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER } from './fixtures';
import type { MaterialMaster, MaterialMasterEntry, Uom } from './types';

/** Why a material lookup cannot be answered. Never a fallback value — a unit the
 *  master cannot name is refused, in the caller's own words (the FX_UNPINNED
 *  precedent, `lib/fxPin.ts`). One reason today; the type is the extension point. */
export type MaterialRefusalReason = 'UNKNOWN_MATERIAL';

/** The outcome of a canonical-unit lookup. Mirrors `QtyOutcome`
 *  (`lib/localeNumber`): an `ok` discriminant, never a sentinel value. */
export type UomOutcome =
  | { readonly ok: true; readonly uom: Uom }
  | {
      readonly ok: false;
      readonly reason: MaterialRefusalReason;
      /** The code that did not resolve — a refusal that cannot say WHICH code is
       *  half a refusal (this is the whole defect at the five author-time sites). */
      readonly materialCode: string;
    };

/** Is this code one the material master names? The membership predicate the
 *  write-path policy hooks and the reply parser's precedence rule both key off. */
export function isKnownMaterial(
  materialCode: string,
  master: MaterialMaster = MATERIAL_MASTER,
): boolean {
  return Object.prototype.hasOwnProperty.call(master, materialCode);
}

/** The master entry for a code, or null. The ONE read; `uomOf` / `labelOf` are
 *  its two projections. */
export function materialEntry(
  materialCode: string,
  master: MaterialMaster = MATERIAL_MASTER,
): MaterialMasterEntry | null {
  return isKnownMaterial(materialCode, master) ? master[materialCode] : null;
}

/**
 * THE shared lookup. A material's canonical unit, or an honest refusal naming
 * the code. Every unit in this lane comes from here (integrity invariant #2) —
 * a qty field never picks its own unit and a caller can never supply one.
 */
export function uomOf(
  materialCode: string,
  master: MaterialMaster = MATERIAL_MASTER,
): UomOutcome {
  const entry = materialEntry(materialCode, master);
  return entry
    ? { ok: true, uom: entry.canonicalUom }
    : { ok: false, reason: 'UNKNOWN_MATERIAL', materialCode };
}

/**
 * The canonical unit, or THROW — for the two places a miss is a BUG, not a
 * runtime condition:
 *
 *   1. AUTHOR-TIME fixture construction over known literals. Failing loud at
 *      module load is the CORRECT class of behaviour (an author typo must not
 *      ship); the defect this replaces was only that it surfaced as an
 *      incidental `TypeError: Cannot read properties of undefined` that never
 *      said WHICH code went missing.
 *   2. Inside a `create` whose transition already carries the
 *      `*_MATERIAL_KNOWN` policy hook. The hook refuses first, so this is an
 *      unreachable-by-construction assertion — and, crucially, NOT a `?? 'KG'`
 *      that would quietly fabricate a unit if the hook were ever unwired.
 */
export function requireUom(materialCode: string, master: MaterialMaster = MATERIAL_MASTER): Uom {
  const outcome = uomOf(materialCode, master);
  if (!outcome.ok) {
    throw new Error(
      `UNKNOWN_MATERIAL: '${materialCode}' is not in the material master — no canonical unit exists for it, and inventing one would fabricate a quantity claim`,
    );
  }
  return outcome.uom;
}

/**
 * A material's label, or the raw code echoed back. Deliberately NOT an outcome
 * type: a display miss on a LABEL is honest by echoing (the reader sees the
 * token the data carried), which is a different rule from the unit. See the
 * header's "a unit is not a label". `SupplierForecasts.tsx` already did this
 * correctly for labels — the defect was always its unit sibling.
 */
export function labelOf(materialCode: string, master: MaterialMaster = MATERIAL_MASTER): string {
  return materialEntry(materialCode, master)?.label ?? materialCode;
}

/** Every code the master names — the membership set the reply parser consults
 *  for its precedence rule (a token that IS a material can never be read as a
 *  quantity). Sorted, so callers get a stable order. */
export function knownMaterialCodes(
  master: MaterialMaster = MATERIAL_MASTER,
): readonly string[] {
  return Object.keys(master).sort();
}
