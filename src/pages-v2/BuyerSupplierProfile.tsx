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
  ListChecks,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import { Card } from '../components/ui-v2/Card';
import Notice from '../components/ui-v2/Notice';
import { LinkButton } from '../components/ui-v2/Actions';
import { statusTone } from '../lib/statusTone';
import PslListingsSection from '../components/v2-features/PslListingsSection';
// ⚠️ B-S4c — THE PSL COMES THROUGH THE SERVICE, NOT A FROZEN FIXTURE.
// This import was `PSL_LISTINGS` until P3, and had it survived the eight
// new verbs, this tab would have rendered a snapshot: a designation changed
// on the queue a moment earlier would still read as it was, with nothing
// going red. The hook is also what makes `useInvalidateProcurement` reach
// this surface after a dispatch — a direct store read never re-renders.
import { usePslListings } from '../services/query/hooks';
import { listingsForSupplier } from '../services/data/pslProjection';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { useDeepLinkedRecordId } from '../lib/recordDeepLink';
import Tabs from '../components/ui-v2/Tabs';
import DataTable from '../components/ui-v2/DataTable';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import { Field, FieldList } from '../components/ui-v2/Field';
import SectionHeading from '../components/ui-v2/SectionHeading';
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
import { useToast } from '../hooks/useToast';
import { SupplierTier } from '../types/supplier.types';
import type { ProfileCertStatus, PurchaseOrder } from '../services/data/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Layout of one ruled row in the overview and communication lists.
const FIELD_ROW = 'border-b border-border-subtle py-2';

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
  | 'psl'
  | 'compliance'
  | 'catalog'
  | 'performance'
  | 'msglog';

