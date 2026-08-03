// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · B1 — THE MASTER-MISS REFUSAL at the write boundary.
//
// OPERATOR RULING · D-OPS-MASTERMISS: a dispatch naming a material the master
// cannot resolve is REFUSED BY NAME. No quarantine, no accept-with-marker —
// quarantine creates a class of stored facts that exist but are not trustworthy.
//
// Two distinct gates are pinned here, and the distinction is the point:
//   · SDC verbs  → LAYERED. Creation scope (`collaboratedMaterial`) already
//     refuses a bogus code today — Seat 3's correction, verified below rather
//     than assumed. `SDC_MATERIAL_KNOWN` is the INNER gate, covering the case
//     scope cannot see: a code that IS collaborated but is NOT in the master.
//   · GR create  → GR_INSPECTION_MATERIALS_DECLARED, membership in the PARENT
//     DOCUMENT'S OWN LINES. Deliberately NOT the master: the GR lane's documents
//     live in the mock*.ts identity space (MASTER-STRADDLE-01), of which the
//     five-entry SDC master names two, so a master gate would refuse nearly
//     every legitimate receipt. Identity by DECLARED OWNERSHIP, never by content
//     plausibility (Seat 3's ratified collision principle).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { MATERIAL_MASTER, isKnownMaterial } from '../../sdc';
import { resolvePolicyHook } from '../../transitions/policies';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { getTransition } from '../../transitions';
import type { ASN, QueryScope } from '../types';
import type { InspectionResult } from '../../../data/mockGoodsReceipts';

const svc = new MockCommandService();
const buyer: QueryScope = { personaType: 'buyer' };
// sup-002 collaborates on RM-EMUL-3310 (a relationship row) — so creation scope
// PASSES for it, and the master gate is what the bogus cases actually hit.
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

const BOGUS = 'RM-GHOST-0000';

describe('the straddle these gates sit on (MASTER-STRADDLE-01)', () => {
  it('the SDC master and the document lane are DIFFERENT identity spaces', () => {
    // This is why the GR gate cannot be a master check. Recorded as an
    // executable fact so the divergence cannot drift silently.
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(5);
    expect(isKnownMaterial('PK-PET-1100')).toBe(false); // a real GR-lane code
    expect(isKnownMaterial('RM-EMUL-3310')).toBe(true); // one of the two overlaps
  });
});

describe('SDC write verbs — the LAYERED defence against a bogus material', () => {
  // Seat 3's correction, VERIFIED here rather than assumed. The outer gate fires
  // first: `creationOwner` (MockCommandService `collaboratedMaterial`) returns
  // null for a material no relationship and no publication names, and the
  // dispatcher turns a null owner into SCOPE_DENIED for a supplier scope —
  // BEFORE any policy hook runs. So a bogus code never reaches the master gate
  // through the dispatcher today. It is refused, just by the other gate.
  it('inventory declare: a bogus code is SCOPE_DENIED (the OUTER gate)', async () => {
    const before = inventoryDeclarationStore.all().length;
    // SCOPE_DENIED THROWS rather than resolving to a failed CommandResult — a
    // supplier learns nothing about entities not provably its own.
    await expect(
      svc.dispatch(sup002, {
        transitionId: 't_inventorydeclaration_declare',
        entity: 'inventoryDeclaration',
        payload: { supplierId: 'sup-002', materialCode: BOGUS, totalQty: 100 },
      }),
    ).rejects.toThrow(/denied for scope/);
    // NOTHING landed, and nothing was stamped with a fabricated unit — the
    // whole point of refusing over quarantining.
    expect(inventoryDeclarationStore.all()).toHaveLength(before);
    expect(inventoryDeclarationStore.all().some((d) => d.materialCode === BOGUS)).toBe(false);
  });

  it('incoming shipment report: same outer gate, nothing stamped', async () => {
    await expect(
      svc.dispatch(sup002, {
        transitionId: 't_incomingshipment_report',
        entity: 'incomingShipment',
        payload: {
          supplierId: 'sup-002',
          materialCode: BOGUS,
          direction: 'to-paragon',
          qty: 10,
          asnRef: 'ASN-WHATEVER',
        },
      }),
    ).rejects.toThrow(/denied for scope/);
    expect(incomingShipmentStore.all().some((s) => s.materialCode === BOGUS)).toBe(false);
  });

  it('a KNOWN, collaborated code still declares, and takes its unit from the master', async () => {
    const res = await svc.dispatch(sup002, {
      transitionId: 't_inventorydeclaration_declare',
      entity: 'inventoryDeclaration',
      payload: { supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', totalQty: 250 },
    });
    expect(res.status).not.toBe('failed');
    const stored = inventoryDeclarationStore.get(res.entityId ?? '');
    expect(stored?.uom).toBe(MATERIAL_MASTER['RM-EMUL-3310'].canonicalUom);
  });
});

describe('SDC_MATERIAL_KNOWN — the INNER gate, and the gap it actually closes', () => {
  // The outer gate tests membership in relationships ∪ publications. That is NOT
  // the master, and nothing at RUNTIME forces those sets to be master-subsets —
  // only the SDC-0 integrity suite does, and a suite is not a boundary. The
  // moment a relationship row or a SOMO-fed publication line names a code the
  // master lacks, creation scope PASSES and `create` reaches the unit lookup.
  // That is the case this hook covers, and it is unreachable through the
  // dispatcher only for as long as the two sets agree — which is exactly the
  // assumption F2's live feed removes.
  const hook = resolvePolicyHook(POLICY_HOOKS.SDC_MATERIAL_KNOWN);
  const decide = (materialCode: unknown) =>
    hook!({
      entityId: '',
      currentState: '',
      toState: 'Declared',
      payload: { materialCode } as Record<string, unknown>,
      target: {} as never,
    });

  it('is bound', () => expect(hook).toBeDefined());

  it('admits every code the master names', () => {
    for (const code of Object.keys(MATERIAL_MASTER)) expect(decide(code).ok).toBe(true);
  });

  it('REFUSES an unresolvable code BY NAME (D-OPS-MASTERMISS)', () => {
    const d = decide(BOGUS);
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/UNKNOWN_MATERIAL/);
    expect(d.reason).toContain(BOGUS);
  });

  it('names a blank code rather than reporting an empty refusal', () => {
    const d = decide('');
    expect(d.ok).toBe(false);
    expect(d.reason).toContain('(blank)');
    expect(decide(undefined).ok).toBe(false);
  });

  it('rides all four SDC creation verbs, so no verb keeps the old default', () => {
    for (const id of [
      't_requirementresponse_submit',
      't_requirementresponse_acknowledge',
      't_inventorydeclaration_declare',
      't_inventorydeclaration_record',
      't_incomingshipment_report',
    ]) {
      expect(getTransition(id)?.policyHooks, id).toContain(POLICY_HOOKS.SDC_MATERIAL_KNOWN);
    }
  });
});

