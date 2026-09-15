// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE INVOICE FAMILY'S OWN TWO PROPERTIES — the buyer surface has something to
// show, and the three-way match has somewhere to start.
//
// ⚠️ **WHAT WENT WRONG, MEASURED RATHER THAN DESCRIBED.** The invoice corpus
// carried fixed `dueDate` literals and was the last date-bearing family with no
// anchor. Read at `DECLARED_PRESENT` before this batch, FIVE of the six open
// rows computed `Overdue`; the buyer surface rendered `Pending Match 0` and
// `Approved 0`; and the one row the corpus INTENDS to be overdue — `inv-evo-0188`,
// which says so in its own comment — was indistinguishable from four that had
// merely aged past their dates. Nothing was wrong with the fixtures. The present
// had walked away from them, and no gate in this repository was watching,
// because every clock-aware invoice spec pinned `DEMO_NOW` and the pin is what
// the browser does not import.
//
// ⚠️ **NEITHER TEST BELOW READS A WALL CLOCK, AND THAT IS THE WHOLE POINT.**
// `DECLARED_PRESENT` is frozen and the corpus is shifted relative to it, so
// there is no day on which either can begin failing with no commit involved —
// the CP-0 trap these fixtures fell into is exactly what is being closed, and
// closing it with a dated assertion would be closing it with its own defect.
//
// ⚠️ **AND `anchoredSurfaces.guard.test.tsx` IS NOT THE RIGHT HOME FOR EITHER,
// WHICH IS WORTH STATING BECAUSE ITS HEADER NAMES THIS BATCH AS ITS
// PRECONDITION.** Its property is clock-INDEPENDENCE — the same rendered text at
// two instants years apart — and `BuyerInvoices` cannot have that while
// `MockProcurementService` takes its `now` off the wall clock, anchored family or
// not. Anchoring RE-CENTRES the read on `P`; it does not remove the clock from
// it. The invoices surface was NOT in that file's population before this batch
// and is NOT added to it by this batch; its exclusion note is corrected there to
// say which precondition was met and which was never stated.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { INVOICES } from './mock/fixtures/invoices';
import { toBuyerLabel, isOverdue } from './invoiceProjection';
import { DECLARED_PRESENT, FAMILY_ANCHORS, shiftDays } from './fixturePresent';
import { mockGoodsReceipts } from '../../data/mockGoodsReceipts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import {
  invoicesForReceipt,
  deriveMatchVerdict,
  INVOICE_AWAITING_MATCH,
} from '../transitions/invoiceRollup';
import { getKnownFlows } from '../transitions/registry';
import '../transitions/index';
import type { BuyerInvoiceStatus } from './types';

/** The one instant either property is asserted at. Never a wall-clock read. */
const NOW = `${DECLARED_PRESENT}T00:00:00+07:00`;

/**
 * What a BUYER can actually see. `MockProcurementService` filters `Draft` BEFORE
 * projecting (a draft is supplier-private), so a label whose only member is a
 * draft is an EMPTY label on the buyer surface — which is precisely how
 * `Pending Match` came to read 0 while a `Pending Match`-shaped row existed.
 * Derived from the canonical status here rather than called through the service,
 * so this population does not run through the code it is describing (§86).
 */
const buyerVisible = INVOICES.filter((inv) => inv.status !== 'Draft');

describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('⚠️ FIRST — the corpus is loaded, is SHIFTED, and names its subjects', () => {
    // §42b / EMPTY-INPUT-REPORTS-CLEAN-01: every claim below is a filter over
    // these arrays, and a filter over an empty array satisfies nothing honestly.
    expect(INVOICES.length).toBeGreaterThan(1);
    expect(mockGoodsReceipts.length).toBeGreaterThan(1);
    expect(mockPurchaseOrders.length).toBeGreaterThan(1);
    // Membership, never a count — and both a known-present and a known-absent id.
    expect(INVOICES.map((i) => i.id)).toContain('inv-evo-0188');
    expect(INVOICES.map((i) => i.id)).not.toContain('inv-does-not-exist');
    // The shift is REAL. If this ever passes trivially the family is anchored in
    // name only and every assertion below is about the raw literals again.
    expect(shiftDays('invoice')).not.toBe(0);
    expect(INVOICES.find((i) => i.id === 'inv-evo-0188')!.dueDate).not.toBe('2026-06-04');
  });

  it('the Draft filter really removes a row — the buyer population is a proper subset', () => {
    // Anti-vacuity for `buyerVisible`: if nothing were filtered, the label test
    // below would be asserting over the whole corpus and would pass for the
    // wrong reason, which is how `Pending Match 0` shipped in the first place.
    expect(buyerVisible.length).toBeLessThan(INVOICES.length);
    expect(INVOICES.some((i) => i.status === 'Draft')).toBe(true);
  });
});

