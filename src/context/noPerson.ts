import type { ActorAttribution } from '../lib/enforcement';

/**
 * ⚠️ **THE SEAT'S ACTOR TODAY, AND IT IS A MEASURED FACT RATHER THAN A STUB.**
 *
 * `CurrentIdentity` is `{ personaType, supplierId, supplierName }` plus roles —
 * the portal contains NO PERSONS (`ENF-NO-PERSON-IN-IDENTITY-01`). The
 * corporate IdP owns Paragon staff person identity (Stage F1) and supplier-side
 * person identity is UNPROCURED (D-ID-2, OPEN). So every act this portal
 * dispatches is unattributable, and `UNATTRIBUTED` is a CLAIM the platform is
 * entitled to make: *a human acted and could not be resolved, and here is why*.
 *
 * ⚠️ **`NO_PERSON_IN_SESSION` RATHER THAN A `SYSTEM` REASON, AND THE ABSENCE OF
 * A `SYSTEM` MEMBER IS THE MECHANISM.** Every member of `UNATTRIBUTED_REASONS`
 * names a FAILURE SOMEBODY CAN GO AND FIX; "the system did it" is the
 * comfortable label that makes an unattributed act look answered, and it would
 * give every unresolvable act a respectable place to sit. The count would stop
 * meaning anything, which is the only reason anybody would ever fix it.
 *
 * ⚠️ **AND IT IS NOT A FIXTURE PERSON.** C10 §6.3 reserves `sim-usr-*` for demo
 * people and forbids one reaching a `RESOLVED` attribution on a governed
 * record: a demo person and a real person are the SAME SHAPE, so seeding one
 * here would be manufactured provenance — the exact thing E2 refused when it
 * declined to invent a `personId`, and E4 refused again when it seeded
 * `UNATTRIBUTED` instead. This constant is that same refusal, one layer up.
 *
 * The day an IdP answers, this is the ONE value that changes, and §63a's
 * enforcement ramp opens with it: `rigour('OBSERVE') < rigour('BLOCK')`, so
 * every mode below `BLOCK` is a loosening and every loosening needs a named
 * actor. Until then the strongest recordable mode is `BLOCK` and the only
 * settings this platform can take are the ones that tighten.
 */
export const NO_PERSON: ActorAttribution = Object.freeze({
  kind: 'UNATTRIBUTED',
  reason: 'NO_PERSON_IN_SESSION',
});

/**
 * The reserved namespace for demo people (C10 §6.3). **Free exactly once**, and
 * free today: zero occurrences in the tree. Reserving it before the first
 * fixture person exists costs one line; retrofitting it means auditing every
 * stored attribution to decide which ones were real — against records written
 * precisely because nobody could tell the difference at read time.
 *
 * The namespace is worthless without the pin. The pin is
 * `simUsrNamespace.test.ts`, and it fails the floor rather than warning.
 */
export const FIXTURE_PERSON_PREFIX = 'sim-usr-';
