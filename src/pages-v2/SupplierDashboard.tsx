import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Truck,
  CreditCard,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  FileText,
  ChevronRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import {
  targetStatus,
  TARGET_STATUS,
  TargetStatus,
} from '../lib/chartPalette';
import TargetBar from '../components/ui-v2/TargetBar';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { PreferredChannel } from '../types/supplier.types';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import OrdersToConfirmWidget from './widgets/OrdersToConfirmWidget';
import SupplierInvoicePaymentWidget from './widgets/SupplierInvoicePaymentWidget';
import SupplierRfqToRespondWidget from './widgets/SupplierRfqToRespondWidget';
import SupplierCertsExpiringWidget from './widgets/SupplierCertsExpiringWidget';
import {
  useCurrentSupplier,
  usePurchaseOrders,
  useSupplierInvoices,
  useDocuments,
} from '../services/query/hooks';
import type { SupplierDocumentStatus } from '../services/data/types';

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

const fmtIDR = (v: number): string => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
};

const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// DP2-TARGET-01: perf thresholds come from the central target-status system
// (target 90 → meeting ≥90, near ≥80, else missing) so the StatusPill and the
// KPI bars can't disagree. Kept returning StatusPill variants for the pill site.
const STATUS_TO_VARIANT: Record<TargetStatus, 'success' | 'warning' | 'danger'> = {
  meeting: 'success',
  near: 'warning',
  missing: 'danger',
};
const perfVariant = (v: number): 'success' | 'warning' | 'danger' =>
  STATUS_TO_VARIANT[targetStatus(v, 90)];

// Channel labels map to i18n keys; resolved with t() at the call site.
const CHANNEL_KEY: Record<PreferredChannel, string> = {
  [PreferredChannel.WHATSAPP]: 'supplierDashboard.channel.whatsapp',
  [PreferredChannel.WEB]: 'supplierDashboard.channel.web',
  [PreferredChannel.EMAIL]: 'supplierDashboard.channel.email',
  [PreferredChannel.API]: 'supplierDashboard.channel.api',
};

const GRADE_TONE: Record<Grade, { stroke: string; soft: string }> = {
  A: { stroke: '#107E3E', soft: '#E8F5EC' },
  B: { stroke: '#1E5BAE', soft: '#E5F0FF' },
  C: { stroke: '#B45309', soft: '#FEF3D6' },
  D: { stroke: '#BB0000', soft: '#FCE4E4' },
  F: { stroke: '#BB0000', soft: '#FCE4E4' },
};

interface ActionItem {
  id: string;
  Icon: typeof AlertTriangle;
  iconClass: string;
  iconBg: string;
  title: string;
  badge: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  desc: string;
  primary: boolean;
  btnLabel: string;
  time: string;
}

// Ledger register (DP2-FLAG-01) for the briefing rows: severity reads as a 3px
// left edge + a small dot, not a colored chip — consistent with the widget cards.
const BRIEF_EDGE: Record<ActionItem['badgeVariant'], string> = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-text-tertiary',
  success: 'border-l-success',
  neutral: 'border-l-border-subtle',
};
const BRIEF_DOT: Record<ActionItem['badgeVariant'], string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-text-tertiary',
  success: 'bg-success',
  neutral: 'bg-text-tertiary',
};


const DOC_STATUS_TONE: Record<
  SupplierDocumentStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  Valid: 'success',
  'Expiring Soon': 'warning',
  Expired: 'danger',
  'Awaiting Upload': 'danger',
  'Under Review': 'neutral',
};

// Per-status document action maps to an i18n key; resolved with t() in render.
const DOC_STATUS_ACTION_KEY: Record<SupplierDocumentStatus, string> = {
  Valid: 'supplierDashboard.docs.action.view',
  'Expiring Soon': 'supplierDashboard.docs.action.renew',
  Expired: 'supplierDashboard.docs.action.renew',
  'Awaiting Upload': 'supplierDashboard.docs.action.upload',
  'Under Review': 'supplierDashboard.docs.action.view',
};

