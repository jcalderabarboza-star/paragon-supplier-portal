# DESIGN 1 · The Planning Grid — a complete, Excel-grade planning surface on best practice

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · DRAFT FOR OPERATOR RULING · READ-ONLY session (nothing written in the repo).**
**Pinned tree:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa` (merge of PR #376), read from the reviewer's `git archive` export. Every file:line below is against that tree.
**What this document is:** the design the operator asked for on 2026-09-28 — *"There is NO planner spreadsheet to copy. Design the COMPLETE Excel-grade grid on best practice. The procurement team adapts to the tool's best practices and controls, not the other way round."* It is the first of the two drafts the operator's additional rulings apply to; the second is `DESIGN_2_SUPPLIER_COLLABORATION.md`. It builds on `R0_SUMMARY.md`, `R1_INTAKE_PLANGRID.md` (findings F1–F14) and the evidence companions `_q1_code.md` / `_q1_grid_market.md`, all read first as ruled.
**What it is not:** a register entry. Every section names a surface, a write path, a contract touch or a test — nothing here is complete when it is merely written down.

> ⚠️ **A NOTE ON PROVENANCE, BECAUSE THE DISPATCH THAT NAMED "BOTH DRAFTS" NEVER ARRIVED.** Only the *"ADDITIONAL OPERATOR RULINGS (28 Sep 2026) — apply to both drafts"* reached this seat; the primary dispatch that named the two drafts did not (measured: no session transcript on this machine holds it). The two drafts were therefore read off the rulings themselves — they name R1 (the grid) and R2 (supplier collaboration), the grid's column registry, the supplier list and AG Grid licences — as the design drafts for those two lanes. **If the primary dispatch named something else, these two documents are still the R1 and R2 designs and the operator should say what the third thing was.**

---

## 0 · The one-page version

1. **The object is a set of planning FACTS, not a widget.** One fact = one *measure* for one *material × time bucket* (× *supplier*, when the measure is supplier-grained). Facts are read through the service seam from four producers that already own them — **SOMO** (demand, policy annotations), **SAP** (open orders, releases, receipts), **the supplier** (confirmations, stock on hand, incoming shipments — all BUILT today) and **the planner** (two authored measures, and only two). The portal computes nothing SOMO owns; every portal-derived figure is a client-computed value marked as such (C6 §5, §8.1).
2. **The grid is a pivot of those facts**, time-phased the way every mature planning grid is: **rows = material (with supplier child rows), columns = time buckets, measures as sub-rows**, plus attribute columns pinned left and horizon aggregates pinned right. A flat *material × bucket* layout is the same data with a different column registry view, one click away.
3. **A column registry and a measure registry are the product.** Every column and every measure is a typed, frozen registry entry — id, label EN/ID, source, derived or authored, unit, editable or not, the verb an edit dispatches, default visibility, grouping/aggregation rule, filter type, format, honesty marker, availability condition. Bucket columns are *generated* from the horizon, never enumerated. Adding a measure or a column is one registry entry plus its producer; no page changes.
4. **Every edit is a REQUEST to the command dispatcher** (`readOnlyEdit` on the engine, so the grid *cannot* write). Two measures are editable: **accepted quantity** (commits by `t_pr_create`, reason-gated, exactly as C6-LOCK stands) and **supplier allocation** (commits into a forecast-publication draft — the seam Design 2 builds). Unpushed edits are a PLANNED overlay in a `seamRef`-keyed map — never in the query cache, never in browser storage (C6 §1). Pasted Excel data lands in that overlay under an **EXTERNAL** marker (Stage G gate 5-iv), never as seam data.
5. **Triage becomes durable and idempotent** through an `intakeLine` machine (`Pending → Dismissed → Pending`, `Pending → Committed`), where commit *is* the push, carries the decision, and mints the requisition with `idempotencyKey = intakeLineId`. The requisition stops forgetting where it came from (intake id, bucket, reason, decision on the document, not only on the event). R1 F2, F3, F5 close together.
6. **Per-user layouts are VIEW state, not PLAN state**, and are persisted per seat under `paragon.gridLayout.*` with the honest-read pattern `customRoles.ts` already ships. C6's ban on browser persistence is a ban on *plan* state; the design states the separation rather than leaving it to be inferred.
7. **Engine: AG Grid Enterprise, two developer licences**, assigned by the Lead Engineer to the two front-end developers who will write grid code. This re-rules FORK-G1 (DSG, 2026-07-14) on three of the four upgrade triggers the scorecard itself named as FIRM, plus the accessibility gap the review measured (0 ARIA roles in the installed engine).
8. **Nine batches**, each a PR with a write path, an i18n pass, a gate and browser QA; the contract touches come first because two of them (bucket vocabulary, material code) are the reason the two "SOMO" producers never meet today.

---

## 1 · Purpose, users, non-goals

**Who it is for.** The planner (`planning` lane) working daily across hundreds of materials, dozens of suppliers, weekly buckets for packaging and monthly buckets for raw materials — the two grains the RFP itself fixes (Appendix 1, p.9: *"monthly for raw materials and weekly for packaging materials"*). The requisitioner (`requisitioner` lane) commits intake lines. Procurement reads it. The supplier never sees this surface; the supplier's grid is Design 2 §3, built on the same registry.

**What it replaces.** The incumbent artefacts the RFP describes: a formula-heavy workbook that is *"heavy at loading and still facing some errors and not updated real time"* (p.10) and the manually compiled master spreadsheet on p.13 that the coverage matrix names as *"the real artifact being replaced"*. **Neither is copied.** The operator ruled that the team adapts to the tool's controls; the design is on best practice (SAP IBP / Kinaxis / o9-class planning grids) constrained by this platform's honesty doctrine.

**Non-goals, stated so they are not re-derived:**
- The portal does **not** compute demand, reorder point, safety stock or coverage projection. SOMO owns all four (operator ruling in code: *"SOMO owns the reorder point … this portal holds none of the three"*, `BuyerInventory.tsx:730-745`; C8 §1.2; the call-off triple point). Those measures appear in the registry with `source: 'SOMO'` and are **unavailable until the feed carries them** — an unavailable measure is not rendered as a number, ever.
- No formula cells (FORK-G1 *formulas OUT* stands regardless of engine, scorecard §6.3).
- No desktop Excel add-in (Stage G plan §1).
- No supplier-master data entry. The supplier list is loaded by the SE Team with the procurement team; this design **reads** a supplier master (§2.5) and never writes one.
- No solver / optimiser (Stage A).

---

## 2 · The object model

### 2.1 Vocabulary the design adopts (all of it already in the tree, one side of each fork)

| Term | Adopted from | Why this side |
|---|---|---|
| `materialCode` (S/4 code, OPAQUE) + `MATERIAL_MASTER` as the ONE master | C8 / C9; `sdc/types.ts`, `sdc/materialMaster.ts` | The operator ruled `MATERIAL_MASTER` authoritative and `D-OPS-MASTERMISS` refuses unresolvable codes outright. C7's `material` display string is the side that does not join. |
| `Uom` closed union, inherited from the material, never a payload field | C8 invariant #2 | A unit is not a label; a defaulted unit poisons arithmetic (`materialMaster.ts` header). |
| `periodBucket` (bucket-native, never a resolved date) + `horizon: readonly BucketId[]` | C8 GG-3′ (CLOSED, pinned) | C7 GG-3 mis-stores the bucket into `requiredDate` and renders "—" or a fabricated day (R1 F5, measured). |
| `Provenance = { source, liveness, planState }` per fact | SDC-0 | The two-axis honesty marker C6 requires per cell. |
| `PlanDraftRow` = `{ seamRef, plannedFields, planState: PLANNED\|PUSHING\|FAILED, failureReason? }` | C6 §2 (frozen) | The overlay shape is already a contract. |
| `CommandDecision` (`field`, `from`, `to`, `reason`, `wasAdjusted`) | C6-LOCK §8.3, `planGridModel.ts` | The audit carrier for an override. |

### 2.2 `BucketId` — the one new vocabulary item, and it closes a fork rather than opening one

```ts
/** A planning bucket. Monthly 'YYYY-MM' (raw materials) or ISO-week 'YYYY-Www' (packaging).
 *  Never a date. Quarter buckets are NOT admitted: '2026-Q3' exists only in the C7 fixture
 *  and renders '—' today; the intake seam parses through the same function and refuses it. */
