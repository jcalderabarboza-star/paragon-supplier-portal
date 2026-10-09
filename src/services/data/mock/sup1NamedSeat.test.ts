// ────────────────────────────────────────────────────────────────────────────
// SUP-1 · A NAMED PERSON DECIDES (operator ruling).
//
// The review walked a seat that names nobody through approving a supplier
// application and confirming a supplier's certificate; both were recorded
// against nobody. Six hooks now refuse such a seat on the deciding verbs.
//
// Three things are held here:
//   1. WHICH VERBS — derived from the flows and compared, both ways, with the
//      ruled list. A verb that gains or loses a hook reddens this file.
//   2. WHAT EACH HOOK DECIDES — fired directly: no actor and an unattributed
//      actor are refused by the lane's own head; a sample person and a person
//      off the roster are admitted.
//   3. THE ACT ITSELF, through the real dispatcher and stores: a refused act
//      leaves the store as it was, and a confirmed certificate carries who and
//      when.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { getKnownFlows } from '../../transitions';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { resolvePolicyHook } from '../../transitions/policies';
import { refusedByPolicy, type PolicyHookId } from '../../transitions/refusalMessage';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { customRoleStore } from '../../transitions/customRoles';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { ATTRIBUTION_KEYS } from '../../identity/attributionKeys';
import { NAMED_SEAT_HOOKS, namedSeatRefusalKey } from '../../../lib/namedSeatRefusal';
import { NO_PERSON } from '../../../context/noPerson';
import type { ActorAttribution } from '../../../lib/enforcement';
import type { QueryScope } from '../types';

/** The ruling, as written: hook → refusal head → the verbs it stands on. */
const RULED: ReadonlyArray<{ hook: PolicyHookId; head: string; verbs: readonly string[] }> = [
  {
    hook: POLICY_HOOKS.APPLICATION_DECIDER_NAMED,
    head: 'APPLICATION_DECIDER_UNATTRIBUTED',
    verbs: ['t_application_approve', 't_application_reject'],
  },
  {
    hook: POLICY_HOOKS.SUPPLIERDOC_ACTOR_NAMED,
    head: 'SUPPLIERDOC_ACTOR_UNATTRIBUTED',
    verbs: ['t_supplierdoc_reject', 't_supplierdoc_request', 't_supplierdoc_verify'],
  },
  {
    hook: POLICY_HOOKS.PSL_DECIDER_NAMED,
    head: 'PSL_DECIDER_UNATTRIBUTED',
    verbs: [
      't_psl_cap_override',
      't_psl_change_status',
      't_psl_grant',
      't_psl_publish',
      't_psl_reject',
      't_psl_renew',
      't_psl_withdraw',
    ],
  },
  {
    hook: POLICY_HOOKS.MATERIALREQUEST_DECIDER_NAMED,
    head: 'MATERIALREQUEST_DECIDER_UNATTRIBUTED',
    verbs: ['t_materialrequest_approve', 't_materialrequest_reject'],
  },
  {
    hook: POLICY_HOOKS.ROLE_GRANTER_NAMED,
    head: 'ROLE_GRANTER_UNATTRIBUTED',
    verbs: ['t_role_grant'],
  },
  {
    hook: POLICY_HOOKS.INVENTORY_RECORDER_NAMED,
    head: 'INVENTORY_RECORDER_UNATTRIBUTED',
    verbs: ['t_inventorydeclaration_record'],
  },
  // FIN-1 - the portal default cap, ruled with the six and landed after.
  {
    hook: POLICY_HOOKS.PSL_CAP_SETTER_NAMED,
    head: 'PSL_CAP_SETTER_UNATTRIBUTED',
    verbs: ['t_psl_cap_set'],
  },
];

/** Proposing, raising, picking up and the supplier's own acts stay open. */
const RULED_OPEN: readonly string[] = [
  't_application_submit',
  't_application_start_review',
  't_supplierdoc_declare',
  't_supplierdoc_submit',
  't_psl_propose',
  't_materialrequest_submit',
  't_materialrequest_start_review',
  't_inventorydeclaration_declare',
];

