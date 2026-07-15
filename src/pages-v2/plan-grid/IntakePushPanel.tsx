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
// IntakePushPanel (Stage G · G1.2b) — the ONE governed mutation surface, in
// PLAIN DOM (the fork ruling: the reason-gate must be headless-provable, not
// buried in the virtualized DSG body).
//
// C6-LOCK: accepted quantity is the SINGLE editable field. An override
// (accepted ≠ suggested) is reason-gated — `overrideBlocked` true ⇒ the push is
// DISABLED and the click short-circuits (no dispatch, the load-bearing
// guarantee). Committing pushes ONE `t_pr_create` (the only exit from PLANNED,
// C6 §3) carrying quantity=acceptedQty + the opaque `decision` provenance; the
// DR-10 audit records suggestedQty→acceptedQty + reason + wasAdjusted. A failure
// via EITHER channel (thrown DataError / status:'failed') leaves the row PLANNED
// with its reason (C6 §6 invariant 3). Every render stays SIMULATED — the
// capability has no live producer (LIVENESS-DATASOURCE-01), so a pushed line is
// honestly non-committed, never a live procurement instruction.
// ────────────────────────────────────────────────────────────────────────────

const cellClass = 'px-3 py-2.5 align-top';
const headClass =
  'px-3 py-2 text-left text-label uppercase tracking-wider text-text-tertiary font-semibold';

const IntakePushPanel: React.FC<{ lines: readonly PrIntakeLine[] }> = ({ lines }) => {
  const { t } = useTranslation();
  const createPr = usePurchaseRequisitionCreate();

  // Per-line editable state: the accepted qty (the ONE editable field), its
  // override reason, and the push outcome (PLANNED until a successful push).
  const [accepted, setAccepted] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, l.acceptedQty])),
  );
  const [reason, setReason] = useState<Record<string, string>>({});
  const [pushState, setPushState] = useState<Record<string, PushRowState>>({});

  const rowState = (id: string): PushRowState => pushState[id] ?? PLANNED_ROW;

  const push = async (line: PrIntakeLine) => {
    const qty = accepted[line.id];
    const why = reason[line.id] ?? '';
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
    <section className="mb-8">
      <h2 className="text-base font-semibold text-text-primary">{t('planGrid.push.title')}</h2>
      <p className="mb-1 text-sm text-text-secondary">{t('planGrid.push.subtitle')}</p>
      <p className="mb-3 text-xs text-text-tertiary">{t('planGrid.push.lockedNote')}</p>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-bg-hover">
            <tr>
              <th className={headClass}>{t('planGrid.push.col.material')}</th>
              <th className={`${headClass} text-right`}>{t('planGrid.push.col.suggested')}</th>
              <th className={`${headClass} text-right`}>{t('planGrid.push.col.accepted')}</th>
              <th className={headClass}>{t('planGrid.push.col.reason')}</th>
              <th className={headClass}>{t('planGrid.push.col.state')}</th>
              <th className={`${headClass} text-right`}>{t('planGrid.push.col.action')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const qty = accepted[line.id];
              const why = reason[line.id] ?? '';
              const adjusted = isQtyAdjusted(line, qty);
              const blocked = overrideBlocked(line, qty, why);
              const state = rowState(line.id);
              const committed = state.planState === 'committed';

              return (
                <tr key={line.id} className="border-b border-border-subtle last:border-b-0">
                  <td className={cellClass}>
                    <div className="font-medium text-text-primary">{line.material}</div>
                    <div className="mt-1 text-xs text-text-tertiary">
                      {t(`planGrid.source.${line.source}`)}
                    </div>
                  </td>

                  <td className={`${cellClass} text-right`}>
                    <Data className="text-xs">
                      {formatNumber(line.suggestedQty)} {line.uom}
                    </Data>
                  </td>

                  <td className={`${cellClass} text-right`}>
                    <input
                      type="number"
                      aria-label={`${t('planGrid.push.col.accepted')} — ${line.material}`}
                      className="w-28 rounded-md border border-border-input bg-white px-2 py-1 text-right font-mono text-xs text-data-navy focus:border-action focus:outline-none disabled:bg-bg-hover disabled:text-text-tertiary"
                      value={Number.isFinite(qty) ? qty : ''}
                      disabled={committed}
                      onChange={(e) =>
                        setAccepted((a) => ({ ...a, [line.id]: Number(e.target.value) }))
                      }
                    />
                    <div className="mt-1 text-[11px]">
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
                  </td>

                  <td className={cellClass}>
                    {/* The reason field appears only for an override (C6-LOCK). */}
                    {adjusted && !committed ? (
                      <div>
                        <input
                          type="text"
                          aria-label={`${t('planGrid.push.col.reason')} — ${line.material}`}
                          placeholder={t('planGrid.push.reasonPlaceholder')}
                          className="w-48 rounded-md border border-border-input bg-white px-2 py-1 text-xs text-text-primary focus:border-action focus:outline-none"
                          value={why}
                          onChange={(e) =>
                            setReason((r) => ({ ...r, [line.id]: e.target.value }))
                          }
                        />
                        {blocked && (
                          <div className="mt-1 text-[11px] text-warning-hover">
                            {t('planGrid.push.reasonRequired')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">{t('planGrid.empty.dash')}</span>
                    )}
                  </td>

                  <td className={cellClass}>
                    <PlanCellMarker
                      capability="purchaseRequisitions"
                      planState={state.planState}
                    />
                    {committed && state.prNumber && (
                      <div className="mt-1">
                        <Data className="text-[11px] text-text-secondary">
                          {t('planGrid.push.committed', { pr: state.prNumber })}
                        </Data>
                      </div>
                    )}
                    {state.failureReason && (
                      <div className="mt-1 text-[11px] text-danger">
                        {t('planGrid.push.failed', { reason: state.failureReason })}
                      </div>
                    )}
                  </td>

                  <td className={`${cellClass} text-right`}>
                    <Button
                      variant="outline"
                      disabled={blocked || committed || createPr.isPending}
                      onClick={() => push(line)}
                    >
                      {createPr.isPending ? t('planGrid.push.pushing') : t('planGrid.push.button')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default IntakePushPanel;
