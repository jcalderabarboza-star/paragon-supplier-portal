import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import Button from '../../components/ui-v2/Button';
import PlanCellMarker from './PlanCellMarker';
import { usePurchaseRequisitionCreate } from '../../services/query/commandHooks';
import { DataError } from '../../services/data/types';
import { formatNumber } from '../../lib/format';
import {
  isQtyAdjusted,
  overrideBlocked,
  buildQtyDecision,
  buildPrCreatePayload,
  applyPushResult,
  PLANNED_ROW,
  type PrIntakeLine,
  type PushRowState,
} from './planGridModel';

// ────────────────────────────────────────────────────────────────────────────
// IntakeAdjustDrawer (Stage G · G1.3.2) — the working-set override surface, in
// PLAIN DOM (the fork ruling from G1.2b holds: the reason-gate must be
// headless-provable, not buried in the virtualized DSG body).
//
// This REPLACES the un-virtualized IntakePushPanel: instead of iterating every
// intake row (which does not scale past a few hundred — see the G1.3.1 spike),
// the drawer edits ONE line — the working set the user SELECTED in the
// virtualized intake DSG. It is the SAME governed write (not a second mutation
// path): C6-LOCK — accepted quantity is the SINGLE editable field; an override
// (accepted ≠ suggested) is reason-gated (`overrideBlocked` true ⇒ the push is
// DISABLED and the click short-circuits — no dispatch, the load-bearing
// guarantee); committing pushes ONE `t_pr_create` (the only exit from PLANNED,
// C6 §3) carrying quantity=acceptedQty + the opaque `decision` provenance, and
// the DR-10 audit records suggestedQty→acceptedQty + reason + wasAdjusted. A
// failure via EITHER channel (thrown DataError / status:'failed') leaves the row
// PLANNED with its reason (C6 §6 invariant 3). Every render stays SIMULATED — no
// live producer (LIVENESS-DATASOURCE-01) — so a pushed line is honestly
// non-committed, never a live procurement instruction.
// ────────────────────────────────────────────────────────────────────────────

