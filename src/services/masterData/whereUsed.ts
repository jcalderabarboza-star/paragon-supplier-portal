// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · WHERE USED — the documents and records that name a master key.
//
// Derived at read, never stored: it is what tells a reader how much a change to
// a record would touch. Each row is a kind, a count and the page that lists
// those documents.
//
// The sources are an ARGUMENT, defaulted to the stores, so a spec can prove a
// count without mutating a store.
//
// What is counted, said plainly so a zero is not over-read:
//   · a material  — purchase orders with a line for it, preferred-supplier
//                   listings scoped to it, certificates that cover it
//   · a supplier  — its purchase orders, invoices, contracts, preferred-supplier
//                   listings and certificates
//   · a reference value — the replica records that carry it (materials by unit,
//                   type and group; suppliers by country, payment term and
//                   incoterm), purchase orders by currency, requisitions by
//                   cost centre. A plant or a storage location is named by no
//                   stored document today, so it counts nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { mockContracts } from '../../data/mockContracts';
import { COMPLIANCE_REGISTRY } from '../data/mock/fixtures/complianceRegistry';
import { invoiceStore } from '../data/mock/stores/invoiceStore';
import { pslStore } from '../data/mock/stores/pslStore';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import {
  isMaterialRecord,
  isSupplierRecord,
  type MasterRecord,
  type MaterialRecord,
  type SupplierRecord,
} from './types';

export type WhereUsedKind =
  | 'purchaseOrder'
  | 'invoice'
  | 'contract'
  | 'preferredListing'
  | 'certificate'
  | 'requisition'
  | 'material'
  | 'supplier';

/** The page that lists each kind. `material` and `supplier` are views of the master-data page itself. */
export const WHERE_USED_PATH: Record<WhereUsedKind, string> = {
  purchaseOrder: '/buyer/orders',
  invoice: '/buyer/invoices',
  contract: '/buyer/contracts',
  preferredListing: '/buyer/preferred-suppliers',
  certificate: '/buyer/compliance',
  requisition: '/buyer/purchase-requisition',
  material: '/buyer/master-data',
  supplier: '/buyer/master-data',
};

export interface WhereUsedRow {
  readonly kind: WhereUsedKind;
  readonly count: number;
}

export interface WhereUsed {
  readonly total: number;
  /** Every kind that can name this object, including the ones that count zero. */
  readonly rows: readonly WhereUsedRow[];
}

/** The documents where-used reads. Each is the smallest shape the count needs. */
export interface WhereUsedSources {
  readonly purchaseOrders: readonly { supplierId: string; currency: string; lineItems: readonly { materialCode: string }[] }[];
  readonly invoices: readonly { supplierId: string }[];
  readonly contracts: readonly { supplierId: string }[];
  readonly listings: readonly { supplierId: string; scope: { kind: string; materialCodes?: readonly string[] } }[];
  readonly certificates: readonly { supplierId: string; materialCodes: readonly string[] }[];
  readonly requisitions: readonly { costCenter: string }[];
  readonly materials: readonly MaterialRecord[];
  readonly suppliers: readonly SupplierRecord[];
}

/** The stores and fixtures as they stand now, with the replica's own records supplied by the caller. */
export function liveSources(replica: Pick<WhereUsedSources, 'materials' | 'suppliers'>): WhereUsedSources {
  return {
    purchaseOrders: purchaseOrderStore.all(),
    invoices: invoiceStore.all(),
    contracts: mockContracts,
    listings: pslStore.all(),
    certificates: COMPLIANCE_REGISTRY,
    requisitions: purchaseRequisitionStore.all(),
    ...replica,
  };
}

const count = <T>(rows: readonly T[], names: (row: T) => boolean): number => rows.filter(names).length;

function rowsFor(record: MasterRecord, src: WhereUsedSources): WhereUsedRow[] {
  const key = record.key;
  if (isMaterialRecord(record)) {
    return [
      { kind: 'purchaseOrder', count: count(src.purchaseOrders, (po) => po.lineItems.some((l) => l.materialCode === key)) },
      {
        kind: 'preferredListing',
        count: count(src.listings, (l) => l.scope.kind === 'material' && (l.scope.materialCodes ?? []).includes(key)),
      },
      { kind: 'certificate', count: count(src.certificates, (c) => c.materialCodes.includes(key)) },
    ];
  }
  if (isSupplierRecord(record)) {
    const id = record.data.portalSupplierId;
    return [
      { kind: 'purchaseOrder', count: count(src.purchaseOrders, (po) => po.supplierId === id) },
      { kind: 'invoice', count: count(src.invoices, (i) => i.supplierId === id) },
      { kind: 'contract', count: count(src.contracts, (c) => c.supplierId === id) },
      { kind: 'preferredListing', count: count(src.listings, (l) => l.supplierId === id) },
      { kind: 'certificate', count: count(src.certificates, (c) => c.supplierId === id) },
    ];
  }
  const materials = (names: (m: MaterialRecord) => boolean): WhereUsedRow => ({ kind: 'material', count: count(src.materials, names) });
  const suppliers = (names: (s: SupplierRecord) => boolean): WhereUsedRow => ({ kind: 'supplier', count: count(src.suppliers, names) });
  switch (record.object) {
    case 'unit':
      return [materials((m) => m.data.baseUnit === key)];
    case 'materialType':
      return [materials((m) => m.data.materialType === key)];
    case 'materialGroup':
      return [materials((m) => m.data.materialGroup === key)];
    case 'country':
      return [suppliers((s) => s.data.country === key)];
    case 'paymentTerm':
      return [suppliers((s) => s.data.paymentTerm === key)];
    case 'incoterm':
      return [suppliers((s) => s.data.incoterm === key)];
    case 'currency':
      return [{ kind: 'purchaseOrder', count: count(src.purchaseOrders, (po) => po.currency === key) }];
    case 'costCentre':
      return [{ kind: 'requisition', count: count(src.requisitions, (r) => r.costCenter === key) }];
    default:
      return [];
  }
}

export function whereUsedOf(record: MasterRecord, sources: WhereUsedSources): WhereUsed {
  const rows = rowsFor(record, sources);
  return { total: rows.reduce((sum, r) => sum + r.count, 0), rows };
}
