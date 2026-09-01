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
import { mockSuppliers } from '../data/mockSuppliers';
import { seedSupplierApplications } from '../services/data/mock/applicationSeed';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { NO_PERSON } from '../context/noPerson';
import {
  useCurrentIdentity,
  type CurrentIdentity,
} from '../context/CurrentIdentityContext';
import {
  customRoleStore,
  atomsForSeat,
  type CustomRoleDefinition,
} from '../services/transitions/customRoles';
import type { QueryScope } from '../services/data/types';

/**
 * B3 · the lane that RAISES and decides nothing.
 *
 * ⚠️ **THIS SEAT IS THE POINT OF THE WHOLE SEGREGATION, AND IT IS SEEDED —
 * unlike the review-only seat below, which had to be built out of a custom
 * role.** `application:submit` is `procurement`'s; the two review atoms are
 * `compliance`'s. So procurement and compliance are a BILATERAL PAIR here:
 * each holds exactly what the other does not, and a page that collapsed the
 * door into the review gate would fail in both directions rather than one.
 */
const PROCUREMENT_SEAT: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

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

/**
 * ⚠️ **THE §84 INSTRUMENT, AND IT USES THE PLATFORM'S OWN API RATHER THAN
 * REACHING AROUND IT.** `CurrentIdentityProvider` reads its source ONCE (a lazy
 * `useState` initialiser), so re-rendering with a different source proves
 * nothing — but it publishes `setIdentity` on the context, which is exactly how
 * the identity panel narrows a seat in the running app.
 *
 * Rendered as a SIBLING of the page, it narrows the seat WITHOUT unmounting the
 * page — so the panel's `raiseOpen` state survives, which is the whole scenario:
 * a seat narrowed while a panel stands open is REACHABLE, not a dead branch.
 * `SupplierOrders` shipped a live commit behind a comment asserting otherwise.
 */
