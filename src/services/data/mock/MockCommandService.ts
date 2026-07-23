// ────────────────────────────────────────────────────────────────────────────
// MockCommandService (v2.2 Step 3.4) — wires the framework-agnostic dispatcher
// to the mock stores, the persona→role map, the bound policy hooks, and an
// in-memory audit sink. The Phase-3 real adapter implements ICommandService the
// same way against NestJS/SAP.
//
// Importing this module also loads the transitions barrel, which registers the
// shipped flows and binds policy hooks (side effects) — so the registry and the
// hook bindings are populated before any dispatch.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../types';
import type {
  ICommandService,
  QueryScope,
  CommandInput,
  CommandResult,
  CommandStatus,
  ASN,
  AsnStatus,
  Invoice,
  InvoiceStatus,
  PurchaseRequisition,
  PRStatus,
  PRPriority,
  PrSource,
} from '../types';
import type {
  GoodsReceipt,
  GRStatus,
  Disposition,
  InspectionResult,
} from '../../../data/mockGoodsReceipts';
import type { RFQ, RFQStatus, RFQCategory } from '../../../data/mockRfqs';
import type { Quotation, QuotationStatus } from '../../../data/mockQuotations';
import {
  createDispatcher,
  InMemoryAuditSink,
  rolesForPersona,
  resolvePolicyHook,
  bindPolicyHook,
  POLICY_HOOKS,
  cascadesFor,
  deriveMatchVerdict,
  type CommandTarget,
  type CascadeCommand,
  type CascadeContext,
  type SettleContext,
} from '../../transitions';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { mockShipments } from '../../../data/mockShipments';
import {
  FORECAST_PUBLICATIONS,
  MATERIAL_MASTER,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  sdcClock,
} from '../../sdc';
import type {
  Acknowledgment,
  IncomingShipment,
  InventoryBatch,
  InventoryDeclaration,
  Provenance,
  RequirementResponse,
  RequirementResponseStatus,
  RootCause,
  ShipmentDirection,
  ShipmentLifecycle,
  Uom,
} from '../../sdc';

// — Purchase-order command target — reads/writes the mutable PO store. ————————
const purchaseOrderTarget: CommandTarget = {
  readState: (id) => purchaseOrderStore.get(id)?.status ?? null,
  readScopeOwner: (id) => purchaseOrderStore.get(id)?.supplierId ?? null,
  readEntity: (id) => purchaseOrderStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    // Immutable swap (new PO + new line items) so the invalidated query yields
    // genuinely-new references and all derivations recompute (see the store).
    const qtys = payload.confirmedQuantities;
    purchaseOrderStore.update(id, (po) => ({
      ...po,
      status: toState as POStatus,
      lineItems: Array.isArray(qtys)
        ? po.lineItems.map((li, i) =>
            typeof qtys[i] === 'number' ? { ...li, confirmedQty: qtys[i] as number } : li,
          )
        : po.lineItems,
    }));
  },
};

// — Advance ship notice target — creation-shape (canonical, Step 4 batch i). ——
const findPoByNumber = (poNumber: string) =>
  purchaseOrderStore.all().find((p) => p.poNumber === poNumber);

const advanceShipNoticeTarget: CommandTarget = {
  readState: (id) => asnStore.get(id)?.status ?? null,
  readScopeOwner: (id) => asnStore.get(id)?.supplierId ?? null,
  readEntity: (id) => asnStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    asnStore.update(id, (a) => ({
      ...a,
      status: toState as AsnStatus,
      carrier: typeof payload.carrier === 'string' && payload.carrier ? payload.carrier : a.carrier,
      trackingNumber:
        typeof payload.trackingNumber === 'string' && payload.trackingNumber
          ? payload.trackingNumber
          : a.trackingNumber,
      eta: typeof payload.eta === 'string' && payload.eta ? payload.eta : a.eta,
    }));
  },
  // Creation scope: a supplier may draft an ASN only against its OWN PO.
  creationOwner: (payload) => findPoByNumber(String(payload.poReference))?.supplierId ?? null,
  create: (payload, toState) => {
    const po = findPoByNumber(String(payload.poReference));
    const asnNumber = asnStore.nextNumber();
    const asn: ASN = {
      asnNumber,
      supplierId: po?.supplierId ?? '',
      poReference: String(payload.poReference),
      status: toState as AsnStatus,
      carrier: typeof payload.carrier === 'string' ? payload.carrier : '',
      trackingNumber: typeof payload.trackingNumber === 'string' ? payload.trackingNumber : '',
      eta: typeof payload.eta === 'string' ? payload.eta : '',
      details: {
        originCity: po?.supplierName ?? '',
        destinationWarehouse: 'NDC Jatake 6, Tangerang',
        totalCartons: 0,
        grossWeightKg: 0,
        temperatureRequirement: 'Ambient',
      },
      lineItems: po
        ? po.lineItems.map((li) => ({
            materialCode: li.materialCode,
            description: li.description,
            orderedQty: li.quantity,
            shippedQty: li.quantity,
            lotNumber: '',
          }))
        : [],
    };
    asnStore.add(asn);
    return { entityId: asnNumber };
  },
};

// Cross-entity creation legality (mock layer — reads the PO store): the parent
// PO must be Confirmed before its ASN can be drafted.
bindPolicyHook(POLICY_HOOKS.ASN_CREATE_PO_CONFIRMED, ({ payload }) => {
  const po = findPoByNumber(String(payload.poReference));
  if (!po) return { ok: false, reason: 'parent PO not found' };
  if (po.status !== POStatus.CONFIRMED) return { ok: false, reason: `PO ${po.poNumber} is not Confirmed` };
  return { ok: true };
});

// — Goods-receipt target (Step 4 batch ii) — buyer-side receiving, inspection,
//   disposition, and the FIRST real sapBoundary verb (Post to SAP, Option B). ——
const shipmentByRef = (asnReference: string) =>
  mockShipments.find((s) => s.asnNumber === asnReference);

// GR header disposition → the GR.disposition field it implies. Line-level
// Quarantine / Return live on the per-line sub-axis; the HEADER only accepts or
// rejects. Interim/receiving states keep the existing disposition.
const dispositionForState = (state: string): Disposition | null => {
  if (state === 'Approved' || state === 'Partially Approved') return 'Accept';
  if (state === 'Rejected') return 'Reject';
  return null;
};

