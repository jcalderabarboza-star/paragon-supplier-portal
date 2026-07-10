import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
  Download,
  Shield,
  RefreshCw,
  Bell,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Data from '../components/ui-v2/Data';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import {
  COMPLIANCE_ITEMS,
  type ComplianceItem,
  type ComplianceItemStatus as ComplianceStatus,
  type CompliancePriority as Priority,
} from '../services/data/mock/fixtures/buyerCompliance';

type CategoryFilter = 'All' | 'Halal' | 'Quality' | 'Regulatory' | 'Environmental';
type StatusFilter = 'All' | ComplianceStatus;

const STATUS_VARIANT: Record<ComplianceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Valid: 'success',
  Expiring: 'warning',
  Expired: 'danger',
  Missing: 'danger',
  'Under Review': 'neutral',
};

const PRIORITY_VARIANT: Record<Priority, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
};

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Expired', label: 'Expired' },
  { id: 'Expiring', label: 'Expiring' },
  { id: 'Missing', label: 'Missing' },
  { id: 'Under Review', label: 'Under Review' },
  { id: 'Valid', label: 'Valid' },
];

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Halal', label: 'Halal' },
  { id: 'Quality', label: 'Quality' },
  { id: 'Regulatory', label: 'Regulatory' },
  { id: 'Environmental', label: 'Environmental' },
];

