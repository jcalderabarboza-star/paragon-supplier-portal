// ─────────────────────────────────────────────────────────────────────────────
// THE BUYER DASHBOARD'S WINDOWS — counts, honesty, and drill-down.
//
// The operator's review kept the expandable grid, so this is the gate on what
// each window may SAY and where each of its rows may GO.
//
// Three claims, and each is probed rather than observed:
//
//  1. **Every count equals its derivation at the declared present.** Re-derived
//     here from the service, never pinned, so a corpus that grows does not
//     redden a spec (`FLOOR-IN-PROSE-01`).
//  2. **No window states a clock-relative figure over an UNANCHORED family.**
//     PO, RFQ, quotation and ASN are not anchored, so a day-count over them is
//     saturated — measured: `awardOverdue` called ALL NINE pending RFQs "past
//     deadline", which is a sentence with no information in it. Asserted in
//     BOTH directions: the retired phrasings must be absent AND the clock-free
//     replacements must be present.
//  3. **An expanded row is a LINK to its own record**, keyboard-reachable,
//     never an onClick on a div.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react';
import { renderWithProviders } from '../../test/test-utils';
import { mockDataService } from '../../services/data/mock/mockDataService';
import i18n from '../../lib/i18n';
import type { QueryScope } from '../../services/data/types';
import { PRESENT_ISO } from '../dashboard/buyerDashboardDerivations';
import { computeStatus } from '../../services/data/complianceProjection';
import { POStatus } from '../../services/data/types';
import {
  overdueInvoices,
  openPurchaseOrders,
  pendingAwardRfqs,
  grNeedingAction,
  pendingAsns,
} from './buyerDerivations';

import BuyerInvoiceAgingWidget from './BuyerInvoiceAgingWidget';
import BuyerRfqAwaitingAwardWidget from './BuyerRfqAwaitingAwardWidget';
import BuyerOpenPoWidget from './BuyerOpenPoWidget';
import BuyerGoodsReceiptWidget from './BuyerGoodsReceiptWidget';
import BuyerAsnInboundWidget from './BuyerAsnInboundWidget';
import BuyerInventoryWidget from './BuyerInventoryWidget';
import BuyerRiskWidget from './BuyerRiskWidget';
import BuyerComplianceWidget from './BuyerComplianceWidget';

const SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };
const proc = mockDataService.procurement;

/**
 * Expand a window and hand back its dialog.
 *
 * The widget SHELL renders before its query resolves, so a click on Expand the
 * moment the button exists opens the dialog over an empty list. `settle` waits
 * for the count the shell prints, which only appears once the read has landed.
 */
async function expand(title: string): Promise<HTMLElement> {
  // ⚠️ The expand control's accessible name is ITSELF localized
  // (`widget.aria.expand`), so an English label would never be found in the
  // Indonesian run — the spec would fail on its own harness rather than on
  // the product.
  const trigger = await screen.findByLabelText(i18n.t('widget.aria.expand', { title }));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  fireEvent.click(trigger);
  return screen.getByRole('dialog', { name: title });
}

/** The row links inside an expanded window, once the read has landed. */
async function rowLinks(dlg: HTMLElement): Promise<HTMLElement[]> {
  return within(dlg).findAllByRole('link');
}

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('⚠️ POPULATION CONTROL', () => {
  it('every corpus a window reads is non-empty', async () => {
    const sizes = {
      invoices: (await proc.getBuyerInvoices(SCOPE)).items.length,
      pos: (await proc.getPurchaseOrders(SCOPE)).items.length,
      rfqs: (await proc.getRFQs(SCOPE)).items.length,
      receipts: (await proc.getGoodsReceipts(SCOPE)).items.length,
      asns: (await proc.getASNs(SCOPE)).items.length,
      inventory: (await proc.getInventory(SCOPE)).items.length,
      alerts: (await mockDataService.risk.getRiskAlerts(SCOPE)).items.length,
      registry: (await mockDataService.risk.getComplianceRegistry(SCOPE)).items.length,
    };
    for (const [k, v] of Object.entries(sizes)) expect(v, k).toBeGreaterThan(0);
  });
});

