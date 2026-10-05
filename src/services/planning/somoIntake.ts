// ────────────────────────────────────────────────────────────────────────────
// B3 · THE GENERATED SOMO INTAKE LINES — what makes a grid cell committable.
//
// An `acceptedQty` cell commits through `t_intake_commit`, and that verb acts on
// an INTAKE LINE. The generated SOMO fixture proposes a requisition quantity
// (`suggestedQty`) for every synthetic material × bucket, which is exactly what
// an intake line is: a producer's proposal a planner accepts, changes or leaves.
// So each of those proposals IS a SOMO intake line, addressable by id, and the
// grid cell's `seamRef` is that id (C6 §1 — an overlay entry must anchor to a
// real seam row, and this is the row).
//
// ⚠️ ADDRESSABLE, NOT ENUMERATED. The lines are a pure function of the seed like
// every other generated value, so no ~30,000-row array is held: an id is parsed
// back into (material, bucket) and answered on demand. An id that does not
// parse, names a real (non-generated) code, falls outside the fixture horizon
// or lands on a bucket where SOMO proposed nothing resolves to NOTHING — the
// store and the dispatcher then refuse it as a line nobody emitted.
//
// ⚠️ THE PRODUCER DELIVERS WHAT IT PROPOSED. `acceptedQty === suggestedQty` on a
// generated line: SOMO's own trimming (A1-R2, `pil-somo-002`) is a hand-authored
// case in `fixtures/prIntake.ts`, not a generated one. So the baseline every
// override is measured from is the proposal, and a reason is owed the moment
// the planner leaves it.
//
// ⚠️ PLN-3 · IN THE INTAKE QUEUE NOW — ONE POPULATION (R-PLN P0 #6). Until
// PLN-3 `getIntakeLines` listed only the four authored lines while the grid
// committed these, so the queue a planner triaged was not the set the grid
// pushed: a generated line could be committed and never dismissed, and the
// queue's counts described four lines out of thousands. `generatedIntakeLines`
// enumerates them for the one read; a line is still ANSWERED on demand by id.
// ────────────────────────────────────────────────────────────────────────────

import type { PrIntakeLine } from '../data/types';
import { parseBucket, type BucketGrain, type BucketId } from './bucket';
import { somoHorizon } from './facts';
import {
  PLANNING_MATERIALS,
  generatedDemand,
  generatedSuggested,
  generatedUnitPrice,
  isGeneratedMaterial,
  planningGrainOf,
  planningMaster,
} from './somoFixture';

const PREFIX = 'pil-somo-';

/** The intake line id SOMO's proposal for a material in a bucket carries. */
export const somoIntakeLineId = (materialCode: string, bucket: BucketId): string =>
  `${PREFIX}${materialCode}@${bucket}`;

/** The (material, bucket) an id names, or null when it is not a generated id. */
export function parseSomoIntakeLineId(id: string): { materialCode: string; bucket: BucketId } | null {
  if (!id.startsWith(PREFIX)) return null;
  const rest = id.slice(PREFIX.length);
  const at = rest.lastIndexOf('@');
  if (at <= 0 || at === rest.length - 1) return null;
  return { materialCode: rest.slice(0, at), bucket: rest.slice(at + 1) };
}

/**
 * The generated SOMO intake line an id names, or `null` when SOMO emitted none.
 * Frozen, and equal by value across calls — the same question, the same answer.
 */
export function generatedIntakeLine(id: string): PrIntakeLine | null {
  const parts = parseSomoIntakeLineId(id);
  if (!parts || !isGeneratedMaterial(parts.materialCode)) return null;
  const bucket = parseBucket(parts.bucket);
  if (!bucket.ok || bucket.bucket.id !== parts.bucket) return null;
  if (!somoHorizon(bucket.bucket.grain).includes(parts.bucket)) return null;
  return lineOf(parts.materialCode, parts.bucket);
}

/**
 * The line SOMO proposed for a material in a bucket ALREADY KNOWN to be on the
 * fixture horizon, or null where it proposed nothing.
 *
 * ⚠️ PLN-5 · SPLIT OUT SO THE ENUMERATION ASKS FOR THE HORIZON ONCE PER GRAIN,
 * NOT ONCE PER LINE. `somoHorizon` re-derives the horizon from the SDC clock on
 * every call (it is deliberately not cached: a shifted clock must move it), and
 * `generatedIntakeLine` asked it again for each of ~15,000 lines — measured at
 * 1.0–1.6 s of the intake view's 1.8 s first build. The by-id path above still
 * asks, because a single id carries no horizon of its own.
 */
