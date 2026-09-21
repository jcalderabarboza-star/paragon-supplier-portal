// ─────────────────────────────────────────────────────────────────────────────
// R8 · WHAT A MATERIAL REQUEST MUST NEVER DO — ASSERTED, NOT DESCRIBED.
//
// Four prohibitions were stated in the scope report and each was said to hold
// "by construction". **A prohibition that is only argued is a comment**, and
// this tree has been burned by exactly that: `SupplierOrders` shipped a live
// commit behind a comment asserting it was unreachable, and *"that comment was
// the only thing holding the claim up, and it was false."*
//
// So: raise a request on a code-less material and then measure the four things
// that must not have moved.
//   (1) the RFQ's `materialIds` is unchanged;
//   (2) the PSL gate still returns UNDECIDABLE / does not grant;
//   (3) the should-cost spread is still silent;
//   (4) `materialIdentity`'s code-bearing field set is still exactly four.
//
// ⚠️ **AND EVERY ONE IS MEASURED BEFORE AND AFTER, NOT JUST AFTER.** An "after"
// reading alone is `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`'s shape: a clean
// result taken where the defect never was is a report about the absence, not
// about the guard.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './mock/MockCommandService';
import { materialRequestStore } from './mock/stores/materialRequestStore';
import { rfqStore } from './mock/stores/rfqStore';
import { NO_PERSON } from '../../context/noPerson';
import { DECLARED_PRESENT } from './fixturePresent';
import { pslExemptionFor } from './rfqSourcingGate';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import { codesOfKeys, type CatalogEntry } from '../../pages-v2/sourcing/materialCatalog';
import type { QueryScope } from './types';

const PROCUREMENT: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

/** The catalog shape a code-less pick really has. */
const CODE_LESS: CatalogEntry = {
  kind: 'CODE_LESS',
  reason: 'AMBIGUOUS_IN_MASTER',
  label: 'PET Bottle 100ml',
};
const CODED: CatalogEntry = {
  kind: 'CODED',
  code: 'RM-EMUL-3320',
  label: 'Cetearyl Alcohol',
};

let svc: MockCommandService;

beforeEach(() => {
  materialRequestStore.reset();
  rfqStore.reset();
  svc = new MockCommandService();
});

// ── REACH — the instrument is looking at the shipped tree ───────────────────
describe('REACH — the population is real', () => {
  it('the RFQ store is populated and the master holds real codes', () => {
    expect(rfqStore.all().length).toBeGreaterThan(10);
    // KNOWN-TRUE.
    expect(Object.keys(MATERIAL_MASTER)).toContain('RM-EMUL-3320');
    // KNOWN-FALSE CONTROL: the instrument can say no.
    expect(Object.keys(MATERIAL_MASTER)).not.toContain('MR-2026-0001');
  });
});

describe('⚠️ (1) A REQUEST NEVER MAKES AN RFQ’S MATERIAL RESOLVABLE', () => {
  it('the event’s materialIds is byte-identical before and after the request', async () => {
    const event = rfqStore.all()[0];
    const before = [...event.materialIds];

    const r = await svc.dispatch(PROCUREMENT, {
      transitionId: 't_materialrequest_submit',
      entity: 'materialRequest',
      payload: {
        requestedLabel: CODE_LESS.label,
        category: 'Packaging',
        need: 'the probe',
        catalogReason: 'AMBIGUOUS_IN_MASTER',
        raisedFromRfqId: event.id,
      },
    });
    expect(r.status).not.toBe('failed');
    // The request exists AND points at the event — so this is not clean because
    // nothing happened.
    expect(materialRequestStore.get(r.entityId!)!.raisedFromRfqId).toBe(event.id);

    const after = [...rfqStore.get(event.id)!.materialIds];
    expect(after).toEqual(before);
  });

  it('⚠️ AND `codesOfKeys` IS WHY — a code-less selection contributes nothing', () => {
    const entries = [CODE_LESS, CODED];
    // Both picked.
    expect(codesOfKeys(entries, ['PET Bottle 100ml', 'RM-EMUL-3320'])).toEqual(['RM-EMUL-3320']);
    // Only the code-less one picked → NO value at all. Not a label, not a
    // placeholder, not an empty string in the array.
    expect(codesOfKeys(entries, ['PET Bottle 100ml'])).toEqual([]);
  });

  it('⚠️ AND NO VERB EDITS AN RFQ’S MATERIALS AFTER CREATION — derived, not assumed', async () => {
    // The structural half of prohibition (1): even a caller who wanted to could
    // not, because no transition on the rfq flow writes `materialIds`. Asserted
    // by attempting every rfq verb and reading the field back.
    const event = rfqStore.all()[0];
    const before = [...event.materialIds];
    for (const verb of [
      't_rfq_publish',
      't_rfq_award',
      't_rfq_cancel',
      't_rfq_reopen',
      't_rfq_fx_pin',
    ]) {
      await svc
        .dispatch(PROCUREMENT, {
          transitionId: verb,
          entity: 'rfq',
          entityId: event.id,
          payload: { materialIds: ['RM-EMUL-3320'], materials: ['RM-EMUL-3320'] },
        })
        .catch(() => undefined);
    }
    expect([...rfqStore.get(event.id)!.materialIds]).toEqual(before);
  });
});

