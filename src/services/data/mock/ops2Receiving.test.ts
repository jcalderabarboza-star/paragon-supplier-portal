// ────────────────────────────────────────────────────────────────────────────
// OPS-2 · RECEIVING — an approval names a person, Compliance rules whether halal
// and BPOM apply, and a receipt that exists can be worked to its end.
//
// Everything is driven through `MockCommandService.dispatch` against the seeded
// stores. Populations are derived from the stores, the flows and the material
// master; where a claim is about a value, a named member is pinned.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { mockDataService } from './mockDataService';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { materialRulingStore } from './stores/materialRulingStore';
import { DataError } from '../types';
import type { QueryScope, InspectionResult, GoodsReceipt } from '../types';
import { PERSONA_SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { getFlow, userVerbsFrom } from '../../transitions';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { NO_PERSON } from '../../../context/noPerson';
import { DECLARED_PRESENT } from '../fixturePresent';
import type { ActorAttribution } from '../../../lib/enforcement';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { MATERIAL_GROUPS } from '../../sdc/materialGroups';
import { halalOf } from '../../sdc/halal';
import { bpomOf } from '../../sdc/bpom';
import {
  bpomAtReceipt,
  halalAtReceipt,
  materialApplicabilityRows,
  rulingHistory,
  rulingInForce,
} from '../../sdc/materialRuling';
import { verifyHalalAtReceipt } from '../halalVerification';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';
import { mockGoodsReceipts } from '../../../data/mockGoodsReceipts';
import { mockShipments } from '../../../data/mockShipments';

const svc = new MockCommandService();

/** A roster member holding `role`, as an actor — read off the roster, never spelled. */
const personWith = (role: string, nth = 0): ActorAttribution => {
  const p = SAMPLE_PEOPLE.filter((x) => x.role === role)[nth];
  if (!p) throw new Error(`no sample person #${nth} with role ${role}`);
  return { kind: 'RESOLVED', person: { personId: p.personId } };
};
const FINANCE = personWith('finance');
const EVERY_ROLE = personWith('buyer_all');
const COMPLIANCE = personWith('compliance');

const seat = (roles: readonly string[], actor?: QueryScope['actor']): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles as QueryScope['businessRoles'],
  ...(actor ? { actor } : {}),
});
const buyer = (actor?: QueryScope['actor']) => seat(PERSONA_SYSTEM_ROLES.buyer, actor);
const supplier: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

const fire = (
  scope: QueryScope,
  entity: string,
  transitionId: string,
  entityId?: string,
  payload?: Record<string, unknown>,
) => svc.dispatch(scope, { transitionId, entity, entityId, payload });

beforeEach(() => {
  goodsReceiptStore.reset();
  invoiceStore.reset();
  materialRulingStore.reset();
});

// ═══ 1 · AN APPROVAL NAMES A PERSON ══════════════════════════════════════════

