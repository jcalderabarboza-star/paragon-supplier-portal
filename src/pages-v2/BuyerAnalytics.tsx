import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import {
  Wallet,
  Users,
  Activity,
  Clock,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import { useToast } from '../hooks/useToast';

type Period = '30d' | '90d' | 'ytd';
type Grade = 'A' | 'B' | 'C' | 'D';
type Trend = '↑' | '↓' | '→';

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'ytd', label: 'YTD' },
];

const TOKEN_TEAL = '#0097A7';
const TOKEN_NAVY = '#0D1B2A';
const TOKEN_MID = '#354A5F';
const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_DANGER = '#BB0000';
const TOKEN_INFO = '#1E5BAE';
const TOKEN_MUTED = '#6B7785';
const TOKEN_BORDER = '#E5E9EE';

const SPEND_CAT: { category: string; value: number; color: string }[] = [
  { category: 'Active Ingredients', value: 1260, color: TOKEN_TEAL },
  { category: 'Fragrance', value: 840, color: TOKEN_MID },
  { category: 'Packaging Primary', value: 630, color: TOKEN_SUCCESS },
  { category: 'Natural/Botanical', value: 504, color: TOKEN_WARNING },
  { category: 'Packaging Secondary', value: 420, color: TOKEN_INFO },
  { category: 'Halal Emulsifiers', value: 336, color: TOKEN_NAVY },
  { category: 'Other', value: 210, color: TOKEN_MUTED },
];
const TOTAL_SPEND = SPEND_CAT.reduce((a, b) => a + b.value, 0);

const TOP_SUPPLIERS = [
  { supplier: 'PT Berlina Packaging', spend: 820 },
  { supplier: 'Zhejiang NHU Vitamins', spend: 680 },
  { supplier: 'BASF Personal Care DE', spend: 540 },
  { supplier: 'PT Musim Mas Specialty', spend: 420 },
  { supplier: 'PT Halal Emulsifier Nusantara', spend: 380 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const OTIF_VALS = [82, 84, 83, 85, 86, 84, 87, 88, 86, 87, 88, 87, 87, 88, 87];
const OTDR_VALS = [85, 86, 87, 88, 87, 89, 90, 91, 89, 91, 92, 91, 91, 92, 91];
const OTIF_DATA = OTIF_VALS.map((v, i) => ({
  month: MONTHS[i],
  otif: v,
  otdr: OTDR_VALS[i],
}));

const PO_VOLS = [3, 4, 3, 5, 4, 6, 5, 4, 5, 6, 4, 5, 4, 5, 3];
const CYCLE_VALS = [48, 42, 38, 35, 32, 30, 28, 26, 28, 25, 24, 23, 22, 21, 22];
const PO_VOL_DATA = PO_VOLS.map((v, i) => ({
  month: MONTHS[i],
  pos: v,
  cycleTime: CYCLE_VALS[i],
}));

const CHANNEL_DATA = [
  { month: 'Oct', whatsapp: 20, web: 15, email: 55, api: 10 },
  { month: 'Nov', whatsapp: 25, web: 18, email: 47, api: 10 },
  { month: 'Dec', whatsapp: 30, web: 20, email: 40, api: 10 },
  { month: 'Jan', whatsapp: 35, web: 22, email: 33, api: 10 },
  { month: 'Feb', whatsapp: 40, web: 24, email: 26, api: 10 },
  { month: 'Mar', whatsapp: 45, web: 25, email: 20, api: 10 },
];

interface PerfRow {
  supplier: string;
  category: string;
  otif: number;
  otdr: number;
  ackSpeed: string;
  invoiceMatch: string;
  grade: Grade;
  trend: Trend;
}

const PERF_TABLE: PerfRow[] = [
  { supplier: 'PT Berlina Packaging Indonesia', category: 'Packaging Primary', otif: 88, otdr: 91, ackSpeed: '18h', invoiceMatch: '98%', grade: 'B', trend: '↑' },
  { supplier: 'Zhejiang NHU Vitamins Co.', category: 'Active Ingredients', otif: 94, otdr: 96, ackSpeed: '6h', invoiceMatch: '100%', grade: 'A', trend: '↑' },
  { supplier: 'BASF Personal Care DE', category: 'Active Ingredients', otif: 78, otdr: 82, ackSpeed: '42h', invoiceMatch: '85%', grade: 'C', trend: '↓' },
  { supplier: 'PT Musim Mas Specialty Fats', category: 'Halal Emulsifier', otif: 92, otdr: 94, ackSpeed: '12h', invoiceMatch: '97%', grade: 'A', trend: '→' },
  { supplier: 'PT Halal Emulsifier Nusantara', category: 'Halal Emulsifier', otif: 85, otdr: 88, ackSpeed: '24h', invoiceMatch: '95%', grade: 'B', trend: '↑' },
  { supplier: 'Givaudan Fragrance SG', category: 'Fragrance', otif: 91, otdr: 93, ackSpeed: '8h', invoiceMatch: '99%', grade: 'A', trend: '→' },
  { supplier: 'PT Ecogreen Oleochemicals', category: 'Natural Botanical', otif: 82, otdr: 85, ackSpeed: '30h', invoiceMatch: '92%', grade: 'B', trend: '↑' },
  { supplier: 'Evonik Specialty FR', category: 'Active Ingredients', otif: 72, otdr: 76, ackSpeed: '56h', invoiceMatch: '88%', grade: 'C', trend: '↓' },
];

const GRADE_VARIANT: Record<Grade, 'success' | 'info' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'danger',
};

const rateVariant = (v: number): 'success' | 'warning' | 'danger' => {
  if (v >= 90) return 'success';
  if (v >= 80) return 'warning';
  return 'danger';
};

const TrendIcon: React.FC<{ trend: Trend }> = ({ trend }) => {
  if (trend === '↑')
    return <TrendingUp size={14} className="text-success inline-block" aria-hidden="true" />;
  if (trend === '↓')
    return <TrendingDown size={14} className="text-danger inline-block" aria-hidden="true" />;
  return <Minus size={14} className="text-text-tertiary inline-block" aria-hidden="true" />;
};

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
  unit?: string;
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
          {p.unit ?? ''}
        </div>
      ))}
    </div>
  );
};

const PieTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = ((p.value / TOTAL_SPEND) * 100).toFixed(1);
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary">{p.name}</div>
      <div className="text-text-secondary mt-0.5">
        Rp {p.value}jT ({pct}%)
      </div>
    </div>
  );
};

const BuyerAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('ytd');

  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? 'YTD';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['INTELLIGENCE', 'ANALYTICS']}
        title="Analytics & Procurement Intelligence"
        subtitle="YTD performance metrics and procurement insights."
        actions={
          <BulkActionsBar
            primary={{
              label: 'Export Report',
              icon: FileSpreadsheet,
              onClick: () =>
                toast({
                  variant: 'info',
                  title: 'Report export starting',
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {PERF_TABLE.length} suppliers · period: {periodLabel}
      </PageMetaLine>

      <div className="mb-6">
        <FilterChipsBar<Period>
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Total Spend YTD"
          value="Rp 4.2B"
          subtitle={
            <span className="text-success font-medium">
              <TrendingUp size={12} className="inline-block mr-1" />
              +12% vs last year · 8 categories
            </span>
          }
          icon={Wallet}
        />
        <KpiCard
          eyebrow="Active Suppliers"
          value="12"
          subtitle={
            <span className="text-success font-medium">
              <TrendingUp size={12} className="inline-block mr-1" />
              2 onboarding · 8 Grade A or B
            </span>
          }
          icon={Users}
        />
        <KpiCard
          eyebrow="Portfolio OTIF"
          value="87%"
          subtitle={
            <span className="text-danger font-medium">
              <TrendingDown size={12} className="inline-block mr-1" />
              -3pp vs target 90% · 15-mo avg
            </span>
          }
          icon={Activity}
        />
        <KpiCard
          eyebrow="Avg PO Cycle Time"
          value="28h"
          subtitle={
            <span className="text-success font-medium">
              <TrendingUp size={12} className="inline-block mr-1" />
              -42% vs 6 months ago
            </span>
          }
          icon={Clock}
        />
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
          Spend Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
          <div>
            <div className="text-meta text-text-secondary mb-2">
              Spend by category (Rp jT)
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={SPEND_CAT}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                >
                  {SPEND_CAT.map((e) => (
                    <Cell key={e.category} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(val) => (
                    <span className="text-xs text-text-secondary">{val}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="text-meta text-text-secondary mb-2">
              Top 5 suppliers by spend (Rp jT)
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={TOP_SUPPLIERS}
                layout="vertical"
                margin={{ left: 10, right: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={TOKEN_BORDER}
                />
                <XAxis type="number" tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
                <YAxis
                  type="category"
                  dataKey="supplier"
                  width={130}
                  tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="spend"
                  fill={TOKEN_TEAL}
                  radius={[0, 4, 4, 0]}
                  label={{
                    position: 'right',
                    fontSize: 10,
                    fill: TOKEN_MID,
                    formatter: (v: number) => `${v}jT`,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
            Monthly OTIF & OTDR trend (%)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={OTIF_DATA}
              margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                interval={1}
              />
              <YAxis
                domain={[75, 100]}
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={90}
                stroke={TOKEN_DANGER}
                strokeDasharray="4 2"
                label={{
                  value: 'Target 90%',
                  fill: TOKEN_DANGER,
                  fontSize: 9,
                  position: 'insideTopRight',
                }}
              />
              <Line
                type="monotone"
                dataKey="otif"
                stroke={TOKEN_TEAL}
                strokeWidth={2}
                dot={{ r: 2 }}
                name="OTIF"
              />
              <Line
                type="monotone"
                dataKey="otdr"
                stroke={TOKEN_NAVY}
                strokeWidth={2}
                dot={{ r: 2 }}
                name="OTDR"
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
            PO volume & avg cycle time
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart
              data={PO_VOL_DATA}
              margin={{ top: 10, right: 30, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                interval={1}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                label={{
                  value: 'POs',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 9,
                  fill: TOKEN_MUTED,
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                label={{
                  value: 'Hours',
                  angle: 90,
                  position: 'insideRight',
                  fontSize: 9,
                  fill: TOKEN_MUTED,
                }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="pos"
                fill={TOKEN_TEAL}
                opacity={0.85}
                name="POs"
              />
              <Line
                yAxisId="right"
                dataKey="cycleTime"
                stroke={TOKEN_WARNING}
                strokeWidth={2}
                dot={{ r: 2 }}
                name="Cycle Time (h)"
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            Supplier performance summary — YTD
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>OTIF</TableHeaderCell>
            <TableHeaderCell>OTDR</TableHeaderCell>
            <TableHeaderCell>Ack speed</TableHeaderCell>
            <TableHeaderCell>Invoice match</TableHeaderCell>
            <TableHeaderCell>Grade</TableHeaderCell>
            <TableHeaderCell>Trend</TableHeaderCell>
          </TableHeader>
          <tbody>
            {PERF_TABLE.map((row) => (
              <TableRow key={row.supplier}>
                <TableCell>
                  <span className="font-semibold text-text-primary">
                    {row.supplier}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusPill variant="neutral">{row.category}</StatusPill>
                </TableCell>
                <TableCell>
                  <StatusPill variant={rateVariant(row.otif)}>
                    {row.otif}%
                  </StatusPill>
                </TableCell>
                <TableCell>
                  <StatusPill variant={rateVariant(row.otdr)}>
                    {row.otdr}%
                  </StatusPill>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {row.ackSpeed}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {row.invoiceMatch}
                </TableCell>
                <TableCell>
                  <StatusPill variant={GRADE_VARIANT[row.grade]}>
                    {row.grade}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  <TrendIcon trend={row.trend} />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </section>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
          Digital channel adoption — PO confirmations (%)
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={CHANNEL_DATA}
            margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
            <YAxis
              tick={{ fontSize: 11, fill: TOKEN_MUTED }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(v: number) => [`${v}%`, '']}
              contentStyle={{
                border: `1px solid ${TOKEN_BORDER}`,
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="whatsapp" stackId="a" fill={TOKEN_SUCCESS} name="WhatsApp" />
            <Bar dataKey="web" stackId="a" fill={TOKEN_TEAL} name="Web Portal" />
            <Bar dataKey="email" stackId="a" fill={TOKEN_DANGER} name="Email" />
            <Bar
              dataKey="api"
              stackId="a"
              fill={TOKEN_MID}
              name="API/EDI"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </AppShellV2>
  );
};

export default BuyerAnalytics;
