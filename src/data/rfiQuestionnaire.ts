// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE RFI QUESTIONNAIRE — what a buyer asks at the RFI stage of a
// sourcing event, and what a supplier answers.
//
// The questionnaire is a list of questions ON THE EVENT (`RFQ.questionnaire`).
// A supplier's answers ride its stage response (`StageResponse.answers`), keyed
// by question id. Nothing here is a second machine: the event's verbs carry the
// questions, the stage response's verbs carry the answers.
//
// Pure: no store, no clock, no i18n. The machine (`policies.ts`), the buyer's
// editor and matrix, and the supplier's form all read these functions and
// nothing else, so "is this question answered", "is this answer one the
// question takes" and "did this supplier pass every knock-out" each have one
// answer. Every refusal is a CODE; the surfaces own the sentences.
// ────────────────────────────────────────────────────────────────────────────

export type RfiQuestionType =
  | 'yes_no'
  | 'single_choice'
  | 'multi_choice'
  | 'number'
  | 'text'
  | 'document';

/** The six, in the order the editor lists them. */
export const RFI_QUESTION_TYPES: readonly RfiQuestionType[] = [
  'yes_no',
  'single_choice',
  'multi_choice',
  'number',
  'text',
  'document',
];

/** Exact membership — never a coercion, never a nearest match. */
export const isRfiQuestionType = (v: unknown): v is RfiQuestionType =>
  typeof v === 'string' && (RFI_QUESTION_TYPES as readonly string[]).includes(v);

/** The two answers of a yes/no question. Stored as tokens, rendered per locale. */
export const YES_NO: readonly ['yes', 'no'] = ['yes', 'no'];

export interface RfiQuestion {
  /** Stable within its questionnaire. Answers are keyed by it. */
  readonly id: string;
  readonly prompt: string;
  readonly type: RfiQuestionType;
  /** A required question left unanswered refuses the submit, by name. */
  readonly required: boolean;
  /** The choices of a single- or multiple-choice question. Absent on the rest. */
  readonly options?: readonly string[];
  /** The unit a number is asked in. Present on a number question only. */
  readonly unit?: string;
  /**
   * THE KNOCK-OUT ANSWER — the answer that takes a supplier out of
   * consideration: `yes` or `no` on a yes/no question, one of the options on a
   * choice question (ticking it, on a multiple choice). Absent = the question
   * knocks nobody out. THE BUYER'S ONLY: a supplier's read of the questionnaire
   * does not carry it (`rfqSupplierView.ts`).
   */
  readonly knockout?: string;
}

/**
 * One answer. `yes` | `no`; the chosen option; the ticked options; the number;
 * the text; or — for a document question — THE FILE'S NAME ONLY. No file is
 * uploaded or kept: this portal has no document store behind the questionnaire.
 */
export type RfiAnswer = string | number | readonly string[];
export type RfiAnswers = Readonly<Record<string, RfiAnswer>>;

const takesOptions = (type: RfiQuestionType): boolean =>
  type === 'single_choice' || type === 'multi_choice';

/** May a question of this type carry a knock-out answer? */
export const takesKnockout = (type: RfiQuestionType): boolean =>
  type === 'yes_no' || takesOptions(type);

/** The answers a knock-out may name on this question: yes/no, or its options. */
export function knockoutChoicesOf(q: Pick<RfiQuestion, 'type' | 'options'>): readonly string[] {
  if (q.type === 'yes_no') return YES_NO;
  return takesOptions(q.type) ? distinctOptions(q.options) : [];
}

/** The options as stored: trimmed, blanks dropped, once each, in order. */
function distinctOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  const seen: string[] = [];
  for (const o of options) {
    if (typeof o !== 'string') continue;
    const v = o.trim();
    if (v !== '' && !seen.includes(v)) seen.push(v);
  }
  return seen;
}

// ── THE QUESTIONNAIRE: is it one a supplier can be asked? ───────────────────

