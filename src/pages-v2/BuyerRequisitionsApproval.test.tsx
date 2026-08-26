// ────────────────────────────────────────────────────────────────────────────
// §67 — THE APPROVAL SURFACE. The route and the hook, not a page.
//
// `BuyerRequisitions` already rendered the list, the detail, the status and the
// line facts. What it did not do was CONNECT ANY OF IT TO THE VERBS: three
// buttons occupied the commit slot and dispatched nothing, and `t_pr_approve` /
// `t_pr_reject` had no call site anywhere in the tree. These specs pin the
// connection, both role directions, and the three retirements.
//
// ⚠️ RULE 4: the known-GOOD path is asserted FIRST in each pair. A gate that is
// wrong about what it ACCEPTS ships looking like a working gate, and "the
// button is absent" is indistinguishable from "the panel never opened".
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import BuyerRequisitions from './BuyerRequisitions';

/** A seat that RAISES requisitions and cannot decide them. */
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };
/** A seat that DECIDES them and cannot raise them. */
const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };

/** The seeded fixture already in the approval queue. */
const PENDING_PR = 'PR-2026-00344';

const openPending = async () => {
  await screen.findByText('Purchase Requisitions');
  fireEvent.click(await screen.findByText(PENDING_PR));
  await screen.findByText(`PR ${PENDING_PR}`);
};

beforeEach(() => {
  purchaseRequisitionStore.reset();
});

describe('§67 · the population this file rests on', () => {
  it('⚠️ FIRST — the fixture is in Pending Approval and the panel opens on it', async () => {
    // Every "the button is absent" claim below is meaningless if the panel
    // never opened. This is the membership assertion that makes them readable.
    expect(purchaseRequisitionStore.get('pr-004')!.status).toBe('Pending Approval');
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openPending();
    expect(screen.getByTestId('pr-approve')).toBeInTheDocument();
  });
});

describe('§67 · approve — reachable at last', () => {
  it('✅ procurement approves, and the STORE moves — not just the toast', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openPending();

    fireEvent.click(screen.getByTestId('pr-approve'));

    await waitFor(() =>
      expect(purchaseRequisitionStore.get('pr-004')!.status).toBe('Approved'),
    );
  });

  it('the default buyer seat can approve too — it holds procurement today', async () => {
    renderWithProviders(<BuyerRequisitions />);
    await openPending();
    expect(screen.getByTestId('pr-approve')).toBeInTheDocument();
  });
});

describe('⚠️ §67 · THE WAIT IS RENDERED, NOT A GAP', () => {
  it('a REQUISITIONER sees "Awaiting Procurement" — never an empty footer', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await openPending();

    // No affordance for an act this seat cannot take …
    expect(screen.queryByTestId('pr-approve')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pr-reject-open')).not.toBeInTheDocument();
    // … and the OWNER is named for both verbs, which is the binding constraint.
    const approveWait = screen.getByTestId('handoff-pr-approve');
    expect(approveWait).toHaveAttribute('data-handoff', 'withheld');
    expect(approveWait.textContent).toMatch(/Procurement/);
    expect(screen.getByTestId('handoff-pr-reject')).toHaveAttribute('data-handoff', 'withheld');
  });

  it('and the seat that HOLDS the atom gets no handoff notice — the other direction', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openPending();
    expect(screen.queryByTestId('handoff-pr-approve')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-pr-reject')).not.toBeInTheDocument();
  });
});

