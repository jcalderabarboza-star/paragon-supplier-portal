# C2 — Schemas + DTO-v2

Entity type shapes, the list envelope (DR-5), the error contract (DR-4), and the read-projection
boundary (G1) where clock-derived values are computed — never stored.

Source of truth: `src/services/data/types.ts` (canonical types + re-exports),
`src/services/data/invoiceProjection.ts` (the live read-projection exemplar), and the entity
homes in `src/data/mock*.ts` (re-exported through `types.ts`).

---

## The envelope — `Page<T>` (DR-5) · **shape LIVE / pagination RESERVED**

Every list-returning read returns `Page<T>`, not a bare `T[]`, so all list surfaces are shaped
for pagination from day one and pages migrate once.

```ts
interface Page<T> {
  items: T[];
  cursor?: string | null;   // RESERVED — mock leaves null
  total?: number;           // RESERVED — mock leaves undefined
}
```

**PARTIAL truth (do not round to LIVE):** the **shape is frozen** and universally returned; the
**pagination machinery is deferred**. The mock returns everything in `items`, `cursor` null, no
`total`. The Phase-F1 real adapter fills `cursor` / `total` — additive, no shape change, no page
change (`types.ts:149–160`).

---

## The error contract — `DataError` (DR-4) · **LIVE**

The single failure channel for the data layer. Reads throw it; consumers render the error state
via the wrapper hook (TanStack Query `isError`). The real adapter maps HTTP/SAP failures onto the
same code set.

```ts
type DataErrorCode = 'NOT_FOUND' | 'SCOPE_DENIED' | 'UPSTREAM' | 'CHAOS' | 'UNKNOWN';

class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;
}
```

`CHAOS` is emitted only by the dev-only, env-gated chaos mock (`withChaos.ts`). `SCOPE_DENIED` /
`NOT_FOUND` are also thrown by the command dispatcher for hard authorization failures — commands
share the reads' failure channel (`types.ts:120–147`).

---

## Identity scope — `QueryScope` · **LIVE**

Derived from `CurrentIdentity` at the page boundary; first argument to all 54 methods.

```ts
interface QueryScope {
  personaType: 'buyer' | 'supplier';
  supplierId: string | null;
}
```

Scoping is enforced **client-side today** (greenfield backend). The 3-tenant service scoping
contract (`scoping.contract.test.ts`) guards buyer-superset / per-supplier-isolation /
`SCOPE_DENIED` in-floor (`types.ts:113–118`).

---

## Entity shapes — harvested homes

All shapes are harvestable from code; none are invented. Two homes:

**Defined in `types.ts`:**

- **Purchase order** — `PurchaseOrder`, `POLineItem`, `POSummary`; enums `POStatus` (7 states),
  `ChannelType`. Drift-resolved canonical names locked (`totalValue`, `status`, `orderDate`;
  `deliveryDate` dropped).
- **Invoice (DR-7)** — `Invoice` is the ONE canonical economic document (one store row).
  `SupplierInvoice` / `BuyerInvoice` are **persona projections** of it (see below).
  `InvoiceStatus` (8 canonical states incl. the Option-B interim `Releasing Payment`);
  `SupplierInvoiceStatus` / `BuyerInvoiceStatus` are projection *labels* (+ computed `Overdue`),
  never independently stored; `InvoiceMatchStatus` (5) is the match sub-flow's rolled-up terminal.
- **ASN** — `ASN`, `AsnLineItem`, `AsnShipmentDetails`; `AsnStatus` (5).
- **Supplier document** — `SupplierDocument`; `SupplierDocumentStatus` (5),
  `SupplierDocumentCategory` (6).
- **Purchase requisition** — `PurchaseRequisition`; `PRStatus` (6), `PRPriority`.
- **Scorecard / KPI / analytics / engagement / risk / discovery** — `SupplierScorecard`,
  `KpiSnapshot` / `KpiPoint` (carries numeric `targetPct`, the DP2-TARGET-01 tick),
  `AnalyticsSummary`, `EngagementSummary`, `RiskAlert` / `GeoRisk` / `ExposureRow` / `Scenario`,
  `GlobalSupplier` / `RecommendedSupplier`, and their supporting rows.
