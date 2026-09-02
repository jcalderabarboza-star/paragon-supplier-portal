# C1 — Method Surface

Three distinct axes. **63** (service surface) · **97** (transition catalog) · **14** (wired
targets). They measure different things; this file keeps them separate.

> ⚠️ **THIS DOCUMENT IS PINNED TO THE TREE, AND THE PIN IS WHY THE NUMBERS ABOVE ARE ALLOWED TO
> BE NUMBERS.** `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` derives every
> figure and every name below from the AST and the flow registry, and fails when the tree drifts
> **or when this document goes stale**. A count written in prose is normally forbidden here
> (`FLOOR-IN-PROSE-01`); a contract sent to a counterparty must nevertheless carry concrete
> figures, and a re-derivation on every run is what makes that safe. **Do not hand-edit a number
> below — change the tree, or correct the document and let the pin agree.**
>
> ⚠️ **AND BEING PINNED IS NOT BEING RIGHT.** The pin compares NAMES, COUNTS and MEMBERSHIP. It
> cannot see a method whose SIGNATURE changed shape, one that is present in both places and wrong
> in BEHAVIOUR, or any prose claim on this page. Those are stated in full under
> [What the pin cannot see](#what-the-pin-cannot-see) rather than left for a reader to assume.

> **RE-HARVEST (2026-09-02).** This document had not been re-harvested since I3.1 and was stale by
> half its shape. Corrected, as SETS rather than as counts: the service surface gained
> `ICollaborationService`, `IDeliveryService`, `IChaseService` and `IEnforcementService` (four
> sub-services this page never named), `IProcurementService` gained `getPrIntake` and
> `getSupplierApplications`, and `CommandInput` gained `expectedState` (1c) and `decision`. It
> **lost** `IEngagementService` — a seven-method sub-service this page described and the tree has
> never contained since — and `IDiscoveryService.getGlobalSuppliers`, which was removed
> deliberately (`types.ts` records the removal). The transition catalog went 72 → **97** across
> 14 → **20** flows, and the wired-target axis 6 → **14**. Every figure on this page is now
> re-derived on every test run, which is the point of the batch that corrected it.

Source of truth: `src/services/data/types.ts` (service + command types),
`src/services/transitions/` (schema, dispatcher, flows).

---

## Axis 1 — the 63-method service surface (`IDataService`)

The single interface the Phase-F1 real adapter implements; pages call it through
`useDataService()` and do not change when the mock is swapped for `httpDataService`. Every method
takes `QueryScope` as its first argument (the scoping contract — a supplier only ever sees its
own data; the buyer sees the superset).

`IDataService` is nine read sub-services + one command sub-service + one top-level method:

```ts
interface IDataService {
  suppliers: ISupplierService;
  procurement: IProcurementService;
  risk: IRiskService;
  discovery: IDiscoveryService;
  analytics: IAnalyticsService;
  collaboration: ICollaborationService;
  delivery: IDeliveryService;
  chase: IChaseService;
  enforcement: IEnforcementService;
  commands: ICommandService;
  getCapabilities(scope: QueryScope): Promise<CapabilitySet>;
}
```

| Sub-service | Count | Methods |
|---|---|---|
| `ISupplierService` | 3 | `list`, `getById`, `getCurrent` |
| `IProcurementService` | 24 | `getPurchaseOrders`, `getPurchaseOrder`, `getInventory`, `getRFQs`, `getQuotations`, `getShipments`, `getASNs`, `getGoodsReceipts`, `getBuyerInvoices`, `getSupplierInvoices`, `getContracts`, `getObligations`, `getDocuments`, `getStorefrontCatalog`, `getStorefrontCerts`, `getStorefrontProducts`, `getKpis`, `getPerformanceTrend`, `getSupplierScorecards`, `getRequisitions`, `getPrIntake`, `getSupplierApplications`, `getProductionLines`, `getSupplierHealth` |
| `IRiskService` | 7 | `getRiskAlerts`, `getGeoRisks`, `getExposure`, `getScenarios`, `getCompliance`, `getComplianceRegistry`, `getCommodities` |
| `IDiscoveryService` | 4 | `getRecommended`, `getQualifications`, `getMarketIntel`, `getSingleSourceItems` |
| `IAnalyticsService` | 7 | `getSummary`, `getSpendByCategory`, `getTopSuppliers`, `getOtifTrend`, `getPoVolumeTrend`, `getChannelMix`, `getSupplierPerformance` |
| `ICollaborationService` | 8 | `getOwnRequirementResponses`, `getOwnInventoryDeclarations`, `getOwnIncomingShipments`, `getOwnSupplierAsns`, `getConsolidation`, `getCoverage`, `getChase`, `getRollups` |
| `IDeliveryService` | 4 | `getAgreements`, `releaseLines`, `confirmMatch`, `editPolicy` |
| `IChaseService` | 1 | `getUnifiedChase` |
| `IEnforcementService` | 1 | `getEnforcementSettings` |
| **read subtotal** | **59** | |
| `ICommandService` | 3 | `dispatch`, `getCommandStatus`, `settle` |
| top-level | 1 | `getCapabilities` |
| **TOTAL** | **63** | |

**Return contract:** list reads return `Page<T>` (DR-5 — see C2); single reads return `T | null`;
`getSummary` returns a summary object or `null` (buyer-populated, supplier-null). Failure is
signalled by **throwing** `DataError` (DR-4 — see C2), matching TanStack Query's `queryFn`-throws
model. Command methods report outcome as a status, not a throw, except hard authorization
failures (`NOT_FOUND` / `SCOPE_DENIED`) which throw `DataError` on the same channel as reads.

**Status:** **LIVE** (mock-backed: `mockDataService.ts` wires the mock read services +
`MockCommandService` + `capabilitiesFor`). The real adapter is **RESERVED** — **no module in
`src/` implements `httpDataService`** (C5). Several files under `src/` name it, every one of them as a reserved
future seam or a comment; the pin asserts the ABSENCE OF AN IMPLEMENTATION, never the absence of
the string, because those are different claims and only the first is the contract's.

---

## Axis 2 — the 97-transition catalog (20 flows)

Every authored state-machine edge across the registered flows (`id: 't_<entity>_<verb>'`). Derived
from `getKnownFlows()` — the seeded registry — never from a grep over the flow files, because a
transition id can be assembled at a call site rather than written as a literal (§83). This is the
*verb* surface and is **not** the service-method count.

| Flow file | Entity | Transitions | Transition ids | Wiring |
|---|---|---|---|---|
| `purchaseOrder.flow.ts` | `purchaseOrder` | 7 | `t_po_issue`, `t_po_view`, `t_po_acknowledge`, `t_po_confirm`, `t_po_partial_deliver`, `t_po_deliver`, `t_po_close` | **wired** |
| `advanceShipNotice.flow.ts` | `advanceShipNotice` | 6 | `t_asn_create`, `t_asn_submit`, `t_asn_in_transit`, `t_asn_deliver`, `t_asn_discrepancy`, `t_asn_resolve_discrepancy` | **wired** |
| `goodsReceipt.flow.ts` | `goodsReceipt` | 8 | `t_gr_create`, `t_gr_start_inspection`, `t_gr_hold`, `t_gr_request_retest`, `t_gr_approve`, `t_gr_partial_approve`, `t_gr_reject`, `t_gr_post` | **wired** |
| `goodsReceiptLine.flow.ts` | `goodsReceiptLine` | 5 | `t_grline_inspect`, `t_grline_accept`, `t_grline_reject`, `t_grline_quarantine`, `t_grline_return` | sub-flow (rollup) |
| `invoice.flow.ts` | `invoice` | 8 | `t_invoice_create`, `t_invoice_submit`, `t_invoice_match`, `t_invoice_approve`, `t_invoice_release_payment`, `t_invoice_remit`, `t_invoice_dispute`, `t_invoice_resolve` | **wired** |
| `invoiceMatch.flow.ts` | `invoiceMatch` | 4 | `t_invmatch_await_gr`, `t_invmatch_matched`, `t_invmatch_qty_variance`, `t_invmatch_price_variance` | sub-flow (rollup) |
| `rfq.flow.ts` | `rfq` | 7 | `t_rfq_create`, `t_rfq_publish`, `t_rfq_close`, `t_rfq_award`, `t_rfq_fx_pin`, `t_rfq_cancel`, `t_rfq_reopen` | **wired** |
| `quotation.flow.ts` | `quotation` | 4 | `t_quotation_submit`, `t_quotation_review`, `t_quotation_award`, `t_quotation_reject` | **wired** |
| `shipment.flow.ts` | `shipment` | 8 | `t_shipment_create`, `t_shipment_asn_received`, `t_shipment_depart`, `t_shipment_arrive_port`, `t_shipment_customs`, `t_shipment_dock`, `t_shipment_unload`, `t_shipment_deliver` | inert |
| `contract.flow.ts` | `contract` | 4 | `t_contract_draft`, `t_contract_activate`, `t_contract_renew`, `t_contract_terminate` | inert |
| `obligation.flow.ts` | `obligation` | 2 | `t_obligation_track`, `t_obligation_complete` | inert |
| `purchaseRequisition.flow.ts` | `purchaseRequisition` | 7 | `t_pr_create`, `t_pr_submit`, `t_pr_approve`, `t_pr_reject`, `t_pr_revise`, `t_pr_source`, `t_pr_convert` | **wired** |
| `supplierDocument.flow.ts` | `supplierDocument` | 5 | `t_supplierdoc_request`, `t_supplierdoc_declare`, `t_supplierdoc_submit`, `t_supplierdoc_verify`, `t_supplierdoc_reject` | **wired** |
| `compliance.flow.ts` | `compliance` | 3 | `t_compliance_submit`, `t_compliance_verify`, `t_compliance_reject` | inert |
| `requirementResponse.flow.ts` | `requirementResponse` | 7 | `t_requirementresponse_submit`, `t_requirementresponse_acknowledge`, `t_requirementresponse_promote`, `t_requirementresponse_review`, `t_requirementresponse_accept`, `t_requirementresponse_dispute`, `t_requirementresponse_resolve` | **wired** |
| `inventoryDeclaration.flow.ts` | `inventoryDeclaration` | 2 | `t_inventorydeclaration_declare`, `t_inventorydeclaration_record` | **wired** |
| `incomingShipment.flow.ts` | `incomingShipment` | 4 | `t_incomingshipment_report`, `t_incomingshipment_ship`, `t_incomingshipment_arrive`, `t_incomingshipment_cancel` | **wired** |
| `enforcement.flow.ts` | `enforcement` | 1 | `t_enforcement_set` | **wired** |
| `role.flow.ts` | `role` | 1 | `t_role_grant` | **wired** |
| `supplierApplication.flow.ts` | `supplierApplication` | 4 | `t_application_submit`, `t_application_start_review`, `t_application_approve`, `t_application_reject` | **wired** |
| **TOTAL** | | **97** | | |

**Flow shape** (`schema.ts`, `FlowDefinition` / `TransitionDef`): each transition declares
`from[]` / `to` / `trigger` / `requiredRole` / `requiredFields[]` / `policyHooks[]` /
`sapBoundary?` / `version`. `trigger ∈ { user, system, cascade, creation }` — **`clock` is
type-level impossible** (law 0.5: clock-derived states are read-time projections, never
transitions; enforced by a compile-time `AssertNever<Extract<TransitionTrigger,'clock'>>` guard
that fails `tsc` if `clock` ever leaks in). Registration is a one-time module side-effect;
importing the transitions barrel seeds the singleton registry.

**SAP-boundary verbs (Option B) — exactly 2 today:** `t_gr_post` and `t_invoice_release_payment`
carry `sapBoundary: true`. The dispatcher returns `submitted` (not `done`) for these; the real
system reference is minted only on `settle` (see C5, SAP boundary).

---

## Axis 3 — the 14 wired CommandTargets

A `CommandTarget` is the per-entity adapter the dispatcher reads/writes through. **14 exist**, the
runtime export `WIRED_COMMAND_TARGETS` (`MockCommandService.ts` `TARGETS`):

- **wired:** `purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`, `purchaseRequisition`, `supplierDocument`, `requirementResponse`, `inventoryDeclaration`, `incomingShipment`, `enforcement`, `role`, `supplierApplication`

The interface is **7 members** (`dispatcher.ts`, `CommandTarget`):

```ts
interface CommandTarget {
  readState(entityId: string): string | null;         // current state, or null if absent
  readScopeOwner(entityId: string): string | null;    // owning supplierId, or null
  readEntity(entityId: string): unknown;              // full entity for policy hooks
  applyTransition(entityId, toState, payload): void;  // the store mutation
  creationOwner?(payload): string | null;             // creation scope from payload's parent
  requireCreationOwner?: boolean;                     // refuse an owner-less creation
  create?(payload, toState): { entityId: string };    // mint new entity, return assigned id
}
```

The first four serve non-creation transitions (entity exists). The last three serve `creation`
transitions — scope is derived from the payload's **parent** (`creationOwner`, e.g.
`poReference → PO.supplierId`) and `create` mints the entity + returns its store-assigned id
(canonical creation pattern: ASN drafted against its own PO).

