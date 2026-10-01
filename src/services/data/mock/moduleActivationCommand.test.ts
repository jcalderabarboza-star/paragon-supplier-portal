// ────────────────────────────────────────────────────────────────────────────
// M1 · MODULE ACTIVATION, THROUGH THE REAL DISPATCHER (Design 5 §A.3–§A.6).
//
// Every refusal is asserted BY NAME and every one has its known-good twin in
// the same file: a gate probed only for what it refuses ships looking like a
// working gate whether or not it admits anything (§39).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockModuleService } from './MockModuleService';
import { moduleActivationStore } from './stores/moduleActivationStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { rfqStore } from './stores/rfqStore';
import { moduleDeployment } from '../../modules/deployment';
import { COMMAND_REFUSALS } from '../../transitions/refusals';
import { PERSONA_SYSTEM_ROLES, type SystemRoleId } from '../../transitions/businessRoles';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { NO_PERSON } from '../../../context/noPerson';
import { DataError, type QueryScope } from '../types';

const svc = new MockCommandService();
const modules = new MockModuleService();

const person = (role: SystemRoleId) => SAMPLE_PEOPLE.find((p) => p.role === role)!.personId;
const compliance: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: { kind: 'RESOLVED', person: { personId: person('compliance') } },
};
const supplier007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const supplier002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const finance: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['finance'] };

/** Record one act as the named compliance person. */
const set = (code: string, payload: Record<string, unknown>, scope: QueryScope = compliance) =>
  svc.dispatch(scope, { transitionId: 't_module_set', entity: 'moduleActivation', entityId: code, payload });
const switchOff = (code: string) => set(code, { phase: 'Planned', enabled: false, reason: 'M1 probe — off' });
const switchOn = (code: string) => set(code, { phase: 'Active', enabled: true, reason: 'M1 probe — on' });

/** Switch a list off in order, asserting each lands. */
async function offInOrder(...codes: string[]) {
  for (const c of codes) {
    const r = await switchOff(c);
    expect(r.status, `${c}: ${r.reason}`).toBe('done');
  }
}

const DRAFT_ASN = 'ASN-2025-00215'; // sup-007's, Draft — the one submit can act on
const submitAsn = (scope: QueryScope) =>
  svc.dispatch(scope, {
    transitionId: 't_asn_submit',
    entity: 'advanceShipNotice',
    entityId: DRAFT_ASN,
    payload: { carrier: 'JNE', trackingNumber: 'TRK-M1', eta: '2026-09-10' },
  });

beforeEach(() => {
  moduleActivationStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
  purchaseRequisitionStore.reset();
  rfqStore.reset();
  commandAuditSink.clear();
});
afterEach(() => moduleDeployment.reset());

describe('OFF refuses BY NAME — and ON admits (the dispatch’s probe)', () => {
  it('SHP off → t_asn_submit is refused MODULE_INACTIVE:SHP, and the ASN is untouched', async () => {
    await offInOrder('INV', 'GRC', 'SHP'); // SHP's hard dependants first
    const r = await submitAsn(supplier007);
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('MODULE_INACTIVE:SHP');
    expect(asnStore.get(DRAFT_ASN)!.status).toBe('Draft');
  });

  it('KNOWN-GOOD — SHP on (the default) → the same submit is admitted', async () => {
    const r = await submitAsn(supplier007);
    expect(r.status, r.reason).toBe('done');
    expect(asnStore.get(DRAFT_ASN)!.status).toBe('Submitted');
  });

  it('switched back ON, the verb is admitted again — the switch is the only difference', async () => {
    await offInOrder('INV', 'GRC', 'SHP');
    expect((await submitAsn(supplier007)).reason).toBe('MODULE_INACTIVE:SHP');
    expect((await switchOn('SHP')).status).toBe('done');
    expect((await submitAsn(supplier007)).status).toBe('done');
  });
});

