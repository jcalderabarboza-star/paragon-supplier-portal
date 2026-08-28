// ────────────────────────────────────────────────────────────────────────────
// C.3 — THE DEMONSTRABLE APPROVED REQUISITION, DERIVED THROUGH THE MACHINE.
//
// C.2 turned on a behaviour nobody could watch. Its headline case — a
// requisition whose category IS an RFQ category, so the wizard carries it — was
// covered in the suite and UNREACHABLE in the running app, because no shipped
// fixture is both `Approved` and member-categoried. The only approved row,
// `pr-002`, is `Packaging Primary`, which is not an RFQ category, so every
// browser walk could only ever show the REFUSAL half.
//
// ⚠️ **SO THE ROW IS GROWN, NOT WRITTEN.** It would have been one line to add a
// seventh fixture with `status: 'Approved'` and `category: 'Fragrance'`. That
// line would have been a lie of exactly the kind this project keeps removing: a
// document in a state no act put it in, with an `approvalLevel` nobody set and
// an approval nobody made. `t_pr_approve` PERSISTS `approvedBy` from the
// session — a hand-stamped row would carry a state whose own evidence field is
// empty, and the surface would render it beside genuinely approved documents
// with nothing to tell them apart.
//
// This dispatches the three real verbs, in order, through the same
// `MockCommandService` every surface uses:
//
//     t_pr_create  (requisitioner)  →  Draft
//     t_pr_submit  (requisitioner)  →  Pending Approval
//     t_pr_approve (procurement)    →  Approved
//
// ⚠️ **TWO SCOPES, NOT ONE, AND THE SPLIT IS THE POINT.** `pr:create` and
// `pr:submit` live in `requisitioner`; `pr:approve` lives in `procurement` —
// derived, not assumed. A single wide scope (`buyer_all`) would have worked and
// would have quietly modelled one person raising a requisition and approving
// it, which is the segregation defect already filed at §76d
// (`SEGREGATION-CROSSED-IN-ONE-DRAWER-01`). A seed is a worked example of the
// system's own rules; seeding through a crossed drawer would put that defect in
// the demonstration data.
//
// The pattern — and the reasoning about attribution — is `enforcementSeed.ts`'s,
// followed deliberately rather than reinvented: a seed goes through the
// DISPATCHED VERB, never into the store, so it passes every policy a later act
// passes and lands in the DR-10 trail like any other act. A seed that could
// bypass `PR_APPROVAL_ATTRIBUTED` would be a second, weaker authoring path.
//
// ⚠️ **THE APPROVAL IS `UNATTRIBUTED`, AND THAT IS THE HONEST FORM, NOT A GAP.**
// Nothing in this platform can name a human yet (C10 §6.2); `NO_PERSON` is the
// same refusal every real approval on this surface records today. The act is
// named on the record — a dispatched verb, a DR-10 event — which is what "a
// named recorded act" means here.
// ────────────────────────────────────────────────────────────────────────────

import { MockCommandService } from './MockCommandService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { NO_PERSON } from '../../../context/noPerson';
import type { CommandResult, QueryScope } from '../types';

/**
 * The requisition raised by the seed. Its category is an EXACT member of the
 * RFQ category union, which is the whole reason the row exists — see
 * `requisitionPrefill.ts` for why a non-member cannot be mapped into one.
 */
const SEED = Object.freeze({
  material: 'Wardah Floral Accord',
  category: 'Fragrance',
  quantity: 250,
  uom: 'KG',
  requiredDate: '2026-07-15',
  estimatedValue: 96_000_000,
  requestor: 'R&D Formulation',
  costCenter: 'CC-RD-002',
  priority: 'High',
  justification: 'Wardah signature accord — annual reformulation buy.',
});

/** The requester's seat: raises and submits, and CANNOT approve. */
const REQUISITIONER_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['requisitioner'],
  actor: NO_PERSON,
};

/** Procurement's seat: approves, and holds no `pr:create`. */
const PROCUREMENT_SCOPE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

export interface RequisitionSeedOutcome {
  /**
   * `seeded` — all three verbs landed and the row is `Approved`.
   * `already-seeded` — a member-categoried approved row already exists; skipped.
   * `refused` — a verb refused. THE ROW IS LEFT WHEREVER THE MACHINE LEFT IT,
   *   never nudged the rest of the way: a half-seeded requisition sitting at
   *   `Pending Approval` is the truth, and it is a better artifact than an
   *   `Approved` one the machine declined to produce.
   */
  readonly status: 'seeded' | 'already-seeded' | 'refused';
  /** The requisition number, when one was minted. */
  readonly prNumber?: string;
  /** Which verb refused, and the dispatcher's own words. */
  readonly refusedAt?: string;
  readonly reason?: string;
}

/**
 * Grow one Approved, member-categoried requisition.
 *
 * Idempotent: re-running finds the existing row and skips. Safe to call more
 * than once, and it is called once at startup (`main.tsx`).
 */
export async function seedSourceableRequisition(
  commands: MockCommandService = new MockCommandService(),
): Promise<RequisitionSeedOutcome> {
  const existing = purchaseRequisitionStore
    .all()
    .find((pr) => pr.status === 'Approved' && pr.category === SEED.category);
  if (existing) return { status: 'already-seeded', prNumber: existing.prNumber };

  const created: CommandResult = await commands.dispatch(REQUISITIONER_SCOPE, {
    transitionId: 't_pr_create',
    entity: 'purchaseRequisition',
    payload: { ...SEED },
  });
  if (created.status === 'failed' || !created.entityId) {
    return { status: 'refused', refusedAt: 't_pr_create', reason: created.reason };
  }
  const id = created.entityId;

  const submitted = await commands.dispatch(REQUISITIONER_SCOPE, {
    transitionId: 't_pr_submit',
    entity: 'purchaseRequisition',
    entityId: id,
    payload: {},
  });
  if (submitted.status === 'failed') {
    return { status: 'refused', prNumber: id, refusedAt: 't_pr_submit', reason: submitted.reason };
  }

  // No `approvedBy` in the payload — `PR_APPROVAL_ATTRIBUTED` REFUSES a
  // caller-supplied one, and the seed must pass that policy rather than be
  // exempt from it. The attribution comes from the scope, as it does for a
  // person pressing Approve on the surface.
  const approved = await commands.dispatch(PROCUREMENT_SCOPE, {
    transitionId: 't_pr_approve',
    entity: 'purchaseRequisition',
    entityId: id,
    payload: {},
  });
  if (approved.status === 'failed') {
    return { status: 'refused', prNumber: id, refusedAt: 't_pr_approve', reason: approved.reason };
  }

  return { status: 'seeded', prNumber: id };
}