export type BucketGrain = 'month' | 'week';
export type BucketId = string; // branded at parse: parseBucket(s): BucketOutcome
export type BucketOutcome =
  | { ok: true; id: BucketId; grain: BucketGrain; startUtc: string; endUtc: string }
  | { ok: false; reason: 'UNPARSEABLE_BUCKET' | 'MIXED_GRAIN_IN_HORIZON'; raw: string };
```

`consolidation.ts` already parses `YYYY-MM` in `bucketEndMs`; the week form is new and is where the PM lane's weekly cadence lives. **A horizon holds one grain** (mixed grains are refused at parse — the telescoping monthly-after-weekly view is two horizons side by side, not one). Bucket boundaries are computed at read from the id; nothing stores a date difference (law 0.5, C11 V9).

**Contract touch:** C7 GG-3 closes on C8's side — `PrIntakeLine.period` becomes `periodBucket: BucketId`, and `t_pr_create` stops writing it into `requiredDate` (§5.2). C8 GG-8 (horizon depth) gets a *registry default*, not a contract number: 12 monthly buckets for RM, 16 weekly buckets for PM, both trimmable per view — and the ask to SOMO stands (*"confirm SOMO can emit one plan at both grains"*).

### 2.3 `PlanningFact` — the long-form record every measure is stored as

```ts
export interface PlanningFact {
  readonly materialCode: string;
  /** null for material-grain measures (demand, ROP); set for supplier-grain ones (confirmed, SOH). */
  readonly supplierId: string | null;
  readonly periodBucket: BucketId;
  readonly measureId: MeasureId;
  /** null = the producer answered "no figure" — rendered as an em dash, never 0 (the RFQ.estimatedValue rule). */
  readonly value: number | null;
  /** Always the material's canonicalUom (invariant #2). Carried so a fact is self-describing at export. */
  readonly uom: Uom;
  readonly provenance: Provenance;
  /** Producer's own version stamp: SOMO planVersion · SAP document ref · supplier response id · intake line id. */
  readonly sourceRef: string;
}
```

Why long form and not a wide row: a wide `{ demand, confirmed, soh, … }` row is a list that decays each time a measure is added (`FLOOR-IN-PROSE-01`'s shape in a DTO). Long form makes "add a measure" a registry entry and a producer, with **no** change to the read seam, the store, the grid or the export. It is also what a key-figure planning grid natively pivots.

### 2.4 The read seam — `IPlanningService`

```ts
export interface IPlanningService {
  /** Facts for one view's horizon and measure set. Buyer-gated; a supplier scope receives only its own supplier-grain facts (Design 2 §3). */
  getPlanningFacts(scope: QueryScope, q: { horizon: readonly BucketId[]; measures: readonly MeasureId[]; materialCodes?: readonly string[] }): Promise<Page<PlanningFact>>;
  /** Intake lines with their machine state (replaces getPrIntake's frozen fixture). */
  getIntakeLines(scope: QueryScope): Promise<Page<IntakeLine>>;
}
```

The mock implementation **derives** facts from the stores that already exist — `FORECAST_PUBLICATIONS` / the Design 2 publication store (demand, class, allocation), `requirementResponseStore` (confirmed), `inventoryDeclarationStore` (SOH), `incomingShipmentStore` (incoming), the delivery-agreement stores (released), `purchaseOrder` / `goodsReceipt` stores (open PO, received) and the new `intakeLineStore` (suggested, accepted) — plus a **generated SOMO fixture** (§9) behind the liveness registry. `httpDataService` implements the same interface at F1 with no page change (the D3 promise, kept because the pages consume the interface, not the fixture — the exact defect R1 F8 measured on `PlanGrid` today).

### 2.5 The supplier master — read, never written

Assumed read shape, and the only fields this design consumes: `supplierId`, `name`, `supplierType` (`manufacturer | distributor`, per material via `SupplierMaterialRelationship`), `principals` (distributor lead time, for the RM lane), the preferred channel, and the lanes the supplier's seats hold. The list is loaded by the SE Team with the procurement team; the identity crosswalk (portal id ↔ SAP vendor ↔ SOMO code, MTX §7.5) is an SE Team deliverable and is **named as a dependency, not designed here**. `mockSuppliers.ts` (fictional, `.example` domains) is the stand-in until then.

---

## 3 · The measure registry — what a bucket cell can show

A *measure* is what a time-bucket cell holds for one row. Each entry carries the same governance fields as a column (§4); the table gives the initial set. **Sources:** SOMO · SAP · SUPPLIER · PLANNER · PORTAL (derived). **Grain:** M = material × bucket, S = supplier × material × bucket. **Avail.** = availability condition from the liveness registry today (LIVE / SIM = simulated fixture / SPEC = no producer yet; a SPEC measure is hidden by default and never renders a number).

| # | `measureId` | Label EN · ID | Source · grain | Derived / authored | Unit | Editable → verb | Aggregation (over buckets · over rows) | Default visible | Avail. today |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `demand` | Demand · Permintaan | SOMO · M | authored (`MaterialPeriodTotal.totalQty`) | material UoM | no | sum · sum (same UoM) | yes | SIM (publication fixture) |
| 2 | `suggestedQty` | Suggested qty · Kuantitas disarankan | SOMO / INTERNAL_GRID · M | authored (C7) | material UoM | no | sum · sum | yes | SIM |
| 3 | `acceptedQty` | Accepted qty · Kuantitas diterima | PLANNER · M | authored | material UoM | **yes → `t_intake_commit` (cascades `t_pr_create`)**; reason required when ≠ baseline (C6-LOCK) | sum · sum | yes | LIVE store (new) |
| 4 | `allocation` | Allocation · Alokasi | PLANNER · S | authored | material UoM | **yes → `t_publication_allocate`** (Design 2 §2); Σ over suppliers ≤ `demand` (integrity #4) | sum · sum | yes (supplier rows) | new (Design 2) |
| 5 | `confirmed` | Confirmed · Terkonfirmasi | SUPPLIER · S | authored (latest submitted `forecastConfirmation.confirmedQty`) | material UoM | no | sum · sum | yes | LIVE store |
| 6 | `confirmedDeficit` | Shortfall vs demand · Kekurangan | PORTAL · S | **derived** = `allocation − confirmed` (exists: `consolidation.ts` `deficitQty`) | material UoM | no | sum · sum | yes | derived |
| 7 | `supplierSoh` | Supplier stock on hand · Stok pemasok | SUPPLIER · S (as-of, not bucketed: rendered in the current bucket only) | authored | material UoM | no | none · sum | yes | LIVE store |
| 8 | `incoming` | Incoming shipments · Pengiriman masuk | SUPPLIER · S (by ETA bucket) | authored (Booked + Shipped) | material UoM | no | sum · sum | yes | LIVE store |
| 9 | `openPo` | Open PO qty · Kuantitas PO terbuka | SAP · S (by delivery bucket) | authored (S/4 fact) | material UoM | no | sum · sum | yes | SIM (PO fixture) |
| 10 | `released` | Released call-offs · Rilis terjadwal | SAP (portal carries) · S (by release bucket) | authored (`ScheduleLine.plannedQty`, state Released) | material UoM | no | sum · sum | yes | LIVE store |
| 11 | `received` | Goods received · Barang diterima | SAP · S | authored (GR posted) | material UoM | no | sum · sum | no | SIM |
| 12 | `coverageRatio` | Supplier coverage Σ · Cakupan pemasok Σ | PORTAL · S | **derived, MODELED** (`supplierCoverageEntries`, exists) — rendered with the ModelMarker Σ, never the observed grammar | ratio | no | none · none | yes | derived |
| 13 | `rop` | Reorder point · Titik pemesanan ulang | SOMO · M | authored | material UoM | no | last · none | no | **SPEC** (SOMO does not emit it yet) |
| 14 | `safetyStock` | Safety stock · Stok pengaman | SOMO · M | authored | material UoM | no | last · none | no | **SPEC** |
| 15 | `projectedStock` | Projected stock (SOMO) · Proyeksi stok (SOMO) | SOMO · M | authored (SOMO's projection, never ours) | material UoM | no | last · none | no | **SPEC** |

Three rules the registry enforces by test, not by comment:
- **No PORTAL-derived measure may be editable**, and none may render without its marker (C6 §5 *"no client-minted derived value is ever presented as platform truth"*; C6-LOCK §8.1). A bilateral test asserts `derived ⇒ !editable` and `derived ⇒ marker` over the whole registry.
- **Exactly one PLANNER measure is editable per row kind** — `acceptedQty` on a material row, `allocation` on a supplier row — which is C6 §6's `computed-columns-locked` invariant (*"the governed surface exposes exactly one editable field per row"*) restated for two row kinds. A test derives the editable set from the registry and pins it to those two.
- **A SPEC measure is hidden by default and renders no number** even if a user shows it: the cell shows the liveness pill, not a figure. Availability is read from the liveness registry at render (`liveness()`), never stored on the registry entry.

---

## 4 · The column registry — the specification the operator asked for

### 4.1 The entry shape

```ts
export type ColumnKind = 'attribute' | 'bucket' | 'aggregate';
export type ColumnSource = 'SOMO' | 'SAP' | 'SUPPLIER' | 'PLANNER' | 'PORTAL' | 'PARAGON_MASTER';
export type ColumnUnit = 'materialUom' | 'IDR' | 'days' | 'pct' | 'ratio' | 'count' | 'text' | 'bucket' | 'chip' | 'none';
export type AggregationRule = 'sum' | 'min' | 'max' | 'first' | 'last' | 'count' | 'none';

