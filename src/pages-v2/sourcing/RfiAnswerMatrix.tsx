// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE BUYER'S ANSWER MATRIX — suppliers down, questions across.
//
// One row per supplier that SUBMITTED answers at the RFI stage (a draft is not
// here: the event row never holds one), one column per question. A cell whose
// answer is the question's knock-out answer is marked — with words and a
// border, not colour alone — and the row says whether the supplier passed
// every knock-out or which questions it failed.
//
// IT REPORTS; IT DOES NOT DECIDE. A failed knock-out removes nobody: the buyer
// chooses the shortlist on the advance form, where the suppliers who passed
// are pre-selected and any name can still be ticked or unticked.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RFQ } from '../../services/data/types';
import {
  hasKnockouts,
  isKnockedOutBy,
  knockoutFailuresOf,
  questionLabel,
  type RfiQuestion,
} from '../../data/rfiQuestionnaire';
import type { StageResponse } from '../../data/rfqStage';
import { answerText } from '../rfqs/rfiAnswerModel';

/** The answers suppliers submitted at this event's RFI stage, in the order they arrived. */
export const rfiAnswersOf = (rfq: Pick<RFQ, 'stageResponses'>): readonly StageResponse[] =>
  (rfq.stageResponses ?? []).filter((r) => r.stage === 'RFI');

/**
 * The suppliers among `responderIds` whose RFI answers gave no knock-out
 * answer — the shortlist the advance form starts from. With no knock-out on
 * the questionnaire, everybody who answered.
 */
export function passedEveryKnockout(
  rfq: Pick<RFQ, 'stageResponses' | 'questionnaire'>,
  responderIds: readonly string[],
): string[] {
  const questions = rfq.questionnaire ?? [];
  const answers = rfiAnswersOf(rfq);
  return responderIds.filter((id) => {
    const mine = answers.find((a) => a.supplierId === id);
    return knockoutFailuresOf(questions, mine?.answers).length === 0;
  });
}

/** `Q1, Q4` — the knock-out questions this supplier failed, or `''`. */
export function failedKnockoutLabels(
  questions: readonly RfiQuestion[],
  response: StageResponse | undefined,
): string {
  return knockoutFailuresOf(questions, response?.answers)
    .map((q) => questionLabel(questions.indexOf(q) + 1))
    .join(', ');
}

const RfiAnswerMatrix: React.FC<{
  rfq: RFQ;
  supplierNameById: ReadonlyMap<string, string>;
}> = ({ rfq, supplierNameById }) => {
  const { t } = useTranslation();
  const questions = rfq.questionnaire ?? [];
  const rows = rfiAnswersOf(rfq);
  const words = { yes: t('sourcing.rfi.yes'), no: t('sourcing.rfi.no') };
  const knockouts = hasKnockouts(questions);

  if (rows.length === 0) {
    return (
      <div
        className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center"
        data-testid="rfi-matrix-empty"
      >
        {t('sourcing.rfi.matrix.empty')}
      </div>
    );
  }

  return (
    <div data-testid="rfi-matrix">
      <div className="overflow-x-auto border border-border-subtle rounded-md">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-bg-hover text-left">
              <th scope="col" className="px-2 py-2 font-semibold text-text-secondary border-b border-border-subtle">
                {t('sourcing.rfi.matrix.supplier')}
              </th>
              {questions.map((q, i) => (
                <th
                  key={q.id}
                  scope="col"
                  title={q.prompt}
                  className="px-2 py-2 font-semibold text-text-secondary border-b border-l border-border-subtle align-top min-w-[7rem]"
                  data-testid={`rfi-matrix-head-${q.id}`}
                >
                  <span className="font-mono">{questionLabel(i + 1)}</span>{' '}
                  <span className="font-normal">{q.prompt}</span>
                  {q.knockout !== undefined && (
                    <span className="block font-normal text-text-tertiary mt-0.5">
                      {t('sourcing.rfi.matrix.knockoutIs', {
                        answer: answerText(q, q.knockout, words) ?? q.knockout,
                      })}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const failed = failedKnockoutLabels(questions, r);
              return (
                <tr key={r.id} data-testid={`rfi-matrix-row-${r.supplierId}`}>
                  <th scope="row" className="px-2 py-2 text-left align-top border-b border-border-subtle min-w-[10rem]">
                    <span className="font-semibold text-text-primary">
                      {supplierNameById.get(r.supplierId) ?? r.supplierId}
                    </span>
                    {knockouts && (
                      <span
                        className={`block font-semibold mt-0.5 ${failed ? 'text-danger' : 'text-success'}`}
                        data-testid={`rfi-matrix-verdict-${r.supplierId}`}
                      >
                        {failed
                          ? t('sourcing.rfi.matrix.failed', { questions: failed })
                          : t('sourcing.rfi.matrix.passed')}
                      </span>
                    )}
                  </th>
                  {questions.map((q) => {
                    const out = isKnockedOutBy(q, r.answers?.[q.id]);
                    return (
                      <td
                        key={q.id}
                        className={`px-2 py-2 align-top border-b border-l border-border-subtle ${
                          out ? 'bg-danger-soft border-l-2 border-l-danger' : ''
                        }`}
                        data-testid={`rfi-matrix-cell-${r.supplierId}-${q.id}`}
                        data-knockout={out ? 'true' : undefined}
                      >
                        <span className={q.type === 'number' ? 'font-mono text-data-navy' : 'text-text-primary'}>
                          {answerText(q, r.answers?.[q.id], words) ?? t('sourcing.rfi.matrix.noAnswer')}
                        </span>
                        {out && (
                          <span className="block font-semibold text-danger mt-0.5">
                            {t('sourcing.rfi.matrix.knockedOut')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-tertiary mt-2" data-testid="rfi-matrix-note">
        {t(knockouts ? 'sourcing.rfi.matrix.note' : 'sourcing.rfi.matrix.noteNoKnockout')}
      </p>
    </div>
  );
};

export default RfiAnswerMatrix;
