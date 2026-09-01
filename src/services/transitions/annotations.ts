// ─────────────────────────────────────────────────────────────────────────────
// PF-2 · PURPOSE ANNOTATIONS — the ONE thing the schema does not carry.
//
// PF-1 draws the machine and cannot say what any of it is FOR
// (`PF1-NO-PURPOSE-ANNOTATION-01`). Every other column on that page is DERIVED:
// states, triggers, roles, required fields, hooks, boundaries, cascades, counts.
// Purpose is not derivable from any of them, and nothing derivable substitutes
// for it — `trigger: 'user'` says a person does it, never why a person would.
//
// So this batch AUTHORS it. That is a change in kind, and the whole design below
// exists to keep authored prose from becoming the thing that rots.
//
// ── ⚠️ AUTHORED PROSE, KEYED BY DERIVED IDENTITY ────────────────────────────
//   The annotation is NOT the sentence. It is an i18n KEY hung on a transition
//   id (or an entity key) that the registry already owns. The prose itself lives
//   in `lib/i18n/processFlowPurpose.ts`, in both languages, and nothing here can
//   be read without going through the translation layer. Consequences:
//     · a purpose can never be English-only (MARKER-I18N-HOLE-01), and
//     · the annotation layer stays DATA — inspectable, testable, and pinnable
//       against the registry without parsing a sentence.
//
// ── ⚠️ THE BILATERAL PIN IS THE POINT, NOT THE PROSE ────────────────────────
//   `annotations.test.ts` fails in BOTH directions, over `getKnownFlows()`:
//
//     · A REGISTERED TRANSITION WITH NO ANNOTATION → RED. A verb cannot ship
//       unexplained; somebody has to say what it is for.
//     · AN ANNOTATION NAMING NO LIVE TRANSITION → RED. Deleting or renaming a
//       verb FORCES the deletion of its annotation, so this file can only
//       shrink truthfully.
//
//   Neither direction alone is enough, and the second is the one nothing
//   normally checks — an annotation that outlives its subject is a sentence
//   describing a verb the tree no longer has, which reads exactly like a
//   sentence describing a verb it does (`C9-STALE-BY-FIX-01`, one layer along).
//   Precedent: `CENSUS-DERIVE-BILATERAL-01` (`looseEndCensus.ts`), whose whole
//   argument transfers unchanged.
//
//   ⚠️ **AND IT IS A TEST, NOT A COMPILE ERROR — SAID OUT LOUD.** The
//   `FX_REFUSAL_KEY` pattern gets `Record<ClosedUnion, string>` and therefore a
//   BUILD failure when a union grows, because its population is a TYPE. This
//   population is DATA: transition ids are strings in flow files, and no type
//   knows them. So the strongest available pin is the floor, and pretending
//   otherwise by writing a `Record` over a hand-typed union would put a second
//   copy of the id list here — the exact thing the derivation refuses. The
//   i18n half below IS partly compile-checked (each key is written out, so a
//   typo is a runtime miss the test catches, never a silent concatenation).
//
// ── ⚠️ AUTHORED PROSE NEVER RESTATES A MACHINE FACT ─────────────────────────
//   State names, role names, trigger kinds and field lists RENDER FROM THE
//   REGISTRY, next to the sentence. The sentence carries ONLY purpose.
//
//   *"`t_gr_hold` moves a receipt from Under Inspection to Quality Hold"* is a
//   DEFECT, not an annotation: it restates two states the diagram already draws,
//   and it is wrong the day either is renamed — silently, because nothing
//   compares a sentence to a schema. **A SENTENCE THAT NEVER CONTAINS THE
//   NUMBER CANNOT DRIFT FROM IT** (`FLOOR-IN-PROSE-01` generalised, one surface
//   along).
//
//   Held structurally: `annotations.test.ts` refuses any purpose string — EN or
//   ID — containing its own flow's state names, roles, required fields, hook
//   names, transition ids, entity key, or the four trigger tokens.
//   ⚠️ THE LIMIT, RECORDED: it catches the LITERAL restatement, not a
//   paraphrase of one. A test that tried to judge paraphrase would be judging
//   prose, and would go red on wording somebody improved — which trains people
//   to edit the test. The literal form is the drift-prone one anyway: it is the
//   form that names a token a rename will invalidate.
//
// ── ⚠️ NO CONCATENATED KEYS ─────────────────────────────────────────────────
//   Every key below is WRITTEN OUT. A computed key (`purpose.${t.id}`) would
//   make a missing translation invisible — a new verb ships and a reader sees
//   the raw key on screen, in both languages equally (the exact failure
//   `FX_REFUSAL_KEY` was built to end, CP-0 · 2e-c-6). Written out, the key a
//   test asserts and the key the page looks up are the same characters.
//
// ── WHY TWO MAPS RATHER THAN ONE ────────────────────────────────────────────
//   The ratified shape is `Record<TransitionId, {purposeKey}> & Record<
//   EntityKey, {purposeKey}>`. Kept as two named maps because the two halves
//   pin against DIFFERENT derived populations — every transition of every flow,
//   and every flow — so each gets its own bilateral test and its own failure
//   message. Merged, a missing entity purpose and a missing verb purpose would
//   fail as the same assertion, which is the kind of collapse that makes a red
//   test take ten minutes to read.
// ─────────────────────────────────────────────────────────────────────────────

