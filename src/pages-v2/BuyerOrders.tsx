import React, { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Clock,
  Truck,
  AlertTriangle,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Globe,
  Send,
  FileText,
  CheckCircle2,
  Package,
  Receipt,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import { mockSuppliers } from '../data/mockSuppliers';
import {
  ChannelType,
  POStatus,
  PurchaseOrder,
} from '../types/purchaseOrder.types';

type GroupTab =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'transit'
  | 'delivered'
  | 'closed';

type RangeFilter = '7d' | '30d' | '90d' | 'all';

const STATUS_VARIANT: Record<
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

const CHANNEL_ICON: Record<ChannelType, LucideIcon> = {
  [ChannelType.WHATSAPP]: MessageCircle,
  [ChannelType.EMAIL]: Mail,
  [ChannelType.WEB]: Globe,
  [ChannelType.API]: Send,
};

const PENDING_STATUSES: POStatus[] = [POStatus.SENT, POStatus.VIEWED];
const CONFIRMED_STATUSES: POStatus[] = [
  POStatus.ACKNOWLEDGED,
  POStatus.CONFIRMED,
];
const TRANSIT_STATUSES: POStatus[] = [POStatus.PARTIALLY_DELIVERED];
const DELIVERED_STATUSES: POStatus[] = [POStatus.DELIVERED];
const CLOSED_STATUSES: POStatus[] = [POStatus.CLOSED];

const matchesGroup = (status: POStatus, group: GroupTab): boolean => {
  if (group === 'all') return true;
  if (group === 'pending') return PENDING_STATUSES.includes(status);
  if (group === 'confirmed') return CONFIRMED_STATUSES.includes(status);
  if (group === 'transit') return TRANSIT_STATUSES.includes(status);
  if (group === 'delivered') return DELIVERED_STATUSES.includes(status);
  if (group === 'closed') return CLOSED_STATUSES.includes(status);
  return true;
};

const isOpen = (status: POStatus): boolean =>
  status !== POStatus.DELIVERED && status !== POStatus.CLOSED;

const isOverdue = (po: PurchaseOrder): boolean =>
  po.daysOverdue > 0 && isOpen(po.status);

const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('id-ID').format(value);

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};

const DAY_MS = 24 * 60 * 60 * 1000;

const supplierCountryById = new Map(
  mockSuppliers.map((s) => [s.id, s.country]),
);

const FOOTER_ACTION_LABEL: Record<POStatus, string> = {
  [POStatus.SENT]: 'Send reminder',
  [POStatus.VIEWED]: 'Send reminder',
  [POStatus.ACKNOWLEDGED]: 'Request ASN',
  [POStatus.CONFIRMED]: 'Request ASN',
  [POStatus.PARTIALLY_DELIVERED]: 'Track shipment',
  [POStatus.DELIVERED]: 'View GR',
  [POStatus.CLOSED]: 'View GR',
};

const STATUS_RANK: Record<POStatus, number> = {
  [POStatus.SENT]: 1,
  [POStatus.VIEWED]: 2,
  [POStatus.ACKNOWLEDGED]: 3,
  [POStatus.CONFIRMED]: 4,
  [POStatus.PARTIALLY_DELIVERED]: 5,
  [POStatus.DELIVERED]: 6,
  [POStatus.CLOSED]: 7,
};

const buildTimeline = (po: PurchaseOrder): TimelineEvent[] => {
  const r = STATUS_RANK[po.status];
  const stateFor = (
    requiredRank: number,
  ): 'completed' | 'current' | 'pending' => {
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'current';
    return 'pending';
  };

  return [
    {
      id: 'created',
      title: 'PO Created',
      timestamp: formatDate(po.createdDate),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'sent',
      title: 'Sent to Supplier',
      timestamp: `${formatDate(po.createdDate)} · ${po.channel}`,
      status: 'completed',
      icon: Send,
    },
    {
      id: 'ack',
      title: 'Acknowledged by Supplier',
      timestamp:
        r >= 3 ? `${po.acknowledgmentTimeHours}h after send` : undefined,
      status: r >= 3 ? 'completed' : 'current',
      icon: CheckCircle2,
    },
    {
      id: 'asn',
      title: 'ASN Received',
      timestamp: r >= 5 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(4),
      icon: Truck,
    },
    {
      id: 'gr',
      title: 'Goods Received',
      timestamp: r >= 6 ? formatDate(po.deliveryDate) : undefined,
      status: stateFor(5),
      icon: Package,
    },
    {
      id: 'invoice',
      title: 'Invoice Submitted',
      status: stateFor(6),
      icon: Receipt,
    },
    {
      id: 'payment',
      title: 'Payment Posted',
      status: stateFor(7),
      icon: Wallet,
    },
  ];
};

