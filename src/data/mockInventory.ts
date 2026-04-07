export interface InventoryItem {
  id: string;
  sku: string;
  description: string;
  supplierId: string;
  supplierName: string;
  quantityOnHand: number;
  quantityOnOrder: number;
  reorderPoint: number;
  unit: string;
  lastUpdated: string;
}

export const mockInventory: InventoryItem[] = [
  {
    id: 'inv-001',
    sku: 'SKU-STEEL-10MM',
    description: 'Steel Rods 10mm',
    supplierId: 'sup-001',
    supplierName: 'Acme Industrial Co.',
    quantityOnHand: 1200,
    quantityOnOrder: 500,
    reorderPoint: 300,
    unit: 'pcs',
    lastUpdated: '2024-11-10',
  },
  {
    id: 'inv-002',
    sku: 'SKU-PCB-V2',
    description: 'PCB Assembly v2',
    supplierId: 'sup-002',
    supplierName: 'GlobalTech Supplies',
    quantityOnHand: 85,
    quantityOnOrder: 150,
    reorderPoint: 50,
    unit: 'pcs',
    lastUpdated: '2024-11-08',
  },
  {
    id: 'inv-003',
    sku: 'SKU-CONN-A4',
    description: 'Connector Harness A4',
    supplierId: 'sup-003',
    supplierName: 'NovaParts Ltd.',
    quantityOnHand: 320,
    quantityOnOrder: 200,
    reorderPoint: 100,
    unit: 'pcs',
    lastUpdated: '2024-11-09',
  },
];
