// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · THE RFP — criteria, proposals, scores — the machine, through the real
// dispatcher and the real stores.
//
// The buyer sets weighted criteria on a draft event that has an RFP stage; the
// weights sum to 100 or the set is refused. A supplier proposes at the RFP
// stage — a response per criterion and the names of its documents — saving a
// draft, then submitting; a required criterion left out is refused by name.
// Named evaluators score each proposal once bidding is closed; a supplier's
// weighted total is the average of its evaluators' totals; a person writes
// their own sheet and reaches nobody else's; the scores lock when the event
// advances. A supplier reads the criteria and its own proposal, and no score.
//
// Every refusal below is paired with a known-good input that passes.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { mockDataService } from './mockDataService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { stageResponseStore } from './stores/stageResponseStore';
import {
  RFP_CRITERION_GROUPS,
  asScoreSheets,
  atOrAbove,
  criteriaProblemOf,
  criterionAverageOf,
  evaluatorIdOf,
  groupTotalOf,
  hasGroups,
  isScore,
  normalizeCriteria,
  normalizeDocuments,
  normalizeProposal,
  proposalProblemOf,
  rankingOf,
  scoresProblemOf,
  topRanked,
  unansweredCriteriaOf,
  weightSumOf,
  weightedTotalOf,
  weightsProblemOf,
  type RfpCriterion,
  type ScoreSheetLike,
} from '../../../data/rfpEvaluation';
import { toSupplierCriterion, toSupplierRfqView } from '../rfqSupplierView';
import { getFlow } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { ATTRIBUTION_KEYS } from '../../identity/attributionKeys';
import { atomsForSeat } from '../../transitions/customRoles';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

const buyer = (actor: QueryScope['actor'], businessRoles: string[] = ['procurement']): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: businessRoles as QueryScope['businessRoles'],
  actor,
});
const evaluator1 = buyer(SAMPLE_ACTORS.procurement1);
const evaluator2 = buyer(SAMPLE_ACTORS.procurement2);
const nobody = buyer(NO_PERSON);
/** The two evaluators' ids, read off the roster's own actors — never spelled here. */
const E1 = evaluatorIdOf({ scoredBy: SAMPLE_ACTORS.procurement1 });
const E2 = evaluatorIdOf({ scoredBy: SAMPLE_ACTORS.procurement2 });
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'] as QueryScope['businessRoles'],
  actor: NO_PERSON,
});

const LATER = '2026-10-15';
const THREE = ['sup-002', 'sup-005', 'sup-007'];

/** Four criteria, 40 / 20 / 30 / 10, split technical and commercial; c4 is optional. */
const FOUR: RfpCriterion[] = [
  { id: 'c1', name: 'Technical approach', weight: 40, required: true, group: 'technical' },
  { id: 'c2', name: 'Quality system', weight: 20, required: true, group: 'technical' },
  { id: 'c3', name: 'Commercial terms', weight: 30, required: true, group: 'commercial' },
  { id: 'c4', name: 'Sustainability', weight: 10, required: false, group: 'commercial' },
];

const PROPOSAL = {
  c1: 'Two-stage blow moulding on line 4.',
  c2: 'ISO 9001 and a halal assurance system.',
  c3: 'Net 45, price held for twelve months.',
  c4: '30% recycled resin.',
};

const rfqVerb = (
  transitionId: string,
  entityId: string,
  payload: Record<string, unknown> = {},
  scope: QueryScope = evaluator1,
) => svc.dispatch(scope, { transitionId, entity: 'rfq', entityId, payload });

