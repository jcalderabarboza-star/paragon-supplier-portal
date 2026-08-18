// ────────────────────────────────────────────────────────────────────────────
// Transition Schema (v2.2 Step 3.1) — TMS-shape, adapted.
//
// A declarative, data-only description of an entity state machine. The
// dispatcher (Step 3.4) reads these definitions to validate and execute
// commands; NO dispatch logic lives here — this module is TYPES ONLY plus one
// type-level law guard. Validation (runtime) lives in `validate.ts`; the loader
// registry (`getKnownFlows`) lives in `registry.ts`.
//
// Law 0.5 (DR-8, computed-never-stored): clock-derived states
// (Expiring / Expired / Overdue / Upcoming …) are COMPUTED AT READ TIME from
// dates. They are never stored, never commanded, and never appear in a
// transition table. Enforced below at the TYPE LEVEL — a `clock` trigger is a
// compile error.
// ────────────────────────────────────────────────────────────────────────────

/**
 * How a transition fires.
 * - `user`     — a persona explicitly commands it (PO confirm, invoice submit).
 * - `system`   — an upstream/integration event drives it (SAP posts, GR settles).
 * - `cascade`  — another transition's completion fans out into this one
 *                (RFQ Award → losing quotations Rejected).
 * - `creation` — the entity comes into existence in this state (empty `from`).
 *
 * `clock` is DELIBERATELY ABSENT. Clock-derived states are read-time projections
 * (law 0.5), never transitions. See the compile-time guard below.
 *
 * ⚠️ **THIS FIELD IS PROVENANCE. IT DOES NOT SAY WHETHER A SCREEN OFFERS THE
 * ACT — read `surfaceable` for that, and never infer one from the other.**
 * For most of the tree the two agree, and *mostly* is exactly the problem: a
 * field right three times in four earns trust it cannot hold. The proof is the
 * `sapBoundary` population, which is TWO transitions and disagrees with itself
 * — `t_gr_post` is `system` and `t_invoice_release_payment` is `user`, and both
 * are the same panel-terminal button a buyer clicks. `system` also settles a
 * question about THE SEAM, not about the act: `t_asn_deliver` is `system`
 * because a carrier feed would drive it, so `system` currently means "not by a
 * Paragon human AT THIS SEAM" — which is why a supplier-portal act can read as
 * system-driven while a supplier does it. That is a real distinction and it is
 * not the one this field's name implies. §50.
 */
export type TransitionTrigger = 'user' | 'system' | 'cascade' | 'creation';

// — Law 0.5 compile-time guard ───────────────────────────────────────────────
// If `clock` ever leaks into TransitionTrigger, `Extract<…, 'clock'>` resolves
// to `'clock'` (not `never`) and this alias violates its `extends never`
// constraint → `tsc --noEmit` (the build gate) fails. This is the type-level
// enforcement the plan requires (Step 3.1 / law 0.5). Lives in a non-test `src`
// file deliberately: tsconfig.json (the build's tsc) excludes `*.test.ts`.
type AssertNever<T extends never> = T;
export type ClockTriggerIsForbidden = AssertNever<
  Extract<TransitionTrigger, 'clock'>
>;

/**
 * A namespaced transition-role, `<namespace>:<role>` (e.g. `po:confirm`).
 * The persona→transition-role mapping is DATA (Step 3.7); Phase 4′ OIDC swaps
 * that mapping, never these metadata strings. Format-validated in `validate.ts`.
 */
export type TransitionRole = string;

/**
 * A stable, human-legible transition id, `t_<entity>_<verb>` (e.g. `t_po_confirm`).
 * Stable across schema versions and globally unique. Format-validated at runtime.
 */
export type TransitionId = string;

/**
 * A REGISTERED policy-hook name (never a closure). Resolved to a function by the
 * dispatcher (Step 3.4); kept as a name so definitions stay serialisable and
 * inspectable. Validated against the registry in `policyHooks.ts`.
 */
export type PolicyHookName = string;

