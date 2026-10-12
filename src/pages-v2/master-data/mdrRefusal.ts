// MD-4 — a refused change-request act, in the reader's words.
//
// A policy refusal reaches a surface as `POLICY_REJECTED:<hook>:<HEAD>: …`. The
// developer's sentence after the head is not copy (one of them names a person
// by id), so the surface keys on the HEAD and renders its own sentence.
// `mdrRefusal.test.ts` holds this table equal to the heads the target and the
// rules can produce, both ways.
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { refusedByPolicy, type PolicyHookId } from '../../services/transitions/refusalMessage';

/** hook → the heads it can refuse with. */
export const MDR_REFUSAL_HEADS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [POLICY_HOOKS.MDR_PROPOSAL_VALID]: [
    'MDR_KIND_UNKNOWN',
    'MDR_REASON_BLANK',
    'MDR_CREATE_CARRIES_KEY',
    'MDR_SUBJECT_UNKNOWN',
    'MDR_FIELD_NOT_PROPOSABLE',
    'MDR_FIELD_MISSING',
    'MDR_VALUE_NOT_IN_TABLE',
    'MDR_NOTHING_CHANGES',
    'MDR_DUPLICATE_OPEN',
  ],
  [POLICY_HOOKS.MDR_REVIEWER_LANE]: ['MDR_WRONG_LANE'],
  [POLICY_HOOKS.MDR_APPROVER_NOT_PROPOSER]: ['MDR_APPROVER_IS_PROPOSER'],
  [POLICY_HOOKS.MDR_BASE_UNCHANGED]: ['MDR_SAP_CHANGED_FIRST'],
  [POLICY_HOOKS.MDR_NOTE_AUTHORED]: ['MDR_NOTE_BLANK'],
  [POLICY_HOOKS.MDR_SAP_ANSWER_ADMISSIBLE]: [
    'MDR_SAP_NUMBER_BLANK',
    'MDR_SAMPLE_ANSWER_IN_PRODUCTION',
    'MDR_SAP_NOT_CONNECTED',
  ],
});

/** The i18n key for a change-request refusal, else `null`. */
export function mdrRefusalKey(reason: string | undefined): string | null {
  for (const [hook, heads] of Object.entries(MDR_REFUSAL_HEADS)) {
    if (!refusedByPolicy(reason, hook as PolicyHookId)) continue;
    const said = (reason ?? '').slice(`POLICY_REJECTED:${hook}:`.length);
    const head = heads.find((h) => said.startsWith(`${h}:`));
    return head ? `masterData.request.refusal.${head}` : null;
  }
  return null;
}