const raise = async (stage: 'RFI' | 'RFP' | 'RFQ'): Promise<string> => {
  const res = await svc.dispatch(evaluator1, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-3 probe — refill bottle',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: LATER,
      awardDeadline: '2026-10-30',
      // An event at RFQ states no stage, as every event before stages did.
      ...(stage === 'RFQ' ? {} : { stage }),
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

const ok = async (p: Promise<{ status: string; reason?: string }>) => {
  const res = await p;
  expect(res.status, res.reason).toBe('done');
};

const setCriteria = (rfqId: string, criteria: unknown, scope: QueryScope = evaluator1) =>
  rfqVerb('t_rfq_criteria_set', rfqId, criteria === undefined ? {} : { criteria }, scope);

/** An RFP published with `criteria` (the four unless stated; `null` for none). */
const openRfp = async (criteria: readonly RfpCriterion[] | null = FOUR): Promise<string> => {
  const id = await raise('RFP');
  if (criteria !== null) await ok(setCriteria(id, criteria));
  await ok(rfqVerb('t_rfq_publish', id));
  return id;
};

const respond = (
  transitionId: 't_stageresponse_submit' | 't_stageresponse_save',
  supplierId: string,
  rfqId: string,
  extra: Record<string, unknown> = {},
) =>
  svc.dispatch(supplier(supplierId), {
    transitionId,
    entity: 'stageResponse',
    payload: { rfqId, supplierId, ...extra },
  });

const onDraft = (
  transitionId: 't_stageresponse_resave' | 't_stageresponse_send',
  supplierId: string,
  entityId: string,
  payload: Record<string, unknown> = {},
) => svc.dispatch(supplier(supplierId), { transitionId, entity: 'stageResponse', entityId, payload });

/** A closed RFP with the four criteria and a proposal from each of the three. */
const closedRfp = async (): Promise<string> => {
  const id = await openRfp();
  for (const s of THREE) await ok(respond('t_stageresponse_submit', s, id, { proposal: PROPOSAL }));
  await ok(rfqVerb('t_rfq_close', id));
  return id;
};

const sheet = (scores: readonly number[], comment = 'Scored on the proposal as read.') =>
  FOUR.map((c, i) => ({ criterionId: c.id, score: scores[i], comment }));

const score = (rfqId: string, supplierId: string, scores: unknown, scope: QueryScope = evaluator1) =>
  rfqVerb('t_rfq_proposal_score', rfqId, { supplierId, scores }, scope);

const refusedBy = (res: { status: string; reason?: string }, hook: string, head: string) => {
  expect(res.status).toBe('failed');
  expect(refusedByPolicy(res.reason, hook as never), res.reason).toBe(true);
  expect(res.reason).toContain(head);
};

beforeEach(() => {
  stageResponseStore.reset();
  quotationStore.reset();
  rfqStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('A · the model', () => {
  it('the two groups, in the ranking’s order', () => {
    expect(RFP_CRITERION_GROUPS).toEqual(['technical', 'commercial']);
    expect(hasGroups(FOUR)).toBe(true);
    expect(hasGroups(FOUR.map(({ group: _g, ...c }) => c))).toBe(false);
  });

  it('KNOWN-GOOD — the four criteria are well-formed and their weights make 100', () => {
    expect(criteriaProblemOf(FOUR)).toBeNull();
    expect(weightSumOf(FOUR)).toBe(100);
    expect(weightsProblemOf(FOUR)).toBeNull();
  });

  it('an empty list is well-formed and weighs nothing', () => {
    expect(criteriaProblemOf([])).toBeNull();
    expect(weightsProblemOf([])).toBeNull();
  });

  it.each([
    ['NOT_A_LIST', 'not a list', 0],
    ['ID_MISSING', [{ ...FOUR[0], id: ' ' }], 1],
    ['ID_DUPLICATE', [FOUR[0], { ...FOUR[1], id: 'c1' }], 2],
    ['NAME_MISSING', [FOUR[0], { ...FOUR[1], name: '' }], 2],
    ['WEIGHT_INVALID', [{ ...FOUR[0], weight: 0 }], 1],
    ['WEIGHT_INVALID', [{ ...FOUR[0], weight: -5 }], 1],
    ['WEIGHT_INVALID', [{ ...FOUR[0], weight: 101 }], 1],
    ['WEIGHT_INVALID', [{ ...FOUR[0], weight: '40' }], 1],
    ['WEIGHT_INVALID', [{ ...FOUR[0], weight: 33.333 }], 1],
    ['WEIGHT_INVALID', [{ ...FOUR[0], weight: Number.NaN }], 1],
    ['GROUP_UNKNOWN', [{ ...FOUR[0], group: 'legal' }], 1],
  ])('%s is named with its criterion', (code, raw, number) => {
    expect(criteriaProblemOf(raw)).toEqual({ number, code });
  });

  it('the weights: 99 and 101 are not 100; three thirds stated to two decimals are', () => {
    expect(weightsProblemOf([{ weight: 40 }, { weight: 59 }])).toEqual({ sum: 99 });
    expect(weightsProblemOf([{ weight: 60 }, { weight: 41 }])).toEqual({ sum: 101 });
    expect(weightsProblemOf([{ weight: 99.99 }])).toEqual({ sum: 99.99 });
    expect(weightsProblemOf([{ weight: 33.33 }, { weight: 33.33 }, { weight: 33.34 }])).toBeNull();
    // Summed in hundredths, not in doubles: 0.1 + 0.2 is not 0.3 there.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(weightsProblemOf([{ weight: 0.1 }, { weight: 0.2 }, { weight: 99.7 }])).toBeNull();
    expect(weightSumOf([{ weight: 0.1 }, { weight: 0.2 }])).toBe(0.3);
  });

  it('criteria are stored trimmed, with a group only when one is stated', () => {
    expect(
      normalizeCriteria([{ id: ' c1 ', name: ' Fit ', weight: 100, required: 'yes', group: '' }]),
    ).toEqual([{ id: 'c1', name: 'Fit', weight: 100, required: false }]);
  });

  it('the proposal: unknown criterion, not text, documents not names', () => {
    expect(proposalProblemOf(FOUR, PROPOSAL, ['a.pdf'])).toBeNull();
    expect(proposalProblemOf(FOUR, undefined, undefined)).toBeNull();
    expect(proposalProblemOf(FOUR, { c1: '' }, [])).toBeNull();
    expect(proposalProblemOf(FOUR, 'text', undefined)?.code).toBe('NOT_A_MAP');
    expect(proposalProblemOf(FOUR, [], undefined)?.code).toBe('NOT_A_MAP');
    expect(proposalProblemOf(FOUR, { c9: 'x' }, undefined)).toEqual({ criterionId: 'c9', number: 0, code: 'UNKNOWN_CRITERION' });
    expect(proposalProblemOf(FOUR, { c2: 7 }, undefined)).toEqual({ criterionId: 'c2', number: 2, code: 'NOT_TEXT' });
    expect(proposalProblemOf(FOUR, undefined, 'a.pdf')?.code).toBe('DOCUMENTS_NOT_A_LIST');
    expect(proposalProblemOf(FOUR, undefined, ['a.pdf', 3])?.code).toBe('DOCUMENT_NOT_A_NAME');
    // With no criteria nothing is asked: a document name is refused, a blank is not.
    expect(proposalProblemOf([], undefined, ['a.pdf'])?.code).toBe('DOCUMENTS_NOT_TAKEN');
    expect(proposalProblemOf([], undefined, [' '])).toBeNull();
    expect(proposalProblemOf([], { c1: 'x' }, undefined)?.code).toBe('UNKNOWN_CRITERION');
  });

  it('the proposal and its documents as stored', () => {
    expect(normalizeProposal(FOUR, { c3: '  Net 45 ', c1: 'A', c2: ' ', c9: 'dropped' })).toEqual({ c1: 'A', c3: 'Net 45' });
    expect(Object.keys(normalizeProposal(FOUR, { c3: 'x', c1: 'y' }))).toEqual(['c1', 'c3']);
    expect(normalizeDocuments([' a.pdf ', '', 'b.pdf', 'a.pdf', 4])).toEqual(['a.pdf', 'b.pdf']);
    expect(normalizeDocuments('a.pdf')).toEqual([]);
  });

  it('the required criteria a proposal leaves out, by name; the optional one is never among them', () => {
    expect(unansweredCriteriaOf(FOUR, {}).map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(unansweredCriteriaOf(FOUR, { c1: 'x', c2: ' ', c3: 'z' }).map((c) => c.id)).toEqual(['c2']);
    expect(unansweredCriteriaOf(FOUR, { c1: 'x', c2: 'y', c3: 'z' })).toEqual([]);
  });

  it('a score is a whole number from 1 to 5', () => {
    expect([1, 2, 3, 4, 5].every(isScore)).toBe(true);
    expect([0, 6, 4.5, -1, '4', null, undefined, Number.NaN].some(isScore)).toBe(false);
  });

  it.each([
    ['NOT_A_LIST', { c1: 5 }],
    ['NOT_A_SCORE', [5, 4, 3, 2]],
    ['UNKNOWN_CRITERION', [...sheet([5, 4, 3, 2]), { criterionId: 'c9', score: 3 }]],
    ['CRITERION_TWICE', [...sheet([5, 4, 3, 2]), { criterionId: 'c1', score: 3 }]],
    ['OUT_OF_RANGE', sheet([6, 4, 3, 2])],
    ['OUT_OF_RANGE', sheet([0, 4, 3, 2])],
    ['OUT_OF_RANGE', sheet([4.5, 4, 3, 2])],
    ['OUT_OF_RANGE', [{ criterionId: 'c1', score: '5' }]],
    ['COMMENT_NOT_TEXT', [{ criterionId: 'c1', score: 5, comment: 7 }]],
    ['CRITERION_UNSCORED', sheet([5, 4, 3, 2]).slice(0, 3)],
  ])('a sheet that is %s is refused', (code, raw) => {
    expect(scoresProblemOf(FOUR, raw)?.code).toBe(code);
  });

  it('KNOWN-GOOD — a whole sheet passes; with no criteria there is nothing to score', () => {
    expect(scoresProblemOf(FOUR, sheet([5, 4, 3, 2]))).toBeNull();
    expect(scoresProblemOf([], sheet([5, 4, 3, 2]))?.code).toBe('NO_CRITERIA');
  });

  // The arithmetic, worked by hand:
  //   A by e1: 5·.4 + 4·.2 + 3·.3 + 2·.1 = 2.0 + 0.8 + 0.9 + 0.2 = 3.9
  //   A by e2: 3·.4 + 4·.2 + 5·.3 + 4·.1 = 1.2 + 0.8 + 1.5 + 0.4 = 3.9   → A = 3.9
  //   B by e1: 4·.4 + 4·.2 + 4·.3 + 4·.1 = 4.0
  //   B by e2: 2·.4 + 3·.2 + 3·.3 + 1·.1 = 0.8 + 0.6 + 0.9 + 0.1 = 2.4   → B = 3.2
  //   C by e1 only: 5·.4 + 5·.2 + 4·.3 + 3·.1 = 2 + 1 + 1.2 + 0.3 = 4.5  → C = 4.5
  const SHEETS: ScoreSheetLike[] = [
    { supplierId: 'A', evaluatorId: 'e1', scores: sheet([5, 4, 3, 2]) },
    { supplierId: 'A', evaluatorId: 'e2', scores: sheet([3, 4, 5, 4]) },
    { supplierId: 'B', evaluatorId: 'e1', scores: sheet([4, 4, 4, 4]) },
    { supplierId: 'B', evaluatorId: 'e2', scores: sheet([2, 3, 3, 1]) },
    { supplierId: 'C', evaluatorId: 'e1', scores: sheet([5, 5, 4, 3]) },
  ];

  it('a supplier’s weighted total is the average of its evaluators’ weighted totals', () => {
    expect(weightedTotalOf(FOUR, SHEETS, 'A')).toBe(3.9);
    expect(weightedTotalOf(FOUR, SHEETS, 'B')).toBe(3.2);
    expect(weightedTotalOf(FOUR, SHEETS, 'C')).toBe(4.5);
    expect(weightedTotalOf(FOUR, SHEETS, 'D')).toBeNull();
  });

  it('the weights matter: the same scores under equal weights give another total', () => {
    const equal = FOUR.map((c) => ({ ...c, weight: 25 }));
    // A by e1 = (5+4+3+2)/4 = 3.5; by e2 = (3+4+5+4)/4 = 4 → 3.75
    expect(weightedTotalOf(equal, SHEETS, 'A')).toBe(3.75);
    expect(weightedTotalOf(equal, SHEETS, 'A')).not.toBe(weightedTotalOf(FOUR, SHEETS, 'A'));
  });

  it('a criterion’s cell is the average of the scores it was given', () => {
    expect(criterionAverageOf(SHEETS, 'A', 'c1')).toBe(4);
    expect(criterionAverageOf(SHEETS, 'B', 'c4')).toBe(2.5);
    expect(criterionAverageOf(SHEETS, 'C', 'c1')).toBe(5);
    expect(criterionAverageOf(SHEETS, 'D', 'c1')).toBeNull();
  });

  it('the technical and commercial parts add up to the total', () => {
    // A technical: e1 5·.4+4·.2 = 2.8; e2 3·.4+4·.2 = 2.0 → 2.4
    // A commercial: e1 3·.3+2·.1 = 1.1; e2 5·.3+4·.1 = 1.9 → 1.5
    expect(groupTotalOf(FOUR, SHEETS, 'A', 'technical')).toBe(2.4);
    expect(groupTotalOf(FOUR, SHEETS, 'A', 'commercial')).toBe(1.5);
    expect(2.4 + 1.5).toBeCloseTo(weightedTotalOf(FOUR, SHEETS, 'A')!, 10);
    const ungrouped = FOUR.map(({ group: _g, ...c }) => c);
    expect(groupTotalOf(ungrouped, SHEETS, 'A', 'technical')).toBeNull();
  });

  it('the ranking: highest first, the unscored last and unranked', () => {
    expect(rankingOf(FOUR, SHEETS, ['A', 'B', 'C', 'D'])).toEqual([
      { supplierId: 'C', total: 4.5, rank: 1, evaluators: 1 },
      { supplierId: 'A', total: 3.9, rank: 2, evaluators: 2 },
      { supplierId: 'B', total: 3.2, rank: 3, evaluators: 2 },
      { supplierId: 'D', total: null, rank: null, evaluators: 0 },
    ]);
  });

  it('equal totals share a rank and the next one skips', () => {
    const tied: ScoreSheetLike[] = [
      { supplierId: 'A', evaluatorId: 'e1', scores: sheet([4, 4, 4, 4]) },
      { supplierId: 'B', evaluatorId: 'e1', scores: sheet([4, 4, 4, 4]) },
      { supplierId: 'C', evaluatorId: 'e1', scores: sheet([3, 3, 3, 3]) },
    ];
    expect(rankingOf(FOUR, tied, ['A', 'B', 'C']).map((r) => r.rank)).toEqual([1, 1, 3]);
    // Top 1 with a tie at the top is both: a tie is not broken by list order.
    expect(topRanked(rankingOf(FOUR, tied, ['A', 'B', 'C']), 1)).toEqual(['A', 'B']);
  });

  it('top N and at-or-above are the two pre-selections; neither includes the unscored', () => {
    const ranking = rankingOf(FOUR, SHEETS, ['A', 'B', 'C', 'D']);
    expect(topRanked(ranking, 2)).toEqual(['C', 'A']);
    expect(topRanked(ranking, 9)).toEqual(['C', 'A', 'B']);
    expect(topRanked(ranking, 0)).toEqual([]);
    expect(topRanked(ranking, 1.5)).toEqual([]);
    expect(atOrAbove(ranking, 3.9)).toEqual(['C', 'A']);
    expect(atOrAbove(ranking, 3.91)).toEqual(['C']);
    expect(atOrAbove(ranking, 0)).toEqual(['C', 'A', 'B']);
    expect(atOrAbove(ranking, Number.NaN)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('B · the buyer sets the criteria on a draft', () => {
  it('the verb is on the flow: Draft only, state-preserving, `rfq:create`, three checks in order', () => {
    const t = getFlow('rfq')!.transitions.find((x) => x.id === 't_rfq_criteria_set')!;
    expect(t.from).toEqual(['Draft']);
    expect(t.statePreserving).toBe(true);
    expect(t.requiredRole).toBe('rfq:create');
    expect(t.policyHooks).toEqual([
      POLICY_HOOKS.RFQ_CRITERIA_ON_RFP_PATH,
      POLICY_HOOKS.RFQ_CRITERIA_WELL_FORMED,
      POLICY_HOOKS.RFQ_CRITERIA_WEIGHTS_TOTAL,
    ]);
  });

  it('KNOWN-GOOD — four weighted criteria are stored on a draft that starts at RFP, and it stays a Draft', async () => {
    const id = await raise('RFP');
    await ok(setCriteria(id, FOUR));
    expect(rfqStore.get(id)!.criteria).toEqual(FOUR);
    expect(rfqStore.get(id)!.status).toBe('Draft');
  });

  it('KNOWN-GOOD — a draft that starts at RFI has an RFP stage ahead and takes criteria too', async () => {
    const id = await raise('RFI');
    await ok(setCriteria(id, FOUR));
    expect(rfqStore.get(id)!.criteria).toHaveLength(4);
  });

  it('the weights not summing to 100 are refused by name, with the sum, and nothing is stored', async () => {
    const id = await raise('RFP');
    const short = FOUR.map((c) => (c.id === 'c4' ? { ...c, weight: 5 } : c));
    const res = await setCriteria(id, short);
    refusedBy(res, POLICY_HOOKS.RFQ_CRITERIA_WEIGHTS_TOTAL, 'CRITERIA_WEIGHTS_NOT_100');
    expect(res.reason).toContain('sum to 95%');
    expect(rfqStore.get(id)!.criteria).toBeUndefined();
    const over = await setCriteria(id, FOUR.map((c) => (c.id === 'c4' ? { ...c, weight: 15 } : c)));
    refusedBy(over, POLICY_HOOKS.RFQ_CRITERIA_WEIGHTS_TOTAL, 'CRITERIA_WEIGHTS_NOT_100');
    expect(over.reason).toContain('sum to 105%');
  });

  it('a malformed list is named before its sum is', async () => {
    const id = await raise('RFP');
    const res = await setCriteria(id, [{ ...FOUR[0], name: '' }, FOUR[1]]);
    refusedBy(res, POLICY_HOOKS.RFQ_CRITERIA_WELL_FORMED, 'CRITERIA_MALFORMED');
    expect(res.reason).toContain('C1');
    expect(res.reason).toContain('NAME_MISSING');
    const absent = await setCriteria(id, undefined);
    refusedBy(absent, POLICY_HOOKS.RFQ_CRITERIA_WELL_FORMED, 'NOT_A_LIST');
  });

  it('an event that starts at RFQ has no RFP stage and takes none', async () => {
    const id = await raise('RFQ');
    const res = await setCriteria(id, FOUR);
    refusedBy(res, POLICY_HOOKS.RFQ_CRITERIA_ON_RFP_PATH, 'CRITERIA_NO_RFP_STAGE');
    expect(rfqStore.get(id)!.criteria).toBeUndefined();
  });

  it('an empty list takes the criteria off', async () => {
    const id = await raise('RFP');
    await ok(setCriteria(id, FOUR));
    await ok(setCriteria(id, []));
    expect('criteria' in rfqStore.get(id)!).toBe(false);
  });

  it('once published the criteria do not move', async () => {
    const id = await openRfp();
    const res = await setCriteria(id, [{ ...FOUR[0], weight: 100 }]);
    expect(res.status).toBe('failed');
    expect(rfqStore.get(id)!.criteria).toEqual(FOUR);
  });

  it('a seat without `rfq:create` is refused; a supplier is denied at scope', async () => {
    const id = await raise('RFP');
    const finance = await setCriteria(id, FOUR, buyer(SAMPLE_ACTORS.procurement1, ['finance']));
    expect(finance.status).toBe('failed');
    expect(rfqStore.get(id)!.criteria).toBeUndefined();
    await expect(setCriteria(id, FOUR, supplier('sup-002'))).rejects.toThrow(/denied for scope/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('C · a supplier proposes at the RFP stage', () => {
  it('the four response verbs carry the proposal checks; the two that submit carry the required one', () => {
    const flow = getFlow('stageResponse')!;
    const hooksOf = (id: string) => flow.transitions.find((t) => t.id === id)!.policyHooks;
    for (const id of ['t_stageresponse_submit', 't_stageresponse_save', 't_stageresponse_resave', 't_stageresponse_send']) {
      expect(hooksOf(id), id).toContain(POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED);
    }
    for (const id of ['t_stageresponse_submit', 't_stageresponse_send']) {
      expect(hooksOf(id), id).toContain(POLICY_HOOKS.STAGE_RESPONSE_CRITERIA_ANSWERED);
    }
    for (const id of ['t_stageresponse_save', 't_stageresponse_resave']) {
      expect(hooksOf(id), id).not.toContain(POLICY_HOOKS.STAGE_RESPONSE_CRITERIA_ANSWERED);
    }
  });

  it('KNOWN-GOOD — a whole proposal with two document names is recorded as stated', async () => {
    const id = await openRfp();
    const res = await respond('t_stageresponse_submit', 'sup-002', id, {
      proposal: PROPOSAL,
      documents: ['proposal.pdf', ' line-4-layout.pdf ', 'proposal.pdf'],
      note: 'Happy to host a site visit.',
    });
    expect(res.status, res.reason).toBe('done');
    const row = stageResponseStore.get(res.entityId!)!;
    expect(row.stage).toBe('RFP');
    expect(row.proposal).toEqual(PROPOSAL);
    expect(row.documents).toEqual(['proposal.pdf', 'line-4-layout.pdf']);
    expect(row.answers).toBeUndefined();
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-002']);
  });

  it('the proposal is stored as it reads: trimmed, a blank dropped, in the criteria’s order', async () => {
    const id = await openRfp();
    const res = await respond('t_stageresponse_submit', 'sup-002', id, {
      proposal: { c4: '   ', c3: '  Net 45.  ', c2: 'ISO 9001.', c1: ' Line 4. ' },
    });
    expect(res.status, res.reason).toBe('done');
    const stored = stageResponseStore.get(res.entityId!)!.proposal!;
    expect(stored).toEqual({ c1: 'Line 4.', c2: 'ISO 9001.', c3: 'Net 45.' });
    expect(Object.keys(stored)).toEqual(['c1', 'c2', 'c3']);
  });

  it('a required criterion left out is refused by name, and nothing is recorded', async () => {
    const id = await openRfp();
    const res = await respond('t_stageresponse_submit', 'sup-002', id, {
      proposal: { c1: PROPOSAL.c1, c3: '   ' },
    });
    refusedBy(res, POLICY_HOOKS.STAGE_RESPONSE_CRITERIA_ANSWERED, 'PROPOSAL_CRITERION_REQUIRED');
    expect(res.reason).toContain('C2 ("Quality system")');
    expect(res.reason).toContain('C3 ("Commercial terms")');
    expect(res.reason).not.toContain('Technical approach');
    expect(res.reason).not.toContain('Sustainability');
    expect(stageResponseStore.forRfq(id)).toHaveLength(0);
  });

  it('KNOWN-GOOD — the optional criterion may be left out', async () => {
    const id = await openRfp();
    const { c4: _optional, ...required } = PROPOSAL;
    const res = await respond('t_stageresponse_submit', 'sup-002', id, { proposal: required });
    expect(res.status, res.reason).toBe('done');
  });

  it('a draft holds an unfinished proposal; submitting it unfinished is refused; finished, it is sent', async () => {
    const id = await openRfp();
    const saved = await respond('t_stageresponse_save', 'sup-005', id, { proposal: { c1: 'First thoughts.' } });
    expect(saved.status, saved.reason).toBe('done');
    const draftId = saved.entityId!;
    expect(stageResponseStore.get(draftId)!.status).toBe('Draft');
    // A draft is not a response and the buyer's read does not hold it.
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual([]);
    expect(rfqStore.get(id)!.stageResponses).toEqual([]);

    await ok(onDraft('t_stageresponse_resave', 'sup-005', draftId, { proposal: { c1: 'Second thoughts.', c2: 'ISO.' }, documents: ['d.pdf'] }));
    expect(stageResponseStore.get(draftId)!.proposal).toEqual({ c1: 'Second thoughts.', c2: 'ISO.' });

    const early = await onDraft('t_stageresponse_send', 'sup-005', draftId, { proposal: { c1: 'Second thoughts.', c2: 'ISO.' } });
    refusedBy(early, POLICY_HOOKS.STAGE_RESPONSE_CRITERIA_ANSWERED, 'PROPOSAL_CRITERION_REQUIRED');
    expect(early.reason).toContain('C3 ("Commercial terms")');
    expect(stageResponseStore.get(draftId)!.status).toBe('Draft');

    await ok(onDraft('t_stageresponse_send', 'sup-005', draftId, { proposal: PROPOSAL, documents: ['final.pdf'] }));
    const sent = stageResponseStore.get(draftId)!;
    expect(sent.status).toBeUndefined();
    expect(sent.proposal).toEqual(PROPOSAL);
    expect(sent.documents).toEqual(['final.pdf']);
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-005']);
  });

  it('a response to a criterion the event does not set, or one that is not text, is refused — in a draft too', async () => {
    const id = await openRfp();
    const unknown = await respond('t_stageresponse_save', 'sup-002', id, { proposal: { c9: 'x' } });
    refusedBy(unknown, POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED, 'PROPOSAL_INVALID');
    expect(unknown.reason).toContain("'c9' is not a criterion");
    const notText = await respond('t_stageresponse_submit', 'sup-002', id, { proposal: { ...PROPOSAL, c2: 7 } });
    refusedBy(notText, POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED, 'PROPOSAL_INVALID');
    expect(notText.reason).toContain('C2 ("Quality system")');
    const docs = await respond('t_stageresponse_submit', 'sup-002', id, { proposal: PROPOSAL, documents: 'a.pdf' });
    refusedBy(docs, POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED, 'PROPOSAL_INVALID');
    expect(stageResponseStore.forRfq(id)).toHaveLength(0);
  });

  it('an RFP that sets no criteria takes interest and a note as before, and refuses a proposal', async () => {
    const id = await openRfp(null);
    const smuggled = await respond('t_stageresponse_submit', 'sup-002', id, { proposal: { c1: 'x' } });
    refusedBy(smuggled, POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED, 'PROPOSAL_INVALID');
    expect(smuggled.reason).toContain('sets no criteria at this stage');
    const docs = await respond('t_stageresponse_submit', 'sup-002', id, { documents: ['a.pdf'] });
    refusedBy(docs, POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED, 'PROPOSAL_INVALID');
    const plain = await respond('t_stageresponse_submit', 'sup-002', id, { note: 'Interested.' });
    expect(plain.status, plain.reason).toBe('done');
    const row = stageResponseStore.get(plain.entityId!)!;
    expect(row.proposal).toBeUndefined();
    expect(row.documents).toBeUndefined();
  });

  it('at the RFI stage of an event that sets criteria for its RFP, a proposal is not yet taken', async () => {
    const id = await raise('RFI');
    await ok(setCriteria(id, FOUR));
    await ok(rfqVerb('t_rfq_publish', id));
    const early = await respond('t_stageresponse_submit', 'sup-002', id, { proposal: PROPOSAL });
    refusedBy(early, POLICY_HOOKS.STAGE_RESPONSE_PROPOSAL_WELL_FORMED, 'PROPOSAL_INVALID');
    // KNOWN-GOOD — and its RFI response states no proposal and passes both hooks.
    await ok(respond('t_stageresponse_submit', 'sup-002', id, {}));
  });

  it('the seeded RFP event (rfq-018) sets no criteria, so its responses are what they were', () => {
    const seeded = rfqStore.get('rfq-018')!;
    expect(seeded.stage).toBe('RFP');
    expect(seeded.criteria).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('D · evaluators score the proposals', () => {
  it('the verb is on the flow: Closed only, state-preserving, `rfq:evaluate`, five checks in order', () => {
    const t = getFlow('rfq')!.transitions.find((x) => x.id === 't_rfq_proposal_score')!;
    expect(t.from).toEqual(['Closed']);
    expect(t.statePreserving).toBe(true);
    expect(t.requiredRole).toBe('rfq:evaluate');
    expect(t.requiredFields).toEqual(['supplierId', 'scores']);
    expect(t.policyHooks).toEqual([
      POLICY_HOOKS.RFQ_SCORE_EVALUATOR_NAMED,
      POLICY_HOOKS.RFQ_SCORE_NOT_LOCKED,
      POLICY_HOOKS.RFQ_SCORE_AT_RFP_STAGE,
      POLICY_HOOKS.RFQ_SCORE_PROPOSAL_HELD,
      POLICY_HOOKS.RFQ_SCORE_SHEET_WELL_FORMED,
    ]);
  });

  it('`rfq:evaluate` is procurement’s, and no supplier lane holds it', () => {
    expect(atomsForSeat(['procurement'])).toContain('rfq:evaluate');
    expect(atomsForSeat(['finance'])).not.toContain('rfq:evaluate');
    expect(atomsForSeat(['supplier', 'commercial', 'fulfilment', 'back_office'])).not.toContain('rfq:evaluate');
  });

  it('KNOWN-GOOD — one evaluator scores a proposal: a sheet by that person, dated, and the event stays Closed', async () => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2])));
    const after = rfqStore.get(id)!;
    expect(after.status).toBe('Closed');
    expect(after.proposalScores).toHaveLength(1);
    const s = after.proposalScores![0];
    expect(s.supplierId).toBe('sup-002');
    expect(evaluatorIdOf(s)).toBe(E1);
    expect(s.scoredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.scores.map((x) => x.score)).toEqual([5, 4, 3, 2]);
    expect(s.scores[0].comment).toBe('Scored on the proposal as read.');
  });

  it('a sheet is stored as it reads: in the criteria’s order, a comment trimmed, a blank comment dropped', async () => {
    const id = await closedRfp();
    await ok(
      score(id, 'sup-002', [
        { criterionId: 'c4', score: 2, comment: '   ' },
        { criterionId: 'c3', score: 3 },
        { criterionId: 'c2', score: 4, comment: '  Thin on audits.  ', internal: 'dropped' },
        { criterionId: 'c1', score: 5, comment: 'Clear.' },
      ]),
    );
    expect(rfqStore.get(id)!.proposalScores![0].scores).toEqual([
      { criterionId: 'c1', score: 5, comment: 'Clear.' },
      { criterionId: 'c2', score: 4, comment: 'Thin on audits.' },
      { criterionId: 'c3', score: 3 },
      { criterionId: 'c4', score: 2 },
    ]);
  });

  it('two evaluators score; the total is the average of theirs; the ranking follows', async () => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2]), evaluator1)); // 3.9
    await ok(score(id, 'sup-002', sheet([3, 4, 5, 4]), evaluator2)); // 3.9
    await ok(score(id, 'sup-005', sheet([4, 4, 4, 4]), evaluator1)); // 4.0
    await ok(score(id, 'sup-005', sheet([2, 3, 3, 1]), evaluator2)); // 2.4
    await ok(score(id, 'sup-007', sheet([5, 5, 4, 3]), evaluator1)); // 4.5
    await ok(score(id, 'sup-007', sheet([5, 5, 5, 5]), evaluator2)); // 5.0
    const rfq = rfqStore.get(id)!;
    const sheets = asScoreSheets(rfq.proposalScores);
    expect(sheets).toHaveLength(6);
    expect(weightedTotalOf(rfq.criteria!, sheets, 'sup-002')).toBe(3.9);
    expect(weightedTotalOf(rfq.criteria!, sheets, 'sup-005')).toBe(3.2);
    expect(weightedTotalOf(rfq.criteria!, sheets, 'sup-007')).toBe(4.75);
    expect(rankingOf(rfq.criteria!, sheets, THREE).map((r) => [r.supplierId, r.rank, r.evaluators])).toEqual([
      ['sup-007', 1, 2],
      ['sup-002', 2, 2],
      ['sup-005', 3, 2],
    ]);
  });

  it('an evaluator replaces their own sheet, and the other evaluator’s is the same object it was', async () => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2]), evaluator1));
    await ok(score(id, 'sup-002', sheet([3, 4, 5, 4]), evaluator2));
    const firstOf1 = rfqStore.get(id)!.proposalScores!.find((s) => evaluatorIdOf(s) === E1)!;
    await ok(score(id, 'sup-002', sheet([1, 1, 1, 1], 'Changed my mind.'), evaluator2));
    const after = rfqStore.get(id)!.proposalScores!;
    expect(after).toHaveLength(2);
    expect(after.find((s) => evaluatorIdOf(s) === E1)).toEqual(firstOf1);
    expect(after.find((s) => evaluatorIdOf(s) === E2)!.scores.map((x) => x.score)).toEqual([1, 1, 1, 1]);
  });

  it('an evaluator cannot change another’s score: a payload naming the evaluator is refused and nothing moves', async () => {
    expect(ATTRIBUTION_KEYS).toContain('scoredBy');
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2]), evaluator1));
    const before = rfqStore.get(id)!.proposalScores;
    const res = await rfqVerb(
      't_rfq_proposal_score',
      id,
      { supplierId: 'sup-002', scores: sheet([1, 1, 1, 1]), scoredBy: SAMPLE_ACTORS.procurement1 },
      evaluator2,
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ACTOR_IN_PAYLOAD');
    expect(rfqStore.get(id)!.proposalScores).toEqual(before);
    // Any other key that might be read as "whose sheet" is not read at all:
    // evaluator 2 writes evaluator 2's sheet and evaluator 1's stays.
    await ok(
      rfqVerb(
        't_rfq_proposal_score',
        id,
        { supplierId: 'sup-002', scores: sheet([1, 1, 1, 1]), evaluatorId: E1, personId: E1 },
        evaluator2,
      ),
    );
    const after = rfqStore.get(id)!.proposalScores!;
    expect(after).toHaveLength(2);
    expect(after.find((s) => evaluatorIdOf(s) === E1)).toEqual(before![0]);
  });

  it('a seat that names nobody is refused by name', async () => {
    const id = await closedRfp();
    const res = await score(id, 'sup-002', sheet([5, 4, 3, 2]), nobody);
    refusedBy(res, POLICY_HOOKS.RFQ_SCORE_EVALUATOR_NAMED, 'SCORE_EVALUATOR_UNATTRIBUTED');
    expect(rfqStore.get(id)!.proposalScores).toBeUndefined();
  });

  it('a seat without `rfq:evaluate` is refused; a supplier is denied at scope', async () => {
    const id = await closedRfp();
    const finance = await score(id, 'sup-002', sheet([5, 4, 3, 2]), buyer(SAMPLE_ACTORS.procurement1, ['finance']));
    expect(finance.status).toBe('failed');
    expect(rfqStore.get(id)!.proposalScores).toBeUndefined();
    await expect(score(id, 'sup-002', sheet([5, 5, 5, 5]), supplier('sup-002'))).rejects.toThrow(/denied for scope/);
  });

  it('while bidding is still open nothing is scored', async () => {
    const id = await openRfp();
    await ok(respond('t_stageresponse_submit', 'sup-002', id, { proposal: PROPOSAL }));
    const res = await score(id, 'sup-002', sheet([5, 4, 3, 2]));
    expect(res.status).toBe('failed');
    expect(rfqStore.get(id)!.proposalScores).toBeUndefined();
  });

  it('a supplier that submitted no proposal is not scored', async () => {
    const id = await openRfp();
    await ok(respond('t_stageresponse_submit', 'sup-002', id, { proposal: PROPOSAL }));
    await ok(respond('t_stageresponse_save', 'sup-005', id, { proposal: PROPOSAL })); // a draft only
    await ok(rfqVerb('t_rfq_close', id));
    const silent = await score(id, 'sup-007', sheet([5, 4, 3, 2]));
    refusedBy(silent, POLICY_HOOKS.RFQ_SCORE_PROPOSAL_HELD, 'SCORE_NO_PROPOSAL');
    const drafted = await score(id, 'sup-005', sheet([5, 4, 3, 2]));
    refusedBy(drafted, POLICY_HOOKS.RFQ_SCORE_PROPOSAL_HELD, 'SCORE_NO_PROPOSAL');
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2])));
  });

  it.each([
    ['a score of 6', sheet([6, 4, 3, 2]), 'OUT_OF_RANGE', 'C1 ("Technical approach")'],
    ['a score of 4.5', sheet([5, 4.5, 3, 2]), 'OUT_OF_RANGE', 'C2 ("Quality system")'],
    ['a criterion left unscored', sheet([5, 4, 3, 2]).slice(0, 3), 'CRITERION_UNSCORED', 'C4 ("Sustainability")'],
    ['a criterion scored twice', [...sheet([5, 4, 3, 2]), { criterionId: 'c3', score: 1 }], 'CRITERION_TWICE', 'C3 ("Commercial terms")'],
    ['a criterion the event does not set', [...sheet([5, 4, 3, 2]), { criterionId: 'c9', score: 1 }], 'UNKNOWN_CRITERION', "'c9'"],
    ['something that is not a list', { c1: 5 }, 'NOT_A_LIST', 'SCORE_SHEET_INVALID'],
  ])('a sheet with %s is refused by name and nothing is written', async (_what, scores, code, named) => {
    const id = await closedRfp();
    const res = await score(id, 'sup-002', scores);
    refusedBy(res, POLICY_HOOKS.RFQ_SCORE_SHEET_WELL_FORMED, 'SCORE_SHEET_INVALID');
    expect(res.reason).toContain(code);
    expect(res.reason).toContain(named);
    expect(rfqStore.get(id)!.proposalScores).toBeUndefined();
  });

  it('an RFP that set no criteria has nothing to score against', async () => {
    const id = await openRfp(null);
    await ok(respond('t_stageresponse_submit', 'sup-002', id, {}));
    await ok(rfqVerb('t_rfq_close', id));
    const res = await score(id, 'sup-002', sheet([5, 4, 3, 2]));
    refusedBy(res, POLICY_HOOKS.RFQ_SCORE_SHEET_WELL_FORMED, 'NO_CRITERIA');
  });

  it('a closed RFI is not the stage proposals are scored at', async () => {
    const id = await raise('RFI');
    await ok(setCriteria(id, FOUR));
    await ok(rfqVerb('t_rfq_publish', id));
    for (const s of THREE) await ok(respond('t_stageresponse_submit', s, id, {}));
    await ok(rfqVerb('t_rfq_close', id));
    const res = await score(id, 'sup-002', sheet([5, 4, 3, 2]));
    refusedBy(res, POLICY_HOOKS.RFQ_SCORE_AT_RFP_STAGE, 'SCORE_STAGE_NOT_RFP');
  });

  it('SCORES LOCK WHEN THE EVENT ADVANCES — refused by name at the next close, and the sheets are where they were', async () => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2]), evaluator1));
    await ok(score(id, 'sup-005', sheet([4, 4, 4, 4]), evaluator2));
    const before = rfqStore.get(id)!.proposalScores;
    await ok(rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: LATER }));
    expect(rfqStore.get(id)!.stage).toBe('RFQ');
    // Open at RFQ: the verb is not legal from Open at all.
    const open = await score(id, 'sup-002', sheet([1, 1, 1, 1]), evaluator1);
    expect(open.status).toBe('failed');
    // Closed at RFQ: legal by state, and locked by name.
    await ok(rfqVerb('t_rfq_close', id));
    const locked = await score(id, 'sup-002', sheet([1, 1, 1, 1]), evaluator1);
    refusedBy(locked, POLICY_HOOKS.RFQ_SCORE_NOT_LOCKED, 'SCORES_LOCKED');
    const fresh = await score(id, 'sup-007', sheet([5, 5, 5, 5]), evaluator1);
    refusedBy(fresh, POLICY_HOOKS.RFQ_SCORE_NOT_LOCKED, 'SCORES_LOCKED');
    expect(rfqStore.get(id)!.proposalScores).toEqual(before);
  });

  it('KNOWN-GOOD — a reopened and re-closed RFP has not advanced, and is still scored', async () => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2])));
    await ok(rfqVerb('t_rfq_reopen', id));
    await ok(rfqVerb('t_rfq_close', id));
    await ok(score(id, 'sup-002', sheet([4, 4, 4, 4])));
    expect(rfqStore.get(id)!.proposalScores).toHaveLength(1);
  });

  it('the advance to RFQ carries the shortlist the scores suggested, and still refuses one under the floor with the remedy', async () => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2]), evaluator1));
    await ok(score(id, 'sup-005', sheet([2, 2, 2, 2]), evaluator1));
    await ok(score(id, 'sup-007', sheet([5, 5, 5, 5]), evaluator1));
    const rfq = rfqStore.get(id)!;
    const ranking = rankingOf(rfq.criteria!, asScoreSheets(rfq.proposalScores), rfq.respondedSupplierIds);
    const top1 = topRanked(ranking, 1);
    expect(top1).toEqual(['sup-007']);
    const under = await rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: top1, shortlistReason: 'Top score.', responseDeadline: LATER });
    refusedBy(under, POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_COMPETITIVE, 'SHORTLIST_UNDER_FLOOR');
    // The remedy is named: more suppliers, or conclude.
    expect(under.reason).toContain('Shortlist another supplier that responded');
    expect(under.reason).toContain('reopen the stage');
    expect(under.reason).toContain('conclude the event without an award');
    expect(rfqStore.get(id)!.stage).toBe('RFP');
    const top2 = topRanked(ranking, 2);
    expect(top2).toEqual(['sup-007', 'sup-002']);
    await ok(rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: top2, shortlistReason: 'The two highest weighted totals.', responseDeadline: LATER }));
    const after = rfqStore.get(id)!;
    expect(after.stage).toBe('RFQ');
    expect([...after.invitedSupplierIds].sort()).toEqual(['sup-002', 'sup-007']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E · a supplier never reads a score or a competitor', () => {
  const scored = async (): Promise<string> => {
    const id = await closedRfp();
    await ok(score(id, 'sup-002', sheet([5, 4, 3, 2]), evaluator1));
    await ok(score(id, 'sup-005', sheet([4, 4, 4, 4]), evaluator2));
    return id;
  };

  it('a criterion as a supplier reads it is the five named fields and nothing else', () => {
    const smuggled = { ...FOUR[0], internalNote: 'weigh this hardest' } as RfpCriterion;
    expect(toSupplierCriterion(smuggled)).toEqual(FOUR[0]);
    const { group: _g, ...ungrouped } = FOUR[0];
    expect('group' in toSupplierCriterion(ungrouped)).toBe(false);
  });

  it('the supplier’s view carries the criteria and its own proposal; no sheet, no other supplier', async () => {
    const id = await scored();
    const full = rfqStore.get(id)!;
    expect(full.proposalScores).toHaveLength(2);
    const view = toSupplierRfqView(full, 'sup-002');
    expect(view.criteria).toEqual(FOUR);
    expect('proposalScores' in view).toBe(false);
    expect(view.stageResponses!.map((r) => r.supplierId)).toEqual(['sup-002']);
    expect(view.stageResponses![0].proposal).toEqual(PROPOSAL);
    expect(view.invitedSupplierIds).toEqual(['sup-002']);
    expect(view.respondedSupplierIds).toEqual(['sup-002']);
    const text = JSON.stringify(view);
    for (const leaked of ['sup-005', 'sup-007', E1, E2, 'scoredBy', 'scoredAt', 'Scored on the proposal']) {
      expect(text, leaked).not.toContain(leaked);
    }
  });

  it('the service read for a supplier carries no score, and the buyer’s read carries them', async () => {
    const id = await scored();
    const mine = (await mockDataService.procurement.getRFQs(supplier('sup-002'))).items.find((r) => r.id === id)!;
    expect(mine.criteria).toHaveLength(4);
    expect('proposalScores' in mine).toBe(false);
    expect(JSON.stringify(mine)).not.toContain(E1);
    expect(JSON.stringify(mine)).not.toContain(E2);
    const theirs = (await mockDataService.procurement.getRFQs(evaluator1)).items.find((r) => r.id === id)!;
    expect(theirs.proposalScores).toHaveLength(2);
  });

  it('at the RFI stage that precedes it, the RFP criteria are not yet in the supplier’s read', async () => {
    const id = await raise('RFI');
    await ok(setCriteria(id, FOUR));
    await ok(rfqVerb('t_rfq_publish', id));
    expect('criteria' in toSupplierRfqView(rfqStore.get(id)!, 'sup-002')).toBe(false);
    // KNOWN-GOOD — the buyer's own row holds them throughout.
    expect(rfqStore.get(id)!.criteria).toHaveLength(4);
  });
});
