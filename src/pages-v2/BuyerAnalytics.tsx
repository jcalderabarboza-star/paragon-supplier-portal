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
  LucideIcon,
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
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import {
  CHART_SERIES,
  CHART_SEMANTIC,
  CHART_MID,
  CHART_GRID,
  targetStatus,
} from '../lib/chartPalette';
import {
  useAnalyticsSummary,
  useSpendByCategory,
  useTopSuppliers,
  useOtifTrend,
  usePoVolumeTrend,
  useChannelMix,
  useSupplierPerformance,
} from '../services/query/hooks';
import type {
  KpiTrend as Trend,
  KpiTone,
  AnalyticsGrade as Grade,
  AnalyticsSummary,
} from '../services/data/types';

type Period = '30d' | '90d' | 'ytd';

const ANALYTICS_CRUMB = ['INTELLIGENCE', 'ANALYTICS'];

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'ytd', label: 'YTD' },
];

// DP2-PALETTE-01: chart/UI colour sourced from the central palette (SSoT),
// not page-local hex. Values unchanged — pure de-dup. This completes the
// BuyerAnalytics migration flagged in Commit 1 (non-channel charts now central).
const TOKEN_TEAL = CHART_SERIES[0];
const TOKEN_NAVY = CHART_SERIES[1];
const TOKEN_MID = CHART_MID;
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
const TOKEN_MUTED = CHART_SEMANTIC.neutral;
const TOKEN_BORDER = CHART_GRID;

const GRADE_VARIANT: Record<Grade, 'success' | 'info' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'danger',
};

const TONE_CLASS: Record<KpiTone, string> = {
  success: 'text-success',
  warning: 'text-warning-hover',
  danger: 'text-danger',
  neutral: 'text-text-tertiary',
};

const ToneIcon: React.FC<{ tone: KpiTone }> = ({ tone }) => {
  if (tone === 'success')
    return <TrendingUp size={12} className="inline-block mr-1" aria-hidden="true" />;
  if (tone === 'danger')
    return <TrendingDown size={12} className="inline-block mr-1" aria-hidden="true" />;
  return <Minus size={12} className="inline-block mr-1" aria-hidden="true" />;
};

const SUMMARY_CARDS: {
  key: keyof AnalyticsSummary;
  eyebrow: string;
  icon: LucideIcon;
}[] = [
  { key: 'totalSpend', eyebrow: 'Total Spend YTD', icon: Wallet },
  { key: 'activeSuppliers', eyebrow: 'Active Suppliers', icon: Users },
  { key: 'portfolioOtif', eyebrow: 'Portfolio OTIF', icon: Activity },
  { key: 'avgCycleTime', eyebrow: 'Avg PO Cycle Time', icon: Clock },
];

// DP2-TARGET-01: pass-warn-fail cells derive from the central target-status
// system (target 90 → meeting ≥90 / near ≥80 / missing) — one threshold source.
const rateVariant = (v: number): 'success' | 'warning' | 'danger' => {
  const s = targetStatus(v, 90);
  return s === 'meeting' ? 'success' : s === 'near' ? 'warning' : 'danger';
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

// `total` is supplied by the page (computed from the fetched spend rows);
// Recharts merges the injected active/payload props onto this element.
const PieTooltip: React.FC<ChartTooltipProps & { total?: number }> = ({
  active,
  payload,
  total = 0,
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0';
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

  const summaryQuery = useAnalyticsSummary();
  const spendQuery = useSpendByCategory();
  const topQuery = useTopSuppliers();
  const otifQuery = useOtifTrend();
  const poQuery = usePoVolumeTrend();
  const channelQuery = useChannelMix();
  const perfQuery = useSupplierPerformance();

  const summary = summaryQuery.data ?? null;
  const spendCat = spendQuery.data?.items ?? [];
  const topSuppliers = topQuery.data?.items ?? [];
  const otifData = otifQuery.data?.items ?? [];
  const poVolData = poQuery.data?.items ?? [];
  const channelData = channelQuery.data?.items ?? [];
  const perfTable = perfQuery.data?.items ?? [];

  const queries = [
    summaryQuery,
    spendQuery,
    topQuery,
    otifQuery,
    poQuery,
    channelQuery,
    perfQuery,
  ];
  const anyPending = queries.some((q) => q.isPending);
  const anyError = queries.some((q) => q.isError);
  const allEmpty =
    !summary &&
    spendCat.length === 0 &&
    topSuppliers.length === 0 &&
    otifData.length === 0 &&
    poVolData.length === 0 &&
    channelData.length === 0 &&
    perfTable.length === 0;

  const totalSpend = spendCat.reduce((a, b) => a + b.value, 0);
  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? 'YTD';

  if (anyPending) return <LoadingState breadcrumb={ANALYTICS_CRUMB} />;
  if (anyError)
    return (
      <ErrorState
        breadcrumb={ANALYTICS_CRUMB}
        error={queries.find((q) => q.isError)?.error}
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );
  if (allEmpty)
    return (
      <EmptyState
        breadcrumb={ANALYTICS_CRUMB}
        title="No analytics yet"
        subtitle="Procurement intelligence is a buyer-side view."
        message="Spend, performance, and channel-adoption insights appear here for buyer accounts."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ANALYTICS_CRUMB}
        title="Analytics & Procurement Intelligence"
        subtitle="YTD performance metrics and procurement insights."
        actions={
          <BulkActionsBar
            actions={[
              {
                label: 'Export Report',
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: 'Report export starting',
                  }),
              },
            ]}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {perfTable.length} suppliers · period: {periodLabel}
      </PageMetaLine>

      <div className="mb-6">
        <FilterChipsBar<Period>
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {SUMMARY_CARDS.map((card) => {
            const kpi = summary[card.key];
            return (
              <KpiCard
                key={card.key}
                eyebrow={card.eyebrow}
                value={kpi.value}
                subtitle={
                  <span className={`${TONE_CLASS[kpi.tone]} font-medium`}>
                    <ToneIcon tone={kpi.tone} />
                    {kpi.subtitle}
                  </span>
                }
                icon={card.icon}
              />
            );
          })}
        </div>
      )}

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
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
                  data={spendCat}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                >
                  {spendCat.map((e) => (
                    <Cell key={e.category} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip total={totalSpend} />} />
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
                data={topSuppliers}
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
          <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
            Monthly OTIF & OTDR trend (%)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={otifData}
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
          <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
            PO volume & avg cycle time
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart
              data={poVolData}
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
          <h2 className="text-section text-text-primary">
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
            {perfTable.map((row) => (
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
        <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
          Digital channel adoption — PO confirmations (%)
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={channelData}
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
            {/* Channels are CATEGORIES, not state — one ordered accent ramp,
                never semantic green/red (that read as good/bad here). */}
            <Bar dataKey="whatsapp" stackId="a" fill={CHART_SERIES[0]} name="WhatsApp" />
            <Bar dataKey="web" stackId="a" fill={CHART_SERIES[1]} name="Web Portal" />
            <Bar dataKey="email" stackId="a" fill={CHART_SERIES[2]} name="Email" />
            <Bar
              dataKey="api"
              stackId="a"
              fill={CHART_SERIES[3]}
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
