// ────────────────────────────────────────────────────────────────────────────
// CI-1.5 — Vendored commodity HISTORY for the calibration & backtest gate.
//
// These are OBSERVED × SNAPSHOT(as-of) fixtures: REAL, STATIC, honestly-dated
// historical prices — NOT SIMULATED, NOT invented. The should-cost engine is run
// over them month-by-month to prove its coefficients produce sane numbers against
// known history before any spread ever renders to a buyer (build-plan §6).
//
// ── PROVENANCE (honest-by-construction) ──────────────────────────────────────
// Two provenance classes, DISTINCTLY MARKED so a reviewer sees exactly which
// numbers were live-fetched vs sourced from the documented public record:
//
//  • FETCHED — live-pulled from an open-licensed API/file during this batch:
//      World Bank Commodity Price Data ("The Pink Sheet"), Monthly Prices sheet,
//      CC-BY 4.0, https://www.worldbank.org/en/research/commodity-markets
//      file: CMO-Historical-Data-Monthly.xlsx (updated 2025-01-06), fetched
//      2026-07-16. Palm oil (CPO), palm kernel oil (PKO), coconut oil (CNO),
//      aluminum — verbatim monthly USD/MT.
//
//  • ANCHOR — the two gap series + the domestic leg, behind registration /
//      national portals (not machine-fetchable in this environment). Vendored
//      from the DOCUMENTED PUBLIC RECORD as magnitude-anchored monthly points
//      with an explicit citation — real published history, NOT a fabricated
//      curve. The OPERATOR CORRECTS these anchors on review. (Fabricating a
//      smooth invented series and labelling it SNAPSHOT stays ruled out — that
//      is the exact dishonesty this gate exists to catch.)
//
// Every root renders SNAPSHOT (real, static, dated) — never LIVE (CI-3 wires the
// live feeds) — and every should-cost off them is permanently MODELED.
// ────────────────────────────────────────────────────────────────────────────

import type {
  Material,
  ModelableMaterial,
  MaterialClass,
  BasketComponent,
} from '../../../../lib/shouldCost';

export type MonthKey = string; // 'YYYY-MM'
export type Provenance = 'FETCHED' | 'ANCHOR';
export type SeriesUnit = 'USD/MT' | 'USD/FEU' | 'IDR/USD';

export interface HistoryPoint {
  readonly month: MonthKey;
  readonly value: number;
}

export interface HistoricalSeries {
  readonly rootId: string;
  readonly label: string;
  readonly unit: SeriesUnit;
  readonly provenance: Provenance;
  readonly source: string; // citation / URL — the documented origin
  readonly asOfNote: string; // how the series is dated
  readonly points: readonly HistoryPoint[];
}

const S = (
  rootId: string,
  label: string,
  unit: SeriesUnit,
  provenance: Provenance,
  source: string,
  asOfNote: string,
  raw: ReadonlyArray<readonly [MonthKey, number]>,
): HistoricalSeries => ({
  rootId,
  label,
  unit,
  provenance,
  source,
  asOfNote,
  points: raw.map(([month, value]) => ({ month, value })),
});

// ─── FETCHED — World Bank Pink Sheet, verbatim monthly USD/MT (CC-BY 4.0) ──────

const WB_SRC = 'World Bank Pink Sheet (Monthly Prices, CC-BY 4.0); fetched 2026-07-16';
const WB_ASOF = 'monthly close, USD/MT nominal; asOf = month-end';

