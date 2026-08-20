import { screen, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { getKnownFlows } from '../services/transitions';
import { deriveRoleViews } from './roles/roleModel';
import i18n from '../lib/i18n';
import RoleDetail from './RoleDetail';

// The detail answers WHAT THIS ROLE CAN DO. It reads the same derivation the
// list counts from, so it can never show a permission the list did not count.

// `renderWithProviders` mounts the element directly, so `useParams` needs a
// matching <Route> to resolve against — the allRoutes.smoke precedent.
const renderRole = (roleId: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/roles/:roleId" element={<RoleDetail />} />
    </Routes>,
    { identity: BUYER, route: `/buyer/roles/${roleId}` },
  );

describe('POPULATION GUARD', () => {
  it('the role under test exists in the derivation', () => {
    expect(deriveRoleViews().map((v) => v.id)).toContain('finance');
  });
});

describe('⚠️ THE PERMISSIONS AND MODULES ARE DERIVED', () => {
  it('shows every atom the role holds, and none it does not', async () => {
    renderRole('finance');
    const list = await screen.findByTestId('role-atoms-finance');
    const shown = [...list.querySelectorAll('li')].map((li) => li.textContent?.trim()).sort();
    expect(shown).toEqual([...SYSTEM_ROLES.finance].sort());
    // Known-BAD: finance does not award.
    expect(shown).not.toContain('rfq:award');
  });

  it('shows the modules derived from the flow entities its verbs belong to', async () => {
    renderRole('finance');
    const list = await screen.findByTestId('role-modules-finance');
    const expected = [
      ...new Set(
        getKnownFlows()
          .filter((f) =>
            f.transitions.some((t) =>
              (SYSTEM_ROLES.finance as readonly string[]).includes(t.requiredRole),
            ),
          )
          .map((f) => f.entity),
      ),
    ].sort();
    expect(expected.length).toBeGreaterThan(0);
    const shown = [...list.querySelectorAll('li')].map((li) => li.textContent?.trim()).sort();
    expect(shown).toEqual(expected);
  });

  it('lists the acts the role can take, by transition id', async () => {
    renderRole('receiving');
    const list = await screen.findByTestId('role-verbs-receiving');
    const expected = getKnownFlows()
      .flatMap((f) => f.transitions)
      .filter((t) => (SYSTEM_ROLES.receiving as readonly string[]).includes(t.requiredRole))
      .filter((t) => t.surfaceable.surfaced)
      .map((t) => t.id);
    expect(expected.length).toBeGreaterThan(SYSTEM_ROLES.receiving.length);
    for (const id of expected) {
      expect(within(list).getByText(id), `verb '${id}' missing`).toBeInTheDocument();
    }
  });

  it('a role with no screen-level act says so rather than rendering an empty list', async () => {
    // `compliance` is the honest zero: its atoms sit on ruled-unsurfaced or
    // system verbs. A blank section would read as a rendering bug.
    const view = deriveRoleViews().find((v) => v.id === 'compliance')!;
    renderRole('compliance');
    await screen.findByTestId('role-detail-compliance');
    if (view.surfacedCount === 0) {
      expect(screen.getByTestId('role-none-compliance')).toBeInTheDocument();
    } else {
      expect(screen.getByTestId('role-verbs-compliance')).toBeInTheDocument();
    }
  });
});

describe('⚠️ AN UNKNOWN ROLE IS A 404, NOT AN EMPTY ROLE PAGE', () => {
  it('renders NotFound rather than a role with no permissions', async () => {
    // An empty detail claims "this role has no permissions", which is a
    // different and much worse statement than "there is no such role".
    renderRole('not-a-real-role');
    expect(screen.queryByTestId('role-detail-not-a-real-role')).not.toBeInTheDocument();
    // NotFound paints the code in more than one place; `getAllBy` is the honest
    // matcher — asserting a single node would be asserting NotFound's layout.
    expect((await screen.findAllByText(/404|not found/i)).length).toBeGreaterThan(0);
  });
});

describe('THE DETAIL CARRIES THE CHROME AND THE MARKER', () => {
  it('renders inside the app shell', async () => {
    const { container } = renderRole('finance');
    await screen.findByTestId('role-detail-finance');
    expect(container.querySelector('aside')).toBeTruthy();
  });

  it('repeats the read-only reason — a reader may land here first', async () => {
    renderRole('finance');
    expect(await screen.findByTestId('role-detail-marker')).toHaveTextContent(
      /cannot be created yet/i,
    );
  });

  it('offers a way back to the list', async () => {
    renderRole('finance');
    expect(await screen.findByTestId('role-detail-back')).toBeInTheDocument();
  });
});

describe('EN AND ID FROM BIRTH', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('the detail translates, and the ATOMS do not', async () => {
    await i18n.changeLanguage('id');
    renderRole('finance');
    const page = await screen.findByTestId('role-detail-finance');
    expect(within(page).getByText('Keuangan')).toBeInTheDocument();
    // `invoice:pay` is an identifier the dispatcher compares. Translating it
    // would make the page disagree with the machine in one locale only.
    expect(within(page).getByText('invoice:pay')).toBeInTheDocument();
  });
});
