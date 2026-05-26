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
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';

type DocStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Awaiting Upload' | 'Under Review';
type DocCategory =
  | 'Halal Compliance'
  | 'BPOM Regulatory'
  | 'Tax & Legal'
  | 'Quality'
  | 'Contract'
  | 'Other';
type CategoryFilter = 'All' | DocCategory;

interface SupplierDocument {
  id: string;
  name: string;
  category: DocCategory;
  status: DocStatus;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string | null;
  fileType: string;
  fileSize: string;
  version: string;
  linkedTo: string;
  notes?: string;
}

const DOCUMENTS: SupplierDocument[] = [
  { id: 'doc-001', name: 'Halal Certificate — MUI No. 01011234561020', category: 'Halal Compliance', status: 'Expiring Soon', issuedBy: 'MUI (Majelis Ulama Indonesia)', issuedDate: '2023-09-01', expiryDate: '2026-05-15', fileType: 'PDF', fileSize: '1.2 MB', version: 'v3', linkedTo: 'PK-PETB-8801, PK-PETB-8810', notes: 'BPJPH mandatory renewal required by October 2026' },
  { id: 'doc-002', name: 'BPOM Notification — TD.01.01.55.09.22.0142', category: 'BPOM Regulatory', status: 'Valid', issuedBy: 'BPOM (Badan Pengawas Obat dan Makanan)', issuedDate: '2022-09-15', expiryDate: '2027-09-14', fileType: 'PDF', fileSize: '860 KB', version: 'v1', linkedTo: 'PK-PETB-8801' },
  { id: 'doc-003', name: 'NPWP Certificate — 01.234.567.8-041.000', category: 'Tax & Legal', status: 'Valid', issuedBy: 'Dirjen Pajak — DJP Indonesia', issuedDate: '2010-03-12', expiryDate: null, fileType: 'PDF', fileSize: '420 KB', version: 'v1', linkedTo: 'All POs' },
  { id: 'doc-004', name: 'PKP Registration — Pengusaha Kena Pajak', category: 'Tax & Legal', status: 'Valid', issuedBy: 'KPP Pratama Tangerang', issuedDate: '2010-05-20', expiryDate: null, fileType: 'PDF', fileSize: '310 KB', version: 'v1', linkedTo: 'All Invoices' },
  { id: 'doc-005', name: 'ISO 9001:2015 Quality Management Certificate', category: 'Quality', status: 'Valid', issuedBy: 'TÜV Rheinland Indonesia', issuedDate: '2023-11-10', expiryDate: '2026-11-09', fileType: 'PDF', fileSize: '2.1 MB', version: 'v2', linkedTo: 'All materials' },
  { id: 'doc-006', name: 'COA — Batch PKG-2025-441 (PET Bottle Frosted)', category: 'Quality', status: 'Awaiting Upload', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '', expiryDate: null, fileType: '—', fileSize: '—', version: '—', linkedTo: 'PO-2025-00107 / PK-PETB-8801', notes: 'Required before GR posting in SAP. Please upload COA for batch PKG-2025-441.' },
  { id: 'doc-007', name: 'COA — Batch PKG-2025-398 (PET Bottle Clear)', category: 'Quality', status: 'Valid', issuedBy: 'PT Berlina Internal QC Lab', issuedDate: '2025-03-28', expiryDate: null, fileType: 'PDF', fileSize: '540 KB', version: 'v1', linkedTo: 'PO-2025-00109 / PK-PETB-8810' },
  { id: 'doc-008', name: 'Framework Supply Agreement — Paragon Corp 2025–2027', category: 'Contract', status: 'Valid', issuedBy: 'Paragon Corp Procurement', issuedDate: '2025-01-15', expiryDate: '2027-01-14', fileType: 'PDF', fileSize: '3.8 MB', version: 'v4', linkedTo: 'All POs' },
  { id: 'doc-009', name: 'NIB — Nomor Induk Berusaha (9120300123456)', category: 'Tax & Legal', status: 'Valid', issuedBy: 'OSS — Online Single Submission', issuedDate: '2018-07-01', expiryDate: null, fileType: 'PDF', fileSize: '220 KB', version: 'v1', linkedTo: 'Supplier Master Data' },
  { id: 'doc-010', name: 'Halal Assurance System (HAS) 23000 Manual', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'MUI LP POM', issuedDate: '2025-03-01', expiryDate: null, fileType: 'PDF', fileSize: '5.2 MB', version: 'v2', linkedTo: 'Halal Certificate renewal', notes: 'Submitted for BPJPH review — 2026 mandatory transition' },
  { id: 'doc-011', name: 'BPJPH Halal Certificate Application — In Progress', category: 'Halal Compliance', status: 'Under Review', issuedBy: 'BPJPH — Badan Penyelenggara Jaminan Produk Halal', issuedDate: '2026-01-10', expiryDate: null, fileType: 'PDF', fileSize: '1.8 MB', version: 'v1', linkedTo: 'Replaces MUI cert doc-001', notes: 'BPJPH application submitted January 2026 — awaiting inspection schedule' },
];

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

const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type PanelMode = 'closed' | 'new' | 'upload-existing' | 'view';

const SupplierDocuments: React.FC = () => {
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
  const [filterCat, setFilterCat] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [activeDoc, setActiveDoc] = useState<SupplierDocument | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const filtered = useMemo(
    () =>
      DOCUMENTS.filter((d) => {
        const matchCat = filterCat === 'All' || d.category === filterCat;
        const q = search.toLowerCase();
        const matchSearch =
          q === '' ||
          d.name.toLowerCase().includes(q) ||
          d.issuedBy.toLowerCase().includes(q);
        return matchCat && matchSearch;
      }),
    [filterCat, search],
  );

  const expiringSoon = useMemo(
    () =>
      DOCUMENTS.filter((d) => {
        const days = daysUntil(d.expiryDate);
        return days !== null && days > 0 && days <= 180;
      }),
    [],
  );
  const expired = useMemo(
    () =>
      DOCUMENTS.filter((d) => {
        const days = daysUntil(d.expiryDate);
        return days !== null && days <= 0;
      }),
    [],
  );
  const awaitingUpload = useMemo(
    () => DOCUMENTS.filter((d) => d.status === 'Awaiting Upload'),
    [],
  );
  const validCount = useMemo(
    () => DOCUMENTS.filter((d) => d.status === 'Valid').length,
    [],
  );

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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
        {DOCUMENTS.length} documents · last refreshed {today}
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
          value={DOCUMENTS.length.toString()}
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
            {filtered.length} of {DOCUMENTS.length} documents
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
                    {fmtDate(doc.issuedDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {doc.expiryDate ? (
                      <div>
                        <div
                          className={`text-xs ${
                            days !== null && days <= 90
                              ? 'text-warning'
                              : 'text-text-tertiary'
                          }`}
                        >
                          {fmtDate(doc.expiryDate)}
                        </div>
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
                    {doc.version}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      {doc.status === 'Awaiting Upload' ? (
                        <Button
                          variant="primary"
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
                variant="primary"
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
