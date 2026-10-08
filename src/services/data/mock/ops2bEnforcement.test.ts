// ─────────────────────────────────────────────────────────────────────────────
// OPS-2b — the operator's rulings on OPS-2, at the service.
//
//   1. SAMPLE halal certificates for the raw-material suppliers' open pairs,
//      with exactly ONE open pair left without one.
//   2. ONE CLOCK — the dispatcher judges a certificate at the declared present.
//   3. SAMPLE BPOM rulings for ten of the eleven raw materials; one left pending.
//   5. The certificate, BPOM, seal and lot blocks are enforced in the dispatcher
//      on the two verbs that accept goods. A dispatch made by hand, with no form
//      in front of it, is refused by name.
//
// Every refusal below is reached through `svc.dispatch` — the shipped
// dispatcher, the shipped flow, the shipped hook — never by calling the hook.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { asnStore } from './stores/asnStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { materialRulingStore } from './stores/materialRulingStore';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import {
  BPOM_PENDING_SPECIMEN,
  SAMPLE_BPOM_RULED,
  sampleMaterialRulings,
} from './materialRulingSeed';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';
import type { ASN, GoodsReceipt, InspectionResult, QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { getFlow } from '../../transitions';
import { SAMPLE_PEOPLE, resolveSamplePerson } from '../../identity/sampleRoster';
import { NO_PERSON } from '../../../context/noPerson';
import { DECLARED_PRESENT, DECLARED_PRESENT_INSTANT } from '../fixturePresent';
import { BPJPH_MANDATE_DATE } from '../complianceProjection';
import type { ActorAttribution, EnforcementSetting } from '../../../lib/enforcement';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { bpomOf } from '../../sdc/bpom';
import { bpomAtReceipt } from '../../sdc/materialRuling';
import { verifyHalalAtReceipt } from '../halalVerification';
import {
  RECEIPT_BLOCK_KINDS,
  checkAnswered,
  receiptComplianceBlocks,
} from '../receiptCompliance';
import { mockShipments } from '../../../data/mockShipments';
import { usePinnedDemoClock } from '../../../test/demoClock';

const svc = new MockCommandService();

const personWith = (role: string): ActorAttribution => {
  const p = SAMPLE_PEOPLE.find((x) => x.role === role);
  if (!p) throw new Error(`no sample person with role ${role}`);
  return { kind: 'RESOLVED', person: { personId: p.personId } };
};
const buyer = (actor: QueryScope['actor'] = NO_PERSON): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor,
});
const fire = (transitionId: string, entityId?: string, payload?: Record<string, unknown>) =>
  svc.dispatch(buyer(), { transitionId, entity: 'goodsReceipt', entityId, payload });
const byNumber = (grNumber: string): GoodsReceipt =>
  goodsReceiptStore.all().find((g) => g.grNumber === grNumber)!;

/** One inspected line, accepted in full, both regulatory checks answered. */
const line = (materialCode: string, over: Partial<InspectionResult> = {}): InspectionResult => ({
  materialCode,
  description: materialCode,
  qtyExpected: 100,
  qtyReceived: 100,
  qtyAccepted: 100,
  qtyRejected: 0,
  visualCheck: 'Pass',
  packagingCheck: 'Pass',
  halalSealCheck: 'Pass',
  bpomLotCheck: 'Pass',
  ...over,
});

/** A submitted ASN from `supplierId` on `poReference` declaring `codes`. */
const asnOf = (asnNumber: string, supplierId: string, poReference: string, codes: string[]): ASN => ({
  asnNumber,
  supplierId,
  poReference,
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-OPS2B',
  eta: DECLARED_PRESENT,
  details: {
    originCity: 'Medan',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 5,
    grossWeightKg: 50,
    temperatureRequirement: 'Ambient',
  },
  lineItems: codes.map((materialCode) => ({
    materialCode,
    description: materialCode,
    orderedQty: 100,
    shippedQty: 100,
    lotNumber: 'LOT-OPS2B',
  })),
});

/** A receipt made BY HAND — no form — created with its lines and put Under Inspection. */
const receiveByHand = async (
  asnNumber: string,
  supplierId: string,
  poReference: string,
  lines: InspectionResult[],
): Promise<string> => {
  asnStore.add(asnOf(asnNumber, supplierId, poReference, lines.map((l) => l.materialCode)));
  const made = await fire('t_gr_create', undefined, {
    asnReference: asnNumber,
    receivedDate: DECLARED_PRESENT,
    receivedBy: 'QC Inspector',
    inspectionResults: lines,
  });
  expect(made.status, made.reason).toBe('done');
  expect((await fire('t_gr_start_inspection', made.entityId!)).status).toBe('done');
  return made.entityId!;
};

