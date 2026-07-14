// ════════════════════════════════════════════════════════════════════════════
// ⚠️  SYNTHETIC — ILLUSTRATIVE COMPLIANCE DATA. NOT A REAL CERTIFICATE REGISTRY. ⚠️
// ════════════════════════════════════════════════════════════════════════════
//
// This is the single most sensitive fixture in the build: it stands in for halal
// certificate data governed by a hard legal deadline (17 Oct 2026, GR 42/2024,
// BPJPH). It is therefore HONESTLY SYNTHETIC by construction:
//
//   • Every supplier name is an obvious placeholder ("Sample … (illustrative)").
//   • Every cert number is a `SAMPLE-…` token, NOT a real BPJPH/BPOM/ISO number.
//   • Material codes are `RM-SAMPLE-…` placeholders.
//   • Every issuer is "(illustrative)" — NO real certifying body is ever named
//     (no BPJPH/MUI/BPOM number, and NO real foreign halal body — an imported
//     scheme is only ever "Foreign scheme body (illustrative)").
//   • The rows are seeded from the reconciled cert STORY (each lifecycle / clock /
//     scheme case, at portfolio density) to prove the surface — never to imply
//     real tracking.
//
// Nothing here reads as a real record. The UI honesty marker is STRUCTURAL and
// separate: the LivenessRegistry derives `compliance` → SIMULATED (no wired
// CommandTarget) AND holds it harvest-gated (LIVENESS-DATASOURCE-01), so any
// surface reading this renders an amber "Sample — awaiting Track-R harvest" marker.
// We never imply real compliance tracking pre-harvest — the real registry lands
// with the Track-R harvest (R0.1), which is what flips this capability toward LIVE.
//
// Grain (the Spine): supplier × raw-material × certificate. Clock-derived status
// and `daysRemaining` are NOT stored here (law 0.5) — only `lifecycleState` +
// `expiryDate`; the display status is computed in `complianceProjection.ts`.
//
// I3.3 — simulation DEPTH. Enriched from the 6-row one-of-each seed to a ~16-row
// portfolio within the 3 tenants (sup-002/005/007; the scoping guard holds):
//   • all 6 certTypes (incl. HALAL_FOREIGN — the imported-raw-material case, the
//     highest-value grain given the ~95%-imported input base) and all 6 material
//     categories (incl. contract-mfg — toll-manufacturing chain-of-custody);
//   • one dense multi-cert portfolio per supplier; one cert covering >1 material;
//   • ≥2 exemplars of every computed display status, so KPIs/filters read plural.
// The enrichment adds DEPTH, never realness — every row above stays loudly synthetic.
// ════════════════════════════════════════════════════════════════════════════

import type { ComplianceRegistryEntry } from '../../types';

