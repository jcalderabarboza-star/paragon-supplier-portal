// ────────────────────────────────────────────────────────────────────────────
// SDC-2b — the P1 supplier-surface hooks (reads + the ONE governed write).
//
// READS (scoped react-query over the SDC module, keyed under 'sdc' + scopeKey):
//   · useOwnForecastLines — the current publication's lines fanned to THIS
//     supplier, read THROUGH the FLAG-2 gate: `supplierVisiblePublications()`
//     admits only LIVE publications, so the governed lane is EMPTY today (every
//     fixture is SIMULATED) and the page falls back to the explicitly-marked
//     sample path. When F1 real identities + a LIVE feed land, the gate is
//     already in this read path — the demo exemption collapses by construction.
//   · useOwnRequirementResponses — the supplier's OWN submissions
//     (own-facts-only, FORK-3b-C: status ONLY, no rank/score/consolidation —
//     those need sibling data scoping hides).
//
// SCOPING (SDC-4c — DONE): the P1 own-reads now go through
// `svc.collaboration.*` (SDC-4b), so per-supplier isolation is SERVICE-LEVEL —
// the same scoping-contract guarantee the procurement reads already have. Hook
// names + return shapes are unchanged, so callers (SupplierForecasts) are
// untouched. The two NON-own reads that stay fixture-derived here — forecast
// lines (through the FLAG-2 gate) and collaborated materials (master data) — are
// not supplier-written, so they are not part of the collaboration read seam.
//
// WRITE: useRequirementResponseSubmit — dispatches t_requirementresponse_submit
// (the SHARED channel-agnostic write-path, DEC-COMMS-PRIMARY) through the
// command seam; on a non-failed outcome it invalidates THIS scope's 'sdc'
// reads so My-responses re-derives from the mutated store.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useServiceQuery, scopeKey } from './useServiceQuery';
import {
  FORECAST_PUBLICATIONS,
  MATERIAL_MASTER,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  currentPublication,
  supplierVisiblePublications,
  ownCollaboratedMaterials,
  type CollaboratedMaterial,
} from '../sdc';
// SDC-4c — the P1 own-shipments view type is the shared SDC one (promoted in
// SDC-4b); re-exported so callers keep importing it from this hooks module.
export type { IncomingShipmentView } from '../sdc';
import type {
  ForecastLine,
  ForecastPublication,
  IncomingShipmentView,
  InventoryDeclaration,
  RequirementResponse,
  Uom,
} from '../sdc';
import type { ASN, CommandResult, QueryScope } from '../data/types';

export interface OwnForecastLinesRead {
  /** The current governed snapshot rendered (null when nothing to show). */
  publication: ForecastPublication | null;
  /** ONLY this supplier's fanned lines of that publication. */
  lines: readonly ForecastLine[];
  /**
   * FLAG-2 verdict for the render path: true only when the publication came
   * through `supplierVisiblePublications()` (a LIVE feed). False = the sample
   * fallback — the page MUST render its honest sample marking.
   */
  liveFeed: boolean;
}

/** The supplier's own fanned lines of the current publication, read through
 *  the FLAG-2 gate (LIVE-only governed lane; SIMULATED sample fallback). */
export function useOwnForecastLines() {
  return useServiceQuery<OwnForecastLinesRead>(
    ['sdc', 'ownForecastLines'],
    async (_svc, scope) => {
      // The governed lane: only LIVE publications may reach a supplier at all.
      const live = supplierVisiblePublications(FORECAST_PUBLICATIONS);
      const liveFeed = live.length > 0;
      // Sample fallback (operator-demo path): the SIMULATED fixtures render
      // ONLY under the page's explicit sample marking — never as if real.
      const publication = currentPublication(liveFeed ? live : FORECAST_PUBLICATIONS);
      const lines =
        publication && scope.supplierId
          ? publication.lines
              .filter((l) => l.supplierId === scope.supplierId)
              .slice()
              .sort(
                (a, b) =>
                  a.periodBucket.localeCompare(b.periodBucket) ||
                  a.materialCode.localeCompare(b.materialCode),
              )
          : [];
      return { publication, lines, liveFeed };
    },
  );
}

/** The supplier's OWN requirement responses, latest first (own-facts-only,
 *  status-only). Service-scoped (SDC-4c). */
export function useOwnRequirementResponses() {
  return useServiceQuery<readonly RequirementResponse[]>(
    ['sdc', 'ownRequirementResponses'],
    async (svc, scope) =>
      (await svc.collaboration.getOwnRequirementResponses(scope)).items,
  );
}

// Targeted invalidation, mirroring useInvalidateProcurement: only THIS scope's
// 'sdc' reads re-derive; another supplier's cache is never disturbed.
function useInvalidateSdc() {
  const qc = useQueryClient();
  return (scope: QueryScope) => {
    const key = scopeKey(scope);
    qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'sdc' && q.queryKey[q.queryKey.length - 1] === key,
    });
  };
}

export interface RequirementResponseSubmitVars {
  /** The t_requirementresponse_submit payload (built by
   *  `buildRequirementResponsePayload` — never hand-assembled in a page). */
  payload: Record<string, unknown>;
  /** SDC-3b — the SubmissionSession audit anchor (`causationAnchor()`), passed
   *  by commands 2..n of a multi-object visit so their DR-10 events group with
   *  the first. Absent for the visit's FIRST dispatch (it becomes the anchor). */
  causationId?: string;
}

