// ────────────────────────────────────────────────────────────────────────────
// RequirementResponse command integration (SDC-2a — the P1 submission spine).
// t_requirementresponse_submit dispatched through the REAL MockCommandService +
// real requirementResponseStore, against the frozen SDC fixture publications.
// Honest proof that (mirroring quotationLifecycleCommand.test.ts):
//   • submit is the ONE supplier-owned creation verb — creationOwner folds
//     LINE-GRAIN membership + scope into one statement (owner valid only when
//     the referenced publication fanned this exact supplier × material ×
//     period line); non-fanned → SCOPE_DENIED, spoof → SCOPE_DENIED, buyer →
//     ROLE_NOT_PERMITTED, hollow → MISSING_FIELDS;
//   • the snapshot binding is un-falsifiable — payload.planVersion must be the
//     referenced publication's own planVersion (policy hook), and the response
//     thread versions up (prior max + 1), never overwrites;
//   • raw facts persist; uom comes from the MATERIAL MASTER, never the caller
//     (invariant #2); confirmedQty 0 + root cause is a LEGAL short
//     confirmation (ruling F-2); provenance = SUPPLIER × SIMULATED × committed
//     (ruling F-4).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { MATERIAL_MASTER } from '../../sdc';
import {
  getFlow,
  getTransition,
  validateFlow,
  personaCan,
  requirementResponseFlow,
} from '../../transitions';
import { DataError } from '../types';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
// R2 (PUB-2026-08-RM-R2 / PV-2026-08.2) fans RM-EMUL-3310 2026-08 to sup-002 +
// sup-005; AI-NIAC-6601 2026-10 to sup-007 ONLY.
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
const sup005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005' };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };

const svc = new MockCommandService();

const submit = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_requirementresponse_submit',
  entity: 'requirementResponse',
  payload: {
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    materialCode: 'RM-EMUL-3310',
    periodBucket: '2026-08',
    supplierId: 'sup-002',
    confirmedQty: 6000,
    committedDate: '2026-08-20',
    ...overrides,
  },
});

beforeEach(() => {
  requirementResponseStore.reset();
});

describe('requirementResponse flow — authored machine (SDC-2a)', () => {
  it('registers a valid machine: five states, submit wired-shape, lifecycle authored', () => {
    expect(getFlow('requirementResponse')).toBe(requirementResponseFlow);
    expect(validateFlow(requirementResponseFlow).ok).toBe(true);
    const t = getTransition('t_requirementresponse_submit')!;
    expect(t.from).toEqual([]); // creation-shape
    expect(t.trigger).toBe('creation');
    expect(t.requiredFields).toEqual([
      'publicationId',
      'planVersion',
      'materialCode',
      'periodBucket',
      'confirmedQty',
    ]);
    // The authored-unwired lifecycle exists in the registry (FORK-2 hybrid).
    expect(getTransition('t_requirementresponse_promote')!.to).toBe('Submitted');
    expect(getTransition('t_requirementresponse_review')!.to).toBe('UnderReview');
    expect(getTransition('t_requirementresponse_accept')!.to).toBe('Accepted');
    expect(getTransition('t_requirementresponse_dispute')!.to).toBe('Disputed');
  });

  it('supplier owns submit; the review lifecycle is buyer (catalog-covered)', () => {
    expect(personaCan('supplier', 'requirementresponse:submit')).toBe(true);
    expect(personaCan('buyer', 'requirementresponse:submit')).toBe(false);
    for (const role of [
      'requirementresponse:review',
      'requirementresponse:accept',
      'requirementresponse:dispute',
    ]) {
      expect(personaCan('buyer', role)).toBe(true);
      expect(personaCan('supplier', role)).toBe(false);
    }
  });
});

