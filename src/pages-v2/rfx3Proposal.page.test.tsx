// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · THE RFP — what the buyer and the supplier see.
//
// The machine is proven in `services/data/mock/rfx3Proposal.test.ts`. This file
// renders the two pages over the real stores and reads what a person reads: the
// criteria editor and its running total, the refusal when the weights do not
// make 100, the supplier's proposal form and the refusal that names a required
// criterion, the buyer's proposals, score sheet and ranking, the shortlist that
// can start from the ranking, a supplier's page carrying no score — and the
// sourcing list that now says which stage every event is at. EN, then ID.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { stageResponseStore } from '../services/data/mock/stores/stageResponseStore';
import { mockSuppliers } from '../data/mockSuppliers';
import { stageOf } from '../data/rfqStage';
import { SAMPLE_ACTORS } from '../services/identity/sampleActors';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import { evaluatorIdOf, type RfpCriterion } from '../data/rfpEvaluation';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import SupplierRFQs from './SupplierRFQs';
import { useToast } from '../hooks/useToast';
import { rfpProposalsOf, rfpRankingOf, scoreRefusalKey, scoreText, scoresLockedBy } from './sourcing/rfpEvaluationModel';
import { interestRefusalKey, namedCriteria } from './rfqs/rfiAnswerModel';

function ToastSpy() {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>
          {t.title} {t.description}
        </li>
      ))}
    </ul>
  );
}
const Sourcing = () => (
  <>
    <BuyerSourcing />
    <ToastSpy />
  </>
);
const Rfqs = () => (
  <>
    <SupplierRFQs />
    <ToastSpy />
  </>
);

const svc = new MockCommandService();
const scopeOf = (actor: QueryScope['actor']): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor,
});
const evaluator1 = scopeOf(SAMPLE_ACTORS.procurement1);
const evaluator2 = scopeOf(SAMPLE_ACTORS.procurement2);
const supplierScope = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
});
const as = (supplierId: string): CurrentIdentity => ({ ...SUPPLIER, supplierId, supplierName: supplierId });
/** The buyer seat acting as the SECOND procurement person. */
const BUYER_NAMED_2: CurrentIdentity = { ...BUYER, actor: SAMPLE_ACTORS.procurement2 };
const RECEIVING_NAMED: CurrentIdentity = { ...BUYER_NAMED, businessRoles: ['receiving'] };
const E2 = evaluatorIdOf({ scoredBy: SAMPLE_ACTORS.procurement2 });

const THREE = ['sup-002', 'sup-005', 'sup-007'];
const NAME = Object.fromEntries(mockSuppliers.map((s) => [s.id, s.name]));
const ID = 'RFQ-2026-901'; // the first event a test raises

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

const rfqVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}, scope = evaluator1) =>
  svc.dispatch(scope, { transitionId, entity: 'rfq', entityId, payload });
const ok = async (p: Promise<{ status: string; reason?: string }>) => {
  const res = await p;
  expect(res.status, res.reason).toBe('done');
};

const draftEvent = async (stage: 'RFI' | 'RFP' | 'RFQ' = 'RFP'): Promise<string> => {
  const made = await svc.dispatch(evaluator1, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-3 page probe',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: '2026-10-15',
      awardDeadline: '2026-10-30',
      ...(stage === 'RFQ' ? {} : { stage }),
    },
  });
  expect(made.status, made.reason).toBe('done');
  return made.entityId!;
};

const openRfp = async (criteria: readonly RfpCriterion[] = FOUR): Promise<string> => {
  const id = await draftEvent('RFP');
  if (criteria.length > 0) await ok(rfqVerb('t_rfq_criteria_set', id, { criteria }));
  await ok(rfqVerb('t_rfq_publish', id));
  return id;
};

const propose = (supplierId: string, rfqId: string, extra: Record<string, unknown> = {}) =>
  ok(
    svc.dispatch(supplierScope(supplierId), {
      transitionId: 't_stageresponse_submit',
      entity: 'stageResponse',
      payload: { rfqId, supplierId, proposal: PROPOSAL, ...extra },
    }),
  );

const closedRfp = async (): Promise<string> => {
  const id = await openRfp();
  for (const s of THREE) await propose(s, id, s === 'sup-002' ? { documents: ['proposal.pdf'] } : {});
  await ok(rfqVerb('t_rfq_close', id));
  return id;
};

const sheet = (scores: readonly number[]) =>
  FOUR.map((c, i) => ({ criterionId: c.id, score: scores[i], comment: `On ${c.name}.` }));
const score = (rfqId: string, supplierId: string, scores: readonly number[], scope = evaluator1) =>
  ok(rfqVerb('t_rfq_proposal_score', rfqId, { supplierId, scores: sheet(scores) }, scope));

/** Two evaluators, three proposals: sup-007 4.75, sup-002 3.90, sup-005 3.20. */
const scoredRfp = async (): Promise<string> => {
  const id = await closedRfp();
  await score(id, 'sup-002', [5, 4, 3, 2], evaluator1);
  await score(id, 'sup-002', [3, 4, 5, 4], evaluator2);
  await score(id, 'sup-005', [4, 4, 4, 4], evaluator1);
  await score(id, 'sup-005', [2, 3, 3, 1], evaluator2);
  await score(id, 'sup-007', [5, 5, 4, 3], evaluator1);
  await score(id, 'sup-007', [5, 5, 5, 5], evaluator2);
  return id;
};