const refusedAs = (reason: string | undefined, head: string) => {
  expect(refusedByPolicy(reason, POLICY_HOOKS.GR_RECEIPT_COMPLIANT), reason).toBe(true);
  expect(reason).toContain(`${head}:`);
};

beforeEach(() => {
  goodsReceiptStore.reset();
  asnStore.reset();
  materialRulingStore.reset();
  enforcementSettingStore.reset();
});

// ── Ruling 1 — the sample certificates ───────────────────────────────────────

/** Every supplier × material pair that something still open names. */
const openPairs = (): string[] => {
  const seen = new Set<string>();
  for (const g of goodsReceiptStore.all()) {
    if (g.status === 'Posted to SAP' || g.status === 'Rejected') continue;
    for (const l of g.inspectionResults) seen.add(`${g.supplierId}|${l.materialCode}`);
  }
  for (const s of mockShipments) {
    if (s.status !== 'At Dock' && s.status !== 'Unloading') continue;
    for (const l of s.lineItems) seen.add(`${s.supplierId}|${l.materialCode}`);
  }
  for (const a of asnStore.all()) {
    if (a.status === 'Draft') continue;
    for (const l of a.lineItems) seen.add(`${a.supplierId}|${l.materialCode}`);
  }
  for (const p of purchaseOrderStore.all()) {
    if (p.status === 'Closed' || p.status === 'Delivered') continue;
    for (const l of p.lineItems) seen.add(`${p.supplierId}|${l.materialCode}`);
  }
  return [...seen].sort();
};
const uncertified = (pairs: string[]) =>
  pairs.filter((pair) => {
    const [supplierId, materialCode] = pair.split('|');
    return (
      verifyHalalAtReceipt(supplierId, materialCode, COMPLIANCE_REGISTRY, DECLARED_PRESENT_INSTANT)
        .verdict !== 'SATISFIED'
    );
  });

