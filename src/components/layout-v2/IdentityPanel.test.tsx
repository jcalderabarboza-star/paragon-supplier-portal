import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { NO_PERSON } from '../../context/noPerson';
import { PERSONA_SYSTEM_ROLES, atomsFor } from '../../services/transitions/businessRoles';
import i18n from '../../lib/i18n';
import IdentityPanel from './IdentityPanel';

// ─────────────────────────────────────────────────────────────────────────────
// The panel answers WHO AM I. Batch A answered WHOSE ACT IS NEXT and left this
// half unanswered, which is why "Awaiting Finance" was only half a handoff.
// ─────────────────────────────────────────────────────────────────────────────

const PROCUREMENT: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

const open = async () => {
  fireEvent.click(await screen.findByTestId('identity-avatar'));
  return screen.findByTestId('identity-panel');
};

/** Open the panel AND expand the role dropdown — the roles are collapsed. */
const openRoles = async () => {
  const panel = await open();
  fireEvent.click(within(panel).getByTestId('identity-roles-trigger'));
  await screen.findByTestId('identity-roles-list');
  return panel;
};

describe('POPULATION GUARD', () => {
  it('the panel is closed until the avatar is clicked', () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    expect(screen.queryByTestId('identity-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('identity-avatar')).toBeInTheDocument();
  });
});

describe('⚠️ A BUYER SEAT — role stated, scope shown, scope NOT editable', () => {
  it('states the persona and the access scope', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    expect(within(panel).getByTestId('identity-persona')).toHaveTextContent(/Buyer/i);
    // OUR scope axis, derived from QueryScope — not TMS's warehouses or nodes.
    expect(within(panel).getByTestId('identity-scope')).toHaveTextContent(/All suppliers/i);
  });

  it('⚠️ SAYS CHANGING SCOPE IS SOMEONE ELSE’S ACT — the handoff, one layer up', async () => {
    // The same rule this arc ruled for cross-role verbs, applied to identity: an
    // honest line beats a control that silently does nothing.
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    expect(within(panel).getByTestId('identity-scope-handoff')).toHaveTextContent(
      /Contact your administrator/i,
    );
  });

  it('offers NO control that edits the scope', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    for (const label of [/change scope/i, /edit scope/i, /request access/i]) {
      expect(within(panel).queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
  });

  it('lists every role the persona can hold, ticking the ones held', async () => {
    renderWithProviders(<IdentityPanel />, { identity: PROCUREMENT });
    const panel = await openRoles();
    for (const role of PERSONA_SYSTEM_ROLES.buyer) {
      const item = within(panel).getByTestId(`identity-role-${role}`);
      expect(item.getAttribute('aria-checked')).toBe(String(role === 'procurement'));
    }
  });

  it('the permission count is DERIVED, never restated', async () => {
    renderWithProviders(<IdentityPanel />, { identity: PROCUREMENT });
    const panel = await open();
    const expected = atomsFor(['procurement']).length;
    expect(within(panel).getByTestId('identity-roles-summary')).toHaveTextContent(
      new RegExp(`${expected} permissions`),
    );
  });
});

describe('⚠️ THE ROLES ARE A COLLAPSED DROPDOWN SHOWING THE CURRENT ROLE', () => {
  it('the role list is hidden until the trigger is used', async () => {
    // The panel's headline answer is WHICH ROLE AM I. A permanently expanded
    // roster puts six controls in front of a reader who asked one question.
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    expect(within(panel).queryByTestId('identity-roles-list')).not.toBeInTheDocument();
    const trigger = within(panel).getByTestId('identity-roles-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(await screen.findByTestId('identity-roles-list')).toBeInTheDocument();
  });

  it('⚠️ THE TRIGGER NAMES THE CURRENT ROLE, NOT ALL OF THEM', async () => {
    // Enumerating every held role turns the trigger back into the roster the
    // dropdown exists to collapse. Extras are a count: nothing hidden, nothing
    // spelled out.
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    const current = within(panel).getByTestId('identity-current-role');
    expect(current).toHaveTextContent(/Procurement/);
    expect(current).toHaveTextContent(/\+5/);
    expect(current).not.toHaveTextContent(/Finance/);
    expect(current).not.toHaveTextContent(/Receiving/);
  });

  it('a single-role seat shows that role with no count', async () => {
    renderWithProviders(<IdentityPanel />, { identity: PROCUREMENT });
    const panel = await open();
    const current = within(panel).getByTestId('identity-current-role');
    expect(current).toHaveTextContent(/Procurement/);
    expect(current).not.toHaveTextContent(/\+/);
  });
});

describe('⚠️ ONE ROLE CONTROL, NOT TWO', () => {
  it('the role selector changes the seat', async () => {
    renderWithProviders(<IdentityPanel />, { identity: PROCUREMENT });
    const panel = await openRoles();
    fireEvent.click(within(panel).getByTestId('identity-role-finance'));
    expect(
      (await screen.findByTestId('identity-role-finance')).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('⚠️ THE LAST HELD ROLE CANNOT BE SWITCHED OFF', async () => {
    // A seat with no roles reads as a broken portal, not a narrow one: every
    // governed act would refuse and every surface would look defective.
    renderWithProviders(<IdentityPanel />, { identity: PROCUREMENT });
    const panel = await openRoles();
    const only = within(panel).getByTestId('identity-role-procurement');
    expect(only.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(only);
    expect(
      (await screen.findByTestId('identity-role-procurement')).getAttribute('aria-checked'),
    ).toBe('true');
  });
});

describe('A SUPPLIER SEAT — one role, and a scope of exactly one supplier', () => {
  it('names the supplier rather than claiming a superset', async () => {
    renderWithProviders(<IdentityPanel />, { identity: SUPPLIER });
    const panel = await open();
    expect(within(panel).getByTestId('identity-persona')).toHaveTextContent(/Supplier/i);
    expect(within(panel).getByTestId('identity-scope')).toHaveTextContent(
      /PT Sample Packaging Indonesia/i,
    );
    expect(within(panel).getByTestId('identity-scope')).not.toHaveTextContent(/All suppliers/i);
  });

  it('shows the ONE supplier role and no buyer role', async () => {
    renderWithProviders(<IdentityPanel />, { identity: SUPPLIER });
    const panel = await openRoles();
    expect(within(panel).getByTestId('identity-role-supplier')).toBeInTheDocument();
    // A buyer bundle offered to a supplier seat would be a cross-tenancy grant.
    expect(within(panel).queryByTestId('identity-role-finance')).not.toBeInTheDocument();
    expect(within(panel).queryByTestId('identity-role-procurement')).not.toBeInTheDocument();
  });
});

describe('THE HONEST MARKER (D-CENSUS-8)', () => {
  it('separates what is real from what is not — precisely', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    const marker = within(panel).getByTestId('identity-demo-marker');
    // Real: the roles and the enforcement. Not real: the switching, and there is
    // no person behind any act.
    expect(marker).toHaveTextContent(/are real/i);
    expect(marker).toHaveTextContent(/demo control/i);
    expect(marker).toHaveTextContent(/no user directory|no act can name the person/i);
  });
});

describe('EN AND ID FROM BIRTH (MARKER-I18N-HOLE-01)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('the scope line, the handoff and the marker are all translated', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const panel = await open();
    expect(within(panel).getByTestId('identity-scope')).toHaveTextContent(/Semua pemasok/i);
    expect(within(panel).getByTestId('identity-scope-handoff')).toHaveTextContent(
      /Hubungi administrator/i,
    );
    expect(within(panel).getByTestId('identity-demo-marker')).toHaveTextContent(
      /Kursi demonstrasi/i,
    );
    expect(within(panel).getByTestId('identity-demo-marker')).not.toHaveTextContent(
      /Demonstration seat/i,
    );
  });
});
