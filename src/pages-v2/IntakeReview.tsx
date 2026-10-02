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
import {
  useIntakeCommit,
  useIntakeDismiss,
  useIntakeRestore,
} from '../services/query/commandHooks';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { DataError, type IntakeLine } from '../services/data/types';
import { formatIDR, formatNumber } from '../lib/format';
import { buildAcceptCommit, triageCounts } from './intake-review/intakeReviewModel';
import { useRefusalText } from '../hooks/useRefusalText';

// ────────────────────────────────────────────────────────────────────────────
// IntakeReview (A2 · Design 1 B2) — the recommend-first TRIAGE surface: review
// the inbound requirement SET (both producers, via the `getIntakeLines` seam),
// understand WHY each line was recommended (`deficit`), and decide what enters
// the sourcing workload.
//
// ── ⚠️ EVERY DECISION ON THIS PAGE IS NOW A RECORDED ACT ────────────────────
//
// Until A2 this surface owned its own triage: dismissals lived in a
// `useState` set behind a label reading *"this session only · not persisted"*,
// and push outcomes lived in a second `useState` map. Both were honest about a
// defect rather than describing a design — a planner who set a line aside had
// DECIDED something, and a colleague opening the same queue saw the line back
// in the pile. Three verbs on the `intakeLine` machine own it now
// (`t_intake_dismiss` / `t_intake_restore` / `t_intake_commit`), so a dismissal
// survives a reload and is visible to the next seat, and the honesty banner no
// longer has to apologise for the page.
//
// ── ⚠️ ACCEPT PUSHES THE PRODUCER'S QUANTITY, NOT THE SUGGESTION (A1-R2) ────
//
// This page used to push `suggestedQty` while the Plan Grid drawer pre-filled
// `acceptedQty`. One requirement, two quantities. Both now commit the delivered
// number and neither owes a reason for it; a reason is owed only when a planner
// moves it, which is the drawer's job and `INTAKE_OVERRIDE_REASONED`'s gate.
//
// ── ⚠️ WHAT IS STILL `useState`, AND WHY IT IS ALLOWED TO BE ────────────────
//
// Exactly two things: WHICH row has a request in flight (so that row's buttons
// can say "Committing…"), and the last refusal text per row. Neither is a fact
// about the world — the first stops existing the moment the promise settles and
// the second is a message about an act that did not happen. Nothing a reload
// should preserve is held here.
//
// Every marker stays SIMULATED — the registry (`purchaseRequisitions`, gate-2
// shut) keeps green unreachable (LIVENESS-DATASOURCE-01).
// ────────────────────────────────────────────────────────────────────────────

/**
 * WHY A COMMITTED LINE CAN SHOW NO REQUISITION NUMBER, AND WHY THE COPY SAYS
 * WHAT IT SAYS (A2, found in browser QA and not by any spec).
 *
 * ⚠️ **THE TWO STORES DO NOT PERSIST ALIKE, AND THE ASYMMETRY IS REAL RATHER
 * THAN A BUG TO PAPER OVER.** `intakeLineStore` writes the triage to
 * `localStorage`, because a dismissal is a decision a colleague must see and a
 * reload must not erase. `purchaseRequisitionStore` is an in-memory module
 * singleton, like every other mock store, so a reload re-seeds it. A line
 * committed before the reload is therefore `Committed` with NO requisition in
 * this session naming it back.
 *
 * ⚠️ **THE FIRST COPY HERE READ "no requisition was raised", AND THAT WAS A
 * FALSE STATEMENT ABOUT THE WORLD.** One WAS raised; this session no longer
 * holds it. The distinction is the whole of this project's honesty rule — an
 * absent value may not be reported as a value of "none" — so the label names
 * the STORE's boundary, which is the only thing the surface can actually know.
 *
 * ⚠️ **AND THE REMEDY IS NOT TO STORE THE NUMBER.** A stored `prNumber` would
 * survive the reload and point at a row that does not exist — a dangling
 * reference an approver could chase and not find, which is worse than an honest
 * absence. It goes away on its own when `httpDataService` lands and both sides
 * persist (Phase F1); until then the surface says which session it is in.
 */
