import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import { usePinnedDemoClock } from '../test/demoClock';
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
// ⚠️ WHY THIS BLOCK PINS A *LATER* CLOCK THAN THE ONE ABOVE. The suite's demo
// present (2026-07-06) is the instant the fixtures are coherent at, and every
// existing spec pins it so a clock-derived label stays stable. That pin is also
// what HID this defect for the life of the surface: `inv-giv-0892` is due
// 2026-08-01, so at the demo present it labels `Approved` and the release button
// is there. One day later `toBuyerLabel` returns the computed `Overdue`, the old
// footer map answered `Escalate`, and the release affordance was gone — in
// production, permanently, with the suite still green. So these specs pin
// 2026-09-01: PAST the due date, where the defect lived.
const AFTER_DUE = '2026-09-01T00:00:00.000Z';

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

const releaseIt = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
  fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));
};

describe('BuyerInvoices — the release affordance survives the clock', () => {
  usePinnedDemoClock(AFTER_DUE);

  it('⚠️ THE REGRESSION: a PAST-DUE Approved invoice still offers Release payment', async () => {
    invoiceStore.reset();
    renderWithProviders(<BuyerInvoices />);
    await screen.findByText('Invoices & Payment');
    await openApprovedInvoice();

    // The invoice IS canonically Approved while the surface labels it Overdue —
    // the display is not being suppressed, the legality question just stopped
    // being asked of the label.
    expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Approved');
    expect(await screen.findByRole('button', { name: 'Release payment' })).toBeInTheDocument();
    // And the verb the lossy map used to answer with is NOT the primary action.
    expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument();
  });

  it('offers Dispute wherever the MACHINE allows it, past due included', async () => {
    invoiceStore.reset();
    renderWithProviders(<BuyerInvoices />);
    await screen.findByText('Invoices & Payment');
    await openApprovedInvoice();
    expect(await screen.findByRole('button', { name: 'Dispute' })).toBeInTheDocument();
  });
});

describe('BuyerInvoices — the settle failure branch', () => {
  usePinnedDemoClock(AFTER_DUE);

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
