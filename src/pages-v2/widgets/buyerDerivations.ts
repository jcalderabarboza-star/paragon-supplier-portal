// ────────────────────────────────────────────────────────────────────────────
// Buyer dashboard derivations — pure predicates shared by the buyer widgets AND
// the buyer alerts bar, so a widget's flag and the aggregated triage count can
// never disagree. All are pure functions of (rows[, now]); no store, no clock of
// their own — the caller injects `now` so counts are deterministic in tests.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../../services/data/types';
import type {
  BuyerInvoice,
  PurchaseOrder,
  GoodsReceipt,
  ASN,
  RFQ,
  Quotation,
} from '../../services/data/types';
import type { FlagSeverity } from '../../components/ui-v2/ExpandableWidget';

const HOUR_MS = 3_600_000;

// ── Invoices (AP aging) ──────────────────────────────────────────────────────
export const overdueInvoices = (rows: BuyerInvoice[]): BuyerInvoice[] =>
  rows.filter((i) => i.status === 'Overdue');

export const maxDaysOutstanding = (rows: BuyerInvoice[]): number =>
  rows.reduce((m, i) => Math.max(m, i.daysOutstanding), 0);

// ── Purchase orders (open / unacknowledged) ──────────────────────────────────
export const openPurchaseOrders = (rows: PurchaseOrder[]): PurchaseOrder[] =>
  rows.filter(
    (p) => p.status !== POStatus.DELIVERED && p.status !== POStatus.CLOSED,
  );

/** Still 'Sent' (never acknowledged) more than 48h after the order was placed. */
export const unacknowledgedOver48h = (
  rows: PurchaseOrder[],
  now: Date,
): PurchaseOrder[] =>
  rows.filter(
    (p) =>
      p.status === POStatus.SENT &&
      (now.getTime() - new Date(p.orderDate).getTime()) / HOUR_MS > 48,
  );

// ── RFQs awaiting award ──────────────────────────────────────────────────────
export const pendingAwardRfqs = (
  rfqs: RFQ[],
  quotations: Quotation[],
): RFQ[] => {
  const withQuotes = new Set(quotations.map((q) => q.rfqId));
  return rfqs.filter(
    (r) => (r.status === 'Open' || r.status === 'Closed') && withQuotes.has(r.id),
  );
};

export const awardOverdue = (rfqs: RFQ[], now: Date): RFQ[] =>
  rfqs.filter((r) => new Date(r.awardDeadline).getTime() < now.getTime());

export const quoteCountByRfq = (quotations: Quotation[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const q of quotations) m.set(q.rfqId, (m.get(q.rfqId) ?? 0) + 1);
  return m;
};

// ── Goods receipts (3-way match / inspection) ────────────────────────────────
const GR_PENDING = new Set<GoodsReceipt['status']>([
  'Pending Inspection',
  'Under Inspection',
]);
const GR_VARIANCE = new Set<GoodsReceipt['status']>([
  'Quality Hold',
  'Rejected',
  'Partially Approved',
]);

export const grNeedingAction = (rows: GoodsReceipt[]): GoodsReceipt[] =>
  rows.filter((g) => GR_PENDING.has(g.status) || GR_VARIANCE.has(g.status));

export const grVariance = (rows: GoodsReceipt[]): GoodsReceipt[] =>
  rows.filter((g) => GR_VARIANCE.has(g.status));

// ── ASNs (inbound) ───────────────────────────────────────────────────────────
export const pendingAsns = (rows: ASN[]): ASN[] =>
  rows.filter((a) => a.status === 'Submitted' || a.status === 'In Transit');

export const discrepancyAsns = (rows: ASN[]): ASN[] =>
  rows.filter((a) => a.status === 'Discrepancy');

// ── Severity tiers (DP2-FLAG-01) ─────────────────────────────────────────────
// The single source of each category's tier, so a widget's flag and its alerts-
// bar chip can never disagree. Calm ladder: money/overdue = critical, variance/
// deadline = warning, plain in-flight counts = info.
export const invoiceTier = (rows: BuyerInvoice[]): FlagSeverity =>
  overdueInvoices(rows).length > 0 ? 'critical' : 'none';

export const poTier = (rows: PurchaseOrder[], now: Date): FlagSeverity =>
  unacknowledgedOver48h(rows, now).length > 0 ? 'critical' : 'none';

export const rfqAwardTier = (
  rfqs: RFQ[],
  quotations: Quotation[],
  now: Date,
): FlagSeverity => {
  const pending = pendingAwardRfqs(rfqs, quotations);
  if (pending.length === 0) return 'none';
  return awardOverdue(pending, now).length > 0 ? 'warning' : 'info';
};

export const grTier = (rows: GoodsReceipt[]): FlagSeverity => {
  if (grVariance(rows).length > 0) return 'warning';
  return grNeedingAction(rows).length > 0 ? 'info' : 'none';
};

export const asnTier = (rows: ASN[]): FlagSeverity => {
  if (discrepancyAsns(rows).length > 0) return 'warning';
  return pendingAsns(rows).length > 0 ? 'info' : 'none';
};
