import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox,
  Info,
  MessageSquare,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  Clock,
  ArrowRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useInventoryDeclare, useOwnCollaboratedMaterials } from '../services/query/sdcSupplierHooks';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
import { shapeObligations } from '../services/chase';
import { parseChannelReply, type ChannelParseResult, type QtyRefusalReason } from '../services/channel/replyParser';
import { makeProvenanceRef, type Channel, type ChannelMessage } from '../services/channel/types';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import {
  parseGrid,
  openSubmissionSession,
  sdcClock,
  SDC_SIMULATED_NOW,
  IMPORT_DECLARE_COLUMN,
  type GridRow,
  type GridContext,
  type ParseReason,
  type SdcObjectKind,
  type SubmissionSessionRecorder,
} from '../services/sdc';
import type { CommandResult } from '../services/data/types';
import { formatNumber, formatDate } from '../lib/format';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C2 — the INBOUND CONFIRM-BEFORE-COMMIT surface (DEC-COMMS-PRIMARY).
//
// The honesty crux of the arc: where a parsed channel reply becomes governed
// truth. A parsed reply is an INFERENCE until a human confirms; this surface
// shows the inference, lets the operator correct it, and dispatches ONLY on
// confirm — through the EXISTING spine (parseGrid → verb hook → dispatch). It
// mirrors XlsxImportPanel's doctrine: the parse is a pre-fill SOURCE, never a
// dispatch path; the confirm gate is the sole dispatch surface.
//
// SUPPLIER-CONTEXT (this cut): the SDC verb hooks scope by the current identity,
// so — reusing them verbatim — this triage runs under the bound supplier's
// conversation. `supplierId` comes from that identity (GridContext), NEVER from
// the message text. Cross-supplier buyer triage needs a scope mechanism — a C4
// concern (reported).
//
// HONESTY: operator-fed (no webhook / no transport exists) — SIMULATED via the
// LivenessPill; a parsed reply never auto-commits; uom is diagnostic-only; the
// wrapper is stripped on confirm (parseGrid receives bare rows); provenance is
// recorded on the CHANNEL side (channelMessageId → sessionId), never in a payload.
// ────────────────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = ['whatsapp', 'email', 'wechat'];

// C5 — how many own obligations to preview inline before deferring the rest to the
// full list on the delivery mirror (compact here, never a duplicate of the mirror).
const NEEDS_CAP = 4;

// parseGrid import-mode failure reason → the honest message key (honest silence).
// EXHAUSTIVE, not Partial: a refusal that states no reason is not honest
// silence, it is just silence. Keying every ParseReason means widening the union
// breaks the build here instead of rendering a blank reason to an operator.
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

/** One editable, confirmable row derived from a parsed proposedRow. */
interface EditRow {
  /** The raw material token the supplier wrote (reference — never dispatched as-is). */
  readonly rawMaterial: string;
  /** The confirmed material selection (from the picker) — '' until the operator maps it. */
  materialCode: string;
  /** The editable total quantity (pre-filled with the parser's canonical value). */
  totalQty: string;
}

interface DispatchOutcome {
  readonly ok: boolean;
  readonly material: string;
  readonly qty?: string;
  readonly reasonKey?: string;
  readonly reasonText?: string;
}

