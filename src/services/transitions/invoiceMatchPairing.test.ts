// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE PAIRING, BOTH DIRECTIONS — and the evidence base is ONE ROW, said plainly.
//
// ⚠️ **WHAT THIS FILE IS FOR, IN ONE LINE: THE RELATION EXISTED AND HAD NO NAME,
// SO IT COULD ONLY BE ASKED IN THE DIRECTION SOMEBODY HAPPENED TO WRITE.** The
// PO×state relation between a receipt and an invoice lived as one `continue`
// clause inside `MockCommandService.resolveCascades`, reachable only from the
// receipt side. The consequence is a defect the tree really carries: **an
// invoice submitted AFTER its receipt is matched by nothing, ever.**
//
// ⚠️ **THE BREADTH IS NAMED RATHER THAN IMPLIED, BECAUSE IT IS ONE ROW.** Over
// the shipped corpus exactly ONE invoice pairs to a landed receipt —
// `inv-mus-0214` ↔ `GR-2026-014` — and TWELVE pair to nothing. A file that read
// as though it were guarding a population would be claiming twelve rows it
// cannot reach. The negative path is the common path here, by 12 to 1, and it is
// asserted hardest for exactly that reason.
//
// ⚠️ **RULE 4 THROUGHOUT.** Every "pairs nothing" is paired with a "pairs this,
// by name" on the SAME instrument, because a pairing function that returned `[]`
// for everything would satisfy every negative claim in this file by accident.
//
// ⚠️ **AND THE POPULATION IS DERIVED UPSTREAM OF THE CODE UNDER TEST (§86).**
// Every population below comes from the FIXTURES — `INVOICES`,
// `mockGoodsReceipts` — never from `invoicesForReceipt` / `receiptsForInvoice`
// themselves. A gate that derived its rows through the predicate it is probing
// goes red on its own population control while the assertion it exists to make
// never runs, and a counter watching pass/fail scores that as a kill.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  invoicesForReceipt,
  receiptsForInvoice,
  INVOICE_AWAITING_MATCH,
  RECEIPT_LANDED_STATES,
} from './invoiceRollup';
import { INVOICES } from '../data/mock/fixtures/invoices';
import { mockGoodsReceipts } from '../../data/mockGoodsReceipts';

/** The specimen, named once so every reference below is the same row. */
const SPECIMEN_INVOICE = 'inv-mus-0214';
const SPECIMEN_RECEIPT = 'GR-2026-014';
const SPECIMEN_PO = 'PO-2025-00102';

const invoice = (id: string) => {
  const row = INVOICES.find((i) => i.id === id);
  if (!row) throw new Error(`fixture invoice ${id} is gone — this spec's subject moved`);
  return row;
};
const receipt = (grNumber: string) => {
  const row = mockGoodsReceipts.find((g) => g.grNumber === grNumber);
  if (!row) throw new Error(`fixture receipt ${grNumber} is gone — this spec's subject moved`);
  return row;
};

describe('POPULATION GUARD — derived from the fixtures, never through the pairing', () => {
  // §42b / EMPTY-INPUT-REPORTS-CLEAN-01: without this the whole file passes
  // vacuously over two empty arrays. Membership, never a count.
  it('⚠️ FIRST — both corpora are loaded and name this spec’s subjects', () => {
    expect(INVOICES.map((i) => i.id)).toContain(SPECIMEN_INVOICE);
    expect(mockGoodsReceipts.map((g) => g.grNumber)).toContain(SPECIMEN_RECEIPT);
    expect(INVOICES.length).toBeGreaterThan(1);
    expect(mockGoodsReceipts.length).toBeGreaterThan(1);
  });

  it('the specimen pair really is a pair in the DATA — same PO, receipt landed, invoice awaiting', () => {
    // ⚠️ DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01: pinned through
    // VALUES, not ids. A corpus replacement that keeps the ids and changes the
    // states walks straight through an id-only control.
    expect(invoice(SPECIMEN_INVOICE).poNumber).toBe(SPECIMEN_PO);
    expect(receipt(SPECIMEN_RECEIPT).poNumber).toBe(SPECIMEN_PO);
    expect(invoice(SPECIMEN_INVOICE).status).toBe(INVOICE_AWAITING_MATCH);
    expect(RECEIPT_LANDED_STATES).toContain(receipt(SPECIMEN_RECEIPT).status);
  });

  it('the landed-state set is narrow, and the SAP interim is NOT in it', () => {
    expect(RECEIPT_LANDED_STATES).toEqual(['Posted to SAP']);
    // The Option-B interim mints no material document. Treating it as landed
    // would assert a receipt that has not settled.
    expect(RECEIPT_LANDED_STATES).not.toContain('Posting to SAP');
    expect(RECEIPT_LANDED_STATES).not.toContain('Approved');
  });
});

