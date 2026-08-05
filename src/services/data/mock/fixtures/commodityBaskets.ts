// ────────────────────────────────────────────────────────────────────────────
// Commodity should-cost baskets — the SIMULATED CI-1 scaffold.
//
// A typed encoding of docs/Paragon_RM_PM_Taxonomy_and_Baskets_v1.md: the SAP-
// faithful (ROH/VERP · sector C) RM/PM taxonomy, each material mapped to a basket
// of public root benchmarks with technical weights, tail materials flagged.
//
// ⚠️ HONESTY MARKER — THIS IS A TEMPLATE, NOT PARAGON DATA. Every material, weight,
// root value, and FX rate here is a SIMULATED proposal built from SAP conventions +
// cosmetics-industry commodity structure — NOT Paragon's real material master or
// spend. Its jobs: give the CI-1 engine an honest scaffold to compute against, and
// give the RM/PM team a structured draft to correct. Reality is swapped in later —
// the structure holds, the specifics get replaced. Every root renders SIMULATED
// until CI-3 wires real feeds; every should-cost is permanently MODELED.
//
// TWO MODELING NOTES (why the baskets look leaner than the doc's tables):
//  • The doc's inline "conversion 0.xx" basket lines are realized by the governed
//    CONVERSION_COST term (build-plan §5), NOT as basket roots — so a basket here
//    carries ONLY the root-benchmark cost drivers.
//  • The doc's inline co-product line (e.g. MCT "glycerin −0.10") is realized by the
//    governed CO_PRODUCT_CREDIT term, not a negative-weight basket root.
// ────────────────────────────────────────────────────────────────────────────

import type {
  Material,
  RootBenchmark,
  FxRate,
} from '../../../../lib/shouldCost';

// ─── Root benchmarks (SIMULATED USD/kg) ───────────────────────────────────────
// The public commodities that drive RM/PM cost. Values + as-of dates are SIMULATED
// placeholders; CI-3 wires the real World Bank/MPOB/FCPO/FRED/Drewry/LME feeds.

const root = (
  id: string,
  label: string,
  valueUsdPerKg: number,
  asOf: string,
): RootBenchmark => ({ id, label, valueUsdPerKg, liveness: 'SIMULATED', asOf });

export const ROOT_BENCHMARKS: Readonly<Record<string, RootBenchmark>> = Object.freeze(
  Object.fromEntries(
    [
      // Palm / lauric oleochemical complex
      root('fatty_alcohol_c12_14', 'Fatty alcohol C12–14 (lauric)', 2.1, '2026-06-15'),
      root('fatty_alcohol_c16_18', 'Fatty alcohol C16–18', 1.95, '2026-06-15'),
      root('fatty_acid_c8_c10', 'Fatty acid C8–C10', 2.4, '2026-06-15'),
      root('fatty_acid_coconut', 'Coconut/PKO fatty acid', 1.8, '2026-06-15'),
      root('myristic_acid', 'Myristic acid', 2.2, '2026-05-15'),
      root('cpo', 'Crude palm oil (CPO)', 0.95, '2026-06-01'),
      // Petro chain
      root('ethylene_oxide', 'Ethylene oxide', 1.3, '2026-06-10'),
      root('dmapa', 'DMAPA', 2.6, '2026-05-20'),
      root('ipa', 'Isopropyl alcohol', 1.1, '2026-06-10'),
      root('propylene', 'Propylene', 1.05, '2026-06-10'),
      root('petro_c4', 'Petro C4 stream', 1.0, '2026-06-10'),
      root('phenol', 'Phenol', 1.4, '2026-06-10'),
      root('glucose_starch', 'Glucose / starch', 0.6, '2026-06-05'),
      // Packaging polymers
      root('pet_resin', 'PET resin', 1.25, '2026-06-12'),
      root('polypropylene', 'Polypropylene (PP)', 1.2, '2026-06-12'),
      root('polyethylene', 'Polyethylene (PE)', 1.18, '2026-06-12'),
      root('bopp_pet_film', 'BOPP/PET film', 1.55, '2026-06-12'),
      // Metals (LME delayed, free)
      root('aluminium_lme', 'Aluminium (LME delayed)', 2.35, '2026-06-14'),
      root('steel_lme', 'Steel / tinplate (LME)', 0.85, '2026-06-14'),
      root('aluminium_foil', 'Aluminium foil', 2.8, '2026-06-14'),
      // Glass + paper
      root('natural_gas', 'Natural gas (energy)', 0.35, '2026-06-08'),
      root('soda_ash', 'Soda ash', 0.3, '2026-06-08'),
      root('pulp_paper_ppi', 'Pulp/paperboard (FRED PPI)', 0.9, '2026-06-01'),
    ].map((r) => [r.id, r]),
  ),
);