- **Filter inputs** — `POFilter`, `InvoiceFilter`, `RFQFilter`, `GRFilter`, `ContractFilter`,
  `ObligationFilter`, `PRFilter`, etc. (lean; expanded as pages migrate).

**Imported from `src/data/mock*.ts` (canonical home) and re-exported through `types.ts:45–111`
— reference by home, do not re-declare:**

| Entity | Home |
|---|---|
| `Shipment`, `ShipmentLineItem`, `ShipmentStatus`, `ShipmentMode` | `src/data/mockShipments` |
| `GoodsReceipt`, `GRStatus`, `Disposition`, `CheckResult`, `OptionalCheck`, `InspectionResult` | `src/data/mockGoodsReceipts` |
| `Contract`, `ContractType`, `ContractStatus` | `src/data/mockContracts` |
| `ContractObligation`, `ObligationStatus`, `ObligationCategory`, `ObligationOwner`, `ObligationRecurrence` | `src/data/mockObligations` |
| `RFQ`, `RFQStatus`, `RFQCategory` | `src/data/mockRfqs` |
| `Quotation`, `QuotationStatus` | `src/data/mockQuotations` |

---

## The read-projection boundary (G1) — where clock-values live · **LIVE (exemplar)**

**Law 0.5 (DR-8, computed-never-stored):** clock-derived states
(`Expiring` / `Expired` / `Overdue` / `Upcoming` / …) are **computed at read time from dates**.
They are never stored, never commanded, and never appear in a transition table.

**The canonical LIVE implementation is `invoiceProjection.ts`** — the pattern the DTO-v2 harvest
generalizes. The invoice is ONE canonical `Invoice`; each persona surface reads a **projection**:

- `toSupplierLabel(inv, nowIso)` / `toBuyerLabel(inv, nowIso)` map the canonical `InvoiceStatus`
  to persona labels.
- `isOverdue(inv, nowIso)` / `daysOutstanding(inv, nowIso)` compute the clock-derived `Overdue`
  / aging **here, at read time** — pure functions of `(invoice, now)`, with `now` **injected** so
  the projection is deterministic and testable (no clock read inside pure code).
- Because both surfaces derive from one source, they **cannot contradict** — the DR-7 payoff that
  retired the two hand-maintained fixtures (closes `INV-XPERSONA-FIXTURE-01` /
  `HALAL-XPERSONA-01` class).

The Option-B interim `Releasing Payment` reads as `Approved` to the supplier — **no "paid" claim
before settlement** (honest-by-construction, law 0.6).

### The counter-example — F0.4-FIND-01 (OPEN)

Not every surface is on this pattern yet. The F0.4 fixtures **store clock-projected status as
literals**, contradicting law 0.5:

- `mockObligations` stores `Upcoming` / `Overdue`
- `mockContracts` stores `Expiring` / `Expired` (and `Renewed`)
- `SupplierDocument` fixtures store `Expiring Soon` / `Expired`

The F0.4 **flows** are honest — their `states` deliberately **exclude** these projected values,
so the state machines never encode a clock state. But the **read layer** still renders the stored
literals rather than deriving them. This is pre-existing debt (predates F0.4; the flows do not
touch fixtures). **Home:** the DTO-v2 read layer — derive these from the entity's date fields vs
the reference clock and drop the stored literal to the honest event-state, the same computed job
as `ComplianceRegistryEntry` (R2.2 / Stage-2 I3).

---

## DTO-v2 forward note

DTO-v2 is the **read-projection generalization** of the `invoiceProjection` pattern to every
entity that carries a clock-derived display state. It is the home for:

- **F0.4-FIND-01** — obligation / contract / supplier-document clock projections.
- **The ONE canonical compliance machine** (census #11–15 — the 5 fragmented compliance
  vocabularies collapsed) — rides the `ComplianceRegistryEntry` DTO-v2 at **R2.2**. This machine
  is **not** among the 13 shipped flows; `BuyerCompliance` stays a registered fixture carve-out
  (`COMPLIANCE-CARVEOUT-01`) until Stage-2 I3 re-points it. See README open-findings.

DTO-v2 itself is **RESERVED / SPEC** (the projection pattern is LIVE for invoice; the entity-wide
DTO-v2 harvest is a Stage-2 build target). Do not read it as shipped for non-invoice entities.
