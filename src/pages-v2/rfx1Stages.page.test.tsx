// ────────────────────────────────────────────────────────────────────────────
// RFx-1 · THE STAGED SOURCING EVENT — what the buyer and the supplier see.
//
// The machine is proven in `services/data/mock/rfx1Stages.test.ts`. This file
// renders the two pages over the real stores and reads what a person reads:
// the stage timeline, the shortlist form and what holds its button, the second
// ask on conclude, the publish slot of a draft past its deadline, the
// supplier's "record interest" and "not shortlisted" cards — EN, then ID.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { stageResponseStore } from '../services/data/mock/stores/stageResponseStore';
import { mockSuppliers } from '../data/mockSuppliers';
import { SupplierStatus } from '../types/supplier.types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { SAMPLE_ACTORS } from '../services/identity/sampleActors';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import SupplierRFQs from './SupplierRFQs';
import SupplierRfqToRespondWidget from './widgets/SupplierRfqToRespondWidget';
import { useToast } from '../hooks/useToast';

/** Surfaces the toast queue into the DOM — `ToastProvider` renders only its
 *  children, so without this a toast is invisible to a spec. */
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
const FULFILMENT: CurrentIdentity = { ...SUPPLIER, businessRoles: ['supplier', 'fulfilment'] };
const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

const THREE = ['sup-002', 'sup-005', 'sup-007'];
const NAME = Object.fromEntries(mockSuppliers.map((s) => [s.id, s.name]));
const DAY = 86_400_000;
const yesterday = new Date(Date.parse(DECLARED_PRESENT) - DAY).toISOString().slice(0, 10);

const rfqVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(named, { transitionId, entity: 'rfq', entityId, payload });
const interest = (supplierId: string, rfqId: string, note?: string) =>
  svc.dispatch(supplierScope(supplierId), {
    transitionId: 't_stageresponse_submit',
    entity: 'stageResponse',
    payload: { rfqId, supplierId, ...(note ? { note } : {}) },
  });

/** A live RFI the three sample suppliers answered, bidding closed. Its number is RFQ-2026-901. */
const closedRfi = async (): Promise<string> => {
  const made = await svc.dispatch(named, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-1 page probe',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: '2026-10-15',
      awardDeadline: '2026-10-30',
      stage: 'RFI',
    },
  });
  const id = made.entityId!;
  expect((await rfqVerb('t_rfq_publish', id)).status).toBe('done');
  for (const s of THREE) expect((await interest(s, id)).status).toBe('done');
  expect((await rfqVerb('t_rfq_close', id)).status).toBe('done');
  return id;
};

const openRfq = async (rfqNumber: string) => {
  fireEvent.click(await screen.findByText(rfqNumber));
  await screen.findByRole('dialog');
};
const rowOf = async (rfqNumber: string) => (await screen.findByText(rfqNumber)).closest('tr')!;
const toast = () => screen.getByTestId('toast-spy');
const type = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId), { target: { value } });

/** The card of one event on the supplier's Open tab. */
const card = async (rfqNumber: string): Promise<HTMLElement> =>
  (await screen.findByText(rfqNumber)).closest('.rounded-lg') as HTMLElement;

