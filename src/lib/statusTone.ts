// Canonical status → tone mapping (DP3-FONT-01, ratified).
//
// The five tones map 1:1 to StatusPill variants:
//   positive = success (green), caution = warning (amber),
//   critical = danger (red), info = blue (#0070F2 family), neutral = grey.
//
// This is the SINGLE source of truth for status colour. Pages resolve a tone
// here and pass it explicitly to <StatusPill variant={...}> — StatusPill never
// string-matches. The goal is that a given status can't diverge in colour
// across modules (canonical wins conflicts, no per-module overrides).
//
// SCOPE NOTE: overloaded labels — High / Medium / Low / Critical — are NOT in
// the flat table because their tone depends on context (risk severity vs work
// priority vs stock level). Use the context resolvers below for those. Genuinely
// domain-specific enums (certificate status, compliance state, etc.) that carry
// nuance beyond this shared vocabulary may still pass an explicit variant at the
// call site; see DP3-CHIP-01 in docs/findings.md for the outstanding conflicts.

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Shared cross-page status vocabulary. Title-Case is canonical; statusTone()
// also resolves single-word lowercase enum values (e.g. Risk severity) via a
// case-normalising fallback.
const STATUS_TONE: Record<string, StatusTone> = {
  // positive
  Delivered: 'success',
  Closed: 'success',
  Completed: 'success',
  Approved: 'success',
  'Payment Released': 'success',
  'Remittance Received': 'success',
  'Posted to SAP': 'success',
  Active: 'success',
  Renewed: 'success',
  Awarded: 'success',
  Valid: 'success',
  Matched: 'success',
  Pass: 'success',
  Resolved: 'success',
  Normal: 'success',
  'On Track': 'success',
  'PO Created': 'success',
  'On Time': 'success',
  'In Network': 'success',
  'EDI 846': 'success',
  'Halal Certified': 'success',
  // caution
  Expiring: 'warning',
  'Expiring Soon': 'warning',
  'Partially Delivered': 'warning',
  'Partially Approved': 'warning',
  'Pending Inspection': 'warning',
  'Under Inspection': 'warning',
  'Pending Approval': 'warning',
  'In Progress': 'warning',
  'Customs Clearance': 'warning',
  'At Dock': 'warning',
  Unloading: 'warning',
  'At Risk': 'warning',
  Onboarding: 'warning',
  Upcoming: 'warning',
  Delayed: 'warning',
  'Needs Attention': 'warning',
  // critical
  Overdue: 'danger',
  Disputed: 'danger',
  Rejected: 'danger',
  Reject: 'danger',
  Expired: 'danger',
  'Quality Hold': 'danger',
  Cancelled: 'danger',
  Blocked: 'danger',
  Fail: 'danger',
  Missing: 'danger',
  Discrepancy: 'danger',
  'Qty Mismatch': 'danger',
  'Price Variance': 'danger',
  Suspended: 'danger',
  'Not Awarded': 'danger',
  // info (blue #0070F2 family)
  Confirmed: 'info',
  Acknowledged: 'info',
  Submitted: 'info',
  'In Transit': 'info',
  'ASN Received': 'info',
  'Arrived at Port': 'info',
  Open: 'info',
  'API Push': 'info',
  Inbound: 'info',
  'BPOM Registered': 'info',
  // neutral
  Draft: 'neutral',
  Sent: 'neutral',
  Viewed: 'neutral',
  'Pending ASN': 'neutral',
  'Pending Match': 'neutral',
  'Pending GR': 'neutral',
  Pending: 'neutral',
  'Awaiting Upload': 'neutral',
  'Sourcing Event': 'neutral',
  'N/A': 'neutral',
  Excess: 'neutral',
  Terminated: 'neutral',
  'Under Review': 'neutral',
  Manual: 'neutral',
  Outbound: 'neutral',
};

// The canonical status vocabulary, in declaration order. Consumed by the
// i18n status-label map (src/lib/statusLabel.ts) so tone and label share one
// source — a status added here is caught by the statusLabel guard test until
// it also carries an ID translation.
export const CANONICAL_STATUSES = Object.keys(STATUS_TONE);

// Resolve a status label to its canonical tone. Exact match first, then a
// single-word case-normalised fallback (covers lowercase enum values like the
// Risk page's severity). Unknown labels fall back to neutral.
export function statusTone(label: string): StatusTone {
  const key = label.trim();
  if (key in STATUS_TONE) return STATUS_TONE[key];
  const titled = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  if (titled in STATUS_TONE) return STATUS_TONE[titled];
  return 'neutral';
}

// Context resolvers for the overloaded severity/priority scales (ratified:
// "High/Med/Low resolve by valence per context"). Accept either case.
export function severityTone(level: string): StatusTone {
  switch (level.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'neutral';
  }
}

export function priorityTone(level: string): StatusTone {
  switch (level.toLowerCase()) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'neutral';
    default:
      return 'neutral';
  }
}
