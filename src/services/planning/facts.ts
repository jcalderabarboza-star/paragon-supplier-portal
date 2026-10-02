// ────────────────────────────────────────────────────────────────────────────
// B1 · PLANNING FACTS (Design 1 §2.3–§2.4) — the long-form record every
// measure is stored as. The MOCK derivation lives in
// `data/mock/planningFacts.ts`; this module holds the shape and the bucket
// helpers, and imports no store.
//
// Long form, not a wide row: a `{ demand, confirmed, soh, … }` row is a list
// that decays each time a measure is added (`FLOOR-IN-PROSE-01`'s shape in a
// DTO). Here "add a measure" is a registry entry and a producer, with no change
// to the read seam or to anything that renders it.
//
// ⚠️ `value: null` MEANS "THE PRODUCER GAVE NO FIGURE", AND IS NEVER A ZERO.
// A zero is a claim (the supplier can supply nothing; nothing is on order); a
// null is an absence. The grid renders the dash for one and the number for the
// other, and a producer that has no answer must say null rather than 0.
//
// ⚠️ WHAT THE REAL STORES CANNOT ANSWER, STATED AT THE SITE:
//  · `suggestedQty` / `acceptedQty` from the INTAKE LINES: a `PrIntakeLine`
//    carries a display string (`material: 'Niacinamide USP'`), not a
//    `materialCode`, and the strings do not match the master's labels. A join
//    on a label is a guess; a fact minted from a guess is a fabricated fact. So
//    the intake store contributes NO planning fact until the line carries a code
//    (B0's contract half, not yet in the tree). The generated fixture supplies
//    `suggestedQty` for synthetic materials, and since B3 each such proposal
//    IS a generated SOMO intake line (`somoIntake.ts`): its `acceptedQty` fact
//    is keyed by that line and reads PLANNED until `t_intake_commit` commits it.
//  · `openPo` / `received`: PO lines and GR inspection lines live in the mock
//    document identity space (~30 codes); a line whose code the planning master
//    cannot resolve is skipped, never given a unit (D-OPS-MASTERMISS).
//  · `rop` / `safetyStock` / `projectedStock`: SPEC. No producer — no fact.
// ────────────────────────────────────────────────────────────────────────────

import type { Tier } from '../liveness/registry';
import { sdcClock, type Uom } from '../sdc';
import { parseBucket, type BucketGrain, type BucketId, type BucketRefusalReason } from './bucket';
import type { MeasureId, MeasureSource } from './measures';

/** Who produced a fact, how live that producer is, and whether it is a plan. */
export interface PlanningFactProvenance {
  readonly source: MeasureSource;
  readonly liveness: Tier;
  readonly planState: 'committed' | 'planned';
}

export interface PlanningFact {
  readonly materialCode: string;
  /** null for material-grain measures; set for supplier-grain ones. */
  readonly supplierId: string | null;
  readonly periodBucket: BucketId;
  readonly measureId: MeasureId;
  /** null = the producer answered "no figure" — a dash, never 0. */
  readonly value: number | null;
  /** Always the material's canonical unit, from the planning master. */
  readonly uom: Uom;
  readonly provenance: PlanningFactProvenance;
  /** The producer's own stamp: planVersion · response id · document ref · fixture seed. */
  readonly sourceRef: string;
  /**
   * B4b · the seam row a SUPPLIER-grain cell's edit anchors to, when the seam
   * offers one — an allocation on the open draft (`allocationAnchor`). Absent
   * everywhere else. A material-grain cell anchors on `sourceRef` (B3's intake
   * line), unchanged.
   */
  readonly editAnchor?: string;
  /**
   * PLN-3 · the intake line this fact is keyed by has been SET ASIDE
   * (`t_intake_dismiss`). Present only on such an `acceptedQty` fact. The
   * figure is still the producer's — a dismissal decides that nobody acts on
   * it, not what it is — so it stays PLANNED and is marked, never dropped.
   */
  readonly dismissed?: true;
}

/** The seam's query shape — declared once, on the service contract. */
export type { PlanningFactsQuery } from '../data/types';

export type PlanningFactsOutcome =
  | { readonly ok: true; readonly grain: BucketGrain; readonly facts: readonly PlanningFact[] }
  | { readonly ok: false; readonly reason: BucketRefusalReason; readonly raw: string };

// ─── Buckets ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** The bucket an instant falls in, at a grain. Computed, never stored. */
export function bucketOf(instant: string, grain: BucketGrain): BucketId {
  const ms = Date.parse(instant);
  const d = new Date(ms);
  if (grain === 'month') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  const weekday = d.getUTCDay() || 7;
  const thursday = new Date(ms + (4 - weekday) * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  const week = Math.floor((Date.UTC(isoYear, thursday.getUTCMonth(), thursday.getUTCDate()) - jan1) / (7 * DAY_MS)) + 1;
  return `${isoYear}-W${pad(week)}`;
}

/** `length` consecutive buckets starting at `start` (inclusive). */
export function horizonFrom(start: BucketId, length: number): readonly BucketId[] {
  const first = parseBucket(start);
  if (!first.ok) return [];
  const out: BucketId[] = [];
  let cursor = first.bucket;
  for (let i = 0; i < length; i++) {
    out.push(cursor.id);
    const next = parseBucket(bucketOf(cursor.endUtc, cursor.grain));
    if (!next.ok) break;
    cursor = next.bucket;
  }
  return out;
}

/** The generated fixture's two horizons, anchored on the SDC present. */
export const somoHorizon = (grain: BucketGrain): readonly BucketId[] =>
  horizonFrom(bucketOf(sdcClock.now(), grain), grain === 'month' ? 12 : 16);
