import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import i18n from '../lib/i18n';
import BuyerRequisitions from './BuyerRequisitions';

// ────────────────────────────────────────────────────────────────────────────
// THE CREATE AFFORDANCE THIS PAGE WAS MISSING.
//
// §67/§68 guarded four verbs — submit / revise / approve / reject — every one
// of which acts on a document ALREADY SELECTED. `t_pr_create` makes the
// document, sits in the page header, and was never guarded. So a procurement
// seat, which holds no `pr:create`, saw a live "New PR" button, filled three
// wizard steps, and was refused at the dispatcher with nothing on screen
// naming the requester.
//
// ⚠️ **A PAGE CAN BE COVERED FOR EVERY VERB IT HAS A ROW FOR AND STILL SHIP A
// FALSE AFFORDANCE IN ITS HEADER.** The coverage census counted importers of
// `HandoffNotice`; this page was among them and was still wrong. Importer
// presence is not verb coverage, and that is the reading the next sweep needs.
// ────────────────────────────────────────────────────────────────────────────

const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };

describe('BuyerRequisitions — the create verb is guarded, both directions', () => {
  it('HELD: a requisitioner seat gets the New PR button and NO handoff notice', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await screen.findByText('PR-2026-00341');
    expect(screen.getByRole('button', { name: 'New PR' })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-pr-create')).not.toBeInTheDocument();
  });

  it('WITHHELD: a procurement seat gets NO button and reads WHOSE act it is', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText('PR-2026-00341');
    // The false affordance is gone…
    expect(screen.queryByRole('button', { name: 'New PR' })).not.toBeInTheDocument();
    // …and its removal does not read as a gap.
    const notice = screen.getByTestId('handoff-pr-create');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(notice).toHaveTextContent('Awaiting Requisitioner');
  });

  it('the full buyer seat is unchanged — every existing demo path still works', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: BUYER });
    await screen.findByText('PR-2026-00341');
    expect(screen.getByRole('button', { name: 'New PR' })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-pr-create')).not.toBeInTheDocument();
  });

  it('⚠️ ID FROM BIRTH — the withheld line reads in Indonesian, not in English', async () => {
    // The owner label and the "Awaiting" frame are two separate keys, and a
    // half-translated line ("Menunggu Requisitioner") would pass any assertion
    // that only checked the frame. Both halves are asserted.
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
      await screen.findByText('PR-2026-00341');
      expect(screen.getByTestId('handoff-pr-create')).toHaveTextContent('Menunggu Pemohon');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('the READS beside it are never gated — Export survives a withheld seat', async () => {
    // Gating a read on a verb the seat does not hold would invent an authority
    // the machine never asserted. Export holds no atom; it stays.
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText('PR-2026-00341');
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
  });
});
