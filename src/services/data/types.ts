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

// ─── Error contract (DR-4) — the single failure channel for the data layer ──
//
// The interface today returns T[] / Page<T> / T|null on success; failure is
// signalled by *throwing* a DataError. This matches TanStack Query's model
// (queryFn throws -> isError), so consumers render the error state via the
// wrapper hook rather than unwrapping a Result envelope. The Phase-3 real
// adapter maps HTTP/SAP failures onto the same DataErrorCode set.

export type DataErrorCode =
  | 'NOT_FOUND'
  | 'SCOPE_DENIED'
  | 'UPSTREAM'
  | 'CHAOS'
  | 'UNKNOWN';

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;

  constructor(code: DataErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'DataError';
    this.code = code;
    this.cause = cause;
    // Restore prototype chain for instanceof across the TS target.
    Object.setPrototypeOf(this, DataError.prototype);
  }
}

// ─── List envelope (DR-5) — shape frozen now, pagination machinery deferred ─
//
// Every list-returning read method returns Page<T> rather than a bare T[], so
// the 27 read surfaces are shaped for pagination from day one and pages migrate
// once. The mock returns everything in `items` and leaves `cursor` null; no
// pagination logic exists yet. The Phase-3 real adapter fills cursor/total.

export interface Page<T> {
  items: T[];
  cursor?: string | null;
  total?: number;
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
  // D-4: upload provenance — when the current document was filed (null when the
  // cert is missing / not yet uploaded).
  uploaded?: string | null;
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

// ─── Supplier scorecard (buyer-side performance intelligence) ───────────────
// Portfolio scorecard: one record per active supplier, read buyer-only (the
// scorecard spans the whole network — a supplier does not see the cross-network
// grading view). D-2: the improvement-plan actions and the compliance issue are
// per-supplier OPTIONAL fields on the record, not shared consts keyed by name.

export type ScorecardGradeLetter = 'A' | 'B' | 'C' | 'D';

export interface ScorecardKpi {
  name: string;
  value: string;
  target: string;
  pct: number;
  color: string;
  trend: KpiTrend;
}

export interface ScorecardRadarAxis {
  axis: string;
  value: number;
}

export type CommLogStatus = 'Completed' | 'Active' | 'Open' | 'Resolved';

export interface CommLogEntry {
  date: string;
  type: string;
  channel: string;
  message: string;
  status: CommLogStatus;
}

export type ScorecardComplianceLevel = 'expired' | 'expiring' | 'missing';

export interface ScorecardComplianceIssue {
  level: ScorecardComplianceLevel;
  label: string;
}

export type ScorecardActionStatus = 'In Progress' | 'Pending';

export interface ScorecardImprovementAction {
  item: string;
  due: string;
  owner: string;
  status: ScorecardActionStatus;
}

export interface SupplierScorecard {
  id: string;
  name: string;
  country: string;
  category: string;
  tier: string;
  sapBp: string;
  channel: string;
  grade: ScorecardGradeLetter;
  score: number;
  status: string;
  kpis: ScorecardKpi[];
  radar: ScorecardRadarAxis[];
  otifTrend: number[];
  ackSpeedTrend: number[];
  defectTrend: number[];
  impPlan?: boolean;
  commLog: CommLogEntry[];
  // D-2: folded off the page's shared IMPROVEMENT_ACTIONS / COMPLIANCE_ISSUES
  // consts so per-supplier data lives on the per-supplier record.
  complianceIssue?: ScorecardComplianceIssue | null;
  improvementActions?: ScorecardImprovementAction[];
}

// ─── Purchase requisitions (buyer-side ACQUIRE stage) ───────────────────────
// The starting point of procurement (PR → Approval → Source check → PO or
// Sourcing Event). A buyer-only internal document — suppliers never see PRs.
// D-3: quantity and estimatedValue are NUMERIC (not pre-formatted strings), so
// the render layer owns locale formatting via formatNumber / formatIDR.

export type PRStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sourcing Event'
  | 'PO Created'
  | 'Rejected';

export type PRPriority = 'High' | 'Medium' | 'Low';

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  material: string;
  category: string;
  quantity: number;
  uom: string;
  requiredDate: string;
  estimatedValue: number;
  requestor: string;
  costCenter: string;
  status: PRStatus;
  createdDate: string;
  approver: string;
  sourceOfSupply: string;
  linkedDoc: string;
  priority: PRPriority;
  justification: string;
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

// Scenario modeling (buyer-side). A modeled disruption scenario with its
// quantified impact and a set of response alternatives.
export type ScenarioFeasibility = 'high' | 'medium' | 'low';

export interface ScenarioAlt {
  id: string;
  name: string;
  cost: string;
  leadTime: string;
  feasibility: ScenarioFeasibility;
  details: string;
}

export interface Scenario {
  id: string;
  label: string;
  title: string;
  description: string;
  impact: Record<string, string>;
  alternatives: ScenarioAlt[];
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

// ─── Buyer dashboard aggregates (command-center, buyer-only) ────────────────
// Not supplier-scoped: production lines are internal to Paragon and supplier-
// health rows span multiple suppliers. Served buyer-only (supplier sees empty).

export interface ProductionLineRow {
  line: string;
  category: string;
  risk: 'low' | 'medium' | 'high';
  riskLabel: string;
  coverDays: number;
  blockedSkus: number;
}

export interface SupplierHealthRow {
  name: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

// ─── Analytics (buyer-side aggregate reporting) ─────────────────────────────
// Portfolio-level procurement intelligence — spend, performance, channel mix.
// Not per-supplier-scoped; served buyer-only (supplier sees empty / null).

export type AnalyticsGrade = 'A' | 'B' | 'C' | 'D';

export interface SpendCategoryRow {
  category: string;
  value: number;
  color: string;
}

export interface TopSupplierSpend {
  supplier: string;
  spend: number;
}

export interface MonthlyOtifRow {
  month: string;
  otif: number;
  otdr: number;
}

export interface MonthlyPoRow {
  month: string;
  pos: number;
  cycleTime: number;
}

export interface MonthlyChannelMix {
  month: string;
  whatsapp: number;
  web: number;
  email: number;
  api: number;
}

export interface AnalyticsPerfRow {
  supplier: string;
  category: string;
  otif: number;
  otdr: number;
  ackSpeed: string;
  invoiceMatch: string;
  grade: AnalyticsGrade;
  trend: KpiTrend;
}

// Headline KPI card — value + subtitle text + semantic tone (drives icon/color).
export type KpiTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface AnalyticsKpi {
  value: string;
  subtitle: string;
  tone: KpiTone;
}

export interface AnalyticsSummary {
  totalSpend: AnalyticsKpi;
  activeSuppliers: AnalyticsKpi;
  portfolioOtif: AnalyticsKpi;
  avgCycleTime: AnalyticsKpi;
}

// ─── Engagement (buyer-side multi-channel comms) ────────────────────────────
// Conversation bus spanning suppliers (WhatsApp today). Buyer-only aggregate;
// not per-supplier-id scoped in the leak sense (threads span the network).

export type ConvStatus = 'active' | 'awaiting' | 'resolved';

export interface Conversation {
  id: string;
  supplier: string;
  lastMsg: string;
  time: string;
  unread: number;
  status: ConvStatus;
}

export interface ChatMessage {
  id: string;
  from: 'bot' | 'supplier';
  content: string;
  time: string;
}

export interface AutomationRule {
  rule: string;
  trigger: string;
  action: string;
  autoHandle: boolean;
  escalateIf: string;
  successRate: string;
}

export interface DailyMessageRow {
  day: string;
  outbound: number;
  inbound: number;
}

export interface RuleRate {
  rule: string;
  rate: number;
}

export interface ResponseRow {
  supplier: string;
  avg: string;
  fastest: string;
  slowest: string;
  automation: string;
}

export interface EngagementKpi {
  value: string;
  subtitle: string;
  tone: KpiTone;
}

export interface EngagementSummary {
  activeConversations: EngagementKpi;
  pendingResponses: EngagementKpi;
  automatedToday: EngagementKpi;
  hubAvgResponse: EngagementKpi;
  messagesThisMonth: EngagementKpi;
  automatedActions: EngagementKpi;
  analyticsAvgResponse: EngagementKpi;
  satisfaction: EngagementKpi;
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

export interface PRFilter {
  status?: PRStatus | PRStatus[];
}

// ─── Service interfaces — the contract Phase 3 implements ───────────────────

export interface ISupplierService {
  /** Buyer: all suppliers. Supplier: returns empty page. */
  list(scope: QueryScope): Promise<Page<Supplier>>;
  /** Buyer: any supplier. Supplier: only if id === own supplierId. */
  getById(scope: QueryScope, id: string): Promise<Supplier | null>;
  /** Supplier: returns self. Buyer: returns null. */
  getCurrent(scope: QueryScope): Promise<Supplier | null>;
}

export interface IProcurementService {
  // — Purchase orders —
  getPurchaseOrders(scope: QueryScope, filter?: POFilter): Promise<Page<PurchaseOrder>>;
  getPurchaseOrder(scope: QueryScope, id: string): Promise<PurchaseOrder | null>;

