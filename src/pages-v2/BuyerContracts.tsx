import React, { useMemo, useState } from 'react';
import {
  FileText,
  ScrollText,
  AlertTriangle,
  Wallet,
  Plus,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CalendarDays,
  PenSquare,
  Handshake,
  CheckCircle2,
  Activity,
  Bell,
  Archive,
  Download,
  ShieldCheck,
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
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import {
  ContractObligation,
  ObligationStatus,
} from '../data/mockObligations';
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

const OBLIGATION_VARIANT: Record<
  ObligationStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Upcoming: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Overdue: 'danger',
};

const OBLIGATION_RANK: Record<ObligationStatus, number> = {
  Overdue: 0,
  'In Progress': 1,
  Upcoming: 2,
  Completed: 3,
};

const sortObligations = (a: ContractObligation, b: ContractObligation) => {
  const r = OBLIGATION_RANK[a.status] - OBLIGATION_RANK[b.status];
  if (r !== 0) return r;
  return a.dueDate.localeCompare(b.dueDate);
};

const shiftDays = (iso: string, days: number): string => {
  if (!iso) return iso;
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const buildContractTimeline = (c: Contract): TimelineEvent[] => {
  const isDraft = c.status === 'Draft';
  const isActive = c.status === 'Active';
  const isExpiring = c.status === 'Expiring';
  const isExpired = c.status === 'Expired';
  const isRenewed = c.status === 'Renewed';
  const isTerminated = c.status === 'Terminated';

  const finalLabel = isExpired
    ? 'Expired'
    : isRenewed
      ? 'Renewed'
      : isTerminated
        ? 'Terminated'
        : 'Expiry / Renewal';
  const finalIcon = isTerminated ? Archive : isRenewed ? RefreshCw : Archive;

  return [
    {
      id: 'drafted',
      title: 'Drafted',
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -14)) : undefined,
      status: 'completed',
      icon: PenSquare,
    },
    {
      id: 'negotiated',
      title: 'Negotiated',
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -7)) : undefined,
      status: isDraft ? 'current' : 'completed',
      icon: Handshake,
    },
    {
      id: 'signed',
      title: 'Signed',
      timestamp: c.signedDate ? formatDate(c.signedDate) : undefined,
      status: isDraft ? 'pending' : 'completed',
      icon: CheckCircle2,
    },
    {
      id: 'active',
      title: 'Active Period',
      timestamp: `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`,
      status: isActive || isExpiring
        ? 'current'
        : isExpired || isRenewed || isTerminated
          ? 'completed'
          : 'pending',
      icon: Activity,
    },
    {
      id: 'renewal-decision',
      title: 'Renewal Decision',
      timestamp:
        c.endDate && c.noticeRequiredDays
          ? `Notice by ${formatDate(shiftDays(c.endDate, -c.noticeRequiredDays))}`
          : undefined,
      status: isExpiring
        ? 'current'
        : isExpired || isRenewed || isTerminated
          ? 'completed'
          : 'pending',
      icon: Bell,
    },
    {
      id: 'final',
      title: finalLabel,
      timestamp: isExpired || isRenewed || isTerminated
        ? formatDate(c.endDate)
        : undefined,
      status: isExpired || isRenewed || isTerminated ? 'completed' : 'pending',
      icon: finalIcon,
    },
  ];
};

const FOOTER_PRIMARY_LABEL = (c: Contract): string => {
  if (c.status === 'Active' && c.daysUntilExpiry <= 90)
    return 'Initiate renewal';
  if (c.status === 'Active') return 'View full contract';
  if (c.status === 'Expiring') return 'Initiate renewal';
  if (c.status === 'Expired') return 'View renewal options';
  if (c.status === 'Draft') return 'Continue editing';
  if (c.status === 'Renewed') return 'View previous contract';
  if (c.status === 'Terminated') return 'View termination notice';
  return 'View full contract';
};

