// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · H1 — HALAL APPLICABILITY: THE MECHANISM, AUTHORED AND NOT WIRED.
//
// `INFERHALAL-READS-PROSE-01` names the defect this module answers: a
// REGULATORY determination made by testing whether a free-text description
// contains the substring `halal`. This is the named replacement — applicability
// as a MASTER FIELD, read through ONE refusal-shaped lookup, on the 2B-4a
// template (`sdc/bpom.ts`) exactly.
//
// ── ⚠️ AUTHORED, NOT WIRED. `inferHalal` IS LIVE AND UNTOUCHED ──────────────
//   Nothing below has a consumer. `GRInspectionWizard` still writes
//   `halalRequired: inferHalal(li.description)` on both draft builders, and this
//   batch does not go near it. **THAT IS THE BATCH BOUNDARY, NOT AN OVERSIGHT**:
//   retiring the prose parse is H2 and needs its own smoke, and the
//   certificate-verification leg is H4, GATED ON `D-COMP-HALAL-4` — the one
//   register item still open. A consumer change that looks free here is not
//   free; it is the next batch.
//
// ── ⚠️ THE SHAPE IS BPOM'S. THE CONTENT IS NOT, AND THIS IS THE WHOLE POINT ──
//   `D-COMP-HALAL-1` states it in the register: **IT WILL NOT MIRROR BPOM.**
//   BPOM rules packaging `NOT_APPLICABLE` by registry axis (`bpom.ts`), on a
//   regulation that excludes packaging. Halal may not:
//     · `doc-001` is an **MUI halal certificate** whose `linkedTo` is a PET
//       bottle material (`supplierDocuments.ts`);
//     · `AdaptiveContext.tsx:89` puts `packaging` INSIDE its `isHalal` selector.
//   So the tree already says, in two places, that somebody treats packaging as
//   halal-relevant. **WE DO NOT KNOW WHETHER THEY ARE RIGHT.** The seed
//   therefore says WE DO NOT KNOW — `'UNDETERMINED'` — rather than copying a
//   rule written for a different regulation because the shape was available.
//   ⚠️ **COPYING THE BPOM AXIS RULE WOULD HAVE BEEN THE CHEAPEST LINE IN THIS
//   FILE AND THE ONLY IRREVERSIBLE ONE**: eleven packaging rows would have
//   acquired a confident negative that no compliance officer ever gave, in a
//   field whose entire purpose is that nobody invents determinations. That is
//   Seat 3's refinement, and `D-COMP-HALAL-1` is compliance's to answer.
//
// ── WHY THE RULE READS THE `axis` AND NOTHING ELSE ──────────────────────────
//   `bpom.ts` derives its packaging half from the registry `axis` and names its
//   applicable half as three quoted group numbers. **NO GROUP NUMBER IS DATA IN
//   THIS FILE** — `halalApplicability.test.ts` asserts that no quoted `'MG-…'`
//   literal appears in this module's source, and that one does appear in
//   `bpom.ts`, so the difference is measured rather than claimed. That is not
//   tidiness:
//
//     HALAL CRITICALITY IN A COSMETIC ATTACHES TO WHAT ENTERS THE FORMULA.
//
//   Under Indonesian halal certification the dossier covers every material in
//   the product, and the critical routes — animal-derived fats and their
//   derivatives, alcohol as a carrier or extraction solvent — run through the
//   formulation grain as a class rather than through three groups of it. Every
//   ingredient group in this registry has a nameable route: MG-01/02/03/10 are
//   oleochemical (tallow-vs-plant is the textbook critical point, and four
//   fixture labels in those groups already carry a halal claim), MG-05 is where
//   an ethanol carrier lives, MG-06 is ethanolic extraction, and MG-04 holds
//   fatty-acid esters and peptides. **NO CHEMISTRY IS INVENTED HERE**: the rule
//   states that a determination is NEEDED, never what the determination is.
//
//   ⚠️ AND THE COST, RECORDED RATHER THAN DISCOVERED LATER: a rule that reads
//   only the axis CANNOT EXPRESS A PER-GROUP RULING. `D-COMP-HALAL-1` will
//   answer per group, so the shape gains a group layer when it does — a
//   NARROWING, on the `bpomApplicability.test.ts` precedent, recorded as a
//   ratification. It must never be a loosening flag.
//
// ── ⚠️ ALL 42 VALUES ARE PROVISIONAL — AND THE DISPOSAL CONDITION ───────────
//   STRATEGIST-RULED ON BEST PRACTICE, PENDING COMPLIANCE RATIFICATION. They
//   are recorded as a decision TAKEN so that ratification is an act of agreeing
//   with something written down, rather than discovering what the fixtures
//   quietly assumed. **They are disposed of — not amended — when
//   `D-COMP-HALAL-1` is answered:**
//
//     1. Compliance's answer REPLACES this rule. Every row is reseeded from it
//        in the same edit, and the word PROVISIONAL leaves this module with the
//        values it qualified. A per-group ratification narrows the pin; it does
//        not open a per-row override.
//     2. ⚠️ **IF A WIRE IS PROPOSED WHILE THIS IS STILL PROVISIONAL, THE
//        PROVISIONAL SEED IS WHAT WOULD BE ENFORCED.** A `'REQUIRED'` here does
//        not mean compliance asked for a check; it means nobody has said
//        otherwise and the strategist ruled conservatively. Enforcing that
//        against a certificate corpus that does not exist yet (R0.1 is NOT
//        STARTED) is the *outage wearing compliance clothes* Seat 3 named — the
//        reason H4 is gated and this batch wires nothing.
//     3. If compliance rules that halal applicability is NOT a material-grain
//        fact at all (`D-COMP-HALAL-2` — supplier × material), this field and
//        this module are DELETED rather than migrated. A master field that
//        turns out to be at the wrong grain is not salvageable by adding a key.
// ─────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER } from './fixtures';
import { MATERIAL_GROUPS } from './materialGroups';
import type { HalalApplicability, MaterialMaster } from './types';

