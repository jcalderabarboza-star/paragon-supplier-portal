import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
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

/** A NARROWED buyer seat — everything except the role editor's lane. */
const PROCUREMENT_ONLY: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['procurement', 'receiving', 'finance'],
  actor: NO_PERSON,
};

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

  it('a single-module role reads "1 module", not "1 modules"', async () => {
    // Visible on two rows the moment `admin` made the list worth reading
    // closely. i18next selects the arm on `count`; the explicit interpolations
    // keep BOTH numbers rendering on either arm.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const row = await screen.findByTestId('role-row-finance');
    expect(within(row).getByText(/1 module(?![s])/)).toBeInTheDocument();
    expect(within(row).queryByText(/1 modules/)).not.toBeInTheDocument();
    // Known-GOOD control: a multi-module role still pluralises.
    const admin = screen.getByTestId('role-row-admin');
    expect(within(admin).getByText(/\d+ modules/)).toBeInTheDocument();
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

// ⚠️ **THE READ-ONLY RULING IS SUPERSEDED, AND THESE ARE ITS SUCCESSORS.**
// The three assertions that stood here required the ABSENCE of a create
// affordance and a marker explaining why. The page can now edit, so the rules
// that replace them are stronger, not weaker: the affordance must be GATED, and
// the marker must state what survives a reload rather than omitting the subject.
describe('⚠️ EDITING IS COMPLIANCE-GATED — THE FIRST ROLE-GATED SURFACE', () => {
  it('a seat WITHOUT role:grant gets the wait, not a gap', async () => {
    // The ruled shape: a withheld verb renders PENDING WITH AN OWNER. A route
    // guard would have rendered a gap AND hidden the catalogue, which §65 ruled
    // must stay readable by anyone.
    renderWithProviders(<RolesCatalogue />, { identity: PROCUREMENT_ONLY });
    await screen.findByTestId('roles-catalogue');
    expect(screen.queryByTestId('roles-create')).not.toBeInTheDocument();
    const gate = screen.getByTestId('roles-create-gate');
    expect(gate).toHaveTextContent(/compliance action/i);
    // The owner, named — not merely a missing button.
    expect(screen.getByTestId('roles-create-handoff')).toHaveTextContent(/Compliance/i);
    // ⚠️ WHY *AND* HOW. A reader who cannot see the affordance must be able to
    // learn from the surface what would change it — and the demo fence must be
    // in the same breath, or the sentence reads as a self-service privilege
    // grant rather than as a demo control that a real directory replaces.
    const demo = screen.getByTestId('roles-create-gate-demo');
    expect(demo).toHaveTextContent(/Demonstration seat/i);
    expect(demo).toHaveTextContent(/select Compliance/i);
    expect(demo).toHaveTextContent(/user directory is connected/i);
    // AND THE CATALOGUE IS STILL FULLY READABLE. Reading which roles exist is
    // not editing one; the gate must not have taken the page with it.
    expect(screen.getByTestId('role-row-finance')).toBeInTheDocument();
  });

  it('a compliance seat gets the affordance — the KNOWN-GOOD half of the gate', async () => {
    // ⚠️ WITHOUT THIS, THE TEST ABOVE PROVES ONLY THAT SOMETHING IS ABSENT, and
    // a panel that never renders for anyone would pass it. Probe both ways.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    expect(await screen.findByTestId('roles-create')).toBeInTheDocument();
    expect(screen.queryByTestId('roles-create-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('role-create-submit')).toBeInTheDocument();
  });

  it('states EXACTLY where a custom role persists, and what that means', async () => {
    // ⚠️ THIS ASSERTION HAS NOW BEEN REWRITTEN TWICE, BY TWO RULINGS, AND THAT
    // IS THE POINT OF IT. §65 said custom roles could not be created and would
    // vanish on reload. §66 made them creatable and session-scoped. The
    // persistence ruling makes them durable. Each time, the standard held: the
    // superseded sentence must become FALSE, never merely absent — so this test
    // asserts the OLD claims are gone AND the new one is precise about WHERE.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const marker = await screen.findByTestId('roles-readonly-marker');
    expect(marker).not.toHaveTextContent(/cannot be created yet/i);
    expect(marker).not.toHaveTextContent(/nothing in the platform stores/i);
    expect(marker).not.toHaveTextContent(/browser session only/i);
    expect(marker).not.toHaveTextContent(/never written to disk/i);
    // Persists — and WHERE, which is the half a reader can be misled about.
    expect(marker).toHaveTextContent(/saved in this browser/i);
    expect(marker).toHaveTextContent(/survives a reload/i);
    expect(marker).toHaveTextContent(/not shared with anyone/i);
    expect(marker).toHaveTextContent(/not stored on a server/i);
    expect(marker).toHaveTextContent(/clear site data/i);
    // The system roles are NOT written, said where somebody would wonder.
    expect(marker).toHaveTextContent(/system roles are not saved/i);
    // Additive-only, and the attribution gap, both still stated.
    expect(marker).toHaveTextContent(/never subtract|can never subtract/i);
    expect(marker).toHaveTextContent(/name the person/i);
  });

  it('⚠️ AND THE POINT-OF-CREATION LINE SAYS IT BEFORE THE ACT, NOT AFTER IT', async () => {
    // A user who creates a role must have been told where it goes BEFORE they
    // create it. The header is not enough — nobody reads a header on the way to
    // a submit button.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const line = await screen.findByTestId('role-create-actor');
    expect(line).toHaveTextContent(/saved in this browser/i);
    expect(line).toHaveTextContent(/survive a reload/i);
    expect(line).toHaveTextContent(/not stored on a server/i);
    expect(line).toHaveTextContent(/nobody the platform can name/i);
    // And it sits ABOVE the submit, not below it.
    const submit = screen.getByTestId('role-create-submit');
    expect(line.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

describe('⚠️ THE PROSE CARRIES NO CARDINALITY OF ITS OWN', () => {
  // ⚠️ **THIS IS THE GATE THAT DID NOT EXIST, AND ITS ABSENCE IS THE FINDING.**
  // The marker read "These six roles are real" on a page whose tile read 7:
  // `six` was `PERSONA_SYSTEM_ROLES.buyer.length` — TRUE OF THE BUYER SUBSET,
  // written as the population. The same sentence rendered on the detail footer.
  //
  // Nothing could have caught it. The tile test asserted the tile against the
  // derivation; the marker test asserted the marker against `/cannot be created
  // yet/`. **No test compared the PROSE's number to the derivation**, because
  // the prose was not thought of as carrying one — `FLOOR-IN-PROSE-01`, inside
  // the page whose entire claim is that it cannot drift from what the portal
  // enforces.
  it('the marker states the DERIVED role count, not a written one', async () => {
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const marker = await screen.findByTestId('roles-readonly-marker');
    const derived = roleTotals(deriveRoleViews()).roles;
    expect(marker).toHaveTextContent(new RegExp(`\\b${derived}\\b`));
    // And it agrees with the tile — one derivation, two renderings.
    expect(screen.getByTestId('kpi-roles')).toHaveTextContent(String(derived));
  });

  it('no English or Indonesian number-word survives in the marker copy', async () => {
    // A word is how the cardinality got in. Digits come from interpolation;
    // words come from a keyboard.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const marker = await screen.findByTestId('roles-readonly-marker');
    const text = marker.textContent ?? '';
    for (const w of ['five', 'six', 'seven', 'eight', 'lima', 'enam', 'tujuh', 'delapan']) {
      expect(
        new RegExp(`\\b${w}\\b`, 'i').test(text),
        `the marker writes the number as the word '${w}' instead of deriving it`,
      ).toBe(false);
    }
  });

  it('⚠️ THE TILE NAMES WHAT IT COUNTS — the subset is shown beside the total', async () => {
    // "Six" was a subset presented as a total. Rendering the split beside the
    // figure is what stops that reading recurring.
    renderWithProviders(<RolesCatalogue />, { identity: BUYER });
    const tile = await screen.findByTestId('kpi-roles');
    const totals = roleTotals(deriveRoleViews());
    expect(tile).toHaveTextContent(String(totals.bySide.buyer));
    expect(tile).toHaveTextContent(String(totals.bySide.supplier));
    // ⚠️ THE PARTS MUST ACCOUNT FOR THE WHOLE. This assertion is what caught
    // `admin` landing on neither side: the split was drawn from
    // PERSONA_SYSTEM_ROLES — a DIFFERENT population than the total — and it
    // stopped summing the moment a cross-tenancy role existed.
    expect(
      totals.bySide.buyer + totals.bySide.supplier + totals.bySide.both,
      'the split does not add up to the total the tile shows',
    ).toBe(totals.roles);
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
    expect(marker).toHaveTextContent(/Katalog peran/i);
    expect(marker).toHaveTextContent(/disimpan di peramban ini/i);
    expect(marker).toHaveTextContent(/tidak disimpan di server/i);
    expect(marker).not.toHaveTextContent(/The role catalogue/i);
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
