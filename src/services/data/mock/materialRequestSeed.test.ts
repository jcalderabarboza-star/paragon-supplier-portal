// ─────────────────────────────────────────────────────────────────────────────
// R8 · THE SEED — grown through the verb, and the RFQ it hangs off is grown too.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { materialRequestStore } from './stores/materialRequestStore';
import { rfqStore } from './stores/rfqStore';
import { seedMaterialRequests } from './materialRequestSeed';
import { mockRfqs } from '../../../data/mockRfqs';
import { NO_PERSON } from '../../../context/noPerson';

let svc: MockCommandService;

beforeEach(() => {
  materialRequestStore.reset();
  rfqStore.reset();
  commandAuditSink.clear();
  svc = new MockCommandService();
});

// ── POPULATION FIRST, BY MEMBERSHIP ─────────────────────────────────────────
describe('⚠️ POPULATION — empty before, named rows after', () => {
  it('the store opens on []', () => {
    expect(materialRequestStore.all()).toEqual([]);
  });

  it('⚠️ AND THE SEED PUTS NAMED ROWS IN IT — membership, never a count', async () => {
    const out = await seedMaterialRequests(svc);
    expect(out.status).toBe('seeded');
    const labels = materialRequestStore.all().map((r) => r.requestedLabel);
    expect(labels).toContain('PET Bottle 100ml');
    expect(labels).toContain('Sample Amber Dropper 30ml (illustrative)');
    // KNOWN-FALSE CONTROL.
    expect(labels).not.toContain('a row the seed never raised');
  });
});

describe('the rows are GROWN, not written', () => {
  it('every row has a DR-10 event behind it', async () => {
    await seedMaterialRequests(svc);
    // Two requests, and the event the first hangs off.
    expect(commandAuditSink.byEvent('t_materialrequest_submit')).toHaveLength(2);
    expect(commandAuditSink.byEvent('t_rfq_create')).toHaveLength(1);
  });

  it('⚠️ AND THEY STOP AT `Submitted` — the reviewing is the operator’s act', async () => {
    await seedMaterialRequests(svc);
    expect(materialRequestStore.all().map((r) => r.status)).toEqual(['Submitted', 'Submitted']);
  });

  it('the numbers are store-assigned and sequential', async () => {
    const out = await seedMaterialRequests(svc);
    expect(out.requestNumbers).toEqual(['MR-2026-0001', 'MR-2026-0002']);
    // And the number on the row is the number reported — not a surface copy.
    const stored = materialRequestStore.all().map((r) => r.requestNumber).sort();
    expect(stored).toEqual(['MR-2026-0001', 'MR-2026-0002']);
  });
});

