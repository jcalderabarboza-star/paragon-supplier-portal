// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE RFI QUESTIONNAIRE — the machine, through the real dispatcher and
// the real stores.
//
// The buyer writes a questionnaire on a draft event that starts at RFI. A
// supplier answers it at the RFI stage — saving a draft, then submitting — and
// a required question left unanswered is refused by name. The buyer reads the
// submitted answers and which of them gave a knock-out answer; a supplier reads
// the questions without their knock-out answers, and its own draft only.
//
// Every refusal below is paired with a known-good input that passes.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { mockDataService } from './mockDataService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { stageResponseStore } from './stores/stageResponseStore';
import { mockRfqs } from '../../../data/mockRfqs';
import { mockStageResponses } from '../../../data/mockStageResponses';
import { isSubmittedResponse, stageRespondersOf } from '../../../data/rfqStage';
import {
  RFI_QUESTION_TYPES,
  answersProblemOf,
  hasKnockouts,
  isAnswered,
  isKnockedOutBy,
  knockoutChoicesOf,
  knockoutFailuresOf,
  normalizeAnswers,
  normalizeQuestionnaire,
  questionnaireProblemOf,
  takesKnockout,
  unansweredRequiredOf,
  type RfiQuestion,
} from '../../../data/rfiQuestionnaire';
import { toSupplierQuestion, toSupplierRfqView } from '../rfqSupplierView';
import { getFlow } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const supplier = (supplierId: string, businessRoles: string[] = ['supplier', 'commercial']): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: businessRoles as QueryScope['businessRoles'],
  actor: NO_PERSON,
});

const LATER = '2026-10-15';
const THREE = ['sup-002', 'sup-005', 'sup-007'];

/** The six types, one question each; q1 carries a knock-out on "no". */
const SIX: RfiQuestion[] = [
  { id: 'q1', prompt: 'Do you hold a halal certificate for this format?', type: 'yes_no', required: true, knockout: 'no' },
  { id: 'q2', prompt: 'Which resin do you run?', type: 'single_choice', required: true, options: ['PET', 'HDPE', 'PP'] },
  { id: 'q3', prompt: 'Which decorations can you apply?', type: 'multi_choice', required: false, options: ['Screen print', 'Hot stamp', 'Label'] },
  { id: 'q4', prompt: 'Monthly capacity', type: 'number', required: true, unit: 'PCS' },
  { id: 'q5', prompt: 'Describe your quality system', type: 'text', required: false },
  { id: 'q6', prompt: 'Attach your latest audit report', type: 'document', required: false },
];

/** Answers that pass every required question and the knock-out. */
const GOOD = { q1: 'yes', q2: 'PET', q3: ['Label'], q4: 250_000, q5: 'ISO 9001.', q6: 'audit-2026.pdf' };

const rfqVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}, scope: QueryScope = named) =>
  svc.dispatch(scope, { transitionId, entity: 'rfq', entityId, payload });

