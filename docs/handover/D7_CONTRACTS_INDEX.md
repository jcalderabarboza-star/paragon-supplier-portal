# Contracts index — corrected replacement for `docs/contracts/README.md`

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a.
**Rule:** every count below is taken from a pinned source and names the test that pins it. No figure is restated from memory or from the current README. Where a contract has no pin, its figures are not repeated here.

---

## 1 · The three counts (from C1, pinned)

| Count | What it measures | Value at the pin | Pin |
|---|---|---|---|
| Service surface | methods on `IDataService` (`src/services/data/types.ts`) | **72** | `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` (C1 Axis 1) |
| Transition catalogue | authored verbs across the registered flows | **141** across **30** flows | same test (C1 Axis 2), derived from `getKnownFlows()` |
| Wired CommandTargets | entities the dispatcher writes through | **24** | same test (C1 Axis 3), from `WIRED_COMMAND_TARGETS` (`MockCommandService.ts`) |

`docs/contracts/C1-methods.md:3-4` carries these figures and the pin fails when the document or the tree drifts. Since the previous issue (66 / 115 / 25 / 19) C1 was re-harvested six times by the pin going red: A2 (`intakeLine`), A3 (two response verbs), B1 (`IPlanningService`), B4a (`forecastPublication`, `getPublications`), B4b-1 (`getPublicationWorkspace`), M1 (`IModuleService`, `moduleActivation`). **Since v1 (71 / 127 / 28 / 22)** the pin went red and C1 was re-harvested at SDC-5 (128: `t_publication_discard`), SRC-1 (129), RFx-1 (132; the `stageResponse` flow and its target, so 29 flows and 23 targets), RFx-2 (136), RFx-3 (138) and OPS-2 (72 methods, 141 verbs, 30 flows, 24 targets: the `materialRuling` flow and its target, `t_gr_record_inspection`, `t_invoice_reapprove`); OPS-2b, OPS-3, SUP-1, SUP-2, FIN-1, E2E-1 and E2E-2 moved no figure; the per-batch figures are from Seat 2's state file, the end figures are C1's own header at the pin. The contracts README no longer carries 55 / 72 / 10: it was corrected at H1 (`docs/contracts/README.md:78-90`) and its three numbers are now held equal to C1's header by `src/handoverFigures.pin.test.ts`, so it reads 72 / 141 / 24 at the pin.