beforeEach(() => {
  stageResponseStore.reset();
  quotationStore.reset();
  rfqStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('1 · the buyer’s board and panel show where an event is on its path', () => {
  it('a staged event carries its stage on the row; an event with no stages reads as it always did', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(within(await rowOf('RFQ-2026-018')).getByTestId('rfq-row-stage-rfq-018')).toHaveTextContent('RFP stage');
    expect(await rowOf('RFQ-2026-018')).toHaveTextContent('1 / 2');
    // known-good control: a plain RFQ has no chip
    expect(within(await rowOf('RFQ-2026-003')).queryByTestId('rfq-row-stage-rfq-003')).not.toBeInTheDocument();
  });

  it('the timeline: RFI done with the day it was left, RFP current, RFQ not started', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    const rfi = screen.getByTestId('rfq-stage-timeline-RFI');
    expect(rfi).toHaveAttribute('data-state', 'done');
    expect(rfi).toHaveTextContent('Request for information');
    expect(rfi).toHaveTextContent('Advanced on 24 Aug 2026');
    expect(screen.getByTestId('rfq-stage-timeline-RFP')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('rfq-stage-timeline-RFP')).toHaveTextContent('Current stage');
    expect(screen.getByTestId('rfq-stage-timeline-RFQ')).toHaveAttribute('data-state', 'upcoming');
    expect(screen.queryByTestId('rfq-stage-timeline-outcome')).not.toBeInTheDocument();
  });

  it('the advance line names who was carried, who was not, and the reason given', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    const line = screen.getByTestId('rfq-stage-advance-RFI');
    expect(line).toHaveTextContent(`RFI to RFP — carried forward: ${NAME['sup-005']}, ${NAME['sup-007']}`);
    expect(line).toHaveTextContent(
      `Not carried: ${NAME['sup-002']} — reason given: “Supply would be subcontracted; this programme needs an in-house source.”`,
    );
  });

  it('KNOWN-GOOD — closing an event with no stages still speaks of quotations and the award', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-003');
    fireEvent.click(screen.getByTestId('rfq-close'));
    await waitFor(() => expect(toast()).toHaveTextContent('RFQ-2026-003 closed to new quotations'));
    expect(toast()).toHaveTextContent('Award on the quotations received, reopen, or cancel.');
  });

  it('an event with no stages shows one step, RFQ, and no response list', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-003');
    expect(screen.getByTestId('rfq-stage-timeline-RFQ')).toHaveAttribute('data-state', 'current');
    expect(screen.queryByTestId('rfq-stage-timeline-RFI')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfq-stage-responses')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfq-advance-needs-close')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfq-advance')).not.toBeInTheDocument();
  });

  it('the responses: each answer with its stage, day and note — and the honest limit above them', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    const list = screen.getByTestId('rfq-stage-responses');
    expect(within(list).getByTestId('rfq-stage-content-note')).toHaveTextContent(
      // RFx-2 — the RFI questionnaire is built; the sentence says what is still not.
      'At the RFI stage a supplier answers the event’s questionnaire — or, when the event asks none, records its interest and a note. At the RFP stage it records its interest and a note; the proposal and its scoring are not built yet.',
    );
    expect(within(list).getByTestId('rfq-stage-response-count')).toHaveTextContent(
      '1 of 2 invited suppliers have responded at the RFP stage',
    );
    expect(within(list).getByTestId('rfq-stage-response-RFI-sup-002')).toHaveTextContent(
      'Interested. We would source the bottles through a partner.',
    );
    expect(within(list).getByTestId('rfq-stage-response-RFI-sup-007')).toHaveTextContent('No note.');
    expect(within(list).getByTestId('rfq-stage-response-RFP-sup-005')).toHaveTextContent('27 Aug 2026');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  it('an RFP every invitee has answered is not "ready to award" — that is an RFQ-stage fact', async () => {
    expect((await interest('sup-007', 'rfq-018')).status).toBe('done');
    const awaiting = rfqStore
      .all()
      .filter((r) => r.status === 'Open' && (r.stage ?? 'RFQ') === 'RFQ')
      .filter((r) => r.invitedSupplierIds.length > 0 && r.respondedSupplierIds.length === r.invitedSupplierIds.length);
    // population control: the RFP is fully answered, and is not among them
    expect(rfqStore.get('rfq-018')!.respondedSupplierIds).toHaveLength(2);
    expect(awaiting.map((r) => r.id)).not.toContain('rfq-018');
    expect(awaiting.length).toBeGreaterThan(0);
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await rowOf('RFQ-2026-018');
    expect(screen.getByRole('tab', { name: /Pending Award/ }).textContent).toMatch(
      new RegExp(`Pending Award\\s*${awaiting.length}$`),
    );
  });

  it('at RFP the comparison says where quotations are taken, and there is no award to make', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    expect(screen.getByText('Quotations are taken at the RFQ stage. This event has not reached it.')).toBeInTheDocument();
    expect(screen.queryByTestId('rfq-award-section')).not.toBeInTheDocument();
  });
});