const transitions = () => getKnownFlows().flatMap((f) => f.transitions);
const verbsCarrying = (hook: string): string[] =>
  transitions()
    .filter((t) => t.policyHooks.includes(hook))
    .map((t) => t.id)
    .sort();

const personWith = (role: string): ActorAttribution => {
  const p = SAMPLE_PEOPLE.find((x) => x.role === role);
  if (!p) throw new Error(`no sample person with role ${role}`);
  return { kind: 'RESOLVED', person: { personId: p.personId } };
};
const NAMED = personWith('compliance');
const buyer = (actor?: QueryScope['actor']): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  ...(actor ? { actor } : {}),
});

const svc = new MockCommandService();

beforeEach(() => {
  supplierDocumentStore.reset();
  supplierApplicationStore.reset();
  inventoryDeclarationStore.reset();
  customRoleStore.reset();
});

describe('SUP-1 · which verbs need a named person — derived from the flows', () => {
  it('CONTROL — the flows are registered and the population is not empty', () => {
    const ids = transitions().map((t) => t.id);
    expect(ids).toContain('t_supplierdoc_verify');
    expect(ids).toContain('t_psl_propose');
    expect(ids).not.toContain('t_supplierdoc_confirm');
  });

  it.each(RULED)('$hook stands on exactly the ruled verbs', ({ hook, verbs }) => {
    expect(verbsCarrying(hook)).toEqual([...verbs].sort());
  });

  it.each(RULED)('$hook runs FIRST on each of them', ({ hook, verbs }) => {
    for (const id of verbs) {
      const t = transitions().find((x) => x.id === id)!;
      expect(t.policyHooks[0], id).toBe(hook);
    }
  });

  it('the hooks in the surface key map are exactly the ruled ones', () => {
    expect([...NAMED_SEAT_HOOKS].sort()).toEqual(RULED.map((r) => r.hook).sort());
  });

  it('the verbs ruled open carry none of the six', () => {
    for (const id of RULED_OPEN) {
      const t = transitions().find((x) => x.id === id);
      expect(t, id).toBeDefined();
      expect(t!.policyHooks.filter((h) => (NAMED_SEAT_HOOKS as readonly string[]).includes(h)), id).toEqual([]);
    }
  });
});

describe('SUP-1 · what each hook decides', () => {
  const ask = (hook: string, scope: QueryScope) =>
    resolvePolicyHook(hook)!({
      entityId: 'x',
      currentState: 'x',
      toState: 'y',
      payload: {},
      target: {} as never,
      scope,
    });

  it.each(RULED)('$hook refuses a seat with no actor, by $head', ({ hook, head }) => {
    const d = ask(hook, buyer());
    expect(d.ok).toBe(false);
    expect(d.ok ? '' : d.reason).toMatch(new RegExp(`^${head}: `));
  });

  it.each(RULED)('$hook refuses an unattributed actor, and states the remedy', ({ hook, head }) => {
    const d = ask(hook, buyer(NO_PERSON));
    expect(d.ok).toBe(false);
    const reason = (d.ok ? '' : d.reason) ?? '';
    expect(reason.startsWith(`${head}: `)).toBe(true);
    expect(reason).toContain('Adopt a sample user on the identity panel');
    // The reason names nobody: a surface renders its own copy from the head.
    for (const p of SAMPLE_PEOPLE) expect(reason).not.toContain(p.personId);
  });

  it.each(RULED)('$hook admits a sample person', ({ hook }) => {
    expect(ask(hook, buyer(NAMED))).toEqual({ ok: true });
  });

  it.each(RULED)('$hook admits a person who is not on the sample roster', ({ hook }) => {
    const real: ActorAttribution = { kind: 'RESOLVED', person: { personId: 'usr-not-a-sample' } };
    expect(SAMPLE_PEOPLE.some((p) => p.personId === 'usr-not-a-sample')).toBe(false);
    expect(ask(hook, buyer(real))).toEqual({ ok: true });
  });
});

