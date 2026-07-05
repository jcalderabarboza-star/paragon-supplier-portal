// PO enums relocated to services/data/types.ts (canonical home). Re-imported
// here so this legacy dual-field file keeps ONE enum identity with the
// canonical shape until it is retired (Batch 1.4).
import { POStatus, ChannelType } from '../services/data/types';

// ─── Line item interface ──────────────────────────────────────────────────────

export interface POLineItem {
  id: string;
  materialCode: string;
  description: string;
  quantity: number;
  qty: number;
  uom: string;
  unit: string;
  unitPrice: number;
  confirmedQty: number;
}

// ─── Purchase Order interfaces ────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prReference?: string;
  sourceOfSupply?: string;
  supplierId: string;
  supplierName: string;
  status: POStatus;
  poStatus: POStatus;
  channel: ChannelType;
  currency: string;
  totalAmount: number;
  totalValue: number;
  orderDate: string;
  createdDate: string;
  requestedDeliveryDate: string;
  confirmedDeliveryDate: string;
  deliveryDate: string;
  daysOverdue: number;
  acknowledgmentTimeHours: number;
  lineItems: POLineItem[];
}

export interface POSummary {
  id: string;
  poNumber: string;
  supplierName: string;
  status: POStatus;
  totalValue: number;
  orderDate: string;
  daysOverdue: number;
}
