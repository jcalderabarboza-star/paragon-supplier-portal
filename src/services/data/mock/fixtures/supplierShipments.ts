// ────────────────────────────────────────────────────────────────────────────
// Supplier shipments / ASN fixtures.
//
// Relocated from src/pages-v2/SupplierShipments.tsx in Phase 1B Batch 2.
// Every row carries supplierId so applySupplierScope can enforce identity
// boundaries structurally — a supplier query CANNOT see another supplier's
// ASNs.
//
// ═══ CP-2 · 2B-5b-i — THE REFERENTIAL LEG, SECOND LANE ══════════════════════
//
// ── THE GOVERNING LINE ─────────────────────────────────────────────────────
//   A REFERENCE THAT RESOLVES TO THE WRONG OBJECT IS NOT WEAKER EVIDENCE THAN
//   NO REFERENCE. IT IS EVIDENCE POINTING THE WRONG WAY, AND A RETIREMENT RULE
//   THAT READS IT WILL RETIRE ONTO THE WRONG CODE.
//
//   2B-5b was dispatched to retire the seven `MAT-*` ASN codes onto master
//   codes under R-1's declared-ownership rule. That rule needs a MATCHING
//   master row, and the strongest available evidence of what an ASN line IS
//   would be the PO line it ships against. Every one of those was wrong:
//   ONE OF SIX ASNs NAMED A PO ITS OWN SUPPLIER OWNED; ZERO NAMED A PO
//   CARRYING THE MATERIAL THEY SHIP. The batch stopped and split.
//
// ── WHAT WAS WRONG BEFORE THIS BATCH (six references, five defective) ──────
//   ASN-2025-00211 · sup-007 → PO-2025-00112, owned by sup-003 (Givaudan)
//   ASN-2025-00198 · sup-007 → PO-2025-00107, owned by sup-007 ✅ (the one)
//   ASN-2025-00201 · sup-007 → PO-2025-00109, owned by sup-008 (Indo Karton)
//   ASN-2025-00215 · sup-007 → PO-2025-00115, owned by sup-009 (Zhejiang NHU)
//   ASN-2025-00301 · sup-002 → PO-2025-00120, owned by sup-011 (Anhui)
//   ASN-2025-00302 · sup-005 → PO-2025-00131, WHICH DID NOT EXIST
//
//   ⚠️ FOUR OF THESE WERE CROSS-TENANT, AND THAT IS NOT COSMETIC. `poReference`
//   renders to the addressee (`SupplierShipments.tsx:331`) and flows into the
//   GR wizard's draft as `poNumber` (`GRInspectionWizard.tsx:181`), so a
//   Givaudan PO number was being shown to PT Berlina. Identity scoping is
//   enforced on `supplierId` (`applySupplierScope`), which means the ASN was
//   correctly scoped TO the right tenant while carrying ANOTHER tenant's
//   document number inside it — the scope check cannot see a foreign
//   identifier in a string field.
//
// ── THE SELECTION RULE (stated, so the result can be re-derived) ───────────
//   `supplierId` is authoritative — the same ruling 2B-5a made for the chase
//   lane. Each reference moves to a PO selected by an ORDERED rule, applied
//   uniformly, first level that yields a unique answer:
//     1. the PO's `supplierId` equals the ASN's  (the enforced axis);
//     2. the PO IS AT OR PAST CONFIRMATION — the write path offers ASN creation
//        only on CONFIRMED POs (`SupplierShipments.tsx:533`, `:633`), so an ASN
//        against an unconfirmed order is a state the product cannot produce;
//     3. the PO's `orderDate` is on or before the ASN's `eta`  (a shipment
//        cannot precede its own order);
//     4. among survivors, the PO not DETERMINATELY COMPLETE — some line with
//        `confirmedQty < quantity`  (an ASN in flight implies undelivered qty).
//   Every one of the four moves below is unique at level 2, 3 or 4. The rule
//   and its application are pinned in `asnRefIntegrity.test.ts`.
//
//   ⚠️ LEVEL 2 IS HERE BECAUSE A TEST FOUND IT, AND THE TEST WAS RIGHT. The
//   rule first ran without it and sent the Draft `ASN-2025-00215` to
//   `PO-2025-00108` on an outstanding-quantity heuristic. `SupplierShipments`
//   went red: `PO-2025-00108` is SENT, not CONFIRMED, and consuming it as an
//   ASN parent also emptied the "awaiting ASN" panel the create affordance
//   lives in. A LEGALITY CONSTRAINT READ OFF THE WRITE PATH BEATS A
//   PLAUSIBILITY HEURISTIC, and the failing test was evidence rather than an
//   obstacle — it is the only reason this rule now derives the answer instead
//   of guessing it.
//
//   ⚠️ AND THE RULE IS AUTHORED, NOT DERIVED — LABELLED, NOT SMOOTHED. 2B-5a
//   could DERIVE the chase lane's repair because the agreement fixture already
//   contained the answer. The PO lane does not: it holds no sup-007 order for
//   a fragrance, a 50 ml bottle, an aluminium closure or an active emulsion.
//   So the rule narrows the candidate set to one; it does not read the answer
//   off a record. The AXIS IT REPAIRS (tenant) is determined by the tree. THE
//   AXIS IT DOES NOT REPAIR (material) IS PINNED OPEN, not quietly satisfied.
//
// ── WHAT THIS BATCH DELIBERATELY DOES NOT DO ──────────────────────────────
//   No `MAT-*` code is retired and no master row is authored (operator rulings
//   R-1/R-2/R-3). Consequently NO ASN line's material can be made to match its
//   parent PO line: the matching PO line would have to carry either a
//   third-space code — widening a space R-3 declared dead INTO the declared
//   document lane — or a master code, which is the retirement 5b-ii owns.
//   The residual is an EXACT SET in `asnRefIntegrity.test.ts`, not a silence.
// ────────────────────────────────────────────────────────────────────────────