// Shipment states in which the goods are physically present to receive.
const RECEIVABLE_SHIPMENT_STATUSES = new Set(['At Dock', 'Unloading', 'Delivered']);

const goodsReceiptTarget: CommandTarget = {
  readState: (id) => goodsReceiptStore.get(id)?.status ?? null,
  readScopeOwner: (id) => goodsReceiptStore.get(id)?.supplierId ?? null,
  readEntity: (id) => goodsReceiptStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    const reason =
      (typeof payload.dispositionReason === 'string' && payload.dispositionReason) ||
      (typeof payload.holdReason === 'string' && payload.holdReason) ||
      '';
    goodsReceiptStore.update(id, (g) => ({
      ...g,
      status: toState as GRStatus,
      disposition: dispositionForState(toState) ?? g.disposition,
      notes: reason || g.notes,
    }));
  },
  // GR is a buyer/warehouse document: the buyer receives ANY supplier's inbound
  // (no cross-supplier SCOPE_DENIED on create). The GR still carries the shipping
  // supplier's id — derived from the parent shipment — so per-supplier READ
  // scoping holds.
  creationOwner: (payload) => {
    const ref = String(payload.asnReference);
    return shipmentByRef(ref)?.supplierId ?? asnStore.get(ref)?.supplierId ?? null;
  },
  create: (payload, toState) => {
    const ref = String(payload.asnReference);
    const shp = shipmentByRef(ref);
    // Manual/ASN-ref path (no shipment): derive owner/refs from the ASN document
    // and its parent PO (the ASN carries no supplierName — the PO does).
    const asn = shp ? undefined : asnStore.get(ref);
    const asnPo = asn ? findPoByNumber(asn.poReference) : undefined;
    const grNumber = goodsReceiptStore.nextNumber();
    // Inspection results are recorded AT create (the batch-ii proof drives the
    // header rollup from these). The server derives ownership/refs from the
    // shipment (or ASN); only the inspection payload is trusted from the caller.
    const inspectionResults = Array.isArray(payload.inspectionResults)
      ? (payload.inspectionResults as InspectionResult[])
      : [];
    const gr: GoodsReceipt = {
      id: grNumber, // store is keyed by id; the assigned number doubles as the id
      grNumber,
      asnId: shp?.id ?? '',
      asnNumber: shp?.asnNumber ?? asn?.asnNumber ?? ref,
      poNumber:
        shp?.poNumber ??
        asn?.poReference ??
        (typeof payload.poReference === 'string' ? payload.poReference : ''),
      supplierId: shp?.supplierId ?? asn?.supplierId ?? asnPo?.supplierId ?? '',
      supplierName: shp?.supplierName ?? asnPo?.supplierName ?? '—',
      receivedDate: typeof payload.receivedDate === 'string' ? payload.receivedDate : '',
      receivedBy: typeof payload.receivedBy === 'string' ? payload.receivedBy : '',
      status: toState as GRStatus,
      inspectionResults,
      disposition: 'Pending',
      notes: typeof payload.notes === 'string' && payload.notes ? payload.notes : undefined,
    };
    goodsReceiptStore.add(gr);
    return { entityId: grNumber };
  },
};

// GR create legality (mock layer — cross-entity read): the parent shipment must
// have physically arrived, or (for a manual ref) an existing ASN document exists.
bindPolicyHook(POLICY_HOOKS.GR_CREATE_SHIPMENT_RECEIVED, ({ payload }) => {
  const ref = String(payload.asnReference);
  const shp = shipmentByRef(ref);
  if (shp) {
    return RECEIVABLE_SHIPMENT_STATUSES.has(shp.status)
      ? { ok: true }
      : { ok: false, reason: `shipment ${ref} has not arrived (${shp.status})` };
  }
  if (asnStore.get(ref)) return { ok: true };
  return { ok: false, reason: `no arrived shipment or ASN found for ${ref}` };
});

// — Invoice target (Step 4 batch iii, DR-7) — supplier-scoped creation-shape
//   (draft against its OWN PO) + buyer lifecycle (match/approve/dispute) + the
//   second sapBoundary verb (release payment, Option B). Reads/writes the ONE
//   canonical invoice store; both persona reads project from it. ————————————————
const invoiceTarget: CommandTarget = {
  readState: (id) => invoiceStore.get(id)?.status ?? null,
  readScopeOwner: (id) => invoiceStore.get(id)?.supplierId ?? null,
  readEntity: (id) => invoiceStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    invoiceStore.update(id, (inv) => ({
      ...inv,
      status: toState as InvoiceStatus,
      // Submit carries the finalized amount; other verbs leave it untouched.
      amount:
        toState === 'Submitted' && typeof payload.amount === 'number'
          ? payload.amount
          : inv.amount,
    }));
  },
  // Creation scope: a supplier may draft an invoice only against its OWN PO
  // (cross-supplier ⇒ SCOPE_DENIED, exactly as reads). Derived from the parent PO.
  creationOwner: (payload) => findPoByNumber(String(payload.poReference))?.supplierId ?? null,
  create: (payload, toState) => {
    const po = findPoByNumber(String(payload.poReference));
    const invoiceNumber = invoiceStore.nextNumber();
    // Honest dates by construction: a creation that omits the dates (the form
    // carries only PO + amount) defaults submittedDate to today and dueDate to
    // Net-30 — so the invoice is never BORN overdue and aging is a real number,
    // not NaN on an empty date (F-2). An explicit payload date still wins.
    const submittedDate =
      typeof payload.submittedDate === 'string' && payload.submittedDate
        ? payload.submittedDate
        : new Date().toISOString().slice(0, 10);
    const dueDate =
      typeof payload.dueDate === 'string' && payload.dueDate
        ? payload.dueDate
        : new Date(Date.parse(submittedDate) + 30 * 86_400_000)
            .toISOString()
            .slice(0, 10);
    const invoice: Invoice = {
      id: invoiceNumber, // store keyed by id; the assigned number doubles as id
      invoiceNumber,
      supplierId: po?.supplierId ?? '',
      supplierName: po?.supplierName ?? '—',
      poNumber: String(payload.poReference),
      poId: po?.id ?? '',
      amount: typeof payload.amount === 'number' ? payload.amount : 0,
      currency: 'IDR',
      status: toState as InvoiceStatus,
      matchStatus: 'Pending',
      submittedDate,
      dueDate,
      paymentDate: null,
      paymentRef: null,
      sapFiDoc: null,
      sapGrDoc: null,
      bankAccount: typeof payload.bankAccount === 'string' ? payload.bankAccount : '',
      channel: 'Web',
      approver: '',
      paymentTerms: 'Net 30',
      buyerContact: '',
      remittanceNote: null,
    };
    invoiceStore.add(invoice);
    return { entityId: invoiceNumber };
  },
};

