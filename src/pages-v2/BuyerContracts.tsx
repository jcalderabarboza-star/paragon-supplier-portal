import React, { useMemo, useState } from 'react';
import {
  FileText,
  ScrollText,
  AlertTriangle,
  Wallet,
  Plus,
  FileSpreadsheet,
  ChevronRight,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
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
import ScoreBadge from '../components/ui-v2/ScoreBadge';
import {
  mockContracts,
  Contract,
  ContractStatus,
  ContractType,
} from '../data/mockContracts';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockObligations } from '../data/mockObligations';

type GroupTab =
  | 'all'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'renewed'
  | 'draft'
  | 'terminated';

const TYPE_OPTIONS: ContractType[] = [
  'Supply',
  'Service',
  'Framework',
  'NDA',
  'Quality',
  'Pricing',
];

const STATUS_VARIANT: Record<
  ContractStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Draft: 'neutral',
  Active: 'success',
  Expiring: 'warning',
  Expired: 'danger',
  Renewed: 'info',
  Terminated: 'neutral',
};

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};

const supplierById = new Map(mockSuppliers.map((s) => [s.id, s]));

const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMonth = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const expiryTone = (days: number): string => {
  if (days < 0) return 'text-danger font-semibold';
  if (days < 30) return 'text-danger font-semibold';
  if (days < 90) return 'text-warning font-semibold';
  return 'text-success';
};

const matchesGroup = (c: Contract, g: GroupTab): boolean => {
  if (g === 'all') return true;
  if (g === 'active') return c.status === 'Active';
  if (g === 'expiring')
    return c.status === 'Expiring' || (c.status === 'Active' && c.daysUntilExpiry <= 90 && c.daysUntilExpiry >= 0);
  if (g === 'expired') return c.status === 'Expired';
  if (g === 'renewed') return c.status === 'Renewed';
  if (g === 'draft') return c.status === 'Draft';
  if (g === 'terminated') return c.status === 'Terminated';
  return true;
};

