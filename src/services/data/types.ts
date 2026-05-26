// ────────────────────────────────────────────────────────────────────────────
// Phase 1B — Data Layer Interface Contract
//
// Single source of truth for the data-access shape that pages depend on.
// At Phase 3 the real NestJS/SAP adapter implements these same interfaces;
// pages stay unchanged across the swap.
//
// Drift-resolved canonical names (locked):
//   PurchaseOrder.totalValue      (was totalAmount/totalValue)
//   PurchaseOrder.status          (was status/poStatus)
//   PurchaseOrder.orderDate       (was orderDate/createdDate)
//     dropped: PurchaseOrder.deliveryDate (use requestedDeliveryDate / confirmedDeliveryDate)
//   POLineItem.quantity           (was quantity/qty)
//   POLineItem.uom                (was uom/unit)
// ────────────────────────────────────────────────────────────────────────────

import type {
  Supplier,
  SupplierStatus,
  SupplierTier,
  PreferredChannel,
  ScorecardGrade,
  StockStatus,
  InventoryRecord,
} from '../../types/supplier.types';

import type {
  POStatus,
  ChannelType,
} from '../../types/purchaseOrder.types';

import type {
  Shipment,
  ShipmentLineItem,
  ShipmentStatus,
  ShipmentMode,
} from '../../data/mockShipments';

import type {
  GoodsReceipt,
  GRStatus,
  Disposition,
  CheckResult,
  OptionalCheck,
  InspectionResult,
} from '../../data/mockGoodsReceipts';

import type {
  Contract,
  ContractType,
  ContractStatus,
} from '../../data/mockContracts';

import type {
  ContractObligation,
  ObligationStatus,
  ObligationCategory,
  ObligationOwner,
  ObligationRecurrence,
} from '../../data/mockObligations';

import type { RFQ, RFQStatus, RFQCategory } from '../../data/mockRfqs';
import type { Quotation, QuotationStatus } from '../../data/mockQuotations';

// ─── Re-exports — entities without drift, single source ─────────────────────

export type {
  Supplier,
  SupplierStatus,
  SupplierTier,
  PreferredChannel,
  ScorecardGrade,
  StockStatus,
  InventoryRecord,
  POStatus,
  ChannelType,
  Shipment,
  ShipmentLineItem,
  ShipmentStatus,
  ShipmentMode,
  GoodsReceipt,
  GRStatus,
  Disposition,
  CheckResult,
  OptionalCheck,
  InspectionResult,
  Contract,
  ContractType,
  ContractStatus,
  ContractObligation,
  ObligationStatus,
  ObligationCategory,
  ObligationOwner,
  ObligationRecurrence,
  RFQ,
  RFQStatus,
  RFQCategory,
  Quotation,
  QuotationStatus,
};

// ─── Identity scope — derived from CurrentIdentity at the page boundary ─────

export interface QueryScope {
  personaType: 'buyer' | 'supplier';
  supplierId: string | null;
}

// ─── Canonical Purchase Order (drift-resolved) ──────────────────────────────

export interface POLineItem {
  id: string;
  materialCode: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  confirmedQty: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prReference?: string;
  sourceOfSupply?: string;
  supplierId: string;
  supplierName: string;
  status: POStatus;
  channel: ChannelType;
  currency: string;
  totalValue: number;
  orderDate: string;
  requestedDeliveryDate: string;
  confirmedDeliveryDate: string;
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

// ─── Supplier-facing entities currently inline in pages ─────────────────────
// Mirrored from inline page declarations; gain `supplierId` so the data layer
// can enforce scoping structurally once fixtures are relocated (Batch 2).

export type SupplierDocumentStatus =
  | 'Valid'
  | 'Expiring Soon'
  | 'Expired'
  | 'Awaiting Upload'
  | 'Under Review';

export type SupplierDocumentCategory =
  | 'Halal Compliance'
  | 'BPOM Regulatory'
  | 'Tax & Legal'
  | 'Quality'
  | 'Contract'
  | 'Other';

export interface SupplierDocument {
  id: string;
  supplierId: string;
  name: string;
  category: SupplierDocumentCategory;
  status: SupplierDocumentStatus;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string | null;
  fileType: string;
  fileSize: string;
  version: string;
  linkedTo: string;
  notes?: string;
}

export type SupplierInvoiceStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Payment Released'
  | 'Remittance Received'
  | 'Overdue'
  | 'Disputed';

export type InvoiceChannel = 'WhatsApp' | 'Web' | 'Email' | 'API';

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  poNumber: string;
  amount: number;
  status: SupplierInvoiceStatus;
  submittedDate: string;
  dueDate: string;
  paymentDate: string | null;
  paymentRef: string | null;
  bankAccount: string;
  sapFiDoc: string | null;
  channel: InvoiceChannel;
  buyerContact: string;
  remittanceNote: string | null;
}

