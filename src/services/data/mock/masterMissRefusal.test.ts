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
// 2B-5b-ii — the GR RUNTIME input, so the 'it resolves' claim is DERIVED from
// what the wizard is actually fed rather than from three codes typed by hand.
import { MOCK_ASNS } from './fixtures/supplierShipments';
import type { InspectionResult } from '../../../data/mockGoodsReceipts';

const svc = new MockCommandService();
const buyer: QueryScope = { personaType: 'buyer' };
// sup-002 collaborates on RM-EMUL-3310 (a relationship row) — so creation scope
// PASSES for it, and the master gate is what the bogus cases actually hit.
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

const BOGUS = 'RM-GHOST-0000';

describe('the straddle these gates sit on (MASTER-STRADDLE-01)', () => {
  it('⚠️ NARROWED TO ZERO at 2B-3 — the declared lane no longer straddles at all', () => {
    // WHAT CHANGED, and it is the reason this assertion keeps being inverted
    // rather than bumped: for two batches it pinned "the master and the document
    // lane are DIFFERENT identity spaces", with `PK-PETB-8801` — a real GR-lane
    // code — as the witness. 2B-2 ADOPTED that witness and the straddle went
    // 30 → 5. 2B-3 authored the remaining five, and it is now ZERO codes wide:
    // every code the declared document lane names, the master resolves.
    // ⚠️ 42 AT 2B-5b-ii — seven ASN codes authored. The straddle stays ZERO;
    // what changed is that the UNDECLARED lane stopped straddling too.
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(42);
    expect(isKnownMaterial('PK-PETB-8801')).toBe(true); // ← was false until 2B-2
    expect(isKnownMaterial('RM-EMUL-3310')).toBe(true); // the original overlap
    expect(isKnownMaterial('PK-PETB-8803')).toBe(true); // ← was false until 2B-3
  });

  it('⚠️ AND NOW IT IS CLOSED — the live population resolves at 2B-5b-ii', () => {
    // THE DISTINCTION THAT KEEPS THIS FILE HONEST, and 2B-3 sharpens it by
    // removing the half that was never operative. Two populations used to
    // refuse; one does now:
    //
    //   · the RFQ lane's five mute codes — AUTHORED at 2B-3, so they resolve.
    //     They were also the population that never mattered to this gate: an
    //     RFQ material is not a received line, and the GR wizard never saw one.
    //   · the `MAT-*` codes of `paragon.asn_chase_lane` — a DIFFERENT space,
    //     declared at 2B-1 and booked for retirement.
    //
    // The second was always the OPERATIVE one: `MOCK_ASNS` seeds `asnStore`,
    // which feeds the GR inspection wizard, so the code a receipt actually
    // arrives carrying was the one the master could not name — through three
    // adoption batches and thirty new master rows.
    //
    // ⚠️ **INVERTED AT 2B-5b-ii. IT RESOLVES.** The seven were authored as
    // canonical rows and the ASN lines took those codes. A fail-closed master
    // gate on the GR path would now refuse NOTHING that is legitimately
    // received — which was the ONE precondition `2B-4b` had.
    for (const authoredRfqCode of ['AI-CENT-6900', 'PK-ALCP-2441', 'PK-PETB-8825']) {
      expect(isKnownMaterial(authoredRfqCode), `${authoredRfqCode} was authored at 2B-3`).toBe(
        true,
      );
    }
    for (const retired of ['MAT-88201', 'MAT-77014', 'MAT-55022']) {
      expect(isKnownMaterial(retired), `${retired} names nothing now`).toBe(false);
    }
    for (const authored of ['FR-ROUD-4470', 'PK-ALCP-2450', 'AI-NIAC-6612']) {
      expect(isKnownMaterial(authored), `${authored} authored at 2B-5b-ii`).toBe(true);
    }
    // Derived rather than listed, so a code re-entering the runtime input that
    // the master cannot name turns this red wherever it comes from.
    const runtime = [...new Set(MOCK_ASNS.flatMap((a) => a.lineItems.map((l) => l.materialCode)))];
    expect(runtime).toHaveLength(7);
    expect(runtime.filter((c) => !isKnownMaterial(c))).toEqual([]);
  });

  // CP-2 · B2a — the overlap's CHARACTER, unchanged by 2B-2 and now covering 28
  // codes rather than 3. Before B2a the overlapping codes carried DIFFERENT
  // meanings on each side (`RM-EMUL-3310` was glycerin to the master and
  // Glyceryl Stearate SE to the document lane). Every shared code now carries
  // the MASTER's meaning on both sides — which is precisely what made adoption
  // a ratification rather than an authoring act.
  it('every shared code carries the MASTER meaning on both sides', () => {
    const shared = ['RM-EMUL-3310', 'RM-EMUL-3320', 'AI-NIAC-6601'] as const;
    for (const code of shared) expect(isKnownMaterial(code)).toBe(true);

    // `PK-PETB-8810` is master-owned and does not appear in the document lane at
    // all: its two squatting meanings took `PK-PETB-8802` (Emina 100ml Clear,
    // ADOPTED at 2B-2) and `PK-PETB-8803` (Wardah 100ml Airless Pump, AUTHORED
    // at 2B-3). The pair was the clearest case of adoption splitting on
    // stated-meaning alone — and 2B-3 closed the split from the other side, by a
    // DIFFERENT act. Both are resolvable now; only one of them was ratified.
    expect(isKnownMaterial('PK-PETB-8802')).toBe(true);
    expect(isKnownMaterial('PK-PETB-8803')).toBe(true); // ← was false until 2B-3
    expect(isKnownMaterial('PK-PETB-8810')).toBe(true);
    // ⚠️ AND `PK-PETB-8825`, which 2A deliberately withheld. It is NOT an alias
    // of 8810: same substrate, same 250ml volume, different closure format, and
    // under `D-IDENTITY-GRAIN = SPECIFICATION` that makes it a different
    // purchasable item. Two master rows, not one row with two codes.
    expect(isKnownMaterial('PK-PETB-8825')).toBe(true);
    expect(MATERIAL_MASTER['PK-PETB-8825'].label).not.toBe(
      MATERIAL_MASTER['PK-PETB-8810'].label,
    );
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
  carrier: 'Sample Courier',
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
    asnStore.add(asnWith('ASN-CP2-OK', ['PK-PETB-8801', 'PK-PETB-8802']));
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
    const res = await createGr('ASN-CP2-OK', [inspect('PK-PETB-8801'), inspect('PK-PETB-8802')]);
    expect(res.status).not.toBe('failed');
  });

  it('refuses the WHOLE receipt when only one line is undeclared', async () => {
    // Partial acceptance would store a receipt whose line set silently differs
    // from what was submitted — a stored fact that is not trustworthy.
    const res = await createGr('ASN-CP2-OK', [inspect('PK-PETB-8801'), inspect('AI-RETA-6750')]);
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
    // The straddle in one assertion: a master gate here would refuse a perfectly
    // legitimate receipt.
    //
    // ⚠️ THE WITNESS CHANGED AT 2B-2, and the change is the point. This used to
    // read `PK-PETB-8801` — a GR-lane code the master could not name. 2B-2
    // ADOPTED it, so it can no longer witness anything. The replacement is the
    // code a receipt actually arrives carrying at runtime: `asnStore` is seeded
    // from `MOCK_ASNS`, whose vocabulary is the `MAT-*` space, and the master
    // still cannot resolve a single one of those nine.
    //
    // So the assertion survives its own witness being fixed — which is exactly
    // what "narrowed, not closed" means for the 2B-4 gate. Adopting the declared
    // lane did not make a master check legal here; it moved the reason.
    expect(isKnownMaterial('MAT-88201')).toBe(false);
    asnStore.add(asnWith('ASN-CP2-CHASE', ['MAT-88201']));
    const res = await createGr('ASN-CP2-CHASE', [inspect('MAT-88201')]);
    expect(res.status).not.toBe('failed');
  });

  it('a receipt with NO inspection lines stays legal (honest by construction)', async () => {
    // It rolls up to 'Pending' and nothing is finalizable — the wizard's
    // existing path for an unreadable line. This gate adds no new rule there.
    const res = await createGr('ASN-CP2-OK', []);
    expect(res.status).not.toBe('failed');
  });

  it('an unresolvable parent is still the ARRIVAL hook\'s refusal, not this one', async () => {
    const res = await createGr('ASN-DOES-NOT-EXIST', [inspect('PK-PETB-8801')]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/no arrived shipment or ASN found/);
  });
});
