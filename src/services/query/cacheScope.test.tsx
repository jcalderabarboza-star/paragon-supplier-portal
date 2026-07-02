import { waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import type { BuyerInvoice, Page } from '../data/types';
import { useBuyerInvoices } from './hooks';

// supplier-A is the seeded sup-007; supplier-B is a different supplier.
const SUPPLIER_A = SUPPLIER; // sup-007
const SUPPLIER_B: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'Supplier B',
};

const Probe: React.FC = () => {
  useBuyerInvoices();
  return null;
};

const scopeKeyOf = (key: readonly unknown[]) => key[key.length - 1] as string;
const pageOf = (data: unknown) => data as Page<BuyerInvoice>;

describe('scoping invariant as a cache concern', () => {
  it('buyer / supplier-A / supplier-B produce distinct cache entries; B never sees A data', async () => {
    // One shared client across three identity renders — inspect it directly.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderWithProviders(<Probe />, { queryClient: client }); // buyer (default identity)
    renderWithProviders(<Probe />, { identity: SUPPLIER_A, queryClient: client });
    renderWithProviders(<Probe />, { identity: SUPPLIER_B, queryClient: client });

    await waitFor(() => {
      const settled = client
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.status === 'success');
      expect(settled.length).toBe(3);
    });

    const entries = client.getQueryCache().getAll();

    // Three DISTINCT cache entries, one per scope — no shared/bled entry.
    expect(entries.length).toBe(3);
    const scopeKeys = entries.map((e) => scopeKeyOf(e.queryKey));
    expect(new Set(scopeKeys)).toEqual(
      new Set(['buyer:all', 'supplier:sup-007', 'supplier:sup-002']),
    );

    const dataFor = (sk: string) => {
      const entry = entries.find((e) => scopeKeyOf(e.queryKey) === sk);
      return pageOf(entry!.state.data).items;
    };

    const aData = dataFor('supplier:sup-007');
    const bData = dataFor('supplier:sup-002');

    // Each supplier entry is scoped to its own supplier only.
    expect(aData.length).toBeGreaterThan(0);
    expect(bData.length).toBeGreaterThan(0);
    expect(aData.every((i) => i.supplierId === 'sup-007')).toBe(true);
    expect(bData.every((i) => i.supplierId === 'sup-002')).toBe(true);

    // Supplier-B never observes any of supplier-A's rows.
    const bIds = new Set(bData.map((i) => i.id));
    expect(aData.some((i) => bIds.has(i.id))).toBe(false);
  });
});
