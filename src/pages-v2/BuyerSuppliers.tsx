import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const BuyerSuppliers: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const suppliersQuery = useSuppliers();
  const suppliers = suppliersQuery.data?.items ?? [];
  const [group, setGroup] = useState<GroupTab>('suppliers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === 'active' && s.status !== SupplierStatus.ACTIVE)
        return false;
      if (statusFilter === 'inactive' && s.status === SupplierStatus.ACTIVE)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${s.name} ${s.sapBpNumber} ${s.country} ${s.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, statusFilter, search]);

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
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => navigate(`/buyer/suppliers/${s.id}`)}
              >
                <TableCell>
                  <div className="font-semibold text-text-primary">
                    {s.name}
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
                  colSpan={8}
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
