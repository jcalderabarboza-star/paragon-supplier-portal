import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import { useToast } from '../hooks/useToast';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import NextActLine from '../components/ui-v2/NextActLine';
import { statusTone } from '../lib/statusTone';
import { stopName } from '../lib/nameStop';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import ListPage from '../components/ui-v2/ListPage';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import LoadingState from '../components/ui-v2/LoadingState';
import { useDeepLinkedSelection } from '../lib/recordDeepLink';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import { usePurchaseOrders, useSuppliers, useGoodsReceipts } from '../services/query/hooks';
import { receivedOnOrder } from '../services/data/orderReceipt';
import { ReceivedOnOrder } from '../components/v2-features/ReceivedBlock';
import { useNextAct } from '../hooks/useVerbAvailability';
import { formatIDR, formatNumber, formatDate, formatDateTime } from '../lib/format';
// POStatus / ChannelType are runtime enums (used as values) — they stay sourced
// from the enum module; the canonical drift-resolved PurchaseOrder type comes
// from the data layer.
import { ChannelType, POStatus } from '../services/data/types';
import type { PurchaseOrder } from '../services/data/types';

type GroupTab =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'transit'
  | 'delivered'
  | 'closed';

type RangeFilter = '7d' | '30d' | '90d' | 'all';

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

const STATUS_RANK: Record<POStatus, number> = {
  [POStatus.SENT]: 1,
  [POStatus.VIEWED]: 2,
  [POStatus.ACKNOWLEDGED]: 3,
  [POStatus.CONFIRMED]: 4,
  [POStatus.PARTIALLY_DELIVERED]: 5,
  [POStatus.DELIVERED]: 6,
  [POStatus.CLOSED]: 7,
};

const buildTimeline = (po: PurchaseOrder, t: TFunction): TimelineEvent[] => {
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
      title: t('buyerOrders.timeline.created'),
      timestamp: formatDate(po.orderDate),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'sent',
      title: t('buyerOrders.timeline.sent'),
      timestamp: `${formatDate(po.orderDate)} · ${po.channel}`,
      status: 'completed',
      icon: Send,
    },
    {
      id: 'ack',
      title: t('buyerOrders.timeline.acknowledged'),
      // OPS-3 — the authored hours are shown only for an order with NO
      // confirmation act on record. An order confirmed in the portal carries
      // the real time of that act on the next entry; repeating a seeded
      // "96h after send" beside it told the buyer something nobody measured.
      timestamp:
        r >= 3 && !po.confirmedAt && po.acknowledgmentTimeHours > 0
          ? t('buyerOrders.timeline.ackAfter', {
              hours: po.acknowledgmentTimeHours,
            })
          : undefined,
      status: r >= 3 ? 'completed' : 'current',
      icon: CheckCircle2,
    },
    {
      id: 'confirmed',
      title: t('buyerOrders.timeline.confirmed'),
      // The time the supplier's confirmation was recorded. Absent on a seeded
      // order — no act is on record, so no time is shown.
      timestamp: po.confirmedAt ? formatDateTime(po.confirmedAt) : undefined,
      status: r >= 4 ? 'completed' : r === 3 ? 'current' : 'pending',
      icon: CheckCircle2,
    },
    {
      id: 'asn',
      title: t('buyerOrders.timeline.asn'),
      timestamp: r >= 5 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(4),
      icon: Truck,
    },
    {
      id: 'gr',
      title: t('buyerOrders.timeline.goodsReceived'),
      // Canonical dropped `deliveryDate`; goods-receipt aligns with the
      // confirmed (actual) delivery date, so map to confirmedDeliveryDate.
      timestamp: r >= 6 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(5),
      icon: Package,
    },
    {
      id: 'invoice',
      title: t('buyerOrders.timeline.invoiceSubmitted'),
      status: stateFor(6),
      icon: Receipt,
    },
    {
      id: 'payment',
      title: t('buyerOrders.timeline.paymentPosted'),
      status: stateFor(7),
      icon: Wallet,
    },
  ];
};

