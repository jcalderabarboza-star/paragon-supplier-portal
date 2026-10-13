# Contracts index — corrected replacement for `docs/contracts/README.md`

**Status:** v3 · 2026-10-13 · written read-only from `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c` (the merge commit of PR #439, MD-4 + MD-5; this file was first written and fact-checked at `3021f3d6…`, the merge of PR #438, and then re-pinned). v2 of this file was pinned at `166a5611…` (PR #418) and tagged `handover-v2` at `b0f9a97b` on 2026-10-09; v1 is the tag `handover-v1` (`9cc535b`). PRs #420–#439 have merged since the v2 tag (ADM-1, UI-1a to UI-1e, PG-1 to PG-3, FB-1 to FB-4, MD-1, MD-2, MD-2b, MD-4 + MD-5). `CHANGES_SINCE_V2.md` says what a reader of v2 must unlearn; `SE_BACKLOG_v3.md` holds what was left open. **What moved in this file:** C1's three figures (§1, read from C1's header at the pin), a new row for C13, C3's two new fields, and §3's figures. **At the re-pin (PR #439):** C1's figures again (163 verbs, 33 flows, 27 targets), the C1 and C13 rows (C13 gained §8, change requests), and §6, which is now the **v3 state-machine census**, run by Seat 3 at this pin (`CENSUS_v3.md`); v2's census is kept there as one line.
**Rule:** every count below is taken from a pinned source and names the test that pins it. No figure is restated from memory or from the current README. Where a contract has no pin, its figures are not repeated here.

---

## 1 · The three counts (from C1, pinned)

| Count | What it measures | Value at the pin | Pin |
|---|---|---|---|
| Service surface | methods on `IDataService` (`src/services/data/types.ts`) | **76** | `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` (C1 Axis 1) |
| Transition catalogue | authored verbs across the registered flows | **163** across **33** flows | same test (C1 Axis 2), derived from `getKnownFlows()` |
| Wired CommandTargets | entities the dispatcher writes through | **27** | same test (C1 Axis 3), from `WIRED_COMMAND_TARGETS` (`MockCommandService.ts`) |

`docs/contracts/C1-methods.md:3-4` carries these figures and the pin fails when the document or the tree drifts. Since the previous issue (66 / 115 / 25 / 19) C1 was re-harvested six times by the pin going red: A2 (`intakeLine`), A3 (two response verbs), B1 (`IPlanningService`), B4a (`forecastPublication`, `getPublications`), B4b-1 (`getPublicationWorkspace`), M1 (`IModuleService`, `moduleActivation`). **Since v1 (71 / 127 / 28 / 22)** the pin went red and C1 was re-harvested at SDC-5 (128: `t_publication_discard`), SRC-1 (129), RFx-1 (132; the `stageResponse` flow and its target, so 29 flows and 23 targets), RFx-2 (136), RFx-3 (138) and OPS-2 (72 methods, 141 verbs, 30 flows, 24 targets: the `materialRuling` flow and its target, `t_gr_record_inspection`, `t_invoice_reapprove`); OPS-2b, OPS-3, SUP-1, SUP-2, FIN-1, E2E-1 and E2E-2 moved no figure; the per-batch figures are from Seat 2's state file. **Since the v2 pin (72 / 141 / 30 / 24)** C1 was re-harvested by the pin going red four times, each recorded in C1's own dated notes: FB-1 (143 verbs, 31 flows, 25 targets: the `flowVersion` flow and its target), MD-1 (76 methods: `IMasterDataService`, four read methods), FB-3 + FB-4 (154 verbs, 32 flows, 26 targets: nine more acts on `flowVersion`, and the `processStep` ledger flow with two acts and its target) and MD-4 + MD-5 (163 verbs, 33 flows, 27 targets: the `masterDataRequest` flow with nine acts and its target). ADM-1, FB-2, MD-2 and MD-2b moved no figure and each has a note. *C1's own MD-4 and MD-5 note states that step as "143 → **152** across 31 → **32** flows; wired targets 25 → **26**": the branch's figures before FB-3 + FB-4 was merged into it. C1's header and its Axis 2 and Axis 3 sections read 163 / 33 / 27, and PR #439 says the same ("163 transitions, 33 flows, 27 wired targets after the merge with FB-3+4"). The note also points at "`C13-master-data.md` §9" for change requests; they are C13 §8 (D8 §11).* The end figures are C1's header at the pin (`docs/contracts/C1-methods.md:3-4`). The contracts README's three numbers are held equal to C1's header by `src/handoverFigures.pin.test.ts` and read 76 / 163 / 27 at the pin. *The copy of this file in the repository (`docs/handover/D7_CONTRACTS_INDEX.md`) was edited in place after the v2 tag, at ADM-1 and MD-1, and at this pin its §1 table still reads 72 / 141 / 30 / 24 while the repository's D1 reads 76 methods; this draft corrects that.*

Not behaviour-wired at the pin (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`, C1 "Wiring census"): `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment`. Two of them (`goodsReceiptLine`, `invoiceMatch`) are rolled-up sub-flows; four are inert.

## 2 · The contracts

Changed since the `handover-v2` tag (`git diff --stat handover-v2..main -- docs/contracts`, five files): C1 (the ADM-1, FB-1, MD-1, MD-2 and MD-2b, FB-2, FB-3 + FB-4 and MD-4 and MD-5 notes), C3 (two event fields), C5 (one figure), the README (a row for C13 and the three counts), and **C13, which is new** and gained §8 (change requests) at #439. Unchanged since the tag: C2, C4, C6, C7, C8, C9, C10, C11, C12. v2's own line here listed what had changed since the v1 pin (C1, C5, C7, C10, C12 and the README); that record is in the `handover-v2` tag.

| Contract | Governs | Status (the document's own header) | Pinned by | State at this pin (rows not named in the line above are carried from v2) |
|---|---|---|---|---|
| **C1 — Method surface** | `IDataService`, transition catalogue, wired targets, dispatcher pipeline (including `MODULE_INACTIVE` and, new, `STEP_PENDING`) | CONTRACT, pinned | `c1MethodSurface.contract.test.ts` | current (76 / 163 / 27). Since v2: `CommandInput.bypassReason` and the Super Admin exemption (ADM-1); `t_invoice_create` requires `lines`; `t_gr_create` names the receiver; the `flowVersion` machine and its refusals; the dispatcher's one optional dependency `flowOverlay`; `CommandTarget.applyTransition` takes a sixth, optional argument, `bypass`; `IMasterDataService`; the `masterDataRequest` machine, its four atoms and its refusals by hook (RE-HARVEST MD-4 and MD-5; that note's step figures and its "C13 §9" are stale, §1 above). Two older statements are marked in C1 as overtaken and left as the record: the material lookups no longer read the frozen fixture, and there is no second master (NOTE, MD-2 and MD-2b) |
| **C2 — Schemas + DTO-v2** | entity shapes, `Page<T>` (DR-5), `DataError` (DR-4) | no status line; shape LIVE, pagination RESERVED | **no pin** | unverified field by field; unchanged since before 25 September |
| **C3 — Events** | `TransitionEvent`, `AuditSink`, correlation/causation | LIVE (in-memory) | `c3Events.contract.test.ts` (field for field, both directions) | gained optional `subject?` at G1. **New since v2:** `bypass?: { rules, reason }` (ADM-1) — present only on an act a Super Admin seat took past a four-eyes, segregation or sample-identity check; and `flowVersion?: string` (FB-4) — `<entity>@<version>`, the version of the process the act was taken under, present on every event a dispatcher with a `flowOverlay` emits about a registered transition, refusals included; absent where no overlay is injected. Also documents `decision?` and `attribution?` |
| **C4 — Snowflake** | the analytical layer | SPEC, zero code | none (nothing to pin) | unchanged |
| **C5 — Seams** | the swap-points and their tiers | CONTRACT | `pinReach.contract.test.ts` (cited files; the tier column is NOT pinned) | corrected at H1 (v2). Since v2 one line moved: `httpDataService` implements "all 76 methods". **Still missing:** rows for the planning read seam and the module seam (D8 §0), and now also for the master-data read seam and the `flowOverlay` dependency (D8 §11) |
| **C6 — Planning doctrine** | PLANNED-as-axis, plan-draft shape, push pipeline, view vs plan state | CONTRACT, amended 2026-09-28 (A1-R2, A1-R2a, A1-R4) | **no pin** | records FORK-G1 as ruled (react-datasheet-grid, 2026-07-14) and names FORK-G1′, the AG Grid ruling of 2026-09-28 (`:16`). v1 said it did not; that was wrong at v1's own pin (D8 §8) |
| **C7 — PR intake** | `PrIntakeLine` → `intakeLine` → `t_pr_create`; two producers; provenance; bucket; the requisition's origin | CONTRACT, Amendment 1 (2026-09-28), **Amendment 2 (2026-10-02: who commits, one intake population, `INTAKE_ONE_GRAIN`)**, **Amendment 3 (2026-10-05: what a committed requisition carries; acting on many at once)** | `ledgerTruth.test.ts` (C7-FIND-03) | C7-FIND-02 and -05 CLOSED AT A2; C7-FIND-03 OPEN; the heading self-contradiction was corrected at H1 (`:464-467`); the field table now carries `unitPrice` (PLN-1) and marks `period` as becoming `periodBucket` by ruling (`:406`) |
| **C8 — Forecast publication** | SOMO plan versions → publication machine → supplier response | CONTRACT, Amendment 1 (2026-09-28: A1-R1, A1-R6, A1-R7) | `ledgerTruth.test.ts` (C8-FIND-03: "the VOID commitmentClass mapping is still in code") | §2.2 `commitmentClass` still UNRATIFIED; Amendment 1 says so (`:20`); A1-R6 obliges rendering raw `lockState`/`approvalState` beside the class. Unchanged since v1, so it does **not** record SDC-1 (one current publication per grain) or SDC-5 (`Discarded`); the flow and the guide do |
| **C9 — `material_master_ref`** | the material crosswalk schema | CONTRACT, fifth issue (Amendment 3, 2026-08-06); zero rows | `ledgerTruth.test.ts` (§7); `materialMasterRef.contract.test.ts` (required fields) | unchanged; ratification is SOMO's |
| **C10 — Identity, authority, approval** | persons, roles, ledgers, attribution | CONTRACT, Amendment 1 2026-09-24, errata 2026-10-02 (H1; "corrections of fact … not yet ratified"); blob `6725fa586c8fa7b0f5c4e749e6741611d1aaff6f` at the pin | **no pin** | unchanged since v2. Still stale: the §2.4 PR-approval and invoice-approval rows (`:172-173`). **New staleness:** its role vocabulary predates both administrator roles and the Super Admin exemption; PR #420 says so and records them in C1 and C3 instead |
| **C11 — Invariant pointer** | invariants, each naming its enforcer or `NOT ENFORCED` | CONTRACT, pinned bilaterally | `c11Invariants.contract.test.ts` | **V15 is now `GATE`** (`src/lib/documentNumberGate/documentNumberGate.test.ts`, PR #392) and is listed among "the properties you must assert yourselves"; V16, V17 `NOT ENFORCED` |
| **C12 — Backend spec** | seams, never-build rules, inherited invariants, idempotency, seam-code gap, build/publish | CONTRACT, partly pinned | `c12BackendSpec.contract.test.ts` | §2.1 V15 paragraph rewritten ("used to violate … retired at `f5338c2` … gated"); the §1 sentence about C3 was corrected at H1 (`:47`) |
| **C13 — Master data** (new, MD-1, 2026-10-12; §8 added at MD-4 + MD-5, #439) | the replica of SAP S/4HANA master data: the ruling (one direction, SAP wins, one writer), the objects, the record and its stamp, the sync run and its rules, the refusals by name, the read seam and its tenancy, how the rest of the tree reads it (MD-2, MD-2b), **change requests (§8, new)**, and what the fixture does against what the SE Team builds (§9; it was §8 before #439) | CONTRACT · authored at MD-1 | specs in `src/services/masterData/` (among them `replicaOneWriter.test.ts`), `src/services/data/mock/masterDataService.test.ts`, and C1 Axis 1 for the four read methods; the README says the document itself is prose. C13's own "Pinned by" line was not extended for §8: the request flow is held by `src/services/data/mock/masterDataRequestCommand.test.ts` and by C1 Axis 2 and Axis 3 | current, with one stale paragraph. **§8 (new):** the portal never changes a master record, it proposes — one flow, `masterDataRequest`, in memory for the session; three kinds (`material.create`, `material.change`, `supplier.change`; a create carries every field and no key); who proposes, reviews, hands off and records SAP's answer; four eyes with the Super Admin exemption; every act named; a request whose proposed field a sync run has moved cannot be agreed or sent; "approved is not exists"; the hand-off package; the two answer verbs; seventeen refusals by name with EN and ID copy; the sample answer and the sample sync, both refused on production; and what is left for SE-6. **Stale:** §9's closing paragraph still lists "change requests" among what is "not in this contract and not built" and says they "are specified when they are built" (D8 §11) |

## 3 · Figures that appear in this set and what pins them

| Figure | Where it appears | Pin |
|---|---|---|
| 76 / 163 / 33 / 27 | D1, D2, D3, D10, this index | C1 (`c1MethodSurface.contract.test.ts`); the contracts README's copy is held to C1 by `src/handoverFigures.pin.test.ts` |
| 66 guides (one EN and one ID for each of the 33 flows) | D1, D3 | `src/guides/guides.test.ts` (every flow has a pair; no pending list); the file count is `ls docs/guides` |
| 15 loose-end rows (14 in v2) | D5 | bilateral in `flowGraph.test.ts`. Read for this draft as the entries of `looseEndCensus.ts` at the pin, not re-derived by running anything: `processStep` was added (no creation verb); a `flowVersion` row was added at FB-1 and deleted at FB-3 (PRs #433, #438). PR #439 did not touch `looseEndCensus.ts` (`git diff --stat 3021f3d6..aac5f858`) |
| dead-control residue 0 | D1, D5 | `src/pages-v2/deadAffordance.guard.test.tsx` (the empty `RESIDUE` constant and the test "and the residue list stays deleted") |
| 13 refusals and their order (12 in v2; `STEP_PENDING`) | D1, D2 | `src/services/transitions/refusals.test.ts` (membership both ways, and the order against the dispatcher's construction sequence); the array is `COMMAND_REFUSALS` in `refusals.ts` |
| 28 liveness capabilities; 5 green; 1 SPEC (27 at the `handover-v2` tag) | D1, D2, D3 | pinned by `src/handoverFigures.pin.test.ts` (the count, and the green and `SPEC` subsets by name); `registry.test.ts`, `flipHarness.test.ts` and `feedProvenance.test.ts` test behaviour per capability |
| 14 system roles (13 at the `handover-v2` tag) | D2 | **pinned at H1** by `src/handoverFigures.pin.test.ts`; `businessRoles.test.ts` pins the bundles both ways |
| 16 modules | D1, D2 | **pinned at H1** by `src/handoverFigures.pin.test.ts` (the count, `PLT` the only always-on module, every default `Active`) |
| 18 sample persons (16 at the `handover-v2` tag) | D2, D4 | **pinned at H1** by `src/handoverFigures.pin.test.ts`; `simUsrNamespace.test.ts` pins the namespace |
| 54 routes (51 at the `handover-v2` tag) | D1, D3 | `src/handoverFigures.pin.test.ts`; `allRoutes.smoke.test.tsx` mounts every one |
| C5 tier column | C5 | no instrument; a spec deriving each seam's tier from `WIRED_COMMAND_TARGETS` and file existence would have caught the LivenessRegistry row |
| 9,464 tests / 517 files / 7 gate tests | D1, D2 | `scripts/floor.json`, asserted by `npm run gates` as a floor |
| 9 `localStorage` keys (6 in v2) | D1, D4 | no pin; the grep in D4's method line |
| what is still hand-written or exempt in the UI; what still reads a master-data fixture | D2 §11 | `src/lib/uiGate/` and `src/lib/masterDataGate/`: named lists held equal to the tree. No count is restated in this set |
| the handover index's own rows, blob ids and total | `HANDOVER_INDEX.md` | `src/handoverIndex.guard.test.ts` (H1) |
| the v3 census's own figures (§6: states, triggers, policy hooks, cascade links, atoms, the stranding and decision-verb counts) | this index, D6 §2, `SE_BACKLOG_v3.md` §6c | **no test pins them.** Derived once, by script, at this pin (`CENSUS_v3.md`); where the census and C1 disagree, C1's test is the authority |
| C2, C6, C10; C13's prose | — | unpinned |

## 4 · Honesty legend

**LIVE** — code exists and runs (mock / in-memory). **RESERVED** — a named swap-point with no implementation; landing it is additive. **SPEC** — a build target with zero code (since B1 the liveness registry also returns `SPEC` for a capability with no producer, `somoPlanParameters`). Partial truths are stated as partial: DNA-SEED-01 (`getCapabilities` live, `guidance?` slot unbuilt) and `Page<T>` (shape live, pagination reserved).

## 5 · Provenance and citation

Contracts are ratifiable only at a commit (C9 A-13/A-14, adopted by C10). Any issue ships the pinned SHA, the path, and the git blob id of every cited file (`core.autocrlf` makes a bare `sha256` unverifiable across platforms). C10's blob is `6725fa586c8fa7b0f5c4e749e6741611d1aaff6f` at this pin (`git rev-parse <sha>:docs/contracts/C10-identity.md`; unchanged since v2's pin `166a5611…`); it was `42e23239f1dede0692726df06572e740fec3aed7` at `191568d7…`, `6964b1c8…` and `6f1da15a…` (Amendment 1, before the H1 errata), and `8cab8a1effa1e40766733099276a9a24ebaa37da` at `dc8e774` (before Amendment 1). C10 §9 says a text change needs a new ratification; the errata describes itself as not yet ratified.

---

## 6 · State-machine census, v3 — run at this pin (2026-10-13)

**What this is.** The census Seat 3 ran for Ops Project #11 at `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c`, folded in from `CENSUS_v3.md` without re-deriving or re-counting anything. Nothing in the repository was changed by it.

**How it was derived** (the census's own statement). Two scripts run with `vite-node` inside a clean checkout of the pin, importing the shipped modules (`getKnownFlows()`, `WIRED_COMMAND_TARGETS`, `SYSTEM_ROLES`, `CASCADES`, the policy-hook registry, the module and liveness registries). The scripts were deleted after the run. No figure was counted by hand or by `grep`. **Controls, same run:** `t_gr_post` found; `t_mdr_approve` found; `t_bogus_x` absent; atom `bogus:atom` held by no role; the decision matcher finds `t_mdr_approve` with its person and separation hooks and does not match `t_gr_create`.

**Authority.** C1 is pinned to the tree by `c1MethodSurface.contract.test.ts`; where this census and C1 disagree, C1's test is the authority. On the three figures both state (33 flows, 163 transitions, 27 wired targets, and the same six flows with no target) they agree. Every other figure below is the census's own and **no test pins it**: do not copy one into a contract without its derivation.

**What v2's census read, in one line.** 30 flows, 118 states, 141 transitions, 24 wired targets, 6 flows not wired, 13 cascade links, 152 policy hooks in use, 94 role atoms — by the instrument of review R3, which also walked every dispatch site to a screen, at v2's pin (`166a5611…`, as v2 of this file recorded; `CENSUS_v3.md` names `0531e094…` for the same 30 flows and 24 targets, and both commits precede FB-1, where the figures first moved). The v3 census is a different instrument: it reads the flow definitions only. Do not subtract one from the other. Three flows were added since, all wired: `flowVersion` (FB-1; six states and eleven verbs after FB-3 + FB-4), `processStep` (FB-4) and `masterDataRequest` (MD-4 + MD-5). v2's full table and its five findings are in the `handover-v2` tag.

### 6.1 Figures

| What | Count | Derivation |
|---|---|---|
| Flows (state machines) | **33** | `getKnownFlows().length` |
| States, summed over flows | **133** | Σ `flow.states.length` |
| Distinct state names | 76 | the set of state names across flows |
| Transitions (verbs) | **163** | Σ `flow.transitions.length` |
| by trigger | user 105 · creation 25 · system 24 · cascade 9 | `transition.trigger` |
| state-preserving | 24 | `statePreserving` |
| SAP-boundary | 2: `t_gr_post`, `t_invoice_release_payment` | `sapBoundary` |
| declared not surfaced | 37 | `surfaceable.surfaced === false` |
| Wired command targets | **27** | `WIRED_COMMAND_TARGETS` |
| Flows with no command target | 6: `goodsReceiptLine`, `invoiceMatch`, `shipment`, `contract`, `obligation`, `compliance` | flows ∖ wired |
| Policy hooks registered / used by a transition | 172 / 172 | the hook registry against Σ `policyHooks`; none registered and unused |
| Cascade sources / links | 14 / 15 | `CASCADES` |
| Atoms named as a required role | 103 | the set of `requiredRole` |
| held by no lane (automation or unsurfaced only) | 15 | `rolesHolding(atom)` is empty; listed in §6.6 |
| Business roles | 14 | `SYSTEM_ROLES` |
| Sample people | 18 | `SAMPLE_PEOPLE` |
| Modules | 16 | `getModules()` |
| Liveness capabilities | 28; 5 render live (purchase orders, ASNs, goods receipts, invoices, RFQs) | `ALL_CAPABILITIES` × `isLive` |
| Test floor at the pin | 9,464 tests in 517 files; gate suite 7 | `scripts/floor.json` |

### 6.2 The flows

| Flow | States | Verbs | Target | Module | Endings |
|---|---|---|---|---|---|
| `purchaseOrder` | 7 | 7 | wired | ORD | Closed |
| `advanceShipNotice` | 5 | 6 | wired | SHP | none declared |
| `goodsReceipt` | 8 | 9 | wired | GRC | Rejected, Posted to SAP |
| `goodsReceiptLine` | 6 | 6 | none | GRC | Accepted, Rejected, Returned |
| `invoice` | 8 | 9 | wired | INV | Remittance Received |
| `invoiceMatch` | 5 | 4 | none | INV | Matched |
| `rfq` | 6 | 12 | wired | SRC | Awarded, Concluded, Cancelled |
| `quotation` | 5 | 5 | wired | SRC | Awarded, Rejected, Withdrawn |
| `stageResponse` | 2 | 4 | wired | SRC | Submitted |
| `shipment` | 8 | 8 | none | SHP | Delivered |
| `contract` | 4 | 4 | none | CTR | Terminated |
| `obligation` | 2 | 2 | none | CTR | Completed |
| `purchaseRequisition` | 6 | 7 | wired | REQ | PO Created |
| `supplierDocument` | 4 | 5 | wired | CMP | Valid |
| `compliance` | 3 | 3 | none | CMP | Valid |
| `requirementResponse` | 6 | 9 | wired | SDC | Superseded |
| `inventoryDeclaration` | 1 | 2 | wired | SDC | Declared |
| `incomingShipment` | 4 | 4 | wired | SDC | Arrived, Cancelled |
| `enforcement` | 1 | 1 | wired | GRC | Governed |
| `role` | 1 | 1 | wired | PLT | Defined |
| `supplierApplication` | 4 | 4 | wired | SUP | Approved, Rejected |
| `materialRequest` | 4 | 4 | wired | MAT | Approved, Rejected |
| `psl` | 4 | 8 | wired | PSL | Withdrawn, Rejected |
| `pslCapSetting` | 1 | 1 | wired | PSL | Governed |
| `deliveryRelease` | 2 | 3 | wired | CTR | Released |
| `deliveryPolicy` | 1 | 1 | wired | CTR | Governed |
| `intakeLine` | 3 | 3 | wired | PLN | Committed |
| `forecastPublication` | 5 | 7 | wired | SDC | Superseded, Withdrawn, Discarded |
| `moduleActivation` | 1 | 1 | wired | PLT | Governed |
| `materialRuling` | 1 | 1 | wired | CMP | Governed |
| `flowVersion` | 6 | 11 | wired | PLT | Rejected |
| `masterDataRequest` | 8 | 9 | wired | MAT | Completed in SAP, Declined by SAP, Rejected, Withdrawn |
| `processStep` | 1 | 2 | wired | PLT | Recorded |

### 6.3 Findings: stranding states

**Definition (the census's).** A state strands a document when the machine gives it no way to an ending. Three readings, strictest first. Each is a property of the **flow definitions**; none was walked in a browser. An **ending** is a state the flow declares as one (the "Endings" column above).

**Finding 1 · Dead ends: a non-ending state with no verb out of it (2).**

| State | Note |
|---|---|
| `invoiceMatch.Qty Mismatch` | the flow has no command target; the match verdict is rolled up into the invoice |
| `invoiceMatch.Price Variance` | the same |

**Finding 2 · No ending reachable: a way out exists, but no path reaches a declared ending (2).**

| State | Note |
|---|---|
| `flowVersion.Active` | the flow's only declared ending is `Rejected`. An active version can be retired or superseded, and a retired one restored, but none of those states is declared an ending |
| `flowVersion.Retired` | the same |

In the census's words, this is a finding about what `flowVersion` **declares** as an ending, for the FB owner: either `Retired` (or a superseded state) is an ending and should be declared, or a version is meant to have none.

**Finding 3 · `advanceShipNotice` declares no ending at all.** The census lists it apart for that reason; its five states are not counted in finding 2.

**Finding 4 · No exit a person or a cascade can fire today (25).** A non-ending state whose every way out is one of: a verb on a flow with no command target; a `system` verb (an external fact, or SAP's answer); a verb declared not surfaced. The document waits on something outside the portal, or on work the SE Team has.

| Flow | States | Why |
|---|---|---|
| `purchaseOrder` | Confirmed, Partially Delivered, Delivered | exits are `system` verbs, not surfaced (delivery and close are facts from receiving and SAP) |
| `goodsReceipt` | Approved, Partially Approved | exit is `t_gr_post`, the SAP boundary |
| `invoice` | Payment Released | exit is `t_invoice_remit`, the bank's fact |
| `purchaseRequisition` | Sourcing Event | exit is `t_pr_convert`, a cascade verb with no cascade link |
| `goodsReceiptLine` | Pending, Inspected, Quarantined | no command target (rolled up into the receipt) |
| `invoiceMatch` | Pending, Pending GR | no command target; `system` verbs |
| `shipment` | Pending ASN, ASN Received, In Transit, Arrived at Port, Customs Clearance, At Dock, Unloading | no command target; carrier facts |
| `contract` | Draft, Active, Renewed | no command target |
| `obligation` | In Progress | no command target |
| `compliance` | Missing, Under Review | no command target (read-complete, write-inert) |

**Nothing in the three new flows is in finding 4.** Every non-ending state of `masterDataRequest` has a surfaced, user-fired exit. Its two SAP-answer verbs are `user` verbs in the fixture (a sample answer on a demo deployment); on production they are refused, so `Sent to SAP` waits there for the feed (SE-6). The derivation does not see that, because the refusal is a policy, not the trigger.

**Against the figure `CLAUDE.md` carries** ("37 non-terminal states no surface can leave, across 12 of 18 flows", from an earlier tree with 18 flows): the census gives **29** by its three readings (2 + 2 + 25) across 11 flows of 33. The two are different instruments: the older one folded in surface reachability, this one reads the flow definitions only. Do not subtract one from the other.

### 6.4 Findings: decision verbs and their guards

**Definitions (the census's).** A **decision verb** is a `user`-triggered verb on a wired flow whose id ends in one of approve, approve_firm, reject, decline, decide, award, grant, verify, accept, release, release_payment, publish, activate, restore, retire, rollback, conclude, cancel, withdraw, hand_off, override, set, complete, sap_complete, sap_decline. **51** verbs match. A guard is read **by hook name**: a person hook ends `_named` or `_attributed`; a separation hook ends `not_requester`, `not_proposer` or `not_approver`. A check made inside a broader hook is invisible to this reading; the known cases are marked. A **hook-less verb** is a decision verb with no policy hook at all.

**Finding 5 · No policy hook at all (2).**

| Verb | Atom | Note |
|---|---|---|
| `t_incomingshipment_cancel` | `incomingshipment:cancel` | the role gate and the scope check are the only checks |
| `t_intake_restore` | `intake:triage` | the role gate is the only check |

**Finding 6 · No hook that requires a named person (7, the two above included).**

| Verb | Atom | Other hooks | Note |
|---|---|---|---|
| `t_invoice_release_payment` | `invoice:pay` | `invoice_releaser_not_approver` | the separation hook compares persons; there is no separate named-person hook on this verb |
| `t_rfq_questionnaire_set` | `rfq:create` | two content hooks | sets up an event; not a decision on a document somebody else raised |
| `t_rfq_criteria_set` | `rfq:create` | three content hooks | the same |
| `t_incomingshipment_cancel` | `incomingshipment:cancel` | none | as finding 5 |
| `t_enforcement_set` | `enforcement:set` | `enforcement_set_governed` | **declared not surfaced.** By the project rules its governed hook refuses an unattributed and a sample actor for a loosening; not re-verified by the census |
| `t_intake_restore` | `intake:triage` | none | as finding 5 |
| `t_material_ruling_set` | `material:rule` | `material_ruling_governed` | **named inside the hook** (`RULING_ACTOR_UNATTRIBUTED`), so guarded in fact; unguarded only by this name-based reading |

The census's own reading: the verbs to look at are the first and the two of finding 5. The others are a set-up act, an unsurfaced verb, or a false positive of the name-based reading.

**Finding 7 · Separation of persons (four eyes): "decide" against "raise".** Eight verbs carry a separation hook, from five hooks:

| Hook | Verbs |
|---|---|
| `invoice_releaser_not_approver` | `t_invoice_release_payment` |
| `materialrequest_decider_not_requester` | `t_materialrequest_approve`, `t_materialrequest_reject` |
| `psl_decider_not_proposer` | `t_psl_grant`, `t_psl_reject` |
| `flowversion_approver_not_proposer` | `t_flowversion_approve` |
| `mdr_approver_not_proposer` | `t_mdr_approve`, `t_mdr_reject` |

**Fifteen approve / reject / grant / award / verify / activate verbs carry a named-person hook and no separation hook.** Each names who decided; none checks that the decider is a different person from whoever raised the document.

| Verb | Person hook |
|---|---|
| `t_gr_approve`, `t_gr_partial_approve`, `t_gr_reject` | `gr_disposer_named` |
| `t_invoice_approve` | `invoice_approver_named` |
| `t_rfq_award` | `rfq_actor_attributed` |
| `t_pr_approve` | `pr_decider_named`, `pr_approval_attributed` |
| `t_pr_reject` | `pr_decider_named` |
| `t_supplierdoc_verify`, `t_supplierdoc_reject` | `supplierdoc_actor_named` |
| `t_role_grant` | `role_granter_named` |
| `t_application_approve`, `t_application_reject` | `application_decider_named` |
| `t_publication_approve_firm` | `pub_actor_attributed` |
| `t_flowversion_reject`, `t_flowversion_activate` | `flowversion_decider_named` |

In the census's words: whether each of these **should** have a separation check is a ruling, not a defect by itself. Several are separated by lane (the atom that raises and the atom that decides sit in different lanes), and the open finding `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` is about the requisition pair specifically. This table is the population that ruling would be made over. It is entered in D6 §2 as an open decision for Paragon, and is not a defect row.

**Finding 8 · Decision-shaped verbs on flows with no command target (4).** `t_grline_accept`, `t_grline_reject`, `t_grline_release`, `t_obligation_complete`. They cannot be dispatched, so no guard on them can fire.

### 6.5 Where the findings went

Each finding is a row of `SE_BACKLOG_v3.md` §6c: finding 1 → row 185; 2 → 186; 3 → 187; 4 → 188; 5 → 189; 6 → 190; 7 → 191 (a decision, and D6 §2); 8 → 192; the atoms of §6.6 → 193. Two findings of v2's census are outside what this instrument reads and are carried unchanged, not re-examined: verbs declared for a screen and fired by none (backlog row 95), and the shipped `surfaceable.test.ts` list over-reporting (row 96).

### 6.6 Atoms held by no lane (15)

No business role holds these, so no person can take the verb; the automation grant or a cascade does, or the verb is not surfaced.

`po:issue`, `po:fulfil`, `po:close`, `asn:carry`, `invoice:match`, `quotation:award`, `quotation:reject`, `quotation:withdraw`, `shipment:create`, `shipment:advance`, `pr:source`, `pr:convert`, `requirementresponse:supersede`, `publication:supersede`, `flow:supersede`.

### 6.7 What this census does not say

- **It reads definitions, not screens.** "Surfaced" is each transition's own declaration; whether a screen really offers the verb is the dead-affordance and handoff gates' subject, not the census's.
- **Guards are read by hook name.** A hook that checks a person inside a broader rule is not seen (finding 6 marks two). A hook whose name matches and whose body does less is not caught either.
- **The decision-verb list is a word list.** A decision named with another word is not in it, and a non-decision ending in one of the words is (the two `rfq_…_set` verbs are examples).
- **Policies that refuse by deployment** (the sample SAP answer, the sample sync) are not visible in a trigger.
