# Handover package v3 — file index

**Status:** v3 · 2026-10-13 · committed by Seat 2 as H3.
**Pinned tree the documents describe:** `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c` (merge of PR #439, MD-4 + MD-5). The set was first written and fact-checked at `3021f3d6…` (PR #438) and re-pinned after #439 merged. v2 of the package is the tag `handover-v2` (`b0f9a97b`, 2026-10-09); v1 is `handover-v1` (`9cc535b`). No `handover-v3` tag exists; whether and when to tag is the operator's call.
**Purpose:** the exact list of files in the package after the v3 commit, where each goes, and where it comes from. The total is in §4, counted from the rows of §1–§3.

**This file is committed as `docs/handover/HANDOVER_INDEX.md`, replacing v2's index, not beside it.** `src/handoverIndex.guard.test.ts` reads that exact path and requires what this file is built to satisfy: every row's file exists; every file under `docs/handover/`, `docs/designs/` and `docs/reviews/` has a row; every design and review row ends in a blob id that equals `git hash-object` of the committed file, and no handover row does; the rows marked "path line neutralised" are exactly the design and review files that carry the neutral folder placeholder; and the total stated in §4 equals the number of rows. Committing this file under its draft name `HANDOVER_INDEX_v3.md` would turn that guard red twice (an unlisted file, and a stale v2 index).

**§1 follows the operator's ruling of 2026-10-13 on the two v2-only files: `CHANGES_SINCE_V1.md` is kept, `SE_BACKLOG_v2.md` is removed.**

---

## 1 · `docs/handover/` — from `C:\Users\<operator>\handover-docs-draft\v3\`

Twelve files replace their v2 namesakes; three are new; one v2 file is kept untouched; one v2 file is removed.

| Target path | Source file | What it is |
|---|---|---|
| `docs/handover/HANDOVER_INDEX.md` | `HANDOVER_INDEX_v3.md` (renamed on commit) | this file; replaces v2 |
| `docs/handover/D1_SE_HANDOVER.md` | `D1_SE_HANDOVER.md` | the front door; the 23 SE work packages (§4), with what moved in or out since v2; replaces v2 |
| `docs/handover/D2_ENGINEERING_GUIDE.md` | `D2_ENGINEERING_GUIDE.md` | how the code works, with the process-change overlay (§2.7), the master-data replica and its change request (§2.8) and the shared UI components (§11); replaces v2 |
| `docs/handover/D3_ARCHITECTURE.md` | `D3_ARCHITECTURE.md` | the federated landscape and seams, with the overlay and the master-data replica; replaces v2 |
| `docs/handover/D4_SAMPLE_DATA_REPLACEMENT.md` | `D4_SAMPLE_DATA_REPLACEMENT.md` | fixtures, stores, seeds, mock services, storage keys; replaces v2 |
| `docs/handover/D5_DEFECT_REGISTER.md` | `D5_DEFECT_REGISTER.md` | open defects; §K holds what PRs #420–#439 closed or opened; replaces v2 |
| `docs/handover/D6_DECISION_REGISTER.md` | `D6_DECISION_REGISTER.md` | ratified and open decisions, incl. the rulings of 9 to 13 October (§3b), the two reversed rows, and one open decision for Paragon from the census (§2: separation of persons on fifteen decision verbs); replaces v2 |
| `docs/handover/D7_CONTRACTS_INDEX.md` | `D7_CONTRACTS_INDEX.md` | C1–C13 status, pins, staleness; §6 is the v3 state-machine census (Seat 3, at the pin); replaces v2 |
| `docs/handover/D8_CORRECTIONS.md` | `D8_CORRECTIONS.md` | corrections to repository documents; §11 is new in v3 (11.1–11.19); replaces v2 |
| `docs/handover/D9_SECURITY_AND_RESIDENCY.md` | `D9_SECURITY_AND_RESIDENCY.md` | security and residency requirements (SE-2, SE-13); replaces v2 |
| `docs/handover/D10_REQUIREMENTS_TRACE.md` | `D10_REQUIREMENTS_TRACE.md` | the RFP and the Vision traced to the platform; replaces v2 |
| `docs/handover/SE21_PRODUCT_CATALOG.md` | `SE21_PRODUCT_CATALOG.md` | SE-21 requirements and open decisions, with what MD-1, MD-2, MD-2b and MD-4 + MD-5 built (§6); replaces v2 |
| `docs/handover/SE_BACKLOG_v3.md` | `SE_BACKLOG_v3.md` | **new** — the v2 backlog carried forward with its row numbers, plus rows 119–173 from PRs #420–#438, rows 174–184 from PR #439 and rows 185–193 from the v3 state-machine census; row 172 is closed |
| `docs/handover/CHANGES_SINCE_V2.md` | `CHANGES_SINCE_V2.md` | **new** — what changed per lane since v2, for the Lead Engineer |
| `docs/handover/CENSUS_v3.md` | `CENSUS_v3.md` | **new** — the state-machine census at the pin, by Seat 3: its definitions, derivation and controls. D7 §6 folds it in; D5, D6 and the backlog cite it |
| `docs/handover/CHANGES_SINCE_V1.md` | not copied: the file already at `main` is kept as it is | **kept from v2, unchanged** — what changed per module from v1 to v2; history. Its figures are v2's (D8 §11.12) |

**Removed by the v3 commit:** `SE_BACKLOG_v2.md` under `docs/handover/` (`git rm`). `SE_BACKLOG_v3.md` carries every one of its rows under the same number; the v2 file stays readable with `git show handover-v2:docs/handover/SE_BACKLOG_v2.md`. It has no row above on purpose: the guard requires every listed file to exist.

## 2 · `docs/designs/` — six committed at H1, unchanged; **six added in v3**

Of the first six nothing is copied. Those six files at the pin have exactly the blob ids and sizes below (each read with `git rev-parse <pin>:<path>` and `git cat-file -s` on 2026-10-13; they equal the v2 index's; a wrong-path control was rejected by the same command). The rows stay because the guard requires every file in the directory to be listed.

**Read Design 6 with D1 §4 (SE-16).** `DESIGN_6_FLOW_BUILDER.md` is the older Flow Builder design: generated code, no runtime override. The operator reversed that decision on 2026-10-12 and the Flow Builder is built in the fixture. The file is committed unchanged and remains the specification for one thing: a change to the shape of a machine (its §7). The design that replaced it for the build, Design 6 v2, is committed with v3 beside its build plan and its open decisions (the second table below).

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/designs/DESIGN_1_PLANNING_GRID.md` | `DESIGN_1_PLANNING_GRID.md` | 52,516 | `a7904a03ce428083fa0317e272d577b8bde537d7` |
| `docs/designs/DESIGN_2_SUPPLIER_COLLABORATION.md` | `DESIGN_2_SUPPLIER_COLLABORATION.md` | 33,264 | `51ff73bf5420f0741dc6acc02f135d990550078a` |
| `docs/designs/DESIGN_3_STATE_MACHINE.md` | `DESIGN_3_STATE_MACHINE.md` (path line neutralised, §5.1) | 36,299 | `51459622c7c10822d46cee3214e034dc94f9807c` |
| `docs/designs/DESIGN_4_IDENTITY_PANEL.md` | `DESIGN_4_IDENTITY_PANEL.md` (path line neutralised, §5.1) | 18,941 | `cfe6665e1427ff7c0c4e6cd636c0e914a0eb9237` |
| `docs/designs/DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` | `DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` (path line neutralised, §5.1) | 39,007 | `c508660fe5fc8828b41cf77fea00ba3b84ac6119` |
| `docs/designs/DESIGN_6_FLOW_BUILDER.md` | `DESIGN_6_FLOW_BUILDER.md` (path line neutralised, §5.1) | 114,423 | `55fbf2eb931feb6388e9fe613f5d810f652b2e4e` |

**Added in v3, by operator ruling of 2026-10-13 — committed unchanged.** The design, the build plan and the open decisions of the two lanes built since v2. For the Flow Builder they specify the batches the SE Team inherits (FB-5, the rest of FB-6, FB-7); for master data, what was not built: MD-3 and MD-6. **Read `MD_BUILD_PLAN.md`'s MD-4 and MD-5 sections as the plan, not as the record:** they were built differently (three kinds of request, one review permission, an in-memory store, a package that is shown and not sent) — D8 §11.18 lists the differences. The operator ruled all thirteen Flow Builder decisions as recommended on 2026-10-12. Sources: `C:\Users\<operator>\review-drafts\flow-builder\` and `C:\Users\<operator>\review-drafts\master-data\`. None of the six names a personal folder, so none is marked as neutralised.

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/designs/DESIGN_6_v2.md` | `DESIGN_6_v2.md` | 42,168 | `916b9061f3db39f71efcb25a50e863de75a2bf99` |
| `docs/designs/FB_BUILD_PLAN.md` | `FB_BUILD_PLAN.md` | 16,137 | `ffdecb7f3217144abf7a0ccfe3b9c28befacdb83` |
| `docs/designs/FB_OPEN_DECISIONS.md` | `FB_OPEN_DECISIONS.md` | 6,082 | `7054710e81c8c674bb657bdac8bed31010846cac` |
| `docs/designs/MASTER_DATA_DESIGN.md` | `MASTER_DATA_DESIGN.md` | 40,215 | `60ed9fdce859f094e92d1c42729810f75b01ee59` |
| `docs/designs/MD_BUILD_PLAN.md` | `MD_BUILD_PLAN.md` | 18,356 | `a93f2238d193233fe1c27280d3f2ac99d7a33624` |
| `docs/designs/MD_OPEN_DECISIONS.md` | `MD_OPEN_DECISIONS.md` | 10,828 | `2cb9721a02936106e6b8cbe4c3c65e70439cd177` |

## 3 · `docs/reviews/` — already committed at H1; **no change in v3**

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/reviews/R0_SUMMARY.md` | `R0_SUMMARY.md` | 11,583 | `59131e937df0e23295c6c941f6d0ee90e54631bd` |
| `docs/reviews/R1_INTAKE_PLANGRID.md` | `R1_INTAKE_PLANGRID.md` | 26,217 | `d51f1118d005b2b3eb62f853913a9b8f845bcded` |
| `docs/reviews/R2_SUPPLIER_COLLABORATION.md` | `R2_SUPPLIER_COLLABORATION.md` | 38,405 | `957671df93db4d3cee9f7f13797d7c913ec079cd` |
| `docs/reviews/R3_STATE_MACHINE.md` | `R3_STATE_MACHINE.md` | 107,020 | `f18fb9978a804023a948413267441883f08e457e` |
| `docs/reviews/R4_AVATAR_IDENTITY.md` | `R4_AVATAR_IDENTITY.md` | 15,307 | `3a6649737ba62cff6d016cb601a2c41d897c104d` |

The byte counts in §2 and §3 are the blob sizes at the pin. The reviews R0–R4 are the consultant's review of 2026-09-28. No review after it produced a committed report: the module review of 2026-10-02 to 2026-10-08 and the final review of 8 and 9 October are in `SE_BACKLOG_v3.md` and D5 §J, and the plan-grid review and the interface audit that PRs #421–#432 answer are known to this set only through those pull requests.

## 4 · Totals, and what is deliberately left out

**Files to commit: 33** — 16 in `docs/handover/`, 12 in `docs/designs/`, 5 in `docs/reviews/` (count the rows of §1–§3). Of these, the commit for v3 **writes 21** (twelve replacements and three new files in `docs/handover/`, six new files in `docs/designs/`), **removes one** (`SE_BACKLOG_v2.md`), and touches none of the other 12.

**Not committed, deliberately:**

- **The RFP** (`RFP__Supplier_Collaboration_Hub.pdf`) — an internal Paragon document. D10 and D9 refer to it by name only. The guard refuses a committed RFP.
- The other external sources read for D10 (Vision and Capabilities v1, SE Handoff v1, RFP Coverage Matrix v2) — not in the repository; referred to by name.
- `qaHandover\` — Seat 2's state files, the reviews' compiled lists, the final review's report and every batch's screenshots, as in v2.
- `V3_DRAFT_NOTES.md` in the draft folder — the drafting notes: what changed in each file and from which source, and the claims of v2 that were left standing unverified.
- The v1 and v2 drafts in `handover-docs-draft\` (the folder above `v3\`, and `v2\`).

## 5 · The copy

The handover files were copied from the draft folder byte for byte (LF) and `CENSUS_v3.md` as Seat 3 delivered it. This index records no blob id for a handover row, by design of the guard; a reader who wants to compare a file with its draft uses `git hash-object`.

## 6 · Exceptions Seat 2 must decide before committing

1. **Rename on commit.** `HANDOVER_INDEX_v3.md` → `docs/handover/HANDOVER_INDEX.md` (reason at the top of this file).
2. **The two v2-only files — RULED (operator, 2026-10-13): keep `CHANGES_SINCE_V1.md`, remove `SE_BACKLOG_v2.md`.** The alternatives below are kept as the record of what the guard requires. The guard reads the directory: a file on disk with no row fails "no file … is missing from the index", and a row with no file fails "every file the index lists exists". The total in §4 must equal the row count.
   - *Recommended, and what §1 is written for:* **keep `CHANGES_SINCE_V1.md`** (the only per-module account of v1 → v2; `CHANGES_SINCE_V2.md` does not repeat it) and **retire `SE_BACKLOG_v2.md`** (two backlogs with the same row numbers invite reading the stale one; the tag keeps it). Result: 15 handover rows, total 26.
   - *Keep both:* do not `git rm` the v2 backlog; add a §1 row for it in the same form as the `CHANGES_SINCE_V1.md` row; change the total to 27 and "15 in `docs/handover/`" to 16.
   - *Retire both:* also `git rm` `CHANGES_SINCE_V1.md`; delete its §1 row; change the total to 25 and "15" to 14. D1 §7, D8 §11.12 and `CHANGES_SINCE_V2.md` name the file and would each want one clause changed.
3. **The figures pin.** `src/handoverFigures.pin.test.ts` asserts 53 routes, 16 modules with `PLT` the only always-on one, 14 business roles, 18 sample persons, 28 liveness capabilities (5 green and 1 `SPEC` by name), and that the contracts README's three counts equal C1's header. D1 §1 states exactly those values and C1's 76 / 154 / 26. The test reads the tree and the two contract files, not D1, so a document that disagrees does not turn it red; the agreement was checked by reading.
4. **The pin.** This set is true at `aac5f858…`. A commit to `main` after it other than the handover commit itself needs the status lines, D1 §1 and §3, D7 §1 to §3 and `CHANGES_SINCE_V2.md` re-read. The handover commit changes only `docs/handover/`, which no figure in the set counts.
5. **The Flow Builder's and the master-data designs — RULED (operator, 2026-10-13): committed with v3, unchanged.** Six files join `docs/designs/` (§2, second table). Their blob ids are recomputed from the committed files before the commit, because the guard compares each row with `git hash-object` of the file in the tree.
6. **No placeholder remains.** The lines that stood for MD-4 and MD-5 while PR #439 was open were filled from that pull request, C13 and the tree after it merged.
7. **What was run.** The documents were written from the tree, the pull-request descriptions and the contracts, and every draft was then read end to end against the tree by a checker that had not written it. Nothing was built or walked for this set. The state-machine census of D7 §6 was run by Seat 3 at the pin (`CENSUS_v3.md` says how). The gate record at the pin is the check `build · floor · test:gate` = success on the push run for `aac5f858…`. The two guards that read this package (`src/handoverIndex.guard.test.ts`, `src/handoverFigures.pin.test.ts`) were run on the committed files.
8. **Rows carried from v2 were not re-checked.** D5's carried rows, the backlog's rows 4–118, D8 §0 (except the four rows §11 names) and every `file:line` reference into `src/` are v2's. Treat a line number as approximate and a path as exact.
9. **Severity and size on the new backlog rows** (119–173) are the drafting seat's (‡), as v2's were for rows only a pull request names. Rows of screen copy, locale and page accessibility still have no owning SE package (†).
10. **Rulings recorded outside the tree.** D6 §3b names the source of each ruling of 9 to 12 October. Most are in `CLAUDE.md`, C1 or C13. Three exist only in a pull-request description (the composer asking before discarding; FB-3 and FB-4 as one pull request; the SE list of MD-2b), and the Flow Builder recommendations they followed are in `docs/designs/FB_OPEN_DECISIONS.md`, committed with v3.
11. **One sentence in `CLAUDE.md` goes stale with this commit** (D8 §11.3): the FB-1 paragraph says the handover set "still says" no runtime override and is corrected at handover v3.
12. **Paths in this index** write the source folders as `C:\Users\<operator>\…` on purpose, so this file carries no personal name.
