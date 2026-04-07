// ─── Generic KPI card item (used by buyer/supplier dashboards) ────────────────

export interface KpiItem {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  category?: string;
}

// ─── Trend data ───────────────────────────────────────────────────────────────

/** Generic single-value trend point */
export interface KpiTrendPoint {
  date: string;
  value: number;
}

/** Portal-specific dual-metric monthly trend (OTIF + OTDR) */
export interface PortalTrendPoint {
  month: string;
  otif: number;
  otdr: number;
}

// ─── Portal-wide KPI structures ───────────────────────────────────────────────

export interface PortalOverallKpis {
  otif: number;
  otdr: number;
  avgPOCycleTimeHours: number;
  invoiceAccuracy: number;
  avgLeadTimeAdherence: number;
}

export interface KpiByCategory {
  category: string;
  otif: number;
  otdr: number;
  supplierCount: number;
}

export interface ChannelAdoptionMetrics {
  whatsapp: number;
  email: number;
  web: number;
  api: number;
}

export interface OnboardingFunnel {
  invited: number;
  registered: number;
  verified: number;
  active: number;
}

export interface PortalAlerts {
  expiringCertificates: number;
  unacknowledgedPOs: number;
  criticalStock: number;
  lowStock: number;
}

// ─── Composite summary ────────────────────────────────────────────────────────

export interface PortalKpiSummary {
  overall: PortalOverallKpis;
  byCategory: KpiByCategory[];
  channelAdoption: ChannelAdoptionMetrics;
  onboardingFunnel: OnboardingFunnel;
  alerts: PortalAlerts;
}
