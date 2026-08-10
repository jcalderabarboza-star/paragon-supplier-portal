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
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Data from '../components/ui-v2/Data';
import { useTranslation, Trans } from 'react-i18next';
import { statusLabelKey } from '../lib/statusLabel';
import { enumLabelKey } from '../lib/priorityLabel';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { StockStatus } from '../types/supplier.types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useInventory } from '../services/query/hooks';

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
        ? 'text-warning-hover'
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
      <Data className={`text-xs font-semibold min-w-[28px] text-right ${textClass}`}>
        {days}d
      </Data>
    </div>
  );
};

// Filter-chip `id`s stay canonical StockStatus values (data); the visible label
// resolves through the SAME central maps the stock-status StatusPill uses, so the
// chip reads byte-identical to the pill (Critical/Low → priorityLabel enum map,
// Normal/Excess → statusLabel). 'All' is page-specific vocab.
const STATUS_FILTER_IDS: StatusFilter[] = [
  'All',
  StockStatus.CRITICAL,
  StockStatus.LOW,
  StockStatus.NORMAL,
  StockStatus.EXCESS,
];

const SupplierInventory: React.FC = () => {
  const { t } = useTranslation();
  const INVENTORY_CRUMB = [
    t('supplierInventory.crumb.transact'),
    t('supplierInventory.crumb.myInventory'),
  ];
  const stockFilterLabel = (id: StatusFilter): string => {
    if (id === 'All') return t('supplierInventory.filter.all');
    const key = statusLabelKey(id) ?? enumLabelKey(id);
    return key ? t(key) : id;
  };
  const statusOptions = STATUS_FILTER_IDS.map((id) => ({
    id,
    label: stockFilterLabel(id),
  }));
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const inventoryQuery = useInventory();
  const myInventory = inventoryQuery.data?.items ?? [];
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');

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

  if (!supplierId) return <NoSupplierIdentity />;
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
  if (myInventory.length === 0)
    return (
      <EmptyState
        breadcrumb={INVENTORY_CRUMB}
        title={t('supplierInventory.empty.title')}
        subtitle={t('supplierInventory.empty.subtitle', {
          supplier:
            identity.supplierName ?? t('supplierInventory.empty.thisSupplier'),
        })}
        message={t('supplierInventory.empty.message')}
      />
    );

  const setKpiFilter = (s: StockStatus) =>
    setFilterStatus((prev) => (prev === s ? 'All' : s));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={INVENTORY_CRUMB}
        title={t('supplierInventory.header.title')}
        subtitle={t('supplierInventory.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('supplierInventory.action.exportEdi'),
                icon: Download,
                onClick: () =>
                  toast({
                    variant: 'success',
                    title: t('supplierInventory.toast.exportPreparing.title'),
                    description: t(
                      'supplierInventory.toast.exportPreparing.desc',
                    ),
                  }),
              },
            ]}
            primary={{
              label: t('supplierInventory.action.syncNow'),
              icon: RefreshCcw,
              onClick: () =>
                toast({
                  variant: 'info',
                  title: t('supplierInventory.toast.syncing.title'),
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {myInventory.length === 1
          ? t('supplierInventory.meta.materials.one', {
              count: myInventory.length,
            })
          : t('supplierInventory.meta.materials.other', {
              count: myInventory.length,
            })}{' '}
        · {t('supplierInventory.meta.lastSync')}{' '}
        <Data>{fmtDate(maxLastUpdated)}</Data>
        {/* D-CENSUS-8 — this page claimed "Live stock visibility" and told the supplier
            that Paragon "has been automatically notified" of critical stock. Nothing
            notifies anyone. Both retracted in this batch. The feed axis names the
            specific waiting state (a live supplier feed, F1). */}
        <ProvenanceMarker capability="inventory" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierInventory.kpi.critical.eyebrow')}
          value={counts.critical.toString()}
          subtitle={
            <span className="text-danger">
              {t('supplierInventory.kpi.pctOfMaterials', {
                pct: ((counts.critical / myInventory.length) * 100).toFixed(0),
              })}
            </span>
          }
          icon={AlertOctagon}
          onClick={() => setKpiFilter(StockStatus.CRITICAL)}
          active={filterStatus === StockStatus.CRITICAL}
        />
        <KpiCard
          eyebrow={t('supplierInventory.kpi.low.eyebrow')}
          value={counts.low.toString()}
          subtitle={
            <span className="text-warning-hover">
              {t('supplierInventory.kpi.pctOfMaterials', {
                pct: ((counts.low / myInventory.length) * 100).toFixed(0),
              })}
            </span>
          }
          icon={AlertTriangle}
          onClick={() => setKpiFilter(StockStatus.LOW)}
          active={filterStatus === StockStatus.LOW}
        />
        <KpiCard
          eyebrow={t('supplierInventory.kpi.normal.eyebrow')}
          value={counts.normal.toString()}
          subtitle={
            <span className="text-success">
              {t('supplierInventory.kpi.pctOfMaterials', {
                pct: ((counts.normal / myInventory.length) * 100).toFixed(0),
              })}
            </span>
          }
          icon={CheckCircle2}
          onClick={() => setKpiFilter(StockStatus.NORMAL)}
          active={filterStatus === StockStatus.NORMAL}
        />
        <KpiCard
          eyebrow={t('supplierInventory.kpi.excess.eyebrow')}
          value={counts.excess.toString()}
          subtitle={
            <span className="text-text-secondary">
              {t('supplierInventory.kpi.pctOfMaterials', {
                pct: ((counts.excess / myInventory.length) * 100).toFixed(0),
              })}
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
            <Trans
              i18nKey={
                counts.critical === 1
                  ? 'supplierInventory.banner.critical.one'
                  : 'supplierInventory.banner.critical.other'
              }
              values={{ count: counts.critical }}
              components={{ strong: <strong /> }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('supplierInventory.search.placeholder')}
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterChipsBar<StatusFilter>
            options={statusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
          />
          <span className="text-meta text-text-tertiary">
            {t('supplierInventory.filter.countOf', {
              shown: filtered.length,
              total: myInventory.length,
            })}
          </span>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierInventory.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInventory.col.supplier')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierInventory.col.onHand')}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierInventory.col.available')}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierInventory.col.inTransit')}
            </TableHeaderCell>
            <TableHeaderCell>{t('supplierInventory.col.uom')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInventory.col.daysSupply')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInventory.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInventory.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInventory.col.lastUpdated')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((row) => {
              const sourceVariant = SOURCE_VARIANT[row.dataSource] ?? 'neutral';
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Data as="div" className="text-xs font-semibold text-text-primary">
                      {row.materialCode}
                    </Data>
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
                    <Data>{fmt(row.qtyOnHand)}</Data>
                  </TableCell>
                  <TableCell className="text-right text-text-primary whitespace-nowrap">
                    <Data>{fmt(row.qtyAvailable)}</Data>
                  </TableCell>
                  <TableCell
                    className={`text-right whitespace-nowrap ${
                      row.qtyInTransit > 0 ? 'text-teal' : 'text-text-tertiary'
                    }`}
                  >
                    <Data>{row.qtyInTransit > 0 ? fmt(row.qtyInTransit) : '—'}</Data>
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
                    <Data>{fmtDate(row.lastUpdated)}</Data>
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
                  {t('supplierInventory.table.empty')}
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
            <strong className="text-info">
              {t('supplierInventory.info.dataSources.label')}
            </strong>{' '}
            {t('supplierInventory.info.dataSources.body')}
          </span>
        </div>
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
          <Mail size={14} className="text-warning-hover shrink-0 mt-0.5" />
          <span>
            <strong className="text-warning-hover">
              {t('supplierInventory.info.thresholds.label')}
            </strong>{' '}
            {t('supplierInventory.info.thresholds.body')}
          </span>
        </div>
      </div>
    </AppShellV2>
  );
};

export default SupplierInventory;