describe('2 · advance with a shortlist', () => {
  it('an Open event says bidding is closed first; closing it offers the advance', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    expect(screen.getByTestId('rfq-advance-needs-close')).toHaveTextContent('Close bidding to advance to RFQ');
    expect(screen.queryByTestId('rfq-advance')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfq-close'));
    expect(await screen.findByTestId('rfq-advance')).toHaveTextContent('Advance to RFQ');
    expect(screen.queryByTestId('rfq-advance-needs-close')).not.toBeInTheDocument();
    // closing a stage is said as what it is: no quotation, no award to make
    expect(toast()).toHaveTextContent('RFQ-2026-018 closed to new responses');
    expect(toast()).toHaveTextContent('The RFP stage is closed. Advance with a shortlist, reopen, or conclude without an award.');
    expect(toast()).not.toHaveTextContent('Award on the quotations received');
  });

  it('the form: responders start ticked, a supplier that did not respond cannot be ticked', async () => {
    await rfqVerb('t_rfq_close', 'rfq-018');
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    fireEvent.click(screen.getByTestId('rfq-advance'));
    const form = screen.getByTestId('rfq-advance-form');
    expect(within(form).getByTestId('rfq-advance-pick-sup-005')).toBeChecked();
    const silent = within(form).getByTestId('rfq-advance-pick-sup-007');
    expect(silent).not.toBeChecked();
    expect(silent).toBeDisabled();
    expect(form).toHaveTextContent('did not respond at RFP');
    // one eligible supplier is under the floor: said, and the commit is held
    expect(within(form).getByTestId('rfq-advance-blocked')).toHaveTextContent(
      'The next stage needs at least two eligible suppliers.',
    );
    expect(within(form).getByTestId('rfq-advance-yes')).toBeDisabled();
    // "Not now" commits nothing
    fireEvent.click(within(form).getByTestId('rfq-advance-no'));
    expect(screen.queryByTestId('rfq-advance-form')).not.toBeInTheDocument();
    expect(rfqStore.get('rfq-018')!.stage).toBe('RFP');
  });

  it('each rule is said before the press: nobody ticked, no reason, no deadline, a deadline that passed', async () => {
    await closedRfi();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-901');
    fireEvent.click(screen.getByTestId('rfq-advance'));
    const blocked = () => screen.getByTestId('rfq-advance-blocked');
    const yes = () => screen.getByTestId('rfq-advance-yes');
    // all three answered and start ticked; nothing is left out, so only the deadline is owed
    expect(screen.getByTestId('rfq-advance-left-out')).toHaveTextContent('Every invited supplier is carried forward');
    expect(blocked()).toHaveTextContent('Set the response deadline of the next stage.');
    expect(yes()).toBeDisabled();
    type('rfq-advance-deadline', yesterday);
    expect(blocked()).toHaveTextContent('The response deadline has already passed.');
    type('rfq-advance-deadline', '2026-11-01');
    expect(screen.queryByTestId('rfq-advance-blocked')).not.toBeInTheDocument();
    expect(yes()).toBeEnabled();
    expect(yes()).toHaveTextContent('Advance to RFP with 3 suppliers');
    // leave one out: the reason is owed, and it is said who reads it
    fireEvent.click(screen.getByTestId('rfq-advance-pick-sup-002'));
    expect(screen.getByTestId('rfq-advance-left-out')).toHaveTextContent(`Not carried: ${NAME['sup-002']}`);
    expect(blocked()).toHaveTextContent('State the reason for the suppliers left out.');
    expect(yes()).toBeDisabled();
    type('rfq-advance-reason', 'Capacity below the volume needed.');
    expect(yes()).toBeEnabled();
    expect(yes()).toHaveTextContent('Advance to RFP with 2 suppliers');
    // an award deadline on or before the response deadline holds it again
    type('rfq-advance-award-deadline', '2026-11-01');
    expect(blocked()).toHaveTextContent('Award deadline must be after response deadline');
    type('rfq-advance-award-deadline', '2026-11-20');
    expect(yes()).toBeEnabled();
    // nobody ticked
    fireEvent.click(screen.getByTestId('rfq-advance-pick-sup-005'));
    fireEvent.click(screen.getByTestId('rfq-advance-pick-sup-007'));
    expect(blocked()).toHaveTextContent('Tick at least one supplier.');
  });

  it('THE COMMIT — the event is at the next stage, the list is the shortlist, the panel stays open', async () => {
    const id = await closedRfi();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-901');
    fireEvent.click(screen.getByTestId('rfq-advance'));
    fireEvent.click(screen.getByTestId('rfq-advance-pick-sup-002'));
    type('rfq-advance-reason', 'Capacity below the volume needed.');
    type('rfq-advance-deadline', '2026-11-01');
    fireEvent.click(screen.getByTestId('rfq-advance-yes'));
    await waitFor(() => expect(toast()).toHaveTextContent('RFQ-2026-901 is now at RFP'));
    expect(toast()).toHaveTextContent('2 suppliers are invited to the next stage.');
    const e = rfqStore.get(id)!;
    expect(e.stage).toBe('RFP');
    expect(e.status).toBe('Open');
    expect(e.invitedSupplierIds).toEqual(['sup-005', 'sup-007']);
    expect(e.stageHistory![0].reason).toBe('Capacity below the volume needed.');
    // the panel is still on the event, one stage on
    await waitFor(() =>
      expect(screen.getByTestId('rfq-stage-timeline-RFP')).toHaveAttribute('data-state', 'current'),
    );
    expect(screen.getByTestId('rfq-stage-advance-RFI')).toHaveTextContent('reason given: “Capacity below the volume needed.”');
    expect(screen.queryByTestId('rfq-advance-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfq-stage-response-count')).toHaveTextContent('0 of 2 invited suppliers have responded at the RFP stage');
  });

  it('a seat that does not hold the verb reads who does, in the button’s slot', async () => {
    await rfqVerb('t_rfq_close', 'rfq-018');
    renderWithProviders(<Sourcing />, { identity: RECEIVING });
    await openRfq('RFQ-2026-018');
    expect(screen.getByTestId('handoff-rfq-advance')).toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfq-conclude')).toBeInTheDocument();
    expect(screen.queryByTestId('rfq-advance')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfq-conclude')).not.toBeInTheDocument();
  });

  it('a seat with nobody named is refused in its own words, and nothing moves', async () => {
    const id = await closedRfi();
    renderWithProviders(<Sourcing />, { identity: BUYER });
    await openRfq('RFQ-2026-901');
    expect(screen.getByTestId('rfq-unattributed-note')).toHaveTextContent(
      'Publishing, advancing, concluding, cancelling and awarding are recorded against a person',
    );
    fireEvent.click(screen.getByTestId('rfq-advance'));
    type('rfq-advance-deadline', '2026-11-01');
    fireEvent.click(screen.getByTestId('rfq-advance-yes'));
    await waitFor(() => expect(toast()).toHaveTextContent('Not advanced'));
    expect(toast()).toHaveTextContent('Nothing was recorded. Publishing, advancing, concluding, cancelling or awarding');
    expect(toast()).not.toHaveTextContent('RFQ_ACTOR_UNATTRIBUTED');
    expect(rfqStore.get(id)!.stage).toBe('RFI');
  });
});

describe('3 · conclude without an award', () => {
  it('asks a second time, takes the reason there, and holds the commit while it is blank', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    fireEvent.click(screen.getByTestId('rfq-conclude'));
    const ask = screen.getByTestId('rfq-conclude-ask');
    expect(ask).toHaveTextContent('Conclude RFQ-2026-018 without an award? This cannot be undone.');
    expect(ask).toHaveTextContent('Suppliers are told it ended without an award; they do not read this reason.');
    expect(within(ask).getByTestId('rfq-conclude-yes')).toBeDisabled();
    type('rfq-conclude-reason', '   ');
    expect(within(ask).getByTestId('rfq-conclude-yes')).toBeDisabled();
    // "Keep the event" commits nothing
    fireEvent.click(within(ask).getByTestId('rfq-conclude-no'));
    expect(screen.queryByTestId('rfq-conclude-ask')).not.toBeInTheDocument();
    expect(rfqStore.get('rfq-018')!.status).toBe('Open');
  });

  it('the question says how many quotations are withdrawn', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-003');
    fireEvent.click(screen.getByTestId('rfq-conclude'));
    expect(screen.getByTestId('rfq-conclude-ask')).toHaveTextContent(
      'the 3 quotations on it are withdrawn and their suppliers read that nobody was chosen',
    );
  });

  it('THE COMMIT — Concluded, with the day, the stage and the reason; and no act left on it', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    fireEvent.click(screen.getByTestId('rfq-conclude'));
    type('rfq-conclude-reason', 'Programme postponed to 2027.');
    fireEvent.click(screen.getByTestId('rfq-conclude-yes'));
    await waitFor(() => expect(toast()).toHaveTextContent('RFQ-2026-018 concluded without an award'));
    expect(rfqStore.get('rfq-018')!.status).toBe('Concluded');
    // the panel closed; the row reads Concluded
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(async () => expect(await rowOf('RFQ-2026-018')).toHaveTextContent('Concluded'));
    await openRfq('RFQ-2026-018');
    const summary = screen.getByTestId('rfq-concluded-summary');
    expect(summary).toHaveTextContent('Concluded without an award');
    expect(within(summary).getByTestId('rfq-concluded-reason')).toHaveTextContent('Programme postponed to 2027.');
    expect(summary).toHaveTextContent('RFP');
    expect(screen.getByTestId('rfq-stage-timeline-outcome')).toHaveTextContent(
      'Concluded without an award at the RFP stage',
    );
    for (const gone of ['rfq-conclude', 'rfq-cancel', 'rfq-close', 'rfq-advance', 'rfq-advance-needs-close']) {
      expect(screen.queryByTestId(gone), gone).not.toBeInTheDocument();
    }
  });
});

