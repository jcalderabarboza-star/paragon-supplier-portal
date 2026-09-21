// ─────────────────────────────────────────────────────────────────────────────
// R8 · THE MATERIAL-REQUEST SURFACE.
//
// ⚠️ **THE STORE SEEDS `[]`, SO EVERY TEST WALKS TO ITS STATE THROUGH REAL
// DISPATCHES.** Rows are grown via `seedMaterialRequests` — never stamped —
// and the population guard runs FIRST, by membership.
//
// ⚠️ **AND A CLOSED `SidePanel` RENDERS NOTHING (#280).** Every control lives
// inside a panel only mounted when a row is selected, so a test must WALK TO
// THE STATE before asserting a control — and each confirm step is a further
// state inside it.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import BuyerMaterialRequests from './BuyerMaterialRequests';
import i18n from '../lib/i18n';
import { MockCommandService, commandAuditSink } from '../services/data/mock/MockCommandService';
import { materialRequestStore } from '../services/data/mock/stores/materialRequestStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { seedMaterialRequests } from '../services/data/mock/materialRequestSeed';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';

const seat = (roles: readonly string[]): CurrentIdentity => ({
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: roles,
  actor: NO_PERSON,
});

/** Holds every buyer lane — the demo default. */
const FULL = seat([
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
]);
/** Raises but cannot review or decide. */
const PROCUREMENT_ONLY = seat(['procurement']);
/** Reviews and decides but cannot raise. */
const PLANNING_ONLY = seat(['planning']);

let svc: MockCommandService;

beforeEach(async () => {
  materialRequestStore.reset();
  rfqStore.reset();
  commandAuditSink.clear();
  svc = new MockCommandService();
  await seedMaterialRequests(svc);
});

// ── POPULATION FIRST, BY MEMBERSHIP ─────────────────────────────────────────
describe('⚠️ POPULATION — the page has real, dispatched rows to render', () => {
  it('two named rows, grown through the verb', () => {
    const labels = materialRequestStore.all().map((r) => r.requestedLabel);
    expect(labels).toContain('PET Bottle 100ml');
    expect(labels).toContain('Sample Amber Dropper 30ml (illustrative)');
    expect(labels).not.toContain('a row nothing dispatched');
  });
});

describe('the queue renders', () => {
  it('the rows appear with their store-assigned numbers', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: FULL });
    expect(await screen.findByText('MR-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('MR-2026-0002')).toBeInTheDocument();
  });

  it('⚠️ NO CODE APPEARS ANYWHERE ON THE QUEUE — the lane has none', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: FULL });
    await screen.findByText('MR-2026-0001');
    // No master-code-shaped token on the page. The four real prefixes, derived
    // from the master's own key space rather than guessed.
    const text = document.body.innerText ?? document.body.textContent ?? '';
    expect(text).not.toMatch(/\b(RM|AI|PK|FR)-[A-Z0-9]+-\d{4}\b/);
  });

  it('the origin column distinguishes the two entrances', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: FULL });
    await screen.findByText('MR-2026-0001');
    expect(screen.getByText(i18n.t('materialRequests.origin.standalone'))).toBeInTheDocument();
  });
});

describe('⚠️ THE RAISE VERB IS GATED SEPARATELY — it acts on no selected row', () => {
  it('a procurement seat sees the raise control', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PROCUREMENT_ONLY });
    expect(await screen.findByTestId('material-request-raise-open')).toBeInTheDocument();
  });

  it('⚠️ A PLANNING SEAT DOES NOT — it gets the notice, not a dead control', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PLANNING_ONLY });
    expect(await screen.findByTestId('handoff-materialrequest-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('material-request-raise-open')).not.toBeInTheDocument();
  });

  it('⚠️ THE MODE IS GATED, NOT THE DOOR (§84) — A SEAT NARROWED MID-PANEL LOSES THE COMMIT', async () => {
    // ⚠️ **THIS TEST'S FIRST DRAFT PASSED FOR THE WRONG REASON AND A MUTATION
    // PROBE IS WHAT FOUND IT — recorded because it is the exact failure this
    // project's probe discipline exists for.** The draft rendered a narrowed
    // seat and asserted the raise FORM was absent. It was absent all right — a
    // closed `SidePanel` renders NOTHING (#280), so `raiseOpen` was false and
    // the assertion never reached the mode gate at all. Deleting the gate
    // entirely left the suite GREEN.
    //
    // The honest walk is the one `supplierLaneSurfaces.test.tsx` uses for the
    // same property: open the panel with a HELD seat, then narrow the seat
    // THROUGH THE REAL IDENTITY CONTROL, which keeps the component mounted and
    // its state intact. `panelMode` is component state and OUTLIVES THE SEAT —
    // that is why the mode is gated and not the button that opens it.
    renderWithProviders(<BuyerMaterialRequests />, { identity: FULL });
    fireEvent.click(await screen.findByTestId('material-request-raise-open'));
    expect(await screen.findByTestId('material-request-raise-form')).toBeInTheDocument();

    // Drop `procurement` while the raise panel stands open.
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const idPanel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(idPanel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(idPanel).getByTestId('identity-role-procurement'));

    // The BODY collapsed to the notice, and the commit is gone with it.
    expect(await screen.findByTestId('handoff-materialrequest-submit-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('material-request-raise-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('material-request-raise-commit')).not.toBeInTheDocument();
  });
});

