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
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import { Card, CardButton } from '../components/ui-v2/Card';
import Notice from '../components/ui-v2/Notice';
import { IconButton } from '../components/ui-v2/Actions';
import SidePanel from '../components/ui-v2/SidePanel';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import FormSection from '../components/ui-v2/FormSection';
import Data from '../components/ui-v2/Data';
import { FieldList, Field } from '../components/ui-v2/Field';
import SectionHeading from '../components/ui-v2/SectionHeading';
import { TextInput, Select, TextArea, ChoiceCard, FormField } from '../components/ui-v2/Form';
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
  useShipments,
  useGoodsReceipts,
} from '../services/query/hooks';
import { receivedOnOrder, receiptsOfNotice } from '../services/data/orderReceipt';
import { ReceivedOnNotice } from '../components/v2-features/ReceivedBlock';
import type { AsnStatus, ASN, PurchaseOrder, Shipment } from '../services/data/types';
import type { GoodsReceipt } from '../data/mockGoodsReceipts';
import { statusTone } from '../lib/statusTone';
import { useRefusalText } from '../hooks/useRefusalText';
import { refusalDetailOf } from '../services/transitions/refusalMessage';
import { formatDate, formatNumber } from '../lib/format';

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

type AsnLine = ASN['lineItems'][number];
type PoLine = PurchaseOrder['lineItems'][number];

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
  /** OPS-3 — one lot per order line, by position. It was a single field that
   *  never left the page while the form showed one line of the order. */
  lots: string[];
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
  lots: [],
};

// OPS-3 — the two numeric fields, read once. Blank is "not given" and is fine;
// anything typed must be a number the dispatcher will store as typed.
type OptionalNumber =
  | { readonly kind: 'absent' }
  | { readonly kind: 'ok'; readonly value: number }
  | { readonly kind: 'refused' };

const readOptionalNumber = (raw: string, whole: boolean): OptionalNumber => {
  if (raw.trim() === '') return { kind: 'absent' };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || (whole && !Number.isInteger(n))) return { kind: 'refused' };
  return { kind: 'ok', value: n };
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

/**
 * OPS-2 — the supplier's dock appointments, READ FROM THE SUPPLIER'S OWN
 * SHIPMENTS.
 *
 * ⚠️ This tab was one hardcoded card — ASN-2026-001, Dock 3, Monday 7 April
 * 2026, a material that is on no purchase order — shown to every supplier,
 * with a tab count of 1. It now lists the appointments the shipment records
 * carry (`dockAssignment` + `dockTime`, set on Paragon's side) for shipments
 * that have not been delivered, and says so plainly when there are none. The
 * read is supplier-scoped by the service, so a supplier sees only its own.
 */
export const dockAppointmentsOf = (shipments: readonly Shipment[]): Shipment[] =>
  shipments
    .filter((s) => !!s.dockAssignment && s.status !== 'Delivered')
    .sort((x, y) =>
      `${x.estimatedArrival} ${x.dockTime ?? ''}`.localeCompare(`${y.estimatedArrival} ${y.dockTime ?? ''}`),
    );