describe('4 · a draft past its response deadline is not published', () => {
  it('the seeded draft: the publish slot says why, for any seat, and offers no button', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-017');
    expect(screen.getByTestId('rfq-publish-deadline-past')).toHaveTextContent(
      'Cannot be published: the response deadline (23 Aug 2026) has passed. Cancel this draft and raise the event again.',
    );
    expect(screen.queryByRole('button', { name: 'Publish RFQ' })).not.toBeInTheDocument();
    // its one exit is still there
    expect(screen.getByTestId('rfq-cancel')).toBeInTheDocument();
  });

  it('KNOWN-GOOD — a draft inside its deadline offers Publish', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-014');
    expect(screen.queryByTestId('rfq-publish-deadline-past')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish RFQ' })).toBeInTheDocument();
  });

  it('a deadline that passes while the panel stands open — the press is refused in the buyer’s words', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-014');
    // the store moves under an open panel; the page's read is not refreshed
    rfqStore.update('rfq-014', (r) => ({ ...r, responseDeadline: yesterday }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish RFQ' }));
    await waitFor(() => expect(toast()).toHaveTextContent('Publish failed'));
    expect(toast()).toHaveTextContent(
      'Not published. The response deadline of this draft has already passed, so no supplier could answer it.',
    );
    expect(toast()).not.toHaveTextContent('PUBLISH_DEADLINE_PAST');
    expect(rfqStore.get('rfq-014')!.status).toBe('Draft');
  });
});

