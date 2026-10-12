// FB-4 — the command target and the one check of the `processStep` ledger
// (Design 6 v2 §7.2). `flowVersionTarget.ts`'s layout: the target and its hook
// sit together because the hook reads the ledger the target writes.
//
// The entity commanded is `<process>:<document>:<step>`. `readState` answers
// for a key that names a registered process, a document that process holds and
// a step the version in force defines — and `null` for anything else, so an
// invented key is NOT_FOUND and is never minted.
import { bindPolicyHook, getFlow, POLICY_HOOKS, type CommandTarget, type PolicyDecision } from '../../transitions';
import { asActorAttribution, isAttributed } from '../../../lib/enforcement';
import { NO_PERSON } from '../../../context/noPerson';
import { stepCompleterIsEarlier } from '../../transitions/policies';
import { dueStep, dueStepByKey, inForce, parseStepKey, stepOpenFor } from '../../flowBuilder/flowOverlay';
import { stepLedger } from '../../flowBuilder/stepLedger';

const no = (reason: string): PolicyDecision => ({ ok: false, reason });
const isBlank = (v: unknown): boolean => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * A FACTORY, for `flowVersionTarget`'s reason: one answer — "does this process
 * hold this document?" — belongs to the target table this target is a row of.
 */
export function makeProcessStepTarget(documentState: (entity: string, docId: string) => string | null): CommandTarget {
  /** The step a key names under the version in force, when its document exists. */
  const named = (key: string) => {
    const parsed = parseStepKey(key);
    if (!parsed || !getFlow(parsed.entity)) return null;
    const version = inForce(parsed.entity).version;
    const step = version?.content.steps.find((s) => s.id === parsed.stepId);
    if (!version || !step || documentState(parsed.entity, parsed.docId) === null) return null;
    return { ...parsed, version, step };
  };

  bindPolicyHook(POLICY_HOOKS.STEP_MAY_BE_TAKEN, ({ entityId, scope, exempt }) => {
    const at = named(entityId);
    if (!at) return no(`STEP_UNKNOWN: '${entityId}' is not a step the version in force defines`);
    const { entity, docId, step, version } = at;

    // 1. THE STEP IS DUE: the act behind it can be taken from where the
    //    document rests, the steps before it are done, and it is not done.
    const state = documentState(entity, docId);
    const act = getFlow(entity)!.transitions.find((t) => t.id === step.before);
    const due = dueStep(entity, docId, step.before);
    if (!act || state === null || !act.from.includes(state) || !due || due.step.id !== step.id) {
      return no(
        `STEP_NOT_DUE: the step '${step.id}' is not due on ${docId} — it is done, an earlier step ` +
          'is still open, or the document is not where the act behind it can be taken',
      );
    }

    // 2. THE SEAT HOLDS THE STEP'S LANE — the function the surface calls too.
    if (!stepOpenFor(step, scope.businessRoles ?? [])) {
      return no(`STEP_LANE_NOT_HELD: the step '${step.id}' is completed by the ${step.lane} lane, which this seat does not hold`);
    }

    // 3. A DIFFERENT PERSON FROM WHOEVER COMPLETED A NAMED EARLIER STEP.
    const actor = asActorAttribution(scope.actor);
    if (actor && isAttributed(actor)) {
      for (const earlier of due.earlier) {
        if (!(step.differentFrom ?? []).includes(earlier.step.id)) continue;
        const by = earlier.row.by;
        if (isAttributed(by) && by.person.personId === actor.person.personId) {
          const decision = stepCompleterIsEarlier(exempt, actor.person.personId, {
            earlierStep: earlier.step.id,
            step: step.id,
            label: version.label,
          });
          if (!decision.ok) return decision;
        }
      }
    }
    return { ok: true };
  });

  // COMPLETE ONLY — what a data-capture step asks for was given.
  bindPolicyHook(POLICY_HOOKS.STEP_FIELDS_GIVEN, ({ entityId, payload }) => {
    const step = named(entityId)?.step;
    const values = (payload.values ?? {}) as Record<string, unknown>;
    const missing = (step?.fields ?? []).filter((f) => f.required && isBlank(values[f.name])).map((f) => f.name);
    return missing.length > 0
      ? no(`STEP_FIELD_MISSING: the step '${step!.id}' asks for ${missing.join(', ')}`)
      : { ok: true };
  });

  // DECLINE ONLY — an approval is declined, with the reason; any other step is completed.
  bindPolicyHook(POLICY_HOOKS.STEP_DECLINE_REASONED, ({ entityId, payload }) => {
    const step = named(entityId)?.step;
    if (step && step.kind !== 'approval') {
      return no(`STEP_NOT_AN_APPROVAL: the step '${step.id}' is a ${step.kind} step — it is completed, not declined`);
    }
    return typeof payload.reason === 'string' && payload.reason.trim() !== ''
      ? { ok: true }
      : no('STEP_DECLINE_REASON_BLANK: a declined approval says why, in words');
  });

  return {
    readState: (key) => (named(key) ? 'Recorded' : null),
    // Buyer-only in this build: a supplier seat is denied at scope, identically
    // for a step that exists and one that does not.
    readScopeOwner: () => null,
    readEntity: (key) => dueStepByKey(key),
    applyTransition: (key, _toState, payload, scope, transitionId, bypass) => {
      const at = named(key)!;
      stepLedger.append({
        entity: at.entity,
        docId: at.docId,
        stepId: at.step.id,
        versionId: at.version.id,
        versionLabel: at.version.label,
        decision: transitionId === 't_step_decline' ? 'declined' : 'completed',
        by: asActorAttribution(scope.actor) ?? NO_PERSON,
        reason: transitionId === 't_step_decline' ? String(payload.reason).trim() : '',
        values: transitionId === 't_step_decline' ? {} : { ...((payload.values ?? {}) as Record<string, unknown>) },
        ...(bypass ? { bypass: { rules: [...bypass.rules], reason: bypass.reason } } : {}),
      });
    },
  };
}