const DockAppointments: React.FC<{
  appointments: Shipment[];
  state: 'pending' | 'error' | 'ready';
}> = ({ appointments, state }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4" data-testid="dock-appointments">
      <SectionHeading as="h3">
        {t('supplierShipments.dock.heading')}
      </SectionHeading>

      {state === 'pending' && (
        <div className="text-sm text-text-tertiary" role="status">
          {t('supplierShipments.dock.loading')}
        </div>
      )}
      {state === 'error' && (
        <div className="text-sm text-critical" role="alert">
          {t('supplierShipments.dock.readFailed')}
        </div>
      )}
      {state === 'ready' && appointments.length === 0 && (
        <Card
          padding="lg"
          data-testid="dock-empty"
        >
          <span className="text-sm text-text-secondary">{t('supplierShipments.dock.empty')}</span>
        </Card>
      )}

      {state === 'ready' &&
        appointments.map((s) => (
          <Card
            key={s.id}
            data-testid={`dock-appointment-${s.asnNumber}`}
          >
            <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
              <div>
                <Data as="div" className="text-base font-bold text-text-primary">
                  {s.asnNumber}
                </Data>
                <div className="text-xs text-text-tertiary mt-0.5">
                  <Data>{s.poNumber}</Data>
                  {s.lineItems[0] ? ` · ${s.lineItems[0].description}` : ''}
                </div>
              </div>
              {/* The raw status token: `StatusPill` resolves its own label. */}
              <StatusPill variant={statusTone(s.status)}>{s.status}</StatusPill>
            </div>
            <FieldList columns={1} className="sm:grid-cols-2">
              {(
                [
                  { Icon: Calendar, kind: 'date', label: t('supplierShipments.dock.field.date'), value: formatDate(s.estimatedArrival) },
                  { Icon: Clock, kind: 'date', label: t('supplierShipments.dock.field.time'), value: s.dockTime ?? '—' },
                  { Icon: Package, kind: 'text', label: t('supplierShipments.dock.field.dock'), value: s.dockAssignment ?? '—' },
                  { Icon: MapPin, kind: 'text', label: t('supplierShipments.dock.field.location'), value: s.destination },
                ] as const
              ).map(({ Icon, kind, label, value }) => (
                <Field
                  key={label}
                  kind={kind}
                  className="px-3 py-2 bg-bg-hover rounded-md"
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={14} className="shrink-0" />
                      {label}
                    </span>
                  }
                >
                  {value}
                </Field>
              ))}
            </FieldList>
          </Card>
        ))}

      {state === 'ready' && appointments.length > 0 && (
        <Notice tone="warning" icon={Clock}>
          <span>
            {t('supplierShipments.dock.notice.arrivePre')}{' '}
            <strong>
              {t('supplierShipments.dock.notice.arriveEmphasis')}
            </strong>
            . {t('supplierShipments.dock.notice.arrivePost')}
          </span>
        </Notice>
      )}

      <Notice tone="info" icon={CheckCircle2}>
        <span>{t('supplierShipments.dock.info')}</span>
      </Notice>
    </div>
  );
};

interface ShipmentsListProps {
  asns: ASN[];
  statusFilter: StatusFilter;
  expanded: Set<string>;
  onToggleExpand: (asnNumber: string) => void;
  onSubmitAsn: (asnNumber: string) => void;
  onCreateAsnForPO: (poId: string) => void;
  confirmedPOs: PurchaseOrder[];
  /** E2E-2 — the supplier's own receipts; each notice shows its own. */
  receipts: readonly GoodsReceipt[];
}

