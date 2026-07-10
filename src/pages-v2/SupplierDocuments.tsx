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

const DOCS_CRUMB = ['SETTLE', 'MY DOCUMENTS'];

type CategoryFilter = 'All' | DocCategory;

const STATUS_VARIANT: Record<DocStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Valid: 'success',
  'Expiring Soon': 'warning',
  Expired: 'danger',
  'Awaiting Upload': 'neutral',
  'Under Review': 'neutral',
};

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Halal Compliance', label: 'Halal' },
  { id: 'BPOM Regulatory', label: 'BPOM' },
  { id: 'Tax & Legal', label: 'Tax & Legal' },
  { id: 'Quality', label: 'Quality' },
  { id: 'Contract', label: 'Contract' },
];

const daysUntil = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
};


type PanelMode = 'closed' | 'new' | 'upload-existing' | 'view';

const SupplierDocuments: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
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
      title: 'Document uploaded',
      description: 'Pending Paragon review.',
    });
  };

  const panelTitle =
    panelMode === 'new'
      ? 'Upload new document'
      : panelMode === 'upload-existing' && activeDoc
        ? `Upload — ${activeDoc.name.split('—')[0].trim()}`
        : '';

  if (!supplierId) return <NoSupplierIdentity />;
  if (docsQuery.isPending) return <LoadingState breadcrumb={DOCS_CRUMB} />;
  if (docsQuery.isError)
    return (
      <ErrorState
        breadcrumb={DOCS_CRUMB}
        error={docsQuery.error}
        onRetry={() => docsQuery.refetch()}
      />
    );
  if (docs.length === 0)
    return (
      <EmptyState
        breadcrumb={DOCS_CRUMB}
        title="No documents yet"
        subtitle={`No documents on file for ${supplierName ?? 'this supplier'}.`}
        message="Uploaded certifications, COAs, and contracts will appear here."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['SETTLE', 'MY DOCUMENTS']}
        title="My Documents"
        subtitle={`Certifications, compliance documents, COAs, and contracts · Halal & BPOM tracking — ${supplierName ?? 'Supplier'}.`}
        actions={
          <BulkActionsBar
            primary={{
              label: 'Upload document',
              icon: Upload,
              onClick: openNewUpload,
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {docs.length} documents · last refreshed {today}
      </PageMetaLine>

      {expired.length > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {expired.length} expired document
              {expired.length > 1 ? 's' : ''} — immediate renewal required:{' '}
            </strong>
            {expired.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-3 text-sm text-warning flex items-start gap-2">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {expiringSoon.length} document
              {expiringSoon.length > 1 ? 's' : ''} expiring within 6 months:{' '}
            </strong>
            {expiringSoon.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {awaitingUpload.length > 0 && (
        <div className="bg-bg-hover border-l-2 border-border-input rounded px-4 py-3 mb-6 text-sm text-text-secondary flex items-start gap-2">
          <UploadCloud size={14} className="shrink-0 mt-0.5 text-text-tertiary" />
          <div>
            <strong className="text-text-primary">
              {awaitingUpload.length} document
              {awaitingUpload.length > 1 ? 's' : ''} awaiting upload:{' '}
            </strong>
            {awaitingUpload.map((d) => d.linkedTo).join(' · ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-6">
        <KpiCard
          eyebrow="Total Documents"
          value={docs.length.toString()}
          subtitle="In document vault"
          icon={Files}
        />
        <KpiCard
          eyebrow="Valid"
          value={validCount.toString()}
          subtitle="In good standing"
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Expiring ≤180d"
          value={expiringSoon.length.toString()}
          subtitle={<span className="text-warning">Renewal window open</span>}
          icon={Clock}
        />
        <KpiCard
          eyebrow="Expired"
          value={expired.length.toString()}
          subtitle={<span className="text-danger">Blocks new POs</span>}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="Needs Action"
          value={awaitingUpload.length.toString()}
          subtitle="Upload required"
          icon={UploadCloud}
        />
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search documents by name or issuer…"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterChipsBar<CategoryFilter>
            options={CATEGORIES}
            value={filterCat}
            onChange={setFilterCat}
          />
          <span className="text-meta text-text-tertiary">
            {filtered.length} of {docs.length} documents
          </span>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>Document</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Issued by</TableHeaderCell>
            <TableHeaderCell>Issued</TableHeaderCell>
            <TableHeaderCell>Expiry</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Ver.</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
                      ? 'text-warning'
                      : 'text-text-tertiary';
              return (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-semibold text-text-primary text-sm max-w-[18rem]">
                      {doc.name}
                    </div>
                    {doc.notes && (
                      <div className="text-xs text-warning mt-0.5 max-w-[18rem]">
                        ⚠ {doc.notes}
                      </div>
                    )}
                    <div className="text-xs text-text-tertiary mt-0.5">
                      Linked: {doc.linkedTo}
                    </div>
                  </TableCell>
                  <TableCell>
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
                              ? 'text-warning'
                              : 'text-text-tertiary'
                          }`}
                        >
                          {formatDate(doc.expiryDate)}
                        </Data>
                        {days !== null && (
                          <div className={`text-xs ${expiryColor}`}>
                            {days > 0
                              ? `${days}d remaining`
                              : `Expired ${Math.abs(days)}d ago`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary text-xs">
                        No expiry
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
                          Upload
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          icon={Eye}
                          onClick={() =>
                            toast({ title: `Downloading ${doc.name}` })
                          }
                        >
                          View
                        </Button>
                      )}
                      {doc.expiryDate && days !== null && days <= 180 && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            toast({
                              variant: 'info',
                              title: `Renewal workflow started for ${doc.name
                                .split('—')[0]
                                .trim()}`,
                            })
                          }
                        >
                          Renew
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
                  No documents match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <FileText size={14} className="text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="text-warning">
            BPJPH Halal Mandatory Transition — October 2026:
          </strong>{' '}
          All cosmetics and personal care products distributed in Indonesia must
          carry BPJPH-issued halal certification. MUI certificates issued before
          the transition remain valid until expiry but cannot be renewed — new
          BPJPH certification must be obtained.{' '}
          <a
            href="https://halal.go.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warning font-semibold inline-flex items-center gap-1 hover:underline"
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
              {uploaded ? 'Close' : 'Cancel'}
            </Button>
            {!uploaded && (
              <Button
                variant="outline"
                icon={Upload}
                onClick={submitUpload}
              >
                Submit
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {activeDoc && (
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                Document
              </h3>
              <div className="text-sm font-semibold text-text-primary">
                {activeDoc.name}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                Linked: {activeDoc.linkedTo}
              </div>
              {activeDoc.notes && (
                <div className="mt-2 bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning">
                  {activeDoc.notes}
                </div>
              )}
            </section>
          )}

          {!uploaded ? (
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                Upload file
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
                  Drop file here or click to browse
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  PDF, JPG, PNG · Max 20 MB
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-success-soft border-l-2 border-success rounded px-4 py-3 text-sm text-success font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              Document uploaded — pending Paragon review.
            </section>
          )}
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierDocuments;
