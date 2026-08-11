// ────────────────────────────────────────────────────────────────────────────
// Buyer supplier-scorecard fixtures.
//
// Relocated from src/pages-v2/BuyerScorecard.tsx in Phase 1' Batch 1.1b-iii.
// Portfolio grading across the active supplier network — a buyer-only aggregate,
// not per-supplier-scoped.
//
// D-2 ruling: the page previously carried IMPROVEMENT_ACTIONS as a single shared
// const and COMPLIANCE_ISSUES keyed by supplier NAME. Both are folded here onto
// the per-supplier record (`improvementActions` / `complianceIssue`) so nothing
// masquerades as per-supplier data. The old COMPLIANCE_ISSUES entry for
// "Sample Specialty Chemicals" matched no displayed supplier (the extra supplier
// is "Sample Specialty FR"), so it was dead data and is dropped.
// ────────────────────────────────────────────────────────────────────────────

import type {
  SupplierScorecard,
  ScorecardKpi,
  ScorecardRadarAxis,
  ScorecardImprovementAction,
} from '../../types';

// KPI bar colour is derived centrally now (DP2-TARGET-01): the tile reads
// targetStatus(pct, targetPct) — no more hand-assigned per-row hex.

// Sample Personal Care improvement-plan actions — folded off the page's shared IMPROVEMENT_ACTIONS
// const onto the single supplier that renders them (impPlan === true).
const SAMPLE_PC_IMPROVEMENT_ACTIONS: ScorecardImprovementAction[] = [
  { item: 'Reduce PO acknowledgment time to <24h', due: 'Apr 30 2026', owner: 'Supplier OPS Team', status: 'In Progress' },
  { item: 'Resolve quality non-conformance batch BAS-2026-0034 root cause', due: 'Apr 20 2026', owner: 'Quality Dept', status: 'In Progress' },
  { item: 'Improve lead time adherence from 74% to ≥85%', due: 'May 31 2026', owner: 'Production Planning', status: 'Pending' },
];