// Invoice create legality (mock layer — cross-entity read): the parent PO must
// be Confirmed before its invoice can be drafted (same shape as ASN create).
bindPolicyHook(POLICY_HOOKS.INVOICE_CREATE_PO_CONFIRMED, ({ payload }) => {
  const po = findPoByNumber(String(payload.poReference));
  if (!po) return { ok: false, reason: 'parent PO not found' };
  if (po.status !== POStatus.CONFIRMED) return { ok: false, reason: `PO ${po.poNumber} is not Confirmed` };
  return { ok: true };
});

// — RFQ target (Step 4 batch iv) — buyer-side sourcing. `t_rfq_award` is the
//   CASCADE SOURCE: it flips the RFQ to Awarded and records the award metadata
//   (awardedSupplierId / awardedQuotationId) — NO PO, NO contract minted
//   (honest-by-construction). The buyer owns the RFQ, so readScopeOwner is null
//   (buyer passes; a supplier is blocked at requiredRole — rfq:award ∉ supplier).
const RFQ_CATEGORIES: readonly RFQCategory[] = [
  'Fragrance', 'Active Ingredients', 'Packaging', 'Emulsifiers', 'Botanical', 'Other',
];
const RFQ_UOMS: readonly RFQ['uom'][] = ['KG', 'PCS', 'L', 'MT'];

const rfqTarget: CommandTarget = {
  readState: (id) => rfqStore.get(id)?.status ?? null,
  readScopeOwner: () => null,
  readEntity: (id) => rfqStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    rfqStore.update(id, (r) => ({
      ...r,
      status: toState as RFQStatus,
      // Award records the chosen quote + supplier ONLY. Nothing downstream is
      // fabricated here — PO issuance is a separate buyer verb (future batch).
      awardedQuotationId:
        typeof payload.awardedQuotationId === 'string' ? payload.awardedQuotationId : r.awardedQuotationId,
      awardedSupplierId:
        typeof payload.awardedSupplierId === 'string' ? payload.awardedSupplierId : r.awardedSupplierId,
    }));
  },
  // Creation (Phase A/2 — retires extraRfqs). Buyer-only: `creationOwner: () =>
  // null` ⇒ a buyer passes creation-scope (the dispatcher only scopes suppliers)
  // then the `rfq:create` role; a supplier resolves owner=null → SCOPE_DENIED
  // before the role gate (RFQ creation is a buyer verb). `create` mints an Open
  // RFQ (FORK-2B) from the wizard payload with a store-assigned number; omitted
  // or unrecognised fields default honestly (category/uom fall back rather than
  // guess). NO award metadata and NO downstream artifact on a fresh event.
  creationOwner: () => null,
  create: (payload, toState) => {
    const rfqNumber = rfqStore.nextNumber();
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const num = (k: string) => (typeof payload[k] === 'number' ? (payload[k] as number) : 0);
    const strArr = (k: string) =>
      Array.isArray(payload[k]) ? (payload[k] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    const materialCategory = RFQ_CATEGORIES.includes(payload.materialCategory as RFQCategory)
      ? (payload.materialCategory as RFQCategory)
      : 'Other';
    const uom = RFQ_UOMS.includes(payload.uom as RFQ['uom']) ? (payload.uom as RFQ['uom']) : 'KG';
    const rfq: RFQ = {
      id: rfqNumber, // store keyed by id; the assigned number doubles as the id
      rfqNumber,
      title: str('title'),
      materialCategory,
      materialIds: strArr('materialIds'),
      buyerId: 'buyer-001',
      status: toState as RFQStatus, // 'Open' (FORK-2B)
      createdAt: new Date().toISOString().slice(0, 10),
      responseDeadline: str('responseDeadline'),
      awardDeadline: str('awardDeadline'),
      invitedSupplierIds: strArr('invitedSupplierIds'),
      respondedSupplierIds: [],
      totalQty: num('totalQty'),
      uom,
      estimatedValue: num('estimatedValue'),
      currency: 'IDR',
      incoterms: str('incoterms'),
      paymentTerms: str('paymentTerms'),
    };
    rfqStore.add(rfq);
    return { entityId: rfqNumber };
  },
};

// A newly-submitted quote's compliance + reliability are DECLARED-SIMULATED
// external axes (no real I3 / OTIF source yet). We seed a documented FLAT
// SIMULATED BASELINE — NOT zero (a lying low) and NOT a supplier-profile lookup
// (that would dress a placeholder as a real signal). The scoring engine passes
// these through VERBATIM and marks them "Simulated"; they flip LIVE via the
// two-gate the day real sources land. 50 = neutral midpoint on the 0–100 axis.
const SIMULATED_AXIS_BASELINE = 50;

