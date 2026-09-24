// ─────────────────────────────────────────────────────────────────────────────
// THE SEEDS' ACTORS — a sample person as an `ActorAttribution`, ready to sit on
// a `QueryScope`.
//
// ⚠️ **THIS EXISTS SO A SEED NAMES A ROSTER MEMBER RATHER THAN A STRING.** A
// seed could write `{ kind: 'RESOLVED', person: { personId: 'sim-usr-…' } }`
// inline, and the id would then be a LITERAL in a fixture — free to drift from
// the roster the day a row is renamed, with nothing red in between. Every value
// here is derived by LOOKING THE PERSON UP, so a roster row that disappears
// takes its seed actor down with it at module load rather than at read.
//
// ⚠️ **AND THE LOOKUP THROWS RATHER THAN FALLING BACK.** A missing person is a
// build-time fact about this tree, not a runtime condition to degrade through:
// falling back to `NO_PERSON` would silently un-attribute a seeded corpus and
// take both four-eyes directions with it, and the suite would go green on a
// demonstration that no longer demonstrates anything.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import { resolveSamplePerson } from './sampleRoster';

const actorFor = (personId: string): ActorAttribution => {
  if (resolveSamplePerson(personId) === undefined) {
    throw new Error(
      `sampleActors: '${personId}' is not on the sample roster. A seed must name a ` +
        'roster member — an id that resolves to nobody would attribute a seeded ' +
        'record to a person this portal does not have (C10 §6.3).',
    );
  }
  return { kind: 'RESOLVED', person: { personId } };
};

/**
 * The seed actors, by the role they are named for.
 *
 * ⚠️ **`procurement1` RAISES ON BOTH LANES AND DECIDES ON NEITHER.** That is the
 * property the four-eyes probes rest on: one demo seat can reach the REFUSED
 * direction of `PSL_DECIDER_NOT_PROPOSER` and of
 * `MATERIALREQUEST_DECIDER_NOT_REQUESTER` by narrowing to the deciding lane,
 * and the ADMITTED direction needs a genuinely different person on each.
 */
export const SAMPLE_ACTORS = Object.freeze({
  procurement1: actorFor('sim-usr-procurement-1'),
  procurement2: actorFor('sim-usr-procurement-2'),
  compliance1: actorFor('sim-usr-compliance-1'),
  planning1: actorFor('sim-usr-planning-1'),
});
