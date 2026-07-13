// ────────────────────────────────────────────────────────────────────────────
// Compliance view derivations (I3.2 — surface re-point).
//
// The canonical `ComplianceRegistryEntry` (DTO-v2) deliberately does NOT carry
// the legacy page's decorative facets (`category`, `priority`, free-text
// `action`). This module derives the two the re-pointed page still shows —
// `category` (from the certificate scheme) and a DESCRIPTIVE action label — as
// pure functions of the DTO. No fabrication: where the DTO carries no source
// (e.g. ISO 9001 vs 14001), the derivation stays coarse rather than invent one.
// ────────────────────────────────────────────────────────────────────────────

import type { CertType, ComplianceDisplayStatus } from '../services/data/types';

/** Coarse cert category for the page's category facet. */
export type CertCategory = 'Halal' | 'Quality' | 'Regulatory' | 'Other';

/** Category derived from the certificate SCHEME (`certType`). HALAL_* → Halal,
 *  BPOM → Regulatory, ISO → Quality, OTHER → Other. Deliberately NO
 *  'Environmental': the DTO carries no field to distinguish ISO 14001 from 9001,
 *  and we do not fabricate one (D4). */
export function certCategory(certType: CertType): CertCategory {
  switch (certType) {
    case 'HALAL_BPJPH':
    case 'HALAL_MUI_LEGACY':
    case 'HALAL_FOREIGN':
      return 'Halal';
    case 'BPOM':
      return 'Regulatory';
    case 'ISO':
      return 'Quality';
    case 'OTHER':
      return 'Other';
  }
}

/** i18n key for the certificate-scheme label shown in the Certificate column. */
export function certTypeLabelKey(certType: CertType): string {
  return `compliance.certType.${certType}`;
}

/** i18n key for a DESCRIPTIVE action label keyed on the computed display status.
 *  The labels NAME the state ("Renewal due", "Under review") — they never offer
 *  an imperative action the SIMULATED cert cannot back (D4 binding / F0.2
 *  principle: don't offer an action the data can't earn). */
export function actionLabelKey(status: ComplianceDisplayStatus): string {
  switch (status) {
    case 'Expired':
      return 'compliance.action.state.expired';
    case 'Expiring':
      return 'compliance.action.state.expiring';
    case 'Missing':
      return 'compliance.action.state.missing';
    case 'Under Review':
      return 'compliance.action.state.underReview';
    case 'Valid':
      return 'compliance.action.state.valid';
  }
}
