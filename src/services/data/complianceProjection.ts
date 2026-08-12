// ────────────────────────────────────────────────────────────────────────────
// Compliance registry projection (I3.1 — census §4 · G1 · law 0.5).
//
// Generalizes the `invoiceProjection` pattern to the compliance registry. The
// registry STORES the lifecycle substrate only (Missing / Under Review / Valid);
// the display status (Expiring / Expired) and `daysRemaining` are COMPUTED HERE
// from `expiryDate` vs an injected `now` — never stored (DR-8 / law 0.5). This is
// the mechanism that closes HALAL-CLOCK-STATE-01: the old fixture stored BOTH
// `status` and `daysRemaining` as literals; here nothing clock-derived is stored.
//
// Scheme-aware validity (the issuer dimension the old `status === 'Valid'` check
// was blind to) is also computed here — SURFACE-READY but SIMULATED, so
// HALAL-ISSUER-BLIND-01 stays OPEN: the rule exists and the DTO carries the
// dimension, but its close needs REAL issuer data (stamping "scheme-valid"
// against synthetic certs would be the honesty violation this lane guards).
//
// Pure functions of (entry, now). No store, no clock of their own — `now` is
// injected so the projection is deterministic and testable.
// ────────────────────────────────────────────────────────────────────────────

import type { ComplianceRegistryEntry, ComplianceDisplayStatus } from './types';

/** The `YYYY-MM-DD` day of an ISO instant (lexicographic date compares work). */
function day(nowIso: string): string {
  return nowIso.slice(0, 10);
}

/** The window (days) before expiry within which a Valid cert reads `Expiring`. */
export const EXPIRING_WINDOW_DAYS = 90;

/** The BPJPH mandate date (GR 42/2024): from this day a MUI-legacy halal cert no
 *  longer satisfies the Indonesian halal mandate, regardless of its own validity.
 *
 *  ── ⚠️ THE STATUTORY FACTS, KEPT HERE BECAUSE D-A DELETED THEIR OLD HOME ────
 *  `certBasis` carried these two clock models and was READ BY NOTHING while
 *  four documents disagreed about what it meant, so it was deleted rather than
 *  reconciled. **The statute did not go with it**, and it is the part that is
 *  genuinely hard to recover — not derivable from the data, and the fixtures
 *  actively disagreed with it:
 *
 *    · A BPJPH cert (GR 42/2024) has PERMANENT VALIDITY. There is no expiry to
 *      record, which is why `expiryDate` is legitimately `null` for one.
 *    · ⚠️ A LEGACY (GR-39 / MUI) CERT'S TERM IS **ISSUANCE PLUS FOUR YEARS BY
 *      STATUTE, REGARDLESS OF WHAT THE DOCUMENT PRINTS.** The printed date is
 *      not authority; the statute is. Anything that later computes a legacy
 *      cert's expiry must derive it from `issueDate`, NOT trust `expiryDate`.
 *
 *  Recorded as knowledge, NOT re-introduced as a field: nothing reads it today,
 *  and a field nothing reads is how the last disagreement went unnoticed. */
export const BPJPH_MANDATE_DATE = '2026-10-17';

/** Whole days until `expiryDate` from `now` (negative = past expiry). `null` when
 *  the cert has no expiry — unknown (never guessed) OR a BPJPH cert, which has
 *  permanent validity under GR 42/2024 and so has no expiry to record. */
export function daysRemaining(entry: ComplianceRegistryEntry, nowIso: string): number | null {
  if (entry.expiryDate === null) return null;
  const expiry = Date.parse(entry.expiryDate);
  const now = Date.parse(day(nowIso));
  return Math.round((expiry - now) / 86_400_000);
}

/** Computed display status (law 0.5). A non-Valid lifecycle state shows as-is
 *  (Missing / Under Review). A Valid cert clock-projects: past expiry → Expired,
 *  within the window → Expiring, else Valid. A Valid cert with no expiry
 *  (permanent basis) stays Valid. Nothing is stored — derived every read. */
export function computeStatus(
  entry: ComplianceRegistryEntry,
  nowIso: string,
): ComplianceDisplayStatus {
  if (entry.lifecycleState !== 'Valid') return entry.lifecycleState;
  const remaining = daysRemaining(entry, nowIso);
  if (remaining === null) return 'Valid';
  if (remaining < 0) return 'Expired';
  if (remaining <= EXPIRING_WINDOW_DAYS) return 'Expiring';
  return 'Valid';
}

/** Scheme-aware halal validity (HALAL-ISSUER-BLIND-01 mechanism — SIMULATED). A
 *  cert is scheme-valid only if its computed status is Valid/Expiring AND — for
 *  halal — its scheme still satisfies the mandate: a MUI-legacy cert is
 *  NON-compliant from the BPJPH mandate date, even while its own dates say Valid.
 *  The DTO carries the issuer dimension and this rule computes it, but the finding
 *  does NOT close until REAL issuer data backs it. */
export function schemeValid(entry: ComplianceRegistryEntry, nowIso: string): boolean {
  const status = computeStatus(entry, nowIso);
  // (1) THE CLOCK. Derived from `expiryDate` + today, never stored. Missing and
  //     Under Review are not failures of the clock — they are states in which no
  //     clock has started — and all three are equally not-valid here.
  if (status === 'Missing' || status === 'Under Review' || status === 'Expired') return false;
  // (2) THE SCHEME. Judged from `certType` — the cert's ISSUING SCHEME — and the
  //     statutory mandate date. This is the ONLY condition that asks what KIND of
  //     certificate it is.
  if (entry.certType === 'HALAL_MUI_LEGACY' && day(nowIso) >= BPJPH_MANDATE_DATE) return false;
  // (3) Otherwise valid.
  //
  // ⚠️ **D-A — READ (1), (2) AND (3) TOGETHER: NONE OF THEM CONSULTS A VALIDITY
  // BASIS, AND THAT IS THE EVIDENCE THE DELETED FIELD WAS UNREAD.** `certBasis`
  // existed to disambiguate two clock models; condition (1) takes its clock
  // straight from `expiryDate`, and condition (2) takes its scheme straight from
  // `certType`. Both dimensions the field claimed to carry were already carried
  // by fields that ARE read. The statutory facts it encoded are preserved on
  // `BPJPH_MANDATE_DATE` above.
  return true;
}

/** Renewal-remind eligibility (HALAL-UNDERREVIEW-01). Only an actually-held cert
 *  (lifecycleState `Valid`) is remind-eligible; `Under Review` and `Missing` are
 *  explicitly ineligible — Under Review is not a second-class silent state, it
 *  has defined semantics: not remind-eligible. */
export function remindEligible(entry: ComplianceRegistryEntry): boolean {
  return entry.lifecycleState === 'Valid';
}
