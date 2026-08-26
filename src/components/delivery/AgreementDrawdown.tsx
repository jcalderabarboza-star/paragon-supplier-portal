// ─────────────────────────────────────────────────────────────────────────────
// AgreementDrawdown — the SHARED delivery-agreement render block.
//
// One agreement → its per-item drawdown ledger + release calendar with derived
// fulfillment. Rendered in TWO places, differing only by the data scope passed in:
//   · the nested contract-detail Delivery Agreements tab (one contract's agreements)
//   · the cross-contract roll-up (every agreement in scope) — which sets
//     `linkContract` so each card deep-links to its own contract-detail DA tab.
//
// Pure presentation off the already-derived DeliveryAgreementView — every state
// (fulfilled / late / missed / pending, the inferred "proposed" caption, the Case
// B/C policy chip, the qty variance) falls out of the view-model, never re-derived
// here. The honesty markers ride the view exactly as the surface batch validated
// them: an inferred match is a proposal (italic caption), and deliveredQty never
// counts an inferred line (the ledger already enforces the lock).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PackageCheck, Send, SlidersHorizontal } from 'lucide-react';
import StatusPill from '../ui-v2/StatusPill';
import KpiCard from '../ui-v2/KpiCard';
import TargetBar from '../ui-v2/TargetBar';
import Data from '../ui-v2/Data';
import Button from '../ui-v2/Button';
import ReleaseCalendar from './ReleaseCalendar';
import PolicyEditor from './PolicyEditor';
import { formatNumber, formatDate } from '../../lib/format';
import type { TFunction } from 'i18next';
import type {
  DeliveryAgreementView,
  DeliveryItemView,
  EditPolicyPatch,
  ReleaseSelection,
  TolerancePolicy,
} from '../../services/delivery';

/** The release write, threaded from the page (BuyerContractDetail) when the
 *  viewer is a buyer. Absent ⇒ the card is read-only (the roll-up, and any
 *  supplier persona) — no release control renders. Resolves when the write
 *  settles; the page owns the toast (success + honest refusal). */
export type OnRelease = (
  agreementId: string,
  itemSeq: number,
  selection: ReleaseSelection,
) => Promise<void>;

/** The confirm-match write (the SECOND write) — accept an inferred proposal on a
 *  released line. Threaded from the page alongside `onRelease` when the viewer is a
 *  buyer; absent ⇒ read-only, no confirm control renders. The page owns the toast. */
export type OnConfirm = (
  agreementId: string,
  itemSeq: number,
  releaseSeq: number,
) => Promise<void>;

/** The policy-edit write (the THIRD write) — re-point one item's active drawdown
 *  tolerance. Threaded from the page alongside `onRelease` / `onConfirm` when the
 *  viewer is a buyer; absent ⇒ read-only, no edit control renders. Resolves to
 *  `true` when the edit was APPLIED (the editor closes) and `false` on an honest
 *  refusal (the editor stays open so the buyer can correct it). The page owns the
 *  toast. */
export type OnEditPolicy = (
  agreementId: string,
  itemSeq: number,
  patch: EditPolicyPatch,
) => Promise<boolean>;

/**
 * A stored FRACTION as display percent — the ONE conversion for this surface.
 *
 * CP-0 · W1 · 2f-d: `${frac * 100}` alone leaks IEEE-754 artefacts (0.07 * 100
 * is 7.000000000000001), and `Math.round` alone destroys a real fractional
 * tolerance (2.5 → 3). The 4-dp tidy does both jobs, and is the same one
 * `seedTolerancePct` applies when seeding the editor — so the chip, the
 * deviation note and the input box cannot disagree about the policy.
 */
function formatPct(fraction: number): string {
  return String(parseFloat((fraction * 100).toFixed(4)));
}

/** Format a tolerance policy for display: "10% · Flag" or "Unlimited · Ignore". */
function formatPolicy(t: TFunction, p: TolerancePolicy): string {
  const knob =
    p.tolerancePct === null
      ? t('delivery.policy.edit.unlimited')
      : `${formatPct(p.tolerancePct)}%`;
  return `${knob} · ${t(`delivery.policy.edit.enforcement.${p.enforcement}`)}`;
}

// ─── One agreement (header + per-item drawdown) ───────────────────────────────

/** Render one agreement's drawdown. `linkContract` turns the contract ref into a
 *  deep-link to `/buyer/contracts/:contractId` (the roll-up wants it; the nested
 *  DA tab is already on that contract, so it leaves it plain text). */
