// ────────────────────────────────────────────────────────────────────────────
// Command hooks (v2.2 Step 3.6 + 3.10) — the write side of the query layer.
//
// The canonical mutation pattern: dispatch a command through the service seam →
// on a non-failed outcome, targeted invalidateQueries by scopeKey (procurement,
// current scope only) → the page re-derives from the mutated store. Pages hold
// NO local seeded copy.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { scopeKey } from './useServiceQuery';
import type {
  CommandResult,
  CommandStatus,
  QueryScope,
  InspectionResult,
  CommandDecision,
} from '../data/types';

function useScope(): QueryScope {
  const { identity } = useCurrentIdentity();
  return { personaType: identity.personaType, supplierId: identity.supplierId };
}

// Targeted invalidation: only the current scope's procurement reads (the last
// key element is the scopeKey), so a command never disturbs another supplier's
// cache and every derivation of THIS scope re-derives together.
function useInvalidateProcurement() {
  const qc = useQueryClient();
  return (scope: QueryScope) => {
    const key = scopeKey(scope);
    qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'procurement' && q.queryKey[q.queryKey.length - 1] === key,
    });
  };
}

export interface PoConfirmVars {
  poId: string;
  confirmedQuantities: number[];
}

/**
 * Confirm a purchase order (fires `t_po_confirm`). On a non-failed outcome,
 * invalidates the current scope's procurement reads so the PO list/detail
 * re-derive with the new Confirmed status.
 */
