import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contract {
  id: string; contractNumber: string; title: string;
  supplier: string; country: string; category: string; type: string;
  status: 'Active' | 'Expiring Soon' | 'Pending Signature' | 'Expired' | 'Terminated';
  startDate: string; endDate: string; value: string; currency: string;
  paymentTerms: string; incoterms: string; autoRenew: boolean;
  linkedRFQ: string; sapInfoRecord: string; signedDate: string; daysRemaining: number;
}

interface Obligation {
  contract: string; supplier: string; obligation: string; frequency: string;
  nextDue: string; status: 'Compliant' | 'Pending' | 'Overdue' | 'Upcoming';
  owner: string; priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface Template {
  name: string; description: string; lastUpdated: string;
  usageCount: number; category: string; tags: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CONTRACTS: Contract[] = [
  { id:'ctr-001', contractNumber:'CTR-2026-001', title:'Niacinamide B3 Supply Agreement',
    supplier:'Zhejiang NHU Vitamins Co.', country:'🇨🇳', category:'Active Ingredients',
    type:'Framework Agreement', status:'Active', startDate:'2026-01-01', endDate:'2026-12-31',
    value:'Rp 480jT', currency:'CNY', paymentTerms:'Net 60', incoterms:'CIF Jakarta',
    autoRenew:true, linkedRFQ:'RFQ-2026-001', sapInfoRecord:'INF-2026-0045',
    signedDate:'2025-12-20', daysRemaining:267 },
  { id:'ctr-002', contractNumber:'CTR-2026-002', title:'PET Packaging Annual Supply',
    supplier:'PT Berlina Packaging Indonesia', country:'🇮🇩', category:'Packaging Primary',
    type:'Annual Contract', status:'Active', startDate:'2026-01-01', endDate:'2026-12-31',
    value:'Rp 1.2M', currency:'IDR', paymentTerms:'Net 30', incoterms:'DDP Jatake',
    autoRenew:false, linkedRFQ:'RFQ-2025-089', sapInfoRecord:'INF-2025-0234',
    signedDate:'2025-12-15', daysRemaining:267 },
  { id:'ctr-003', contractNumber:'CTR-2026-003', title:'Halal Glycerin Blanket Order',
    supplier:'PT Musim Mas Specialty Fats', country:'🇮🇩', category:'Halal Emulsifiers',
    type:'Blanket Order', status:'Active', startDate:'2026-01-01', endDate:'2026-06-30',
    value:'Rp 260jT', currency:'IDR', paymentTerms:'Net 30', incoterms:'DDP Plant Jakarta',
    autoRenew:false, linkedRFQ:'RFQ-2026-003', sapInfoRecord:'INF-2026-0089',
    signedDate:'2025-12-28', daysRemaining:83 },
  { id:'ctr-004', contractNumber:'CTR-2026-004', title:'Fragrance Compounds Supply',
    supplier:'Givaudan Fragrance SG', country:'🇸🇬', category:'Fragrance & Aroma',
    type:'Framework Agreement', status:'Active', startDate:'2025-07-01', endDate:'2026-06-30',
    value:'Rp 840jT', currency:'SGD', paymentTerms:'Net 45', incoterms:'CIF Jakarta',
    autoRenew:true, linkedRFQ:'RFQ-2025-044', sapInfoRecord:'INF-2025-0156',
    signedDate:'2025-06-15', daysRemaining:83 },
  { id:'ctr-005', contractNumber:'CTR-2026-005', title:'Panthenol B5 Spot Purchase',
    supplier:'BASF Personal Care DE', country:'🇩🇪', category:'Active Ingredients',
    type:'Spot Contract', status:'Expiring Soon', startDate:'2025-10-01', endDate:'2026-06-30',
    value:'Rp 210jT', currency:'EUR', paymentTerms:'Net 60', incoterms:'CIF Jakarta',
    autoRenew:false, linkedRFQ:'RFQ-2025-071', sapInfoRecord:'INF-2025-0178',
    signedDate:'2025-09-25', daysRemaining:83 },
  { id:'ctr-006', contractNumber:'CTR-2026-006', title:'Centella Asiatica Extract Supply',
    supplier:'PT Ecogreen Oleochemicals', country:'🇮🇩', category:'Natural Botanical',
    type:'Annual Contract', status:'Active', startDate:'2026-01-01', endDate:'2026-12-31',
    value:'Rp 190jT', currency:'IDR', paymentTerms:'Net 30', incoterms:'DDP Plant Jakarta',
    autoRenew:true, linkedRFQ:'RFQ-2026-006', sapInfoRecord:'INF-2026-0067',
    signedDate:'2026-01-05', daysRemaining:267 },
  { id:'ctr-007', contractNumber:'CTR-2026-007', title:'Folding Carton Annual Agreement',
    supplier:'PT Indo Karton Packaging', country:'🇮🇩', category:'Packaging Secondary',
    type:'Annual Contract', status:'Pending Signature', startDate:'2026-04-01', endDate:'2027-03-31',
    value:'Rp 380jT', currency:'IDR', paymentTerms:'Net 30', incoterms:'DDP NDC Jatake 6',
    autoRenew:false, linkedRFQ:'RFQ-2026-005', sapInfoRecord:'—',
    signedDate:'—', daysRemaining:365 },
  { id:'ctr-008', contractNumber:'CTR-2026-008', title:'Palm Kernel Oil Standing Order',
    supplier:'PT Musim Mas Specialty Fats', country:'🇮🇩', category:'Halal Emulsifiers',
    type:'Blanket Order', status:'Pending Signature', startDate:'2026-04-15', endDate:'2026-10-15',
    value:'Rp 570jT', currency:'IDR', paymentTerms:'Net 30', incoterms:'DDP RM/PM Warehouse',
    autoRenew:false, linkedRFQ:'RFQ-2026-003', sapInfoRecord:'—',
    signedDate:'—', daysRemaining:190 },
  { id:'ctr-OA-001', contractNumber:'OA-4600001234', title:'Outline Agreement — Palm Kernel Oil RBD',
    supplier:'PT Musim Mas Specialty Fats', country:'🇮🇩', category:'Halal Emulsifiers',
    type:'Outline Agreement', status:'Active', startDate:'2026-01-01', endDate:'2026-12-31',
    value:'Rp 2.4B', currency:'IDR', paymentTerms:'Net 30', incoterms:'DDP RM/PM Warehouse',
    autoRenew:true, linkedRFQ:'RFQ-2026-003', sapInfoRecord:'OA-4600001234',
    signedDate:'2025-12-22', daysRemaining:267 },
];

const OBLIGATIONS: Obligation[] = [
  { contract:'CTR-2026-001', supplier:'Zhejiang NHU', obligation:'Monthly inventory position report', frequency:'Monthly', nextDue:'2026-04-30', status:'Pending', owner:'Supplier', priority:'High' },
  { contract:'CTR-2026-001', supplier:'Zhejiang NHU', obligation:'Halal certificate renewal', frequency:'Annual', nextDue:'2027-03-01', status:'Compliant', owner:'Supplier', priority:'Critical' },
  { contract:'CTR-2026-002', supplier:'PT Berlina', obligation:'Quarterly capacity confirmation', frequency:'Quarterly', nextDue:'2026-06-30', status:'Compliant', owner:'Supplier', priority:'Medium' },
  { contract:'CTR-2026-003', supplier:'PT Musim Mas', obligation:'BPJPH halal cert on delivery', frequency:'Per Shipment', nextDue:'Next delivery', status:'Compliant', owner:'Supplier', priority:'Critical' },
  { contract:'CTR-2026-004', supplier:'Givaudan SG', obligation:'IFRA compliance update', frequency:'Annual', nextDue:'2026-06-30', status:'Upcoming', owner:'Supplier', priority:'High' },
  { contract:'CTR-2026-004', supplier:'Givaudan SG', obligation:'Price review — H2 2026', frequency:'Bi-annual', nextDue:'2026-07-01', status:'Upcoming', owner:'Procurement', priority:'High' },
  { contract:'CTR-2026-005', supplier:'BASF DE', obligation:'SDS update — Panthenol B5', frequency:'Annual', nextDue:'2026-03-31', status:'Overdue', owner:'Supplier', priority:'High' },
  { contract:'CTR-2026-005', supplier:'BASF DE', obligation:'REACH compliance declaration', frequency:'Annual', nextDue:'2026-03-31', status:'Overdue', owner:'Supplier', priority:'Critical' },
  { contract:'CTR-2026-006', supplier:'PT Ecogreen', obligation:'Sustainable sourcing report', frequency:'Bi-annual', nextDue:'2026-06-30', status:'Pending', owner:'Supplier', priority:'Medium' },
  { contract:'CTR-2026-007', supplier:'PT Indo Karton', obligation:'Artwork approval sign-off', frequency:'One-time', nextDue:'2026-04-20', status:'Pending', owner:'Procurement', priority:'High' },
];

const TEMPLATES: Template[] = [
  { name:'Framework Supply Agreement', category:'General', usageCount:12, lastUpdated:'2026-03-01',
    description:'Annual multi-PO framework for strategic suppliers. Includes price review clauses, quality obligations, and halal compliance requirements.',
    tags:['Strategic', 'Annual', 'Halal Ready'] },
  { name:'Spot Purchase Contract', category:'General', usageCount:8, lastUpdated:'2026-01-15',
    description:'Single-event purchase for non-repeat materials. Simple terms with payment-on-delivery options.',
    tags:['Spot', 'Simple'] },
  { name:'Blanket Order Agreement', category:'General', usageCount:6, lastUpdated:'2026-02-10',
    description:'Pre-agreed volume with scheduled releases. Ideal for raw materials with predictable consumption.',
    tags:['Volume', 'Scheduled'] },
  { name:'International Supply Agreement (EU)', category:'International', usageCount:4, lastUpdated:'2026-01-20',
    description:'REACH compliant template for European chemical suppliers. Includes SDS requirements, SVHC declarations, and EUR payment terms.',
    tags:['EU', 'REACH', 'EUR'] },
  { name:'Halal Certified Supply Agreement', category:'Compliance', usageCount:9, lastUpdated:'2026-03-15',
    description:'Enhanced compliance clauses for BPJPH halal-required materials. Includes certificate maintenance obligations and audit rights.',
    tags:['Halal', 'BPJPH', 'Audit Rights'] },
  { name:'Packaging Supply Agreement', category:'Packaging', usageCount:5, lastUpdated:'2025-12-01',
    description:'Tailored for primary and secondary packaging suppliers. Includes color matching, artwork approval, and MOQ terms.',
    tags:['Packaging', 'Artwork', 'MOQ'] },
];

const CONTRACT_OBLIGATIONS: Record<string, { obligation:string; frequency:string; nextDue:string; status:string; owner:string }[]> = {
  'ctr-001': [
    { obligation:'Monthly inventory position report', frequency:'Monthly', nextDue:'2026-04-30', status:'Pending', owner:'Zhejiang NHU' },
    { obligation:'Quarterly quality audit submission', frequency:'Quarterly', nextDue:'2026-06-30', status:'Compliant', owner:'Quality Team' },
    { obligation:'Price review clause (±5% market index)', frequency:'Bi-annual', nextDue:'2026-07-01', status:'Upcoming', owner:'Procurement' },
    { obligation:'Halal certificate renewal', frequency:'Annual', nextDue:'2027-03-01', status:'Compliant', owner:'Zhejiang NHU' },
  ],
  'default': [
    { obligation:'Quarterly performance review', frequency:'Quarterly', nextDue:'2026-06-30', status:'Upcoming', owner:'Procurement' },
    { obligation:'Annual contract review', frequency:'Annual', nextDue:'2026-12-01', status:'Upcoming', owner:'Procurement' },
    { obligation:'Certificate of conformance on delivery', frequency:'Per Shipment', nextDue:'Next delivery', status:'Compliant', owner:'Supplier' },
  ],
};

// ─── Style tokens ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  Active:'#107E3E', 'Expiring Soon':'#E9730C', 'Pending Signature':'#0097A7',
  Expired:'#94A3B8', Terminated:'#BB0000',
};
const STATUS_BG: Record<string, string> = {
  Active:'#DCFCE7', 'Expiring Soon':'#FEF3C7', 'Pending Signature':'#EFF6FF',
  Expired:'#F1F5F9', Terminated:'#FEE2E2',
};
const OBL_COLOR: Record<string, string> = {
  Compliant:'#107E3E', Pending:'#E9730C', Overdue:'#BB0000', Upcoming:'#0097A7',
};
const OBL_BG: Record<string, string> = {
  Compliant:'#DCFCE7', Pending:'#FEF3C7', Overdue:'#FEE2E2', Upcoming:'#EFF6FF',
};
const PRI_COLOR: Record<string, string> = {
  Critical:'#BB0000', High:'#E9730C', Medium:'#F59E0B', Low:'#94A3B8',
};
const PRI_BG: Record<string, string> = {
  Critical:'#FEE2E2', High:'#FEF3C7', Medium:'#FEF9C3', Low:'#F1F5F9',
};

const daysColor = (d: number) => d <= 30 ? '#BB0000' : d <= 90 ? '#E9730C' : '#107E3E';

// ─── Toast helper ─────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{ position:'fixed', bottom:80, right:24, background:'#0D1B2A', color:'#fff',
    borderRadius:8, padding:'10px 16px', fontSize:13, boxShadow:'0 4px 16px rgba(0,0,0,0.25)',
    zIndex:10000, borderLeft:'3px solid #0097A7', maxWidth:420, lineHeight:1.5 }}>
    {msg}
  </div>
);