const NarrowTheSeat: React.FC<{ to: CurrentIdentity }> = ({ to }) => {
  const { setIdentity } = useCurrentIdentity();
  return (
    <button type="button" data-testid="probe-narrow-seat" onClick={() => setIdentity(to)}>
      narrow
    </button>
  );
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

  it('⚠️ THE CREATE VERB IS GATED ON ITS OWN ATOM, NOT THE REVIEW GATE', async () => {
    // `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`, stated as an assertion
    // rather than as an absence: the create verb acts on NO SELECTED ROW and
    // lives in the page header, so a derivation that walks the panel's verbs
    // cannot see it. The seat below holds BOTH review atoms and NEITHER door
    // atom — so if the door were behind the review gate, this would pass with
    // a live button.
    renderWithProviders(<BuyerSupplierApplications />, { identity: COMPLIANCE_SEAT });
    await screen.findByText(supplierApplicationStore.all()[0].applicationNumber);
    expect(screen.queryByTestId('application-raise-open')).toBeNull();
    expect(screen.getByTestId('handoff-application-submit')).toBeInTheDocument();
    // And the form is nowhere on the page — §84: the MODE is gated, not just
    // the button that opens it, so a seat narrowed while the panel stands open
    // has no reachable commit either.
    expect(screen.queryByTestId('application-raise-form')).toBeNull();
  });

  it('⚠️ AND THE OTHER HALF OF THE PAIR — procurement raises, and reviews nothing', async () => {
    // The bilateral control. Without it, a page that gated the door on the
    // WRONG atom would still pass the test above.
    renderWithProviders(<BuyerSupplierApplications />, { identity: PROCUREMENT_SEAT });
    expect(await screen.findByTestId('application-raise-open')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-application-submit')).toBeNull();

    // WALKED TO THE STATE: the review verb is withheld from this same seat, in
    // its own slot, on a row this seat can see.
    await openRow(supplierApplicationStore.all()[0].applicationNumber);
    expect(await screen.findByTestId('handoff-application-review')).toBeInTheDocument();
    expect(screen.queryByTestId('application-start-review')).toBeNull();
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

// ─────────────────────────────────────────────────────────────────────────────
// B3 · THE DOOR — a buyer raises an application on an applicant's behalf.
//
// ⚠️ **THE AXIS THESE TESTS EXIST FOR IS NOT AVAILABILITY.** Whether the button
// renders is settled above. What the picker decides is whether the application
// can name a vendor the platform CANNOT FIND — and no availability probe
// reaches that, because the seat holding the atom is exactly the seat that
// constructs the payload. That is why the roster-shape assertion and the
// refusal-by-name assertion are both here, and why the picker was
// mutation-probed rather than trusted.
// ─────────────────────────────────────────────────────────────────────────────

/** Open the door and choose a request type. Returns nothing; walks a state. */
async function openDoor(type: string): Promise<void> {
  fireEvent.click(await screen.findByTestId('application-raise-open'));
  fireEvent.change(await screen.findByTestId('application-raise-type'), {
    target: { value: type },
  });
}

describe('B3 · the door', () => {
  it('⚠️ M1 — THE VENDOR IS A PICKER OVER THE GOVERNED ROSTER, NEVER A TEXT BOX', async () => {
    renderWithProviders(<BuyerSupplierApplications />, { identity: PROCUREMENT_SEAT });
    await openDoor('Internal SR');

    const control = await screen.findByTestId('application-raise-vendor');
    // The mutation target. Flipping this control to an input is what the probe
    // does, and this is the assertion that dies when it does.
    expect(control.tagName).toBe('SELECT');

    const offered = Array.from((control as HTMLSelectElement).options)
      .map((o) => o.value)
      .filter((v) => v !== '');
    const roster = mockSuppliers.map((s) => s.sapBpNumber);

    // MEMBERSHIP BOTH WAYS, not a count: every value the control can produce is
    // on the roster, and the roster is fully offered. A count would pass over
    // two sets of the same size that share no members.
    expect(offered.length).toBeGreaterThan(0);
    for (const v of offered) expect(roster).toContain(v);
    for (const bp of roster) expect(offered).toContain(bp);
  });

  it('⚠️ AND THE REFUSAL IT MAKES UNREACHABLE STILL FIRES, BY NAME', async () => {
    // The picker is why an unknown vendor cannot be submitted from this page.
    // It is NOT why an unknown vendor is refused — the dispatcher is, and this
    // asserts the dispatcher directly, so deleting the picker could never
    // silently delete the guarantee. `EMPTY-INPUT-REPORTS-CLEAN-01`: the
    // known-GOOD control runs in the same test as the known-BAD one.
    const procurementScope: QueryScope = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: ['procurement'],
      actor: NO_PERSON,
    };

    const good = await commands.dispatch(procurementScope, {
      transitionId: 't_application_submit',
      entity: 'supplierApplication',
      payload: {
        requestType: 'Internal SR',
        companyName: mockSuppliers[0].name,
        s4Vendor: mockSuppliers[0].sapBpNumber,
      },
    });
    expect(good.status, good.reason).toBe('done');

    const bad = await commands.dispatch(procurementScope, {
      transitionId: 't_application_submit',
      entity: 'supplierApplication',
      payload: {
        requestType: 'Internal SR',
        companyName: 'PT Nowhere (illustrative)',
        // The shape `/register` taught in a placeholder for two years, against
        // a space that holds zero rows.
        s4Vendor: '1000456',
      },
    });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/resolves to no vendor/i);
  });

  it('an Internal SR is raised through the picker, and the row RESOLVES', async () => {
    const before = supplierApplicationStore.all().length;
    const vendor = mockSuppliers[0];

    renderWithProviders(<BuyerSupplierApplications />, { identity: PROCUREMENT_SEAT });
    await openDoor('Internal SR');
    fireEvent.change(await screen.findByTestId('application-raise-vendor'), {
      target: { value: vendor.sapBpNumber },
    });
    fireEvent.click(await screen.findByTestId('application-raise-next'));

    // CONFIRM BEFORE COMMIT — and the reader is shown the NAME it resolved to,
    // beside the id it resolved from. A picker cannot refuse the WRONG vendor,
    // only an absent one; only a reader catches that.
    const confirm = await screen.findByTestId('application-raise-confirm');
    // TWICE, and that is the assertion rather than an accident of markup: the
    // Company row and the Existing-vendor row must agree, because the company
    // name on this path is DERIVED from the vendor rather than typed beside it.
    expect(within(confirm).getAllByText(vendor.name).length).toBeGreaterThanOrEqual(2);
    expect(within(confirm).getByText(vendor.sapBpNumber)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('application-raise-commit'));

    await waitFor(() =>
      expect(supplierApplicationStore.all().length).toBe(before + 1),
    );
    const raised = supplierApplicationStore.all()[0];
    expect(raised.requestType).toBe('Internal SR');
    // ⚠️ THE COMPANY NAME IS THE VENDOR'S, because it is DERIVED rather than
    // typed. A record that named `BP-10001234` and some other company would
    // disagree with itself and nothing downstream could say which half is
    // wrong.
    expect(raised.companyName).toBe(vendor.name);
    expect(raised.s4Vendor).toBe(vendor.sapBpNumber);
    expect(raised.resolvedSupplierId).toBe(vendor.id);
    expect(raised.status).toBe('Submitted');
    expect(raised.submittedBy).toEqual(NO_PERSON);
    expect(raised.applicationNumber).toMatch(/^APP-2026-\d{4}$/);
  });

  it('an External SR names no identifier space — free text, and nothing resolves', async () => {
    const before = supplierApplicationStore.all().length;

    renderWithProviders(<BuyerSupplierApplications />, { identity: PROCUREMENT_SEAT });
    await openDoor('External SR');

    // The vendor picker is ABSENT on this path, and that is the ruling: the two
    // vendor-free types touch no roster at all.
    expect(screen.queryByTestId('application-raise-vendor')).toBeNull();

    fireEvent.change(await screen.findByTestId('application-raise-company'), {
      target: { value: 'PT Sample Newcomer (illustrative)' },
    });
    // One declaration filled, three left blank — the blanks must be DROPPED,
    // not stored as empty references.
    fireEvent.change(screen.getByTestId('application-raise-declaration-npwp'), {
      target: { value: 'SAMPLE-NPWP-7788' },
    });
    fireEvent.click(screen.getByTestId('application-raise-next'));
    fireEvent.click(await screen.findByTestId('application-raise-commit'));

    await waitFor(() =>
      expect(supplierApplicationStore.all().length).toBe(before + 1),
    );
    const raised = supplierApplicationStore.all()[0];
    expect(raised.requestType).toBe('External SR');
    expect(raised.companyName).toBe('PT Sample Newcomer (illustrative)');
    expect(raised.s4Vendor).toBeNull();
    expect(raised.resolvedSupplierId).toBeNull();
    expect(raised.declarations).toEqual([
      { kind: 'npwp', reference: 'SAMPLE-NPWP-7788' },
    ]);
  });

  it('the door cannot commit an incomplete application', async () => {
    renderWithProviders(<BuyerSupplierApplications />, { identity: PROCUREMENT_SEAT });
    fireEvent.click(await screen.findByTestId('application-raise-open'));
    // No request type chosen — the review step is unreachable, so the commit
    // one state past it is unreachable too.
    expect(await screen.findByTestId('application-raise-next')).toBeDisabled();

    fireEvent.change(screen.getByTestId('application-raise-type'), {
      target: { value: 'Internal SR' },
    });
    // Type chosen, vendor not — still unreachable, and this is the half a
    // required-fields list could not express (`s4Vendor` is required for ONE
    // of three types).
    expect(screen.getByTestId('application-raise-next')).toBeDisabled();
  });

  it('the raised row lands in the queue the reviewer reads', async () => {
    // The two halves of the lane meet: what procurement raises, compliance
    // sees. Without this the door could be writing into a store nothing lists.
    renderWithProviders(<BuyerSupplierApplications />, { identity: PROCUREMENT_SEAT });
    await openDoor('KOL');
    fireEvent.change(await screen.findByTestId('application-raise-company'), {
      target: { value: 'PT Sample Creator Two (illustrative)' },
    });
    fireEvent.click(screen.getByTestId('application-raise-next'));
    fireEvent.click(await screen.findByTestId('application-raise-commit'));

    const number = await waitFor(() => {
      const row = supplierApplicationStore
        .all()
        .find((a) => a.companyName === 'PT Sample Creator Two (illustrative)');
      expect(row).toBeDefined();
      return row!.applicationNumber;
    });

    expect(await screen.findByTestId(`application-row-${number}`)).toBeInTheDocument();
  });
  it('⚠️ §84 — THE MODE IS GATED, SO A SEAT NARROWED MID-PANEL LOSES THE COMMIT', async () => {
    renderWithProviders(
      <>
        <BuyerSupplierApplications />
        <NarrowTheSeat to={COMPLIANCE_SEAT} />
      </>,
      { identity: PROCUREMENT_SEAT },
    );

    fireEvent.click(await screen.findByTestId('application-raise-open'));
    // CONTROL FIRST: the form really is open, so the disappearance below means
    // something. Without this the test passes against a page with no form.
    expect(await screen.findByTestId('application-raise-form')).toBeInTheDocument();

    // The seat narrows while the panel stands open — no navigation, no remount.
    fireEvent.click(screen.getByTestId('probe-narrow-seat'));

    await waitFor(() =>
      expect(screen.queryByTestId('application-raise-form')).toBeNull(),
    );
    // And it does not go SILENT — the notice takes the slot, naming the lane.
    expect(screen.getByTestId('handoff-application-submit-panel')).toBeInTheDocument();
    // The commit is gone with it, not merely hidden behind a disabled button.
    expect(screen.queryByTestId('application-raise-commit')).toBeNull();
    expect(screen.queryByTestId('application-raise-next')).toBeNull();
  });
});