// — Quotation target (Task 3b + Step 4 batch iv). Two roles:
//   • CREATION (Task 3b) — `t_quotation_submit` is the ONE supplier-owned
//     creation verb. `creationOwner` folds invited-membership AND scope into one
//     ASN-faithful statement (mirrors advanceShipNotice's `findPoByNumber(...)
//     .supplierId`): the owner is the submitting supplier, valid ONLY when it is
//     invited to the referenced RFQ. A non-invited supplier resolves owner=null →
//     SCOPE_DENIED; a supplier spoofing another invited id → owner≠scope →
//     SCOPE_DENIED; a buyer skips scope then fails the `quotation:submit` role
//     gate. `create` persists RAW FACTS only (unitPrice/leadTime/terms/validity)
//     — the derived score axes are the 0/false SENTINEL (engine-owned AT READ,
//     F0.3-FIND-01; storing them would re-fabricate the retired literals), and
//     compliance/reliability seed from the SIMULATED baseline (never a lying 0).
//   • CASCADE (Step 4) — the RFQ-award fan-out fires t_quotation_award (winner →
//     Awarded) / t_quotation_reject (→ Rejected). Supplier-owned read scoping.
const quotationTarget: CommandTarget = {
  readState: (id) => quotationStore.get(id)?.status ?? null,
  readScopeOwner: (id) => quotationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => quotationStore.get(id) ?? null,
  applyTransition: (id, toState) => {
    quotationStore.update(id, (q) => ({ ...q, status: toState as QuotationStatus }));
  },
  creationOwner: (payload) => {
    const rfq = rfqStore.get(String(payload.rfqId));
    const sid = String(payload.supplierId);
    return rfq && rfq.invitedSupplierIds.includes(sid) ? sid : null;
  },
  create: (payload, toState) => {
    const quoteNumber = quotationStore.nextNumber();
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const num = (k: string) => (typeof payload[k] === 'number' ? (payload[k] as number) : 0);
    const rfq = rfqStore.get(str('rfqId'));
    const unitPrice = num('unitPrice');
    const quotation: Quotation = {
      id: quoteNumber, // store keyed by id; the assigned number doubles as the id
      rfqId: str('rfqId'),
      supplierId: str('supplierId'),
      submittedAt: new Date().toISOString().slice(0, 10),
      unitPrice,
      // Honest arithmetic from raw facts (unit × the RFQ's quantity), NOT a score.
      totalPrice: unitPrice * (rfq?.totalQty ?? 0),
      leadTimeDays: num('leadTimeDays'),
      paymentTermsOffered: str('paymentTermsOffered'),
      validUntil: str('validUntil'),
      // DECLARED-SIMULATED axes — documented baseline, passed through the engine
      // and marked "Simulated" at read. Never zero, never a profile lookup.
      complianceScore: SIMULATED_AXIS_BASELINE,
      reliabilityScore: SIMULATED_AXIS_BASELINE,
      // DERIVED axes — the engine owns these AT READ; the stored value is an inert
      // sentinel (no consumer reads a fresh quote's stored derived field).
      priceScore: 0,
      leadTimeScore: 0,
      aiCompositeScore: 0,
      aiRecommended: false,
      status: toState as QuotationStatus, // 'Submitted'
      ...(str('notes') ? { notes: str('notes') } : {}),
    };
    quotationStore.add(quotation);
    return { entityId: quoteNumber };
  },
};

// — Purchase-requisition target (G1.1 — the C7 PR intake) — buyer-only creation.
//   `t_pr_create` is the ONE intake verb both producers target: the internal Grid
//   (G1.2) and external SOMO (F2). Wiring it here closes C7-FIND-01 — the intake
//   maps onto the SAME dispatcher creation mechanism as ASN/invoice, no second path.
//   `creationOwner: () => null` ⇒ a buyer passes creation-scope (dispatcher only
//   scopes suppliers) then the `pr:create` role; a supplier resolves owner=null →
//   SCOPE_DENIED before the role gate (PR is buyer-internal — suppliers never see
//   PRs). `create` mints a Draft PR from the PrIntakeLine payload; omitted fields
//   default honestly. Provenance: `source` (INTERNAL_GRID | SOMO) persists on the
//   entity (C7 §4) — liveness stays registry-derived, plan-state stays the C6
//   overlay; neither is a row field.
const purchaseRequisitionTarget: CommandTarget = {
  readState: (id) => purchaseRequisitionStore.get(id)?.status ?? null,
  readScopeOwner: () => null,
  readEntity: (id) => purchaseRequisitionStore.get(id) ?? null,
  applyTransition: (id, toState) => {
    purchaseRequisitionStore.update(id, (pr) => ({ ...pr, status: toState as PRStatus }));
  },
  creationOwner: () => null,
  create: (payload, toState) => {
    const prNumber = purchaseRequisitionStore.nextNumber();
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const num = (k: string) => (typeof payload[k] === 'number' ? (payload[k] as number) : 0);
    // `source` persists ONLY when it is a recognised producer token — an unknown
    // or absent value leaves the PR without a producer mark (honest, not guessed).
    const source: PrSource | undefined =
      payload.source === 'INTERNAL_GRID' || payload.source === 'SOMO'
        ? (payload.source as PrSource)
        : undefined;
    const priority: PRPriority =
      payload.priority === 'High' || payload.priority === 'Low' ? payload.priority : 'Medium';
    const pr: PurchaseRequisition = {
      id: prNumber, // store keyed by id; the assigned number doubles as the id
      prNumber,
      material: str('material'),
      category: str('category'),
      // C7 §2.1 — the intake's `acceptedQty` maps to `quantity` (the required field).
      quantity: num('quantity'),
      uom: str('uom'),
      // C7 §2 GG-3 — `period` (planning bucket) maps to requiredDate today; a
      // single date until the bucket representation is pinned by IBP co-design.
      requiredDate: str('requiredDate') || str('period'),
      estimatedValue: num('estimatedValue'),
      requestor: str('requestor'),
      costCenter: str('costCenter'),
      status: toState as PRStatus,
      createdDate: new Date().toISOString().slice(0, 10),
      approver: '',
      sourceOfSupply: '',
      linkedDoc: '',
      priority,
      justification: str('justification'),
      ...(source ? { source } : {}),
    };
    purchaseRequisitionStore.add(pr);
    return { entityId: prNumber };
  },
};

// — RequirementResponse target (SDC-2a — the P1 supplier-submission spine). ————
//   `t_requirementresponse_submit` mirrors t_quotation_submit EXACTLY, with the
//   membership check strengthened to LINE-GRAIN by design: the fan-out is OURS
//   (SDC-0 ⭐allocation), so ownership = "this exact supplier × material ×
//   period line was fanned to you" — a supplier can never answer a line
//   published to someone else, nor invent a material×period the publication
//   never fanned. Non-fanned → owner=null → SCOPE_DENIED; spoofed id → owner ≠
//   scope → SCOPE_DENIED; a buyer skips scope then fails the
//   `requirementresponse:submit` role gate.
//   `create` persists RAW FACTS only (confirmedQty / committedDate / capacity
//   constraint / root-cause); response state is derived AT READ by the SDC-1a
//   consolidation selectors (confirmed-full / short / stale are never stored).
//   `uom` is NEVER trusted from the payload — copied from the material master
//   (invariant #2). `submissionVersion` is DERIVED (prior max + 1 over the
//   response thread). confirmedQty: 0 is a LEGAL short confirmation (F-2).
//   Publications are the frozen SDC fixtures until the SOMO C8 feed lands —
//   read-only here (responses mutate; publications never do).
const publicationById = (publicationId: string) =>
  FORECAST_PUBLICATIONS.find((p) => p.publicationId === publicationId);