describe('OPS-2b · ruling 1 — SAMPLE certificates, and exactly one open pair left without', () => {
  it('the population is real — it holds the pairs the ruling names, from every kind of open document', () => {
    const pairs = openPairs();
    // PO-2025-00105, both lines — the order the ruling names.
    expect(pairs).toContain('sup-005|AI-NIAC-6601');
    expect(pairs).toContain('sup-005|AI-HYALU-6610');
    // A receipt, a dock shipment and a receivable ASN each contribute.
    expect(pairs).toContain('sup-001|RM-COCO-8200');
    expect(pairs).toContain('sup-007|AI-NIAC-6612');
    expect(pairs).toContain('sup-005|RM-EMUL-9440');
    // KNOWN-ABSENT — a pair nothing open names is not invented.
    expect(pairs).not.toContain('sup-011|RM-COCO-8200');
  });

  it('⚠️ EXACTLY ONE open pair has no valid halal certificate, and it is named', () => {
    expect(uncertified(openPairs())).toEqual(['sup-005|RM-EMUL-9440']);
    // It is the registry's expired foreign certificate, named — not an absence.
    expect(
      verifyHalalAtReceipt('sup-005', 'RM-EMUL-9440', COMPLIANCE_REGISTRY, DECLARED_PRESENT_INSTANT),
    ).toMatchObject({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
      certNumber: 'SAMPLE-HALAL-FRGN-0005C',
      expiryDate: '2025-08-01',
    });
    // And it is on a document receiving can open today: a receivable ASN.
    const asn = asnStore.get('ASN-2025-00302')!;
    expect(asn.status).toBe('Delivered');
    expect(asn.supplierId).toBe('sup-005');
    expect(asn.lineItems.map((l) => l.materialCode)).toEqual(['RM-EMUL-9440']);
  });

  it('the instrument can see an uncertified pair — without the OPS-2b rows it names the ones they cover', () => {
    // KNOWN-BAD, on the same derivation: read the registry as it stood before
    // this batch and the pairs the ruling was about come back.
    const before = COMPLIANCE_REGISTRY.filter((e) => Number(e.id.slice(5)) < 19);
    const lacking = openPairs().filter((pair) => {
      const [supplierId, materialCode] = pair.split('|');
      return verifyHalalAtReceipt(supplierId, materialCode, before, DECLARED_PRESENT_INSTANT).verdict !== 'SATISFIED';
    });
    expect(lacking).toContain('sup-005|AI-HYALU-6610');
    expect(lacking).toContain('sup-001|RM-COCO-8200');
    expect(lacking).toContain('sup-002|RM-STEAR-7300');
    expect(lacking.length).toBeGreaterThan(10);
  });

  it('every certificate the batch added says it is SAMPLE — in its number, its scope and its issuer', () => {
    const added = COMPLIANCE_REGISTRY.filter((e) => Number(e.id.slice(5)) >= 19);
    expect(added.map((e) => e.supplierId).sort()).toEqual([
      'sup-001', 'sup-002', 'sup-003', 'sup-004', 'sup-005', 'sup-006', 'sup-009', 'sup-010', 'sup-011',
    ]);
    for (const e of added) {
      expect(e.certNumber, e.id).toMatch(/^SAMPLE-HALAL-/);
      expect(e.scopeText, e.id).toMatch(/^SAMPLE — /);
      expect(e.issuer, e.id).toContain('(illustrative)');
      expect(e.notes, e.id).toContain('not a real certificate');
    }
    // No two rows in the registry share a certificate number.
    const numbers = COMPLIANCE_REGISTRY.map((e) => e.certNumber).filter(Boolean);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

// ── Ruling 3 — the sample BPOM rulings ───────────────────────────────────────

describe('OPS-2b · ruling 3 — ten raw materials carry a SAMPLE BPOM ruling, one is left pending', () => {
  const undetermined = Object.keys(MATERIAL_MASTER)
    .filter((c) => {
      const o = bpomOf(c);
      return !o.ok && o.reason === 'UNDETERMINED_APPLICABILITY';
    })
    .sort();

  it('⚠️ BILATERAL — what the master leaves undetermined is exactly the ten ruled plus the one left', () => {
    expect([...SAMPLE_BPOM_RULED, BPOM_PENDING_SPECIMEN].sort()).toEqual(undetermined);
    expect(SAMPLE_BPOM_RULED).not.toContain(BPOM_PENDING_SPECIMEN);
    expect(new Set(SAMPLE_BPOM_RULED).size).toBe(SAMPLE_BPOM_RULED.length);
  });

  it('the ledger opens on them: each applies, is attributed to a sample Compliance person, and says SAMPLE', () => {
    const ledger = materialRulingStore.all();
    expect(ledger.map((r) => r.materialCode)).toEqual([...SAMPLE_BPOM_RULED]);
    for (const r of ledger) {
      expect(r.regime).toBe('bpom');
      expect(r.applicable, r.materialCode).toBe(true);
      expect(r.reason).toMatch(/^SAMPLE ruling — /);
      expect(r.setBy.kind).toBe('RESOLVED');
      if (r.setBy.kind === 'RESOLVED') {
        // Roster membership, not a prefix: the id resolves to a Compliance person.
        expect(resolveSamplePerson(r.setBy.person.personId)?.role).toBe('compliance');
      }
      expect(Date.parse(r.setAt)).toBeLessThan(Date.parse(DECLARED_PRESENT_INSTANT));
      expect(bpomAtReceipt(r.materialCode, ledger)).toMatchObject({ ok: true, applicable: true });
    }
    expect(ledger.map((r) => r.seq)).toEqual(ledger.map((_, i) => i + 1));
  });

  it('the one left reads pending, and a ruling made now takes the next place on the ledger', async () => {
    expect(bpomAtReceipt(BPOM_PENDING_SPECIMEN, materialRulingStore.all())).toMatchObject({
      ok: false,
      reason: 'UNDETERMINED_APPLICABILITY',
    });
    const res = await svc.dispatch(buyer(personWith('compliance')), {
      transitionId: 't_material_ruling_set',
      entity: 'materialRuling',
      entityId: BPOM_PENDING_SPECIMEN,
      payload: { regime: 'bpom', applicable: true, reason: 'Ruled in a spec.' },
    });
    expect(res.status, res.reason).toBe('done');
    expect(materialRulingStore.all().slice(-1)[0]).toMatchObject({
      materialCode: BPOM_PENDING_SPECIMEN,
      seq: SAMPLE_BPOM_RULED.length + 1,
    });
  });

  it('reset returns the ledger to the sample rows and nothing a session added', async () => {
    materialRulingStore.append({ ...sampleMaterialRulings()[0], materialCode: 'PK-CART-9901', seq: 99 });
    materialRulingStore.reset();
    expect(materialRulingStore.all()).toEqual(sampleMaterialRulings());
    expect(materialRulingStore.nextSeq()).toBe(SAMPLE_BPOM_RULED.length + 1);
  });

  describe('a ruling is stamped at the declared present, whatever the wall clock says', () => {
    usePinnedDemoClock('2026-11-05T10:00:00.000Z');
    it('made five weeks after the declared present, it still carries the declared present', async () => {
      const res = await svc.dispatch(buyer(personWith('compliance')), {
        transitionId: 't_material_ruling_set',
        entity: 'materialRuling',
        entityId: 'PK-CART-9901',
        payload: { regime: 'halal', applicable: false, reason: 'Secondary carton.' },
      });
      expect(res.status, res.reason).toBe('done');
      expect(materialRulingStore.all().slice(-1)[0]!.setAt).toBe(DECLARED_PRESENT_INSTANT);
    });
  });
});

// ── Ruling 5 — the dispatcher refuses, by name ───────────────────────────────

describe('OPS-2b · ruling 5 — the two verbs that accept goods carry the gate, and only they do', () => {
  it('derived from the flow: approve and partial-approve, and no other verb', () => {
    const flow = getFlow('goodsReceipt')!;
    const carrying = flow.transitions
      .filter((t) => t.policyHooks.includes(POLICY_HOOKS.GR_RECEIPT_COMPLIANT))
      .map((t) => t.id)
      .sort();
    expect(carrying).toEqual(['t_gr_approve', 't_gr_partial_approve']);
    // Every verb that lands on a state `t_gr_post` fires from carries it: no
    // receipt reaches SAP without passing the gate.
    const post = flow.transitions.find((t) => t.id === 't_gr_post')!;
    const intoPostable = flow.transitions.filter((t) => post.from.includes(t.to)).map((t) => t.id).sort();
    expect(intoPostable).toEqual(carrying);
  });
});

describe('OPS-2b · ruling 5 — a dispatch made by hand is refused by name', () => {
  it('KNOWN-GOOD first — PO-2025-00105 is received end to end by hand: created, accepted, posted, settled', async () => {
    const id = await receiveByHand('ASN-OPS2B-105', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601'),
      line('AI-HYALU-6610'),
    ]);
    const approved = await fire('t_gr_approve', id);
    expect(approved.status, approved.reason).toBe('done');
    const posted = await fire('t_gr_post', id);
    expect(posted.status, posted.reason).toBe('submitted');
    await svc.settle(buyer(), posted.correlationId);
    expect(goodsReceiptStore.get(id)!.status).toBe('Posted to SAP');
    expect(goodsReceiptStore.get(id)!.sapMaterialDoc).toBeTruthy();
  });

  it('RECEIPT_HALAL_CERTIFICATE_NOT_VALID — the one uncertified pair cannot be accepted, in full or in part', async () => {
    const id = await receiveByHand('ASN-OPS2B-131', 'sup-005', 'PO-2025-00131', [
      line('RM-EMUL-9440'),
      line('AI-NIAC-6601'),
    ]);
    const approved = await fire('t_gr_approve', id);
    expect(approved.status).toBe('failed');
    refusedAs(approved.reason, 'RECEIPT_HALAL_CERTIFICATE_NOT_VALID');
    expect(approved.reason).toContain('RM-EMUL-9440');
    expect(approved.reason).toContain('EXPIRED');
    // The certified line beside it is not what is named.
    expect(approved.reason).not.toContain('AI-NIAC-6601');
    expect(goodsReceiptStore.get(id)!.status).toBe('Under Inspection');

    // Part-accepting it is the same acceptance, and is refused the same way.
    const short = [
      line('RM-EMUL-9440', { qtyAccepted: 60, qtyRejected: 40, rejectionReason: 'Wet bags' }),
      line('AI-NIAC-6601'),
    ];
    expect((await fire('t_gr_record_inspection', id, { inspectionResults: short })).status).toBe('done');
    const partial = await fire('t_gr_partial_approve', id);
    expect(partial.status).toBe('failed');
    refusedAs(partial.reason, 'RECEIPT_HALAL_CERTIFICATE_NOT_VALID');
    expect(goodsReceiptStore.get(id)!.status).toBe('Under Inspection');
  });

  it('and the same goods CAN be refused, and CAN be held — the gate is on accepting them', async () => {
    const id = await receiveByHand('ASN-OPS2B-131R', 'sup-005', 'PO-2025-00131', [
      line('RM-EMUL-9440', { qtyAccepted: 0, qtyRejected: 100, rejectionReason: 'No valid certificate on file' }),
    ]);
    const held = await fire('t_gr_hold', id, { holdReason: 'Waiting for the certificate.' });
    expect(held.status, held.reason).toBe('done');
    expect((await fire('t_gr_request_retest', id)).status).toBe('done');
    const rejected = await fire('t_gr_reject', id, { dispositionReason: 'No valid certificate on file' });
    expect(rejected.status, rejected.reason).toBe('done');
    expect(goodsReceiptStore.get(id)!.status).toBe('Rejected');
  });

  it('RECEIPT_BPOM_UNRULED — the one pending material stops GR-2026-001; a ruling releases it', async () => {
    const seeded = byNumber('GR-2026-001');
    expect(seeded.status).toBe('Under Inspection');
    expect(seeded.inspectionResults.map((l) => l.materialCode)).toEqual([BPOM_PENDING_SPECIMEN]);
    const results = [line(BPOM_PENDING_SPECIMEN, { qtyExpected: 25000, qtyReceived: 25000, qtyAccepted: 25000 })];
    expect((await fire('t_gr_record_inspection', seeded.id, { inspectionResults: results })).status).toBe('done');

    const approved = await fire('t_gr_approve', seeded.id);
    expect(approved.status).toBe('failed');
    refusedAs(approved.reason, 'RECEIPT_BPOM_UNRULED');
    expect(approved.reason).toContain(BPOM_PENDING_SPECIMEN);
    expect(approved.reason).toContain('Compliance rules it');

    const ruled = await svc.dispatch(buyer(personWith('compliance')), {
      transitionId: 't_material_ruling_set',
      entity: 'materialRuling',
      entityId: BPOM_PENDING_SPECIMEN,
      payload: { regime: 'bpom', applicable: true, reason: 'Ruled in a spec.' },
    });
    expect(ruled.status, ruled.reason).toBe('done');
    const again = await fire('t_gr_approve', seeded.id);
    expect(again.status, again.reason).toBe('done');
  });

  it('RECEIPT_HALAL_SEAL_UNANSWERED — a halal line with no recorded seal answer is not accepted', async () => {
    for (const unanswered of [undefined, 'Pending'] as const) {
      goodsReceiptStore.reset();
      asnStore.reset();
      const id = await receiveByHand('ASN-OPS2B-SEAL', 'sup-005', 'PO-2025-00105', [
        line('AI-NIAC-6601', { halalSealCheck: unanswered as InspectionResult['halalSealCheck'] }),
      ]);
      const approved = await fire('t_gr_approve', id);
      expect(approved.status, String(unanswered)).toBe('failed');
      refusedAs(approved.reason, 'RECEIPT_HALAL_SEAL_UNANSWERED');
    }
  });

  it('a seal recorded as Fail is an ANSWER to this gate — what a failed check means is the rollup’s to say', async () => {
    const id = await receiveByHand('ASN-OPS2B-FAIL', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601', { halalSealCheck: 'Fail' }),
    ]);
    // The gate asks that the check was MADE, as the form does: no stop here.
    expect(checkAnswered('Fail')).toBe(true);
    expect(checkAnswered('Pending')).toBe(false);
    expect(checkAnswered(undefined)).toBe(false);
    // And the receipt is still not approved in full — by the rollup, which
    // reads a failed check as a line that was not cleanly accepted.
    const res = await fire('t_gr_approve', id);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.GR_ROLLUP_APPROVED), res.reason).toBe(true);
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.GR_RECEIPT_COMPLIANT)).toBe(false);
  });

  it('RECEIPT_BPOM_LOT_UNANSWERED — where BPOM applies, by the master or by a ruling, the lot check is owed', async () => {
    // By the master.
    const byMaster = await receiveByHand('ASN-OPS2B-LOT', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601', { bpomLotCheck: undefined }),
    ]);
    const a = await fire('t_gr_approve', byMaster);
    expect(a.status).toBe('failed');
    refusedAs(a.reason, 'RECEIPT_BPOM_LOT_UNANSWERED');
    // By a SAMPLE ruling: RM-EMUL-3320 is one of the ten.
    expect(SAMPLE_BPOM_RULED).toContain('RM-EMUL-3320');
    const byRuling = await receiveByHand('ASN-OPS2B-LOT2', 'sup-005', 'PO-2025-00105', [
      line('RM-EMUL-3320', { bpomLotCheck: undefined }),
    ]);
    const b = await fire('t_gr_approve', byRuling);
    expect(b.status).toBe('failed');
    refusedAs(b.reason, 'RECEIPT_BPOM_LOT_UNANSWERED');
    // KNOWN-GOOD — packaging owes no lot check, and is accepted without one.
    const packaging = await receiveByHand('ASN-OPS2B-PK', 'sup-007', 'PO-2025-00107', [
      line('PK-PETB-8801', { bpomLotCheck: undefined }),
    ]);
    expect((await fire('t_gr_approve', packaging)).status).toBe('done');
  });

  it('RECEIPT_HALAL_UNRULED — a line whose material the master does not hold is not accepted', async () => {
    // No dispatch can create such a line (`gr_inspection_materials_declared`
    // and the ASN bind it), so the receipt is put in the store by hand: the
    // gate reads what is stored, whoever stored it.
    const base = byNumber('GR-2026-008');
    const forged: GoodsReceipt = {
      ...base,
      id: 'gr-ops2b-forged',
      grNumber: 'GR-OPS2B-FORGED',
      inspectionResults: [line('PK-NOT-A-CODE')],
    };
    goodsReceiptStore.add(forged);
    const approved = await fire('t_gr_approve', forged.id);
    expect(approved.status).toBe('failed');
    refusedAs(approved.reason, 'RECEIPT_HALAL_UNRULED');
  });

  it('the first stop in line order is the one named, and within a line the seal precedes the certificate', async () => {
    const id = await receiveByHand('ASN-OPS2B-ORDER', 'sup-005', 'PO-2025-00131', [
      line('AI-NIAC-6601', { bpomLotCheck: undefined }),
      line('RM-EMUL-9440', { halalSealCheck: undefined }),
    ]);
    const first = await fire('t_gr_approve', id);
    refusedAs(first.reason, 'RECEIPT_BPOM_LOT_UNANSWERED');
    expect(first.reason).toContain('AI-NIAC-6601');
    // Answer line 1; line 2 is stopped twice, and the seal is read first.
    const next = [line('AI-NIAC-6601'), line('RM-EMUL-9440', { halalSealCheck: undefined })];
    expect((await fire('t_gr_record_inspection', id, { inspectionResults: next })).status).toBe('done');
    refusedAs((await fire('t_gr_approve', id)).reason, 'RECEIPT_HALAL_SEAL_UNANSWERED');
    expect((await fire('t_gr_record_inspection', id, {
      inspectionResults: [line('AI-NIAC-6601'), line('RM-EMUL-9440')],
    })).status).toBe('done');
    refusedAs((await fire('t_gr_approve', id)).reason, 'RECEIPT_HALAL_CERTIFICATE_NOT_VALID');
  });

  it('the rollup still answers first: a receipt whose lines are pending is refused by the rollup, not by this gate', async () => {
    const id = byNumber('GR-2026-002').id;
    expect((await fire('t_gr_start_inspection', id)).status).toBe('done');
    const approved = await fire('t_gr_approve', id);
    expect(refusedByPolicy(approved.reason, POLICY_HOOKS.GR_ROLLUP_APPROVED)).toBe(true);
    expect(refusedByPolicy(approved.reason, POLICY_HOOKS.GR_RECEIPT_COMPLIANT)).toBe(false);
  });
});

