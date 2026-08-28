import { describe, it, expect, beforeEach } from 'vitest';
import { describeRefusal, refusalDetailOf } from './refusalMessage';
import { COMMAND_REFUSALS, refusal } from './refusals';
import { COMMAND_REFUSAL_GLOSSARY } from '../../lib/glossary';
import { MockCommandService } from '../data/mock/MockCommandService';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import type { QueryScope } from '../data/types';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE POPULATION GUARD RUNS FIRST AND ASSERTS **MEMBERSHIP, NEVER A COUNT**
// (`EMPTY-INPUT-REPORTS-CLEAN-01`, §42b). Every table below derives its cases
// from `COMMAND_REFUSALS`, so an empty or truncated vocabulary would make them
// all vacuously green — a clean reading from an instrument that examined
// nothing looks exactly like a clean reading from one that examined everything.
// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION GUARD — the vocabulary this suite translates', () => {
  it('holds the members the cases below name, and the glossary defines each', () => {
    expect(COMMAND_REFUSALS).toContain('ROLE_NOT_PERMITTED');
    expect(COMMAND_REFUSALS).toContain('POLICY_REJECTED');
    expect(COMMAND_REFUSALS).toContain('UNKNOWN_TRANSITION');
    for (const kind of COMMAND_REFUSALS) {
      expect(COMMAND_REFUSAL_GLOSSARY[kind], `no definition for ${kind}`).toBeDefined();
      expect(COMMAND_REFUSAL_GLOSSARY[kind].en.length).toBeGreaterThan(20);
      expect(COMMAND_REFUSAL_GLOSSARY[kind].id.length).toBeGreaterThan(20);
    }
  });
});

