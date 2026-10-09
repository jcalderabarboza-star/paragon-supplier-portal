# Corrections — text in repository documents that is untrue at the pinned commit

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a. Seat 2 applies corrections; this draft changes nothing in the repository.
**Convention of this tree:** a false sentence in a contract or the register is retracted and quoted, not silently edited; a README or an index is simply corrected. Each section says which.
**How to read v2.** The H1 commit (2026-10-02, inside the `handover-v1` tag) applied most of the corrections v1 listed, yet v1's own text went into the tag still calling them untrue. §0 below is the disposition of every v1 row at this pin; it is authoritative. §1–§5b are kept as the record of what was asked, and each row's "current text" is the text at v1's pin `6f1da15a…`, not at this one. §10 is new.
**What the v1 refresh dropped:** the 25 September §6 (root `README.md`) and §10 (its re-check) — every row was resolved by PR #375 and is guarded (`readmeNoPersonalNames.guard.test.ts`, `readmeStructure.guard.test.ts`, `envExample.guard.test.ts`); §7.2 (C7-FIND-05) — closed at A2 by C7's own register; §5.2 and §5.3 — "no change" rows. In v1 this line read "Everything below is still untrue at the pin"; at this pin that is false, see §0.

---

## 0 · Disposition of every v1 row at `da4f1c71…`

Each "applied" row was checked by reading the cited line in the export; none is taken from the commit message.

| v1 row | Disposition | Evidence at the pin |
|---|---|---|
| 1.1–1.4 contracts README counts | **APPLIED at H1** and now pinned | `docs/contracts/README.md:78-80` reads 72 / 141 / 24; `:88-90` quotes the old 55 / 72 / 10; `src/handoverFigures.pin.test.ts` holds the three numbers equal to C1's header |
| 1.5 unwired set | **APPLIED at H1** | `README.md:104` |
| 1.6 README header | **APPLIED at H1** | `README.md:8-12` (re-issued, previous header quoted) |
| 1.7 C7-FIND-02 and -05 | **APPLIED at H1** | `README.md:131`, `:133` |
| 1.8 C10's instrument description | **not verified either way** | not found by the grep used (`partial pin`, `ratified design for a system nobody`) |
| 1.9 planning and module seams in the README | **STILL OPEN** | `grep -i -E "getPlanningFacts\|module seam\|planning read" docs/contracts/README.md` returns nothing |
| 2.1 C5 LivenessRegistry | **APPLIED at H1** | `C5-seams.md:26`, `:143-148` |
| 2.2 C5 OIDC swap-point | **APPLIED at H1** | `C5-seams.md:22`, `:115-120` |
| 2.3 C5 rows for the planning read seam and module activation | **STILL OPEN** | `grep -i -E "planning\|module" docs/contracts/C5-seams.md` returns nothing |
| 2.4 SAP boundary | no change was asked | — |
| 2.5 C5 pin reach | **APPLIED at H1** (rewritten) | `C5-seams.md:173-182` lists exactly what is guarded |
| 3.1–3.2 C10 header and opening | **APPLIED at H1 as errata**, "not yet ratified" | `C10-identity.md:7-15`, `:776` |
| 3.3 C10 §8.5 | **APPLIED at H1 as errata** | `:709` |
| 3.4 C10 §8.4 | **APPLIED at H1 as errata** | `:708`, `:777` |
| 3.5 C10 §2.4 PR approval "No `.tsx` in the tree names it" | **STILL OPEN** | `C10-identity.md:172` |
| 3.6 C10 §2.4 invoice approval "dispatchable, UI-unreachable" | **STILL OPEN**, and further from the truth since OPS-1: approval now records who approved | `C10-identity.md:173`; PR #410 |
| 3.7 C10 §8.7 | unchanged; an open verification | — |
| 4.1 C12 "C3 has no pin and no reader" | **APPLIED at H1** | `C12-backend-spec.md:47` |
| 5.1 `CLAUDE.md` heading | **APPLIED at H1** | `CLAUDE.md:211` |
| 5.2 "Stage G is DORMANT" | **APPLIED at H1** (retracted, quoted) | the block marked "RETRACTED 2026-10-02 (H1, D8 §5.2)" |
| 5.3 "Three arcs, in order. Nothing else is queued." | **STILL OPEN** | `CLAUDE.md:589` |
| 5.4 arc 2 false affordances | **APPLIED at H1** (retracted, quoted) | the block marked "RETRACTED 2026-10-02 (H1, D8 §5.4)" |
| 5a.1 C7 heading | **APPLIED at H1** | `C7-pr-intake.md:464-467` |
| 5a.2 C7 `period: string` | **APPLIED** in the tree's style | `C7-pr-intake.md:406` marks the field as becoming `periodBucket: BucketId` by ruling A1-R1 |
| 5b.1 C6 pointer to the AG Grid ruling | **was never needed** | C6 already named FORK-G1′ at v1's pin (§8) |
| 6.1–6.4 register appends | **STILL OPEN** | `docs/findings.md` is byte-unchanged since `6f1da15a…` |
| 7 design statements | stand as written; §7 gains rows below | — |

