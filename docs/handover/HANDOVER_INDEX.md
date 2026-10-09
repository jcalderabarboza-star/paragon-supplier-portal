# Handover package v2 — file index

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · consultant seat (Seat 3).
**Pinned tree the documents describe:** `main` @ `166a5611303121eb509675dbe19ff78edf786899` (merge of PR #418, E2E-2), equal to `git ls-remote origin refs/heads/main` on 2026-10-09. v1 of the package is the tag `handover-v1` (`9cc535b`). `handover-v2` is tagged on Friday 9 October.
**Purpose:** the exact list of files Seat 2 commits, where each goes, and where it comes from. The total is in §4, counted from the rows of §1–§3.

**This file is committed as `docs/handover/HANDOVER_INDEX.md`, replacing v1's index, not beside it.** `src/handoverIndex.guard.test.ts` reads that exact path and requires three things this file is built to satisfy: every file under `docs/handover/`, `docs/designs/` and `docs/reviews/` has a row here; every design and review row ends in a blob id that equals `git hash-object` of the committed file, and no handover row does; the design rows marked "path line neutralised" are exactly the files that carry the neutral folder placeholder. Committing this file under its draft name `HANDOVER_INDEX_v2.md` would turn that guard red twice (an unlisted file, and a stale v1 index).

---

## 1 · `docs/handover/` — from `C:\Users\<operator>\handover-docs-draft\v2\`

Twelve files replace their v1 namesakes; two are new.

| Target path | Source file | What it is |
|---|---|---|
| `docs/handover/HANDOVER_INDEX.md` | `HANDOVER_INDEX_v2.md` (renamed on commit) | this file; replaces v1 |
| `docs/handover/D1_SE_HANDOVER.md` | `D1_SE_HANDOVER.md` | the front door; the 23 SE work packages (§4), with what the review week and the final review moved in or out; replaces v1 |
| `docs/handover/D2_ENGINEERING_GUIDE.md` | `D2_ENGINEERING_GUIDE.md` | how the code works; replaces v1 |
| `docs/handover/D3_ARCHITECTURE.md` | `D3_ARCHITECTURE.md` | the federated landscape and seams; replaces v1 |
| `docs/handover/D4_SAMPLE_DATA_REPLACEMENT.md` | `D4_SAMPLE_DATA_REPLACEMENT.md` | fixtures, stores, seeds, mock services, storage keys; replaces v1 |
| `docs/handover/D5_DEFECT_REGISTER.md` | `D5_DEFECT_REGISTER.md` | open defects, derived; §J holds the review's and the final review's P0/P1 rows; replaces v1 |
| `docs/handover/D6_DECISION_REGISTER.md` | `D6_DECISION_REGISTER.md` | ratified and open decisions, incl. the rulings of 2 to 9 October (§3a); replaces v1 |
| `docs/handover/D7_CONTRACTS_INDEX.md` | `D7_CONTRACTS_INDEX.md` | C1–C12 status, pins, staleness, and the state-machine census (§6); replaces v1 |
| `docs/handover/D8_CORRECTIONS.md` | `D8_CORRECTIONS.md` | corrections to repository documents, with the disposition of every v1 row (§0); replaces v1 |
| `docs/handover/D9_SECURITY_AND_RESIDENCY.md` | `D9_SECURITY_AND_RESIDENCY.md` | security and residency requirements (SE-2, SE-13); replaces v1 |
| `docs/handover/D10_REQUIREMENTS_TRACE.md` | `D10_REQUIREMENTS_TRACE.md` | the RFP and the Vision traced to the platform; replaces v1 |
| `docs/handover/SE21_PRODUCT_CATALOG.md` | `SE21_PRODUCT_CATALOG.md` | SE-21 requirements and open decisions; replaces v1 |
| `docs/handover/SE_BACKLOG_v2.md` | `SE_BACKLOG_v2.md` | **new** — what the module review and the final review found and did not fix, ranked, each row with its SE package |
| `docs/handover/CHANGES_SINCE_V1.md` | `CHANGES_SINCE_V1.md` | **new** — what changed per module, for the Lead Engineer |

## 2 · `docs/designs/` — already committed at H1; **no change in v2**

Nothing is copied. The six files at the pin have exactly the blob ids and sizes below (each read with `git rev-parse 166a5611…:<path>` and `git cat-file -s` on 2026-10-09; `git diff --name-only handover-v1 166a5611… -- docs/designs docs/reviews` is empty; a wrong-path control was rejected by the same command). The rows stay because the guard requires every file in the directory to be listed.

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/designs/DESIGN_1_PLANNING_GRID.md` | `DESIGN_1_PLANNING_GRID.md` | 52,516 | `a7904a03ce428083fa0317e272d577b8bde537d7` |
| `docs/designs/DESIGN_2_SUPPLIER_COLLABORATION.md` | `DESIGN_2_SUPPLIER_COLLABORATION.md` | 33,264 | `51ff73bf5420f0741dc6acc02f135d990550078a` |
| `docs/designs/DESIGN_3_STATE_MACHINE.md` | `DESIGN_3_STATE_MACHINE.md` (path line neutralised, §5.1) | 36,299 | `51459622c7c10822d46cee3214e034dc94f9807c` |
| `docs/designs/DESIGN_4_IDENTITY_PANEL.md` | `DESIGN_4_IDENTITY_PANEL.md` (path line neutralised, §5.1) | 18,941 | `cfe6665e1427ff7c0c4e6cd636c0e914a0eb9237` |
| `docs/designs/DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` | `DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` (path line neutralised, §5.1) | 39,007 | `c508660fe5fc8828b41cf77fea00ba3b84ac6119` |
| `docs/designs/DESIGN_6_FLOW_BUILDER.md` | `DESIGN_6_FLOW_BUILDER.md` (path line neutralised, §5.1) | 114,423 | `55fbf2eb931feb6388e9fe613f5d810f652b2e4e` |

## 3 · `docs/reviews/` — already committed at H1; **no change in v2**

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/reviews/R0_SUMMARY.md` | `R0_SUMMARY.md` | 11,583 | `59131e937df0e23295c6c941f6d0ee90e54631bd` |
| `docs/reviews/R1_INTAKE_PLANGRID.md` | `R1_INTAKE_PLANGRID.md` | 26,217 | `d51f1118d005b2b3eb62f853913a9b8f845bcded` |
| `docs/reviews/R2_SUPPLIER_COLLABORATION.md` | `R2_SUPPLIER_COLLABORATION.md` | 38,405 | `957671df93db4d3cee9f7f13797d7c913ec079cd` |
| `docs/reviews/R3_STATE_MACHINE.md` | `R3_STATE_MACHINE.md` | 107,020 | `f18fb9978a804023a948413267441883f08e457e` |
| `docs/reviews/R4_AVATAR_IDENTITY.md` | `R4_AVATAR_IDENTITY.md` | 15,307 | `3a6649737ba62cff6d016cb601a2c41d897c104d` |

The byte counts in §2 and §3 are the blob sizes at the pin. The reviews R0–R4 are the consultant's review of 2026-09-28. Neither the module review of 2026-10-02 to 2026-10-08 nor the final review of 8 and 9 October produced a committed report: their findings are in `SE_BACKLOG_v2.md` and D5 §J, and their reports and screenshots stay outside the repository.

## 4 · Totals, and what is deliberately left out

**Files to commit: 25** — 14 in `docs/handover/`, 6 in `docs/designs/`, 5 in `docs/reviews/` (count the rows of §1–§3). Of these, the commit for v2 **writes 14** (twelve replacements and two new files, all in `docs/handover/`) and touches none of the other 11.

**Not committed, deliberately:**

- **The RFP** (`RFP__Supplier_Collaboration_Hub.pdf`) — an internal Paragon document. D10 and D9 refer to it by name only.
- The other external sources read for D10 (Vision and Capabilities v1, SE Handoff v1, RFP Coverage Matrix v2) — not in the repository; referred to by name.
- `qaHandover\` — Seat 2's state files (`STATE_2026-10-05.md`, `STATE_2026-10-06.md`), the Strategist's compilation of the four review lists (`REVIEW_P2P3_LISTS.md`), the final review's report (`e2e\E2E_REPORT.md`) and the review and batch screenshots. `SE_BACKLOG_v2.md`, D5 §J and D6 §3a cite them by relative path; the SE Team will not have them unless the operator chooses to hand them over.
- The v1 drafts in `handover-docs-draft\` (the folder above `v2\`).
- `review-drafts\` working notes, guides and screens, as in v1.

## 5 · The draft files, for checking the copy

Compute `git hash-object <target>` after copying; each must equal the blob id below (the drafts are LF-terminated and were hashed as written, with `git hash-object --no-filters`, so the id is the same on any platform). This index cannot carry its own id. The thirteen files total 278,435 bytes.

| Draft file | Bytes | Git blob id (LF) |
|---|---|---|
| CHANGES_SINCE_V1.md | 14,189 | 947741a1cd9dc1f8204ffd3b5a5ff2ed2708dc47 |
| D10_REQUIREMENTS_TRACE.md | 17,670 | d256d21d8c200b399b4ff6b961d7b1ac4b8f8fb8 |
| D1_SE_HANDOVER.md | 35,582 | c61e74fa5ee00b430b3d70a96819072d62695639 |
| D2_ENGINEERING_GUIDE.md | 22,049 | 2653b2504237c8ea5d1b29d424d949fd049068db |
| D3_ARCHITECTURE.md | 16,904 | 02ce3f68f5e0bdc49c74a539a1cd331becd145ab |
| D4_SAMPLE_DATA_REPLACEMENT.md | 16,732 | 0a0ea60388cfa5ee45f4858bf28417c823c11a1d |
| D5_DEFECT_REGISTER.md | 31,472 | c161258e89ebb3842deee10a1df588ba060bd9b4 |
| D6_DECISION_REGISTER.md | 25,719 | ed657b18425ace248bba943e4d7654c81eccc79b |
| D7_CONTRACTS_INDEX.md | 15,518 | 4fb1e02595049917b95cf7e77c217d76e5eadc77 |
| D8_CORRECTIONS.md | 24,970 | 8fdbac0e3b455b8327f312cfd06df4ce98ca12d2 |
| D9_SECURITY_AND_RESIDENCY.md | 11,978 | 7551db8c5a284492cf4797dadc054d8e19053a0d |
| SE21_PRODUCT_CATALOG.md | 10,469 | bc4b012158db1b491fa5763417bc81f4e725636c |
| SE_BACKLOG_v2.md | 35,183 | 8bc0c851e0e21f0d8fe3ae0b0e1e3d0427d9e6d4 |

**One committed file differs from its draft, on purpose.** Before committing, Seat 2 recorded the operator rulings of 9 October 2026 in `D6_DECISION_REGISTER.md` §2 (dispatch H2). The committed D6 is 27,257 bytes with blob id `47311020067c80539d6ceb24270756ad7097d73d`; the row above is the draft's. The other twelve are committed as drafted — **at the `handover-v2` tag.** After the tag, the batch ADM-1 changed six of them so they stay true of the tree it changed (`D1_SE_HANDOVER.md`, `D2_ENGINEERING_GUIDE.md`, `D3_ARCHITECTURE.md`, `D4_SAMPLE_DATA_REPLACEMENT.md`, `D7_CONTRACTS_INDEX.md`, `CHANGES_SINCE_V1.md`) and `D6_DECISION_REGISTER.md` again; `CHANGES_SINCE_V1.md` lists what moved. For those seven the ids in this section are the tag's, not the tree's: read the tagged files with `git show handover-v2:<path>`.

`src/handoverIndex.guard.test.ts` does **not** hold these: it records no blob id for a handover row, by design.

## 6 · Exceptions Seat 2 must decide before committing

1. **Rename on commit.** `HANDOVER_INDEX_v2.md` → `docs/handover/HANDOVER_INDEX.md` (reason at the top of this file).
2. **Four v1 files were edited in place at #417.** `docs/handover/D1_SE_HANDOVER.md`, `D6_DECISION_REGISTER.md`, `D7_CONTRACTS_INDEX.md` and `D10_REQUIREMENTS_TRACE.md` at the pin already carry SE-22, SE-23 and the 16-row roster (`git diff --name-only handover-v1 166a5611… -- docs/handover`). The v2 files replace them and carry the same changes; the SE-22 and SE-23 rows in v2 D1 §4 are word for word the rows recorded there. Nothing in those four files is lost by the replacement, by this seat's reading of that diff.
3. **The pin.** This set is true at `166a5611…` (PR #418). Earlier issues were pinned at `da4f1c71…` (#410) and `a7cbf415…` (#416); D8 §10.5 records what moved. A commit to `main` after this pin other than the handover commit itself would need the fourteen status lines and D7 §1, §3 and §6 re-read. The handover commit changes only `docs/handover/`, which no figure in the set counts.
4. **No placeholder is left.** No file of the set carries a placeholder mark; the script that built §5 refuses to write this index if one does. What the earlier issues held open is now stated: the final review (D5 §J, backlog §6a), the requisition-approval decision (ruled and built, #417), and the supplier-module review's smaller items (backlog §8).
5. **The backlog rests on compilations, and one list is cut off.** `SE_BACKLOG_v2.md` merges `qaHandover\REVIEW_P2P3_LISTS.md` (the four module reviews' P2/P3 lists, compiled from the reports as delivered) with Seat 2's state files, the final review's report and the pull requests. The R-OPS P2 list ends mid-item ("Change request co…"); whatever followed is not in the backlog. The supplier-module review sent no list of its own; its items are taken from PRs #414 and #415 on the Strategist's word.
6. **Final-review rows not fixed by #417 or #418 are carried as reported.** The report was written on `fc65bf2`, before both fixes. Backlog rows 102–105 and 113–118 were not re-checked at the pin by this seat; rows it did confirm are marked.
7. **Severity and package on backlog rows.** Rows that only a pull request names carry a severity assigned by this seat (marked ‡); seven rows the reviews listed without a level are in their own section. Rows of screen copy, locale and page accessibility have no owning SE package in D1 §4 (marked †). Both need the Lead Engineer's or the operator's eye.
8. **Open decisions the last two batches left** (D6 §2): which further acts need a named person (the list in PR #417); whether an invoice created with no lines stays admitted (PR #418); who is recorded as having received goods. **All three were ruled by the operator on 9 October 2026, with two further rulings (invoicing before receipt; four-eyes and the two administrator roles); D6 §2 records them, and none is built at the pin.**
9. **Rulings recorded outside the tree.** D6 §3a lists the rulings of 2 to 9 October with their source. Several exist only in a pull-request description or in the state file (for example "the supplier never marks arrival at Paragon", and "SAP owns the order's status"). Moving them into a contract or a guide is Seat 2's call.
10. **Line references not re-located.** The documents carry file:line references from v1. A reference into a file that has not changed since `6f1da15a…` is still exact. The earlier issues of this index listed the references that point into changed files (in D1, D3, D5, D6, D7, D9 and D10); none was re-located in this pass, and #417 and #418 changed further source files. Treat every line number into `src/` as approximate and the path as exact.
11. **D8 keeps v1's row tables as a record.** Their "current text" columns quote the tree at v1's pin. D8 §0 is the disposition and says so; a reader who skips §0 will think corrections are still owed that were applied at H1.
12. **Not re-run by this seat:** `npm run gates`, any browser walk, `npm audit`. The gates result cited is CI's on the pinned commit (run 37882266248, job `build · floor · test:gate`, success). The census ran its own script and one dispatcher probe in a scratch export; it ran no gate. #417 and #418 are described from their pull requests and the pinned tree.
13. **Paths in this index** write the source folders as `C:\Users\<operator>\…` on purpose, so this file carries no personal name. The design-footer exception of v1 (§5.1 of the v1 index) was ruled and applied at H1 and is closed.
