import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
  Download,
  Shield,
  RefreshCw,
  Bell,
  Database,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Data from '../components/ui-v2/Data';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import { isLive, readinessNote } from '../services/liveness';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import { useComplianceRegistry } from '../services/query/hooks';
import {
  computeStatus,
  daysRemaining,
  schemeValid,
  remindEligible,
} from '../services/data/complianceProjection';
import {
  certCategory,
  certTypeLabelKey,
  actionLabelKey,
  type CertCategory,
} from '../lib/complianceView';
import { statusTone } from '../lib/statusTone';
import type {
  ComplianceRegistryEntry,
  ComplianceDisplayStatus,
} from '../services/data/types';

type CategoryFilter = 'All' | CertCategory;
type StatusFilter = 'All' | ComplianceDisplayStatus;

// A row = the stored entry + its computed-at-read projections (law 0.5). The page
// never reads a stored clock/scheme value — every display fact below is derived
// from the entry vs the reference clock (HALAL-CLOCK-STATE mechanism, I3.1).
interface Row {
  entry: ComplianceRegistryEntry;
  status: ComplianceDisplayStatus;
  days: number | null;
  category: CertCategory;
  remind: boolean;
  schemeOk: boolean;
}

// Option ids stay canonical EN (they drive filtering against computed values);
// only the display `label` localizes, via the labelKey resolved at render.
const STATUS_OPTIONS: { id: StatusFilter; labelKey: string }[] = [
  { id: 'All', labelKey: 'compliance.filter.status.all' },
  { id: 'Expired', labelKey: 'compliance.filter.status.expired' },
  { id: 'Expiring', labelKey: 'compliance.filter.status.expiring' },
  { id: 'Missing', labelKey: 'compliance.filter.status.missing' },
  { id: 'Under Review', labelKey: 'compliance.filter.status.underReview' },
  { id: 'Valid', labelKey: 'compliance.filter.status.valid' },
];