const CommHubInbound: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;

  const materialsQuery = useOwnCollaboratedMaterials();
  const materials = useMemo(() => materialsQuery.data ?? [], [materialsQuery.data]);
  const declareMutation = useInventoryDeclare();

  // C5 — the supplier's OWN obligations ("what Paragon needs from you"), reusing the
  // shared 5e derivation over the own-scoped delivery views (no ask-store read, no
  // send implied — chase-derived facts, TRUE without any message having been sent).
  const agreementsQuery = useDeliveryAgreements();
  const obligations = useMemo(
    () => shapeObligations(agreementsQuery.data ?? [], SDC_SIMULATED_NOW),
    [agreementsQuery.data],
  );

  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ChannelParseResult | null>(null);
  const [message, setMessage] = useState<ChannelMessage | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [outcomes, setOutcomes] = useState<DispatchOutcome[] | null>(null);

  // ONE SubmissionSession per triage visit (mirrors SupplierForecasts): the first
  // dispatch anchors the audit correlation; later dispatches chain via causationId.
  const sessionRef = useRef<SubmissionSessionRecorder | null>(null);
  const msgSeq = useRef(0);
  const causationId = (): string | undefined => sessionRef.current?.causationAnchor() ?? undefined;
  const recordAttempt = (kind: SdcObjectKind, res: CommandResult) => {
    if (!sessionRef.current) {
      sessionRef.current = openSubmissionSession(
        `ss-c2-${Date.now().toString(36)}`,
        supplierId ?? '',
        new Date().toISOString(),
      );
    }
    sessionRef.current.attempt(kind, res.entityId ?? '', res.correlationId);
  };

  if (!supplierId) return <NoSupplierIdentity />;

  const lastUpdated = sdcClock.now();

  // ── Gate 1 → parse (the reply is a SOURCE; nothing dispatches here) ──────────
  const runParse = () => {
    const result = parseChannelReply(rawText, { numberFormatHint: 'id' });
    // Construct the inbound record (C1a) — supplierId is the app binding, NEVER
    // parsed from the text. receivedAt rides the shared simulated clock.
    msgSeq.current += 1;
    const cm: ChannelMessage = {
      id: `cm-${Date.now().toString(36)}-${msgSeq.current}`,
      channel,
      supplierId,
      receivedAt: sdcClock.now(),
      rawText,
    };
    setMessage(cm);
    setParsed(result);
    setOutcomes(null);
    // Seed the editable rows from the proposed rows: pre-select a material only on
    // an EXACT collaborated-code match (a suggestion, never silent resolution).
    setRows(
      result.proposedRows.map((r) => {
        const rawMaterial = r[IMPORT_DECLARE_COLUMN.materialCode] ?? '';
        const exact = materials.some((m) => m.materialCode === rawMaterial);
        return {
          rawMaterial,
          materialCode: exact ? rawMaterial : '',
          totalQty: r[IMPORT_DECLARE_COLUMN.totalQty] ?? '',
        };
      }),
    );
  };

  const reset = () => {
    setRawText('');
    setParsed(null);
    setMessage(null);
    setRows([]);
    setOutcomes(null);
  };

  const setRow = (i: number, patch: Partial<EditRow>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const uomOf = (materialCode: string): string =>
    materials.find((m) => m.materialCode === materialCode)?.uom ?? '';

  const dispatchableRows = rows.filter((r) => r.materialCode !== '' && r.totalQty.trim() !== '');
  const canConfirm = dispatchableRows.length > 0 && !declareMutation.isPending;

  // ── Gate 3 → confirm: STRIP the wrapper, hand the spine bare rows ────────────
  const confirm = async () => {
    if (!message) return;
    // The wrapper (specHint / diagnostics / uom / confidence) NEVER reaches the
    // spine — only the confirmed cells become GridRows.
    const gridRows: GridRow[] = dispatchableRows.map((r) => ({
      [IMPORT_DECLARE_COLUMN.materialCode]: r.materialCode,
      [IMPORT_DECLARE_COLUMN.totalQty]: r.totalQty,
    }));
    // supplierId from the identity binding (context), never the message.
    const context: GridContext = {
      supplierId,
      spec: { kind: 'InventoryDeclaration', mode: 'import' },
    };
    const units = parseGrid(gridRows, context);

    const results: DispatchOutcome[] = [];
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const material = dispatchableRows[i]?.materialCode ?? '';
      if (!unit.ok) {
        // Honest silence — parseGrid refused this row; surface its reason.
        results.push({ ok: false, material, reasonKey: REASON_KEY[unit.reason] });
        continue;
      }
      try {
        const res = await declareMutation.mutateAsync({ payload: unit.payload, causationId: causationId() });
        if (res.status === 'failed') {
          results.push({ ok: false, material, reasonText: res.reason ?? t('commHub.toast.failed.body') });
          continue;
        }
        recordAttempt('InventoryDeclaration', res);
        results.push({ ok: true, material, qty: String(unit.payload.totalQty) });
      } catch {
        results.push({ ok: false, material, reasonText: t('commHub.toast.failed.body') });
      }
    }

    // Provenance (channel side): link the message to the session it produced.
    if (sessionRef.current) {
      channelProvenanceStore.append(makeProvenanceRef(message.id, sessionRef.current.envelope()));
    }

    setOutcomes(results);
    const landed = results.filter((r) => r.ok).length;
    if (landed > 0) {
      toast({
        variant: 'success',
        title: t('commHub.toast.landed.title', { channel: t(`commHub.channel.${channel}`) }),
        description: t('commHub.toast.landed.body'),
      });
    } else {
      toast({
        variant: 'error',
        title: t('commHub.toast.failed.title'),
        description: t('commHub.toast.failed.body'),
      });
    }
  };

  const crumb = [t('commHub.crumb.intelligence'), t('commHub.crumb.inbound')];
  const hasRows = parsed !== null && rows.length > 0;
  const recognized = parsed !== null && parsed.specHint !== null;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('commHub.header.title')}
        subtitle={t('commHub.header.subtitle')}
        actions={<LivenessPill capability="inventory" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('commHub.meta.line', { date: lastUpdated.slice(0, 10) })}
      </PageMetaLine>

      {/* Honesty banner — operator-fed, no live channel. */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" />
        <div>
          <div className="font-semibold text-warning-hover">{t('commHub.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('commHub.honesty.body')}</p>
        </div>
      </div>

      {/* ── Comm Hub C5 — "what Paragon needs from you" (own obligations) ──────
          The supplier's OWN upcoming + overdue deliveries, chase-derived and
          own-scoped — TRUE without any send. Own-facing tone (no chase vocabulary);
          the OUTBOUND ASK STORE is deliberately never read here (every record is
          "composed — not sent" — surfacing it would fabricate a receipt). */}
      <section
        className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6"
        data-testid="commhub-needs"
      >
        <div className="px-4 py-3 border-b border-border-subtle bg-bg-subtle flex items-center gap-3">
          <CalendarClock size={16} className="text-teal shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary">{t('commHub.needs.title')}</div>
            <div className="text-xs text-text-tertiary">{t('commHub.needs.subtitle')}</div>
          </div>
          {obligations.length > 0 && (
            <span className="ml-auto text-xs text-text-tertiary">
              {t('delivery.supplier.obligations.summary', {
                overdue: obligations.filter((o) => o.kind === 'overdue').length,
                upcoming: obligations.filter((o) => o.kind === 'upcoming').length,
              })}
            </span>
          )}
        </div>

        {agreementsQuery.isPending ? (
          // Don't flash the "all-clear" before the read settles — that would assert
          // "nothing due" for a moment even when obligations exist.
          <div className="px-4 py-6 text-sm text-text-tertiary">{t('commHub.needs.loading')}</div>
        ) : obligations.length === 0 ? (
          <div className="px-4 py-6 text-sm text-text-tertiary flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden="true" />
            {t('delivery.supplier.obligations.empty')}
          </div>
        ) : (
          <>
            <ul className="flex flex-col">
              {obligations.slice(0, NEEDS_CAP).map((o, idx, shown) => (
                <li
                  key={o.key}
                  className={`px-4 py-3 flex items-start gap-3 border-l-[3px] ${
                    o.kind === 'overdue' ? 'border-l-danger' : 'border-l-warning'
                  } ${idx < shown.length - 1 ? 'border-b border-border-subtle' : ''}`}
                  data-testid="commhub-needs-row"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-bg-hover">
                    {o.kind === 'overdue' ? (
                      <AlertTriangle size={15} className="text-danger" aria-hidden="true" />
                    ) : (
                      <Clock size={15} className="text-warning-hover" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-text-primary">
                        {t(
                          o.kind === 'overdue'
                            ? 'delivery.supplier.obligations.overdue'
                            : 'delivery.supplier.obligations.upcoming',
                        )}
                      </span>
                      <Data className="text-sm">{o.materialCode}</Data>
                      <span className="text-xs text-text-tertiary">
                        {t('delivery.supplier.obligations.due', { date: formatDate(o.dueDate) })}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {t(
                        o.kind === 'overdue'
                          ? 'delivery.supplier.obligations.overdueGloss'
                          : 'delivery.supplier.obligations.upcomingGloss',
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {/* The full list lives on the delivery mirror — cross-link, never a
                duplicate render of it. */}
            <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-subtle">
              <Link
                to="/supplier/delivery-agreements"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-action hover:text-action-hover"
                data-testid="commhub-needs-viewall"
              >
                {t('commHub.needs.viewAll')}
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ── The honest note — recorded here, never sent from here (C5) ──────── */}
      <div
        className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary"
        data-testid="commhub-note"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
        <div>
          <div className="font-semibold text-info">{t('commHub.note.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('commHub.note.body')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Gate 1 — the message source ─────────────────────────────────── */}
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5" data-testid="commhub-source">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-teal" />
            <h3 className="text-section text-text-primary">{t('commHub.source.title')}</h3>
          </div>

          <div className="mb-3">
            <label className={labelClass} htmlFor="commhub-channel">
              {t('commHub.source.channelLabel')}
            </label>
            <select
              id="commhub-channel"
              className={inputClass}
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`commHub.channel.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-1">
            <label className={labelClass} htmlFor="commhub-message">
              {t('commHub.source.messageLabel')}
            </label>
            <textarea
              id="commhub-message"
              rows={4}
              className={`${inputClass} resize-y font-mono`}
              placeholder={t('commHub.source.placeholder')}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              data-testid="commhub-message-input"
            />
          </div>
          <p className="text-xs text-text-tertiary mb-4">{t('commHub.source.hint')}</p>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              icon={Inbox}
              disabled={rawText.trim() === ''}
              onClick={runParse}
              data-testid="commhub-parse"
            >
              {t('commHub.source.parse')}
            </Button>
            {parsed !== null && (
              <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                {t('commHub.reset')}
              </Button>
            )}
          </div>
        </section>

        {/* ── Gate 2 — the inference review (the confirm gate) ─────────────── */}
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5" data-testid="commhub-inference">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-teal" />
            <h3 className="text-section text-text-primary">{t('commHub.infer.title')}</h3>
          </div>

          {parsed === null ? (
            <p className="text-sm text-text-tertiary">{t('commHub.source.hint')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Raw message echo + diagnostics (honest render of the inference). */}
              <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-2">
                <div className="text-label text-text-tertiary uppercase mb-1">
                  {t('commHub.infer.rawTitle')}
                </div>
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
                  <span className="text-label text-text-tertiary uppercase mr-2">
                    {t('commHub.infer.matched')}
                  </span>
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
                <span className="text-label text-text-tertiary uppercase mr-2">
                  {t('commHub.infer.unparsed')}
                </span>
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
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{t('commHub.infer.qtyRefused', { reason: t(QTY_REASON_KEY[parsed.diagnostics.qtyReason]) })}</span>
                </div>
              )}

              {/* No recognized intent OR no confirmable row: honest, nothing to record. */}
              {!hasRows && (
                <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-3">
                  <div className="text-sm font-semibold text-text-primary">
                    {t('commHub.infer.noParse.title')}
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">{t('commHub.infer.noParse.body')}</p>
                </div>
              )}

              {/* The editable, confirmable rows — the material is a SUGGESTION the
                  operator confirms (never silent), uom is diagnostic-only. */}
              {hasRows && (
                <div className="flex flex-col gap-3" data-testid="commhub-rows">
                  <div className="text-label text-text-tertiary uppercase">{t('commHub.row.title')}</div>
                  {rows.map((row, i) => {
                    const masterUom = uomOf(row.materialCode);
                    const mismatch =
                      !!parsed.diagnostics.uom &&
                      row.materialCode !== '' &&
                      parsed.diagnostics.uom.toUpperCase() !== masterUom.toUpperCase();
                    return (
                      <div key={i} className="rounded-md border border-border-subtle bg-bg-hover p-3 flex flex-col gap-2">
                        <div className="text-xs text-text-tertiary">
                          {t('commHub.row.supplierWrote')}:{' '}
                          <Data className="text-text-secondary">{row.rawMaterial || '—'}</Data>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass} htmlFor={`commhub-mat-${i}`}>
                              {t('commHub.row.materialLabel')}
                            </label>
                            <select
                              id={`commhub-mat-${i}`}
                              className={inputClass}
                              value={row.materialCode}
                              onChange={(e) => setRow(i, { materialCode: e.target.value })}
                              data-testid={`commhub-mat-${i}`}
                            >
                              <option value="">{t('commHub.row.materialSelect')}</option>
                              {materials.map((m) => (
                                <option key={m.materialCode} value={m.materialCode}>
                                  {m.materialCode} — {m.label} ({m.uom})
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-[11px] text-text-tertiary">{t('commHub.row.materialHint')}</p>
                          </div>
                          <div>
                            <label className={labelClass} htmlFor={`commhub-qty-${i}`}>
                              {t('commHub.row.totalLabel', { uom: masterUom || '—' })}
                            </label>
                            <input
                              id={`commhub-qty-${i}`}
                              type="text"
                              inputMode="decimal"
                              className={`${inputClass} font-mono`}
                              value={row.totalQty}
                              onChange={(e) => setRow(i, { totalQty: e.target.value })}
                              data-testid={`commhub-qty-${i}`}
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

                  <p className="text-xs text-text-tertiary">{t('commHub.confirm.hint')}</p>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      icon={Send}
                      disabled={!canConfirm}
                      onClick={confirm}
                      data-testid="commhub-confirm"
                    >
                      {declareMutation.isPending ? t('commHub.confirm.confirming') : t('commHub.confirm.action')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Per-object outcome (honest silence — a refused row shows its reason). */}
              {outcomes && outcomes.length > 0 && (
                <div className="flex flex-col gap-1.5" data-testid="commhub-result">
                  <div className="text-label text-text-tertiary uppercase">{t('commHub.result.title')}</div>
                  {outcomes.map((o, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 text-xs ${o.ok ? 'text-success' : 'text-danger'}`}
                    >
                      {o.ok ? (
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      )}
                      <span>
                        {o.ok
                          ? t('commHub.result.landed', {
                              material: o.material,
                              qty: `${formatNumber(Number(o.qty))} ${uomOf(o.material) || ''}`.trim(),
                            })
                          : t('commHub.result.refused', {
                              reason: o.reasonKey ? t(o.reasonKey) : (o.reasonText ?? ''),
                            })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShellV2>
  );
};

export default CommHubInbound;
