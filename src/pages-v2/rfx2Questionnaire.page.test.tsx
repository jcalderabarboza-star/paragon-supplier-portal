// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE RFI QUESTIONNAIRE — what the buyer and the supplier see.
//
// The machine is proven in `services/data/mock/rfx2Questionnaire.test.ts`. This
// file renders the two pages over the real stores and reads what a person
// reads: the editor and what holds its Save, the templates and where they live,
// the supplier's answer form, the refusal that names an unanswered required
// question, the draft, the buyer's answer matrix with its knock-outs, and the
// shortlist that starts from the suppliers who passed — EN, then ID.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { stageResponseStore } from '../services/data/mock/stores/stageResponseStore';
import { mockSuppliers } from '../data/mockSuppliers';
import { SAMPLE_ACTORS } from '../services/identity/sampleActors';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import type { RfiQuestion } from '../data/rfiQuestionnaire';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import SupplierRFQs from './SupplierRFQs';
import { useToast } from '../hooks/useToast';
import {
  RFI_TEMPLATES_KEY,
  readRfiTemplates,
  removeRfiTemplate,
  saveRfiTemplate,
} from './sourcing/rfiTemplates';
import { answersOfForm, answerText, formValuesOf } from './rfqs/rfiAnswerModel';
import { passedEveryKnockout } from './sourcing/RfiAnswerMatrix';

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
const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const supplierScope = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
});
const as = (supplierId: string): CurrentIdentity => ({ ...SUPPLIER, supplierId, supplierName: supplierId });
const FULFILMENT: CurrentIdentity = { ...as('sup-005'), businessRoles: ['supplier', 'fulfilment'] };
const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

const THREE = ['sup-002', 'sup-005', 'sup-007'];
const NAME = Object.fromEntries(mockSuppliers.map((s) => [s.id, s.name]));
const ID = 'RFQ-2026-901'; // the first event a test raises

const SIX: RfiQuestion[] = [
  { id: 'q1', prompt: 'Do you hold a halal certificate for this format?', type: 'yes_no', required: true, knockout: 'no' },
  { id: 'q2', prompt: 'Which resin do you run?', type: 'single_choice', required: true, options: ['PET', 'HDPE', 'PP'] },
  { id: 'q3', prompt: 'Which decorations can you apply?', type: 'multi_choice', required: false, options: ['Screen print', 'Hot stamp', 'Label'] },
  { id: 'q4', prompt: 'Monthly capacity', type: 'number', required: true, unit: 'PCS' },
  { id: 'q5', prompt: 'Describe your quality system', type: 'text', required: false },
  { id: 'q6', prompt: 'Attach your latest audit report', type: 'document', required: false },
];
const GOOD = { q1: 'yes', q2: 'PET', q3: ['Label'], q4: 250_000, q5: 'ISO 9001.', q6: 'audit-2026.pdf' };

const rfqVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(named, { transitionId, entity: 'rfq', entityId, payload });

/** A draft raised by the real creation verb. Its number and id are RFQ-2026-90x. */
const draftEvent = async (stage = 'RFI'): Promise<string> => {
  const made = await svc.dispatch(named, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-2 page probe',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: '2026-10-15',
      awardDeadline: '2026-10-30',
      stage,
    },
  });
  expect(made.status, made.reason).toBe('done');
  return made.entityId!;
};

/** An RFI published with the six questions (or the ones given). */
const openRfi = async (questions: readonly RfiQuestion[] = SIX): Promise<string> => {
  const id = await draftEvent();
  if (questions.length > 0) {
    expect((await rfqVerb('t_rfq_questionnaire_set', id, { questions })).status).toBe('done');
  }
  expect((await rfqVerb('t_rfq_publish', id)).status).toBe('done');
  return id;
};

