import { describe, expect, it } from 'vitest';
import { MockDeliveryService } from './MockDeliveryService';
import type { QueryScope } from '../types';

const BUYER: QueryScope = { personaType: 'buyer', supplierId: null };
const svc = new MockDeliveryService();

describe('MockDeliveryService — per-contract scoping (contractId query)', () => {
  it('no query → the buyer superset (both the pristine anchor and the demo)', async () => {
    const page = await svc.getAgreements(BUYER);
    const contractIds = page.items.map((v) => v.agreement.contractId).sort();
    // ctr-003 (pristine sa-0001) + ctr-013 (demo sa-0002).
    expect(contractIds).toContain('ctr-003');
    expect(contractIds).toContain('ctr-013');
  });

  it('contractId narrows to that one contract only', async () => {
    const page = await svc.getAgreements(BUYER, { contractId: 'ctr-013' });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].agreement.contractId).toBe('ctr-013');
    expect(page.items[0].agreement.id).toBe('sa-0002');
  });

  it('a contract with no agreement returns empty (no demo leak)', async () => {
    const page = await svc.getAgreements(BUYER, { contractId: 'ctr-001' });
    expect(page.items).toEqual([]);
  });

  it('a supplier persona never widens past its own via contractId', async () => {
    // sup-002 asking for ctr-013 (a sup-007 contract) sees nothing — supplier
    // scope is applied BEFORE the contractId narrow.
    const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };
    const page = await svc.getAgreements(supplier, { contractId: 'ctr-013' });
    expect(page.items).toEqual([]);
  });
});
