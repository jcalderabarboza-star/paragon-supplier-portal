// ────────────────────────────────────────────────────────────────────────────
// Supplier documents fixtures.
//
// Relocated from src/pages-v2/SupplierDocuments.tsx in Phase 1B Batch 2.
// Every row carries supplierId so applySupplierScope can enforce identity
// boundaries structurally.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierDocument } from '../../types';

export const DOCUMENTS: SupplierDocument[] = [
  { id: 'doc-001', supplierId: 'sup-007', name: 'Halal Certificate — MUI No. 01011234561020', category: 'Halal Compliance', status: 'Expiring Soon', issuedBy: 'MUI (Majelis Ulama Indonesia)', issuedDate: '2023-09-01', expiryDate: '2026-05-15', fileType: 'PDF', fileSize: '1.2 MB', version: 'v3', linkedTo: 'PK-PETB-8801, PK-PETB-8810', notes: 'BPJPH mandatory renewal required by October 2026' },
  { id: 'doc-002', supplierId: 'sup-007', name: 'BPOM Notification — TD.01.01.55.09.22.0142', category: 'BPOM Regulatory', status: 'Valid', issuedBy: 'BPOM (Badan Pengawas Obat dan Makanan)', issuedDate: '2022-09-15', expiryDate: '2027-09-14', fileType: 'PDF', fileSize: '860 KB', version: 'v1', linkedTo: 'PK-PETB-8801' },
  { id: 'doc-003', supplierId: 'sup-007', name: 'NPWP Certificate — 01.234.567.8-041.000', category: 'Tax & Legal', status: 'Valid', issuedBy: 'Dirjen Pajak — DJP Indonesia', issuedDate: '2010-03-12', expiryDate: null, fileType: 'PDF', fileSize: '420 KB', version: 'v1', linkedTo: 'All POs' },
  { id: 'doc-004', supplierId: 'sup-007', name: 'PKP Registration — Pengusaha Kena Pajak', category: 'Tax & Legal', status: 'Valid', issuedBy: 'KPP Pratama Tangerang', issuedDate: '2010-05-20', expiryDate: null, fileType: 'PDF', fileSize: '310 KB', version: 'v1', linkedTo: 'All Invoices' },
  { id: 'doc-005', supplierId: 'sup-007', name: 'ISO 9001:2015 Quality Management Certificate', category: 'Quality', status: 'Valid', issuedBy: 'TÜV Rheinland Indonesia', issuedDate: '2023-11-10', expiryDate: '2026-11-09', fileType: 'PDF', fileSize: '2.1 MB', version: 'v2', linkedTo: 'All materials' },
  { id: 'doc-006', supplierId: 'sup-007', name: 'COA — Batch PKG-2025-441 (PET Bottle Frosted)', category: 'Quality', status: 'Awaiting Upload', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '', expiryDate: null, fileType: '—', fileSize: '—', version: '—', linkedTo: 'PO-2025-00107 / PK-PETB-8801', notes: 'Required before GR posting in SAP. Please upload COA for batch PKG-2025-441.' },
  { id: 'doc-007', supplierId: 'sup-007', name: 'COA — Batch PKG-2025-398 (PET Bottle Clear)', category: 'Quality', status: 'Valid', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '2025-03-28', expiryDate: null, fileType: 'PDF', fileSize: '540 KB', version: 'v1', linkedTo: 'PO-2025-00109 / PK-PETB-8810' },
  { id: 'doc-008', supplierId: 'sup-007', name: 'Framework Supply Agreement — Paragon Corp 2025–2027', category: 'Contract', status: 'Valid', issuedBy: 'Paragon Corp Procurement', issuedDate: '2025-01-15', expiryDate: '2027-01-14', fileType: 'PDF', fileSize: '3.8 MB', version: 'v4', linkedTo: 'All POs' },
  { id: 'doc-009', supplierId: 'sup-007', name: 'NIB — Nomor Induk Berusaha (9120300123456)', category: 'Tax & Legal', status: 'Valid', issuedBy: 'OSS — Online Single Submission', issuedDate: '2018-07-01', expiryDate: null, fileType: 'PDF', fileSize: '220 KB', version: 'v1', linkedTo: 'Supplier Master Data' },
  { id: 'doc-010', supplierId: 'sup-007', name: 'Halal Assurance System (HAS) 23000 Manual', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'MUI LP POM', issuedDate: '2025-03-01', expiryDate: null, fileType: 'PDF', fileSize: '5.2 MB', version: 'v2', linkedTo: 'Halal Certificate renewal', notes: 'Submitted for BPJPH review — 2026 mandatory transition' },
  { id: 'doc-011', supplierId: 'sup-007', name: 'BPJPH Halal Certificate Application — In Progress', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'BPJPH — Badan Penyelenggara Jaminan Produk Halal', issuedDate: '2026-01-10', expiryDate: null, fileType: 'PDF', fileSize: '1.8 MB', version: 'v1', linkedTo: 'Replaces MUI cert doc-001', notes: 'BPJPH application submitted January 2026 — awaiting inspection schedule' },

  // sup-002 — PT Musim Mas Specialty Fats
  { id: 'doc-101', supplierId: 'sup-002', name: 'Halal Certificate — MUI No. 02022345671030', category: 'Halal Compliance', status: 'Valid', issuedBy: 'MUI (Majelis Ulama Indonesia)', issuedDate: '2024-02-01', expiryDate: '2027-01-31', fileType: 'PDF', fileSize: '1.1 MB', version: 'v2', linkedTo: 'PO-2025-00120' },
  { id: 'doc-102', supplierId: 'sup-002', name: 'ISO 9001:2015 Quality Management Certificate', category: 'Quality', status: 'Valid', issuedBy: 'SGS Indonesia', issuedDate: '2024-06-10', expiryDate: '2027-06-09', fileType: 'PDF', fileSize: '2.0 MB', version: 'v1', linkedTo: 'All materials' },

  // sup-005 — BASF Personal Care Emulsifiers
  { id: 'doc-201', supplierId: 'sup-005', name: 'BPOM Notification — TD.02.02.66.10.23.0311', category: 'BPOM Regulatory', status: 'Valid', issuedBy: 'BPOM (Badan Pengawas Obat dan Makanan)', issuedDate: '2023-10-05', expiryDate: '2028-10-04', fileType: 'PDF', fileSize: '910 KB', version: 'v1', linkedTo: 'PO-2025-00131' },
  { id: 'doc-202', supplierId: 'sup-005', name: 'REACH Compliance / Safety Data Sheet — Emulgade', category: 'Quality', status: 'Expiring Soon', issuedBy: 'BASF SE Regulatory Affairs', issuedDate: '2023-08-20', expiryDate: '2026-08-19', fileType: 'PDF', fileSize: '3.4 MB', version: 'v5', linkedTo: 'All emulsifier grades' },
];
