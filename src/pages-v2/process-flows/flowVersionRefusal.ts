// A FLOW-VERSION REFUSAL, IN THE READER'S LANGUAGE — `deliveryRefusal.ts`'s
// shape. Keyed to the refusal HEAD, never to a substring of the prose: every
// hook here refuses with `<HEAD>: <sentence>`, and the sentence is free to be
// rewritten. `null` for a reason this map does not own, so a call site keeps
// the fallback it had.
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { refusedByPolicy, type PolicyHookId } from '../../services/transitions/refusalMessage';

/** hook → the heads it can refuse with. `flowVersionRefusal.test.ts` derives the same from source. */
export const FLOW_VERSION_REFUSAL_HEADS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE]: [
    'FLOWVERSION_PROCESS_UNKNOWN',
    'FLOWVERSION_PROCESS_SELF',
    'FLOWVERSION_PROCESS_NOT_WRITABLE',
    'FLOWVERSION_TITLE_BLANK',
  ],
  [POLICY_HOOKS.FLOWVERSION_CONTENT_WELL_FORMED]: ['FLOWVERSION_CONTENT_MALFORMED', 'FLOWVERSION_CONTENT_MOVED'],
});

export function flowVersionRefusalKey(reason: string | undefined): string | null {
  for (const [hook, heads] of Object.entries(FLOW_VERSION_REFUSAL_HEADS)) {
    if (!refusedByPolicy(reason, hook as PolicyHookId)) continue;
    const said = reason!.slice(`POLICY_REJECTED:${hook}:`.length);
    const head = heads.find((h) => said.startsWith(`${h}:`));
    return head ? `flowBuilder.refusal.${head}` : null;
  }
  return null;
}
