// ─── Enums ────────────────────────────────────────────────────────────────────

export enum POStatus {
  SENT = 'Sent',
  VIEWED = 'Viewed',
  ACKNOWLEDGED = 'Acknowledged',
  CONFIRMED = 'Confirmed',
  PARTIALLY_DELIVERED = 'Partially Delivered',
  DELIVERED = 'Delivered',
  CLOSED = 'Closed',
}

export enum ChannelType {
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email',
  WEB = 'Web',
  API = 'API',
}

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