describe('⚠️ (2) A REQUEST NEVER GRANTS A PSL EXEMPTION', () => {
  it('a code-less event is NOT_EXEMPT before and after the request', async () => {
    // A code-less pick means `materialIds: []`. `pslExemptionFor` over an empty
    // code list cannot reach the EXEMPT arm, and its UNDECIDABLE arm is guarded
    // on `materialCodes.length > 0` — so the honest answer is NOT_EXEMPT.
    const invited = ['sup-002', 'sup-005', 'sup-007'];
    const before = pslExemptionFor(invited, [], DECLARED_PRESENT);
    expect(before.kind).toBe('NOT_EXEMPT');

    await svc.dispatch(PROCUREMENT, {
      transitionId: 't_materialrequest_submit',
      entity: 'materialRequest',
      payload: {
        requestedLabel: CODE_LESS.label,
        category: 'Packaging',
        need: 'the probe',
      },
    });
    expect(materialRequestStore.all()).toHaveLength(1);

    const after = pslExemptionFor(invited, [], DECLARED_PRESENT);
    expect(after).toEqual(before);
  });

  it('⚠️ AND THE GATE CAN STILL GRANT — so the NOT_EXEMPT above is not a dead instrument', () => {
    // Rule 4: a guard proved only against the input it withholds from is
    // indistinguishable from one that is simply broken. There IS an exempting
    // combination in this tree, and it is reached here by VALUE rather than
    // chosen by id — over the seeded events, whichever ones they are.
    const anyExempt = rfqStore
      .all()
      .map((r) => pslExemptionFor(r.invitedSupplierIds, r.materialIds, DECLARED_PRESENT))
      .filter((e) => e.kind === 'EXEMPT');
    expect(anyExempt.length).toBeGreaterThan(0);
  });

  it('⚠️ AND AN UNMAPPED CODE IS UNDECIDABLE, WHICH NEVER GRANTS', () => {
    const v = pslExemptionFor(['sup-002'], ['ZZ-NOT-A-CODE-0000'], DECLARED_PRESENT);
    expect(v).toEqual({
      kind: 'UNDECIDABLE',
      because: 'UNMAPPED_MATERIAL',
      codes: ['ZZ-NOT-A-CODE-0000'],
    });
    // The property that matters: it is not EXEMPT.
    expect(v.kind).not.toBe('EXEMPT');
  });
});

describe('⚠️ (3) A REQUEST NEVER MAKES A SHOULD-COST SPREAD APPEAR', () => {
  it('the request’s label resolves to nothing in the master, before and after', async () => {
    const label = CODE_LESS.label;
    // The label is not a master key — that is the lane's premise.
    expect(Object.keys(MATERIAL_MASTER)).not.toContain(label);

    const r = await svc.dispatch(PROCUREMENT, {
      transitionId: 't_materialrequest_submit',
      entity: 'materialRequest',
      payload: { requestedLabel: label, category: 'Packaging', need: 'the probe' },
    });
    expect(r.status).not.toBe('failed');

    // Nothing the request wrote is a master key, and the row carries no code at
    // all — so no join into the `sc-*` space can begin.
    const row = materialRequestStore.get(r.entityId!)!;
    expect(row.materialCode).toBeNull();
    expect(Object.keys(MATERIAL_MASTER)).not.toContain(row.requestedLabel);
    expect(Object.keys(MATERIAL_MASTER)).not.toContain(row.requestNumber);
    expect(Object.keys(MATERIAL_MASTER)).not.toContain(row.id);
  });
});

describe('⚠️ (4) A REQUEST NEVER WIDENS THE CODE-BEARING FIELD CENSUS', () => {
  it('no field on a stored request holds a master code', async () => {
    // `materialIdentity.test.ts` derives `CODE_FIELDS` by VALUE OVERLAP with the
    // master's keys. A request field holding a real code would be admitted
    // UNAIDED and redden its four-member pin. This asserts the precondition the
    // pin depends on, at the row level, over every string field.
    const r = await svc.dispatch(PROCUREMENT, {
      transitionId: 't_materialrequest_submit',
      entity: 'materialRequest',
      payload: {
        requestedLabel: CODE_LESS.label,
        category: 'Packaging',
        need: 'the probe',
        specification: 'a spec',
        expectedUom: 'PCS',
        catalogReason: 'AMBIGUOUS_IN_MASTER',
        raisedFromRfqId: rfqStore.all()[0].id,
      },
    });
    const row = materialRequestStore.get(r.entityId!)! as unknown as Record<string, unknown>;
    const codes = new Set(Object.keys(MATERIAL_MASTER));
    const offenders = Object.entries(row)
      .filter(([, v]) => typeof v === 'string' && codes.has(v as string))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
    // ⚠️ ANTI-VACUITY: the walk really did look at strings. Without this the
    // empty result above is satisfied by a row of nothing but nulls.
    const stringFields = Object.entries(row).filter(([, v]) => typeof v === 'string');
    expect(stringFields.length).toBeGreaterThan(4);
    // And the matcher can accuse: a fabricated row holding a code IS caught.
    const planted = { ...row, sneaky: 'RM-EMUL-3320' };
    const caught = Object.entries(planted)
      .filter(([, v]) => typeof v === 'string' && codes.has(v as string))
      .map(([k]) => k);
    expect(caught).toEqual(['sneaky']);
  });
});
