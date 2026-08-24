import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import i18n from '../lib/i18n';
import { rolesHolding, SYSTEM_ROLES } from '../services/transitions/businessRoles';
import BuyerSourcing from './BuyerSourcing';

// ────────────────────────────────────────────────────────────────────────────
// §76 — THE DRAWER, PER VERB. The RFQ side panel is a WORKSPACE, not a
// control: four separable acts on the selected RFQ (publish | reopen · cancel ·
// move-to-review · award), four dispatches, four confirmations. §74 collapsed
// them into two GROUP notices; this suite pins the split back apart, one notice
// per act, in the act's own slot.
//
// ⚠️ **EVERY CASE IS BILATERAL, AND THE HELD SEAT IS THE HALF THAT MATTERS.**
// A guard that removes a control ALWAYS is not a guard, it is a deletion — and
// it passes every withheld-side assertion. So each act asserts the holding seat
// KEEPS its control and reads NO notice, before the withheld seat is believed.
//
// ⚠️ **AND THE OLD GROUP IDS ARE PINNED ABSENT.** Without that, re-collapsing
// the notices tomorrow would keep this suite green: every per-verb assertion
// below is about what a withheld seat READS, and a group notice reads the same
// string. The absence of `handoff-rfq-actions` / `handoff-rfq-drawer` is what
// makes the split itself the thing under test.
// ────────────────────────────────────────────────────────────────────────────

const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

// Fixtures chosen BY THE FROM-STATE OF THE VERB UNDER TEST, never by being
// first in the list (§75f — `footerForStatus` taught this one lane over: a
// state-switched surface's first row samples one arm, not the surface).
const DRAFT_RFQ = 'RFQ-2026-008'; //  the only Draft — publish's from-state
const CLOSED_RFQ = 'RFQ-2026-004'; // Closed — reopen's from-state
const OPEN_RFQ = 'RFQ-2026-001'; //   Open — cancel is legal, publish/reopen are not
const REVIEW_RFQ = 'RFQ-2026-011'; //  Open, and its qt-011a is the tree's ONE
//                                      `Submitted` quotation — the only place
//                                      move-to-review is reachable at all.
const AWARD_RFQ = 'RFQ-2026-009'; //   Open + ALL invited suppliers responded —
//                                      the award slot's own condition.
//
// ⚠️ **AND THEY ARE TWO FIXTURES BECAUSE THE TREE HAS NO ONE FIXTURE.** The
// award slot needs `Open && isAllResponded && quotes>0` (RFQ-2026-003 / -009 /
// -012 / -013); move-to-review needs a `Submitted` quotation (RFQ-2026-011
// alone, and it is 1-of-2 responded, so it never shows the award slot).
// **`quotation:review` and `rfq:award` are not co-reachable on any RFQ in this
// tree** — measured, not assumed, and it is the sharpest argument against the
// `handoff-rfq-drawer` group this batch retires: that notice took its
// availability from `review` and rendered in the AWARD slot, so on every
// awardable RFQ it named the owner of an act that was not on the screen.

const openRfq = async (rfqNumber: string) => {
  fireEvent.click(await screen.findByText(rfqNumber));
};

