export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'open' | 'pending' | 'approved' | 'shipped' | 'delivered' | 'closed' | 'rejected';
  totalAmount: number;
  currency: string;
  createdDate: string;
  deliveryDate: string;
  lineItems: PurchaseOrderLineItem[];
}

export interface PurchaseOrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}
