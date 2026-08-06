// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-4a — BPOM APPLICABILITY: THE MECHANISM, AUTHORED AND NOT WIRED.
//
// `INFERBPOM-REGULATORY-01` names the defect this module answers: a REGULATORY
// determination made by parsing a material code's prefix, which FAILS OPEN.
// This is the named replacement — applicability as a MASTER FIELD, read through
// ONE refusal-shaped lookup, exactly as `uomOf` replaced twelve ad-hoc unit
// defaults (`materialMaster.ts`).
//
// ── ✅ WIRED AT 2B-4b. `inferBpom` IS RETIRED ───────────────────────────────
//   This header used to read AUTHORED, NOT WIRED: `inferBpom` was live, nothing
//   below was called by the GR wizard, and the reason was arithmetic rather
//   than caution — the wizard is fed `asnStore`, seeded from the `MAT-*` space,
//   and twelve of the codes the census reached were not in the master at all.
//   `bpomOf` refuses on an unresolvable code, correctly, so wiring it then
//   would have had the wizard refuse essentially every received line.
//
//   2B-2/2B-3 adopted, 2B-5b-ii authored, and the gate discharged: every code
//   the wizard can be fed — from BOTH shipment lanes, not only `asnStore` — is
//   master-resolvable. `GRInspectionWizard` now calls `bpomOf` and blocks the
//   Quality step on a refusal. The prefix parse no longer exists in the product.
//
//   ⚠️ WIRING IT CHANGED BEHAVIOUR ON THREE OF NINE RECEIVABLE LINES, and the
//   direction is the point: `RM-EMUL-9440` moved from a silent "no check" to
//   REQUIRED (the master had a document and the prefix had three characters),
//   and `RM-COCO-8200` / `RM-PSTN-7150` moved from a silent "no check" to a
//   REFUSAL. Nothing moved from checked to unchecked.
//
// ── THE TWO FAIL-OPENS, AND THEY ARE NOT THE SAME ONE ───────────────────────
//   `BPOM-OFF-BY-SPACE-01` is the known half: an entire undeclared vocabulary
//   escapes the check because no `MAT-*` code starts with `AI-` or `FR-`.
//
//   `PREFIX-RULE-ASSERTS-A-NEGATIVE-01` is the half 2B-4a measures, and it is
//   ON THE MASTER'S OWN POPULATION rather than outside it. A prefix rule has no
//   way to say "undetermined": every code it does not recognise comes back
//   `false`, and **`false` IS AN ASSERTION** — "this lot needs no BPOM check".
//   On the 35 codes the master resolves, the two mechanisms agree on 25 and
//   DISAGREE ON TEN: the ten `RM-*` rows where `inferBpom` states a confident
//   negative and the class rule below states that NOBODY HAS RULED.
//
//   ⚠️ AND THE AGREEMENT ON THE OTHER 25 IS NOT EVIDENCE THE PREFIX RULE WAS
//   RIGHT. It agrees because these fixtures were AUTHORED with prefixes that
//   happen to track class (`AI-` actives, `FR-` fragrance, `PK-` packaging).
//   A rule that is right about the data it was written against, wrong about the
//   data it was not, and unable to say which is which, is the shape
//   `CENSUS-MUST-DERIVE-01` warns about wearing regulatory clothes.
//
// ── WHY THE SEED IS A GROUP RULE AND NOT A PER-ROW JUDGEMENT ────────────────
//   NO CHEMISTRY IS INVENTED HERE. Every value comes from the material's
//   DECLARED GROUP (`materialGroups.ts`, the 2B-1 registry), and the rule below
//   is inspectable rather than distributed across 35 hand-written literals that
//   agree with nothing. The values are still WRITTEN PER ROW in the master —
//   because a row must be individually ratifiable later — and
//   `bpomApplicability.test.ts` asserts that today every one of them equals its
//   group's rule. When a row is ratified individually, that pin narrows and the
//   ratification is recorded; it does not silently loosen.
// ─────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER } from './fixtures';
import { MATERIAL_GROUPS } from './materialGroups';
import type { BpomApplicability, MaterialMaster } from './types';

// ─── The PROVISIONAL class rule ──────────────────────────────────────────────

/**
 * The three ingredient groups ruled APPLICABLE at 2B-4a.
 *
 * ⚠️ **PROVISIONAL — STRATEGIST-RULED ON BEST PRACTICE, PENDING TEAM
 * RATIFICATION.** `D-COMP-BPOM` (which material groups require a BPOM lot
 * check) is escalated and unanswered; these three are the defensible reading of
 * Indonesian cosmetic-ingredient practice and NOTHING MORE. They are recorded
 * as a decision taken so that ratification is an act of AGREEING with something
 * written down, rather than discovering what the fixtures quietly assumed.
 */