describe('SUP-1 · the surface key', () => {
  it.each(RULED)('a refusal from $hook maps to the shared sentence', ({ hook, head }) => {
    expect(namedSeatRefusalKey(`POLICY_REJECTED:${hook}:${head}: …`)).toBe(
      'identity.refused.namedRequired',
    );
  });
  it('any other refusal, and none at all, map to nothing', () => {
    expect(namedSeatRefusalKey('POLICY_REJECTED:psl_decision_authored:PSL_DECISION_BLANK')).toBeNull();
    expect(namedSeatRefusalKey('ROLE_NOT_PERMITTED:psl:decide')).toBeNull();
    expect(namedSeatRefusalKey(undefined)).toBeNull();
  });
});

describe('SUP-1 · a certificate confirmation names who and when', () => {
  const awaiting = () => supplierDocumentStore.all().filter((d) => d.status === 'Under Review');
  const verify = (scope: QueryScope, entityId: string) =>
    svc.dispatch(scope, { transitionId: 't_supplierdoc_verify', entity: 'supplierDocument', entityId });

  it('CONTROL — the corpus holds a document under review, and no seeded row is stamped', () => {
    expect(awaiting().map((d) => d.id)).toContain('doc-010');
    expect(supplierDocumentStore.all().filter((d) => d.verifiedAt || d.verifiedBy)).toEqual([]);
  });

  it('a seat that names nobody is refused, and the document is as it was', async () => {
    const before = supplierDocumentStore.get('doc-010');
    const r = await verify(buyer(NO_PERSON), 'doc-010');
    expect(r.status).toBe('failed');
    expect(refusedByPolicy(r.reason, POLICY_HOOKS.SUPPLIERDOC_ACTOR_NAMED)).toBe(true);
    expect(r.reason).toContain('SUPPLIERDOC_ACTOR_UNATTRIBUTED');
    expect(supplierDocumentStore.get('doc-010')).toEqual(before);
  });

  it('a named person confirms it: Valid, with that person and an instant', async () => {
    const r = await verify(buyer(NAMED), 'doc-010');
    expect(r.status).not.toBe('failed');
    const doc = supplierDocumentStore.get('doc-010')!;
    expect(doc.status).toBe('Valid');
    expect(doc.verifiedBy).toEqual(NAMED);
    expect(new Date(doc.verifiedAt!).toISOString()).toBe(doc.verifiedAt);
  });

  it('a refusal stamps no confirmation, and a confirmation no refusal', async () => {
    await svc.dispatch(buyer(NAMED), {
      transitionId: 't_supplierdoc_reject',
      entity: 'supplierDocument',
      entityId: 'doc-010',
      payload: { rejectionReason: 'The scope does not name the material.' },
    });
    const refused = supplierDocumentStore.get('doc-010')!;
    expect(refused.status).toBe('Rejected');
    expect(refused.rejectedBy).toEqual(NAMED);
    expect(refused.verifiedAt).toBeUndefined();
    expect(refused.verifiedBy).toBeUndefined();

    await verify(buyer(NAMED), 'doc-011');
    const confirmed = supplierDocumentStore.get('doc-011')!;
    expect(confirmed.rejectedAt).toBeUndefined();
    expect(confirmed.rejectedBy).toBeUndefined();
  });

  it('`verifiedBy` cannot be supplied by the caller', async () => {
    expect(ATTRIBUTION_KEYS).toContain('verifiedBy');
    const r = await svc.dispatch(buyer(NAMED), {
      transitionId: 't_supplierdoc_verify',
      entity: 'supplierDocument',
      entityId: 'doc-010',
      payload: { verifiedBy: personWith('procurement') },
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/^ACTOR_IN_PAYLOAD/);
    expect(supplierDocumentStore.get('doc-010')!.status).toBe('Under Review');
  });
});

describe('SUP-1 · a refused act leaves its store as it was', () => {
  it('asking a supplier for a document', async () => {
    const before = supplierDocumentStore.all().length;
    const r = await svc.dispatch(buyer(NO_PERSON), {
      transitionId: 't_supplierdoc_request',
      entity: 'supplierDocument',
      payload: { supplierId: 'sup-007', category: 'Quality', note: 'COA for the next batch' },
    });
    expect(r.status).toBe('failed');
    expect(refusedByPolicy(r.reason, POLICY_HOOKS.SUPPLIERDOC_ACTOR_NAMED)).toBe(true);
    expect(supplierDocumentStore.all().length).toBe(before);
  });

  it('approving an application — and picking it up stays open to the same seat', async () => {
    // Nobody has ever applied, so the store opens empty: raise one. Raising
    // is ruled open, and the unnamed seat doing it here is that half held.
    const raised = await svc.dispatch(buyer(NO_PERSON), {
      transitionId: 't_application_submit',
      entity: 'supplierApplication',
      payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' },
    });
    expect(raised.status).not.toBe('failed');
    const id = supplierApplicationStore.all()[0].id;
    expect(supplierApplicationStore.get(id)!.status).toBe('Submitted');
    const pickUp = await svc.dispatch(buyer(NO_PERSON), {
      transitionId: 't_application_start_review',
      entity: 'supplierApplication',
      entityId: id,
    });
    expect(pickUp.status).not.toBe('failed');
    expect(supplierApplicationStore.get(id)!.status).toBe('Under Review');

    const before = supplierApplicationStore.get(id);
    const r = await svc.dispatch(buyer(NO_PERSON), {
      transitionId: 't_application_approve',
      entity: 'supplierApplication',
      entityId: id,
    });
    expect(r.status).toBe('failed');
    expect(refusedByPolicy(r.reason, POLICY_HOOKS.APPLICATION_DECIDER_NAMED)).toBe(true);
    expect(supplierApplicationStore.get(id)).toEqual(before);

    const named = await svc.dispatch(buyer(NAMED), {
      transitionId: 't_application_approve',
      entity: 'supplierApplication',
      entityId: id,
    });
    expect(named.status).not.toBe('failed');
    expect(supplierApplicationStore.get(id)!.status).toBe('Approved');
    expect(supplierApplicationStore.get(id)!.decidedBy).toEqual(NAMED);
  });

  it("recording a supplier's stock for them", async () => {
    const payload = { materialCode: 'RM-EMUL-3310', supplierId: 'sup-002', totalQty: 4000 };
    const before = inventoryDeclarationStore.all().length;
    const r = await svc.dispatch(buyer(NO_PERSON), {
      transitionId: 't_inventorydeclaration_record',
      entity: 'inventoryDeclaration',
      payload,
    });
    expect(r.status).toBe('failed');
    expect(refusedByPolicy(r.reason, POLICY_HOOKS.INVENTORY_RECORDER_NAMED)).toBe(true);
    expect(inventoryDeclarationStore.all().length).toBe(before);

    const named = await svc.dispatch(buyer(NAMED), {
      transitionId: 't_inventorydeclaration_record',
      entity: 'inventoryDeclaration',
      payload,
    });
    expect(named.status).toBe('done');
    expect(inventoryDeclarationStore.all().length).toBe(before + 1);
  });

  it('granting a role', async () => {
    const grant = {
      transitionId: 't_role_grant',
      entity: 'role',
      entityId: 'receiving',
      payload: {
        roleId: 'sup1-night-shift',
        displayName: 'Night shift',
        description: 'The dock, after hours.',
        adds: ['invoice:dispute'],
      },
    };
    const r = await svc.dispatch(buyer(NO_PERSON), grant);
    expect(r.status).toBe('failed');
    expect(refusedByPolicy(r.reason, POLICY_HOOKS.ROLE_GRANTER_NAMED)).toBe(true);
    expect(customRoleStore.all()).toEqual([]);

    const named = await svc.dispatch(buyer(NAMED), grant);
    expect(named.status).not.toBe('failed');
    expect(customRoleStore.byId('sup1-night-shift')?.grantedBy).toEqual(NAMED);
  });
});