describe('5 · the wizard: the start stage, and a deadline that has passed', () => {
  const eligible = mockSuppliers
    .filter((s) => s.category === 'Active Ingredient' && s.status === SupplierStatus.ACTIVE)
    .map((s) => s.name);

  /** Fill step 1 and walk to the terms step. */
  const toTerms = async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    fireEvent.click(await screen.findByText('New RFQ'));
    const selects = await screen.findAllByRole('combobox');
    const category = selects.find((el) =>
      Array.from((el as HTMLSelectElement).options).some((o) => o.value === 'Active Ingredients'),
    )!;
    fireEvent.change(category, { target: { value: 'Active Ingredients' } });
    fireEvent.change(screen.getByPlaceholderText(/Q3 2026/), { target: { value: 'RFx-1 wizard probe' } });
    fireEvent.click(await screen.findByText('Sodium Hyaluronate HMW'));
    fireEvent.change(await screen.findByLabelText(/Total quantity/i), { target: { value: '2400' } });
  };
  const next = () => screen.getByRole('button', { name: /^Next$/i }) as HTMLButtonElement;
  const invite = async (name: string) => {
    for (const m of await screen.findAllByText(name)) {
      const tr = m.closest('tr');
      const box = tr?.querySelector('input[type="checkbox"]');
      if (box) return fireEvent.click(box);
    }
    throw new Error(`no candidate row for ${name}`);
  };

  it('population: three eligible suppliers exist for the walk', () => {
    expect(eligible.length).toBeGreaterThanOrEqual(3);
  });

  it('RFQ is preselected; choosing RFI says what an RFI holds in this build', async () => {
    await toTerms();
    expect(screen.getByTestId('rfq-start-stage-RFQ')).toBeChecked();
    expect(screen.queryByTestId('rfq-start-stage-note')).not.toBeInTheDocument();
    // RFx-2 — the questionnaire hint is an RFI matter: absent at RFQ and at RFP.
    expect(screen.queryByTestId('rfq-start-stage-questionnaire-hint')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfq-start-stage-RFP'));
    expect(screen.queryByTestId('rfq-start-stage-questionnaire-hint')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfq-start-stage-RFI'));
    expect(screen.getByTestId('rfq-start-stage-RFI')).toBeChecked();
    // RFx-2 — at RFI a supplier now answers a questionnaire; the note says so
    // and the wizard says where the buyer writes it.
    expect(screen.getByTestId('rfq-start-stage-note')).toHaveTextContent(
      'At the RFI stage a supplier answers the event’s questionnaire — or, when the event asks none, records its interest and a note.',
    );
    expect(screen.getByTestId('rfq-start-stage-questionnaire-hint')).toHaveTextContent(
      'The questionnaire is written on the draft, after this form and before you publish',
    );
  });

  it('a response deadline that has passed is refused on the field, and the step does not advance', async () => {
    await toTerms();
    fireEvent.click(next());
    for (const n of eligible.slice(0, 3)) await invite(n);
    fireEvent.click(next());
    const dates = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(dates.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(dates[0], { target: { value: yesterday } });
    fireEvent.change(dates[1], { target: { value: '2026-10-15' } });
    expect(screen.getByTestId('rfq-deadline-past')).toHaveTextContent(
      'This date has already passed. An event past its response deadline cannot be published.',
    );
    expect(next()).toBeDisabled();
    // known-good: today is still a deadline
    fireEvent.change(dates[0], { target: { value: DECLARED_PRESENT } });
    expect(screen.queryByTestId('rfq-deadline-past')).not.toBeInTheDocument();
    expect(next()).toBeEnabled();
  });

  it('END TO END — an event raised at RFI is minted at RFI, and the review says so', async () => {
    await toTerms();
    fireEvent.click(screen.getByTestId('rfq-start-stage-RFI'));
    fireEvent.click(next());
    for (const n of eligible.slice(0, 3)) await invite(n);
    fireEvent.click(next());
    const dates = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    fireEvent.change(dates[0], { target: { value: '2026-10-01' } });
    fireEvent.change(dates[1], { target: { value: '2026-10-15' } });
    fireEvent.click(next());
    expect(screen.getByText('Start stage').parentElement).toHaveTextContent('RFI');
    fireEvent.click(await screen.findByRole('button', { name: /Save RFQ draft/i }));
    await waitFor(() => expect(rfqStore.all().some((r) => r.title === 'RFx-1 wizard probe')).toBe(true));
    expect(rfqStore.all().find((r) => r.title === 'RFx-1 wizard probe')!.stage).toBe('RFI');
  });
});

describe('6 · the supplier: interest at RFI and RFP', () => {
  it('a supplier that has not answered the stage: the stage, the timeline, the honest limit, and the way in', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-007') });
    const c = await card('RFQ-2026-018');
    expect(within(c).getByText('RFP stage')).toBeInTheDocument();
    expect(within(c).getByTestId('rfq-stage-timeline-rfq-018-RFP')).toHaveAttribute('data-state', 'current');
    expect(within(c).getByTestId('rfq-stage-content-note-rfq-018')).toHaveTextContent(
      // RFx-2 — at RFP the proposal is what is not built; the questionnaire is an RFI matter.
      'At the RFP stage you record your interest and a note, and nothing else. The proposal is not built in this portal yet.',
    );
    expect(within(c).getByTestId('rfq-interest-open-rfq-018')).toHaveTextContent('Record interest');
    // never the quote button: the machine refuses a quotation at this stage
    expect(within(c).queryByRole('button', { name: 'Submit quote' })).not.toBeInTheDocument();
  });

  it('THE ACT — the note is kept, the card reads recorded, and the buyer’s count moves', async () => {
    const first = renderWithProviders(<Rfqs />, { identity: as('sup-007') });
    const c = await card('RFQ-2026-018');
    fireEvent.click(within(c).getByTestId('rfq-interest-open-rfq-018'));
    type('rfq-interest-note-rfq-018', 'Two bottle formats available from stock.');
    fireEvent.click(screen.getByTestId('rfq-interest-yes-rfq-018'));
    await waitFor(() => expect(toast()).toHaveTextContent('Interest recorded on RFQ-2026-018'));
    const mine = stageResponseStore.forRfq('rfq-018').filter((r) => r.supplierId === 'sup-007');
    expect(mine.map((r) => r.stage)).toEqual(['RFI', 'RFP']);
    expect(mine[1].note).toBe('Two bottle formats available from stock.');
    await waitFor(async () =>
      expect(within(await card('RFQ-2026-018')).getByTestId('rfq-interest-recorded-rfq-018')).toHaveTextContent(
        'Interest recorded at RFP on',
      ),
    );
    expect(screen.queryByTestId('rfq-interest-form-rfq-018')).not.toBeInTheDocument();
    first.unmount();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await rowOf('RFQ-2026-018')).toHaveTextContent('2 / 2');
  });

  it('a supplier that has answered reads the record, and is offered nothing to press', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    const c = await card('RFQ-2026-018');
    expect(within(c).getByTestId('rfq-interest-recorded-rfq-018')).toHaveTextContent(
      'Interest recorded at RFP on 27 Aug 2026',
    );
    expect(within(c).queryByTestId('rfq-interest-open-rfq-018')).not.toBeInTheDocument();
  });

  it('an answered event no longer counts as waiting for an answer', async () => {
    // sup-005: rfq-016 awaits a quotation; rfq-018 is answered
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    await card('RFQ-2026-018');
    const tab = screen.getByRole('tab', { name: /Open/ });
    const open = rfqStore
      .all()
      .filter((r) => r.status === 'Open' && r.invitedSupplierIds.includes('sup-005'))
      .filter((r) => !quotationStore.forRfq(r.id).some((q) => q.supplierId === 'sup-005'));
    // population control: the answered RFP is among the events on the list
    expect(open.map((r) => r.id)).toContain('rfq-018');
    expect(tab).toHaveTextContent(String(open.length - 1));
  });

  it('a seat without the commercial lane reads who holds the verb', async () => {
    renderWithProviders(<Rfqs />, { identity: FULFILMENT });
    const c = await card('RFQ-2026-018');
    expect(within(c).getByTestId('handoff-stageresponse-submit')).toBeInTheDocument();
    expect(within(c).queryByTestId('rfq-interest-open-rfq-018')).not.toBeInTheDocument();
  });

  it('bidding closed while the form stands open — the refusal reads in the supplier’s words', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-007') });
    const c = await card('RFQ-2026-018');
    fireEvent.click(within(c).getByTestId('rfq-interest-open-rfq-018'));
    await rfqVerb('t_rfq_close', 'rfq-018');
    fireEvent.click(screen.getByTestId('rfq-interest-yes-rfq-018'));
    await waitFor(() => expect(toast()).toHaveTextContent('Interest not recorded'));
    expect(toast()).toHaveTextContent('This sourcing event is no longer open, so responses are not taken on it.');
    expect(toast()).not.toHaveTextContent('INTEREST_EVENT_NOT_OPEN');
    expect(stageResponseStore.forRfq('rfq-018').filter((r) => r.supplierId === 'sup-007')).toHaveLength(1);
  });
});

