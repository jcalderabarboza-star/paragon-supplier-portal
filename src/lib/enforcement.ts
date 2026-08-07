// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · E1 — THE ENFORCEMENT VOCABULARY. HEADLESS.
//
// THE OPERATOR'S RULING THIS ANSWERS: during implementation we must be able to
// relax rules and, step by step, turn them all on — more flexibility in the
// first months, then increasing rigour. This module is the words for that, and
// nothing else.
//
// ── THE GOVERNING DISTINCTION ───────────────────────────────────────────────
//
//   RELAXING ENFORCEMENT IS LEGITIMATE; RELAXING HONESTY IS NOT.
//
//   A gate that lets a receipt through WHILE TELLING YOU IT DID is an
//   operational choice. A gate that lets it through SILENTLY is a lie. Every
//   shape below exists to make the first expressible and the second
//   unrepresentable: there is no mode that hides a question, no verdict that
//   can be relaxed into silence, and no override that can be recorded without
//   naming a person, a reason and the exact verdict it overrode.
//
// ── ⚠️ THE BOUNDARY, RATIFIED AS A SENTENCE AND PINNED AS A TEST ────────────
//
//   ENFORCEMENT MODE RELAXES THE CONSEQUENCE OF AN ANSWER;
//   NOTHING MAY RELAX THE ABSENCE OF A QUESTION.
//
//   Three non-passing shapes exist and the mode governs exactly TWO of them —
//   answered-and-adverse (`ADVERSE`) and asked-and-unanswered (`UNANSWERED`).
//   The third — a REFUSAL (`UNKNOWN_MATERIAL`, `UNDETERMINED_APPLICABILITY`) —
//   is outside its domain STRUCTURALLY, not as policy. The reasoning is
//   `OBSERVE`'s own promise: *record instead of block*. A REFUSAL IS THE
//   STATEMENT THAT THE QUESTION COULD NOT BE POSED — there is no answer to
//   record, so there is nothing to observe. A refusal admitted under `OBSERVE`
//   would be NO CHECK, ANNOTATED.
//
//   The mechanism is absence: the refusal shapes are NOT members of
//   `GovernedVerdict`, so no mode can be applied to one without inventing a
//   value the union does not contain. `REFUSALS_OUTSIDE_ENFORCEMENT` derives
//   from the two lookups' OWN unions (`halalOf` / `bpomOf`), so a third refusal
//   reason authored tomorrow BREAKS THIS BUILD until somebody consciously
//   places it — it cannot arrive as a governed verdict by drift.
//
// ── ⚠️ THERE IS DELIBERATELY NO FOURTH MODE BELOW `OBSERVE` ─────────────────
//   `OFF` / `DISABLED` / `SKIP` — a mode that HIDES the question — is the exact
//   fail-open that `inferBpom` and `inferHalal` were retired for
//   (`INFERHALAL-READS-PROSE-01`, `BPOM-OFF-BY-SPACE-01`): a regulatory answer
//   produced without a regulatory question. **ITS ABSENCE FROM THE UNION IS
//   THE MECHANISM, NOT A CONVENTION** — exactly as `HALAL_CERT_TYPES` names
//   three schemes and a seventh `CertType` added tomorrow is not halal-class
//   until somebody says so. `enforcement.test.ts` pins the absence: the first
//   member is `OBSERVE`, the union has three members, and no member — and no
//   line of this module's code — carries the fail-open lexicon. Adding one
//   turns that suite red, which is the point of writing it down.
//
//   `OBSERVE` is therefore the floor, and it is NOT "off": it still poses the
//   question, still records the answer, and still stamps what it saw. What it
//   relaxes is the CONSEQUENCE.
//
// ── ⚠️ VOCABULARY HERE · SETTING BEHIND THE SEAM (Seat 3's correction) ──────
//   The precedent for a governed relaxation is **`FxPin`, NOT `currencyPolicy`**.
//   `currencyPolicy` holds DEPLOY-EDITED CONSTANTS and says so in its own voice
//   ("a plain editable constant BY DESIGN"); "moved by a recorded act" and
//   "deploy-edited constant" are mutually exclusive in one artifact. So:
//
//     · THE VOCABULARY IS CODE — this file. A declared list, a derived type, a
//       pure function. Nothing here is a setting and nothing here is tunable.
//     · THE SETTING IS DATA BEHIND THE SEAM — `FxPin`-shaped: recorded by a
//       named person at an instant, superseded by appending rather than edited,
//       and read through `useDataService()`. **E1 DECLARED `EnforcementSetting`
//       AND SEEDED NOT ONE.** E2 supplies the store, the recording verb and the
//       read seam — AND STILL SEEDS NOT ONE (see below).
//
// ── E2 — WHAT THIS FILE GAINED, AND WHAT IT DID NOT ────────────────────────
//   The DERIVATION over the ledger lives here, beside the type it reads, on the
//   `effectivePin` precedent (`fxPin.ts`): `settingInForce` picks the last
//   recorded act, `effectiveEnforcement` folds the ratchet onto it, and
//   `settingHistory` proves the superseded ones are still there. All three are
//   PURE and take the ledger as an argument — the STORE is `enforcementSetting
//   Store`, the VERB is `t_enforcement_set`, and neither is named in this file.
//   The clock stays out: `setAt` / `overriddenAt` are recorded BY the store at
//   the moment of the act (the `pinnedAt` discipline — a caller that could set
//   it could backdate its own audit entry), and every function here still takes
//   its instant as an argument.
//
//   ⚠️ **NOTHING IS SEEDED, AND THAT IS A RULING, NOT A GAP.** The ledger ships
//   EMPTY. An empty ledger derives `BLOCK` — maximum rigour — with the source
//   `NO_SETTING_RECORDED`, so the un-governed state is the safe one and no
//   relaxation exists until somebody records one. Seeding anything below `BLOCK`
//   would be a relaxation of shipped behaviour, which is D-ENF-4 and UNRULED.
//
// ── ⚠️ E2 — THE RULING ON `ENF-NO-PERSON-IN-IDENTITY-01` (operator) ─────────
//   An override's ENTIRE VALUE IS ACCOUNTABILITY — this named person accepted
//   this risk on this date. `CurrentIdentity` carries a persona, a tenant and a
//   company; NO HUMAN. So an actor is a DISCRIMINATED ATTRIBUTION
//   (`ActorAttribution`): either a RESOLVED identity, or UNATTRIBUTED carrying
//   the reason it could not be resolved.
//
//     AN UNATTRIBUTED OVERRIDE CANNOT COMPLETE. THE MODE FALLS THROUGH TO
//     `BLOCK`. THE OVERRIDE LANE IS FULLY BUILT AND UNUSABLE UNTIL IDENTITY
//     EXISTS.
//
//   The three obvious answers each fail: waiting for F1 OIDC blocks E3
//   indefinitely; CAPTURING A TYPED NAME IS FORGEABLE AND WORSE THAN NOTHING
//   BECAUSE IT LOOKS LIKE ATTRIBUTION; dropping attribution makes an override AN
//   ANONYMOUS UNLOCK. This is the `UNDETERMINED` shape instead — AN EXPLICIT
//   ABSENCE THAT REFUSES, NOT A VALUE THAT PROCEEDS — and it makes the gap
//   CREATE PRESSURE rather than be papered over: a built lane that is visibly
//   unusable is how F1 identity gets prioritised.
//
//   The same attribution governs `setBy`, and this is where "tightening is
//   always legal" bites: a TIGHTENING may be recorded by an unattributed actor
//   (it removes a relaxation — refusing it would be the wrong direction to fail),
//   a LOOSENING may not. THE SAFEST ACT IS ALWAYS AVAILABLE TO ANYBODY.
//
// ── LAW 0.5 — WHY `dispatchInstant` IS AN ARGUMENT AND NEVER A CLOCK READ ───
//   Same discipline as `receiptInstant` (H3), for the same reason. The ratchet
//   below is clock-DERIVED, so it cannot be stored, and the instant it is
//   evaluated against cannot be read from the ambient clock inside a function
//   whose job is to answer *as of the moment a command was dispatched*. Main
//   carries the corpses that prove the storing half (`buyerCompliance.ts`
//   `daysRemaining: 873`, 483 days stale; `supplierDocuments.ts` doc-001
//   `'Expiring Soon'` on a certificate 84 days expired). Nothing here is stored
//   and nothing here reads a clock; the suite PINS determinism rather than
//   asserting it, and the pin is only possible BECAUSE the instant is an
//   argument.
//
// ── ⚠️ WHAT THIS MODULE CANNOT ENFORCE, STATED RATHER THAN IMPLIED ──────────
//   `overriddenBy` must be A NAMED PERSON, NEVER A ROLE. A type cannot check
//   personhood, and a blocklist of role words would be a PROSE PARSE — the very
//   class this lane just retired twice. What the shape can do is make a role
//   AWKWARD rather than natural: `ActingPerson` requires BOTH a stable
//   `personId` and the `displayName` captured at the moment of the act, so
//   there is no single field into which "Buyer" fits. **THE REAL ENFORCEMENT IS
//   AT E3, WHERE THE IDENTITY COMES FROM THE SESSION AND NOT FROM A TEXT
//   FIELD** — and `ENF-NO-PERSON-IN-IDENTITY-01` (`docs/findings.md`) records
//   what that will cost: `CurrentIdentity` today is `{ personaType, supplierId,
//   supplierName }`. THE PORTAL HAS NO NOTION OF A PERSON AT ALL. E3 cannot
//   source an `ActingPerson` from anything that exists today.
// ─────────────────────────────────────────────────────────────────────────────

