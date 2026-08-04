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
// ── THIS FILE IS THE ARTIFACT A PEER PLATFORM RATIFIES (C9 §7.11, A-9) ──────
//   SOMO ratified C9's shape from OUR PROSE SUMMARY — C9 is not in their
//   repository and their field list came from a description of this module, not
//   from this module. A COUNTERPARTY RATIFYING A SUMMARY HAS NOT RATIFIED THE
//   CONTRACT. `docs/contracts/C9-required-fields.md` is the fix: a COMPLETE
//   required-field list DERIVED from this file (never transcribed —
//   CENSUS-MUST-DERIVE-01), pinned to it, and sent alongside the document. If a
//   field here is not in that list, the list is stale and the floor says so.
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
 * `spaceId` is NOT decoration. A row that cannot say which space it means is
 * ambiguous today rather than hypothetically. The populations, as MEASURED by
 * each party in its own tree (C9 §3.3 — every figure states how it was obtained):
 *   · Paragon — the authoritative master (`sdc/fixtures.ts` `MATERIAL_MASTER`,
 *     5 entries) and the document lane (`src/data/mock*.ts`), which still names
 *     30 codes the master does not (C9 §6.4).
 *   · SOMO — THREE self-authored populations under MATNR semantics (AMENDED,
 *     A-7 — not two): 88 material (ROH+VERP), 17 bulk (HALB), 17 finished-good
 *     (FERT). PAIRWISE DISJOINT BY MEASUREMENT BUT NOT ENFORCED — no
 *     cross-contract uniqueness assertion exists, so THEY CAN DECLARE THE
 *     COLLAPSE; THEY CANNOT PROMISE IT.
 *   · Canonical S/4 — OURS (AMENDED, A-6: operator ruling). Our side of this
 *     crosswalk IS S/4 material-master identity; that is what `material_master_ref`
 *     exists for. SOMO hold ZERO codes in it and never need more than ONE
 *     `spaceId` for their own populations. S/4 IS NOT A THIRD SPACE FOR THEM.
 *
 * ⚠️ RETIREMENT IS PER PARTY, AND THE SYMMETRY IS FALSE (C9 §5.2 — A-1). The
 * first issue said the field drops "when both sides hold one space each" — a
 * JOINT exit only ONE party can reach. OUR second space is the document lane; we
 * own it, and CP-2 · B2b collapses it — OUR OWN TIDYING, on our own schedule.
 * Theirs waits on THE S/4 WIRE. A REQUIRED FIELD WHOSE EXIT DEPENDS ON A SYSTEM
 * NEITHER PARTY CONTROLS IS A FIELD THAT NEVER RETIRES.
 *
 * ⚠️ THE CONDITION IS AUTHORSHIP, NOT A COUNT (C9 §5.2 — AMENDED, A-5). SOMO's
 * check 2: they satisfy "holds one space" TODAY ONLY VACUOUSLY, because the
 * counterpart space is EMPTY. It holds precisely while the crosswalk has no S/4
 * codes in it, and FAILS THE MOMENT THE WIRE LANDS AND THE CONTRACT DOES THE
 * WORK IT EXISTS FOR. In their words: A RETIREMENT CONDITION THAT HOLDS ONLY
 * BEFORE THE CONTRACT DOES ANY WORK IS NOT A RETIREMENT CONDITION.
 *
 * So the condition is restated: BOTH PARTIES AUTHOR EVERY SPACE THEY HOLD. A
 * COUNT TREATS SPACE-HOLDING AS HOUSEKEEPING — for SOMO, one space is another
 * organisation's master under Paragon MDG governance, WHICH THEY CAN NO MORE
 * COLLAPSE THAN RENAME S/4. Build against `spaceId` as PERMANENT, not as
 * scaffolding; discharging our half changes nothing, because a row names both
 * parties.
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
 * This is the single most load-bearing clause in the contract.
 *
 * AMENDED — C9 §3.1 (A-3, extended by A-7). The first issue said BOTH platforms
 * violate it. SOMO MEASURED their side and that was wrong: no material-code
 * prefix is parsed in their production, and `materialClass` is a declared ENUM
 * read as a FIELD at ~20 sites. A-7 widens the measurement to all THREE of their
 * populations — THE OPACITY PASS IS CLEAN WITH EVIDENCE: zero prefix-reading on
 * material, bulk or finished-good codes; PREFIXES ARE AUTHORING CONVENTION ONLY.
 * We had carried a hazard they undertook to LOOK FOR as one they HAD.
 * So the clause is PREVENTATIVE on their side and CORRECTIVE on ours — `inferBpom`
 * derives BPOM applicability from `AI-`/`FR-` and FAILS OPEN
 * (`GRInspectionWizard.tsx:129-131`), live and unfixed. WE ARE THE ONLY PARTY
 * CURRENTLY IN BREACH OF A CLAUSE WE PROPOSED. Nothing may parse this string.
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

