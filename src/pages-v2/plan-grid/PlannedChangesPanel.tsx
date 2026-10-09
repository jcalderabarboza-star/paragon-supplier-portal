// ────────────────────────────────────────────────────────────────────────────
// B3 · PlannedChangesPanel — the overlay stated in plain DOM.
//
// ⚠️ PLN-4 · IT NO LONGER SITS ABOVE THE GRID (R-PLN P1, ruling R3). Fifty
// planned rows made it 2,743 px tall, ABOVE the grid they came from (measured
// on built main), so the planner pushed a plan they could no longer see. It is
// two parts now, neither in the grid's vertical space:
//  · `PlannedChangesBar` — one compact line, STICKY at the foot of the view:
//    what is planned, how many still owe a reason, the push controls, the
//    progress of a push ("Pushing 23 of 50…") and its summary afterwards.
//  · `PlannedChangesDetails` — the rows, the bulk reason and the cell
//    refusals, BELOW the grid, collapsible from the bar.
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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import DataTable, { type Column } from '../../components/ui-v2/DataTable';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useVerbAvailabilities } from '../../hooks/useVerbAvailability';
import { useRefusalText } from '../../hooks/useRefusalText';
import { formatNumber } from '../../lib/format';
import { planningSupplierName } from '../../services/planning/somoFixture';
import { usePlanDraft, usePushStatus } from './PlanDraftProvider';
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

/** The words for one push refusal — the ONE place a row and the push summary read them. */
const usePushReasonText = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  return (reason: string) => {
    const clash = oneGrainClash(reason);
    if (clash) return t('planGrid.edit.push.oneGrain', clash);
    const key = pushReasonKey(reason);
    return key ? t(key) : (refusalText(reason) ?? t('planGrid.push.failed', { reason }));
  };
};

/**
 * Each row is pushable by the seat that holds ITS verb's atom: `t_intake_commit`
 * is `intake:triage` (planning, since PLN-3) and B4b's allocation push is
 * `publication:allocate` (planning). A seat without one reads whose act it is —
 * the MODE is gated, not one door (§ENTRANCE).
 */
const usePushAuthority = () => {
  const availability = useVerbAvailabilities({ intake: INTAKE_TRIAGE_ATOM, allocate: 'publication:allocate' });
  const verbOf = (e: PlanDraftEntry) => (e.measureId === 'allocation' ? 'allocate' : 'intake');
  const canPush = (e: PlanDraftEntry) => availability[verbOf(e)].kind === 'held';
  return { availability, verbOf, canPush };
};

/**
 * PLN-4 · THE BAR — one line at the foot of the view, sticky, so it is in sight
 * wherever the planner is in the grid and takes none of the grid's height.
 */
