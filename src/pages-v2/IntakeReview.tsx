import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Data from '../components/ui-v2/Data';
import Button from '../components/ui-v2/Button';
import LivenessPill from '../components/ui-v2/LivenessPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import PlanCellMarker from './plan-grid/PlanCellMarker';
import { useIntakeReview } from '../services/query/hooks';
import { usePurchaseRequisitionCreate } from '../services/query/commandHooks';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { DataError, type PrIntakeLine } from '../services/data/types';
import { formatIDR, formatNumber } from '../lib/format';
import { applyPushResult, type PushRowState } from './plan-grid/planGridModel';
import {
  buildAcceptPush,
  dismissLine,
  restoreLine,
  triageStatus,
  triageCounts,
} from './intake-review/intakeReviewModel';
import { useRefusalText } from '../hooks/useRefusalText';

// ────────────────────────────────────────────────────────────────────────────
// IntakeReview (Phase A/1 · sourcing spine) — the recommend-first TRIAGE
// surface: review the inbound requirement SET (both producers, via the
// getPrIntake seam), understand WHY each line was recommended (`deficit`,
// FORK-D), and decide what enters the sourcing workload.
//
// Review owns NO mutation (FORK-C=c2). Accept-as-suggested ROUTES to the
// EXISTING governed push — the same t_pr_create / usePurchaseRequisitionCreate
// the plan-grid drawer dispatches — in its weakest form: quantity IS the
// suggestion, no reason, no DR-10 decision (quantity overrides live on the
// Plan Grid, C6-LOCK). Dismiss is EPHEMERAL client state, honestly labeled
// "this session only · not persisted" — the row is set aside, never removed,
// and Restore is its exact inverse. Every marker stays SIMULATED — the
// registry (`purchaseRequisitions`, gate-2 shut) keeps green unreachable
// (LIVENESS-DATASOURCE-01).
// ────────────────────────────────────────────────────────────────────────────

