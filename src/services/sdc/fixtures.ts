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
//   THE FIVE CODES THAT WERE NOT HERE ARE NOW — see the 2B-3 block below.
//   `AI-CENT-6900` · `PK-ALCP-2441` · `PK-PETB-8803` · `PK-PETB-8825` ·
//   `RM-HUMEC-3405`. They are reached only through an RFQ's
//   `materialIds: string[]`, which carries NO meaning at all. There was nothing
//   to ratify, and the parent RFQ's TITLE is a sentence about a sourcing event,
//   not a meaning on a code. 2B-3 AUTHORS a meaning for them — a DIFFERENT KIND
//   OF ACT from the 25 above, and the header below keeps the two apart so a
//   later reader does not read all thirty as equally well-evidenced.
//
//   THE NINE `MAT-*` CODES ARE ALSO NOT HERE — they are a different space
//   (`paragon.asn_chase_lane`, declared at 2B-1, booked for retirement).
//
//   ⚠️ TWO LABELS ARE **NOT** THE LANE'S STRING — see `FR-WARD-4410` and
//   `FR-MKOV-5520` below. A lot and a batch are INSTANCES, not types.
//
//   ⚠️ `bpomApplicable` LANDED AT 2B-4a AND IS **WIRED AS OF 2B-4b.** The gate
//   held exactly as written — mechanism early (2B-4a), precondition discharged
//   (2B-2/2B-3 adoption, 2B-5b-ii authoring), behaviour late (2B-4b) — and the
//   sentence it replaces is worth keeping in view: the GR wizard was fed a code
//   space this master could not resolve, so a fail-closed rule would then have
//   refused essentially every received line for a VOCABULARY reason rather than
//   a compliance one. **A GATE IS A MEASUREMENT, NOT A MOOD**, and this one was
//   discharged by making the measurement come out differently.
//
//   ⚠️ SO THESE VALUES ARE NOW LOAD-BEARING ON A RECEIVING SURFACE. The wizard
//   reads them through `bpomOf` and refuses the line on `'UNDETERMINED'`.
//   Changing a row here changes what an inspector is asked to check.
//
//   ⚠️ EVERY VALUE IS **PROVISIONAL** — strategist-ruled on best practice at
//   2B-4a, PENDING TEAM RATIFICATION, and taken from the row's DECLARED GROUP
//   via `PROVISIONAL_BPOM_BY_GROUP` (`sdc/bpom.ts`). **NEVER from the code**:
//   `materialCode` is contractually opaque (C9 §3) and a prefix rule
//   contradicts our own ratified contract. Sixteen APPLICABLE (MG-04/05/06),
//   nine NOT_APPLICABLE (packaging, decided by the registry's `axis`), TEN
//   UNDETERMINED — and the ten are the finding, not the leftovers: they are
//   the rows where `inferBpom` stated a confident `false` and nobody has
//   actually ruled (`PREFIX-RULE-ASSERTS-A-NEGATIVE-01`).
//
//   ⚠️ AND SINCE 2B-4b THOSE ROWS **REFUSE INSTEAD** — the confident `false`
//   is gone, but the ruling still is not made. `D-COMP-BPOM` is now the thing
//   standing between an operator and a receivable line, which is the correct
//   place for an unanswered escalation to be felt.
//
//   ⚠️ `halalApplicable` LANDED AT CP-3 · H1 AND IS **AUTHORED, NOT WIRED.**
//   Nothing reads it; `inferHalal` (`GRInspectionWizard.tsx`) still decides the
//   halal question by parsing a supplier-typed `description`, and this batch
//   does not touch it (that is H2). So editing a row here moves NOTHING today —
//   which is exactly the state `bpomApplicable` was in at 2B-4a, and not the
//   state it is in now.
//
//   ⚠️ EVERY VALUE IS **PROVISIONAL** — strategist-ruled on best practice at H1,
//   PENDING COMPLIANCE RATIFICATION, taken from the row's DECLARED GROUP via
//   `PROVISIONAL_HALAL_BY_GROUP` (`sdc/halal.ts`) and NEVER from the label:
//   four labels in this file contain the word *Halal* and the parse that reads
//   them is the defect. Thirty-one `REQUIRED` (everything that enters or feeds
//   a formulation), ELEVEN `UNDETERMINED` (all packaging), and **ZERO
//   `NOT_REQUIRED` — no row in this master has a basis for saying a halal
//   determination is unnecessary, and none is invented to fill the state out.**
//
//   ⚠️ THE ELEVEN ARE SEAT 3'S REFINEMENT, NOT LEFTOVERS: **packaging is
//   `UNDETERMINED`, NOT the BPOM axis rule.** BPOM excludes packaging; halal may
//   not — `doc-001` is an MUI halal certificate linked to a PET bottle. Copying
//   the neighbouring rule would have handed eleven rows a confident negative
//   nobody gave. `D-COMP-HALAL-1` is compliance's to answer.

