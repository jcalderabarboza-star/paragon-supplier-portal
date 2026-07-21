import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Info, ChevronRight, ExternalLink } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import LoadingState from '../components/ui-v2/LoadingState';
import EmptyState from '../components/ui-v2/EmptyState';
import SubTabs from '../components/ui-v2/SubTabs';
import SearchBar from '../components/ui-v2/SearchBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import StatusPill from '../components/ui-v2/StatusPill';
import TargetBar from '../components/ui-v2/TargetBar';
import Data from '../components/ui-v2/Data';
import SidePanel from '../components/ui-v2/SidePanel';
import ReleaseCalendar from '../components/delivery/ReleaseCalendar';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
import {
  toAgreementItemRows,
  filterAndRankRows,
  bucketCounts,
  type AgreementItemBucket,
  type AgreementItemCounts,
} from '../services/delivery';
import type { ReleaseType } from '../services/delivery';
import { SDC_SIMULATED_NOW } from '../services/sdc';
import { formatDate, formatNumber } from '../lib/format';

// The cross-contract ROLL-UP, redesigned for scale: one DENSE row per agreement-
// ITEM (the grain a buyer scans by — fulfillment/late-ness/policy/material are all
// per-item), sorted EXCEPTION-FIRST (missed → late → pending → on-track → draft),
// filterable by state tab / supplier / release-type / search. This is the SCAN
// surface ("overview scans, contract acts"): every row deep-links to its contract's
// own Delivery Agreements tab, where the release ACTION lives (#108). It stays
// READ-ONLY + SIMULATED — no release control renders here.

type Tab = AgreementItemBucket | 'all';

// Bucket → the quiet StatusPill tone for the row's worst-state chip.
const BUCKET_VARIANT: Record<AgreementItemBucket, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
  missed: 'danger',
  late: 'warning',
  pending: 'info',
  onTrack: 'success',
  draft: 'neutral',
};

