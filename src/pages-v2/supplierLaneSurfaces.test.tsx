import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import IdentityPanel from '../components/layout-v2/IdentityPanel';
import SupplierOrders from './SupplierOrders';
import SupplierRFQs from './SupplierRFQs';
import SupplierInvoices from './SupplierInvoices';
import i18n from '../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// THE SPLIT, ON THE SCREENS.
//
// ⚠️ **COVERAGE IS DERIVED AS (SURFACE × VERB), NEVER AS (SURFACE → IMPORTS THE
// GUARD)** — `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` is the page that
// rendered four guards and still shipped a live create in its header, because
// the create verb lived in the page header and every guarded verb acted on an
// already-selected document. So each assertion below names a VERB and a SEAT,
// and the withheld case is always paired with a held control: a notice that
// renders because the surface is broken looks exactly like one that renders
// because the seat is narrow.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

const seat = (roles: readonly string[]): CurrentIdentity => ({
  ...SUPPLIER,
  businessRoles: roles,
});

const COMMERCIAL_ONLY = seat(['supplier', 'commercial']);
const FULFILMENT_ONLY = seat(['supplier', 'fulfilment']);
const BACK_OFFICE_ONLY = seat(['supplier', 'back_office']);

describe('POPULATION GUARD — the seeded seat is wide, the narrowed ones are not', () => {
  it('the default supplier seat holds all four roles', () => {
    expect([...SUPPLIER.businessRoles].sort()).toEqual([...SEEDED_SEAT_ROLES.supplier].sort());
    expect(SUPPLIER.businessRoles.length).toBeGreaterThan(1);
    expect(COMMERCIAL_ONLY.businessRoles).not.toContain('fulfilment');
  });
});

describe('⚠️ SupplierOrders — `po:confirm` is FULFILMENT’s', () => {
  const openFirstOrder = async () => {
    const row = await screen.findByText('PO-2025-00108');
    fireEvent.click(row);
  };

  it('the SEEDED seat gets the affordance (the held control)', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    await openFirstOrder();
    expect(await screen.findByText(i18n.t('po.confirm.action'))).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-po-confirm')).not.toBeInTheDocument();
  });

  it('⚠️ a COMMERCIAL-only seat reads the WAIT, and it NAMES the lane', async () => {
    renderWithProviders(<SupplierOrders />, { identity: COMMERCIAL_ONLY });
    await openFirstOrder();
    const notice = await screen.findByTestId('handoff-po-confirm');
    // Not merely "withheld" — the owner is what makes a handoff a handoff.
    expect(notice).toHaveTextContent(i18n.t('roles.owner.fulfilment'));
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    // …and the affordance is GONE, not disabled.
    expect(screen.queryByText(i18n.t('po.confirm.action'))).not.toBeInTheDocument();
  });
});

describe('⚠️ SupplierRFQs — `quotation:submit` is COMMERCIAL’s', () => {
  it('the SEEDED seat gets the affordance', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await screen.findAllByText(i18n.t('rfqs.card.submitQuote'))).not.toHaveLength(0);
  });

  it('⚠️ a FULFILMENT-only seat reads the wait, naming Commercial', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: FULFILMENT_ONLY });
    const notices = await screen.findAllByTestId('handoff-quotation-submit');
    expect(notices[0]).toHaveTextContent(i18n.t('roles.owner.commercial'));
    expect(screen.queryByText(i18n.t('rfqs.card.submitQuote'))).not.toBeInTheDocument();
  });

  it('…and the UNGOVERNED affordance beside it stays live — a read is not withheld', async () => {
    // §75e: a control holding no atom is ungoverned, not withheld. Asking
    // procurement a question is not an act the role gate has an opinion about,
    // and a batch that quietly hid it would be over-applying the ruling.
    renderWithProviders(<SupplierRFQs />, { identity: FULFILMENT_ONLY });
    expect(await screen.findAllByText(i18n.t('rfqs.card.askQuestion'))).not.toHaveLength(0);
  });
});

