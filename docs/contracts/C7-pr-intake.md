# C7 — Purchase-Requisition intake

THE shared intake seam serving **two producers** of Purchase Requisitions, designed once:
1. the internal planning **Grid** (Stage G / G1 — a pushed planned PR row), and
2. external **SOMO** accepted-requirement events (via the F2 Event Mesh boundary).

This is the enterprise integration point where **planning meets procurement execution**.
Frozen as CONTRACT ahead of G1 — so G1 builds the Grid against it, and SOMO conforms its
`order_creation` emission to it, rather than either side inventing its own intake.

**Status:** CONTRACT · **corrected 2026-08-03 against code-truth at `main` #157 (`063adca`)**
· originally authored at `main` #67 (FORK-3, machine-harvest + thin prose) · additive, docs-only.

**The intake is BUILT and dispatches today.** The prior status line on this document read *"No
product code — the intake dispatch, the Grid, and the SOMO wire are all downstream"*. That was
true at #67 and is **false now**: a wired `CommandTarget` (`MockCommandService.ts:547-593`,
registered `:983`), a mutable store (`stores/purchaseRequisitionStore.ts`), a read seam
(`types.ts:1194`), a liveness capability (`registry.ts:51`) and two consuming surfaces
(`IntakeReview.tsx`, `PlanGrid.tsx`) have all landed since. The SOMO wire remains SPEC (§5).

**Grounding (real sources):**
- the shipped PR machine — `src/services/transitions/flows/purchaseRequisition.flow.ts` (cited `file:line`);
- C6 planning doctrine — `docs/contracts/C6-planning.md` (the two-axis honesty model C7 reuses);
- the IBP seat's seam answers — `docs/IBP_SupplyPlan_to_Procurement_Seam_2026-07-14.md` ("Seam");
- the IBP seat's contract reply — `docs/IBP_SupplyPlan_Procurement_Seam_Reply_2026-07-14.md` ("Reply"),
  whose **§1 table is the published Suggestion-Order seam shape C7 conforms to.**

