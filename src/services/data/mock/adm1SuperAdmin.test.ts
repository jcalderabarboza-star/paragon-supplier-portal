// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · THE TWO ADMINISTRATOR SEATS, AND THE PIN THE RULING ASKS FOR.
//
// *"The same act is admitted+stamped for Super Admin and refused by four-eyes
// for Admin."* The act is releasing the payment of an invoice the same person
// approved, on the shipped command service — no synthetic hook.
//
// Probed both ways throughout: every admit sits beside the refusal it differs
// from, on the same act, so neither can be believed alone.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { invoiceStore } from './stores/invoiceStore';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import type { QueryScope } from '../types';
import { SYSTEM_ROLES, PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES, SUPERSET_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy, describeRefusal } from '../../transitions/refusalMessage';
import { SAMPLE_PEOPLE, resolveSamplePerson } from '../../identity/sampleRoster';
import { personLabel } from '../../identity/personLabel';
import {
  BYPASS_REASON_MAX,
  SUPER_ADMIN_REASON_REQUIRED,
  SUPER_ADMIN_ROLE,
  isSuperAdminSeat,
  maySeeSuperAdminActivity,
  readBypassReason,
} from '../../identity/superAdmin';
import { bypassRulesIn, registerBypassReasonPrompt } from '../../identity/bypassReasonPrompt';
import { bypassesOn, filterSuperAdminActs, superAdminActs } from '../../audit/superAdminActivity';
import { moduleDeployment } from '../../modules/deployment';
import { superAdminEn, superAdminId } from '../../../lib/i18n/superAdmin';
import { rolesEn } from '../../../lib/i18n/roles';
import { identityEn } from '../../../lib/i18n/identity';
import { stripSourceComments } from '../../../lib/sourceScan/stripComments';

const svc = new MockCommandService();

type Actor = Extract<NonNullable<QueryScope['actor']>, { kind: 'RESOLVED' }>;
/** The roster's one holder of `role`, as an actor — read off the roster, never spelled. */
const person = (role: string): Actor => {
  const rows = SAMPLE_PEOPLE.filter((p) => p.role === role);
  if (rows.length !== 1) throw new Error(`expected one sample person named for ${role}, found ${rows.length}`);
  if (!resolveSamplePerson(rows[0].personId)) throw new Error(`not on the roster: ${role}`);
  return { kind: 'RESOLVED', person: { personId: rows[0].personId } };
};
const SUPER = person('super_admin');
const ADMIN = person('admin');
const seat = (role: string, actor?: Actor): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: [role] as QueryScope['businessRoles'],
  ...(actor ? { actor } : {}),
});

/** An Approved invoice whose approval names nobody — the seed's shape. */
const unnamedApproved = (): string => {
  const inv = invoiceStore.all().find((i) => i.status === 'Approved' && i.approvedBy?.kind !== 'RESOLVED');
  if (!inv) throw new Error('the seed holds no Approved invoice with an unnamed approval');
  return inv.id;
};
const reapprove = (scope: QueryScope, id: string) =>
  svc.dispatch(scope, { transitionId: 't_invoice_reapprove', entity: 'invoice', entityId: id, payload: {} });
const release = (scope: QueryScope, id: string, bypassReason?: string) =>
  svc.dispatch(scope, {
    transitionId: 't_invoice_release_payment',
    entity: 'invoice',
    entityId: id,
    payload: {},
    ...(bypassReason === undefined ? {} : { bypassReason }),
  });

beforeEach(() => {
  invoiceStore.reset();
  commandAuditSink.clear();
});
afterEach(() => moduleDeployment.reset());