import type { BpomRefusalReason } from '../services/sdc/bpom';
import type { HalalRefusalReason } from '../services/sdc/halal';

// ─── The ramp ────────────────────────────────────────────────────────────────

/**
 * The enforcement modes, **IN ASCENDING ORDER OF RIGOUR**. The order is not
 * presentation: it IS the ramp, and index comparisons are how the ramp is read
 * (`rigour`, `blocks`, `tighten` all derive from this array and nothing
 * restates it).
 *
 *   `OBSERVE`            pose the question, record the answer, do not block.
 *   `BLOCK_OVERRIDABLE`  block — and a named person may override, on the record.
 *   `BLOCK`              block. There is no override at full rigour.
 *
 * ⚠️ **NO FOURTH MEMBER BELOW `OBSERVE`, EVER.** See the header: a mode that
 * hides the question is the fail-open `inferBpom`/`inferHalal` were retired
 * for, and its absence from this array is the mechanism that forbids it.
 */
export const ENFORCEMENT_MODES = Object.freeze([
  'OBSERVE',
  'BLOCK_OVERRIDABLE',
  'BLOCK',
] as const);

/** The enforcement modes as a type. DERIVED — never hand-written beside the list. */
export type EnforcementMode = (typeof ENFORCEMENT_MODES)[number];

/** The modes that are a RELAXATION — anything short of full rigour. Derived by
 *  exclusion, so a mode inserted into the ramp is relaxed unless it is `BLOCK`. */
export type RelaxedMode = Exclude<EnforcementMode, 'BLOCK'>;

