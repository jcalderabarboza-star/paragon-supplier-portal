import React, { useState, useMemo } from 'react';
import { mockSuppliers } from '../../data/mockSuppliers';
import { SupplierTier, PreferredChannel } from '../../types/supplier.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const MID = '#354A5F';

// ─── Mock Data ────────────────────────────────────────────────────────────────

type RFQStatus = 'Open' | 'Quotes Received' | 'Awaiting Award' | 'Awarded' | 'Cancelled';
type Priority = 'High' | 'Medium' | 'Low';

interface RFQ {
  id: string; rfqNumber: string; material: string; category: string;
  status: RFQStatus; suppliersInvited: number; quotesReceived: number;
  createdDate: string; deadline: string; totalQty: string;
  estimatedValue: string; priority: Priority;
}

const MOCK_RFQS: RFQ[] = [
  { id:'rfq-001', rfqNumber:'RFQ-2026-001', material:'Niacinamide B3 USP Grade', category:'Active Ingredient', status:'Quotes Received', suppliersInvited:3, quotesReceived:3, createdDate:'2026-03-28', deadline:'2026-04-10', totalQty:'500 KG', estimatedValue:'Rp 85jT', priority:'High' },
  { id:'rfq-002', rfqNumber:'RFQ-2026-002', material:'PET Bottle 100ml Airless Pump', category:'Packaging Primary', status:'Open', suppliersInvited:4, quotesReceived:1, createdDate:'2026-04-01', deadline:'2026-04-15', totalQty:'50,000 PCS', estimatedValue:'Rp 120jT', priority:'Medium' },
  { id:'rfq-003', rfqNumber:'RFQ-2026-003', material:'Halal Glycerin 99.5% Kosher', category:'Halal Emulsifier', status:'Awaiting Award', suppliersInvited:3, quotesReceived:3, createdDate:'2026-03-20', deadline:'2026-04-05', totalQty:'2,000 KG', estimatedValue:'Rp 45jT', priority:'High' },
  { id:'rfq-004', rfqNumber:'RFQ-2026-004', material:'Givaudan Floral Accord FG-2847', category:'Fragrance', status:'Open', suppliersInvited:2, quotesReceived:0, createdDate:'2026-04-03', deadline:'2026-04-18', totalQty:'100 KG', estimatedValue:'Rp 210jT', priority:'High' },
  { id:'rfq-005', rfqNumber:'RFQ-2026-005', material:'Folding Carton 150gsm Wardah', category:'Packaging Secondary', status:'Quotes Received', suppliersInvited:5, quotesReceived:4, createdDate:'2026-03-25', deadline:'2026-04-08', totalQty:'200,000 PCS', estimatedValue:'Rp 95jT', priority:'Low' },
  { id:'rfq-006', rfqNumber:'RFQ-2026-006', material:'Centella Asiatica Extract 10:1', category:'Natural Botanical', status:'Awarded', suppliersInvited:3, quotesReceived:3, createdDate:'2026-03-10', deadline:'2026-03-25', totalQty:'300 KG', estimatedValue:'Rp 67jT', priority:'Medium' },
];

interface Quote {
  supplier: string; country: string; unitPrice: string; totalPrice: string;
  leadTime: string; halalCert: boolean; iso9001: boolean; score: number; recommended: boolean;
}

const QUOTES: Record<string, Quote[]> = {
  'rfq-001': [
    { supplier:'Zhejiang NHU Vitamins Co.', country:'CN', unitPrice:'Rp 158,000/KG', totalPrice:'Rp 79jT', leadTime:'21 days', halalCert:true, iso9001:true, score:87, recommended:true },
    { supplier:'BASF Personal Care DE', country:'DE', unitPrice:'Rp 182,000/KG', totalPrice:'Rp 91jT', leadTime:'35 days', halalCert:true, iso9001:true, score:82, recommended:false },
    { supplier:'Evonik Specialty FR', country:'FR', unitPrice:'Rp 195,000/KG', totalPrice:'Rp 97.5jT', leadTime:'28 days', halalCert:false, iso9001:true, score:71, recommended:false },
  ],
  'rfq-003': [
    { supplier:'PT Halal Emulsifier Nusantara', country:'ID', unitPrice:'Rp 21,500/KG', totalPrice:'Rp 43jT', leadTime:'7 days', halalCert:true, iso9001:false, score:91, recommended:true },
    { supplier:'PT Musim Mas Specialty Fats', country:'ID', unitPrice:'Rp 22,800/KG', totalPrice:'Rp 45.6jT', leadTime:'5 days', halalCert:true, iso9001:true, score:89, recommended:false },
    { supplier:'Caelo DE', country:'DE', unitPrice:'Rp 28,000/KG', totalPrice:'Rp 56jT', leadTime:'42 days', halalCert:true, iso9001:true, score:74, recommended:false },
  ],
};

