// ────────────────────────────────────────────────────────────────────────────
// A CUSTOM ROLE ON THE CATALOGUE — AND THE CLAIM THAT NO SURFACE WAS EDITED TO
// PUT IT THERE (D4).
//
// The tile moved 7 → 8 with no page edit when `admin` was seeded. The ruling is
// that a custom role must move it to 9 the same way, and that **if any surface
// needed editing to show one, THAT IS A FINDING, NOT A TASK.**
//
// ⚠️ **THE ROLE IS CREATED THROUGH THE REAL DISPATCHER, NOT PUSHED INTO THE
// STORE.** A test that appended to `customRoleStore` directly would prove the
// derivation reads the store and would say nothing about whether the verb can
// produce a role the page can render. The two are only the same claim if the
// same code path produces both.
//
// THE FINDING THIS FILE EXISTS TO PIN IS `side`. Every other field followed the
// data for free; `side` was computed as `buyerSide.has(id) ? 'buyer' :
// 'supplier'`, and a custom id is in NEITHER persona list — so the same ternary
// labelled a custom BUYER role **Supplier side**. Not a crash, not a red test:
// one wrong word about tenancy, on the page whose subject is tenancy.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import { renderWithProviders, BUYER } from '../test/test-utils';
import { SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { customRoleStore } from '../services/transitions/customRoles';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import type { QueryScope } from '../services/data/types';
import { deriveRoleViews, roleTotals } from './roles/roleModel';
import i18n from '../lib/i18n';
import RolesCatalogue from './RolesCatalogue';
import RoleDetail from './RoleDetail';

const svc = new MockCommandService();
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;
const compliance: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NOBODY,
};

const ID = 'jakarta-night-shift';
const NAME = 'Jakarta Night Shift';

const grantOne = () =>
  svc.dispatch(compliance, {
    transitionId: 't_role_grant',
    entity: 'role',
    entityId: 'receiving',
    payload: {
      roleId: ID,
      displayName: NAME,
      description: 'The dock, after hours.',
      adds: ['invoice:dispute'],
      grantedBy: NOBODY,
    },
  });

beforeEach(() => customRoleStore.reset());
afterEach(async () => {
  customRoleStore.reset();
  await i18n.changeLanguage('en');
});

describe('POPULATION GUARD', () => {
  it('the catalogue is the system roster BEFORE any grant', () => {
    // The known-FALSE half of every assertion below: if the derivation already
    // returned a ninth row, none of them would mean anything.
    expect(deriveRoleViews().length).toBe(Object.keys(SYSTEM_ROLES).length);
    expect(deriveRoleViews().map((v) => v.id)).not.toContain(ID);
  });
});

describe('⚠️ THE DERIVATION GREW; NO SURFACE DID', () => {
  it('the roster gains exactly one row, and it is the granted role', async () => {
    const before = deriveRoleViews().length;
    const result = await grantOne();
    expect(result.status).not.toBe('failed');
    const after = deriveRoleViews();
    expect(after.length).toBe(before + 1);
    expect(after.map((v) => v.id)).toContain(ID);
  });

  it('the tile counts it — the number the ruling names', async () => {
    await grantOne();
    const totals = roleTotals(deriveRoleViews());
    expect(totals.roles).toBe(Object.keys(SYSTEM_ROLES).length + 1);
    // The split still accounts for its own total. A breakdown that stops adding
    // up is the subset-as-population error wearing a breakdown's clothes.
    expect(totals.bySide.buyer + totals.bySide.supplier + totals.bySide.both).toBe(totals.roles);
  });

  it('⚠️ ITS SIDE COMES FROM ITS PARENT — the defect this file exists for', async () => {
    await grantOne();
    const view = deriveRoleViews().find((v) => v.id === ID)!;
    // `receiving` is buyer-side, so its child is. Membership in
    // `PERSONA_SYSTEM_ROLES.buyer` would have said 'supplier'.
    expect(view.side).toBe('buyer');
    expect(view.parent).toBe('receiving');
  });

  it('the derived fields follow the atoms, exactly as they do for a system role', async () => {
    await grantOne();
    const view = deriveRoleViews().find((v) => v.id === ID)!;
    const parent = deriveRoleViews().find((v) => v.id === 'receiving')!;
    // Superset of the parent in every derived dimension — the merge rule, seen
    // through the view model rather than through the resolver.
    expect(view.atoms.length).toBe(parent.atoms.length + 1);
    for (const m of parent.modules) expect(view.modules).toContain(m);
    expect(view.verbs.length).toBeGreaterThan(parent.verbs.length);
    expect(view.surfacedCount).toBeGreaterThanOrEqual(parent.surfacedCount);
    expect(view.isSystem).toBe(false);
    expect(parent.isSystem).toBe(true);
  });
});

