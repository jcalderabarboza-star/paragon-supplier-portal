// ─────────────────────────────────────────────────────────────────────────────
// SDC-0 — Supplier Data Collaboration: the data model (types).
//
// The RFP's #1 lane (SCH matrix v2). This module is the SPINE ONLY — pure typed
// definitions, no flows, no CommandTargets, no UI, no registry touch. It mirrors
// CI-1a's engine-first discipline: the model first, the surfaces (SDC-1 P2,
// SDC-2 P1) later. Verification is tsc + fixtures-typecheck + the integrity
// suite (see __tests__/sdc.integrity.test.ts) — no browser.
//
// Design canon:
//   docs/Supplier_Data_Collaboration_Design_v2.md      (the converged design)
//   docs/SDC-0_Build_Freeze_Addendum.md §10            (the schema this file freezes)
//   docs/C8_Forecast_Publication_Seam_Proposal.md      (the seam grain)
//   docs/contracts/C7-pr-intake.md                     (sibling seam — vocabulary reuse)
//
// THREE objects, ONE session (design §2): RequirementResponse (the spine, versioned
// against a C8 publication) · InventoryDeclaration (SOH state) · IncomingShipment
// (direction-named, ASN-converging). Unified at the SubmissionSession level (an
// ENVELOPE — addendum §5), NOT at the object level.
//
// ── GOVERNANCE FLAGS (addendum §8) — see FLAGS.md; non-blocking for these
//    SIMULATED fixtures, gating real-supplier visibility later ──────────────────
//   FLAG-1  commitmentClass `lock → firm` mapping is a POLICY DEFAULT pending
//           procurement + finance ratification. Build on SIMULATED now; gate
//           real-supplier visibility on the sign-off.
//   FLAG-2  a SIMULATED publication is NEVER supplier-visible; the supplier-facing
//           vocabulary is `commitmentClass` (firm/semi-firm/visibility-only) — a
//           supplier must never see internal liveness terms (SIMULATED×PLANNED).
// ─────────────────────────────────────────────────────────────────────────────

// Plan-state axis (C6 doctrine), REUSED from the C7 intake vocabulary — never
// forked. Kept strictly SEPARATE from liveness (never merged into `Tier`):
// 'PLANNED' = recommend-first / pre-commit; 'committed' = the fact's owner has
// committed it. (C7-PROV: "recommend-first is NOT a liveness property.")
import type { IntakePlanState } from '../data/types';
// The honest-render liveness tier (F0.6 registry) — type-only import, so SDC-0
// takes NO runtime dependency on the registry and does not touch it. All seed
// data below is `SIMULATED`; the flip to LIVE rides SDC-1's capability
// registration + a live producer (the proven two-gate op), not this module.
import type { Tier } from '../liveness/registry';

// ─── Shared vocabulary ───────────────────────────────────────────────────────

/** The C6 plan-state axis, reused verbatim ('PLANNED' | 'committed'). */
export type PlanState = IntakePlanState;

/**
 * The SDC producer axis — who authored the record. Analogous to C7's `PrSource`
 * (the PR-intake producers), for THIS lane: SOMO publishes the forecast; the
 * SUPPLIER authors the three response objects. This names producers; it does not
 * fork the honesty vocabulary (liveness stays `Tier`).
 */
export type ProvenanceSource = 'SOMO' | 'SUPPLIER';

/**
 * The two-axis honesty marker every SDC record carries: producer identity ×
 * runtime liveness × plan-state. `liveness` reuses the registry `Tier`
 * (SIMULATED for all seed data); `planState` is the SEPARATE C6 axis.
 */
export interface Provenance {
  readonly source: ProvenanceSource;
  readonly liveness: Tier;
  readonly planState: PlanState;
}

/**
 * Canonical unit of measure. RM/PM materials mix kg / pcs / litres / rolls
 * (addendum §3). SIMULATED starter set; the real material master extends it. A
 * qty field never picks a unit — it inherits its material's `canonicalUom`.
 */
export type Uom = 'KG' | 'PCS' | 'L' | 'ROLL';

// ─── Material master (addendum §3/§10 — ruling (b)-minimal) ───────────────────
// The small SIMULATED master C7's GG-4 anticipated but never built: the ONE home
// for a material's canonical UoM, keyed by S/4 code. Every qty-bearing field in
// this lane keys its `uom` off this master (integrity invariant #2), so a
// supplier can never declare a unit that conflicts with the material's canonical
// UoM. Leans on the RM/PM taxonomy (ROH/VERP + MG-xx groups).

