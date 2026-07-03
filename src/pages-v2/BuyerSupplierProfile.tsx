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
import {
  useSupplier,
  useStorefrontCatalog,
  useStorefrontCerts,
  usePurchaseOrders,
} from '../services/query/hooks';
import { formatIDR, formatNumber, formatDate } from '../lib/format';
import { SupplierStatus, SupplierTier } from '../types/supplier.types';
import type { ProfileCertStatus, PurchaseOrder } from '../services/data/types';

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

const DAY_MS = 24 * 60 * 60 * 1000;

// OTIF label derived page-side from canonical PO fields (there is no OTIF-per-PO
// service field — a real metric waits for performance analytics to need it):
// overdue → "+Nd"; else slip = confirmed − requested delivery; late → "+N days";
// otherwise "On Time".
const deriveOtif = (po: PurchaseOrder): string => {
  if (po.daysOverdue > 0) return `+${po.daysOverdue}d`;
  const req = new Date(po.requestedDeliveryDate).getTime();
  const conf = new Date(po.confirmedDeliveryDate).getTime();
  const slip = Math.round((conf - req) / DAY_MS);
  return Number.isFinite(slip) && slip > 0 ? `+${slip} days` : 'On Time';
};

const MSG_LOG = [
  { ts: '2026-04-07 10:24 WIB', direction: 'out', channel: 'whatsapp', docType: 'RFQ', preview: 'RFQ-2026-002 sent: PET Bottle 100ml Airless Pump, 50,000 PCS.', status: 'read' },
  { ts: '2026-04-07 10:26 WIB', direction: 'in', channel: 'whatsapp', docType: 'Reply', preview: 'Siap, kami akan submit quotation sebelum deadline.', status: 'read' },
  { ts: '2026-04-03 09:05 WIB', direction: 'out', channel: 'whatsapp', docType: 'PO', preview: 'PO-2026-00421 issued: 50,000 PCS, Rp 185jT.', status: 'delivered' },
  { ts: '2026-04-03 09:18 WIB', direction: 'in', channel: 'whatsapp', docType: 'Confirm', preview: 'Dikonfirmasi, PO sudah diterima dan akan diproses.', status: 'read' },
  { ts: '2026-03-22 14:00 WIB', direction: 'out', channel: 'email', docType: 'ASN Request', preview: 'Delivery for PO-2026-00389 due 2026-03-25. Submit ASN.', status: 'delivered' },
  { ts: '2026-03-23 08:45 WIB', direction: 'in', channel: 'email', docType: 'ASN', preview: 'ASN submitted. Tracking: TKI-221349. ETA 2026-03-25.', status: 'read' },
];

const COMPLIANCE_VARIANT: Record<
  ProfileCertStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  missing: 'neutral',
  pending: 'warning',
};

const COMPLIANCE_ICON: Record<ProfileCertStatus, React.ReactNode> = {
  valid: <CheckCircle2 size={14} />,
  expiring: <AlertTriangle size={14} />,
  expired: <XCircle size={14} />,
  missing: <XCircle size={14} />,
  pending: <Clock size={14} />,
};

const COMPLIANCE_LABEL: Record<ProfileCertStatus, string> = {
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
  missing: 'Missing',
  pending: 'Pending',
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

  // Catalog + compliance fold onto the storefront reads, scoped to this
  // supplier id (replacing the former inline "Sample data" consts).
  const catalogQuery = useStorefrontCatalog(id ?? '');
  const certsQuery = useStorefrontCerts(id ?? '');
  const catalog = catalogQuery.data?.items ?? [];
  const certs = certsQuery.data?.items ?? [];

  // Recent purchase orders for this supplier — replaces the former inline
  // RECENT_POS "Sample data" const (scoped server-side via the supplierId filter).
  const ordersQuery = usePurchaseOrders({ supplierId: id });

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

  const recentPOs = [...(ordersQuery.data?.items ?? [])]
    .sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1))
    .slice(0, 4);

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
          <div className="w-16 h-16 shrink-0 rounded-lg bg-action-soft text-action-hover flex items-center justify-center text-xl font-semibold">
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
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>Document</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Uploaded</TableHeaderCell>
              <TableHeaderCell>Expires</TableHeaderCell>
            </TableHeader>
            <tbody>
              {certs.map((doc) => (
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
              {certs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-sm text-text-tertiary py-8"
                  >
                    No compliance documents on file.
                  </td>
                </tr>
              )}
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
              {catalog.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {m.material}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-tertiary">
                    {m.sapCode}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {m.moq} {m.uom}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {m.leadTime} days
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary">
                    Rp {m.unitPrice}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {m.capacity} {m.uom}/mo
                  </TableCell>
                </TableRow>
              ))}
              {catalog.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-sm text-text-tertiary py-8"
                  >
                    No catalog items published.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </section>
      )}

      {activeTab === 'performance' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary mb-1">
              Recent purchase orders
            </h2>
            <p className="text-meta text-text-tertiary">
              This supplier's most recent purchase orders with derived OTIF.
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
              {recentPOs.map((po) => {
                const line = po.lineItems[0];
                const otif = deriveOtif(po);
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs text-text-primary">
                      {po.poNumber}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {line?.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {line ? `${formatNumber(line.quantity)} ${line.uom}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-text-primary">
                      {formatIDR(po.totalValue, { compact: true })}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {formatDate(po.orderDate)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {formatDate(po.confirmedDeliveryDate)}
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={otif === 'On Time' ? 'success' : 'warning'}>
                        {otif}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant="success">{po.status}</StatusPill>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recentPOs.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-sm text-text-tertiary py-8"
                  >
                    No purchase orders for this supplier.
                  </td>
                </tr>
              )}
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