describe('⚠️ EVERY BUYER LABEL HAS A MEMBER THE BUYER CAN REACH', () => {
  it('all five labels are non-empty at the declared present', () => {
    const byLabel = new Map<BuyerInvoiceStatus, string[]>();
    for (const inv of buyerVisible) {
      const label = toBuyerLabel(inv, NOW);
      byLabel.set(label, [...(byLabel.get(label) ?? []), inv.id]);
    }

    // ⚠️ THE LABEL SET IS DERIVED FROM THE PROJECTION, NOT LISTED HERE. A
    // hand-written list is a list (CENSUS-MUST-DERIVE-01), and it would go
    // stale silently the day `BuyerInvoiceStatus` gains a member — which is the
    // one day this assertion most needs to fire. Every label the switch can
    // return is exercised by feeding it every canonical status.
    const reachable = new Set<BuyerInvoiceStatus>();
    for (const inv of INVOICES) reachable.add(toBuyerLabel(inv, NOW));
    for (const inv of INVOICES) {
      // Past-due forces the Overdue arm for any OVERDUE_ELIGIBLE row.
      reachable.add(toBuyerLabel({ ...inv, dueDate: '2000-01-01' }, NOW));
    }
    expect(reachable.size).toBeGreaterThan(1); // the derivation is not degenerate

    for (const label of [...reachable].sort()) {
      expect(byLabel.get(label) ?? [], `buyer label "${label}" has no reachable member`)
        .not.toEqual([]);
    }
  });

  it('⚠️ the corpus’ OWN authored intent holds — exactly one row is overdue', () => {
    // The oracle is the corpus's second opinion about itself, not this file's:
    // the header of `fixtures/invoices.ts` says only rows INTENDED to be
    // past-due carry a past `dueDate`, and exactly one row's comment claims that
    // intent. Asserting the SET, not the count — a count is satisfied by the
    // wrong row, which is the failure this whole batch is repairing.
    const overdue = INVOICES.filter((inv) => isOverdue(inv, NOW)).map((i) => i.id);
    expect(overdue).toEqual(['inv-evo-0188']);
  });

  it('the anchor is the midpoint of the band where that intent holds', () => {
    // Re-derives the declared window from the SHIPPED projection rather than
    // trusting the two literals in `FAMILY_ANCHORS` — so a re-authored due date
    // moves the window and reddens this, with nobody editing the anchor.
    const MS = 86_400_000;
    const dayMs = (d: string) => Date.parse(`${d}T00:00:00.000Z`);
    const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const raw = INVOICES.map((inv) => ({
      ...inv,
      dueDate: iso(dayMs(inv.dueDate) - shiftDays('invoice') * MS),
      paymentDate: inv.paymentDate
        ? iso(dayMs(inv.paymentDate) - shiftDays('invoice') * MS)
        : inv.paymentDate,
    }));
    const coherent = (present: string) => {
      const at = `${present}T00:00:00+07:00`;
      const od = raw.filter((inv) => isOverdue(inv, at)).map((i) => i.id);
      if (od.length !== 1 || od[0] !== 'inv-evo-0188') return false;
      return !raw.some((inv) => inv.paymentDate && inv.paymentDate > present);
    };

    const [lo, hi] = FAMILY_ANCHORS.invoice.window!;
    expect(coherent(lo)).toBe(true);
    expect(coherent(hi)).toBe(true);
    expect(coherent(FAMILY_ANCHORS.invoice.anchor)).toBe(true);
    // ⚠️ CONTROL BOTH WAYS — one day outside either edge and the oracle breaks,
    // so "coherent" is a real discriminator rather than a function returning
    // true. Without this the three assertions above are satisfied by `() => true`.
    expect(coherent(iso(dayMs(lo) - MS))).toBe(false);
    expect(coherent(iso(dayMs(hi) + MS))).toBe(false);
  });
});

