import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  FileText,
  Send,
  Receipt,
  Wallet,
  Mail,
  MessageCircle,
  Globe,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Data from '../components/ui-v2/Data';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { POStatus } from '../services/data/types';
import type {
  SupplierInvoice,
  SupplierInvoiceStatus as InvStatus,
} from '../services/data/types';
import {
  useSupplierInvoices,
  useCurrentSupplier,
  usePurchaseOrders,
} from '../services/query/hooks';
import { useInvoiceCreate, useInvoiceSubmit } from '../services/query/commandHooks';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import type { QtyRefusalReason } from '../lib/localeNumber';
import { readInvoiceAmount } from './invoices/invoiceAmountModel';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { useRefusalText } from '../hooks/useRefusalText';

// CP-0 · W1 · 2f-d — each refusal names what to type instead. Replaces a
// hard-coded English literal ('PO and a positive amount are required') that
// covered three distinct causes in one untranslated sentence.
const INVOICE_AMOUNT_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'supplierInvoices.new.amount.refused.empty',
  NOT_NUMERIC: 'supplierInvoices.new.amount.refused.notNumeric',
  AMBIGUOUS_QTY: 'supplierInvoices.new.amount.refused.ambiguous',
};

const STATUS_VARIANT: Record<InvStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Approved: 'success',
  'Payment Released': 'success',
  'Remittance Received': 'success',
  Overdue: 'danger',
  Disputed: 'danger',
};

const STATUS_RANK: Record<InvStatus, number> = {
  Draft: 0,
  'Pending Approval': 1,
  Approved: 2,
  'Payment Released': 3,
  'Remittance Received': 4,
  Overdue: -1,
  Disputed: -1,
};

const CHANNEL_ICON: Record<SupplierInvoice['channel'], LucideIcon> = {
  WhatsApp: MessageCircle,
  Email: Mail,
  Web: Globe,
  API: Send,
};

const fmtIDR = (n: number): string => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  return `Rp ${Math.round(n / 1_000_000)}jT`;
};

const fmtIDRFull = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

const fmtDate = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type PanelMode = 'detail' | 'remittance';

const buildTimeline = (
  inv: SupplierInvoice,
  t: TFunction,
): TimelineEvent[] => {
  const r = STATUS_RANK[inv.status];
  const isOverdue = inv.status === 'Overdue';
  const isDisputed = inv.status === 'Disputed';
  const cleared = t('supplierInvoices.timeline.cleared');
  const stateFor = (rank: number): 'completed' | 'current' | 'pending' => {
    if (r === -1) return rank === 0 ? 'completed' : 'pending';
    if (r > rank) return 'completed';
    if (r === rank) return 'current';
    return 'pending';
  };
  return [
    {
      id: 'submitted',
      title: t('supplierInvoices.timeline.submitted'),
      timestamp: fmtDate(inv.submittedDate),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'pending',
      title: t('supplierInvoices.timeline.pending'),
      timestamp:
        r >= 1
          ? cleared
          : isDisputed
            ? t('supplierInvoices.timeline.disputed')
            : undefined,
      status: isDisputed ? 'current' : stateFor(1),
      icon: Clock,
    },
    {
      id: 'approved',
      title: t('supplierInvoices.timeline.approved'),
      timestamp: r >= 2 ? cleared : undefined,
      status: stateFor(2),
      icon: CheckCircle2,
    },
    {
      id: 'released',
      title: t('supplierInvoices.timeline.released'),
      timestamp:
        r >= 3 && inv.paymentDate ? fmtDate(inv.paymentDate) : undefined,
      status: isOverdue ? 'current' : stateFor(3),
      icon: Send,
    },
    {
      id: 'paid',
      title: t('supplierInvoices.timeline.received'),
      timestamp: r >= 4 ? t('supplierInvoices.timeline.confirmed') : undefined,
      status: stateFor(4),
      icon: Wallet,
    },
  ];
};