const BuyerSupplierProfile: React.FC = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const chl = useChannelLabel();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // ⚠️ THE LISTING PROJECTION READS AT `DECLARED_PRESENT`, NOT THE WALL CLOCK —
  // the `BuyerContracts` pin, for the reason stated there: the corpus is an
  // anchored family, so a page reading `new Date()` would decay on a calendar
  // day with no commit involved.
  const PSL_TODAY = DECLARED_PRESENT;
  // The corpus, read through the seam so a dispatched verb is visible here.
  // `listingsForSupplier` still does the SELECTION and the ORDERING on this
  // page rather than inside the section — `readingInstantGate` attributes a
  // projection call by the types its arguments carry, and a call made inside
  // the component would resolve `FORWARDED` and the family would read
  // `NO-CALL-SITES`. Here the deciding site carries `PSL_TODAY`, which is
  // `DECLARED_PRESENT`, and the `psl` family reads `P`.
  const pslRows = usePslListings().data?.items ?? [];

  // ⚠️ THE DEEP LINK NAMES A *LISTING*, NOT THE SUPPLIER. The supplier is
  // already the route segment (`/buyer/suppliers/:id`), so `?id=` is free to
  // carry the record INSIDE the page — which is exactly what `recordDeepLink`'s
  // parameter means everywhere else. Arriving with one opens the PSL tab and
  // highlights the row. An UNKNOWN id is NOT an error (that module's rule): the
  // tab still opens and nothing is highlighted, because a stale link is not a
  // failure the reader caused or can fix.
  const deepLinkedListingId = useDeepLinkedRecordId();
  const [pslDeepLinkHandled, setPslDeepLinkHandled] = useState(false);
  if (deepLinkedListingId && !pslDeepLinkHandled) {
    setPslDeepLinkHandled(true);
    setActiveTab('psl');
  }

  const PROFILE_CRUMB = [
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
    // ⚠️ A TAB, NOT A SECTION ON `overview`. A listing carries a justification,
    // a cap with its own justification and decider, evidence references and an
    // append-only ledger — several hundred words on a multi-listing supplier.
    // Folded into `overview` it would bury the identity card the tab exists to
    // show first; the `compliance` tab beside it is the precedent for a
    // governed, document-shaped read getting its own surface.
    { id: 'psl', label: t('psl.tab'), icon: ListChecks },
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
        <LinkButton
          icon={ArrowLeft}
          onClick={() => navigate('/buyer/suppliers')}
        >
          {t('buyerSupplierProfile.back.directory')}
        </LinkButton>
      </div>

      <PageHeader
        breadcrumb={[
          t('buyerSupplierProfile.crumb.directory'),
          supp.name.toUpperCase(),
        ]}
        title={supp.name}
        subtitle={`${cl(supp.category)} · ${supp.city}, ${supp.country} · ${TIER_LABEL[supp.tier]}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={MessageSquare}
              onClick={() =>
                toast({
                  variant: 'info',
                  title: t('buyerSupplierProfile.toast.messageUnavailable.title'),
                  description: t('buyerSupplierProfile.toast.messageUnavailable.desc'),
                })
              }
            >
              {t('buyerSupplierProfile.actions.message')}
            </Button>
            <Button
              variant="outline"
              icon={ShoppingCart}
              onClick={() =>
                toast({
                  variant: 'info',
                  title: t('buyerSupplierProfile.toast.createRfqUnavailable.title'),
                  description: t('buyerSupplierProfile.toast.createRfqUnavailable.desc'),
                })
              }
            >
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
      <Card padding="lg" className="mb-6">
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
      </Card>

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
        <Card as="section" padding="lg">
          <SectionHeading as="h2" className="mb-4">
            {t('buyerSupplierProfile.overview.heading')}
          </SectionHeading>
          <FieldList layout="row" className="md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-3">
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.overview.legalName')}>
              {supp.legalName ?? supp.name}
            </Field>
            <Field className={FIELD_ROW} kind="id" label={t('buyerSupplierProfile.overview.taxId')}>
              {supp.taxId ?? '—'}
            </Field>
            <Field className={FIELD_ROW} kind="id" label={t('buyerSupplierProfile.overview.businessReg')}>
              {supp.businessRegNo ?? '—'}
            </Field>
            <Field className={FIELD_ROW} kind="date" label={t('buyerSupplierProfile.overview.founded')}>
              {supp.founded ?? '—'}
            </Field>
            <Field className={FIELD_ROW} kind="number" label={t('buyerSupplierProfile.overview.employees')}>
              {supp.employees ?? '—'}
            </Field>
            <Field className={FIELD_ROW} kind="money" label={t('buyerSupplierProfile.overview.annualRevenue')}>
              {supp.annualRevenue ?? '—'}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.overview.paymentTerms')}>
              {supp.paymentTerms ?? '—'}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.overview.incoterms')}>
              {supp.incoterms ?? '—'}
            </Field>
            <Field className={FIELD_ROW} kind="date" label={t('buyerSupplierProfile.overview.onboarded')}>
              {supp.onboardedDate}
            </Field>
            <Field className={FIELD_ROW} kind="date" label={t('buyerSupplierProfile.overview.lastActivity')}>
              {supp.lastActivityDate}
            </Field>
          </FieldList>
          {supp.intelligenceNote && (
            <Notice tone="info" title={t('buyerSupplierProfile.overview.intelNote')} className="mt-5">
              {supp.intelligenceNote}
            </Notice>
          )}
        </Card>
      )}

      {activeTab === 'comm' && (
        <Card as="section" padding="lg">
          <SectionHeading as="h2" className="mb-4">
            {t('buyerSupplierProfile.comm.heading')}
          </SectionHeading>
          <FieldList layout="row" className="md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-3">
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.comm.preferredChannel')}>
              {chl(supp.preferredChannel)}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.comm.connectivityTier')}>
              {TIER_LABEL[supp.tier]}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.comm.primaryContact')}>
              {supp.contactName}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.comm.phone')}>
              {supp.phone}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.comm.email')}>
              {supp.email}
            </Field>
            <Field className={FIELD_ROW} label={t('buyerSupplierProfile.comm.businessHours')}>
              {t('buyerSupplierProfile.comm.yes')}
            </Field>
          </FieldList>
          {/* ⚠️ `Reset` AND `Save` ARE GONE — H3, and the reason is that there was
              never anything to save. Everything above is a list of label–value
              pairs read straight off the supplier record: this section has no
              input, no local state and no draft, so the pair was not an unwired
              form — it was a form's furniture with no form behind it. Wiring them
              would have meant BUILDING the editable preferences this page does
              not have, which the H3 ruling forbids. */}
        </Card>
      )}

      {activeTab === 'compliance' && (
        <Card as="section" padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <SectionHeading as="h2">
              {t('buyerSupplierProfile.compliance.heading')}
            </SectionHeading>
          </div>
          <DataTable<(typeof certs)[number]>
            card={false}
            rows={certs}
            rowKey={(doc) => doc.name}
            empty={t('buyerSupplierProfile.compliance.empty')}
            columns={[
              {
                id: 'document',
                header: t('buyerSupplierProfile.compliance.col.document'),
                kind: 'text',
                cell: (doc) => doc.name,
              },
              {
                id: 'status',
                header: t('buyerSupplierProfile.compliance.col.status'),
                kind: 'status',
                cell: (doc) => (
                  <StatusPill variant={COMPLIANCE_VARIANT[doc.status]}>
                    <span className="inline-flex items-center gap-1">
                      {COMPLIANCE_ICON[doc.status]}
                      {COMPLIANCE_LABEL[doc.status]}
                    </span>
                  </StatusPill>
                ),
              },
              {
                id: 'uploaded',
                header: t('buyerSupplierProfile.compliance.col.uploaded'),
                kind: 'date',
                cell: (doc) => <Data>{doc.uploaded ?? '—'}</Data>,
              },
              {
                id: 'expires',
                header: t('buyerSupplierProfile.compliance.col.expires'),
                kind: 'date',
                cell: (doc) => <Data>{doc.expiry ?? '—'}</Data>,
              },
            ]}
          />
        </Card>
      )}

      {activeTab === 'psl' && (
        <PslListingsSection
          listings={listingsForSupplier(pslRows, supp.id, PSL_TODAY)}
          nowIso={PSL_TODAY}
          highlightId={deepLinkedListingId}
        />
      )}

      {activeTab === 'catalog' && (
        <Card as="section" padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <SectionHeading as="h2">
              {t('buyerSupplierProfile.catalog.heading')}
            </SectionHeading>
          </div>
          <DataTable<(typeof catalog)[number]>
            card={false}
            rows={catalog}
            rowKey={(m) => m.id}
            empty={t('buyerSupplierProfile.catalog.empty')}
            columns={[
              {
                id: 'material',
                header: t('buyerSupplierProfile.catalog.col.material'),
                kind: 'text',
                cell: (m) => m.material,
              },
              {
                id: 'sapCode',
                header: t('buyerSupplierProfile.catalog.col.sapCode'),
                kind: 'id',
                cell: (m) => <Data>{m.sapCode}</Data>,
              },
              {
                id: 'moq',
                header: t('buyerSupplierProfile.catalog.col.moq'),
                kind: 'number',
                cell: (m) => <Data>{m.moq} {m.uom}</Data>,
              },
              {
                id: 'leadTime',
                header: t('buyerSupplierProfile.catalog.col.leadTime'),
                kind: 'number',
                cell: (m) => <Data>{m.leadTime} days</Data>,
              },
              {
                id: 'unitPrice',
                header: t('buyerSupplierProfile.catalog.col.unitPrice'),
                kind: 'money',
                cell: (m) => <Data>Rp {m.unitPrice}</Data>,
              },
              {
                id: 'capacity',
                header: t('buyerSupplierProfile.catalog.col.capacity'),
                kind: 'number',
                cell: (m) => <Data>{m.capacity} {m.uom}/mo</Data>,
              },
            ]}
          />
        </Card>
      )}

      {activeTab === 'performance' && (
        <Card as="section" padding="none" className="overflow-hidden">
          <div className="p-6 border-b border-border-subtle">
            <SectionHeading as="h2" className="mb-1">
              {t('buyerSupplierProfile.performance.heading')}
            </SectionHeading>
            <p className="text-meta text-text-tertiary">
              {t('buyerSupplierProfile.performance.subtitle')}
            </p>
          </div>
          <DataTable<PurchaseOrder>
            card={false}
            rows={recentPOs}
            rowKey={(po) => po.id}
            empty={t('buyerSupplierProfile.performance.empty')}
            columns={[
              {
                id: 'po',
                header: t('buyerSupplierProfile.performance.col.po'),
                kind: 'id',
                cell: (po) => <Data>{po.poNumber}</Data>,
              },
              {
                id: 'material',
                header: t('buyerSupplierProfile.performance.col.material'),
                kind: 'text',
                cell: (po) => po.lineItems[0]?.description ?? '—',
              },
              {
                id: 'qty',
                header: t('buyerSupplierProfile.performance.col.qty'),
                kind: 'number',
                cell: (po) => {
                  const line = po.lineItems[0];
                  return <Data>{line ? `${formatNumber(line.quantity)} ${line.uom}` : '—'}</Data>;
                },
              },
              {
                id: 'value',
                header: t('buyerSupplierProfile.performance.col.value'),
                kind: 'money',
                cell: (po) => <Data>{formatIDR(po.totalValue, { compact: true })}</Data>,
              },
              {
                id: 'ordered',
                header: t('buyerSupplierProfile.performance.col.ordered'),
                kind: 'date',
                cell: (po) => <Data>{formatDate(po.orderDate)}</Data>,
              },
              {
                id: 'delivery',
                header: t('buyerSupplierProfile.performance.col.delivery'),
                kind: 'date',
                cell: (po) => <Data>{formatDate(po.confirmedDeliveryDate)}</Data>,
              },
              {
                id: 'otif',
                header: t('buyerSupplierProfile.performance.col.otif'),
                kind: 'status',
                cell: (po) => {
                  const otif = deriveOtif(po);
                  return (
                    <StatusPill variant={otif === 'On Time' ? 'success' : 'warning'}>
                      {otif}
                    </StatusPill>
                  );
                },
              },
              {
                id: 'status',
                header: t('buyerSupplierProfile.performance.col.status'),
                kind: 'status',
                cell: (po) => <StatusPill variant="success">{po.status}</StatusPill>,
              },
            ]}
          />
        </Card>
      )}

      {activeTab === 'msglog' && (
        <Card as="section" padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <SectionHeading as="h2">
              {t('buyerSupplierProfile.msglog.heading')}
            </SectionHeading>
            {/* MARKER-I18N-HOLE-01 — was a hardcoded English literal, so the marker
                disappeared entirely in Bahasa. Now registry-derived and translated. */}
            <ProvenanceMarker capability="messaging" />
          </div>
          <DataTable<(typeof MSG_LOG)[number]>
            card={false}
            rows={MSG_LOG}
            rowKey={(_m, i) => String(i)}
            columns={[
              {
                id: 'timestamp',
                header: t('buyerSupplierProfile.msglog.col.timestamp'),
                kind: 'date',
                cell: (m) => <Data>{m.ts}</Data>,
              },
              {
                id: 'direction',
                header: t('buyerSupplierProfile.msglog.col.direction'),
                kind: 'status',
                cell: (m) => (
                  <StatusPill variant={m.direction === 'in' ? 'info' : 'neutral'}>
                    {m.direction === 'in' ? 'Inbound' : 'Outbound'}
                  </StatusPill>
                ),
              },
              {
                id: 'channel',
                header: t('buyerSupplierProfile.msglog.col.channel'),
                kind: 'text',
                cell: (m) => <span className="capitalize">{chl(m.channel)}</span>,
              },
              {
                id: 'type',
                header: t('buyerSupplierProfile.msglog.col.type'),
                kind: 'text',
                cell: (m) => m.docType,
              },
              {
                id: 'preview',
                header: t('buyerSupplierProfile.msglog.col.preview'),
                kind: 'text',
                className: 'max-w-md truncate',
                cell: (m) => m.preview,
              },
              {
                id: 'status',
                header: t('buyerSupplierProfile.msglog.col.status'),
                kind: 'status',
                cell: (m) => (
                  <StatusPill variant={m.status === 'read' ? 'success' : 'neutral'}>
                    {m.status}
                  </StatusPill>
                ),
              },
            ]}
          />
        </Card>
      )}
    </AppShellV2>
  );
};

export default BuyerSupplierProfile;
