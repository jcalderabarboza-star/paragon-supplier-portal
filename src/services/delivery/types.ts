// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 1: the object model (types).
//
// A genuinely NEW child of Contract (verified: mockContracts.ts is a pure header —
// no material, quantity, cadence, or schedule). Modelled 1:1 on the SAP S/4HANA
// scheduling agreement (doc type LPA — WITH release documentation: schedule lines
// have internal character until explicitly released), so the eventual S/4HANA
// integration is a map, not a translation. This module is the SPINE ONLY — pure
// typed definitions + a pure generator + a pure derived ledger; no flows, no
// CommandTargets, no UI, no registry touch. Verification is tsc + fixtures-
// integrity + pure unit tests (see __tests__/) — no browser.
//
// It mirrors the SDC lane's house style EXACTLY: readonly interfaces, taxonomy
// REUSE (CommitmentClass / Uom imported from ../sdc, never forked), the registry
// `Tier` as the honesty marker (type-only import — no runtime registry dep), and
// derive-at-read discipline (the DrawdownLedger and ReleaseFulfillment are
// COMPUTED, never stored).
//
// Design canon:
//   docs/Delivery_Agreement_Design_Spec_v1.md              (the buildable spec, D1–D5)
//   docs/Delivery_Agreement_and_Contract_Compliance_Chase_Design_Note_v1.md (direction)
//
// ── ADJUDICATED DECISIONS (Batch-1 build locks) ──────────────────────────────
//   A  STORE ReleaseLifecycle ('draft'|'released'); DERIVE ReleaseFulfillment
//      ('pending'|'fulfilled'|'late'|'missed') at read — never store the latter
//      (storing 'missed' as a literal is fabricated fulfillment).
//   B  Store `releaseType`; derive commitmentClass via commitmentClassOf()
//      (JIT→firm, FRC→semi-firm). CommitmentClass is REUSED from ../sdc, not forked.
//   C  The ctr-003 seed is BOUND — a SIMULATED sapAgreementNumber is present and
//      every line is state:'draft' (agreement exists in SAP; releases not yet
//      transmitted = LPA internal character).
//   D  remainingQty = agreedTotalQty − releasedQty; deliveredQty tracked separately.
//   E  releaseType lives at Item level (the generator stamps every line); the
//      ScheduleLine field is retained for later mixed-horizon FRC/JIT.
//   F  liveness: Tier only on the agreement header (SIMULATED for all Batch-1 seed).
// ─────────────────────────────────────────────────────────────────────────────

import type { CommitmentClass, Uom } from '../sdc/types';
// The honest-render liveness tier (F0.6 registry) — TYPE-ONLY import, so this
// module takes NO runtime dependency on the registry and does not touch it. All
// seed data is SIMULATED; the flip to LIVE rides a real SAP feed (Pattern B), not
// this module.
import type { Tier } from '../liveness/registry';

// ─── Release character (SAP LPA) ──────────────────────────────────────────────

/**
 * The SAP-native release-doc type. FRC = Forecast (medium/long-term horizon);
 * JIT = Just-in-Time (short-term, hard near-term dates). Both are LPA release
 * types. This is stored; `commitmentClass` is DERIVED from it (Decision B) — the
 * portal never forks the firm/semi-firm taxonomy.
 */
export type ReleaseType = 'FRC' | 'JIT';

/** The negotiated delivery cadence (fixed at contract signing — the generator input). */
export type ReleaseCadence = 'weekly' | 'monthly' | 'quarterly';

/**
 * The STORED operational lifecycle: SAP LPA internal-character ('draft', not
 * transmitted to the vendor) → explicit release ('released', transmitted). The
 * chase engine (later batch) only ever pushes on 'released' lines. Batch-1 seed
 * lines are ALL 'draft'.
 */
export type ReleaseLifecycle = 'draft' | 'released';

/**
 * The DERIVED fulfillment status (Decision A) — computed at read from
 * (releaseDate, now, the matched ASN/GR), NEVER stored. Listed here so the axis
 * is visibly OWNED; the derivation itself lands with the validation seam (a later
 * batch). Storing 'fulfilled'/'late'/'missed' as a literal would be fabricated
 * fulfillment — forbidden by the honesty guards.
 */
export type ReleaseFulfillment = 'pending' | 'fulfilled' | 'late' | 'missed';

// ─── Drawdown policy (spec Decision D4) ───────────────────────────────────────