describe('OPS-2b · ruling 5 — what the gate deliberately does not stop', () => {
  it('creating a receipt for the uncertified pair is allowed — it records that the goods arrived', async () => {
    asnStore.add(asnOf('ASN-OPS2B-ARR', 'sup-005', 'PO-2025-00131', ['RM-EMUL-9440']));
    const made = await fire('t_gr_create', undefined, {
      asnReference: 'ASN-OPS2B-ARR',
      receivedDate: DECLARED_PRESENT,
      receivedBy: 'QC Inspector',
    });
    expect(made.status, made.reason).toBe('done');
    expect(goodsReceiptStore.get(made.entityId!)!.status).toBe('Pending Inspection');
  });

  it('a seeded Approved receipt with no recorded seal answer still posts — it has no other way out', async () => {
    const seeded = byNumber('GR-2026-004');
    expect(seeded.status).toBe('Approved');
    expect(seeded.inspectionResults.every((l) => !checkAnswered(l.halalSealCheck))).toBe(true);
    const posted = await fire('t_gr_post', seeded.id);
    expect(posted.status, posted.reason).toBe('submitted');
  });
});

describe('OPS-2b · ruling 5 — the gate reads the enforcement ledger, as the form does', () => {
  const NAMED: ActorAttribution = { kind: 'RESOLVED', person: { personId: 'usr-ops2b-spec' } };
  const observe = (checkId: EnforcementSetting['checkId']): EnforcementSetting => ({
    checkId,
    mode: 'OBSERVE',
    reviewBy: '2099-12-31',
    setBy: NAMED,
    setAt: '2026-08-10T00:00:00.000Z',
  });

  it('with the certificate check recorded at OBSERVE the uncertified pair is accepted; the other checks still stop', async () => {
    // A setting nothing in the product can record today (a loosening needs a
    // named, non-sample person). Appended as data, to show the gate READS the
    // mode rather than assuming it.
    enforcementSettingStore.append(observe('halal.certificate'));
    const id = await receiveByHand('ASN-OPS2B-OBS', 'sup-005', 'PO-2025-00131', [
      line('RM-EMUL-9440', { halalSealCheck: undefined }),
    ]);
    refusedAs((await fire('t_gr_approve', id)).reason, 'RECEIPT_HALAL_SEAL_UNANSWERED');
    expect((await fire('t_gr_record_inspection', id, { inspectionResults: [line('RM-EMUL-9440')] })).status).toBe('done');
    const approved = await fire('t_gr_approve', id);
    expect(approved.status, approved.reason).toBe('done');
  });

  it('each check follows ITS OWN setting: the seal check at OBSERVE admits an unanswered seal, and not an unanswered lot', async () => {
    enforcementSettingStore.append(observe('halal.seal'));
    const seal = await receiveByHand('ASN-OPS2B-OBS-S', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601', { halalSealCheck: undefined }),
    ]);
    const a = await fire('t_gr_approve', seal);
    expect(a.status, a.reason).toBe('done');
    const lot = await receiveByHand('ASN-OPS2B-OBS-S2', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601', { bpomLotCheck: undefined }),
    ]);
    refusedAs((await fire('t_gr_approve', lot)).reason, 'RECEIPT_BPOM_LOT_UNANSWERED');
  });

  it('and the lot check at OBSERVE admits an unanswered lot, and not an unanswered seal', async () => {
    enforcementSettingStore.append(observe('bpom.lot'));
    const lot = await receiveByHand('ASN-OPS2B-OBS-L', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601', { bpomLotCheck: undefined }),
    ]);
    const a = await fire('t_gr_approve', lot);
    expect(a.status, a.reason).toBe('done');
    const seal = await receiveByHand('ASN-OPS2B-OBS-L2', 'sup-005', 'PO-2025-00105', [
      line('AI-NIAC-6601', { halalSealCheck: undefined }),
    ]);
    refusedAs((await fire('t_gr_approve', seal)).reason, 'RECEIPT_HALAL_SEAL_UNANSWERED');
  });

  it('no mode relaxes an unruled applicability — the pending material stays refused under every check at OBSERVE', async () => {
    for (const c of ['halal.certificate', 'halal.seal', 'bpom.lot'] as const) {
      enforcementSettingStore.append(observe(c));
    }
    const seeded = byNumber('GR-2026-001');
    const results = [line(BPOM_PENDING_SPECIMEN, { qtyExpected: 25000, qtyReceived: 25000, qtyAccepted: 25000 })];
    expect((await fire('t_gr_record_inspection', seeded.id, { inspectionResults: results })).status).toBe('done');
    refusedAs((await fire('t_gr_approve', seeded.id)).reason, 'RECEIPT_BPOM_UNRULED');
  });
});

