// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · THE BUYER READS, SCORES AND RANKS THE PROPOSALS.
//
// Three things on a published event that sets RFP criteria:
//
//   · THE PROPOSALS — one block per supplier that SUBMITTED one (a draft is not
//     here: the event row never holds one): its response to each criterion and
//     the names of the documents it refers to. Names only; no file is kept.
//   · THE SCORE SHEET — under each proposal, the acting evaluator's own: a score
//     from 1 to 5 and a comment per criterion, saved whole
//     (`t_rfq_proposal_score`). It is offered only while the machine would take
//     it — the event is Closed at its RFP stage, the seat holds `rfq:evaluate`
//     and names a person — and otherwise the line in its place says which of
//     those is missing. THE MODE IS GATED, NOT THE DOOR.
//   · THE RANKING — suppliers down, criteria across; each cell the average of
//     the scores given, each row the weighted total (the average of the
//     evaluators' weighted totals) and the rank.
//
// IT REPORTS; IT DOES NOT DECIDE. A rank removes nobody: the buyer chooses the
// shortlist on the advance form, where the top N or everyone at or above a
// total can be pre-selected and any name can still be ticked or unticked.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { Field, FieldList } from '../../components/ui-v2/Field';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { FieldLabel, Select, TextInput } from '../../components/ui-v2/Form';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useRfqProposalScore } from '../../services/query/commandHooks';
import { personLabel } from '../../services/identity/personLabel';
import type { RFQ } from '../../services/data/types';
import { stageOf } from '../../data/rfqStage';
import {
  rfpProposalsOf,
  rfpRankingOf,
  scoreRefusalKey,
  scoreText,
  scoresLockedBy,
} from './rfpEvaluationModel';
import {
  RFP_CRITERION_GROUPS,
  SCORE_MAX,
  SCORE_MIN,
  asScoreSheets,
  criterionAverageOf,
  criterionLabel,
  evaluatorIdOf,
  groupTotalOf,
  hasGroups,
  type RfpCriterion,
} from '../../data/rfpEvaluation';
import { formatDate, formatNumber } from '../../lib/format';

interface SheetValues {
  readonly scores: Readonly<Record<string, string>>;
  readonly comments: Readonly<Record<string, string>>;
}

/** The acting evaluator's own sheet for one supplier, as the form holds it. */
function sheetValuesOf(rfq: RFQ, supplierId: string, evaluatorId: string): SheetValues {
  const mine = (rfq.proposalScores ?? []).find(
    (s) => s.supplierId === supplierId && evaluatorIdOf(s) === evaluatorId,
  );
  const scores: Record<string, string> = {};
  const comments: Record<string, string> = {};
  for (const s of mine?.scores ?? []) {
    scores[s.criterionId] = String(s.score);
    if (s.comment) comments[s.criterionId] = s.comment;
  }
  return { scores, comments };
}

const SCORE_CHOICES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => String(SCORE_MIN + i));

