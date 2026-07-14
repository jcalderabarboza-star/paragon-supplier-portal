# C7 — Purchase-Requisition intake

THE shared intake seam serving **two producers** of Purchase Requisitions, designed once:
1. the internal planning **Grid** (Stage G / G1 — a pushed planned PR row), and
2. external **SOMO** accepted-requirement events (via the F2 Event Mesh boundary).

This is the enterprise integration point where **planning meets procurement execution**.
Frozen as CONTRACT ahead of G1 — so G1 builds the Grid against it, and SOMO conforms its
`order_creation` emission to it, rather than either side inventing its own intake.

**Status:** CONTRACT · authored C7 (FORK-3, machine-harvest from code-truth + thin prose)
· additive, docs-only · generated at `main` (#67, C6 landed). No product code — the intake
dispatch, the Grid, and the SOMO wire are all downstream (see C7-FIND-01, §3).

**Grounding (real sources):**
- the shipped PR machine — `src/services/transitions/flows/purchaseRequisition.flow.ts` (cited `file:line`);
- C6 planning doctrine — `docs/contracts/C6-planning.md` (the two-axis honesty model C7 reuses);
- the IBP seat's seam answers — `docs/IBP_SupplyPlan_to_Procurement_Seam_2026-07-14.md` ("Seam");
- the IBP seat's contract reply — `docs/IBP_SupplyPlan_Procurement_Seam_Reply_2026-07-14.md` ("Reply"),
  whose **§1 table is the published Suggestion-Order seam shape C7 conforms to.**

The in-repo PR machine is cited `file:line`; the SOMO grain is cited by **doc § + field** from
the two IBP documents above (the external producer's published contract).

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
a live emitter". **F2 Event Mesh boundary = RESERVED** (Stage-F). **Internal-Grid intake =
RESERVED** (until G1). **PR machine = authored-inert** (states/transitions authored, no
`CommandTarget` — §1, §3).

---

## 1. The PR machine as-built (harvest)

The buyer-internal intake machine — suppliers never see PRs (`purchaseRequisition.flow.ts:2-5`;
read is buyer-only, `MockProcurementService.ts:353`). **F0.4, census #9, author-unwired**
(`purchaseRequisition.flow.ts:1-2`).

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
(`types.ts:1150`; impl `MockProcurementService.ts:349-354`, reads the `REQUISITIONS` fixture,
supplier scope → empty). **Creating a PR today requires `material` + `quantity` and the
`pr:create` role** — *if it could dispatch*, which it cannot yet (§3).

---

## 2. The intake line — one shape, two producers

`t_pr_create` (`requiredFields: ['material','quantity']`, §1) is the single creation verb both
producers target. The **`PrIntakeLine`** maps onto it from either producer. Its field set
**conforms to the IBP published seam shape** (Reply §1) — the external producer grain
`material × sourceDestinationLane × segment × period → acceptedQty (+ provenance + liveness)`:

| `PrIntakeLine` field (conforms to Reply §1) | Maps to / status in the PR machine | Producer semantics |
|---|---|---|
| `material` (S/4 code) | ~ `PurchaseRequisition.material` (`types.ts:572`) — today a **display string**, normalize to S/4 code (GG-4) | both; **required** by `t_pr_create` |
| `acceptedQty` | `PurchaseRequisition.quantity` (`:574`) | both; **required** — the qty acted on (§2.1) |
| `uom` | `PurchaseRequisition.uom` (`:575`) | both |
| `period` | ⚠️ `requiredDate` today (`:576`) — a single date, **not** a period bucket (GG-3) | SOMO: planning bucket; Grid: due date |
| `sourceDestinationLane` | ❌ no PR field (GG-1) | **SOMO-authored, recommend-first, read-only, NULLABLE internal** (Reply §1: SOMO *proposes*; RFQ may override) |
| `segment` (ABC-XYZ policy class) | ❌ no PR field (GG-2) | **SOMO-authored planning annotation, read-only, NULLABLE internal** (Reply §1; Seam §4: annotates, not reconciled) |
| `deficit` | ❌ new, read-only, optional | SOMO "the why" — guided-buying rationale (Reply §1) |
| `bomContext?` | ❌ new, read-only, optional | upstream BOM provenance (§0) — consumed, never reconciled |
| `decisionMetadata` (who accepted + reason + ts) | ~ partial (`requestor`/`approver`/`justification`, `:578,582,586`) | SOMO *accept*-metadata is new (Reply §1) |
| `source` | ❌ new provenance (§4) | `INTERNAL_GRID \| SOMO \| …` (Reply §1: `"SOMO"`) |
| `liveness` | ❌ new provenance (§4) | registry source-tier (§4); IBP emits `"seed" \| "live"` (Reply §1) → crosswalked |

SOMO-authored fields (`sourceDestinationLane`, `segment`, `deficit`, `bomContext`) are
**read-only + nullable for the internal Grid producer** — a Grid-pushed line simply omits them.

### 2.1 Quantity provenance — three values, not one (Reply §2b)

The number's provenance is part of its truth (Reply §2b: "suggested X, accepted Y" vs "accepted
as-is" are different governance records). An intake line carries **all three**:

- **`suggestedQty`** — the machine recommendation (SOMO's min-cost-flow solve, or the Grid's
  planned figure).
- **`acceptedQty`** — what we act on (maps to `PurchaseRequisition.quantity`, `:574`).
- **`wasAdjusted`** — boolean: was `acceptedQty` overridden from `suggestedQty`?

`wasAdjusted` is **stored, not derived-and-discarded** — the fact of human adjustment is itself
the audit signal.

### 2.2 Shortfall / constraint (Reply §2a, reserved)

Optional **`shortfall`** (unmet-portion) field, **reserved**:

- **Zero today** — SOMO's solve is unconstrained (capacity unbounded, in-transit zero — both
  deferred harvests; Seam §1, Reply §2a), so shortfall is structurally 0 / absent.
- **Real post-constraint** — once SOMO's capacity-constrained solve lands (their Phase 4, gated
  in part on our F3 feedback; Reply §2a/§3), a capacity-bound requirement arrives with its
  **unmet portion VISIBLE, never silently truncated** — a **sourcing signal** the Portal's RFQ
  process may resolve, not an error to hide.

