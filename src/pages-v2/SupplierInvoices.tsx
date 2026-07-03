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
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import type {
  SupplierInvoice,
  SupplierInvoiceStatus as InvStatus,
} from '../services/data/types';
import { useSupplierInvoices, useCurrentSupplier } from '../services/query/hooks';

const INV_CRUMB = ['SETTLE', 'MY INVOICES'];

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

const buildTimeline = (inv: SupplierInvoice): TimelineEvent[] => {
  const r = STATUS_RANK[inv.status];
  const isOverdue = inv.status === 'Overdue';
  const isDisputed = inv.status === 'Disputed';
  const stateFor = (rank: number): 'completed' | 'current' | 'pending' => {
    if (r === -1) return rank === 0 ? 'completed' : 'pending';
    if (r > rank) return 'completed';
    if (r === rank) return 'current';
    return 'pending';
  };
  return [
    {
      id: 'submitted',
      title: 'Invoice submitted',
      timestamp: fmtDate(inv.submittedDate),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'pending',
      title: 'Pending approval',
      timestamp: r >= 1 ? 'Cleared' : isDisputed ? 'Disputed' : undefined,
      status: isDisputed ? 'current' : stateFor(1),
      icon: Clock,
    },
    {
      id: 'approved',
      title: 'Approved',
      timestamp: r >= 2 ? 'Cleared' : undefined,
      status: stateFor(2),
      icon: CheckCircle2,
    },
    {
      id: 'released',
      title: 'Payment released',
      timestamp:
        r >= 3 && inv.paymentDate ? fmtDate(inv.paymentDate) : undefined,
      status: isOverdue ? 'current' : stateFor(3),
      icon: Send,
    },
    {
      id: 'paid',
      title: 'Remittance received',
      timestamp: r >= 4 ? 'Confirmed' : undefined,
      status: stateFor(4),
      icon: Wallet,
    },
  ];
};