/** SAP material type: ROH = raw material (RM), VERP = packaging material (PM). */
export type MaterialType = 'ROH' | 'VERP';

/**
 * Whether a received lot of this material requires a **BPOM lot check** —
 * `INFERBPOM-REGULATORY-01`'s named replacement for a prefix parse.
 *
 * ── THREE STATES, AND THE THIRD IS THE POINT (2B-4a) ────────────────────────
 *   · `'APPLICABLE'`     — a determination: this material needs the check.
 *   · `'NOT_APPLICABLE'` — a determination: it does not.
 *   · `'UNDETERMINED'`   — **NOT a determination.** Nobody has ruled. It is an
 *                          explicit record of an ABSENCE, and every consumer
 *                          must REFUSE on it (`bpomOf`, `sdc/bpom.ts`).
 *
 * ⚠️ **`'UNDETERMINED'` IS NOT QUARANTINE, and the difference is the whole
 * reason it exists.** Quarantine STORES AN UNTRUSTWORTHY FACT AND LETS WORK
 * PROCEED ON IT. `'UNDETERMINED'` STORES AN EXPLICIT ABSENCE OF DETERMINATION
 * AND REFUSES ON IT. `D-OPS-MASTERMISS` already ruled against quarantine for
 * the master miss (`materialMaster.ts` header) for exactly this reason, and
 * this field is that ruling applied one field in. **NOTHING DOWNSTREAM MAY
 * TREAT IT AS A DETERMINATION** — it refuses IDENTICALLY to a code the master
 * cannot resolve at all.
 *
 * ⚠️ **WHY THIS IS A THREE-MEMBER STRING UNION AND NOT `boolean |
 * 'UNDETERMINED'`.** The 2B-4a dispatch specified the states as
 * `true | false | UNDETERMINED`, and the semantics below ARE those states,
 * unchanged. The ENCODING is deliberately different: in a
 * `boolean | 'UNDETERMINED'` union the string member is **truthy**, so
 * `if (entry.bpomApplicable)` compiles, reads as obviously correct, and
 * silently converts an absence of determination into a determination — the one
 * thing this field exists to forbid, in the one shape nobody re-reads. A string
 * union makes that mistake uniformly wrong for EVERY value rather than
 * silently wrong for the one that matters, so it fails on first contact instead
 * of on the case it was built for. **Recorded as a builder's encoding decision
 * over an operator's semantics — the states are the dispatch's; only their
 * spelling is ours, and it is reversible.**
 *
 * ⚠️ **NEVER DERIVED FROM A CODE PREFIX.** `materialCode` is contractually
 * OPAQUE (C9 §3) and a prefix rule contradicts our own ratified contract. This
 * value is POPULATED AT SEED, per row, from a declared material class — see
 * `PROVISIONAL_BPOM_BY_GROUP` (`sdc/bpom.ts`).
 */
export type BpomApplicability = 'APPLICABLE' | 'NOT_APPLICABLE' | 'UNDETERMINED';