export const COMPLIANCE_REGISTRY: readonly ComplianceRegistryEntry[] = [
  // ── sup-007 — dense portfolio (5 certs across schemes / states / clocks) ──────
  // A Valid BPJPH cert on the permanent basis (no expiry clock).
  {
    id: 'creg-0001',
    supplierId: 'sup-007',
    supplierName: 'Sample Fragrance House (illustrative)',
    materialCodes: ['RM-SAMPLE-FRG-01'],
    materialCategory: 'fragrance',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0007A',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2025-01-15',
    expiryDate: null, // permanent basis (GR 42/2024) — no clock
    certBasis: 'permanent',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Fragrance compounds for personal-care lines',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A MUI-legacy cert whose own dates say Valid, but the scheme no longer satisfies
  // the mandate after 17 Oct 2026 (ISSUER-BLIND mechanism).
  {
    id: 'creg-0002',
    supplierId: 'sup-007',
    supplierName: 'Sample Fragrance House (illustrative)',
    materialCodes: ['RM-SAMPLE-FRG-02'],
    materialCategory: 'fragrance',
    certType: 'HALAL_MUI_LEGACY',
    certNumber: 'SAMPLE-HALAL-0007B',
    issuer: 'MUI legacy (illustrative)',
    issueDate: '2024-06-01',
    expiryDate: '2027-06-01',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Botanical extract — legacy scheme, migration pending',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A foreign-scheme halal cert on an IMPORTED botanical — covers TWO material
  // codes (the multi-material grain the `string[]` invites). Domestic recognition
  // pending; still scheme-valid (only MUI-legacy is mandate-blind).
  {
    id: 'creg-0007',
    supplierId: 'sup-007',
    supplierName: 'Sample Fragrance House (illustrative)',
    materialCodes: ['RM-SAMPLE-BOT-01', 'RM-SAMPLE-BOT-02'],
    materialCategory: 'botanicals',
    certType: 'HALAL_FOREIGN',
    certNumber: 'SAMPLE-HALAL-FRGN-0007C',
    issuer: 'Foreign scheme body (illustrative)',
    issueDate: '2024-03-01',
    expiryDate: '2028-03-01',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Imported botanical extract — foreign halal scheme (recognition pending)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A non-halal "OTHER" cert (e.g. GMP scope) nearing expiry → clock-projects Expiring.
  {
    id: 'creg-0008',
    supplierId: 'sup-007',
    supplierName: 'Sample Fragrance House (illustrative)',
    materialCodes: ['RM-SAMPLE-OTH-01'],
    materialCategory: 'other',
    certType: 'OTHER',
    certNumber: 'SAMPLE-GMP-0007D',
    issuer: 'Certification body (illustrative)',
    issueDate: '2023-08-20',
    expiryDate: '2026-08-20',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: false,
    scopeText: 'GMP scope — general manufacturing (illustrative)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A BPOM notification under review (own KPI semantics; not remind-eligible).
  {
    id: 'creg-0009',
    supplierId: 'sup-007',
    supplierName: 'Sample Fragrance House (illustrative)',
    materialCodes: ['RM-SAMPLE-ACT-07'],
    materialCategory: 'actives',
    certType: 'BPOM',
    certNumber: 'SAMPLE-BPOM-0007E',
    issuer: 'BPOM (illustrative)',
    issueDate: null,
    expiryDate: null,
    certBasis: 'permanent',
    lifecycleState: 'Under Review',
    requiredForHalalBrands: false,
    scopeText: 'Active ingredient notification in review',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },

  // ── sup-002 — dense portfolio (6 certs) ──────────────────────────────────────
  // A Valid cert nearing expiry (clock-projects to Expiring/Expired at read time).
  {
    id: 'creg-0003',
    supplierId: 'sup-002',
    supplierName: 'Sample Emulsifiers Co. (illustrative)',
    materialCodes: ['RM-SAMPLE-EMU-01'],
    materialCategory: 'emulsifiers',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0002A',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2022-09-15',
    expiryDate: '2026-09-15',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Emulsifier grade for creams',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A BPOM notification under review (UNDERREVIEW mechanism).
  {
    id: 'creg-0004',
    supplierId: 'sup-002',
    supplierName: 'Sample Emulsifiers Co. (illustrative)',
    materialCodes: ['RM-SAMPLE-EMU-02'],
    materialCategory: 'emulsifiers',
    certType: 'BPOM',
    certNumber: 'SAMPLE-BPOM-0002B',
    issuer: 'BPOM (illustrative)',
    issueDate: null,
    expiryDate: null,
    certBasis: 'permanent',
    lifecycleState: 'Under Review',
    requiredForHalalBrands: false,
    scopeText: 'Notification in review',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A Valid BPJPH cert on the permanent basis (no clock).
  {
    id: 'creg-0010',
    supplierId: 'sup-002',
    supplierName: 'Sample Emulsifiers Co. (illustrative)',
    materialCodes: ['RM-SAMPLE-EMU-10'],
    materialCategory: 'emulsifiers',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0002C',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2025-02-10',
    expiryDate: null,
    certBasis: 'permanent',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Emulsifier grade — BPJPH permanent basis',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // An ISO cert on a toll-manufacturing (contract-mfg) scope, already past expiry
  // → clock-projects Expired.
  {
    id: 'creg-0011',
    supplierId: 'sup-002',
    supplierName: 'Sample Emulsifiers Co. (illustrative)',
    materialCodes: ['RM-SAMPLE-CMF-01'],
    materialCategory: 'contract-mfg',
    certType: 'ISO',
    certNumber: 'SAMPLE-ISO-0002D',
    issuer: 'Certification body (illustrative)',
    issueDate: '2021-11-30',
    expiryDate: '2024-11-30',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: false,
    scopeText: 'Toll-manufacturing quality scope (chain-of-custody)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A MUI-legacy cert on a botanical, nearing expiry → Expiring (and mandate-blind
  // once the clock passes 17 Oct 2026).
  {
    id: 'creg-0012',
    supplierId: 'sup-002',
    supplierName: 'Sample Emulsifiers Co. (illustrative)',
    materialCodes: ['RM-SAMPLE-BOT-12'],
    materialCategory: 'botanicals',
    certType: 'HALAL_MUI_LEGACY',
    certNumber: 'SAMPLE-HALAL-0002E',
    issuer: 'MUI legacy (illustrative)',
    issueDate: '2022-09-30',
    expiryDate: '2026-09-30',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Botanical extract — legacy MUI scheme, BPJPH migration pending',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A required halal cert that is simply Missing (born state; no expiry).
  {
    id: 'creg-0013',
    supplierId: 'sup-002',
    supplierName: 'Sample Emulsifiers Co. (illustrative)',
    materialCodes: ['RM-SAMPLE-ACT-13'],
    materialCategory: 'actives',
    certType: 'HALAL_BPJPH',
    certNumber: '',
    issuer: '',
    issueDate: null,
    expiryDate: null, // unknown — never guessed
    certBasis: 'permanent',
    lifecycleState: 'Missing',
    requiredForHalalBrands: true,
    scopeText: 'Active ingredient requiring halal certification',
    notes: 'Synthetic illustrative record — required cert not yet supplied.',
  },

  // ── sup-005 — portfolio (5 certs) ────────────────────────────────────────────
  // A Valid ISO cert already past expiry (clock-projects to Expired).
  {
    id: 'creg-0005',
    supplierId: 'sup-005',
    supplierName: 'Sample Actives Ltd. (illustrative)',
    materialCodes: ['RM-SAMPLE-ACT-01'],
    materialCategory: 'actives',
    certType: 'ISO',
    certNumber: 'SAMPLE-ISO-0005A',
    issuer: 'Certification body (illustrative)',
    issueDate: '2022-04-30',
    expiryDate: '2025-04-30',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: false,
    scopeText: 'Quality management scope',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A required halal cert that is simply Missing (born state; no expiry).
  {
    id: 'creg-0006',
    supplierId: 'sup-005',
    supplierName: 'Sample Actives Ltd. (illustrative)',
    materialCodes: ['RM-SAMPLE-ACT-02'],
    materialCategory: 'actives',
    certType: 'HALAL_BPJPH',
    certNumber: '',
    issuer: '',
    issueDate: null,
    expiryDate: null, // unknown — never guessed
    certBasis: 'permanent',
    lifecycleState: 'Missing',
    requiredForHalalBrands: true,
    scopeText: 'Active ingredient requiring halal certification',
    notes: 'Synthetic illustrative record — required cert not yet supplied.',
  },
  // A Valid BPOM notification on the permanent basis (registered; no clock).
  {
    id: 'creg-0014',
    supplierId: 'sup-005',
    supplierName: 'Sample Actives Ltd. (illustrative)',
    materialCodes: ['RM-SAMPLE-EMU-14'],
    materialCategory: 'emulsifiers',
    certType: 'BPOM',
    certNumber: 'SAMPLE-BPOM-0005C',
    issuer: 'BPOM (illustrative)',
    issueDate: '2024-05-01',
    expiryDate: null,
    certBasis: 'permanent',
    lifecycleState: 'Valid',
    requiredForHalalBrands: false,
    scopeText: 'Emulsifier notification — registered',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A Valid BPJPH cert nearing its renewal window → Expiring.
  {
    id: 'creg-0015',
    supplierId: 'sup-005',
    supplierName: 'Sample Actives Ltd. (illustrative)',
    materialCodes: ['RM-SAMPLE-ACT-15'],
    materialCategory: 'actives',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0005B',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2022-08-31',
    expiryDate: '2026-08-31',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Active ingredient — cert nearing renewal window',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A foreign-scheme halal cert on an imported fragrance, already lapsed → Expired.
  {
    id: 'creg-0016',
    supplierId: 'sup-005',
    supplierName: 'Sample Actives Ltd. (illustrative)',
    materialCodes: ['RM-SAMPLE-FRG-16'],
    materialCategory: 'fragrance',
    certType: 'HALAL_FOREIGN',
    certNumber: 'SAMPLE-HALAL-FRGN-0005C',
    issuer: 'Foreign scheme body (illustrative)',
    issueDate: '2021-08-01',
    expiryDate: '2025-08-01',
    certBasis: 'legacy-4yr',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'Imported fragrance compound — foreign scheme lapsed',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
];
