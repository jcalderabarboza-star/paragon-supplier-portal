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
// ⚠️ NOT IN THE INTAKE REVIEW QUEUE. `getIntakeLines` still lists the four
// authored lines; the generated ones are reached from the grid, which is where
// they are shown. The `intake-review` VIEW that would list them is B7's.
// ────────────────────────────────────────────────────────────────────────────

import type { PrIntakeLine } from '../data/types';
import { parseBucket, type BucketId } from './bucket';
import { somoHorizon } from './facts';
import {
  generatedSuggested,
  generatedUnitPrice,
  isGeneratedMaterial,
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
    source: 'SOMO',
  });
}
