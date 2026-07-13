# Contract Package v1

**Status:** SE-Team Stage-1 kickoff artifact · generated from code-truth at `main` (Phase 2′
stamped contract-complete, F0.4/#58) · additive, docs-only.

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
| **54** | The `IDataService` **service surface** — every method taking `QueryScope` first (50 reads + `dispatch`/`getCommandStatus`/`settle` + `getCapabilities`). Confirmed two ways: manual enumeration + a `\w+(scope` signature grep (exactly 54). | `src/services/data/types.ts` |
| **69** | The **transition catalog** — every authored state-machine edge (`id: 't_…'`) across the 13 registered flows. This is the *verb* surface, distinct from the service surface. | `src/services/transitions/flows/*.ts` |
| **6** | The **wired CommandTargets** — entities with a live per-entity adapter the dispatcher writes through (`purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`). | `src/services/data/mock/MockCommandService.ts` |

**54 ≠ 69 ≠ 6.** 54 is the read/write API a page calls. 69 is how many transitions exist in the
schema. 6 is how many of the 13 flows are behavior-wired today (the other 7: 2 rolled-up
sub-flows — `goodsReceiptLine`, `invoiceMatch` — and the 5 inert F0.4 machines — `shipment`,
`contract`, `obligation`, `purchaseRequisition`, `supplierDocument`). See C1 for the full census.

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
| **Compliance → R2.2** | `COMPLIANCE-CARVEOUT-01` + the HALAL-* set (XPERSONA / CLOCK-STATE / ISSUER-BLIND / UNDERREVIEW / REMIND). The ONE canonical compliance machine (census #11–15, the 5 fragmented vocabularies) rides the `ComplianceRegistryEntry` DTO-v2 at R2.2 — it is **not** in the 13 shipped flows. |
| **DNA-SEED-01** | **PARTIAL** — `getCapabilities` LIVE; `guidance?` prop slot unbuilt (see legend). |
| **E2E-SUITE-01** | No committed Playwright suite. The two crown invariants (no cross-supplier leak · four honest states) are backstopped **in-floor by vitest** (`scoping.contract.test.ts` + `withChaos` suites). |

**Out of scope (non-contract, design-debt):** `DP3-FONT-02`, `DP2-PALETTE-01`, `DP3-CHIP-01` are
visual-conformance sweeps, not data-contract items. Noted here only so they are not mistaken for
contract gaps.

---

## Provenance

Generated FORK-3 (machine-harvest from code-truth + thin connecting prose). Every artifact
traces to a `file:line` in the shipped tree. The backend is greenfield: zero server code, zero
datastore clients — data is in-memory fixtures behind `mockDataService` (`src/main.tsx`), tenant
scoping enforced client-side. `httpDataService` is the designed swap (see C5).
