import { mockSuppliers } from '../../../data/mockSuppliers';
import type { ISupplierService, Page, QueryScope, Supplier } from '../types';
import { DataError } from '../types';

export class MockSupplierService implements ISupplierService {
  async list(scope: QueryScope): Promise<Page<Supplier>> {
    if (scope.personaType === 'supplier') return { items: [] };
    return { items: [...mockSuppliers] };
  }

  async getById(scope: QueryScope, id: string): Promise<Supplier | null> {
    // Scope violation: a supplier persona may only read its own record.
    // This is the live SCOPE_DENIED path (was a silent null before DR-4).
    if (scope.personaType === 'supplier' && scope.supplierId !== id)
      throw new DataError(
        'SCOPE_DENIED',
        `Supplier ${scope.supplierId ?? '(none)'} may not read supplier ${id}`,
      );
    return mockSuppliers.find((s) => s.id === id) ?? null;
  }

  async getCurrent(scope: QueryScope): Promise<Supplier | null> {
    if (scope.personaType !== 'supplier' || !scope.supplierId) return null;
    return mockSuppliers.find((s) => s.id === scope.supplierId) ?? null;
  }
}