function lineOf(materialCode: string, bucket: BucketId): PrIntakeLine | null {
  const id = somoIntakeLineId(materialCode, bucket);
  const parts = { materialCode, bucket };
  const suggested = generatedSuggested(parts.materialCode, parts.bucket);
  if (suggested === null) return null;
  const entry = planningMaster()[parts.materialCode];
  return Object.freeze({
    id,
    material: entry.label,
    suggestedSource: null,
    segment: null,
    suggestedQty: suggested,
    acceptedQty: suggested,
    uom: entry.canonicalUom,
    periodBucket: parts.bucket,
    estimatedValue: suggested * generatedUnitPrice(parts.materialCode),
    // PLN-1 · the price travels with the line, so a commit at any quantity is priced from it.
    unitPrice: generatedUnitPrice(parts.materialCode),
    source: 'SOMO',
    // PLN-3 · the producer's "why", from the two figures it proposed from —
    // producer data like the authored lines' rationale, never planner copy.
    deficit: `Planned demand ${generatedDemand(parts.materialCode, parts.bucket)} ${entry.canonicalUom} in ${parts.bucket}; SOMO proposes ${suggested}`,
  });
}

let generatedPopulation: readonly PrIntakeLine[] | null = null;

/**
 * PLN-3 · EVERY generated SOMO intake line, in material then bucket order —
 * the generator's own population, at each material's own grain
 * (`PLANNING_GRAIN_OF_TYPE`), over the fixture horizon, wherever SOMO proposed
 * a quantity. A pure function of the seed, so it is built once.
 */
export function generatedIntakeLines(): readonly PrIntakeLine[] {
  if (generatedPopulation) return generatedPopulation;
  const out: PrIntakeLine[] = [];
  // The horizon is read ONCE PER GRAIN here, and every bucket in it is on it by
  // construction — `lineOf` skips the by-id path's re-derivation (PLN-5).
  const horizonOf = new Map<BucketGrain, readonly BucketId[]>();
  for (const code of PLANNING_MATERIALS) {
    if (!isGeneratedMaterial(code)) continue;
    const grain = planningGrainOf(code);
    if (grain === null) continue;
    if (!horizonOf.has(grain)) horizonOf.set(grain, somoHorizon(grain));
    for (const bucket of horizonOf.get(grain)!) {
      const line = lineOf(code, bucket);
      if (line) out.push(line);
    }
  }
  generatedPopulation = Object.freeze(out);
  return generatedPopulation;
}

/**
 * ⚠️ PLN-2 · ONE MATERIAL × PERIOD COMMITS AT MOST ONCE, ACROSS GRAINS.
 *
 * The committed line, if any, that already speaks for the material and period a
 * line names at the OTHER grain — a week inside a month committed, or a month
 * holding a committed week. Same-grain is not this rule's: two lines at one
 * grain never overlap, and a second commit of the SAME line is refused by the
 * flow's legality and the cascade's replay key.
 *
 * Measured at R-PLN: SIM-PM-0068 committed in 2026-11 and in a week of it became
 * two requisitions for one requirement. The generator now plans a material at
 * one grain (`PLANNING_GRAIN_OF_TYPE`), so that pair cannot be emitted; this is
 * what stands behind a producer that ever emits both — F1's real SOMO — and it
 * reads only line ids, so it cannot be satisfied by a payload.
 *
 * ⚠️ IT SEES GENERATED LINES ONLY. An authored C7 line (`pil-grid-001`) carries
 * a display label, not a material code (`facts.ts` says why a label join is a
 * guess), so it names no material this rule could compare.
 */
export function crossGrainCommitment(lineId: string, committedLineIds: Iterable<string>): string | null {
  const self = parseSomoIntakeLineId(lineId);
  if (!self) return null;
  const mine = parseBucket(self.bucket);
  if (!mine.ok) return null;
  for (const otherId of committedLineIds) {
    if (otherId === lineId) continue;
    const other = parseSomoIntakeLineId(otherId);
    if (!other || other.materialCode !== self.materialCode) continue;
    const theirs = parseBucket(other.bucket);
    if (!theirs.ok || theirs.bucket.grain === mine.bucket.grain) continue;
    // Half-open intervals [start, end): a week ending on the 1st does not overlap that month.
    if (mine.bucket.startUtc < theirs.bucket.endUtc && theirs.bucket.startUtc < mine.bucket.endUtc) return otherId;
  }
  return null;
}
