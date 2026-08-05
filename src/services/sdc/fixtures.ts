// ─────────────────────────────────────────────────────────────────────────────
// SDC-0 — SIMULATED fixtures for the Supplier Data Collaboration model.
//
// ⚠️ HONESTY MARKER — THIS IS SIMULATED DATA, NOT PARAGON DATA. Every material,
// supplier, quantity, publication, and shipment below is invented on the C8 grain
// to exercise the SDC-0 schema and its integrity suite. It is NOT Paragon's real
// material master, plan, or supplier submissions. In the model everything renders
// SIMULATED (Provenance.liveness = 'SIMULATED'); FLAG-2 holds — a SIMULATED
// publication is NEVER supplier-visible. Reality is swapped in later (SDC-1 grows
// depth; real feeds land on the F-timeline); the SHAPE holds, the specifics get
// replaced.
//
// Thin but P2-SHAPED (SDC-0 ruling §4): ≥1 material×period fanned to multiple
// suppliers (invariant #4), one line of each commitmentClass, a distributor with
// a principal relationship, a to-paragon + a principal-to-distributor shipment,
// and a CI-tail material (SDC treats it as any other material).
//
// Suppliers reuse the platform's multi-tenant ids (sup-002 / sup-005 / sup-007).
// Roles-not-names, identity-clean: approvals carry a role token ('planner').
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ForecastPublication,
  IncomingShipment,
  InventoryDeclaration,
  MaterialMaster,
  Provenance,
  RequirementResponse,
  SubmissionSession,
  SupplierMaterialRelationship,
} from './types';

// ─── Provenance constants (SIMULATED declared on every fixture) ───────────────

/** SOMO-published forecast: SIMULATED liveness × PLANNED plan-state. */
const PROV_SOMO_SEED: Provenance = Object.freeze({
  source: 'SOMO',
  liveness: 'SIMULATED',
  planState: 'PLANNED',
});

/** Supplier-committed fact: SIMULATED in seed (LIVE × committed once real). */
const PROV_SUPPLIER_SEED: Provenance = Object.freeze({
  source: 'SUPPLIER',
  liveness: 'SIMULATED',
  planState: 'committed',
});

/** A still-Draft supplier record: not yet committed. */
const PROV_SUPPLIER_DRAFT: Provenance = Object.freeze({
  source: 'SUPPLIER',
  liveness: 'SIMULATED',
  planState: 'PLANNED',
});

// ─── Material master (ruling (b)-minimal; RM/PM taxonomy ROH/VERP + MG-xx) ─────
//
// ── CP-2 · 2B-2 — THE 25 ADOPTIONS (the capability boundary) ─────────────────
//   Five entries below predate this batch (the SDC-0 seed). Twenty-five were
//   ADOPTED at 2B-2 from the declared document lane (`src/data/mock*.ts`).
//
//   ADOPTION RATIFIES A MEANING THE LANE ALREADY STATES. It does not author one.
//   Every label below is the lane's own `description` / `materialDescription`
//   string, and every `canonicalUom` is the unit the lane's own qty rows already
//   carried — MEASURED, not chosen: each of the 25 shows exactly ONE unit across
//   every module that names it, zero conflicts. `materialMasterAdoption.test.ts`
//   re-derives both from the tree on every run, so a label edited in one lane
//   and not the master goes red rather than drifting.
//
//   THE FIVE CODES THAT ARE **NOT** HERE, and why (they are 2B-3, not an
//   oversight): `AI-CENT-6900` · `PK-ALCP-2441` · `PK-PETB-8803` ·
//   `PK-PETB-8825` · `RM-HUMEC-3405`. They are reached only through an RFQ's
//   `materialIds: string[]`, which carries NO meaning at all. There is nothing
//   to ratify, and the parent RFQ's TITLE is a sentence about a sourcing event,
//   not a meaning on a code. 2B-3 AUTHORS a meaning for them; inventing one here
//   to complete a set is precisely the act this arc refuses.
//
//   THE NINE `MAT-*` CODES ARE ALSO NOT HERE — they are a different space
//   (`paragon.asn_chase_lane`, declared at 2B-1, booked for retirement).
//
//   ⚠️ TWO LABELS ARE **NOT** THE LANE'S STRING — see `FR-WARD-4410` and
//   `FR-MKOV-5520` below. A lot and a batch are INSTANCES, not types.
//
//   ⚠️ `bpomApplicable` IS DELIBERATELY ABSENT from every entry. The 2B-4 gate
//   stands: the mechanism may be authored early, the BEHAVIOUR may not be wired
//   early. The GR wizard is fed the ASN store, which is seeded from the `MAT-*`
//   space — nine codes this master still cannot resolve — so a fail-closed BPOM
//   rule today would refuse essentially every received line.

