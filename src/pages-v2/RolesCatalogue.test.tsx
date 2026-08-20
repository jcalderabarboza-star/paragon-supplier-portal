import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { SYSTEM_ROLES, type SystemRoleId } from '../services/transitions/businessRoles';
import { deriveRoleViews, roleTotals } from './roles/roleModel';
import i18n from '../lib/i18n';
import RolesCatalogue from './RolesCatalogue';

// ─────────────────────────────────────────────────────────────────────────────
// The catalogue is a LIST (the reference's shape) and READ-ONLY (the ruling).
// These defend the derivation above all: a page that re-states the roles looks
// identical to one that derives them until the day they disagree, and on that
// day nothing goes red.
// ─────────────────────────────────────────────────────────────────────────────

describe('POPULATION GUARD', () => {
  it('the derivation returns the roles the module declares', () => {
    const views = deriveRoleViews();
    expect(views.length).toBe(Object.keys(SYSTEM_ROLES).length);
    expect(views.map((v) => v.id)).toContain('finance');
    expect(views.map((v) => v.id)).not.toContain('not-a-role');
  });
});

describe('⚠️ THE PAGE BRINGS ITS OWN CHROME', () => {
  it('renders inside the app shell — sidebar and avatar reachable', async () => {
    // FOUND ON THE BUILT BUNDLE, NOT BY THE SUITE. `AppRouter` is a FLAT
    // `<Routes>` with no layout route: every page wraps itself in `AppShellV2`.
    // Shipping without it renders a working catalogue with NO sidebar and NO
    // avatar — a page with no way back to the app. `renderWithProviders` mounts
    // the page directly and never asks whether it brought its own chrome, so
    // every other assertion here passed over the defect.
    const { container } = renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-catalogue');
    expect(container.querySelector('aside'), 'no sidebar — outside AppShellV2').toBeTruthy();
    expect(screen.getByTestId('identity-avatar')).toBeInTheDocument();
  });
});

describe('⚠️ THE LIST IS DERIVED — one row per system role, no more, no fewer', () => {
  it('renders exactly the roles SYSTEM_ROLES declares', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    const ids = Object.keys(SYSTEM_ROLES) as SystemRoleId[];
    for (const id of ids) {
      expect(screen.getByTestId(`role-row-${id}`), `no row for '${id}'`).toBeInTheDocument();
    }
    // A row for a role the module does not declare would be a second vocabulary.
    expect(screen.getAllByTestId(/^role-row-/)).toHaveLength(ids.length);
  });

  it('each row carries the role CODE as a machine token', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const row = await screen.findByTestId('role-row-finance');
    expect(within(row).getByText('finance')).toBeInTheDocument();
  });

  it('the KPI tiles are derived, never restated', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    const totals = roleTotals(deriveRoleViews());
    expect(screen.getByTestId('kpi-roles')).toHaveTextContent(String(totals.roles));
    expect(screen.getByTestId('kpi-permissions')).toHaveTextContent(String(totals.permissions));
    expect(screen.getByTestId('kpi-actions')).toHaveTextContent(String(totals.actions));
  });

  it('⚠️ SHOWS NO USERS, LAST-MODIFIED OR STATUS COLUMN', async () => {
    // The reference has all three. We hold no people, no modification record and
    // no activation state, so rendering them would be three invented facts
    // filling a layout. ABSENT, not empty.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const table = await screen.findByTestId('roles-table');
    const headers = [...table.querySelectorAll('th')].map((th) => th.textContent?.toLowerCase());
    for (const forbidden of ['users', 'last modified', 'status']) {
      expect(
        headers.some((h) => h?.includes(forbidden)),
        `the list shows a '${forbidden}' column and we have no such data`,
      ).toBe(false);
    }
  });

  it('search narrows the list and says so when nothing matches', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const box = await screen.findByTestId('roles-search');
    fireEvent.change(box, { target: { value: 'financ' } });
    expect(screen.getByTestId('role-row-finance')).toBeInTheDocument();
    expect(screen.queryByTestId('role-row-receiving')).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'zzzz' } });
    expect(await screen.findByTestId('roles-no-match')).toBeInTheDocument();
  });
});

describe('⚠️ READ-ONLY IS A RULING, AND THE PAGE SAYS WHY', () => {
  it('offers NO create, edit, duplicate or delete affordance', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-catalogue');
    for (const label of [/create/i, /duplicate/i, /^edit$/i, /delete/i, /new role/i, /^save$/i]) {
      expect(
        screen.queryByRole('button', { name: label }),
        `an editing affordance matching ${label} is on a read-only catalogue`,
      ).not.toBeInTheDocument();
    }
  });

  it('states what is real and what is not (D-CENSUS-8), including WHY there is no create', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const marker = await screen.findByTestId('roles-readonly-marker');
    expect(marker).toHaveTextContent(/cannot be created yet/i);
    expect(marker).toHaveTextContent(/vanished on reload|nothing in the platform stores/i);
  });

  it('says there is no user list, and why', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    expect(await screen.findByTestId('roles-users-deferred')).toHaveTextContent(
      /no people|holds no people/i,
    );
  });

  it('badges every role as a SYSTEM role — custom is distinguishable at the record level', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    for (const id of Object.keys(SYSTEM_ROLES) as SystemRoleId[]) {
      expect(screen.getByTestId(`role-badge-${id}`)).toHaveTextContent(/System role/i);
    }
  });
});

describe('⚠️ A ROLE NAME IS A NOUN, NOT A SENTENCE FRAGMENT', () => {
  it('every role is named as a name', async () => {
    // FOUND ON THE BUILT BUNDLE. `roles.owner.supplier` was 'the supplier',
    // shaped for "Awaiting the supplier", and the catalogue headed a card with
    // it — ONE KEY DOING TWO JOBS. A lowercase name is valid text, so no
    // assertion could have failed until one was written for the shape.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    for (const id of Object.keys(SYSTEM_ROLES) as SystemRoleId[]) {
      const name = i18n.t(`roles.owner.${id}`);
      expect(name.length).toBeGreaterThan(0);
      expect(
        name[0] === name[0].toUpperCase(),
        `role '${id}' is named '${name}' — a sentence fragment, not a name`,
      ).toBe(true);
    }
  });

  it('every role has a description — a list with none is one nobody can scan', () => {
    for (const v of deriveRoleViews()) {
      const text = i18n.t(v.descriptionKey);
      expect(text, `no description for '${v.id}'`).not.toBe(v.descriptionKey);
      expect(text.length).toBeGreaterThan(20);
    }
  });
});

describe('EN AND ID FROM BIRTH (MARKER-I18N-HOLE-01)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('the honest marker and the column headers are translated', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const marker = await screen.findByTestId('roles-readonly-marker');
    expect(marker).toHaveTextContent(/Katalog hanya-baca/i);
    expect(marker).not.toHaveTextContent(/Read-only catalogue/i);
    const table = screen.getByTestId('roles-table');
    expect(within(table).getByText(/Kode peran/i)).toBeInTheDocument();
  });

  it('every role description exists in ID too', async () => {
    await i18n.changeLanguage('id');
    for (const v of deriveRoleViews()) {
      const text = i18n.t(v.descriptionKey);
      expect(text, `ID description missing for '${v.id}'`).not.toBe(v.descriptionKey);
    }
  });
});
