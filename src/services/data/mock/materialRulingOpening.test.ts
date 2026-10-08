// ─────────────────────────────────────────────────────────────────────────────
// OPS-2b — WHAT THE RULING LEDGER HOLDS WHEN THE PORTAL BOOTS.
//
// Every other spec that touches the ledger calls `reset()` in a `beforeEach`,
// so none of them can tell a store that OPENS on the sample rulings from one
// that opens empty and is only ever filled by a reset — and the product never
// calls `reset()`. A mutation probe found this: opening the store on `[]`
// left the whole suite green.
//
// So this file loads the module fresh and reads it BEFORE anything resets it.
// It deliberately has no `beforeEach`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

describe('OPS-2b · the ruling ledger opens on the SAMPLE rulings — with no reset', () => {
  it('a freshly loaded store already holds the ten, in order, and assigns the next place after them', async () => {
    vi.resetModules();
    const { materialRulingStore } = await import('./stores/materialRulingStore');
    const { SAMPLE_BPOM_RULED, BPOM_PENDING_SPECIMEN, sampleMaterialRulings } = await import(
      './materialRulingSeed'
    );
    // Read first, before any call that could fill it.
    const opening = materialRulingStore.all();
    expect(opening.map((r) => r.materialCode)).toEqual([...SAMPLE_BPOM_RULED]);
    expect(opening).toEqual(sampleMaterialRulings());
    expect(opening.some((r) => r.materialCode === BPOM_PENDING_SPECIMEN)).toBe(false);
    expect(materialRulingStore.forMaterial('RM-STEAR-7300')).toHaveLength(1);
    expect(materialRulingStore.nextSeq()).toBe(SAMPLE_BPOM_RULED.length + 1);
  });

  it('and the gate reads them at boot: a raw material ruled by the seed owes its lot check on a fresh service', async () => {
    vi.resetModules();
    const { MockCommandService } = await import('./MockCommandService');
    const { asnStore } = await import('./stores/asnStore');
    const { PERSONA_SYSTEM_ROLES } = await import('../../transitions/businessRoles');
    const { NO_PERSON } = await import('../../../context/noPerson');
    const { DECLARED_PRESENT } = await import('../fixturePresent');
    const svc = new MockCommandService();
    const scope = {
      personaType: 'buyer' as const,
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer,
      actor: NO_PERSON,
    };
    asnStore.add({
      asnNumber: 'ASN-OPS2B-BOOT',
      supplierId: 'sup-005',
      poReference: 'PO-2025-00113',
      status: 'Submitted',
      carrier: 'Sample Courier',
      trackingNumber: 'TRK-BOOT',
      eta: DECLARED_PRESENT,
      details: {
        originCity: 'Sample Personal Care Emulsifiers GmbH',
        destinationWarehouse: 'NDC J6, Jakarta',
        totalCartons: 1,
        grossWeightKg: 10,
        temperatureRequirement: 'Ambient',
      },
      lineItems: [
        { materialCode: 'RM-EMUL-3320', description: 'Cetearyl Alcohol', orderedQty: 10, shippedQty: 10, lotNumber: 'LOT-BOOT' },
      ],
    });
    const fire = (transitionId: string, entityId?: string, payload?: Record<string, unknown>) =>
      svc.dispatch(scope, { transitionId, entity: 'goodsReceipt', entityId, payload });
    const made = await fire('t_gr_create', undefined, {
      asnReference: 'ASN-OPS2B-BOOT',
      receivedDate: DECLARED_PRESENT,
      receivedBy: 'QC Inspector',
      inspectionResults: [
        {
          materialCode: 'RM-EMUL-3320',
          description: 'Cetearyl Alcohol',
          qtyExpected: 10,
          qtyReceived: 10,
          qtyAccepted: 10,
          qtyRejected: 0,
          visualCheck: 'Pass',
          packagingCheck: 'Pass',
          halalSealCheck: 'Pass',
        },
      ],
    });
    expect(made.status, made.reason).toBe('done');
    expect((await fire('t_gr_start_inspection', made.entityId!)).status).toBe('done');
    const approved = await fire('t_gr_approve', made.entityId!);
    // Opening empty, this would read RECEIPT_BPOM_UNRULED instead.
    expect(approved.status).toBe('failed');
    expect(approved.reason).toContain('RECEIPT_BPOM_LOT_UNANSWERED:');
  });
});
