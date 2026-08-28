import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, Info, MessageSquare, Send, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import { useToast } from '../hooks/useToast';
import { useSuppliers } from '../services/query/hooks';
import { useInventoryRecord } from '../services/query/sdcBuyerHooks';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { parseChannelReply, type ChannelParseResult, type QtyRefusalReason } from '../services/channel/replyParser';
import { makeProvenanceRef, type Channel, type ChannelMessage } from '../services/channel/types';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import {
  parseGrid,
  openSubmissionSession,
  sdcClock,
  ownCollaboratedMaterials,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  FORECAST_PUBLICATIONS,
  // CP-2 · B1 — the ONE master lookup; this page no longer indexes the master.
  labelOf,
  uomOf,
  knownMaterialCodes,
  IMPORT_DECLARE_COLUMN,
  type GridRow,
  type GridContext,
  type ParseReason,
  type SubmissionSessionRecorder,
  type Uom,
} from '../services/sdc';
import type { CommandResult } from '../services/data/types';
import { formatNumber } from '../lib/format';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { useRefusalText } from '../hooks/useRefusalText';
import { refusedByPolicy } from '../services/transitions/refusalMessage';
import { POLICY_HOOKS } from '../services/transitions/policyHooks';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C4d — the buyer IN-PLACE TRIAGE CONFIRM (DEC-COMMS-PRIMARY).
//
// The surface that makes the C4c recording verb usable. A planner records an SOH
// assertion a supplier made over an ungoverned channel; the DR-10 actor is
// truthfully the BUYER (Paragon recorded the supplier's words — not the supplier
// self-submitting through the portal).
//
// It mirrors CommHubInbound (C2)'s proven confirm-before-commit gate — same
// honesty discipline, SHARED machinery (parseChannelReply, parseGrid,
// openSubmissionSession, the reply-parser vocabulary + the generic `commHub.*`
// diagnostic i18n) — with TWO deliberate differences:
//   · BINDING: the SUBJECT supplier is chosen AT CAPTURE ("whose conversation is
//     this?") BEFORE the paste. That one choice mints the ChannelMessage; the
//     confirm step NEVER offers a free supplierId field. C4c already enforces this
//     server-side ({...facts, supplierId: message.supplierId}); the surface must
//     not even present it as editable.
//   · VERB: dispatch via `useInventoryRecord` (t_inventorydeclaration_record), the
//     buyer recording verb — NOT the supplier `useInventoryDeclare`. The subject-
//     supplier cache invalidation is the hook's job (the C4c carve-out).
//
// HONESTY (identical to C2): operator-fed, no live channel — nothing is sent or
// received here; a parsed reply is a SUGGESTION until confirmed; uom is
// diagnostic-only; an unknown material BLOCKS confirm (no silent resolution); on
// confirm the wrapper is STRIPPED (parseGrid gets bare rows). The RESULT is framed
// "Recorded by Paragon from {channel}" — never "the supplier submitted it".
// ────────────────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = ['whatsapp', 'email', 'wechat'];

// parseGrid import-mode failure reason → the honest message key (shared with C2).
// EXHAUSTIVE, not Partial — see CommHubInbound: a refused row must always be
// able to say WHY, so widening ParseReason breaks the build rather than the copy.
const REASON_KEY: Record<ParseReason, string> = {
  EMPTY_TOTAL: 'commHub.reason.EMPTY_TOTAL',
  MISSING_MATERIAL: 'commHub.reason.MISSING_MATERIAL',
  INVALID_QTY: 'commHub.reason.INVALID_QTY',
  AMBIGUOUS_QTY: 'commHub.reason.AMBIGUOUS_QTY',
  MISSING_BATCH_NUMBER: 'commHub.reason.MISSING_BATCH_NUMBER',
  BATCH_TOTAL_MISMATCH: 'commHub.reason.BATCH_TOTAL_MISMATCH',
  NO_ROWS: 'commHub.reason.NO_ROWS',
};
const QTY_REASON_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'commHub.qtyReason.EMPTY_QTY',
  NOT_NUMERIC: 'commHub.qtyReason.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'commHub.qtyReason.AMBIGUOUS_QTY',
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface EditRow {
  readonly rawMaterial: string;
  materialCode: string;
  totalQty: string;
}

