import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Activity,
  Clock,
  Wallet,
  ArrowLeft,
  MessageSquare,
  ShoppingCart,
  ShieldCheck,
  Package,
  BarChart3,
  Settings,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import Tabs from '../components/ui-v2/Tabs';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { useSupplier } from '../services/query/hooks';
import { SupplierStatus, SupplierTier } from '../types/supplier.types';

const PROFILE_CRUMB = ['ACQUIRE', 'SUPPLIER DIRECTORY'];

const TIER_LABEL: Record<SupplierTier, string> = {
  [SupplierTier.WHATSAPP]: 'Tier 1 · WhatsApp',
  [SupplierTier.WEB]: 'Tier 2 · Web Portal',
  [SupplierTier.API]: 'Tier 3 · API/EDI',
};

const STATUS_VARIANT: Record<
  SupplierStatus,
  'success' | 'warning' | 'danger'
> = {
  [SupplierStatus.ACTIVE]: 'success',
  [SupplierStatus.ONBOARDING]: 'warning',
  [SupplierStatus.SUSPENDED]: 'danger',
};

const CATALOG_ITEMS = [
  { material: 'PET Bottle 100ml Airless Pump', sapCode: 'MAT-10045', moq: '10,000 PCS', leadTime: '14 days', unitPrice: 'Rp 3,700', capacity: '200,000 PCS/mo' },
  { material: 'PET Bottle 200ml Standard Pump', sapCode: 'MAT-10046', moq: '10,000 PCS', leadTime: '14 days', unitPrice: 'Rp 4,200', capacity: '150,000 PCS/mo' },
  { material: 'Airless Pump 15ml Travel Size', sapCode: 'MAT-10089', moq: '5,000 PCS', leadTime: '21 days', unitPrice: 'Rp 2,800', capacity: '100,000 PCS/mo' },
];

type ComplianceStatus = 'valid' | 'expiring' | 'expired' | 'missing';

const COMPLIANCE_DOCS: {
  name: string;
  status: ComplianceStatus;
  expiry: string | null;
  uploaded: string | null;
}[] = [
  { name: 'BPOM Registration', status: 'valid', expiry: '2026-12-31', uploaded: '2024-01-10' },
  { name: 'ISO 9001:2015', status: 'valid', expiry: '2026-08-14', uploaded: '2023-08-15' },
  { name: 'BPJPH Halal Cert', status: 'missing', expiry: null, uploaded: null },
  { name: 'SNI Compliance', status: 'expiring', expiry: '2026-05-01', uploaded: '2024-05-01' },
  { name: 'NPWP Tax ID', status: 'valid', expiry: null, uploaded: '2022-09-01' },
];

const RECENT_POS = [
  { poNum: 'PO-2026-00421', material: 'PET Bottle 100ml', qty: '50,000 PCS', value: 'Rp 185jT', ordered: '2026-03-10', delivery: '2026-03-24', otif: 'On Time', status: 'Delivered' },
  { poNum: 'PO-2026-00389', material: 'PET Bottle 200ml', qty: '30,000 PCS', value: 'Rp 126jT', ordered: '2026-02-18', delivery: '2026-03-05', otif: 'On Time', status: 'Delivered' },
  { poNum: 'PO-2026-00351', material: 'Airless Pump 15ml', qty: '20,000 PCS', value: 'Rp 56jT', ordered: '2026-01-25', delivery: '2026-02-18', otif: '+3 days', status: 'Delivered' },
  { poNum: 'PO-2025-00298', material: 'PET Bottle 100ml', qty: '40,000 PCS', value: 'Rp 148jT', ordered: '2025-12-10', delivery: '2025-12-24', otif: 'On Time', status: 'Delivered' },
];

const MSG_LOG = [
  { ts: '2026-04-07 10:24 WIB', direction: 'out', channel: 'whatsapp', docType: 'RFQ', preview: 'RFQ-2026-002 sent: PET Bottle 100ml Airless Pump, 50,000 PCS.', status: 'read' },
  { ts: '2026-04-07 10:26 WIB', direction: 'in', channel: 'whatsapp', docType: 'Reply', preview: 'Siap, kami akan submit quotation sebelum deadline.', status: 'read' },
  { ts: '2026-04-03 09:05 WIB', direction: 'out', channel: 'whatsapp', docType: 'PO', preview: 'PO-2026-00421 issued: 50,000 PCS, Rp 185jT.', status: 'delivered' },
  { ts: '2026-04-03 09:18 WIB', direction: 'in', channel: 'whatsapp', docType: 'Confirm', preview: 'Dikonfirmasi, PO sudah diterima dan akan diproses.', status: 'read' },
  { ts: '2026-03-22 14:00 WIB', direction: 'out', channel: 'email', docType: 'ASN Request', preview: 'Delivery for PO-2026-00389 due 2026-03-25. Submit ASN.', status: 'delivered' },
  { ts: '2026-03-23 08:45 WIB', direction: 'in', channel: 'email', docType: 'ASN', preview: 'ASN submitted. Tracking: TKI-221349. ETA 2026-03-25.', status: 'read' },
];

