import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import i18n from '../lib/i18n';
import { rolesHolding } from '../services/transitions/businessRoles';
import BuyerChannelTriage from './BuyerChannelTriage';
import BuyerCollaboration from './BuyerCollaboration';
import BuyerSourcing from './BuyerSourcing';
import IntakeReview from './IntakeReview';

// ────────────────────────────────────────────────────────────────────────────
// §74 — THE ROW-LEVEL GROUP. Nine verbs across five surfaces, same hook, same
// pattern, no widening.
//
// ⚠️ **EVERY CASE IS BILATERAL, AND THE HELD SEAT IS THE HALF THAT MATTERS.**
// A guard that removes an affordance ALWAYS is not a guard, it is a deletion —
// and it passes every withheld-side assertion. So each surface asserts the
// holding seat keeps its control and gets NO notice, before the withheld seat
// is believed.
// ────────────────────────────────────────────────────────────────────────────

const PLANNING: CurrentIdentity = { ...BUYER, businessRoles: ['planning'] };
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };
const FINANCE: CurrentIdentity = { ...BUYER, businessRoles: ['finance'] };
const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

// ⚠️ THE CONFIRM CONTROL IS NOT ON THE PAGE UNTIL A MESSAGE IS PARSED, SO A
// BARE "it is absent" ASSERTION PASSES FOR EVERY SEAT AND PROVES NOTHING. The
// first cut of this pair did exactly that and went green; it was caught by
// asking whether the HOLDING seat could reach the control at all (it could not,
// without the interaction). Both cases now drive the parse first.
async function reachConfirmStage() {
  const select = screen.getByTestId('triage-supplier') as HTMLSelectElement;
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(select, { target: { value: 'sup-007' } });
  fireEvent.change(screen.getByTestId('triage-message'), {
    target: { value: 'STOK PK-PETB-8810 2400 KG' },
  });
  fireEvent.click(screen.getByTestId('triage-parse'));
  const mat = (await screen.findByTestId('triage-mat-0')) as HTMLSelectElement;
  await waitFor(() => expect(within(mat).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(mat, { target: { value: 'PK-PETB-8810' } });
}

describe('§74 · BuyerChannelTriage — inventorydeclaration:record', () => {
  it('HELD: a planning seat reaches the confirm control, and gets NO notice', async () => {
    renderWithProviders(<BuyerChannelTriage />, { identity: PLANNING });
    await screen.findAllByText(/Triage/i);
    await reachConfirmStage();
    expect(screen.getByTestId('triage-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-triage-record')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reaches the same stage and reads the owner instead', async () => {
    renderWithProviders(<BuyerChannelTriage />, { identity: FINANCE });
    await screen.findAllByText(/Triage/i);
    await reachConfirmStage();
    expect(screen.queryByTestId('triage-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-triage-record')).toHaveTextContent('Awaiting Planning');
  });
});

describe('§74 · BuyerCollaboration — requirementresponse:dispute', () => {
  it('HELD: a planning seat KEEPS the resolve CTA and sees no handoff', async () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration', identity: PLANNING });
    await screen.findAllByText(/Supplier Collaboration/i);
    // The positive half: without it, deleting the CTA outright would pass the
    // withheld case below and this one too.
    expect(await screen.findAllByTestId('sdc-resolve-cta')).not.toHaveLength(0);
    expect(screen.queryByTestId('handoff-sdc-resolve')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reads the owner ONCE and gets no resolve CTA', async () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration', identity: FINANCE });
    await screen.findAllByText(/Supplier Collaboration/i);
    // ⚠️ WAIT FOR THE DISPUTES SECTION TO BE POPULATED BEFORE ASSERTING AN
    // ABSENCE IN IT. The notice renders synchronously and the ROWS do not, so
    // the first cut checked "no CTA" over an empty list and passed for the
    // wrong reason — the mutation probe is what exposed it: turning the guard
    // always-on did NOT kill this case, which is the signature of an assertion
    // that was never looking at anything.
    const section = screen.getByTestId('sdc-disputes');
    await waitFor(() =>
      expect(within(section).getAllByRole('listitem').length).toBeGreaterThan(0),
    );
    const notices = screen.getAllByTestId('handoff-sdc-resolve');
    // ONE notice for the section, never one per dispute row — the atom does not
    // vary by row and a repeated owner down a list is noise, not help.
    expect(notices).toHaveLength(1);
    expect(notices[0]).toHaveTextContent('Awaiting Planning');
    expect(screen.queryAllByTestId('sdc-resolve-cta')).toHaveLength(0);
  });
});

describe('§74 · IntakeReview — pr:create, one notice for an unbounded table', () => {
  it('HELD: a requisitioner seat gets accept controls and no notice', async () => {
    renderWithProviders(<IntakeReview />, { identity: REQUISITIONER });
    // Wait for the ROWS, not the heading — the heading renders before the read
    // resolves, and querying then finds an empty table and calls it a result.
    const accepts = await screen.findAllByRole('button', { name: /Accept as suggested/i });
    expect(accepts.length).toBeGreaterThan(0);
    expect(screen.queryByTestId('handoff-intake-accept')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reads the owner ONCE, keeps Dismiss, loses Accept', async () => {
    renderWithProviders(<IntakeReview />, { identity: FINANCE });
    const dismisses = await screen.findAllByRole('button', { name: /Dismiss/i });
    // Dismiss is local view state holding no atom — gating it would invent an
    // authority the machine never asserted.
    expect(dismisses.length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: /Accept as suggested/i })).toHaveLength(0);
    const notice = screen.getByTestId('handoff-intake-accept');
    expect(notice).toHaveTextContent('Awaiting Requisitioner');
  });
});

