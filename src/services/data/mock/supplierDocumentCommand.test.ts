// ────────────────────────────────────────────────────────────────────────────
// §82 — THE DOCUMENT LANE'S FIRST WRITE PATH, AS A CONTRACT.
//
// The surface half lives in `pages-v2/supplierDocDeclaration.test.tsx` (a
// supplier declares, compliance reviews, in both locales). This file asserts
// what a rendered walk cannot: that the STORE actually moved, that the
// dispatcher refuses what it must, and — the load-bearing one — that the two
// session-minted fields cannot be supplied by the caller.
//
// ⚠️ **WHY THE FIRST TWO TESTS ARE POPULATION CONTROLS.** Every assertion below
// is about a document that must exist to be acted on. If the seed were empty, or
// if the target were unregistered, most of these would pass by never reaching
// their subject — `EMPTY-INPUT-REPORTS-CLEAN-01`, which this project has now
// filed twice. The controls run first and name their members.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, WIRED_COMMAND_TARGETS } from './MockCommandService';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

/** The supplier's back-office seat — the lane the operator ruled owns the act. */
const backOffice: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['back_office'],
  actor: NO_PERSON,
};

/** The buyer's compliance seat — the lane that holds verify and reject. */
const complianceSeat: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/** A supplier lane that does NOT hold the supply verbs. */
const commercial: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['commercial'],
  actor: NO_PERSON,
};

const DECLARATION = {
  certType: 'HALAL_BPJPH',
  certNumber: 'ID-BPJPH-TEST-0001',
  issuer: 'BPJPH',
  issuedOn: '2026-02-01',
  expiresOn: null,
  scopeText: 'All PET bottle grades produced at the Tangerang plant',
};

beforeEach(() => {
  supplierDocumentStore.reset();
});

describe('§82 · supplierDocument — population controls', () => {
  it('CONTROL — the target is wired, and a known-absent one is still absent', () => {
    expect(WIRED_COMMAND_TARGETS).toContain('supplierDocument');
    // The negative half: without it, a `toContain` over an all-inclusive list
    // would pass on nothing (§39 — probe the guard both ways).
    expect(WIRED_COMMAND_TARGETS).not.toContain('contract');
  });

  it('CONTROL — the seed holds the documents these tests act on', () => {
    const rows = supplierDocumentStore.all();
    expect(rows.length).toBeGreaterThan(0);
    // doc-006 is `Awaiting Upload` (a slot the buyer opened); doc-012 is the one
    // §80 seeded as `Rejected`. Both are named, so an assertion below cannot
    // silently be about nothing.
    expect(rows.find((d) => d.id === 'doc-006')?.status).toBe('Awaiting Upload');
    expect(rows.find((d) => d.id === 'doc-012')?.status).toBe('Rejected');
    expect(rows.find((d) => d.id === 'doc-nonexistent')).toBeUndefined();
  });

  it('CONTROL — the atom sits in the lane the operator ruled owns it', () => {
    expect(SYSTEM_ROLES.back_office).toContain('supplierdoc:upload');
    expect(SYSTEM_ROLES.compliance).toContain('supplierdoc:verify');
    expect(SYSTEM_ROLES.compliance).toContain('supplierdoc:reject');
    // And the two sides are genuinely disjoint on these verbs — the reason the
    // handoff notice on each surface is not dead branch.
    expect(SYSTEM_ROLES.back_office).not.toContain('supplierdoc:verify');
    expect(SYSTEM_ROLES.compliance).not.toContain('supplierdoc:upload');
  });
});

