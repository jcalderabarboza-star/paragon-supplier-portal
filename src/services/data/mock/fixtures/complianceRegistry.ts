// ════════════════════════════════════════════════════════════════════════════
// ⚠️  SYNTHETIC — ILLUSTRATIVE COMPLIANCE DATA. NOT A REAL CERTIFICATE REGISTRY. ⚠️
// ════════════════════════════════════════════════════════════════════════════
//
// This is the single most sensitive fixture in the build: it stands in for halal
// certificate data governed by a hard legal deadline (17 Oct 2026, GR 42/2024,
// BPJPH). It is HONESTLY SYNTHETIC — but ⚠️ **WHERE THE HONESTY LIVES CHANGED AT
// THE SEAM BATCH, DELIBERATELY, AND THIS IS THE PART TO READ BEFORE EDITING.**
//
// ── WHAT THE OLD DEVICE WAS, AND WHY IT WAS RETIRED ────────────────────────
//   Every material code here used to be an `RM-SAMPLE-…` placeholder that
//   matched NOTHING in `MATERIAL_MASTER`. That was a deliberate honesty device:
//   nothing could read as real certificate tracking because nothing could JOIN.
//
//   ⚠️ **IT ALSO MADE THE CAPABILITY STRUCTURALLY INERT, AND THAT WAS THE
//   LARGER DISHONESTY.** The compliance page and the receipt gate
//   (`verifyHalalAtReceipt`) look at the same certificates through two
//   vocabularies that could never intersect: measured at the seam batch, the
//   intersection with the receivable ASN lines was EMPTY, so the gate returned
//   `NO_CERT` for **every real material in the tree** and a certificate expiring
//   on the compliance page was invisible to the receipt gate for that material.
//   A surface that cannot be wrong because it cannot be reached is not honest;
//   it is unfalsifiable. Operator ruling (seam batch): the two lanes share ONE
//   vocabulary, and the fabrication moves to where a reviewer reads it.
//
// ── WHERE THE HONESTY LIVES NOW — THREE LAYERS, STATED ─────────────────────
//   1. **SUPPLIERS ARE THE PLATFORM'S REAL ROSTER, AND THE ROSTER IS ITSELF
//      HONESTLY FICTIONAL.** `supplierId` + `supplierName` are now taken from
//      `mockSuppliers.ts` verbatim — `PT Sample Specialty Fats`, `PT Sample
//      Packaging Indonesia`, `Sample Personal Care Emulsifiers GmbH`. No real
//      company is ever named. The registry previously invented a SECOND name for
//      the same supplier id (`sup-007` was `Sample Fragrance House
//      (illustrative)` here and `PT Sample Packaging Indonesia` in the roster),
//      which was not an honesty device — it was a defect.
//   2. **MATERIAL CODES ARE REAL `MATERIAL_MASTER` CODES**, and each row's codes
//      are ones THAT SUPPLIER ACTUALLY TRANSACTS (derived from the PO / ASN /
//      shipment fixtures, not chosen). Halal-class certs sit only on materials
//      whose master row says `halalApplicable: 'REQUIRED'`.
//   3. ⚠️ **THE CERTIFICATE HOLDINGS THEMSELVES ARE FABRICATED, AND THAT IS NOW
//      THE ONLY FICTION LEFT — SO IT IS MARKED THREE WAYS AND NOT ONE.** Every
//      `certNumber` is a `SAMPLE-…` token, never a real BPJPH/BPOM/ISO number;
//      every `issuer` is `"(illustrative)"` and NO real certifying body is ever
//      named (an imported scheme is only ever "Foreign scheme body
//      (illustrative)"); and the structural marker is the authority: the
//      LivenessRegistry derives `compliance` → SIMULATED (no wired
//      CommandTarget) AND holds it HARVEST-GATED (`LIVENESS-DATASOURCE-01`), so
//      every surface reading this renders an amber "Sample — awaiting Track-R
//      harvest". **WHICH SUPPLIER HOLDS WHICH CERTIFICATE IS INVENTED. The
//      supplier and the material are real; the certificate is not.**
//
//   ⚠️ **DO NOT REINSTATE A PLACEHOLDER NAMESPACE TO "RESTORE" HONESTY.** It
//   would re-break the seam and re-inert the gate. The honesty budget is spent
//   on (3) and on the marker, on purpose.
//
// ── WHAT A REVIEWER SHOULD CHECK ───────────────────────────────────────────
//   That no row names a real company, a real certificate number, or a real
//   certifying body — and that the marker still says SIMULATED. Those are the
//   invariants. The supplier×material pairs are deliberately real.
//
// Grain (the Spine): supplier × raw-material × certificate. Clock-derived status
// and `daysRemaining` are NOT stored here (law 0.5) — only `lifecycleState` +
// `expiryDate`; the display status is computed in `complianceProjection.ts`.
//
// ⚠️ **THE DATES ARE HARDCODED LITERALS AND THE STATUSES ARE COMPUTED. BOTH ARE
// TRUE AND THEY ARE NOT IN TENSION.** The projection reads a real clock, so the
// buckets are always correct FOR THESE DATES; the dates themselves are frozen,
// so the portfolio ages. The seam batch preserved the authored distribution
// bit-for-bit (no date and no `lifecycleState` was touched), and re-recorded the
// standing consequence: on **2026-10-17**, the BPJPH mandate date, the four
// `Expiring` rows have all expired and that bucket goes to **ZERO**. The
// I3.3 design property below ("≥2 exemplars of every computed display status")
// is therefore TRUE TODAY AND VOID ON THE MANDATE DATE, and no test asserts it.
//
// I3.3 — simulation DEPTH. A 16-row portfolio within the 3 tenants
// (sup-002/005/007; the scoping guard holds):
//   • all 6 certTypes (incl. HALAL_FOREIGN — the imported-raw-material case) and
//     all 6 material categories (incl. contract-mfg);
//   • one dense multi-cert portfolio per supplier; one cert covering >1 material;
//   • ≥2 exemplars of every computed display status, so KPIs/filters read plural
//     (see the mandate-date caveat above).
// ════════════════════════════════════════════════════════════════════════════