/**
 * WHY AN ACT HAS NO SCREEN. Three reasons, and they have different futures —
 * which is the whole reason a bare `false` was refused (operator ruling, §50).
 *
 * - `external-fact`     — something outside Paragon reports it (a carrier feed,
 *                         S/4HANA, a bank remittance). No screen is possible
 *                         because no person here initiates it.
 * - `computed`          — the platform derives it from what it already holds (a
 *                         match verdict, a cascade, a deadline elapsing). There
 *                         is nothing to click.
 * - `ruled-unsurfaced`  — a person COULD initiate it and a STANDING RULING
 *                         refuses the screen. The `why` cites the ruling, and
 *                         **lifting that ruling is what changes this value** —
 *                         which is what separates it from `surfaced: true` on
 *                         an act that simply has not been built yet.
 */
export type NotSurfacedReason = 'external-fact' | 'computed' | 'ruled-unsurfaced';

/**
 * DOES THE PLATFORM INTEND A SCREEN FOR THIS ACT AT ALL — a DESIGN-TIME
 * question, and the axis nothing in this schema modelled before §50.
 *
 * ⚠️ **NOT "MAY THIS ACTOR DO IT NOW".** Role, scope, precondition and required
 * fields are answered by the DISPATCHER AT REQUEST TIME and are already
 * modelled. This says only whether the act is one a human is ever meant to
 * initiate through a Paragon surface.
 *
 * ⚠️ **`surfaced: true` DOES NOT MEAN A SCREEN EXISTS TODAY.** It means one is
 * intended. An intended act with no screen yet is the gap census
 * (`USER-VERBS-WITHOUT-SURFACES-01`, §49g) and it must stay visible as a gap —
 * so the gate asserts ONE direction only: everything DISPATCHED is surfaceable.
 * The converse would demand a screen for every intended act on the day it is
 * declared, and would turn a truthful backlog into a red build.
 *
 * ⚠️ **DELIBERATELY KEYED ON THE VERB, NEVER ON (verb, state).** Keying it per
 * state would let `t_po_confirm` — surfaceable, and offered from 2 of its 3
 * declared from-states — DECLARE ITS OWN LIVE DEFECT CORRECT, and the census
 * that found it could never find it again. A field that lets a defect declare
 * itself correct is worse than no field. The verb-level form is exact only
 * while every `requiredRole` maps to ONE persona; that is true of all 46 user
 * verbs today, NOTHING IN THIS SCHEMA ENFORCES IT, and the gate therefore
 * ASSERTS it rather than assuming it.
 */
export type Surfaceability =
  | { readonly surfaced: true }
  | {
      readonly surfaced: false;
      readonly because: NotSurfacedReason;
      /** The reason, stated. An empty one is an omission wearing a row's clothes. */
      readonly why: string;
    };