const buildComms = (po: PurchaseOrder) => [
  {
    ts: `${po.createdDate} 09:00`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `${po.poNumber} issued to ${po.supplierName}. Total ${formatIDR(po.totalAmount)}.`,
  },
  {
    ts: `${po.createdDate} 10:18`,
    sender: po.supplierName,
    channel: po.channel,
    preview:
      po.acknowledgmentTimeHours > 0
        ? 'Received, will confirm shortly.'
        : 'Auto-receipt logged via API.',
  },
  {
    ts: `${po.requestedDeliveryDate} 14:32`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `Reminder: requested delivery ${formatDate(po.requestedDeliveryDate)}.`,
  },
];

const lineTotal = (li: PurchaseOrder['lineItems'][number]): number =>
  li.quantity * li.unitPrice;

const BuyerOrders: React.FC = () => {
  const [group, setGroup] = useState<GroupTab>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [commsOpen, setCommsOpen] = useState(false);

  const orders = mockPurchaseOrders;

  const maxOrderDate = useMemo(() => {
    return orders.reduce(
      (acc, po) => (po.orderDate > acc ? po.orderDate : acc),
      orders[0]?.orderDate ?? '',
    );
  }, [orders]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((p) => PENDING_STATUSES.includes(p.status)).length,
      confirmed: orders.filter((p) => CONFIRMED_STATUSES.includes(p.status))
        .length,
      transit: orders.filter((p) => TRANSIT_STATUSES.includes(p.status)).length,
      delivered: orders.filter((p) => DELIVERED_STATUSES.includes(p.status))
        .length,
      closed: orders.filter((p) => CLOSED_STATUSES.includes(p.status)).length,
    };
  }, [orders]);

  const kpis = useMemo(() => {
    const open = orders.filter((p) => isOpen(p.status));
    const pendingConfirmation = orders.filter((p) =>
      PENDING_STATUSES.includes(p.status),
    );
    const inTransit = orders.filter(
      (p) =>
        p.status === POStatus.CONFIRMED ||
        p.status === POStatus.PARTIALLY_DELIVERED,
    );
    const overdue = orders.filter(isOverdue);
    return {
      open: open.length,
      pendingConfirmation: pendingConfirmation.length,
      inTransit: inTransit.length,
      overdue: overdue.length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const refDate = new Date(maxOrderDate || new Date().toISOString());
    const rangeDays =
      range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
    const cutoff = rangeDays
      ? new Date(refDate.getTime() - rangeDays * DAY_MS)
      : null;

    return orders.filter((po) => {
      if (!matchesGroup(po.status, group)) return false;
      if (cutoff && new Date(po.orderDate) < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        const matMatch = po.lineItems.some(
          (li) =>
            li.materialCode.toLowerCase().includes(q) ||
            li.description.toLowerCase().includes(q),
        );
        const hay = `${po.poNumber} ${po.supplierName}`.toLowerCase();
        if (!hay.includes(q) && !matMatch) return false;
      }
      return true;
    });
  }, [orders, group, range, search, maxOrderDate]);

  const closePanel = () => {
    setSelectedPO(null);
    setCommsOpen(false);
  };

  const panelTitle = selectedPO
    ? `PO ${selectedPO.poNumber} — ${selectedPO.supplierName}`
    : '';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['TRANSACT', 'PURCHASE ORDERS']}
        title="Purchase Orders"
        subtitle="Active and historical purchase orders across your supplier network."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet },
              { label: 'Bulk download', icon: Download },
            ]}
            primary={{ label: 'New PO', icon: Plus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {orders.length} records · last updated {formatDate(maxOrderDate)}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Total Open POs"
          value={kpis.open.toString()}
          subtitle="Across all suppliers"
          icon={ShoppingCart}
        />
        <KpiCard
          eyebrow="Pending Confirmation"
          value={kpis.pendingConfirmation.toString()}
          subtitle="Awaiting supplier ack"
          icon={Clock}
        />
        <KpiCard
          eyebrow="In Transit"
          value={kpis.inTransit.toString()}
          subtitle="Confirmed + shipping"
          icon={Truck}
        />
        <KpiCard
          eyebrow="Overdue"
          value={kpis.overdue.toString()}
          subtitle={kpis.overdue > 0 ? 'Past requested delivery' : 'On schedule'}
          icon={AlertTriangle}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'pending', label: 'Pending', count: counts.pending },
          { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { id: 'transit', label: 'In Transit', count: counts.transit },
          { id: 'delivered', label: 'Delivered', count: counts.delivered },
          { id: 'closed', label: 'Closed', count: counts.closed },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <FilterChipsBar
          options={[
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
            { id: '90d', label: 'Last 90 days' },
            { id: 'all', label: 'All time' },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by PO number, supplier, or material…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>PO #</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Material / Category</TableHeaderCell>
            <TableHeaderCell>Order date</TableHeaderCell>
            <TableHeaderCell>Delivery</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
            <TableHeaderCell>Channel</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((po) => {
              const Channel = CHANNEL_ICON[po.channel];
              const overdue = isOverdue(po);
              const country = supplierCountryById.get(po.supplierId) ?? '';
              const firstLine = po.lineItems[0];
              const moreLines = po.lineItems.length - 1;
              return (
                <TableRow
                  key={po.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedPO(po)}
                >
                  <TableCell>
                    <div className="font-semibold text-text-primary">
                      {po.poNumber}
                    </div>
                    {po.prReference && (
                      <div className="font-mono text-xs text-text-tertiary mt-0.5">
                        {po.prReference}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {po.supplierName}
                    </div>
                    {country && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {COUNTRY_FLAG[country] ?? country}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary truncate max-w-[18rem]">
                      {firstLine?.description ?? '—'}
                    </div>
                    {moreLines > 0 && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        +{moreLines} more line{moreLines > 1 ? 's' : ''}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(po.orderDate)}
                  </TableCell>
                  <TableCell>
                    <div
                      className={`text-sm whitespace-nowrap ${
                        overdue
                          ? 'text-danger font-semibold'
                          : 'text-text-secondary'
                      }`}
                    >
                      {formatDate(po.requestedDeliveryDate)}
                    </div>
                    {overdue && (
                      <div className="text-xs text-danger mt-0.5">
                        +{po.daysOverdue}d overdue
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {formatIDR(po.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                      <Channel size={14} className="text-text-tertiary" />
                      {po.channel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[po.status]}>
                      {po.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  No purchase orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selectedPO !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selectedPO && (
            <>
              <Button variant="secondary">View Full Details</Button>
              <Button variant="primary">
                {FOOTER_ACTION_LABEL[selectedPO.status]}
              </Button>
            </>
          )
        }
      >
        {selectedPO && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Key facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Order date</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedPO.orderDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Delivery date</dt>
                  <dd
                    className={`font-medium ${
                      isOverdue(selectedPO)
                        ? 'text-danger'
                        : 'text-text-primary'
                    }`}
                  >
                    {formatDate(selectedPO.requestedDeliveryDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Total value</dt>
                  <dd className="text-text-primary font-semibold">
                    {formatIDR(selectedPO.totalAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Channel</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPO.channel}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedPO.status]}>
                      {selectedPO.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Currency</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPO.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Incoterms</dt>
                  <dd className="text-text-primary font-medium">CIF Jakarta</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment terms</dt>
                  <dd className="text-text-primary font-medium">Net 30</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Line items
              </h3>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        Material
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Unit
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.lineItems.map((li) => (
                      <tr
                        key={li.id}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-3 py-2">
                          <div className="font-mono text-xs text-text-tertiary">
                            {li.materialCode}
                          </div>
                          <div className="text-text-primary mt-0.5">
                            {li.description}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          {formatNumber(li.quantity)} {li.uom}
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          {formatIDR(li.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                          {formatIDR(lineTotal(li))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border-subtle bg-bg-hover">
                      <td
                        className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider"
                        colSpan={3}
                      >
                        Total
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                        {formatIDR(selectedPO.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Lifecycle
              </h3>
              <Timeline events={buildTimeline(selectedPO)} />
            </section>

            <section>
              <button
                type="button"
                onClick={() => setCommsOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-teal hover:text-teal-hover"
              >
                {commsOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {commsOpen ? 'Hide' : 'Show'} communication history (
                {buildComms(selectedPO).length} messages)
              </button>
              {commsOpen && (
                <ul className="mt-3 space-y-3">
                  {buildComms(selectedPO).map((m, i) => {
                    const Icon = CHANNEL_ICON[m.channel];
                    return (
                      <li
                        key={i}
                        className="flex gap-3 p-3 border border-border-subtle rounded-md"
                      >
                        <Icon
                          size={14}
                          className="text-text-tertiary shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-text-tertiary">
                            <span className="font-medium text-text-secondary">
                              {m.sender}
                            </span>
                            <span>·</span>
                            <span>{m.ts}</span>
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5">
                            {m.preview}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerOrders;
