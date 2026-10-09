import { POLICY_HOOKS } from '../services/transitions/policyHooks';
import { refusedByPolicy, type PolicyHookId } from '../services/transitions/refusalMessage';

// SUP-1 - THE "A NAMED PERSON DECIDES" REFUSALS, as one key (FIN-1 added the cap).
//
// `describeRefusal` appends a hook's own English sentence, so a surface that
// rendered `refusalText(r) ?? r` would print it to an Indonesian reader. Each
// of the surfaces asks this first and renders its answer when there is one.
// Keyed on the HOOK (`refusedByPolicy`), never on the code inside its reason.
export const NAMED_SEAT_HOOKS: readonly PolicyHookId[] = [
  POLICY_HOOKS.APPLICATION_DECIDER_NAMED,
  POLICY_HOOKS.SUPPLIERDOC_ACTOR_NAMED,
  POLICY_HOOKS.PSL_DECIDER_NAMED,
  POLICY_HOOKS.MATERIALREQUEST_DECIDER_NAMED,
  POLICY_HOOKS.ROLE_GRANTER_NAMED,
  POLICY_HOOKS.INVENTORY_RECORDER_NAMED,
  // FIN-1 - the portal default cap. No surface fires it yet; the key is here
  // so the surface that does renders the shared sentence.
  POLICY_HOOKS.PSL_CAP_SETTER_NAMED,
  // E2E-1 - requisition decisions, forecast publication, goods-receipt disposition.
  POLICY_HOOKS.PR_DECIDER_NAMED,
  POLICY_HOOKS.PUBLICATION_ACTOR_NAMED,
  POLICY_HOOKS.GR_DISPOSER_NAMED,
  POLICY_HOOKS.GR_RECEIVER_NAMED,
];

/** The i18n key for a refusal one of these hooks produced, else `null`. */
export function namedSeatRefusalKey(reason: string | undefined): string | null {
  return NAMED_SEAT_HOOKS.some((hook) => refusedByPolicy(reason, hook))
    ? 'identity.refused.namedRequired'
    : null;
}