// ─── The PROVISIONAL class rule ──────────────────────────────────────────────

/**
 * The rule, expressed over the registry's `axis` and nothing else.
 *
 * Three branches, and the third is a DEFAULT rather than an enumeration:
 *
 *   1. **Packaging is `'UNDETERMINED'`** — Seat 3's refinement, `D-COMP-HALAL-1`.
 *      ⚠️ **NOT the BPOM axis rule.** BPOM excludes packaging; halal may not,
 *      and `doc-001` is the in-tree reason to doubt it. Written as its own
 *      branch even though it returns the same value as the default, because
 *      this is a **STATED** "we do not know" and the default is an **UNSTATED**
 *      one — a distinction that must not change the VALUE (both refuse, and a
 *      consumer's obligation is identical) but must be visible to the next
 *      reader, and must have one place to land when compliance answers.
 *      `halalApplicability.test.ts` pins packaging at `'UNDETERMINED'`, so the
 *      branch is not decoration: copying BPOM's `NOT_APPLICABLE` goes red.
 *   2. **Anything that ENTERS or FEEDS a formulation is `'REQUIRED'`** —
 *      `'formulation-ingredient'` and `'upstream-input'`, per the header.
 *   3. **EVERYTHING ELSE IS `'UNDETERMINED'`**, by default and deliberately. A
 *      NEW AXIS added to the registry tomorrow fails CLOSED here without anyone
 *      remembering this file exists.
 *
 * Exported — and typed on `string` rather than on `MaterialGroupAxis` — so
 * branch 3 is TESTABLE rather than merely asserted. The declared union is
 * exhaustive today, so a future axis cannot be reached through the registry,
 * and a default nobody can exercise is a claim rather than a mechanism.
 */
export const provisionalHalalForAxis = (axis: string): HalalApplicability => {
  if (axis === 'packaging-substrate' || axis === 'packaging-function') return 'UNDETERMINED';
  if (axis === 'formulation-ingredient' || axis === 'upstream-input') return 'REQUIRED';
  return 'UNDETERMINED';
};

