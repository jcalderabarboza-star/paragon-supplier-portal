// ────────────────────────────────────────────────────────────────────────────
// RFQ material → should-cost basket join (the CI-2 SIMULATED mapping).
//
// A quote is priced for an RFQ material (an opaque SAP-style code like
// `RM-EMUL-3310`); the should-cost engine models a `sc-*` material (a basket of
// public root benchmarks). The two vocabularies were authored independently — so
// CI-2 needs an explicit JOIN. This map is that join.
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

/** Fixture RFQ materialId → commodityBaskets `sc-*` material id (SIMULATED). */
export const MATERIAL_TO_BASKET: Readonly<Record<string, string>> = Object.freeze({
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