const CATEGORY_OPTIONS: { id: CategoryFilter; labelKey: string }[] = [
  { id: 'All', labelKey: 'compliance.filter.category.all' },
  { id: 'Halal', labelKey: 'compliance.filter.category.halal' },
  { id: 'Quality', labelKey: 'compliance.filter.category.quality' },
  { id: 'Regulatory', labelKey: 'compliance.filter.category.regulatory' },
  { id: 'Other', labelKey: 'compliance.filter.category.other' },
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  // Now injected once per mount — the projection is pure & deterministic (no
  // clock read inside pure code); rows recompute only if the read changes.
  const now = useMemo(() => new Date().toISOString(), []);
  const query = useComplianceRegistry();
  const items = query.data?.items ?? [];

  const rows: Row[] = useMemo(
    () =>
      items.map((entry) => ({
        entry,
        status: computeStatus(entry, now),
        days: daysRemaining(entry, now),
        category: certCategory(entry.certType),
        remind: remindEligible(entry),
        schemeOk: schemeValid(entry, now),
      })),
    [items, now],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
        return true;
      }),
    [rows, statusFilter, categoryFilter],
  );

  const counts = useMemo(() => {
    const by = (s: ComplianceDisplayStatus) =>
      rows.filter((r) => r.status === s).length;
    return {
      expired: by('Expired'),
      expiring: by('Expiring'),
      missing: by('Missing'),
      valid: by('Valid'),
      underReview: by('Under Review'),
    };
  }, [rows]);

  // BPJPH compliance is SCHEME-AWARE (HALAL-ISSUER-BLIND mechanism): a halal cert
  // counts as compliant only when `schemeValid` holds — a MUI-legacy cert whose
  // dates say Valid is NON-compliant from the mandate date. The mechanism renders
  // here; the finding stays DOWNGRADED (SIMULATED, not closed) until real issuer
  // data backs it — the surface is honestly marked Sample via <LivenessPill>.
  const bpjph = useMemo(() => {
    const halal = rows.filter((r) => r.category === 'Halal');
    return { compliant: halal.filter((r) => r.schemeOk).length, total: halal.length };
  }, [rows]);

  const deadline = useMemo(() => {
    const target = new Date('2026-10-17');
    const today = new Date();
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
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
        breadcrumb={[t('compliance.crumb.intelligence'), t('compliance.crumb.tracker')]}
        title={t('compliance.header.title')}
        subtitle={t('compliance.header.subtitle')}
        actions={
          <BulkActionsBar
            primary={{
              label: t('compliance.action.exportReport'),
              icon: Download,
              onClick: () =>
                toast({
                  variant: 'info',
                  title: t('compliance.toast.exporting'),
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('compliance.meta.summary', { count: rows.length, date: today })}</span>
        {/* Honest-render: capability="compliance" derives SIMULATED (no wired
            CommandTarget) AND is harvest-gated (I3.3) → amber "Sample — awaiting
            Track-R harvest". Green is structurally unreachable (two-gate guard). */}
        <LivenessPill capability="compliance" />
      </PageMetaLine>

      {/* Waiting-state banner (I3.3, second form) — the SPECIFIC readiness message:
          this surface is proven and wired to the seam, waiting for the Track-R
          certificate harvest to land the real registry. Rendered only while the
          capability is harvest-gated; it disappears the moment the two-gate flip
          lands (LIVENESS-DATASOURCE-01). Distinct from the legal-deadline banner
          below (that is about the mandate; this is about data liveness). */}
      {!isLive('compliance') && readinessNote('compliance') && (
        <div className="bg-bg-hover border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
          <Database size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary">
            <strong className="text-text-primary">
              {t('compliance.readiness.title')}
            </strong>{' '}
            {t('compliance.readiness.body')}
          </div>
        </div>
      )}

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
        <Shield size={16} className="text-warning-hover shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          <strong className="text-warning-hover">
            {t('compliance.bpjph.banner.title')}
          </strong>{' '}
          {t('compliance.bpjph.banner.body')}{' '}
          <strong className="text-text-primary">
            {t('compliance.bpjph.banner.certs', {
              compliant: bpjph.compliant,
              total: bpjph.total,
            })}
          </strong>{' '}
          {t('compliance.bpjph.banner.compliantSuffix')}
        </div>
      </div>

      <div className="bg-bg-surface border border-warning/40 rounded-lg shadow-sm px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold text-text-primary">
              {t('compliance.deadline.title')}
            </div>
            <div className="text-xs text-text-tertiary mt-0.5">
              {t('compliance.deadline.subtitle')}
            </div>
          </div>
          <div className="text-right shrink-0">
            <Data
              as="div"
              className={`text-kpi leading-none ${
                deadline.daysLeft <= 90 ? 'text-danger' : 'text-warning-hover'
              }`}
            >
              {deadline.daysLeft}
            </Data>
            <div className="text-xs text-text-tertiary mt-1">
              {t('compliance.deadline.daysRemaining')}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
        <KpiCard
          eyebrow={t('compliance.kpi.expired.eyebrow')}
          value={counts.expired.toString()}
          subtitle={<span className="text-danger">{t('compliance.kpi.expired.subtitle')}</span>}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('compliance.kpi.expiring.eyebrow')}
          value={counts.expiring.toString()}
          subtitle={<span className="text-warning-hover">{t('compliance.kpi.expiring.subtitle')}</span>}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('compliance.kpi.missing.eyebrow')}
          value={counts.missing.toString()}
          subtitle={<span className="text-danger">{t('compliance.kpi.missing.subtitle')}</span>}
          icon={FileQuestion}
        />
        {/* HALAL-UNDERREVIEW: Under Review now has its own visible KPI home —
            first-class, not a silent second-class state. */}
        <KpiCard
          eyebrow={t('compliance.kpi.underReview.eyebrow')}
          value={counts.underReview.toString()}
          subtitle={t('compliance.kpi.underReview.subtitle')}
          icon={RefreshCw}
        />
        <KpiCard
          eyebrow={t('compliance.kpi.valid.eyebrow')}
          value={counts.valid.toString()}
          subtitle={t('compliance.kpi.valid.subtitle')}
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterChipsBar<StatusFilter>
          options={STATUS_OPTIONS.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterChipsBar<CategoryFilter>
          options={CATEGORY_OPTIONS.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <span className="text-meta text-text-tertiary">
          {t('compliance.filter.summary', {
            filtered: filtered.length,
            total: rows.length,
          })}
        </span>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('compliance.table.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.certificate')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.category')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.issuedBy')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.expiry')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.status')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.actionRequired')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('compliance.table.remind')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map(({ entry, status, days, category, remind }) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-semibold text-text-primary">
                    {entry.supplierName}
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">
                  <div>{t(certTypeLabelKey(entry.certType))}</div>
                  {entry.certNumber && (
                    <Data as="div" className="text-xs text-text-tertiary mt-0.5">
                      {entry.certNumber}
                    </Data>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill variant="neutral">{category}</StatusPill>
                </TableCell>
                <TableCell className="text-text-tertiary">
                  {entry.issuer || '—'}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-text-secondary whitespace-nowrap">
                    {fmtDate(entry.expiryDate)}
                  </div>
                  {days !== null && (
                    <div
                      className={`text-xs mt-0.5 ${
                        days <= 0
                          ? 'text-danger'
                          : days <= 90
                            ? 'text-warning-hover'
                            : 'text-text-tertiary'
                      }`}
                    >
                      {days <= 0
                        ? t('compliance.expiry.expiredAgo', { days: Math.abs(days) })
                        : t('compliance.expiry.remaining', { days })}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill variant={statusTone(status)}>
                    {status === 'Under Review' ? (
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw size={10} />
                        {status}
                      </span>
                    ) : (
                      status
                    )}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  {/* Descriptive of state, never imperative (D4): the label names
                      the state; it does not offer an action the SIMULATED cert
                      cannot back. */}
                  <span
                    className={`text-xs ${
                      status === 'Expired' || status === 'Missing'
                        ? 'text-danger'
                        : status === 'Expiring'
                          ? 'text-warning-hover'
                          : 'text-text-tertiary'
                    }`}
                  >
                    {t(actionLabelKey(status))}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {/* Remind is gated on remindEligible (lifecycleState Valid) —
                      the honest projection. Under Review / Missing certs are NOT
                      remind-eligible (HALAL-UNDERREVIEW mechanism, I3.1). */}
                  {remind && (
                    <Button
                      variant="outline"
                      icon={Bell}
                      onClick={() =>
                        toast({
                          variant: 'info',
                          title: t('compliance.toast.reminderQueued', {
                            supplier: entry.supplierName,
                          }),
                          description: t('compliance.toast.reminderDesc'),
                        })
                      }
                    >
                      {t('compliance.action.remind')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('compliance.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <Shield size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('compliance.phase2.title')}</strong>{' '}
          {t('compliance.phase2.body')}
        </span>
      </div>
    </AppShellV2>
  );
};

export default BuyerCompliance;