const BuyerContracts: React.FC = () => {
  const [group, setGroup] = useState<GroupTab>('all');
  const [selectedTypes, setSelectedTypes] = useState<ContractType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );

  const contracts = mockContracts;

  const lastUpdated = useMemo(() => {
    return contracts.reduce(
      (acc, c) => (c.signedDate && c.signedDate > acc ? c.signedDate : acc),
      contracts[0]?.signedDate ?? '',
    );
  }, [contracts]);

  const counts = useMemo(() => {
    return {
      all: contracts.length,
      active: contracts.filter((c) => c.status === 'Active').length,
      expiring: contracts.filter((c) => c.status === 'Expiring').length,
      expired: contracts.filter((c) => c.status === 'Expired').length,
      renewed: contracts.filter((c) => c.status === 'Renewed').length,
      draft: contracts.filter((c) => c.status === 'Draft').length,
      terminated: contracts.filter((c) => c.status === 'Terminated').length,
    };
  }, [contracts]);

  const kpis = useMemo(() => {
    const active = counts.active;
    const expiringSoon = contracts.filter(
      (c) =>
        c.status === 'Expiring' ||
        (c.status === 'Active' && c.daysUntilExpiry <= 90 && c.daysUntilExpiry >= 0),
    ).length;
    const totalValue = contracts
      .filter((c) => c.status === 'Active')
      .reduce((sum, c) => sum + c.value, 0);
    return { active, expiringSoon, totalValue };
  }, [contracts, counts.active]);

  const overdueObligations = useMemo(
    () => mockObligations.filter((o) => o.status === 'Overdue').length,
    [],
  );

  const filtered = useMemo(() => {
    return contracts
      .filter((c) => matchesGroup(c, group))
      .filter((c) =>
        selectedTypes.length === 0 ? true : selectedTypes.includes(c.type),
      )
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          c.contractNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (supplierById.get(c.supplierId)?.name ?? '')
            .toLowerCase()
            .includes(q)
        );
      });
  }, [contracts, group, selectedTypes, search]);

  const renewalPipeline = useMemo(() => {
    const upcoming = contracts.filter(
      (c) =>
        (c.status === 'Active' || c.status === 'Expiring') &&
        c.daysUntilExpiry >= 0 &&
        c.daysUntilExpiry <= 180,
    );
    const groups = new Map<string, Contract[]>();
    for (const c of upcoming) {
      const key = formatMonth(c.endDate);
      const existing = groups.get(key) ?? [];
      existing.push(c);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const ad = new Date(a[1][0].endDate).getTime();
      const bd = new Date(b[1][0].endDate).getTime();
      return ad - bd;
    });
  }, [contracts]);

  const toggleType = (t: ContractType) =>
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['ACQUIRE', 'CONTRACTS']}
        title="Contract Management"
        subtitle="Active contracts, renewal pipeline, and obligation tracking across your supplier network."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet },
              { label: 'Templates', icon: ScrollText },
            ]}
            primary={{ label: 'New Contract', icon: Plus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {contracts.length} contracts · last updated {formatDate(lastUpdated)}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Active Contracts"
          value={kpis.active.toString()}
          subtitle="Currently in force"
          icon={ScrollText}
        />
        <KpiCard
          eyebrow="Expiring Soon"
          value={kpis.expiringSoon.toString()}
          subtitle="Within next 90 days"
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="Overdue Obligations"
          value={overdueObligations.toString()}
          subtitle="Across all contracts"
          icon={FileText}
        />
        <KpiCard
          eyebrow="Total Active Value"
          value={formatIDR(kpis.totalValue)}
          subtitle="Sum of active contracts"
          icon={Wallet}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'active', label: 'Active', count: counts.active },
          { id: 'expiring', label: 'Expiring', count: counts.expiring },
          { id: 'expired', label: 'Expired', count: counts.expired },
          { id: 'renewed', label: 'Renewed', count: counts.renewed },
          { id: 'draft', label: 'Draft', count: counts.draft },
          { id: 'terminated', label: 'Terminated', count: counts.terminated },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            Filter by type
          </div>
          <FilterChipsBar
            options={TYPE_OPTIONS.map((t) => ({ id: t, label: t }))}
            value={selectedTypes}
            onChange={toggleType}
            multiSelect
          />
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by contract number, supplier, or title…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>Contract #</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Period</TableHeaderCell>
            <TableHeaderCell>Expiry</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
            <TableHeaderCell>Performance</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((c) => {
              const supplier = supplierById.get(c.supplierId);
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedContract(c)}
                >
                  <TableCell>
                    <div className="font-semibold text-text-primary">
                      {c.contractNumber}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5 max-w-[18rem] truncate">
                      {c.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {supplier?.name ?? c.supplierId}
                    </div>
                    {supplier && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {COUNTRY_FLAG[supplier.country] ?? supplier.country}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant="neutral">{c.type}</StatusPill>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(c.startDate)} → {formatDate(c.endDate)}
                    </div>
                    {c.autoRenewal && (
                      <div className="text-xs text-info mt-0.5 inline-flex items-center gap-1">
                        <RefreshCw size={10} /> Auto-renew
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm whitespace-nowrap ${expiryTone(c.daysUntilExpiry)}`}>
                      {c.daysUntilExpiry < 0
                        ? `${Math.abs(c.daysUntilExpiry)}d ago`
                        : c.daysUntilExpiry === 0
                          ? 'Today'
                          : `${c.daysUntilExpiry}d left`}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {c.value > 0 ? formatIDR(c.value) : '—'}
                  </TableCell>
                  <TableCell>
                    {c.performanceScore > 0 ? (
                      <div className="w-32">
                        <ScoreBadge
                          score={c.performanceScore}
                          size="sm"
                          variant="bar"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[c.status]}>
                      {c.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  No contracts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Renewal pipeline */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <div className="text-label text-text-tertiary uppercase">
            Intelligence
          </div>
          <h2 className="text-base font-semibold text-text-primary mt-1">
            Renewal Pipeline
          </h2>
          <p className="text-meta text-text-tertiary">
            Contracts expiring in the next 6 months, grouped by month.
          </p>
        </div>
        {renewalPipeline.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-text-tertiary">
            No renewals due in the next 6 months.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {renewalPipeline.map(([month, items]) => (
              <li key={month} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={14} className="text-teal" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    {month}
                  </h3>
                  <span className="text-xs text-text-tertiary">
                    · {items.length} contract{items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((c) => {
                    const supplier = supplierById.get(c.supplierId);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContract(c)}
                        className="text-left flex items-start gap-3 p-3 rounded-md border border-border-subtle hover:border-teal hover:shadow-sm transition-all"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.daysUntilExpiry < 30
                              ? 'bg-danger-soft text-danger'
                              : c.daysUntilExpiry < 90
                                ? 'bg-warning-soft text-warning'
                                : 'bg-info-soft text-info'
                          }`}
                        >
                          {c.daysUntilExpiry}d
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {supplier?.name ?? c.supplierId}
                          </div>
                          <div className="text-xs text-text-tertiary mt-0.5">
                            {c.contractNumber} · {c.type}
                          </div>
                        </div>
                        {c.autoRenewal && (
                          <RefreshCw
                            size={14}
                            className="text-info shrink-0 mt-0.5"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SidePanel
        open={selectedContract !== null}
        onClose={() => setSelectedContract(null)}
        title={
          selectedContract
            ? `Contract ${selectedContract.contractNumber} — ${selectedContract.title}`
            : ''
        }
      >
        {selectedContract && (
          <section>
            <h3 className="text-label text-text-tertiary uppercase mb-3">
              Summary
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-text-tertiary">Supplier</dt>
                <dd className="text-text-primary font-medium">
                  {supplierById.get(selectedContract.supplierId)?.name ??
                    selectedContract.supplierId}
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Type</dt>
                <dd>
                  <StatusPill variant="neutral">
                    {selectedContract.type}
                  </StatusPill>
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Status</dt>
                <dd>
                  <StatusPill
                    variant={STATUS_VARIANT[selectedContract.status]}
                  >
                    {selectedContract.status}
                  </StatusPill>
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Period</dt>
                <dd className="text-text-primary font-medium">
                  {formatDate(selectedContract.startDate)} →{' '}
                  {formatDate(selectedContract.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Value</dt>
                <dd className="text-text-primary font-semibold">
                  {selectedContract.value > 0
                    ? formatIDR(selectedContract.value)
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerContracts;
