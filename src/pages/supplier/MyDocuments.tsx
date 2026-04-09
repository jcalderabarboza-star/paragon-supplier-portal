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

function UploadModal({ doc, onClose }: { doc: SupplierDocument; onClose: () => void }) {
  const [uploaded, setUploaded] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Upload Document</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>{doc.name}</div>
        {!uploaded ? (
          <div onDrop={e => { e.preventDefault(); setUploaded(true); }} onDragOver={e => e.preventDefault()} style={{ border: `2px dashed ${BORDER}`, borderRadius: 8, padding: '2rem', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC', marginBottom: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: MID }}>Drop file here or click to browse</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>PDF, JPG, PNG · Max 20 MB</div>
          </div>
        ) : (
          <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 8, padding: '1rem', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Document uploaded — pending Paragon review</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', border: `1px solid ${BORDER}`, borderRadius: 6, background: 'white', color: MID, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{uploaded ? 'Close' : 'Cancel'}</button>
          {!uploaded && <button onClick={() => setUploaded(true)} style={{ padding: '8px 18px', border: 'none', borderRadius: 6, background: TEAL, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Submit</button>}
        </div>
      </div>
    </div>
  );
}

const MyDocuments: React.FC = () => {
  const [filterCat, setFilterCat] = useState<DocCategory | 'All'>('All');
  const [search, setSearch]       = useState('');
  const [uploadDoc, setUploadDoc] = useState<SupplierDocument | null>(null);
  const [toast, setToast]         = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const filtered = DOCUMENTS.filter(d => {
    const matchCat = filterCat === 'All' || d.category === filterCat;
    const matchSearch = search === '' || d.name.toLowerCase().includes(search.toLowerCase()) || d.issuedBy.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const expiringSoon = DOCUMENTS.filter(d => { const days = daysUntil(d.expiryDate); return days !== null && days > 0 && days <= 180; });
  const expired      = DOCUMENTS.filter(d => { const days = daysUntil(d.expiryDate); return days !== null && days <= 0; });
  const awaitingUpload = DOCUMENTS.filter(d => d.status === 'Awaiting Upload');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {uploadDoc && <UploadModal doc={uploadDoc} onClose={() => setUploadDoc(null)} />}
      {toast && <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '0.75rem 1.25rem', borderRadius: 8, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 13, borderLeft: `3px solid ${TEAL}` }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>My Documents</div>
          <div style={{ fontSize: 13, color: MUTED }}>Certifications, compliance documents, COAs, and contracts · Halal & BPOM tracking</div>
        </div>
        <button onClick={() => showToast('New document upload — select category to begin')} style={{ background: TEAL, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>＋ Upload Document</button>
      </div>

      {expired.length > 0 && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#991B1B' }}>
          <span>❌</span>
          <div><strong>{expired.length} expired document{expired.length > 1 ? 's' : ''} — immediate renewal required: </strong>{expired.map(d => d.name.split('—')[0].trim()).join(' · ')}</div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#92400E' }}>
          <span>⚠️</span>
          <div><strong>{expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expiring within 6 months: </strong>{expiringSoon.map(d => d.name.split('—')[0].trim()).join(' · ')}</div>
        </div>
      )}
      {awaitingUpload.length > 0 && (
        <div style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#475569' }}>
          <span>📎</span>
          <div><strong>{awaitingUpload.length} document{awaitingUpload.length > 1 ? 's' : ''} awaiting upload: </strong>{awaitingUpload.map(d => d.linkedTo).join(' · ')}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Documents', value: DOCUMENTS.length,  color: TEAL,      icon: '📋' },
          { label: 'Valid',           value: DOCUMENTS.filter(d => d.status === 'Valid').length, color: '#107E3E', icon: '✅' },
          { label: 'Expiring ≤180d',  value: expiringSoon.length, color: '#E9730C', icon: '⚠️' },
          { label: 'Expired',         value: expired.length,      color: '#BB0000', icon: '✗' },
          { label: 'Needs Action',    value: awaitingUpload.length, color: '#475569', icon: '❗' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: 'white', border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{icon} {label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: NAVY, fontFamily: 'inherit', outline: 'none' }} />
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '5px 10px', border: 'none', borderRadius: 4, background: filterCat === c ? 'white' : 'transparent', color: filterCat === c ? NAVY : MUTED, fontWeight: filterCat === c ? 700 : 500, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', boxShadow: filterCat === c ? '0 1px 3px rgba(0,0,0,0.1)' : undefined, whiteSpace: 'nowrap' }}>{c}</button>
          ))}
        </div>
      </div>