// ─── Spot FX (SIMULATED, IDR per USD) ─────────────────────────────────────────
export const SIMULATED_SPOT_FX: FxRate = {
  idrPerUsd: 16250,
  liveness: 'SIMULATED',
  asOf: '2026-06-15',
};

// ─── Materials → baskets (the taxonomy, SIMULATED) ────────────────────────────
// RM oleochemicals are priced on the DOMESTIC basis (Indonesian palm feedstock —
// the layer the CI-1.5 export-ban backtest needs); petro-derived RM and all
// packaging are priced INTERNATIONAL. Basis is carried from CI-1 even though the
// domestic feed lands at CI-3.

const comp = (rootId: string, weight: number, lagNote?: string) => ({
  rootId,
  weight,
  ...(lagNote ? { lagNote } : {}),
});

export const SHOULD_COST_MATERIALS: readonly Material[] = [
  // MG-01 · Surfactants / cleansing actives (lauric-oleochemical core)
  {
    id: 'sc-sles',
    name: 'SLES (Sodium Laureth Sulfate)',
    group: 'MG-01',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('fatty_alcohol_c12_14', 0.55), comp('ethylene_oxide', 0.3, 'EO ties to petro chain')],
  },
  {
    id: 'sc-sls',
    name: 'SLS (Sodium Lauryl Sulfate)',
    group: 'MG-01',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('fatty_alcohol_c12_14', 0.65, 'lauric-heavy')],
  },
  {
    id: 'sc-capb',
    name: 'CAPB (Cocamidopropyl Betaine)',
    group: 'MG-01',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('fatty_acid_coconut', 0.55, 'CNO substitution matters'), comp('dmapa', 0.3)],
  },
  {
    id: 'sc-decyl-glucoside',
    name: 'Decyl glucoside',
    group: 'MG-01',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('fatty_alcohol_c12_14', 0.5), comp('glucose_starch', 0.3, 'dextrose soft-benchmarked')],
  },

  // MG-02 · Emollients / oils / esters
  {
    id: 'sc-mct',
    name: 'Caprylic/Capric Triglyceride (MCT)',
    group: 'MG-02',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('fatty_acid_c8_c10', 0.7, 'co-product credit on splitting')],
  },
  {
    id: 'sc-ipm',
    name: 'Isopropyl Myristate (IPM)',
    group: 'MG-02',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('myristic_acid', 0.55), comp('ipa', 0.25, 'ester = acid + alcohol')],
  },
  {
    id: 'sc-cetearyl',
    name: 'Cetearyl Alcohol',
    group: 'MG-02',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('fatty_alcohol_c16_18', 0.75, 'palmitic/stearic route')],
  },
  {
    id: 'sc-palm-butter',
    name: 'Shea/palm-based butter',
    group: 'MG-02',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('cpo', 0.7, 'RSPO premium axis deferred to CI-5')],
  },

  // MG-03 · Humectants / glycols
  {
    id: 'sc-glycerin',
    name: 'Glycerin (USP, 99.5%)',
    group: 'MG-03',
    sapType: 'ROH',
    materialClass: 'RM_OLEO',
    basis: 'domestic',
    basket: [comp('cpo', 0.8, 'modeled-core via CPO; observed spot is tail (CI-5)')],
  },
  {
    id: 'sc-propylene-glycol',
    name: 'Propylene Glycol',
    group: 'MG-03',
    sapType: 'ROH',
    materialClass: 'RM_PETRO',
    basis: 'international',
    basket: [comp('propylene', 0.75, 'petro chain, direction-only')],
  },
  {
    id: 'sc-butylene-glycol',
    name: 'Butylene Glycol',
    group: 'MG-03',
    sapType: 'ROH',
    materialClass: 'RM_PETRO',
    basis: 'international',
    basket: [comp('petro_c4', 0.7, 'direction-only')],
  },

  // MG-04 · Active ingredients — mostly TAIL
  {
    id: 'sc-niacinamide',
    name: 'Niacinamide (Vitamin B3)',
    group: 'MG-04',
    sapType: 'ROH',
    basket: null,
    tail: true,
    reason: 'no modelable benchmark — cost-breakdown capture at RFQ (CI-5)',
  },
  {
    id: 'sc-hyaluronic-acid',
    name: 'Hyaluronic Acid (Na hyaluronate)',
    group: 'MG-04',
    sapType: 'ROH',
    basket: null,
    tail: true,
    reason: 'no modelable benchmark — fermentation-based, cost-breakdown at RFQ',
  },
  {
    id: 'sc-salicylic-acid',
    name: 'Salicylic Acid',
    group: 'MG-04',
    sapType: 'ROH',
    materialClass: 'RM_PETRO',
    basis: 'international',
    basket: [comp('phenol', 0.6, 'benzene/phenol chain — direction-only proxy')],
  },
  {
    id: 'sc-vitamin-e',
    name: 'Vitamin E (tocopherol)',
    group: 'MG-04',
    sapType: 'ROH',
    basket: null,
    tail: true,
    reason: 'no modelable benchmark — grade-assessed, cost-breakdown at RFQ',
  },

  // MG-05 · Fragrance & sensory — the opaque tail
  {
    id: 'sc-fragrance',
    name: 'Fragrance compound (perfumer blend)',
    group: 'MG-05',
    sapType: 'ROH',
    basket: null,
    tail: true,
    reason: 'no modelable benchmark — PRA-assessed, supplier-quoted only',
  },
  {
    id: 'sc-essential-oils',
    name: 'Essential oils (natural)',
    group: 'MG-05',
    sapType: 'ROH',
    basket: null,
    tail: true,
    reason: 'no free benchmark — crop-specific, supplier-quoted',
  },

  // MG-06 · Botanical extracts & functional
  {
    id: 'sc-plant-extracts',
    name: 'Plant extracts (glycol/water base)',
    group: 'MG-06',
    sapType: 'ROH',
    basket: null,
    tail: true,
    reason: 'partially modelable — carrier has a proxy but the botanical active is tail',
  },
  {
    id: 'sc-preservatives',
    name: 'Preservatives (phenoxyethanol etc.)',
    group: 'MG-06',
    sapType: 'ROH',
    materialClass: 'RM_PETRO',
    basis: 'international',
    basket: [comp('phenol', 0.65, 'phenol/petro — direction-only proxy')],
  },

  // MG-20 · Rigid plastic packaging  (closures live in MG-21, below)
  {
    id: 'sc-pet-bottle',
    name: 'PET bottles/jars',
    group: 'MG-20',
    sapType: 'VERP',
    materialClass: 'PM_PLASTIC',
    basis: 'international',
    basket: [comp('pet_resin', 0.8, 'resin decouples from crude via PTA/MEG')],
  },
  {
    id: 'sc-pp-cap',
    name: 'PP caps/closures',
    // CP-2 · 2B-1 (R-1) — MOVED MG-20 -> MG-21. `MG-21` means CLOSURES
    // everywhere now (registry: `sdc/materialGroups.ts`), and leaving the
    // taxonomy's own closure basket in the rigid-plastic group would have left
    // `MG-COLLISION-21-01` running in the other direction: a PP cap MG-20 here,
    // a flip-top cap MG-21 in the master. Same functional class, two groups.
    group: 'MG-21',
    sapType: 'VERP',
    materialClass: 'PM_PLASTIC',
    basis: 'international',
    basket: [comp('polypropylene', 0.8, 'polyolefin, direction-only spot')],
  },
  {
    id: 'sc-hdpe-tube',
    name: 'HDPE/LDPE tubes & bottles',
    group: 'MG-20',
    sapType: 'VERP',
    materialClass: 'PM_PLASTIC',
    basis: 'international',
    basket: [comp('polyethylene', 0.8, 'polyolefin')],
  },
  {
    id: 'sc-airless-pump',
    name: 'Airless pump systems (multi-component)',
    // CP-2 · 2B-1 — LEFT AT MG-20 ON PURPOSE, and it is an OPEN QUESTION rather
    // than a settled one (`MG-AIRLESS-AXIS-01`). A dispensing pump is arguably a
    // closure (MG-21) and arguably a multi-component rigid-plastic assembly
    // (MG-20); its own basket carries spring steel, so it is not purely either.
    // The status quo is not an answer — it is the absence of one, recorded so
    // the next reader does not mistake silence for a ruling.
    group: 'MG-20',
    sapType: 'VERP',
    materialClass: 'PM_PLASTIC',
    basis: 'international',
    basket: [comp('polypropylene', 0.5), comp('steel_lme', 0.2, 'spring steel; multi-material assembly')],
  },

  // MG-25 · Glass packaging  (was MG-21 — see R-1 below)
  {
    id: 'sc-glass-bottle',
    name: 'Glass bottles/jars',
    // CP-2 · 2B-1 (R-1) — MOVED MG-21 -> MG-25. The master declared MG-21 =
    // closures; this file declared it = glass. DECLARED OWNERSHIP DECIDES (the
    // rule that settled every B2a code collision), so glass moved rather than
    // the master. One edit against ONE member here, versus a change to ratified
    // seed data there.
    group: 'MG-25',
    sapType: 'VERP',
    materialClass: 'PM_GLASS',
    basis: 'international',
    basket: [comp('natural_gas', 0.4, 'energy-intensive; gas-linked'), comp('soda_ash', 0.3)],
  },

  // MG-22 · Metal packaging
  {
    id: 'sc-aluminium-tube',
    name: 'Aluminium tubes / aerosol cans',
    group: 'MG-22',
    sapType: 'VERP',
    materialClass: 'PM_METAL',
    basis: 'international',
    basket: [comp('aluminium_lme', 0.7, 'LME free delayed feed')],
  },
  {
    id: 'sc-tinplate',
    name: 'Tinplate components',
    group: 'MG-22',
    sapType: 'VERP',
    materialClass: 'PM_METAL',
    basis: 'international',
    basket: [comp('steel_lme', 0.65, 'LME')],
  },

  // MG-23 · Paper & board packaging
  {
    id: 'sc-folding-carton',
    name: 'Folding cartons (cartonboard)',
    group: 'MG-23',
    sapType: 'VERP',
    materialClass: 'PM_PAPER',
    basis: 'international',
    basket: [comp('pulp_paper_ppi', 0.7, 'free PPI proxy')],
  },
  {
    id: 'sc-label',
    name: 'Labels (paper/film)',
    group: 'MG-23',
    sapType: 'VERP',
    materialClass: 'PM_PAPER',
    basis: 'international',
    basket: [comp('pulp_paper_ppi', 0.5), comp('bopp_pet_film', 0.3, 'mixed substrate')],
  },
  {
    id: 'sc-shipper-box',
    name: 'Shipper boxes (corrugated)',
    group: 'MG-23',
    sapType: 'VERP',
    materialClass: 'PM_PAPER',
    basis: 'international',
    basket: [comp('pulp_paper_ppi', 0.7, 'free PPI proxy')],
  },
  {
    id: 'sc-leaflet',
    name: 'Leaflets/inserts',
    group: 'MG-23',
    sapType: 'VERP',
    materialClass: 'PM_PAPER',
    basis: 'international',
    basket: [comp('pulp_paper_ppi', 0.75, 'free PPI proxy')],
  },

  // MG-24 · Flexible packaging
  {
    id: 'sc-sachet',
    name: 'Sachets / laminate film',
    group: 'MG-24',
    sapType: 'VERP',
    materialClass: 'PM_PLASTIC',
    basis: 'international',
    basket: [comp('bopp_pet_film', 0.65), comp('aluminium_foil', 0.15, 'multi-layer')],
  },
];
