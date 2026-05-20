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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Mail,
  MessageCircle,
  Globe,
  Send,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';

type Grade = 'A' | 'B' | 'C' | 'D';
type Trend = '↑' | '↓' | '→';

interface KpiMetric {
  name: string;
  value: string;
  target: string;
  pct: number;
  color: string;
  trend: Trend;
}

interface RadarAxis {
  axis: string;
  value: number;
}

interface CommLogEntry {
  date: string;
  type: string;
  channel: string;
  message: string;
  status: 'Completed' | 'Active' | 'Open' | 'Resolved';
}

interface SuppData {
  id: string;
  name: string;
  country: string;
  category: string;
  tier: string;
  sapBp: string;
  channel: string;
  grade: Grade;
  score: number;
  status: string;
  kpis: KpiMetric[];
  radar: RadarAxis[];
  otifTrend: number[];
  ackSpeedTrend: number[];
  defectTrend: number[];
  impPlan?: boolean;
  commLog: CommLogEntry[];
}

const COUNTRY_FLAGS: Record<string, string> = {
  ID: '🇮🇩',
  CN: '🇨🇳',
  DE: '🇩🇪',
  FR: '🇫🇷',
  MY: '🇲🇾',
  SG: '🇸🇬',
};

const COMPLIANCE_ISSUES: Record<
  string,
  { level: 'expired' | 'expiring' | 'missing'; label: string }
> = {
  'PT Berlina Packaging Indonesia': {
    level: 'missing',
    label: 'BPJPH Halal cert not certified',
  },
  'BASF Personal Care DE': {
    level: 'expiring',
    label: 'ISO 9001 expiring in 83d',
  },
  'Evonik Specialty Chemicals': {
    level: 'expiring',
    label: 'REACH compliance expiring in 85d',
  },
};

const KPI_COLOR_SUCCESS = '#107E3E';
const KPI_COLOR_WARNING = '#B45309';
const KPI_COLOR_DANGER = '#BB0000';