---

## 1 · `docs/contracts/README.md` (the contracts index) — replace with D7

Unchanged between the two pins, so every 25 September row stands, with the figures moved.

| # | Current text (line) | Replacement | Evidence |
|---|---|---|---|
| 1.1 | `:70` `| **55** | The IDataService service surface …` | `71`, naming the pin | `C1-methods.md:3-4`; `c1MethodSurface.contract.test.ts` |
| 1.2 | `:71` `| **72** | The transition catalog … across the 14 registered flows.` | `127` across `28` flows | same |
| 1.3 | `:72` `| **10** | The wired CommandTargets — …` with a ten-name list | `22`; the list is `WIRED_COMMAND_TARGETS` (C1 Axis 3) | same |
| 1.4 | `:74` `**55 ≠ 72 ≠ 10.**`; `:6` "(6 → 10)"; `:89-90` "wired targets unchanged at **6**" | delete; the three counts are D7 §1 | same |
| 1.5 | the "Still NOT behavior-wired" paragraph naming `supplierDocument` among the inert machines | the unwired set is `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment` | C1 "Wiring census" |
| 1.6 | header `Partially corrected 2026-08-03 at main #157 … C1–C5 have NOT been re-verified` | re-issue against `6f1da15a…`, stating which contracts were re-verified | — |
| 1.7 | `:111` C7-FIND-02 listed as "DEFECT, OPEN"; and the C7-FIND-05 row | both CLOSED AT A2 (C7 register `:689`, `:692`) | C7 |
| 1.8 | "Which contracts have an instrument": C10 described as "a ratified design for a system nobody has built" | still unpinned; add that Amendment 1 (2026-09-24) records shipped code and that a partial pin is possible | C10 amendment record |
| 1.9 | the legend lists no seam for planning or modules | add `IPlanningService` (B1) and `IModuleService` (M1) to the index's description of C1/C5 | C1 re-harvest notes |

## 2 · `docs/contracts/C5-seams.md` (contract: retract and quote)

| # | Current text | Replacement | Evidence |
|---|---|---|---|
| 2.1 | `:26` `| LivenessRegistry | **SPEC** | — (named, no code) |` and `:130-132` `## LivenessRegistry · **SPEC** … with **zero code** (grep-confirmed).` | `LIVE (in-memory)`: `src/services/liveness/registry.ts`, 27 capabilities; tier derives from `WIRED_COMMAND_TARGETS` plus a harvest gate, and `SPEC` for a capability with no producer | `registry.ts`; `registry.test.ts`, `flipHarness.test.ts` |
| 2.2 | `:22` OIDC swap-point "persona→role map (`roles.ts`)" | the seat's `businessRoles` resolved by `atomsForSeat`; `PERSONA_ROLES` "IS NO LONGER THE AUTHORISATION SOURCE" (`roles.ts:8`) | `roles.ts`; `MockCommandService.ts` |
| 2.3 | the seam table has no row for the planning read seam or module activation | add `IPlanningService.getPlanningFacts` (LIVE mock; SOMO feed SIMULATED; three measures SPEC) and `IModuleService` (LIVE mock; ledger in memory, durable RESERVED) | C1 re-harvests B1 and M1 |
| 2.4 | `## ICommandService + the SAP boundary (Option B) · **LIVE (2 verbs)**` | still true; no change (listed so nobody "fixes" it) | `sapBoundary.test.ts` |
| 2.5 | the tier column as a whole | note in `## Pin reach` that `pinReach.contract.test.ts` pins cited files, not tiers | D7 §3 |

