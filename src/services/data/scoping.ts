// ────────────────────────────────────────────────────────────────────────────
// Identity-scoping enforcement.
//
// Every IProcurementService method that returns a per-supplier entity pipes
// rows through applySupplierScope exactly once, inside the mock impl. Pages
// never see the unfiltered array — a supplier query CANNOT return another
// supplier's data.
// ────────────────────────────────────────────────────────────────────────────

import type { QueryScope } from './types';

export function applySupplierScope<T extends { supplierId: string }>(
  scope: QueryScope,
  rows: readonly T[],
): T[] {
  if (scope.personaType === 'buyer') return [...rows];
  if (!scope.supplierId) return []; // 1A invariant says unreachable; defence in depth
  return rows.filter((r) => r.supplierId === scope.supplierId);
}
