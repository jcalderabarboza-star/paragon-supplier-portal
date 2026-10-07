// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · THE RFP — what a buyer weighs a proposal on, what a supplier proposes,
// and what an evaluator scores.
//
// The criteria are a list ON THE EVENT (`RFQ.criteria`), each with a weight;
// the weights are percentages and sum to 100. A supplier's proposal rides its
// stage response (`StageResponse.proposal`, `.documents`): one text per
// criterion, and the NAMES of the documents it refers to. An evaluator's scores
// are a sheet on the event (`RFQ.proposalScores`): one score from 1 to 5 per
// criterion, for one supplier, by one named person.
//
// Pure: no store, no clock, no i18n. The machine (`policies.ts`), the buyer's
// editor, score sheet and ranking, and the supplier's form all read these
// functions and nothing else, so "do the weights sum to 100", "is this a whole
// score sheet" and "what is this supplier's weighted total" each have one
// answer. Every refusal is a CODE; the surfaces own the sentences.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../lib/enforcement';

export type RfpCriterionGroup = 'technical' | 'commercial';

/** The two, in the order the ranking lists them. */
export const RFP_CRITERION_GROUPS: readonly RfpCriterionGroup[] = ['technical', 'commercial'];

/** Exact membership — never a coercion, never a nearest match. */
export const isRfpCriterionGroup = (v: unknown): v is RfpCriterionGroup =>
  typeof v === 'string' && (RFP_CRITERION_GROUPS as readonly string[]).includes(v);

export interface RfpCriterion {
  /** Stable within its event. A proposal and a score are keyed by it. */
  readonly id: string;
  readonly name: string;
  /** A percentage of the whole, above 0. The weights of an event sum to 100. */
  readonly weight: number;
  /** A required criterion left without a response refuses the submit, by name. */
  readonly required: boolean;
  /** The optional split. Absent = the criterion belongs to neither part. */
  readonly group?: RfpCriterionGroup;
}

/** The weights sum to this. */
export const WEIGHT_TOTAL = 100;
/** A score is a whole number from this … */
export const SCORE_MIN = 1;
/** … to this. */
export const SCORE_MAX = 5;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Hundredths of a percent, so 33.33 + 33.33 + 33.34 is exactly 100. */
const hundredths = (weight: number): number => Math.round(weight * 100);

/** The sum of the weights, to two decimals. */
export function weightSumOf(criteria: readonly { readonly weight: number }[]): number {
  return criteria.reduce((sum, c) => sum + hundredths(c.weight), 0) / 100;
}

// ── THE CRITERIA: is this a list a proposal can be weighed on? ──────────────

export type CriterionProblemCode =
  | 'NOT_A_LIST'
  | 'ID_MISSING'
  | 'ID_DUPLICATE'
  | 'NAME_MISSING'
  | 'WEIGHT_INVALID'
  | 'GROUP_UNKNOWN';

export interface CriterionProblem {
  /** The criterion's position, counted from 1. `0` when the list itself is wrong. */
  readonly number: number;
  readonly code: CriterionProblemCode;
}

/** A weight is a number above 0, at most 100, stated to two decimals at most. */
const weightFits = (v: unknown): v is number =>
  typeof v === 'number' &&
  Number.isFinite(v) &&
  v > 0 &&
  v <= WEIGHT_TOTAL &&
  Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

function problemOfCriterion(raw: unknown, seenIds: readonly string[]): CriterionProblemCode | null {
  if (typeof raw !== 'object' || raw === null) return 'ID_MISSING';
  const c = raw as Record<string, unknown>;
  const id = text(c.id);
  if (id === '') return 'ID_MISSING';
  if (seenIds.includes(id)) return 'ID_DUPLICATE';
  if (text(c.name) === '') return 'NAME_MISSING';
  if (!weightFits(c.weight)) return 'WEIGHT_INVALID';
  if (c.group !== undefined && c.group !== '' && !isRfpCriterionGroup(c.group)) return 'GROUP_UNKNOWN';
  return null;
}

/**
 * The first thing wrong with one criterion of a stated list, or `null`. It does
 * NOT read the sum: whether the weights make 100 is `weightsProblemOf`, a
 * separate rule with its own refusal. An EMPTY list is well-formed — it is how
 * a buyer takes the criteria off a draft.
 */
export function criteriaProblemOf(raw: unknown): CriterionProblem | null {
  if (!Array.isArray(raw)) return { number: 0, code: 'NOT_A_LIST' };
  const seen: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const code = problemOfCriterion(raw[i], seen);
    if (code !== null) return { number: i + 1, code };
    seen.push(text((raw[i] as Record<string, unknown>).id));
  }
  return null;
}

/**
 * The sum the weights make when it is not 100, or `null` when it is — or when
 * the list is empty, which weighs nothing. Call it on a list
 * `criteriaProblemOf` passed.
 */