/**
 * Whether a received lot of this material requires a **halal check** —
 * `INFERHALAL-READS-PROSE-01`'s named replacement for
 * `description.toLowerCase().includes('halal')`.
 *
 * ── THREE STATES, THE SAME SHAPE AS `BpomApplicability`, A DIFFERENT REGIME ──
 *   · `'REQUIRED'`     — a determination: this material needs a halal check.
 *   · `'NOT_REQUIRED'` — a determination: it does not.
 *   · `'UNDETERMINED'` — **NOT a determination.** Nobody has ruled. Every
 *                        consumer must REFUSE on it (`halalOf`, `sdc/halal.ts`).
 *
 * ⚠️ **THE SHAPE IS BORROWED FROM BPOM. THE CONTENT IS NOT, AND MUST NOT BE.**
 * `D-COMP-HALAL-1` says so in the register: BPOM rules packaging
 * `NOT_APPLICABLE` by registry axis (`bpom.ts`), and halal may not — `doc-001`
 * is an **MUI halal certificate covering PET bottles**, and
 * `AdaptiveContext.tsx:89` puts `packaging` inside its `isHalal` selector.
 * **Packaging is where the two regimes visibly disagree in this tree.** So the
 * halal class rule seeds packaging `'UNDETERMINED'` — we do not know — rather
 * than copying a ruling made under a different regulation. That is Seat 3's
 * refinement, and it is compliance's to answer, not ours.
 *
 * ⚠️ **`'UNDETERMINED'` IS NOT QUARANTINE**, for the reason `BpomApplicability`
 * records above: quarantine stores an untrustworthy fact and lets work proceed
 * on it; this stores an EXPLICIT ABSENCE OF DETERMINATION and refuses
 * IDENTICALLY to a code the master cannot resolve at all.
 *
 * ⚠️ **IT IS THE DEFAULT, NOT A FALLBACK.** A group nobody has ruled on — and a
 * material-group AXIS nobody has considered — lands here by construction, so a
 * group added tomorrow fails CLOSED without anyone remembering to think about
 * halal. That is the exact property the prose parse lacks, where an unmatched
 * description is silently a NO.
 *
 * ⚠️ **NEVER DERIVED FROM PROSE, AND NEVER FROM A CODE PREFIX.** The incumbent
 * mechanism reads a supplier-typed `description`; `materialCode` is
 * contractually OPAQUE (C9 §3). This value is POPULATED AT SEED, per row, from
 * the material's declared GROUP — see `PROVISIONAL_HALAL_BY_GROUP`
 * (`sdc/halal.ts`).
 */
export type HalalApplicability = 'REQUIRED' | 'NOT_REQUIRED' | 'UNDETERMINED';

export interface MaterialMasterEntry {
  /**
   * The S/4 material code.
   *
   * ⚠️ CORRECTED (CP-2 · B1, SEAT3-FIND). This comment previously read "the
   * shared join key (C7 GG-4)". Ratified C8 §4.1 says materialCode is NOT YET a
   * join key between the platforms — the two sides do not provably agree on a
   * code space (MASTER-STRADDLE-01: this master names five codes; the document
   * lane names ~30). That made this SEAM-DOC-DRIFT-01 running in REVERSE —
   * CODE-TRUTH OVERSTATING the contract — on the exact field CP-2 freezes.
   * Corrected here BEFORE the harvest script runs, so the harvest cannot
   * propagate the overstatement into the contract.
   *
   * What it IS today: the master's own primary key, and the identity CP-2 keys
   * on (Seat 3: identity on SPECIFICATION, S/4 MATNR semantics). It is OPAQUE —
   * no prefix stability is promised, and prefix-derived semantics are retired as
   * a class. Becoming a cross-platform join key is a C8 deliverable, not a fact.
   */
  readonly materialCode: string;
  readonly label: string;
  readonly materialType: MaterialType;
  /** The RM/PM-taxonomy material group (MG-xx). */
  readonly materialGroup: string;
  /** The one canonical unit; every qty field for this material must match it. */
  readonly canonicalUom: Uom;
  /**
   * BPOM lot-check applicability. **REQUIRED on every row** — an entry that can
   * omit it is an entry whose silence has to be interpreted, and the whole
   * point of `'UNDETERMINED'` is that an absence of determination is WRITTEN
   * DOWN rather than inferred from a missing key.
   *
   * ⚠️ **ALL 35 SEEDED VALUES ARE PROVISIONAL** — strategist-ruled on best
   * practice at 2B-4a, PENDING TEAM RATIFICATION, and derived from the
   * material's declared GROUP, never from its code. `D-COMP-BPOM` remains the
   * open escalation; this field is the shape its answer lands in, not the
   * answer. See `sdc/bpom.ts`.
   *
   * ⚠️ **WIRED AT 2B-4b, AND THIS FIELD IS NOW A REGULATORY GATE.** It used to
   * read AUTHORED, NOT WIRED: `inferBpom` was what the receiving surface ran,
   * and it could not be retired until every code the GR wizard can be fed was
   * master-resolvable. It is, and it was. The GR wizard reads this field
   * through `bpomOf` and REFUSES a line it cannot answer for.
   *
   * ⚠️ So editing a row here now moves what an inspector is asked to check.
   * `'UNDETERMINED' → 'NOT_APPLICABLE'` is not a tidy-up: it turns a refusal
   * into a silent pass, which is the precise defect this field replaced.
   */
  readonly bpomApplicable: BpomApplicability;
  /**
   * Halal-check applicability. **REQUIRED on every row**, for the reason
   * `bpomApplicable` states: an entry that can omit it is an entry whose
   * silence has to be interpreted, and the whole point of `'UNDETERMINED'` is
   * that an absence of determination is WRITTEN DOWN rather than inferred from
   * a missing key.
   *
   * ⚠️ **ALL 42 SEEDED VALUES ARE PROVISIONAL** — strategist-ruled on best
   * practice at H1, **PENDING COMPLIANCE RATIFICATION**, and derived from the
   * material's declared GROUP, never from its label and never from its code.
   * `D-COMP-HALAL-1` is the open decision; this field is the shape its answer
   * lands in, not the answer. See `sdc/halal.ts` for the rule and its disposal
   * condition.
   *
   * ⚠️ **AUTHORED, NOT WIRED (H1).** Nothing reads this field. The receiving
   * surface still decides the halal question by parsing prose
   * (`inferHalal`, `GRInspectionWizard.tsx`), which is untouched — retiring it
   * is H2, and the certificate-verification leg is H4, gated on
   * `D-COMP-HALAL-4`. Editing a row here moves NOTHING today; it will move what
   * an inspector is asked to check the moment H2 lands.
   */
  readonly halalApplicable: HalalApplicability;
}

