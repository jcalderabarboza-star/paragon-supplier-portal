// ────────────────────────────────────────────────────────────────────────────
// WAVE E — `t_supplierdoc_request`, AND THE TWO RULINGS IT COST.
//
// The verb itself is the small part: a `creation` with `from: []`, so there is
// no from-state question and no legality edge to test. What this file holds is
// the two things Phase 1 measured as blocking, both of which touch code that
// SHIPPED BEFORE THIS BATCH:
//
//   · **RULING 1 — the creation gate.** `creationOwner` ECHOED the payload and
//     `requireCreationOwner` was unset, so a BUYER creation walked
//     `dispatcher.ts`'s buyer branch with nothing between a payload string and a
//     minted row. It is now resolved against the platform roster. **The half
//     that needs proving is the INERTNESS for `t_supplierdoc_declare`** — the
//     only shipped behaviour this touches — and it is proved in BOTH
//     directions rather than asserted: a supplier declaring for itself still
//     succeeds, and a supplier declaring for somebody else is still refused.
//
//   · **RULING 2 — `create` branches on `toState`.** Two creation verbs land in
//     one `create`, and only one of them carries a declaration.
//
// ⚠️ **THE FIRST DESCRIBE IS POPULATION CONTROLS, AND IT IS NOT CEREMONY.**
// Every assertion here is about a roster, a seed, or a store. If the roster were
// empty, `mockSuppliers.some(...)` would return false for EVERY id and the
// refusal tests would pass while the success tests failed for the wrong reason;
// if the seed were empty the loop test would walk nothing. Both shapes are
// `EMPTY-INPUT-REPORTS-CLEAN-01`, which this project has filed twice.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, WIRED_COMMAND_TARGETS } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { mockSuppliers } from '../../../data/mockSuppliers';
import { getTransition } from '../../transitions';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** The buyer's compliance seat — the lane that holds `supplierdoc:request`. */
const complianceSeat: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/** A buyer seat with every OTHER lane — the withheld side of the same act. */
const procurementSeat: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement', 'receiving', 'finance', 'planning', 'requisitioner'],
  actor: NO_PERSON,
};

const supplierSeat = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['back_office'],
  actor: NO_PERSON,
});

const DECLARATION = {
  certType: 'HALAL_BPJPH',
  certNumber: 'ID-BPJPH-WAVE-E-0001',
  issuer: 'BPJPH',
  issuedOn: '2026-02-01',
  expiresOn: null,
  scopeText: 'Every PET bottle grade produced at the Tangerang plant',
};

const request = (scope: QueryScope, payload: Record<string, unknown>) =>
  svc.dispatch(scope, {
    transitionId: 't_supplierdoc_request',
    entity: 'supplierDocument',
    payload,
  });

