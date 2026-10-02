// ────────────────────────────────────────────────────────────────────────────
// B3 · PlannedChangesPanel — the overlay stated in plain DOM, above the grid.
//
// The banner says how many changes are PLANNED and that none of them is
// committed until pushed, and that a reload drops them — before it happens.
// Each change is a row here with its own remove control, its own reason field
// (shown only where the planner left the producer's baseline) and its own
// refusal; push acts on one row, on the grid selection, or on all.
//
// Plain DOM on purpose, the G1.2b fork ruling: the reason gate and both failure
// channels must be provable headless, and the virtualised grid lays out no
// rows under jsdom.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useVerbAvailabilities } from '../../hooks/useVerbAvailability';
import { useRefusalText } from '../../hooks/useRefusalText';
import { formatNumber } from '../../lib/format';
import { planningSupplierName } from '../../services/planning/somoFixture';
import { usePlanDraft } from './PlanDraftProvider';
import { INTAKE_TRIAGE_ATOM } from '../../services/transitions/flows/intakeLine.flow';
import { blockedBy, magnitudeFlag, reasonOwed, type CellRefusal, type CellRefusalReason, type PlanDraftEntry } from './planDraft';

/** EXHAUSTIVE: every reason a cell edit can be refused has its own words. */
export const CELL_REFUSAL_KEY: Record<CellRefusalReason, string> = {
  EMPTY_QTY: 'planGrid.edit.refused.EMPTY_QTY',
  NOT_NUMERIC: 'planGrid.edit.refused.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'planGrid.edit.refused.AMBIGUOUS_QTY',
  READ_ONLY: 'planGrid.edit.refused.READ_ONLY',
  NO_SEAM_ROW: 'planGrid.edit.refused.NO_SEAM_ROW',
  NO_OPEN_DRAFT: 'planGrid.edit.refused.NO_OPEN_DRAFT',
  OVER_TOTAL: 'planGrid.edit.refused.OVER_TOTAL',
  COMMITTED: 'planGrid.edit.refused.COMMITTED',
};

/** The words for one refused cell — the ONE place both render sites read them. */
export function cellRefusalText(t: (key: string, opts?: Record<string, unknown>) => string, r: CellRefusal): string {
  return t(CELL_REFUSAL_KEY[r.reason], {
    source: r.source ? t(`planGrid.edit.owner.${r.source}`) : '',
    sum: r.sum === undefined ? '' : formatNumber(r.sum),
    total: r.total === undefined ? '' : formatNumber(r.total),
  });
}

// PLN-2 · names from the planning supplier master, one resolver for every planning surface.
const supplierName = planningSupplierName;

/** The push-side reasons this surface owns (the spine's own are `useRefusalText`'s). */
const PUSH_REASON_KEY: Readonly<Record<string, string>> = {
  REASON_REQUIRED: 'planGrid.edit.push.reasonRequired',
  SEAM_DISAGREES: 'planGrid.edit.push.seamDisagrees',
  NOT_ROUTABLE: 'planGrid.edit.push.notRoutable',
  MAGNITUDE_UNCONFIRMED: 'planGrid.edit.push.magnitudeUnconfirmed',
};

/**
 * PLN-1 · an intake line that is no longer `Pending` refuses a commit as
 * `ILLEGAL_TRANSITION:<from>->Committed`, and the spine's own sentence for that
 * ends in the developer trail — the planner read "(Committed->Committed)"
 * (R-PLN, measured). Keyed on the refusal HEAD and the FROM-state, rendered in
 * this surface's own words; any other head falls through to the spine's text.
 */
const LINE_STATE_KEY: Readonly<Record<string, string>> = {
  Committed: 'planGrid.edit.push.alreadyCommitted',
  Dismissed: 'planGrid.edit.push.lineDismissed',
};
/**
 * PLN-2 · a commit refused because the material and period are already
 * committed at the other grain — read off the refusal so the planner is told
 * which periods, in the surface's own words rather than the developer trail.
 */
export const oneGrainClash = (reason: string): { material: string; period: string; committed: string } | null => {
  const m = /INTAKE_ONE_GRAIN: (\S+) (\S+) overlaps (\S+),/.exec(reason);
  return m ? { material: m[1], period: m[2], committed: m[3] } : null;
};

export const pushReasonKey = (reason: string): string | undefined => {
  if (PUSH_REASON_KEY[reason]) return PUSH_REASON_KEY[reason];
  const m = /^ILLEGAL_TRANSITION:(\w+)->/.exec(reason);
  return m ? LINE_STATE_KEY[m[1]] : undefined;
};