/** F-4 ruling: a store-minted response is SUPPLIER-authored, committed, and
 *  SIMULATED — the backing store is a mock; liveness flips at F1, not here. */
const PROV_SUPPLIER_SUBMIT: Provenance = Object.freeze({
  source: 'SUPPLIER',
  liveness: 'SIMULATED',
  planState: 'committed',
});

const requirementResponseTarget: CommandTarget = {
  readState: (id) => requirementResponseStore.get(id)?.status ?? null,
  readScopeOwner: (id) => requirementResponseStore.get(id)?.supplierId ?? null,
  readEntity: (id) => requirementResponseStore.get(id) ?? null,
  applyTransition: (id, toState) => {
    requirementResponseStore.update(id, (r) => ({
      ...r,
      status: toState as RequirementResponseStatus,
    }));
  },
  // Line-grain membership folded into creation scope (the quotation pattern,
  // strengthened): the owner is the submitting supplier, valid ONLY when the
  // referenced publication fanned this exact material × period line to it.
  creationOwner: (payload) => {
    const pub = publicationById(String(payload.publicationId));
    const sid = String(payload.supplierId);
    const fanned = pub?.lines.some(
      (l) =>
        l.supplierId === sid &&
        l.materialCode === String(payload.materialCode) &&
        l.periodBucket === String(payload.periodBucket),
    );
    return fanned ? sid : null;
  },
  create: (payload, toState) => {
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const materialCode = str('materialCode');
    const periodBucket = str('periodBucket');
    const publicationId = str('publicationId');
    const supplierId = str('supplierId');
    // creationOwner proved a fanned line exists; resolve it for the honest uom
    // AND the response-kind branch below.
    const line = publicationById(publicationId)?.lines.find(
      (l) =>
        l.supplierId === supplierId &&
        l.materialCode === materialCode &&
        l.periodBucket === periodBucket,
    );
    // invariant #2 — uom comes from the material master (fall back to the
    // fanned line's own uom, which the SDC-0 integrity suite keys to the same
    // master), NEVER from the caller.
    const uom = MATERIAL_MASTER[materialCode]?.canonicalUom ?? line?.uom ?? 'KG';
    // Root cause persists only when it carries a level1 (a shapeless object is
    // dropped, not guessed) — the supplier's explanation for a deviation.
    const rc = payload.rootCause as Partial<RootCause> | undefined;
    const rootCause: RootCause | undefined =
      rc && typeof rc.level1 === 'string' && rc.level1
        ? {
            level1: rc.level1,
            ...(typeof rc.level2 === 'string' && rc.level2 ? { level2: rc.level2 } : {}),
            ...(typeof rc.note === 'string' && rc.note ? { note: rc.note } : {}),
          }
        : undefined;
    const id = requirementResponseStore.nextNumber();
    const prior = requirementResponseStore.forResponseKey(
      supplierId,
      materialCode,
      periodBucket,
      publicationId,
    );
    // SDC-2b-EXT — the response KIND branches on the fanned line's PUBLISHED
    // commitmentClass (authoritative our-side data, never caller input). The
    // symmetric class guards make class ⟺ verb exactly 1:1, so this branch is
    // equivalent to branching on the transition — a commitment can never
    // silently become an acknowledgment or vice versa (invariant #11 XOR).
    const isVisibility = line?.commitmentClass === 'visibility-only';
    const ack = payload.acknowledgment as Partial<Acknowledgment> | undefined;
    const kindFields: Partial<RequirementResponse> = isVisibility
      ? {
          acknowledgment: {
            ...(ack && typeof ack.note === 'string' && ack.note ? { note: ack.note } : {}),
          },
        }
      : {
          forecastConfirmation: {
            // 0 is a legal confirmation ("cannot supply") — dispatcher isEmpty(0)
            // already admits it; NaN/absent coerces to 0 with the root cause telling why.
            confirmedQty: typeof payload.confirmedQty === 'number' ? payload.confirmedQty : 0,
            uom,
            ...(str('committedDate') ? { committedDate: str('committedDate') } : {}),
            ...(str('capacityConstraint')
              ? { capacityConstraint: str('capacityConstraint') }
              : {}),
          },
        };
    const response: RequirementResponse = {
      id, // store keyed by id; the assigned number doubles as the id
      supplierId,
      materialCode,
      periodBucket,
      publicationId,
      planVersion: str('planVersion'),
      // SDC-4a — the SHARED simulated clock, not the real wall-clock: a fresh
      // submission is stamped WITHIN the simulated timeline (after the seed), so
      // the newest-first "My responses" sort surfaces it correctly.
      submittedAt: sdcClock.now(),
      // Versioned, never overwritten: prior max + 1 over the response thread.
      submissionVersion: prior.reduce((m, r) => Math.max(m, r.submissionVersion), 0) + 1,
      status: toState as RequirementResponseStatus, // 'Submitted'
      ...kindFields,
      ...(rootCause ? { rootCause } : {}),
      provenance: PROV_SUPPLIER_SUBMIT,
    };
    requirementResponseStore.add(response);
    return { entityId: id };
  },
};

// RR submit snapshot binding (mock layer — cross-entity read): the payload's
// planVersion must be the referenced publication's OWN planVersion, so a
// response can never claim to answer a snapshot other than the one published.
// (Membership/existence is creationOwner's job and fails FIRST, as scope.)
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_PLANVERSION_BOUND, ({ payload }) => {
  const pub = publicationById(String(payload.publicationId));
  if (!pub) return { ok: false, reason: 'referenced publication not found' };
  if (pub.planVersion !== String(payload.planVersion)) {
    return {
      ok: false,
      reason: `planVersion '${String(payload.planVersion)}' does not match publication '${pub.publicationId}' (${pub.planVersion})`,
    };
  }
  return { ok: true };
});

