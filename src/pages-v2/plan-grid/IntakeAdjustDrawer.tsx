import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import Button from '../../components/ui-v2/Button';
import PlanCellMarker from './PlanCellMarker';
import { usePurchaseRequisitionCreate } from '../../services/query/commandHooks';
import { DataError } from '../../services/data/types';
import { formatNumber } from '../../lib/format';
import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';
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
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../../components/ui-v2/GlossaryTermChip';

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
//
// ── CP-0 · W1 · PR-2b — the accepted quantity is PARSED, never coerced ───────
// This is the highest-consequence numeric entry in the product: the typed value
// becomes an audited, store-minted PR. It used to run `Number(e.target.value)`
// behind a `type="number"` field, which produced TWO wrong facts in silence:
//   · a CLEARED field became `Number('') === 0` — a pushable zero, and a zero on
//     a requisition is a COMMITMENT, not a blank; and
//   · "4.500" is a legal `type="number"` value that `Number` reads as 4.5, so an
//     Indonesian buyer's 4,500 KG was minted as 4.5 KG.
// The field is now `type="text" inputmode="decimal"` (ruling 6.2 — a locale fix
// cannot fire behind type=number, which rejects the very glyphs it must judge)
// and every keystroke routes through the ONE legal parser, with NO convention
// hint: an internal buyer form carries no origin signal, so a cross-convention
// token REFUSES instead of being guessed (CP-0 §5a).
//
// A refusal does not merely warn — it short-circuits the governance entirely:
// `isQtyAdjusted` / `overrideBlocked` are never evaluated on a value that does
// not exist, and the push is disabled unconditionally. Nothing reaches the
// command spine, so no ambiguous quantity can ever become an audited PR.
// ────────────────────────────────────────────────────────────────────────────

// EXHAUSTIVE, not Partial (the 2a discipline): a refusal that states no reason
// is not honest silence, it is just silence. Keying every QtyRefusalReason means
// widening the union breaks the build here rather than rendering a blank line to
// a buyer about to commit a quantity.
const QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'planGrid.push.qty.refused.empty',
  NOT_NUMERIC: 'planGrid.push.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'planGrid.push.qty.refused.ambiguous',
};

const IntakeAdjustDrawer: React.FC<{ line: PrIntakeLine | null }> = ({ line }) => {
  const { t } = useTranslation();
  const createPr = usePurchaseRequisitionCreate();

  // Per-line editable state keyed by id, so switching the selected line keeps
  // each line's in-progress edit (accepted qty + reason + push outcome). The
  // quantity is held as the RAW TYPED TEXT — the parse happens at render, so the
  // field can hold a token the platform refuses to read without that refusal
  // being silently rounded into a number on its way into state.
  const [acceptedRaw, setAcceptedRaw] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [pushState, setPushState] = useState<Record<string, PushRowState>>({});

  if (!line) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle bg-bg-surface px-4 py-8 text-center text-sm text-text-tertiary">
        {t('planGrid.drawer.empty')}
      </div>
    );
  }

  // The accepted qty defaults to the line's value as CANONICAL DIGITS ("4500"),
  // not the display grouping ("4.500"): an edit field carries the machine value
  // about to change, a display chip carries the human-formatted fact. Pre-filling
  // the grouped form would mean the form refuses its own untouched default —
  // "4.500" is exactly the token the parser cannot read without a convention.
  const raw = acceptedRaw[line.id] ?? String(line.acceptedQty);
  const why = reason[line.id] ?? '';
  const state = pushState[line.id] ?? PLANNED_ROW;
  const committed = state.planState === 'committed';

  // The ONE parse. No hint: a buyer's own form carries no origin convention, so
  // a token legal under both readings refuses rather than picking one.
  const parsed = normalizeQty(raw);

  // C6-LOCK is only ASKABLE of a quantity that exists. Under a refusal there is
  // no number to compare against `suggestedQty`, so neither `isQtyAdjusted` nor
  // `overrideBlocked` is evaluated at all — the push is disabled outright. That
  // is strictly stronger than the reason-gate, never weaker.
  const adjusted = parsed.ok && isQtyAdjusted(line, parsed.value);
  const blocked = !parsed.ok || overrideBlocked(line, parsed.value, why);

  const push = async () => {
    // Both gates enforced a SECOND time at the click (belt-and-suspenders beside
    // the disabled button): an unreadable quantity and a blocked override each
    // short-circuit here, so NOTHING reaches the dispatcher.
    if (!parsed.ok) return;
    const qty = parsed.value;
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
          {/* type=text + inputmode=decimal (ruling 6.2): type=number silently
              rejects the separators this field exists to adjudicate, so the fix
              could never fire behind it. The mobile keypad is preserved. */}
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${t('planGrid.push.col.accepted')} — ${line.material}`}
            aria-describedby={`accepted-hint-${line.id}`}
            aria-invalid={!parsed.ok}
            className="w-32 rounded-md border border-border-input bg-white px-2 py-1 text-right font-mono text-sm text-data-navy focus:border-action focus:outline-none disabled:bg-bg-hover disabled:text-text-tertiary"
            value={raw}
            disabled={committed}
            onChange={(e) => setAcceptedRaw((a) => ({ ...a, [line.id]: e.target.value }))}
          />
          <span className="ml-2 text-xs text-text-tertiary">{line.uom}</span>
          {/* Names the raw-editable convention, so canonical digits in a field
              beside a grouped display chip reads as deliberate, not broken. */}
          <div id={`accepted-hint-${line.id}`} className="mt-1 text-[11px] text-text-tertiary">
            {t('planGrid.push.qty.hint')}
          </div>
          <div className="mt-1.5 text-[11px]">
            {parsed.ok ? (
              <span
                className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-medium ${
                  adjusted
                    ? 'border-warning/30 bg-warning-soft text-warning-hover'
                    : 'border-border-subtle bg-bg-hover text-text-tertiary'
                }`}
              >
                {adjusted
                  ? `${t('planGrid.adjusted.yes')} · ${formatNumber(line.suggestedQty)}→${formatNumber(parsed.value)}`
                  : t('planGrid.adjusted.no')}
              </span>
            ) : (
              // The refusal REPLACES the adjusted chip: with no readable
              // quantity there is no adjustment to report, and reporting one
              // anyway would be the fabrication this whole batch exists to kill.
              <span
                role="alert"
                data-testid="accepted-qty-refusal"
                className="inline-flex items-center rounded-sm border border-danger/30 bg-danger-soft px-1.5 py-0.5 font-medium text-danger"
              >
                {t(QTY_REFUSAL_KEY[parsed.reason])}{' '}
                <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: parsed.reason }} />
              </span>
            )}
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
