import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ReferenceLine,
  ComposedChart, Area,
} from 'recharts';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const MID  = '#354A5F';

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEND_CAT = [
  { category:'Active Ingredients',  value:1260, color:'#0097A7' },
  { category:'Fragrance',           value:840,  color:'#354A5F' },
  { category:'Packaging Primary',   value:630,  color:'#107E3E' },
  { category:'Natural/Botanical',   value:504,  color:'#E9730C' },
  { category:'Packaging Secondary', value:420,  color:'#0A6ED1' },
  { category:'Halal Emulsifiers',   value:336,  color:'#5B21B6' },
  { category:'Other',               value:210,  color:'#64748B' },
];
const TOTAL_SPEND = SPEND_CAT.reduce((a, b) => a + b.value, 0);

const TOP_SUPPLIERS = [
  { supplier:'PT Berlina Packaging',         spend:820 },
  { supplier:'Zhejiang NHU Vitamins',        spend:680 },
  { supplier:'BASF Personal Care DE',        spend:540 },
  { supplier:'PT Musim Mas Specialty',       spend:420 },
  { supplier:'PT Halal Emulsifier Nusantara', spend:380 },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const OTIF_DATA = [82,84,83,85,86,84,87,88,86,87,88,87,87,88,87].map((v,i) => ({
  month: MONTHS[i], otif: v, otdr: [85,86,87,88,87,89,90,91,89,91,92,91,91,92,91][i],
}));

const PO_VOL_DATA = [3,4,3,5,4,6,5,4,5,6,4,5,4,5,3].map((v,i) => ({
  month: MONTHS[i], pos: v, cycleTime: [48,42,38,35,32,30,28,26,28,25,24,23,22,21,22][i],
}));

const CHANNEL_DATA = [
  { month:'Oct', whatsapp:20, web:15, email:55, api:10 },
  { month:'Nov', whatsapp:25, web:18, email:47, api:10 },
  { month:'Dec', whatsapp:30, web:20, email:40, api:10 },
  { month:'Jan', whatsapp:35, web:22, email:33, api:10 },
  { month:'Feb', whatsapp:40, web:24, email:26, api:10 },
  { month:'Mar', whatsapp:45, web:25, email:20, api:10 },
];

const PERF_TABLE = [
  { supplier:'PT Berlina Packaging Indonesia', category:'Packaging Primary',    otif:88, otdr:91, ackSpeed:'18h', invoiceMatch:'98%',  grade:'B', trend:'↑' },
  { supplier:'Zhejiang NHU Vitamins Co.',       category:'Active Ingredients',   otif:94, otdr:96, ackSpeed:'6h',  invoiceMatch:'100%', grade:'A', trend:'↑' },
  { supplier:'BASF Personal Care DE',           category:'Active Ingredients',   otif:78, otdr:82, ackSpeed:'42h', invoiceMatch:'85%',  grade:'C', trend:'↓' },
  { supplier:'PT Musim Mas Specialty Fats',     category:'Halal Emulsifier',     otif:92, otdr:94, ackSpeed:'12h', invoiceMatch:'97%',  grade:'A', trend:'→' },
  { supplier:'PT Halal Emulsifier Nusantara',   category:'Halal Emulsifier',     otif:85, otdr:88, ackSpeed:'24h', invoiceMatch:'95%',  grade:'B', trend:'↑' },
  { supplier:'Givaudan Fragrance SG',           category:'Fragrance',            otif:91, otdr:93, ackSpeed:'8h',  invoiceMatch:'99%',  grade:'A', trend:'→' },
  { supplier:'PT Ecogreen Oleochemicals',       category:'Natural Botanical',    otif:82, otdr:85, ackSpeed:'30h', invoiceMatch:'92%',  grade:'B', trend:'↑' },
  { supplier:'Evonik Specialty FR',             category:'Active Ingredients',   otif:72, otdr:76, ackSpeed:'56h', invoiceMatch:'88%',  grade:'C', trend:'↓' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rateColor(v: number) { return v >= 90 ? '#107E3E' : v >= 80 ? '#E9730C' : '#BB0000'; }
function rateBg(v: number)    { return v >= 90 ? '#DCFCE7' : v >= 80 ? '#FEF3C7' : '#FEE2E2'; }
const GRADE_STYLE: Record<string, [string,string]> = {
  A:['#DCFCE7','#166534'], B:['#DBEAFE','#1E40AF'], C:['#FEF3C7','#92400E'], D:['#FEE2E2','#991B1B'],
};
function Pill({ label, bg, color }: { label:string; bg:string; color:string }) {
  return <span style={{ background:bg, color, borderRadius:'9999px', padding:'2px 9px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>;
}
function Toast({ msg }: { msg:string }) {
  return <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'0.75rem 1.25rem', borderRadius:'6px', zIndex:600, boxShadow:'0 4px 16px rgba(0,0,0,0.25)', fontSize:'13px' }}>{msg}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:'15px', fontWeight:700, color:NAVY, marginBottom:14, paddingBottom:10, borderBottom:'2px solid #E2E8F0' }}>{children}</div>;
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background:'white', borderRadius:8, padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', ...style }}>{children}</div>;
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:6, padding:'8px 12px', fontSize:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight:700, marginBottom:4, color:NAVY }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color:p.color }}>{p.name}: {p.value}{p.unit ?? ''}</div>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'30d'|'90d'|'ytd'>('ytd');
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const PERIODS: [string, typeof period][] = [['Last 30 Days','30d'],['Last 90 Days','90d'],['YTD','ytd']];

  const KPI_DATA = [
    { label:'Total Spend YTD', value:'Rp 4.2M', sub:'miliar', trend:'+8% vs last year', trendUp:true },
    { label:'Active Suppliers', value:'12', sub:'', trend:'Flat vs last period', trendUp:null },
    { label:'POs Issued', value:'47', sub:'', trend:'+12% vs last year', trendUp:true },
    { label:'OTIF Rate', value:'87%', sub:'', trend:'+2% vs last period', trendUp:true, warn:true },
    { label:'Avg PO Cycle Time', value:'22h', sub:'', trend:'-18% improvement', trendUp:true },
    { label:'Invoice Match Rate', value:'89%', sub:'', trend:'+4% vs last period', trendUp:true },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:'20px', fontWeight:600, color:NAVY, marginBottom:4 }}>Analytics &amp; Procurement Intelligence</div>
          <div style={{ fontSize:'13px', color:'#64748B' }}>YTD performance metrics and procurement insights</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', background:'#F1F5F9', borderRadius:6, padding:3, gap:2 }}>
            {PERIODS.map(([label, key]) => (
              <button key={key} onClick={() => setPeriod(key)} style={{ padding:'5px 12px', border:'none', borderRadius:4, background:period===key?'white':'transparent', color:period===key?NAVY:'#64748B', fontWeight:period===key?700:500, fontSize:'12px', cursor:'pointer', fontFamily:'inherit', boxShadow:period===key?'0 1px 3px rgba(0,0,0,0.1)':undefined }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => showToast('Report export starting...')} style={{ padding:'7px 14px', border:`1px solid ${TEAL}`, borderRadius:6, background:'white', color:TEAL, fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            📥 Export Report
          </button>
        </div>
      </div>

      {/* Section 1 — KPI Tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {KPI_DATA.map(k => (
          <div key={k.label} style={{ background:'white', borderRadius:8, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${k.warn?'#E9730C':TEAL}` }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>{k.label}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
              <span style={{ fontSize:'26px', fontWeight:700, color:k.warn?'#E9730C':NAVY }}>{k.value}</span>
              {k.sub && <span style={{ fontSize:'12px', color:'#64748B' }}>{k.sub}</span>}
            </div>
            <div style={{ fontSize:'11px', color:k.trendUp===true?'#107E3E':k.trendUp===false?'#BB0000':'#64748B', fontWeight:500 }}>
              {k.trendUp===true?'▲':k.trendUp===false?'▼':'→'} {k.trend}
              {k.warn && <span style={{ color:'#E9730C', marginLeft:6 }}>⚠ Below 90% target</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 — Spend Analytics */}
      <Card>
        <SectionTitle>Spend Analytics</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'6fr 4fr', gap:20 }}>
          {/* Donut */}
          <div>
            <div style={{ fontSize:'13px', fontWeight:600, color:MID, marginBottom:10 }}>Spend by Category (Rp jT)</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={SPEND_CAT} dataKey="value" nameKey="category" cx="50%" cy="50%" innerRadius={65} outerRadius={105}>
                  {SPEND_CAT.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`Rp ${v}jT (${((v/TOTAL_SPEND)*100).toFixed(1)}%)`, '']} />
                <Legend iconType="circle" iconSize={10} formatter={(val) => <span style={{ fontSize:'11px', color:'#475569' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Top suppliers bar */}
          <div>
            <div style={{ fontSize:'13px', fontWeight:600, color:MID, marginBottom:10 }}>Top 5 Suppliers by Spend (Rp jT)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={TOP_SUPPLIERS} layout="vertical" margin={{ left:10, right:40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:10 }} />
                <YAxis type="category" dataKey="supplier" width={130} tick={{ fontSize:10 }} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="spend" fill={TEAL} radius={[0,4,4,0]} label={{ position:'right', fontSize:10, fill:MID, formatter:(v: number) => `${v}jT` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Section 3 — Trend charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Card>
          <SectionTitle>Monthly OTIF &amp; OTDR Trend (%)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={OTIF_DATA} margin={{ top:10, right:10, bottom:0, left:-10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize:10 }} interval={1} />
              <YAxis domain={[75,100]} tick={{ fontSize:10 }} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <ReferenceLine y={90} stroke="#BB0000" strokeDasharray="4 2" label={{ value:'Target 90%', fill:'#BB0000', fontSize:9, position:'insideTopRight' }} />
              <Line type="monotone" dataKey="otif" stroke={TEAL}  strokeWidth={2} dot={{ r:2 }} name="OTIF" />
              <Line type="monotone" dataKey="otdr" stroke={NAVY}  strokeWidth={2} dot={{ r:2 }} name="OTDR" />
              <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>PO Volume &amp; Avg Cycle Time</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={PO_VOL_DATA} margin={{ top:10, right:30, bottom:0, left:-10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize:10 }} interval={1} />
              <YAxis yAxisId="left"  tick={{ fontSize:10 }} label={{ value:'POs', angle:-90, position:'insideLeft', fontSize:9, fill:'#64748B' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize:10 }} label={{ value:'Hours', angle:90, position:'insideRight', fontSize:9, fill:'#64748B' }} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar    yAxisId="left"  dataKey="pos"       fill={TEAL}    opacity={0.8} name="POs" />
              <Line   yAxisId="right" dataKey="cycleTime" stroke="#E9730C" strokeWidth={2} dot={{ r:2 }} name="Cycle Time (h)" />
              <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Section 4 — Supplier Performance Table */}
      <Card>
        <SectionTitle>Supplier Performance Summary — YTD</SectionTitle>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:NAVY }}>
                {['Supplier','Category','OTIF','OTDR','Ack Speed','Invoice Match','Grade','Trend'].map(h => (
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERF_TABLE.map((row, idx) => {
                const [gBg,gColor] = GRADE_STYLE[row.grade] ?? ['#F1F5F9','#475569'];
                return (
                  <tr key={row.supplier} style={{ background:idx%2===0?'white':'#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
                    <td style={{ padding:'10px 12px', fontWeight:600, color:NAVY }}>{row.supplier}</td>
                    <td style={{ padding:'10px 12px' }}><Pill label={row.category} bg='#F1F5F9' color='#475569' /></td>
                    <td style={{ padding:'10px 12px' }}><Pill label={`${row.otif}%`} bg={rateBg(row.otif)} color={rateColor(row.otif)} /></td>
                    <td style={{ padding:'10px 12px' }}><Pill label={`${row.otdr}%`} bg={rateBg(row.otdr)} color={rateColor(row.otdr)} /></td>
                    <td style={{ padding:'10px 12px', color:'#64748B' }}>{row.ackSpeed}</td>
                    <td style={{ padding:'10px 12px', color:'#64748B' }}>{row.invoiceMatch}</td>
                    <td style={{ padding:'10px 12px' }}><Pill label={row.grade} bg={gBg} color={gColor} /></td>
                    <td style={{ padding:'10px 12px', fontSize:'16px', color:row.trend==='↑'?'#107E3E':row.trend==='↓'?'#BB0000':'#94A3B8', fontWeight:700 }}>{row.trend}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 5 — Channel Adoption */}
      <Card>
        <SectionTitle>Digital Channel Adoption — PO Confirmations (%)</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHANNEL_DATA} margin={{ top:10, right:20, bottom:0, left:-10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize:11 }} />
            <YAxis tick={{ fontSize:11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v}%`,'']} />
            <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
            <Bar dataKey="whatsapp" stackId="a" fill="#25D366" name="WhatsApp"  />
            <Bar dataKey="web"      stackId="a" fill="#0A6ED1" name="Web Portal" />
            <Bar dataKey="email"    stackId="a" fill="#EA4335" name="Email" />
            <Bar dataKey="api"      stackId="a" fill="#354A5F" name="API/EDI" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Analytics;
