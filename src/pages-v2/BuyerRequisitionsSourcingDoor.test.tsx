import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import i18n from '../lib/i18n';
import BuyerRequisitions from './BuyerRequisitions';

// ────────────────────────────────────────────────────────────────────────────
// C.3 — THE PR-SIDE DOOR, GUARDED BOTH WAYS.
//
// ⚠️ **THE ATOM IS `rfq:create`, NOT `pr:source`, AND GETTING THAT WRONG WOULD
// HAVE LOOKED LIKE A WORKING GUARD.** `pr:source` is held by NO seat — it is an
// automation atom — so gating on it would withhold the control from every seat
// in the system and name an owner nobody can be. The "WITHHELD" test below
// would still have passed. Only the HELD test discriminates, which is why both
// directions are asserted and why the held one is not a formality.
// ────────────────────────────────────────────────────────────────────────────

const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };

/** Open the panel on the one shipped fixture that is Approved. */
const openApproved = async () => {
  const row = await screen.findByText('PR-2026-00342');
  fireEvent.click(row);
  return screen.findByTestId('pr-approved-terminal');
};

describe('C.3 — raising a sourcing event is guarded on rfq:create', () => {
  it('HELD: a procurement seat gets the control and NO handoff notice', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openApproved();
    expect(screen.getByTestId('pr-raise-sourcing')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-pr-sourcing')).not.toBeInTheDocument();
  });

  it('WITHHELD: a requisitioner seat gets NO control and reads WHOSE act it is', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await openApproved();
    expect(screen.queryByTestId('pr-raise-sourcing')).not.toBeInTheDocument();
    const notice = screen.getByTestId('handoff-pr-sourcing');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    // Named, not merely absent — and the owner is the lane that holds
    // `rfq:create`, which is procurement.
    expect(notice).toHaveTextContent('Awaiting Procurement');
  });

  it('the full buyer seat keeps the control — the demo path is unchanged', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: BUYER });
    await openApproved();
    expect(screen.getByTestId('pr-raise-sourcing')).toBeInTheDocument();
  });

  it('⚠️ ID FROM BIRTH — the withheld line reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
      await screen.findByText('PR-2026-00342');
      fireEvent.click(screen.getByText('PR-2026-00342'));
      const notice = await screen.findByTestId('handoff-pr-sourcing');
      expect(notice).toHaveTextContent('Menunggu');
      expect(notice).not.toHaveTextContent('Awaiting');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('C.3 — the account beside the control is true', () => {
  it('⚠️ the panel no longer claims nothing advances an approved requisition', async () => {
    // The string this replaced said "no producer is wired for either yet".
    // C.2 wired one. A test that only checked the new copy existed would not
    // notice the old claim surviving somewhere, so the retired sentence is
    // asserted ABSENT by its own words.
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    const section = await openApproved();
    expect(section).not.toHaveTextContent('no producer is wired');
    expect(section).not.toHaveTextContent('this is where it stops today');
    // …and what IS still unwired is named, rather than the section going silent
    // about the half that has not shipped.
    expect(section).toHaveTextContent('raised in S/4');
  });
});
