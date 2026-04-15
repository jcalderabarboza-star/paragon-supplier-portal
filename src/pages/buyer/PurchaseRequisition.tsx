import React, { useState } from 'react';
import { ClipboardList, Plus, CheckCircle, Clock, AlertTriangle, ArrowRight, X } from 'lucide-react';

const NAVY = '#0D1B2A'; const TEAL = '#0097A7'; const MID = '#354A5F';
const MUTED = '#64748B'; const BORDER = '#E2E8F0'; const SUCCESS = '#107E3E';
const WARNING = '#E9730C'; const ERROR = '#BB0000';

type PRStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Sourcing Event' | 'PO Created' | 'Rejected';

interface PR {
  id: string; prNumber: string; material: string; category: string;
  qty: string; uom: string; requiredDate: string; estimatedValue: string;
  requestor: string; costCenter: string; status: PRStatus; createdDate: string;
  approver: string; sourceOfSupply: string; linkedDoc: string;
  priority: 'High' | 'Medium' | 'Low'; justification: string;
}

const MOCK_PRS: PR[] = [
  { id:'pr-001', prNumber:'PR-2026-00341', material:'Niacinamide B3 USP Grade', category:'Active Ingredients', qty:'500', uom:'KG', requiredDate:'2026-05-15', estimatedValue:'Rp 79jT', requestor:'R&D Formulation', costCenter:'CC-RD-001', status:'PO Created', createdDate:'2026-04-01', approver:'Procurement Head', sourceOfSupply:'PIR exists', linkedDoc:'PO-2026-00108', priority:'High', justification:'Quarterly replenishment Wardah Q2.' },
  { id:'pr-002', prNumber:'PR-2026-00342', material:'PET Bottle 100ml Airless Pump', category:'Packaging Primary', qty:'50000', uom:'PCS', requiredDate:'2026-05-20', estimatedValue:'Rp 105jT', requestor:'Packaging Engineering', costCenter:'CC-PKG-002', status:'Approved', createdDate:'2026-04-03', approver:'Procurement Head', sourceOfSupply:'PIR exists', linkedDoc:'', priority:'High', justification:'Make Over launch packaging.' },
  { id:'pr-003', prNumber:'PR-2026-00343', material:'Givaudan Floral Accord FG-2847', category:'Fragrance', qty:'100', uom:'KG', requiredDate:'2026-06-01', estimatedValue:'Rp 210jT', requestor:'Perfumer Team', costCenter:'CC-RD-003', status:'Sourcing Event', createdDate:'2026-04-05', approver:'VP Procurement', sourceOfSupply:'No source', linkedDoc:'RFQ-2026-004', priority:'High', justification:'New fragrance Scarlett premium.' },
  { id:'pr-004', prNumber:'PR-2026-00344', material:'Halal Glycerin 99.5%', category:'Halal Emulsifier', qty:'2000', uom:'KG', requiredDate:'2026-05-30', estimatedValue:'Rp 43jT', requestor:'Production Planning', costCenter:'CC-MFG-001', status:'Pending Approval', createdDate:'2026-04-08', approver:'Section Head', sourceOfSupply:'PIR exists', linkedDoc:'', priority:'Medium', justification:'Safety stock below minimum.' },
  { id:'pr-005', prNumber:'PR-2026-00345', material:'Folding Carton 150gsm Wardah', category:'Packaging Secondary', qty:'200000', uom:'PCS', requiredDate:'2026-06-15', estimatedValue:'Rp 84jT', requestor:'Supply Chain Planning', costCenter:'CC-SC-001', status:'Draft', createdDate:'2026-04-10', approver:'—', sourceOfSupply:'PIR exists', linkedDoc:'', priority:'Low', justification:'Standard quarterly order.' },
  { id:'pr-006', prNumber:'PR-2026-00340', material:'Centella Asiatica Extract 10:1', category:'Natural Botanical', qty:'300', uom:'KG', requiredDate:'2026-04-30', estimatedValue:'Rp 67jT', requestor:'R&D Formulation', costCenter:'CC-RD-001', status:'PO Created', createdDate:'2026-03-20', approver:'Procurement Head', sourceOfSupply:'PIR exists', linkedDoc:'PO-2026-00106', priority:'Medium', justification:'Emina Cica Care — PT Ecogreen.' },
];

