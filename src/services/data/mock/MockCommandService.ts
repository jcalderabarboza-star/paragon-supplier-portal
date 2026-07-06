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
} from '../types';
import type {
  GoodsReceipt,
  GRStatus,
  Disposition,
  InspectionResult,
} from '../../../data/mockGoodsReceipts';
import {
  createDispatcher,
  InMemoryAuditSink,
  rolesForPersona,
  resolvePolicyHook,
  bindPolicyHook,
  POLICY_HOOKS,
  cascadesFor,
  type CommandTarget,
  type CascadeCommand,
  type CascadeContext,
  type SettleContext,
} from '../../transitions';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { mockShipments } from '../../../data/mockShipments';

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
      submittedDate: typeof payload.submittedDate === 'string' ? payload.submittedDate : '',
      dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : '',
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

const TARGETS: Record<string, CommandTarget> = {
  purchaseOrder: purchaseOrderTarget,
  advanceShipNotice: advanceShipNoticeTarget,
  goodsReceipt: goodsReceiptTarget,
  invoice: invoiceTarget,
};

// Cross-entity cascade (census G4): a GR mismatch disposition (reject / partial
// approve) raises a discrepancy on the linked ASN. The registry (cascades.ts)
// declares WHICH verb; the mock resolves WHICH ASN id (the GR's own asnNumber).
// Best-effort — a GR whose ASN is absent or not in a cascadable state no-ops.
const resolveCascades = (ctx: CascadeContext): CascadeCommand[] => {
  if (ctx.entity !== 'goodsReceipt') return [];
  const gr = goodsReceiptStore.get(ctx.entityId);
  if (!gr) return [];
  return cascadesFor(ctx.transitionId).map((link) => ({
    entity: link.targetEntity,
    entityId: gr.asnNumber,
    transitionId: link.targetTransitionId,
  }));
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
  async dispatch(scope: QueryScope, input: CommandInput): Promise<CommandResult> {
    return dispatcher.dispatch(scope, input);
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
