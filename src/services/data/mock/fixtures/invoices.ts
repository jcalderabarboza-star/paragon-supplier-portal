// ────────────────────────────────────────────────────────────────────────────
// Canonical invoice fixtures (v2.2 Step 4 batch iii — DR-7).
//
// ONE canonical set. The former `supplierInvoices.ts` + `buyerInvoices.ts` were
// two hand-maintained projections of the SAME economic documents, and they had
// already drifted: `INV-2025-BRL-0042` was `Payment Released` on the supplier
// side yet `Approved` on the buyer side — the exact HALAL-XPERSONA-01 class of
// contradiction DR-7 forbids. Collapsing to one row per invoice resolves it at
// the root (INV-XPERSONA-FIXTURE-01): each persona read now PROJECTS from this
// single source, so the two surfaces can never disagree again.
//
// Dates are expressed relative to the 2026 demo present so that computed
// `Overdue` (DR-8 / law 0.5 — a read-layer projection, never stored) yields a
// coherent distribution: only the invoices intended to be past-due carry a past
// `dueDate`; everything else is future-due or already paid.
//
// `status` is the canonical `InvoiceStatus`; `matchStatus` is the match
// sub-flow's rolled-up terminal (census G2). Both persona vocabularies and the
// clock-derived Overdue label are computed in `invoiceProjection.ts`.
// ────────────────────────────────────────────────────────────────────────────

import type { Invoice } from '../../types';

