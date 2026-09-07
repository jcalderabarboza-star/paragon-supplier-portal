// ─────────────────────────────────────────────────────────────────────────────
// WHO ACTS NEXT, ON THE FLOW-BACKED SURFACES. S2a (buyer) + S2b (supplier).
//
// ⚠️ **ONE NAMED TEST PER SURFACE, AND THAT IS THE WHOLE DESIGN OF THIS FILE.**
// `nextAct.test.ts` already proves the FUNCTION: every arm, both seats, the
// ruling-1 and ruling-2 blocks, the copy map. Re-proving any of that here would
// be a spec that stays green while a surface loses its line — which is exactly
// the probe this batch has to survive. So every assertion below reaches through
// a rendered page to a `data-testid` that only that page owns. Remove the line
// from ONE surface and the test naming THAT surface goes red; the rest stay
// green, which is what makes the probe informative rather than merely loud.
//
// ⚠️ **EVERY TEST WALKS THE PANEL OPEN FIRST.** `SidePanel` (#280) does not
// mount a closed panel's subtree, so a query taken before the walk finds
// nothing — and "not found" is also what a MISSING line looks like. A spec that
// skipped the walk would pass against a page that renders the line, a page that
// renders it in the wrong place, and a page with no line at all.
//
// ⚠️ **THE DOCUMENTS ARE CHOSEN BY ARM, NOT BY CONVENIENCE**, and each arm's
// representative was derived from the fixtures rather than picked by eye. The
// set below reaches `mine`, `theirs`, all three `external` owners, `computed`,
// `ended` and `silent` — through real pages, on real rows.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierInvoices from './SupplierInvoices';
import BuyerRequisitions from './BuyerRequisitions';
import BuyerInvoices from './BuyerInvoices';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import BuyerSourcing from './BuyerSourcing';
import BuyerShipments from './BuyerShipments';
import BuyerSupplierApplications from './BuyerSupplierApplications';
import BuyerContractDetail from './BuyerContractDetail';
import { supplierApplicationStore } from '../services/data/mock/stores/supplierApplicationStore';
import { seedSupplierApplications } from '../services/data/mock/applicationSeed';
import { MockCommandService } from '../services/data/mock/MockCommandService';

/** Assert the line is present, on the expected arm, saying the expected thing. */
const expectLine = async (testId: string, arm: string, text: RegExp) => {
  const line = await screen.findByTestId(testId);
  expect(line, `${testId} resolved the wrong arm`).toHaveAttribute('data-next-act', arm);
  expect(line).toHaveTextContent(text);
  return line;
};

describe('S2a · BuyerRequisitions — the line says who acts on a requisition', () => {
  it('a PR in Pending Approval is the buyer’s move', async () => {
    renderWithProviders(<BuyerRequisitions />);
    fireEvent.click(await screen.findByText('PR-2026-00344'));
    await expectLine('next-act-buyer-pr', 'mine', /Your move/);
  });

  it('⚠️ an Approved PR is `computed` — the platform derives the next step, nobody is waited on', async () => {
    // The arm no other S2a surface reaches. Naming a person here would be the
    // false-handoff defect: there IS no next actor, there is a derivation.
    renderWithProviders(<BuyerRequisitions />);
    fireEvent.click(await screen.findByText('PR-2026-00342'));
    await expectLine('next-act-buyer-pr', 'computed', /derives the next step/i);
  });
});

describe('S2a · BuyerInvoices — the line reads lifecycleState, never the projection', () => {
  it('an invoice in Payment Released names THE BANK', async () => {
    // ⚠️ The buyer PROJECTION for this row is `Payment Released` too, but the
    // rows around it project to `Pending Match` / `Overdue`, which no
    // transition names. Reading `status` would have gone silent on documents
    // the machine can answer for — see the hook's comment on this page.
    renderWithProviders(<BuyerInvoices />);
    fireEvent.click(await screen.findByText('INV-2025-BRL-0042'));
    await expectLine('next-act-buyer-invoice', 'external', /Awaiting the bank/i);
  });

  it('⚠️ THE FIELD CHOICE IS LOAD-BEARING: an invoice projecting Overdue still answers, because the machine reads lifecycleState', async () => {
    // INV-2026-BRL-0051 is `Submitted` to the machine and `Overdue` to the
    // buyer projection. Reading `status` here returns `silent{no-exit}` and the
    // line VANISHES on a document whose next act is the reader's own — which is
    // 6 of the 13 invoice fixtures, not an edge case. This test is what makes
    // the projection/canonical distinction checkable rather than commented.
    renderWithProviders(<BuyerInvoices />);
    fireEvent.click(await screen.findByText('INV-2026-BRL-0051'));
    await expectLine('next-act-buyer-invoice', 'mine', /Your move/);
  });
});