describe('§82 · the supplier declares', () => {
  it('mints a document in Under Review, carrying every stated field', async () => {
    const before = supplierDocumentStore.all().length;
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: { ...DECLARATION, supplierId: 'sup-007' },
    });
    expect(res.status).not.toBe('failed');
    expect(supplierDocumentStore.all().length).toBe(before + 1);

    const doc = supplierDocumentStore.get(res.entityId!)!;
    expect(doc.status).toBe('Under Review');
    expect(doc.supplierId).toBe('sup-007');
    expect(doc.declaration?.certType).toBe('HALAL_BPJPH');
    expect(doc.declaration?.certNumber).toBe('ID-BPJPH-TEST-0001');
    expect(doc.declaration?.issuer).toBe('BPJPH');
    expect(doc.declaration?.scopeText).toBe(DECLARATION.scopeText);
    // A permanent-validity cert has no expiry: `null` is the answer, and it must
    // never have been turned into a date.
    expect(doc.declaration?.expiresOn).toBeNull();
    expect(doc.expiryDate).toBeNull();
  });

  it('⚠️ RECORDS NO FILE, AND THE ROW SAYS SO RATHER THAN LEAVING IT BLANK', () => {
    // The whole ruling in one assertion. `fileType`/`fileSize` are display
    // strings and this row has nothing to display, so it carries the fixture's
    // own "no file" token instead of an empty string that would read as missing
    // data rather than as an absent thing.
    return svc
      .dispatch(backOffice, {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { ...DECLARATION, supplierId: 'sup-007' },
      })
      .then((res) => {
        const doc = supplierDocumentStore.get(res.entityId!)!;
        expect(doc.fileType).toBe('—');
        expect(doc.fileSize).toBe('—');
        // And there is no file-bearing field anywhere on the record.
        expect(Object.keys(doc)).not.toContain('fileName');
        expect(Object.keys(doc)).not.toContain('fileUrl');
      });
  });

  it('⚠️ NEVER WRITES materialCodes — the join key stays compliance’s to assign', async () => {
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: {
        ...DECLARATION,
        supplierId: 'sup-007',
        // A caller trying to supply them anyway. The gate joins on
        // `ComplianceRegistryEntry.materialCodes`, and a supplier does not hold
        // Paragon's SAP vocabulary — measured: sup-007's registry codes and its
        // document codes have an EMPTY intersection. A guessed code would join
        // silently and wrongly; a sentence cannot.
        materialCodes: ['PK-PETB-8810'],
      },
    });
    expect(res.status).not.toBe('failed');
    const doc = supplierDocumentStore.get(res.entityId!)!;
    expect(Object.keys(doc)).not.toContain('materialCodes');
    expect(Object.keys(doc.declaration!)).not.toContain('materialCodes');
    // The supplier's words survive instead, in the field built for them.
    expect(doc.declaration!.scopeText).toBe(DECLARATION.scopeText);
  });

  it('⚠️ declaredAt AND declaredBy ARE MINTED, NOT ACCEPTED (C10 §6.2)', async () => {
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: {
        ...DECLARATION,
        supplierId: 'sup-007',
        // A caller backdating its own declaration against an expiry deadline,
        // and naming whoever it likes as the declarer. Both must be ignored.
        declaredAt: '1999-01-01T00:00:00.000Z',
        declaredBy: { kind: 'RESOLVED', person: { personId: 'p1', displayName: 'Forged' } },
      },
    });
    const doc = supplierDocumentStore.get(res.entityId!)!;
    expect(doc.declaration!.declaredAt).not.toBe('1999-01-01T00:00:00.000Z');
    expect(doc.declaration!.declaredBy).toEqual(NO_PERSON);
    expect(doc.declaration!.declaredBy.kind).toBe('UNATTRIBUTED');
  });

  it('refuses a declaration missing a required field', async () => {
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: { ...DECLARATION, supplierId: 'sup-007', certNumber: '' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS/);
  });

  it('refuses a supplier declaring for a DIFFERENT supplier (creation scope)', async () => {
    // NOTE THE SHAPE: scope denial THROWS a DataError rather than returning a
    // `failed` CommandResult. That is deliberate one layer down - a tenancy
    // breach is not a business refusal to be rendered, and a caller must not be
    // able to treat it as one by reading `.status`.
    await expect(
      svc.dispatch(backOffice, {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { ...DECLARATION, supplierId: 'sup-002' },
      }),
    ).rejects.toThrow(/denied for scope/);
  });

  it('refuses a supplier lane that does not hold the atom', async () => {
    const res = await svc.dispatch(commercial, {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: { ...DECLARATION, supplierId: 'sup-007' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('§82 · compliance reviews', () => {
  async function declared(): Promise<string> {
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_declare',
      entity: 'supplierDocument',
      payload: { ...DECLARATION, supplierId: 'sup-007' },
    });
    expect(res.status).not.toBe('failed');
    return res.entityId!;
  }

  it('verify moves it to Valid', async () => {
    const id = await declared();
    const res = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_verify',
      entity: 'supplierDocument',
      entityId: id,
    });
    expect(res.status).not.toBe('failed');
    expect(supplierDocumentStore.get(id)!.status).toBe('Valid');
  });

  it('⚠️ reject lands on Rejected — the state §80’s surface actually renders', async () => {
    const id = await declared();
    const res = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_reject',
      entity: 'supplierDocument',
      entityId: id,
      payload: { rejectionReason: 'Scope does not cover the materials we buy.' },
    });
    expect(res.status).not.toBe('failed');
    const doc = supplierDocumentStore.get(id)!;
    // Before §82 this verb pointed at `Awaiting Upload`, so a refusal would have
    // silently erased the reason, the timestamp and the banner §80 built.
    expect(doc.status).toBe('Rejected');
    expect(doc.rejectionReason).toBe('Scope does not cover the materials we buy.');
    expect(doc.rejectedAt).toBeTruthy();
    expect(doc.rejectedBy).toEqual(NO_PERSON);
  });

  // WARN TWO REFUSALS, TWO MECHANISMS, AND THE SECOND ONE IS THE POINT.
  // `requiredFields` catches an ABSENT reason. It does NOT catch a blank one -
  // the dispatcher's emptiness check admits a string of spaces, so a required
  // field can be satisfied by the space bar. That gap was found by this test
  // going green when it should have been red, and it is closed by a policy hook
  // on the PR_REJECT_REASON_AUTHORED precedent. Both directions are asserted,
  // because a single-mechanism assertion would pass if either were removed.
  it('refuses a refusal with no reason at all (MISSING_FIELDS)', async () => {
    const id = await declared();
    const res = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_reject',
      entity: 'supplierDocument',
      entityId: id,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS/);
    expect(supplierDocumentStore.get(id)!.status).toBe('Under Review');
  });

  it('refuses a BLANK reason too - the space bar is not an accusation', async () => {
    const id = await declared();
    const res = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_reject',
      entity: 'supplierDocument',
      entityId: id,
      payload: { rejectionReason: '   ' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:supplierdoc_refusal_authored/);
    expect(supplierDocumentStore.get(id)!.status).toBe('Under Review');
    // And the document carries no half-written refusal.
    expect(supplierDocumentStore.get(id)!.rejectionReason).toBeUndefined();
    expect(supplierDocumentStore.get(id)!.rejectedAt).toBeUndefined();
  });

  it('CONTROL - a real reason IS accepted (the guard is not simply refusing)', async () => {
    const id = await declared();
    const res = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_reject',
      entity: 'supplierDocument',
      entityId: id,
      payload: { rejectionReason: 'Scope excludes the grades we buy.' },
    });
    expect(res.status).not.toBe('failed');
  });

  it('refuses the back-office seat trying to verify its own declaration', async () => {
    // The segregation the two lanes exist to express: whoever states a
    // certificate must not be the one who confirms it.
    const id = await declared();
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_verify',
      entity: 'supplierDocument',
      entityId: id,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(supplierDocumentStore.get(id)!.status).toBe('Under Review');
  });
});