const IntakeReview: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const intakeQuery = useIntakeReview();
  const createPr = usePurchaseRequisitionCreate();

  // §74 — `t_pr_create` (atom `pr:create`, held by `requisitioner`).
  //
  // ⚠️ ONE NOTICE AT THE HEADER, NOT ONE PER ROW. Accept is a per-line
  // button and this table can hold any number of lines; the same string
  // repeated down a column teaches nothing after the first and would turn a
  // handoff into visual noise. The act is identical on every row — one atom,
  // one owner — so it is stated once, where it governs the whole surface.
  // DISMISS is untouched: it is local view state holding no atom.
  const acceptAvailability = useVerbAvailability('pr:create');
  const lines = intakeQuery.data?.items ?? [];

  // Triage client state: push outcomes per line + the ephemeral dismissed set.
  const [pushStates, setPushStates] = useState<Record<string, PushRowState>>({});
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  // Which line's accept-push is in flight (per-row Pushing… affordance).
  const [pushingId, setPushingId] = useState<string | null>(null);

  const counts = triageCounts(lines, pushStates, dismissed);

  const accept = async (line: PrIntakeLine) => {
    if (triageStatus(line, pushStates[line.id], dismissed) !== 'pending') return;
    const { payload } = buildAcceptPush(line); // decision is structurally undefined
    setPushingId(line.id);
    try {
      const result = await createPr.mutateAsync({ payload });
      setPushStates((s) => ({
        ...s,
        [line.id]:
          result.status === 'failed'
            ? applyPushResult({ ok: false, reason: result.reason ?? 'failed' })
            : applyPushResult({ ok: true, entityId: result.entityId ?? '' }),
      }));
    } catch (e) {
      // Hard authz failure arrives as a thrown DataError — same "stay PLANNED".
      const reasonCode = e instanceof DataError ? e.code : 'ERROR';
      setPushStates((s) => ({
        ...s,
        [line.id]: applyPushResult({ ok: false, reason: reasonCode }),
      }));
    } finally {
      setPushingId(null);
    }
  };

  const CRUMB = [t('intakeReview.crumb.acquire'), t('intakeReview.crumb.review')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('intakeReview.header.title')}
        subtitle={t('intakeReview.header.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <HandoffNotice availability={acceptAvailability} testId="handoff-intake-accept" />
            <LivenessPill capability="purchaseRequisitions" />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('intakeReview.meta.summary', {
          total: counts.total,
          pending: counts.pending,
          accepted: counts.accepted,
          dismissed: counts.dismissed,
        })}
      </PageMetaLine>

      {/* Honest framing: triage only — push simulated, dismissal not persisted */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('intakeReview.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('intakeReview.honesty.body')}</p>
          <p className="mt-1 text-text-secondary">
            <Link to="/buyer/plan-grid" className="text-action hover:underline">
              {t('intakeReview.adjustHint')}
            </Link>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('intakeReview.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.producer')}</TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.lane')}</TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.segment')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('intakeReview.col.qty')}
            </TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.period')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('intakeReview.col.estValue')}
            </TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.why')}</TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.provenance')}</TableHeaderCell>
            <TableHeaderCell>{t('intakeReview.col.actions')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-text-tertiary">
                  {t('intakeReview.empty')}
                </TableCell>
              </TableRow>
            )}
            {lines.map((line) => {
              const pushState = pushStates[line.id];
              const status = triageStatus(line, pushState, dismissed);
              const isDismissed = status === 'dismissed';
              const isAccepted = status === 'accepted';
              const pushing = pushingId === line.id;
              return (
                <TableRow key={line.id} className={isDismissed ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{line.material}</TableCell>
                  <TableCell className="text-text-secondary">
                    {t(`planGrid.source.${line.source}`)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {line.suggestedSource ?? t('planGrid.empty.dash')}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {line.segment ?? t('planGrid.empty.dash')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Data className="text-sm">
                      {formatNumber(line.suggestedQty)} {line.uom}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <Data className="text-sm">{line.period}</Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <Data className="text-sm">
                      {formatIDR(line.estimatedValue, { compact: true })}
                    </Data>
                  </TableCell>
                  {/* The recommend-first "why" — read-only, the point of triage */}
                  <TableCell className="max-w-xs text-sm text-text-secondary">
                    {line.deficit ?? t('planGrid.empty.dash')}
                  </TableCell>
                  <TableCell>
                    <PlanCellMarker
                      capability="purchaseRequisitions"
                      planState={pushState?.planState ?? line.planState}
                    />
                  </TableCell>
                  <TableCell>
                    {isAccepted && pushState?.prNumber && (
                      <Data className="text-xs text-text-secondary">
                        {t('intakeReview.accepted.label', { pr: pushState.prNumber })}
                      </Data>
                    )}
                    {isDismissed && (
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="inline-flex items-center rounded-sm border border-border-subtle bg-bg-hover px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary">
                          {t('intakeReview.dismissed.label')}
                        </span>
                        <Button
                          variant="secondary"
                          className="!px-2.5 !py-1 text-xs"
                          aria-label={t('intakeReview.restore.aria', { material: line.material })}
                          onClick={() => setDismissed((s) => restoreLine(s, line.id))}
                        >
                          {t('intakeReview.action.restore')}
                        </Button>
                      </div>
                    )}
                    {status === 'pending' && (
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          {acceptAvailability.kind === 'held' && (
                            <Button
                              variant="outline"
                              className="!px-2.5 !py-1 text-xs"
                              disabled={pushing}
                              aria-label={t('intakeReview.accept.aria', { material: line.material })}
                              onClick={() => accept(line)}
                            >
                              {pushing
                                ? t('intakeReview.action.accepting')
                                : t('intakeReview.action.accept')}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            className="!px-2.5 !py-1 text-xs"
                            disabled={pushing}
                            aria-label={t('intakeReview.dismiss.aria', { material: line.material })}
                            onClick={() => setDismissed((s) => dismissLine(s, line.id))}
                          >
                            {t('intakeReview.action.dismiss')}
                          </Button>
                        </div>
                        {pushState?.failureReason && (
                          <span className="text-[11px] text-danger">
                            {refusalText(pushState.failureReason) ?? t('intakeReview.failed.label', { reason: pushState.failureReason })}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

export default IntakeReview;
