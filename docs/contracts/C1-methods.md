# C1 — Method Surface

Three distinct axes. **54** (service surface) · **69** (transition catalog) · **6** (wired
targets). They measure different things; this file keeps them separate.

Source of truth: `src/services/data/types.ts` (service + command types),
`src/services/transitions/` (schema, dispatcher, flows).

---

## Axis 1 — the 54-method service surface (`IDataService`)

The single interface the Phase-F1 real adapter implements; pages call it through
`useDataService()` and do not change when the mock is swapped for `httpDataService`. Every method
takes `QueryScope` as its first argument (the scoping contract — a supplier only ever sees its
own data; the buyer sees the superset). Confirmed **54** two independent ways: manual enumeration
and a `\w+(scope` signature grep over `types.ts` (exactly 54 matches).

`IDataService` is six read sub-services + one command sub-service + one top-level method:

```ts
interface IDataService {
  suppliers:   ISupplierService;      // 3 methods
  procurement: IProcurementService;   // 22 methods
  risk:        IRiskService;          // 6 methods
  discovery:   IDiscoveryService;     // 5 methods
  analytics:   IAnalyticsService;     // 7 methods
  engagement:  IEngagementService;    // 7 methods
  commands:    ICommandService;       // 3 methods (write seam)
  getCapabilities(scope: QueryScope): Promise<CapabilitySet>;  // 1 method
}
```

| Sub-service | Count | Methods |
|---|---|---|
| `ISupplierService` | 3 | `list`, `getById`, `getCurrent` |
| `IProcurementService` | 22 | `getPurchaseOrders`, `getPurchaseOrder`, `getInventory`, `getRFQs`, `getQuotations`, `getShipments`, `getASNs`, `getGoodsReceipts`, `getBuyerInvoices`, `getSupplierInvoices`, `getContracts`, `getObligations`, `getDocuments`, `getStorefrontCatalog`, `getStorefrontCerts`, `getStorefrontProducts`, `getKpis`, `getPerformanceTrend`, `getSupplierScorecards`, `getRequisitions`, `getProductionLines`, `getSupplierHealth` |
| `IRiskService` | 6 | `getRiskAlerts`, `getGeoRisks`, `getExposure`, `getScenarios`, `getCompliance`, `getCommodities` |
| `IDiscoveryService` | 5 | `getGlobalSuppliers`, `getRecommended`, `getQualifications`, `getMarketIntel`, `getSingleSourceItems` |
| `IAnalyticsService` | 7 | `getSummary`, `getSpendByCategory`, `getTopSuppliers`, `getOtifTrend`, `getPoVolumeTrend`, `getChannelMix`, `getSupplierPerformance` |
| `IEngagementService` | 7 | `getSummary`, `getConversations`, `getConversationThread`, `getAutomationRules`, `getDailyMessages`, `getRuleRates`, `getResponseTimes` |
| **read subtotal** | **50** | |
| `ICommandService` | 3 | `dispatch`, `getCommandStatus`, `settle` |
| top-level | 1 | `getCapabilities` |
| **TOTAL** | **54** | |

**Return contract:** list reads return `Page<T>` (DR-5 — see C2); single reads return `T | null`;
`getSummary` returns a summary object or `null` (buyer-populated, supplier-null). Failure is
signalled by **throwing** `DataError` (DR-4 — see C2), matching TanStack Query's `queryFn`-throws
model. Command methods report outcome as a status, not a throw, except hard authorization
failures (`NOT_FOUND` / `SCOPE_DENIED`) which throw `DataError` on the same channel as reads.

**Status:** **LIVE** (mock-backed: `mockDataService.ts` wires the six mock services +
`MockCommandService` + `capabilitiesFor`). The real adapter is **RESERVED** (`httpDataService`,
C5).

---

## Axis 2 — the 69-transition catalog (13 flows)

Every authored state-machine edge across the registered flows (`id: 't_<entity>_<verb>'`).
Grep-counted over `src/services/transitions/flows/*.ts`. This is the *verb* surface — how many
transitions the schema defines — and is **not** the service-method count.

| Flow file | Entity | Transitions | Wiring |
|---|---|---|---|
| `purchaseOrder.flow.ts` | `purchaseOrder` | 7 (`issue`, `view`, `acknowledge`, `confirm`, `partial_deliver`, `deliver`, `close`) | **wired** |
| `advanceShipNotice.flow.ts` | `advanceShipNotice` | 5 (`create`, `submit`, `in_transit`, `deliver`, `discrepancy`) | **wired** |
| `goodsReceipt.flow.ts` | `goodsReceipt` | 7 (`create`, `start_inspection`, `hold`, `approve`, `partial_approve`, `reject`, `post`) | **wired** |
| `goodsReceiptLine.flow.ts` | `goodsReceiptLine` | 5 (`inspect`, `accept`, `reject`, `quarantine`, `return`) | sub-flow (rollup) |
| `invoice.flow.ts` | `invoice` | 8 (`create`, `submit`, `match`, `approve`, `release_payment`, `remit`, `dispute`, `resolve`) | **wired** |
| `invoiceMatch.flow.ts` | `invoiceMatch` | 4 (`await_gr`, `matched`, `qty_variance`, `price_variance`) | sub-flow (rollup) |
| `rfq.flow.ts` | `rfq` | 5 (`publish`, `close`, `award`, `cancel`, `reopen`) | **wired** |
| `quotation.flow.ts` | `quotation` | 4 (`submit`, `review`, `award`, `reject`) | **wired** |
| `shipment.flow.ts` | `shipment` | 8 (`create`, `asn_received`, `depart`, `arrive_port`, `customs`, `dock`, `unload`, `deliver`) | inert (F0.4) |
| `contract.flow.ts` | `contract` | 4 (`draft`, `activate`, `renew`, `terminate`) | inert (F0.4) |
| `obligation.flow.ts` | `obligation` | 2 (`track`, `complete`) | inert (F0.4) |
| `purchaseRequisition.flow.ts` | `purchaseRequisition` | 6 (`create`, `submit`, `approve`, `reject`, `source`, `convert`) | inert (F0.4) |
| `supplierDocument.flow.ts` | `supplierDocument` | 4 (`request`, `submit`, `verify`, `reject`) | inert (F0.4) |
| **TOTAL** | | **69** | |