export function weightsProblemOf(raw: readonly unknown[]): { readonly sum: number } | null {
  if (raw.length === 0) return null;
  const sum = weightSumOf(raw as readonly { weight: number }[]);
  return hundredths(sum) === WEIGHT_TOTAL * 100 ? null : { sum };
}

/** Well-formed criteria AS STORED: text trimmed, a group only when one is stated. */
export function normalizeCriteria(raw: readonly unknown[]): RfpCriterion[] {
  return raw.map((r) => {
    const c = r as Record<string, unknown>;
    return {
      id: text(c.id),
      name: text(c.name),
      weight: hundredths(c.weight as number) / 100,
      required: c.required === true,
      ...(isRfpCriterionGroup(c.group) ? { group: c.group } : {}),
    };
  });
}

/** Does the list split its criteria into technical and commercial at all? */
export const hasGroups = (criteria: readonly RfpCriterion[]): boolean =>
  criteria.some((c) => c.group !== undefined);

/** `C3` — how a criterion is named wherever one is named: its position, from 1. */
export const criterionLabel = (number: number): string => `C${number}`;

// ── THE PROPOSAL ────────────────────────────────────────────────────────────

/** One text per criterion, keyed by criterion id. */
export type RfpProposal = Readonly<Record<string, string>>;

export type ProposalProblemCode =
  | 'NOT_A_MAP'
  | 'UNKNOWN_CRITERION'
  | 'NOT_TEXT'
  | 'DOCUMENTS_NOT_A_LIST'
  | 'DOCUMENT_NOT_A_NAME'
  | 'DOCUMENTS_NOT_TAKEN';

export interface ProposalProblem {
  /** The key the response was given under. Empty when it is not about one. */
  readonly criterionId: string;
  /** The criterion's position from 1, or `0`. */
  readonly number: number;
  readonly code: ProposalProblemCode;
}

/**
 * The first thing wrong with a stated proposal and its document names, or
 * `null`. Absent is nothing stated. A blank response is not a problem here — a
 * draft holds those; whether it may be SUBMITTED is `unansweredCriteriaOf`.
 * With no criteria (`[]`) nothing is asked, so any response and any document
 * name is refused: the event takes no proposal at this stage.
 */
export function proposalProblemOf(
  criteria: readonly RfpCriterion[],
  proposal: unknown,
  documents: unknown,
): ProposalProblem | null {
  if (proposal !== undefined) {
    if (typeof proposal !== 'object' || proposal === null || Array.isArray(proposal)) {
      return { criterionId: '', number: 0, code: 'NOT_A_MAP' };
    }
    for (const [criterionId, response] of Object.entries(proposal as Record<string, unknown>)) {
      const index = criteria.findIndex((c) => c.id === criterionId);
      if (index < 0) return { criterionId, number: 0, code: 'UNKNOWN_CRITERION' };
      if (response !== undefined && response !== null && typeof response !== 'string') {
        return { criterionId, number: index + 1, code: 'NOT_TEXT' };
      }
    }
  }
  if (documents !== undefined) {
    if (!Array.isArray(documents)) return { criterionId: '', number: 0, code: 'DOCUMENTS_NOT_A_LIST' };
    if (documents.some((d) => typeof d !== 'string')) {
      return { criterionId: '', number: 0, code: 'DOCUMENT_NOT_A_NAME' };
    }
    if (criteria.length === 0 && documents.some((d) => text(d) !== '')) {
      return { criterionId: '', number: 0, code: 'DOCUMENTS_NOT_TAKEN' };
    }
  }
  return null;
}

/** The proposal AS STORED: the responses that say something, trimmed, in the criteria's order. */
export function normalizeProposal(criteria: readonly RfpCriterion[], raw: unknown): RfpProposal {
  const given = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const kept: Record<string, string> = {};
  for (const c of criteria) {
    const v = text(given[c.id]);
    if (v !== '') kept[c.id] = v;
  }
  return kept;
}

/**
 * The document names AS STORED: trimmed, blanks dropped, once each, in order.
 * NAMES ONLY — no file is uploaded or kept: there is no document store behind
 * a proposal.
 */
export function normalizeDocuments(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen: string[] = [];
  for (const d of raw) {
    const v = text(d);
    if (v !== '' && !seen.includes(v)) seen.push(v);
  }
  return seen;
}

/** The required criteria `proposal` leaves without a response, in the criteria's order. */
export function unansweredCriteriaOf(
  criteria: readonly RfpCriterion[],
  proposal: RfpProposal | undefined,
): RfpCriterion[] {
  return criteria.filter((c) => c.required && text(proposal?.[c.id]) === '');
}

// ── THE SCORES ──────────────────────────────────────────────────────────────

