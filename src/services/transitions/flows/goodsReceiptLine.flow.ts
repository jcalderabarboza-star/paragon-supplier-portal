// ────────────────────────────────────────────────────────────────────────────
// Goods Receipt LINE sub-flow — v2.2 Step 4 batch (ii), census G2.
//
// The nested per-line sub-axis: each GR line runs its own tiny machine
// (Disposition × CheckResult). The GR HEADER state is a ROLLUP of these line
// states (see `grRollup.ts` + the `gr_rollup_*` hooks on `goodsReceipt.flow.ts`)
// — never a hand-maintained parallel field. Modeling the sub-axis as its own
// registered flow is what makes the header a provable derivation rather than an
// assertion, and it seeds the schema for line-level GR editing.
//
// AUTHORED + REGISTERED now (vocabulary, validation, capabilities). Per-line
// COMMAND wiring lands when a line-level GR editing surface does — the batch (ii)
// proof drives the header rollup from the finalized inspection results recorded
// at GR create (same precedent as the authored-unwired ASN logistics verbs).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const goodsReceiptLineFlow: FlowDefinition = {
  entity: 'goodsReceiptLine',
  version: 1,
  states: ['Pending', 'Inspected', 'Accepted', 'Rejected', 'Quarantined', 'Returned'],
  initial: 'Pending',
  /** PF-0 · D-2 — 'Quarantined' is deliberately absent: quarantine is a HOLDING
   *  state, not an ending. It now HAS its outbound edges (`t_grline_release`
   *  and the widened `t_grline_reject`), so it is a fork rather than a trap —
   *  but a hold is still not a place a line may come to rest, which is why it
   *  stays out of this list. */
  terminals: ['Accepted', 'Rejected', 'Returned'],
  transitions: [
    {
      id: 't_grline_inspect',
      from: ['Pending'],
      to: 'Inspected',
      trigger: 'user',
      requiredRole: 'gr:inspect',
      requiredFields: ['visualCheck', 'packagingCheck'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_accept',
      from: ['Inspected'],
      to: 'Accepted',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ `Quarantined` IS A FROM-STATE HERE, AND THAT IS THE HALF THAT MAKES
      // THE HOLD HONEST. A quarantined line is one awaiting a re-examination,
      // and a re-examination has TWO outcomes. An exit that could only clear
      // the line would leave the failing outcome with nowhere to go — the same
      // trap one state along, wearing a fix's clothes. Widening this verb was
      // preferred to authoring a second one: the act is identical (this item is
      // not fit for use, with a reason attached) and only its origin differs,
      // so a separate id would have split one domain fact across two verbs.
      id: 't_grline_reject',
      from: ['Inspected', 'Quarantined'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: ['rejectionReason'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_quarantine',
      from: ['Inspected'],
      to: 'Quarantined',
      trigger: 'user',
      requiredRole: 'gr:inspect',
      requiredFields: ['holdReason'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ THE RESUME EDGE — the line-grain mirror of `t_gr_request_retest`,
      // and it exists for the reason that verb's own comment records one grain
      // up: a state that can be ENTERED and never LEFT is closer to a defect
      // than to a gap. `Quarantined` was declared, targeted, and inescapable.
      //
      // → the cleared terminal, NOT back to re-inspection. The header's resume
      // edge lands on `Under Inspection` because the header's disposition verbs
      // all fire from there and a retest must land where a decision can be
      // taken. THE LINE GRAIN IS THE OPPOSITE SHAPE: the decision has already
      // been taken — the retest IS the re-examination — so landing anywhere but
      // a disposition would re-ask a question that was just answered.
      //
      // ⚠️ `gr:disposition`, NEVER `gr:inspect`, AND THE CHOICE IS A GATE
      // RATHER THAN A PREFERENCE. Every verb in this flow that lands on a
      // disposition terminal carries `gr:disposition`; quarantining carries
      // `gr:inspect`. Giving this edge the quarantining atom would open a
      // second route to the cleared terminal for a seat that holds no
      // disposition atom — the hold would become a back door around the very
      // gate its own outcome is meant to pass. The two atoms sit in ONE lane by
      // default (`receiving`), so out of the box this is one seat; a seat that
      // inspects but may not dispose is a narrowing the role model already
      // expresses, and `buyerAnchor.test.ts` already demonstrates that exact
      // pair. One seat by default, separable by configuration — the invoice
      // approve/release ruling, arrived at independently from this flow's own
      // atoms rather than imported.
      //
      // PAYLOAD-FREE, on the `t_gr_request_retest` precedent: the hold is the
      // act that needed explaining and it already recorded a `holdReason`.
      // Inventing a required field for the resume would force a surface to
      // fabricate a value, which is how a required field becomes a lie.
      id: 't_grline_release',
      from: ['Quarantined'],
      to: 'Accepted',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_grline_return',
      from: ['Inspected'],
      to: 'Returned',
      trigger: 'user',
      requiredRole: 'gr:disposition',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
