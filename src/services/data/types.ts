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

// CP-3 · E2 — the enforcement read seam's row type. TYPE-ONLY: naming the
// vocabulary is not acquiring a consumer, and nothing in this file calls it.
import type { EnforcementSetting } from '../../lib/enforcement';

// SDC-4b — the collaboration read seam's row types (type-only; the SDC layer
// already imports IntakePlanState from here, so this reverse reference is a
// type-only cycle TS resolves at erase-time — no runtime import is emitted).
import type {
  RequirementResponse,
  InventoryDeclaration,
  IncomingShipmentView,
  ConsolidationRow,
  SupplierCoverageEntry,
  SupplierRollup,
  ChaseEntry,
} from '../sdc';
// Delivery Agreement read seam — the view-model row type (type-only; erased at
// build, so no runtime import into the data layer).
import type {
  ConfirmCommandResult,
  DeliveryAgreementView,
  EditPolicyCommandResult,
  ReleaseCommandResult,
} from '../delivery/views';
import type { ReleaseSelection } from '../delivery/release';
import type { EditPolicyPatch } from '../delivery/policy';
// The unified chase read view (SDC-5c). TYPE-ONLY — the `chase` module composes
// the collaboration + delivery reads one level up; the data layer only names the
// shape it returns. Acyclic: chase reads sdc/delivery types, never data/types.
import type { SupplierChaseView } from '../chase';

// ─── PO enums (canonical home; relocated from types/purchaseOrder.types.ts) ──
export enum POStatus {
  SENT = 'Sent',
  VIEWED = 'Viewed',
  ACKNOWLEDGED = 'Acknowledged',
  CONFIRMED = 'Confirmed',
  PARTIALLY_DELIVERED = 'Partially Delivered',
  DELIVERED = 'Delivered',
  CLOSED = 'Closed',
}

export enum ChannelType {
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email',
  WEB = 'Web',
  API = 'API',
}

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

// ─── Invoice — DR-7: ONE canonical machine + persona projections ──────────────
// The invoice is ONE economic document. `InvoiceStatus` is the single canonical
// lifecycle stored on the entity; the two persona vocabularies below
// (`SupplierInvoiceStatus`, `BuyerInvoiceStatus`) are PROJECTION LABELS derived
// at read time (see `invoiceProjection.ts`), never independently stored. This is
// DR-7 (ratified 2026-07-06): two-machines-plus-mapping was rejected on the
// HALAL-XPERSONA-01 drift precedent. `Overdue` is computed (DR-8, law 0.5); the
// 3-way `matchStatus` is the match sub-flow's rolled-up terminal (census G2).

/** Canonical invoice lifecycle (the stored truth). `Releasing Payment` is the
 *  Option-B SAP interim; the real FI document is minted only on settlement. */
export type InvoiceStatus =
  | 'Draft'
  | 'Submitted'
  | 'Matched'
  | 'Approved'
  | 'Releasing Payment'
  | 'Payment Released'
  | 'Remittance Received'
  | 'Disputed';

/** SUPPLIER-persona projection labels of `InvoiceStatus` (+ computed Overdue). */
export type SupplierInvoiceStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Payment Released'
  | 'Remittance Received'
  | 'Overdue'
  | 'Disputed';

export type InvoiceChannel = 'WhatsApp' | 'Web' | 'Email' | 'API';

/** The canonical invoice entity — the ONE row the store holds and both persona
 *  reads project from (`toSupplierInvoice` / `toBuyerInvoice`). Fields are the
 *  union of what each surface needs; persona reads select + relabel. */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  poId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  /** Match sub-flow rolled-up terminal (census G2); surfaced on the buyer read. */
  matchStatus: InvoiceMatchStatus;
  submittedDate: string;
  dueDate: string;
  paymentDate: string | null;
  paymentRef: string | null;
  sapFiDoc: string | null;
  sapGrDoc: string | null;
  bankAccount: string;
  channel: InvoiceChannel;
  approver: string;
  paymentTerms: string;
  buyerContact: string;
  remittanceNote: string | null;
}

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

