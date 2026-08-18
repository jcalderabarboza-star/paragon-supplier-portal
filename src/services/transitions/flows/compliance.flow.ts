// ────────────────────────────────────────────────────────────────────────────
// Compliance flow (I3.1 — census §4, machines #11–15 collapsed). Author-unwired.
//
// The ONE canonical compliance machine. The 5 fragmented status vocabularies
// (SupplierDocumentStatus / ProfileCertStatus / ScorecardComplianceLevel /
// ComplianceState / ComplianceItemStatus — census #11–15) share ONE tiny
// transition substrate, authored here for the first time:
//
//   Missing  ──user:submit──▶  Under Review
//   Under Review  ──system:verify──▶  Valid   (then clock-projects Expiring→Expired)
//   Under Review  ──system:reject──▶  Missing
//
// A cert requirement is born `Missing` — there is NO creation transition: no
// event mints it, the supplier × material × certificate requirement grid implies
// it (a required cert not yet supplied simply IS Missing). This is deliberate and
// distinct from `supplierDocument` (where a buyer explicitly REQUESTS a document
// → a creation edge). Verify/reject are `system`-triggered (verification pipeline;
// map to the buyer role).
//
// `Valid` clock-projects to Expiring → Expired (expiry < clock, law 0.5, census
// G1) — read-time PROJECTIONS, NOT transition-states, so deliberately absent from
// `states`. The projection lives in `complianceProjection.ts` (the DTO-v2 read
// layer), consumed via `ComplianceRegistryEntry`.
//
// INERT (I3.1): NO CommandTarget, no cascade — dispatching any verb fails at
// target-resolution. The LivenessRegistry derives SIMULATED from this (backing
// present, not a wired target); it flips LIVE only when a CommandTarget wires
// against the real cert registry post Track-R harvest (FORK-2 hybrid).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';

export const complianceFlow: FlowDefinition = {
  entity: 'compliance',
  version: 1,
  states: ['Missing', 'Under Review', 'Valid'],
  initial: 'Missing',
  /** PF-0 · D-2 — a valid certificate is the end of THIS machine. Expiry is a
   *  read-time projection (law 0.5), never an edge out of 'Valid'. */
  terminals: ['Valid'],
  transitions: [
    {
      // The supplier submits the certificate for a required cert grid cell.
      id: 't_compliance_submit',
      from: ['Missing'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'compliance:submit',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Verification pipeline confirms the cert (buyer/system role).
      id: 't_compliance_verify',
      from: ['Under Review'],
      to: 'Valid',
      trigger: 'system',
      requiredRole: 'compliance:verify',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'ruled-unsurfaced',
        why:
          'I3.1 models verification as the pipeline behind the compliance ' +
          'registry, not as an operator screen. Flips when Track R rules its ' +
          'operator lane, not when somebody finds time to build it.',
      },
      version: 1,
    },
    {
      // Verification rejects → back to Missing (supplier re-submits).
      id: 't_compliance_reject',
      from: ['Under Review'],
      to: 'Missing',
      trigger: 'system',
      requiredRole: 'compliance:reject',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'ruled-unsurfaced',
        why:
          'I3.1 models verification as the pipeline behind the compliance ' +
          'registry, not as an operator screen.',
      },
      version: 1,
    },
  ],
};