The in-repo PR machine is cited `file:line`; the SOMO grain is cited by **doc § + field** from
the two IBP documents above (the external producer's published contract).

---

## Correction record (2026-08-03) — read this before the contract

A CP-1 code-truth audit found **eleven divergences between this document and the shipped code.
Every one of them ran the same direction: the document understated the implementation.** Eleven
errors sharing a direction are not eleven drafting mistakes; they are one process gap with a
systematic cause, and naming the cause is more useful to you than the itemisation that follows.

**The cause.** This contract was generated ONCE, by machine-harvest from code-truth at a fixed
commit (#67), and then **never re-harvested** while the code it describes kept moving. The
harvest had no re-run trigger, and nothing in the build fails when a contract statement stops
being true — the documents are not on the floor, so they cannot regress a test. A document
generated from an implementation and then frozen while the implementation continues can only
drift one way: **toward understating what exists.** That is exactly the signature observed.
The asymmetry is the diagnostic — a random drafting error is as likely to overstate as
understate, and none of these overstated.

**Why it matters to a peer platform.** A conformance conversation held against this document
would have misreported our own position *in SOMO's favour*: further along on wiring, further
behind on ratification, than the document said. A peer building to an understated contract
builds to a seam that has already moved.

**The correction.** The itemisation is below. Where the code and this document disagreed, the
**code is truth and this document is corrected** — except where the divergence is a real defect
(D-6, D-8), which is recorded as a defect and NOT documented as intended behaviour.

| # | Divergence (doc said → code does) | Fixed in |
|---|---|---|
| D-1 | Status line: *"No product code"* → the intake dispatches (`MockCommandService.ts:547-593,983`) | Status, above |
| D-2 | **C7-FIND-01 OPEN** → **CLOSED** in code; the PR `CommandTarget` is wired (`MockCommandService.ts:538`, `:983`) | §3, §7 |
| D-3 | **C7-FIND-01a OPEN** → **CLOSED, and resolved DIFFERENTLY than this doc prescribed**: the doc specified a `null` backing → SIMULATED. Code backs it **structurally** to the wired entity (`registry.ts:78`) and holds it SIMULATED via **gate-2 harvest gating** instead. Stronger honesty: unwire-to-honest is structural. | §3, §4, §7 |
| D-6 | `wasAdjusted` documented as **stored** (§2.1) → **never read by `create`**; nor is `suggestedQty` (`MockCommandService.ts:547-593`) | §2.1 — **DEFECT** |
| D-7 | Field named `sourceDestinationLane` → code field is **`suggestedSource`** (`types.ts:640`) | §2 |
| D-8 | §2 lists `bomContext?`, `decisionMetadata`, `liveness`, `shortfall` on the intake line → **none exist** on `PrIntakeLine` (`types.ts:636-653`). §2.2 promised `shortfall` was *"reserved so the shape does not change"* — it was **not reserved**. | §2, §2.2 — **DEFECT** |
| D-9 | Five payload keys the code reads that **no doc states**: `category`, `requestor`, `costCenter`, `justification`, `priority` — the last **silently defaulting to `'Medium'`** (`MockCommandService.ts:565-566, 571, 579-580, 587`) | §3.1 (new) |
| D-10 | `contracts/README.md:62` wired-target count **6** → **10** (`MockCommandService.ts:976-987`); README prose additionally lists `purchaseRequisition` among *"the 6 inert machines"* | `README.md` |
| D-12 | Seam findings lived only inside contract docs, never in the findings register | `docs/findings.md` |

D-4, D-5 and D-11 are C8 items — corrected in [C8](./C8-forecast-publication.md).

---

## Amendment 1 (2026-09-28) — the planning bucket, the override's subject, and the requisition's origin

**Four operator rulings, ratified 2026-09-28, ahead of the Planning Grid lane (Design 1 §10 row
B0). Each is stated with what it changes, and with WHY — a rule whose reason does not travel with
it gets re-derived wrongly.**

⚠️ **AND THE DIRECTION OF THIS AMENDMENT IS THE OPPOSITE OF THE CORRECTION RECORD ABOVE.** Those
eleven divergences all ran one way — the document understating the code — and were fixed by
believing the code. **Three of the four rulings below run the other way: the contract now states a
position the code does NOT yet hold.** That is legitimate and it is not the same thing as drift, on
the precedent this package already set and pins: *"Contract is authority, the code lags until its
booked batch"* (C8-FIND-03, asserted in `ledgerTruth.test.ts`). It is only legitimate while the
batch is NAMED, so each ruling below names its batch, and a ruling whose batch has landed must move
to the register as CLOSED rather than sit here reading as pending.

### A1-R1 · A bucket is a MONTH or an ISO WEEK, never a date. Quarters are refused. GG-3 closes on C8's side.

**The ruling.** A planning bucket is `'YYYY-MM'` (monthly — raw materials) or `'YYYY-Www'`
(ISO-weekly — packaging). **Quarters are refused.** A horizon holds **one grain**; the telescoping
view (weeks near, months far) is two horizons side by side, never one array holding both.

**What it changes on this seam.** `PrIntakeLine.period: string` becomes
**`periodBucket: BucketId`**, and `t_pr_create` **stops writing it into `requiredDate`**. GG-3 is
therefore resolved **on C8's side** (bucket-native), not C7's — see C8 GG-3′, which was already
CLOSED there, and which this document was resolving the OPPOSITE way.

**Why, and the evidence is measured rather than argued.** `requiredDate: str('requiredDate') ||
str('period')` (`MockCommandService.ts`) puts a bucket in a date-named, date-typed field. On the
surface: a pushed `'2026-Q3'` line renders an **em dash** on the requisitions page, and a
`'2026-08'` line renders **`01 Aug 2026`** — a day nobody entered. A missing figure and a
fabricated one, and **the fabricated one is worse, because it reads as an answer.** A required date
is a commitment to a day; a bucket is a grain; one field cannot be both, and the reader is what
lost.

**Why quarters are refused rather than parsed.** A month and an ISO week are grains a producer can
commit against. A quarter is a reporting period wearing a planning grain's clothes, and it is
precisely the form that renders as nothing today. When this amendment was written, `'2026-Q3'` sat
on **two of the four rows** of `prIntake.ts`. The refusal is what NAMED those rows to re-express; an
unparsed free string named nothing for a year, which is how two formats came to coexist in one
fixture (§2.3) with nothing to notice.

⚠️ **AND THOSE TWO ROWS ARE NOW FIXED — AMENDED 2026-09-28, THE SAME DAY, BY A SECOND OPERATOR
RULING.** This paragraph is corrected rather than left to read as pending: **no row in the product
tree carries the refused form any longer.** `pil-somo-001` is a raw material and became the MONTH
`'2026-09'`; `pil-grid-002` is packaging and became the ISO WEEK `'2026-W36'`. **The grain follows
the lane**, which means the fixture now exercises BOTH grains — something no single-grain corpus
could do, and the reason the weekly form is reachable by a surface at all. Asserted, not claimed:
`prIntakeBuckets.test.ts` runs every row through `parseBucket` and pins those two rows by their
PARSED GRAIN, with the quarter refusal as the known-bad control in the same run.

⚠️ **THE CONSEQUENCE FOR THE NEXT READER, BECAUSE IT INVERTS WHERE THE RISK NOW LIES.** The quarter
form now survives in the tree **only inside `bucket.test.ts`**, as that parser's known-bad input. So
the hazard is no longer *"a refused value is sitting in a fixture"* — it is that a later edit tidying
the fixture to one grain would delete the tree's only week-shaped bucket, and the row-level loop
would still pass on four months. That is what the named grain pins are for.

**As built at A1 — and what deliberately is NOT.** The vocabulary and the ONE function both seams
parse through are shipped: `BucketId` / `BucketGrain` / `parseBucket` / `parseHorizon` in
`bucket.ts`, pinned bilaterally in `bucket.test.ts`. **`PrIntakeLine` is UNCHANGED**, and that is a
decision rather than an omission: renaming a REQUIRED field touches the fixture, the payload
builder, both surfaces and their specs, so it is behaviour and it belongs in B2 as ONE atomic
change. Adding `periodBucket?` beside `period` was rejected — two fields meaning one thing is a
second source of truth, which is the defect this seam already has in `requiredDate`.

⚠️ **THE HORIZON DEPTH IS A REGISTRY VALUE AND IS DELIBERATELY NOT WRITTEN IN THIS DOCUMENT**
(ruling A1-R7, recorded in full at C8 GG-8). Derive it from `DEFAULT_HORIZON_BUCKETS`
(`bucket.ts`). A depth in contract prose is wrong the first time the plan changes and nothing fails
when it is — `FLOOR-IN-PROSE-01`, and C8 GG-8 is already carrying a stale `6` in a code comment for
exactly that reason.

### A1-R2 · C6-LOCK's subject — a producer-adjusted line is NOT a planner override

**The ruling.** The planner's baseline is the intake line's **`acceptedQty` as delivered by the
producer**, not `suggestedQty`. A reason is owed **only for the planner's own change**. The stored
`wasAdjusted` boolean is **retired in favour of a derivation**.

**Recorded in full at C6 §8.3**, which is where C6-LOCK lives; repeated here only because this
seam's field table carries `wasAdjusted` and its §2.1 calls it the audit signal.

**Why it lands on C7 at all.** `wasAdjusted` is a STORED field on `PrIntakeLine` (`types.ts`) whose
value a fixture author writes by hand beside the two quantities that determine it. ⚠️ **AND THE
HONEST STATEMENT IS THAT NO ROW LIES TODAY** — derived across all four rows of `prIntake.ts`,
`wasAdjusted === (acceptedQty !== suggestedQty)` holds in every one. The defect is not a present
falsehood; it is that **nothing checks**, so the first row that disagrees with its own quantities
will disagree silently, and the field that reads as the audit signal is the one carrying the lie.
A value derived at read cannot disagree with the pair it is derived from.

**Batch:** the **R2 behaviour batch** — which is *not* B2's `intakeLine` machine, and the distinction
is worth keeping because it decides what can ship first. Removing the stored field and moving the
baseline touches `planGridModel`, the adjust drawer, the intake-review model and `PlanGrid`'s
`wasAdjusted` column; **none of it needs the machine**, so it is separable and does not wait on B2.

⚠️ **AND A SECOND RULING THE SAME DAY EXTENDED THIS TO THE AUDIT CARRIER — A1-R2a, RECORDED AT C6
§8.3 Amendment 1a.** `CommandDecision.wasAdjusted` is **derived at dispatch** and **never authored**:
it leaves the payload entirely, so no caller can assert it onto an append-only ledger. That reverses
C6's previously recorded position that the carrier was out of scope, and it rides the same batch.

### A1-R3 · The requisition carries its origin — on the DOCUMENT, not only on the event

**The ruling.** `PurchaseRequisition` gains `intakeLineId?`, `periodBucket?` and
`decision?: CommandDecision`. **One intake line creates at most one PR**, and the idempotency key
**is the intake line id**.

**As built at A1:** the three fields are on the DTO (`types.ts`), optional, written by nothing yet
and read by nothing yet, with B2 named at the site as the batch that does both.

**Why this is not a duplicate of the DR-10 audit, which is the objection it has to answer.** Audit
and provenance are different jobs. The event answers *what happened, in order, to whom*, and is
append-only. The document answers *what am I looking at* to the one person whose decision depends
on it — the approver, on the row in front of them. **No surface in this tree renders a
`TransitionEvent`.** So the flow C6-LOCK calls "audited" recorded nothing an approver could read,
while the drawer genuinely refused to dispatch without a reason: **a full enforcement chain
terminating in a reader who cannot see the result.** That is C7-FIND-02's real shape, and it is the
same class as `revisionNote`'s (§68: a verb required it, `applyTransition` dropped it, no field
existed to disappoint).

**Why the key is the intake line id and not a minted one.** C7-FIND-05 records that the F2 Event
Mesh is at-least-once and this intake has no dedupe key, so **a redelivered SOMO event mints a
duplicate PR**. A key the producer already owns needs no coordination; a key we mint has to be
carried back to the producer to be useful, and a key derived from the payload's contents changes
when a planner legitimately edits the quantity. The intake line id is stable across exactly the
retries that must collapse.

⚠️ **AND THE DUPLICATE IS ALREADY REACHABLE WITHOUT THE WIRE, WHICH IS THE PART TO TAKE FROM THIS.**
Measured on the surface: Accept → reload → the row is PLANNED again with the PR still in the store.
**Three Draft requisitions for one requirement is one click away today**, with no Event Mesh
involved. C7-FIND-05's framing as an F2 precondition understates it.

**Batch:** B2 wires the cascade, the key and the render.

### A1-R4 · One sentence separating VIEW state from PLAN state

Recorded at **C6 §1**, where the browser-storage ban lives. Named here so a reader of this seam does
not re-derive it: **C6's ban on browser persistence covers PLAN state only.** A saved column width
is not a truth about a material.

---

## 0. Seam scope — RM/PM requirements only (the boundary)

**What crosses this seam is the already-exploded RM/PM (raw-material / packaging-material)
leaf — nothing above it.** The Portal is RM/PM-focused procurement execution. **SOMO owns the
BOM and finished-goods planning; the BOM explosion runs on SOMO's side** — the RM/PM
requirements only exist to cross the seam *after* SOMO's BOM explosion (Seam §3: `rm_pm_requirements`
is "when we do BOM explosion (our Phase 4), the raw/packaging-material requirements land in your
procurement domain").

- **BOM context is upstream provenance we CONSUME, not reconcile.** A line may carry which
  finished-good / BOM node it descends from as read-only context; the Portal never re-explodes,
  re-nets, or validates the BOM. Ownership stays SOMO's (Seam §2: SOMO "reads … BOM truth *from*
  S/4"; §4: SOMO's planning master data "annotates", does not conflict).
- **Do NOT build BOM explosion into this platform.** Out of scope, this seam and permanently.
- **I6 linkage lives on SOMO's side.** This connects to our I6 (BOM-linked sourcing): the
  BOM→RM/PM linkage a sourcing decision references is SOMO-authored context we read, not a graph
  we own. C7 conforms to the RM/PM leaf; it does not import the tree.

---

## Tier vocabulary — reused from C6, not re-invented

C7 uses the same two-axis honesty model C6 froze. It **invents no new vocabulary.**

| Axis | Values | Authority |
|---|---|---|
| **Contract tier** (this package) | LIVE / RESERVED / SPEC | README legend |
| **Source tier** (per line, runtime) | LIVE / SIMULATED / SPEC | `liveness()` — `src/services/liveness/registry.ts:137` |
| **Plan state** (per line) | committed / PLANNED | C6 §5 (`docs/contracts/C6-planning.md`) |

Seam tiers at a glance: **SOMO producer = SPEC** — Seam §0 is explicit: "every external seam is
`deferred` — 30/30 … named-but-not-wired", SOMO is "a complete, honest, scaled *rehearsal* … not
a live emitter". **F2 Event Mesh boundary = RESERVED** (Stage-F). **PR machine = WIRED** — a live
`CommandTarget` the dispatcher writes through (`MockCommandService.ts:547-593`, registered `:983`);
`t_pr_create` genuinely mints a Draft PR into a mutable store (§1, §3). **PR capability renders
SIMULATED** — not because the machine is inert, but because **no live PRODUCER exists**: gate-1
(wiring) is LIVE, gate-2 (harvest) is shut (`registry.ts:70-78`). Wiring alone must never flip
green (LIVENESS-DATASOURCE-01).

---

## 1. The PR machine as-built (harvest)

The buyer-internal intake machine — suppliers never see PRs (`purchaseRequisition.flow.ts:2-5`;
read is buyer-only, `MockProcurementService.ts:353`). **F0.4, census #9 — authored at F0.4 and
since WIRED** (G1.1): `purchaseRequisition` is a registered `CommandTarget`
(`MockCommandService.ts:547-593`, `:983`) backed by a mutable store
(`stores/purchaseRequisitionStore.ts`). The "author-unwired / inert registry data" description
this section previously carried is **superseded** (D-2).

**States** (`:19-27`): `Draft → Pending Approval → Approved → Sourcing Event → PO Created`,
plus `Rejected` (`PRStatus`, `types.ts:559-565`).

**Transitions** (`:28-92`):

| Transition | From → To | Trigger | Role | `requiredFields` | Note |
|---|---|---|---|---|---|
| `t_pr_create` (`:30-38`) | ∅ → Draft | **creation** | `pr:create` | **`['material','quantity']`** | the intake verb (§3) |
| `t_pr_submit` (`:40-48`) | Draft → Pending Approval | user | `pr:submit` | — | |
| `t_pr_approve` (`:50-58`) | Pending Approval → Approved | user | `pr:approve` | — | |
| `t_pr_reject` (`:60-68`) | Pending Approval → Rejected | user | `pr:reject` | — | |
| `t_pr_source` (`:72-80`) | Approved → Sourcing Event | cascade | `pr:source` | — | **metadata-only** (declared, no link in `cascades.ts`) |
| `t_pr_convert` (`:83-91`) | Approved/Sourcing Event → PO Created | cascade | `pr:convert` | — | **metadata-only** |

All roles map to `buyer` (`roles.ts:37`; flow header `:9`). `t_pr_source`/`t_pr_convert`
**declare** that a raised RFQ / issued PO advances the PR, but **no cascade link is authored**
(`:70-71, :82`) — declaration, not emission.

**Entity shape** (`types.ts:569-587`):
```
PurchaseRequisition {
  id, prNumber, material, category, quantity:number, uom, requiredDate,
  estimatedValue:number, requestor, costCenter, status:PRStatus, createdDate,
  approver, sourceOfSupply, linkedDoc, priority:PRPriority, justification
}
```
Numeric `quantity` / `estimatedValue` (D-3; render layer owns formatting, `types.ts:556-557`).

**Read** is on the seam, LIVE(mock): `getRequisitions(scope, filter?): Promise<Page<PurchaseRequisition>>`
(`types.ts:1191`; impl `MockProcurementService.ts:349-354`, reads the `purchaseRequisitionStore`,
supplier scope → empty). **Creating a PR today requires `material` + `quantity` and the
`pr:create` role — and it genuinely dispatches** (§3). A pushed line is list-visible in
`getRequisitions`, not honest-but-invisible (`stores/purchaseRequisitionStore.ts:11-13`).

---

## 2. The intake line — one shape, two producers

`t_pr_create` (`requiredFields: ['material','quantity']`, §1) is the single creation verb both
producers target. The **`PrIntakeLine`** maps onto it from either producer. Its field set
**conforms to the IBP published seam shape** (Reply §1) — the external producer grain
`material × sourceDestinationLane × segment × period → acceptedQty (+ provenance + liveness)`:

**`PrIntakeLine` AS SHIPPED** — `src/services/data/types.ts:636-653`. This is the authoritative
field list; the prior version of this table described fields that were never built (D-8).

| Field | Type | Opt | `file:line` | Producer semantics |
|---|---|---|---|---|
| `id` | `string` | req | `types.ts:637` | line identity |
| `material` | `string` | req | `:638` | ⚠️ a **display string**, NOT an S/4 code (GG-4, still open) |
| `suggestedSource` | `string \| null` | nullable | `:640` | SOMO-authored lane, read-only; `null` for internal-Grid |
| `segment` | `string \| null` | nullable | `:642` | SOMO-authored ABC-XYZ class, read-only; `null` for internal-Grid |
| `suggestedQty` | `number` | req | `:643` | the machine recommendation (§2.1) |
| `acceptedQty` | `number` | req | `:644` | the qty acted on → `quantity` (§2.1) |
| `wasAdjusted` | `boolean` | req | `:645` | override flag (§2.1 — **see the defect**). ⚠️ **RETIRED BY RULING A1-R2**, in favour of a derivation from the two quantities; still on the type until B2 |
| `uom` | `string` | req | `:646` | ⚠️ free string, NOT a closed union (contrast C8's `Uom`) |
| `period` | `string` | req | `:647` | planning bucket; **unparsed free string** (GG-3). ⚠️ **BECOMES `periodBucket: BucketId` BY RULING A1-R1** — month or ISO week, quarters refused, parsed by `parseBucket`; still spelled `period: string` on the type until B2 (Amendment 1) |
| `estimatedValue` | `number` | req | `:648` | ⚠️ **IDR assumed, nowhere declared** (§2.3) |
| `source` | `PrSource` = `'INTERNAL_GRID' \| 'SOMO'` | req | `:649`, `:601` | the producer (§4) |
| `planState` | `IntakePlanState` = `'PLANNED' \| 'committed'` | req | `:650`, `:634` | the C6 plan-state axis (§4) |
| `deficit` | `string` | **optional** | `:652` | recommend-first rationale — "the why" |

**FIELDS THIS DOCUMENT PREVIOUSLY LISTED THAT DO NOT EXIST (D-8).** `bomContext?`,
`decisionMetadata`, `liveness` and `shortfall` are **not on `PrIntakeLine`** and never were.
They are struck from the contract rather than silently carried:

- `liveness` is **correctly absent** — it is derived at runtime from the registry
  (`registry.ts:137`), never a row field. Carrying it per-line would fork the axis. Not a defect.
- `decisionMetadata` is **partially served elsewhere**: an override's reason + from/to ride the
  DR-10 `TransitionEvent` via `buildQtyDecision` (`planGridModel.ts:176-189`), not the line.
- `bomContext?` was never built. It remains a legitimate future field (§0 provenance) but is
  **not reserved** — adding it is a shape change.
- `shortfall` — see §2.2. **This one is a defect**, because it was promised as reserved.

SOMO-authored fields (`suggestedSource`, `segment`, `deficit`) are **read-only + nullable for the
internal Grid producer** — a Grid-pushed line carries `null` (`fixtures/prIntake.ts:51-52,66-67`).

> **Name drift (D-7), for SOMO's emitter.** This document previously called the lane field
> `sourceDestinationLane`. The shipped field is **`suggestedSource`** (`types.ts:640`) and it
> holds a **source→destination lane**, not a source — e.g. `'Cikarang DC → Karawang Plant'`
> (`fixtures/prIntake.ts:21`). The UI labels it "Source lane" (`i18n/intakeReview.ts:25`). The
> type name is the only place it reads as a single source; **the name is wrong, the body is
> right.** Conform to the NAME `suggestedSource` carrying LANE semantics. C8 reuses the same
> name for the same thing (`sdc/types.ts:138`), so the two seams are at least consistent.

### 2.1 Quantity provenance — three values, not one (Reply §2b)

The number's provenance is part of its truth (Reply §2b: "suggested X, accepted Y" vs "accepted
as-is" are different governance records). An intake line carries **all three**:

- **`suggestedQty`** — the machine recommendation (SOMO's min-cost-flow solve, or the Grid's
  planned figure).
- **`acceptedQty`** — what we act on (maps to `PurchaseRequisition.quantity`, `:574`).
- **`wasAdjusted`** — boolean: was `acceptedQty` overridden from `suggestedQty`?

All three exist on `PrIntakeLine` (`types.ts:643-645`) and survive on the READ side.

⚠️ **AND THE THIRD ONE IS RETIRED BY RULING A1-R2 (2026-09-28) — IT IS NOT THE AUDIT SIGNAL THIS
SECTION CALLS IT.** Two independent reasons, and either alone is sufficient:

1. **It is derivable from the pair beside it, so it can only ever add a way to be wrong.** Nothing
   checks `wasAdjusted === (acceptedQty !== suggestedQty)`. All four rows of `prIntake.ts` satisfy
   it today (derived, not assumed); the first row that does not will disagree silently, and it will
   be the field that reads as the audit signal that carries the falsehood.
2. **Its comparison is against the wrong baseline.** A SOMO line arrives already adjusted by the
   producer (`pil-somo-002`: 5,000 suggested / 4,500 accepted). Measured against `suggestedQty`,
   that line reads as an override nobody in this building made — and the plan grid's drawer then
   **demands a planner's reason for SOMO's own delta** before it will push. The baseline is the
   producer's `acceptedQty`; the producer's delta is SHOWN, never charged to the planner.

For SOMO: an emitter carrying all three values stays conforming — we simply stop STORING the third
and derive it. The from/to pair is what the audit needs and it is what the `decision` carries.

### ⚠️ C7-FIND-02 (DEFECT, OPEN) — two of the three do not survive the WRITE

This document previously asserted: *"`wasAdjusted` is **stored, not derived-and-discarded** — the
fact of human adjustment is itself the audit signal."* **That guarantee is not delivered.**

`purchaseRequisitionTarget.create` (`MockCommandService.ts:547-593`) reads `quantity`,
`material`, `uom`, `requiredDate`/`period`, `estimatedValue`, `category`, `requestor`,
`costCenter`, `justification`, `priority` and `source` — **and nothing else.** It never reads
`suggestedQty` or `wasAdjusted`, and `PurchaseRequisition` (`types.ts:569-587`, plus optional
`source?` at `:621`) has **no field to hold either**. `buildPrCreatePayload`
(`planGridModel.ts:196-213`) does not even emit them.

So at the moment of the governed push, the three-value provenance collapses to one:
**`acceptedQty` survives as `quantity`; `suggestedQty` and `wasAdjusted` are discarded.**

What *does* survive is narrower and lives elsewhere: an override's `reason` and its from/to ride
the DR-10 `TransitionEvent` through `buildQtyDecision` (`planGridModel.ts:176-189`), and the
reason-gate genuinely blocks an unexplained override before dispatch (`overrideBlocked`,
`:165-172`). The audit signal exists **on the event**, not on the entity.

**Recorded as a DEFECT, not as intended behaviour.** For SOMO: an emitter that carries all three
values is conforming and correct — but be aware that today only the accepted value reaches our
PR entity. Closing this is a code batch, not a doc change; registered §7 and in `docs/findings.md`.

⚠️ **THE REMEDY IS NOW RULED, AND IT IS NOT "CARRY ALL THREE ONTO THE ENTITY" (A1-R3, 2026-09-28).**
Two of the three were going to be carried to fix a provenance problem, and one of them is the field
A1-R2 retires. What the approver needs on the document is the **from/to pair with its reason** — a
`decision`, which already exists as a type and is already forwarded verbatim by the dispatcher — plus
the line it came from and the bucket it sits in. So the entity gains
`intakeLineId?` · `periodBucket?` · `decision?` (shipped at A1, `types.ts`) and does **not** gain
`suggestedQty` or `wasAdjusted`: the first is inside `decision.from`, and the second is a derivation.
**A defect fixed by storing the field the ruling deletes would have been a fix in the wrong
direction**, which is why this row is amended rather than simply closed.

### 2.2 Shortfall / constraint (Reply §2a, reserved)

Optional **`shortfall`** (unmet-portion) field, **reserved**:

- **Zero today** — SOMO's solve is unconstrained (capacity unbounded, in-transit zero — both
  deferred harvests; Seam §1, Reply §2a), so shortfall is structurally 0 / absent.
- **Real post-constraint** — once SOMO's capacity-constrained solve lands (their Phase 4, gated
  in part on our F3 feedback; Reply §2a/§3), a capacity-bound requirement arrives with its
  **unmet portion VISIBLE, never silently truncated** — a **sourcing signal** the Portal's RFQ
  process may resolve, not an error to hide.