const SupplierInvoices: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const invoicesQuery = useSupplierInvoices();
  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  const createMutation = useInvoiceCreate();
  const submitMutation = useInvoiceSubmit();
  // ⚠️ ONE ATOM, TWO VERBS. `t_invoice_create` and `t_invoice_submit` both
  // require `invoice:submit`, so one availability answers for the page-level
  // create AND the row-level submit — and BOTH need a slot, because
  // `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` is exactly the page that
  // guarded its rows and shipped a live create in its header.
  const invoiceAvailability = useVerbAvailability('invoice:submit');
  const invCrumb = [
    t('supplierInvoices.crumb.settle'),
    t('supplierInvoices.crumb.invoices'),
  ];
  const INVOICES = invoicesQuery.data?.items ?? [];
  const mySupplier = supplierQuery.data ?? null;
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  // New-invoice draft form (creation-shape against one of the supplier's own
  // confirmed POs — the store assigns the invoice number).
  const [newOpen, setNewOpen] = useState(false);
  const [newPoRef, setNewPoRef] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // The supplier's confirmed POs are the legal parents for a new invoice.
  const confirmablePos = (posQuery.data?.items ?? []).filter(
    (po) => po.status === POStatus.CONFIRMED,
  );

  // ── CP-0 · W1 · 2f-d — THE ONE READ of the new-invoice amount ──────────────
  // The gate, the inline message and the dispatched payload all read this, so
  // none of them can disagree about the amount being invoiced.
  const amountRead = readInvoiceAmount(newAmount);
  const amountPositive = amountRead.ok && amountRead.value > 0;

  const submitDraft = (inv: SupplierInvoice) => {
    submitMutation.mutate(
      { invoiceId: inv.id, amount: inv.amount },
      {
        onSuccess: (res) => {
          toast(
            res.status === 'failed'
              ? {
                  variant: 'warning',
                  title: t('invoice.submit.failed.title', { invoiceNumber: inv.invoiceNumber }),
                  description: refusalText(res.reason) ?? t('invoice.submit.failed.desc', { reason: res.reason ?? '' }),
                }
              : {
                  variant: 'success',
                  title: t('invoice.submit.success.title', { invoiceNumber: inv.invoiceNumber }),
                  description: t('invoice.submit.success.desc', { correlationId: res.correlationId }),
                },
          );
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  const submitNewInvoice = () => {
    // Each cause gets its OWN translated message. The retired guard collapsed
    // three distinct failures — no PO, an unreadable amount, a non-positive
    // amount — into one hard-coded English sentence, in both locales.
    if (!newPoRef) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.po.required'),
      });
      return;
    }
    if (!amountRead.ok) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t(INVOICE_AMOUNT_REFUSAL_KEY[amountRead.reason]),
      });
      return;
    }
    // The pre-existing `> 0` rule, PRESERVED VERBATIM — whether a zero-value
    // invoice is legal is a commercial question, not a parsing one. What changed
    // is that it now says which rule it is.
    if (amountRead.value <= 0) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.amount.mustExceedZero'),
      });
      return;
    }
    const amount = amountRead.value;
    createMutation.mutate(
      { poReference: newPoRef, amount },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.create.failed.title'),
              description: refusalText(res.reason) ?? t('invoice.create.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          setNewOpen(false);
          setNewPoRef('');
          setNewAmount('');
          toast({
            variant: 'success',
            title: t('invoice.create.success.title', { invoiceNumber: res.entityId ?? '' }),
            description: t('invoice.create.success.desc', { poNumber: newPoRef, correlationId: res.correlationId }),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  const sums = useMemo(() => {
    const sum = (filter: (i: SupplierInvoice) => boolean) =>
      INVOICES.filter(filter).reduce((a, b) => a + b.amount, 0);
    return {
      paid: sum((i) => i.status === 'Payment Released' || i.status === 'Remittance Received'),
      pending: sum((i) =>
        i.status === 'Pending Approval' || i.status === 'Approved',
      ),
      disputed: sum((i) => i.status === 'Disputed'),
    };
  }, [INVOICES]);

  const counts = useMemo(() => {
    return {
      paid: INVOICES.filter(
        (i) => i.status === 'Payment Released' || i.status === 'Remittance Received',
      ).length,
      pending: INVOICES.filter((i) =>
        ['Pending Approval', 'Approved'].includes(i.status),
      ).length,
      disputed: INVOICES.filter((i) => i.status === 'Disputed').length,
    };
  }, [INVOICES]);

  const disputed = INVOICES.filter((i) => i.status === 'Disputed');

  const lastSubmitted = INVOICES.reduce(
    (acc, i) => (i.submittedDate > acc ? i.submittedDate : acc),
    INVOICES[0]?.submittedDate ?? '',
  );

  const openDetail = (inv: SupplierInvoice) => {
    setSelected(inv);
    setPanelMode('detail');
  };

  const closePanel = () => {
    setSelected(null);
    setPanelMode('detail');
  };

  const isPaidStatus = (s: InvStatus): boolean =>
    s === 'Payment Released' || s === 'Remittance Received';

  if (!supplierId) return <NoSupplierIdentity />;
  if (invoicesQuery.isPending || supplierQuery.isPending)
    return <LoadingState breadcrumb={invCrumb} />;
  if (invoicesQuery.isError || supplierQuery.isError)
    return (
      <ErrorState
        breadcrumb={invCrumb}
        error={invoicesQuery.error ?? supplierQuery.error}
        onRetry={() => {
          invoicesQuery.refetch();
          supplierQuery.refetch();
        }}
      />
    );
  if (INVOICES.length === 0)
    return (
      <EmptyState
        breadcrumb={invCrumb}
        title={t('supplierInvoices.empty.title')}
        subtitle={t('supplierInvoices.empty.subtitle', {
          supplier:
            mySupplier?.name ??
            identity.supplierName ??
            t('supplierInvoices.empty.fallbackSupplier'),
        })}
        message={t('supplierInvoices.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={invCrumb}
        title={t('supplierInvoices.header.title')}
        subtitle={t('supplierInvoices.header.subtitle', {
          supplier: mySupplier?.name ?? identity.supplierName ?? '',
        })}
        actions={
          // The page-level create is WITHHELD rather than disabled (§73's
          // pattern). Export holds no atom and is not gated — a read is
          // ungoverned, not withheld (§75e).
          <div className="flex items-center gap-3">
            <HandoffNotice
              availability={invoiceAvailability}
              testId="handoff-invoice-create"
            />
            <BulkActionsBar
              actions={[
                {
                  label: t('supplierInvoices.action.export'),
                  icon: Download,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('supplierInvoices.toast.export.title'),
                    }),
                },
              ]}
              {...(invoiceAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('invoice.create.action'),
                      icon: Plus,
                      onClick: () => setNewOpen(true),
                    },
                  }
                : {})}
            />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          INVOICES.length === 1
            ? 'supplierInvoices.meta.summary.one'
            : 'supplierInvoices.meta.summary.other',
          { count: INVOICES.length },
        )}{' '}
        <Data>{fmtDate(lastSubmitted)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Invoice create + submit dispatch
            through the wired `invoice` target (DR-7); the PO backing them is fixture,
            and nothing reaches e-Faktur or SAP. */}
        <ProvenanceMarker capability="invoices" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierInvoices.kpi.received.eyebrow')}
          value={fmtIDR(sums.paid)}
          subtitle={
            <span className="text-success">
              {t(
                counts.paid === 1
                  ? 'supplierInvoices.kpi.invoiceCount.one'
                  : 'supplierInvoices.kpi.invoiceCount.other',
                { count: counts.paid },
              )}
            </span>
          }
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('supplierInvoices.kpi.pending.eyebrow')}
          value={fmtIDR(sums.pending)}
          subtitle={
            <span className="text-warning-hover">
              {t(
                counts.pending === 1
                  ? 'supplierInvoices.kpi.invoiceCount.one'
                  : 'supplierInvoices.kpi.invoiceCount.other',
                { count: counts.pending },
              )}
            </span>
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('supplierInvoices.kpi.disputed.eyebrow')}
          value={fmtIDR(sums.disputed)}
          subtitle={
            <span className="text-danger">
              {t(
                counts.disputed === 1
                  ? 'supplierInvoices.kpi.invoiceCount.one'
                  : 'supplierInvoices.kpi.invoiceCount.other',
                { count: counts.disputed },
              )}
            </span>
          }
          icon={AlertTriangle}
        />
      </div>

      {disputed.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-6 flex items-start gap-2 text-sm text-warning-hover">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>{t('supplierInvoices.banner.dispute.label')}</strong>
            <Data>{disputed.map((i) => i.invoiceNumber).join(', ')}</Data>{' '}
            {t('supplierInvoices.banner.dispute.body')}
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierInvoices.table.invoiceNo')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.poRef')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierInvoices.table.amount')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.status')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.dueDate')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.paymentDate')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierInvoices.table.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {INVOICES.map((inv) => {
              const Channel = CHANNEL_ICON[inv.channel];
              const isPaid = isPaidStatus(inv.status);
              return (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(inv)}
                >
                  <TableCell>
                    <Data as="div" className="text-xs font-bold text-text-primary">
                      {inv.invoiceNumber}
                    </Data>
                    <div className="inline-flex items-center gap-1 text-[10px] text-text-tertiary mt-0.5">
                      <Channel size={10} />
                      {t('supplierInvoices.table.via', { channel: inv.channel })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Data className="text-xs text-text-secondary">
                      {inv.poNumber}
                    </Data>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="font-semibold text-text-primary">
                      <Data>{fmtIDR(inv.amount)}</Data>
                    </div>
                    <div className="text-xs text-text-tertiary">
                      <Data>{fmtIDRFull(inv.amount)}</Data>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[inv.status]}>
                      {inv.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
                    <Data>{fmtDate(inv.dueDate)}</Data>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {inv.paymentDate ? (
                      <span className="text-success font-semibold">
                        <Data>{fmtDate(inv.paymentDate)}</Data>
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {isPaid ? (
                      <Button
                        variant="outline"
                        icon={Receipt}
                        onClick={() => {
                          setSelected(inv);
                          setPanelMode('remittance');
                        }}
                      >
                        {t('supplierInvoices.action.remittance')}
                      </Button>
                    ) : inv.status === 'Draft' ? (
                      invoiceAvailability.kind === 'held' ? (
                        <Button
                          variant="outline"
                          disabled={submitMutation.isPending}
                          onClick={() => submitDraft(inv)}
                        >
                          {t('invoice.submit.action')}
                        </Button>
                      ) : (
                        <HandoffNotice
                          availability={invoiceAvailability}
                          testId="handoff-invoice-submit"
                        />
                      )
                    ) : inv.status === 'Disputed' ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast({
                            variant: 'warning',
                            title: t('supplierInvoices.toast.resolve.title'),
                            description: t('supplierInvoices.toast.resolve.desc'),
                          })
                        }
                      >
                        {t('supplierInvoices.action.resolve')}
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => openDetail(inv)}>
                        {t('supplierInvoices.action.view')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <FileText size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          {t('supplierInvoices.ariba.pre')}
          <strong className="text-info">{t('supplierInvoices.ariba.strong')}</strong>
          {t('supplierInvoices.ariba.post')}
        </span>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={
          selected
            ? t('supplierInvoices.panel.detail.title', {
                invoiceNumber: selected.invoiceNumber,
              })
            : ''
        }
        footerActions={
          selected && (
            <>
              <Button variant="secondary" onClick={closePanel}>
                {t('supplierInvoices.panel.close')}
              </Button>
              {panelMode === 'detail' && isPaidStatus(selected.status) && (
                <Button
                  variant="outline"
                  icon={Receipt}
                  onClick={() => setPanelMode('remittance')}
                >
                  {t('supplierInvoices.panel.viewRemittance')}
                </Button>
              )}
              {panelMode === 'remittance' && (
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={() =>
                    toast({
                      title: t('supplierInvoices.toast.downloadPdf.title'),
                    })
                  }
                >
                  {t('supplierInvoices.panel.downloadPdf')}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('supplierInvoices.section.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.poReference')}</dt>
                  <Data as="dd" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.amount')}</dt>
                  <dd className="text-text-primary font-semibold">
                    <Data>{fmtIDRFull(selected.amount)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.submitted')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.submittedDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.dueDate')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.dueDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.status')}</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selected.status]}>
                      {selected.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.channel}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.buyerContact')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.buyerContact}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.bankAccount')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.bankAccount}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.sapFiDoc')}</dt>
                  <Data
                    as="dd"
                    className={`text-xs ${
                      selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapFiDoc ?? t('supplierInvoices.field.pending')}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.paymentRef')}</dt>
                  <Data
                    as="dd"
                    className={`text-xs ${
                      selected.paymentRef
                        ? 'text-text-primary'
                        : 'text-text-tertiary'
                    }`}
                  >
                    {selected.paymentRef ?? t('supplierInvoices.field.pending')}
                  </Data>
                </div>
              </dl>
            </section>

            {panelMode === 'detail' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierInvoices.section.lifecycle')}
                </h3>
                <Timeline events={buildTimeline(selected, t)} />
                {selected.status === 'Disputed' && (
                  <div className="mt-3 bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger">
                    {t('supplierInvoices.note.disputed')}
                  </div>
                )}
                {selected.status === 'Overdue' && (
                  <div className="mt-3 bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger">
                    {t('supplierInvoices.note.overdue')}
                  </div>
                )}
              </section>
            )}

            {panelMode === 'remittance' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierInvoices.section.remittance')}
                </h3>
                <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-3 text-sm text-success font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {t('supplierInvoices.remittance.processed')}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.invoiceNo')}</dt>
                    <Data as="dd" className="text-text-primary">
                      {selected.invoiceNumber}
                    </Data>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.amountPaid')}</dt>
                    <dd className="text-text-primary font-semibold">
                      <Data>{fmtIDRFull(selected.amount)}</Data>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.paymentDate')}</dt>
                    <dd className="text-text-primary font-medium">
                      <Data>{fmtDate(selected.paymentDate)}</Data>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.bankCredited')}</dt>
                    <dd className="text-text-primary font-medium">
                      {selected.bankAccount}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.reference')}</dt>
                    <Data as="dd" className="text-text-primary">
                      {selected.paymentRef ?? '—'}
                    </Data>
                  </div>
                </dl>
                {selected.remittanceNote && (
                  <div className="mt-3 text-xs text-text-secondary bg-bg-hover rounded px-3 py-2 border border-border-subtle">
                    <strong className="text-text-primary">{t('supplierInvoices.remittance.paymentNote')}</strong>{' '}
                    {selected.remittanceNote}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </SidePanel>

      <SidePanel
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('supplierInvoices.new.title')}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              {t('supplierInvoices.new.cancel')}
            </Button>
            {/* Disabled-under-refusal is UX; the gate in `submitNewInvoice` is
                what guarantees no misread amount is dispatched. */}
            <Button
              variant="outline"
              disabled={createMutation.isPending || !newPoRef || !amountPositive}
              onClick={submitNewInvoice}
            >
              {t('supplierInvoices.new.createDraft')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
            {t('supplierInvoices.new.intro')}
          </p>
          <div>
            <label htmlFor="new-po" className="text-label text-text-tertiary uppercase block mb-1">
              {t('supplierInvoices.new.poLabel')}
            </label>
            <select
              id="new-po"
              className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
              value={newPoRef}
              onChange={(e) => setNewPoRef(e.target.value)}
            >
              <option value="">{t('supplierInvoices.new.poPlaceholder')}</option>
              {confirmablePos.map((po) => (
                <option key={po.id} value={po.poNumber}>
                  {po.poNumber}
                </option>
              ))}
            </select>
            {confirmablePos.length === 0 && (
              <div className="mt-1 text-xs text-text-tertiary">
                {t('supplierInvoices.new.noPos')}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="new-amount" className="text-label text-text-tertiary uppercase block mb-1">
              {t('supplierInvoices.new.amountLabel')}
            </label>
            {/* Ruling 6.2: text + inputMode. `min={0}` was a number-input
                affordance that never bound the parse — a negative is refused by
                `normalizeQty` as NOT_NUMERIC, where it is actually enforced. */}
            <input
              id="new-amount"
              type="text"
              inputMode="decimal"
              className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
              placeholder={t('supplierInvoices.new.amountPlaceholder')}
              value={newAmount}
              aria-invalid={newAmount.trim() !== '' && !amountRead.ok}
              onChange={(e) => setNewAmount(e.target.value)}
            />
            {/* UNSEEDED field, so the 2e-a rule applies: an untouched blank does
                not nag on sight — it refuses at the gate and speaks once the
                supplier has typed something. (Contrast the seeded 2f-a/2f-c
                cells, where every blank is operator-cleared.) */}
            {newAmount.trim() !== '' && !amountRead.ok && (
              <div
                role="alert"
                data-testid="invoice-amount-refusal"
                className="mt-1 text-[11px] text-danger"
              >
                {t(INVOICE_AMOUNT_REFUSAL_KEY[amountRead.reason])}{' '}
                <GlossaryTermChip
                  refTo={{ sourceType: 'QtyRefusalReason', term: amountRead.reason }}
                />
              </div>
            )}
            {/* The pre-existing `> 0` rule, finally SAYING SO rather than
                failing into a generic warning toast. No rule changed. */}
            {amountRead.ok && amountRead.value <= 0 && (
              <div
                role="alert"
                data-testid="invoice-amount-zero"
                className="mt-1 text-[11px] text-danger"
              >
                {t('supplierInvoices.new.amount.mustExceedZero')}
              </div>
            )}
          </div>
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierInvoices;