/** One evaluator's sheet for one proposal. Mounted only while scoring is open to this seat. */
const ScoreSheet: React.FC<{
  rfq: RFQ;
  supplierId: string;
  supplierName: string;
  evaluatorId: string;
}> = ({ rfq, supplierId, supplierName, evaluatorId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const mutation = useRfqProposalScore();
  const criteria = rfq.criteria ?? [];
  const [values, setValues] = useState<SheetValues>(() => sheetValuesOf(rfq, supplierId, evaluatorId));
  const whole = criteria.every((c) => (values.scores[c.id] ?? '') !== '');
  const saved = (rfq.proposalScores ?? []).some(
    (s) => s.supplierId === supplierId && evaluatorIdOf(s) === evaluatorId,
  );

  const handleSave = () => {
    mutation.mutate(
      {
        rfqId: rfq.id,
        supplierId,
        scores: criteria.map((c) => ({
          criterionId: c.id,
          score: Number(values.scores[c.id]),
          ...(values.comments[c.id]?.trim() ? { comment: values.comments[c.id].trim() } : {}),
        })),
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            const key = scoreRefusalKey(result.reason);
            toast({
              variant: 'error',
              title: t('sourcing.rfp.score.toast.failed.title'),
              description: key
                ? t(key)
                : (refusalText(result.reason) ?? result.reason ?? t('sourcing.rfp.toast.saveFailed.default')),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.rfp.score.toast.saved.title', { supplier: supplierName }),
            description: t('sourcing.rfp.score.toast.saved.desc'),
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.rfp.score.toast.failed.title'),
            description: t('sourcing.rfp.toast.saveFailed.default'),
          }),
      },
    );
  };

  return (
    <div className="mt-3 border-t border-border-subtle pt-3" data-testid={`rfp-score-sheet-${supplierId}`}>
      <SectionHeading level="group" as="h4" className="mb-1">{t('sourcing.rfp.score.title')}</SectionHeading>
      <p className="text-xs text-text-tertiary mb-2">
        {t(saved ? 'sourcing.rfp.score.yoursSaved' : 'sourcing.rfp.score.yoursNew', {
          person: personLabel(evaluatorId, t),
        })}
      </p>
      <ul className="space-y-2">
        {criteria.map((c, i) => (
          <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_5rem] md:grid-cols-[minmax(0,14rem)_5rem_minmax(0,1fr)] gap-2 items-center">
            <FieldLabel htmlFor={`rfp-score-${supplierId}-${c.id}`}>
              <span className="font-mono text-text-secondary mr-1.5">{criterionLabel(i + 1)}</span>
              {c.name}
            </FieldLabel>
            <Select
              id={`rfp-score-${supplierId}-${c.id}`}
              value={values.scores[c.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, scores: { ...v.scores, [c.id]: e.target.value } }))}
              mono
              data-testid={`rfp-score-${supplierId}-${c.id}`}
            >
              <option value="">{t('sourcing.rfp.score.pick')}</option>
              {SCORE_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <TextInput
              type="text"
              value={values.comments[c.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, comments: { ...v.comments, [c.id]: e.target.value } }))}
              aria-label={t('sourcing.rfp.score.commentFor', { criterion: criterionLabel(i + 1) })}
              placeholder={t('sourcing.rfp.score.comment')}
              className="col-span-2 md:col-span-1"
              data-testid={`rfp-score-comment-${supplierId}-${c.id}`}
            />
          </li>
        ))}
      </ul>
      {!whole && (
        <p className="text-xs text-text-tertiary mt-2" data-testid={`rfp-score-incomplete-${supplierId}`}>
          {t('sourcing.rfp.score.incomplete')}
        </p>
      )}
      <div className="mt-2">
        <Button
          variant="outline"
          icon={Save}
          disabled={mutation.isPending || !whole}
          onClick={handleSave}
          data-testid={`rfp-score-save-${supplierId}`}
        >
          {t('sourcing.rfp.score.save')}
        </Button>
      </div>
    </div>
  );
};

