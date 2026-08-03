// ─────────────────────────────────────────────────────────────────────────────
// CP-2 — `material_master_ref` — THE CROSSWALK SHAPE (types only, zero data).
//
// ⚠️ THIS FILE IS NOT THE CONTRACT. `docs/contracts/C9-material-master-ref.md`
//    is the contract and the authority. This module is the SHAPE that document
//    specifies, expressed once, in a form a build can check and a peer platform
//    can mirror. Where the two disagree, THE DOCUMENT WINS and this file is the
//    defect. `materialMasterRef.contract.test.ts` exists to make disagreement
//    fail the floor rather than accumulate silently (COMMENT-AS-CONTRACT-01 ran
//    the other way: code comments quietly amending a ratified contract).
//
// ── DECLARED INERT ──────────────────────────────────────────────────────────
//   Zero rows. Zero consumers. Nothing imports these types outside their own
//   contract test. That is DELIBERATE, not unfinished: CP-2 freezes a shape for
//   SOMO to build against; populating it requires the master-adoption batch
//   (CP-2 · B2b), which is blocked on D-1 and D-COMP-BPOM. An empty crosswalk is
//   an HONEST crosswalk at this stage — see C9 §5. Anyone finding this module
//   unused must read C9 before deleting it; it is a contract surface a peer
//   platform is scheduled to implement against, not dead code.
//
// ── WHY IDENTITY KEYS ON SPECIFICATION (C9 §2 — the structural argument) ─────
//   A MATNR is a PURCHASABLE ITEM, not a chemical. S/4 semantics already settle
//   this for the key; what the schema adds is that the OTHER axis stays
//   expressible. The direction matters and is not a matter of taste:
//
//     KEYING ON SUBSTANCE MERGES RECORDS.  A merge cannot be unwound without
//     re-adjudicating every row that was folded into it.
//     KEYING ON SPECIFICATION DEFERS THE ROLLUP. A substance axis is purely
//     ADDITIVE later (`SubstanceRef` below).
//
//   ONE DIRECTION IS IRREVERSIBLE AND THE OTHER IS NOT. That asymmetry, not a
//   preference, is why the key is the specification.
//
// ── WHY EVERY ROW CARRIES A GRAIN TAG ───────────────────────────────────────
//   D-1 (substance vs specification) is escalated to Paragon procurement and is
//   NOT defaulted here. The grain tag is what lets the schema survive EITHER
//   answer: a row can say `AI-NIAC-6601 ↔ RM-NIAC` is EQUIVALENT at
//   `'substance'` grain while asserting NOTHING at `'specification'` grain —
//   because ABSENCE IS UNKNOWN (see `MaterialMasterRefRow`). Procurement's
//   eventual ruling then becomes a POLICY OVER THE DATA (`MaterialRefJoinPolicy`
//   — which grains a commercial consumer may join on), never a constraint on
//   what the data is able to express, and never a re-shaping of stored rows.
// ─────────────────────────────────────────────────────────────────────────────

import type { Tier } from '../liveness/registry';

// ─── Parties and code spaces ─────────────────────────────────────────────────

/** The two parties to this crosswalk. A crosswalk earns its place ONLY between
 *  spaces owned by DIFFERENT parties (C9 §1); this union having exactly two
 *  members is that rule expressed in the type. */
export const MATERIAL_REF_PARTIES = ['PARAGON', 'SOMO'] as const;
export type MaterialRefParty = (typeof MATERIAL_REF_PARTIES)[number];

/**
 * A named material code space and who owns it.
 *
 * `spaceId` is NOT decoration. Each party currently owns MORE THAN ONE space,
 * on both sides of this seam, and a row that cannot say which one it means is
 * ambiguous today rather than hypothetically:
 *   · Paragon — the authoritative master (`sdc/fixtures.ts` `MATERIAL_MASTER`)
 *     and the document lane (`src/data/mock*.ts`), which still names 30 codes
 *     the master does not (C9 §6.4).
 *   · SOMO — their BOM codes (declared ILLUSTRATIVE, never SKU-validated) and
 *     canonical S/4, whose crosswalk between them is NAMED, REGISTERED AND NOT
 *     BUILT — it waits on this schema (C8 §4.1).
 */
export interface MaterialCodeSpace {
  readonly spaceId: string;
  readonly party: MaterialRefParty;
  /** Liveness of the SPACE ITSELF. Both spaces are `SIMULATED` today (C9 §4). */
  readonly liveness: Tier;
  readonly description: string;
}