/**
 * How a tolerance breach is treated.
 *
 * ⚠️ KNOWN-UNIMPLEMENTED ARM (Batch-2 Decision D): `'block'` is DECLARED but NOT
 * ENFORCED anywhere. Neither seeded preset uses it (Case B = 'flag', Case C =
 * 'ignore'), `deriveDrawdownLedger` only distinguishes ignore-vs-not
 * (`enforced`), and `releaseScheduleLines` does NOT refuse a release that would
 * breach the envelope. Release is the natural moment 'block' would apply; wiring
 * it is the enforcement seam, its own later batch. Recorded here so the arm is
 * visibly pending rather than silently dead.
 *
 * NOTE: under the generator invariant (Σ plannedQty === agreedTotalQty) releasing
 * generated lines can never breach the envelope — a breach requires an ADJUSTED or
 * added line. Over-envelope therefore guards amendment, not release.
 */
export type DrawdownEnforcement = 'block' | 'flag' | 'ignore';

/**
 * ONE tolerance mechanism, two knobs. `tolerancePct` null = unlimited (Case C);
 * a fraction (0.10 = 10%) is Case B. Mirrors SAP over/under-delivery tolerance.
 */
export interface TolerancePolicy {
  readonly tolerancePct: number | null;
  readonly enforcement: DrawdownEnforcement;
}

/**
 * Per-ITEM drawdown policy (one agreement can hold a governed + a loose
 * material). `contractDefault` is seeded at signing and is the immutable audit
 * reference; `active` is operator-adjustable along the way and a change carries
 * who/when/why (honesty guard 4 — a deviation is visible and attributable).
 */
export interface DrawdownPolicy {
  readonly contractDefault: TolerancePolicy;
  readonly active: TolerancePolicy;
  readonly activeChangedBy?: string;
  readonly activeChangedAt?: string;
  readonly activeChangeReason?: string;
}

// ─── Schedule line (dated release row = SAP schedule line / releaseSeq) ────────

/**
 * A materialized, dated release row under an Item (SAP schedule line). Produced
 * by the generator at signing; INTERNAL CHARACTER (adjustable) while 'draft'.
 * `commitmentClass` is NOT stored here — it is derived from `releaseType` via
 * commitmentClassOf() (Decision B). The fulfillment fields are ABSENT in every
 * Batch-1 seed (honesty guard 1 — no fabricated fulfillment); they are populated
 * by the ASN/GR hybrid match in a later batch.
 */
export interface ScheduleLine {
  /** Portal join-chain (contract→agreement→item→release); distinct from the SAP
   *  number so the portal never mints a competing identity (honesty guard 6). */
  readonly releaseRef: string;
  /** 1..n within the item. */
  readonly releaseSeq: number;
  /** Stored SAP release character; commitmentClass is derived from it. */
  readonly releaseType: ReleaseType;
  /** ISO (UTC), cadence-stepped from the Item startDate. */
  readonly releaseDate: string;
  readonly plannedQty: number;
  /** The generator always emits 'draft'. */
  readonly state: ReleaseLifecycle;
  // ── Release record (Batch 2) — the minimal honest "what was transmitted when" ──
  /**
   * ISO stamp of the explicit release (Batch-2 `releaseScheduleLines`), INJECTED
   * by the caller — never a clock read inside pure code. INVARIANT:
   * `releasedAt` present ⟺ `state === 'released'`. Absent on every generated and
   * seeded line, because the generator only ever emits 'draft'.
   */
  readonly releasedAt?: string;
  /**
   * ISO stamp of the last draft-side adjustment (Batch-2 `adjustDraftLine`).
   * Only ever set on a 'draft' line — a released line is frozen, so it can never
   * acquire one after release.
   */
  readonly adjustedAt?: string;
  /**
   * ISO stamp of the confirm-match write (`confirmFulfillment`) — the PORTAL audit
   * stamp for "when the buyer accepted this delivery", INJECTED by the caller.
   * Only ever set on a 'released' line (confirm is legal only there). Distinct from
   * `fulfilledDate` (the SAP GR posting date, never portal-written): a confirm is a
   * portal record, not a goods-receipt.
   */
  readonly confirmedAt?: string;
  /**
   * The SAP-assigned release-document number (Decision C). DECLARED, NEVER SEEDED
   * and never written by this module — SAP assigns it on transmission (Pattern B),
   * exactly like `sapAgreementNumber`. The portal must never mint a competing
   * identity (honesty guard 6). Absent ⇒ not yet bound by SAP.
   */
  readonly sapReleaseNumber?: string;
  // ── Fulfillment fields — never SEEDED (honesty guard 1); `actualQty` +
  //    `fulfilledBy` are written by the confirm-match write (`confirmFulfillment`),
  //    which flips the derived match from inferred→authoritative and feeds
  //    `deliveredQty`. `fulfilledDate` (the SAP GR posting date) is NEVER
  //    portal-written — it rides the F2 feed (Pattern B). ───────────────────────
  /** The ACCEPTED delivered qty (v1: the observed shipment qty). Absent ⇒ not yet
   *  confirmed — the ledger counts 0 for this line (the honesty lock). */
  readonly actualQty?: number;
  /** The SAP GR posting date — never written by the portal (reserved for F2). */
  readonly fulfilledDate?: string;
  /** The ASN/GR ref this release drew down. Written by `confirmFulfillment`; read
   *  by deriveFulfillment Pass 1 as an authoritative (inferred:false) binding. */
  readonly fulfilledBy?: string;
}