// ── Ruling 2 — one clock ─────────────────────────────────────────────────────

describe('OPS-2b · ruling 2 — the dispatcher judges a certificate at the declared present', () => {
  it('the specimens are real: one certificate lapses the day after the declared present, one scheme retires on the mandate date', () => {
    const dayAfter = '2026-09-01T00:00:00.000Z';
    expect(DECLARED_PRESENT).toBe('2026-08-31');
    expect(verifyHalalAtReceipt('sup-005', 'RM-EMUL-3320', COMPLIANCE_REGISTRY, DECLARED_PRESENT_INSTANT).verdict).toBe('SATISFIED');
    expect(verifyHalalAtReceipt('sup-005', 'RM-EMUL-3320', COMPLIANCE_REGISTRY, dayAfter)).toMatchObject({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
    });
    expect(
      verifyHalalAtReceipt('sup-007', 'AI-NIAC-6612', COMPLIANCE_REGISTRY, `${BPJPH_MANDATE_DATE}T00:00:00.000Z`),
    ).toMatchObject({ verdict: 'NOT_SATISFIED', reason: 'SCHEME_INVALID' });
  });

  describe('with the wall clock after the mandate date', () => {
    usePinnedDemoClock('2026-10-20T09:00:00.000Z');
    it('both are still accepted — the wall clock is not what the gate reads', async () => {
      expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-20');
      const lapsing = await receiveByHand('ASN-OPS2B-CLK1', 'sup-005', 'PO-2025-00105', [line('RM-EMUL-3320')]);
      const a = await fire('t_gr_approve', lapsing);
      expect(a.status, a.reason).toBe('done');
      const legacy = await receiveByHand('ASN-OPS2B-CLK2', 'sup-007', 'PO-2025-00107', [line('AI-NIAC-6612')]);
      const b = await fire('t_gr_approve', legacy);
      expect(b.status, b.reason).toBe('done');
    });
  });
});

