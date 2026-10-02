# R0 · Deep review — summary for the Strategist and the operator

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · READ-ONLY.**
**Pinned SHA:** `main` @ **`81c98403a83a674df80959f7d2290898ddd822fa`** — the merge of PR #376 (2026-09-28 07:27 +07). PR #376 had already merged when the export was taken, so this review reads it (the dispatch expected `08c1e8c6…` or later). Verified at the remote in the same turn: `git ls-remote origin refs/heads/main` → the same object. The export was `git archive <sha>` into the scratchpad; the working copy was read only for `rev-parse`, `ls-remote`, `archive` and `status`.

---

## The top 10 findings across the five areas (ranked by user impact)

| # | Finding | Area | Impact | Size |
|---|---|---|---|---|
| 1 | **There is no planning grid.** `/buyer/plan-grid` is an award what-if over 3 quotations of one hardcoded RFQ, a 4-row intake list and a one-line drawer. No material × bucket matrix, no demand / stock / ROP, no horizon, no bulk edit. The Excel benchmark is being asked of an object that does not exist. | R1 | P1 | 4–6 batches (object + seam + grid + one governed edit verb), +6 if AG Grid |
| 2 | **Nothing publishes the forecast.** No publish verb in any flow; `FORECAST_PUBLICATIONS` is a frozen fixture; the supplier hook imports the constant, bypassing the service; runtime: 0 LIVE publications, so every supplier sees the "sample" banner permanently. The RFP's #1 pain has no write path at its source. | R2 | P1 | 3 batches |
| 3 | **Triage is not recorded and the same line can be pushed three times.** Accept/Dismiss are `useState`; reload restores "4 pending" while the minted PR survives (measured); no `idempotencyKey`. | R1 | P1 | 1–2 |
| 4 | **The "audited" override reason is required, then thrown away.** The drawer demands it, the payload carries it, `create()` never reads it, the PR has no field for it, no surface renders the audit event. The intake id is not persisted either. | R1 | P1 | 1 |
| 5 | **Chase is a read, never an act.** The chase list and `/buyer/chase` are derived and honest ("no message is sent from here"); `outboundRequestStore.append` has zero callers; nothing records that a planner chased. Half the current manual pain, untouched. | R2 | P1 | 2 (+ scheduler SE-scope) |
| 6 | **The supplier cannot answer a call-off, and cannot answer a dispute.** `/supplier/delivery-agreements` says "Paragon is waiting" with nothing to press; `delivery:confirm` is the buyer's atom. A supplier's only reply to a dispute is a re-submission, which silently orphans the dispute (measured, probe A) and silently cuts an accepted commitment (probe B). | R2 | P1/P2 | 2 + 1 |
| 7 | **Sourcing → contract → scheduling agreement is NOTHING.** No verb, no cascade; `BuyerContracts` mints `CTR-…` numbers client-side (C11 V15). `contract` and `compliance` are advertised lanes on inert flows (27 of 115 transitions can never fire). An approved PR strands: `t_pr_convert` unauthored, `PO Created` unreachable. | R3 (+R1) | P1 | 1–2 per hand-off; the contract lane is an arc |
| 8 | **The identity panel puts demo machinery first and hides the identity.** Two controls in two chrome regions (sidebar pill wipes the sample user silently); the 9-row roster is expanded while the roles list is collapsed; avatar initials are a hardcoded **"JJ"** (`IdentityPanel.tsx:230`) outside every roles-only gate; a bell with a fabricated `3`, a dead search and a dead hamburger sit beside it; picking a sample user silently narrows the seat. | R4 | P2 | B1 + B2 = 2 batches; B3 needs a ruling |
| 9 | **The grid engine has zero accessibility and no undo, sort, filter, group, totals, resize or export.** `react-datasheet-grid` ships 0 `role=`/`aria-`. Recommendation: **AG Grid Enterprise, $999/developer perpetual** — `readOnlyEdit` makes "every edit dispatches" structural; runner-up Handsontable; fallback stay on DSG with the a11y gap filed OPEN. Nothing installed. | R1 §2.1 | P2 | 6 batches to migrate; 3 to stay |
| 10 | **A Flow Builder can render everything today, and promotion is a code change, not data.** The registry lacks state labels (EN/ID), hook descriptions, layout and grouping; `validateFlow`/`analyzeFlow` are pure functions of a draft, every other gate is a vitest over the singleton; no event or DTO carries a flow version; four-eyes is inert until an IdP exists. Recommend generated, reviewed code over a runtime catalog; in-flight documents finish on their original version. | R3 §4–5 | — | render 1 · preview 1–2 · compose-draft-export 3–4 · promotion P-1…P-5 |

Honest positives, so the picture is not one-sided: the SDC review loop (review → accept/dispute → resolve) and the supplier's three objects (confirmation, SOH with batches + XLSX, incoming shipments) are **BUILT-E2E and round-trip through one store** — the best-built lane in the portal; the intake push is a real `t_pr_create`; the role lattice is sound (0 orphan atoms); the declared machine has 0 unreachable states and 0 dead transitions; EN/ID parity is exact on every surface walked.

**One retraction made before delivery, and it is worth reading:** the state-machine census classed the four buyer SDC verbs as "wired, no caller" and filed "supplier responses strand at `Submitted`" as a P1. The browser measured "Start review" dispatching (toast, state change), and the source shows a fourth non-literal dispatch source the census did not resolve (`sdcBuyerHooks.ts:186-204`). The finding is struck in R3 with the mechanism named, not softened. A bilateral control on one non-literal source cannot see a second; derive the sources.

---

## The four files