export interface CriterionScore {
  readonly criterionId: string;
  /** A whole number from `SCORE_MIN` to `SCORE_MAX`. */
  readonly score: number;
  readonly comment?: string;
}

/**
 * One evaluator's scores for one supplier's proposal, as the pure functions
 * read it. The stored sheet (`RFQ.proposalScores`) adds who and when; nothing
 * here reads either, except that `evaluatorId` tells two sheets apart.
 */
export interface ScoreSheetLike {
  readonly supplierId: string;
  readonly evaluatorId: string;
  readonly scores: readonly CriterionScore[];
}

export type ScoreProblemCode =
  | 'NO_CRITERIA'
  | 'NOT_A_LIST'
  | 'NOT_A_SCORE'
  | 'UNKNOWN_CRITERION'
  | 'CRITERION_TWICE'
  | 'OUT_OF_RANGE'
  | 'COMMENT_NOT_TEXT'
  | 'CRITERION_UNSCORED';

export interface ScoreProblem {
  readonly criterionId: string;
  /** The criterion's position from 1, or `0`. */
  readonly number: number;
  readonly code: ScoreProblemCode;
}

/** A score is a whole number from 1 to 5. Never a string, never 4.5. */
export const isScore = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= SCORE_MIN && v <= SCORE_MAX;

/**
 * The first thing wrong with a stated score sheet, or `null`. A sheet is WHOLE:
 * every criterion scored once. A weighted total over some of the criteria is
 * not comparable with one over all of them, so a partial sheet is refused
 * rather than averaged.
 */
export function scoresProblemOf(criteria: readonly RfpCriterion[], raw: unknown): ScoreProblem | null {
  if (criteria.length === 0) return { criterionId: '', number: 0, code: 'NO_CRITERIA' };
  if (!Array.isArray(raw)) return { criterionId: '', number: 0, code: 'NOT_A_LIST' };
  const seen: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      return { criterionId: '', number: 0, code: 'NOT_A_SCORE' };
    }
    const s = entry as Record<string, unknown>;
    const criterionId = text(s.criterionId);
    const index = criteria.findIndex((c) => c.id === criterionId);
    if (index < 0) return { criterionId, number: 0, code: 'UNKNOWN_CRITERION' };
    if (seen.includes(criterionId)) return { criterionId, number: index + 1, code: 'CRITERION_TWICE' };
    if (!isScore(s.score)) return { criterionId, number: index + 1, code: 'OUT_OF_RANGE' };
    if (s.comment !== undefined && s.comment !== null && typeof s.comment !== 'string') {
      return { criterionId, number: index + 1, code: 'COMMENT_NOT_TEXT' };
    }
    seen.push(criterionId);
  }
  const unscored = criteria.findIndex((c) => !seen.includes(c.id));
  return unscored < 0
    ? null
    : { criterionId: criteria[unscored].id, number: unscored + 1, code: 'CRITERION_UNSCORED' };
}

/** The scores AS STORED: in the criteria's order, a comment only when it says something. */
export function normalizeScores(criteria: readonly RfpCriterion[], raw: readonly unknown[]): CriterionScore[] {
  const given = raw as readonly Record<string, unknown>[];
  return criteria.map((c) => {
    const s = given.find((x) => text(x.criterionId) === c.id) as Record<string, unknown>;
    const comment = text(s.comment);
    return { criterionId: c.id, score: s.score as number, ...(comment ? { comment } : {}) };
  });
}

/**
 * ONE EVALUATOR'S SHEET AS THE EVENT KEEPS IT. `scoredBy` is the seat's own
 * actor, written by the store from the session and never from a payload — the
 * dispatcher refuses the key (`ATTRIBUTION_KEYS`). That is what makes "an
 * evaluator cannot change another's score" a property of the store: a sheet is
 * found by WHO IS ACTING, so the only sheet a person can replace is their own.
 */
export interface ProposalScoreSheet {
  readonly supplierId: string;
  readonly scoredBy: ActorAttribution;
  /** The day of the act (`YYYY-MM-DD`), store-assigned. */
  readonly scoredAt: string;
  readonly scores: readonly CriterionScore[];
}

/** The person a sheet is by, or `''` — which no acting person's id equals. */
export const evaluatorIdOf = (sheet: Pick<ProposalScoreSheet, 'scoredBy'>): string =>
  sheet.scoredBy.kind === 'RESOLVED' ? sheet.scoredBy.person.personId : '';

/** The stored sheets as the totals read them. */
export const asScoreSheets = (sheets: readonly ProposalScoreSheet[] | undefined): ScoreSheetLike[] =>
  (sheets ?? []).map((s) => ({
    supplierId: s.supplierId,
    evaluatorId: evaluatorIdOf(s),
    scores: s.scores,
  }));

