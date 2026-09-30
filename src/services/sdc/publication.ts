// ────────────────────────────────────────────────────────────────────────────
// B4a · THE FORECAST PUBLICATION — the pure rules the machine and its readers
// share (Design 2 §2.1). No store, no fixture: the mock target, the hooks and
// the read seam all ask these, so a rule is written once.
// ────────────────────────────────────────────────────────────────────────────

import type { BucketGrain } from '../planning/bucket';
import type { CommitmentClass, ForecastLine, ForecastPublication } from './types';

// The deadline offset is the ONE that already exists — `consolidation.ts`'s
// `RESPONSE_DUE_DAYS`, which the chase already reads. A second constant here
// would be a second answer to "when is it due?" (Design 2 §5.3 makes it a
// GOVERNED setting with a ledger — SE-18; until then this is the one place).
import { RESPONSE_DUE_DAYS, sameCommitment } from './consolidation';

const DAY_MS = 86_400_000;

/** `publishedAt + RESPONSE_DUE_DAYS`, as an ISO instant. */
export const responseDueAtFor = (publishedAt: string): string =>
  new Date(Date.parse(publishedAt) + RESPONSE_DUE_DAYS * DAY_MS).toISOString();

/**
 * Is the response window past? DERIVED at read, never stored — a stored
 * "overdue" is a clock-state frozen at the instant somebody wrote it (law 0.5).
 * A publication with no deadline is never overdue: nobody set one.
 */
export function isResponseOverdue(pub: Pick<ForecastPublication, 'responseDueAt'>, now: string): boolean {
  return pub.responseDueAt !== undefined && Date.parse(now) > Date.parse(pub.responseDueAt);
}

/**
 * The commitment class a line in `bucket` carries.
 *
 * ⚠️ THE PROJECTION RULE IS C8 §2.2 AND IT IS UNRATIFIED (Design 1 D7). What is
 * built is the seed's own shape and nothing more: PERIOD-GLOBAL FIRM — the
 * horizon's FIRST bucket is the locked period and every line in it is `firm`;
 * every later bucket is `semi-firm`. `visibility-only` is not projected by the
 * machine; it is the class the seed authored and the one a ruling may add.
 */
export function commitmentClassFor(horizon: readonly string[], bucket: string): CommitmentClass {
  return horizon[0] === bucket ? 'firm' : 'semi-firm';
}

/** The key a material × bucket total is stored under. */
export const totalKey = (materialCode: string, bucket: string): string => `${materialCode}|${bucket}`;

/** Store-minted: `PUB-<grain>-<planVersion>-r<n>`. */
export const publicationIdFor = (grain: BucketGrain, planVersion: string, revision: number): string =>
  `PUB-${grain}-${planVersion}-r${revision}`;

// ─── B4b · the publish gates as data, shared by the hooks and the panel ──────
//
// The panel disables Publish WITH THE STATED REASON until the hooks would pass
// (Design 2 §2.3: "never a toast after a refusal"). To say that honestly the
// panel must ask the SAME question the hooks ask, so the predicates live here
// once and both call them — a panel re-deriving the rule would be a second
// answer that drifts.

/** The closed vocabulary a line's class must come from (C8 §2.2's three). */
export const COMMITMENT_CLASSES: readonly CommitmentClass[] = Object.freeze(['firm', 'semi-firm', 'visibility-only']);

/** Firm lines that no person has signed (invariant #3). */
export const unsignedFirmLines = (lines: readonly ForecastLine[]): readonly ForecastLine[] =>
  lines.filter((l) => l.commitmentClass === 'firm' && !l.allocation.approvedBy);

/** Lines whose class is absent or outside the vocabulary. */
export const linesWithoutClass = (lines: readonly ForecastLine[]): readonly ForecastLine[] =>
  lines.filter((l) => !(COMMITMENT_CLASSES as readonly unknown[]).includes(l.commitmentClass));

/** `material bucket supplier` — how a refusal and the panel name one line. */
export const lineLabel = (l: Pick<ForecastLine, 'materialCode' | 'periodBucket' | 'supplierId'>): string =>
  `${l.materialCode} ${l.periodBucket} ${l.supplierId}`;

export type PublishBlocker =
  | { readonly kind: 'NO_LINES' }
  | { readonly kind: 'UNSIGNED_FIRM'; readonly lines: readonly ForecastLine[] }
  | { readonly kind: 'NO_CLASS'; readonly lines: readonly ForecastLine[] };

/** Every reason publish would be refused by a hook, in the flow's hook order. */
export function publishBlockers(lines: readonly ForecastLine[]): readonly PublishBlocker[] {
  const out: PublishBlocker[] = [];
  if (lines.length === 0) out.push({ kind: 'NO_LINES' });
  const unsigned = unsignedFirmLines(lines);
  if (unsigned.length > 0) out.push({ kind: 'UNSIGNED_FIRM', lines: unsigned });
  const classless = linesWithoutClass(lines);
  if (classless.length > 0) out.push({ kind: 'NO_CLASS', lines: classless });
  return out;
}

