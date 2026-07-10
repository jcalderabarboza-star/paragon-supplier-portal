import React, { useState } from 'react';
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
import { useProductionLines, useSupplierHealth } from '../services/query/hooks';
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

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

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

const DASH_CRUMB = ['DASHBOARDS', 'PROCUREMENT COMMAND CENTER'];

const BuyerDashboard: React.FC = () => {
  const [range, setRange] = useState<RangeId>('today');
  const linesQuery = useProductionLines();
  const healthQuery = useSupplierHealth();

  if (linesQuery.isPending || healthQuery.isPending)
    return <LoadingState breadcrumb={DASH_CRUMB} />;
  if (linesQuery.isError || healthQuery.isError)
    return (
      <ErrorState
        breadcrumb={DASH_CRUMB}
        error={linesQuery.error ?? healthQuery.error}
        onRetry={() => {
          linesQuery.refetch();
          healthQuery.refetch();
        }}
      />
    );

  const productionLines = linesQuery.data.items;
  const supplierHealth = healthQuery.data.items;

  if (productionLines.length === 0 && supplierHealth.length === 0)
    return (
      <EmptyState
        breadcrumb={DASH_CRUMB}
        title="No command-center data"
        subtitle="Production-line and supplier-health data is available to buyer accounts."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['DASHBOARDS', 'PROCUREMENT COMMAND CENTER']}
        title="Procurement Command Center"
        subtitle="Paragon Corp · Odyssey Program · Live operational view"
        actions={
          <TimeRangeToggle options={RANGES} value={range} onChange={setRange} />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Total Spend YTD"
          value="Rp 14.0B"
          subtitle={<span className="text-success font-medium">+8.4% vs last year</span>}
          icon={Wallet}
        />
        <KpiCard
          eyebrow="Portfolio OTIF"
          value="75%"
          subtitle="Target ≥ 95% · 8pp gap"
          icon={Activity}
        />
        <KpiCard
          eyebrow="Active Suppliers"
          value="9"
          subtitle="/ 12 total · 2 onboarding"
          icon={Users}
        />
        <KpiCard
          eyebrow="Open POs"
          value="14"
          subtitle="1 unacknowledged >48h"
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
              <div className="text-eyebrow text-text-tertiary uppercase">Operations</div>
              <h2 className="text-section text-text-primary mt-1">
                Production Line Risk
              </h2>
            </div>
            <StatusPill variant="warning">2 lines at risk</StatusPill>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>Line</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Cover (days)</TableHeaderCell>
              <TableHeaderCell>Risk</TableHeaderCell>
            </TableHeader>
            <tbody>
              {productionLines.map((row) => (
                <TableRow key={row.line}>
                  <TableCell>
                    <div className="font-medium text-text-primary">{row.line}</div>
                    {row.blockedSkus > 0 ? (
                      <div className="text-meta text-text-tertiary">
                        {row.blockedSkus} blocked SKU{row.blockedSkus === 1 ? '' : 's'}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-text-secondary">{row.category}</TableCell>
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
          <div className="text-eyebrow text-text-tertiary uppercase">Intelligence</div>
          <h2 className="text-section text-text-primary mt-1">
            Supplier Health Index
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