/** One authored annotation. A KEY, never a sentence — see the header. */
export interface PurposeAnnotation {
  /** The i18n key whose EN and ID values carry the purpose. Written out. */
  readonly purposeKey: string;
}

/** Purpose annotations, keyed by an identity the registry already owns. */
export type FlowAnnotations = Readonly<Record<string, PurposeAnnotation>>;

/**
 * WHY EACH VERB EXISTS — one annotation per registered transition, in registry
 * order. The bilateral test pins this map to `getKnownFlows()` both ways.
 */
export const TRANSITION_PURPOSE: FlowAnnotations = Object.freeze({
  // ── purchaseOrder ──────────────────────────────────────────────────────────
  t_po_issue: { purposeKey: 'processFlows.purpose.t_po_issue' },
  t_po_view: { purposeKey: 'processFlows.purpose.t_po_view' },
  t_po_acknowledge: { purposeKey: 'processFlows.purpose.t_po_acknowledge' },
  t_po_confirm: { purposeKey: 'processFlows.purpose.t_po_confirm' },
  t_po_partial_deliver: { purposeKey: 'processFlows.purpose.t_po_partial_deliver' },
  t_po_deliver: { purposeKey: 'processFlows.purpose.t_po_deliver' },
  t_po_close: { purposeKey: 'processFlows.purpose.t_po_close' },

  // ── advanceShipNotice ──────────────────────────────────────────────────────
  t_asn_create: { purposeKey: 'processFlows.purpose.t_asn_create' },
  t_asn_submit: { purposeKey: 'processFlows.purpose.t_asn_submit' },
  t_asn_in_transit: { purposeKey: 'processFlows.purpose.t_asn_in_transit' },
  t_asn_deliver: { purposeKey: 'processFlows.purpose.t_asn_deliver' },
  t_asn_discrepancy: { purposeKey: 'processFlows.purpose.t_asn_discrepancy' },
  t_asn_resolve_discrepancy: {
    purposeKey: 'processFlows.purpose.t_asn_resolve_discrepancy',
  },

  // ── goodsReceipt ───────────────────────────────────────────────────────────
  t_gr_create: { purposeKey: 'processFlows.purpose.t_gr_create' },
  t_gr_start_inspection: { purposeKey: 'processFlows.purpose.t_gr_start_inspection' },
  t_gr_hold: { purposeKey: 'processFlows.purpose.t_gr_hold' },
  t_gr_request_retest: { purposeKey: 'processFlows.purpose.t_gr_request_retest' },
  t_gr_approve: { purposeKey: 'processFlows.purpose.t_gr_approve' },
  t_gr_partial_approve: { purposeKey: 'processFlows.purpose.t_gr_partial_approve' },
  t_gr_reject: { purposeKey: 'processFlows.purpose.t_gr_reject' },
  t_gr_post: { purposeKey: 'processFlows.purpose.t_gr_post' },

  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  t_grline_inspect: { purposeKey: 'processFlows.purpose.t_grline_inspect' },
  t_grline_accept: { purposeKey: 'processFlows.purpose.t_grline_accept' },
  t_grline_reject: { purposeKey: 'processFlows.purpose.t_grline_reject' },
  t_grline_quarantine: { purposeKey: 'processFlows.purpose.t_grline_quarantine' },
  t_grline_return: { purposeKey: 'processFlows.purpose.t_grline_return' },

  // ── invoice ────────────────────────────────────────────────────────────────
  t_invoice_create: { purposeKey: 'processFlows.purpose.t_invoice_create' },
  t_invoice_submit: { purposeKey: 'processFlows.purpose.t_invoice_submit' },
  t_invoice_match: { purposeKey: 'processFlows.purpose.t_invoice_match' },
  t_invoice_approve: { purposeKey: 'processFlows.purpose.t_invoice_approve' },
  t_invoice_release_payment: {
    purposeKey: 'processFlows.purpose.t_invoice_release_payment',
  },
  t_invoice_remit: { purposeKey: 'processFlows.purpose.t_invoice_remit' },
  t_invoice_dispute: { purposeKey: 'processFlows.purpose.t_invoice_dispute' },
  t_invoice_resolve: { purposeKey: 'processFlows.purpose.t_invoice_resolve' },

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  t_invmatch_await_gr: { purposeKey: 'processFlows.purpose.t_invmatch_await_gr' },
  t_invmatch_matched: { purposeKey: 'processFlows.purpose.t_invmatch_matched' },
  t_invmatch_qty_variance: { purposeKey: 'processFlows.purpose.t_invmatch_qty_variance' },
  t_invmatch_price_variance: {
    purposeKey: 'processFlows.purpose.t_invmatch_price_variance',
  },

  // ── rfq ────────────────────────────────────────────────────────────────────
  t_rfq_create: { purposeKey: 'processFlows.purpose.t_rfq_create' },
  t_rfq_publish: { purposeKey: 'processFlows.purpose.t_rfq_publish' },
  t_rfq_close: { purposeKey: 'processFlows.purpose.t_rfq_close' },
  t_rfq_award: { purposeKey: 'processFlows.purpose.t_rfq_award' },
  t_rfq_fx_pin: { purposeKey: 'processFlows.purpose.t_rfq_fx_pin' },
  t_rfq_cancel: { purposeKey: 'processFlows.purpose.t_rfq_cancel' },
  t_rfq_reopen: { purposeKey: 'processFlows.purpose.t_rfq_reopen' },

  // ── quotation ──────────────────────────────────────────────────────────────
  t_quotation_submit: { purposeKey: 'processFlows.purpose.t_quotation_submit' },
  t_quotation_review: { purposeKey: 'processFlows.purpose.t_quotation_review' },
  t_quotation_award: { purposeKey: 'processFlows.purpose.t_quotation_award' },
  t_quotation_reject: { purposeKey: 'processFlows.purpose.t_quotation_reject' },

  // ── shipment ───────────────────────────────────────────────────────────────
  t_shipment_create: { purposeKey: 'processFlows.purpose.t_shipment_create' },
  t_shipment_asn_received: { purposeKey: 'processFlows.purpose.t_shipment_asn_received' },
  t_shipment_depart: { purposeKey: 'processFlows.purpose.t_shipment_depart' },
  t_shipment_arrive_port: { purposeKey: 'processFlows.purpose.t_shipment_arrive_port' },
  t_shipment_customs: { purposeKey: 'processFlows.purpose.t_shipment_customs' },
  t_shipment_dock: { purposeKey: 'processFlows.purpose.t_shipment_dock' },
  t_shipment_unload: { purposeKey: 'processFlows.purpose.t_shipment_unload' },
  t_shipment_deliver: { purposeKey: 'processFlows.purpose.t_shipment_deliver' },

  // ── contract ───────────────────────────────────────────────────────────────
  t_contract_draft: { purposeKey: 'processFlows.purpose.t_contract_draft' },
  t_contract_activate: { purposeKey: 'processFlows.purpose.t_contract_activate' },
  t_contract_renew: { purposeKey: 'processFlows.purpose.t_contract_renew' },
  t_contract_terminate: { purposeKey: 'processFlows.purpose.t_contract_terminate' },

  // ── obligation ─────────────────────────────────────────────────────────────
  t_obligation_track: { purposeKey: 'processFlows.purpose.t_obligation_track' },
  t_obligation_complete: { purposeKey: 'processFlows.purpose.t_obligation_complete' },

  // ── purchaseRequisition ────────────────────────────────────────────────────
  t_pr_create: { purposeKey: 'processFlows.purpose.t_pr_create' },
  t_pr_submit: { purposeKey: 'processFlows.purpose.t_pr_submit' },
  t_pr_approve: { purposeKey: 'processFlows.purpose.t_pr_approve' },
  t_pr_reject: { purposeKey: 'processFlows.purpose.t_pr_reject' },
  t_pr_revise: { purposeKey: 'processFlows.purpose.t_pr_revise' },
  t_pr_source: { purposeKey: 'processFlows.purpose.t_pr_source' },
  t_pr_convert: { purposeKey: 'processFlows.purpose.t_pr_convert' },

  // ── supplierDocument ───────────────────────────────────────────────────────
  t_supplierdoc_request: { purposeKey: 'processFlows.purpose.t_supplierdoc_request' },
  t_supplierdoc_declare: { purposeKey: 'processFlows.purpose.t_supplierdoc_declare' },
  t_supplierdoc_submit: { purposeKey: 'processFlows.purpose.t_supplierdoc_submit' },
  t_supplierdoc_verify: { purposeKey: 'processFlows.purpose.t_supplierdoc_verify' },
  t_supplierdoc_reject: { purposeKey: 'processFlows.purpose.t_supplierdoc_reject' },

  // ── compliance ─────────────────────────────────────────────────────────────
  t_compliance_submit: { purposeKey: 'processFlows.purpose.t_compliance_submit' },
  t_compliance_verify: { purposeKey: 'processFlows.purpose.t_compliance_verify' },
  t_compliance_reject: { purposeKey: 'processFlows.purpose.t_compliance_reject' },

  // ── requirementResponse ────────────────────────────────────────────────────
  t_requirementresponse_submit: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_submit',
  },
  t_requirementresponse_acknowledge: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_acknowledge',
  },
  t_requirementresponse_promote: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_promote',
  },
  t_requirementresponse_review: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_review',
  },
  t_requirementresponse_accept: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_accept',
  },
  t_requirementresponse_dispute: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_dispute',
  },
  t_requirementresponse_resolve: {
    purposeKey: 'processFlows.purpose.t_requirementresponse_resolve',
  },

  // ── inventoryDeclaration ───────────────────────────────────────────────────
  t_inventorydeclaration_declare: {
    purposeKey: 'processFlows.purpose.t_inventorydeclaration_declare',
  },
  t_inventorydeclaration_record: {
    purposeKey: 'processFlows.purpose.t_inventorydeclaration_record',
  },

  // ── incomingShipment ───────────────────────────────────────────────────────
  t_incomingshipment_report: {
    purposeKey: 'processFlows.purpose.t_incomingshipment_report',
  },
  t_incomingshipment_ship: { purposeKey: 'processFlows.purpose.t_incomingshipment_ship' },
  t_incomingshipment_arrive: {
    purposeKey: 'processFlows.purpose.t_incomingshipment_arrive',
  },
  t_incomingshipment_cancel: {
    purposeKey: 'processFlows.purpose.t_incomingshipment_cancel',
  },

  // ── enforcement ────────────────────────────────────────────────────────────
  t_enforcement_set: { purposeKey: 'processFlows.purpose.t_enforcement_set' },
  t_role_grant: { purposeKey: 'processFlows.purpose.t_role_grant' },

  // ── supplierApplication ────────────────────────────────────────────────────
  t_application_submit: { purposeKey: 'processFlows.purpose.t_application_submit' },
  t_application_start_review: {
    purposeKey: 'processFlows.purpose.t_application_start_review',
  },
  t_application_approve: { purposeKey: 'processFlows.purpose.t_application_approve' },
  t_application_reject: { purposeKey: 'processFlows.purpose.t_application_reject' },
});

