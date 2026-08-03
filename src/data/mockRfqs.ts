import type { FxPin } from '../lib/fxPin';

export type RFQStatus =
  | 'Draft'
  | 'Open'
  | 'Closed'
  | 'Awarded'
  | 'Cancelled';

export type RFQCategory =
  | 'Fragrance'
  | 'Active Ingredients'
  | 'Packaging'
  | 'Emulsifiers'
  | 'Botanical'
  | 'Other';

export interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  materialCategory: RFQCategory;
  materialIds: string[];
  buyerId: string;
  status: RFQStatus;
  createdAt: string;
  responseDeadline: string;
  awardDeadline: string;
  invitedSupplierIds: string[];
  respondedSupplierIds: string[];
  totalQty: number;
  uom: 'KG' | 'PCS' | 'L' | 'MT';
  // The buyer's estimated budget. OPTIONAL and additive (CP-0 2e-b-4a): absent =
  // the buyer specified no budget, which the wizard's own review calls "not
  // specified". Absent is NOT Rp 0 — the retired `Number(budget) || 0` minted a
  // stated zero out of an unstated field, and a budget of nothing is a different
  // claim from no budget at all. Every seeded fixture states one, so nothing is
  // backfilled; only a wizard-raised RFQ can be honestly absent.
  estimatedValue?: number;
  currency: 'IDR';
  incoterms: string;
  paymentTerms: string;
  awardedSupplierId?: string;
  awardedQuotationId?: string;
  /**
   * The recorded FX bases this RFQ's multi-currency comparison is ranked against
   * (2e-c-3). An APPEND-ONLY LEDGER, not a map: superseding a rate appends a new
   * pin and the prior one stays, which is how D-1's "prior basis preserved,
   * never an in-place edit" is made structural rather than conventional. The pin
   * in force is DERIVED (`effectivePin`), never stored.
   *
   * OPTIONAL and additive: absent = no pin has been recorded, which is the
   * honest state of every RFQ until a buyer records one — and the state that
   * makes a mixed-currency comparison refuse `FX_UNPINNED` rather than rank on a
   * rate nobody chose. A single-currency RFQ never needs one.
   */
  fxPins?: readonly FxPin[];
}