const AI_INSIGHTS: Record<string, string> = {
  'rfq-001': ' AI Recommendation: Zhejiang NHU offers the lowest unit price at Rp 158,000/KG — 13% below the next quote. Lead time of 21 days is within acceptable range. Halal certified. Recommended for award.',
  'rfq-003': ' AI Recommendation: PT Halal Emulsifier Nusantara scores highest at 91 with the lowest price and shortest route — local Indonesian supplier minimizes logistics risk. Fully halal certified. Recommended for award.',
};

const COUNTRY_FLAGS: Record<string, string> = {
  ID: '🇮🇩', CN: '🇨🇳', DE: '🇩🇪', FR: '🇫🇷', MY: '🇲🇾',
};

const MOCK_AWARDS = [
  { rfq:'RFQ-2026-006', material:'Centella Asiatica Extract', awardedTo:'PT Ecogreen Oleochemicals', awardDate:'2026-03-26', value:'Rp 64jT', sapInfoRecord:'INF-2026-0089', status:'PO Issued' },
  { rfq:'RFQ-2025-044', material:'Hyaluronic Acid HA-100', awardedTo:'Zhejiang NHU Vitamins Co.', awardDate:'2026-02-14', value:'Rp 38jT', sapInfoRecord:'INF-2026-0067', status:'PO Issued' },
];

const MOCK_ALL_QUOTES = [
  { rfq:'RFQ-2026-001', material:'Niacinamide B3 USP Grade', supplier:'Zhejiang NHU Vitamins Co.', submitted:'2026-04-02', unitPrice:'Rp 158,000/KG', total:'Rp 79jT', leadTime:'21 days', halal:true, score:87, status:'Under Review' },
  { rfq:'RFQ-2026-001', material:'Niacinamide B3 USP Grade', supplier:'BASF Personal Care DE', submitted:'2026-04-03', unitPrice:'Rp 182,000/KG', total:'Rp 91jT', leadTime:'35 days', halal:true, score:82, status:'Under Review' },
  { rfq:'RFQ-2026-001', material:'Niacinamide B3 USP Grade', supplier:'Evonik Specialty FR', submitted:'2026-04-04', unitPrice:'Rp 195,000/KG', total:'Rp 97.5jT', leadTime:'28 days', halal:false, score:71, status:'Under Review' },
  { rfq:'RFQ-2026-003', material:'Halal Glycerin 99.5% Kosher', supplier:'PT Halal Emulsifier Nusantara', submitted:'2026-03-28', unitPrice:'Rp 21,500/KG', total:'Rp 43jT', leadTime:'7 days', halal:true, score:91, status:'Awaiting Award' },
  { rfq:'RFQ-2026-003', material:'Halal Glycerin 99.5% Kosher', supplier:'PT Musim Mas Specialty Fats', submitted:'2026-03-27', unitPrice:'Rp 22,800/KG', total:'Rp 45.6jT', leadTime:'5 days', halal:true, score:89, status:'Awaiting Award' },
  { rfq:'RFQ-2026-002', material:'PET Bottle 100ml Airless Pump', supplier:'PT Berlina Packaging', submitted:'2026-04-05', unitPrice:'Rp 2,100/PCS', total:'Rp 105jT', leadTime:'14 days', halal:true, score:85, status:'Under Review' },
  { rfq:'RFQ-2026-005', material:'Folding Carton 150gsm Wardah', supplier:'PT Indo Karton Packaging', submitted:'2026-04-01', unitPrice:'Rp 420/PCS', total:'Rp 84jT', leadTime:'10 days', halal:true, score:92, status:'Under Review' },
];