| File | Bytes | Contents |
|---|---|---|
| `review-drafts\R1_INTAKE_PLANGRID.md` | 26,217 | Q1 a–d, the Excel table (engine vs surface), the grid-engine comparison and recommendation, 14 ranked findings, 4 decisions |
| `review-drafts\R2_SUPPLIER_COLLABORATION.md` | 38,405 | §A browser walk (both seats) + capability matrix, verb census, 15 findings, Appendix-2 row by row (2 of 6 BUILT-E2E), document disagreements, verbatim probes A–E, 8-batch plan |
| `review-drafts\R3_STATE_MACHINE.md` | 106,940 | Q3 a–d derived by script (25 flows · 103 states · 115 transitions · 19 wired targets), Mermaid chain, missing-process table (OURS/SAP/SE-SCOPE), Q4 + addendum 2 promotion path, verbatim census appendix, correction header |
| `review-drafts\R4_AVATAR_IDENTITY.md` | 15,307 | Annotated walk (markers 1–20 on `Q5_A1…A4`), confusions/redundancies/demo machinery, guarantees traced to tests, before/after proposal, 4 batches |
| `review-drafts\screens\` | 49 PNG, 8,700,944 bytes | `Q1_*` intake/grid, `Q2_*` SDC both seats, `Q4_01*` process flows, `Q5_*` identity incl. 4 annotated, EN and ID |
| evidence companions | `_q1_code.md` 28,066 · `_q1_grid_market.md` 28,242 · `_q2_sdc.md` 31,852 · `_q5_code.md` 23,185 | the code walks the R-files digest; every claim with file:line / URL |

Method: five parallel read-only code walks over the export (runtime derivations with `vite-node` where a count was needed; probe outputs pasted verbatim), plus my own browser pass on a build of the export served on **port 4290** from the export's own `npm ci` (clock asserted native and today before every baseline; 1600×900 at DPR 1; fresh isolated context). The two browser MCPs could not write outside the repo, so screenshots were taken with a scratchpad `playwright-core` harness on the installed Chrome — no repo write was needed at any point.

---

## Decisions the operator must make

**Planning lane (R1)**
1. Build the planning object (material × bucket, demand/stock/ROP) before or alongside the grid? The Excel gap is real but secondary until the object exists.
2. Grid engine and licence: AG Grid Enterprise ($999/dev perpetual, recommended) · Handsontable · stay on DSG with a11y filed OPEN.
3. C6-LOCK's subject: is a producer-adjusted intake line an override the planner must justify?
4. What the PR must carry (intake id, reason, decision, a bucket field) — a C7 contract touch.

**SDC lane (R2)**
5. Is a supplier one person or three lanes (`commercial` / `fulfilment` / `back_office`)? A single-lane seat is refused two of three objects on one page.
6. Does the supplier call-off acknowledgement post back to SAP (the D6 triple point)?
7. Should "decline" be a verb, and what is the root-cause L2 taxonomy?
8. Does `RESPONSE_DUE_DAYS = 7` become a governed setting (a Flow Builder configurable)?

**State machine and Flow Builder (R3)**
9. `t_gr_hold`: build the hold entrance or retire the state; `t_rfq_close`: a person, a job, or the state goes.
10. `contract` and `compliance`: wire them or badge them harder than "AUTHORED — UNWIRED".
11. Which of the missing OURS processes (RTV notice, NCR, supplier block, PO change request, supplier master change, claims) enter an arc.
12. Promotion: generated reviewed code (recommended) vs runtime catalog; and whether per-document flow versions (P-1/P-2) are wanted before Stage F.

**Identity (R4)**
13. Move the persona pill out of the sidebar (a ruled surface with its own test).
14. Zero-atom anchors as toggles: hide or explain.
15. The three dead top-bar controls: delete, or rule them in the dead-affordance table.
16. Delete `/login` or reduce it to a demo landing.

---

## Confirmation — nothing was written in the repo; the sibling was never touched

Asserted at the site, read-only, at the end of the review:

```
git status --porcelain --untracked-files=all | wc -l   → 0
git rev-parse HEAD                                      → 81c98403a83a674df80959f7d2290898ddd822fa
git branch --show-current                               → main
stat projects/paragon-supplier-portal (sibling)         → mtime 2026-07-20 12:48:58 +0700 (unchanged; never opened)
netstat :4290-4299 LISTENING                            → 0 (preview server stopped)
```

Commands run against the working copy, complete: `git rev-parse main`, `git log -3 main`, `git ls-remote origin refs/heads/main`, `git archive <sha>` (piped to the scratchpad), `git status` (read). No checkout, stash, branch, commit, install or file write there. Seat 2's branches were never read. Screenshots were written directly to `review-drafts\screens\` by the scratchpad harness; the chrome-devtools MCP was used only for DOM reads (it writes nothing without a `filePath`, and it refused paths outside the repo, which is why the harness exists). The `.playwright-mcp/` directory in the repo predates this session and was not used. All temporary files (export, `node_modules`, `dist`, harness, probe scripts) live under the session scratchpad and can be deleted.


---

> ⚠️ **CORRECTION APPENDED 2026-09-28 (after delivery): the claim that `BuyerContracts.tsx` mints a `CTR-…` number client-side is FALSE against the pinned tree.** It was inherited from C11 V15's own text (*"the tree currently CONTRADICTS this row in one place"*), which is stale: the minting was retired at commit `f5338c2` (2026-09-11, *"The contract lane refuses at the terminal act, and names the system that owns it"*); the wizard ends in `RaisedElsewherePanel` and creates no row; a grep over `src/` outside fixtures and tests finds no client-side construction of any governed document number. What is true and still open: V15 has no instrument (`NOT ENFORCED`). Found while authoring the contract process guide (Design 5, Part C), which reads the page rather than the contract. The retraction is recorded here rather than the sentence edited, per `FALSE-MECHANISM-MUST-NOT-BE-FILED-01`.