/**
 * One party's material identity: a code, and the space it is a code IN.
 *
 * ⚠️ `materialCode` IS OPAQUE. NO PREFIX STABILITY IS PROMISED, EVER (C9 §3).
 * This is the single most load-bearing clause in the contract and it exists
 * because BOTH platforms currently violate it in shipped code: SOMO's explosion
 * engine reads `RM-`/`PM-` class semantics from the prefix, and our `inferBpom`
 * derives BPOM applicability from `AI-`/`FR-` and FAILS OPEN
 * (`GRInspectionWizard.tsx:129-131`). Either side is one code-space change away
 * from a silent behaviour change in the other. Nothing may parse this string.
 */
export interface MaterialRef {
  readonly spaceId: string;
  readonly materialCode: string;
}

// ─── Grain — the axis D-1 rules on ───────────────────────────────────────────

/**
 * The grain at which an equivalence is asserted.
 *
 *  · `'substance'`     — the two codes name the same MATERIAL SUBSTANCE.
 *                        Says nothing about grade, origin, pack or orderability.
 *  · `'specification'` — the two codes name the same PURCHASABLE ITEM: same
 *                        substance AND everything else that makes it orderable.
 *
 * IMPLICATION, one direction only: specification-equivalence ENTAILS
 * substance-equivalence. The converse does NOT hold — USP 99.5% glycerin and
 * unspecified glycerin are the same substance and different purchasable items
 * (C8 §4.4). A consumer joining at substance grain must never read a row as a
 * procurement equivalence.
 */
export const MATERIAL_GRAINS = ['substance', 'specification'] as const;
export type MaterialGrain = (typeof MATERIAL_GRAINS)[number];

/** What a row asserts at its grain. There is no `'UNKNOWN'` member BY DESIGN —
 *  see `MaterialMasterRefRow`: unknown is expressed by the ABSENCE of a row. */
export const MATERIAL_REF_VERDICTS = ['EQUIVALENT', 'NOT_EQUIVALENT'] as const;
export type MaterialRefVerdict = (typeof MATERIAL_REF_VERDICTS)[number];

/**
 * How sure the adjudicator was — distinct from HOW they decided
 * (`AdjudicationProvenance.method`) and from WHAT EVIDENCE backed them
 * (`evidenceLiveness`). All three are recorded because they fail independently.
 *
 * ⚠️ INVARIANT (C9 §4, structural): a row whose `provenance.evidenceLiveness`
 * is not `'LIVE'` MUST NOT carry `'CERTAIN'`. Certainty against invented data is
 * the exact failure mode "adoption is not discovery" names.
 */
export const MATERIAL_REF_CONFIDENCES = ['CERTAIN', 'PROBABLE', 'TENTATIVE'] as const;
export type MaterialRefConfidence = (typeof MATERIAL_REF_CONFIDENCES)[number];

// ─── Adjudication provenance — "adoption is not discovery", made structural ──

/**
 * HOW a correspondence came to be asserted.
 *
 *  · `'MASTER_DATA_MATCH'`      — matched against a REAL master extract. The
 *                                 only method that can be a DISCOVERY.
 *  · `'OPERATOR_ADJUDICATED'`   — a human ruled, on the record. An ADOPTION.
 *  · `'PROPOSED_BY_INSPECTION'` — someone read two labels and proposed it. An
 *                                 ADOPTION, and the weakest one.
 */
export const ADJUDICATION_METHODS = [
  'MASTER_DATA_MATCH',
  'OPERATOR_ADJUDICATED',
  'PROPOSED_BY_INSPECTION',
] as const;
export type AdjudicationMethod = (typeof ADJUDICATION_METHODS)[number];

/**
 * The record of who decided what, against which artifact.
 *
 * ⚠️ ADOPTION IS NOT DISCOVERY (C9 §4). Both masters are self-declared
 * SIMULATED — ours at `sdc/fixtures.ts:4-11`, SOMO's as seed-illustrative and
 * never SKU-validated. So TODAY every possible row is a fact INVENTED at
 * agreement time, not a correspondence FOUND against a real master. Two invented
 * spaces cannot yield a discovered mapping. This block is required on every row
 * so that a future reader can tell an adoption from a discovery WITHOUT knowing
 * the history — which is precisely what nobody could do for `mock*.ts`.
 */