/** The material master, keyed by S/4 material code. */
export type MaterialMaster = Readonly<Record<string, MaterialMasterEntry>>;

// ─── The C8 forecast-publication object (design §3, addendum §1) ──────────────

/** The supplier's first question answered (design §3.1). Firm carries commercial-
 *  liability weight, hence the allocation-approval governance below. */
export type CommitmentClass = 'firm' | 'semi-firm' | 'visibility-only';

/** How a material×period TOTAL was split across suppliers (addendum §1a). */
export type AllocationBasis = 'planner-split' | 'quota' | 'award-history';

/**
 * ⭐ Allocation provenance (addendum §1 — the top schema-affecting fix). The
 * supplier fan-out is OURS: SOMO freezes a material×period TOTAL, we split it
 * across suppliers. So a `firm` badge on an allocated line claims more than
 * SOMO's lock supports UNLESS it carries HOW the split derived and WHO approved
 * it. `approvedBy`/`approvedAt` are REQUIRED for firm-period lines (invariant #3).
 */
export interface Allocation {
  /** The SOMO-committed total this line was split from. */
  readonly materialPeriodTotal: number;
  readonly basis: AllocationBasis;
  /** Firm-period splits require the human (role) who approved the fan-out. */
  readonly approvedBy?: string;
  readonly approvedAt?: string;
}

/**
 * One supplier × material × periodBucket — fanned out on OUR side from SOMO's
 * material×period total. `periodBucket` is the planning grain (a bucket, e.g.
 * '2026-08'), NOT a resolved date (C8 GG-3′: bucket-native on this seam).
 */
export interface ForecastLine {
  readonly materialCode: string;
  readonly supplierId: string;
  readonly periodBucket: string;
  readonly forecastQty: number;
  /** Keys off MaterialMaster.canonicalUom (invariant #2). */
  readonly uom: Uom;
  readonly commitmentClass: CommitmentClass;
  readonly allocation: Allocation;
  /** SOMO read-only planning annotations (C7 GG-1/GG-2 vocabulary). */
  readonly segment?: string;
  readonly suggestedSource?: string;
  /** source = SOMO; SIMULATED × PLANNED for seed publications. */
  readonly provenance: Provenance;
}

/**
 * The governed, versioned snapshot of the rolling plan a supplier confirms
 * AGAINST. FLAG-2: a SIMULATED publication (as all seed data here is) is NEVER
 * supplier-visible — publishing to a real supplier requires LIVE plan data.
 */
export interface ForecastPublication {
  readonly publicationId: string;
  /** SOMO's plan version this snapshot came from (bound onto the response). */
  readonly planVersion: string;
  readonly publishedAt: string;
  /** The rolling horizon of period buckets (C8 GG-8: 6-bucket window; trimmable). */
  readonly horizon: readonly string[];
  readonly lines: readonly ForecastLine[];
  readonly provenance: Provenance;
}

// ─── Object 1 — RequirementResponse (the spine, design §2.1) ──────────────────

