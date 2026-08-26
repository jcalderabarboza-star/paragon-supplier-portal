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
import { userVerbsFrom, getTransition } from '../../services/transitions';
import type { BusinessRoleId } from '../../services/transitions/businessRoles';
import type { VerbAvailability } from '../../services/transitions/handoff';
import { availabilityOfAtom } from '../../services/transitions/handoff';

/** How the buyer surface presents one derived verb. */
export interface InvoiceVerbSurface {
  /** i18n key for the footer button label. */
  readonly labelKey: string;
  /**
   * ⚠️ **RENAMED FROM `solid` AT §68, AND THE RENAME IS THE POINT.** It was
   * named for a RENDERING — solid action-blue, DP2-BUTTON-01's reserved
   * irreversible-commit signal — and that register is now retired portal-wide.
   * But the field was never only a style: `BuyerInvoices.handleFooterAction`
   * reads it to route this verb through a SECOND CONFIRMATION STEP, which is
   * BEHAVIOUR. Deleting it with the styling would have deleted a confirm gate;
   * keeping a field called `solid` that no longer controls solidity is the
   * label-names-the-wrong-thing defect one layer down in a model.
   *
   * So the value survives under the name of what it actually means: this is the
   * ONE irreversible commit on this surface. Releasing payment crosses the SAP
   * boundary and mints an FI document.
   */
  readonly reservedCommit: boolean;
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
    // The ONE reserved commit on this page: Option-B, mints an FI document.
    reservedCommit: true,
    confirm: true,
  },
  t_invoice_dispute: {
    labelKey: 'buyerInvoices.action.dispute',
    reservedCommit: false,
    confirm: true,
  },
  t_invoice_resolve: {
    labelKey: 'buyerInvoices.footer.resolveDispute',
    reservedCommit: false,
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
 * `reservedCommit`, and there is at most one per surface. (It used to be marked
 * `solid` and to render as one; §68 retired the rendering and kept the rule.)
 */
export function invoiceCommitAction(state: InvoiceStatus): InvoiceAction | null {
  return invoiceActionsFor(state).find((a) => a.reservedCommit) ?? null;
}

// ── ⚠️ THE THIRD ARM: ROLE-WITHHELD IS NEITHER A SURFACE ROW NOR A DEFERRAL ──
//
// This file was BILATERAL — every declared user verb has a surface row or a
// deferral with its reason stated — and that bilateral is what stops a verb
// from quietly not appearing. **The role split introduces a third state that
// belongs to NEITHER side of it**, and getting this wrong is the failure mode
// the whole batch must not ship:
//
//   `invoiceActionsFor` is `userVerbsFrom(...).filter(id in SURFACE)`. There is
//   no role check in it. The obvious way to honour a narrowed seat — add
//   `&& seatHolds(t.requiredRole)` to that filter — MAKES THE BUTTON VANISH.
//   That is precisely what the operator's binding constraint forbids, and it
//   would land in the one file written to prevent verbs from silently not
//   appearing.
//
// So the seat does not FILTER the population; it ANNOTATES it. A withheld verb
// is still in the list, still bilateral, still gate-checked — it just renders
// as a wait with an owner instead of as a button. `invoiceActionsFor` keeps its
// role-agnostic signature so the bilateral gate keeps asking the machine the
// same question it always asked.

/** One offerable action, plus whether THIS seat may fire it. */
export interface SeatInvoiceAction extends InvoiceAction {
  readonly availability: VerbAvailability;
}

/**
 * The actions for a state, annotated for a seat. Same population as
 * `invoiceActionsFor` — never a subset. A caller that renders only the `held`
 * ones has reintroduced the vanishing button; the surface must render the
 * `withheld` ones as pending, naming the owner.
 */
export function invoiceActionsForSeat(
  state: InvoiceStatus,
  seatRoles: readonly BusinessRoleId[],
): readonly SeatInvoiceAction[] {
  return invoiceActionsFor(state).map((a) => ({
    ...a,
    availability: availabilityOfAtom(atomOf(a.transitionId), seatRoles),
  }));
}

/**
 * The atom a surfaced invoice verb requires — read from the REGISTRY by id.
 *
 * ⚠️ **THE REGISTRATION SITE, NOT A CALL SITE (§42).** A local
 * `Record<transitionId, atom>` here would be the second permission vocabulary
 * C10 §3.3 refuses, and it would drift silently the day a verb's role moves —
 * which is the exact day this line has to change. Enumerating states to find
 * the verb would be a call-site scan answering a registration-site question:
 * right most of the time, and wrong in a way no test would name.
 */
function atomOf(transitionId: string): string {
  return getTransition(transitionId)?.requiredRole ?? '';
}