// ─── Contract Detail Panel ────────────────────────────────────────────────────
const ContractDetailPanel: React.FC<{ contract: Contract; onClose: () => void }> = ({ contract: c, onClose }) => {
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const obligations = CONTRACT_OBLIGATIONS[c.id] ?? CONTRACT_OBLIGATIONS['default'];

  const timeline = [
    { label:'RFQ Published', date: c.linkedRFQ ? '2025-12-01' : '—', done: true },
    { label:'Award Decision', date:'2025-12-10', done: true },
    { label:'Contract Drafted', date:'2025-12-15', done: true },
    { label:'Paragon Signed', date: c.signedDate !== '—' ? c.signedDate : '—', done: c.signedDate !== '—' },
    { label:'Supplier Countersignature', date: c.signedDate !== '—' ? c.signedDate : 'Pending', done: c.status !== 'Pending Signature' },
    { label:'SAP Info Record Created', date: c.sapInfoRecord !== '—' ? c.sapInfoRecord : 'Pending', done: c.sapInfoRecord !== '—' },
    { label:'First PO Issued', date: c.sapInfoRecord !== '—' ? '2026-01-10' : '—', done: c.sapInfoRecord !== '—' },
  ];

  return (
    <div style={{ position:'fixed', top:0, right:0, width:520, height:'100vh', background:'#fff',
      boxShadow:'-4px 0 24px rgba(0,0,0,0.14)', zIndex:9000, display:'flex', flexDirection:'column',
      overflowY:'auto' }}>
      {toast && <Toast msg={toast} />}

      {/* Panel header */}
      <div style={{ background:'#0D1B2A', padding:'20px 24px', position:'sticky', top:0, zIndex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:12, color:'#0097A7', marginBottom:4 }}>{c.contractNumber}</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.3 }}>{c.title}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94A3B8', fontSize:20, cursor:'pointer', padding:0, marginTop:2 }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <span style={{ background:STATUS_BG[c.status], color:STATUS_COLOR[c.status], borderRadius:9999, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{c.status}</span>
          <span style={{ background:'rgba(255,255,255,0.1)', color:'#CBD5E1', borderRadius:9999, padding:'2px 10px', fontSize:11 }}>{c.type}</span>
        </div>
      </div>

      <div style={{ padding:24, flex:1 }}>
        {c.type === 'Outline Agreement' && (
          <div style={{ marginBottom:20, background:'#E0F7FA', border:'1px solid #0097A744', borderRadius:8, padding:'12px 16px', fontSize:12, color:'#006064', lineHeight:1.6 }}>
            <strong>Outline Agreement (S/4HANA):</strong> A blanket purchase order covering recurring material requirements over a defined period. Individual release orders are created against the agreement as needed, without repeating the full sourcing process.
          </div>
        )}
        {/* Section 1 — Supplier */}
        <div style={{ marginBottom:20, padding:16, background:'#F8FAFC', borderRadius:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Supplier</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#0D1B2A' }}>{c.country} {c.supplier}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10, fontSize:12 }}>
            <span><span style={{ color:'#94A3B8' }}>Category:</span> {c.category}</span>
            <span><span style={{ color:'#94A3B8' }}>Linked RFQ:</span> <span style={{ fontFamily:'monospace', color:'#0097A7' }}>{c.linkedRFQ}</span></span>
            <span><span style={{ color:'#94A3B8' }}>SAP Info Record:</span> <span style={{ fontFamily:'monospace' }}>{c.sapInfoRecord}</span></span>
            <span><span style={{ color:'#94A3B8' }}>Signed:</span> {c.signedDate}</span>
          </div>
        </div>

        {/* Section 2 — Commercial Terms */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Commercial Terms</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:13 }}>
            {[
              ['Start Date', c.startDate], ['Contract Value', c.value],
              ['End Date', c.endDate], ['Currency', c.currency],
              ['Days Remaining', String(c.daysRemaining)], ['Payment Terms', c.paymentTerms],
              ['Auto-Renew', c.autoRenew ? '✓ Yes' : '✗ No'], ['Incoterms', c.incoterms],
            ].map(([label, val]) => (
              <div key={label} style={{ background:'#F8FAFC', borderRadius:6, padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:'#94A3B8', marginBottom:2 }}>{label}</div>
                <div style={{ fontWeight:600, color: label === 'Days Remaining' ? daysColor(c.daysRemaining) : '#0D1B2A' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Obligations */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Key Obligations</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'#F0F4F8' }}>
              {['Obligation','Frequency','Next Due','Status','Owner'].map(h => (
                <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:600, color:'#64748B' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {obligations.map((o, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #E2E8F0' }}>
                  <td style={{ padding:'8px 10px', fontWeight:500 }}>{o.obligation}</td>
                  <td style={{ padding:'8px 10px', color:'#64748B' }}>{o.frequency}</td>
                  <td style={{ padding:'8px 10px', fontFamily:'monospace', fontSize:11 }}>{o.nextDue}</td>
                  <td style={{ padding:'8px 10px' }}>
                    <span style={{ background:OBL_BG[o.status]??'#F1F5F9', color:OBL_COLOR[o.status]??'#94A3B8', borderRadius:9999, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{o.status}</span>
                  </td>
                  <td style={{ padding:'8px 10px', color:'#64748B' }}>{o.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4 — Timeline */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Contract Timeline</div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:24 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background: t.done ? '#107E3E' : '#E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color: t.done ? '#fff' : '#94A3B8', flexShrink:0 }}>
                    {t.done ? '✓' : '⏳'}
                  </div>
                  {i < timeline.length - 1 && <div style={{ width:2, height:24, background: t.done ? '#107E3E' : '#E2E8F0', margin:'2px 0' }} />}
                </div>
                <div style={{ paddingBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight: t.done ? 600 : 400, color: t.done ? '#0D1B2A' : '#94A3B8' }}>{t.label}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', fontFamily:'monospace' }}>{t.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — Actions */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', borderTop:'1px solid #E2E8F0', paddingTop:16 }}>
          <button onClick={() => showToast('Contract PDF downloading...')} style={{ padding:'8px 14px', borderRadius:6, background:'#0097A7', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>Download PDF</button>
          <button onClick={() => showToast('Amendment request initiated. Legal team notified.')} style={{ padding:'8px 14px', borderRadius:6, background:'#F0F4F8', color:'#0D1B2A', border:'1px solid #E2E8F0', fontSize:13, cursor:'pointer' }}>edit Amendment</button>
          <button onClick={() => showToast('Renewal workflow initiated for ' + c.title)} style={{ padding:'8px 14px', borderRadius:6, background:'#F0F4F8', color:'#0D1B2A', border:'1px solid #E2E8F0', fontSize:13, cursor:'pointer' }}> Renew</button>
          <button onClick={() => showToast('! WARNING: Contract termination will immediately stop all POs. This action is irreversible. Please confirm with your manager.')} style={{ padding:'8px 14px', borderRadius:6, background:'#FEE2E2', color:'#BB0000', border:'1px solid #FCA5A5', fontSize:13, cursor:'pointer' }}>⛔ Terminate</button>
        </div>
      </div>
    </div>
  );
};

// ─── Renewal Modal ────────────────────────────────────────────────────────────
const RenewalModal: React.FC<{ contract: Contract; onClose: () => void }> = ({ contract: c, onClose }) => {
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const [channel, setChannel] = useState('Email');
  const [changes, setChanges] = useState('');

  const refNum = `RNW-2026-${Math.floor(100 + Math.random() * 900)}`;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9500, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {toast && <Toast msg={toast} />}
      <div style={{ background:'#fff', borderRadius:12, width:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ background:'#0D1B2A', padding:'20px 24px', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'#0097A7', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px' }}>Contract Renewal</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginTop:2 }}>{c.title}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94A3B8', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {[
              ['New Start Date', 'date', c.endDate, ''],
              ['New End Date', 'date', '', ''],
              ['Proposed Value', 'text', c.value, 'e.g. Rp 500jT'],
              ['Price Adjustment %', 'number', '', '+5 or -3'],
            ].map(([label, type, val, ph]) => (
              <div key={label}>
                <label style={{ fontSize:12, fontWeight:600, color:'#0D1B2A', display:'block', marginBottom:4 }}>{label}</label>
                <input type={type} defaultValue={val} placeholder={ph}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:13, boxSizing:'border-box' as const }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#0D1B2A', display:'block', marginBottom:4 }}>Payment Terms</label>
            <select defaultValue={c.paymentTerms} style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:13 }}>
              {['Net 30','Net 45','Net 60','Net 90'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#0D1B2A', display:'block', marginBottom:4 }}>Key Changes from Current Contract</label>
            <textarea value={changes} onChange={e => setChanges(e.target.value)} rows={3}
              placeholder="e.g. Price adjustment per Q4 market index, extended credit terms..."
              style={{ width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:13, resize:'vertical', boxSizing:'border-box' as const }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#0D1B2A', display:'block', marginBottom:6 }}>Send renewal proposal via</label>
            <div style={{ display:'flex', gap:8 }}>
              {['Email','WhatsApp','Portal','WeChat'].map(ch => (
                <div key={ch} onClick={() => setChannel(ch)} style={{ padding:'5px 14px', borderRadius:9999, fontSize:12, fontWeight:500, cursor:'pointer',
                  background: channel === ch ? '#0097A7' : '#F0F4F8', color: channel === ch ? '#fff' : '#64748B',
                  border:`1px solid ${channel === ch ? '#0097A7' : '#E2E8F0'}` }}>{ch}</div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => showToast(`Renewal proposal sent to ${c.supplier} via ${channel}. Reference: ${refNum}`)}
              style={{ padding:'9px 18px', borderRadius:6, background:'#0097A7', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Send Renewal Proposal
            </button>
            <button onClick={() => showToast('Renewal draft saved')}
              style={{ padding:'9px 18px', borderRadius:6, background:'#F0F4F8', color:'#0D1B2A', border:'1px solid #E2E8F0', fontSize:13, cursor:'pointer' }}>
              Save Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── New Contract Panel ───────────────────────────────────────────────────────
const NewContractPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const [autoRenew, setAutoRenew] = useState(false);

  const ctrNum = `CTR-2026-${Math.floor(100 + Math.random() * 900)}`;

  const suppliers = ['Zhejiang NHU Vitamins Co.','PT Berlina Packaging Indonesia','PT Musim Mas Specialty Fats',
    'Givaudan Fragrance SG','BASF Personal Care DE','PT Ecogreen Oleochemicals','PT Indo Karton Packaging'];

  const label = (txt: string) => (
    <label style={{ fontSize:12, fontWeight:600, color:'#0D1B2A', display:'block', marginBottom:4 }}>{txt}</label>
  );
  const inp = (type='text', placeholder='', defaultVal='') => (
    <input type={type} placeholder={placeholder} defaultValue={defaultVal}
      style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:13, boxSizing:'border-box' as const }} />
  );
  const sel = (opts: string[], def='') => (
    <select defaultValue={def} style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:13 }}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{ position:'fixed', top:0, right:0, width:480, height:'100vh', background:'#fff',
      boxShadow:'-4px 0 24px rgba(0,0,0,0.14)', zIndex:9000, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {toast && <Toast msg={toast} />}
      <div style={{ background:'#0D1B2A', padding:'20px 24px', position:'sticky', top:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Create New Contract</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94A3B8', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
      </div>
      <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
        <div>{label('Contract Title')}{inp('text','e.g. Niacinamide B3 Supply Agreement 2027')}</div>
        <div>{label('Supplier')}{sel(['Select supplier...', ...suppliers])}</div>
        <div>{label('Contract Type')}{sel(['Framework Agreement','Annual Contract','Blanket Order','Spot Contract','Outline Agreement'])}</div>
        <div>{label('Template')}{sel(['Select template...', ...TEMPLATES.map(t => t.name)])}</div>
        <div>{label('Linked RFQ (optional)')}{sel(['None','RFQ-2026-001','RFQ-2026-003','RFQ-2026-005','RFQ-2026-006'])}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>{label('Start Date')}{inp('date')}</div>
          <div>{label('End Date')}{inp('date')}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>{label('Contract Value')}{inp('number','e.g. 480000000')}</div>
          <div>{label('Currency')}{sel(['IDR','USD','EUR','CNY','SGD','JPY','MYR'])}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>{label('Payment Terms')}{sel(['Net 30','Net 45','Net 60','Net 90'])}</div>
          <div>{label('Incoterms')}{sel(['DDP','CIF','FOB','EXW','DAP'])}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F8FAFC', borderRadius:8, padding:'12px 16px' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#0D1B2A' }}>Auto-Renew</div>
            <div style={{ fontSize:11, color:'#64748B' }}>Automatically initiate renewal 90 days before expiry</div>
          </div>
          <div onClick={() => setAutoRenew(a => !a)} style={{ width:44, height:24, borderRadius:12, background: autoRenew ? '#0097A7' : '#E2E8F0', cursor:'pointer', position:'relative', transition:'background 0.15s' }}>
            <div style={{ position:'absolute', top:2, left: autoRenew ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
          </div>
        </div>
        <div>
          {label('Key Terms / Notes')}
          <textarea rows={4} placeholder="Summary of key commercial terms, special conditions, or notes for legal review..."
            style={{ width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:13, resize:'vertical', boxSizing:'border-box' as const }} />
        </div>
        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
          <button onClick={() => showToast(`Contract ${ctrNum} created. Template applied. Ready for review and supplier signature.`)}
            style={{ flex:1, padding:'10px 0', borderRadius:6, background:'#0097A7', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Create Contract Draft
          </button>
          <button onClick={onClose}
            style={{ padding:'10px 16px', borderRadius:6, background:'#F0F4F8', color:'#64748B', border:'1px solid #E2E8F0', fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab 1 — Active Contracts ─────────────────────────────────────────────────
const ActiveContractsTab: React.FC = () => {
  const [selected, setSelected] = useState<Contract|null>(null);
  const [renewTarget, setRenewTarget] = useState<Contract|null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  return (
    <div>
      {toast && <Toast msg={toast} />}
      {selected && <ContractDetailPanel contract={selected} onClose={() => setSelected(null)} />}
      {renewTarget && <RenewalModal contract={renewTarget} onClose={() => setRenewTarget(null)} />}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#F0F4F8', borderBottom:'2px solid #E2E8F0' }}>
            {['Contract #','Title','Supplier','Category','Type','Status','Start','End','Value','Days Left','Auto-Renew','SAP Info Rec.','Actions'].map(h => (
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748B', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {CONTRACTS.map(c => (
              <tr key={c.id} style={{ borderBottom:'1px solid #E2E8F0' }}>
                <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:12, fontWeight:600, color:'#0097A7', whiteSpace:'nowrap' }}>{c.contractNumber}</td>
                <td style={{ padding:'11px 12px', fontWeight:500, maxWidth:180 }}>{c.title}</td>
                <td style={{ padding:'11px 12px', whiteSpace:'nowrap' }}>{c.country} {c.supplier}</td>
                <td style={{ padding:'11px 12px', color:'#64748B' }}>{c.category}</td>
                <td style={{ padding:'11px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{c.type}</td>
                <td style={{ padding:'11px 12px' }}>
                  <span style={{ background:STATUS_BG[c.status], color:STATUS_COLOR[c.status], borderRadius:9999, padding:'2px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{c.status}</span>
                </td>
                <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:12 }}>{c.startDate}</td>
                <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:12 }}>{c.endDate}</td>
                <td style={{ padding:'11px 12px', fontWeight:600, whiteSpace:'nowrap' }}>{c.value}</td>
                <td style={{ padding:'11px 12px', fontWeight:700, color: daysColor(c.daysRemaining), whiteSpace:'nowrap' }}>{c.daysRemaining}d</td>
                <td style={{ padding:'11px 12px', textAlign:'center' }}>{c.autoRenew ? '✓' : '✗'}</td>
                <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:12, color: c.sapInfoRecord === '—' ? '#94A3B8' : '#0D1B2A' }}>{c.sapInfoRecord}</td>
                <td style={{ padding:'11px 12px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => setSelected(c)}
                      style={{ padding:'4px 10px', borderRadius:4, background:'#0097A7', color:'#fff', border:'none', fontSize:12, cursor:'pointer', fontWeight:500 }}>View</button>
                    {c.daysRemaining <= 90 && (
                      <button onClick={() => setRenewTarget(c)}
                        style={{ padding:'4px 10px', borderRadius:4, background:'#FEF3C7', color:'#E9730C', border:'1px solid #FCD34D', fontSize:12, cursor:'pointer', fontWeight:500 }}>Renew</button>
                    )}
                    {c.status === 'Pending Signature' && (
                      <button onClick={() => showToast(`Contract sent to ${c.supplier} for countersignature via Email`)}
                        style={{ padding:'4px 10px', borderRadius:4, background:'#EFF6FF', color:'#0097A7', border:'1px solid #BFDBFE', fontSize:12, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>Send</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Tab 2 — Renewal Pipeline ─────────────────────────────────────────────────
const RenewalPipelineTab: React.FC = () => {
  const navigate = useNavigate();
  const [renewTarget, setRenewTarget] = useState<Contract|null>(null);

  const renewals = [
    { ...CONTRACTS[2], stepActive:1, nextAction:'Review current pricing vs. market index', btnLabel:'Start Renewal →', special:null },
    { ...CONTRACTS[3], stepActive:2, nextAction:'Confirm fragrance portfolio pricing for H2 2026', btnLabel:'Continue Renewal →', special:null },
    { ...CONTRACTS[4], stepActive:1, nextAction:'Review supplier quality record before renewing', btnLabel:'Review Alternatives →',
      special:'! Consider NOT renewing — 2 quality rejections YTD. Recommend qualifying Evonik as primary source.' },
  ];

  const steps = ['Not Started','Terms Review','Negotiation','Signed'];

  return (
    <div>
      {renewTarget && <RenewalModal contract={renewTarget} onClose={() => setRenewTarget(null)} />}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#0D1B2A' }}>Contracts Due for Renewal</div>
        <div style={{ fontSize:13, color:'#64748B', marginTop:2 }}>Proactive renewal management — start renewal 90 days before expiry</div>
      </div>
      {renewals.map((r, idx) => (
        <div key={r.id} style={{ background:'#fff', borderRadius:10, padding:20, marginBottom:14, borderLeft:`4px solid ${daysColor(r.daysRemaining)}`, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#0D1B2A' }}>{r.title}</div>
              <div style={{ fontSize:13, color:'#64748B', marginTop:2 }}>{r.country} {r.supplier} · Expires {r.endDate}</div>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{r.value} · {r.type}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:32, fontWeight:800, color: daysColor(r.daysRemaining), lineHeight:1 }}>{r.daysRemaining}</div>
              <div style={{ fontSize:11, color:'#94A3B8' }}>days remaining</div>
            </div>
          </div>

          {/* Step progress */}
          <div style={{ display:'flex', gap:0, marginBottom:14 }}>
            {steps.map((step, si) => {
              const done = si < r.stepActive;
              const active = si === r.stepActive;
              return (
                <React.Fragment key={step}>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: done ? '#107E3E' : active ? '#0097A7' : '#E2E8F0',
                      color: done || active ? '#fff' : '#94A3B8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, marginBottom:4 }}>
                      {done ? '✓' : si + 1}
                    </div>
                    <div style={{ fontSize:10, color: active ? '#0097A7' : done ? '#107E3E' : '#94A3B8', textAlign:'center', fontWeight: active ? 700 : 400 }}>{step}</div>
                  </div>
                  {si < steps.length - 1 && (
                    <div style={{ flex:0.5, height:2, background: done ? '#107E3E' : '#E2E8F0', alignSelf:'center', marginBottom:18 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {r.special && (
            <div style={{ background:'#FEE2E2', borderLeft:'3px solid #BB0000', borderRadius:4, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#BB0000', fontWeight:500 }}>
              {r.special}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, color:'#64748B' }}><span style={{ fontWeight:600, color:'#0D1B2A' }}>Next: </span>{r.nextAction}</div>
            <button onClick={() => r.special ? navigate('/buyer/discovery') : setRenewTarget(r)}
              style={{ padding:'8px 16px', borderRadius:6, background: r.special ? '#BB0000' : '#0097A7', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {r.btnLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Tab 3 — Templates ────────────────────────────────────────────────────────
const TemplatesTab: React.FC = () => {
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const catColor: Record<string,string> = { General:'#0097A7', International:'#0097A7', Compliance:'#107E3E', Packaging:'#E9730C' };

  return (
    <div>
      {toast && <Toast msg={toast} />}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#0D1B2A' }}>Standard Contract Templates</div>
        <div style={{ fontSize:13, color:'#64748B', marginTop:2 }}>Pre-approved templates for common procurement scenarios</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {TEMPLATES.map(t => (
          <div key={t.name} style={{ background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0D1B2A', lineHeight:1.3, flex:1, marginRight:8 }}>{t.name}</div>
              <span style={{ background: (catColor[t.category]??'#94A3B8') + '18', color: catColor[t.category]??'#94A3B8', borderRadius:9999, padding:'2px 8px', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{t.category}</span>
            </div>
            <p style={{ fontSize:13, color:'#64748B', lineHeight:1.6, margin:'0 0 12px' }}>{t.description}</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {t.tags.map(tag => (
                <span key={tag} style={{ background:'#F0F4F8', color:'#64748B', borderRadius:9999, padding:'2px 8px', fontSize:11 }}>{tag}</span>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#94A3B8' }}>Updated {t.lastUpdated} · Used {t.usageCount}×</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => showToast('Opening template preview...')}
                  style={{ padding:'5px 10px', borderRadius:4, background:'#F0F4F8', color:'#64748B', border:'1px solid #E2E8F0', fontSize:12, cursor:'pointer' }}>Preview</button>
                <button onClick={() => showToast('Template loaded. New contract draft created — complete the supplier and commercial details.')}
                  style={{ padding:'5px 12px', borderRadius:4, background:'#0097A7', color:'#fff', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>Use Template →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tab 4 — Obligations Tracker ──────────────────────────────────────────────
const ObligationsTab: React.FC = () => {
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };
  const [statusFilter, setStatusFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');

  const filtered = OBLIGATIONS.filter(o =>
    (statusFilter === 'All' || o.status === statusFilter) &&
    (ownerFilter === 'All' || o.owner === ownerFilter || (ownerFilter === 'Supplier' && o.owner !== 'Procurement' && o.owner !== 'Quality Team' && o.owner !== 'Finance'))
  );

  const overdue = OBLIGATIONS.filter(o => o.status === 'Overdue');

  return (
    <div>
      {toast && <Toast msg={toast} />}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#0D1B2A' }}>Contract Obligations — All Active Contracts</div>
        <div style={{ fontSize:13, color:'#64748B', marginTop:2 }}>Track every commitment across your supplier contracts</div>
      </div>

      {/* Summary tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
        {[['Total Obligations','24','#0097A7'],['Compliant','18','#107E3E'],['Pending','4','#E9730C'],['Overdue','2','#BB0000']].map(([l,v,c]) => (
          <div key={l} style={{ background:'#fff', borderRadius:8, padding:'12px 16px', borderLeft:`4px solid ${c}`, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:22, fontWeight:700, color:c as string }}>{v}</div>
            <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ background:'rgba(0,151,167,0.07)', borderLeft:'4px solid #0097A7', borderRadius:6, padding:'12px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:13, color:'#0D1B2A', lineHeight:1.5 }}>
            <strong>2 obligations are overdue</strong> — BASF Panthenol B5: SDS update and REACH declaration both missed deadline March 31 2026. Immediate follow-up required.
          </div>
          <button onClick={() => showToast('Escalation sent to BASF account manager and Paragon procurement manager')}
            style={{ padding:'7px 14px', borderRadius:6, background:'#0097A7', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            Send Escalation
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ background:'#fff', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <span style={{ fontSize:11, color:'#64748B', marginRight:6, fontWeight:600 }}>Status:</span>
          {['All','Compliant','Pending','Overdue','Upcoming'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding:'4px 10px', borderRadius:9999, fontSize:12, cursor:'pointer', marginRight:4,
                background: statusFilter === s ? '#0097A7' : '#F0F4F8', color: statusFilter === s ? '#fff' : '#64748B',
                border:`1px solid ${statusFilter === s ? '#0097A7' : '#E2E8F0'}` }}>{s}</button>
          ))}
        </div>
        <div>
          <span style={{ fontSize:11, color:'#64748B', marginRight:6, fontWeight:600 }}>Owner:</span>
          {['All','Supplier','Procurement','Quality Team'].map(o => (
            <button key={o} onClick={() => setOwnerFilter(o)}
              style={{ padding:'4px 10px', borderRadius:9999, fontSize:12, cursor:'pointer', marginRight:4,
                background: ownerFilter === o ? '#0D1B2A' : '#F0F4F8', color: ownerFilter === o ? '#fff' : '#64748B',
                border:`1px solid ${ownerFilter === o ? '#0D1B2A' : '#E2E8F0'}` }}>{o}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:10, padding:0, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#F0F4F8', borderBottom:'2px solid #E2E8F0' }}>
            {['Contract #','Supplier','Obligation','Frequency','Next Due','Status','Owner','Priority','Actions'].map(h => (
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748B', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={i} style={{ borderBottom:'1px solid #E2E8F0', background: o.status === 'Overdue' ? '#FFF5F5' : 'transparent' }}>
                <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, color:'#0097A7', fontWeight:600 }}>{o.contract}</td>
                <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>{o.supplier}</td>
                <td style={{ padding:'10px 12px', fontWeight:500, maxWidth:220 }}>{o.obligation}</td>
                <td style={{ padding:'10px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{o.frequency}</td>
                <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, whiteSpace:'nowrap' }}>{o.nextDue}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ background:OBL_BG[o.status], color:OBL_COLOR[o.status], borderRadius:9999, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{o.status}</span>
                </td>
                <td style={{ padding:'10px 12px', color:'#64748B' }}>{o.owner}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ background:PRI_BG[o.priority], color:PRI_COLOR[o.priority], borderRadius:9999, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{o.priority}</span>
                </td>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => showToast(`Reminder sent to ${o.owner} for: ${o.obligation}`)}
                      style={{ padding:'4px 10px', borderRadius:4, background:'#F0F4F8', border:'1px solid #E2E8F0', fontSize:12, cursor:'pointer' }}>Remind</button>
                    <button onClick={() => showToast('Obligation marked as complete')}
                      style={{ padding:'4px 10px', borderRadius:4, background:'#DCFCE7', color:'#107E3E', border:'1px solid #86EFAC', fontSize:12, cursor:'pointer' }}>✓ Done</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ContractManagement: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [showNewContract, setShowNewContract] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNewContract(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const tabs = ['Active Contracts','Renewal Pipeline','Contract Templates','Obligations Tracker'];
  const kpis = [
    { label:'Active Contracts',      value:'8',         color:'#0097A7' },
    { label:'Expiring in 90 Days',   value:'3',         color:'#E9730C' },
    { label:'Pending Signature',     value:'2',         color:'#0097A7' },
    { label:'Total Contract Value',  value:'Rp 12.4M',  color:'#64748B' },
  ];

  return (
    <div style={{ padding:'24px 28px', background:'#F0F4F8', minHeight:'100vh' }}>
      {showNewContract && <NewContractPanel onClose={() => setShowNewContract(false)} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:'#0D1B2A' }}>Contract Management</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#64748B' }}>From RFQ award to contract lifecycle — renewals, obligations, and compliance</p>
        </div>
        <button onClick={() => setShowNewContract(true)}
          style={{ padding:'9px 18px', borderRadius:8, background:'#0097A7', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          ＋ New Contract
        </button>
      </div>

      {/* KPI tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', borderLeft:`4px solid ${k.color}`, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:28, fontWeight:700, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alert bars */}
      <div style={{ background:'#FEF3C7', borderLeft:'4px solid #E9730C', borderRadius:6, padding:'10px 16px', marginBottom:10, fontSize:13, color:'#E9730C', fontWeight:500 }}>
        ! 3 contracts expiring within 90 days — renewal process should begin now
      </div>
      <div style={{ background:'#EFF6FF', borderLeft:'4px solid #0097A7', borderRadius:6, padding:'10px 16px', marginBottom:20, fontSize:13, color:'#0D1B2A', fontWeight:500 }}>
        ↗ 2 contracts awaiting supplier countersignature
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'2px solid #E2E8F0', marginBottom:20 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13,
            fontWeight: tab === i ? 600 : 400, color: tab === i ? '#0097A7' : '#64748B',
            background:'none', borderBottom:`2px solid ${tab === i ? '#0097A7' : 'transparent'}`, marginBottom:-2,
          }}>{t}</button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 0 && <ActiveContractsTab />}
      {tab === 1 && <RenewalPipelineTab />}
      {tab === 2 && <TemplatesTab />}
      {tab === 3 && <ObligationsTab />}
    </div>
  );
};

export default ContractManagement;