// SDC-2b-EXT — the symmetric class guards (the honesty lock). creationOwner
// already proved the fanned line exists, so resolving it here cannot miss.
const fannedLineClass = (payload: Record<string, unknown>) =>
  publicationById(String(payload.publicationId))?.lines.find(
    (l) =>
      l.supplierId === String(payload.supplierId) &&
      l.materialCode === String(payload.materialCode) &&
      l.periodBucket === String(payload.periodBucket),
  )?.commitmentClass;

// Submit (a COMMITMENT) is illegal against a visibility-only line — nothing was
// requested to commit; a "confirmed" record there would be a fabricated claim.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_COMMITMENT_CLASS, ({ payload }) => {
  return fannedLineClass(payload) === 'visibility-only'
    ? {
        ok: false,
        reason:
          'line is visibility-only — no commitment requested; use t_requirementresponse_acknowledge',
      }
    : { ok: true };
});

// Acknowledge (a VISIBILITY response) is legal ONLY against a visibility-only
// line — it must never dodge the commitment floor on a firm/semi-firm line.
bindPolicyHook(POLICY_HOOKS.RR_ACKNOWLEDGE_VISIBILITY_CLASS, ({ payload }) => {
  return fannedLineClass(payload) === 'visibility-only'
    ? { ok: true }
    : {
        ok: false,
        reason:
          'line is not visibility-only — a commitment is requested; use t_requirementresponse_submit',
      };
});

// — SDC-3a — the two additional supplier-submission objects ——————————————————
//   Both mirror the requirementResponse spine EXACTLY: creation-shape,
//   supplierId from identity (folded into creationOwner), raw facts persisted,
//   uom NEVER trusted from the payload (copied from the material master,
//   invariant #2). Membership ((i)∪(ii) ruling): "a material Paragon
//   collaborates with you on" — a relationship exists OR any publication ever
//   fanned this supplier × material. A material outside that set → owner=null →
//   SCOPE_DENIED; a spoofed supplierId → owner ≠ scope → SCOPE_DENIED.

/** (i)∪(ii): does Paragon collaborate with this supplier on this material? */
const collaboratedMaterial = (supplierId: string, materialCode: string): boolean =>
  SUPPLIER_MATERIAL_RELATIONSHIPS.some(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode,
  ) ||
  FORECAST_PUBLICATIONS.some((p) =>
    p.lines.some((l) => l.supplierId === supplierId && l.materialCode === materialCode),
  );

/** The supplier's relationship for a material (distributor ⇒ has principals). */
const relationshipFor = (supplierId: string, materialCode: string) =>
  SUPPLIER_MATERIAL_RELATIONSHIPS.find(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode,
  );

const inventoryDeclarationTarget: CommandTarget = {
  // Degenerate single-state snapshot: 'Declared' for any existing id, no-op
  // apply (the SDC-0 type carries no status; this flow adds none).
  readState: (id) => (inventoryDeclarationStore.get(id) ? 'Declared' : null),
  readScopeOwner: (id) => inventoryDeclarationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => inventoryDeclarationStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a declaration is an immutable snapshot; a new count is a new
       declaration (append), never a state change on a prior record. */
  },
  // C4c/C4b — the ONE target serves BOTH verbs (declare + record) since both use
  // entity 'inventoryDeclaration' + this store. `requireCreationOwner` makes the
  // relationship anchor enforceable for a BUYER scope too (the record path). It
  // is INERT for declare: a supplier scope hits the supplier owner-match branch
  // (which already requires a non-null owner) and never the buyer branch — so
  // t_inventorydeclaration_declare is byte-for-byte unchanged. On the record path
  // it blocks a buyer recording for a supplier × material the data never names.
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return collaboratedMaterial(sid, String(payload.materialCode)) ? sid : null;
  },
  create: (payload, _toState) => {
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const materialCode = str('materialCode');
    const supplierId = str('supplierId');
    // invariant #2 — uom is master-owned, never the caller's.
    const uom: Uom = MATERIAL_MASTER[materialCode]?.canonicalUom ?? 'KG';
    const totalQty = typeof payload.totalQty === 'number' ? payload.totalQty : 0;
    // Optional batch-grain detail — each batch's uom is master-copied too
    // (the caller can no more pick a batch unit than the total's). Malformed
    // batches (no batchNumber) are dropped, never guessed. The Σ = totalQty
    // check is the policy hook's job (fails BEFORE create runs).
    const rawBatches = Array.isArray(payload.batches) ? payload.batches : [];
    const batches: InventoryBatch[] = rawBatches
      .filter(
        (b): b is Record<string, unknown> =>
          !!b && typeof b === 'object' && typeof (b as Record<string, unknown>).batchNumber === 'string',
      )
      .map((b) => ({
        batchNumber: String(b.batchNumber),
        qty: typeof b.qty === 'number' ? b.qty : 0,
        uom,
        ...(typeof b.expiryDate === 'string' && b.expiryDate ? { expiryDate: b.expiryDate } : {}),
      }));
    const id = inventoryDeclarationStore.nextNumber();
    const declaration: InventoryDeclaration = {
      id,
      supplierId,
      materialCode,
      // SDC-4a — the SHARED simulated clock, not the real wall-clock: a live
      // declare is stamped within the simulated timeline (after the seed), and
      // the store's insertion recency (declarationRecency) is what makes it the
      // CURRENT SOH regardless of the stamp.
      declaredAt: sdcClock.now(),
      totalQty,
      uom,
      ...(batches.length > 0 ? { batches } : {}),
      provenance: PROV_SUPPLIER_SUBMIT,
    };
    inventoryDeclarationStore.add(declaration);
    return { entityId: id };
  },
};

// INV declare — batch/total agreement (SDC-3a total-first). Only fires when
// batch detail is present; a total-only declaration is honest by construction.
bindPolicyHook(POLICY_HOOKS.INV_DECLARE_BATCH_TOTAL, ({ payload }) => {
  if (!Array.isArray(payload.batches) || payload.batches.length === 0) return { ok: true };
  const total = typeof payload.totalQty === 'number' ? payload.totalQty : 0;
  const sum = payload.batches.reduce(
    (s: number, b: unknown) =>
      s + (b && typeof b === 'object' && typeof (b as Record<string, unknown>).qty === 'number'
        ? ((b as Record<string, unknown>).qty as number)
        : 0),
    0,
  );
  return sum === total
    ? { ok: true }
    : {
        ok: false,
        reason: `batch total ${sum} does not equal declared totalQty ${total} — a total that disagrees with its own detail is fabricated`,
      };
});

