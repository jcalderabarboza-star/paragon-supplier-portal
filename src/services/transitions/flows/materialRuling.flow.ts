// ────────────────────────────────────────────────────────────────────────────
// Material applicability ruling — OPS-2 (operator ruling, R-OPS P0-5).
//
// Whether halal, or BPOM, applies to a material is Compliance's decision. It
// used to be nobody's: a material the master had not ruled on was refused at
// receipt and no surface let anybody rule, so no packaging material could be
// received at all.
//
// THE ENFORCEMENT MACHINE'S SHAPE, verb for verb: one state, a state-preserving
// set verb, an append-only ledger, and the entity id IS the material code — so
// the material commanded and the material ruled on cannot disagree.
//
// ⚠️ `material:rule` IS A `compliance` ATOM. Receiving is the lane a ruling
// binds; if receiving could set it, the lane held to the check could switch the
// check off for the lot in front of it.
//
// ⚠️ A SAMPLE PERSON IS ADMITTED, unlike the enforcement loosening gate. That
// gate refuses a sample actor because relaxing a control is a governance risk
// nobody real accepted. A ruling here is the opposite kind of act — it ANSWERS a
// question the platform could not pose until somebody did — and the ledger
// shows the SAMPLE marker on every row a sample person wrote.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const materialRulingFlow: FlowDefinition = {
  entity: 'materialRuling',
  version: 1,
  states: ['Governed'],
  initial: 'Governed',
  /** `t_material_ruling_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Governed'],
  transitions: [
    {
      id: 't_material_ruling_set',
      from: ['Governed'],
      to: 'Governed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'material:rule',
      // Who ruled comes from the session and when from the store; neither is a
      // field. `applicable` is a boolean, and `false` is a value, not a blank.
      requiredFields: ['regime', 'applicable', 'reason'],
      policyHooks: [POLICY_HOOKS.MATERIAL_RULING_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
