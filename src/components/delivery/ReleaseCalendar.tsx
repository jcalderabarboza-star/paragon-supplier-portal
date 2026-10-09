// ─────────────────────────────────────────────────────────────────────────────
// ReleaseCalendar — the shared release-calendar table (one item's schedule lines).
//
// Extracted from AgreementDrawdown so the SAME render serves BOTH the in-contract
// Delivery Agreements tab (with an optional per-line Release action column, buyer-
// only) AND the cross-contract roll-up's SidePanel quick-look (READ-ONLY, no
// actions). One source of truth for the calendar → no duplicated markup.
//
// Pure presentation off the already-derived DeliveryItemView. Every honesty marker
// rides the view exactly as before: the released-line PORTAL note (transmitted in
// the portal, not posted to SAP), the inferred "proposed" caption (a proposal,
// never authoritative), the qty variance, and the eta-proxy footnote.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../ui-v2/StatusPill';
import Data from '../ui-v2/Data';
import DataTable, { type Column } from '../ui-v2/DataTable';
import { formatNumber, formatDate } from '../../lib/format';
import type {
  DeliveryItemView,
  ReleaseFulfillment,
  ReleaseFulfillmentView,
  ScheduleLine,
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

/** The release calendar for ONE item. `renderLineAction` (buyer-only, contract
 *  tab) adds a trailing action column; omitted ⇒ a read-only calendar (the
 *  roll-up SidePanel). It receives the line AND its derived fulfillment view (so
 *  the caller can gate Release on a draft line vs Confirm on an inferred released
 *  line). `proposedCaptionKey` glosses the inferred-match caption for the audience
 *  — the buyer default ("matched by proximity") vs the supplier mirror's
 *  ("awaiting Paragon confirmation"); the guarantee is identical either way (an
 *  inferred match is never authoritative). */
const ReleaseCalendar: React.FC<{
  iv: DeliveryItemView;
  actionsHeader?: string;
  renderLineAction?: (line: ScheduleLine, fv?: ReleaseFulfillmentView) => React.ReactNode;
  proposedCaptionKey?: string;
}> = ({
  iv,
  actionsHeader,
  renderLineAction,
  // i18n-defer: an i18n KEY, not copy — it is the argument to `t()` below, so
  // translating it would look up a key named after a translation.
  proposedCaptionKey = 'delivery.match.proposed',
}) => {
  const { t } = useTranslation();
  const { item } = iv;
  const uom = item.uom;

  // Fulfillment keyed by releaseSeq — overlaid on the released calendar rows.
  const fulfillmentBySeq = new Map<number, ReleaseFulfillmentView>(
    iv.fulfillment.map((f) => [f.releaseSeq, f]),
  );

  const columns: Column<ScheduleLine>[] = [
    {
      id: 'seq',
      header: t('delivery.calendar.seq'),
      kind: 'id',
      cell: (line) => <Data>{line.releaseSeq}</Data>,
    },
    {
      id: 'date',
      header: t('delivery.calendar.date'),
      kind: 'date',
      cell: (line) => <Data>{formatDate(line.releaseDate)}</Data>,
    },
    {
      id: 'planned',
      header: t('delivery.calendar.planned'),
      kind: 'number',
      cell: (line) => (
        <Data>
          {formatNumber(line.plannedQty)} {uom}
        </Data>
      ),
    },
    {
      id: 'state',
      header: t('delivery.calendar.state'),
      kind: 'status',
      cell: (line) => (
        <>
          <StatusPill variant={line.state === 'released' ? 'info' : 'neutral'}>
            {t(`delivery.state.${line.state}`)}
          </StatusPill>
          {/* Honesty (first write): a released line is transmitted in
              the PORTAL, not posted to SAP. sapReleaseNumber stays
              absent until Pattern-B binds it — never claim a SAP release. */}
          {line.state === 'released' && (
            <div className="text-[10px] italic text-text-tertiary mt-0.5">
              {t('delivery.release.portalNote')}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'fulfillment',
      header: t('delivery.calendar.fulfillment'),
      kind: 'status',
      cell: (line) => {
        const fv = fulfillmentBySeq.get(line.releaseSeq);
        return fv ? (
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
                {t(proposedCaptionKey)}
              </div>
            )}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        );
      },
    },
    {
      id: 'drawdown',
      header: t('delivery.calendar.drawdownCol'),
      kind: 'number',
      cell: (line) => {
        const fv = fulfillmentBySeq.get(line.releaseSeq);
        return fv?.actualQty !== undefined ? (
          <div>
            <Data>
              {formatNumber(fv.actualQty)} {uom}
            </Data>
            {fv.qtyVariance !== undefined && fv.qtyVariance !== 0 && (
              <div
                className={`text-[10px] mt-0.5 ${
                  fv.qtyVariance < 0 ? 'text-critical' : 'text-warning-hover'
                }`}
              >
                {signedQty(fv.qtyVariance)} {uom}{' '}
                {t('delivery.calendar.varianceSuffix')}
              </div>
            )}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        );
      },
    },
  ];
  if (renderLineAction) {
    columns.push({
      id: 'actions',
      header: actionsHeader,
      kind: 'actions',
      cell: (line) => renderLineAction(line, fulfillmentBySeq.get(line.releaseSeq)),
    });
  }

  return (
    <>
      <div className="text-label text-text-tertiary uppercase mb-2">
        {t('delivery.calendar.title')}
      </div>
      <DataTable
        columns={columns}
        rows={item.scheduleLines}
        rowKey={(line) => String(line.releaseSeq)}
      />

      {/* eta-proxy known-limitation — recorded, not papered over. */}
      <div className="text-[10px] text-text-tertiary mt-2 italic">
        {t('delivery.calendar.etaFootnote')}
      </div>
    </>
  );
};

export default ReleaseCalendar;
