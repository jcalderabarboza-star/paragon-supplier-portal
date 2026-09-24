import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import AppShellV2 from '../components/layout-v2/AppShellV2';
import BuyerInvoiceAgingWidget from './widgets/BuyerInvoiceAgingWidget';
import BuyerRfqAwaitingAwardWidget from './widgets/BuyerRfqAwaitingAwardWidget';
import BuyerOpenPoWidget from './widgets/BuyerOpenPoWidget';
import BuyerGoodsReceiptWidget from './widgets/BuyerGoodsReceiptWidget';
import BuyerAsnInboundWidget from './widgets/BuyerAsnInboundWidget';
import BuyerInventoryWidget from './widgets/BuyerInventoryWidget';
import BuyerRiskWidget from './widgets/BuyerRiskWidget';
import BuyerComplianceWidget from './widgets/BuyerComplianceWidget';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import TargetBar from '../components/ui-v2/TargetBar';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import IllustrativeRegion from '../components/ui-v2/IllustrativeRegion';
import { formatDate, formatIDR, formatMonth } from '../lib/format';
import {
  CHART_AXIS,
  CHART_CURSOR,
  CHART_GRID,
  CHART_SERIES,
  SEMANTIC_STATE,
} from '../lib/chartPalette';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import type { SystemRoleId } from '../services/transitions/businessRoles';
import type {
  ProductionLineRow,
  SupplierHealthRow,
} from '../services/data/types';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import {
  useASNs,
  useBuyerInvoices,
  useComplianceRegistry,
  useContracts,
  useDocuments,
  useGoodsReceipts,
  useObligations,
  usePurchaseOrders,
  useProductionLines,
  useRFQs,
  useSupplierHealth,
  usePslListings,
} from '../services/query/hooks';
import { useOwnRequirementResponses } from '../services/query/sdcSupplierHooks';
import {
  PRESENT_ISO,
  accountsPayableOpen,
  alertGroups,
  buyerLaneIds,
  goodsReceiptVarianceRate,
  halalCertificateStatus,
  heldLanes,
  matchRate,
  monthSpan,
  obligationsByMonth,
  onTimePaymentRate,
  poAcknowledgedRate,
  queueRows,
  rfqResponseRate,
  type AlertSeverity,
  type MonthRelation,
} from './dashboard/buyerDashboardDerivations';

// ─────────────────────────────────────────────────────────────────────────────
// THE BUYER COMMAND CENTER.
//
// ⚠️ **NOTHING ON THIS PAGE IS AUTHORED EXCEPT THE WORDS.** Every figure comes
// from `dashboard/buyerDashboardDerivations.ts`, at `PRESENT_ISO` — the declared
// present — and every string comes from `t()`. The page that stood here carried
// "Rp 14.0B" and "75%" as literals under an "Illustrative" subtitle, a
// "2 lines at risk" pill nothing counted, a time-range toggle whose state no
// derivation read, and a "Live operational view" subtitle directly above a
// Sample-data marker. All four are gone, and the no-literal gate
// (`buyerDashboardNoLiterals.guard.test.ts`) is what keeps them gone.
//
// ⚠️ **AND THE PAGE READS NO CLOCK.** Four wall-clock reads were removed with
// the retired widgets, which is why `BuyerDashboard` can join
// `anchoredSurfaces.guard.test.tsx` in this batch. Rule 3 is the other half:
// PO, RFQ, quotation and ASN are NOT anchored families, so no clock-relative
// figure over them is rendered at all — the procurement queue row states that
// it is held rather than showing a saturated count.
// ─────────────────────────────────────────────────────────────────────────────

/** Severity → the card's left edge, the same 3px accent grammar the widget
 *  shell uses (DP2-FLAG-01), so one ladder has one look across the portal. */
const SEVERITY_EDGE: Record<AlertSeverity, string> = {
  critical: 'border-l-[3px] border-l-danger',
  warning: 'border-l-[3px] border-l-warning',
  info: 'border-l-[3px] border-l-text-tertiary',
};

const SEVERITY_TEXT: Record<AlertSeverity, string> = {
  critical: 'text-danger',
  warning: 'text-warning-hover',
  info: 'text-text-tertiary',
};

/** Month bars: navy before the declared-present month, teal from it onward, and
 *  the present month keeps the teal fill plus an outline (below) so the split is
 *  readable without relying on hue alone. */
const MONTH_FILL: Record<MonthRelation, string> = {
  past: CHART_SERIES[1],
  present: CHART_SERIES[0],
  future: CHART_SERIES[0],
};

