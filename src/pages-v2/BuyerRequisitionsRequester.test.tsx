// ────────────────────────────────────────────────────────────────────────────
// §68 — THE REQUESTER'S SIDE OF THE SURFACE, and the attribution the approval
// now records.
//
// §67 connected approve/reject and left `Draft` a dead end on the ground that a
// submit affordance would be a second creation path beside the ratified C7
// seam. `t_pr_submit` creates nothing — it acts on a document `t_pr_create` has
// already minted — so the consequence was a queue that emptied and nothing that
// filled it. These specs pin the two edges that close the loop, both role
// directions of each, and the three read-backs.
//
// ⚠️ RULE 4: the known-GOOD path is asserted FIRST in each pair. "The button is
// absent" is indistinguishable from "the panel never opened".
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import BuyerRequisitions from './BuyerRequisitions';

/** A seat that RAISES requisitions and cannot decide them. */
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };
/** A seat that DECIDES them and cannot raise them. */
const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };

/** The seeded Draft row. */
const DRAFT_PR = 'PR-2026-00345';
/** The seeded row already in the approval queue. */
const PENDING_PR = 'PR-2026-00344';

const open = async (number: string) => {
  await screen.findByText('Purchase Requisitions');
  fireEvent.click(await screen.findByText(number));
  await screen.findByText(`PR ${number}`);
};

beforeEach(() => {
  purchaseRequisitionStore.reset();
});

describe('§68 · the population this file rests on', () => {
  it('⚠️ FIRST — pr-005 is a Draft, and the panel opens on it with the submit affordance', async () => {
    // Every "the button is absent" claim below is meaningless if the panel
    // never opened, and every "the Draft has an exit" claim is meaningless if
    // the row was never a Draft.
    expect(purchaseRequisitionStore.get('pr-005')!.status).toBe('Draft');
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(DRAFT_PR);
    expect(screen.getByTestId('pr-submit')).toBeInTheDocument();
  });
});

describe('§68 · submit — the dead end is closed', () => {
  it('✅ a requisitioner submits, and the STORE moves — not just the toast', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(DRAFT_PR);

    fireEvent.click(screen.getByTestId('pr-submit'));

    await waitFor(() =>
      expect(purchaseRequisitionStore.get('pr-005')!.status).toBe('Pending Approval'),
    );
  });

  it('⚠️ A PROCUREMENT SEAT SEES THE WAIT, NOT A GAP — "Awaiting Requisitioner"', async () => {
    // The binding constraint, now exercised from the side that had never
    // rendered it: until §68 every handoff on this surface named Procurement,
    // because Procurement held both surfaced verbs.
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await open(DRAFT_PR);

    expect(screen.queryByTestId('pr-submit')).not.toBeInTheDocument();
    const wait = screen.getByTestId('handoff-pr-submit');
    expect(wait).toHaveAttribute('data-handoff', 'withheld');
    expect(wait.textContent).toMatch(/Requisitioner/i);
  });

  it('and the seat that HOLDS the atom gets no handoff notice — the other direction', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(DRAFT_PR);
    expect(screen.queryByTestId('handoff-pr-submit')).not.toBeInTheDocument();
  });

  it('a Pending Approval row offers no submit — the verb does not leave from there', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(PENDING_PR);
    expect(screen.queryByTestId('pr-submit')).not.toBeInTheDocument();
  });
});

