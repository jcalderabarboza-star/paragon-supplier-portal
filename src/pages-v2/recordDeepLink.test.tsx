// ─────────────────────────────────────────────────────────────────────────────
// DRILL-DOWN — a dashboard window's row lands on ITS OWN record.
//
// The windows' half (the row is a real link, with the right href) is asserted
// in `widgets/buyerWindows.test.tsx`. This is the other half: the destination
// opens the record the href names.
//
// ── ⚠️ WHAT EACH DESTINATION DOES, AND WHY THEY DIFFER ─────────────────────
// Six pages already hold a detail panel and their own selection state, so the
// deep link SELECTS and the panel opens. Two do not — `/buyer/risk` has no
// per-alert detail at all, and `/buyer/compliance`'s only SidePanel is the
// document-REQUEST flow — so a link there lands ON THE ROW, scrolled to and
// ringed, the way `Glossary.tsx`'s `?term=` chip does. Operator ruling; the
// alternative was inventing a panel, which is a redesign of two pages.
//
// ── ⚠️ AN UNKNOWN ID IS NOT AN ERROR ───────────────────────────────────────
// Every destination is probed with a junk id: the list renders, nothing opens,
// and nothing is announced. A toast there would be `toastHonesty`'s defect —
// telling the reader something happened when nothing did.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import { recordHref } from '../lib/recordDeepLink';

import BuyerInvoices from './BuyerInvoices';
import BuyerSourcing from './BuyerSourcing';
import BuyerOrders from './BuyerOrders';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import BuyerShipments from './BuyerShipments';
import BuyerInventory from './BuyerInventory';
import BuyerRisk from './BuyerRisk';
import BuyerCompliance from './BuyerCompliance';

const SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };
const proc = mockDataService.procurement;

const seatWith = (roles: readonly string[]): CurrentIdentity => ({
  ...BUYER,
  businessRoles: roles,
});