describe('⚠️ THE SHIPPED DIRECTION IS UNCHANGED — receipt → invoices', () => {
  // This is the regression gate for the extraction. The clause that used to sit
  // inline in `resolveCascades` is re-stated here INDEPENDENTLY and the two must
  // agree on every receipt in the corpus. If they ever disagree, the refactor
  // moved behaviour, and this is where it is caught.
  const legacyFilter = (poNumber: string) =>
    INVOICES.filter((i) => i.poNumber === poNumber && i.status === 'Submitted');

  it('agrees with the pre-extraction clause on EVERY receipt in the corpus', () => {
    for (const gr of mockGoodsReceipts) {
      expect(
        invoicesForReceipt(gr, INVOICES).map((i) => i.id),
        `receipt ${gr.grNumber} (${gr.poNumber}) paired differently after extraction`,
      ).toEqual(legacyFilter(gr.poNumber).map((i) => i.id));
    }
    // Paired membership: the loop is not vacuous, and at least one receipt
    // really does pair something — so "they agree" is not "both are always
    // empty", which is the way this assertion would otherwise lie.
    expect(mockGoodsReceipts.length).toBeGreaterThan(0);
    expect(invoicesForReceipt(receipt(SPECIMEN_RECEIPT), INVOICES).map((i) => i.id)).toEqual([
      SPECIMEN_INVOICE,
    ]);
  });

  it('⚠️ does NOT gate on the receipt’s own status — the live cascade depends on that', () => {
    // The `t_gr_post` cascade runs POST-APPLY, so the receipt's state at call
    // time is the interim 'Posting to SAP', never 'Posted to SAP'. A
    // receipt-status filter here would silently empty the shipped path. This
    // asserts the ABSENCE of that filter positively, from two directions.
    const notLanded = mockGoodsReceipts.filter((g) => !RECEIPT_LANDED_STATES.includes(g.status));
    expect(notLanded.length).toBeGreaterThan(0); // anti-vacuity
    const paired = notLanded.filter((g) => invoicesForReceipt(g, INVOICES).length > 0);
    expect(
      paired.map((g) => g.grNumber),
      'a receipt that has NOT landed must still pair — the caller’s premise is that it is landing',
    ).not.toEqual([]);
    // And the synthetic half, independent of which fixtures happen to exist: the
    // interim state pairs exactly as the settled one does.
    const inFlight = { poNumber: SPECIMEN_PO, status: 'Posting to SAP' } as const;
    expect(invoicesForReceipt(inFlight, INVOICES).map((i) => i.id)).toEqual([SPECIMEN_INVOICE]);
  });

  it('a receipt on a PO with no awaiting invoice pairs NOTHING', () => {
    const orphan = { poNumber: 'PO-9999-00000', status: 'Posted to SAP' } as const;
    expect(invoicesForReceipt(orphan, INVOICES)).toEqual([]);
  });
});

