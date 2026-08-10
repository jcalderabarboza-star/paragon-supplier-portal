import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Wallet, Activity, Users, ShoppingCart } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import TimeRangeToggle from '../components/ui-v2/TimeRangeToggle';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import {
  SEMANTIC_STATE,
  CHART_GRID,
  CHART_AXIS,
  CHART_CURSOR,
} from '../lib/chartPalette';
import type {
  ProductionLineRow,
  SupplierHealthRow,
} from '../services/data/types';
import {
  useProductionLines,
  useSupplierHealth,
  useSuppliers,
  usePurchaseOrders,
} from '../services/query/hooks';
import { SupplierStatus } from '../types/supplier.types';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import {
  openPurchaseOrders,
  unacknowledgedOver48h,
} from './widgets/buyerDerivations';
import BuyerAlertsBar from './widgets/BuyerAlertsBar';
import BuyerInvoiceAgingWidget from './widgets/BuyerInvoiceAgingWidget';
import BuyerRfqAwaitingAwardWidget from './widgets/BuyerRfqAwaitingAwardWidget';
import BuyerOpenPoWidget from './widgets/BuyerOpenPoWidget';
import BuyerGoodsReceiptWidget from './widgets/BuyerGoodsReceiptWidget';
import BuyerAsnInboundWidget from './widgets/BuyerAsnInboundWidget';
import BuyerInventoryWidget from './widgets/BuyerInventoryWidget';
import BuyerRiskWidget from './widgets/BuyerRiskWidget';
import BuyerComplianceWidget from './widgets/BuyerComplianceWidget';

type RangeId = 'today' | 'week' | 'month';

// Grade IS health state (A healthy → D at-risk), so it stays semantic — but
// sourced from the centralized good→bad ramp, not ad-hoc hex. No blue: it read
// as a category and made the bars look like a rainbow.
const GRADE_COLOR: Record<SupplierHealthRow['grade'], string> = {
  A: SEMANTIC_STATE.good,
  B: SEMANTIC_STATE.fair,
  C: SEMANTIC_STATE.caution,
  D: SEMANTIC_STATE.poor,
};

