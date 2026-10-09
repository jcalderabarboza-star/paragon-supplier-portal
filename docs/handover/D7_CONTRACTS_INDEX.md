# Contracts index — corrected replacement for `docs/contracts/README.md`

**Status:** DRAFT for Seat 2 review · refreshed 2026-10-01 · from `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (PR #392).
**Rule:** every count below is taken from a pinned source and names the test that pins it. No figure is restated from memory or from the current README. Where a contract has no pin, its figures are not repeated here.

---

## 1 · The three counts (from C1, pinned)

| Count | What it measures | Value at the pin | Pin |
|---|---|---|---|
| Service surface | methods on `IDataService` (`src/services/data/types.ts`) | **71** | `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` (C1 Axis 1) |
| Transition catalogue | authored verbs across the registered flows | **127** across **28** flows | same test (C1 Axis 2), derived from `getKnownFlows()` |
| Wired CommandTargets | entities the dispatcher writes through | **22** | same test (C1 Axis 3), from `WIRED_COMMAND_TARGETS` (`MockCommandService.ts`) |

`docs/contracts/C1-methods.md:3-4` carries these figures and the pin fails when the document or the tree drifts. Since the previous issue (66 / 115 / 25 / 19) C1 was re-harvested six times by the pin going red: A2 (`intakeLine`), A3 (two response verbs), B1 (`IPlanningService`), B4a (`forecastPublication`, `getPublications`), B4b-1 (`getPublicationWorkspace`), M1 (`IModuleService`, `moduleActivation`). The current `README.md:70-75` still carries **55 / 72 / 10** and "wired targets unchanged at 6" (`:89-90`); all are stale (D8 §1).

Not behaviour-wired at the pin (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`, C1 "Wiring census"): `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment`. Two of them (`goodsReceiptLine`, `invoiceMatch`) are rolled-up sub-flows; four are inert.

## 2 · The contracts

Changed between the two pins: C1, C3, C5, C6, C7, C8, C11, C12 (`git diff --stat 6964b1c8 6f1da15 -- docs/contracts`). Unchanged: C2, C4, C9, C10, and the README. No new contract file.