const PlannedChangesPanel: React.FC<{ selectedRefs: readonly string[] }> = ({ selectedRefs }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const api = usePlanDraft();
  // `t_intake_commit` is `intake:triage` (planning, since PLN-3); B4b's
  // allocation push is `publication:allocate` (planning). Each row is pushable by the seat
  // that holds ITS verb's atom, and a seat without one reads whose act it is —
  // the MODE is gated, not one door (§ENTRANCE).
  const availability = useVerbAvailabilities({ intake: INTAKE_TRIAGE_ATOM, allocate: 'publication:allocate' });
  if (!api) return null;
  const { draft, pushing } = api;
  const entries = [...draft.entries.values()];
  const refusals = [...draft.refusals.entries()];
  if (entries.length === 0 && refusals.length === 0) return null;

  const verbOf = (e: PlanDraftEntry) => (e.measureId === 'allocation' ? 'allocate' : 'intake');
  const canPush = (e: PlanDraftEntry) => availability[verbOf(e)].kind === 'held';
  const withheld = (['intake', 'allocate'] as const).filter(
    (v) => availability[v].kind !== 'held' && entries.some((e) => verbOf(e) === v),
  );
  const plannedRefs = entries.filter((e) => e.planState === 'PLANNED' && canPush(e)).map((e) => e.seamRef);
  const selected = selectedRefs.filter((r) => {
    const e = draft.entries.get(r);
    return e?.planState === 'PLANNED' && canPush(e);
  });
  const pushReason = (reason: string) => {
    const clash = oneGrainClash(reason);
    if (clash) return t('planGrid.edit.push.oneGrain', clash);
    const key = pushReasonKey(reason);
    return key ? t(key) : (refusalText(reason) ?? t('planGrid.push.failed', { reason }));
  };

  return (
    <div className="mb-3 rounded-lg border border-info/30 bg-info-soft" data-testid="plan-draft-panel">
      {/* The banner speaks for PLANNED changes only: with nothing planned and a
          refusal still showing, "0 planned changes" would be a banner about
          nothing. */}
      {entries.length > 0 && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-info/20 px-4 py-2.5">
        <div>
          <div className="text-sm font-semibold text-text-primary" data-testid="plan-draft-banner">
            {t('planGrid.edit.banner', { count: entries.length, n: formatNumber(entries.length) })}
          </div>
          <div className="text-xs text-text-secondary">{t('planGrid.edit.reloadDrops')}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        {withheld.map((v) => (
          <HandoffNotice
            key={v}
            availability={availability[v]}
            testId={v === 'intake' ? 'handoff-plangrid-grid-push' : 'handoff-plangrid-allocate-push'}
          />
        ))}
        {entries.some(canPush) && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={pushing || selected.length === 0}
              onClick={() => void api.push(selected)}
              data-testid="plan-push-selection"
            >
              {t('planGrid.edit.push.selection', { n: formatNumber(selected.length) })}
            </Button>
            <Button
              variant="outline"
              disabled={pushing || plannedRefs.length === 0}
              onClick={() => void api.push(plannedRefs)}
              data-testid="plan-push-all"
            >
              {pushing ? t('planGrid.push.pushing') : t('planGrid.edit.push.all', { n: formatNumber(plannedRefs.length) })}
            </Button>
          </div>
        )}
        </div>
      </div>
      )}

      {entries.length > 0 && (
        <table className="w-full text-xs" data-testid="plan-draft-rows">
          <thead className="text-left text-text-tertiary">
            <tr>
              <th className="px-4 py-1.5 font-medium">{t('planGrid.edit.col.cell')}</th>
              <th className="px-2 py-1.5 text-right font-medium">{t('planGrid.edit.col.baseline')}</th>
              <th className="px-2 py-1.5 text-right font-medium">{t('planGrid.edit.col.planned')}</th>
              <th className="px-2 py-1.5 font-medium">{t('planGrid.edit.col.reason')}</th>
              <th className="px-4 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const owed = reasonOwed(e);
              return (
                <tr key={e.seamRef} className="border-t border-info/15 align-top" data-testid={`plan-draft-row-${e.seamRef}`}>
                  <td className="px-4 py-1.5">
                    <Data>{e.materialCode}</Data> · <Data>{e.bucket}</Data>
                    {e.supplierId && <span className="text-text-secondary"> · {supplierName(e.supplierId)}</span>}
                    <span className="ml-2 inline-flex gap-1">
                      <span className="rounded-sm border border-info/30 bg-bg-surface px-1 text-[10px] font-semibold uppercase text-info">
                        {t(e.planState === 'PUSHING' ? 'planGrid.edit.state.pushing' : 'planGrid.plan.planned')}
                      </span>
                      {e.origin === 'PASTE' && (
                        <span
                          className="rounded-sm border border-warning/40 bg-warning-soft px-1 text-[10px] font-semibold uppercase text-warning-hover"
                          title={t('planGrid.edit.externalTitle')}
                        >
                          {t('planGrid.edit.external')}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Data>{e.baseline === null ? '—' : formatNumber(e.baseline)}</Data>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {/* R2 · THE READING: what was typed or pasted, and what it
                        was read as under the seat's convention — "12.000" = 12 KG
                        is a slip the planner can see before it is a requisition. */}
                    <span data-testid={`plan-draft-reading-${e.seamRef}`}>
                      <Data>{t('planGrid.edit.reading', { raw: e.raw, value: formatNumber(e.value), uom: e.uom })}</Data>
                    </span>
                    {magnitudeFlag(e) && e.baseline !== null && (
                      <div
                        className="mt-1 flex flex-col items-end gap-0.5 text-left text-[11px] text-warning-hover"
                        data-testid={`plan-draft-magnitude-${e.seamRef}`}
                      >
                        <span role="alert">
                          {t(e.value > e.baseline ? 'planGrid.edit.magnitude.high' : 'planGrid.edit.magnitude.low', {
                            baseline: formatNumber(e.baseline),
                          })}
                        </span>
                        <label className="flex items-center gap-1 text-text-primary">
                          <input
                            type="checkbox"
                            data-testid={`plan-draft-confirm-${e.seamRef}`}
                            checked={e.magnitudeConfirmed === true}
                            disabled={e.planState === 'PUSHING'}
                            onChange={(ev) => api.confirmMagnitude(e.seamRef, ev.target.checked)}
                          />
                          {t('planGrid.edit.magnitudeConfirm', { value: formatNumber(e.value), uom: e.uom })}
                        </label>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {owed ? (
                      <>
                        <input
                          type="text"
                          aria-label={t('planGrid.edit.reasonFor', { cell: `${e.materialCode} ${e.bucket}` })}
                          placeholder={t('planGrid.push.reasonPlaceholder')}
                          className="w-56 rounded-md border border-border-input bg-white px-2 py-0.5 text-xs"
                          value={e.reason}
                          disabled={e.planState === 'PUSHING'}
                          onChange={(ev) => api.setReason(e.seamRef, ev.target.value)}
                        />
                        {blockedBy(e) === 'REASON_REQUIRED' && (
                          <div className="mt-0.5 text-[11px] text-warning-hover">{t('planGrid.push.reasonRequired')}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-text-tertiary">{t('planGrid.edit.noReasonOwed')}</span>
                    )}
                    {e.failureReason && (
                      <div className="mt-0.5 text-[11px] text-danger" role="alert" data-testid={`plan-draft-failure-${e.seamRef}`}>
                        {pushReason(e.failureReason)}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-1.5 text-right">
                    {canPush(e) && (
                      <button
                        type="button"
                        className="mr-3 text-action hover:underline disabled:text-text-tertiary disabled:no-underline"
                        disabled={pushing || e.planState !== 'PLANNED'}
                        onClick={() => void api.push([e.seamRef])}
                        data-testid={`plan-push-row-${e.seamRef}`}
                      >
                        {t('planGrid.edit.push.row')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-text-secondary hover:underline disabled:text-text-tertiary"
                      disabled={e.planState === 'PUSHING'}
                      onClick={() => api.remove(e.seamRef)}
                      data-testid={`plan-remove-${e.seamRef}`}
                    >
                      {t('planGrid.edit.remove')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {refusals.length > 0 && (
        <ul className="border-t border-info/20 px-4 py-2 text-xs" data-testid="plan-draft-refusals">
          {refusals.map(([key, r]) => (
            <li key={key} className="flex items-center justify-between gap-3 py-0.5" data-testid={`plan-refusal-${key}`}>
              <span className="text-danger">
                <Data>{r.rowId.split('|')[0]}</Data> · <Data>{r.bucket}</Data> · “{r.raw}” —{' '}
                {cellRefusalText(t, r)}
              </span>
              <button type="button" className="text-text-secondary hover:underline" onClick={() => api.dismissRefusal(key)}>
                {t('planGrid.edit.dismiss')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlannedChangesPanel;