/**
 * The top of the ramp — **DERIVED FROM THE ARRAY, never the literal `'BLOCK'`.**
 *
 * E2 needs "maximum rigour" in three places (no setting recorded, an
 * unrecognised mode, a refused override) and each of them is the class rule
 * `AN UNRECOGNISED MEMBER OF A GOVERNING ENUM RANKS AT THE CEILING`. Writing
 * `'BLOCK'` three times would restate the ramp three times; taking the last
 * element means a stricter mode appended tomorrow moves all three at once.
 */
export const MAXIMUM_RIGOUR: EnforcementMode =
  ENFORCEMENT_MODES[ENFORCEMENT_MODES.length - 1];

/**
 * Narrow an arbitrary string to an enforcement mode — **THE BOUNDARY E2 MUST
 * USE.** The setting arrives from behind the seam as JSON, and JSON has no
 * unions; a widening that is not narrowed here is a cast wearing a type's
 * clothes (the `isBidCurrency` precedent).
 */
export function isEnforcementMode(value: string): value is EnforcementMode {
  return (ENFORCEMENT_MODES as readonly string[]).includes(value);
}

/** The same boundary for a check id, and for the same reason. */
export function isGovernedCheckId(value: string): value is GovernedCheckId {
  return (GOVERNED_CHECK_IDS as readonly string[]).includes(value);
}

/**
 * A mode's position on the ramp. Higher is stricter. Exported because the
 * comparison is the contract — a consumer that wants "at least as strict as X"
 * must be able to say so without re-deriving the order.
 *
 * ⚠️ **AN UNRECOGNISED MODE RANKS AT THE CEILING, NOT AT −1.** It cannot arrive
 * through the type — but it can arrive through a seam at E2 as a string nobody
 * narrowed, and `indexOf`'s −1 would make `blocks` return FALSE. **A TYPO IN A
 * SETTING WOULD THEN TURN THE GATE OFF**, which is the fail-open this whole
 * module exists to make unrepresentable. Ranking it at full rigour is the only
 * direction that is safe to be wrong in. `isEnforcementMode` is how a caller
 * finds out instead of guessing.
 */
export function rigour(mode: EnforcementMode): number {
  const index = ENFORCEMENT_MODES.indexOf(mode);
  return index === -1 ? ENFORCEMENT_MODES.length - 1 : index;
}

/** Does this mode stop the command? True from `BLOCK_OVERRIDABLE` upward — the
 *  ramp comparison the header names, written once. */
export function blocks(mode: EnforcementMode): boolean {
  return rigour(mode) >= rigour('BLOCK_OVERRIDABLE');
}

/**
 * May a named person override at this mode? Exactly ONE mode says yes.
 *
 * `OBSERVE` has nothing to override — it never blocked. `BLOCK` is full rigour
 * and an override there would be the relaxation the mode exists to deny. An
 * override recorded at either is INCOHERENT, not merely unusual, and
 * `isCoherentStamp` refuses it.
 */
export function overrideAllowed(mode: EnforcementMode): boolean {
  return mode === 'BLOCK_OVERRIDABLE';
}

/**
 * One step up the ramp. **DERIVED FROM THE ORDER, NOT A SECOND TABLE** — a
 * `Record<EnforcementMode, EnforcementMode>` would state the ramp twice and the
 * two could disagree.
 *
 * `BLOCK` tightens to `BLOCK`: the ceiling is a fixed point, which is what
 * makes the ratchet below terminate rather than needing a special case.
 */
export function tighten(mode: EnforcementMode): EnforcementMode {
  const next: EnforcementMode | undefined = ENFORCEMENT_MODES[rigour(mode) + 1];
  return next ?? mode;
}

// ─── What is governed ────────────────────────────────────────────────────────

/**
 * The checks an enforcement mode may govern. A CLOSED UNION, APPEND-ONLY: a
 * check that is not named here cannot be relaxed, because there is no id to
 * hang a setting on.
 *
 * ⚠️ **REFUSALS ARE NOT IN IT AND NEVER WILL BE.** They are not checks; they
 * are absences. `enforcement.test.ts` asserts the disjointness rather than
 * trusting this sentence.
 */
export const GOVERNED_CHECK_IDS = Object.freeze([
  /** Fact 2 — an inspector looked at the physical seal and ticked it (H2). */
  'halal.seal',
  /** Fact 3 — a halal-class certificate backs the claim at the receipt instant
   *  (`verifyHalalAtReceipt`, H3 — headless until H4). */
  'halal.certificate',
  /** The BPOM lot check on a received line (`bpomOf`, wired at 2B-4b). */
  'bpom.lot',
] as const);

/** The governed check ids as a type. DERIVED from the list. */
export type GovernedCheckId = (typeof GOVERNED_CHECK_IDS)[number];

/**
 * What a governed check ANSWERED. Three members, and the two non-passing ones
 * are the mode's ENTIRE domain:
 *
 *   `PASS`        the question was posed and the answer is satisfactory.
 *   `ADVERSE`     the question was posed and the answer is bad — answered-and-adverse.
 *   `UNANSWERED`  the question was posed and nobody answered it — asked-and-unanswered.
 *
 * ⚠️ **A REFUSAL IS NOT A MEMBER**, and its absence is the boundary named in
 * the header. `UNKNOWN_MATERIAL` and `UNDETERMINED_APPLICABILITY` say the
 * question COULD NOT BE POSED; `UNANSWERED` says it was posed and is
 * outstanding. Folding the first into the second would let a mode relax an
 * absence, which is precisely what nothing may do.
 */
export const GOVERNED_VERDICTS = Object.freeze(['PASS', 'ADVERSE', 'UNANSWERED'] as const);

/** The governed verdicts as a type. DERIVED from the list. */
export type GovernedVerdict = (typeof GOVERNED_VERDICTS)[number];

/**
 * The verdicts an override may act on. Derived by exclusion: you cannot
 * override a `PASS`, because nothing stopped.
 */
export type OverridableVerdict = Exclude<GovernedVerdict, 'PASS'>;

