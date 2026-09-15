import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import { usePinnedDemoClock } from '../test/demoClock';
import { INVOICES } from '../services/data/mock/fixtures/invoices';
import { daysOutstanding } from '../services/data/invoiceProjection';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { DataError, type IDataService } from '../services/data/types';
import { useToast } from '../hooks/useToast';
import BuyerInvoices from './BuyerInvoices';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no buyer invoices scoped to it → empty result.
const SUPPLIER_NO_INVOICES: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT No Invoices',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('BuyerInvoices — four honest states', () => {
  it('data: renders the invoice workspace once the list resolves', async () => {
    renderWithProviders(<BuyerInvoices />);
    expect(await screen.findByText('Invoices & Payment')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the list is pending', () => {
    renderWithProviders(<BuyerInvoices />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Invoices & Payment')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the list read throws', async () => {
    renderWithProviders(<BuyerInvoices />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when the scoped list is empty', async () => {
    renderWithProviders(<BuyerInvoices />, { identity: SUPPLIER_NO_INVOICES });
    expect(await screen.findByText('No invoices')).toBeInTheDocument();
  });
});

// The DR-7 honest-payment path (UI): releasing an Approved invoice goes through
// the Option-B SAP boundary — interim 'Releasing Payment' with NO payment ref,
// then settlement mints the real ref. No client-side "paid" fabrication.
describe('BuyerInvoices — release payment is Option B (no fabrication)', () => {
  // `Release payment` is offered on the computed BUYER label, which projects
  // `Overdue` from the clock. inv-giv-0892 is due 2026-08-01, so from 2026-08-02
  // it read Overdue instead of Approved and the button vanished — this spec broke
  // with no commit involved (2e-c-6-FIND-01). Pinned to the demo present.
  usePinnedDemoClock();

  it('release → Releasing Payment (no ref) → settle → Payment Released (real ref)', async () => {
    invoiceStore.reset();
    renderWithProviders(<BuyerInvoices />);
    await screen.findByText('Invoices & Payment');

    // inv-giv-0892 is Approved (matched), no payment ref yet.
    fireEvent.click(await screen.findByText('INV-2025-GIV-0892'));
    fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));

    // Interim: submitted to SAP, no payment reference asserted yet.
    await waitFor(() => {
      expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Releasing Payment');
    });
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toBeNull();

    // Settlement mints the real FI doc + payment ref (Option B).
    await waitFor(
      () => {
        expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Payment Released');
      },
      { timeout: 2500 },
    );
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toMatch(/^PAY-/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE RELEASE ACTION SURFACE — the affordance, and the settle's failure branch.
//
// ⚠️ **`AFTER_DUE` IS RETIRED, AND THE REASON IS THE SAME ONE THAT MADE IT
// DERIVED ONE COMMIT AGO: A PROBE THAT CANNOT FIRE IS WORSE THAN NONE.**
//
// Its history in two moves, quoted rather than summarised, because the shape
// repeated and the repetition is the lesson:
//
//   1. It was the literal `'2026-09-01T00:00:00.000Z'`, chosen when
//      `inv-giv-0892` was due 2026-08-01. Anchoring `invoice` as a fixture
//      family moved that due date to 2026-10-09, putting the literal BEFORE it.
//   2. So it was re-derived from the row — `dueDate + 1 day` — which fixed the
//      drift and was correct for exactly as long as the surface still READ a
//      clock.
//
// It no longer does. `MockProcurementService` supplies `INVOICE_NOW`, so
// `usePinnedDemoClock(AFTER_DUE)` moves the harness calendar and the invoice
// labels do not move with it. **Measured, not assumed:** rendered at that pin,
// `inv-giv-0892` comes back `Approved` with `daysOutstanding = 0`, while this
// block's own title claims a PAST-DUE invoice. The whole suite stayed green.
//
// ⚠️ **THE REPAIR IS A SUBJECT THAT IS PAST DUE BY CONSTRUCTION, NOT A CLOCK
// THAT IS MOVED TO MAKE ONE.** `inv-evo-0188` is the corpus' own intended
// overdue row — its comment says so — and it is canonically `Approved`. At the
// declared present it renders `Overdue` with 19 days outstanding while the
// machine still calls it `Approved`, which IS the geometry this block exists to
// guard, permanently and with no clock to move. That is
// `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`'s preference exactly: fire the
// instrument at a defect the tree really carries, rather than at one the harness
// simulates.
const OVERDUE_APPROVED_ID = 'inv-evo-0188';
const OVERDUE_APPROVED_NUMBER = 'INV-2025-EVO-0188';

/** Surfaces the toast queue into the DOM — ToastProvider renders only children,
 *  so without this a toast is invisible to a spec and "the handler fired" would
 *  be unfalsifiable. */
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

/** mockDataService with `commands.settle` replaced. A Proxy, not a spread: the
 *  command service is a class instance and spreading drops its prototype. */
const withSettle = (settle: () => Promise<never>): IDataService =>
  ({
    ...mockDataService,
    commands: new Proxy(mockDataService.commands, {
      get(target, prop) {
        if (prop === 'settle') return settle;
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    }),
  }) as IDataService;

const openApprovedInvoice = async () => {
  fireEvent.click(await screen.findByText('INV-2025-GIV-0892'));
};

/** The row that is past due AT the declared present and canonically Approved. */
const openOverdueApprovedInvoice = async () => {
  fireEvent.click(await screen.findByText(OVERDUE_APPROVED_NUMBER));
};

const releaseIt = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
  fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));
};

describe('BuyerInvoices — the release affordance survives the clock', () => {
  usePinnedDemoClock();

  it('⚠️ THE REGRESSION: a PAST-DUE Approved invoice still offers Release payment', async () => {
    invoiceStore.reset();
    renderWithProviders(<BuyerInvoices />);
    await screen.findByText('Invoices & Payment');
    await openOverdueApprovedInvoice();

    // ⚠️ THE PREMISE IS ASSERTED, NOT ASSUMED. This block passed for one commit
    // while its subject was not past due at all, so the two halves of its own
    // title are now checked on screen before the affordance is: the MACHINE says
    // Approved, the SURFACE says past due, and that gap is the whole subject.
    //
    // The aging TEXT is the pin rather than the word `Overdue`, which appears on
    // the KPI eyebrow, the filter chip, the row pill and the panel pill alike —
    // four matches, none of them specific to this row. The day count is unique to
    // it, and it is DERIVED from the shipped projection at the declared present
    // rather than written here, so a re-anchor moves the expectation with the
    // surface instead of reddening this line.
    const subject = INVOICES.find((i) => i.id === OVERDUE_APPROVED_ID)!;
    const days = daysOutstanding(subject, `${DECLARED_PRESENT}T00:00:00.000Z`);
    expect(days, 'the subject must really be past due at the declared present').toBeGreaterThan(0);
    expect(invoiceStore.get(OVERDUE_APPROVED_ID)!.status).toBe('Approved');
    expect(await screen.findByText(`${days}d overdue`)).toBeInTheDocument();

    // The display is not being suppressed; the legality question just stopped
    // being asked of the label.
    expect(await screen.findByRole('button', { name: 'Release payment' })).toBeInTheDocument();
    // And the verb the lossy map used to answer with is NOT the primary action.
    expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument();
  });

  it('offers Dispute wherever the MACHINE allows it, past due included', async () => {
    invoiceStore.reset();
    renderWithProviders(<BuyerInvoices />);
    await screen.findByText('Invoices & Payment');
    await openOverdueApprovedInvoice();
    expect(await screen.findByRole('button', { name: 'Dispute' })).toBeInTheDocument();
  });
});

describe('BuyerInvoices — the settle failure branch', () => {
  usePinnedDemoClock();

  // ⚠️ RULE 4, AND THE ORDER IS LOAD-BEARING. A catch that never fires and a
  // catch that fires and records nothing are indistinguishable from a green
  // suite. So the KNOWN-GOOD path is asserted to RECORD first — a settle that
  // succeeds must leave no failure affordance behind. Only then does a missing
  // retry button in the bad-path specs mean anything.
  it('KNOWN-GOOD FIRST: a settle that SUCCEEDS records success and leaves no remedy', async () => {
    invoiceStore.reset();
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>,
    );
    await screen.findByText('Invoices & Payment');
    await openApprovedInvoice();
    await releaseIt();

    await waitFor(() => expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Payment Released'), {
      timeout: 2500,
    });
    // The success toast was recorded — the handler ran, it did not merely not-throw.
    await waitFor(() =>
      expect(screen.getByTestId('toast-spy').textContent).toMatch(/payment released/i),
    );
    // And no failure affordance exists to be found by the specs below.
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Settlement was refused/)).not.toBeInTheDocument();
  });

  it('a RETRYABLE fault records the classified toast AND offers a real retry', async () => {
    invoiceStore.reset();
    const boom = withSettle(async () => {
      throw new DataError('CHAOS', 'transport down');
    });
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>,
      { service: boom },
    );
    await screen.findByText('Invoices & Payment');
    await openApprovedInvoice();
    await releaseIt();

    // THE HOOK'S onError ran — `useSettleErrorToast` classified the fault and
    // named its remedy. This surface is the first consumer to prove it fires.
    await waitFor(
      () =>
        expect(screen.getByTestId('toast-spy').textContent).toMatch(
          /Settlement did not complete/i,
        ),
      { timeout: 2500 },
    );
    // The invoice is parked in the interim, exactly as the dispatcher intends.
    expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Releasing Payment');
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toBeNull();
    // TRANSPORT is retryable, so the remedy is offered — and it is the only
    // affordance, because no transition is legal from the interim state.
    expect(await screen.findByRole('button', { name: 'Retry settlement' })).toBeInTheDocument();
  });

  it('a NON-RETRYABLE fault offers NO retry — asking again cannot change it', async () => {
    invoiceStore.reset();
    const denied = withSettle(async () => {
      throw new DataError('SCOPE_DENIED', 'not yours');
    });
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>,
      { service: denied },
    );
    await screen.findByText('Invoices & Payment');
    await openApprovedInvoice();
    await releaseIt();

    await waitFor(
      () =>
        expect(screen.getByTestId('toast-spy').textContent).toMatch(
          /Settlement did not complete/i,
        ),
      { timeout: 2500 },
    );
    expect(await screen.findByText(/Settlement was refused/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });

  it('the interim state offers no verb at all — it is waiting, and says so', async () => {
    invoiceStore.reset();
    const hangs = withSettle(() => new Promise<never>(() => {}));
    renderWithProviders(<BuyerInvoices />, { service: hangs });
    await screen.findByText('Invoices & Payment');
    await openApprovedInvoice();
    await releaseIt();

    await waitFor(
      () => expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Releasing Payment'),
      { timeout: 2500 },
    );
    expect(await screen.findByText(/Awaiting SAP settlement/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send remittance' })).not.toBeInTheDocument();
  });
});