const fmtDate = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const BuyerCompliance: React.FC = () => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  const filtered = useMemo(
    () =>
      COMPLIANCE_ITEMS.filter((item) => {
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (categoryFilter !== 'All' && item.category !== categoryFilter)
          return false;
        return true;
      }),
    [statusFilter, categoryFilter],
  );

  const counts = useMemo(() => {
    const by = (s: ComplianceStatus) =>
      COMPLIANCE_ITEMS.filter((i) => i.status === s).length;
    return {
      expired: by('Expired'),
      expiring: by('Expiring'),
      missing: by('Missing'),
      valid: by('Valid'),
      underReview: by('Under Review'),
    };
  }, []);

  const bpjph = useMemo(() => {
    const halalAll = COMPLIANCE_ITEMS.filter((i) => i.category === 'Halal');
    const halalCompliant = halalAll.filter((i) => i.status === 'Valid');
    return { compliant: halalCompliant.length, total: halalAll.length };
  }, []);

  const deadline = useMemo(() => {
    const target = new Date('2026-10-17');
    const today = new Date();
    const daysLeft = Math.ceil(
      (target.getTime() - today.getTime()) / 86_400_000,
    );
    const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100));
    return { daysLeft, pct };
  }, []);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['INTELLIGENCE', 'COMPLIANCE TRACKER']}
        title="Compliance Tracker"
        subtitle="Halal · BPOM · ISO · REACH · GMP — October 2026 BPJPH mandatory transition."
        actions={
          <BulkActionsBar
            primary={{
              label: 'Export Report',
              icon: Download,
              onClick: () =>
                toast({
                  variant: 'info',
                  title: 'Generating compliance report PDF',
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {COMPLIANCE_ITEMS.length} certificates · last refreshed {today}
      </PageMetaLine>

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
        <Shield size={16} className="text-warning shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          <strong className="text-warning">
            BPJPH Mandatory Transition — October 2026:
          </strong>{' '}
          All cosmetics and personal care products distributed in Indonesia
          must carry BPJPH-issued halal certification. Suppliers with MUI-only
          certificates must initiate BPJPH applications now.{' '}
          <strong className="text-text-primary">
            {bpjph.compliant} of {bpjph.total} halal certs
          </strong>{' '}
          are BPJPH-compliant.
        </div>
      </div>

      <div className="bg-bg-surface border border-warning/40 rounded-lg shadow-sm px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold text-text-primary">
              BPJPH mandatory deadline
            </div>
            <div className="text-xs text-text-tertiary mt-0.5">
              All Indonesian cosmetics must carry BPJPH halal cert by 17 Oct
              2026.
            </div>
          </div>
          <div className="text-right shrink-0">
            <Data
              as="div"
              className={`text-kpi leading-none ${
                deadline.daysLeft <= 90 ? 'text-danger' : 'text-warning'
              }`}
            >
              {deadline.daysLeft}
            </Data>
            <div className="text-xs text-text-tertiary mt-1">
              days remaining
            </div>
          </div>
        </div>
        <div className="bg-bg-hover rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              deadline.daysLeft <= 90 ? 'bg-danger' : 'bg-warning'
            }`}
            style={{ width: `${deadline.pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Expired"
          value={counts.expired.toString()}
          subtitle={<span className="text-danger">Blocks new POs</span>}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="Expiring ≤90d"
          value={counts.expiring.toString()}
          subtitle={<span className="text-warning">Renewal window open</span>}
          icon={Clock}
        />
        <KpiCard
          eyebrow="Missing"
          value={counts.missing.toString()}
          subtitle={<span className="text-danger">Application not started</span>}
          icon={FileQuestion}
        />
        <KpiCard
          eyebrow="Valid"
          value={counts.valid.toString()}
          subtitle="In good standing"
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterChipsBar<StatusFilter>
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterChipsBar<CategoryFilter>
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <span className="text-meta text-text-tertiary">
          {filtered.length} of {COMPLIANCE_ITEMS.length} items
        </span>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Certificate</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Issued by</TableHeaderCell>
            <TableHeaderCell>Expiry</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Priority</TableHeaderCell>
            <TableHeaderCell>Action required</TableHeaderCell>
            <TableHeaderCell className="text-right">Remind</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((item) => {
              const showRemind =
                item.priority === 'Critical' ||
                item.priority === 'High' ||
                item.priority === 'Medium';
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-semibold text-text-primary">
                      {item.supplier}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {item.country}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {item.type}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant="neutral">{item.category}</StatusPill>
                  </TableCell>
                  <TableCell className="text-text-tertiary">
                    {item.issuedBy}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary whitespace-nowrap">
                      {fmtDate(item.expiryDate)}
                    </div>
                    {item.daysRemaining !== null && (
                      <div
                        className={`text-xs mt-0.5 ${
                          item.daysRemaining <= 0
                            ? 'text-danger'
                            : item.daysRemaining <= 90
                              ? 'text-warning'
                              : 'text-text-tertiary'
                        }`}
                      >
                        {item.daysRemaining <= 0
                          ? `Expired ${Math.abs(item.daysRemaining)}d ago`
                          : `${item.daysRemaining}d remaining`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[item.status]}>
                      {item.status === 'Under Review' ? (
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw size={10} />
                          {item.status}
                        </span>
                      ) : (
                        item.status
                      )}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={PRIORITY_VARIANT[item.priority]}>
                      {item.priority}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs ${
                        item.priority === 'Critical'
                          ? 'text-danger'
                          : item.priority === 'High'
                            ? 'text-warning'
                            : 'text-text-tertiary'
                      }`}
                    >
                      {item.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {showRemind && (
                      <Button
                        variant={
                          item.priority === 'Critical' ? 'outline' : 'secondary'
                        }
                        icon={Bell}
                        onClick={() =>
                          toast({
                            variant:
                              item.priority === 'Critical' ? 'warning' : 'info',
                            title: `Reminder queued for ${item.supplier}`,
                            description:
                              'Simulated — delivery pending live channel.',
                          })
                        }
                      >
                        Remind
                      </Button>
                    )}
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
                  No certificates match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <Shield size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">Phase 2 — Live Integration:</strong>{' '}
          Compliance tracking will connect to SAP S/4HANA vendor master, BPJPH
          API, and supplier document vault. Automated renewal reminders via
          WhatsApp 90 days before expiry.
        </span>
      </div>
    </AppShellV2>
  );
};

export default BuyerCompliance;