describe('7 · the supplier that was not shortlisted', () => {
  it('reads the stage it was left at, the day, and the buyer’s reason — and has nothing to press', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    const c = await screen.findByTestId('rfq-not-shortlisted-rfq-018');
    expect(c).toHaveTextContent('RFQ-2026-018');
    expect(c).toHaveTextContent('Not shortlisted');
    expect(c).toHaveTextContent('You were not carried from RFI to RFP when Paragon advanced this event on 24 Aug 2026');
    expect(within(c).getByTestId('rfq-not-shortlisted-reason-rfq-018')).toHaveTextContent(
      'Reason given by Paragon: Supply would be subcontracted; this programme needs an in-house source.',
    );
    expect(within(c).queryByRole('button')).not.toBeInTheDocument();
    // and it is the ONLY card of that event: the event is not also offered as open
    expect(screen.getAllByText('RFQ-2026-018')).toHaveLength(1);
    expect(screen.queryByTestId('rfq-interest-open-rfq-018')).not.toBeInTheDocument();
    // it names nobody else
    for (const other of ['sup-005', 'sup-007']) expect(c).not.toHaveTextContent(NAME[other]);
  });

  it('KNOWN-GOOD — a supplier that was carried has no such card', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    await card('RFQ-2026-018');
    expect(screen.queryByTestId('rfq-not-shortlisted-rfq-018')).not.toBeInTheDocument();
  });

  it('the dashboard does not count that event as one to respond to', async () => {
    // sup-002 is invited to one Open event it has not answered (rfq-015). It
    // also READS rfq-018, which it was left off — one, not two.
    renderWithProviders(<SupplierRfqToRespondWidget />, { identity: as('sup-002') });
    expect(await screen.findByText(i18n.t('widget.rfqRespond.flag.toRespond', { count: 1 }))).toBeInTheDocument();
    expect(i18n.t('widget.rfqRespond.flag.toRespond', { count: 1 })).not.toBe(
      i18n.t('widget.rfqRespond.flag.toRespond', { count: 2 }),
    );
  });

  it('a live advance: the supplier left out reads the reason the buyer typed', async () => {
    const id = await closedRfi();
    await rfqVerb('t_rfq_advance', id, {
      shortlistSupplierIds: ['sup-005', 'sup-007'],
      shortlistReason: 'Capacity below the volume needed.',
      responseDeadline: '2026-11-01',
    });
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    expect(await screen.findByTestId(`rfq-not-shortlisted-reason-${id}`)).toHaveTextContent(
      'Capacity below the volume needed.',
    );
  });
});

