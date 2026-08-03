// ────────────────────────────────────────────────────────────────────────────
// Material → should-cost basket CLASSIFICATION (the CI-2 SIMULATED mapping).
//
// ── IT IS A CLASSIFICATION, NOT A CROSSWALK (CP-2 · B2a; Seat 3 §4.3) ────────
//   This file used to call itself a JOIN between "two vocabularies authored
//   independently", and the export was named `MATERIAL_TO_BASKET`. Both were
//   wrong in the same way, and the misnomer is what earned the §4.3 indictment:
//   a crosswalk reconciles two identity spaces that each name the SAME things,
//   and a crosswalk between two spaces WE control carries no information. This
//   map does something else entirely — it CLASSIFIES a material into a
//   should-cost basket, the way a material group classifies it into a taxonomy.
//   `sc-*` ids are not a second name for a material; they are a MODEL of one.
//   A material with no basket is not "unmatched", it is UNCLASSIFIED, and that
//   is a perfectly ordinary state the resolver reports as honest silence.
//
// ── OPEN: ITS DOMAIN IS NOT THE MASTER (booked to CP-2 · B2b) ───────────────
//   SEVEN of the eleven keys below name codes `MATERIAL_MASTER` does not
//   contain, and `PK-CAPF-8820` is in the master but absent here. So this is a
//   classification keyed on the DOCUMENT LANE, not on the master — which is the
//   real reason it read like a crosswalk. Re-keying it onto master codes is
//   DELIBERATELY NOT DONE HERE: those seven are exactly the codes awaiting an
//   adoption decision, so re-keying now would settle B2b by implication.
//
// A quote is priced for a material (an opaque SAP-style code like
// `RM-EMUL-3310`); the should-cost engine models a `sc-*` material (a basket of
// public root benchmarks). This map says which basket models which material.
//
// ⚠️ HONESTY MARKER — THIS IS A SIMULATED MAP, NOT PARAGON DATA. The material
// codes on the left are the fixture RFQ materialIds; the `sc-*` ids on the right
// are the commodityBaskets.ts taxonomy. The pairing is a PROPOSAL built from the
// material names, NOT Paragon's real SKU→basket master. It exists so the CI-2
// spread has SOMETHING calibrated to render against, honestly marked. When the
// operator RM/PM list + SKU→basket mappings land (build-plan §7), this map becomes
// real — same shape, real specifics; the resolver does not change.
//
// A materialId ABSENT here resolves to `silent: 'unmapped'` — never a fabricated
// spread. A materialId mapped to a TAIL sc-material resolves to `silent: 'tail'`.
// Both are honest silence, decided by the resolver (shouldCostSpread.ts).
// ────────────────────────────────────────────────────────────────────────────

/** Material code → the commodityBaskets `sc-*` basket that MODELS it (SIMULATED).
 *  Absent = unclassified, which the resolver reports as `silent: 'unmapped'`. */
export const MATERIAL_BASKET_CLASSIFICATION: Readonly<Record<string, string>> = Object.freeze({
  // Active ingredients — the modelable tail (no basket → resolver returns 'tail')
  'AI-NIAC-6601': 'sc-niacinamide', // Niacinamide — TAIL (no modelable benchmark)
  'AI-HYALU-6610': 'sc-hyaluronic-acid', // Sodium hyaluronate — TAIL (fermentation)
  'AI-CENT-6900': 'sc-plant-extracts', // Centella extract — TAIL (botanical active)

  // Emulsifiers / humectants — modelable oleochemical core
  'RM-EMUL-3310': 'sc-glycerin', // Glycerin 99.5% — MODELABLE (RM_OLEO, domestic)
  'RM-EMUL-3320': 'sc-cetearyl', // Cetearyl alcohol — MODELABLE (RM_OLEO, domestic)
  'RM-HUMEC-3405': 'sc-propylene-glycol', // Propylene glycol — MODELABLE (RM_PETRO,
  // INTERNATIONAL basis) — the imported material a foreign supplier quotes in USD;
  // exercises the engine-native, FX-free USD spread branch.

  // Fragrance — the opaque tail (no basket → 'tail')
  'FR-WARD-4430': 'sc-fragrance', // Perfumer blend — TAIL (PRA-assessed)
  'FR-WARD-4440': 'sc-fragrance', // Perfumer blend — TAIL

  // Packaging — modelable baskets, but priced per-PIECE (the resolver's unit gate
  // returns 'unit-mismatch': an IDR/pcs quote cannot compare to an IDR/kg model)
  'PK-PETB-8810': 'sc-pet-bottle', // PET bottle — MODELABLE basket, PCS quote
  'PK-CART-9901': 'sc-folding-carton', // Folding carton — MODELABLE basket, PCS
  'PK-CART-9910': 'sc-shipper-box', // Shipper box — MODELABLE basket, PCS
});