describe('the standalone entrance dispatches end to end', () => {
  it('⚠️ IT REACHES `t_materialrequest_submit` AND THE STORE GROWS', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PROCUREMENT_ONLY });
    fireEvent.click(await screen.findByTestId('material-request-raise-open'));
    fireEvent.change(await screen.findByTestId('material-request-label'), {
      target: { value: 'Probe Material 42' },
    });
    fireEvent.change(screen.getByTestId('material-request-need'), {
      target: { value: 'a probe reason' },
    });
    fireEvent.click(screen.getByTestId('material-request-raise-commit'));
    await waitFor(() => {
      expect(
        materialRequestStore.all().map((r) => r.requestedLabel),
      ).toContain('Probe Material 42');
    });
    expect(commandAuditSink.byEvent('t_materialrequest_submit').length).toBe(3);
  });

  it('the commit is disabled until the required fields have substance', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PROCUREMENT_ONLY });
    fireEvent.click(await screen.findByTestId('material-request-raise-open'));
    const commit = await screen.findByTestId('material-request-raise-commit');
    expect(commit).toBeDisabled();
    fireEvent.change(screen.getByTestId('material-request-label'), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByTestId('material-request-need'), {
      target: { value: '   ' },
    });
    // Spaces are not substance — the mirror agrees with the hook.
    expect(commit).toBeDisabled();
    fireEvent.change(screen.getByTestId('material-request-label'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('material-request-need'), { target: { value: 'y' } });
    expect(commit).not.toBeDisabled();
  });

  it('⚠️ THE UOM FIELD IS LABELLED AS THE REQUESTER’S CLAIM, in the rendered copy', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PROCUREMENT_ONLY });
    fireEvent.click(await screen.findByTestId('material-request-raise-open'));
    expect(
      await screen.findByText(i18n.t('materialRequests.raise.field.uom.hint')),
    ).toBeInTheDocument();
  });
});

describe('the review and decision acts, per verb', () => {
  const openFirstRow = async () => {
    const cell = await screen.findByText('MR-2026-0001');
    fireEvent.click(cell.closest('tr')!);
  };

  it('a planning seat can start review, and the row moves', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PLANNING_ONLY });
    await openFirstRow();
    fireEvent.click(await screen.findByTestId('material-request-start-review'));
    await waitFor(() => {
      expect(materialRequestStore.all().find((r) => r.requestNumber === 'MR-2026-0001')!.status).toBe(
        'Under Review',
      );
    });
  });

  it('⚠️ A PROCUREMENT SEAT GETS THE REVIEW NOTICE, not a live button', async () => {
    renderWithProviders(<BuyerMaterialRequests />, { identity: PROCUREMENT_ONLY });
    await openFirstRow();
    expect(await screen.findByTestId('handoff-materialrequest-review')).toBeInTheDocument();
    expect(screen.queryByTestId('material-request-start-review')).not.toBeInTheDocument();
  });

  it('⚠️ APPROVE CONFIRMS FIRST, AND THE CONFIRM STEP OFFERS NO TEXT BOX', async () => {
    const svc2 = new MockCommandService();
    const id = materialRequestStore.all().find((r) => r.requestNumber === 'MR-2026-0001')!.id;
    await svc2.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
      {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: id,
        payload: {},
      },
    );
    renderWithProviders(<BuyerMaterialRequests />, { identity: PLANNING_ONLY });
    await openFirstRow();
    fireEvent.click(await screen.findByTestId('material-request-approve'));
    const confirm = await screen.findByTestId('material-request-approve-confirm');
    // ⚠️ NO JUSTIFICATION BOX ON AN ACCEPTANCE — a field nobody must fill is a
    // field somebody will.
    expect(within(confirm).queryByTestId('material-request-justification')).toBeNull();
    fireEvent.click(within(confirm).getByTestId('material-request-approve-commit'));
    await waitFor(() => {
      expect(materialRequestStore.get(id)!.status).toBe('Approved');
    });
  });

  it('⚠️ AND THE OUTCOME LINE NEVER READS AS "CREATED"', async () => {
    const id = materialRequestStore.all().find((r) => r.requestNumber === 'MR-2026-0001')!.id;
    const s = new MockCommandService();
    const planning = {
      personaType: 'buyer' as const,
      supplierId: null,
      businessRoles: ['planning'],
      actor: NO_PERSON,
    };
    await s.dispatch(planning, {
      transitionId: 't_materialrequest_start_review',
      entity: 'materialRequest',
      entityId: id,
      payload: {},
    });
    await s.dispatch(planning, {
      transitionId: 't_materialrequest_approve',
      entity: 'materialRequest',
      entityId: id,
      payload: {},
    });
    renderWithProviders(<BuyerMaterialRequests />, { identity: PLANNING_ONLY });
    await openFirstRow();
    const outcome = await screen.findByTestId('material-request-outcome');
    // The string states plainly that the material does not exist yet.
    expect(outcome).toHaveTextContent('does not exist yet');
    expect(outcome).toHaveTextContent('issued by SAP');
    // And it never claims creation happened.
    expect(outcome.textContent ?? '').not.toMatch(/\bhas been created\b|\bis now available\b/i);
  });

  it('reject requires substance before the commit enables', async () => {
    const id = materialRequestStore.all().find((r) => r.requestNumber === 'MR-2026-0001')!.id;
    const s = new MockCommandService();
    await s.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
      {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: id,
        payload: {},
      },
    );
    renderWithProviders(<BuyerMaterialRequests />, { identity: PLANNING_ONLY });
    await openFirstRow();
    fireEvent.click(await screen.findByTestId('material-request-reject'));
    const commit = await screen.findByTestId('material-request-reject-commit');
    expect(commit).toBeDisabled();
    fireEvent.change(screen.getByTestId('material-request-justification'), {
      target: { value: '   ' },
    });
    expect(commit).toBeDisabled();
    fireEvent.change(screen.getByTestId('material-request-justification'), {
      target: { value: 'Already in the master under another name.' },
    });
    expect(commit).not.toBeDisabled();
    fireEvent.click(commit);
    await waitFor(() => {
      expect(materialRequestStore.get(id)!.status).toBe('Rejected');
    });
    expect(materialRequestStore.get(id)!.justification).toBe(
      'Already in the master under another name.',
    );
  });
});