export interface EditSpec {
  /** The transition an edit REQUESTS. The grid never writes; it dispatches. */
  readonly verb: TransitionId;
  /** The atom the seat must hold; the notice names the owning role when it does not (HandoffNotice). */
  readonly atom: TransitionRole;
  /** The payload field the new value lands in. */
  readonly payloadField: string;
  /** When a reason is required before the edit may commit (C6-LOCK §8.3). */
  readonly reasonRequiredWhen?: 'differsFromBaseline';
  /** The measure/column the baseline is read from for the override test. */
  readonly baseline?: MeasureId | ColumnId;
}

export interface ColumnSpec {
  readonly id: ColumnId;                       // stable; the colId AG Grid keys column state on
  readonly kind: ColumnKind;
  readonly labelKey: string;                   // i18n key; EN and ID live in src/lib/i18n/planGrid.ts, never here
  readonly source: ColumnSource;
  readonly derivation: 'authored' | 'derived';
  readonly derivedBy?: string;                 // the pure function's name when derived (auditable; tested)
  readonly unit: ColumnUnit;
  readonly editable: false | EditSpec;
  readonly defaultVisible: boolean;
  readonly defaultPinned?: 'left' | 'right';
  readonly defaultWidth: number;
  readonly groupable: boolean;                 // may be a row-group key
  readonly aggregation: AggregationRule;       // group-total and grand-total rows
  readonly filter: 'set' | 'number' | 'text' | 'date' | 'none';
  readonly format: 'qty' | 'idr' | 'pct' | 'ratio' | 'days' | 'bucket' | 'text' | 'chip' | 'pill';
  readonly honesty: 'liveness' | 'planState' | 'model' | 'none'; // which marker the cell carries
  /** The measure a BUCKET column renders; bucket columns are generated per horizon bucket. */
  readonly measure?: MeasureId;
  /** Availability condition: a liveness-registry capability key. Absent = always. */
  readonly availableWhen?: CapabilityKey;
}
```

Two structural properties, both tested:
- **Labels live in the i18n fragments, never in the registry** — `moduleScopeLiteralGate` would fire on a registry literal consumed by `.map()`, and it is right to. The registry carries keys; `planGrid.ts` (EN) and its ID twin carry text; the existing locale-parity instrument covers them.
- **Bucket columns are generated**: `bucketColumns(horizon, measure)` returns one `ColumnSpec` per bucket with `id = \`b:${measureId}:${bucketId}\``. Nothing enumerates buckets; the horizon is a view parameter.

