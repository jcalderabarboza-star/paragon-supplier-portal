# Handover package — file index

**Status:** DRAFT for Seat 2 · 2026-10-01 · consultant seat (Seat 3).
**Pinned tree the documents describe:** `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (merge of PR #392).
**Purpose:** the exact list of files Seat 2 commits, where each goes, and where it comes from. The total is in §4, counted from the rows of §1–§3.

All three target directories are new: none exists on `main` at the pin (`ls docs/handover docs/designs docs/reviews` fails for each). No gate scans them: the only tests that read `docs/` read `docs/contracts/` (`pinReach.contract.test.ts` and the contract pins) and `docs/guides/` (`guides.test.ts`, `scripts/guides/build.mjs`).

---

## 1 · `docs/handover/` — from `C:\Users\<operator>\handover-docs-draft\`

| Target path | Source file | What it is |
|---|---|---|
| `docs/handover/HANDOVER_INDEX.md` | `HANDOVER_INDEX.md` | this file |
| `docs/handover/D1_SE_HANDOVER.md` | `D1_SE_HANDOVER.md` | the front door; the 21 SE work packages (§4) |
| `docs/handover/D2_ENGINEERING_GUIDE.md` | `D2_ENGINEERING_GUIDE.md` | how the code works |
| `docs/handover/D3_ARCHITECTURE.md` | `D3_ARCHITECTURE.md` | the federated landscape and seams |
| `docs/handover/D4_SAMPLE_DATA_REPLACEMENT.md` | `D4_SAMPLE_DATA_REPLACEMENT.md` | fixtures, stores, seeds, mock services, storage keys |
| `docs/handover/D5_DEFECT_REGISTER.md` | `D5_DEFECT_REGISTER.md` | open defects, derived |
| `docs/handover/D6_DECISION_REGISTER.md` | `D6_DECISION_REGISTER.md` | ratified and open decisions |
| `docs/handover/D7_CONTRACTS_INDEX.md` | `D7_CONTRACTS_INDEX.md` | C1–C12 status, pins, staleness |
| `docs/handover/D8_CORRECTIONS.md` | `D8_CORRECTIONS.md` | text in repository documents that is untrue at the pin |
| `docs/handover/D9_SECURITY_AND_RESIDENCY.md` | `D9_SECURITY_AND_RESIDENCY.md` | security and residency requirements (SE-2, SE-13) |
| `docs/handover/D10_REQUIREMENTS_TRACE.md` | `D10_REQUIREMENTS_TRACE.md` | the RFP and the Vision traced to the platform |
| `docs/handover/SE21_PRODUCT_CATALOG.md` | `SE21_PRODUCT_CATALOG.md` | SE-21 requirements and open decisions |

## 2 · `docs/designs/` — from `C:\Users\<operator>\review-drafts\`, **byte-for-byte unchanged except the five path lines of §5.1**

Verify after copying with `git hash-object <target>`; each must equal the blob id below.

Designs 3–6 carry the blob id of the committed file (re-recorded at H1, §5.1). Their source blob ids before the five path lines were neutralised: Design 3 `131f4e5f615b250a387c6b37ea696820bf39f169` (36,310 bytes), Design 4 `f256395e51e33fd8401fb6a8b5c3b9f92fa7ec34` (18,952), Design 5 `b7165ac1c59278cefa0c63bceec7866b1c7c26ae` (39,018), Design 6 `d6a1c0031128264a2d8ce1979f3aa380daaef0cb` (114,445). `src/handoverIndex.guard.test.ts` holds every row of §2 and §3 against `git hash-object` of the committed file.

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/designs/DESIGN_1_PLANNING_GRID.md` | `DESIGN_1_PLANNING_GRID.md` | 52,516 | `a7904a03ce428083fa0317e272d577b8bde537d7` |
| `docs/designs/DESIGN_2_SUPPLIER_COLLABORATION.md` | `DESIGN_2_SUPPLIER_COLLABORATION.md` | 33,264 | `51ff73bf5420f0741dc6acc02f135d990550078a` |
| `docs/designs/DESIGN_3_STATE_MACHINE.md` | `DESIGN_3_STATE_MACHINE.md` (path line neutralised, §5.1) | 36,299 | `51459622c7c10822d46cee3214e034dc94f9807c` |
| `docs/designs/DESIGN_4_IDENTITY_PANEL.md` | `DESIGN_4_IDENTITY_PANEL.md` (path line neutralised, §5.1) | 18,941 | `cfe6665e1427ff7c0c4e6cd636c0e914a0eb9237` |
| `docs/designs/DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` | `DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` (path line neutralised, §5.1) | 39,007 | `c508660fe5fc8828b41cf77fea00ba3b84ac6119` |
| `docs/designs/DESIGN_6_FLOW_BUILDER.md` | `DESIGN_6_FLOW_BUILDER.md` (path line neutralised, §5.1) | 114,423 | `55fbf2eb931feb6388e9fe613f5d810f652b2e4e` |