const AgreementCard: React.FC<{
  view: DeliveryAgreementView;
  linkContract?: boolean;
  onRelease?: OnRelease;
  onConfirm?: OnConfirm;
  onEditPolicy?: OnEditPolicy;
  /** Show the policy-deviation marker + its "changed {when} — {why}" detail. TRUE
   *  for the buyer (governance history is theirs). FALSE for the supplier mirror —
   *  the MODE chip (Governed / Reference) stays, but the contract-default, edit
   *  date, and reason are buyer-internal and stay hidden. */
  showPolicyHistory?: boolean;
  /** i18n key for the inferred-match caption — the supplier mirror passes its
   *  "awaiting Paragon confirmation" gloss; the buyer keeps the default. */
  proposedCaptionKey?: string;
}> = ({
  view,
  linkContract = false,
  onRelease,
  onConfirm,
  onEditPolicy,
  showPolicyHistory = true,
  proposedCaptionKey,
}) => {
  const { t } = useTranslation();
  const { agreement, supplierName } = view;
  // All-draft ⇒ no released line has fulfillment (the pristine "nothing
  // transmitted" state). Surfaced honestly rather than shown as an empty drawdown.
  const allDraft = view.items.every((iv) => iv.fulfillment.length === 0);

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PackageCheck size={16} className="text-text-tertiary shrink-0" />
            <span className="font-semibold text-text-primary">
              {supplierName ?? agreement.supplierId}
            </span>
            <StatusPill variant="neutral">{agreement.docType}</StatusPill>
          </div>
          <div className="text-xs text-text-tertiary mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            <span>
              {t('delivery.agreement.sapNumber')}:{' '}
              <Data className="text-xs">{agreement.sapAgreementNumber ?? '—'}</Data>
            </span>
            <span>
              {t('delivery.agreement.contract')}:{' '}
              {linkContract ? (
                <Link
                  to={`/buyer/contracts/${agreement.contractId}`}
                  className="text-action hover:underline"
                >
                  <Data className="text-xs text-action">{agreement.contractId}</Data>
                </Link>
              ) : (
                <Data className="text-xs">{agreement.contractId}</Data>
              )}
            </span>
          </div>
        </div>
        {allDraft && (
          <span className="text-xs text-text-tertiary italic shrink-0">
            {t('delivery.agreement.draftNote')}
          </span>
        )}
      </div>

      <div className="divide-y divide-border-subtle">
        {view.items.map((iv) => (
          <ItemBlock
            key={iv.item.lineSeq}
            iv={iv}
            agreementId={agreement.id}
            onRelease={onRelease}
            onConfirm={onConfirm}
            onEditPolicy={onEditPolicy}
            showPolicyHistory={showPolicyHistory}
            proposedCaptionKey={proposedCaptionKey}
          />
        ))}
      </div>
    </section>
  );
};

// ─── One item (policy · KPIs · drawdown bar · release calendar) ───────────────

