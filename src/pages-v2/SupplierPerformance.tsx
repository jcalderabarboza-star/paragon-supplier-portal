import React, { useState } from 'react';
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
import {
  CHART_SERIES,
  CHART_SEMANTIC,
  CHART_MID,
  CHART_GRID,
  targetStatus,
  TARGET_STATUS,
} from '../lib/chartPalette';
import PageHeader from '../components/ui-v2/PageHeader';
import Data from '../components/ui-v2/Data';
import TargetBar from '../components/ui-v2/TargetBar';
import Tabs from '../components/ui-v2/Tabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import { useTranslation, Trans } from 'react-i18next';
import { useEnumLabel } from '../hooks/useEnumLabel';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { useChannelLabel } from '../hooks/useChannelLabel';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import {
  useCurrentSupplier,
  useKpis,
  usePurchaseOrders,
} from '../services/query/hooks';
import type { KpiPoint as Kpi, KpiTrend as Trend } from '../services/data/types';

type Grade = 'A' | 'B' | 'C' | 'D';

// DP2-PALETTE-01: chart/UI colour sourced from the central palette (SSoT),
// not page-local hex. Values unchanged — pure de-dup.
const TOKEN_TEAL = CHART_SERIES[0];
const TOKEN_MID = CHART_MID;
const TOKEN_SUCCESS = CHART_SEMANTIC.success;
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
const TOKEN_MUTED = CHART_SEMANTIC.neutral;
const TOKEN_BORDER = CHART_GRID;

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
  const { t } = useTranslation();
  const status = targetStatus(k.pct, k.targetPct);
  return (
    <div className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-label text-text-tertiary uppercase">{k.name}</div>
        <TrendIcon trend={k.trend} />
      </div>
      <Data as="div" className="text-kpi" style={{ color: TARGET_STATUS[status].text }}>
        {k.value}
      </Data>
      <div className="text-label text-text-tertiary mb-2">
        {t('supplierPerformance.kpi.targetLabel')}: {k.target}
      </div>
      <TargetBar pct={k.pct} target={k.targetPct} trackClass="bg-bg-surface" />
    </div>
  );
};

const GradeBadge: React.FC<{ grade: Grade; score: number }> = ({ grade, score }) => {
  const { t } = useTranslation();
  const tone = GRADE_TONE[grade];
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: tone.soft, border: `4px solid ${tone.stroke}` }}
      >
        <span className="text-kpi" style={{ color: tone.stroke }}>
          {grade}
        </span>
      </div>
      <div className="text-base font-bold text-text-primary">{score}/100</div>
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          backgroundColor: `${tone.soft}33`,
          color: tone.stroke,
          border: `1px solid ${tone.stroke}55`,
        }}
      >
        {t('supplierPerformance.grade.paragonGrade')}
      </span>
    </div>
  );
};