describe('§76 · the drawer — publish (Draft only)', () => {
  it('HELD: a procurement seat keeps Publish RFQ and reads no notice', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    await openRfq(DRAFT_RFQ);
    expect(await screen.findByRole('button', { name: /Publish RFQ/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-publish')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat reads the owner where Publish RFQ was', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(DRAFT_RFQ);
    expect(await screen.findByTestId('handoff-rfq-publish')).toHaveTextContent(
      'Awaiting Procurement',
    );
    expect(screen.queryByRole('button', { name: /Publish RFQ/i })).not.toBeInTheDocument();
  });

  it('and the publish notice does NOT appear on an Open RFQ — the act is not there', async () => {
    // A notice outside the verb's from-state would advertise a wait for an act
    // the machine would refuse anyway. Cancel's notice IS there, which is what
    // makes this an assertion about placement rather than about rendering.
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(OPEN_RFQ);
    expect(await screen.findByTestId('handoff-rfq-cancel')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-publish')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-reopen')).not.toBeInTheDocument();
  });
});

describe('§76 · the drawer — reopen (Closed only)', () => {
  it('HELD: a procurement seat keeps Reopen RFQ and reads no notice', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    await openRfq(CLOSED_RFQ);
    expect(await screen.findByRole('button', { name: /Reopen RFQ/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-reopen')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat reads reopen AND cancel as TWO separate acts', async () => {
    // The §74 grouping rendered ONE line here for two verbs with different
    // from-states. This is the observable delta of the split.
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(CLOSED_RFQ);
    expect(await screen.findByTestId('handoff-rfq-reopen')).toHaveTextContent(
      'Awaiting Procurement',
    );
    expect(screen.getByTestId('handoff-rfq-cancel')).toHaveTextContent('Awaiting Procurement');
    expect(screen.queryByRole('button', { name: /Reopen RFQ/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel RFQ/i })).not.toBeInTheDocument();
  });
});

describe('§76 · the drawer — cancel', () => {
  it('HELD: a procurement seat keeps Cancel RFQ and reads no notice', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    await openRfq(OPEN_RFQ);
    expect(await screen.findByRole('button', { name: /Cancel RFQ/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-cancel')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat reads the owner where Cancel RFQ was', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(OPEN_RFQ);
    expect(await screen.findByTestId('handoff-rfq-cancel')).toHaveTextContent(
      'Awaiting Procurement',
    );
    expect(screen.queryByRole('button', { name: /Cancel RFQ/i })).not.toBeInTheDocument();
  });
});

describe('§76 · the drawer — move to review (PER QUOTE)', () => {
  it('HELD: a procurement seat keeps the move on the Submitted quote', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    await openRfq(REVIEW_RFQ);
    expect(await screen.findByRole('button', { name: /Move to review/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-review')).not.toBeInTheDocument();
  });

  it('WITHHELD: the owner is read in the QUOTE CELL, once per Submitted quote', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(REVIEW_RFQ);
    const notices = await screen.findAllByTestId('handoff-rfq-review');
    // ⚠️ THE COUNT IS DERIVED FROM THE HELD SEAT, NOT HARDCODED. A literal `1`
    // here would pass over a fixture change that removed the Submitted quote,
    // and over a notice rendered for every quote regardless of status.
    expect(notices).toHaveLength(submittedQuoteCount());
    expect(notices[0]).toHaveTextContent('Awaiting Procurement');
    expect(screen.queryByRole('button', { name: /Move to review/i })).not.toBeInTheDocument();
  });
});

describe('§76 · the drawer — award', () => {
  it('HELD: a procurement seat keeps Award to selected and reads no notice', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    await openRfq(AWARD_RFQ);
    expect(await screen.findByRole('button', { name: /Award to selected/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-award')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat reads the owner where the award button was', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(AWARD_RFQ);
    expect(await screen.findByTestId('handoff-rfq-award')).toHaveTextContent(
      'Awaiting Procurement',
    );
    expect(screen.queryByRole('button', { name: /Award to selected/i })).not.toBeInTheDocument();
  });
});

describe('§76 · the grouping is GONE, and cannot come back quietly', () => {
  it('neither group notice renders on any of the drawer states', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    for (const rfq of [OPEN_RFQ, CLOSED_RFQ, DRAFT_RFQ, AWARD_RFQ]) {
      await openRfq(rfq);
      expect(screen.queryByTestId('handoff-rfq-actions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('handoff-rfq-drawer')).not.toBeInTheDocument();
    }
  });

  it('review and award answer SEPARATELY, on the two RFQs where each is reachable', async () => {
    // The pair §74 collapsed into `handoff-rfq-drawer`. They are asserted on
    // DIFFERENT documents because the tree affords them on different documents
    // — which is the finding, not a workaround: one notice could never have
    // been right for both.
    const { unmount } = renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(REVIEW_RFQ);
    expect(await screen.findByTestId('handoff-rfq-review')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-award')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(AWARD_RFQ);
    expect(await screen.findByTestId('handoff-rfq-award')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-review')).not.toBeInTheDocument();
  });
});

describe('§76 · ID from birth', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('the drawer notices render in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await openRfq(CLOSED_RFQ);
    expect(await screen.findByTestId('handoff-rfq-cancel')).toHaveTextContent(
      'Menunggu Pengadaan',
    );
    expect(screen.getByTestId('handoff-rfq-reopen')).toHaveTextContent('Menunggu Pengadaan');
  });
});

describe('§76 · why a PARTIALLY-held seat cannot be demonstrated today', () => {
  // ⚠️ THE OPERATOR'S CASE — "a partially-held seat sees what it can do and who
  // owns the rest" — IS NOT CONSTRUCTIBLE ON THIS SURFACE, and saying so is the
  // honest half of shipping the split. A seat holds ROLES, not atoms, and all
  // five drawer atoms sit in `procurement` and nowhere else, so every seat
  // holds all five or none. What the split buys today is that each line sits in
  // its own act's slot; what it buys tomorrow is that a bundle split needs no
  // re-grouping. This test is the tripwire on "today": the day one of these
  // atoms moves, it goes red and the partial case becomes writable.
  const DRAWER_ATOMS = [
    'rfq:publish',
    'rfq:reopen',
    'rfq:cancel',
    'rfq:award',
    'quotation:review',
  ] as const;

  it('every drawer atom is held by procurement and by nothing else', () => {
    for (const atom of DRAWER_ATOMS) {
      expect(rolesHolding(atom)).toEqual(['procurement']);
    }
  });

  it('⚠️ CONTROL — a known-DIFFERENT atom does NOT report procurement', () => {
    // Without this the pin above would pass over a `rolesHolding` that returned
    // ['procurement'] for every input (§39 — probe the guard both ways).
    expect(rolesHolding('gr:post')).toEqual(['receiving']);
    expect(rolesHolding('pr:create')).toEqual(['requisitioner']);
  });

  it('and no other assignable role holds one of them — the seat is all-or-none', () => {
    const others = (Object.keys(SYSTEM_ROLES) as (keyof typeof SYSTEM_ROLES)[]).filter(
      (r) => r !== 'procurement' && r !== 'admin',
    );
    for (const role of others) {
      for (const atom of DRAWER_ATOMS) {
        expect(SYSTEM_ROLES[role]).not.toContain(atom);
      }
    }
  });
});

/**
 * The number of quotations the drawer renders a `Submitted` status pill for,
 * read from the SAME render rather than restated as a literal — the guard
 * swaps the move-to-review control and does not touch the status pill, so this
 * counts the acts that exist and the assertion compares against the tree
 * instead of against a number in this file (§27).
 */
function submittedQuoteCount(): number {
  return screen.getAllByText('Submitted').length;
}