### ⚠️ C7-FIND-03 (DEFECT, OPEN) — `shortfall` was promised as reserved and was not reserved

This document previously closed §2.2 with: *"Reserved now so the shape does not change when the
constrained solve lands (additive-landing discipline, C5 precedent; Reply §2: 'cheap to reserve
now; impossible to reconstruct later')."*

**`shortfall` does not exist on `PrIntakeLine`** (`types.ts:636-653`). It was never reserved —
only described as reserved. The consequence is precisely the one the reservation was meant to
prevent: **when SOMO's capacity-constrained solve lands, adding `shortfall` IS a shape change**,
not an additive landing, and this document's promise that it would not be is void.

Stated plainly to SOMO because it affects their sequencing: **do not build against `shortfall` as
though our side has a slot for it.** The field's *semantics* above stand and are still the right
design — an unmet portion must arrive VISIBLE, never silently truncated. Only the claim that the
slot already exists is withdrawn. Registered §7 and in `docs/findings.md`.

---

### 2.3 Undeclared assumptions the code relies on (conformance-critical)

None of these is declared anywhere in the type, the fixture, or the prior contract. They are
stated here because each one is a place a conforming emitter can be wrong while passing.

| Assumption | Evidence | Risk to a peer emitter |
|---|---|---|
| **`estimatedValue` is IDR** | no currency field on `PrIntakeLine` (`types.ts:648`) or `PurchaseRequisition`; denomination asserted only at render via `formatIDR` (`BuyerRequisitions.tsx:423,564`) | a non-IDR emitter is silently mis-rendered |
| **`estimatedValue` is a LINE TOTAL, not a unit price** | implied only by magnitude — `pil-somo-002`: 5,000 KG / 990,000,000 (`fixtures/prIntake.ts:38-43`) | off by the quantity factor |
| **`period` is an unparsed free string, in TWO formats** | `'2026-Q3'` and `'2026-08'` coexisted in one fixture; nothing parsed or validated. ⚠️ **CLOSED BY RULING A1-R1 AND THE FIXTURE NOW CONFORMS (2026-09-28).** `parseBucket` is the one discriminator and refuses the quarter form, and the two `'2026-Q3'` rows have been re-expressed — `pil-somo-001` → month `'2026-09'`, `pil-grid-002` → ISO week `'2026-W36'`, grain following lane. **Derive the row set, do not read it here:** `prIntakeBuckets.test.ts` runs every row through the parser each run. ⚠️ **The FIELD is still `period: string` on the type** — the rename to `periodBucket` is B2's, so a non-conforming value is caught by a spec rather than by `tsc` | a third format is accepted silently — **and two were, which is how this row came to exist.** The type still cannot refuse one; only the parser and that spec can |
| **`period` lands in a field named `requiredDate`** | `requiredDate: str('requiredDate') \|\| str('period')` (`MockCommandService.ts:577`) — so a date-typed, date-named field holds a BUCKET. ⚠️ The `"2026-Q3"` example is now HISTORICAL (the fixture was fixed 2026-09-28) and the replacement examples are `'2026-09'` and `'2026-W36'` | GG-3 is not merely unresolved, it is actively mis-stored. ⚠️ **RULED 2026-09-28 (A1-R1): GG-3 closes on C8's side and `t_pr_create` stops writing the bucket here.** `PurchaseRequisition.periodBucket?` is the slot, and it exists as of A1. ⚠️ **AND FIXING THE FIXTURE MOVED ONE ROW FROM THE HONEST FAILURE TO THE DISHONEST ONE — MEASURED, AND THE FIRST DRAFT OF THIS CELL GUESSED IT BACKWARDS.** Through `formatDate`: `'2026-Q3'` → `—`, `'2026-W36'` → `—`, but `'2026-09'` → **`01 Sept 2026`**. An unparseable bucket renders as visibly ABSENT; a MONTH is the one form `Date` happily parses, so it renders **a specific day nobody entered**. So the ISO-week row is unchanged at the reader (em dash before, em dash after) and `pil-somo-001` went from an em dash to a fabricated day — **the population of requisitions claiming a day nobody chose grows from two rows to three.** That is a real cost of conforming the fixture ahead of B2, it is booked here rather than discovered later, and it is an argument for B2's ordering, not against the ruling |
| **`uom` is trusted verbatim from the payload** | `str('uom')` (`:574`), free string (`types.ts:646`) — the C8 sibling does the **opposite**, copying from the material master and never trusting the payload | `'kg'` / `'MT'` pass C7, fail C8 |
| **No idempotency contract exists** | id === `prNumber` === store-assigned `PR-2026-9xx` (`stores/purchaseRequisitionStore.ts:42-45`); the payload accepts no external reference. ⚠️ **RULED (A1-R3): the key IS the intake line id, one line → at most one PR.** `intakeLineId?` exists on the entity as of A1; the dispatch-side key is B2 | **a redelivered SOMO event mints a DUPLICATE PR** — and ⚠️ **a duplicate is already reachable with no wire at all**: Accept → reload → the row is PLANNED again with the PR still in the store (measured) |
| **Unrecognised `source` is dropped, not rejected** | `:561-564` — `'somo'` or `'SOMO_V2'` yields a PR with **no producer mark** and no error | a casing slip silently destroys provenance |
| **`createdDate` reads the wall clock** | `new Date()` (`:582`) against a fixture set anchored to an implicit 2026-07-06 present (`FIXTURE-PRESENT-01`) | pushed PRs are stamped out of era |

The idempotency gap is the one we most want SOMO to note: **the F2 Event Mesh boundary is
at-least-once by nature, and our intake has no dedupe key today.** That is ours to close before
the wire lands, and it is registered §7.

---

## 3. Creation mechanism + C7-FIND-01

The intake maps onto the **real** dispatcher creation mechanism — the same one live for ASN and
invoice creation:

- A `creation`-trigger transition (`t_pr_create`, §1) dispatched through
  `ICommandService.dispatch(scope, input)` (`types.ts:1080`) with the full validation chain
  (`dispatcher.ts:4-14`): QueryScope, `requiredRole` (`pr:create`), `requiredFields`
  (`material`+`quantity`), policy hooks → `create(payload, toState)` mints the entity + returns
  its id (`dispatcher.ts:61-62, 251-254`; `creationOwner` derives scope from the payload,
  `:60, :193-199`).

### C7-FIND-01 — **CLOSED** (was: PR create is author-INERT)

**Superseded by code (D-2).** The prior text read: *"`purchaseRequisition` is not in `TARGETS` …
`t_pr_create` cannot dispatch today."* That is no longer true. `purchaseRequisition` **is** in
`TARGETS` (`MockCommandService.ts:983`) and therefore in `WIRED_COMMAND_TARGETS` (`:998-1000`),
with a full target: `readState` / `readScopeOwner` / `readEntity` / `applyTransition` /
`creationOwner` / `create` (`:547-593`). The code records the closure itself at `:538`
("Wiring it here closes C7-FIND-01"). **`t_pr_create` dispatches.**

Scoping as built: `creationOwner: () => null` (`:554`) ⇒ a buyer passes creation-scope then the
`pr:create` role gate; a **supplier resolves owner `null` → `SCOPE_DENIED` before the role gate**,
so PR stays buyer-internal.

### C7-FIND-01a — **CLOSED, resolved DIFFERENTLY than this document prescribed** (D-3)

The prior text prescribed: add a `purchaseRequisitions` capability *"backed `null` → derives
SIMULATED"*. The capability exists (`registry.ts:51`) but is **not** backed `null`. It is backed
**structurally to the wired entity** — `purchaseRequisitions: 'purchaseRequisition'`
(`registry.ts:78`) — so **gate-1 derives LIVE** (the intake genuinely dispatches), and the honest
SIMULATED render comes from **gate-2 harvest gating** instead (`registry.ts:70-77`).

**The shipped resolution is stronger than the one specified, and the difference matters.** A
`null` backing is a hand-authored claim that stays SIMULATED even after a target is wired — it
would have gone stale exactly the way this document did. The structural backing cannot: unwire
the target and the capability flips to SIMULATED with no edit here. What holds it guarded today
is the honest fact that **there is no live PRODUCER** — SOMO is SPEC (F2), the internal Grid is
G1.2 — not a fiction about wiring. The flip to LIVE is the proven two-edit op: land a producer,
drop the harvest entry. Wiring alone must never flip green (LIVENESS-DATASOURCE-01).

### 3.1 The payload keys the code reads — including five no document stated (D-9)

**This is the conformance surface.** `PrIntakeLine` (§2) is what the portal *displays*; the list
below is what `create` actually *reads* (`MockCommandService.ts:555-592`). They are not the same
set, and the difference has never been written down before.

| Payload key | Read as | `file:line` | Doc status |
|---|---|---|---|
| `material` | `string` | `:570` | stated — **required** by `t_pr_create` |
| `quantity` | `number` | `:573` | stated — **required**; this is `acceptedQty` renamed |
| `uom` | `string` | `:574` | stated |
| `requiredDate` \|\| `period` | `string` | `:577` | stated (GG-3) |
| `estimatedValue` | `number` | `:578` | stated |
| `source` | `'INTERNAL_GRID' \| 'SOMO'` | `:561-564` | stated |
| **`category`** | `string` | `:571` | ⚠️ **undocumented** |
| **`requestor`** | `string` | `:579` | ⚠️ **undocumented** |
| **`costCenter`** | `string` | `:580` | ⚠️ **undocumented** |
| **`justification`** | `string` | `:587` | ⚠️ **undocumented** |
| **`priority`** | `'High' \| 'Low'`, **else `'Medium'`** | `:565-566` | ⚠️ **undocumented, and silently defaulting** |

`priority` deserves its own line for SOMO. It is a **three-valued field with a silent default**:
anything that is not exactly `'High'` or `'Low'` — including absent, `'HIGH'`, `'Urgent'`, or a
typo — yields `'Medium'` with no error and no marker. An emitter that believes it is sending
priority and gets the casing wrong will produce a PR queue that is uniformly `Medium` and looks
entirely normal. Every other unstated key degrades to `''` or `0` via the `str`/`num` helpers
(`:557-558`), which is at least visibly empty; `priority` degrades to a **plausible value**.

Omitting any of the five is legal and produces an honest empty/default — but a conforming
producer that *wants* to populate them could not have known they existed.

---

## 4. Provenance — source × liveness (reuses C6, no new vocabulary)

Every intake line carries two provenance markers:

- **`source`** — `INTERNAL_GRID | SOMO | …` (the producer; Reply §1 `source: "SOMO"`).
- **`liveness`** — the runtime source-tier from the registry (`liveness()`, `registry.ts:137`;
  `Tier = LIVE | SIMULATED | SPEC`, `:45`). **No `SEED` value is forked** — that would fragment
  C6's frozen liveness axis.

**"Recommend-first / not-yet-committed" is NOT a liveness property.** It is a **plan-state**
property — the C6 PLANNED axis. Conflating the two is exactly what C6 §5 forbids. So a SOMO
accepted-requirement is honestly rendered as:

> **SIMULATED** liveness (its data source is not a wired PR target — §3 sub-finding) **×
> PLANNED** plan-state (recommend-first, not yet committed; Seam §1/§5) — **the exact cell C6's
> honesty matrix already defines** (`docs/contracts/C6-planning.md` §5, SIMULATED × PLANNED).

C7 reuses C6's two-axis grid wholesale; a seed SOMO line is **not** a live procurement
instruction and cannot render as committed seam truth (two-gate, `isLive` `registry.ts:178`).
This is the same discipline the IBP seat asks for both-sides (Seam §0; Reply §81: "carrying
`source` + `liveness` across the seam so a rehearsed plan never renders as a live instruction").

### Crosswalk — IBP `liveness` → C6 axes (the only translation)

The IBP seat emits `liveness: "seed" | "live"` at the boundary (Reply §1). The Portal renders
C6's two axes. The crosswalk:

| IBP term (Reply §1) | C6 axes (this platform) |
|---|---|
| IBP **`seed`** | **SIMULATED** liveness × **PLANNED** plan-state |
| IBP **`live`** | **LIVE** liveness × **committed** (once pushed through `t_pr_create` and the seam agrees) |

No third vocabulary is introduced on either side — IBP speaks `seed`/`live`, the Portal renders
C6's grid, and this one-line map is the whole translation.

---

## 5. Event Mesh mapping (SOMO → PR) — F2, multi-producer

The inbound SOMO accepted-requirement event → `t_pr_create` transform is the **F2 `sapBoundary`
pattern with a new producer** — the **INT-TMS-01 precedent**: one RESERVED seam, an external
system drives inbound transitions (there TMS drives `asn:carry`; here SOMO drives PR creation)
(`docs/contracts/C5-seams.md:117-126`). The IBP seat confirms this topology wholesale (Reply
preamble: "Event Mesh for the inbound plan (SOMO→Portal) … the 'one intake, multiple producers'
abstraction … is the correct generalization; treat us as exactly that, no special-casing").

One seam, many producers — designed once (§2), so the internal Grid and SOMO enter through the
*same* `PrIntakeLine` → `t_pr_create`.

**Tiers (honest):**
- **SOMO producer = SPEC.** SOMO's `order_creation` emission is deferred (Seam §0: 30/30 external
  seams `deferred`; "a complete, honest, scaled rehearsal … not a live emitter"). Zero wire today.
- **F2 Event Mesh boundary = RESERVED** (Stage-F; the S/4 Event Mesh seam our F2 pattern names).
- **Feedback path Portal → SOMO = Snowflake / F3 = SPEC** — realized lead times / open orders /
  GR facts flow back through the F3 clean-data layer (C4 SPEC). The IBP seat accepts our F3 is
  gated behind F1/F2 and not near-term (Reply §3), and treats `supplier_lead_times` / in-transit
  as **gated-on-our-F3** — a tracked, non-blocking cross-platform dependency.

Landing SOMO is additive: it implements the `PrIntakeLine` → `t_pr_create` transform against the
frozen intake contract; the Portal's PR machine does not change.

---

## 6. Grain-gap register — co-design open items for the IBP seat

The SOMO grain (**SKU × lane × segment × period**, RM/PM leaf; Seam §1, Reply §1) does not map
cleanly onto the as-built PR shape (§1). **The Reply §1 table is the external producer grain C7
conforms to**; where it exceeds the PR shape, the gap is resolved by co-design, not by silently
dropping data. The IBP seat itself flags GG-1a/GG-1b as "resolve before you freeze C7" (Reply §2)
and offers to pin any load-bearing field type on request (Reply §83).

| # | Grain gap | As-built PR | Resolution owner |
|---|---|---|---|
| GG-1 | **`sourceDestinationLane`** (source→dest) | no field (§2) | IBP co-design — add read-only `lane`, nullable internal (Reply §1: recommend-first) |
| GG-2 | **`segment`** (ABC-XYZ policy) | no field (§2) | IBP co-design — add read-only `segment`, nullable internal (Seam §4: annotates) |
| GG-3 | **`period` bucket** vs `requiredDate` | single date (`types.ts:576`) | IBP co-design — planning bucket ≠ a due date; pin representation (Reply §83) |
| GG-4 | **`material` as S/4 code** | display string (`types.ts:572`) | IBP co-design — normalize to a real S/4 material code (shared key, Seam §4) |
| GG-5 | **`shortfall`** (post-constraint) | no field | reserved (§2.2); real at SOMO Phase 4 (Reply §2a) |
| GG-6 | **`suggestedQty` vs `acceptedQty` + `wasAdjusted`** | all three on the line (`types.ts:643-645`); **only `acceptedQty` reaches the entity** | **HALF-OPEN — DEFECT** (C7-FIND-02). Read-side closed, write-side drops two of three. |

**Verified 2026-08-03.** GG-1 and GG-2 are **CLOSED on the read line** — both were resolved by
building, not by co-design, and this document simply failed to record it: `suggestedSource:
string | null` (`types.ts:640`) and `segment: string | null` (`:642`), both read-only and
nullable-internal exactly as specified. Neither is carried onto the PR entity, because `create`
drops them (§3.1). GG-3 is not merely unresolved but **actively mis-storing** — the bucket is
written into `requiredDate` (`MockCommandService.ts:577`), and C8 resolves the same gap the
OPPOSITE way (bucket-native; see C8 GG-3′). GG-5 is a **defect** (§2.2). The GG-1/GG-2 rows above
are superseded by this paragraph; they are left in place so the co-design history stays readable.

### 6.1 GG-4 — the material join, and the recommendation (FINDING ONLY, NOT BUILT HERE)

**The finding.** C7 carries material as a **display string** (`types.ts:638`); C8 carries a
material **code** (`sdc/types.ts:128`, keyed to `MATERIAL_MASTER`, `sdc/fixtures.ts:58-100`).
**The two seams do not join.** The same substance appears as `'Glycerin USP (Halal)'`
(`fixtures/prIntake.ts:20`) and as `RM-EMUL-3310` labelled `'Glycerin USP 99.5%'`
(`sdc/fixtures.ts:59-64`) — different key, different label, no crosswalk. There are in fact
several material-identity spaces in the tree. **Operator ruling (binding) settles which is
authoritative:** `src/services/sdc/fixtures.ts` (`MATERIAL_MASTER`, `:58-100`) **IS the portal's
authoritative material master**; `src/data/mock*.ts` is a **parallel NON-MASTER dataset, booked
for retirement rather than reconciliation** (`MOCK-RETIREMENT-01`), as is `MAT-20500` on its own
convention (`channel/outboundFixtures.ts:29`). See [C8 §4.0](./C8-forecast-publication.md) — the
declaration is load-bearing there, because SOMO cannot ratify a freeze against an undeclared
master. So this is **not** four co-equal populations: it is **one master, one display-string
space that should collapse into it, and non-master datasets awaiting retirement.**

**The recommendation, adopting SOMO's own internal ruling on this exact class:**

> **A crosswalk between two spaces you control carries no information.** The fix is to **delete
> one space, not to bridge them.** A crosswalk earns its place only between spaces owned by
> **different parties** — which is what `material_master_ref` is, and this is not.

So C7's display-string space should be **collapsed into** the coded space, not mapped to it. Both
spaces are ours; a C7↔C8 crosswalk would be ceremony, and a second thing to keep true.

**DO NOT COLLAPSE THE SPACES IN THIS PR — and the reason is specific, not caution.**
~~`inferBpom` (`components/v2-features/GRInspectionWizard.tsx:129-163`) **parses the material-code
prefix** (`AI-` / `FR-`) to derive **BPOM applicability**. A code-format change therefore
**silently changes regulatory-compliance behaviour**, with no test asserting that linkage as
intentional.~~

> ⚠️ **CORRECTED 2026-08-06 — THE STATED REASON NO LONGER EXISTS, AND THIS DOCUMENT WENT ON GIVING
> IT.** `inferBpom` is **deleted.** BPOM applicability is a **master field** read through one
> refusal-shaped lookup, and **no prefix parse survives on any path a receipt can travel.** A
> code-format change no longer moves compliance behaviour by this route.
>
> **This paragraph was stale from the moment the fix landed, and nothing failed** — the
> `file:line` it cites had stopped holding a prefix parse and the sentence read exactly as
> persuasive as before. Filed as **`C9-STALE-BY-FIX-01`** (C9 §7.13, and our register):
> **A CONTRACT CAN GO STALE BY BEING FIXED, AND THAT DIRECTION IS THE UNCHECKED ONE** — a document
> that overstates our conformance is caught by anyone who reads the code; one that **understates**
> it is caught by nobody, because the discrepancy is in our favour and reads as caution.
>
> ⚠️ **NOT PINNED.** C9's ledger is asserted on the floor; this document is not. **Nothing will fail
> if this paragraph goes stale again.**

**THE RECOMMENDATION IS UNCHANGED, and its remaining reasons stand on their own.** A collapse is
still an investigation-first batch: it rewrites identity across two spaces, it interacts with
`MOCK-RETIREMENT-01`, and the regulatory linkage — while no longer a *prefix* linkage — is now a
**master-membership** linkage, since an unresolvable code is **refused** at goods receipt rather
than waved through. **The hazard changed shape; it did not evaporate.** Registered §7 and in
`docs/findings.md`.

None of GG-3/4/5/6 is resolved unilaterally by the Portal; each is an entry for the IBP seat's
co-design so the two published shapes converge (Reply "Agreed next joint step" §1–§3).

---

## 7. Decision register (C7)

| ID | Decision | Status |
|---|---|---|
| C7-SCOPE | Seam carries RM/PM leaf only; BOM explosion + ownership stays SOMO's (their Phase 4); Portal consumes BOM context, never reconciles | CONTRACT (§0) |
| C7-INTAKE | One `PrIntakeLine` → `t_pr_create` serves both producers; conforms to Reply §1; SOMO-authored fields read-only + nullable internal; qty carries suggested/accepted/wasAdjusted | CONTRACT (§2) |
| C7-PROV | Provenance = `source` × registry `liveness` (LIVE/SIMULATED/SPEC); no SEED fork; IBP `seed` = SIMULATED×PLANNED per C6; crosswalk documented | CONTRACT (§4) |
| **C7-FIND-01** | PR create is author-inert — no `CommandTarget`. | **CLOSED** — wired at G1.1 (`MockCommandService.ts:547-593, :983`; closure recorded `:538`). §3 |
| **C7-FIND-01a** | Add a `purchaseRequisitions` liveness capability for intake provenance. | **CLOSED — resolved differently than prescribed**: structural backing + gate-2, not `null` (`registry.ts:51, :70-78`). §3 |
| **C7-FIND-02** | **DEFECT** — `suggestedQty` + `wasAdjusted` documented as stored; `create` reads neither and `PurchaseRequisition` has no field for either (`MockCommandService.ts:547-593`; `types.ts:569-587`). Audit signal survives on the DR-10 event only, **and no surface in this tree renders an event**. | **OPEN — REMEDY RULED, SHAPE LANDED (A1-R3).** The entity now carries `intakeLineId?` / `periodBucket?` / `decision?`; the write and the render are B2. ⚠️ The remedy is deliberately NOT "store all three" — `wasAdjusted` is retired by A1-R2 and `suggestedQty` is `decision.from` (§2.1) |
| **C7-FIND-03** | **DEFECT** — `shortfall` promised as RESERVED (§2.2) but never added to `PrIntakeLine` (`types.ts:636-653`); landing it is a shape change, not additive. | **OPEN** — code batch (§2.2) |
| **C7-FIND-04** | Five payload keys read but undocumented (`category`, `requestor`, `costCenter`, `justification`, `priority`) — `priority` silently defaults to `'Medium'` on any unrecognised value (`MockCommandService.ts:565-566`). | **DOCUMENTED** here (§3.1); `priority`'s silent default is a **candidate defect** |
| **C7-FIND-05** | **No idempotency contract at the intake.** id === store-assigned `prNumber` (`stores/purchaseRequisitionStore.ts:42-45`); no external reference accepted. F2 Event Mesh is at-least-once ⇒ a redelivered SOMO event mints a duplicate PR. ⚠️ **AND IT IS NOT ONLY AN F2 RISK** — measured on the surface, Accept → reload pushes the same line again with the PR still in the store, so three Drafts for one requirement is one click away with no wire at all. | **OPEN — KEY RULED (A1-R3): the intake line id, one line → at most one PR.** `intakeLineId?` exists on the entity as of A1; the dispatch-side key is B2. Must still close before the F2 wire (§2.3) |
| GG-1, GG-2 | lane + segment | **CLOSED by build** on the read line (`types.ts:640,642`); not carried to the entity (§6) |
| **GG-3** | **period bucket.** | **CLOSED 2026-09-28 (operator ruling A1-R1) — ON C8's SIDE.** Month `'YYYY-MM'` or ISO week `'YYYY-Www'`; **quarters refused**; one grain per horizon; `parseBucket` (`bucket.ts`) is the one discriminator both seams go through. C7 was resolving this the OPPOSITE way and is corrected, not reconciled. **Cross-seam ask to SOMO stands** (C8 GG-3′: confirm one plan at both grains). Code: B2 |
| GG-4, GG-5, GG-6 | material-as-S/4-code · shortfall · qty provenance | **OPEN** — IBP co-design (§6); GG-4 recommendation at §6.1 |
| **A1-R1** | Bucket vocabulary: `BucketId` = month \| ISO week; quarters refused; one grain per horizon; `PrIntakeLine.period` → `periodBucket`; `t_pr_create` stops writing it into `requiredDate`. | **RATIFIED — operator 2026-09-28** (Amendment 1). Vocabulary + parse SHIPPED at A1; the field rename is **B2** |
| **A1-R2** | C6-LOCK's subject: the baseline is the producer's `acceptedQty`, a reason is owed only for the planner's own change, and the stored `wasAdjusted` is retired in favour of a derivation. | **RATIFIED — operator 2026-09-28.** Recorded in full at C6 §8.3; code is **B2** |
| **A1-R3** | The requisition carries its origin on the DOCUMENT: `intakeLineId?` · `periodBucket?` · `decision?`; idempotency key = intake line id; one intake line → at most one PR. | **RATIFIED — operator 2026-09-28.** DTO shape SHIPPED at A1 (`types.ts`); write + render + key are **B2** |
| **C7-MATERIAL-JOIN** | C7 (display string) and C8 (code) do not join. Recommendation: **collapse the spaces, do not crosswalk them** — a crosswalk between two spaces we control carries no information. **NOT built here.** ⚠️ **CORRECTED 2026-08-06:** the reason this row gave — *`inferBpom` derives BPOM applicability from the code prefix, so a format change moves compliance behaviour* — **is no longer true.** `inferBpom` is deleted; applicability is a master field. The linkage is now **master-membership**, not prefix: an unresolvable code is **refused** at goods receipt. `C9-STALE-BY-FIX-01` (C9 §7.13). | **OPEN** — investigation-first batch (§6.1) |
| SOMO-SEAM | SOMO producer tier | **SPEC** — `order_creation` deferred (Seam §0) |

---

## Provenance

**Corrected 2026-08-03 at `main` #157 (`063adca`), floor 1991/1991, docs-only.** Every claim in
this revision was re-verified against the tree at that commit; the correction record above lists
what changed and why. The `file:line` refs in the sections below that were NOT touched by the
correction still date from the original #67 harvest and may have shifted — the corrected sections
(Status, Tier table, §1, §2, §2.1, §2.2, §2.3, §3, §3.1, §6, §6.1, §7) carry re-verified refs.

**Re-harvest trigger (the process fix).** This document drifted because the harvest ran once and
had no re-run condition. It is now re-verified at each seam-touching batch and at each CP
checkpoint; a contract statement that cannot be traced to a current `file:line` is treated as a
finding, not as prose.

Originally generated FORK-3 (machine-harvest from code-truth + thin connecting prose) at `main` #67.
In-repo seams cited `file:line`: `purchaseRequisition.flow.ts` (machine :1-92),
`types.ts` (`PurchaseRequisition` :569-587, `PRStatus` :559-565, `getRequisitions` :1150),
`MockProcurementService.ts` (read :349-354), `MockCommandService.ts` (TARGETS / wiring census
:343-360, creation-mechanism examples :96-98/:252-254), `dispatcher.ts` (creation +
validation :4-14/:60-62/:251-254), `roles.ts` (`pr:*` :37),
`registry.ts` (`liveness`/`isLive`/`Tier` :45-184), `C5-seams.md` (INT-TMS-01 precedent :117-126),
`C6-planning.md` (honesty matrix, PLANNED axis). External producer grain cited by doc § + field:
`docs/IBP_SupplyPlan_to_Procurement_Seam_2026-07-14.md` (§0 liveness caveat, §1 grain, §3 RM/PM +
feedback, §4 shared master, §5 PR landing, §6 co-design) and
`docs/IBP_SupplyPlan_Procurement_Seam_Reply_2026-07-14.md` (§1 published seam shape, §2a/§2b grain
gaps, §3 F3 sequencing). No product code exists for the intake dispatch, the Grid, or the SOMO
wire — all downstream of C7-FIND-01. This contract binds that work.

---

## Pin reach

**Pinned by** `src/services/contracts/__tests__/ledgerTruth.test.ts`.

**GUARDED — these assertions, and nothing else on this page:**

- C9 §7 — the ledger is well-formed, and its shape is derived not assumed
- C9 §7.1 — ZERO CONSUMERS: the types module is imported only by its own pins
- C9 §7.2 — NO POLICY ENGINE: MaterialRefJoinPolicy has no runtime consumer
- C9 §7.3 — DISCHARGED IN CODE, STALE IN THE DOCUMENT
- C9 §7.4 — RESERVED, NOT BUILT: substanceRef is absent from MaterialMasterEntry
- C7-FIND-03 — RESERVED AND NOT RESERVED: shortfall is absent from PrIntakeLine
- C8-FIND-03 — KNOWINGLY HELD: the VOID commitmentClass mapping is still in code
- docs/contracts/README.md — the C9 §7 summary matches the ledger it summarises


⚠️ **THIS INSTRUMENT IS SHARED, AND THE REACH BELOW IS THE INSTRUMENT'S RATHER THAN THIS
PAGE'S.** It also asserts over `C8-forecast-publication.md`, `C9-material-master-ref.md`, `C9-required-fields.md`, so entries naming another document are its assertions about
that sibling. They are listed here rather than filtered because **the thing a reader needs is
what the instrument checks**, and a filtered list would quietly re-introduce the judgement this
block exists to remove.

⚠️ **NOT GUARDED — EVERYTHING ELSE ON THIS PAGE, AND THAT HALF IS WHY THIS BLOCK EXISTS.**
A list of guarded things reads as completeness. It is not: **a reader who assumes the pin
covers a clause it does not reach is the failure this block is built against**, and it has
happened in this corpus — a DTO field whose MEANING was assumed pinned by a method-surface
pin, and a repaired defect still asserted as current in a document whose pin passed because
it only checks that an unenforced row SAYS it is unenforced.

Most of what is not guarded **cannot be**, and that is a property of a contract rather than
a backlog: a clause describing a system outside this repository has nothing here to compare
against, and a clause stating WHY a boundary exists has no truth-value to decay. See C12
for the statement of that property.

⚠️ **THIS BLOCK IS SELF-PINNED** (`src/services/contracts/__tests__/pinReach.contract.test.ts`).
The GUARDED list is asserted EQUAL to the pin’s own `describe` titles, **both directions**:
widen the pin without listing the new assertion and it reddens; drop a line here without
narrowing the pin and it reddens too. A reach statement that can drift is the overclaim one
layer up.

