// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 1: the release-calendar generator (pure).
//
// The core logic: (cadence + startDate + qtyPerRelease + agreedTotalQty) →
// a materialized array of dated draft ScheduleLine rows. This is the SAP LPA
// "cadence is the generator at signing; the stored truth is the dated ledger"
// (spec D2). Every line is emitted 'draft' (internal character); the draft→
// released transition and all fulfillment are later batches.
//
// PURE and DETERMINISTIC: same input → same output. UTC date arithmetic only
// (Date.UTC + explicit-timestamp `new Date(ms)`, mirroring consolidation.ts) —
// NO argless `new Date()` wall-clock read, NO Math.random.
// ─────────────────────────────────────────────────────────────────────────────

import type { CommitmentClass } from '../sdc/types';
import type { ReleaseCadence, ReleaseType, ScheduleLine } from './types';

const DAY_MS = 86_400_000;

/**
 * The ONE mapping from the stored SAP release type into the existing SDC
 * commitment taxonomy (Decision B). JIT (hard near-term dates) → firm; FRC
 * (forecast horizon) → semi-firm. commitmentClass is DERIVED via this helper,
 * never stored on a line — the portal does not fork the firm/semi-firm taxonomy.
 */
export function commitmentClassOf(releaseType: ReleaseType): CommitmentClass {
  return releaseType === 'JIT' ? 'firm' : 'semi-firm';
}

/** Format an absolute UTC timestamp as a date-only ISO string ('YYYY-MM-DD'). */
function formatDateUtc(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The k-th release date, cadence-stepped from `startDate` (UTC). weekly = +7k
 * days (ms arithmetic); monthly = +k calendar months; quarterly = +3k calendar
 * months (both via Date.UTC, which rolls year/month overflow). Month-end
 * overflow follows JS semantics (day-31 into a shorter month rolls forward);
 * the Batch-1 fixtures start on day 01, so no rollover occurs.
 */
function releaseDateAt(startMs: number, cadence: ReleaseCadence, k: number): string {
  if (cadence === 'weekly') return formatDateUtc(startMs + k * 7 * DAY_MS);
  const base = new Date(startMs);
  const step = cadence === 'quarterly' ? 3 * k : k;
  return formatDateUtc(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + step, base.getUTCDate()),
  );
}

export interface GenerateScheduleInput {
  readonly contractId: string;
  readonly agreementId: string;
  readonly lineSeq: number;
  /** ISO date/timestamp — the first release date. */
  readonly startDate: string;
  readonly cadence: ReleaseCadence;
  readonly qtyPerRelease: number;
  readonly agreedTotalQty: number;
  readonly releaseType: ReleaseType;
}

/**
 * Materialize the release calendar. Count n = ceil(agreedTotalQty /
 * qtyPerRelease); every line carries `qtyPerRelease` except the LAST, which
 * carries the remainder agreedTotalQty − qtyPerRelease·(n−1) (equal to
 * qtyPerRelease when evenly divisible, otherwise a smaller positive tail).
 *
 * INVARIANT: Σ plannedQty === agreedTotalQty, exactly.
 *
 * Guard: a non-positive envelope or per-release qty yields [] — never a zero or
 * negative line. Every line is emitted state:'draft', with the portal join-chain
 * releaseRef (contract/agreement/item/release) and NO fulfillment fields.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleLine[] {
  const { contractId, agreementId, lineSeq, cadence, qtyPerRelease, agreedTotalQty, releaseType } =
    input;
  if (agreedTotalQty <= 0 || qtyPerRelease <= 0) return [];

  const n = Math.ceil(agreedTotalQty / qtyPerRelease);
  const startMs = Date.parse(input.startDate);
  const lines: ScheduleLine[] = [];
  for (let i = 0; i < n; i++) {
    const releaseSeq = i + 1;
    const isLast = i === n - 1;
    const plannedQty = isLast ? agreedTotalQty - qtyPerRelease * (n - 1) : qtyPerRelease;
    lines.push({
      releaseRef: `${contractId}/${agreementId}/${lineSeq}/${releaseSeq}`,
      releaseSeq,
      releaseType,
      releaseDate: releaseDateAt(startMs, cadence, i),
      plannedQty,
      state: 'draft',
    });
  }
  return lines;
}
