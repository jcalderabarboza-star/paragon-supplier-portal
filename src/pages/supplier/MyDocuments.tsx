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
  { id: 'doc-001', name: 'Halal Certificate — MUI No. 01011234561020', category: 'Halal Compliance', status: 'Expiring Soon', issuedBy: 'MUI (Majelis Ulama Indonesia)', issuedDate: '2023-09-01', expiryDate: '2026-05-15', fileType: 'PDF', fileSize: '1.2 MB', version: 'v3', linkedTo: 'PK-PETB-8801, PK-PETB-8810', notes: 'BPJPH mandatory renewal required by October 2026' },
  { id: 'doc-002', name: 'BPOM Notification — TD.01.01.55.09.22.0142', category: 'BPOM Regulatory', status: 'Valid', issuedBy: 'BPOM (Badan Pengawas Obat dan Makanan)', issuedDate: '2022-09-15', expiryDate: '2027-09-14', fileType: 'PDF', fileSize: '860 KB', version: 'v1', linkedTo: 'PK-PETB-8801' },
  { id: 'doc-003', name: 'NPWP Certificate — 01.234.567.8-041.000', category: 'Tax & Legal', status: 'Valid', issuedBy: 'Dirjen Pajak — DJP Indonesia', issuedDate: '2010-03-12', expiryDate: null, fileType: 'PDF', fileSize: '420 KB', version: 'v1', linkedTo: 'All POs' },
  { id: 'doc-004', name: 'PKP Registration — Pengusaha Kena Pajak', category: 'Tax & Legal', status: 'Valid', issuedBy: 'KPP Pratama Tangerang', issuedDate: '2010-05-20', expiryDate: null, fileType: 'PDF', fileSize: '310 KB', version: 'v1', linkedTo: 'All Invoices' },
  { id: 'doc-005', name: 'ISO 9001:2015 Quality Management Certificate', category: 'Quality', status: 'Valid', issuedBy: 'TÜV Rheinland Indonesia', issuedDate: '2023-11-10', expiryDate: '2026-11-09', fileType: 'PDF', fileSize: '2.1 MB', version: 'v2', linkedTo: 'All materials' },
  { id: 'doc-006', name: 'COA — Batch PKG-2025-441 (PET Bottle Frosted)', category: 'Quality', status: 'Awaiting Upload', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '', expiryDate: null, fileType: '—', fileSize: '—', version: '—', linkedTo: 'PO-2025-00107 / PK-PETB-8801', notes: 'Required before GR posting in SAP. Please upload COA for batch PKG-2025-441.' },
  { id: 'doc-007', name: 'COA — Batch PKG-2025-398 (PET Bottle Clear)', category: 'Quality', status: 'Valid', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '2025-03-28', expiryDate: null, fileType: 'PDF', fileSize: '540 KB', version: 'v1', linkedTo: 'PO-2025-00109 / PK-PETB-8810' },
  { id: 'doc-008', name: 'Framework Supply Agreement — Paragon Corp 2025–2027', category: 'Contract', status: 'Valid', issuedBy: 'Paragon Corp Procurement', issuedDate: '2025-01-15', expiryDate: '2027-01-14', fileType: 'PDF', fileSize: '3.8 MB', version: 'v4', linkedTo: 'All POs' },
  { id: 'doc-009', name: 'NIB — Nomor Induk Berusaha (9120300123456)', category: 'Tax & Legal', status: 'Valid', issuedBy: 'OSS — Online Single Submission', issuedDate: '2018-07-01', expiryDate: null, fileType: 'PDF', fileSize: '220 KB', version: 'v1', linkedTo: 'Supplier Master Data' },
  { id: 'doc-010', name: 'Halal Assurance System (HAS) 23000 Manual', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'MUI LP POM', issuedDate: '2025-03-01', expiryDate: null, fileType: 'PDF', fileSize: '5.2 MB', version: 'v2', linkedTo: 'Halal Certificate renewal', notes: 'Submitted for BPJPH review — 2026 mandatory transition' },
  { id: 'doc-011', name: 'BPJPH Halal Certificate Application — In Progress', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'BPJPH — Badan Penyelenggara Jaminan Produk Halal', issuedDate: '2026-01-10', expiryDate: null, fileType: 'PDF', fileSize: '1.8 MB', version: 'v1', linkedTo: 'Replaces MUI cert doc-001', notes: 'BPJPH application submitted January 2026 — awaiting inspection schedule' },
];

const STATUS_CFG: Record<DocStatus, { bg: string; color: string; icon: string }> = {
  'Valid':           { bg: '#DCFCE7', color: '#107E3E', icon: '✓' },
  'Expiring Soon':   { bg: '#FEF3C7', color: '#E9730C', icon: '⚠' },
  'Expired':         { bg: '#FEE2E2', color: '#BB0000', icon: '✗' },
  'Awaiting Upload': { bg: '#F1F5F9', color: '#475569', icon: '↑' },
  'Under Review':    { bg: '#EFF6FF', color: '#0D1B2A', icon: '⟳' },
};

