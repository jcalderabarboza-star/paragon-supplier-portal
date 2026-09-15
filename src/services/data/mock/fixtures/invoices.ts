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
import { shiftFields } from '../../fixturePresent';

const INVOICES_RAW: Invoice[] = [
  // ── PT Sample Packaging (sup-007) — the reconciled rows. si-001/binv-005
  //    disagreed; the substantiated truth (a real paymentDate + FI doc) wins. ──
  {
    id: 'inv-brl-0042', invoiceNumber: 'INV-2025-BRL-0042', supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia', poNumber: 'PO-2025-00107', poId: 'po-007',
    amount: 320_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-04-10', dueDate: '2026-05-10', paymentDate: '2026-04-30',
    paymentRef: 'PAY-2026-85241', sapFiDoc: 'FI-5100009441', sapGrDoc: 'GR-4900009420',
    bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer',
    remittanceNote: 'Payment for PO-2025-00107 · 50,000 PCS PET Bottle 100ml Airless Pump · Batch BRL-2026-0234',
  },
  {
    id: 'inv-brl-0043', invoiceNumber: 'INV-2025-BRL-0043', supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia', poNumber: 'PO-2025-00108', poId: 'po-008',
    amount: 185_000_000, currency: 'IDR', status: 'Disputed', matchStatus: 'Qty Mismatch',
    submittedDate: '2026-04-12', dueDate: '2026-05-12', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: 'GR-4900009488',
    bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp', approver: 'Finance Controller',
    paymentTerms: 'Net 30', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  {
    id: 'inv-brl-0051', invoiceNumber: 'INV-2026-BRL-0051', supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia', poNumber: 'PO-2025-00115', poId: 'po-015',
    amount: 275_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-01', dueDate: '2026-08-01', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'BCA 028-111-2222', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },
  {
    id: 'inv-brl-0055', invoiceNumber: 'INV-2026-BRL-0055', supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia', poNumber: 'PO-2026-00003', poId: 'po-2026-003',
    amount: 410_000_000, currency: 'IDR', status: 'Draft', matchStatus: 'Pending',
    submittedDate: '2026-06-20', dueDate: '2026-08-20', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'BCA 028-111-2222', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },

  // ── PT Sample Specialty Fats (sup-002) ──────────────────────────────────
  {
    id: 'inv-msm-0210', invoiceNumber: 'INV-2025-MSM-0210', supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats', poNumber: 'PO-2025-00120', poId: 'po-020',
    amount: 640_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-05-02', dueDate: '2026-06-01', paymentDate: '2026-05-28',
    paymentRef: 'PAY-2026-90112', sapFiDoc: 'FI-5100010021', sapGrDoc: 'GR-4900010004',
    bankAccount: 'Mandiri 137-000-998877', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer',
    remittanceNote: 'Payment for PO-2025-00120 · specialty fat blend',
  },
  {
    id: 'inv-msm-0224', invoiceNumber: 'INV-2026-MSM-0224', supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats', poNumber: 'PO-2026-00011', poId: 'po-2026-011',
    amount: 480_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-10', dueDate: '2026-07-10', paymentDate: null,
    // Pre-settle (Submitted): no FI document — it mints only on payment settle
    // (invoiceStore invariant; F-1). sapGrDoc is the separate goods-receipt doc.
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'Mandiri 137-000-998877', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },

  // ── Buyer-only counterparts (no supplier-side fixture existed) ──────────────
  {
    id: 'inv-eco-0341', invoiceNumber: 'INV-2025-ECO-0341', supplierId: 'sup-001',
    supplierName: 'PT Sample Oleochemicals', poNumber: 'PO-2025-00101', poId: 'po-001',
    amount: 1_250_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-03-22', dueDate: '2026-05-05', paymentDate: '2026-04-30',
    paymentRef: 'PAY-2026-77001', sapFiDoc: 'FI-5100009100', sapGrDoc: 'GR-4900009201',
    bankAccount: 'BCA 028-345-6789', channel: 'API', approver: 'Finance Controller',
    paymentTerms: 'Net 45', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  {
    id: 'inv-giv-0892', invoiceNumber: 'INV-2025-GIV-0892', supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia', poNumber: 'PO-2025-00103', poId: 'po-003',
    amount: 2_000_000_000, currency: 'IDR', status: 'Approved', matchStatus: 'Matched',
    submittedDate: '2026-06-01', dueDate: '2026-08-01', paymentDate: null,
    // Pre-settle (Approved, unpaid): no FI document — it mints on payment settle
    // (invoiceStore invariant; F-1). sapGrDoc is the separate goods-receipt doc.
    paymentRef: null, sapFiDoc: null, sapGrDoc: 'GR-4900009344',
    bankAccount: 'Mandiri 123-456-7890', channel: 'API', approver: 'VP SCM',
    paymentTerms: 'Net 30', buyerContact: 'VP SCM', remittanceNote: null,
  },
  {
    id: 'inv-mus-0214', invoiceNumber: 'INV-2025-MUS-0214', supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats', poNumber: 'PO-2025-00102', poId: 'po-002',
    amount: 875_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-08', dueDate: '2026-07-23', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'BNI 456-789-0123', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 45', buyerContact: 'Procurement Officer', remittanceNote: null,
  },
  {
    id: 'inv-bas-0561', invoiceNumber: 'INV-2025-BAS-0561', supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH', poNumber: 'PO-2025-00013', poId: 'po-013',
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
    supplierName: 'Sample Specialty Chemicals France', poNumber: 'PO-2025-00014', poId: 'po-014',
    amount: 410_000_000, currency: 'IDR', status: 'Approved', matchStatus: 'Matched',
    submittedDate: '2026-05-25', dueDate: '2026-06-04', paymentDate: null,
    // Pre-settle (Approved, unpaid, past-due Overdue demo): no FI document — it
    // mints on payment settle (invoiceStore invariant; F-1). sapGrDoc stands.
    paymentRef: null, sapFiDoc: null, sapGrDoc: 'GR-4900009302',
    bankAccount: 'Société Générale FR76-3000', channel: 'Email', approver: 'Finance Controller',
    paymentTerms: 'Net 10', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  {
    id: 'inv-fir-0309', invoiceNumber: 'INV-2025-FIR-0309', supplierId: 'sup-004',
    supplierName: 'Sample Aromatics Sdn. Bhd.', poNumber: 'PO-2025-00018', poId: 'po-018',
    amount: 890_000_000, currency: 'IDR', status: 'Payment Released', matchStatus: 'Matched',
    submittedDate: '2026-03-18', dueDate: '2026-04-17', paymentDate: '2026-04-15',
    paymentRef: 'PAY-2026-70455', sapFiDoc: 'FI-5100009241', sapGrDoc: 'GR-4900009255',
    bankAccount: 'Maybank MY-1234-5678', channel: 'Web', approver: 'VP SCM',
    paymentTerms: 'Net 30', buyerContact: 'VP SCM', remittanceNote: null,
  },

  // ── Sample Personal Care (sup-005) — a supplier-side dispute with no prior buyer row. ───────
  {
    id: 'inv-smpl-1180', invoiceNumber: 'INV-2026-SMPL-1180', supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH', poNumber: 'PO-2025-00131', poId: 'po-131',
    amount: 1_120_000_000, currency: 'IDR', status: 'Disputed', matchStatus: 'Price Variance',
    submittedDate: '2026-05-14', dueDate: '2026-06-16', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'Deutsche Bank 550-114-0099', channel: 'Email', approver: 'Finance Controller',
    paymentTerms: 'Net 30', buyerContact: 'Finance Controller', remittanceNote: null,
  },
  // ── Sample Aromatics (sup-004) — THE THREE-WAY MATCH IS REACHABLE FROM HERE ──
  //
  // ⚠️ **WHY THIS ROW EXISTS, SAID PLAINLY: WITHOUT IT NO CLICK PATH IN THIS
  // PORTAL REACHES `Matched`, AND `Matched` IS THE ONLY FROM-STATE OF
  // `t_invoice_approve`.** The cascade that produces it is
  // `t_gr_post → t_invoice_match` (`cascades.ts`), and it fires the header verb
  // only when `deriveMatchVerdict` returns a genuine `Matched` — which needs a
  // receipt this portal can still POST (`from: ['Approved','Partially
  // Approved']`), on a PO that an awaiting invoice names, whose invoiced amount
  // is within `MATCH_TOLERANCE` of Σ(confirmedQty × unitPrice).
  //
  // Derived across the shipped corpus, every pair, before this row was written:
  // FIFTEEN (Submitted invoice × postable receipt) combinations existed and not
  // one returned `Matched`. The single exact-value pair in the tree —
  // `inv-mus-0214` ↔ `PO-2025-00102` at 875,000,000 — is unreachable because
  // that PO's only receipt, `GR-2026-014`, has already POSTED, and `t_gr_post`
  // is illegal from `Posted to SAP`. Moving it back would empty the only
  // positive case `receiptsForInvoice` has (`invoiceMatchPairing.test.ts`), so
  // the receipt side is where this must NOT be fixed.
  //
  // `PO-2025-00104` is the honest opposite: 200 KG × 2,700,000 = 540,000,000
  // confirmed, `GR-2026-012` received clean and sitting in `Approved` awaiting
  // its post, and NO invoice against it at all. This row is that invoice. It is
  // the ordinary mid-flow document the corpus was missing, not a contrivance —
  // and it MINTS NOTHING S/4 OWNS: `sapFiDoc` and `paymentRef` are null because
  // they are minted on payment settle (the invoiceStore invariant, F-1), and
  // `sapGrDoc` is null because the receipt has not posted yet.
  //
  // Its dates are authored in this family's own frame like every other row:
  // `dueDate` sits AFTER `inv-msm-0224`'s so it does not become the window's new
  // late edge, which `fixturePresent.guard.test.ts` re-derives every run.
  {
    id: 'inv-fir-0325', invoiceNumber: 'INV-2026-FIR-0325', supplierId: 'sup-004',
    supplierName: 'Sample Aromatics Sdn. Bhd.', poNumber: 'PO-2025-00104', poId: 'po-004',
    amount: 540_000_000, currency: 'IDR', status: 'Submitted', matchStatus: 'Pending GR',
    submittedDate: '2026-06-16', dueDate: '2026-07-16', paymentDate: null,
    paymentRef: null, sapFiDoc: null, sapGrDoc: null,
    bankAccount: 'Maybank MY-1234-5678', channel: 'Web', approver: 'Procurement Officer',
    paymentTerms: 'Net 30', buyerContact: 'Procurement Officer', remittanceNote: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — FIXTURE-PRESENT-01 (d).
//
// The literals above are the AUTHORED set, left exactly as written so the
// authoring intent stays readable. They are shifted to the declared present at
// module load by this family's own anchor (invoice); the shift is
// `DECLARED_PRESENT - anchor` and it moves every row by the same whole number of
// days, so the set's internal spacing — which is the part that was never wrong —
// is preserved exactly.
//
// ⚠️ **THE FIELD LIST IS DERIVED, NOT REMEMBERED: it is every key on this type
// whose value is date-shaped on at least one row** — `submittedDate`, `dueDate`,
// `paymentDate`. Nothing else here holds a date: `paymentRef`, `sapFiDoc` and
// `sapGrDoc` carry a YEAR inside a document number and are not dates, which is
// exactly why `shiftIso` anchors on `^\d{4}-\d{2}-\d{2}` and returns a non-match
// untouched. `paymentDate` is null on eight rows and stays null — absence is a
// real answer (an unpaid invoice has no payment date) and must not become one.
//
// ⚠️ **WHAT THIS FIXES, BECAUSE THE DECAY HAD ALREADY HAPPENED.** Read at the
// declared present with the raw literals, FIVE of the six open rows computed
// `Overdue` and the buyer surface showed `Pending Match 0` and `Approved 0` —
// three of the five buyer labels had no member a buyer could reach, and the one
// row the corpus INTENDS to be overdue was indistinguishable from four that had
// merely aged. Nothing was wrong with the fixtures; the present had walked away
// from them, which is FIXTURE-PRESENT-01 in one family.
// ─────────────────────────────────────────────────────────────────────────────
export const INVOICES: Invoice[] = shiftFields(
  INVOICES_RAW,
  'invoice',
  ['submittedDate', 'dueDate', 'paymentDate'],
);
