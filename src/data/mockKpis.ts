import {
  KpiItem,
  PortalOverallKpis,
  KpiByCategory,
  PortalTrendPoint,
  ChannelAdoptionMetrics,
  OnboardingFunnel,
  PortalAlerts,
  PortalKpiSummary,
} from '../types/kpi.types';

// ─── Buyer & Supplier KPI cards (hook-compatible, KpiItem[]) ────────────────

export const mockBuyerKpis: KpiItem[] = [
  { id: 'kpi-001', label: 'Active Suppliers', value: 28, trend: 4, category: 'buyer' },
  { id: 'kpi-002', label: 'Open POs', value: 9, trend: -1, category: 'buyer' },
  { id: 'kpi-003', label: 'OTIF', value: '87', unit: '%', trend: 1.2, category: 'buyer' },
  { id: 'kpi-004', label: 'Total Spend YTD', value: '12.8B', unit: 'IDR', trend: 9, category: 'buyer' },
];

export const mockSupplierKpis: KpiItem[] = [
  { id: 'kpi-005', label: 'Open Orders', value: 4, trend: 0, category: 'supplier' },
  { id: 'kpi-006', label: 'Pending Invoices', value: 2, trend: -1, category: 'supplier' },
  { id: 'kpi-007', label: 'Fill Rate', value: '97.8', unit: '%', trend: 0.5, category: 'supplier' },
  { id: 'kpi-008', label: 'Revenue MTD', value: '2.1B', unit: 'IDR', trend: 12, category: 'supplier' },
];

// ─── Portal-wide overall KPIs ────────────────────────────────────────────────

export const mockPortalOverallKpis: PortalOverallKpis = {
  otif: 87,
  otdr: 91,
  avgPOCycleTimeHours: 18,
  invoiceAccuracy: 94,
  avgLeadTimeAdherence: 89,
};

// ─── KPIs by category ────────────────────────────────────────────────────────

export const mockKpisByCategory: KpiByCategory[] = [
  { category: 'Raw Material', otif: 91, otdr: 94, supplierCount: 4 },
  { category: 'Fragrance', otif: 89, otdr: 92, supplierCount: 3 },
  { category: 'Active Ingredient', otif: 85, otdr: 88, supplierCount: 4 },
  { category: 'Packaging', otif: 80, otdr: 85, supplierCount: 3 },
];

// ─── 6-month trend data ───────────────────────────────────────────────────────

export const mockTrendData: PortalTrendPoint[] = [
  { month: 'Oct-24', otif: 82, otdr: 86 },
  { month: 'Nov-24', otif: 83, otdr: 87 },
  { month: 'Dec-24', otif: 84, otdr: 88 },
  { month: 'Jan-25', otif: 85, otdr: 89 },
  { month: 'Feb-25', otif: 86, otdr: 90 },
  { month: 'Mar-25', otif: 87, otdr: 91 },
];

// ─── Channel adoption (percentage of POs by channel) ─────────────────────────

export const mockChannelAdoption: ChannelAdoptionMetrics = {
  whatsapp: 34,
  email: 18,
  web: 41,
  api: 7,
};

// ─── Onboarding funnel ────────────────────────────────────────────────────────

export const mockOnboardingFunnel: OnboardingFunnel = {
  invited: 45,
  registered: 38,
  verified: 31,
  active: 28,
};

// ─── Alert counts ─────────────────────────────────────────────────────────────

export const mockAlerts: PortalAlerts = {
  expiringCertificates: 2,
  unacknowledgedPOs: 3,
  criticalStock: 2,
  lowStock: 4,
};

// ─── Composite KPI summary ────────────────────────────────────────────────────

export const mockPortalKpiSummary: PortalKpiSummary = {
  overall: mockPortalOverallKpis,
  byCategory: mockKpisByCategory,
  channelAdoption: mockChannelAdoption,
  onboardingFunnel: mockOnboardingFunnel,
  alerts: mockAlerts,
};
