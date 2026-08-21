// ────────────────────────────────────────────────────────────────────────────
// Command hooks (v2.2 Step 3.6 + 3.10) — the write side of the query layer.
//
// The canonical mutation pattern: dispatch a command through the service seam →
// on a non-failed outcome, targeted invalidateQueries by scopeKey (procurement,
// current scope only) → the page re-derives from the mutated store. Pages hold
// NO local seeded copy.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDataService } from '../data/DataServiceContext';
import { useToast } from '../../hooks/useToast';
import { classifySettleFault } from '../transitions/settleFaults';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { scopeKey } from './useServiceQuery';
import type { BidCurrency } from '../../lib/currencyPolicy';
import type { FxPinSource } from '../../lib/fxPin';
import type {
  CommandResult,
  CommandStatus,
  QueryScope,
  InspectionResult,
  CommandDecision,
} from '../data/types';

/**
 * The COMMAND scope — tenancy plus the seat's business roles.
 *
 * ⚠️ **THIS IS THE PRODUCTION PATH THE WILDCARD RETIREMENT TURNS ON.** Every
 * governed act in the portal dispatches through a hook in this file, and every
 * one of them takes its scope from here. Before this arc the scope carried
 * tenancy only and the dispatcher widened it to the whole persona; now the
 * seat's roles travel with the command and the dispatcher resolves atoms from
 * THEM. A scope built anywhere else without roles is refused at the role gate
 * rather than silently granted 48 atoms — which is the whole point.
 */
function useScope(): QueryScope {
  const { identity } = useCurrentIdentity();
  return {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    businessRoles: identity.businessRoles,
    actor: identity.actor,
  };
}