const incomingShipmentTarget: CommandTarget = {
  readState: (id) => incomingShipmentStore.get(id)?.lifecycle ?? null,
  readScopeOwner: (id) => incomingShipmentStore.get(id)?.supplierId ?? null,
  readEntity: (id) => incomingShipmentStore.get(id) ?? null,
  applyTransition: (id, toState) => {
    incomingShipmentStore.update(id, (s) => ({
      ...s,
      lifecycle: toState as ShipmentLifecycle,
    }));
  },
  // Membership = a collaborated material. The to-paragon ASN-ownership check is
  // the ISH_TOPARAGON_ASN_LINKED policy hook (it needs the ASN store); scope
  // here is the supplier × collaborated-material statement (spoof → owner≠scope).
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return collaboratedMaterial(sid, String(payload.materialCode)) ? sid : null;
  },
  create: (payload, toState) => {
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const materialCode = str('materialCode');
    const uom: Uom = MATERIAL_MASTER[materialCode]?.canonicalUom ?? 'KG';
    const id = incomingShipmentStore.nextNumber();
    const shipment: IncomingShipment = {
      id,
      supplierId: str('supplierId'),
      materialCode,
      direction: str('direction') as ShipmentDirection,
      lifecycle: toState as ShipmentLifecycle, // 'Booked'
      qty: typeof payload.qty === 'number' ? payload.qty : 0,
      uom,
      ...(str('etd') ? { etd: str('etd') } : {}),
      ...(str('eta') ? { eta: str('eta') } : {}),
      ...(str('awb') ? { awb: str('awb') } : {}),
      ...(str('asnRef') ? { asnRef: str('asnRef') } : {}),
      provenance: PROV_SUPPLIER_SUBMIT,
    };
    incomingShipmentStore.add(shipment);
    return { entityId: id };
  },
};

// SDC-3a — the symmetric direction guards (direction ⟺ ASN linkage, 1:1).
// to-paragon MUST link a resolvable ASN that is the SUPPLIER'S OWN — converges
// on the ASN machine (link, never duplicate; design §2.3). A foreign ASN is a
// spoof; an unresolvable one is a dangling claim.
bindPolicyHook(POLICY_HOOKS.ISH_TOPARAGON_ASN_LINKED, ({ payload }) => {
  if (payload.direction !== 'to-paragon') return { ok: true };
  const ref = typeof payload.asnRef === 'string' ? payload.asnRef : '';
  if (!ref) return { ok: false, reason: 'to-paragon shipment must link an ASN (asnRef)' };
  const asn = asnStore.get(ref);
  if (!asn) return { ok: false, reason: `asnRef '${ref}' does not resolve to a known ASN` };
  if (asn.supplierId !== String(payload.supplierId)) {
    return { ok: false, reason: `asnRef '${ref}' belongs to another supplier` };
  }
  return { ok: true };
});

// principal-to-distributor must NOT carry an asnRef — Paragon is not the
// consignee, so no ASN exists for that leg (the symmetric half).
bindPolicyHook(POLICY_HOOKS.ISH_P2D_NO_ASN, ({ payload }) => {
  if (payload.direction !== 'principal-to-distributor') return { ok: true };
  return typeof payload.asnRef === 'string' && payload.asnRef
    ? { ok: false, reason: 'principal-to-distributor is not a Paragon-inbound leg — it carries no asnRef' }
    : { ok: true };
});

// principal-to-distributor is legal ONLY for a distributor relationship — a
// manufacturer has no principal leg to report (design §7).
bindPolicyHook(POLICY_HOOKS.ISH_P2D_DISTRIBUTOR_ONLY, ({ payload }) => {
  if (payload.direction !== 'principal-to-distributor') return { ok: true };
  const rel = relationshipFor(String(payload.supplierId), String(payload.materialCode));
  return rel?.supplierType === 'distributor'
    ? { ok: true }
    : {
        ok: false,
        reason: 'principal-to-distributor requires a distributor relationship — a manufacturer has no principal leg',
      };
});

const TARGETS: Record<string, CommandTarget> = {
  purchaseOrder: purchaseOrderTarget,
  advanceShipNotice: advanceShipNoticeTarget,
  goodsReceipt: goodsReceiptTarget,
  invoice: invoiceTarget,
  rfq: rfqTarget,
  quotation: quotationTarget,
  purchaseRequisition: purchaseRequisitionTarget,
  requirementResponse: requirementResponseTarget,
  inventoryDeclaration: inventoryDeclarationTarget,
  incomingShipment: incomingShipmentTarget,
};

// The behavior-wiring census (was the contract package's "6"; 7 with the G1.1
// PR intake target; 8 with the SDC-2a RequirementResponse spine; now 10 with
// the SDC-3a InventoryDeclaration + IncomingShipment targets) — the
// entity keys that actually dispatch through a wired
// CommandTarget. Exported as the ONE runtime
// source of truth the LivenessRegistry (F0.6) reads: it derives liveness from
// THESE keys, so an honest-render marker cannot drift from what the command spine
// really wires. Unwire a target here and its capability flips to SIMULATED with
// no edit in the registry (honest-by-construction). Frozen: read-only census.
export const WIRED_COMMAND_TARGETS: readonly string[] = Object.freeze(
  Object.keys(TARGETS),
);

