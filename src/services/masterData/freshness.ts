// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · FRESHNESS — computed at read, never stored.
//
// A stored "stale" flag would be a clock state in a table, which the platform
// forbids (law 0.5): it would be right on the day it was written and wrong the
// day after, with nobody touching the record. So freshness is a function of the
// stamp and an instant the caller supplies, and the pages supply the declared
// present like every other deadline in the tree.
//
// Decision 10: materials and suppliers 24 hours, reference tables 7 days. A
// stale record WARNS and does not refuse — staleness is a fact about the feed,
// and stopping purchasing because a nightly job failed is the wrong cost. The
// figures are placeholders until the feed's real cadence is known.
// ─────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT_INSTANT } from '../data/fixturePresent';
import { isReferenceTable, type MasterObject, type ReplicaStamp } from './types';

export type Freshness = 'FRESH' | 'STALE' | 'NOT_IN_LAST_RUN';

const HOUR_MS = 3_600_000;
export const RECORD_MAX_AGE_HOURS = 24;
export const REFERENCE_MAX_AGE_HOURS = 24 * 7;

/** How old a record of this object may be before it reads as stale. */
export const maxAgeHours = (object: MasterObject): number =>
  isReferenceTable(object) ? REFERENCE_MAX_AGE_HOURS : RECORD_MAX_AGE_HOURS;

/** The instant the master-data pages judge freshness at: the declared present. */
export const masterDataNow = (): string => DECLARED_PRESENT_INSTANT;

/** Whole hours between the read and `now`. Never negative: a read after `now` is zero hours old. */
export function ageHours(stamp: ReplicaStamp, now: string): number {
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(stamp.readAt)) / HOUR_MS));
}

export function freshnessOf(stamp: ReplicaStamp, object: MasterObject, now: string): Freshness {
  if (stamp.missingFromRun !== null) return 'NOT_IN_LAST_RUN';
  return ageHours(stamp, now) > maxAgeHours(object) ? 'STALE' : 'FRESH';
}
