// ────────────────────────────────────────────────────────────────────────────
// SDC-3a — the two additional supplier-submission objects, dispatched through
// the REAL MockCommandService + real stores. Honest proof that (mirroring
// requirementResponseCommand.test.ts):
//   • t_inventorydeclaration_declare — total-first (R-4 Finding 1(a)): totalQty
//     is the floor, batches[] optional; when batches present Σ = totalQty
//     (policy hook); creationOwner folds (i)∪(ii) collaborated-material
//     membership + scope; uom from the master, never the caller; a snapshot
//     APPENDS (never mutates); granularity is derived at read.
//   • t_incomingshipment_report — births Booked; the symmetric direction guards
//     (to-paragon must link a same-supplier ASN that RESOLVES; p2d carries no
//     asnRef; p2d requires a distributor relationship); uom from the master.
//   • the SubmissionSession causationId seam — commands 2..n of one visit carry
//     the first command's correlationId, grouping their DR-10 events (anchor-
//     correlationId mechanic) without collapsing their own correlationIds.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import {
  MATERIAL_MASTER,
  declarationGranularity,
  openSubmissionSession,
  currentDeclarations,
  sdcClock,
  SDC_SIMULATED_NOW,
} from '../../sdc';
import {
  getFlow,
  getTransition,
  validateFlow,
  personaCan,
  inventoryDeclarationFlow,
  incomingShipmentFlow,
} from '../../transitions';
import { DataError } from '../types';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
// sup-002 makes glycerin (RM-EMUL-3310, manufacturer relationship + fanned);
// sup-005 is a DISTRIBUTOR of RM-EMUL-3310 (has a principal leg);
// sup-007 makes packaging (PK-PETB-8810 / PK-CAPF-8820, manufacturer).
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
const sup005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005' };
const sup007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };

const svc = new MockCommandService();

beforeEach(() => {
  inventoryDeclarationStore.reset();
  incomingShipmentStore.reset();
  requirementResponseStore.reset();
  sdcClock.reset(); // SDC-4a — restore the default simulated now between tests
});

// ─── The authored machines ────────────────────────────────────────────────────

describe('SDC-3a flows — authored machines', () => {
  it('inventoryDeclaration is a valid degenerate single-state machine, declare wired-shape', () => {
    expect(getFlow('inventoryDeclaration')).toBe(inventoryDeclarationFlow);
    expect(validateFlow(inventoryDeclarationFlow).ok).toBe(true);
    expect(inventoryDeclarationFlow.states).toEqual(['Declared']);
    const t = getTransition('t_inventorydeclaration_declare')!;
    expect(t.from).toEqual([]); // creation-shape
    expect(t.trigger).toBe('creation');
    expect(t.requiredFields).toEqual(['materialCode', 'totalQty']);
    expect(personaCan('supplier', 'inventorydeclaration:declare')).toBe(true);
    expect(personaCan('buyer', 'inventorydeclaration:declare')).toBe(false);
  });

  it('incomingShipment is a valid linear+Cancelled machine; report wired, advance authored-unwired', () => {
    expect(getFlow('incomingShipment')).toBe(incomingShipmentFlow);
    expect(validateFlow(incomingShipmentFlow).ok).toBe(true);
    expect(incomingShipmentFlow.states).toEqual(['Booked', 'Shipped', 'Arrived', 'Cancelled']);
    // No ETARevised state (addendum §2 — eta is a field, revisions audited events).
    expect(incomingShipmentFlow.states).not.toContain('ETARevised');
    const t = getTransition('t_incomingshipment_report')!;
    expect(t.from).toEqual([]);
    expect(t.trigger).toBe('creation');
    expect(t.to).toBe('Booked');
    expect(t.requiredFields).toEqual(['materialCode', 'direction', 'qty']);
    // The advance verbs exist in the registry (FORK-2 hybrid, authored-unwired).
    expect(getTransition('t_incomingshipment_ship')!.to).toBe('Shipped');
    expect(getTransition('t_incomingshipment_arrive')!.to).toBe('Arrived');
    expect(getTransition('t_incomingshipment_cancel')!.to).toBe('Cancelled');
    expect(personaCan('supplier', 'incomingshipment:report')).toBe(true);
  });
});

// ─── t_inventorydeclaration_declare ───────────────────────────────────────────

const declare = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_inventorydeclaration_declare',
  entity: 'inventoryDeclaration',
  payload: {
    materialCode: 'RM-EMUL-3310',
    supplierId: 'sup-002',
    totalQty: 4000,
    ...overrides,
  },
});