export type RequirementResponseStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Accepted'
  | 'Disputed';

/** The confirmation against a published forecast line. */
export interface ForecastConfirmation {
  readonly confirmedQty: number;
  /** Keys off MaterialMaster.canonicalUom (invariant #2). */
  readonly uom: Uom;
  readonly committedDate?: string;
  readonly capacityConstraint?: string;
}

/**
 * SDC-2b-EXT — the VISIBILITY response: an acknowledgment of a
 * visibility-only line (the class where Paragon requests NO commitment but
 * wants early supplier signal, DEC-COMMS-PRIMARY). Deliberately carries NO
 * quantity — an acknowledgment must be structurally un-mistakable for a
 * commitment (there is no number to misread). The optional note is the
 * free-text SOH-sense / capacity signal; structured SOH stays
 * `InventoryDeclaration` (SDC-3).
 */
export interface Acknowledgment {
  readonly note?: string;
}

/** Child of the confirmation — explains a deviation from the forecast. */
export interface RootCause {
  readonly level1: string;
  readonly level2?: string;
  readonly note?: string;
}

/**
 * ONE ENTRY IN THE DISPUTE LEDGER — the buyer's authored words on a supplier's
 * commitment, kept beside the response and NEVER overwritten.
 *
 * ── ⚠️ WHY A LEDGER AND NOT A `disputeReason` FIELD ────────────────────────
 * The scalar shape was the obvious one and this lane refuses it, for a reason
 * the lane already states three times over: `submissionVersion` is "versioned,
 * never overwritten"; `submittedAt` is stamped once because "a later buyer-side
 * move must not restamp the moment the supplier answered"; and the enforcement
 * ledger APPENDS rather than sets. A scalar reason answers "what is the dispute"
 * and CANNOT answer "was this dispute ever answered" — and **A DISPUTE THAT WAS
 * ANSWERED IS NOT THE SAME AS ONE THAT WAS NEVER RAISED** (operator ruling).
 * Clearing it on resolution loses that distinction; leaving it in place makes
 * every resolved response carry a stale accusation forever. The ledger has
 * neither failure mode: the raise stays, the resolution lands BESIDE it.
 *
 * ── ⚠️ AND THERE WAS NO EXISTING FIELD TO REUSE — MEASURED, NOT ASSUMED ────
 * Reusing a field beats adding a parallel one, so the candidates were derived
 * before this one was written. `plannerNote` (the buyer's word) and
 * `supplierNote` (the supplier's) were both named as already present on this
 * DTO: **each has ZERO occurrences in `src/`**, and the interface below declares
 * fourteen fields, none of them either. The supplier's word is real and is
 * `rootCause` / `acknowledgment.note`; the buyer had nothing at all, which is
 * the defect this closes rather than an argument about where to put it. §55h.
 *
 * ── ⚠️ NO ACTOR IS STORED, AND THAT IS DELIBERATE ──────────────────────────
 * Both entry kinds are gated on `requirementresponse:dispute`, which ONLY the
 * buyer holds (`PERSONA_ROLES`), so `by: 'buyer'` would be a stored copy of
 * something the role gate already proves — a derived value that can drift from
 * its own derivation. The attribution actually worth having is a NAMED HUMAN,
 * and this build has none: `CurrentIdentity` carries a persona, a tenant and a
 * company, no person (`ENF-NO-PERSON-IN-IDENTITY-01`). The enforcement lane
 * answers that with `ActorAttribution`, whose UNATTRIBUTED arm REFUSES THE ACT —
 * correct for an override, wrong here: it would make a dispute unraisable. So
 * this records WHAT WAS SAID and WHEN, and claims no accountability it cannot
 * back. Booked: `RR-DISPUTE-HAS-NO-HUMAN-01`, closes with F1 OIDC.
 */
export interface DisputeEntry {
  /** `raised` opens the dispute; `resolved` closes it. Both are buyer acts. */
  readonly kind: 'raised' | 'resolved';
  /** The authored text. Required by the transition and proven non-blank by
   *  `rr_dispute_text_authored` — `requiredFields` proves PRESENCE only. */
  readonly text: string;
  /** Store-minted from the shared SDC clock at the moment of the act (the
   *  `pinnedAt` discipline) — never payload-supplied, or a caller could backdate
   *  its own dispute against a response deadline. */
  readonly at: string;
}