const CORE_SCORECARDS: SupplierScorecard[] = [
  {
    id: 'sample-vitamins',
    name: 'Sample Vitamins Co.',
    country: 'CN',
    category: 'Active Ingredients',
    tier: 'Tier 3 — API',
    sapBp: 'BP-20045',
    channel: 'API',
    grade: 'A',
    score: 94,
    status: 'Preferred Supplier',
    kpis: [
      { name: 'OTIF', value: '94%', target: '95%', pct: 94, targetPct: 95, trend: '↑' },
      { name: 'OTDR', value: '96%', target: '95%', pct: 96, targetPct: 95, trend: '↑' },
      { name: 'PO Ack Rate', value: '100%', target: '95%', pct: 100, targetPct: 95, trend: '→' },
      { name: 'Ack Speed', value: '6h', target: '<24h', pct: 90, targetPct: 75, trend: '↑' },
      { name: 'Lead Time Adherence', value: '92%', target: '90%', pct: 92, targetPct: 90, trend: '↑' },
      { name: 'GR/PO Variance', value: '−4%', target: '±2%', pct: 50, targetPct: 55, trend: '↓' },
      { name: 'Fill Rate', value: '96%', target: '98%', pct: 96, targetPct: 98, trend: '↑' },
      { name: 'Invoice Accuracy', value: '100%', target: '98%', pct: 100, targetPct: 98, trend: '→' },
      { name: 'QNCR', value: '0.2%', target: '<0.5%', pct: 90, targetPct: 78, trend: '↑' },
      { name: 'Inventory DOS', value: '24 days', target: '14-30d', pct: 80, targetPct: 72, trend: '→' },
      { name: 'Responsiveness', value: '88/100', target: '≥80', pct: 88, targetPct: 80, trend: '↑' },
      { name: 'Sustainability', value: '82/100', target: '≥75', pct: 82, targetPct: 75, trend: '↑' },
    ],
    radar: [
      { axis: 'Delivery', value: 94 },
      { axis: 'Quality', value: 96 },
      { axis: 'Commercial', value: 88 },
      { axis: 'Responsiveness', value: 88 },
      { axis: 'Sustainability', value: 82 },
    ],
    otifTrend: [88, 89, 90, 91, 92, 91, 93, 94, 93, 94, 95, 94],
    ackSpeedTrend: [8, 7, 6, 6, 5, 5, 4, 6, 5, 4, 6, 6],
    defectTrend: [0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.2, 0.2, 0.1, 0.2],
    commLog: [
      { date: 'Apr 6 2026', type: 'PO Confirmation', channel: 'API', message: 'PO-2025-00108 confirmed via API in 4 minutes', status: 'Completed' },
      { date: 'Apr 4 2026', type: 'Invoice Submitted', channel: 'Web Portal', message: 'INV-2026-00235 submitted — 3-way match: Perfect', status: 'Completed' },
      { date: 'Apr 1 2026', type: 'ASN Submitted', channel: 'API', message: 'ASN-2026-002 submitted for PO-2025-00108', status: 'Completed' },
      { date: 'Mar 28 2026', type: 'RFQ Response', channel: 'API', message: 'Quotation submitted for RFQ-2026-001 — score: 87/100', status: 'Completed' },
      { date: 'Mar 15 2026', type: 'Inventory Update', channel: 'API Push', message: 'Inventory position updated: Niacinamide B3 — 2,400 KG (24 days)', status: 'Completed' },
    ],
  },
  {
    id: 'sample-packaging',
    name: 'PT Sample Packaging Indonesia',
    country: 'ID',
    category: 'Packaging Primary',
    tier: 'Tier 1 — WhatsApp',
    sapBp: 'BP-10007',
    channel: 'WhatsApp',
    grade: 'B',
    score: 82,
    status: 'Approved Supplier',
    complianceIssue: { level: 'missing', label: 'BPJPH Halal cert not certified' },
    kpis: [
      { name: 'OTIF', value: '88%', target: '95%', pct: 88, targetPct: 95, trend: '↑' },
      { name: 'OTDR', value: '91%', target: '95%', pct: 91, targetPct: 95, trend: '↑' },
      { name: 'PO Ack Rate', value: '92%', target: '95%', pct: 92, targetPct: 95, trend: '↑' },
      { name: 'Ack Speed', value: '18h', target: '<24h', pct: 75, targetPct: 75, trend: '→' },
      { name: 'Lead Time Adherence', value: '85%', target: '90%', pct: 85, targetPct: 90, trend: '↑' },
      { name: 'GR/PO Variance', value: '0%', target: '±2%', pct: 100, targetPct: 55, trend: '→' },
      { name: 'Fill Rate', value: '95%', target: '98%', pct: 95, targetPct: 98, trend: '↑' },
      { name: 'Invoice Accuracy', value: '98%', target: '98%', pct: 98, targetPct: 98, trend: '→' },
      { name: 'QNCR', value: '0.4%', target: '<0.5%', pct: 70, targetPct: 78, trend: '↑' },
      { name: 'Inventory DOS', value: '18 days', target: '14-30d', pct: 80, targetPct: 72, trend: '→' },
      { name: 'Responsiveness', value: '80/100', target: '≥80', pct: 80, targetPct: 80, trend: '↑' },
      { name: 'Sustainability', value: '68/100', target: '≥75', pct: 68, targetPct: 75, trend: '↑' },
    ],
    radar: [
      { axis: 'Delivery', value: 88 },
      { axis: 'Quality', value: 91 },
      { axis: 'Commercial', value: 82 },
      { axis: 'Responsiveness', value: 80 },
      { axis: 'Sustainability', value: 68 },
    ],
    otifTrend: [82, 83, 84, 84, 85, 85, 86, 87, 87, 88, 88, 88],
    ackSpeedTrend: [22, 20, 19, 18, 18, 17, 16, 18, 17, 18, 17, 18],
    defectTrend: [0.6, 0.5, 0.5, 0.5, 0.4, 0.4, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3],
    commLog: [
      { date: 'Apr 5 2026', type: 'PO Confirmation', channel: 'WhatsApp', message: 'PO-2025-00107 confirmed via WhatsApp in 3 hours', status: 'Completed' },
      { date: 'Mar 31 2026', type: 'ASN Submitted', channel: 'Web Portal', message: 'ASN-2026-001 submitted for PO-2025-00107', status: 'Completed' },
      { date: 'Mar 15 2026', type: 'Invoice', channel: 'Email', message: 'INV-2026-00198 submitted via email', status: 'Completed' },
      { date: 'Mar 10 2026', type: 'PO Confirmation', channel: 'WhatsApp', message: 'PO-2025-00098 confirmed', status: 'Completed' },
      { date: 'Feb 28 2026', type: 'GR Discrepancy', channel: 'Web Portal', message: 'Short delivery on PO-2025-00091 — 5% variance', status: 'Resolved' },
    ],
  },
  {
    id: 'sample-personalcare',
    name: 'Sample Personal Care DE',
    country: 'DE',
    category: 'Active Ingredients',
    tier: 'Tier 3 — API',
    sapBp: 'BP-20012',
    channel: 'API',
    grade: 'C',
    score: 74,
    status: 'Conditional — Improvement Plan Active',
    impPlan: true,
    complianceIssue: { level: 'expiring', label: 'ISO 9001 expiring in 83d' },
    improvementActions: SAMPLE_PC_IMPROVEMENT_ACTIONS,
    kpis: [
      { name: 'OTIF', value: '78%', target: '95%', pct: 78, targetPct: 95, trend: '↓' },
      { name: 'OTDR', value: '82%', target: '95%', pct: 82, targetPct: 95, trend: '↓' },
      { name: 'PO Ack Rate', value: '88%', target: '95%', pct: 88, targetPct: 95, trend: '↑' },
      { name: 'Ack Speed', value: '42h', target: '<24h', pct: 40, targetPct: 75, trend: '↓' },
      { name: 'Lead Time Adherence', value: '74%', target: '90%', pct: 74, targetPct: 90, trend: '↓' },
      { name: 'GR/PO Variance', value: '+1%', target: '±2%', pct: 80, targetPct: 55, trend: '→' },
      { name: 'Fill Rate', value: '90%', target: '98%', pct: 90, targetPct: 98, trend: '↑' },
      { name: 'Invoice Accuracy', value: '85%', target: '98%', pct: 85, targetPct: 98, trend: '↓' },
      { name: 'QNCR', value: '1.2%', target: '<0.5%', pct: 30, targetPct: 78, trend: '↓' },
      { name: 'Inventory DOS', value: '8 days', target: '14-30d', pct: 40, targetPct: 72, trend: '↓' },
      { name: 'Responsiveness', value: '62/100', target: '≥80', pct: 62, targetPct: 80, trend: '↓' },
      { name: 'Sustainability', value: '70/100', target: '≥75', pct: 70, targetPct: 75, trend: '↑' },
    ],
    radar: [
      { axis: 'Delivery', value: 78 },
      { axis: 'Quality', value: 82 },
      { axis: 'Commercial', value: 74 },
      { axis: 'Responsiveness', value: 62 },
      { axis: 'Sustainability', value: 70 },
    ],
    otifTrend: [85, 84, 82, 83, 81, 80, 79, 78, 78, 79, 78, 78],
    ackSpeedTrend: [28, 30, 32, 29, 31, 33, 35, 34, 36, 34, 33, 34],
    defectTrend: [0.8, 0.9, 1.0, 0.9, 1.1, 1.0, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1],
    commLog: [
      { date: 'Apr 5 2026', type: 'Late Delivery Alert', channel: 'Email', message: 'PO-2025-00099 is 5 days overdue — held at Jakarta Customs', status: 'Open' },
      { date: 'Apr 2 2026', type: 'Improvement Plan', channel: 'Email', message: 'Improvement plan issued — 30-day review period', status: 'Active' },
      { date: 'Mar 28 2026', type: 'PO Confirmation', channel: 'API', message: 'PO-2025-00099 confirmed — 42h delay', status: 'Completed' },
      { date: 'Mar 20 2026', type: 'Invoice Dispute', channel: 'Email', message: 'INV-2026-00201 disputed — PPN calculation error', status: 'Resolved' },
      { date: 'Mar 10 2026', type: 'QNCR Filed', channel: 'Email', message: 'Non-conformance report for batch BAS-2026-0034', status: 'Resolved' },
    ],
  },
];