// ── §43 · THE SETTLE FAILURE SURFACE ────────────────────────────────────────
//
// ⚠️ **IT LIVES IN THE HOOK, AND THAT IS THE FIX.** Before this batch
// `commandHooks.ts` contained ZERO `onError` handlers — a rejected settle was an
// unhandled mutation rejection: no toast, no banner, no i18n key. The document
// sat in 'Posting to SAP' or 'Releasing Payment' and nothing ever said why.
// That was not an oversight at one call site; it was the SHAPE — three call
// sites each had to opt in and none did. Putting the handler on the mutation
// itself means a fourth settle call site cannot be silent by omission.
//
// The string is chosen by the classified fault, so a permanent misconfiguration
// does not read as a retryable blip, and every branch names the document's state
// and whether asking again helps (`HALAL-REFUSAL-DEAD-ENDS-01` — a refusal that
// only reports failure is half a remedy). The remedy for TRANSPORT is REAL: the
// dispatcher leaves a failed settle `submitted`, so the same action genuinely
// re-attempts (see `dispatcher.ts` settle).
function useSettleErrorToast(): (err: unknown, vars: { correlationId: string }) => void {
  const { toast } = useToast();
  const { t } = useTranslation();
  return (err, vars) => {
    const fault = classifySettleFault(err);
    toast({
      variant: 'error',
      title: t('settle.failed.title'),
      description: `${t(`settle.failed.${fault}`)} ${t('settle.failed.ref', {
        correlationId: vars.correlationId,
      })}`,
    });
  };
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

// ─── FX basis (CP-0 · 2e-c-3/4) — the buyer records the rate a multi-currency
//     comparison is ranked against ───────────────────────────────────────────
//
// STATE-PRESERVING: this records a fact ON the RFQ without moving it, so an Open
// RFQ stays Open and a Closed one stays Closed. Invalidating on success is what
// makes the comparison re-score — the refusal the buyer was looking at is
// replaced by a ranking, in one round trip.
//
// There is deliberately NO `useRfqFxPinEdit`. A moved rate is recorded by
// dispatching this verb AGAIN: the store appends, the prior basis survives, and
// the D-1 freeze holds because no update path exists to break it.

export interface RfqFxPinVars {
  rfqId: string;
  /** The bid currency being converted (never the base — its rate is 1). */
  quote: BidCurrency;
  /** Units of base per ONE unit of `quote`. */
  rate: number;
  /** The RATE's vintage (ISO date) — what staleness is measured from. */
  asOf: string;
  source: FxPinSource;
  /** SAP rate type ('M'/'B'/'G'), when the source distinguishes them. */
  rateType?: string;
}

/** Record (or supersede) the FX basis for one currency on one RFQ. */
export function useRfqFxPin() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqFxPinVars>({
    mutationFn: ({ rfqId, quote, rate, asOf, source, rateType }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_fx_pin',
        entity: 'rfq',
        entityId: rfqId,
        payload: {
          quote,
          rate,
          asOf,
          source,
          // Omitted rather than sent empty: a MANUAL pin has no rate type, and
          // an empty string would be a stated blank rather than an absence.
          ...(rateType ? { rateType } : {}),
        },
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
// ⚠️ PF-1a — t_rfq_publish IS NOW WIRED. The note that stood here ("the only
// Draft fixture has no invited suppliers, so publish would yield a hollow 0/0
// event") described the world in which nothing could REACH Draft. D-1 moved
// creation there, so every RFQ a buyer raises now arrives carrying its invited
// list and waits to be published. (t_quotation_submit / t_quotation_review are
// WIRED below, Task 3b.)

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

/**
 * Publish a drafted RFQ to its invited suppliers (fires `t_rfq_publish`,
 * Draft → Open).
 *
 * ⚠️ THIS IS THE ACT THAT MAKES THE EVENT VISIBLE, not a status relabel:
 * supplier RFQ reads exclude `Draft` (`MockProcurementService.getRFQs`), so an
 * unpublished event is on nobody's board but the buyer's.
 */
export function useRfqPublish() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqLifecycleVars>({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_publish',
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
 * Release a GR from quality hold for re-inspection (fires `t_gr_request_retest`,
 * Quality Hold → Under Inspection).
 *
 * ⚠️ PF-1a — the verb behind an affordance that already shipped. "Request
 * Retest" rendered on `Quality Hold` and fired A TOAST; the state had no exit at
 * all, so the button promised something the machine could not do. Payload-free:
 * the hold already recorded its reason, and a required field here would have
 * forced the surface to invent one.
 */
export function useGoodsReceiptRequestRetest() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { grId: string }>({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_request_retest',
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
  const onSettleError = useSettleErrorToast();

  return useMutation<CommandStatus | null, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) => svc.commands.settle(scope, correlationId),
    onSuccess: () => invalidate(scope),
    onError: onSettleError,
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
  const onSettleError = useSettleErrorToast();

  return useMutation<CommandStatus | null, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) => svc.commands.settle(scope, correlationId),
    onSuccess: () => invalidate(scope),
    onError: onSettleError,
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

// ── DUPLICATE-AND-NARROW — the privilege grant ──────────────────────────────
//
// ⚠️ **`entityId` IS THE PARENT SYSTEM ROLE, AND THERE IS NO `parent` PAYLOAD
// FIELD.** The entity commanded IS the role being copied, so the two cannot
// disagree — enforcement's `checkId` discipline, applied to a role.
//
// ⚠️ **`grantedBy` COMES FROM THE SESSION, NEVER FROM THE FORM (C10 §6.2).**
// It is `identity.actor` — today always `UNATTRIBUTED: NO_PERSON_IN_SESSION`,
// which is a CLAIM the platform is entitled to make, not a placeholder. A form
// field for it would let a caller name whoever it liked as the granter of a
// privilege, which is the payload-refusal C10 §6.2 exists to state.
//
// There is NO `invalidateProcurement` here: a role definition is not procurement
// data and no query reads it. The catalogue re-derives from the store directly,
// which is why the page bumps a version rather than awaiting a refetch.
export interface RoleGrantVars {
  /** The system role being copied — the command's entityId. */
  parent: string;
  roleId: string;
  displayName: string;
  description: string;
  adds: readonly string[];
}

/** Grant a custom role: copy one system role and add to it (`t_role_grant`). */
export function useRoleGrant() {
  const svc = useDataService();
  const scope = useScope();
  const { identity } = useCurrentIdentity();

  return useMutation<CommandResult, Error, RoleGrantVars>({
    mutationFn: ({ parent, roleId, displayName, description, adds }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_role_grant',
        entity: 'role',
        entityId: parent,
        payload: {
          roleId,
          displayName,
          description,
          adds: [...adds],
          grantedBy: identity.actor,
        },
      }),
  });
}
