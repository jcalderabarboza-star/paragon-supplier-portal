// ────────────────────────────────────────────────────────────────────────────
// Supplier performance fixtures.
//
// Relocated from src/pages-v2/SupplierPerformance.tsx in Phase 1B Batch 2.
// A KPI snapshot is per-supplier; the supplierId guard in the service layer
// ensures only the owning supplier (or buyer) can read it.
// ────────────────────────────────────────────────────────────────────────────

import type { KpiPoint, RadarPoint, PerformancePoint } from '../../types';

export const SUP_007_SUPPLIER_ID = 'sup-007';

const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_DANGER = '#BB0000';

export const KPIS: KpiPoint[] = [
  { name: 'OTIF Rate',            value: '87%',      target: '≥ 95%',       pct: 87, color: TOKEN_WARNING, trend: '↑' },
  { name: 'ASN Accuracy',         value: '97.8%',    target: '≥ 95%',       pct: 98, color: TOKEN_SUCCESS, trend: '→' },
  { name: 'Lead Time Variance',   value: '1.4 days', target: '≤ 0.5 days',  pct: 35, color: TOKEN_WARNING, trend: '↓' },
  { name: 'POA Response Time',    value: '42 hrs',   target: '≤ 24 hrs',    pct: 40, color: TOKEN_DANGER,  trend: '↓' },
  { name: 'Defect / Reject Rate', value: '0.8%',     target: '≤ 2%',        pct: 90, color: TOKEN_SUCCESS, trend: '↑' },
  { name: 'Invoice Accuracy',     value: '91%',      target: '≥ 98%',       pct: 91, color: TOKEN_WARNING, trend: '↓' },
];

export const RADAR_DATA: RadarPoint[] = [
  { axis: 'OTIF',         value: 87, target: 95 },
  { axis: 'ASN Acc.',     value: 98, target: 95 },
  { axis: 'POA Speed',    value: 72, target: 85 },
  { axis: 'Invoice Acc.', value: 91, target: 98 },
  { axis: 'Quality',      value: 92, target: 98 },
  { axis: 'Lead Time',    value: 80, target: 90 },
];

export const WEEKLY_TREND: PerformancePoint[] = [
  { week: 'W1 Jan', otif: 80, asnAcc: 96, defect: 1.2, ackHrs: 52 },
  { week: 'W2 Jan', otif: 81, asnAcc: 97, defect: 1.0, ackHrs: 48 },
  { week: 'W3 Jan', otif: 79, asnAcc: 95, defect: 1.4, ackHrs: 50 },
  { week: 'W4 Jan', otif: 82, asnAcc: 97, defect: 0.9, ackHrs: 46 },
  { week: 'W1 Feb', otif: 83, asnAcc: 98, defect: 0.8, ackHrs: 44 },
  { week: 'W2 Feb', otif: 81, asnAcc: 96, defect: 1.1, ackHrs: 50 },
  { week: 'W3 Feb', otif: 84, asnAcc: 98, defect: 0.7, ackHrs: 42 },
  { week: 'W4 Feb', otif: 85, asnAcc: 99, defect: 0.6, ackHrs: 40 },
  { week: 'W1 Mar', otif: 83, asnAcc: 97, defect: 0.9, ackHrs: 44 },
  { week: 'W2 Mar', otif: 86, asnAcc: 98, defect: 0.7, ackHrs: 38 },
  { week: 'W3 Mar', otif: 85, asnAcc: 97, defect: 0.8, ackHrs: 40 },
  { week: 'W4 Mar', otif: 87, asnAcc: 98, defect: 0.8, ackHrs: 42 },
];