// ── THE TOTALS ──────────────────────────────────────────────────────────────

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * ONE EVALUATOR'S WEIGHTED TOTAL: each score times its criterion's weight, on
 * the 1–5 scale. Over `criteria` only — pass a group's criteria for a part.
 * `null` when a criterion in `criteria` is not on the sheet.
 */
function sheetTotal(criteria: readonly RfpCriterion[], sheet: ScoreSheetLike): number | null {
  let sum = 0;
  for (const c of criteria) {
    const s = sheet.scores.find((x) => x.criterionId === c.id);
    if (!s) return null;
    sum += (c.weight / WEIGHT_TOTAL) * s.score;
  }
  return sum;
}

/** The sheets written for `supplierId`, one per evaluator. */
export const sheetsFor = <S extends ScoreSheetLike>(sheets: readonly S[], supplierId: string): S[] =>
  sheets.filter((s) => s.supplierId === supplierId);

const mean = (values: readonly number[]): number =>
  values.reduce((a, b) => a + b, 0) / values.length;

/**
 * A SUPPLIER'S WEIGHTED TOTAL: the average, over the evaluators who scored it,
 * of each evaluator's own weighted total. On the 1–5 scale, to two decimals.
 * `null` while nobody has scored it.
 */
export function weightedTotalOf(
  criteria: readonly RfpCriterion[],
  sheets: readonly ScoreSheetLike[],
  supplierId: string,
): number | null {
  const totals = sheetsFor(sheets, supplierId)
    .map((s) => sheetTotal(criteria, s))
    .filter((t): t is number => t !== null);
  return totals.length === 0 ? null : round2(mean(totals));
}

/** The average score one criterion received for `supplierId`, or `null` unscored. */
export function criterionAverageOf(
  sheets: readonly ScoreSheetLike[],
  supplierId: string,
  criterionId: string,
): number | null {
  const scores = sheetsFor(sheets, supplierId)
    .map((s) => s.scores.find((x) => x.criterionId === criterionId)?.score)
    .filter((v): v is number => v !== undefined);
  return scores.length === 0 ? null : round2(mean(scores));
}

/**
 * One part's contribution to the weighted total — the technical criteria's, or
 * the commercial ones' — averaged over the evaluators. The parts of a fully
 * grouped list add up to the total. `null` while nobody has scored, or when the
 * list has no criterion in the group.
 */
export function groupTotalOf(
  criteria: readonly RfpCriterion[],
  sheets: readonly ScoreSheetLike[],
  supplierId: string,
  group: RfpCriterionGroup,
): number | null {
  const part = criteria.filter((c) => c.group === group);
  return part.length === 0 ? null : weightedTotalOf(part, sheets, supplierId);
}

export interface RankedSupplier {
  readonly supplierId: string;
  /** The weighted total, or `null` while nobody has scored the proposal. */
  readonly total: number | null;
  /** Position from 1 among the scored; equal totals share one. `null` unscored. */
  readonly rank: number | null;
  /** How many evaluators scored it. */
  readonly evaluators: number;
}

/**
 * The suppliers by weighted total, highest first. Equal totals share a rank
 * and the next rank skips (1, 1, 3). A proposal nobody has scored is listed
 * last, in the order given, with no rank.
 */
export function rankingOf(
  criteria: readonly RfpCriterion[],
  sheets: readonly ScoreSheetLike[],
  supplierIds: readonly string[],
): RankedSupplier[] {
  const rows = supplierIds.map((supplierId) => ({
    supplierId,
    total: weightedTotalOf(criteria, sheets, supplierId),
    evaluators: sheetsFor(sheets, supplierId).length,
  }));
  const scored = rows
    .filter((r): r is typeof r & { total: number } => r.total !== null)
    .sort((a, b) => b.total - a.total);
  const ranked: RankedSupplier[] = scored.map((r) => ({
    ...r,
    rank: scored.findIndex((x) => x.total === r.total) + 1,
  }));
  return [...ranked, ...rows.filter((r) => r.total === null).map((r) => ({ ...r, rank: null }))];
}

/**
 * THE TOP `n` BY RANK. Suppliers tied with the n-th are all included — a tie is
 * not broken by the order of a list — so the result may be longer than `n`.
 */
export function topRanked(ranking: readonly RankedSupplier[], n: number): string[] {
  if (!Number.isInteger(n) || n < 1) return [];
  return ranking.filter((r) => r.rank !== null && r.rank <= n).map((r) => r.supplierId);
}

/** The suppliers whose weighted total is at or above `threshold`. */
export function atOrAbove(ranking: readonly RankedSupplier[], threshold: number): string[] {
  if (!Number.isFinite(threshold)) return [];
  return ranking.filter((r) => r.total !== null && r.total >= threshold).map((r) => r.supplierId);
}
