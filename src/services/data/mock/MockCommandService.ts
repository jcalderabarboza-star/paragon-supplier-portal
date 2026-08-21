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
import { BASE_CURRENCY, type BidCurrency } from '../../../lib/currencyPolicy';
import type { FxPinSource } from '../../../lib/fxPin';
// THE ONE LEGAL PARSER (CP-0 · W1). The transition re-runs the SAME function
// the surface ran — not a second implementation that could drift from it.
import { normalizeQty, type NumberConvention } from '../../../lib/localeNumber';
import {
  asActorAttribution,
  isGovernedCheckId,
  isReviewDay,
  type EnforcementMode,
  type GovernedCheckId,
} from '../../../lib/enforcement';
import {
  createDispatcher,
  InMemoryAuditSink,
  atomsFor,
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
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import { mockShipments } from '../../../data/mockShipments';
import {
  FORECAST_PUBLICATIONS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  isKnownMaterial,
  requireUom,
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

// ── CP-2 · B1 — the GR inspected-lines gate (GR_INSPECTION_MATERIALS_DECLARED) ─
//
// `create` derives ownership and every reference from the parent document, but
// `inspectionResults` was taken VERBATIM from the caller — the one payload
// branch nobody checked. A peer calling `dispatch` directly could file a receipt
// naming a material the shipment never carried, and it would be stored as a
// buyer-authored inspection fact.
//
// The gate is DECLARED OWNERSHIP, not master membership. Deliberate: the GR
// lane's documents live in the mock*.ts identity space, of which the five-entry
// SDC `MATERIAL_MASTER` names two (MASTER-STRADDLE-01, docs/findings.md), so a
// master gate would refuse nearly every legitimate receipt. The parent's own
// line items are the authoritative statement of what arrived — and this is
// STRICTLY STRONGER here than a master check, since it also refuses a
// master-valid code the parent document never declared.
//
// A GR with NO inspection lines stays legal (it rolls up to 'Pending' and
// nothing is finalizable — GRInspectionWizard's existing honest-by-construction
// path for an unreadable line).
const declaredMaterialsFor = (asnReference: string): ReadonlySet<string> | null => {
  const shp = shipmentByRef(asnReference);
  if (shp) return new Set(shp.lineItems.map((li) => li.materialCode));
  const asn = asnStore.get(asnReference);
  if (asn) return new Set(asn.lineItems.map((li) => li.materialCode));
  return null; // GR_CREATE_SHIPMENT_RECEIVED already refuses this case by name.
};

bindPolicyHook(POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED, ({ payload }) => {
  const results = Array.isArray(payload.inspectionResults) ? payload.inspectionResults : [];
  if (results.length === 0) return { ok: true };
  const declared = declaredMaterialsFor(String(payload.asnReference));
  if (!declared) return { ok: true }; // the arrival hook owns the unresolvable-parent refusal
  const undeclared = results
    .map((r) =>
      r && typeof r === 'object' && typeof (r as Record<string, unknown>).materialCode === 'string'
        ? ((r as Record<string, unknown>).materialCode as string)
        : '',
    )
    .filter((code) => !declared.has(code));
  return undeclared.length === 0
    ? { ok: true }
    : {
        ok: false,
        reason: `UNDECLARED_MATERIAL: ${undeclared
          .map((c) => `'${c || '(blank)'}'`)
          .join(', ')} — the parent document never declared this material, and a receipt cannot inspect goods its own shipment does not name`,
      };
});

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
      // 2e-c-3 — THE D-1 FREEZE, made structural. A pin is APPENDED; there is no
      // branch here that finds an existing pin for the currency and replaces it,
      // and there is deliberately never going to be one. Superseding a rate is
      // appending a newer pin, so the basis a comparison was ranked on remains
      // readable for as long as the RFQ does. The pin in force is DERIVED at
      // read (`effectivePin`), so "current" cannot drift from the ledger.
      //
      // The payload is already gated by `rfq_fx_pin_well_formed` (permitted
      // non-base currency, finite positive rate, readable vintage, known
      // source), so the reads below cannot mint a malformed basis.
      ...(payload.quote === undefined
        ? {}
        : {
            fxPins: [
              ...(r.fxPins ?? []),
              {
                quote: payload.quote as BidCurrency,
                base: BASE_CURRENCY,
                rate: payload.rate as number,
                asOf: String(payload.asOf),
                // Store-assigned, never payload-supplied: when a pin was
                // recorded is a fact about the system, and a caller that could
                // set it could backdate its own audit entry.
                pinnedAt: new Date().toISOString(),
                source: payload.source as FxPinSource,
                ...(typeof payload.rateType === 'string' ? { rateType: payload.rateType } : {}),
                // SIMULATED until a real rate feed lands (the Stage-F seam). A
                // MANUAL pin is a real human decision but not a live feed, and
                // dressing it as LIVE would be the two-gate violation this
                // codebase marks everywhere else.
                liveness: 'SIMULATED',
              },
            ],
          }),
    }));
  },
  // Creation (Phase A/2 — retires extraRfqs). Buyer-only: `creationOwner: () =>
  // null` ⇒ a buyer passes creation-scope (the dispatcher only scopes suppliers)
  // then the `rfq:create` role; a supplier resolves owner=null → SCOPE_DENIED
  // before the role gate (RFQ creation is a buyer verb). `create` mints a DRAFT
  // RFQ (PF-1a · D-1, reversing FORK-2B — the buyer publishes it as a second,
  // deliberate act) from the wizard payload with a store-assigned number; omitted
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
      status: toState as RFQStatus, // 'Draft' (PF-1a · D-1 — reverses FORK-2B)
      createdAt: new Date().toISOString().slice(0, 10),
      responseDeadline: str('responseDeadline'),
      awardDeadline: str('awardDeadline'),
      invitedSupplierIds: strArr('invitedSupplierIds'),
      respondedSupplierIds: [],
      // Required by the flow's `requiredFields` since 2e-b-4a, so `num()`'s 0
      // fallback is unreachable here — an absent quantity fails MISSING_FIELDS
      // before create is ever called, rather than minting an RFQ for nothing.
      totalQty: num('totalQty'),
      uom,
      // The buyer's estimated budget (2e-b-4a) — preserved ONLY when the payload
      // actually carries one. Deliberately NOT `num('estimatedValue')`: that
      // helper returns 0 for an absent field, which would mint "this event is
      // budgeted at Rp 0" out of a buyer who specified nothing. Absence stays
      // absence. Same reasoning, same shape, as `moq` on the quotation target.
      ...(typeof payload.estimatedValue === 'number'
        ? { estimatedValue: payload.estimatedValue as number }
        : {}),
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
      // The currency the price is denominated in (2e-c-2). The flow REQUIRES it
      // and the `quotation_submit_currency_permitted` policy proves it is a
      // permitted token, so both the empty case and the off-list case fail
      // before create is ever called — there is no fallback here to write,
      // because a fallback is precisely how an EUR bid used to become rupiah.
      // Cast is safe on that pair of guards, not on optimism.
      currency: str('currency') as BidCurrency,
      // Honest arithmetic from raw facts (unit × the RFQ's quantity), NOT a score.
      // Denominated in the quote's OWN currency — the RFQ's quantity is a count,
      // so it carries no currency of its own to disagree with.
      totalPrice: unitPrice * (rfq?.totalQty ?? 0),
      // Required by the flow's `requiredFields`, so `num()`'s 0 fallback is
      // unreachable here — an absent lead time fails MISSING_FIELDS before
      // create is ever called, rather than being minted as a same-day promise.
      leadTimeDays: num('leadTimeDays'),
      // The supplier's minimum order quantity (2e-b-2) — preserved ONLY when the
      // payload actually carries one. Deliberately NOT `num('moq')`: that helper
      // returns 0 for an absent field, which would mint "this supplier's minimum
      // is zero" out of a supplier who said nothing. Absence stays absence.
      ...(typeof payload.moq === 'number' ? { moq: payload.moq as number } : {}),
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
  applyTransition: (id, toState, payload) => {
    purchaseRequisitionStore.update(id, (pr) => ({
      ...pr,
      status: toState as PRStatus,
      // ⚠️ §67 — THE REJECTION REASON IS PERSISTED, AND THIS IS THE HALF THE
      // INVOICE LANE NEVER BUILT. There, a required `disputeReason` reaches
      // `applyTransition` and is dropped on the floor (`:703`); here the text
      // the verb refused to proceed without is written onto the document the
      // requester reads. A required field whose value evaporates is a
      // validation message, not a record.
      //
      // Proven a non-blank string by `PR_REJECT_REASON_AUTHORED` before this
      // runs, so no re-check and no fallback: a fallback here would be the
      // guard admitting it does not trust itself.
      //
      // NOT cleared on any other edge — `t_pr_revise` carries the PR back to
      // Draft and the reason stays, because "why this came back" is precisely
      // what a requester needs while revising. Only a fresh rejection replaces
      // it.
      ...(toState === 'Rejected' ? { rejectionReason: String(payload.rejectionReason) } : {}),
    }));
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
  applyTransition: (id, toState, payload) => {
    requirementResponseStore.update(id, (r) => ({
      ...r,
      status: toState as RequirementResponseStatus,
      // ⚠️ R1b — THE DISPUTE LEDGER APPENDS. It never clears and never replaces.
      // `r` is the PRE-transition record, so `r.status` is the from-state: that
      // is what separates a RESOLUTION (Disputed → UnderReview) from a REVIEW
      // (Submitted → UnderReview), which lands on the same state and must add
      // nothing. The text was proven non-blank by `rr_dispute_text_authored`;
      // `at` is minted HERE from the shared SDC clock and never taken from the
      // payload (the `pinnedAt` discipline — a caller that could set it could
      // backdate its own dispute).
      //
      // This is the half the invoice lane never built: there, the required
      // `disputeReason` reaches `applyTransition` and is dropped on the floor.
      ...(toState === 'Disputed'
        ? {
            disputeResponse: [
              ...(r.disputeResponse ?? []),
              { kind: 'raised' as const, text: String(payload.disputeReason), at: sdcClock.now() },
            ],
          }
        : {}),
      ...(r.status === 'Disputed' && toState === 'UnderReview'
        ? {
            disputeResponse: [
              ...(r.disputeResponse ?? []),
              { kind: 'resolved' as const, text: String(payload.resolutionReason), at: sdcClock.now() },
            ],
          }
        : {}),
      // ⚠️ PF-1b — `submittedAt` IS STAMPED AT PROMOTION, NOT AT CREATION. A
      // draft has never been submitted, and the SDC-0 seed already encodes the
      // invariant by carrying no `submittedAt` on rr-0003.
      //
      // STORE-ASSIGNED, never payload-supplied (the `pinnedAt` discipline: a
      // caller that could set it could backdate its own submission against a
      // response deadline). Written only on the Draft → Submitted crossing, and
      // only when absent — a later buyer-side move (review / accept / dispute)
      // must not restamp the moment the supplier answered.
      ...(toState === 'Submitted' && !r.submittedAt ? { submittedAt: sdcClock.now() } : {}),
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
    // invariant #2 — uom comes from the material master, NEVER from the caller.
    // CP-2 · B1: the old `?? line?.uom ?? 'KG'` tail is GONE. The line fallback
    // was only ever equal to the master (the SDC-0 integrity suite keys it
    // there), and the 'KG' behind it was a fabricated unit with arithmetic
    // consequences. `SDC_MATERIAL_KNOWN` refuses UNKNOWN_MATERIAL before this
    // runs, so `requireUom` is an unreachable-by-construction assertion — and,
    // unlike a `??` chain, it can never silently invent a unit if that hook is
    // ever unwired.
    const uom = requireUom(materialCode);
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
            // already admits it.
            //
            // ⚠️ THE `: 0` FALLBACK THAT STOOD HERE WAS UNREACHABLE AND ITS COMMENT
            // DESCRIBED DELETED BEHAVIOUR. It read "NaN/absent coerces to 0 with the
            // root cause telling why" — true before #237, when nothing above proved
            // the type. Policy hooks run at dispatcher step 6 and `applyTransition`
            // at step 7, so since RR_SUBMIT_QTY_FLOOR landed, a non-number or a
            // non-finite `confirmedQty` cannot reach this line at all. Manufacturing
            // a ZERO COMMITMENT out of garbage is the exact defect CP-0 killed in
            // `submitModel`; it survived here for one release as dead code wearing a
            // justification. The floor and the agreement guard are the two proofs
            // that let this be a plain read.
            confirmedQty: payload.confirmedQty as number,
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
      // ⚠️ PF-1b — ONLY WHEN THIS CREATION ACTUALLY SUBMITS. The commitment verb
      // now births a `Draft`, which by definition has no submission instant; the
      // acknowledge verb still births `Submitted` and keeps its stamp. Derived
      // from `toState` rather than from the transition id, so the two can never
      // disagree about what just happened.
      //
      // SDC-4a — the SHARED simulated clock, not the real wall-clock: a fresh
      // submission is stamped WITHIN the simulated timeline (after the seed), so
      // the newest-first "My responses" sort surfaces it correctly.
      ...(toState === 'Draft' ? {} : { submittedAt: sdcClock.now() }),
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

// RR submit — the quantity floor at the TRANSITION (the contract), mirroring
// the shape `PO_CONFIRM_QTY_WITHIN_ORDERED` already enforces on a field of the
// same name. `requiredFields` proves presence; this proves the value is a
// number a Σ can survive. The bound is `>= 0`, NOT the neighbour's `> 0`: a
// typed 0 is the ratified F-2 "cannot supply at all" confirmation.
//
// It validates the VALUE, never the READING. The READING is now proven by
// RR_SUBMIT_QTY_AGREES below, which is where `SUB-01`'s gap closed.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_QTY_FLOOR, ({ payload }) => {
  const q = payload.confirmedQty;
  if (typeof q !== 'number' || !Number.isFinite(q)) {
    return {
      ok: false,
      reason: `confirmedQty must be a finite number, got ${typeof q === 'number' ? String(q) : typeof q}`,
    };
  }
  if (q < 0) {
    return { ok: false, reason: `confirmedQty ${q} is negative — a commitment cannot be less than nothing` };
  }
  return { ok: true };
});

// RR submit — THE READING, proven at the transition by re-parsing the token.
//
// THE HOIST (CP-0 §4 amended for THIS VERB ONLY). "The builder does not parse"
// is unchanged: the builder still ships the number it is given. What changed is
// that the CONTRACT no longer takes the caller's word for what that number
// means — it is handed the token too, runs the same `normalizeQty` the surface
// ran, and refuses if the two disagree.
//
// ⚠️ WHAT THIS CANNOT DO is stated on POLICY_HOOKS.RR_SUBMIT_QTY_AGREES at
// length and is the batch's honest cost: the convention is still the caller's
// to supply, so this proves CONSISTENCY, never correctness.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_QTY_AGREES, ({ payload }) => {
  const raw = payload.confirmedQtyRaw;
  // `requiredFields` already refused an absent / empty token — but it uses
  // `isEmpty`, which is FALSE for `0`, `false` and `'   '`. A NUMBER in this
  // slot would sail through rule 5 and then silently stringify here, so the
  // type is proven rather than assumed.
  if (typeof raw !== 'string') {
    return {
      ok: false,
      reason: `confirmedQtyRaw must be the quantity token as typed (a string), got ${typeof raw}`,
    };
  }

  // An unrecognised convention is refused rather than ignored. Ignoring it would
  // silently downgrade to the hint-free parse — which is STRICTER, so it would
  // usually still refuse; "usually" is not a contract, and a caller shipping
  // `numberConvention: 'de'` has a defect it deserves to be told about.
  const conv = payload.numberConvention;
  if (conv !== undefined && conv !== 'id' && conv !== 'en') {
    return {
      ok: false,
      reason: `numberConvention must be 'id' or 'en' when present, got ${JSON.stringify(conv)}`,
    };
  }

  const parsed = normalizeQty(raw, conv as NumberConvention | undefined);
  if (!parsed.ok) {
    // The refusal REASON travels, because "we cannot read this" and "we cannot
    // tell which of two numbers you mean" ask the caller for different things —
    // the same distinction the surface already makes in its toast.
    return {
      ok: false,
      reason: `confirmedQtyRaw ${JSON.stringify(raw)} is not a readable quantity (${parsed.reason})`,
    };
  }

  // The floor ran first, so `confirmedQty` is already a finite number here.
  if (parsed.value !== payload.confirmedQty) {
    return {
      ok: false,
      reason:
        `confirmedQty ${String(payload.confirmedQty)} disagrees with confirmedQtyRaw ` +
        `${JSON.stringify(raw)}, which reads ${parsed.value}` +
        `${conv === undefined ? ' with no stated convention' : ` under '${String(conv)}'`}`,
    };
  }
  return { ok: true };
});

// RR dispute / resolve — the authored text must be SUBSTANCE, not presence.
//
// ⚠️ WHICH FIELD IS ASKED FOR IS DERIVED FROM THE MACHINE, NEVER FROM THE
// TRANSITION ID. `toState === 'Disputed'` is the raise; `currentState ===
// 'Disputed'` is the resolution. Keying on the id would put the same fact in two
// places and let them disagree — and `t_requirementresponse_review` ALSO lands on
// `UnderReview`, so `toState` alone cannot tell a resolution from a review (it
// carries no hook, but a guard that would be wrong if it were reached is a guard
// waiting for its second caller).
//
// The bound is a NON-BLANK STRING. `requiredFields` runs `isEmpty`, and
// `isEmpty('   ')` is false — so is `isEmpty(0)` and `isEmpty(false)`. Without
// this, "required" admitted the space bar. It cannot prove the text is TRUE or
// responsive; no value-level guard can, exactly as the qty floor cannot tell
// 2400 from 2.4.
bindPolicyHook(POLICY_HOOKS.RR_DISPUTE_TEXT_AUTHORED, ({ payload, toState, currentState }) => {
  const field = toState === 'Disputed' ? 'disputeReason' : 'resolutionReason';
  const value = payload[field];
  if (typeof value !== 'string') {
    return { ok: false, reason: `${field} must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason: `${field} is blank — a ${
        toState === 'Disputed' ? 'dispute' : 'resolution'
      } from ${currentState} must say something the supplier can read`,
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

// ── CP-2 · B1 — the MASTER-MISS refusal (operator ruling D-OPS-MASTERMISS) ────
//
// Shared by all four SDC creation verbs (RR submit + acknowledge, INV declare +
// record, ISH report). Creation scope already proves the supplier COLLABORATES
// on the material — but `collaboratedMaterial` above tests relationships ∪
// publications, NOT the master. Nothing at RUNTIME forces those two sets to be
// master-subsets; only the SDC-0 integrity suite does
// (sdc.integrity.test.ts:81), and a suite is not a boundary. So the moment a
// relationship row or a SOMO-fed publication line names a code the master
// lacks, the old `?? 'KG'` tail fabricated a unit. This proves the unit exists
// before anything is stamped with one.
//
// REFUSED OUTRIGHT — no quarantine, no accept-with-marker. At F2, an
// unresolvable code in SOMO's live feed gets a loud error at WIRE TIME rather
// than a silent backlog of facts that exist but are not trustworthy.
bindPolicyHook(POLICY_HOOKS.SDC_MATERIAL_KNOWN, ({ payload }) => {
  const materialCode = typeof payload.materialCode === 'string' ? payload.materialCode : '';
  return isKnownMaterial(materialCode)
    ? { ok: true }
    : {
        ok: false,
        reason: `UNKNOWN_MATERIAL: '${materialCode || '(blank)'}' is not in the material master — no canonical unit exists for it, and a quantity without a trustworthy unit is not a fact this platform stores`,
      };
});

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
    // invariant #2 — uom is master-owned, never the caller's. CP-2 · B1: the
    // `?? 'KG'` default is gone; `SDC_MATERIAL_KNOWN` already refused an
    // unresolvable code by name.
    const uom: Uom = requireUom(materialCode);
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
    // CP-2 · B1 — master-owned, refused by name upstream (SDC_MATERIAL_KNOWN),
    // never defaulted: a PCS material stamped 'KG' poisons the coverage sum and
    // the fulfilment drawdown with no surface saying a unit was invented.
    const uom: Uom = requireUom(materialCode);
    const id = incomingShipmentStore.nextNumber();
    const shipment: IncomingShipment = {
      id,
      supplierId: str('supplierId'),
      materialCode,
      direction: str('direction') as ShipmentDirection,
      lifecycle: toState as ShipmentLifecycle, // 'Booked'
      // CP-0 · W1 · PR-2d — `Number.isFinite`, NOT `typeof === 'number'`.
      // `typeof NaN === 'number'` is true and `isEmpty(NaN)` is false, so a NaN
      // quantity passed `requiredFields` and was STORED — then rendered as a
      // tidy em-dash by `formatNumber`, and silently poisoned the coverage sum
      // and the fulfilment drawdown. Every surface upstream now refuses before
      // it can produce one; this closes the hole at the boundary itself, where
      // it cannot be reopened by a future caller.
      qty: Number.isFinite(payload.qty) ? (payload.qty as number) : 0,
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

// — Enforcement target (CP-3 · E2) — the governed check, and its ledger. ————————
//
// The entity IS the check, and it exists because `GOVERNED_CHECK_IDS` names it
// — there is nothing to create. So `readState` answers the single state for a
// known id and `null` for anything else, which makes an unknown check
// `NOT_FOUND` rather than a silently-minted one, and `create` is absent
// entirely.
//
// `readScopeOwner` is null: an enforcement setting is a BUYER governance record
// with no supplier owner. A supplier is stopped at the ROLE gate
// (`enforcement:set` ∉ supplier), which is where it belongs — a supplier
// deciding how hard its own compliance check bites would be the whole thesis
// inverted.
//
// `readEntity` hands the policy hook THE LEDGER FOR THIS CHECK, which is what
// the direction rule needs: "is this a loosening?" is a question about the last
// recorded act, and the hook must read it from the same place `settingInForce`
// will.
//
// `applyTransition` APPENDS and writes no state (statePreserving). `setAt` is
// minted HERE, from the clock, at the moment of the act — the `pinnedAt`
// discipline. The payload has already been through `enforcement_set_governed`
// (recognised mode, well-formed actor, review date below full rigour, named
// actor on a loosening), so the reads below cannot mint an ungoverned setting.
const enforcementTarget: CommandTarget = {
  readState: (id) => (isGovernedCheckId(id) ? 'Governed' : null),
  readScopeOwner: () => null,
  readEntity: (id) => enforcementSettingStore.forCheck(id),
  applyTransition: (id, _toState, payload) => {
    const mode = payload.mode as EnforcementMode;
    const setBy = asActorAttribution(payload.setBy)!;
    const setAt = new Date().toISOString();
    const checkId = id as GovernedCheckId;
    enforcementSettingStore.append(
      mode === 'BLOCK'
        ? // At full rigour a review date is legal but optional — there is no
          //  relaxation whose lapse anyone need care about. Preserved when given,
          //  never invented.
          { checkId, setBy, setAt, mode, reviewBy: isReviewDay(payload.reviewBy) ? payload.reviewBy : null }
        : { checkId, setBy, setAt, mode, reviewBy: payload.reviewBy as string },
    );
  },
};

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
  // CP-3 · E2 — the enforcement-setting recording verb. Wired so every recorded
  // relaxation lands in the DR-10 trail; NO GATE READS THE SETTING YET (E3).
  enforcement: enforcementTarget,
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
  // ── ⚠️ THE WILDCARD RETIREMENT, AND IT IS THIS ONE LINE ────────────────────
  //
  // WAS: `(scope) => rolesForPersona(scope.personaType)`. `PersonaType` is
  // `'buyer' | 'supplier'`, so EVERY buyer session resolved to all 48 buyer
  // atoms unconditionally — award, post-to-SAP, release-payment and
  // enforcement-mode-setting held by one undifferentiated seat. That
  // persona-wide grant WAS the wildcard: there is no literal `buyer:all` in the
  // role path (it is the DR-10 audit ACTOR string, `events.ts:actorKey`, and a
  // `requiredRole` on 0 of 91 transitions) and the gate is a plain
  // `Array.includes` with no short-circuit. The wildcard was the SHAPE of the
  // grant, not a token in it.
  //
  // ⚠️ **AND THERE IS DELIBERATELY NO PERSONA FALLBACK.** A scope without roles
  // resolves to NOTHING and is refused `ROLE_NOT_PERMITTED`. Falling back to
  // the persona span would re-grant all 48 atoms to every caller that had not
  // been migrated yet — the wildcard surviving as a default, which is a
  // wildcard with better manners. A refusal is loud, attributable to a named
  // atom, and impossible to mistake for a working narrow grant.
  resolveRoles: (scope) => atomsFor(scope.businessRoles ?? []),
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