export interface AdjudicationProvenance {
  readonly method: AdjudicationMethod;
  /** Liveness of the EVIDENCE, not of the row. `SIMULATED` ⇒ not `'CERTAIN'`. */
  readonly evidenceLiveness: Tier;
  /** A ROLE token, never a person's name (identity-clean, `fixtures.ts:19`). */
  readonly decidedBy: string;
  /** ISO date. Absolute — never "today" or a relative expression (law 0.5). */
  readonly decidedOn: string;
  /**
   * The artifact that backed the decision. REQUIRED, and a truthful value may be
   * an admission — e.g. `'NONE — both masters SIMULATED'`. A row that cannot
   * name its source of truth is not thereby exempt from stating that it has none.
   */
  readonly sourceOfTruth: string;
  readonly note?: string;
}

// ─── The row ─────────────────────────────────────────────────────────────────

/**
 * ONE grain-tagged assertion between one Paragon code and one SOMO code.
 *
 * ⚠️ THE CENTRAL HONESTY PROPERTY — ABSENCE IS UNKNOWN. A row asserts something;
 * silence asserts NOTHING. There is deliberately no way to write "unknown": a
 * pair with no `'specification'` row is unknown at specification grain, and an
 * EMPTY MAP ASSERTS NOTHING AT ALL. This is what lets the schema ship honest
 * while D-1 is open, and it is why a sparse map is not an incomplete one
 * (C9 §5). Nothing in this shape rewards filling it in.
 *
 * A pair may therefore carry ZERO, ONE or TWO rows — never a contradictory pair
 * at the same grain (C9 §5.1).
 */
export interface MaterialMasterRefRow {
  readonly paragon: MaterialRef;
  readonly somo: MaterialRef;
  readonly grain: MaterialGrain;
  readonly verdict: MaterialRefVerdict;
  readonly confidence: MaterialRefConfidence;
  readonly provenance: AdjudicationProvenance;
}

/** The crosswalk. **EMPTY AT FREEZE, BY RULING** — populating it is CP-2 · B2b,
 *  blocked on D-1 and D-COMP-BPOM (C9 §6). */
export type MaterialMasterRef = readonly MaterialMasterRefRow[];

// ─── The policy layer — where D-1's answer lands, WITHOUT reshaping data ─────

/**
 * WHICH ROWS A COMMERCIAL CONSUMER MAY JOIN ON.
 *
 * This is the whole reason the grain tag exists. Procurement's D-1 ruling is
 * applied HERE, as a policy over the data — not in the schema, not by rewriting
 * rows, and not by deleting a grain:
 *
 *   · D-1 answered "SPECIFICATION" ⇒ `joinableGrains: ['specification']`.
 *   · D-1 answered "SUBSTANCE"     ⇒ `joinableGrains: ['substance', 'specification']`
 *     (specification-equivalence entails substance-equivalence, so it is included).
 *
 * EITHER ANSWER LEAVES EVERY STORED ROW UNCHANGED. That is the precise sense in
 * which this schema does not foreclose D-1, and it is the claim C9 §6.1 makes to
 * procurement: ruling later costs a policy edit, not a re-adjudication.
 */
export interface MaterialRefJoinPolicy {
  readonly joinableGrains: readonly MaterialGrain[];
  /** Rows below this confidence are not joinable. */
  readonly minimumConfidence: MaterialRefConfidence;
  /**
   * Whether rows backed by SIMULATED evidence may be joined at all.
   * MUST be `false` for any commercial consumer. Exists as a field rather than
   * an assumption so that a demo enabling it has to SAY SO (C9 §4.1).
   */
  readonly allowSimulatedEvidence: boolean;
}

// ─── The substance axis — RESERVED, additive, NOT BUILT ──────────────────────

/**
 * A substance-axis identifier that MANY specification-level materials may share
 * — the optional rollup the ruling requires (`glycerin` as a substance, against
 * which `RM-EMUL-3310` USP 99.5% and a future unspecified-grade code both roll
 * up).
 *
 * ⚠️ RESERVED — NOT BUILT, and deliberately not landed in this batch.
 * The swap-point is a single OPTIONAL field on the shipped master entry:
 *
 *     MaterialMasterEntry.substanceRef?: SubstanceRef   // `sdc/types.ts:83-110`
 *
 * Optional, so every existing master entry stays valid and no fixture changes —
 * which IS the "additive later" property the specification-keying argument
 * depends on, stated as a concrete edit rather than a promise. Landing it is
 * CP-2 · B2b's business, because a substance value is an adoption decision and
 * D-1 rules on whether it carries commercial meaning at all.
 */
export type SubstanceRef = string;
