import React, { useMemo, useState } from 'react';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  Gauge,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  Send,
  Mail,
  MessageCircle,
  Globe,
  Hand,
  LucideIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import {
  useInventory,
  useSuppliers,
  usePurchaseOrders,
} from '../services/query/hooks';
import { formatNumber } from '../lib/format';
import { InventoryRecord } from '../types/supplier.types';
import { POStatus } from '../types/purchaseOrder.types';

const INVENTORY_CRUMB = ['TRANSACT', 'INVENTORY VISIBILITY'];

type GroupTab = 'all' | 'critical' | 'warning' | 'healthy' | 'excess';

type BrandKey = 'Wardah' | 'Emina' | 'Make Over' | 'BLP' | 'Scarlett';
const BRANDS: BrandKey[] = ['Wardah', 'Emina', 'Make Over', 'BLP', 'Scarlett'];

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};

const DATA_SOURCE_ICON: Record<string, LucideIcon> = {
  'API Push': Send,
  'EDI 846': Globe,
  WhatsApp: MessageCircle,
  Email: Mail,
  Manual: Hand,
};

const inferBrand = (item: InventoryRecord): BrandKey[] => {
  const desc = item.materialDescription.toLowerCase();
  const found: BrandKey[] = [];
  for (const b of BRANDS) {
    if (desc.includes(b.toLowerCase())) found.push(b);
  }
  return found;
};

const formatRelativeTime = (iso: string): string => {
  if (!iso) return '—';
  const now = new Date('2026-05-20').getTime();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000)
    return `${Math.max(1, Math.round(diff / (60 * 1000)))}m ago`;
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

const dosBucket = (
  dos: number
): { tab: GroupTab; label: string; cls: string; cellCls: string } => {
  if (dos < 14)
    return {
      tab: 'critical',
      label: `${dos}d`,
      cls: 'bg-danger-soft text-danger',
      cellCls: 'bg-danger-soft text-danger',
    };
  if (dos < 30)
    return {
      tab: 'warning',
      label: `${dos}d`,
      cls: 'bg-warning-soft text-warning',
      cellCls: 'bg-warning-soft text-warning',
    };
  if (dos <= 60)
    return {
      tab: 'healthy',
      label: `${dos}d`,
      cls: 'bg-success-soft text-success',
      cellCls: 'bg-success-soft text-success',
    };
  return {
    tab: 'excess',
    label: `${dos}d`,
    cls: 'bg-info-soft text-info',
    cellCls: 'bg-info-soft text-info',
  };
};

// Generate a synthetic DOS trend for the last 30 days based on current DOS
const buildDosTrend = (current: number): { day: string; dos: number }[] => {
  const out: { day: string; dos: number }[] = [];
  let value = current + 12; // start higher
  for (let i = 29; i >= 0; i--) {
    const date = new Date('2026-05-20');
    date.setDate(date.getDate() - i);
    // gentle decline with noise
    value = value - 0.4 + (Math.sin(i * 0.6) + Math.cos(i * 0.3)) * 0.8;
    out.push({
      day: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      dos: Math.max(1, Math.round(value)),
    });
  }
  // ensure last point equals current
  out[out.length - 1].dos = current;
  return out;
};

