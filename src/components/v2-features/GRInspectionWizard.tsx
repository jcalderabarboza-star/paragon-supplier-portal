import React, { useMemo, useState } from 'react';
import Wizard, { WizardStep } from '../ui-v2/Wizard';
import FormSection from '../ui-v2/FormSection';
import Data from '../ui-v2/Data';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from 'react-i18next';
import type { Shipment, ASN, AsnStatus } from '../../services/data/types';
import type { InspectionResult } from '../../data/mockGoodsReceipts';
import {
  useGoodsReceiptCreate,
  useGoodsReceiptFinalize,
  useGoodsReceiptPost,
  useGoodsReceiptSettle,
} from '../../services/query/commandHooks';
import {
  deriveHeaderDisposition,
  headerVerbFor,
  type GrHeaderDisposition,
} from '../../services/transitions';

interface GRInspectionWizardProps {
  onClose: () => void;
  /** Called after the create/dispose/post commands resolve — the list re-derives
   *  from the invalidated query, so no GR object is handed back. */
  onComplete: () => void;
  initialAsnId?: string;
  /** Shipments resolved through the service seam (GR-LEGACY-READ-01) — the
   *  wizard no longer reads the raw fixture. */
  shipments: Shipment[];
  /** ASNs resolved through the service seam (asnStore-backed) — a live
   *  supplier-submitted ASN is a receivable GR source, not just fixture docks. */
  asns: ASN[];
}

type SourceMode = 'shipment' | 'manual';

interface LineDraft {
  materialCode: string;
  description: string;
  qtyExpected: number;
  qtyReceived: number;
  qtyAccepted: number;
  rejectionReason: string;
  visualCheck: 'Pass' | 'Fail';
  packagingCheck: 'Pass' | 'Fail' | 'N/A';
  halalRequired: boolean;
  halalSealCheck?: 'Pass' | 'Fail';
  bpomRequired: boolean;
  bpomLotCheck?: 'Pass' | 'Fail';
  labSampleRequired: boolean;
  labRequestId?: string;
}

const ROLES = [
  'Warehouse Supervisor',
  'QC Inspector',
  'Operations Manager',
];

const LOCATIONS = ['NDC J6 Jakarta', 'RM Warehouse', 'PM Warehouse'];

const ELIGIBLE_STATUSES = ['At Dock', 'Unloading'] as const;

// ASN states in which a submitted ASN is receivable (mirrors the cascadable set
// the dispatcher enforces on t_gr_create's manual-ref path).
const RECEIVABLE_ASN_STATUSES: readonly AsnStatus[] = ['Submitted', 'In Transit', 'Delivered'];

// A normalized GR source — a shipment at dock OR a live submitted ASN. The dock
// list is the union of both; live ASNs without a dock appointment are labelled
// honestly (dock scheduling arrives via the TMS boundary, INT-TMS-01).
interface GrSource {
  id: string; // shipment id, or `asn:<number>` for a store ASN
  asnNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  dockLabel: string;
  dockTime: string;
  lines: LineDraft[];
}

const labelFor = (text: string) => (
  <label className="block text-xs font-medium text-text-tertiary uppercase mb-1">
    {text}
  </label>
);

const inputCls =
  'w-full rounded-md border border-border-input bg-white px-3 py-2 text-sm text-text-primary focus:border-action focus:outline-none';

const radioCls = 'flex items-center gap-1.5 text-sm text-text-primary cursor-pointer';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n);

const inferHalal = (description: string): boolean => {
  const d = description.toLowerCase();
  return d.includes('halal');
};

const inferBpom = (materialCode: string): boolean => {
  return materialCode.startsWith('AI-') || materialCode.startsWith('FR-');
};

const buildDraftFromShipment = (s: Shipment): LineDraft[] =>
  s.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.qty,
    qtyReceived: li.qty,
    qtyAccepted: li.qty,
    rejectionReason: '',
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    halalRequired: inferHalal(li.description),
    halalSealCheck: inferHalal(li.description) ? 'Pass' : undefined,
    bpomRequired: inferBpom(li.materialCode),
    bpomLotCheck: inferBpom(li.materialCode) ? 'Pass' : undefined,
    labSampleRequired: false,
  }));

