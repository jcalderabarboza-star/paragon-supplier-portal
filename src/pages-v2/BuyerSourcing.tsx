import React, { useMemo, useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Award,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  ClipboardCheck,
  Trophy,
  Archive,
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
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import ScoreBadge from '../components/ui-v2/ScoreBadge';
import Button from '../components/ui-v2/Button';
import { mockRfqs, RFQ, RFQCategory, RFQStatus } from '../data/mockRfqs';
import { mockQuotations } from '../data/mockQuotations';
import { mockSuppliers } from '../data/mockSuppliers';

type GroupTab = 'all' | 'open' | 'pending' | 'awarded' | 'closed';

const CATEGORY_OPTIONS: RFQCategory[] = [
  'Fragrance',
  'Active Ingredients',
  'Packaging',
  'Emulsifiers',
  'Botanical',
  'Other',
];

const STATUS_VARIANT: Record<
  RFQStatus,
  'success' | 'warning' | 'info' | 'neutral' | 'danger'
> = {
  Draft: 'neutral',
  Open: 'info',
  Closed: 'neutral',
  Awarded: 'success',
  Cancelled: 'danger',
};

const REFERENCE_TODAY = new Date('2026-05-18');
const DAY_MS = 24 * 60 * 60 * 1000;

const supplierNameById = new Map(
  mockSuppliers.map((s) => [s.id, s.name]),
);

const isAllResponded = (r: RFQ): boolean =>
  r.invitedSupplierIds.length > 0 &&
  r.respondedSupplierIds.length === r.invitedSupplierIds.length;

const daysUntil = (iso: string): number => {
  const d = new Date(iso);
  return Math.round((d.getTime() - REFERENCE_TODAY.getTime()) / DAY_MS);
};

const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('id-ID').format(value);

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const buildTimeline = (r: RFQ): TimelineEvent[] => {
  const totalInvited = r.invitedSupplierIds.length;
  const responded = r.respondedSupplierIds.length;
  const allResponded = isAllResponded(r);

  const isDraft = r.status === 'Draft';
  const isOpen = r.status === 'Open';
  const isAwarded = r.status === 'Awarded';
  const isClosed = r.status === 'Closed' || r.status === 'Cancelled';

  return [
    {
      id: 'drafted',
      title: 'RFQ Drafted',
      timestamp: formatDate(r.createdAt),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'sent',
      title: `Sent to ${totalInvited} supplier${totalInvited === 1 ? '' : 's'}`,
      timestamp: isDraft ? undefined : formatDate(r.createdAt),
      status: isDraft ? 'pending' : 'completed',
      icon: Send,
    },
    {
      id: 'responses',
      title: `Responses Received (${responded}/${totalInvited})`,
      timestamp:
        responded > 0 ? `Latest: ${formatDate(r.responseDeadline)}` : undefined,
      status: isDraft
        ? 'pending'
        : allResponded || isAwarded || isClosed
          ? 'completed'
          : 'current',
      icon: CheckCircle2,
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      status: isAwarded || isClosed
        ? 'completed'
        : allResponded && isOpen
          ? 'current'
          : 'pending',
      icon: ClipboardCheck,
    },
    {
      id: 'awarded',
      title: 'Awarded',
      timestamp: isAwarded ? formatDate(r.awardDeadline) : undefined,
      status: isAwarded ? 'completed' : isClosed ? 'pending' : 'pending',
      icon: Trophy,
    },
    {
      id: 'closed',
      title: 'Closed',
      status: isClosed ? 'completed' : 'pending',
      icon: Archive,
    },
  ];
};

const FOOTER_LABEL = (r: RFQ): string => {
  if (r.status === 'Open') {
    return isAllResponded(r) ? 'Award RFQ' : 'Send reminder';
  }
  if (r.status === 'Awarded') return 'View award details';
  if (r.status === 'Closed' || r.status === 'Cancelled')
    return 'View final report';
  return 'Continue draft';
};

const ComparisonRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <tr className="border-t border-border-subtle">
    <th
      scope="row"
      className="text-left px-2 py-2 font-medium text-text-tertiary uppercase tracking-wider text-[10px] sticky left-0 bg-bg-surface z-10 align-middle"
    >
      {label}
    </th>
    {children}
  </tr>
);

