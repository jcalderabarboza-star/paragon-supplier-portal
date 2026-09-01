// ────────────────────────────────────────────────────────────────────────────
// B2 · THE BUYER REVIEW LANE — the surface.
//
// ⚠️ **EVERY ASSERTION WALKS TO THE STATE WHERE ITS CONTROL RENDERS, AND THAT
// IS NOT BOILERPLATE.** `SidePanel` (#280) does not mount a closed panel's
// subtree, so a query for a control before opening a row finds nothing — and
// "not found" is what a WITHHELD control looks like too. A spec that skipped
// the walk would pass identically against a page that gated correctly, a page
// that gated on the wrong atom, and a page with no controls at all. That lesson
// has now fired five times in this repository, most recently caused by our own
// SidePanel fix.
//
// So: open the row, THEN assert. And for a decision, open the row AND the
// confirm step, because the commit button lives one state deeper again.
//
// ⚠️ **THE STORE IS RESET AND RE-GROWN PER TEST.** Rows are produced by the
// real verb through `seedSupplierApplications`, never stamped — the store's
// empty seed is what makes an empty page the honest default, and a stamped row
// would carry a `submittedAt` nobody submitted at.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

import BuyerSupplierApplications from './BuyerSupplierApplications';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { supplierApplicationStore } from '../services/data/mock/stores/supplierApplicationStore';
import { seedSupplierApplications } from '../services/data/mock/applicationSeed';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import {
  customRoleStore,
  atomsForSeat,
  type CustomRoleDefinition,
} from '../services/transitions/customRoles';
import type { QueryScope } from '../services/data/types';

/** The lane that reviews AND decides — compliance holds both atoms. */
const COMPLIANCE_SEAT: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/**
 * A buyer seat holding NEITHER application atom.
 *
 * `planning` is a real seeded lane that holds no `application:*` — derived, not
 * invented, so this seat is one a person can actually hold. It is what proves
 * the withheld half: the page must render a notice naming compliance, never an
 * absent affordance and never a live button the dispatcher would refuse.
 */
const NO_APPLICATION_ATOMS_SEAT: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['planning'],
  actor: NO_PERSON,
};

/**
 * ⚠️ **THE SEAT THE RULING NAMES — REVIEW BUT NOT DECIDE — AND IT TOOK THE
 * CUSTOM-ROLE PATH TO BUILD, WHICH IS ITSELF THE FINDING.**
 *
 * Both application atoms live in ONE bundle (`compliance`), and a custom role
 * only ever WIDENS (`{parent, adds}` — additive by construction). So there is
 * no way to narrow compliance down to review-only, and **no seeded seat has
 * this shape.** It is reachable exactly one way: take a parent that holds
 * NEITHER atom and add back only `application:review`.
 *
 * That is the platform's own duplicate-and-narrow mechanism, not a test
 * fixture reaching around it — `atomsForSeat` resolves it the same way a real
 * session does. Without it, the ruling's seat would be untestable, and a page
 * that collapsed the two verbs into one gate would pass every other test here.
 */
const REVIEW_ONLY_ROLE: CustomRoleDefinition = {
  id: 'onboarding-reviewer',
  parent: 'planning',
  displayName: 'Onboarding reviewer',
  description: 'Picks applications up; decides none of them.',
  adds: ['application:review'],
  parentAtomsAtGrant: [],
  grantedBy: NO_PERSON,
  grantedAt: '2026-09-01T00:00:00.000Z',
};

const REVIEW_ONLY_SEAT: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: [REVIEW_ONLY_ROLE.id],
  actor: NO_PERSON,
};

const commands = new MockCommandService();
const complianceScope: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/** Walk one seeded row to `Under Review` through the real verb. */
async function pickUpFirst(): Promise<string> {
  const first = supplierApplicationStore.all()[supplierApplicationStore.all().length - 1];
  const res = await commands.dispatch(complianceScope, {
    transitionId: 't_application_start_review',
    entity: 'supplierApplication',
    entityId: first.id,
    payload: {},
  });
  expect(res.status, res.reason).toBe('done');
  return first.applicationNumber;
}

const openRow = async (number: string): Promise<void> => {
  fireEvent.click(await screen.findByTestId(`application-row-${number}`));
};