export type BuyerInvoiceStatus =
  | 'Pending Match'
  | 'Approved'
  | 'Disputed'
  | 'Payment Released'
  | 'Overdue';

export type InvoiceMatchStatus =
  | 'Matched'
  | 'Pending GR'
  | 'Qty Mismatch'
  | 'Price Variance'
  | 'Pending';

export interface BuyerInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierId: string;
  poNumber: string;
  poId: string;
  amount: number;
  currency: string;
  status: BuyerInvoiceStatus;
  receivedDate: string;
  dueDate: string;
  paymentDate: string | null;
  matchStatus: InvoiceMatchStatus;
  sapFiDoc: string | null;
  sapGrDoc: string | null;
  approver: string;
  paymentTerms: string;
  daysOutstanding: number;
  bankAccount: string;
  channel: InvoiceChannel;
}

export type AsnStatus =
  | 'Draft'
  | 'Submitted'
  | 'In Transit'
  | 'Delivered'
  | 'Discrepancy';

export interface AsnLineItem {
  materialCode: string;
  description: string;
  orderedQty: number;
  shippedQty: number;
  lotNumber: string;
}

export interface AsnShipmentDetails {
  originCity: string;
  destinationWarehouse: string;
  totalCartons: number;
  grossWeightKg: number;
  temperatureRequirement: string;
}

export interface ASN {
  asnNumber: string;
  supplierId: string;
  poReference: string;
  status: AsnStatus;
  carrier: string;
  trackingNumber: string;
  eta: string;
  details: AsnShipmentDetails;
  lineItems: AsnLineItem[];
}

export interface CatalogItem {
  id: string;
  supplierId: string;
  material: string;
  sapCode: string;
  category: string;
  moq: string;
  uom: string;
  leadTime: string;
  unitPrice: string;
  currency: string;
  certs: string[];
  capacity: string;
  visible: boolean;
}

export type ProfileCertStatus =
  | 'valid'
  | 'expiring'
  | 'expired'
  | 'missing'
  | 'pending';

export interface ProfileCert {
  supplierId: string;
  name: string;
  visible: boolean;
  status: ProfileCertStatus;
  expiry: string | null;
}

export interface StorefrontProduct {
  supplierId: string;
  name: string;
  code: string;
  moq: string;
  leadTime: string;
}

// ─── Performance / KPI snapshots ────────────────────────────────────────────

export type KpiTrend = '↑' | '↓' | '→';

export interface KpiPoint {
  name: string;
  value: string;
  target: string;
  pct: number;
  color: string;
  trend: KpiTrend;
}

export interface RadarPoint {
  axis: string;
  value: number;
  target: number;
}

export interface KpiSnapshot {
  kpis: KpiPoint[];
  radar: RadarPoint[];
  trend: PerformancePoint[];
  improvementActions: ImprovementAction[];
}

export interface ImprovementAction {
  kpi: string;
  current: string;
  target: string;
  gap: string;
  action: string;
  priority: 'High' | 'Medium' | 'Low';
}