export type QuestionProblemCode =
  | 'NOT_A_LIST'
  | 'ID_MISSING'
  | 'ID_DUPLICATE'
  | 'PROMPT_MISSING'
  | 'TYPE_UNKNOWN'
  | 'OPTIONS_TOO_FEW'
  | 'UNIT_MISSING'
  | 'KNOCKOUT_NOT_TAKEN'
  | 'KNOCKOUT_NOT_AN_ANSWER'
  | 'KNOCKOUT_NOT_REQUIRED';

export interface QuestionProblem {
  /** The question's position, counted from 1. `0` when the list itself is wrong. */
  readonly number: number;
  readonly code: QuestionProblemCode;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The first thing wrong with one question, or `null`. `seenIds` are the ids before it. */
function problemOfQuestion(raw: unknown, seenIds: readonly string[]): QuestionProblemCode | null {
  if (typeof raw !== 'object' || raw === null) return 'TYPE_UNKNOWN';
  const q = raw as Record<string, unknown>;
  const id = text(q.id);
  if (id === '') return 'ID_MISSING';
  if (seenIds.includes(id)) return 'ID_DUPLICATE';
  if (text(q.prompt) === '') return 'PROMPT_MISSING';
  if (!isRfiQuestionType(q.type)) return 'TYPE_UNKNOWN';
  if (takesOptions(q.type) && distinctOptions(q.options).length < 2) return 'OPTIONS_TOO_FEW';
  if (q.type === 'number' && text(q.unit) === '') return 'UNIT_MISSING';
  const knockout = text(q.knockout);
  if (knockout !== '') {
    if (!takesKnockout(q.type)) return 'KNOCKOUT_NOT_TAKEN';
    if (!knockoutChoicesOf({ type: q.type, options: distinctOptions(q.options) }).includes(knockout)) {
      return 'KNOCKOUT_NOT_AN_ANSWER';
    }
    // A knock-out on a question a supplier may skip is passed by skipping it.
    if (q.required !== true) return 'KNOCKOUT_NOT_REQUIRED';
  }
  return null;
}

/**
 * The first thing wrong with a stated questionnaire, or `null` when it is one a
 * supplier can be asked. An EMPTY list is well-formed: it asks nothing, which
 * is how a buyer takes a questionnaire off a draft.
 */
export function questionnaireProblemOf(raw: unknown): QuestionProblem | null {
  if (!Array.isArray(raw)) return { number: 0, code: 'NOT_A_LIST' };
  const seen: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const code = problemOfQuestion(raw[i], seen);
    if (code !== null) return { number: i + 1, code };
    seen.push(text((raw[i] as Record<string, unknown>).id));
  }
  return null;
}

/**
 * A well-formed questionnaire AS STORED: text trimmed, and each question
 * carrying only the fields its type takes — no options on a number question,
 * no unit on a choice. Call it after `questionnaireProblemOf` returned `null`.
 */
export function normalizeQuestionnaire(raw: readonly unknown[]): RfiQuestion[] {
  return raw.map((r) => {
    const q = r as Record<string, unknown>;
    const type = q.type as RfiQuestionType;
    const knockout = text(q.knockout);
    return {
      id: text(q.id),
      prompt: text(q.prompt),
      type,
      required: q.required === true,
      ...(takesOptions(type) ? { options: distinctOptions(q.options) } : {}),
      ...(type === 'number' ? { unit: text(q.unit) } : {}),
      ...(knockout !== '' ? { knockout } : {}),
    };
  });
}

// ── THE ANSWERS ─────────────────────────────────────────────────────────────

/**
 * Has `answer` said anything? A blank text, an empty tick-list and an absent
 * key are all "not answered" — which is what a draft holds for a question the
 * supplier has not reached, and what a required question refuses at submit.
 */
export function isAnswered(answer: RfiAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'number') return Number.isFinite(answer);
  if (typeof answer === 'string') return answer.trim() !== '';
  return Array.isArray(answer) && answer.length > 0;
}