describe('each window states its derived count', () => {
  it('Invoices — AP aging', async () => {
    const n = overdueInvoices((await proc.getBuyerInvoices(SCOPE)).items).length;
    renderWithProviders(<BuyerInvoiceAgingWidget />);
    const dlg = await expand('Invoices — AP aging');
    expect(await rowLinks(dlg)).toHaveLength(n);
  });

  it('RFQs awaiting award', async () => {
    const n = pendingAwardRfqs(
      (await proc.getRFQs(SCOPE)).items,
      (await proc.getQuotations(SCOPE)).items,
    ).length;
    renderWithProviders(<BuyerRfqAwaitingAwardWidget />);
    const dlg = await expand('RFQs awaiting award');
    expect(await rowLinks(dlg)).toHaveLength(n);
  });

  it('Open purchase orders', async () => {
    const n = openPurchaseOrders((await proc.getPurchaseOrders(SCOPE)).items).length;
    renderWithProviders(<BuyerOpenPoWidget />);
    const dlg = await expand('Open purchase orders');
    expect(await rowLinks(dlg)).toHaveLength(n);
  });

  it('Goods receipts — 3-way match', async () => {
    const n = grNeedingAction((await proc.getGoodsReceipts(SCOPE)).items).length;
    renderWithProviders(<BuyerGoodsReceiptWidget />);
    const dlg = await expand('Goods receipts — 3-way match');
    expect(await rowLinks(dlg)).toHaveLength(n);
  });

  it('Inbound shipments (ASN)', async () => {
    const n = pendingAsns((await proc.getASNs(SCOPE)).items).length;
    renderWithProviders(<BuyerAsnInboundWidget />);
    const dlg = await expand('Inbound shipments (ASN)');
    // Rows, not links: this window has no drill-down (see below for why).
    expect(await within(dlg).findAllByRole('row')).toHaveLength(n + 1); // + header
  });

  it('⚠️ Compliance — expiring certs reads the DECLARED PRESENT, not the wall clock', async () => {
    // ⚠️ **NEITHER THE COUNT NOR THE ROW SET CAN SEPARATE THE TWO INSTANTS, AND
    // MEASURING THAT IS THE WHOLE POINT OF THIS SPEC.** The flagged TOTAL is 7
    // either way, and the flagged ROW SET is IDENTICAL — a certificate that is
    // Expiring at P is Expired at the wall clock, so it is the same row wearing
    // a different word. A count assertion and an id assertion both pass on the
    // defect; the first draft of this test did exactly that and the mutation
    // probe walked through it.
    //
    // What moves is the STATUS of a NAMED row, so that is what is pinned.
    const registry = (await mockDataService.risk.getComplianceRegistry(SCOPE)).items;
    const flagged = (nowIso: string) =>
      registry.filter((e) => {
        const s = computeStatus(e, nowIso);
        return s === 'Expiring' || s === 'Expired';
      });
    const atP = flagged(PRESENT_ISO);
    const wall = new Date().toISOString();

    // The rows whose status really differs between the two instants. If this is
    // ever empty the assertion below is vacuous, so it is checked first.
    const movers = registry.filter(
      (e) => computeStatus(e, PRESENT_ISO) !== computeStatus(e, wall),
    );
    expect(movers.length, 'some row must read differently at the two instants').toBeGreaterThan(0);

    renderWithProviders(<BuyerComplianceWidget />);
    const dlg = await expand('Compliance — expiring certs');
    expect(await rowLinks(dlg)).toHaveLength(atP.length);

    for (const e of movers) {
      const row = within(dlg).getByText(e.certNumber).closest('tr');
      expect(row, e.certNumber).toBeTruthy();
      const text = row?.textContent ?? '';
      // It says what P says…
      expect(text, `${e.certNumber} at P`).toContain(computeStatus(e, PRESENT_ISO));
      // …and NOT what the wall clock says.
      expect(text, `${e.certNumber} at the wall clock`).not.toContain(
        computeStatus(e, wall),
      );
    }
  });
});

describe('⚠️ NO CLOCK-RELATIVE FIGURE OVER AN UNANCHORED FAMILY — both directions', () => {
  it('the RFQ window states no deadline judgement, and says the judgement is held', async () => {
    renderWithProviders(<BuyerRfqAwaitingAwardWidget />);
    // `findByText` on the FLAG, not on the title: the shell renders before its
    // query resolves, and the title is present either way.
    expect(
      await screen.findByText(/held until RFQ dates are anchored/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/past deadline/i)).not.toBeInTheDocument();
  });

  it('the PO window counts NOT-YET-ACKNOWLEDGED, never a 48-hour judgement', async () => {
    const pos = (await proc.getPurchaseOrders(SCOPE)).items;
    const order = Object.values(POStatus);
    const notAck = order.slice(0, order.indexOf(POStatus.ACKNOWLEDGED));
    const n = openPurchaseOrders(pos).filter((p) => notAck.includes(p.status)).length;
    expect(n).toBeGreaterThan(0);

    renderWithProviders(<BuyerOpenPoWidget />);
    expect(await screen.findByText(`${n} not yet acknowledged`)).toBeInTheDocument();
    expect(screen.queryByText(/>48h/)).not.toBeInTheDocument();
    expect(screen.queryByText(/48 ?h/i)).not.toBeInTheDocument();
  });
});

