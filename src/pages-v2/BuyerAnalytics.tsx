import React, { useState } from 'react';
import { legendLabel } from '../lib/chartLegend';
import { useTranslation } from 'react-i18next';
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
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import { IllustrativeBanner, IllustrativeMark } from '../components/ui-v2/IllustrativeNotice';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import { Card } from '../components/ui-v2/Card';
import DataTable from '../components/ui-v2/DataTable';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import {
  CHART_SERIES,
  CHART_SEMANTIC,
  CHART_GRID,
  CHART_TICK,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_STYLE,
  chartLabel,
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
import SectionHeading from '../components/ui-v2/SectionHeading';

type Period = '30d' | '90d' | 'ytd';

// Canonical period ids (drive filter state / comparison — stay EN). The visible
// label localizes at render via t('buyerAnalytics.period.<id>').
const PERIOD_IDS: Period[] = ['30d', '90d', 'ytd'];

// DP2-PALETTE-01: chart/UI colour sourced from the central palette (SSoT),
// not page-local hex. Values unchanged — pure de-dup. This completes the
// BuyerAnalytics migration flagged in Commit 1 (non-channel charts now central).
const TOKEN_TEAL = CHART_SERIES[0];
const TOKEN_NAVY = CHART_SERIES[1];
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
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
  danger: 'text-critical',
  neutral: 'text-text-tertiary',
};

const ToneIcon: React.FC<{ tone: KpiTone }> = ({ tone }) => {
  if (tone === 'success')
    return <TrendingUp size={12} className="inline-block mr-1" aria-hidden="true" />;
  if (tone === 'danger')
    return <TrendingDown size={12} className="inline-block mr-1" aria-hidden="true" />;
  return <Minus size={12} className="inline-block mr-1" aria-hidden="true" />;
};

