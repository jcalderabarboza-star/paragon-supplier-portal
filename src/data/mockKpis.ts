import { KpiItem } from '../types/kpi.types';

export const mockBuyerKpis: KpiItem[] = [
  { id: 'kpi-001', label: 'Active Suppliers', value: 42, trend: 5, category: 'buyer' },
  { id: 'kpi-002', label: 'Open POs', value: 18, trend: -2, category: 'buyer' },
  { id: 'kpi-003', label: 'On-Time Delivery', value: '94.2', unit: '%', trend: 1.3, category: 'buyer' },
  { id: 'kpi-004', label: 'Total Spend YTD', value: '2.4M', unit: 'USD', trend: 8, category: 'buyer' },
];

export const mockSupplierKpis: KpiItem[] = [
  { id: 'kpi-005', label: 'Open Orders', value: 7, trend: 0, category: 'supplier' },
  { id: 'kpi-006', label: 'Pending Invoices', value: 3, trend: -1, category: 'supplier' },
  { id: 'kpi-007', label: 'Fill Rate', value: '97.8', unit: '%', trend: 0.5, category: 'supplier' },
  { id: 'kpi-008', label: 'Revenue MTD', value: '148K', unit: 'USD', trend: 12, category: 'supplier' },
];