/**
 * Group → provisional applicability. **DERIVED FROM THE REGISTRY, NOT LISTED** —
 * the keys are the 2B-1 registry's groups, so a group added to
 * `materialGroups.ts` without a thought about halal appears here automatically,
 * as `'UNDETERMINED'`, which refuses (`CENSUS-MUST-DERIVE-01`).
 */
export const PROVISIONAL_HALAL_BY_GROUP: Readonly<Record<string, HalalApplicability>> =
  Object.freeze(
    Object.fromEntries(MATERIAL_GROUPS.map((g) => [g.group, provisionalHalalForAxis(g.axis)])),
  );

/**
 * The provisional applicability for a GROUP. An undeclared group is
 * `'UNDETERMINED'` — never a fallback `'NOT_REQUIRED'`, which would be the
 * fail-open this module exists to remove.
 */
export const provisionalHalalForGroup = (group: string): HalalApplicability =>
  PROVISIONAL_HALAL_BY_GROUP[group] ?? 'UNDETERMINED';

// ─── The refusal path ────────────────────────────────────────────────────────

/**
 * Why a halal-applicability lookup cannot be answered. Two reasons, kept apart
 * because a refusal that cannot say WHICH is half a refusal (the `uomOf`
 * precedent) — **but they are not two behaviours.** See `HalalOutcome`.
 */
export type HalalRefusalReason =
  /** The master does not name this code at all. */
  | 'UNKNOWN_MATERIAL'
  /** The master names it and records NO DETERMINATION. */
  | 'UNDETERMINED_APPLICABILITY';

/**
 * The outcome of a halal-applicability lookup. Mirrors `BpomOutcome`, which
 * mirrors `UomOutcome`: an `ok` discriminant, never a sentinel and never a
 * defaulted boolean.
 *
 * ⚠️ **`'UNDETERMINED_APPLICABILITY'` REFUSES IDENTICALLY TO
 * `'UNKNOWN_MATERIAL'`.** Same discriminant, same absent `required`, same
 * consequence: THERE IS NOTHING TO PROCEED ON. **THE `reason` REACHES ONLY THE
 * MESSAGE. NO CALLER MAY BRANCH ON IT TO PROCEED** — it exists so a refusal can
 * NAME what is missing, not so a consumer can pick which refusal to ignore.
 * ONE REFUSAL BRANCH IN EVERY CONSUMER. `halalApplicability.test.ts` pins the
 * two as indistinguishable in effect.
 */
export type HalalOutcome =
  | { readonly ok: true; readonly required: boolean }
  | {
      readonly ok: false;
      readonly reason: HalalRefusalReason;
      readonly materialCode: string;
    };

/**
 * THE lookup. Whether a received lot of this material requires a halal check —
 * or an honest refusal naming the code.
 *
 * ⚠️ **NO CONSUMER TODAY (H1).** The receiving surface still parses prose. When
 * H2 wires this, a caller that ignores `ok` is not a caller with a slightly
 * worse default — it is a regulatory fail-open. A REGULATORY GATE THAT FAILS
 * OPEN IS WORSE THAN ONE THAT FAILS LOUD.
 *
 * ⚠️ **AND `ok: true, required: true` IS NOT A SATISFIED CHECK.** It says a
 * halal check is REQUIRED. Whether one was PERFORMED (an inspector's tick) and
 * whether a CERTIFICATE backs it (a lookup against the compliance registry) are
 * two further facts with different answerers and different clocks — Seat 3's
 * three-fact split. This function answers the first and nothing else.
 */
export function halalOf(
  materialCode: string,
  master: MaterialMaster = MATERIAL_MASTER,
): HalalOutcome {
  const entry = Object.prototype.hasOwnProperty.call(master, materialCode)
    ? master[materialCode]
    : null;
  if (entry === null) return { ok: false, reason: 'UNKNOWN_MATERIAL', materialCode };
  if (entry.halalApplicable === 'UNDETERMINED') {
    return { ok: false, reason: 'UNDETERMINED_APPLICABILITY', materialCode };
  }
  return { ok: true, required: entry.halalApplicable === 'REQUIRED' };
}