describe('⚠️ IT RENDERS, AND NOTHING IN THE LIST WAS TOUCHED TO MAKE IT', () => {
  it('a row appears with the CUSTOM badge and the derived reach', async () => {
    await grantOne();
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');

    const row = screen.getByTestId(`role-row-${ID}`);
    expect(within(row).getByText(ID)).toBeInTheDocument();
    expect(within(row).getByText(NAME)).toBeInTheDocument();
    // The badge key already existed and had never been reachable — `isSystem`
    // was true for every role in the tree until this batch.
    expect(screen.getByTestId(`role-badge-${ID}`)).toHaveTextContent(/Custom role/i);
    expect(screen.getByTestId('role-badge-receiving')).toHaveTextContent(/System role/i);

    const view = deriveRoleViews().find((v) => v.id === ID)!;
    expect(row).toHaveTextContent(String(view.atoms.length));
  });

  it('the KPI tile reads the grown number, and its label no longer says System', async () => {
    await grantOne();
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const tile = await screen.findByTestId('kpi-roles');
    expect(tile).toHaveTextContent(String(Object.keys(SYSTEM_ROLES).length + 1));
    // ⚠️ THE LABEL WAS A FINDING. It read 'System roles' while counting
    // `views.length` — a property of the population the derivation never
    // guaranteed. `FLOOR-IN-PROSE-01` with a noun instead of a number.
    expect(tile).not.toHaveTextContent(/System roles/i);
  });

  it('the search finds it by code and by name', async () => {
    await grantOne();
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    const box = screen.getByTestId('roles-search');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(box, { target: { value: 'night' } });
    expect(await screen.findByTestId(`role-row-${ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId('role-row-finance')).not.toBeInTheDocument();
  });
});

describe('⚠️ THE DETAIL PAGE RESOLVES IT — the 404 rule still holds', () => {
  // `renderWithProviders` supplies the router; the element needs only a
  // matching <Route> for `useParams` to resolve against (the RoleDetail
  // precedent). Nesting a second <MemoryRouter> throws.
  const renderDetail = (id: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/buyer/roles/:roleId" element={<RoleDetail />} />
      </Routes>,
      { identity: BUYER, route: `/buyer/roles/${id}` },
    );

  it('a granted role opens its own page, badged custom, with its atoms', async () => {
    await grantOne();
    renderDetail(ID);
    await screen.findByTestId(`role-detail-${ID}`);
    expect(screen.getByTestId(`role-badge-${ID}`)).toHaveTextContent(/Custom role/i);
    const atoms = screen.getByTestId(`role-atoms-${ID}`);
    expect(within(atoms).getByText('gr:post')).toBeInTheDocument();
    expect(within(atoms).getByText('invoice:dispute')).toBeInTheDocument();
  });

  it('an UNGRANTED id is still a 404 — a name is not a role', async () => {
    // The store is empty (beforeEach). A role-shaped page with nothing in it
    // would claim "this role has no permissions", which is a different and much
    // worse statement than "there is no such role".
    renderDetail(ID);
    expect(screen.queryByTestId(`role-detail-${ID}`)).not.toBeInTheDocument();
    expect((await screen.findAllByText(/404|not found/i)).length).toBeGreaterThan(0);
  });
});

describe('⚠️ THE NAME IS USER TEXT AND IS NOT TRANSLATED — identically in EN and ID', () => {
  it('renders the same literal in both locales', async () => {
    await grantOne();
    const { unmount } = renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    expect(within(screen.getByTestId(`role-row-${ID}`)).getByText(NAME)).toBeInTheDocument();
    unmount();

    await i18n.changeLanguage('id');
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    await screen.findByTestId('roles-table');
    const row = screen.getByTestId(`role-row-${ID}`);
    // The system role beside it DID translate — so this asserts "untranslated",
    // not "the locale switch did nothing".
    expect(within(row).getByText(NAME)).toBeInTheDocument();
    expect(screen.getByTestId('role-row-receiving')).toHaveTextContent(/Penerimaan/i);
  });

  it('⚠️ AND IT IS NOT ECHOED AS A KEY — the missing-key fallback, measured', async () => {
    // `roleModel` passes the literal to `t()` as its own key. That renders the
    // text verbatim, which is the honest answer for text nobody translated —
    // but only because i18next returns a missing key whole. Pinned, because if
    // that ever changed the page would print `roles.owner.<id>` at a reader.
    await grantOne();
    const view = deriveRoleViews().find((v) => v.id === ID)!;
    expect(view.nameKey).toBe(NAME);
    expect(i18n.t(view.nameKey)).toBe(NAME);
    expect(i18n.t(view.descriptionKey)).toBe('The dock, after hours.');
  });
});
