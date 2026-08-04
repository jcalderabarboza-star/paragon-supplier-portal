# Contract Package v1

**Status:** SE-Team Stage-1 kickoff artifact · generated from code-truth at `main` (Phase 2′
stamped contract-complete, F0.4/#58) · additive, docs-only.
**Partially corrected 2026-08-03 at `main` #157 (`063adca`)** — C7 re-harvested, C8 issued, the
wired-target count fixed (6 → 10). See the correction record at the top of
[C7](./C7-pr-intake.md) for the systematic cause: **these documents are generated once and never
re-harvested, so they drift in one direction — toward understating the implementation.** C1–C5
have NOT been re-verified in this pass and should be assumed to carry the same class of drift.

This package is the **contract the real backend implements**. Every count, shape, and seam
below is harvested from the shipped code, not narrated from memory. The portal today runs
entirely on in-memory fixtures behind `mockDataService`; this package names exactly which
surfaces are BUILT, which are RESERVED swap-points, and which are SE-Team build targets with
zero code yet — so the backend work is additive against a frozen contract, never a refactor.

## Components

| File | Scope |
|---|---|
| [C1 — Method surface](./C1-methods.md) | The `IDataService` service contract, the transition catalog, the command spine (dispatcher + `CommandTarget`) |
| [C2 — Schemas + DTO-v2](./C2-schemas.md) | Entity type shapes, `Page<T>` envelope (DR-5), `DataError` (DR-4), the read-projection boundary (G1) |
| [C3 — Events](./C3-events.md) | The single `TransitionEvent` taxonomy (DR-10), correlation/causation grouping |
| [C4 — Snowflake](./C4-snowflake.md) | The clean-data-layer seam — **SPEC / target architecture, zero code today** |
| [C5 — Seams](./C5-seams.md) | `IDataService` / `getCapabilities` (DNA-SEED-01) / SAP boundary (Option B) / INT-TMS-01 / LivenessRegistry |
| [C6 — Planning](./C6-planning.md) | PLANNED-as-axis doctrine (Stage G): PlanDraft shape · overlay rule · push pipeline · causation-grouped audit · source-tier × plan-state honesty matrix |
| [C7 — PR intake](./C7-pr-intake.md) | The shared PR-intake seam for two producers (internal Grid + external SOMO/IBP via F2 Event Mesh): `PrIntakeLine` → `t_pr_create` · source×liveness provenance (reuses C6) · RM/PM-leaf scope · grain-gap register. **Corrected 2026-08-03** |
| [C9 — `material_master_ref`](./C9-material-master-ref.md) | The **material-identity crosswalk** between Paragon's master and SOMO's codes: identity keys on **SPECIFICATION** (S/4 MATNR semantics) on an **irreversibility** argument · every row carries a **`grain` tag** (`substance`/`specification`) + confidence + adjudication provenance · **`materialCode` OPAQUE, permanently** · **adoption ≠ discovery**, enforced structurally · **absence is UNKNOWN**, so an empty map is an honest one. **SCHEMA + TYPES ONLY — zero rows, zero consumers.** Awaiting SOMO ratification (R-1…R-6). **First issue 2026-08-03** |
| [C8 — Forecast publication](./C8-forecast-publication.md) | The forecast-publication sibling to C7 (Supplier Data Collaboration lane): SOMO emits material×period totals, **the portal owns the supplier fan-out** · `commitmentClass` projected by us (**mapping UNRATIFIED**) · bucket-native grain · supplier-response feedback → Snowflake commons. **First issue 2026-08-03**; supersedes the unratified proposal |

---

## Honesty legend (three-tier — applied rigorously)

Every seam and surface in this package carries exactly one tier. **Do not read a lower tier as
a higher one.** Partial truths are stated as partial, never rounded up to LIVE.

| Tier | Meaning |
|---|---|
| **LIVE** | Code exists and runs — mock / in-memory implementation shipped. |
| **RESERVED** | Named seam with a defined swap-point (interface / prop / context) but no implementation. Landing it is additive: the contract does not change. |
| **SPEC** | SE-Team build target. **Zero code today.** Appears in this package only as a pointer to what gets built. |

**PARTIAL truths — carried explicitly, NOT rounded to LIVE:**

- **DNA-SEED-01** — `getCapabilities(scope)` is **LIVE** (mock-backed via `capabilitiesFor` =
  persona-role map × flow catalog). The **`guidance?` prop slot is NOT built** — the inline
  state / deferred-action primitives it belongs on have not landed. The seed is therefore
  **half-present**: capability surface LIVE, guidance slot RESERVED.
- **`Page<T>`** — the **envelope shape is frozen** (`items` / `cursor?` / `total?`), every list
  read returns it. **Pagination machinery is deferred**: the mock returns everything in `items`
  and leaves `cursor` null. Shape LIVE, pagination RESERVED.

**C4 Snowflake is SPEC.** It is the target architecture the SE-Team realizes — the clean-data
moat named in the benchmarking report. It **does not exist in code** (grep-confirmed: zero
matches). It must never read as an existing seam.

---

## The three counts (distinct axes — never collapsed)

These are **three different measurements** of the command/data layer. They are not the same
number seen three ways.

| Count | What it measures | Where |
|---|---|---|
| **55** | The `IDataService` **service surface** — every method taking `QueryScope` first (51 reads + `dispatch`/`getCommandStatus`/`settle` + `getCapabilities`). Confirmed two ways: manual enumeration + a `\w+(scope` signature grep (exactly 55). | `src/services/data/types.ts` |
| **72** | The **transition catalog** — every authored state-machine edge (`id: 't_…'`) across the 14 registered flows. This is the *verb* surface, distinct from the service surface. | `src/services/transitions/flows/*.ts` |
| **10** | The **wired CommandTargets** — entities with a live per-entity adapter the dispatcher writes through: `purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`, **`purchaseRequisition`**, **`requirementResponse`**, **`inventoryDeclaration`**, **`incomingShipment`**. | `MockCommandService.ts:976-987` |

**55 ≠ 72 ≠ 10.** 55 is the read/write API a page calls. 72 is how many transitions exist in the
schema. 10 is how many entities are behavior-wired today.

> **⚠️ CORRECTED 2026-08-03 (C7 D-10) — this count read `6`, and its prose was wrong twice.**
> The census has moved **6 → 7** (G1.1 PR intake) **→ 8** (SDC-2a RequirementResponse) **→ 10**
> (SDC-3a InventoryDeclaration + IncomingShipment); the code tracks the evolution itself at
> `MockCommandService.ts:989-991`. The prior prose additionally listed **`purchaseRequisition`
> among "the 6 inert machines"** — it is wired (`:983`) and has been since G1.1. Both the number
> and the classification were stale in the same direction: understating the implementation.
> See the C7 correction record for the systematic cause.

Still NOT behavior-wired: the 2 rolled-up sub-flows (`goodsReceiptLine`, `invoiceMatch`) and the
inert machines — `shipment`, `contract`, `obligation`, `supplierDocument` (F0.4) plus the I3.1
canonical `compliance` machine. See C1 for the full census.

> **I3.1 delta.** Service surface 54 → **55** (`risk.getComplianceRegistry`), transition catalog
> 69 → **72** / 13 → **14** flows (`compliance.flow.ts`), wired targets unchanged at **6** — the
> compliance machine is inert (SIMULATED via the LivenessRegistry until the Track-R harvest).

---

## Open findings carried forward

These are OPEN at generation time (verified against `docs/findings.md`). The contract must not
imply they are closed.

| Finding | State |
|---|---|
| **F0.2-FIND-01** | Action-layer honest-render gap: "Review match" renders as an active primary affordance at `matchStatus = 'Pending GR'` but can only inform. Minor; fix-pack candidate. |
| **F0.3-FIND-01** | `t_quotation_submit` / `t_quotation_review` authored-unwired — blocked on a quote-scoring primitive (the score axes the canonical `Quotation` requires). Do not fabricate scores. |
| **SUPPLIER-SOURCING-01** | Read half **CLOSED** (`SupplierRFQs` — invited-membership + supplier-scoped quotations + award-history re-derive). Write half **OPEN** — gated behind F0.3-FIND-01. |
| **F0.4-FIND-01** | Fixtures store clock-projected status as literals (`Expiring`/`Expired`/`Upcoming`/`Overdue`/`Expiring Soon`/`Renewed`) — violates law 0.5 (computed-never-stored). Home: read / DTO-v2 layer. |
| **Compliance (I3.1 + I3.2)** | The ONE canonical compliance machine (census #11–15) is **authored** (`compliance.flow.ts`, 14th flow, inert/SIMULATED) with the `ComplianceRegistryEntry` DTO-v2 read + `complianceProjection.ts`; **I3.2 re-pointed `BuyerCompliance` + widget onto it** (`useComplianceRegistry`, SIMULATED via `<LivenessPill>`). **CLOSED:** `HALAL-CLOCK-STATE-01`, `HALAL-UNDERREVIEW-01`, `HALAL-XPERSONA-01` (reconciliation), `F0.4-FIND-01` (cert literals) — all fixture-first mechanism; **`COMPLIANCE-CARVEOUT-01`** (page now on the seam). **Still OPEN:** `HALAL-ISSUER-BLIND-01` (downgraded — scheme-aware KPI renders, needs REAL issuer data), `HALAL-REMIND-01` (real channel), the `BuyerRisk` compliance re-point (rides the F0.6 risk-page sweep). Whole surface stays **SIMULATED-until-harvest**. |
| **DNA-SEED-01** | **PARTIAL** — `getCapabilities` LIVE; `guidance?` prop slot unbuilt (see legend). |
| **E2E-SUITE-01** | No committed Playwright suite. The two crown invariants (no cross-supplier leak · four honest states) are backstopped **in-floor by vitest** (`scoping.contract.test.ts` + `withChaos` suites). |
| **G0.1-FIND-01** | One-`causationId`-per-plan-push is INTENT, not a present capability: the public `ICommandService.dispatch(scope, input)` seam (`types.ts:1080`) accepts no caller-supplied correlation, so N push-dispatches cannot be grouped today. Seam extension (caller-supplied correlation OR model-push-as-cascade-source) is a **G1/G2 dependency** (C6 §4). Do not read the grouping as existing. |
| **C7-FIND-01 / -01a** | **BOTH CLOSED (corrected 2026-08-03).** `purchaseRequisition` **is** a wired `CommandTarget` (`MockCommandService.ts:547-593, :983`) and `t_pr_create` dispatches. **-01a closed DIFFERENTLY than prescribed**: the capability is backed **structurally** to the wired entity (`registry.ts:78`) with gate-2 harvest gating holding it SIMULATED — not the `null` backing this package specified. The shipped resolution is stronger (unwire-to-honest is structural). See C7 §3. |
| **C7-FIND-02** | **DEFECT, OPEN** — `suggestedQty` + `wasAdjusted` are documented as stored but `create` reads neither, and `PurchaseRequisition` has no field for either (`MockCommandService.ts:547-593`). The three-value qty provenance collapses to one at the write. Audit signal survives on the DR-10 event only (C7 §2.1). |
| **C7-FIND-03** | **DEFECT, OPEN** — `shortfall` was promised RESERVED so the shape would not change; it was never added to `PrIntakeLine` (`types.ts:636-653`). Landing it IS a shape change (C7 §2.2). |
| **C7-FIND-05** | **OPEN** — no idempotency contract at the intake; F2 Event Mesh is at-least-once, so a redelivered SOMO event mints a duplicate PR (`stores/purchaseRequisitionStore.ts:42-45`; C7 §2.3). |
| **C8-FIND-03** | **OPEN** — the VOID `locked → firm` `commitmentClass` mapping remains in code (`sdc/types.ts:23`) until its booked code batch; the C8 contract is authority in the interim (C8 §2.1). |
| **C7-MATERIAL-JOIN** | **OPEN** — C7 (display string) and C8 (code) material spaces do not join. Recommendation: collapse, do not crosswalk. **Not built**: `inferBpom` derives BPOM applicability from the code prefix (`GRInspectionWizard.tsx:129-163`), so a format change moves compliance behaviour (C7 §6.1). |
| **C9 §7 (7.1–7.12)** | **OPEN, twelve non-conformances declared BY the contract about itself.** *(Corrected CP-3b: this row read `7.1–7.8` / "eight" for two amendments while §7 carried twelve — the four rows added by A-3/A-4/A-9/A-13 never reached the index. **`SUMMARY-LOSS-IS-DIRECTIONAL-01` reproducing itself one layer in, inside the artifact:** the summary kept every row understating our implementation and lost the ones where we had **overstated a defect in SOMO's.** A summary that silently drops items reads as complete. Now on the floor — `src/services/contracts/__tests__/ledgerTruth.test.ts`.)* C9 states a shape we do not yet run: zero rows / zero consumers (7.1), no policy engine (7.2), **`inferBpom` parses a code the contract declares OPAQUE** (7.3, blocked on `D-COMP-BPOM`), `substanceRef` RESERVED-not-built (7.4), the master holds 5 of 35 transacting codes (7.5), the per-row invariants are type-level only and never exercised (7.6), `EA`/`PCS` unresolved (7.7), and **SOMO's side is unverifiable by us** (7.8). **The four added by amendment, and note that THREE ran the direction the ledger was not being read in** (ADD-3): we published a hazard SOMO had only undertaken to look for (7.9), two of our own clauses collided so `routeToResolution` had nowhere to live (7.10), **SOMO were ratifying our prose and not the artifact** (7.11), and **the contract was never delivered and never pinned** (7.12). None blocks ratification of the SHAPE; all block any claim the crosswalk is operational — **except 7.12, which made ratification impossible until the contract was pinned at `f492b5c`.** |
| **D-1 · substance vs specification** | **ESCALATED to Paragon procurement, NOT DEFAULTED** (C9 §6.1). The schema does not foreclose either answer: the key takes the reversible direction, the grain tag lets a row assert at one grain and stay silent at the other, and the ruling lands in `MaterialRefJoinPolicy.joinableGrains` — **either answer leaves every stored row unchanged.** Blocks CP-2 · B2b, which applies D-1 ~31 times. |
| **D-COMP-BPOM** | **WITH COMPLIANCE — BLOCKS CP-2 · B2b** (C9 §6.2). BPOM applicability is derived from a string prefix and **fails open**. The MECHANISM is ours to fix; the RULE CONTENT is compliance's to state. B2a could guarantee neutrality because every re-code preserved its first segment (pinned, `src/data/materialIdentity.test.ts`); **2B cannot** — the pin will detect a firing-set change but cannot say whether it is correct. |

**Out of scope (non-contract, design-debt):** `DP3-FONT-02`, `DP2-PALETTE-01`, `DP3-CHIP-01` are
visual-conformance sweeps, not data-contract items. Noted here only so they are not mistaken for
contract gaps.

---

## Provenance

Generated FORK-3 (machine-harvest from code-truth + thin connecting prose). Every artifact
traces to a `file:line` in the shipped tree. The backend is greenfield: zero server code, zero
datastore clients — data is in-memory fixtures behind `mockDataService` (`src/main.tsx`), tenant
scoping enforced client-side. `httpDataService` is the designed swap (see C5).