describe('⚠️ §68 · REVISE CARRIES ITS NOTE, AND THE COMMIT IS DISABLED UNTIL IT DOES', () => {
  const rejectFirst = () =>
    purchaseRequisitionStore.update('pr-004', (pr) => ({
      ...pr,
      status: 'Rejected',
      rejectionReason: 'Volume exceeds the Q3 budget envelope.',
    }));

  it('the commit is DISABLED on an empty box, and on whitespace', async () => {
    rejectFirst();
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(PENDING_PR);

    fireEvent.click(screen.getByTestId('pr-revise-open'));
    const confirm = await screen.findByTestId('pr-revise-confirm');
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId('pr-revise-note'), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
  });

  it('✅ a real note ENABLES it, dispatches, and the note lands ON THE DOCUMENT', async () => {
    rejectFirst();
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(PENDING_PR);

    fireEvent.click(screen.getByTestId('pr-revise-open'));
    fireEvent.change(screen.getByTestId('pr-revise-note'), {
      target: { value: 'Split into two lots of 1,000 KG.' },
    });
    const confirm = screen.getByTestId('pr-revise-confirm');
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);

    await waitFor(() => {
      const pr = purchaseRequisitionStore.get('pr-004')!;
      expect(pr.status).toBe('Draft');
      // The field the verb had required since PF-1a and nothing ever wrote.
      expect(pr.revisionNote).toBe('Split into two lots of 1,000 KG.');
    });
  });

  it('⚠️ AND BOTH READ BACK TOGETHER — why it came back, and what was done about it', async () => {
    purchaseRequisitionStore.update('pr-004', (pr) => ({
      ...pr,
      status: 'Draft',
      rejectionReason: 'Supplier is not halal-certified for this material.',
      revisionNote: 'Re-pointed at PT Sample Oleochemicals (LPPOM MUI valid).',
    }));
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(PENDING_PR);

    expect(screen.getByTestId('pr-rejection-reason')).toHaveTextContent(
      'Supplier is not halal-certified for this material.',
    );
    expect(screen.getByTestId('pr-revision-note')).toHaveTextContent(
      'Re-pointed at PT Sample Oleochemicals (LPPOM MUI valid).',
    );
  });

  it('a PROCUREMENT seat sees the wait on revise — recourse belongs to the requester', async () => {
    rejectFirst();
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await open(PENDING_PR);

    expect(screen.queryByTestId('pr-revise-open')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-pr-revise')).toHaveAttribute('data-handoff', 'withheld');
  });
});

describe('⚠️ §68 · THE APPROVAL NAMES ITS DECIDER, AND THE ROUTING TARGET STOPS PRETENDING TO', () => {
  it('✅ an approval writes the attribution, and the panel READS IT BACK', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await open(PENDING_PR);

    fireEvent.click(screen.getByTestId('pr-approve'));

    await waitFor(() =>
      expect(purchaseRequisitionStore.get('pr-004')!.approvedBy).toEqual({
        kind: 'UNATTRIBUTED',
        reason: 'NO_PERSON_IN_SESSION',
      }),
    );

    fireEvent.click(await screen.findByText(PENDING_PR));
    expect(await screen.findByTestId('pr-approved-by')).toHaveTextContent(/no person in session/i);
  });

  it('⚠️ AND "Approved by" IS ABSENT BEFORE ANYBODY APPROVES — which the old field never was', async () => {
    // `approvalLevel` (formerly `approver`) reads 'Section Head' on this row
    // and nobody has approved it. That is the whole defect: a field populated
    // before the act it named. The new row is absent until the act happens.
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await open(PENDING_PR);

    expect(screen.getByTestId('pr-approval-level')).toHaveTextContent('Section Head');
    expect(screen.queryByTestId('pr-approved-by')).not.toBeInTheDocument();
  });

  it('the routing target is labelled as a destination, not as an actor', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: PROCUREMENT });
    await open(PENDING_PR);

    // SITE, NOT TEXT — asserting on the row's own testid, because "Approver"
    // as a bare string appears on other surfaces for other DTOs.
    expect(screen.getByText('Routes to')).toBeInTheDocument();
    expect(screen.getByTestId('pr-approval-level')).toBeInTheDocument();
  });
});

describe('§68 · the Draft note now explains a state, not an absent affordance', () => {
  it('the note survives beside the button it used to stand in for', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: REQUISITIONER });
    await open(DRAFT_PR);

    expect(screen.getByTestId('pr-draft-note')).toBeInTheDocument();
    // …and it no longer claims this screen cannot submit, because it can.
    expect(screen.getByTestId('pr-draft-note').textContent).not.toMatch(/does not submit/i);
    expect(screen.getByTestId('pr-submit')).toBeInTheDocument();
  });
});