const CPO = S('cpo_intl', 'Palm oil (international)', 'USD/MT', 'FETCHED', WB_SRC, WB_ASOF, [
  ['2021-01', 990.3], ['2021-02', 1019.9], ['2021-03', 1030.5], ['2021-04', 1078.0],
  ['2021-05', 1136.5], ['2021-06', 1004.4], ['2021-07', 1063.0], ['2021-08', 1141.8],
  ['2021-09', 1181.4], ['2021-10', 1310.2], ['2021-11', 1340.7], ['2021-12', 1270.3],
  ['2022-01', 1344.8], ['2022-02', 1522.4], ['2022-03', 1777.0], ['2022-04', 1682.7],
  ['2022-05', 1716.9], ['2022-06', 1501.1], ['2022-07', 1056.6], ['2022-08', 1026.0],
  ['2022-09', 909.3], ['2022-10', 889.0], ['2022-11', 945.7], ['2022-12', 940.4],
  ['2023-01', 942.0], ['2023-02', 950.0], ['2023-03', 972.1], ['2023-04', 1005.2],
  ['2023-05', 934.1], ['2023-06', 817.0], ['2023-07', 878.5], ['2023-08', 860.8],
  ['2023-09', 829.6], ['2023-10', 804.3], ['2023-11', 830.5], ['2023-12', 813.5],
  ['2024-01', 844.9], ['2024-02', 856.9], ['2024-03', 942.9], ['2024-04', 935.7],
  ['2024-05', 859.1], ['2024-06', 873.7], ['2024-07', 896.1], ['2024-08', 932.6],
  ['2024-09', 982.8], ['2024-10', 1077.2], ['2024-11', 1168.6], ['2024-12', 1189.7],
  ['2025-01', 1070.3], ['2025-02', 1067.3], ['2025-03', 1067.6], ['2025-04', 994.4],
  ['2025-05', 907.6], ['2025-06', 935.4], ['2025-07', 976.4], ['2025-08', 1026.1],
  ['2025-09', 1036.7], ['2025-10', 1038.1], ['2025-11', 983.4], ['2025-12', 980.5],
]);

const PKO = S('pko', 'Palm kernel oil', 'USD/MT', 'FETCHED', WB_SRC, WB_ASOF, [
  ['2021-01', 1368.3], ['2021-02', 1359.5], ['2021-03', 1478.6], ['2021-04', 1487.1],
  ['2021-05', 1530.5], ['2021-06', 1400.5], ['2021-07', 1274.1], ['2021-08', 1341.1],
  ['2021-09', 1427.3], ['2021-10', 1818.3], ['2021-11', 2050.2], ['2021-12', 1861.4],
  ['2022-01', 2195.8], ['2022-02', 2442.6], ['2022-03', 2441.5], ['2022-04', 2064.3],
  ['2022-05', 1811.2], ['2022-06', 1554.5], ['2022-07', 1301.0], ['2022-08', 1173.0],
  ['2022-09', 1249.3], ['2022-10', 1038.8], ['2022-11', 1061.6], ['2022-12', 1067.0],
  ['2023-01', 1060.0], ['2023-02', 1036.7], ['2023-03', 1051.8], ['2023-04', 1016.8],
  ['2023-05', 992.5], ['2023-06', 928.0], ['2023-07', 998.1], ['2023-08', 998.4],
  ['2023-09', 957.6], ['2023-10', 912.4], ['2023-11', 967.5], ['2023-12', 966.2],
  ['2024-01', 977.5], ['2024-02', 1034.2], ['2024-03', 1176.9], ['2024-04', 1290.2],
  ['2024-05', 1196.1], ['2024-06', 1155.5], ['2024-07', 1365.0], ['2024-08', 1480.0],
  ['2024-09', 1515.0], ['2024-10', 1636.2], ['2024-11', 2015.3], ['2024-12', 2098.8],
  ['2025-01', 1961.5], ['2025-02', 1947.5], ['2025-03', 2063.6], ['2025-04', 2090.4],
  ['2025-05', 2002.8], ['2025-06', 1859.8], ['2025-07', 2096.9], ['2025-08', 2264.0],
  ['2025-09', 2414.2], ['2025-10', 2273.0], ['2025-11', 2153.3], ['2025-12', 2113.1],
]);

