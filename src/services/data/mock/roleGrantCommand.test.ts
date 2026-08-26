// ────────────────────────────────────────────────────────────────────────────
// t_role_grant — a compliance seat copies a system role and adds to it, THROUGH
// THE REAL DISPATCHER AND THE REAL STORE.
//
// ⚠️ **THE FINDING THAT DECIDED THE SHAPE (D3):** a grant written straight to
// the store would be THE ONLY PRIVILEGE-GRANTING ACT IN THE PLATFORM WITH NO
// `TransitionEvent`. So the first thing proved here is the audit record, not the
// permission — the permission is what the act is FOR, the record is what makes
// it answerable a year later.
//
// Five things are proved, and they are the five the rulings asked for:
//   • it is a DISPATCHED verb, so every grant lands in the DR-10 trail;
//   • `role:grant` IS A COMPLIANCE ATOM — procurement is refused at the role
//     gate, which is the ruling that procurement cannot lower the bar it is
//     measured against, enforced rather than written down;
//   • A CUSTOM ROLE MAY NOT SPAN TENANCIES, refused AT THE VERB, by name;
//   • the store APPENDS, and `grantedAt` / `parentAtomsAtGrant` are MINTED
//     THERE — a caller cannot backdate a grant or fake its drift baseline;
//   • the granted role is ENFORCED: a seat holding it can fire a verb its
//     parent's bundle alone would not reach.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { customRoleStore } from '../../transitions/customRoles';
import { getKnownFlows } from '../../transitions';

const svc = new MockCommandService();

/** The portal can name nobody. This is the honest attribution, not a stub. */
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

const compliance: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NOBODY,
};
const procurement: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement', 'receiving', 'finance'],
  actor: NOBODY,
};
const supplier: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NOBODY,
};

const grant = (over: Record<string, unknown> = {}, parent = 'receiving') => ({
  transitionId: 't_role_grant',
  entity: 'role',
  entityId: parent,
  payload: {
    roleId: 'jakarta-night-shift',
    displayName: 'Jakarta Night Shift',
    description: 'The dock, after hours.',
    adds: ['invoice:dispute'],
    grantedBy: NOBODY,
    ...over,
  },
});

beforeEach(() => {
  customRoleStore.reset();
  commandAuditSink.clear();
});

describe('POPULATION GUARD', () => {
  it('the flow is registered and the store ships empty', () => {
    // §42b — an instrument over an empty registry answers "nothing collides" to
    // every question. Membership, never a count.
    expect(getKnownFlows().map((f) => f.entity)).toContain('role');
    expect(customRoleStore.all()).toEqual([]);
  });
});

describe('⚠️ IT IS A DISPATCHED VERB — the grant lands in the DR-10 trail', () => {
  it('records the role AND emits a TransitionEvent for it', async () => {
    const result = await svc.dispatch(compliance, grant());
    expect(result.status).not.toBe('failed');

    const stored = customRoleStore.byId('jakarta-night-shift');
    expect(stored?.parent).toBe('receiving');
    expect(stored?.adds).toEqual(['invoice:dispute']);

    const events = commandAuditSink.byEvent('t_role_grant');
    expect(events.length).toBe(1);
    expect(events[0].outcome).not.toBe('failed');
    expect(events[0].correlationId).toBe(result.correlationId);
    expect(events[0].actor).toBe('buyer:all');
    expect(events[0].ts).toEqual(expect.any(String));
  });

  it('⚠️ A REFUSED GRANT IS RECORDED TOO, WITH ITS REASON', () => {
    // §43 — until `reason` was on the event, a failure whose result nobody kept
    // left a record saying only THAT it failed. A refused privilege grant is
    // exactly the record an audit wants.
    return svc.dispatch(compliance, grant({ roleId: 'finance' })).then((result) => {
      expect(result.status).toBe('failed');
      const events = commandAuditSink.byEvent('t_role_grant');
      expect(events.length).toBe(1);
      expect(events[0].outcome).toBe('failed');
      expect(events[0].reason).toContain('already a system role');
    });
  });

  it('the store APPENDS — a second grant does not replace the first', async () => {
    await svc.dispatch(compliance, grant());
    await svc.dispatch(compliance, grant({ roleId: 'surabaya-dock', displayName: 'Surabaya Dock' }));
    expect(customRoleStore.all().map((r) => r.id)).toEqual([
      'jakarta-night-shift',
      'surabaya-dock',
    ]);
  });
});

