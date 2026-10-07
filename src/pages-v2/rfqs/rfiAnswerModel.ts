// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE SUPPLIER'S ANSWER FORM, AS A MODEL — what the form holds while a
// supplier types, what it sends, and the sentence for each refusal.
//
// Pure: no React, no store. `RfiAnswerForm` renders this and the buyer's matrix
// reads `answerText`, so an answer reads the same on both sides of the event.
// ────────────────────────────────────────────────────────────────────────────

import type { TFunction } from 'i18next';
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { refusedByPolicy } from '../../services/transitions/refusalMessage';
import { formatNumber } from '../../lib/format';
import {
  isAnswered,
  questionLabel,
  type RfiAnswer,
  type RfiAnswers,
  type RfiQuestion,
} from '../../data/rfiQuestionnaire';

/**
 * What the form holds per question while it is being typed: the ticked options
 * of a multiple choice, and TEXT for everything else — a number included, so a
 * half-typed "12." is not lost to a parse on every keystroke.
 */
export type RfiFormValues = Readonly<Record<string, string | readonly string[]>>;

/** The form's starting values: the saved draft's answers, or nothing. */
export function formValuesOf(
  questions: readonly RfiQuestion[],
  answers: RfiAnswers | undefined,
): Record<string, string | readonly string[]> {
  const values: Record<string, string | readonly string[]> = {};
  for (const q of questions) {
    const a = answers?.[q.id];
    if (!isAnswered(a)) continue;
    values[q.id] = typeof a === 'number' ? String(a) : (a as string | readonly string[]);
  }
  return values;
}

/**
 * The answers the form SENDS. A blank is not sent. A number question's text is
 * sent as a number when it reads as one and AS TYPED when it does not — so the
 * machine refuses "lots" by name rather than this function quietly dropping it.
 */
export function answersOfForm(
  questions: readonly RfiQuestion[],
  values: RfiFormValues,
): Record<string, RfiAnswer> {
  const answers: Record<string, RfiAnswer> = {};
  for (const q of questions) {
    const v = values[q.id];
    if (v === undefined) continue;
    if (typeof v !== 'string') {
      if (v.length > 0) answers[q.id] = [...v];
      continue;
    }
    const text = v.trim();
    if (text === '') continue;
    if (q.type === 'number') {
      const n = Number(text);
      answers[q.id] = Number.isFinite(n) ? n : text;
    } else {
      answers[q.id] = text;
    }
  }
  return answers;
}

/** One answer as it is read back, on the supplier's card and in the buyer's matrix. */
export function answerText(
  q: RfiQuestion,
  answer: RfiAnswer | undefined,
  words: { readonly yes: string; readonly no: string },
): string | null {
  if (!isAnswered(answer)) return null;
  if (q.type === 'yes_no') return answer === 'yes' ? words.yes : words.no;
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'number') return `${formatNumber(answer)} ${q.unit ?? ''}`.trim();
  return String(answer);
}

/** `Q2 "Which resin do you run?"` for each question, as a refusal names them. */
export const namedQuestions = (
  all: readonly RfiQuestion[],
  some: readonly RfiQuestion[],
): string => some.map((q) => `${questionLabel(all.indexOf(q) + 1)} “${q.prompt}”`).join('; ');

/**
 * The refusals of a stage response, in the supplier's own words. Keyed on the
 * HOOK (`refusedByPolicy`), never on the text inside its reason: the machine's
 * sentence names ids and is for the audit trail. The four RFx-1 checks and the
 * three RFx-2 ones, one sentence each.
 */
export function interestRefusalKey(reason: string | undefined): string | null {
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN)) {
    return 'rfqs.refusal.interestEventNotOpen';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_STAGE_TAKES_INTEREST)) {
    return 'rfqs.refusal.stageTakesQuotations';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE)) {
    return 'rfqs.refusal.interestDeadlinePassed';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE)) {
    return 'rfqs.refusal.interestAlreadyRecorded';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_DRAFT_STAGE_CURRENT)) {
    return 'rfqs.refusal.draftStageOver';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED)) {
    return 'rfqs.refusal.answerInvalid';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED)) {
    return 'rfqs.refusal.requiredUnanswered';
  }
  return null;
}

/** Was this the "a required question is unanswered" refusal? The form marks them. */
export const refusedForRequired = (reason: string | undefined): boolean =>
  refusedByPolicy(reason, POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED);

/** The yes/no words in the reader's language. */
export const yesNoWords = (t: TFunction): { yes: string; no: string } => ({
  yes: t('rfqs.rfi.yes'),
  no: t('rfqs.rfi.no'),
});