export type TrendRange = '7d' | '30d' | '90d' | '12m';

export interface PerformancePoint {
  week: string;
  otif: number;
  asnAcc: number;
  defect: number;
  ackHrs: number;
}

// ─── Risk / Compliance entities (buyer-side, inline today) ──────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskAlertLevel = 'critical' | 'warning' | 'info';

export interface RiskAlert {
  id: string;
  level: RiskAlertLevel;
  title: string;
  body: string;
}

export interface GeoRisk {
  region: string;
  country: string;
  flag: string;
  severity: RiskSeverity;
  score: number;
  trend: 'rising' | 'stable' | 'declining';
  event: string;
  impact: string;
  exposure: string;
  suppliers: string[];
  mitigation: string;
  probability: number;
  timeline: string;
}

export interface ExposureRow {
  category: string;
  supplier: string;
  region: string;
  spend: number;
  dos: number;
  risk: RiskSeverity;
  dualSource: boolean;
}

export type ComplianceState = 'ok' | 'expiring' | 'expired';

export interface ComplianceRow {
  supplier: string;
  type: string;
  expires: string;
  daysLeft: number;
  status: ComplianceState;
}

export interface Commodity {
  name: string;
  unit: string;
  current: number;
  change: number;
  alert: number;
  alertDir: 'above' | 'below';
  color: string;
  spark: { t: number; v: number }[];
}

// ─── Discovery / Recommendation entities (buyer-side, inline today) ─────────

export interface GlobalSupplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  region: string;
  categories: string[];
  certifications: string[];
  validatedBy: string[];
  matchScore: number;
  description: string;
  employees: string;
  founded: string;
  halalCertified: boolean;
  alreadyInNetwork: boolean;
}

export interface RecommendedSupplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  matchScore: number;
  whyRecommended: string;
  covers: string;
  riskNote?: string;
  storefrontPath: string;
}

export type QualificationStatus = 'On Track' | 'At Risk' | 'Blocked';

export interface QualificationItem {
  supplier: string;
  flag: string;
  stage: number;
  stageName: string;
  stageTotal: number;
  startDate: string;
  owner: string;
  nextAction: string;
  dueDate: string;
  status: QualificationStatus;
}

export interface MarketIntelCard {
  category: string;
  marketStatus: string;
  suppliersGlobal: number;
  suppliersParagon: number;
  priceTrend: string;
  priceDir: 'up' | 'down' | 'flat';
  recommendation: string;
}

export type SingleSourceRiskLevel = 'Critical' | 'High' | 'Medium';

export interface SingleSourceItem {
  material: string;
  category: string;
  currentSupplier: string;
  risk: string;
  riskLevel: SingleSourceRiskLevel;
  suggestedAlternatives: string[];
}

// ─── Filter inputs (lean shapes; expanded as pages migrate) ─────────────────

export interface POFilter {
  status?: POStatus | POStatus[];
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InventoryFilter {
  supplierId?: string;
  materialCode?: string;
  stockStatus?: StockStatus | StockStatus[];
}

export interface RFQFilter {
  status?: RFQStatus | RFQStatus[];
  category?: RFQCategory | RFQCategory[];
  invitedSupplierId?: string;
}

export interface QuotationFilter {
  rfqId?: string;
  supplierId?: string;
  status?: QuotationStatus | QuotationStatus[];
}

export interface ShipmentFilter {
  status?: ShipmentStatus | ShipmentStatus[];
  mode?: ShipmentMode | ShipmentMode[];
  supplierId?: string;
}

export interface ASNFilter {
  status?: AsnStatus | AsnStatus[];
}

export interface GRFilter {
  status?: GRStatus | GRStatus[];
  supplierId?: string;
}

export interface InvoiceFilter {
  status?: BuyerInvoiceStatus | SupplierInvoiceStatus;
  supplierId?: string;
  poNumber?: string;
}

export interface ContractFilter {
  status?: ContractStatus | ContractStatus[];
  type?: ContractType | ContractType[];
  supplierId?: string;
}

export interface ObligationFilter {
  contractId?: string;
  status?: ObligationStatus | ObligationStatus[];
  owner?: ObligationOwner;
}

// ─── Service interfaces — the contract Phase 3 implements ───────────────────

export interface ISupplierService {
  /** Buyer: all suppliers. Supplier: returns []. */
  list(scope: QueryScope): Promise<Supplier[]>;
  /** Buyer: any supplier. Supplier: only if id === own supplierId. */
  getById(scope: QueryScope, id: string): Promise<Supplier | null>;
  /** Supplier: returns self. Buyer: returns null. */
  getCurrent(scope: QueryScope): Promise<Supplier | null>;
}

export interface IProcurementService {
  // — Purchase orders —
  getPurchaseOrders(scope: QueryScope, filter?: POFilter): Promise<PurchaseOrder[]>;
  getPurchaseOrder(scope: QueryScope, id: string): Promise<PurchaseOrder | null>;

