import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModeLabel } from '../hooks/useModeLabel';
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
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
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
  const { t } = useTranslation();
  const ml = useModeLabel();
  const { toast } = useToast();
  // Breadcrumb is built from t() inside the component (mirrors BuyerDiscovery).
  const SHIPMENTS_CRUMB = [
    t('shipments.crumb.transact'),
    t('shipments.crumb.shipments'),
  ];
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
        title: t('shipments.timeline.poCreated'),
        timestamp: s.poNumber,
        status: 'completed',
      },
      {
        id: 'e2',
        title: t('shipments.timeline.asnSubmitted'),
        timestamp:
          s.status === 'Pending ASN'
            ? t('shipments.timeline.pending')
            : s.asnNumber,
        status: s.status === 'Pending ASN' ? 'current' : 'completed',
      },
      {
        id: 'e3',
        title: t('shipments.timeline.shippedFromOrigin'),
        timestamp: s.shipDate ? formatDate(s.shipDate) : undefined,
        status: completed(2),
      },
      {
        id: 'e4',
        title: t('shipments.timeline.inTransit'),
        timestamp: s.daysInTransit
          ? s.daysInTransit === 1
            ? t('shipments.timeline.daysInTransit.one', { count: s.daysInTransit })
            : t('shipments.timeline.daysInTransit.other', { count: s.daysInTransit })
          : undefined,
        status: s.status === 'In Transit' ? 'current' : completed(3),
      },
      {
        id: 'e5',
        title: t('shipments.timeline.arrivedAtPort'),
        timestamp: s.actualArrival ? formatDate(s.actualArrival) : undefined,
        status:
          s.status === 'Arrived at Port' ? 'current' : completed(4),
      },
      {
        id: 'e6',
        title: t('shipments.timeline.customsCleared'),
        timestamp:
          s.customsStatus === 'Cleared'
            ? t('shipments.timeline.cleared')
            : s.customsStatus === 'Held'
              ? t('shipments.timeline.onHold')
              : t('shipments.timeline.pending'),
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
        title: t('shipments.timeline.dockedAtNdc'),
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
        title: t('shipments.timeline.unloadedGrPosted'),
        timestamp: s.status === 'Delivered'
          ? t('shipments.timeline.complete')
          : undefined,
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
      title: t('shipments.toast.export.title'),
      description: t('shipments.toast.export.desc'),
    });

  const handleManualASN = () =>
    toast({
      variant: 'info',
      title: t('shipments.toast.manualAsn.title'),
      description: t('shipments.toast.manualAsn.desc'),
    });

  const handleDockSchedule = () => {
    setShowSchedule(true);
    toast({
      variant: 'info',
      title: t('shipments.toast.dockSchedule.title'),
      description: t('shipments.toast.dockSchedule.desc'),
    });
  };

  const footerForStatus = (s: Shipment): React.ReactNode => {
    switch (s.status) {
      case 'Pending ASN':
        return (
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'success',
                title: t('shipments.toast.reminder.title'),
                description: t('shipments.toast.reminder.desc', {
                  supplier: s.supplierName,
                  asn: s.asnNumber,
                }),
              })
            }
          >
            {t('shipments.footer.sendReminder')}
          </Button>
        );
      case 'In Transit':
      case 'Arrived at Port':
      case 'Customs Clearance':
        return (
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'info',
                title: t('shipments.toast.tracking.title'),
                description: t('shipments.toast.tracking.desc', {
                  carrier: s.carrier,
                  tracking: s.trackingNumber,
                }),
              })
            }
          >
            {t('shipments.footer.trackShipment')}
          </Button>
        );
      case 'At Dock':
      case 'Unloading':
        return (
          <Button
            variant="outline"
            onClick={() => navigate('/buyer/goods-receipt')}
          >
            {t('shipments.footer.beginGr')}
          </Button>
        );
      case 'Delivered':
        return (
          <Button
            variant="outline"
            onClick={() => navigate('/buyer/goods-receipt')}
          >
            {t('shipments.footer.viewGr')}
          </Button>
        );
      case 'Delayed':
        return (
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'warning',
                title: t('shipments.toast.carrierAlerted.title'),
                description: t('shipments.toast.carrierAlerted.desc', {
                  asn: s.asnNumber,
                }),
              })
            }
          >
            {t('shipments.footer.contactCarrier')}
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
        title={t('shipments.empty.title')}
        subtitle={t('shipments.empty.subtitle')}
        message={t('shipments.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('shipments.header.title')}
        subtitle={t('shipments.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('shipments.action.export'),
                icon: FileSpreadsheet,
                onClick: handleExport,
              },
              {
                label: t('shipments.action.dockSchedule'),
                icon: CalendarClock,
                onClick: handleDockSchedule,
              },
            ]}
            primary={{
              label: t('shipments.action.manualAsn'),
              icon: Plus,
              onClick: handleManualASN,
            }}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {counts.all === 1
          ? t('shipments.meta.summary.one', {
              count: counts.all,
              date: formatDate(TODAY),
            })
          : t('shipments.meta.summary.other', {
              count: counts.all,
              date: formatDate(TODAY),
            })}
        {/* D-CENSUS-8 — `shipments` is null-backed: the in-transit / at-dock view is
            a frozen fixture with no logistics feed behind it. This page's toasts
            claimed "Reminder sent" and "Carrier alerted" over zero write capability;
            those are retracted in this batch. */}
        <ProvenanceMarker capability="shipments" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          eyebrow={t('shipments.kpi.inTransit.eyebrow')}
          value={formatNumber(counts.transit)}
          icon={Anchor}
          subtitle={t('shipments.kpi.inTransit.subtitle')}
        />
        <KpiCard
          eyebrow={t('shipments.kpi.atDock.eyebrow')}
          value={
            <span className="text-warning-hover">{formatNumber(counts.dock)}</span>
          }
          icon={Truck}
          subtitle={t('shipments.kpi.atDock.subtitle')}
        />
        <KpiCard
          eyebrow={t('shipments.kpi.delayed.eyebrow')}
          value={
            <span className="text-danger">{formatNumber(counts.delayed)}</span>
          }
          icon={AlertTriangle}
          subtitle={t('shipments.kpi.delayed.subtitle')}
        />
        <KpiCard
          eyebrow={t('shipments.kpi.arrivingToday.eyebrow')}
          value={formatNumber(arrivingToday)}
          icon={Clock}
          subtitle={formatDate(TODAY)}
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: t('shipments.tab.all'), count: counts.all },
          { id: 'pending', label: t('shipments.tab.pending'), count: counts.pending },
          { id: 'in-transit', label: t('shipments.tab.inTransit'), count: counts.transit },
          { id: 'at-dock', label: t('shipments.tab.atDock'), count: counts.dock },
          { id: 'delivered', label: t('shipments.tab.delivered'), count: counts.delivered },
          { id: 'delayed', label: t('shipments.tab.delayed'), count: counts.delayed },
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
            placeholder={t('shipments.search.placeholder')}
          />
        </div>
        {/* SEAT2-I18N-MODE-01: the chip `id` stays canonical EN (it is matched
            against `s.mode` data); only the display label localizes via the
            central modeLabel map. Same display-vs-data split as statusLabel. */}
        <FilterChipsBar<ShipmentMode>
          options={[
            { id: 'Sea', label: ml('Sea') },
            { id: 'Air', label: ml('Air') },
            { id: 'Road', label: ml('Road') },
          ]}
          value={selectedModes}
          onChange={toggleMode}
          multiSelect
        />
      </div>

      <div className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('shipments.table.col.asnPo')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.mode')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.route')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.shipDate')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.eta')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.packages')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.dock')}</TableHeaderCell>
            <TableHeaderCell>{t('shipments.table.col.status')}</TableHeaderCell>
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
                    {/* i18n-defer: mock/sample data — supplier proper nouns */}
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
                      {ml(s.mode)}
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
                        {t('shipments.table.daysLate', { days: s.delayDays })}
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
                  {t('shipments.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <FormSection
        eyebrow={t('shipments.dock.eyebrow')}
        title={t('shipments.dock.title')}
        description={t('shipments.dock.description')}
        collapsible
        defaultOpen={showSchedule}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left text-label text-text-tertiary uppercase py-2 pr-3">
                  {t('shipments.dock.col.dock')}
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
                            className="w-full rounded-md px-2 py-2 text-xs font-semibold bg-action-soft text-action-hover hover:bg-action/20 transition-colors text-left"
                          >
                            <Data as="div" className="truncate">{cell.asnNumber}</Data>
                            <div className="text-label text-action/80 truncate">
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
                {t('shipments.panel.keyFacts')}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.asnNumber')}</div>
                  <Data as="div" className="font-semibold text-text-primary">
                    {selected.asnNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.poNumber')}</div>
                  <Data as="div" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.supplier')}</div>
                  {/* i18n-defer: mock/sample data — supplier proper noun */}
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
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.carrier')}</div>
                  {/* i18n-defer: mock/sample data — carrier proper noun */}
                  <div className="text-text-primary">{selected.carrier}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    {t('shipments.panel.trackingNumber')}
                  </div>
                  <Data as="div" className="text-text-primary">
                    {selected.trackingNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.mode')}</div>
                  <div className="text-text-primary">{ml(selected.mode)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.containerNumber')}</div>
                  <Data as="div" className="text-text-primary">
                    {selected.containerNumber ?? '—'}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.origin')}</div>
                  {/* i18n-defer: mock/sample data — city proper noun */}
                  <div className="text-text-primary">{selected.origin}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.destination')}</div>
                  <div className="text-text-primary">
                    {selected.destination}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.shipDate')}</div>
                  <Data as="div" className="text-text-primary">
                    {formatDate(selected.shipDate)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.eta')}</div>
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
                    {t('shipments.panel.actualArrival')}
                  </div>
                  <Data as="div" className="text-text-primary">
                    {formatDate(selected.actualArrival)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.packages')}</div>
                  <Data as="div" className="text-text-primary">
                    {formatNumber(selected.packageCount)}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.totalWeight')}</div>
                  <Data as="div" className="text-text-primary">
                    {formatNumber(selected.totalWeight)} kg
                  </Data>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">{t('shipments.panel.dock')}</div>
                  <div className="text-text-primary">
                    {selected.dockAssignment ?? t('shipments.panel.notScheduled')}
                    {selected.dockTime ? ` · ${selected.dockTime}` : ''}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('shipments.panel.lineItems')}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-tertiary uppercase">
                    <th className="text-left py-1">{t('shipments.panel.col.material')}</th>
                    <th className="text-left py-1">{t('shipments.panel.col.description')}</th>
                    <th className="text-right py-1">{t('shipments.panel.col.qty')}</th>
                    <th className="text-left py-1 pl-2">{t('shipments.panel.col.uom')}</th>
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
                {t('shipments.panel.lifecycle')}
              </div>
              <Timeline events={buildTimeline(selected)} />
            </section>

            <section className="border border-border-subtle rounded-lg p-4 bg-bg-hover">
              <div className="text-label text-text-tertiary uppercase mb-1">
                {t('shipments.panel.dockAssignment')}
              </div>
              {selected.dockAssignment ? (
                <div className="text-sm text-text-primary">
                  {selected.dockAssignment} ·{' '}
                  {t('shipments.panel.dockScheduled', { time: selected.dockTime })}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {t('shipments.panel.notYetScheduled')}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast({
                        variant: 'info',
                        title: t('shipments.toast.dockScheduler.title'),
                        description: t('shipments.toast.dockScheduler.desc'),
                      })
                    }
                  >
                    {t('shipments.panel.scheduleDock')}
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