beforeEach(() => {
  supplierDocumentStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('WAVE E · population controls — the inputs every assertion below rests on', () => {
  it('CONTROL — the roster is non-empty and names the ids these tests use', () => {
    // Without this, `mockSuppliers.some(...)` is false for everything and the
    // refusal tests below pass over an instrument that examined nothing.
    expect(mockSuppliers.length).toBeGreaterThan(0);
    const ids = mockSuppliers.map((s) => s.id);
    expect(ids).toContain('sup-007');
    expect(ids).toContain('sup-002');
    expect(ids).toContain('sup-005');
    // …and the known-FALSE, by the same instrument in the same run. The refusal
    // this file asserts is only meaningful while this id is genuinely absent.
    expect(ids).not.toContain('sup-999');
  });

  it('CONTROL — the target is wired and the verb is a creation with no from-state', () => {
    expect(WIRED_COMMAND_TARGETS).toContain('supplierDocument');
    expect(WIRED_COMMAND_TARGETS).not.toContain('contract');
    const t = getTransition('t_supplierdoc_request')!;
    expect(t.trigger).toBe('creation');
    expect(t.from).toEqual([]);
    expect(t.to).toBe('Awaiting Upload');
    expect(t.requiredRole).toBe('supplierdoc:request');
    expect(t.requiredFields).toEqual(['supplierId', 'category']);
  });

  it('CONTROL — the seed holds rows, so a store-delta assertion is a delta', () => {
    expect(supplierDocumentStore.all().length).toBeGreaterThan(0);
    expect(supplierDocumentStore.all().find((d) => d.id === 'doc-006')?.status).toBe(
      'Awaiting Upload',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RULING 1 · the creation gate — a payload echo is not a resolution', () => {
  it('a compliance seat may open a request against a supplier ON the roster', async () => {
    const before = supplierDocumentStore.all().length;
    const res = await request(complianceSeat, {
      supplierId: 'sup-002',
      category: 'Quality',
      note: 'ISO 9001 certificate for the stearin line.',
    });

    expect(res.status).toBe('done');
    expect(res.entityId).toBeTruthy();
    expect(supplierDocumentStore.all().length).toBe(before + 1);
    expect(supplierDocumentStore.get(res.entityId!)?.supplierId).toBe('sup-002');
  });

  it('⚠️ M3 — a supplier NOT on the roster is REFUSED, and nothing is minted', async () => {
    // THE AXIS M1 AND M2 CANNOT REACH. An availability mutation moves the
    // BUTTON; this is the dispatcher refusing a payload the button cannot even
    // construct. With `creationOwner` back to echoing the payload, this row is
    // minted instead of refused and the store grows by one.
    const before = supplierDocumentStore.all().length;

    await expect(
      request(complianceSeat, {
        supplierId: 'sup-999',
        category: 'Quality',
        note: 'A tenant that does not exist.',
      }),
    ).rejects.toThrow(/SCOPE_DENIED|denied/i);

    // The refusal is only worth anything if it happened BEFORE the write.
    expect(supplierDocumentStore.all().length).toBe(before);
    expect(
      supplierDocumentStore.all().some((d) => d.supplierId === 'sup-999'),
    ).toBe(false);
  });

  it('⚠️ M3 — and a free string is refused for the same reason, not a different one', async () => {
    const before = supplierDocumentStore.all().length;
    await expect(
      request(complianceSeat, {
        supplierId: 'not-a-supplier-at-all',
        category: 'Contract',
        note: 'Arbitrary text in the id slot.',
      }),
    ).rejects.toThrow(/SCOPE_DENIED|denied/i);
    expect(supplierDocumentStore.all().length).toBe(before);
  });

  it('the ATOM is still what decides — a buyer holding every other lane is refused by ROLE', async () => {
    // The refusal above is scope; this one is authority. They are different
    // mechanisms and a single test could not tell them apart.
    const res = await request(procurementSeat, {
      supplierId: 'sup-007',
      category: 'Halal Compliance',
      note: 'A seat that does not hold the compliance lane.',
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(res.reason).toMatch(/supplierdoc:request/);
  });

  it('⚠️ an empty supplierId is now refused by the OWNER GATE, not by requiredFields', async () => {
    // **MEASURED, NOT PREDICTED — AND IT WENT THE OTHER WAY.** This test was
    // written expecting `MISSING_FIELDS`, on the reasoning that '' is an absent
    // field. It is not: `dispatcher.ts` runs the creation-scope check at step 2
    // and `requiredFields` at step 5, so once `requireCreationOwner` is set the
    // owner gate answers first and '' resolves to no tenant.
    //
    // Recorded rather than adjusted-around, because it is a REFUSAL-CLASS change
    // on a buyer creation: same outcome (nothing is minted), different name and
    // a `throw` instead of a returned `CommandResult`. The surface handles both
    // (`runRequest` catches), and every supplier path is untouched — a supplier
    // scope with '' already threw `SCOPE_DENIED` from the owner-match branch.
    await expect(
      request(complianceSeat, { supplierId: '', category: 'Quality' }),
    ).rejects.toThrow(/SCOPE_DENIED|denied/i);
  });

  it('…and a resolvable supplier still reaches requiredFields, so step 5 is not dead', async () => {
    // The paired control. Without it, the test above is compatible with an owner
    // gate that refuses EVERYTHING, and `MISSING_FIELDS` would never be observed
    // again on this verb — a guard that is wrong about what it should ACCEPT
    // (rule 4), passing because only its refusals were probed.
    const res = await request(complianceSeat, { supplierId: 'sup-007' });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS/);
    expect(res.reason).toMatch(/category/);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('RULING 1 · INERTNESS for `t_supplierdoc_declare` — PROVED, not asserted', () => {
  // ⚠️ **THIS IS THE ONLY SHIPPED BEHAVIOUR RULING 1 TOUCHES**, so it is walked
  // for every tenancy the fixtures carry rather than for one. A resolution that
  // narrowed a supplier declaring for itself would be a regression on the §82
  // path, and one seat passing would not prove three do.
  for (const sid of ['sup-002', 'sup-005', 'sup-007']) {
    it(`a supplier declaring for ITSELF is unaffected — ${sid}`, async () => {
      const before = supplierDocumentStore.all().length;
      const res = await svc.dispatch(supplierSeat(sid), {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { supplierId: sid, ...DECLARATION },
      });

      expect(res.status).toBe('done');
      expect(supplierDocumentStore.all().length).toBe(before + 1);
      const minted = supplierDocumentStore.get(res.entityId!)!;
      expect(minted.supplierId).toBe(sid);
      expect(minted.status).toBe('Under Review');
      expect(minted.declaration?.certNumber).toBe(DECLARATION.certNumber);
    });
  }

  it('a supplier declaring for SOMEBODY ELSE is still refused', async () => {
    // The other direction of the same guard. This refusal predates Wave E (the
    // dispatcher's supplier branch does it), and it must survive the change —
    // if the roster resolution had replaced the equality check rather than
    // preceding it, this is the test that would go red.
    await expect(
      svc.dispatch(supplierSeat('sup-007'), {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { supplierId: 'sup-002', ...DECLARATION },
      }),
    ).rejects.toThrow(/SCOPE_DENIED|denied/i);
  });

  it('a SUPPLIER cannot fire the request verb for itself either — it is a buyer act', async () => {
    const res = await request(supplierSeat('sup-007'), {
      supplierId: 'sup-007',
      category: 'Quality',
      note: 'A supplier asking itself.',
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RULING 2 · `create` branches on `toState`', () => {
  it('⚠️ M4 — a requested row carries NO declaration', async () => {
    // The load-bearing one. `BuyerCompliance`'s review queue and §80's
    // `RefusalBlock` both branch on `doc.declaration` being PRESENT; a hollow
    // one here would send a requested row down the has-a-declaration path and
    // `compliance.queue.noDeclaration` — written for exactly this case — could
    // never fire. The surface half of this assertion is in
    // `BuyerComplianceRequest.test.tsx`.
    const res = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Tax & Legal',
      note: 'NPWP certificate for the vendor master.',
    });
    const row = supplierDocumentStore.get(res.entityId!)!;

    expect(row.declaration).toBeUndefined();
    expect(row.status).toBe('Awaiting Upload');
  });

  it('⚠️ M4 — the buyer’s CATEGORY survives, rather than being overwritten', async () => {
    // The unconditional `declarationFrom` wrote
    // `CERT_TYPE_TO_CATEGORY[undefined]` over this field, so the one thing the
    // buyer states was the one thing the store lost.
    const res = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Contract',
      note: 'Countersigned framework agreement.',
    });
    const row = supplierDocumentStore.get(res.entityId!)!;

    expect(row.category).toBe('Contract');
    expect(row.category).not.toBeUndefined();
  });

  it('⚠️ **`Tax & Legal` AND `Contract` HAVE NO OTHER PRODUCER** — this verb is it', async () => {
    // Derived, not recalled: the declare path maps `CertType` → category, and
    // that map reaches four of the union's six members. Requesting is the only
    // way the other two can be minted at all, which is why `category` is on
    // this verb and not inferred from a cert type it does not have.
    const declarable = new Set<string>();
    for (const certType of [
      'HALAL_BPJPH',
      'HALAL_MUI_LEGACY',
      'HALAL_FOREIGN',
      'BPOM',
      'ISO',
      'OTHER',
    ] as const) {
      const res = await svc.dispatch(supplierSeat('sup-007'), {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { supplierId: 'sup-007', ...DECLARATION, certType },
      });
      declarable.add(supplierDocumentStore.get(res.entityId!)!.category);
    }
    expect(declarable.has('Tax & Legal')).toBe(false);
    expect(declarable.has('Contract')).toBe(false);
    // The control on the same instrument: the map is not simply broken.
    expect(declarable.has('Halal Compliance')).toBe(true);
    expect(declarable.size).toBe(4);
  });

  it('the note becomes the row’s `notes`, verbatim and trimmed', async () => {
    const res = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Quality',
      note: '  COA for batch PKG-2026-118, before the next receipt.  ',
    });
    expect(supplierDocumentStore.get(res.entityId!)?.notes).toBe(
      'COA for batch PKG-2026-118, before the next receipt.',
    );
  });

  it('an absent note leaves `notes` ABSENT rather than blank', async () => {
    // The surface renders `notes` conditionally; '' would draw an empty warning
    // line, which is a different claim from "nothing was said".
    const res = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Quality',
    });
    expect(supplierDocumentStore.get(res.entityId!)?.notes).toBeUndefined();
  });

  it('nothing has been NAMED yet, and the row says so', async () => {
    const res = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Halal Compliance',
      note: 'BPJPH certificate covering the PET line.',
    });
    const row = supplierDocumentStore.get(res.entityId!)!;
    // Not '' — that reads as a value that was lost. The em dash is this
    // fixture set's own convention for a field with nothing to state.
    expect(row.name).toBe('—');
    expect(row.issuedBy).toBe('—');
    expect(row.expiryDate).toBeNull();
  });

  it('the DECLARE branch is untouched — it still carries its declaration', async () => {
    // The paired control: Ruling 2 could have been "satisfied" by breaking the
    // other branch, and every assertion above would still pass.
    const res = await svc.dispatch(supplierSeat('sup-007'), {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: { supplierId: 'sup-007', ...DECLARATION },
    });
    const row = supplierDocumentStore.get(res.entityId!)!;
    expect(row.declaration).toBeDefined();
    expect(row.declaration!.certNumber).toBe(DECLARATION.certNumber);
    expect(row.name).toBe(DECLARATION.certNumber);
    expect(row.category).toBe('Halal Compliance');
    expect(row.linkedTo).toBe(DECLARATION.scopeText);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE LOOP CLOSES — buyer asks · supplier answers · buyer reviews', () => {
  it('a requested row reaches `Under Review` through `_submit`, and gains its name', async () => {
    const asked = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Halal Compliance',
      note: 'BPJPH certificate covering PK-PETB-8810.',
    });
    const docId = asked.entityId!;
    expect(supplierDocumentStore.get(docId)!.status).toBe('Awaiting Upload');

    const answered = await svc.dispatch(supplierSeat('sup-007'), {
      transitionId: 't_supplierdoc_submit',
      entity: 'supplierDocument',
      entityId: docId,
      payload: DECLARATION,
    });
    expect(answered.status).toBe('done');

    const row = supplierDocumentStore.get(docId)!;
    expect(row.status).toBe('Under Review');
    expect(row.declaration?.certNumber).toBe(DECLARATION.certNumber);
    // ⚠️ `name` joined `applyTransition`'s denormalised list in Wave E. Without
    // it a requested row would still be called '—' after the supplier had named
    // it — the row disagreeing with its own declaration, which is the exact
    // thing those lines exist to prevent.
    expect(row.name).toBe(DECLARATION.certNumber);

    const verified = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_verify',
      entity: 'supplierDocument',
      entityId: docId,
      payload: {},
    });
    expect(verified.status).toBe('done');
    expect(supplierDocumentStore.get(docId)!.status).toBe('Valid');
  });

  it('the SUPPLIER named in the request can see the row; a second supplier cannot', async () => {
    const asked = await request(complianceSeat, {
      supplierId: 'sup-002',
      category: 'Quality',
      note: 'ISO certificate for the stearin line.',
    });
    const docId = asked.entityId!;

    const mine = await reads.getDocuments(supplierSeat('sup-002'));
    expect(mine.items.some((d) => d.id === docId)).toBe(true);

    // The tenancy boundary, from the other side. A buyer writing INTO a
    // supplier's queue is the one direction the platform allows; it must not
    // become a way to put a row where a third party can read it.
    const theirs = await reads.getDocuments(supplierSeat('sup-007'));
    expect(theirs.items.some((d) => d.id === docId)).toBe(false);
    expect(theirs.items.length).toBeGreaterThan(0); // …and not by returning nothing.

    // The compliance seat sees every tenant's rows — the cross-supplier
    // superset that makes one review queue possible.
    const buyerView = await reads.getDocuments(complianceSeat);
    expect(buyerView.items.some((d) => d.id === docId)).toBe(true);
  });

  it('a requested row is DISTINGUISHABLE from one the supplier volunteered', async () => {
    // A buyer asking and a supplier volunteering are different facts, and the
    // machine keeps them apart by STATE: `_request` lands in `Awaiting Upload`,
    // `_declare` lands directly in `Under Review`. A volunteered document never
    // occupies the requested state.
    const asked = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Quality',
      note: 'COA for the next batch.',
    });
    const volunteered = await svc.dispatch(supplierSeat('sup-007'), {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: { supplierId: 'sup-007', ...DECLARATION },
    });

    expect(supplierDocumentStore.get(asked.entityId!)!.status).toBe('Awaiting Upload');
    expect(supplierDocumentStore.get(volunteered.entityId!)!.status).toBe('Under Review');
  });

  it('a minted row cannot land in the undeclared `Expiring Soon` shape', async () => {
    // ⚠️ Two SEEDED rows carry a status outside the machine (`doc-001`,
    // `doc-202`) and would refuse every transition on an illegal from-state.
    // They are filed, not fixed. What this asserts is that Wave E does not add
    // to them: a creation takes `transition.to`, which is a declared state.
    const res = await request(complianceSeat, {
      supplierId: 'sup-007',
      category: 'Halal Compliance',
      note: 'Renewal ahead of the mandate date.',
    });
    const declared = ['Awaiting Upload', 'Under Review', 'Valid', 'Rejected'];
    expect(declared).toContain(supplierDocumentStore.get(res.entityId!)!.status);

    // The control that keeps this from passing over an empty premise: the two
    // out-of-machine rows really are there.
    const strays = supplierDocumentStore
      .all()
      .filter((d) => !declared.includes(d.status))
      .map((d) => d.id);
    expect(strays).toContain('doc-001');
    expect(strays).toContain('doc-202');
  });
});
