// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · H3 — CERTIFICATE VERIFICATION: THE THIRD FACT, HEADLESS.
//
// Seat 3's ratified three-fact split, held apart because the three have
// different answerers and different clocks:
//
//   1. APPLICABILITY — does this material need a halal check at all?
//      Material grain, CLOCK-FREE, a policy determination on the master.
//      Answered by `sdc/halal.ts:halalOf`. Wired at H2.
//   2. SEAL CHECK — did a human look at the physical seal and tick it?
//      An inspector's attestation. Answered by `halalSealCheck` on the GR
//      inspection draft. Wired at H2.
//   3. CERTIFICATE VERIFICATION — is there a certificate that actually backs
//      the halal claim for THIS supplier × THIS material AT THE INSTANT THE
//      LOT WAS RECEIVED? A lookup plus a projection. ⚠️ **PERFORMED NOWHERE
//      TODAY.** This module is it, and it is the third fact ALONE.
//
// ── ⚠️ HEADLESS. THIS MODULE HAS NO CONSUMER AND MUST NOT ACQUIRE ONE HERE ──
//   `verifyHalalAtReceipt` is not read by the GR wizard, by any page, by any
//   hook, or by the dispatcher. Wiring it is **H4, GATED ON `D-COMP-HALAL-4`**
//   — the same gate that held H1 back from the receiving surface, for the same
//   reason, stated in `sdc/halal.ts` and worth restating where the enforcement
//   would happen: enforcing a certificate check against a certificate corpus
//   that does not exist yet is the *outage wearing compliance clothes*. R0.1
//   (the Track-R harvest) is NOT STARTED. `halalVerification.test.ts` pins the
//   headlessness by census, so a wire cannot arrive quietly.
//
// ── ⚠️ TESTED AGAINST SYNTHETIC ROWS, AND THE INTERSECTION IS EMPTY ─────────
//   `COMPLIANCE_REGISTRY` names 17 material codes and every one of them is an
//   `RM-SAMPLE-…` placeholder; `MATERIAL_MASTER` names 42 real codes and none
//   of them is. **THE INTERSECTION IS EMPTY BY CONSTRUCTION** — the fixture's
//   own header mandates the placeholders AS AN HONESTY DEVICE, so that nothing
//   in the tree reads as real certificate tracking before the harvest.
//
//   ⚠️ **THAT EMPTINESS IS NOT A BUG AND HAS NO HONEST TECHNICAL MITIGATION.**
//   Seeding `RM-SAMPLE-…` aliases for real codes, adding real-looking registry
//   rows, or matching supplier-to-certificate by NAME would each "fix" it, and
//   each is disqualified: the first two break the honesty header, the third
//   breaks C9 §3 (materialCode is contractually opaque — no prefix, no
//   substring, no name rule decides anything). The bridge is REAL CERTIFICATE
//   DATA arriving at R0.1, which is the operator's schedule and not a gate's.
//
//   It is also no obstacle whatsoever to testing a PURE PROJECTION — the
//   registry rows exercise every lifecycle, clock and scheme case on their own
//   codes, exactly as `complianceProjection.test.ts` already demonstrates.
//   ⚠️ But it does mean `verifyHalalAtReceipt(realSupplier, realCode, …)`
//   returns `NO_CERT` for **every real material in the tree today**, and that
//   is the honest answer, not a defect to code around. It is also precisely why
//   H4 is gated: a wire today would refuse 100% of real receipts.
//
// ── LAW 0.5 — WHY `receiptInstant` IS AN ARGUMENT AND NEVER A CLOCK READ ────
//   The verdict is clock-derived, so it CANNOT be stored, and the instant it
//   is computed against CANNOT be read from the ambient clock inside a
//   function whose whole job is to answer *as of a moment in the past*. Main
//   carries the corpses that prove the storing half:
//     · `buyerCompliance.ts` c-006/c-008 store `daysRemaining: 873`, a number
//       LAST TRUE ON 2025-04-11 and 483 days stale as of 2026-08-07;
//     · `supplierDocuments.ts` doc-001 stores `status: 'Expiring Soon'` on a
//       certificate that expired 2026-05-15, 84 days ago.
//   Both were true when typed and neither has been true since. Nothing here is
//   stored and nothing here reads a clock: `verifyHalalAtReceipt` is a pure
//   function of `(supplierId, materialCode, registry, receiptInstant)`, and
//   the test suite pins determinism rather than asserting it.
//
// ── REUSE, NOT REIMPLEMENTATION ─────────────────────────────────────────────
//   `daysRemaining` / `computeStatus` / `schemeValid` are NOT duplicated here.
//   This module SELECTS candidate rows and RANKS their projected outcomes; the
//   projection itself stays in `complianceProjection.ts`, single-sourced. The
//   BPJPH mandate date lives there too (`BPJPH_MANDATE_DATE`) and is not
//   re-stated in this file — a statutory date with two homes has one wrong one.
//
//   ⚠️ Where the existing projection genuinely CANNOT answer, this module says
//   so in `docs/findings.md` (`HALAL-VERIFY-*`) rather than growing a second
//   projection beside the first. Two known gaps, both FILED AND NOT FIXED:
//   foreign-scheme domestic recognition, and in-force-at-receipt (`issueDate`
//   is never consulted by the projection).
// ─────────────────────────────────────────────────────────────────────────────

