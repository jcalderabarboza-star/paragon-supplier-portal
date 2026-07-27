import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Boxes,
  CalendarRange,
  Info,
  Layers,
  Lock,
  Plus,
  Send,
  Ship,
  Table2,
  Trash2,
  Truck,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import FormSection from '../components/ui-v2/FormSection';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useCurrentSupplier } from '../services/query/hooks';
import {
  useOwnForecastLines,
  useOwnRequirementResponses,
  useRequirementResponseSubmit,
  useRequirementResponseAcknowledge,
  useOwnCollaboratedMaterials,
  useOwnInventoryDeclarations,
  useOwnIncomingShipments,
  useOwnSupplierAsns,
  useInventoryDeclare,
  useIncomingShipmentReport,
  type CollaboratedMaterialView,
  type IncomingShipmentView,
} from '../services/query/sdcSupplierHooks';
import {
  MATERIAL_MASTER,
  buildRequirementResponsePayload,
  buildRequirementAcknowledgePayload,
  buildInventoryDeclarationPayload,
  normalizeInventoryDeclarationDraft,
  buildIncomingShipmentPayload,
  declarationGranularity,
  openSubmissionSession,
  type CommitmentClass,
  type ForecastLine,
  type ForecastPublication,
  type InventoryDeclaration,
  type RequirementResponse,
  type SdcObjectKind,
  type ShipmentDirection,
  type SubmissionSessionRecorder,
} from '../services/sdc';
import type { ASN, CommandResult } from '../services/data/types';
import { formatDate, formatNumber } from '../lib/format';
import { statusLabelKey } from '../lib/statusLabel';
import BulkStockEntryGrid from './BulkStockEntryGrid';

// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts (SDC-2b → SDC-3b) — the P1 supplier SUBMISSION HUB. One
// supplier visit, three declarable object kinds, all riding ONE
// SubmissionSession envelope (addendum §5) with PER-OBJECT partial success:
//   · Forecast lines   — confirm / acknowledge a published line
//                        (t_requirementresponse_submit / _acknowledge, SDC-2b).
//   · Stock (SOH)      — declare current stock, TOTAL-FIRST + optional batch
//                        detail (t_inventorydeclaration_declare, SDC-3a).
//   · Shipments        — report an incoming leg, direction-guarded
//                        (t_incomingshipment_report, SDC-3a).
//
// SESSION + causationId (SDC-3a seam, now DRIVEN): the FIRST dispatch of a visit
// becomes the audit anchor; every later dispatch passes `causationAnchor()` as
// its causationId, so a visit's DR-10 events group WITHOUT collapsing their own
// correlationIds. Each object validates independently — a forecast confirm can
// land while a SOH declare fails, each reporting its own toast.
//
// HONESTY (FLAG-2, all three layers) — unchanged from SDC-2b:
//   1+2 (structural) — the forecast read comes through supplierVisiblePublications()
//       (LIVE-only); the governed lane is empty, so the page renders the SIMULATED
//       sample ONLY under the explicit sample banner + registry LivenessPill.
//   3   (vocabulary) — the supplier-facing class vocabulary is commitmentClass
//       ONLY; no internal liveness / plan-state grammar reaches a supplier.
//   The Stock tab carries its OWN registry pill (`inventory`) — wired (gate-1)
//   but harvest-gated → "Sample — awaiting live supplier feed", green unreachable.
//
// OWN-FACTS-ONLY (FORK-3b-C): own lines / own submissions / own declarations /
// own shipments, STATUS-or-STATE only — never another supplier's data, never a
// rank or score. Page-level own-filtering today; service-level scoping = SDC-4.
//
// uom is NEVER typed — every qty field inherits its material's canonical uom
// from the master (invariant #2); the surface shows it read-only.
// ────────────────────────────────────────────────────────────────────────────

type TabKey = 'lines' | 'stock' | 'shipments' | 'responses';

const CLASS_LABEL_KEY: Record<CommitmentClass, string> = {
  firm: 'sdcSup.class.firm',
  'semi-firm': 'sdcSup.class.semiFirm',
  'visibility-only': 'sdcSup.class.visibilityOnly',
};

// Root-cause level-1 vocabulary offered by the form (the child object's
// category axis; free-text note carries the specifics).
const ROOT_CAUSE_LEVELS = ['capacity', 'material', 'logistics', 'quality', 'other'] as const;

// Quiet-outlined chip (DP-3 status-chip grammar — soft tint, thin border).
const CHIP =
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium border-border-subtle bg-bg-hover text-text-secondary';

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface ConfirmForm {
  confirmedQty: string;
  committedDate: string;
  capacityConstraint: string;
  rootCauseLevel1: string;
  rootCauseNote: string;
}

const emptyForm: ConfirmForm = {
  confirmedQty: '',
  committedDate: '',
  capacityConstraint: '',
  rootCauseLevel1: '',
  rootCauseNote: '',
};

// — SOH declare form (total-first + optional batch detail) —
interface SohBatchForm {
  batchNumber: string;
  qty: string;
  expiryDate: string;
}
interface SohForm {
  materialCode: string;
  totalQty: string;
  batches: SohBatchForm[];
}
const emptySohForm: SohForm = { materialCode: '', totalQty: '', batches: [] };

// — Shipment report form (direction-guarded) —
interface ShipmentForm {
  materialCode: string;
  direction: ShipmentDirection | '';
  qty: string;
  etd: string;
  eta: string;
  awb: string;
  /** to-paragon ONLY — the SELECTED own-ASN number (never free-typed). */
  asnRef: string;
}
const emptyShipmentForm: ShipmentForm = {
  materialCode: '',
  direction: '',
  qty: '',
  etd: '',
  eta: '',
  awb: '',
  asnRef: '',
};

const materialLabel = (code: string): string => MATERIAL_MASTER[code]?.label ?? code;
const materialUom = (code: string) => MATERIAL_MASTER[code]?.canonicalUom ?? 'KG';
const numberFromField = (v: string): number => Number(v.replace(/,/g, ''));

/** The latest own response answering this exact published line (this
 *  publication), for the inline "your latest response" echo. */
