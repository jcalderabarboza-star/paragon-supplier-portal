// ────────────────────────────────────────────────────────────────────────────
// B4a · forecastPublicationStore — the publications BOTH seats read (Design 2
// §2.2), replacing the frozen module constant as the source of truth.
//
// ⚠️ SEEDED FROM `FORECAST_PUBLICATIONS`, AND THE SEEDS KEEP THEIR OBJECTS. A
// seed record carries the fixture's own frozen publication, so every reader
// that moved from the constant to this store reads the SAME objects it read
// before — the move changes where the answer comes from, not what it is. The
// latest seed by `publishedAt` is `Published`; every earlier one is
// `Superseded` by the next, which is exactly what `currentPublication` already
// concluded from the dates.
//
// ⚠️ A DRAFT IS NOT A PUBLICATION. It has no `publishedAt` and must never reach
// `currentPublication`, the consolidation or a supplier; `publications()` hands
// out only what was published (Published · Superseded — a Withdrawn one was
// taken back and is shown to nobody who would answer against it).
//
// In memory, like every command store in the mock: a reload re-seeds. Durable
// publication is F1's `httpDataService`, behind the same verbs.
// ────────────────────────────────────────────────────────────────────────────

import { FORECAST_PUBLICATIONS } from '../../../sdc/fixtures';
import { totalKey } from '../../../sdc/publication';
import type { ForecastLine, ForecastPublication, Provenance } from '../../../sdc/types';
import { parseHorizon, type BucketGrain } from '../../../planning/bucket';

export type PublicationState = 'Draft' | 'Published' | 'Superseded' | 'Withdrawn';

export interface PublicationRecord {
  readonly publicationId: string;
  readonly state: PublicationState;
  readonly planVersion: string;
  readonly grain: BucketGrain;
  readonly horizon: readonly string[];
  /** The SOMO emission (or the generated fixture) the draft was opened from. */
  readonly sourceRef: string;
  /** `material|bucket` → SOMO's material-period total the lines split. */
  readonly totals: Readonly<Record<string, number>>;
  readonly lines: readonly ForecastLine[];
  readonly provenance: Provenance;
  /** When the draft was opened — the machine's fact, from `sdcClock`. */
  readonly openedAt: string;
  readonly publishedAt?: string;
  readonly responseDueAt?: string;
  readonly supersededBy?: string;
  readonly withdrawnReason?: string;
  /** A seed's own frozen publication object — kept so readers see the same object. */
  readonly seed?: ForecastPublication;
}

function seedRecords(): PublicationRecord[] {
  const byDate = [...FORECAST_PUBLICATIONS].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  return byDate.map((p, i) => {
    const parsed = parseHorizon(p.horizon);
    const totals: Record<string, number> = {};
    for (const l of p.lines) totals[totalKey(l.materialCode, l.periodBucket)] = l.allocation.materialPeriodTotal;
    const next = byDate[i + 1];
    return {
      publicationId: p.publicationId,
      state: next ? 'Superseded' : 'Published',
      planVersion: p.planVersion,
      grain: parsed.ok ? parsed.grain : 'month',
      horizon: p.horizon,
      sourceRef: p.planVersion,
      totals,
      lines: p.lines,
      provenance: p.provenance,
      openedAt: p.publishedAt,
      publishedAt: p.publishedAt,
      ...(next ? { supersededBy: next.publicationId } : {}),
      seed: p,
    };
  });
}

let rows: PublicationRecord[] = seedRecords();

/** A published record as the `ForecastPublication` every reader already takes. */
export function asPublication(r: PublicationRecord): ForecastPublication {
  if (r.seed) return r.seed;
  return Object.freeze({
    publicationId: r.publicationId,
    planVersion: r.planVersion,
    publishedAt: r.publishedAt ?? r.openedAt,
    horizon: r.horizon,
    lines: r.lines,
    provenance: r.provenance,
    ...(r.responseDueAt ? { responseDueAt: r.responseDueAt } : {}),
  });
}

export const forecastPublicationStore = {
  all(): readonly PublicationRecord[] {
    return rows;
  },
  get(publicationId: string): PublicationRecord | undefined {
    return rows.find((r) => r.publicationId === publicationId);
  },
  /** What was published and not taken back — the source every reader takes. */
  publications(): readonly ForecastPublication[] {
    return rows.filter((r) => r.state === 'Published' || r.state === 'Superseded').map(asPublication);
  },
  /** The next revision number for a grain × plan version (ids are store-minted). */
  nextRevision(grain: BucketGrain, planVersion: string): number {
    return rows.filter((r) => r.grain === grain && r.planVersion === planVersion).length + 1;
  },
  put(record: PublicationRecord): void {
    // Replaced IN PLACE, so a reader's order does not move under an update.
    rows = rows.some((r) => r.publicationId === record.publicationId)
      ? rows.map((r) => (r.publicationId === record.publicationId ? record : r))
      : [...rows, record];
  },
  /** Back to the seed (test isolation). */
  reset(): void {
    rows = seedRecords();
  },
};