⚠️ **`readScopeOwner` returning `null` means "NO SUPPLIER MAY ACT ON THIS", not "nothing to
compare"** (§86). The dispatcher's supplier arm compares `owner !== scope.supplierId`
unconditionally; a target that wants a supplier to reach a verb must NAME that supplier.

### Wiring census (20 flows → 3 states)

- **14 behavior-wired** — have a `CommandTarget`, dispatch runs against in-memory stores. Named
  above.
- **2 rolled-up sub-flows** — authored, participate via terminal rollup (`grRollup.ts` /
  `invoiceRollup.ts`), **no standalone target**: `goodsReceiptLine`, `invoiceMatch`.
- **4 inert** — registry data only: **no CommandTarget**: `shipment`, `contract`, `obligation`,
  `compliance`. Contract-complete, NOT behavior-complete (FORK-2 hybrid — each machine's
  `CommandTarget` + verb wiring rides its Stage-2 surface). ⚠️ **`compliance` is READ-complete and
  WRITE-inert**: `BuyerCompliance` reads through the seam, and `t_compliance_submit` / `_verify` /
  `_reject` can never fire. It wires against the real cert registry post Track-R harvest, which
  flips its LivenessRegistry tier SIMULATED → LIVE.

**The target-less set is a SET DIFFERENCE, never a list:** `getKnownFlows()` ∖
`WIRED_COMMAND_TARGETS`. It has gone stale in both directions before — written as four when it
was seven, then silently wrong again when `supplierDocument` was wired — which is why the pin
derives it rather than reading the bullet above.