/** The ranking: suppliers × criteria, with weighted totals. */
export const RfpRanking: React.FC<{
  rfq: RFQ;
  supplierNameById: ReadonlyMap<string, string>;
}> = ({ rfq, supplierNameById }) => {
  const { t } = useTranslation();
  const criteria: readonly RfpCriterion[] = rfq.criteria ?? [];
  const sheets = asScoreSheets(rfq.proposalScores);
  const ranking = rfpRankingOf(rfq);
  const grouped = hasGroups(criteria);
  const evaluators = [...new Set(sheets.map((s) => s.evaluatorId))];

  if (ranking.length === 0) {
    return (
      <div
        className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center"
        data-testid="rfp-ranking-empty"
      >
        {t('sourcing.rfp.ranking.empty')}
      </div>
    );
  }

  const th = 'px-2 py-2 font-semibold text-text-secondary border-b border-border-subtle align-top';
  const td = 'px-2 py-2 align-top border-b border-l border-border-subtle';
  return (
    <div data-testid="rfp-ranking">
      <div className="overflow-x-auto border border-border-subtle rounded-md">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-bg-hover text-left">
              <th scope="col" className={th}>{t('sourcing.rfp.ranking.rank')}</th>
              <th scope="col" className={`${th} border-l`}>{t('sourcing.rfi.matrix.supplier')}</th>
              {/* The total sits beside the name: it is what the row is read
                  for, and the criteria scroll under a narrow panel. */}
              <th scope="col" className={`${th} border-l`}>{t('sourcing.rfp.ranking.total')}</th>
              {grouped &&
                RFP_CRITERION_GROUPS.map((g) => (
                  <th key={g} scope="col" className={`${th} border-l`}>
                    {t(`sourcing.rfp.group.${g}`)}
                  </th>
                ))}
              {criteria.map((c, i) => (
                <th
                  key={c.id}
                  scope="col"
                  title={c.name}
                  className={`${th} border-l min-w-[6rem]`}
                  data-testid={`rfp-ranking-head-${c.id}`}
                >
                  <span className="font-mono">{criterionLabel(i + 1)}</span>{' '}
                  <span className="font-normal">{c.name}</span>
                  <span className="block font-mono font-normal text-text-tertiary mt-0.5">
                    {formatNumber(c.weight)}%
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => (
              <tr key={r.supplierId} data-testid={`rfp-ranking-row-${r.supplierId}`}>
                <td
                  className="px-2 py-2 align-top border-b border-border-subtle font-mono text-data-navy"
                  data-testid={`rfp-ranking-rank-${r.supplierId}`}
                >
                  {r.rank ?? t('sourcing.rfp.ranking.unranked')}
                </td>
                <th scope="row" className={`${td} text-left min-w-[10rem]`}>
                  <span className="font-semibold text-text-primary">
                    {supplierNameById.get(r.supplierId) ?? r.supplierId}
                  </span>
                  <span className="block font-normal text-text-tertiary mt-0.5">
                    {t(
                      r.evaluators === 0
                        ? 'sourcing.rfp.ranking.notScored'
                        : r.evaluators === 1
                          ? 'sourcing.rfp.ranking.evaluators.one'
                          : 'sourcing.rfp.ranking.evaluators.other',
                      { count: r.evaluators },
                    )}
                  </span>
                </th>
                <td className={`${td} font-semibold`} data-testid={`rfp-ranking-total-${r.supplierId}`}>
                  <span className="font-mono text-data-navy">
                    {r.total === null ? '—' : scoreText(r.total)}
                  </span>
                </td>
                {grouped &&
                  RFP_CRITERION_GROUPS.map((g) => {
                    const part = groupTotalOf(criteria, sheets, r.supplierId, g);
                    return (
                      <td key={g} className={td} data-testid={`rfp-ranking-${g}-${r.supplierId}`}>
                        <span className="font-mono text-data-navy">{part === null ? '—' : scoreText(part)}</span>
                      </td>
                    );
                  })}
                {criteria.map((c) => {
                  const avg = criterionAverageOf(sheets, r.supplierId, c.id);
                  return (
                    <td key={c.id} className={td} data-testid={`rfp-ranking-cell-${r.supplierId}-${c.id}`}>
                      <span className="font-mono text-data-navy">{avg === null ? '—' : scoreText(avg)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-tertiary mt-2" data-testid="rfp-ranking-note">
        {t('sourcing.rfp.ranking.note')}
      </p>
      {evaluators.length > 0 && (
        <p className="text-xs text-text-tertiary mt-1" data-testid="rfp-ranking-evaluators">
          {t('sourcing.rfp.ranking.scoredBy', {
            people: evaluators.map((id) => personLabel(id, t)).join(', '),
          })}
        </p>
      )}
    </div>
  );
};

const RfpEvaluation: React.FC<{
  rfq: RFQ;
  supplierNameById: ReadonlyMap<string, string>;
}> = ({ rfq, supplierNameById }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('rfq:evaluate');
  const { identity } = useCurrentIdentity();
  const criteria = rfq.criteria ?? [];
  const proposals = rfpProposalsOf(rfq);
  const locked = scoresLockedBy(rfq);
  const atRfp = stageOf(rfq) === 'RFP';
  // WHO IS ACTING, as the key a sheet is found by — read through the same
  // function the store's sheets are, and rendered only through `personLabel`.
  const evaluatorId = evaluatorIdOf({ scoredBy: identity.actor });
  // Scoring is open exactly where the machine takes a score.
  const scoringOpen = atRfp && rfq.status === 'Closed' && locked === undefined;

  // The one line that says why no sheet is offered, or `null` when one is.
  const closedReason: string | null =
    locked !== undefined
      ? t('sourcing.rfp.score.locked', { date: formatDate(locked.advancedAt) })
      : !atRfp
        ? t('sourcing.rfp.score.notYetRfp')
        : rfq.status === 'Open'
          ? t('sourcing.rfp.score.stillOpen')
          : rfq.status !== 'Closed'
            ? t('sourcing.rfp.score.ended')
            : availability.kind === 'held' && evaluatorId === ''
              ? t('sourcing.rfp.score.unnamed')
              : null;

  return (
    <div data-testid="rfp-evaluation">
      <SectionHeading level="group" as="h4" className="mt-4 mb-2">{t('sourcing.rfp.proposals.title')}</SectionHeading>
      {proposals.length === 0 ? (
        <div
          className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center"
          data-testid="rfp-proposals-empty"
        >
          {t(atRfp ? 'sourcing.rfp.proposals.empty' : 'sourcing.rfp.proposals.notYet')}
        </div>
      ) : (
        <>
          {closedReason !== null && (
            <p className="text-xs text-text-secondary mb-2" data-testid="rfp-score-closed-reason">
              {closedReason}
            </p>
          )}
          {scoringOpen && availability.kind !== 'held' && (
            <div className="mb-2">
              <HandoffNotice availability={availability} testId="handoff-rfq-evaluate" />
            </div>
          )}
          <ul className="space-y-3">
            {proposals.map((p) => {
              const name = supplierNameById.get(p.supplierId) ?? p.supplierId;
              return (
                <li
                  key={p.id}
                  className="border border-border-subtle rounded-md p-3"
                  data-testid={`rfp-proposal-${p.supplierId}`}
                >
                  <div className="text-sm font-semibold text-text-primary mb-2">{name}</div>
                  <FieldList columns={1}>
                    {criteria.map((c, i) => (
                      <Field
                        key={c.id}
                        label={
                          <>
                            <span className="mr-1.5">{criterionLabel(i + 1)}</span>
                            {c.name}
                          </>
                        }
                        data-testid={`rfp-proposal-response-${p.supplierId}-${c.id}`}
                      >
                        <span className="whitespace-pre-wrap">
                          {p.proposal?.[c.id] ?? t('sourcing.rfp.proposals.noResponse')}
                        </span>
                      </Field>
                    ))}
                  </FieldList>
                  <div className="text-xs text-text-tertiary mt-2" data-testid={`rfp-proposal-documents-${p.supplierId}`}>
                    {(p.documents ?? []).length === 0 ? (
                      t('sourcing.rfp.proposals.noDocuments')
                    ) : (
                      <>
                        {t('sourcing.rfp.proposals.documents')}{' '}
                        <span className="font-mono text-text-primary">{(p.documents ?? []).join(', ')}</span>
                        {' — '}
                        {t('sourcing.rfp.proposals.documentsNote')}
                      </>
                    )}
                  </div>
                  {p.note && <div className="text-xs text-text-secondary mt-1">{p.note}</div>}
                  {scoringOpen && availability.kind === 'held' && evaluatorId !== '' && (
                    // Keyed by the evaluator: a seat that adopts another person
                    // starts from that person's sheet, not the last one's edits.
                    <ScoreSheet
                      key={`${rfq.id}-${p.supplierId}-${evaluatorId}`}
                      rfq={rfq}
                      supplierId={p.supplierId}
                      supplierName={name}
                      evaluatorId={evaluatorId}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <SectionHeading level="group" as="h4" className="mt-4 mb-2">{t('sourcing.rfp.ranking.title')}</SectionHeading>
          <RfpRanking rfq={rfq} supplierNameById={supplierNameById} />
        </>
      )}
    </div>
  );
};

export default RfpEvaluation;
