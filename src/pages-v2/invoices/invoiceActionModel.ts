// ────────────────────────────────────────────────────────────────────────────
// THE BUYER INVOICE ACTION SURFACE — derived from the machine, keyed on verbs.
//
// ⚠️ **WHAT WAS WRONG, AND WHY NOTHING CAUGHT IT.** The footer verb came from
// `Record<BuyerInvoiceStatus, string>` — a map keyed on the DISPLAY LABEL. The
// label is lossy on purpose: `toBuyerLabel` turns `Approved` into `Overdue` the
// day the due date passes. So an invoice the machine declared releasable
// rendered `Escalate` — a toast — and the release affordance vanished. Both
// Approved invoices in the tree are past due, so this was the whole population,
// not an edge case, and it had been true since each invoice's due date with no
// commit involved. Its spec stayed green because the spec pins the clock
// (`usePinnedDemoClock`, added by `2e-c-6-FIND-01` when the same decay broke the
// test) — **the pin fixed the symptom in the suite and left it in production.**
//
// A DECAYED CLAIM (the PF-2 coverage-sentence class): true at its SHA, false
// after time moved, watched by nothing.
//
// ── THE SHAPE THAT REPLACES IT ─────────────────────────────────────────────
// The population of offerable verbs is DERIVED — `userVerbsFrom('invoice', s)`
// asks the registered flow, with the CANONICAL state. This file supplies only
// the presentation each derived verb needs, **keyed on the transition id**, and
// it is BILATERAL: every user verb the invoice machine declares has either a
// surface row or a DEFERRAL WITH ITS REASON STATED, and `invoiceActionModel.
// test.ts` fails if the two sets drift apart. A verb added to the flow tomorrow
// reddens the suite instead of silently not appearing — which is the thing that
// was missing, not the button.
// ────────────────────────────────────────────────────────────────────────────

import type { InvoiceStatus } from '../../services/data/types';
import { userVerbsFrom } from '../../services/transitions';

/** How the buyer surface presents one derived verb. */
export interface InvoiceVerbSurface {
  /** i18n key for the footer button label. */
  readonly labelKey: string;
  /**
   * DP2-BUTTON-01 — solid action-blue is RESERVED for the irreversible commit.
   * Exactly one verb on this surface qualifies: releasing payment crosses the
   * SAP boundary and mints an FI document.
   */
  readonly solid: boolean;
  /** True when the verb takes a second, explicit confirmation step. */
  readonly confirm: boolean;
}

/** A verb the machine declares that this surface deliberately does NOT offer. */
export interface InvoiceVerbDeferral {
  readonly why: string;
}

/**
 * Verbs this surface renders. Keyed on transition id — a machine token, so a
 * rename in the flow is a `tsc`/test failure here rather than a button that
 * quietly stops appearing.
 */
export const INVOICE_VERB_SURFACE: Readonly<Record<string, InvoiceVerbSurface>> = Object.freeze({
  t_invoice_release_payment: {
    labelKey: 'buyerInvoices.footer.releasePayment',
    // The ONE reserved solid on this page: Option-B commit, mints an FI document.
    solid: true,
    confirm: true,
  },
  t_invoice_dispute: {
    labelKey: 'buyerInvoices.action.dispute',
    solid: false,
    confirm: true,
  },
  t_invoice_resolve: {
    labelKey: 'buyerInvoices.footer.resolveDispute',
    solid: false,
    confirm: false,
  },
});

/**
 * Verbs the machine declares and this surface does NOT offer, each with the
 * reason stated. **An omission with a reason is a decision; an omission without
 * one is the defect this file exists to prevent** — so the gate requires every
 * declared user verb to appear in exactly one of these two maps.
 */
export const INVOICE_VERB_DEFERRED: Readonly<Record<string, InvoiceVerbDeferral>> = Object.freeze({
  t_invoice_submit: {
    why:
      'Supplier-owned. The buyer surface never submits an invoice on a supplier’s behalf — ' +
      'SupplierInvoices.tsx wires it via useInvoiceSubmit. Not a gap; a different persona.',
  },
  t_invoice_approve: {
    why:
      'RULED UNREACHABLE, NOT MISSING. C10 §2.4 lists invoice approval among the capabilities ' +
      'identity blocks: with one tenant-wide approver an approval is a rubber stamp with a state ' +
      'machine attached. It waits on D-ID-2 / ENF-NO-PERSON-IN-IDENTITY-01, the same fence that ' +
      'keeps the GR Override-hold affordance a toast. Wiring it here would write an anonymous ' +
      'approval into a permanent trail.',
  },
});

/** One offerable action, already resolved to what the footer needs. */
export interface InvoiceAction extends InvoiceVerbSurface {
  readonly transitionId: string;
}

/**
 * The actions the buyer surface may offer for a canonical state — DERIVED from
 * the registered flow, filtered to the verbs this surface presents.
 *
 * Takes the CANONICAL state, never the display label. Passing `BuyerInvoice.
 * status` here is a type error, which is the point of carrying both fields.
 */
export function invoiceActionsFor(state: InvoiceStatus): readonly InvoiceAction[] {
  return userVerbsFrom('invoice', state)
    .filter((t) => t.id in INVOICE_VERB_SURFACE)
    .map((t) => ({ transitionId: t.id, ...INVOICE_VERB_SURFACE[t.id] }));
}

/**
 * The single COMMIT action for a state, if there is one — the verb that gets the
 * footer's primary slot. Derived, not listed: it is the offerable verb marked
 * `solid`, and DP2-BUTTON-01 allows at most one meaningful solid per surface.
 */
export function invoiceCommitAction(state: InvoiceStatus): InvoiceAction | null {
  return invoiceActionsFor(state).find((a) => a.solid) ?? null;
}