/**
 * WHAT EACH MACHINE IS ABOUT — one annotation per registered flow.
 *
 * A flow's purpose is not the sum of its verbs: `invoiceMatch` is four
 * `system` transitions and the reason it exists is "a wrong bill gets caught
 * before money moves". That is the sentence a reader needs FIRST, and no verb
 * carries it.
 */
export const ENTITY_PURPOSE: FlowAnnotations = Object.freeze({
  purchaseOrder: { purposeKey: 'processFlows.purpose.entity.purchaseOrder' },
  advanceShipNotice: { purposeKey: 'processFlows.purpose.entity.advanceShipNotice' },
  goodsReceipt: { purposeKey: 'processFlows.purpose.entity.goodsReceipt' },
  goodsReceiptLine: { purposeKey: 'processFlows.purpose.entity.goodsReceiptLine' },
  invoice: { purposeKey: 'processFlows.purpose.entity.invoice' },
  invoiceMatch: { purposeKey: 'processFlows.purpose.entity.invoiceMatch' },
  rfq: { purposeKey: 'processFlows.purpose.entity.rfq' },
  quotation: { purposeKey: 'processFlows.purpose.entity.quotation' },
  shipment: { purposeKey: 'processFlows.purpose.entity.shipment' },
  contract: { purposeKey: 'processFlows.purpose.entity.contract' },
  obligation: { purposeKey: 'processFlows.purpose.entity.obligation' },
  purchaseRequisition: { purposeKey: 'processFlows.purpose.entity.purchaseRequisition' },
  supplierDocument: { purposeKey: 'processFlows.purpose.entity.supplierDocument' },
  compliance: { purposeKey: 'processFlows.purpose.entity.compliance' },
  requirementResponse: { purposeKey: 'processFlows.purpose.entity.requirementResponse' },
  inventoryDeclaration: { purposeKey: 'processFlows.purpose.entity.inventoryDeclaration' },
  incomingShipment: { purposeKey: 'processFlows.purpose.entity.incomingShipment' },
  enforcement: { purposeKey: 'processFlows.purpose.entity.enforcement' },
  role: { purposeKey: 'processFlows.purpose.entity.role' },
  supplierApplication: { purposeKey: 'processFlows.purpose.entity.supplierApplication' },
});

/**
 * The i18n key for a transition's purpose, or `null` when none is annotated.
 *
 * ⚠️ **`null`, NEVER A FABRICATED KEY.** The bilateral test makes `null`
 * unreachable for a registered verb, so a surface reaching this branch is
 * looking up something the registry does not own — and the honest render for
 * that is silence, not `processFlows.purpose.<whatever-was-asked-for>` echoed
 * back at a reader as if it were a sentence.
 */
export function transitionPurposeKey(transitionId: string): string | null {
  return TRANSITION_PURPOSE[transitionId]?.purposeKey ?? null;
}

/** The i18n key for a flow's purpose, or `null`. Same contract as above. */
export function entityPurposeKey(entity: string): string | null {
  return ENTITY_PURPOSE[entity]?.purposeKey ?? null;
}