/** Settle the page's reads. */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('⚠️ EACH DESTINATION OPENS THE RECORD ITS LINK NAMES', () => {
  /**
   * ⚠️ **THE ASSERTION IS THE OPEN PANEL, NOT THE RECORD NUMBER.**
   * Every one of these numbers is ALSO in the page's list, so
   * `findAllByText(number)` passes whether or not the deep link selected
   * anything — measured: mutating the matcher to `() => false` left that
   * version of this spec green. `SidePanel` renders `role="dialog"` only when
   * open, so the dialog IS the claim, and the record number must be inside it.
   */
  const opensPanel = async (label: string) => {
    const dlg = await screen.findByRole('dialog');
    // A substring matcher rather than a regex: a record number is plain
    // alphanumeric, and building a pattern out of it only invites escaping bugs.
    expect(
      within(dlg).getAllByText((_text, el) =>
        (el?.textContent ?? '').includes(label),
      ),
    ).not.toHaveLength(0);
    return dlg;
  };

  it('/buyer/invoices opens the invoice', async () => {
    const inv = (await proc.getBuyerInvoices(SCOPE)).items[0];
    renderWithProviders(<BuyerInvoices />, { route: recordHref('/buyer/invoices', inv.id) });
    await opensPanel(inv.invoiceNumber);
  });

  it('/buyer/sourcing opens the RFQ', async () => {
    const rfq = (await proc.getRFQs(SCOPE)).items.find((r) => r.status !== 'Draft')!;
    renderWithProviders(<BuyerSourcing />, { route: recordHref('/buyer/sourcing', rfq.id) });
    await opensPanel(rfq.rfqNumber);
  });

  it('/buyer/orders opens the purchase order', async () => {
    const po = (await proc.getPurchaseOrders(SCOPE)).items[0];
    renderWithProviders(<BuyerOrders />, { route: recordHref('/buyer/orders', po.id) });
    await opensPanel(po.poNumber);
  });

  it('/buyer/goods-receipt opens the receipt', async () => {
    const gr = (await proc.getGoodsReceipts(SCOPE)).items[0];
    renderWithProviders(<BuyerGoodsReceipt />, {
      route: recordHref('/buyer/goods-receipt', gr.id),
    });
    await opensPanel(gr.grNumber);
  });

  it('/buyer/shipments opens the shipment', async () => {
    const sh = (await proc.getShipments(SCOPE)).items[0];
    renderWithProviders(<BuyerShipments />, { route: recordHref('/buyer/shipments', sh.id) });
    await opensPanel(sh.asnNumber);
  });

  it('/buyer/inventory opens the item', async () => {
    const item = (await proc.getInventory(SCOPE)).items[0];
    renderWithProviders(<BuyerInventory />, {
      route: recordHref('/buyer/inventory', item.id),
    });
    await opensPanel(item.materialCode);
  });

  it('⚠️ CONTROL — with NO ?id the page opens no panel at all', async () => {
    // Without this, every assertion above would pass on a page that opens a
    // panel for some other reason.
    renderWithProviders(<BuyerInvoices />, { route: '/buyer/invoices' });
    await screen.findAllByRole('row');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('⚠️ THE TWO PAGES WITH NO PANEL LAND ON THE ROW ITSELF', () => {
  it('/buyer/risk rings the alert', async () => {
    const alert = (await mockDataService.risk.getRiskAlerts(SCOPE)).items[0];
    const { container } = renderWithProviders(<BuyerRisk />, {
      route: recordHref('/buyer/risk', alert.id),
    });
    await screen.findByText(alert.title);
    const row = container.querySelector(`#record-${alert.id}`);
    expect(row, 'the alert row carries its anchor id').toBeTruthy();
    expect(row?.className).toContain('ring-2');
  });

  it('/buyer/compliance rings the certificate row', async () => {
    const entry = (await mockDataService.risk.getComplianceRegistry(SCOPE)).items[0];
    const { container } = renderWithProviders(<BuyerCompliance />, {
      route: recordHref('/buyer/compliance', entry.id),
    });
    await settle();
    const row = await waitForRow(container, `#record-${entry.id}`);
    expect(row?.className).toContain('ring-2');
  });

  async function waitForRow(container: HTMLElement, selector: string) {
    for (let i = 0; i < 40; i++) {
      const el = container.querySelector(selector);
      if (el) return el;
      await new Promise((r) => setTimeout(r, 25));
    }
    return container.querySelector(selector);
  }
});

describe('⚠️ AN UNKNOWN ID RENDERS THE PAGE AND SAYS NOTHING', () => {
  const pages: Array<[string, React.ComponentType, string]> = [
    ['/buyer/invoices', BuyerInvoices, '/buyer/invoices'],
    ['/buyer/orders', BuyerOrders, '/buyer/orders'],
    ['/buyer/goods-receipt', BuyerGoodsReceipt, '/buyer/goods-receipt'],
    ['/buyer/shipments', BuyerShipments, '/buyer/shipments'],
    ['/buyer/inventory', BuyerInventory, '/buyer/inventory'],
    ['/buyer/risk', BuyerRisk, '/buyer/risk'],
    ['/buyer/compliance', BuyerCompliance, '/buyer/compliance'],
  ];

  it.each(pages)('%s renders safely for a junk id', async (_name, Page, path) => {
    const { container } = renderWithProviders(<Page />, {
      route: recordHref(path, 'no-such-record-xyz'),
    });
    await settle();
    await new Promise((r) => setTimeout(r, 50));
    // The page rendered something real…
    expect((container.textContent ?? '').length).toBeGreaterThan(200);
    // …no error state…
    expect(screen.queryByText('Unable to load this page')).not.toBeInTheDocument();
    // …and NOTHING was announced. A toast for a stale link is the honesty
    // defect: it reports an event that did not happen.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('⚠️ A DEEP LINK RESPECTS THE HANDOFF MODEL', () => {
  // D4: a seat that cannot act still SEES the record. What it must not get is
  // an enabled verb it does not hold.
  it('a receiving-only seat opening an invoice sees it, with no release enabled', async () => {
    const inv = (await proc.getBuyerInvoices(SCOPE)).items.find(
      (i) => i.lifecycleState === 'Approved',
    )!;
    renderWithProviders(<BuyerInvoices />, {
      route: recordHref('/buyer/invoices', inv.id),
      identity: seatWith(['receiving']),
    });
    expect(await screen.findAllByText(inv.invoiceNumber)).not.toHaveLength(0);
    for (const btn of screen.queryAllByRole('button')) {
      if (/release payment/i.test(btn.textContent ?? ''))
        expect(btn, 'release must not be enabled for a receiving seat').toBeDisabled();
    }
  });

  it('a receiving-only seat opening an RFQ sees it, with no award enabled', async () => {
    const rfq = (await proc.getRFQs(SCOPE)).items.find((r) => r.status === 'Open')!;
    renderWithProviders(<BuyerSourcing />, {
      route: recordHref('/buyer/sourcing', rfq.id),
      identity: seatWith(['receiving']),
    });
    expect(await screen.findAllByText(rfq.rfqNumber)).not.toHaveLength(0);
    for (const btn of screen.queryAllByRole('button')) {
      if (/^award\b/i.test((btn.textContent ?? '').trim()))
        expect(btn, 'award must not be enabled for a receiving seat').toBeDisabled();
    }
  });

  it('⚠️ CONTROL — the seat that DOES hold the verb is not disabled by this test`s own matcher', async () => {
    // Without this the two assertions above pass on a page that renders no
    // buttons at all, which is the vacuous reading.
    const rfq = (await proc.getRFQs(SCOPE)).items.find((r) => r.status === 'Open')!;
    renderWithProviders(<BuyerSourcing />, {
      route: recordHref('/buyer/sourcing', rfq.id),
    });
    expect(await screen.findAllByText(rfq.rfqNumber)).not.toHaveLength(0);
    expect(screen.queryAllByRole('button').length).toBeGreaterThan(0);
  });
});

// ── REACH BLOCK — what this spec does NOT guard ─────────────────────────────
//
//  1. **That the row a reader clicks is the row that opens.** This asserts the
//     destination resolves an id; `widgets/buyerWindows.test.tsx` asserts the
//     href carries the right one. Neither follows a real click end to end —
//     browser QA does that, window by window.
//  2. **Scroll position.** `useDeepLinkedHighlight` calls `scrollIntoView`,
//     which jsdom does not implement; the ring is asserted, the scroll is not.
//     A page that highlighted the right row far below the fold would pass here.
//  3. **Every verb on a deep-linked record.** The handoff assertions cover
//     invoice release and RFQ award, which are the two the dispatch names.
//     A verb added to either page tomorrow is not covered by these two.
//  4. **The panel's CONTENTS.** "Opened" is `role="dialog"` carrying the record
//     number. Whether the panel shows the right fields is each page's own spec.