const buildDraftFromAsn = (a: ASN): LineDraft[] =>
  a.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.orderedQty,
    qtyReceived: li.shippedQty,
    qtyAccepted: li.shippedQty,
    rejectionReason: '',
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    halalRequired: inferHalal(li.description),
    halalSealCheck: inferHalal(li.description) ? 'Pass' : undefined,
    bpomRequired: inferBpom(li.materialCode),
    bpomLotCheck: inferBpom(li.materialCode) ? 'Pass' : undefined,
    labSampleRequired: false,
  }));

const sourceFromShipment = (s: Shipment): GrSource => ({
  id: s.id,
  asnNumber: s.asnNumber,
  poNumber: s.poNumber,
  supplierId: s.supplierId,
  supplierName: s.supplierName,
  dockLabel: s.dockAssignment ?? 'Pending dock',
  dockTime: s.dockTime ?? '—',
  lines: buildDraftFromShipment(s),
});

const sourceFromAsn = (a: ASN): GrSource => ({
  id: `asn:${a.asnNumber}`,
  asnNumber: a.asnNumber,
  poNumber: a.poReference,
  supplierId: a.supplierId,
  // The ASN carries no supplierName; its create stamps the supplier name into
  // details.originCity (else fall back to the id).
  supplierName: a.details.originCity || a.supplierId,
  dockLabel: 'No dock appointment',
  dockTime: 'Scheduled via TMS',
  lines: buildDraftFromAsn(a),
});