import { computeStatus, schemeValid } from './complianceProjection';
import type { CertType, ComplianceRegistryEntry } from './types';

// ─── Halal-class certificates ────────────────────────────────────────────────

/**
 * The certificate types that can BACK A HALAL CLAIM. The three halal schemes
 * and nothing else: a BPOM notification and an ISO quality certificate are real
 * documents about other things, and a verification that accepted them would be
 * answering a different question with a confident yes.
 *
 * Declared as data and derived-from-nothing on purpose: `CertType` is a closed
 * union in `types.ts`, and a SEVENTH type added there tomorrow is NOT halal-class
 * here until somebody says it is. That is the fail-closed direction.
 */
export const HALAL_CERT_TYPES: readonly CertType[] = Object.freeze([
  'HALAL_BPJPH',
  'HALAL_MUI_LEGACY',
  'HALAL_FOREIGN',
]);

/** Whether a certificate type is one of the halal schemes. */
export function isHalalCertType(certType: CertType): boolean {
  return HALAL_CERT_TYPES.includes(certType);
}

// ─── The verdict ─────────────────────────────────────────────────────────────

/**
 * Why a halal claim is NOT backed by a certificate at the receipt instant.
 *
 * ⚠️ Unlike `HalalRefusalReason` (H1), these four ARE four different
 * behaviours for an operator — *chase the supplier* / *chase the renewal* /
 * *wait for the certifier* / *there is nothing to chase* — so a consumer MAY
 * branch on them for its message and its next action. **NO consumer may branch
 * on them to PROCEED.** Every one of them is NOT_SATISFIED, and NOT_SATISFIED
 * has exactly one consequence.
 */
export type HalalNotSatisfiedReason =
  /** No halal-class certificate covers this supplier × material — or the one
   *  that should is in the registry as `Missing` (the born state). */
  | 'NO_CERT'
  /** A halal certificate exists and its clock has run out at `receiptInstant`. */
  | 'EXPIRED'
  /** A halal certificate exists and is IN DATE, but its scheme no longer
   *  satisfies the mandate at `receiptInstant` — the MUI-legacy case. */
  | 'SCHEME_INVALID'
  /** An application is with the certifier and has not been granted. Not a
   *  certificate yet (`HALAL-UNDERREVIEW-01`: Under Review has its own
   *  semantics and is never quietly folded into Valid or Missing). */
  | 'UNDER_REVIEW';

/**
 * The outcome of a certificate verification at a receipt instant.
 *
 * `SATISFIED` NAMES THE CERTIFICATE it relied on (`certId` / `certType` /
 * `expiryDate`) — a verification that says only "yes" cannot be audited, and an
 * auditor's first question is *which document*. `expiryDate` is `string | null`
 * because `null` is a real answer here: a BPJPH permanent-basis certificate has
 * no clock (GR 42/2024), and that is not the same as an unknown expiry.
 *
 * ⚠️ `SATISFIED` is a statement about A CERTIFICATE, not about a lot. It does
 * not assert the material needed a check (fact 1, `halalOf`) nor that anyone
 * looked at the seal (fact 2, `halalSealCheck`). The three facts compose at H4;
 * none of them substitutes for another.
 */
export type HalalVerification =
  | {
      readonly verdict: 'SATISFIED';
      readonly certId: string;
      readonly certType: CertType;
      readonly expiryDate: string | null;
    }
  | { readonly verdict: 'NOT_SATISFIED'; readonly reason: HalalNotSatisfiedReason };