describe('ADM-1 · the two administrator roles', () => {
  it('hold the same permissions: every buyer lane atom, governance included, and no supplier act', () => {
    const lanes = PERSONA_SYSTEM_ROLES.buyer.filter((r) => !SUPERSET_ROLES.has(r));
    const buyerAtoms = [...new Set(lanes.flatMap((r) => SYSTEM_ROLES[r]))].sort();
    expect(buyerAtoms).toContain('rfq:award');
    expect([...SYSTEM_ROLES.admin].sort()).toEqual(buyerAtoms);
    expect([...SYSTEM_ROLES.super_admin].sort()).toEqual(buyerAtoms);
    // Governance, by name.
    for (const atom of ['role:grant', 'module:set', 'enforcement:set', 'delivery:policy-set', 'psl:cap-set']) {
      expect(SYSTEM_ROLES.super_admin, atom).toContain(atom);
      expect(SYSTEM_ROLES.admin, atom).toContain(atom);
    }
    // Never a supplier tenant's act — every supplier lane atom is absent.
    const supplierAtoms = PERSONA_SYSTEM_ROLES.supplier.flatMap((r) => SYSTEM_ROLES[r]);
    expect(supplierAtoms).toContain('po:confirm');
    for (const atom of supplierAtoms) {
      expect(SYSTEM_ROLES.super_admin, atom).not.toContain(atom);
      expect(SYSTEM_ROLES.admin, atom).not.toContain(atom);
    }
  });

  it('are holdable on the buyer side and seeded on no seat', () => {
    expect(PERSONA_SYSTEM_ROLES.buyer).toContain('admin');
    expect(PERSONA_SYSTEM_ROLES.buyer).toContain('super_admin');
    expect(PERSONA_SYSTEM_ROLES.supplier).not.toContain('super_admin');
    expect(SEEDED_SEAT_ROLES.buyer).not.toContain('admin');
    expect(SEEDED_SEAT_ROLES.buyer).not.toContain('super_admin');
  });

  it('the sample holder reads "Super Admin 1 (SAMPLE)", and Admin 1 is a different person', () => {
    const en = { ...rolesEn, ...identityEn };
    const t = (key: string, opts?: Record<string, unknown>): string =>
      (en[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts?.[k] ?? ''));
    expect(personLabel(SUPER.person.personId, t)).toBe('Super Admin 1 (SAMPLE)');
    expect(personLabel(ADMIN.person.personId, t)).toBe('Admin 1 (SAMPLE)');
    // Exactly one roster row holds the Super Admin role, and it is the one named for it.
    expect(SAMPLE_PEOPLE.filter((p) => p.roles.includes(SUPER_ADMIN_ROLE)).map((p) => p.personId)).toEqual([
      SUPER.person.personId,
    ]);
    expect(SAMPLE_PEOPLE.filter((p) => p.roles.includes('admin')).map((p) => p.personId)).toEqual([
      ADMIN.person.personId,
    ]);
  });
});

describe('ADM-1 · THE PIN — the same act, two seats', () => {
  it('Admin: approving an invoice and then releasing its payment is refused by four-eyes', async () => {
    const id = unnamedApproved();
    expect((await reapprove(seat('admin', ADMIN), id)).status).toBe('done');
    const res = await release(seat('admin', ADMIN), id, 'an Admin states a reason and it changes nothing');
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.INVOICE_RELEASER_NOT_APPROVER), res.reason).toBe(true);
    expect(res.reason).toContain('INVOICE_RELEASER_IS_APPROVER:');
    expect(invoiceStore.get(id)?.status).toBe('Approved');
    // Nothing on the trail says a rule stood aside.
    expect(commandAuditSink.all().some((e) => e.bypass !== undefined)).toBe(false);
  });

  it('Super Admin: the same act is admitted, and the event carries the rule and the reason', async () => {
    const id = unnamedApproved();
    expect((await reapprove(seat('super_admin', SUPER), id)).status).toBe('done');
    const res = await release(seat('super_admin', SUPER), id, 'Month-end close; the second approver is on leave');
    expect(res.status, res.reason).not.toBe('failed');
    expect(invoiceStore.get(id)?.status).not.toBe('Approved');
    const event = commandAuditSink.all().find((e) => e.correlationId === res.correlationId);
    expect(event?.bypass).toEqual({
      rules: ['INVOICE_RELEASER_IS_APPROVER'],
      reason: 'Month-end close; the second approver is on leave',
    });
    expect(event?.attribution).toEqual(SUPER);
  });

  it('Super Admin with NO reason is refused by name, and nothing is released', async () => {
    const id = unnamedApproved();
    await reapprove(seat('super_admin', SUPER), id);
    for (const bad of [undefined, '', '   ', 'two\nlines', 'x'.repeat(BYPASS_REASON_MAX + 1)]) {
      const res = await release(seat('super_admin', SUPER), id, bad);
      expect(res.status, String(bad)).toBe('failed');
      expect(res.reason, String(bad)).toContain(`${SUPER_ADMIN_REASON_REQUIRED}:`);
      expect(bypassRulesIn(res.reason)).toEqual(['INVOICE_RELEASER_IS_APPROVER']);
    }
    expect(invoiceStore.get(id)?.status).toBe('Approved');
    expect(commandAuditSink.all().some((e) => e.bypass !== undefined)).toBe(false);
    // A reader is told in their own locale, with no developer sentence.
    const refused = await release(seat('super_admin', SUPER), id);
    expect(describeRefusal(refused.reason, 'en')).toMatch(/^This act passes a four-eyes check/);
    expect(describeRefusal(refused.reason, 'id')).toMatch(/^Tindakan ini melewati pemeriksaan empat-mata/);
  });

  it('an ordinary Super Admin act asks for no reason and carries no bypass — and is still recorded', async () => {
    const id = unnamedApproved();
    const res = await reapprove(seat('super_admin', SUPER), id);
    expect(res.status).toBe('done');
    const event = commandAuditSink.all().find((e) => e.correlationId === res.correlationId);
    expect(event?.bypass).toBeUndefined();
    expect(superAdminActs(commandAuditSink.all()).map((a) => a.transitionId)).toEqual(['t_invoice_reapprove']);
  });
});

