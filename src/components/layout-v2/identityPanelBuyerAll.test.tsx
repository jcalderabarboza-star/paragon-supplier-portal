import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { NO_PERSON } from '../../context/noPerson';
import {
  SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  PERSONA_SYSTEM_ROLES,
} from '../../services/transitions/businessRoles';
import i18n from '../../lib/i18n';
import IdentityPanel from './IdentityPanel';

// ─────────────────────────────────────────────────────────────────────────────
// THE PANEL OFFERS THE MANAGER'S SEAT — AND SAYS WHAT IT DOES, WITHOUT DECIDING
// WHAT A PERSON SHOULD HOLD.
//
// ⚠️ **THIS FILE EXISTS BECAUSE A PREMISE ABOUT THIS PANEL INVERTED, AND BOTH
// THE OPERATOR AND THIS SEAT STATED THE WRONG VERSION.** The claim: a seat of
// `['buyer_all']` ALONE is UNREACHABLE, because removing the six lanes leaves
// the last role un-removable and `buyer_all` un-addable in the same gesture.
//
// Measured from `toggleRole`: an ADD can never be blocked — `next.length` is at
// least one by construction — and a REMOVE is blocked only at `held.length === 1`.
// **So ADD-then-remove reaches it and only REMOVE-first stalls. The set is
// reachable; the ORDER is what constrains.** Both orders are walked below,
// because asserting only the reachable one would prove nothing about the claim
// and asserting only the stalling one would reproduce the error.
// ─────────────────────────────────────────────────────────────────────────────

const seat = (roles: readonly string[]): CurrentIdentity => ({
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: roles,
  actor: NO_PERSON,
});

const BUYER_SEEDED = seat(SEEDED_SEAT_ROLES.buyer);

const openRoles = async () => {
  fireEvent.click(await screen.findByTestId('identity-avatar'));
  const panel = await screen.findByTestId('identity-panel');
  fireEvent.click(within(panel).getByTestId('identity-roles-trigger'));
  await screen.findByTestId('identity-roles-list');
  return panel;
};

describe('POPULATION GUARD', () => {
  it('the seeded seat holds the lanes and NOT the manager role', async () => {
    // If this drifts, every "it appeared" assertion below is measuring a seat
    // that already held it.
    expect(BUYER_SEEDED.businessRoles).not.toContain('buyer_all');
    expect(BUYER_SEEDED.businessRoles.length).toBeGreaterThan(1);
    renderWithProviders(<IdentityPanel />, { identity: BUYER_SEEDED });
    const panel = await openRoles();
    expect(within(panel).getByTestId('identity-role-procurement')).toBeInTheDocument();
  });
});

describe('⚠️ THE PANEL OFFERS IT — holdable, and unheld until somebody clicks', () => {
  it('renders a toggle for `buyer_all`, unchecked on the seeded seat', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER_SEEDED });
    const panel = await openRoles();
    const toggle = within(panel).getByTestId('identity-role-buyer_all');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('offers exactly what the persona may hold — no more, no fewer', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER_SEEDED });
    const panel = await openRoles();
    const list = within(panel).getByTestId('identity-roles-list');
    const offered = within(list)
      .getAllByRole('menuitemcheckbox')
      .map((b) => b.getAttribute('data-testid')!.replace('identity-role-', ''));
    expect([...offered].sort()).toEqual([...PERSONA_SYSTEM_ROLES.buyer].sort());
    // …and `admin` is NOT among them — it is not on a side.
    expect(offered).not.toContain('admin');
  });

  it.each(['en', 'id'])('%s reads the role by name, not by key', async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<IdentityPanel />, { identity: BUYER_SEEDED });
    const panel = await openRoles();
    const label = within(panel).getByTestId('identity-role-buyer_all').textContent ?? '';
    expect(label).not.toMatch(/roles\.owner/); // an unresolved key would render raw
    expect(label.trim()).toBe(i18n.t('roles.owner.buyer_all'));
    await i18n.changeLanguage('en');
  });
});