describe('⚠️ THE ROLE GATE — procurement cannot lower the bar it is measured against', () => {
  it('a procurement seat is REFUSED, and it is the role gate that refuses', async () => {
    const result = await svc.dispatch(procurement, grant());
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('ROLE_NOT_PERMITTED');
    expect(customRoleStore.all()).toEqual([]);
  });

  it('⚠️ AND A COMPLIANCE SEAT IS ALLOWED — the known-GOOD half of the gate', async () => {
    // Without this, a verb nobody could ever fire would pass the test above.
    const result = await svc.dispatch(compliance, grant());
    expect(result.status).not.toBe('failed');
  });

  it('a supplier seat is refused — role editing is a buyer governance act', async () => {
    const result = await svc.dispatch(supplier, grant());
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('ROLE_NOT_PERMITTED');
  });

  it('a scope with NO businessRoles is refused — there is no persona fallback', async () => {
    const result = await svc.dispatch(
      { personaType: 'buyer', supplierId: null },
      grant(),
    );
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('ROLE_NOT_PERMITTED');
  });
});

describe('⚠️ TENANCY IS REFUSED AT THE VERB, NOT AT THE SURFACE', () => {
  it('a supplier atom added to a buyer child is refused BY NAME', async () => {
    const result = await svc.dispatch(compliance, grant({ adds: ['po:confirm'] }));
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('po:confirm');
    expect(result.reason).toContain('may not span tenancies');
    expect(customRoleStore.all()).toEqual([]);
  });

  it('one bad atom refuses the WHOLE grant — no partial role is recorded', async () => {
    const result = await svc.dispatch(
      compliance,
      grant({ adds: ['invoice:dispute', 'po:confirm'] }),
    );
    expect(result.status).toBe('failed');
    expect(customRoleStore.all()).toEqual([]);
  });

  it('`admin` cannot be copied — the one cross-tenancy role stays the only one', async () => {
    // A non-empty `adds`, deliberately: an empty one is refused by rule 5
    // (`MISSING_FIELDS:adds`) BEFORE any policy runs, and this test is about the
    // policy's tenancy arm rather than about field presence.
    const result = await svc.dispatch(compliance, grant({ adds: ['invoice:dispute'] }, 'admin'));
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('spans both tenancies');
  });

  it('an unknown parent is NOT_FOUND, never a silently-minted role', async () => {
    // It THROWS rather than resolving `failed` — the dispatcher's own shape for
    // an entity that does not exist, and the reason `readState` answers null for
    // anything that is not a system role. Measured, not assumed.
    await expect(svc.dispatch(compliance, grant({}, 'not-a-role'))).rejects.toThrow(
      /not found/i,
    );
    expect(customRoleStore.all()).toEqual([]);
  });
});

