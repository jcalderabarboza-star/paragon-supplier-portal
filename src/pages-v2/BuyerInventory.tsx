import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import { useToast } from '../hooks/useToast';
import {
  useInventory,
  useSuppliers,
  usePurchaseOrders,
} from '../services/query/hooks';
import { formatNumber } from '../lib/format';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { CHART_SERIES, CHART_GRID, CHART_AXIS } from '../lib/chartPalette';
import { InventoryRecord } from '../types/supplier.types';
import { POStatus } from '../services/data/types';

type GroupTab = 'all' | 'critical' | 'warning' | 'healthy' | 'excess';

type BrandKey = 'Wardah' | 'Emina' | 'Make Over' | 'Instaperfect' | 'Kahf';
const BRANDS: BrandKey[] = ['Wardah', 'Emina', 'Make Over', 'Instaperfect', 'Kahf'];

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
): {
  tab: GroupTab;
  label: string;
  variant: 'danger' | 'warning' | 'success' | 'info';
  cellCls: string;
} => {
  if (dos < 14)
    return {
      tab: 'critical',
      label: `${dos}d`,
      variant: 'danger',
      cellCls: 'bg-danger-soft text-danger',
    };
  if (dos < 30)
    return {
      tab: 'warning',
      label: `${dos}d`,
      variant: 'warning',
      cellCls: 'bg-warning-soft text-warning-hover',
    };
  if (dos <= 60)
    return {
      tab: 'healthy',
      label: `${dos}d`,
      variant: 'success',
      cellCls: 'bg-success-soft text-success',
    };
  return {
    tab: 'excess',
    label: `${dos}d`,
    variant: 'info',
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
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const INVENTORY_CRUMB = [
    t('buyerInventory.crumb.transact'),
    t('buyerInventory.crumb.inventory'),
  ];
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
        title={t('buyerInventory.empty.title')}
        subtitle={t('buyerInventory.empty.subtitle')}
        message={t('buyerInventory.empty.message')}
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
      title: t('buyerInventory.toast.syncQueued.title'),
      description: t('buyerInventory.toast.syncQueued.desc', {
        time: new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }),
    });
  };

  const handleExport = () => {
    toast({
      variant: 'info',
      title: t('buyerInventory.toast.exportStarted.title'),
      description: t('buyerInventory.toast.exportStarted.desc'),
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
          title: t('buyerInventory.timeline.stockUpdate.title', {
            source: selected.dataSource,
          }),
          timestamp: formatRelativeTime(selected.lastUpdated),
          status: 'completed',
          description: t('buyerInventory.timeline.stockUpdate.desc', {
            qty: formatNumber(selected.qtyOnHand),
            uom: selected.uom,
          }),
        },
        {
          id: 't2',
          title: t('buyerInventory.timeline.reservation.title'),
          timestamp: '1d ago',
          status: 'completed',
          description: t('buyerInventory.timeline.reservation.desc', {
            qty: formatNumber(selected.qtyReserved),
            uom: selected.uom,
          }),
        },
        {
          id: 't3',
          title: t('buyerInventory.timeline.reconciliation.title'),
          timestamp: '3d ago',
          status: 'completed',
          description: t('buyerInventory.timeline.reconciliation.desc'),
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
        title={t('buyerInventory.header.title')}
        subtitle={t('buyerInventory.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('buyerInventory.action.export'),
                icon: FileSpreadsheet,
                onClick: handleExport,
              },
            ]}
            primary={{
              label: t('buyerInventory.action.syncNow'),
              icon: RefreshCw,
              onClick: handleSync,
            }}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {t(
          inventory.length === 1
            ? 'buyerInventory.meta.materials.one'
            : 'buyerInventory.meta.materials.other',
          { count: inventory.length, sync: lastSync },
        )}
      </PageMetaLine>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          eyebrow={t('buyerInventory.kpi.totalMaterials.eyebrow')}
          value={formatNumber(counts.all)}
          icon={Package}
          subtitle={t('buyerInventory.kpi.totalMaterials.subtitle')}
        />
        <KpiCard
          eyebrow={t('buyerInventory.kpi.critical.eyebrow')}
          value={
            <span className="text-danger">{formatNumber(counts.critical)}</span>
          }
          icon={AlertTriangle}
          subtitle={t('buyerInventory.kpi.critical.subtitle')}
        />
        <KpiCard
          eyebrow={t('buyerInventory.kpi.warning.eyebrow')}
          value={
            <span className="text-warning-hover">{formatNumber(counts.warning)}</span>
          }
          icon={AlertCircle}
          subtitle={t('buyerInventory.kpi.warning.subtitle')}
        />
        <KpiCard
          eyebrow={t('buyerInventory.kpi.avgDos.eyebrow')}
          value={t('buyerInventory.kpi.avgDos.value', { n: avgDos })}
          icon={Gauge}
          subtitle={t('buyerInventory.kpi.avgDos.subtitle')}
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: t('buyerInventory.tab.all'), count: counts.all },
          {
            id: 'critical',
            label: t('buyerInventory.tab.critical'),
            count: counts.critical,
          },
          {
            id: 'warning',
            label: t('buyerInventory.tab.warning'),
            count: counts.warning,
          },
          {
            id: 'healthy',
            label: t('buyerInventory.tab.healthy'),
            count: counts.healthy,
          },
          {
            id: 'excess',
            label: t('buyerInventory.tab.excess'),
            count: counts.excess,
          },
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
            placeholder={t('buyerInventory.search.placeholder')}
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
              {t('buyerInventory.heatmap.eyebrow')}
            </div>
            <h3 className="text-section text-text-primary">
              {t('buyerInventory.heatmap.title')}
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
                  {t('buyerInventory.heatmap.col.category')}
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
                    {cl(cat)}
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
                          <Data>{avg > 0 ? `${avg}d` : '—'}</Data>
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
            <TableHeaderCell>{t('buyerInventory.table.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerInventory.table.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerInventory.table.col.category')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('buyerInventory.table.col.onHand')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('buyerInventory.table.col.available')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerInventory.table.col.dos')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerInventory.table.col.lastUpdated')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerInventory.table.col.source')}</TableHeaderCell>
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
                    <Data as="div" className="text-sm text-text-primary">
                      {it.materialCode}
                    </Data>
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
                      {sup?.category ? cl(sup.category) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-text-primary">
                      <Data>{formatNumber(it.qtyOnHand)}</Data>
                    </div>
                    <div className="text-xs text-text-tertiary">{it.uom}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-text-primary">
                      <Data>{formatNumber(it.qtyAvailable)}</Data>
                    </div>
                    <div className="text-xs text-text-tertiary">{it.uom}</div>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={bucket.variant}>
                      {bucket.label}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      <Data>{formatRelativeTime(it.lastUpdated)}</Data>
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
                  {t('buyerInventory.table.empty')}
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
                {t('buyerInventory.panel.keyFacts')}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.material')}</div>
                  <Data as="div" className="text-text-primary">
                    {selected.materialCode}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.category')}</div>
                  <div className="text-text-primary">
                    {selectedSupplier?.category ? cl(selectedSupplier.category) : '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.description')}</div>
                  <div className="text-text-primary">
                    {selected.materialDescription}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.supplier')}</div>
                  <div className="text-text-primary">
                    {selected.supplierName}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.otif')}</div>
                  <div className="text-text-primary">
                    <Data>
                      {selectedSupplier
                        ? `${selectedSupplier.otif}%`
                        : '—'}
                    </Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.leadTime')}</div>
                  <div className="text-text-primary"><Data>14 days</Data></div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('buyerInventory.panel.moq')}</div>
                  <div className="text-text-primary">
                    <Data>
                      {formatNumber(Math.max(500, selected.avgDailyDemand * 7))}{' '}
                      {selected.uom}
                    </Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    {t('buyerInventory.panel.safetyStock')}
                  </div>
                  <div className="text-text-primary">
                    <Data>
                      {formatNumber(selected.avgDailyDemand * 7)} {selected.uom}
                    </Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    {t('buyerInventory.panel.reorderPoint')}
                  </div>
                  <div className="text-text-primary">
                    <Data>
                      {formatNumber(selected.avgDailyDemand * 14)} {selected.uom}
                    </Data>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('buyerInventory.panel.dosTrend')}
              </div>
              <div className="h-40 border border-border-subtle rounded-lg p-2 bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dosTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_GRID}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: CHART_AXIS }}
                      interval={5}
                    />
                    <YAxis tick={{ fontSize: 10, fill: CHART_AXIS }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="dos"
                      stroke={CHART_SERIES[0]}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('buyerInventory.panel.recentUpdates')}
              </div>
              <Timeline events={inventoryTimeline} />
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('buyerInventory.panel.activePos')}
              </div>
              {activePOs.length === 0 ? (
                <div className="text-sm text-text-tertiary">
                  {t('buyerInventory.panel.noActivePos')}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-tertiary uppercase">
                      <th className="text-left py-1">{t('buyerInventory.panel.col.po')}</th>
                      <th className="text-right py-1">{t('buyerInventory.panel.col.qty')}</th>
                      <th className="text-left py-1 pl-3">{t('buyerInventory.panel.col.eta')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePOs.map((po) => {
                      const li = po.lineItems.find(
                        (l) => l.materialCode === selected.materialCode
                      );
                      return (
                        <tr key={po.id} className="border-t border-border-subtle">
                          <td className="py-2 text-text-primary">
                            <Data>{po.poNumber}</Data>
                          </td>
                          <td className="py-2 text-right text-text-primary">
                            <Data>
                              {li ? formatNumber(li.quantity) : '—'} {li?.uom ?? ''}
                            </Data>
                          </td>
                          <td className="py-2 pl-3 text-text-secondary">
                            <Data>
                              {po.confirmedDeliveryDate ||
                                po.requestedDeliveryDate}
                            </Data>
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