/** BUYER-persona projection labels of `InvoiceStatus` (+ computed Overdue). */
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
  /** The supplier's own name for the item. ⚠️ THIS IS A MEANING, and until
   *  2B-5a the material census could not read it — `meaningOf` matched
   *  `/description/i` and this key is called `material`
   *  (`MEANING-SCOPE-IS-A-HAND-PICK-01`). */
  material: string;
  /**
   * ⚠️ **A POINTER, NOT AN IDENTITY — DECLARED AT 2B-5a (operator ruling R-D).**
   *
   * This field is **not** the catalogue item's identity (`id` is) and **not** a
   * code space of its own. It is **the supplier's assertion of which PARAGON
   * MASTER CODE their catalogue item corresponds to** — a claim about someone
   * else's space, entered by the party that does not own it.
   *
   * The evidence for that reading, rather than an assertion of it: the field is
   * named `sapCode` and not `materialCode`; the supplier's own storefront form
   * labels it **"SAP code (optional)"** — Paragon runs the SAP, and an
   * OPTIONAL field cannot be an identity; and of the five values authored, two
   * pointed at codes in `paragon.asn_chase_lane` **under the matching supplier
   * on both sides**, which is what a pointer looks like when it works.
   *
   * ⚠️ **CONSEQUENCES OF THE DECLARATION, and they are not tidy.**
   *   · A value here **must resolve to `MATERIAL_MASTER`**. One of five does
   *     (`PK-PETB-8803`, corrected at 2B-5a per R-D — it read `MAT-10045`, a
   *     code no Paragon space contains, carrying the master's own label for
   *     that material byte-for-byte).
   *   · `MAT-30110` / `MAT-40220` point into the ASN lane and resolve **there**,
   *     not in the master. They are correct pointers into a space booked for
   *     retirement, and they repoint when **2B-5b** retires the seven.
   *   · `MAT-10046` / `MAT-10089` resolve **nowhere**. They are unbacked claims
   *     and no batch has ruled on them.
   *   · **A SUPPLIER-ENTERED POINTER IS NEVER EVIDENCE OF A CORRESPONDENCE.**
   *     C9 §4's rule applies unchanged: a claim entered by one party about
   *     another party's space is an ADOPTION at best, and this one carries no
   *     provenance at all — no method, no source of truth, no route to
   *     resolution. It must not be joined on.
   *
   * Pinned by `storefrontPointer.test.ts`, which asserts the exact disposition
   * of all five rather than a count.
   */
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
  /** Target position on the same 0–100 axis as `pct` (DP2-TARGET-01 tick +
   *  derived meeting/near/missing colour). Replaces the hand-assigned hex. */
  targetPct: number;
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
  /** Target position on the same 0–100 axis as `pct` (DP2-TARGET-01). */
  targetPct: number;
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

// C7 §4 producer provenance — WHICH producer emitted this intake line. The ONE
// provenance that belongs on the entity: it is a producer FACT, not liveness
// (registry-derived) and not plan-state (the C6 PLANNED overlay, never merged into
// a committed seam row). Optional/nullable — existing fixtures and manual PRs omit
// it; a Grid- or SOMO-produced line carries it (G1.1).
export type PrSource = 'INTERNAL_GRID' | 'SOMO';

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
  source?: PrSource;
}

// ─── PR-intake line (C7 §2 — one shape, two producers) ──────────────────────
// Promoted to the service seam at Phase A/1 (getPrIntake) so the intake REVIEW
// surface is a real consumer, not a page-local const reader (FORK-B=b2). SOMO-
// authored fields (suggestedSource lane, segment) are read-only + nullable for a
// Grid line. Quantity carries THREE values (C7 §2.1: suggested / accepted /
// wasAdjusted — the fact of adjustment is itself the audit signal). Liveness is
// NOT a field — it is registry-derived (purchaseRequisitions, gate-2 shut →
// SIMULATED). Plan-state IS a per-row field (the C6 overlay axis). `deficit` is
// the recommend-first "why" a review triages on (C7 §2; FORK-D — bomContext and
// shortfall deferred: shortfall is structurally 0 until SOMO's Phase-4 solve).
export type IntakePlanState = 'PLANNED' | 'committed';

