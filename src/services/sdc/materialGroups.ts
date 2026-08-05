// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-1 — THE MATERIAL-GROUP REGISTRY. One place a group number means
// something.
//
// ── WHY THIS FILE EXISTS AT ALL (the finding under `MG-COLLISION-21-01`) ─────
//   `MG-21` meant CLOSURES in the material master and GLASS PACKAGING in the
//   should-cost taxonomy, and had done since both were written. The reason that
//   was possible is structural and duller than the collision itself:
//
//     THE MG VOCABULARY HAD NO DECLARATION SITE. It existed only as string
//     literals on materials, and as prose in two files' section comments.
//
//   A vocabulary with no declaration site cannot disagree with itself out loud —
//   there is nothing for a second definition to contradict. So the collision was
//   not caught by a failing test; it was caught by a human reading two files
//   side by side, which is not a mechanism.
//
//   This module is that missing site. It is the ONLY place an `MG-xx` acquires a
//   meaning; `materialGroups.test.ts` pins both consumers (the master and the
//   should-cost taxonomy) against it, so a second meaning is now a red test
//   rather than a discovery.
//
// ── WHY IT LIVES IN `sdc/` (operator ruling R-1, reasoning (a)) ──────────────
//   The master is the DECLARED OWNER of material identity (`C8-MASTER-DECL`),
//   and material group is part of identity. Declared ownership decides — the
//   same rule that settled every code collision in B2a. So the registry sits
//   beside the master rather than beside the taxonomy that also consumes it.
//
//   NOTE: `MATERIAL_MASTER` itself (`fixtures.ts`) is NOT edited by this batch.
//   R-1 ruled that the taxonomy moves and the master stands, so every group the
//   master already carries was already correct. This file is a new sibling, not
//   a change to ratified seed data.
//
// ── THE COST OF R-1, RECORDED IN DATA RATHER THAN PROSE ─────────────────────
//   Groups MG-20 / MG-22 / MG-23 / MG-24 classify packaging by SUBSTRATE (and
//   form: 20 is rigid plastic, 24 is flexible plastic). `MG-21 = Closures`
//   classifies by FUNCTION. That is a genuinely different axis living in the
//   same number series, and R-1 chose it deliberately — a closure is sourced as
//   a closure whether it is polypropylene or aluminium, and the tree already
//   holds aluminium closures (`PK-ALCP-2441`, `MAT-77014`) that a pure-substrate
//   axis would scatter.
//
//   The `axis` field below exists so that cost is INSPECTABLE rather than
//   buried in a comment nobody re-reads. A reader can ask which groups are
//   cross-cutting and get an answer from the data.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What kind of classification a group performs. Recorded because the series
 * mixes two of them and pretending otherwise is how `MG-COLLISION-21-01`
 * happened in the first place.
 */
export type MaterialGroupAxis =
  /** Enters a formula. SOMO's cosmetic-formulation-BOM grain. */
  | 'formulation-ingredient'
  /** Sits UPSTREAM of the formulation grain — a feedstock, not an ingredient. */
  | 'upstream-input'
  /** Packaging, classified by substrate (and rigid/flexible form). */
  | 'packaging-substrate'
  /** Packaging, classified by FUNCTION — cuts across substrate. */
  | 'packaging-function';

export interface MaterialGroupEntry {
  readonly group: string;
  /** The ONE meaning. A second one is a red test, not a discovery. */
  readonly label: string;
  readonly axis: MaterialGroupAxis;
  /** Why the number is what it is, where that is not self-evident. */
  readonly note?: string;
}

/**
 * THE REGISTRY. Numbering bands are load-bearing and predate this file:
 * `MG-0x` = formulation ingredients · `MG-1x` = upstream inputs (opened by
 * R-2) · `MG-2x` = packaging. The gap between `MG-06` and `MG-20` was always
 * there; R-2's group is placed inside it rather than at the next free integer
 * precisely because the tens digit already encodes KIND, and a feedstock is a
 * different KIND rather than a seventh sort of ingredient.
 */
