// ────────────────────────────────────────────────────────────────────────────
// Buyer purchase-requisition fixtures.
//
// Relocated from src/pages-v2/BuyerRequisitions.tsx in Phase 1' Batch 1.1b-iii.
// Buyer-only ACQUIRE-stage documents — suppliers never see PRs.
//
// D-3: quantity and estimatedValue are canonical NUMERIC values (the page's
// inline MOCK_PRS carried a stringified qty and a pre-formatted "Rp 79jT"
// estimate). Values in IDR: "Rp 79jT" (juta = million) → 79_000_000.
// ────────────────────────────────────────────────────────────────────────────

import type { PurchaseRequisition } from '../../types';

export const REQUISITIONS: PurchaseRequisition[] = [
  { id: 'pr-001', prNumber: 'PR-2026-00341', material: 'Niacinamide B3 USP Grade', category: 'Active Ingredients', quantity: 500, uom: 'KG', requiredDate: '2026-05-15', estimatedValue: 79_000_000, requestor: 'R&D Formulation', costCenter: 'CC-RD-001', status: 'PO Created', createdDate: '2026-04-01', approvalLevel: 'Procurement Head', sourceOfSupply: 'PIR exists', linkedDoc: 'PO-2026-00108', priority: 'High', justification: 'Quarterly replenishment Wardah Q2.' },
  { id: 'pr-002', prNumber: 'PR-2026-00342', material: 'PET Bottle 100ml Airless Pump', category: 'Packaging Primary', quantity: 50_000, uom: 'PCS', requiredDate: '2026-05-20', estimatedValue: 105_000_000, requestor: 'Packaging Engineering', costCenter: 'CC-PKG-002', status: 'Approved', createdDate: '2026-04-03', approvalLevel: 'Procurement Head', sourceOfSupply: 'PIR exists', linkedDoc: '', priority: 'High', justification: 'Make Over launch packaging.' },
  { id: 'pr-003', prNumber: 'PR-2026-00343', material: 'Sample Floral Accord FG-2847', category: 'Fragrance', quantity: 100, uom: 'KG', requiredDate: '2026-06-01', estimatedValue: 210_000_000, requestor: 'Perfumer Team', costCenter: 'CC-RD-003', status: 'Sourcing Event', createdDate: '2026-04-05', approvalLevel: 'VP Procurement', sourceOfSupply: 'No source', linkedDoc: 'RFQ-2026-004', priority: 'High', justification: 'New color cosmetics line Emina premium.' },
  { id: 'pr-004', prNumber: 'PR-2026-00344', material: 'Halal Glycerin 99.5%', category: 'Halal Emulsifier', quantity: 2_000, uom: 'KG', requiredDate: '2026-05-30', estimatedValue: 43_000_000, requestor: 'Production Planning', costCenter: 'CC-MFG-001', status: 'Pending Approval', createdDate: '2026-04-08', approvalLevel: 'Section Head', sourceOfSupply: 'PIR exists', linkedDoc: '', priority: 'Medium', justification: 'Safety stock below minimum.' },
  { id: 'pr-005', prNumber: 'PR-2026-00345', material: 'Folding Carton 150gsm Wardah', category: 'Packaging Secondary', quantity: 200_000, uom: 'PCS', requiredDate: '2026-06-15', estimatedValue: 84_000_000, requestor: 'Supply Chain Planning', costCenter: 'CC-SC-001', status: 'Draft', createdDate: '2026-04-10', approvalLevel: '—', sourceOfSupply: 'PIR exists', linkedDoc: '', priority: 'Low', justification: 'Standard quarterly order.' },
  { id: 'pr-006', prNumber: 'PR-2026-00340', material: 'Centella Asiatica Extract 10:1', category: 'Natural Botanical', quantity: 300, uom: 'KG', requiredDate: '2026-04-30', estimatedValue: 67_000_000, requestor: 'R&D Formulation', costCenter: 'CC-RD-001', status: 'PO Created', createdDate: '2026-03-20', approvalLevel: 'Procurement Head', sourceOfSupply: 'PIR exists', linkedDoc: 'PO-2026-00106', priority: 'Medium', justification: 'Emina Cica Care — PT Sample Oleochemicals.' },
];