const ItemBlock: React.FC<{
  iv: DeliveryItemView;
  agreementId: string;
  onRelease?: OnRelease;
  onConfirm?: OnConfirm;
  onEditPolicy?: OnEditPolicy;
  showPolicyHistory?: boolean;
  proposedCaptionKey?: string;
}> = ({
  iv,
  agreementId,
  onRelease,
  onConfirm,
  onEditPolicy,
  showPolicyHistory = true,
  proposedCaptionKey,
}) => {
  const { t } = useTranslation();
  const { item, ledger } = iv;
  const uom = item.uom;
  const policy = item.drawdownPolicy;

  // ── Policy-edit (the THIRD write) — buyer-only governance. `onEditPolicy`
  // present ⇒ the viewer is a buyer; the edit affordance renders on the policy
  // chip. The editor closes on an APPLIED edit, stays open on an honest refusal. ──
  const canEdit = !!onEditPolicy;
  const [editing, setEditing] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const doEditPolicy = async (patch: EditPolicyPatch) => {
    if (!onEditPolicy) return;
    setSavingPolicy(true);
    try {
      const applied = await onEditPolicy(agreementId, item.lineSeq, patch);
      if (applied) setEditing(false);
    } finally {
      setSavingPolicy(false);
    }
  };
  // Reset-to-default = re-point active back to the immutable contractDefault, with
  // a fixed reason (the reset IS the reason). Only offered when active has deviated.
  const doResetPolicy = () =>
    doEditPolicy({
      tolerancePct: policy.contractDefault.tolerancePct,
      enforcement: policy.contractDefault.enforcement,
      reason: t('delivery.policy.edit.resetReason'),
    });

  const drawdownPct =
    ledger.agreedTotalQty > 0 ? (ledger.releasedQty / ledger.agreedTotalQty) * 100 : 0;

  // ── Release (the FIRST write) — buyer-only, over DRAFT lines ────────────────
  // `onRelease` present ⇒ the viewer is a buyer; the horizon control renders only
  // for an item that still has draft lines to transmit.
  const draftDates = item.scheduleLines
    .filter((l) => l.state === 'draft')
    .map((l) => l.releaseDate);
  const canRelease = !!onRelease && draftDates.length > 0;

  // ── Confirm-match (the SECOND write) — buyer-only, over INFERRED released
  // lines. `onConfirm` present ⇒ buyer; a proposal to accept exists when any
  // released line carries an inferred proximity match. ────────────────────────
  const hasInferred = iv.fulfillment.some((f) => f.inferred);
  const canConfirm = !!onConfirm && hasInferred;

  // The per-line action column shows for a buyer with anything actionable — a
  // draft to release OR an inferred match to confirm. `pending` is keyed by a
  // string so release/confirm/horizon never collide.
  const showActions = (!!onRelease && draftDates.length > 0) || canConfirm;
  const [horizon, setHorizon] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  // Effective horizon: the chosen date, or the earliest draft date (release the
  // next period). A stale pick (its lines already released) falls back to the
  // earliest remaining — no effect needed.
  const effectiveHorizon = draftDates.includes(horizon) ? horizon : draftDates[0] ?? '';

  const doRelease = async (selection: ReleaseSelection, key: string) => {
    if (!onRelease) return;
    setPending(key);
    try {
      await onRelease(agreementId, item.lineSeq, selection);
    } finally {
      setPending(null);
    }
  };

  const doConfirm = async (releaseSeq: number) => {
    if (!onConfirm) return;
    setPending(`conf-${releaseSeq}`);
    try {
      await onConfirm(agreementId, item.lineSeq, releaseSeq);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Data className="text-sm font-semibold">{item.materialCode}</Data>
          <span className="text-xs text-text-tertiary">
            {t(`delivery.item.releaseType.${item.releaseType}`)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Policy MODE is always visible (honesty guard 3). Case C reads
              "reference envelope, not enforced", never a governed total. */}
          {ledger.enforced ? (
            <StatusPill variant="info">
              {/* CP-0 · W1 · 2f-d — was `Math.round(pct * 100)`, which rendered a
                  2,5% tolerance as "3%": the chip stated a governed threshold
                  that was not the governed threshold. Pre-existing, but 2f-d is
                  what made a fractional tolerance enterable in the DEFAULT
                  locale, so shipping the parse fix without this would have made
                  the batch's own capability gain produce a wrong number on
                  screen. Same float-tidy as `seedTolerancePct` — 4 dp, then
                  trimmed — so 0,07 reads "7%", not "7.000000000000001%". */}
              {t('delivery.policy.governed', {
                pct: formatPct(ledger.activePolicy.tolerancePct ?? 0),
              })}
            </StatusPill>
          ) : (
            <StatusPill variant="neutral">{t('delivery.policy.reference')}</StatusPill>
          )}
          {showPolicyHistory && ledger.policyDeviation && (
            <span className="text-[10px] italic text-warning-hover">
              {t('delivery.policy.deviation')}
            </span>
          )}
          {/* Edit tolerance (the THIRD write) — buyer-only, contract DA tab only. */}
          {canEdit && (
            <Button
              variant="outline"
              icon={SlidersHorizontal}
              className="px-3 py-1 text-xs"
              onClick={() => setEditing((v) => !v)}
            >
              {t('delivery.policy.edit.action')}
            </Button>
          )}
        </div>
      </div>

      {/* The deviation detail — active vs the IMMUTABLE contract default, with the
          when/why stamp (who deferred to the dispatcher). Always attributable.
          Buyer-only: the contract-default, edit date, and reason are buyer-internal
          governance history — the supplier mirror passes showPolicyHistory=false. */}
      {showPolicyHistory && ledger.policyDeviation && (
        <div className="mb-4 text-[11px] text-text-tertiary">
          {t('delivery.policy.deviation.detail', {
            def: formatPolicy(t, policy.contractDefault),
            date: policy.activeChangedAt ? formatDate(policy.activeChangedAt) : '—',
            reason: policy.activeChangeReason ?? '—',
          })}
        </div>
      )}

      {/* The inline editor (buyer-only) — presets + custom two-knob + required
          reason + reset-to-default. Portal-only + SIMULATED (the banner says so). */}
      {canEdit && editing && (
        <PolicyEditor
          active={ledger.activePolicy}
          contractDefault={policy.contractDefault}
          deviation={ledger.policyDeviation}
          pending={savingPolicy}
          onSave={doEditPolicy}
          onReset={doResetPolicy}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard eyebrow={t('delivery.kpi.agreed')} value={`${formatNumber(ledger.agreedTotalQty)} ${uom}`} />
        <KpiCard eyebrow={t('delivery.kpi.released')} value={`${formatNumber(ledger.releasedQty)} ${uom}`} />
        <KpiCard eyebrow={t('delivery.kpi.delivered')} value={`${formatNumber(ledger.deliveredQty)} ${uom}`} />
        <KpiCard eyebrow={t('delivery.kpi.remaining')} value={`${formatNumber(ledger.remainingQty)} ${uom}`} />
      </div>

      <div className="mb-5">
        <TargetBar pct={drawdownPct} />
        <div className="text-[10px] text-text-tertiary mt-1">
          {t('delivery.drawdown.label', { pct: Math.round(drawdownPct) })}
        </div>
      </div>

      {/* Release toolbar (buyer-only, draft lines remaining) — the FRC/JIT
          "release the next N periods" motion. Solid primary = the reserved
          consequential-commit signal (DP2-BUTTON-01): a release transmits to the
          vendor. Portal-only + SIMULATED — the honesty banner above says so. */}
      {canRelease && (
        <div className="flex flex-wrap items-center gap-2 mb-5 rounded-lg border border-border-subtle bg-bg-hover px-4 py-3">
          <span className="text-label text-text-tertiary uppercase">
            {t('delivery.release.section')}
          </span>
          <label className="sr-only" htmlFor={`horizon-${agreementId}-${item.lineSeq}`}>
            {t('delivery.release.horizonLabel')}
          </label>
          <select
            id={`horizon-${agreementId}-${item.lineSeq}`}
            value={effectiveHorizon}
            onChange={(e) => setHorizon(e.target.value)}
            className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5 text-sm text-text-primary"
          >
            {draftDates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            icon={Send}
            disabled={pending !== null || !effectiveHorizon}
            onClick={() => doRelease({ horizonDate: effectiveHorizon }, 'horizon')}
          >
            {pending === 'horizon'
              ? t('delivery.release.releasing')
              : t('delivery.release.through', { date: formatDate(effectiveHorizon) })}
          </Button>
        </div>
      )}

      {/* The calendar is the shared read-only ReleaseCalendar; the per-line action
          column rides `renderLineAction` (buyer-only): Release on a draft line
          (the FIRST write), Confirm on an inferred released line (the SECOND).
          Both are OUTLINE — release keeps the ONE solid primary (the toolbar
          above), DP2-BUTTON-01. The roll-up SidePanel renders the SAME calendar
          without the slot → read-only. */}
      <ReleaseCalendar
        iv={iv}
        proposedCaptionKey={proposedCaptionKey}
        actionsHeader={showActions ? t('delivery.action.col') : undefined}
        renderLineAction={
          showActions
            ? (line, fv) => {
                // Draft line → the Release action (buyer with a draft to transmit).
                if (line.state === 'draft') {
                  return onRelease ? (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      disabled={pending !== null}
                      onClick={() =>
                        doRelease({ releaseSeqs: [line.releaseSeq] }, `rel-${line.releaseSeq}`)
                      }
                    >
                      {pending === `rel-${line.releaseSeq}`
                        ? t('delivery.release.releasing')
                        : t('delivery.release.line')}
                    </Button>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  );
                }
                // Released + INFERRED → the Confirm-match action (accept the
                // proximity proposal as a confirmed delivery). A confirmed
                // (inferred:false) or unmatched line shows no action.
                if (fv?.inferred && onConfirm) {
                  return (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      disabled={pending !== null}
                      onClick={() => doConfirm(line.releaseSeq)}
                    >
                      {pending === `conf-${line.releaseSeq}`
                        ? t('delivery.confirm.confirming')
                        : t('delivery.confirm.action')}
                    </Button>
                  );
                }
                return <span className="text-text-tertiary">—</span>;
              }
            : undefined
        }
      />
    </div>
  );
};

export default AgreementCard;
