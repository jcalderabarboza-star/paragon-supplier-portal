import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Layers,
  RefreshCcw,
  Download,
  Database,
  Mail,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { mockInventory } from '../data/mockInventory';
import { mockSuppliers } from '../data/mockSuppliers';
import { StockStatus } from '../types/supplier.types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';

const STATUS_VARIANT: Record<StockStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  [StockStatus.CRITICAL]: 'danger',
  [StockStatus.LOW]: 'warning',
  [StockStatus.NORMAL]: 'success',
  [StockStatus.EXCESS]: 'neutral',
};

const STATUS_BAR_COLOR: Record<StockStatus, string> = {
  [StockStatus.CRITICAL]: '#BB0000',
  [StockStatus.LOW]: '#B45309',
  [StockStatus.NORMAL]: '#107E3E',
  [StockStatus.EXCESS]: '#354A5F',
};

const SOURCE_VARIANT: Record<string, 'info' | 'success' | 'neutral'> = {
  'API Push': 'info',
  'EDI 846': 'success',
  Manual: 'neutral',
};

type StatusFilter = StockStatus | 'All';

const fmt = (n: number): string => n.toLocaleString('id-ID');
const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const DaysBar: React.FC<{ days: number; status: StockStatus }> = ({
  days,
  status,
}) => {
  const pct = Math.min((days / 45) * 100, 100);
  const color = STATUS_BAR_COLOR[status];
  const textVariant = STATUS_VARIANT[status];
  const textClass =
    textVariant === 'danger'
      ? 'text-danger'
      : textVariant === 'warning'
        ? 'text-warning'
        : textVariant === 'success'
          ? 'text-success'
          : 'text-text-secondary';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-bg-hover rounded-full h-1.5 min-w-[60px]">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={`text-xs font-semibold min-w-[28px] text-right ${textClass}`}>
        {days}d
      </span>
    </div>
  );
};

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: StockStatus.CRITICAL, label: 'Critical' },
  { id: StockStatus.LOW, label: 'Low' },
  { id: StockStatus.NORMAL, label: 'Normal' },
  { id: StockStatus.EXCESS, label: 'Excess' },
];