// Cross-entity cascade (census G4): a GR mismatch disposition (reject / partial
// approve) raises a discrepancy on the linked ASN. The registry (cascades.ts)
// declares WHICH verb; the mock resolves WHICH ASN id (the GR's own asnNumber).
// Best-effort — a GR whose ASN is absent or not in a cascadable state no-ops.
const resolveCascades = (ctx: CascadeContext): CascadeCommand[] => {
  if (ctx.entity === 'goodsReceipt') {
    const gr = goodsReceiptStore.get(ctx.entityId);
    if (!gr) return [];
    // GR-post → invoice-match (F0.2, census G4 — closes INV-GR-OVERLAY-01). Fires
    // at the `submitted` moment (B), reusing this one dispatch-time cascade path.
    // For each Submitted invoice sharing the GR's PO, compute the honest 3-way
    // verdict from real PO×GR×invoice data, WRITE the computed matchStatus, and
    // fan out the header t_invoice_match ONLY when the verdict is a genuine
    // 'Matched'. A Qty Mismatch / Price Variance writes that truthful verdict and
    // does NOT advance the header — the invoice stays Submitted (an honest no-op,
    // not a defect). The matchStatus WRITE here is a resolver side-effect and a
    // KNOWN DEFERRAL: its true home is a computed read-projection (DR-7 ruling 1)
    // at A2, where this same `deriveMatchVerdict` is called from the read layer.
    if (ctx.transitionId === 't_gr_post') {
      const [link] = cascadesFor(ctx.transitionId);
      const po = findPoByNumber(gr.poNumber);
      if (!link || !po) return [];
      const expectedValue = po.lineItems.reduce(
        (sum, li) => sum + li.confirmedQty * li.unitPrice,
        0,
      );
      const grHasRejects = gr.inspectionResults.some((r) => r.qtyRejected > 0);
      const cmds: CascadeCommand[] = [];
      for (const inv of invoiceStore.all()) {
        if (inv.poNumber !== gr.poNumber || inv.status !== 'Submitted') continue;
        const verdict = deriveMatchVerdict(expectedValue, inv.amount, grHasRejects);
        invoiceStore.update(inv.id, (i) => ({ ...i, matchStatus: verdict }));
        if (verdict === 'Matched') {
          cmds.push({
            entity: link.targetEntity,
            entityId: inv.id,
            transitionId: link.targetTransitionId,
          });
        }
      }
      return cmds;
    }
    // GR mismatch disposition (reject / partial approve) → ASN discrepancy (batch ii).
    return cascadesFor(ctx.transitionId).map((link) => ({
      entity: link.targetEntity,
      entityId: gr.asnNumber,
      transitionId: link.targetTransitionId,
    }));
  }
  // RFQ award fan-out (batch iv): split the RFQ's quotation siblings across the
  // two declared links — the winner (from the award payload) is awarded, every
  // OTHER sibling is rejected. Best-effort: a sibling already terminal simply
  // no-ops (illegal transition), never breaking the source award.
  if (ctx.entity === 'rfq') {
    const winnerId =
      typeof ctx.payload.awardedQuotationId === 'string' ? ctx.payload.awardedQuotationId : '';
    const siblings = quotationStore.forRfq(ctx.entityId);
    const cmds: CascadeCommand[] = [];
    for (const link of cascadesFor(ctx.transitionId)) {
      if (link.targetTransitionId === 't_quotation_award') {
        const winner = siblings.find((q) => q.id === winnerId);
        if (winner) {
          cmds.push({ entity: link.targetEntity, entityId: winner.id, transitionId: link.targetTransitionId });
        }
      } else {
        for (const q of siblings) {
          if (q.id !== winnerId) {
            cmds.push({ entity: link.targetEntity, entityId: q.id, transitionId: link.targetTransitionId });
          }
        }
      }
    }
    return cmds;
  }
  return [];
};

// SAP-boundary settlement finalize (Step 3.5, Option B): when a submitted
// `t_gr_post` settles, advance interim 'Posting to SAP' → 'Posted to SAP' and
// assign the REAL material document — minted HERE, on settle only, never
// fabricated client-side (closes GR-FABRICATION-01).
const settleFinalize = (ctx: SettleContext): void => {
  if (ctx.entity === 'goodsReceipt' && ctx.transitionId === 't_gr_post') {
    goodsReceiptStore.update(ctx.entityId, (g) => ({
      ...g,
      status: 'Posted to SAP',
      sapMaterialDoc: goodsReceiptStore.nextMatDoc(),
    }));
  }
  // Invoice payment (Option B): a settled `t_invoice_release_payment` advances
  // the interim 'Releasing Payment' → 'Payment Released' and assigns the REAL FI
  // document + payment reference + date — minted HERE, on settle only, never
  // fabricated client-side (no "paid" claim before it is true, law 0.6).
  if (ctx.entity === 'invoice' && ctx.transitionId === 't_invoice_release_payment') {
    invoiceStore.update(ctx.entityId, (inv) => ({
      ...inv,
      status: 'Payment Released',
      sapFiDoc: inv.sapFiDoc ?? invoiceStore.nextFiDoc(),
      paymentRef: inv.paymentRef ?? invoiceStore.nextPaymentRef(),
      paymentDate: inv.paymentDate ?? new Date().toISOString().slice(0, 10),
    }));
  }
};

// Process-wide audit sink + monotonic correlation ids (deterministic for tests).
export const commandAuditSink = new InMemoryAuditSink();
let seq = 0;

const dispatcher = createDispatcher({
  resolveRoles: (scope) => rolesForPersona(scope.personaType),
  target: (entity) => TARGETS[entity],
  resolvePolicyHook,
  sink: commandAuditSink,
  nextCorrelationId: () => `cmd_${(++seq).toString(36).padStart(4, '0')}`,
  now: () => new Date().toISOString(),
  cascade: resolveCascades,
  settleFinalize,
});

/** Settle a `submitted` command to `done` (Step 3.5 SAP settlement hook). */
export const settleCommand = dispatcher.settle;

export class MockCommandService implements ICommandService {
  async dispatch(
    scope: QueryScope,
    input: CommandInput,
    causationId?: string,
  ): Promise<CommandResult> {
    // SDC-3a — forward the session anchor (commands 2..n of a SubmissionSession)
    // so every event this dispatch emits groups to the first command's
    // correlationId (DR-10). The dispatcher has always accepted this third arg
    // (cascades use it); this exposes it on the public seam.
    return dispatcher.dispatch(scope, input, causationId);
  }

  async getCommandStatus(
    _scope: QueryScope,
    correlationId: string,
  ): Promise<CommandStatus | null> {
    return dispatcher.getCommandStatus(correlationId);
  }

  async settle(
    _scope: QueryScope,
    correlationId: string,
  ): Promise<CommandStatus | null> {
    return dispatcher.settle(correlationId);
  }
}
