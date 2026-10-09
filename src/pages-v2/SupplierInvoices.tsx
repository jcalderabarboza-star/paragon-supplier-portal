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
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub } from '../components/ui-v2/DataTable';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import StatusPill from '../components/ui-v2/StatusPill';
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
  useGoodsReceipts,
} from '../services/query/hooks';
import { useInvoiceCreate, useInvoiceSubmit } from '../services/query/commandHooks';
import { useVerbAvailability, useNextAct } from '../hooks/useVerbAvailability';
import NextActLine from '../components/ui-v2/NextActLine';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import type { QtyRefusalReason } from '../lib/localeNumber';
import { openingQty, readInvoiceDraft, readInvoiceQty } from './invoices/invoiceLinesModel';
import { invoiceCeilingBasis, invoiceLinesFor } from '../services/data/orderReceipt';
import { InvoicedLines } from '../components/v2-features/ReceivedBlock';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { useRefusalText } from '../hooks/useRefusalText';
import { formatIDR, formatNumber } from '../lib/format';

// CP-0 · W1 · 2f-d — each refusal names what to type instead. Replaces a
// hard-coded English literal ('PO and a positive amount are required') that
// covered three distinct causes in one untranslated sentence.
const INVOICE_QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'supplierInvoices.new.qty.refused.empty',
  NOT_NUMERIC: 'supplierInvoices.new.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'supplierInvoices.new.qty.refused.ambiguous',
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
  // E2E-2 — the supplier's own receipts (the read is scoped to the supplier).
  const receiptsQuery = useGoodsReceipts();
  const createMutation = useInvoiceCreate();
  const submitMutation = useInvoiceSubmit();
  // ⚠️ ONE ATOM, TWO VERBS. `t_invoice_create` and `t_invoice_submit` both
  // require `invoice:submit`, so one availability answers for the page-level
  // create AND the row-level submit — and BOTH need a slot, because
  // `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` is exactly the page that
  // guarded its rows and shipped a live create in its header.
  const invoiceAvailability = useVerbAvailability('invoice:submit');
  const invCrumb = [
    t('supplierInvoices.crumb.invoices'),
  ];
  const INVOICES = invoicesQuery.data?.items ?? [];
  const mySupplier = supplierQuery.data ?? null;
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');

  // WHO ACTS NEXT (S2b). ⚠️ **READS THE SAME `selected.status` THE PILL READS,
  // AND THAT IS DELIBERATE EVEN THOUGH THE BUYER SIDE READS `lifecycleState`.**
  // `SupplierInvoice` HAS no `lifecycleState` — the supplier DTO carries only
  // the projection — so there is no canonical state to prefer here. Reading a
  // different source than the pill beside it would let the line and the status
  // disagree on one row, which is worse than the silence.
  //
  // ⚠️ **AND THE SILENCE IS LARGE ON THIS SURFACE: `Overdue` is a computed
  // projection no transition names, so those rows say nothing** — measured at 5
  // of 13 fixtures, whose canonical states are `Submitted` and `Approved` and
  // would have answered. That is the projection arm's case, reported not
  // repaired; it is not repairable here without a DTO change.
  const nextAct = useNextAct('invoice', selected?.status);
  // New-invoice draft form (creation-shape against one of the supplier's own
  // confirmed POs — the store assigns the invoice number).
  const [newOpen, setNewOpen] = useState(false);
  const [newPoRef, setNewPoRef] = useState('');
  // E2E-2 — what the supplier typed per line, keyed by material. A line the
  // supplier has not touched is absent and reads as its opening quantity.
  const [newQty, setNewQty] = useState<Record<string, string>>({});

  // The supplier's confirmed POs are the legal parents for a new invoice.
  const confirmablePos = (posQuery.data?.items ?? []).filter(
    (po) => po.status === POStatus.CONFIRMED,
  );

  // ── E2E-2 — THE LINES THE INVOICE OPENS ON ─────────────────────────────────
  // The order's lines at the order's prices, each capped at the quantity
  // received and accepted against it. ONE read (`readInvoiceDraft`) feeds the
  // button, the total and the dispatched payload.
  const newPo = confirmablePos.find((po) => po.poNumber === newPoRef) ?? null;
  const allReceipts = receiptsQuery.data?.items ?? [];
  const newLines = useMemo(
    () => (newPo ? invoiceLinesFor(newPo, allReceipts) : []),
    [newPo, allReceipts],
  );
  // ADM-1 — invoicing before a receipt is allowed (operator ruling). With no
  // receipt posted the lines open on the CONFIRMED quantity and the form says
  // the match will wait; it read `nothingReceived` and refused the create.
  const beforeReceipt = newPo !== null && invoiceCeilingBasis(newPo.poNumber, allReceipts) === 'confirmed';
  const draftRead = readInvoiceDraft(newLines, newQty);
  const choosePo = (poNumber: string) => {
    setNewPoRef(poNumber);
    setNewQty({});
  };

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
    // E2E-2 — the lines are read ONCE, above. A refused or all-zero draft never
    // reaches the dispatcher; the button is already disabled, and this is the
    // structural twin a keyboard or a future caller cannot route around.
    if (!draftRead.ok) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.lines.invalid'),
      });
      return;
    }
    const { amount, lines } = draftRead;
    createMutation.mutate(
      { poReference: newPoRef, amount, lines },
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
          setNewQty({});
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
    <ListPage
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
      meta={
        <>
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
        </>
      }
      notices={
        disputed.length > 0 ? (
          <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 flex items-start gap-2 text-sm text-warning-hover">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              <strong>{t('supplierInvoices.banner.dispute.label')}</strong>
              <Data>{disputed.map((i) => i.invoiceNumber).join(', ')}</Data>{' '}
              {t('supplierInvoices.banner.dispute.body')}
            </div>
          </div>
        ) : undefined
      }
      kpiColumns={3}
      kpis={
        <>
          <KpiCard
            eyebrow={t('supplierInvoices.kpi.received.eyebrow')}
            value={formatIDR(sums.paid, { compact: true })}
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
            value={formatIDR(sums.pending, { compact: true })}
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
            value={formatIDR(sums.disputed, { compact: true })}
            subtitle={
              <span className="text-critical">
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
        </>
      }
    >
      <DataTable<SupplierInvoice>
        className="mb-6"
        rows={INVOICES}
        rowKey={(inv) => inv.id}
        onRowClick={(inv) => openDetail(inv)}
        columns={[
          {
            id: 'invoiceNo',
            header: t('supplierInvoices.table.invoiceNo'),
            kind: 'id',
            cell: (inv) => {
              const Channel = CHANNEL_ICON[inv.channel];
              return (
                <>
                  <Data as="div">{inv.invoiceNumber}</Data>
                  <CellSub className="inline-flex items-center gap-1">
                    <Channel size={10} />
                    {t('supplierInvoices.table.via', { channel: inv.channel })}
                  </CellSub>
                </>
              );
            },
          },
          {
            id: 'poRef',
            header: t('supplierInvoices.table.poRef'),
            kind: 'id',
            cell: (inv) => <Data>{inv.poNumber}</Data>,
          },
          {
            id: 'amount',
            header: t('supplierInvoices.table.amount'),
            kind: 'money',
            cell: (inv) => (
              <>
                <Data>{formatIDR(inv.amount, { compact: true })}</Data>
                <CellSub>{formatIDR(inv.amount)}</CellSub>
              </>
            ),
          },
          {
            id: 'status',
            header: t('supplierInvoices.table.status'),
            kind: 'status',
            cell: (inv) => (
              <StatusPill variant={STATUS_VARIANT[inv.status]}>
                {inv.status}
              </StatusPill>
            ),
          },
          {
            id: 'dueDate',
            header: t('supplierInvoices.table.dueDate'),
            kind: 'date',
            cell: (inv) => <Data>{fmtDate(inv.dueDate)}</Data>,
          },
          {
            id: 'paymentDate',
            header: t('supplierInvoices.table.paymentDate'),
            kind: 'date',
            cell: (inv) =>
              inv.paymentDate ? (
                <span className="text-success">
                  <Data>{fmtDate(inv.paymentDate)}</Data>
                </span>
              ) : (
                '—'
              ),
          },
          {
            id: 'action',
            header: t('supplierInvoices.table.action'),
            kind: 'actions',
            // The cell's controls do not open the row's detail panel.
            stopRowClick: true,
            cell: (inv) => {
              const isPaid = isPaidStatus(inv.status);
              return (
                <>
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
                </>
              );
            },
          },
        ]}
      />

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
                    <Data>{formatIDR(selected.amount)}</Data>
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
                    <span className="mt-1 block">
                      <NextActLine act={nextAct} testId="next-act-supplier-invoice" />
                    </span>
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

            {/* E2E-2 — the lines this invoice stated, when it stated any. */}
            {selected.lines && selected.lines.length > 0 && (
              <InvoicedLines lines={selected.lines} testId="supplier-invoice-lines" />
            )}

            {panelMode === 'detail' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierInvoices.section.lifecycle')}
                </h3>
                <Timeline events={buildTimeline(selected, t)} />
                {selected.status === 'Disputed' && (
                  <div
                    className="mt-3 bg-critical-soft border-l-2 border-critical rounded px-3 py-2 text-xs text-critical"
                    data-testid="supplier-invoice-dispute-note"
                  >
                    {t('supplierInvoices.note.disputed')}{' '}
                    {selected.disputeReason
                      ? t('supplierInvoices.note.disputeReason', { reason: selected.disputeReason })
                      : t('supplierInvoices.note.disputeNoReason')}
                  </div>
                )}
                {selected.status === 'Overdue' && (
                  <div className="mt-3 bg-critical-soft border-l-2 border-critical rounded px-3 py-2 text-xs text-critical">
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
                {/* OPS-1 — "processed and credited to your account" was shown at
                    Payment Released, where the bank has confirmed nothing. The
                    credited sentence is kept for the state the bank's fact
                    produces, and only for it. */}
                {selected.status === 'Remittance Received' ? (
                  <div
                    className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-3 text-sm text-success font-semibold flex items-center gap-2"
                    data-testid="supplier-remittance-confirmed"
                  >
                    <CheckCircle2 size={14} />
                    {t('supplierInvoices.remittance.processed')}
                  </div>
                ) : (
                  <div
                    className="bg-bg-hover border-l-2 border-border-subtle rounded px-4 py-3 mb-3 text-sm text-text-secondary"
                    data-testid="supplier-payment-released"
                  >
                    {t('supplierInvoices.remittance.released')}
                  </div>
                )}
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
                      <Data>{formatIDR(selected.amount)}</Data>
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
                      {selected.bankAccount || t('supplierInvoices.remittance.bankUnknown')}
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
              disabled={createMutation.isPending || !newPoRef || !draftRead.ok}
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
              onChange={(e) => choosePo(e.target.value)}
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
          {/* E2E-2 — THE LINES. Opened on the order's own lines at the order's
              prices and the quantity received and accepted; the supplier may
              lower a quantity and never raise it past that. The amount is the
              lines' total and is not typed. */}
          {newPo && beforeReceipt && (
            <p className="text-sm text-text-secondary" data-testid="invoice-before-receipt">
              {t('supplierInvoices.new.beforeReceipt')}
            </p>
          )}
          {newPo && (
            <div data-testid="invoice-lines">
              <div className="text-label text-text-tertiary uppercase mb-1">
                {t('supplierInvoices.new.lines.title')}
              </div>
              <p className="text-xs text-text-tertiary mb-3">
                {t(beforeReceipt ? 'supplierInvoices.new.lines.noteConfirmed' : 'supplierInvoices.new.lines.note')}
              </p>
              <ul className="space-y-3">
                {newLines.map((l) => {
                  const raw = newQty[l.materialCode] ?? openingQty(l);
                  const read = readInvoiceQty(raw, l.maxQty);
                  const inputId = `new-qty-${l.materialCode}`;
                  return (
                    <li
                      key={l.materialCode}
                      className="rounded-md border border-border-subtle px-3 py-2"
                      data-testid={`invoice-line-${l.materialCode}`}
                    >
                      <div className="text-sm text-text-primary">
                        <Data>{l.materialCode}</Data> · {l.description}
                      </div>
                      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <dt className="text-text-tertiary">{t('supplierInvoices.new.lines.unitPrice')}</dt>
                          <dd><Data>{formatIDR(l.unitPrice)}</Data></dd>
                        </div>
                        <div>
                          <dt className="text-text-tertiary">
                            {t(l.basis === 'confirmed' ? 'supplierInvoices.new.lines.confirmed' : 'supplierInvoices.new.lines.accepted')}
                          </dt>
                          <dd data-testid={`invoice-line-accepted-${l.materialCode}`}>
                            <Data>{formatNumber(l.maxQty)} {l.uom}</Data>
                          </dd>
                        </div>
                      </dl>
                      <label htmlFor={inputId} className="text-label text-text-tertiary uppercase block mt-2 mb-1">
                        {t('supplierInvoices.new.lines.qtyLabel', { material: l.materialCode })}
                      </label>
                      {/* Ruling 6.2: text + inputMode, never type="number". */}
                      <input
                        id={inputId}
                        type="text"
                        inputMode="decimal"
                        className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
                        value={raw}
                        aria-invalid={!read.ok}
                        onChange={(e) => setNewQty((q) => ({ ...q, [l.materialCode]: e.target.value }))}
                      />
                      {!read.ok && (
                        <div
                          role="alert"
                          data-testid={`invoice-qty-refusal-${l.materialCode}`}
                          className="mt-1 text-[11px] text-critical"
                        >
                          {read.reason === 'EXCEEDS_RECEIVED' ? (
                            t(l.basis === 'confirmed' ? 'supplierInvoices.new.qty.refused.exceedsConfirmed' : 'supplierInvoices.new.qty.refused.exceedsReceived', {
                              max: formatNumber(l.maxQty),
                              uom: l.uom,
                            })
                          ) : (
                            <>
                              {t(INVOICE_QTY_REFUSAL_KEY[read.reason])}{' '}
                              <GlossaryTermChip
                                refTo={{ sourceType: 'QtyRefusalReason', term: read.reason }}
                              />
                            </>
                          )}
                        </div>
                      )}
                      {read.ok && (
                        <div className="mt-1 text-xs text-text-tertiary">
                          {t('supplierInvoices.new.lines.lineTotal')}{' '}
                          <Data>{formatIDR(read.value * l.unitPrice)}</Data>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-text-tertiary">{t('supplierInvoices.new.lines.total')}</span>
                <span className="font-semibold" data-testid="invoice-lines-total">
                  {draftRead.ok ? <Data>{formatIDR(draftRead.amount)}</Data> : '—'}
                </span>
              </div>
              {!draftRead.ok && newLines.every((l) => readInvoiceQty(newQty[l.materialCode] ?? openingQty(l), l.maxQty).ok) && (
                <div role="alert" data-testid="invoice-lines-all-zero" className="mt-1 text-[11px] text-critical">
                  {t('supplierInvoices.new.lines.allZero')}
                </div>
              )}
            </div>
          )}
        </div>
      </SidePanel>
    </ListPage>
  );
};

export default SupplierInvoices;
