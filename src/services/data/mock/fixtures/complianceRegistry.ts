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
//   • The rows are seeded from the reconciled cert STORY (one of each lifecycle /
//     clock / scheme case), to prove the surface — never to imply real tracking.
//
// Nothing here reads as a real record. The UI honesty marker is STRUCTURAL and
// separate: the LivenessRegistry derives `compliance` → SIMULATED (no wired
// CommandTarget), so any surface reading this renders an amber "Sample" pill. We
// never imply real compliance tracking pre-harvest — the real registry lands with
// the Track-R harvest (R0.1), which flips this capability SIMULATED → LIVE.
//
// Grain (the Spine): supplier × raw-material × certificate. Clock-derived status
// and `daysRemaining` are NOT stored here (law 0.5) — only `lifecycleState` +
// `expiryDate`; the display status is computed in `complianceProjection.ts`.
// ════════════════════════════════════════════════════════════════════════════

import type { ComplianceRegistryEntry } from '../../types';

export const COMPLIANCE_REGISTRY: readonly ComplianceRegistryEntry[] = [
  // sup-007 — a Valid BPJPH cert on the permanent basis (no expiry clock).
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
  // sup-007 — a MUI-legacy cert whose own dates say Valid, but the scheme no
  // longer satisfies the mandate after 17 Oct 2026 (ISSUER-BLIND mechanism).
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
  // sup-002 — a Valid cert nearing expiry (clock-projects to Expiring/Expired
  // depending on read-time `now`; the projection derives it, nothing is stored).
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
  // sup-002 — a BPOM notification under review (own KPI semantics, not remind-
  // eligible; UNDERREVIEW mechanism).
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
  // sup-005 — a Valid cert already past expiry (clock-projects to Expired).
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
  // sup-005 — a required halal cert that is simply Missing (born state; no expiry).
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
];