/**
 * Narrow an arbitrary string to a governed verdict. The boundary that makes a
 * widening honest instead of a cast (the `isBidCurrency` precedent) — and the
 * function the refusal test drives: at EVERY mode, both refusal reasons answer
 * `false` here, identically.
 */
export function isGovernedVerdict(value: string): value is GovernedVerdict {
  return (GOVERNED_VERDICTS as readonly string[]).includes(value);
}

/**
 * The refusal shapes that sit OUTSIDE the enforcement domain — **DERIVED FROM
 * THE TWO LOOKUPS' OWN UNIONS, NOT LISTED BESIDE THEM.**
 *
 * The `satisfies` is the census: a third refusal reason added to `halalOf` or
 * `bpomOf` tomorrow fails to compile HERE until somebody consciously places it,
 * so a new absence cannot quietly become a governed verdict. The import is
 * TYPE-ONLY — this module calls neither lookup and acquires no consumer by
 * naming their vocabularies (`complianceView.ts` sets the lib → services
 * type-import precedent).
 */
const REFUSAL_CENSUS = {
  UNKNOWN_MATERIAL: true,
  UNDETERMINED_APPLICABILITY: true,
} as const satisfies Record<HalalRefusalReason | BpomRefusalReason, true>;

/** The refusal shapes, as data, for the disjointness assertions. */
export const REFUSALS_OUTSIDE_ENFORCEMENT: readonly string[] = Object.freeze(
  Object.keys(REFUSAL_CENSUS),
);

// ─── Who acted ───────────────────────────────────────────────────────────────

/**
 * The person who took a recorded act — set a mode, or overrode a verdict.
 *
 * ⚠️ **A NAMED PERSON, NEVER A ROLE.** Two fields rather than one, deliberately:
 * a stable `personId` that survives a rename, and the `displayName` as it stood
 * AT THE MOMENT OF THE ACT, so an audit reads the same in five years. "Buyer"
 * has nowhere to go. See the header for what this shape can and cannot enforce
 * — the real check is E3's session, and `ENF-NO-PERSON-IN-IDENTITY-01` records
 * that the session has no person in it today.
 */
export interface ActingPerson {
  /** The identity that acted. Stable; never a role code. */
  readonly personId: string;
  /** The name as it stood when the act was recorded. Captured, never resolved
   *  at read — a person who leaves must not erase who decided. */
  readonly displayName: string;
}

/**
 * Why an act could not name the person who took it. A CLOSED VOCABULARY, for
 * the same reason `OVERRIDE_REASONS` is one: an absence nobody can count is an
 * absence nobody can fix.
 *
 * ⚠️ **THERE IS NO `SYSTEM` MEMBER, AND THAT IS THE POINT.** "The system did
 * it" is the comfortable label that makes an unattributed act look answered;
 * every member here names a FAILURE TO RESOLVE A HUMAN, which is a thing
 * somebody can go and fix. Both are PROVISIONAL pending operator ratification,
 * on the `OVERRIDE_REASONS` precedent — recorded as decisions TAKEN so that
 * ratifying is agreeing with something written down.
 */
export const UNATTRIBUTED_REASONS = Object.freeze([
  /** Today's state, exactly: `CurrentIdentity` is `{ personaType, supplierId,
   *  supplierName }` and the portal has no notion of a person at all
   *  (`ENF-NO-PERSON-IN-IDENTITY-01`). */
  'NO_PERSON_IN_SESSION',
  /** F1 identity exists and did not answer. A DIFFERENT fact from the above —
   *  one is a missing capability, the other a failing one, and collapsing them
   *  would hide the day the first was fixed. */
  'IDENTITY_PROVIDER_UNAVAILABLE',
] as const);

/** The unattributable reasons as a type. DERIVED from the list. */
export type UnattributedReason = (typeof UNATTRIBUTED_REASONS)[number];

/**
 * WHO TOOK A RECORDED ACT — **a discriminated attribution, never a bare name**
 * (the operator's ruling on `ENF-NO-PERSON-IN-IDENTITY-01`; see the header).
 *
 * An act either names a person or says WHY IT CANNOT. There is deliberately no
 * third shape and no optional field: a nullable `person` would let an absence
 * pass every check a presence passes, which is how an anonymous unlock gets
 * written down as an override.
 */
export type ActorAttribution =
  | { readonly kind: 'RESOLVED'; readonly person: ActingPerson }
  | { readonly kind: 'UNATTRIBUTED'; readonly reason: UnattributedReason };

/** The resolved arm, for the places that need the person itself. */
export type ResolvedActor = Extract<ActorAttribution, { kind: 'RESOLVED' }>;

/** Does this act name a person? The ONE predicate the accountability rules read
 *  — `overrideCompletes` and the loosening gate both go through it, so "named"
 *  means the same thing in both places. */
export function isAttributed(actor: ActorAttribution): actor is ResolvedActor {
  return actor.kind === 'RESOLVED';
}

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * Narrow an arbitrary value to an `ActorAttribution` — **the boundary the
 * recording verb must use**, and the third member of the `isEnforcementMode` /
 * `isGovernedCheckId` family. An actor arrives from behind the seam as JSON,
 * and JSON has no discriminated unions.
 *
 * ⚠️ **A MALFORMED ACTOR IS `undefined`, NOT AN UNATTRIBUTED ONE.** Coercing
 * garbage into `UNATTRIBUTED` would give every typo a legitimate-looking
 * absence to hide in, and `UNATTRIBUTED` is a CLAIM — "no person could be
 * resolved, and here is why". The caller refuses instead.
 *
 * A `RESOLVED` actor needs BOTH fields non-empty: a blank `displayName` beside a
 * real `personId` is an audit that reads as nobody in five years, and a blank
 * `personId` is a name that survives nothing.
 */
