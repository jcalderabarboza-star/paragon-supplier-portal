import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
} from 'recharts';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0A6ED1';

const DEMO_SUPPLIER = mockSuppliers.find(s => s.id === 'sup-007')!;

const WEEKLY_TREND = [
  { week: 'W1 Jan', otif: 80, asnAcc: 96, defect: 1.2, ackHrs: 52 },
  { week: 'W2 Jan', otif: 81, asnAcc: 97, defect: 1.0, ackHrs: 48 },
  { week: 'W3 Jan', otif: 79, asnAcc: 95, defect: 1.4, ackHrs: 50 },
  { week: 'W4 Jan', otif: 82, asnAcc: 97, defect: 0.9, ackHrs: 46 },
  { week: 'W1 Feb', otif: 83, asnAcc: 98, defect: 0.8, ackHrs: 44 },
  { week: 'W2 Feb', otif: 81, asnAcc: 96, defect: 1.1, ackHrs: 50 },
  { week: 'W3 Feb', otif: 84, asnAcc: 98, defect: 0.7, ackHrs: 42 },
  { week: 'W4 Feb', otif: 85, asnAcc: 99, defect: 0.6, ackHrs: 40 },
  { week: 'W1 Mar', otif: 83, asnAcc: 97, defect: 0.9, ackHrs: 44 },
  { week: 'W2 Mar', otif: 86, asnAcc: 98, defect: 0.7, ackHrs: 38 },
  { week: 'W3 Mar', otif: 85, asnAcc: 97, defect: 0.8, ackHrs: 40 },
  { week: 'W4 Mar', otif: 87, asnAcc: 98, defect: 0.8, ackHrs: 42 },
];

const RADAR_DATA = [
  { metric: 'OTIF',         value: 87, target: 95, fullMark: 100 },
  { metric: 'ASN Acc.',     value: 98, target: 95, fullMark: 100 },
  { metric: 'POA Speed',    value: 72, target: 85, fullMark: 100 },
  { metric: 'Invoice Acc.', value: 91, target: 98, fullMark: 100 },
  { metric: 'Quality',      value: 92, target: 98, fullMark: 100 },
  { metric: 'Lead Time',    value: 80, target: 90, fullMark: 100 },
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
  { kpi: 'OTIF Rate', current: '87%', target: '≥ 95%', gap: '−8pp', action: 'Review production schedule alignment with Paragon delivery windows. Current 7-day overdue on PO-2025-00107 indicates capacity constraint.', priority: 'High' },
  { kpi: 'POA Response Time', current: '42 hrs avg', target: '≤ 24 hrs', gap: '+18 hrs', action: 'Enable WhatsApp PO notification alerts for faster acknowledgement. Assign dedicated PO coordinator for Paragon account.', priority: 'Medium' },
  { kpi: 'Invoice Accuracy', current: '91%', target: '≥ 98%', gap: '−7pp', action: 'Quantity discrepancies detected on PO-2025-00108. Implement pre-shipment count verification before invoice submission.', priority: 'Medium' },
];

function gradeColor(g: string) { return g === 'A' ? SUCCESS : g === 'B' ? INFO : g === 'C' ? WARNING : ERROR; }
function gradeBg(g: string)    { return g === 'A' ? '#DCFCE7' : g === 'B' ? '#DBEAFE' : g === 'C' ? '#FEF3C7' : '#FEE2E2'; }

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{label}</span>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: NAVY }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.color ?? TEAL }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

function KpiTile({ label, value, target, trend, unit = '%', warn = false }: { label: string; value: number | string; target: string; trend: string; unit?: string; warn?: boolean }) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  const clr = warn ? WARNING : num >= 95 ? SUCCESS : num >= 85 ? WARNING : ERROR;
  return (
    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderLeft: `4px solid ${clr}`, borderRadius: 8, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: clr, lineHeight: 1, marginBottom: 4 }}>{value}{unit}</div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Target: {target}</div>
      <div style={{ fontSize: 11, color: trend.startsWith('↑') ? SUCCESS : trend.startsWith('↓') ? ERROR : MUTED, fontWeight: 500 }}>{trend}</div>
    </div>
  );
}
