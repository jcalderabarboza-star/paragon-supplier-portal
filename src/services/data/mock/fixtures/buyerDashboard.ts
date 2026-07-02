// ────────────────────────────────────────────────────────────────────────────
// Buyer dashboard fixtures.
//
// Relocated from src/pages-v2/BuyerDashboard.tsx in Phase 1B Batch 2.
// Both arrays are buyer-side aggregate views (production lines are internal
// to Paragon; supplier-health rows span multiple suppliers), so they are
// not tagged with a single supplierId.
// ────────────────────────────────────────────────────────────────────────────

import type { ProductionLineRow, SupplierHealthRow } from '../../types';

export type { ProductionLineRow, SupplierHealthRow };

export const PRODUCTION_LINES: ProductionLineRow[] = [
  { line: 'Line A — Skin Care', category: 'Active Ingredient', risk: 'high', riskLabel: 'High', coverDays: 4, blockedSkus: 3 },
  { line: 'Line B — Hair Care', category: 'Fragrance', risk: 'medium', riskLabel: 'Medium', coverDays: 9, blockedSkus: 1 },
  { line: 'Line C — Color', category: 'Packaging', risk: 'low', riskLabel: 'Low', coverDays: 21, blockedSkus: 0 },
  { line: 'Line D — Fragrance', category: 'Raw Material', risk: 'medium', riskLabel: 'Medium', coverDays: 11, blockedSkus: 1 },
];

export const SUPPLIER_HEALTH: SupplierHealthRow[] = [
  { name: 'Kao Indonesia', score: 94, grade: 'A' },
  { name: 'BASF SE', score: 89, grade: 'A' },
  { name: 'Givaudan ID', score: 82, grade: 'B' },
  { name: 'Lonza APAC', score: 76, grade: 'B' },
  { name: 'PT Mitra Kemas', score: 68, grade: 'C' },
  { name: 'Sumber Aroma', score: 54, grade: 'D' },
];
