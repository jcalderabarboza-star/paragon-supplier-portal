import { POLICY_HOOKS } from '../services/transitions/policyHooks';
import { refusedByPolicy, type PolicyHookId } from '../services/transitions/refusalMessage';

// SUP-1 - THE SIX "A NAMED PERSON DECIDES" REFUSALS, as one key.
//
// `describeRefusal` appends a hook's own English sentence, so a surface that
// rendered `refusalText(r) ?? r` would print it to an Indonesian reader. Each
// of the six surfaces asks this first and renders its answer when there is one.
// Keyed on the HOOK (`refusedByPolicy`), never on the code inside its reason.
export const NAMED_SEAT_HOOKS: readonly PolicyHookId[] = [
  POLICY_HOOKS.APPLICATION_DECIDER_NAMED,
  POLICY_HOOKS.SUPPLIERDOC_ACTOR_NAMED,
  POLICY_HOOKS.PSL_DECIDER_NAMED,
  POLICY_HOOKS.MATERIALREQUEST_DECIDER_NAMED,
  POLICY_HOOKS.ROLE_GRANTER_NAMED,
  POLICY_HOOKS.INVENTORY_RECORDER_NAMED,
];

/** The i18n key for a refusal one of the six hooks produced, else `null`. */
export function namedSeatRefusalKey(reason: string | undefined): string | null {
  return NAMED_SEAT_HOOKS.some((hook) => refusedByPolicy(reason, hook))
    ? 'identity.refused.namedRequired'
    : null;
}
