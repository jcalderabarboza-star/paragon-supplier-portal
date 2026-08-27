import { describe, it, expect, beforeEach } from 'vitest';
import { mockIdentitySource } from './identitySources';
import { mockSuppliers } from '../data/mockSuppliers';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE TENANT SURVIVES A RELOAD — AND THE NAME IS RESOLVED, NEVER TRUSTED.
//
// `supplierId` was the ONE field `isCurrentIdentity` validated and `load` then
// threw away: the return re-seeded it from `identityForPersona`, so a persisted
// tenant sat on disk being ignored while the seat silently stayed `sup-007`.
//
// This is not a display field. `scope.supplierId` is the tenancy gate the
// dispatcher refuses on (`SCOPE_DENIED`) AND the shard `scopeKey` divides every
// query cache by — so a seat that silently reverts is a seat reading another
// tenant's rows with every guard reporting success.
//
// ⚠️ **THE PRODUCER IS DEVTOOLS, DELIBERATELY.** Derived: five `setIdentity`
// call sites exist and not one can ORIGINATE a `supplierId` other than the seed
// or `null` (`IdentityPanel` spreads `...identity`, so it carries a tenant but
// cannot mint one). That is F1's job — when the persona toggle dies the
// originator is an OIDC claim, not a picker — so a picker is NOT built here.
// The enforcement is real regardless: the gate refuses and the cache separates.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'paragon.identity';
const REAL = 'sup-002'; // a real second tenant: present in all 13 fixture files
const SEED = 'sup-007';

const persist = (row: Record<string, unknown>) =>
  window.localStorage.setItem(KEY, JSON.stringify(row));

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '#/supplier/dashboard';
});

describe('⚠️ the persisted tenant is honoured', () => {
  it('CONTROL — the fixture premise: sup-002 is a real supplier and is NOT the seed', () => {
    // A test that asserts a seat resolves to sup-002 proves nothing if sup-002
    // is not a supplier, or if it happens to be what the seed returns anyway.
    expect(mockSuppliers.some((s) => s.id === REAL)).toBe(true);
    expect(REAL).not.toBe(SEED);
    expect(mockSuppliers.some((s) => s.id === 'sup-999')).toBe(false);
  });

  it('a persisted supplierId survives the reload', () => {
    persist({ personaType: 'supplier', supplierId: REAL, supplierName: null });
    const id = mockIdentitySource.load();
    expect(id.personaType).toBe('supplier');
    expect(id.supplierId).toBe(REAL);
  });

  it('⚠️ the NAME comes from the supplier master, never from the stored row', () => {
    // localStorage is caller-supplied. A row naming sup-002 while claiming
    // sup-007's NAME would print another tenant's identity over sup-002's rows —
    // a lie the scoping gate cannot catch, because the id it enforces on is right.
    persist({
      personaType: 'supplier',
      supplierId: REAL,
      supplierName: 'PT Sample Packaging Indonesia',
    });
    const id = mockIdentitySource.load();
    const master = mockSuppliers.find((s) => s.id === REAL)!;
    expect(id.supplierId).toBe(REAL);
    expect(id.supplierName).toBe(master.name);
    expect(id.supplierName).not.toBe('PT Sample Packaging Indonesia');
  });

  it('nothing persisted → the seat SEEDS, because a cold start must open with data', () => {
    const id = mockIdentitySource.load();
    expect(id.personaType).toBe('supplier');
    expect(id.supplierId).toBe(SEED);
  });

  it('⚠️ a supplierId naming NO supplier REFUSES — it does not fall back to the seed', () => {
    // The whole point: "nothing stored" and "stored something that is not a
    // supplier" are different facts, and only the first is safe to guess at.
    persist({ personaType: 'supplier', supplierId: 'sup-999', supplierName: null });
    const id = mockIdentitySource.load();
    expect(id.supplierId).toBeNull();
    expect(id.supplierId).not.toBe(SEED);
    expect(id.supplierName).toBeNull();
  });

  it('an empty-string supplierId seeds rather than refusing — it is absence, not a claim', () => {
    persist({ personaType: 'supplier', supplierId: '', supplierName: null });
    expect(mockIdentitySource.load().supplierId).toBe(SEED);
  });

  it('⚠️ a BUYER seat is never narrowed by a stored tenant', () => {
    // A buyer reads the cross-supplier superset; `supplierId: null` is what
    // makes that true. Honouring a stored one here would invert the contract.
    window.location.hash = '#/buyer/dashboard';
    persist({ personaType: 'buyer', supplierId: REAL, supplierName: null });
    const id = mockIdentitySource.load();
    expect(id.personaType).toBe('buyer');
    expect(id.supplierId).toBeNull();
  });

  it('switching SIDES re-seeds — a tenant does not survive a persona change', () => {
    persist({ personaType: 'buyer', supplierId: null, supplierName: null });
    window.location.hash = '#/supplier/dashboard';
    expect(mockIdentitySource.load().supplierId).toBe(SEED);
  });

  it('save() then load() round-trips the tenant — the field is no longer write-only', () => {
    const next = {
      personaType: 'supplier' as const,
      supplierId: REAL,
      supplierName: mockSuppliers.find((s) => s.id === REAL)!.name,
      businessRoles: ['supplier', 'fulfilment'] as readonly string[],
      actor: mockIdentitySource.load().actor,
    };
    mockIdentitySource.save(next);
    const back = mockIdentitySource.load();
    expect(back.supplierId).toBe(REAL);
    expect([...back.businessRoles].sort()).toEqual(['fulfilment', 'supplier']);
  });
});