describe('describeRefusal — every kind resolves to its OWN definition', () => {
  // Derived from the vocabulary, never hand-listed: a tenth member would be
  // translated by this suite with no edit, and a deleted one stops compiling.
  for (const kind of COMMAND_REFUSALS) {
    it(`${kind} renders the EN definition, not the wire code`, () => {
      const out = describeRefusal(refusal(kind, 'DETAIL'), 'en');
      expect(out).toContain(COMMAND_REFUSAL_GLOSSARY[kind].en);
      // The head is REPLACED. This is the assertion the defect would fail.
      expect(out).not.toContain(kind);
    });

    it(`${kind} renders the ID definition under an Indonesian locale`, () => {
      const out = describeRefusal(refusal(kind, 'DETAIL'), 'id');
      expect(out).toContain(COMMAND_REFUSAL_GLOSSARY[kind].id);
      expect(out).not.toContain(kind);
    });
  }

  it('id-ID and ID both resolve Indonesian; en-GB and undefined resolve English', () => {
    const en = COMMAND_REFUSAL_GLOSSARY.ROLE_NOT_PERMITTED.en;
    const id = COMMAND_REFUSAL_GLOSSARY.ROLE_NOT_PERMITTED.id;
    expect(describeRefusal('ROLE_NOT_PERMITTED', 'id-ID')).toBe(id);
    expect(describeRefusal('ROLE_NOT_PERMITTED', 'ID')).toBe(id);
    expect(describeRefusal('ROLE_NOT_PERMITTED', 'en-GB')).toBe(en);
    expect(describeRefusal('ROLE_NOT_PERMITTED', undefined)).toBe(en);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE FORWARD PROMISE. Four definitions refer to the suffix IN THEIR OWN
// PROSE, so dropping it would manufacture `FORWARD-PROMISE-HAS-NO-HANDLER-01`
// out of the fix. These pin the promise to the thing that keeps it.
// ─────────────────────────────────────────────────────────────────────────────
describe('the detail is retained beside the sentence', () => {
  it('ROLE_NOT_PERMITTED keeps the atom its definition promises to name', () => {
    const out = describeRefusal('ROLE_NOT_PERMITTED:po:confirm', 'en');
    expect(out).toContain('the named role');
    expect(out).toContain('(po:confirm)');
    expect(out).not.toContain('ROLE_NOT_PERMITTED');
  });

  it('ILLEGAL_TRANSITION keeps the state pair', () => {
    const out = describeRefusal('ILLEGAL_TRANSITION:Confirmed->Confirmed', 'en');
    expect(out).toContain('names the state');
    expect(out).toContain('(Confirmed->Confirmed)');
  });

  it('MISSING_FIELDS keeps the field list', () => {
    const out = describeRefusal('MISSING_FIELDS:carrier,trackingNumber,eta', 'en');
    expect(out).toContain('names each missing field');
    expect(out).toContain('(carrier,trackingNumber,eta)');
  });

  it('POLICY_REJECTED keeps the hook name AND the hook reason', () => {
    const out = describeRefusal('POLICY_REJECTED:gr_create_shipment_received:no arrived shipment', 'en');
    expect(out).toContain('names which rule');
    expect(out).toContain('(gr_create_shipment_received:no arrived shipment)');
  });

  it('the two BARE members render no empty parenthesis', () => {
    expect(describeRefusal('UNKNOWN_TRANSITION', 'en')).toBe(COMMAND_REFUSAL_GLOSSARY.UNKNOWN_TRANSITION.en);
    expect(describeRefusal('MISSING_ENTITY_ID', 'en')).toBe(COMMAND_REFUSAL_GLOSSARY.MISSING_ENTITY_ID.en);
    expect(describeRefusal('UNKNOWN_TRANSITION', 'en')).not.toContain('(');
  });

  it('refusalDetailOf is empty for bare members and for foreign strings', () => {
    expect(refusalDetailOf('UNKNOWN_TRANSITION')).toBe('');
    expect(refusalDetailOf('ROLE_NOT_PERMITTED:po:confirm')).toBe('po:confirm');
    expect(refusalDetailOf('SOMETHING_ELSE:x')).toBe('');
    expect(refusalDetailOf(undefined)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ PROBED BOTH WAYS. A translator that answers everything is not a
// translator — it is a laundry. The known-GOOD case must resolve and the
// known-FOREIGN case must be refused, asserted together so neither can be
// believed alone.
// ─────────────────────────────────────────────────────────────────────────────
describe('the honest null — nothing foreign is dressed as a known kind', () => {
  it('a reason this vocabulary does not own returns null, not a guess', () => {
    // known-GOOD control, in the same test, so a null-returning stub cannot pass
    expect(describeRefusal('ROLE_NOT_PERMITTED:po:confirm', 'en')).not.toBeNull();
    // known-FOREIGN: a DataError code, a settle fault, and free text
    expect(describeRefusal('SCOPE_DENIED', 'en')).toBeNull();
    expect(describeRefusal('TRANSPORT', 'en')).toBeNull();
    expect(describeRefusal('parent PO not found', 'en')).toBeNull();
  });

  it('an absent or empty reason returns null so the caller keeps its own default', () => {
    expect(describeRefusal(undefined, 'en')).toBeNull();
    expect(describeRefusal('', 'en')).toBeNull();
  });

  it('a NESTED code is read at the HEAD, never anywhere in the string', () => {
    // `UNDECLARED_MATERIAL` is a policy-hook reason, so it arrives BEHIND
    // `POLICY_REJECTED:<hook>:`. The kind is POLICY_REJECTED — the head — and a
    // matcher that searched the whole string would answer differently.
    const nested = 'POLICY_REJECTED:gr.inspection.materialsDeclared:UNDECLARED_MATERIAL: …';
    expect(describeRefusal(nested, 'en')).toContain(COMMAND_REFUSAL_GLOSSARY.POLICY_REJECTED.en);
    // and a foreign code sitting in the head position is still refused
    expect(describeRefusal('UNDECLARED_MATERIAL: something', 'en')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE ROUND TRIP. The cases above build wire values with `refusal()`; this
// one takes them from the DISPATCHER, so the translator is pinned to the thing
// that actually emits — not to a second copy of the format.
// ─────────────────────────────────────────────────────────────────────────────
describe('round trip — a refusal the dispatcher really emitted', () => {
  const seat = (roles: readonly string[], supplierId: string | null = null): QueryScope => ({
    personaType: supplierId ? 'supplier' : 'buyer',
    supplierId,
    businessRoles: roles,
    actor: NO_PERSON,
  });

  let svc: MockCommandService;
  beforeEach(() => {
    svc = new MockCommandService();
  });

  it('the SupplierOrders defect string translates in both languages', async () => {
    const po = purchaseOrderStore.all().find((p) => p.supplierId === 'sup-002');
    expect(po, 'no sup-002 purchase order in the fixtures').toBeDefined();

    // A `commercial` seat holds no `po:confirm` — that atom is `fulfilment`'s.
    const res = await svc.dispatch(seat(['commercial'], 'sup-002'), {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: po!.id,
      payload: { confirmedQuantities: [1] },
    });

    expect(res.status).toBe('failed');
    // THE MEASURED DEFECT STRING, asserted rather than described.
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:po:confirm');

    const en = describeRefusal(res.reason, 'en');
    expect(en).toBe(`${COMMAND_REFUSAL_GLOSSARY.ROLE_NOT_PERMITTED.en} (po:confirm)`);
    expect(en).not.toContain('ROLE_NOT_PERMITTED:');

    const id = describeRefusal(res.reason, 'id');
    expect(id).toBe(`${COMMAND_REFUSAL_GLOSSARY.ROLE_NOT_PERMITTED.id} (po:confirm)`);
    expect(id).not.toContain('ROLE_NOT_PERMITTED:');
  });

  it('an unknown transition and an illegal one translate too', async () => {
    const buyer = seat(PERSONA_SYSTEM_ROLES.buyer);
    const unknown = await svc.dispatch(buyer, {
      transitionId: 't_not_a_real_verb',
      entity: 'purchaseOrder',
      entityId: 'x',
    });
    expect(unknown.reason).toBe('UNKNOWN_TRANSITION');
    expect(describeRefusal(unknown.reason, 'en')).toBe(COMMAND_REFUSAL_GLOSSARY.UNKNOWN_TRANSITION.en);

    const confirmed = purchaseOrderStore.all().find((p) => p.status === 'Confirmed');
    expect(confirmed, 'no Confirmed purchase order in the fixtures').toBeDefined();
    const illegal = await svc.dispatch(seat(['fulfilment'], confirmed!.supplierId), {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: confirmed!.id,
      payload: { confirmedQuantities: [1] },
    });
    expect(illegal.reason).toMatch(/^ILLEGAL_TRANSITION:/);
    const text = describeRefusal(illegal.reason, 'en');
    expect(text).toContain(COMMAND_REFUSAL_GLOSSARY.ILLEGAL_TRANSITION.en);
    expect(text).toContain('(Confirmed->Confirmed)');
  });
});
