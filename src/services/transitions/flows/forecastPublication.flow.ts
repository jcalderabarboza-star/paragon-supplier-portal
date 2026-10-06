// ────────────────────────────────────────────────────────────────────────────
// Forecast publication flow (B4a / Design 2 §2.1). **WIRED IN THE SAME PR AS
// THIS FILE** — the target is `forecastPublication` in `MockCommandService`.
//
// The governed snapshot a supplier confirms AGAINST, made a machine. Until
// now `FORECAST_PUBLICATIONS` was a frozen constant: nobody could open, split,
// approve or publish a plan, and the supplier's page read the fixture straight.
//
// ── ⚠️ THE PLANNER SPLITS; SOMEBODY ELSE SIGNS THE FIRM SPLIT ───────────────
//
// `t_publication_approve_firm` holds `publication:approve`, which sits in the
// PROCUREMENT lane — never in planning. A firm class is the field on which a
// supplier builds stock and on which dead-stock liability is decided (C8 §2.2),
// so the split and the signature are two authorities. Two lanes make narrowing
// POSSIBLE; the default buyer seat still holds both, and that is recorded
// (`SEGREGATION-CROSSED-IN-ONE-DRAWER-01`'s shape) rather than pretended away.
//
// ── ⚠️ A REVISION IS A NEW PUBLICATION, NOT AN EDIT ─────────────────────────
//
// Publishing supersedes the previously Published publication of the SAME grain
// by cascade (`t_publication_supersede`, automation). A Published publication
// has no edit edge: responses bind `publicationId + planVersion`, and editing
// the thing they bound to would change what a supplier already answered.
//
// ── ⚠️ ALLOCATE AND APPROVE ARE `statePreserving` ON `Draft` ───────────────
//
// Both append to the draft without moving it. `applyTransition` is not handed
// the transition id, so the target tells them apart by the field each one is
// declared to REQUIRE: only allocate requires `forecastQty` (`publicationVerbFor`,
// the `pslWriteVerbFor` precedent). The two field sets are disjoint on that key
// by construction, and a spec pins it.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const FORECAST_PUBLICATION_STATES = Object.freeze([
  'Draft',
  'Published',
  'Superseded',
  'Withdrawn',
  'Discarded',
] as const);

export const PUBLICATION_OPEN_FIELDS = Object.freeze(['planVersion', 'grain', 'horizon', 'sourceRef'] as const);
export const PUBLICATION_ALLOCATE_FIELDS = Object.freeze([
  'materialCode',
  'periodBucket',
  'supplierId',
  'forecastQty',
  'forecastQtyRaw',
  'basis',
] as const);
export const PUBLICATION_APPROVE_FIELDS = Object.freeze(['materialCode', 'periodBucket', 'supplierId'] as const);

export const forecastPublicationFlow: FlowDefinition = {
  entity: 'forecastPublication',
  version: 1,
  states: [...FORECAST_PUBLICATION_STATES],
  initial: 'Draft',
  /**
   * Superseded and Withdrawn are both endings: a superseded publication was
   * replaced by the next one, a withdrawn one was taken back with a reason.
   * Neither is re-opened — the next plan is a new draft. Discarded is the
   * ending of a draft nobody was ever sent (SDC-5).
   */
  terminals: ['Superseded', 'Withdrawn', 'Discarded'],
  transitions: [
    {
      // The draft comes into existence from a SOMO plan version, with the
      // material-period totals of its horizon and NO supplier split yet.
      id: 't_publication_open',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'publication:draft',
      requiredFields: [...PUBLICATION_OPEN_FIELDS],
      // B4b · `carryForwardFrom` is OPTIONAL and not a required field: a draft
      // opened without it starts with no split (B4a), one opened with it starts
      // from the current publication's split, approvals dropped.
      policyHooks: [
        POLICY_HOOKS.PUB_HORIZON_ONE_GRAIN,
        POLICY_HOOKS.PUB_PLANVERSION_KNOWN,
        POLICY_HOOKS.PUB_CARRY_FROM_CURRENT,
        POLICY_HOOKS.PUB_ONE_OPEN_DRAFT,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The planner's split of one material-period total to one supplier.
      id: 't_publication_allocate',
      from: ['Draft'],
      to: 'Draft',
      trigger: 'user',
      requiredRole: 'publication:allocate',
      requiredFields: [...PUBLICATION_ALLOCATE_FIELDS],
      policyHooks: [
        POLICY_HOOKS.PUB_MATERIAL_KNOWN,
        POLICY_HOOKS.PUB_BASIS_KNOWN,
        POLICY_HOOKS.PUB_LINE_IN_HORIZON,
        POLICY_HOOKS.PUB_SUPPLIER_COLLABORATED,
        POLICY_HOOKS.PUB_QTY_FLOOR,
        POLICY_HOOKS.PUB_QTY_AGREES,
        POLICY_HOOKS.PUB_ALLOC_WITHIN_TOTAL,
      ],
      statePreserving: true,
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Procurement signs a FIRM split. The stamp is the session's actor,
      // written by the target — never a payload field (C10 §6.2).
      id: 't_publication_approve_firm',
      from: ['Draft'],
      to: 'Draft',
      trigger: 'user',
      requiredRole: 'publication:approve',
      requiredFields: [...PUBLICATION_APPROVE_FIELDS],
      policyHooks: [POLICY_HOOKS.PUB_LINE_IS_FIRM, POLICY_HOOKS.PUB_ACTOR_ATTRIBUTED],
      statePreserving: true,
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The one exit from Draft. Stamps publishedAt and responseDueAt, and the
      // cascade retires the previous publication of the same grain.
      id: 't_publication_publish',
      from: ['Draft'],
      to: 'Published',
      trigger: 'user',
      requiredRole: 'publication:publish',
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.PUB_HAS_LINES,
        POLICY_HOOKS.PUB_FIRM_LINES_APPROVED,
        POLICY_HOOKS.PUB_CLASS_PROJECTION_PRESENT,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ SDC-5 · THE DRAFT'S OTHER WAY OUT. Publish was the ONE exit from
      // Draft, and `PUB_ONE_OPEN_DRAFT` refuses a second draft at the grain —
      // so a draft opened from the wrong plan version, or abandoned, blocked
      // every later draft of its grain for good (R-SDC P1). Discarding ends it
      // and frees the grain. No supplier was ever sent a draft, so nothing a
      // supplier answered is touched and no reason is owed to anyone outside;
      // the ledger still records who discarded it. It is the opener's own atom:
      // the lane that may start a draft may abandon one.
      id: 't_publication_discard',
      from: ['Draft'],
      to: 'Discarded',
      trigger: 'user',
      requiredRole: 'publication:draft',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_publication_supersede',
      from: ['Published'],
      to: 'Superseded',
      trigger: 'cascade',
      requiredRole: 'publication:supersede',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'Raised by the publish cascade. A newer publication of the same grain ' +
          'replaced this one; nobody declares it.',
      },
      version: 1,
    },
    {
      // Taken back, with the reason on the record.
      id: 't_publication_withdraw',
      from: ['Published'],
      to: 'Withdrawn',
      trigger: 'user',
      requiredRole: 'publication:publish',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.PUB_TEXT_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