export const MATERIAL_MASTER: MaterialMaster = Object.freeze({
  'RM-EMUL-3310': {
    materialCode: 'RM-EMUL-3310',
    label: 'Glycerin USP 99.5%',
    materialType: 'ROH',
    materialGroup: 'MG-03', // humectants / glycols
    canonicalUom: 'KG',
  },
  'RM-EMUL-3320': {
    materialCode: 'RM-EMUL-3320',
    label: 'Cetearyl Alcohol',
    materialType: 'ROH',
    materialGroup: 'MG-02', // emollients / esters
    canonicalUom: 'KG',
  },
  // CI-tail material (no modelable should-cost benchmark). To SDC it is an
  // ordinary material — present to show the model handles the actives tail.
  'AI-NIAC-6601': {
    materialCode: 'AI-NIAC-6601',
    label: 'Niacinamide (Vitamin B3)',
    materialType: 'ROH',
    materialGroup: 'MG-04', // active ingredients — the tail
    canonicalUom: 'KG',
  },
  'PK-PETB-8810': {
    materialCode: 'PK-PETB-8810',
    label: 'PET Bottle 250ml',
    materialType: 'VERP',
    materialGroup: 'MG-20', // rigid plastic packaging
    canonicalUom: 'PCS',
  },
  // SDC-2b (F-1a) — second packaging material so the seeded persona (sup-007,
  // PT Berlina Packaging) carries a semi-firm line on its own material×period
  // combo (sharing sup-005's PET 2026-09 combo would over-allocate R2's frozen
  // total, invariant #4).
  'PK-CAPF-8820': {
    materialCode: 'PK-CAPF-8820',
    label: 'Flip-Top Cap 24mm',
    materialType: 'VERP',
    materialGroup: 'MG-21', // closures
    canonicalUom: 'PCS',
  },

  // ══ CP-2 · 2B-2 — ADOPTED FROM THE DOCUMENT LANE ════════════════════════════
  // Groups are taken from the 2B-1 registry (`materialGroups.ts`), not
  // re-derived here. Units are the lane's measured value.

  // ── MG-04 · active ingredients ─────────────────────────────────────────────
  'AI-HYALU-6610': {
    materialCode: 'AI-HYALU-6610',
    label: 'Sodium Hyaluronate (High MW, 1.5-2.0 MDa)',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  // Sibling of the seed's `AI-NIAC-6601`, and the pair is worth reading
  // together: this label STATES its grade, 6601's does not. See
  // `IDENTITY-GRAIN-ASYMMETRY-01` — reported at 2B-2, not fixed here (6601 is
  // seed data, outside this batch's scope).
  'AI-NIAC-6605': {
    materialCode: 'AI-NIAC-6605',
    label: 'Niacinamide Feed Grade 98% (Bulk)',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  'AI-PANTO-6640': {
    materialCode: 'AI-PANTO-6640',
    label: 'D-Panthenol 75% (Provitamin B5)',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  'AI-PEPTIDE-8801': {
    materialCode: 'AI-PEPTIDE-8801',
    label: 'Peptide Complex Anti-Aging',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  'AI-RETA-6750': {
    materialCode: 'AI-RETA-6750',
    label: 'Retinyl Palmitate (Vitamin A Ester) — Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  'AI-SALI-6800': {
    materialCode: 'AI-SALI-6800',
    label: 'Salicylic Acid 99.5% — BHA Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  'AI-VITC-6720': {
    materialCode: 'AI-VITC-6720',
    label: 'Ascorbyl Glucoside (Vitamin C Derivative)',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },
  'AI-VITC-6730': {
    materialCode: 'AI-VITC-6730',
    label: 'L-Ascorbic Acid Powder 99% — Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
  },

  // ── MG-05 · fragrance & sensory ────────────────────────────────────────────
  'FR-EMIN-4420': {
    materialCode: 'FR-EMIN-4420',
    label: 'Emina Fresh Citrus Accord',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
  },
  'FR-MKOV-5510': {
    materialCode: 'FR-MKOV-5510',
    label: 'Make Over Long-Wear Musk Base',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
  },
  // ⚠️ TRIMMED (`INSTANCE-DATA-IN-A-TYPE-LABEL-01`). The lane said
  // "Make Over Oud & Amber Accord — Batch Q2-2025". A BATCH IS AN INSTANCE, NOT
  // A TYPE: adopting it verbatim would weld one quarter's production run into
  // the permanent identity of a code meant to outlive every batch of it. The
  // trim was applied to the lane too, in the SAME edit — a partial trim fails
  // BOTH pins, because the untrimmed string survives wherever it was missed.
  'FR-MKOV-5520': {
    materialCode: 'FR-MKOV-5520',
    label: 'Make Over Oud & Amber Accord',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
  },
  // ⚠️ TRIMMED, same rule. The lane said "… — Lot A" at SIX sites across four
  // modules. Where that lot is operationally real it has nowhere to live in the
  // DECLARED lane (`INSTANCE-DATA-HAS-NO-HOME-01`) — but the right shape already
  // exists one space over: `ASNLineItem.lotNumber`, which the `MAT-*` fixtures
  // use exactly as they should (type in the description, instance in its own
  // field). Reported with that precedent named, not built.
  'FR-WARD-4410': {
    materialCode: 'FR-WARD-4410',
    label: 'Wardah Signature Floral Compound',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
  },
  'FR-WARD-4430': {
    materialCode: 'FR-WARD-4430',
    label: 'Wardah Hijab Refresh Spray Accord',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
  },
  'FR-WARD-4440': {
    materialCode: 'FR-WARD-4440',
    label: 'Wardah EDP Parfum Concentrate — Rose & Oud',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
  },

  // ── MG-02 · emollients / oils / esters ─────────────────────────────────────
  // Both are EMULSIFIERS, sitting here by chemistry rather than by function —
  // the vocabulary has no emulsifier group at all (`MG-NO-EMULSIFIER-GROUP-01`,
  // still open). 2B-1 ruled `RM-EMUL-9430` explicitly; `RM-EMUL-9410` follows
  // the same reasoning and the seed's own precedent (`RM-EMUL-3320`).
  'RM-EMUL-9410': {
    materialCode: 'RM-EMUL-9410',
    label: 'Glyceryl Stearate SE (Halal Emulsifier)',
    materialType: 'ROH',
    materialGroup: 'MG-02',
    canonicalUom: 'KG',
  },
  'RM-EMUL-9430': {
    materialCode: 'RM-EMUL-9430',
    label: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-02',
    canonicalUom: 'KG',
  },

  // ── MG-10 · oleochemical feedstocks (upstream of the formulation grain) ────
  // The five members R-2 declared the group for. It was authored MEMBER-LESS at
  // 2B-1 precisely so this moment would be an adoption against a standing
  // decision rather than a decision smuggled inside one.
  'RM-COCO-8200': {
    materialCode: 'RM-COCO-8200',
    label: 'Coconut Fatty Acid Distillate (CFAD)',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
  },
  'RM-LAURIC-7200': {
    materialCode: 'RM-LAURIC-7200',
    label: 'Lauric Acid 99% — Halal Certified',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
  },
  'RM-MYRST-7310': {
    materialCode: 'RM-MYRST-7310',
    label: 'Myristic Acid 99% (Palm-Derived)',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
  },
  'RM-PALM-7100': {
    materialCode: 'RM-PALM-7100',
    label: 'Palm Kernel Oil — Refined, Bleached, Deodorized',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
  },
  'RM-STEAR-7300': {
    materialCode: 'RM-STEAR-7300',
    label: 'Stearic Acid — Double Pressed (Halal)',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
  },

  // ── MG-20 · rigid plastic packaging ────────────────────────────────────────
  'PK-PETB-8801': {
    materialCode: 'PK-PETB-8801',
    label: 'PET Bottle 200ml Frosted — Wardah Series',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS',
  },
  'PK-PETB-8802': {
    materialCode: 'PK-PETB-8802',
    label: 'PET Bottle 100ml Clear — Emina Series',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS',
  },

  // ── MG-23 · paper & board packaging ────────────────────────────────────────
  'PK-CART-9901': {
    materialCode: 'PK-CART-9901',
    label: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
    materialType: 'VERP',
    materialGroup: 'MG-23',
    canonicalUom: 'PCS',
  },
  'PK-CART-9910': {
    materialCode: 'PK-CART-9910',
    label: 'Shipper Box — Emina Bright Stuff Range (12-pack)',
    materialType: 'VERP',
    materialGroup: 'MG-23',
    canonicalUom: 'PCS',
  },
  // NOTE — `MG-21` (closures) and `MG-22` (metal) gain NO members here. The
  // tree's only unadopted closure is `PK-ALCP-2441` (RFQ-mute → 2B-3) and its
  // `MAT-*` twin. R-1's split decided real rows; those rows are 2B-3's.
});

// ─── Supplier-material relationships (design §7) ──────────────────────────────

export const SUPPLIER_MATERIAL_RELATIONSHIPS: readonly SupplierMaterialRelationship[] =
  Object.freeze([
    // sup-002 makes glycerin directly — a manufacturer, no principal.
    Object.freeze({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      supplierType: 'manufacturer',
    }),
    // sup-005 is a distributor holding glycerin against a principal's lead time —
    // its SOH + incoming is only interpretable WITH the principal lead time.
    Object.freeze({
      supplierId: 'sup-005',
      materialCode: 'RM-EMUL-3310',
      supplierType: 'distributor',
      principals: Object.freeze([
        Object.freeze({ principalId: 'PRIN-OLEO-01', principalLeadTimeDays: 45 }),
      ]),
    }),
    // SDC-3a — sup-007 (PT Berlina Packaging) makes its own packaging: two
    // manufacturer relationships so the seeded persona passes the declare verb's
    // collaborated-material membership ((i)∪(ii) ruling) on its own materials.
    Object.freeze({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8810',
      supplierType: 'manufacturer',
    }),
    Object.freeze({
      supplierId: 'sup-007',
      materialCode: 'PK-CAPF-8820',
      supplierType: 'manufacturer',
    }),
  ]);

// ─── The C8 forecast publication (one governed snapshot) ──────────────────────
// PERIOD-GLOBAL FIRM (design §3.1): 2026-08 is LOCKED → every line in it reads
// `firm`. 2026-09 / 2026-10 are unlocked → lines split semi-firm / visibility-only
// by approval state. Firm lines carry an approved split (⭐ addendum §1).

export const FORECAST_PUBLICATIONS: readonly ForecastPublication[] = Object.freeze([
  Object.freeze({
    publicationId: 'PUB-2026-08-RM',
    planVersion: 'PV-2026-08.1',
    publishedAt: '2026-08-01T00:00:00.000Z',
    horizon: Object.freeze(['2026-08', '2026-09', '2026-10']),
    provenance: PROV_SOMO_SEED,
    lines: Object.freeze([
      // 2026-08 LOCKED → firm. Glycerin total 10 000 kg fanned to two suppliers
      // (6 000 + 3 500 = 9 500 ≤ 10 000) — exercises invariant #4. Both firm →
      // both carry an approved split.
      Object.freeze({
        materialCode: 'RM-EMUL-3310',
        supplierId: 'sup-002',
        periodBucket: '2026-08',
        forecastQty: 6000,
        uom: 'KG',
        commitmentClass: 'firm',
        allocation: Object.freeze({
          materialPeriodTotal: 10000,
          basis: 'planner-split',
          approvedBy: 'planner',
          approvedAt: '2026-07-30T09:00:00.000Z',
        }),
        segment: 'AX',
        suggestedSource: 'sup-002',
        provenance: PROV_SOMO_SEED,
      }),
      Object.freeze({
        materialCode: 'RM-EMUL-3310',
        supplierId: 'sup-005',
        periodBucket: '2026-08',
        forecastQty: 3500,
        uom: 'KG',
        commitmentClass: 'firm',
        allocation: Object.freeze({
          materialPeriodTotal: 10000,
          basis: 'planner-split',
          approvedBy: 'planner',
          approvedAt: '2026-07-30T09:00:00.000Z',
        }),
        segment: 'AX',
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-09 unlocked, APPROVED → semi-firm (no per-publication approval needed).
      Object.freeze({
        materialCode: 'RM-EMUL-3320',
        supplierId: 'sup-002',
        periodBucket: '2026-09',
        forecastQty: 2000,
        uom: 'KG',
        commitmentClass: 'semi-firm',
        allocation: Object.freeze({
          materialPeriodTotal: 2500,
          basis: 'quota',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-09 packaging line — PCS uom (exercises invariant #2 across units).
      Object.freeze({
        materialCode: 'PK-PETB-8810',
        supplierId: 'sup-005',
        periodBucket: '2026-09',
        forecastQty: 120000,
        uom: 'PCS',
        commitmentClass: 'semi-firm',
        allocation: Object.freeze({
          materialPeriodTotal: 150000,
          basis: 'award-history',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-10 draft → visibility-only. The CI-tail active — forward visibility,
      // no commitment, no approval.
      Object.freeze({
        materialCode: 'AI-NIAC-6601',
        supplierId: 'sup-007',
        periodBucket: '2026-10',
        forecastQty: 800,
        uom: 'KG',
        commitmentClass: 'visibility-only',
        allocation: Object.freeze({
          materialPeriodTotal: 1000,
          basis: 'quota',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // ── SDC-2b (F-1a) — sup-007 depth for the P1 supplier surface ─────────
      // The seeded persona confirms a FIRM and a SEMI-FIRM line in the browser.
      // Both lines are IDENTICAL in R1 and R2 (carry-forward-neutral: no new
      // stale case, no carry-forward split) and sit on their OWN material×period
      // combos so no existing frozen total is disturbed (invariant #4).
      // 2026-08 LOCKED → firm → carries the approved split (invariant #3).
      Object.freeze({
        materialCode: 'PK-PETB-8810',
        supplierId: 'sup-007',
        periodBucket: '2026-08',
        forecastQty: 40000,
        uom: 'PCS',
        commitmentClass: 'firm',
        allocation: Object.freeze({
          materialPeriodTotal: 40000,
          basis: 'award-history',
          approvedBy: 'planner',
          approvedAt: '2026-07-30T09:00:00.000Z',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-09 unlocked, APPROVED → semi-firm.
      Object.freeze({
        materialCode: 'PK-CAPF-8820',
        supplierId: 'sup-007',
        periodBucket: '2026-09',
        forecastQty: 60000,
        uom: 'PCS',
        commitmentClass: 'semi-firm',
        allocation: Object.freeze({
          materialPeriodTotal: 75000,
          basis: 'award-history',
        }),
        provenance: PROV_SOMO_SEED,
      }),
    ]),
  }),
  // ── SDC-1 fixture depth — the MID-CYCLE REPUBLICATION (design §3.2) ─────────
  // The CURRENT publication (latest publishedAt): same horizon, plan version
  // bumped. It exercises the stale-carry-forward split the read-model derives:
  //  · 2026-08 firm glycerin lines UNCHANGED → rr-0001 / rr-0002 (answered
  //    PV-2026-08.1) carry forward presumed-valid (full / short, flagged carried).
  //  · 2026-09 lines MOVED → rr-0004 (answered the superseded 120 000 PCS line)
  //    is STALE-against-current; sup-002's 3320 line stays a Draft → awaiting.
  //  · 2026-10 visibility-only line unchanged → sup-007 stays silent.
  Object.freeze({
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    publishedAt: '2026-08-15T00:00:00.000Z',
    horizon: Object.freeze(['2026-08', '2026-09', '2026-10']),
    provenance: PROV_SOMO_SEED,
    lines: Object.freeze([
      // 2026-08 still LOCKED → firm; the approved split republishes unchanged.
      Object.freeze({
        materialCode: 'RM-EMUL-3310',
        supplierId: 'sup-002',
        periodBucket: '2026-08',
        forecastQty: 6000,
        uom: 'KG',
        commitmentClass: 'firm',
        allocation: Object.freeze({
          materialPeriodTotal: 10000,
          basis: 'planner-split',
          approvedBy: 'planner',
          approvedAt: '2026-07-30T09:00:00.000Z',
        }),
        segment: 'AX',
        suggestedSource: 'sup-002',
        provenance: PROV_SOMO_SEED,
      }),
      Object.freeze({
        materialCode: 'RM-EMUL-3310',
        supplierId: 'sup-005',
        periodBucket: '2026-08',
        forecastQty: 3500,
        uom: 'KG',
        commitmentClass: 'firm',
        allocation: Object.freeze({
          materialPeriodTotal: 10000,
          basis: 'planner-split',
          approvedBy: 'planner',
          approvedAt: '2026-07-30T09:00:00.000Z',
        }),
        segment: 'AX',
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-09 MOVED: cetearyl demand up 2 000 → 2 600 (total 2 500 → 3 000).
      Object.freeze({
        materialCode: 'RM-EMUL-3320',
        supplierId: 'sup-002',
        periodBucket: '2026-09',
        forecastQty: 2600,
        uom: 'KG',
        commitmentClass: 'semi-firm',
        allocation: Object.freeze({
          materialPeriodTotal: 3000,
          basis: 'quota',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-09 MOVED: PET bottles up 120 000 → 150 000 (the stale trigger —
      // rr-0004 answered the superseded PV-2026-08.1 line).
      Object.freeze({
        materialCode: 'PK-PETB-8810',
        supplierId: 'sup-005',
        periodBucket: '2026-09',
        forecastQty: 150000,
        uom: 'PCS',
        commitmentClass: 'semi-firm',
        allocation: Object.freeze({
          materialPeriodTotal: 150000,
          basis: 'award-history',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // 2026-10 unchanged — sup-007 remains the silent supplier.
      Object.freeze({
        materialCode: 'AI-NIAC-6601',
        supplierId: 'sup-007',
        periodBucket: '2026-10',
        forecastQty: 800,
        uom: 'KG',
        commitmentClass: 'visibility-only',
        allocation: Object.freeze({
          materialPeriodTotal: 1000,
          basis: 'quota',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      // ── SDC-2b (F-1a) — the sup-007 lines republish UNCHANGED (carry-
      // forward-neutral: byte-identical to R1; sup-007 stays silent either way
      // since it has no seeded response).
      Object.freeze({
        materialCode: 'PK-PETB-8810',
        supplierId: 'sup-007',
        periodBucket: '2026-08',
        forecastQty: 40000,
        uom: 'PCS',
        commitmentClass: 'firm',
        allocation: Object.freeze({
          materialPeriodTotal: 40000,
          basis: 'award-history',
          approvedBy: 'planner',
          approvedAt: '2026-07-30T09:00:00.000Z',
        }),
        provenance: PROV_SOMO_SEED,
      }),
      Object.freeze({
        materialCode: 'PK-CAPF-8820',
        supplierId: 'sup-007',
        periodBucket: '2026-09',
        forecastQty: 60000,
        uom: 'PCS',
        commitmentClass: 'semi-firm',
        allocation: Object.freeze({
          materialPeriodTotal: 75000,
          basis: 'award-history',
        }),
        provenance: PROV_SOMO_SEED,
      }),
    ]),
  }),
]);

// ─── Object 1 — RequirementResponses (the spine) ──────────────────────────────
// Each answers a REAL fanned line (own-facts-only). One meets in full; one is
// short WITH a root-cause child; one is a Draft (not yet submitted).

export const REQUIREMENT_RESPONSES: readonly RequirementResponse[] = Object.freeze([
  // sup-002 confirms its firm 6 000 kg in full.
  Object.freeze({
    id: 'rr-0001',
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-3310',
    periodBucket: '2026-08',
    publicationId: 'PUB-2026-08-RM',
    planVersion: 'PV-2026-08.1',
    submittedAt: '2026-08-03T08:15:00.000Z',
    submissionVersion: 1,
    status: 'Submitted',
    forecastConfirmation: Object.freeze({
      confirmedQty: 6000,
      uom: 'KG',
      committedDate: '2026-08-20',
    }),
    provenance: PROV_SUPPLIER_SEED,
  }),
  // sup-005 (distributor) is short 500 kg on its firm 3 500 — carries a root cause.
  Object.freeze({
    id: 'rr-0002',
    supplierId: 'sup-005',
    materialCode: 'RM-EMUL-3310',
    periodBucket: '2026-08',
    publicationId: 'PUB-2026-08-RM',
    planVersion: 'PV-2026-08.1',
    submittedAt: '2026-08-03T10:40:00.000Z',
    submissionVersion: 1,
    status: 'Submitted',
    forecastConfirmation: Object.freeze({
      confirmedQty: 3000,
      uom: 'KG',
      committedDate: '2026-08-22',
      capacityConstraint: 'principal allocation capped this cycle',
    }),
    rootCause: Object.freeze({
      level1: 'capacity',
      level2: 'principal-allocation',
      note: 'Principal lead time constrains bridgeable volume this period.',
    }),
    provenance: PROV_SUPPLIER_SEED,
  }),
  // sup-002 has a Draft against its semi-firm 2026-09 line (not yet submitted).
  Object.freeze({
    id: 'rr-0003',
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-3320',
    periodBucket: '2026-09',
    publicationId: 'PUB-2026-08-RM',
    planVersion: 'PV-2026-08.1',
    submissionVersion: 1,
    status: 'Draft',
    forecastConfirmation: Object.freeze({
      confirmedQty: 2000,
      uom: 'KG',
    }),
    provenance: PROV_SUPPLIER_DRAFT,
  }),
  // SDC-1 depth — sup-005 confirmed its PET line against PV-2026-08.1; the
  // mid-cycle republication then MOVED that line (120 000 → 150 000), so this
  // recorded submission is the stale-against-current case (design §3.2).
  Object.freeze({
    id: 'rr-0004',
    supplierId: 'sup-005',
    materialCode: 'PK-PETB-8810',
    periodBucket: '2026-09',
    publicationId: 'PUB-2026-08-RM',
    planVersion: 'PV-2026-08.1',
    submittedAt: '2026-08-04T09:20:00.000Z',
    submissionVersion: 1,
    status: 'Submitted',
    forecastConfirmation: Object.freeze({
      confirmedQty: 120000,
      uom: 'PCS',
      committedDate: '2026-09-10',
    }),
    provenance: PROV_SUPPLIER_SEED,
  }),
  // SDC-2b-EXT depth — the VISIBILITY response: sup-007 acknowledges its
  // visibility-only niacinamide line against the CURRENT publication (R2).
  // Deliberately NO forecastConfirmation (invariant #11 XOR): an acknowledgment
  // commits nothing — the note is the early supplier signal Paragon asked for.
  Object.freeze({
    id: 'rr-0005',
    supplierId: 'sup-007',
    materialCode: 'AI-NIAC-6601',
    periodBucket: '2026-10',
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    submittedAt: '2026-08-18T07:30:00.000Z',
    submissionVersion: 1,
    status: 'Submitted',
    acknowledgment: Object.freeze({
      note: 'Seen — current stock sense covers this horizon; no concern yet.',
    }),
    provenance: PROV_SUPPLIER_SEED,
  }),
]);

// ─── Object 2 — InventoryDeclarations (SOH state; TOTAL-FIRST, SDC-3a) ─────────
// The floor is totalQty; batches[] is OPTIONAL detail (R-4 Finding 1 ruling (a)).
// Two seed declarations carry batch-grain detail with Σ batch qty = totalQty
// (invariant #6′) — the full expiry-aware coverage read; one is TOTAL-ONLY
// (SDC-3b) — exercising the EXPIRY-BLIND coverage marker in P2 (a total that is
// honest about its SOH floor but cannot answer expiry bridgeability).

export const INVENTORY_DECLARATIONS: readonly InventoryDeclaration[] = Object.freeze([
  Object.freeze({
    id: 'inv-0001',
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-3310',
    declaredAt: '2026-08-03T08:15:00.000Z',
    totalQty: 4000,
    uom: 'KG',
    batches: Object.freeze([
      Object.freeze({ batchNumber: 'GLY-24A', qty: 1800, uom: 'KG', expiryDate: '2027-06-30' }),
      Object.freeze({ batchNumber: 'GLY-24B', qty: 2200, uom: 'KG', expiryDate: '2027-09-30' }),
    ]),
    provenance: PROV_SUPPLIER_SEED,
  }),
  // Distributor SOH — interpretable only with sup-005's principal lead time (§7).
  Object.freeze({
    id: 'inv-0002',
    supplierId: 'sup-005',
    materialCode: 'RM-EMUL-3310',
    declaredAt: '2026-08-03T10:40:00.000Z',
    totalQty: 1500,
    uom: 'KG',
    batches: Object.freeze([
      Object.freeze({ batchNumber: 'DST-1180', qty: 1500, uom: 'KG', expiryDate: '2027-03-31' }),
    ]),
    provenance: PROV_SUPPLIER_SEED,
  }),
  // SDC-3b — a TOTAL-ONLY declaration (the honest minimal form): sup-007 states
  // its PET-bottle SOH floor for the firm 2026-08 line but declares no batch /
  // expiry detail. Covers demand (45 000 ≥ 40 000 PCS) so it reads "covered",
  // BUT it is EXPIRY-BLIND — P2's coverage marks that expiry bridgeability is
  // unknown, never assuming no-expiry-risk (contrast inv-0001's batch-grain).
  Object.freeze({
    id: 'inv-0003',
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8810',
    declaredAt: '2026-08-05T09:20:00.000Z',
    totalQty: 45000,
    uom: 'PCS',
    provenance: PROV_SUPPLIER_SEED,
  }),
]);

// ─── Object 3 — IncomingShipments (direction-named) ───────────────────────────

export const INCOMING_SHIPMENTS: readonly IncomingShipment[] = Object.freeze([
  // to-paragon → converges on the ASN machine; LINKS by asnRef (asnNumber),
  // never duplicating the tracker. SDC-3a: the ref RESOLVES against the real
  // ASN store (ASN-2025-00301 is sup-002's own In-Transit ASN) — invariant #8
  // now asserts resolution + same-supplier ownership, not mere presence. (The
  // ASN fixture lineage predates the RM/PM taxonomy, so material codes differ
  // across the two fixture universes by design — ownership is the honest join.)
  Object.freeze({
    id: 'ish-0001',
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-3310',
    direction: 'to-paragon',
    lifecycle: 'Shipped',
    qty: 6000,
    uom: 'KG',
    etd: '2026-08-10',
    eta: '2026-08-19',
    awb: 'AWB-77120043',
    asnRef: 'ASN-2025-00301',
    provenance: PROV_SUPPLIER_SEED,
  }),
  // principal-to-distributor → the distributor's supply-assurance leg. Paragon is
  // NOT the consignee, so it carries NO asnRef (it is not a Paragon-inbound leg).
  Object.freeze({
    id: 'ish-0002',
    supplierId: 'sup-005',
    materialCode: 'RM-EMUL-3310',
    direction: 'principal-to-distributor',
    lifecycle: 'Booked',
    qty: 4000,
    uom: 'KG',
    etd: '2026-08-25',
    eta: '2026-10-08',
    provenance: PROV_SUPPLIER_SEED,
  }),
]);

// ─── The SubmissionSession envelope (no status/lifecycle of its own) ──────────
// One supplier visit correlates the per-object commands for audit; each object
// resolved independently (design §2.4 / addendum §5).

export const SUBMISSION_SESSIONS: readonly SubmissionSession[] = Object.freeze([
  // sup-002's visit touched all three objects.
  Object.freeze({
    sessionId: 'ss-0001',
    supplierId: 'sup-002',
    openedAt: '2026-08-03T08:14:00.000Z',
    auditCorrelationId: 'corr-ss-0001',
    attempted: Object.freeze([
      Object.freeze({ kind: 'RequirementResponse', objectId: 'rr-0001' }),
      Object.freeze({ kind: 'InventoryDeclaration', objectId: 'inv-0001' }),
      Object.freeze({ kind: 'IncomingShipment', objectId: 'ish-0001' }),
    ]),
  }),
  // sup-005's visit touched the response + SOH + the principal-to-distributor leg.
  Object.freeze({
    sessionId: 'ss-0002',
    supplierId: 'sup-005',
    openedAt: '2026-08-03T10:39:00.000Z',
    auditCorrelationId: 'corr-ss-0002',
    attempted: Object.freeze([
      Object.freeze({ kind: 'RequirementResponse', objectId: 'rr-0002' }),
      Object.freeze({ kind: 'InventoryDeclaration', objectId: 'inv-0002' }),
      Object.freeze({ kind: 'IncomingShipment', objectId: 'ish-0002' }),
    ]),
  }),
  // SDC-1 depth — sup-005's later visit submitting the PET confirmation
  // (rr-0004, addendum §7: a recorded submission through the session envelope).
  Object.freeze({
    sessionId: 'ss-0003',
    supplierId: 'sup-005',
    openedAt: '2026-08-04T09:18:00.000Z',
    auditCorrelationId: 'corr-ss-0003',
    attempted: Object.freeze([
      Object.freeze({ kind: 'RequirementResponse', objectId: 'rr-0004' }),
    ]),
  }),
]);
