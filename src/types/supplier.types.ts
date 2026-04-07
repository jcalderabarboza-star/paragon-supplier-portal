// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SupplierTier {
  WHATSAPP = 1,
  WEB = 2,
  API = 3,
}

export enum SupplierStatus {
  ACTIVE = 'Active',
  ONBOARDING = 'Onboarding',
  SUSPENDED = 'Suspended',
}

export enum PreferredChannel {
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email',
  WEB = 'Web',
  API = 'API',
}

export enum ScorecardGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export enum StockStatus {
  CRITICAL = 'Critical',
  LOW = 'Low',
  NORMAL = 'Normal',
  EXCESS = 'Excess',
}

// ─── Supplier interfaces ──────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  sapBpNumber: string;
  name: string;
  category: string;
  country: string;
  city: string;
  tier: SupplierTier;
  status: SupplierStatus;
  contactName: string;
  email: string;
  contactEmail: string;
  phone: string;
  contactPhone: string;
  rating: number;
  onboardedDate: string;
  lastActivityDate: string;
  halalCertified: boolean;
  bpomRegistered: boolean;
  certExpiryDate: string;
  preferredChannel: PreferredChannel;
  otif: number;
  leadTimeAdherence: number;
  invoiceAccuracy: number;
  scorecardGrade: ScorecardGrade;
}

export interface SupplierSummary {
  id: string;
  name: string;
  category: string;
  status: SupplierStatus;
  tier: SupplierTier;
  scorecardGrade: ScorecardGrade;
  otif: number;
  country: string;
}

// ─── Inventory interface ──────────────────────────────────────────────────────

export interface InventoryRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  materialCode: string;
  materialDescription: string;
  qtyOnHand: number;
  qtyAvailable: number;
  qtyReserved: number;
  qtyInTransit: number;
  uom: 'KG' | 'L' | 'PCS' | 'MT';
  daysOfSupply: number;
  avgDailyDemand: number;
  lastUpdated: string;
  dataSource: 'API Push' | 'Manual' | 'EDI 846';
  stockStatus: StockStatus;
  location: string;
}
