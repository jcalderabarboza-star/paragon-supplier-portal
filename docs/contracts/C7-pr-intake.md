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
| `wasAdjusted` | `boolean` | req | `:645` | override flag (§2.1 — **see the defect**) |
| `uom` | `string` | req | `:646` | ⚠️ free string, NOT a closed union (contrast C8's `Uom`) |
| `period` | `string` | req | `:647` | planning bucket; **unparsed free string** (GG-3) |
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
| **`period` is an unparsed free string, in TWO formats** | `'2026-Q3'` and `'2026-08'` coexist in one fixture (`fixtures/prIntake.ts:27,42,57,72`); nothing parses or validates | a third format is accepted silently |
| **`period` lands in a field named `requiredDate`** | `requiredDate: str('requiredDate') \|\| str('period')` (`MockCommandService.ts:577`) — so a date-typed, date-named field holds `"2026-Q3"` | GG-3 is not merely unresolved, it is actively mis-stored |
| **`uom` is trusted verbatim from the payload** | `str('uom')` (`:574`), free string (`types.ts:646`) — the C8 sibling does the **opposite**, copying from the material master and never trusting the payload | `'kg'` / `'MT'` pass C7, fail C8 |
| **No idempotency contract exists** | id === `prNumber` === store-assigned `PR-2026-9xx` (`stores/purchaseRequisitionStore.ts:42-45`); the payload accepts no external reference | **a redelivered SOMO event mints a DUPLICATE PR** |
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
| **C7-FIND-02** | **DEFECT** — `suggestedQty` + `wasAdjusted` documented as stored; `create` reads neither and `PurchaseRequisition` has no field for either (`MockCommandService.ts:547-593`; `types.ts:569-587`). Audit signal survives on the DR-10 event only. | **OPEN** — code batch (§2.1) |
| **C7-FIND-03** | **DEFECT** — `shortfall` promised as RESERVED (§2.2) but never added to `PrIntakeLine` (`types.ts:636-653`); landing it is a shape change, not additive. | **OPEN** — code batch (§2.2) |
| **C7-FIND-04** | Five payload keys read but undocumented (`category`, `requestor`, `costCenter`, `justification`, `priority`) — `priority` silently defaults to `'Medium'` on any unrecognised value (`MockCommandService.ts:565-566`). | **DOCUMENTED** here (§3.1); `priority`'s silent default is a **candidate defect** |
| **C7-FIND-05** | **No idempotency contract at the intake.** id === store-assigned `prNumber` (`stores/purchaseRequisitionStore.ts:42-45`); no external reference accepted. F2 Event Mesh is at-least-once ⇒ a redelivered SOMO event mints a duplicate PR. | **OPEN** — must close before the F2 wire (§2.3) |
| GG-1, GG-2 | lane + segment | **CLOSED by build** on the read line (`types.ts:640,642`); not carried to the entity (§6) |
| GG-3, GG-4, GG-5, GG-6 | period-bucket · material-as-S/4-code · shortfall · qty provenance | **OPEN** — IBP co-design (§6); GG-4 recommendation at §6.1 |
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