describe('t_inventorydeclaration_declare — total-first, own-facts (SDC-3a)', () => {
  it('a total-ONLY declaration is legal (the honest minimal channel form)', async () => {
    const res = await svc.dispatch(sup002, declare());
    expect(res.status).toBe('done');
    expect(res.entityId).toMatch(/^inv-9\d+$/);
    const d = inventoryDeclarationStore.get(res.entityId!)!;
    expect(d.totalQty).toBe(4000);
    expect(d.batches).toBeUndefined(); // total-only
    expect(declarationGranularity(d)).toBe('total-only');
    expect(d.declaredAt).toBeTruthy();
    expect(d.provenance).toEqual({ source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' });
  });

  it('a BATCH-GRAIN declaration persists detail when Σ batch qty === totalQty', async () => {
    const res = await svc.dispatch(
      sup002,
      declare({
        totalQty: 5000,
        batches: [
          { batchNumber: 'GLY-25A', qty: 3000, expiryDate: '2027-12-31' },
          { batchNumber: 'GLY-25B', qty: 2000 },
        ],
      }),
    );
    expect(res.status).toBe('done');
    const d = inventoryDeclarationStore.get(res.entityId!)!;
    expect(d.batches).toHaveLength(2);
    expect(declarationGranularity(d)).toBe('batch-grain');
    expect(d.batches!.reduce((s, b) => s + b.qty, 0)).toBe(5000);
    expect(d.batches![0].expiryDate).toBe('2027-12-31');
  });

  it('a batch total that DISAGREES with totalQty is rejected (invariant #6′ — no fabricated total)', async () => {
    const before = inventoryDeclarationStore.all().length;
    const res = await svc.dispatch(
      sup002,
      declare({
        totalQty: 5000,
        batches: [{ batchNumber: 'GLY-25A', qty: 3000 }, { batchNumber: 'GLY-25B', qty: 1500 }],
      }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/inv_declare_batch_total/);
    expect(res.reason).toMatch(/does not equal declared totalQty/);
    expect(inventoryDeclarationStore.all().length).toBe(before); // nothing minted
  });

  it('uom comes from the MATERIAL MASTER, never the caller (invariant #2) — total + batches', async () => {
    // PK-PETB-8810 is PCS in the master; a spoofed uom is ignored on total and batch.
    const res = await svc.dispatch(
      sup007,
      declare({
        materialCode: 'PK-PETB-8810',
        supplierId: 'sup-007',
        totalQty: 10000,
        uom: 'KG', // spoof — must not persist
        batches: [{ batchNumber: 'PET-1', qty: 10000, uom: 'KG' }],
      }),
    );
    const d = inventoryDeclarationStore.get(res.entityId!)!;
    expect(MATERIAL_MASTER['PK-PETB-8810'].canonicalUom).toBe('PCS');
    expect(d.uom).toBe('PCS');
    expect(d.batches![0].uom).toBe('PCS');
  });

  it('a snapshot APPENDS — a second declaration never mutates the first (latestFor picks the newest)', async () => {
    // sup-007 / PK-CAPF-8820 has NO seed declaration. Both declares are stamped
    // with the SAME shared simulated clock (SDC-4a), so declaredAt is identical —
    // latestFor resolves the newest by INSERTION RECENCY (the appended one has the
    // higher id-seq), never by the clock.
    const p = { materialCode: 'PK-CAPF-8820', supplierId: 'sup-007' };
    const first = await svc.dispatch(sup007, declare({ ...p, totalQty: 4000 }));
    const second = await svc.dispatch(sup007, declare({ ...p, totalQty: 3500 }));
    expect(first.entityId).not.toBe(second.entityId);
    expect(inventoryDeclarationStore.get(first.entityId!)!.totalQty).toBe(4000); // untouched
    // latestFor resolves the newest by insertion recency (the appended one).
    const latest = inventoryDeclarationStore.latestFor('sup-007', 'PK-CAPF-8820');
    expect(latest!.id).toBe(second.entityId);
  });

  // ─── SDC-4a — the clock/ordering collision, dispatched end-to-end ───────────
  it('a fresh declare becomes the CURRENT SOH over a FUTURE-DATED seed (seq beats the clock)', async () => {
    // sup-007 / PK-PETB-8810 has the SDC-3b seed inv-0003 (declaredAt 2026-08-05,
    // totalQty 45 000) — dated in the SIMULATED FUTURE. This is the exact collision:
    // a live write stamped at the real wall-clock (2026-07-20) sits BEFORE that seed.
    const seed = inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8810');
    expect(seed!.id).toBe('inv-0003'); // the future-dated seed, pre-declare
    expect(seed!.totalQty).toBe(45000);

    // Stamp the write EARLIER than the seed (reproduce the wall-clock collision).
    sdcClock.set('2026-07-20T00:00:00.000Z');
    const res = await svc.dispatch(
      sup007,
      declare({ materialCode: 'PK-PETB-8810', supplierId: 'sup-007', totalQty: 50000 }),
    );
    const created = inventoryDeclarationStore.get(res.entityId!)!;
    // The stamp read the SHARED clock (the override), never real new Date().
    expect(created.declaredAt).toBe('2026-07-20T00:00:00.000Z');
    // …and it is EARLIER than the seed's stamp — yet it is the CURRENT SOH,
    // because insertion recency (inv-9xxx > inv-0003) wins, not the timestamp.
    expect(Date.parse(created.declaredAt)).toBeLessThan(Date.parse(seed!.declaredAt));
    const current = currentDeclarations(
      inventoryDeclarationStore
        .all()
        .filter((d) => d.supplierId === 'sup-007' && d.materialCode === 'PK-PETB-8810'),
    );
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(res.entityId);
    expect(current[0].totalQty).toBe(50000); // the fresh declare, not the 45 000 seed
    // The store's own resolver agrees.
    expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8810')!.totalQty).toBe(50000);
  });

  it('the DEFAULT shared clock stamps a live declare within the simulated timeline (past the seed)', async () => {
    const res = await svc.dispatch(
      sup007,
      declare({ materialCode: 'PK-CAPF-8820', supplierId: 'sup-007', totalQty: 1000 }),
    );
    const created = inventoryDeclarationStore.get(res.entityId!)!;
    expect(created.declaredAt).toBe(SDC_SIMULATED_NOW); // the shared "now", not real time
    // Past every seed stamp (latest seed 2026-08-05), so even max-by-declaredAt agrees.
    expect(Date.parse(created.declaredAt)).toBeGreaterThan(Date.parse('2026-08-05T09:20:00.000Z'));
  });

  it('a NON-collaborated material is denied (owner=null → SCOPE_DENIED)', async () => {
    const before = inventoryDeclarationStore.all().length;
    // sup-002 has no relationship and no fanned line for a packaging cap.
    await expect(
      svc.dispatch(sup002, declare({ materialCode: 'PK-CAPF-8820' })),
    ).rejects.toBeInstanceOf(DataError);
    expect(inventoryDeclarationStore.all().length).toBe(before);
  });

  it('a supplier cannot declare AS another supplier (owner ≠ scope → SCOPE_DENIED)', async () => {
    await expect(
      svc.dispatch(sup002, declare({ supplierId: 'sup-005' })),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('a buyer is denied — declare is a supplier verb (ROLE_NOT_PERMITTED)', async () => {
    const res = await svc.dispatch(buyer, declare());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:inventorydeclaration:declare/);
  });

  it('totalQty is the required floor — a declaration without it mints nothing', async () => {
    const before = inventoryDeclarationStore.all().length;
    const payload = { ...declare().payload };
    delete (payload as Record<string, unknown>).totalQty;
    const res = await svc.dispatch(sup002, { ...declare(), payload });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:.*totalQty/);
    expect(inventoryDeclarationStore.all().length).toBe(before);
  });
});

// ─── t_incomingshipment_report ────────────────────────────────────────────────

const report = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_incomingshipment_report',
  entity: 'incomingShipment',
  payload: {
    materialCode: 'RM-EMUL-3310',
    supplierId: 'sup-002',
    direction: 'to-paragon',
    qty: 6000,
    asnRef: 'ASN-2025-00301', // sup-002's own ASN
    eta: '2026-09-01',
    ...overrides,
  },
});

describe('t_incomingshipment_report — direction guards + ASN resolution (SDC-3a)', () => {
  it('a to-paragon leg linking a same-supplier ASN that RESOLVES → Booked', async () => {
    const res = await svc.dispatch(sup002, report());
    expect(res.status).toBe('done');
    const s = incomingShipmentStore.get(res.entityId!)!;
    expect(s.lifecycle).toBe('Booked');
    expect(s.direction).toBe('to-paragon');
    expect(s.asnRef).toBe('ASN-2025-00301');
    expect(s.uom).toBe('KG'); // from master
  });

  it('a to-paragon leg with an UNRESOLVABLE asnRef is rejected (dangling claim)', async () => {
    const res = await svc.dispatch(sup002, report({ asnRef: 'ASN-9999-9999' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ish_toparagon_asn_linked/);
    expect(res.reason).toMatch(/does not resolve/);
  });

  it("a to-paragon leg linking ANOTHER supplier's ASN is rejected (link, don't spoof)", async () => {
    // ASN-2025-00302 belongs to sup-005.
    const res = await svc.dispatch(sup002, report({ asnRef: 'ASN-2025-00302' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/belongs to another supplier/);
  });

  it('a to-paragon leg with NO asnRef is rejected (must converge on ASN)', async () => {
    const payload = { ...report().payload };
    delete (payload as Record<string, unknown>).asnRef;
    const res = await svc.dispatch(sup002, { ...report(), payload });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/must link an ASN/);
  });

  it('a principal-to-distributor leg from a DISTRIBUTOR, no asnRef → Booked', async () => {
    // sup-005 is a distributor of RM-EMUL-3310 (has a principal leg).
    const res = await svc.dispatch(
      sup005,
      report({
        supplierId: 'sup-005',
        direction: 'principal-to-distributor',
        asnRef: undefined,
        qty: 4000,
      }),
    );
    expect(res.status).toBe('done');
    const s = incomingShipmentStore.get(res.entityId!)!;
    expect(s.direction).toBe('principal-to-distributor');
    expect(s.asnRef).toBeUndefined();
  });

  it('a principal-to-distributor leg carrying an asnRef is rejected (not a Paragon-inbound leg)', async () => {
    const res = await svc.dispatch(
      sup005,
      report({
        supplierId: 'sup-005',
        direction: 'principal-to-distributor',
        asnRef: 'ASN-2025-00302',
        qty: 4000,
      }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ish_p2d_no_asn/);
  });

  it('a principal-to-distributor leg from a MANUFACTURER is rejected (no principal leg, §7)', async () => {
    // sup-002 is a manufacturer of RM-EMUL-3310 — it has no principal to report.
    const res = await svc.dispatch(
      sup002,
      report({
        direction: 'principal-to-distributor',
        asnRef: undefined,
        qty: 4000,
      }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ish_p2d_distributor_only/);
  });

  it('a supplier cannot report AS another supplier (owner ≠ scope → SCOPE_DENIED)', async () => {
    await expect(
      svc.dispatch(sup002, report({ supplierId: 'sup-005' })),
    ).rejects.toBeInstanceOf(DataError);
  });
});

// ─── The SubmissionSession causationId seam (adjudication ③) ───────────────────

describe('SubmissionSession causationId seam — anchor-correlationId grouping (SDC-3a)', () => {
  it('3 commands in one visit share ONE audit group (first correlationId), keeping their own ids', async () => {
    const session = openSubmissionSession('ss-live-1', 'sup-002', '2026-09-01T00:00:00.000Z');

    // Command 1 — the anchor. No causationId (a directly-initiated command).
    const c1 = await svc.dispatch(sup002, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: {
        publicationId: 'PUB-2026-08-RM-R2',
        planVersion: 'PV-2026-08.2',
        materialCode: 'RM-EMUL-3310',
        periodBucket: '2026-08',
        supplierId: 'sup-002',
        confirmedQty: 6000,
      },
    });
    session.attempt('RequirementResponse', c1.entityId!, c1.correlationId);
    const anchor = session.causationAnchor();
    expect(anchor).toBe(c1.correlationId);

    // Commands 2 + 3 pass the anchor as causationId.
    const c2 = await svc.dispatch(sup002, declare(), anchor!);
    session.attempt('InventoryDeclaration', c2.entityId!, c2.correlationId);
    const c3 = await svc.dispatch(sup002, report(), anchor!);
    session.attempt('IncomingShipment', c3.entityId!, c3.correlationId);

    // Each command kept its OWN correlationId (getCommandStatus stays 1:1)…
    expect(new Set([c1.correlationId, c2.correlationId, c3.correlationId]).size).toBe(3);

    // …yet the two later commands' events are grouped to the anchor via causationId,
    // and the anchor's own event has NO causation (DR-10, exactly cascades' shape).
    const ev1 = commandAuditSink.byEvent('t_requirementresponse_submit').find((e) => e.correlationId === c1.correlationId)!;
    const ev2 = commandAuditSink.byEvent('t_inventorydeclaration_declare').find((e) => e.correlationId === c2.correlationId)!;
    const ev3 = commandAuditSink.byEvent('t_incomingshipment_report').find((e) => e.correlationId === c3.correlationId)!;
    expect(ev1.causationId).toBeUndefined();
    expect(ev2.causationId).toBe(anchor);
    expect(ev3.causationId).toBe(anchor);

    // The envelope's audit anchor IS that same id — one id by construction.
    expect(session.envelope().auditCorrelationId).toBe(anchor);
  });
});
