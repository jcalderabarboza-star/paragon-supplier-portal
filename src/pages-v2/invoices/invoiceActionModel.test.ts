// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE COVERAGE GATE — the thing that was missing, which was never the button.
//
// The release affordance disappeared because a hand-authored map keyed on a
// LOSSY DISPLAY LABEL answered a legality question, and nothing in the build
// could notice. This gate makes the population DERIVED and BILATERAL: every
// user verb the invoice machine declares is either surfaced or deferred with a
// stated reason, and a verb added to the flow tomorrow reddens here.
//
// ⚠️ RULE 4 THROUGHOUT — every emptiness claim is paired with a membership
// claim on the same derivation, because this gate's own failure mode is
// deriving an EMPTY population and reporting it clean (`EMPTY-INPUT-REPORTS-
// CLEAN-01`). The population guard is the FIRST test and asserts MEMBERSHIP.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { getFlow, userVerbsFrom } from '../../services/transitions';
import {
  INVOICE_VERB_SURFACE,
  INVOICE_VERB_DEFERRED,
  invoiceActionsFor,
  invoiceCommitAction,
} from './invoiceActionModel';
import type { InvoiceStatus } from '../../services/data/types';

/** Every user verb the invoice machine declares — DERIVED, never listed. */
const declaredUserVerbs = (): readonly string[] =>
  getFlow('invoice')!
    .transitions.filter((t) => t.trigger === 'user')
    .map((t) => t.id);

describe('the population itself', () => {
  it('⚠️ FIRST — the flow is loaded and the population is NON-EMPTY', () => {
    // Without this the whole file passes vacuously over `[]`.
    expect(getFlow('invoice')).toBeDefined();
    expect(declaredUserVerbs()).toContain('t_invoice_release_payment');
    expect(declaredUserVerbs().length).toBeGreaterThan(2);
  });
});

describe('BILATERAL — every declared user verb is surfaced or deferred, never neither', () => {
  it('no verb is unaccounted for', () => {
    const accounted = new Set([
      ...Object.keys(INVOICE_VERB_SURFACE),
      ...Object.keys(INVOICE_VERB_DEFERRED),
    ]);
    const orphans = declaredUserVerbs().filter((id) => !accounted.has(id));
    expect(
      orphans,
      'A USER VERB ON THE INVOICE MACHINE IS NEITHER SURFACED NOR DEFERRED.\n' +
        'This is the shape that hid `Release payment`: the machine grew an act and the\n' +
        'surface silently did not offer it. Add a row to INVOICE_VERB_SURFACE, or a row to\n' +
        'INVOICE_VERB_DEFERRED with the reason stated:\n' +
        orphans.join('\n'),
    ).toEqual([]);
  });

  it('no row outlives its verb — an exemption dies when its subject does', () => {
    const declared = new Set(declaredUserVerbs());
    const stale = [
      ...Object.keys(INVOICE_VERB_SURFACE),
      ...Object.keys(INVOICE_VERB_DEFERRED),
    ].filter((id) => !declared.has(id));
    expect(
      stale,
      'A SURFACE OR DEFERRAL ROW NAMES A VERB THE MACHINE NO LONGER DECLARES:\n' +
        stale.join('\n'),
    ).toEqual([]);
  });

  it('nothing is in BOTH maps — surfaced and deferred are exclusive', () => {
    const both = Object.keys(INVOICE_VERB_SURFACE).filter((id) => id in INVOICE_VERB_DEFERRED);
    expect(both).toEqual([]);
    // Paired membership claim: the maps are not simply empty.
    expect(Object.keys(INVOICE_VERB_SURFACE).length).toBeGreaterThan(0);
    expect(Object.keys(INVOICE_VERB_DEFERRED).length).toBeGreaterThan(0);
  });

  it('every deferral states a reason substantial enough to be one', () => {
    const thin = Object.entries(INVOICE_VERB_DEFERRED)
      .filter(([, d]) => d.why.trim().length < 80)
      .map(([id]) => id);
    expect(
      thin,
      'A DEFERRAL WITHOUT A REAL REASON IS AN OMISSION WEARING A ROW’S CLOTHES:\n' +
        thin.join('\n'),
    ).toEqual([]);
  });
});