/**
 * What a row asserts at its grain.
 *
 *  · `'EQUIVALENT'`            — the two codes name the same thing, at this grain.
 *  · `'NOT_EQUIVALENT'`        — they do not. Also an assertion, also adjudicated.
 *  · `'ADJUDICATED_UNRESOLVED'` — AMENDED (C9 §5.3, A-4). SOMEBODY LOOKED, FORMED
 *                                A CANDIDATE, AND COULD NOT CLOSE IT.
 *
 * ⚠️ THE COLLISION A-4 RESOLVES, because the shape reads as over-general without
 * it. C9 §5 says ABSENCE IS UNKNOWN, so a doubtful row is simply not written.
 * C9 §4.2 requires `routeToResolution` on EVERY WRITABLE ROW. A ROW THAT IS
 * ABSENT CANNOT CARRY A ROUTE — so the two rules pulled against each other and
 * the field added at SOMO's own request had NOWHERE TO LIVE. Raised by SOMO,
 * ruled in their favour.
 *
 * SOMO's resolution, adopted: ABSENCE AND ADJUDICATED-UNRESOLVED ARE DIFFERENT
 * FACTS. Absence means NOBODY LOOKED. An adjudicated-unresolved row means
 * somebody looked, formed a candidate, and could not close it. A MAP THAT CANNOT
 * DISTINGUISH THEM LOSES THE MORE EXPENSIVE ONE — the one that cost analysis.
 *
 * ⚠️ THIS DOES NOT WEAKEN THE NO-UNKNOWN RULE; IT SHARPENS IT. The rule was that
 * SILENCE MUST ASSERT NOTHING, and it still does. The error was assuming absence
 * was the only honest way to say "not settled". An `'ADJUDICATED_UNRESOLVED'` row
 * ASSERTS NOTHING ABOUT THE CORRESPONDENCE; it asserts something about the WORK
 * DONE — a different claim, and a true one. There is still NO `'UNKNOWN'` verdict
 * and still no way to write one.
 *
 * ⚠️ INVARIANTS on the new member (C9 §5.3):
 *   1. It carries CANDIDATE (the row), EVIDENCE (`sourceOfTruth` +
 *      `evidenceLiveness` + `method`) and `routeToResolution` — the full
 *      three-of-three. It is the row shape `routeToResolution` was built for.
 *   2. It MUST NOT carry `'CERTAIN'`. Certainty about an unresolved
 *      correspondence is a contradiction, not a strong opinion.
 *   3. NO CONSUMER MAY EVER JOIN ON IT, at any grain and under any policy. It
 *      asserts nothing about the correspondence, so there is nothing to join.
 *   4. It is SUPERSEDED, NEVER ACCOMPANIED: when the route pays off, the row is
 *      REPLACED by the resolved verdict. Two rows at one grain stay invalid
 *      (C9 §5.1).
 */
export const MATERIAL_REF_VERDICTS = [
  'EQUIVALENT',
  'NOT_EQUIVALENT',
  'ADJUDICATED_UNRESOLVED',
] as const;
export type MaterialRefVerdict = (typeof MATERIAL_REF_VERDICTS)[number];