/** Is `answer` one this question takes? Asked only of an answer that says something. */
function answerFits(q: RfiQuestion, answer: RfiAnswer): boolean {
  switch (q.type) {
    case 'yes_no':
      return answer === 'yes' || answer === 'no';
    case 'single_choice':
      return typeof answer === 'string' && (q.options ?? []).includes(answer);
    case 'multi_choice':
      return (
        Array.isArray(answer) &&
        answer.every((a) => typeof a === 'string' && (q.options ?? []).includes(a)) &&
        new Set(answer).size === answer.length
      );
    case 'number':
      return typeof answer === 'number' && Number.isFinite(answer);
    case 'text':
    case 'document':
      return typeof answer === 'string';
  }
}

export type AnswerProblemCode = 'NOT_A_MAP' | 'UNKNOWN_QUESTION' | 'WRONG_KIND';

export interface AnswerProblem {
  /** The key the answer was given under. Empty when the map itself is wrong. */
  readonly questionId: string;
  /** The question's position from 1, or `0` when it is not on the questionnaire. */
  readonly number: number;
  readonly code: AnswerProblemCode;
}

/**
 * The first answer that is not one its question takes, or `null`. An absent
 * `answers` is no answers. An answer that says nothing is not a problem here —
 * a draft holds those; whether it may be SUBMITTED is `unansweredRequiredOf`.
 */
export function answersProblemOf(
  questions: readonly RfiQuestion[],
  raw: unknown,
): AnswerProblem | null {
  if (raw === undefined) return null;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { questionId: '', number: 0, code: 'NOT_A_MAP' };
  }
  for (const [questionId, answer] of Object.entries(raw as Record<string, unknown>)) {
    const index = questions.findIndex((q) => q.id === questionId);
    if (index < 0) return { questionId, number: 0, code: 'UNKNOWN_QUESTION' };
    if (!isAnswered(answer as RfiAnswer)) {
      // Says nothing — but it must still be a kind an answer can be.
      const kind = typeof answer;
      if (
        answer !== null &&
        answer !== undefined &&
        kind !== 'string' &&
        kind !== 'number' &&
        !Array.isArray(answer)
      ) {
        return { questionId, number: index + 1, code: 'WRONG_KIND' };
      }
      continue;
    }
    if (!answerFits(questions[index], answer as RfiAnswer)) {
      return { questionId, number: index + 1, code: 'WRONG_KIND' };
    }
  }
  return null;
}

/**
 * The answers AS STORED: the ones that say something, text trimmed, in the
 * questionnaire's own order. Call it after `answersProblemOf` returned `null`.
 */
export function normalizeAnswers(questions: readonly RfiQuestion[], raw: unknown): RfiAnswers {
  const given = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, RfiAnswer>;
  const kept: Record<string, RfiAnswer> = {};
  for (const q of questions) {
    const a = given[q.id];
    if (!isAnswered(a)) continue;
    kept[q.id] = typeof a === 'string' ? a.trim() : Array.isArray(a) ? [...a] : a;
  }
  return kept;
}

/** The required questions `answers` leaves unanswered, in the questionnaire's order. */
export function unansweredRequiredOf(
  questions: readonly RfiQuestion[],
  answers: RfiAnswers | undefined,
): RfiQuestion[] {
  return questions.filter((q) => q.required && !isAnswered(answers?.[q.id]));
}

// ── THE KNOCK-OUTS ──────────────────────────────────────────────────────────

/** Did this answer give the question's knock-out answer? */
export function isKnockedOutBy(q: RfiQuestion, answer: RfiAnswer | undefined): boolean {
  if (q.knockout === undefined || answer === undefined) return false;
  return Array.isArray(answer) ? answer.includes(q.knockout) : answer === q.knockout;
}

/** The questions whose knock-out answer `answers` gave, in the questionnaire's order. */
export function knockoutFailuresOf(
  questions: readonly RfiQuestion[],
  answers: RfiAnswers | undefined,
): RfiQuestion[] {
  return questions.filter((q) => isKnockedOutBy(q, answers?.[q.id]));
}

/** Does the questionnaire carry any knock-out at all? */
export const hasKnockouts = (questions: readonly RfiQuestion[]): boolean =>
  questions.some((q) => q.knockout !== undefined);

/** `Q3` — how a question is named wherever one is named: its position, from 1. */
export const questionLabel = (number: number): string => `Q${number}`;
