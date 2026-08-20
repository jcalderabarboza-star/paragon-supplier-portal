import { afterEach, describe, expect, it } from 'vitest';
import { MockDeliveryService } from './MockDeliveryService';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import type { DeliveryAgreementView } from '../../delivery';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const SUPPLIER_007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const svc = new MockDeliveryService();

/** The item-10 (PK-PETB-8810 FRC) view for one contract's single agreement. */
async function itemTen(contractId: string) {
  const page = await svc.getAgreements(BUYER, { contractId });
  const view = page.items[0];
  return view.items.find((iv) => iv.item.lineSeq === 10)!;
}

describe('MockDeliveryService.releaseLines — the first write', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('flips exactly the named draft line: releasedQty up by its plannedQty, remaining down', async () => {
    const before = await itemTen('ctr-003');
    expect(before.ledger.releasedQty).toBe(0);
    expect(before.ledger.remainingQty).toBe(2_000_000);

    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [1] });
    expect(result.ok).toBe(true);

    const after = await itemTen('ctr-003');
    const flipped = after.item.scheduleLines.find((l) => l.releaseSeq === 1)!;
    expect(flipped.state).toBe('released');
    expect(flipped.releasedAt).toBeDefined();
    // seq1 plannedQty is 180,000 → released climbs by exactly that, remaining drops.
    expect(after.ledger.releasedQty).toBe(180_000);
    expect(after.ledger.remainingQty).toBe(1_820_000);
  });

  it('the released line now appears in the derived fulfillment (was empty all-draft)', async () => {
    const before = await itemTen('ctr-003');
    expect(before.fulfillment).toHaveLength(0); // all-draft ⇒ nothing to fulfill

    await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [1] });

    const after = await itemTen('ctr-003');
    const fv = after.fulfillment.find((f) => f.releaseSeq === 1);
    expect(fv).toBeDefined();
    // seq1 releaseDate 2025-10-01 has long passed the clock with no matching
    // shipment → the honest 'missed', not a fabricated fulfillment.
    expect(fv!.fulfillment).toBe('missed');
  });

  it('the horizon arm releases every draft line on or before the date', async () => {
    // sa-0002 item A has draft seqs 1 (2026-04-01) & 2 (2026-05-01). A horizon of
    // 2026-04-15 releases only seq 1.
    const result = await svc.releaseLines(BUYER, 'sa-0002', 10, { horizonDate: '2026-04-15' });
    expect(result.ok).toBe(true);
    const item = await itemTen('ctr-013');
    const states = new Map(item.item.scheduleLines.map((l) => [l.releaseSeq, l.state]));
    expect(states.get(1)).toBe('released');
    expect(states.get(2)).toBe('draft'); // 2026-05-01 is past the horizon
  });

  it('is buyer-only: a supplier scope is refused (SCOPE_DENIED), store untouched', async () => {
    const result = await svc.releaseLines(SUPPLIER_007, 'sa-0002', 10, { releaseSeqs: [1] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('SCOPE_DENIED');
    // The refusal never touched the store.
    const item = await itemTen('ctr-013');
    expect(item.item.scheduleLines.find((l) => l.releaseSeq === 1)!.state).toBe('draft');
  });

  it('idempotence: re-releasing an already-released line is refused ALREADY_RELEASED', async () => {
    await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [1] });
    const again = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [1] });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('ALREADY_RELEASED');
  });

  it('an empty selection is an honest NO_LINES_SELECTED, not a silent success', async () => {
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NO_LINES_SELECTED');
  });

  it('isolation: a sa-0002 write leaves sa-0001 / ctr-003 pristine all-draft', async () => {
    await svc.releaseLines(BUYER, 'sa-0002', 10, { releaseSeqs: [1, 2] });
    const anchor = await itemTen('ctr-003');
    expect(anchor.ledger.releasedQty).toBe(0);
    expect(anchor.item.scheduleLines.every((l) => l.state === 'draft')).toBe(true);
  });

  it('an unknown agreement or item is refused UNKNOWN_RELEASE_SEQ', async () => {
    const noAgreement = await svc.releaseLines(BUYER, 'sa-9999', 10, { releaseSeqs: [1] });
    expect(noAgreement.ok).toBe(false);
    if (!noAgreement.ok) expect(noAgreement.reason).toBe('UNKNOWN_RELEASE_SEQ');
    const noItem = await svc.releaseLines(BUYER, 'sa-0001', 99, { releaseSeqs: [1] });
    expect(noItem.ok).toBe(false);
    if (!noItem.ok) expect(noItem.reason).toBe('UNKNOWN_RELEASE_SEQ');
  });

  it('ok returns the re-derived view so the caller renders without a second read', async () => {
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [1] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const view: DeliveryAgreementView = result.view;
      const item = view.items.find((iv) => iv.item.lineSeq === 10)!;
      expect(item.ledger.releasedQty).toBe(180_000);
    }
  });
});
