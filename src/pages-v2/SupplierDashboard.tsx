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
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { PreferredChannel } from '../types/supplier.types';
import { POStatus } from '../types/purchaseOrder.types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
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

const perfVariant = (v: number): 'success' | 'warning' | 'danger' => {
  if (v >= 90) return 'success';
  if (v >= 80) return 'warning';
  return 'danger';
};

const CHANNEL_LABEL: Record<PreferredChannel, string> = {
  [PreferredChannel.WHATSAPP]: 'WhatsApp',
  [PreferredChannel.WEB]: 'Web Portal',
  [PreferredChannel.EMAIL]: 'Email',
  [PreferredChannel.API]: 'API/EDI',
};

const PO_STATUS_VARIANT: Record<
  POStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  [POStatus.SENT]: 'neutral',
  [POStatus.VIEWED]: 'neutral',
  [POStatus.ACKNOWLEDGED]: 'info',
  [POStatus.CONFIRMED]: 'info',
  [POStatus.PARTIALLY_DELIVERED]: 'warning',
  [POStatus.DELIVERED]: 'success',
  [POStatus.CLOSED]: 'success',
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

const DASH_CRUMB = ['ACQUIRE', 'DASHBOARD'];

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

const DOC_STATUS_ACTION: Record<SupplierDocumentStatus, string> = {
  Valid: 'View',
  'Expiring Soon': 'Renew',
  Expired: 'Renew',
  'Awaiting Upload': 'Upload',
  'Under Review': 'View',
};