---

## The dispatcher pipeline (single validator/executor)

One dispatcher for every command (`dispatcher.ts`). It validates in order, then applies + emits:

1. **Transition exists** in the registry, and the entity has a `CommandTarget`.
2. **`QueryScope` on every command exactly as reads** — a supplier can only command its own
   entity, else `DataError('SCOPE_DENIED')`; a non-existent OR foreign entity both resolve to
   `SCOPE_DENIED` for a supplier (no existence leak); a missing entity for the buyer is
   `NOT_FOUND` (DR-6 amended). Creation derives the owner from the payload's parent.
3. **`requiredRole ∈` the scope's roles** — resolved from the seat's `businessRoles` (§64); there
   is no persona fallback, and a command scope without `businessRoles` is refused.
4. **State precondition (1c)** — when `CommandInput.expectedState` is supplied it must equal the
   entity's current state, else `STALE_STATE`. Optional: omitted, nothing changes. It sits AFTER
   the role gate (a caller without the atom learns nothing about the document) and BEFORE
   legality (a stale caller is told *why*, not merely that the act is illegal).
5. **Transition legality** — `currentState ∈ transition.from` (creation skips: empty `from`).
6. **`requiredFields`** present & non-empty in the payload.
7. **`policyHooks`** (resolved by registered name — never closures) all pass.