const SUPPLIER_DATA: SuppData[] = [
  {
    id: 'zhejiang',
    name: 'Zhejiang NHU Vitamins Co.',
    country: 'CN',
    category: 'Active Ingredients',
    tier: 'Tier 3 — API',
    sapBp: 'BP-20045',
    channel: 'API',
    grade: 'A',
    score: 94,
    status: 'Preferred Supplier',
    kpis: [
      { name: 'OTIF', value: '94%', target: '95%', pct: 94, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'OTDR', value: '96%', target: '95%', pct: 96, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'PO Ack Rate', value: '100%', target: '95%', pct: 100, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'Ack Speed', value: '6h', target: '<24h', pct: 90, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'Lead Time Adherence', value: '92%', target: '90%', pct: 92, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'GR/PO Variance', value: '−4%', target: '±2%', pct: 50, color: KPI_COLOR_WARNING, trend: '↓' },
      { name: 'Fill Rate', value: '96%', target: '98%', pct: 96, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'Invoice Accuracy', value: '100%', target: '98%', pct: 100, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'QNCR', value: '0.2%', target: '<0.5%', pct: 90, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'Inventory DOS', value: '24 days', target: '14-30d', pct: 80, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'Responsiveness', value: '88/100', target: '≥80', pct: 88, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'Sustainability', value: '82/100', target: '≥75', pct: 82, color: KPI_COLOR_SUCCESS, trend: '↑' },
    ],
    radar: [
      { axis: 'Delivery', value: 94 },
      { axis: 'Quality', value: 96 },
      { axis: 'Commercial', value: 88 },
      { axis: 'Responsiveness', value: 88 },
      { axis: 'Sustainability', value: 82 },
    ],
    otifTrend: [88, 89, 90, 91, 92, 91, 93, 94, 93, 94, 95, 94],
    ackSpeedTrend: [8, 7, 6, 6, 5, 5, 4, 6, 5, 4, 6, 6],
    defectTrend: [0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.2, 0.2, 0.1, 0.2],
    commLog: [
      { date: 'Apr 6 2026', type: 'PO Confirmation', channel: 'API', message: 'PO-2025-00108 confirmed via API in 4 minutes', status: 'Completed' },
      { date: 'Apr 4 2026', type: 'Invoice Submitted', channel: 'Web Portal', message: 'INV-2026-00235 submitted — 3-way match: Perfect', status: 'Completed' },
      { date: 'Apr 1 2026', type: 'ASN Submitted', channel: 'API', message: 'ASN-2026-002 submitted for PO-2025-00108', status: 'Completed' },
      { date: 'Mar 28 2026', type: 'RFQ Response', channel: 'API', message: 'Quotation submitted for RFQ-2026-001 — score: 87/100', status: 'Completed' },
      { date: 'Mar 15 2026', type: 'Inventory Update', channel: 'API Push', message: 'Inventory position updated: Niacinamide B3 — 2,400 KG (24 days)', status: 'Completed' },
    ],
  },
  {
    id: 'berlina',
    name: 'PT Berlina Packaging Indonesia',
    country: 'ID',
    category: 'Packaging Primary',
    tier: 'Tier 1 — WhatsApp',
    sapBp: 'BP-10007',
    channel: 'WhatsApp',
    grade: 'B',
    score: 82,
    status: 'Approved Supplier',
    kpis: [
      { name: 'OTIF', value: '88%', target: '95%', pct: 88, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'OTDR', value: '91%', target: '95%', pct: 91, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'PO Ack Rate', value: '92%', target: '95%', pct: 92, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'Ack Speed', value: '18h', target: '<24h', pct: 75, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'Lead Time Adherence', value: '85%', target: '90%', pct: 85, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'GR/PO Variance', value: '0%', target: '±2%', pct: 100, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'Fill Rate', value: '95%', target: '98%', pct: 95, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'Invoice Accuracy', value: '98%', target: '98%', pct: 98, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'QNCR', value: '0.4%', target: '<0.5%', pct: 70, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'Inventory DOS', value: '18 days', target: '14-30d', pct: 80, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'Responsiveness', value: '80/100', target: '≥80', pct: 80, color: KPI_COLOR_SUCCESS, trend: '↑' },
      { name: 'Sustainability', value: '68/100', target: '≥75', pct: 68, color: KPI_COLOR_WARNING, trend: '↑' },
    ],
    radar: [
      { axis: 'Delivery', value: 88 },
      { axis: 'Quality', value: 91 },
      { axis: 'Commercial', value: 82 },
      { axis: 'Responsiveness', value: 80 },
      { axis: 'Sustainability', value: 68 },
    ],
    otifTrend: [82, 83, 84, 84, 85, 85, 86, 87, 87, 88, 88, 88],
    ackSpeedTrend: [22, 20, 19, 18, 18, 17, 16, 18, 17, 18, 17, 18],
    defectTrend: [0.6, 0.5, 0.5, 0.5, 0.4, 0.4, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3],
    commLog: [
      { date: 'Apr 5 2026', type: 'PO Confirmation', channel: 'WhatsApp', message: 'PO-2025-00107 confirmed via WhatsApp in 3 hours', status: 'Completed' },
      { date: 'Mar 31 2026', type: 'ASN Submitted', channel: 'Web Portal', message: 'ASN-2026-001 submitted for PO-2025-00107', status: 'Completed' },
      { date: 'Mar 15 2026', type: 'Invoice', channel: 'Email', message: 'INV-2026-00198 submitted via email', status: 'Completed' },
      { date: 'Mar 10 2026', type: 'PO Confirmation', channel: 'WhatsApp', message: 'PO-2025-00098 confirmed', status: 'Completed' },
      { date: 'Feb 28 2026', type: 'GR Discrepancy', channel: 'Web Portal', message: 'Short delivery on PO-2025-00091 — 5% variance', status: 'Resolved' },
    ],
  },
  {
    id: 'basf',
    name: 'BASF Personal Care DE',
    country: 'DE',
    category: 'Active Ingredients',
    tier: 'Tier 3 — API',
    sapBp: 'BP-20012',
    channel: 'API',
    grade: 'C',
    score: 74,
    status: 'Conditional — Improvement Plan Active',
    impPlan: true,
    kpis: [
      { name: 'OTIF', value: '78%', target: '95%', pct: 78, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'OTDR', value: '82%', target: '95%', pct: 82, color: KPI_COLOR_WARNING, trend: '↓' },
      { name: 'PO Ack Rate', value: '88%', target: '95%', pct: 88, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'Ack Speed', value: '42h', target: '<24h', pct: 40, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'Lead Time Adherence', value: '74%', target: '90%', pct: 74, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'GR/PO Variance', value: '+1%', target: '±2%', pct: 80, color: KPI_COLOR_SUCCESS, trend: '→' },
      { name: 'Fill Rate', value: '90%', target: '98%', pct: 90, color: KPI_COLOR_WARNING, trend: '↑' },
      { name: 'Invoice Accuracy', value: '85%', target: '98%', pct: 85, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'QNCR', value: '1.2%', target: '<0.5%', pct: 30, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'Inventory DOS', value: '8 days', target: '14-30d', pct: 40, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'Responsiveness', value: '62/100', target: '≥80', pct: 62, color: KPI_COLOR_DANGER, trend: '↓' },
      { name: 'Sustainability', value: '70/100', target: '≥75', pct: 70, color: KPI_COLOR_WARNING, trend: '↑' },
    ],
    radar: [
      { axis: 'Delivery', value: 78 },
      { axis: 'Quality', value: 82 },
      { axis: 'Commercial', value: 74 },
      { axis: 'Responsiveness', value: 62 },
      { axis: 'Sustainability', value: 70 },
    ],
    otifTrend: [85, 84, 82, 83, 81, 80, 79, 78, 78, 79, 78, 78],
    ackSpeedTrend: [28, 30, 32, 29, 31, 33, 35, 34, 36, 34, 33, 34],
    defectTrend: [0.8, 0.9, 1.0, 0.9, 1.1, 1.0, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1],
    commLog: [
      { date: 'Apr 5 2026', type: 'Late Delivery Alert', channel: 'Email', message: 'PO-2025-00099 is 5 days overdue — held at Jakarta Customs', status: 'Open' },
      { date: 'Apr 2 2026', type: 'Improvement Plan', channel: 'Email', message: 'Improvement plan issued — 30-day review period', status: 'Active' },
      { date: 'Mar 28 2026', type: 'PO Confirmation', channel: 'API', message: 'PO-2025-00099 confirmed — 42h delay', status: 'Completed' },
      { date: 'Mar 20 2026', type: 'Invoice Dispute', channel: 'Email', message: 'INV-2026-00201 disputed — PPN calculation error', status: 'Resolved' },
      { date: 'Mar 10 2026', type: 'QNCR Filed', channel: 'Email', message: 'Non-conformance report for batch BAS-2026-0034', status: 'Resolved' },
    ],
  },
];

