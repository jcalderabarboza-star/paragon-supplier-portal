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
import type { ForecastPublication, PublicationDocument, PublicationLedgerEntry } from '../../../sdc/types';
import { parseHorizon, type BucketGrain } from '../../../planning/bucket';

// B4b · the record's shape is the seam's `PublicationDocument` (sdc/types), so
// the buyer read hands out exactly what the store holds, minus the seed object.
export type { PublicationState } from '../../../sdc/types';

export interface PublicationRecord extends PublicationDocument {
  /** A seed's own frozen publication object — kept so readers see the same object. */
  readonly seed?: ForecastPublication;
}

const seededRow = (verb: PublicationLedgerEntry['verb'], at: string, seq: number): PublicationLedgerEntry =>
  Object.freeze({ verb, at, seq, personId: null, seeded: true as const });

function seedRecords(): PublicationRecord[] {
  const byDate = [...FORECAST_PUBLICATIONS].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  // The seeds' rows in the order they happened: each publish, then the
  // supersede it caused (the NEXT seed's publish retires this one).
  const publishSeq = (i: number) => 2 * i + 1;
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
      // The seeds were never opened or published through the verb, and their
      // ledger rows SAY so (`seeded`) rather than inventing an actor.
      ledger: Object.freeze([
        seededRow('t_publication_publish', p.publishedAt, publishSeq(i)),
        ...(next ? [seededRow('t_publication_supersede', next.publishedAt, publishSeq(i + 1) + 1)] : []),
      ]),
      seed: p,
    };
  });
}

let rows: PublicationRecord[] = seedRecords();
/** The last ledger sequence handed out — the seeds' own rows took the first. */
const seedSeq = (): number => Math.max(0, ...rows.flatMap((r) => r.ledger.map((e) => e.seq)));
let lastSeq = seedSeq();

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
  /**
   * B4b · the open draft of a grain — the one the grid's allocation cells edit.
   * Since B4b-2 there is at most one: `PUB_ONE_OPEN_DRAFT` refuses a second
   * open by name. The LATEST is still what is returned, so a store written
   * around the verb cannot make this answer ambiguous.
   */
  draftFor(grain: BucketGrain): PublicationRecord | undefined {
    const drafts = rows.filter((r) => r.state === 'Draft' && r.grain === grain);
    return drafts[drafts.length - 1];
  },
  /** The Published publication of a grain (at most one — publish supersedes). */
  currentFor(grain: BucketGrain): PublicationRecord | undefined {
    return rows.find((r) => r.state === 'Published' && r.grain === grain);
  },
  /** The next ledger sequence (monotonic; `reset` returns it to the seeds'). */
  nextSeq(): number {
    lastSeq += 1;
    return lastSeq;
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
    lastSeq = seedSeq();
  },
};