export const PlannedChangesBar: React.FC<{
  selectedRefs: readonly string[];
  open: boolean;
  onToggle: () => void;
}> = ({ selectedRefs, open, onToggle }) => {
  const { t } = useTranslation();
  const pushReason = usePushReasonText();
  const api = usePlanDraft();
  const status = usePushStatus();
  const { availability, verbOf, canPush } = usePushAuthority();
  if (!api) return null;
  const { draft, pushing } = api;
  const entries = [...draft.entries.values()];
  const refusals = draft.refusals.size;
  const last = status?.last ?? null;
  const progress = status?.progress ?? null;
  if (entries.length === 0 && refusals === 0 && !last) return null;

  const withheld = (['intake', 'allocate'] as const).filter(
    (v) => availability[v].kind !== 'held' && entries.some((e) => verbOf(e) === v),
  );
  const plannedRefs = entries.filter((e) => e.planState === 'PLANNED' && canPush(e)).map((e) => e.seamRef);
  const selected = selectedRefs.filter((r) => {
    const e = draft.entries.get(r);
    return e?.planState === 'PLANNED' && canPush(e);
  });
  const owed = entries.filter((e) => e.planState === 'PLANNED' && blockedBy(e) === 'REASON_REQUIRED').length;

  return (
    <div className="sticky bottom-0 z-20 mt-3 space-y-2 pb-2" data-testid="plan-draft-bar">
      {last && !progress && (
        <div
          className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-2 text-xs shadow-sm"
          data-testid="plan-push-result"
          role="status"
        >
          <div>
            <span className="font-semibold text-text-primary">
              {t('planGrid.edit.push.result', {
                committed: formatNumber(last.committed),
                refused: formatNumber(last.refused),
                total: formatNumber(last.total),
              })}
            </span>
            {last.reasons.length > 0 && (
              <ul className="mt-0.5 text-critical" data-testid="plan-push-result-reasons">
                {last.reasons.map(([reason, n]) => (
                  <li key={reason}>{t('planGrid.edit.push.resultReason', { n: formatNumber(n), reason: pushReason(reason) })}</li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" className="text-text-secondary hover:underline" onClick={status?.dismissLast}>
            {t('planGrid.edit.dismiss')}
          </button>
        </div>
      )}

      {(entries.length > 0 || refusals > 0) && (
        <div className="rounded-lg border border-info/30 bg-info-soft shadow-sm" data-testid="plan-draft-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              {/* The banner speaks for PLANNED changes only: with nothing planned
                  and a refusal still showing, "0 planned changes" would be a
                  banner about nothing. */}
              {entries.length > 0 ? (
                <span className="text-sm font-semibold text-text-primary" data-testid="plan-draft-banner">
                  {t('planGrid.edit.banner', { count: entries.length, n: formatNumber(entries.length) })}
                </span>
              ) : (
                <span className="text-sm text-critical" data-testid="plan-draft-refused-count">
                  {t('planGrid.edit.refusedEdits', { count: refusals, n: formatNumber(refusals) })}
                </span>
              )}
              {owed > 0 && (
                <span className="ml-2 text-xs font-semibold text-warning-hover" data-testid="plan-draft-owed">
                  {t('planGrid.edit.owed', { count: owed, n: formatNumber(owed) })}
                </span>
              )}
              {entries.length > 0 && <div className="text-xs text-text-secondary">{t('planGrid.edit.reloadDrops')}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {withheld.map((v) => (
                <HandoffNotice
                  key={v}
                  availability={availability[v]}
                  testId={v === 'intake' ? 'handoff-plangrid-grid-push' : 'handoff-plangrid-allocate-push'}
                />
              ))}
              <button
                type="button"
                className="text-sm text-action-text hover:underline"
                aria-expanded={open}
                onClick={onToggle}
                data-testid="plan-changes-toggle"
              >
                {open
                  ? t('planGrid.edit.toggle.hide')
                  : t('planGrid.edit.toggle.show', { n: formatNumber(entries.length + refusals) })}
              </button>
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
          {progress && (
            <div className="border-t border-info/20 px-4 py-1.5" data-testid="plan-push-progress" role="status" aria-live="polite">
              <div className="text-xs font-semibold text-info">
                {/* The row in flight, counted from one: "Pushing 1 of 50…" as the first goes. */}
                {t('planGrid.edit.push.progress', {
                  done: formatNumber(Math.min(progress.done + 1, progress.total)),
                  total: formatNumber(progress.total),
                })}
              </div>
              {/* No width transition: a row lands every few milliseconds, and a
                  150 ms transition restarted on each one left the bar at 2% while
                  the line read "Pushing 32 of 50…" (browser QA, PLN-4). */}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-info/15">
                <div
                  className="h-full rounded-full bg-info"
                  style={{ width: `${progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * PLN-4 · THE DETAILS — every planned change with its reading, its reason and
 * its own push and remove, plus the cell refusals; below the grid, collapsible.
 *
 * Plain DOM on purpose, the G1.2b fork ruling: the reason gate and both failure
 * channels must be provable headless, and the virtualised grid lays out no
 * rows under jsdom.
 */
export const PlannedChangesDetails: React.FC<{ open: boolean }> = ({ open }) => {
  const { t } = useTranslation();
  const pushReason = usePushReasonText();
  const api = usePlanDraft();
  const { canPush } = usePushAuthority();
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [bulkReason, setBulkReason] = useState('');
  const [bulkNote, setBulkNote] = useState<number | null>(null);
  if (!api || !open) return null;
  const { draft, pushing } = api;
  const entries = [...draft.entries.values()];
  const refusals = [...draft.refusals.entries()];
  if (entries.length === 0 && refusals.length === 0) return null;

  // Only a PLANNED row that owes a reason can take one — the rest never enter the selection.
  const owedRefs = entries.filter((e) => e.planState === 'PLANNED' && reasonOwed(e)).map((e) => e.seamRef);
  const chosen = owedRefs.filter((r) => picked.has(r));
  const allOwedPicked = owedRefs.length > 0 && chosen.length === owedRefs.length;
  const toggle = (ref: string, on: boolean) => {
    setBulkNote(null);
    setPicked((p) => {
      const next = new Set(p);
      if (on) next.add(ref);
      else next.delete(ref);
      return next;
    });
  };

  const columns: Column<PlanDraftEntry>[] = [
    {
      id: 'select',
      header: <span className="sr-only">{t('planGrid.edit.col.select')}</span>,
      kind: 'text',
      className: 'w-8',
      headerClassName: 'w-8',
      cell: (e) =>
        reasonOwed(e) && e.planState === 'PLANNED' ? (
          <input
            type="checkbox"
            data-testid={`plan-select-${e.seamRef}`}
            aria-label={t('planGrid.edit.bulk.selectRow', { cell: `${e.materialCode} ${e.bucket}` })}
            checked={picked.has(e.seamRef)}
            disabled={pushing}
            onChange={(ev) => toggle(e.seamRef, ev.target.checked)}
          />
        ) : null,
    },
    {
      id: 'cell',
      header: t('planGrid.edit.col.cell'),
      kind: 'id',
      cell: (e) => (
        <>
          <Data>{e.materialCode}</Data> · <Data>{e.bucket}</Data>
          {e.supplierId && <span className="font-sans font-normal text-text-secondary"> · {supplierName(e.supplierId)}</span>}
          <span className="ml-2 inline-flex gap-1 font-sans">
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
        </>
      ),
    },
    {
      id: 'baseline',
      header: t('planGrid.edit.col.baseline'),
      kind: 'number',
      cell: (e) => <Data>{e.baseline === null ? '—' : formatNumber(e.baseline)}</Data>,
    },
    {
      id: 'planned',
      header: t('planGrid.edit.col.planned'),
      kind: 'number',
      cell: (e) => (
        <>
          {/* R2 · THE READING: what was typed or pasted, and what it
              was read as under the seat's convention — "12.000" = 12 KG
              is a slip the planner can see before it is a requisition. */}
          <span data-testid={`plan-draft-reading-${e.seamRef}`}>
            <Data>{t('planGrid.edit.reading', { raw: e.raw, value: formatNumber(e.value), uom: e.uom })}</Data>
          </span>
          {magnitudeFlag(e) && e.baseline !== null && (
            <div
              className="mt-1 flex flex-col items-end gap-0.5 text-left font-sans text-[11px] text-warning-hover"
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
        </>
      ),
    },
    {
      id: 'reason',
      header: t('planGrid.edit.col.reason'),
      kind: 'text',
      cell: (e) => (
        <>
          {reasonOwed(e) ? (
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
            <div className="mt-0.5 text-[11px] text-critical" role="alert" data-testid={`plan-draft-failure-${e.seamRef}`}>
              {pushReason(e.failureReason)}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'actions',
      header: '',
      kind: 'actions',
      cell: (e) => (
        <>
          {canPush(e) && (
            <button
              type="button"
              className="mr-3 text-action-text hover:underline disabled:text-text-tertiary disabled:no-underline"
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
        </>
      ),
    },
  ];

  return (
    <div className="mt-3 rounded-lg border border-info/30 bg-info-soft" data-testid="plan-draft-details">
      {owedRefs.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 border-b border-info/20 px-4 py-2.5 text-xs" data-testid="plan-bulk-reason-bar">
          <label className="flex items-center gap-1.5 pb-1 text-text-primary">
            <input
              type="checkbox"
              data-testid="plan-select-owed"
              checked={allOwedPicked}
              disabled={pushing}
              onChange={(ev) => {
                setBulkNote(null);
                setPicked(ev.target.checked ? new Set(owedRefs) : new Set());
              }}
            />
            {t('planGrid.edit.bulk.selectOwed', { n: formatNumber(owedRefs.length) })}
          </label>
          <label className="flex min-w-[18rem] flex-col gap-0.5">
            <span className="text-text-tertiary">{t('planGrid.edit.bulk.label')}</span>
            <input
              type="text"
              data-testid="plan-bulk-reason"
              className="rounded-md border border-border-input bg-white px-2 py-1 text-xs"
              placeholder={t('planGrid.push.reasonPlaceholder')}
              value={bulkReason}
              disabled={pushing}
              onChange={(ev) => setBulkReason(ev.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={pushing || chosen.length === 0 || bulkReason.trim() === ''}
            onClick={() => setBulkNote(api.applyReason(chosen, bulkReason))}
            data-testid="plan-bulk-apply"
          >
            {t('planGrid.edit.bulk.apply', { n: formatNumber(chosen.length) })}
          </Button>
          {bulkNote !== null && (
            <span className="pb-1 text-text-secondary" role="status" data-testid="plan-bulk-note">
              {t('planGrid.edit.bulk.applied', { count: bulkNote, n: formatNumber(bulkNote) })}
            </span>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <DataTable
          columns={columns}
          rows={entries}
          rowKey={(e) => e.seamRef}
          rowProps={(e) => ({ 'data-testid': `plan-draft-row-${e.seamRef}` })}
          density="compact"
          card={false}
          testId="plan-draft-rows"
        />
      )}

      {refusals.length > 0 && (
        <ul className="border-t border-info/20 px-4 py-2 text-xs" data-testid="plan-draft-refusals">
          {refusals.map(([key, r]) => (
            <li key={key} className="flex items-center justify-between gap-3 py-0.5" data-testid={`plan-refusal-${key}`}>
              <span className="text-critical">
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