const CAT_CFG: Record<DocCategory, { color: string; bg: string }> = {
  'Halal Compliance': { bg: '#FEF9C3', color: '#E9730C' },
  'BPOM Regulatory':  { bg: '#EFF6FF', color: '#0D1B2A' },
  'Tax & Legal':      { bg: '#F0FDF4', color: '#107E3E' },
  'Quality':          { bg: '#F5F3FF', color: '#0D1B2A' },
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
            <div style={{ fontSize: 24, marginBottom: 8, fontWeight: 700, color: '#0097A7' }}>↑</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: MID }}>Drop file here or click to browse</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>PDF, JPG, PNG · Max 20 MB</div>
          </div>
        ) : (
          <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 8, padding: '16px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 4, color: '#107E3E', fontWeight: 700 }}>✓</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#107E3E' }}>Document uploaded — pending Paragon review</div>
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
      {toast && <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 13, borderLeft: `3px solid ${TEAL}` }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>My Documents</div>
          <div style={{ fontSize: 13, color: MUTED }}>Certifications, compliance documents, COAs, and contracts · Halal & BPOM tracking</div>
        </div>
        <button onClick={() => setUploadDoc({ id: 'new', name: 'New Document', category: 'Other', status: 'Awaiting Upload', issuedBy: '', issuedDate: '', expiryDate: null, fileType: '—', fileSize: '—', version: '—', linkedTo: '' })} style={{ background: TEAL, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>＋ Upload Document</button>
      </div>

      {expired.length > 0 && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#BB0000' }}>
          <span>✗</span>
          <div><strong>{expired.length} expired document{expired.length > 1 ? 's' : ''} — immediate renewal required: </strong>{expired.map(d => d.name.split('—')[0].trim()).join(' · ')}</div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#E9730C' }}>
          <span>!</span>
          <div><strong>{expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expiring within 6 months: </strong>{expiringSoon.map(d => d.name.split('—')[0].trim()).join(' · ')}</div>
        </div>
      )}
      {awaitingUpload.length > 0 && (
        <div style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#475569' }}>
          <span style={{ fontWeight: 700 }}>↑</span>
          <div><strong>{awaitingUpload.length} document{awaitingUpload.length > 1 ? 's' : ''} awaiting upload: </strong>{awaitingUpload.map(d => d.linkedTo).join(' · ')}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Documents', value: DOCUMENTS.length,  color: TEAL,      icon: '≡' },
          { label: 'Valid',           value: DOCUMENTS.filter(d => d.status === 'Valid').length, color: '#107E3E', icon: '✓' },
          { label: 'Expiring ≤180d',  value: expiringSoon.length, color: '#E9730C', icon: '!' },
          { label: 'Expired',         value: expired.length,      color: '#BB0000', icon: '✗' },
          { label: 'Needs Action',    value: awaitingUpload.length, color: '#475569', icon: '↑' },
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

      <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              {['Document', 'Category', 'Issued By', 'Issued', 'Expiry', 'Status', 'Ver.', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc, idx) => {
              const sCfg = STATUS_CFG[doc.status];
              const cCfg = CAT_CFG[doc.category];
              const days = daysUntil(doc.expiryDate);
              return (
                <tr key={doc.id} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                    <div style={{ fontWeight: 600, color: NAVY, marginBottom: 2, fontSize: 12 }}>{doc.name}</div>
                    {doc.notes && <div style={{ fontSize: 10, color: '#E9730C', marginBottom: 2 }}>⚠ {doc.notes}</div>}
                    <div style={{ fontSize: 10, color: MUTED }}>Linked: {doc.linkedTo}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}><Pill label={doc.category} bg={cCfg.bg} color={cCfg.color} /></td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: MUTED, maxWidth: 160 }}>{doc.issuedBy}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{fmtDate(doc.issuedDate)}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {doc.expiryDate ? (
                      <div>
                        <div style={{ fontSize: 11, color: days !== null && days <= 90 ? '#E9730C' : MUTED }}>{fmtDate(doc.expiryDate)}</div>
                        {days !== null && <div style={{ fontSize: 10, color: days <= 0 ? '#BB0000' : days <= 90 ? '#E9730C' : MUTED }}>{days > 0 ? `${days}d remaining` : `Expired ${Math.abs(days)}d ago`}</div>}
                      </div>
                    ) : <span style={{ color: MUTED, fontSize: 11 }}>No expiry</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}><Pill label={`${sCfg.icon} ${doc.status}`} bg={sCfg.bg} color={sCfg.color} /></td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: MUTED, textAlign: 'center' }}>{doc.version}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {doc.status === 'Awaiting Upload' ? (
                        <button onClick={() => setUploadDoc(doc)} style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↑ Upload</button>
                      ) : (
                        <button onClick={() => showToast(`Downloading ${doc.name}...`)} style={{ background: 'white', color: MID, border: `1px solid ${BORDER}`, borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↓ View</button>
                      )}
                      {doc.expiryDate && days !== null && days <= 180 && (
                        <button onClick={() => showToast(`Renewal workflow started for ${doc.name.split('—')[0].trim()}`)} style={{ background: '#FEF3C7', color: '#E9730C', border: '1px solid #F59E0B', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Renew</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#FEF9C3', border: '1px solid #F59E0B', borderRadius: 8, padding: '14px 18px', fontSize: 12, color: '#E9730C', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 16 }}>☪</span>
        <div>
          <strong>BPJPH Halal Mandatory Transition — October 2026:</strong> All cosmetics and personal care products distributed in Indonesia must carry BPJPH-issued halal certification. MUI certificates issued before the transition remain valid until expiry but cannot be renewed — new BPJPH certification must be obtained.
          <a href="https://halal.go.id" target="_blank" rel="noopener noreferrer" style={{ color: '#E9730C', marginLeft: 6, fontWeight: 600 }}>halal.go.id ↗</a>
        </div>
      </div>

    </div>
  );
};

export default MyDocuments;