const EXTRA_SUPPLIERS: SuppData[] = (
  [
    'PT Musim Mas Specialty Fats',
    'PT Halal Emulsifier Nusantara',
    'Givaudan Fragrance SG',
    'PT Ecogreen Oleochemicals',
    'Evonik Specialty FR',
  ] as const
).map((name, i) => ({
  id: `sup-extra-${i}`,
  name,
  country: (['ID', 'ID', 'SG', 'ID', 'FR'] as const)[i],
  category: (['Halal Emulsifier', 'Halal Emulsifier', 'Fragrance', 'Natural Botanical', 'Active Ingredients'] as const)[i],
  tier: (['Tier 2 — Web', 'Tier 1 — WhatsApp', 'Tier 3 — API', 'Tier 2 — Web', 'Tier 2 — Web'] as const)[i],
  sapBp: `BP-2000${10 + i}`,
  channel: (['Web', 'WhatsApp', 'API', 'Web', 'Web'] as const)[i],
  grade: (['A', 'B', 'A', 'B', 'C'] as const)[i],
  score: ([92, 84, 91, 83, 72] as const)[i],
  status: 'Approved Supplier',
  kpis: SUPPLIER_DATA[0].kpis,
  radar: SUPPLIER_DATA[0].radar,
  otifTrend: [82, 84, 85, 87, 88, 89, 90, 91, 91, 92, 92, 91],
  ackSpeedTrend: [12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5],
  defectTrend: [0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.1, 0.2],
  commLog: [],
}));

const ALL_SUPPLIERS: SuppData[] = [...SUPPLIER_DATA, ...EXTRA_SUPPLIERS];