### 4.2 The initial attribute and aggregate columns

| `id` | Label EN · ID | Source | Der. | Unit | Editable | Vis. | Pin | Group | Agg. | Filter | Format |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `materialCode` | Material code · Kode material | PARAGON_MASTER | authored | text | no | yes | left | yes | none | text | `<Data>` mono |
| `materialLabel` | Description · Deskripsi | PARAGON_MASTER | authored | text | no | yes | left | no | none | text | text |
| `materialType` | Type (RM/PM) · Jenis (RM/PM) | PARAGON_MASTER | authored (`ROH`/`VERP`) | chip | no | yes | — | yes | none | set | chip |
| `materialGroup` | Material group · Grup material | PARAGON_MASTER | authored | text | no | no | — | yes | none | set | text |
| `uom` | Unit · Satuan | PARAGON_MASTER | authored (`canonicalUom`) | text | no | yes | left | yes | none | set | text |
| `segment` | Segment (ABC-XYZ) · Segmen | SOMO | authored | chip | no | yes | — | yes | none | set | chip |
| `suggestedSource` | Source lane · Jalur sumber | SOMO | authored | text | no | no | — | yes | none | set | text |
| `supplierId` / `supplierName` | Supplier · Pemasok | PARAGON_MASTER (supplier master read) | authored | text | no | yes (supplier rows) | left | yes | none | set | text |
| `supplierType` | Supplier type · Jenis pemasok | PARAGON_MASTER | authored (`SupplierMaterialRelationship`) | chip | no | no | — | yes | none | set | chip |
| `principalLeadTimeDays` | Principal lead time · Waktu tunggu prinsipal | PARAGON_MASTER | authored | days | no | no | — | no | max | number | days |
| `commitmentClass` | Commitment class · Kelas komitmen | PORTAL (projected from SOMO `lockState`/`approvalState`; **projection UNRATIFIED, C8 §2.2**) | derived | chip | no | yes | — | yes | none | set | chip |
| `planState` | Plan state · Status rencana | PORTAL | derived (overlay present ⇒ PLANNED) | pill | no | yes | — | yes | none | set | pill |
| `responseState` | Supplier response · Respons pemasok | PORTAL | derived (`LineResponseState.kind`, exists) | pill | no | yes | — | yes | count | set | pill |
| `intakeState` | Intake · Asupan | PORTAL | derived (`IntakeLine.state`) | pill | no | yes | — | yes | count | set | pill |
| `deficitReason` | Why (SOMO) · Alasan (SOMO) | SOMO | authored (C7 `deficit`) | text | no | no | — | no | none | text | text |
| `estimatedValue` | Estimated value · Nilai perkiraan | SOMO / INTERNAL_GRID | authored (**IDR assumed, nowhere declared** — C7; declared here as IDR) | IDR | no | no | — | no | sum | number | idr |
| `overrideReason` | Override reason · Alasan penyesuaian | PLANNER | authored (from the last `CommandDecision`) | text | **yes → part of `t_intake_commit` payload** (not a standalone edit) | yes | — | no | none | text | text |
| `prNumber` | Requisition · Permintaan pembelian | PORTAL | derived (`IntakeLine.prNumber`) | text | no | yes | right | no | count | text | `<Data>` mono link |
| `agg:demand` | Horizon demand · Total permintaan | PORTAL | derived (Σ `demand` over horizon) | materialUom | no | yes | right | no | sum | number | qty |
| `agg:confirmed` | Horizon confirmed · Total terkonfirmasi | PORTAL | derived | materialUom | no | yes | right | no | sum | number | qty |
| `agg:deficit` | Horizon shortfall · Total kekurangan | PORTAL | derived | materialUom | no | yes | right | no | sum | number | qty |
| `agg:firstShortBucket` | First short bucket · Periode kekurangan pertama | PORTAL | derived (first bucket where `confirmedDeficit > 0`) | bucket | no | yes | right | no | min | set | bucket |
| `agg:coverage` | Coverage Σ · Cakupan Σ | PORTAL | derived, MODELED | ratio | no | yes | right | no | none | number | ratio + Σ marker |

Every `PORTAL · derived` aggregate is a **client-computed value with a marker**; the export writes the marker into the header (§7.6). The ID labels are drafts for the locale pass, not final copy.

### 4.3 Views — a named registry projection, and the planner's saved layout on top of it

A *view* = `{ viewId, labelKey, grain, horizonLength, rowKind: 'material' | 'material+supplier', measuresShown, columnsShown, defaultGroupBy, defaultSort, defaultFilter }`. Registry-shipped views:

| `viewId` | What it is | Grain · horizon | Rows | Replaces |
|---|---|---|---|---|
| `rm-plan` | Raw-material plan | month · 12 | material + supplier | the p.10 workbook |
| `pm-plan` | Packaging plan | week · 16 | material + supplier | the p.12 files |
| `intake-review` | Pending intake lines, exception-first | view-less list (bucket as a column) | material | `/buyer/intake-review` (page retired to a view, §10 B7) |
| `exceptions` | Short · awaiting · stale · adjusted · unpublished | current grain | material + supplier | the p.13 master sheet's "track fulfilment" half |
| `consolidation` | Design 2's planner consolidation, on this component | month · 6 | supplier + material | `BuyerCollaboration`'s read-only DSG (SDC-R10) |

A user's saved layout (§6.2) is a diff over a view, never a copy of it — the same `{ parent, adds }` reasoning `customRoles.ts` gives: a snapshot silently keeps yesterday's truth when the registry gains a column.

---

## 5 · Governed edits — how a cell becomes a command

### 5.1 The mechanics, engine-agnostic first