const PLACEHOLDER_DOCS = (c: Contract): {
  name: string;
  status: 'valid' | 'expiring' | 'expired';
}[] => {
  const docs: { name: string; status: 'valid' | 'expiring' | 'expired' }[] = [];
  if (c.category.toLowerCase().includes('raw') || c.category.toLowerCase().includes('fragrance')) {
    docs.push({ name: 'BPJPH Halal Certificate', status: 'valid' });
  }
  docs.push({ name: 'ISO 9001:2015', status: 'valid' });
  if (c.type === 'Quality' || c.type === 'Supply') {
    docs.push({ name: 'BPOM Registration', status: 'expiring' });
  }
  return docs;
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
  const [docsOpen, setDocsOpen] = useState(false);
  const { toast } = useToast();

  const contracts = mockContracts;

  const obligationsForSelected = useMemo<ContractObligation[]>(() => {
    if (!selectedContract) return [];
    return mockObligations
      .filter((o) => o.contractId === selectedContract.id)
      .sort(sortObligations);
  }, [selectedContract]);

  const closePanel = () => {
    setSelectedContract(null);
    setDocsOpen(false);
  };

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
        onClose={closePanel}
        title={
          selectedContract
            ? `Contract ${selectedContract.contractNumber} — ${selectedContract.title}`
            : ''
        }
        footerActions={
          selectedContract && (
            <>
              <Button
                variant="secondary"
                icon={Download}
                onClick={() =>
                  toast({
                    variant: 'info',
                    title: 'PDF export queued',
                    description: 'PDF export coming in Phase 2A.',
                  })
                }
              >
                Export PDF
              </Button>
              <Button variant="primary">
                {FOOTER_PRIMARY_LABEL(selectedContract)}
              </Button>
            </>
          )
        }
      >
        {selectedContract && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Key facts
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
                  <dt className="text-text-tertiary">Auto-renewal</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.autoRenewal ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Start date</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedContract.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">End date</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedContract.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Notice required</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.noticeRequiredDays} days
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Days until expiry</dt>
                  <dd
                    className={`font-semibold ${expiryTone(selectedContract.daysUntilExpiry)}`}
                  >
                    {selectedContract.daysUntilExpiry < 0
                      ? `${Math.abs(selectedContract.daysUntilExpiry)}d ago`
                      : `${selectedContract.daysUntilExpiry}d`}
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
                <div>
                  <dt className="text-text-tertiary">Currency</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment terms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.paymentTerms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Incoterms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.incoterms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Signed by buyer</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedByBuyer}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Signed by supplier</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedBySupplier}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Signed date</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedDate
                      ? formatDate(selectedContract.signedDate)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Category</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.category}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-text-tertiary">Brands</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {selectedContract.brands.length === 0 ? (
                      <span className="text-text-tertiary text-sm">—</span>
                    ) : (
                      selectedContract.brands.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center rounded-full bg-bg-hover text-text-secondary text-xs px-2 py-0.5"
                        >
                          {b}
                        </span>
                      ))
                    )}
                  </dd>
                </div>
                <div className="col-span-2 pt-2 flex items-center gap-3">
                  <dt className="text-text-tertiary text-sm">
                    Performance score
                  </dt>
                  <dd>
                    {selectedContract.performanceScore > 0 ? (
                      <ScoreBadge
                        score={selectedContract.performanceScore}
                        size="md"
                        variant="circular"
                      />
                    ) : (
                      <span className="text-text-tertiary text-sm">
                        Not yet rated
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Obligations ({obligationsForSelected.length})
              </h3>
              {obligationsForSelected.length === 0 ? (
                <p className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  No obligations defined for this contract.
                </p>
              ) : (
                <div className="border border-border-subtle rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">
                          Title
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Owner
                        </th>
                        <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                          Due
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {obligationsForSelected.map((o) => (
                        <tr
                          key={o.id}
                          className="border-t border-border-subtle"
                        >
                          <td className="px-3 py-2">
                            <div className="text-text-primary font-medium">
                              {o.title}
                            </div>
                            <div className="text-text-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                              {o.category}
                              {o.recurrence ? ` · ${o.recurrence}` : ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-text-secondary">
                            {o.owner}
                          </td>
                          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                            {formatDate(o.dueDate)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill
                              variant={OBLIGATION_VARIANT[o.status]}
                            >
                              {o.status}
                            </StatusPill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Lifecycle
              </h3>
              <Timeline events={buildContractTimeline(selectedContract)} />
            </section>

            <section>
              <button
                type="button"
                onClick={() => setDocsOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-teal hover:text-teal-hover"
              >
                {docsOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {docsOpen ? 'Hide' : 'Show'} linked compliance documents (
                {PLACEHOLDER_DOCS(selectedContract).length})
              </button>
              {docsOpen && (
                <ul className="mt-3 space-y-2">
                  {PLACEHOLDER_DOCS(selectedContract).map((d) => (
                    <li
                      key={d.name}
                      className="flex items-center justify-between gap-3 p-3 border border-border-subtle rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          size={14}
                          className="text-text-tertiary"
                        />
                        <span className="text-sm text-text-primary">
                          {d.name}
                        </span>
                      </div>
                      <StatusPill
                        variant={
                          d.status === 'valid'
                            ? 'success'
                            : d.status === 'expiring'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {d.status === 'valid'
                          ? 'Valid'
                          : d.status === 'expiring'
                            ? 'Expiring'
                            : 'Expired'}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerContracts;