// Grade IS health state (A healthy -> D at-risk), so it stays semantic - but
// sourced from the centralized good->bad ramp, not ad-hoc hex.
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

/**
 * The risk levels a line is "AT RISK" at.
 *
 * ⚠️ **DERIVED FROM THE TONE MAP ABOVE, AND THE PILL COUNTS THE ROWS.** The
 * retired pill read a hard-coded *"2 lines at risk"* — measured against the
 * shipped rows that was wrong under every reading (one line is `high`, three
 * are `high` or `medium`). "At risk" is every level this page does NOT paint
 * with the success tone, so a level added to `RISK_VARIANT` tomorrow joins or
 * stays out by the colour it is already given, with nobody editing a list.
 */
const AT_RISK_LEVELS = (
  Object.keys(RISK_VARIANT) as ProductionLineRow['risk'][]
).filter((level) => RISK_VARIANT[level] !== 'success');

const CARD = 'bg-bg-surface rounded-lg shadow-sm border border-border-subtle p-6';
const PLACEHOLDER =
  'rounded-lg border border-dashed border-border-subtle p-6 bg-bg-surface/40';
const BADGE =
  'inline-block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary border border-border-subtle rounded px-1.5 py-0.5';

const BuyerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const { identity } = useCurrentIdentity();
  const [lane, setLane] = useState<SystemRoleId | null>(null);

  const DASH_CRUMB = [
    t('buyerDashboard.crumb.dashboards'),
    t('buyerDashboard.crumb.commandCenter'),
  ];

  const invoicesQ = useBuyerInvoices();
  const posQ = usePurchaseOrders();
  const rfqsQ = useRFQs();
  const receiptsQ = useGoodsReceipts();
  const asnsQ = useASNs();
  const contractsQ = useContracts();
  const obligationsQ = useObligations();
  const documentsQ = useDocuments();
  const registryQ = useComplianceRegistry();
  const responsesQ = useOwnRequirementResponses();
  // The two SAMPLE sections the operator's review kept. They model domains no
  // other buyer surface covers, and both are marked as sample where they render.
  const linesQ = useProductionLines();
  const healthQ = useSupplierHealth();
  // PSL P4 · R-C. The BUYER read (`getPslListings`), not the supplier one.
  const pslQ = usePslListings();

  const queries = [
    invoicesQ,
    posQ,
    rfqsQ,
    receiptsQ,
    asnsQ,
    contractsQ,
    obligationsQ,
    documentsQ,
    registryQ,
    responsesQ,
    linesQ,
    healthQ,
    pslQ,
  ];

  if (queries.some((q) => q.isPending)) return <LoadingState breadcrumb={DASH_CRUMB} />;
  const failed = queries.find((q) => q.isError);
  if (failed)
    return (
      <ErrorState
        breadcrumb={DASH_CRUMB}
        error={failed.error}
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );

  // ⚠️ Each read is narrowed EXPLICITLY rather than through the array above.
  // `queries.some(q => q.isPending)` is the right runtime guard and TypeScript
  // cannot see through it — a non-null assertion would silence the checker
  // while leaving a real `undefined` reachable if a query is ever added to the
  // reads and forgotten here. This way the checker holds the invariant.
  if (
    !invoicesQ.data ||
    !posQ.data ||
    !rfqsQ.data ||
    !receiptsQ.data ||
    !asnsQ.data ||
    !contractsQ.data ||
    !obligationsQ.data ||
    !documentsQ.data ||
    !registryQ.data ||
    !responsesQ.data ||
    !linesQ.data ||
    !healthQ.data ||
    !pslQ.data
  )
    return <LoadingState breadcrumb={DASH_CRUMB} />;

  const invoices = invoicesQ.data.items;
  const pos = posQ.data.items;
  const rfqs = rfqsQ.data.items;
  const receipts = receiptsQ.data.items;
  const asns = asnsQ.data.items;
  const contracts = contractsQ.data.items;
  const obligations = obligationsQ.data.items;
  const documents = documentsQ.data.items;
  const registry = registryQ.data.items;
  const responses = responsesQ.data;
  const productionLines = linesQ.data.items;
  const supplierHealth = healthQ.data.items;
  const listings = pslQ.data.items;
  const linesAtRisk = productionLines.filter((l) => AT_RISK_LEVELS.includes(l.risk)).length;

  if (invoices.length === 0 && obligations.length === 0 && registry.length === 0)
    return (
      <EmptyState
        breadcrumb={DASH_CRUMB}
        title={t('buyerDashboard.empty.title')}
        subtitle={t('buyerDashboard.empty.subtitle')}
      />
    );

  const alerts = alertGroups({
    invoices,
    receipts,
    registry,
    obligations,
    contracts,
    responses,
    listings,
    nowIso: PRESENT_ISO,
  });
  const match = matchRate(invoices);
  const rfqResponse = rfqResponseRate(rfqs);
  const poAck = poAcknowledgedRate(pos);
  const grVar = goodsReceiptVarianceRate(receipts);
  const onTime = onTimePaymentRate(invoices);
  const ap = accountsPayableOpen(invoices);
  const halal = halalCertificateStatus(registry, PRESENT_ISO);
  const months = obligationsByMonth(obligations, PRESENT_ISO);
  const poSpan = monthSpan(pos.map((p) => p.orderDate));
  const invoiceSpan = monthSpan(invoices.map((i) => i.receivedDate));
  const rows = queueRows({
    invoices,
    receipts,
    asns,
    registry,
    documents,
    responses,
    nowIso: PRESENT_ISO,
  });

  // ⚠️ THE CHIPS ARE THE SEAT'S LANES, NOT EVERY LANE. A chip for a lane the
  // seat does not hold would offer a view of somebody else's work as though it
  // were a filter on your own. The rows for those lanes are still listed under
  // "All lanes" — marked as a handoff — which is where a seat learns that the
  // work exists and whose it is.
  const held = new Set(heldLanes(identity.businessRoles));
  const lanes = buyerLaneIds().filter((id) => held.has(id));
  // A seat narrowed WHILE a chip is selected must not be stranded on a filter it
  // can no longer reach (component state outlives the seat — `SupplierShipments`
  // is the precedent). An unheld selection falls back to All lanes.
  const activeLane = lane !== null && held.has(lane) ? lane : null;
  const visibleRows =
    activeLane === null ? rows : rows.filter((r) => r.lane === activeLane);

  const apStages = [
    { key: 'submitted', label: t('buyerDashboard.chart.ap.stage.submitted'), value: ap.submitted },
    { key: 'approved', label: t('buyerDashboard.chart.ap.stage.approved'), value: ap.approvedAwaitingRelease },
    { key: 'disputed', label: t('buyerDashboard.chart.ap.stage.disputed'), value: ap.disputed },
  ];

  const halalSegments = [
    { key: 'valid', label: t('buyerDashboard.chart.halal.valid'), value: halal.valid, className: 'bg-success' },
    { key: 'expiring', label: t('buyerDashboard.chart.halal.expiring'), value: halal.expiring, className: 'bg-warning' },
    { key: 'missing', label: t('buyerDashboard.chart.halal.missing'), value: halal.missing, className: 'bg-text-tertiary' },
    { key: 'expired', label: t('buyerDashboard.chart.halal.expired'), value: halal.expired, className: 'bg-danger' },
  ];

  const share = (value: number, total: number) => (total === 0 ? 0 : (value / total) * 100);

  return (
    <AppShellV2>
      {/* ── A · HEADER ─────────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={DASH_CRUMB}
        title={t('buyerDashboard.header.title')}
        subtitle={t('buyerDashboard.header.eyebrow')}
      />
      <PageMetaLine className="-mt-6 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{t('buyerDashboard.header.asOf', { date: formatDate(PRESENT_ISO) })}</span>
        <ProvenanceMarker capability="dashboard" />
        <span>{t('buyerDashboard.header.derived')}</span>
      </PageMetaLine>

      {/* ── B · LANE VIEW ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setLane(null)}
          aria-pressed={activeLane === null}
          data-testid="lane-chip-all"
          className={`text-meta rounded-full border px-3 py-1 ${
            activeLane === null
              ? 'border-action text-action bg-action-soft'
              : 'border-border-subtle text-text-secondary'
          }`}
        >
          {t('buyerDashboard.lane.all')}
        </button>
        {lanes.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLane(id)}
            aria-pressed={activeLane === id}
            data-testid={`lane-chip-${id}`}
            className={`text-meta rounded-full border px-3 py-1 ${
              activeLane === id
                ? 'border-action text-action bg-action-soft'
                : 'border-border-subtle text-text-secondary'
            }`}
          >
            {t(`roles.owner.${id}`)}
          </button>
        ))}
        <span className="text-meta text-text-tertiary">{t('buyerDashboard.lane.legend')}</span>
      </div>

      {/* ── C · ALERTS STRIP ───────────────────────────────────────────────── */}
      <h2 className="text-section text-text-primary mb-3">
        {t('buyerDashboard.alerts.title', { count: alerts.length })}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {alerts.map((g) => (
          <Link
            key={g.id}
            to={g.route}
            data-testid={`alert-${g.id}`}
            className={`${CARD} ${SEVERITY_EDGE[g.severity]} block hover:bg-bg-hover`}
          >
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_TEXT[g.severity]}`}
            >
              {t(`buyerDashboard.alerts.severity.${g.severity}`)}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <Data className="text-hero">{g.count}</Data>
              <span className="text-text-primary">{t(`buyerDashboard.alerts.${g.id}.label`)}</span>
            </div>
            <div className="text-meta text-text-tertiary mt-1">
              {t(`buyerDashboard.alerts.${g.id}.detail`, g.detail)}
            </div>
          </Link>
        ))}
      </div>

      {/* ── D · KPI ROW ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.matchRate.label')}
          value={<Data>{`${match.pct}%`}</Data>}
          subtitle={
            <>
              <TargetBar pct={match.pct} className="my-2" />
              <span className="text-text-tertiary">
                {t('buyerDashboard.kpi.matchRate.basis', {
                  matched: match.numerator,
                  total: match.denominator,
                })}
              </span>
            </>
          }
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.rfqResponse.label')}
          value={<Data>{`${rfqResponse.pct}%`}</Data>}
          subtitle={
            <>
              <TargetBar pct={rfqResponse.pct} className="my-2" />
              <span className="text-text-tertiary">
                {t('buyerDashboard.kpi.rfqResponse.basis', {
                  responded: rfqResponse.numerator,
                  invited: rfqResponse.denominator,
                })}
              </span>
            </>
          }
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.poAcknowledged.label')}
          value={<Data>{`${poAck.pct}%`}</Data>}
          subtitle={
            <>
              <TargetBar pct={poAck.pct} className="my-2" />
              <span className="text-text-tertiary">
                {t('buyerDashboard.kpi.poAcknowledged.basis', {
                  acknowledged: poAck.numerator,
                  total: poAck.denominator,
                })}
              </span>
            </>
          }
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.grVariance.label')}
          value={<Data className="text-warning-hover">{`${grVar.pct}%`}</Data>}
          subtitle={
            <>
              <TargetBar pct={grVar.pct} status="near" className="my-2" />
              <span className="text-text-tertiary">
                {t('buyerDashboard.kpi.grVariance.basis', {
                  variance: grVar.numerator,
                  total: grVar.denominator,
                })}
              </span>
            </>
          }
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.onTimePayment.label')}
          value={
            <Data>
              {onTime.lowVolume
                ? t('buyerDashboard.kpi.onTimePayment.count', {
                    onTime: onTime.numerator,
                    paid: onTime.denominator,
                  })
                : `${onTime.pct}%`}
            </Data>
          }
          subtitle={
            <>
              <TargetBar pct={onTime.pct} className="my-2" />
              <span className="text-text-tertiary">
                {t('buyerDashboard.kpi.onTimePayment.basis', {
                  onTime: onTime.numerator,
                  paid: onTime.denominator,
                })}
              </span>
              {onTime.lowVolume ? (
                <span className="block text-text-tertiary">
                  {t('buyerDashboard.kpi.onTimePayment.lowVolume')}
                </span>
              ) : null}
            </>
          }
        />
        <KpiCard
          eyebrow={t('buyerDashboard.kpi.apOpen.label')}
          value={<Data>{formatIDR(ap.total, { compact: true })}</Data>}
          subtitle={
            <>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-hover my-2">
                {apStages.map((s) => (
                  <span
                    key={s.key}
                    className={
                      s.key === 'disputed'
                        ? 'bg-danger'
                        : s.key === 'approved'
                          ? 'bg-teal'
                          : 'bg-navy'
                    }
                    style={{ width: `${share(s.value, ap.total)}%` }}
                  />
                ))}
              </div>
              <span className="text-text-tertiary">
                {t('buyerDashboard.kpi.apOpen.basis', {
                  submitted: formatIDR(ap.submitted, { compact: true }),
                  approved: formatIDR(ap.approvedAwaitingRelease, { compact: true }),
                  disputed: formatIDR(ap.disputed, { compact: true }),
                })}
              </span>
            </>
          }
        />
      </div>

      {/* ── THE WINDOWS ────────────────────────────────────────────────────────
          The expandable module grid (operator direction). Each window states
          its own count, its own Live/Sample marker and its own CTA, and its
          expanded table's rows link to the record they name. The retired chip
          bar (`BuyerAlertsBar`) does NOT come back with them: the alerts strip
          above says the same thing with more of it. */}
      <h2 className="text-section text-text-primary mb-3">
        {t('buyerDashboard.windows.title')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <BuyerInvoiceAgingWidget />
        <BuyerRfqAwaitingAwardWidget />
        <BuyerOpenPoWidget />
        <BuyerGoodsReceiptWidget />
        <BuyerAsnInboundWidget />
        <BuyerInventoryWidget />
        <BuyerRiskWidget />
        <BuyerComplianceWidget />
      </div>

      {/* ── E · CHART CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-section text-text-primary">
              {t('buyerDashboard.chart.ap.title')}
            </h2>
            <Link to="/buyer/invoices" className="text-meta text-teal hover:underline">
              {t('buyerDashboard.chart.viewAll')}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {apStages.map((s) => (
              <div key={s.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-meta text-text-secondary">{s.label}</span>
                  <Data className="text-meta">{formatIDR(s.value, { compact: true })}</Data>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-hover overflow-hidden">
                  <span
                    className={`block h-full rounded-full ${
                      s.key === 'disputed' ? 'bg-danger' : s.key === 'approved' ? 'bg-teal' : 'bg-navy'
                    }`}
                    style={{ width: `${share(s.value, ap.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-meta text-text-tertiary mt-4">
            {t('buyerDashboard.chart.ap.footer')}
          </p>
        </section>

        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-section text-text-primary">
              {t('buyerDashboard.chart.halal.title')}
            </h2>
            <Link to="/buyer/compliance" className="text-meta text-teal hover:underline">
              {t('buyerDashboard.chart.viewAll')}
            </Link>
          </div>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-bg-hover">
            {halalSegments.map((s) => (
              <span
                key={s.key}
                className={s.className}
                style={{ width: `${share(s.value, halal.total)}%` }}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-1.5">
            {halalSegments.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-meta">
                <span className={`inline-block h-2 w-2 rounded-sm ${s.className}`} aria-hidden="true" />
                <span className="text-text-secondary">{s.label}</span>
                <Data className="text-meta ml-auto">{s.value}</Data>
              </li>
            ))}
          </ul>
          <p className="text-meta text-text-tertiary mt-4 flex flex-wrap items-center gap-x-2">
            <span>{t('buyerDashboard.chart.halal.footer', { total: halal.total })}</span>
            <ProvenanceMarker capability="compliance" />
          </p>
        </section>

        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-section text-text-primary">
              {t('buyerDashboard.chart.obligations.title')}
            </h2>
            <Link to="/buyer/contracts" className="text-meta text-teal hover:underline">
              {t('buyerDashboard.chart.viewAll')}
            </Link>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={months.map((b) => ({ ...b, label: formatMonth(b.month) }))}
                margin={{ top: 8, right: 8, left: -24, bottom: 4 }}
              >
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: CHART_AXIS }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={52}
                />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: CHART_CURSOR }}
                  contentStyle={{ border: `1px solid ${CHART_GRID}`, borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {months.map((b) => (
                    <Cell
                      key={b.month}
                      fill={MONTH_FILL[b.relation]}
                      stroke={b.relation === 'present' ? CHART_SERIES[1] : undefined}
                      strokeWidth={b.relation === 'present' ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-meta text-text-tertiary mt-2">
            {t('buyerDashboard.chart.obligations.footer', {
              total: obligations.length,
              months: months.length,
            })}
          </p>
        </section>
      </div>

      {/* ── F · PHASE B PLACEHOLDERS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <section className={PLACEHOLDER} data-testid="phase-b-spend">
          <span className={BADGE}>{t('buyerDashboard.phaseB.badge')}</span>
          <h2 className="text-section text-text-primary mt-2">
            {t('buyerDashboard.phaseB.spend.title')}
          </h2>
          <p className="text-meta text-text-tertiary mt-1">
            {t('buyerDashboard.phaseB.spend.body', { months: poSpan.months })}
          </p>
        </section>
        <section className={PLACEHOLDER} data-testid="phase-b-trend">
          <span className={BADGE}>{t('buyerDashboard.phaseB.badge')}</span>
          <h2 className="text-section text-text-primary mt-2">
            {t('buyerDashboard.phaseB.trend.title')}
          </h2>
          <p className="text-meta text-text-tertiary mt-1">
            {t('buyerDashboard.phaseB.trend.body', {
              months: invoiceSpan.months,
              min: invoiceSpan.minPerMonth,
              max: invoiceSpan.maxPerMonth,
            })}
          </p>
        </section>
      </div>

      {/* ── G · ACTION QUEUE BY LANE ───────────────────────────────────────── */}
      <section className={`${CARD} mb-8`}>
        <h2 className="text-section text-text-primary mb-4">
          {t('buyerDashboard.queue.title')}
        </h2>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('buyerDashboard.queue.col.lane')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerDashboard.queue.col.work')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerDashboard.queue.col.count')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerDashboard.queue.col.open')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell className="text-text-tertiary">
                  {t('buyerDashboard.queue.noRow')}
                </TableCell>
              </TableRow>
            ) : null}
            {visibleRows.map((row) => (
              <TableRow key={row.lane}>
                <TableCell>
                  <div className="font-medium text-text-primary">
                    {t(`roles.owner.${row.lane}`)}
                  </div>
                  {held.has(row.lane) ? null : (
                    <div
                      className="text-meta text-text-tertiary"
                      data-testid={`handoff-${row.lane}`}
                    >
                      {t('buyerDashboard.queue.handoff')}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-text-secondary">
                  <span>{t(`buyerDashboard.queue.${row.lane}.work`)}</span>
                  {row.held ? (
                    <span className={`${BADGE} ml-2`}>{t('buyerDashboard.phaseB.badge')}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row.counts === null ? (
                    <span className="text-text-tertiary">—</span>
                  ) : (
                    <Data>{row.counts.join(' · ')}</Data>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    to={row.route}
                    data-testid={`queue-open-${row.lane}`}
                    className="text-action hover:underline"
                  >
                    {t('buyerDashboard.queue.open')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </section>

      {/* ── PRODUCTION LINE RISK + SUPPLIER HEALTH (SAMPLE) ────────────────────
          Kept by operator direction. Both are authored fixtures with no live
          source, so both sit inside an `IllustrativeRegion` and neither offers
          a click: there is no production-line page to open, and a health row
          carries no supplier id to open one with (derived: 0 of 6 names match a
          supplier master record). A row that looked clickable and went nowhere
          would be the dead affordance the ratchet exists to stop. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <section className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-eyebrow text-text-tertiary uppercase">
                {t('buyerDashboard.lines.eyebrow')}
              </div>
              <h2 className="text-section text-text-primary mt-1">
                {t('buyerDashboard.lines.title')}
              </h2>
            </div>
            {/* DERIVED from the rows, never typed. */}
            <StatusPill variant={linesAtRisk > 0 ? 'warning' : 'success'}>
              {linesAtRisk > 0
                ? t('buyerDashboard.lines.atRisk', { count: linesAtRisk })
                : t('buyerDashboard.lines.allClear')}
            </StatusPill>
          </div>
          <IllustrativeRegion
            capability="dashboard"
            label={t('buyerDashboard.lines.title')}
          >
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
                    <TableCell className="text-text-primary">
                      <Data>{row.coverDays}d</Data>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={RISK_VARIANT[row.risk]}>{row.riskLabel}</StatusPill>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </IllustrativeRegion>
        </section>

        <section className={CARD}>
          <div className="text-eyebrow text-text-tertiary uppercase">
            {t('buyerDashboard.health.eyebrow')}
          </div>
          <h2 className="text-section text-text-primary mt-1">
            {t('buyerDashboard.health.title')}
          </h2>
          <p className="text-meta text-text-tertiary mt-1">
            {t('buyerDashboard.health.note')}
          </p>
          <div className="flex items-center gap-4 mt-3 mb-4 text-meta text-text-tertiary">
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
          <IllustrativeRegion
            capability="dashboard"
            label={t('buyerDashboard.health.title')}
          >
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
          </IllustrativeRegion>
        </section>
      </div>

      {/* ── H · PHASE C STRIP ──────────────────────────────────────────────── */}
      <section className={PLACEHOLDER} data-testid="phase-c">
        <span className={BADGE}>{t('buyerDashboard.phaseC.badge')}</span>
        <p className="text-meta text-text-tertiary mt-2">{t('buyerDashboard.phaseC.body')}</p>
      </section>
    </AppShellV2>
  );
};

export default BuyerDashboard;
