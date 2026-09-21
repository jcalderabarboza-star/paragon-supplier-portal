// ─────────────────────────────────────────────────────────────────────────────
// THE PREFERRED-SUPPLIER QUEUE — PSL P3.
//
// ⚠️ **THE STORE SEEDS `[]`, SO EVERY TEST WALKS TO ITS STATE THROUGH REAL
// DISPATCHES.** Rows are grown via `seedPslListings` — never stamped — and the
// population guard runs FIRST, by membership.
//
// ⚠️ **AND A CLOSED `SidePanel` RENDERS NOTHING (#280).** Every decide control
// lives inside a panel that is only mounted when a row is selected, so a test
// must WALK to the state before asserting a control. The first draft of the
// material-request twin passed for exactly the wrong reason because of this,
// and the walk below is the honest one that spec settled on.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

import { renderWithProviders } from '../test/test-utils';
import BuyerPreferredSuppliers from './BuyerPreferredSuppliers';
import i18n from '../lib/i18n';
import { MockCommandService, commandAuditSink } from '../services/data/mock/MockCommandService';
import { pslStore } from '../services/data/mock/stores/pslStore';
import { pslCapSettingStore } from '../services/data/mock/stores/pslCapSettingStore';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { NO_PERSON } from '../context/noPerson';
import { useToast } from '../hooks/useToast';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';

const seat = (roles: readonly string[]): CurrentIdentity => ({
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: roles,
  actor: NO_PERSON,
});

/** Every buyer lane — the demo default, and the seat §76d is about. */
const FULL = seat([
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
]);
/** Raises but cannot decide. */
const PROCUREMENT_ONLY = seat(['procurement']);
/** Decides but cannot raise — the seat a restrictive designation needs. */
const COMPLIANCE_ONLY = seat(['compliance']);
/**
 * Decides, cannot raise, and has a SECOND lane to fall back to.
 *
 * ⚠️ **THE IDENTITY PANEL WILL NOT REMOVE A SEAT'S LAST ROLE**, so a
 * single-lane seat cannot be narrowed at all — which would have made the
 * mode-gate walk below a no-op that passed. `finance` holds no PSL atom, so
 * dropping `compliance` leaves a seat that genuinely cannot decide.
 */
const COMPLIANCE_PLUS_FINANCE = seat(['compliance', 'finance']);

/** Surfaces the toast queue into the DOM — `ToastProvider` renders only its
 *  children, so without this a toast is invisible to a spec and "the refusal
 *  was rendered" would be unfalsifiable. */