const STATUS_CFG: Record<PRStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  'Draft':            { bg: '#F1F5F9', color: MUTED,    icon: <Clock size={12} /> },
  'Pending Approval': { bg: '#FEF3C7', color: WARNING,  icon: <Clock size={12} /> },
  'Approved':         { bg: '#DBEAFE', color: '#1D4ED8', icon: <CheckCircle size={12} /> },
  'Sourcing Event':   { bg: '#EDE9FE', color: '#6D28D9', icon: <ArrowRight size={12} /> },
  'PO Created':       { bg: '#DCFCE7', color: SUCCESS,  icon: <CheckCircle size={12} /> },
  'Rejected':         { bg: '#FEE2E2', color: ERROR,    icon: <AlertTriangle size={12} /> },
};

function Pill({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: React.ReactNode }) {
  return <span style={{ background:bg, color, borderRadius:9999, padding:'2px 8px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>{icon}{label}</span>;
}

function fmtDate(s: string) {
  if (!s || s === '—') return '—';
  return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

const NewPRModal: React.FC<{ onClose: () => void; onSubmit: (n: string) => void }> = ({ onClose, onSubmit }) => {
  const [material, setMaterial] = useState('');
  const [qty, setQty] = useState('');
  const [uom, setUom] = useState('KG');
  const [date, setDate] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [justification, setJustification] = useState('');
  const canSubmit = !!(material && qty && date && costCenter);
  const inp: React.CSSProperties = { width:'100%', padding:'8px 10px', border:`1px solid ${BORDER}`, borderRadius:6, fontSize:13, fontFamily:'inherit', color:NAVY, boxSizing:'border-box' };
  const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:MID, display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'white', borderRadius:10, width:540, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background:NAVY, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'10px 10px 0 0' }}>
          <div>
            <div style={{ color:'white', fontWeight:700, fontSize:14 }}>New Purchase Requisition</div>
            <div style={{ color:'#8DA4BC', fontSize:11, marginTop:2 }}>PR will be routed for approval before sourcing begins</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8DA4BC', cursor:'pointer', display:'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={lbl}>Material / Service *</label><input style={inp} placeholder="e.g. Niacinamide B3 USP Grade" value={material} onChange={e => setMaterial(e.target.value)} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:10 }}>
            <div><label style={lbl}>Quantity *</label><input type="number" style={inp} placeholder="0" value={qty} onChange={e => setQty(e.target.value)} /></div>
            <div><label style={lbl}>UoM</label>
              <select style={{ ...inp, background:'white' }} value={uom} onChange={e => setUom(e.target.value)}>
                {['KG','L','PCS','MT','BOX'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={lbl}>Required Date *</label><input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={lbl}>Cost Center *</label>
              <select style={{ ...inp, background:'white' }} value={costCenter} onChange={e => setCostCenter(e.target.value)}>
                <option value="">Select...</option>
                {['CC-RD-001 — R&D','CC-PKG-002 — Packaging','CC-MFG-001 — Manufacturing','CC-SC-001 — Supply Chain','CC-RD-003 — Perfumer'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>Priority</label>
            <select style={{ ...inp, background:'white' }} value={priority} onChange={e => setPriority(e.target.value)}>
              {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Justification</label>
            <textarea style={{ ...inp, minHeight:72, resize:'vertical' }} placeholder="Business reason..." value={justification} onChange={e => setJustification(e.target.value)} />
          </div>
          <div style={{ background:'#E0F7FA', border:'1px solid #0097A744', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#006064' }}>
            After submission this PR routes to Section Head. If PIR or Outline Agreement exists a PO is created directly. If not a Sourcing Event is initiated.
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', background:'#F8FAFC', borderRadius:'0 0 10px 10px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:`1px solid ${BORDER}`, borderRadius:6, background:'white', color:MID, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={() => canSubmit && onSubmit(`PR-2026-00${Math.floor(346+Math.random()*10)}`)} disabled={!canSubmit}
            style={{ padding:'8px 20px', border:'none', borderRadius:6, background:canSubmit ? TEAL : '#CBD5E1', color:'white', fontSize:12, fontWeight:700, cursor:canSubmit ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
};

const SourceDecisionPanel: React.FC<{ pr: PR; onClose: () => void; onToast: (m: string) => void }> = ({ pr, onClose, onToast }) => {
  const hasPIR = pr.sourceOfSupply === 'PIR exists';
  return (
    <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, padding:20, marginTop:8 }}>
      <div style={{ fontSize:14, fontWeight:700, color:NAVY, marginBottom:4 }}>Source of Supply Check — {pr.prNumber}</div>
      <div style={{ fontSize:12, color:MUTED, marginBottom:16 }}>S/4HANA checks for an existing PIR or Outline Agreement for this material.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <div style={{ border:`2px solid ${hasPIR ? SUCCESS : BORDER}`, borderRadius:8, padding:16, background:hasPIR ? '#F0FDF4' : '#F8FAFC' }}>
          <div style={{ fontWeight:700, fontSize:13, color:hasPIR ? SUCCESS : MUTED, marginBottom:6 }}>{hasPIR ? '✓ Source Found' : '✗ No Source'}</div>
          <div style={{ fontSize:12, color:MID, marginBottom:12 }}>{hasPIR ? `PIR exists for ${pr.material}.` : `No PIR found for ${pr.material}. Sourcing Event required.`}</div>
          <button onClick={() => { onToast(hasPIR ? `PO creation initiated for ${pr.prNumber}` : `Sourcing Event initiated for ${pr.prNumber}`); onClose(); }}
            style={{ width:'100%', padding:'8px', border:'none', borderRadius:6, background:hasPIR ? TEAL : '#6D28D9', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {hasPIR ? '→ Create PO Directly' : '→ Create Sourcing Event'}
          </button>
        </div>
        <div style={{ border:`1px solid ${BORDER}`, borderRadius:8, padding:16, background:'#F8FAFC' }}>
          <div style={{ fontSize:12, fontWeight:600, color:MID, marginBottom:8 }}>PR Details</div>
          {[['Material',pr.material],['Quantity',`${pr.qty} ${pr.uom}`],['Required',fmtDate(pr.requiredDate)],['Est. Value',pr.estimatedValue],['Cost Center',pr.costCenter]].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:`1px solid ${BORDER}`, fontSize:11 }}>
              <span style={{ color:MUTED }}>{k}</span><span style={{ fontWeight:600, color:NAVY }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onClose} style={{ background:'none', border:'none', color:MUTED, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
    </div>
  );
};

const PurchaseRequisition: React.FC = () => {
  const [prs] = useState<PR[]>(MOCK_PRS);
  const [filterStatus, setFilterStatus] = useState<PRStatus | 'All'>('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };
  const handleNewPR = (prNum: string) => { setShowModal(false); showToast(`${prNum} submitted — routed to Section Head for approval`); };
  const filtered = filterStatus === 'All' ? prs : prs.filter(p => p.status === filterStatus);
  const counts = {
    draft: prs.filter(p => p.status === 'Draft').length,
    pending: prs.filter(p => p.status === 'Pending Approval').length,
    approved: prs.filter(p => p.status === 'Approved').length,
    sourcing: prs.filter(p => p.status === 'Sourcing Event').length,
    po: prs.filter(p => p.status === 'PO Created').length,
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {toast && <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'12px 20px', borderRadius:8, zIndex:600, fontSize:13, borderLeft:`3px solid ${TEAL}`, maxWidth:380 }}>{toast}</div>}
      {showModal && <NewPRModal onClose={() => setShowModal(false)} onSubmit={handleNewPR} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:NAVY, marginBottom:4 }}>Purchase Requisitions (PR)</div>
          <div style={{ fontSize:13, color:MUTED }}>Starting point of procurement · PR → Approval → Source check → PO or Sourcing Event</div>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background:TEAL, color:'white', border:'none', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <Plus size={14} /> New PR
        </button>
      </div>
      <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, padding:'14px 20px' }}>
        <div style={{ fontSize:11, fontWeight:600, color:MUTED, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>Procurement Flow</div>
        <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
          {([{label:'Create PR',sub:'Requestor',color:TEAL},{label:'Approval',sub:'Section Head / VP',color:MID},{label:'Source Check',sub:'PIR or OA?',color:'#6D28D9'},{label:'Create PO',sub:'Source found',color:SUCCESS},{label:'Sourcing Event',sub:'No source',color:WARNING}] as const).map((step,i) => (
            <React.Fragment key={step.label}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:90 }}>
                <div style={{ background:step.color, color:'white', borderRadius:6, padding:'6px 10px', fontSize:11, fontWeight:700, textAlign:'center' as const, minWidth:80 }}>{step.label}</div>
                <div style={{ fontSize:10, color:MUTED, marginTop:4, textAlign:'center' as const }}>{step.sub}</div>
              </div>
              {i < 4 && <div style={{ fontSize:16, color:MUTED, paddingBottom:14 }}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        {([{label:'Draft',value:counts.draft,color:MUTED,bg:'#F1F5F9',status:'Draft'},{label:'Pending Approval',value:counts.pending,color:WARNING,bg:'#FEF3C7',status:'Pending Approval'},{label:'Approved',value:counts.approved,color:'#1D4ED8',bg:'#DBEAFE',status:'Approved'},{label:'Sourcing Event',value:counts.sourcing,color:'#6D28D9',bg:'#EDE9FE',status:'Sourcing Event'},{label:'PO Created',value:counts.po,color:SUCCESS,bg:'#DCFCE7',status:'PO Created'}] as const).map(({label,value,color,bg,status}) => (
          <div key={label} onClick={() => setFilterStatus(filterStatus===status ? 'All' : status as PRStatus)}
            style={{ background:filterStatus===status ? bg : 'white', border:`1px solid ${filterStatus===status ? color : BORDER}`, borderLeft:`4px solid ${color}`, borderRadius:8, padding:'12px 14px', cursor:'pointer' }}>
            <div style={{ fontSize:10, fontWeight:600, color:MUTED, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:5 }}>{label}</div>
            <div style={{ fontSize:24, fontWeight:700, color, lineHeight:1 }}>{value}</div>
          </div>
        ))}
      </div>
      {selectedPR && selectedPR.status==='Approved' && <SourceDecisionPanel pr={selectedPR} onClose={() => setSelectedPR(null)} onToast={showToast} />}
      <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, fontWeight:600, color:NAVY }}>Purchase Requisitions <span style={{ color:MUTED, fontWeight:400 }}>({filtered.length})</span></span>
          <div style={{ display:'flex', background:'#F1F5F9', borderRadius:6, padding:2, gap:1 }}>
            {(['All','Draft','Pending Approval','Approved','Sourcing Event','PO Created'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding:'4px 10px', border:'none', borderRadius:4, background:filterStatus===s ? 'white' : 'transparent', color:filterStatus===s ? NAVY : MUTED, fontWeight:filterStatus===s ? 700 : 500, fontSize:11, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', boxShadow:filterStatus===s ? '0 1px 3px rgba(0,0,0,0.1)' : undefined }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['PR Number','Material','Category','Qty','Required Date','Est. Value','Requestor','Status','Source','Linked Doc','Action'].map(h => (
                <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:600, fontSize:11, color:MUTED, borderBottom:`1px solid ${BORDER}`, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((pr,idx) => {
              const sCfg = STATUS_CFG[pr.status];
              return (
                <tr key={pr.id} style={{ background:idx%2===0 ? 'white' : '#F8FAFC', borderTop:`1px solid ${BORDER}` }}>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:TEAL, fontSize:12 }}>{pr.prNumber}</td>
                  <td style={{ padding:'10px 12px', fontWeight:600, color:NAVY }}><div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>{pr.material}</div></td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:MID }}>{pr.category}</td>
                  <td style={{ padding:'10px 12px', color:NAVY, whiteSpace:'nowrap' }}>{pr.qty} {pr.uom}</td>
                  <td style={{ padding:'10px 12px', color:MUTED, fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(pr.requiredDate)}</td>
                  <td style={{ padding:'10px 12px', fontWeight:600, color:NAVY }}>{pr.estimatedValue}</td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:MID }}>{pr.requestor}</td>
                  <td style={{ padding:'10px 12px' }}><Pill label={pr.status} bg={sCfg.bg} color={sCfg.color} icon={sCfg.icon} /></td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, color:pr.sourceOfSupply==='PIR exists' ? SUCCESS : WARNING, fontWeight:600 }}>{pr.sourceOfSupply==='PIR exists' ? '✓ PIR' : '⚠ None'}</span></td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:pr.linkedDoc ? TEAL : MUTED }}>{pr.linkedDoc||'—'}</td>
                  <td style={{ padding:'10px 12px' }}>
                    {pr.status==='Approved' && <button onClick={() => setSelectedPR(selectedPR?.id===pr.id ? null : pr)} style={{ background:TEAL, color:'white', border:'none', borderRadius:5, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Check Source →</button>}
                    {pr.status==='Draft' && <button onClick={() => showToast(`${pr.prNumber} submitted for approval`)} style={{ background:'#F1F5F9', color:MID, border:`1px solid ${BORDER}`, borderRadius:5, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Submit</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ background:'#E0F7FA', border:'1px solid #0097A744', borderRadius:8, padding:'12px 16px', fontSize:12, color:'#006064', display:'flex', alignItems:'flex-start', gap:8 }}>
        <ClipboardList size={14} style={{ flexShrink:0, marginTop:1 }} />
        <span><strong>S/4HANA Integration (Phase 2):</strong> PRs will be created in S/4HANA MM. Source check queries live PIRs and Outline Agreements. Approved PRs with source auto-trigger PO via ME21N.</span>
      </div>
    </div>
  );
};

export default PurchaseRequisition;