const COMPLIANCE_VARIANT: Record<
  ComplianceStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  missing: 'neutral',
};

const COMPLIANCE_ICON: Record<ComplianceStatus, React.ReactNode> = {
  valid: <CheckCircle2 size={14} />,
  expiring: <AlertTriangle size={14} />,
  expired: <XCircle size={14} />,
  missing: <XCircle size={14} />,
};

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
  missing: 'Missing',
};

type TabId =
  | 'overview'
  | 'comm'
  | 'compliance'
  | 'catalog'
  | 'performance'
  | 'msglog';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'comm', label: 'Communication Setup', icon: Settings },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'catalog', label: 'Catalog', icon: Package },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'msglog', label: 'Message Log', icon: MessageSquare },
];

const BuyerSupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const supplierQuery = useSupplier(id ?? '');
  const supp = supplierQuery.data ?? null;

  if (supplierQuery.isPending)
    return <LoadingState breadcrumb={PROFILE_CRUMB} />;
  if (supplierQuery.isError)
    return (
      <ErrorState
        breadcrumb={PROFILE_CRUMB}
        error={supplierQuery.error}
        onRetry={() => supplierQuery.refetch()}
      />
    );

  if (!supp) {
    return (
      <AppShellV2>
        <div className="py-20 text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            Supplier not found
          </div>
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/buyer/suppliers')}
          >
            Back to Directory
          </Button>
        </div>
      </AppShellV2>
    );
  }

  const initials = supp.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AppShellV2>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/buyer/suppliers')}
          className="inline-flex items-center gap-1 text-sm text-teal hover:text-teal-hover font-medium"
        >
          <ArrowLeft size={14} />
          Supplier Directory
        </button>
      </div>

      <PageHeader
        breadcrumb={['ACQUIRE', 'SUPPLIER DIRECTORY', supp.name.toUpperCase()]}
        title={supp.name}
        subtitle={`${supp.category} · ${supp.city}, ${supp.country} · ${TIER_LABEL[supp.tier]}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={MessageSquare}>
              Message
            </Button>
            <Button variant="primary" icon={ShoppingCart}>
              Create RFQ
            </Button>
          </div>
        }
      />

      {/* Overview card */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 shrink-0 rounded-lg bg-teal-soft text-teal flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusPill variant={STATUS_VARIANT[supp.status]}>
                {supp.status}
              </StatusPill>
              {supp.halalCertified && (
                <StatusPill variant="success">Halal Certified</StatusPill>
              )}
              {supp.bpomRegistered && (
                <StatusPill variant="info">BPOM Registered</StatusPill>
              )}
              <span className="text-xs font-mono text-text-tertiary">
                {supp.sapBpNumber}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-text-tertiary" />
                <span className="truncate">{supp.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-text-tertiary" />
                <span>{supp.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-text-tertiary" />
                <span>
                  {supp.city}, {supp.country}
                </span>
              </div>
              {supp.website && (
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-text-tertiary" />
                  <span className="truncate">{supp.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="OTIF"
          value={`${supp.otif}%`}
          subtitle="On-time, in-full"
          icon={Activity}
        />
        <KpiCard
          eyebrow="Lead Time Adherence"
          value={`${supp.leadTimeAdherence}%`}
          subtitle="Last 12 months"
          icon={Clock}
        />
        <KpiCard
          eyebrow="Invoice Accuracy"
          value={`${supp.invoiceAccuracy}%`}
          subtitle="Match rate"
          icon={ShieldCheck}
        />
        <KpiCard
          eyebrow="Scorecard Grade"
          value={supp.scorecardGrade}
          subtitle={`Rating ${supp.rating.toFixed(1)} / 5`}
          icon={Wallet}
        />
      </div>

      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        className="mb-6"
      />

      {activeTab === 'overview' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4">
            Company overview
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Legal name</dt>
              <dd className="text-text-primary">{supp.legalName ?? supp.name}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Tax ID</dt>
              <dd className="text-text-primary">{supp.taxId ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Business reg.</dt>
              <dd className="text-text-primary">{supp.businessRegNo ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Founded</dt>
              <dd className="text-text-primary">{supp.founded ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Employees</dt>
              <dd className="text-text-primary">{supp.employees ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Annual revenue</dt>
              <dd className="text-text-primary">{supp.annualRevenue ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Payment terms</dt>
              <dd className="text-text-primary">{supp.paymentTerms ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Incoterms</dt>
              <dd className="text-text-primary">{supp.incoterms ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Onboarded</dt>
              <dd className="text-text-primary">{supp.onboardedDate}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Last activity</dt>
              <dd className="text-text-primary">{supp.lastActivityDate}</dd>
            </div>
          </dl>
          {supp.intelligenceNote && (
            <div className="mt-5 p-4 bg-teal-soft border border-teal/20 rounded-md text-sm text-text-secondary">
              <strong className="text-text-primary">Intelligence note:</strong>{' '}
              {supp.intelligenceNote}
            </div>
          )}
        </section>
      )}

      {activeTab === 'comm' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4">
            Communication setup
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Preferred channel</dt>
              <dd className="text-text-primary">{supp.preferredChannel}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Connectivity tier</dt>
              <dd className="text-text-primary">{TIER_LABEL[supp.tier]}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Primary contact</dt>
              <dd className="text-text-primary">{supp.contactName}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Phone</dt>
              <dd className="text-text-primary">{supp.phone}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Email</dt>
              <dd className="text-text-primary">{supp.email}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">Business-hours only</dt>
              <dd className="text-text-primary">Yes</dd>
            </div>
          </dl>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary">Reset to defaults</Button>
            <Button variant="primary">Save profile</Button>
          </div>
        </section>
      )}

      {activeTab === 'compliance' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <span className="text-sm font-semibold text-text-primary">
              Compliance documents
            </span>
            <StatusPill variant="neutral">Sample data</StatusPill>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>Document</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Uploaded</TableHeaderCell>
              <TableHeaderCell>Expires</TableHeaderCell>
            </TableHeader>
            <tbody>
              {COMPLIANCE_DOCS.map((doc) => (
                <TableRow key={doc.name}>
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {doc.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={COMPLIANCE_VARIANT[doc.status]}>
                      <span className="inline-flex items-center gap-1">
                        {COMPLIANCE_ICON[doc.status]}
                        {COMPLIANCE_LABEL[doc.status]}
                      </span>
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {doc.uploaded ?? '—'}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {doc.expiry ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {activeTab === 'catalog' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <span className="text-sm font-semibold text-text-primary">
              Catalog
            </span>
            <StatusPill variant="neutral">Sample data</StatusPill>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>Material</TableHeaderCell>
              <TableHeaderCell>SAP Code</TableHeaderCell>
              <TableHeaderCell>MOQ</TableHeaderCell>
              <TableHeaderCell>Lead time</TableHeaderCell>
              <TableHeaderCell className="text-right">Unit price</TableHeaderCell>
              <TableHeaderCell>Capacity</TableHeaderCell>
            </TableHeader>
            <tbody>
              {CATALOG_ITEMS.map((m) => (
                <TableRow key={m.sapCode}>
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {m.material}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-tertiary">
                    {m.sapCode}
                  </TableCell>
                  <TableCell className="text-text-secondary">{m.moq}</TableCell>
                  <TableCell className="text-text-secondary">
                    {m.leadTime}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary">
                    {m.unitPrice}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {m.capacity}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {activeTab === 'performance' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border-subtle">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-text-primary">
                Recent purchase orders
              </h2>
              <StatusPill variant="neutral">Sample data</StatusPill>
            </div>
            <p className="text-meta text-text-tertiary">
              Last 4 closed POs with OTIF performance. Wires to live purchase
              orders in Batch 1.2.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>PO #</TableHeaderCell>
              <TableHeaderCell>Material</TableHeaderCell>
              <TableHeaderCell>Qty</TableHeaderCell>
              <TableHeaderCell className="text-right">Value</TableHeaderCell>
              <TableHeaderCell>Ordered</TableHeaderCell>
              <TableHeaderCell>Delivery</TableHeaderCell>
              <TableHeaderCell>OTIF</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHeader>
            <tbody>
              {RECENT_POS.map((po) => (
                <TableRow key={po.poNum}>
                  <TableCell className="font-mono text-xs text-text-primary">
                    {po.poNum}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {po.material}
                  </TableCell>
                  <TableCell className="text-text-secondary">{po.qty}</TableCell>
                  <TableCell className="text-right font-semibold text-text-primary">
                    {po.value}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {po.ordered}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {po.delivery}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      variant={po.otif === 'On Time' ? 'success' : 'warning'}
                    >
                      {po.otif}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant="success">{po.status}</StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {activeTab === 'msglog' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <span className="text-sm font-semibold text-text-primary">
              Message log
            </span>
            <StatusPill variant="neutral">Sample data</StatusPill>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>Direction</TableHeaderCell>
              <TableHeaderCell>Channel</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Preview</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHeader>
            <tbody>
              {MSG_LOG.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs text-text-tertiary whitespace-nowrap">
                    {m.ts}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={m.direction === 'in' ? 'info' : 'neutral'}>
                      {m.direction === 'in' ? 'Inbound' : 'Outbound'}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-secondary capitalize">
                    {m.channel}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {m.docType}
                  </TableCell>
                  <TableCell className="text-text-secondary max-w-md truncate">
                    {m.preview}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      variant={m.status === 'read' ? 'success' : 'neutral'}
                    >
                      {m.status}
                    </StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </section>
      )}
    </AppShellV2>
  );
};

export default BuyerSupplierProfile;