describe('ADM-1 · who is exempt', () => {
  it('the role AND a named person; the role alone is not exempt', async () => {
    expect(isSuperAdminSeat(seat('super_admin', SUPER))).toBe(true);
    expect(isSuperAdminSeat(seat('super_admin'))).toBe(false);
    expect(isSuperAdminSeat(seat('admin', ADMIN))).toBe(false);
    expect(isSuperAdminSeat(seat('buyer_all', SUPER))).toBe(false);
  });

  it('a SAMPLE Super Admin is not exempt on a production deployment', async () => {
    const id = unnamedApproved();
    await reapprove(seat('super_admin', SUPER), id);
    moduleDeployment.set(null);
    expect(moduleDeployment.isProduction()).toBe(true);
    expect(isSuperAdminSeat(seat('super_admin', SUPER))).toBe(false);
    const res = await release(seat('super_admin', SUPER), id, 'a reason');
    expect(res.reason).toContain('INVOICE_RELEASER_IS_APPROVER:');
    moduleDeployment.reset();
    expect(isSuperAdminSeat(seat('super_admin', SUPER))).toBe(true);
  });

  it('a reason is one line of 1 to the limit; the same predicate the dialog reads', () => {
    expect(readBypassReason('  kept  ')).toBe('kept');
    expect(readBypassReason('x'.repeat(BYPASS_REASON_MAX))).toHaveLength(BYPASS_REASON_MAX);
    for (const bad of [undefined, null, 3, '', ' ', 'a\nb', 'a\rb']) expect(readBypassReason(bad)).toBeNull();
  });
});

describe('ADM-1 · the checks that stand aside are named, in both locales', () => {
  // The population comes from the SOURCE of the policies — every head a check
  // asks the exemption for — so a sixth check joins by being written.
  const source = stripSourceComments(
    readFileSync(join(process.cwd(), 'src', 'services', 'transitions', 'policies.ts'), 'utf8'),
    'delete',
    'policies.ts',
  );
  const asked = [...new Set([...source.matchAll(/exempt\?\.\('([A-Z0-9_]+)'\)/g)].map((m) => m[1]))].sort();

  it('the population is real: the four-eyes heads are in it, a made-up one is not', () => {
    expect(asked).toContain('INVOICE_RELEASER_IS_APPROVER');
    expect(asked).toContain('PSL_SEAT_HOLDS_BOTH_AUTHORITIES');
    expect(asked).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
    expect(asked).not.toContain('NOT_A_REAL_HEAD');
  });

  it('every head has a label in EN and ID, and no label names a head no check asks for', () => {
    const labelled = (dict: Record<string, string>): string[] =>
      Object.keys(dict)
        .filter((k) => k.startsWith('superAdmin.rule.') && k !== 'superAdmin.rule.unknown')
        .map((k) => k.slice('superAdmin.rule.'.length))
        .sort();
    expect(labelled(superAdminEn)).toEqual(asked);
    expect(labelled(superAdminId)).toEqual(asked);
  });

  it('only a refusal of a segregation or sample-identity kind is asked for — never a named-seat one', () => {
    for (const head of asked) expect(head, head).not.toMatch(/UNATTRIBUTED|UNNAMED/);
  });
});