export const MATERIAL_MASTER: MaterialMaster = Object.freeze({
  'RM-EMUL-3310': {
    materialCode: 'RM-EMUL-3310',
    label: 'Glycerin USP 99.5%',
    materialType: 'ROH',
    materialGroup: 'MG-03', // humectants / glycols
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  'RM-EMUL-3320': {
    materialCode: 'RM-EMUL-3320',
    label: 'Cetearyl Alcohol',
    materialType: 'ROH',
    materialGroup: 'MG-02', // emollients / esters
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  // CI-tail material (no modelable should-cost benchmark). To SDC it is an
  // ordinary material — present to show the model handles the actives tail.
  'AI-NIAC-6601': {
    materialCode: 'AI-NIAC-6601',
    label: 'Niacinamide (Vitamin B3)',
    materialType: 'ROH',
    materialGroup: 'MG-04', // active ingredients — the tail
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'PK-PETB-8810': {
    materialCode: 'PK-PETB-8810',
    label: 'PET Bottle 250ml',
    materialType: 'VERP',
    materialGroup: 'MG-20', // rigid plastic packaging
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
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
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
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
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
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
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-PANTO-6640': {
    materialCode: 'AI-PANTO-6640',
    label: 'D-Panthenol 75% (Provitamin B5)',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-PEPTIDE-8801': {
    materialCode: 'AI-PEPTIDE-8801',
    label: 'Peptide Complex Anti-Aging',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-RETA-6750': {
    materialCode: 'AI-RETA-6750',
    label: 'Retinyl Palmitate (Vitamin A Ester) — Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-SALI-6800': {
    materialCode: 'AI-SALI-6800',
    label: 'Salicylic Acid 99.5% — BHA Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-VITC-6720': {
    materialCode: 'AI-VITC-6720',
    label: 'Ascorbyl Glucoside (Vitamin C Derivative)',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-VITC-6730': {
    materialCode: 'AI-VITC-6730',
    label: 'L-Ascorbic Acid Powder 99% — Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-05 · fragrance & sensory ────────────────────────────────────────────
  'FR-EMIN-4420': {
    materialCode: 'FR-EMIN-4420',
    label: 'Emina Fresh Citrus Accord',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'FR-MKOV-5510': {
    materialCode: 'FR-MKOV-5510',
    label: 'Make Over Long-Wear Musk Base',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
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
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
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
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'FR-WARD-4430': {
    materialCode: 'FR-WARD-4430',
    label: 'Wardah Hijab Refresh Spray Accord',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'FR-WARD-4440': {
    materialCode: 'FR-WARD-4440',
    label: 'Wardah EDP Parfum Concentrate — Rose & Oud',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
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
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  'RM-EMUL-9430': {
    materialCode: 'RM-EMUL-9430',
    label: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
    materialType: 'ROH',
    materialGroup: 'MG-02',
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
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
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  'RM-LAURIC-7200': {
    materialCode: 'RM-LAURIC-7200',
    label: 'Lauric Acid 99% — Halal Certified',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  'RM-MYRST-7310': {
    materialCode: 'RM-MYRST-7310',
    label: 'Myristic Acid 99% (Palm-Derived)',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  'RM-PALM-7100': {
    materialCode: 'RM-PALM-7100',
    label: 'Palm Kernel Oil — Refined, Bleached, Deodorized',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },
  'RM-STEAR-7300': {
    materialCode: 'RM-STEAR-7300',
    label: 'Stearic Acid — Double Pressed (Halal)',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-20 · rigid plastic packaging ────────────────────────────────────────
  'PK-PETB-8801': {
    materialCode: 'PK-PETB-8801',
    label: 'PET Bottle 200ml Frosted — Wardah Series',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },
  'PK-PETB-8802': {
    materialCode: 'PK-PETB-8802',
    label: 'PET Bottle 100ml Clear — Emina Series',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },

  // ── MG-23 · paper & board packaging ────────────────────────────────────────
  'PK-CART-9901': {
    materialCode: 'PK-CART-9901',
    label: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
    materialType: 'VERP',
    materialGroup: 'MG-23',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },
  'PK-CART-9910': {
    materialCode: 'PK-CART-9910',
    label: 'Shipper Box — Emina Bright Stuff Range (12-pack)',
    materialType: 'VERP',
    materialGroup: 'MG-23',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },
  // NOTE — `MG-21` (closures) and `MG-22` (metal) gain NO members here. The
  // tree's only unadopted closure is `PK-ALCP-2441` (RFQ-mute → 2B-3) and its
  // `MAT-*` twin. R-1's split decided real rows; those rows are 2B-3's.

  // ══ CP-2 · 2B-3 — AUTHORED FROM THE RFQ LANE ════════════════════════════════
  //
  // ⚠️ THESE FIVE ARE A DIFFERENT KIND OF ROW FROM THE 25 ABOVE, AND THE
  //    DIFFERENCE IS NOT COSMETIC. An adoption RATIFIES a meaning the lane
  //    already states. There was no meaning to ratify here: these codes are
  //    reached ONLY through `RFQ.materialIds: string[]`, a bare array that
  //    carries no description at all. `meaningsOf(code)` returns `[]` for every
  //    one of them, today and after this batch — authoring makes a code
  //    RESOLVABLE, it does not make the lane STATE anything. That distinction is
  //    pinned in `materialMasterAuthoring.test.ts`, not left to this comment.
  //
  // ── THE EVIDENCE, AND ITS TIER (recorded, not smoothed) ─────────────────────
  //   Three tiers exist in this tree, and every row below is TIER 2:
  //
  //     T1 · CODE-BOUND LINE — one record carrying the code, a description, and
  //          a qty+unit on the same row. This is what all 25 adoptions had.
  //          ZERO of the five have it.
  //     T2 · CODE-BOUND HEADER — the RFQ. The code is in `materialIds`, the
  //          meaning is in `title`, and the unit is the header's own `uom`.
  //     T3 · NAME-ONLY CORROBORATION — a PR / storefront / marketplace /
  //          remittance row stating the same meaning and unit but carrying NO
  //          CODE. It cannot confirm a code; it can only confirm that the
  //          meaning is operationally real somewhere.
  //
  //   ⚠️ WHY T2 IS GENUINELY WEAKER, stated structurally rather than as a
  //      hedge: `RFQ.uom` IS NOT A PER-MATERIAL FIELD. Its arity is one; the
  //      arity of `materialIds` is N. Three RFQs in this tree (rfq-003, -004,
  //      -005) carry TWO codes under ONE `uom`, so for those the header unit is
  //      not attributable to either code. All five below are the SOLE code on
  //      their RFQ, which is what makes the mapping unambiguous HERE — a
  //      property of these rows, NOT of the field. A sixth code arriving as the
  //      second element of a `materialIds` array gets no unit from this route,
  //      and must not be given one by analogy.
  //
  // ── THE LABELS: THE EM-DASH SPLIT IS DERIVED, NOT A STYLE CHOICE ────────────
  //   Every RFQ title reads `<material> — <sourcing event>`. The tail is trimmed.
  //   The PROOF is `RM-HUMEC-3405`, which appears on THREE RFQs:
  //
  //     'Propylene Glycol USP — imported, USD-quoted'          (rfq-009)
  //     'Propylene Glycol USP — dual-currency bid comparison'  (rfq-012)
  //     'Propylene Glycol USP — dual-currency, rate on record' (rfq-013)
  //
  //   ONE head, THREE tails. If the tail were part of the meaning, that code
  //   would state three meanings and be unadoptable under ONE CODE, ONE MEANING.
  //   It states one meaning and three sourcing contexts. The trim is therefore
  //   forced by the data rather than chosen for tidiness, and the test derives
  //   it that way. This is the same act as 2B-2's `— Lot A` trim (an INSTANCE in
  //   a type label); here the intruder is an EVENT rather than an instance.
  //
  //   NOTE the brands are not treated inconsistently with 2B-2. `PET Bottle
  //   200ml Frosted — Wardah Series` kept its brand because the LANE'S OWN
  //   DESCRIPTION said so; `— Wardah Q3 launch` is trimmed because it is the
  //   reason an RFQ was raised. Same word, different role.
  //
  // ── `bpomApplicable` WAS ABSENT AT 2B-3 AND LANDED AT 2B-4a — see the header.
  //    The 2B-4 gate is unchanged by either batch: the GR wizard is fed
  //    `asnStore`, seeded from the `MAT-*` space, and neither batch touches that
  //    space. Authoring five RFQ codes changed nothing the receiving surface can
  //    see, and neither does populating a field nothing reads yet.

  // ── MG-06 · botanical extracts (its FIRST master member) ───────────────────
  'AI-CENT-6900': {
    materialCode: 'AI-CENT-6900',
    // T2 + T3. RFQ-2026-006 header (300 KG, sole code, Awarded), corroborated
    // name-only by PR-2026-00340 (`Centella Asiatica Extract 10:1`, 300 KG —
    // the SAME quantity and unit) and by the buyer-discovery fixture. The T3
    // rows carry no code, so they raise confidence in the MEANING without
    // raising the tier of the CODE binding.
    label: 'Centella Asiatica Extract 10:1',
    materialType: 'ROH',
    materialGroup: 'MG-06', // botanical extracts & functional
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-03 · humectants / glycols ───────────────────────────────────────────
  'RM-HUMEC-3405': {
    materialCode: 'RM-HUMEC-3405',
    // T2 ×3 — and ⚠️ THREE RFQs IS NOT THREE WITNESSES. rfq-013 is a DECLARED
    // CLONE of rfq-012 ("rfq-012 with a recorded FX ledger and NOTHING else
    // changed", mockRfqs.ts). A copy agrees with its original by construction,
    // so what looks like the best-evidenced row of the five is really two
    // sources and one replication. All three agree on KG, which is worth
    // something; it is REPLICATION, not CORROBORATION.
    label: 'Propylene Glycol USP',
    materialType: 'ROH',
    // ⚠️ MG-03, NOT the 'Emulsifiers' its three RFQs all state. The RFQ's
    // `materialCategory` is a SIX-VALUE UI FACET (`RFQCategory`) with no
    // humectant or glycol member at all — so 'Emulsifiers' is a COERCED value,
    // the nearest available bucket, not a competing declaration. The master
    // already ruled this exact shape once: `RM-EMUL-3310` (Glycerin USP 99.5%)
    // is a seed entry whose code says EMUL and whose group is MG-03, because
    // glycerin is a glycol. Propylene Glycol USP sits beside it. `materialCode`
    // is contractually OPAQUE, so the `RM-HUMEC` prefix decides nothing either —
    // it agrees here by luck, and is not the reason. See
    // `MG-NO-EMULSIFIER-GROUP-01`: the vocabulary has no emulsifier group, which
    // is why this keeps looking like a question and is not one.
    materialGroup: 'MG-03',
    canonicalUom: 'KG',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-20 · rigid plastic packaging ────────────────────────────────────────
  'PK-PETB-8803': {
    materialCode: 'PK-PETB-8803',
    // T2 + T3 ×5 — the best-corroborated MEANING of the five. RFQ-2026-002
    // header (200,000 PCS, sole code), and five name-only rows say the same
    // thing: PR-2026-00342 (50,000 PCS), the sup-007 storefront line, the
    // marketplace card, the PO-2025-00107 remittance note (50,000 PCS), and
    // SupplierShipments. B2a re-coded this RFQ off `PK-PETB-8810` precisely
    // because every one of those traces said 100ml Airless Pump.
    label: 'PET Bottle 100ml Airless Pump',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },
  'PK-PETB-8825': {
    materialCode: 'PK-PETB-8825',
    // T2 only — RFQ-2026-010 header (120,000 PCS, sole code, Open). No other
    // record in the tree states this meaning.
    //
    // ⚠️ A SEPARATE ITEM FROM `PK-PETB-8810` ('PET Bottle 250ml'), by operator
    // ruling. Same substrate, same volume, DIFFERENT CLOSURE FORMAT — and under
    // `D-IDENTITY-GRAIN = SPECIFICATION` a closure format is part of the
    // purchasable item. Not merged, not aliased. 2A withheld this row on purpose:
    // calling the two one item is an ADOPTION decision, not a collision fix, and
    // 2A was not an adoption batch.
    label: 'PET Bottle 250ml Flip-Top',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },

  // ── MG-21 · closures — where R-1's substrate-vs-function split PAYS OUT ─────
  'PK-ALCP-2441': {
    materialCode: 'PK-ALCP-2441',
    // T2 only — RFQ-2026-011 header (80,000 PCS, sole code, Open).
    //
    // ⚠️ THIS IS THE ROW `MG-21` WAS ARGUED OVER. An ALUMINIUM cap: under a
    // pure SUBSTRATE axis it lands in MG-22 (metal packaging), away from the
    // plastic closures it is sourced alongside; under R-1's FUNCTIONAL axis it
    // lands in MG-21 with them. R-1 chose function and kept the axes split
    // explicitly so this row could be right, and `materialGroups.ts` records
    // that cost in an `axis` field rather than in prose. Applying it here is
    // what a standing decision is FOR — the ruling was made at 2B-1, ahead of
    // its member, so that assigning this group today is an application and not
    // a decision smuggled inside an adoption diff.
    label: 'Aluminium Cap 24/410',
    materialType: 'VERP',
    materialGroup: 'MG-21',
    canonicalUom: 'PCS',
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },

  // NOTE — `MG-22` (metal packaging) STILL gains no member, and that is the
  // point of the row above: the tree's aluminium closure went to MG-21. ⚠️
  // AMENDED at 2B-5b-ii: the sentence used to end *"the only other
  // metal-substrate candidate is `MAT-77014`, in the undeclared third space,
  // which no batch adopts."* That candidate is adopted below, as
  // `PK-ALCP-2450`, and it went to **MG-21 as well** — so MG-22 is now
  // member-less with TWO aluminium closures in the tree rather than one. R-1's
  // functional axis is not a tie-breaker that happened to fire once.

  // ══ CP-2 · 2B-5b-ii — AUTHORED FROM THE ASN LANE ════════════════════════════
  //
  // The seven codes of `paragon.asn_chase_lane` (R-3, declared and retired at
  // 2B-1), authored here as canonical rows and retired off `MAT-*` in
  // `supplierShipments.ts`. **THE THIRD SPACE IS EMPTY WHEN THIS LANDS.**
  //
  // ── WHAT 5b-i DID AND DID NOT MAKE READABLE ────────────────────────────────
  //   5b-i repaired the TENANT axis: every ASN now names a PO its own addressee
  //   owns. **THAT TELLS YOU WHO AND WHEN. IT DOES NOT TELL YOU WHAT.** The
  //   material axis is still open at 7 of 7, and a repaired `poReference` is
  //   NOT material evidence — for three of these rows the repaired parent
  //   orders something else entirely. No label below is taken from a PO line.
  //
  // ── TIERS ARE COMPUTED, NEVER STAMPED (2B-3's rule, unchanged) ─────────────
  //   No `evidenceTier` field exists and none is added. `asnMasterAuthoring.
  //   test.ts` counts, per row, how many code-bound records state a meaning,
  //   how many state a unit, how many documents corroborate, and how many
  //   sources CONTRADICT. A row that gains evidence reads better automatically;
  //   a row that loses it goes red.
  //
  // ── WHAT EVERY ROW HERE RESTS ON, IN ONE LINE ──────────────────────────────
  //   All seven have exactly ONE code-bound record stating a meaning: their own
  //   `AsnLineItem.description`. **`AsnLineItem` HAS NO `uom` FIELD**, so no ASN
  //   line states a unit for anything. Five rows therefore take their unit from
  //   the GROUP CONVENTION and say so; two take it from a storefront row that
  //   states `uom` explicitly — bound by `sapCode`, which R-D ruled a POINTER,
  //   so it is corroboration and not identity.

  // ── MG-05 · fragrance ──────────────────────────────────────────────────────
  'FR-ROUD-4470': {
    materialCode: 'FR-ROUD-4470',
    // ⚠️ THE WEAKEST ROW IN THE SET, AND THE PROVENANCE SAYS SO RATHER THAN
    // DRESSING IT UP. Its own description is the ONLY NON-CONTRADICTED SOURCE.
    // Both of the other things the tree says about `MAT-88201` point ELSEWHERE:
    //   · its `poReference` (pre-5b-i `PO-2025-00112`) is Givaudan's, ordering
    //     `FR-MKOV-5520` and `FR-WARD-4430`;
    //   · its `supplierId` is sup-007, PT Berlina PACKAGING, whose only master
    //     relationships are `PK-PETB-8810` and `PK-CAPF-8820`.
    // Operator ruling R-3 refused to retire it onto `FR-WARD-4440` (*Wardah EDP
    // Parfum Concentrate — Rose & Oud*, sup-004 Firmenich): doing so would
    // assert that a packaging converter shipped a fragrance house's
    // concentrate. **THE CONTRADICTION IS PART OF THIS ROW'S PROVENANCE AND
    // AUTHORING DOES NOT ERASE IT** — it is asserted, not narrated, in
    // `asnMasterAuthoring.test.ts`.
    //
    // ⚠️ AND THE MNEMONIC IS A SIGNAL, NOT A GAP. Every other `FR-*` mnemonic
    // is a BRAND (EMIN / MKOV / WARD). This one is a scent, because no record
    // in the tree attributes it to a brand. A code shaped unlike its siblings
    // is the honest rendering of a row whose siblings have provenance it lacks.
    label: 'Fragrance Concentrate — Rose Oud',
    materialType: 'ROH',
    materialGroup: 'MG-05',
    // GROUP CONVENTION, not a measurement: all six existing MG-05 rows are KG
    // and no ASN line states a unit. Recorded as the weaker basis it is.
    canonicalUom: 'KG',
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-04 · active ingredients — the two EMULSIONS ─────────────────────────
  // ⚠️ THE GROUP QUESTION THE DISPATCH ASKED, ANSWERED BY R-2's OWN CRITERION
  // RATHER THAN BY RESEMBLANCE. MG-10 exists because 2B-1 refused to force
  // oleochemical feedstocks into a formulation group, and its test is written
  // down: members of MG-10 are *"INPUTS TO the materials in MG-01..06, not
  // members of them"*. A 5% niacinamide emulsion is DOSED INTO a formula — it
  // ENTERS the formulation grain, so it is not upstream of it. And the
  // MG-01..06 axes are FUNCTIONAL (`axis: 'formulation-ingredient'`), not
  // physical: they separate surfactant from emollient from active, never powder
  // from emulsion. An emulsion of an active FUNCTIONS as an active.
  // **THE REGISTRY HAS NO PHYSICAL-FORM AXIS, AND THIS SET DOES NOT SUPPLY A
  // REASON TO ADD ONE** — the two rows differ from `AI-NIAC-6605` in CONCENTRATION
  // AND FORM, which is item-grain (D-IDENTITY-GRAIN = SPECIFICATION), not
  // group-grain. No new group is declared, and the reasoning is recorded so the
  // refusal is as visible as MG-10's creation was.
  'AI-NIAC-6612': {
    materialCode: 'AI-NIAC-6612',
    // Third `AI-NIAC-*`, and deliberately NOT merged with either sibling:
    // `AI-NIAC-6601` is *Niacinamide (Vitamin B3)*, `AI-NIAC-6605` is *Feed
    // Grade 98% (Bulk)*. A 5% emulsion is neither — concentration and physical
    // form are both specification, and `PK-PETB-8810` vs `PK-PETB-8825` is the
    // standing precedent for treating a format difference as a distinct item.
    // ⚠️ Its ASN ships COOL CHAIN (2–8 °C) while `AI-NIAC-6605`'s PO ships
    // ambient — a handling attribute the tree states, and the only physical
    // evidence in the set that these are not powders.
    label: 'Active Emulsion — Niacinamide 5%',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG', // group convention; no ASN line states a unit
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },
  'AI-HYALU-6615': {
    materialCode: 'AI-HYALU-6615',
    // Sibling of `AI-HYALU-6610` (*Sodium Hyaluronate (High MW, 1.5-2.0 MDa)*),
    // which specifies a MOLECULAR WEIGHT — a raw-powder specification this row
    // has no counterpart for. Same reasoning as `AI-NIAC-6612`.
    label: 'Active Emulsion — Hyaluronic 2%',
    materialType: 'ROH',
    materialGroup: 'MG-04',
    canonicalUom: 'KG', // group convention; no ASN line states a unit
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-10 · oleochemical feedstocks ────────────────────────────────────────
  'RM-PSTN-7150': {
    materialCode: 'RM-PSTN-7150',
    // ⚠️ THE NEAR-MISS THAT WOULD HAVE BEEN WRONG BY NAME, RECORDED SO IT IS
    // NOT RE-PROPOSED: **PALM STEARIN IS NOT STEARIC ACID.** `RM-STEAR-7300`
    // (*Stearic Acid — Double Pressed (Halal)*) shares four letters and is a
    // different class of substance — a fatty acid, where this is a
    // triglyceride fraction of palm oil. `RM-PALM-7100` (*Palm Kernel Oil —
    // Refined, Bleached, Deodorized*) shares the RBD process word and is a
    // different feedstock — KERNEL oil, not a mesocarp-oil fraction. Two
    // plausible merges, both wrong, both available to anyone reading labels.
    //
    // Group by R-2's stated criterion, not by resemblance: a palm fraction is
    // an INPUT TO the materials in MG-01..06, and `RM-PALM-7100` is already
    // MG-10. The mnemonic is `PSTN` and the number sits beside `RM-PALM-7100`
    // because they are the same feedstock family; `STEAR` was NOT reused,
    // deliberately.
    //
    // TWO SOURCES, and one of them states the unit: the ASN description, and
    // the sup-002 storefront row `c101` (*RBD Palm Stearin — Specialty Fat*,
    // `uom: 'KG'`). The storefront binds by `sapCode`, which R-D ruled a
    // POINTER — so it CORROBORATES and does not identify.
    label: 'RBD Palm Stearin — Specialty Fat',
    materialType: 'ROH',
    materialGroup: 'MG-10',
    canonicalUom: 'KG', // STATED by `c101`, not inferred from the group
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-02 · where the emulsifiers live, and that is the finding ────────────
  'RM-EMUL-9440': {
    materialCode: 'RM-EMUL-9440',
    // ⚠️ THE BEST-EVIDENCED ROW IN THE SET — FOUR SOURCES, TWO OF THEM
    // DOCUMENTS, and the only row in the ENTIRE MASTER whose `bpomApplicable`
    // rests on a document rather than on its group's class default:
    //   · `ASN-2025-00302` line — *Emulgade SE-PF emulsifier*, 2 400 shipped;
    //   · storefront `c201` — *Emulgade SE-PF Emulsifier*, `uom: 'KG'`,
    //     certs REACH + ISO 9001 (⚠️ **NO halal cert**);
    //   · `doc-201` — **BPOM Notification TD.02.02.66.10.23.0311**, category
    //     `BPOM Regulatory`, issued by BPOM, linked to `PO-2025-00131`, which
    //     is this ASN's parent;
    //   · `doc-202` — *REACH Compliance / Safety Data Sheet — Emulgade*, issued
    //     by **BASF SE Regulatory Affairs**, `linkedTo: 'All emulsifier grades'`.
    //
    // ⚠️ `bpomApplicable: 'APPLICABLE'` IS A DEVIATION FROM THE CLASS RULE AND
    // IS MEANT TO BE. `provisionalBpomForGroup('MG-02')` returns `UNDETERMINED`
    // — MG-02 is not in 2B-4a's provisionally-applicable set. This row is
    // APPLICABLE **on `doc-201`**, which is a determination somebody actually
    // made about this supply rather than a default we assigned. 2B-4a said the
    // 35 seeded values were provisional pending team ratification; this one is
    // the first that is not seeded from a class at all. The exception is an
    // EXACT SET OF ONE in `bpomApplicability.test.ts`, with its evidence, so it
    // cannot grow quietly into a second mechanism.
    //
    // AND THE SAME DOCUMENTS SEPARATE IT FROM `RM-EMUL-9410` (*Glyceryl
    // Stearate SE (**Halal** Emulsifier)*): a BASF/REACH frame with no halal
    // certification is not the Indonesian halal-certified emulsifier lane
    // (`PT Halal Emulsifier Nusantara`, sup-010). Shared substrings — "SE",
    // "emulsifier" — are not shared identity.
    //
    // ⚠️ GROUP: MG-02 *(Emollients / oils / esters)*, which is where the tree's
    // other two emulsifiers already sit — and it is WRONG for all three.
    // `MG-NO-EMULSIFIER-GROUP-01` is now THREE rows deep. Placed with its
    // siblings rather than somewhere better, because moving them is a registry
    // ruling (the MG-10 shape) and inventing MG-07 inside an authoring diff is
    // the decision-smuggling 2B-1 named. **REPORTED FOR RULING, NOT FIXED HERE.**
    label: 'Emulgade SE-PF Emulsifier',
    materialType: 'ROH',
    materialGroup: 'MG-02',
    canonicalUom: 'KG', // STATED by `c201`, not inferred from the group
    bpomApplicable: 'APPLICABLE',
    halalApplicable: 'REQUIRED',
  },

  // ── MG-20 · rigid plastic packaging ────────────────────────────────────────
  'PK-PETB-8804': {
    materialCode: 'PK-PETB-8804',
    // The 50 ml the master did not have. Existing PET bottles are 200 ml
    // frosted, 100 ml clear, 100 ml airless, 250 ml and 250 ml flip-top —
    // **`50ml` appears NOWHERE ELSE IN THE TREE**, which is why nothing could
    // be retired onto. Volume is specification under D-IDENTITY-GRAIN, the same
    // axis that keeps `PK-PETB-8810` and `PK-PETB-8825` apart.
    // Supplier corroborates for once: sup-007 (PT Berlina Packaging) is a
    // declared MANUFACTURER of `PK-PETB-8810` and `PK-CAPF-8820`.
    label: 'PET Bottle 50ml Clear',
    materialType: 'VERP',
    materialGroup: 'MG-20',
    canonicalUom: 'PCS', // group convention; every MG-20 row is PCS
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },

  // ── MG-21 · closures ───────────────────────────────────────────────────────
  'PK-ALCP-2450': {
    materialCode: 'PK-ALCP-2450',
    // ⚠️ **NOT `PK-ALCP-2441`. OPERATOR RULING R-2, RECORDED HERE SO NOBODY
    // MERGES THE TWO AS AN OBVIOUS TIDY-UP.** They look identical — same
    // substrate, same 24/410 neck finish, same unit, and R-1's own registry
    // files aluminium caps under MG-21 *closures*, so "closure" and "cap" are
    // not even different categories in our vocabulary. The ruling stands on two
    // things the labels do not show:
    //   1. **AN OPEN 2026 RFQ IS NOT EVIDENCE ABOUT WHAT WAS RECEIVED THIRTEEN
    //      MONTHS EARLIER.** `PK-ALCP-2441` rests on T2-only evidence from
    //      `RFQ-2026-011` — created 2026-04-22, status **Open**, never awarded.
    //      This row's source is `ASN-2025-00198`, **Delivered**, eta 2025-03-22.
    //   2. **24/410 FIXES THE NECK FINISH ONLY** — not liner, colour or closure
    //      format. That is precisely the axis `PK-PETB-8810` vs `PK-PETB-8825`
    //      was split on by operator ruling. `RFQ-2026-011` also carries a
    //      programme qualifier this line does not: *"— Wardah serum line"*.
    // **UNDER SPECIFICATION-GRAIN IDENTITY, LOOKS THE SAME IS NOT THE SAME
    // PURCHASABLE ITEM.** The code is deliberately NOT `2442`: an adjacent
    // number invites the merge this ruling refuses.
    label: 'Aluminium Closure 24/410',
    materialType: 'VERP',
    materialGroup: 'MG-21',
    canonicalUom: 'PCS', // group convention; `PK-CAPF-8820`/`PK-ALCP-2441` are PCS
    bpomApplicable: 'NOT_APPLICABLE',
    halalApplicable: 'UNDETERMINED',
  },
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