/** Confirm a published forecast line (fires the `creation` verb
 *  `t_requirementresponse_submit` — supplier-owned, line-grain scoped). */
export function useRequirementResponseSubmit() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
  };
  const invalidate = useInvalidateSdc();

  return useMutation<CommandResult, Error, RequirementResponseSubmitVars>({
    mutationFn: ({ payload, causationId }) =>
      svc.commands.dispatch(
        scope,
        {
          transitionId: 't_requirementresponse_submit',
          entity: 'requirementResponse',
          payload,
        },
        causationId,
      ),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Acknowledge a visibility-only line (SDC-2b-EXT — fires the `creation` verb
 *  `t_requirementresponse_acknowledge`; class-guarded, NO commitment qty). */
export function useRequirementResponseAcknowledge() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
  };
  const invalidate = useInvalidateSdc();

  return useMutation<CommandResult, Error, RequirementResponseSubmitVars>({
    mutationFn: ({ payload, causationId }) =>
      svc.commands.dispatch(
        scope,
        {
          transitionId: 't_requirementresponse_acknowledge',
          entity: 'requirementResponse',
          payload,
        },
        causationId,
      ),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── SDC-3b — the two additional supplier objects (reads + governed writes) ───

/** One collaborated material, joined with the master for display + the uom the
 *  target will assign (shown read-only — the supplier never picks a unit). */
export interface CollaboratedMaterialView extends CollaboratedMaterial {
  readonly label: string;
  readonly uom: Uom;
}

/** The supplier's collaborated materials (the (i)∪(ii) set the declare/report
 *  commands authorise), joined with the master. Page-level own-scope (SDC-4
 *  moves this behind a service read). */
export function useOwnCollaboratedMaterials() {
  return useServiceQuery<readonly CollaboratedMaterialView[]>(
    ['sdc', 'ownCollaboratedMaterials'],
    async (_svc, scope) => {
      if (!scope.supplierId) return [];
      return ownCollaboratedMaterials(
        SUPPLIER_MATERIAL_RELATIONSHIPS,
        FORECAST_PUBLICATIONS,
        scope.supplierId,
      ).map((m) => ({
        ...m,
        label: MATERIAL_MASTER[m.materialCode]?.label ?? m.materialCode,
        uom: MATERIAL_MASTER[m.materialCode]?.canonicalUom ?? 'KG',
      }));
    },
  );
}

/** The supplier's CURRENT SOH per material — the most-recently-declared snapshot
 *  for each material (own-facts-only; a snapshot, not a running total). "Latest"
 *  is by store-insertion recency, NOT `declaredAt` (SDC-4a ruling c: a fresh
 *  declare wins over a future-dated seed). Service-scoped (SDC-4c); sorted by
 *  material code by the service. */
export function useOwnInventoryDeclarations() {
  return useServiceQuery<readonly InventoryDeclaration[]>(
    ['sdc', 'ownInventoryDeclarations'],
    async (svc, scope) =>
      (await svc.collaboration.getOwnInventoryDeclarations(scope)).items,
  );
}

/** The supplier's OWN reported shipments (own-facts-only), newest first, each
 *  with its display lifecycle resolved. A to-paragon leg's lifecycle is DERIVED
 *  from the linked ASN's live status (the ASN machine is the SoR for that leg).
 *  Service-scoped + display-derived (SDC-4c). */
export function useOwnIncomingShipments() {
  return useServiceQuery<readonly IncomingShipmentView[]>(
    ['sdc', 'ownIncomingShipments'],
    async (svc, scope) =>
      (await svc.collaboration.getOwnIncomingShipments(scope)).items,
  );
}

/** The supplier's OWN ASNs — the to-paragon link picker source (the leg links an
 *  own ASN, never a free-typed ref; asnRef resolves server-side). Service-scoped
 *  (SDC-4c). */
export function useOwnSupplierAsns() {
  return useServiceQuery<readonly ASN[]>(
    ['sdc', 'ownSupplierAsns'],
    async (svc, scope) =>
      (await svc.collaboration.getOwnSupplierAsns(scope)).items,
  );
}

export interface SdcObjectDispatchVars {
  /** The command payload (built by an `objectSubmitModels` builder). */
  payload: Record<string, unknown>;
  /** SDC-3b — the SubmissionSession audit anchor (see RequirementResponseSubmitVars). */
  causationId?: string;
}

/** Declare current SOH (fires the `creation` verb `t_inventorydeclaration_declare`
 *  — supplier-owned, collaborated-material scoped, total-first). */
export function useInventoryDeclare() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
  };
  const invalidate = useInvalidateSdc();

  return useMutation<CommandResult, Error, SdcObjectDispatchVars>({
    mutationFn: ({ payload, causationId }) =>
      svc.commands.dispatch(
        scope,
        {
          transitionId: 't_inventorydeclaration_declare',
          entity: 'inventoryDeclaration',
          payload,
        },
        causationId,
      ),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Report an incoming shipment (fires the `creation` verb
 *  `t_incomingshipment_report`; direction-guarded). */
export function useIncomingShipmentReport() {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
  };
  const invalidate = useInvalidateSdc();

  return useMutation<CommandResult, Error, SdcObjectDispatchVars>({
    mutationFn: ({ payload, causationId }) =>
      svc.commands.dispatch(
        scope,
        {
          transitionId: 't_incomingshipment_report',
          entity: 'incomingShipment',
          payload,
        },
        causationId,
      ),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}
