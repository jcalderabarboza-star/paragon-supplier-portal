import React, { useMemo, useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Info,
  CheckCircle2,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Tabs from '../components/ui-v2/Tabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import type { KpiPoint as Kpi, KpiTrend as Trend } from '../services/data/types';
import {
  KPIS,
  RADAR_DATA,
  WEEKLY_TREND,
} from '../services/data/mock/fixtures/supplierPerformance';

type Grade = 'A' | 'B' | 'C' | 'D';

interface ActionItem {
  kpi: string;
  current: string;
  target: string;
  gap: string;
  action: string;
  priority: 'High' | 'Medium';
}

const TOKEN_TEAL = '#0097A7';
const TOKEN_MID = '#354A5F';
const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_DANGER = '#BB0000';
const TOKEN_MUTED = '#6B7785';
const TOKEN_BORDER = '#E5E9EE';

const GRADE_TONE: Record<Grade, { stroke: string; soft: string }> = {
  A: { stroke: '#107E3E', soft: '#E8F5EC' },
  B: { stroke: '#1E5BAE', soft: '#E5F0FF' },
  C: { stroke: '#B45309', soft: '#FEF3D6' },
  D: { stroke: '#BB0000', soft: '#FCE4E4' },
};

const CURRENT_GRADE: Grade = 'B';
const CURRENT_SCORE = 82;

const GRADE_HISTORY: { month: string; grade: Grade; score: number }[] = [
  { month: 'Oct 24', grade: 'C', score: 71 },
  { month: 'Nov 24', grade: 'C', score: 73 },
  { month: 'Dec 24', grade: 'B', score: 76 },
  { month: 'Jan 25', grade: 'B', score: 78 },
  { month: 'Feb 25', grade: 'B', score: 81 },
  { month: 'Mar 25', grade: 'B', score: 82 },
];

const IMPROVEMENT_ACTIONS: ActionItem[] = [
  {
    kpi: 'OTIF Rate',
    current: '87%',
    target: '≥ 95%',
    gap: '−8pp',
    action:
      'Review production schedule alignment with Paragon delivery windows. Current 7-day overdue on PO-2025-00107 indicates capacity constraint.',
    priority: 'High',
  },
  {
    kpi: 'POA Response Time',
    current: '42 hrs avg',
    target: '≤ 24 hrs',
    gap: '+18 hrs',
    action:
      'Enable WhatsApp PO notification alerts for faster acknowledgement. Assign dedicated PO coordinator for Paragon account.',
    priority: 'Medium',
  },
  {
    kpi: 'Invoice Accuracy',
    current: '91%',
    target: '≥ 98%',
    gap: '−7pp',
    action:
      'Quantity discrepancies detected on PO-2025-00108. Implement pre-shipment count verification before invoice submission.',
    priority: 'Medium',
  },
];

const COUNTRY_FLAGS: Record<string, string> = {
  ID: '🇮🇩',
  CN: '🇨🇳',
  DE: '🇩🇪',
  FR: '🇫🇷',
  MY: '🇲🇾',
  SG: '🇸🇬',
};

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

const TrendIcon: React.FC<{ trend: Trend }> = ({ trend }) => {
  if (trend === '↑')
    return <TrendingUp size={14} className="text-success" aria-hidden="true" />;
  if (trend === '↓')
    return <TrendingDown size={14} className="text-danger" aria-hidden="true" />;
  return <Minus size={14} className="text-text-tertiary" aria-hidden="true" />;
};

const KpiProgressTile: React.FC<{ k: Kpi }> = ({ k }) => {
  const width = Math.min(Math.max(k.pct, 0), 100);
  return (
    <div className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-label text-text-tertiary uppercase">{k.name}</div>
        <TrendIcon trend={k.trend} />
      </div>
      <div className="text-xl font-bold" style={{ color: k.color }}>
        {k.value}
      </div>
      <div className="text-[10px] text-text-tertiary mb-2">
        Target: {k.target}
      </div>
      <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${width}%`, backgroundColor: k.color }}
        />
      </div>
    </div>
  );
};

const GradeBadge: React.FC<{ grade: Grade; score: number }> = ({ grade, score }) => {
  const tone = GRADE_TONE[grade];
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: tone.soft, border: `4px solid ${tone.stroke}` }}
      >
        <span className="text-4xl font-extrabold" style={{ color: tone.stroke }}>
          {grade}
        </span>
      </div>
      <div className="text-base font-bold text-white">{score}/100</div>
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          backgroundColor: `${tone.soft}33`,
          color: tone.stroke,
          border: `1px solid ${tone.stroke}55`,
        }}
      >
        Paragon Grade
      </span>
    </div>
  );
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'actions', label: 'Improvement Actions' },
];

const SupplierPerformance: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const [activeTab, setActiveTab] = useState<string>('overview');

  const mySupplier = useMemo(
    () => mockSuppliers.find((s) => s.id === supplierId),
    [supplierId],
  );

  const myPOs = useMemo(
    () => mockPurchaseOrders.filter((po) => po.supplierId === supplierId),
    [supplierId],
  );
  const lateCount = myPOs.filter((p) => p.daysOverdue > 0).length;
  const onTimeCount = myPOs.filter((p) => p.daysOverdue <= 0).length;
  const avgOverdue =
    lateCount === 0
      ? '0.0d'
      : `${(
          myPOs.filter((p) => p.daysOverdue > 0).reduce((a, b) => a + b.daysOverdue, 0) /
          lateCount
        ).toFixed(1)}d`;

  const exportReport = () =>
    toast({
      variant: 'success',
      title: 'Performance report queued',
      description: 'Downloading performance report PDF...',
    });

  if (!supplierId || !mySupplier) return <NoSupplierIdentity />;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['INTELLIGENCE', 'MY PERFORMANCE']}
        title="My Performance"
        subtitle="Paragon scorecard · Rolling 12-week KPIs · Improvement tracking"
        actions={
          <Button variant="secondary" icon={Download} onClick={exportReport}>
            Export Report
          </Button>
        }
      />

      <section className="bg-navy rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-white mb-2">
              <span className="mr-2">{COUNTRY_FLAGS[mySupplier.country] ?? '●'}</span>
              {mySupplier.name}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-white/10 text-white/85">
                {mySupplier.category}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-white/10 text-white">
                Tier 1 — WhatsApp
              </span>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-white/70">
              <span>
                <span className="text-white/50 font-semibold">SAP BP: </span>
                {mySupplier.sapBpNumber}
              </span>
              <span>
                <span className="text-white/50 font-semibold">Channel: </span>
                WhatsApp
              </span>
              <span>
                <span className="text-white/50 font-semibold">Reporting period: </span>
                Rolling 12 weeks
              </span>
            </div>
          </div>
          <GradeBadge grade={CURRENT_GRADE} score={CURRENT_SCORE} />
        </div>
      </section>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'overview' && (
        <>
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
              KPI Scorecard — 6 metrics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {KPIS.map((k) => (
                <KpiProgressTile key={k.name} k={k} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
                Performance radar — vs Paragon targets
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart
                  data={RADAR_DATA}
                  margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
                >
                  <PolarGrid stroke={TOKEN_BORDER} />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 11, fill: TOKEN_MID }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: TOKEN_MUTED }}
                    axisLine={false}
                    tickCount={6}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="target"
                    stroke={TOKEN_MID}
                    fill="transparent"
                    strokeDasharray="4 2"
                  />
                  <Radar
                    name="Your score"
                    dataKey="value"
                    stroke={TOKEN_TEAL}
                    fill={TOKEN_TEAL}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </section>

            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
                Grade history — monthly score
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={GRADE_HISTORY}
                  margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="score" fill={TOKEN_TEAL} radius={[4, 4, 0, 0]} name="Score" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-2 mt-3 flex-wrap">
                {GRADE_HISTORY.map(({ month, grade, score }) => {
                  const tone = GRADE_TONE[grade];
                  return (
                    <div
                      key={month}
                      className="rounded-md px-2.5 py-1.5 text-center"
                      style={{
                        backgroundColor: tone.soft,
                        border: `1px solid ${tone.stroke}55`,
                      }}
                    >
                      <div className="text-[9px] font-semibold" style={{ color: tone.stroke }}>
                        {month}
                      </div>
                      <div className="text-sm font-extrabold" style={{ color: tone.stroke }}>
                        {grade}
                      </div>
                      <div className="text-[9px]" style={{ color: tone.stroke }}>
                        {score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
              Purchase order performance — {mySupplier.name}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total POs', value: myPOs.length, color: TOKEN_TEAL },
                { label: 'On Time', value: onTimeCount, color: TOKEN_SUCCESS },
                { label: 'Late', value: lateCount, color: TOKEN_DANGER },
                { label: 'Avg Overdue', value: avgOverdue, color: TOKEN_WARNING },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-bg-hover rounded-md px-4 py-3"
                  style={{ borderLeft: `3px solid ${m.color}` }}
                >
                  <div className="text-label text-text-tertiary uppercase mb-1">
                    {m.label}
                  </div>
                  <div className="text-xl font-bold" style={{ color: m.color }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'trends' && (
        <>
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
              OTIF rate — 12-week rolling (%)
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={WEEKLY_TREND}
                margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: TOKEN_MUTED }} interval={1} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="otif"
                  stroke={TOKEN_TEAL}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="OTIF %"
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
                ASN accuracy (%)
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={WEEKLY_TREND}
                  margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
                  <XAxis dataKey="week" tick={{ fontSize: 8, fill: TOKEN_MUTED }} interval={2} />
                  <YAxis domain={[90, 100]} tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="asnAcc"
                    stroke={TOKEN_SUCCESS}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="ASN Accuracy %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
                POA response time (hours)
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={WEEKLY_TREND}
                  margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
                  <XAxis dataKey="week" tick={{ fontSize: 8, fill: TOKEN_MUTED }} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="ackHrs"
                    stroke={TOKEN_WARNING}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Ack Time (hrs)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      )}

      {activeTab === 'actions' && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-text-tertiary">
            Below-target KPIs and recommended corrective actions to improve your Paragon supplier grade.
          </div>
          {IMPROVEMENT_ACTIONS.map((item) => {
            const isHigh = item.priority === 'High';
            return (
              <section
                key={item.kpi}
                className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
                style={{ borderLeft: `4px solid ${isHigh ? TOKEN_DANGER : TOKEN_WARNING}` }}
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-text-primary mb-2">
                      {item.kpi}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill variant="neutral">Current: {item.current}</StatusPill>
                      <StatusPill variant="success">Target: {item.target}</StatusPill>
                      <StatusPill variant="danger">Gap: {item.gap}</StatusPill>
                    </div>
                  </div>
                  <StatusPill variant={isHigh ? 'danger' : 'warning'}>
                    {item.priority} priority
                  </StatusPill>
                </div>
                <div className="text-sm text-text-secondary leading-relaxed mb-4">
                  {item.action}
                </div>
                <Button
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={() =>
                    toast({
                      variant: 'success',
                      title: `Action plan submitted — ${item.kpi}`,
                      description: 'Paragon team notified.',
                    })
                  }
                >
                  Acknowledge & plan
                </Button>
              </section>
            );
          })}
          <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3 flex items-start gap-3">
            <Info size={16} className="text-info mt-0.5 shrink-0" />
            <div className="text-xs text-text-secondary leading-relaxed">
              <span className="font-semibold text-text-primary">Paragon Supplier Tier System:</span>{' '}
              Achieve Grade A (≥ 90/100) for 3 consecutive months to qualify for Tier 1 status —
              faster payment terms (Net 30 → Net 15), priority capacity allocation, and inclusion
              in Paragon strategic supplier development program.
            </div>
          </section>
        </div>
      )}
    </AppShellV2>
  );
};

export default SupplierPerformance;