describe('invoiceActionsFor — derived from the canonical state', () => {
  it('THE REGRESSION: Approved offers the release commit, and it is the reserved solid', () => {
    const commit = invoiceCommitAction('Approved');
    expect(commit).not.toBeNull();
    expect(commit!.transitionId).toBe('t_invoice_release_payment');
    expect(commit!.solid).toBe(true);
    expect(commit!.confirm).toBe(true);
  });

  it('⚠️ DP2-BUTTON-01 — AT MOST ONE solid across every state the machine has', () => {
    for (const s of getFlow('invoice')!.states) {
      const solids = invoiceActionsFor(s as InvoiceStatus).filter((a) => a.solid);
      expect(solids.length, `${s} offers ${solids.length} solid commits`).toBeLessThanOrEqual(1);
    }
    // Paired: at least one state DOES have one, so the loop is not vacuous.
    expect(invoiceCommitAction('Approved')).not.toBeNull();
  });

  it('the SAP interim offers nothing — no verb is legal from it', () => {
    expect(invoiceActionsFor('Releasing Payment')).toEqual([]);
    expect(invoiceCommitAction('Releasing Payment')).toBeNull();
    // Paired membership: the adjacent states DO offer things.
    expect(invoiceActionsFor('Approved').length).toBeGreaterThan(0);
    expect(invoiceActionsFor('Disputed').length).toBeGreaterThan(0);
  });

  it('Disputed offers resolve, and it is NOT a solid commit', () => {
    const actions = invoiceActionsFor('Disputed');
    expect(actions.map((a) => a.transitionId)).toEqual(['t_invoice_resolve']);
    expect(invoiceCommitAction('Disputed')).toBeNull();
  });

  it('dispute is offered on every pre-payment state the MACHINE allows it on', () => {
    // Derived from the flow, so this cannot drift from the declaration.
    const declared = getFlow('invoice')!.transitions.find((t) => t.id === 't_invoice_dispute')!;
    for (const from of declared.from) {
      expect(
        invoiceActionsFor(from as InvoiceStatus).map((a) => a.transitionId),
        `dispute missing from ${from}`,
      ).toContain('t_invoice_dispute');
    }
    expect(declared.from.length).toBeGreaterThan(1);
  });

  it('a verb RULED unsurfaced is refused at the seam now, not only at the surface', () => {
    // ⚠️ THIS ASSERTION INVERTED AT §51 AND THE INVERSION IS THE POINT. It used
    // to read `toContain`: `t_invoice_approve` is legal from `Matched`, so the
    // seam offered it and `INVOICE_VERB_DEFERRED` was the only thing keeping it
    // off the screen. Now `surfaceable: { surfaced: false, because:
    // 'ruled-unsurfaced' }` (C10 §2.4 — approval is attributable and the
    // platform cannot name a person) refuses it one layer earlier, so the
    // deferral row is a SECOND account of the same decision rather than the
    // only one. The rendered surface did not move: this verb was never in
    // INVOICE_VERB_SURFACE.
    expect(getFlow('invoice')!.transitions.find((t) => t.id === 't_invoice_approve')!.from).toContain(
      'Matched',
    );
    expect(userVerbsFrom('invoice', 'Matched').map((t) => t.id)).not.toContain('t_invoice_approve');
    expect(invoiceActionsFor('Matched').map((a) => a.transitionId)).not.toContain(
      't_invoice_approve',
    );
    // Paired membership, three times over: the state is not simply empty, the
    // seam still answers, and the deferral row still accounts for the verb.
    expect(invoiceActionsFor('Matched').map((a) => a.transitionId)).toContain('t_invoice_dispute');
    expect(userVerbsFrom('invoice', 'Matched').length).toBeGreaterThan(0);
    expect(Object.keys(INVOICE_VERB_DEFERRED)).toContain('t_invoice_approve');
  });
});
