// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the at-scale ROLL-UP summary (pure, DERIVED).
//
// The cross-contract Delivery Overview is the SCAN surface ("overview scans,
// contract acts"). At two fixtures a full card per agreement was fine; at hundreds
// it is an infinite scroll. This module folds the already-derived
// DeliveryAgreementView into ONE dense row per agreement-ITEM (the grain a buyer
// scans by — fulfillment, policy, material, and late-ness are all per-item), and
// ranks them exception-first.
//
// PURE and HONEST BY CONSTRUCTION: a summary can only surface statuses the view
// ALREADY carries. The exception counts are a fold over `deriveFulfillment`'s
// output (the released lines' derived pending/fulfilled/late/missed) plus the
// count of still-draft lines — NO new read, NO new/stamped status. `now` is
// injected (the SDC-selector convention), never a wall-clock read here.
//
// NAMING (honesty): a RELEASE (draft→released) is instantaneous — never "late."
// What is late/missed is DELIVERY against a released line (deriveFulfillment). A
// row's exception counts are therefore delivery exceptions; its `nextDue` labels
// whether the next obligation is a RELEASE (a still-draft line) or a DELIVERY (a
// released line awaiting its shipment).
// ─────────────────────────────────────────────────────────────────────────────

import type { DeliveryAgreementView, DeliveryItemView } from './views';
import type { ReleaseType } from './types';

/** The primary bucket a row falls in — exception-first (worst wins). `draft` is a
 *  DISTINCT state (nothing released yet), never folded into `onTrack`: an all-draft
 *  item has no delivery performance to be "on track" about. */
export type AgreementItemBucket = 'missed' | 'late' | 'pending' | 'onTrack' | 'draft';

/** The tally of a row's line states — delivery exceptions (from the derived
 *  fulfillment of RELEASED lines) plus the count of still-draft lines. */
export interface AgreementItemCounts {
  readonly fulfilled: number;
  readonly late: number;
  readonly missed: number;
  readonly pending: number;
  readonly draft: number;
}

/** The next unmet obligation, labelled by kind: a still-draft line is a RELEASE
 *  due; a released-but-undelivered ('pending') line is a DELIVERY due. */
export interface NextDue {
  readonly date: string;
  readonly kind: 'release' | 'deliver';
}

/** One dense roll-up row = one agreement-item, summarised for the scan surface. */
export interface AgreementItemSummary {
  readonly agreementId: string;
  readonly itemSeq: number;
  readonly supplierId: string;
  readonly supplierName: string | null;
  readonly contractId: string;
  readonly materialCode: string;
  readonly releaseType: ReleaseType;
  /** Released ÷ agreed, 0–100 (the mini drawdown bar). */
  readonly releasedPct: number;
  /** The soonest UPCOMING obligation (≥ now), or null when nothing is upcoming. */
  readonly nextDue: NextDue | null;
  readonly counts: AgreementItemCounts;
  readonly bucket: AgreementItemBucket;
  /** Worst-first sort key (higher = more urgent). Derived, never stored. */
  readonly severity: number;
}

/** Bucket → base rank; the exception-first ordering (missed worst, draft calmest). */
const BUCKET_RANK: Record<AgreementItemBucket, number> = {
  missed: 4,
  late: 3,
  pending: 2,
  onTrack: 1,
  draft: 0,
};

/** The date-only portion of an ISO instant — release/eta dates share 'YYYY-MM-DD',
 *  which sorts lexically === chronologically. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Summarise ONE agreement-item for the roll-up. PURE — data in, one row out, zero
 * mutation, no clock read (`now` injected). The counts fold the item's ALREADY-
 * derived fulfillment (honesty lock: only statuses the view carries can appear).
 */