// Eyebrow localizes at render via t('buyerAnalytics.summary.<key>').
const SUMMARY_CARDS: {
  key: keyof AnalyticsSummary;
  icon: LucideIcon;
}[] = [
  { key: 'totalSpend', icon: Wallet },
  { key: 'activeSuppliers', icon: Users },
  { key: 'portfolioOtif', icon: Activity },
  { key: 'avgCycleTime', icon: Clock },
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
    return <TrendingDown size={14} className="text-critical inline-block" aria-hidden="true" />;
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('ytd');

  const ANALYTICS_CRUMB = [
    t('buyerAnalytics.crumb.analytics'),
  ];
  const PERIOD_OPTIONS: { id: Period; label: string }[] = PERIOD_IDS.map(
    (id) => ({ id, label: t(`buyerAnalytics.period.${id}`) }),
  );

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
    PERIOD_OPTIONS.find((o) => o.id === period)?.label ??
    t('buyerAnalytics.period.ytd');

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
        title={t('buyerAnalytics.empty.title')}
        subtitle={t('buyerAnalytics.empty.subtitle')}
        message={t('buyerAnalytics.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ANALYTICS_CRUMB}
        title={t('buyerAnalytics.header.title')}
        subtitle={t('buyerAnalytics.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('buyerAnalytics.action.export'),
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('buyerAnalytics.toast.exportStarting'),
                  }),
              },
            ]}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          perfTable.length === 1
            ? 'buyerAnalytics.meta.suppliers.one'
            : 'buyerAnalytics.meta.suppliers.other',
          { count: perfTable.length },
        )}{' '}
        · {t('buyerAnalytics.meta.period')}: {periodLabel}
        {/* D-CENSUS-8 — `analytics` is null-backed: every trend, mix and spend
            aggregate on this page is derived from authored fixtures, over a period
            label that names a range no real data covers. */}
        <ProvenanceMarker capability="analytics" className="ml-3 align-middle" />
      </PageMetaLine>

      <IllustrativeBanner bodyKey="buyerAnalytics.illustrative.body" />

      <div className="mb-6">
        <FilterChipsBar<Period>
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
        {/* SUP-2 - said where the control is: the chips name a period and the
            sample figures below do not move with it. */}
        <p className="text-xs text-text-tertiary mt-2" data-testid="analytics-period-note">
          {t('buyerAnalytics.period.note')}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {SUMMARY_CARDS.map((card) => {
            const kpi = summary[card.key];
            return (
              <KpiCard
                key={card.key}
                eyebrow={t(`buyerAnalytics.summary.${card.key}`)}
                value={kpi.value}
                subtitle={
                  <>
                    <span className={`${TONE_CLASS[kpi.tone]} font-medium`}>
                      <ToneIcon tone={kpi.tone} />
                      {kpi.subtitle}
                    </span>{' '}
                    <IllustrativeMark />
                  </>
                }
                icon={card.icon}
              />
            );
          })}
        </div>
      )}

      <Card as="section" padding="lg" className="mb-6">
        <SectionHeading className="mb-4 pb-3 border-b border-border-subtle">
          {t('buyerAnalytics.spend.title')}{' '}
          <IllustrativeMark />
        </SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
          <div>
            <div className="text-meta text-text-secondary mb-2">
              {t('buyerAnalytics.spend.byCategory')}
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
              {t('buyerAnalytics.spend.topSuppliers')}
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
                <XAxis type="number" tick={CHART_TICK} />
                <YAxis
                  type="category"
                  dataKey="supplier"
                  width={130}
                  tick={CHART_TICK}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="spend"
                  fill={TOKEN_TEAL}
                  radius={[0, 4, 4, 0]}
                  label={chartLabel({
                    position: 'right' as const,
                    formatter: (v: number) => `${v}jT`,
                  })}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <Card as="section" padding="lg">
          <SectionHeading className="mb-4 pb-3 border-b border-border-subtle">
            {t('buyerAnalytics.otif.title')}{' '}
            <IllustrativeMark />
          </SectionHeading>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={otifData}
              margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
              <XAxis
                dataKey="month"
                tick={CHART_TICK}
                interval={1}
              />
              <YAxis
                domain={[75, 100]}
                tick={CHART_TICK}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={90}
                stroke={TOKEN_DANGER}
                strokeDasharray="4 2"
                label={chartLabel({
                  value: t('buyerAnalytics.otif.target'),
                  fill: TOKEN_DANGER,
                  position: 'insideTopRight' as const,
                })}
              />
              <Line
                type="monotone"
                dataKey="otif"
                stroke={TOKEN_TEAL}
                strokeWidth={2}
                dot={{ r: 2 }}
                name={t('buyerAnalytics.series.otif')}
              />
              <Line
                type="monotone"
                dataKey="otdr"
                stroke={TOKEN_NAVY}
                strokeWidth={2}
                dot={{ r: 2 }}
                name={t('buyerAnalytics.series.otdr')}
              />
              <Legend iconSize={10} wrapperStyle={CHART_LEGEND_STYLE} formatter={legendLabel} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card as="section" padding="lg">
          <SectionHeading className="mb-4 pb-3 border-b border-border-subtle">
            {t('buyerAnalytics.poVolume.title')}{' '}
            <IllustrativeMark />
          </SectionHeading>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart
              data={poVolData}
              margin={{ top: 10, right: 30, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
              <XAxis
                dataKey="month"
                tick={CHART_TICK}
                interval={1}
              />
              <YAxis
                yAxisId="left"
                tick={CHART_TICK}
                label={chartLabel({
                  value: t('buyerAnalytics.poVolume.axisPos'),
                  angle: -90,
                  position: 'insideLeft',
                })}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={CHART_TICK}
                label={chartLabel({
                  value: t('buyerAnalytics.poVolume.axisHours'),
                  angle: 90,
                  position: 'insideRight',
                })}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="pos"
                fill={TOKEN_TEAL}
                opacity={0.85}
                name={t('buyerAnalytics.series.pos')}
              />
              <Line
                yAxisId="right"
                dataKey="cycleTime"
                stroke={TOKEN_WARNING}
                strokeWidth={2}
                dot={{ r: 2 }}
                name={t('buyerAnalytics.series.cycleTime')}
              />
              <Legend iconSize={10} wrapperStyle={CHART_LEGEND_STYLE} formatter={legendLabel} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card as="section" padding="none" className="overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border-subtle">
          <SectionHeading>
            {t('buyerAnalytics.perf.title')}{' '}
            <IllustrativeMark />
          </SectionHeading>
        </div>
        <DataTable<(typeof perfTable)[number]>
          card={false}
          rows={perfTable}
          rowKey={(row) => row.supplier}
          columns={[
            {
              id: 'supplier',
              header: t('buyerAnalytics.perf.col.supplier'),
              kind: 'text',
              cell: (row) => row.supplier,
            },
            {
              id: 'category',
              header: t('buyerAnalytics.perf.col.category'),
              kind: 'status',
              cell: (row) => <StatusPill variant="neutral">{row.category}</StatusPill>,
            },
            {
              id: 'otif',
              header: t('buyerAnalytics.perf.col.otif'),
              kind: 'status',
              cell: (row) => (
                <StatusPill variant={rateVariant(row.otif)}>
                  {row.otif}%
                </StatusPill>
              ),
            },
            {
              id: 'otdr',
              header: t('buyerAnalytics.perf.col.otdr'),
              kind: 'status',
              cell: (row) => (
                <StatusPill variant={rateVariant(row.otdr)}>
                  {row.otdr}%
                </StatusPill>
              ),
            },
            {
              id: 'ackSpeed',
              header: t('buyerAnalytics.perf.col.ackSpeed'),
              kind: 'text',
              cell: (row) => row.ackSpeed,
            },
            {
              id: 'invoiceMatch',
              header: t('buyerAnalytics.perf.col.invoiceMatch'),
              kind: 'text',
              cell: (row) => row.invoiceMatch,
            },
            {
              id: 'grade',
              header: t('buyerAnalytics.perf.col.grade'),
              kind: 'status',
              cell: (row) => (
                <StatusPill variant={GRADE_VARIANT[row.grade]}>
                  {row.grade}
                </StatusPill>
              ),
            },
            {
              id: 'trend',
              header: t('buyerAnalytics.perf.col.trend'),
              kind: 'status',
              cell: (row) => <TrendIcon trend={row.trend} />,
            },
          ]}
        />
      </Card>

      <Card as="section" padding="lg">
        <SectionHeading className="mb-4 pb-3 border-b border-border-subtle">
          {t('buyerAnalytics.channel.title')}{' '}
          <IllustrativeMark />
        </SectionHeading>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={channelData}
            margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
            <XAxis dataKey="month" tick={CHART_TICK} />
            <YAxis
              tick={CHART_TICK}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(v: number) => [`${v}%`, '']}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend iconSize={10} wrapperStyle={CHART_LEGEND_STYLE} formatter={legendLabel} />
            {/* Channels are CATEGORIES, not state — one ordered accent ramp,
                never semantic green/red (that read as good/bad here). */}
            <Bar dataKey="whatsapp" stackId="a" fill={CHART_SERIES[0]} name={t('buyerAnalytics.series.whatsapp')} />
            <Bar dataKey="web" stackId="a" fill={CHART_SERIES[1]} name={t('buyerAnalytics.series.webPortal')} />
            <Bar dataKey="email" stackId="a" fill={CHART_SERIES[2]} name={t('buyerAnalytics.series.email')} />
            <Bar
              dataKey="api"
              stackId="a"
              fill={CHART_SERIES[3]}
              name={t('buyerAnalytics.series.apiEdi')}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </AppShellV2>
  );
};

export default BuyerAnalytics;