describe('§74 · ID from birth, across the group', () => {
  it('the owner renders in Indonesian with no English frame left behind', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<IntakeReview />, { identity: FINANCE });
      await screen.findAllByRole('button', { name: /Abaikan/i });
      expect(screen.getByTestId('handoff-intake-accept')).toHaveTextContent('Menunggu Pemohon');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('§74 · the grouping premise, pinned', () => {
  it('⚠️ the six sourcing verbs share ONE owner today — the pin that says when they stop', () => {
    // BuyerSourcing groups publish/reopen/cancel into one notice and
    // review/award into another, on the ground that a withheld seat would read
    // the identical string at each site. That grouping is honest only while the
    // atoms agree. Each BUTTON is gated on its own atom, so a split leaves the
    // buttons correct — but the GROUPING would need re-taking, and this is what
    // says so.
    const sourcingVerbs = [
      'rfq:publish',
      'rfq:reopen',
      'rfq:cancel',
      'rfq:award',
      'quotation:review',
      'rfq:fx-pin',
    ] as const;
    const owners = sourcingVerbs.map((a) => rolesHolding(a).join(','));
    expect(owners).toEqual(Array(sourcingVerbs.length).fill('procurement'));
  });

  it('and the two planning verbs likewise', () => {
    expect(rolesHolding('inventorydeclaration:record')).toEqual(['planning']);
    expect(rolesHolding('requirementresponse:dispute')).toEqual(['planning']);
  });

  it('⚠️ CONTROL — a known-DIFFERENT atom does NOT report procurement', () => {
    // Without this the pins above would pass over a `rolesHolding` that
    // returned 'procurement' for everything.
    expect(rolesHolding('pr:create')).toEqual(['requisitioner']);
    expect(rolesHolding('gr:post')).toEqual(['receiving']);
  });
});

describe('§74 · BuyerSourcing — the six non-create verbs, grouped', () => {
  it('HELD: a procurement seat keeps the RFQ detail actions, no group notice', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText('RFQ-2026-001'));
    expect(await screen.findByRole('button', { name: /Cancel RFQ/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-actions')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat loses them and reads ONE owner for the group', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    fireEvent.click(await screen.findByText('RFQ-2026-001'));
    const notice = await screen.findByTestId('handoff-rfq-actions');
    expect(notice).toHaveTextContent('Awaiting Procurement');
    expect(screen.queryByRole('button', { name: /Cancel RFQ/i })).not.toBeInTheDocument();
    // ONE notice for the adjacent group, not one per verb — publish/reopen are
    // state-exclusive with cancel and all three name the same owner.
    expect(screen.getAllByTestId('handoff-rfq-actions')).toHaveLength(1);
  });
});