export interface PrIntakeLine {
  readonly id: string;
  readonly material: string;
  /** SOMO-authored source/destination lane; null for an internal-Grid line. */
  readonly suggestedSource: string | null;
  /** SOMO-authored ABC-XYZ policy class; null for an internal-Grid line. */
  readonly segment: string | null;
  readonly suggestedQty: number;
  readonly acceptedQty: number;
  readonly wasAdjusted: boolean;
  readonly uom: string;
  readonly period: string;
  readonly estimatedValue: number;
  readonly source: PrSource;
  readonly planState: IntakePlanState;
  /** C7 §2 recommend-first rationale — the "why" a review triages on. Nullable. */
  readonly deficit?: string;
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

// ── Compliance registry — census #11–15 → ONE canonical machine (I3.1) ─────────
// The 5 fragmented compliance vocabularies (SupplierDocumentStatus /
// ProfileCertStatus / ScorecardComplianceLevel / ComplianceState /
// ComplianceItemStatus) collapse to ONE machine. `ComplianceRegistryEntry` is the
// DTO-v2 shape that canonical machine reads through — grain = supplier × raw-
// material × certificate (the Spine). It SUPERSEDES the thin `ComplianceRow`
// above (deprecated-at-birth): supplierId-keyed (not name-keyed), and every
// clock/scheme value is COMPUTED at read time (`complianceProjection.ts`), never
// stored (law 0.5). Fixture-backed + SIMULATED until the Track-R harvest lands.

/** Certificate scheme/type. Distinguishes BPJPH (mandate-satisfying) from the
 *  MUI-legacy scheme (non-compliant after 17 Oct 2026) — the issuer axis the old
 *  `status === 'Valid'` check was blind to (HALAL-ISSUER-BLIND-01). */
export type CertType =
  | 'HALAL_BPJPH'
  | 'HALAL_MUI_LEGACY'
  | 'HALAL_FOREIGN'
  | 'BPOM'
  | 'ISO'
  | 'OTHER';

/** GR 42/2024 made BPJPH certs permanent-validity; legacy GR-39 certs kept a
 *  4-year expiry clock. `certBasis` disambiguates the two clock models. */
export type CertBasis = 'permanent' | 'legacy-4yr';

/** Raw-material grouping (Spine: cert grain is supplier AND raw-material level). */
export type MaterialCategory =
  | 'fragrance'
  | 'actives'
  | 'emulsifiers'
  | 'botanicals'
  | 'contract-mfg'
  | 'other';

/** The canonical compliance lifecycle — TRANSITION-states only (census §4). Clock
 *  decay (Expiring/Expired) is NOT here — it is a read projection (law 0.5). */
export type ComplianceLifecycleState = 'Missing' | 'Under Review' | 'Valid';

/** The COMPUTED-at-read display status: the lifecycle state plus clock decay
 *  (law 0.5). Never stored; derived in `complianceProjection.ts`. */
export type ComplianceDisplayStatus =
  | 'Missing'
  | 'Under Review'
  | 'Valid'
  | 'Expiring'
  | 'Expired';

/** One row of the compliance registry — grain: supplier × material × certificate.
 *  The DTO-v2 the canonical compliance machine reads. STORED fields only; every
 *  clock/scheme-derived value is computed by `complianceProjection.ts`. */
export interface ComplianceRegistryEntry {
  id: string;
  /** The FK that reconciles the name-vs-id split across personas
   *  (HALAL-XPERSONA-01) and scopes the read per-supplier. */
  supplierId: string;
  supplierName: string;
  /** SAP material codes this certificate covers (raw-material grain). */
  materialCodes: readonly string[];
  materialCategory: MaterialCategory;
  certType: CertType;
  certNumber: string;
  issuer: string;
  issueDate: string | null;
  /** `null` = unknown, NEVER guessed (a blank expiry on a required cert is itself
   *  a finding) — also `null` for a permanent-basis BPJPH cert. */
  expiryDate: string | null;
  certBasis: CertBasis;
  /** The STORED transition-state (Missing/Under Review/Valid). The display status
   *  is computed from this + the clock, never stored. */
  lifecycleState: ComplianceLifecycleState;
  /** Whether this cert is required for the supplier's halal-brand supply — gates
   *  the BPJPH KPI and remind-eligibility. */
  requiredForHalalBrands: boolean;
  scopeText: string;
  notes: string;
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
  // ⚠️ `validatedBy: string[]` WAS HERE AND IS DELETED, NOT RENAMED
  // (`DISCOVERY-ENDORSEMENT-01`, reclassified as legal exposure). It carried a
  // list of named corporations said to have vetted this supplier. The portal
  // verifies nothing of the kind, so the field could only ever assert what it
  // could not back — and no marker, pill or disclaimer fixes a statement made on
  // a third party's behalf. Substituting invented brand names was considered and
  // refused: it relocates the fabrication rather than removing it, and the same
  // page already set the precedent one field over (the market-intel source
  // attributions were DELETED, not relabelled). The field returns if and when a
  // verification source exists to back it; until then, honest silence.
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

// ─── Command layer (v2.2 Step 3.4–3.9) — the write contract ─────────────────
//
// Reads throw DataError; commands report their outcome as a status. Hard
// authorization failures (NOT_FOUND / SCOPE_DENIED) still throw DataError — the
// dispatcher enforces QueryScope on EVERY command exactly as reads (DR-6
// amended). Domain rejections (illegal transition, missing fields, role,
// policy) resolve as `status: 'failed'` with a reason and an emitted event.

export type CommandOutcome = 'done' | 'submitted' | 'failed';

/** A command to fire one transition on one entity. */
/**
 * A governed-decision record (C6-LOCK, the locked-override rule — G1.2b). Opaque
 * to the dispatcher: it is forwarded VERBATIM onto the DR-10 `TransitionEvent` so
 * the audit itself captures WHY a human overrode a platform value (actor + `ts`
 * are already on the event). The one human-authored substance write in the plan
 * grid is a quantity override; a computed/derived value is never writable, so a
 * `decision` never annotates one. Mirrors the optional `causationId` passthrough
 * — additive to the seam, not a new event type.
 */
export interface CommandDecision {
  /** The field the human adjusted (e.g. `acceptedQty`). */
  field: string;
  /** The platform-suggested value. */
  from: number;
  /** The human-accepted value. */
  to: number;
  /** The required justification — a silent override is forbidden (C6-LOCK §8.3). */
  reason: string;
  /** True when `to !== from` (a genuine override); false for accept-as-suggested. */
  wasAdjusted: boolean;
}

export interface CommandInput {
  /** The transition id to fire (e.g. `t_po_confirm`). */
  transitionId: string;
  /** The entity/flow key (e.g. `purchaseOrder`). */
  entity: string;
  /**
   * The target entity's id. OMITTED for `creation` transitions — the entity
   * does not exist yet and the store assigns its id (returned on the result).
   * Required for every non-creation transition.
   */
  entityId?: string;
  /** requiredFields live here; validated by the dispatcher. */
  payload?: Record<string, unknown>;
  /**
   * The governed-decision provenance (C6-LOCK). Present only when this dispatch
   * carries a human override — the dispatcher forwards it verbatim to the audit
   * event; it participates in NO validation (opaque).
   */
  decision?: CommandDecision;
}

/** The synchronous result of dispatching a command. */
export interface CommandResult {
  correlationId: string;
  transitionId: string;
  status: CommandOutcome;
  /** Set when `status === 'failed'` — the machine-readable rejection reason. */
  reason?: string;
  /**
   * The target entity's id. For a `creation` command this is the id the store
   * ASSIGNED (e.g. the new ASN number); for others it echoes the input id.
   */
  entityId?: string;
}

/** A command's recorded status, read back via `getCommandStatus`. */
export interface CommandStatus {
  correlationId: string;
  transitionId: string;
  status: CommandOutcome;
  ts: string;
}

/** The single dispatcher seam. The Phase-3 real adapter implements the same. */
export interface ICommandService {
  /**
   * Validate (legality + role + fields + scope + policy) then apply.
   *
   * `causationId` (SDC-3a — the SubmissionSession seam) groups this command's
   * DR-10 events with an earlier command WITHOUT collapsing its own
   * correlationId (`getCommandStatus` stays 1:1) — the exact DR-10 semantics
   * cascades already use. In a multi-object SubmissionSession the FIRST
   * command's correlationId is the anchor; commands 2..n pass it here so the
   * whole visit shares one audit group. Absent ⇒ a directly-initiated command
   * (the common case). Never a sessionId — that would overload DR-10.
   */
  dispatch(
    scope: QueryScope,
    input: CommandInput,
    causationId?: string,
  ): Promise<CommandResult>;
  /** Read a command's settled/pending status by correlation id. */
  getCommandStatus(scope: QueryScope, correlationId: string): Promise<CommandStatus | null>;
  /**
   * Settle a `submitted` (SAP-boundary) command — the async settlement
   * callback (Step 3.5). In the mock this represents SAP returning the material
   * document; Phase-3 implements it as the integration webhook. Idempotent:
   * settling an already-`done` command returns it unchanged.
   */
  settle(scope: QueryScope, correlationId: string): Promise<CommandStatus | null>;
}

/** What a scope may do (Step 3.9). Mock-backed; DNA-registry-backed in Phase 3′. */
export interface CapabilitySet {
  /** Transition-roles the scope holds. */
  roles: readonly string[];
  /** Transition ids the scope may initiate. */
  transitions: readonly string[];
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