// ── The GR gate ──────────────────────────────────────────────────────────────

const asnWith = (asnNumber: string, materialCodes: string[]): ASN => ({
  asnNumber,
  supplierId: 'sup-007',
  poReference: 'PO-2025-00107',
  status: 'Submitted',
  carrier: 'JNE',
  trackingNumber: 'TRK-CP2',
  eta: '2026-05-22',
  details: {
    originCity: 'Surabaya',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 4,
    grossWeightKg: 40,
    temperatureRequirement: 'Ambient',
  },
  lineItems: materialCodes.map((materialCode, i) => ({
    materialCode,
    description: `Line ${i + 1}`,
    orderedQty: 1_000,
    shippedQty: 1_000,
    lotNumber: `LOT-${i + 1}`,
  })),
});

const inspect = (materialCode: string): InspectionResult => ({
  materialCode,
  description: 'Inspected line',
  qtyExpected: 1_000,
  qtyReceived: 1_000,
  qtyAccepted: 1_000,
  qtyRejected: 0,
  visualCheck: 'Pass',
  packagingCheck: 'Pass',
});

const createGr = (asnReference: string, inspectionResults: InspectionResult[]) =>
  svc.dispatch(buyer, {
    transitionId: 't_gr_create',
    entity: 'goodsReceipt',
    payload: {
      asnReference,
      receivedDate: '2026-05-20',
      receivedBy: 'QC Inspector',
      inspectionResults,
    },
  });

describe('GR_INSPECTION_MATERIALS_DECLARED — identity by DECLARED OWNERSHIP', () => {
  beforeEach(() => {
    asnStore.add(asnWith('ASN-CP2-OK', ['PK-PET-1100', 'PK-PET-1110']));
  });

  it('THE HOLE THIS CLOSES: inspecting a material the parent never declared', async () => {
    // `create` derives ownership and every reference from the parent, but
    // `inspectionResults` was taken VERBATIM from the caller — the one payload
    // branch nobody checked. A peer calling dispatch directly could file a
    // buyer-authored inspection fact about goods that never arrived.
    const before = goodsReceiptStore.all().length;
    const res = await createGr('ASN-CP2-OK', [inspect('AI-RETA-6750')]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNDECLARED_MATERIAL/);
    expect(res.reason).toContain('AI-RETA-6750');
    expect(goodsReceiptStore.all()).toHaveLength(before);
  });

  it('accepts every line the parent DID declare', async () => {
    const res = await createGr('ASN-CP2-OK', [inspect('PK-PET-1100'), inspect('PK-PET-1110')]);
    expect(res.status).not.toBe('failed');
  });

  it('refuses the WHOLE receipt when only one line is undeclared', async () => {
    // Partial acceptance would store a receipt whose line set silently differs
    // from what was submitted — a stored fact that is not trustworthy.
    const res = await createGr('ASN-CP2-OK', [inspect('PK-PET-1100'), inspect('AI-RETA-6750')]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNDECLARED_MATERIAL/);
  });

  it('is NOT a material-master check — a master-valid code the ASN never named is refused', async () => {
    // RM-EMUL-3310 IS in the SDC master. That is irrelevant here: the parent
    // document did not declare it. Ownership beats plausibility.
    expect(isKnownMaterial('RM-EMUL-3310')).toBe(true);
    const res = await createGr('ASN-CP2-OK', [inspect('RM-EMUL-3310')]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNDECLARED_MATERIAL/);
  });

  it('conversely, a NON-master code the ASN DID declare is accepted', async () => {
    // The straddle in one assertion: a master gate here would have refused this
    // perfectly legitimate receipt.
    expect(isKnownMaterial('PK-PET-1100')).toBe(false);
    const res = await createGr('ASN-CP2-OK', [inspect('PK-PET-1100')]);
    expect(res.status).not.toBe('failed');
  });

  it('a receipt with NO inspection lines stays legal (honest by construction)', async () => {
    // It rolls up to 'Pending' and nothing is finalizable — the wizard's
    // existing path for an unreadable line. This gate adds no new rule there.
    const res = await createGr('ASN-CP2-OK', []);
    expect(res.status).not.toBe('failed');
  });

  it('an unresolvable parent is still the ARRIVAL hook\'s refusal, not this one', async () => {
    const res = await createGr('ASN-DOES-NOT-EXIST', [inspect('PK-PET-1100')]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/no arrived shipment or ASN found/);
  });
});