const SupplierInventory: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');

  const mySupplier = useMemo(
    () => mockSuppliers.find((s) => s.id === supplierId),
    [supplierId],
  );

  const myInventory = useMemo(
    () => mockInventory.filter((r) => r.supplierId === supplierId),
    [supplierId],
  );

  const counts = useMemo(
    () => ({
      critical: myInventory.filter(
        (r) => r.stockStatus === StockStatus.CRITICAL,
      ).length,
      low: myInventory.filter((r) => r.stockStatus === StockStatus.LOW).length,
      normal: myInventory.filter((r) => r.stockStatus === StockStatus.NORMAL)
        .length,
      excess: myInventory.filter((r) => r.stockStatus === StockStatus.EXCESS)
        .length,
    }),
    [myInventory],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return myInventory.filter((r) => {
      const matchStatus =
        filterStatus === 'All' || r.stockStatus === filterStatus;
      const matchSearch =
        q === '' ||
        r.materialDescription.toLowerCase().includes(q) ||
        r.materialCode.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [filterStatus, search, myInventory]);

  const maxLastUpdated = useMemo(
    () =>
      myInventory.reduce(
        (a, r) => (r.lastUpdated > a ? r.lastUpdated : a),
        myInventory[0]?.lastUpdated ?? '',
      ),
    [myInventory],
  );

  if (!supplierId || !mySupplier) return <NoSupplierIdentity />;

  const setKpiFilter = (s: StockStatus) =>
    setFilterStatus((prev) => (prev === s ? 'All' : s));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['TRANSACT', 'MY INVENTORY']}
        title="My Inventory"
        subtitle="Live stock visibility · days-of-supply tracking · Paragon minimum thresholds."
        actions={
          <BulkActionsBar
            actions={[
              {
                label: 'Sync now',
                icon: RefreshCcw,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: 'Syncing inventory from supplier API feeds',
                  }),
              },
            ]}
            primary={{
              label: 'Export EDI 846',
              icon: Download,
              onClick: () =>
                toast({
                  variant: 'success',
                  title: 'Export preparing',
                  description: 'EDI 846 format download starting.',
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {myInventory.length} materials · last sync {fmtDate(maxLastUpdated)}
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Critical stock"
          value={counts.critical.toString()}
          subtitle={
            <span className="text-danger">
              {((counts.critical / myInventory.length) * 100).toFixed(0)}% of
              materials
            </span>
          }
          icon={AlertOctagon}
          onClick={() => setKpiFilter(StockStatus.CRITICAL)}
          active={filterStatus === StockStatus.CRITICAL}
        />
        <KpiCard
          eyebrow="Low stock"
          value={counts.low.toString()}
          subtitle={
            <span className="text-warning">
              {((counts.low / myInventory.length) * 100).toFixed(0)}% of
              materials
            </span>
          }
          icon={AlertTriangle}
          onClick={() => setKpiFilter(StockStatus.LOW)}
          active={filterStatus === StockStatus.LOW}
        />
        <KpiCard
          eyebrow="Normal"
          value={counts.normal.toString()}
          subtitle={
            <span className="text-success">
              {((counts.normal / myInventory.length) * 100).toFixed(0)}% of
              materials
            </span>
          }
          icon={CheckCircle2}
          onClick={() => setKpiFilter(StockStatus.NORMAL)}
          active={filterStatus === StockStatus.NORMAL}
        />
        <KpiCard
          eyebrow="Excess"
          value={counts.excess.toString()}
          subtitle={
            <span className="text-text-secondary">
              {((counts.excess / myInventory.length) * 100).toFixed(0)}% of
              materials
            </span>
          }
          icon={Layers}
          onClick={() => setKpiFilter(StockStatus.EXCESS)}
          active={filterStatus === StockStatus.EXCESS}
        />
      </div>

      {counts.critical > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-6 flex items-start gap-2 text-sm text-danger">
          <AlertOctagon size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {counts.critical} material{counts.critical > 1 ? 's' : ''}
            </strong>{' '}
            at critical stock level. Paragon procurement team has been
            automatically notified.
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search material, code, or supplier…"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterChipsBar<StatusFilter>
            options={STATUS_OPTIONS}
            value={filterStatus}
            onChange={setFilterStatus}
          />
          <span className="text-meta text-text-tertiary">
            {filtered.length} of {myInventory.length} materials
          </span>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>Material</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell className="text-right">On hand</TableHeaderCell>
            <TableHeaderCell className="text-right">Available</TableHeaderCell>
            <TableHeaderCell className="text-right">In transit</TableHeaderCell>
            <TableHeaderCell>UoM</TableHeaderCell>
            <TableHeaderCell>Days supply</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Last updated</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((row) => {
              const sourceVariant = SOURCE_VARIANT[row.dataSource] ?? 'neutral';
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-mono text-xs font-semibold text-teal">
                      {row.materialCode}
                    </div>
                    <div className="text-sm text-text-primary truncate max-w-[14rem]">
                      {row.materialDescription}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary text-xs">
                    {row.supplierName
                      .replace('PT ', '')
                      .split(' ')
                      .slice(0, 2)
                      .join(' ')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {fmt(row.qtyOnHand)}
                  </TableCell>
                  <TableCell className="text-right text-text-primary whitespace-nowrap">
                    {fmt(row.qtyAvailable)}
                  </TableCell>
                  <TableCell
                    className={`text-right whitespace-nowrap ${
                      row.qtyInTransit > 0 ? 'text-teal' : 'text-text-tertiary'
                    }`}
                  >
                    {row.qtyInTransit > 0 ? fmt(row.qtyInTransit) : '—'}
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs">
                    {row.uom}
                  </TableCell>
                  <TableCell>
                    <DaysBar
                      days={row.daysOfSupply}
                      status={row.stockStatus}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[row.stockStatus]}>
                      {row.stockStatus}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={sourceVariant}>
                      {row.dataSource}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
                    {fmtDate(row.lastUpdated)}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  No materials match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
          <Database size={14} className="text-info shrink-0 mt-0.5" />
          <span>
            <strong className="text-info">Data sources:</strong> API Push
            (real-time), EDI 846 (daily), Manual (supplier-updated). Phase 2
            will add SAP MM stock pull and VMI signal integration.
          </span>
        </div>
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
          <Mail size={14} className="text-warning shrink-0 mt-0.5" />
          <span>
            <strong className="text-warning">Thresholds:</strong> Critical &lt;7
            days · Low 7–14 days · Normal 14–30 days · Excess &gt;30 days.
            Paragon minimum stock requirements enforced at category level.
          </span>
        </div>
      </div>
    </AppShellV2>
  );
};

export default SupplierInventory;