  // — PR-intake review (buyer-only; C7 §2 — one shape, two producers) —
  getPrIntake(scope: QueryScope): Promise<Page<PrIntakeLine>>;

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
  /** Canonical compliance registry (census #11–15 → ONE machine · I3.1). Grain:
   *  supplier × material × certificate. SUPERSEDES `getCompliance`/`ComplianceRow`
   *  (deprecated-at-birth). supplierId-keyed → scope-isolated per supplier (buyer
   *  sees the superset). Fixture-backed + SIMULATED (LivenessRegistry) until the
   *  Track-R harvest lands the real cert registry. */
  getComplianceRegistry(scope: QueryScope): Promise<Page<ComplianceRegistryEntry>>;
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

// ─── Supplier Data Collaboration reads (SDC-4b) ───────────────────────────────
//
// The SDC read seam. Moves scope from the hooks INTO the service (mirrors
// IProcurementService): P1 own-reads are per-supplier isolated; the P2
// consolidation reads are the buyer-superset, BUYER-GATED — a supplier persona
// hitting the consolidation path sees nothing (own-only degenerates to empty; a
// supplier has no cross-supplier consolidation view). Reads resolve from the LIVE
// stores (seeded from the SDC-0 fixtures) through the shared sdcClock, so P1
// writes and P2 reads share one scoped source. NOT a new domain contract — a
// read-service namespace over the existing SDC objects/selectors.
export interface ICollaborationService {
  // — P1 own-reads (per-supplier isolation) —
  getOwnRequirementResponses(scope: QueryScope): Promise<Page<RequirementResponse>>;
  getOwnInventoryDeclarations(scope: QueryScope): Promise<Page<InventoryDeclaration>>;
  getOwnIncomingShipments(scope: QueryScope): Promise<Page<IncomingShipmentView>>;
  getOwnSupplierAsns(scope: QueryScope): Promise<Page<ASN>>;