describe('⚠️ SupplierInvoices — `invoice:submit` is BACK OFFICE’s', () => {
  // ⚠️ **MATCHED BY ROLE, NOT BY TEXT, AND THE FIRST DRAFT GOT THIS WRONG.**
  // `invoice.create.action` and `supplierInvoices.new.title` are BOTH "New
  // invoice", and the drawer's title is in the DOM while the drawer is shut —
  // so a `findByText` matched two nodes and the withheld assertion read as a
  // live affordance. A text matcher over-widened, accused working code, and the
  // control is what said so (derivation rule 2, in a spec this time).
  const createButton = () =>
    screen.queryByRole('button', { name: i18n.t('invoice.create.action') });

  it('the SEEDED seat gets the page-level create', async () => {
    // ⚠️ AWAITED, NOT QUERIED. `queryByRole` does not wait, and this page's
    // header renders after its first read resolves — so the un-awaited form
    // reported the button absent on a seat that has it, which is the withheld
    // state's exact signature. A negative assertion taken too early is
    // indistinguishable from a working guard.
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    expect(
      await screen.findByRole('button', { name: i18n.t('invoice.create.action') }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-invoice-create')).not.toBeInTheDocument();
  });

  it('⚠️ a COMMERCIAL-only seat loses the HEADER create — the §72a slot', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: COMMERCIAL_ONLY });
    const notice = await screen.findByTestId('handoff-invoice-create');
    expect(notice).toHaveTextContent(i18n.t('roles.owner.back_office'));
    expect(createButton()).not.toBeInTheDocument();
  });

  it('…and a BACK-OFFICE seat keeps it — the notice is not always-on', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: BACK_OFFICE_ONLY });
    expect(
      await screen.findByRole('button', { name: i18n.t('invoice.create.action') }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-invoice-create')).not.toBeInTheDocument();
  });
});