const GRInspectionWizard: React.FC<GRInspectionWizardProps> = ({
  onClose,
  onComplete,
  initialAsnId,
  shipments,
  asns,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const createGR = useGoodsReceiptCreate();
  const finalizeGR = useGoodsReceiptFinalize();
  const postGR = useGoodsReceiptPost();
  const settleGR = useGoodsReceiptSettle();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [sourceMode, setSourceMode] = useState<SourceMode>('shipment');
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    initialAsnId ?? ''
  );
  const [manualASN, setManualASN] = useState('');

  // Step 2 state
  const [receivedDate, setReceivedDate] = useState('2026-05-20');
  const [receivedBy, setReceivedBy] = useState(ROLES[0]);
  const [warehouse, setWarehouse] = useState(LOCATIONS[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);

  // Step 4 state — NO free-choice disposition: the header is DERIVED from the
  // lines (see derivedDisposition below), never asserted.
  const [dispositionReason, setDispositionReason] = useState('');
  const [autoPostSap, setAutoPostSap] = useState(true);
  const [finalNotes, setFinalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receivable GR sources = shipments at dock ∪ live receivable ASNs (deduped by
  // ASN number; the shipment wins when both exist since it carries dock data).
  const sources = useMemo(() => {
    const shipmentSources = shipments
      .filter((s) => ELIGIBLE_STATUSES.includes(s.status as 'At Dock' | 'Unloading'))
      .map(sourceFromShipment);
    const seen = new Set(shipmentSources.map((s) => s.asnNumber));
    const asnSources = asns
      .filter((a) => RECEIVABLE_ASN_STATUSES.includes(a.status) && !seen.has(a.asnNumber))
      .map(sourceFromAsn);
    return [...shipmentSources, ...asnSources];
  }, [shipments, asns]);

  // Manual entry resolves against the live ASNs (the service seam), not a
  // fixture list: an unknown / non-receivable ASN is honestly reported.
  const manualAsnMatch = useMemo(
    () =>
      asns.find(
        (a) => a.asnNumber === manualASN.trim() && RECEIVABLE_ASN_STATUSES.includes(a.status),
      ),
    [asns, manualASN],
  );
  const manualNotFound = manualASN.trim().length > 0 && !manualAsnMatch;

  const activeSource: GrSource | undefined =
    sourceMode === 'manual'
      ? manualAsnMatch
        ? sourceFromAsn(manualAsnMatch)
        : undefined
      : sources.find((s) => s.id === selectedSourceId);

  // Auto-populate lines when a source resolves (dock selection, manual match, or
  // the initial pre-selection) and none are drafted yet.
  const activeSourceId = activeSource?.id;
  React.useEffect(() => {
    if (activeSource && lines.length === 0) {
      setLines(activeSource.lines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSourceId]);

  const sourceValid = !!activeSource;

  // Finalized inspection lines + the header disposition ROLLED UP from them. The
  // header is DERIVED, never a free-choice assertion (law 0.6) — the same rollup
  // the dispatcher's gr_rollup_* hooks re-check, so the UI cannot present an
  // Accept the lines contradict.
  const inspectionResults = useMemo<InspectionResult[]>(
    () =>
      lines.map((l) => {
        const rejected = Math.max(0, l.qtyReceived - l.qtyAccepted);
        const packaging: 'Pass' | 'Fail' | 'Pending' =
          l.packagingCheck === 'N/A' ? 'Pass' : l.packagingCheck;
        return {
          materialCode: l.materialCode,
          description: l.description,
          qtyExpected: l.qtyExpected,
          qtyReceived: l.qtyReceived,
          qtyAccepted: l.qtyAccepted,
          qtyRejected: rejected,
          rejectionReason: rejected > 0 ? l.rejectionReason : undefined,
          labResultId: l.labRequestId,
          visualCheck: l.visualCheck,
          packagingCheck: packaging,
          halalSealCheck: l.halalSealCheck,
          bpomLotCheck: l.bpomLotCheck,
        };
      }),
    [lines],
  );
  const derivedDisposition = useMemo<GrHeaderDisposition>(
    () => deriveHeaderDisposition(inspectionResults),
    [inspectionResults],
  );

  const receiptValid = lines.length > 0 && lines.every((l) => {
    if (l.qtyReceived < 0 || l.qtyAccepted < 0) return false;
    if (l.qtyAccepted > l.qtyReceived) return false;
    if (l.qtyReceived - l.qtyAccepted > 0 && !l.rejectionReason.trim())
      return false;
    return true;
  });

  const qualityValid = lines.every((l) => {
    if (!l.visualCheck || !l.packagingCheck) return false;
    if (l.halalRequired && !l.halalSealCheck) return false;
    if (l.bpomRequired && !l.bpomLotCheck) return false;
    if (l.labSampleRequired && !l.labRequestId) return false;
    return true;
  });

  // A fully-Rejected rollup needs a reason (t_gr_reject requiredField); Approved
  // / Partially Approved don't. 'Pending' can't be finalized (uninspected line).
  const dispositionValid =
    derivedDisposition === 'Rejected'
      ? dispositionReason.trim().length > 0
      : derivedDisposition !== 'Pending';

  const isStepValid = (i: number): boolean => {
    if (i === 0) return sourceValid;
    if (i === 1) return receiptValid;
    if (i === 2) return qualityValid;
    if (i === 3) return dispositionValid;
    return true;
  };

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        if (patch.labSampleRequired === true && !next.labRequestId) {
          next.labRequestId = `LAB-2026-${String(100 + idx).padStart(3, '0')}`;
        }
        if (patch.labSampleRequired === false) {
          next.labRequestId = undefined;
        }
        return next;
      })
    );
  };

  const stepOneContent = (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSourceMode('shipment')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'shipment'
              ? 'border-action bg-action-soft text-action-hover'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          Select inbound at dock
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('manual')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'manual'
              ? 'border-action bg-action-soft text-action-hover'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          Enter ASN number
        </button>
      </div>

      {sourceMode === 'shipment' ? (
        <div className="border border-border-subtle rounded-lg divide-y divide-border-subtle">
          {sources.length === 0 && (
            <div className="p-4 text-sm text-text-tertiary">
              No shipments at dock and no submitted ASNs to receive.
            </div>
          )}
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedSourceId(s.id);
                setLines(s.lines);
              }}
              className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                selectedSourceId === s.id ? 'bg-action-soft' : 'hover:bg-bg-hover'
              }`}
            >
              <div>
                <div className="font-semibold text-text-primary">
                  <Data>{s.asnNumber}</Data>
                </div>
                <div className="text-xs text-text-tertiary">
                  <Data>{s.poNumber}</Data> · {s.supplierName}
                </div>
              </div>
              <div className="text-right text-xs text-text-secondary">
                <div>{s.dockLabel}</div>
                <div className="text-text-tertiary">{s.dockTime}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div>
            {labelFor('ASN Number')}
            <input
              type="text"
              value={manualASN}
              onChange={(e) => setManualASN(e.target.value)}
              placeholder="ASN-2026-XXX"
              className={inputCls}
            />
          </div>
          {manualNotFound && (
            <p className="text-xs text-danger">
              ASN not found among receivable shipments. Enter a submitted ASN
              (status Submitted, In Transit, or Delivered).
            </p>
          )}
          {manualAsnMatch && (
            <p className="text-xs text-success">
              {manualAsnMatch.asnNumber} · {manualAsnMatch.poReference} — {manualAsnMatch.status}. Ready to receive.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const stepTwoContent = (
    <div className="flex flex-col gap-5">
      <FormSection title="Receipt Info">
        <div className="grid grid-cols-2 gap-4">
          <div>
            {labelFor('Received Date')}
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            {labelFor('Received By')}
            <select
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            {labelFor('Warehouse Location')}
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className={inputCls}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            {labelFor('Notes')}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional receipt context..."
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Line Items">
        {lines.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No line items yet. Select a source on Step 1.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {lines.map((l, i) => {
              const rejected = Math.max(0, l.qtyReceived - l.qtyAccepted);
              return (
                <div
                  key={i}
                  className="border border-border-subtle rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <Data as="div" className="text-sm text-text-primary">
                        {l.materialCode}
                      </Data>
                      <div className="text-xs text-text-tertiary">
                        {l.description}
                      </div>
                    </div>
                    <div className="text-xs text-text-tertiary text-right">
                      Expected
                      <div className="font-semibold text-text-primary">
                        <Data>{formatNumber(l.qtyExpected)}</Data>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      {labelFor('Received')}
                      <input
                        type="number"
                        min={0}
                        aria-label={`Received quantity for ${l.materialCode}`}
                        value={l.qtyReceived}
                        onChange={(e) =>
                          updateLine(i, {
                            qtyReceived: Number(e.target.value),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      {labelFor('Accepted')}
                      <input
                        type="number"
                        min={0}
                        max={l.qtyReceived}
                        aria-label={`Accepted quantity for ${l.materialCode}`}
                        value={l.qtyAccepted}
                        onChange={(e) =>
                          updateLine(i, {
                            qtyAccepted: Number(e.target.value),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      {labelFor('Rejected')}
                      <div className="rounded-md border border-border-input bg-bg-hover px-3 py-2 text-sm text-text-secondary">
                        <Data>{formatNumber(rejected)}</Data>
                      </div>
                    </div>
                    <div className="col-span-4">
                      {rejected > 0 && (
                        <>
                          {labelFor('Rejection Reason')}
                          <textarea
                            rows={2}
                            aria-label={`Rejection reason for ${l.materialCode}`}
                            value={l.rejectionReason}
                            onChange={(e) =>
                              updateLine(i, {
                                rejectionReason: e.target.value,
                              })
                            }
                            placeholder="Required when any qty is rejected"
                            className={inputCls}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );

  const stepThreeContent = (
    <FormSection eyebrow="QUALITY CHECKS" title="Per-line inspection">
      <div className="flex flex-col gap-4">
        {lines.map((l, i) => (
          <div
            key={i}
            className="border border-border-subtle rounded-md p-4 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <Data as="div" className="text-sm text-text-primary">
                  {l.materialCode}
                </Data>
                <div className="text-xs text-text-tertiary">
                  {l.description}
                </div>
              </div>
              <div className="text-xs text-text-tertiary">
                <Data>{formatNumber(l.qtyReceived)}</Data> received
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                {labelFor('Visual Inspection')}
                <div className="flex gap-4">
                  {(['Pass', 'Fail'] as const).map((v) => (
                    <label key={v} className={radioCls}>
                      <input
                        type="radio"
                        name={`vis-${i}`}
                        value={v}
                        checked={l.visualCheck === v}
                        onChange={() => updateLine(i, { visualCheck: v })}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                {labelFor('Packaging Integrity')}
                <div className="flex gap-4">
                  {(['Pass', 'Fail', 'N/A'] as const).map((v) => (
                    <label key={v} className={radioCls}>
                      <input
                        type="radio"
                        name={`pkg-${i}`}
                        value={v}
                        checked={l.packagingCheck === v}
                        onChange={() => updateLine(i, { packagingCheck: v })}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              {l.halalRequired && (
                <div>
                  {labelFor('Halal Seal Check')}
                  <div className="flex gap-4">
                    {(['Pass', 'Fail'] as const).map((v) => (
                      <label key={v} className={radioCls}>
                        <input
                          type="radio"
                          name={`halal-${i}`}
                          value={v}
                          checked={l.halalSealCheck === v}
                          onChange={() => updateLine(i, { halalSealCheck: v })}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {l.bpomRequired && (
                <div>
                  {labelFor('BPOM Lot Tracking')}
                  <div className="flex gap-4">
                    {(['Pass', 'Fail'] as const).map((v) => (
                      <label key={v} className={radioCls}>
                        <input
                          type="radio"
                          name={`bpom-${i}`}
                          value={v}
                          checked={l.bpomLotCheck === v}
                          onChange={() => updateLine(i, { bpomLotCheck: v })}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={l.labSampleRequired}
                  onChange={(e) =>
                    updateLine(i, { labSampleRequired: e.target.checked })
                  }
                />
                Lab sample required
              </label>
              {l.labSampleRequired && (
                <div className="text-xs text-text-secondary">
                  Lab Request ID:{' '}
                  <Data>{l.labRequestId}</Data>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </FormSection>
  );

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => ({
        items: acc.items + 1,
        accepted: acc.accepted + l.qtyAccepted,
        rejected: acc.rejected + Math.max(0, l.qtyReceived - l.qtyAccepted),
      }),
      { items: 0, accepted: 0, rejected: 0 }
    );
  }, [lines]);

  const stepFourContent = (
    <div className="flex flex-col gap-5">
      <FormSection title="Final Disposition">
        <div>
          {labelFor('Header Disposition (derived from lines)')}
          <div
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
              derivedDisposition === 'Approved'
                ? 'border-success/40 bg-success-soft text-success'
                : derivedDisposition === 'Partially Approved'
                  ? 'border-warning/40 bg-warning-soft text-warning-hover'
                  : derivedDisposition === 'Rejected'
                    ? 'border-danger/40 bg-danger-soft text-danger'
                    : 'border-border-input bg-bg-hover text-text-secondary'
            }`}
          >
            {derivedDisposition}
          </div>
          <p className="mt-1.5 text-xs text-text-tertiary">
            Rolled up from {totals.items} line{totals.items === 1 ? '' : 's'} —{' '}
            <Data>{formatNumber(totals.accepted)}</Data> accepted,{' '}
            <Data>{formatNumber(totals.rejected)}</Data> rejected. Not editable — the
            header follows the inspected quantities.
          </p>
        </div>

        {derivedDisposition === 'Rejected' && (
          <div>
            {labelFor('Rejection Reason (required)')}
            <textarea
              rows={2}
              aria-label="Header rejection reason"
              value={dispositionReason}
              onChange={(e) => setDispositionReason(e.target.value)}
              className={inputCls}
              placeholder="Explain the full-lot rejection"
            />
          </div>
        )}

        {(derivedDisposition === 'Approved' ||
          derivedDisposition === 'Partially Approved') && (
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={autoPostSap}
              onChange={(e) => setAutoPostSap(e.target.checked)}
            />
            Auto-post to SAP
          </label>
        )}

        <div>
          {labelFor('Final Notes')}
          <textarea
            rows={2}
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </div>
      </FormSection>

      <div className="border border-border-subtle rounded-lg p-4 bg-bg-hover grid grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-text-tertiary">Total items</div>
          <div className="font-semibold text-text-primary"><Data>{totals.items}</Data></div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Total accepted</div>
          <div className="font-semibold text-success">
            <Data>{formatNumber(totals.accepted)}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Total rejected</div>
          <div className="font-semibold text-danger">
            <Data>{formatNumber(totals.rejected)}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">SAP Doc</div>
          <div className="text-xs text-text-secondary">
            {autoPostSap ? 'Assigned by SAP on posting' : 'Not posted'}
          </div>
        </div>
      </div>
    </div>
  );

  const steps: WizardStep[] = [
    {
      id: 'source',
      title: 'Source selection',
      shortTitle: 'Source',
      description: 'Pick a shipment at the dock or enter PO/ASN manually.',
      content: stepOneContent,
    },
    {
      id: 'details',
      title: 'Receipt details',
      shortTitle: 'Details',
      description: 'Record receipt info and per-line quantities.',
      content: stepTwoContent,
    },
    {
      id: 'quality',
      title: 'Quality checks',
      shortTitle: 'Quality',
      description: 'Visual, packaging, halal, BPOM, and lab sampling.',
      content: stepThreeContent,
    },
    {
      id: 'disposition',
      title: 'Disposition & submit',
      shortTitle: 'Submit',
      description: 'Confirm overall disposition and post to SAP.',
      content: stepFourContent,
    },
  ];

  // Replaces the old client-side fabrication (GR-FABRICATION-01): the GR is
  // created, disposed, and posted through the dispatcher. The store assigns the
  // GR number; the header disposition is the ROLLUP the dispatcher re-derives
  // from the recorded lines; the SAP material document is assigned by SAP on
  // settlement — nothing is minted here.
  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);

    const asnReference = activeSource?.asnNumber ?? manualASN.trim();

    try {
      // 1) Create — the store assigns the number; lines are recorded at receipt.
      const createRes = await createGR.mutateAsync({
        asnReference,
        inspectionResults,
        receivedDate,
        receivedBy,
        notes: finalNotes || notes || undefined,
      });
      if (createRes.status === 'failed' || !createRes.entityId) {
        toast({
          variant: 'error',
          title: t('gr.create.failed.title'),
          description: t('gr.create.failed.desc', { reason: createRes.reason ?? '' }),
        });
        return;
      }
      const grNumber = createRes.entityId;

      // 2) Finalize — dispatch the ROLLED-UP header verb (approve / partial /
      //    reject). The dispatcher re-derives the disposition from the stored
      //    lines, so the header is provably derived, not asserted.
      const dispo = derivedDisposition;
      const headerVerb = headerVerbFor(dispo);
      if (headerVerb) {
        const finalizeRes = await finalizeGR.mutateAsync({
          grId: grNumber,
          headerVerb,
          dispositionReason: dispositionReason || finalNotes || undefined,
        });
        if (finalizeRes.status === 'failed') {
          const missing = (finalizeRes.reason ?? '').startsWith('MISSING_FIELDS');
          toast({
            variant: 'warning',
            title: t('gr.dispose.failed.title', { grNumber }),
            description: missing
              ? t('gr.dispose.missingReason')
              : t('gr.dispose.failed.desc', { reason: finalizeRes.reason ?? '' }),
          });
          onComplete();
          return;
        }
      }

      // 3) Post to SAP (Option B) — only for an accepting rollup, when opted in.
      if (autoPostSap && (dispo === 'Approved' || dispo === 'Partially Approved')) {
        const postRes = await postGR.mutateAsync({ grId: grNumber });
        if (postRes.status === 'submitted') {
          // The async SAP callback settles: Posting to SAP → Posted to SAP +
          // the real material document (assigned on settle).
          await settleGR.mutateAsync({ correlationId: postRes.correlationId });
          toast({
            variant: 'success',
            title: t('gr.post.posted.title', { grNumber }),
            description: t('gr.post.posted.desc'),
          });
        } else {
          toast({
            variant: 'warning',
            title: t('gr.post.failed.title', { grNumber }),
            description: t('gr.post.failed.desc', { reason: postRes.reason ?? '' }),
          });
        }
      } else {
        toast({
          variant: 'success',
          title: t('gr.dispose.success.title', { grNumber, disposition: dispo }),
          description: t('gr.dispose.success.desc', { correlationId: createRes.correlationId }),
        });
      }
      onComplete();
    } catch {
      toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(13,27,42,0.5)]">
      <Wizard
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        onCancel={onClose}
        onComplete={handleComplete}
        isStepValid={isStepValid}
        completeLabel="Create GR"
      />
    </div>
  );
};

export default GRInspectionWizard;
