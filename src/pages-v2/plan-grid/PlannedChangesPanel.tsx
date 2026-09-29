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
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useRefusalText } from '../../hooks/useRefusalText';
import { formatNumber } from '../../lib/format';
import { usePlanDraft } from './PlanDraftProvider';
import { pushBlocked, reasonOwed, type CellRefusalReason } from './planDraft';

/** EXHAUSTIVE: every reason a cell edit can be refused has its own words. */
export const CELL_REFUSAL_KEY: Record<CellRefusalReason, string> = {
  EMPTY_QTY: 'planGrid.edit.refused.EMPTY_QTY',
  NOT_NUMERIC: 'planGrid.edit.refused.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'planGrid.edit.refused.AMBIGUOUS_QTY',
  READ_ONLY: 'planGrid.edit.refused.READ_ONLY',
  NO_SEAM_ROW: 'planGrid.edit.refused.NO_SEAM_ROW',
};

/** The push-side reasons this surface owns (the spine's own are `useRefusalText`'s). */
const PUSH_REASON_KEY: Readonly<Record<string, string>> = {
  REASON_REQUIRED: 'planGrid.edit.push.reasonRequired',
  SEAM_DISAGREES: 'planGrid.edit.push.seamDisagrees',
};

const PlannedChangesPanel: React.FC<{ selectedRefs: readonly string[] }> = ({ selectedRefs }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const api = usePlanDraft();
  // `t_intake_commit` is `pr:create` (the requisitioner lane). A seat without it
  // reads whose act the push is — the MODE is gated, not one door (§ENTRANCE).
  const availability = useVerbAvailability('pr:create');
  if (!api) return null;
  const { draft, pushing } = api;
  const entries = [...draft.entries.values()];
  const refusals = [...draft.refusals.entries()];
  if (entries.length === 0 && refusals.length === 0) return null;

  const plannedRefs = entries.filter((e) => e.planState === 'PLANNED').map((e) => e.seamRef);
  const selected = selectedRefs.filter((r) => draft.entries.get(r)?.planState === 'PLANNED');
  const pushReason = (reason: string) =>
    PUSH_REASON_KEY[reason] ? t(PUSH_REASON_KEY[reason]) : (refusalText(reason) ?? t('planGrid.push.failed', { reason }));

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
        {availability.kind === 'held' ? (
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
        ) : (
          <HandoffNotice availability={availability} testId="handoff-plangrid-grid-push" />
        )}
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
                    <Data>{formatNumber(e.value)}</Data> <span className="text-text-tertiary">{e.uom}</span>
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
                        {pushBlocked(e) && (
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
                    {availability.kind === 'held' && (
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
                {t(CELL_REFUSAL_KEY[r.reason], { source: r.source ? t(`planGrid.edit.owner.${r.source}`) : '' })}
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