describe('OPS-2 · an invoice approval names a person', () => {
  /**
   * A Matched invoice, reached the way the portal reaches one: the seeded
   * approved receipt on PO-2025-00104 is posted and settled, and the match
   * cascade takes the Submitted invoice on that order. Nothing is written by hand.
   */
  const matchedId = async (): Promise<string> => {
    const receipt = goodsReceiptStore.all().find((g) => g.grNumber === 'GR-2026-012')!;
    const posted = await fire(buyer(), 'goodsReceipt', 't_gr_post', receipt.id);
    expect(posted.status, posted.reason).toBe('submitted');
    await svc.settle(buyer(), posted.correlationId);
    const inv = invoiceStore.all().find((i) => i.status === 'Matched');
    expect(inv, 'posting GR-2026-012 matches an invoice').toBeDefined();
    return inv!.id;
  };
  /** The seeded invoices that are Approved and name nobody. */
  const unnamedApproved = () =>
    invoiceStore.all().filter((i) => i.status === 'Approved' && i.approvedBy?.kind !== 'RESOLVED');

  it('the population is real — the seed holds Approved invoices with no named approver, by name', () => {
    expect(unnamedApproved().map((i) => i.invoiceNumber).sort()).toEqual([
      'INV-2025-EVO-0188',
      'INV-2025-GIV-0892',
    ]);
  });

  it.each([
    ['a seat that says it names nobody', NO_PERSON as QueryScope['actor']],
    ['a seat that carries no actor at all', undefined],
  ])('approval is refused by name for %s, and the invoice stays Matched', async (_label, actor) => {
    const id = await matchedId();
    const res = await fire(buyer(actor), 'invoice', 't_invoice_approve', id);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.INVOICE_APPROVER_NAMED)).toBe(true);
    expect(res.reason).toContain('INVOICE_APPROVER_UNATTRIBUTED:');
    expect(invoiceStore.get(id)!.status).toBe('Matched');
    expect(invoiceStore.get(id)!.approvedBy).toBeUndefined();
  });

  it('KNOWN-GOOD — a named person approves, and is recorded', async () => {
    const id = await matchedId();
    const res = await fire(buyer(FINANCE), 'invoice', 't_invoice_approve', id);
    expect(res.status, res.reason).toBe('done');
    expect(invoiceStore.get(id)!.status).toBe('Approved');
    expect(invoiceStore.get(id)!.approvedBy).toEqual(FINANCE);
  });

  it('a seeded approval that names nobody does not release money — whoever asks', async () => {
    for (const inv of unnamedApproved()) {
      for (const actor of [EVERY_ROLE, FINANCE, NO_PERSON as QueryScope['actor']]) {
        const res = await fire(buyer(actor), 'invoice', 't_invoice_release_payment', inv.id);
        expect(res.status, inv.invoiceNumber).toBe('failed');
        expect(res.reason, inv.invoiceNumber).toContain('INVOICE_APPROVAL_UNNAMED:');
      }
      expect(invoiceStore.get(inv.id)!.status).toBe('Approved');
    }
  });

  it('approve-again puts a name to it; then a DIFFERENT named person releases, and the same one does not', async () => {
    const inv = unnamedApproved()[0];
    const again = await fire(buyer(FINANCE), 'invoice', 't_invoice_reapprove', inv.id);
    expect(again.status, again.reason).toBe('done');
    expect(invoiceStore.get(inv.id)!.status).toBe('Approved');
    expect(invoiceStore.get(inv.id)!.approvedBy).toEqual(FINANCE);

    const same = await fire(buyer(FINANCE), 'invoice', 't_invoice_release_payment', inv.id);
    expect(same.status).toBe('failed');
    expect(same.reason).toContain('INVOICE_RELEASER_IS_APPROVER:');

    const other = await fire(buyer(EVERY_ROLE), 'invoice', 't_invoice_release_payment', inv.id);
    expect(other.status, other.reason).toBe('submitted');
    expect(invoiceStore.get(inv.id)!.releasedBy).toEqual(EVERY_ROLE);
  });

  it('approve-again is refused for a seat that names nobody, and on an approval that already names somebody', async () => {
    const inv = unnamedApproved()[0];
    const unnamed = await fire(buyer(NO_PERSON), 'invoice', 't_invoice_reapprove', inv.id);
    expect(unnamed.status).toBe('failed');
    expect(unnamed.reason).toContain('INVOICE_APPROVER_UNATTRIBUTED:');
    expect(invoiceStore.get(inv.id)!.approvedBy).toBeUndefined();

    expect((await fire(buyer(FINANCE), 'invoice', 't_invoice_reapprove', inv.id)).status).toBe('done');
    const second = await fire(buyer(EVERY_ROLE), 'invoice', 't_invoice_reapprove', inv.id);
    expect(second.status).toBe('failed');
    expect(refusedByPolicy(second.reason, POLICY_HOOKS.INVOICE_REAPPROVAL_OWED)).toBe(true);
    expect(second.reason).toContain('INVOICE_ALREADY_APPROVED:');
    expect(invoiceStore.get(inv.id)!.approvedBy).toEqual(FINANCE);
  });

  it('approve-again is legal from Approved only, and holds the approve atom', () => {
    const t = getFlow('invoice')!.transitions.find((x) => x.id === 't_invoice_reapprove')!;
    expect(t.from).toEqual(['Approved']);
    expect(t.statePreserving).toBe(true);
    expect(t.requiredRole).toBe('invoice:approve');
  });
});