export function asActorAttribution(value: unknown): ActorAttribution | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const actor = value as Record<string, unknown>;
  if (actor.kind === 'RESOLVED') {
    const person = actor.person as Record<string, unknown> | undefined;
    if (typeof person !== 'object' || person === null) return undefined;
    if (!nonEmptyString(person.personId) || !nonEmptyString(person.displayName)) return undefined;
    return {
      kind: 'RESOLVED',
      person: { personId: person.personId, displayName: person.displayName },
    };
  }
  if (actor.kind === 'UNATTRIBUTED') {
    return (UNATTRIBUTED_REASONS as readonly string[]).includes(actor.reason as string)
      ? { kind: 'UNATTRIBUTED', reason: actor.reason as UnattributedReason }
      : undefined;
  }
  return undefined;
}

// ─── The setting (declared here; seeded, stored and served at E2) ────────────

/**
 * ONE recorded decision about how hard ONE check bites. `FxPin`-shaped: it is
 * a FACT WITH AN AUTHOR AND AN INSTANT, not a constant — which is why it lives
 * behind the seam and not in this file.
 *
 * ⚠️ **`reviewBy` IS REQUIRED (NON-NULL) FOR ANY MODE BELOW `BLOCK`**, and the
 * union below is how: the relaxed arm has `reviewBy: string`, so a relaxation
 * WITHOUT A REVIEW DATE DOES NOT TYPECHECK. It is not a validation somebody can
 * forget to run. At `BLOCK` it may be `null` — full rigour is not a relaxation,
 * so there is nothing to renew.
 *
 * ⚠️ **NOT SEEDED AT E1.** No fixture, no store, no service method. Declaring
 * the shape is E1; supplying values behind `useDataService()` is E2.
 */
export type EnforcementSetting = {
  readonly checkId: GovernedCheckId;
  /**
   * WHO decided — a discriminated attribution, not a bare person (E2 ruling).
   * An UNATTRIBUTED setter may still record a TIGHTENING; a LOOSENING is refused
   * at the recording verb (`enforcement_set_governed`). Not a role, and not
   * "the system".
   */
  readonly setBy: ActorAttribution;
  /** When the decision was recorded (ISO instant). Audit, not expiry. STORE-
   *  ASSIGNED at the moment of the act (the `pinnedAt` discipline): a caller
   *  that could set it could backdate its own audit entry. */
  readonly setAt: string;
} & (
  | {
      readonly mode: RelaxedMode;
      /** The day (ISO `YYYY-MM-DD`) by which this relaxation must be decided
       *  about again. REQUIRED — see above. Past it, the ratchet bites. */
      readonly reviewBy: string;
    }
  | {
      readonly mode: 'BLOCK';
      /** `null` is legal at full rigour and means what it says: there is no
       *  relaxation whose lapse anyone need care about. */
      readonly reviewBy: string | null;
    }
);

// ─── The ratchet (D-ENF-3, ruled) ────────────────────────────────────────────

/**
 * Whether the mode in force is the one that was SET, or one the lapse of
 * `reviewBy` tightened. A stamp carries it so a surface can say WHY it blocked
 * — "this was set to observe and the review date passed" is a different
 * sentence from "this is set to block", and an operator acts on the difference.
 */
export const ENFORCEMENT_MODE_SOURCES = Object.freeze([
  /** The mode is the one a person recorded, unmodified. */
  'AS_SET',
  /** The recorded mode's `reviewBy` has passed and the ratchet tightened it one
   *  step (D-ENF-3). */
  'EXPIRY_TIGHTENED',
  /** E2 — THE LEDGER NAMES NO SETTING FOR THIS CHECK. The mode is the ceiling
   *  because nothing has been decided, which is a different sentence from
   *  "somebody chose full rigour" and an operator acts on the difference. */
  'NO_SETTING_RECORDED',
  /** E2 — a setting exists and names a mode THIS BUILD DOES NOT KNOW. Ranked at
   *  the ceiling per the class rule; named separately so the ledger being
   *  unreadable is never mistaken for the ledger being strict. */
  'UNRECOGNISED_MODE',
  /** E2 — an override was attempted by an UNATTRIBUTED actor, so it could not
   *  complete and the mode fell through to the ceiling (the operator's ruling on
   *  `ENF-NO-PERSON-IN-IDENTITY-01`). */
  'UNATTRIBUTED_OVERRIDE',
] as const);

/**
 * WHY the mode in force is the mode in force. DERIVED from the list.
 *
 * ⚠️ **EVERY MEMBER NAMES A DIFFERENT REASON AND NONE OF THEM OVERSTATES.** The
 * rule this vocabulary obeys is the one E1 recorded at the ceiling: a `BLOCK`
 * whose review lapsed reads `AS_SET`, because reporting `EXPIRY_TIGHTENED`
 * would ANNOUNCE AN EVENT THAT DID NOT OCCUR. Three of the five modes below
 * would collapse into a single "it blocked" if they shared a source — and a
 * provenance field that overstates is worse than an absent one, because it is
 * actionable.
 */
export type EnforcementModeSource = (typeof ENFORCEMENT_MODE_SOURCES)[number];

/** The mode actually in force at an instant, and where it came from. */
export interface EffectiveEnforcement {
  readonly mode: EnforcementMode;
  readonly source: EnforcementModeSource;
}

/** An ISO calendar day. `reviewBy` is a DAY, not an instant: a review is due by
 *  a date, and a relaxation that expired at 14:32 would be unexplainable. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is this a readable ISO calendar day? The `reviewBy` boundary, exported so the
 * RECORDING verb and the RATCHET hold a review date to ONE standard — the
 * `confirmedQtyWithinBounds` discipline: one expression of the rule, the policy
 * as law and the reader as the consumer that must never see a value it refused.
 *
 * Shape AND readability, both: `'2026-13-45'` matches the pattern and is not a
 * date, and a `reviewBy` that never arrives is a relaxation that never lapses.
 */