Not behaviour-wired at the pin (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`, C1 "Wiring census"): `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment`. Two of them (`goodsReceiptLine`, `invoiceMatch`) are rolled-up sub-flows; four are inert.

## 2 · The contracts

Changed since the v1 pin: C1, C5, C7, C10, C12 and the README (`git diff --name-only 6f1da15 166a561 -- docs/contracts`, six files). Unchanged: C2, C3, C4, C6, C8, C9, C11. No new contract file. C5, C10, C12 and the README changed at H1 (the D8 corrections); C1 and C7 changed at H1 and again in the review week; C1, C5 and the README changed again in PRs #411–#416; C1 alone changed in #417 and #418 (an E2E-1 and an E2E-2 block).

| Contract | Governs | Status (the document's own header) | Pinned by | State at 2026-10-08 |
|---|---|---|---|---|
| **C1 — Method surface** | `IDataService`, transition catalogue, wired targets, dispatcher pipeline (now including `MODULE_INACTIVE`) | CONTRACT, pinned | `c1MethodSurface.contract.test.ts` | current (72 / 141 / 24); `CommandTarget.create` gained a fourth parameter, the recorded decision (A2); since RFx-2 the dispatcher passes the transition id to the target's apply step |
| **C2 — Schemas + DTO-v2** | entity shapes, `Page<T>` (DR-5), `DataError` (DR-4) | no status line; shape LIVE, pagination RESERVED | **no pin** | unverified field by field; unchanged since before 25 September |
| **C3 — Events** | `TransitionEvent`, `AuditSink`, correlation/causation | LIVE (in-memory) | `c3Events.contract.test.ts` (field for field, both directions) | gained optional `subject?: { entity, entityId, from, to }` at G1 (`C3-events.md:25`, `:46-53`); also documents `decision?` and `attribution?` |
| **C4 — Snowflake** | the analytical layer | SPEC, zero code | none (nothing to pin) | unchanged |
| **C5 — Seams** | the swap-points and their tiers | CONTRACT | `pinReach.contract.test.ts` (cited files; the tier column is NOT pinned) | corrected at H1, old text quoted: LivenessRegistry is "LIVE (in-memory)" (`:26`, `:143`); the OIDC swap-point is the seat's `businessRoles` (`:22`). **Still missing:** rows for the planning read seam and the module seam (D8 §0) |
| **C6 — Planning doctrine** | PLANNED-as-axis, plan-draft shape, push pipeline, view vs plan state | CONTRACT, amended 2026-09-28 (A1-R2, A1-R2a, A1-R4) | **no pin** | records FORK-G1 as ruled (react-datasheet-grid, 2026-07-14) and names FORK-G1′, the AG Grid ruling of 2026-09-28 (`:16`). v1 said it did not; that was wrong at v1's own pin (D8 §8) |
| **C7 — PR intake** | `PrIntakeLine` → `intakeLine` → `t_pr_create`; two producers; provenance; bucket; the requisition's origin | CONTRACT, Amendment 1 (2026-09-28), **Amendment 2 (2026-10-02: who commits, one intake population, `INTAKE_ONE_GRAIN`)**, **Amendment 3 (2026-10-05: what a committed requisition carries; acting on many at once)** | `ledgerTruth.test.ts` (C7-FIND-03) | C7-FIND-02 and -05 CLOSED AT A2; C7-FIND-03 OPEN; the heading self-contradiction was corrected at H1 (`:464-467`); the field table now carries `unitPrice` (PLN-1) and marks `period` as becoming `periodBucket` by ruling (`:406`) |
| **C8 — Forecast publication** | SOMO plan versions → publication machine → supplier response | CONTRACT, Amendment 1 (2026-09-28: A1-R1, A1-R6, A1-R7) | `ledgerTruth.test.ts` (C8-FIND-03: "the VOID commitmentClass mapping is still in code") | §2.2 `commitmentClass` still UNRATIFIED; Amendment 1 says so (`:20`); A1-R6 obliges rendering raw `lockState`/`approvalState` beside the class. Unchanged since v1, so it does **not** record SDC-1 (one current publication per grain) or SDC-5 (`Discarded`); the flow and the guide do |
| **C9 — `material_master_ref`** | the material crosswalk schema | CONTRACT, fifth issue (Amendment 3, 2026-08-06); zero rows | `ledgerTruth.test.ts` (§7); `materialMasterRef.contract.test.ts` (required fields) | unchanged; ratification is SOMO's |
| **C10 — Identity, authority, approval** | persons, roles, ledgers, attribution | CONTRACT, Amendment 1 2026-09-24, **errata 2026-10-02 (H1; "corrections of fact … not yet ratified")**; blob `6725fa586c8fa7b0f5c4e749e6741611d1aaff6f` at the pin | **no pin** | the header, §8.4 and §8.5 are corrected with the old text quoted (`:7-15`, `:708-709`); still stale: the §2.4 PR-approval and invoice-approval rows (`:172-173`) |
| **C11 — Invariant pointer** | invariants, each naming its enforcer or `NOT ENFORCED` | CONTRACT, pinned bilaterally | `c11Invariants.contract.test.ts` | **V15 is now `GATE`** (`src/lib/documentNumberGate/documentNumberGate.test.ts`, PR #392) and is listed among "the properties you must assert yourselves"; V16, V17 `NOT ENFORCED` |
| **C12 — Backend spec** | seams, never-build rules, inherited invariants, idempotency, seam-code gap, build/publish | CONTRACT, partly pinned | `c12BackendSpec.contract.test.ts` | §2.1 V15 paragraph rewritten ("used to violate … retired at `f5338c2` … gated"); the §1 sentence about C3 was corrected at H1 (`:47`) |

## 3 · Figures that appear in this set and what pins them

| Figure | Where it appears | Pin |
|---|---|---|
| 72 / 141 / 30 / 24 | D1, D2, D3, D10, this index | C1 (`c1MethodSurface.contract.test.ts`); the contracts README's copy is held to C1 by `src/handoverFigures.pin.test.ts` |
| 60 guides (one EN and one ID per flow) | D1, D3 | `src/guides/guides.test.ts` (every flow has a pair; no pending list) |
| 14 loose-end rows | D2, D5 | bilateral in `flowGraph.test.ts`; cite, do not restate elsewhere |
| dead-control residue 0 | D1, D5 | `deadAffordance.guard.test.tsx:689-703` |
| 12 refusals and their order | D2 | `COMMAND_REFUSALS` order test (`refusals.ts`) |
| 27 liveness capabilities; 5 green; 1 SPEC | D1, D2, D3 | **pinned at H1** by `src/handoverFigures.pin.test.ts` (the count, and the green and `SPEC` subsets by name); `registry.test.ts`, `flipHarness.test.ts` and `feedProvenance.test.ts` test behaviour per capability |
| 13 system roles | D2 | **pinned at H1** by `src/handoverFigures.pin.test.ts`; `businessRoles.test.ts` pins the bundles both ways |
| 16 modules | D1, D2 | **pinned at H1** by `src/handoverFigures.pin.test.ts` (the count, `PLT` the only always-on module, every default `Active`) |
| 16 sample persons | D2, D4 | **pinned at H1** by `src/handoverFigures.pin.test.ts`; `simUsrNamespace.test.ts` pins the namespace |
| 51 routes | D1, D3 | `src/handoverFigures.pin.test.ts` (pinned at H1; the 47 first stated here missed four multi-line declarations); `allRoutes.smoke.test.tsx` mounts every one |
| C5 tier column | C5 | no instrument; a spec deriving each seam's tier from `WIRED_COMMAND_TARGETS` and file existence would have caught the LivenessRegistry row |
| 8,686 tests / 481 files / 7 gate tests | D1, D2 | `scripts/floor.json`, asserted by `npm run gates` as a floor |
| 6 `localStorage` keys | D1, D4 | no pin; the grep in D4's method line |
| the handover index's own rows, blob ids and total | `HANDOVER_INDEX.md` | `src/handoverIndex.guard.test.ts` (H1) |
| C2, C6, C10 | — | unpinned |

## 4 · Honesty legend

**LIVE** — code exists and runs (mock / in-memory). **RESERVED** — a named swap-point with no implementation; landing it is additive. **SPEC** — a build target with zero code (since B1 the liveness registry also returns `SPEC` for a capability with no producer, `somoPlanParameters`). Partial truths are stated as partial: DNA-SEED-01 (`getCapabilities` live, `guidance?` slot unbuilt) and `Page<T>` (shape live, pagination reserved).

## 5 · Provenance and citation

Contracts are ratifiable only at a commit (C9 A-13/A-14, adopted by C10). Any issue ships the pinned SHA, the path, and the git blob id of every cited file (`core.autocrlf` makes a bare `sha256` unverifiable across platforms). C10's blob is `6725fa586c8fa7b0f5c4e749e6741611d1aaff6f` at the pin `166a5611…` (unchanged since the previous issue) (`git rev-parse <sha>:docs/contracts/C10-identity.md`); it was `42e23239f1dede0692726df06572e740fec3aed7` at `191568d7…`, `6964b1c8…` and `6f1da15a…` (Amendment 1, before the H1 errata), and `8cab8a1effa1e40766733099276a9a24ebaa37da` at `dc8e774` (before Amendment 1). C10 §9 says a text change needs a new ratification; the errata describes itself as not yet ratified.

---

## 6 · State-machine census at the pin (2026-10-09)

The census instrument of review R3 (`docs/reviews/R3_STATE_MACHINE.md`, Appendix A) was re-run over a `git archive` export of the pin, with the export's own `npm ci`. It imports the registry, the flow-graph analyzer, the loose-end census and `WIRED_COMMAND_TARGETS`, and walks every dispatch site to a screen. The same script was run at the `handover-v1` tag (`9cc535b`) for the comparison. Two controls held: a verb known fired through a computed id reads as fired (`t_gr_approve`), and a verb known unfired reads as unfired (`t_po_view`, and `t_grline_quarantine` on an unwired flow). R3's old unfired control, `t_gr_hold`, now reads as fired, which is correct: OPS-2 gave it a caller.

**What the instrument could not see, resolved by hand.** `t_intake_commit` and `t_publication_allocate` are built by a function in `commandHooks.ts` that hooks in the same file call; the walk does not follow a same-file caller and printed both as unfired. Both are fired from the plan grid (`IntakeReviewView.tsx`, `PlanDraftProvider.tsx`, `IntakeAdjustDrawer.tsx`). They are counted as fired below.

| | v1 tag | this pin | What moved |
|---|---|---|---|
| Flows | 28 | 30 | `stageResponse`, `materialRuling` |
| States | 112 | 118 | `Discarded` (publication), `Withdrawn` (quotation), `Concluded` (sourcing event), two on `stageResponse`, one on `materialRuling` |
| Transitions | 127 | 141 | 14 added, none removed |
| Wired targets | 22 | 24 | the two new flows |
| Flows not wired | 6 | 6 | the same six |
| Derived loose ends, all censused | 13 | 14 | `materialRuling` has no creation verb |
| Cascade links | 9 | 13 | four added for invoice match and quotation withdrawal; the supersede link moved from revise to promote |
| Policy hooks in use | 92 | 152 | 147 at the previous issue; five added at E2E-1 and E2E-2 |
| Role atoms the catalogue requires | 87 | 94 | — |

The first four rows are C1's and are pinned. The rest are the census's own and **no test pins them**; re-derive them, do not quote them.

**Re-run at this pin (`166a5611…`), compared set by set with the previous issue's pin (`a7cbf415…`).** No flow, state, transition, wired target, loose end or cascade link differs. Eleven transitions gained a hook: `pr_decider_named` on two, `publication_actor_named` on three, `gr_disposer_named` on three (E2E-1), `invoice_lines_within_received` on `t_invoice_create` and `invoice_amount_is_lines_total` on `t_invoice_submit` and `t_invoice_resolve` (E2E-2). The controls held as before.

**Findings.**

1. **A document can strand in one place on a wired flow, and it is the one v1 already named.** A requisition in `Sourcing Event` has one exit, `t_pr_convert`, which nothing fires (D5 §J). Every other non-terminal state on the 24 wired flows has an exit a person takes, a cascade fires, a settlement completes, or a declared external fact supplies. The six unwired flows are inert as a whole: no store, no document.
2. **Declared for a screen, fired by none (wired flows):** `t_po_view` and `t_publication_withdraw`. Both were so at v1. On unwired flows: the six goods-receipt-line verbs, `t_obligation_track`, `t_obligation_complete`, `t_compliance_submit` — unchanged. None of the 14 verbs added since v1 is in this list.
3. **Closed since R3:** `t_gr_hold` and `t_rfq_close` now have callers. Still wired with no caller, by ruling: `t_pr_convert`, `t_psl_cap_set`; `t_enforcement_set` is fired by the seed only.
4. **Named person.** Each policy hook was fired with a seat that names nobody and with a named one. 43 verbs refuse the unnamed seat: 41 shown by the probe, and payment release and the material ruling read in source, because the probe's empty document stopped those two hooks first. Eight joined at E2E-1 (#417). **Requisition approval, the one exception of the previous issue, is closed:** the same probe through the shipped dispatcher on `pr-004` now returns `PR_DECIDER_UNATTRIBUTED` and the requisition stays `Pending Approval`; the control with no actor at all is refused too. Decision-shaped verbs that still carry no named-person check are listed in D6 §2.
5. **The shipped census of the same question over-reports.** `surfaceable.test.ts` lists five verbs as offered by no screen that screens do fire (`t_delivery_release`, `t_delivery_confirm`, `t_delivery_policy_set`, `t_intake_commit`, `t_publication_allocate`). Its gate asserts the other direction only, so nothing passes wrongly; its list is not a worklist.