const openRfq = async (rfqNumber: string) => {
  fireEvent.click(await screen.findByText(rfqNumber));
  await screen.findByRole('dialog');
};
const toast = () => screen.getByTestId('toast-spy');
const type = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
const card = async (rfqNumber: string): Promise<HTMLElement> =>
  (await screen.findByText(rfqNumber)).closest('.rounded-lg') as HTMLElement;
const rowOf = async (rfqNumber: string): Promise<HTMLElement> =>
  (await screen.findByText(rfqNumber)).closest('tr') as HTMLElement;

beforeEach(() => {
  stageResponseStore.reset();
  quotationStore.reset();
  rfqStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('1 · the buyer sets the criteria on a draft', () => {
  it('a draft that starts at RFP says it sets none, and offers the way in', async () => {
    await draftEvent('RFP');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    const section = screen.getByTestId('rfq-criteria-section');
    expect(section).toHaveTextContent('RFP evaluation criteria');
    expect(within(section).getByTestId('rfp-criteria-none')).toHaveTextContent(
      'This draft sets no evaluation criteria. Published like this, suppliers record their interest and a note at the RFP stage, and nothing is scored.',
    );
    expect(within(section).getByTestId('rfp-criteria-edit')).toHaveTextContent('Set criteria');
    // An RFP-start event has no RFI stage: no questionnaire section.
    expect(screen.queryByTestId('rfq-questionnaire-section')).not.toBeInTheDocument();
  });

  it('a draft that starts at RFQ has no criteria section; one that starts at RFI has both sections', async () => {
    await draftEvent('RFQ');
    const { unmount } = renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.queryByTestId('rfq-criteria-section')).not.toBeInTheDocument();
    unmount();
    rfqStore.reset();
    await draftEvent('RFI');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfq-criteria-section')).toBeInTheDocument();
    expect(screen.getByTestId('rfq-questionnaire-section')).toBeInTheDocument();
  });

  it('a seat without procurement reads who sets them, in the button’s slot', async () => {
    await draftEvent('RFP');
    renderWithProviders(<Sourcing />, { identity: RECEIVING_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('handoff-rfq-criteria')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-criteria-edit')).not.toBeInTheDocument();
  });

  it('THE MODE IS GATED, NOT THE DOOR — a seat narrowed while the criteria editor stands open loses it', async () => {
    await draftEvent('RFP');
    renderWithProviders(<Sourcing />, {
      identity: { ...BUYER_NAMED, businessRoles: ['procurement', 'finance'] },
    });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfp-criteria-edit'));
    expect(screen.getByTestId('rfp-editor-save')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const idPanel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(idPanel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(idPanel).getByTestId('identity-role-procurement'));
    expect(await screen.findByTestId('handoff-rfq-criteria')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-editor-save')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfp-criteria-editor')).not.toBeInTheDocument();
  });

  it('THE WEIGHTS-NOT-100 REFUSAL — the running total says it, the press is refused by the machine with the sum, and nothing is stored; corrected, it saves', async () => {
    const id = await draftEvent('RFP');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfp-criteria-edit'));
    expect(screen.getByTestId('rfp-editor-empty')).toBeInTheDocument();
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByTestId('rfp-editor-add'));
    // A row with no name is a fault in that row: named, and Save is held.
    expect(screen.getByTestId('rfp-editor-problem')).toHaveTextContent('C1 has no name.');
    expect(screen.getByTestId('rfp-editor-save')).toBeDisabled();
    FOUR.forEach((c, i) => {
      type(`rfp-editor-name-${i + 1}`, c.name);
      type(`rfp-editor-weight-${i + 1}`, String(i === 3 ? 5 : c.weight));
    });
    // Every row is well-formed; the SUM is not 100, and that is not held here.
    expect(screen.queryByTestId('rfp-editor-problem')).not.toBeInTheDocument();
    const sum = screen.getByTestId('rfp-editor-sum');
    expect(sum).toHaveTextContent('The weights sum to 95%, and must sum to 100%.');
    expect(sum).toHaveAttribute('data-whole', 'false');
    expect(screen.getByTestId('rfp-editor-save')).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfp-editor-save'));
    await waitFor(() =>
      expect(toast()).toHaveTextContent(
        'Criteria not saved Not saved. The weights sum to 95%, not 100%. Change the weights until they sum to 100%.',
      ),
    );
    expect(rfqStore.get(id)!.criteria).toBeUndefined();
    expect(screen.getByTestId('rfp-criteria-editor')).toBeInTheDocument();

    // KNOWN-GOOD — the last weight corrected to 10: the total reads whole and it saves.
    type('rfp-editor-weight-4', '10');
    expect(screen.getByTestId('rfp-editor-sum')).toHaveTextContent('The weights sum to 100%.');
    expect(screen.getByTestId('rfp-editor-sum')).toHaveAttribute('data-whole', 'true');
    fireEvent.click(screen.getByTestId('rfp-editor-save'));
    await waitFor(() => expect(rfqStore.get(id)!.criteria).toHaveLength(4));
    expect(rfqStore.get(id)!.criteria!.map((c) => c.weight)).toEqual([40, 20, 30, 10]);
    await waitFor(() => expect(toast()).toHaveTextContent('The draft weighs proposals on 4 criteria.'));
  });

  it('a weight that is not a number is named in its row and holds Save; the split and the required flag are stored', async () => {
    const id = await draftEvent('RFP');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfp-criteria-edit'));
    fireEvent.click(screen.getByTestId('rfp-editor-add'));
    type('rfp-editor-name-1', 'Fit');
    type('rfp-editor-weight-1', 'lots');
    expect(screen.getByTestId('rfp-editor-problem')).toHaveTextContent(
      'C1 needs a weight above 0 and at most 100, with two decimals at most.',
    );
    expect(screen.getByTestId('rfp-editor-save')).toBeDisabled();
    type('rfp-editor-weight-1', '100');
    type('rfp-editor-group-1', 'technical');
    fireEvent.click(screen.getByTestId('rfp-editor-required-1'));
    fireEvent.click(screen.getByTestId('rfp-editor-save'));
    await waitFor(() =>
      expect(rfqStore.get(id)!.criteria).toEqual([
        { id: 'c1', name: 'Fit', weight: 100, required: false, group: 'technical' },
      ]),
    );
    // Read back on the draft.
    const read = await screen.findByTestId('rfp-criterion-read-c1');
    expect(read).toHaveTextContent('C1');
    expect(read).toHaveTextContent('Fit');
    expect(read).toHaveTextContent('Technical · Optional');
    expect(read).toHaveTextContent('100%');
  });

  it('the wizard says, in the RFP’s one line, that proposals are scored on criteria set on the draft', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    fireEvent.click(await screen.findByText('New sourcing event'));
    expect(
      screen.getByText('Ask how they would do it: proposals scored on criteria you set on the draft. Ends in a shortlist.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Event title')).toBeInTheDocument();
    expect(screen.queryByText(/RFQ title/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('2 · the supplier writes its proposal', () => {
  it('the card says what this stage asks, shows the event’s own criteria and weights, and what will not be shown', async () => {
    const id = await openRfp();
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    const c = await card(ID);
    expect(within(c).getByTestId(`rfq-stage-content-note-${id}`)).toHaveTextContent(
      'At its RFP stage this event asks a proposal against 4 criteria. You can save a draft, and you submit once every required criterion has a response.',
    );
    const own = within(c).getByTestId(`rfp-own-criteria-${id}`);
    expect(own).toHaveTextContent('C1Technical approach · Technical40%');
    expect(own).toHaveTextContent('C4Sustainability · Commercial10%');
    expect(within(c).getByTestId(`rfp-scores-note-${id}`)).toHaveTextContent(
      'Paragon scores proposals after the stage closes. Scores, rankings and other suppliers’ proposals are not shown in this portal.',
    );
    expect(within(c).getByTestId(`rfq-interest-open-${id}`)).toHaveTextContent('Write your proposal');
  });

  it('THE REFUSAL — submitting with required criteria unanswered names them, marks them, and records nothing', async () => {
    const id = await openRfp();
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    const c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${id}`));
    const form = within(c).getByTestId(`rfp-proposal-form-${id}`);
    expect(form).toHaveTextContent('40% of the evaluation · Technical · Required');
    expect(form).toHaveTextContent('10% of the evaluation · Commercial · Optional');
    type(`rfp-response-${id}-c1`, PROPOSAL.c1);
    fireEvent.click(screen.getByTestId(`rfp-submit-${id}`));
    await waitFor(() =>
      expect(toast()).toHaveTextContent(
        'Proposal not submitted Required and without a response: C2 “Quality system”; C3 “Commercial terms”. Write them and submit again, or save a draft.',
      ),
    );
    expect(screen.getByTestId(`rfp-criterion-missing-${id}-c2`)).toHaveTextContent(
      'This criterion is required and has no response yet.',
    );
    expect(screen.getByTestId(`rfp-criterion-missing-${id}-c3`)).toBeInTheDocument();
    expect(screen.queryByTestId(`rfp-criterion-missing-${id}-c1`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`rfp-criterion-missing-${id}-c4`)).not.toBeInTheDocument();
    expect(stageResponseStore.forRfq(id)).toHaveLength(0);
  });

  it('SAVE DRAFT, COME BACK, SUBMIT — document names only, and the submitted proposal is read back', async () => {
    const id = await openRfp();
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    let c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${id}`));
    type(`rfp-response-${id}-c1`, PROPOSAL.c1);
    fireEvent.change(screen.getByTestId(`rfp-documents-${id}`), {
      target: { files: [new File(['%PDF'], 'proposal.pdf'), new File(['%PDF'], 'line-4-layout.pdf')] },
    });
    expect(screen.getByTestId(`rfp-documents-list-${id}`)).toHaveTextContent('proposal.pdfline-4-layout.pdf');
    expect(screen.getByTestId(`rfp-documents-note-${id}`)).toHaveTextContent(
      'Only the names of the files are recorded. The files themselves are not uploaded or kept by this portal — send them to your Paragon buyer separately.',
    );
    fireEvent.click(screen.getByTestId(`rfp-save-${id}`));
    await waitFor(() => expect(stageResponseStore.forRfq(id)).toHaveLength(1));
    const draft = stageResponseStore.forRfq(id)[0];
    expect(draft.status).toBe('Draft');
    expect(draft.proposal).toEqual({ c1: PROPOSAL.c1 });
    expect(draft.documents).toEqual(['proposal.pdf', 'line-4-layout.pdf']);
    // The buyer's read holds no draft.
    expect(rfqStore.get(id)!.stageResponses).toEqual([]);

    c = await card(ID);
    await waitFor(() => expect(within(c).getByTestId(`rfq-interest-open-${id}`)).toHaveTextContent('Continue your proposal'));
    expect(within(c).getByTestId(`rfi-draft-saved-${id}`)).toHaveTextContent('Not submitted — Paragon does not see a draft.');
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${id}`));
    // The form opens on what was saved.
    expect(screen.getByTestId(`rfp-response-${id}-c1`)).toHaveValue(PROPOSAL.c1);
    expect(screen.getByTestId(`rfp-documents-list-${id}`)).toHaveTextContent('proposal.pdf');
    type(`rfp-response-${id}-c2`, PROPOSAL.c2);
    type(`rfp-response-${id}-c3`, PROPOSAL.c3);
    fireEvent.click(screen.getByTestId(`rfp-submit-${id}`));
    await waitFor(() => expect(stageResponseStore.forRfq(id)[0].status).toBeUndefined());
    expect(stageResponseStore.forRfq(id)).toHaveLength(1);
    await waitFor(() => expect(toast()).toHaveTextContent('Proposal submitted on RFQ-2026-901'));
    c = await card(ID);
    await waitFor(() =>
      expect(within(c).getByTestId(`rfq-interest-recorded-${id}`)).toHaveTextContent('Proposal submitted at RFP on'),
    );
    const own = within(c).getByTestId(`rfp-own-proposal-${id}`);
    expect(own).toHaveTextContent(`C1Technical approach ${PROPOSAL.c1}`);
    expect(own).toHaveTextContent('C4Sustainability No response');
    expect(own).toHaveTextContent('Documents named: proposal.pdf, line-4-layout.pdf');
  });

  it('A SUPPLIER’S PAGE SHOWS NO SCORE — after two evaluators scored all three, nothing of it is on the page', async () => {
    const id = await scoredRfp();
    // KNOWN-GOOD — the scores exist, and the buyer's model ranks them.
    expect(rfqStore.get(id)!.proposalScores).toHaveLength(6);
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    // Bidding is closed, so the event is off this supplier's open board; the
    // page is read whole, once its own seeded cards have rendered.
    await screen.findAllByText(/^RFQ-2026-/);
    const page = document.body;
    for (const absent of [
      'Weighted total', 'Ranking', 'Rank 1', 'Rank 2', 'evaluator', 'Scored by', '3.90', '4.75', '3.20',
      'On Technical approach.', NAME['sup-005'], NAME['sup-007'],
    ]) {
      expect(page.textContent, absent).not.toContain(absent);
    }
    expect(screen.queryByTestId('rfp-ranking')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfp-evaluation')).not.toBeInTheDocument();
  });

  it('the refusal sentences are keyed on the hook, and a criterion is named by position and name', () => {
    expect(interestRefusalKey('POLICY_REJECTED:stage_response_criteria_answered:PROPOSAL_CRITERION_REQUIRED: x')).toBe(
      'rfqs.refusal.criteriaUnanswered',
    );
    expect(interestRefusalKey('POLICY_REJECTED:stage_response_proposal_well_formed:PROPOSAL_INVALID: x')).toBe(
      'rfqs.refusal.proposalInvalid',
    );
    expect(namedCriteria(FOUR, [FOUR[1], FOUR[3]])).toBe('C2 “Quality system”; C4 “Sustainability”');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('3 · the buyer reads, scores and ranks the proposals', () => {
  it('the model: the proposals, the ranking, the lock, the two-decimal score, the refusal keys', async () => {
    const id = await scoredRfp();
    const rfq = rfqStore.get(id)!;
    expect(rfpProposalsOf(rfq).map((p) => p.supplierId)).toEqual(THREE);
    expect(rfpRankingOf(rfq).map((r) => [r.supplierId, r.rank, r.total])).toEqual([
      ['sup-007', 1, 4.75],
      ['sup-002', 2, 3.9],
      ['sup-005', 3, 3.2],
    ]);
    expect(scoresLockedBy(rfq)).toBeUndefined();
    expect(scoreText(3.9)).toBe('3.90');
    expect(scoreText(4)).toBe('4.00');
    expect(scoreRefusalKey('POLICY_REJECTED:rfq_score_not_locked:SCORES_LOCKED: x')).toBe('sourcing.refusal.scoresLocked');
    expect(scoreRefusalKey('POLICY_REJECTED:rfq_score_evaluator_named:x')).toBe('sourcing.refusal.scoreEvaluatorUnattributed');
    expect(scoreRefusalKey('POLICY_REJECTED:rfq_score_at_rfp_stage:x')).toBe('sourcing.refusal.scoreStageNotRfp');
    expect(scoreRefusalKey('POLICY_REJECTED:rfq_score_proposal_held:x')).toBe('sourcing.refusal.scoreNoProposal');
    expect(scoreRefusalKey('POLICY_REJECTED:rfq_score_sheet_well_formed:x')).toBe('sourcing.refusal.scoreSheetInvalid');
    expect(scoreRefusalKey('POLICY_REJECTED:rfq_actor_attributed:x')).toBeNull();
  });

  it('on an event that came from an RFI, the proposals are the RFP responses only — an RFI answer is not one', async () => {
    const id = await draftEvent('RFI');
    await ok(rfqVerb('t_rfq_criteria_set', id, { criteria: FOUR }));
    await ok(rfqVerb('t_rfq_publish', id));
    for (const s of THREE) {
      await ok(
        svc.dispatch(supplierScope(s), {
          transitionId: 't_stageresponse_submit',
          entity: 'stageResponse',
          payload: { rfqId: id, supplierId: s },
        }),
      );
    }
    await ok(rfqVerb('t_rfq_close', id));
    await ok(rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: '2026-10-20' }));
    await propose('sup-005', id);
    const rfq = rfqStore.get(id)!;
    // KNOWN-GOOD — the event holds four responses: three at RFI, one at RFP.
    expect(rfq.stageResponses).toHaveLength(4);
    expect(rfpProposalsOf(rfq).map((p) => [p.supplierId, p.stage])).toEqual([['sup-005', 'RFP']]);
    expect(rfpRankingOf(rfq).map((r) => r.supplierId)).toEqual(['sup-005']);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfp-proposal-sup-005')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-proposal-sup-002')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfp-ranking-row-sup-007')).not.toBeInTheDocument();
  });

  it('while bidding is open the proposals are read and nothing is scored — the line says why', async () => {
    const id = await openRfp();
    await propose('sup-002', id, { documents: ['proposal.pdf'] });
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    const p = screen.getByTestId('rfp-proposal-sup-002');
    expect(p).toHaveTextContent(NAME['sup-002']);
    expect(screen.getByTestId('rfp-proposal-response-sup-002-c1')).toHaveTextContent(PROPOSAL.c1);
    expect(screen.getByTestId('rfp-proposal-documents-sup-002')).toHaveTextContent(
      'Documents named: proposal.pdf — names only; no file is kept by this portal.',
    );
    expect(screen.getByTestId('rfp-score-closed-reason')).toHaveTextContent(
      'Scoring opens once bidding on this stage is closed, so no proposal is scored while others are still arriving.',
    );
    expect(screen.queryByTestId('rfp-score-sheet-sup-002')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-ranking-rank-sup-002')).toHaveTextContent('—');
    expect(screen.getByTestId('rfp-ranking-row-sup-002')).toHaveTextContent('Not scored yet');
  });

  it('before any proposal the section says so', async () => {
    await openRfp();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfp-proposals-empty')).toHaveTextContent(
      'No supplier has submitted a proposal at the RFP stage yet.',
    );
  });

  it('AN EVALUATOR SCORES — the sheet is whole or Save is held; saved, the ranking reads the total', async () => {
    const id = await closedRfp();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.queryByTestId('rfp-score-closed-reason')).not.toBeInTheDocument();
    const s = screen.getByTestId('rfp-score-sheet-sup-002');
    expect(s).toHaveTextContent('Give each criterion a score from 1 to 5.');
    expect(s).toHaveTextContent('(SAMPLE)');
    expect(screen.getByTestId('rfp-score-save-sup-002')).toBeDisabled();
    expect(screen.getByTestId('rfp-score-incomplete-sup-002')).toHaveTextContent(
      'Score every criterion to save. A sheet is saved whole.',
    );
    [5, 4, 3, 2].forEach((v, i) => type(`rfp-score-sup-002-c${i + 1}`, String(v)));
    type('rfp-score-comment-sup-002-c1', 'Clear process description.');
    expect(screen.getByTestId('rfp-score-save-sup-002')).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfp-score-save-sup-002'));
    await waitFor(() => expect(rfqStore.get(id)!.proposalScores).toHaveLength(1));
    const saved = rfqStore.get(id)!.proposalScores![0];
    expect(saved.scores.map((x) => x.score)).toEqual([5, 4, 3, 2]);
    expect(saved.scores[0].comment).toBe('Clear process description.');
    await waitFor(() =>
      expect(toast()).toHaveTextContent(
        `Scores saved for ${NAME['sup-002']} Only your own scores were written. They can be changed until the event advances.`,
      ),
    );
    await waitFor(() => expect(screen.getByTestId('rfp-ranking-total-sup-002')).toHaveTextContent('3.90'));
    expect(screen.getByTestId('rfp-ranking-rank-sup-002')).toHaveTextContent('1');
    expect(screen.getByTestId('rfp-ranking-row-sup-002')).toHaveTextContent('1 evaluator');
    expect(screen.getByTestId('rfp-ranking-cell-sup-002-c1')).toHaveTextContent('5.00');
    expect(screen.getByTestId('rfp-ranking-technical-sup-002')).toHaveTextContent('2.80');
    expect(screen.getByTestId('rfp-ranking-commercial-sup-002')).toHaveTextContent('1.10');
    // The other two proposals are still unscored and unranked.
    expect(screen.getByTestId('rfp-ranking-total-sup-005')).toHaveTextContent('—');
  });

  it('TWO EVALUATORS — the ranking averages them; the second evaluator’s sheet opens on THEIR scores, and saving it leaves the first’s alone', async () => {
    const id = await scoredRfp();
    const firstBefore = rfqStore.get(id)!.proposalScores!.filter((s) => evaluatorIdOf(s) !== E2);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED_2 });
    await openRfq(ID);
    expect(screen.getByTestId('rfp-ranking-total-sup-007')).toHaveTextContent('4.75');
    expect(screen.getByTestId('rfp-ranking-total-sup-002')).toHaveTextContent('3.90');
    expect(screen.getByTestId('rfp-ranking-total-sup-005')).toHaveTextContent('3.20');
    expect(screen.getByTestId('rfp-ranking-rank-sup-007')).toHaveTextContent('1');
    expect(screen.getByTestId('rfp-ranking-rank-sup-005')).toHaveTextContent('3');
    expect(screen.getByTestId('rfp-ranking-row-sup-005')).toHaveTextContent('2 evaluators');
    // sup-005 c4: evaluator 1 gave 4, evaluator 2 gave 1 → 2.50.
    expect(screen.getByTestId('rfp-ranking-cell-sup-005-c4')).toHaveTextContent('2.50');
    const by = screen.getByTestId('rfp-ranking-evaluators');
    expect(by).toHaveTextContent('Scored by:');
    expect(by.textContent!.match(/\(SAMPLE\)/g)).toHaveLength(2);
    // The rows are in rank order.
    const rows = within(screen.getByTestId('rfp-ranking')).getAllByTestId(/^rfp-ranking-row-/);
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'rfp-ranking-row-sup-007', 'rfp-ranking-row-sup-002', 'rfp-ranking-row-sup-005',
    ]);

    // Evaluator 2's own sheet for sup-005: 2, 3, 3, 1 — not evaluator 1's 4s.
    expect(screen.getByTestId('rfp-score-sup-005-c1')).toHaveValue('2');
    expect(screen.getByTestId('rfp-score-sup-005-c4')).toHaveValue('1');
    expect(screen.getByTestId('rfp-score-sheet-sup-005')).toHaveTextContent('saving again replaces them, and only them.');
    type('rfp-score-sup-005-c4', '5');
    fireEvent.click(screen.getByTestId('rfp-score-save-sup-005'));
    await waitFor(() =>
      expect(
        rfqStore.get(id)!.proposalScores!.find((s) => s.supplierId === 'sup-005' && evaluatorIdOf(s) === E2)!.scores[3].score,
      ).toBe(5),
    );
    expect(rfqStore.get(id)!.proposalScores).toHaveLength(6);
    expect(rfqStore.get(id)!.proposalScores!.filter((s) => evaluatorIdOf(s) !== E2)).toEqual(firstBefore);
  });

  it('THE MODE IS GATED, NOT THE DOOR — a seat narrowed while a score sheet stands open loses it', async () => {
    await closedRfp();
    renderWithProviders(<Sourcing />, {
      identity: { ...BUYER_NAMED, businessRoles: ['procurement', 'finance'] },
    });
    await openRfq(ID);
    type('rfp-score-sup-002-c1', '5');
    expect(screen.getByTestId('rfp-score-save-sup-002')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const idPanel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(idPanel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(idPanel).getByTestId('identity-role-procurement'));
    expect(await screen.findByTestId('handoff-rfq-evaluate')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-score-save-sup-002')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfp-score-sheet-sup-002')).not.toBeInTheDocument();
  });

  it('a seat that names nobody is told so and gets no sheet; a seat without procurement reads who scores', async () => {
    await closedRfp();
    const { unmount } = renderWithProviders(<Sourcing />, { identity: BUYER });
    await openRfq(ID);
    expect(screen.getByTestId('rfp-score-closed-reason')).toHaveTextContent(
      'A score is kept against the evaluator who gave it, and this seat names nobody. Adopt a sample user on the identity panel to score.',
    );
    expect(screen.queryByTestId('rfp-score-sheet-sup-002')).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<Sourcing />, { identity: RECEIVING_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('handoff-rfq-evaluate')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-score-sheet-sup-002')).not.toBeInTheDocument();
    // The proposals and the ranking are reads, and stay.
    expect(screen.getByTestId('rfp-proposal-sup-002')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-ranking')).toBeInTheDocument();
  });

  it('SCORES LOCK WHEN THE EVENT ADVANCES — the section says the day, offers no sheet, and still reads the ranking', async () => {
    const id = await scoredRfp();
    await ok(rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: '2026-10-20' }));
    expect(scoresLockedBy(rfqStore.get(id)!)).toBeDefined();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfp-score-closed-reason')).toHaveTextContent('Scores were locked when the event advanced on');
    expect(screen.queryByTestId('rfp-score-sheet-sup-002')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-ranking-total-sup-007')).toHaveTextContent('4.75');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('4 · the shortlist can start from the ranking', () => {
  it('TOP N — pressing ticks the top two; the rank and total sit beside each name; every responder stays tickable', async () => {
    const id = await scoredRfp();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    // It starts from everybody who answered; nothing is pre-ticked on a rule
    // the buyer did not choose.
    for (const s of THREE) expect(screen.getByTestId(`rfq-advance-pick-${s}`)).toBeChecked();
    expect(screen.getByTestId('rfq-advance-rank-preselect')).toHaveTextContent(
      'The shortlist can start from the ranking.',
    );
    expect(screen.getByTestId('rfq-advance-rank-sup-007')).toHaveTextContent('Rank 1 · 4.75');
    expect(screen.getByTestId('rfq-advance-rank-sup-005')).toHaveTextContent('Rank 3 · 3.20');
    fireEvent.click(screen.getByTestId('rfq-advance-rank-top-apply'));
    expect(screen.getByTestId('rfq-advance-pick-sup-007')).toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-002')).toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-005')).not.toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-005')).toBeEnabled();

    type('rfq-advance-reason', 'The two highest weighted totals.');
    type('rfq-advance-deadline', '2026-10-25');
    expect(screen.queryByTestId('rfq-advance-blocked')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfq-advance-yes'));
    await waitFor(() => expect(stageOf(rfqStore.get(id)!)).toBe('RFQ'));
    expect([...rfqStore.get(id)!.invitedSupplierIds].sort()).toEqual(['sup-002', 'sup-007']);
    expect(rfqStore.get(id)!.stageHistory!.slice(-1)[0].notShortlistedSupplierIds).toEqual(['sup-005']);
  });

  it('AT OR ABOVE — a threshold that leaves one supplier is under the floor, and the line names the remedy', async () => {
    await scoredRfp();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.getByTestId('rfq-advance-rank-min-apply')).toBeDisabled();
    type('rfq-advance-rank-min', '4');
    fireEvent.click(screen.getByTestId('rfq-advance-rank-min-apply'));
    expect(screen.getByTestId('rfq-advance-pick-sup-007')).toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-002')).not.toBeChecked();
    expect(screen.getByTestId('rfq-advance-blocked')).toHaveTextContent(
      'The next stage needs at least two eligible suppliers. Tick another supplier that responded, reopen the stage so more invited suppliers can respond, or conclude the event without an award.',
    );
    expect(screen.getByTestId('rfq-advance-yes')).toBeDisabled();
    // KNOWN-GOOD — a lower threshold, with a decimal comma, takes two.
    type('rfq-advance-rank-min', '3,9');
    fireEvent.click(screen.getByTestId('rfq-advance-rank-min-apply'));
    expect(screen.getByTestId('rfq-advance-pick-sup-002')).toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-005')).not.toBeChecked();
  });

  it('CONTROL — an RFP nobody scored offers no ranking pre-selection', async () => {
    await closedRfp();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.queryByTestId('rfq-advance-rank-preselect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfq-advance-rank-sup-007')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('5 · the sourcing list says which stage every event is at', () => {
  it('the title, the subtitle and the button name sourcing events, not RFQs', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await screen.findByRole('heading', { name: 'Sourcing events' })).toBeInTheDocument();
    expect(screen.getByText('RFI · RFP · RFQ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New sourcing event/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^New RFQ$/ })).not.toBeInTheDocument();
  });

  it('"RFQ" is the stage; the thing itself is an event — sidebar, table header, search, the draft’s buttons', async () => {
    await draftEvent('RFP');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await within(screen.getByRole('navigation')).findByText('Sourcing events')).toBeInTheDocument();
    expect(screen.queryByText('Sourcing & RFQ')).not.toBeInTheDocument();
    expect((await screen.findAllByRole('columnheader', { name: 'Event #' })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('columnheader', { name: 'RFQ #' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by event number, title, or material…')).toBeInTheDocument();
    await openRfq(ID);
    expect(screen.getByRole('button', { name: 'Publish event' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel event' })).toBeInTheDocument();
    // The stage keeps its name.
    expect(within(await rowOf('RFQ-2026-003')).getByTestId('rfq-row-stage-rfq-003')).toHaveTextContent(/^RFQ$/);
  });

  it('the header’s older button is "Event templates", and still says it is not available', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    fireEvent.click(await screen.findByRole('button', { name: /Event templates/ }));
    await waitFor(() =>
      expect(toast()).toHaveTextContent(
        'Event templates not available yet No event template was opened. Saving a whole sourcing event as a template is not built. Questionnaire templates are kept on the RFI questionnaire editor.',
      ),
    );
  });

  it('every row carries its stage in a Stage column — a plain RFQ says RFQ', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await screen.findByRole('columnheader', { name: 'Stage' })).toBeInTheDocument();
    expect(within(await rowOf('RFQ-2026-018')).getByTestId('rfq-row-stage-rfq-018')).toHaveTextContent(/^RFP$/);
    expect(within(await rowOf('RFQ-2026-003')).getByTestId('rfq-row-stage-rfq-003')).toHaveTextContent(/^RFQ$/);
  });

  it('the stage filter narrows the list, beside the category filter, and is undone by pressing again', async () => {
    await draftEvent('RFI');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await screen.findByText('RFQ-2026-018');
    const filter = screen.getByTestId('rfq-stage-filter');
    expect(filter).toHaveTextContent('Filter by stage');
    fireEvent.click(within(filter).getByRole('checkbox', { name: 'RFP' }));
    expect(screen.getByText('RFQ-2026-018')).toBeInTheDocument();
    expect(screen.queryByText('RFQ-2026-003')).not.toBeInTheDocument();
    expect(screen.queryByText(ID)).not.toBeInTheDocument();
    fireEvent.click(within(filter).getByRole('checkbox', { name: 'RFI' }));
    expect(screen.getByText(ID)).toBeInTheDocument();
    expect(screen.getByText('RFQ-2026-018')).toBeInTheDocument();
    fireEvent.click(within(filter).getByRole('checkbox', { name: 'RFP' }));
    fireEvent.click(within(filter).getByRole('checkbox', { name: 'RFI' }));
    expect(screen.getByText('RFQ-2026-003')).toBeInTheDocument();
  });

  it('a Concluded tab holds the events concluded without an award, and the Closed tab no longer does', async () => {
    const id = await openRfp();
    await ok(rfqVerb('t_rfq_conclude', id, { concludeReason: 'Nobody was able.' }));
    const concluded = rfqStore.all().filter((r) => r.status === 'Concluded');
    const closed = rfqStore.all().filter((r) => r.status === 'Closed' || r.status === 'Cancelled');
    expect(concluded.map((r) => r.id)).toContain(id);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await screen.findByText('RFQ-2026-018');
    const tab = screen.getByRole('tab', { name: new RegExp(`^Concluded\\s*${concluded.length}$`) });
    expect(screen.getByRole('tab', { name: new RegExp(`^Closed\\s*${closed.length}$`) })).toBeInTheDocument();
    fireEvent.click(tab);
    expect(screen.getByText(ID)).toBeInTheDocument();
    expect(screen.queryByText('RFQ-2026-018')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /^Closed/ }));
    expect(screen.queryByText(ID)).not.toBeInTheDocument();
  });

  it('the two cards that count open events say how many are at each stage', async () => {
    await openRfp();
    const open = rfqStore.all().filter((r) => r.status === 'Open');
    const at = (s: string) => open.filter((r) => stageOf(r) === s).length;
    // The population is not empty at RFP, or the line would prove nothing.
    expect(at('RFP')).toBeGreaterThanOrEqual(2);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await screen.findByText('RFQ-2026-018');
    expect(screen.getByText('Active events')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-active-by-stage')).toHaveTextContent(
      `RFI ${at('RFI')} · RFP ${at('RFP')} · RFQ ${at('RFQ')}`,
    );
    expect(screen.getByTestId('kpi-awaiting-by-stage')).toHaveTextContent(/^RFI \d+ · RFP \d+ · RFQ \d+$/);
    expect(screen.getByText('At the RFQ stage, all suppliers responded')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ID — the same surfaces in Indonesian', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('id');
  });

  it('the list: title, button, stage column and filter, the Concluded tab, the stage counts', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await screen.findByRole('heading', { name: 'Acara sumber' })).toBeInTheDocument();
    expect(screen.getByText('RFI · RFP · RFQ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acara sumber baru/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Templat acara/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tahap' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation')).getByText('Acara sumber')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'No. acara' }).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Cari berdasarkan nomor acara, judul, atau material…')).toBeInTheDocument();
    expect(screen.getByTestId('rfq-stage-filter')).toHaveTextContent('Saring menurut tahap');
    expect(screen.getByRole('tab', { name: /^Diakhiri/ })).toBeInTheDocument();
    expect(screen.getByText('Acara aktif')).toBeInTheDocument();
    expect(screen.getByText('Pada tahap RFQ, semua pemasok merespons')).toBeInTheDocument();
    expect(within(await rowOf('RFQ-2026-018')).getByTestId('rfq-row-stage-rfq-018')).toHaveTextContent(/^RFP$/);
  });

  it('the buyer: the criteria editor, the weights refusal', async () => {
    const id = await draftEvent('RFP');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfq-criteria-section')).toHaveTextContent('Kriteria evaluasi RFP');
    expect(screen.getByTestId('rfp-criteria-edit')).toHaveTextContent('Tetapkan kriteria');
    fireEvent.click(screen.getByTestId('rfp-criteria-edit'));
    fireEvent.click(screen.getByTestId('rfp-editor-add'));
    expect(screen.getByTestId('rfp-editor-problem')).toHaveTextContent('C1 tidak memiliki nama.');
    type('rfp-editor-name-1', 'Kesesuaian');
    type('rfp-editor-weight-1', '95');
    expect(screen.getByTestId('rfp-editor-sum')).toHaveTextContent('Jumlah bobot 95%, dan harus berjumlah 100%.');
    fireEvent.click(screen.getByTestId('rfp-editor-save'));
    await waitFor(() =>
      expect(toast()).toHaveTextContent(
        'Kriteria tidak disimpan Tidak disimpan. Jumlah bobot 95%, bukan 100%. Ubah bobot sampai berjumlah 100%.',
      ),
    );
    expect(rfqStore.get(id)!.criteria).toBeUndefined();
  });

  it('the buyer: proposals, the score sheet, the ranking with a decimal comma, the ranking pre-selection and the remedy', async () => {
    await scoredRfp();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfp-evaluation')).toHaveTextContent('Proposal');
    expect(screen.getByTestId('rfp-proposal-documents-sup-002')).toHaveTextContent(
      'Dokumen yang disebut: proposal.pdf — hanya nama; tidak ada berkas yang disimpan portal ini.',
    );
    expect(screen.getByTestId('rfp-score-sheet-sup-002')).toHaveTextContent('Skor Anda');
    expect(screen.getByTestId('rfp-score-save-sup-002')).toHaveTextContent('Simpan skor saya');
    expect(screen.getByTestId('rfp-ranking-total-sup-007')).toHaveTextContent('4,75');
    expect(screen.getByTestId('rfp-ranking-row-sup-007')).toHaveTextContent('2 penilai');
    expect(screen.getByTestId('rfp-ranking-note')).toHaveTextContent('Pemasok tidak melihat satu pun dari ini.');
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.getByTestId('rfq-advance-rank-sup-007')).toHaveTextContent('Peringkat 1 · 4,75');
    type('rfq-advance-rank-min', '4');
    fireEvent.click(screen.getByTestId('rfq-advance-rank-min-apply'));
    expect(screen.getByTestId('rfq-advance-blocked')).toHaveTextContent(
      'Tahap berikutnya memerlukan setidaknya dua pemasok yang memenuhi syarat. Centang pemasok lain yang menanggapi, buka kembali tahap ini agar lebih banyak pemasok yang diundang dapat menanggapi, atau akhiri acara tanpa pemenang.',
    );
  });

  it('the supplier: the card, the form, the required-criterion refusal', async () => {
    const id = await openRfp();
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    const c = await card(ID);
    expect(within(c).getByTestId(`rfq-stage-content-note-${id}`)).toHaveTextContent(
      'Pada tahap RFP, acara ini meminta proposal atas 4 kriteria.',
    );
    expect(within(c).getByTestId(`rfp-scores-note-${id}`)).toHaveTextContent(
      'Paragon menilai proposal setelah tahap ditutup. Skor, peringkat, dan proposal pemasok lain tidak ditampilkan di portal ini.',
    );
    expect(within(c).getByTestId(`rfp-own-criteria-${id}`)).toHaveTextContent('C1Technical approach · Teknis40%');
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${id}`));
    expect(screen.getByTestId(`rfp-proposal-form-${id}`)).toHaveTextContent('40% dari evaluasi · Teknis · Wajib');
    expect(screen.getByTestId(`rfp-documents-note-${id}`)).toHaveTextContent('Hanya nama berkas yang dicatat.');
    type(`rfp-response-${id}-c1`, PROPOSAL.c1);
    fireEvent.click(screen.getByTestId(`rfp-submit-${id}`));
    await waitFor(() =>
      expect(toast()).toHaveTextContent(
        'Proposal tidak dikirim Wajib dan belum ditanggapi: C2 “Quality system”; C3 “Commercial terms”. Tulis tanggapannya lalu kirim lagi, atau simpan draf.',
      ),
    );
    expect(screen.getByTestId(`rfp-criterion-missing-${id}-c2`)).toHaveTextContent(
      'Kriteria ini wajib dan belum memiliki tanggapan.',
    );
  });
});
