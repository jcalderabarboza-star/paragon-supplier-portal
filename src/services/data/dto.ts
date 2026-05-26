// ────────────────────────────────────────────────────────────────────────────
// DTO bridges — coerce legacy dual-field mock records into the canonical
// drift-resolved shape returned by IDataService.
//
// Legacy types/purchaseOrder.types.ts still exports the dual-field PurchaseOrder
// for unmigrated pages. Once every page reads through the data layer (end of
// Batch 1B.2), the legacy dual-field type is removed in Batch 1B.3.
// ────────────────────────────────────────────────────────────────────────────

import type {
  PurchaseOrder as LegacyPurchaseOrder,
  POLineItem as LegacyPOLineItem,
} from '../../types/purchaseOrder.types';

import type {
  PurchaseOrder,
  POLineItem,
  POSummary,
} from './types';

function toCanonicalLineItem(li: LegacyPOLineItem): POLineItem {
  return {
    id: li.id,
    materialCode: li.materialCode,
    description: li.description,
    // Canonical: quantity (drop qty alias). The legacy file populates both
    // with the same value; prefer `quantity` and fall back to `qty` defensively.
    quantity: li.quantity ?? li.qty,
    // Canonical: uom (drop unit alias).
    uom: li.uom ?? li.unit,
    unitPrice: li.unitPrice,
    confirmedQty: li.confirmedQty,
  };
}

export function toCanonicalPO(legacy: LegacyPurchaseOrder): PurchaseOrder {
  return {
    id: legacy.id,
    poNumber: legacy.poNumber,
    prReference: legacy.prReference,
    sourceOfSupply: legacy.sourceOfSupply,
    supplierId: legacy.supplierId,
    supplierName: legacy.supplierName,
    // Canonical: status (drop poStatus alias).
    status: legacy.status ?? legacy.poStatus,
    channel: legacy.channel,
    currency: legacy.currency,
    // Canonical: totalValue (drop totalAmount alias).
    totalValue: legacy.totalValue ?? legacy.totalAmount,
    // Canonical: orderDate (drop createdDate alias).
    orderDate: legacy.orderDate ?? legacy.createdDate,
    requestedDeliveryDate: legacy.requestedDeliveryDate,
    confirmedDeliveryDate: legacy.confirmedDeliveryDate,
    daysOverdue: legacy.daysOverdue,
    acknowledgmentTimeHours: legacy.acknowledgmentTimeHours,
    lineItems: legacy.lineItems.map(toCanonicalLineItem),
  };
}

export function toCanonicalPOs(
  legacy: readonly LegacyPurchaseOrder[],
): PurchaseOrder[] {
  return legacy.map(toCanonicalPO);
}

export function toPOSummary(po: PurchaseOrder): POSummary {
  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplierName,
    status: po.status,
    totalValue: po.totalValue,
    orderDate: po.orderDate,
    daysOverdue: po.daysOverdue,
  };
}