  // — Inventory —
  getInventory(scope: QueryScope, filter?: InventoryFilter): Promise<InventoryRecord[]>;

  // — Sourcing —
  getRFQs(scope: QueryScope, filter?: RFQFilter): Promise<RFQ[]>;
  getQuotations(scope: QueryScope, filter?: QuotationFilter): Promise<Quotation[]>;

  // — Fulfilment —
  getShipments(scope: QueryScope, filter?: ShipmentFilter): Promise<Shipment[]>;
  getASNs(scope: QueryScope, filter?: ASNFilter): Promise<ASN[]>;
  getGoodsReceipts(scope: QueryScope, filter?: GRFilter): Promise<GoodsReceipt[]>;

  // — Finance —
  getBuyerInvoices(scope: QueryScope, filter?: InvoiceFilter): Promise<BuyerInvoice[]>;
  getSupplierInvoices(scope: QueryScope, filter?: InvoiceFilter): Promise<SupplierInvoice[]>;

  // — Contracts —
  getContracts(scope: QueryScope, filter?: ContractFilter): Promise<Contract[]>;
  getObligations(scope: QueryScope, filter?: ObligationFilter): Promise<ContractObligation[]>;

  // — Supplier-side supporting data (currently inline in pages) —
  getDocuments(scope: QueryScope): Promise<SupplierDocument[]>;
  getStorefrontCatalog(scope: QueryScope, supplierId?: string): Promise<CatalogItem[]>;
  getStorefrontCerts(scope: QueryScope, supplierId?: string): Promise<ProfileCert[]>;
  getStorefrontProducts(scope: QueryScope, supplierId?: string): Promise<StorefrontProduct[]>;

  // — KPIs / performance —
  getKpis(scope: QueryScope): Promise<KpiSnapshot>;
  getPerformanceTrend(scope: QueryScope, range: TrendRange): Promise<PerformancePoint[]>;
}

export interface IRiskService {
  getRiskAlerts(scope: QueryScope): Promise<RiskAlert[]>;
  getGeoRisks(scope: QueryScope): Promise<GeoRisk[]>;
  getExposure(scope: QueryScope): Promise<ExposureRow[]>;
  getCompliance(scope: QueryScope): Promise<ComplianceRow[]>;
  getCommodities(scope: QueryScope): Promise<Commodity[]>;
}

export interface IDiscoveryService {
  getGlobalSuppliers(scope: QueryScope): Promise<GlobalSupplier[]>;
  getRecommended(scope: QueryScope): Promise<RecommendedSupplier[]>;
  getQualifications(scope: QueryScope): Promise<QualificationItem[]>;
  getMarketIntel(scope: QueryScope): Promise<MarketIntelCard[]>;
  getSingleSourceItems(scope: QueryScope): Promise<SingleSourceItem[]>;
}

export interface IDataService {
  suppliers: ISupplierService;
  procurement: IProcurementService;
  risk: IRiskService;
  discovery: IDiscoveryService;
}
