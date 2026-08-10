import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import Tabs from '../components/ui-v2/Tabs';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import {
  useSupplier,
  useStorefrontCatalog,
  useStorefrontCerts,
  usePurchaseOrders,
} from '../services/query/hooks';
import { formatIDR, formatNumber, formatDate } from '../lib/format';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { useChannelLabel } from '../hooks/useChannelLabel';
import { SupplierStatus, SupplierTier } from '../types/supplier.types';
import type { ProfileCertStatus, PurchaseOrder } from '../services/data/types';

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

const BuyerSupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const chl = useChannelLabel();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const PROFILE_CRUMB = [
    t('buyerSupplierProfile.crumb.acquire'),
    t('buyerSupplierProfile.crumb.directory'),
  ];

  // Connectivity-tier display labels (WhatsApp/Web Portal/API are proper
  // nouns/protocols; only the "Tier N" word localizes).
  const TIER_LABEL: Record<SupplierTier, string> = {
    [SupplierTier.WHATSAPP]: t('buyerSupplierProfile.tier.whatsapp'),
    [SupplierTier.WEB]: t('buyerSupplierProfile.tier.web'),
    [SupplierTier.API]: t('buyerSupplierProfile.tier.api'),
  };

  const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: t('buyerSupplierProfile.tab.overview'), icon: ShieldCheck },
    { id: 'comm', label: t('buyerSupplierProfile.tab.comm'), icon: Settings },
    { id: 'compliance', label: t('buyerSupplierProfile.tab.compliance'), icon: ShieldCheck },
    { id: 'catalog', label: t('buyerSupplierProfile.tab.catalog'), icon: Package },
    { id: 'performance', label: t('buyerSupplierProfile.tab.performance'), icon: BarChart3 },
    { id: 'msglog', label: t('buyerSupplierProfile.tab.msglog'), icon: MessageSquare },
  ];

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
            {t('buyerSupplierProfile.notFound.title')}
          </div>
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/buyer/suppliers')}
          >
            {t('buyerSupplierProfile.notFound.back')}
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
          {t('buyerSupplierProfile.back.directory')}
        </button>
      </div>

      <PageHeader
        breadcrumb={[
          t('buyerSupplierProfile.crumb.acquire'),
          t('buyerSupplierProfile.crumb.directory'),
          supp.name.toUpperCase(),
        ]}
        title={supp.name}
        subtitle={`${cl(supp.category)} · ${supp.city}, ${supp.country} · ${TIER_LABEL[supp.tier]}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={MessageSquare}>
              {t('buyerSupplierProfile.actions.message')}
            </Button>
            <Button variant="outline" icon={ShoppingCart}>
              {t('buyerSupplierProfile.actions.createRfq')}
            </Button>
          </div>
        }
      />

      {/* D-CENSUS-8 — MARKER-SCOPE-01. The only marker on this route sat inside the
          Message-log tab; the profile header, KPI tiles, catalogue and certificate
          list — everything a reader would act on — were unmarked. NOTE: the two
          header buttons above have no handler at all (DEAD-AFFORDANCE-01, filed);
          this batch marks the data, it does not fix inert affordances. */}
      <PageMetaLine className="-mt-6 mb-6">
        <ProvenanceMarker capability="suppliers" />
      </PageMetaLine>

      {/* Overview card */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 shrink-0 rounded-lg bg-action-soft text-action-hover flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusPill variant={statusTone(supp.status)}>
                {supp.status}
              </StatusPill>
              {supp.halalCertified && (
                <StatusPill variant="success">Halal Certified</StatusPill>
              )}
              {supp.bpomRegistered && (
                <StatusPill variant="info">BPOM Registered</StatusPill>
              )}
              <Data className="text-xs text-text-tertiary">
                {supp.sapBpNumber}
              </Data>
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
          eyebrow={t('buyerSupplierProfile.kpi.otif.eyebrow')}
          value={`${supp.otif}%`}
          subtitle={t('buyerSupplierProfile.kpi.otif.subtitle')}
          icon={Activity}
        />
        <KpiCard
          eyebrow={t('buyerSupplierProfile.kpi.leadTime.eyebrow')}
          value={`${supp.leadTimeAdherence}%`}
          subtitle={t('buyerSupplierProfile.kpi.leadTime.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('buyerSupplierProfile.kpi.invoiceAccuracy.eyebrow')}
          value={`${supp.invoiceAccuracy}%`}
          subtitle={t('buyerSupplierProfile.kpi.invoiceAccuracy.subtitle')}
          icon={ShieldCheck}
        />
        <KpiCard
          eyebrow={t('buyerSupplierProfile.kpi.scorecard.eyebrow')}
          value={supp.scorecardGrade}
          subtitle={t('buyerSupplierProfile.kpi.scorecard.subtitle', {
            rating: supp.rating.toFixed(1),
          })}
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
          <h2 className="text-section text-text-primary mb-4">
            {t('buyerSupplierProfile.overview.heading')}
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.legalName')}</dt>
              <dd className="text-text-primary">{supp.legalName ?? supp.name}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.taxId')}</dt>
              <dd className="text-text-primary"><Data>{supp.taxId ?? '—'}</Data></dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.businessReg')}</dt>
              <dd className="text-text-primary"><Data>{supp.businessRegNo ?? '—'}</Data></dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.founded')}</dt>
              <dd className="text-text-primary"><Data>{supp.founded ?? '—'}</Data></dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.employees')}</dt>
              <dd className="text-text-primary"><Data>{supp.employees ?? '—'}</Data></dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.annualRevenue')}</dt>
              <dd className="text-text-primary"><Data>{supp.annualRevenue ?? '—'}</Data></dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.paymentTerms')}</dt>
              <dd className="text-text-primary">{supp.paymentTerms ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.incoterms')}</dt>
              <dd className="text-text-primary">{supp.incoterms ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.onboarded')}</dt>
              <dd className="text-text-primary"><Data>{supp.onboardedDate}</Data></dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.overview.lastActivity')}</dt>
              <dd className="text-text-primary"><Data>{supp.lastActivityDate}</Data></dd>
            </div>
          </dl>
          {supp.intelligenceNote && (
            <div className="mt-5 p-4 bg-teal-soft border border-teal/20 rounded-md text-sm text-text-secondary">
              <strong className="text-text-primary">{t('buyerSupplierProfile.overview.intelNote')}</strong>{' '}
              {supp.intelligenceNote}
            </div>
          )}
        </section>
      )}

      {activeTab === 'comm' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <h2 className="text-section text-text-primary mb-4">
            {t('buyerSupplierProfile.comm.heading')}
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.comm.preferredChannel')}</dt>
              <dd className="text-text-primary">{chl(supp.preferredChannel)}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.comm.connectivityTier')}</dt>
              <dd className="text-text-primary">{TIER_LABEL[supp.tier]}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.comm.primaryContact')}</dt>
              <dd className="text-text-primary">{supp.contactName}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.comm.phone')}</dt>
              <dd className="text-text-primary">{supp.phone}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.comm.email')}</dt>
              <dd className="text-text-primary">{supp.email}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle py-2">
              <dt className="text-text-tertiary">{t('buyerSupplierProfile.comm.businessHours')}</dt>
              <dd className="text-text-primary">{t('buyerSupplierProfile.comm.yes')}</dd>
            </div>
          </dl>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary">{t('buyerSupplierProfile.comm.reset')}</Button>
            <Button variant="outline">{t('buyerSupplierProfile.comm.save')}</Button>
          </div>
        </section>
      )}

      {activeTab === 'compliance' && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <span className="text-sm font-semibold text-text-primary">
              {t('buyerSupplierProfile.compliance.heading')}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('buyerSupplierProfile.compliance.col.document')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.compliance.col.status')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.compliance.col.uploaded')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.compliance.col.expires')}</TableHeaderCell>
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
                    <Data>{doc.uploaded ?? '—'}</Data>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <Data>{doc.expiry ?? '—'}</Data>
                  </TableCell>
                </TableRow>
              ))}
              {certs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-sm text-text-tertiary py-8"
                  >
                    {t('buyerSupplierProfile.compliance.empty')}
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
              {t('buyerSupplierProfile.catalog.heading')}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('buyerSupplierProfile.catalog.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.catalog.col.sapCode')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.catalog.col.moq')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.catalog.col.leadTime')}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t('buyerSupplierProfile.catalog.col.unitPrice')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.catalog.col.capacity')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {catalog.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {m.material}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-text-tertiary">
                    <Data>{m.sapCode}</Data>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <Data>{m.moq} {m.uom}</Data>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <Data>{m.leadTime} days</Data>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary">
                    <Data>Rp {m.unitPrice}</Data>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <Data>{m.capacity} {m.uom}/mo</Data>
                  </TableCell>
                </TableRow>
              ))}
              {catalog.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-sm text-text-tertiary py-8"
                  >
                    {t('buyerSupplierProfile.catalog.empty')}
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
            <h2 className="text-section text-text-primary mb-1">
              {t('buyerSupplierProfile.performance.heading')}
            </h2>
            <p className="text-meta text-text-tertiary">
              {t('buyerSupplierProfile.performance.subtitle')}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.po')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.qty')}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t('buyerSupplierProfile.performance.col.value')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.ordered')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.delivery')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.otif')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.performance.col.status')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {recentPOs.map((po) => {
                const line = po.lineItems[0];
                const otif = deriveOtif(po);
                return (
                  <TableRow key={po.id}>
                    <TableCell className="text-xs text-text-primary">
                      <Data>{po.poNumber}</Data>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {line?.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <Data>{line ? `${formatNumber(line.quantity)} ${line.uom}` : '—'}</Data>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-text-primary">
                      <Data>{formatIDR(po.totalValue, { compact: true })}</Data>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <Data>{formatDate(po.orderDate)}</Data>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <Data>{formatDate(po.confirmedDeliveryDate)}</Data>
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
                    {t('buyerSupplierProfile.performance.empty')}
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
              {t('buyerSupplierProfile.msglog.heading')}
            </span>
            {/* MARKER-I18N-HOLE-01 — was a hardcoded English literal, so the marker
                disappeared entirely in Bahasa. Now registry-derived and translated. */}
            <ProvenanceMarker capability="messaging" />
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('buyerSupplierProfile.msglog.col.timestamp')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.msglog.col.direction')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.msglog.col.channel')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.msglog.col.type')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.msglog.col.preview')}</TableHeaderCell>
              <TableHeaderCell>{t('buyerSupplierProfile.msglog.col.status')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {MSG_LOG.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-text-tertiary whitespace-nowrap">
                    <Data>{m.ts}</Data>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={m.direction === 'in' ? 'info' : 'neutral'}>
                      {m.direction === 'in' ? 'Inbound' : 'Outbound'}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-text-secondary capitalize">
                    {chl(m.channel)}
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