export function summarizeAgreementItem(
  view: DeliveryAgreementView,
  itemView: DeliveryItemView,
  now: string,
): AgreementItemSummary {
  const { agreement, supplierName } = view;
  const { item, ledger, fulfillment } = itemView;

  // Delivery-exception tallies over the DERIVED fulfillment of released lines
  // (never a stamped status); draft = the count of untransmitted lines.
  const counts: AgreementItemCounts = {
    fulfilled: fulfillment.filter((f) => f.fulfillment === 'fulfilled').length,
    late: fulfillment.filter((f) => f.fulfillment === 'late').length,
    missed: fulfillment.filter((f) => f.fulfillment === 'missed').length,
    pending: fulfillment.filter((f) => f.fulfillment === 'pending').length,
    draft: item.scheduleLines.filter((l) => l.state === 'draft').length,
  };

  // Exception-first bucket: the worst present state wins. An all-draft item (no
  // released line) lands in `draft`, NOT `onTrack` (no performance to judge).
  const bucket: AgreementItemBucket =
    counts.missed > 0
      ? 'missed'
      : counts.late > 0
        ? 'late'
        : counts.pending > 0
          ? 'pending'
          : counts.fulfilled > 0
            ? 'onTrack'
            : 'draft';

  const releasedPct =
    ledger.agreedTotalQty > 0 ? (ledger.releasedQty / ledger.agreedTotalQty) * 100 : 0;

  // nextDue — the soonest obligation on/after `now`, min across:
  //   · still-draft lines  → a RELEASE due (transmit the next period)
  //   · pending released lines → a DELIVERY due (awaiting the shipment)
  // On a tie, DELIVERY wins (the harder deadline — the vendor is already committed).
  const nowDay = dayOf(now);
  const pendingSeqs = new Set(
    fulfillment.filter((f) => f.fulfillment === 'pending').map((f) => f.releaseSeq),
  );
  const candidates: NextDue[] = [];
  for (const line of item.scheduleLines) {
    if (dayOf(line.releaseDate) < nowDay) continue;
    if (line.state === 'draft') {
      candidates.push({ date: line.releaseDate, kind: 'release' });
    } else if (line.state === 'released' && pendingSeqs.has(line.releaseSeq)) {
      candidates.push({ date: line.releaseDate, kind: 'deliver' });
    }
  }
  candidates.sort((a, b) =>
    a.date < b.date
      ? -1
      : a.date > b.date
        ? 1
        : a.kind === b.kind
          ? 0
          : a.kind === 'deliver'
            ? -1
            : 1,
  );
  const nextDue: NextDue | null = candidates[0] ?? null;

  // Severity: bucket dominates; within a bucket, more/worse exceptions rank higher.
  const severity =
    BUCKET_RANK[bucket] * 1_000_000 +
    counts.missed * 10_000 +
    counts.late * 100 +
    counts.pending;

  return {
    agreementId: agreement.id,
    itemSeq: item.lineSeq,
    supplierId: agreement.supplierId,
    supplierName,
    contractId: agreement.contractId,
    materialCode: item.materialCode,
    releaseType: item.releaseType,
    releasedPct,
    nextDue,
    counts,
    bucket,
    severity,
  };
}

/** Flatten every agreement-item of a view list into roll-up rows (one per item). */
export function toAgreementItemRows(
  views: readonly DeliveryAgreementView[],
  now: string,
): AgreementItemSummary[] {
  return views.flatMap((view) =>
    view.items.map((itemView) => summarizeAgreementItem(view, itemView, now)),
  );
}

/** The active roll-up filter state (the page owns it; this module is pure). */
export interface RowFilter {
  readonly tab: AgreementItemBucket | 'all';
  readonly search: string;
  readonly supplierIds: readonly string[];
  readonly releaseTypes: readonly ReleaseType[];
}

/**
 * Filter + rank rows for the dense list. PURE. Filters by bucket tab, a
 * case-insensitive search over supplier / contract / material, and the supplier /
 * release-type chip sets; then sorts EXCEPTION-FIRST (severity desc), soonest
 * nextDue next, and a stable (agreementId, itemSeq) tie-break so the order is
 * deterministic.
 */
export function filterAndRankRows(
  rows: readonly AgreementItemSummary[],
  filter: RowFilter,
): AgreementItemSummary[] {
  const q = filter.search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter.tab !== 'all' && r.bucket !== filter.tab) return false;
    if (filter.supplierIds.length > 0 && !filter.supplierIds.includes(r.supplierId))
      return false;
    if (filter.releaseTypes.length > 0 && !filter.releaseTypes.includes(r.releaseType))
      return false;
    if (q) {
      const hay = `${r.supplierName ?? ''} ${r.contractId} ${r.materialCode}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => {
    if (a.severity !== b.severity) return b.severity - a.severity;
    const ad = a.nextDue?.date ?? '9999-99-99';
    const bd = b.nextDue?.date ?? '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (a.agreementId !== b.agreementId) return a.agreementId < b.agreementId ? -1 : 1;
    return a.itemSeq - b.itemSeq;
  });
}

/** Per-bucket counts for the GroupTab badges, over an already scope-filtered set
 *  (search / supplier / type applied, tab NOT) so a badge reflects what a tab
 *  switch would reveal. `all` is the total. */
export function bucketCounts(
  rows: readonly AgreementItemSummary[],
): Record<AgreementItemBucket | 'all', number> {
  const out = { all: rows.length, missed: 0, late: 0, pending: 0, onTrack: 0, draft: 0 };
  for (const r of rows) out[r.bucket] += 1;
  return out;
}