const BuyerDeliveryAgreements: React.FC = () => {
  const { t } = useTranslation();
  const query = useDeliveryAgreements();
  const views = query.data ?? [];

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [releaseTypes, setReleaseTypes] = useState<ReleaseType[]>([]);
  const [selected, setSelected] = useState<{ agreementId: string; itemSeq: number } | null>(null);

  // Fold the derived views into dense rows (pure; honest by construction — the
  // exception counts can only surface statuses the view already carries).
  const rows = useMemo(() => toAgreementItemRows(views, SDC_SIMULATED_NOW), [views]);

  // Scope by everything EXCEPT the tab, so the tab badges reflect what a switch
  // would reveal under the current search/supplier/type filters.
  const scoped = useMemo(
    () => filterAndRankRows(rows, { tab: 'all', search, supplierIds, releaseTypes }),
    [rows, search, supplierIds, releaseTypes],
  );
  const counts = useMemo(() => bucketCounts(scoped), [scoped]);
  const visible = useMemo(
    () => filterAndRankRows(rows, { tab, search, supplierIds, releaseTypes }),
    [rows, tab, search, supplierIds, releaseTypes],
  );

  // Supplier chip options — unique across the roll-up, label-sorted.
  const supplierOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (!seen.has(r.supplierId)) seen.set(r.supplierId, r.supplierName ?? r.supplierId);
    return [...seen.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  // The selected row's underlying view + item (for the SidePanel calendar).
  const selectedView = selected ? views.find((v) => v.agreement.id === selected.agreementId) : undefined;
  const selectedItem = selectedView?.items.find((iv) => iv.item.lineSeq === selected?.itemSeq);

  if (query.isPending) return <LoadingState />;
  if (views.length === 0) {
    return (
      <EmptyState
        breadcrumb={[t('delivery.crumb.settle'), t('delivery.crumb.title')]}
        title={t('delivery.header.title')}
        subtitle={t('delivery.header.subtitle')}
        message={t('delivery.empty')}
      />
    );
  }

  const toggleSupplier = (id: string) =>
    setSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleType = (ty: ReleaseType) =>
    setReleaseTypes((prev) => (prev.includes(ty) ? prev.filter((x) => x !== ty) : [...prev, ty]));

  const tabOptions: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: t('delivery.rollup.tab.all'), count: counts.all },
    { id: 'missed', label: t('delivery.rollup.tab.missed'), count: counts.missed },
    { id: 'late', label: t('delivery.rollup.tab.late'), count: counts.late },
    { id: 'pending', label: t('delivery.rollup.tab.pending'), count: counts.pending },
    { id: 'onTrack', label: t('delivery.rollup.tab.onTrack'), count: counts.onTrack },
    { id: 'draft', label: t('delivery.rollup.tab.draft'), count: counts.draft },
  ];

  // Compact exceptions caption — exceptions first (missed/late/pending); a clean
  // row falls back to its delivered / to-release count. Honest, never inflated.
  const countsCaption = (c: AgreementItemCounts, bucket: AgreementItemBucket): string => {
    const parts: string[] = [];
    if (c.missed) parts.push(t('delivery.rollup.count.missed', { n: c.missed }));
    if (c.late) parts.push(t('delivery.rollup.count.late', { n: c.late }));
    if (c.pending) parts.push(t('delivery.rollup.count.pending', { n: c.pending }));
    if (parts.length === 0) {
      if (bucket === 'draft' && c.draft) parts.push(t('delivery.rollup.count.draft', { n: c.draft }));
      else if (c.fulfilled) parts.push(t('delivery.rollup.count.fulfilled', { n: c.fulfilled }));
    }
    return parts.join(' · ');
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('delivery.crumb.settle'), t('delivery.crumb.title')]}
        title={t('delivery.header.title')}
        subtitle={t('delivery.header.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>
          {t('delivery.meta.summary', { count: views.length, date: formatDate(SDC_SIMULATED_NOW) })}
        </span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* Honest framing — this OVERVIEW is read-only + simulated; releasing lives
          in each contract's own DA tab (the callout points there). */}
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('delivery.rollup.honestyTitle')}</strong>{' '}
          {t('delivery.rollup.honestyBody')} {t('delivery.rollup.hint')}
        </span>
      </div>

      <SubTabs<Tab> options={tabOptions} value={tab} onChange={setTab} className="mb-6" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[280px]">
          <SearchBar value={search} onChange={setSearch} placeholder={t('delivery.rollup.search')} />
        </div>
        <FilterChipsBar<ReleaseType>
          options={[
            { id: 'FRC', label: t('delivery.rollup.type.FRC') },
            { id: 'JIT', label: t('delivery.rollup.type.JIT') },
          ]}
          value={releaseTypes}
          onChange={toggleType}
          multiSelect
        />
      </div>

      {supplierOptions.length > 1 && (
        <div className="mb-4">
          <FilterChipsBar<string>
            options={supplierOptions}
            value={supplierIds}
            onChange={toggleSupplier}
            multiSelect
          />
        </div>
      )}

      <div className="border border-border-subtle rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('delivery.rollup.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.rollup.col.contract')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.rollup.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.rollup.col.released')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.rollup.col.nextDue')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.rollup.col.status')}</TableHeaderCell>
            <TableHeaderCell> </TableHeaderCell>
          </TableHeader>
          <tbody>
            {visible.map((r) => (
              <TableRow
                key={`${r.agreementId}-${r.itemSeq}`}
                className="cursor-pointer"
                onClick={() => setSelected({ agreementId: r.agreementId, itemSeq: r.itemSeq })}
              >
                <TableCell>
                  <div className="text-sm text-text-primary">{r.supplierName ?? r.supplierId}</div>
                </TableCell>
                <TableCell>
                  {/* Deep-link to the contract's own DA tab (where release lives).
                      stopPropagation so the link navigates without also opening
                      the quick-look panel. */}
                  <Link
                    to={`/buyer/contracts/${r.contractId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-action hover:underline"
                  >
                    <Data className="text-xs text-action">{r.contractId}</Data>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Data className="text-sm">{r.materialCode}</Data>
                    <StatusPill variant="neutral">{r.releaseType}</StatusPill>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="w-28">
                    <TargetBar pct={r.releasedPct} />
                    <div className="text-[10px] text-text-tertiary mt-1">
                      <Data>{Math.round(r.releasedPct)}%</Data>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {r.nextDue ? (
                    <div>
                      <Data className="text-sm">{formatDate(r.nextDue.date)}</Data>
                      <div className="text-[10px] text-text-tertiary uppercase">
                        {t(`delivery.rollup.due.${r.nextDue.kind}`)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill variant={BUCKET_VARIANT[r.bucket]}>
                    {t(`delivery.rollup.tab.${r.bucket}`)}
                  </StatusPill>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    {countsCaption(r.counts, r.bucket)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight size={16} className="text-text-tertiary inline" />
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-text-tertiary">
                  {t('delivery.rollup.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Quick-look drill — the item's READ-ONLY release calendar + a deep-link to
          the contract (where release lives). No release control here. */}
      <SidePanel
        open={!!selected && !!selectedItem}
        onClose={() => setSelected(null)}
        title={
          selectedItem && selectedView
            ? `${selectedItem.item.materialCode} · ${selectedView.supplierName ?? selectedView.agreement.supplierId}`
            : ''
        }
        footerActions={
          selectedView && (
            <Link
              to={`/buyer/contracts/${selectedView.agreement.contractId}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-action px-3 py-1.5 text-sm font-medium text-action hover:bg-action-soft transition-colors"
            >
              <ExternalLink size={14} />
              {t('delivery.rollup.openContract')}
            </Link>
          )
        }
      >
        {selectedItem && selectedView && (
          <div className="flex flex-col gap-5">
            <div className="text-xs text-text-tertiary flex flex-wrap gap-x-4 gap-y-1">
              <span>
                {t('delivery.agreement.contract')}:{' '}
                <Data className="text-xs">{selectedView.agreement.contractId}</Data>
              </span>
              <span>
                {t('delivery.agreement.sapNumber')}:{' '}
                <Data className="text-xs">{selectedView.agreement.sapAgreementNumber ?? '—'}</Data>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">{t('delivery.kpi.agreed')}</div>
                <Data className="text-sm">
                  {formatNumber(selectedItem.ledger.agreedTotalQty)} {selectedItem.item.uom}
                </Data>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">{t('delivery.kpi.released')}</div>
                <Data className="text-sm">
                  {formatNumber(selectedItem.ledger.releasedQty)} {selectedItem.item.uom}
                </Data>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">{t('delivery.kpi.delivered')}</div>
                <Data className="text-sm">
                  {formatNumber(selectedItem.ledger.deliveredQty)} {selectedItem.item.uom}
                </Data>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">{t('delivery.kpi.remaining')}</div>
                <Data className="text-sm">
                  {formatNumber(selectedItem.ledger.remainingQty)} {selectedItem.item.uom}
                </Data>
              </div>
            </div>

            <ReleaseCalendar iv={selectedItem} />
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerDeliveryAgreements;