  // — Inventory —
  getInventory(scope: QueryScope, filter?: InventoryFilter): Promise<Page<InventoryRecord>>;

  // — Sourcing —
  getRFQs(scope: QueryScope, filter?: RFQFilter): Promise<Page<RFQ>>;
  getQuotations(scope: QueryScope, filter?: QuotationFilter): Promise<Page<Quotation>>;

  // — Fulfilment —
  getShipments(scope: QueryScope, filter?: ShipmentFilter): Promise<Page<Shipment>>;
  getASNs(scope: QueryScope, filter?: ASNFilter): Promise<Page<ASN>>;
  getGoodsReceipts(scope: QueryScope, filter?: GRFilter): Promise<Page<GoodsReceipt>>;

  // — Finance —
  getBuyerInvoices(scope: QueryScope, filter?: InvoiceFilter): Promise<Page<BuyerInvoice>>;
  getSupplierInvoices(scope: QueryScope, filter?: InvoiceFilter): Promise<Page<SupplierInvoice>>;

  // — Contracts —
  getContracts(scope: QueryScope, filter?: ContractFilter): Promise<Page<Contract>>;
  getObligations(scope: QueryScope, filter?: ObligationFilter): Promise<Page<ContractObligation>>;

  // — Supplier-side supporting data (currently inline in pages) —
  getDocuments(scope: QueryScope): Promise<Page<SupplierDocument>>;
  getStorefrontCatalog(scope: QueryScope, supplierId?: string): Promise<Page<CatalogItem>>;
  getStorefrontCerts(scope: QueryScope, supplierId?: string): Promise<Page<ProfileCert>>;
  getStorefrontProducts(scope: QueryScope, supplierId?: string): Promise<Page<StorefrontProduct>>;