describe('⚠️ THE SEEDED EVENT CARRIES NO RESOLVABLE MATERIAL, WHICH IS THE POINT', () => {
  it('the seed raises its OWN RFQ and that RFQ’s materialIds is EMPTY', async () => {
    const out = await seedMaterialRequests(svc);
    expect(out.rfqId).toBeTruthy();
    const event = rfqStore.get(out.rfqId!)!;
    // `codesOfKeys` is a FILTER: a code-less pick contributes nothing. So the
    // event a material request is raised from genuinely has no code to join on
    // — which is the state the wizard entrance exists for.
    expect(event.materialIds).toEqual([]);
  });

  it('⚠️ AND THAT IS WHY IT IS NOT HUNG OFF A SEEDED RFQ — all 14 of those resolve', () => {
    // The measurement that forced option (b), asserted rather than described:
    // every seeded event's materials are real master codes, so a request
    // pointing at one would contradict the reason the entrance exists.
    const withNoCodes = mockRfqs.filter((r) => r.materialIds.length === 0);
    expect(withNoCodes).toEqual([]);
    // Anti-vacuity: the fixture is non-empty, so the emptiness above is a fact
    // about the rows rather than about the filter.
    expect(mockRfqs.length).toBeGreaterThan(10);
  });

  it('the first row RESOLVES to that event; the second is standalone', async () => {
    const out = await seedMaterialRequests(svc);
    const byLabel = (l: string) =>
      materialRequestStore.all().find((r) => r.requestedLabel === l)!;
    expect(byLabel('PET Bottle 100ml').raisedFromRfqId).toBe(out.rfqId);
    expect(byLabel('Sample Amber Dropper 30ml (illustrative)').raisedFromRfqId).toBeNull();
  });

  it('the wizard-provenance row carries the catalog’s own reason', async () => {
    await seedMaterialRequests(svc);
    const row = materialRequestStore.all().find((r) => r.requestedLabel === 'PET Bottle 100ml')!;
    // `PET Bottle 100ml` is the catalog's `AMBIGUOUS_IN_MASTER` entry, and the
    // reason travels so a reviewer gets the triage the union already encodes.
    expect(row.catalogReason).toBe('AMBIGUOUS_IN_MASTER');
    // The standalone one picked nothing, so it carries none.
    const solo = materialRequestStore
      .all()
      .find((r) => r.requestedLabel === 'Sample Amber Dropper 30ml (illustrative)')!;
    expect(solo.catalogReason).toBeNull();
  });

  it('⚠️ NO ROW CARRIES A CODE — the lane’s whole premise, on the seed', async () => {
    await seedMaterialRequests(svc);
    for (const r of materialRequestStore.all()) {
      expect(r.materialCode).toBeNull();
    }
  });
});

describe('idempotence, and the refusal contract', () => {
  it('re-running on a NON-EMPTY store finds rows and skips', async () => {
    await seedMaterialRequests(svc);
    const before = materialRequestStore.all().length;
    const rfqsBefore = rfqStore.all().length;
    const again = await seedMaterialRequests(svc);
    expect(again.status).toBe('already-seeded');
    expect(materialRequestStore.all().length).toBe(before);
    // ⚠️ AND IT DOES NOT RAISE A SECOND EVENT EITHER — the skip is checked
    // BEFORE the RFQ dispatch, not after it.
    expect(rfqStore.all().length).toBe(rfqsBefore);
  });

  it('⚠️ THE SUCCESS OUTCOME REPORTS NO REFUSAL — the arms are mutually exclusive', async () => {
    // ⚠️ **THIS REPLACED A TAUTOLOGY, AND THE REPLACEMENT IS THE POINT.** The
    // first draft asserted `expect(['seeded','refused']).toContain(out.status)`,
    // which cannot fail on any outcome the type permits — an assertion that
    // examines nothing, which this project refuses even when the code under it
    // is correct. What IS checkable is that the outcome never reports a success
    // and a refusal at once.
    const out = await seedMaterialRequests(svc);
    expect(out.status).toBe('seeded');
    expect(out.refusedAt).toBeUndefined();
    expect(out.reason).toBeUndefined();
    expect(out.requestNumbers).toHaveLength(2);
    expect(out.rfqId).toBeTruthy();
  });

  it('⚠️ AND THE REFUSAL ARM IS REACHABLE — fired at a refusal the verb really enforces', async () => {
    // The seed's contract is that a refusal is REPORTED rather than swallowed.
    // Proving the arm is reachable needs a refusal the dispatcher genuinely
    // produces, not a stub — a stub agrees with the assertion by construction
    // (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`'s cousin). So: the same verb the
    // seed calls, under a lane that does not hold its atom.
    const bare = new MockCommandService();
    const refused = await bare.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
      {
        transitionId: 't_materialrequest_submit',
        entity: 'materialRequest',
        payload: { requestedLabel: 'x', category: 'Packaging', need: 'y' },
      },
    );
    expect(refused.status).toBe('failed');
    expect(refused.reason).toContain('ROLE_NOT_PERMITTED');
    // And nothing was written on the way to being refused.
    expect(materialRequestStore.all()).toEqual([]);
  });
});
