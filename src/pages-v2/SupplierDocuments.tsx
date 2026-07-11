import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Files,
  Upload,
  UploadCloud,
  Eye,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import type {
  SupplierDocument,
  SupplierDocumentStatus as DocStatus,
  SupplierDocumentCategory as DocCategory,
} from '../services/data/types';
import { useDocuments } from '../services/query/hooks';
import { formatDate } from '../lib/format';
import { useTranslation } from 'react-i18next';

type CategoryFilter = 'All' | DocCategory;

const STATUS_VARIANT: Record<DocStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Valid: 'success',
  'Expiring Soon': 'warning',
  Expired: 'danger',
  'Awaiting Upload': 'neutral',
  'Under Review': 'neutral',
};

// Filter chip ids are the CANONICAL EN category values matched against
// `d.category` (stored-as-data) — never translate the `id`. Only the display
// label localizes; the option list is built in-component so `t` is available.
const CATEGORY_FILTERS: { id: CategoryFilter; labelKey: string }[] = [
  { id: 'All', labelKey: 'supplierDocuments.category.all' },
  { id: 'Halal Compliance', labelKey: 'supplierDocuments.category.halal' },
  { id: 'BPOM Regulatory', labelKey: 'supplierDocuments.category.bpom' },
  { id: 'Tax & Legal', labelKey: 'supplierDocuments.category.taxLegal' },
  { id: 'Quality', labelKey: 'supplierDocuments.category.quality' },
  { id: 'Contract', labelKey: 'supplierDocuments.category.contract' },
];

const daysUntil = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
};


type PanelMode = 'closed' | 'new' | 'upload-existing' | 'view';