describe('8 · payment terms on the quote form, and a quotation on a concluded event', () => {
  it('the field starts as the buyer’s terms, and what is typed reaches the quotation', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    fireEvent.click(within(await card('RFQ-2026-015')).getByRole('button', { name: 'Submit quote' }));
    const field = await screen.findByTestId('quote-payment-terms');
    expect(field).toHaveValue('Net 30');
    expect(screen.getByTestId('quote-payment-terms-note')).toHaveTextContent('Paragon asked for “Net 30”.');
    fireEvent.change(field, { target: { value: 'Net 45' } });
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '44000' } });
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Quote valid until'), { target: { value: '2026-12-31' } });
    const commits = screen.getAllByRole('button', { name: 'Submit quotation' });
    fireEvent.click(commits[commits.length - 1]);
    await waitFor(() => expect(quotationStore.forRfq('rfq-015')).toHaveLength(1));
    expect(quotationStore.forRfq('rfq-015')[0].paymentTermsOffered).toBe('Net 45');
  });

  it('the seeded events: sample suppliers 1 and 2 each have one they can still quote', async () => {
    for (const [seat, number] of [['sup-002', 'RFQ-2026-015'], ['sup-005', 'RFQ-2026-016']] as const) {
      const view = renderWithProviders(<Rfqs />, { identity: as(seat) });
      const c = await card(number);
      expect(within(c).getByRole('button', { name: 'Submit quote' })).toBeInTheDocument();
      expect(within(c).queryByTestId('rfq-deadline-passed')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('a quotation withdrawn by a conclude reads "No Award" in the supplier’s history, not "Event Cancelled"', async () => {
    expect((await rfqVerb('t_rfq_conclude', 'rfq-011', { concludeReason: 'One offer only.' })).status).toBe('done');
    expect((await rfqVerb('t_rfq_cancel', 'rfq-009')).status).toBe('done');
    renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    fireEvent.click(await screen.findByRole('tab', { name: /Awards/ }));
    const concluded = (await screen.findByText('RFQ-2026-011')).closest('tr')!;
    expect(concluded).toHaveTextContent('No Award');
    expect(concluded).not.toHaveTextContent('Event Cancelled');
    // known-good control: a cancelled event still reads Event Cancelled
    expect(screen.getByText('RFQ-2026-009').closest('tr')!).toHaveTextContent('Event Cancelled');
  });
});

describe('ID — the same surfaces in Indonesian', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('id');
  });

  it('the buyer’s panel: timeline, responses, the advance slot', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(within(await rowOf('RFQ-2026-018')).getByTestId('rfq-row-stage-rfq-018')).toHaveTextContent('Tahap RFP');
    await openRfq('RFQ-2026-018');
    expect(screen.getByTestId('rfq-stage-timeline-RFI')).toHaveTextContent('Permintaan informasi');
    expect(screen.getByTestId('rfq-stage-timeline-RFI')).toHaveTextContent('Dilanjutkan pada 24 Agu 2026');
    expect(screen.getByTestId('rfq-stage-timeline-RFP')).toHaveTextContent('Tahap saat ini');
    expect(screen.getByTestId('rfq-stage-advance-RFI')).toHaveTextContent('Tidak dilanjutkan:');
    expect(screen.getByTestId('rfq-stage-content-note')).toHaveTextContent(
      'Pada tahap RFI, pemasok menjawab kuesioner acaranya — atau, bila acaranya tidak mengajukan kuesioner, mencatat minatnya dan satu catatan. Pada tahap RFP ia mencatat minatnya dan satu catatan; proposal dan penilaiannya belum dibangun.',
    );
    expect(screen.getByTestId('rfq-stage-response-count')).toHaveTextContent(
      '1 dari 2 pemasok yang diundang telah menanggapi pada tahap RFP',
    );
    expect(screen.getByTestId('rfq-advance-needs-close')).toHaveTextContent('Tutup penawaran untuk melanjutkan ke RFQ');
  });

  it('the shortlist form and its commit', async () => {
    const id = await closedRfi();
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-901');
    expect(screen.getByTestId('rfq-advance')).toHaveTextContent('Lanjutkan ke RFP');
    fireEvent.click(screen.getByTestId('rfq-advance'));
    expect(screen.getByTestId('rfq-advance-blocked')).toHaveTextContent('Tetapkan tenggat tanggapan tahap berikutnya.');
    fireEvent.click(screen.getByTestId('rfq-advance-pick-sup-002'));
    expect(screen.getByTestId('rfq-advance-blocked')).toHaveTextContent('Sebutkan alasan untuk pemasok yang tidak dilanjutkan.');
    type('rfq-advance-reason', 'Kapasitas di bawah volume.');
    type('rfq-advance-deadline', '2026-11-01');
    expect(screen.getByTestId('rfq-advance-yes')).toHaveTextContent('Lanjutkan ke RFP dengan 2 pemasok');
    fireEvent.click(screen.getByTestId('rfq-advance-yes'));
    await waitFor(() => expect(toast()).toHaveTextContent('RFQ-2026-901 kini pada tahap RFP'));
    expect(toast()).toHaveTextContent('2 pemasok diundang ke tahap berikutnya.');
    expect(rfqStore.get(id)!.stage).toBe('RFP');
  });

  it('conclude, and the concluded event', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-018');
    expect(screen.getByTestId('rfq-conclude')).toHaveTextContent('Akhiri tanpa pemenang');
    fireEvent.click(screen.getByTestId('rfq-conclude'));
    expect(screen.getByTestId('rfq-conclude-ask')).toHaveTextContent('Akhiri RFQ-2026-018 tanpa pemenang? Ini tidak dapat diurungkan.');
    type('rfq-conclude-reason', 'Program ditunda ke 2027.');
    fireEvent.click(screen.getByTestId('rfq-conclude-yes'));
    await waitFor(() => expect(toast()).toHaveTextContent('RFQ-2026-018 diakhiri tanpa pemenang'));
    await waitFor(async () => expect(await rowOf('RFQ-2026-018')).toHaveTextContent('Diakhiri'));
    await openRfq('RFQ-2026-018');
    expect(screen.getByTestId('rfq-concluded-summary')).toHaveTextContent('Diakhiri tanpa pemenang');
    expect(screen.getByTestId('rfq-stage-timeline-outcome')).toHaveTextContent('Diakhiri tanpa pemenang pada tahap RFP');
  });

  it('the draft past its deadline', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-017');
    expect(screen.getByTestId('rfq-publish-deadline-past')).toHaveTextContent(
      'Tidak dapat diterbitkan: tenggat tanggapan (23 Agu 2026) sudah lewat. Batalkan draf ini dan buat acaranya lagi.',
    );
  });

  it('the supplier: record interest, recorded, not shortlisted', async () => {
    const first = renderWithProviders(<Rfqs />, { identity: as('sup-007') });
    const c = await card('RFQ-2026-018');
    expect(within(c).getByText('Tahap RFP')).toBeInTheDocument();
    expect(within(c).getByTestId('rfq-stage-content-note-rfq-018')).toHaveTextContent(
      'Pada tahap RFP Anda hanya mencatat minat dan satu catatan. Proposal belum dibangun di portal ini.',
    );
    expect(within(c).getByTestId('rfq-interest-open-rfq-018')).toHaveTextContent('Catat minat');
    first.unmount();
    const second = renderWithProviders(<Rfqs />, { identity: as('sup-005') });
    expect(within(await card('RFQ-2026-018')).getByTestId('rfq-interest-recorded-rfq-018')).toHaveTextContent(
      'Minat tercatat pada RFP tanggal 27 Agu 2026',
    );
    second.unmount();
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    const left = await screen.findByTestId('rfq-not-shortlisted-rfq-018');
    expect(left).toHaveTextContent('Tidak masuk daftar pendek');
    expect(left).toHaveTextContent('Anda tidak dilanjutkan dari RFI ke RFP ketika Paragon melanjutkan acara ini pada 24 Agu 2026');
    expect(left).toHaveTextContent('Alasan dari Paragon:');
  });

  it('the payment-terms field', async () => {
    renderWithProviders(<Rfqs />, { identity: as('sup-002') });
    fireEvent.click(within(await card('RFQ-2026-015')).getByRole('button', { name: 'Kirim penawaran' }));
    expect(await screen.findByTestId('quote-payment-terms')).toHaveValue('Net 30');
    expect(screen.getByTestId('quote-payment-terms-note')).toHaveTextContent('Paragon meminta “Net 30”.');
    expect(screen.getByLabelText('Syarat pembayaran yang ditawarkan')).toBeInTheDocument();
  });
});
