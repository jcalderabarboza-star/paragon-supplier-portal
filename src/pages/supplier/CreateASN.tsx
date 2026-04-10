import React, { useState } from 'react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus } from '../../types/purchaseOrder.types';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const MID = '#354A5F';
const SUPPLIER_ID = 'sup-007';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

const MY_POS = mockPurchaseOrders.filter(po => po.supplierId === SUPPLIER_ID);
const CONFIRMED_POS = MY_POS.filter(po => po.status === POStatus.CONFIRMED);

const ASN_MOCK: Record<string, { asnNumber:string; status:string; eta:string }> = {
  'po-007': { asnNumber:'ASN-2026-001', status:'In Transit', eta:'2026-04-08' },
};

function Pill({ label, bg, color }: { label:string; bg:string; color:string }) {
  return <span style={{ background:bg, color, borderRadius:'9999px', padding:'2px 9px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>;
}

function Toast({ msg }: { msg:string }) {
  return <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'0.75rem 1.25rem', borderRadius:'6px', zIndex:600, boxShadow:'0 4px 16px rgba(0,0,0,0.25)', fontSize:'13px', maxWidth:'420px', lineHeight:1.5 }}>{msg}</div>;
}

const TABS = ['My Shipments','Create ASN','Dock Appointments'] as const;
type Tab = typeof TABS[number];

function TabBar({ active, onChange }: { active:Tab; onChange:(t:Tab)=>void }) {
  return (
    <div style={{ display:'flex', borderBottom:`2px solid #E2E8F0`, marginBottom:'20px', gap:'4px' }}>
      {TABS.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{ padding:'10px 20px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:active===t?700:500, color:active===t?TEAL:'#64748B', borderBottom:active===t?`2px solid ${TEAL}`:'2px solid transparent', marginBottom:'-2px', transition:'all 0.15s' }}>{t}</button>
      ))}
    </div>
  );
}

// ─── Tab 1: My Shipments ─────────────────────────────────────────────────────