```
cell edit / paste / fill  ─►  GridEditRequest { seamRef, measureId | columnId, oldValue, newValue, raw, origin: 'TYPED' | 'PASTE' | 'FILL' }
        │  parse: normalizeQty(raw, convention) — the ONE legal number parser (QtyOutcome; refusal → cell shows the reason + glossary chip)
        ▼
PlanDraftProvider  (seamRef-keyed map; C6 §2 shape; NOT query cache, NOT localStorage)
        │  overlay renders seamRow + plannedOverlay; banner: "N planned changes — not committed until pushed"
        │  origin PASTE/FILL ⇒ cell marker EXTERNAL until pushed (Stage G gate 5-iv)
        ▼
Push (one row · selection · all)  ─►  for each row: svc.commands.dispatch(scope, { transitionId, entity, entityId, payload, expectedState, idempotencyKey }, causationAnchor)
        │  the first dispatch mints the anchor; rows 2..n pass it as causationId (the SubmissionSession pattern, session.ts) — G0.1-FIND-01 is closed by construction
        │  refusal (thrown DataError OR status:'failed') ⇒ row stays PLANNED with failureReason (C6 §3.1, both channels)
        ▼
invalidate → seam re-read → overlay clears where the seam now agrees (C6 §3)
```

**Undo.** Before push, Ctrl+Z removes the last overlay entry (a client artefact, nothing to compensate). After push there is **no undo**: the act is on an append-only ledger, and the honest reversal is a new governed act with its own reason. The engine's undo/redo is off under `readOnlyEdit` anyway; the design does not pretend otherwise.