describe('§82 · a refused document is not a dead end', () => {
  it('re-declaring from Rejected returns it to review, with the corrected details', async () => {
    // doc-012 is §80's seeded refusal — the row that page exists for.
    expect(supplierDocumentStore.get('doc-012')!.status).toBe('Rejected');
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_submit',
      entity: 'supplierDocument',
      entityId: 'doc-012',
      payload: { ...DECLARATION, scopeText: 'Corrected: covers PK-PETB-8810 only' },
    });
    expect(res.status).not.toBe('failed');
    const doc = supplierDocumentStore.get('doc-012')!;
    expect(doc.status).toBe('Under Review');
    expect(doc.declaration!.scopeText).toBe('Corrected: covers PK-PETB-8810 only');
    // ⚠️ THE PRIOR REFUSAL IS NOT ERASED. It was a recorded act; a correction
    // does not un-happen it, and a reviewer looking at the second attempt should
    // be able to see there was a first.
    expect(doc.rejectionReason).toBeTruthy();
    expect(doc.rejectedAt).toBeTruthy();
  });

  it('also answers a slot the buyer opened (Awaiting Upload)', async () => {
    const res = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_submit',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: DECLARATION,
    });
    expect(res.status).not.toBe('failed');
    expect(supplierDocumentStore.get('doc-006')!.status).toBe('Under Review');
  });

  it('refuses a supply verb against a document owned by another supplier', async () => {
    const foreign = supplierDocumentStore.all().find((d) => d.supplierId !== 'sup-007');
    // Population guard: if every seeded row belonged to sup-007 this would be an
    // assertion about nothing.
    expect(foreign, 'the seed holds no foreign-tenant document to probe with').toBeDefined();
    await expect(
      svc.dispatch(backOffice, {
        transitionId: 't_supplierdoc_submit',
        entity: 'supplierDocument',
        entityId: foreign!.id,
        payload: DECLARATION,
      }),
    ).rejects.toThrow(/denied for scope/);
  });
});