## 3 · `docs/contracts/C10-identity.md` (contract, Amendment 1 2026-09-24; residue only)

Unchanged between the two pins (blob `42e23239…`). Whether these are applied as Amendment 2 (a new SHA and a new ratification) or as a dated errata note is Seat 2's and the operator's call; §9 of C10 says text changes require a new ratification.

| # | Current text | Replacement | Evidence |
|---|---|---|---|
| 3.1 | `:6-7` `**Status:** CONTRACT · **FIRST ISSUE, 2026-08-10** … **MODEL AND PRECONDITIONS ONLY. ZERO CODE. ZERO TYPES. ZERO FIXTURE PERSONS.**` | add `· AMENDMENT 1, 2026-09-24`; qualify: the six-object model has zero code; a fixture roster exists (`sampleRoster.ts`, 11 `sim-usr-*` rows) governed by §6.3/§6.3a | `sampleRoster.ts`; amendment record `:739-742` |
| 3.2 | `:9` and `:752` "Nothing in this document is implemented" | "§5.5, §6.2 and §6.3 are implemented (Amendment 1); §3–§4's model objects and §3.5's ledgers are not" | amendment record |
| 3.3 | `:700` §8.5: "PERSONA_ROLES grants 60+ transition-roles to a seat … (roles.ts:18-123)" | DISCHARGED in code: `PERSONA_ROLES` is a derived tenancy view (`roles.ts:8`, const now at `:35`); the dispatcher resolves `atomsForSeat(scope.businessRoles)`; a scope without `businessRoles` is refused | `roles.ts`; `businessRoles.test.ts` |
| 3.4 | `:699` §8.4: "`TransitionEvent` carries optional attribution (§6.4) — **It does not.** The event carries `actor: string` and nothing else about who acted" | **new in this refresh.** False, and already false at `6964b1c8`: `TransitionEvent.attribution?: ActorAttribution` exists (`events.ts:98`) and the dispatcher fills it from the session on `user`-trigger transitions (`dispatcher.ts:472`, `:532`); C3 documents it. Mark §8.4 DISCHARGED | `events.ts`, `dispatcher.ts`, `C3-events.md` |
| 3.5 | `:163` PR approval "**No .tsx in the tree names it.**" | historical: `BuyerRequisitions.tsx:42-43, :245-246` dispatches `t_pr_approve` / `t_pr_reject` | grep 2026-10-01 |
| 3.6 | `:164` invoice approval "dispatchable, UI-unreachable" | historical since #339 (`BuyerInvoices.tsx` → `t_invoice_approve`) | findings §105 |
| 3.7 | §8.7 "Ten capabilities wait on identity … the remaining four are not verified" | unchanged; an open verification (D6) | — |

## 4 · `docs/contracts/C12-backend-spec.md` (contract)

| # | Current text | Replacement | Evidence |
|---|---|---|---|
| 4.1 | `:47` "… C3 has no pin and no reader. It describes an interface with no implementation … the one contract in this corpus that cannot be pinned even in principle" | C3 is pinned by `c3Events.contract.test.ts`; what remains true is that the sink has no durable implementation | the test file; the contracts README already lists C3 as pinned |

## 5 · `CLAUDE.md` (seat-facing; corrected in the tree's retraction style)

