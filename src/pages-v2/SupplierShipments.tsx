import React, { useMemo, useState } from 'react';
import {
  FileText,
  Send,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Download,
  ChevronRight,
  ChevronDown,
  Calendar,
  Clock,
  MapPin,
  Package,
  Upload,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import FormSection from '../components/ui-v2/FormSection';
import Data from '../components/ui-v2/Data';
import { useVerbAvailabilities } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useTranslation } from 'react-i18next';
import { statusLabelKey } from '../lib/statusLabel';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import {
  useAdvanceShipNoticeCreate,
  useAdvanceShipNoticeSubmit,
} from '../services/query/commandHooks';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import {
  useCurrentSupplier,
  usePurchaseOrders,
  useASNs,
} from '../services/query/hooks';
import type { AsnStatus, ASN, PurchaseOrder } from '../services/data/types';
import { useRefusalText } from '../hooks/useRefusalText';
import { refusalDetailOf } from '../services/transitions/refusalMessage';

type TabKey = 'shipments' | 'create' | 'dock';
type StatusFilter = AsnStatus | 'All';

const STATUS_VARIANT: Record<AsnStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Draft: 'neutral',
  Submitted: 'neutral',
  'In Transit': 'warning',
  Delivered: 'success',
  Discrepancy: 'danger',
};

const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface AsnForm {
  poId: string;
  carrier: string;
  trackingNumber: string;
  shipDate: string;
  eta: string;
  packages: string;
  weightKg: string;
  packingList: string;
  notes: string;
  confirmed: boolean;
  batchNumber: string;
  lotNumber: string;
}

const DEFAULT_FORM: AsnForm = {
  poId: '',
  carrier: 'Sample Courier (illustrative)',
  trackingNumber: '',
  shipDate: '2026-04-07',
  eta: '',
  packages: '',
  weightKg: '',
  packingList: '',
  notes: '',
  confirmed: false,
  batchNumber: '',
  lotNumber: '',
};

// Batch E (DISCOVERY-REAL-SUBJECTS-01): this list was six real courier and
// freight companies plus 'Other' — not named here, for the same reason PF-2a's
// fixture header describes its deleted endorsers instead of re-listing them.
// They render as <option>s a supplier picks when submitting an ASN, and
// <option> text is absent from `innerText` — which is why the render census
// wrongly reported carriers as rendering nowhere.
const CARRIER_OPTIONS = [
  'Sample Courier (illustrative)',
  'Sample Parcel Courier (illustrative)',
  'Sample Express Courier (illustrative)',
  'Sample Air Freight (illustrative)',
  'Sample Ocean Carrier (illustrative)',
  'Sample Freight Forwarder (illustrative)',
  'Other',
];

