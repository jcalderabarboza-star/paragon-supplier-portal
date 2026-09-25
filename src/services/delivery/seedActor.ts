// ─────────────────────────────────────────────────────────────────────────────
// THE SEED ACTOR — who took the acts that were never taken.
//
// Every release in this lane's fixtures is produced by the REAL pure verb
// (`releaseScheduleLines`) at module load, with an injected stamp. That is the
// lane's strongest honesty property and it is not being changed: a seeded
// released line is a line the verb really released, not a hand-stamped
// `state: 'released'`.
//
// ⚠️ **BUT A FIXTURE IS NOT A SEAT, AND THE ATTRIBUTION MUST SAY SO.** Once the
// verbs carry `ActorAttribution`, a seeded act needs a value, and there are
// exactly two honest options: name nobody, or invent somebody. Inventing a
// person would put a `RESOLVED` actor into seed data — C10 §6.3's MANUFACTURED
// PROVENANCE, arriving through the one door that has no dispatcher in front of
// it — and the change-history view would then render a name for an act no
// person took.
//
// So seeded acts are `UNATTRIBUTED: NO_PERSON_IN_SESSION`, which is literally
// true of them: they happened at import, in no session, with no person. The
// history view renders them with no actor, and that reads as the absence it is.
//
// ⚠️ **THIS IS NOT A BACK DOOR FOR THE DISPATCHER'S ATTRIBUTION RULE.** The rule
// (`DELIVERY_ACTOR_ATTRIBUTED`) refuses an unattributed SEAT at dispatch time.
// Nothing here dispatches; these values are assembled before any session exists.
// The two are not in tension — they are the two halves of one sentence: *a
// recorded act names its actor, and an act nobody took names nobody.*
// ─────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';

/**
 * The attribution stamped on every act performed while building the fixtures.
 *
 * Deliberately the SAME shape the dispatcher refuses at runtime, so a spec can
 * assert the difference rather than infer it: no seeded line carries a
 * `RESOLVED` actor, and no dispatched act carries an `UNATTRIBUTED` one.
 */
export const DELIVERY_SEED_ACTOR: ActorAttribution = Object.freeze({
  kind: 'UNATTRIBUTED',
  reason: 'NO_PERSON_IN_SESSION',
} as const);