const RISK_VARIANT: Record<ProductionLineRow['risk'], 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const BuyerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const DASH_CRUMB = [
    t('buyerDashboard.crumb.dashboards'),
    t('buyerDashboard.crumb.commandCenter'),
  ];
  const RANGES: { id: RangeId; label: string }[] = [
    { id: 'today', label: t('buyerDashboard.range.today') },
    { id: 'week', label: t('buyerDashboard.range.week') },
    { id: 'month', label: t('buyerDashboard.range.month') },
  ];
  const [range, setRange] = useState<RangeId>('today');
  const linesQuery = useProductionLines();
  const healthQuery = useSupplierHealth();
  // KPI-strip honesty: Active Suppliers + Open POs derive from the same stores
  // the widgets below read, so the strip can never disagree with them.
  const suppliersQuery = useSuppliers();
  const posQuery = usePurchaseOrders();

  if (
    linesQuery.isPending ||
    healthQuery.isPending ||
    suppliersQuery.isPending ||
    posQuery.isPending
  )
    return <LoadingState breadcrumb={DASH_CRUMB} />;
  if (
    linesQuery.isError ||
    healthQuery.isError ||
    suppliersQuery.isError ||
    posQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={DASH_CRUMB}
        error={
          linesQuery.error ??
          healthQuery.error ??
          suppliersQuery.error ??
          posQuery.error
        }
        onRetry={() => {
          linesQuery.refetch();
          healthQuery.refetch();
          suppliersQuery.refetch();
          posQuery.refetch();
        }}
      />
    );

  const productionLines = linesQuery.data.items;
  const supplierHealth = healthQuery.data.items;

  // Real KPI derivations (honest-by-construction — same stores as the widgets).
  const suppliers = suppliersQuery.data.items;
  const activeSuppliers = suppliers.filter(
    (s) => s.status === SupplierStatus.ACTIVE,
  ).length;
  const onboardingSuppliers = suppliers.filter(
    (s) => s.status === SupplierStatus.ONBOARDING,
  ).length;
  const openPoCount = openPurchaseOrders(posQuery.data.items).length;
  const unackPoCount = unacknowledgedOver48h(
    posQuery.data.items,
    new Date(),
  ).length;

  if (productionLines.length === 0 && supplierHealth.length === 0)
    return (
      <EmptyState
        breadcrumb={DASH_CRUMB}
        title={t('buyerDashboard.empty.title')}
        subtitle={t('buyerDashboard.empty.subtitle')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={DASH_CRUMB}
        title={t('buyerDashboard.header.title')}
        subtitle={t('buyerDashboard.header.subtitle')}
        actions={
          <TimeRangeToggle options={RANGES} value={range} onChange={setRange} />
        }
      />

      {/* D-CENSUS-8 — the widgets below each carry a derived marker; the KPI tiles
          between them and this header carried none, which made the unmarked numbers
          look like the trustworthy ones. `dashboard` is null-backed: the tiles
          aggregate supplier, PO, supplier-health and production-line fixtures. */}
      <PageMetaLine className="-mt-6 mb-6">
        <ProvenanceMarker capability="dashboard" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.spend.eyebrow')}
          value="Rp 14.0B"
          subtitle={
            <span className="text-text-tertiary">{t('buyerDashboard.kpi.illustrative')}</span>
          }
          icon={Wallet}
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.otif.eyebrow')}
          value="75%"
          subtitle={
            <span className="text-text-tertiary">{t('buyerDashboard.kpi.illustrative')}</span>
          }
          icon={Activity}
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.activeSuppliers.eyebrow')}
          value={activeSuppliers.toString()}
          subtitle={t('buyerDashboard.kpi.activeSuppliers.subtitle', {
            total: suppliers.length,
            onboarding: onboardingSuppliers,
          })}
          icon={Users}
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.openPo.eyebrow')}
          value={openPoCount.toString()}
          subtitle={
            unackPoCount > 0
              ? t('buyerDashboard.kpi.openPo.unack', { count: unackPoCount })
              : t('buyerDashboard.kpi.openPo.allAck')
          }
          icon={ShoppingCart}
        />
      </div>

      {/* Triage line — aggregated live exception count (buyer alerts bar). */}
      <BuyerAlertsBar />

      {/* Expandable module-summary widget grid (live adapters over real stores).
          The fixed panels below cover domains no widget models (production
          lines, cross-supplier health) and are kept. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <BuyerInvoiceAgingWidget />
        <BuyerRfqAwaitingAwardWidget />
        <BuyerOpenPoWidget />
        <BuyerGoodsReceiptWidget />
        <BuyerAsnInboundWidget />
        {/* Sample-data widgets (live=false, amber pill) — fixture-backed domains
            with no store yet: honest by construction, never faked green. */}
        <BuyerInventoryWidget />
        <BuyerRiskWidget />
        <BuyerComplianceWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-bg-surface rounded-lg shadow-sm border border-border-subtle p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-eyebrow text-text-tertiary uppercase">{t('buyerDashboard.lines.eyebrow')}</div>
              <h2 className="text-section text-text-primary mt-1">
                {t('buyerDashboard.lines.title')}
              </h2>
            </div>
            <StatusPill variant="warning">2 lines at risk</StatusPill>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('buyerDashboard.lines.col.line')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerDashboard.lines.col.category')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerDashboard.lines.col.cover')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerDashboard.lines.col.risk')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {productionLines.map((row) => (
                <TableRow key={row.line}>
                  <TableCell>
                    <div className="font-medium text-text-primary">{row.line}</div>
                    {row.blockedSkus > 0 ? (
                      <div className="text-meta text-text-tertiary">
                        {t(
                          row.blockedSkus === 1
                            ? 'buyerDashboard.lines.blockedSku.one'
                            : 'buyerDashboard.lines.blockedSku.other',
                          { count: row.blockedSkus },
                        )}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-text-secondary">{cl(row.category)}</TableCell>
                  <TableCell className="text-text-primary"><Data>{row.coverDays}d</Data></TableCell>
                  <TableCell>
                    <StatusPill variant={RISK_VARIANT[row.risk]}>{row.riskLabel}</StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </section>

        <section className="bg-bg-surface rounded-lg shadow-sm border border-border-subtle p-6">
          <div className="text-eyebrow text-text-tertiary uppercase">{t('buyerDashboard.health.eyebrow')}</div>
          <h2 className="text-section text-text-primary mt-1">
            {t('buyerDashboard.health.title')}
          </h2>
          <div className="flex items-center gap-4 mt-1 mb-4 text-meta text-text-tertiary">
            {(['A', 'B', 'C', 'D'] as const).map((g) => (
              <div key={g} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: GRADE_COLOR[g] }}
                />
                <span className="font-semibold">{g}</span>
              </div>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierHealth} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_AXIS }} />
                <Tooltip
                  cursor={{ fill: CHART_CURSOR }}
                  contentStyle={{
                    border: `1px solid ${CHART_GRID}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {supplierHealth.map((row) => (
                    <Cell key={row.name} fill={GRADE_COLOR[row.grade]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShellV2>
  );
};

export default BuyerDashboard;