Reserved now so the shape does not change when the constrained solve lands (additive-landing
discipline, C5 precedent; Reply §2: "cheap to reserve now; impossible to reconstruct later").

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

### C7-FIND-01 — PR create is author-INERT (OPEN, G1 dependency)

Harvested truth (`MockCommandService.ts:343-360`): **`purchaseRequisition` is not in `TARGETS`**
(only `purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`),
therefore **not in `WIRED_COMMAND_TARGETS`**. No PR `CommandTarget` exists → **no
`creationOwner`/`create` for PR → `t_pr_create` cannot dispatch today.**

**This contract does NOT pretend intake dispatches now.** C7 specifies the *shape* the intake
takes when wired; **wiring a PR `CommandTarget` (with `create` minting a `Draft` PR from a
`PrIntakeLine`) is a G1 dependency.** Same honest-marking discipline as C6's G0.1-FIND-01: the
contract names its own not-yet-buildable clause. Registered OPEN in §7.

**Sub-finding — C7-FIND-01a.** PR is **not** a registered liveness `Capability`
(`registry.ts:53-62` — no `purchaseRequisitions`), so PR reads carry no source-tier marker
today. C7's provenance (§4) requires adding a **`purchaseRequisitions`** capability to the
registry, backed `null` → derives **SIMULATED** honestly until a PR `CommandTarget` wires it LIVE
(`livenessFrom`, `registry.ts:125-130`). Also a G1 dependency; registered §7.

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
| GG-6 | **`suggestedQty` vs `acceptedQty` + `wasAdjusted`** | only `quantity` (`:574`) | resolved in §2.1 — carry all three (Reply §2b) |

None is resolved unilaterally by the Portal; each is an entry for the IBP seat's co-design so the
two published shapes converge (Reply "Agreed next joint step" §1–§3).

---

## 7. Decision register (C7)

| ID | Decision | Status |
|---|---|---|
| C7-SCOPE | Seam carries RM/PM leaf only; BOM explosion + ownership stays SOMO's (their Phase 4); Portal consumes BOM context, never reconciles | CONTRACT (§0) |
| C7-INTAKE | One `PrIntakeLine` → `t_pr_create` serves both producers; conforms to Reply §1; SOMO-authored fields read-only + nullable internal; qty carries suggested/accepted/wasAdjusted | CONTRACT (§2) |
| C7-PROV | Provenance = `source` × registry `liveness` (LIVE/SIMULATED/SPEC); no SEED fork; IBP `seed` = SIMULATED×PLANNED per C6; crosswalk documented | CONTRACT (§4) |
| **C7-FIND-01** | PR create is author-inert — no `CommandTarget` (`MockCommandService.ts:343-360`); intake maps onto the real creation shape, but wiring a PR `CommandTarget` is a **G1 dependency**. Not pretended. | **OPEN** (§3) |
| **C7-FIND-01a** | Add a `purchaseRequisitions` liveness capability to the registry (backed `null` → SIMULATED) for intake provenance. | **OPEN** — G1 dep (§3) |
| GG-1…GG-5 | Grain gaps (lane, segment, period-bucket, material-as-S/4-code, shortfall) | **OPEN** — IBP co-design (§6) |
| SOMO-SEAM | SOMO producer tier | **SPEC** — `order_creation` deferred (Seam §0) |

---

## Provenance

Generated FORK-3 (machine-harvest from code-truth + thin connecting prose) at `main` #67.
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