// ═══ 2 · COMPLIANCE RULES WHETHER HALAL AND BPOM APPLY ═══════════════════════

describe('OPS-2 · material applicability — the default, the ruling and the ledger', () => {
  const PACKAGING_AXES = new Set(['packaging-substrate', 'packaging-function']);
  const packagingGroups = new Set(
    MATERIAL_GROUPS.filter((g) => PACKAGING_AXES.has(g.axis)).map((g) => g.group),
  );
  const packaging = Object.keys(MATERIAL_MASTER).filter((c) =>
    packagingGroups.has(MATERIAL_MASTER[c].materialGroup),
  );
  const bpomPending = Object.keys(MATERIAL_MASTER).filter((c) => {
    const o = bpomOf(c);
    return !o.ok && o.reason === 'UNDETERMINED_APPLICABILITY';
  });
  const rule = (scope: QueryScope, code: string, payload: Record<string, unknown>) =>
    fire(scope, 'materialRuling', 't_material_ruling_set', code, payload);
  const compliance = buyer(COMPLIANCE);

  it('the populations are real — known members in, known members out', () => {
    expect(packaging).toContain('PK-PETB-8801');
    expect(packaging).not.toContain('AI-NIAC-6601');
    expect(bpomPending).toContain('RM-COCO-8200');
    expect(bpomPending).not.toContain('AI-NIAC-6601');
    expect(bpomPending).not.toContain('PK-PETB-8801');
  });

  it('halal applies to every packaging material by default — none is refused', () => {
    for (const code of packaging) {
      expect(halalOf(code), code).toEqual({ ok: true, required: true });
      expect(halalAtReceipt(code, []), code).toEqual({ ok: true, required: true, ruling: null });
    }
  });

  it('a raw material with no BPOM ruling is pending, and every pending material is a raw material', () => {
    for (const code of bpomPending) {
      expect(bpomAtReceipt(code, []), code).toEqual({
        ok: false,
        reason: 'UNDETERMINED_APPLICABILITY',
        materialCode: code,
      });
      expect(packagingGroups.has(MATERIAL_MASTER[code].materialGroup), code).toBe(false);
    }
  });

  it('a Compliance ruling answers a pending material, under the name of who ruled', async () => {
    const code = 'RM-COCO-8200';
    const res = await rule(compliance, code, {
      regime: 'bpom',
      applicable: false,
      reason: 'Oleochemical feedstock; not a notifiable cosmetic ingredient lot.',
    });
    expect(res.status, res.reason).toBe('done');
    const ledger = materialRulingStore.all();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      materialCode: code,
      regime: 'bpom',
      applicable: false,
      reason: 'Oleochemical feedstock; not a notifiable cosmetic ingredient lot.',
      setBy: COMPLIANCE,
      seq: 1,
    });
    expect(bpomAtReceipt(code, ledger)).toEqual({ ok: true, applicable: false, ruling: ledger[0] });
    // The other regime, and every other material, is untouched.
    expect(halalAtReceipt(code, ledger)).toEqual({ ok: true, required: true, ruling: null });
    expect(bpomAtReceipt('RM-STEAR-7300', ledger).ok).toBe(false);
  });

  it('the reason is stored as written, without the spaces around it', async () => {
    await rule(compliance, 'PK-CART-9901', { regime: 'halal', applicable: false, reason: '   Secondary carton.  ' });
    expect(materialRulingStore.all()[0].reason).toBe('Secondary carton.');
  });

  it('a ruling never answers for a code the master does not hold — not even a row put on the ledger by hand', () => {
    // The verb refuses a ruling on an unknown code, so none can exist. The read
    // does not rely on that: handed one anyway, it still refuses.
    const forged = (regime: 'halal' | 'bpom') => ({
      materialCode: 'PK-NOT-A-CODE',
      regime,
      applicable: false,
      reason: 'forged',
      setBy: COMPLIANCE,
      setAt: '2026-08-31T00:00:00.000Z',
      seq: 1,
    });
    expect(halalAtReceipt('PK-NOT-A-CODE', [forged('halal')])).toEqual({
      ok: false,
      reason: 'UNKNOWN_MATERIAL',
      materialCode: 'PK-NOT-A-CODE',
    });
    expect(bpomAtReceipt('PK-NOT-A-CODE', [forged('bpom')])).toEqual({
      ok: false,
      reason: 'UNKNOWN_MATERIAL',
      materialCode: 'PK-NOT-A-CODE',
    });
  });

  it('a ruling under one regime, or for one material, answers for nothing else', async () => {
    await rule(compliance, 'RM-COCO-8200', { regime: 'halal', applicable: false, reason: 'x' });
    const ledger = materialRulingStore.all();
    // …BPOM for the same material is still pending,
    expect(bpomAtReceipt('RM-COCO-8200', ledger).ok).toBe(false);
    expect(rulingInForce(ledger, 'RM-COCO-8200', 'bpom')).toBeNull();
    // …and halal for another material is still the master's answer.
    expect(halalAtReceipt('RM-STEAR-7300', ledger)).toEqual({ ok: true, required: true, ruling: null });
    expect(rulingInForce(ledger, 'RM-STEAR-7300', 'halal')).toBeNull();
  });

  it('a ruling is reversible: the later one is in force and the earlier one stays on the ledger', async () => {
    const code = 'PK-CART-9901';
    expect(
      (await rule(compliance, code, { regime: 'halal', applicable: false, reason: 'Secondary carton.' })).status,
    ).toBe('done');
    expect(halalAtReceipt(code, materialRulingStore.all())).toMatchObject({ ok: true, required: false });
    expect(
      (await rule(compliance, code, { regime: 'halal', applicable: true, reason: 'Coated board; reviewed.' })).status,
    ).toBe('done');
    const ledger = materialRulingStore.all();
    expect(rulingInForce(ledger, code, 'halal')).toMatchObject({ applicable: true, seq: 2 });
    expect(rulingHistory(ledger, code, 'halal').map((r) => r.applicable)).toEqual([true, false]);
    expect(halalAtReceipt(code, ledger)).toMatchObject({ ok: true, required: true });
  });

  it.each([
    ['RULING_REGIME_UNKNOWN', { regime: 'iso', applicable: true, reason: 'x' }],
    ['RULING_MALFORMED', { regime: 'halal', applicable: 'yes', reason: 'x' }],
    ['RULING_REASON_BLANK', { regime: 'halal', applicable: false, reason: '   ' }],
  ])('%s — a malformed ruling is refused by name and nothing is recorded', async (head, payload) => {
    const res = await rule(compliance, 'PK-CART-9901', payload);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.MATERIAL_RULING_GOVERNED)).toBe(true);
    expect(res.reason).toContain(`${head}:`);
    expect(materialRulingStore.all()).toHaveLength(0);
  });

  it('RULING_UNCHANGED — the same answer twice is refused; the FIRST ruling on a default is not', async () => {
    const first = await rule(compliance, 'PK-CART-9901', { regime: 'halal', applicable: true, reason: 'Confirmed.' });
    expect(first.status, first.reason).toBe('done');
    const again = await rule(compliance, 'PK-CART-9901', { regime: 'halal', applicable: true, reason: 'Again.' });
    expect(again.status).toBe('failed');
    expect(again.reason).toContain('RULING_UNCHANGED:');
    expect(materialRulingStore.all()).toHaveLength(1);
  });

  it.each([
    ['a seat that says it names nobody', NO_PERSON as QueryScope['actor']],
    ['a seat that carries no actor at all', undefined],
  ])('RULING_ACTOR_UNATTRIBUTED — %s cannot rule', async (_label, actor) => {
    const res = await rule(buyer(actor), 'PK-CART-9901', { regime: 'halal', applicable: false, reason: 'x' });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('RULING_ACTOR_UNATTRIBUTED:');
    expect(materialRulingStore.all()).toHaveLength(0);
  });

  it('only the lane holding `material:rule` rules — and receiving is not it', async () => {
    expect(rolesHolding('material:rule')).toContain('compliance');
    expect(rolesHolding('material:rule')).not.toContain('receiving');
    const res = await rule(seat(['receiving'], personWith('receiving')), 'PK-CART-9901', {
      regime: 'halal',
      applicable: false,
      reason: 'x',
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ROLE_NOT_PERMITTED');
    // KNOWN-GOOD — the same ruling from a compliance-only seat is taken.
    const good = await rule(seat(['compliance'], COMPLIANCE), 'PK-CART-9901', {
      regime: 'halal',
      applicable: false,
      reason: 'x',
    });
    expect(good.status, good.reason).toBe('done');
  });

  it('a material the master does not hold cannot be ruled on, and a supplier cannot rule at all', async () => {
    await expect(
      rule(compliance, 'PK-NOT-A-CODE', { regime: 'halal', applicable: false, reason: 'x' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // A supplier is turned away — by a refusal or a thrown scope error, never taken.
    const sup = await rule(supplier, 'PK-CART-9901', { regime: 'halal', applicable: false, reason: 'x' }).then(
      (r) => r.status,
      (e: unknown) => (e instanceof DataError ? 'failed' : 'threw-other'),
    );
    expect(sup).toBe('failed');
    expect(materialRulingStore.all()).toHaveLength(0);
  });

  it('a payload cannot name who ruled', async () => {
    const res = await rule(compliance, 'PK-CART-9901', {
      regime: 'halal',
      applicable: false,
      reason: 'x',
      setBy: EVERY_ROLE,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ACTOR_IN_PAYLOAD');
  });

  it('the read is the ledger for a buyer and refused for a supplier', async () => {
    await rule(compliance, 'PK-CART-9901', { regime: 'halal', applicable: false, reason: 'Secondary carton.' });
    const page = await mockDataService.risk.getMaterialRulings(buyer());
    expect(page.items).toEqual(materialRulingStore.all());
    await expect(mockDataService.risk.getMaterialRulings(supplier)).rejects.toBeInstanceOf(DataError);
    await expect(mockDataService.risk.getMaterialRulings(supplier)).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });

  it('the Compliance rows cover the whole master, and say pending exactly where BPOM is pending', () => {
    const rows = materialApplicabilityRows([]);
    expect(rows.map((r) => r.materialCode)).toEqual(Object.keys(MATERIAL_MASTER));
    expect(rows.filter((r) => !r.bpom.ok).map((r) => r.materialCode).sort()).toEqual([...bpomPending].sort());
    expect(rows.every((r) => r.halal.ok)).toBe(true);
  });

  it('every packaging line the seeded receipts and shipments name has a SAMPLE halal certificate on file', () => {
    const pairs = new Map<string, { supplierId: string; code: string }>();
    for (const g of mockGoodsReceipts)
      for (const r of g.inspectionResults) pairs.set(`${g.supplierId}|${r.materialCode}`, { supplierId: g.supplierId, code: r.materialCode });
    for (const s of mockShipments)
      for (const l of s.lineItems) pairs.set(`${s.supplierId}|${l.materialCode}`, { supplierId: s.supplierId, code: l.materialCode });
    const packagingPairs = [...pairs.values()].filter((p) => packaging.includes(p.code));
    expect(packagingPairs.map((p) => `${p.supplierId}|${p.code}`)).toContain('sup-007|PK-PETB-8801');
    for (const p of packagingPairs) {
      const v = verifyHalalAtReceipt(p.supplierId, p.code, COMPLIANCE_REGISTRY, `${DECLARED_PRESENT}T00:00:00.000Z`);
      expect(v.verdict, `${p.supplierId} × ${p.code}`).toBe('SATISFIED');
      if (v.verdict === 'SATISFIED') expect(v.certNumber.startsWith('SAMPLE-'), v.certNumber).toBe(true);
    }
    // KNOWN-BAD — the same instrument convicts a pair with no certificate.
    expect(
      verifyHalalAtReceipt('sup-001', 'PK-PETB-8801', COMPLIANCE_REGISTRY, `${DECLARED_PRESENT}T00:00:00.000Z`).verdict,
    ).toBe('NOT_SATISFIED');
  });
});

// ═══ 3 · A RECEIPT THAT EXISTS CAN BE WORKED TO ITS END ══════════════════════

describe('OPS-2 · an existing receipt is inspected, held, retested and finished', () => {
  const receiving = buyer();
  const byNumber = (grNumber: string): GoodsReceipt => {
    const gr = goodsReceiptStore.all().find((g) => g.grNumber === grNumber);
    expect(gr, grNumber).toBeDefined();
    return gr!;
  };
  /** The receipt's own lines, inspected: everything received is accepted. A
   *  seeded `Pending` on a regulatory check is not an answer, so it is dropped —
   *  as the receiving form does. */
  const clean = (gr: GoodsReceipt): InspectionResult[] =>
    gr.inspectionResults.map((r) => ({
      ...r,
      qtyAccepted: r.qtyReceived,
      qtyRejected: 0,
      rejectionReason: undefined,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
      halalSealCheck: r.halalSealCheck === 'Pass' || r.halalSealCheck === 'Fail' ? r.halalSealCheck : undefined,
      bpomLotCheck: r.bpomLotCheck === 'Pass' || r.bpomLotCheck === 'Fail' ? r.bpomLotCheck : undefined,
    }));
  const gr = (id: string, verb: string, payload?: Record<string, unknown>) =>
    fire(receiving, 'goodsReceipt', verb, id, payload);

  it('GR-2026-002 — pending, never inspected — is inspected, approved and posted; no second receipt is made', async () => {
    const before = goodsReceiptStore.all().length;
    const r = byNumber('GR-2026-002');
    expect(r.status).toBe('Pending Inspection');
    expect((await gr(r.id, 't_gr_start_inspection')).status).toBe('done');
    const recorded = await gr(r.id, 't_gr_record_inspection', { inspectionResults: clean(r) });
    expect(recorded.status, recorded.reason).toBe('done');
    expect(goodsReceiptStore.get(r.id)!.status).toBe('Under Inspection');
    expect(goodsReceiptStore.get(r.id)!.inspectionResults[0]).toMatchObject({
      materialCode: 'PK-PETB-8801',
      qtyReceived: 120000,
      qtyAccepted: 120000,
      qtyRejected: 0,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
    });
    const approved = await gr(r.id, 't_gr_approve');
    expect(approved.status, approved.reason).toBe('done');
    const posted = await gr(r.id, 't_gr_post');
    expect(posted.status, posted.reason).toBe('submitted');
    await svc.settle(receiving, posted.correlationId);
    expect(goodsReceiptStore.get(r.id)!.status).toBe('Posted to SAP');
    expect(goodsReceiptStore.get(r.id)!.sapMaterialDoc).toBeTruthy();
    expect(goodsReceiptStore.all()).toHaveLength(before);
  });

  it('a regulatory check that is recorded reaches the receipt; one that is not owed stays absent', async () => {
    const r = byNumber('GR-2026-002');
    await gr(r.id, 't_gr_start_inspection');
    const lines = clean(r).map((l) => ({ ...l, halalSealCheck: 'Pass' as const }));
    expect((await gr(r.id, 't_gr_record_inspection', { inspectionResults: lines })).status).toBe('done');
    const stored = goodsReceiptStore.get(r.id)!.inspectionResults[0];
    expect(stored.halalSealCheck).toBe('Pass');
    // The seeded placeholder is gone: nobody answered a BPOM lot check, and none was owed.
    expect(r.inspectionResults[0].bpomLotCheck).toBe('Pending');
    expect(stored.bpomLotCheck).toBeUndefined();
  });

  it('without recorded results the same receipt cannot be approved — the lines are still pending', async () => {
    const r = byNumber('GR-2026-002');
    await gr(r.id, 't_gr_start_inspection');
    const approved = await gr(r.id, 't_gr_approve');
    expect(approved.status).toBe('failed');
    expect(refusedByPolicy(approved.reason, POLICY_HOOKS.GR_ROLLUP_APPROVED)).toBe(true);
  });

  it('results are recorded Under Inspection only, and as often as needed until a decision is taken', async () => {
    const r = byNumber('GR-2026-002');
    const early = await gr(r.id, 't_gr_record_inspection', { inspectionResults: clean(r) });
    expect(early.status).toBe('failed');
    expect(early.reason).toContain('ILLEGAL_TRANSITION');
    await gr(r.id, 't_gr_start_inspection');
    expect((await gr(r.id, 't_gr_record_inspection', { inspectionResults: clean(r) })).status).toBe('done');
    const short = clean(r).map((l) => ({ ...l, qtyAccepted: l.qtyReceived - 500, qtyRejected: 500, rejectionReason: 'Crushed in transit' }));
    expect((await gr(r.id, 't_gr_record_inspection', { inspectionResults: short })).status).toBe('done');
    expect(goodsReceiptStore.get(r.id)!.inspectionResults[0]).toMatchObject({ qtyRejected: 500, rejectionReason: 'Crushed in transit' });
    // The rollup now names partial approval, not approval.
    expect((await gr(r.id, 't_gr_approve')).status).toBe('failed');
    expect((await gr(r.id, 't_gr_partial_approve')).status).toBe('done');
    const late = await gr(r.id, 't_gr_record_inspection', { inspectionResults: clean(r) });
    expect(late.status).toBe('failed');
    expect(late.reason).toContain('ILLEGAL_TRANSITION');
  });

  it('the lines are written by the record verb ONLY — never by another verb that carries the same key', async () => {
    const r = byNumber('GR-2026-008');
    const forged = clean(r).map((l) => ({ ...l, qtyAccepted: 1, qtyRejected: l.qtyReceived - 1, rejectionReason: 'forged' }));
    // A hold whose payload ALSO carries lines: the hold is taken, the lines are not.
    const held = await gr(r.id, 't_gr_hold', { holdReason: 'Lab to confirm.', inspectionResults: forged });
    expect(held.status, held.reason).toBe('done');
    expect(goodsReceiptStore.get(r.id)!.status).toBe('Quality Hold');
    expect(goodsReceiptStore.get(r.id)!.inspectionResults).toEqual(r.inspectionResults);
  });

  it('what the receipt already knows about a line is not rewritten by an inspection', async () => {
    const r = byNumber('GR-2026-002');
    await gr(r.id, 't_gr_start_inspection');
    const forged = clean(r).map((l) => ({ ...l, description: 'Something else', qtyExpected: 1 }));
    expect((await gr(r.id, 't_gr_record_inspection', { inspectionResults: forged })).status).toBe('done');
    const line = goodsReceiptStore.get(r.id)!.inspectionResults[0];
    expect(line.description).toBe(r.inspectionResults[0].description);
    expect(line.qtyExpected).toBe(r.inspectionResults[0].qtyExpected);
  });

  describe('the recorded-inspection gate — five refusals, each by name, each leaving the lines untouched', () => {
    const cases: [string, (lines: InspectionResult[]) => unknown][] = [
      ['RESULTS_MALFORMED', () => []],
      ['RESULTS_MALFORMED', () => 'not a list'],
      ['RESULTS_NOT_THIS_RECEIPT', (l) => [{ ...l[0], materialCode: 'AI-NIAC-6601' }]],
      ['RESULTS_NOT_THIS_RECEIPT', (l) => [...l, l[0]]],
      ['RESULTS_QUANTITY_INVALID', (l) => [{ ...l[0], qtyAccepted: l[0].qtyReceived + 1 }]],
      ['RESULTS_QUANTITY_INVALID', (l) => [{ ...l[0], qtyAccepted: -1, qtyRejected: l[0].qtyReceived + 1 }]],
      ['RESULTS_QUANTITY_INVALID', (l) => [{ ...l[0], qtyReceived: Number.NaN }]],
      ['RESULTS_CHECK_UNANSWERED', (l) => [{ ...l[0], visualCheck: 'Pending' }]],
      ['RESULTS_CHECK_UNANSWERED', (l) => [{ ...l[0], packagingCheck: undefined }]],
      // A regulatory check may be absent; recorded, it is Pass or Fail.
      ['RESULTS_CHECK_UNANSWERED', (l) => [{ ...l[0], halalSealCheck: 'Pending' }]],
      ['RESULTS_CHECK_UNANSWERED', (l) => [{ ...l[0], bpomLotCheck: 'Pending' }]],
      ['RESULTS_REJECTION_UNEXPLAINED', (l) => [{ ...l[0], qtyAccepted: l[0].qtyReceived - 10, qtyRejected: 10, rejectionReason: '  ' }]],
    ];
    it.each(cases)('%s', async (head, build) => {
      const r = byNumber('GR-2026-002');
      await gr(r.id, 't_gr_start_inspection');
      const res = await gr(r.id, 't_gr_record_inspection', { inspectionResults: build(clean(r)) });
      expect(res.status).toBe('failed');
      // An empty list is "missing" to the dispatcher before the hook is asked.
      if (res.reason?.startsWith('MISSING_FIELDS')) {
        expect(head).toBe('RESULTS_MALFORMED');
      } else {
        expect(refusedByPolicy(res.reason, POLICY_HOOKS.GR_RESULTS_MATCH_RECEIPT)).toBe(true);
        expect(res.reason).toContain(`${head}:`);
      }
      expect(goodsReceiptStore.get(r.id)!.inspectionResults).toEqual(r.inspectionResults);
    });
  });

  it('GR-2026-008 — under inspection — is placed on hold with a reason, retested, and then decided', async () => {
    const r = byNumber('GR-2026-008');
    expect(r.status).toBe('Under Inspection');
    expect((await gr(r.id, 't_gr_record_inspection', { inspectionResults: clean(r) })).status).toBe('done');
    const noReason = await gr(r.id, 't_gr_hold');
    expect(noReason.status).toBe('failed');
    expect(noReason.reason).toContain('MISSING_FIELDS');
    expect((await gr(r.id, 't_gr_hold', { holdReason: 'Print registration off; lab to confirm.' })).status).toBe('done');
    expect(goodsReceiptStore.get(r.id)!.status).toBe('Quality Hold');
    expect(goodsReceiptStore.get(r.id)!.notes).toBe('Print registration off; lab to confirm.');
    // The recorded lines survive the hold.
    expect(goodsReceiptStore.get(r.id)!.inspectionResults[0].qtyAccepted).toBe(r.inspectionResults[0].qtyReceived);
    expect((await gr(r.id, 't_gr_request_retest')).status).toBe('done');
    expect(goodsReceiptStore.get(r.id)!.status).toBe('Under Inspection');
    expect((await gr(r.id, 't_gr_approve')).status).toBe('done');
  });

  it('GR-2026-007 — seeded on Quality Hold — is retested and finished as a rejection', async () => {
    const r = byNumber('GR-2026-007');
    expect(r.status).toBe('Quality Hold');
    expect((await gr(r.id, 't_gr_request_retest')).status).toBe('done');
    const rejected = r.inspectionResults.map((l) => ({
      ...l,
      qtyAccepted: 0,
      qtyRejected: l.qtyReceived,
      rejectionReason: 'Retest confirmed contamination',
      visualCheck: 'Fail' as const,
      packagingCheck: 'Pass' as const,
    }));
    expect((await gr(r.id, 't_gr_record_inspection', { inspectionResults: rejected })).status).toBe('done');
    const res = await gr(r.id, 't_gr_reject', { dispositionReason: 'Retest confirmed contamination' });
    expect(res.status, res.reason).toBe('done');
    expect(goodsReceiptStore.get(r.id)!.status).toBe('Rejected');
  });

  it('no dead end — every state a receipt can rest in short of a terminal has a way out a person can take', () => {
    const flow = getFlow('goodsReceipt')!;
    // `Posting to SAP` is the SAP boundary's interim: its exit is the settlement
    // edge (`settlesTo`), which is not a person's verb. Derived, not listed.
    const settling = new Set(flow.transitions.filter((t) => t.settlesTo).map((t) => t.to));
    const resting = flow.states.filter((s) => !flow.terminals.includes(s) && !settling.has(s));
    expect(resting).toContain('Under Inspection');
    expect(resting).toContain('Quality Hold');
    for (const state of resting) {
      expect(userVerbsFrom('goodsReceipt', state).length, state).toBeGreaterThan(0);
    }
    // And the seed has a receipt in each of them, so each is a state a reader meets.
    for (const state of resting) {
      expect(goodsReceiptStore.all().some((g) => g.status === state), state).toBe(true);
    }
  });

  it('the new verb is a part of the inspection wizard, moves nothing, and is the inspector’s', () => {
    const t = getFlow('goodsReceipt')!.transitions.find((x) => x.id === 't_gr_record_inspection')!;
    expect(t.from).toEqual(['Under Inspection']);
    expect(t.to).toBe('Under Inspection');
    expect(t.statePreserving).toBe(true);
    expect(t.requiredRole).toBe('gr:inspect');
  });
});
