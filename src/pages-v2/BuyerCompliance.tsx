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

// Option ids stay canonical EN (they drive filtering against fixture values);
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
  { id: 'Environmental', labelKey: 'compliance.filter.category.environmental' },
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

      <PageMetaLine className="-mt-6 mb-6">
        {t('compliance.meta.summary', { count: COMPLIANCE_ITEMS.length, date: today })}
      </PageMetaLine>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
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
            total: COMPLIANCE_ITEMS.length,
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
            <TableHeaderCell>{t('compliance.table.priority')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.actionRequired')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('compliance.table.remind')}</TableHeaderCell>
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
                              ? 'text-warning-hover'
                              : 'text-text-tertiary'
                        }`}
                      >
                        {item.daysRemaining <= 0
                          ? t('compliance.expiry.expiredAgo', {
                              days: Math.abs(item.daysRemaining),
                            })
                          : t('compliance.expiry.remaining', {
                              days: item.daysRemaining,
                            })}
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
                            ? 'text-warning-hover'
                            : 'text-text-tertiary'
                      }`}
                    >
                      {/* i18n-defer: mock/sample data (fixture-derived per-row action) */}
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
                            title: t('compliance.toast.reminderQueued', {
                              supplier: item.supplier,
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
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
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
