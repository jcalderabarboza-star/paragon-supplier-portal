// ─────────────────────────────────────────────────────────────────────────────
// MD-4 / MD-5 · A MASTER-DATA CHANGE REQUEST.
//
// SAP S/4HANA owns master data (operator ruling, 12 October 2026). The portal
// proposes: a request is raised, reviewed under four eyes, handed to SAP as a
// package, and ends on SAP's answer.
//
//   propose ─► Proposed ─► In Review ─► Approved ─► Sent to SAP ─► Completed in SAP
//                 │  ▲         │           │             └──────► Declined by SAP
//                 │  └ return ─┤           └─► Withdrawn
//                 └─► Withdrawn └─► Rejected
//
// ── "APPROVED" IS NOT "EXISTS" ──────────────────────────────────────────────
// Approval means Paragon agreed to ask SAP. No act of this flow writes a master
// record: the record changes only when a sync run delivers it. The two SAP
// states say whose answer they are.
//
// ── WHO ─────────────────────────────────────────────────────────────────────
// `masterdata:propose` — procurement and planning. `masterdata:review` —
// planning and compliance, and a hook holds each to its own kind (materials are
// planning's, suppliers compliance's). `masterdata:handoff` and
// `masterdata:record-sap-answer` — procurement: approving says the request is
// right, handing off says it goes now, so they are two acts.
//
// ── THE SAP ANSWER IS AN EXTERNAL FACT ──────────────────────────────────────
// `t_mdr_sap_complete` and `t_mdr_sap_decline` record what SAP decided. The
// feed that fires them for real is SE-6. In the fixture a person may record a
// SAMPLE answer on a demo or preview deployment; it is refused on production.
// ─────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const MDR_BIRTH_FIELDS = Object.freeze(['kind', 'proposed', 'reason'] as const);

export const masterDataRequestFlow: FlowDefinition = {
  entity: 'masterDataRequest',
  version: 1,
  states: ['Proposed', 'In Review', 'Approved', 'Sent to SAP', 'Completed in SAP', 'Declined by SAP', 'Rejected', 'Withdrawn'],
  initial: 'Proposed',
  terminals: ['Completed in SAP', 'Declined by SAP', 'Rejected', 'Withdrawn'],
  transitions: [
    {
      id: 't_mdr_propose',
      from: [],
      to: 'Proposed',
      trigger: 'creation',
      requiredRole: 'masterdata:propose',
      requiredFields: [...MDR_BIRTH_FIELDS],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_PROPOSAL_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_start_review',
      from: ['Proposed'],
      to: 'In Review',
      trigger: 'user',
      requiredRole: 'masterdata:review',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_REVIEWER_LANE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_return',
      from: ['In Review'],
      to: 'Proposed',
      trigger: 'user',
      requiredRole: 'masterdata:review',
      requiredFields: ['note'],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_REVIEWER_LANE, POLICY_HOOKS.MDR_NOTE_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_approve',
      from: ['In Review'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'masterdata:review',
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.MDR_ACTOR_NAMED,
        POLICY_HOOKS.MDR_REVIEWER_LANE,
        POLICY_HOOKS.MDR_APPROVER_NOT_PROPOSER,
        POLICY_HOOKS.MDR_BASE_UNCHANGED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_reject',
      from: ['In Review'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'masterdata:review',
      requiredFields: ['note'],
      policyHooks: [
        POLICY_HOOKS.MDR_ACTOR_NAMED,
        POLICY_HOOKS.MDR_REVIEWER_LANE,
        POLICY_HOOKS.MDR_NOTE_AUTHORED,
        POLICY_HOOKS.MDR_APPROVER_NOT_PROPOSER,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_withdraw',
      from: ['Proposed', 'Approved'],
      to: 'Withdrawn',
      trigger: 'user',
      requiredRole: 'masterdata:propose',
      requiredFields: ['note'],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_NOTE_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_hand_off',
      from: ['Approved'],
      to: 'Sent to SAP',
      trigger: 'user',
      requiredRole: 'masterdata:handoff',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_BASE_UNCHANGED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_sap_complete',
      from: ['Sent to SAP'],
      to: 'Completed in SAP',
      trigger: 'user',
      requiredRole: 'masterdata:record-sap-answer',
      requiredFields: ['sapRequestNumber'],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_SAP_ANSWER_ADMISSIBLE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_mdr_sap_decline',
      from: ['Sent to SAP'],
      to: 'Declined by SAP',
      trigger: 'user',
      requiredRole: 'masterdata:record-sap-answer',
      requiredFields: ['sapRequestNumber', 'note'],
      policyHooks: [POLICY_HOOKS.MDR_ACTOR_NAMED, POLICY_HOOKS.MDR_SAP_ANSWER_ADMISSIBLE, POLICY_HOOKS.MDR_NOTE_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