  // — KPIs / performance —
  getKpis(scope: QueryScope): Promise<KpiSnapshot>;
  getPerformanceTrend(scope: QueryScope, range: TrendRange): Promise<Page<PerformancePoint>>;

  // — Supplier scorecard (buyer-only portfolio grading) —
  getSupplierScorecards(scope: QueryScope): Promise<Page<SupplierScorecard>>;

  // — Purchase requisitions (buyer-only ACQUIRE stage) —
  getRequisitions(scope: QueryScope, filter?: PRFilter): Promise<Page<PurchaseRequisition>>;

  // — Buyer command-center aggregates (buyer-only) —
  getProductionLines(scope: QueryScope): Promise<Page<ProductionLineRow>>;
  getSupplierHealth(scope: QueryScope): Promise<Page<SupplierHealthRow>>;
}

export interface IRiskService {
  getRiskAlerts(scope: QueryScope): Promise<Page<RiskAlert>>;
  getGeoRisks(scope: QueryScope): Promise<Page<GeoRisk>>;
  getExposure(scope: QueryScope): Promise<Page<ExposureRow>>;
  getScenarios(scope: QueryScope): Promise<Page<Scenario>>;
  getCompliance(scope: QueryScope): Promise<Page<ComplianceRow>>;
  getCommodities(scope: QueryScope): Promise<Page<Commodity>>;
}

export interface IDiscoveryService {
  getGlobalSuppliers(scope: QueryScope): Promise<Page<GlobalSupplier>>;
  getRecommended(scope: QueryScope): Promise<Page<RecommendedSupplier>>;
  getQualifications(scope: QueryScope): Promise<Page<QualificationItem>>;
  getMarketIntel(scope: QueryScope): Promise<Page<MarketIntelCard>>;
  getSingleSourceItems(scope: QueryScope): Promise<Page<SingleSourceItem>>;
}

// Discrete per-read analytics surface (D-4): each chart/table is its own read,
// so the service is shaped for per-section loading/error rendering. (The pages
// today still gate at the page level; the read granularity is what D-4 secures.)
export interface IAnalyticsService {
  /** Headline KPI cards. Buyer: populated. Supplier: null. */
  getSummary(scope: QueryScope): Promise<AnalyticsSummary | null>;
  getSpendByCategory(scope: QueryScope): Promise<Page<SpendCategoryRow>>;
  getTopSuppliers(scope: QueryScope): Promise<Page<TopSupplierSpend>>;
  getOtifTrend(scope: QueryScope): Promise<Page<MonthlyOtifRow>>;
  getPoVolumeTrend(scope: QueryScope): Promise<Page<MonthlyPoRow>>;
  getChannelMix(scope: QueryScope): Promise<Page<MonthlyChannelMix>>;
  getSupplierPerformance(scope: QueryScope): Promise<Page<AnalyticsPerfRow>>;
}

export interface IEngagementService {
  /** Channel KPI cards. Buyer: populated. Supplier: null. */
  getSummary(scope: QueryScope): Promise<EngagementSummary | null>;
  getConversations(scope: QueryScope): Promise<Page<Conversation>>;
  getConversationThread(scope: QueryScope, conversationId: string): Promise<Page<ChatMessage>>;
  getAutomationRules(scope: QueryScope): Promise<Page<AutomationRule>>;
  getDailyMessages(scope: QueryScope): Promise<Page<DailyMessageRow>>;
  getRuleRates(scope: QueryScope): Promise<Page<RuleRate>>;
  getResponseTimes(scope: QueryScope): Promise<Page<ResponseRow>>;
}

export interface IDataService {
  suppliers: ISupplierService;
  procurement: IProcurementService;
  risk: IRiskService;
  discovery: IDiscoveryService;
  analytics: IAnalyticsService;
  engagement: IEngagementService;
}