/**
 * The spine: a response against a published forecast VERSION, with root-cause
 * as its child. Keyed by publicationId + planVersion + periodBucket (+ supplier +
 * material) — it binds the EXACT snapshot answered (own-facts-only, mirroring
 * t_quotation_submit's proven pattern).
 *
 * TWO response kinds, discriminated by WHICH payload field exists (SDC-2b-EXT,
 * integrity invariant #11: EXACTLY ONE present — XOR):
 *  · `forecastConfirmation` — a COMMITMENT against a firm/semi-firm line
 *    (t_requirementresponse_submit).
 *  · `acknowledgment` — a VISIBILITY response against a visibility-only line
 *    (t_requirementresponse_acknowledge): seen + optional signal, NO qty.
 * The kind is derived at read (never stored); P2/SOMO can never mistake an
 * acknowledgment for a commitment because it carries no confirmedQty at all.
 */
export interface RequirementResponse {
  readonly id: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly periodBucket: string;
  /** Binds to the exact C8 publication + plan version answered. */
  readonly publicationId: string;
  readonly planVersion: string;
  /** Absent while Draft; set on submit. */
  readonly submittedAt?: string;
  readonly submissionVersion: number;
  readonly status: RequirementResponseStatus;
  /** The commitment (firm/semi-firm lines). XOR with `acknowledgment`. */
  readonly forecastConfirmation?: ForecastConfirmation;
  /** The visibility response (visibility-only lines). XOR with `forecastConfirmation`. */
  readonly acknowledgment?: Acknowledgment;
  readonly rootCause?: RootCause;
  /**
   * The buyer's dispute ledger — APPEND-ONLY, absent until the first dispute is
   * raised. The LAST entry is the current standing of the dispute; the whole
   * array is its history. Read it, never rewrite it.
   */
  readonly disputes?: readonly DisputeEntry[];
  /** source = SUPPLIER; LIVE × committed once submitted (SIMULATED in seed). */
  readonly provenance: Provenance;
}

// ─── Object 2 — InventoryDeclaration (SOH state, design §2.2) ──────────────────
// SDC-3a — TOTAL-FIRST (R-4 Finding 1, adjudicated (a)): the declaration FLOOR
// is `totalQty` (uom from master); `batches[]` is OPTIONAL detail. This gives
// the chat channel an honest minimal reply (token + total) — under the old
// batches-mandatory floor the degraded reply "total SOH, detail to follow" was
// inexpressible without fabricating a batch number. Granularity (total-only vs
// batch-grain) is DERIVED AT READ (`declarationGranularity`), never stored.
// The batch-grain path is the MAGIC-LINK GRID (DEC-MAGIC-LINK-GRID): chat
// carries the total, the grid carries batches, the portal carries both.

/** A single stock batch. `batches` is PLURAL (v1's singular was a spec bug). */
export interface InventoryBatch {
  readonly batchNumber: string;
  readonly qty: number;
  /** Keys off MaterialMaster.canonicalUom (invariant #2). */
  readonly uom: Uom;
  readonly expiryDate?: string;
}

/**
 * SOH keyed by material + as-of (`declaredAt`), NOT against a requirement
 * version — it changes when stock moves, not when demand publishes. One true SOH
 * per material, with a clear as-of.
 *
 * `totalQty` is the floor; when `batches` is present, Σ batch qty MUST equal
 * `totalQty` (integrity invariant #6′ — a total that disagrees with its own
 * detail is a fabricated number). A total-only declaration is EXPIRY-BLIND:
 * P2's supplier-coverage indicator must mark that it cannot assess expiry
 * bridgeability — never assume no-expiry-risk.
 */
export interface InventoryDeclaration {
  readonly id: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly declaredAt: string;
  /** The SOH floor. Keys off MaterialMaster.canonicalUom (invariant #2). */
  readonly totalQty: number;
  readonly uom: Uom;
  /** OPTIONAL batch-grain detail (portal / magic-link grid; never required by
   *  the chat channel). When present, Σ qty must equal `totalQty`. */
  readonly batches?: readonly InventoryBatch[];
  /** source = SUPPLIER. */
  readonly provenance: Provenance;
}

// ─── Object 3 — IncomingShipment (long-lived, direction-named, design §2.3) ────

