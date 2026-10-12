// A FLOW-VERSION REFUSAL, IN THE READER'S LANGUAGE — `deliveryRefusal.ts`'s
// shape. Keyed to the refusal HEAD, never to a substring of the prose: every
// hook here refuses with `<HEAD>: <sentence>`, and the sentence is free to be
// rewritten. `null` for a reason this map does not own, so a call site keeps
// the fallback it had.
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { ADDED_CHECK } from '../../services/transitions/dispatcher';

/** hook → the heads it can refuse with. `flowVersionRefusal.test.ts` derives the same from source. */
export const FLOW_VERSION_REFUSAL_HEADS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE]: [
    'FLOWVERSION_PROCESS_UNKNOWN',
    'FLOWVERSION_PROCESS_SELF',
    'FLOWVERSION_PROCESS_NOT_WRITABLE',
    'FLOWVERSION_TITLE_BLANK',
    'FLOWVERSION_SOURCE_UNKNOWN',
    'FLOWVERSION_SOURCE_OTHER_PROCESS',
  ],
  [POLICY_HOOKS.FLOWVERSION_CONTENT_WELL_FORMED]: [
    'FLOWVERSION_CONTENT_MALFORMED',
    'FLOWVERSION_CONTENT_MOVED',
    'FLOWVERSION_ACKNOWLEDGED_MALFORMED',
  ],
  // FB-3 / FB-4
  [POLICY_HOOKS.FLOWVERSION_REASON_AUTHORED]: ['FLOWVERSION_REASON_BLANK'],
  [POLICY_HOOKS.FLOWVERSION_OBEYS_RULES]: [
    'FLOWVERSION_EMPTY',
    'FLOWVERSION_ELEMENT_NOT_BUILT',
    'FLOWVERSION_BASE_MOVED',
    'FLOWVERSION_BREAKS_RULE',
    'FLOWVERSION_WARNING_UNACKNOWLEDGED',
  ],
  [POLICY_HOOKS.FLOWVERSION_APPROVER_NOT_PROPOSER]: ['FLOWVERSION_APPROVER_IS_PROPOSER'],
  [POLICY_HOOKS.FLOWVERSION_NOT_SAMPLE_IN_PROD]: ['FLOWVERSION_SAMPLE_IN_PRODUCTION'],
  // FB-4 — the steps an active version added. `added_check` stands where a
  // hook's name stands, so it is matched as one.
  [POLICY_HOOKS.STEP_MAY_BE_TAKEN]: [
    'STEP_UNKNOWN',
    'STEP_NOT_DUE',
    'STEP_LANE_NOT_HELD',
    'STEP_COMPLETER_IS_EARLIER_COMPLETER',
  ],
  [POLICY_HOOKS.STEP_FIELDS_GIVEN]: ['STEP_FIELD_MISSING'],
  [POLICY_HOOKS.STEP_DECLINE_REASONED]: ['STEP_NOT_AN_APPROVAL', 'STEP_DECLINE_REASON_BLANK'],
  [ADDED_CHECK]: ['STEP_COMPLETER_MAY_NOT_ACT'],
});

/** The head a flow-builder refusal carries, or `null` for a reason this map does not own. */
export function flowVersionRefusalHead(reason: string | undefined): string | null {
  for (const [hook, heads] of Object.entries(FLOW_VERSION_REFUSAL_HEADS)) {
    const prefix = `POLICY_REJECTED:${hook}:`;
    if (!reason?.startsWith(prefix)) continue;
    const said = reason.slice(prefix.length);
    return heads.find((h) => said.startsWith(`${h}:`)) ?? null;
  }
  return null;
}

export function flowVersionRefusalKey(reason: string | undefined): string | null {
  const head = flowVersionRefusalHead(reason);
  return head ? `flowBuilder.refusal.${head}` : null;
}