export function isReviewDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_DAY.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

/**
 * Has the review date passed at `dispatchInstant`?
 *
 * The comparison is lexicographic over `YYYY-MM-DD`, the house convention
 * (`complianceProjection.ts`), and it is STRICTLY GREATER: a review due BY the
 * 30th is still in force ON the 30th and lapses on the 31st. Both boundaries
 * are pinned in the suite, because "past reviewBy" has two defensible readings
 * and an unstated one is a defect waiting for a timezone.
 *
 * ⚠️ **UNREADABLE IS LAPSED.** A malformed `reviewBy` or `dispatchInstant`
 * tightens rather than holds — the `isStalePin` discipline: an unparseable date
 * is not evidence that a relaxation is still current, and defaulting to "in
 * force" would make a typo into a silent relaxation. Fail closed.
 *
 * ⚠️ **AND A MISSING `reviewBy` ON A RELAXED SETTING IS LAPSED TOO**, which is
 * the type rule made to bite AT RUNTIME as well. The type forbids it, but the
 * setting arrives from behind a seam at E2 and a type guarantee is only as
 * strong as the authoring on the other side. Absent on `BLOCK` is legal and
 * means nothing to renew; absent on a relaxation is a malformed record, and a
 * malformed relaxation tightens rather than becoming a permanent one.
 */
function reviewLapsed(setting: EnforcementSetting, dispatchInstant: string): boolean {
  const reviewBy: string | null | undefined = setting.reviewBy;
  if (reviewBy === null || reviewBy === undefined) return setting.mode !== 'BLOCK';
  const day = dispatchInstant.slice(0, 10);
  // ONE standard for a review date, shared with the recording verb (E2): the
  // policy refuses to WRITE what this refuses to READ, so a date can never be
  // recordable and unreadable at once.
  if (!isReviewDay(reviewBy) || !isReviewDay(day)) return true;
  return day > reviewBy;
}

/**
 * THE MODE IN FORCE at `dispatchInstant` — the setting as recorded, or one step
 * stricter if its review date has passed.
 *
 * **THE RATCHET (D-ENF-3, RULED).** Past `reviewBy` the effective mode TIGHTENS
 * ONE STEP — `OBSERVE` → `BLOCK_OVERRIDABLE` → `BLOCK` — and stays there until
 * a NEW RECORDED ACT renews or ratchets it. One step, not a hard stop, and not
 * a decay ladder: a calendar lapse must not close a dock, so a relaxation
 * degrades by one notch and no further however long it is left. But
 *
 *   NO RELAXATION MAY OUTLIVE THE LAST DELIBERATE DECISION ABOUT IT.
 *
 * ⚠️ A pure function, and `dispatchInstant` is ALWAYS supplied by the caller —
 * see the law-0.5 note in the header. Ten years past a review date is EXACTLY
 * ONE STEP, which is the property that makes this deterministic rather than
 * merely repeatable; the suite pins it at both boundaries and at ten years.
 *
 * `source` names whether the returned mode DIFFERS from the recorded one, so
 * `BLOCK` with a lapsed review reads `AS_SET`: nothing was tightened, because
 * the ceiling is a fixed point.
 */
export function effectiveMode(
  setting: EnforcementSetting,
  dispatchInstant: string,
): EffectiveEnforcement {
  if (!reviewLapsed(setting, dispatchInstant)) {
    return { mode: setting.mode, source: 'AS_SET' };
  }
  const tightened = tighten(setting.mode);
  return tightened === setting.mode
    ? { mode: setting.mode, source: 'AS_SET' }
    : { mode: tightened, source: 'EXPIRY_TIGHTENED' };
}

// ─── E2 · the ledger (append-only; effective DERIVED — the `effectivePin` shape)

/**
 * THE SETTING IN FORCE for one check — the LAST recorded one, which is what
 * "supersedes" means on an append-only ledger. Derived, never stored.
 *
 * `effectivePin` EXACTLY, including the tie-break: ordered by `setAt`, with
 * LATER ARRAY POSITION winning a tie, because two acts recorded in the same
 * millisecond are ordered by the sequence they were appended in and that is the
 * only ordering that exists at that resolution.
 *
 * ⚠️ **THE KEY IS `checkId` ALONE (D1, ruled), AND WIDENING IT IS ADDITIVE.**
 * The ledger is a FLAT ARRAY, deliberately not `Record<GovernedCheckId, …>` —
 * the `fxPin` header's own words, "an APPEND-ONLY LEDGER, not a map keyed by
 * currency". A map would bake one field into the shape of the store; an array
 * bakes nothing, so adding a dimension (supplier · plant · material) later
 * changes exactly TWO expressions — the predicate on the next line and the
 * comparator below it — and no stored record and no call site. That is why the
 * cost of not foreclosing D1 here is nil.
 */
export function settingInForce(
  ledger: readonly EnforcementSetting[] | undefined,
  checkId: GovernedCheckId,
): EnforcementSetting | undefined {
  if (!ledger) return undefined;
  let winner: EnforcementSetting | undefined;
  for (const setting of ledger) {
    if (setting.checkId !== checkId) continue;
    if (!winner || setting.setAt >= winner.setAt) winner = setting;
  }
  return winner;
}

/**
 * Every setting ever recorded for a check, in ledger order — the superseded acts
 * the append-only rule preserves. `pinHistory`'s twin, and it exists for the same
 * reason: so "the prior decision is kept" is a READABLE FACT rather than a claim.
 *
 * ⚠️ This is what a mutable current-setting record would have destroyed. The
 * ratchet tightens against a `reviewBy`; overwrite the record and the date it
 * tightened against is gone, so THE RATCHET BECOMES UNAUDITABLE — you can see
 * that it bit and never why.
 */
