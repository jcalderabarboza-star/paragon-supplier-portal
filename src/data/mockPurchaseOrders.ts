import { PurchaseOrder } from '../types/purchaseOrder.types';

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-001',
    poNumber: 'PO-2024-00123',
    supplierId: 'sup-001',
    supplierName: 'Acme Industrial Co.',
    status: 'open',
    totalAmount: 45200,
    currency: 'USD',
    createdDate: '2024-11-01',
    deliveryDate: '2024-12-15',
    lineItems: [
      { id: 'li-001', description: 'Steel Rods 10mm', quantity: 500, unitPrice: 90.4, unit: 'pcs' },
    ],
  },
  {
    id: 'po-002',
    poNumber: 'PO-2024-00124',
    supplierId: 'sup-002',
    supplierName: 'GlobalTech Supplies',
    status: 'shipped',
    totalAmount: 12750,
    currency: 'USD',
    createdDate: '2024-10-20',
    deliveryDate: '2024-11-30',
    lineItems: [
      { id: 'li-002', description: 'PCB Assembly v2', quantity: 150, unitPrice: 85, unit: 'pcs' },
    ],
  },
  {
    id: 'po-003',
    poNumber: 'PO-2024-00125',
    supplierId: 'sup-003',
    supplierName: 'NovaParts Ltd.',
    status: 'pending',
    totalAmount: 8900,
    currency: 'USD',
    createdDate: '2024-11-05',
    deliveryDate: '2025-01-10',
    lineItems: [
      { id: 'li-003', description: 'Connector Harness A4', quantity: 200, unitPrice: 44.5, unit: 'pcs' },
    ],
  },
];
