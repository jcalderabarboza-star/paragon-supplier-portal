// ────────────────────────────────────────────────────────────────────────────
// B4a · THE FORECAST PUBLICATION — the pure rules the machine and its readers
// share (Design 2 §2.1). No store, no fixture: the mock target, the hooks and
// the read seam all ask these, so a rule is written once.
// ────────────────────────────────────────────────────────────────────────────

import type { BucketGrain } from '../planning/bucket';
import type { CommitmentClass, ForecastPublication } from './types';

// The deadline offset is the ONE that already exists — `consolidation.ts`'s
// `RESPONSE_DUE_DAYS`, which the chase already reads. A second constant here
// would be a second answer to "when is it due?" (Design 2 §5.3 makes it a
// GOVERNED setting with a ledger — SE-18; until then this is the one place).
import { RESPONSE_DUE_DAYS } from './consolidation';

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