export function settingHistory(
  ledger: readonly EnforcementSetting[] | undefined,
  checkId: GovernedCheckId,
): readonly EnforcementSetting[] {
  return (ledger ?? []).filter((s) => s.checkId === checkId);
}

/**
 * THE MODE IN FORCE for a check at an instant, read off the whole ledger. The
 * one function a gate at E3 would call, and the only place the three
 * "maximum rigour" fall-throughs live.
 *
 * ⚠️ **AN EMPTY LEDGER IS THE CEILING, NOT A HOLE.** No recorded setting means
 * nothing has been relaxed, so the mode is `MAXIMUM_RIGOUR` and the source says
 * `NO_SETTING_RECORDED` — never `AS_SET`, because nobody set it. This is why
 * seeding nothing (D-ENF-4 is UNRULED) does not leave the system undefended: the
 * un-governed state IS the strict state.
 *
 * ⚠️ **AN UNRECOGNISED MODE RANKS AT THE CEILING** — the class rule
 * (`ENF-UNKNOWN-MODE-FAILS-OPEN-01`), applied at the seam where it matters. The
 * ledger arrives from behind `useDataService()` as JSON, and JSON has no unions;
 * a typo in a stored mode must mean MAXIMUM rigour, never minimum. It is named
 * separately from `NO_SETTING_RECORDED` because "unreadable" and "undecided" are
 * different problems with different fixes.
 */
export function effectiveEnforcement(
  ledger: readonly EnforcementSetting[] | undefined,
  checkId: GovernedCheckId,
  dispatchInstant: string,
): EffectiveEnforcement {
  const setting = settingInForce(ledger, checkId);
  if (!setting) return { mode: MAXIMUM_RIGOUR, source: 'NO_SETTING_RECORDED' };
  if (!isEnforcementMode(setting.mode)) {
    return { mode: MAXIMUM_RIGOUR, source: 'UNRECOGNISED_MODE' };
  }
  return effectiveMode(setting, dispatchInstant);
}

// ─── The stamp ───────────────────────────────────────────────────────────────

/**
 * Why a named person overrode an adverse or unanswered verdict. A CLOSED
 * VOCABULARY, and the closure is the point: free text is where "we were in a
 * hurry" goes to look like a reason, and a reason nobody can count is a reason
 * nobody can review.
 *
 * ⚠️ **NO CATCH-ALL MEMBER.** There is no `OTHER`, and the suite asserts there
 * is none — one `OTHER` collapses a closed vocabulary into free text wearing an
 * enum's clothes.
 *
 * ⚠️ **ALL FOUR ARE PROVISIONAL — strategist-ruled, pending operator
 * ratification** (`ENF-OVERRIDE-VOCAB-PROVISIONAL-01`, `docs/findings.md`), on
 * the `sdc/halal.ts` precedent: recorded as a decision TAKEN so that
 * ratification is an act of agreeing with something written down, rather than
 * discovering what the code quietly assumed. They are chosen to be four
 * DIFFERENT OPERATOR BEHAVIOURS, not four shades of "allowed anyway".
 */
export const OVERRIDE_REASONS = Object.freeze([
  /** The evidence exists and the portal cannot see it — the R0.1 corpus hole.
   *  Chase the document into the system; the lot is not the problem. */
  'EVIDENCE_HELD_OUTSIDE_PORTAL',
  /** The certifying body was contacted directly and confirmed. Somebody did the
   *  work out of band; record who and move on. */
  'CERTIFIER_CONFIRMED_DIRECTLY',
  /** Received into quarantine, NOT released. The check stays outstanding and
   *  the goods do not move — an override of the block, not of the question. */
  'ACCEPTED_TO_QUARANTINE',
  /** A named person accepted the exposure. The uncomfortable one, and it is in
   *  the list precisely so that it must be NAMED rather than disguised as one
   *  of the other three. */
  'COMMERCIAL_RISK_ACCEPTED',
] as const);

/** The override reasons as a type. DERIVED from the list. */
export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

/**
 * A recorded override of ONE verdict.
 *
 * `overriddenVerdict` is not redundant with the stamp's `verdict`: an override
 * authorises the overriding of ONE SPECIFIC ADVERSE ANSWER, never of the check
 * in general. The stamp type binds the two at COMPILE TIME (see
 * `GovernedCheckStamp`), so an override that names a different verdict than the
 * one stamped cannot be written down at all.
 *
 * ⚠️ **`overriddenAt` LANDED AT E2 (D4, ruled).** An override is A DATED ACT OF
 * ACCOUNTABILITY and inherits nothing — not the stamp's context, not the
 * command's. E1 had no clock and no caller to take the instant from; E2 has the
 * store, which assigns it at the moment of the act exactly as `pinnedAt` is
 * assigned. It never comes from a payload and it is never read inside this
 * module.
 */
export interface EnforcementOverride<V extends OverridableVerdict = OverridableVerdict> {
  /**
   * WHO — a discriminated attribution (the operator's ruling on
   * `ENF-NO-PERSON-IN-IDENTITY-01`). An `UNATTRIBUTED` override is RECORDABLE
   * and does not COMPLETE: `overrideCompletes` is false and
   * `effectiveWithOverride` falls the mode through to the ceiling. Recordable on
   * purpose — the attempt happened, and erasing it would relax honesty to spare
   * a blush.
   */
  readonly overriddenBy: ActorAttribution;
  readonly reason: OverrideReason;
  /** THE EXACT VERDICT OVERRIDDEN. Bound to the stamp's own verdict by type. */
  readonly overriddenVerdict: V;
  /** WHEN the override was recorded (ISO instant) — D4. Store-assigned at the
   *  act, never payload-supplied. */
  readonly overriddenAt: string;
}

