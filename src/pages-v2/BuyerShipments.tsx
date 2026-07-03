import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Ship,
  Plane,
  Anchor,
  Clock,
  AlertTriangle,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  CalendarClock,
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
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Button from '../components/ui-v2/Button';
import FormSection from '../components/ui-v2/FormSection';
import { useToast } from '../hooks/useToast';
import type {
  Shipment,
  ShipmentStatus,
  ShipmentMode,
} from '../data/mockShipments';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useShipments, useSuppliers } from '../services/query/hooks';

const SHIPMENTS_CRUMB = ['TRANSACT', 'SHIPMENTS & ASN'];

const TODAY = '2026-05-20';

type GroupTab =
  | 'all'
  | 'pending'
  | 'in-transit'
  | 'at-dock'
  | 'delivered'
  | 'delayed';

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};

const STATUS_VARIANT: Record<
  ShipmentStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  'Pending ASN': 'neutral',
  'ASN Received': 'neutral',
  'In Transit': 'neutral',
  'Arrived at Port': 'neutral',
  'Customs Clearance': 'warning',
  'At Dock': 'warning',
  Unloading: 'warning',
  Delivered: 'success',
  Delayed: 'danger',
};

const MODE_ICON: Record<ShipmentMode, LucideIcon> = {
  Sea: Ship,
  Air: Plane,
  Road: Truck,
};

const IN_TRANSIT_STATUSES: ShipmentStatus[] = [
  'In Transit',
  'Arrived at Port',
  'Customs Clearance',
];

const AT_DOCK_STATUSES: ShipmentStatus[] = ['At Dock', 'Unloading'];

const PENDING_STATUSES: ShipmentStatus[] = ['Pending ASN', 'ASN Received'];

const formatNumber = (n: number): string =>
  new Intl.NumberFormat('id-ID').format(n);

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const isToday = (iso?: string): boolean => iso === TODAY;

const matchesGroup = (s: ShipmentStatus, g: GroupTab): boolean => {
  if (g === 'all') return true;
  if (g === 'pending') return PENDING_STATUSES.includes(s);
  if (g === 'in-transit') return IN_TRANSIT_STATUSES.includes(s);
  if (g === 'at-dock') return AT_DOCK_STATUSES.includes(s);
  if (g === 'delivered') return s === 'Delivered';
  if (g === 'delayed') return s === 'Delayed';
  return true;
};