import type { ASN } from '../../types';

export const MOCK_ASNS: ASN[] = [
  {
    asnNumber: 'ASN-2025-00211',
    supplierId: 'sup-007',
    // 2B-5b-i — was `PO-2025-00112` (sup-003, Givaudan). Unique at level 2:
    // sup-007 owns PO-2025-00107 (ordered 2025-03-15) and PO-2025-00108
    // (ordered 2025-04-03); only the former precedes this eta of 2025-04-02.
    poReference: 'PO-2025-00107',
    status: 'In Transit',
    carrier: 'Sample Express Courier (illustrative)',
    trackingNumber: 'SMPL-EXP-882941-X',
    eta: '2025-04-02',
    details: {
      originCity: 'Surabaya, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 312,
      grossWeightKg: 4280,
      temperatureRequirement: 'Ambient (15–25°C)',
    },
    lineItems: [
      { materialCode: 'FR-ROUD-4470', description: 'Fragrance Concentrate — Rose Oud', orderedQty: 1200, shippedQty: 1200, lotNumber: 'LOT-A4481' },
      { materialCode: 'PK-PETB-8804', description: 'PET Bottle 50ml Clear', orderedQty: 15000, shippedQty: 14820, lotNumber: 'LOT-A4482' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00198',
    supplierId: 'sup-007',
    // 2B-5b-i — UNCHANGED. The one reference of six that already named a PO its
    // own addressee owns. Its MATERIAL still disagrees (this PO orders
    // `PK-PETB-8801`, a PET bottle; the line below ships an aluminium closure)
    // — see the header: that axis is 5b-ii's.
    poReference: 'PO-2025-00107',
    status: 'Delivered',
    carrier: 'Sample Postal Logistics (illustrative)',
    trackingNumber: 'SMPL-PST-7723-BC-4401',
    eta: '2025-03-22',
    details: {
      originCity: 'Bandung, ID',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 188,
      grossWeightKg: 2610,
      temperatureRequirement: 'Ambient (15–25°C)',
    },
    lineItems: [
      { materialCode: 'PK-ALCP-2450', description: 'Aluminium Closure 24/410', orderedQty: 48000, shippedQty: 48000, lotNumber: 'LOT-C9911' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00201',
    supplierId: 'sup-007',
    // 2B-5b-i — was `PO-2025-00109` (sup-008, PT Indo Karton). Unique at
    // level 2: PO-2025-00108 is ordered 2025-04-03, after this eta of
    // 2025-03-27.
    poReference: 'PO-2025-00107',
    status: 'Discrepancy',
    carrier: 'Sample Parcel Courier (illustrative)',
    trackingNumber: 'SMPL-PCL-119843-JKT',
    eta: '2025-03-27',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cibitung (WH-01)',
      totalCartons: 94,
      grossWeightKg: 1340,
      temperatureRequirement: 'Cool chain (2–8°C)',
    },
    lineItems: [
      { materialCode: 'AI-NIAC-6612', description: 'Active Emulsion — Niacinamide 5%', orderedQty: 800, shippedQty: 720, lotNumber: 'LOT-E2203' },
      { materialCode: 'AI-HYALU-6615', description: 'Active Emulsion — Hyaluronic 2%', orderedQty: 600, shippedQty: 540, lotNumber: 'LOT-E2204' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00215',
    supplierId: 'sup-007',
    // 2B-5b-i — was `PO-2025-00115` (sup-009, Zhejiang NHU). A DRAFT with an
    // empty `eta`, so level 3 constrains nothing; LEVEL 2 decides alone:
    // PO-2025-00108 is SENT, and an ASN cannot exist against an unconfirmed
    // order, leaving PO-2025-00107 (CONFIRMED) as sup-007's only legal parent.
    // ⚠️ This row carries NO line items, so it is the one ASN whose every
    // referential axis — including material — now passes.
    poReference: 'PO-2025-00107',
    status: 'Draft',
    carrier: '—',
    trackingNumber: '—',
    eta: '',
    details: {
      originCity: '—',
      destinationWarehouse: '—',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: '—',
    },
    lineItems: [],
  },
  {
    asnNumber: 'ASN-2025-00301',
    supplierId: 'sup-002',
    // 2B-5b-i — was `PO-2025-00120` (sup-011, Anhui Salicylics). Both sup-002
    // orders precede this eta, so level 3 decides: PO-2025-00102 is confirmed
    // in full (8 000 of 8 000), PO-2025-00116 is PARTIALLY_DELIVERED with
    // 10 000 of 15 000 and 5 000 of 10 000 — outstanding quantity, which an
    // In-Transit ASN implies. That it is ALSO the specialty-fats order is a
    // consequence of the rule, not the reason for it.
    poReference: 'PO-2025-00116',
    status: 'In Transit',
    carrier: 'Sample Interisland Line (illustrative)',
    trackingNumber: 'SMPL-ISL-4471-SBY',
    eta: '2025-05-06',
    details: {
      originCity: 'Medan, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 420,
      grossWeightKg: 9800,
      temperatureRequirement: 'Ambient (15–25°C)',
    },
    lineItems: [
      { materialCode: 'RM-PSTN-7150', description: 'RBD Palm Stearin — Specialty Fat', orderedQty: 8000, shippedQty: 8000, lotNumber: 'LOT-M7781' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00302',
    supplierId: 'sup-005',
    // 2B-5b-i — REFERENCE UNCHANGED; THE OBJECT WAS AUTHORED (operator ruling
    // R-4). `PO-2025-00131` did not exist in `mockPurchaseOrders.ts` while
    // THREE independent fixtures acted as though it did — this ASN, invoice
    // `inv-basf-1180`, and supplier document `doc-201`. Repointing three
    // references to hide a missing object is worse than the gap, so the object
    // now exists. See `mockPurchaseOrders.ts` (`po-131`) for what the three
    // references do and do not determine.
    poReference: 'PO-2025-00131',
    status: 'Delivered',
    carrier: 'Sample Freight Forwarder (illustrative)',
    trackingNumber: 'SMPL-FFW-99120-JKT',
    eta: '2025-04-18',
    details: {
      originCity: 'Ludwigshafen, DE',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 96,
      grossWeightKg: 2160,
      temperatureRequirement: 'Ambient (15–25°C)',
    },
    lineItems: [
      { materialCode: 'RM-EMUL-9440', description: 'Emulgade SE-PF Emulsifier', orderedQty: 2400, shippedQty: 2400, lotNumber: 'LOT-B5540' },
    ],
  },
];