const TARGET_RADAR: RadarAxis[] = [
  { axis: 'Delivery', value: 90 },
  { axis: 'Quality', value: 90 },
  { axis: 'Commercial', value: 90 },
  { axis: 'Responsiveness', value: 90 },
  { axis: 'Sustainability', value: 90 },
];

const OTIF_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GRADE_TONE: Record<Grade, { stroke: string; soft: string; text: string }> = {
  A: { stroke: '#107E3E', soft: '#E8F5EC', text: 'text-success' },
  B: { stroke: '#1E5BAE', soft: '#E5F0FF', text: 'text-info' },
  C: { stroke: '#B45309', soft: '#FEF3D6', text: 'text-warning' },
  D: { stroke: '#BB0000', soft: '#FCE4E4', text: 'text-danger' },
};

const COMM_STATUS_VARIANT: Record<CommLogEntry['status'], 'success' | 'warning' | 'neutral'> = {
  Completed: 'success',
  Resolved: 'success',
  Active: 'neutral',
  Open: 'warning',
};

const TOKEN_TEAL = '#0097A7';
const TOKEN_MID = '#354A5F';
const TOKEN_SUCCESS = '#107E3E';
const TOKEN_DANGER = '#BB0000';
const TOKEN_MUTED = '#6B7785';
const TOKEN_BORDER = '#E5E9EE';

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

const GradeBadge: React.FC<{ grade: Grade }> = ({ grade }) => {
  const tone = GRADE_TONE[grade];
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: tone.soft,
        border: `4px solid ${tone.stroke}`,
      }}
    >
      <span
        className="text-4xl font-extrabold"
        style={{ color: tone.stroke }}
      >
        {grade}
      </span>
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

