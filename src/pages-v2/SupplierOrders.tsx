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
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
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

const ORDERS_CRUMB = ['TRANSACT', 'MY ORDERS'];

const SupplierOrders: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
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
        title="No purchase orders yet"
        subtitle={`No purchase orders on file for ${mySupplier.name}.`}
        message="Purchase orders issued by Paragon Corp will appear here."
      />
    );

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

  const confirmOrder = () => {
    if (!selected) return;
    const time = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setConfirmedAt(time);
    setPanelMode('confirmed');
    toast({
      variant: 'success',
      title: `${selected.poNumber} confirmed`,
      description: 'Paragon procurement notified.',
    });
  };

  const submitChangeRequest = () => {
    if (!selected) return;
    toast({
      variant: 'info',
      title: `Change request for ${selected.poNumber} submitted`,
      description: 'Paragon team will review.',
    });
    closePanel();
  };

  const goToASN = () => {
    if (!selected) return;
    toast({
      title: `ASN creation for ${selected.poNumber}`,
      description: 'Open My Shipments & ASN to continue.',
    });
    closePanel();
  };

  const handleRowAction = (po: PurchaseOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ACTION_STATUSES.includes(po.status)) {
      openOrderPanel(po, 'editing');
    } else if (po.status === POStatus.CONFIRMED) {
      toast({
        title: `Creating ASN for ${po.poNumber}`,
        description: 'Open My Shipments & ASN to continue.',
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

  const panelTitle = selected ? `PO ${selected.poNumber}` : '';
  const panelActionLabel = (po: PurchaseOrder): string => {
    if (ACTION_STATUSES.includes(po.status)) return 'Confirm';
    if (po.status === POStatus.CONFIRMED) return 'Create ASN';
    return 'View';
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['TRANSACT', 'MY ORDERS']}
        title="My Orders"
        subtitle={`Purchase orders received from Paragon Corp — ${mySupplier.name}.`}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {MY_POS.length} orders · last updated <Data>{fmtDate(maxOrderDate)}</Data>
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Open Orders"
          value={counts.action.toString()}
          subtitle={
            counts.action > 0 ? (
              <span className="text-warning">Needs your action</span>
            ) : (
              'All actions cleared'
            )
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow="In Progress"
          value={counts.progress.toString()}
          subtitle="Confirmed · awaiting delivery"
          icon={Truck}
        />
        <KpiCard
          eyebrow="Total Value Pending"
          value={fmtIDR(totalValuePending)}
          subtitle="Not yet delivered"
          icon={Wallet}
        />
        <KpiCard
          eyebrow="Delivered"
          value={counts.completed.toString()}
          subtitle={<span className="text-success">Completed POs</span>}
          icon={CheckCircle2}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'all', label: 'All orders', count: counts.all },
          { id: 'action', label: 'Needs action', count: counts.action },
          { id: 'progress', label: 'In progress', count: counts.progress },
          { id: 'completed', label: 'Completed', count: counts.completed },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {counts.action > 0 && activeTab !== 'completed' && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-2 text-sm text-warning">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {counts.action} order{counts.action !== 1 ? 's' : ''} need your
              confirmation:{' '}
            </strong>
            click a row to confirm quantities and delivery date.
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>PO #</TableHeaderCell>
            <TableHeaderCell>Order date</TableHeaderCell>
            <TableHeaderCell>Requested delivery</TableHeaderCell>
            <TableHeaderCell className="text-right">Items</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Action</TableHeaderCell>
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
                        ? 'primary'
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
                  No orders in this category.
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
                    Close
                  </Button>
                  {ACTION_STATUSES.includes(selected.status) ? (
                    <Button variant="primary" onClick={startEditing}>
                      Confirm order
                    </Button>
                  ) : selected.status === POStatus.CONFIRMED ? (
                    <Button variant="primary" onClick={goToASN}>
                      Create ASN
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
                    Request change instead
                  </Button>
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={confirmOrder}
                  >
                    Confirm order
                  </Button>
                </>
              )}
              {panelMode === 'change-request' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('editing')}
                  >
                    Back to confirm
                  </Button>
                  <Button variant="primary" onClick={submitChangeRequest}>
                    Submit change request
                  </Button>
                </>
              )}
              {panelMode === 'confirmed' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    Close
                  </Button>
                  <Button variant="primary" icon={Truck} onClick={goToASN}>
                    Create ASN now
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
                Key facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Order date</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.orderDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Requested delivery</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.requestedDeliveryDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Line items</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.lineItems.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Total value</dt>
                  <dd className="text-text-primary font-semibold">
                    <Data>{fmtIDR(selected.totalValue)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill variant={statusTone(selected.status)}>
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
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {panelMode === 'editing'
                  ? 'Line items — confirm quantities'
                  : 'Line items'}
              </h3>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        Material
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Ordered
                      </th>
                      {panelMode === 'editing' && (
                        <th className="text-right px-3 py-2 font-semibold">
                          Confirmed
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
                  Delivery & notes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>
                      Confirmed delivery date
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Notes for Paragon</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional message…"
                      className={inputClass}
                    />
                  </div>
                </div>
                {(hasQtyChange || hasDateChange) && (
                  <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning">
                    Confirmed values differ from the original PO. Paragon will
                    review your changes.
                  </div>
                )}
              </section>
            )}

            {panelMode === 'change-request' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  Change request
                </h3>
                <p className="text-xs text-text-secondary mb-2">
                  Describe the change needed (e.g. reduced quantity,
                  alternative delivery date).
                </p>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={changeText}
                  onChange={(e) => setChangeText(e.target.value)}
                  placeholder="What needs to change?"
                />
              </section>
            )}

            {panelMode === 'confirmed' && (
              <section className="bg-success-soft border-l-2 border-success rounded px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <div>
                    <div className="text-sm font-bold text-success">
                      Order confirmed
                    </div>
                    <div className="text-xs text-text-secondary">
                      <Data>{selected.poNumber}</Data> · Confirmed at{' '}
                      <Data>{confirmedAt}</Data>
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      Delivery
                    </dt>
                    <dd className="text-sm font-bold text-text-primary">
                      <Data>{fmtDate(deliveryDate)}</Data>
                    </dd>
                  </div>
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      Total qty
                    </dt>
                    <dd className="text-sm font-bold text-text-primary">
                      <Data>{totalConfirmedQty.toLocaleString()} units</Data>
                    </dd>
                  </div>
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      Next
                    </dt>
                    <dd className="text-sm font-bold text-teal inline-flex items-center gap-1">
                      Create ASN <ChevronRight size={12} />
                    </dd>
                  </div>
                </dl>
                {notes && (
                  <div className="mt-3 text-xs text-text-secondary bg-white rounded px-3 py-2 border border-border-subtle">
                    Notes: {notes}
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