/**
 * Does this override actually take effect?
 *
 *   **AN UNATTRIBUTED OVERRIDE CANNOT COMPLETE** (operator ruling). An
 *   override's ENTIRE VALUE IS ACCOUNTABILITY — this named person accepted this
 *   risk on this date — so one that cannot be attributed is not an override.
 *
 * Today this returns `false` for every override E3 could construct, because
 * `CurrentIdentity` has no person in it. THAT IS THE DESIGN: the lane is fully
 * built and visibly unusable until identity exists, which makes the gap create
 * pressure instead of being papered over.
 */
export function overrideCompletes(override: EnforcementOverride): boolean {
  return isAttributed(override.overriddenBy);
}

/**
 * The mode in force once an attempted override is taken into account.
 *
 * Three cases, and only the third moves anything: no override → unchanged; a
 * COMPLETING override → unchanged (whether it may be honoured at this mode is
 * `overrideAllowed`, a separate question this function does not answer); a
 * NON-COMPLETING override → `MAXIMUM_RIGOUR`, sourced `UNATTRIBUTED_OVERRIDE`.
 *
 * ⚠️ The source is not cosmetic. A surface must be able to say "this blocked
 * because nobody could be named", which is a fixable sentence, rather than "this
 * is set to block", which is not.
 */
export function effectiveWithOverride(
  effective: EffectiveEnforcement,
  override: EnforcementOverride | undefined,
): EffectiveEnforcement {
  if (override === undefined || overrideCompletes(override)) return effective;
  return { mode: MAXIMUM_RIGOUR, source: 'UNATTRIBUTED_OVERRIDE' };
}

/** The fields every stamp carries, whatever it answered. */
interface GovernedCheckStampBase {
  readonly checkId: GovernedCheckId;
  /** The mode IN FORCE when the check ran — the `effectiveMode` result, not the
   *  recorded setting. A stamp that carried the setting would be unable to
   *  explain a block the ratchet caused. */
  readonly mode: EnforcementMode;
  /** Whether that mode was as-set or tightened by a lapsed review. */
  readonly modeSource: EnforcementModeSource;
}

/**
 * The stamp for ONE verdict, with the override bound to THAT verdict.
 *
 * Distributed over `GovernedVerdict` below rather than written as a hand-listed
 * union, so a fourth verdict cannot arrive without an override rule: `PASS`
 * gets `override?: never` (there is nothing to override), and every overridable
 * verdict gets an override whose `overriddenVerdict` is that same literal.
 */
type StampFor<V extends GovernedVerdict> = GovernedCheckStampBase & {
  readonly verdict: V;
  readonly override?: V extends OverridableVerdict ? EnforcementOverride<V> : never;
};

/**
 * WHAT A GOVERNED CHECK RECORDED — the artifact that makes a relaxation honest.
 * It names the check, what it answered, the mode that was in force, where that
 * mode came from, and — if a person overrode it — who, why, and exactly what
 * they overrode. **A stamp is written at every mode, including `OBSERVE`.**
 * That is the whole difference between relaxing enforcement and relaxing
 * honesty.
 *
 * The distributive conditional gives a union of three arms, one per verdict, so
 * these do not typecheck:
 *   · a `PASS` stamp carrying an override;
 *   · an `ADVERSE` stamp whose override names `overriddenVerdict: 'UNANSWERED'`.
 *
 * The one rule the TYPE cannot express — that an override is coherent only at
 * `BLOCK_OVERRIDABLE`, because `mode` and `override` are independent fields —
 * is `isCoherentStamp`, and it is pinned separately.
 */
export type GovernedCheckStamp = StampPerVerdict<GovernedVerdict>;

/** The distribution itself: a naked type parameter in a conditional, which is
 *  what makes TypeScript build ONE ARM PER VERDICT instead of collapsing the
 *  union and losing the binding. */
type StampPerVerdict<V extends GovernedVerdict> = V extends GovernedVerdict
  ? StampFor<V>
  : never;

/**
 * Is this stamp internally coherent? The check the type cannot make.
 *
 * An override is legal at EXACTLY ONE mode (`overrideAllowed`): under `OBSERVE`
 * nothing blocked, so there was nothing to override and an override there would
 * dress a relaxation as a deliberate act; under `BLOCK` an override is the
 * relaxation full rigour exists to deny. Everything else the shape needs — a
 * `PASS` cannot carry one, and an override cannot name a verdict other than the
 * stamped one — is already impossible to write.
 *
 * ⚠️ **E2 SPLIT THE RULE IN TWO, because the ruling created a second legal
 * shape.** A COMPLETING override is legal at exactly one mode, as before. A
 * NON-COMPLETING one (unattributed) leaves the ceiling in force and says so —
 * so `mode: BLOCK` beside a refused override is COHERENT, and it is the only
 * mode that is. Any other pairing claims an outcome the fall-through did not
 * produce.
 *
 * ⚠️ Returns a boolean and refuses nothing on its own. THE ENFORCEMENT OF THIS
 * RULE IS THE CALLER'S, AND THE CALLER IS E3 — a predicate in a headless module
 * cannot stop anybody, and pretending otherwise is the kind of claim this lane
 * exists to avoid.
 */
export function isCoherentStamp(stamp: GovernedCheckStamp): boolean {
  if (stamp.override === undefined) return true;
  if (overrideCompletes(stamp.override)) return overrideAllowed(stamp.mode);
  return stamp.mode === MAXIMUM_RIGOUR && stamp.modeSource === 'UNATTRIBUTED_OVERRIDE';
}