// ─── Item (= SAP item 10/20/30 = lineSeq, one per material) ───────────────────

/**
 * One material line of the agreement (SAP item). Carries the envelope
 * (`agreedTotalQty`), the generator inputs (`cadence` + `qtyPerRelease`), the
 * Item-level release character (Decision E), the per-item drawdown policy, and
 * the materialized schedule lines. `uom` MUST equal
 * MATERIAL_MASTER[materialCode].canonicalUom (fixtures-integrity invariant,
 * mirroring SDC invariant #2). `sapItemNumber` is absent until SAP binds.
 */
export interface SchedulingAgreementItem {
  /** SAP item number 10/20/30 (SIMULATED here). */
  readonly lineSeq: number;
  readonly sapItemNumber?: string;
  readonly materialCode: string;
  readonly uom: Uom;
  readonly agreedTotalQty: number;
  readonly cadence: ReleaseCadence;
  readonly qtyPerRelease: number;
  readonly releaseType: ReleaseType;
  readonly drawdownPolicy: DrawdownPolicy;
  readonly scheduleLines: readonly ScheduleLine[];
}

// ─── Scheduling agreement (SAP LPA header, child of Contract) ─────────────────

/**
 * The delivery agreement header — a child of Contract holding many material items
 * (spec D1). Doc type LPA (with release documentation — the model that lets
 * releases stay individually adjustable). `sapAgreementNumber` absent ⇒ a visible
 * DRAFT (honesty guard 5); present ⇒ bound (Decision C: the ctr-003 seed is
 * bound). `liveness` is the honesty marker — SIMULATED for every Batch-1 fixture.
 */
export interface SchedulingAgreement {
  readonly id: string;
  readonly contractId: string;
  readonly supplierId: string;
  /** Absent until posted to + bound by SAP (Pattern B). Present ⇒ bound. */
  readonly sapAgreementNumber?: string;
  /** LPA — with release documentation (spec-locked). */
  readonly docType: 'LPA';
  readonly items: readonly SchedulingAgreementItem[];
  /** SIMULATED for all Batch-1 fixtures (Decision F). */
  readonly liveness: Tier;
}

// ─── Drawdown ledger (DERIVED — never stored) ─────────────────────────────────

/** A single derived drawdown exception (empty over the all-draft seed). */
export interface DrawdownException {
  readonly kind: 'over-envelope' | 'over-release-tolerance';
  readonly overageQty: number;
  readonly detail: string;
}

/**
 * The drawdown ledger — a DERIVED view over an Item + its lines + its policy,
 * never a stored object with fabricated numbers (honesty by construction).
 * `remainingQty` = agreedTotalQty − releasedQty (Decision D). `activePolicy` is
 * always present (honesty guard 3 — policy mode is always visible); `enforced`
 * false for Case C means a total reads "reference envelope, not enforced";
 * `policyDeviation` marks active ≠ contractDefault (honesty guard 4).
 */
export interface DrawdownLedger {
  readonly agreedTotalQty: number;
  readonly releasedQty: number;
  readonly deliveredQty: number;
  readonly remainingQty: number;
  readonly uom: Uom;
  readonly activePolicy: TolerancePolicy;
  readonly policyDeviation: boolean;
  readonly enforced: boolean;
  readonly exceptions: readonly DrawdownException[];
}