describe('S2b · SupplierInvoices — the supplier side, where the projection costs the most', () => {
  it('an invoice in Payment Released names THE BANK to the supplier too', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByText('INV-2025-BRL-0042'));
    await expectLine('next-act-supplier-invoice', 'external', /Awaiting the bank/i);
  });

  it('⚠️ an OVERDUE invoice says NOTHING — and its canonical state would have answered', async () => {
    // `Overdue` is a COMPUTED projection (`invoiceProjection.isOverdue`, dueDate
    // vs now) that no transition names, so the machine has no edge to report.
    // INV-2026-BRL-0051 is canonically `Submitted`; the buyer surface, which
    // reads `lifecycleState`, says "Your move" on this very document. The
    // supplier DTO carries no `lifecycleState`, so nothing here can recover it.
    // Measured at 5 of 13 fixtures — the projection arm's case, recorded as a
    // test rather than as prose so it cannot quietly stop being true.
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByText('INV-2026-BRL-0051'));
    // POSITIVE CONTROL — a panel-ONLY label proves the walk happened, so the
    // absence below is about the line and not about a panel that never opened.
    // (The status word itself is not usable as the control: it renders in the
    // row AND the panel, so it is ambiguous by construction.)
    expect(await screen.findByText('Buyer contact')).toBeInTheDocument();
    expect(screen.queryByTestId('next-act-supplier-invoice')).toBeNull();
  });
});

describe('S2a · BuyerGoodsReceipt — the line says who acts on a receipt', () => {
  it('a GR Under Inspection is the buyer’s move', async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    fireEvent.click(await screen.findByText('GR-2026-001'));
    await expectLine('next-act-buyer-gr', 'mine', /Your move/);
  });
});

describe('S2a · BuyerSourcing — the line says who acts on an RFQ', () => {
  it('an Open RFQ is the buyer’s move', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-001'));
    await expectLine('next-act-buyer-rfq', 'mine', /Your move/);
  });
});

describe('S2a · BuyerShipments — the line names the carrier, and goes quiet on a projection', () => {
  it('a shipment in Pending ASN names TMS', async () => {
    renderWithProviders(<BuyerShipments />);
    fireEvent.click(await screen.findByText('ASN-2026-001'));
    await expectLine('next-act-buyer-shipment', 'external', /Awaiting TMS/i);
  });

  it('⚠️ a DELAYED shipment says NOTHING — `Delayed` is a clock projection, not a machine state', async () => {
    // Law 0.5: `Delayed` is computed at read time and no transition names it,
    // so the machine has no edge to report and the line is ABSENT rather than
    // guessing. The panel is open — the assertion is about the line, not the
    // walk. Whether that silence is LEGIBLE TO A READER is measured and
    // reported in this batch, not repaired here.
    renderWithProviders(<BuyerShipments />);
    fireEvent.click(await screen.findByText('ASN-2026-018'));
    // POSITIVE CONTROL — a panel-ONLY label proves the walk happened. Without
    // it the `toBeNull` below would pass identically on a page that never
    // opened anything, which is the one-sided probe rule 4 refuses.
    expect(await screen.findByText('Key facts')).toBeInTheDocument();
    expect(screen.queryByTestId('next-act-buyer-shipment')).toBeNull();
  });
});

describe('S2a · BuyerSupplierApplications — the line says who acts on an application', () => {
  const commands = new MockCommandService();
  beforeEach(async () => {
    supplierApplicationStore.reset();
    const outcome = await seedSupplierApplications(commands);
    expect(outcome.status).toBe('seeded');
  });

  it('a submitted application is the buyer’s move', async () => {
    renderWithProviders(<BuyerSupplierApplications />);
    const first = supplierApplicationStore.all()[0];
    fireEvent.click(await screen.findByText(first.applicationNumber));
    await expectLine('next-act-buyer-application', 'mine', /Your move/);
  });
});

describe('S2a · contract detail — the surface where #311 reaches a reader', () => {
  const at = (path: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
      </Routes>,
      { route: path },
    );

  it('⚠️ an ACTIVE contract names S/4HANA — the four contract verbs became external-fact at #311', async () => {
    // Before #311 these verbs were surfaceable and this page offered nothing;
    // after it, every contract state is stranded and this line is the only
    // thing on the page that says whose wait it is.
    at('/buyer/contracts/ctr-001');
    await screen.findByText(/CTR-2026-001/);
    await expectLine('next-act-buyer-contract', 'external', /Awaiting S\/4HANA/i);
  });

  it('an EXPIRING contract says nothing — `Expiring` is a clock projection (law 0.5)', async () => {
    at('/buyer/contracts/ctr-007');
    await screen.findByText(/CTR-2025-044/);
    expect(screen.queryByTestId('next-act-buyer-contract')).toBeNull();
  });
});