describe('⚠️ THE MIRROR — invoice → receipts. The direction the tree could not ask.', () => {
  it('THE SPECIMEN: inv-mus-0214 finds GR-2026-014, and this is the whole positive case', () => {
    expect(
      receiptsForInvoice(invoice(SPECIMEN_INVOICE), mockGoodsReceipts).map((g) => g.grNumber),
    ).toEqual([SPECIMEN_RECEIPT]);
  });

  it('⚠️ THE NEGATIVE PATH IS THE COMMON ONE — 12 of the 13 invoices pair NOTHING', () => {
    // Derived from the fixtures rather than restated as a number in prose: the
    // two populations are computed and asserted to PARTITION the corpus, so
    // neither can be quietly empty and neither can quietly grow.
    const pairsSomething = INVOICES.filter(
      (inv) => receiptsForInvoice(inv, mockGoodsReceipts).length > 0,
    ).map((i) => i.id);
    const pairsNothing = INVOICES.filter(
      (inv) => receiptsForInvoice(inv, mockGoodsReceipts).length === 0,
    ).map((i) => i.id);

    // The whole positive population, by name. One row.
    expect(pairsSomething).toEqual([SPECIMEN_INVOICE]);
    expect(pairsNothing).not.toContain(SPECIMEN_INVOICE);
    expect(pairsNothing.length + pairsSomething.length).toBe(INVOICES.length);
    expect(pairsNothing.length).toBeGreaterThan(pairsSomething.length);
  });

  it('a receipt that EXISTS but has not landed does not pair — inspection is not receipt', () => {
    // `inv-brl-0051` sits on PO-2025-00115, which carries GR-2026-009 in
    // 'Pending Inspection'. The receipt exists; it has not landed; the invoice
    // pairs nothing. This is the row that shows the landed-state gate doing
    // work, rather than the PO match doing all of it on its own.
    const inv = invoice('inv-brl-0051');
    const onSamePo = mockGoodsReceipts.filter((g) => g.poNumber === inv.poNumber);
    expect(onSamePo.length).toBeGreaterThan(0); // the receipt really is there
    expect(RECEIPT_LANDED_STATES).not.toContain(onSamePo[0].status); // …and has not landed
    expect(receiptsForInvoice(inv, mockGoodsReceipts)).toEqual([]);
  });

  it('an invoice on a PO no receipt names pairs NOTHING', () => {
    expect(
      receiptsForInvoice({ poNumber: 'PO-9999-00000', status: 'Submitted' }, mockGoodsReceipts),
    ).toEqual([]);
  });

  it('every candidate is returned, not one chosen — picking is a ruling, not a derivation', () => {
    // Two landed receipts on one PO is unreachable in today's corpus (14
    // receipts across 14 distinct POs) and ordinary the moment a delivery is
    // partial. The function must hand back both rather than choose one, because
    // choosing is the ruling that has not been made.
    const twoLanded = [
      { grNumber: 'GR-A', poNumber: SPECIMEN_PO, status: 'Posted to SAP' },
      { grNumber: 'GR-B', poNumber: SPECIMEN_PO, status: 'Posted to SAP' },
      { grNumber: 'GR-C', poNumber: SPECIMEN_PO, status: 'Approved' },
    ] as const;
    expect(receiptsForInvoice(invoice(SPECIMEN_INVOICE), twoLanded).map((g) => g.grNumber)).toEqual([
      'GR-A',
      'GR-B',
    ]);
  });
});

describe('IDEMPOTENCE — pairing twice gives the same answer, both directions', () => {
  // ⚠️ Asserted rather than assumed. Both functions are pure filters over their
  // arguments, so this cannot fail today — which is the point: it is the
  // property a SECOND writer would break, and it is pinned before one exists.
  it('receipt → invoices is stable across repeated calls', () => {
    const gr = receipt(SPECIMEN_RECEIPT);
    const a = invoicesForReceipt(gr, INVOICES).map((i) => i.id);
    const b = invoicesForReceipt(gr, INVOICES).map((i) => i.id);
    expect(b).toEqual(a);
    expect(a).toEqual([SPECIMEN_INVOICE]); // …and is not the empty answer twice
  });

  it('invoice → receipts is stable across repeated calls', () => {
    const inv = invoice(SPECIMEN_INVOICE);
    const a = receiptsForInvoice(inv, mockGoodsReceipts).map((g) => g.grNumber);
    const b = receiptsForInvoice(inv, mockGoodsReceipts).map((g) => g.grNumber);
    expect(b).toEqual(a);
    expect(a).toEqual([SPECIMEN_RECEIPT]);
  });

  it('neither direction mutates its inputs', () => {
    const invoicesBefore = INVOICES.map((i) => `${i.id}:${i.status}`);
    const receiptsBefore = mockGoodsReceipts.map((g) => `${g.grNumber}:${g.status}`);
    invoicesForReceipt(receipt(SPECIMEN_RECEIPT), INVOICES);
    receiptsForInvoice(invoice(SPECIMEN_INVOICE), mockGoodsReceipts);
    expect(INVOICES.map((i) => `${i.id}:${i.status}`)).toEqual(invoicesBefore);
    expect(mockGoodsReceipts.map((g) => `${g.grNumber}:${g.status}`)).toEqual(receiptsBefore);
  });
});
