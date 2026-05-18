import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import { mockSuppliers } from '../data/mockSuppliers';
import {
  SupplierStatus,
  SupplierTier,
} from '../types/supplier.types';

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID', MY: 'MY', DE: 'DE', FR: 'FR', CN: 'CN', SG: 'SG', IN: 'IN',
};

const TIER_LABEL: Record<SupplierTier, string> = {
  [SupplierTier.WHATSAPP]: 'Tier 1 · WhatsApp',
  [SupplierTier.WEB]: 'Tier 2 · Web Portal',
  [SupplierTier.API]: 'Tier 3 · API/EDI',
};

const STATUS_VARIANT: Record<
  SupplierStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  [SupplierStatus.ACTIVE]: 'success',
  [SupplierStatus.ONBOARDING]: 'warning',
  [SupplierStatus.SUSPENDED]: 'danger',
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
  const [group, setGroup] = useState<GroupTab>('suppliers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const lastUpdated = useMemo(() => {
    const latest = mockSuppliers.reduce((acc, s) => {
      return s.lastActivityDate > acc ? s.lastActivityDate : acc;
    }, mockSuppliers[0]?.lastActivityDate ?? '');
    return latest ? formatDate(latest) : '';
  }, []);

  const counts = useMemo(() => {
    const active = mockSuppliers.filter(
      (s) => s.status === SupplierStatus.ACTIVE,
    ).length;
    const inactive = mockSuppliers.length - active;
    return { active, inactive, total: mockSuppliers.length };
  }, []);

  const filtered = useMemo(() => {
    return mockSuppliers.filter((s) => {
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
  }, [statusFilter, search]);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['ACQUIRE', 'SUPPLIER DIRECTORY']}
        title="Supplier Directory"
        subtitle="Manage your global supplier network across 12 countries."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Bulk upload', icon: Upload },
              { label: 'Bulk download', icon: Download },
              { label: 'Export', icon: FileSpreadsheet },
            ]}
            primary={{ label: 'Invite supplier', icon: UserPlus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {counts.total} records · last updated {lastUpdated}
      </PageMetaLine>

      <SubTabs
        options={[
          { id: 'suppliers', label: 'Suppliers', count: counts.total },
          { id: 'invitations', label: 'Pending Invitations', count: 3 },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <FilterChipsBar
          options={[
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'inactive', label: 'Inactive', count: counts.inactive },
            { id: 'all', label: 'All', count: counts.total },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, SAP BP, country, or category…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Country</TableHeaderCell>
            <TableHeaderCell>Tier</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Compliance</TableHeaderCell>
            <TableHeaderCell className="text-right">OTIF</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
                  <div className="font-mono text-xs text-text-tertiary mt-0.5">
                    {s.sapBpNumber}
                  </div>
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
                    {s.category}
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
                  {s.otif}%
                </TableCell>
                <TableCell>
                  <StatusPill variant={STATUS_VARIANT[s.status]}>
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
                  No suppliers match the current filters.
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