interface DispatchOutcome {
  readonly ok: boolean;
  readonly material: string;
  readonly qty?: string;
  readonly reasonKey?: string;
  readonly reasonText?: string;
}

interface BuyerChannelTriageProps {
  /** Called after ≥1 declaration is recorded, so the parent's channel-sourced
   *  audit trail (which reads the append-only provenance store) re-renders. */
  onRecorded?: () => void;
}

const BuyerChannelTriage: React.FC<BuyerChannelTriageProps> = ({ onRecorded }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const suppliersQuery = useSuppliers();
  const suppliers = useMemo(() => suppliersQuery.data?.items ?? [], [suppliersQuery.data]);
  const recordMutation = useInventoryRecord();

  // §74 — the seat's authority over `t_inventorydeclaration_record`
  // (atom `inventorydeclaration:record`, held by `planning`). The triage
  // confirm is the ONE act on this surface; a seat without it reads whose.
  const recordAvailability = useVerbAvailability('inventorydeclaration:record');

  // THE BINDING, FIRST: the subject supplier is chosen at capture. Everything
  // downstream (the ChannelMessage, the material picker, the dispatch) derives
  // from it. There is no free supplierId field anywhere after this.
  const [subjectSupplierId, setSubjectSupplierId] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ChannelParseResult | null>(null);
  const [message, setMessage] = useState<ChannelMessage | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [outcomes, setOutcomes] = useState<DispatchOutcome[] | null>(null);

  const sessionRef = useRef<SubmissionSessionRecorder | null>(null);
  const msgSeq = useRef(0);
  const causationId = (): string | undefined => sessionRef.current?.causationAnchor() ?? undefined;
  const recordAttempt = (res: CommandResult) => {
    if (!sessionRef.current) {
      sessionRef.current = openSubmissionSession(
        `ss-c4d-${Date.now().toString(36)}`,
        subjectSupplierId, // the SUBJECT supplier — the envelope is "about X"
        new Date().toISOString(),
      );
    }
    sessionRef.current.attempt('InventoryDeclaration', res.entityId ?? '', res.correlationId);
  };

  // The subject supplier's collaborated materials — EXACTLY the set the record
  // command would accept (the surface mirror of the server's creationOwner rule).
  // The UI never offers a material the dispatch would deny; an unknown token stays
  // unmapped (materialCode '') and blocks confirm.
  const subjectMaterials = useMemo(() => {
    if (!subjectSupplierId) return [];
    return ownCollaboratedMaterials(
      SUPPLIER_MATERIAL_RELATIONSHIPS,
      FORECAST_PUBLICATIONS,
      subjectSupplierId,
    ).map((m) => {
      // CP-2 · B1 — a LABEL miss echoes the code (honest); a UNIT miss is null,
      // never the old fabricated 'KG'. The collaborated set is relationships ∪
      // publications, which the master does not gate, so this join CAN miss.
      const unit = uomOf(m.materialCode);
      return {
        materialCode: m.materialCode,
        label: labelOf(m.materialCode),
        uom: unit.ok ? unit.uom : null,
      };
    });
  }, [subjectSupplierId]);

  const subjectName = useMemo(
    () => suppliers.find((s) => s.id === subjectSupplierId)?.name ?? subjectSupplierId,
    [suppliers, subjectSupplierId],
  );

  // The subject's canonical unit for a code, or null when the master cannot name
  // one. Distinct from the shared `uomOf` import: this is scoped to the materials
  // THIS supplier collaborates on, so a code outside that set is also null.
  const subjectUom = (materialCode: string): Uom | null =>
    subjectMaterials.find((m) => m.materialCode === materialCode)?.uom ?? null;

  // ── Gate 1 → parse (the reply is a SOURCE; nothing dispatches here) ──────────
  const runParse = () => {
    if (!subjectSupplierId) return; // binding first — cannot parse without a subject
    // CP-2 · B1 — MEMBERSHIP-FIRST classification. The subject's collaborated
    // set is EXACTLY what a legitimate reply could name, and it is what the
    // record verb would accept; the master's remaining codes come second so a
    // canonical code the subject does not collaborate on is still read as the
    // MATERIAL (and then blocks at confirm as unmapped) rather than being
    // silently captured as the QUANTITY. Without this, a numeric MATNR loses to
    // `isQtyLike` and the row proposed into the hub is plausible and wrong.
    const result = parseChannelReply(rawText, {
      numberFormatHint: 'id',
      knownMaterials: [...subjectMaterials.map((m) => m.materialCode), ...knownMaterialCodes()],
    });
    // The ChannelMessage's supplierId is the SUBJECT binding — chosen at capture,
    // NEVER parsed from the text (C1a). receivedAt rides the shared simulated clock.
    msgSeq.current += 1;
    const cm: ChannelMessage = {
      id: `cm-c4d-${Date.now().toString(36)}-${msgSeq.current}`,
      channel,
      supplierId: subjectSupplierId,
      receivedAt: sdcClock.now(),
      rawText,
    };
    setMessage(cm);
    setParsed(result);
    setOutcomes(null);
    setRows(
      result.proposedRows.map((r) => {
        const rawMaterial = r[IMPORT_DECLARE_COLUMN.materialCode] ?? '';
        const exact = subjectMaterials.some((m) => m.materialCode === rawMaterial);
        return {
          rawMaterial,
          materialCode: exact ? rawMaterial : '',
          totalQty: r[IMPORT_DECLARE_COLUMN.totalQty] ?? '',
        };
      }),
    );
  };

  // Picking a new subject invalidates any in-flight parse (the binding changed).
  const pickSupplier = (id: string) => {
    setSubjectSupplierId(id);
    setParsed(null);
    setMessage(null);
    setRows([]);
    setOutcomes(null);
    sessionRef.current = null;
  };

  const reset = () => {
    setRawText('');
    setParsed(null);
    setMessage(null);
    setRows([]);
    setOutcomes(null);
    sessionRef.current = null;
  };

  const setRow = (i: number, patch: Partial<EditRow>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const dispatchableRows = rows.filter((r) => r.materialCode !== '' && r.totalQty.trim() !== '');
  const canConfirm = subjectSupplierId !== '' && dispatchableRows.length > 0 && !recordMutation.isPending;

  // ── Gate 3 → confirm: STRIP the wrapper, dispatch the RECORD verb ────────────
  const confirm = async () => {
    if (!message) return;
    const gridRows: GridRow[] = dispatchableRows.map((r) => ({
      [IMPORT_DECLARE_COLUMN.materialCode]: r.materialCode,
      [IMPORT_DECLARE_COLUMN.totalQty]: r.totalQty,
    }));
    // supplierId from the MESSAGE binding (the subject), never a free field.
    const context: GridContext = {
      supplierId: message.supplierId,
      spec: { kind: 'InventoryDeclaration', mode: 'import' },
    };
    const units = parseGrid(gridRows, context);

    const results: DispatchOutcome[] = [];
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const material = dispatchableRows[i]?.materialCode ?? '';
      if (!unit.ok) {
        results.push({ ok: false, material, reasonKey: REASON_KEY[unit.reason] });
        continue;
      }
      try {
        // The C4c recording verb — the subject supplierId is message-bound inside
        // the hook ({...facts, supplierId: message.supplierId}); the DR-10 actor is
        // the buyer. NOT useInventoryDeclare (that is the supplier's own act).
        const res = await recordMutation.mutateAsync({
          message,
          facts: unit.payload,
          causationId: causationId(),
        });
        if (res.status === 'failed') {
          // CP-2 · B1 — a NAMED dispatch refusal gets its own sentence rather
          // than leaking the server string; anything else falls back as before.
          //
          // ⚠️ **SAME UNSATISFIABLE SHAPE AS THE GR WIZARD'S.**
          // `UNKNOWN_MATERIAL` is the `sdc_material_known` hook's OWN reason, so
          // it arrives behind `POLICY_REJECTED:sdc_material_known:` and a head
          // test never matched. The buyer has been reading the raw hook string
          // while a full EN+ID remedy sat unused one line away.
          const named = refusedByPolicy(res.reason, POLICY_HOOKS.SDC_MATERIAL_KNOWN)
            ? t('commHub.refusal.UNKNOWN_MATERIAL')
            : undefined;
          results.push({
            ok: false,
            material,
            reasonText: named ?? refusalText(res.reason) ?? res.reason ?? t('buyerCommHub.triage.toast.failed.body'),
          });
          continue;
        }
        recordAttempt(res);
        results.push({ ok: true, material, qty: String(unit.payload.totalQty) });
      } catch {
        results.push({ ok: false, material, reasonText: t('buyerCommHub.triage.toast.failed.body') });
      }
    }

    // Provenance (channel side): link the message to the session it produced —
    // channelMessageId → sessionId / causationAnchor, never in a payload (C2 shape).
    if (sessionRef.current) {
      channelProvenanceStore.append(makeProvenanceRef(message.id, sessionRef.current.envelope()));
    }

    setOutcomes(results);
    const landed = results.filter((r) => r.ok).length;
    if (landed > 0) {
      onRecorded?.(); // let the parent refresh its channel-sourced audit trail
      toast({
        variant: 'success',
        title: t('buyerCommHub.triage.toast.landed.title', { channel: t(`buyerCommHub.channel.${channel}`) }),
        description: t('buyerCommHub.triage.toast.landed.body'),
      });
    } else {
      toast({
        variant: 'error',
        title: t('buyerCommHub.triage.toast.failed.title'),
        description: t('buyerCommHub.triage.toast.failed.body'),
      });
    }
  };

  const hasRows = parsed !== null && rows.length > 0;
  const recognized = parsed !== null && parsed.specHint !== null;

  return (
    <section data-testid="commhub-triage">
      <div className="flex items-center gap-2 mb-1">
        <Inbox size={16} className="text-teal" aria-hidden="true" />
        <h2 className="text-section text-text-primary">{t('buyerCommHub.triage.title')}</h2>
      </div>
      <p className="text-sm text-text-tertiary mb-4">{t('buyerCommHub.triage.subtitle')}</p>

      <div className="border border-border-subtle rounded-lg bg-white p-5 flex flex-col gap-5">
        {/* ── The binding, FIRST — whose conversation is this? ─────────────── */}
        <div>
          <label className={labelClass} htmlFor="triage-supplier">
            {t('buyerCommHub.triage.supplierLabel')}
          </label>
          <select
            id="triage-supplier"
            className={inputClass}
            value={subjectSupplierId}
            onChange={(e) => pickSupplier(e.target.value)}
            data-testid="triage-supplier"
          >
            <option value="">{t('buyerCommHub.triage.supplierSelect')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-text-tertiary">{t('buyerCommHub.triage.supplierHint')}</p>
        </div>

        {subjectSupplierId === '' ? (
          <div className="rounded-md border border-border-subtle bg-bg-subtle px-4 py-6 text-center text-sm text-text-tertiary">
            {t('buyerCommHub.triage.pickSupplierFirst')}
          </div>
        ) : (
          <>
            {/* Recording-for banner — the bound subject, shown read-only. */}
            <div className="flex items-center gap-2 rounded-md border border-action/30 bg-action-soft px-3 py-2 text-sm">
              <MessageSquare size={14} className="text-action shrink-0" aria-hidden="true" />
              <span className="text-text-secondary">
                {t('buyerCommHub.triage.recordingFor')}{' '}
                <strong className="text-text-primary">{subjectName}</strong>
              </span>
            </div>

            {/* ── Gate 1 — the message source ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass} htmlFor="triage-channel">
                  {t('buyerCommHub.triage.channelLabel')}
                </label>
                <select
                  id="triage-channel"
                  className={inputClass}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {t(`buyerCommHub.channel.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="triage-message">
                  {t('buyerCommHub.triage.messageLabel')}
                </label>
                <textarea
                  id="triage-message"
                  rows={2}
                  className={`${inputClass} resize-y font-mono`}
                  placeholder={t('buyerCommHub.triage.placeholder')}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  data-testid="triage-message"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 -mt-1">
              <p className="text-xs text-text-tertiary">{t('buyerCommHub.triage.messageHint')}</p>
              <div className="flex items-center gap-2">
                {parsed !== null && (
                  <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                    {t('buyerCommHub.triage.reset')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  icon={Inbox}
                  disabled={rawText.trim() === ''}
                  onClick={runParse}
                  data-testid="triage-parse"
                >
                  {t('buyerCommHub.triage.parse')}
                </Button>
              </div>
            </div>

            {/* ── Gate 2 — the inference review (the confirm gate) ──────────── */}
            {parsed !== null && (
              <div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal" aria-hidden="true" />
                  <h3 className="text-section text-text-primary">{t('buyerCommHub.triage.inferTitle')}</h3>
                </div>

                {/* Raw message echo. */}
                <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-2">
                  <div className="text-label text-text-tertiary uppercase mb-1">{t('buyerCommHub.triage.rawTitle')}</div>
                  <Data className="text-sm text-text-primary break-words">{message?.rawText}</Data>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill variant="neutral">
                    {t('commHub.infer.confidence', { pct: Math.round((parsed.diagnostics.confidence ?? 0) * 100) })}
                  </StatusPill>
                  {recognized && (
                    <span className="text-text-secondary">
                      {t('commHub.infer.specHint')}:{' '}
                      <strong className="text-text-primary">{t('commHub.infer.specHint.inventory')}</strong>
                    </span>
                  )}
                </div>

                {parsed.diagnostics.matchedTokens.length > 0 && (
                  <div className="text-xs text-text-secondary">
                    <span className="text-label text-text-tertiary uppercase mr-2">{t('commHub.infer.matched')}</span>
                    <span className="inline-flex flex-wrap gap-1">
                      {parsed.diagnostics.matchedTokens.map((tok, i) => (
                        <Data key={i} className="rounded bg-teal-soft px-1.5 py-0.5 text-teal">
                          {tok}
                        </Data>
                      ))}
                    </span>
                  </div>
                )}

                <div className="text-xs text-text-secondary">
                  <span className="text-label text-text-tertiary uppercase mr-2">{t('commHub.infer.unparsed')}</span>
                  {parsed.diagnostics.unparsedRemainder
                    ? <Data className="text-warning-hover">{parsed.diagnostics.unparsedRemainder}</Data>
                    : <span className="text-text-tertiary">{t('commHub.infer.unparsedNone')}</span>}
                </div>

                {parsed.diagnostics.uom && (
                  <div className="text-xs text-text-tertiary italic">
                    {t('commHub.infer.uomDiag', { uom: parsed.diagnostics.uom })}
                  </div>
                )}

                {parsed.diagnostics.qtyReason && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-hover">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      {t('commHub.infer.qtyRefused', { reason: t(QTY_REASON_KEY[parsed.diagnostics.qtyReason]) })}{' '}
                      <GlossaryTermChip
                        refTo={{ sourceType: 'QtyRefusalReason', term: parsed.diagnostics.qtyReason }}
                      />
                    </span>
                  </div>
                )}

                {!hasRows && (
                  <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-3">
                    <div className="text-sm font-semibold text-text-primary">{t('commHub.infer.noParse.title')}</div>
                    <p className="mt-0.5 text-xs text-text-secondary">{t('commHub.infer.noParse.body')}</p>
                  </div>
                )}

                {hasRows && (
                  <div className="flex flex-col gap-3" data-testid="triage-rows">
                    <div className="text-label text-text-tertiary uppercase">{t('buyerCommHub.triage.rowTitle')}</div>
                    {rows.map((row, i) => {
                      const masterUom = subjectUom(row.materialCode);
                      // CP-2 · B1 — an ABSENT master unit is not a mismatch. With
                      // the old 'KG' default this comparison always had something
                      // to disagree with, so an unknown material would have warned
                      // "supplier said PCS, master says KG" — a fabricated claim
                      // dressed as a warning. No unit known ⇒ nothing to contradict.
                      const mismatch =
                        !!parsed.diagnostics.uom &&
                        row.materialCode !== '' &&
                        masterUom !== null &&
                        parsed.diagnostics.uom.toUpperCase() !== masterUom.toUpperCase();
                      return (
                        <div key={i} className="rounded-md border border-border-subtle bg-bg-hover p-3 flex flex-col gap-2">
                          <div className="text-xs text-text-tertiary">
                            {t('commHub.row.supplierWrote')}:{' '}
                            <Data className="text-text-secondary">{row.rawMaterial || '—'}</Data>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className={labelClass} htmlFor={`triage-mat-${i}`}>
                                {t('commHub.row.materialLabel')}
                              </label>
                              <select
                                id={`triage-mat-${i}`}
                                className={inputClass}
                                value={row.materialCode}
                                onChange={(e) => setRow(i, { materialCode: e.target.value })}
                                data-testid={`triage-mat-${i}`}
                              >
                                <option value="">{t('commHub.row.materialSelect')}</option>
                                {subjectMaterials.map((m) => (
                                  <option key={m.materialCode} value={m.materialCode}>
                                    {m.materialCode} — {m.label} ({m.uom ?? '—'})
                                  </option>
                                ))}
                              </select>
                              <p className="mt-1 text-[11px] text-text-tertiary">{t('commHub.row.materialHint')}</p>
                            </div>
                            <div>
                              <label className={labelClass} htmlFor={`triage-qty-${i}`}>
                                {t('commHub.row.totalLabel', { uom: masterUom || '—' })}
                              </label>
                              <input
                                id={`triage-qty-${i}`}
                                type="text"
                                inputMode="decimal"
                                className={`${inputClass} font-mono`}
                                value={row.totalQty}
                                onChange={(e) => setRow(i, { totalQty: e.target.value })}
                                data-testid={`triage-qty-${i}`}
                              />
                            </div>
                          </div>
                          {mismatch && (
                            <div className="text-[11px] text-warning-hover">
                              {t('commHub.row.uomMismatch', { msg: parsed.diagnostics.uom, master: masterUom })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-text-tertiary">{t('buyerCommHub.triage.confirmHint')}</p>
                      {recordAvailability.kind === 'held' ? (
                        <Button
                          variant="outline"
                          icon={Send}
                          disabled={!canConfirm}
                          onClick={confirm}
                          data-testid="triage-confirm"
                        >
                          {recordMutation.isPending ? t('buyerCommHub.triage.confirming') : t('buyerCommHub.triage.confirm')}
                        </Button>
                      ) : (
                        <HandoffNotice availability={recordAvailability} testId="handoff-triage-record" />
                      )}
                    </div>
                  </div>
                )}

                {/* Result — the C4c semantic ON SCREEN: RECORDED BY PARAGON. */}
                {outcomes && outcomes.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3" data-testid="triage-result">
                    <div className="text-label text-text-tertiary uppercase">{t('buyerCommHub.triage.resultTitle')}</div>
                    {outcomes.map((o, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs ${o.ok ? 'text-success' : 'text-danger'}`}>
                        {o.ok ? (
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {o.ok
                            ? t('buyerCommHub.triage.result.landed', {
                                channel: t(`buyerCommHub.channel.${channel}`),
                                material: o.material,
                                qty: `${formatNumber(Number(o.qty))} ${subjectUom(o.material) ?? ''}`.trim(),
                              })
                            : t('buyerCommHub.triage.result.refused', {
                                reason: o.reasonKey ? t(o.reasonKey) : (o.reasonText ?? ''),
                              })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Honesty footer — operator-fed, actor is Paragon. */}
        <div className="flex items-start gap-2 border-t border-border-subtle pt-3 text-xs text-text-tertiary">
          <Info size={13} className="mt-0.5 shrink-0 text-warning-hover" aria-hidden="true" />
          <span>{t('buyerCommHub.triage.honestyNote')}</span>
        </div>
      </div>
    </section>
  );
};

export default BuyerChannelTriage;
