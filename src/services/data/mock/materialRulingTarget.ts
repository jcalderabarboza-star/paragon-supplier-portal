// OPS-2 — the command target and the one policy hook of `t_material_ruling_set`.
// `moduleActivationTarget.ts`'s layout: the target and its hook sit together
// because the hook reads the same ledger the target writes.

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget, type PolicyDecision } from '../../transitions';
import { asActorAttribution, isAttributed } from '../../../lib/enforcement';
import { NO_PERSON } from '../../../context/noPerson';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { isRulingRegime, rulingInForce } from '../../sdc/materialRuling';
import { materialRulingStore } from './stores/materialRulingStore';

const known = (materialCode: string): boolean =>
  Object.prototype.hasOwnProperty.call(MATERIAL_MASTER, materialCode);

const no = (reason: string): PolicyDecision => ({ ok: false, reason });

export const materialRulingTarget: CommandTarget = {
  // A material exists by being in the master; an unknown code is NOT_FOUND.
  readState: (id) => (known(id) ? 'Governed' : null),
  readScopeOwner: () => null,
  readEntity: (id) => materialRulingStore.forMaterial(id),
  applyTransition: (id, _toState, payload, scope) => {
    materialRulingStore.append({
      materialCode: id,
      regime: payload.regime as 'halal' | 'bpom',
      applicable: payload.applicable === true,
      reason: String(payload.reason).trim(),
      setBy: asActorAttribution(scope.actor) ?? NO_PERSON,
      setAt: new Date().toISOString(),
      seq: materialRulingStore.nextSeq(),
    });
  },
};

// The ORDER is the order a reader needs: what is being ruled on, then what the
// ruling says, then who is saying it.
bindPolicyHook(POLICY_HOOKS.MATERIAL_RULING_GOVERNED, ({ entityId, payload, scope }) => {
  if (!isRulingRegime(payload.regime)) {
    return no(
      `RULING_REGIME_UNKNOWN: a ruling is made under halal or bpom, got ${String(payload.regime)}`,
    );
  }
  if (typeof payload.applicable !== 'boolean') {
    return no(
      `RULING_MALFORMED: applicable must be yes or no (true or false), got ${typeof payload.applicable}`,
    );
  }
  if (typeof payload.reason !== 'string' || payload.reason.trim() === '') {
    return no('RULING_REASON_BLANK: a ruling carries its reason — say why it applies or does not');
  }
  const inForce = rulingInForce(materialRulingStore.all(), entityId, payload.regime);
  if (inForce !== null && inForce.applicable === payload.applicable) {
    return no(
      `RULING_UNCHANGED: ${entityId} is already ruled ${
        inForce.applicable ? 'applicable' : 'not applicable'
      } under ${payload.regime} — a ruling records a change`,
    );
  }
  const actor = asActorAttribution(scope.actor);
  if (!actor || !isAttributed(actor)) {
    return no(
      'RULING_ACTOR_UNATTRIBUTED: this seat carries no person, and a ruling is recorded against ' +
        'the person who made it. Adopt a sample user on the identity panel, then rule again.',
    );
  }
  return { ok: true };
});