## 3 · `docs/reviews/` — from `C:\Users\<operator>\review-drafts\`, unchanged

| Target path | Source file | Bytes | Git blob id |
|---|---|---|---|
| `docs/reviews/R0_SUMMARY.md` | `R0_SUMMARY.md` | 11,588 | `59131e937df0e23295c6c941f6d0ee90e54631bd` |
| `docs/reviews/R1_INTAKE_PLANGRID.md` | `R1_INTAKE_PLANGRID.md` | 26,217 | `d51f1118d005b2b3eb62f853913a9b8f845bcded` |
| `docs/reviews/R2_SUPPLIER_COLLABORATION.md` | `R2_SUPPLIER_COLLABORATION.md` | 38,405 | `957671df93db4d3cee9f7f13797d7c913ec079cd` |
| `docs/reviews/R3_STATE_MACHINE.md` | `R3_STATE_MACHINE.md` | 107,851 | `f18fb9978a804023a948413267441883f08e457e` |
| `docs/reviews/R4_AVATAR_IDENTITY.md` | `R4_AVATAR_IDENTITY.md` | 15,307 | `3a6649737ba62cff6d016cb601a2c41d897c104d` |

## 4 · Totals, and what is deliberately left out

**Files to commit: 23** — 12 in `docs/handover/`, 6 in `docs/designs/`, 5 in `docs/reviews/` (count the rows of §1–§3).

**Not committed, deliberately:**

- **The RFP** (`RFP__Supplier_Collaboration_Hub.pdf`) — an internal Paragon document. D10 and D9 refer to it by name only.
- The other external sources read for D10 (Vision and Capabilities v1, SE Handoff v1, RFP Coverage Matrix v2) — not in the repository; referred to by name.
- `review-drafts\_q1_code.md`, `_q1_grid_market.md`, `_q2_sdc.md`, `_q5_code.md` — working notes behind the reviews, not part of the package.
- `review-drafts\guides\` — superseded by `docs/guides/` on `main` (PRs #390–#391).
- `review-drafts\screens\` and `PINNED_SHA.txt` — QA screenshots and a pin note for the review session.

## 5 · Exceptions Seat 2 must decide before committing

1. **Personal name in four design files.** `DESIGN_3` (line 317), `DESIGN_4` (line 188), `DESIGN_5` (line 329) and `DESIGN_6` (lines 1110 and 1112) contain a local Windows path whose user folder is the operator's personal name (in the closing "Source file:" footer, and in Design 6's confirmation paragraph). The roles-only rule applies to documents; no repository guard scans `docs/designs/`. The dispatch says the designs go in unchanged, so this index does not alter them. Options: (a) the operator rules that these footer lines are removed in the commit (the blob ids above then change and should be re-recorded), or (b) commit unchanged and record the exception. Recommendation: (a). **Ruled at H1 (dispatch of 2026-10-02): (a), with the personal user folder replaced by the placeholder `<operator>` rather than the lines removed.** The five lines are the only change; the blob ids in §2 are re-recorded, and the personal-name guard now reaches `docs/` (`src/readmeNoPersonalNames.guard.test.ts`, direction E).
2. **The designs are written against older pins** (`81c98403…` for Designs 1–5, `de101c67…` for Design 6), and their ownership tables predate the dispatch of 2026-10-01. D1 §4 and D8 §7 say which statements are overtaken; nothing in the designs is edited.
3. **Paths in this index** write the source folders as `C:\Users\<operator>\…` on purpose, so this file carries no personal name.