// ── The predicate itself ─────────────────────────────────────────────────────

describe('OPS-2b · the predicate — one function, read by the form and by the gate', () => {
  const ALL = { seal: true, lot: true, certificate: true };
  const blocksFor = (
    supplierId: string,
    lines: Parameters<typeof receiptComplianceBlocks>[0]['lines'],
    over: Partial<Parameters<typeof receiptComplianceBlocks>[0]> = {},
  ) =>
    receiptComplianceBlocks({
      supplierId,
      lines,
      rulings: sampleMaterialRulings(),
      registry: COMPLIANCE_REGISTRY,
      at: DECLARED_PRESENT_INSTANT,
      stops: ALL,
      ...over,
    });

  it('a clean, certified, ruled line has no stop', () => {
    expect(blocksFor('sup-005', [line('AI-NIAC-6601'), line('AI-HYALU-6610')])).toEqual([]);
  });

  it('each kind is produced by its own cause, with the lookup’s reason where it has one', () => {
    expect(blocksFor('sup-005', [line('RM-EMUL-9440')])).toEqual([
      { materialCode: 'RM-EMUL-9440', kind: 'HALAL_CERTIFICATE_NOT_VALID', detail: 'EXPIRED' },
    ]);
    // A pair with no row at all reads NO_CERT — the reason is the lookup's own.
    expect(blocksFor('sup-011', [line('RM-EMUL-9440')])).toEqual([
      { materialCode: 'RM-EMUL-9440', kind: 'HALAL_CERTIFICATE_NOT_VALID', detail: 'NO_CERT' },
    ]);
    expect(blocksFor('sup-005', [line('AI-NIAC-6601', { halalSealCheck: undefined })])).toEqual([
      { materialCode: 'AI-NIAC-6601', kind: 'HALAL_SEAL_UNANSWERED' },
    ]);
    expect(blocksFor('sup-005', [line('AI-NIAC-6601', { bpomLotCheck: undefined })])).toEqual([
      { materialCode: 'AI-NIAC-6601', kind: 'BPOM_LOT_UNANSWERED' },
    ]);
    expect(blocksFor('sup-001', [line(BPOM_PENDING_SPECIMEN)])).toEqual([
      { materialCode: BPOM_PENDING_SPECIMEN, kind: 'BPOM_UNRULED', detail: 'UNDETERMINED_APPLICABILITY' },
    ]);
    expect(blocksFor('sup-001', [line('PK-NOT-A-CODE')]).map((b) => b.kind)).toEqual([
      'HALAL_UNRULED',
      'BPOM_UNRULED',
    ]);
  });

  it('every kind the vocabulary declares is reachable — none is a name with no cause', () => {
    const seen = new Set(
      [
        ...blocksFor('sup-005', [line('RM-EMUL-9440', { halalSealCheck: undefined })]),
        ...blocksFor('sup-005', [line('AI-NIAC-6601', { bpomLotCheck: undefined })]),
        ...blocksFor('sup-001', [line('PK-NOT-A-CODE')]),
      ].map((b) => b.kind),
    );
    expect([...seen].sort()).toEqual([...RECEIPT_BLOCK_KINDS].sort());
  });

  it('a relaxed mode relaxes the consequence of an answer, and never the two unruled stops', () => {
    const NONE = { seal: false, lot: false, certificate: false };
    expect(
      blocksFor('sup-005', [line('RM-EMUL-9440', { halalSealCheck: undefined, bpomLotCheck: undefined })], { stops: NONE }),
    ).toEqual([]);
    expect(blocksFor('sup-001', [line(BPOM_PENDING_SPECIMEN)], { stops: NONE }).map((b) => b.kind)).toEqual(['BPOM_UNRULED']);
    expect(blocksFor('sup-001', [line('PK-NOT-A-CODE')], { stops: NONE }).map((b) => b.kind)).toEqual([
      'HALAL_UNRULED',
      'BPOM_UNRULED',
    ]);
  });

  it('a material Compliance rules halal out is asked for neither seal nor certificate', () => {
    const ruledOut = {
      ...sampleMaterialRulings()[0],
      materialCode: 'RM-EMUL-9440',
      regime: 'halal' as const,
      applicable: false,
      seq: 50,
    };
    expect(
      blocksFor('sup-005', [line('RM-EMUL-9440', { halalSealCheck: undefined })], {
        rulings: [...sampleMaterialRulings(), ruledOut],
      }),
    ).toEqual([]);
  });

  it('the instant is the axis: the same line stops the day after its certificate lapses', () => {
    expect(blocksFor('sup-005', [line('RM-EMUL-3320')])).toEqual([]);
    expect(blocksFor('sup-005', [line('RM-EMUL-3320')], { at: '2026-09-01T00:00:00.000Z' })).toEqual([
      { materialCode: 'RM-EMUL-3320', kind: 'HALAL_CERTIFICATE_NOT_VALID', detail: 'EXPIRED' },
    ]);
  });
});