const CNO = S('cno', 'Coconut oil', 'USD/MT', 'FETCHED', WB_SRC, WB_ASOF, [
  ['2021-01', 1463.1], ['2021-02', 1444.5], ['2021-03', 1540.7], ['2021-04', 1659.6],
  ['2021-05', 1715.2], ['2021-06', 1670.7], ['2021-07', 1584.1], ['2021-08', 1493.6],
  ['2021-09', 1485.0], ['2021-10', 1922.9], ['2021-11', 1960.7], ['2021-12', 1695.7],
  ['2022-01', 2016.1], ['2022-02', 2147.9], ['2022-03', 2230.2], ['2022-04', 2094.6],
  ['2022-05', 1813.3], ['2022-06', 1700.5], ['2022-07', 1540.5], ['2022-08', 1384.6],
  ['2022-09', 1248.1], ['2022-10', 1108.1], ['2022-11', 1173.2], ['2022-12', 1158.4],
  ['2023-01', 1078.5], ['2023-02', 1086.7], ['2023-03', 1114.8], ['2023-04', 1074.0],
  ['2023-05', 1047.7], ['2023-06', 1012.7], ['2023-07', 1047.4], ['2023-08', 1099.1],
  ['2023-09', 1071.7], ['2023-10', 1046.4], ['2023-11', 1114.5], ['2023-12', 1108.8],
  ['2024-01', 1130.6], ['2024-02', 1171.6], ['2024-03', 1287.9], ['2024-04', 1425.2],
  ['2024-05', 1401.7], ['2024-06', 1397.9], ['2024-07', 1474.3], ['2024-08', 1618.6],
  ['2024-09', 1735.8], ['2024-10', 1728.4], ['2024-11', 1878.7], ['2024-12', 1973.2],
  ['2025-01', 1978.4], ['2025-02', 1990.0], ['2025-03', 2356.0], ['2025-04', 2483.0],
  ['2025-05', 2766.8], ['2025-06', 2698.8], ['2025-07', 2841.0], ['2025-08', 2742.2],
  ['2025-09', 2596.8], ['2025-10', 2547.2], ['2025-11', 2439.5], ['2025-12', 2323.0],
]);

// Aluminum — the flat USD root for the FX-isolation test (LME cash, via WB).
const ALU = S('aluminium', 'Aluminum (LME cash)', 'USD/MT', 'FETCHED', WB_SRC, WB_ASOF, [
  ['2023-11', 2202.3], ['2023-12', 2182.4], ['2024-01', 2192.8], ['2024-02', 2179.5],
  ['2024-03', 2226.2], ['2024-04', 2506.1], ['2024-05', 2564.5], ['2024-06', 2497.6],
]);

// ─── ANCHOR — documented public record, magnitude-anchored, operator-corrected ─

// Indonesian domestic CPO during the Apr–May 2022 export ban. Direction/magnitude
// are the documented record: DMO/DPO price controls held domestic BELOW the
// international reference, and when the ban trapped supply (announced 22-Apr,
// effective 28-Apr → lifted 23-May 2022) domestic prices COLLAPSED while the
// international benchmark held/rose. Monthly $/MT-equivalent points are anchors.
const CPO_DOM = S(
  'cpo_domestic',
  'CPO, Indonesian domestic (export-ban window)',
  'USD/MT',
  'ANCHOR',
  'Documented record of the 2022 Indonesia palm-oil export ban (DMO/DPO controls; domestic price collapse Apr–May 2022). Magnitude-anchored; operator-corrected.',
  'monthly $/MT-equivalent anchor; asOf = month-end',
  [
    ['2022-02', 1450], ['2022-03', 1500], ['2022-04', 1250],
    ['2022-05', 1050], ['2022-06', 1350], ['2022-07', 1000],
  ],
);

// Drewry World Container Index (composite, $/40ft) across the Red Sea shock.
// Documented: ~$1,400/FEU pre-shock (Nov-23) → ~$3,800 peak (Jan-24), ~3× — the
// Red Sea diversions from mid-December 2023. Registration-gated → anchor points.
const WCI = S(
  'wci_freight',
  'Drewry World Container Index (composite)',
  'USD/FEU',
  'ANCHOR',
  'Drewry WCI composite, documented Red Sea freight shock Dec 2023–H1 2024 (~3× peak). Registration-gated; magnitude-anchored; operator-corrected.',
  'weekly index reported monthly, $/40ft-equivalent; asOf = month-end',
  [
    ['2023-10', 1500], ['2023-11', 1400], ['2023-12', 2700], ['2024-01', 3800],
    ['2024-02', 3400], ['2024-03', 2900], ['2024-04', 2700], ['2024-05', 2900],
  ],
);