describe('⚠️ A MATCHED-REACHABLE PATH EXISTS — by property, never by fixture id', () => {
  /** Every state `t_gr_post` is legal from, read off the shipped machine. */
  const postableFrom = (): readonly string[] => {
    for (const flow of getKnownFlows()) {
      for (const t of flow.transitions) if (t.id === 't_gr_post') return t.from;
    }
    throw new Error('t_gr_post is gone — this spec’s subject moved');
  };

  it('t_gr_post is a real, surfaced verb with at least one from-state', () => {
    // The population control for the property below: if the verb were unsurfaced
    // or unreachable, "a receipt exists in one of its from-states" would be true
    // and worthless. Asserted upstream of the fixtures, from the machine.
    const flow = getKnownFlows().find((f) => f.entity === 'goodsReceipt')!;
    const post = flow.transitions.find((t) => t.id === 't_gr_post')!;
    expect(post.from.length).toBeGreaterThan(0);
    expect(post.surfaceable.surfaced).toBe(true);
  });

  it('⚠️ THE PROPERTY: some awaiting, non-overdue invoice sits on a PO whose receipt can still post, at a value the match engine accepts', () => {
    const from = postableFrom();
    const reachable = INVOICES.filter((inv) => {
      if (inv.status !== INVOICE_AWAITING_MATCH) return false;
      if (isOverdue(inv, NOW)) return false; // else it renders Overdue, not Pending Match
      const po = mockPurchaseOrders.find((p) => p.poNumber === inv.poNumber);
      if (!po) return false; // `resolveCascades` returns [] on an unknown PO
      const expected = po.lineItems.reduce(
        (sum, li) => sum + li.confirmedQty * li.unitPrice,
        0,
      );
      return mockGoodsReceipts.some((gr) => {
        if (gr.poNumber !== inv.poNumber) return false;
        if (!from.includes(gr.status)) return false;
        const rejects = gr.inspectionResults.some((r) => r.qtyRejected > 0);
        return deriveMatchVerdict(expected, inv.amount, rejects) === 'Matched';
      });
    });

    expect(
      reachable.map((i) => i.id),
      'no click path in this portal reaches Matched — t_invoice_approve has no from-state',
    ).not.toEqual([]);

    // ⚠️ RULE 4 — the same instrument must REFUSE something, or "not empty" is
    // a claim about a filter that accepts everything. A receipt on a PO nobody
    // invoices, and an invoice on a PO no receipt names, are both refused.
    expect(
      INVOICES.filter((inv) => inv.poNumber === 'PO-9999-00000').map((i) => i.id),
    ).toEqual([]);
    // The status is taken from a REAL receipt in a postable state rather than
    // from the flow's `from` (which is `readonly string[]`), so the control is
    // typed as a `GRStatus` and cannot drift away from the machine either.
    const postable = mockGoodsReceipts.find((gr) => from.includes(gr.status))!;
    const orphan = { poNumber: 'PO-9999-00000', status: postable.status };
    expect(invoicesForReceipt(orphan, INVOICES)).toEqual([]);
  });

  it('and the receipt that carries it pairs the invoice through the shipped relation', () => {
    // The cascade does not re-derive the pairing — it calls `invoicesForReceipt`.
    // Asserting the property through that function is what makes this a claim
    // about the SHIPPED path rather than about a predicate written here.
    const from = postableFrom();
    const pairs = mockGoodsReceipts
      .filter((gr) => from.includes(gr.status))
      .flatMap((gr) => invoicesForReceipt(gr, INVOICES).map((inv) => `${gr.grNumber}->${inv.id}`));
    expect(pairs).not.toEqual([]);
  });
});