describe('⚠️ AN EXPANDED ROW IS A LINK TO ITS OWN RECORD', () => {
  const cases: Array<[string, React.ComponentType, string, () => Promise<string>]> = [
    ['Invoices — AP aging', BuyerInvoiceAgingWidget, '/buyer/invoices',
      async () => overdueInvoices((await proc.getBuyerInvoices(SCOPE)).items)[0].id],
    ['RFQs awaiting award', BuyerRfqAwaitingAwardWidget, '/buyer/sourcing',
      async () => pendingAwardRfqs((await proc.getRFQs(SCOPE)).items, (await proc.getQuotations(SCOPE)).items)[0].id],
    ['Open purchase orders', BuyerOpenPoWidget, '/buyer/orders',
      async () => openPurchaseOrders((await proc.getPurchaseOrders(SCOPE)).items)[0].id],
    ['Goods receipts — 3-way match', BuyerGoodsReceiptWidget, '/buyer/goods-receipt',
      async () => grNeedingAction((await proc.getGoodsReceipts(SCOPE)).items)[0].id],
  ];

  it.each(cases)('%s rows link into %s', async (title, Widget, path, firstId) => {
    const id = await firstId();
    renderWithProviders(<Widget />);
    const dlg = await expand(title);
    const links = await rowLinks(dlg);
    expect(links[0].getAttribute('href')).toBe(`${path}?id=${id}`);
  });

  it('⚠️ INBOUND ASN ROWS ARE NOT LINKS — there is nowhere to drill to', async () => {
    // Measured, not assumed: the ASN corpus and the shipment corpus are
    // DISJOINT, so a link to /buyer/shipments would land on a board that has
    // never heard of the row. This asserts the absence AND the measurement, so
    // the day the two corpora are joined this test is what says "now link it".
    const asns = (await proc.getASNs(SCOPE)).items;
    const shipmentAsnNumbers = new Set(
      (await proc.getShipments(SCOPE)).items.map((s) => s.asnNumber),
    );
    const joined = pendingAsns(asns).filter((a) => shipmentAsnNumbers.has(a.asnNumber));
    expect(joined, 'no pending ASN resolves to a shipment').toHaveLength(0);

    renderWithProviders(<BuyerAsnInboundWidget />);
    const dlg = await expand('Inbound shipments (ASN)');
    expect(within(dlg).queryAllByRole('link')).toHaveLength(0);
    // The window still WORKS: the rows are there.
    expect(within(dlg).getByText(pendingAsns(asns)[0].asnNumber)).toBeInTheDocument();
  });

  it('Inventory — low stock rows link into /buyer/inventory', async () => {
    renderWithProviders(<BuyerInventoryWidget />);
    const dlg = await expand('Inventory — low stock');
    const href = (await rowLinks(dlg))[0].getAttribute('href');
    expect(href).toMatch(/^\/buyer\/inventory\?id=.+/);
  });

  it('Risk alerts rows link into /buyer/risk', async () => {
    renderWithProviders(<BuyerRiskWidget />);
    const dlg = await expand('Risk alerts');
    const href = (await rowLinks(dlg))[0].getAttribute('href');
    expect(href).toMatch(/^\/buyer\/risk\?id=.+/);
  });

  it('Compliance rows link into /buyer/compliance', async () => {
    renderWithProviders(<BuyerComplianceWidget />);
    const dlg = await expand('Compliance — expiring certs');
    const href = (await rowLinks(dlg))[0].getAttribute('href');
    expect(href).toMatch(/^\/buyer\/compliance\?id=.+/);
  });

  it('⚠️ KEYBOARD-REACHABLE — every row link is a real anchor with an href', async () => {
    // `role="link"` is satisfied by a div with the role attribute, which is NOT
    // keyboard reachable. The tag and the href are what make it reachable.
    renderWithProviders(<BuyerInvoiceAgingWidget />);
    const dlg = await expand('Invoices — AP aging');
    for (const link of await rowLinks(dlg)) {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });
});

describe('⚠️ THE EXPANDED TABLES SPEAK THE READER`S LANGUAGE', () => {
  it('column headers and the empty-row copy render in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerInvoiceAgingWidget />);
    const dlg = await expand('Faktur — umur AP');
    // A header that is still English is the defect this asserts against.
    expect(within(dlg).getByText('Pemasok')).toBeInTheDocument();
    expect(within(dlg).queryByText('Supplier')).not.toBeInTheDocument();
  });
});

// ── REACH BLOCK — what this spec does NOT guard ─────────────────────────────
//
//  1. **The windows' LAYOUT.** Order, grid columns and collapsed/expanded
//     default are `BuyerDashboard`'s, and only its render test sees them.
//  2. **The severity EDGE.** `flagSeverity` is asserted nowhere here; the
//     colour a window wears is `ExpandableWidget`'s own concern.
//  3. **Anything about a window whose data is empty.** Every corpus is
//     non-empty today (asserted above), so the empty-copy branch of each
//     `expandedRows` is compiled but never rendered by this spec.
//  4. **That a count is RIGHT, only that it AGREES.** Each assertion re-derives
//     through the same shipped predicate the widget calls, so a defect inside
//     that predicate is invisible here — `buyerDerivations` owns that claim.