const ToastSpy: React.FC = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>{`${t.title} ${t.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

let svc: MockCommandService;

beforeEach(async () => {
  pslStore.reset();
  pslCapSettingStore.reset();
  commandAuditSink.clear();
  svc = new MockCommandService();
  const outcome = await seedPslListings(svc);
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});

// ── POPULATION FIRST, BY MEMBERSHIP ─────────────────────────────────────────
describe('⚠️ POPULATION — the page has real, dispatched rows to render', () => {
  it('a Proposed row exists, by name, and it was grown through the verb', () => {
    const proposed = pslStore.all().filter((r) => r.lifecycle === 'Proposed');
    expect(proposed.map((r) => r.id)).toContain('psl-008');
    // Grown, not stamped: the first ledger entry is the proposal itself.
    expect(proposed[0].statusHistory[0].lifecycle).toBe('Proposed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('BuyerPreferredSuppliers — the queue (EN)', () => {
  it('renders the queue with the awaiting-decision tab open', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: FULL });
    // ⚠️ BY ROLE, not by text: the sidebar nav item carries the same words, and
    // `findByText` would match two nodes and throw.
    expect(
      await screen.findByRole('heading', { name: 'Preferred suppliers' }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('psl-queue-row-psl-008')).toBeInTheDocument();
    // The default tab is the pile that needs a decision, not everything.
    expect(screen.queryByTestId('psl-queue-row-psl-001')).toBeNull();
  });

  it('the ALL tab shows every listing the platform holds', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: FULL });
    fireEvent.click(await screen.findByTestId('psl-queue-tab-all'));
    expect(await screen.findByTestId('psl-queue-row-psl-001')).toBeInTheDocument();
    expect(screen.getByTestId('psl-queue-row-psl-006')).toBeInTheDocument();
  });

  it('⚠️ THE UNATTRIBUTED CEILING IS STATED BEFORE THE ACT, not after it', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    expect(await screen.findByTestId('psl-unattributed')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE RAISE VERB IS GATED SEPARATELY — it acts on no selected row', () => {
  it('a procurement seat sees the raise control', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: PROCUREMENT_ONLY });
    expect(await screen.findByTestId('psl-propose-open')).toBeInTheDocument();
  });

  it('⚠️ A SEAT WITHOUT `psl:propose` GETS A NOTICE, NOT A LIVE BUTTON', async () => {
    // ⚠️ **`IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`, ASSERTED.**
    // `BuyerRequisitions` imported the guard, rendered four of them, and still
    // shipped a live **New PR** button — because every guarded verb acted on a
    // document already selected and the CREATE verb lived in the page header.
    // This is that entrance.
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    await screen.findByTestId('psl-queue-row-psl-008');
    expect(screen.queryByTestId('psl-propose-open')).toBeNull();
    expect(screen.getByTestId('handoff-psl-propose')).toBeInTheDocument();
  });

  it('⚠️ AND PROPOSING AND DECIDING DO NOT COMPOSE INTO ONE PANEL (ruling g)', async () => {
    // The propose form lives in its own panel; the decide controls in another.
    // A surface that offered both at once would walk a single seat from raise
    // to approve in one flow, which is the sequence §76d is about.
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: FULL });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    expect(await screen.findByTestId('psl-decide-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-propose-panel')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SEAT-SEGREGATION MIRROR — the panel says what the dispatcher will', () => {
  it('⚠️ THE DEFAULT SEAT IS TOLD IT CANNOT APPROVE A SOLE SOURCE LISTING', async () => {
    // `psl-008` is `Sole Source`. `FULL` holds both `psl:propose` and
    // `psl:decide`, so `PSL_RESTRICTIVE_STATUS_APPROVED` would refuse — and the
    // panel must say so BEFORE the act rather than offering a button the
    // dispatcher refuses (the false-affordance shape R1 swept).
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: FULL });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    expect(await screen.findByTestId('psl-seat-holds-both')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-grant')).toBeNull();
    // ⚠️ REFUSING IS STILL OFFERED: a refusal is not a designation and
    // suspends nothing, so the hook does not sit on `t_psl_reject`.
    expect(screen.getByTestId('psl-reject')).toBeInTheDocument();
  });

  it('⚠️ AND THE NARROWED DECIDING SEAT IS OFFERED THE GRANT — rule 4, in order', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    expect(await screen.findByTestId('psl-grant')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-seat-holds-both')).toBeNull();
  });

  it('a seat with no deciding atom gets the handoff notice, not the mirror', async () => {
    // The mirror must not print a seat-segregation warning at a seat whose real
    // problem is that it holds no deciding authority at all.
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: PROCUREMENT_ONLY });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    expect(await screen.findByTestId('handoff-psl-decide')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-seat-holds-both')).toBeNull();
    expect(screen.queryByTestId('psl-grant')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE MODE IS GATED, NOT THE DOOR (ENTRANCE-IS-THE-UNIT-01)', () => {
  it('⚠️ A SEAT NARROWED WHILE THE DECIDE PANEL STANDS OPEN LOSES THE COMMIT', async () => {
    // ⚠️ **COMPONENT STATE OUTLIVES THE SEAT.** The walk opens the panel with a
    // HELD seat and then narrows the seat THROUGH THE REAL IDENTITY CONTROL,
    // which keeps the component mounted and `selectedId` intact. A check
    // performed only where the panel is OPENED would leave a live commit behind
    // a stale decision — and a spec that merely rendered a narrowed seat would
    // assert nothing, because a closed panel renders nothing (#280).
    renderWithProviders(<BuyerPreferredSuppliers />, {
      identity: COMPLIANCE_PLUS_FINANCE,
    });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    expect(await screen.findByTestId('psl-grant')).toBeInTheDocument();

    // Drop `compliance` while the decide panel stands open. `finance` remains,
    // so the seat is narrowed rather than refused by the last-role constraint.
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const idPanel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(idPanel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(idPanel).getByTestId('identity-role-compliance'));

    // The BODY collapsed to the notice, and both commits are gone with it.
    expect(await screen.findByTestId('handoff-psl-decide')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-grant')).not.toBeInTheDocument();
    expect(screen.queryByTestId('psl-reject')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE VERBS DISPATCH END TO END — the store moves, not just a toast', () => {
  it('⚠️ GRANT REACHES `t_psl_grant` AND THE ROW BECOMES `Listed`', async () => {
    // ⚠️ **THE `BuyerRequisitions` DEFECT IS WHAT THIS ASSERTS AGAINST**: a
    // `variant:'success'` toast on no dispatch at all. The STORE is the oracle.
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    fireEvent.change(await screen.findByTestId('psl-decide-reason'), {
      target: { value: 'exclusivity evidence accepted' },
    });
    fireEvent.click(screen.getByTestId('psl-grant'));

    await waitFor(() => expect(pslStore.get('psl-008')!.lifecycle).toBe('Listed'));
    const row = pslStore.get('psl-008')!;
    expect(row.decidedBy).not.toBeNull();
    expect(row.statusHistory[row.statusHistory.length - 1].reason).toBe(
      'exclusivity evidence accepted',
    );
  });

  it('the commit is DISABLED until the reason has substance', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    const grant = await screen.findByTestId('psl-grant');
    expect(grant).toBeDisabled();
    // Whitespace is not substance — the courtesy mirror of
    // `PSL_DECISION_AUTHORED`, which is the policy.
    fireEvent.change(screen.getByTestId('psl-decide-reason'), { target: { value: '   ' } });
    expect(screen.getByTestId('psl-grant')).toBeDisabled();
    fireEvent.change(screen.getByTestId('psl-decide-reason'), { target: { value: 'ok' } });
    expect(screen.getByTestId('psl-grant')).toBeEnabled();
  });

  it('⚠️ REJECT REACHES `t_psl_reject`, AND THE ENDING IS TERMINAL', async () => {
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    fireEvent.change(await screen.findByTestId('psl-decide-reason'), {
      target: { value: 'a second qualified source exists' },
    });
    fireEvent.click(screen.getByTestId('psl-reject'));

    await waitFor(() => expect(pslStore.get('psl-008')!.lifecycle).toBe('Rejected'));
    // The row leaves the awaiting-decision pile, which is the queue's job.
    await waitFor(() =>
      expect(screen.queryByTestId('psl-queue-row-psl-008')).not.toBeInTheDocument(),
    );
  });

  it('⚠️ PROPOSE REACHES `t_psl_propose` AND THE STORE GROWS', async () => {
    const before = pslStore.all().length;
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: PROCUREMENT_ONLY });
    fireEvent.click(await screen.findByTestId('psl-propose-open'));
    fireEvent.change(await screen.findByTestId('psl-form-supplier'), {
      target: { value: 'sup-001' },
    });
    fireEvent.change(screen.getByTestId('psl-form-codes'), {
      target: { value: 'RM-EMUL-3310' },
    });
    fireEvent.change(screen.getByTestId('psl-form-from'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByTestId('psl-form-until'), { target: { value: '2027-08-01' } });
    fireEvent.change(screen.getByTestId('psl-form-justification'), {
      target: { value: 'pre-qualified on quality and lead time' },
    });
    fireEvent.change(screen.getByTestId('psl-form-reason'), {
      target: { value: 'raised after the category review' },
    });
    fireEvent.click(screen.getByTestId('psl-propose-submit'));

    await waitFor(() => expect(pslStore.all().length).toBe(before + 1));
    const fresh = pslStore.all()[pslStore.all().length - 1];
    expect(fresh.supplierId).toBe('sup-001');
    expect(fresh.lifecycle).toBe('Proposed');
    expect(fresh.decidedBy).toBeNull();
  });

  it('⚠️ A REFUSAL IS RENDERED IN THE READER`S WORDS, NOT AS A DISPATCHER CONSTANT', async () => {
    // Browser QA (Wave E) found an operator reading `ROLE_NOT_PERMITTED:…` on
    // screen. An invented material code is the cheapest refusal to provoke.
    renderWithProviders(
      <>
        <BuyerPreferredSuppliers />
        <ToastSpy />
      </>,
      { identity: PROCUREMENT_ONLY },
    );
    fireEvent.click(await screen.findByTestId('psl-propose-open'));
    fireEvent.change(await screen.findByTestId('psl-form-supplier'), {
      target: { value: 'sup-001' },
    });
    fireEvent.change(screen.getByTestId('psl-form-codes'), {
      target: { value: 'RM-NOT-A-REAL-CODE' },
    });
    fireEvent.change(screen.getByTestId('psl-form-from'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByTestId('psl-form-until'), { target: { value: '2027-08-01' } });
    fireEvent.change(screen.getByTestId('psl-form-justification'), {
      target: { value: 'a justification' },
    });
    fireEvent.change(screen.getByTestId('psl-form-reason'), { target: { value: 'a reason' } });
    fireEvent.click(screen.getByTestId('psl-propose-submit'));

    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() =>
      expect(spy.textContent).toMatch(/not a material this platform carries/i),
    );
    // ⚠️ AND THE DISPATCHER CONSTANT IS NOT ON SCREEN.
    expect(spy.textContent).not.toMatch(/PSL_SCOPE_UNKNOWN_CODE/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('BuyerPreferredSuppliers — the queue (ID)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('⚠️ renders in Indonesian, with NO English chrome left', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: COMPLIANCE_ONLY });
    expect(
      await screen.findByRole('heading', { name: 'Pemasok preferensi' }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    const panel = await screen.findByTestId('psl-decide-panel');
    const body = panel.textContent ?? '';

    expect(body).toContain('Cakupan');
    expect(body).toContain('Sumber Tunggal');
    expect(screen.getByTestId('psl-grant').textContent).toBe('Setujui');
    expect(screen.getByTestId('psl-reject').textContent).toBe('Tolak');

    // ⚠️ THE HALF A "does the ID string appear?" CHECK CANNOT MAKE.
    expect(body).not.toContain('Scope');
    expect(body).not.toContain('Sole Source');
    // ⚠️ AND THE DATA SURVIVES UNTRANSLATED — a material code is opaque (C9 §3).
    expect(body).toContain('FR-ROUD-4470');
  });

  it('⚠️ the seat-segregation notice localises too', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerPreferredSuppliers />, { identity: FULL });
    fireEvent.click(await screen.findByTestId('psl-queue-row-psl-008'));
    const notice = await screen.findByTestId('psl-seat-holds-both');
    expect(notice.textContent).toMatch(/menangguhkan tender kompetitif/i);
    expect(notice.textContent).not.toMatch(/suspends competitive bidding/i);
  });
});