describe('refusal ORDER — after the scope pair, before the role gate', () => {
  it('the vocabulary places MODULE_INACTIVE immediately before ROLE_NOT_PERMITTED', () => {
    const at = (k: string) => (COMMAND_REFUSALS as readonly string[]).indexOf(k);
    expect(at('MODULE_INACTIVE')).toBeGreaterThan(at('MISSING_ENTITY_ID'));
    expect(at('MODULE_INACTIVE')).toBe(at('ROLE_NOT_PERMITTED') - 1);
  });

  it('a caller OUTSIDE the tenancy learns nothing — SCOPE_DENIED, not the module', async () => {
    await offInOrder('INV', 'GRC', 'SHP');
    await expect(submitAsn(supplier002)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('a caller inside it WITHOUT the atom learns the MODULE is off before anything about its role', async () => {
    await offInOrder('INV', 'GRC', 'SHP');
    expect((await submitAsn(finance)).reason).toBe('MODULE_INACTIVE:SHP');
  });

  it('KNOWN-GOOD twin — with SHP on, the same seat is refused at the ROLE gate', async () => {
    expect((await submitAsn(finance)).reason).toBe('ROLE_NOT_PERMITTED:asn:submit');
  });
});

describe('dependants block (§A.3) — refused by name, most-dependent first', () => {
  it('ORD off while INV is on is refused NAMING INV (and SHP, also on)', async () => {
    const r = await switchOff('ORD');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/^POLICY_REJECTED:module_no_active_hard_dependants:ORD cannot go off while /);
    expect(r.reason).toContain('INV');
    expect(r.reason).toContain('SHP');
    expect(moduleActivationStore.ledger()).toHaveLength(0);
  });

  it('once INV, GRC and SHP are off, ORD goes off', async () => {
    await offInOrder('INV', 'GRC', 'SHP');
    expect((await switchOff('ORD')).status).toBe('done');
    expect(moduleActivationStore.view().modules.ORD.enabled).toBe(false);
  });

  it('switching a module ON while a hard dependency is OFF is refused naming it', async () => {
    await offInOrder('INV', 'GRC', 'SHP', 'ORD');
    const r = await switchOn('SHP');
    expect(r.reason).toMatch(/^POLICY_REJECTED:module_dependencies_enabled:SHP cannot go on while ORD is off/);
    expect((await switchOn('ORD')).status).toBe('done');
    expect((await switchOn('SHP')).status).toBe('done');
  });

  it('a SOFT dependant does not block: REQ may go off while SRC (soft on REQ) is on', async () => {
    await offInOrder('COM', 'SDC', 'PLN'); // REQ's HARD dependants
    expect((await switchOff('REQ')).status).toBe('done');
    expect(moduleActivationStore.view().modules.SRC.enabled).toBe(true);
  });
});

describe('each hook, both ways', () => {
  it('MODULE_KNOWN — PLT and the buyer side are refused by name; an unknown code is NOT_FOUND', async () => {
    expect((await set('PLT', { phase: 'Planned', enabled: false, reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_known:PLT is always on/);
    expect((await set('side:buyer', { enabled: false, reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_known:the buyer side cannot be switched/);
    await expect(set('XYZ', { phase: 'Planned', enabled: false, reason: 'x' })).rejects.toBeInstanceOf(DataError);
    // KNOWN-GOOD: a switchable module and the supplier side are admitted.
    expect((await switchOff('INT')).status).toBe('done');
    expect((await set('side:supplier', { enabled: false, reason: 'supplier side paused' })).status).toBe('done');
  });

  it('MODULE_KNOWN — `enabled` must be a boolean, not text', async () => {
    expect((await set('INT', { phase: 'Planned', enabled: 'false', reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_known:enabled must be true or false/);
  });

  it('MODULE_PHASE_CONSISTENT — an ON phase with enabled:false is refused; a side carries no phase', async () => {
    expect((await set('INT', { phase: 'Active', enabled: false, reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_phase_consistent:Active is an ON phase/);
    expect((await set('INT', { phase: 'Sometime', enabled: false, reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_phase_consistent:phase must be one of/);
    expect((await set('side:supplier', { phase: 'Planned', enabled: false, reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_phase_consistent:a side has no phase/);
    // KNOWN-GOOD: Backlog is an OFF phase; Activating is an ON one.
    expect((await set('INT', { phase: 'Backlog', enabled: false, reason: 'x' })).status).toBe('done');
    expect((await set('INT', { phase: 'Activating', enabled: true, reason: 'x' })).status).toBe('done');
  });

  it('MODULE_PARTS_KNOWN — a part of another module, or a non-boolean, is refused', async () => {
    expect((await set('GRC', { phase: 'Active', enabled: true, reason: 'x', parts: { fxPin: false } })).reason).toMatch(/^POLICY_REJECTED:module_parts_known:fxPin is not a part of GRC/);
    expect((await set('GRC', { phase: 'Active', enabled: true, reason: 'x', parts: { qualityHold: 'no' } })).reason).toMatch(/^POLICY_REJECTED:module_parts_known:part qualityHold must be true or false/);
    expect((await set('GRC', { phase: 'Active', enabled: true, reason: 'hold paused', parts: { qualityHold: false } })).status).toBe('done');
  });

  it('MODULE_REASON_AUTHORED — the space bar is not a reason', async () => {
    expect((await set('INT', { phase: 'Planned', enabled: false, reason: '   ' })).reason).toMatch(/^POLICY_REJECTED:module_reason_authored:reason is blank/);
    expect((await set('INT', { phase: 'Planned', enabled: false, reason: 'wave 2' })).status).toBe('done');
  });

  it('MODULE_ACTUALLY_CHANGES — re-recording the state in force is refused; a phase change on an ON module is not', async () => {
    expect((await set('INT', { phase: 'Active', enabled: true, reason: 'x' })).reason).toMatch(/^POLICY_REJECTED:module_actually_changes:INT is already Active, on/);
    expect((await set('INT', { phase: 'Activating', enabled: true, reason: 'pilot' })).status).toBe('done');
  });

  it('MODULE_SET_ATTRIBUTED — an unattributed seat is refused; a named one is admitted', async () => {
    const anon: QueryScope = { ...compliance, actor: NO_PERSON };
    expect((await switchOff('INT').then(() => set('MAT', { phase: 'Planned', enabled: false, reason: 'x' }, anon))).reason).toMatch(
      /^POLICY_REJECTED:module_set_attributed:the act must be answerable — UNATTRIBUTED/,
    );
    expect(moduleActivationStore.forSubject('MAT')).toHaveLength(0);
    expect((await set('MAT', { phase: 'Planned', enabled: false, reason: 'x' })).status).toBe('done');
  });

  it('MODULE_SET_NOT_SAMPLE_IN_PROD — on a production deployment a SAMPLE person is refused', async () => {
    moduleDeployment.set(null); // production: no badge
    expect((await switchOff('INT')).reason).toMatch(/^POLICY_REJECTED:module_set_not_sample_in_prod:a sample person cannot switch a module on a production deployment/);
    // KNOWN-GOOD 1: a real (non-roster) person on production is admitted.
    const real: QueryScope = { ...compliance, actor: { kind: 'RESOLVED', person: { personId: 'emp-ops-0001' } } };
    expect((await switchOff('INT').then(() => set('INT', { phase: 'Planned', enabled: false, reason: 'x' }, real))).status).toBe('done');
    // KNOWN-GOOD 2: the SAME sample person on a preview deployment is admitted.
    moduleDeployment.set('PREVIEW');
    expect((await switchOff('MAT')).status).toBe('done');
  });

  it('the live badge in this test environment is DEV — not production', () => {
    expect(moduleDeployment.badge()).toBe('DEV');
    expect(moduleDeployment.isProduction()).toBe(false);
  });
});

describe('the ledger — append-only, attributed, stamps store-minted', () => {
  it('each act appends; earlier rows are never rewritten; setBy is the SESSION actor', async () => {
    await switchOff('INT');
    const first = moduleActivationStore.ledger()[0];
    await switchOn('INT');
    const rows = moduleActivationStore.ledger();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(first);
    expect(rows.map((r) => [r.code, r.enabled, r.seq])).toEqual([['INT', false, 1], ['INT', true, 2]]);
    expect(rows[1].setBy).toEqual(compliance.actor);
    expect(rows[1].reason).toBe('M1 probe — on');
    expect(Number.isNaN(Date.parse(rows[1].setAt))).toBe(false);
  });

  it('a payload that names who acted is refused ACTOR_IN_PAYLOAD, and nothing is recorded', async () => {
    const r = await set('INT', { phase: 'Planned', enabled: false, reason: 'x', setBy: compliance.actor });
    expect(r.reason).toBe('ACTOR_IN_PAYLOAD:setBy');
    expect(moduleActivationStore.ledger()).toHaveLength(0);
  });

  it('a supplier cannot switch anything — SCOPE_DENIED on a real code and an invented one alike', async () => {
    await expect(set('INT', { phase: 'Planned', enabled: false, reason: 'x' }, supplier007)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    await expect(set('XYZ', { phase: 'Planned', enabled: false, reason: 'x' }, supplier007)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});

describe('parts and sides', () => {
  it('a part OFF refuses its verbs by name and leaves the module’s other verbs to their own gates', async () => {
    await set('GRC', { phase: 'Active', enabled: true, reason: 'hold paused', parts: { qualityHold: false } });
    const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
    // A receipt `Under Inspection` — a from-state of both verbs below — read off
    // the store by STATE, never by a literal id.
    const grId = goodsReceiptStore.all().find((g) => g.status === 'Under Inspection')!.id;
    const hold = await svc.dispatch(buyer, { transitionId: 't_gr_hold', entity: 'goodsReceipt', entityId: grId, payload: {} });
    expect(hold.reason).toBe('MODULE_INACTIVE:GRC.qualityHold');
    expect(goodsReceiptStore.get(grId)!.status).toBe('Under Inspection');
    // KNOWN-GOOD: a verb of the SAME module outside the part passes the module
    // gate and meets its own gates — whatever they say, it is not the module.
    const approve = await svc.dispatch(buyer, { transitionId: 't_gr_approve', entity: 'goodsReceipt', entityId: grId, payload: {} });
    expect(approve.reason ?? '').not.toContain('MODULE_INACTIVE');
  });

  it('the supplier side OFF refuses every act a supplier seat attempts — and no buyer act', async () => {
    await set('side:supplier', { enabled: false, reason: 'supplier side paused' });
    expect((await submitAsn(supplier007)).reason).toBe('MODULE_INACTIVE:side:supplier');
    expect((await submitAsn(finance)).reason).toBe('ROLE_NOT_PERMITTED:asn:submit');
  });
});

describe('a cascade into an OFF module is RECORDED, never swallowed', () => {
  it('REQ off: raising an RFQ from pr-002 lands, and the PR-source cascade is refused on the sink', async () => {
    await offInOrder('COM', 'SDC', 'PLN', 'REQ');
    const procurement: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_create',
      entity: 'rfq',
      payload: { title: 'M1 cascade probe', materialCategory: 'Fragrance', totalQty: 100, sourceRequisitionId: 'pr-002' },
    });
    expect(res.status, res.reason).toBe('done');
    const [ev] = commandAuditSink.byEvent('t_pr_source');
    expect(ev?.outcome).toBe('failed');
    expect(ev?.reason).toBe('MODULE_INACTIVE:REQ');
    expect(ev?.causationId).toBe(res.correlationId);
    expect(purchaseRequisitionStore.get('pr-002')!.status).toBe('Approved');
  });
});

describe('the read seam', () => {
  const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };

  it('getModuleActivation — every seat reads what is on, a supplier included', async () => {
    await switchOff('INT');
    for (const s of [buyerScope, supplier007]) {
      const v = await modules.getModuleActivation(s);
      expect(v.modules.INT).toMatchObject({ phase: 'Planned', enabled: false, isDefault: false });
      expect(v.modules.SHP).toMatchObject({ phase: 'Active', enabled: true, isDefault: true });
    }
  });

  it('getModuleLedger — the buyer reads who and why; a supplier is SCOPE_DENIED', async () => {
    await switchOff('INT');
    const page = await modules.getModuleLedger(buyerScope);
    expect(page.items.map((r) => r.code)).toEqual(['INT']);
    await expect(modules.getModuleLedger(supplier007)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});