const DOCKS = ['Dock A-1', 'Dock A-2', 'Dock B-1', 'Dock B-2', 'Dock B-3', 'Dock C-1'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

const BuyerShipments: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const shipmentsQuery = useShipments();
  const suppliersQuery = useSuppliers();
  const shipments = shipmentsQuery.data?.items ?? [];
  const supplierById = useMemo(
    () => new Map((suppliersQuery.data?.items ?? []).map((s) => [s.id, s])),
    [suppliersQuery.data],
  );
  const [tab, setTab] = useState<GroupTab>('all');
  const [search, setSearch] = useState('');
  const [selectedModes, setSelectedModes] = useState<ShipmentMode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(true);

  const counts = useMemo(() => {
    let pending = 0;
    let transit = 0;
    let dock = 0;
    let delivered = 0;
    let delayed = 0;
    for (const s of shipments) {
      if (PENDING_STATUSES.includes(s.status)) pending++;
      if (IN_TRANSIT_STATUSES.includes(s.status)) transit++;
      if (AT_DOCK_STATUSES.includes(s.status)) dock++;
      if (s.status === 'Delivered') delivered++;
      if (s.status === 'Delayed') delayed++;
    }
    return {
      all: shipments.length,
      pending,
      transit,
      dock,
      delivered,
      delayed,
    };
  }, [shipments]);

  const arrivingToday = useMemo(
    () => shipments.filter((s) => isToday(s.estimatedArrival)).length,
    [shipments]
  );

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      if (!matchesGroup(s.status, tab)) return false;
      if (selectedModes.length > 0 && !selectedModes.includes(s.mode))
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !s.asnNumber.toLowerCase().includes(q) &&
          !s.poNumber.toLowerCase().includes(q) &&
          !s.supplierName.toLowerCase().includes(q) &&
          !s.trackingNumber.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [shipments, tab, selectedModes, search]);

  const toggleMode = (m: ShipmentMode) => {
    setSelectedModes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const selected = selectedId
    ? shipments.find((s) => s.id === selectedId) ?? null
    : null;
  const selectedSupplier = selected
    ? supplierById.get(selected.supplierId)
    : undefined;

  const buildTimeline = (s: Shipment): TimelineEvent[] => {
    const completed = (statusOrder: number): 'completed' | 'current' | 'pending' => {
      const current = statusOrderFor(s);
      if (statusOrder < current) return 'completed';
      if (statusOrder === current) return 'current';
      return 'pending';
    };

    return [
      {
        id: 'e1',
        title: 'PO Created',
        timestamp: s.poNumber,
        status: 'completed',
      },
      {
        id: 'e2',
        title: 'ASN Submitted',
        timestamp: s.status === 'Pending ASN' ? 'Pending' : s.asnNumber,
        status: s.status === 'Pending ASN' ? 'current' : 'completed',
      },
      {
        id: 'e3',
        title: 'Shipped from Origin',
        timestamp: s.shipDate ? formatDate(s.shipDate) : undefined,
        status: completed(2),
      },
      {
        id: 'e4',
        title: 'In Transit',
        timestamp: s.daysInTransit ? `${s.daysInTransit} days` : undefined,
        status: s.status === 'In Transit' ? 'current' : completed(3),
      },
      {
        id: 'e5',
        title: 'Arrived at Port',
        timestamp: s.actualArrival ? formatDate(s.actualArrival) : undefined,
        status:
          s.status === 'Arrived at Port' ? 'current' : completed(4),
      },
      {
        id: 'e6',
        title: 'Customs Cleared',
        timestamp:
          s.customsStatus === 'Cleared'
            ? 'Cleared'
            : s.customsStatus === 'Held'
              ? 'On hold'
              : 'Pending',
        status:
          s.customsStatus === 'Cleared'
            ? 'completed'
            : s.customsStatus === 'Held'
              ? 'current'
              : s.status === 'Customs Clearance'
                ? 'current'
                : completed(5),
      },
      {
        id: 'e7',
        title: 'Docked at NDC',
        timestamp: s.dockAssignment
          ? `${s.dockAssignment}${s.dockTime ? ` · ${s.dockTime}` : ''}`
          : undefined,
        status: s.dockAssignment
          ? s.status === 'At Dock' || s.status === 'Unloading'
            ? 'current'
            : 'completed'
          : 'pending',
      },
      {
        id: 'e8',
        title: 'Unloaded & GR Posted',
        timestamp: s.status === 'Delivered' ? 'Complete' : undefined,
        status: s.status === 'Delivered' ? 'completed' : 'pending',
      },
    ];
  };

  const statusOrderFor = (s: Shipment): number => {
    switch (s.status) {
      case 'Pending ASN':
        return 1;
      case 'ASN Received':
        return 2;
      case 'In Transit':
        return 3;
      case 'Arrived at Port':
        return 4;
      case 'Customs Clearance':
        return 5;
      case 'At Dock':
        return 6;
      case 'Unloading':
        return 6;
      case 'Delivered':
        return 7;
      case 'Delayed':
        return 3;
      default:
        return 0;
    }
  };

  const dockSchedule = useMemo(() => {
    const map: Record<string, Record<string, Shipment | undefined>> = {};
    for (const d of DOCKS) {
      map[d] = {};
      for (const t of TIME_SLOTS) map[d][t] = undefined;
    }
    for (const s of shipments) {
      if (s.dockAssignment && s.dockTime && map[s.dockAssignment]) {
        if (s.dockTime in map[s.dockAssignment]) {
          map[s.dockAssignment][s.dockTime] = s;
        }
      }
    }
    return map;
  }, [shipments]);

  const handleExport = () =>
    toast({
      variant: 'info',
      title: 'Export queued',
      description: 'Shipments export will download shortly.',
    });

  const handleManualASN = () =>
    toast({
      variant: 'info',
      title: 'Manual ASN entry',
      description: 'Form will open in a future release.',
    });

  const handleDockSchedule = () => {
    setShowSchedule(true);
    toast({
      variant: 'info',
      title: 'Dock schedule expanded',
      description: 'Scroll down to view assignments.',
    });
  };

  const footerForStatus = (s: Shipment): React.ReactNode => {
    switch (s.status) {
      case 'Pending ASN':
        return (
          <Button
            variant="primary"
            onClick={() =>
              toast({
                variant: 'success',
                title: 'Reminder sent',
                description: `Notified ${s.supplierName} for ${s.asnNumber}`,
              })
            }
          >
            Send reminder to supplier
          </Button>
        );
      case 'In Transit':
      case 'Arrived at Port':
      case 'Customs Clearance':
        return (
          <Button
            variant="primary"
            onClick={() =>
              toast({
                variant: 'info',
                title: 'Tracking opened',
                description: `Carrier: ${s.carrier} · ${s.trackingNumber}`,
              })
            }
          >
            Track shipment
          </Button>
        );
      case 'At Dock':
      case 'Unloading':
        return (
          <Button
            variant="primary"
            onClick={() => navigate('/buyer/goods-receipt')}
          >
            Begin GR process
          </Button>
        );
      case 'Delivered':
        return (
          <Button
            variant="primary"
            onClick={() => navigate('/buyer/goods-receipt')}
          >
            View GR
          </Button>
        );
      case 'Delayed':
        return (
          <Button
            variant="primary"
            onClick={() =>
              toast({
                variant: 'warning',
                title: 'Carrier alerted',
                description: `Escalation ticket opened for ${s.asnNumber}`,
              })
            }
          >
            Contact carrier
          </Button>
        );
      default:
        return null;
    }
  };

  if (shipmentsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (shipmentsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={SHIPMENTS_CRUMB}
        error={shipmentsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          shipmentsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );
  if (shipments.length === 0)
    return (
      <EmptyState
        breadcrumb={SHIPMENTS_CRUMB}
        title="No shipments yet"
        subtitle="No inbound shipments or ASNs to track."
        message="Shipments and advance ship notices will appear here as suppliers dispatch orders."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SHIPMENTS_CRUMB}
        title="Shipments & ASN"
        subtitle="Inbound shipment tracking, advance shipment notices, and dock scheduling."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet, onClick: handleExport },
              {
                label: 'Dock Schedule',
                icon: CalendarClock,
                onClick: handleDockSchedule,
              },
            ]}
            primary={{
              label: 'Manual ASN Entry',
              icon: Plus,
              onClick: handleManualASN,
            }}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {counts.all} active shipments · last updated {formatDate(TODAY)}
      </PageMetaLine>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          eyebrow="In Transit"
          value={formatNumber(counts.transit)}
          icon={Anchor}
          subtitle="At sea, in air, or on road"
        />
        <KpiCard
          eyebrow="At Dock / Unloading"
          value={
            <span className="text-warning">{formatNumber(counts.dock)}</span>
          }
          icon={Truck}
          subtitle="Currently at NDC J6"
        />
        <KpiCard
          eyebrow="Delayed"
          value={
            <span className="text-danger">{formatNumber(counts.delayed)}</span>
          }
          icon={AlertTriangle}
          subtitle="Past ETA"
        />
        <KpiCard
          eyebrow="Arriving Today"
          value={formatNumber(arrivingToday)}
          icon={Clock}
          subtitle={formatDate(TODAY)}
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'pending', label: 'Pending ASN', count: counts.pending },
          { id: 'in-transit', label: 'In Transit', count: counts.transit },
          { id: 'at-dock', label: 'At Dock', count: counts.dock },
          { id: 'delivered', label: 'Delivered', count: counts.delivered },
          { id: 'delayed', label: 'Delayed', count: counts.delayed },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[280px]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by ASN, PO, supplier, or tracking number..."
          />
        </div>
        <FilterChipsBar<ShipmentMode>
          options={[
            { id: 'Sea', label: 'Sea' },
            { id: 'Air', label: 'Air' },
            { id: 'Road', label: 'Road' },
          ]}
          value={selectedModes}
          onChange={toggleMode}
          multiSelect
        />
      </div>

      <div className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>ASN / PO</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Route</TableHeaderCell>
            <TableHeaderCell>Ship Date</TableHeaderCell>
            <TableHeaderCell>ETA</TableHeaderCell>
            <TableHeaderCell>Packages</TableHeaderCell>
            <TableHeaderCell>Dock</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell> </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((s) => {
              const sup = supplierById.get(s.supplierId);
              const Icon = MODE_ICON[s.mode];
              const overdue = (s.delayDays ?? 0) > 0;
              return (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(s.id)}
                >
                  <TableCell>
                    <Data as="div" className="font-semibold text-text-primary">
                      {s.asnNumber}
                    </Data>
                    <Data as="div" className="text-xs text-text-tertiary">
                      {s.poNumber}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {s.supplierName}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {sup
                        ? COUNTRY_FLAG[sup.country] ?? sup.country
                        : '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                      <Icon size={14} />
                      {s.mode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-text-secondary">
                      {s.origin}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      → {s.destination}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Data as="span" className="text-sm text-text-secondary">
                      {formatDate(s.shipDate)}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <Data
                      as="div"
                      className={`text-sm ${overdue ? 'text-danger font-semibold' : 'text-text-primary'}`}
                    >
                      {formatDate(s.estimatedArrival)}
                    </Data>
                    {overdue && (
                      <div className="text-xs text-danger">
                        +{s.delayDays}d late
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data as="div" className="text-sm text-text-primary">
                      {formatNumber(s.packageCount)}
                    </Data>
                    <Data as="div" className="text-xs text-text-tertiary">
                      {formatNumber(s.totalWeight)} kg
                    </Data>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {s.dockAssignment ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[s.status]}>
                      {s.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="py-10 text-center text-sm text-text-tertiary"
                >
                  No shipments match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <FormSection
        eyebrow="OPERATIONS"
        title="Today's Dock Schedule"
        description="Live view of dock assignments for inbound shipments at NDC J6."
        collapsible
        defaultOpen={showSchedule}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left text-label text-text-tertiary uppercase py-2 pr-3">
                  Dock
                </th>
                {TIME_SLOTS.map((t) => (
                  <th
                    key={t}
                    className="text-left text-label text-text-tertiary uppercase py-2 px-1"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOCKS.map((d) => (
                <tr key={d}>
                  <td className="py-2 pr-3 text-sm font-medium text-text-primary">
                    {d}
                  </td>
                  {TIME_SLOTS.map((t) => {
                    const cell = dockSchedule[d]?.[t];
                    return (
                      <td key={t} className="py-1 px-1">
                        {cell ? (
                          <button
                            type="button"
                            onClick={() => setSelectedId(cell.id)}
                            className="w-full rounded-md px-2 py-2 text-xs font-semibold bg-teal-soft text-teal hover:bg-teal/20 transition-colors text-left"
                          >
                            <Data as="div" className="truncate">{cell.asnNumber}</Data>
                            <div className="text-[10px] text-teal/80 truncate">
                              {cell.supplierName}
                            </div>
                          </button>
                        ) : (
                          <div className="rounded-md px-2 py-2 bg-bg-hover text-text-tertiary text-center">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      <SidePanel
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.asnNumber : ''}
        footerActions={selected ? footerForStatus(selected) : null}
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Key facts
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-tertiary">ASN #</div>
                  <Data as="div" className="font-semibold text-text-primary">
                    {selected.asnNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">PO #</div>
                  <Data as="div" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">Supplier</div>
                  <div className="text-text-primary">
                    {selected.supplierName}{' '}
                    {selectedSupplier && (
                      <span className="text-xs text-text-tertiary">
                        ·{' '}
                        {COUNTRY_FLAG[selectedSupplier.country] ??
                          selectedSupplier.country}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Carrier</div>
                  <div className="text-text-primary">{selected.carrier}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    Tracking #
                  </div>
                  <Data as="div" className="text-text-primary">
                    {selected.trackingNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Mode</div>
                  <div className="text-text-primary">{selected.mode}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Container #</div>
                  <Data as="div" className="text-text-primary">
                    {selected.containerNumber ?? '—'}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Origin</div>
                  <div className="text-text-primary">{selected.origin}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Destination</div>
                  <div className="text-text-primary">
                    {selected.destination}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Ship Date</div>
                  <Data as="div" className="text-text-primary">
                    {formatDate(selected.shipDate)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">ETA</div>
                  <Data
                    as="div"
                    className={
                      (selected.delayDays ?? 0) > 0
                        ? 'text-danger font-semibold'
                        : 'text-text-primary'
                    }
                  >
                    {formatDate(selected.estimatedArrival)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    Actual Arrival
                  </div>
                  <Data as="div" className="text-text-primary">
                    {formatDate(selected.actualArrival)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Packages</div>
                  <Data as="div" className="text-text-primary">
                    {formatNumber(selected.packageCount)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Total Weight</div>
                  <Data as="div" className="text-text-primary">
                    {formatNumber(selected.totalWeight)} kg
                  </Data>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">Dock</div>
                  <div className="text-text-primary">
                    {selected.dockAssignment ?? 'Not scheduled'}
                    {selected.dockTime ? ` · ${selected.dockTime}` : ''}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Line items
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-tertiary uppercase">
                    <th className="text-left py-1">Material</th>
                    <th className="text-left py-1">Description</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-left py-1 pl-2">UoM</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lineItems.map((li, i) => (
                    <tr key={i} className="border-t border-border-subtle">
                      <td className="py-2 text-text-primary">
                        <Data>{li.materialCode}</Data>
                      </td>
                      <td className="py-2 text-text-secondary">
                        {li.description}
                      </td>
                      <td className="py-2 text-right text-text-primary">
                        <Data>{formatNumber(li.qty)}</Data>
                      </td>
                      <td className="py-2 pl-2 text-text-tertiary">{li.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Shipment lifecycle
              </div>
              <Timeline events={buildTimeline(selected)} />
            </section>

            <section className="border border-border-subtle rounded-lg p-4 bg-bg-hover">
              <div className="text-label text-text-tertiary uppercase mb-1">
                Dock Assignment
              </div>
              {selected.dockAssignment ? (
                <div className="text-sm text-text-primary">
                  {selected.dockAssignment} · Scheduled {selected.dockTime}{' '}
                  today
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Not yet scheduled
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast({
                        variant: 'info',
                        title: 'Dock scheduler',
                        description: 'Schedule UI will open in a future release.',
                      })
                    }
                  >
                    Schedule dock
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerShipments;