**Flow shape** (`schema.ts`, `FlowDefinition` / `TransitionDef`): each transition declares
`from[]` / `to` / `trigger` / `requiredRole` / `requiredFields[]` / `policyHooks[]` /
`sapBoundary?` / `version`. `trigger ∈ { user, system, cascade, creation }` — **`clock` is
type-level impossible** (law 0.5: clock-derived states are read-time projections, never
transitions; enforced by a compile-time `AssertNever<Extract<TransitionTrigger,'clock'>>` guard
that fails `tsc` if `clock` ever leaks in). Registration is a one-time module side-effect
(`index.ts:52–67`); importing the transitions barrel seeds the singleton registry.

**SAP-boundary verbs (Option B) — exactly 2 today:** `t_gr_post` and `t_invoice_release_payment`
carry `sapBoundary: true`. The dispatcher returns `submitted` (not `done`) for these; the real
system reference is minted only on `settle` (see C5, SAP boundary).

---

## Axis 3 — the 6 wired CommandTargets

A `CommandTarget` is the per-entity adapter the dispatcher reads/writes through. **6 exist**
(`MockCommandService.ts` `TARGETS`): `purchaseOrder`, `advanceShipNotice`, `goodsReceipt`,
`invoice`, `rfq`, `quotation`. The interface is **6 members** (`dispatcher.ts:45–63`):

```ts
interface CommandTarget {
  readState(entityId: string): string | null;         // current state, or null if absent
  readScopeOwner(entityId: string): string | null;    // owning supplierId, or null (buyer-only)
  readEntity(entityId: string): unknown;              // full entity for policy hooks
  applyTransition(entityId, toState, payload): void;   // the store mutation
  creationOwner?(payload): string | null;             // creation scope from payload's parent
  create?(payload, toState): { entityId: string };     // mint new entity, return assigned id
}
```

The first four serve non-creation transitions (entity exists). The last two serve `creation`
transitions — scope is derived from the payload's **parent** (`creationOwner`, e.g.
`poReference → PO.supplierId`) and `create` mints the entity + returns its store-assigned id
(canonical creation pattern: ASN drafted against its own PO).

### Wiring census (13 flows → 3 states)

- **6 behavior-wired** — have a `CommandTarget`, dispatch runs against in-memory stores:
  `purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`.
- **2 rolled-up sub-flows** (census G2) — authored, participate via terminal rollup
  (`grRollup.ts` / `invoiceRollup.ts`), **no standalone target**: `goodsReceiptLine`,
  `invoiceMatch`.
- **5 inert F0.4** — registry data only: **no CommandTarget, no cascade link**, roles mapped for
  catalog-coverage only (DNA-SEED-01 contract surface, no UI consumer): `shipment`, `contract`,
  `obligation`, `purchaseRequisition`, `supplierDocument`. Phase 2′ exit is **contract-complete,
  NOT behavior-complete** (FORK-2 hybrid — each machine's `CommandTarget` + verb wiring rides its
  Stage-2 surface).

---

## The dispatcher pipeline (single validator/executor)

One dispatcher for every command (`dispatcher.ts`). It validates in order, then applies + emits:

1. **Transition exists** in the registry, and the entity has a `CommandTarget`.
2. **`QueryScope` on every command exactly as reads** — a supplier can only command its own
   entity, else `DataError('SCOPE_DENIED')`; a non-existent OR foreign entity both resolve to
   `SCOPE_DENIED` for a supplier (no existence leak); a missing entity for the buyer is
   `NOT_FOUND` (DR-6 amended). Creation derives the owner from the payload's parent.
3. **`requiredRole ∈` the scope's roles** (persona→role map, `roles.ts`, Step 3.7).
4. **Transition legality** — `currentState ∈ transition.from` (creation skips: empty `from`).
5. **`requiredFields`** present & non-empty in the payload.
6. **`policyHooks`** (resolved by registered name — never closures) all pass.

Then it applies the store mutation and **emits ONE event** (C3). `sapBoundary` transitions
resolve `submitted` and settle later. **Hard authorization failures throw `DataError`** (same
channel as reads); **domain rejections resolve `status: 'failed'`** with a machine-readable
reason and a `failed` event — every outcome is auditable. The module is framework-agnostic:
roles, targets, hooks, sink, id/clock are **injected**, so the mock and the Phase-F1 real adapter
share it unchanged.

**Command types** (`types.ts`): `CommandInput` (`transitionId` / `entity` / `entityId?` /
`payload?`), `CommandResult` (`correlationId` / `transitionId` / `status` / `reason?` /
`entityId?`), `CommandStatus`, `CommandOutcome = 'done' | 'submitted' | 'failed'`.

**Cascades (census G4)** are post-apply, best-effort fan-outs (a denied/illegal cascade never
breaks the source command). Three are wired: GR-post → invoice-match, GR-reject/partial-approve →
ASN-discrepancy, RFQ-award → quotation award/reject fan-out. See C3 for how a cascade groups
under the source command via `causationId`.
