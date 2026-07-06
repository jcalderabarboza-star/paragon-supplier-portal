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

/** One transition (edge) in a flow. */
export interface TransitionDef {
  /** Stable id, `t_<entity>_<verb>`. Globally unique across all flows. */
  readonly id: TransitionId;
  /** Source states. EMPTY for `creation`; NON-EMPTY otherwise. */
  readonly from: readonly string[];
  /** Target state (∈ the flow's declared states). */
  readonly to: string;
  /** What fires it. `clock` is type-level impossible (law 0.5). */
  readonly trigger: TransitionTrigger;
  /** Namespaced transition-role permitted to fire it. */
  readonly requiredRole: TransitionRole;
  /** Command-payload field names that must be present (validated at dispatch). */
  readonly requiredFields: readonly string[];
  /** Policy hooks by REGISTERED NAME (never closures). Validated vs the registry. */
  readonly policyHooks: readonly PolicyHookName[];
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
  /** Every transition (edge). */
  readonly transitions: readonly TransitionDef[];
  /** Schema version of the flow. Positive integer. */
  readonly version: number;
}