const DockAppointments: React.FC = () => {
  const { t } = useTranslation();
  // i18n-defer: dock-appointment fixture is sample data — the field VALUES
  // (dates, times, dock/location proper nouns) stay canonical EN; only the field
  // LABELS localize.
  const dockFields = [
    { Icon: Calendar, label: t('supplierShipments.dock.field.date'), value: 'Monday, 7 April 2026' },
    { Icon: Clock, label: t('supplierShipments.dock.field.time'), value: '10:00 WIB' },
    { Icon: Package, label: t('supplierShipments.dock.field.dock'), value: 'Dock 3' },
    {
      Icon: MapPin,
      label: t('supplierShipments.dock.field.location'),
      value: 'NDC Jatake 6, Tangerang Selatan',
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-section text-text-primary">
        {t('supplierShipments.dock.heading')}
      </h3>

      <div className="bg-bg-surface border-2 border-success rounded-lg shadow-sm p-5">
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            <Data as="div" className="text-base font-bold text-text-primary">
              ASN-2026-001
            </Data>
            <div className="text-xs text-text-tertiary mt-0.5">
              {/* i18n-defer: mock/sample data (material proper noun) */}
              <Data>PO-2025-00107</Data> · PET Bottle 100ml Airless Pump
            </div>
          </div>
          <StatusPill variant="success">Confirmed</StatusPill>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {dockFields.map(({ Icon, label, value }) => (
            <div
              key={label}
              className="px-3 py-2 bg-bg-hover rounded-md flex items-start gap-2"
            >
              <Icon size={14} className="text-text-tertiary mt-0.5 shrink-0" />
              <div>
                <div className="text-label text-text-tertiary uppercase">
                  {label}
                </div>
                <div className="text-sm text-text-primary mt-0.5">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <Clock size={14} className="text-warning-hover shrink-0 mt-0.5" />
        <span>
          {t('supplierShipments.dock.notice.arrivePre')}{' '}
          <strong className="text-warning-hover">
            {t('supplierShipments.dock.notice.arriveEmphasis')}
          </strong>
          . {t('supplierShipments.dock.notice.arrivePost')}{' '}
          {/* i18n-defer: mock/sample data (receiving-team phone number) */}
          <strong>+62-21-5595-xxxx</strong>{' '}
          {t('supplierShipments.dock.notice.arriveTail')}
        </span>
      </div>

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <CheckCircle2 size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          {t('supplierShipments.dock.info.pre')}{' '}
          <strong>WhatsApp</strong>{' '}
          {t('supplierShipments.dock.info.post')}
        </span>
      </div>
    </div>
  );
};

interface ShipmentsListProps {
  asns: ASN[];
  statusFilter: StatusFilter;
  expanded: Set<string>;
  onToggleExpand: (asnNumber: string) => void;
  onSubmitAsn: (asnNumber: string) => void;
  onResolveDiscrepancy: (asnNumber: string) => void;
  onCreateAsnForPO: (poId: string) => void;
  confirmedPOs: PurchaseOrder[];
}

const ShipmentsList: React.FC<ShipmentsListProps> = ({
  asns,
  statusFilter,
  expanded,
  onToggleExpand,
  onSubmitAsn,
  onResolveDiscrepancy,
  onCreateAsnForPO,
  confirmedPOs,
}) => {
  const { t } = useTranslation();
  // ⚠️ TWO VERBS, TWO SLOTS — never one notice speaking for both (§76). They
  // are co-reachable on this page: a supplier with a confirmed PO and a draft
  // ASN sees the create row and the submit cell at the same time, so a single
  // collapsed notice would name an owner for an act the reader was not looking
  // at. Both atoms belong to FULFILMENT, and they are asked separately anyway
  // so the answer stays right if the lanes ever diverge.
  const asnVerbs = useVerbAvailabilities({
    create: 'asn:create',
    submit: 'asn:submit',
  } as const);
  const filtered = useMemo(
    () =>
      statusFilter === 'All'
        ? asns
        : asns.filter((a) => a.status === statusFilter),
    [statusFilter, asns],
  );

  const pendingPOs = useMemo(() => {
    const asnPoRefs = new Set(asns.map((a) => a.poReference));
    return confirmedPOs.filter((po) => !asnPoRefs.has(po.poNumber));
  }, [confirmedPOs, asns]);

  return (
    <div className="flex flex-col gap-5">
      {pendingPOs.length > 0 && (
        <section className="bg-warning-soft border-l-2 border-warning rounded-md px-4 py-3">
          <div className="text-sm font-semibold text-text-primary mb-3">
            {t(
              pendingPOs.length === 1
                ? 'supplierShipments.pending.awaiting.one'
                : 'supplierShipments.pending.awaiting.other',
              { count: pendingPOs.length },
            )}
          </div>
          <div className="flex flex-col gap-2">
            {pendingPOs.map((po) => {
              const first = po.lineItems[0];
              return (
                <div
                  key={po.id}
                  className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 grid grid-cols-1 sm:grid-cols-[140px_1fr_180px_140px] gap-3 items-center text-sm"
                >
                  <Data className="font-bold text-text-primary">
                    {po.poNumber}
                  </Data>
                  <span
                    className="text-text-secondary truncate"
                    title={first?.description ?? '—'}
                  >
                    {first?.description ?? '—'}
                  </span>
                  <span className="text-text-tertiary text-xs whitespace-nowrap">
                    {t('supplierShipments.pending.req')}{' '}
                    <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                  </span>
                  <div className="justify-self-end">
                    {asnVerbs.create.kind === 'held' ? (
                      <Button
                        variant="outline"
                        icon={Plus}
                        onClick={() => onCreateAsnForPO(po.id)}
                      >
                        {t('asn.create.action')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={asnVerbs.create}
                        testId="handoff-asn-create"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-section text-text-primary">
            {t('supplierShipments.list.heading')}
            {statusFilter !== 'All' && (
              <span className="text-text-tertiary font-normal ml-2 text-xs">
                ·{' '}
                {t('supplierShipments.list.filteredBy', {
                  status: t(statusLabelKey(statusFilter) ?? statusFilter),
                })}
              </span>
            )}
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell className="w-8">
              <span className="sr-only">{t('supplierShipments.aria.expand')}</span>
            </TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.asn')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.poRef')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.carrier')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.tracking')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.eta')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierShipments.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((asn) => {
              const isOpen = expanded.has(asn.asnNumber);
              return (
                <React.Fragment key={asn.asnNumber}>
                  <TableRow>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onToggleExpand(asn.asnNumber)}
                        aria-label={
                          isOpen
                            ? t('supplierShipments.aria.collapse')
                            : t('supplierShipments.aria.expand')
                        }
                        className="text-text-tertiary hover:text-text-primary"
                      >
                        {isOpen ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
                        {asn.asnNumber}
                      </Data>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                      <Data>{asn.poReference}</Data>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={STATUS_VARIANT[asn.status]}>
                        {asn.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-text-secondary whitespace-nowrap">
                      {asn.carrier}
                    </TableCell>
                    <TableCell className="text-xs text-text-tertiary whitespace-nowrap">
                      <Data>{asn.trackingNumber}</Data>
                    </TableCell>
                    <TableCell className="text-text-tertiary whitespace-nowrap">
                      <Data>{asn.eta ? fmtDate(asn.eta) : '—'}</Data>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {asn.status === 'Draft' &&
                        (asnVerbs.submit.kind === 'held' ? (
                          <Button
                            variant="outline"
                            onClick={() => onSubmitAsn(asn.asnNumber)}
                          >
                            {t('asn.submit.action')}
                          </Button>
                        ) : (
                          <HandoffNotice
                            availability={asnVerbs.submit}
                            testId="handoff-asn-submit"
                          />
                        ))}
                      {asn.status === 'Discrepancy' && (
                        <Button
                          variant="secondary"
                          onClick={() => onResolveDiscrepancy(asn.asnNumber)}
                        >
                          {t('supplierShipments.action.resolve')}
                        </Button>
                      )}
                      {asn.status !== 'Draft' &&
                        asn.status !== 'Discrepancy' && (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <tr className="bg-bg-page border-t border-border-subtle">
                      <td
                        colSpan={8}
                        className="px-6 py-4"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
                          <div className="bg-bg-surface border border-border-subtle rounded-md p-4">
                            <div className="text-label text-text-tertiary uppercase mb-3">
                              {t('supplierShipments.detail.heading')}
                            </div>
                            <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-xs">
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.origin')}
                              </dt>
                              {/* i18n-defer: mock/sample data (origin city) */}
                              <dd className="text-text-primary">
                                {asn.details.originCity}
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.destinationWarehouse')}
                              </dt>
                              {/* i18n-defer: mock/sample data (warehouse name) */}
                              <dd className="text-text-primary">
                                {asn.details.destinationWarehouse}
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.totalCartons')}
                              </dt>
                              <dd className="text-text-primary">
                                <Data>
                                  {asn.details.totalCartons
                                    ? asn.details.totalCartons.toLocaleString()
                                    : '—'}
                                </Data>
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.grossWeight')}
                              </dt>
                              <dd className="text-text-primary">
                                <Data>
                                  {asn.details.grossWeightKg
                                    ? `${asn.details.grossWeightKg.toLocaleString()} kg`
                                    : '—'}
                                </Data>
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.temperature')}
                              </dt>
                              {/* i18n-defer: mock/sample data (temperature requirement) */}
                              <dd className="text-text-primary">
                                {asn.details.temperatureRequirement}
                              </dd>
                            </dl>
                          </div>
                          <div className="bg-bg-surface border border-border-subtle rounded-md p-4">
                            <div className="text-label text-text-tertiary uppercase mb-3">
                              {t('supplierShipments.detail.lineItems', {
                                count: asn.lineItems.length,
                              })}
                            </div>
                            {asn.lineItems.length === 0 ? (
                              <div className="text-xs text-text-tertiary">
                                {t('supplierShipments.detail.noLineItems')}
                              </div>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-text-tertiary uppercase">
                                    <th className="text-left py-1">
                                      {t('supplierShipments.lineItems.col.material')}
                                    </th>
                                    <th className="text-right py-1">
                                      {t('supplierShipments.lineItems.col.ordered')}
                                    </th>
                                    <th className="text-right py-1">
                                      {t('supplierShipments.lineItems.col.shipped')}
                                    </th>
                                    <th className="text-right py-1">
                                      {t('supplierShipments.lineItems.col.lot')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {asn.lineItems.map((li) => {
                                    const short = li.shippedQty < li.orderedQty;
                                    return (
                                      <tr
                                        key={li.materialCode}
                                        className="border-t border-border-subtle"
                                      >
                                        <td className="py-1.5">
                                          <Data as="div" className="text-[10px] text-text-tertiary">
                                            {li.materialCode}
                                          </Data>
                                          {/* i18n-defer: mock/sample data (material description) */}
                                          <div className="text-text-primary">
                                            {li.description}
                                          </div>
                                        </td>
                                        <td className="py-1.5 text-right text-text-secondary">
                                          <Data>{li.orderedQty.toLocaleString()}</Data>
                                        </td>
                                        <td
                                          className={`py-1.5 text-right font-semibold ${short ? 'text-warning-hover' : 'text-text-primary'}`}
                                        >
                                          <Data>{li.shippedQty.toLocaleString()}</Data>
                                        </td>
                                        <td className="py-1.5 text-right text-text-tertiary">
                                          <Data>{li.lotNumber}</Data>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('supplierShipments.list.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

const SupplierShipments: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const SHIPMENTS_CRUMB = [
    t('supplierShipments.crumb.transact'),
    t('supplierShipments.crumb.shipments'),
  ];
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const createAsnMutation = useAdvanceShipNoticeCreate();
  const submitAsnMutation = useAdvanceShipNoticeSubmit();
  // ⚠️ **THE WIZARD TAB IS A SECOND ENTRY TO THE SAME VERBS, AND THE FIRST PASS
  // OF THIS BATCH MISSED IT** — `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` for
  // the third time, on the seat that was applying the rule. The row-level create
  // inside `ShipmentsList` was gated; this tab opens a three-step wizard that
  // dispatches `t_asn_create` AND `t_asn_submit` at `onComplete`, and it stayed
  // live for a seat holding neither. **The unit suite could not see it** — no
  // spec drove the tab — and it was found by walking a narrowed seat across the
  // built bundle, which is exactly what that QA bar exists for.
  //
  // BOTH atoms, because the wizard fires both: offering it on a seat that can
  // create but not submit would strand a draft at the last click.
  const wizardVerbs = useVerbAvailabilities({
    create: 'asn:create',
    submit: 'asn:submit',
  } as const);
  const wizardHeld =
    wizardVerbs.create.kind === 'held' && wizardVerbs.submit.kind === 'held';
  const [tab, setTab] = useState<TabKey>('shipments');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AsnForm>(DEFAULT_FORM);
  const [submitTarget, setSubmitTarget] = useState<ASN | null>(null);
  const [submitForm, setSubmitForm] = useState({ carrier: 'Sample Courier (illustrative)', trackingNumber: '', eta: '' });

  const supplierQuery = useCurrentSupplier();
  const asnsQuery = useASNs();
  const posQuery = usePurchaseOrders({ status: POStatus.CONFIRMED });

  const mySupplier = supplierQuery.data ?? null;
  const asns = useMemo(() => asnsQuery.data?.items ?? [], [asnsQuery.data]);
  const CONFIRMED_POS = useMemo(
    () => posQuery.data?.items ?? [],
    [posQuery.data],
  );

  const counts = useMemo(() => {
    const base: Record<AsnStatus, number> = {
      Draft: 0,
      Submitted: 0,
      'In Transit': 0,
      Delivered: 0,
      Discrepancy: 0,
    };
    for (const a of asns) base[a.status]++;
    return base;
  }, [asns]);

  const toggleExpand = (asnNumber: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(asnNumber)) next.delete(asnNumber);
      else next.add(asnNumber);
      return next;
    });
  };

  const updateForm = (patch: Partial<AsnForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const setKpiFilter = (s: AsnStatus) => {
    setStatusFilter((prev) => (prev === s ? 'All' : s));
    setTab('shipments');
  };

  // Open the submit drawer for a Draft ASN — the required fields (carrier,
  // tracking, ETA) are collected here before dispatch. Fixture drafts store '—'
  // placeholders; normalize those to empty so the form starts genuinely blank.
  const openSubmitForm = (asnNumber: string) => {
    const asn = asns.find((a) => a.asnNumber === asnNumber);
    if (!asn) return;
    const real = (v: string) => (v && v !== '—' ? v : '');
    setSubmitTarget(asn);
    setSubmitForm({
      carrier: real(asn.carrier) || 'Sample Courier (illustrative)',
      trackingNumber: real(asn.trackingNumber),
      eta: real(asn.eta),
    });
  };

  // t_asn_submit (Draft → Submitted) with the collected fields. The dispatcher
  // is the source of truth: an incomplete form is honestly rejected (the
  // requiredFields enforcement), surfaced as a human-readable message.
  const doSubmitAsn = () => {
    if (!submitTarget) return;
    const asnNumber = submitTarget.asnNumber;
    submitAsnMutation.mutate(
      { asnNumber, ...submitForm },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            const missing = (res.reason ?? '').startsWith('MISSING_FIELDS');
            toast({
              variant: 'warning',
              title: t('asn.submit.failed.title', { asnNumber }),
              description: missing
                ? t('asn.submit.missingFields', { code: refusalDetailOf(res.reason) })
                : (refusalText(res.reason) ?? t('asn.submit.failed.desc', { reason: res.reason ?? '' })),
            });
            return;
          }
          setSubmitTarget(null);
          toast({
            variant: 'success',
            title: t('asn.submit.success.title', { asnNumber }),
            description: t('asn.submit.success.desc', { correlationId: res.correlationId }),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') }),
      },
    );
  };

  // Discrepancy resolution is not a wired verb yet — the Discrepancy state
  // arrives via the GR cascade (batch ii). Honest deferred notice, no false claim.
  const resolveDiscrepancy = () => {
    toast({
      variant: 'info',
      title: t('asn.discrepancy.deferred.title'),
      description: t('asn.discrepancy.deferred.desc'),
    });
  };

  // t_asn_create (creation) from a confirmed PO. Store assigns the number; the
  // list + "awaiting ASN" panel re-derive from the invalidated query.
  const createAsnForPO = (poId: string) => {
    const po = CONFIRMED_POS.find((p) => p.id === poId);
    if (!po) return;
    createAsnMutation.mutate(
      { poReference: po.poNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title: t('asn.create.failed.title'),
              description: refusalText(res.reason) ?? t('asn.create.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('asn.create.success.title', { asnNumber: res.entityId ?? '' }),
            description: t('asn.create.success.desc', {
              poNumber: po.poNumber,
              correlationId: res.correlationId,
            }),
          });
          setStatusFilter('All');
          setTab('shipments');
        },
        onError: () =>
          toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') }),
      },
    );
  };

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || asnsQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (supplierQuery.isError || asnsQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={SHIPMENTS_CRUMB}
        error={supplierQuery.error ?? asnsQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          asnsQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier) return <NoSupplierIdentity />;
  if (asns.length === 0 && CONFIRMED_POS.length === 0)
    return (
      <EmptyState
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('supplierShipments.empty.title')}
        subtitle={t('supplierShipments.empty.subtitle')}
        message={t('supplierShipments.empty.message')}
      />
    );

  const selectedPO = CONFIRMED_POS.find((p) => p.id === form.poId);
  const step1Valid = form.poId !== '';
  const step2Valid =
    form.carrier !== '' &&
    form.trackingNumber !== '' &&
    form.shipDate !== '' &&
    form.eta !== '' &&
    form.batchNumber !== '';
  const step3Valid = form.confirmed;
  const isStepValid = (s: number): boolean =>
    s === 0 ? step1Valid : s === 1 ? step2Valid : step3Valid;

  // The wizard drafts a DETAILED ASN then submits it — create (t_asn_create,
  // store-assigned number) → submit (t_asn_submit). No fabricated document id;
  // honest outcome from the real command result.
  const completeWizard = async () => {
    if (!selectedPO) return;
    const detail = {
      carrier: form.carrier,
      trackingNumber: form.trackingNumber,
      eta: form.eta,
    };
    try {
      const createRes = await createAsnMutation.mutateAsync({
        poReference: selectedPO.poNumber,
        ...detail,
      });
      if (createRes.status === 'failed' || !createRes.entityId) {
        toast({
          variant: 'error',
          title: t('asn.create.failed.title'),
          description: refusalText(createRes.reason) ?? t('asn.create.failed.desc', { reason: createRes.reason ?? '' }),
        });
        return;
      }
      const submitRes = await submitAsnMutation.mutateAsync({
        asnNumber: createRes.entityId,
        ...detail,
      });
      if (submitRes.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('asn.submit.failed.title', { asnNumber: createRes.entityId }),
          description: refusalText(submitRes.reason) ?? t('asn.submit.failed.desc', { reason: submitRes.reason ?? '' }),
        });
      } else {
        toast({
          variant: 'success',
          title: t('asn.submit.success.title', { asnNumber: createRes.entityId }),
          description: t('asn.submit.success.desc', { correlationId: submitRes.correlationId }),
        });
      }
    } catch {
      toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') });
    } finally {
      setStep(0);
      setForm(DEFAULT_FORM);
      setTab('shipments');
    }
  };

  const wizardSteps: WizardStep[] = [
    {
      id: 'select',
      title: t('supplierShipments.wizard.select.title'),
      shortTitle: t('supplierShipments.wizard.select.short'),
      description: t('supplierShipments.wizard.select.desc'),
      content: (
        <div className="flex flex-col gap-3">
          {CONFIRMED_POS.length === 0 ? (
            <div className="bg-bg-hover border border-border-subtle rounded-md py-8 px-4 text-center text-sm text-text-tertiary">
              {t('supplierShipments.wizard.select.empty')}
            </div>
          ) : (
            CONFIRMED_POS.map((po) => {
              const mat = po.lineItems[0];
              const selected = form.poId === po.id;
              return (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => updateForm({ poId: po.id })}
                  aria-pressed={selected}
                  className={`text-left rounded-md p-4 border transition-colors ${
                    selected
                      ? 'border-action bg-action-soft'
                      : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Data as="div" className="text-sm font-bold text-text-primary">
                        {po.poNumber}
                      </Data>
                      <div className="text-sm text-text-secondary mt-1">
                        {mat?.description ?? '—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-text-tertiary">
                        {t('supplierShipments.wizard.select.qty')}{' '}
                        <Data>{mat ? `${mat.quantity.toLocaleString()} ${mat.uom}` : '—'}</Data>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {t('supplierShipments.wizard.select.delivery')}{' '}
                        <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                      </div>
                    </div>
                  </div>
                  {selected && (
                    <div className="mt-3 pt-3 border-t border-teal/30 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-text-secondary">
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.supplier')}
                        </strong>{' '}
                        {po.supplierName}
                      </div>
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.requestedDelivery')}
                        </strong>{' '}
                        <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                      </div>
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.deliveryAddress')}
                        </strong>{' '}
                        {/* i18n-defer: mock/sample data (delivery address) */}
                        NDC Jatake 6, Tangerang
                      </div>
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.channel')}
                        </strong>{' '}
                        {po.channel}
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      ),
    },
    {
      id: 'details',
      title: t('supplierShipments.wizard.details.title'),
      shortTitle: t('supplierShipments.wizard.details.short'),
      description: t('supplierShipments.wizard.details.desc'),
      content: (
        <div className="flex flex-col gap-5">
          <FormSection
            eyebrow={t('supplierShipments.wizard.details.logistics.eyebrow')}
            title={t('supplierShipments.wizard.details.logistics.title')}
            description={t('supplierShipments.wizard.details.logistics.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.carrier')}
                </label>
                <select
                  value={form.carrier}
                  onChange={(e) => updateForm({ carrier: e.target.value })}
                  className={inputClass}
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c === 'Other' ? t('supplierShipments.option.other') : c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.tracking')}
                </label>
                <input
                  type="text"
                  placeholder={t('supplierShipments.placeholder.tracking')}
                  value={form.trackingNumber}
                  onChange={(e) =>
                    updateForm({ trackingNumber: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.shipDate')}
                </label>
                <input
                  type="date"
                  value={form.shipDate}
                  onChange={(e) => updateForm({ shipDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.eta')}
                </label>
                <input
                  type="date"
                  value={form.eta}
                  onChange={(e) => updateForm({ eta: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.packaging.eyebrow')}
            title={t('supplierShipments.wizard.details.packaging.title')}
            description={t('supplierShipments.wizard.details.packaging.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.packages')}
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={form.packages}
                  onChange={(e) => updateForm({ packages: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.weight')}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={form.weightKg}
                  onChange={(e) => updateForm({ weightKg: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.batch')}
                </label>
                <input
                  type="text"
                  placeholder={t('supplierShipments.placeholder.batch')}
                  value={form.batchNumber}
                  onChange={(e) => updateForm({ batchNumber: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('supplierShipments.wizard.details.field.lot')}
                </label>
                <input
                  type="text"
                  placeholder={t('supplierShipments.placeholder.lot')}
                  value={form.lotNumber}
                  onChange={(e) => updateForm({ lotNumber: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.docs.eyebrow')}
            title={t('supplierShipments.wizard.details.docs.title')}
            description={t('supplierShipments.wizard.details.docs.desc')}
          >
            <div>
              <label className={labelClass}>
                {t('supplierShipments.wizard.details.field.packingList')}
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    updateForm({
                      packingList: e.target.files?.[0]?.name ?? '',
                    })
                  }
                />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border-input rounded-md text-sm text-teal font-semibold bg-bg-surface">
                  <Upload size={14} />
                  {t('supplierShipments.wizard.details.chooseFile')}
                </span>
                <span
                  className={`text-xs ${form.packingList ? 'text-success' : 'text-text-tertiary'}`}
                >
                  {form.packingList || t('supplierShipments.wizard.details.noFile')}
                </span>
              </label>
            </div>
            <div>
              <label className={labelClass}>
                {t('supplierShipments.wizard.details.field.notes')}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={3}
                placeholder={t('supplierShipments.placeholder.notes')}
                className={`${inputClass} resize-y`}
              />
            </div>
          </FormSection>
        </div>
      ),
    },
    {
      id: 'review',
      title: t('supplierShipments.wizard.review.title'),
      shortTitle: t('supplierShipments.wizard.review.short'),
      description: t('supplierShipments.wizard.review.desc'),
      content: (
        <div className="flex flex-col gap-5">
          <FormSection
            eyebrow={t('supplierShipments.wizard.review.summary.eyebrow')}
            title={t('supplierShipments.wizard.review.summary.title')}
            description={t('supplierShipments.wizard.review.summary.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                [t('supplierShipments.wizard.review.field.poNumber'), selectedPO?.poNumber ?? '—'],
                [t('supplierShipments.wizard.review.field.material'), selectedPO?.lineItems[0]?.description ?? '—'],
                [
                  t('supplierShipments.wizard.review.field.quantity'),
                  selectedPO?.lineItems[0]
                    ? `${selectedPO.lineItems[0].quantity.toLocaleString()} ${selectedPO.lineItems[0].uom}`
                    : '—',
                ],
                [t('supplierShipments.wizard.review.field.carrier'), form.carrier],
                [t('supplierShipments.wizard.review.field.tracking'), form.trackingNumber || '—'],
                [t('supplierShipments.wizard.review.field.shipDate'), fmtDate(form.shipDate)],
                [t('supplierShipments.wizard.review.field.eta'), form.eta ? fmtDate(form.eta) : '—'],
                [t('supplierShipments.wizard.review.field.packages'), form.packages || '—'],
                [t('supplierShipments.wizard.review.field.batch'), form.batchNumber || '—'],
                [t('supplierShipments.wizard.review.field.lot'), form.lotNumber || '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-bg-hover rounded-md px-3 py-2">
                  <div className="text-label text-text-tertiary uppercase mb-0.5">
                    {k}
                  </div>
                  <div className="text-sm font-semibold text-text-primary">
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <label className="flex items-start gap-3 px-4 py-3 bg-teal-soft border border-teal/30 rounded-md cursor-pointer text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => updateForm({ confirmed: e.target.checked })}
              className="mt-0.5 accent-teal"
            />
            {t('supplierShipments.wizard.review.confirm')}
          </label>
        </div>
      ),
    },
  ];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('supplierShipments.header.title')}
        subtitle={t('supplierShipments.header.subtitle', { name: mySupplier.name })}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('supplierShipments.action.exportEdi'),
                icon: Download,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('supplierShipments.toast.export.title'),
                    description: t('supplierShipments.toast.export.desc'),
                  }),
              },
            ]}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierShipments.meta.summary', {
          shipments: asns.length,
          pos: CONFIRMED_POS.length,
        })}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. ASN create + submit dispatch through
            the wired `advanceShipNotice` target and cascade into goods receipt; the
            POs being shipped against are fixtures. */}
        <ProvenanceMarker capability="advanceShipNotices" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard
          eyebrow={t('supplierShipments.kpi.draft.eyebrow')}
          value={counts.Draft.toString()}
          icon={FileText}
          onClick={() => setKpiFilter('Draft')}
          active={statusFilter === 'Draft'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.submitted.eyebrow')}
          value={counts.Submitted.toString()}
          icon={Send}
          onClick={() => setKpiFilter('Submitted')}
          active={statusFilter === 'Submitted'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.inTransit.eyebrow')}
          value={counts['In Transit'].toString()}
          icon={Truck}
          onClick={() => setKpiFilter('In Transit')}
          active={statusFilter === 'In Transit'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.delivered.eyebrow')}
          value={counts.Delivered.toString()}
          icon={CheckCircle2}
          onClick={() => setKpiFilter('Delivered')}
          active={statusFilter === 'Delivered'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.discrepancy.eyebrow')}
          value={counts.Discrepancy.toString()}
          icon={AlertTriangle}
          onClick={() => setKpiFilter('Discrepancy')}
          active={statusFilter === 'Discrepancy'}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'shipments', label: t('supplierShipments.tab.myShipments'), count: asns.length },
          // Withheld rather than disabled — §73's rule, applied to a tab: a seat
          // that cannot finish the wizard is not offered its first step.
          ...(wizardHeld
            ? [{ id: 'create' as TabKey, label: t('supplierShipments.tab.createAsn') }]
            : []),
          { id: 'dock', label: t('supplierShipments.tab.dock'), count: 1 },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'shipments' && (
        <ShipmentsList
          asns={asns}
          statusFilter={statusFilter}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onSubmitAsn={openSubmitForm}
          onResolveDiscrepancy={resolveDiscrepancy}
          onCreateAsnForPO={createAsnForPO}
          confirmedPOs={CONFIRMED_POS}
        />
      )}

      {tab === 'create' && !wizardHeld && (
        // Belt AND braces here, unlike the dead-branch cases elsewhere: `tab` is
        // component STATE, so a seat narrowed WHILE the wizard is open lands
        // here with the tab already selected. That is reachable, so it is not a
        // dead branch — it is the one place on this page where the notice has to
        // answer in the body rather than in the tab row.
        <HandoffNotice
          availability={
            wizardVerbs.create.kind === 'held' ? wizardVerbs.submit : wizardVerbs.create
          }
          testId="handoff-asn-wizard"
        />
      )}

      {tab === 'create' && wizardHeld && (
        <Wizard
          steps={wizardSteps}
          currentStep={step}
          onStepChange={setStep}
          onCancel={() => {
            setStep(0);
            setForm(DEFAULT_FORM);
            setTab('shipments');
          }}
          onComplete={completeWizard}
          isStepValid={isStepValid}
          completeLabel={t('asn.submit.confirm')}
        />
      )}

      {tab === 'dock' && <DockAppointments />}

      <SidePanel
        open={submitTarget !== null}
        onClose={() => setSubmitTarget(null)}
        title={
          submitTarget
            ? t('supplierShipments.submitPanel.title', {
                asnNumber: submitTarget.asnNumber,
              })
            : ''
        }
        footerActions={
          submitTarget && (
            <>
              <Button variant="secondary" onClick={() => setSubmitTarget(null)}>
                {t('supplierShipments.action.cancel')}
              </Button>
              <Button
                variant="outline"
                icon={Send}
                onClick={doSubmitAsn}
                disabled={submitAsnMutation.isPending}
              >
                {t('asn.submit.confirm')}
              </Button>
            </>
          )
        }
      >
        {submitTarget && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {t('asn.submit.form.intro', { poNumber: submitTarget.poReference })}
            </p>
            <label className="block">
              <span className={labelClass}>{t('asn.submit.form.carrier')}</span>
              <select
                value={submitForm.carrier}
                onChange={(e) => setSubmitForm((f) => ({ ...f, carrier: e.target.value }))}
                className={inputClass}
              >
                {CARRIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === 'Other' ? t('supplierShipments.option.other') : c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>{t('asn.submit.form.tracking')}</span>
              <input
                type="text"
                value={submitForm.trackingNumber}
                onChange={(e) => setSubmitForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                className={inputClass}
                placeholder={t('supplierShipments.placeholder.tracking')}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t('asn.submit.form.eta')}</span>
              <input
                type="date"
                value={submitForm.eta}
                onChange={(e) => setSubmitForm((f) => ({ ...f, eta: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierShipments;