const SupplierPerformance: React.FC = () => {
  const { t } = useTranslation();
  const el = useEnumLabel();
  const cl = useCategoryLabel();
  const channelLabel = useChannelLabel();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const [activeTab, setActiveTab] = useState<string>('overview');
  const PERF_CRUMB = [
    t('supplierPerformance.crumb.intelligence'),
    t('supplierPerformance.crumb.myPerformance'),
  ];
  const TABS = [
    { id: 'overview', label: t('supplierPerformance.tab.overview') },
    { id: 'trends', label: t('supplierPerformance.tab.trends') },
    { id: 'actions', label: t('supplierPerformance.tab.actions') },
  ];

  const supplierQuery = useCurrentSupplier();
  const kpisQuery = useKpis();
  const posQuery = usePurchaseOrders();

  const mySupplier = supplierQuery.data ?? null;
  const snapshot = kpisQuery.data;
  const kpis = snapshot?.kpis ?? [];
  const radar = snapshot?.radar ?? [];
  const trend = snapshot?.trend ?? [];
  const improvementActions = snapshot?.improvementActions ?? [];
  const myPOs = posQuery.data?.items ?? [];

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
      title: t('supplierPerformance.toast.exportQueued.title'),
      description: t('supplierPerformance.toast.exportQueued.desc'),
    });

  // Identity-gated (Pattern B): "My Performance" is supplier-only.
  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || kpisQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={PERF_CRUMB} />;
  if (supplierQuery.isError || kpisQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={PERF_CRUMB}
        error={supplierQuery.error ?? kpisQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          kpisQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier || kpis.length === 0)
    return (
      <EmptyState
        breadcrumb={PERF_CRUMB}
        title={t('supplierPerformance.empty.title')}
        subtitle={t('supplierPerformance.empty.subtitle')}
        message={t('supplierPerformance.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={PERF_CRUMB}
        title={t('supplierPerformance.header.title')}
        subtitle={t('supplierPerformance.header.subtitle')}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportReport}>
            {t('supplierPerformance.action.exportReport')}
          </Button>
        }
      />

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-section text-text-primary mb-2">
              <span className="mr-2">{COUNTRY_FLAGS[mySupplier.country] ?? '●'}</span>
              {mySupplier.name}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-bg-hover text-text-secondary">
                {cl(mySupplier.category)}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-teal-soft text-teal">
                {t('supplierPerformance.card.tierChannel')}
              </span>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-text-secondary">
              <span>
                <span className="text-text-tertiary font-semibold">
                  {t('supplierPerformance.card.sapBp')}{' '}
                </span>
                {mySupplier.sapBpNumber}
              </span>
              <span>
                <span className="text-text-tertiary font-semibold">
                  {t('supplierPerformance.card.channel')}{' '}
                </span>
                {channelLabel('WhatsApp')}
              </span>
              <span>
                <span className="text-text-tertiary font-semibold">
                  {t('supplierPerformance.card.reportingPeriod')}{' '}
                </span>
                {t('supplierPerformance.card.reportingValue')}
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
            <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
              {kpis.length === 1
                ? t('supplierPerformance.overview.scorecardTitle.one', {
                    count: kpis.length,
                  })
                : t('supplierPerformance.overview.scorecardTitle.other', {
                    count: kpis.length,
                  })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {kpis.map((k) => (
                <KpiProgressTile key={k.name} k={k} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
                {t('supplierPerformance.overview.radarTitle')}
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart
                  data={radar}
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
                    name={t('supplierPerformance.chart.benchmark')}
                    dataKey="target"
                    stroke={TOKEN_MID}
                    fill="transparent"
                    strokeDasharray="4 2"
                  />
                  <Radar
                    name={t('supplierPerformance.chart.yourScore')}
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
              <h2 className="flex items-center gap-2 text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
                {t('supplierPerformance.overview.gradeHistoryTitle')}
                <StatusPill variant="neutral">
                  {t('supplierPerformance.sampleData')}
                </StatusPill>
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
                  <Bar dataKey="score" fill={TOKEN_TEAL} radius={[4, 4, 0, 0]} name={t('supplierPerformance.chart.score')} />
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
                      <div className="text-sm font-bold" style={{ color: tone.stroke }}>
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
            <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
              {t('supplierPerformance.overview.poPerfTitle', {
                name: mySupplier.name,
              })}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: t('supplierPerformance.poMetric.totalPos'),
                  value: myPOs.length,
                  color: TOKEN_TEAL,
                },
                {
                  label: t('supplierPerformance.poMetric.onTime'),
                  value: onTimeCount,
                  color: TOKEN_SUCCESS,
                },
                {
                  label: t('supplierPerformance.poMetric.late'),
                  value: lateCount,
                  color: TOKEN_DANGER,
                },
                {
                  label: t('supplierPerformance.poMetric.avgOverdue'),
                  value: avgOverdue,
                  color: TOKEN_WARNING,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-bg-hover rounded-md px-4 py-3"
                  style={{ borderLeft: `3px solid ${m.color}` }}
                >
                  <div className="text-label text-text-tertiary uppercase mb-1">
                    {m.label}
                  </div>
                  <Data as="div" className="text-kpi" style={{ color: m.color }}>
                    {m.value}
                  </Data>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'trends' && (
        <>
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
              {t('supplierPerformance.trends.otifTitle')}
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={trend}
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
                  name={t('supplierPerformance.chart.otifPct')}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
                {t('supplierPerformance.trends.asnTitle')}
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={trend}
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
                    name={t('supplierPerformance.chart.asnAccuracyPct')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
            <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
              <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
                {t('supplierPerformance.trends.poaTitle')}
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={trend}
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
                    name={t('supplierPerformance.chart.ackTimeHrs')}
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
            {t('supplierPerformance.actions.intro')}
          </div>
          {improvementActions.map((item) => {
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
                      <StatusPill variant="neutral">
                        {t('supplierPerformance.actions.currentLabel')}:{' '}
                        {item.current}
                      </StatusPill>
                      <StatusPill variant="success">
                        {t('supplierPerformance.actions.targetLabel')}:{' '}
                        {item.target}
                      </StatusPill>
                      <StatusPill variant="danger">
                        {t('supplierPerformance.actions.gapLabel')}: {item.gap}
                      </StatusPill>
                    </div>
                  </div>
                  <StatusPill variant={isHigh ? 'danger' : 'warning'}>
                    <Trans
                      i18nKey="supplierPerformance.actions.priorityChip"
                      values={{ priority: el(item.priority) }}
                    />
                  </StatusPill>
                </div>
                <div className="text-sm text-text-secondary leading-relaxed mb-4">
                  {item.action}
                </div>
                <Button
                  variant="outline"
                  icon={CheckCircle2}
                  onClick={() =>
                    toast({
                      variant: 'success',
                      title: t('supplierPerformance.toast.actionSubmitted.title', {
                        kpi: item.kpi,
                      }),
                      description: t(
                        'supplierPerformance.toast.actionSubmitted.desc',
                      ),
                    })
                  }
                >
                  {t('supplierPerformance.actions.acknowledge')}
                </Button>
              </section>
            );
          })}
          <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3 flex items-start gap-3">
            <Info size={16} className="text-info mt-0.5 shrink-0" />
            <div className="text-xs text-text-secondary leading-relaxed">
              <span className="font-semibold text-text-primary">
                {t('supplierPerformance.actions.tierSystem.label')}
              </span>{' '}
              {t('supplierPerformance.actions.tierSystem.body')}
            </div>
          </section>
        </div>
      )}
    </AppShellV2>
  );
};

export default SupplierPerformance;
