// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-5b-i — EVERY ASN REFERENCE RESOLVES TO THE OBJECT IT NAMES.
//
// ── THE GOVERNING LINE ──────────────────────────────────────────────────────
//   A REFERENCE THAT RESOLVES TO THE WRONG OBJECT IS NOT WEAKER EVIDENCE THAN
//   NO REFERENCE. IT IS EVIDENCE POINTING THE WRONG WAY, AND A RETIREMENT RULE
//   THAT READS IT WILL RETIRE ONTO THE WRONG CODE.
//
//   That is why 2B-5b stopped. It was dispatched to retire seven `MAT-*` codes
//   onto master rows under R-1's declared-ownership rule; the rule needs a
//   matching master row, and the strongest evidence of what an ASN line IS
//   would be its parent PO line. ONE OF SIX ASNs NAMED A PO ITS OWN SUPPLIER
//   OWNED. ZERO NAMED A PO CARRYING THE MATERIAL THEY SHIP.
//
// ── THE SECOND LANE OF THE SAME DEFECT ──────────────────────────────────────
//   2B-5a repaired this shape in the outbound chase lane (chase → scheduling
//   agreement). This is the ASN lane (ASN → purchase order), and both now run
//   through the SAME harness (`services/testing/referentialIntegrity.ts`) —
//   which exists because 2B-5a's hand-written vacuity guard was a guard you
//   had to remember to write. `AxisResult` cannot report disagreements without
//   also reporting how many references it resolved.
//
// ── WHAT IS REPAIRED AND WHAT IS DELIBERATELY NOT ───────────────────────────
//   REPAIRED: existence and TENANT OWNERSHIP, on all six. Four references were
//   cross-tenant and one named a PO that did not exist. `poReference` renders
//   to the addressee and flows into the GR wizard's draft `poNumber`, so a
//   Sample Fragrance House document number was reaching PT Sample Packaging — scoping is enforced on
//   `supplierId` and cannot see a foreign identifier inside a string field.
//   NOT REPAIRED: the MATERIAL axis. Every ASN line that would need a matching
//   PO line carries a third-space `MAT-*` code, and authoring that PO line
//   means either widening a space R-3 declared dead INTO the declared document
//   lane, or retiring the code — which is 5b-ii's ruling, not this batch's.
//   THE RESIDUAL IS AN EXACT SET BELOW, NOT A SILENCE.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { MOCK_ASNS } from './supplierShipments';
import { mockPurchaseOrders } from '../../../../data/mockPurchaseOrders';
import { POStatus } from '../../types';
import { MATERIAL_MASTER } from '../../../sdc';
import { axis, unresolved } from '../../../testing/referentialIntegrity';

const poOf = (asn: { poReference: string }) =>
  mockPurchaseOrders.find((p) => p.poNumber === asn.poReference);

/** Every ASN line, carried with its own ASN so a report can name both. */
const LINES = MOCK_ASNS.flatMap((asn) => asn.lineItems.map((line) => ({ asn, line })));

