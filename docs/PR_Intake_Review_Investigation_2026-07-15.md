# PR-Intake **Review** Surface — Investigation & Adjudicated Design (2026-07-15)

**Phase A / task 1 of the sourcing spine** (deadline-free critical path; see
`Paragon_World_Class_Build_Plan_v1.md`). Investigation-first record: the
**review ↔ push distinction**, the current-state map, the honest-render basis,
and the four design forks **as adjudicated by the operator (SEAT 2, 2026-07-15)**.

**Status:** ADJUDICATED — GO with the recommended shape. This doc is the design
record; the build lands in the same PR.

---

## 1. The distinction — "review half" vs the G1.3.2 adjust-push

The Grid intake work shipped the **write** half. This task builds the **read/triage**
half that precedes and frames it.

| | **Adjust-push (G1.3.2, SHIPPED)** | **Review (this task)** |
|---|---|---|
| Verb | The **write**: select ONE line → adjust accepted qty → reason-gate → `t_pr_create` | The **read/triage**: review the incoming requirement SET, understand *why* each was recommended, decide what enters the sourcing workload |
| Question | "Commit this requirement as a Draft PR (with my qty override)." | "Which of planning's recommend-first requirements do I accept, and on what rationale?" |
| Scope | One working-set line | The whole inbound set, both producers (`INTERNAL_GRID` + `SOMO`) |
| Mutation | `t_pr_create` (C6-LOCK) | **None of its own** — it routes into the existing push |

The push is the *commit*; the review is the *guided-buying triage that precedes it*
— the "recommend-first" consumption the C7/IBP seam is built around
(`docs/contracts/C7-pr-intake.md` §2; IBP Reply §1: SOMO *proposes*, the buyer
confirms or overrides). **Flow order: review → plan-grid adjust-push.**

## 2. Current-state map (what existed at investigation time)

Two surfaces touched PR intake; neither was a review/triage surface:

- **`BuyerRequisitions`** (`/buyer/purchase-requisition`, TRANSACT nav) — a flat
  `PurchaseRequisition` **list** + create + read-only detail; lifecycle footer
  buttons are toast-only stubs. Reads `getRequisitions` → store-backed
  `PurchaseRequisition` rows. Those rows carry **no provenance/rationale** (the
  `source?` field exists on the type — `types.ts:594` — but all fixtures omit it).
- **`PlanGrid` intake** (`/buyer/plan-grid`, ACQUIRE nav) — read-only DSG over
  **page-local `SAMPLE_INTAKE_LINES`** (`plan-grid/planGridModel.ts`, 4 rows: 2
  SOMO + 2 Grid) + the working-set adjust-push drawer. The **only** place
  provenance-tagged `PrIntakeLine` data existed — page-local, not on the seam.

**The gap:** nowhere could a buyer *review the incoming recommend-first requirement
set with its rationale and triage it*. That is the review half.

## 3. Honest-render basis — unchanged, reused verbatim

`isLive('purchaseRequisitions')` is **`false`**: the capability is registered and
wired at gate-1 (LIVE) but **HARVEST_GATED at gate-2** (`liveness/registry.ts`,
`source: 'SOMO / Grid'` — no real producer landed; SOMO = F2/SPEC, internal Grid =
G1.2). So the review surface renders **SIMULATED × PLANNED, green structurally
unreachable**, reusing `PlanCellMarker` / `LivenessPill` verbatim. The two-gate
SIMULATED→LIVE flip stays the real event; this batch changes no liveness wiring.

## 4. Design forks — ADJUDICATED (SEAT 2, 2026-07-15)

**FORK-A — Where it lives → (b) dedicated route.**
A dedicated **`/buyer/intake-review`** route under **ACQUIRE** nav, distinct from
the plan-grid adjust-push. Review precedes push in the flow. **Do NOT fold into
PlanGrid.** (Rejected: (a) extend PlanGrid — conflates the two halves and PlanGrid
is already three dense DSG sections; (c) fold into BuyerRequisitions — reads the
flat, provenance-less seam.)

**FORK-B — What it consumes → (b2) promote the seam.**
Promote `PrIntakeLine` to the service seam: **`getPrIntake(scope): Promise<Page<PrIntakeLine>>`**
on `IDataService` + a mock fixture. The review surface consumes it; honest SIMULATED
via the same `purchaseRequisitions` capability. **PlanGrid repoint onto the seam is
OPPORTUNISTIC — not required this batch (no scope creep).** (Rejected: (b1) two
surfaces reading a page-local const is not a real read.)

**FORK-C — What review DOES → (c2) with a hard guardrail.**
Review introduces **NO new mutation path.**
- **Accept-as-suggested ROUTES to the existing push** — `t_pr_create`, no override,
  the *same* `usePurchaseRequisitionCreate` hook. Not a new verb.
- **Dismiss/defer = UI-only ephemeral local state, HONESTLY LABELED non-persistent**
  ("dismissed this session — not persisted"). It must NOT render as a seam change or
  a committed rejection, and cannot masquerade as persistence.
- **Persisted reject (c3) RULED OUT** — needs a new verb, violates one-mutation-path.

**FORK-D — Surface "the why" → add `deficit?` ONLY.**
Add **`deficit?`** to `PrIntakeLine`: additive, nullable, read-only, SIMULATED — the
recommend-first rationale, the point of triage (C7 §2 names it). **DEFER `bomContext`
and `shortfall`** (shortfall is structurally zero until SOMO Phase 4 — surfacing now
= an always-empty column).

## 5. Build shape (approved)

A dedicated **`/buyer/intake-review`** (ACQUIRE nav) consuming a promoted
**`getPrIntake`** seam, doing **triage + accept-routes-to-push + honest local
dismiss**, with **`deficit?`** added to surface the why. Honest SIMULATED×PLANNED
throughout; `PlanCellMarker` / `LivenessPill` reused verbatim. PlanGrid repoint is a
later opportunistic follow-up.

## 6. Constraints (binding on the build)

Additive-only · **ONE mutation path** (the push — review introduces none) · **no new
event type** · honest-by-construction (SIMULATED×PLANNED, green unreachable) ·
identity-clean · **NO co-author trailer**. Independent of Phase-A tasks 2 (retire
`extraRfqs`) and 3 (quote-scoring primitive). TDD; browser QA before operator smoke;
test floor never regresses.

## 7. Provenance

Investigation at `main` #75 (canon de-pressurize merged). Grounding: `C7-pr-intake.md`
(intake shape, two producers, provenance), `C6-planning.md` (two-axis honesty model),
`plan-grid/planGridModel.ts` (`PrIntakeLine`, `SAMPLE_INTAKE_LINES`, C6-LOCK helpers),
`liveness/registry.ts` (`purchaseRequisitions` two-gate), `MockProcurementService.ts`
(`getRequisitions`), `BuyerRequisitions.tsx` + `PlanGrid.tsx` (current surfaces),
`AppRouter.tsx` + `SidebarV2.tsx` (routing/nav). Adjudicated by the operator
2026-07-15 (GO, recommended shape; FORK-A=b, FORK-B=b2, FORK-C=c2+guardrail, FORK-D=deficit-only).