describe('ADM-1 · the reason is asked once, at the command seam', () => {
  it('with a prompt registered the act is taken again with the stated reason', async () => {
    const id = unnamedApproved();
    await reapprove(seat('super_admin', SUPER), id);
    const asked: (readonly string[])[] = [];
    const off = registerBypassReasonPrompt(async (rules) => {
      asked.push(rules);
      return 'Stated in the pop-up';
    });
    try {
      const res = await release(seat('super_admin', SUPER), id);
      expect(res.status, res.reason).not.toBe('failed');
      expect(asked).toEqual([['INVOICE_RELEASER_IS_APPROVER']]);
      // ONE event for the release: it was previewed, not refused and retried.
      const releases = commandAuditSink.byEvent('t_invoice_release_payment');
      expect(releases.map((e) => e.outcome)).toEqual([res.status]);
      expect(commandAuditSink.all().find((e) => e.correlationId === res.correlationId)?.bypass?.reason).toBe(
        'Stated in the pop-up',
      );
    } finally {
      off();
    }
  });

  it('a cancel leaves the refusal standing, and an Admin is never asked', async () => {
    const id = unnamedApproved();
    await reapprove(seat('super_admin', SUPER), id);
    let calls = 0;
    const off = registerBypassReasonPrompt(async () => {
      calls += 1;
      return null;
    });
    try {
      const res = await release(seat('super_admin', SUPER), id);
      expect(res.status).toBe('failed');
      expect(res.reason).toContain(`${SUPER_ADMIN_REASON_REQUIRED}:`);
      expect(calls).toBe(1);
      invoiceStore.reset();
      const other = unnamedApproved();
      await reapprove(seat('admin', ADMIN), other);
      const refused = await release(seat('admin', ADMIN), other);
      expect(refused.reason).toContain('INVOICE_RELEASER_IS_APPROVER:');
      expect(calls).toBe(1);
    } finally {
      off();
    }
  });
});

describe('ADM-1 · the preview asks which checks would stand aside and takes no act', () => {
  it('leaves no event, no status and no state behind, and answers the same heads the refusal names', async () => {
    const id = unnamedApproved();
    await reapprove(seat('super_admin', SUPER), id);
    const before = commandAuditSink.all().length;
    const off = registerBypassReasonPrompt(async () => null);
    try {
      // A cancel: the preview ran, the person declined, the command was dispatched once and refused.
      const res = await release(seat('super_admin', SUPER), id);
      expect(res.status).toBe('failed');
      expect(bypassRulesIn(res.reason)).toEqual(['INVOICE_RELEASER_IS_APPROVER']);
      expect(commandAuditSink.all().length).toBe(before + 1);
      expect(invoiceStore.get(id)?.status).toBe('Approved');
    } finally {
      off();
    }
  });

  it('a seat that is not exempt is never previewed and never asked', async () => {
    const id = unnamedApproved();
    await reapprove(seat('admin', ADMIN), id);
    let calls = 0;
    const off = registerBypassReasonPrompt(async () => {
      calls += 1;
      return 'never used';
    });
    try {
      const before = commandAuditSink.all().length;
      const res = await release(seat('admin', ADMIN), id);
      expect(res.reason).toContain('INVOICE_RELEASER_IS_APPROVER:');
      expect(calls).toBe(0);
      expect(commandAuditSink.all().length).toBe(before + 1);
    } finally {
      off();
    }
  });
});