const KpiProgressTile: React.FC<{ k: KpiMetric }> = ({ k }) => {
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

const CHANNEL_ICON_MAP: Record<string, LucideIcon> = {
  API: Send,
  'API Push': Send,
  Email: Mail,
  WhatsApp: MessageCircle,
  'Web Portal': Globe,
  Web: Globe,
};

const channelIcon = (channel: string): LucideIcon =>
  CHANNEL_ICON_MAP[channel] ?? Send;

interface ImprovementAction {
  item: string;
  due: string;
  owner: string;
  status: 'In Progress' | 'Pending';
}

const IMPROVEMENT_ACTIONS: ImprovementAction[] = [
  { item: 'Reduce PO acknowledgment time to <24h', due: 'Apr 30 2026', owner: 'Supplier OPS Team', status: 'In Progress' },
  { item: 'Resolve quality non-conformance batch BAS-2026-0034 root cause', due: 'Apr 20 2026', owner: 'Quality Dept', status: 'In Progress' },
  { item: 'Improve lead time adherence from 74% to ≥85%', due: 'May 31 2026', owner: 'Production Planning', status: 'Pending' },
];

const BuyerScorecard: React.FC = () => {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>('zhejiang');

  const supp = useMemo(
    () => ALL_SUPPLIERS.find((s) => s.id === selectedId) ?? ALL_SUPPLIERS[0],
    [selectedId],
  );

  const compliance = COMPLIANCE_ISSUES[supp.name];
  const tone = GRADE_TONE[supp.grade];

  const trendData = supp.otifTrend.map((v, i) => ({
    month: OTIF_MONTHS[i],
    otif: v,
    ackSpeed: supp.ackSpeedTrend[i],
    defect: supp.defectTrend[i],
  }));

  const radarData = supp.radar.map((r, i) => ({
    ...r,
    target: TARGET_RADAR[i]?.value ?? 90,
  }));

  const latestCommDate = supp.commLog[0]?.date ?? '—';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['INTELLIGENCE', 'SUPPLIER SCORECARD']}
        title="Supplier Scorecard"
        subtitle="Real-time performance scoring across all active suppliers."
        actions={
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-10 min-w-[260px] px-3 text-sm text-text-primary bg-bg-surface border border-border-input rounded-md focus:outline-none focus:border-teal cursor-pointer"
            aria-label="Select supplier"
          >
            {ALL_SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {ALL_SUPPLIERS.length} suppliers · last activity {latestCommDate}
      </PageMetaLine>

      <section className="bg-navy rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-white mb-2">
              <span className="mr-2">{COUNTRY_FLAGS[supp.country] ?? '●'}</span>
              {supp.name}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-white/10 text-white/85">
                {supp.category}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-white/10 text-white">
                {supp.tier}
              </span>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-white/70">
              <span>
                <span className="text-white/50 font-semibold">SAP BP: </span>
                {supp.sapBp}
              </span>
              <span>
                <span className="text-white/50 font-semibold">Channel: </span>
                {supp.channel}
              </span>
            </div>
            {compliance && (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded px-3 py-2 text-xs font-medium ${
                  compliance.level === 'expiring'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-danger-soft text-danger'
                }`}
              >
                <AlertTriangle size={14} />
                <span>Compliance alert: {compliance.label}</span>
                <span className="ml-2 text-text-tertiary font-normal">
                  See Compliance Tracker →
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            <GradeBadge grade={supp.grade} />
            <div className="text-base font-bold text-white">
              {supp.score}/100
            </div>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `${tone.soft}33`,
                color: tone.stroke,
                border: `1px solid ${tone.stroke}55`,
              }}
            >
              {supp.status}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
          KPI Scorecard — 12 metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {supp.kpis.map((k) => (
            <KpiProgressTile key={k.name} k={k} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
            Score breakdown — radar
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart
              data={radarData}
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
                name={supp.name.split(' ')[0]}
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
          <h2 className="text-base font-semibold text-text-primary mb-1 pb-3 border-b border-border-subtle">
            Performance trends — 12 months
          </h2>
          <div className="text-meta text-text-tertiary mb-3 mt-3">
            OTIF % (left axis) · Ack Speed in hours · Defect Rate %
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 40, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
              <YAxis
                yAxisId="pct"
                domain={[60, 100]}
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
              />
              <YAxis
                yAxisId="hrs"
                orientation="right"
                domain={[0, 40]}
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                yAxisId="pct"
                y={95}
                stroke={TOKEN_SUCCESS}
                strokeDasharray="4 2"
                label={{
                  value: 'OTIF target',
                  fill: TOKEN_SUCCESS,
                  fontSize: 9,
                  position: 'insideTopRight',
                }}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="otif"
                stroke={TOKEN_TEAL}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                name="OTIF %"
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="hrs"
                type="monotone"
                dataKey="ackSpeed"
                stroke={TOKEN_MID}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                name="Ack Speed (h)"
                strokeDasharray="4 2"
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="defect"
                stroke={TOKEN_DANGER}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                name="Defect Rate %"
                strokeDasharray="2 2"
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      {supp.impPlan && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
          <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger font-semibold flex items-center gap-2">
            <AlertTriangle size={14} />
            This supplier is on a Conditional rating — improvement plan
            active. 30-day review period.
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
            Improvement plan — action items
          </h2>
          <div className="flex flex-col gap-2 mb-4">
            {IMPROVEMENT_ACTIONS.map((a) => (
              <div
                key={a.item}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-danger-soft/40 border border-danger-soft rounded-md"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {a.item}
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    Owner: {a.owner}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <div className="text-xs text-text-tertiary">
                    Due: {a.due}
                  </div>
                  <StatusPill variant="neutral">{a.status}</StatusPill>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            icon={Mail}
            onClick={() =>
              toast({
                variant: 'success',
                title: `Improvement plan sent to ${supp.name}`,
                description: 'Delivered via email.',
              })
            }
          >
            Send improvement plan
          </Button>
        </section>
      )}

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
          Communication log — last 5 interactions
        </h2>
        {supp.commLog.length === 0 ? (
          <div className="text-sm text-text-tertiary text-center py-6">
            No communication log entries.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {supp.commLog.map((log, i) => {
              const Icon = channelIcon(log.channel);
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 px-4 py-3 bg-bg-hover border border-border-subtle rounded-md"
                >
                  <div className="shrink-0 text-center min-w-[88px]">
                    <div className="text-xs text-text-tertiary whitespace-nowrap">
                      {log.date}
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-teal font-semibold mt-1">
                      <Icon size={12} />
                      {log.channel}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-text-secondary mb-0.5">
                      {log.type}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {log.message}
                    </div>
                  </div>
                  <StatusPill variant={COMM_STATUS_VARIANT[log.status]}>
                    {log.status}
                  </StatusPill>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

export default BuyerScorecard;