const GradeBadge: React.FC<{ grade: Grade; size?: 'sm' | 'md' }> = ({
  grade,
  size = 'md',
}) => {
  const tone = GRADE_TONE[grade];
  const px = size === 'sm' ? 'w-10 h-10 text-base' : 'w-16 h-16 text-3xl';
  return (
    <div
      className={`rounded-md flex items-center justify-center font-semibold ${px}`}
      style={{
        background: tone.soft,
        color: tone.stroke,
        border: `3px solid ${tone.stroke}`,
      }}
    >
      {grade}
    </div>
  );
};


const SupplierDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const dashCrumb = [
    t('supplierDashboard.crumb.acquire'),
    t('supplierDashboard.crumb.dashboard'),
  ];
  const [dismissedActions, setDismissedActions] = useState<string[]>([]);

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  const invoicesQuery = useSupplierInvoices();
  const documentsQuery = useDocuments();

  const mySupplier = supplierQuery.data ?? null;

  const MY_POS = useMemo(() => posQuery.data?.items ?? [], [posQuery.data]);

  const unpaidInvoices = useMemo(
    () =>
      (invoicesQuery.data?.items ?? []).filter(
        (inv) =>
          inv.status !== 'Payment Released' &&
          inv.status !== 'Remittance Received',
      ).length,
    [invoicesQuery.data],
  );

  const documents = useMemo(
    () => (documentsQuery.data?.items ?? []).slice(0, 4),
    [documentsQuery.data],
  );

  const dismiss = (id: string) =>
    setDismissedActions((prev) => [...prev, id]);

  const openOrders = useMemo(
    () =>
      MY_POS.filter(
        (po) =>
          po.status !== POStatus.DELIVERED && po.status !== POStatus.CLOSED,
      ).length,
    [MY_POS],
  );

  const pendingASNs = useMemo(
    () => MY_POS.filter((po) => po.status === POStatus.CONFIRMED).length,
    [MY_POS],
  );

  const needsConfirmCount = useMemo(
    () =>
      MY_POS.filter(
        (po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED,
      ).length,
    [MY_POS],
  );

  const asnDueOrders = useMemo(
    () =>
      MY_POS.filter((po) => {
        if (po.status !== POStatus.CONFIRMED) return false;
        const delivery = new Date(po.requestedDeliveryDate);
        const today = new Date();
        const daysLeft = Math.ceil(
          (delivery.getTime() - today.getTime()) / 86_400_000,
        );
        return daysLeft <= 7;
      }),
    [MY_POS],
  );

  if (!supplierId) return <NoSupplierIdentity />;
  if (
    supplierQuery.isPending ||
    posQuery.isPending ||
    invoicesQuery.isPending ||
    documentsQuery.isPending
  )
    return <LoadingState breadcrumb={dashCrumb} />;
  if (
    supplierQuery.isError ||
    posQuery.isError ||
    invoicesQuery.isError ||
    documentsQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={dashCrumb}
        error={
          supplierQuery.error ??
          posQuery.error ??
          invoicesQuery.error ??
          documentsQuery.error
        }
        onRetry={() => {
          supplierQuery.refetch();
          posQuery.refetch();
          invoicesQuery.refetch();
          documentsQuery.refetch();
        }}
      />
    );
  if (!mySupplier)
    return (
      <EmptyState
        breadcrumb={dashCrumb}
        title={t('supplierDashboard.empty.title')}
        subtitle={t('supplierDashboard.empty.subtitle')}
        message={t('supplierDashboard.empty.message')}
      />
    );

  const grade = mySupplier.scorecardGrade as Grade;
  const channelLabel = t(CHANNEL_KEY[mySupplier.preferredChannel]);
  const otifVariant = perfVariant(mySupplier.otif);
  const otifStatusLabel =
    mySupplier.otif >= 90
      ? 'On Track'
      : mySupplier.otif >= 80
        ? 'Needs Attention'
        : 'At Risk';

  // i18n-defer: mock/sample data — the briefing is badged "Sample data"; these
  // action titles/descs/badges/labels are fixture narratives, kept EN by design.
  const allActions: ActionItem[] = [
    {
      id: 'po-confirm',
      Icon: AlertTriangle,
      iconClass: 'text-danger',
      iconBg: 'bg-danger-soft',
      title: `Confirm ${needsConfirmCount} purchase order${needsConfirmCount !== 1 ? 's' : ''}`,
      badge: 'Urgent',
      badgeVariant: 'danger',
      desc: 'PO-2025-00108 · Rp 185jT · Delivery 25 Apr 2025 — acknowledgement overdue 96h',
      primary: true,
      btnLabel: 'Confirm now',
      time: '~2 min',
    },
    {
      id: 'iso-upload',
      Icon: Clock,
      iconClass: 'text-warning-hover',
      iconBg: 'bg-warning-soft',
      title: 'Upload ISO 9001:2015 certificate',
      badge: '45 days left',
      badgeVariant: 'warning',
      desc: 'Cert expires 24 May 2026 — upload renewal to avoid disruption to active POs',
      primary: true,
      btnLabel: 'Upload certificate',
      time: '~5 min',
    },
    ...asnDueOrders.map((po) => {
      const days = Math.ceil(
        (new Date(po.requestedDeliveryDate).getTime() - new Date().getTime()) /
          86_400_000,
      );
      return {
        id: `asn-${po.id}`,
        Icon: Truck,
        iconClass: 'text-teal',
        iconBg: 'bg-teal-soft',
        title: `Create ASN for ${po.poNumber}`,
        badge: `Delivery in ${days}d`,
        badgeVariant: 'info' as const,
        desc: `${po.supplierName} · ${fmtDate(po.requestedDeliveryDate)} — ASN must be submitted before delivery`,
        primary: true,
        btnLabel: 'Create ASN',
        time: '~5 min',
      };
    }),
    {
      id: 'profile',
      Icon: User,
      iconClass: 'text-teal',
      iconBg: 'bg-teal-soft',
      title: 'Complete company profile',
      badge: 'When ready',
      badgeVariant: 'neutral',
      desc: 'Add bank account details and payment preferences to enable Net 15 payment terms',
      primary: false,
      btnLabel: 'Update profile',
      time: '~10 min',
    },
  ];

  const activeActions = allActions.filter(
    (a) => !dismissedActions.includes(a.id),
  );
  const remaining = activeActions.length;

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const sortedPOs = [...MY_POS].sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate),
  );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={dashCrumb}
        title={t('supplierDashboard.header.title', { name: mySupplier.name })}
        subtitle={t('supplierDashboard.header.subtitle', {
          // i18n-defer: mock/sample data — hardcoded last-login date.
          date: '5 April 2026',
          channel: channelLabel,
        })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierDashboard.meta.identity', {
          country: mySupplier.country,
          category: mySupplier.category,
        })}
        {/* D-CENSUS-8 — the KPI tiles above were the only unmarked figures on a page
            whose widgets each carry a derived marker; the briefing block below had
            its own "Sample data" badge while the numbers at the top had none. */}
        <ProvenanceMarker capability="dashboard" className="ml-3 align-middle" />
      </PageMetaLine>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-section text-text-primary mb-1">
              {mySupplier.name}
            </div>
            <div className="text-sm text-text-secondary">
              {t('supplierDashboard.identity.sapBp', {
                bp: mySupplier.sapBpNumber,
                channel: channelLabel,
              })}
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
                {t('supplierDashboard.identity.grade')}
              </div>
              <GradeBadge grade={grade} />
              <div className="text-xs text-text-secondary mt-1">
                {mySupplier.otif >= 90 ? '94' : mySupplier.otif >= 80 ? '82' : '70'} / 100
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <StatusPill variant={otifVariant}>{otifStatusLabel}</StatusPill>
              <div className="text-xs text-text-secondary">
                {t('supplierDashboard.identity.otif', { value: mySupplier.otif })}
              </div>
              <div className="text-xs text-text-tertiary">
                {t('supplierDashboard.identity.target')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.openOrders.eyebrow')}
          value={openOrders.toString()}
          subtitle={t('supplierDashboard.kpi.openOrders.subtitle')}
          icon={ClipboardList}
        />
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.pendingAsns.eyebrow')}
          value={pendingASNs.toString()}
          subtitle={t('supplierDashboard.kpi.pendingAsns.subtitle')}
          icon={Truck}
        />
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.unpaidInvoices.eyebrow')}
          value={unpaidInvoices.toString()}
          subtitle={
            unpaidInvoices > 0 ? (
              <span className="text-danger">
                {t('supplierDashboard.kpi.unpaidInvoices.pending')}
              </span>
            ) : (
              t('supplierDashboard.kpi.unpaidInvoices.settled')
            )
          }
          icon={CreditCard}
        />
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.otif.eyebrow')}
          value={`${mySupplier.otif}%`}
          subtitle={t('supplierDashboard.kpi.otif.subtitle')}
          icon={Target}
        />
      </div>

      {/* Supplier module-summary widget grid — live adapters over real stores,
          alongside the existing panels (briefing serves as the alerts bar). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <OrdersToConfirmWidget />
        <SupplierInvoicePaymentWidget />
        <SupplierRfqToRespondWidget />
        {/* Sample-data widget (live=false, amber pill) — document fixture, no
            upload command yet: honest by construction, never faked green. */}
        <SupplierCertsExpiringWidget />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">
        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-text-primary">
                    {t('supplierDashboard.briefing.title')}
                  </div>
                  <StatusPill variant="neutral">
                    {t('supplierDashboard.briefing.sampleData')}
                  </StatusPill>
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">{today}</div>
              </div>
              <StatusPill variant={remaining > 0 ? 'warning' : 'success'}>
                {remaining > 0
                  ? remaining === 1
                    ? t('supplierDashboard.briefing.actions.one', { count: remaining })
                    : t('supplierDashboard.briefing.actions.other', { count: remaining })
                  : t('supplierDashboard.briefing.allClear')}
              </StatusPill>
            </div>
            {remaining === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-success-soft items-center justify-center mb-3">
                  <CheckCircle2 size={24} className="text-success" />
                </div>
                <div className="text-base font-semibold text-success mb-1">
                  {t('supplierDashboard.briefing.done.title')}
                </div>
                <div className="text-sm text-text-tertiary">
                  {t('supplierDashboard.briefing.done.body')}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {activeActions.map((action, idx) => {
                  const Icon = action.Icon;
                  return (
                    <div
                      key={action.id}
                      className={`px-5 py-4 flex gap-4 items-start border-l-[3px] ${
                        BRIEF_EDGE[action.badgeVariant]
                      } ${
                        idx < activeActions.length - 1
                          ? 'border-b border-border-subtle'
                          : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-bg-hover">
                        <Icon size={16} className="text-text-tertiary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-text-primary">
                            {action.title}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                            <span
                              aria-hidden="true"
                              className={`h-1.5 w-1.5 rounded-full ${BRIEF_DOT[action.badgeVariant]}`}
                            />
                            {action.badge}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mb-2">
                          {action.desc}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              // i18n-defer: mock/sample data — toast echoes the
                              // sample-briefing action title/label (EN by design).
                              toast({
                                variant: 'info',
                                title: action.title,
                                description: `${action.btnLabel} workflow initiated.`,
                              });
                              dismiss(action.id);
                            }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-action hover:underline"
                          >
                            {action.btnLabel}
                            <span aria-hidden="true">→</span>
                          </button>
                          <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
                            <Clock size={11} /> {action.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="text-section text-text-primary">
                {t('supplierDashboard.orders.title')}
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('supplierDashboard.orders.col.po')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierDashboard.orders.col.orderDate')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('supplierDashboard.orders.col.items')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('supplierDashboard.orders.col.value')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierDashboard.orders.col.status')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('supplierDashboard.orders.col.action')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {sortedPOs.map((po) => {
                  const isActionable =
                    po.status === POStatus.SENT ||
                    po.status === POStatus.ACKNOWLEDGED;
                  const isConfirmed = po.status === POStatus.CONFIRMED;
                  const btnLabel = isActionable
                    ? t('supplierDashboard.orders.action.confirm')
                    : isConfirmed
                      ? t('supplierDashboard.orders.action.createAsn')
                      : t('supplierDashboard.orders.action.view');
                  return (
                    <TableRow key={po.id}>
                      <TableCell>
                        <Data className="text-xs font-bold text-text-primary">
                          {po.poNumber}
                        </Data>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        <Data>{fmtDate(po.orderDate)}</Data>
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {po.lineItems.length}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                        <Data>{fmtIDR(po.totalValue)}</Data>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={statusTone(po.status)}>
                          {po.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={isActionable ? 'outline' : 'secondary'}
                          onClick={() =>
                            toast({
                              variant: 'info',
                              title: isActionable
                                ? t('supplierDashboard.orders.toast.opening', { po: po.poNumber })
                                : isConfirmed
                                  ? t('supplierDashboard.orders.toast.creatingAsn', { po: po.poNumber })
                                  : t('supplierDashboard.orders.toast.viewing', { po: po.poNumber }),
                            })
                          }
                        >
                          {btnLabel}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-section text-text-primary">
                {t('supplierDashboard.perf.title')}
              </h2>
              <GradeBadge grade={grade} size="sm" />
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: t('supplierDashboard.perf.otif'), value: mySupplier.otif },
                {
                  label: t('supplierDashboard.perf.leadTime'),
                  value: mySupplier.leadTimeAdherence,
                },
                {
                  label: t('supplierDashboard.perf.invoiceAccuracy'),
                  value: mySupplier.invoiceAccuracy,
                },
              ].map((m) => {
                const status = targetStatus(m.value, 90);
                return (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-text-secondary">
                        {m.label}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: TARGET_STATUS[status].text }}
                      >
                        {m.value}%
                      </span>
                    </div>
                    <TargetBar pct={m.value} target={90} status={status} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary italic">
              {t('supplierDashboard.perf.footnote')}
            </div>
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
            <h2 className="text-section text-text-primary mb-4">
              {t('supplierDashboard.docs.title')}
            </h2>
            <div className="flex flex-col">
              {documents.map((doc, idx) => {
                const action = t(DOC_STATUS_ACTION_KEY[doc.status]);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between gap-3 py-3 ${
                      idx < documents.length - 1
                        ? 'border-b border-border-subtle'
                        : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <FileText size={12} className="text-text-tertiary" />
                        <span className="text-sm font-semibold text-text-primary">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill variant={DOC_STATUS_TONE[doc.status]}>
                          {doc.status}
                        </StatusPill>
                        <span className="text-xs text-text-tertiary">
                          {doc.expiryDate
                            ? t('supplierDashboard.docs.exp', {
                                date: fmtDate(doc.expiryDate),
                              })
                            : t('supplierDashboard.docs.noExpiry')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        toast({
                          title: t('supplierDashboard.docs.toast.title', {
                            action,
                            name: doc.name,
                          }),
                          description: t('supplierDashboard.docs.toast.desc'),
                        })
                      }
                    >
                      {action}
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShellV2>
  );
};

export default SupplierDashboard;
