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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PackageCheck } from 'lucide-react';
import StatusPill from '../ui-v2/StatusPill';
import KpiCard from '../ui-v2/KpiCard';
import TargetBar from '../ui-v2/TargetBar';
import Data from '../ui-v2/Data';
import Table from '../ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../ui-v2/TableHeader';
import TableRow from '../ui-v2/TableRow';
import TableCell from '../ui-v2/TableCell';
import { formatNumber, formatDate } from '../../lib/format';
import type {
  DeliveryAgreementView,
  DeliveryItemView,
  ReleaseFulfillment,
  ReleaseFulfillmentView,
} from '../../services/delivery';

// Fulfillment → the quiet outlined StatusPill tone (DP-2 semantic, soft variants):
// fulfilled = delivered on time, late = delivered but after, missed = a real gap,
// pending = the honest default before the date arrives.
const FULFILLMENT_VARIANT: Record<
  ReleaseFulfillment,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  fulfilled: 'success',
  late: 'warning',
  missed: 'danger',
  pending: 'neutral',
};

/** Signed quantity for the variance caption — U+2212 minus, thousands-grouped. */
const signedQty = (n: number): string => {
  const abs = formatNumber(Math.abs(n));
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs;
};

// ─── One agreement (header + per-item drawdown) ───────────────────────────────

/** Render one agreement's drawdown. `linkContract` turns the contract ref into a
 *  deep-link to `/buyer/contracts/:contractId` (the roll-up wants it; the nested
 *  DA tab is already on that contract, so it leaves it plain text). */
const AgreementCard: React.FC<{
  view: DeliveryAgreementView;
  linkContract?: boolean;
}> = ({ view, linkContract = false }) => {
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
          <ItemBlock key={iv.item.lineSeq} iv={iv} />
        ))}
      </div>
    </section>
  );
};

// ─── One item (policy · KPIs · drawdown bar · release calendar) ───────────────

const ItemBlock: React.FC<{ iv: DeliveryItemView }> = ({ iv }) => {
  const { t } = useTranslation();
  const { item, ledger } = iv;
  const uom = item.uom;

  // Fulfillment keyed by releaseSeq — overlaid on the released calendar rows.
  const fulfillmentBySeq = new Map<number, ReleaseFulfillmentView>(
    iv.fulfillment.map((f) => [f.releaseSeq, f]),
  );

  const drawdownPct =
    ledger.agreedTotalQty > 0 ? (ledger.releasedQty / ledger.agreedTotalQty) * 100 : 0;

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

      <div className="text-label text-text-tertiary uppercase mb-2">
        {t('delivery.calendar.title')}
      </div>
      <div className="border border-border-subtle rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('delivery.calendar.seq')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.date')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.planned')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.state')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.fulfillment')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.drawdownCol')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {item.scheduleLines.map((line) => {
              const fv = fulfillmentBySeq.get(line.releaseSeq);
              return (
                <TableRow key={line.releaseSeq}>
                  <TableCell>
                    <Data className="text-xs">{line.releaseSeq}</Data>
                  </TableCell>
                  <TableCell>
                    <Data className="text-sm">{formatDate(line.releaseDate)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data className="text-sm">
                      {formatNumber(line.plannedQty)} {uom}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={line.state === 'released' ? 'info' : 'neutral'}>
                      {t(`delivery.state.${line.state}`)}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    {fv ? (
                      <div>
                        <StatusPill variant={FULFILLMENT_VARIANT[fv.fulfillment]}>
                          {t(`delivery.fulfillment.${fv.fulfillment}`)}
                        </StatusPill>
                        {fv.matchedRef && (
                          <Data as="div" className="text-[10px] text-text-tertiary mt-0.5">
                            {fv.matchedRef}
                          </Data>
                        )}
                        {/* The inferred flag MUST be visible — a proposal, never
                            authoritative (mirrors derivedFromAsn). Confirmed
                            (explicit-binding) matches carry no such caption. */}
                        {fv.inferred && (
                          <div className="text-[10px] italic text-text-tertiary">
                            {t('delivery.match.proposed')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fv?.actualQty !== undefined ? (
                      <div>
                        <Data className="text-sm">
                          {formatNumber(fv.actualQty)} {uom}
                        </Data>
                        {fv.qtyVariance !== undefined && fv.qtyVariance !== 0 && (
                          <div
                            className={`text-[10px] mt-0.5 ${
                              fv.qtyVariance < 0 ? 'text-danger' : 'text-warning-hover'
                            }`}
                          >
                            {signedQty(fv.qtyVariance)} {uom} {t('delivery.calendar.varianceSuffix')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* eta-proxy known-limitation — recorded, not papered over. */}
      <div className="text-[10px] text-text-tertiary mt-2 italic">
        {t('delivery.calendar.etaFootnote')}
      </div>
    </div>
  );
};

export default AgreementCard;