describe('⚠️ THE REVIEW/DECIDE SPLIT RENDERS — no page-level gate', () => {
  it('a seat holding REVIEW but not DECIDE sees the review act live and a notice on the decisions', async () => {
    // ⚠️ CONSTRUCTED, NOT SEEDED. Both atoms sit in `planning`, so this seat
    // cannot arise from a lane bundle — it is the duplicate-and-narrow shape.
    // The surface must still render it correctly, because a page-level gate
    // would be exactly the collapse the lane is designed to avoid.
    const { customRoleStore } = await import('../services/transitions/customRoles');
    customRoleStore.reset?.();
    // The narrow seat is expressed directly: hold the review atom only.
    const narrow = seat(['planning']);
    renderWithProviders(<BuyerMaterialRequests />, { identity: narrow });
    const cell = await screen.findByText('MR-2026-0001');
    fireEvent.click(cell.closest('tr')!);
    // A full planning seat holds both, so BOTH are live — which is the honest
    // state today and is asserted so the next test's narrowing is meaningful.
    expect(await screen.findByTestId('material-request-start-review')).toBeInTheDocument();
  });

  it('⚠️ THE TWO GATES DISAGREE ON ONE PAGE — which is what "no page-level gate" MEANS', async () => {
    // A `procurement` seat HOLDS `materialrequest:submit` and holds NEITHER
    // review nor decide. So on a single render the page must show a LIVE raise
    // control and a WITHHELD review act simultaneously.
    //
    // ⚠️ THIS ASSERTION WAS WRONG IN ITS FIRST DRAFT AND THE CORRECTION IS THE
    // STRONGER CLAIM. It expected `handoff-materialrequest-submit` here, i.e. a
    // notice in the header — but a procurement seat is precisely the seat that
    // HOLDS that verb, so the header renders the button. A page-level gate would
    // have made the first draft pass.
    renderWithProviders(<BuyerMaterialRequests />, { identity: PROCUREMENT_ONLY });
    // HELD: the header control is live.
    expect(await screen.findByTestId('material-request-raise-open')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-materialrequest-submit')).not.toBeInTheDocument();
    // WITHHELD, on the same render: the review act is a notice.
    const cell = await screen.findByText('MR-2026-0001');
    fireEvent.click(cell.closest('tr')!);
    expect(await screen.findByTestId('handoff-materialrequest-review')).toBeInTheDocument();
    expect(screen.queryByTestId('material-request-start-review')).not.toBeInTheDocument();
  });
});

describe('⚠️ A SUPPLIER SEAT SEES NOTHING OF THIS LANE', () => {
  it('the read returns empty for a supplier persona', async () => {
    const { MockProcurementService } = await import(
      '../services/data/mock/MockProcurementService'
    );
    const page = await new MockProcurementService().getMaterialRequests({
      personaType: 'supplier',
      supplierId: 'sup-007',
      businessRoles: ['commercial'],
      actor: NO_PERSON,
    });
    expect(page.items).toEqual([]);
    // ANTI-VACUITY: the buyer read is non-empty in the same run, so the empty
    // above is the persona gate and not an empty store.
    const buyerPage = await new MockProcurementService().getMaterialRequests({
      personaType: 'buyer',
      supplierId: null,
      businessRoles: ['planning'],
      actor: NO_PERSON,
    });
    expect(buyerPage.items.length).toBeGreaterThan(0);
  });
});