const GradeBadge: React.FC<{ grade: Grade; size?: 'sm' | 'md' }> = ({
  grade,
  size = 'md',
}) => {
  const tone = GRADE_TONE[grade];
  const px = size === 'sm' ? 'w-10 h-10 text-base' : 'w-16 h-16 text-3xl';
  return (
    <div
      className={`rounded-md flex items-center justify-center font-black ${px}`}
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

const ProgressBar: React.FC<{ value: number; variant: 'success' | 'warning' | 'danger' }> = ({
  value,
  variant,
}) => {
  const colorClass =
    variant === 'success'
      ? 'bg-success'
      : variant === 'warning'
        ? 'bg-warning'
        : 'bg-danger';
  return (
    <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
};

const SupplierDashboard: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
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
    return <LoadingState breadcrumb={DASH_CRUMB} />;
  if (
    supplierQuery.isError ||
    posQuery.isError ||
    invoicesQuery.isError ||
    documentsQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={DASH_CRUMB}
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
        breadcrumb={DASH_CRUMB}
        title="No supplier profile yet"
        subtitle="Your Paragon supplier record is not available."
        message="Your dashboard appears here once Paragon links your supplier profile."
      />
    );

  const grade = mySupplier.scorecardGrade as Grade;
  const channelLabel = CHANNEL_LABEL[mySupplier.preferredChannel];
  const otifVariant = perfVariant(mySupplier.otif);
  const otifStatusLabel =
    mySupplier.otif >= 90
      ? 'On Track'
      : mySupplier.otif >= 80
        ? 'Needs Attention'
        : 'At Risk';

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
      iconClass: 'text-warning',
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
        breadcrumb={['ACQUIRE', 'DASHBOARD']}
        title={`Welcome back, ${mySupplier.name}`}
        subtitle={`Paragon Corp Supplier Portal · Last login: 5 April 2026 · Channel: ${channelLabel}`}
      />

      <PageMetaLine className="-mt-6 mb-6">
        Supplier identity · {mySupplier.country} · {mySupplier.category}
      </PageMetaLine>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-xl font-bold text-text-primary mb-1">
              {mySupplier.name}
            </div>
            <div className="text-sm text-text-secondary">
              SAP BP: {mySupplier.sapBpNumber} · Channel: {channelLabel}
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
                Paragon Grade
              </div>
              <GradeBadge grade={grade} />
              <div className="text-xs text-text-secondary mt-1">
                {mySupplier.otif >= 90 ? '94' : mySupplier.otif >= 80 ? '82' : '70'} / 100
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <StatusPill variant={otifVariant}>{otifStatusLabel}</StatusPill>
              <div className="text-xs text-text-secondary">
                OTIF: {mySupplier.otif}%
              </div>
              <div className="text-xs text-text-tertiary">Target: ≥ 95%</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-6">
        <KpiCard
          eyebrow="Open Orders"
          value={openOrders.toString()}
          subtitle="Awaiting action"
          icon={ClipboardList}
        />
        <KpiCard
          eyebrow="Pending ASNs"
          value={pendingASNs.toString()}
          subtitle="Need shipment notice"
          icon={Truck}
        />
        <KpiCard
          eyebrow="Unpaid Invoices"
          value={unpaidInvoices.toString()}
          subtitle={
            unpaidInvoices > 0 ? (
              <span className="text-danger">Pending payment</span>
            ) : (
              'All settled'
            )
          }
          icon={CreditCard}
        />
        <KpiCard
          eyebrow="Open Sourcing"
          value="2"
          subtitle="Awaiting your response"
          icon={ClipboardList}
        />
        <KpiCard
          eyebrow="My OTIF Score"
          value={`${mySupplier.otif}%`}
          subtitle="Last 6 months"
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">
        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-text-primary">
                    Today's briefing
                  </div>
                  <StatusPill variant="neutral">Sample data</StatusPill>
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">{today}</div>
              </div>
              <StatusPill variant={remaining > 0 ? 'danger' : 'success'}>
                {remaining > 0
                  ? `${remaining} action${remaining !== 1 ? 's' : ''}`
                  : 'All clear'}
              </StatusPill>
            </div>
            {remaining === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-success-soft items-center justify-center mb-3">
                  <CheckCircle2 size={24} className="text-success" />
                </div>
                <div className="text-base font-semibold text-success mb-1">
                  All done for today
                </div>
                <div className="text-sm text-text-tertiary">
                  No pending actions. Check back tomorrow.
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {activeActions.map((action, idx) => {
                  const Icon = action.Icon;
                  return (
                    <div
                      key={action.id}
                      className={`px-5 py-4 flex gap-4 items-start ${
                        idx < activeActions.length - 1
                          ? 'border-b border-border-subtle'
                          : ''
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${action.iconBg}`}
                      >
                        <Icon size={16} className={action.iconClass} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-text-primary">
                            {action.title}
                          </span>
                          <StatusPill variant={action.badgeVariant}>
                            {action.badge}
                          </StatusPill>
                        </div>
                        <div className="text-xs text-text-secondary mb-2">
                          {action.desc}
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant={action.primary ? 'primary' : 'secondary'}
                            onClick={() => {
                              toast({
                                variant: 'info',
                                title: action.title,
                                description: `${action.btnLabel} workflow initiated.`,
                              });
                              dismiss(action.id);
                            }}
                          >
                            {action.btnLabel}
                          </Button>
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
              <h2 className="text-base font-semibold text-text-primary">
                My recent purchase orders
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableHeaderCell>PO #</TableHeaderCell>
                <TableHeaderCell>Order date</TableHeaderCell>
                <TableHeaderCell className="text-right">Items</TableHeaderCell>
                <TableHeaderCell className="text-right">Value</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableHeader>
              <tbody>
                {sortedPOs.map((po) => {
                  const isActionable =
                    po.status === POStatus.SENT ||
                    po.status === POStatus.ACKNOWLEDGED;
                  const isConfirmed = po.status === POStatus.CONFIRMED;
                  const btnLabel = isActionable
                    ? 'Confirm'
                    : isConfirmed
                      ? 'Create ASN'
                      : 'View';
                  return (
                    <TableRow key={po.id}>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-text-primary">
                          {po.poNumber}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        {fmtDate(po.orderDate)}
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {po.lineItems.length}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                        {fmtIDR(po.totalValue)}
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={PO_STATUS_VARIANT[po.status]}>
                          {po.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={isActionable ? 'primary' : 'secondary'}
                          onClick={() =>
                            toast({
                              variant: 'info',
                              title:
                                isActionable
                                  ? `Opening ${po.poNumber} for confirmation`
                                  : isConfirmed
                                    ? `Creating ASN for ${po.poNumber}`
                                    : `Viewing ${po.poNumber}`,
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
              <h2 className="text-base font-semibold text-text-primary">
                My performance score
              </h2>
              <GradeBadge grade={grade} size="sm" />
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'OTIF', value: mySupplier.otif },
                {
                  label: 'Lead Time Adherence',
                  value: mySupplier.leadTimeAdherence,
                },
                {
                  label: 'Invoice Accuracy',
                  value: mySupplier.invoiceAccuracy,
                },
              ].map((m) => {
                const v = perfVariant(m.value);
                const textClass =
                  v === 'success'
                    ? 'text-success'
                    : v === 'warning'
                      ? 'text-warning'
                      : 'text-danger';
                return (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-text-secondary">
                        {m.label}
                      </span>
                      <span className={`text-sm font-bold ${textClass}`}>
                        {m.value}%
                      </span>
                    </div>
                    <ProgressBar value={m.value} variant={v} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary italic">
              Performance reviewed monthly by Paragon procurement team
            </div>
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              My documents
            </h2>
            <div className="flex flex-col">
              {documents.map((doc, idx) => {
                const action = DOC_STATUS_ACTION[doc.status];
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
                            ? `Exp: ${fmtDate(doc.expiryDate)}`
                            : 'No expiry'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        toast({
                          title: `${action} — ${doc.name}`,
                          description:
                            'Document management workflow coming in Phase 2.',
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
