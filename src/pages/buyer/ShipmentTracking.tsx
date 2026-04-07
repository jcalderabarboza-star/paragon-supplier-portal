import React, { useState, useMemo } from 'react';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const MID = '#354A5F';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShipStatus = 'In Transit' | 'Arriving Today' | 'Overdue' | 'Delivered' | 'Customs Hold';
type QCStatus = 'Passed' | 'Hold — pending lab' | 'Rejected — purity fail';

interface Shipment {
  id: string; asnNumber: string; poNumber: string; supplier: string;
  material: string; qty: string; carrier: string; trackingNumber: string;
  shipDate: string; eta: string; status: ShipStatus; location: string;
  dockSlot: string; channel: string;
}

interface PendingASN {
  poNumber: string; supplier: string; material: string;
  confirmedDate: string; requestedDelivery: string; daysUntilDue: number; channel: string;
}

interface GR {
  grNumber: string; poNumber: string; supplier: string; material: string;
  qty: string; grDate: string; qcStatus: string; sapDocNumber: string; variance: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SHIPMENTS_INIT: Shipment[] = [
  { id:'asn-001', asnNumber:'ASN-2026-001', poNumber:'PO-2025-00107', supplier:'PT Berlina Packaging Indonesia', material:'PET Bottle 100ml Airless Pump', qty:'50,000 PCS', carrier:'JNE Logistics', trackingNumber:'JNE2026001234', shipDate:'2026-04-02', eta:'2026-04-08', status:'In Transit', location:'Cikarang Hub', dockSlot:'', channel:'Web' },
  { id:'asn-002', asnNumber:'ASN-2026-002', poNumber:'PO-2025-00108', supplier:'Zhejiang NHU Vitamins', material:'Niacinamide B3 USP Grade', qty:'500 KG', carrier:'DHL Express', trackingNumber:'DHL9876543210', shipDate:'2026-04-01', eta:'2026-04-07', status:'Arriving Today', location:'Soekarno-Hatta Customs', dockSlot:'Dock 3 — 10:00', channel:'API' },
  { id:'asn-003', asnNumber:'ASN-2026-003', poNumber:'PO-2025-00103', supplier:'PT Halal Emulsifier Nusantara', material:'Halal Glycerin 99.5%', qty:'2,000 KG', carrier:'Wahana Logistics', trackingNumber:'WHN20260034', shipDate:'2026-03-30', eta:'2026-04-04', status:'Overdue', location:'Last seen: Bekasi DC', dockSlot:'', channel:'WhatsApp' },
  { id:'asn-004', asnNumber:'ASN-2026-004', poNumber:'PO-2025-00111', supplier:'PT Indo Karton Packaging', material:'Folding Carton 150gsm Wardah', qty:'200,000 PCS', carrier:'SiCepat Express', trackingNumber:'SCP202600456', shipDate:'2026-04-04', eta:'2026-04-09', status:'In Transit', location:'Surabaya Hub', dockSlot:'', channel:'Email' },
  { id:'asn-005', asnNumber:'ASN-2026-005', poNumber:'PO-2025-00099', supplier:'BASF Personal Care DE', material:'Hyaluronic Acid HA-100', qty:'50 KG', carrier:'FedEx International', trackingNumber:'FDX789012345', shipDate:'2026-03-28', eta:'2026-04-03', status:'Overdue', location:'Jakarta Customs — held for inspection', dockSlot:'', channel:'EDI' },
  { id:'asn-006', asnNumber:'ASN-2026-006', poNumber:'PO-2025-00115', supplier:'PT Musim Mas Specialty Fats', material:'Palm Kernel Oil RBD', qty:'5,000 KG', carrier:'Meratus Shipping', trackingNumber:'MRT20260078', shipDate:'2026-04-05', eta:'2026-04-10', status:'In Transit', location:'Tanjung Priok Port', dockSlot:'', channel:'WhatsApp' },
];

const PENDING_ASNS: PendingASN[] = [
  { poNumber:'PO-2025-00109', supplier:'PT Ecogreen Oleochemicals', material:'Centella Asiatica Extract', confirmedDate:'2026-04-01', requestedDelivery:'2026-04-12', daysUntilDue:5, channel:'Email' },
  { poNumber:'PO-2025-00112', supplier:'Evonik Specialty FR', material:'Vitamin E Tocopherol', confirmedDate:'2026-03-30', requestedDelivery:'2026-04-10', daysUntilDue:3, channel:'EDI' },
  { poNumber:'PO-2025-00114', supplier:'PT Indo Karton Packaging', material:'Shrink Sleeve Label Emina', confirmedDate:'2026-04-03', requestedDelivery:'2026-04-15', daysUntilDue:8, channel:'Web' },
];

const GR_HISTORY: GR[] = [
  { grNumber:'GR-2026-0234', poNumber:'PO-2025-00098', supplier:'PT Berlina Packaging', material:'PET Bottle 50ml', qty:'30,000 PCS', grDate:'2026-04-02', qcStatus:'Passed', sapDocNumber:'4900023456', variance:'0%' },
  { grNumber:'GR-2026-0231', poNumber:'PO-2025-00095', supplier:'Zhejiang NHU', material:'Niacinamide B3', qty:'480 KG', grDate:'2026-04-01', qcStatus:'Passed', sapDocNumber:'4900023412', variance:'-4% short' },
  { grNumber:'GR-2026-0228', poNumber:'PO-2025-00091', supplier:'PT Halal Emulsifier', material:'Halal Glycerin', qty:'2,000 KG', grDate:'2026-03-30', qcStatus:'Hold — pending lab', sapDocNumber:'4900023389', variance:'0%' },
  { grNumber:'GR-2026-0225', poNumber:'PO-2025-00088', supplier:'BASF Personal Care', material:'Panthenol B5', qty:'100 KG', grDate:'2026-03-28', qcStatus:'Rejected — purity fail', sapDocNumber:'4900023344', variance:'0%' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtTime() {
  return new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

const STATUS_STYLE: Record<string, [string, string]> = {
  'In Transit':     ['#DBEAFE','#1E40AF'],
  'Arriving Today': ['#DCFCE7','#166534'],
  'Overdue':        ['#FEE2E2','#991B1B'],
  'Delivered':      ['#F1F5F9','#475569'],
  'Customs Hold':   ['#FEF3C7','#92400E'],
};

const QC_STYLE: Record<string, [string, string]> = {
  'Passed':                  ['#DCFCE7','#166534'],
  'Hold — pending lab':      ['#FEF3C7','#92400E'],
  'Rejected — purity fail':  ['#FEE2E2','#991B1B'],
};

const CHANNEL_ICON: Record<string, string> = {
  WhatsApp:'📱', Web:'🌐', API:'⚙️', EDI:'📡', Email:'✉️',
};

function Pill({ label, bg, color }: { label:string; bg:string; color:string }) {
  return <span style={{ background:bg, color, borderRadius:'9999px', padding:'2px 9px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>;
}

function Toast({ msg }: { msg:string }) {
  return <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'0.75rem 1.25rem', borderRadius:'6px', zIndex:600, boxShadow:'0 4px 16px rgba(0,0,0,0.25)', fontSize:'13px', maxWidth:'400px' }}>{msg}</div>;
}

const TABS = ['Inbound Shipments','Pending ASN','Dock Schedule','GR History'] as const;
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

// ─── Dock Scheduler ───────────────────────────────────────────────────────────

function DockScheduler({ shipment, onConfirm, onCancel }: {
  shipment: Shipment;
  onConfirm: (slot: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(shipment.eta);
  const [time, setTime] = useState('09:00');
  const [dock, setDock] = useState('Dock 1');
  const INP: React.CSSProperties = { padding:'7px 10px', border:'1px solid #CBD5E1', borderRadius:6, fontSize:'13px', fontFamily:'inherit', color:NAVY, background:'white' };
  return (
    <div style={{ background:'#F0F4F8', border:'1px solid #CBD5E1', borderRadius:8, padding:'16px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
      <div>
        <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', marginBottom:4 }}>Date</div>
        <input type="date" style={INP} value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div>
        <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', marginBottom:4 }}>Time Slot</div>
        <select style={INP} value={time} onChange={e => setTime(e.target.value)}>
          {['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', marginBottom:4 }}>Dock</div>
        <select style={INP} value={dock} onChange={e => setDock(e.target.value)}>
          {['Dock 1','Dock 2','Dock 3','Dock 4'].map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onConfirm(`${dock} — ${time} on ${fmtDate(date)}`)} style={{ padding:'7px 16px', border:'none', borderRadius:6, background:TEAL, color:'white', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Confirm Slot</button>
        <button onClick={onCancel} style={{ padding:'7px 12px', border:'1px solid #CBD5E1', borderRadius:6, background:'white', color:'#475569', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Tab 1: Inbound Shipments ─────────────────────────────────────────────────

function InboundShipments({ shipments, setShipments, onToast }: {
  shipments: Shipment[];
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  onToast: (m:string) => void;
}) {
  const [schedulingId, setSchedulingId] = useState<string|null>(null);

  const updateDock = (id: string, slot: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, dockSlot: slot } : s));
  };

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{children}</th>
  );

  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
        <thead><tr style={{ background:NAVY }}>
          <TH>ASN Number</TH><TH>Supplier</TH><TH>Material</TH><TH>Qty</TH>
          <TH>Carrier</TH><TH>Ship Date</TH><TH>ETA</TH><TH>Status</TH>
          <TH>Location</TH><TH>Dock Slot</TH><TH>Actions</TH>
        </tr></thead>
        <tbody>
          {shipments.map((s, idx) => {
            const [sBg, sColor] = STATUS_STYLE[s.status] ?? ['#F1F5F9','#475569'];
            const isScheduling = schedulingId === s.id;
            return (
              <React.Fragment key={s.id}>
                <tr style={{ background:idx%2===0?'white':'#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:TEAL, whiteSpace:'nowrap' }}>{s.asnNumber}</td>
                  <td style={{ padding:'10px 12px', maxWidth:160 }}>
                    <div style={{ fontWeight:600, color:NAVY, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={s.supplier}>{s.supplier}</div>
                  </td>
                  <td style={{ padding:'10px 12px', maxWidth:160 }}>
                    <div style={{ color:MID, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={s.material}>{s.material}</div>
                  </td>
                  <td style={{ padding:'10px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{s.qty}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ fontWeight:600, color:MID }}>{s.carrier}</div>
                    <div style={{ fontSize:'11px', color:'#94A3B8', fontFamily:'monospace' }}>{s.trackingNumber}</div>
                  </td>
                  <td style={{ padding:'10px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{fmtDate(s.shipDate)}</td>
                  <td style={{ padding:'10px 12px', fontWeight:600, color:s.status==='Overdue'?'#BB0000':NAVY, whiteSpace:'nowrap' }}>{fmtDate(s.eta)}</td>
                  <td style={{ padding:'10px 12px' }}><Pill label={s.status} bg={sBg} color={sColor} /></td>
                  <td style={{ padding:'10px 12px', fontSize:'12px', color:'#64748B', maxWidth:140 }}>
                    <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={s.location}>{s.location}</div>
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'12px' }}>
                    {s.dockSlot ? <Pill label={s.dockSlot} bg='#DCFCE7' color='#166534' /> : <span style={{ color:'#94A3B8' }}>—</span>}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:5, flexWrap:'nowrap' }}>
                      <button onClick={() => onToast(`Opening carrier tracking for ${s.trackingNumber}...`)}
                        style={{ padding:'5px 9px', border:`1px solid #CBD5E1`, borderRadius:5, background:'white', color:MID, fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>🔍 Track</button>
                      {!s.dockSlot && (
                        <button onClick={() => setSchedulingId(isScheduling ? null : s.id)}
                          style={{ padding:'5px 9px', border:'none', borderRadius:5, background:isScheduling?'#FEF3C7':TEAL, color:isScheduling?'#92400E':'white', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>📅 Dock</button>
                      )}
                      <button onClick={() => onToast(`Sending message to ${s.supplier} via ${CHANNEL_ICON[s.channel]??''} ${s.channel}...`)}
                        style={{ padding:'5px 9px', border:'none', borderRadius:5, background:'#F1F5F9', color:'#475569', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>💬</button>
                    </div>
                  </td>
                </tr>
                {isScheduling && (
                  <tr style={{ background:'#F8FAFC' }}>
                    <td colSpan={11} style={{ padding:'0 12px 12px' }}>
                      <DockScheduler
                        shipment={s}
                        onConfirm={(slot) => {
                          updateDock(s.id, slot);
                          setSchedulingId(null);
                          onToast(`Dock slot confirmed: ${slot} for ${s.asnNumber}`);
                        }}
                        onCancel={() => setSchedulingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab 2: Pending ASN ───────────────────────────────────────────────────────

function PendingASNTab({ onToast }: { onToast:(m:string)=>void }) {
  const dayColor = (d: number) => d <= 3 ? '#BB0000' : d <= 7 ? '#E9730C' : '#107E3E';
  const dayBg = (d: number) => d <= 3 ? '#FEE2E2' : d <= 7 ? '#FEF3C7' : '#DCFCE7';
  const TH = ({ children }: { children:React.ReactNode }) => (
    <th style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{children}</th>
  );
  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
        <thead><tr style={{ background:NAVY }}><TH>PO Number</TH><TH>Supplier</TH><TH>Material</TH><TH>Confirmed</TH><TH>Requested Delivery</TH><TH>Days Until Due</TH><TH>Channel</TH><TH>Actions</TH></tr></thead>
        <tbody>
          {PENDING_ASNS.map((p, idx) => (
            <tr key={p.poNumber} style={{ background:idx%2===0?'white':'#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
              <td style={{ padding:'12px', fontFamily:'monospace', fontWeight:700, color:TEAL }}>{p.poNumber}</td>
              <td style={{ padding:'12px', fontWeight:600, color:NAVY }}>{p.supplier}</td>
              <td style={{ padding:'12px', color:MID }}>{p.material}</td>
              <td style={{ padding:'12px', color:'#64748B', whiteSpace:'nowrap' }}>{fmtDate(p.confirmedDate)}</td>
              <td style={{ padding:'12px', color:'#64748B', whiteSpace:'nowrap' }}>{fmtDate(p.requestedDelivery)}</td>
              <td style={{ padding:'12px' }}>
                <Pill label={`${p.daysUntilDue} days`} bg={dayBg(p.daysUntilDue)} color={dayColor(p.daysUntilDue)} />
              </td>
              <td style={{ padding:'12px' }}>
                <span style={{ fontSize:'14px' }}>{CHANNEL_ICON[p.channel]??''}</span> <span style={{ fontSize:'12px', color:'#64748B' }}>{p.channel}</span>
              </td>
              <td style={{ padding:'12px' }}>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => onToast(`ASN reminder sent to ${p.supplier} via ${p.channel}`)}
                    style={{ padding:'5px 10px', border:'none', borderRadius:5, background:TEAL, color:'white', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Send Reminder</button>
                  <button onClick={() => onToast('Escalation sent to procurement manager')}
                    style={{ padding:'5px 10px', border:'none', borderRadius:5, background:'#FEE2E2', color:'#991B1B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Escalate</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab 3: Dock Schedule ─────────────────────────────────────────────────────

const DOCK_TIMES = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
const DOCKS = ['Dock 1','Dock 2','Dock 3','Dock 4'];

function getWeekDays() {
  const days: { label: string; key: string }[] = [];
  const base = new Date('2026-04-07');
  const dayNames = ['Mon','Tue','Wed','Thu','Fri'];
  for (let i = 0; i < 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({ label: `${dayNames[i]} ${d.getDate()} Apr`, key: d.toISOString().slice(0,10) });
  }
  return days;
}

type DockKey = `${string}|${string}|${string}`;
const PREFILLED: Record<DockKey, { asn:string; supplier:string; color:string; bg:string }> = {
  '2026-04-07|Dock 3|10:00': { asn:'ASN-2026-002', supplier:'Zhejiang NHU', color:'#166534', bg:'#DCFCE7' },
  '2026-04-09|Dock 1|09:00': { asn:'ASN-2026-001', supplier:'PT Berlina', color:'#1E40AF', bg:'#DBEAFE' },
  '2026-04-10|Dock 2|14:00': { asn:'ASN-2026-004', supplier:'PT Indo Karton', color:'#1E40AF', bg:'#DBEAFE' },
};

function DockScheduleTab() {
  const weekDays = useMemo(getWeekDays, []);
  return (
    <div>
      <div style={{ fontWeight:700, fontSize:'14px', color:NAVY, marginBottom:12 }}>NDC Jatake 6 — Dock Schedule</div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', fontSize:'12px', width:'100%', minWidth:700 }}>
          <thead>
            <tr>
              <th style={{ padding:'8px 12px', background:NAVY, color:'white', fontWeight:600, textAlign:'left', fontSize:'11px', width:60 }}>Time</th>
              {DOCKS.map(d => (
                <th key={d} style={{ padding:'8px 12px', background:MID, color:'white', fontWeight:600, textAlign:'center', fontSize:'11px' }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDays.map(day => (
              <React.Fragment key={day.key}>
                <tr>
                  <td colSpan={5} style={{ padding:'6px 12px', background:'#F0F4F8', fontSize:'11px', fontWeight:700, color:MID, letterSpacing:'0.5px' }}>{day.label}</td>
                </tr>
                {DOCK_TIMES.map(time => (
                  <tr key={time}>
                    <td style={{ padding:'6px 12px', color:'#64748B', fontWeight:500, borderTop:'1px solid #F1F5F9', whiteSpace:'nowrap' }}>{time}</td>
                    {DOCKS.map(dock => {
                      const key = `${day.key}|${dock}|${time}` as DockKey;
                      const slot = PREFILLED[key];
                      return (
                        <td key={dock} style={{ padding:'4px 8px', borderTop:'1px solid #F1F5F9', textAlign:'center', verticalAlign:'middle' }}>
                          {slot ? (
                            <div style={{ background:slot.bg, color:slot.color, borderRadius:4, padding:'4px 6px', fontSize:'11px', fontWeight:600 }}>
                              <div>{slot.asn}</div>
                              <div style={{ fontWeight:400, fontSize:'10px' }}>{slot.supplier}</div>
                            </div>
                          ) : (
                            <div style={{ border:'1px dashed #CBD5E1', borderRadius:4, padding:'4px 6px', fontSize:'10px', color:'#CBD5E1' }}>Available</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 4: GR History ────────────────────────────────────────────────────────

function GRHistory({ onToast }: { onToast:(m:string)=>void }) {
  const TH = ({ children }: { children:React.ReactNode }) => (
    <th style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{children}</th>
  );
  return (
    <div>
      <div style={{ fontWeight:700, fontSize:'14px', color:NAVY, marginBottom:12 }}>Recent Goods Receipts</div>
      <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
          <thead><tr style={{ background:NAVY }}><TH>GR Number</TH><TH>PO Number</TH><TH>Supplier</TH><TH>Material</TH><TH>Qty</TH><TH>GR Date</TH><TH>QC Status</TH><TH>SAP Doc</TH><TH>Variance</TH><TH>Actions</TH></tr></thead>
          <tbody>
            {GR_HISTORY.map((g, idx) => {
              const [qBg, qColor] = QC_STYLE[g.qcStatus as keyof typeof QC_STYLE] ?? ['#F1F5F9','#475569'];
              return (
                <tr key={g.grNumber} style={{ background:idx%2===0?'white':'#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:TEAL, whiteSpace:'nowrap' }}>{g.grNumber}</td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', color:MID, whiteSpace:'nowrap' }}>{g.poNumber}</td>
                  <td style={{ padding:'10px 12px', color:NAVY, fontWeight:600 }}>{g.supplier}</td>
                  <td style={{ padding:'10px 12px', color:MID }}>{g.material}</td>
                  <td style={{ padding:'10px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{g.qty}</td>
                  <td style={{ padding:'10px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{fmtDate(g.grDate)}</td>
                  <td style={{ padding:'10px 12px' }}><Pill label={g.qcStatus} bg={qBg} color={qColor} /></td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:'12px', color:MID }}>{g.sapDocNumber}</td>
                  <td style={{ padding:'10px 12px', color:g.variance.includes('-')?'#BB0000':'#64748B', fontWeight:g.variance!=='0%'?700:400 }}>{g.variance}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <button onClick={() => onToast(`Opening SAP material document ${g.sapDocNumber}...`)}
                      style={{ padding:'5px 10px', border:`1px solid #CBD5E1`, borderRadius:5, background:'white', color:MID, fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>View GR</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ShipmentTracking: React.FC = () => {
  const [tab, setTab] = useState<Tab>('Inbound Shipments');
  const [toast, setToast] = useState<string|null>(null);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS_INIT);
  const [lastUpdated, setLastUpdated] = useState(fmtTime());

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const stats = useMemo(() => ({
    inTransit: shipments.filter(s => s.status === 'In Transit').length,
    arrivingToday: shipments.filter(s => s.status === 'Arriving Today').length,
    overdue: shipments.filter(s => s.status === 'Overdue').length,
    pendingASN: PENDING_ASNS.length,
  }), [shipments]);

  const TILE: React.CSSProperties = { background:'white', borderRadius:8, padding:'16px 20px', flex:1, minWidth:130, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:'20px', fontWeight:600, color:NAVY, marginBottom:4 }}>Shipments &amp; ASN Tracking</div>
          <div style={{ fontSize:'13px', color:'#64748B' }}>Monitor inbound shipments, dock schedules, and goods receipts</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:'12px', color:'#64748B' }}>
          <span>Last updated: {lastUpdated}</span>
          <button onClick={() => setLastUpdated(fmtTime())} style={{ padding:'6px 12px', border:`1px solid ${TEAL}`, borderRadius:6, background:'white', color:TEAL, fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>↻ Refresh</button>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { label:'In Transit', value:stats.inTransit, color:'#1E40AF', bg:'#DBEAFE', border:'#1E40AF' },
          { label:'Arriving Today', value:stats.arrivingToday, color:'#166534', bg:'#DCFCE7', border:'#166534' },
          { label:'Overdue', value:stats.overdue, color:'#991B1B', bg:'#FEE2E2', border:'#991B1B' },
          { label:'Pending ASN', value:stats.pendingASN, color:'#92400E', bg:'#FEF3C7', border:'#E9730C' },
        ].map(t => (
          <div key={t.label} style={{ ...TILE, borderLeft:`4px solid ${t.border}` }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>{t.label}</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Alert bars */}
      {stats.overdue > 0 && (
        <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:6, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, fontSize:'13px', color:'#991B1B', fontWeight:600 }}>
          🚨 {stats.overdue} shipment{stats.overdue>1?'s are':' is'} overdue — immediate follow-up required
        </div>
      )}
      {stats.pendingASN > 0 && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE047', borderRadius:6, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, fontSize:'13px', color:'#92400E', fontWeight:600 }}>
          ⚠️ {stats.pendingASN} confirmed PO{stats.pendingASN>1?'s have':' has'} no ASN submitted — contact suppliers
        </div>
      )}

      <TabBar active={tab} onChange={setTab} />

      {tab === 'Inbound Shipments' && <InboundShipments shipments={shipments} setShipments={setShipments} onToast={showToast} />}
      {tab === 'Pending ASN' && <PendingASNTab onToast={showToast} />}
      {tab === 'Dock Schedule' && <DockScheduleTab />}
      {tab === 'GR History' && <GRHistory onToast={showToast} />}
    </div>
  );
};

export default ShipmentTracking;