const BuyerInventory: React.FC = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<GroupTab>('all');
  const [search, setSearch] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<BrandKey[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inventoryQuery = useInventory();
  const suppliersQuery = useSuppliers();
  const posQuery = usePurchaseOrders();

  const inventory = inventoryQuery.data?.items ?? [];
  const purchaseOrders = posQuery.data?.items ?? [];
  // Category / country / OTIF are cross-supplier joins — best-effort off the
  // suppliers list (empty for a supplier persona; the page still renders).
  const supplierById = useMemo(
    () => new Map((suppliersQuery.data?.items ?? []).map((s) => [s.id, s])),
    [suppliersQuery.data],
  );

  const counts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let healthy = 0;
    let excess = 0;
    for (const it of inventory) {
      const b = dosBucket(it.daysOfSupply).tab;
      if (b === 'critical') critical++;
      else if (b === 'warning') warning++;
      else if (b === 'healthy') healthy++;
      else if (b === 'excess') excess++;
    }
    return {
      all: inventory.length,
      critical,
      warning,
      healthy,
      excess,
    };
  }, [inventory]);

  const avgDos = useMemo(() => {
    if (inventory.length === 0) return 0;
    const sum = inventory.reduce((acc, it) => acc + it.daysOfSupply, 0);
    return Math.round(sum / inventory.length);
  }, [inventory]);

  const filtered = useMemo(() => {
    return inventory.filter((it) => {
      const bucket = dosBucket(it.daysOfSupply).tab;
      if (tab !== 'all' && bucket !== tab) return false;
      if (selectedBrands.length > 0) {
        const brands = inferBrand(it);
        const match = brands.some((b) => selectedBrands.includes(b));
        if (!match) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !it.materialCode.toLowerCase().includes(q) &&
          !it.materialDescription.toLowerCase().includes(q) &&
          !it.supplierName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [inventory, tab, search, selectedBrands]);

  const selected = selectedId
    ? inventory.find((it) => it.id === selectedId) ?? null
    : null;

  // Build heatmap rows: category × brand
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const it of inventory) {
      const sup = supplierById.get(it.supplierId);
      if (sup?.category) cats.add(sup.category);
    }
    return Array.from(cats);
  }, [inventory, supplierById]);

  const heatmap = useMemo(() => {
    const map: Record<string, Record<string, { dos: number; count: number }>> =
      {};
    for (const cat of categories) {
      map[cat] = {};
      for (const b of BRANDS) {
        map[cat][b] = { dos: 0, count: 0 };
      }
    }
    for (const it of inventory) {
      const sup = supplierById.get(it.supplierId);
      const cat = sup?.category ?? 'Other';
      const brands = inferBrand(it);
      const target = brands.length > 0 ? brands : BRANDS;
      for (const b of target) {
        if (!map[cat]) {
          map[cat] = {};
          for (const bb of BRANDS) map[cat][bb] = { dos: 0, count: 0 };
        }
        map[cat][b].dos += it.daysOfSupply;
        map[cat][b].count += 1;
      }
    }
    return map;
  }, [categories, inventory, supplierById]);

  // Primary gate is the inventory read; the supplier / PO joins degrade
  // gracefully and are not gated.
  if (inventoryQuery.isPending)
    return <LoadingState breadcrumb={INVENTORY_CRUMB} />;
  if (inventoryQuery.isError)
    return (
      <ErrorState
        breadcrumb={INVENTORY_CRUMB}
        error={inventoryQuery.error}
        onRetry={() => inventoryQuery.refetch()}
      />
    );
  if (inventory.length === 0)
    return (
      <EmptyState
        breadcrumb={INVENTORY_CRUMB}
        title="No inventory positions yet"
        subtitle="Upstream supplier inventory positions appear here."
        message="When suppliers report stock, their days-of-supply positions show up here."
      />
    );

  const toggleBrand = (b: BrandKey) => {
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const handleSync = () => {
    toast({
      variant: 'success',
      title: 'Sync queued',
      description: `Last update: ${new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    });
  };

  const handleExport = () => {
    toast({
      variant: 'info',
      title: 'Export started',
      description: 'Inventory snapshot will be ready shortly.',
    });
  };

  const selectedSupplier = selected
    ? supplierById.get(selected.supplierId)
    : undefined;

  const dosTrend = selected ? buildDosTrend(selected.daysOfSupply) : [];

  const activePOs = selected
    ? purchaseOrders.filter(
        (po) =>
          po.supplierId === selected.supplierId &&
          po.lineItems.some((li) => li.materialCode === selected.materialCode) &&
          po.status !== POStatus.CLOSED
      )
    : [];

  const inventoryTimeline: TimelineEvent[] = selected
    ? [
        {
          id: 't1',
          title: `Stock update from ${selected.dataSource}`,
          timestamp: formatRelativeTime(selected.lastUpdated),
          status: 'completed',
          description: `On-hand ${formatNumber(selected.qtyOnHand)} ${selected.uom}`,
        },
        {
          id: 't2',
          title: 'Reservation posted',
          timestamp: '1d ago',
          status: 'completed',
          description: `${formatNumber(selected.qtyReserved)} ${selected.uom} reserved for open POs`,
        },
        {
          id: 't3',
          title: 'Previous reconciliation',
          timestamp: '3d ago',
          status: 'completed',
          description: 'Cycle count complete · no variance',
        },
      ]
    : [];

  const heatColor = (dos: number): string => {
    if (dos === 0) return 'bg-bg-hover text-text-tertiary';
    return dosBucket(dos).cellCls;
  };

  const SourceIcon = (src: string): LucideIcon =>
    DATA_SOURCE_ICON[src] ?? Hand;

  const lastSync = '11:42';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={INVENTORY_CRUMB}
        title="Inventory Visibility"
        subtitle="Real-time upstream supplier inventory positions, days of supply, and critical material alerts."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet, onClick: handleExport },
              { label: 'Sync now', icon: RefreshCw, onClick: handleSync },
            ]}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {inventory.length} materials tracked · last sync {lastSync}
      </PageMetaLine>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          eyebrow="Total Materials Tracked"
          value={formatNumber(counts.all)}
          icon={Package}
          subtitle="Across all upstream suppliers"
        />
        <KpiCard
          eyebrow="Critical (<14 days DOS)"
          value={
            <span className="text-danger">{formatNumber(counts.critical)}</span>
          }
          icon={AlertTriangle}
          subtitle="Immediate replenishment needed"
        />
        <KpiCard
          eyebrow="Warning (14–30 days)"
          value={
            <span className="text-warning">{formatNumber(counts.warning)}</span>
          }
          icon={AlertCircle}
          subtitle="Monitor closely"
        />
        <KpiCard
          eyebrow="Avg Days of Supply"
          value={`${avgDos} days`}
          icon={Gauge}
          subtitle="Portfolio mean"
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'critical', label: 'Critical', count: counts.critical },
          { id: 'warning', label: 'Warning', count: counts.warning },
          { id: 'healthy', label: 'Healthy', count: counts.healthy },
          { id: 'excess', label: 'Excess', count: counts.excess },
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
            placeholder="Search by material code, name, or supplier..."
          />
        </div>
        <FilterChipsBar<BrandKey>
          options={BRANDS.map((b) => ({ id: b, label: b }))}
          value={selectedBrands}
          onChange={toggleBrand}
          multiSelect
        />
      </div>

      {/* DOS Heatmap */}
      <section className="border border-border-subtle rounded-lg bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-label text-text-tertiary uppercase mb-1">
              Coverage Overview
            </div>
            <h3 className="text-section text-text-primary">
              DOS heatmap by category × brand
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-danger-soft" />
              {'< 14d'}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-warning-soft" />
              14–30d
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-success-soft" />
              30–60d
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-info-soft" />
              {'> 60d'}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-label text-text-tertiary uppercase py-2 pr-4">
                  Category
                </th>
                {BRANDS.map((b) => (
                  <th
                    key={b}
                    className="text-left text-label text-text-tertiary uppercase py-2 px-2"
                  >
                    {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat}>
                  <td className="py-2 pr-4 text-text-primary font-medium">
                    {cat}
                  </td>
                  {BRANDS.map((b) => {
                    const cell = heatmap[cat]?.[b];
                    const avg =
                      cell && cell.count > 0
                        ? Math.round(cell.dos / cell.count)
                        : 0;
                    return (
                      <td key={b} className="py-1 px-1">
                        <div
                          className={`rounded-md px-3 py-2 text-xs font-semibold ${heatColor(
                            avg
                          )}`}
                        >
                          {avg > 0 ? `${avg}d` : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border border-border-subtle rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>Material</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell className="text-right">On-Hand</TableHeaderCell>
            <TableHeaderCell className="text-right">Available</TableHeaderCell>
            <TableHeaderCell>DOS</TableHeaderCell>
            <TableHeaderCell>Last Updated</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell> </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((it) => {
              const sup = supplierById.get(it.supplierId);
              const bucket = dosBucket(it.daysOfSupply);
              const Icon = SourceIcon(it.dataSource);
              return (
                <TableRow
                  key={it.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(it.id)}
                >
                  <TableCell>
                    <div className="font-mono text-sm text-text-primary">
                      {it.materialCode}
                    </div>
                    <div className="text-xs text-text-tertiary truncate max-w-[260px]">
                      {it.materialDescription}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {it.supplierName}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {sup
                        ? COUNTRY_FLAG[sup.country] ?? sup.country
                        : '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {sup?.category ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-text-primary">
                      {formatNumber(it.qtyOnHand)}
                    </div>
                    <div className="text-xs text-text-tertiary">{it.uom}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-text-primary">
                      {formatNumber(it.qtyAvailable)}
                    </div>
                    <div className="text-xs text-text-tertiary">{it.uom}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${bucket.cls}`}
                    >
                      {bucket.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {formatRelativeTime(it.lastUpdated)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      <Icon size={14} />
                      {it.dataSource}
                    </span>
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
                  colSpan={9}
                  className="py-10 text-center text-sm text-text-tertiary"
                >
                  No materials match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.materialCode : ''}
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Key facts
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-tertiary">Material</div>
                  <div className="font-mono text-text-primary">
                    {selected.materialCode}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Category</div>
                  <div className="text-text-primary">
                    {selectedSupplier?.category ?? '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">Description</div>
                  <div className="text-text-primary">
                    {selected.materialDescription}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Supplier</div>
                  <div className="text-text-primary">
                    {selected.supplierName}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">OTIF</div>
                  <div className="text-text-primary">
                    {selectedSupplier
                      ? `${selectedSupplier.otif}%`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Lead Time</div>
                  <div className="text-text-primary">14 days</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">MOQ</div>
                  <div className="text-text-primary">
                    {formatNumber(Math.max(500, selected.avgDailyDemand * 7))}{' '}
                    {selected.uom}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    Safety Stock
                  </div>
                  <div className="text-text-primary">
                    {formatNumber(selected.avgDailyDemand * 7)} {selected.uom}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    Reorder Point
                  </div>
                  <div className="text-text-primary">
                    {formatNumber(selected.avgDailyDemand * 14)} {selected.uom}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                DOS trend · last 30 days
              </div>
              <div className="h-40 border border-border-subtle rounded-lg p-2 bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dosTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E5E9F2"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      interval={5}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="dos"
                      stroke="#0F766E"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Recent inventory updates
              </div>
              <Timeline events={inventoryTimeline} />
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Active POs
              </div>
              {activePOs.length === 0 ? (
                <div className="text-sm text-text-tertiary">
                  No open purchase orders for this material.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-tertiary uppercase">
                      <th className="text-left py-1">PO #</th>
                      <th className="text-right py-1">Qty</th>
                      <th className="text-left py-1 pl-3">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePOs.map((po) => {
                      const li = po.lineItems.find(
                        (l) => l.materialCode === selected.materialCode
                      );
                      return (
                        <tr key={po.id} className="border-t border-border-subtle">
                          <td className="py-2 font-mono text-text-primary">
                            {po.poNumber}
                          </td>
                          <td className="py-2 text-right text-text-primary">
                            {li ? formatNumber(li.quantity) : '—'} {li?.uom ?? ''}
                          </td>
                          <td className="py-2 pl-3 text-text-secondary">
                            {po.confirmedDeliveryDate ||
                              po.requestedDeliveryDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerInventory;