export const MATERIAL_GROUPS: readonly MaterialGroupEntry[] = Object.freeze([
  // ── MG-0x · enters a formula ────────────────────────────────────────────
  Object.freeze({
    group: 'MG-01',
    label: 'Surfactants / cleansing actives (lauric-oleochemical core)',
    axis: 'formulation-ingredient' as const,
  }),
  Object.freeze({
    group: 'MG-02',
    label: 'Emollients / oils / esters',
    axis: 'formulation-ingredient' as const,
  }),
  Object.freeze({
    group: 'MG-03',
    label: 'Humectants / glycols',
    axis: 'formulation-ingredient' as const,
  }),
  Object.freeze({
    group: 'MG-04',
    label: 'Active ingredients — mostly tail',
    axis: 'formulation-ingredient' as const,
  }),
  Object.freeze({
    group: 'MG-05',
    label: 'Fragrance & sensory — the opaque tail',
    axis: 'formulation-ingredient' as const,
  }),
  Object.freeze({
    group: 'MG-06',
    label: 'Botanical extracts & functional',
    axis: 'formulation-ingredient' as const,
  }),

  // ── MG-1x · upstream of the formulation grain (opened by R-2) ───────────
  Object.freeze({
    group: 'MG-10',
    label: 'Oleochemical feedstocks (upstream of the formulation grain)',
    axis: 'upstream-input' as const,
    note:
      'R-2. Fatty acids, palm/PKO and split-stream distillates are INPUTS TO the ' +
      'materials in MG-01..06, not members of them. Two independent readings ' +
      'agreed: SOMO\'s master is a cosmetic-formulation BOM holding what ENTERS a ' +
      'formula, and these sit upstream of that grain; and several of them already ' +
      'appear in this tree as ROOT BENCHMARKS (fatty_acid_coconut, cpo, ' +
      'myristic_acid) — i.e. as inputs to should-cost models rather than as ' +
      'modelled materials. MEMBER-LESS UNTIL 2B-2, deliberately: a group declared ' +
      'ahead of its members is a decision recorded; a group invented during an ' +
      'adoption is a decision smuggled.',
  }),

  // ── MG-2x · packaging ───────────────────────────────────────────────────
  Object.freeze({
    group: 'MG-20',
    label: 'Rigid plastic packaging',
    axis: 'packaging-substrate' as const,
  }),
  Object.freeze({
    group: 'MG-21',
    label: 'Closures',
    axis: 'packaging-function' as const,
    note:
      'R-1. The master declared MG-21 = closures and the should-cost taxonomy ' +
      'declared it = glass packaging. DECLARED OWNERSHIP DECIDES: the master owns ' +
      'material identity, material group is part of identity, so the taxonomy ' +
      'moved and glass took a new number (MG-25). This is the ONE group on a ' +
      'functional axis; see the header for why that was chosen over a pure ' +
      'substrate series, and `materialGroups.test.ts` for the pin that keeps it ' +
      'single-meaning.',
  }),
  Object.freeze({
    group: 'MG-22',
    label: 'Metal packaging',
    axis: 'packaging-substrate' as const,
  }),
  Object.freeze({
    group: 'MG-23',
    label: 'Paper & board packaging',
    axis: 'packaging-substrate' as const,
  }),
  Object.freeze({
    group: 'MG-24',
    label: 'Flexible packaging',
    axis: 'packaging-substrate' as const,
  }),
  Object.freeze({
    group: 'MG-25',
    label: 'Glass packaging',
    axis: 'packaging-substrate' as const,
    note:
      'R-1. Moved here from MG-21, which the master owns for closures. One edit ' +
      'against ONE taxonomy member, rather than a change to ratified seed data.',
  }),
]);

/** Every declared group number, sorted. */
export const declaredGroups = (): readonly string[] =>
  MATERIAL_GROUPS.map((g) => g.group).sort();

/** The meaning of a group, or `null` — never a fallback label. A group nobody
 *  declared is an honest silence, the same shape as `uomOf`'s refusal. */
export const groupLabel = (group: string): string | null =>
  MATERIAL_GROUPS.find((g) => g.group === group)?.label ?? null;
