import React, { useState } from 'react';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

type DocStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Awaiting Upload' | 'Under Review';
type DocCategory = 'Halal Compliance' | 'BPOM Regulatory' | 'Tax & Legal' | 'Quality' | 'Contract' | 'Other';

interface SupplierDocument {
  id: string;
  name: string;
  category: DocCategory;
  status: DocStatus;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string | null;
  fileType: string;
  fileSize: string;
  version: string;
  linkedTo: string;
  notes?: string;
}

const DOCUMENTS: SupplierDocument[] = [
  { id: 'doc-001', name: 'Halal Certificate — MUI No. 01011234561020', category: 'Halal Compliance', status: 'Expired', issuedBy: 'MUI (Majelis Ulama Indonesia)', issuedDate: '2023-09-01', expiryDate: '2025-01-15', fileType: 'PDF', fileSize: '1.2 MB', version: 'v3', linkedTo: 'PK-PETB-8801, PK-PETB-8810', notes: 'BPJPH mandatory renewal required by October 2026' },
  { id: 'doc-002', name: 'BPOM Notification — TD.01.01.55.09.22.0142', category: 'BPOM Regulatory', status: 'Valid', issuedBy: 'BPOM (Badan Pengawas Obat dan Makanan)', issuedDate: '2022-09-15', expiryDate: '2027-09-14', fileType: 'PDF', fileSize: '860 KB', version: 'v1', linkedTo: 'PK-PETB-8801' },
  { id: 'doc-003', name: 'NPWP Certificate — 01.234.567.8-041.000', category: 'Tax & Legal', status: 'Valid', issuedBy: 'Dirjen Pajak — DJP Indonesia', issuedDate: '2010-03-12', expiryDate: null, fileType: 'PDF', fileSize: '420 KB', version: 'v1', linkedTo: 'All POs' },
  { id: 'doc-004', name: 'PKP Registration — Pengusaha Kena Pajak', category: 'Tax & Legal', status: 'Valid', issuedBy: 'KPP Pratama Tangerang', issuedDate: '2010-05-20', expiryDate: null, fileType: 'PDF', fileSize: '310 KB', version: 'v1', linkedTo: 'All Invoices' },
  { id: 'doc-005', name: 'ISO 9001:2015 Quality Management Certificate', category: 'Quality', status: 'Valid', issuedBy: 'TÜV Rheinland Indonesia', issuedDate: '2023-11-10', expiryDate: '2026-11-09', fileType: 'PDF', fileSize: '2.1 MB', version: 'v2', linkedTo: 'All materials' },
  { id: 'doc-006', name: 'COA — Batch PKG-2025-441 (PET Bottle Frosted)', category: 'Quality', status: 'Awaiting Upload', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '', expiryDate: null, fileType: '—', fileSize: '—', version: '—', linkedTo: 'PO-2025-00107 / PK-PETB-8801', notes: 'Required before GR posting in SAP. Please upload COA for batch PKG-2025-441.' },
  { id: 'doc-007', name: 'COA — Batch PKG-2025-398 (PET Bottle Clear)', category: 'Quality', status: 'Valid', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '2025-03-28', expiryDate: null, fileType: 'PDF', fileSize: '540 KB', version: 'v1', linkedTo: 'PO-2025-00109 / PK-PETB-8810' },
  { id: 'doc-008', name: 'Framework Supply Agreement — Paragon Corp 2025–2027', category: 'Contract', status: 'Valid', issuedBy: 'Paragon Corp Procurement', issuedDate: '2025-01-15', expiryDate: '2027-01-14', fileType: 'PDF', fileSize: '3.8 MB', version: 'v4', linkedTo: 'All POs' },
  { id: 'doc-009', name: 'NIB — Nomor Induk Berusaha (9120300123456)', category: 'Tax & Legal', status: 'Valid', issuedBy: 'OSS — Online Single Submission', issuedDate: '2018-07-01', expiryDate: null, fileType: 'PDF', fileSize: '220 KB', version: 'v1', linkedTo: 'Supplier Master Data' },
  { id: 'doc-010', name: 'Halal Assurance System (HAS) 23000 Manual', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'MUI LP POM', issuedDate: '2025-03-01', expiryDate: null, fileType: 'PDF', fileSize: '5.2 MB', version: 'v2', linkedTo: 'Halal Certificate renewal', notes: 'Submitted for BPJPH review — 2026 mandatory transition' },
];

const STATUS_CFG: Record<DocStatus, { bg: string; color: string; icon: string }> = {
  'Valid':           { bg: '#DCFCE7', color: '#166534', icon: '✓' },
  'Expiring Soon':   { bg: '#FEF3C7', color: '#92400E', icon: '⚠' },
  'Expired':         { bg: '#FEE2E2', color: '#991B1B', icon: '✗' },
  'Awaiting Upload': { bg: '#F1F5F9', color: '#475569', icon: '↑' },
  'Under Review':    { bg: '#EFF6FF', color: '#1E40AF', icon: '⟳' },
};

const CAT_CFG: Record<DocCategory, { color: string; bg: string }> = {
  'Halal Compliance': { bg: '#FEF9C3', color: '#854D0E' },
  'BPOM Regulatory':  { bg: '#EFF6FF', color: '#1E40AF' },
  'Tax & Legal':      { bg: '#F0FDF4', color: '#166534' },
  'Quality':          { bg: '#F5F3FF', color: '#5B21B6' },
  'Contract':         { bg: '#FFF7ED', color: '#C2410C' },
  'Other':            { bg: '#F8FAFC', color: '#475569' },
};

const CATEGORIES: Array<DocCategory | 'All'> = ['All', 'Halal Compliance', 'BPOM Regulatory', 'Tax & Legal', 'Quality', 'Contract'];

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