| Contract | Governs | Status (the document's own header) | Pinned by | State at 2026-10-01 |
|---|---|---|---|---|
| **C1 — Method surface** | `IDataService`, transition catalogue, wired targets, dispatcher pipeline (now including `MODULE_INACTIVE`) | CONTRACT, pinned | `c1MethodSurface.contract.test.ts` | current (71 / 127 / 22); `CommandTarget.create` gained a fourth parameter, the recorded decision (A2) |
| **C2 — Schemas + DTO-v2** | entity shapes, `Page<T>` (DR-5), `DataError` (DR-4) | no status line; shape LIVE, pagination RESERVED | **no pin** | unverified field by field; unchanged since before 25 September |
| **C3 — Events** | `TransitionEvent`, `AuditSink`, correlation/causation | LIVE (in-memory) | `c3Events.contract.test.ts` (field for field, both directions) | gained optional `subject?: { entity, entityId, from, to }` at G1 (`C3-events.md:25`, `:46-53`); also documents `decision?` and `attribution?` |
| **C4 — Snowflake** | the analytical layer | SPEC, zero code | none (nothing to pin) | unchanged |
| **C5 — Seams** | the swap-points and their tiers | CONTRACT | `pinReach.contract.test.ts` (cited files; the tier column is NOT pinned) | only edit: "66 methods" → "71" (`:55`). **Still false:** LivenessRegistry "SPEC (named, no code)" (`:26`, `:130-132`); OIDC swap-point "persona→role map (`roles.ts`)" (`:22`). **Missing:** the planning read seam and the module seam (D8 §2) |
| **C6 — Planning doctrine** | PLANNED-as-axis, plan-draft shape, push pipeline, view vs plan state | CONTRACT, amended 2026-09-28 (A1-R2, A1-R2a, A1-R4) | **no pin** | records FORK-G1 as ruled (react-datasheet-grid, 2026-07-14); does not yet record the AG Grid ruling of 2026-09-28 (D6 §3) |
| **C7 — PR intake** | `PrIntakeLine` → `intakeLine` → `t_pr_create`; two producers; provenance; bucket; the requisition's origin | CONTRACT, Amendment 1 (2026-09-28: A1-R1…R4) | `ledgerTruth.test.ts` (C7-FIND-03) | C7-FIND-02 and -05 CLOSED AT A2 (register `:689`, `:692`); C7-FIND-03 OPEN; **self-contradiction**: the §2 heading still says C7-FIND-02 is open (`:375`), and `:318` still says "`period: string` … until B2" (D8 §5a) |
| **C8 — Forecast publication** | SOMO plan versions → publication machine → supplier response | CONTRACT, Amendment 1 (2026-09-28: A1-R1, A1-R6, A1-R7) | `ledgerTruth.test.ts` (C8-FIND-03: "the VOID commitmentClass mapping is still in code") | §2.2 `commitmentClass` still UNRATIFIED; Amendment 1 says so (`:20`); A1-R6 obliges rendering raw `lockState`/`approvalState` beside the class |
| **C9 — `material_master_ref`** | the material crosswalk schema | CONTRACT, fifth issue (Amendment 3, 2026-08-06); zero rows | `ledgerTruth.test.ts` (§7); `materialMasterRef.contract.test.ts` (required fields) | unchanged; ratification is SOMO's |
| **C10 — Identity, authority, approval** | persons, roles, ledgers, attribution | CONTRACT, Amendment 1 2026-09-24; blob `42e23239f1dede0692726df06572e740fec3aed7` at both pins | **no pin** | stale: header "ZERO CODE. ZERO TYPES. ZERO FIXTURE PERSONS." (`:7`); "Nothing in this document is implemented" (`:9`, `:752`); §8.4 "It does not" (the event does carry `attribution`); §8.5 `PERSONA_ROLES` (`:700`); §2.4 PR/invoice approval rows (D8 §3) |
| **C11 — Invariant pointer** | invariants, each naming its enforcer or `NOT ENFORCED` | CONTRACT, pinned bilaterally | `c11Invariants.contract.test.ts` | **V15 is now `GATE`** (`src/lib/documentNumberGate/documentNumberGate.test.ts`, PR #392) and is listed among "the properties you must assert yourselves"; V16, V17 `NOT ENFORCED` |
| **C12 — Backend spec** | seams, never-build rules, inherited invariants, idempotency, seam-code gap, build/publish | CONTRACT, partly pinned | `c12BackendSpec.contract.test.ts` | §2.1 V15 paragraph rewritten ("used to violate … retired at `f5338c2` … gated"); §1 "C3 has no pin and no reader" (`:47`) still false (D8 §4) |

## 3 · Figures that appear in this set and what pins them

| Figure | Where it appears | Pin |
|---|---|---|
| 71 / 127 / 28 / 22 | D1, D2, D3, this index | C1 (`c1MethodSurface.contract.test.ts`) |
| 56 guides (one EN and one ID per flow) | D1, D2 | `src/guides/guides.test.ts` (every flow has a pair; no pending list) |
| 13 loose-end rows | D2, D5 | bilateral in `flowGraph.test.ts`; cite, do not restate elsewhere |
| dead-control residue 0 | D1, D5 | `deadAffordance.guard.test.tsx:689-703` |
| 12 refusals and their order | D2 | `COMMAND_REFUSALS` order test (`refusals.ts`) |
| 27 liveness capabilities; 5 green; 1 SPEC | D1, D2, D3 | **pinned at H1** by `src/handoverFigures.pin.test.ts` (the count, and the green and `SPEC` subsets by name); `registry.test.ts`, `flipHarness.test.ts` and `feedProvenance.test.ts` test behaviour per capability |
| 13 system roles | D2 | **pinned at H1** by `src/handoverFigures.pin.test.ts`; `businessRoles.test.ts` pins the bundles both ways |
| 16 modules | D1, D2 | **pinned at H1** by `src/handoverFigures.pin.test.ts` (the count, `PLT` the only always-on module, every default `Active`) |
| 16 sample persons | D2, D4 | **pinned at H1** by `src/handoverFigures.pin.test.ts`; `simUsrNamespace.test.ts` pins the namespace |
| 51 routes | D1, D3 | `src/handoverFigures.pin.test.ts` (pinned at H1; the 47 first stated here missed four multi-line declarations); `allRoutes.smoke.test.tsx` mounts every one |
| C5 tier column | C5 | no instrument; a spec deriving each seam's tier from `WIRED_COMMAND_TARGETS` and file existence would have caught the LivenessRegistry row |
| C2, C6, C10 | — | unpinned |

## 4 · Honesty legend

**LIVE** — code exists and runs (mock / in-memory). **RESERVED** — a named swap-point with no implementation; landing it is additive. **SPEC** — a build target with zero code (since B1 the liveness registry also returns `SPEC` for a capability with no producer, `somoPlanParameters`). Partial truths are stated as partial: DNA-SEED-01 (`getCapabilities` live, `guidance?` slot unbuilt) and `Page<T>` (shape live, pagination reserved).

## 5 · Provenance and citation

Contracts are ratifiable only at a commit (C9 A-13/A-14, adopted by C10). Any issue ships the pinned SHA, the path, and the git blob id of every cited file (`core.autocrlf` makes a bare `sha256` unverifiable across platforms). C10's blob is `42e23239f1dede0692726df06572e740fec3aed7` at `191568d7…`, `6964b1c8…` and `6f1da15a…` (`git rev-parse <sha>:docs/contracts/C10-identity.md`); the pre-amendment blob was `8cab8a1effa1e40766733099276a9a24ebaa37da` at `dc8e774`.