/**
 * The split a revision starts from (Design 2 §2.1 "the previous allocations
 * pre-fill"). Each line of `previous` whose material-period the new draft holds
 * a total for is copied WITH ITS CLASS and WITHOUT ITS SIGNATURE — a signature
 * is given to one publication, and the new one has not been signed.
 *
 * ⚠️ A MATERIAL-PERIOD WHOSE CARRIED SPLIT WOULD EXCEED THE NEW TOTAL IS NOT
 * CARRIED AT ALL. Carrying it would put a draft above SOMO's total without a
 * single `t_publication_allocate` — integrity #4 broken by the one path that
 * skips its hook. It starts unallocated, and the planner splits it again.
 */
export function carriedLines(
  previous: readonly ForecastLine[],
  horizon: readonly string[],
  totals: Readonly<Record<string, number>>,
): readonly ForecastLine[] {
  const inHorizon = new Set(horizon);
  const sums = new Map<string, number>();
  for (const l of previous) {
    const k = totalKey(l.materialCode, l.periodBucket);
    if (!inHorizon.has(l.periodBucket) || totals[k] === undefined) continue;
    sums.set(k, (sums.get(k) ?? 0) + l.forecastQty);
  }
  return previous
    .filter((l) => {
      const k = totalKey(l.materialCode, l.periodBucket);
      return sums.has(k) && sums.get(k)! <= totals[k];
    })
    .map((l) => {
      const { approvedBy: _by, approvedAt: _at, ...allocation } = l.allocation;
      return Object.freeze({
        ...l,
        allocation: Object.freeze({
          ...allocation,
          materialPeriodTotal: totals[totalKey(l.materialCode, l.periodBucket)],
          // B4b-2 · operator ruling: a carried line SAYS it was carried.
          basis: 'carried-forward' as const,
        }),
      });
    });
}

// ─── B4b-2 · net change (Design 2 §2.1, C8 GG-7) ────────────────────────────
//
// A revision re-publishes the whole plan; the supplier should re-confirm only
// what MOVED. A line whose quantity AND class equal the superseded
// publication's is "carried — no re-confirmation needed", and the answer given
// against the superseded line still counts. Derived at read, never stored.

// `sameCommitment` lives in `consolidation.ts` (this module already imports
// it; the reverse import would be a cycle) and is the ONE rule both read.

/** The line of `pub` that answers to the same supplier × material × period, if any. */
export const counterpartIn = (pub: ForecastPublication | null, line: ForecastLine): ForecastLine | undefined =>
  pub?.lines.find(
    (l) => l.supplierId === line.supplierId && l.materialCode === line.materialCode && l.periodBucket === line.periodBucket,
  );

/**
 * The publication `current` superseded: the one published just before it over
 * the same grain. A horizon's grain is read from its first bucket — a week id
 * carries a `W`, a month id does not (A1's vocabulary).
 *
 * ⚠️ ORDERED BY `publishedAt`, THEN BY THE ORDER THE PUBLICATIONS ARRIVE — the
 * same tie-break `currentPublication` uses. The SDC clock is frozen, so two
 * revisions published in one session share an instant; the order the store
 * recorded them in is then the only order there is.
 */
export function previousPublication(
  publications: readonly ForecastPublication[],
  current: ForecastPublication | null,
): ForecastPublication | null {
  if (!current) return null;
  const weekly = (p: ForecastPublication) => (p.horizon[0] ?? '').includes('W');
  const ordered = publications
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => weekly(p) === weekly(current))
    .sort((a, b) => Date.parse(a.p.publishedAt) - Date.parse(b.p.publishedAt) || a.i - b.i);
  const k = ordered.findIndex(({ p }) => p.publicationId === current.publicationId);
  return k > 0 ? ordered[k - 1].p : null;
}

export type NetChange = 'carried' | 'changed';

/** Carried iff the superseded publication held the same commitment for this line. */
export function netChangeOf(line: ForecastLine, previous: ForecastPublication | null): NetChange {
  const prior = counterpartIn(previous, line);
  return prior && sameCommitment(prior, line) ? 'carried' : 'changed';
}

/** How many of `lines` changed and how many were carried. */
export function netChangeSummary(
  lines: readonly ForecastLine[],
  previous: ForecastPublication | null,
): { readonly changed: number; readonly carried: number } {
  let changed = 0;
  let carried = 0;
  for (const l of lines) {
    if (netChangeOf(l, previous) === 'carried') carried++;
    else changed++;
  }
  return { changed, carried };
}