  // — P2 consolidation reads (buyer-superset, BUYER-GATED) —
  getConsolidation(scope: QueryScope): Promise<Page<ConsolidationRow>>;
  getCoverage(scope: QueryScope): Promise<Page<SupplierCoverageEntry>>;
  getChase(scope: QueryScope): Promise<Page<ChaseEntry>>;
  getRollups(scope: QueryScope): Promise<Page<SupplierRollup>>;
}

// ─── Delivery Agreement reads (the drawdown/compliance surface seam) ──────────
//
// A read-only namespace over the headless delivery domain (SchedulingAgreement +
// the pure derivations). `getAgreements` returns the scoped view-model — per
// agreement, per item, the drawdown ledger + per-released-line fulfillment,
// computed INSIDE the service against the shared SDC clock (mirrors
// ICollaborationService's buyer-superset scoping). SchedulingAgreement carries
// `supplierId`, so buyer = superset / supplier = own via applySupplierScope. Not a
// new domain contract — a read seam over the existing delivery objects/derivations.
/** Optional narrowing for the delivery read. `contractId` scopes the result to a
 *  single contract's agreements — the nested contract-detail DA tab passes it; the
 *  cross-contract roll-up omits it (buyer superset). Supplier scoping is applied
 *  first regardless, so a supplier still only ever sees its own. */
export interface DeliveryQuery {
  contractId?: string;
}

export interface IDeliveryService {
  getAgreements(scope: QueryScope, query?: DeliveryQuery): Promise<Page<DeliveryAgreementView>>;
  /**
   * Release the selected DRAFT lines of ONE item (the delivery lane's first
   * write — the draft→released transmit-to-vendor moment). BUYER-ONLY: a supplier
   * scope is refused (release is a buyer action). Applies Batch-2's pure
   * `releaseScheduleLines`, persists to the mutable store, and returns the
   * RE-DERIVED agreement view — or an honest `ReleaseReason` on refusal.
   *
   * SIMULATED by construction: this write does NOT go through the command
   * dispatcher and registers NO CommandTarget, so `deliveryAgreements` stays
   * null-backed in the LivenessRegistry (the honest amber "Sample" marker holds).
   * A released line is transmitted in the PORTAL, not posted to SAP —
   * `sapReleaseNumber` stays absent until the Pattern-B feed binds it (Stage F).
   */
  releaseLines(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    selection: ReleaseSelection,
  ): Promise<ReleaseCommandResult>;
  /**
   * Confirm the fulfillment of ONE released line (the delivery lane's SECOND
   * write — accept an INFERRED proximity proposal as a confirmed fact). BUYER-ONLY.
   * ACCEPT-AS-OBSERVED (v1): writes the observed shipment ref + qty via the pure
   * `confirmFulfillment`, so the match binds authoritatively (inferred:false) and
   * the governed `deliveredQty` climbs. Returns the RE-DERIVED view, or an honest
   * reason (`NOTHING_TO_CONFIRM` / `ALREADY_CONFIRMED` / `NOT_RELEASED` /
   * `SCOPE_DENIED` / `UNKNOWN_RELEASE_SEQ`).
   *
   * SIMULATED by construction, exactly like release: NO dispatcher, NO
   * CommandTarget, so `deliveryAgreements` stays null-backed (amber marker holds).
   * A confirm is a PORTAL record, not a SAP goods-receipt — `fulfilledDate` /
   * `sapReleaseNumber` stay absent until the Pattern-B feed binds them (Stage F).
   */
  confirmMatch(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    releaseSeq: number,
  ): Promise<ConfirmCommandResult>;
  /**
   * Re-point ONE item's ACTIVE drawdown tolerance (the delivery lane's THIRD write
   * — the GOVERNANCE write). BUYER-ONLY: adjusting a tolerance is a buyer decision.
   * Applies the pure `setActivePolicy` (writes `active` + the who/when/why stamp;
   * `contractDefault` is immutable, `activeChangedBy` deferred to the dispatcher),
   * persists, and returns the RE-DERIVED view — the ledger now marks
   * `policyDeviation` and re-derives `enforced` / `exceptions` against the new
   * `active`. Or an honest reason (`REASON_REQUIRED` / `NO_CHANGE` / `SCOPE_DENIED`
   * / `UNKNOWN_ITEM`).
   *
   * SIMULATED by construction, exactly like release / confirm: NO dispatcher, NO
   * CommandTarget, so `deliveryAgreements` stays null-backed (the amber marker
   * holds). A tolerance change is a PORTAL governance record, never posted to SAP.
   */
  editPolicy(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    patch: EditPolicyPatch,
  ): Promise<EditPolicyCommandResult>;
}

// ─── Unified chase read (SDC-5d — the buyer/planner chase surface seam) ───────
//
// The ONE composition point: reads the existing collaboration chase (data
// staleness) + delivery agreements (→ commitment chase) and folds them into the
// per-supplier `SupplierChaseView[]` via the pure 5c reducer. BUYER-GATED — the
// planner chases suppliers; a supplier persona resolves to [] (a supplier does not
// chase itself; its own-facts view is the delivery mirror, not this surface).
// Depends on the collaboration + delivery reads; neither imports chase (acyclic).
export interface IChaseService {
  getUnifiedChase(scope: QueryScope): Promise<Page<SupplierChaseView>>;
}

// ─── Enforcement read (CP-3 · E2 — the setting, behind the seam) ─────────────
//
// THE LEDGER, NOT THE ANSWER. This returns the recorded acts; the mode in force
// is DERIVED by the caller (`effectiveEnforcement`), exactly as `effectivePin`
// derives the FX basis from `fxPins` rather than the store holding a "current"
// field. That is what stops "which mode is current" from drifting away from the
// decisions that justify it — and it is why there is no
// `getEffectiveMode(checkId)` here: a service method would have to read a clock
// to answer, and the instant is always an argument (law 0.5).
//
// BUYER-SCOPED. A supplier resolves to SCOPE_DENIED: the ledger is a Paragon
// governance record — who relaxed what, until when, and whether they were named
// — and today it carries no supplier dimension at all (D1: the key is `checkId`
// alone). What a supplier is owed is the STAMP on its own receipt, which rides
// the line (D3) and is E3's. If D1 is ever widened, a per-supplier read of that
// supplier's own settings is an ADDITIVE change here, not a re-shaping.
export interface IEnforcementService {
  /** Every recorded enforcement setting, oldest first. Append-only upstream. */
  getEnforcementSettings(scope: QueryScope): Promise<Page<EnforcementSetting>>;
}

export interface IDataService {
  suppliers: ISupplierService;
  procurement: IProcurementService;
  risk: IRiskService;
  discovery: IDiscoveryService;
  analytics: IAnalyticsService;
  /** SDC read seam — P1 own-reads + P2 consolidation, service-scoped (SDC-4b). */
  collaboration: ICollaborationService;
  /** Delivery Agreement read seam — scoped drawdown + fulfillment view-model. */
  delivery: IDeliveryService;
  /** Unified chase read seam (SDC-5d) — data + commitment chase, buyer-gated. */
  chase: IChaseService;
  /** Enforcement read seam (CP-3 · E2) — the append-only setting ledger,
   *  buyer-scoped. The mode in force is derived by the caller, never served. */
  enforcement: IEnforcementService;
  /** Write seam — the single dispatcher (Step 3.4). */
  commands: ICommandService;
  /** What the current scope may do (Step 3.9 DNA seed; mock-backed today). */
  getCapabilities(scope: QueryScope): Promise<CapabilitySet>;
}