const ShipmentsList: React.FC<ShipmentsListProps> = ({
  asns,
  statusFilter,
  expanded,
  onToggleExpand,
  onSubmitAsn,
  onCreateAsnForPO,
  confirmedPOs,
  receipts,
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
    // `asn:flag` is a `receiving` atom and this is the supplier side, so this
    // answer is `withheld` for every seat that can reach this page. It is asked
    // through the SAME resolver as the other two rather than hardcoded to a
    // notice: the day a supplier lane is granted the atom, the surface follows
    // the bundles instead of contradicting them.
    resolve: 'asn:flag',
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

  const lineColumns: Column<AsnLine>[] = [
    {
      id: 'material',
      header: t('supplierShipments.lineItems.col.material'),
      kind: 'id',
      cell: (li) => (
        <>
          <Data as="div">{li.materialCode}</Data>
          {/* i18n-defer: mock/sample data (material description) */}
          <CellSub>{li.description}</CellSub>
        </>
      ),
    },
    {
      id: 'ordered',
      header: t('supplierShipments.lineItems.col.ordered'),
      kind: 'number',
      cell: (li) => <Data>{formatNumber(li.orderedQty)}</Data>,
    },
    {
      id: 'shipped',
      header: t('supplierShipments.lineItems.col.shipped'),
      kind: 'number',
      cell: (li) => (
        <Data className={li.shippedQty < li.orderedQty ? 'text-warning-hover' : ''}>
          {formatNumber(li.shippedQty)}
        </Data>
      ),
    },
    {
      id: 'lot',
      header: t('supplierShipments.lineItems.col.lot'),
      kind: 'id',
      cell: (li) => <Data>{li.lotNumber}</Data>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {pendingPOs.length > 0 && (
        <Notice
          tone="warning"
          title={
            t(
              pendingPOs.length === 1
                ? 'supplierShipments.pending.awaiting.one'
                : 'supplierShipments.pending.awaiting.other',
              { count: pendingPOs.length },
            )
          }
        >
          <div className="flex flex-col gap-2 mt-2">
            {pendingPOs.map((po) => {
              const first = po.lineItems[0];
              return (
                <Card
                  key={po.id}
                  className="grid grid-cols-1 sm:grid-cols-[140px_1fr_180px_140px] gap-3 items-center"
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
                </Card>
              );
            })}
          </div>
        </Notice>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2">
            <SectionHeading as="h3">
              {t('supplierShipments.list.heading')}
            </SectionHeading>
            {statusFilter !== 'All' && (
              <span className="text-xs text-text-tertiary">
                ·{' '}
                {t('supplierShipments.list.filteredBy', {
                  status: t(statusLabelKey(statusFilter) ?? statusFilter),
                })}
              </span>
            )}
          </div>
        </div>
        <DataTable<ASN>
          card={false}
          rows={filtered}
          rowKey={(asn) => asn.asnNumber}
          empty={t('supplierShipments.list.empty')}
          columns={[
            {
              id: 'expand',
              header: <span className="sr-only">{t('supplierShipments.aria.expand')}</span>,
              kind: 'actions',
              headerClassName: 'w-8',
              className: 'w-8',
              cell: (asn) => {
                const isOpen = expanded.has(asn.asnNumber);
                return (
                  <IconButton
                    icon={isOpen ? ChevronDown : ChevronRight}
                    onClick={() => onToggleExpand(asn.asnNumber)}
                    aria-label={
                      isOpen
                        ? t('supplierShipments.aria.collapse')
                        : t('supplierShipments.aria.expand')
                    }
                  />
                );
              },
            },
            {
              id: 'asn',
              header: t('supplierShipments.col.asn'),
              kind: 'id',
              cell: (asn) => <Data>{asn.asnNumber}</Data>,
            },
            {
              id: 'poRef',
              header: t('supplierShipments.col.poRef'),
              kind: 'id',
              cell: (asn) => <Data>{asn.poReference}</Data>,
            },
            {
              id: 'status',
              header: t('supplierShipments.col.status'),
              kind: 'status',
              cell: (asn) => (
                <StatusPill variant={STATUS_VARIANT[asn.status]}>{asn.status}</StatusPill>
              ),
            },
            {
              id: 'carrier',
              header: t('supplierShipments.col.carrier'),
              kind: 'text',
              className: 'whitespace-nowrap',
              cell: (asn) => asn.carrier,
            },
            {
              id: 'tracking',
              header: t('supplierShipments.col.tracking'),
              kind: 'id',
              cell: (asn) => <Data>{asn.trackingNumber}</Data>,
            },
            {
              id: 'eta',
              header: t('supplierShipments.col.eta'),
              kind: 'date',
              cell: (asn) => <Data>{asn.eta ? fmtDate(asn.eta) : '—'}</Data>,
            },
            {
              id: 'actions',
              header: t('supplierShipments.col.actions'),
              kind: 'actions',
              cell: (asn) => (
                <>
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
                  {/* ⚠️ **THIS WAS A BUTTON THAT LIED, AND IT IS NOW THE
                      WAIT.** It rendered "Resolve", fired an info toast
                      ("Discrepancy handling pending"), and changed nothing.
                      Both halves of that were wrong by the time it was read:
                      `t_asn_resolve_discrepancy` has been dispatchable since
                      it was authored, and its atom `asn:flag` lives in
                      `receiving` — a BUYER lane. **No supplier lane holds
                      it** (`commercial` / `fulfilment` / `back_office`
                      carry `asn:create` and `asn:submit`, never `:flag`),
                      so this control could never have been the supplier's
                      act however well it was wired. `availabilityOfAtom`
                      therefore returns `withheld` here on every supplier
                      seat that exists, and the notice names the dock. */}
                  {asn.status === 'Discrepancy' && (
                    <HandoffNotice
                      availability={asnVerbs.resolve}
                      testId="handoff-asn-resolve"
                    />
                  )}
                  {asn.status !== 'Draft' &&
                    asn.status !== 'Discrepancy' &&
                    '—'}
                </>
              ),
            },
          ]}
          rowDetail={(asn) =>
            expanded.has(asn.asnNumber) ? (
              <div className="bg-bg-page -mx-4 -my-4 px-6 py-4">
                {/* E2E-2 — the receipt recorded against this notice. */}
                {asn.status !== 'Draft' && (
                  <Card className="mb-5">
                    <ReceivedOnNotice
                      receipts={receiptsOfNotice(asn.asnNumber, receipts)}
                      testId={`asn-received-${asn.asnNumber}`}
                    />
                  </Card>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
                  <Card>
                    <SectionHeading level="group" as="h4" className="mb-3">
                      {t('supplierShipments.detail.heading')}
                    </SectionHeading>
                    <FieldList layout="row">
                      {/* i18n-defer: mock/sample data (origin city) */}
                      <Field label={t('supplierShipments.detail.origin')} kind="text">
                        {asn.details.originCity}
                      </Field>
                      {/* i18n-defer: mock/sample data (warehouse name) */}
                      <Field label={t('supplierShipments.detail.destinationWarehouse')} kind="text">
                        {asn.details.destinationWarehouse}
                      </Field>
                      <Field label={t('supplierShipments.detail.totalCartons')} kind="number">
                        {asn.details.totalCartons
                          ? formatNumber(asn.details.totalCartons)
                          : '—'}
                      </Field>
                      <Field label={t('supplierShipments.detail.grossWeight')} kind="number">
                        {asn.details.grossWeightKg
                          ? `${formatNumber(asn.details.grossWeightKg)} kg`
                          : '—'}
                      </Field>
                      {/* i18n-defer: mock/sample data (temperature requirement) */}
                      <Field label={t('supplierShipments.detail.temperature')} kind="text">
                        {asn.details.temperatureRequirement}
                      </Field>
                      {/* OPS-3 — what was typed in the form, read back
                          from the stored notice. A dash where a field
                          was not given. */}
                      <Field
                        label={t('supplierShipments.wizard.review.field.shipDate')}
                        kind="date"
                        data-testid={`asn-shipdate-${asn.asnNumber}`}
                      >
                        {fmtDate(asn.details.shipDate ?? '')}
                      </Field>
                      <Field
                        label={t('supplierShipments.wizard.review.field.batch')}
                        kind="id"
                        data-testid={`asn-batch-${asn.asnNumber}`}
                      >
                        {asn.details.batchNumber ?? '—'}
                      </Field>
                      <Field label={t('supplierShipments.wizard.review.field.packingList')} kind="text">
                        {asn.details.packingListName
                          ? t('supplierShipments.wizard.review.packingListName', {
                              name: asn.details.packingListName,
                            })
                          : '—'}
                      </Field>
                      <Field
                        label={t('supplierShipments.wizard.review.field.notes')}
                        kind="text"
                        data-testid={`asn-notes-${asn.asnNumber}`}
                      >
                        {asn.details.notes ?? '—'}
                      </Field>
                    </FieldList>
                  </Card>
                  <Card>
                    <SectionHeading level="group" as="h4" className="mb-3">
                      {t('supplierShipments.detail.lineItems', {
                        count: asn.lineItems.length,
                      })}
                    </SectionHeading>
                    {asn.lineItems.length === 0 ? (
                      <div className="text-xs text-text-tertiary">
                        {t('supplierShipments.detail.noLineItems')}
                      </div>
                    ) : (
                      <DataTable<AsnLine>
                        density="compact"
                        card={false}
                        columns={lineColumns}
                        rows={asn.lineItems}
                        rowKey={(li) => li.materialCode}
                      />
                    )}
                  </Card>
                </div>
              </div>
            ) : null
          }
        />
      </Card>
    </div>
  );
};

const SupplierShipments: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const SHIPMENTS_CRUMB = [
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
  // OPS-2 — the dock tab reads the supplier's own shipments. Not part of the
  // page's gating reads: the tab states its own pending and failed read.
  const shipmentsQuery = useShipments();
  const dockAppointments = useMemo(
    () => dockAppointmentsOf(shipmentsQuery.data?.items ?? []),
    [shipmentsQuery.data],
  );

  const mySupplier = supplierQuery.data ?? null;
  const asns = useMemo(() => asnsQuery.data?.items ?? [], [asnsQuery.data]);
  // E2E-2 — the supplier's own receipts. A confirmed order that is fully
  // received is not offered for a new ship notice, and each notice shows the
  // receipt recorded against it.
  const receiptsQuery = useGoodsReceipts();
  const receipts = useMemo(() => receiptsQuery.data?.items ?? [], [receiptsQuery.data]);
  const CONFIRMED_POS = useMemo(
    () =>
      (posQuery.data?.items ?? []).filter((po) => !receivedOnOrder(po, receipts).fullyReceived),
    [posQuery.data, receipts],
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
  const packagesRead = readOptionalNumber(form.packages, true);
  const weightRead = readOptionalNumber(form.weightKg, false);
  const step1Valid = form.poId !== '';
  const step2Valid =
    form.carrier !== '' &&
    form.trackingNumber !== '' &&
    form.shipDate !== '' &&
    form.eta !== '' &&
    form.batchNumber !== '' &&
    packagesRead.kind !== 'refused' &&
    weightRead.kind !== 'refused';
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
      // OPS-3 — EVERYTHING the review step shows is sent. Until now only
      // carrier, tracking and ETA were, under a review step that read "all
      // values shown will be transmitted".
      const createRes = await createAsnMutation.mutateAsync({
        poReference: selectedPO.poNumber,
        ...detail,
        shipDate: form.shipDate,
        batchNumber: form.batchNumber,
        lotNumbers: selectedPO.lineItems.map((_, i) => (form.lots[i] ?? '').trim()),
        ...(packagesRead.kind === 'ok' ? { packages: packagesRead.value } : {}),
        ...(weightRead.kind === 'ok' ? { grossWeightKg: weightRead.value } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        ...(form.packingList ? { packingListName: form.packingList } : {}),
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
            <Notice tone="neutral">
              {t('supplierShipments.wizard.select.empty')}
            </Notice>
          ) : (
            CONFIRMED_POS.map((po) => {
              const selected = form.poId === po.id;
              return (
                <CardButton
                  key={po.id}
                  onClick={() =>
                    updateForm({ poId: po.id, lots: po.lineItems.map(() => '') })
                  }
                  selected={selected}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Data as="div" className="text-sm font-bold text-text-primary">
                        {po.poNumber}
                      </Data>
                      {/* OPS-3 — EVERY line of the order, with the quantity
                          the supplier CONFIRMED. It showed the first line
                          only, at the ordered quantity. */}
                      <ul className="mt-1 space-y-0.5" data-testid={`asn-po-lines-${po.id}`}>
                        {po.lineItems.map((li) => (
                          <li key={li.id} className="text-sm text-text-secondary">
                            {li.description}{' '}
                            <span className="text-xs text-text-tertiary">
                              {t('supplierShipments.wizard.select.qty')}{' '}
                              <Data>{`${formatNumber(li.confirmedQty)} ${li.uom}`}</Data>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right shrink-0">
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
                </CardButton>
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
              <FormField label={t('supplierShipments.wizard.details.field.carrier')}>
                <Select
                  value={form.carrier}
                  onChange={(e) => updateForm({ carrier: e.target.value })}
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c === 'Other' ? t('supplierShipments.option.other') : c}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t('supplierShipments.wizard.details.field.tracking')}>
                <TextInput
                  type="text"
                  mono
                  placeholder={t('supplierShipments.placeholder.tracking')}
                  value={form.trackingNumber}
                  onChange={(e) =>
                    updateForm({ trackingNumber: e.target.value })
                  }
                />
              </FormField>
              <FormField label={t('supplierShipments.wizard.details.field.shipDate')}>
                <TextInput
                  type="date"
                  value={form.shipDate}
                  onChange={(e) => updateForm({ shipDate: e.target.value })}
                />
              </FormField>
              <FormField label={t('supplierShipments.wizard.details.field.eta')}>
                <TextInput
                  type="date"
                  value={form.eta}
                  onChange={(e) => updateForm({ eta: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.packaging.eyebrow')}
            title={t('supplierShipments.wizard.details.packaging.title')}
            description={t('supplierShipments.wizard.details.packaging.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('supplierShipments.wizard.details.field.packages')}>
                <TextInput
                  type="number"
                  mono
                  min={1}
                  placeholder="0"
                  value={form.packages}
                  onChange={(e) => updateForm({ packages: e.target.value })}
                />
              </FormField>
              <FormField label={t('supplierShipments.wizard.details.field.weight')}>
                <TextInput
                  type="number"
                  mono
                  min={0}
                  placeholder="0.00"
                  value={form.weightKg}
                  onChange={(e) => updateForm({ weightKg: e.target.value })}
                />
              </FormField>
              <FormField label={t('supplierShipments.wizard.details.field.batch')}>
                <TextInput
                  type="text"
                  mono
                  placeholder={t('supplierShipments.placeholder.batch')}
                  value={form.batchNumber}
                  onChange={(e) => updateForm({ batchNumber: e.target.value })}
                />
              </FormField>
            </div>
            {(packagesRead.kind === 'refused' || weightRead.kind === 'refused') && (
              <div role="alert" data-testid="asn-number-refusal" className="text-xs text-critical">
                {t('supplierShipments.wizard.details.numberRefused')}
              </div>
            )}
            {/* One lot per order line. The receiving dock reads the lot off the
                line it is counting, so a single lot for a two-material
                shipment named the wrong goods on one of them. */}
            <Card padding="none" className="overflow-hidden">
              <DataTable<PoLine>
                density="compact"
                card={false}
                testId="asn-line-lots"
                rows={selectedPO?.lineItems ?? []}
                rowKey={(li) => li.id}
                columns={[
                  {
                    id: 'material',
                    header: t('supplierShipments.lineItems.col.material'),
                    kind: 'id',
                    cell: (li) => (
                      <>
                        <Data as="div">{li.materialCode}</Data>
                        <CellSub>{li.description}</CellSub>
                      </>
                    ),
                  },
                  {
                    id: 'shipping',
                    header: t('supplierShipments.wizard.details.col.shipping'),
                    kind: 'number',
                    className: 'whitespace-nowrap',
                    cell: (li) => <Data>{`${formatNumber(li.confirmedQty)} ${li.uom}`}</Data>,
                  },
                  {
                    id: 'lot',
                    header: t('supplierShipments.wizard.details.field.lot'),
                    kind: 'text',
                    cell: (li, idx) => (
                      <TextInput
                        type="text"
                        mono
                        aria-label={`${t('supplierShipments.wizard.details.field.lot')} ${li.materialCode}`}
                        placeholder={t('supplierShipments.placeholder.lot')}
                        value={form.lots[idx] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => {
                            const lots = [...f.lots];
                            lots[idx] = v;
                            return { ...f, lots };
                          });
                        }}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.docs.eyebrow')}
            title={t('supplierShipments.wizard.details.docs.title')}
            description={t('supplierShipments.wizard.details.docs.desc')}
          >
            <div>
              <FormField label={t('supplierShipments.wizard.details.field.packingList')}>
              <span className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    updateForm({
                      packingList: e.target.files?.[0]?.name ?? '',
                    })
                  }
                />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border-input rounded-md text-sm text-teal-text font-semibold bg-bg-surface">
                  <Upload size={14} />
                  {t('supplierShipments.wizard.details.chooseFile')}
                </span>
                <span
                  className={`text-xs ${form.packingList ? 'text-success' : 'text-text-tertiary'}`}
                >
                  {form.packingList || t('supplierShipments.wizard.details.noFile')}
                </span>
              </span>
              </FormField>
              <p className="mt-1 text-xs text-text-tertiary">
                {t('supplierShipments.wizard.details.packingListNote')}
              </p>
            </div>
            <FormField label={t('supplierShipments.wizard.details.field.notes')}>
              <TextArea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={3}
                placeholder={t('supplierShipments.placeholder.notes')}
                className="resize-y"
              />
            </FormField>
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
            <FieldList columns={1} className="sm:grid-cols-2">
              {(
                [
                  [t('supplierShipments.wizard.review.field.poNumber'), selectedPO?.poNumber ?? '—', 'id'],
                  [t('supplierShipments.wizard.review.field.carrier'), form.carrier, 'text'],
                  [t('supplierShipments.wizard.review.field.tracking'), form.trackingNumber || '—', 'id'],
                  [t('supplierShipments.wizard.review.field.shipDate'), fmtDate(form.shipDate), 'date'],
                  [t('supplierShipments.wizard.review.field.eta'), form.eta ? fmtDate(form.eta) : '—', 'date'],
                  [t('supplierShipments.wizard.review.field.packages'), form.packages || '—', 'number'],
                  [
                    t('supplierShipments.wizard.review.field.weight'),
                    form.weightKg ? `${form.weightKg} kg` : '—',
                    'number',
                  ],
                  [t('supplierShipments.wizard.review.field.batch'), form.batchNumber || '—', 'id'],
                  [
                    t('supplierShipments.wizard.review.field.packingList'),
                    form.packingList
                      ? t('supplierShipments.wizard.review.packingListName', {
                          name: form.packingList,
                        })
                      : '—',
                    'text',
                  ],
                  [t('supplierShipments.wizard.review.field.notes'), form.notes.trim() || '—', 'text'],
                ] as const
              ).map(([k, v, kind]) => (
                <Field key={k} label={k} kind={kind} className="bg-bg-hover rounded-md px-3 py-2">
                  {v}
                </Field>
              ))}
            </FieldList>
            {/* Every order line, at the quantity that ships — the confirmed
                one — with the lot typed for it. */}
            <Card padding="none" className="overflow-hidden">
              <DataTable<PoLine>
                density="compact"
                card={false}
                testId="asn-review-lines"
                rows={selectedPO?.lineItems ?? []}
                rowKey={(li) => li.id}
                columns={[
                  {
                    id: 'material',
                    header: t('supplierShipments.lineItems.col.material'),
                    kind: 'id',
                    cell: (li) => (
                      <>
                        <Data as="div">{li.materialCode}</Data>
                        <CellSub>{li.description}</CellSub>
                      </>
                    ),
                  },
                  {
                    id: 'ordered',
                    header: t('supplierShipments.lineItems.col.ordered'),
                    kind: 'number',
                    className: 'whitespace-nowrap',
                    cell: (li) => <Data>{`${formatNumber(li.quantity)} ${li.uom}`}</Data>,
                  },
                  {
                    id: 'shipping',
                    header: t('supplierShipments.wizard.details.col.shipping'),
                    kind: 'number',
                    className: 'whitespace-nowrap',
                    cell: (li) => <Data>{`${formatNumber(li.confirmedQty)} ${li.uom}`}</Data>,
                  },
                  {
                    id: 'lot',
                    header: t('supplierShipments.lineItems.col.lot'),
                    kind: 'id',
                    cell: (_li, idx) => <Data>{(form.lots[idx] ?? '').trim() || '—'}</Data>,
                  },
                ]}
              />
            </Card>
          </FormSection>

          <ChoiceCard
            type="checkbox"
            checked={form.confirmed}
            onChange={(e) => updateForm({ confirmed: e.target.checked })}
          >
            {t('supplierShipments.wizard.review.confirm')}
          </ChoiceCard>
        </div>
      ),
    },
  ];

  return (
    <ListPage
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
      meta={
        <>
          {t('supplierShipments.meta.summary', {
            shipments: asns.length,
            pos: CONFIRMED_POS.length,
          })}
          {/* D-CENSUS-8 — PARTLY REAL, both axes. ASN create + submit dispatch through
              the wired `advanceShipNotice` target and cascade into goods receipt; the
              POs being shipped against are fixtures. */}
          <ProvenanceMarker capability="advanceShipNotices" className="ml-3 align-middle" />
        </>
      }
      kpiColumns={5}
      kpis={
        <>
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
        </>
      }
      tabs={
      <SubTabs<TabKey>
        options={[
          { id: 'shipments', label: t('supplierShipments.tab.myShipments'), count: asns.length },
          // Withheld rather than disabled — §73's rule, applied to a tab: a seat
          // that cannot finish the wizard is not offered its first step.
          ...(wizardHeld
            ? [{ id: 'create' as TabKey, label: t('supplierShipments.tab.createAsn') }]
            : []),
          { id: 'dock', label: t('supplierShipments.tab.dock'), count: dockAppointments.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      }
    >
      {tab === 'shipments' && (
        <ShipmentsList
          asns={asns}
          statusFilter={statusFilter}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onSubmitAsn={openSubmitForm}
          onCreateAsnForPO={createAsnForPO}
          confirmedPOs={CONFIRMED_POS}
          receipts={receipts}
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

      {tab === 'dock' && (
        <DockAppointments
          appointments={dockAppointments}
          state={shipmentsQuery.isPending ? 'pending' : shipmentsQuery.isError ? 'error' : 'ready'}
        />
      )}

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
            <FormField label={t('asn.submit.form.carrier')}>
              <Select
                value={submitForm.carrier}
                onChange={(e) => setSubmitForm((f) => ({ ...f, carrier: e.target.value }))}
              >
                {CARRIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === 'Other' ? t('supplierShipments.option.other') : c}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('asn.submit.form.tracking')}>
              <TextInput
                type="text"
                mono
                value={submitForm.trackingNumber}
                onChange={(e) => setSubmitForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                placeholder={t('supplierShipments.placeholder.tracking')}
              />
            </FormField>
            <FormField label={t('asn.submit.form.eta')}>
              <TextInput
                type="date"
                value={submitForm.eta}
                onChange={(e) => setSubmitForm((f) => ({ ...f, eta: e.target.value }))}
              />
            </FormField>
          </div>
        )}
      </SidePanel>
    </ListPage>
  );
};

export default SupplierShipments;