describe('⚠️ §67 · REJECT CARRIES ITS REASON, AND THE COMMIT IS DISABLED UNTIL IT DOES', () => {
  it('the commit is DISABLED on an empty box, and on whitespace', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openPending();

    fireEvent.click(screen.getByTestId('pr-reject-open'));
    const confirm = await screen.findByTestId('pr-reject-confirm');
    // A dismissible capture beside a required field is how a required thing
    // becomes a suggestion. It is not dismissible and it is not pressable.
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId('pr-reject-reason'), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
  });

  it('✅ a real reason ENABLES it, dispatches, and the reason lands ON THE DOCUMENT', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openPending();

    fireEvent.click(screen.getByTestId('pr-reject-open'));
    fireEvent.change(screen.getByTestId('pr-reject-reason'), {
      target: { value: 'Over the Q3 budget envelope.' },
    });
    const confirm = screen.getByTestId('pr-reject-confirm');
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);

    await waitFor(() => {
      const pr = purchaseRequisitionStore.get('pr-004')!;
      expect(pr.status).toBe('Rejected');
      // The half the invoice lane never built: the text is not dropped.
      expect(pr.rejectionReason).toBe('Over the Q3 budget envelope.');
    });
  });

  it('and the recorded reason is READ BACK on the requisition', async () => {
    purchaseRequisitionStore.update('pr-004', (pr) => ({
      ...pr,
      status: 'Rejected',
      rejectionReason: 'Supplier is not halal-certified for this material.',
    }));
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await screen.findByText('Purchase Requisitions');
    fireEvent.click(await screen.findByText(PENDING_PR));

    expect(await screen.findByTestId('pr-rejection-reason')).toHaveTextContent(
      'Supplier is not halal-certified for this material.',
    );
  });
});

describe('⚠️ §67 · THE THREE RETIRED AFFORDANCES ARE GONE, AND SAY WHY', () => {
  it('an APPROVED requisition states its terminality — no button implying a next step', async () => {
    renderWithProviders(<BuyerRequisitions />);
    await screen.findByText('Purchase Requisitions');
    // PR-2026-00342 is the seeded Approved row.
    fireEvent.click(await screen.findByText('PR-2026-00342'));

    // The two cascade verbs have no authored source; the buttons that implied
    // they did are gone, replaced by the statement.
    expect(screen.queryByText('Create PO directly')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Sourcing Event')).not.toBeInTheDocument();
    expect(await screen.findByTestId('pr-approved-terminal')).toBeInTheDocument();
  });

  it('a DRAFT requisition states why nothing here submits it', async () => {
    renderWithProviders(<BuyerRequisitions />);
    await screen.findByText('Purchase Requisitions');
    // PR-2026-00345 is the seeded Draft row.
    fireEvent.click(await screen.findByText('PR-2026-00345'));

    // ⚠️ SITE, NOT TEXT. The first form of this assertion matched
    // `queryByText('Submit for approval')` and failed against the NEW-PR
    // panel's own commit button, which carried the same string for a different
    // verb (`t_pr_create`, which mints a Draft). A text sweep matched a label;
    // the claim needed a SITE. Asserting inside the detail panel's footer is
    // what makes "the retired affordance is gone" mean the retired affordance.
    // (The mislabel it surfaced is fixed separately — that button now says
    // what it does.)
    expect(await screen.findByTestId('pr-draft-note')).toBeInTheDocument();
    // And the seeded Draft offers no decision affordance either — approve and
    // reject do not leave from Draft.
    expect(screen.queryByTestId('pr-approve')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pr-reject-open')).not.toBeInTheDocument();
  });
});

describe('⚠️ §67 · THE CEILING IS STATED BEFORE THE ACT, NOT AFTER IT', () => {
  it('a seat that can decide is told the decision records unattributed', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await openPending();
    expect(screen.getByTestId('pr-attribution-note').textContent).toMatch(/unattributed/i);
  });

  it('a seat that CANNOT decide is not told — the notice belongs to the act, not the page', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await openPending();
    expect(screen.queryByTestId('pr-attribution-note')).not.toBeInTheDocument();
  });
});

describe('§67 · the tenancy boundary is untouched', () => {
  it('a supplier sees no requisitions at all — PRs are buyer-internal', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: SUPPLIER });
    expect(await screen.findByText('No requisitions yet')).toBeInTheDocument();
  });
});