const ComparisonCell: React.FC<{
  highlight?: boolean;
  children: React.ReactNode;
}> = ({ highlight, children }) => (
  <td
    className={`px-2 py-2 align-middle ${
      highlight ? 'border-x-2 border-teal bg-teal-soft/40' : ''
    }`}
  >
    {children}
  </td>
);

const matchesGroup = (r: RFQ, group: GroupTab): boolean => {
  if (group === 'all') return true;
  if (group === 'open') return r.status === 'Open' && !isAllResponded(r);
  if (group === 'pending') return r.status === 'Open' && isAllResponded(r);
  if (group === 'awarded') return r.status === 'Awarded';
  if (group === 'closed')
    return r.status === 'Closed' || r.status === 'Cancelled';
  return true;
};

const BuyerSourcing: React.FC = () => {
  const [group, setGroup] = useState<GroupTab>('all');
  const [selectedCats, setSelectedCats] = useState<RFQCategory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [awardsOpen, setAwardsOpen] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const openRfq = (r: RFQ) => {
    setSelectedRfq(r);
    setSelectedQuoteId(null);
  };

  const closePanel = () => {
    setSelectedRfq(null);
    setSelectedQuoteId(null);
  };

  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return mockQuotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq]);

  const rfqs = mockRfqs;

  const lastUpdated = useMemo(
    () =>
      rfqs.reduce(
        (acc, r) => (r.createdAt > acc ? r.createdAt : acc),
        rfqs[0]?.createdAt ?? '',
      ),
    [rfqs],
  );

  const counts = useMemo(() => {
    const open = rfqs.filter(
      (r) => r.status === 'Open' && !isAllResponded(r),
    ).length;
    const pending = rfqs.filter(
      (r) => r.status === 'Open' && isAllResponded(r),
    ).length;
    const awarded = rfqs.filter((r) => r.status === 'Awarded').length;
    const closed = rfqs.filter(
      (r) => r.status === 'Closed' || r.status === 'Cancelled',
    ).length;
    return {
      all: rfqs.length,
      open,
      pending,
      awarded,
      closed,
    };
  }, [rfqs]);

  const kpis = useMemo(() => {
    const active = rfqs.filter((r) => r.status === 'Open').length;
    const awaiting = rfqs.filter((r) => {
      if (r.status !== 'Open') return false;
      const d = daysUntil(r.responseDeadline);
      return d <= 7 && d >= 0;
    }).length;
    const readyToAward = rfqs.filter(
      (r) => r.status === 'Open' && isAllResponded(r),
    ).length;
    const awardedQuarter = rfqs.filter((r) => {
      if (r.status !== 'Awarded') return false;
      const age = -daysUntil(r.createdAt);
      return age <= 90;
    }).length;
    return { active, awaiting, readyToAward, awardedQuarter };
  }, [rfqs]);

  const activeFiltered = useMemo(() => {
    return rfqs
      .filter((r) => r.status !== 'Awarded')
      .filter((r) => matchesGroup(r, group))
      .filter((r) =>
        selectedCats.length === 0
          ? true
          : selectedCats.includes(r.materialCategory),
      )
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.materialIds.join(' ').toLowerCase().includes(q)
        );
      });
  }, [rfqs, group, selectedCats, search]);

  const awarded = useMemo(
    () => rfqs.filter((r) => r.status === 'Awarded'),
    [rfqs],
  );

  const toggleCategory = (cat: RFQCategory) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['ACQUIRE', 'SOURCING & RFQ']}
        title="Sourcing & RFQ"
        subtitle="Active sourcing events, quote evaluation, and award history."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet },
              { label: 'Templates', icon: FileText },
            ]}
            primary={{ label: 'New RFQ', icon: Plus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {kpis.active} active RFQs · last updated {formatDate(lastUpdated)}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Active RFQs"
          value={kpis.active.toString()}
          subtitle="Open for response"
          icon={FileText}
        />
        <KpiCard
          eyebrow="Awaiting Response"
          value={kpis.awaiting.toString()}
          subtitle="Deadline within 7 days"
          icon={Clock}
        />
        <KpiCard
          eyebrow="Ready to Award"
          value={kpis.readyToAward.toString()}
          subtitle="All suppliers responded"
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Awarded (Quarter)"
          value={kpis.awardedQuarter.toString()}
          subtitle="Last 90 days"
          icon={Award}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'open', label: 'Open', count: counts.open },
          { id: 'pending', label: 'Pending Award', count: counts.pending },
          { id: 'awarded', label: 'Awarded', count: counts.awarded },
          { id: 'closed', label: 'Closed', count: counts.closed },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            Filter by category
          </div>
          <FilterChipsBar
            options={CATEGORY_OPTIONS.map((c) => ({ id: c, label: c }))}
            value={selectedCats}
            onChange={toggleCategory}
            multiSelect
          />
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by RFQ number, title, or material…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>RFQ #</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Responses</TableHeaderCell>
            <TableHeaderCell className="text-right">Qty</TableHeaderCell>
            <TableHeaderCell className="text-right">
              Est. Value
            </TableHeaderCell>
            <TableHeaderCell>Response deadline</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHeader>
          <tbody>
            {activeFiltered.map((r) => {
              const responded = r.respondedSupplierIds.length;
              const invited = r.invitedSupplierIds.length;
              const pct = invited === 0 ? 0 : (responded / invited) * 100;
              const days = daysUntil(r.responseDeadline);
              const deadlineTone =
                r.status !== 'Open'
                  ? 'text-text-secondary'
                  : days < 3
                    ? 'text-danger font-semibold'
                    : days < 7
                      ? 'text-warning font-semibold'
                      : 'text-text-secondary';
              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openRfq(r)}
                >
                  <TableCell>
                    <div className="font-semibold text-text-primary">
                      {r.rfqNumber}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5 max-w-[20rem] truncate">
                      {r.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {r.materialCategory}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary font-medium">
                      {responded} / {invited}
                    </div>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-bg-hover overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-secondary whitespace-nowrap">
                    {formatNumber(r.totalQty)} {r.uom}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {formatIDR(r.estimatedValue)}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm whitespace-nowrap ${deadlineTone}`}>
                      {formatDate(r.responseDeadline)}
                    </div>
                    {r.status === 'Open' && (
                      <div
                        className={`text-xs mt-0.5 ${
                          days < 0
                            ? 'text-danger'
                            : days < 3
                              ? 'text-danger'
                              : days < 7
                                ? 'text-warning'
                                : 'text-text-tertiary'
                        }`}
                      >
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? 'Due today'
                            : `${days}d remaining`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[r.status]}>
                      {r.status}
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
            {activeFiltered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  No RFQs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Awards history */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setAwardsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-hover transition-colors"
        >
          <div className="text-left">
            <h2 className="text-base font-semibold text-text-primary">
              Awards History
            </h2>
            <p className="text-meta text-text-tertiary">
              {awarded.length} awarded RFQ{awarded.length === 1 ? '' : 's'}
            </p>
          </div>
          {awardsOpen ? (
            <ChevronUp size={16} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={16} className="text-text-tertiary" />
          )}
        </button>
        {awardsOpen && (
          <Table>
            <TableHeader>
              <TableHeaderCell>RFQ #</TableHeaderCell>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Awarded supplier</TableHeaderCell>
              <TableHeaderCell>Award date</TableHeaderCell>
              <TableHeaderCell className="text-right">
                Award value
              </TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableHeader>
            <tbody>
              {awarded.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openRfq(r)}
                >
                  <TableCell className="font-semibold text-text-primary">
                    {r.rfqNumber}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary max-w-md truncate">
                    {r.title}
                  </TableCell>
                  <TableCell className="text-sm text-text-primary">
                    {r.awardedSupplierId
                      ? (supplierNameById.get(r.awardedSupplierId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(r.awardDeadline)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {formatIDR(r.estimatedValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {awarded.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-sm text-text-tertiary py-10"
                  >
                    No awarded RFQs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </section>

      <SidePanel
        open={selectedRfq !== null}
        onClose={closePanel}
        title={
          selectedRfq
            ? `RFQ ${selectedRfq.rfqNumber} — ${selectedRfq.title}`
            : ''
        }
        footerActions={
          selectedRfq && (
            <>
              <Button variant="secondary" icon={Download}>
                Export comparison
              </Button>
              <Button
                variant="primary"
                disabled={
                  selectedRfq.status === 'Open' &&
                  isAllResponded(selectedRfq) &&
                  !selectedQuoteId
                }
              >
                {FOOTER_LABEL(selectedRfq)}
              </Button>
            </>
          )
        }
      >
        {selectedRfq && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Summary
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Category</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.materialCategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedRfq.status]}>
                      {selectedRfq.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Created</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedRfq.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Response deadline</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedRfq.responseDeadline)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Award deadline</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedRfq.awardDeadline)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Total qty</dt>
                  <dd className="text-text-primary font-medium">
                    {formatNumber(selectedRfq.totalQty)} {selectedRfq.uom}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Est. value</dt>
                  <dd className="text-text-primary font-semibold">
                    {formatIDR(selectedRfq.estimatedValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Currency</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Incoterms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.incoterms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment terms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.paymentTerms}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Lifecycle
              </h3>
              <Timeline events={buildTimeline(selectedRfq)} />
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Quote comparison ({quotesForSelected.length} quote
                {quotesForSelected.length === 1 ? '' : 's'})
              </h3>
              {quotesForSelected.length === 0 ? (
                <div className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  No quotes received yet.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-2 font-semibold text-text-tertiary uppercase tracking-wider align-bottom w-32 sticky left-0 bg-bg-surface z-10">
                          Criterion
                        </th>
                        {quotesForSelected.map((q) => {
                          const supplier =
                            supplierNameById.get(q.supplierId) ?? q.supplierId;
                          return (
                            <th
                              key={q.id}
                              className={`align-bottom px-2 pt-2 pb-2 font-semibold text-text-primary text-left min-w-[10rem] ${
                                q.aiRecommended
                                  ? 'border-2 border-teal rounded-t-md bg-teal-soft/40'
                                  : ''
                              }`}
                            >
                              {q.aiRecommended && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal uppercase tracking-wider mb-1">
                                  <Sparkles size={10} /> AI recommended
                                </span>
                              )}
                              <div className="text-sm">{supplier}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="text-text-secondary">
                      <ComparisonRow label="Unit Price">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <span className="font-semibold text-text-primary whitespace-nowrap">
                              {formatIDR(q.unitPrice)}/{selectedRfq.uom}
                            </span>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Total Price">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <span className="font-semibold text-text-primary whitespace-nowrap">
                              {formatIDR(q.totalPrice)}
                            </span>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Lead Time">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <span className="whitespace-nowrap">
                              {q.leadTimeDays} days
                            </span>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Payment Terms">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            {q.paymentTermsOffered}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Compliance">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.complianceScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Price Score">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.priceScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Lead Time Score">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.leadTimeScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Reliability">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.reliabilityScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="AI Composite">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.aiCompositeScore}
                              size="md"
                              variant="circular"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Select">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="award-select"
                                value={q.id}
                                checked={selectedQuoteId === q.id}
                                onChange={() => setSelectedQuoteId(q.id)}
                                className="accent-teal"
                              />
                              <span className="text-xs text-text-secondary">
                                Award
                              </span>
                            </label>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedRfq.status === 'Open' &&
              isAllResponded(selectedRfq) &&
              quotesForSelected.length > 0 && (
                <section className="bg-teal-soft border border-teal/20 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Award action
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    {selectedQuoteId
                      ? `Selected: ${supplierNameById.get(quotesForSelected.find((q) => q.id === selectedQuoteId)?.supplierId ?? '') ?? '—'}`
                      : 'Select a quote above to enable the award action.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      icon={Trophy}
                      disabled={!selectedQuoteId}
                    >
                      Award to selected
                    </Button>
                    <Button variant="secondary">Reject all & resource</Button>
                  </div>
                </section>
              )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerSourcing;