const answer = async (supplierId: string, rfqId: string, answers: Record<string, unknown>) => {
  const res = await svc.dispatch(supplierScope(supplierId), {
    transitionId: 't_stageresponse_submit',
    entity: 'stageResponse',
    payload: { rfqId, supplierId, answers },
  });
  expect(res.status, res.reason).toBe('done');
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

beforeEach(() => {
  stageResponseStore.reset();
  quotationStore.reset();
  rfqStore.reset();
  window.localStorage.removeItem(RFI_TEMPLATES_KEY);
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('1 · the buyer writes the questionnaire on a draft', () => {
  it('a draft that starts at RFI says it asks none, and offers the way in', async () => {
    await draftEvent();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    const section = screen.getByTestId('rfq-questionnaire-section');
    expect(section).toHaveTextContent('RFI questionnaire');
    expect(within(section).getByTestId('rfi-questionnaire-none')).toHaveTextContent(
      'This draft asks no questionnaire. Published like this, suppliers record their interest and a note at the RFI stage.',
    );
    expect(within(section).getByTestId('rfi-questionnaire-edit')).toHaveTextContent('Write questionnaire');
  });

  it('THE MODE IS GATED, NOT THE DOOR — a seat narrowed while the editor stands open loses it', async () => {
    // The walk opens the editor with a held seat and then drops `procurement`
    // through the real identity control, which keeps the panel mounted. A
    // check made only where the editor is OPENED would leave a live Save.
    await draftEvent();
    renderWithProviders(<Sourcing />, {
      identity: { ...BUYER_NAMED, businessRoles: ['procurement', 'finance'] },
    });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-editor-save')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const idPanel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(idPanel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(idPanel).getByTestId('identity-role-procurement'));
    expect(await screen.findByTestId('handoff-rfq-questionnaire')).toBeInTheDocument();
    expect(screen.queryByTestId('rfi-editor-save')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfi-questionnaire-editor')).not.toBeInTheDocument();
  });

  it('a draft that starts at RFQ has no questionnaire section at all', async () => {
    await draftEvent('RFQ');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.queryByTestId('rfq-questionnaire-section')).not.toBeInTheDocument();
  });

  it('a seat without procurement reads who writes it, in the button’s slot', async () => {
    await draftEvent();
    renderWithProviders(<Sourcing />, { identity: RECEIVING });
    await openRfq(ID);
    expect(screen.queryByTestId('rfi-questionnaire-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfq-questionnaire')).toHaveTextContent('Awaiting');
  });

  it('THE EDITOR NAMES THE FIRST FAULT AND HOLDS SAVE — wording, then choices, then the fix saves', async () => {
    await draftEvent();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-editor-empty')).toHaveTextContent('No questions yet. Add one, or load a template.');
    // KNOWN-GOOD — an empty list is saveable (it removes the questionnaire).
    expect(screen.getByTestId('rfi-editor-save')).toBeEnabled();

    fireEvent.click(screen.getByTestId('rfi-editor-add'));
    expect(screen.getByTestId('rfi-editor-problem')).toHaveTextContent('Q1 has no wording yet.');
    expect(screen.getByTestId('rfi-editor-save')).toBeDisabled();

    type('rfi-editor-prompt-1', 'Which resin do you run?');
    expect(screen.queryByTestId('rfi-editor-problem')).not.toBeInTheDocument();
    type('rfi-editor-type-1', 'single_choice');
    expect(screen.getByTestId('rfi-editor-problem')).toHaveTextContent('Q1 needs at least two different choices.');
    type('rfi-editor-options-1', 'PET\nPET');
    expect(screen.getByTestId('rfi-editor-problem')).toHaveTextContent('Q1 needs at least two different choices.');
    type('rfi-editor-options-1', 'PET\nHDPE');
    expect(screen.queryByTestId('rfi-editor-problem')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rfi-editor-add'));
    type('rfi-editor-prompt-2', 'Monthly capacity');
    type('rfi-editor-type-2', 'number');
    expect(screen.getByTestId('rfi-editor-problem')).toHaveTextContent('Q2 needs the unit the number is asked in.');
    type('rfi-editor-unit-2', 'PCS');
    expect(screen.getByTestId('rfi-editor-save')).toBeEnabled();

    fireEvent.click(screen.getByTestId('rfi-editor-save'));
    await waitFor(() => expect(toast()).toHaveTextContent(`Questionnaire saved on ${ID}`));
    expect(toast()).toHaveTextContent('2 questions. Suppliers answer them once the event is published.');
    expect(rfqStore.get(ID)!.questionnaire).toEqual([
      { id: 'q1', prompt: 'Which resin do you run?', type: 'single_choice', required: true, options: ['PET', 'HDPE'] },
      { id: 'q2', prompt: 'Monthly capacity', type: 'number', required: true, unit: 'PCS' },
    ]);
    expect(rfqStore.get(ID)!.status).toBe('Draft');
  });

  it('A KNOCK-OUT MAKES THE QUESTION REQUIRED, and changing the type takes the knock-out off', async () => {
    await draftEvent();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    fireEvent.click(screen.getByTestId('rfi-editor-add'));
    type('rfi-editor-prompt-1', 'Halal certificate held?');
    fireEvent.click(screen.getByTestId('rfi-editor-required-1')); // off
    expect(screen.getByTestId('rfi-editor-required-1')).not.toBeChecked();
    type('rfi-editor-knockout-1', 'no');
    expect(screen.getByTestId('rfi-editor-required-1')).toBeChecked();
    expect(screen.getByTestId('rfi-editor-required-1')).toBeDisabled();
    expect(screen.getByTestId('rfi-editor-row-1')).toHaveTextContent(
      '(a question with a knock-out answer is always required)',
    );
    // a text question takes no knock-out: the field goes with the type
    type('rfi-editor-type-1', 'text');
    expect(screen.queryByTestId('rfi-editor-knockout-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-editor-required-1')).toBeEnabled();
    type('rfi-editor-type-1', 'yes_no');
    expect(screen.getByTestId('rfi-editor-knockout-1')).toHaveValue('');
  });

  it('the saved questionnaire is read back on the draft with each knock-out answer, and can be edited again', async () => {
    const id = await draftEvent();
    await rfqVerb('t_rfq_questionnaire_set', id, { questions: SIX });
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    const q1 = screen.getByTestId('rfi-question-read-q1');
    expect(q1).toHaveTextContent('Q1Do you hold a halal certificate for this format?');
    expect(q1).toHaveTextContent('Yes / No · Required · Knock-out answer: No');
    expect(screen.getByTestId('rfi-question-read-q2')).toHaveTextContent('Single choice · Required · PET / HDPE / PP');
    expect(screen.getByTestId('rfi-question-read-q4')).toHaveTextContent('Number with unit (PCS) · Required');
    expect(screen.getByTestId('rfi-question-read-q6')).toHaveTextContent('Document requested · Optional');
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-editor-prompt-6')).toHaveValue('Attach your latest audit report');
    expect(screen.getByTestId('rfi-editor-knockout-1')).toHaveValue('no');
    expect(screen.getByTestId('rfi-editor-options-2')).toHaveValue(['PET', 'HDPE', 'PP'].join(String.fromCharCode(10)));
    expect(screen.getByTestId('rfi-editor-unit-4')).toHaveValue('PCS');
  });

  it('removing every question and saving takes the questionnaire off the draft', async () => {
    const id = await draftEvent();
    await rfqVerb('t_rfq_questionnaire_set', id, { questions: SIX.slice(0, 1) });
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-editor-prompt-1')).toHaveValue('Do you hold a halal certificate for this format?');
    fireEvent.click(screen.getByTestId('rfi-editor-remove-1'));
    fireEvent.click(screen.getByTestId('rfi-editor-save'));
    await waitFor(() => expect(toast()).toHaveTextContent('The draft now asks no questionnaire.'));
    expect('questionnaire' in rfqStore.get(ID)!).toBe(false);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('2 · questionnaire templates: saved and used again, in this browser', () => {
  it('the store: a template is kept under its name, replaced on a second save, and removed', () => {
    expect(readRfiTemplates()).toEqual({ templates: [], rejected: 0, unreadable: false });
    expect(saveRfiTemplate(' Packaging RFI ', SIX)).toBeNull();
    expect(readRfiTemplates().templates.map((x) => [x.name, x.questions.length])).toEqual([['Packaging RFI', 6]]);
    expect(saveRfiTemplate('Packaging RFI', SIX.slice(0, 2))).toBeNull();
    expect(readRfiTemplates().templates.map((x) => [x.name, x.questions.length])).toEqual([['Packaging RFI', 2]]);
    expect(saveRfiTemplate('Other', SIX)).toBeNull();
    removeRfiTemplate('Packaging RFI');
    expect(readRfiTemplates().templates.map((x) => x.name)).toEqual(['Other']);
    removeRfiTemplate('Other');
    expect(window.localStorage.getItem(RFI_TEMPLATES_KEY)).toBeNull();
  });

  it('THE REFUSALS — no name, no questions, a questionnaire the verb would refuse; the good one saves', () => {
    expect(saveRfiTemplate('  ', SIX)).toBe('NAME_MISSING');
    expect(saveRfiTemplate('x', [])).toBe('NO_QUESTIONS');
    expect(saveRfiTemplate('x', [{ ...SIX[1], options: ['PET'] }])).toBe('MALFORMED');
    expect(window.localStorage.getItem(RFI_TEMPLATES_KEY)).toBeNull();
    expect(saveRfiTemplate('x', SIX)).toBeNull();
  });

  it('THE READ FAILS HONESTLY — unreadable is not empty, and a row that is not a questionnaire is dropped and counted', () => {
    window.localStorage.setItem(RFI_TEMPLATES_KEY, '{not json');
    expect(readRfiTemplates()).toEqual({ templates: [], rejected: 0, unreadable: true });
    window.localStorage.setItem(RFI_TEMPLATES_KEY, '{"a":1}');
    expect(readRfiTemplates().unreadable).toBe(true);
    window.localStorage.setItem(
      RFI_TEMPLATES_KEY,
      JSON.stringify([
        { name: 'Good', questions: SIX },
        { name: 'Bad', questions: [{ ...SIX[3], unit: '' }] },
        { name: '', questions: SIX },
        { name: 'Good', questions: SIX.slice(0, 1) },
        'nonsense',
      ]),
    );
    const read = readRfiTemplates();
    expect(read.unreadable).toBe(false);
    expect(read.templates.map((x) => [x.name, x.questions.length])).toEqual([['Good', 6]]);
    expect(read.rejected).toBe(4);
  });

  it('the editor: save the questions as a template, and load it into another draft — where it lives is said', async () => {
    const first = await draftEvent();
    await rfqVerb('t_rfq_questionnaire_set', first, { questions: SIX });
    await draftEvent(); // RFQ-2026-902, asks nothing yet
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-template-local')).toHaveTextContent(
      'Templates are kept in this browser only. They are not governed, not shared with colleagues and not recorded in the audit trail.',
    );
    expect(screen.getByTestId('rfi-template-save')).toBeDisabled(); // no name yet
    type('rfi-template-name', 'Packaging RFI');
    fireEvent.click(screen.getByTestId('rfi-template-save'));
    await waitFor(() => expect(toast()).toHaveTextContent('Template “Packaging RFI” saved'));
    expect(readRfiTemplates().templates.map((x) => x.name)).toEqual(['Packaging RFI']);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByLabelText('Close panel'));

    await openRfq('RFQ-2026-902');
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-template-load')).toBeDisabled();
    type('rfi-template-pick', 'Packaging RFI');
    fireEvent.click(screen.getByTestId('rfi-template-load'));
    expect(screen.getByTestId('rfi-editor-prompt-6')).toHaveValue('Attach your latest audit report');
    expect(screen.getByTestId('rfi-editor-knockout-1')).toHaveValue('no');
    // Loading wrote nothing to the event; Save does.
    expect(rfqStore.get('RFQ-2026-902')!.questionnaire).toBeUndefined();
    fireEvent.click(screen.getByTestId('rfi-editor-save'));
    await waitFor(() => expect(rfqStore.get('RFQ-2026-902')!.questionnaire).toEqual(SIX));
  });

  it('a stored value that cannot be read, and rows that are not questionnaires, are said in the bar', async () => {
    await draftEvent();
    window.localStorage.setItem(RFI_TEMPLATES_KEY, JSON.stringify([{ name: 'Bad', questions: [] }]));
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-template-rejected')).toHaveTextContent(
      'Some saved entries (1) were not valid questionnaires and are not listed.',
    );
    expect(screen.queryByTestId('rfi-template-unreadable')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('3 · the answer form’s model', () => {
  it('what the form sends: blanks left out, a number as a number, and text that is not one AS TYPED', () => {
    expect(answersOfForm(SIX, { q1: 'yes', q2: '', q3: [], q4: ' 250000 ', q5: '  ', q6: 'a.pdf' })).toEqual({
      q1: 'yes',
      q4: 250_000,
      q6: 'a.pdf',
    });
    expect(answersOfForm(SIX, { q4: 'lots' })).toEqual({ q4: 'lots' });
    expect(answersOfForm(SIX, { q3: ['Label', 'Hot stamp'] })).toEqual({ q3: ['Label', 'Hot stamp'] });
  });

  it('a saved draft fills the form back, the number as the text that was typed', () => {
    expect(formValuesOf(SIX, { q1: 'no', q3: ['Label'], q4: 12 })).toEqual({ q1: 'no', q3: ['Label'], q4: '12' });
    expect(formValuesOf(SIX, undefined)).toEqual({});
  });

  it('an answer read back: yes/no in words, ticks joined, a number with its unit, nothing for no answer', () => {
    const words = { yes: 'Yes', no: 'No' };
    expect(answerText(SIX[0], 'no', words)).toBe('No');
    expect(answerText(SIX[2], ['Label', 'Hot stamp'], words)).toBe('Label, Hot stamp');
    expect(answerText(SIX[3], 250_000, words)).toBe('250,000 PCS');
    expect(answerText(SIX[5], 'audit-2026.pdf', words)).toBe('audit-2026.pdf');
    expect(answerText(SIX[4], undefined, words)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('4 · the supplier answers the questionnaire', () => {
  it('the card says what this stage asks, and the way in is the questionnaire, not "record interest"', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    expect(within(c).getByTestId(`rfq-stage-content-note-${ID}`)).toHaveTextContent(
      'At its RFI stage this event asks a questionnaire of 6 questions. You can save a draft, and you submit once every required question is answered.',
    );
    expect(within(c).getByTestId(`rfq-interest-open-${ID}`)).toHaveTextContent('Answer the questionnaire');
    expect(within(c).queryByTestId(`rfi-answer-form-${ID}`)).not.toBeInTheDocument();
  });

  it('CONTROL — an RFI that asks no questionnaire still offers interest and a note, and says so', async () => {
    await openRfi([]);
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    expect(within(c).getByTestId(`rfq-stage-content-note-${ID}`)).toHaveTextContent(
      'This event asks no questionnaire at its RFI stage. You record your interest and a note, and nothing else.',
    );
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    expect(within(c).getByTestId(`rfq-interest-form-${ID}`)).toBeInTheDocument();
    expect(within(c).queryByTestId(`rfi-answer-form-${ID}`)).not.toBeInTheDocument();
  });

  it('the form: six questions, each of its kind, required and optional marked, and NO knock-out anywhere', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    const form = within(c).getByTestId(`rfi-answer-form-${ID}`);
    expect(within(form).getByTestId(`rfi-question-${ID}-q1`)).toHaveTextContent(
      'Q1Do you hold a halal certificate for this format?Required',
    );
    expect(within(form).getByTestId(`rfi-question-${ID}-q3`)).toHaveTextContent('Optional');
    expect(within(form).getByTestId(`rfi-answer-${ID}-q1-yes`)).toHaveAttribute('type', 'radio');
    expect(within(form).getByTestId(`rfi-answer-${ID}-q2-HDPE`)).toHaveAttribute('type', 'radio');
    expect(within(form).getByTestId(`rfi-answer-${ID}-q3-Label`)).toHaveAttribute('type', 'checkbox');
    expect(within(form).getByTestId(`rfi-question-${ID}-q4`)).toHaveTextContent('PCS');
    expect(within(form).getByTestId(`rfi-answer-${ID}-q6`)).toHaveAttribute('type', 'file');
    expect(within(form).getByTestId(`rfi-answer-${ID}-q6-note`)).toHaveTextContent(
      'Only the name of the file is recorded. The file itself is not uploaded or kept by this portal',
    );
    // The knock-out is the buyer's: no word of it reaches this page.
    expect(document.body.textContent).not.toMatch(/knock-?out/i);
  });

  it('THE REFUSAL — submitting with a required question unanswered names it, marks it, and records nothing', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q1-yes`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q2-PET`));
    expect(within(c).queryByTestId(`rfi-question-missing-${ID}-q4`)).not.toBeInTheDocument();
    fireEvent.click(within(c).getByTestId(`rfi-submit-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent('Answers not submitted'));
    expect(toast()).toHaveTextContent(
      'Required and not answered: Q4 “Monthly capacity”. Answer them and submit again, or save a draft.',
    );
    expect(within(c).getByTestId(`rfi-question-missing-${ID}-q4`)).toHaveTextContent(
      'This question is required and has no answer yet.',
    );
    // only the unanswered REQUIRED one is marked
    expect(within(c).queryByTestId(`rfi-question-missing-${ID}-q1`)).not.toBeInTheDocument();
    expect(within(c).queryByTestId(`rfi-question-missing-${ID}-q3`)).not.toBeInTheDocument();
    expect(stageResponseStore.forRfq(ID)).toEqual([]);
    // the form is still open, with what was typed
    expect(within(c).getByTestId(`rfi-answer-${ID}-q2-PET`)).toBeChecked();
  });

  it('THE REFUSAL — a number that is not one is refused in the supplier’s words, and nothing is recorded', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    type(`rfi-answer-${ID}-q4`, 'lots');
    fireEvent.click(within(c).getByTestId(`rfi-save-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent('Draft not saved'));
    expect(toast()).toHaveTextContent('One of the answers is not of the kind its question asks for');
    expect(stageResponseStore.forRfq(ID)).toEqual([]);
  });

  it('SAVE DRAFT, COME BACK, SUBMIT — the draft is the supplier’s own, and the submitted answers are read back', async () => {
    await openRfi();
    const view = renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    let c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q1-yes`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q3-Label`));
    fireEvent.click(within(c).getByTestId(`rfi-save-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent(`Draft saved on ${ID}`));
    expect(toast()).toHaveTextContent('Paragon does not see a draft. Submit it before the response deadline.');
    const drafts = stageResponseStore.forRfq(ID);
    expect(drafts.map((d) => [d.status, d.answers])).toEqual([['Draft', { q1: 'yes', q3: ['Label'] }]]);
    expect(rfqStore.get(ID)!.respondedSupplierIds).toEqual([]);

    await waitFor(() => expect(screen.getByTestId(`rfi-draft-saved-${ID}`)).toBeInTheDocument());
    c = await card(ID);
    expect(within(c).getByTestId(`rfi-draft-saved-${ID}`)).toHaveTextContent('Not submitted — Paragon does not see a draft.');
    expect(within(c).getByTestId(`rfq-interest-open-${ID}`)).toHaveTextContent('Continue your answers');
    expect(within(c).queryByTestId(`rfq-interest-recorded-${ID}`)).not.toBeInTheDocument();

    // back in: the draft fills the form
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    expect(within(c).getByTestId(`rfi-answer-${ID}-q1-yes`)).toBeChecked();
    expect(within(c).getByTestId(`rfi-answer-${ID}-q3-Label`)).toBeChecked();
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q2-HDPE`));
    type(`rfi-answer-${ID}-q4`, '250000');
    fireEvent.change(within(c).getByTestId(`rfi-answer-${ID}-q6`), {
      target: { files: [new File(['%PDF'], 'audit-2026.pdf', { type: 'application/pdf' })] },
    });
    expect(within(c).getByTestId(`rfi-answer-${ID}-q6-name`)).toHaveTextContent('File name recorded: audit-2026.pdf');
    fireEvent.click(within(c).getByTestId(`rfi-submit-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent(`Answers submitted on ${ID}`));

    const rows = stageResponseStore.forRfq(ID);
    expect(rows).toHaveLength(1); // the draft became the answer; no second row
    expect(rows[0].id).toBe(drafts[0].id);
    expect('status' in rows[0]).toBe(false);
    expect(rows[0].answers).toEqual({ q1: 'yes', q2: 'HDPE', q3: ['Label'], q4: 250_000, q6: 'audit-2026.pdf' });
    expect(rfqStore.get(ID)!.respondedSupplierIds).toEqual(['sup-005']);

    await waitFor(() => expect(screen.getByTestId(`rfq-interest-recorded-${ID}`)).toBeInTheDocument());
    c = await card(ID);
    expect(within(c).getByTestId(`rfq-interest-recorded-${ID}`)).toHaveTextContent('Answers submitted at RFI on');
    const own = within(c).getByTestId(`rfi-own-answers-${ID}`);
    expect(own).toHaveTextContent('Q1Do you hold a halal certificate for this format? Yes');
    expect(own).toHaveTextContent('Q4Monthly capacity 250,000 PCS');
    expect(own).toHaveTextContent('Q5Describe your quality system Not answered');
    expect(own).toHaveTextContent('Q6Attach your latest audit report audit-2026.pdf');
    expect(within(c).queryByTestId(`rfq-interest-open-${ID}`)).not.toBeInTheDocument();
    view.unmount();
  });

  it('saving a draft twice re-saves the SAME row, with what the form now holds', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    let c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q1-yes`));
    fireEvent.click(within(c).getByTestId(`rfi-save-${ID}`));
    await waitFor(() => expect(screen.getByTestId(`rfi-draft-saved-${ID}`)).toBeInTheDocument());
    const first = stageResponseStore.forRfq(ID)[0].id;
    c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q1-no`));
    type(`rfi-answer-${ID}-q4`, '75');
    fireEvent.click(within(c).getByTestId(`rfi-save-${ID}`));
    await waitFor(() => expect(stageResponseStore.forRfq(ID)[0].answers).toEqual({ q1: 'no', q4: 75 }));
    expect(stageResponseStore.forRfq(ID).map((r) => [r.id, r.status])).toEqual([[first, 'Draft']]);
    expect(toast()).not.toHaveTextContent('Draft not saved');
  });

  it('THE MODE IS GATED — a supplier seat narrowed while the answer form stands open loses it', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, {
      identity: { ...as('sup-005'), businessRoles: ['supplier', 'commercial', 'fulfilment'] },
    });
    const c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    expect(within(c).getByTestId(`rfi-submit-${ID}`)).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const idPanel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(idPanel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(idPanel).getByTestId('identity-role-commercial'));
    expect(await screen.findByTestId('handoff-stageresponse-submit')).toBeInTheDocument();
    expect(screen.queryByTestId(`rfi-submit-${ID}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`rfi-answer-form-${ID}`)).not.toBeInTheDocument();
  });

  it('AT THE RFP THE QUESTIONNAIRE IS NOT ASKED AGAIN — the card offers interest, and says what an RFP holds', async () => {
    const id = await openRfi();
    for (const s of THREE) await answer(s, id, GOOD);
    await rfqVerb('t_rfq_close', id);
    await rfqVerb('t_rfq_advance', id, { shortlistSupplierIds: THREE, responseDeadline: '2026-10-20' });
    expect(rfqStore.get(id)!.stage).toBe('RFP');
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    expect(within(c).getByTestId(`rfq-stage-content-note-${ID}`)).toHaveTextContent(
      'At the RFP stage you record your interest and a note, and nothing else. The proposal is not built in this portal yet.',
    );
    expect(within(c).getByTestId(`rfq-interest-open-${ID}`)).toHaveTextContent('Record interest');
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    expect(within(c).getByTestId(`rfq-interest-form-${ID}`)).toBeInTheDocument();
    expect(within(c).queryByTestId(`rfi-answer-form-${ID}`)).not.toBeInTheDocument();
  });

  it('one act with no draft: answer everything required and submit', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-007') });
    const c = await card(ID);
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q1-no`));
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q2-PP`));
    type(`rfi-answer-${ID}-q4`, '0');
    type(`rfi-note-${ID}`, 'Certificate in progress.');
    fireEvent.click(within(c).getByTestId(`rfi-submit-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent(`Answers submitted on ${ID}`));
    const rows = stageResponseStore.forRfq(ID);
    expect(rows.map((r) => [r.supplierId, r.answers, r.note])).toEqual([
      ['sup-007', { q1: 'no', q2: 'PP', q4: 0 }, 'Certificate in progress.'],
    ]);
  });

  it('a seat without the commercial lane reads who answers, and gets no form', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: FULFILMENT });
    const c = await card(ID);
    expect(within(c).queryByTestId(`rfq-interest-open-${ID}`)).not.toBeInTheDocument();
    expect(within(c).getByTestId('handoff-stageresponse-submit')).toHaveTextContent('Awaiting');
  });

  it('another supplier’s draft and answers do not reach this supplier’s page', async () => {
    const id = await openRfi();
    await svc.dispatch(supplierScope('sup-002'), {
      transitionId: 't_stageresponse_save',
      entity: 'stageResponse',
      payload: { rfqId: id, supplierId: 'sup-002', answers: { q5: 'SECRET-DRAFT-TEXT' } },
    });
    await answer('sup-007', id, { ...GOOD, q5: 'SECRET-ANSWER-TEXT' });
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card(ID);
    expect(within(c).getByTestId(`rfq-interest-open-${ID}`)).toHaveTextContent('Answer the questionnaire');
    expect(document.body.textContent).not.toContain('SECRET-');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('5 · the buyer’s answer matrix', () => {
  const three = async (): Promise<string> => {
    const id = await openRfi();
    await answer('sup-005', id, GOOD);
    await answer('sup-007', id, { ...GOOD, q2: 'HDPE', q3: undefined, q5: undefined, q6: undefined });
    await answer('sup-002', id, { ...GOOD, q1: 'no' });
    return id;
  };

  it('before anybody answers the matrix says so, and the questions are read with their knock-outs', async () => {
    await openRfi();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfi-matrix-empty')).toHaveTextContent('No supplier has submitted answers yet.');
    expect(screen.getByTestId('rfi-question-read-q1')).toHaveTextContent('Knock-out answer: No');
    // published: the questions do not move, so there is no way into the editor
    expect(screen.queryByTestId('rfi-questionnaire-edit')).not.toBeInTheDocument();
  });

  it('suppliers down, questions across — each answer in its cell, and "Not answered" where there is none', async () => {
    await three();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    const matrix = screen.getByTestId('rfi-matrix');
    expect(within(matrix).getAllByRole('row')).toHaveLength(4); // the head and three suppliers
    expect(within(matrix).getByTestId('rfi-matrix-head-q1')).toHaveTextContent(
      'Q1 Do you hold a halal certificate for this format?Knock-out: No',
    );
    expect(within(matrix).getByTestId('rfi-matrix-head-q2')).not.toHaveTextContent('Knock-out');
    expect(within(matrix).getByTestId('rfi-matrix-row-sup-005')).toHaveTextContent(NAME['sup-005']);
    expect(within(matrix).getByTestId('rfi-matrix-cell-sup-005-q1')).toHaveTextContent('Yes');
    expect(within(matrix).getByTestId('rfi-matrix-cell-sup-005-q3')).toHaveTextContent('Label');
    expect(within(matrix).getByTestId('rfi-matrix-cell-sup-005-q4')).toHaveTextContent('250,000 PCS');
    expect(within(matrix).getByTestId('rfi-matrix-cell-sup-005-q6')).toHaveTextContent('audit-2026.pdf');
    expect(within(matrix).getByTestId('rfi-matrix-cell-sup-007-q2')).toHaveTextContent('HDPE');
    expect(within(matrix).getByTestId('rfi-matrix-cell-sup-007-q5')).toHaveTextContent('Not answered');
  });

  it('THE KNOCK-OUT IS MARKED IN WORDS — the cell, and the supplier’s verdict; the others read "passed"', async () => {
    await three();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    const out = screen.getByTestId('rfi-matrix-cell-sup-002-q1');
    expect(out).toHaveAttribute('data-knockout', 'true');
    expect(out).toHaveTextContent('NoKnock-out answer');
    expect(screen.getByTestId('rfi-matrix-verdict-sup-002')).toHaveTextContent('Failed a knock-out: Q1');
    // CONTROL — the same question, the passing answer: not marked.
    const ok = screen.getByTestId('rfi-matrix-cell-sup-005-q1');
    expect(ok).not.toHaveAttribute('data-knockout');
    expect(ok).not.toHaveTextContent('Knock-out answer');
    expect(screen.getByTestId('rfi-matrix-verdict-sup-005')).toHaveTextContent('Passed every knock-out');
    expect(screen.getByTestId('rfi-matrix-verdict-sup-007')).toHaveTextContent('Passed every knock-out');
    expect(screen.getByTestId('rfi-matrix-note')).toHaveTextContent(
      'A knock-out answer removes nobody by itself: you choose the shortlist when you advance the event',
    );
  });

  it('a supplier’s unsent draft is not a row', async () => {
    const id = await openRfi();
    await answer('sup-005', id, GOOD);
    await svc.dispatch(supplierScope('sup-002'), {
      transitionId: 't_stageresponse_save',
      entity: 'stageResponse',
      payload: { rfqId: id, supplierId: 'sup-002', answers: { q1: 'no' } },
    });
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfi-matrix-row-sup-005')).toBeInTheDocument();
    expect(screen.queryByTestId('rfi-matrix-row-sup-002')).not.toBeInTheDocument();
  });

  it('a questionnaire with no knock-out shows no verdict and says so', async () => {
    const id = await openRfi(SIX.slice(1));
    await answer('sup-005', id, { q2: 'PET', q4: 1 });
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.queryByTestId('rfi-matrix-verdict-sup-005')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-matrix-note')).toHaveTextContent('This questionnaire has no knock-out question.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('6 · the shortlist starts from the suppliers who passed every knock-out', () => {
  const closedWithAnswers = async (): Promise<string> => {
    const id = await openRfi();
    await answer('sup-005', id, GOOD);
    await answer('sup-007', id, { ...GOOD, q2: 'HDPE' });
    await answer('sup-002', id, { ...GOOD, q1: 'no' });
    expect((await rfqVerb('t_rfq_close', id)).status).toBe('done');
    return id;
  };

  it('the model: who passed, in the order they answered; with no knock-out, everybody who answered', async () => {
    const id = await closedWithAnswers();
    const event = rfqStore.get(id)!;
    expect(passedEveryKnockout(event, event.respondedSupplierIds)).toEqual(['sup-005', 'sup-007']);
    expect(passedEveryKnockout({ ...event, questionnaire: SIX.slice(1) }, event.respondedSupplierIds)).toEqual([
      'sup-005',
      'sup-007',
      'sup-002',
    ]);
  });

  it('PRE-SELECTED, NOT DECIDED — the failed supplier is unticked, named as failed, and still tickable', async () => {
    await closedWithAnswers();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.getByTestId('rfq-advance-preselect-note')).toHaveTextContent(
      'Pre-selected: the suppliers who passed every knock-out. The list is yours — tick or untick any supplier who answered.',
    );
    expect(screen.getByTestId('rfq-advance-pick-sup-005')).toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-007')).toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-002')).not.toBeChecked();
    expect(screen.getByTestId('rfq-advance-pick-sup-002')).toBeEnabled();
    expect(screen.getByTestId('rfq-advance-knockout-sup-002')).toHaveTextContent('Failed a knock-out: Q1');
    expect(screen.queryByTestId('rfq-advance-knockout-sup-005')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfq-advance-left-out')).toHaveTextContent(NAME['sup-002']);
  });

  it('advancing with the pre-selected list carries the two who passed; the one who failed is left out with the reason', async () => {
    await closedWithAnswers();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    type('rfq-advance-reason', 'No halal certificate for this format.');
    type('rfq-advance-deadline', '2026-10-20');
    fireEvent.click(screen.getByTestId('rfq-advance-yes'));
    await waitFor(() => expect(rfqStore.get(ID)!.stage).toBe('RFP'));
    expect(rfqStore.get(ID)!.invitedSupplierIds).toEqual(['sup-005', 'sup-007']);
    expect(rfqStore.get(ID)!.stageHistory![0].notShortlistedSupplierIds).toEqual(['sup-002']);
    expect(rfqStore.get(ID)!.stageHistory![0].reason).toBe('No halal certificate for this format.');
  });

  it('THE BUYER STILL DECIDES — ticking the failed supplier carries all three, and no reason is needed', async () => {
    await closedWithAnswers();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    fireEvent.click(screen.getByTestId('rfq-advance-pick-sup-002'));
    type('rfq-advance-deadline', '2026-10-20');
    fireEvent.click(screen.getByTestId('rfq-advance-yes'));
    await waitFor(() => expect(rfqStore.get(ID)!.stage).toBe('RFP'));
    expect(rfqStore.get(ID)!.invitedSupplierIds).toEqual(THREE);
  });

  it('CONTROL — an RFI with no knock-out starts from everybody who answered, with no pre-selection note', async () => {
    const id = await openRfi(SIX.slice(1));
    for (const s of THREE) await answer(s, id, { q2: 'PET', q4: 1 });
    await rfqVerb('t_rfq_close', id);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.queryByTestId('rfq-advance-preselect-note')).not.toBeInTheDocument();
    for (const s of THREE) expect(screen.getByTestId(`rfq-advance-pick-${s}`)).toBeChecked();
  });

  it('after the advance the matrix is still read at RFP: the RFI answers are what the shortlist was chosen on', async () => {
    const id = await closedWithAnswers();
    await rfqVerb('t_rfq_advance', id, {
      shortlistSupplierIds: ['sup-005', 'sup-007'],
      shortlistReason: 'No halal certificate for this format.',
      responseDeadline: '2026-10-20',
    });
    // An answer recorded at the RFP is not an RFI answer: it is not a row.
    const rfp = await svc.dispatch(supplierScope('sup-005'), {
      transitionId: 't_stageresponse_submit',
      entity: 'stageResponse',
      payload: { rfqId: id, supplierId: 'sup-005', note: 'Proposal to follow.' },
    });
    expect(rfp.status, rfp.reason).toBe('done');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfi-matrix-row-sup-002')).toBeInTheDocument();
    expect(screen.getByTestId('rfi-matrix-verdict-sup-002')).toHaveTextContent('Failed a knock-out: Q1');
    expect(within(screen.getByTestId('rfi-matrix')).getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByTestId('rfi-matrix-row-sup-005')).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ID — the same surfaces in Indonesian', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('id');
  });

  it('the buyer: the draft’s questionnaire, the editor’s fault, the types and the template bar', async () => {
    const id = await draftEvent();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfq-questionnaire-section')).toHaveTextContent('Kuesioner RFI');
    expect(screen.getByTestId('rfi-questionnaire-none')).toHaveTextContent('Draf ini tidak mengajukan kuesioner.');
    fireEvent.click(screen.getByTestId('rfi-questionnaire-edit'));
    expect(screen.getByTestId('rfi-template-local')).toHaveTextContent('Templat hanya disimpan di peramban ini.');
    fireEvent.click(screen.getByTestId('rfi-editor-add'));
    expect(screen.getByTestId('rfi-editor-problem')).toHaveTextContent('Q1 belum memiliki kalimat pertanyaan.');
    expect(within(screen.getByTestId('rfi-editor-type-1')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Ya / Tidak',
      'Pilihan tunggal',
      'Pilihan ganda',
      'Angka dengan satuan',
      'Teks',
      'Dokumen diminta',
    ]);
    expect(id).toBe(ID);
  });

  it('the buyer: the matrix, the knock-out and the pre-selected shortlist', async () => {
    const id = await openRfi();
    await answer('sup-005', id, GOOD);
    await answer('sup-007', id, GOOD);
    await answer('sup-002', id, { ...GOOD, q1: 'no' });
    await rfqVerb('t_rfq_close', id);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq(ID);
    expect(screen.getByTestId('rfi-question-read-q1')).toHaveTextContent('Ya / Tidak · Wajib · Jawaban gugur: Tidak');
    expect(screen.getByTestId('rfi-matrix-cell-sup-002-q1')).toHaveTextContent('TidakJawaban gugur');
    expect(screen.getByTestId('rfi-matrix-verdict-sup-002')).toHaveTextContent('Gagal pada pertanyaan gugur: Q1');
    expect(screen.getByTestId('rfi-matrix-verdict-sup-005')).toHaveTextContent('Lolos semua pertanyaan gugur');
    expect(screen.getByTestId('rfi-matrix-cell-sup-005-q4')).toHaveTextContent('250.000 PCS');
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.getByTestId('rfq-advance-preselect-note')).toHaveTextContent(
      'Terpilih lebih dulu: pemasok yang lolos semua pertanyaan gugur.',
    );
    expect(screen.getByTestId('rfq-advance-knockout-sup-002')).toHaveTextContent('Gagal pada pertanyaan gugur: Q1');
  });

  it('the supplier: the card, the form, the required-question refusal, the draft', async () => {
    await openRfi();
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    let c = await card(ID);
    expect(within(c).getByTestId(`rfq-stage-content-note-${ID}`)).toHaveTextContent(
      'Pada tahap RFI acara ini mengajukan kuesioner berisi 6 pertanyaan.',
    );
    expect(within(c).getByTestId(`rfq-interest-open-${ID}`)).toHaveTextContent('Jawab kuesioner');
    fireEvent.click(within(c).getByTestId(`rfq-interest-open-${ID}`));
    expect(within(c).getByTestId(`rfi-question-${ID}-q1`)).toHaveTextContent('Wajib');
    expect(within(c).getByTestId(`rfi-question-${ID}-q3`)).toHaveTextContent('Opsional');
    expect(within(c).getByTestId(`rfi-answer-${ID}-q6-note`)).toHaveTextContent('Hanya nama berkas yang dicatat.');
    fireEvent.click(within(c).getByTestId(`rfi-answer-${ID}-q1-yes`));
    fireEvent.click(within(c).getByTestId(`rfi-submit-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent('Jawaban tidak terkirim'));
    expect(toast()).toHaveTextContent(
      'Wajib dan belum dijawab: Q2 “Which resin do you run?”; Q4 “Monthly capacity”. Jawab lalu kirim lagi, atau simpan sebagai draf.',
    );
    expect(within(c).getByTestId(`rfi-question-missing-${ID}-q2`)).toHaveTextContent(
      'Pertanyaan ini wajib dan belum dijawab.',
    );
    fireEvent.click(within(c).getByTestId(`rfi-save-${ID}`));
    await waitFor(() => expect(toast()).toHaveTextContent(`Draf disimpan pada ${ID}`));
    await waitFor(() => expect(screen.getByTestId(`rfi-draft-saved-${ID}`)).toBeInTheDocument());
    c = await card(ID);
    expect(within(c).getByTestId(`rfi-draft-saved-${ID}`)).toHaveTextContent('Belum dikirim — Paragon tidak melihat draf.');
    expect(within(c).getByTestId(`rfq-interest-open-${ID}`)).toHaveTextContent('Lanjutkan jawaban Anda');
  });
});