/** One transition (edge) in a flow. */
export interface TransitionDef {
  /** Stable id, `t_<entity>_<verb>`. Globally unique across all flows. */
  readonly id: TransitionId;
  /** Source states. EMPTY for `creation`; NON-EMPTY otherwise. */
  readonly from: readonly string[];
  /** Target state (∈ the flow's declared states). */
  readonly to: string;
  /** WHAT FIRES IT — provenance only. Not the surface: read `surfaceable`. */
  readonly trigger: TransitionTrigger;
  /**
   * WHETHER A PARAGON SURFACE IS EVER MEANT TO OFFER THIS ACT. Required on
   * every transition — a member that cannot exist without a value (E1/GL-0) —
   * and **authored per verb, never seeded from `trigger`**: the two disagree,
   * and seeding would have manufactured the disagreements and called them
   * derived. §50 lists every disagreement explicitly.
   */
  readonly surfaceable: Surfaceability;
  /** Namespaced transition-role permitted to fire it. */
  readonly requiredRole: TransitionRole;
  /** Command-payload field names that must be present (validated at dispatch). */
  readonly requiredFields: readonly string[];
  /** Policy hooks by REGISTERED NAME (never closures). Validated vs the registry. */
  readonly policyHooks: readonly PolicyHookName[];
  /**
   * True when this transition crosses the SAP integration boundary (e.g. GR
   * "Posted to SAP"). Such commands settle asynchronously: the dispatcher
   * returns `submitted` (not `done`) and the real system reference lands on
   * settlement (Step 3.5). Optional; absent ⇒ synchronous (`done`).
   */
  readonly sapBoundary?: boolean;
  /**
   * WHERE SETTLEMENT LANDS THE ENTITY — **required exactly when `sapBoundary`
   * is set, and forbidden otherwise** (PF-0 · D-2, operator ruling). Validated
   * ∈ the flow's states.
   *
   * ⚠️ **WHY THIS IS DECLARED DATA AND NOT A COMMENT.** An Option-B verb parks
   * the entity in an INTERIM state (`Posting to SAP`, `Releasing Payment`) and
   * `settle()`'s finalize advances it to the settled one — inside the adapter,
   * **outside the declared machine**. So the declaration was TRUE AND
   * INCOMPLETE: a graph derived from it renders `Posted to SAP` unreachable and
   * `Posting to SAP` exit-less, and **both readings are correct about the
   * declaration** while being wrong about the system. The fix is to make the
   * declaration honest, not to exempt the reader.
   *
   * It does not change dispatch. The dispatcher still returns `submitted`, the
   * adapter still owns the finalize; this field states, in data a build can
   * check, where that finalize is contracted to land.
   */
  readonly settlesTo?: string;
  /**
   * True when this transition RECORDS A FACT without moving the entity (2e-c-3).
   * The dispatcher applies it with the entity's CURRENT state, so `to` is never
   * written; validation requires `to ∈ from` so the declaration stays truthful
   * about where the entity ends up.
   *
   * Why the flag rather than `to: <the same state>`: such a verb is legal from
   * SEVERAL resting states (an FX pin may be recorded on an Open or a Closed
   * RFQ) and `to` is a single value, so any concrete choice would move the
   * entity for the other from-states. Declaring `from: ['Open','Closed'], to:
   * 'Open'` would quietly reopen a Closed RFQ every time a buyer pinned a rate.
   *
   * The alternative — routing metadata around the dispatcher — was rejected: it
   * is the only path to the DR-10 audit trail, and a governed fact recorded
   * outside the trail is exactly what the trail exists to prevent.
   *
   * Optional; absent ⇒ an ordinary state-moving transition.
   */
  readonly statePreserving?: boolean;
  /** Schema version of this transition definition. Positive integer. */
  readonly version: number;
}

/** A complete state machine for one entity. */
export interface FlowDefinition {
  /** Machine key, e.g. `purchaseOrder`. Unique across the registry. */
  readonly entity: string;
  /** Every declared state (the machine's alphabet). Transition-states only —
   *  clock-derived display states (Expiring/Expired/…) are NOT listed here. */
  readonly states: readonly string[];
  /** The state a freshly-created entity lands in (∈ `states`). */
  readonly initial: string;
  /**
   * THE STATES THIS MACHINE DECLARES AS ENDINGS (⊆ `states`) — **REQUIRED, and
   * an empty array is a legal, meaningful answer** (PF-0 · D-2, operator).
   *
   * ⚠️ **TERMINAL-NESS IS THE ONE INTENT A GRAPH CANNOT INFER.** "Nothing
   * leaves this state" is the same SHAPE for an ending and for a hole: `Awarded`
   * and `Quality Hold` are indistinguishable in the edge set, and only an author
   * knows which is which. So it is declared, and validated BOTH WAYS —
   * declared-terminal ⇒ no exit (`validate.ts`), and no-exit ⇒ declared-terminal
   * or censused (`flowGraph.test.ts`). A flow cannot buy silence by declaring a
   * live state terminal, and cannot leave a hole unnamed.
   *
   * **REQUIRED rather than optional, deliberately:** an optional field is
   * omitted on exactly the flows whose endings nobody thought about, which are
   * the flows this exists for. `[]` says *this machine declares no ending* —
   * which is true of the ASN flow today, and worth being able to read.
   */
  readonly terminals: readonly string[];
  /** Every transition (edge). */
  readonly transitions: readonly TransitionDef[];
  /** Schema version of the flow. Positive integer. */
  readonly version: number;
}
