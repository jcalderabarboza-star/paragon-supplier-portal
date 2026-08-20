// ────────────────────────────────────────────────────────────────────────────
// Invoice read projection at the SERVICE seam (v2.2 Step 4 batch iii, DR-7).
//
// The payoff proof through the real MockProcurementService: ONE canonical store
// row is read on BOTH persona surfaces, correctly-but-differently labelled, and
// they advance coherently after a command. This is the guarantee the two
// hand-maintained fixtures could not give (INV-XPERSONA-FIXTURE-01).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockProcurementService } from './MockProcurementService';
import { MockCommandService } from './MockCommandService';
import { invoiceStore } from './stores/invoiceStore';
import { INVOICES } from './fixtures/invoices';
import { usePinnedDemoClock } from '../../../test/demoClock';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const reads = new MockProcurementService();
const commands = new MockCommandService();
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

// These reads project `Overdue` from the clock (`invoiceProjection`), and the
// service seam supplies `now` from the wall clock. Without a pinned instant the
// per-persona labels below are only true until a fixture's `dueDate` passes —
// `inv-brl-0051` crossed on 2026-08-02 and broke this spec with no commit
// involved (2e-c-6-FIND-01). Pinned to the instant the fixtures are coherent at.
usePinnedDemoClock();

beforeEach(() => {
  invoiceStore.reset();
});

describe('invoice reads — one canonical store, two truthful persona views', () => {
  it('the SAME document is labelled per-persona (Submitted → Pending Approval / Pending Match)', async () => {
    // inv-brl-0051 (sup-007) is canonical Submitted.
    const sup = (await reads.getSupplierInvoices(sup007)).items.find(
      (i) => i.invoiceNumber === 'INV-2026-BRL-0051',
    )!;
    const buy = (await reads.getBuyerInvoices(buyer)).items.find(
      (i) => i.invoiceNumber === 'INV-2026-BRL-0051',
    )!;
    expect(sup.status).toBe('Pending Approval');
    expect(buy.status).toBe('Pending Match');
  });

  it('drafts are supplier-private — visible to the supplier, hidden from the buyer', async () => {
    const supHasDraft = (await reads.getSupplierInvoices(sup007)).items.some(
      (i) => i.invoiceNumber === 'INV-2026-BRL-0055',
    );
    const buyHasDraft = (await reads.getBuyerInvoices(buyer)).items.some(
      (i) => i.invoiceNumber === 'INV-2026-BRL-0055',
    );
    expect(supHasDraft).toBe(true);
    expect(buyHasDraft).toBe(false);
  });

  it('a buyer command advances BOTH surfaces coherently — no drift', async () => {
    // inv-giv-0892 (sup-003) is Approved. Release + settle → both read Payment Released.
    const sup003: QueryScope = { personaType: 'supplier', supplierId: 'sup-003', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
    const post = await commands.dispatch(buyer, {
      transitionId: 't_invoice_release_payment',
      entity: 'invoice',
      entityId: 'inv-giv-0892',
    });
    await commands.settle(buyer, post.correlationId);

    const buy = (await reads.getBuyerInvoices(buyer)).items.find(
      (i) => i.invoiceNumber === 'INV-2025-GIV-0892',
    )!;
    const sup = (await reads.getSupplierInvoices(sup003)).items.find(
      (i) => i.invoiceNumber === 'INV-2025-GIV-0892',
    )!;
    expect(buy.status).toBe('Payment Released');
    expect(sup.status).toBe('Payment Released');
    expect(sup.sapFiDoc).toMatch(/^FI-/); // real FI doc surfaced to the supplier
  });

  it('Overdue is computed at read for an open, past-due invoice (never stored)', async () => {
    // inv-evo-0188 (sup-006) is Approved + past due → both personas see Overdue.
    const buy = (await reads.getBuyerInvoices(buyer)).items.find(
      (i) => i.invoiceNumber === 'INV-2025-EVO-0188',
    )!;
    expect(buy.status).toBe('Overdue');
    expect(buy.daysOutstanding).toBeGreaterThan(0);
  });
});

describe('invoice fixture integrity — FI document only exists post-settle (F-1)', () => {
  // The FI (financial) document mints ONLY on payment settlement (invoiceStore
  // invariant, Option B). So NO pre-settle fixture may carry an sapFiDoc — that
  // was the INV-GIV-0892 contradiction, and inv-msm-0224 / inv-evo-0188 shared it.
  // (sapGrDoc is a separate goods-receipt doc and may legitimately precede payment.)
  const SETTLED = new Set(['Payment Released', 'Remittance Received']);

  it('every seeded invoice with an FI doc is settled AND carries a payment ref + date', () => {
    for (const inv of INVOICES) {
      if (inv.sapFiDoc !== null) {
        expect(SETTLED.has(inv.status), `${inv.invoiceNumber} holds an FI doc while ${inv.status}`).toBe(true);
        expect(inv.paymentRef, `${inv.invoiceNumber} has an FI doc but no payment ref`).not.toBeNull();
        expect(inv.paymentDate, `${inv.invoiceNumber} has an FI doc but no payment date`).not.toBeNull();
      }
    }
  });
});