describe('t_requirementresponse_submit — supplier-owned creation (line-grain scope)', () => {
  it('a fanned supplier confirms its line → Submitted, store-assigned id, raw facts persisted', async () => {
    const res = await svc.dispatch(sup002, submit());
    expect(res.status).toBe('done');
    expect(res.entityId).toMatch(/^rr-9\d+$/); // 9xxx range (fixtures are 0xxx)
    const r = requirementResponseStore.get(res.entityId!)!;
    expect(r.status).toBe('Submitted');
    expect(r.supplierId).toBe('sup-002');
    expect(r.materialCode).toBe('RM-EMUL-3310');
    expect(r.periodBucket).toBe('2026-08');
    expect(r.publicationId).toBe('PUB-2026-08-RM-R2');
    expect(r.planVersion).toBe('PV-2026-08.2'); // the snapshot answered, bound
    expect(r.forecastConfirmation.confirmedQty).toBe(6000);
    expect(r.forecastConfirmation.committedDate).toBe('2026-08-20');
    expect(r.submittedAt).toBeTruthy();
    expect(r.id).toBe(res.entityId); // the number doubles as the id
  });

  it('a supplier the line was NOT fanned to is denied (SCOPE_DENIED) — line-grain membership', async () => {
    const before = requirementResponseStore.all().length;
    // sup-007 is a real supplier with its OWN fanned line (AI-NIAC-6601), but
    // RM-EMUL-3310 × 2026-08 was never fanned to it.
    await expect(
      svc.dispatch(sup007, submit({ supplierId: 'sup-007' })),
    ).rejects.toBeInstanceOf(DataError);
    try {
      await svc.dispatch(sup007, submit({ supplierId: 'sup-007' }));
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
    expect(requirementResponseStore.all().length).toBe(before); // nothing minted
  });

  it('a fanned material×period is still denied for the WRONG supplier-pairing (grain, not roster)', async () => {
    // AI-NIAC-6601 × 2026-10 IS published — but fanned to sup-007, not sup-002.
    await expect(
      svc.dispatch(
        sup002,
        submit({ materialCode: 'AI-NIAC-6601', periodBucket: '2026-10' }),
      ),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('a supplier cannot submit AS another supplier (owner ≠ scope → SCOPE_DENIED)', async () => {
    // sup-005 IS fanned RM-EMUL-3310 × 2026-08, but the caller is sup-002 — spoof rejected.
    await expect(
      svc.dispatch(sup002, submit({ supplierId: 'sup-005' })),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('a buyer is denied — submit is a supplier verb (ROLE_NOT_PERMITTED, past scope)', async () => {
    const res = await svc.dispatch(buyer, submit());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:requirementresponse:submit/);
  });

  it('a missing publicationId cannot establish fanned-membership → SCOPE_DENIED (scope precedes fields)', async () => {
    const before = requirementResponseStore.all().length;
    const payload = { ...submit().payload };
    delete (payload as Record<string, unknown>).publicationId;
    await expect(
      svc.dispatch(sup002, { ...submit(), payload }),
    ).rejects.toBeInstanceOf(DataError);
    expect(requirementResponseStore.all().length).toBe(before);
  });

  it('planVersion + confirmedQty are the required floor — a hollow response fails, mints nothing', async () => {
    for (const field of ['planVersion', 'confirmedQty']) {
      const before = requirementResponseStore.all().length;
      const payload = { ...submit().payload };
      delete (payload as Record<string, unknown>)[field];
      const res = await svc.dispatch(sup002, { ...submit(), payload });
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(new RegExp(`MISSING_FIELDS:.*${field}`));
      expect(requirementResponseStore.all().length).toBe(before);
    }
  });
});

describe('t_requirementresponse_submit — the snapshot binding is un-falsifiable', () => {
  it('a planVersion that is not the referenced publication’s own is rejected (policy hook)', async () => {
    const before = requirementResponseStore.all().length;
    // PV-2026-08.1 belongs to R1 — claiming it against R2 is a false binding.
    const res = await svc.dispatch(sup002, submit({ planVersion: 'PV-2026-08.1' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/does not match publication/);
    expect(requirementResponseStore.all().length).toBe(before);
  });

  it('the response thread versions up — prior max + 1, per publication (never overwrites)', async () => {
    // The R1 thread already holds rr-0001 (same supplier × material × period,
    // DIFFERENT publication) — it must NOT leak into R2's version count.
    const first = await svc.dispatch(sup002, submit());
    expect(requirementResponseStore.get(first.entityId!)!.submissionVersion).toBe(1);
    const second = await svc.dispatch(sup002, submit({ confirmedQty: 5500 }));
    const r2 = requirementResponseStore.get(second.entityId!)!;
    expect(r2.submissionVersion).toBe(2);
    // Versioned, not overwritten — the first submission is still there.
    expect(requirementResponseStore.get(first.entityId!)).toBeDefined();
  });
});

// ─── SDC-2b-EXT — t_requirementresponse_acknowledge + the symmetric guards ────

const acknowledge = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_requirementresponse_acknowledge',
  entity: 'requirementResponse',
  payload: {
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    materialCode: 'AI-NIAC-6601',
    periodBucket: '2026-10',
    supplierId: 'sup-007',
    acknowledgment: { note: 'Stock sense covers the horizon.' },
    ...overrides,
  },
});

describe('t_requirementresponse_acknowledge — the visibility response (SDC-2b-EXT)', () => {
  it('is authored with NO confirmedQty on the floor; supplier-owned', () => {
    const t = getTransition('t_requirementresponse_acknowledge')!;
    expect(t.from).toEqual([]);
    expect(t.trigger).toBe('creation');
    expect(t.requiredFields).toEqual([
      'publicationId',
      'planVersion',
      'materialCode',
      'periodBucket',
    ]);
    expect(personaCan('supplier', 'requirementresponse:acknowledge')).toBe(true);
    expect(personaCan('buyer', 'requirementresponse:acknowledge')).toBe(false);
    // The commitment floor on submit stays byte-identical (unrelaxed).
    expect(getTransition('t_requirementresponse_submit')!.requiredFields).toContain(
      'confirmedQty',
    );
  });

  it('sup-007 acknowledges its visibility line → ack record, NO commitment fields, versioned over rr-0005', async () => {
    const res = await svc.dispatch(sup007, acknowledge());
    expect(res.status).toBe('done');
    const r = requirementResponseStore.get(res.entityId!)!;
    expect(r.acknowledgment).toEqual({ note: 'Stock sense covers the horizon.' });
    expect(r.forecastConfirmation).toBeUndefined(); // invariant #11 — no number to misread
    expect(r.planVersion).toBe('PV-2026-08.2');
    // The seed rr-0005 already answered this exact thread → the re-ack is v2,
    // and the prior acknowledgment is kept (versioned, never overwritten).
    expect(r.submissionVersion).toBe(2);
    expect(requirementResponseStore.get('rr-0005')).toBeDefined();
  });

  it('a noteless acknowledgment persists as an empty signal (nothing fabricated)', async () => {
    const res = await svc.dispatch(sup007, acknowledge({ acknowledgment: {} }));
    expect(requirementResponseStore.get(res.entityId!)!.acknowledgment).toEqual({});
  });

  it('⭐ symmetric guard: SUBMIT against a visibility-only line is rejected (no fabricated commitment)', async () => {
    const before = requirementResponseStore.all().length;
    const res = await svc.dispatch(
      sup007,
      submit({
        supplierId: 'sup-007',
        materialCode: 'AI-NIAC-6601',
        periodBucket: '2026-10',
        confirmedQty: 800,
      }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/rr_submit_commitment_class/);
    expect(res.reason).toMatch(/visibility-only/);
    expect(requirementResponseStore.all().length).toBe(before); // nothing minted
  });

  it('⭐ symmetric guard: ACKNOWLEDGE against a firm line is rejected (no dodging the commitment floor)', async () => {
    const before = requirementResponseStore.all().length;
    const res = await svc.dispatch(
      sup002,
      acknowledge({
        supplierId: 'sup-002',
        materialCode: 'RM-EMUL-3310',
        periodBucket: '2026-08',
      }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/rr_acknowledge_visibility_class/);
    expect(requirementResponseStore.all().length).toBe(before);
  });

  it('line-grain scope holds on the new verb: acknowledging ANOTHER supplier’s line is SCOPE_DENIED', async () => {
    // AI-NIAC-6601 × 2026-10 is fanned to sup-007, not sup-002.
    await expect(
      svc.dispatch(sup002, acknowledge({ supplierId: 'sup-002' })),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('a buyer is denied — acknowledge is a supplier verb', async () => {
    const res = await svc.dispatch(buyer, acknowledge());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:requirementresponse:acknowledge/);
  });

  it('the snapshot binding holds on acknowledge too (wrong planVersion rejected)', async () => {
    const res = await svc.dispatch(sup007, acknowledge({ planVersion: 'PV-2026-08.1' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/does not match publication/);
  });
});

describe('t_requirementresponse_submit — honest-by-construction facts', () => {
  it('uom comes from the MATERIAL MASTER, never the caller (invariant #2)', async () => {
    // PK-PETB-8810 is PCS in the master; a caller-supplied uom is IGNORED.
    const res = await svc.dispatch(
      sup005,
      submit({
        supplierId: 'sup-005',
        materialCode: 'PK-PETB-8810',
        periodBucket: '2026-09',
        confirmedQty: 150000,
        uom: 'KG', // spoofed unit — must not persist
      }),
    );
    const r = requirementResponseStore.get(res.entityId!)!;
    expect(MATERIAL_MASTER['PK-PETB-8810'].canonicalUom).toBe('PCS');
    expect(r.forecastConfirmation.uom).toBe('PCS');
  });

  it('confirmedQty 0 + root cause is a LEGAL short confirmation (ruling F-2)', async () => {
    const res = await svc.dispatch(
      sup002,
      submit({
        confirmedQty: 0,
        rootCause: {
          level1: 'capacity',
          level2: 'line-changeover',
          note: 'No bridgeable volume this cycle.',
        },
      }),
    );
    expect(res.status).toBe('done'); // isEmpty(0) is false — 0 passes the floor
    const r = requirementResponseStore.get(res.entityId!)!;
    expect(r.forecastConfirmation.confirmedQty).toBe(0);
    expect(r.rootCause).toEqual({
      level1: 'capacity',
      level2: 'line-changeover',
      note: 'No bridgeable volume this cycle.',
    });
  });

  it('a shapeless root cause (no level1) is dropped, not guessed', async () => {
    const res = await svc.dispatch(sup002, submit({ rootCause: { note: 'x' } }));
    expect(requirementResponseStore.get(res.entityId!)!.rootCause).toBeUndefined();
  });

  it('provenance = SUPPLIER × SIMULATED × committed (ruling F-4 — mock store, honest tier)', async () => {
    const res = await svc.dispatch(sup002, submit());
    expect(requirementResponseStore.get(res.entityId!)!.provenance).toEqual({
      source: 'SUPPLIER',
      liveness: 'SIMULATED',
      planState: 'committed',
    });
  });
});