beforeEach(async () => {
  customRoleStore.reset();
  supplierApplicationStore.reset();
  const outcome = await seedSupplierApplications(commands);
  expect(outcome.status).toBe('seeded');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('CONTROL — the seed grew rows THROUGH THE VERB, and they sit at Submitted', () => {
    const rows = supplierApplicationStore.all();
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) {
      expect(r.status).toBe('Submitted');
      // Grown, not stamped: a dispatched creation attributes from the session
      // and mints its own number.
      expect(r.submittedBy).toEqual(NO_PERSON);
      expect(r.applicationNumber).toMatch(/^APP-2026-\d{4}$/);
    }
  });

  it('CONTROL — the empty state is reachable, so a row on screen means something', async () => {
    supplierApplicationStore.reset();
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    expect(await screen.findByText(/nobody has applied/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the collection renders', () => {
  it('lists the grown applications with their real numbers', async () => {
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    for (const row of supplierApplicationStore.all()) {
      expect(await screen.findByText(row.applicationNumber)).toBeInTheDocument();
      expect(screen.getByText(row.companyName)).toBeInTheDocument();
    }
  });

  it('⚠️ A SUPPLIER SEAT SEES NO COLLECTION — buyer-only at the seam', async () => {
    renderWithProviders(<BuyerSupplierApplications />, { identity: SUPPLIER });
    expect(await screen.findByText(/nobody has applied/i)).toBeInTheDocument();
    // And no row leaked through under any other label.
    for (const row of supplierApplicationStore.all()) {
      expect(screen.queryByText(row.applicationNumber)).not.toBeInTheDocument();
    }
  });

  it('⚠️ NO CREATE AFFORDANCE — t_application_submit is B3s door, not this page', async () => {
    renderWithProviders(<BuyerSupplierApplications />, { identity: BUYER });
    await screen.findByText(supplierApplicationStore.all()[0].applicationNumber);
    // The `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` shape: a create verb in a
    // page header beside guarded document verbs. There must not be one.
    expect(screen.queryByRole('button', { name: /new application|raise|apply/i })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the walk — pick it up, then decide it', () => {
  it('Submitted → Under Review, and the pill moves', async () => {
    const number = supplierApplicationStore.all()[0].applicationNumber;
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await openRow(number);

    // WALKED TO THE STATE: the panel is mounted, so the control exists.
    fireEvent.click(await screen.findByTestId('application-start-review'));

    await waitFor(() =>
      expect(
        supplierApplicationStore.all().find((a) => a.applicationNumber === number)!.status,
      ).toBe('Under Review'),
    );
  });

  it('Under Review → Approved, behind a confirmation, with no reason box', async () => {
    const number = await pickUpFirst();
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await openRow(number);

    fireEvent.click(await screen.findByTestId('application-approve'));
    // One state deeper: the confirm step.
    const confirm = await screen.findByTestId('application-approve-confirm');
    // ⚠️ APPROVAL HAS NOTHING TO AUTHOR, so it is given no box to type in.
    expect(within(confirm).queryByRole('textbox')).toBeNull();

    fireEvent.click(screen.getByTestId('application-approve-commit'));

    await waitFor(() =>
      expect(
        supplierApplicationStore.all().find((a) => a.applicationNumber === number)!.status,
      ).toBe('Approved'),
    );
    const row = supplierApplicationStore.all().find((a) => a.applicationNumber === number)!;
    expect(row.decidedBy).toEqual(NO_PERSON);
    expect(row.decidedAt).toBeTruthy();
    // Terminal in v1: the decision is recorded and NOTHING is minted.
    expect(row.supplierId).toBeNull();
  });

  it('Under Review → Rejected, and the reason is REQUIRED then PERSISTED', async () => {
    const number = await pickUpFirst();
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await openRow(number);

    fireEvent.click(await screen.findByTestId('application-reject'));
    const commit = await screen.findByTestId('application-reject-commit');

    // ⚠️ THE COMMIT IS SHUT UNTIL SOMEBODY WRITES SOMETHING — the courtesy
    // mirror of `APPLICATION_REFUSAL_AUTHORED`, which stands behind any caller
    // that never renders this box.
    expect(commit).toBeDisabled();

    // A string of spaces is not an authored reason: `isEmpty('   ')` is false,
    // so `requiredFields` alone would admit it.
    fireEvent.change(screen.getByTestId('application-reject-reason'), {
      target: { value: '   ' },
    });
    expect(screen.getByTestId('application-reject-commit')).toBeDisabled();

    fireEvent.change(screen.getByTestId('application-reject-reason'), {
      target: { value: 'No NIB on file and the tax id does not match the legal name.' },
    });
    expect(screen.getByTestId('application-reject-commit')).toBeEnabled();
    fireEvent.click(screen.getByTestId('application-reject-commit'));

    await waitFor(() =>
      expect(
        supplierApplicationStore.all().find((a) => a.applicationNumber === number)!.status,
      ).toBe('Rejected'),
    );
    expect(
      supplierApplicationStore.all().find((a) => a.applicationNumber === number)!.rejectionReason,
    ).toBe('No NIB on file and the tax id does not match the legal name.');
  });

  it('a decided application offers no further act — Approved is terminal in v1', async () => {
    const number = await pickUpFirst();
    const id = supplierApplicationStore.all().find((a) => a.applicationNumber === number)!.id;
    await commands.dispatch(complianceScope, {
      transitionId: 't_application_approve',
      entity: 'supplierApplication',
      entityId: id,
      payload: {},
    });

    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await openRow(number);

    // Walked to the state, panel mounted — and none of the three acts is here.
    expect(await screen.findByText(/decided by/i)).toBeInTheDocument();
    expect(screen.queryByTestId('application-start-review')).toBeNull();
    expect(screen.queryByTestId('application-approve')).toBeNull();
    expect(screen.queryByTestId('application-reject')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SEGREGATION RENDERS — per-verb, never per-page', () => {
  it('HELD — a compliance seat reaches the review act and reads NO notice', async () => {
    const number = supplierApplicationStore.all()[0].applicationNumber;
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await openRow(number);

    expect(await screen.findByTestId('application-start-review')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-application-review')).toBeNull();
  });

  it('HELD — a compliance seat reaches BOTH decisions and reads no notice', async () => {
    const number = await pickUpFirst();
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await openRow(number);

    expect(await screen.findByTestId('application-approve')).toBeInTheDocument();
    expect(screen.getByTestId('application-reject')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-application-decide')).toBeNull();
  });

  it('WITHHELD — a seat with neither atom reads a notice INSTEAD of the review act', async () => {
    const number = supplierApplicationStore.all()[0].applicationNumber;
    renderWithProviders(<BuyerSupplierApplications />, {
      identity: NO_APPLICATION_ATOMS_SEAT,
    });
    await openRow(number);

    // Pending WITH AN OWNER — never an absent affordance.
    const notice = await screen.findByTestId('handoff-application-review');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    // …and the act itself is not offered.
    expect(screen.queryByTestId('application-start-review')).toBeNull();
  });

  it('WITHHELD — the same seat reads a notice instead of the two decisions', async () => {
    const number = await pickUpFirst();
    renderWithProviders(<BuyerSupplierApplications />, {
      identity: NO_APPLICATION_ATOMS_SEAT,
    });
    await openRow(number);

    const notice = await screen.findByTestId('handoff-application-decide');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(screen.queryByTestId('application-approve')).toBeNull();
    expect(screen.queryByTestId('application-reject')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ THE RULING'S SEAT — review WITHOUT decide", () => {
  beforeEach(() => customRoleStore.append(REVIEW_ONLY_ROLE));

  it('CONTROL — the seat really does hold review and really does NOT hold decide', () => {
    // Rule 4: prove the fixture before believing what the page does with it. A
    // custom role that failed to resolve would make every assertion below pass
    // for the wrong reason — it would look exactly like a withheld seat.
    const atoms = atomsForSeat([REVIEW_ONLY_ROLE.id]);
    expect(atoms).toContain('application:review');
    expect(atoms).not.toContain('application:decide');
  });

  it('sees the review act LIVE — never withheld', async () => {
    const number = supplierApplicationStore.all()[0].applicationNumber;
    renderWithProviders(<BuyerSupplierApplications />, { identity: REVIEW_ONLY_SEAT });
    await openRow(number);

    expect(await screen.findByTestId('application-start-review')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-application-review')).toBeNull();
  });

  it('⚠️ AND READS A NOTICE ON THE DECISIONS — pending WITH AN OWNER', async () => {
    // The half a page-level gate would get wrong: same seat, same row, other
    // verb. A collapsed gate would either show both or hide both.
    const number = await pickUpFirst();
    renderWithProviders(<BuyerSupplierApplications />, { identity: REVIEW_ONLY_SEAT });
    await openRow(number);

    const notice = await screen.findByTestId('handoff-application-decide');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(notice.textContent).toMatch(/compliance/i);
    expect(screen.queryByTestId('application-approve')).toBeNull();
    expect(screen.queryByTestId('application-reject')).toBeNull();
  });
});