const IntakeReview: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const intakeQuery = useIntakeReview();
  const commit = useIntakeCommit();
  const dismiss = useIntakeDismiss();
  const restore = useIntakeRestore();

  // §74 / `ENTRANCE-IS-THE-UNIT-01` — all three verbs hold the SAME atom
  // (`pr:create`, held by `requisitioner`), so one availability reading governs
  // every control on this page, and the notice sits once at the header rather
  // than repeating down a column that teaches nothing after the first row.
  //
  // ⚠️ **DISMISS IS NO LONGER EXEMPT.** It used to be local view state holding
  // no atom, so a seat without `pr:create` could still set lines aside. It is a
  // governed verb now, and gating the MODE rather than one door is the rule:
  // every control below hangs off this one reading.
  const triageAvailability = useVerbAvailability('pr:create');
  const lines = intakeQuery.data?.items ?? [];

  // View-only, and neither survives a settle: which row is mid-flight, and the
  // last refusal per row. See the header for why nothing else lives here.
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [refusals, setRefusals] = useState<Record<string, string>>({});

  const counts = triageCounts(lines);

  /**
   * One place every dispatch lands, so the two failure channels cannot diverge
   * per control: a returned `status: 'failed'` and a thrown `DataError` both
   * leave the row exactly where it was, with a reason a reader can act on.
   */
  const run = async (lineId: string, fire: () => Promise<{ status: string; reason?: string }>) => {
    setInFlightId(lineId);
    setRefusals((r) => {
      const { [lineId]: _dropped, ...rest } = r;
      return rest;
    });
    try {
      const result = await fire();
      if (result.status === 'failed') {
        setRefusals((r) => ({ ...r, [lineId]: result.reason ?? 'failed' }));
      }
    } catch (e) {
      setRefusals((r) => ({ ...r, [lineId]: e instanceof DataError ? e.code : 'ERROR' }));
    } finally {
      setInFlightId(null);
    }
  };

  const accept = (line: IntakeLine) =>
    run(line.id, () => commit.mutateAsync(buildAcceptCommit(line)));

  const CRUMB = [t('intakeReview.crumb.review')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('intakeReview.header.title')}
        subtitle={t('intakeReview.header.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <HandoffNotice availability={triageAvailability} testId="handoff-intake-triage" />
            <LivenessPill capability="purchaseRequisitions" />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('intakeReview.meta.summary', {
          total: counts.total,
          pending: counts.pending,
          committed: counts.committed,
          dismissed: counts.dismissed,
        })}
      </PageMetaLine>

      {/* Honest framing. The old copy apologised for a dismissal evaporating;
          it records one now, and this says the one thing that is still true —
          the push is simulated, because no live producer exists. */}
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
              const busy = inFlightId === line.id;
              const refusal = refusals[line.id];
              return (
                <TableRow
                  key={line.id}
                  className={line.state === 'Dismissed' ? 'opacity-60' : ''}
                >
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
                  {/* The DELIVERED quantity, which is the number Accept commits
                      and the baseline any override is measured from (A1-R2).
                      When the producer trimmed it, the trim is SHOWN — read-only,
                      never charged to the planner. */}
                  <TableCell className="text-right">
                    <Data className="text-sm">
                      {formatNumber(line.acceptedQty)} {line.uom}
                    </Data>
                    {line.producerAdjusted && (
                      <div
                        className="mt-0.5 text-[11px] text-text-tertiary"
                        data-testid={`producer-adjusted-${line.id}`}
                      >
                        {t('planGrid.adjusted.byProducer', {
                          producer: t(`planGrid.source.${line.source}`),
                          from: formatNumber(line.suggestedQty),
                          to: formatNumber(line.acceptedQty),
                        })}
                      </div>
                    )}
                  </TableCell>
                  {/* A BUCKET, rendered as a bucket. Never through `formatDate`,
                      which turns `'2026-09'` into a day nobody entered. */}
                  <TableCell>
                    <Data className="text-sm">{line.periodBucket}</Data>
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
                      planState={line.planState}
                    />
                  </TableCell>
                  <TableCell>
                    {line.state === 'Committed' && (
                      <Data className="text-xs text-text-secondary">
                        {line.prNumber
                          ? t('intakeReview.committed.label', { pr: line.prNumber })
                          : t('intakeReview.committed.noPr')}
                      </Data>
                    )}
                    {line.state === 'Dismissed' && (
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="inline-flex items-center rounded-sm border border-border-subtle bg-bg-hover px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary">
                          {t('intakeReview.dismissed.label')}
                        </span>
                        {triageAvailability.kind === 'held' && (
                          <Button
                            variant="secondary"
                            className="!px-2.5 !py-1 text-xs"
                            disabled={busy}
                            aria-label={t('intakeReview.restore.aria', { material: line.material })}
                            onClick={() =>
                              run(line.id, () => restore.mutateAsync({ lineId: line.id }))
                            }
                          >
                            {t('intakeReview.action.restore')}
                          </Button>
                        )}
                      </div>
                    )}
                    {line.state === 'Pending' && triageAvailability.kind === 'held' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="!px-2.5 !py-1 text-xs"
                          disabled={busy}
                          aria-label={t('intakeReview.accept.aria', { material: line.material })}
                          onClick={() => accept(line)}
                        >
                          {busy
                            ? t('intakeReview.action.accepting')
                            : t('intakeReview.action.accept')}
                        </Button>
                        <Button
                          variant="secondary"
                          className="!px-2.5 !py-1 text-xs"
                          disabled={busy}
                          aria-label={t('intakeReview.dismiss.aria', { material: line.material })}
                          onClick={() =>
                            run(line.id, () => dismiss.mutateAsync({ lineId: line.id }))
                          }
                        >
                          {t('intakeReview.action.dismiss')}
                        </Button>
                      </div>
                    )}
                    {refusal && (
                      <div className="mt-1 text-[11px] text-danger" role="alert">
                        {refusalText(refusal) ??
                          t('intakeReview.failed.label', { reason: refusal })}
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