const SupplierDocuments: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
  const docsCrumb = [
    t('supplierDocuments.crumb.settle'),
    t('supplierDocuments.crumb.myDocuments'),
  ];
  const categoryOptions = CATEGORY_FILTERS.map((c) => ({
    id: c.id,
    label: t(c.labelKey),
  }));
  const docsQuery = useDocuments();
  const docs = docsQuery.data?.items ?? [];
  const [filterCat, setFilterCat] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [activeDoc, setActiveDoc] = useState<SupplierDocument | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        const matchCat = filterCat === 'All' || d.category === filterCat;
        const q = search.toLowerCase();
        const matchSearch =
          q === '' ||
          d.name.toLowerCase().includes(q) ||
          d.issuedBy.toLowerCase().includes(q);
        return matchCat && matchSearch;
      }),
    [filterCat, search, docs],
  );

  const expiringSoon = useMemo(
    () =>
      docs.filter((d) => {
        const days = daysUntil(d.expiryDate);
        return days !== null && days > 0 && days <= 180;
      }),
    [docs],
  );
  const expired = useMemo(
    () =>
      docs.filter((d) => {
        const days = daysUntil(d.expiryDate);
        return days !== null && days <= 0;
      }),
    [docs],
  );
  const awaitingUpload = useMemo(
    () => docs.filter((d) => d.status === 'Awaiting Upload'),
    [docs],
  );
  const validCount = useMemo(
    () => docs.filter((d) => d.status === 'Valid').length,
    [docs],
  );

  const today = formatDate(new Date());

  const openUploadFor = (doc: SupplierDocument) => {
    setActiveDoc(doc);
    setUploaded(false);
    setPanelMode('upload-existing');
  };

  const openNewUpload = () => {
    setActiveDoc(null);
    setUploaded(false);
    setPanelMode('new');
  };

  const closePanel = () => {
    setPanelMode('closed');
    setActiveDoc(null);
    setUploaded(false);
  };

  const submitUpload = () => {
    setUploaded(true);
    toast({
      variant: 'success',
      title: t('supplierDocuments.toast.uploaded.title'),
      description: t('supplierDocuments.toast.uploaded.desc'),
    });
  };

  const panelTitle =
    panelMode === 'new'
      ? t('supplierDocuments.panel.newTitle')
      : panelMode === 'upload-existing' && activeDoc
        ? t('supplierDocuments.panel.uploadTitle', {
            name: activeDoc.name.split('—')[0].trim(),
          })
        : '';

  if (!supplierId) return <NoSupplierIdentity />;
  if (docsQuery.isPending) return <LoadingState breadcrumb={docsCrumb} />;
  if (docsQuery.isError)
    return (
      <ErrorState
        breadcrumb={docsCrumb}
        error={docsQuery.error}
        onRetry={() => docsQuery.refetch()}
      />
    );
  if (docs.length === 0)
    return (
      <EmptyState
        breadcrumb={docsCrumb}
        title={t('supplierDocuments.empty.title')}
        subtitle={t('supplierDocuments.empty.subtitle', {
          name: supplierName ?? t('supplierDocuments.empty.supplierFallback'),
        })}
        message={t('supplierDocuments.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={docsCrumb}
        title={t('supplierDocuments.header.title')}
        subtitle={t('supplierDocuments.header.subtitle', {
          name: supplierName ?? t('supplierDocuments.common.supplierFallback'),
        })}
        actions={
          <BulkActionsBar
            primary={{
              label: t('supplierDocuments.action.uploadDoc'),
              icon: Upload,
              onClick: openNewUpload,
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {docs.length === 1
          ? t('supplierDocuments.meta.summary.one', { count: docs.length, date: today })
          : t('supplierDocuments.meta.summary.other', { count: docs.length, date: today })}
      </PageMetaLine>

      {expired.length > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {expired.length === 1
                ? t('supplierDocuments.alert.expired.one', { count: expired.length })
                : t('supplierDocuments.alert.expired.other', { count: expired.length })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture document names) */}
            {expired.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-3 text-sm text-warning-hover flex items-start gap-2">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {expiringSoon.length === 1
                ? t('supplierDocuments.alert.expiring.one', { count: expiringSoon.length })
                : t('supplierDocuments.alert.expiring.other', { count: expiringSoon.length })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture document names) */}
            {expiringSoon.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {awaitingUpload.length > 0 && (
        <div className="bg-bg-hover border-l-2 border-border-input rounded px-4 py-3 mb-6 text-sm text-text-secondary flex items-start gap-2">
          <UploadCloud size={14} className="shrink-0 mt-0.5 text-text-tertiary" />
          <div>
            <strong className="text-text-primary">
              {awaitingUpload.length === 1
                ? t('supplierDocuments.alert.awaiting.one', { count: awaitingUpload.length })
                : t('supplierDocuments.alert.awaiting.other', { count: awaitingUpload.length })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture linked-to refs) */}
            {awaitingUpload.map((d) => d.linkedTo).join(' · ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierDocuments.kpi.total.eyebrow')}
          value={docs.length.toString()}
          subtitle={t('supplierDocuments.kpi.total.subtitle')}
          icon={Files}
        />
        <KpiCard
          eyebrow={t('supplierDocuments.kpi.valid.eyebrow')}
          value={validCount.toString()}
          subtitle={t('supplierDocuments.kpi.valid.subtitle')}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('supplierDocuments.kpi.expiring.eyebrow')}
          value={expiringSoon.length.toString()}
          subtitle={
            <span className="text-warning-hover">
              {t('supplierDocuments.kpi.expiring.subtitle')}
            </span>
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('supplierDocuments.kpi.expired.eyebrow')}
          value={expired.length.toString()}
          subtitle={
            <span className="text-danger">
              {t('supplierDocuments.kpi.expired.subtitle')}
            </span>
          }
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('supplierDocuments.kpi.needsAction.eyebrow')}
          value={awaitingUpload.length.toString()}
          subtitle={t('supplierDocuments.kpi.needsAction.subtitle')}
          icon={UploadCloud}
        />
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('supplierDocuments.search.placeholder')}
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterChipsBar<CategoryFilter>
            options={categoryOptions}
            value={filterCat}
            onChange={setFilterCat}
          />
          <span className="text-meta text-text-tertiary">
            {t('supplierDocuments.filter.count', {
              shown: filtered.length,
              total: docs.length,
            })}
          </span>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierDocuments.table.document')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierDocuments.table.category')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierDocuments.table.issuedBy')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierDocuments.table.issued')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierDocuments.table.expiry')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierDocuments.table.status')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierDocuments.table.version')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierDocuments.table.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((doc) => {
              const days = daysUntil(doc.expiryDate);
              const expiryColor =
                days === null
                  ? 'text-text-tertiary'
                  : days <= 0
                    ? 'text-danger'
                    : days <= 90
                      ? 'text-warning-hover'
                      : 'text-text-tertiary';
              return (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-semibold text-text-primary text-sm max-w-[18rem]">
                      {doc.name}
                    </div>
                    {doc.notes && (
                      <div className="text-xs text-warning-hover mt-0.5 max-w-[18rem]">
                        ⚠ {doc.notes}
                      </div>
                    )}
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {t('supplierDocuments.row.linked', { value: doc.linkedTo })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Category pill renders the canonical EN token: no central
                        category-label map yet (filter-vs-pill split, see fragment header). */}
                    <StatusPill variant="neutral">{doc.category}</StatusPill>
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs max-w-[12rem]">
                    {doc.issuedBy}
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
                    <Data>{formatDate(doc.issuedDate)}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {doc.expiryDate ? (
                      <div>
                        <Data
                          as="div"
                          className={`text-xs ${
                            days !== null && days <= 90
                              ? 'text-warning-hover'
                              : 'text-text-tertiary'
                          }`}
                        >
                          {formatDate(doc.expiryDate)}
                        </Data>
                        {days !== null && (
                          <div className={`text-xs ${expiryColor}`}>
                            {days > 0
                              ? t('supplierDocuments.expiry.remaining', { count: days })
                              : t('supplierDocuments.expiry.expiredAgo', {
                                  count: Math.abs(days),
                                })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary text-xs">
                        {t('supplierDocuments.expiry.none')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[doc.status]}>
                      {doc.status === 'Under Review' ? (
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw size={10} />
                          {doc.status}
                        </span>
                      ) : (
                        doc.status
                      )}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs">
                    <Data>{doc.version}</Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      {doc.status === 'Awaiting Upload' ? (
                        <Button
                          variant="outline"
                          icon={Upload}
                          onClick={() => openUploadFor(doc)}
                        >
                          {t('supplierDocuments.action.upload')}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          icon={Eye}
                          onClick={() =>
                            toast({
                              title: t('supplierDocuments.toast.downloading', {
                                name: doc.name,
                              }),
                            })
                          }
                        >
                          {t('supplierDocuments.action.view')}
                        </Button>
                      )}
                      {doc.expiryDate && days !== null && days <= 180 && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            toast({
                              variant: 'info',
                              title: t('supplierDocuments.toast.renewStarted', {
                                name: doc.name.split('—')[0].trim(),
                              }),
                            })
                          }
                        >
                          {t('supplierDocuments.action.renew')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('supplierDocuments.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <FileText size={14} className="text-warning-hover shrink-0 mt-0.5" />
        <div>
          <strong className="text-warning-hover">
            {t('supplierDocuments.bpjph.title')}
          </strong>{' '}
          {t('supplierDocuments.bpjph.body')}{' '}
          <a
            href="https://halal.go.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warning-hover font-semibold inline-flex items-center gap-1 hover:underline"
          >
            halal.go.id
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <SidePanel
        open={panelMode !== 'closed'}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          <>
            <Button variant="secondary" onClick={closePanel}>
              {uploaded
                ? t('supplierDocuments.action.close')
                : t('supplierDocuments.action.cancel')}
            </Button>
            {!uploaded && (
              <Button
                variant="outline"
                icon={Upload}
                onClick={submitUpload}
              >
                {t('supplierDocuments.action.submit')}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {activeDoc && (
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                {t('supplierDocuments.panel.document')}
              </h3>
              {/* i18n-defer: mock/sample data (fixture document name) */}
              <div className="text-sm font-semibold text-text-primary">
                {activeDoc.name}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {t('supplierDocuments.row.linked', { value: activeDoc.linkedTo })}
              </div>
              {activeDoc.notes && (
                <div className="mt-2 bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
                  {activeDoc.notes}
                </div>
              )}
            </section>
          )}

          {!uploaded ? (
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                {t('supplierDocuments.panel.uploadFile')}
              </h3>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  submitUpload();
                }}
                className="border-2 border-dashed border-border-input rounded-md p-8 text-center bg-bg-hover cursor-pointer hover:border-teal transition-colors"
              >
                <UploadCloud
                  size={28}
                  className="text-teal mx-auto mb-2"
                  aria-hidden="true"
                />
                <div className="text-sm font-semibold text-text-primary">
                  {t('supplierDocuments.panel.dropzone.title')}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {t('supplierDocuments.panel.dropzone.hint')}
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-success-soft border-l-2 border-success rounded px-4 py-3 text-sm text-success font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t('supplierDocuments.panel.uploadedMsg')}
            </section>
          )}
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierDocuments;