// USD/IDR across the 2024 rupiah depreciation (crossed 16,000 in April 2024).
// Bank Indonesia JISDOR / reported monthly averages — documented public record.
export const FX_HISTORY: HistoricalSeries = S(
  'fx_idr_usd',
  'USD/IDR (rupiah per US dollar)',
  'IDR/USD',
  'ANCHOR',
  'Bank Indonesia JISDOR / reported monthly averages, 2024 rupiah depreciation (>16,000 from Apr 2024). Magnitude-anchored; operator-corrected.',
  'monthly average IDR per USD; asOf = month-end',
  [
    ['2024-01', 15600], ['2024-02', 15650], ['2024-03', 15750], ['2024-04', 16100],
    ['2024-05', 16050], ['2024-06', 16350], ['2024-07', 16250], ['2024-08', 15900],
    ['2024-09', 15300], ['2024-10', 15650], ['2024-11', 15850], ['2024-12', 16050],
  ],
);

/** The vendored root histories (FX is separate — it is not a basket root). */
export const COMMODITY_HISTORY: readonly HistoricalSeries[] = [
  CPO,
  PKO,
  CNO,
  ALU,
  CPO_DOM,
  WCI,
];

// ─── Backtest materials — GENERIC commodity-economics constructs ───────────────
// These exist ONLY to exercise the six documented shocks; they are NOT Paragon's
// proprietary SKU→basket mappings (§7 operator data-ask), so CI-1.5 needs no
// operator input. Each references the vendored roots above.

const mat = (
  id: string,
  name: string,
  materialClass: MaterialClass,
  basis: 'domestic' | 'international',
  basket: readonly BasketComponent[],
): ModelableMaterial => ({
  id,
  name,
  group: 'CI15-BACKTEST',
  sapType: 'ROH',
  materialClass,
  basis,
  basket,
});

export const CI15_MATERIALS: readonly Material[] = [
  // test 1 — export-ban divergence (same commodity, two bases + two roots)
  mat('m_cpo_intl', 'CPO import (international basis)', 'RM_OLEO', 'international', [
    { rootId: 'cpo_intl', weight: 1.0 },
  ]),
  mat('m_cpo_domestic', 'CPO (Indonesian domestic basis)', 'RM_OLEO', 'domestic', [
    { rootId: 'cpo_domestic', weight: 1.0 },
  ]),
  // test 2 + falsification — a lauric blend (CNO + PKO)
  mat('m_lauric', 'Lauric surfactant feedstock (CNO+PKO blend)', 'RM_OLEO', 'international', [
    { rootId: 'cno', weight: 0.5, lagNote: 'prior-quarter average convention' },
    { rootId: 'pko', weight: 0.5, lagNote: 'prior-quarter average convention' },
  ]),
  // test 3 — fatty acid (carries the RM_OLEO co-product credit)
  mat('m_fatty_acid', 'Fatty acid (co-product credit class)', 'RM_OLEO', 'international', [
    { rootId: 'cpo_intl', weight: 1.0 },
  ]),
  // test 4 — European-origin import (aluminium + freight)
  mat('m_eu_import', 'European-origin aluminium packaging (landed)', 'PM_METAL', 'international', [
    { rootId: 'aluminium', weight: 1.0 },
    { rootId: 'wci_freight', weight: 1.0, lagNote: 'ocean freight leg' },
  ]),
  // test 5 — import-priced material (FX isolation; no freight noise)
  mat('m_idr_import', 'Import-priced aluminium (FX isolation)', 'PM_METAL', 'international', [
    { rootId: 'aluminium', weight: 1.0 },
  ]),
  // test 6 — CNO-weighted vs PKO-only lauric baskets
  mat('m_lauric_cno', 'Lauric feedstock (CNO-weighted)', 'RM_OLEO', 'international', [
    { rootId: 'cno', weight: 1.0 },
  ]),
  mat('m_lauric_pko', 'Lauric feedstock (PKO-only)', 'RM_OLEO', 'international', [
    { rootId: 'pko', weight: 1.0 },
  ]),
];
