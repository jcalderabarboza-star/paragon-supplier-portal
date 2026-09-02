// ────────────────────────────────────────────────────────────────────────────
// B1 · THE supplierApplication VERBS — what happens when they fire.
//
// ⚠️ **THE FIRST DESCRIBE IS POPULATION CONTROLS, AND IT IS NOT CEREMONY.**
// This store SEEDS EMPTY, deliberately (nobody has ever applied), which makes
// it the sharpest `EMPTY-INPUT-REPORTS-CLEAN-01` case in the tree: every
// "nothing was minted" assertion below passes vacuously over a store that can
// no longer be written to at all. So the controls prove the store GROWS before
// any refusal is believed, and prove the roster is non-empty before any
// unknown-vendor refusal is believed — otherwise `find(...)` returns undefined
// for EVERY id and the refusal tests pass for the wrong reason.
//
// ⚠️ **THE #284 AXIS LIVES IN `the vendor resolution` BELOW.** It is the M3
// class: an availability probe moves a BUTTON, and this is the dispatcher
// refusing a payload no button can construct. Restore `creationOwner` to a
// payload echo and those rows mint instead of refusing.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, WIRED_COMMAND_TARGETS } from './MockCommandService';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { mockSuppliers } from '../../../data/mockSuppliers';
import { getTransition } from '../../transitions';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

/** The lane that RAISES an application. */
const procurementSeat: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

/** The lane that REVIEWS and DECIDES one — deliberately a different lane. */
const complianceSeat: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

const supplierSeat = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial', 'fulfilment', 'back_office'],
  actor: NO_PERSON,
});

/** A real roster row, derived rather than hardcoded — see the controls. */
const onRoster = mockSuppliers[0];

const submit = (scope: QueryScope, payload: Record<string, unknown>) =>
  svc.dispatch(scope, {
    transitionId: 't_application_submit',
    entity: 'supplierApplication',
    payload,
  });

const act = (scope: QueryScope, transitionId: string, entityId: string, payload = {}) =>
  svc.dispatch(scope, {
    transitionId,
    entity: 'supplierApplication',
    entityId,
    payload,
  });

const EXTERNAL = { requestType: 'External SR', companyName: 'PT Sample Applicant' };

/** Raise one and hand back its id — the only way a row can exist. */
async function raise(payload: Record<string, unknown> = EXTERNAL): Promise<string> {
  const res = await submit(procurementSeat, payload);
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
}

beforeEach(() => supplierApplicationStore.reset());

// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('CONTROL — the store seeds EMPTY, and that is a seed rather than a break', () => {
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('CONTROL — the store GROWS, so "nothing was minted" is a real assertion', async () => {
    await raise();
    expect(supplierApplicationStore.all().length).toBe(1);
  });

  it('CONTROL — the roster holds rows, and a known-BAD vendor is absent', () => {
    expect(mockSuppliers.length).toBeGreaterThan(0);
    expect(onRoster.sapBpNumber).toBeTruthy();
    const bps = mockSuppliers.map((s) => s.sapBpNumber);
    const ids = mockSuppliers.map((s) => s.id);
    expect(bps).toContain(onRoster.sapBpNumber);
    // The tokens the refusal tests use. They are only meaningful while absent.
    expect(bps).not.toContain('BP-99999999');
    expect(ids).not.toContain('sup-999');
    expect(bps).not.toContain('1000456');
  });

  it('CONTROL — the target is wired, and a known-unwired entity is not', () => {
    expect(WIRED_COMMAND_TARGETS).toContain('supplierApplication');
    expect(WIRED_COMMAND_TARGETS).not.toContain('contract');
    const t = getTransition('t_application_submit')!;
    expect(t.trigger).toBe('creation');
    expect(t.from).toEqual([]);
    expect(t.to).toBe('Submitted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the birth — a number that names a real row', () => {
  it('an external request is recorded, and the store mints the identity', async () => {
    const id = await raise();
    const row = supplierApplicationStore.get(id)!;

    expect(row.status).toBe('Submitted');
    expect(row.companyName).toBe('PT Sample Applicant');
    expect(row.requestType).toBe('External SR');
    // ⚠️ The number is ASSIGNED, not chosen. This is the honest opposite of
    // `SupplierRegistration.tsx:1289`, which mints a random one for no row.
    expect(row.id).toBe('app-0001');
    expect(row.applicationNumber).toBe('APP-2026-0001');
    expect(row.submittedAt).toBeTruthy();
    // Sequential, and the second is not the first.
    const second = await raise({ ...EXTERNAL, companyName: 'PT Second Applicant' });
    expect(supplierApplicationStore.get(second)!.applicationNumber).toBe('APP-2026-0002');
  });

  it('⚠️ AN APPLICANT IS NOT A TENANT — supplierId is null, always', async () => {
    const id = await raise();
    expect(supplierApplicationStore.get(id)!.supplierId).toBeNull();
    // And a payload cannot smuggle one in.
    const sneaky = await raise({ ...EXTERNAL, supplierId: onRoster.id });
    expect(supplierApplicationStore.get(sneaky)!.supplierId).toBeNull();
  });

  it('attribution comes from the SESSION, and it is honestly unattributed', async () => {
    const id = await raise();
    const row = supplierApplicationStore.get(id)!;
    expect(row.submittedBy).toEqual(NO_PERSON);
    expect(row.decidedBy).toBeNull();
    expect(row.decidedAt).toBeNull();
    expect(row.reviewStartedAt).toBeNull();
    expect(row.rejectionReason).toBeNull();
  });

  it('a request type off the closed list is REFUSED BY NAME, and nothing is minted', async () => {
    for (const bad of ['external sr', 'Internal', 'Z002', '']) {
      const res = await submit(procurementSeat, { ...EXTERNAL, requestType: bad });
      expect(res.status, bad).toBe('failed');
      // '' fails the emptiness floor first; the rest reach the policy.
      expect(res.reason, bad).toMatch(/POLICY_REJECTED|MISSING_FIELDS/);
    }
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('an absent required field is refused before any policy runs', async () => {
    const noType = await submit(procurementSeat, { companyName: 'PT X' });
    expect(noType.status).toBe('failed');
    expect(noType.reason).toMatch(/MISSING_FIELDS/);

    const noName = await submit(procurementSeat, { requestType: 'External SR' });
    expect(noName.status).toBe('failed');
    expect(noName.reason).toMatch(/MISSING_FIELDS/);

    expect(supplierApplicationStore.all()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE VENDOR RESOLUTION — a payload echo is not a resolution (#284)', () => {
  it('CONTROL — an extension naming a vendor ON the roster SUCCEEDS, and resolves it', async () => {
    // Rule 4: the known-GOOD input must pass before any refusal is believed.
    // Without this row, a `creationOwner` that returned null unconditionally
    // would look exactly like a working guard.
    const res = await submit(procurementSeat, {
      requestType: 'Internal SR',
      companyName: onRoster.name,
      s4Vendor: onRoster.sapBpNumber,
    });
    expect(res.status, res.reason).toBe('done');
    const row = supplierApplicationStore.get(res.entityId!)!;
    expect(row.resolvedSupplierId).toBe(onRoster.id);
    // What the caller SAID is kept beside what it resolved to.
    expect(row.s4Vendor).toBe(onRoster.sapBpNumber);
    // And the resolution did NOT become a tenancy claim.
    expect(row.supplierId).toBeNull();
  });

  it('⚠️ M3 — a vendor the roster does not name is REFUSED, and nothing is minted', async () => {
    // THE AXIS AN AVAILABILITY PROBE CANNOT REACH. Restore `creationOwner` to
    // echo `payload.s4Vendor` and this row mints instead of refusing.
    for (const unknown of ['BP-99999999', '1000456', 'sup-999', 'Sample Vendor Ltd']) {
      const res = await submit(procurementSeat, {
        requestType: 'Internal SR',
        companyName: 'PT Unknown',
        s4Vendor: unknown,
      });
      expect(res.status, unknown).toBe('failed');
      expect(res.reason, unknown).toMatch(/POLICY_REJECTED/);
    }
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('an extension with a blank or absent vendor is refused — it is required WHEN', async () => {
    for (const payload of [
      { requestType: 'Internal SR', companyName: 'PT X', s4Vendor: '   ' },
      { requestType: 'Internal SR', companyName: 'PT X', s4Vendor: '' },
      { requestType: 'Internal SR', companyName: 'PT X' },
    ]) {
      const res = await submit(procurementSeat, payload);
      expect(res.status, JSON.stringify(payload)).toBe('failed');
      expect(res.reason, JSON.stringify(payload)).toMatch(/POLICY_REJECTED/);
    }
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('⚠️ THE OTHER TWO REQUEST TYPES ARE UNTOUCHED — the flag would have killed them', () => {
    // This is the measurement behind NOT setting `requireCreationOwner`: the
    // flag refuses any buyer creation with a null owner, and these two have one
    // by definition. If they ever start refusing, that flag came back.
    return Promise.all(
      (['External SR', 'KOL'] as const).map(async (requestType) => {
        const res = await submit(procurementSeat, { requestType, companyName: 'PT X' });
        expect(res.status, requestType).toBe('done');
        const row = supplierApplicationStore.get(res.entityId!)!;
        expect(row.resolvedSupplierId, requestType).toBeNull();
        expect(row.s4Vendor, requestType).toBeNull();
      }),
    );
  });

  it('a stray vendor on a NON-extension request resolves to nobody, and is kept as stated', async () => {
    const res = await submit(procurementSeat, {
      ...EXTERNAL,
      s4Vendor: onRoster.sapBpNumber,
    });
    expect(res.status, res.reason).toBe('done');
    const row = supplierApplicationStore.get(res.entityId!)!;
    // Honest silence over a plausible value: a new supplier is not the existing
    // one whose number somebody happened to type.
    expect(row.resolvedSupplierId).toBeNull();
    expect(row.s4Vendor).toBe(onRoster.sapBpNumber);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('declarations are DATA — recorded, never verified, never silently dropped', () => {
  it('a well-formed list is stored verbatim, and carries no status field', async () => {
    const id = await raise({
      ...EXTERNAL,
      declarations: [
        { kind: 'npwp', reference: ' SAMPLE-NPWP-1 ' },
        { kind: 'halal', reference: 'SAMPLE-HALAL-1' },
      ],
    });
    const row = supplierApplicationStore.get(id)!;
    expect(row.declarations).toEqual([
      { kind: 'npwp', reference: 'SAMPLE-NPWP-1' },
      { kind: 'halal', reference: 'SAMPLE-HALAL-1' },
    ]);
    // ⚠️ EXACTLY two keys. A `status` / `verified` here would be the sixth
    // compliance vocabulary ruling (e) forbids.
    for (const d of row.declarations) {
      expect(Object.keys(d).sort()).toEqual(['kind', 'reference']);
    }
  });

  it('⚠️ A MALFORMED ENTRY REFUSES THE WHOLE COMMAND — it is never filtered out', async () => {
    // The tempting build reads the good ones and drops the rest, leaving the
    // applicant believing they declared two and the record holding one.
    const res = await submit(procurementSeat, {
      ...EXTERNAL,
      declarations: [
        { kind: 'npwp', reference: 'SAMPLE-NPWP-1' },
        { kind: 'halal', reference: '   ' },
      ],
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED/);
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('an ABSENT declarations key is legal and yields the honest empty list', async () => {
    const id = await raise();
    expect(supplierApplicationStore.get(id)!.declarations).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the walk — pick it up, then decide it', () => {
  it('submit → start review → approve, with the decision attributed and timed', async () => {
    const id = await raise();

    const picked = await act(complianceSeat, 't_application_start_review', id);
    expect(picked.status, picked.reason).toBe('done');
    expect(supplierApplicationStore.get(id)!.status).toBe('Under Review');
    expect(supplierApplicationStore.get(id)!.reviewStartedAt).toBeTruthy();

    const decided = await act(complianceSeat, 't_application_approve', id);
    expect(decided.status, decided.reason).toBe('done');
    const row = supplierApplicationStore.get(id)!;
    expect(row.status).toBe('Approved');
    expect(row.decidedBy).toEqual(NO_PERSON);
    expect(row.decidedAt).toBeTruthy();
    expect(row.rejectionReason).toBeNull();
  });

  it('submit → start review → reject, and the reason is PERSISTED', async () => {
    const id = await raise();
    await act(complianceSeat, 't_application_start_review', id);

    const res = await act(complianceSeat, 't_application_reject', id, {
      rejectionReason: 'No NIB on file and the tax id does not match the legal name.',
    });
    expect(res.status, res.reason).toBe('done');
    const row = supplierApplicationStore.get(id)!;
    expect(row.status).toBe('Rejected');
    // A required field whose value evaporates is a validation message, not a
    // record — and this text is the only account the applicant will ever get.
    expect(row.rejectionReason).toBe(
      'No NIB on file and the tax id does not match the legal name.',
    );
    expect(row.decidedBy).toEqual(NO_PERSON);
  });

  it('a refusal with no reason, and one with only spaces, are BOTH refused', async () => {
    const id = await raise();
    await act(complianceSeat, 't_application_start_review', id);

    const absent = await act(complianceSeat, 't_application_reject', id);
    expect(absent.status).toBe('failed');
    expect(absent.reason).toMatch(/MISSING_FIELDS/);

    // `isEmpty('   ')` is false, so `requiredFields` alone admits the space bar.
    const blank = await act(complianceSeat, 't_application_reject', id, {
      rejectionReason: '   ',
    });
    expect(blank.status).toBe('failed');
    expect(blank.reason).toMatch(/POLICY_REJECTED/);

    expect(supplierApplicationStore.get(id)!.status).toBe('Under Review');
  });

  it('nobody decides an application nobody has picked up', async () => {
    const id = await raise();
    for (const verb of ['t_application_approve', 't_application_reject']) {
      const res = await act(complianceSeat, verb, id, { rejectionReason: 'x' });
      expect(res.status, verb).toBe('failed');
      expect(res.reason, verb).toMatch(/ILLEGAL_TRANSITION/);
    }
    expect(supplierApplicationStore.get(id)!.status).toBe('Submitted');
  });

  it('⚠️ A DECIDED APPLICATION IS DECIDED — no verb leaves either ending', async () => {
    const id = await raise();
    await act(complianceSeat, 't_application_start_review', id);
    await act(complianceSeat, 't_application_approve', id);

    for (const verb of [
      't_application_start_review',
      't_application_approve',
      't_application_reject',
    ]) {
      const res = await act(complianceSeat, verb, id, { rejectionReason: 'x' });
      expect(res.status, verb).toBe('failed');
      expect(res.reason, verb).toMatch(/ILLEGAL_TRANSITION/);
    }
    expect(supplierApplicationStore.get(id)!.status).toBe('Approved');
  });

  it('a second pick-up is refused — the queue answer cannot be overwritten', async () => {
    const id = await raise();
    await act(complianceSeat, 't_application_start_review', id);
    const again = await act(complianceSeat, 't_application_start_review', id);
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/ILLEGAL_TRANSITION/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ AUTHORISATION — raising and deciding are different seats', () => {
  it('the raising lane cannot review or decide', async () => {
    const id = await raise();
    for (const verb of [
      't_application_start_review',
      't_application_approve',
      't_application_reject',
    ]) {
      const res = await act(procurementSeat, verb, id, { rejectionReason: 'x' });
      expect(res.status, verb).toBe('failed');
      expect(res.reason, verb).toMatch(/ROLE_NOT_PERMITTED/);
    }
  });

  it('the deciding lane cannot raise one', async () => {
    const res = await submit(complianceSeat, EXTERNAL);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('⚠️ A SUPPLIER SEAT CANNOT RAISE ONE — refused at scope, nothing minted', async () => {
    // An applicant has no tenancy, so `creationOwner` names no owner and the
    // dispatcher's supplier branch refuses before any write.
    await expect(submit(supplierSeat(onRoster.id), EXTERNAL)).rejects.toThrow(
      /SCOPE_DENIED|denied/i,
    );
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  it('⚠️ AND WHEN A SUPPLIER NAMES ITSELF, THE ATOM IS WHAT REFUSES IT', async () => {
    // The one path that clears creation-scope: the dispatcher's supplier branch
    // admits an owner equal to the caller's own id. The role gate is what stops
    // it, because no supplier lane holds `application:submit` — which is why the
    // ruling is expressed as an ATOM and not as a comment.
    const res = await submit(supplierSeat(onRoster.id), {
      requestType: 'Internal SR',
      companyName: onRoster.name,
      s4Vendor: onRoster.sapBpNumber,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(supplierApplicationStore.all()).toEqual([]);
  });

  // ⚠️ **THE LEAK THIS PAIR WAS FILED TO PIN IS CLOSED, AND THE PAIR NOW PINS
  // THE CLOSURE.** It used to read: *a supplier clears the scope gate on a row
  // that EXISTS and is stopped by the role gate instead* — because
  // `readScopeOwner` returns `null` on an owner-less collection and the
  // dispatcher refused only when `owner !== null && owner !== scope.supplierId`.
  // So the refusal KIND answered a question the caller may not ask: `SCOPE_DENIED`
  // for an id that does not exist, `ROLE_NOT_PERMITTED` for one that does.
  //
  // The filing was right about the mechanism AND about the scope of it —
  // *"it belongs to every owner-less target"*. Derived at the fix: FIVE targets,
  // not the two that were named (`rfq` · `purchaseRequisition` · `enforcement` ·
  // `role` · `supplierApplication`). The dispatcher's supplier branch now
  // compares `owner !== scope.supplierId` unconditionally, so a null owner means
  // *not yours* rather than *nothing to compare*.
  //
  // ⚠️ **THE TWO SPECS BELOW ARE DELIBERATELY NOT MERGED INTO ONE.** They probe
  // the two inputs a leak would distinguish, and a single spec asserting one of
  // them would pass just as happily with the leak restored. `ownerlessScope.test.ts`
  // asserts the equality across the whole DERIVED population; these two are the
  // local, readable form of it on the collection where the population grew.
  it('a supplier seat is refused on an application that EXISTS — at scope', async () => {
    const id = await raise();
    await expect(
      act(supplierSeat(onRoster.id), 't_application_start_review', id),
    ).rejects.toThrow(/denied for scope/);
    expect(supplierApplicationStore.get(id)!.status).toBe('Submitted');
  });

  it('a supplier seat is refused on an application that does NOT exist — identically', async () => {
    await expect(
      act(supplierSeat(onRoster.id), 't_application_start_review', 'app-9999'),
    ).rejects.toThrow(/denied for scope/);
  });
});