export const INVOICES: Invoice[] = [
  // ── PT Berlina Packaging (sup-007) — the reconciled rows. si-001/binv-005
  //    disagreed; the substantiated truth (a real paymentDate + FI doc) wins. ──
  {
    id: 'inv-brl-0042', invoiceNumber: 'INV-2025-BRL-0042', supplierId: 'sup-007',
    supplierName: 'PT Berlina Packaging Indonesia', poNumber: 'PO-2025-00107', poId: 'po-007',
    amount: 320_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-04-10', dueDate: '2026-05-10', paymentDate: '2026-04-30',
    paymentRef: 'PAY-2026-85241', sapFiDoc: 'FI-5100009441', sapGrDoc: 'GR-4900009420',
    bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer',
    remittanceNote: 'Payment for PO-2025-00107 · 50,000 PCS PET Bottle 100ml Airless Pump · Batch BRL-2026-0234',
  },
  {
    id: 'inv-brl-0043', invoiceNumber: 'INV-2025-BRL-0043', supplierId: 'sup-007',
    supplierName: 'PT Berlina Packaging Indonesia', poNumber: 'PO-2025-00108', poId: 'po-008',
    amount: 185_000_000, currency: 'IDR', status: 'Disputed', matchStatus: 'Qty Mismatch',
    submittedDate: '2026-04-12', dueDate: '2026-05-12', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: 'GR-4900009488',
    bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp', approver: 'Finance Controller',
    paymentTerms: 'Net 30', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  {
    id: 'inv-brl-0051', invoiceNumber: 'INV-2026-BRL-0051', supplierId: 'sup-007',
    supplierName: 'PT Berlina Packaging Indonesia', poNumber: 'PO-2025-00115', poId: 'po-015',
    amount: 275_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-01', dueDate: '2026-08-01', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'BCA 028-111-2222', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },
  {
    id: 'inv-brl-0055', invoiceNumber: 'INV-2026-BRL-0055', supplierId: 'sup-007',
    supplierName: 'PT Berlina Packaging Indonesia', poNumber: 'PO-2026-00003', poId: 'po-2026-003',
    amount: 410_000_000, currency: 'IDR', status: 'Draft', matchStatus: 'Pending',
    submittedDate: '2026-06-20', dueDate: '2026-08-20', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'BCA 028-111-2222', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },

  // ── PT Musim Mas Specialty Fats (sup-002) ──────────────────────────────────
  {
    id: 'inv-msm-0210', invoiceNumber: 'INV-2025-MSM-0210', supplierId: 'sup-002',
    supplierName: 'PT Musim Mas Specialty Fats', poNumber: 'PO-2025-00120', poId: 'po-020',
    amount: 640_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-05-02', dueDate: '2026-06-01', paymentDate: '2026-05-28',
    paymentRef: 'PAY-2026-90112', sapFiDoc: 'FI-5100010021', sapGrDoc: 'GR-4900010004',
    bankAccount: 'Mandiri 137-000-998877', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer',
    remittanceNote: 'Payment for PO-2025-00120 · specialty fat blend',
  },
  {
    id: 'inv-msm-0224', invoiceNumber: 'INV-2026-MSM-0224', supplierId: 'sup-002',
    supplierName: 'PT Musim Mas Specialty Fats', poNumber: 'PO-2026-00011', poId: 'po-2026-011',
    amount: 480_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-10', dueDate: '2026-07-10', paymentDate: null,
    paymentRef: null, sapFiDoc: 'FI-5100010088', sapGrDoc: null,
    bankAccount: 'Mandiri 137-000-998877', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },

  // ── Buyer-only counterparts (no supplier-side fixture existed) ──────────────
  {
    id: 'inv-eco-0341', invoiceNumber: 'INV-2025-ECO-0341', supplierId: 'sup-001',
    supplierName: 'PT Ecogreen Oleochemicals', poNumber: 'PO-2025-00101', poId: 'po-001',
    amount: 1_250_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-03-22', dueDate: '2026-05-05', paymentDate: '2026-04-30',
    paymentRef: 'PAY-2026-77001', sapFiDoc: 'FI-5100009100', sapGrDoc: 'GR-4900009201',
    bankAccount: 'BCA 028-345-6789', channel: 'API', approver: 'Finance Controller',
    paymentTerms: 'Net 45', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  {
    id: 'inv-giv-0892', invoiceNumber: 'INV-2025-GIV-0892', supplierId: 'sup-003',
    supplierName: 'Givaudan Indonesia Fragrances', poNumber: 'PO-2025-00103', poId: 'po-003',
    amount: 2_000_000_000, currency: 'IDR', status: 'Approved', matchStatus: 'Matched',
    submittedDate: '2026-06-01', dueDate: '2026-08-01', paymentDate: null,
    paymentRef: null, sapFiDoc: 'FI-5100009312', sapGrDoc: 'GR-4900009344',
    bankAccount: 'Mandiri 123-456-7890', channel: 'API', approver: 'VP SCM',
    paymentTerms: 'Net 30', buyerContact: 'VP SCM', remittanceNote: null,
  },
  {
    id: 'inv-mus-0214', invoiceNumber: 'INV-2025-MUS-0214', supplierId: 'sup-002',
    supplierName: 'PT Musim Mas Specialty Fats', poNumber: 'PO-2025-00102', poId: 'po-002',
    amount: 875_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-08', dueDate: '2026-07-23', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'BNI 456-789-0123', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 45', buyerContact: 'Procurement Officer', remittanceNote: null,
  },
  {
    id: 'inv-bas-0561', invoiceNumber: 'INV-2025-BAS-0561', supplierId: 'sup-005',
    supplierName: 'BASF Personal Care Emulsifiers GmbH', poNumber: 'PO-2025-00013', poId: 'po-013',
    amount: 560_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-03-15', dueDate: '2026-04-14', paymentDate: '2026-04-12',
    paymentRef: 'PAY-2026-71880', sapFiDoc: 'FI-5100009198', sapGrDoc: 'GR-4900009189',
    bankAccount: 'Deutsche Bank DE89-3704', channel: 'API', approver: 'Finance Controller',
    paymentTerms: 'Net 30', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  // Intended OVERDUE demo row: approved + matched, unpaid, past due → the
  // projection computes Overdue for both personas (nothing stored).
  {
    id: 'inv-evo-0188', invoiceNumber: 'INV-2025-EVO-0188', supplierId: 'sup-006',
    supplierName: 'Evonik Specialty Chemicals France', poNumber: 'PO-2025-00014', poId: 'po-014',
    amount: 410_000_000, currency: 'IDR', status: 'Approved', matchStatus: 'Matched',
    submittedDate: '2026-05-25', dueDate: '2026-06-04', paymentDate: null,
    paymentRef: null, sapFiDoc: 'FI-5100009288', sapGrDoc: 'GR-4900009302',
    bankAccount: 'Société Générale FR76-3000', channel: 'Email', approver: 'Finance Controller',
    paymentTerms: 'Net 10', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  {
    id: 'inv-fir-0309', invoiceNumber: 'INV-2025-FIR-0309', supplierId: 'sup-004',
    supplierName: 'Firmenich Malaysia Sdn. Bhd.', poNumber: 'PO-2025-00018', poId: 'po-018',
    amount: 890_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-03-18', dueDate: '2026-04-17', paymentDate: '2026-04-15',
    paymentRef: 'PAY-2026-70455', sapFiDoc: 'FI-5100009241', sapGrDoc: 'GR-4900009255',
    bankAccount: 'Maybank MY-1234-5678', channel: 'Web', approver: 'VP SCM',
    paymentTerms: 'Net 30', buyerContact: 'VP SCM', remittanceNote: null,
  },

  // ── BASF (sup-005) — a supplier-side dispute with no prior buyer row. ───────
  {
    id: 'inv-basf-1180', invoiceNumber: 'INV-2026-BASF-1180', supplierId: 'sup-005',
    supplierName: 'BASF Personal Care Emulsifiers GmbH', poNumber: 'PO-2025-00131', poId: 'po-131',
    amount: 1_120_000_000, currency: 'IDR', status: 'Disputed', matchStatus: 'Price Variance',
    submittedDate: '2026-05-14', dueDate: '2026-06-16', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'Deutsche Bank 550-114-0099', channel: 'Email', approver: 'Finance Controller',
    paymentTerms: 'Net 30', buyerContact: 'Finance Controller', remittanceNote: null,
  },
];
