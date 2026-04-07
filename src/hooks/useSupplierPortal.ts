import { useState } from 'react';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import { mockInventory } from '../data/mockInventory';
import { mockBuyerKpis, mockSupplierKpis } from '../data/mockKpis';
import { Supplier } from '../types/supplier.types';
import { PurchaseOrder } from '../types/purchaseOrder.types';

export const useSupplierPortal = () => {
  const [suppliers] = useState<Supplier[]>(mockSuppliers);
  const [purchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [inventory] = useState(mockInventory);
  const [buyerKpis] = useState(mockBuyerKpis);
  const [supplierKpis] = useState(mockSupplierKpis);

  return {
    suppliers,
    purchaseOrders,
    inventory,
    buyerKpis,
    supplierKpis,
  };
};