| # | Current text | Replacement | Evidence |
|---|---|---|---|
| 5.1 | `:211` `## Current state (as-built: main @ #65 — F0 + I3 complete; Stage G planning canon on main)` | drop the PR number from the heading, or `main @ #392`; the block under it has been true-upped repeatedly while the heading was not | `git log` |
| 5.2 | `:535-536` "**Stage G is DORMANT, not next** — it stands where G1.3 left it and is not on the recalibrated path below." | **new in this refresh.** Overtaken: the planning grid was built at B1–B4b (PRs #382–#387) on Design 1; the grid's engine move to AG Grid is SE-1 | PR titles #382–#387; `src/pages-v2/plan-grid/` |
| 5.3 | `:576` "Three arcs, in order. Nothing else is queued." | **new.** Overtaken by the operator's rulings of 2026-09-28 (six designs) and 2026-10-01 (21 SE packages; 23 since the ruling of 2026-10-09); the arcs remain as history | D1 §4; D6 §3 |
| 5.4 | `:642-658` arc 2: "Submit for approval" fires a success toast with no dispatch (`BuyerRequisitions.tsx:520-532`) and `Pending Approval` carries "no approve or reject affordance at all" | **new.** False at the pin: `BuyerRequisitions.tsx` imports and uses `useRequisitionSubmit`, `useRequisitionApprove`, `useRequisitionReject` (`:42-44`, `:245-246`) | grep 2026-10-01 |

## 5a · `docs/contracts/C7-pr-intake.md` (contract; new in this refresh)

| # | Current text | Replacement | Evidence |
|---|---|---|---|
| 5a.1 | `:375` heading "C7-FIND-02 (DEFECT, OPEN)" | "C7-FIND-02 (DEFECT, CLOSED AT A2)", quoting the old heading; the register at `:689` already says CLOSED | C7 `:689` |
| 5a.2 | `:318` field note "still spelled `period: string` … until B2" | the field is `periodBucket: BucketId` (`src/services/data/types.ts:1094`) | types.ts |

## 5b · `docs/contracts/C6-planning.md` (optional pointer)

| # | Current text | Suggested addition | Evidence |
|---|---|---|---|
| 5b.1 | records FORK-G1 as ruled (react-datasheet-grid, 2026-07-14) | a dated pointer: the operator ruled AG Grid Enterprise with two developer licences on 2026-09-28 (FORK-G1′), recorded in `docs/designs/DESIGN_1_PLANNING_GRID.md` §8; the move is SE-1 | Design 1 §8 |

## 6 · `docs/findings.md` (register; append, never edit)

Unchanged between the two pins.

| # | Entry | Correction to append |
|---|---|---|
| 6.1 | §105 (2026-09-15): "C10 is byte-identical to `dc8e774` — blob `8cab8a1e…`" | true on its date; superseded by Amendment 1 (blob `42e23239…`, 2026-09-24) |
| 6.2 | `SUPPLIER-DASHBOARD-FALSE-AFFORDANCES-01` | the PO row actions are honest since #377 (`SupplierDashboard.tsx:733-742`); the document actions' copy is still weak (D5 §A) — close or narrow |
| 6.3 | `SIDEPANEL-I18N-01` | re-measure; not verified either way |
| 6.4 | `G0.1-FIND-01`, `DNA-SEED-01`, `F0.2-FIND-01` | the contracts README lists them open; the register's lines near `:63-64` carry `CLOSED` tokens; reconcile |

## 7 · The design documents committed with this set (`docs/designs/`, unchanged by ruling)

The designs are committed unchanged. These statements in them are overtaken at the pin; D1 §4 is authoritative where they differ. Nothing here asks for an edit.

| Design | Statement | At the pin |
|---|---|---|
| all six | "Pinned tree: `main` @ `81c98403…`" (Designs 1–5) or `de101c67…` (Design 6) | the tree has moved to `166a5611…`; file:line references may have shifted |
| Design 1 | Intake Review as a separate page; the grid below the fold; keys that lose a value | Intake Review is a view of the plan grid since PLN-3 (`/buyer/intake-review` redirects); PLN-5 fixed the layout and the keyboard |
| Design 2 | one current publication, whatever its grain; a revision replacing the prior answer while still a draft | one current publication per grain (SDC-1); a revision replaces only when sent (SDC-3); a draft publication can be discarded (SDC-5) |
| Design 3 §7 | RFQ close by a person is to be built by the SE Team | built at SRC-1 (`t_rfq_close`); the invoice match is rebuilt at OPS-1; the dispute-outcome ledger and accept-variance verb (§3.7) are still the SE Team's |
| Designs 1–6 | no design covers RFI or RFP | built as stages of one sourcing event at RFx-1 to RFx-3; the `rfq`, `quotation` and `stageResponse` guides are the only specification |
| Design 1 §10 ownership | B0, B1, B2, B4, B5, B6 are OURS | built at #378–#387 (A1, A2, B1–B4b); B3 (AG Grid), §7 Enterprise features, B7–B9 are SE-1, SE-14, SE-18 |
| Design 2 §9 ownership | B4 (chase as an act) and B5 (call-off acknowledgement) are OURS | not built; assigned to the SE Team as SE-19 by the dispatch of 2026-10-01. B1–B3 are built (#381, #385–#387) |
| Design 3 §7 ownership | OURS: E1, the V15 instrument | built at #392 (`documentNumberGate.test.ts`) |
| Design 5 Part A, B.1–B.2, Part C | the module registry, screens, guide registry and content to be built | built at #388–#391; the guide content now lives in `docs/guides/`, not `review-drafts\guides\` |
| Designs 3, 4, 5, 6 | the closing "Source file:" footer names a local Windows path containing a personal user name | resolved at H1: the five lines carry `C:\Users\<operator>\` and a guard holds them |

## 8 · The consultant's own earlier statements (so the record is straight)

| Claim (25 September issue) | Correction |
|---|---|
| "C10 is frozen and now stale; §8.1/8.2/8.6 contradicted by the code" (review of 2026-09-25) | §8.2 and §8.6 were already discharged/closed by Amendment 1; residue is §3 above |
| Risk 4, un-audited delivery writes | closed at PR #374 |
| Dead-control residue "26" | it was **29** at `6964b1c8` (`git show 6964b1c8:src/pages-v2/deadAffordance.guard.test.tsx`, 29 `{ id: … }` rows; the file's own header says 29); it is 0 at the pin |
| Sample roster "15 rows" (D2, D4, D8 §3.1) | **11** rows at both pins (`sampleRoster.ts` unchanged since `6964b1c8`) |
| `paragon.id` listed as a `localStorage` key "not measured what reads it" (D4 §5) | a false match: the grep caught the e-mail domain `supplier-support@paragon.id` in `SupplierRegistration.tsx:258`; there is no such key |
| D10 A2.4: "`t_delivery_confirm` (supplier, `delivery:confirm` atom)" | false: `delivery:confirm` is in the **procurement** lane (`businessRoles.ts:260-262`); the confirm accepts an inferred drawdown and takes no root cause. The supplier's acknowledgement does not exist (SE-19) |
| "the event carries no person / attribution on the event is C10 §8.4, still open" (D2 §4, D9 §5) | false: `TransitionEvent.attribution?` exists and is filled on user-trigger transitions (§3.4) |
| D7: "not measured which test, if any, reads C8" | `ledgerTruth.test.ts` reads C8 and pins C8-FIND-03 |
| "23 flows, 111 verbs, 17 wired targets" (review) | at `6964b1c8`: 25 / 115 / 19; at `6f1da15a`: 28 / 127 / 22; at `da4f1c71…`: 29 / 138 / 23; at this pin: 30 / 141 / 24 |
| v1 D6 §3 and D7: "C6 … does not yet record the AG Grid ruling of 2026-09-28" | false at v1's own pin: `git show 6f1da15:docs/contracts/C6-planning.md` names FORK-G1′ twice. D8 §5b asked for a pointer that already existed |
| v1 D8 header: "Everything below is still untrue at the pin" | untrue of the tag it shipped in: H1, the commit that added the file, applied most rows (§0). The file described `6f1da15a…` and was tagged at `9cc535b` |
| v1 D10 legend: "47 routes", "unpinned" | 51, pinned by `src/handoverFigures.pin.test.ts`; v1 D1 had already corrected this and D10 was not brought along |
| v1 D2 §3, §5, §7: role, capability and sample-person counts "not pinned" | pinned at H1 by the same test; v1 D7 said so while v1 D2 did not |
| v1 D3 §3 and §4: the intake verbs' atom is `pr:create` | true at `6f1da15a…`; `intake:triage` since PLN-3 |
| v1 D1, D3, D7, D10: 127 verbs, 28 flows, 22 targets, 56 guides | true at `6f1da15a…`; 141 / 30 / 24 / 60 at this pin (Seat 2's state file flagged this from SDC-5 onward) |

## 9 · The external source documents — statements the tree contradicts

These documents (the RFP, the Vision and Capabilities v1, the SE Handoff v1, the RFP Coverage Matrix v2) are not in the repository and are not committed with this set; Seat 2 does not edit them. The rows exist so nobody carries a stale statement into the repository.

| # | Document and text | What the tree shows | Evidence |
|---|---|---|---|
| 9.1 | Vision / SE Handoff: no i18n layer | built; every page and every process guide in EN and ID | `src/lib/i18n/`; `docs/guides/` |
| 9.2 | Vision / SE Handoff: the action layer is `IActionService`; `sendReminder` | no `IActionService`; `ICommandService.dispatch` over 141 verbs; no reminder verb (SE-19) and every reminder toast now says nothing was sent | C1; #376 |
| 9.3 | SE Handoff: two role namespaces to reconcile | one namespace by construction | C10 §3.3; C11 V3 |
| 9.4 | SE Handoff: `AuditSink` with `before`/`after` snapshots | `TransitionEvent` (C3), with optional `decision`, `attribution`, `subject`; no snapshots | C3 |
| 9.5 | SE Handoff: hard deadline 17 October 2026, escalation ladder, PO auto-block | halal is a design policy handled offline; no ladder, no auto-block | operator ruling; OD-2 |
| 9.6 | SE Handoff: "the decided stack" | FORK-6: the SE Team's choice | Build Plan §8 |
| 9.7 | SE Handoff: three sub-interfaces, "~40 DTO shapes" | `IDataService` composes more sub-services, including planning and modules; 72 methods pinned | C1 |
| 9.8 | Vision: "genuinely-wired workflows — registration wizard … storefront edit" | `/register` makes no service call; storefront edits are component state, and the toasts now say so | `SupplierRegistration.tsx`; `supplierMyStorefront.ts` |
| 9.9 | Vision / SE Handoff: "the ~98 named dead actions" | dead-control residue 0 (#377); toast-only handlers all admit they do nothing (#376) | guards |
| 9.10 | SE Handoff: companions "Current State of Truth", "Platform DNA" | not in the repository | `ls docs` |
| 9.11 | Coverage Matrix §2 row 1: "persona toggle carries no identity; registration form submits nowhere" | first half stale; second half still true | `identitySources.ts`; `SupplierRegistration.tsx` |
| 9.12 | Coverage Matrix §2 row 2: Forecast Collaboration "PLANNED … unbuilt" | the publication machine, publish from the grid, supplier deadline / version / net change / receipt, and supplier revise are BUILT-E2E on a SIMULATED SOMO feed (#381, #385–#387) | D10 F2 |
| 9.13 | Coverage Matrix §2 row 3: Inventory & Capacity "UI-ONLY (SHELL)" | stock on hand with batch and expiry is BUILT-E2E; capacity declared, build-deferred | D10 F3 |
| 9.14 | Coverage Matrix §2 row 4: Call-Off "UI-ONLY + PLANNED" | the buyer's release / adjust / confirm and the policy are BUILT-E2E; the supplier's acknowledgement is not built (SE-19) | D10 F4 |
| 9.15 | Coverage Matrix: "Auth module planned (OAuth2/JWT/MFA)" | no auth module; SE-3 | C5 |
| 9.16 | Coverage Matrix: "deployed on Vercel today" | true of the pre-release gate; the repository names no host | C12 §6.7 |
| 9.17 | Vision: Module Activation and Learn/Co-pilot TARGET | Module Activation BUILT (#388–#389); process guides BUILT (#390–#391); co-pilot SE-20 | D10 §7 |

## 10 · New at this pin (found while producing v2)

| # | Document and text | What the tree shows | Evidence |
|---|---|---|---|
| 10.1 | `docs/handover/` v1, all twelve files | superseded by v2; the figures that moved are listed in §8 | this set |
| 10.2 | `docs/contracts/C8-forecast-publication.md` | unchanged since v1, so it records neither "one current publication per grain" (SDC-1) nor the `Discarded` terminal and `t_publication_discard` (SDC-5) | `forecastPublication.flow.ts:67`; `git diff --stat 6f1da15 166a561 -- docs/contracts/C8-forecast-publication.md` is empty |
| 10.3 | Coverage Matrix and RFP trace rows that call RFI "ABSENT" (v1 D5 §H, D6 §2b, D10 Objective 5) | RFI and RFP are built; auctions are not | corrected in v2 D5, D6, D10 |
| 10.4 | any text that calls the sourcing module or its list "Sourcing & RFQ" on the buyer side | renamed "Sourcing events" at RFx-3; the supplier side followed at OPS-3 ("event"; the navigation entry reads "Sourcing events") | PRs #409 (addendum 2), #413. Not grepped across `docs/` in this pass |
| 10.5 | the first issue of this v2 set (2026-10-08, pinned at `da4f1c71…`) | superseded by this issue: 71 / 138 / 29 / 23 / 58 guides / 13 loose ends / floor 8,145 in 460 are now 72 / 141 / 30 / 24 / 60 / 14 / 8,686 in 481 (the second issue, at `a7cbf415…`, had the same six figures and a floor of 8,509 in 474); every row it marked for OPS-2 or OPS-3 is filled | D7 §1, §3, §6 |
| 10.6 | `CLAUDE.md`, "it tells, it does not stop" (the receipt gate) and "a grant is still recorded against … `NO_PERSON_IN_SESSION`" | both retracted in place, quoted, at OPS-2 and SUP-1 | `CLAUDE.md` at the pin |
| 10.7 | `docs/reviews/R3_STATE_MACHINE.md` (unchanged; describes `6964b1c8`): "five wired verbs no surface fires", `rfq` `Open` and `invoice` `Submitted` as dead ends, "11 loose ends" | two of the five now have callers (`t_gr_hold`, `t_rfq_close`); bidding is closed by a person; an invoice is matched on submit and on dispute resolve; 14 loose ends | D7 §6 |
| 10.8 | `docs/handover/` at the pin: `D1_SE_HANDOVER.md`, `D6_DECISION_REGISTER.md`, `D7_CONTRACTS_INDEX.md`, `D10_REQUIREMENTS_TRACE.md` | PR #417 edited these four v1 files in place (SE-22 and SE-23 added; the roster 11 → 16), so they no longer equal the `handover-v1` tag. v2 replaces all twelve and carries the same changes | `git diff --name-only handover-v1 166a561 -- docs/handover` (four files) |
| 10.9 | the final review (`qaHandover\e2e\E2E_REPORT.md`) | it owes no correction to a repository document: the guides and C1 were updated inside #417 and #418 (requisition, forecast publication, goods receipt, sourcing event, invoice, invoice match, purchase order, ship notice; EN and ID) | `git diff --stat a7cbf41 166a561 -- docs`; the guide text was not read line by line by this seat |
| 10.10 | D2 of the previous issue: "an approval made by an unnamed seat is not guarded" | false since OPS-2 (#411); corrected in this issue | D2; D6 §3a |