const PROVISIONALLY_APPLICABLE_GROUPS = ['MG-04', 'MG-05', 'MG-06'] as const;

/**
 * Group → provisional applicability. **DERIVED FROM THE REGISTRY, NOT LISTED.**
 *
 * Three rules, in order, and the third is a DEFAULT rather than an enumeration:
 *
 *   1. **Packaging is `NOT_APPLICABLE`** — decided by the registry's own `axis`
 *      field (`packaging-substrate` / `packaging-function`), never by a hand-
 *      typed `MG-20..24`. That matters: `MG-25` (glass) was declared at 2B-1,
 *      AFTER the enumeration a dispatch would have carried, and it is covered
 *      here automatically. A rule written as a list of group numbers is a
 *      census matching a shape (`CENSUS-MUST-DERIVE-01`) one field over.
 *   2. **The three ruled ingredient groups are `APPLICABLE`** — above.
 *   3. **EVERYTHING ELSE IS `UNDETERMINED`**, by default and deliberately. A
 *      group nobody has ruled on gets an explicit absence of determination, and
 *      `bpomOf` REFUSES on it. So a group added tomorrow is fail-CLOSED without
 *      anyone remembering to add it here — which is the exact property
 *      `inferBpom` lacks, where an unrecognised code is silently a NO.
 */
export const PROVISIONAL_BPOM_BY_GROUP: Readonly<Record<string, BpomApplicability>> =
  Object.freeze(
    Object.fromEntries(
      MATERIAL_GROUPS.map((g) => [
        g.group,
        g.axis === 'packaging-substrate' || g.axis === 'packaging-function'
          ? ('NOT_APPLICABLE' as const)
          : (PROVISIONALLY_APPLICABLE_GROUPS as readonly string[]).includes(g.group)
            ? ('APPLICABLE' as const)
            : ('UNDETERMINED' as const),
      ]),
    ),
  );

/**
 * The provisional applicability for a GROUP. An undeclared group is
 * `'UNDETERMINED'` — never a fallback `NOT_APPLICABLE`, which would be the
 * fail-open this module exists to remove.
 */
export const provisionalBpomForGroup = (group: string): BpomApplicability =>
  PROVISIONAL_BPOM_BY_GROUP[group] ?? 'UNDETERMINED';

// ─── The refusal path ────────────────────────────────────────────────────────

/**
 * Why a BPOM-applicability lookup cannot be answered. Two reasons, and they are
 * kept apart because a refusal that cannot say WHICH is half a refusal (the
 * `uomOf` precedent) — **but they are not two behaviours.** See `BpomOutcome`.
 */
export type BpomRefusalReason =
  /** The master does not name this code at all. */
  | 'UNKNOWN_MATERIAL'
  /** The master names it and records NO DETERMINATION. */
  | 'UNDETERMINED_APPLICABILITY';

/**
 * The outcome of a BPOM-applicability lookup. Mirrors `UomOutcome`: an `ok`
 * discriminant, never a sentinel and never a defaulted boolean.
 *
 * ⚠️ **`'UNDETERMINED_APPLICABILITY'` REFUSES IDENTICALLY TO
 * `'UNKNOWN_MATERIAL'`.** Same discriminant, same absent `applicable`, same
 * consequence: THERE IS NOTHING TO PROCEED ON. The `reason` exists so a refusal
 * can NAME what is missing, not so a caller can pick which refusal to ignore —
 * and no caller may branch on it to proceed. `bpomApplicability.test.ts` pins
 * the two as indistinguishable in effect.
 */
export type BpomOutcome =
  | { readonly ok: true; readonly applicable: boolean }
  | {
      readonly ok: false;
      readonly reason: BpomRefusalReason;
      readonly materialCode: string;
    };

/**
 * THE lookup. Whether a received lot of this material requires a BPOM lot
 * check — or an honest refusal naming the code.
 *
 * ⚠️ **WIRED (2B-4b).** `GRInspectionWizard` calls this per received line and
 * BLOCKS the Quality step on a refusal — so a caller that ignores `ok` is not a
 * caller with a slightly worse default, it is a regulatory fail-open. A
 * REGULATORY GATE THAT FAILS OPEN IS WORSE THAN ONE THAT FAILS LOUD.
 */
export function bpomOf(
  materialCode: string,
  master: MaterialMaster = MATERIAL_MASTER,
): BpomOutcome {
  const entry = Object.prototype.hasOwnProperty.call(master, materialCode)
    ? master[materialCode]
    : null;
  if (entry === null) return { ok: false, reason: 'UNKNOWN_MATERIAL', materialCode };
  if (entry.bpomApplicable === 'UNDETERMINED') {
    return { ok: false, reason: 'UNDETERMINED_APPLICABILITY', materialCode };
  }
  return { ok: true, applicable: entry.bpomApplicable === 'APPLICABLE' };
}
