import React, { useMemo, useState } from 'react';
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
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import { usePurchaseOrders, useSuppliers } from '../services/query/hooks';
import { formatIDR, formatNumber, formatDate } from '../lib/format';
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

const FOOTER_ACTION_KEY: Record<POStatus, string> = {
  [POStatus.SENT]: 'buyerOrders.footer.sendReminder',
  [POStatus.VIEWED]: 'buyerOrders.footer.sendReminder',
  [POStatus.ACKNOWLEDGED]: 'buyerOrders.footer.requestAsn',
  [POStatus.CONFIRMED]: 'buyerOrders.footer.requestAsn',
  [POStatus.PARTIALLY_DELIVERED]: 'buyerOrders.footer.trackShipment',
  [POStatus.DELIVERED]: 'buyerOrders.footer.viewGr',
  [POStatus.CLOSED]: 'buyerOrders.footer.viewGr',
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
      timestamp:
        r >= 3
          ? t('buyerOrders.timeline.ackAfter', {
              hours: po.acknowledgmentTimeHours,
            })
          : undefined,
      status: r >= 3 ? 'completed' : 'current',
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
    preview: `${po.poNumber} issued to ${po.supplierName}. Total ${formatIDR(po.totalValue)}.`,
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
    preview: `Reminder: requested delivery ${formatDate(po.requestedDeliveryDate)}.`,
  },
];

const lineTotal = (li: PurchaseOrder['lineItems'][number]): number =>
  li.quantity * li.unitPrice;

const BuyerOrders: React.FC = () => {
  const { t } = useTranslation();
  const ORDERS_CRUMB = [
    t('buyerOrders.crumb.transact'),
    t('buyerOrders.crumb.purchaseOrders'),
  ];
  const [group, setGroup] = useState<GroupTab>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [commsOpen, setCommsOpen] = useState(false);

  const ordersQuery = usePurchaseOrders();
  const suppliersQuery = useSuppliers();
  const orders = ordersQuery.data?.items ?? [];

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

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ORDERS_CRUMB}
        title={t('buyerOrders.header.title')}
        subtitle={t('buyerOrders.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              { label: t('buyerOrders.action.export'), icon: FileSpreadsheet },
              { label: t('buyerOrders.action.bulkDownload'), icon: Download },
            ]}
            primary={{ label: t('buyerOrders.action.newPo'), icon: Plus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          orders.length === 1
            ? 'buyerOrders.meta.summary.one'
            : 'buyerOrders.meta.summary.other',
          { count: orders.length, date: formatDate(maxOrderDate) },
        )}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
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
      </div>

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
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4">
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
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('buyerOrders.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('buyerOrders.table.col.po')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.orderDate')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.delivery')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('buyerOrders.table.col.value')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.channel')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('buyerOrders.table.col.actions')}</TableHeaderCell>
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
                    <Data as="div" className="font-semibold text-text-primary">
                      {po.poNumber}
                    </Data>
                    {po.prReference && (
                      <Data as="div" className="text-xs text-text-tertiary mt-0.5">
                        {po.prReference}
                      </Data>
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
                        {t(
                          moreLines === 1
                            ? 'buyerOrders.table.moreLines.one'
                            : 'buyerOrders.table.moreLines.other',
                          { count: moreLines },
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    <Data>{formatDate(po.orderDate)}</Data>
                  </TableCell>
                  <TableCell>
                    <div
                      className={`text-sm whitespace-nowrap ${
                        overdue
                          ? 'text-danger font-semibold'
                          : 'text-text-secondary'
                      }`}
                    >
                      <Data>{formatDate(po.requestedDeliveryDate)}</Data>
                    </div>
                    {overdue && (
                      <div className="text-xs text-danger mt-0.5">
                        {t('buyerOrders.table.overdue', { count: po.daysOverdue })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(po.totalValue)}</Data>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                      <Channel size={14} className="text-text-tertiary" />
                      {po.channel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={statusTone(po.status)}>
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
                  {t('buyerOrders.table.empty')}
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
              <Button variant="secondary">{t('buyerOrders.footer.viewFullDetails')}</Button>
              <Button variant="outline">
                {t(FOOTER_ACTION_KEY[selectedPO.status])}
              </Button>
            </>
          )
        }
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
                        ? 'text-danger'
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
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.material')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.qty')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.unit')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.lineTotal')}
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
                          <Data as="div" className="text-xs text-text-tertiary">
                            {li.materialCode}
                          </Data>
                          <div className="text-text-primary mt-0.5">
                            {li.description}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          <Data>{formatNumber(li.quantity)} {li.uom}</Data>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          <Data>{formatIDR(li.unitPrice)}</Data>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                          <Data>{formatIDR(lineTotal(li))}</Data>
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
                        {t('buyerOrders.lines.total')}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                        <Data>{formatIDR(selectedPO.totalValue)}</Data>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

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
                className="flex items-center gap-2 text-sm font-medium text-teal hover:text-teal-hover"
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
    </AppShellV2>
  );
};

export default BuyerOrders;