describe('THE REMAINING REFUSALS, each naming what it refused', () => {
  it('a machine-only atom', async () => {
    const r = await svc.dispatch(compliance, grant({ adds: ['po:issue'] }));
    expect(r.reason).toContain('no human owner');
  });

  it('an atom the parent already holds — an addition must add something', async () => {
    const r = await svc.dispatch(compliance, grant({ adds: ['gr:post'] }));
    expect(r.reason).toContain('already held');
  });

  it('a duplicate id', async () => {
    await svc.dispatch(compliance, grant());
    const r = await svc.dispatch(compliance, grant({ adds: ['invoice:approve'] }));
    expect(r.reason).toContain('already been granted');
  });

  it('a name prefixed with the loaded translation namespace', async () => {
    // ⚠️ THE RULE THIS REPLACED WAS WRONG AND WAS CORRECTED BY MEASUREMENT. The
    // first version banned ':' and '.' outright, on the theory that i18next
    // would truncate a name containing either. Probed against this app's own
    // i18n instance: `t('Night: Jakarta')` and `t('The dock, after hours.')`
    // both come back WHOLE. The only prefix that genuinely resolves is the one
    // loaded namespace, so that is what is refused — and a description can end
    // in a full stop, which the wrong rule had made impossible.
    const ok = await svc.dispatch(compliance, grant({ displayName: 'Night: Jakarta' }));
    expect(ok.status).not.toBe('failed');
    const bad = await svc.dispatch(
      compliance,
      grant({ roleId: 'surabaya-dock', displayName: 'translation:roles.owner.admin' }),
    );
    expect(bad.reason).toContain('displayName');
    expect(bad.reason).toContain('namespace');
  });

  it('a malformed attribution', async () => {
    const r = await svc.dispatch(compliance, grant({ grantedBy: 'Rina' }));
    expect(r.reason).toContain('grantedBy');
  });

  it('a missing field is caught before any of it — requiredFields', async () => {
    const bad = grant();
    delete (bad.payload as Record<string, unknown>).adds;
    const r = await svc.dispatch(compliance, bad);
    expect(r.status).toBe('failed');
    expect(customRoleStore.all()).toEqual([]);
  });
});

describe('⚠️ PROVENANCE IS MINTED BY THE STORE, NEVER SUPPLIED', () => {
  it('`grantedAt` and `parentAtomsAtGrant` ignore anything the caller sends', async () => {
    await svc.dispatch(
      compliance,
      grant({
        grantedAt: '1999-01-01T00:00:00.000Z',
        parentAtomsAtGrant: ['invoice:pay'],
      }),
    );
    const stored = customRoleStore.byId('jakarta-night-shift')!;
    expect(stored.grantedAt).not.toBe('1999-01-01T00:00:00.000Z');
    // The baseline is the parent's REAL atoms — a caller that could set it could
    // fake the drift check into silence, which is the one thing it exists for.
    expect([...stored.parentAtomsAtGrant].sort()).toEqual([...SYSTEM_ROLES.receiving].sort());
  });

  it('the attribution is preserved verbatim — an explicit absence, not a person', async () => {
    await svc.dispatch(compliance, grant());
    expect(customRoleStore.byId('jakarta-night-shift')!.grantedBy).toEqual(NOBODY);
  });
});

describe('⚠️ THE GRANT IS ENFORCED — this is what makes it a role and not a row', () => {
  const child: QueryScope = {
    personaType: 'buyer',
    supplierId: null,
    businessRoles: ['jakarta-night-shift'],
    actor: NOBODY,
  };

  it('a seat holding the custom role can fire a verb its parent could not', async () => {
    // The demonstration is deliberately `role:grant` itself: a dock role widened
    // with the role editor's own permission. It needs no document fixture, and
    // it is the sharpest statement of what the compliance gate is guarding — the
    // grant that hands out the power to grant.
    expect(SYSTEM_ROLES.receiving).not.toContain('role:grant');
    await svc.dispatch(compliance, grant({ adds: ['role:grant'] }));

    const parentSeat: QueryScope = { ...child, businessRoles: ['receiving'] };
    const second = (seat: QueryScope) =>
      svc.dispatch(seat, grant({ roleId: 'surabaya-dock', displayName: 'Surabaya Dock' }));

    const denied = await second(parentSeat);
    expect(denied.status).toBe('failed');
    expect(denied.reason).toContain('ROLE_NOT_PERMITTED');

    const allowed = await second(child);
    expect(allowed.status).not.toBe('failed');
    expect(customRoleStore.byId('surabaya-dock')).toBeDefined();
  });

  it('and the grant does not survive the session', async () => {
    await svc.dispatch(compliance, grant({ adds: ['role:grant'] }));
    customRoleStore.reset(); // what a reload is
    const result = await svc.dispatch(
      child,
      grant({ roleId: 'surabaya-dock', displayName: 'Surabaya Dock' }),
    );
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('ROLE_NOT_PERMITTED');
  });
});