// The five "extra" suppliers reuse the top record's KPI/radar shape (the page's
// original construction) with distinct identity + trend series.
const EXTRA_SCORECARDS: SupplierScorecard[] = (
  [
    'PT Sample Specialty Fats',
    'PT Sample Halal Emulsifiers',
    'Sample Fragrance House SG',
    'PT Sample Oleochemicals',
    'Sample Specialty FR',
  ] as const
).map((name, i) => ({
  id: `sup-extra-${i}`,
  name,
  country: (['ID', 'ID', 'SG', 'ID', 'FR'] as const)[i],
  category: (['Halal Emulsifier', 'Halal Emulsifier', 'Fragrance', 'Natural Botanical', 'Active Ingredients'] as const)[i],
  tier: (['Tier 2 — Web', 'Tier 1 — WhatsApp', 'Tier 3 — API', 'Tier 2 — Web', 'Tier 2 — Web'] as const)[i],
  sapBp: `BP-2000${10 + i}`,
  channel: (['Web', 'WhatsApp', 'API', 'Web', 'Web'] as const)[i],
  grade: (['A', 'B', 'A', 'B', 'C'] as const)[i],
  score: ([92, 84, 91, 83, 72] as const)[i],
  status: 'Approved Supplier',
  kpis: CORE_SCORECARDS[0].kpis as ScorecardKpi[],
  radar: CORE_SCORECARDS[0].radar as ScorecardRadarAxis[],
  otifTrend: [82, 84, 85, 87, 88, 89, 90, 91, 91, 92, 92, 91],
  ackSpeedTrend: [12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5],
  defectTrend: [0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.1, 0.2],
  commLog: [],
}));

export const SUPPLIER_SCORECARDS: SupplierScorecard[] = [
  ...CORE_SCORECARDS,
  ...EXTRA_SCORECARDS,
];
