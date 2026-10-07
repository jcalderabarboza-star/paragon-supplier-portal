// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · WHAT THE BUYER'S RFP SURFACES READ OFF AN EVENT — the proposals, the
// ranking, the day the scores locked, and the sentence for each score refusal.
//
// Pure: no React, no store. `RfpEvaluation` renders these and the advance form
// reads the same ranking, so the order a buyer sees and the order "top N"
// pre-selects from are one list.
// ────────────────────────────────────────────────────────────────────────────

import type { RFQ } from '../../services/data/types';
import type { StageAdvance, StageResponse } from '../../data/rfqStage';
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { refusedByPolicy, type PolicyHookId } from '../../services/transitions/refusalMessage';
import { asScoreSheets, rankingOf, type RankedSupplier } from '../../data/rfpEvaluation';
import { formatNumber } from '../../lib/format';

/** The proposals suppliers submitted at this event's RFP stage, in the order they arrived. */
export function rfpProposalsOf(rfq: Pick<RFQ, 'stageResponses'>): readonly StageResponse[] {
  const responses = rfq.stageResponses ?? [];
  // i18n-defer: 'RFP' is the stage token the store writes, compared, never rendered.
  return responses.filter((r) => r.stage === 'RFP');
}

/** The suppliers that proposed, ranked by weighted total; the unscored last. */
export function rfpRankingOf(
  rfq: Pick<RFQ, 'stageResponses' | 'criteria' | 'proposalScores'>,
): RankedSupplier[] {
  const proposers: string[] = [];
  for (const r of rfpProposalsOf(rfq)) proposers.push(r.supplierId);
  return rankingOf(rfq.criteria ?? [], asScoreSheets(rfq.proposalScores), proposers);
}

/** The advance that left the RFP stage — the day the scores locked — or `undefined`. */
export function scoresLockedBy(rfq: Pick<RFQ, 'stageHistory'>): StageAdvance | undefined {
  // i18n-defer: 'RFP' is the stage token, compared, never rendered.
  return (rfq.stageHistory ?? []).find((a) => a.from === 'RFP');
}

/**
 * A total or an average on the 1–5 scale, always to two decimals, with the
 * reader's decimal mark — the one `formatNumber` writes in "1.5" / "1,5".
 */
export const scoreText = (value: number): string =>
  value.toFixed(2).replace('.', formatNumber(1.5).charAt(1));

/** The evaluator's sentence for a refused score, by the hook that refused it. */
export function scoreRefusalKey(reason: string | undefined): string | null {
  const is = (hook: PolicyHookId): boolean => refusedByPolicy(reason, hook);
  if (is(POLICY_HOOKS.RFQ_SCORE_EVALUATOR_NAMED)) return 'sourcing.refusal.scoreEvaluatorUnattributed';
  if (is(POLICY_HOOKS.RFQ_SCORE_NOT_LOCKED)) return 'sourcing.refusal.scoresLocked';
  if (is(POLICY_HOOKS.RFQ_SCORE_AT_RFP_STAGE)) return 'sourcing.refusal.scoreStageNotRfp';
  if (is(POLICY_HOOKS.RFQ_SCORE_PROPOSAL_HELD)) return 'sourcing.refusal.scoreNoProposal';
  if (is(POLICY_HOOKS.RFQ_SCORE_SHEET_WELL_FORMED)) return 'sourcing.refusal.scoreSheetInvalid';
  return null;
}
