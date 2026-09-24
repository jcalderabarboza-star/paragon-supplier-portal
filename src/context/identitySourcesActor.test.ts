import { describe, it, expect, beforeEach } from 'vitest';

import { mockIdentitySource } from './identitySources';
import { NO_PERSON } from './noPerson';
import {
  SAMPLE_PEOPLE,
  SAMPLE_PERSON_PREFIX,
  samplePeopleFor,
} from '../services/identity/sampleRoster';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE ACTOR SURVIVES A RELOAD — AND AN UNKNOWN PERSON DOES NOT (R3).
//
// `localStorage` is caller-supplied. A stored row claiming
// `{ kind: 'RESOLVED', person: { personId: 'whoever' } }` must not become an
// attribution: every act that seat then took would be recorded against a person
// this portal does not have. That is C10 §6.3's MANUFACTURED PROVENANCE,
// produced by editing a browser field — the cheapest possible way to forge one.
//
// ⚠️ **AND THE FALLBACK IS THE HONEST ABSENCE, NEVER THE LAST KNOWN PERSON.**
// "Stored nothing" and "stored somebody who does not exist" are different facts
// and only one of them is safe to guess at; both land on `NO_PERSON`, because
// there is no third thing an unresolvable actor could honestly be.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'paragon.identity';

const store = (row: unknown): void =>
  window.localStorage.setItem(KEY, JSON.stringify(row));

const BUYER = samplePeopleFor('buyer')[0];
const SUPPLIER = samplePeopleFor('supplier')[0];

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
});

describe('POPULATION GUARD — the roster this spec pins is real', () => {
  it('names a buyer and a supplier person that actually exist', () => {
    // A named-member pin, not a count: if the roster is re-authored, this goes
    // red rather than silently testing nothing
    // (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`).
    expect(SAMPLE_PEOPLE.length).toBeGreaterThan(5);
    expect(BUYER).toBeDefined();
    expect(SUPPLIER).toBeDefined();
    expect(BUYER.personaType).toBe('buyer');
    expect(SUPPLIER.personaType).toBe('supplier');
  });
});

describe('⚠️ THE STORED ACTOR — carried, or refused', () => {
  it('a known buyer person survives the reload', () => {
    store({
      personaType: 'buyer',
      supplierId: null,
      supplierName: null,
      businessRoles: [...BUYER.roles],
      actor: { kind: 'RESOLVED', person: { personId: BUYER.personId } },
    });
    const loaded = mockIdentitySource.load();
    expect(loaded.actor).toEqual({ kind: 'RESOLVED', person: { personId: BUYER.personId } });
  });

  it('⚠️ AN UNKNOWN personId FALLS BACK TO NO PERSON — never to a guessed one', () => {
    store({
      personaType: 'buyer',
      supplierId: null,
      supplierName: null,
      businessRoles: [...BUYER.roles],
      // Hand-edited: shaped exactly like a roster id, and on no roster.
      //
      // ⚠️ **BUILT FROM THE PREFIX CONSTANT RATHER THAN WRITTEN AS A LITERAL,
      // AND THE C10 §6.3 PIN IS WHY.** A literal `sim-usr-…` here is a module
      // minting a fixture person id of its own, which is the exact thing that
      // pin refuses — it went red on this file. Deriving it keeps the pin
      // maximally strict (no entitlement was added for this spec) and makes the
      // id follow the namespace if it is ever renamed.
      actor: {
        kind: 'RESOLVED',
        person: { personId: `${SAMPLE_PERSON_PREFIX}not-a-person` },
      },
    });
    expect(mockIdentitySource.load().actor).toEqual(NO_PERSON);
  });

  it('an id that is not even roster-SHAPED is refused the same way', () => {
    store({
      personaType: 'buyer',
      supplierId: null,
      supplierName: null,
      businessRoles: [...BUYER.roles],
      actor: { kind: 'RESOLVED', person: { personId: 'usr-014' } },
    });
    // ⚠️ The refusal is ROSTER MEMBERSHIP, not the `sim-usr-` spelling. A prefix
    // check would accept the case above and reject this one; a lookup rejects
    // both, which is the property that matters.
    expect(mockIdentitySource.load().actor).toEqual(NO_PERSON);
  });

  it('a malformed actor is refused — and is not coerced into UNATTRIBUTED-with-a-lie', () => {
    for (const bad of [{ kind: 'RESOLVED' }, { kind: 'RESOLVED', person: {} }, 'nobody', 42, null]) {
      store({
        personaType: 'buyer',
        supplierId: null,
        supplierName: null,
        businessRoles: [...BUYER.roles],
        actor: bad,
      });
      expect(mockIdentitySource.load().actor, JSON.stringify(bad)).toEqual(NO_PERSON);
    }
  });

  it('⚠️ A CROSS-PERSONA PERSON IS REFUSED — a buyer may not act as a supplier', () => {
    // A roster row belongs to one side of the tenancy line. Carrying a supplier
    // person onto a buyer seat would attribute buyer acts to somebody who cannot
    // hold a buyer role, and `samplePeopleFor` is what the switcher offers —
    // storage must not be able to reach past it.
    store({
      personaType: 'buyer',
      supplierId: null,
      supplierName: null,
      businessRoles: [...BUYER.roles],
      actor: { kind: 'RESOLVED', person: { personId: SUPPLIER.personId } },
    });
    expect(mockIdentitySource.load().actor).toEqual(NO_PERSON);
  });

  it('⚠️ AND THE SEAT OPENS WITH NO PERSON — opt-in, so the honest path stays live', () => {
    // R5. If a person were seeded here, every unattributed render path in the
    // portal would become a dead branch no probe could fire at.
    expect(mockIdentitySource.load().actor).toEqual(NO_PERSON);
  });
});
