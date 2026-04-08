import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

// ─── Demo supplier context (Berlina Packaging in demo) ───────────────────────
const DEMO_SUPPLIER = mockSuppliers.find(s => s.id === 'sup-007')!;

// ─── Mock trend data (12-week rolling) ───────────────────────────────────────
const WEEKLY_TREND = [
  { week: 'W1 Jan', otif: 80, asnAcc: 96, defect: 1.2, ackHrs: 52, leadVar: 2.1 },
  { week: 'W2 Jan', otif: 81, asnAcc: 97, defect: 1.0, ackHrs: 48, leadVar: 2.0 },
  { week: 'W3 Jan', otif: 79, asnAcc: 95, defect: 1.4, ackHrs: 50, leadVar: 2.3 },
  { week: 'W4 Jan', otif: 82, asnAcc: 97, defect: 0.9, ackHrs: 46, leadVar: 1.8 },
  { week: 'W1 Feb', otif: 83, asnAcc: 98, defect: 0.8, ackHrs: 44, leadVar: 1.5 },
  { week: 'W2 Feb', otif: 81, asnAcc: 96, defect: 1.1, ackHrs: 50, leadVar: 1.9 },
  { week: 'W3 Feb', otif: 84, asnAcc: 98, defect: 0.7, ackHrs: 42, leadVar: 1.4 },
  { week: 'W4 Feb', otif: 85, asnAcc: 99, defect: 0.6, ackHrs: 40, leadVar: 1.2 },
  { week: 'W1 Mar', otif: 83, asnAcc: 97, defect: 0.9, ackHrs: 44, leadVar: 1.6 },
  { week: 'W2 Mar', otif: 86, asnAcc: 98, defect: 0.7, ackHrs: 38, leadVar: 1.3 },
  { week: 'W3 Mar', otif: 85, asnAcc: 97, defect: 0.8, ackHrs: 40, leadVar: 1.4 },
  { week: 'W4 Mar', otif: 87, asnAcc: 98, defect: 0.8, ackHrs: 42, leadVar: 1.4 },
];

const RADAR_DATA = [
  { metric: 'OTIF',        value: 87, target: 95, fullMark: 100 },
  { metric: 'ASN Acc.',    value: 98, target: 95, fullMark: 100 },
  { metric: 'POA Speed',   value: 72, target: 85, fullMark: 100 },
  { metric: 'Invoice Acc.',value: 91, target: 98, fullMark: 100 },
  { metric: 'Quality',     value: 92, target: 98, fullMark: 100 },
  { metric: 'Lead Time',   value: 80, target: 90, fullMark: 100 },
];

const GRADE_HISTORY = [
  { month: 'Oct 24', grade: 'C', score: 71 },
  { month: 'Nov 24', grade: 'C', score: 73 },
  { month: 'Dec 24', grade: 'B', score: 76 },
  { month: 'Jan 25', grade: 'B', score: 78 },
  { month: 'Feb 25', grade: 'B', score: 81 },
  { month: 'Mar 25', grade: 'B', score: 82 },
];