export function usePurchaseOrderConfirm() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, PoConfirmVars>({
    mutationFn: ({ poId, confirmedQuantities }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: poId,
        payload: { confirmedQuantities },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface AsnCreateVars {
  poReference: string;
  carrier?: string;
  trackingNumber?: string;
  eta?: string;
}

/**
 * Draft an ASN from a confirmed PO (fires the `creation` verb `t_asn_create`).
 * No entityId — the store assigns the ASN number, returned on the result. On a
 * non-failed outcome the ASN list AND the "awaiting ASN" panel re-derive.
 */
export function useAdvanceShipNoticeCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, AsnCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_create',
        entity: 'advanceShipNotice',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface AsnSubmitVars {
  asnNumber: string;
  carrier: string;
  trackingNumber: string;
  eta: string;
}

/** Submit a Draft ASN (fires `t_asn_submit`, Draft → Submitted). */
export function useAdvanceShipNoticeSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, AsnSubmitVars>({
    mutationFn: ({ asnNumber, carrier, trackingNumber, eta }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_submit',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: { carrier, trackingNumber, eta },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── RFQ create (Phase A/2 — retires extraRfqs) ──────────────────────────────
// Buyer raises a sourcing event through the SAME dispatcher creation mechanism as
// t_pr_create / t_asn_create (a creation-shape verb, near-clone of
// usePurchaseRequisitionCreate). Buyer-only: a supplier scope is SCOPE_DENIED
// before the role gate (RFQ creation is a buyer verb). This is the ONLY RFQ write
// path for a new event — it replaces the `extraRfqs` client-fabrication; on a
// non-failed outcome the sourcing board re-reads and the minted RFQ is list-visible.

export interface RfqCreateVars {
  /** The t_rfq_create payload (title + materialCategory required). */
  payload: Record<string, unknown>;
}

/** Raise a new RFQ (fires the `creation` verb `t_rfq_create`). */
export function useRfqCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqCreateVars>({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_create',
        entity: 'rfq',
        payload,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── RFQ award (Step 4 batch iv) — the cascade-class verb ────────────────────
// Buyer awards an RFQ to a chosen quotation. The dispatcher fans out (winner →
// Awarded, every other → Rejected) under one causation group; a non-failed
// outcome invalidates the buyer's procurement reads so the sourcing board, the
// awards history, and the quotation statuses all re-derive together.

export interface RfqAwardVars {
  rfqId: string;
  awardedQuotationId: string;
  awardedSupplierId: string;
}

/** Award an Open/Closed RFQ to a quotation (fires the cascade source `t_rfq_award`). */
export function useRfqAward() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqAwardVars>({
    mutationFn: ({ rfqId, awardedQuotationId, awardedSupplierId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_award',
        entity: 'rfq',
        entityId: rfqId,
        payload: { awardedQuotationId, awardedSupplierId },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── RFQ lifecycle (F0.3) — the non-award, non-cascade sourcing verbs ─────────
// Buyer-only, payload-free state moves. Neither mints a downstream artifact nor
// fans out (no cascade): cancel is a terminal abandon, reopen returns a closed
// event to the response window. The dispatcher enforces the legal from-states
// (cancel: Draft/Open/Closed; reopen: Closed only) and the buyer role, so an
// illegal-from-here or wrong-persona attempt fails without mutating. On a
// non-failed outcome the sourcing board + awards history re-derive from the store.
// (t_rfq_publish stays authored-unwired — the only Draft fixture has no invited
// suppliers, so publish would yield a hollow 0/0 event. t_quotation_submit /
// t_quotation_review are WIRED below, Task 3b.)

export interface RfqLifecycleVars {
  rfqId: string;
}

/** Cancel an RFQ before award (fires `t_rfq_cancel`, Draft/Open/Closed → Cancelled). */
export function useRfqCancel() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqLifecycleVars>({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_cancel',
        entity: 'rfq',
        entityId: rfqId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Reopen a closed RFQ for further responses (fires `t_rfq_reopen`, Closed → Open). */
export function useRfqReopen() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqLifecycleVars>({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_reopen',
        entity: 'rfq',
        entityId: rfqId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Quotation lifecycle (Task 3b — the last sourcing-spine piece) ───────────
// t_quotation_submit is the ONE supplier-owned CREATION verb: the invited
// supplier answers an RFQ through the SAME dispatcher creation mechanism as
// t_rfq_create / t_pr_create (near-clone of useRfqCreate). Scope is ASN-faithful
// — the target's creationOwner admits the caller only if it is invited to the
// RFQ (else SCOPE_DENIED). The payload is RAW FACTS; the engine owns scoring at
// read (#78). t_quotation_review is the buyer's Submitted → Under Review move.

export interface QuotationSubmitVars {
  /** The t_quotation_submit payload (rfqId + unitPrice + leadTimeDays required). */
  payload: Record<string, unknown>;
}

/** Submit a quotation against an invited RFQ (fires the `creation` verb `t_quotation_submit`). */
export function useQuotationSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, QuotationSubmitVars>({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_quotation_submit',
        entity: 'quotation',
        payload,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface QuotationReviewVars {
  quotationId: string;
}

/** Move a submitted quote into evaluation (fires `t_quotation_review`, Submitted → Under Review). */
export function useQuotationReview() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, QuotationReviewVars>({
    mutationFn: ({ quotationId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_quotation_review',
        entity: 'quotation',
        entityId: quotationId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Goods receipt (Step 4 batch ii) ────────────────────────────────────────
// The GR is a buyer/warehouse document, so these dispatch under the buyer scope.
// Create records the finalized inspection results; the header disposition is a
// ROLLUP the dispatcher re-derives from those stored lines (the UI cannot claim
// "Approved" a line rollup contradicts). Post is the first real sapBoundary verb.

export interface GrCreateVars {
  /** The parent shipment's ASN number (or a manual ASN ref). */
  asnReference: string;
  inspectionResults: InspectionResult[];
  receivedDate: string;
  receivedBy: string;
  notes?: string;
}

/**
 * Receive a GR from an arrived shipment (fires the `creation` verb
 * `t_gr_create`). No entityId — the store assigns the GR number, returned on
 * the result. Records the inspection results at create.
 */
export function useGoodsReceiptCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, GrCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_create',
        entity: 'goodsReceipt',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface GrFinalizeVars {
  grId: string;
  /** The rolled-up header verb: t_gr_approve | t_gr_partial_approve | t_gr_reject. */
  headerVerb: string;
  /** Required by t_gr_reject; ignored otherwise. */
  dispositionReason?: string;
}

/**
 * Finalize inspection: advance Pending → Under Inspection (best-effort — a GR
 * already Under Inspection stays put) then fire the rolled-up header verb. The
 * verb's rollup policy hook re-derives the disposition from the stored lines, so
 * the header is provably derived. A reject/partial cascades an ASN discrepancy.
 */
export function useGoodsReceiptFinalize() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, GrFinalizeVars>({
    mutationFn: async ({ grId, headerVerb, dispositionReason }) => {
      // Move into inspection if still Pending; ignore an illegal-from-here result.
      await svc.commands.dispatch(scope, {
        transitionId: 't_gr_start_inspection',
        entity: 'goodsReceipt',
        entityId: grId,
      });
      return svc.commands.dispatch(scope, {
        transitionId: headerVerb,
        entity: 'goodsReceipt',
        entityId: grId,
        payload: dispositionReason ? { dispositionReason } : {},
      });
    },
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/**
 * Post an Approved / Partially Approved GR to SAP (fires the sapBoundary verb
 * `t_gr_post`). Resolves `submitted`: the GR moves to the interim 'Posting to
 * SAP' with NO material document yet — the caller settles to finalize.
 */
export function useGoodsReceiptPost() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { grId: string }>({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_post',
        entity: 'goodsReceipt',
        entityId: grId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/**
 * Settle a submitted `t_gr_post` (the async SAP callback): advances 'Posting to
 * SAP' → 'Posted to SAP' and assigns the real material document under the same
 * correlationId. Idempotent.
 */
export function useGoodsReceiptSettle() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandStatus | null, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) => svc.commands.settle(scope, correlationId),
    onSuccess: () => invalidate(scope),
  });
}

// ─── Invoice (Step 4 batch iii, DR-7) ───────────────────────────────────────
// ONE canonical machine; both persona surfaces re-derive from one store. The
// supplier drafts + submits against its own PO (creation-shape); the buyer
// approves, disputes/resolves, and releases payment — the release is the second
// sapBoundary verb (Option B: no "paid" claim until settlement mints the FI doc).

export interface InvoiceCreateVars {
  /** The parent PO the invoice bills against (must be the supplier's own, Confirmed). */
  poReference: string;
  amount: number;
  dueDate?: string;
  submittedDate?: string;
  bankAccount?: string;
}

/** Draft an invoice against a confirmed PO (fires the `creation` verb
 *  `t_invoice_create`). No entityId — the store assigns the invoice number. */
export function useInvoiceCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, InvoiceCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_create',
        entity: 'invoice',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Submit a Draft invoice (fires `t_invoice_submit`, Draft → Submitted). */
export function useInvoiceSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string; amount: number }>({
    mutationFn: ({ invoiceId, amount }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_submit',
        entity: 'invoice',
        entityId: invoiceId,
        payload: { amount },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Approve a Matched invoice (fires `t_invoice_approve`, Matched → Approved). */
export function useInvoiceApprove() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string }>({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_approve',
        entity: 'invoice',
        entityId: invoiceId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Dispute a pre-payment invoice (fires `t_invoice_dispute`). Requires a reason. */
export function useInvoiceDispute() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string; disputeReason: string }>({
    mutationFn: ({ invoiceId, disputeReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_dispute',
        entity: 'invoice',
        entityId: invoiceId,
        payload: { disputeReason },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Resolve a disputed invoice (fires `t_invoice_resolve`, Disputed → Submitted). */
export function useInvoiceResolve() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string }>({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_resolve',
        entity: 'invoice',
        entityId: invoiceId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/**
 * Release payment on an Approved invoice (fires the sapBoundary verb
 * `t_invoice_release_payment`). Resolves `submitted`: the invoice moves to the
 * interim 'Releasing Payment' with NO FI document yet — the caller settles to
 * finalize. NO "paid" claim is truthful until then.
 */
export function useInvoiceReleasePayment() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string }>({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: invoiceId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/**
 * Settle a submitted `t_invoice_release_payment` (the async SAP callback):
 * advances 'Releasing Payment' → 'Payment Released' and assigns the real FI
 * document + payment reference under the same correlationId. Idempotent.
 */
export function useInvoiceSettlePayment() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandStatus | null, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) => svc.commands.settle(scope, correlationId),
    onSuccess: () => invalidate(scope),
  });
}

// ─── Purchase requisition (G1.2b — C7 intake push, C6-LOCK) ──────────────────
// The plan grid's ONE mutation: push a single planned intake line to a Draft PR
// through the wired purchaseRequisition target (G1.1). A creation-shape verb, an
// exact near-clone of useAdvanceShipNoticeCreate — buyer-only (a supplier scope
// is SCOPE_DENIED before the role gate; PRs are buyer-internal). SINGLE-ROW: the
// public seam still cannot group causation (G0.1-FIND-01), so each push is one
// dispatch. When the line carries a governed quantity override (C6-LOCK), the
// opaque `decision` rides through to the DR-10 audit — the dispatcher forwards it
// verbatim. This is the ONLY exit from PLANNED (C6 §3); on a non-failed outcome
// the PR list re-derives and the pushed Draft is list-visible.

export interface PrCreateVars {
  /** The t_pr_create payload (material + quantity required; C7 §2.1). */
  payload: Record<string, unknown>;
  /** Governed-decision provenance, present only on a genuine quantity override. */
  decision?: CommandDecision;
}

/** Push a planned intake line to a Draft PR (fires the `creation` verb `t_pr_create`). */
export function usePurchaseRequisitionCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, PrCreateVars>({
    mutationFn: ({ payload, decision }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_create',
        entity: 'purchaseRequisition',
        payload,
        ...(decision ? { decision } : {}),
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}