describe('2B-5b-i — the ASN lane resolves', () => {
  it('the population is real (guards a vacuous pass)', () => {
    // Every assertion below is a loop or a filter, and an empty population
    // satisfies all of them. `EMPTY-INPUT-REPORTS-CLEAN-01`, guarded first.
    expect(MOCK_ASNS.length).toBe(6);
    expect(LINES.length).toBe(7);
    expect(mockPurchaseOrders.length).toBeGreaterThan(15);
  });

  it('AXIS 1 — the named PO EXISTS', () => {
    // ⚠️ `PO-2025-00131` is why this axis is not a formality. It was named by
    // THREE fixtures and authored by none. Operator ruling R-4 authored the
    // object rather than repointing the references: REPOINTING THREE
    // REFERENCES TO HIDE A MISSING OBJECT IS WORSE THAN THE GAP.
    expect(
      unresolved(MOCK_ASNS, poOf, (a) => `${a.asnNumber} → ${a.poReference} (no such PO)`),
    ).toEqual([]);
  });

  it('AXIS 2 — the named PO belongs to the SUPPLIER THE ASN IS ADDRESSED TO', () => {
    // ⚠️ THE AXIS THAT LEAKS, and the reason this batch is not cosmetic. Four
    // of six were cross-tenant.
    const result = axis(
      MOCK_ASNS,
      poOf,
      (asn, po) => po.supplierId === asn.supplierId,
      (asn, po) =>
        `${asn.asnNumber} (${asn.supplierId}) → ${po.poNumber} owned by ${po.supplierId}`,
    );
    expect(result.resolved).toBe(MOCK_ASNS.length);
    expect(result.wrong).toEqual([]);
  });

  it('AXIS 3 — a shipment does not precede its own order', () => {
    // Level 2 of the stated selection rule, asserted rather than trusted.
    // ASNs with no `eta` (the Draft) assert no delivery date and are excluded
    // BY NAME rather than by a silent filter — see the count below.
    const dated = MOCK_ASNS.filter((a) => a.eta !== '');
    expect(dated).toHaveLength(5);
    expect(MOCK_ASNS.filter((a) => a.eta === '').map((a) => a.asnNumber)).toEqual([
      'ASN-2025-00215',
    ]);
    const result = axis(
      dated,
      poOf,
      (asn, po) => po.orderDate <= asn.eta,
      (asn, po) => `${asn.asnNumber} eta ${asn.eta} precedes ${po.poNumber} ordered ${po.orderDate}`,
    );
    expect(result.resolved).toBe(5);
    expect(result.wrong).toEqual([]);
  });

  it('the selection rule yields the five MOVED references, and they re-derive', () => {
    // The rule, applied in code rather than asserted as five literals — so a
    // fixture edit that breaks it fails here instead of drifting. Ordered:
    //   1. same supplier · 2. PO at or past confirmation · 3. orderDate ≤ eta
    //   · 4. NOT determinately complete.
    //
    // ⚠️ LEVEL 2 EXISTS BECAUSE `SupplierShipments.test.tsx` WENT RED, and it
    // was right to. Without it the rule sent the Draft ASN to `PO-2025-00108`
    // on an outstanding-quantity heuristic — a SENT order, against which the
    // write path cannot create an ASN at all (`SupplierShipments.tsx:533`
    // queries `POStatus.CONFIRMED`), and consuming it also emptied the
    // "awaiting ASN" panel the create affordance lives in. A LEGALITY
    // CONSTRAINT READ OFF THE WRITE PATH BEATS A PLAUSIBILITY HEURISTIC.
    const CAN_PARENT_AN_ASN: readonly POStatus[] = [
      POStatus.CONFIRMED,
      POStatus.PARTIALLY_DELIVERED,
      POStatus.DELIVERED,
      POStatus.CLOSED,
    ];
    //
    // ⚠️ LEVEL 4 IS THREE-VALUED, AND IT HAD TO BE REWRITTEN TO BE. It was
    // first written as `lineItems.some(l => l.confirmedQty < l.quantity)`,
    // which returns FALSE for a PO with no lines — silently converting
    // "undetermined" into "fully received" and eliminating `PO-2025-00131`,
    // the very row R-4 had just authored. `EMPTY-INPUT-REPORTS-CLEAN-01`
    // AGAIN, FOURTH APPEARANCE, THIS TIME INSIDE THE SELECTION RULE OF THE
    // BATCH THAT FILED THE CLASS. A line-less PO is UNDETERMINED on
    // completeness and must survive a filter it cannot answer.
    const determinatelyComplete = (po: (typeof mockPurchaseOrders)[number]) =>
      po.lineItems.length > 0 && po.lineItems.every((l) => l.confirmedQty >= l.quantity);

    // ⚠️ THE RULE'S SCOPE IS A RULING, NOT AN EXCEPTION LIST. It governs the
    // references that had to MOVE. `ASN-2025-00302` did not move: its pointer
    // was never aimed at the wrong object, only at a MISSING one, and R-4
    // authored the object rather than repointing the reference. Applying a
    // "pick the best candidate" rule to it would be doing the thing R-4
    // forbade. It is covered instead by axes 1–3 above, like every other row.
    const MOVED = MOCK_ASNS.filter((a) => a.poReference !== 'PO-2025-00131');
    expect(MOVED).toHaveLength(5);

    for (const asn of MOVED) {
      let candidates = mockPurchaseOrders
        .filter((p) => p.supplierId === asn.supplierId)
        .filter((p) => CAN_PARENT_AN_ASN.includes(p.status));
      if (asn.eta !== '') candidates = candidates.filter((p) => p.orderDate <= asn.eta);
      if (candidates.length > 1) candidates = candidates.filter((p) => !determinatelyComplete(p));
      expect(candidates.map((p) => p.poNumber), asn.asnNumber).toEqual([asn.poReference]);
    }
  });

  it('⚠️ AXIS 4 — the MATERIAL axis is OPEN, and this is its exact residual', () => {
    // ⚠️ AN INVERTED ASSERTION, NOT A WHITELIST. It states the defect that
    // REMAINS, so 5b-ii closing it turns this test RED and forces the pin to
    // be rewritten as a clean set. A `.filter(...).toEqual([])` here would
    // have been a lie; a list of "known exceptions" would have been
    // `ADOPTION-QUEUE-01`, which absorbed members for three batches.
    const result = axis(
      LINES,
      ({ asn }) => poOf(asn),
      ({ line }, po) => po.lineItems.some((l) => l.materialCode === line.materialCode),
      ({ asn, line }, po) =>
        `${asn.asnNumber}/${line.materialCode} not on ${po.poNumber} [${po.lineItems
          .map((l) => l.materialCode)
          .join(', ') || 'no lines'}]`,
    );
    expect(result.total).toBe(7);
    expect(result.resolved).toBe(7);
    // EVERY line. Not most, not some — the axis is wholly open.
    expect(result.wrong).toHaveLength(7);
  });

  it('AXIS 4 is open for ONE reason, and the reason is checkable', () => {
    // The claim in the fixture header, stated as a property: every ASN line
    // that fails axis 4 fails it because its code is master-absent. If some
    // future line failed for a DIFFERENT reason, that is a new defect and this
    // goes red rather than blending into the seven.
    const failing = LINES.filter(({ asn, line }) => {
      const po = poOf(asn);
      return po !== undefined && !po.lineItems.some((l) => l.materialCode === line.materialCode);
    });
    // ⚠️ THE INVERTED PIN 5b-i PROMISED WOULD GO RED, AND IT DID — BUT NOT THE
    // WAY 5b-i EXPECTED, AND THAT IS WORTH MORE THAN IF IT HAD. 5b-i wrote:
    // *"axis 4 is open for ONE reason — every failing line's code is
    // master-absent."* 2B-5b-ii authored all seven, so **not one of them is
    // master-absent any more** and the stated reason is FALSE. The axis is
    // still open at 7 of 7.
    //
    // **AUTHORING A MASTER ROW MAKES A CODE RESOLVABLE. IT DOES NOT PUT THE
    // CODE ON THE PARENT PURCHASE ORDER.** Those are different facts, and this
    // pin conflated them for exactly one batch. The remaining gap is a PO-lane
    // gap: no sup-007 order exists for a fragrance, a 50 ml bottle, an
    // aluminium closure or an active emulsion, and authoring one is a
    // procurement-document act neither 5b-i nor 5b-ii was chartered for.
    expect(failing.map(({ line }) => line.materialCode).sort()).toEqual([
      'AI-HYALU-6615',
      'AI-NIAC-6612',
      'FR-ROUD-4470',
      'PK-ALCP-2450',
      'PK-PETB-8804',
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);
    // The 5b-i reason, RE-ASSERTED IN THE NEGATIVE so the correction is a fact
    // in the file rather than a note in a PR body.
    expect(failing.filter(({ line }) => !(line.materialCode in MATERIAL_MASTER))).toEqual([]);
  });

  it('`PO-2025-00131` is authored WITHOUT a line, and that gap is deliberate', () => {
    // ⚠️ THE ONE PLACE THIS BATCH LEAVES SOMETHING INCOMPLETE ON PURPOSE, so
    // it is pinned rather than left to be noticed. None of the three
    // references that demanded this PO states a material for it. Authoring one
    // would mean choosing between `MAT-40220` — widening the third space into
    // the declared document lane — and a master code, which is the retirement
    // 5b-ii owns.
    const po = mockPurchaseOrders.find((p) => p.poNumber === 'PO-2025-00131');
    expect(po).toBeDefined();
    expect(po!.supplierId).toBe('sup-005');
    expect(po!.lineItems).toEqual([]);
    // `totalValue: 0` is Σ(quantity × unitPrice) over an empty line set, which
    // is true OF THIS ROW.
    expect(po!.totalValue).toBe(
      po!.lineItems.reduce((n: number, l) => n + l.quantity * l.unitPrice, 0),
    );
    // ⚠️ AND THE CLAIM THIS ORIGINALLY MADE WAS FALSE. It asserted that
    // `totalValue === Σ(lines)` holds across the fixture — verified on three
    // rows and generalised to twenty. It does not: SEVEN of 21 disagree, by
    // between Rp 100 and Rp 360 000 000. `DERIVED-OVER-A-CHOSEN-SCOPE-01`, in
    // this batch, in the pin written to justify a value. The measurement is
    // kept as an EXACT SET rather than deleted — it is a pre-existing header
    // /line disagreement in the PO lane, not 2B-5b-i's to repair, and an exact
    // set is what stops it drifting before someone rules on it.
    const headerVsLines = mockPurchaseOrders
      .filter((p) => p.totalValue !== p.lineItems.reduce((n, l) => n + l.quantity * l.unitPrice, 0))
      .map((p) => p.poNumber);
    expect(headerVsLines).toEqual([
      'PO-2025-00101',
      'PO-2025-00103',
      'PO-2025-00105',
      'PO-2025-00108',
      'PO-2025-00112',
      'PO-2025-00114',
      'PO-2025-00116',
    ]);
    expect(mockPurchaseOrders).toHaveLength(21);
    // ⚠️ "NO LINES" IS NOT "FULLY RECEIVED" — pinned DIRECTLY, not only through
    // the selection rule. Level 2 of that rule now decides `ASN-2025-00215`
    // before level 4 is ever reached, so the three-valued predicate stopped
    // being load-bearing there the moment the rule got better. A correctness
    // fix that nothing exercises is a correctness fix that will be undone, so
    // the semantics get their own assertion: an empty line set answers NEITHER
    // "complete" NOR "outstanding".
    expect(po!.lineItems.every((l) => l.confirmedQty >= l.quantity)).toBe(true); // vacuous truth
    expect(po!.lineItems.some((l) => l.confirmedQty < l.quantity)).toBe(false); // vacuous falsity
    expect(po!.lineItems.length > 0 && po!.lineItems.every((l) => l.confirmedQty >= l.quantity)).toBe(
      false,
    ); // ← the only one of the three that is not a lie about this row
    // No `MAT-*` code entered the document lane by way of this authoring.
    const docLaneCodes = mockPurchaseOrders.flatMap((p) => p.lineItems.map((l) => l.materialCode));
    expect(docLaneCodes.filter((c) => c.startsWith('MAT-'))).toEqual([]);
    expect(docLaneCodes.length).toBeGreaterThan(20);
  });

  it('⚠️ doc-201 — the BPOM claim is asserted AGAINST evidence, not in its absence', () => {
    // The strongest finding in the 2B-5b investigation, and it is not a prefix
    // argument. `doc-201` is a BPOM Notification linked to `PO-2025-00131`;
    // that PO's ASN carries `MAT-40220`; `inferBpom('MAT-40220')` is false.
    // The tree ALREADY STATES that a BPOM registration governs this supply.
    const asn = MOCK_ASNS.find((a) => a.poReference === 'PO-2025-00131');
    // ⚠️ `MAT-40220` WAS AUTHORED AS `RM-EMUL-9440` AT 2B-5b-ii, AND THE FINDING
    // GOT STRONGER RATHER THAN CLOSING. At 5b-i the tree merely IMPLIED the
    // wizard was wrong (a BPOM document governed a supply the wizard waved
    // through). The master now SAYS SO: `bpomApplicable: 'APPLICABLE'`, the only
    // row in 42 whose value rests on a document rather than a class default —
    // and `inferBpom` still reads the prefix and returns false.
    expect(asn?.lineItems.map((l) => l.materialCode)).toEqual(['RM-EMUL-9440']);
    expect(MATERIAL_MASTER['RM-EMUL-9440'].bpomApplicable).toBe('APPLICABLE');
    // Restated, not imported — the same deliberate copy as the census pin, so
    // the day the predicate and this pin stop agreeing is detectable.
    const wouldRequireBpom = (code: string) => code.startsWith('AI-') || code.startsWith('FR-');
    expect(wouldRequireBpom('RM-EMUL-9440')).toBe(false);
    // `BPOM-OFF-BY-SPACE-01` was amended in `docs/findings.md` to say so, and
    // ⚠️ CLOSED AT 2B-4b — at seven, as a CONTRADICTION rather than a silence.
    // The document won: `doc-201` decides this line, the wizard asks the master,
    // and the prefix restated above is now a historical record rather than a
    // description of anything the product runs.
  });
});