const IMPROVEMENT_ACTIONS = [
  {
    kpi: 'OTIF Rate',
    current: '87%',
    target: '≥ 95%',
    gap: '−8pp',
    action: 'Review production schedule alignment with Paragon delivery windows. Current 7-day overdue on PO-2025-00107 indicates capacity constraint.',
    priority: 'High',
  },
  {
    kpi: 'POA Response Time',
    current: '42 hrs avg',
    target: '≤ 24 hrs',
    gap: '+18 hrs',
    action: 'Enable WhatsApp PO notification alerts for faster acknowledgement. Assign dedicated PO coordinator for Paragon account.',
    priority: 'Medium',
  },
  {
    kpi: 'Invoice Accuracy',
    current: '91%',
    target: '≥ 98%',
    gap: '−7pp',
    action: 'Quantity discrepancies detected on PO-2025-00108 batch. Implement pre-shipment count verification before invoice submission.',
    priority: 'Medium',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gradeColor(g: string) {
  return g === 'A' ? '#107E3E' : g === 'B' ? '#0A6ED1' : g === 'C' ? '#E9730C' : '#BB0000';
}
function gradeBg(g: string) {
  return g === 'A' ? '#DCFCE7' : g === 'B' ? '#DBEAFE' : g === 'C' ? '#FEF3C7' : '#FEE2E2';
}
function rateColor(v: number) { return v >= 95 ? '#107E3E' : v >= 85 ? '#E9730C' : '#BB0000'; }
function rateBg(v: number)    { return v >= 95 ? '#DCFCE7' : v >= 85 ? '#FEF3C7' : '#FEE2E2'; }
function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{label}</span>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: NAVY }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? TEAL }}>{p.name}: {p.value}{typeof p.value === 'number' && p.value < 10 ? '%' : ''}</div>
      ))}
    </div>
  );
};

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, target, trend, unit = '%', warn = false }: {
  label: string; value: number | string; target: string;
  trend: string; unit?: string; warn?: boolean;
}) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  const clr = warn ? '#E9730C' : rateColor(num);
  const bg  = warn ? '#FEF3C7' : rateBg(num);
  return (
    <div style={{
      background: 'white', border: `1px solid ${BORDER}`,
      borderLeft: `4px solid ${clr}`,
      borderRadius: 8, padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: clr, lineHeight: 1 }}>
          {typeof value === 'number' ? value : value}{unit}
        </span>
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Target: {target}</div>
      <div style={{ fontSize: 11, color: trend.startsWith('↑') ? '#107E3E' : trend.startsWith('↓') ? '#BB0000' : MUTED, fontWeight: 500 }}>
        {trend}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const MyPerformance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'actions'>('overview');
  const [toast, setToast]         = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const supplier = DEMO_SUPPLIER;
  const currentGrade = 'B';
  const currentScore = 82;

  // My POs from mock data
  const myPOs = mockPurchaseOrders.filter(po => po.supplierId === 'sup-007');
  const lateCount = myPOs.filter(po => po.daysOverdue > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: NAVY, color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: 8,
          zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          fontSize: 13, borderLeft: `3px solid ${TEAL}`,
        }}>{toast}</div>
      )}

      {/* Header + supplier badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>My Performance</div>
          <div style={{ fontSize: 13, color: MUTED }}>
            Paragon scorecard · Rolling 12-week KPIs · Improvement tracking
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Overall grade badge */}
          <div style={{
            background: gradeBg(currentGrade),
            border: `2px solid ${gradeColor(currentGrade)}`,
            borderRadius: 10, padding: '10px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: gradeColor(currentGrade), letterSpacing: '1px', textTransform: 'uppercase' }}>
              Paragon Grade
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: gradeColor(currentGrade), lineHeight: 1 }}>
              {currentGrade}
            </div>
            <div style={{ fontSize: 11, color: gradeColor(currentGrade) }}>{currentScore}/100</div>
          </div>
          <button
            onClick={() => showToast('Downloading performance report PDF...')}
            style={{
              background: 'white', border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: '8px 14px',
              fontSize: 12, fontWeight: 600, color: MID,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            📥 Export Report
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, gap: 0 }}>
        {(['overview', 'trends', 'actions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', borderBottom: activeTab === tab ? `2px solid ${TEAL}` : '2px solid transparent',
              background: 'transparent', color: activeTab === tab ? TEAL : MUTED,
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              marginBottom: -2, textTransform: 'capitalize',
            }}
          >
            {tab === 'overview' ? '📊 Overview' : tab === 'trends' ? '📈 Trends' : '🎯 Improvement Actions'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <KpiTile label="OTIF Rate"             value={87}   target="≥ 95%"    trend="↑ +5pp vs last quarter" />
            <KpiTile label="ASN Accuracy"          value={97.8} target="≥ 95%"    trend="↑ Stable, above target" />
            <KpiTile label="Lead Time Variance"    value={1.4}  target="≤ 0.5 days" trend="↓ Improving" unit=" days" warn />
            <KpiTile label="POA Response Time"     value={42}   target="≤ 24 hrs" trend="⚠ Needs improvement" unit=" hrs" warn />
            <KpiTile label="Defect / Reject Rate"  value={0.8}  target="≤ 2%"     trend="↑ Below threshold — good" />
            <KpiTile label="Invoice Accuracy"      value={91}   target="≥ 98%"    trend="↓ Below target — 3 disputes" warn />
          </div>

          {/* Radar + grade history */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
                Performance Radar — vs Paragon Targets
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: MUTED }} />
                  <Radar name="Your Score" dataKey="value"  stroke={TEAL}     fill={TEAL}     fillOpacity={0.25} />
                  <Radar name="Target"     dataKey="target" stroke="#BB0000"  fill="#BB0000"  fillOpacity={0.1} strokeDasharray="4 2" />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
                Grade History — Monthly Score
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={GRADE_HISTORY} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={90} stroke="#107E3E" strokeDasharray="4 2" />
                  <Bar dataKey="score" fill={TEAL} radius={[4, 4, 0, 0]} name="Score" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {GRADE_HISTORY.map(({ month, grade, score }) => (
                  <div key={month} style={{
                    background: gradeBg(grade), border: `1px solid ${gradeColor(grade)}`,
                    borderRadius: 6, padding: '4px 10px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 9, color: gradeColor(grade), fontWeight: 600 }}>{month}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: gradeColor(grade) }}>{grade}</div>
                    <div style={{ fontSize: 9, color: gradeColor(grade) }}>{score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PO summary */}
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
              Purchase Order Performance — {supplier.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Total POs', value: myPOs.length, color: TEAL },
                { label: 'On Time', value: myPOs.filter(p => p.daysOverdue <= 0).length, color: '#107E3E' },
                { label: 'Late', value: lateCount, color: '#BB0000' },
                { label: 'Avg Overdue', value: `${(myPOs.filter(p => p.daysOverdue > 0).reduce((a, b) => a + b.daysOverdue, 0) / Math.max(lateCount, 1)).toFixed(1)}d`, color: '#E9730C' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: '#F8FAFC', borderRadius: 6, padding: '12px 16px',
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TRENDS TAB ── */}
      {activeTab === 'trends' && (
        <>
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
              OTIF Rate — 12-Week Rolling (%)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={WEEKLY_TREND} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={1} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={95} stroke="#107E3E" strokeDasharray="4 2"
                  label={{ value: 'Target 95%', fill: '#107E3E', fontSize: 9, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="otif" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} name="OTIF %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
                ASN Accuracy (%)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={WEEKLY_TREND} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="week" tick={{ fontSize: 8 }} interval={2} />
                  <YAxis domain={[90, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={95} stroke="#107E3E" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="asnAcc" stroke="#107E3E" strokeWidth={2} dot={{ r: 2 }} name="ASN Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
                POA Response Time (hours)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={WEEKLY_TREND} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="week" tick={{ fontSize: 8 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={24} stroke="#107E3E" strokeDasharray="4 2"
                    label={{ value: 'Target 24h', fill: '#107E3E', fontSize: 9 }} />
                  <Line type="monotone" dataKey="ackHrs" stroke="#E9730C" strokeWidth={2} dot={{ r: 2 }} name="Ack Time (hrs)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── ACTIONS TAB ── */}
      {activeTab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: MUTED }}>
            Below-target KPIs and recommended corrective actions to improve your Paragon supplier grade.
          </div>
          {IMPROVEMENT_ACTIONS.map((item, i) => (
            <div key={i} style={{
              background: 'white', border: `1px solid ${BORDER}`,
              borderLeft: `4px solid ${item.priority === 'High' ? '#BB0000' : '#E9730C'}`,
              borderRadius: 8, padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{item.kpi}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Pill label={`Current: ${item.current}`} bg="#F1F5F9" color={MID} />
                    <Pill label={`Target: ${item.target}`} bg="#DCFCE7" color="#166534" />
                    <Pill label={`Gap: ${item.gap}`} bg="#FEE2E2" color="#991B1B" />
                  </div>
                </div>
                <Pill
                  label={item.priority}
                  bg={item.priority === 'High' ? '#FEE2E2' : '#FEF3C7'}
                  color={item.priority === 'High' ? '#991B1B' : '#92400E'}
                />
              </div>
              <div style={{ fontSize: 13, color: MID, lineHeight: 1.6 }}>
                💡 {item.action}
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => showToast(`Action plan submitted for ${item.kpi} — Paragon team notified`)}
                  style={{
                    background: TEAL, color: 'white', border: 'none',
                    borderRadius: 6, padding: '6px 14px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Acknowledge & Plan
                </button>
              </div>
            </div>
          ))}

          {/* Tier info */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 8, padding: '14px 18px',
            fontSize: 12, color: '#1E40AF',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span>🏅</span>
            <div>
              <strong>Paragon Supplier Tier System:</strong> Achieve Grade A (≥ 90/100) for 3 consecutive months to qualify for
              Tier 1 status — which unlocks faster payment terms (Net 30 → Net 15), priority capacity allocation,
              and inclusion in Paragon's strategic supplier development program.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPerformance;