const MATERIALS_FOR_SEARCH = [
  'Niacinamide B3 USP Grade', 'Hyaluronic Acid HA-100', 'Centella Asiatica Extract 10:1',
  'PET Bottle 200ml Frosted', 'Halal Glycerin 99.5%',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-04-07');

function deadlineColor(d: string): string {
  const dt = new Date(d);
  const diff = (dt.getTime() - TODAY.getTime()) / 86400000;
  if (diff < 0) return '#BB0000';
  if (diff <= 3) return '#E9730C';
  return '#354A5F';
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

const STATUS_STYLE: Record<RFQStatus, [string, string]> = {
  'Open':           ['#DBEAFE', '#0D1B2A'],
  'Quotes Received':['#CCFBF1', '#0F766E'],
  'Awaiting Award': ['#FEF3C7', '#E9730C'],
  'Awarded':        ['#DCFCE7', '#107E3E'],
  'Cancelled':      ['#FEE2E2', '#BB0000'],
};

const PRIORITY_STYLE: Record<Priority, [string, string]> = {
  High:   ['#FEE2E2', '#BB0000'],
  Medium: ['#FEF3C7', '#E9730C'],
  Low:    ['#F1F5F9', '#475569'],
};

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ background: bg, color, borderRadius:'9999px', padding:'2px 9px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>
      {label}
    </span>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 85 ? '#107E3E' : score >= 70 ? '#E9730C' : '#BB0000';
  return (
    <div style={{ width:40, height:40, borderRadius:'50%', border:`3px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontSize:'12px', fontWeight:700, color }}>{score}</span>
    </div>
  );
}

function ScoreBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#64748B', marginBottom:2 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height:4, background:'#E2E8F0', borderRadius:2 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2 }} />
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'0.75rem 1.25rem', borderRadius:'6px', zIndex:600, boxShadow:'0 4px 16px rgba(0,0,0,0.25)', fontSize:'13px', maxWidth:'360px' }}>
      {msg}
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = ['Active RFQs', 'New RFQ', 'Quotations', 'Awards'] as const;
type Tab = typeof TABS[number];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div style={{ display:'flex', borderBottom:`2px solid #E2E8F0`, marginBottom:'20px', gap:'4px' }}>
      {TABS.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding:'10px 20px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit',
          fontSize:'13px', fontWeight: active===t ? 700 : 500,
          color: active===t ? TEAL : '#64748B',
          borderBottom: active===t ? `2px solid ${TEAL}` : '2px solid transparent',
          marginBottom:'-2px', transition:'all 0.15s',
        }}>
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ rfq, onClose, onToast, onAward }: { rfq: RFQ; onClose: () => void; onToast: (m: string) => void; onAward: (data: { rfqId: string; supplier: string; amount: string; poNumber: string }) => void }) {
  const quotes = QUOTES[rfq.id] ?? [];
  const insight = AI_INSIGHTS[rfq.id];
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200 }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(480px,100vw)', background:'white', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)', overflowY:'auto' }}>
        {/* Panel header */}
        <div style={{ background:NAVY, color:'white', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'15px' }}>{rfq.rfqNumber}</div>
            <div style={{ fontSize:'12px', color:'#CBD5E1', marginTop:4 }}>{rfq.material}</div>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <Pill label={rfq.category} bg='#1E3A5F' color='#CBD5E1' />
              <Pill label={rfq.totalQty} bg='#1E3A5F' color='white' />
              <Pill label={`Deadline: ${fmtDate(rfq.deadline)}`} bg='#1E3A5F' color={deadlineColor(rfq.deadline) === '#354A5F' ? 'white' : '#FCA5A5'} />
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer', lineHeight:1, padding:'0 0 0 12px' }}>×</button>
        </div>

        <div style={{ padding:'20px', flex:1 }}>
          {quotes.length === 0 ? (
            <div style={{ textAlign:'center', color:'#64748B', marginTop:'3rem', fontSize:'14px' }}>No quotes received yet.</div>
          ) : (
            <>
              <div style={{ fontWeight:700, fontSize:'14px', color:NAVY, marginBottom:14 }}>
                Quotation Comparison ({quotes.length} quotes)
              </div>

              {/* Quote cards */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {quotes.map((q, i) => (
                  <div key={i} style={{ border: q.recommended ? `2px solid ${TEAL}` : '1px solid #E2E8F0', borderRadius:8, padding:16, background: q.recommended ? '#F0FDFA' : 'white' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'13px', color:NAVY }}>
                          {COUNTRY_FLAGS[q.country] ?? '🌍'} {q.supplier}
                        </div>
                        {q.recommended && (
                          <span style={{ background:TEAL, color:'white', borderRadius:'9999px', padding:'1px 8px', fontSize:'10px', fontWeight:700, marginTop:4, display:'inline-block' }}>RECOMMENDED</span>
                        )}
                      </div>
                      <ScoreCircle score={q.score} />
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px', fontSize:'12px', marginBottom:12 }}>
                      <div><span style={{ color:'#64748B' }}>Unit Price: </span><strong>{q.unitPrice}</strong></div>
                      <div><span style={{ color:'#64748B' }}>Total: </span><strong>{q.totalPrice}</strong></div>
                      <div><span style={{ color:'#64748B' }}>Lead Time: </span><strong>{q.leadTime}</strong></div>
                      <div style={{ display:'flex', gap:8 }}>
                        <span>{q.halalCert ? '✓' : '✗'} Halal</span>
                        <span>{q.iso9001 ? '✓' : '✗'} ISO</span>
                      </div>
                    </div>

                    <div style={{ marginBottom:12 }}>
                      <ScoreBar label="Price (40%)" pct={40} color='#0097A7' />
                      <ScoreBar label="Quality (25%)" pct={25} color='#107E3E' />
                      <ScoreBar label="Lead Time (15%)" pct={15} color='#E9730C' />
                      <ScoreBar label="Sustainability (10%)" pct={10} color='#7C3AED' />
                      <ScoreBar label="Risk (10%)" pct={10} color='#DC2626' />
                    </div>

                    <button
                      onClick={() => { onAward({ rfqId: rfq.id, supplier: q.supplier, amount: q.totalPrice, poNumber: rfq.rfqNumber }); }}
                      style={{ width:'100%', padding:'8px', border:'none', borderRadius:6, background: q.recommended ? TEAL : NAVY, color:'white', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                    >
                      Award to Supplier
                    </button>
                  </div>
                ))}
              </div>

              {/* AI Insight */}
              {insight && (
                <div style={{ marginTop:16, borderLeft:`4px solid ${TEAL}`, background:'#F0FDFA', padding:'12px 14px', borderRadius:'0 6px 6px 0', fontSize:'12px', color:'#0F766E', lineHeight:1.6 }}>
                  {insight}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tab 1: Active RFQs ───────────────────────────────────────────────────────

function ActiveRFQs({ onToast }: { onToast: (m: string) => void }) {
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [awardedData, setAwardedData] = useState<{ rfqId: string; supplier: string; amount: string; poNumber: string } | null>(null);

  const stats = useMemo(() => ({
    open: MOCK_RFQS.filter(r => r.status === 'Open').length,
    quotesReceived: MOCK_RFQS.reduce((a, r) => a + r.quotesReceived, 0),
    awaitingAward: MOCK_RFQS.filter(r => r.status === 'Awaiting Award').length,
  }), []);

  const TILE_STYLE: React.CSSProperties = {
    background:'white', borderRadius:8, padding:'16px 20px', flex:1, minWidth:140,
    boxShadow:'0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <div>
      {selectedRFQ && <DetailPanel rfq={selectedRFQ} onClose={() => setSelectedRFQ(null)} onToast={onToast} />}

      {/* Summary tiles */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Open RFQs', value:stats.open, color:'#0D1B2A', bg:'#DBEAFE' },
          { label:'Quotes Received', value:stats.quotesReceived, color:'#0F766E', bg:'#CCFBF1' },
          { label:'Awaiting Award', value:stats.awaitingAward, color:'#E9730C', bg:'#FEF3C7' },
          { label:'Avg Response Time', value:'18h', color:'#107E3E', bg:'#DCFCE7' },
        ].map(t => (
          <div key={t.label} style={TILE_STYLE}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>{t.label}</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* RFQ Table */}
      <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
          <thead>
            <tr style={{ background:NAVY }}>
              {['RFQ Number','Material','Category','Status','Invited','Quotes','Deadline','Priority','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_RFQS.map((rfq, idx) => {
              const [sBg, sColor] = STATUS_STYLE[rfq.status];
              const [pBg, pColor] = PRIORITY_STYLE[rfq.priority];
              const dColor = deadlineColor(rfq.deadline);
              const quotePct = rfq.suppliersInvited > 0 ? (rfq.quotesReceived / rfq.suppliersInvited) * 100 : 0;
              return (
                <tr key={rfq.id} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:TEAL, whiteSpace:'nowrap' }}>{rfq.rfqNumber}</td>
                  <td style={{ padding:'10px 12px', maxWidth:200 }}>
                    <div style={{ fontWeight:600, color:NAVY, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rfq.material}</div>
                    <div style={{ fontSize:'11px', color:'#64748B' }}>{rfq.totalQty}</div>
                  </td>
                  <td style={{ padding:'10px 12px' }}><Pill label={rfq.category} bg='#F1F5F9' color='#475569' /></td>
                  <td style={{ padding:'10px 12px' }}><Pill label={rfq.status} bg={sBg} color={sColor} /></td>
                  <td style={{ padding:'10px 12px', textAlign:'center', color:'#354A5F', fontWeight:600 }}>{rfq.suppliersInvited}</td>
                  <td style={{ padding:'10px 12px', minWidth:100 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ flex:1, height:6, background:'#E2E8F0', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${quotePct}%`, background:TEAL, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:'11px', color:'#64748B', whiteSpace:'nowrap' }}>{rfq.quotesReceived}/{rfq.suppliersInvited}</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 12px', color:dColor, fontWeight: dColor !== '#354A5F' ? 700 : 400, whiteSpace:'nowrap' }}>{fmtDate(rfq.deadline)}</td>
                  <td style={{ padding:'10px 12px' }}><Pill label={rfq.priority} bg={pBg} color={pColor} /></td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'nowrap' }}>
                      <button
                        onClick={() => setSelectedRFQ(rfq)}
                        disabled={rfq.quotesReceived === 0}
                        style={{ padding:'5px 10px', border:'none', borderRadius:5, background: rfq.quotesReceived === 0 ? '#F1F5F9' : TEAL, color: rfq.quotesReceived === 0 ? '#CBD5E1' : 'white', fontSize:'11px', fontWeight:600, cursor: rfq.quotesReceived === 0 ? 'not-allowed' : 'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}
                      >View Quotes</button>
                      {rfq.status === 'Awaiting Award' && (
                        <button onClick={() => onToast('Award workflow opening...')} style={{ padding:'5px 10px', border:'none', borderRadius:5, background:'#FEF3C7', color:'#E9730C', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Award</button>
                      )}
                      <button onClick={() => onToast(`${rfq.rfqNumber} cancelled`)} style={{ padding:'5px 10px', border:'none', borderRadius:5, background:'#FEE2E2', color:'#BB0000', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                    </div>
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

// ─── Tab 2: New RFQ Wizard ────────────────────────────────────────────────────

const STEP_LABELS = ['Material & Quantity', 'Select Suppliers', 'Evaluation Criteria', 'Review & Publish'];
const BRANDS = ['Wardah', 'Emina', 'Make Over', 'BLP', 'Scarlett'];

interface WizardState {
  material: string; manualMaterial: string; useManual: boolean;
  qty: string; uom: string; deliveryDate: string; location: string;
  rfqDeadline: string; priority: string; requirements: string;
  brands: string[];
  selectedSuppliers: string[];
  weights: { price: number; quality: number; leadTime: number; sustainability: number; risk: number };
  allowPartial: boolean; multiCurrency: boolean; anonymous: boolean;
}

const DEFAULT_WIZARD: WizardState = {
  material:'', manualMaterial:'', useManual:false, qty:'', uom:'KG',
  deliveryDate:'', location:'', rfqDeadline:'', priority:'Medium',
  requirements:'', brands:[], selectedSuppliers:[],
  weights:{ price:40, quality:25, leadTime:15, sustainability:10, risk:10 },
  allowPartial:false, multiCurrency:false, anonymous:false,
};

function StepBar({ step }: { step: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < step; const active = num === step;
        const bg = done ? MID : active ? TEAL : 'white';
        const color = done || active ? 'white' : '#94A3B8';
        const textColor = active ? NAVY : done ? '#64748B' : '#94A3B8';
        return (
          <React.Fragment key={num}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:bg, border: active ? `2px solid ${TEAL}` : done ? `2px solid ${MID}` : '2px solid #CBD5E1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color, flexShrink:0 }}>
                {done ? '✓' : num}
              </div>
              <span style={{ fontSize:'10px', color:textColor, whiteSpace:'nowrap', fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex:1, height:2, background: done ? MID : '#E2E8F0', margin:'0 6px', marginBottom:20 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FF({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#475569', marginBottom:5 }}>
        {label}{required && <span style={{ color:'#BB0000' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const INP: React.CSSProperties = { width:'100%', padding:'8px 10px', border:'1px solid #CBD5E1', borderRadius:6, fontSize:'13px', fontFamily:'inherit', boxSizing:'border-box', color:NAVY };
const SEL: React.CSSProperties = { ...INP, background:'white' };

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width:44, height:24, borderRadius:12, background: on ? TEAL : '#CBD5E1', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:2, left: on ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
    </div>
  );
}

function NewRFQ({ onToast }: { onToast: (m: string) => void }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(DEFAULT_WIZARD);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filtered = MATERIALS_FOR_SEARCH.filter(m => m.toLowerCase().includes(state.material.toLowerCase()) && state.material.length > 0);

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));
  const updateWeights = (key: keyof WizardState['weights'], val: number) =>
    setState(s => ({ ...s, weights: { ...s.weights, [key]: val } }));
  const totalWeight = Object.values(state.weights).reduce((a, b) => a + b, 0);

  const channelForTier = (tier: SupplierTier) => {
    if (tier === SupplierTier.WHATSAPP) return ' WhatsApp notification + portal link';
    if (tier === SupplierTier.WEB) return ' Portal notification + email';
    return '⚙️ API webhook + email';
  };

  const selectedSupplierObjs = mockSuppliers.filter(s => state.selectedSuppliers.includes(s.id));

  const renderStep1 = () => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
      <div style={{ gridColumn:'1/-1' }}>
        <FF label="Material" required>
          <div style={{ position:'relative' }}>
            {!state.useManual ? (
              <>
                <input style={INP} placeholder="Search material..." value={state.material}
                  onChange={e => { update({ material: e.target.value }); setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
                {showSuggestions && filtered.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #E2E8F0', borderRadius:6, zIndex:50, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filtered.map(m => (
                      <div key={m} onClick={() => { update({ material: m }); setShowSuggestions(false); }}
                        style={{ padding:'8px 12px', cursor:'pointer', fontSize:'13px', borderBottom:'1px solid #F1F5F9' }}
                        onMouseEnter={e => (e.currentTarget.style.background='#F0FDFA')}
                        onMouseLeave={e => (e.currentTarget.style.background='white')}
                      >{m}</div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <input style={INP} placeholder="Enter material name manually..." value={state.manualMaterial} onChange={e => update({ manualMaterial: e.target.value })} />
            )}
          </div>
          <button onClick={() => update({ useManual: !state.useManual })} style={{ marginTop:5, border:'none', background:'none', color:TEAL, fontSize:'11px', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
            {state.useManual ? '← Search existing materials' : '+ Enter manually'}
          </button>
        </FF>
      </div>
      <FF label="Quantity" required>
        <div style={{ display:'flex', gap:8 }}>
          <input style={{ ...INP, flex:1 }} type="number" placeholder="0" value={state.qty} onChange={e => update({ qty: e.target.value })} />
          <select style={{ ...SEL, width:90 }} value={state.uom} onChange={e => update({ uom: e.target.value })}>
            {['KG','L','PCS','MT'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </FF>
      <FF label="Required Delivery Date" required>
        <input style={INP} type="date" value={state.deliveryDate} onChange={e => update({ deliveryDate: e.target.value })} />
      </FF>
      <FF label="Delivery Location" required>
        <select style={SEL} value={state.location} onChange={e => update({ location: e.target.value })}>
          <option value="">Select location...</option>
          {['Plant Jakarta','Plant Semarang','NDC Jatake 6','RM/PM Warehouse'].map(l => <option key={l}>{l}</option>)}
        </select>
      </FF>
      <FF label="RFQ Deadline" required>
        <input style={INP} type="date" value={state.rfqDeadline} onChange={e => update({ rfqDeadline: e.target.value })} />
      </FF>
      <FF label="Priority">
        <select style={SEL} value={state.priority} onChange={e => update({ priority: e.target.value })}>
          {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
        </select>
      </FF>
      <div style={{ gridColumn:'1/-1' }}>
        <FF label="Special Requirements">
          <textarea style={{ ...INP, height:80, resize:'vertical' }} placeholder="Halal certification required, BPOM registered, min purity 99.5%..." value={state.requirements} onChange={e => update({ requirements: e.target.value })} />
        </FF>
      </div>
      <div style={{ gridColumn:'1/-1' }}>
        <FF label="Brand Assignment">
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {BRANDS.map(b => (
              <label key={b} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'13px', cursor:'pointer' }}>
                <input type="checkbox" checked={state.brands.includes(b)}
                  onChange={e => update({ brands: e.target.checked ? [...state.brands, b] : state.brands.filter(x => x !== b) })} />
                {b}
              </label>
            ))}
          </div>
        </FF>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const recommended = mockSuppliers.filter(s => ['A','B'].includes(s.scorecardGrade as string));
    const others = mockSuppliers.filter(s => !['A','B'].includes(s.scorecardGrade as string));
    const toggle = (id: string) => update({ selectedSuppliers: state.selectedSuppliers.includes(id) ? state.selectedSuppliers.filter(x => x !== id) : [...state.selectedSuppliers, id] });

    const SupplierCard = ({ s }: { s: typeof mockSuppliers[0] }) => {
      const checked = state.selectedSuppliers.includes(s.id);
      const tierLabel = s.tier === SupplierTier.WHATSAPP ? 'Tier 1' : s.tier === SupplierTier.WEB ? 'Tier 2' : 'Tier 3';
      return (
        <div onClick={() => toggle(s.id)} style={{ border: checked ? `2px solid ${TEAL}` : '1px solid #E2E8F0', borderRadius:8, padding:'12px 14px', cursor:'pointer', background: checked ? '#F0FDFA' : 'white', display:'flex', gap:12, alignItems:'flex-start' }}>
          <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} style={{ marginTop:2 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'13px', color:NAVY }}>{COUNTRY_FLAGS[s.country] ?? '🌍'} {s.name}</div>
            <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
              <Pill label={tierLabel} bg='#F1F5F9' color='#475569' />
              <Pill label={`Grade ${s.scorecardGrade}`} bg={s.scorecardGrade === 'A' ? '#DCFCE7' : s.scorecardGrade === 'B' ? '#DBEAFE' : '#FEF3C7'} color={s.scorecardGrade === 'A' ? '#107E3E' : s.scorecardGrade === 'B' ? '#0D1B2A' : '#E9730C'} />
              <Pill label={`OTIF ${s.otif}%`} bg='#F1F5F9' color='#475569' />
              {s.halalCertified && <Pill label="✓ Halal" bg='#F0FDF4' color='#107E3E' />}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:'13px', color:'#64748B' }}>{state.selectedSuppliers.length} supplier(s) selected</div>
          <button onClick={() => update({ selectedSuppliers: mockSuppliers.map(s => s.id) })}
            style={{ border:`1px solid ${TEAL}`, borderRadius:6, background:'white', color:TEAL, fontSize:'12px', fontWeight:600, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit' }}>
            Select All Qualified
          </button>
        </div>
        <div style={{ fontWeight:700, fontSize:'12px', color:MID, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>★ Recommended Suppliers</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {recommended.map(s => <SupplierCard key={s.id} s={s} />)}
        </div>
        <div style={{ fontWeight:700, fontSize:'12px', color:'#64748B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Other Qualified Suppliers</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {others.map(s => <SupplierCard key={s.id} s={s} />)}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div>
      <div style={{ marginBottom:16, fontSize:'13px', color:'#64748B' }}>Set evaluation weights (must total 100%)</div>
      {([['price','Price vs. Market Index',40],['quality','Quality Score (from scorecard)',25],['leadTime','Lead Time Compliance',15],['sustainability','Sustainability & Certifications',10],['risk','Financial & Risk Score',10]] as const).map(([key, label, _]) => (
        <FF key={key} label={`${label}: ${state.weights[key]}%`}>
          <input type="range" min={0} max={60} value={state.weights[key]} onChange={e => updateWeights(key, Number(e.target.value))}
            style={{ width:'100%', accentColor:TEAL }} />
        </FF>
      ))}
      <div style={{ padding:'10px 14px', borderRadius:6, background: totalWeight === 100 ? '#DCFCE7' : '#FEE2E2', display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ fontWeight:600, fontSize:'13px', color: totalWeight === 100 ? '#107E3E' : '#BB0000' }}>Total Weight</span>
        <span style={{ fontWeight:700, fontSize:'15px', color: totalWeight === 100 ? '#107E3E' : '#BB0000' }}>{totalWeight}%</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {([['allowPartial','Allow Partial Quantities'],['multiCurrency','Multi-Currency Quotes'],['anonymous','Anonymous Bidding (suppliers cannot see each other\'s prices)']] as const).map(([key, label]) => (
          <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'13px', color:NAVY }}>{label}</span>
            <Toggle on={state[key]} onChange={v => update({ [key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => {
    const matName = state.useManual ? state.manualMaterial : state.material;
    return (
      <div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px', marginBottom:20 }}>
          {[['Material', matName || '—'],['Quantity', `${state.qty} ${state.uom}` || '—'],['Delivery Date', state.deliveryDate || '—'],['Location', state.location || '—'],['RFQ Deadline', state.rfqDeadline || '—'],['Priority', state.priority]].map(([k,v]) => (
            <div key={k} style={{ padding:'10px 14px', background:'#F8FAFC', borderRadius:6, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:'11px', color:'#64748B', fontWeight:600 }}>{k}</div>
              <div style={{ fontSize:'13px', color:NAVY, fontWeight:600, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>
        {state.requirements && (
          <div style={{ padding:'10px 14px', background:'#F8FAFC', borderRadius:6, border:'1px solid #E2E8F0', marginBottom:16 }}>
            <div style={{ fontSize:'11px', color:'#64748B', fontWeight:600, marginBottom:4 }}>Special Requirements</div>
            <div style={{ fontSize:'13px', color:NAVY }}>{state.requirements}</div>
          </div>
        )}
        {state.brands.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:'11px', color:'#64748B', fontWeight:600, marginBottom:6 }}>Brand Assignment</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {state.brands.map(b => <Pill key={b} label={b} bg='#DBEAFE' color='#0D1B2A' />)}
            </div>
          </div>
        )}
        <div style={{ fontWeight:700, fontSize:'13px', color:NAVY, marginBottom:10 }}>Delivery Channels ({selectedSupplierObjs.length} suppliers)</div>
        {selectedSupplierObjs.length === 0 ? <div style={{ color:'#94A3B8', fontSize:'13px' }}>No suppliers selected.</div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {selectedSupplierObjs.map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#F8FAFC', borderRadius:6, border:'1px solid #E2E8F0', fontSize:'13px' }}>
                <span style={{ fontWeight:600, color:NAVY }}>{s.name}</span>
                <span style={{ color:'#64748B' }}>{channelForTier(s.tier)}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            const wap = selectedSupplierObjs.filter(s => s.tier === SupplierTier.WHATSAPP).length;
            const web = selectedSupplierObjs.filter(s => s.tier === SupplierTier.WEB).length;
            const api = selectedSupplierObjs.filter(s => s.tier === SupplierTier.API).length;
            onToast(`RFQ-2026-007 published to ${selectedSupplierObjs.length} suppliers via WhatsApp (${wap}), Portal (${web}), API (${api})`);
            setStep(1); setState(DEFAULT_WIZARD);
          }}
          style={{ width:'100%', padding:'12px', border:'none', borderRadius:6, background:NAVY, color:'white', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
        >
          Publish RFQ
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
        {step === 4 && renderStep4()}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, paddingTop:16, borderTop:'1px solid #E2E8F0' }}>
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          style={{ padding:'9px 20px', border:'1px solid #CBD5E1', borderRadius:6, background:'white', color: step === 1 ? '#CBD5E1' : NAVY, fontFamily:'inherit', fontSize:'13px', fontWeight:600, cursor: step === 1 ? 'not-allowed' : 'pointer' }}>
          ← Back
        </button>
        {step < 4 && (
          <button onClick={() => setStep(s => Math.min(4, s + 1))}
            style={{ padding:'9px 20px', border:'none', borderRadius:6, background:TEAL, color:'white', fontFamily:'inherit', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Quotations ────────────────────────────────────────────────────────

function Quotations() {
  const [rfqFilter, setRfqFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minScore, setMinScore] = useState(0);

  const rfqNumbers = ['All', ...Array.from(new Set(MOCK_ALL_QUOTES.map(q => q.rfq)))];
  const statuses = ['All', ...Array.from(new Set(MOCK_ALL_QUOTES.map(q => q.status)))];

  const filtered = MOCK_ALL_QUOTES.filter(q =>
    (rfqFilter === 'All' || q.rfq === rfqFilter) &&
    (statusFilter === 'All' || q.status === statusFilter) &&
    q.score >= minScore
  );

  const scoreColor = (s: number) => s >= 85 ? '#107E3E' : s >= 70 ? '#E9730C' : '#BB0000';
  const scoreBg = (s: number) => s >= 85 ? '#DCFCE7' : s >= 70 ? '#FEF3C7' : '#FEE2E2';

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <select style={{ ...SEL, width:180 }} value={rfqFilter} onChange={e => setRfqFilter(e.target.value)}>
          {rfqNumbers.map(r => <option key={r}>{r}</option>)}
        </select>
        <select style={{ ...SEL, width:160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'13px', color:'#475569' }}>
          <label>Min Score:</label>
          <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))}
            style={{ ...INP, width:70 }} />
        </div>
      </div>

      <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
          <thead>
            <tr style={{ background:NAVY }}>
              {['RFQ','Material','Supplier','Submitted','Unit Price','Total','Lead Time','Halal','Score','Status'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
                <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:TEAL, whiteSpace:'nowrap' }}>{q.rfq}</td>
                <td style={{ padding:'10px 12px', maxWidth:160 }}><div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:600, color:NAVY }}>{q.material}</div></td>
                <td style={{ padding:'10px 12px', color:'#354A5F' }}>{q.supplier}</td>
                <td style={{ padding:'10px 12px', color:'#64748B', whiteSpace:'nowrap' }}>{fmtDate(q.submitted)}</td>
                <td style={{ padding:'10px 12px', fontWeight:600, color:NAVY }}>{q.unitPrice}</td>
                <td style={{ padding:'10px 12px', fontWeight:600, color:NAVY }}>{q.total}</td>
                <td style={{ padding:'10px 12px', color:'#64748B' }}>{q.leadTime}</td>
                <td style={{ padding:'10px 12px', textAlign:'center' }}>{q.halal ? '✓' : '✗'}</td>
                <td style={{ padding:'10px 12px' }}>
                  <Pill label={String(q.score)} bg={scoreBg(q.score)} color={scoreColor(q.score)} />
                </td>
                <td style={{ padding:'10px 12px' }}>
                  <Pill label={q.status} bg='#F1F5F9' color='#475569' />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding:32, textAlign:'center', color:'#94A3B8', fontSize:'13px' }}>No quotations match the current filters.</div>}
      </div>
    </div>
  );
}

// ─── Tab 4: Awards ─────────────────────────────────────────────────────────────

function Awards() {
  return (
    <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:8, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
        <thead>
          <tr style={{ background:NAVY }}>
            {['RFQ Number','Material','Awarded To','Award Date','Contract Value','SAP Info Record','Status'].map(h => (
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'white', fontWeight:600, fontSize:'11px', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_AWARDS.map((a, idx) => (
            <tr key={a.rfq} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop:'1px solid #F1F5F9' }}>
              <td style={{ padding:'12px', fontFamily:'monospace', fontWeight:700, color:TEAL }}>{a.rfq}</td>
              <td style={{ padding:'12px', fontWeight:600, color:NAVY }}>{a.material}</td>
              <td style={{ padding:'12px', color:'#354A5F' }}>{a.awardedTo}</td>
              <td style={{ padding:'12px', color:'#64748B', whiteSpace:'nowrap' }}>{fmtDate(a.awardDate)}</td>
              <td style={{ padding:'12px', fontWeight:700, color:'#107E3E' }}>{a.value}</td>
              <td style={{ padding:'12px', fontFamily:'monospace', fontSize:'12px', color:MID }}>{a.sapInfoRecord}</td>
              <td style={{ padding:'12px' }}><Pill label={a.status} bg='#DCFCE7' color='#107E3E' /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Sourcing: React.FC = () => {
  const [tab, setTab] = useState<Tab>('Active RFQs');
  const [toast, setToast] = useState<string | null>(null);
  const [awardedRFQ, setAwardedRFQ] = useState<{ rfqId: string; supplier: string; amount: string; poNumber: string } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      {toast && <Toast msg={toast} />}

      <div>
        <div style={{ fontSize:'20px', fontWeight:600, color:NAVY, marginBottom:4 }}>Sourcing &amp; RFQ</div>
        <div style={{ fontSize:'13px', color:'#64748B' }}>Manage RFQs, evaluate quotations, and award contracts</div>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'Active RFQs' && <ActiveRFQs onToast={showToast} />}
      {tab === 'New RFQ' && <NewRFQ onToast={showToast} />}
      {tab === 'Quotations' && <Quotations />}
      {tab === 'Awards' && <Awards />}
    </div>
  );
};

export default Sourcing;
