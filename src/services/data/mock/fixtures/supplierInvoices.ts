// ────────────────────────────────────────────────────────────────────────────
// Supplier invoices fixtures.
//
// Relocated from src/pages-v2/SupplierInvoices.tsx in Phase 1B Batch 2.
// Every row carries supplierId so applySupplierScope can enforce identity
// boundaries structurally.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierInvoice } from '../../types';

export const INVOICES: SupplierInvoice[] = [
  { id: 'si-001', supplierId: 'sup-007', invoiceNumber: 'INV-2025-BRL-0042', poNumber: 'PO-2025-00107', amount: 320_000_000, status: 'Payment Released', submittedDate: '2025-04-10', dueDate: '2025-05-10', paymentDate: '2025-04-13', paymentRef: 'PAY-2026-85241', bankAccount: 'BCA 028-111-2222', sapFiDoc: 'FI-5100009441', channel: 'WhatsApp', buyerContact: 'Procurement Officer', remittanceNote: 'Payment for PO-2025-00107 · 50,000 PCS PET Bottle 100ml Airless Pump · Batch BRL-2026-0234' },
  { id: 'si-002', supplierId: 'sup-007', invoiceNumber: 'INV-2025-BRL-0043', poNumber: 'PO-2025-00108', amount: 185_000_000, status: 'Disputed', submittedDate: '2025-04-12', dueDate: '2025-05-12', paymentDate: null, paymentRef: null, bankAccount: 'BCA 028-111-2222', sapFiDoc: null, channel: 'WhatsApp', buyerContact: 'Finance Controller', remittanceNote: null },
  { id: 'si-003', supplierId: 'sup-007', invoiceNumber: 'INV-2026-BRL-0051', poNumber: 'PO-2025-00115', amount: 275_000_000, status: 'Pending Approval', submittedDate: '2026-04-01', dueDate: '2026-05-01', paymentDate: null, paymentRef: null, bankAccount: 'BCA 028-111-2222', sapFiDoc: 'FI-5100009512', channel: 'Web', buyerContact: 'Procurement Officer', remittanceNote: null },
  { id: 'si-004', supplierId: 'sup-007', invoiceNumber: 'INV-2026-BRL-0055', poNumber: 'PO-2026-00003', amount: 410_000_000, status: 'Draft', submittedDate: '2026-04-08', dueDate: '2026-05-08', paymentDate: null, paymentRef: null, bankAccount: 'BCA 028-111-2222', sapFiDoc: null, channel: 'Web', buyerContact: 'Procurement Officer', remittanceNote: null },

  // sup-002 — PT Musim Mas Specialty Fats
  { id: 'si-101', supplierId: 'sup-002', invoiceNumber: 'INV-2025-MSM-0210', poNumber: 'PO-2025-00120', amount: 640_000_000, status: 'Payment Released', submittedDate: '2025-05-02', dueDate: '2025-06-01', paymentDate: '2025-05-28', paymentRef: 'PAY-2026-90112', bankAccount: 'Mandiri 137-000-998877', sapFiDoc: 'FI-5100010021', channel: 'Web', buyerContact: 'Procurement Officer', remittanceNote: 'Payment for PO-2025-00120 · specialty fat blend' },
  { id: 'si-102', supplierId: 'sup-002', invoiceNumber: 'INV-2026-MSM-0224', poNumber: 'PO-2026-00011', amount: 480_000_000, status: 'Pending Approval', submittedDate: '2026-03-30', dueDate: '2026-04-29', paymentDate: null, paymentRef: null, bankAccount: 'Mandiri 137-000-998877', sapFiDoc: 'FI-5100010088', channel: 'Web', buyerContact: 'Procurement Officer', remittanceNote: null },

  // sup-005 — BASF Personal Care Emulsifiers
  { id: 'si-201', supplierId: 'sup-005', invoiceNumber: 'INV-2026-BASF-1180', poNumber: 'PO-2025-00131', amount: 1_120_000_000, status: 'Disputed', submittedDate: '2026-02-14', dueDate: '2026-03-16', paymentDate: null, paymentRef: null, bankAccount: 'Deutsche Bank 550-114-0099', sapFiDoc: null, channel: 'Email', buyerContact: 'Finance Controller', remittanceNote: null },
];