describe('ADM-1 · the activity view and the document note read the same trail', () => {
  it('lists every Super Admin act, newest first, with the rule and reason; nobody else\'s acts', async () => {
    const id = unnamedApproved();
    await reapprove(seat('super_admin', SUPER), id);
    await release(seat('super_admin', SUPER), id); // refused: no reason
    await release(seat('super_admin', SUPER), id, 'Reasoned release');
    invoiceStore.reset();
    await reapprove(seat('admin', ADMIN), unnamedApproved());

    const acts = superAdminActs(commandAuditSink.all());
    expect(acts.map((a) => [a.transitionId, a.status === 'failed' ? 'refused' : 'act', a.bypassedRules.length])).toEqual([
      ['t_invoice_release_payment', 'act', 1],
      ['t_invoice_release_payment', 'refused', 0],
      ['t_invoice_reapprove', 'act', 0],
    ]);
    expect(acts.every((a) => a.personId === SUPER.person.personId)).toBe(true);
    // The refusal is told apart from any other: it was the bypass's own.
    expect(acts.map((a) => a.refusedForNoReason)).toEqual([false, true, false]);
    expect(acts[0]).toMatchObject({ entity: 'invoice', entityId: id, reason: 'Reasoned release' });

    expect(filterSuperAdminActs(acts, 'bypassed', '').map((a) => a.id)).toEqual([acts[0].id]);
    expect(filterSuperAdminActs(acts, 'refused', '').map((a) => a.id)).toEqual([acts[1].id]);
    expect(filterSuperAdminActs(acts, 'all', 'reasoned release')).toHaveLength(1);
    expect(filterSuperAdminActs(acts, 'all', 'no such thing')).toHaveLength(0);

    // The document carries it — and a document nobody bypassed a check on carries nothing.
    expect(bypassesOn(commandAuditSink.all(), 'invoice', id).map((a) => a.reason)).toEqual(['Reasoned release']);
    expect(bypassesOn(commandAuditSink.all(), 'invoice', 'inv-not-a-real-one')).toEqual([]);
  });

  it('is for the Super Admin and Compliance, and for no other seat', () => {
    expect(maySeeSuperAdminActivity({ businessRoles: ['super_admin'] })).toBe(true);
    expect(maySeeSuperAdminActivity({ businessRoles: ['compliance'] })).toBe(true);
    for (const role of ['admin', 'buyer_all', 'procurement', 'finance', 'supplier']) {
      expect(maySeeSuperAdminActivity({ businessRoles: [role] }), role).toBe(false);
    }
    expect(maySeeSuperAdminActivity({})).toBe(false);
  });
});

describe('ADM-1 · the sample-identity governance lock stands aside for the Super Admin, and for nobody else', () => {
  // A LOOSENING of a governed check: `OBSERVE` is below the `BLOCK` an unset
  // check derives. `sampleIdentityLocks.test.ts` holds the lock for every other
  // seat; this is the one seat the ruling exempts.
  const loosen = (bypassReason?: string) => ({
    transitionId: 't_enforcement_set',
    entity: 'enforcement',
    entityId: 'halal.certificate',
    payload: { mode: 'OBSERVE', reviewBy: '2027-01-31' },
    ...(bypassReason === undefined ? {} : { bypassReason }),
  });

  beforeEach(() => enforcementSettingStore.reset());

  it('Admin (a sample person) is refused by the lock; Super Admin is admitted with a reason, and the event says which lock', async () => {
    const admin = await svc.dispatch(seat('admin', ADMIN), loosen('a reason changes nothing for Admin'));
    expect(admin.status).toBe('failed');
    expect(admin.reason).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN:');
    expect(enforcementSettingStore.all()).toEqual([]);

    const bare = await svc.dispatch(seat('super_admin', SUPER), loosen());
    expect(bare.reason).toContain(`${SUPER_ADMIN_REASON_REQUIRED}:`);
    expect(bypassRulesIn(bare.reason)).toEqual(['SAMPLE_ACTOR_CANNOT_LOOSEN']);
    expect(enforcementSettingStore.all()).toEqual([]);

    const ok = await svc.dispatch(seat('super_admin', SUPER), loosen('Demonstration of the observe mode'));
    expect(ok.status, ok.reason).toBe('done');
    expect(enforcementSettingStore.all().map((s) => s.mode)).toEqual(['OBSERVE']);
    expect(commandAuditSink.all().find((e) => e.correlationId === ok.correlationId)?.bypass).toEqual({
      rules: ['SAMPLE_ACTOR_CANNOT_LOOSEN'],
      reason: 'Demonstration of the observe mode',
    });
  });

  it('the exemption does not skip the hook\'s OTHER checks: a relaxation still needs its review date', async () => {
    const res = await svc.dispatch(seat('super_admin', SUPER), {
      ...loosen('a reason'),
      payload: { mode: 'OBSERVE' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('requires reviewBy');
    expect(enforcementSettingStore.all()).toEqual([]);
  });
});