Then it applies the store mutation and **emits ONE event** (C3). `sapBoundary` transitions
resolve `submitted` and settle later. **Hard authorization failures throw `DataError`** (same
channel as reads); **domain rejections resolve `status: 'failed'`** with a machine-readable
reason and a `failed` event — every outcome is auditable. The module is framework-agnostic:
roles, targets, hooks, sink, id/clock are **injected**, so the mock and the Phase-F1 real adapter
share it unchanged.

**Command types** (`types.ts`): `CommandInput` (`transitionId` / `entity` / `entityId?` /
`payload?` / `expectedState?` / `decision?`), `CommandResult` (`correlationId` / `transitionId` /
`status` / `reason?` / `entityId?`), `CommandStatus` (`correlationId` / `transitionId` / `status`
/ `ts`), `CommandOutcome = 'done' | 'submitted' | 'failed'`.

⚠️ **`expectedState` is a STATE precondition, not a REVISION precondition.** It is blind to
content staleness — a payload revised under you while the state held — and blind by construction
to `statePreserving` verbs, which leave the state where it was. Both blind sets are derived and
pinned in `staleState.test.ts`; neither is restated here.

**Cascades** are post-apply, best-effort fan-outs (a denied/illegal cascade never breaks the
source command), running under an `automation` grant. See C3 for how a cascade groups under the
source command via `causationId`.

---

## What the pin cannot see

`c1MethodSurface.contract.test.ts` compares **names, counts and membership**, derived from the AST
and the flow registry against this document's tables. Stated plainly, in the same form 1c's
header states its blindness, so that no reader mistakes a green floor for a correct contract:

| Class | Caught? | Why |
|---|---|---|
| a method added to / removed from a sub-service | **YES** | both directions, per sub-service |
| a sub-service added, removed or renamed | **YES** | composition block and table, both directions |
| a method moved between sub-services | **YES** | the sets are per-interface, not flattened |
| a transition added, removed or renamed | **YES** | derived from `getKnownFlows()` |
| a flow wired or unwired | **YES** | derived from `WIRED_COMMAND_TARGETS` |
| a `CommandTarget` member added or removed | **YES** | AST, methods **and** properties |
| **a SIGNATURE that changed shape** | **NO** | parameters and return types are not rendered on this page, so there is nothing to compare against. A method that keeps its name and changes its arguments is invisible here. |
| **a method present in both and wrong in BEHAVIOUR** | **NO** | the pin reads shape, never conduct. `getKpis` returning the wrong tenant's rows passes every assertion below. |
| **every prose claim on this page** | **NO** | the return contract, the scoping sentence, the pipeline narrative, the `Status` lines and this table itself are not mechanically checkable. C9 makes the same admission and it is the honest one: pretending prose is checkable would be its own dishonesty. |
| **whether the counterparty implements any of it** | **NO** | this is our shape, not their conformance. |

**If you are checking an implementation against this page, you have checked the shape. You have
not yet checked the behaviour.**