**Refusals render at the cell** through the existing refusal-map convention (key on the refusal head, own copy, `{{person}}` via `personLabel` — never `describeRefusal`'s trail; `personNamingRefusal.test.ts` governs).

### 5.2 Accepted quantity — the intake machine

Today: triage is `useState`, the same line is pushable three times, the override reason evaporates at the store, the bucket becomes a date (R1 F2, F3, F5, all measured). The remedy is an entity with a machine, on the tree's own idiom (`FlowDefinition`, `CommandTarget`, policy hooks):

```
intakeLine  (entityId = the intake line id, e.g. pil-somo-002)
  states:  Pending · Dismissed · Committed          initial Pending · terminals [Committed]
  t_intake_dismiss   Pending  → Dismissed   user  atom pr:create    fields [] (reason optional, stored)
  t_intake_restore   Dismissed → Pending    user  atom pr:create    fields []
  t_intake_commit    Pending  → Committed   user  atom pr:create    fields ['acceptedQty','acceptedQtyRaw']
        policy hooks: INTAKE_QTY_FLOOR (>0 finite) · INTAKE_QTY_AGREES (raw ↔ number) · INTAKE_OVERRIDE_REASONED (acceptedQty ≠ baseline ⇒ non-blank reason)
        cascade SOURCE → t_pr_create with payload built by buildPrCreatePayload(line, acceptedQty, reason)
                          + idempotencyKey = intakeLineId + decision (C6-LOCK carrier, forwarded verbatim)
        target stores: acceptedQty · reason · decision · prNumber (from the cascade result) · committedAt (sdcClock)
```

What this keeps from C6-LOCK, verbatim: **there is no adjust verb** — an adjusted quantity that is not committed is a PLANNED overlay and nothing else; **push is the only exit from PLANNED**; **accept-as-suggested carries no decision**. What it adds: the triage is a recorded fact (dismiss survives reload and is visible to a colleague), the commit is idempotent (`Committed` refuses a second commit by legality *and* the dispatcher's replay cache answers a retried key with the first result), and the requisition carries provenance.

**Contract touches (C7):** `PurchaseRequisition` gains `intakeLineId?`, `periodBucket?: BucketId`, `decision?: CommandDecision` (so the approver reads the override on the document, not only on the event — C7-FIND-02's remedy); `t_pr_create` stops writing `period` into `requiredDate`; `BuyerRequisitions` renders the bucket and the decision in the drawer. `getPrIntake` retires in favour of `getIntakeLines`.

**F4, the C6-LOCK subject — recommendation for the ruling:** the planner's baseline is the line's **`acceptedQty` as delivered by the producer**, not `suggestedQty`. A SOMO-adjusted line arrives with its own delta and no reason; that delta is SOMO's act and is *shown* ("SOMO adjusted 5,000 → 4,500", read-only), not *charged to the planner*. So Intake Review's *Accept* pushes 4,500, the drawer pre-fills 4,500 and demands no reason, and a reason is required only when the planner moves the number again. `wasAdjusted` is retired as a stored boolean (it is derivable from the two quantities and a fixture edit can make it lie — R1 §3) in favour of the derivation.

### 5.3 Allocation — the supplier split, and the seam into Design 2

`allocation` cells on supplier rows edit the fan-out of SOMO's `materialPeriodTotal` across suppliers. They commit through `t_publication_allocate` on a **Draft** forecast publication (Design 2 §2.1) — statePreserving, `planning` atom, hooks: Σ allocations over suppliers ≤ total (integrity #4), material known, bucket in horizon, class present. The grid's "Publish" action is Design 2's `t_publication_publish` and is offered only when every firm-bucket allocation carries an approver (§2.1 there). This is the join R1 §4 item 7 named as absent: the intake line and the supplier publication now key on the same `materialCode × periodBucket`.

### 5.4 Paste, fill, range — the Excel surface under governance

- **Paste** (`processDataFromClipboard`) maps TSV cells onto the *editable* measures only; a paste over a read-only column is refused cell by cell with the reason "read-only — {{source}} owns this figure"; every pasted value lands in the overlay with `origin: 'PASTE'` and the EXTERNAL marker.
- **Fill handle** (`fillOperation`) is a batch of `GridEditRequest`s with `origin: 'FILL'` — never a series the engine computes into data.
- **Range selection + Delete** proposes `null` (= "no figure") only where the measure admits it; `acceptedQty` does not (a blank is not a quantity) and the refusal says so.
- Locale: the number parser is the tree's `normalizeQty` with the seat's `NumberConvention`; a pasted `12.000` under ID is twelve thousand and under EN is refused as ambiguous — the existing rule, not a new one.

---

## 6 · Persistence — two kinds, kept apart on purpose

### 6.1 Plan state — never persisted client-side (C6 §1, unchanged)

The overlay lives in `PlanDraftProvider` for the session. A reload loses unpushed edits and the banner has said so throughout. **Durable drafts are G2's `Plan` entity** (Stage G plan §3: `Draft → Pushed → Settled/Abandoned`), persisted through a service store behind a verb (`t_plan_save`), never through browser storage — offered as batch B9 with a decision gate, because at hundreds of rows a planner will want to leave and come back, and the honest way to give them that is a governed document, not `localStorage`.

### 6.2 View state — persisted per seat, and stated as a different thing

```ts
// paragon.gridLayout.v1   { [seatKey]: { [viewId]: GridLayoutDiff } }
export interface GridLayoutDiff {
  readonly version: 1;
  readonly columnState: readonly Pick<ColumnState, 'colId' | 'hide' | 'width' | 'pinned' | 'sort' | 'sortIndex' | 'rowGroup' | 'rowGroupIndex'>[]; // only what differs from the view default
  readonly measureOrder?: readonly MeasureId[];
  readonly measuresHidden?: readonly MeasureId[];
  readonly density?: 'compact' | 'comfortable';
  readonly savedAt: string;
}
```

- **Seat key:** `personId` when the actor is `RESOLVED` (a sample person today, a real one at F1); otherwise `unattributed:<personaType>:<supplierId|buyer>`. Per-user is real the moment a person is named; the unattributed key is the honest fallback, not a pretence.
- **Honest read** on the `customRoles.ts` pattern: absent, corrupt and unparseable are distinguished from empty; every stored `colId` is re-validated against the *current* registry and unknown ids are dropped **and named** in a small notice ("2 saved columns no longer exist and were removed from your layout").
- **Reset to view default** is a first-class control. A saved diff is applied with `api.applyColumnState({ state, applyOrder: true })` after the registry default; unknown attributes stay unchanged (the API's own rule).
- **At F1** the same `ILayoutPrefsSource { load, save }` is implemented by a user-preferences endpoint; the key derivation moves server-side with the identity.
- **Why this does not breach C6:** C6 §1 bans *plan* state in browser storage because a planned value that survives outside the seam is a second source of truth. A column width is not a truth about a material. The design records the distinction in the store's header and asks that C6 gain one sentence saying so (contract touch, B0), so the next reader does not have to re-derive it.

---

## 7 · The Excel-grade surface — what "complete" means, as a checklist the batches close

| Capability | Design | Engine mechanism | Closes |
|---|---|---|---|
| Time-phased layout | rows material (+supplier), bucket columns, measure sub-rows; flat view one click away | row grouping by material; measure rows as group children; `pivot` OFF (data is pre-pivoted by the model) | F1 |
| Freeze panes | key columns pinned left (`materialCode`, `materialLabel`, `uom`, `supplierName`), aggregates right; header sticky | `pinned` | F7 |
| Sort / multi-sort | any attribute or aggregate; Shift-click | `sortable`, `multiSortKey` | F7 |
| Filter | set filters on chips/attributes, number filters on aggregates, quick text search, saved filter per view | Set Filter (Enterprise), `quickFilterText` | F7 |
| Exception-first | `exceptions` view + one-click "exceptions only" toggle on every view; sorts by `agg:firstShortBucket` then `agg:deficit` | filter model + sort | F7 |
| Grouping / subtotals / grand total | by material group, segment, supplier, class; totals only where `aggregation ≠ none` and UoM is uniform (mixed-UoM group total renders "—" with a reason) | `groupTotalRow`, `grandTotalRow`, `aggFunc` from the registry | F7 |
| Variance highlighting | `confirmedDeficit > 0` amber/red by % of demand; `acceptedQty ≠ baseline` PLANNED tint; stale-against-current striped | `cellClassRules` fed by the registry; DP-2 warning split (`warning.DEFAULT` fills, `warning.hover` text) | F7 |
| Bulk edit | multi-row select → "set accepted = suggested", "push selected", "dismiss selected"; paste and fill (§5.4) | Cell Selection, Clipboard, Fill Handle (Enterprise) | F1, F7 |
| Keyboard census | arrows · Tab/Shift+Tab · Enter (commit, move down) · F2 · Esc · Home/End · Ctrl+arrows · Space (select row) · Ctrl+C/V · Ctrl+Z (overlay) · Ctrl+A in range | native; verified in the browser and pinned in a keyboard spec | F7, F14 |
| Column resize / reorder / show-hide | drag; column chooser panel; saved per seat (§6.2) | Columns Tool Panel | F7 |
| Totals bar | status bar: selected sum/avg/count in the row's UoM (mixed ⇒ count only) | Status Bar (Enterprise) | F7 |
| Export | CSV and XLSX of the current view (visible columns, applied filter, group rows); header carries liveness + Σ markers; SIMULATED data exports with the word SIMULATED in the sheet title | CSV/Excel Export (Enterprise) | F7; the dead Export pattern gets its first real primitive |
| Full screen | keep `FullScreenSection` (ruled precedent) | — | — |
| Density | compact (28 px rows) default for planners; comfortable toggle | row height | — |
| EN / ID | all chrome via i18n fragments; engine strings via `getLocaleText` → i18next (`id-ID` exists in AG Grid source; **verify it ships in the package before B3 closes** — `_q1_grid_market.md` §0.2) | `getLocaleText` | F9 |
| Accessibility | `role="grid"` / `treegrid`, focus ring, screen-reader row/col counts; axe run in browser QA | engine ARIA | F14 |
| Honesty | per-cell liveness pill on hover + column-header marker; PLANNED tint; EXTERNAL marker; Σ on modelled values; SIMULATED banner while the SOMO feed is a fixture | `cellClassRules` + header components | C6 §5 |

**Not designed, deliberately:** formula cells, the desktop add-in, pivot-table mode (the data arrives pre-pivoted from the model; enabling engine pivot would put a computation in the engine that the doctrine keeps in pure TS), and mobile layout (the RFP asks for responsive access for *suppliers*; the planner grid is a desktop instrument and says so).

---

## 8 · Engine, licence, and the ruling this design re-opens

**FORK-G1 as it stands:** ruled *react-datasheet-grid, formulas OUT, no licence* on 2026-07-14 (`g0-2-engine-scorecard.md:182`), with a **FIRM** upgrade path to AG Grid Enterprise on four triggers (§6.3): outgrowing client-side virtualisation, grouping/pivot/aggregation, heavy concurrent editing, enterprise support. **This design meets triggers 2 and 3 on its first view and 1 at RFP scale**, and adds a fifth ground the scorecard did not weigh: the installed engine ships **zero ARIA roles** (measured, `_q1_grid_market.md` §0) against an RFP that demands RBAC, audit and a daily-use instrument for named users.

**Ruled by the operator on 2026-09-28:** AG Grid licences, two front-end developers. Recorded here as **FORK-G1′**, with these consequences the Stage G register must carry (R1 F11 already had it stale the other way):
- **Licence.** AG Grid Enterprise, USD 999 per developer, perpetual with one year of updates (vendor page, fetched 2026-09-28). The pricing page does **not** define who counts as a developer; the EULA does. **Action for the Lead Engineer before B3:** confirm in the EULA that the two licences cover the two front-end developers who will edit grid code, and that reviewers, QA and the Lead Engineer's own reading of code do not require a third. Anyone else who *writes* grid code needs a licence; this design names the file boundary (`src/pages-v2/plan-grid/engine/**`) so "writes grid code" is checkable in a PR.
- **Key handling.** The licence key is embedded at build via a non-`VITE_`-prefixed env read at build time, in the vendor's documented manner; it is not a secret and is not treated as one, but it does not live in the repository.
- **Bundle.** Module registry with cherry-picked modules only (Cell Selection, Clipboard, Fill Handle, Row Grouping, Set Filter, Status Bar, Columns Tool Panel, CSV/Excel Export, Locale) — the 377 kB whole-bundle figure is the ceiling, not the plan; B3 measures the pruned size and records it.
- **`readOnlyEdit` is the dispatcher's shape made structural:** the grid *cannot* mutate row data; paste and fill route through `cellEditRequest`; a forgotten handler is a no-op, not a silent write. A mutation probe in B5 asserts that row data is byte-identical before and after an edit sequence with the handler removed.
- **What stays on DSG:** `BulkStockEntryGrid` (supplier SOH batches) until Design 2 §3 lands its confirmation grid on the new component; then `react-datasheet-grid` leaves `package.json`.
- **If the operator reverses this:** the honest fallback is DSG with model-layer sort/filter/totals and the accessibility gap filed OPEN — not TanStack, which is an engine to write (`_q1_grid_market.md` §6).

---

## 9 · Volume — measured, not premised

R1 F6: nothing above four intake rows has ever rendered on `main`; the 2,500-row spike (`G1_3_1_2500_Row_Spike_Findings_2026-07-15.md`) proved DSG virtualisation, not this design. B1 ships a **generated fixture** behind the liveness registry: 1,200 materials (the material master's RM/PM taxonomy extended synthetically, every code resolvable — `D-OPS-MASTERMISS` makes an unresolvable code a refusal), 40 suppliers, 12 monthly + 16 weekly buckets, the built measures populated from the generator with SIMULATED provenance. Mind `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`: the generator is seeded and its instruments pin **named members**, not counts.

B8 measures in the browser, both locales, and records: first paint of `rm-plan` at 1,200 materials (target under the RFP's 3 s P95); scroll re-virtualisation (rows mounted vs logical); pivot/model time per view change; paste of 500 cells to overlay; push of 200 rows under one causation anchor; memory after 10 view switches. The server-side row model is the named next step if the first figure fails, and its trigger is the number B8 writes down.

---

## 10 · Batch plan

### Ownership after the handover ruling (28 Sep 2026)

Handover to the SE Team is on **28 Oct 2026**. Our team builds only what defines the specification; the SE Team builds everything else from this design, after handover, at its own pace.

| Owner | Batches |
|---|---|
| **OURS** | B0 contract touches · B1 registries and facts · B2 intake machine · B4 read-only grid (core views, frozen columns, sort, filter) · B5 governed edits (type/paste → planned → push) — B4 and B5 **on the engine already in the repository** (`react-datasheet-grid`) · B6 allocation |
| **SE TEAM** | B3 AG Grid install and licence (two developer licences; the Lead Engineer names them) · moving the grid onto AG Grid · all Enterprise-grade features in §7 (grouping, subtotals, totals bar, range selection, fill handle, set filters, column chooser, export, saved layouts, accessibility) · B7 retirements · B8 volume test · B9 durable plan drafts |

Consequences for the table below: B4 and B5 no longer depend on B3; §6.2's saved layouts and §7's Enterprise rows are the SE Team's to build on AG Grid, and our B4/B5 ship the registry, the views and the governed-edit seam on the installed engine so that the move is an engine swap, not a redesign.

Batch ≈ one PR of this repo's usual size: design note, write path, i18n EN/ID, tests with a mutation probe where a guard is added, floor bump, browser QA in both locales whose output reaches the strategist. `--merge`, never squash, never `--delete-branch`.

| # | Batch | Delivers | Closes | Size | Depends on |
|---|---|---|---|---|---|
| **B0** | **Contract touches** (the exemption the register rule names — these are commitments others build against) | C7: `periodBucket: BucketId`, `materialCode` on the intake line, `intakeLineId`/`periodBucket`/`decision` on `PurchaseRequisition`, idempotency contract (C7-FIND-05); C6: one sentence separating view state from plan state; C8: horizon default per grain as a registry value, GG-3′ ask to SOMO restated; Stage G register: FORK-G1′ recorded, "next" pointer corrected | F5, F11, F13 (contract half) | 1 | — |
| **B1** | Vocabulary + registries + read seam + generator | `parseBucket`, `MEASURES`, `COLUMNS`, `VIEWS` with bilateral tests (derived ⇒ !editable; exactly two editable measures; labels are keys; every bucket column generated); `IPlanningService` mock deriving facts from existing stores; generated SOMO fixture; headless | F1 (object half), F6 (fixture half) | 1.5 | B0 |
| **B2** | Intake machine | `intakeLine` flow, store, `CommandTarget`, hooks, cascade to `t_pr_create` with idempotency and decision; PR provenance rendered in `BuyerRequisitions`; `IntakeReview` and the drawer repointed to the machine; F4 ruling applied | F2, F3, F4, F5, F8 | 1.5 | B0 |
| **B3** | Engine batch | AG Grid Enterprise modules, licence via build env, theming API mapped to DP-1/2/3 tokens, `getLocaleText` → i18next with the `id-ID` pack verified, module-scope-literal and page-width guards green, floor pin; **no page change** | (enabler) | 1 | operator's licence purchase |
| **B4** | Planning Grid, read-only, on the registry | `/buyer/plan-grid` rebuilt: views `rm-plan` · `pm-plan` · `exceptions` · `intake-review`, pinning, grouping, totals, filters, quick search, status bar, export, density, full screen, per-seat layout store with honest read and reset; DSG award what-if moved aside (B7) | F1 (surface half), F7, F14 (ARIA reachable), F9 | 2 | B1 (B3 is the SE Team's; see Ownership) |
| **B5** | Governed edit seam | `readOnlyEdit` adapter → `GridEditRequest`; `PlanDraftProvider`; paste/fill with EXTERNAL marker; batch push under one causation anchor; refusals at the cell; keyboard census pinned; mutation probes (handler removed ⇒ no write; overlay never found in a seam array; both failure channels stay PLANNED) | F1 (edit half), F2 (idempotent push from the grid) | 2 | B2, B4 |
| **B6** | Allocation + publish from the grid | `allocation` measure editable → `t_publication_allocate`; Publish action → Design 2 B2; `consolidation` view on this component | F13 (join), SDC-R10 | 1.5 | B5, Design 2 B1–B2 |
| **B7** | Retirements | award what-if → `BuyerSourcing` (where `t_rfq_award` lives) or deleted per ruling; `IntakeReview` page → the `intake-review` view; eight dead `planGrid.*` keys; three stale "nothing dispatches" headers; DSG removed from `PlanGrid` | F10, F11, R1 §4 item 8 | 1 | B4–B6 |
| **B8** | Volume + accessibility + QA | the §9 measurements recorded; axe run; both locales; screenshots to `review-drafts\screens\` or the repo's QA folder per ruling | F6, F14 | 0.5 | B5 |
| **B9** *(gated)* | Durable plan draft (G2 `Plan` entity) | `plan` flow `Draft → Pushed → Settled/Abandoned`, `t_plan_save` through a service store, overlay hydrates from it; **never** browser storage | planner leaves and returns | 2 | B5, decision D4 |

Order for the critical path: **B0 → B1 → B2 → B3 → B4 → B5**, then B6 alongside Design 2, then B7–B8. B3 can start the day the licences exist and needs nothing else.

---

## 11 · Test and probe plan (what each guard must catch, both ways)

- **Registry gates (B1):** known-good — `demand` is present, `acceptedQty` is editable with verb `t_intake_commit`; known-bad — a registry mutant marking `confirmedDeficit` editable goes red by name; a measure whose `labelKey` is missing from either locale goes red (locale parity instrument, existing).
- **Overlay never merged (B5):** search every seam array for a planned value after an edit; the C6 structural test, on the real store.
- **Push idempotency (B2/B5):** commit the same intake line twice, once by retry with the same key and once by a second seat; exactly one requisition exists; the second attempt returns the first result (replay) or `ILLEGAL_TRANSITION` (Committed), and the test names which.
- **Both failure channels (B5):** a thrown `SCOPE_DENIED` and a returned `POLICY_REJECTED` both leave the row PLANNED with a reason; a mutant that swallows the thrown channel goes red.
- **`readOnlyEdit` mutation probe (B5):** remove the `cellEditRequest` handler; type, paste and fill; assert row data byte-identical (`sha256` authority, `git hash-object` beside it for the fixture file if one is touched).
- **Layout store (B4):** corrupt JSON ⇒ `unreadable`, not empty; a stored unknown `colId` is dropped and named; reset restores the view default; two seat keys do not read each other's diff.
- **Bucket parse (B1):** `2026-08` → month; `2026-W33` → week; `2026-Q3` → refused; a horizon mixing both → refused; `formatDate` is never called on a bucket (a guard over the render population).
- **Browser QA every batch** — both locales through the app's own menu, chunk hash read off the DOM, `Date.name === 'Date'` asserted before the baseline, screenshots delivered.

---

## 12 · Decisions the operator must make (recommendation first in each)

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Default layout:** time-phased (material rows × bucket columns × measure sub-rows) vs flat (material × bucket rows, measures as columns) | Time-phased default; flat as a one-click view. It is what every planning grid does and what the p.10/p.12 artefacts were approximating. |
| D2 | **C6-LOCK's subject (R1 F4):** is a producer-adjusted line an override the planner must justify? | No. Baseline = producer's `acceptedQty`; a reason is owed only for the planner's own move (§5.2). Retire the stored `wasAdjusted`. |
| D3 | **Bucket vocabulary closes on C8's side** (C7 GG-3 → `periodBucket`; quarters refused) | Yes; it is the pinned side and the only one that renders correctly. Ask SOMO for the weekly grain on PM in the same breath (GG-3′). |
| D4 | **Durable plan draft (B9)** — build the G2 `Plan` entity now or stay session-only per C6 | Build it after B5, behind a verb and a store; a planner working hundreds of rows will otherwise re-key work after every reload, and the only alternative anyone will reach for is `localStorage`, which C6 forbids for good reason. |
| D5 | **Licence holders** — which two developers, confirmed against the EULA's developer definition | The Lead Engineer names them before B3 opens; the file boundary `plan-grid/engine/**` is the checkable rule. |
| D6 | **Award what-if** (R1 §4 item 8): move to `BuyerSourcing` beside `t_rfq_award`, or delete | Move; it is a sourcing what-if wearing a planning label. |
| D7 | **`commitmentClass` projection** stays UNRATIFIED (C8 §2.2): render `lockState`/`approvalState` raw beside the class, or the class alone | Both, until procurement and finance ratify the projection; the grid must not be the place a liability class is silently decided. |
| D8 | **Intake Review as a page** — retire into the `intake-review` view, or keep the plain table | Retire; two surfaces with independent state is how F2 happened. |

---

## 13 · Traceability

| R1 finding | Where it closes |
|---|---|
| F1 no planning grid | §2 object, §3–4 registries, §7 surface; B1, B4, B5 |
| F2 triage not recorded; duplicate pushes | §5.2 intake machine; B2, B5 |
| F3 override reason evaporates | §5.2 PR provenance; B0, B2 |
| F4 two surfaces push different quantities | §5.2, D2; B2 |
| F5 bucket stored as a date | §2.2, B0, B2 |
| F6 volume never exercised | §9; B1, B8 |
| F7 no sort/filter/totals/export/undo/resize | §7; B4, B5 |
| F8 grid bypasses the seam | §2.4; B2, B4 |
| F9 engine context menu English-only | §7 EN/ID; B3 |
| F10 dead keys, stale headers | B7 |
| F11 Stage G register stale on FORK-G1 | §8, B0 |
| F12 approved PR strands | out of scope here — R3's hand-off (`t_pr_source` / `t_pr_convert`); named, not absorbed |
| F13 no intake → SDC join | §2.1, §5.3; B0, B6 |
| F14 zero ARIA | §8, §7; B3, B4, B8 |

RFP: Functional #2 (publish demand with error-proof templates — the grid is the planner's half; Design 2 the supplier's), #9 (export to Excel/CSV — §7.6, the first real export primitive), #10 (EN/ID), NFR 2 (P95 < 3 s — §9 measures it), NFR 4 (RBAC/audit — every edit is a governed, attributed-or-honestly-unattributed act on the existing ledger).
