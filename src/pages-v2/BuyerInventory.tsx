import React, { useCallback, useMemo, useState } from 'react';
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
// D-CENSUS-8 — the recharts import is gone with the synthetic DOS trend chart it
// drew. This page now renders no chart, which is the honest state: it has no
// time-series data, only current positions.
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import ListPage from '../components/ui-v2/ListPage';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import LoadingState from '../components/ui-v2/LoadingState';
import { useDeepLinkedSelection } from '../lib/recordDeepLink';
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
import { InventoryRecord } from '../types/supplier.types';
import { POStatus } from '../services/data/types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import SectionHeading from '../components/ui-v2/SectionHeading';
import { Field, FieldList } from '../components/ui-v2/Field';

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
  // ⚠️ THE FIFTH PIN, RETIRED. `inventory` anchors on its OWN declared as-of
  // (max `lastUpdated` = 2025-04-06, a year behind the cluster), so this page
  // is where the largest shift in the tree becomes visible: rows that read as
  // a formatted 2025 date now read as recent relative time.
  const now = new Date(DECLARED_PRESENT).getTime();
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
      cellCls: 'bg-critical-soft text-critical',
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

const BuyerInventory: React.FC = () => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const INVENTORY_CRUMB = [
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
  // ── DEEP LINK (?id=) ──────────────────────────────────────────────────────
  // A dashboard window's row links here. The filters are WIDENED first: landing
  // on a filtered list that excludes the very record the reader clicked is the
  // shape of a broken link (`Glossary.tsx`'s rule). An unknown id opens nothing
  // and says nothing — the list is still the right answer.
  useDeepLinkedSelection(
    inventory,
    (r, id) => r.id === id || r.materialCode === id,
    useCallback((r: InventoryRecord) => {
      setSelectedBrands([]);
      setSelectedId(r.id);
    }, []),
  );

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
      variant: 'info',
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

  const heatColumns: Column<string>[] = [
    {
      id: 'category',
      header: t('buyerInventory.heatmap.col.category'),
      kind: 'text',
      cell: (cat) => cl(cat),
    },
    ...BRANDS.map((b): Column<string> => ({
      id: b,
      header: b,
      kind: 'status',
      cell: (cat) => {
        const cell = heatmap[cat]?.[b];
        const avg = cell && cell.count > 0 ? Math.round(cell.dos / cell.count) : 0;
        return (
          <div className={`rounded-md px-3 py-2 ${heatColor(avg)}`}>
            <Data>{avg > 0 ? `${avg}d` : '—'}</Data>
          </div>
        );
      },
    })),
  ];

  const columns: Column<InventoryRecord>[] = [
    {
      id: 'material',
      header: t('buyerInventory.table.col.material'),
      kind: 'id',
      cell: (it) => (
        <>
          <Data as="div">{it.materialCode}</Data>
          <CellSub className="truncate whitespace-nowrap max-w-[260px]">{it.materialDescription}</CellSub>
        </>
      ),
    },
    {
      id: 'supplier',
      header: t('buyerInventory.table.col.supplier'),
      kind: 'text',
      cell: (it) => {
        const sup = supplierById.get(it.supplierId);
        return (
          <>
            {it.supplierName}
            <CellSub>{sup ? COUNTRY_FLAG[sup.country] ?? sup.country : '—'}</CellSub>
          </>
        );
      },
    },
    {
      id: 'category',
      header: t('buyerInventory.table.col.category'),
      kind: 'text',
      cell: (it) => {
        const sup = supplierById.get(it.supplierId);
        return sup?.category ? cl(sup.category) : '—';
      },
    },
    {
      id: 'onHand',
      header: t('buyerInventory.table.col.onHand'),
      kind: 'number',
      cell: (it) => (
        <>
          <div>
            <Data>{formatNumber(it.qtyOnHand)}</Data>
          </div>
          <CellSub>{it.uom}</CellSub>
        </>
      ),
    },
    {
      id: 'available',
      header: t('buyerInventory.table.col.available'),
      kind: 'number',
      cell: (it) => (
        <>
          <div>
            <Data>{formatNumber(it.qtyAvailable)}</Data>
          </div>
          <CellSub>{it.uom}</CellSub>
        </>
      ),
    },
    {
      id: 'dos',
      header: t('buyerInventory.table.col.dos'),
      kind: 'status',
      cell: (it) => {
        const bucket = dosBucket(it.daysOfSupply);
        return <StatusPill variant={bucket.variant}>{bucket.label}</StatusPill>;
      },
    },
    {
      id: 'lastUpdated',
      header: t('buyerInventory.table.col.lastUpdated'),
      kind: 'date',
      cell: (it) => <Data>{formatRelativeTime(it.lastUpdated)}</Data>,
    },
    {
      id: 'source',
      header: t('buyerInventory.table.col.source'),
      kind: 'text',
      cell: (it) => {
        const Icon = SourceIcon(it.dataSource);
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon size={14} />
            {it.dataSource}
          </span>
        );
      },
    },
    {
      id: 'open',
      header: '',
      kind: 'actions',
      cell: () => <ChevronRight size={16} className="text-text-tertiary inline" />,
    },
  ];

  const poColumns: Column<(typeof activePOs)[number]>[] = [
    {
      id: 'po',
      header: t('buyerInventory.panel.col.po'),
      kind: 'id',
      cell: (po) => <Data>{po.poNumber}</Data>,
    },
    {
      id: 'qty',
      header: t('buyerInventory.panel.col.qty'),
      kind: 'number',
      cell: (po) => {
        const li = po.lineItems.find((l) => l.materialCode === selected?.materialCode);
        return (
          <Data>
            {li ? formatNumber(li.quantity) : '—'} {li?.uom ?? ''}
          </Data>
        );
      },
    },
    {
      id: 'eta',
      header: t('buyerInventory.panel.col.eta'),
      kind: 'date',
      cell: (po) => <Data>{po.confirmedDeliveryDate || po.requestedDeliveryDate}</Data>,
    },
  ];

  return (
    <ListPage
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
      meta={
        <>
          {t(
            inventory.length === 1
              ? 'buyerInventory.meta.materials.one'
              : 'buyerInventory.meta.materials.other',
            { count: inventory.length, sync: lastSync },
          )}
          {/* D-CENSUS-8 — the loudest unmarked page on the portal: it claimed
              "Real-time", "EDI 846" and "automatically notified" over a frozen array.
              Those claims are retracted in this batch; this states what the feed is.
              NOTE INVENTORY-REFERENT-01 (filed): the `inventory` capability is backed
              to `inventoryDeclaration` while this page reads `mockInventory`, so the
              verb axis here describes a store this page does not render. */}
          <ProvenanceMarker capability="inventory" className="ml-3 align-middle" />
        </>
      }
      kpis={
        <>
          <KpiCard
            eyebrow={t('buyerInventory.kpi.totalMaterials.eyebrow')}
            value={formatNumber(counts.all)}
            icon={Package}
            subtitle={t('buyerInventory.kpi.totalMaterials.subtitle')}
          />
          <KpiCard
            eyebrow={t('buyerInventory.kpi.critical.eyebrow')}
            value={
              <span className="text-critical">{formatNumber(counts.critical)}</span>
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
        </>
      }
      tabs={
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
        />
      }
      filters={
        <FilterChipsBar<BrandKey>
          options={BRANDS.map((b) => ({ id: b, label: b }))}
          value={selectedBrands}
          onChange={toggleBrand}
          multiSelect
        />
      }
      search={
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('buyerInventory.search.placeholder')}
        />
      }
    >
      {/* DOS Heatmap */}
      <section className="border border-border-subtle rounded-lg bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-label text-text-tertiary uppercase mb-1">
              {t('buyerInventory.heatmap.eyebrow')}
            </div>
            <SectionHeading as="h3">
              {t('buyerInventory.heatmap.title')}
            </SectionHeading>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-critical-soft" />
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
          <DataTable
            columns={heatColumns}
            rows={categories}
            rowKey={(cat) => cat}
            density="compact"
            card={false}
          />
        </div>
      </section>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(it) => it.id}
        onRowClick={(it) => setSelectedId(it.id)}
        empty={t('buyerInventory.table.empty')}
      />

      <SidePanel
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.materialCode : ''}
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <section>
              <SectionHeading level="group" className="mb-2">
                {t('buyerInventory.panel.keyFacts')}
              </SectionHeading>
              <FieldList columns={2}>
                <Field label={t('buyerInventory.panel.material')} kind="id">
                  {selected.materialCode}
                </Field>
                <Field label={t('buyerInventory.panel.category')}>
                  {selectedSupplier?.category ? cl(selectedSupplier.category) : '—'}
                </Field>
                <Field label={t('buyerInventory.panel.description')} wide>
                  {selected.materialDescription}
                </Field>
                <Field label={t('buyerInventory.panel.supplier')}>
                  {selected.supplierName}
                </Field>
                <Field label={t('buyerInventory.panel.otif')} kind="number">
                  {selectedSupplier ? `${selectedSupplier.otif}%` : '—'}
                </Field>
                <Field label={t('buyerInventory.panel.leadTime')} kind="number">
                  14 days
                </Field>
                <Field label={t('buyerInventory.panel.moq')} kind="number">
                  {formatNumber(Math.max(500, selected.avgDailyDemand * 7))}{' '}
                  {selected.uom}
                </Field>
                {/* ⚠️ **THESE TWO ARE DISPLAY ARITHMETIC AND THE COPY NOW SAYS
                    SO (operator ruling Q1, call-off step 1).** Measured: the
                    only occurrences of `reorderPoint` / `safetyStock` anywhere
                    in `src/` are these two labels and these two render sites.
                    There is no stored field, no lead time, no per-material
                    policy and no trigger — the numbers are `avgDailyDemand × 7`
                    and `× 14`, two multipliers written here.

                    A figure captioned "Reorder Point" on a procurement screen
                    reads as a planning parameter somebody set and something
                    consults. Nothing consults these. **SOMO owns the reorder
                    point** (Q1) — it holds the lead times, the safety-stock
                    policy and the consumption signal, and this portal holds
                    none of the three. The caption is the whole fix: no
                    behaviour changes, and the number stops claiming to be a
                    parameter. */}
                <Field
                  label={t('buyerInventory.panel.safetyStock')}
                  kind="number"
                  sub={t('buyerInventory.panel.safetyStockBasis')}
                >
                  {formatNumber(selected.avgDailyDemand * 7)} {selected.uom}
                </Field>
                <Field
                  label={t('buyerInventory.panel.reorderPoint')}
                  kind="number"
                  sub={t('buyerInventory.panel.reorderPointBasis')}
                >
                  {formatNumber(selected.avgDailyDemand * 14)} {selected.uom}
                </Field>
              </FieldList>
            </section>

            {/* D-CENSUS-8 — the 30-day DOS trend chart is DELETED, not marked.
                It plotted `Math.sin(i * 0.6) + Math.cos(i * 0.3)` noise off a
                hardcoded `new Date('2026-05-20')`, ending at the one real value.
                A trend line is a CLAIM: a reader draws a conclusion from its slope
                — depleting, recovering, stable — and every one of those conclusions
                was manufactured. A "Sample" pill elsewhere on the page does not
                travel with a curve (DISCLOSURE-TRAVELS-WITH-THE-VALUE-01), so
                marking it would have left the false inference intact. The current
                DOS figure is real fixture data and is still shown above. */}

            <section>
              <SectionHeading level="group" className="mb-2">
                {t('buyerInventory.panel.recentUpdates')}
              </SectionHeading>
              <Timeline events={inventoryTimeline} />
            </section>

            <section>
              <SectionHeading level="group" className="mb-2">
                {t('buyerInventory.panel.activePos')}
              </SectionHeading>
              {activePOs.length === 0 ? (
                <div className="text-sm text-text-tertiary">
                  {t('buyerInventory.panel.noActivePos')}
                </div>
              ) : (
                <DataTable
                  columns={poColumns}
                  rows={activePOs}
                  rowKey={(po) => po.id}
                  density="compact"
                  card={false}
                />
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </ListPage>
  );
};

export default BuyerInventory;
