import { mockSuppliers } from '../../../data/mockSuppliers';
import type { ISupplierService, QueryScope, Supplier } from '../types';

export class MockSupplierService implements ISupplierService {
  async list(scope: QueryScope): Promise<Supplier[]> {
    if (scope.personaType === 'supplier') return [];
    return [...mockSuppliers];
  }

  async getById(scope: QueryScope, id: string): Promise<Supplier | null> {
    if (scope.personaType === 'supplier' && scope.supplierId !== id) return null;
    return mockSuppliers.find((s) => s.id === id) ?? null;
  }

  async getCurrent(scope: QueryScope): Promise<Supplier | null> {
    if (scope.personaType !== 'supplier' || !scope.supplierId) return null;
    return mockSuppliers.find((s) => s.id === scope.supplierId) ?? null;
  }
}