// i18n-defer: buildComms fabricates sample conversation previews (mock data);
// sender label and message previews are left in EN and not translated (D — mock).
const buildComms = (po: PurchaseOrder) => [
  {
    ts: `${po.orderDate} 09:00`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `${po.poNumber} issued to ${stopName(po.supplierName)}. Total ${stopName(formatIDR(po.totalValue))}.`,
  },
  {
    ts: `${po.orderDate} 10:18`,
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
    preview: `Reminder: requested delivery ${stopName(formatDate(po.requestedDeliveryDate))}.`,
  },
];

const lineTotal = (li: PurchaseOrder['lineItems'][number]): number =>
  li.quantity * li.unitPrice;

const BuyerOrders: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const ORDERS_CRUMB = [
    t('buyerOrders.crumb.purchaseOrders'),
  ];
  const [group, setGroup] = useState<GroupTab>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // WHO ACTS NEXT on the selected PO. Unconditional — the hook takes a nullable
  // state and answers `null` when nothing is selected; a conditional hook would
  // be a render-order bug the first time the drawer closes.
  const nextAct = useNextAct('purchaseOrder', selectedPO?.status);
  const [commsOpen, setCommsOpen] = useState(false);

  const ordersQuery = usePurchaseOrders();
  const suppliersQuery = useSuppliers();
  // E2E-2 — the receipts the order's "Received" block is derived from. Not one
  // of the page's gating reads: the block shows nothing received until it lands.
  const receiptsQuery = useGoodsReceipts();
  const orders = ordersQuery.data?.items ?? [];
  // ── DEEP LINK (?id=) ──────────────────────────────────────────────────────
  // A dashboard window's row links here. The filters are WIDENED first: landing
  // on a filtered list that excludes the very record the reader clicked is the
  // shape of a broken link (`Glossary.tsx`'s rule). An unknown id opens nothing
  // and says nothing — the list is still the right answer.
  useDeepLinkedSelection(
    orders,
    (po, id) => po.id === id || po.poNumber === id,
    useCallback((po: PurchaseOrder) => setSelectedPO(po), []),
  );


  // Country flags are a cosmetic cross-supplier join — best-effort off the
  // suppliers list (empty for a supplier persona; the page still renders).
  const supplierCountryById = useMemo(
    () => new Map((suppliersQuery.data?.items ?? []).map((s) => [s.id, s.country])),
    [suppliersQuery.data],
  );

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

  // Primary gate is the PO read; the suppliers join is cosmetic and not gated.
  if (ordersQuery.isPending) return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (ordersQuery.isError)
    return (
      <ErrorState
        breadcrumb={ORDERS_CRUMB}
        error={ordersQuery.error}
        onRetry={() => ordersQuery.refetch()}
      />
    );
  if (orders.length === 0)
    return (
      <EmptyState
        breadcrumb={ORDERS_CRUMB}
        title={t('buyerOrders.empty.title')}
        subtitle={t('buyerOrders.empty.subtitle')}
        message={t('buyerOrders.empty.message')}
      />
    );

  const closePanel = () => {
    setSelectedPO(null);
    setCommsOpen(false);
  };

  const panelTitle = selectedPO
    ? t('buyerOrders.panel.title', {
        poNumber: selectedPO.poNumber,
        supplier: selectedPO.supplierName,
      })
    : '';

  const columns: Column<PurchaseOrder>[] = [
    {
      id: 'po',
      header: t('buyerOrders.table.col.po'),
      kind: 'id',
      cell: (po) => (
        <>
          <Data as="div">{po.poNumber}</Data>
          {po.prReference && <CellSub>{po.prReference}</CellSub>}
        </>
      ),
    },
    {
      id: 'supplier',
      header: t('buyerOrders.table.col.supplier'),
      kind: 'text',
      cell: (po) => {
        const country = supplierCountryById.get(po.supplierId) ?? '';
        return (
          <>
            {po.supplierName}
            {country && <CellSub>{COUNTRY_FLAG[country] ?? country}</CellSub>}
          </>
        );
      },
    },
    {
      id: 'material',
      header: t('buyerOrders.table.col.material'),
      kind: 'text',
      cell: (po) => {
        const firstLine = po.lineItems[0];
        const moreLines = po.lineItems.length - 1;
        return (
          <>
            <div className="truncate max-w-[18rem]">
              {firstLine?.description ?? '—'}
            </div>
            {moreLines > 0 && (
              <CellSub>
                {t(
                  moreLines === 1
                    ? 'buyerOrders.table.moreLines.one'
                    : 'buyerOrders.table.moreLines.other',
                  { count: moreLines },
                )}
              </CellSub>
            )}
          </>
        );
      },
    },
    {
      id: 'orderDate',
      header: t('buyerOrders.table.col.orderDate'),
      kind: 'date',
      cell: (po) => <Data>{formatDate(po.orderDate)}</Data>,
    },
    {
      id: 'delivery',
      header: t('buyerOrders.table.col.delivery'),
      kind: 'date',
      cell: (po) => {
        const overdue = isOverdue(po);
        return (
          <>
            <span className={overdue ? 'text-critical' : undefined}>
              {formatDate(po.requestedDeliveryDate)}
            </span>
            {overdue && (
              <CellSub tone="critical">
                {t('buyerOrders.table.overdue', { count: po.daysOverdue })}
              </CellSub>
            )}
          </>
        );
      },
    },
    {
      id: 'value',
      header: t('buyerOrders.table.col.value'),
      kind: 'money',
      cell: (po) => <Data>{formatIDR(po.totalValue)}</Data>,
    },
    {
      id: 'channel',
      header: t('buyerOrders.table.col.channel'),
      kind: 'text',
      cell: (po) => {
        const Channel = CHANNEL_ICON[po.channel];
        return (
          <span className="inline-flex items-center gap-1.5">
            <Channel size={14} className="text-text-tertiary" />
            {po.channel}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: t('buyerOrders.table.col.status'),
      kind: 'status',
      cell: (po) => (
        <StatusPill variant={statusTone(po.status)}>{po.status}</StatusPill>
      ),
    },
    {
      id: 'actions',
      header: t('buyerOrders.table.col.actions'),
      kind: 'actions',
      cell: () => (
        <ChevronRight size={16} className="text-text-tertiary inline-block" />
      ),
    },
  ];

  const showConfirmed = selectedPO !== null && STATUS_RANK[selectedPO.status] >= 4;
  const lineColumns: Column<PurchaseOrder['lineItems'][number]>[] = [
    {
      id: 'material',
      header: t('buyerOrders.lines.col.material'),
      // A material code leads the cell, so the column is an `id`; the
      // description is its second line.
      kind: 'id',
      cell: (li) => (
        <>
          {li.materialCode}
          <CellSub>{li.description}</CellSub>
        </>
      ),
    },
    {
      id: 'qty',
      header: t('buyerOrders.lines.col.qty'),
      kind: 'number',
      className: 'whitespace-nowrap',
      cell: (li) => (
        <>
          <Data>{formatNumber(li.quantity)} {li.uom}</Data>
          {/* OPS-3 — what the supplier confirmed, under what was
              ordered. In the same cell: a fifth column pushed
              the line total out of the panel. */}
          {showConfirmed && (
            <CellSub
              tone={li.confirmedQty < li.quantity ? 'warning' : 'neutral'}
              data-testid={`buyer-po-line-confirmed-${li.id}`}
            >
              <div>{t('buyerOrders.lines.col.confirmed')}</div>
              {formatNumber(li.confirmedQty)} {li.uom}
            </CellSub>
          )}
        </>
      ),
    },
    {
      id: 'unit',
      header: t('buyerOrders.lines.col.unit'),
      kind: 'money',
      cell: (li) => <Data>{formatIDR(li.unitPrice)}</Data>,
    },
    {
      id: 'lineTotal',
      header: t('buyerOrders.lines.col.lineTotal'),
      kind: 'money',
      cell: (li) => <Data>{formatIDR(lineTotal(li))}</Data>,
    },
  ];

  return (
    <ListPage
      breadcrumb={ORDERS_CRUMB}
        title={t('buyerOrders.header.title')}
        subtitle={t('buyerOrders.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('buyerOrders.action.export'),
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('buyerOrders.toast.exportUnavailable.title'),
                    description: t('buyerOrders.toast.exportUnavailable.desc'),
                  }),
              },
              {
                label: t('buyerOrders.action.bulkDownload'),
                icon: Download,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('buyerOrders.toast.bulkDownloadUnavailable.title'),
                    description: t('buyerOrders.toast.bulkDownloadUnavailable.desc'),
                  }),
              },
            ]}
            primary={{
              label: t('buyerOrders.action.newPo'),
              icon: Plus,
              onClick: () =>
                toast({
                  variant: 'info',
                  title: t('buyerOrders.toast.newPoUnavailable.title'),
                  description: t('buyerOrders.toast.newPoUnavailable.desc'),
                }),
            }}
          />
        }
      meta={
        <>
          {t(
            orders.length === 1
              ? 'buyerOrders.meta.summary.one'
              : 'buyerOrders.meta.summary.other',
            { count: orders.length, date: formatDate(maxOrderDate) },
          )}
          {/* D-CENSUS-8 — PARTLY REAL, so both axes render. The PO feed is fixture,
              but `purchaseOrder` is a wired CommandTarget: a supplier confirm/reject
              genuinely mutates what this page lists and writes the DR-10 trail. A
              flat "Sample" here would understate a real signal. */}
          <ProvenanceMarker capability="purchaseOrders" className="ml-3 align-middle" />
        </>
      }
      kpis={
        <>
        <KpiCard
          eyebrow={t('buyerOrders.kpi.open.eyebrow')}
          value={kpis.open.toString()}
          subtitle={t('buyerOrders.kpi.open.subtitle')}
          icon={ShoppingCart}
        />
        <KpiCard
          eyebrow={t('buyerOrders.kpi.pending.eyebrow')}
          value={kpis.pendingConfirmation.toString()}
          subtitle={t('buyerOrders.kpi.pending.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('buyerOrders.kpi.transit.eyebrow')}
          value={kpis.inTransit.toString()}
          subtitle={t('buyerOrders.kpi.transit.subtitle')}
          icon={Truck}
        />
        <KpiCard
          eyebrow={t('buyerOrders.kpi.overdue.eyebrow')}
          value={kpis.overdue.toString()}
          subtitle={
            kpis.overdue > 0
              ? t('buyerOrders.kpi.overdue.subtitle.past')
              : t('buyerOrders.kpi.overdue.subtitle.onSchedule')
          }
          icon={AlertTriangle}
        />
        </>
      }
      tabs={
      <SubTabs
        options={[
          { id: 'all', label: t('buyerOrders.tab.all'), count: counts.all },
          { id: 'pending', label: t('buyerOrders.tab.pending'), count: counts.pending },
          { id: 'confirmed', label: t('buyerOrders.tab.confirmed'), count: counts.confirmed },
          { id: 'transit', label: t('buyerOrders.tab.transit'), count: counts.transit },
          { id: 'delivered', label: t('buyerOrders.tab.delivered'), count: counts.delivered },
          { id: 'closed', label: t('buyerOrders.tab.closed'), count: counts.closed },
        ]}
        value={group}
        onChange={setGroup}
      />
      }
      filters={
        <FilterChipsBar
          options={[
            { id: '7d', label: t('buyerOrders.range.7d') },
            { id: '30d', label: t('buyerOrders.range.30d') },
            { id: '90d', label: t('buyerOrders.range.90d') },
            { id: 'all', label: t('buyerOrders.range.all') },
          ]}
          value={range}
          onChange={setRange}
        />
      }
      search={
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('buyerOrders.search.placeholder')}
        />
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(po) => po.id}
        onRowClick={(po) => setSelectedPO(po)}
        empty={t('buyerOrders.table.empty')}
      />

      {/* ⚠️ THE PANEL HAS NO FOOTER, AND BOTH CONTROLS THAT WERE THERE ARE GONE
          RATHER THAN WIRED — H3, each for its own reason. `View full details`
          pointed at a PO detail page that does not exist in `AppRouter`: THIS
          PANEL IS the detail view, so the control was a duplicate of the surface
          it sat on. The button beside it was a per-status label lookup
          (`FOOTER_ACTION_KEY`) with no handler at ANY status — the same shape as
          `BuyerSourcing`'s `FOOTER_LABEL` button, which was deleted rather than
          wired, and that precedent is followed here rather than re-argued.
          Wiring either would have meant a new page or a new verb, and the H3
          ruling forbids building either to make a control true. */}
      <SidePanel
        open={selectedPO !== null}
        onClose={closePanel}
        title={panelTitle}
      >
        {selectedPO && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerOrders.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.orderDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedPO.orderDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.deliveryDate')}</dt>
                  <Data
                    as="dd"
                    className={`font-medium ${
                      isOverdue(selectedPO)
                        ? 'text-critical'
                        : 'text-text-primary'
                    }`}
                  >
                    {formatDate(selectedPO.requestedDeliveryDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.totalValue')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selectedPO.totalValue)}
                  </Data>
                </div>
                {/* OPS-3 — what the supplier confirmed: the date, the time of
                    the act when one is on record, and the note. The same
                    stored values the supplier's own panel reads. */}
                {STATUS_RANK[selectedPO.status] >= 4 && (
                  <div data-testid="buyer-po-confirmed-delivery">
                    <dt className="text-text-tertiary">
                      {t('buyerOrders.panel.field.confirmedDelivery')}
                    </dt>
                    <Data as="dd" className="text-text-primary font-medium">
                      {formatDate(selectedPO.confirmedDeliveryDate)}
                    </Data>
                  </div>
                )}
                {STATUS_RANK[selectedPO.status] >= 4 && selectedPO.confirmedAt && (
                  <div data-testid="buyer-po-confirmed-at">
                    <dt className="text-text-tertiary">
                      {t('buyerOrders.panel.field.confirmedOn')}
                    </dt>
                    <Data as="dd" className="text-text-primary font-medium">
                      {formatDateTime(selectedPO.confirmedAt)}
                    </Data>
                  </div>
                )}
                {STATUS_RANK[selectedPO.status] >= 4 && selectedPO.confirmationNote && (
                  <div className="col-span-2" data-testid="buyer-po-confirmation-note">
                    <dt className="text-text-tertiary">
                      {t('buyerOrders.panel.field.supplierNote')}
                    </dt>
                    <dd className="text-text-primary">{selectedPO.confirmationNote}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPO.channel}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.status')}</dt>
                  <dd>
                    <StatusPill variant={statusTone(selectedPO.status)}>
                      {selectedPO.status}
                    </StatusPill>
                    {/* The buyer's half of the same silence. `Confirmed`,
                        `Partially Delivered` and `Delivered` are all stranded
                        on this machine — every exit is an S/4HANA goods
                        movement — so the buyer watching a PO had a status word
                        and no indication that the wait is SAP's, not the
                        supplier's. Derived from the canonical state. */}
                    <span className="mt-1 block">
                      <NextActLine act={nextAct} testId="next-act-buyer-po" />
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.currency')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPO.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.incoterms')}</dt>
                  {/* i18n-defer: hardcoded sample terms — Incoterms/payment-term codes kept verbatim (glossary: loanwords/codes) */}
                  <dd className="text-text-primary font-medium">CIF Jakarta</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.paymentTerms')}</dt>
                  <dd className="text-text-primary font-medium">Net 30</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerOrders.panel.lineItems')}
              </h3>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <DataTable
                  density="compact"
                  card={false}
                  columns={lineColumns}
                  rows={selectedPO.lineItems}
                  rowKey={(li) => li.id}
                  footer={
                    <tr className="border-t border-border-subtle bg-bg-hover">
                      <td
                        className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider"
                        colSpan={3}
                      >
                        {t('buyerOrders.lines.total')}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                        <Data>{formatIDR(selectedPO.totalValue)}</Data>
                      </td>
                    </tr>
                  }
                />
              </div>
            </section>

            {/* E2E-2 — what was received, derived from the posted receipts, with
                the sentence that the order's own status is SAP's. */}
            <ReceivedOnOrder
              received={receivedOnOrder(selectedPO, receiptsQuery.data?.items ?? [])}
              testId="buyer-order-received"
            />

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerOrders.panel.lifecycle')}
              </h3>
              <Timeline events={buildTimeline(selectedPO, t)} />
            </section>

            <section>
              <button
                type="button"
                onClick={() => setCommsOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-teal-text hover:text-teal-hover"
              >
                {commsOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {commsOpen
                  ? t('buyerOrders.comms.hide')
                  : t('buyerOrders.comms.show')}{' '}
                {t(
                  buildComms(selectedPO).length === 1
                    ? 'buyerOrders.comms.history.one'
                    : 'buyerOrders.comms.history.other',
                  { count: buildComms(selectedPO).length },
                )}
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
    </ListPage>
  );
};

export default BuyerOrders;