const raise = async (extra: Record<string, unknown> = {}): Promise<string> => {
  const res = await svc.dispatch(named, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-2 probe — refill bottle',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: LATER,
      awardDeadline: '2026-10-30',
      stage: 'RFI',
      ...extra,
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

const setQuestions = (rfqId: string, questions: unknown, scope: QueryScope = named) =>
  rfqVerb('t_rfq_questionnaire_set', rfqId, questions === undefined ? {} : { questions }, scope);

/** An RFI published with `questions` (the six unless stated). */
const openRfi = async (questions: readonly RfiQuestion[] | null = SIX): Promise<string> => {
  const id = await raise();
  if (questions !== null) {
    const set = await setQuestions(id, questions);
    expect(set.status, set.reason).toBe('done');
  }
  const pub = await rfqVerb('t_rfq_publish', id);
  expect(pub.status, pub.reason).toBe('done');
  return id;
};

const respond = (
  transitionId: 't_stageresponse_submit' | 't_stageresponse_save',
  supplierId: string,
  rfqId: string,
  extra: Record<string, unknown> = {},
  scope?: QueryScope,
) =>
  svc.dispatch(scope ?? supplier(supplierId), {
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
describe('A · the questionnaire model', () => {
  it('the six question types, in the editor’s order', () => {
    expect(RFI_QUESTION_TYPES).toEqual(['yes_no', 'single_choice', 'multi_choice', 'number', 'text', 'document']);
  });

  it('KNOWN-GOOD — the six-question list is well-formed, and so is an empty one', () => {
    expect(questionnaireProblemOf(SIX)).toBeNull();
    expect(questionnaireProblemOf([])).toBeNull();
  });

  it.each([
    ['not a list', 'nope', 0, 'NOT_A_LIST'],
    ['no id', [{ ...SIX[0], id: ' ' }], 1, 'ID_MISSING'],
    ['a repeated id', [SIX[0], { ...SIX[1], id: 'q1' }], 2, 'ID_DUPLICATE'],
    ['no wording', [SIX[0], { ...SIX[1], prompt: '  ' }], 2, 'PROMPT_MISSING'],
    ['an unknown type', [{ ...SIX[4], type: 'essay' }], 1, 'TYPE_UNKNOWN'],
    ['one option', [{ ...SIX[1], options: ['PET'] }], 1, 'OPTIONS_TOO_FEW'],
    ['two options that are the same', [{ ...SIX[1], options: ['PET', ' PET '] }], 1, 'OPTIONS_TOO_FEW'],
    ['a number with no unit', [{ ...SIX[3], unit: '' }], 1, 'UNIT_MISSING'],
    ['a knock-out on a text question', [{ ...SIX[4], required: true, knockout: 'x' }], 1, 'KNOCKOUT_NOT_TAKEN'],
    ['a knock-out that is not an answer', [{ ...SIX[0], knockout: 'maybe' }], 1, 'KNOCKOUT_NOT_AN_ANSWER'],
    ['a knock-out that is not an option', [{ ...SIX[1], knockout: 'PVC' }], 1, 'KNOCKOUT_NOT_AN_ANSWER'],
    ['a knock-out on an optional question', [{ ...SIX[0], required: false }], 1, 'KNOCKOUT_NOT_REQUIRED'],
  ])('THE REFUSAL — %s', (_name, questions, number, code) => {
    expect(questionnaireProblemOf(questions)).toEqual({ number, code });
  });

  it('stored normalised: text trimmed, and only the fields the type takes', () => {
    const stored = normalizeQuestionnaire([
      { id: ' q1 ', prompt: ' Halal? ', type: 'yes_no', required: true, knockout: 'no', options: ['a', 'b'], unit: 'KG' },
      { id: 'q2', prompt: 'Resin', type: 'single_choice', required: 'yes', options: [' PET ', 'HDPE', 'PET', ''], unit: 'KG' },
      { id: 'q3', prompt: 'Capacity', type: 'number', required: false, unit: ' PCS ', options: ['x', 'y'] },
    ]);
    expect(stored).toEqual([
      { id: 'q1', prompt: 'Halal?', type: 'yes_no', required: true, knockout: 'no' },
      { id: 'q2', prompt: 'Resin', type: 'single_choice', required: false, options: ['PET', 'HDPE'] },
      { id: 'q3', prompt: 'Capacity', type: 'number', required: false, unit: 'PCS' },
    ]);
  });

  it('which types take a knock-out, and which answers it may name', () => {
    expect(RFI_QUESTION_TYPES.filter(takesKnockout)).toEqual(['yes_no', 'single_choice', 'multi_choice']);
    expect(knockoutChoicesOf(SIX[0])).toEqual(['yes', 'no']);
    expect(knockoutChoicesOf(SIX[1])).toEqual(['PET', 'HDPE', 'PP']);
    expect(knockoutChoicesOf(SIX[3])).toEqual([]);
  });

  it('answered: a blank, an empty tick-list and an absent answer say nothing; zero is a number', () => {
    expect([undefined, '', '   ', [], Number.NaN].map((a) => isAnswered(a as never))).toEqual([false, false, false, false, false]);
    expect(['no', 0, ['Label'], 'x.pdf'].map((a) => isAnswered(a as never))).toEqual([true, true, true, true]);
  });

  it('KNOWN-GOOD — one good answer per type fits, and unfinished answers are not a problem', () => {
    expect(answersProblemOf(SIX, GOOD)).toBeNull();
    expect(answersProblemOf(SIX, { q1: '', q3: [], q5: '  ' })).toBeNull();
    // an explicit `undefined` or `null` is no answer, not a wrong one
    expect(answersProblemOf(SIX, { q3: undefined, q5: null })).toBeNull();
    expect(answersProblemOf(SIX, undefined)).toBeNull();
  });

  it.each([
    ['not a map', ['yes'], { questionId: '', number: 0, code: 'NOT_A_MAP' }],
    ['a question that is not asked', { q9: 'yes' }, { questionId: 'q9', number: 0, code: 'UNKNOWN_QUESTION' }],
    ['yes/no given a word', { q1: 'maybe' }, { questionId: 'q1', number: 1, code: 'WRONG_KIND' }],
    ['a choice that is not an option', { q2: 'PVC' }, { questionId: 'q2', number: 2, code: 'WRONG_KIND' }],
    ['a tick that is not an option', { q3: ['Label', 'Foil'] }, { questionId: 'q3', number: 3, code: 'WRONG_KIND' }],
    ['the same tick twice', { q3: ['Label', 'Label'] }, { questionId: 'q3', number: 3, code: 'WRONG_KIND' }],
    ['a number given as text', { q4: '250000' }, { questionId: 'q4', number: 4, code: 'WRONG_KIND' }],
    ['text given a number', { q5: 9001 }, { questionId: 'q5', number: 5, code: 'WRONG_KIND' }],
    ['an answer that is an object', { q5: { text: 'x' } }, { questionId: 'q5', number: 5, code: 'WRONG_KIND' }],
  ])('THE REFUSAL — %s', (_name, answers, problem) => {
    expect(answersProblemOf(SIX, answers)).toEqual(problem);
  });

  it('stored normalised: only what says something, trimmed, in the questionnaire’s order', () => {
    expect(normalizeAnswers(SIX, { q5: '  ISO 9001. ', q1: 'yes', q3: [], q6: ' ' })).toEqual({ q1: 'yes', q5: 'ISO 9001.' });
    expect(Object.keys(normalizeAnswers(SIX, { q4: 1, q2: 'PP', q1: 'no' }))).toEqual(['q1', 'q2', 'q4']);
  });

  it('the required questions left unanswered, in order; an optional one is never among them', () => {
    expect(unansweredRequiredOf(SIX, {}).map((q) => q.id)).toEqual(['q1', 'q2', 'q4']);
    expect(unansweredRequiredOf(SIX, { q1: 'no', q4: 0 }).map((q) => q.id)).toEqual(['q2']);
    expect(unansweredRequiredOf(SIX, GOOD)).toEqual([]);
  });

  it('the knock-out: the named answer fails, any other passes, and a tick-list fails by containing it', () => {
    expect(isKnockedOutBy(SIX[0], 'no')).toBe(true);
    expect(isKnockedOutBy(SIX[0], 'yes')).toBe(false);
    expect(isKnockedOutBy(SIX[0], undefined)).toBe(false);
    expect(isKnockedOutBy(SIX[1], 'PET')).toBe(false); // no knock-out on it
    const multi: RfiQuestion = { ...SIX[2], required: true, knockout: 'Hot stamp' };
    expect(isKnockedOutBy(multi, ['Label', 'Hot stamp'])).toBe(true);
    expect(isKnockedOutBy(multi, ['Label'])).toBe(false);
    expect(knockoutFailuresOf(SIX, { ...GOOD, q1: 'no' }).map((q) => q.id)).toEqual(['q1']);
    expect(knockoutFailuresOf(SIX, GOOD)).toEqual([]);
    expect(hasKnockouts(SIX)).toBe(true);
    expect(hasKnockouts(SIX.slice(1))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('B · the buyer writes the questionnaire on a draft', () => {
  it('the machine: on a Draft only, state-preserving, the drafting atom, two checks in this order', () => {
    const t = getFlow('rfq')!.transitions.find((x) => x.id === 't_rfq_questionnaire_set')!;
    expect(t.from).toEqual(['Draft']);
    expect(t.to).toBe('Draft');
    expect(t.statePreserving).toBe(true);
    expect(t.requiredRole).toBe('rfq:create');
    expect(t.requiredFields).toEqual([]);
    expect(t.policyHooks).toEqual([
      POLICY_HOOKS.RFQ_QUESTIONNAIRE_AT_RFI,
      POLICY_HOOKS.RFQ_QUESTIONNAIRE_WELL_FORMED,
    ]);
  });

  it('EXISTING DATA IS UNCHANGED — no seeded event carries a questionnaire, and no seeded answer carries answers', () => {
    expect(mockRfqs.length).toBeGreaterThan(10);
    expect(mockRfqs.filter((r) => r.questionnaire !== undefined)).toEqual([]);
    expect(mockStageResponses.length).toBeGreaterThan(0);
    expect(mockStageResponses.filter((r) => r.answers !== undefined || r.status !== undefined)).toEqual([]);
  });

  it('KNOWN-GOOD — six questions are stored on the draft, normalised, and the draft is still a Draft', async () => {
    const id = await raise();
    const res = await setQuestions(id, SIX);
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Draft');
    expect(rfqStore.get(id)!.questionnaire).toEqual(SIX);
  });

  it('THE VERB STORES IT NORMALISED — an untidy list goes in, the tidy one is what the event holds', async () => {
    const id = await raise();
    const res = await setQuestions(id, [
      { id: ' q1 ', prompt: '  Halal?  ', type: 'yes_no', required: true, knockout: 'no', options: ['x', 'y'], unit: 'KG' },
      { id: 'q2', prompt: 'Resin', type: 'single_choice', required: true, options: [' PET ', 'HDPE', 'PET', ''] },
    ]);
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.questionnaire).toEqual([
      { id: 'q1', prompt: 'Halal?', type: 'yes_no', required: true, knockout: 'no' },
      { id: 'q2', prompt: 'Resin', type: 'single_choice', required: true, options: ['PET', 'HDPE'] },
    ]);
  });

  it('a second set replaces the list whole; an empty list removes the field', async () => {
    const id = await raise();
    await setQuestions(id, SIX);
    expect((await setQuestions(id, SIX.slice(0, 2))).status).toBe('done');
    expect(rfqStore.get(id)!.questionnaire!.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect((await setQuestions(id, [])).status).toBe('done');
    expect('questionnaire' in rfqStore.get(id)!).toBe(false);
  });

  it('THE REFUSAL — an event that starts at RFP or RFQ takes no questionnaire; one at RFI does', async () => {
    for (const stage of ['RFP', 'RFQ']) {
      const id = await raise({ stage });
      refusedBy(await setQuestions(id, SIX), POLICY_HOOKS.RFQ_QUESTIONNAIRE_AT_RFI, 'QUESTIONNAIRE_STAGE_NOT_RFI');
      expect(rfqStore.get(id)!.questionnaire).toBeUndefined();
    }
    const noStage = await raise({ stage: undefined });
    refusedBy(await setQuestions(noStage, SIX), POLICY_HOOKS.RFQ_QUESTIONNAIRE_AT_RFI, 'QUESTIONNAIRE_STAGE_NOT_RFI');
  });

  it('THE REFUSAL — a malformed list is refused with the question and the fault named, and nothing is stored', async () => {
    const id = await raise();
    const res = await setQuestions(id, [SIX[0], { ...SIX[1], options: ['PET'] }]);
    refusedBy(res, POLICY_HOOKS.RFQ_QUESTIONNAIRE_WELL_FORMED, 'QUESTIONNAIRE_MALFORMED');
    expect(res.reason).toContain('Q2');
    expect(res.reason).toContain('OPTIONS_TOO_FEW');
    expect(rfqStore.get(id)!.questionnaire).toBeUndefined();
    // No `questions` at all is the same refusal, not a silent no-op.
    const absent = await setQuestions(id, undefined);
    refusedBy(absent, POLICY_HOOKS.RFQ_QUESTIONNAIRE_WELL_FORMED, 'NOT_A_LIST');
  });

  it('THE REFUSAL — once published the questions do not move: the verb is illegal on Open and Closed', async () => {
    const id = await openRfi();
    const onOpen = await setQuestions(id, []);
    expect(onOpen.status).toBe('failed');
    expect(onOpen.reason).toContain('ILLEGAL_TRANSITION');
    await rfqVerb('t_rfq_close', id);
    expect((await setQuestions(id, [])).status).toBe('failed');
    expect(rfqStore.get(id)!.questionnaire).toEqual(SIX);
  });

  it('a seat without procurement does not hold the verb; a supplier is denied at scope', async () => {
    const id = await raise();
    const finance = await setQuestions(id, SIX, { ...named, businessRoles: ['finance'] });
    expect(finance.status).toBe('failed');
    expect(finance.reason).toContain('ROLE_NOT_PERMITTED');
    await expect(setQuestions(id, SIX, supplier('sup-002'))).rejects.toThrow(/denied for scope/);
    expect(rfqStore.get(id)!.questionnaire).toBeUndefined();
  });

  it('a seat with nobody named writes the questionnaire, as it raises the draft', async () => {
    const id = await raise();
    expect((await setQuestions(id, SIX, { ...named, actor: NO_PERSON })).status).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('C · the response machine: a draft, and a submitted answer', () => {
  it('two states; Submitted is the only terminal; four verbs on one atom', () => {
    const flow = getFlow('stageResponse')!;
    expect(flow.states).toEqual(['Draft', 'Submitted']);
    expect(flow.initial).toBe('Draft');
    expect(flow.terminals).toEqual(['Submitted']);
    expect(flow.transitions.map((t) => [t.id, t.from, t.to])).toEqual([
      ['t_stageresponse_submit', [], 'Submitted'],
      ['t_stageresponse_save', [], 'Draft'],
      ['t_stageresponse_resave', ['Draft'], 'Draft'],
      ['t_stageresponse_send', ['Draft'], 'Submitted'],
    ]);
    expect([...new Set(flow.transitions.map((t) => t.requiredRole))]).toEqual(['stageresponse:submit']);
  });

  it('the checks, per verb, in order: only the two that submit read the required questions', () => {
    const hooks = (id: string) => getFlow('stageResponse')!.transitions.find((t) => t.id === id)!.policyHooks;
    const H = POLICY_HOOKS;
    expect(hooks('t_stageresponse_submit')).toEqual([
      H.STAGE_RESPONSE_EVENT_OPEN, H.STAGE_RESPONSE_STAGE_TAKES_INTEREST, H.STAGE_RESPONSE_BEFORE_DEADLINE,
      H.STAGE_RESPONSE_ONE_PER_STAGE, H.STAGE_RESPONSE_ANSWERS_WELL_FORMED, H.STAGE_RESPONSE_REQUIRED_ANSWERED,
    ]);
    expect(hooks('t_stageresponse_save')).toEqual([
      H.STAGE_RESPONSE_EVENT_OPEN, H.STAGE_RESPONSE_STAGE_TAKES_INTEREST, H.STAGE_RESPONSE_BEFORE_DEADLINE,
      H.STAGE_RESPONSE_ONE_PER_STAGE, H.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
    ]);
    expect(hooks('t_stageresponse_resave')).toEqual([
      H.STAGE_RESPONSE_EVENT_OPEN, H.STAGE_RESPONSE_DRAFT_STAGE_CURRENT, H.STAGE_RESPONSE_BEFORE_DEADLINE,
      H.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
    ]);
    expect(hooks('t_stageresponse_send')).toEqual([
      H.STAGE_RESPONSE_EVENT_OPEN, H.STAGE_RESPONSE_DRAFT_STAGE_CURRENT, H.STAGE_RESPONSE_BEFORE_DEADLINE,
      H.STAGE_RESPONSE_ANSWERS_WELL_FORMED, H.STAGE_RESPONSE_REQUIRED_ANSWERED,
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('D · a supplier answers the questionnaire in one act', () => {
  it('KNOWN-GOOD — six answers are stored against the response, normalised, and the supplier has responded', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, { answers: GOOD, note: ' See audit. ' });
    expect(res.status, res.reason).toBe('done');
    const row = stageResponseStore.get(res.entityId!)!;
    expect(row.answers).toEqual(GOOD);
    expect(row.note).toBe('See audit.');
    expect(row.stage).toBe('RFI');
    expect('status' in row).toBe(false);
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-005']);
  });

  it('THE VERB STORES THE ANSWERS NORMALISED — padding trimmed, a blank and an empty tick-list not kept', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, {
      answers: { q5: '  ISO 9001.  ', q1: 'yes', q2: 'PET', q4: 7, q3: [], q6: '   ' },
    });
    expect(res.status, res.reason).toBe('done');
    const stored = stageResponseStore.get(res.entityId!)!.answers!;
    expect(stored).toEqual({ q1: 'yes', q2: 'PET', q4: 7, q5: 'ISO 9001.' });
    expect(Object.keys(stored)).toEqual(['q1', 'q2', 'q4', 'q5']);
  });

  it('THE REFUSAL — a required question unanswered is refused BY NAME: its number and its wording', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, { answers: { q1: 'yes', q2: 'PET' } });
    refusedBy(res, POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED, 'RESPONSE_QUESTION_REQUIRED');
    expect(res.reason).toContain('Q4 ("Monthly capacity")');
    expect(res.reason).not.toContain('Q1');
    expect(res.reason).not.toContain('Q3'); // optional
    expect(stageResponseStore.forRfq(id)).toEqual([]);
  });

  it('every required question left out is named, and a blank is not an answer', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, { answers: { q1: '  ', q4: 10 } });
    refusedBy(res, POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED, 'RESPONSE_QUESTION_REQUIRED');
    expect(res.reason).toContain('Q1 ("Do you hold a halal certificate for this format?"), Q2 ("Which resin do you run?") are required');
    const none = await respond('t_stageresponse_submit', 'sup-005', id);
    refusedBy(none, POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED, 'Q1');
  });

  it('only the optional questions left out: it submits', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, { answers: { q1: 'yes', q2: 'PP', q4: 0 } });
    expect(res.status, res.reason).toBe('done');
    expect(stageResponseStore.get(res.entityId!)!.answers).toEqual({ q1: 'yes', q2: 'PP', q4: 0 });
  });

  it('THE REFUSAL — an answer that is not one its question takes, named; read before the required ones', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, { answers: { q2: 'PVC' } });
    refusedBy(res, POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED, 'RESPONSE_ANSWER_INVALID');
    expect(res.reason).toContain('Q2 ("Which resin do you run?")');
    const unknown = await respond('t_stageresponse_submit', 'sup-005', id, { answers: { ...GOOD, q9: 'x' } });
    refusedBy(unknown, POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED, "'q9' is not a question");
  });

  it('A KNOCK-OUT ANSWER IS NOT A REFUSAL — the supplier submits it; the buyer reads that it failed', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-007', id, { answers: { ...GOOD, q1: 'no' } });
    expect(res.status, res.reason).toBe('done');
    const event = rfqStore.get(id)!;
    const answer = event.stageResponses!.find((r) => r.supplierId === 'sup-007')!;
    expect(knockoutFailuresOf(event.questionnaire!, answer.answers).map((q) => q.id)).toEqual(['q1']);
  });

  it('a document question keeps the file’s NAME and nothing else', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_submit', 'sup-005', id, { answers: GOOD });
    expect(stageResponseStore.get(res.entityId!)!.answers!.q6).toBe('audit-2026.pdf');
  });

  it('AN RFI THAT ASKS NOTHING IS RFx-1’s: interest and a note submit, and answers are refused', async () => {
    const id = await openRfi(null);
    const stray = await respond('t_stageresponse_submit', 'sup-002', id, { answers: { q1: 'yes' } });
    refusedBy(stray, POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED, 'asks no questionnaire at this stage');
    const plain = await respond('t_stageresponse_submit', 'sup-002', id, { note: 'Interested.' });
    expect(plain.status, plain.reason).toBe('done');
    expect(stageResponseStore.get(plain.entityId!)!.answers).toBeUndefined();
  });

  it('AT THE RFP THE QUESTIONNAIRE IS NOT ASKED AGAIN — interest submits with no answers', async () => {
    const id = await openRfi();
    for (const s of THREE) expect((await respond('t_stageresponse_submit', s, id, { answers: GOOD })).status).toBe('done');
    await rfqVerb('t_rfq_close', id);
    const adv = await rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: LATER });
    expect(adv.status, adv.reason).toBe('done');
    expect(rfqStore.get(id)!.stage).toBe('RFP');
    expect(rfqStore.get(id)!.questionnaire).toEqual(SIX); // the RFI's record stays
    const rfp = await respond('t_stageresponse_submit', 'sup-005', id);
    expect(rfp.status, rfp.reason).toBe('done');
    refusedBy(
      await respond('t_stageresponse_submit', 'sup-002', id, { answers: GOOD }),
      POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
      'asks no questionnaire at this stage',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E · save a draft, save it again, submit it', () => {
  it('KNOWN-GOOD — a draft with one answer is saved; it is not a response and the buyer does not read it', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_save', 'sup-005', id, { answers: { q1: 'yes' } });
    expect(res.status, res.reason).toBe('done');
    const row = stageResponseStore.get(res.entityId!)!;
    expect(row.status).toBe('Draft');
    expect(row.answers).toEqual({ q1: 'yes' });
    expect(isSubmittedResponse(row)).toBe(false);
    const event = rfqStore.get(id)!;
    expect(event.respondedSupplierIds).toEqual([]);
    expect(event.stageResponses).toEqual([]);
    const buyerRead = await mockDataService.procurement.getRFQs({ personaType: 'buyer', supplierId: null });
    expect(JSON.stringify(buyerRead.items.find((r) => r.id === id))).not.toContain(res.entityId!);
  });

  it('who has responded, asked of the rows directly: a Draft is not counted, a row with no status is', () => {
    const row = { id: 'r1', rfqId: 'e1', stage: 'RFI' as const, supplierId: 'sup-005', respondedAt: '2026-09-01' };
    expect(stageRespondersOf([{ ...row, status: 'Draft' }], 'e1', 'RFI')).toEqual([]);
    expect(stageRespondersOf([row], 'e1', 'RFI')).toEqual(['sup-005']);
    expect(stageRespondersOf([{ ...row, status: 'Submitted' }], 'e1', 'RFI')).toEqual(['sup-005']);
    expect(
      stageRespondersOf([{ ...row, status: 'Draft' }, { ...row, id: 'r2', supplierId: 'sup-007' }], 'e1', 'RFI'),
    ).toEqual(['sup-007']);
  });

  it('a draft needs no required answer — an empty one saves', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_save', 'sup-005', id);
    expect(res.status, res.reason).toBe('done');
    expect(stageResponseStore.get(res.entityId!)!.answers).toBeUndefined();
  });

  it('THE REFUSAL — a draft still refuses an answer its question does not take', async () => {
    const id = await openRfi();
    refusedBy(
      await respond('t_stageresponse_save', 'sup-005', id, { answers: { q4: 'lots' } }),
      POLICY_HOOKS.STAGE_RESPONSE_ANSWERS_WELL_FORMED,
      'Q4 ("Monthly capacity")',
    );
    expect(stageResponseStore.forRfq(id)).toEqual([]);
  });

  it('re-saving REPLACES the draft: an answer taken off is gone, not kept', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: { q1: 'yes', q2: 'PET' }, note: 'first' })).entityId!;
    const res = await onDraft('t_stageresponse_resave', 'sup-005', draft, { answers: { q2: 'HDPE', q4: 5 } });
    expect(res.status, res.reason).toBe('done');
    const row = stageResponseStore.get(draft)!;
    expect(row.status).toBe('Draft');
    expect(row.answers).toEqual({ q2: 'HDPE', q4: 5 });
    expect(row.note).toBeUndefined();
    expect(row.rfqId).toBe(id);
    expect(row.supplierId).toBe('sup-005');
  });

  it('THE REFUSAL — submitting a draft with a required question unanswered names it, and it stays a Draft', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: { q1: 'yes' } })).entityId!;
    const res = await onDraft('t_stageresponse_send', 'sup-005', draft, { answers: { q1: 'yes', q2: 'PET' } });
    refusedBy(res, POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED, 'Q4 ("Monthly capacity")');
    expect(stageResponseStore.get(draft)!.status).toBe('Draft');
    expect(stageResponseStore.get(draft)!.answers).toEqual({ q1: 'yes' });
  });

  it('KNOWN-GOOD — the same draft, finished, is submitted: the answers sent are the answers kept', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: { q1: 'yes' } })).entityId!;
    const res = await onDraft('t_stageresponse_send', 'sup-005', draft, { answers: GOOD, note: 'Done.' });
    expect(res.status, res.reason).toBe('done');
    const row = stageResponseStore.get(draft)!;
    expect('status' in row).toBe(false);
    expect(row.answers).toEqual(GOOD);
    expect(row.note).toBe('Done.');
    expect(rfqStore.get(id)!.respondedSupplierIds).toEqual(['sup-005']);
    expect(rfqStore.get(id)!.stageResponses!.map((r) => r.id)).toEqual([draft]);
  });

  it('a send that states no answers is judged on none — the saved ones are not read back', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: GOOD })).entityId!;
    refusedBy(await onDraft('t_stageresponse_send', 'sup-005', draft), POLICY_HOOKS.STAGE_RESPONSE_REQUIRED_ANSWERED, 'Q1');
  });

  it('nothing leaves Submitted: a submitted answer is not re-saved or sent again', async () => {
    const id = await openRfi();
    const done = (await respond('t_stageresponse_submit', 'sup-005', id, { answers: GOOD })).entityId!;
    for (const verb of ['t_stageresponse_resave', 't_stageresponse_send'] as const) {
      const res = await onDraft(verb, 'sup-005', done, { answers: { ...GOOD, q1: 'no' } });
      expect(res.status).toBe('failed');
      expect(res.reason).toContain('ILLEGAL_TRANSITION');
    }
    expect(stageResponseStore.get(done)!.answers).toEqual(GOOD);
  });

  it('THE REFUSAL — one row per supplier per stage: a second draft, and a one-act submit beside a draft', async () => {
    const id = await openRfi();
    await respond('t_stageresponse_save', 'sup-005', id);
    refusedBy(await respond('t_stageresponse_save', 'sup-005', id), POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE, 'INTEREST_ALREADY_RECORDED');
    refusedBy(
      await respond('t_stageresponse_submit', 'sup-005', id, { answers: GOOD }),
      POLICY_HOOKS.STAGE_RESPONSE_ONE_PER_STAGE,
      'INTEREST_ALREADY_RECORDED',
    );
    // Another supplier is not affected by it.
    expect((await respond('t_stageresponse_save', 'sup-002', id)).status).toBe('done');
  });

  it('THE REFUSAL — the buyer closed bidding: a draft is neither re-saved nor submitted', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: GOOD })).entityId!;
    await rfqVerb('t_rfq_close', id);
    refusedBy(await onDraft('t_stageresponse_resave', 'sup-005', draft, { answers: GOOD }), POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN, 'INTEREST_EVENT_NOT_OPEN');
    refusedBy(await onDraft('t_stageresponse_send', 'sup-005', draft, { answers: GOOD }), POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN, 'INTEREST_EVENT_NOT_OPEN');
    refusedBy(await respond('t_stageresponse_save', 'sup-002', id), POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN, 'INTEREST_EVENT_NOT_OPEN');
  });

  it('THE EVENT IS THE DRAFT’S OWN — a payload naming another open event does not open a closed one', async () => {
    const closed = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', closed, { answers: GOOD })).entityId!;
    await rfqVerb('t_rfq_close', closed);
    const open = await openRfi();
    const res = await onDraft('t_stageresponse_send', 'sup-005', draft, { rfqId: open, answers: GOOD });
    refusedBy(res, POLICY_HOOKS.STAGE_RESPONSE_EVENT_OPEN, 'INTEREST_EVENT_NOT_OPEN');
    expect(stageResponseStore.get(draft)!.rfqId).toBe(closed);
  });

  it('THE REFUSAL — after the stage’s deadline a draft is not saved, re-saved or submitted', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: GOOD })).entityId!;
    rfqStore.update(id, (r) => ({ ...r, responseDeadline: '2026-01-01' }));
    for (const verb of ['t_stageresponse_resave', 't_stageresponse_send'] as const) {
      refusedBy(await onDraft(verb, 'sup-005', draft, { answers: GOOD }), POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE, 'INTEREST_DEADLINE_PASSED');
    }
    refusedBy(await respond('t_stageresponse_save', 'sup-002', id), POLICY_HOOKS.STAGE_RESPONSE_BEFORE_DEADLINE, 'INTEREST_DEADLINE_PASSED');
  });

  it('THE REFUSAL — a draft left from a stage the event has moved past does not answer the next one', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-002', id, { answers: GOOD })).entityId!;
    for (const s of ['sup-005', 'sup-007']) await respond('t_stageresponse_submit', s, id, { answers: GOOD });
    await rfqVerb('t_rfq_close', id);
    // sup-002 saved a draft and never submitted: it is not a responder.
    refusedBy(
      await rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: LATER }),
      POLICY_HOOKS.RFQ_ADVANCE_SHORTLIST_RESPONDED,
      'sup-002',
    );
    const adv = await rfqVerb('t_rfq_advance', id, {
      shortlistSupplierIds: ['sup-005', 'sup-007'],
      shortlistReason: 'Did not answer the RFI.',
      responseDeadline: LATER,
    });
    expect(adv.status, adv.reason).toBe('done');
    refusedBy(await onDraft('t_stageresponse_send', 'sup-002', draft), POLICY_HOOKS.STAGE_RESPONSE_DRAFT_STAGE_CURRENT, 'RESPONSE_DRAFT_STAGE_OVER');
    refusedBy(await onDraft('t_stageresponse_resave', 'sup-002', draft), POLICY_HOOKS.STAGE_RESPONSE_DRAFT_STAGE_CURRENT, 'RESPONSE_DRAFT_STAGE_OVER');
  });

  it('another supplier does not touch a draft, and the buyer does not hold the verbs', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: GOOD })).entityId!;
    await expect(onDraft('t_stageresponse_send', 'sup-002', draft, { answers: GOOD })).rejects.toThrow(/denied for scope/);
    const buyer = await svc.dispatch(named, { transitionId: 't_stageresponse_send', entity: 'stageResponse', entityId: draft, payload: { answers: GOOD } });
    expect(buyer.status).toBe('failed');
    expect(buyer.reason).toContain('ROLE_NOT_PERMITTED');
    expect(stageResponseStore.get(draft)!.status).toBe('Draft');
  });

  it('a supplier seat without the commercial lane does not save a draft', async () => {
    const id = await openRfi();
    const res = await respond('t_stageresponse_save', 'sup-005', id, {}, supplier('sup-005', ['supplier', 'fulfilment']));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('F · what crosses to a supplier', () => {
  it('a question as a supplier reads it carries no knock-out — and exactly these fields', () => {
    expect(SIX[0].knockout).toBe('no');
    expect(Object.keys(toSupplierQuestion(SIX[0])).sort()).toEqual(['id', 'prompt', 'required', 'type']);
    expect(Object.keys(toSupplierQuestion(SIX[1])).sort()).toEqual(['id', 'options', 'prompt', 'required', 'type']);
    expect(Object.keys(toSupplierQuestion(SIX[3])).sort()).toEqual(['id', 'prompt', 'required', 'type', 'unit']);
  });

  it('the supplier’s read of the event: the six questions, no knock-out anywhere in it', async () => {
    const id = await openRfi();
    const read = await mockDataService.procurement.getRFQs({ personaType: 'supplier', supplierId: 'sup-005' });
    const mine = read.items.find((r) => r.id === id)!;
    expect(mine.questionnaire!.map((q) => q.id)).toEqual(SIX.map((q) => q.id));
    expect(JSON.stringify(mine)).not.toContain('knockout');
    // CONTROL — the buyer's read of the same event does carry it.
    const buyer = await mockDataService.procurement.getRFQs({ personaType: 'buyer', supplierId: null });
    expect(JSON.stringify(buyer.items.find((r) => r.id === id))).toContain('knockout');
  });

  it('a supplier reads its OWN draft, at the current stage, and nobody else’s', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id, { answers: { q1: 'yes' } })).entityId!;
    await respond('t_stageresponse_submit', 'sup-007', id, { answers: GOOD });
    const read = async (sid: string) =>
      (await mockDataService.procurement.getRFQs({ personaType: 'supplier', supplierId: sid })).items.find((r) => r.id === id)!;
    const own = await read('sup-005');
    expect(own.myStageDraft?.id).toBe(draft);
    expect(own.myStageDraft?.answers).toEqual({ q1: 'yes' });
    expect(own.stageResponses).toEqual([]);
    const other = await read('sup-002');
    expect(other.myStageDraft).toBeUndefined();
    expect(JSON.stringify(other)).not.toContain('sup-005');
    expect(JSON.stringify(other)).not.toContain('sup-007');
    const answered = await read('sup-007');
    expect(answered.myStageDraft).toBeUndefined();
    expect(answered.stageResponses!.map((r) => r.supplierId)).toEqual(['sup-007']);
  });

  it('the view refuses a draft that is not the reader’s, not a draft, or not of the current stage', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id)).entityId!;
    const event = rfqStore.get(id)!;
    const row = stageResponseStore.get(draft)!;
    expect(toSupplierRfqView(event, 'sup-005', row).myStageDraft).toBe(row);
    expect(toSupplierRfqView(event, 'sup-002', row).myStageDraft).toBeUndefined();
    expect(toSupplierRfqView(event, 'sup-005', { ...row, status: undefined }).myStageDraft).toBeUndefined();
    expect(toSupplierRfqView(event, 'sup-005', { ...row, stage: 'RFP' }).myStageDraft).toBeUndefined();
    expect(toSupplierRfqView(event, 'sup-005', { ...row, rfqId: 'rfq-001' }).myStageDraft).toBeUndefined();
  });

  it('the store drops a draft a caller carried back in on an event row', async () => {
    const id = await openRfi();
    const draft = (await respond('t_stageresponse_save', 'sup-005', id)).entityId!;
    rfqStore.update(id, (r) => ({ ...r, myStageDraft: stageResponseStore.get(draft)! }));
    expect('myStageDraft' in rfqStore.get(id)!).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('G · END TO END — six questions, two suppliers, one knocked out, the shortlist', () => {
  it('the buyer advances with the suppliers who passed every knock-out; the one who failed reads why', async () => {
    const id = await openRfi();
    expect((await respond('t_stageresponse_submit', 'sup-005', id, { answers: GOOD })).status).toBe('done');
    expect((await respond('t_stageresponse_submit', 'sup-007', id, { answers: { ...GOOD, q2: 'HDPE' } })).status).toBe('done');
    expect((await respond('t_stageresponse_submit', 'sup-002', id, { answers: { ...GOOD, q1: 'no' } })).status).toBe('done');
    expect((await rfqVerb('t_rfq_close', id)).status).toBe('done');

    const event = rfqStore.get(id)!;
    const passed = event.respondedSupplierIds.filter((sid) => {
      const a = event.stageResponses!.find((r) => r.supplierId === sid && r.stage === 'RFI')!;
      return knockoutFailuresOf(event.questionnaire!, a.answers).length === 0;
    });
    expect(passed).toEqual(['sup-005', 'sup-007']);

    const adv = await rfqVerb('t_rfq_advance', id, {
      shortlistSupplierIds: passed,
      shortlistReason: 'No halal certificate for this format.',
      responseDeadline: LATER,
    });
    expect(adv.status, adv.reason).toBe('done');
    const after = rfqStore.get(id)!;
    expect(after.stage).toBe('RFP');
    expect(after.invitedSupplierIds).toEqual(['sup-005', 'sup-007']);
    const out = (await mockDataService.procurement.getRFQs({ personaType: 'supplier', supplierId: 'sup-002' })).items.find((r) => r.id === id)!;
    expect(out.stageHistory![0].reason).toBe('No halal certificate for this format.');
  });

  it('THE BUYER STILL DECIDES — a supplier that gave a knock-out answer may be carried forward', async () => {
    const id = await openRfi();
    for (const s of THREE) await respond('t_stageresponse_submit', s, id, { answers: { ...GOOD, q1: s === 'sup-002' ? 'no' : 'yes' } });
    await rfqVerb('t_rfq_close', id);
    const adv = await rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: LATER });
    expect(adv.status, adv.reason).toBe('done');
    expect(rfqStore.get(id)!.invitedSupplierIds).toEqual(THREE);
  });
});