/**
 * `principal-to-distributor` = the distributor's supply-assurance leg (Paragon is
 * NOT the consignee — pure RM supply visibility, carried natively here).
 * `to-paragon` = a shipment TO Paragon, which is what the already-built ASN
 * object is for — such a line LINKS to an ASN (`asnRef`), never duplicating the
 * tracker (design §2.3 direction ruling).
 */
export type ShipmentDirection = 'principal-to-distributor' | 'to-paragon';

/**
 * Linear lifecycle + Cancelled (addendum §2). An ETA revision is NOT a lifecycle
 * state — `eta` is a FIELD; revisions are DR-10 TransitionEvent-audited field
 * updates that preserve the true state (still Booked / Shipped). There is
 * deliberately NO `ETARevised` state.
 */
export type ShipmentLifecycle = 'Booked' | 'Shipped' | 'Arrived' | 'Cancelled';

export interface IncomingShipment {
  readonly id: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly direction: ShipmentDirection;
  readonly lifecycle: ShipmentLifecycle;
  readonly qty: number;
  /** Keys off MaterialMaster.canonicalUom (invariant #2). */
  readonly uom: Uom;
  readonly etd?: string;
  /** A FIELD, not a state — revisions are audited field updates (addendum §2). */
  readonly eta?: string;
  /** AWB is a TMS reference — link, don't track. */
  readonly awb?: string;
  /** For direction='to-paragon': the ASN this leg converges on (asnNumber). */
  readonly asnRef?: string;
  /** source = SUPPLIER. */
  readonly provenance: Provenance;
}

// ─── The submission session — the ENVELOPE (design §2.4, addendum §5) ──────────

/** The object kinds a session may touch (the three response objects). */
export type SdcObjectKind =
  | 'RequirementResponse'
  | 'InventoryDeclaration'
  | 'IncomingShipment';

export interface SubmissionObjectRef {
  readonly kind: SdcObjectKind;
  readonly objectId: string;
}

/**
 * A SubmissionSession is an ENVELOPE (addendum §5): a single visit's grouping id
 * + shared audit correlation. Each referenced object dispatches its OWN command
 * with INDEPENDENT validation; partial success is allowed and reported PER-OBJECT
 * (a forecast confirmation can succeed while an inventory declaration fails). The
 * session has NO lifecycle or status of its own beyond "what was attempted
 * together" — enforced STRUCTURALLY by the absence of any status/state/lifecycle
 * field here (integrity invariant #9). This keeps the "one visit" UX without
 * re-coupling the objects the three-way split decoupled.
 */
export interface SubmissionSession {
  readonly sessionId: string;
  readonly supplierId: string;
  readonly openedAt: string;
  /** DR-10 correlation shared across the per-object commands (audit only). */
  readonly auditCorrelationId: string;
  readonly attempted: readonly SubmissionObjectRef[];
}

// ─── The distributor-principal model (design §7) ──────────────────────────────

export type SupplierType = 'manufacturer' | 'distributor';

/** For a distributor: who backs them, and the principal's lead time. */
export interface Principal {
  readonly principalId: string;
  readonly principalLeadTimeDays: number;
}

/**
 * The principal relationship, on the supplier-MATERIAL pairing (not the
 * supplier). Without the principal lead time, distributor SOH + incoming is data
 * you can display but not interpret. A distributor carries ≥1 principal; a
 * manufacturer carries none (integrity: distributor-principal check).
 */
export interface SupplierMaterialRelationship {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly supplierType: SupplierType;
  readonly principals?: readonly Principal[];
}

// ─── CapacityProfile — DECLARED, BUILD-DEFERRED (addendum §4, lean (a)) ────────
// The schema carries it so RFP Functional #3 is visibly OWNED, not lost. NO
// fixtures, NO surface in SDC-0 — a later SDC batch (SDC-3+) builds it on the
// same SubmissionSession. The type exists now; the build defers.

export interface CapacityCalendarEntry {
  readonly periodBucket: string;
  readonly availableQty: number;
  readonly uom: Uom;
}

export interface CapacityProfile {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly moq: number;
  readonly uom: Uom;
  readonly leadTimeDays: number;
  readonly capacityCalendar: readonly CapacityCalendarEntry[];
  readonly wip?: number;
  readonly constraints?: readonly string[];
}
