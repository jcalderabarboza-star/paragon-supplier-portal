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
import { PackageCheck, Send } from 'lucide-react';
import StatusPill from '../ui-v2/StatusPill';
import KpiCard from '../ui-v2/KpiCard';
import TargetBar from '../ui-v2/TargetBar';
import Data from '../ui-v2/Data';
import Button from '../ui-v2/Button';
import ReleaseCalendar from './ReleaseCalendar';
import { formatNumber, formatDate } from '../../lib/format';
import type {
  DeliveryAgreementView,
  DeliveryItemView,
  ReleaseSelection,
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

// ─── One agreement (header + per-item drawdown) ───────────────────────────────

/** Render one agreement's drawdown. `linkContract` turns the contract ref into a
 *  deep-link to `/buyer/contracts/:contractId` (the roll-up wants it; the nested
 *  DA tab is already on that contract, so it leaves it plain text). */
const AgreementCard: React.FC<{
  view: DeliveryAgreementView;
  linkContract?: boolean;
  onRelease?: OnRelease;
}> = ({ view, linkContract = false, onRelease }) => {
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
}> = ({ iv, agreementId, onRelease }) => {
  const { t } = useTranslation();
  const { item, ledger } = iv;
  const uom = item.uom;

  const drawdownPct =
    ledger.agreedTotalQty > 0 ? (ledger.releasedQty / ledger.agreedTotalQty) * 100 : 0;

  // ── Release (the FIRST write) — buyer-only, over DRAFT lines ────────────────
  // `onRelease` present ⇒ the viewer is a buyer; the horizon control + the
  // per-line action column render only for an item that still has draft lines.
  const draftDates = item.scheduleLines
    .filter((l) => l.state === 'draft')
    .map((l) => l.releaseDate);
  const canRelease = !!onRelease && draftDates.length > 0;
  const [horizon, setHorizon] = useState('');
  const [pending, setPending] = useState<'horizon' | number | null>(null);
  // Effective horizon: the chosen date, or the earliest draft date (release the
  // next period). A stale pick (its lines already released) falls back to the
  // earliest remaining — no effect needed.
  const effectiveHorizon = draftDates.includes(horizon) ? horizon : draftDates[0] ?? '';

  const doRelease = async (selection: ReleaseSelection, key: 'horizon' | number) => {
    if (!onRelease) return;
    setPending(key);
    try {
      await onRelease(agreementId, item.lineSeq, selection);
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
              {t('delivery.policy.governed', {
                pct: Math.round((ledger.activePolicy.tolerancePct ?? 0) * 100),
              })}
            </StatusPill>
          ) : (
            <StatusPill variant="neutral">{t('delivery.policy.reference')}</StatusPill>
          )}
          {ledger.policyDeviation && (
            <span className="text-[10px] italic text-warning-hover">
              {t('delivery.policy.deviation')}
            </span>
          )}
        </div>
      </div>

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
            variant="primary"
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

      {/* The calendar is the shared read-only ReleaseCalendar; the per-line
          Release action column rides `renderLineAction` (buyer-only). The
          roll-up SidePanel renders the SAME calendar without it. */}
      <ReleaseCalendar
        iv={iv}
        actionsHeader={canRelease ? t('delivery.release.actionsCol') : undefined}
        renderLineAction={
          canRelease
            ? (line) =>
                line.state === 'draft' ? (
                  <Button
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={pending !== null}
                    onClick={() =>
                      doRelease({ releaseSeqs: [line.releaseSeq] }, line.releaseSeq)
                    }
                  >
                    {pending === line.releaseSeq
                      ? t('delivery.release.releasing')
                      : t('delivery.release.line')}
                  </Button>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )
            : undefined
        }
      />
    </div>
  );
};

export default AgreementCard;