function MyShipments({ onCreateASN }: { onCreateASN: () => void }) {
  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{children}</th>
  );
  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
        <thead><tr style={{ background:NAVY }}><TH>PO Number</TH><TH>Material</TH><TH>Qty</TH><TH>PO Status</TH><TH>ASN Status</TH><TH>ETA</TH><TH>Actions</TH></tr></thead>
        <tbody>
          {MY_POS.map((po, idx) => {
            const asn = ASN_MOCK[po.id];
            const mat = po.lineItems[0];
            return (
              <tr key={po.id} style={{ background:idx%2===0?'white':'#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
                <td style={{ padding:'12px', fontFamily:'monospace', fontWeight:700, color:TEAL }}>{po.poNumber}</td>
                <td style={{ padding:'12px', color:NAVY, maxWidth:200 }}>
                  <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{mat?.description ?? '—'}</div>
                </td>
                <td style={{ padding:'12px', color:'#64748B', whiteSpace:'nowrap' }}>{mat ? `${mat.quantity.toLocaleString()} ${mat.uom}` : '—'}</td>
                <td style={{ padding:'12px' }}>
                  <Pill label={po.status} bg={po.status===POStatus.CONFIRMED?'#DBEAFE':'#FEF3C7'} color={po.status===POStatus.CONFIRMED?'#0D1B2A':'#E9730C'} />
                </td>
                <td style={{ padding:'12px' }}>
                  {asn ? <Pill label={`${asn.asnNumber} — ${asn.status}`} bg='#DBEAFE' color='#0D1B2A' />
                       : <span style={{ color:'#94A3B8', fontSize:'12px' }}>No ASN submitted</span>}
                </td>
                <td style={{ padding:'12px', color:'#64748B', whiteSpace:'nowrap' }}>{asn ? fmtDate(asn.eta) : '—'}</td>
                <td style={{ padding:'12px' }}>
                  {!asn && po.status === POStatus.CONFIRMED && (
                    <button onClick={onCreateASN} style={{ padding:'6px 14px', border:'none', borderRadius:6, background:TEAL, color:'white', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>+ Create ASN</button>
                  )}
                  {asn && (
                    <span style={{ fontSize:'12px', color:'#107E3E', fontWeight:600 }}>✓ ASN Submitted</span>
                  )}
                  {!asn && po.status !== POStatus.CONFIRMED && (
                    <span style={{ fontSize:'12px', color:'#94A3B8' }}>Awaiting confirmation</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab 2: Create ASN Wizard ─────────────────────────────────────────────────

const STEP_LABELS = ['Select PO','Shipment Details','Confirm & Submit'];

function StepBar({ step }: { step:number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:24 }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1; const done = num < step; const active = num === step;
        const bg = done ? MID : active ? TEAL : 'white';
        const borderColor = done ? MID : active ? TEAL : '#CBD5E1';
        const textColor = active ? NAVY : done ? '#64748B' : '#94A3B8';
        return (
          <React.Fragment key={num}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:bg, border:`2px solid ${borderColor}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:done||active?'white':'#94A3B8', flexShrink:0 }}>
                {done ? '✓' : num}
              </div>
              <span style={{ fontSize:'10px', color:textColor, whiteSpace:'nowrap', fontWeight:active?700:400 }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div style={{ flex:1, height:2, background:done?MID:'#E2E8F0', margin:'0 6px', marginBottom:20 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface ASNForm {
  poId: string; carrier: string; trackingNumber: string;
  shipDate: string; eta: string; packages: string; weightKg: string;
  packingList: string; notes: string; confirmed: boolean;
  batchNumber: string; lotNumber: string;
}

const DEFAULT_FORM: ASNForm = {
  poId:'', carrier:'JNE', trackingNumber:'', shipDate:'2026-04-07',
  eta:'', packages:'', weightKg:'', packingList:'', notes:'', confirmed:false,
  batchNumber:'', lotNumber:'',
};

const FF = ({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#475569', marginBottom:5 }}>
      {label}{required && <span style={{ color:'#BB0000' }}> *</span>}
    </label>
    {children}
  </div>
);

const INP: React.CSSProperties = { width:'100%', padding:'8px 10px', border:'1px solid #CBD5E1', borderRadius:6, fontSize:'13px', fontFamily:'inherit', color:NAVY, background:'white', boxSizing:'border-box' };

function CreateASNWizard({ onToast }: { onToast:(m:string)=>void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ASNForm>(DEFAULT_FORM);
  const update = (patch: Partial<ASNForm>) => setForm(f => ({ ...f, ...patch }));

  const selectedPO = CONFIRMED_POS.find(p => p.id === form.poId);

  const renderStep1 = () => (
    <div>
      <div style={{ fontWeight:600, color:NAVY, marginBottom:14, fontSize:'13px' }}>
        Select a confirmed PO to create an ASN for:
      </div>
      {CONFIRMED_POS.length === 0 ? (
        <div style={{ padding:'32px', textAlign:'center', color:'#94A3B8', background:'#F8FAFC', borderRadius:8, border:'1px solid #E2E8F0' }}>
          No confirmed POs pending ASN submission.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {CONFIRMED_POS.map(po => {
            const mat = po.lineItems[0];
            const selected = form.poId === po.id;
            return (
              <div key={po.id} onClick={() => update({ poId: po.id })} style={{ border:selected?`2px solid ${TEAL}`:'1px solid #E2E8F0', borderRadius:8, padding:'14px 16px', cursor:'pointer', background:selected?'#F0FDFA':'white' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'14px', color:NAVY, fontFamily:'monospace' }}>{po.poNumber}</div>
                    <div style={{ fontSize:'13px', color:MID, marginTop:4 }}>{mat?.description ?? '—'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'12px', color:'#64748B' }}>Qty: {mat ? `${mat.quantity.toLocaleString()} ${mat.uom}` : '—'}</div>
                    <div style={{ fontSize:'12px', color:'#64748B' }}>Delivery: {fmtDate(po.requestedDeliveryDate)}</div>
                  </div>
                </div>
                {selected && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #CCFBF1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', fontSize:'12px', color:'#475569' }}>
                    <div><strong>Supplier:</strong> {po.supplierName}</div>
                    <div><strong>Requested Delivery:</strong> {fmtDate(po.requestedDeliveryDate)}</div>
                    <div><strong>Delivery Address:</strong> NDC Jatake 6, Tangerang</div>
                    <div><strong>Channel:</strong> 📱 WhatsApp</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
      <FF label="Carrier" required>
        <select style={{ ...INP, background:'white' }} value={form.carrier} onChange={e => update({ carrier: e.target.value })}>
          {['JNE','SiCepat','J&T','Wahana','DHL','FedEx','Other'].map(c => <option key={c}>{c}</option>)}
        </select>
      </FF>
      <FF label="Tracking Number" required>
        <input style={INP} placeholder="e.g. JNE2026001234" value={form.trackingNumber} onChange={e => update({ trackingNumber: e.target.value })} />
      </FF>
      <FF label="Ship Date" required>
        <input style={INP} type="date" value={form.shipDate} onChange={e => update({ shipDate: e.target.value })} />
      </FF>
      <FF label="Estimated Arrival Date" required>
        <input style={INP} type="date" value={form.eta} onChange={e => update({ eta: e.target.value })} />
      </FF>
      <FF label="Number of Packages">
        <input style={INP} type="number" min={1} placeholder="0" value={form.packages} onChange={e => update({ packages: e.target.value })} />
      </FF>
      <FF label="Total Weight (KG)">
        <input style={INP} type="number" min={0} placeholder="0.00" value={form.weightKg} onChange={e => update({ weightKg: e.target.value })} />
      </FF>
      <FF label="Batch Number" required>
        <input style={INP} placeholder="e.g. PKG-2026-441" value={form.batchNumber} onChange={e => update({ batchNumber: e.target.value })} />
      </FF>
      <FF label="Lot Number">
        <input style={INP} placeholder="e.g. LOT-2026-001" value={form.lotNumber} onChange={e => update({ lotNumber: e.target.value })} />
      </FF>
      <div style={{ gridColumn:'1/-1' }}>
        <FF label="Packing List">
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <input type="file" style={{ display:'none' }} onChange={e => update({ packingList: e.target.files?.[0]?.name ?? '' })} />
            <span style={{ padding:'7px 14px', border:'1px solid #CBD5E1', borderRadius:6, fontSize:'13px', color:TEAL, fontWeight:600, background:'white', cursor:'pointer' }}>📎 Choose File</span>
            <span style={{ fontSize:'12px', color: form.packingList ? '#107E3E' : '#94A3B8' }}>{form.packingList || 'No file chosen'}</span>
          </label>
        </FF>
      </div>
      <div style={{ gridColumn:'1/-1' }}>
        <FF label="Special Handling Notes">
          <textarea style={{ ...INP, height:72, resize:'vertical' } as React.CSSProperties} placeholder="Temperature controlled, fragile, hazmat info..." value={form.notes} onChange={e => update({ notes: e.target.value })} />
        </FF>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const po = selectedPO;
    const mat = po?.lineItems[0];
    return (
      <div>
        <div style={{ fontWeight:700, fontSize:'14px', color:NAVY, marginBottom:14 }}>Review ASN Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px', marginBottom:20 }}>
          {[
            ['PO Number', po?.poNumber ?? '—'],
            ['Material', mat?.description ?? '—'],
            ['Quantity', mat ? `${mat.quantity.toLocaleString()} ${mat.uom}` : '—'],
            ['Carrier', form.carrier],
            ['Tracking Number', form.trackingNumber || '—'],
            ['Ship Date', fmtDate(form.shipDate)],
            ['ETA', form.eta ? fmtDate(form.eta) : '—'],
            ['Packages', form.packages || '—'],
            ['Batch Number', form.batchNumber || '—'],
            ['Lot Number', form.lotNumber || '—'],
          ].map(([k,v]) => (
            <div key={k} style={{ padding:'10px 14px', background:'#F8FAFC', borderRadius:6, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:'11px', color:'#64748B', fontWeight:600 }}>{k}</div>
              <div style={{ fontSize:'13px', color:NAVY, fontWeight:600, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>

        <label style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:'13px', color:NAVY, cursor:'pointer', marginBottom:20, padding:'12px 14px', background:'#F0FDFA', borderRadius:6, border:`1px solid ${TEAL}44` }}>
          <input type="checkbox" checked={form.confirmed} onChange={e => update({ confirmed: e.target.checked })} style={{ marginTop:2 }} />
          I confirm all shipment details are accurate and the goods match the purchase order specifications.
        </label>

        <button
          disabled={!form.confirmed}
          onClick={() => {
            onToast('ASN-2026-007 submitted successfully! Paragon NDC Jatake 6 team has been notified. Dock scheduling confirmation will arrive via WhatsApp within 2 hours.');
            setStep(1);
            setForm(DEFAULT_FORM);
          }}
          style={{ width:'100%', padding:'12px', border:'none', borderRadius:6, background:form.confirmed?NAVY:'#CBD5E1', color:'white', fontSize:'14px', fontWeight:700, cursor:form.confirmed?'pointer':'not-allowed', fontFamily:'inherit', transition:'background 0.15s' }}
        >
          Submit ASN
        </button>
      </div>
    );
  };

  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, padding:'24px' }}>
      <StepBar step={step} />
      <div style={{ maxHeight:'calc(100vh - 360px)', overflowY:'auto', paddingRight:4 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, paddingTop:16, borderTop:'1px solid #E2E8F0' }}>
        <button onClick={() => setStep(s => Math.max(1,s-1))} disabled={step===1}
          style={{ padding:'9px 20px', border:'1px solid #CBD5E1', borderRadius:6, background:'white', color:step===1?'#CBD5E1':NAVY, fontFamily:'inherit', fontSize:'13px', fontWeight:600, cursor:step===1?'not-allowed':'pointer' }}>
          ← Back
        </button>
        {step < 3 && (
          <button onClick={() => { if (step===1 && !form.poId) return; setStep(s => s+1); }}
            style={{ padding:'9px 20px', border:'none', borderRadius:6, background:step===1&&!form.poId?'#CBD5E1':TEAL, color:'white', fontFamily:'inherit', fontSize:'13px', fontWeight:700, cursor:step===1&&!form.poId?'not-allowed':'pointer' }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Dock Appointments ─────────────────────────────────────────────────

function DockAppointments() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontWeight:700, fontSize:'14px', color:NAVY }}>Your Scheduled Dock Appointments</div>

      {/* Appointment card */}
      <div style={{ background:'white', border:`2px solid #107E3E`, borderRadius:8, padding:'18px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'15px', color:NAVY }}>ASN-2026-001</div>
            <div style={{ fontSize:'12px', color:'#64748B', marginTop:2 }}>PO-2025-00107 · PET Bottle 100ml Airless Pump</div>
          </div>
          <Pill label="Confirmed" bg='#DCFCE7' color='#107E3E' />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', fontSize:'13px' }}>
          {[
            ['📅 Date','Monday, 7 April 2026'],
            ['🕙 Time','10:00 WIB'],
            ['🏭 Dock','Dock 3'],
            ['📍 Location','NDC Jatake 6, Tangerang Selatan'],
          ].map(([icon_label, val]) => (
            <div key={icon_label} style={{ padding:'8px 12px', background:'#F8FAFC', borderRadius:6 }}>
              <div style={{ fontWeight:600, color:NAVY }}>{icon_label}</div>
              <div style={{ color:'#475569', marginTop:2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Instruction note */}
      <div style={{ background:'#FEF9C3', border:'1px solid #FDE047', borderRadius:8, padding:'12px 16px', fontSize:'12px', color:'#E9730C', display:'flex', alignItems:'flex-start', gap:10 }}>
        <span style={{ fontSize:'16px', flexShrink:0 }}>⏰</span>
        <span>Please arrive <strong>15 minutes before your slot</strong>. Bring a printed copy of your ASN and packing list. Contact the receiving team at <strong>+62-21-5595-xxxx</strong> if you anticipate delays.</span>
      </div>

      <div style={{ background:'#E0F7FA', border:'1px solid #0097A744', borderRadius:8, padding:'12px 16px', fontSize:'12px', color:'#006064', display:'flex', alignItems:'flex-start', gap:10 }}>
        <span style={{ fontSize:'16px', flexShrink:0 }}>💡</span>
        <span>Dock appointment requests for new ASNs are processed by the Paragon Inbound Team. Confirmation is sent via <strong>WhatsApp</strong> within 2 hours of ASN submission.</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CreateASN: React.FC = () => {
  const [tab, setTab] = useState<Tab>('My Shipments');
  const [toast, setToast] = useState<string|null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4500); };

  const handleCreateASN = () => setTab('Create ASN');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      {toast && <Toast msg={toast} />}

      <div>
        <div style={{ fontSize:'20px', fontWeight:600, color:NAVY, marginBottom:4 }}>My Shipments &amp; ASN</div>
        <div style={{ fontSize:'13px', color:'#64748B' }}>Track your shipments and submit Advance Ship Notices to Paragon</div>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'My Shipments' && <MyShipments onCreateASN={handleCreateASN} />}
      {tab === 'Create ASN' && <CreateASNWizard onToast={showToast} />}
      {tab === 'Dock Appointments' && <DockAppointments />}
    </div>
  );
};

export default CreateASN;
