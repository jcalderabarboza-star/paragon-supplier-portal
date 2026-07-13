import React, { useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Wallet,
  Truck,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { usePurchaseOrderConfirm } from '../services/query/commandHooks';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useCurrentSupplier, usePurchaseOrders } from '../services/query/hooks';
import type { PurchaseOrder } from '../services/data/types';

type TabKey = 'all' | 'action' | 'progress' | 'completed';
type PanelMode = 'detail' | 'editing' | 'confirmed' | 'change-request';

const ACTION_STATUSES: POStatus[] = [POStatus.SENT, POStatus.ACKNOWLEDGED];
const PROGRESS_STATUSES: POStatus[] = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
];
const COMPLETED_STATUSES: POStatus[] = [POStatus.DELIVERED, POStatus.CLOSED];

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

const filterByTab = (tab: TabKey, pos: PurchaseOrder[]): PurchaseOrder[] => {
  if (tab === 'action') return pos.filter((p) => ACTION_STATUSES.includes(p.status));
  if (tab === 'progress')
    return pos.filter((p) => PROGRESS_STATUSES.includes(p.status));
  if (tab === 'completed')
    return pos.filter((p) => COMPLETED_STATUSES.includes(p.status));
  return pos;
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

const SupplierOrders: React.FC = () => {
  const { t } = useTranslation();
  const ORDERS_CRUMB = [
    t('supplierOrders.crumb.transact'),
    t('supplierOrders.crumb.myOrders'),
  ];
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const confirmMutation = usePurchaseOrderConfirm();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  const [confirmedQtys, setConfirmedQtys] = useState<number[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [changeText, setChangeText] = useState('');
  const [confirmedAt, setConfirmedAt] = useState<string>('');

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();

  const mySupplier = supplierQuery.data ?? null;

  const MY_POS = useMemo(
    () =>
      [...(posQuery.data?.items ?? [])].sort((a, b) =>
        b.orderDate.localeCompare(a.orderDate),
      ),
    [posQuery.data],
  );

  const counts = useMemo(
    () => ({
      all: MY_POS.length,
      action: MY_POS.filter((p) => ACTION_STATUSES.includes(p.status)).length,
      progress: MY_POS.filter((p) => PROGRESS_STATUSES.includes(p.status)).length,
      completed: MY_POS.filter((p) => COMPLETED_STATUSES.includes(p.status))
        .length,
    }),
    [MY_POS],
  );

  const totalValuePending = useMemo(
    () =>
      MY_POS.filter((p) => !COMPLETED_STATUSES.includes(p.status)).reduce(
        (s, p) => s + p.totalValue,
        0,
      ),
    [MY_POS],
  );

  const displayPOs = useMemo(
    () => filterByTab(activeTab, MY_POS),
    [activeTab, MY_POS],
  );

  const maxOrderDate = useMemo(
    () => MY_POS.reduce((a, p) => (p.orderDate > a ? p.orderDate : a), MY_POS[0]?.orderDate ?? ''),
    [MY_POS],
  );

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (supplierQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={ORDERS_CRUMB}
        error={supplierQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier) return <NoSupplierIdentity />;
  if (MY_POS.length === 0)
    return (
      <EmptyState
        breadcrumb={ORDERS_CRUMB}
        title={t('supplierOrders.empty.title')}
        subtitle={t('supplierOrders.empty.subtitle', { supplier: mySupplier.name })}
        message={t('supplierOrders.empty.message')}
      />
    );

  // Riding fix: the drawer reads a LIVE PO from the invalidated query (not the
  // frozen open-time snapshot), so Key Facts reflects a post-command status —
  // same class as the KPI staleness. Falls back to the snapshot if the row left
  // the current view.
  const selectedLive =
    selected ? MY_POS.find((p) => p.id === selected.id) ?? selected : null;

  const openOrderPanel = (po: PurchaseOrder, mode: PanelMode = 'detail') => {
    setSelected(po);
    setConfirmedQtys(po.lineItems.map((li) => li.quantity));
    setDeliveryDate(po.requestedDeliveryDate);
    setNotes('');
    setChangeText('');
    setConfirmedAt('');
    setPanelMode(mode);
  };

  const closePanel = () => {
    setSelected(null);
    setPanelMode('detail');
  };

  const startEditing = () => setPanelMode('editing');

  // Step 3.10 proof: confirm dispatches t_po_confirm through the service seam
  // (user trigger + confirmedQuantities payload + scope + status + event +
  // invalidation). The store mutation drives the table re-derive on success.
  const confirmOrder = () => {
    if (!selected) return;
    const po = selected;
    confirmMutation.mutate(
      { poId: po.id, confirmedQuantities: confirmedQtys },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('po.confirm.failed.title', { poNumber: po.poNumber }),
              description: t('po.confirm.failed.desc', { reason: result.reason ?? '' }),
            });
            return;
          }
          const time = new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setConfirmedAt(time);
          setPanelMode('confirmed');
          toast({
            variant: 'success',
            title: t('po.confirm.success.title', { poNumber: po.poNumber }),
            description: t('po.confirm.success.desc', { correlationId: result.correlationId }),
          });
        },
        onError: () => {
          toast({
            variant: 'error',
            title: t('po.confirm.denied.title'),
            description: t('po.confirm.denied.desc'),
          });
        },
      },
    );
  };

  const submitChangeRequest = () => {
    if (!selected) return;
    toast({
      variant: 'info',
      title: t('supplierOrders.toast.changeSubmitted.title', {
        poNumber: selected.poNumber,
      }),
      description: t('supplierOrders.toast.changeSubmitted.desc'),
    });
    closePanel();
  };

  const goToASN = () => {
    if (!selected) return;
    toast({
      title: t('supplierOrders.toast.asnCreation.title', {
        poNumber: selected.poNumber,
      }),
      description: t('supplierOrders.toast.asnContinue'),
    });
    closePanel();
  };

  const handleRowAction = (po: PurchaseOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ACTION_STATUSES.includes(po.status)) {
      openOrderPanel(po, 'editing');
    } else if (po.status === POStatus.CONFIRMED) {
      toast({
        title: t('supplierOrders.toast.creatingAsn.title', {
          poNumber: po.poNumber,
        }),
        description: t('supplierOrders.toast.asnContinue'),
      });
    } else {
      openOrderPanel(po, 'detail');
    }
  };

  const totalConfirmedQty = confirmedQtys.reduce((a, b) => a + b, 0);
  const orderedTotalQty = selected
    ? selected.lineItems.reduce((a, li) => a + li.quantity, 0)
    : 0;
  const hasQtyChange = totalConfirmedQty !== orderedTotalQty;
  const hasDateChange =
    selected !== null && deliveryDate !== selected.requestedDeliveryDate;

  const panelTitle = selected ? t('supplierOrders.panel.title', { poNumber: selected.poNumber }) : '';
  const panelActionLabel = (po: PurchaseOrder): string => {
    if (ACTION_STATUSES.includes(po.status)) return t('supplierOrders.action.confirm');
    if (po.status === POStatus.CONFIRMED) return t('supplierOrders.action.createAsn');
    return t('supplierOrders.action.view');
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ORDERS_CRUMB}
        title={t('supplierOrders.header.title')}
        subtitle={t('supplierOrders.header.subtitle', { supplier: mySupplier.name })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {MY_POS.length === 1
          ? t('supplierOrders.meta.orders.one', { count: MY_POS.length })
          : t('supplierOrders.meta.orders.other', { count: MY_POS.length })}{' '}
        · {t('supplierOrders.meta.lastUpdated')}{' '}
        <Data>{fmtDate(maxOrderDate)}</Data>
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierOrders.kpi.openOrders.eyebrow')}
          value={counts.action.toString()}
          subtitle={
            counts.action > 0 ? (
              <span className="text-warning-hover">
                {t('supplierOrders.kpi.openOrders.needsAction')}
              </span>
            ) : (
              t('supplierOrders.kpi.openOrders.cleared')
            )
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('supplierOrders.kpi.inProgress.eyebrow')}
          value={counts.progress.toString()}
          subtitle={t('supplierOrders.kpi.inProgress.subtitle')}
          icon={Truck}
        />
        <KpiCard
          eyebrow={t('supplierOrders.kpi.totalValue.eyebrow')}
          value={fmtIDR(totalValuePending)}
          subtitle={t('supplierOrders.kpi.totalValue.subtitle')}
          icon={Wallet}
        />
        <KpiCard
          eyebrow={t('supplierOrders.kpi.delivered.eyebrow')}
          value={counts.completed.toString()}
          subtitle={
            <span className="text-success">
              {t('supplierOrders.kpi.delivered.subtitle')}
            </span>
          }
          icon={CheckCircle2}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'all', label: t('supplierOrders.tab.all'), count: counts.all },
          { id: 'action', label: t('supplierOrders.tab.action'), count: counts.action },
          { id: 'progress', label: t('supplierOrders.tab.progress'), count: counts.progress },
          { id: 'completed', label: t('supplierOrders.tab.completed'), count: counts.completed },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {counts.action > 0 && activeTab !== 'completed' && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-2 text-sm text-warning-hover">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {counts.action === 1
                ? t('supplierOrders.banner.needConfirmation.one', {
                    count: counts.action,
                  })
                : t('supplierOrders.banner.needConfirmation.other', {
                    count: counts.action,
                  })}{' '}
            </strong>
            {t('supplierOrders.banner.instruction')}
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierOrders.col.po')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierOrders.col.orderDate')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierOrders.col.requestedDelivery')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierOrders.col.items')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierOrders.col.value')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierOrders.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierOrders.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {displayPOs.map((po) => (
              <TableRow
                key={po.id}
                className="cursor-pointer"
                onClick={() => openOrderPanel(po, 'detail')}
              >
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">
                    {po.poNumber}
                  </Data>
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  <Data>{fmtDate(po.orderDate)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
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
                    variant={
                      ACTION_STATUSES.includes(po.status)
                        ? 'outline'
                        : 'secondary'
                    }
                    onClick={(e) => handleRowAction(po, e)}
                  >
                    {panelActionLabel(po)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {displayPOs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('supplierOrders.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selected && (
            <>
              {panelMode === 'detail' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    {t('supplierOrders.action.close')}
                  </Button>
                  {ACTION_STATUSES.includes((selectedLive ?? selected).status) ? (
                    <Button variant="outline" onClick={startEditing}>
                      {t('po.confirm.action')}
                    </Button>
                  ) : (selectedLive ?? selected).status === POStatus.CONFIRMED ? (
                    <Button variant="outline" onClick={goToASN}>
                      {t('supplierOrders.action.createAsn')}
                    </Button>
                  ) : null}
                </>
              )}
              {panelMode === 'editing' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('change-request')}
                  >
                    {t('supplierOrders.action.requestChange')}
                  </Button>
                  <Button
                    variant="outline"
                    icon={CheckCircle2}
                    onClick={confirmOrder}
                    disabled={confirmMutation.isPending}
                  >
                    {confirmMutation.isPending
                      ? t('po.confirm.submitting')
                      : t('po.confirm.action')}
                  </Button>
                </>
              )}
              {panelMode === 'change-request' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('editing')}
                  >
                    {t('supplierOrders.action.backToConfirm')}
                  </Button>
                  <Button variant="outline" onClick={submitChangeRequest}>
                    {t('supplierOrders.action.submitChange')}
                  </Button>
                </>
              )}
              {panelMode === 'confirmed' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    {t('supplierOrders.action.close')}
                  </Button>
                  <Button variant="outline" icon={Truck} onClick={goToASN}>
                    {t('supplierOrders.action.createAsnNow')}
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('supplierOrders.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.col.orderDate')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.orderDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.col.requestedDelivery')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.requestedDeliveryDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.panel.lineItems')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.lineItems.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.panel.totalValue')}</dt>
                  <dd className="text-text-primary font-semibold">
                    <Data>{fmtIDR(selected.totalValue)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.col.status')}</dt>
                  <dd>
                    <StatusPill variant={statusTone((selectedLive ?? selected).status)}>
                      {(selectedLive ?? selected).status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.panel.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {/* i18n-defer: mock/sample data (fixture-derived channel value) */}
                    {selected.channel}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {panelMode === 'editing'
                  ? t('supplierOrders.panel.lineItemsConfirm')
                  : t('supplierOrders.panel.lineItems')}
              </h3>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        {t('supplierOrders.panel.col.material')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('supplierOrders.panel.col.ordered')}
                      </th>
                      {panelMode === 'editing' && (
                        <th className="text-right px-3 py-2 font-semibold">
                          {t('supplierOrders.panel.col.confirmed')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.map((li, idx) => (
                      <tr
                        key={li.id}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-3 py-2">
                          <Data as="div" className="text-xs text-text-tertiary">
                            {li.materialCode}
                          </Data>
                          <div className="text-text-primary mt-0.5">
                            {/* i18n-defer: mock/sample data (fixture line-item description) */}
                            {li.description}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          <Data>{li.quantity.toLocaleString()} {li.uom}</Data>
                        </td>
                        {panelMode === 'editing' && (
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={li.quantity}
                              value={confirmedQtys[idx] ?? li.quantity}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setConfirmedQtys((prev) => {
                                  const next = [...prev];
                                  next[idx] = v;
                                  return next;
                                });
                              }}
                              className={`${inputClass} text-right`}
                              style={{ width: 100, display: 'inline-block' }}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {panelMode === 'editing' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierOrders.panel.deliveryNotes')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>
                      {t('supplierOrders.panel.confirmedDeliveryDate')}
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('supplierOrders.panel.notesLabel')}</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('supplierOrders.panel.notesPlaceholder')}
                      className={inputClass}
                    />
                  </div>
                </div>
                {(hasQtyChange || hasDateChange) && (
                  <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
                    {t('supplierOrders.panel.diffWarning')}
                  </div>
                )}
              </section>
            )}

            {panelMode === 'change-request' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierOrders.panel.changeRequest')}
                </h3>
                <p className="text-xs text-text-secondary mb-2">
                  {t('supplierOrders.panel.changeRequestHint')}
                </p>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={changeText}
                  onChange={(e) => setChangeText(e.target.value)}
                  placeholder={t('supplierOrders.panel.changeRequestPlaceholder')}
                />
              </section>
            )}

            {panelMode === 'confirmed' && (
              <section className="bg-success-soft border-l-2 border-success rounded px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <div>
                    <div className="text-sm font-bold text-success">
                      {t('supplierOrders.panel.orderConfirmed')}
                    </div>
                    <div className="text-xs text-text-secondary">
                      <Data>{selected.poNumber}</Data> ·{' '}
                      {t('supplierOrders.panel.confirmedAt')}{' '}
                      <Data>{confirmedAt}</Data>
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      {t('supplierOrders.panel.deliveryShort')}
                    </dt>
                    <dd className="text-sm font-bold text-text-primary">
                      <Data>{fmtDate(deliveryDate)}</Data>
                    </dd>
                  </div>
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      {t('supplierOrders.panel.totalQty')}
                    </dt>
                    <dd className="text-sm font-bold text-text-primary">
                      <Data>{totalConfirmedQty.toLocaleString()} {t('supplierOrders.units')}</Data>
                    </dd>
                  </div>
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      {t('supplierOrders.panel.next')}
                    </dt>
                    <dd className="text-sm font-bold text-teal inline-flex items-center gap-1">
                      {t('supplierOrders.action.createAsn')} <ChevronRight size={12} />
                    </dd>
                  </div>
                </dl>
                {notes && (
                  <div className="mt-3 text-xs text-text-secondary bg-white rounded px-3 py-2 border border-border-subtle">
                    {t('supplierOrders.panel.notesPrefix')} {notes}
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

export default SupplierOrders;