export const mockRfqs: RFQ[] = [
  {
    id: 'rfq-001',
    rfqNumber: 'RFQ-2026-001',
    title: 'Q2 2026 Active Ingredient Sourcing — Niacinamide USP',
    materialCategory: 'Active Ingredients',
    materialIds: ['AI-NIAC-6601'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-04-28',
    responseDeadline: '2026-05-20',
    awardDeadline: '2026-05-27',
    invitedSupplierIds: ['sup-005', 'sup-006', 'sup-009', 'sup-011'],
    respondedSupplierIds: ['sup-005', 'sup-009', 'sup-011'],
    totalQty: 5000,
    uom: 'KG',
    estimatedValue: 1_100_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
  },
  {
    id: 'rfq-002',
    rfqNumber: 'RFQ-2026-002',
    title: 'PET Bottle 100ml Airless Pump — Wardah Q3 launch',
    materialCategory: 'Packaging',
    // CP-2 · B2a — this RFQ used to name `PK-PETB-8810`, which the material
    // master owns and defines as the 250ml bottle. Every other trace of this
    // RFQ's material says 100ml Airless Pump (the title, the sup-007 storefront
    // line, PR-2026-00342, the PO-2025-00107 remittance note), so the CODE was
    // the outlier, not the meaning. The master keeps 8810; this meaning takes a
    // new non-master code. It is DISTINCT from `PK-PETB-8802` (the Emina 100ml
    // Clear) — same volume, different closure and brand, different item.
    materialIds: ['PK-PETB-8803'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-02',
    responseDeadline: '2026-05-22',
    awardDeadline: '2026-05-29',
    invitedSupplierIds: ['sup-007', 'sup-008', 'sup-012'],
    respondedSupplierIds: ['sup-007', 'sup-008'],
    totalQty: 200_000,
    uom: 'PCS',
    estimatedValue: 260_000_000,
    currency: 'IDR',
    incoterms: 'FCA Tangerang',
    paymentTerms: 'Net 30',
  },
  {
    id: 'rfq-003',
    rfqNumber: 'RFQ-2026-003',
    title: 'Halal Glycerin 99.5% Kosher — Annual contract',
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-EMUL-3310', 'RM-EMUL-3320'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-05',
    responseDeadline: '2026-05-19',
    awardDeadline: '2026-05-26',
    invitedSupplierIds: ['sup-001', 'sup-002', 'sup-010'],
    respondedSupplierIds: ['sup-001', 'sup-002', 'sup-010'],
    totalQty: 12_000,
    uom: 'KG',
    estimatedValue: 540_000_000,
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 30',
  },
  {
    id: 'rfq-004',
    rfqNumber: 'RFQ-2026-004',
    title: 'Givaudan Floral Accord — Wardah Hijab Refresh',
    materialCategory: 'Fragrance',
    materialIds: ['FR-WARD-4430', 'FR-WARD-4440'],
    buyerId: 'buyer-001',
    status: 'Closed',
    createdAt: '2026-03-12',
    responseDeadline: '2026-03-26',
    awardDeadline: '2026-04-02',
    invitedSupplierIds: ['sup-003', 'sup-004'],
    respondedSupplierIds: ['sup-003', 'sup-004'],
    totalQty: 400,
    uom: 'KG',
    estimatedValue: 880_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
  },
  {
    id: 'rfq-005',
    rfqNumber: 'RFQ-2026-005',
    title: 'Folding Carton 150gsm — Emina Bright Stuff',
    materialCategory: 'Packaging',
    materialIds: ['PK-CART-9901', 'PK-CART-9910'],
    buyerId: 'buyer-001',
    status: 'Closed',
    createdAt: '2026-03-08',
    responseDeadline: '2026-03-22',
    awardDeadline: '2026-03-29',
    invitedSupplierIds: ['sup-007', 'sup-008'],
    respondedSupplierIds: ['sup-007', 'sup-008'],
    totalQty: 300_000,
    uom: 'PCS',
    estimatedValue: 78_000_000,
    currency: 'IDR',
    incoterms: 'FCA Surabaya',
    paymentTerms: 'Net 30',
  },
  {
    id: 'rfq-006',
    rfqNumber: 'RFQ-2026-006',
    title: 'Centella Asiatica Extract 10:1 — Skin care line',
    materialCategory: 'Botanical',
    materialIds: ['AI-CENT-6900'],
    buyerId: 'buyer-001',
    status: 'Awarded',
    createdAt: '2026-02-18',
    responseDeadline: '2026-03-04',
    awardDeadline: '2026-03-11',
    invitedSupplierIds: ['sup-001', 'sup-010', 'sup-009'],
    respondedSupplierIds: ['sup-001', 'sup-010', 'sup-009'],
    totalQty: 300,
    uom: 'KG',
    estimatedValue: 67_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 30',
    awardedSupplierId: 'sup-001',
    awardedQuotationId: 'qt-006a',
  },
  {
    id: 'rfq-007',
    rfqNumber: 'RFQ-2026-007',
    title: 'Sodium Hyaluronate HMW — Premium skin care',
    materialCategory: 'Active Ingredients',
    materialIds: ['AI-HYALU-6610'],
    buyerId: 'buyer-001',
    status: 'Awarded',
    createdAt: '2026-02-02',
    responseDeadline: '2026-02-16',
    awardDeadline: '2026-02-23',
    invitedSupplierIds: ['sup-005', 'sup-006', 'sup-009'],
    respondedSupplierIds: ['sup-005', 'sup-006', 'sup-009'],
    totalQty: 200,
    uom: 'KG',
    estimatedValue: 600_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
    awardedSupplierId: 'sup-005',
    awardedQuotationId: 'qt-007a',
  },
  {
    id: 'rfq-008',
    rfqNumber: 'RFQ-2026-008',
    title: 'Shipper Box — Emina 12-pack — Draft',
    materialCategory: 'Packaging',
    materialIds: ['PK-CART-9910'],
    buyerId: 'buyer-001',
    status: 'Draft',
    createdAt: '2026-05-15',
    responseDeadline: '2026-05-30',
    awardDeadline: '2026-06-06',
    invitedSupplierIds: [],
    respondedSupplierIds: [],
    totalQty: 30_000,
    uom: 'PCS',
    estimatedValue: 75_000_000,
    currency: 'IDR',
    incoterms: 'FCA Surabaya',
    paymentTerms: 'Net 30',
  },
  {
    // Imported raw material — foreign suppliers price in USD. Exercises the CI-2
    // engine-native, FX-free USD spread branch (propylene glycol, international basis).
    //
    // ⚠ 2e-c-6 — LEFT UNPINNED ON PURPOSE. This RFQ is the arc's TEST BENCH: the
    // FX specs mutate its quotes to mint mixed sets and dispatch pins against it,
    // so they are written against "an RFQ with no recorded basis". Seeding a
    // ledger here was tried and re-premised three of those proofs. The cold-boot
    // pin DISPLAY lives on rfq-013 instead, which is additive and disturbs
    // nothing. Its homogeneous all-USD set also means a pin here would rank
    // nothing anyway (quoteScore.ts:253 exempts a single-currency set).
    id: 'rfq-009',
    rfqNumber: 'RFQ-2026-009',
    title: 'Propylene Glycol USP — imported, USD-quoted',
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-HUMEC-3405'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-06',
    responseDeadline: '2026-05-21',
    awardDeadline: '2026-05-28',
    invitedSupplierIds: ['sup-006', 'sup-005'],
    respondedSupplierIds: ['sup-006', 'sup-005'],
    totalQty: 8_000,
    uom: 'KG',
    estimatedValue: 360_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 30',
  },
  {
    // CP-0 · W1 · 2e-a — the ONE Open RFQ the seeded supplier persona (sup-007)
    // is invited to and has NOT yet quoted. Every other sup-007 invitation
    // (rfq-002, rfq-005) already carries a quotation, so the open list pruned
    // itself empty and the quote side-panel could not be opened by hand at all —
    // the bid-price gate was unreachable and therefore unsmokeable. Purely
    // additive: rfq-002 stays pruned, so the honest-read proof in
    // SupplierRFQs.test.tsx is untouched.
    id: 'rfq-010',
    rfqNumber: 'RFQ-2026-010',
    title: 'PET Bottle 250ml Flip-Top — Emina refill line',
    materialCategory: 'Packaging',
    materialIds: ['PK-PETB-8825'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-04-20',
    responseDeadline: '2026-05-15',
    awardDeadline: '2026-05-25',
    invitedSupplierIds: ['sup-007', 'sup-008'],
    respondedSupplierIds: [],
    totalQty: 120_000,
    uom: 'PCS',
    estimatedValue: 540_000_000,
    currency: 'IDR',
    incoterms: 'FCA Tangerang',
    paymentTerms: 'Net 30',
  },
  {
    // ── CP-0 · W1 · 2e-b-1 — THE NEUTRAL AWARD FIXTURE (FIND-05) ─────────────
    // Built so the award recommendation is decided by the LEAD-TIME AXIS ALONE.
    // Its one seeded quote (qt-011a, sup-005) carries exactly the values a fresh
    // submit mints — unitPrice 15,000, and the SIMULATED 50/50 compliance and
    // reliability baseline `quotationTarget.create` seeds — so a quotation
    // submitted against it by sup-007 is identical on every other axis. Whoever
    // the engine recommends, it recommends on lead time and nothing else.
    //
    // That is what makes the defect visible: a lead time the retired path
    // fabricated (an unreadable token → `|| 0`, or "3.5" truncated to 3) beat a
    // real 4-day promise and took the recommendation. It has to be an RFQ the
    // smoke persona can actually quote on, because the artifact was created by
    // the INPUT path — no seeded quote ever went through it.
    // Purely additive, and ordered AFTER rfq-010 so the 2e-a smoke keeps its
    // first-card position.
    id: 'rfq-011',
    rfqNumber: 'RFQ-2026-011',
    title: 'Aluminium Cap 24/410 — Wardah serum line',
    materialCategory: 'Packaging',
    materialIds: ['PK-ALCP-2441'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-04-22',
    responseDeadline: '2026-05-20',
    awardDeadline: '2026-05-30',
    invitedSupplierIds: ['sup-005', 'sup-007'],
    respondedSupplierIds: ['sup-005'],
    totalQty: 80_000,
    uom: 'PCS',
    estimatedValue: 1_200_000_000,
    currency: 'IDR',
    incoterms: 'FCA Tangerang',
    paymentTerms: 'Net 30',
  },
  {
    // ── CP-0 · 2e-c-6 — THE MIXED-CURRENCY NEUTRAL FIXTURE ───────────────────
    // The whole 2e-c arc's honesty claim, made witnessable by hand. Until this
    // fixture existed, a mixed-currency comparison was reachable only through an
    // ACCIDENTAL pairing (sup-007 submitting against rfq-011's lone IDR quote) —
    // and a refusal that can only be reached by accident is not a delivered
    // refusal. That is QA-PERSONA-01, and it is why 2e-a had to seed rfq-010.
    //
    // NEUTRAL in the FIND-05 sense: its two quotes are identical on lead time,
    // compliance, reliability, payment terms, validity and submission date, so
    // the ONLY thing that can decide the recommendation is how the engine handles
    // the money — which is exactly the behaviour under test.
    //
    // WHY AN IMPORTED MATERIAL. Propylene glycol is the codebase's one
    // INTERNATIONAL-basis modelable material, so a domestic distributor bidding
    // rupiah beside a foreign mill bidding dollars is the ordinary commercial
    // shape of this problem rather than a contrivance. It also puts both
    // should-cost branches in ONE table: the IDR row renders FX-converted, the
    // USD row engine-native (2e-c-5).
    //
    // DELIBERATELY LEFT UNPINNED — no `fxPins`. On a cold boot this RFQ refuses
    // FX_UNPINNED, by name, naming USD. The pinned half of the walk is reached by
    // RECORDING a rate here, not by seeding one: `isStalePin` measures from the
    // rate's vintage against the clock AT READ, so any literal `asOf` written
    // here would be stale `FX_PIN_MAX_AGE_DAYS` (7) days later and would silently
    // turn a scripted "the comparison now ranks" into "FX_STALE". A fixture whose
    // meaning decays is the same unreachability defect wearing a fresher date.
    id: 'rfq-012',
    rfqNumber: 'RFQ-2026-012',
    title: 'Propylene Glycol USP — dual-currency bid comparison',
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-HUMEC-3405'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-08',
    responseDeadline: '2026-05-25',
    awardDeadline: '2026-06-01',
    invitedSupplierIds: ['sup-002', 'sup-006'],
    respondedSupplierIds: ['sup-002', 'sup-006'],
    totalQty: 6_000,
    uom: 'KG',
    estimatedValue: 165_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 30',
  },
  {
    // ── CP-0 · 2e-c-6 — THE PINNED TWIN ──────────────────────────────────────
    // rfq-012 with a recorded FX ledger and NOTHING else changed: same material,
    // same two suppliers, same two bids, same every axis. The pin is the only
    // variable, exactly as the currency is the only variable between rfq-012's
    // two quotes — so anything that differs between these two RFQs on screen is
    // caused by the recorded basis and by nothing else.
    //
    // WHAT IT MAKES REACHABLE ON A COLD BOOT:
    //   · the pin DISPLAY — the rate in force, its vintage, its source;
    //   · the D-1 FREEZE, visible — "1 earlier rate kept", proving a superseded
    //     rate is preserved rather than overwritten, without a buyer having to
    //     perform two acts first;
    //   · FX_STALE — the arc's SECOND named refusal, which until now existed only
    //     in specs and in a rate a buyer had to deliberately back-date.
    //
    // WHY THE VINTAGES ARE OLD, AND WHY THAT IS THE HONEST CHOICE. `isStalePin`
    // measures from the rate's own `asOf` against the clock AT READ, with
    // `FX_PIN_MAX_AGE_DAYS` = 7. A literal vintage seeded "fresh" is fresh for one
    // week and stale ever after — so a fixture built to demonstrate a RANKED
    // comparison would quietly start demonstrating a refusal instead, and the
    // smoke script written against it would be wrong without anyone touching it.
    // Staleness is the only pin state a literal date can hold FOREVER. So this
    // fixture owns the refusal, and the ranked outcome is reached by a buyer
    // recording a current rate — which is a real act, dated by the buyer's own
    // clock, and therefore never decays. See docs/CP0_2e-c_FX_smoke.md.
    id: 'rfq-013',
    rfqNumber: 'RFQ-2026-013',
    title: 'Propylene Glycol USP — dual-currency, rate on record',
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-HUMEC-3405'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-08',
    responseDeadline: '2026-05-25',
    awardDeadline: '2026-06-01',
    invitedSupplierIds: ['sup-002', 'sup-006'],
    respondedSupplierIds: ['sup-002', 'sup-006'],
    totalQty: 6_000,
    uom: 'KG',
    estimatedValue: 165_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 30',
    fxPins: [
      // Oldest first. The ledger is APPEND-ONLY, so the order it is written in is
      // the order the rates were recorded — but "which one is in force" is
      // DERIVED (`effectivePin` by `pinnedAt`), never read off the position.
      {
        quote: 'USD',
        base: 'IDR',
        rate: 17_180,
        asOf: '2026-05-09',
        pinnedAt: '2026-05-09T04:12:00.000Z',
        source: 'MANUAL',
        liveness: 'SIMULATED',
      },
      {
        // The rate in force — a week newer, and a superseding act rather than an
        // edit of the one above, which is why the one above is still here.
        quote: 'USD',
        base: 'IDR',
        rate: 17_310,
        asOf: '2026-05-16',
        pinnedAt: '2026-05-16T02:40:00.000Z',
        source: 'MANUAL',
        liveness: 'SIMULATED',
      },
    ],
  },
];