/**
 * How sure the adjudicator was — distinct from HOW they decided
 * (`AdjudicationProvenance.method`) and from WHAT EVIDENCE backed them
 * (`evidenceLiveness`). All three are recorded because they fail independently.
 *
 * ⚠️ INVARIANT (C9 §4, structural): a row whose `provenance.evidenceLiveness`
 * is not `'LIVE'` MUST NOT carry `'CERTAIN'`. Certainty against invented data is
 * the exact failure mode "adoption is not discovery" names.
 *
 * ⚠️ INVARIANT (C9 §5.3, A-4): a row whose verdict is `'ADJUDICATED_UNRESOLVED'`
 * MUST NOT carry `'CERTAIN'` either — for a different reason, worth keeping
 * separate. The first is about the EVIDENCE being invented; this one is about
 * the CLAIM being absent. Certainty about an unresolved correspondence is a
 * contradiction, not a strong opinion.
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
  /**
   * WHAT WOULD SETTLE THIS ROW. REQUIRED (C9 §4.2 — AMENDED, A-2).
   *
   * SOMO's refinement of "absence is unknown", accepted in their words: AN
   * UNRESOLVED ROW BEATS A CONFIDENT WRONG ANSWER ONLY IF IT CARRIES ITS
   * CANDIDATE, ITS EVIDENCE, AND ITS ROUTE TO RESOLUTION — OTHERWISE IT IS A
   * SHRUG WITH BETTER MANNERS. The first issue carried two of the three: the
   * candidate IS the row, the evidence is `sourceOfTruth` + `evidenceLiveness`,
   * and NOTHING said what was still needed. `sourceOfTruth` is RETROSPECTIVE —
   * it names what was consulted, never what would settle it.
   *
   * This field is what converts an unresolved row into an ANSWERABLE QUESTION.
   *
   * It names the ARTIFACT, RULING OR WIRE that would settle the row — a
   * resolution MECHANISM, not a description of the doubt:
   *   'D-1 ruling from Paragon procurement' · 'a LIVE Paragon master extract' ·
   *   'SOMO BOM→canonical-S/4 crosswalk, at a declared grain' · 'D-COMP-BPOM'
   *
   * ⚠️ NOT A NOTES COLUMN. `note` below is the notes column and is optional;
   * this is required and has exactly one job. Anything that is not a route to
   * resolution belongs in `note`.
   *
   * ⚠️ INVARIANT (C9 §4.2): a row whose `confidence` is not `'CERTAIN'` MUST
   * name a real route. `'NONE'` belongs only to a row with nothing left to
   * settle — which, by the `evidenceLiveness` invariant above, means a row with
   * LIVE evidence. COMPOSED, the consequence today is total: no row this schema
   * could currently carry may be CERTAIN, so EVERY row writable today must name
   * its route. The field cannot be dead on arrival.
   */
  readonly routeToResolution: string;
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
 * ⚠️ AND ABSENCE IS NOT THE ONLY HONEST WAY TO SAY "NOT SETTLED" (C9 §5.3, A-4).
 * ABSENCE MEANS NOBODY LOOKED. An `'ADJUDICATED_UNRESOLVED'` verdict means
 * somebody looked, formed a candidate, and could not close it — and A MAP THAT
 * CANNOT DISTINGUISH THEM LOSES THE MORE EXPENSIVE ONE, the one that cost
 * analysis. The generalisation SOMO drew from it, adopted here:
 * A RECORD OF WORK DONE IS NOT A CLAIM ABOUT THE THING WORKED ON.
 * Both are still true at once —
 * silence asserts nothing, and an unresolved row asserts nothing about the
 * CORRESPONDENCE.
 *
 * A pair may therefore carry ZERO, ONE or TWO rows — never a contradictory pair
 * at the same grain (C9 §5.1), and an unresolved row is SUPERSEDED by its
 * resolution, never accompanied by it.
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
 *
 * ⚠️ INVARIANT (C9 §5.3, A-4): NO POLICY MAY EVER MAKE AN `'ADJUDICATED_UNRESOLVED'`
 * ROW JOINABLE, at any grain and at any confidence. There is no field to switch
 * that on, deliberately — such a row asserts nothing about the correspondence, so
 * there is nothing to join. It is a record of WORK DONE, not a claim about the
 * thing worked on.
 */
export interface MaterialRefJoinPolicy {
  readonly joinableGrains: readonly MaterialGrain[];
  /** Rows below this confidence are not joinable. Note this is NOT what excludes
   *  `'ADJUDICATED_UNRESOLVED'` — that exclusion is unconditional and is not a
   *  confidence threshold, because raising confidence must never reach it. */
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
