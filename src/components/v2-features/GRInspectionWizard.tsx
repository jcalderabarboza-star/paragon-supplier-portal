import React, { useMemo, useState } from 'react';
import Wizard, { WizardStep } from '../ui-v2/Wizard';
import FormSection from '../ui-v2/FormSection';
import { useToast } from '../../hooks/useToast';
import { mockShipments, Shipment } from '../../data/mockShipments';
import {
  Disposition,
  GoodsReceipt,
  InspectionResult,
} from '../../data/mockGoodsReceipts';

interface GRInspectionWizardProps {
  onClose: () => void;
  onComplete: (gr: GoodsReceipt) => void;
  initialAsnId?: string;
  nextSeqNumber: number;
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

const labelFor = (text: string) => (
  <label className="block text-xs font-medium text-text-tertiary uppercase mb-1">
    {text}
  </label>
);

const inputCls =
  'w-full rounded-md border border-border-input bg-white px-3 py-2 text-sm text-text-primary focus:border-teal focus:outline-none';

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

const GRInspectionWizard: React.FC<GRInspectionWizardProps> = ({
  onClose,
  onComplete,
  initialAsnId,
  nextSeqNumber,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [sourceMode, setSourceMode] = useState<SourceMode>('shipment');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    initialAsnId ?? ''
  );
  const [manualPO, setManualPO] = useState('');
  const [manualASN, setManualASN] = useState('');

  // Step 2 state
  const [receivedDate, setReceivedDate] = useState('2026-05-20');
  const [receivedBy, setReceivedBy] = useState(ROLES[0]);
  const [warehouse, setWarehouse] = useState(LOCATIONS[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);

  // Step 4 state
  const [disposition, setDisposition] = useState<Disposition>('Accept');
  const [dispositionReason, setDispositionReason] = useState('');
  const [autoPostSap, setAutoPostSap] = useState(true);
  const [finalNotes, setFinalNotes] = useState('');

  const eligibleShipments = useMemo(
    () => mockShipments.filter((s) => ELIGIBLE_STATUSES.includes(s.status as 'At Dock' | 'Unloading')),
    []
  );

  const selectedShipment = selectedShipmentId
    ? mockShipments.find((s) => s.id === selectedShipmentId)
    : undefined;

  // Auto-populate lines when shipment is selected and we reach step 2
  React.useEffect(() => {
    if (selectedShipment && lines.length === 0) {
      setLines(buildDraftFromShipment(selectedShipment));
    }
  }, [selectedShipment]);

  const sourceValid =
    sourceMode === 'shipment'
      ? !!selectedShipmentId
      : manualPO.trim().length > 0 && manualASN.trim().length > 0;

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

  const dispositionValid =
    !!disposition &&
    !(
      (disposition === 'Reject' || disposition === 'Return to Supplier') &&
      !dispositionReason.trim()
    );

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
              ? 'border-teal bg-teal-soft text-teal'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          Select shipment at dock
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('manual')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'manual'
              ? 'border-teal bg-teal-soft text-teal'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          Manual PO / ASN entry
        </button>
      </div>

      {sourceMode === 'shipment' ? (
        <div className="border border-border-subtle rounded-lg divide-y divide-border-subtle">
          {eligibleShipments.length === 0 && (
            <div className="p-4 text-sm text-text-tertiary">
              No shipments currently at dock or unloading.
            </div>
          )}
          {eligibleShipments.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedShipmentId(s.id);
                setLines(buildDraftFromShipment(s));
              }}
              className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                selectedShipmentId === s.id
                  ? 'bg-teal-soft'
                  : 'hover:bg-bg-hover'
              }`}
            >
              <div>
                <div className="font-semibold text-text-primary">
                  {s.asnNumber}
                </div>
                <div className="text-xs text-text-tertiary">
                  {s.poNumber} · {s.supplierName}
                </div>
              </div>
              <div className="text-right text-xs text-text-secondary">
                <div>{s.dockAssignment ?? 'Pending dock'}</div>
                <div className="text-text-tertiary">{s.dockTime ?? '—'}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            {labelFor('PO Number')}
            <input
              type="text"
              value={manualPO}
              onChange={(e) => setManualPO(e.target.value)}
              placeholder="PO-2025-XXXXX"
              className={inputCls}
            />
          </div>
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
                      <div className="font-mono text-sm text-text-primary">
                        {l.materialCode}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {l.description}
                      </div>
                    </div>
                    <div className="text-xs text-text-tertiary text-right">
                      Expected
                      <div className="font-semibold text-text-primary">
                        {formatNumber(l.qtyExpected)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      {labelFor('Received')}
                      <input
                        type="number"
                        min={0}
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
                        {formatNumber(rejected)}
                      </div>
                    </div>
                    <div className="col-span-4">
                      {rejected > 0 && (
                        <>
                          {labelFor('Rejection Reason')}
                          <textarea
                            rows={2}
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
                <div className="font-mono text-sm text-text-primary">
                  {l.materialCode}
                </div>
                <div className="text-xs text-text-tertiary">
                  {l.description}
                </div>
              </div>
              <div className="text-xs text-text-tertiary">
                {formatNumber(l.qtyReceived)} received
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
                  <span className="font-mono">{l.labRequestId}</span>
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

  const previewSapDoc = `MAT-DOC-${500000 + nextSeqNumber}`;

  const stepFourContent = (
    <div className="flex flex-col gap-5">
      <FormSection title="Final Disposition">
        <div>
          {labelFor('Overall Disposition')}
          <div className="flex flex-wrap gap-4">
            {(
              ['Accept', 'Reject', 'Quarantine', 'Return to Supplier'] as const
            ).map((d) => (
              <label key={d} className={radioCls}>
                <input
                  type="radio"
                  name="disposition"
                  value={d}
                  checked={disposition === d}
                  onChange={() => {
                    setDisposition(d);
                    setAutoPostSap(d === 'Accept');
                  }}
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        {(disposition === 'Reject' ||
          disposition === 'Return to Supplier') && (
          <div>
            {labelFor('Reason')}
            <textarea
              rows={2}
              value={dispositionReason}
              onChange={(e) => setDispositionReason(e.target.value)}
              className={inputCls}
              placeholder="Explain rejection or return rationale"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={autoPostSap}
            onChange={(e) => setAutoPostSap(e.target.checked)}
          />
          Auto-post to SAP
        </label>

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
          <div className="font-semibold text-text-primary">{totals.items}</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Total accepted</div>
          <div className="font-semibold text-success">
            {formatNumber(totals.accepted)}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Total rejected</div>
          <div className="font-semibold text-danger">
            {formatNumber(totals.rejected)}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Est. SAP Doc</div>
          <div className="font-mono text-text-primary">
            {autoPostSap ? previewSapDoc : '—'}
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

  const handleComplete = () => {
    const grNumber = `GR-2026-${String(nextSeqNumber).padStart(3, '0')}`;
    const sapDoc = autoPostSap ? previewSapDoc : undefined;

    const inspectionResults: InspectionResult[] = lines.map((l) => {
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
    });

    const newGR: GoodsReceipt = {
      id: `gr-new-${Date.now()}`,
      grNumber,
      asnId: selectedShipment?.id ?? '',
      asnNumber: selectedShipment?.asnNumber ?? manualASN,
      poNumber: selectedShipment?.poNumber ?? manualPO,
      supplierId: selectedShipment?.supplierId ?? '',
      supplierName: selectedShipment?.supplierName ?? '—',
      receivedDate,
      receivedBy,
      status: autoPostSap && disposition === 'Accept' ? 'Posted to SAP' : 'Approved',
      inspectionResults,
      disposition,
      sapMaterialDoc: sapDoc,
      notes: finalNotes || notes || undefined,
    };

    onComplete(newGR);
    toast({
      variant: 'success',
      title: `GR ${grNumber} created`,
      description: `${totals.items} items accepted${
        sapDoc ? ` · Posted to SAP as ${sapDoc}` : ''
      }`,
    });
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