const latestResponseFor = (
  responses: readonly RequirementResponse[],
  publication: ForecastPublication,
  line: ForecastLine,
): RequirementResponse | undefined =>
  responses
    .filter(
      (r) =>
        r.publicationId === publication.publicationId &&
        r.materialCode === line.materialCode &&
        r.periodBucket === line.periodBucket,
    )
    .reduce<RequirementResponse | undefined>(
      (best, r) => (!best || r.submissionVersion > best.submissionVersion ? r : best),
      undefined,
    );

const LineCard: React.FC<{
  line: ForecastLine;
  latest?: RequirementResponse;
  onConfirm: (line: ForecastLine) => void;
  onAcknowledge: (line: ForecastLine) => void;
}> = ({ line, latest, onConfirm, onAcknowledge }) => {
  const { t } = useTranslation();
  const confirmable = line.commitmentClass !== 'visibility-only';
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Data className="text-sm font-bold text-text-primary">{line.materialCode}</Data>
            <span className={CHIP}>
              {line.commitmentClass === 'firm' && <Lock size={11} aria-hidden="true" />}
              {t(CLASS_LABEL_KEY[line.commitmentClass])}
            </span>
          </div>
          <div className="text-base font-semibold text-text-primary mt-1">
            {materialLabel(line.materialCode)}
          </div>
        </div>
        {confirmable ? (
          // Outline opener — the SOLID commit lives on the panel's Submit (F-3).
          <Button variant="outline" onClick={() => onConfirm(line)}>
            {t('sdcSup.line.confirm')}
          </Button>
        ) : (
          // SDC-2b-EXT: a visibility-only line takes a RESPONSE (acknowledge +
          // optional signal), never a commitment — quieter affordance by design.
          <div className="flex flex-col items-end gap-1.5 max-w-[14rem]">
            <Button variant="outline" onClick={() => onAcknowledge(line)}>
              {t('sdcSup.line.acknowledge')}
            </Button>
            <span className="text-xs italic text-text-tertiary text-right">
              {t('sdcSup.line.visibilityHint')}
            </span>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.line.demand')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {formatNumber(line.forecastQty)} {line.uom}
          </Data>
        </div>
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.line.period')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {line.periodBucket}
          </Data>
        </div>
      </dl>

      {latest && (
        <div className="mt-3 text-xs text-text-secondary">
          {latest.acknowledgment
            ? t('sdcSup.line.lastResponseAck', {
                version: latest.submissionVersion,
                status: statusLabelKey(latest.status)
                  ? t(statusLabelKey(latest.status)!)
                  : latest.status,
              })
            : t('sdcSup.line.lastResponse', {
                qty: formatNumber(latest.forecastConfirmation!.confirmedQty),
                uom: latest.forecastConfirmation!.uom,
                version: latest.submissionVersion,
                // Same central status map StatusPill localizes through.
                status: statusLabelKey(latest.status)
                  ? t(statusLabelKey(latest.status)!)
                  : latest.status,
              })}
        </div>
      )}
    </div>
  );
};

const ResponsesTab: React.FC<{ responses: readonly RequirementResponse[] }> = ({
  responses,
}) => {
  const { t } = useTranslation();
  if (responses.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Send size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('sdcSup.responses.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('sdcSup.responses.emptyBody')}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-responses">
      {responses.map((r) => (
        <div
          key={r.id}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Data className="text-sm font-bold text-text-primary">{r.id}</Data>
              <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                {r.materialCode}
              </Data>
            </div>
            {/* Own facts + STATUS only (FORK-3b-C) — never a rank or score. */}
            <StatusPill variant="neutral">{r.status}</StatusPill>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t('sdcSup.responses.col.material'), value: materialLabel(r.materialCode) },
              { label: t('sdcSup.responses.col.period'), value: r.periodBucket },
              {
                // SDC-2b-EXT: an acknowledgment carries NO qty — the cell reads
                // "Acknowledged" under a "Response" label; the word "confirmed"
                // never appears on a visibility response.
                label: r.acknowledgment
                  ? t('sdcSup.responses.col.response')
                  : t('sdcSup.responses.col.confirmed'),
                value: r.acknowledgment
                  ? t('sdcSup.responses.ack')
                  : `${formatNumber(r.forecastConfirmation!.confirmedQty)} ${r.forecastConfirmation!.uom}`,
              },
              {
                label: t('sdcSup.responses.col.committedDate'),
                value: r.forecastConfirmation?.committedDate
                  ? formatDate(r.forecastConfirmation.committedDate)
                  : '—',
              },
              { label: t('sdcSup.responses.col.version'), value: `v${r.submissionVersion}` },
              {
                label: t('sdcSup.responses.col.submitted'),
                value: r.submittedAt ? formatDate(r.submittedAt) : '—',
              },
            ].map((d) => (
              <div key={d.label} className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">{d.label}</dt>
                <Data as="dd" className="text-sm font-semibold">
                  {d.value}
                </Data>
              </div>
            ))}
          </dl>
          {r.acknowledgment?.note && (
            <div className="mt-3 text-xs text-text-secondary">
              <span className="text-label text-text-tertiary uppercase">
                {t('sdcSup.responses.note')}
              </span>{' '}
              {r.acknowledgment.note}
            </div>
          )}
          {r.rootCause && (
            <div className="mt-3 text-xs text-text-secondary">
              <span className="text-label text-text-tertiary uppercase">
                {t('sdcSup.responses.rootCause')}
              </span>{' '}
              {r.rootCause.level1}
              {r.rootCause.note ? ` — ${r.rootCause.note}` : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── SDC-3b — My current stock (SOH) tab ──────────────────────────────────────
const DeclarationsTab: React.FC<{
  declarations: readonly InventoryDeclaration[];
  onDeclare: () => void;
  onBulkEntry: () => void;
}> = ({ declarations, onDeclare, onBulkEntry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-declarations">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-secondary">{t('sdcSup.stock.subtitle')}</p>
        {/* Both OUTLINE — a SOH declaration is a routine submission, not the
            page's ONE commitment (that stays the solid forecast confirm). The
            bulk grid is the batch-grain path (DEC-MAGIC-LINK-GRID). */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" icon={Table2} onClick={onBulkEntry}>
            {t('sdcSup.bulk.entry')}
          </Button>
          <Button variant="outline" icon={Plus} onClick={onDeclare}>
            {t('sdcSup.stock.declare')}
          </Button>
        </div>
      </div>
      {declarations.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
            <Boxes size={20} className="text-text-tertiary" />
          </div>
          <div className="text-base font-semibold text-text-primary mb-1">
            {t('sdcSup.stock.emptyTitle')}
          </div>
          <div className="text-sm text-text-tertiary">{t('sdcSup.stock.emptyBody')}</div>
        </div>
      ) : (
        declarations.map((d) => {
          const grain = declarationGranularity(d);
          return (
            <div
              key={d.id}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Data className="text-sm font-bold text-text-primary">{d.materialCode}</Data>
                    <span className={CHIP}>
                      {grain === 'batch-grain'
                        ? t('sdcSup.stock.grain.batch')
                        : t('sdcSup.stock.grain.total')}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-text-primary mt-1">
                    {materialLabel(d.materialCode)}
                  </div>
                </div>
                <div className="text-right">
                  <Data className="text-lg font-bold text-text-primary">
                    {formatNumber(d.totalQty)} {d.uom}
                  </Data>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {t('sdcSup.stock.asOf', { date: formatDate(d.declaredAt) })}
                  </div>
                </div>
              </div>

              {grain === 'batch-grain' && d.batches ? (
                <ul className="mt-4 divide-y divide-border-subtle rounded-md border border-border-subtle overflow-hidden">
                  {d.batches.map((b) => (
                    <li
                      key={b.batchNumber}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm bg-bg-hover"
                    >
                      <Data className="font-semibold text-text-primary">{b.batchNumber}</Data>
                      <Data className="text-text-secondary">
                        {formatNumber(b.qty)} {b.uom}
                      </Data>
                      <span className="ml-auto text-xs text-text-tertiary">
                        {b.expiryDate
                          ? t('sdcSup.stock.expiry', { date: formatDate(b.expiryDate) })
                          : t('sdcSup.stock.noExpiry')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                // Total-only: honest about the missing detail — never presented
                // as "no expiry risk" (the EXPIRY-BLIND rule, supplier-side).
                <p className="mt-3 text-xs italic text-text-tertiary">
                  {t('sdcSup.stock.totalOnlyHint')}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// ── SDC-3b — My reported shipments tab ───────────────────────────────────────
const LIFECYCLE_LABEL_KEY: Record<string, string> = {
  Booked: 'sdcSup.ship.state.booked',
  Shipped: 'sdcSup.ship.state.shipped',
  Arrived: 'sdcSup.ship.state.arrived',
  Cancelled: 'sdcSup.ship.state.cancelled',
};
const DIRECTION_LABEL_KEY: Record<ShipmentDirection, string> = {
  'to-paragon': 'sdcSup.ship.dir.toParagon',
  'principal-to-distributor': 'sdcSup.ship.dir.p2d',
};

const ShipmentsTab: React.FC<{
  shipments: readonly IncomingShipmentView[];
  onReport: () => void;
}> = ({ shipments, onReport }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-shipments">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-secondary">{t('sdcSup.ship.subtitle')}</p>
        <Button variant="outline" icon={Plus} onClick={onReport}>
          {t('sdcSup.ship.report')}
        </Button>
      </div>
      {shipments.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
            <Truck size={20} className="text-text-tertiary" />
          </div>
          <div className="text-base font-semibold text-text-primary mb-1">
            {t('sdcSup.ship.emptyTitle')}
          </div>
          <div className="text-sm text-text-tertiary">{t('sdcSup.ship.emptyBody')}</div>
        </div>
      ) : (
        shipments.map(({ shipment: s, display }) => (
          <div
            key={s.id}
            className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Data className="text-sm font-bold text-text-primary">{s.materialCode}</Data>
                  <span className={CHIP}>{t(DIRECTION_LABEL_KEY[s.direction])}</span>
                </div>
                <div className="text-base font-semibold text-text-primary mt-1">
                  {materialLabel(s.materialCode)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusPill variant="neutral">
                  {t(LIFECYCLE_LABEL_KEY[display.lifecycle] ?? 'sdcSup.ship.state.booked')}
                </StatusPill>
                {display.derivedFromAsn && (
                  // Drift-honesty: a to-paragon leg's state is the LINKED ASN's,
                  // not a stored supplier claim — labelled so it can't be mistaken.
                  <span className="text-[10px] italic text-text-tertiary">
                    {t('sdcSup.ship.trackedViaAsn', { asn: s.asnRef })}
                  </span>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">
                  {t('sdcSup.ship.col.qty')}
                </dt>
                <Data as="dd" className="text-sm font-semibold">
                  {formatNumber(s.qty)} {s.uom}
                </Data>
              </div>
              <div className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">
                  {t('sdcSup.ship.col.eta')}
                </dt>
                <Data as="dd" className="text-sm font-semibold">
                  {s.eta ? formatDate(s.eta) : '—'}
                </Data>
              </div>
              <div className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">
                  {t('sdcSup.ship.col.etd')}
                </dt>
                <Data as="dd" className="text-sm font-semibold">
                  {s.etd ? formatDate(s.etd) : '—'}
                </Data>
              </div>
              <div className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">
                  {s.direction === 'to-paragon'
                    ? t('sdcSup.ship.col.asn')
                    : t('sdcSup.ship.col.awb')}
                </dt>
                <Data as="dd" className="text-sm font-semibold">
                  {s.direction === 'to-paragon' ? (s.asnRef ?? '—') : (s.awb ?? '—')}
                </Data>
              </div>
            </dl>
          </div>
        ))
      )}
    </div>
  );
};

interface WorkspaceProps {
  supplierId: string;
  supplierName: string;
  publication: ForecastPublication;
  lines: readonly ForecastLine[];
  liveFeed: boolean;
  responses: readonly RequirementResponse[];
  materials: readonly CollaboratedMaterialView[];
  declarations: readonly InventoryDeclaration[];
  shipments: readonly IncomingShipmentView[];
  asns: readonly ASN[];
}

const ForecastWorkspace: React.FC<WorkspaceProps> = ({
  supplierId,
  supplierName,
  publication,
  lines,
  liveFeed,
  responses,
  materials,
  declarations,
  shipments,
  asns,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const crumb = [t('sdcSup.crumb.section'), t('sdcSup.crumb.page')];
  const submitMutation = useRequirementResponseSubmit();
  const acknowledgeMutation = useRequirementResponseAcknowledge();
  const declareMutation = useInventoryDeclare();
  const reportMutation = useIncomingShipmentReport();
  const [activeTab, setActiveTab] = useState<TabKey>('lines');
  const [panelLine, setPanelLine] = useState<ForecastLine | null>(null);
  const [form, setForm] = useState<ConfirmForm>(emptyForm);
  // SDC-2b-EXT — the visibility-response panel (acknowledge + optional note).
  const [ackPanelLine, setAckPanelLine] = useState<ForecastLine | null>(null);
  const [ackNote, setAckNote] = useState('');
  // SDC-3b — the two additional object panels.
  const [sohOpen, setSohOpen] = useState(false);
  const [sohForm, setSohForm] = useState<SohForm>(emptySohForm);
  // SDC-3c-b — the editable bulk stock-entry grid (batch-grain, on the Stock tab).
  const [bulkOpen, setBulkOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipForm, setShipForm] = useState<ShipmentForm>(emptyShipmentForm);

  // ONE SubmissionSession envelope per supplier visit (addendum §5): each
  // dispatched object records an attempt on it, and every dispatch AFTER the
  // first passes the anchor correlationId as its causationId (the SDC-3a seam,
  // now driven). Degenerate no longer — three object kinds share this recorder.
  const sessionRef = useRef<SubmissionSessionRecorder | null>(null);
  /** The visit's audit anchor for the NEXT dispatch — undefined for the first
   *  (which becomes the anchor once recorded). */
  const causationId = (): string | undefined => sessionRef.current?.causationAnchor() ?? undefined;
  /** Record a settled dispatch on the visit envelope (opening it on first use). */
  const recordAttempt = (kind: SdcObjectKind, res: CommandResult) => {
    if (!sessionRef.current) {
      sessionRef.current = openSubmissionSession(
        `ss-p1-${Date.now().toString(36)}`,
        supplierId,
        new Date().toISOString(),
      );
    }
    sessionRef.current.attempt(kind, res.entityId ?? '', res.correlationId);
  };

  const openConfirm = (line: ForecastLine) => {
    setPanelLine(line);
    setForm(emptyForm);
  };
  const openAcknowledge = (line: ForecastLine) => {
    setAckPanelLine(line);
    setAckNote('');
  };
  const openSoh = () => {
    setSohForm(emptySohForm);
    setSohOpen(true);
  };
  const openShip = () => {
    setShipForm(emptyShipmentForm);
    setShipOpen(true);
  };

  const qtyNumber = numberFromField(form.confirmedQty);
  const isShort =
    panelLine !== null &&
    form.confirmedQty.trim() !== '' &&
    !Number.isNaN(qtyNumber) &&
    qtyNumber < panelLine.forecastQty;

  const failToast = () =>
    toast({
      variant: 'error',
      title: t('sdcSup.toast.failed.title'),
      description: t('sdcSup.toast.failed.body'),
    });

  const submitConfirmation = async () => {
    if (!panelLine) return;
    // Quantity must be STATED — 0 is legal (F-2), an empty field is not.
    if (form.confirmedQty.trim() === '' || Number.isNaN(qtyNumber)) {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.missingQty.title'),
        description: t('sdcSup.toast.missingQty.body'),
      });
      return;
    }
    // Short (including 0): the deviation needs its root cause (form-level rule).
    if (qtyNumber < panelLine.forecastQty && !form.rootCauseLevel1) {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.missingRootCause.title'),
        description: t('sdcSup.toast.missingRootCause.body'),
      });
      return;
    }
    // Snapshot keys come from the RENDERED publication + line; supplierId from
    // the IDENTITY — never the form (un-falsifiable binding, SDC-2a).
    const payload = buildRequirementResponsePayload(publication, panelLine, supplierId, {
      confirmedQty: form.confirmedQty,
      ...(form.committedDate ? { committedDate: form.committedDate } : {}),
      ...(form.capacityConstraint ? { capacityConstraint: form.capacityConstraint } : {}),
      ...(form.rootCauseLevel1
        ? {
            rootCause: {
              level1: form.rootCauseLevel1,
              ...(form.rootCauseNote ? { note: form.rootCauseNote } : {}),
            },
          }
        : {}),
    });
    try {
      const res = await submitMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      recordAttempt('RequirementResponse', res);
      toast({
        variant: 'success',
        title: t('sdcSup.toast.submitted.title', {
          material: materialLabel(panelLine.materialCode),
        }),
        description: t('sdcSup.toast.submitted.body'),
      });
      setPanelLine(null);
      setForm(emptyForm);
      setActiveTab('responses');
    } catch {
      failToast();
    }
  };

  // SDC-2b-EXT — the visibility response: acknowledge + optional signal.
  const submitAcknowledgment = async () => {
    if (!ackPanelLine) return;
    const payload = buildRequirementAcknowledgePayload(
      publication,
      ackPanelLine,
      supplierId,
      ackNote,
    );
    try {
      const res = await acknowledgeMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      recordAttempt('RequirementResponse', res);
      toast({
        variant: 'success',
        title: t('sdcSup.toast.acknowledged.title', {
          material: materialLabel(ackPanelLine.materialCode),
        }),
        description: t('sdcSup.toast.acknowledged.body'),
      });
      setAckPanelLine(null);
      setAckNote('');
      setActiveTab('responses');
    } catch {
      failToast();
    }
  };

  // ── SDC-3b — SOH declare ───────────────────────────────────────────────────
  const sohBatches = sohForm.batches.filter((b) => b.batchNumber.trim() !== '');
  const sohBatchSum = sohBatches.reduce((s, b) => s + (numberFromField(b.qty) || 0), 0);
  const sohTotal = numberFromField(sohForm.totalQty);
  // Client-side pre-check (the INV_DECLARE_BATCH_TOTAL hook is the real gate):
  // when batch detail is present, Σ must equal the declared total.
  const sohBatchMismatch = sohBatches.length > 0 && !Number.isNaN(sohTotal) && sohBatchSum !== sohTotal;

  const submitSoh = async () => {
    if (!sohForm.materialCode) {
      toast({
        variant: 'error',
        title: t('sdcSup.stock.toast.missingMaterial.title'),
        description: t('sdcSup.stock.toast.missingMaterial.body'),
      });
      return;
    }
    if (sohForm.totalQty.trim() === '' || Number.isNaN(sohTotal)) {
      toast({
        variant: 'error',
        title: t('sdcSup.stock.toast.missingTotal.title'),
        description: t('sdcSup.stock.toast.missingTotal.body'),
      });
      return;
    }
    if (sohBatchMismatch) {
      toast({
        variant: 'error',
        title: t('sdcSup.stock.toast.batchMismatch.title'),
        description: t('sdcSup.stock.toast.batchMismatch.body', {
          sum: formatNumber(sohBatchSum),
          total: formatNumber(sohTotal),
        }),
      });
      return;
    }
    // CP-0 · PR-2a — the builder no longer coerces; the ONE legal parse happens
    // here and its result is what ships. An unreadable or genuinely ambiguous
    // quantity refuses honestly rather than being defaulted to 0 or guessed.
    // The typed input-type change (6.2) and the inline convention declaration
    // (§5a) land with this surface's own batch; this call site only stops the
    // fabrication at the payload boundary.
    const normalized = normalizeInventoryDeclarationDraft({
      totalQty: sohForm.totalQty,
      ...(sohBatches.length > 0
        ? {
            batches: sohBatches.map((b) => ({
              batchNumber: b.batchNumber,
              qty: b.qty,
              ...(b.expiryDate ? { expiryDate: b.expiryDate } : {}),
            })),
          }
        : {}),
    });
    if (!normalized.ok) {
      toast({
        variant: 'error',
        title: t('sdcSup.stock.toast.missingTotal.title'),
        description: t('sdcSup.stock.toast.missingTotal.body'),
      });
      return;
    }
    const payload = buildInventoryDeclarationPayload(
      supplierId,
      sohForm.materialCode,
      normalized.value,
    );
    try {
      const res = await declareMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.stock.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      recordAttempt('InventoryDeclaration', res);
      toast({
        variant: 'success',
        title: t('sdcSup.stock.toast.declared.title', {
          material: materialLabel(sohForm.materialCode),
        }),
        description: t('sdcSup.stock.toast.declared.body'),
      });
      setSohOpen(false);
      setSohForm(emptySohForm);
      setActiveTab('stock');
    } catch {
      failToast();
    }
  };

  // ── SDC-3b — shipment report ───────────────────────────────────────────────
  const shipMaterial = materials.find((m) => m.materialCode === shipForm.materialCode) ?? null;
  // Direction legality (the surface never offers an illegal pairing):
  // to-paragon is always legal; principal-to-distributor ONLY for a distributor.
  const p2dLegal = shipMaterial?.supplierType === 'distributor';
  // The supplier's own ASNs are the to-paragon link source (asnRef is SELECTED,
  // never free-typed — it resolves server-side, per the R-4 note).
  const ownAsns = asns;

  const setShipMaterial = (materialCode: string) => {
    const m = materials.find((x) => x.materialCode === materialCode) ?? null;
    setShipForm((f) => ({
      ...f,
      materialCode,
      // Reset a now-illegal direction (p2d on a non-distributor material).
      direction:
        f.direction === 'principal-to-distributor' && m?.supplierType !== 'distributor'
          ? ''
          : f.direction,
    }));
  };
  const setShipAsn = (asnNumber: string) => {
    const asn = ownAsns.find((a) => a.asnNumber === asnNumber);
    // Auto-fill the AWB from the linked ASN's tracking number (read-only echo).
    setShipForm((f) => ({ ...f, asnRef: asnNumber, awb: asn?.trackingNumber ?? '' }));
  };

  const submitShipment = async () => {
    if (!shipForm.materialCode) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingMaterial.title'),
        description: t('sdcSup.ship.toast.missingMaterial.body'),
      });
      return;
    }
    if (!shipForm.direction) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingDirection.title'),
        description: t('sdcSup.ship.toast.missingDirection.body'),
      });
      return;
    }
    if (shipForm.qty.trim() === '' || Number.isNaN(numberFromField(shipForm.qty))) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingQty.title'),
        description: t('sdcSup.ship.toast.missingQty.body'),
      });
      return;
    }
    // to-paragon MUST link an own ASN (the guard enforces; the surface requires it).
    if (shipForm.direction === 'to-paragon' && !shipForm.asnRef) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingAsn.title'),
        description: t('sdcSup.ship.toast.missingAsn.body'),
      });
      return;
    }
    const payload = buildIncomingShipmentPayload(
      supplierId,
      shipForm.materialCode,
      shipForm.direction,
      {
        qty: shipForm.qty,
        ...(shipForm.etd ? { etd: shipForm.etd } : {}),
        ...(shipForm.eta ? { eta: shipForm.eta } : {}),
        ...(shipForm.awb ? { awb: shipForm.awb } : {}),
        ...(shipForm.direction === 'to-paragon' && shipForm.asnRef
          ? { asnRef: shipForm.asnRef }
          : {}),
      },
    );
    try {
      const res = await reportMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.ship.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      recordAttempt('IncomingShipment', res);
      toast({
        variant: 'success',
        title: t('sdcSup.ship.toast.reported.title', {
          material: materialLabel(shipForm.materialCode),
        }),
        description: t('sdcSup.ship.toast.reported.body'),
      });
      setShipOpen(false);
      setShipForm(emptyShipmentForm);
      setActiveTab('shipments');
    } catch {
      failToast();
    }
  };

  const sohUom = sohForm.materialCode ? materialUom(sohForm.materialCode) : '';
  const shipUom = shipForm.materialCode ? materialUom(shipForm.materialCode) : '';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('sdcSup.header.title')}
        subtitle={t('sdcSup.header.subtitle', { supplier: supplierName })}
        actions={<LivenessPill capability="forecastPublications" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('sdcSup.meta.summary', {
          lines: lines.length,
          responses: responses.length,
          planVersion: publication.planVersion,
        })}
      </PageMetaLine>

      {/* FLAG-2: the governed LIVE lane is empty — the sample renders ONLY under
          this explicit banner (the honest empty state of the live lane, stated). */}
      {!liveFeed && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary">
          <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" />
          <div>
            <div className="font-semibold text-warning-hover">{t('sdcSup.honesty.title')}</div>
            <p className="mt-0.5 text-text-secondary">{t('sdcSup.honesty.body')}</p>
          </div>
        </div>
      )}

      <SubTabs<TabKey>
        options={[
          { id: 'lines', label: t('sdcSup.tab.lines'), count: lines.length },
          { id: 'stock', label: t('sdcSup.tab.stock'), count: declarations.length },
          { id: 'shipments', label: t('sdcSup.tab.shipments'), count: shipments.length },
          { id: 'responses', label: t('sdcSup.tab.responses'), count: responses.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {activeTab === 'lines' &&
        (lines.length === 0 ? (
          <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
            <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
              <CalendarRange size={20} className="text-text-tertiary" />
            </div>
            <div className="text-base font-semibold text-text-primary mb-1">
              {t('sdcSup.lines.emptyTitle')}
            </div>
            <div className="text-sm text-text-tertiary">{t('sdcSup.lines.emptyBody')}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="sdcsup-lines">
            {lines.map((line) => (
              <LineCard
                key={`${line.materialCode}|${line.periodBucket}`}
                line={line}
                latest={latestResponseFor(responses, publication, line)}
                onConfirm={openConfirm}
                onAcknowledge={openAcknowledge}
              />
            ))}
          </div>
        ))}
      {activeTab === 'stock' && (
        <>
          {/* The Stock tab carries its OWN registry marker — inventory is wired
              (gate-1) but harvest-gated → "Sample — awaiting live supplier feed". */}
          <div className="mb-4">
            <LivenessPill capability="inventory" />
          </div>
          {bulkOpen ? (
            <BulkStockEntryGrid
              supplierId={supplierId}
              materials={materials}
              declarations={declarations}
              causationId={causationId}
              recordAttempt={recordAttempt}
              onClose={() => setBulkOpen(false)}
              onDeclared={() => setBulkOpen(false)}
            />
          ) : (
            <DeclarationsTab
              declarations={declarations}
              onDeclare={openSoh}
              onBulkEntry={() => setBulkOpen(true)}
            />
          )}
        </>
      )}
      {activeTab === 'shipments' && (
        <ShipmentsTab shipments={shipments} onReport={openShip} />
      )}
      {activeTab === 'responses' && <ResponsesTab responses={responses} />}

      {/* ── Forecast confirm panel (SDC-2b) ─────────────────────────────────── */}
      <SidePanel
        open={panelLine !== null}
        onClose={() => setPanelLine(null)}
        title={
          panelLine
            ? t('sdcSup.panel.title', { material: materialLabel(panelLine.materialCode) })
            : ''
        }
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setPanelLine(null)}>
              {t('sdcSup.panel.cancel')}
            </Button>
            {/* F-3 — the ONE solid primary on this surface: the governed commit. */}
            <Button
              variant="primary"
              icon={Send}
              disabled={submitMutation.isPending}
              onClick={submitConfirmation}
            >
              {submitMutation.isPending
                ? t('sdcSup.panel.submitting')
                : t('sdcSup.panel.submit')}
            </Button>
          </>
        }
      >
        {panelLine && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">
                  {panelLine.materialCode}
                </Data>
                <span className={CHIP}>
                  {panelLine.commitmentClass === 'firm' && <Lock size={11} aria-hidden="true" />}
                  {t(CLASS_LABEL_KEY[panelLine.commitmentClass])}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  {t('sdcSup.panel.requested')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {formatNumber(panelLine.forecastQty)} {panelLine.uom}
                  </Data>
                </span>
                <span>
                  {t('sdcSup.line.period')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {panelLine.periodBucket}
                  </Data>
                </span>
              </div>
            </section>

            <FormSection
              eyebrow={t('sdcSup.panel.qty.eyebrow')}
              title={t('sdcSup.panel.qty.title')}
              description={t('sdcSup.panel.qty.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-qty">
                  {t('sdcSup.panel.qtyLabel', { uom: panelLine.uom })}
                </label>
                <input
                  id="sdcsup-qty"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.confirmedQty}
                  onChange={(e) => setForm({ ...form, confirmedQty: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('sdcSup.panel.date.eyebrow')}
              title={t('sdcSup.panel.date.title')}
              description={t('sdcSup.panel.date.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-date">
                  {t('sdcSup.panel.committedDate')}
                </label>
                <input
                  id="sdcsup-date"
                  type="date"
                  value={form.committedDate}
                  onChange={(e) => setForm({ ...form, committedDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sdcsup-constraint">
                  {t('sdcSup.panel.capacityConstraint')}
                </label>
                <input
                  id="sdcsup-constraint"
                  type="text"
                  placeholder={t('sdcSup.panel.capacityPlaceholder')}
                  value={form.capacityConstraint}
                  onChange={(e) => setForm({ ...form, capacityConstraint: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('sdcSup.panel.rootCause.eyebrow')}
              title={t('sdcSup.panel.rootCause.title')}
              description={t('sdcSup.panel.rootCause.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-rootcause">
                  {t('sdcSup.panel.rootCause.level1')}
                  {isShort && <span className="text-danger"> *</span>}
                </label>
                <select
                  id="sdcsup-rootcause"
                  value={form.rootCauseLevel1}
                  onChange={(e) => setForm({ ...form, rootCauseLevel1: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('sdcSup.panel.rootCause.select')}</option>
                  {ROOT_CAUSE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`sdcSup.rootCause.${level}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="sdcsup-rootcause-note">
                  {t('sdcSup.panel.rootCause.note')}
                </label>
                <textarea
                  id="sdcsup-rootcause-note"
                  rows={3}
                  placeholder={t('sdcSup.panel.rootCause.notePlaceholder')}
                  value={form.rootCauseNote}
                  onChange={(e) => setForm({ ...form, rootCauseNote: e.target.value })}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </FormSection>
          </div>
        )}
      </SidePanel>

      {/* ── Acknowledge panel (SDC-2b-EXT — the visibility response) ─────────── */}
      <SidePanel
        open={ackPanelLine !== null}
        onClose={() => setAckPanelLine(null)}
        title={
          ackPanelLine
            ? t('sdcSup.ackPanel.title', { material: materialLabel(ackPanelLine.materialCode) })
            : ''
        }
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setAckPanelLine(null)}>
              {t('sdcSup.panel.cancel')}
            </Button>
            <Button
              variant="outline"
              disabled={acknowledgeMutation.isPending}
              onClick={submitAcknowledgment}
            >
              {acknowledgeMutation.isPending
                ? t('sdcSup.ackPanel.submitting')
                : t('sdcSup.ackPanel.submit')}
            </Button>
          </>
        }
      >
        {ackPanelLine && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">
                  {ackPanelLine.materialCode}
                </Data>
                <span className={CHIP}>{t(CLASS_LABEL_KEY[ackPanelLine.commitmentClass])}</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  {t('sdcSup.panel.requested')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {formatNumber(ackPanelLine.forecastQty)} {ackPanelLine.uom}
                  </Data>
                </span>
                <span>
                  {t('sdcSup.line.period')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {ackPanelLine.periodBucket}
                  </Data>
                </span>
              </div>
              <p className="mt-2 text-xs text-text-secondary">{t('sdcSup.ackPanel.desc')}</p>
            </section>

            <div>
              <label className={labelClass} htmlFor="sdcsup-ack-note">
                {t('sdcSup.ackPanel.note')}
              </label>
              <textarea
                id="sdcsup-ack-note"
                rows={3}
                placeholder={t('sdcSup.ackPanel.notePlaceholder')}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        )}
      </SidePanel>

      {/* ── SDC-3b — SOH declare panel (total-first + optional batch detail) ─── */}
      <SidePanel
        open={sohOpen}
        onClose={() => setSohOpen(false)}
        title={t('sdcSup.stock.panel.title')}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setSohOpen(false)}>
              {t('sdcSup.panel.cancel')}
            </Button>
            <Button
              variant="outline"
              icon={Send}
              disabled={declareMutation.isPending}
              onClick={submitSoh}
            >
              {declareMutation.isPending
                ? t('sdcSup.stock.panel.submitting')
                : t('sdcSup.stock.panel.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection
            eyebrow={t('sdcSup.stock.panel.material.eyebrow')}
            title={t('sdcSup.stock.panel.material.title')}
            description={t('sdcSup.stock.panel.material.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-soh-material">
                {t('sdcSup.stock.panel.materialLabel')}
              </label>
              <select
                id="sdcsup-soh-material"
                value={sohForm.materialCode}
                onChange={(e) => setSohForm({ ...sohForm, materialCode: e.target.value })}
                className={inputClass}
              >
                <option value="">{t('sdcSup.stock.panel.materialSelect')}</option>
                {materials.map((m) => (
                  <option key={m.materialCode} value={m.materialCode}>
                    {m.materialCode} — {m.label} ({m.uom})
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('sdcSup.stock.panel.total.eyebrow')}
            title={t('sdcSup.stock.panel.total.title')}
            description={t('sdcSup.stock.panel.total.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-soh-total">
                {t('sdcSup.stock.panel.totalLabel', { uom: sohUom || '—' })}
              </label>
              <input
                id="sdcsup-soh-total"
                type="number"
                min={0}
                placeholder="0"
                value={sohForm.totalQty}
                onChange={(e) => setSohForm({ ...sohForm, totalQty: e.target.value })}
                className={inputClass}
              />
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('sdcSup.stock.panel.batches.eyebrow')}
            title={t('sdcSup.stock.panel.batches.title')}
            description={t('sdcSup.stock.panel.batches.desc')}
          >
            <div className="space-y-3">
              {sohForm.batches.map((b, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-md border border-border-subtle bg-bg-hover p-3"
                >
                  <div>
                    <label className={labelClass}>{t('sdcSup.stock.panel.batchNumber')}</label>
                    <input
                      type="text"
                      value={b.batchNumber}
                      placeholder="e.g. GLY-24A"
                      onChange={(e) => {
                        const batches = sohForm.batches.slice();
                        batches[i] = { ...b, batchNumber: e.target.value };
                        setSohForm({ ...sohForm, batches });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t('sdcSup.stock.panel.batchQty', { uom: sohUom || '—' })}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={b.qty}
                      onChange={(e) => {
                        const batches = sohForm.batches.slice();
                        batches[i] = { ...b, qty: e.target.value };
                        setSohForm({ ...sohForm, batches });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('sdcSup.stock.panel.batchExpiry')}</label>
                    <input
                      type="date"
                      value={b.expiryDate}
                      onChange={(e) => {
                        const batches = sohForm.batches.slice();
                        batches[i] = { ...b, expiryDate: e.target.value };
                        setSohForm({ ...sohForm, batches });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    icon={Trash2}
                    aria-label={t('sdcSup.stock.panel.removeBatch')}
                    onClick={() =>
                      setSohForm({
                        ...sohForm,
                        batches: sohForm.batches.filter((_, j) => j !== i),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                variant="secondary"
                icon={Layers}
                onClick={() =>
                  setSohForm({
                    ...sohForm,
                    batches: [...sohForm.batches, { batchNumber: '', qty: '', expiryDate: '' }],
                  })
                }
              >
                {t('sdcSup.stock.panel.addBatch')}
              </Button>
              {sohBatches.length > 0 && (
                <div
                  className={`text-xs ${sohBatchMismatch ? 'text-danger' : 'text-text-secondary'}`}
                >
                  {t('sdcSup.stock.panel.batchSum', {
                    sum: formatNumber(sohBatchSum),
                    total: formatNumber(Number.isNaN(sohTotal) ? 0 : sohTotal),
                    uom: sohUom || '—',
                  })}
                  {sohBatchMismatch && ` — ${t('sdcSup.stock.panel.batchMismatch')}`}
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </SidePanel>

      {/* ── SDC-3b — shipment report panel (direction-guarded) ──────────────── */}
      <SidePanel
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        title={t('sdcSup.ship.panel.title')}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setShipOpen(false)}>
              {t('sdcSup.panel.cancel')}
            </Button>
            <Button
              variant="outline"
              icon={Ship}
              disabled={reportMutation.isPending}
              onClick={submitShipment}
            >
              {reportMutation.isPending
                ? t('sdcSup.ship.panel.submitting')
                : t('sdcSup.ship.panel.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection
            eyebrow={t('sdcSup.ship.panel.material.eyebrow')}
            title={t('sdcSup.ship.panel.material.title')}
            description={t('sdcSup.ship.panel.material.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-ship-material">
                {t('sdcSup.stock.panel.materialLabel')}
              </label>
              <select
                id="sdcsup-ship-material"
                value={shipForm.materialCode}
                onChange={(e) => setShipMaterial(e.target.value)}
                className={inputClass}
              >
                <option value="">{t('sdcSup.stock.panel.materialSelect')}</option>
                {materials.map((m) => (
                  <option key={m.materialCode} value={m.materialCode}>
                    {m.materialCode} — {m.label} ({m.uom})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="sdcsup-ship-direction">
                {t('sdcSup.ship.panel.directionLabel')}
              </label>
              <select
                id="sdcsup-ship-direction"
                value={shipForm.direction}
                disabled={!shipForm.materialCode}
                onChange={(e) =>
                  setShipForm({ ...shipForm, direction: e.target.value as ShipmentDirection | '' })
                }
                className={inputClass}
              >
                <option value="">{t('sdcSup.ship.panel.directionSelect')}</option>
                <option value="to-paragon">{t('sdcSup.ship.dir.toParagon')}</option>
                {/* p2d offered ONLY for a distributor material — the surface never
                    presents an illegal pairing (ISH_P2D_DISTRIBUTOR_ONLY). */}
                {p2dLegal && (
                  <option value="principal-to-distributor">{t('sdcSup.ship.dir.p2d')}</option>
                )}
              </select>
              {shipForm.materialCode && !p2dLegal && (
                <p className="mt-1 text-xs italic text-text-tertiary">
                  {t('sdcSup.ship.panel.p2dHint')}
                </p>
              )}
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('sdcSup.ship.panel.detail.eyebrow')}
            title={t('sdcSup.ship.panel.detail.title')}
            description={t('sdcSup.ship.panel.detail.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-ship-qty">
                {t('sdcSup.ship.panel.qtyLabel', { uom: shipUom || '—' })}
              </label>
              <input
                id="sdcsup-ship-qty"
                type="number"
                min={0}
                placeholder="0"
                value={shipForm.qty}
                onChange={(e) => setShipForm({ ...shipForm, qty: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="sdcsup-ship-etd">
                  {t('sdcSup.ship.panel.etd')}
                </label>
                <input
                  id="sdcsup-ship-etd"
                  type="date"
                  value={shipForm.etd}
                  onChange={(e) => setShipForm({ ...shipForm, etd: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sdcsup-ship-eta">
                  {t('sdcSup.ship.panel.eta')}
                </label>
                <input
                  id="sdcsup-ship-eta"
                  type="date"
                  value={shipForm.eta}
                  onChange={(e) => setShipForm({ ...shipForm, eta: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </FormSection>

          {/* to-paragon: link an OWN ASN (asnRef resolves server-side, never
              free-typed). p2d: an optional carrier AWB, no ASN. */}
          {shipForm.direction === 'to-paragon' && (
            <FormSection
              eyebrow={t('sdcSup.ship.panel.link.eyebrow')}
              title={t('sdcSup.ship.panel.link.title')}
              description={t('sdcSup.ship.panel.link.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-ship-asn">
                  {t('sdcSup.ship.panel.asnLabel')}
                </label>
                {ownAsns.length === 0 ? (
                  <p className="text-xs italic text-text-tertiary">
                    {t('sdcSup.ship.panel.noAsns')}
                  </p>
                ) : (
                  <select
                    id="sdcsup-ship-asn"
                    value={shipForm.asnRef}
                    onChange={(e) => setShipAsn(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{t('sdcSup.ship.panel.asnSelect')}</option>
                    {ownAsns.map((a) => (
                      <option key={a.asnNumber} value={a.asnNumber}>
                        {a.asnNumber} · {a.status} · {a.trackingNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {shipForm.awb && (
                <div className="text-xs text-text-secondary">
                  {t('sdcSup.ship.panel.awbEcho')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {shipForm.awb}
                  </Data>
                </div>
              )}
            </FormSection>
          )}
          {shipForm.direction === 'principal-to-distributor' && (
            <FormSection
              eyebrow={t('sdcSup.ship.panel.link.eyebrow')}
              title={t('sdcSup.ship.panel.awbTitle')}
              description={t('sdcSup.ship.panel.awbDesc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-ship-awb">
                  {t('sdcSup.ship.panel.awbLabel')}
                </label>
                <input
                  id="sdcsup-ship-awb"
                  type="text"
                  placeholder="e.g. AWB-88231145"
                  value={shipForm.awb}
                  onChange={(e) => setShipForm({ ...shipForm, awb: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>
          )}
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

// Wrapper: identity gate + the scoped reads + the honest states, exactly the
// SupplierRFQs shape. The four SDC-3b reads carry own-facts-only data into the
// hub; they resolve fast (store reads), so they pass through with [] fallbacks
// rather than gating the whole page.
const SupplierForecasts: React.FC = () => {
  const { t } = useTranslation();
  const crumb = [t('sdcSup.crumb.section'), t('sdcSup.crumb.page')];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const linesQuery = useOwnForecastLines();
  const responsesQuery = useOwnRequirementResponses();
  const materialsQuery = useOwnCollaboratedMaterials();
  const declarationsQuery = useOwnInventoryDeclarations();
  const shipmentsQuery = useOwnIncomingShipments();
  const asnsQuery = useOwnSupplierAsns();

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || linesQuery.isPending || responsesQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || linesQuery.isError || responsesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? linesQuery.error ?? responsesQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          linesQuery.refetch();
          responsesQuery.refetch();
        }}
      />
    );

  const mySupplier = supplierQuery.data ?? null;
  if (!mySupplier) return <NoSupplierIdentity />;

  const read = linesQuery.data;
  const responses = responsesQuery.data ?? [];
  if (!read?.publication)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('sdcSup.empty.title')}
        subtitle={t('sdcSup.empty.subtitle', { supplier: mySupplier.name })}
        message={t('sdcSup.empty.message')}
      />
    );

  return (
    <ForecastWorkspace
      supplierId={supplierId}
      supplierName={mySupplier.name}
      publication={read.publication}
      lines={read.lines}
      liveFeed={read.liveFeed}
      responses={responses}
      materials={materialsQuery.data ?? []}
      declarations={declarationsQuery.data ?? []}
      shipments={shipmentsQuery.data ?? []}
      asns={asnsQuery.data ?? []}
    />
  );
};

export default SupplierForecasts;