const SupplierInvoices: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const invoicesQuery = useSupplierInvoices();
  const supplierQuery = useCurrentSupplier();
  const INVOICES = invoicesQuery.data?.items ?? [];
  const mySupplier = supplierQuery.data ?? null;
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');

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
    return <LoadingState breadcrumb={INV_CRUMB} />;
  if (invoicesQuery.isError || supplierQuery.isError)
    return (
      <ErrorState
        breadcrumb={INV_CRUMB}
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
        breadcrumb={INV_CRUMB}
        title="No invoices yet"
        subtitle={`No invoices on file for ${mySupplier?.name ?? identity.supplierName ?? 'this supplier'}.`}
        message="Submitted invoices and payment status will appear here."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={INV_CRUMB}
        title="My Invoices"
        subtitle={`Submit and track invoices · view payment status and remittance advice — ${mySupplier?.name ?? identity.supplierName ?? ''}.`}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: 'Export',
                icon: Download,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: 'Downloading invoice report',
                  }),
              },
            ]}
            primary={{
              label: 'New invoice',
              icon: Plus,
              onClick: () =>
                toast({
                  title: 'New invoice submission',
                  description:
                    'Submission flow coming in Phase 2A — currently a stub.',
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {INVOICES.length} invoices · last submitted {fmtDate(lastSubmitted)}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <KpiCard
          eyebrow="Payments Received"
          value={fmtIDR(sums.paid)}
          subtitle={
            <span className="text-success">
              {counts.paid} invoice{counts.paid !== 1 ? 's' : ''}
            </span>
          }
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Pending Payment"
          value={fmtIDR(sums.pending)}
          subtitle={
            <span className="text-warning">
              {counts.pending} invoice{counts.pending !== 1 ? 's' : ''}
            </span>
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow="Disputed"
          value={fmtIDR(sums.disputed)}
          subtitle={
            <span className="text-danger">
              {counts.disputed} invoice{counts.disputed !== 1 ? 's' : ''}
            </span>
          }
          icon={AlertTriangle}
        />
      </div>

      {disputed.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-6 flex items-start gap-2 text-sm text-warning">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Invoice dispute: </strong>
            {disputed.map((i) => i.invoiceNumber).join(', ')} — Quantity
            mismatch. Credit note required before payment can be released.
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>Invoice #</TableHeaderCell>
            <TableHeaderCell>PO ref</TableHeaderCell>
            <TableHeaderCell className="text-right">Amount</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Due date</TableHeaderCell>
            <TableHeaderCell>Payment date</TableHeaderCell>
            <TableHeaderCell className="text-right">Action</TableHeaderCell>
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
                    <div className="font-mono text-xs font-bold text-text-primary">
                      {inv.invoiceNumber}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] text-text-tertiary mt-0.5">
                      <Channel size={10} />
                      via {inv.channel}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-text-secondary">
                      {inv.poNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="font-semibold text-text-primary">
                      {fmtIDR(inv.amount)}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {fmtIDRFull(inv.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[inv.status]}>
                      {inv.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
                    {fmtDate(inv.dueDate)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {inv.paymentDate ? (
                      <span className="text-success font-semibold">
                        {fmtDate(inv.paymentDate)}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {isPaid ? (
                      <Button
                        variant="primary"
                        icon={Receipt}
                        onClick={() => {
                          setSelected(inv);
                          setPanelMode('remittance');
                        }}
                      >
                        Remittance
                      </Button>
                    ) : inv.status === 'Draft' ? (
                      <Button
                        variant="primary"
                        onClick={() =>
                          toast({
                            variant: 'success',
                            title: `${inv.invoiceNumber} submitted for approval`,
                          })
                        }
                      >
                        Submit
                      </Button>
                    ) : inv.status === 'Disputed' ? (
                      <Button
                        variant="primary"
                        onClick={() =>
                          toast({
                            variant: 'warning',
                            title: 'Resolve dispute',
                            description:
                              'Contact Paragon Finance Controller to resolve dispute.',
                          })
                        }
                      >
                        Resolve
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => openDetail(inv)}>
                        View
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
          Full e-invoicing with{' '}
          <strong className="text-info">SAP Ariba integration</strong> is
          planned for Phase 2 of the Paragon Odyssey program.
        </span>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={selected ? `Invoice ${selected.invoiceNumber}` : ''}
        footerActions={
          selected && (
            <>
              <Button variant="secondary" onClick={closePanel}>
                Close
              </Button>
              {panelMode === 'detail' && isPaidStatus(selected.status) && (
                <Button
                  variant="primary"
                  icon={Receipt}
                  onClick={() => setPanelMode('remittance')}
                >
                  View remittance
                </Button>
              )}
              {panelMode === 'remittance' && (
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={() =>
                    toast({
                      title: 'Downloading remittance advice PDF',
                    })
                  }
                >
                  Download PDF
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
                Key facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">PO reference</dt>
                  <dd className="text-text-primary font-mono">
                    {selected.poNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Amount</dt>
                  <dd className="text-text-primary font-semibold">
                    {fmtIDRFull(selected.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Submitted</dt>
                  <dd className="text-text-primary font-medium">
                    {fmtDate(selected.submittedDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Due date</dt>
                  <dd className="text-text-primary font-medium">
                    {fmtDate(selected.dueDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selected.status]}>
                      {selected.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Channel</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.channel}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Buyer contact</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.buyerContact}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Bank account</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.bankAccount}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">SAP FI doc</dt>
                  <dd
                    className={`font-mono text-xs ${
                      selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapFiDoc ?? '— pending —'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment ref</dt>
                  <dd
                    className={`font-mono text-xs ${
                      selected.paymentRef
                        ? 'text-text-primary'
                        : 'text-text-tertiary'
                    }`}
                  >
                    {selected.paymentRef ?? '— pending —'}
                  </dd>
                </div>
              </dl>
            </section>

            {panelMode === 'detail' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  Payment lifecycle
                </h3>
                <Timeline events={buildTimeline(selected)} />
                {selected.status === 'Disputed' && (
                  <div className="mt-3 bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger">
                    This invoice is disputed. Contact Paragon Finance
                    Controller to resolve before payment can be released.
                  </div>
                )}
                {selected.status === 'Overdue' && (
                  <div className="mt-3 bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger">
                    Payment is overdue. Paragon Finance has been escalated.
                  </div>
                )}
              </section>
            )}

            {panelMode === 'remittance' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  Remittance advice
                </h3>
                <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-3 text-sm text-success font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Payment has been processed and credited to your account.
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-text-tertiary">Invoice no</dt>
                    <dd className="text-text-primary font-mono">
                      {selected.invoiceNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">Amount paid</dt>
                    <dd className="text-text-primary font-semibold">
                      {fmtIDRFull(selected.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">Payment date</dt>
                    <dd className="text-text-primary font-medium">
                      {fmtDate(selected.paymentDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">Bank credited</dt>
                    <dd className="text-text-primary font-medium">
                      {selected.bankAccount}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-text-tertiary">Reference</dt>
                    <dd className="text-text-primary font-mono">
                      {selected.paymentRef ?? '—'}
                    </dd>
                  </div>
                </dl>
                {selected.remittanceNote && (
                  <div className="mt-3 text-xs text-text-secondary bg-bg-hover rounded px-3 py-2 border border-border-subtle">
                    <strong className="text-text-primary">Payment note:</strong>{' '}
                    {selected.remittanceNote}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierInvoices;