describe('⚠️ THE ORDER IS WHAT CONSTRAINS — both directions walked', () => {
  /** Which roles the OPEN panel currently shows as held. The provider holds the
   *  state, so the DOM is the instrument — no callback, no rerender. */
  const heldNow = (panel: HTMLElement) =>
    within(panel)
      .getAllByRole('menuitemcheckbox')
      .filter((b) => b.getAttribute('aria-checked') === 'true')
      .map((b) => b.getAttribute('data-testid')!.replace('identity-role-', ''));

  it('ADD-then-remove REACHES `[buyer_all]` alone', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER_SEEDED });
    const panel = await openRoles();

    fireEvent.click(within(panel).getByTestId('identity-role-buyer_all'));
    expect(heldNow(panel)).toContain('buyer_all');

    for (const lane of SEEDED_SEAT_ROLES.buyer) {
      fireEvent.click(within(panel).getByTestId(`identity-role-${lane}`));
    }
    expect(heldNow(panel)).toEqual(['buyer_all']);
  });

  it('⚠️ REMOVE-FIRST STALLS AT ONE — the guard the inverted premise saw', async () => {
    // Down to a single lane, that lane cannot be removed: the seat would be
    // empty, which reads as a broken portal rather than a narrow one. The real
    // constraint is about COUNT, and it is not about `buyer_all` at all.
    renderWithProviders(<IdentityPanel />, { identity: seat(['procurement']) });
    const panel = await openRoles();
    fireEvent.click(within(panel).getByTestId('identity-role-procurement'));
    expect(heldNow(panel)).toEqual(['procurement']); // refused
    // …and the panel SAYS so, rather than leaving the click unexplained.
    expect(within(panel).getByTestId('identity-roles-last')).toBeInTheDocument();
  });

  it('and from that stall, ADDING still works — so nothing is a dead end', async () => {
    renderWithProviders(<IdentityPanel />, { identity: seat(['procurement']) });
    const panel = await openRoles();
    fireEvent.click(within(panel).getByTestId('identity-role-buyer_all'));
    expect([...heldNow(panel)].sort()).toEqual(['buyer_all', 'procurement']);
    // …and NOW the lane can go, because the seat is no longer down to one.
    fireEvent.click(within(panel).getByTestId('identity-role-procurement'));
    expect(heldNow(panel)).toEqual(['buyer_all']);
  });
});

describe('⚠️ WARN, DO NOT BLOCK — the panel describes, it does not prescribe', () => {
  it('names the roles a wider held role already covers', async () => {
    renderWithProviders(<IdentityPanel />, {
      identity: seat(['buyer_all', 'procurement']),
    });
    const panel = await openRoles();
    const note = within(panel).getByTestId('identity-roles-redundant');
    expect(note).toHaveTextContent(i18n.t('roles.owner.procurement'));
  });

  it('⚠️ …AND `compliance` IS NOT NAMED — it carries `role:grant`, which buyer_all does not', () => {
    // The known-GOOD half. A hardcoded "everything beside a superset is
    // redundant" rule would have said otherwise and been WRONG about the one
    // role that matters — the derivation is what makes the notice true.
    expect(SYSTEM_ROLES.compliance).toContain('role:grant');
    expect(SYSTEM_ROLES.buyer_all).not.toContain('role:grant');
  });

  it('renders no redundancy notice for that pair', async () => {
    renderWithProviders(<IdentityPanel />, {
      identity: seat(['buyer_all', 'compliance']),
    });
    const panel = await openRoles();
    expect(within(panel).queryByTestId('identity-roles-redundant')).not.toBeInTheDocument();
  });

  it('and none at all on a plain lane seat — the notice is not always-on', async () => {
    // A notice that renders unconditionally is not a notice. This is the
    // negative control for the whole block.
    renderWithProviders(<IdentityPanel />, { identity: BUYER_SEEDED });
    const panel = await openRoles();
    expect(within(panel).queryByTestId('identity-roles-redundant')).not.toBeInTheDocument();
    expect(within(panel).queryByTestId('identity-roles-last')).not.toBeInTheDocument();
  });

  it('⚠️ IT WARNS — IT DOES NOT ACT. The redundant role stays held and toggleable', async () => {
    renderWithProviders(<IdentityPanel />, { identity: seat(['buyer_all', 'procurement']) });
    const panel = await openRoles();
    // Still held after the notice rendered — nothing auto-narrowed.
    expect(within(panel).getByTestId('identity-role-procurement')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // …and removing it is the READER's act, which still works.
    fireEvent.click(within(panel).getByTestId('identity-role-procurement'));
    expect(within(panel).getByTestId('identity-role-procurement')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});
