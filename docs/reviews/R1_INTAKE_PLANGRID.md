# R1 · Intake Review + Plan Grid — from a planner's seat

**Pinned:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa` (merge of PR #376, 2026-09-28 07:27 +07). Read from a `git archive` export in the reviewer's scratchpad; the working copy and the sibling were never opened or written.
**Seat:** Seat 3, consultant, Ops Project #11. Read-only review. 2026-09-28.
**Browser:** own build of the export (`npm ci` → `npm run build`, `vite preview` on **port 4290**), driven with a scratchpad Playwright harness writing screenshots straight to `review-drafts\screens\`. Clock asserted before every read: `Date.name === 'Date'`, native, `2026-09-28`. Viewport 1600×900 at DPR 1. The app's declared present is **31 Aug 2026** (rendered on the dashboard), not the wall clock; every date below is the app's.
**Companion files (evidence, kept):** `_q1_code.md` (code walk, every claim with file:line) and `_q1_grid_market.md` (grid engines, every number with URL and fetch date). This file is the ruling-grade digest; the companions are the evidence.

---

## 0 · The headline, before the tables

**There is no planning grid.** `/buyer/plan-grid` (`src/pages-v2/PlanGrid.tsx`, 419 lines, three `react-datasheet-grid` instances) is an **award what-if over 3 quotations of one hardcoded RFQ** (`AWARD_RFQ = 'rfq-003'`, `PlanGrid.tsx:54`), a **4-row intake list** (the same four lines `/buyer/intake-review` shows), and a **one-line "Adjust & push" drawer**. There is no material × time-bucket matrix, no demand / stock / ROP / coverage row, no horizon, no bulk edit, no supplier column anywhere on the buyer side (screens `Q1_02_plan_grid_default.png`, `Q1_03_plan_grid_intake_section.png`). The bucket-native object exists one lane over — SDC's `ForecastLine.periodBucket` / `ForecastPublication.horizon` (`src/services/sdc/types.ts:266-298`) — but that is the supplier-collaboration read, not a planner's tool, and nothing joins it to the intake line.

So the operator's brief — *"a perfect grid for planners/users"*, judged against Excel — is being asked of a surface whose object does not exist yet. Every row of the Excel table below is answered honestly against what the engine offers and what the surface uses; most of the P1 work is **building the object**, not polishing the grid.

What is real and good: the intake **push is a genuine dispatch** (`t_pr_create`) that mints a Draft PR on the requisitions page (measured: `PR-2026-902` appeared after one click, screen `Q1_12_requisitions_after_accept.png`), the drawer's C6-LOCK gate (reason required when the accepted quantity differs) is enforced at the button, the what-if never touches the committed AI composite, and EN/ID chrome parity is complete on both pages (screens `Q1_07`, `Q1_08`, `Q1_09`).

---

## 1 · Q1(a) — what a planner can do today, verb by verb

Derived from handlers (hoisted `const accept/push`, DSG `onChange`, `onClick`), not from labels. **Browser-confirmed** rows say so.

### `/buyer/intake-review` (`IntakeReview.tsx`, a plain `<Table>`, 4 rows)

| # | Affordance | What a click records | Evidence |
|---|---|---|---|
| 1 | **Accept as suggested** (per row; rendered only when the seat holds `pr:create`) | **DISPATCH** `t_pr_create` → `purchaseRequisitionStore.add()` mints `PR-2026-9xx` at `Draft`, qty = `suggestedQty`, no `decision`. Row flips to "COMMITTED · Pushed → PR-2026-902" in **component state only**. | `IntakeReview.tsx:74-97, 229-241`; `MockCommandService.ts:747-796`; **browser:** `Q1_10_intake_after_accept.png`, `Q1_12_requisitions_after_accept.png` |
| 2 | **Dismiss** | **LOCAL STATE** (`useState<Set>`), label says "this session only · not persisted" | `IntakeReview.tsx:68, 242-250`; **browser:** `Q1_11_intake_after_dismiss.png` |
| 3 | **Restore** (dismissed row) | LOCAL STATE | `IntakeReview.tsx:216-223` |
| 4 | Link "Adjust & push the line on the Plan Grid" | Navigation only, **carries no line id** | `IntakeReview.tsx:131-133` |
| — | Filter / sort / search / bulk select | **do not exist** | whole file |

**Browser-measured consequence:** after Accept (1 accepted) and Dismiss (1 dismissed), a reload of `/buyer/intake-review` shows **"4 pending · 0 accepted · 0 dismissed"** while `PR-2026-902` still exists on `/buyer/purchase-requisition`. The triage is gone; the PR is not. The same line can be accepted again.

### `/buyer/plan-grid` (`PlanGrid.tsx` + `plan-grid/*`)

| # | Affordance | What a click records | Evidence |
|---|---|---|---|
| 5 | Edit a **what-if weight** cell (1 row × 4 `intColumn`) | LOCAL STATE; `buildWhatIfOverlay` recomputes the what-if column; the seam composite is untouched by construction. No reset control (key `planGrid.whatif.reset` has 0 consumers). | `PlanGrid.tsx:82, 115-134, 349-357`; `planGridModel.ts:75-84` |
| 6 | Award scenario grid (3 rows) | READ-ONLY (every column `disabled`) | `PlanGrid.tsx:136-173` |
| 7 | **Adjust** (intake grid action column) | LOCAL STATE — selects the line for the drawer | `PlanGrid.tsx:175-201`; **browser:** `Q1_05_plan_grid_adjust_drawer.png` |
| 8 | Intake grid cells (10 columns) | READ-ONLY; rows are a **direct fixture import**, not the seam (see §3) | `PlanGrid.tsx:389-396`; `planGridModel.ts:142` |
| 9 | **Accepted quantity** input (drawer) | LOCAL STATE (raw text per line; parsed by `normalizeQty`) | `IntakeAdjustDrawer.tsx:91, 185-227` |
| 10 | **Reason** input (drawer; only when adjusted) | LOCAL STATE | `IntakeAdjustDrawer.tsx:232-251` |
| 11 | **Push to PR** (drawer; else a `HandoffNotice`) | **DISPATCH** `t_pr_create`, qty = accepted, `reason` + `decision` in the payload when adjusted; result held in `useState` | `IntakeAdjustDrawer.tsx:124-151, 268-278`; **browser:** `Q1_06_plan_grid_intake_fullscreen.png` |
| 12 | **Full screen / Exit** (per section, Esc) | Presentation only (a `role=dialog` overlay, not the Fullscreen API) | `FullScreenSection.tsx:319-346`; **browser:** `document.fullscreenElement === null`, dialog present |

**No verb on either surface writes an intake line.** The only write in the lane is `t_pr_create`; `getPrIntake` returns the frozen fixture verbatim (`MockProcurementService.ts:532-535`).

---

## 2 · Q1(b) — the grid against Excel

Engine: `react-datasheet-grid` 4.11.6 (MIT, 18 kB gzip, already lazy-chunked). Ruled at FORK-G1 (`docs/g0-2-engine-scorecard.md:7-9`), with AG Grid Enterprise named there as the upgrade target. "Engine" = what DSG can do; "surface" = what Plan Grid uses. Both columns matter, because the surface today gives the engine almost nothing to do: only the 4-cell weights row is editable.

| Excel capability | Engine (DSG) | Surface (Plan Grid today) | Evidence |
|---|---|---|---|
| Cell selection | PRESENT | PARTIAL — works on the weights row; intake/award grids are `disabled` so selection has no consequence | **browser:** click → `.dsg-active-cell` rendered; DSG docs |
| Range selection | PRESENT (Shift+arrows / Shift+click, corner-drag) | PARTIAL — no editable range exists | DSG features page; **browser:** Shift+ArrowRight produced no `.dsg-selection` element on a 1-row grid — inconclusive, **not measured** |
| Copy/paste to/from Excel, multi-cell | PRESENT (TSV both ways, `copyValue`/`pasteValue`/`prePasteValues`) | PARTIAL — one 4-cell paste target | DSG columns API; **browser:** clipboard read denied by the headless context — **not measured** |
| Fill-down / fill handle | PARTIAL (corner-drag expand; no numeric series) | ABSENT — no consumer | DSG props `disableExpandSelection` |
| Undo / redo | **ABSENT** (`undo`: 0 hits in dist; control `paste`: 39) | ABSENT | measured by grep |
| Keyboard nav — arrows / Tab / Enter / F2 | PRESENT | PRESENT on the weights row | **browser:** ArrowRight moves the active cell; Enter opens an `<input>` holding `30`; F2 opens the editor; Esc closes |
| Frozen header row | PRESENT (sticky) | PRESENT | **browser:** `Q1_03` header stays while the section scrolls |
| Frozen key columns | PARTIAL (`stickyRightColumn` only; left gutter) | ABSENT — no Material column freeze; `gutterColumn={false}` | `PlanGrid.tsx:353, 368` |
| Column resize / reorder / hide | **ABSENT** (`resiz` = a ResizeObserver only) | ABSENT — static `useMemo` column set | measured; `PlanGrid.tsx:175-292` |
| Sort | ABSENT | ABSENT | whole files |
| Filter / search | ABSENT | ABSENT (Intake Review has none either) | whole files |
| Grouping | ABSENT | ABSENT | scorecard names it as an AG Grid trigger |
| Totals / subtotals | ABSENT | ABSENT (BulkStockEntryGrid computes a Σ line in plain DOM — a pattern to copy) | `BulkStockEntryGrid.tsx:290-295` |
| Conditional highlighting (variance) | PRESENT (`cellClassName` fn) | PARTIAL — an "Adjusted" chip when accepted ≠ suggested; no %/threshold, no colour rule | `PlanGrid.tsx:250-266`; **browser:** `Q1_03` |
| Exception-first views | — | ABSENT — the meta line counts pending/accepted/dismissed but cannot filter | `IntakeReview.tsx:115-122` |
| Unit handling (UoM) | — | PARTIAL — `uom` is a free string shown beside numbers; never validated against a material master (`material` is a display name, C7 GG-4 open) | `types.ts:1047-1064` |
| Bucket handling (weekly / monthly) | — | ABSENT — `period` is a free string (`2026-Q3`, `2026-08`), no bucket columns | `prIntake.ts` |
| EN / ID | 3 engine strings overridable (row numbers, Add, context menu) | PRESENT for chrome (**browser:** all headers, banner and buttons in ID, `Q1_07`, `Q1_08`, `Q1_09`); engine context menu is English and reachable on the award/intake grids (`disableContextMenu` only on weights) | `PlanGrid.tsx:355` vs `:365-372, 389-396` |
| Virtualisation / large volume | PRESENT (rows and columns) | **UNPROVEN** — the fixture has 4 rows; nothing above 4 has ever rendered on `main`; "2,500+ rows" in `planGridModel.ts:239` is a premise, not a measurement | — |
| Export (CSV / XLSX) | ABSENT | ABSENT | whole files |
| Accessibility | **ABSENT — 0 `role=` / 0 `aria-` in dist** | ABSENT (`main [role=grid]` count = 0 in the browser) | measured |

**What planners have today instead:** a spreadsheet. Against it, the surface loses on every axis a planner touches daily (sort, filter, fill, totals, undo, export, freeze) and wins on exactly two (a governed push with a required reason, and honest SIMULATED/PLANNED markers). That is the gap, stated without designing the product.

### 2.1 · Grid engines for React — the comparison the addendum asked for

Full evidence with URLs and fetch dates is in `_q1_grid_market.md`. Digest (P present · p partial · A absent · **E** paid tier only):

| Capability | AG Grid Community | AG Grid Enterprise | Glide Data Grid | TanStack Table + custom | Handsontable | react-datasheet-grid (installed) |
|---|---|---|---|---|---|---|
| Cell selection | P | P | P | A (build) | P | P |
| Range selection | **E** | P | P | A | P | P |
| Copy/paste Excel multi-cell | **E** | P | P | A | P | P |
| Fill handle | **E** | P | P | A | P | p |
| Undo/redo | P (off under `readOnlyEdit`) | same | A | A | P | A |
| Arrows/Tab/Enter/F2 | P | P | p (no F2) | A | P | P |
| Frozen header | P | P | P | p | P | P |
| Pinned columns | P | P | p (left) | p (state only) | P | p (right only) |
| Resize/reorder/hide | P | P | P/P/p | state only | P | A/A/p |
| Sort / filter | P / p | P / P | A / A | state only | P / P | A / A |
| Grouping | **E** | P | A | state only | p (tree, not group-by) | A |
| Totals / subtotals | **E** | P | A | state only | P | A |
| Conditional styling | P | P | P (canvas draw) | P | P | P |
| Virtualisation rows+cols | P | P | P | p (react-virtual) | P | P |
| Export CSV / Excel | p (API CSV) / **E** | P / P | A | A | P / p | A |
| Controlled edit hook (dispatcher shape) | **P — `readOnlyEdit` + `cellEditRequest`: the grid cannot write** | same | P (`onCellsEdited` batch, cancellable `onPaste`) | yours by construction | P (`beforeChange` veto with `source`) | P (`onChange(rows, operations[])`) |
| Batch / paste events | **E** | P | P | A | P | p |
| ARIA grid semantics | P | P | P (offscreen table) | yours | P (WCAG 2.1 AA, VPAT) | **A (0 role/aria)** |
| i18n | `localeText`/`getLocaleText`; `id-ID` in source, not in docs table | same | n/a (canvas) | yours | 23 packs, **no id-ID** | 3 strings |
| Licence | MIT | **$999 USD / developer, perpetual + 1 yr updates** | MIT | MIT | **"from $999 / developer"** Standard; period not printed on the vendor page (KB says subscription; perpetual by quote) | MIT |
| min+gzip | 377 kB (prunable modules) | not measured | 64 kB + peers | 32 kB + 8 kB virtual | 343 kB | 18 kB |
| React peer | 16.8–19 | same | 16–18 (no 19) | any | wrapper ^18 | 15–19 |
| Last release | 36.2.0, 2026-09-16 | same | 6.0.3, **2024-02-03** (alpha commits to 2026-01) | 9.2.4, 2026-08-28 | 18.1.1, 2026-09-15 | date not found; last commit 2026-03-03 |

Also measured and eliminated: **MUI X** (Community caps at 100-row pages; range/paste/fill/undo are Premium at $599/dev/yr; needs `@mui/material` + emotion beside Tailwind) and **react-data-grid** (peer `react ^19.2` vs the tree's 18.3; range selection closed wontfix).

**Fit with the tree's patterns.** Every edit must be a REQUEST to the dispatcher; the grid may not own data. Three engines have a seam of that shape: AG Grid's `readOnlyEdit` (the grid *cannot* mutate; paste and fill route through `cellEditRequest`; a forgotten handler is a no-op), Glide's `onCellsEdited`/`onPaste` (cancellable, batch), Handsontable's `beforeChange` (a **veto** on a grid that owns the data — a forgotten hook is a silent write, the opposite failure mode). DSG's `onChange(rows, operations[])` is what `BulkStockEntryGrid` already folds into one dispatch, so the tree already has the discipline for it; what DSG lacks is not the seam but undo, left pinning, resize, sort/filter/group/totals and **any accessibility**.

**Recommendation: AG Grid Enterprise** ($999/developer, perpetual). Reasons in order: (1) `readOnlyEdit` makes the dispatcher contract structural rather than a paragraph; (2) every row above is P at Enterprise, including grouping with `groupTotalRow`/`grandTotalRow`, set filter, both-axis virtualisation and Excel export; (3) DOM cells keep Tailwind and the `<Data>` DP-3 mono primitive, and `cellClassRules` carries the SIMULATED/honesty markers; (4) `getLocaleText` plugs into react-i18next and an `id-ID` pack exists in source; (5) weekly release cadence. Costs stated: ~377 kB gzip before module pruning (6× the free tier's nearest), undo/redo is disabled by the very mode we need (undo becomes a compensating command, which is the only honest undo under an append-only ledger anyway), and a licence key ships in the bundle. **Runner-up: Handsontable** (purest spreadsheet; but veto-not-request, tree-not-group-by, no `id-ID`, and a licence period the vendor page does not print). **If the licence is declined:** stay on DSG with sort/filter/totals in `planGridModel` and the a11y gap filed OPEN — not TanStack, which is a grid engine to write, not a batch series. *Nothing was installed.*

Migration from the **measured** baseline (three read-only DSGs, not a hand-rolled table): 6 batches — engine + theme tokens + licence; read-only swap; `readOnlyEdit` dispatch seam with a mutation probe; Excel surface + export + undo ruling; grouping/totals/filter; retire DSG from Plan Grid (+1 if `BulkStockEntryGrid` follows). Staying on DSG ≈ 3 batches and ends in a fork.

---

## 3 · Q1(c) — correctness

| Question | Answer | Evidence |
|---|---|---|
| Every figure derived or authored? | Intake `suggestedQty / acceptedQty / wasAdjusted / estimatedValue / period / uom / deficit` are **fixture literals**; `estimatedValue` is not qty × price (no price exists). `wasAdjusted` is authored, not derived from the two quantities — a fixture edit can make it lie. Award sub-scores and `aiCompositeScore` are authored seam values (F0.3-FIND-01 stands). The **what-if score is derived** (Σw·s/Σw, zero-weight guarded) and labelled "Client-computed". | `fixtures/prIntake.ts:17-78`; `planGridModel.ts` |
| Clock reads on the render path? | **Zero** in `IntakeReview.tsx`, `PlanGrid.tsx`, `plan-grid/*`, `intake-review/*`, `prCreatePayload.ts`. One clock read on the **write** path: `createdDate: new Date().toISOString()` at `MockCommandService.ts:773` — an authoring timestamp, not a projected state (law 0.5 not breached). | grep |
| Fabricated defaults? | `create()` still has `str()→''` / `num()→0` fallbacks for `category / requestor / costCenter / justification`; rendered as "—"/"None". No numeric fabrication remains on this path (the `estimatedValue`/`priority` defaults were retired). | `MockCommandService.ts:749-750` |
| **Bucket stored as a date** | `requiredDate: str('requiredDate') \|\| str('period')` — the intake **period** becomes the PR's required date. **Measured:** a pushed `2026-Q3` line renders **"—"** on the requisitions page (browser: `PR-2026-902 … 12.000 KG — Rp 534.0jt … Draft`); a `2026-08` line renders **"01 Aug 2026"** under vite-node, a day nobody entered. | `MockCommandService.ts:767`; `prCreatePayload.ts:130`; `BuyerRequisitions.tsx:745`; `Q1_12` |
| **The two surfaces disagree** | Rows `pil-somo-002` (5,000 suggested / 4,500 accepted) and `pil-grid-002` (80,000 / 90,000) arrive **already adjusted by the producer**. Intake Review "Accept as suggested" pushes **5,000**; Plan Grid's drawer pre-fills **4,500**, computes `adjusted = true` and **demands a planner reason for SOMO's own delta** before it will push. Same row, two quantities, and one path makes the human justify an override they did not make. | `intakeReviewModel.ts:28`; `IntakeAdjustDrawer.tsx:108, 121-122, 232-249` |
| **Grid bypasses the seam** | Intake Review reads `svc.procurement.getPrIntake(scope)` (supplier scope → `[]`); Plan Grid renders `SAMPLE_INTAKE_LINES` **imported from the fixture**. Routes are not persona-gated, so a supplier seat typing `/buyer/plan-grid` sees buyer intake the seam would refuse. The day `getPrIntake` reads a store, the two pages diverge silently. | `planGridModel.ts:23, 142`; `MockProcurementService.ts:533`; `AppRouter.tsx` |
| **Override reason is required, then dropped** | Drawer requires `reason` → payload carries it → `create()` never reads it → `PurchaseRequisition` has no `reason`/`decision` field → the requisitions drawer cannot show it. The `decision` rides the DR-10 audit event, which **no surface renders**. The intake line id is not persisted either. The flow C6-LOCK calls "audited" records nothing an approver can read. | `MockCommandService.ts:747-796`; `dispatcher.ts:361-363`; `types.ts` |
| Duplicate pushes | No `idempotencyKey` in `PrCreateVars` although the dispatcher supports one; no committed flag on the row. **Measured:** Accept → reload → the row is PLANNED again with the PR still in the store. Three Draft PRs for one requirement is one click away. | `commandHooks.ts:904-914`; `dispatcher.ts:432` |
| Docs vs code | `Stage_G_Grid_Planning_Layer_Plan_v1.md:174` still says FORK-G1 **OPEN**, lean AG Grid — the scorecard **ruled DSG on 2026-07-14** and `package.json:28` ships it. Three source headers (`planGrid.ts:2-3`, `PlanGrid.tsx:51`, `planGridModel.ts:11-14`) say "nothing here dispatches" while the drawer dispatches `t_pr_create`. Eight `planGrid.*` i18n keys have 0 consumers (they describe a retired panel). | as cited |

---

## 4 · Q1(d) — the flow, and where work gets stuck or lost

```
SOMO / Internal Grid ──(fixture; no producer write path)──► PR_INTAKE_LINES (frozen, 4 rows, planState literal)
      │ Intake Review: Accept ─► t_pr_create (qty = suggested)            ┐ no intake store
      │ Intake Review: Dismiss ─► useState only (gone on reload)          │ no "reviewed" state
      │ Plan Grid: Adjust → drawer → Push ─► t_pr_create (qty = accepted) ┘ reason in payload only
      ▼
purchaseRequisitionStore: Draft PR-2026-9xx  (no intake id, no reason, period stored as requiredDate)
      │ t_pr_submit → Pending Approval → t_pr_approve / t_pr_reject → t_pr_revise → Draft   (wired, BuyerRequisitions)
      ▼
   Approved ──t_pr_source (cascade DECLARED, no link)──► Sourcing Event    ← only the RFQ-create resolver writes linkedDoc
   Approved ──t_pr_convert (cascade DECLARED, no link)──► PO Created        ← nothing fires it: the flow's only terminal is unreachable
      ▼
SDC ForecastLine (materialCode + periodBucket + canonical Uom)               ← DIFFERENT KEYS; no join, no verb, no cascade
```

Where a planner loses work, in the order they would feel it:

1. **Triage is not recorded** (measured). A morning's accept/dismiss is gone by lunch; a colleague on another seat sees the untouched set.
2. **Review → Grid hand-off is by eye.** The link carries no id; at hundreds of rows that is a search the surface does not offer.
3. **Same line, three PRs.** No idempotency key, no committed flag, two surfaces with independent state.
4. **The PR forgets where it came from.** No intake id, no deficit, no reason, no decision on the document; `source` (SOMO/INTERNAL_GRID) is stored but `BuyerRequisitions` has no column for it. An approver cannot see that this Draft is a planner's override of a SOMO suggestion, nor why.
5. **The bucket becomes a wrong or missing date** at the next surface.
6. **After approval the PR strands.** `t_pr_source` / `t_pr_convert` are declared cascades with no authored link; `PO Created` is unreachable by any act in the tree (`purchaseRequisition.flow.ts:6-9, 159-195`). A planner reads this as "my requisition never becomes anything". (Cross-referenced in R3.)
7. **No path from intake into supplier collaboration.** The two "SOMO" producers — intake lines and SDC forecast publications — never meet: different keys, no verb, no cascade.
8. **The award what-if is a demo of one RFQ.** Hardcoded `rfq-003`, cannot be saved, compared, or turned into an award (`t_rfq_award` lives on `BuyerSourcing`).

---

## 5 · Findings, ranked by planner impact, sized in batches

Batch ≈ one PR of this repo's usual size (design + write path + i18n + tests + browser QA). Confidence is on the diagnosis.

| # | Finding | Impact | Batches | Confidence |
|---|---|---|---|---|
| **F1** | **No planning grid exists** — no material × bucket matrix, no demand/stock/ROP, no horizon, no bulk edit. The Excel benchmark cannot be met because the object is missing. | **P1** — nothing for a planner to do daily | 4–6: read seam + material-code/bucket contract (C7 GG-3/GG-4) + the grid + one governed edit verb + i18n/QA; engine per §2.1 (+6 if AG Grid) | High |
| **F2** | **Triage and commitment are not recorded**; same line pushable repeatedly; no `idempotencyKey`. | **P1** — work lost daily; duplicate PRs | 1–2: an intake store + `t_intake_accept/dismiss` (or a persisted per-line state keyed by line id); `getPrIntake` reads it; hook sends the key | High (measured) |
| **F3** | **Override reason evaporates; PR carries no intake provenance.** The "audited" override is invisible to the approver. | **P1** — governance claim false at the reader | 1: persist `reason` + `decision` + intake id on the PR; render in the requisition drawer | High |
| **F4** | **Two surfaces push different quantities** for a producer-adjusted line; the drawer demands a planner reason for SOMO's delta. | P2 — wrong quantity on one of two paths | 0.5 + **operator ruling** on C6-LOCK's subject (`wasAdjustedBy`: producer vs human) | High |
| **F5** | **`period` stored as `requiredDate`**; renders "—" (quarter) or a fabricated day (month). | P2 — wrong date on every pushed PR | 1: a bucket field on `PurchaseRequisition`, quarter/month labels; C7 GG-3 touch | High (measured) |
| **F6** | **Volume is 4 rows.** Virtualisation, density and performance have never been exercised. | P2 — untested at the scale it was designed for | 0.5: a generated ≥1,000-line fixture behind the seam + a browser measurement (mind `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`) | High |
| **F7** | **No sort / filter / search / exception view / totals / export / undo / resize** on either surface. | P2 — daily friction the moment rows exceed one screen | 2–3 on DSG (plain-DOM sort/filter/exception toggles + CSV); undo/grouping only via engine change | High |
| **F8** | **Plan Grid reads the fixture, not the seam**; supplier seat can see buyer intake. | P3 — tenancy hygiene | 0.25: repoint to `useIntakeReview` | High |
| **F9** | Engine context menu English-only and reachable on two grids. | P3 | 0.1 | Medium |
| **F10** | Dead i18n keys + three stale "nothing dispatches" headers. | P3 | 0.25 | High |
| **F11** | Stage G register says FORK-G1 OPEN / AG Grid lean while the scorecard ruled DSG. | P3 — docs | 0.1 | High |
| **F12** | Approved PR strands (`t_pr_source`/`t_pr_convert` unlinked; `PO Created` unreachable). | P2 (cross-lane; R3) | 1–2 | High |
| **F13** | No intake → SDC join (display name vs `materialCode`; `period` vs `periodBucket`). | P2 (cross-lane; R2/arc 2) | contract first, then 1 | High |
| **F14** | **Engine has zero ARIA** (0 `role=`/`aria-` in dist; 0 `[role=grid]` in the DOM). A planning grid for daily use with no keyboard/screen-reader semantics. | P2 — accessibility | rides the engine decision | High (measured) |

**Not measured in this review:** clipboard fidelity (headless read denied), range-selection rendering (no multi-row editable grid to measure on), any timing, mobile.

---

## 6 · Decisions the operator must make (from this file)

1. **Build the planning object first or the grid first?** F1 is an object, not a widget; the Excel gap is real but secondary until a material × bucket matrix exists on the buyer side.
2. **Engine and licence.** AG Grid Enterprise at $999/developer perpetual (recommended), Handsontable, or stay on DSG and file the a11y gap OPEN.
3. **C6-LOCK's subject** (F4): is a producer-adjusted line an override the planner must justify, or the producer's own act?
4. **What the PR must carry** (F3/F5): intake id, reason, decision, and a bucket field — a C7 contract touch.
