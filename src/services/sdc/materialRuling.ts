// ─────────────────────────────────────────────────────────────────────────────
// OPS-2 · MATERIAL APPLICABILITY RULINGS — who ruled, and what receiving reads.
//
// R-OPS P0-5: a material whose halal or BPOM applicability nobody had ruled on
// could not be received, and no surface let anybody rule. The operator's ruling:
//
//   · each material carries a governed switch per regime — applicable: yes / no;
//   · only Compliance sets it, with a reason; it is recorded, attributed and
//     reversible (a later ruling supersedes an earlier one — nothing is edited);
//   · halal APPLIES TO PACKAGING BY DEFAULT (`sdc/halal.ts`);
//   · a raw material with no BPOM ruling stays pending — Compliance to rule —
//     and blocks receipt.
//
// This module is the pure half: the ruling's shape, which ruling is in force,
// and the answer receiving reads. The ledger lives behind the service
// (`materialRulingStore`); the verb is `t_material_ruling_set`.
//
// ⚠️ THE MASTER IS NOT REWRITTEN BY A RULING, AND NEITHER LOOKUP IS REPLACED.
// `halalOf` and `bpomOf` still answer for the master, unchanged; a ruling is
// read OVER their outcome (`halalUnderRuling`, `bpomUnderRuling`). So a reader
// can always tell "the master says" from "Compliance ruled" — the outcome
// carries the ruling when there is one — and the day the SAP material master
// carries these two fields, the ledger is what gets migrated into it.
//
// ⚠️ A RULING CANNOT ANSWER FOR A MATERIAL THE MASTER DOES NOT HOLD.
// `UNKNOWN_MATERIAL` passes through untouched: the verb refuses a ruling on an
// unknown code, so none can exist, and the read does not pretend one could.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import { MATERIAL_MASTER } from './fixtures';
import { bpomOf, type BpomOutcome } from './bpom';
import { halalOf, type HalalOutcome } from './halal';
import type { MaterialMaster } from './types';

/** The two regimes a material is ruled under. */
export const RULING_REGIMES = ['halal', 'bpom'] as const;
export type RulingRegime = (typeof RULING_REGIMES)[number];

export const isRulingRegime = (value: unknown): value is RulingRegime =>
  (RULING_REGIMES as readonly unknown[]).includes(value);

/** One act on the ledger. Append-only: a change of mind is a new row. */
export interface MaterialRuling {
  readonly materialCode: string;
  readonly regime: RulingRegime;
  readonly applicable: boolean;
  readonly reason: string;
  /** From the session, never from a payload (`ACTOR_IN_PAYLOAD`). */
  readonly setBy: ActorAttribution;
  /** Store-assigned. */
  readonly setAt: string;
  /** Store-assigned order; the highest for a (material, regime) is in force. */
  readonly seq: number;
}

/** The ruling in force for one material under one regime, or `null`. */
export function rulingInForce(
  rulings: readonly MaterialRuling[],
  materialCode: string,
  regime: RulingRegime,
): MaterialRuling | null {
  let latest: MaterialRuling | null = null;
  for (const r of rulings) {
    if (r.materialCode !== materialCode || r.regime !== regime) continue;
    if (latest === null || r.seq > latest.seq) latest = r;
  }
  return latest;
}

/** Every ruling for one material under one regime, newest first. */
export function rulingHistory(
  rulings: readonly MaterialRuling[],
  materialCode: string,
  regime: RulingRegime,
): readonly MaterialRuling[] {
  return rulings
    .filter((r) => r.materialCode === materialCode && r.regime === regime)
    .sort((a, b) => b.seq - a.seq);
}

/**
 * An applicability outcome with the ruling it rests on.
 *
 * The ANSWERED arm gains `ruling` — present when Compliance answered, `null`
 * when the master did. The REFUSED arm is the lookup's own, untouched: a refusal
 * carries nothing to proceed on, and reading a ruling over it either answers it
 * (so it is no longer a refusal) or leaves it exactly as it was.
 */
export type UnderRuling<Outcome extends { readonly ok: boolean }> =
  | (Extract<Outcome, { readonly ok: true }> & { readonly ruling: MaterialRuling | null })
  | Extract<Outcome, { readonly ok: false }>;

export type RuledHalal = UnderRuling<HalalOutcome>;
export type RuledBpom = UnderRuling<BpomOutcome>;

/** The master's halal outcome with the ruling in force read over it. */
export function halalUnderRuling(
  base: HalalOutcome,
  rulings: readonly MaterialRuling[],
  materialCode: string,
): RuledHalal {
  if (!base.ok && base.reason === 'UNKNOWN_MATERIAL') return base;
  const ruling = rulingInForce(rulings, materialCode, 'halal');
  if (ruling !== null) return { ok: true, required: ruling.applicable, ruling };
  return base.ok ? { ...base, ruling: null } : base;
}

/** The master's BPOM outcome with the ruling in force read over it. */
export function bpomUnderRuling(
  base: BpomOutcome,
  rulings: readonly MaterialRuling[],
  materialCode: string,
): RuledBpom {
  if (!base.ok && base.reason === 'UNKNOWN_MATERIAL') return base;
  const ruling = rulingInForce(rulings, materialCode, 'bpom');
  if (ruling !== null) return { ok: true, applicable: ruling.applicable, ruling };
  return base.ok ? { ...base, ruling: null } : base;
}

/** Halal at receipt for a material code: the master, then the ruling over it. */
export const halalAtReceipt = (
  materialCode: string,
  rulings: readonly MaterialRuling[],
  master: MaterialMaster = MATERIAL_MASTER,
): RuledHalal => halalUnderRuling(halalOf(materialCode, master), rulings, materialCode);

/** BPOM at receipt for a material code — the same shape. */
export const bpomAtReceipt = (
  materialCode: string,
  rulings: readonly MaterialRuling[],
  master: MaterialMaster = MATERIAL_MASTER,
): RuledBpom => bpomUnderRuling(bpomOf(materialCode, master), rulings, materialCode);

/** One row of the Compliance surface: a material and where each regime stands. */
export interface MaterialApplicabilityRow {
  readonly materialCode: string;
  readonly description: string;
  readonly halal: RuledHalal;
  readonly bpom: RuledBpom;
}

/** Every material in the master with both answers, in master order. */
export function materialApplicabilityRows(
  rulings: readonly MaterialRuling[],
  master: MaterialMaster = MATERIAL_MASTER,
): readonly MaterialApplicabilityRow[] {
  return Object.keys(master).map((materialCode) => ({
    materialCode,
    description: master[materialCode].label,
    halal: halalAtReceipt(materialCode, rulings, master),
    bpom: bpomAtReceipt(materialCode, rulings, master),
  }));
}
