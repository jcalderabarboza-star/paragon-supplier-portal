import React, { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const MID  = '#354A5F';

// ─── Supplier data ────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string,string> = { ID:'🇮🇩', CN:'🇨🇳', DE:'🇩🇪', FR:'🇫🇷', MY:'🇲🇾', SG:'🇸🇬' };

interface SuppData {
  id: string; name: string; country: string; category: string; tier: string;
  sapBp: string; channel: string; grade: string; score: number; status: string;
  kpis: { name:string; value:string; target:string; pct:number; color:string; trend:string }[];
  radar: { axis:string; value:number }[];
  otifTrend: number[];
  impPlan?: boolean;
  commLog: { date:string; type:string; channel:string; message:string; status:string }[];
}

const SUPPLIER_DATA: SuppData[] = [
  {
    id:'zhejiang', name:'Zhejiang NHU Vitamins Co.', country:'CN',
    category:'Active Ingredients', tier:'Tier 3 — API', sapBp:'BP-20045', channel:'⚙️ API',
    grade:'A', score:94, status:'Preferred Supplier',
    kpis:[
      { name:'OTIF',               value:'94%',     target:'95%',     pct:94,  color:'#107E3E', trend:'↑' },
      { name:'OTDR',               value:'96%',     target:'95%',     pct:96,  color:'#107E3E', trend:'↑' },
      { name:'PO Ack Rate',        value:'100%',    target:'95%',     pct:100, color:'#107E3E', trend:'→' },
      { name:'Ack Speed',          value:'6h',      target:'<24h',    pct:90,  color:'#107E3E', trend:'↑' },
      { name:'Lead Time Adherence',value:'92%',     target:'90%',     pct:92,  color:'#107E3E', trend:'↑' },
      { name:'GR/PO Variance',     value:'−4%',     target:'±2%',     pct:50,  color:'#E9730C', trend:'↓' },
      { name:'Fill Rate',          value:'96%',     target:'98%',     pct:96,  color:'#E9730C', trend:'↑' },
      { name:'Invoice Accuracy',   value:'100%',    target:'98%',     pct:100, color:'#107E3E', trend:'→' },
      { name:'QNCR',               value:'0.2%',    target:'<0.5%',   pct:90,  color:'#107E3E', trend:'↑' },
      { name:'Inventory DOS',      value:'24 days', target:'14-30d',  pct:80,  color:'#107E3E', trend:'→' },
      { name:'Responsiveness',     value:'88/100',  target:'≥80',     pct:88,  color:'#107E3E', trend:'↑' },
      { name:'Sustainability',     value:'82/100',  target:'≥75',     pct:82,  color:'#107E3E', trend:'↑' },
    ],
    radar:[
      { axis:'Delivery',      value:94 },
      { axis:'Quality',       value:96 },
      { axis:'Commercial',    value:88 },
      { axis:'Responsiveness',value:88 },
      { axis:'Sustainability',value:82 },
    ],
    otifTrend:[88,89,90,91,92,91,93,94,93,94,95,94],
    commLog:[
      { date:'Apr 6 2026',  type:'PO Confirmation',  channel:'API',        message:'PO-2025-00108 confirmed via API in 4 minutes', status:'Completed' },
      { date:'Apr 4 2026',  type:'Invoice Submitted', channel:'Web Portal', message:'INV-2026-00235 submitted — 3-way match: Perfect', status:'Completed' },
      { date:'Apr 1 2026',  type:'ASN Submitted',     channel:'API',        message:'ASN-2026-002 submitted for PO-2025-00108', status:'Completed' },
      { date:'Mar 28 2026', type:'RFQ Response',      channel:'API',        message:'Quotation submitted for RFQ-2026-001 — score: 87/100', status:'Completed' },
      { date:'Mar 15 2026', type:'Inventory Update',  channel:'API Push',   message:'Inventory position updated: Niacinamide B3 — 2,400 KG (24 days)', status:'Completed' },
    ],
  },
  {
    id:'berlina', name:'PT Berlina Packaging Indonesia', country:'ID',
    category:'Packaging Primary', tier:'Tier 1 — WhatsApp', sapBp:'BP-10007', channel:'📱 WhatsApp',
    grade:'B', score:82, status:'Approved Supplier',
    kpis:[
      { name:'OTIF',               value:'88%',     target:'95%',     pct:88,  color:'#E9730C', trend:'↑' },
      { name:'OTDR',               value:'91%',     target:'95%',     pct:91,  color:'#E9730C', trend:'↑' },
      { name:'PO Ack Rate',        value:'92%',     target:'95%',     pct:92,  color:'#E9730C', trend:'↑' },
      { name:'Ack Speed',          value:'18h',     target:'<24h',    pct:75,  color:'#107E3E', trend:'→' },
      { name:'Lead Time Adherence',value:'85%',     target:'90%',     pct:85,  color:'#E9730C', trend:'↑' },
      { name:'GR/PO Variance',     value:'0%',      target:'±2%',     pct:100, color:'#107E3E', trend:'→' },
      { name:'Fill Rate',          value:'95%',     target:'98%',     pct:95,  color:'#E9730C', trend:'↑' },
      { name:'Invoice Accuracy',   value:'98%',     target:'98%',     pct:98,  color:'#107E3E', trend:'→' },
      { name:'QNCR',               value:'0.4%',    target:'<0.5%',   pct:70,  color:'#E9730C', trend:'↑' },
      { name:'Inventory DOS',      value:'18 days', target:'14-30d',  pct:80,  color:'#107E3E', trend:'→' },
      { name:'Responsiveness',     value:'80/100',  target:'≥80',     pct:80,  color:'#107E3E', trend:'↑' },
      { name:'Sustainability',     value:'68/100',  target:'≥75',     pct:68,  color:'#E9730C', trend:'↑' },
    ],
    radar:[
      { axis:'Delivery',      value:88 },
      { axis:'Quality',       value:91 },
      { axis:'Commercial',    value:82 },
      { axis:'Responsiveness',value:80 },
      { axis:'Sustainability',value:68 },
    ],
    otifTrend:[82,83,84,84,85,85,86,87,87,88,88,88],
    commLog:[
      { date:'Apr 5 2026',  type:'PO Confirmation', channel:'WhatsApp', message:'PO-2025-00107 confirmed via WhatsApp in 3 hours', status:'Completed' },
      { date:'Mar 31 2026', type:'ASN Submitted',   channel:'Web Portal', message:'ASN-2026-001 submitted for PO-2025-00107', status:'Completed' },
      { date:'Mar 15 2026', type:'Invoice',         channel:'Email', message:'INV-2026-00198 submitted via email', status:'Completed' },
      { date:'Mar 10 2026', type:'PO Confirmation', channel:'WhatsApp', message:'PO-2025-00098 confirmed', status:'Completed' },
      { date:'Feb 28 2026', type:'GR Discrepancy',  channel:'Web Portal', message:'Short delivery on PO-2025-00091 — 5% variance', status:'Resolved' },
    ],
  },
  {
    id:'basf', name:'BASF Personal Care DE', country:'DE',
    category:'Active Ingredients', tier:'Tier 3 — API', sapBp:'BP-20012', channel:'⚙️ API',
    grade:'C', score:74, status:'Conditional — Improvement Plan Active', impPlan:true,
    kpis:[
      { name:'OTIF',               value:'78%',     target:'95%',     pct:78,  color:'#BB0000', trend:'↓' },
      { name:'OTDR',               value:'82%',     target:'95%',     pct:82,  color:'#E9730C', trend:'↓' },
      { name:'PO Ack Rate',        value:'88%',     target:'95%',     pct:88,  color:'#E9730C', trend:'↑' },
      { name:'Ack Speed',          value:'42h',     target:'<24h',    pct:40,  color:'#BB0000', trend:'↓' },
      { name:'Lead Time Adherence',value:'74%',     target:'90%',     pct:74,  color:'#BB0000', trend:'↓' },
      { name:'GR/PO Variance',     value:'+1%',     target:'±2%',     pct:80,  color:'#107E3E', trend:'→' },
      { name:'Fill Rate',          value:'90%',     target:'98%',     pct:90,  color:'#E9730C', trend:'↑' },
      { name:'Invoice Accuracy',   value:'85%',     target:'98%',     pct:85,  color:'#BB0000', trend:'↓' },
      { name:'QNCR',               value:'1.2%',    target:'<0.5%',   pct:30,  color:'#BB0000', trend:'↓' },
      { name:'Inventory DOS',      value:'8 days',  target:'14-30d',  pct:40,  color:'#BB0000', trend:'↓' },
      { name:'Responsiveness',     value:'62/100',  target:'≥80',     pct:62,  color:'#BB0000', trend:'↓' },
      { name:'Sustainability',     value:'70/100',  target:'≥75',     pct:70,  color:'#E9730C', trend:'↑' },
    ],
    radar:[
      { axis:'Delivery',      value:78 },
      { axis:'Quality',       value:82 },
      { axis:'Commercial',    value:74 },
      { axis:'Responsiveness',value:62 },
      { axis:'Sustainability',value:70 },
    ],
    otifTrend:[85,84,82,83,81,80,79,78,78,79,78,78],
    commLog:[
      { date:'Apr 5 2026',  type:'Late Delivery Alert', channel:'Email', message:'PO-2025-00099 is 5 days overdue — held at Jakarta Customs', status:'Open' },
      { date:'Apr 2 2026',  type:'Improvement Plan',    channel:'Email', message:'Improvement plan issued — 30-day review period', status:'Active' },
      { date:'Mar 28 2026', type:'PO Confirmation',     channel:'API',   message:'PO-2025-00099 confirmed — 42h delay', status:'Completed' },
      { date:'Mar 20 2026', type:'Invoice Dispute',     channel:'Email', message:'INV-2026-00201 disputed — PPN calculation error', status:'Resolved' },
      { date:'Mar 10 2026', type:'QNCR Filed',          channel:'Email', message:'Non-conformance report for batch BAS-2026-0034', status:'Resolved' },
    ],
  },
];

// Add remaining suppliers (truncated for brevity, same pattern)
const ALL_SUPPLIERS = [
  ...SUPPLIER_DATA,
  // Generate lightweight entries for remaining 5 so dropdown works
  ...(['PT Musim Mas Specialty Fats','PT Halal Emulsifier Nusantara','Givaudan Fragrance SG','PT Ecogreen Oleochemicals','Evonik Specialty FR'] as const).map((name, i) => ({
    id: `sup-extra-${i}`, name, country:['ID','ID','SG','ID','FR'][i], category:['Halal Emulsifier','Halal Emulsifier','Fragrance','Natural Botanical','Active Ingredients'][i],
    tier:['Tier 2 — Web','Tier 1 — WhatsApp','Tier 3 — API','Tier 2 — Web','Tier 2 — Web'][i],
    sapBp:`BP-2000${10+i}`, channel:['🌐 Web','📱 WhatsApp','⚙️ API','🌐 Web','🌐 Web'][i],
    grade:['A','B','A','B','C'][i], score:[92,84,91,83,72][i], status:'Approved Supplier',
    kpis: SUPPLIER_DATA[0].kpis, radar: SUPPLIER_DATA[0].radar,
    otifTrend: [82,84,85,87,88,89,90,91,91,92,92,91], commLog: [],
  })),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_STYLE: Record<string,[string,string]> = {
  A:['#DCFCE7','#107E3E'], B:['#DBEAFE','#0D1B2A'], C:['#FEF3C7','#E9730C'], D:['#FEE2E2','#BB0000'],
};

function Pill({ label, bg, color }: { label:string; bg:string; color:string }) {
  return <span style={{ background:bg, color, borderRadius:'9999px', padding:'2px 9px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>;
}
function Toast({ msg }: { msg:string }) {
  return <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:'#0D1B2A', color:'white', padding:'0.75rem 1.25rem', borderRadius:'6px', zIndex:600, boxShadow:'0 4px 16px rgba(0,0,0,0.25)', fontSize:'13px' }}>{msg}</div>;
}
function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ background:'white', borderRadius:8, padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', ...style }}>{children}</div>;
}
function STitle({ children }: { children:React.ReactNode }) {
  return <div style={{ fontSize:'14px', fontWeight:700, color:NAVY, marginBottom:14, paddingBottom:10, borderBottom:'2px solid #E2E8F0' }}>{children}</div>;
}

const TARGET_RADAR = [
  { axis:'Delivery',value:90 },{ axis:'Quality',value:90 },{ axis:'Commercial',value:90 },
  { axis:'Responsiveness',value:90 },{ axis:'Sustainability',value:90 },
];

const OTIF_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CTT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:6, padding:'8px 12px', fontSize:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight:700, marginBottom:4, color:NAVY }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color:p.color||TEAL }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SupplierScorecard: React.FC = () => {
  const [selectedId, setSelectedId] = useState('zhejiang');
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const supp = useMemo(() => ALL_SUPPLIERS.find(s => s.id === selectedId) ?? ALL_SUPPLIERS[0], [selectedId]);
  const [gBg, gColor] = GRADE_STYLE[supp.grade] ?? ['#F1F5F9','#475569'];

  const otifData = supp.otifTrend.map((v,i) => ({ month: OTIF_MONTHS[i], otif: v }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:'20px', fontWeight:600, color:NAVY, marginBottom:4 }}>Supplier Scorecard</div>
          <div style={{ fontSize:'13px', color:'#64748B' }}>Real-time performance scoring across all active suppliers</div>
        </div>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ padding:'8px 14px', border:'1px solid #CBD5E1', borderRadius:6, fontSize:'13px', fontFamily:'inherit', color:NAVY, background:'white', cursor:'pointer', minWidth:260 }}
        >
          {ALL_SUPPLIERS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Section 1 — Identity Card */}
      <div style={{ background:NAVY, borderRadius:8, padding:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:'20px', fontWeight:700, color:'white', marginBottom:8 }}>
            {COUNTRY_FLAGS[supp.country] ?? '🌍'} {supp.name}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            <Pill label={supp.category} bg='#1E3A5F' color='#CBD5E1' />
            <Pill label={supp.tier} bg='#1E3A5F' color='white' />
          </div>
          <div style={{ fontSize:'12px', color:'#CBD5E1', display:'flex', gap:20, flexWrap:'wrap' }}>
            <span><strong style={{ color:'#94A3B8' }}>SAP BP:</strong> {supp.sapBp}</span>
            <span><strong style={{ color:'#94A3B8' }}>Channel:</strong> {supp.channel}</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:gBg, border:`4px solid ${gColor}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'36px', fontWeight:800, color:gColor }}>{supp.grade}</span>
          </div>
          <div style={{ fontSize:'16px', fontWeight:700, color:'white' }}>{supp.score}/100</div>
          <div style={{ fontSize:'11px', color:gColor, fontWeight:600, background:`${gBg}22`, padding:'3px 10px', borderRadius:'9999px', border:`1px solid ${gColor}44` }}>{supp.status}</div>
        </div>
      </div>

      {/* Section 2 — KPI Grid */}
      <Card>
        <STitle>KPI Scorecard — 12 Metrics</STitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {supp.kpis.map(k => (
            <div key={k.name} style={{ background:'#F8FAFC', borderRadius:6, padding:'12px 14px', border:'1px solid #E2E8F0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.5px' }}>{k.name}</div>
                <span style={{ fontSize:'14px', color:k.trend==='↑'?'#107E3E':k.trend==='↓'?'#BB0000':'#94A3B8', fontWeight:700 }}>{k.trend}</span>
              </div>
              <div style={{ fontSize:'20px', fontWeight:700, color:k.color, marginBottom:2 }}>{k.value}</div>
              <div style={{ fontSize:'10px', color:'#94A3B8', marginBottom:6 }}>Target: {k.target}</div>
              <div style={{ height:5, background:'#E2E8F0', borderRadius:3 }}>
                <div style={{ height:'100%', width:`${Math.min(k.pct,100)}%`, background:k.color, borderRadius:3, transition:'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 3 + 4 — Radar + OTIF Trend */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Card>
          <STitle>Score Breakdown — Radar</STitle>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={supp.radar.map((r,i) => ({ ...r, target: TARGET_RADAR[i]?.value ?? 90 }))} margin={{ top:10, right:20, bottom:10, left:20 }}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize:11, fill:'#475569' }} />
              <PolarRadiusAxis domain={[0,100]} tick={{ fontSize:9, fill:'#94A3B8' }} axisLine={false} tickCount={6} />
              <Radar name="Target" dataKey="target" stroke="#BB0000" fill="transparent" strokeDasharray="4 2" />
              <Radar name={supp.name.split(' ')[0]} dataKey="value" stroke={TEAL} fill={TEAL} fillOpacity={0.2} strokeWidth={2} />
              <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
              <Tooltip content={<CTT />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <STitle>OTIF Trend — 12 Months</STitle>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={otifData} margin={{ top:10, right:10, bottom:0, left:-10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize:10 }} />
              <YAxis domain={[60,100]} tick={{ fontSize:10 }} />
              <Tooltip content={<CTT />} />
              <ReferenceLine y={90} stroke="#BB0000" strokeDasharray="4 2" label={{ value:'Target 90%', fill:'#BB0000', fontSize:9, position:'insideTopRight' }} />
              <ReferenceLine y={95} stroke="#107E3E" strokeDasharray="4 2" label={{ value:'Stretch 95%', fill:'#107E3E', fontSize:9, position:'insideTopRight' }} />
              <Line type="monotone" dataKey="otif" stroke={TEAL} strokeWidth={2.5} dot={{ r:3 }} name="OTIF %" activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Section 5 — Improvement Plan (grade C only) */}
      {'impPlan' in supp && supp.impPlan && (
        <Card>
          <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:6, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:16, fontSize:'13px', color:'#BB0000', fontWeight:600 }}>
            🚨 This supplier is on a Conditional rating — improvement plan active. 30-day review period.
          </div>
          <STitle>Improvement Plan — Action Items</STitle>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { item:'Reduce PO acknowledgment time to &lt;24h', due:'Apr 30 2026', owner:'Supplier OPS Team', status:'In Progress' },
              { item:'Resolve quality non-conformance batch BAS-2026-0034 root cause', due:'Apr 20 2026', owner:'Quality Dept', status:'In Progress' },
              { item:'Improve lead time adherence from 74% to ≥85%', due:'May 31 2026', owner:'Production Planning', status:'Pending' },
            ].map((a,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#FEF2F2', borderRadius:6, border:'1px solid #FEE2E2' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:NAVY }} dangerouslySetInnerHTML={{ __html: a.item }} />
                  <div style={{ fontSize:'11px', color:'#64748B', marginTop:2 }}>Owner: {a.owner}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontSize:'11px', color:'#64748B' }}>Due: {a.due}</div>
                  <Pill label={a.status} bg={a.status==='In Progress'?'#FEF3C7':'#F1F5F9'} color={a.status==='In Progress'?'#E9730C':'#475569'} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => showToast(`Improvement plan sent to ${supp.name} via email`)}
            style={{ marginTop:14, padding:'9px 20px', border:'none', borderRadius:6, background:'#BB0000', color:'white', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            📧 Send Improvement Plan
          </button>
        </Card>
      )}

      {/* Section 6 — Communication Log */}
      <Card>
        <STitle>Communication Log — Last 5 Interactions</STitle>
        {supp.commLog.length === 0 ? (
          <div style={{ color:'#94A3B8', fontSize:'13px', textAlign:'center', padding:'24px' }}>No communication log entries.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {supp.commLog.map((log, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 14px', background:'#F8FAFC', borderRadius:6, border:'1px solid #F1F5F9' }}>
                <div style={{ flexShrink:0, textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'#64748B', whiteSpace:'nowrap' }}>{log.date}</div>
                  <div style={{ fontSize:'10px', color:TEAL, fontWeight:600, marginTop:2 }}>{log.channel}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:MID, marginBottom:2 }}>{log.type}</div>
                  <div style={{ fontSize:'12px', color:'#475569' }}>{log.message}</div>
                </div>
                <Pill label={log.status} bg={log.status==='Completed'?'#DCFCE7':log.status==='Active'?'#FEF3C7':log.status==='Open'?'#FEE2E2':'#F1F5F9'} color={log.status==='Completed'?'#107E3E':log.status==='Active'?'#E9730C':log.status==='Open'?'#BB0000':'#475569'} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SupplierScorecard;
