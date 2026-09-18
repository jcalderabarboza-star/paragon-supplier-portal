import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Download,
  FileSpreadsheet,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useSuppliers } from '../services/query/hooks';
import RecordRowLink from './widgets/RecordRowLink';
import PslStatusCell, {
  pslStandingOf,
  type PslFilter,
} from '../components/v2-features/PslStatusCell';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import {
  SupplierStatus,
  SupplierTier,
} from '../types/supplier.types';

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID', MY: 'MY', DE: 'DE', FR: 'FR', CN: 'CN', SG: 'SG', IN: 'IN',
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type GroupTab = 'suppliers' | 'invitations';
type StatusFilter = 'active' | 'inactive' | 'all';

// ⚠️ **THE PSL COLUMN READS AT `DECLARED_PRESENT`, NOT `new Date()`.**
// `BuyerContracts` established the pin and states the reason: the fixtures are
// anchored onto this instant, so a page that read the wall clock would render
// labels that decay on a calendar day with no commit involved — and CI runs
// this suite daily at 00:17 UTC with nothing changed, which is exactly the run
// that would catch it going false. The listing corpus is an anchored family
// (`FAMILY_ANCHORS.psl`), so it is pinned the same way.
const TODAY = DECLARED_PRESENT;

const BuyerSuppliers: React.FC = () => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const suppliersQuery = useSuppliers();
  const suppliers = suppliersQuery.data?.items ?? [];
  const [group, setGroup] = useState<GroupTab>('suppliers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [pslFilter, setPslFilter] = useState<PslFilter>('any');

  const SUPPLIERS_CRUMB = [
    t('buyerSuppliers.crumb.acquire'),
    t('buyerSuppliers.crumb.directory'),
  ];

  // Connectivity-tier display labels (WhatsApp/Web Portal/API are proper
  // nouns/protocols; only the "Tier N" word localizes).
  const TIER_LABEL: Record<SupplierTier, string> = {
    [SupplierTier.WHATSAPP]: t('buyerSuppliers.tier.whatsapp'),
    [SupplierTier.WEB]: t('buyerSuppliers.tier.web'),
    [SupplierTier.API]: t('buyerSuppliers.tier.api'),
  };

  const lastUpdated = useMemo(() => {
    const latest = suppliers.reduce((acc, s) => {
      return s.lastActivityDate > acc ? s.lastActivityDate : acc;
    }, suppliers[0]?.lastActivityDate ?? '');
    return latest ? formatDate(latest) : '';
  }, [suppliers]);

  const counts = useMemo(() => {
    const active = suppliers.filter(
      (s) => s.status === SupplierStatus.ACTIVE,
    ).length;
    const inactive = suppliers.length - active;
    return { active, inactive, total: suppliers.length };
  }, [suppliers]);

  // One standing per supplier, computed once. `pslStandingOf` is the pure seam
  // (`pslSourcingSeam.ts`) — no hook, no query, no store — so the Directory and
  // a future policy gate answer through the SAME function rather than two that
  // agree today.
  const pslBySupplier = useMemo(
    () => new Map(suppliers.map((s) => [s.id, pslStandingOf(s.id, TODAY)])),
    [suppliers],
  );

  const pslCounts = useMemo(() => {
    let inForce = 0;
    let lapsed = 0;
    let none = 0;
    for (const s of suppliers) {
      const kind = pslBySupplier.get(s.id)?.kind;
      if (kind === 'IN_FORCE') inForce += 1;
      else if (kind === 'LAPSED') lapsed += 1;
      else none += 1;
    }
    return { inForce, lapsed, none };
  }, [suppliers, pslBySupplier]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === 'active' && s.status !== SupplierStatus.ACTIVE)
        return false;
      if (statusFilter === 'inactive' && s.status === SupplierStatus.ACTIVE)
        return false;
      if (pslFilter !== 'any' && pslBySupplier.get(s.id)?.kind !== pslFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${s.name} ${s.sapBpNumber} ${s.country} ${s.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, statusFilter, search, pslFilter, pslBySupplier]);

  if (suppliersQuery.isPending)
    return <LoadingState breadcrumb={SUPPLIERS_CRUMB} />;
  if (suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={SUPPLIERS_CRUMB}
        error={suppliersQuery.error}
        onRetry={() => suppliersQuery.refetch()}
      />
    );
  if (suppliers.length === 0)
    return (
      <EmptyState
        breadcrumb={SUPPLIERS_CRUMB}
        title={t('buyerSuppliers.empty.title')}
        subtitle={t('buyerSuppliers.empty.subtitle')}
        message={t('buyerSuppliers.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SUPPLIERS_CRUMB}
        title={t('buyerSuppliers.header.title')}
        subtitle={t('buyerSuppliers.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              { label: t('buyerSuppliers.actions.bulkUpload'), icon: Upload },
              { label: t('buyerSuppliers.actions.bulkDownload'), icon: Download },
              { label: t('buyerSuppliers.actions.export'), icon: FileSpreadsheet },
            ]}
            primary={{ label: t('buyerSuppliers.actions.invite'), icon: UserPlus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {counts.total === 1
          ? t('buyerSuppliers.meta.records.one', { count: counts.total })
          : t('buyerSuppliers.meta.records.other', { count: counts.total })}{' '}
        · {t('buyerSuppliers.meta.lastUpdated')} <Data>{lastUpdated}</Data>
        {/* D-CENSUS-8 — supplier master carried NO marker while the transactional
            lanes all wore one, so the least-real surface read as the most
            trustworthy. `suppliers` is null-backed → feed axis only, no verb axis. */}
        <ProvenanceMarker capability="suppliers" className="ml-3 align-middle" />
      </PageMetaLine>

      <SubTabs
        options={[
          {
            id: 'suppliers',
            label: t('buyerSuppliers.tab.suppliers'),
            count: counts.total,
          },
          {
            id: 'invitations',
            label: t('buyerSuppliers.tab.invitations'),
            count: 3,
          },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <FilterChipsBar
          options={[
            {
              id: 'active',
              label: t('buyerSuppliers.filter.active'),
              count: counts.active,
            },
            {
              id: 'inactive',
              label: t('buyerSuppliers.filter.inactive'),
              count: counts.inactive,
            },
            { id: 'all', label: t('buyerSuppliers.filter.all'), count: counts.total },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {/* A SECOND chip bar rather than more options on the first: the two
            narrow on DIFFERENT axes (roster status vs PSL standing) and one
            radiogroup would make them mutually exclusive, which is not what
            either means. */}
        <FilterChipsBar
          options={[
            { id: 'any', label: t('psl.filter.any'), count: counts.total },
            { id: 'IN_FORCE', label: t('psl.filter.inForce'), count: pslCounts.inForce },
            { id: 'LAPSED', label: t('psl.filter.lapsed'), count: pslCounts.lapsed },
            { id: 'NOT_LISTED', label: t('psl.filter.none'), count: pslCounts.none },
          ]}
          value={pslFilter}
          onChange={setPslFilter}
        />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('buyerSuppliers.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('buyerSuppliers.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerSuppliers.col.country')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerSuppliers.col.tier')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerSuppliers.col.category')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerSuppliers.col.compliance')}</TableHeaderCell>
            <TableHeaderCell>{t('psl.col.header')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('buyerSuppliers.col.otif')}
            </TableHeaderCell>
            <TableHeaderCell>{t('buyerSuppliers.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('buyerSuppliers.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="relative cursor-pointer">
                <TableCell>
                  {/* ⚠️ A REAL ANCHOR, NOT A `<tr onClick>`. This row carried
                      `onClick={() => navigate(...)}`, which is invisible to the
                      keyboard, to "open in a new tab" and to a screen reader's
                      link list — `RecordRowLink`'s own header names that defect
                      and the Directory was still carrying it. `TableRow` gains
                      `relative` because the anchor stretches over the row; that
                      is the component's one stated obligation on its caller. */}
                  <div className="font-semibold text-text-primary">
                    <RecordRowLink
                      path="/buyer/suppliers"
                      href={`/buyer/suppliers/${s.id}`}
                      id={s.id}
                      label={s.name}
                    />
                  </div>
                  <Data as="div" className="text-xs text-text-tertiary mt-0.5">
                    {s.sapBpNumber}
                  </Data>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">
                    {COUNTRY_FLAG[s.country] ?? s.country} · {s.city}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">
                    {TIER_LABEL[s.tier]}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">
                    {cl(s.category)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {s.halalCertified && (
                      <StatusPill variant="success">Halal</StatusPill>
                    )}
                    {s.bpomRegistered && (
                      <StatusPill variant="info">BPOM</StatusPill>
                    )}
                    {!s.halalCertified && !s.bpomRegistered && (
                      <StatusPill variant="neutral">None</StatusPill>
                    )}
                  </div>
                </TableCell>
                {/* ⚠️ THE PSL CELL READS LISTING DATA, NEVER `s.halalCertified`.
                    The boolean beside it is a SECOND, coarser compliance
                    vocabulary (one flag per supplier for a supplier × material ×
                    clock fact); reading it here would hand the PSL column a
                    third one. Ruling 6: retire nothing, and do not join to it. */}
                <TableCell>
                  <PslStatusCell standing={pslBySupplier.get(s.id)!} />
                </TableCell>
                <TableCell className="text-right font-semibold text-text-primary">
                  <Data>{s.otif}%</Data>
                </TableCell>
                <TableCell>
                  <StatusPill variant={statusTone(s.status)}>
                    {s.status}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight
                    size={16}
                    className="text-text-tertiary inline-block"
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('buyerSuppliers.table.noMatch')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

export default BuyerSuppliers;