describe('⚠️ THE PANEL CAN NOW EXPRESS THE SPLIT — and the always-on notice is gone', () => {
  const openRoles = async () => {
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const panel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(panel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    return panel;
  };

  it('offers exactly the four supplier roles, all held on a seeded seat', async () => {
    renderWithProviders(<IdentityPanel />, { identity: SUPPLIER });
    const panel = await openRoles();
    const rows = within(within(panel).getByTestId('identity-roles-list')).getAllByRole(
      'menuitemcheckbox',
    );
    const ids = rows.map((r) => r.getAttribute('data-testid')!.replace('identity-role-', ''));
    expect([...ids].sort()).toEqual([...SEEDED_SEAT_ROLES.supplier].sort());
    for (const r of rows) expect(r).toHaveAttribute('aria-checked', 'true');
  });

  it('⚠️ THE LAST-ROLE NOTICE IS NO LONGER ALWAYS-ON — the defect this batch repaired', () => {
    // Before the split the supplier persona offered ONE role, so `held.length
    // === 1` was permanently true: every supplier seat rendered "your last role
    // cannot be removed — to swap it, add the new role first", advice no
    // supplier could ever follow because there was nothing to add. Found while
    // investigating this batch, against this seat's own open PR.
    renderWithProviders(<IdentityPanel />, { identity: SUPPLIER });
    return openRoles().then((panel) => {
      expect(within(panel).queryByTestId('identity-roles-last')).not.toBeInTheDocument();
    });
  });

  it('…and it still fires when a seat IS down to one — the notice is not merely deleted', async () => {
    // The known-GOOD half. A notice that never renders and a notice that
    // renders correctly are indistinguishable from the assertion above alone.
    renderWithProviders(<IdentityPanel />, { identity: seat(['fulfilment']) });
    const panel = await openRoles();
    expect(within(panel).getByTestId('identity-roles-last')).toBeInTheDocument();
  });

  it('a supplier seat can be narrowed by REMOVAL, down to one lane', async () => {
    renderWithProviders(<IdentityPanel />, { identity: SUPPLIER });
    const panel = await openRoles();
    const heldNow = () =>
      within(panel)
        .getAllByRole('menuitemcheckbox')
        .filter((b) => b.getAttribute('aria-checked') === 'true')
        .map((b) => b.getAttribute('data-testid')!.replace('identity-role-', ''));

    for (const r of ['supplier', 'fulfilment', 'back_office']) {
      fireEvent.click(within(panel).getByTestId(`identity-role-${r}`));
    }
    expect(heldNow()).toEqual(['commercial']);
    // …and the last one cannot go, exactly as on the buyer side.
    fireEvent.click(within(panel).getByTestId('identity-role-commercial'));
    expect(heldNow()).toEqual(['commercial']);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ⚠️ §84 — THE ENTRANCE IS THE UNIT, NOT (SURFACE × VERB).
//
// The describe above opens the panel by clicking the ROW, which lands in
// `detail` — the one door the notice guarded. **The row's ACTION BUTTON was a
// second door and it went straight to `editing`**, where the commit sat ungated
// behind a comment asserting it was "unreachable behind this one". It was not:
// every actionable PO renders that button, and it is the PRIMARY path (it is the
// one carrying the action label). So the surface imported the guard, rendered
// the guard, and still shipped a live commit to a seat that would be refused.
//
// Both directions, always: a guard proved only against the seat it withholds
// from is indistinguishable from a control that is simply broken.
// ──────────────────────────────────────────────────────────────────────────────
describe('⚠️ §84 SupplierOrders — the ROW-ACTION entrance, which bypassed the notice', () => {
  // ⚠️ **THE DOOR IS THE SAME BUTTON; ITS LABEL IS NOT.** The row action now
  // NAMES what pressing it does — a seat that cannot confirm reads "View", not
  // "Confirm". So the caller states the label it expects that seat to see, and
  // this helper is a second assertion of the label fix rather than a lookup that
  // has to be kept in step with it. Passing 'Confirm' for a narrowed seat fails
  // here, which is what should happen.
  const clickRowAction = async (label: string) => {
    const cell = await screen.findByText('PO-2025-00108');
    const row = cell.closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByText(label));
  };
  const CONFIRM_LABEL = () => i18n.t('supplierOrders.action.confirm');
  const VIEW_LABEL = () => i18n.t('supplierOrders.action.view');

  it('⚠️ a COMMERCIAL seat reaches NO commit by the ROW-ACTION door either', async () => {
    renderWithProviders(<SupplierOrders />, { identity: COMMERCIAL_ONLY });
    await clickRowAction(VIEW_LABEL());
    // and the label it did NOT get, asserted here too — the button that opens
    // this panel must not still be claiming the verb behind it.
    expect(screen.queryByText(CONFIRM_LABEL())).not.toBeInTheDocument();
    // It lands on the SAME single notice — §76's one-notice-per-verb holds.
    const notice = await screen.findByTestId('handoff-po-confirm');
    expect(notice).toHaveTextContent(i18n.t('roles.owner.fulfilment'));
    // The commit is gone, AND so is the form it commits — the mode collapsed,
    // rather than the button being hidden inside a live editing panel.
    expect(screen.queryByText(i18n.t('po.confirm.action'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('supplierOrders.panel.lineItemsConfirm'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('supplierOrders.panel.confirmedDeliveryDate'))).not.toBeInTheDocument();
  });

  it('…and a BACK_OFFICE seat is refused by the same door, naming the same lane', async () => {
    renderWithProviders(<SupplierOrders />, { identity: BACK_OFFICE_ONLY });
    await clickRowAction(VIEW_LABEL());
    expect(screen.queryByText(CONFIRM_LABEL())).not.toBeInTheDocument();
    expect(await screen.findByTestId('handoff-po-confirm')).toHaveTextContent(
      i18n.t('roles.owner.fulfilment'),
    );
    expect(screen.queryByText(i18n.t('po.confirm.action'))).not.toBeInTheDocument();
  });

  it('…and a FULFILMENT seat still reaches the commit BY THAT SAME DOOR', async () => {
    renderWithProviders(<SupplierOrders />, { identity: FULFILMENT_ONLY });
    await clickRowAction(CONFIRM_LABEL());
    // The editing mode is intact for the seat that holds the verb — the fix
    // gated the mode, it did not delete the path.
    expect(await screen.findByText(i18n.t('supplierOrders.panel.lineItemsConfirm'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('po.confirm.action'))).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-po-confirm')).not.toBeInTheDocument();
  });

  it('⚠️ …and it DISPATCHES end to end — the held path is proved, not assumed', async () => {
    renderWithProviders(<SupplierOrders />, { identity: FULFILMENT_ONLY });
    await clickRowAction(CONFIRM_LABEL());
    fireEvent.click(await screen.findByText(i18n.t('po.confirm.action')));
    await waitFor(() => {
      expect(commandAuditSink.byEvent('t_po_confirm').length).toBeGreaterThan(0);
    });
  });

  it('⚠️ a seat NARROWED WHILE THE PANEL STANDS OPEN lands on the notice', async () => {
    // THE REASON THE MODE IS GATED AND NOT THE BUTTON THAT OPENS IT: `panelMode`
    // is component state and OUTLIVES THE SEAT. `SupplierShipments` records the
    // same reason for its wizard tab — reachable, not a dead branch. Narrowed
    // here through the real control (the identity panel), not by re-rendering
    // with a different stub, so the path is the one a person can walk.
    // The shell already carries the identity panel — rendering a second one
    // here made `identity-avatar` ambiguous, which is the honest signal that the
    // control under test is the SHELL's, reached the way a person reaches it.
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    await clickRowAction(CONFIRM_LABEL());
    expect(await screen.findByText(i18n.t('supplierOrders.panel.lineItemsConfirm'))).toBeInTheDocument();

    // Drop `fulfilment` while the editing panel stands open.
    fireEvent.click(await screen.findByTestId('identity-avatar'));
    const panel = await screen.findByTestId('identity-panel');
    fireEvent.click(within(panel).getByTestId('identity-roles-trigger'));
    await screen.findByTestId('identity-roles-list');
    fireEvent.click(within(panel).getByTestId('identity-role-fulfilment'));

    expect(await screen.findByTestId('handoff-po-confirm')).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('po.confirm.action'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('supplierOrders.panel.lineItemsConfirm'))).not.toBeInTheDocument();
  });
});
