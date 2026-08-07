// ────────────────────────────────────────────────────────────────────────────
// The enforcement READ seam (CP-3 · E2) — the setting, behind `useDataService()`.
//
// What is proved: the seam serves THE LEDGER and never the answer; the mode in
// force is derived ABOVE it by a caller that supplies its own instant; the read
// is buyer-scoped and REFUSES rather than returning an empty page; and no gate
// reads any of it yet, which is the E2 fence.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { mockDataService } from './mockDataService';
import { MockCommandService } from './MockCommandService';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import { DataError } from '../types';
import type { QueryScope } from '../types';
import { effectiveEnforcement } from '../../../lib/enforcement';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-005' };

const svc = new MockCommandService();
const NAMED = { kind: 'RESOLVED', person: { personId: 'usr-014', displayName: 'Rina Wijaya' } };

beforeEach(() => {
  enforcementSettingStore.reset();
});

describe('IEnforcementService — the ledger, behind the seam', () => {
  it('ships EMPTY, so the seam is honest before anybody records anything', async () => {
    const page = await mockDataService.enforcement.getEnforcementSettings(buyer);
    expect(page.items).toEqual([]);
    expect(page.cursor).toBeNull();
  });

  it('serves the recorded acts, oldest first', async () => {
    await svc.dispatch(buyer, {
      transitionId: 't_enforcement_set',
      entity: 'enforcement',
      entityId: 'bpom.lot',
      payload: { mode: 'OBSERVE', reviewBy: '2027-01-31', setBy: NAMED },
    });
    await svc.dispatch(buyer, {
      transitionId: 't_enforcement_set',
      entity: 'enforcement',
      entityId: 'bpom.lot',
      payload: { mode: 'BLOCK_OVERRIDABLE', reviewBy: '2027-06-30', setBy: NAMED },
    });

    const { items } = await mockDataService.enforcement.getEnforcementSettings(buyer);
    // BOTH acts, in order. The seam does not collapse the ledger to a "current"
    // value — collapsing it upstream is how the superseded decision gets lost.
    expect(items.map((s) => s.mode)).toEqual(['OBSERVE', 'BLOCK_OVERRIDABLE']);
  });

  it('⚠️ SERVES THE LEDGER, NEVER THE ANSWER — the caller derives, with its own instant', async () => {
    await svc.dispatch(buyer, {
      transitionId: 't_enforcement_set',
      entity: 'enforcement',
      entityId: 'bpom.lot',
      payload: { mode: 'OBSERVE', reviewBy: '2027-01-31', setBy: NAMED },
    });
    const { items } = await mockDataService.enforcement.getEnforcementSettings(buyer);

    // The same ledger answers differently at two instants, and NOTHING on the
    // seam knows which one applies. A `getEffectiveMode(checkId)` method would
    // have had to read a clock to answer — which is the law-0.5 shape this
    // avoids by never putting the question on the service at all.
    expect(effectiveEnforcement(items, 'bpom.lot', '2026-12-01T00:00:00.000Z')).toEqual({
      mode: 'OBSERVE',
      source: 'AS_SET',
    });
    expect(effectiveEnforcement(items, 'bpom.lot', '2027-02-01T00:00:00.000Z')).toEqual({
      mode: 'BLOCK_OVERRIDABLE',
      source: 'EXPIRY_TIGHTENED',
    });
  });

  it('the service exposes exactly ONE method — there is no derived read to drift', () => {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(mockDataService.enforcement),
    ).filter((n) => n !== 'constructor');
    expect(methods).toEqual(['getEnforcementSettings']);
  });

  it('⚠️ REFUSES a supplier rather than answering with an empty page', async () => {
    // An empty list would say "there are no settings" — a claim about the
    // ledger, and one that becomes a LIE the moment a buyer records one. The
    // refusal says what is true: this reader may not see this record.
    await expect(
      mockDataService.enforcement.getEnforcementSettings(supplier),
    ).rejects.toBeInstanceOf(DataError);
    await expect(
      mockDataService.enforcement.getEnforcementSettings(supplier),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('hands out a COPY — a reader cannot append to the ledger by mutating what it read', async () => {
    const page = await mockDataService.enforcement.getEnforcementSettings(buyer);
    page.items.push({ checkId: 'bpom.lot' } as never);
    expect(enforcementSettingStore.all()).toEqual([]);
  });
});