import type { ComplianceRegistryEntry } from '../../types';

export const COMPLIANCE_REGISTRY: readonly ComplianceRegistryEntry[] = [
  // ── sup-007 — dense portfolio (5 certs across schemes / states / clocks) ──────
  // A Valid BPJPH cert on the permanent basis (no expiry clock).
  {
    id: 'creg-0001',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    materialCodes: ['FR-ROUD-4470'],
    materialCategory: 'fragrance',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0007A',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2025-01-15',
    expiryDate: null, // permanent basis (GR 42/2024) — no clock
    lifecycleState: 'Valid',
    scopeText: 'Fragrance Concentrate — Rose Oud (FR-ROUD-4470)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A MUI-legacy cert whose own dates say Valid, but the scheme no longer satisfies
  // the mandate after 17 Oct 2026 (ISSUER-BLIND mechanism).
  {
    id: 'creg-0002',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    materialCodes: ['AI-NIAC-6612'],
    materialCategory: 'actives',
    certType: 'HALAL_MUI_LEGACY',
    certNumber: 'SAMPLE-HALAL-0007B',
    issuer: 'MUI legacy (illustrative)',
    issueDate: '2024-06-01',
    expiryDate: '2027-06-01',
    lifecycleState: 'Valid',
    scopeText: 'Active Emulsion — Niacinamide 5% — legacy MUI scheme, BPJPH migration pending',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A foreign-scheme halal cert on an IMPORTED botanical — covers TWO material
  // codes (the multi-material grain the `string[]` invites). Domestic recognition
  // pending; still scheme-valid (only MUI-legacy is mandate-blind).
  {
    id: 'creg-0007',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    materialCodes: ['AI-HYALU-6615'],
    materialCategory: 'actives',
    certType: 'HALAL_FOREIGN',
    certNumber: 'SAMPLE-HALAL-FRGN-0007C',
    issuer: 'Foreign scheme body (illustrative)',
    issueDate: '2024-03-01',
    expiryDate: '2028-03-01',
    lifecycleState: 'Valid',
    scopeText: 'Imported active emulsion — foreign halal scheme (recognition pending)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A non-halal "OTHER" cert (e.g. GMP scope) nearing expiry → clock-projects Expiring.
  {
    id: 'creg-0008',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    materialCodes: ['PK-ALCP-2450'],
    materialCategory: 'other',
    certType: 'OTHER',
    certNumber: 'SAMPLE-GMP-0007D',
    issuer: 'Certification body (illustrative)',
    issueDate: '2023-08-20',
    expiryDate: '2026-08-20',
    lifecycleState: 'Valid',
    scopeText: 'GMP scope — closure component manufacturing (illustrative)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A BPOM notification under review (own KPI semantics; not remind-eligible).
  {
    id: 'creg-0009',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    materialCodes: ['PK-PETB-8804'],
    materialCategory: 'other',
    certType: 'BPOM',
    certNumber: 'SAMPLE-BPOM-0007E',
    issuer: 'BPOM (illustrative)',
    issueDate: null,
    expiryDate: null,
    lifecycleState: 'Under Review',
    scopeText: 'Product notification in review (illustrative)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },

  // ── sup-002 — dense portfolio (6 certs) ──────────────────────────────────────
  // A Valid cert nearing expiry (clock-projects to Expiring/Expired at read time).
  {
    id: 'creg-0003',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCodes: ['RM-PSTN-7150'],
    materialCategory: 'other',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0002A',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2022-09-15',
    expiryDate: '2026-09-15',
    lifecycleState: 'Valid',
    scopeText: 'RBD Palm Stearin — specialty fat, cert nearing renewal window',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A BPOM notification under review (UNDERREVIEW mechanism).
  {
    id: 'creg-0004',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCodes: ['RM-EMUL-9410'],
    materialCategory: 'emulsifiers',
    certType: 'BPOM',
    certNumber: 'SAMPLE-BPOM-0002B',
    issuer: 'BPOM (illustrative)',
    issueDate: null,
    expiryDate: null,
    lifecycleState: 'Under Review',
    scopeText: 'Emulsifier notification in review',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A Valid BPJPH cert on the permanent basis (no clock).
  {
    id: 'creg-0010',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCodes: ['RM-EMUL-9410'],
    materialCategory: 'emulsifiers',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0002C',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2025-02-10',
    expiryDate: null,
    lifecycleState: 'Valid',
    scopeText: 'Glyceryl Stearate SE — BPJPH permanent basis',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // An ISO cert on a toll-manufacturing (contract-mfg) scope, already past expiry
  // → clock-projects Expired.
  {
    id: 'creg-0011',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCodes: ['RM-MYRST-7310'],
    materialCategory: 'contract-mfg',
    certType: 'ISO',
    certNumber: 'SAMPLE-ISO-0002D',
    issuer: 'Certification body (illustrative)',
    issueDate: '2021-11-30',
    expiryDate: '2024-11-30',
    lifecycleState: 'Valid',
    scopeText: 'Toll-manufacturing quality scope (chain-of-custody)',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A MUI-legacy cert on a botanical, nearing expiry → Expiring (and mandate-blind
  // once the clock passes 17 Oct 2026).
  {
    id: 'creg-0012',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCodes: ['RM-MYRST-7310'],
    materialCategory: 'botanicals',
    certType: 'HALAL_MUI_LEGACY',
    certNumber: 'SAMPLE-HALAL-0002E',
    issuer: 'MUI legacy (illustrative)',
    issueDate: '2022-09-30',
    expiryDate: '2026-09-30',
    lifecycleState: 'Valid',
    scopeText: 'Myristic Acid — palm-derived, legacy MUI scheme, BPJPH migration pending',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A required halal cert that is simply Missing (born state; no expiry).
  {
    id: 'creg-0013',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCodes: ['RM-STEAR-7300'],
    materialCategory: 'other',
    certType: 'HALAL_BPJPH',
    certNumber: '',
    issuer: '',
    issueDate: null,
    expiryDate: null, // unknown — never guessed
    lifecycleState: 'Missing',
    scopeText: 'Stearic acid requiring halal certification — none held',
    notes: 'Synthetic illustrative record — required cert not yet supplied.',
  },

  // ── sup-005 — portfolio (5 certs) ────────────────────────────────────────────
  // A Valid ISO cert already past expiry (clock-projects to Expired).
  {
    id: 'creg-0005',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    materialCodes: ['AI-NIAC-6601'],
    materialCategory: 'actives',
    certType: 'ISO',
    certNumber: 'SAMPLE-ISO-0005A',
    issuer: 'Certification body (illustrative)',
    issueDate: '2022-04-30',
    expiryDate: '2025-04-30',
    lifecycleState: 'Valid',
    scopeText: 'Quality management scope',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A required halal cert that is simply Missing (born state; no expiry).
  {
    id: 'creg-0006',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    materialCodes: ['AI-PANTO-6640'],
    materialCategory: 'actives',
    certType: 'HALAL_BPJPH',
    certNumber: '',
    issuer: '',
    issueDate: null,
    expiryDate: null, // unknown — never guessed
    lifecycleState: 'Missing',
    scopeText: 'Active ingredient requiring halal certification — none held',
    notes: 'Synthetic illustrative record — required cert not yet supplied.',
  },
  // A Valid BPOM notification on the permanent basis (registered; no clock).
  {
    id: 'creg-0014',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    materialCodes: ['AI-HYALU-6610'],
    materialCategory: 'actives',
    certType: 'BPOM',
    certNumber: 'SAMPLE-BPOM-0005C',
    issuer: 'BPOM (illustrative)',
    issueDate: '2024-05-01',
    expiryDate: null,
    lifecycleState: 'Valid',
    scopeText: 'Active ingredient notification — registered',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A Valid BPJPH cert nearing its renewal window → Expiring.
  {
    id: 'creg-0015',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    materialCodes: ['AI-NIAC-6601', 'RM-EMUL-3320'],
    materialCategory: 'emulsifiers',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-HALAL-0005B',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2022-08-31',
    expiryDate: '2026-08-31',
    lifecycleState: 'Valid',
    scopeText: 'Niacinamide + Cetearyl Alcohol — one cert, two materials; nearing renewal window',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
  // A foreign-scheme halal cert on an imported fragrance, already lapsed → Expired.
  {
    id: 'creg-0016',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    materialCodes: ['RM-EMUL-9440'],
    materialCategory: 'emulsifiers',
    certType: 'HALAL_FOREIGN',
    certNumber: 'SAMPLE-HALAL-FRGN-0005C',
    issuer: 'Foreign scheme body (illustrative)',
    issueDate: '2021-08-01',
    expiryDate: '2025-08-01',
    lifecycleState: 'Valid',
    scopeText: 'Sample Blend PF-20 Emulsifier — imported, foreign scheme lapsed',
    notes: 'Synthetic illustrative record — not a real certificate.',
  },
];