const IntakeAdjustDrawer: React.FC<{ line: PrIntakeLine | null }> = ({ line }) => {
  const { t } = useTranslation();
  const createPr = usePurchaseRequisitionCreate();

  // Per-line editable state keyed by id, so switching the selected line keeps
  // each line's in-progress edit (accepted qty + reason + push outcome).
  const [accepted, setAccepted] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [pushState, setPushState] = useState<Record<string, PushRowState>>({});

  if (!line) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle bg-bg-surface px-4 py-8 text-center text-sm text-text-tertiary">
        {t('planGrid.drawer.empty')}
      </div>
    );
  }

  // The accepted qty defaults to the line's suggested-accepted value until the
  // user edits it (then the per-id entry holds the working value).
  const qty = accepted[line.id] ?? line.acceptedQty;
  const why = reason[line.id] ?? '';
  const adjusted = isQtyAdjusted(line, qty);
  const blocked = overrideBlocked(line, qty, why);
  const state = pushState[line.id] ?? PLANNED_ROW;
  const committed = state.planState === 'committed';

  const push = async () => {
    // The reason-gate, enforced a SECOND time at the click (belt-and-suspenders
    // beside the disabled button): a blocked override never dispatches.
    if (overrideBlocked(line, qty, why)) return;

    const payload = buildPrCreatePayload(line, qty, why);
    // A genuine override carries the opaque decision provenance; an
    // accept-as-suggested push carries none (nothing was overridden).
    const decision = isQtyAdjusted(line, qty) ? buildQtyDecision(line, qty, why) : undefined;

    try {
      const result = await createPr.mutateAsync({ payload, decision });
      setPushState((s) => ({
        ...s,
        [line.id]:
          result.status === 'failed'
            ? applyPushResult({ ok: false, reason: result.reason ?? 'failed' })
            : applyPushResult({ ok: true, entityId: result.entityId ?? '' }),
      }));
    } catch (e) {
      // Hard authz failure arrives as a thrown DataError — same "stay PLANNED".
      const reasonCode = e instanceof DataError ? e.code : 'ERROR';
      setPushState((s) => ({ ...s, [line.id]: applyPushResult({ ok: false, reason: reasonCode }) }));
    }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface">
      {/* Selected-line header — material + producer + honest marker */}
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <div className="font-medium text-text-primary">{line.material}</div>
          <div className="mt-0.5 text-xs text-text-tertiary">
            {t(`planGrid.source.${line.source}`)}
          </div>
        </div>
        <PlanCellMarker capability="purchaseRequisitions" planState={state.planState} />
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        {/* Suggested (read-only) */}
        <div>
          <div className="mb-1 text-label uppercase tracking-wider text-text-tertiary">
            {t('planGrid.push.col.suggested')}
          </div>
          <Data className="text-sm">
            {formatNumber(line.suggestedQty)} {line.uom}
          </Data>
        </div>

        {/* Accepted (the ONE editable field) */}
        <div>
          <div className="mb-1 text-label uppercase tracking-wider text-text-tertiary">
            {t('planGrid.push.col.accepted')}
          </div>
          <input
            type="number"
            aria-label={`${t('planGrid.push.col.accepted')} — ${line.material}`}
            className="w-32 rounded-md border border-border-input bg-white px-2 py-1 text-right font-mono text-sm text-data-navy focus:border-action focus:outline-none disabled:bg-bg-hover disabled:text-text-tertiary"
            value={Number.isFinite(qty) ? qty : ''}
            disabled={committed}
            onChange={(e) => setAccepted((a) => ({ ...a, [line.id]: Number(e.target.value) }))}
          />
          <span className="ml-2 text-xs text-text-tertiary">{line.uom}</span>
          <div className="mt-1.5 text-[11px]">
            <span
              className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-medium ${
                adjusted
                  ? 'border-warning/30 bg-warning-soft text-warning-hover'
                  : 'border-border-subtle bg-bg-hover text-text-tertiary'
              }`}
            >
              {adjusted
                ? `${t('planGrid.adjusted.yes')} · ${formatNumber(line.suggestedQty)}→${formatNumber(qty)}`
                : t('planGrid.adjusted.no')}
            </span>
          </div>
        </div>

        {/* Reason — only for an override (C6-LOCK), and only pre-commit */}
        {adjusted && !committed && (
          <div className="sm:col-span-2">
            <div className="mb-1 text-label uppercase tracking-wider text-text-tertiary">
              {t('planGrid.push.col.reason')}
            </div>
            <input
              type="text"
              aria-label={`${t('planGrid.push.col.reason')} — ${line.material}`}
              placeholder={t('planGrid.push.reasonPlaceholder')}
              className="w-full max-w-md rounded-md border border-border-input bg-white px-2 py-1 text-sm text-text-primary focus:border-action focus:outline-none"
              value={why}
              onChange={(e) => setReason((r) => ({ ...r, [line.id]: e.target.value }))}
            />
            {blocked && (
              <div className="mt-1 text-[11px] text-warning-hover">
                {t('planGrid.push.reasonRequired')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Push action + committed / failed feedback */}
      <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
        <div className="text-[11px]">
          {committed && state.prNumber && (
            <Data className="text-text-secondary">
              {t('planGrid.push.committed', { pr: state.prNumber })}
            </Data>
          )}
          {state.failureReason && (
            <span className="text-danger">
              {t('planGrid.push.failed', { reason: state.failureReason })}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          disabled={blocked || committed || createPr.isPending}
          onClick={push}
        >
          {createPr.isPending ? t('planGrid.push.pushing') : t('planGrid.push.button')}
        </Button>
      </div>
    </div>
  );
};

export default IntakeAdjustDrawer;