/**
 * Reason precedence when a supplier × material holds SEVERAL halal-class
 * certificates and NONE of them satisfies. The reported reason is the failure
 * of the STRONGEST candidate — the one that came closest — because that is the
 * one an operator acts on:
 *
 *   SCHEME_INVALID  a live, in-date document; only its scheme retired it
 *   EXPIRED         a real document whose clock ran out
 *   UNDER_REVIEW    an application in flight
 *   NO_CERT         a row that records nothing held
 *
 * ⚠️ This ORDER IS A JUDGEMENT, not a derivation, and it is recorded as one so
 * that a later ruling amends a named constant rather than discovering an
 * accident. It changes only WHICH reason is reported; it can never change a
 * NOT_SATISFIED into a SATISFIED, and the tests pin that separately.
 */
const REASON_PRECEDENCE: readonly HalalNotSatisfiedReason[] = Object.freeze([
  'SCHEME_INVALID',
  'EXPIRED',
  'UNDER_REVIEW',
  'NO_CERT',
]);

/**
 * The reason ONE failing candidate failed, read off the existing projection.
 *
 * Total by construction and NOT a second rule: `schemeValid` is false for
 * exactly four situations — Missing, Under Review, Expired, and a mandate-
 * retired scheme — and `computeStatus` names the first three. The `else` is
 * therefore the fourth and only the fourth. Nothing about dates or schemes is
 * recomputed here.
 */
function failureReason(
  entry: ComplianceRegistryEntry,
  receiptInstant: string,
): HalalNotSatisfiedReason {
  switch (computeStatus(entry, receiptInstant)) {
    case 'Missing':
      return 'NO_CERT';
    case 'Under Review':
      return 'UNDER_REVIEW';
    case 'Expired':
      return 'EXPIRED';
    default:
      return 'SCHEME_INVALID';
  }
}

/**
 * THE VERIFICATION. Whether a halal-class certificate backed this supplier's
 * supply of this material AT `receiptInstant` — or an honest NOT_SATISFIED
 * naming which of the four situations holds.
 *
 * A pure function. `receiptInstant` is an ISO instant and is ALWAYS supplied by
 * the caller: this answers *as of the moment the lot arrived*, which is a
 * different question from *as of now*, and the two diverge the moment a
 * certificate lapses between receipt and review.
 *
 * ⚠️ **`registry` IS AN ARGUMENT, NOT AN IMPORT.** The module never reaches for
 * `COMPLIANCE_REGISTRY` itself — the caller supplies the scoped rows it is
 * entitled to read, so this function can never widen a `QueryScope`.
 *
 * ⚠️ **NOT ANSWERED HERE:** whether the material required a halal check at all
 * (`halalOf`, H1 — this function consults no per-registry-row applicability flag;
 * `requiredForHalalBrands` was deleted at D-D, unread by anything,
 * which is the registry's own opinion about a supplier's brand supply and not a
 * determination about the material), and whether an inspector ticked the seal
 * (H2). A `NO_CERT` on a material that never needed a certificate is not a
 * finding; it is a question that should not have been asked.
 */
export function verifyHalalAtReceipt(
  supplierId: string,
  materialCode: string,
  registry: readonly ComplianceRegistryEntry[],
  receiptInstant: string,
): HalalVerification {
  const candidates = registry.filter(
    (entry) =>
      entry.supplierId === supplierId &&
      entry.materialCodes.includes(materialCode) &&
      isHalalCertType(entry.certType),
  );

  const satisfying = candidates.find((entry) => schemeValid(entry, receiptInstant));
  if (satisfying !== undefined) {
    return {
      verdict: 'SATISFIED',
      certId: satisfying.id,
      certType: satisfying.certType,
      expiryDate: satisfying.expiryDate,
    };
  }

  // No candidate rows at all is NO_CERT — the same verdict as a row that
  // records nothing held, because the consequence is identical: there is no
  // document. The two are deliberately NOT split; a `NO_ROW` reason would tell
  // an operator about the shape of our fixtures, not about their supplier.
  const reasons = candidates.map((entry) => failureReason(entry, receiptInstant));
  const reason =
    REASON_PRECEDENCE.find((candidate) => reasons.includes(candidate)) ?? 'NO_CERT';
  return { verdict: 'NOT_SATISFIED', reason };
}
