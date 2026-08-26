import { screen, fireEvent, within } from '@testing-library/react';
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
