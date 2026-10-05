---
entity: inventoryDeclaration
locale: en
title: Stock on hand declaration (SOH)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_inventorydeclaration_declare
  - t_inventorydeclaration_record
---

<!-- section:summary -->
## 1 · What this process is

A stock on hand (SOH) declaration is what a supplier says it is holding right now, for one item. It is the number Paragon plans against when it cannot see the supplier's own stock. Each declaration is a dated snapshot for one supplier and one material: a **total** quantity (the floor) and, optionally, the **batches** that make it up, each with a batch number, a quantity and an expiry date. When batches are given they must add up to the total; a total that disagrees with its own detail is refused.

Two roles write it, through two different verbs that land in the same place. The supplier's logistics contact (the `fulfilment` lane) declares its own stock on `/supplier/forecasts` → **Stock (SOH)**, either one material at a time, through the bulk grid (one row per batch, with an optional Excel import), or by confirming a parsed channel reply on `/supplier/comm-hub`. The planner (`planning`) records stock a supplier reported over WhatsApp, email or WeChat on `/buyer/comm-hub` → **Triage a channel reply**; that record is kept permanently distinguishable from a supplier's own statement, because who said it matters when the number turns out wrong.

There is no lifecycle to walk. A declaration is born in its one state, **Declared**, and never leaves it: a new count is a new declaration, appended, never an edit of the old one. "Current stock" is derived at read as the most recently added declaration per supplier and material, and every earlier one is kept for comparison. The buyer never edits, verifies or rejects a declaration; it reads the current one into the supplier-coverage indicator on `/buyer/collaboration`.

Honesty markers. Every seeded declaration is SIMULATED; the Stock tab carries the pill *Sample — awaiting live supplier feed*, and the bulk grid says it is a fixture-first stand-in for the hosted magic-link grid (real link delivery, tokens and supplier identity arrive with the Communication Hub / backend). Both channel-inbox pages are operator-fed: you paste the reply; nothing is sent or received live. All stamps come from the shared simulated clock (the app's "today" is 31 Aug 2026). No act here belongs to S/4HANA, TMS or the bank.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1a | ∅ → Declared | operator action (creation) | supplier · fulfilment | `t_inventorydeclaration_declare` |
| 1b | ∅ → Declared | operator action (creation, recorded by Paragon) | buyer · planning | `t_inventorydeclaration_record` |

**Forks**

- **Who states the number (at creation):** `t_inventorydeclaration_declare` — supplier's logistics contact — when the supplier declares in the portal, the bulk grid or its own channel inbox; `t_inventorydeclaration_record` — planner — when the supplier's words arrived over an ungoverned channel and Paragon writes them down. Same store, same state, same checks; only the verb, the role and the recorded actor differ.
- **At Declared:** no exits. Declared is the flow's initial and only terminal state.

<!-- section:steps -->
## 3 · Step by step

### t_inventorydeclaration_declare — Declare your stock <!-- transition:t_inventorydeclaration_declare -->

- **Step kind:** operator action (creation)
- **Role:** supplier · fulfilment (the supplier's logistics contact)
- **From → to:** ∅ → Declared
- **Operator — where:** three doors into one verb. (1) `/supplier/forecasts` → tab **Stock (SOH)** → **Declare stock** → panel *Declare current stock* → **Declare stock**. (2) Same tab → **Bulk stock entry** → pick material and total, fill the grid (optionally **Import from Excel**) → **Declare stock**. (3) `/supplier/comm-hub` → paste the reply you received (the box's example reads `STOK MAT-10234 2.400 KG`; the code must be one of your collaborated materials) → **Parse reply** → check the proposed row → **Confirm & record**.
- **Operator — do:** State the total you currently hold for one of the materials Paragon collaborates with you on, and — if you have it — the batch detail underneath, so Paragon can judge expiry as well as quantity.
- **Operator — fill:** Step 1 *Material* — one of your collaborated materials; the unit is set by the material, you never pick it. Step 2 *Total stock on hand* — digits only (e.g. `2400`); `0` is valid if you hold none. Step 3 (optional) *Batch detail* — *Batch number*, *Quantity*, *Expiry date* per row; the banner *Batch total: {sum} of {total} {uom}* must balance. In the bulk grid the material and total are header fields and the grid holds only batch rows; an imported spreadsheet fills batch rows after you match your columns (*Batch number ← your column*, *Quantity ← your column*, *Expiry date ← your column (optional)*). In the channel inbox the material and total are read from the message and shown for you to confirm or correct.
- **Tester — expected state:** Declared
- **Tester — confirm:** toast *Stock declared — {material}* / *Your current stock is recorded under Stock (SOH).* (bulk: *Your batch-grain stock is recorded under Stock (SOH).*; inbox: *Recorded from {channel}*). The Stock tab shows the new card (`inv-9001`, `inv-9002`, …) with the chip **Batch detail** or **Total only**, *as of {date}* from the shared clock, and each batch with *expires {date}* or *no expiry*; a total-only card carries the hint that expiry bridgeability is not assessable. On `/buyer/collaboration` the *Coverage* cell for that supplier × material re-derives from this declaration — **Covered / At risk / Uncovered** with the ratio, marked *Model*, plus *expiry-blind* when the declaration is total-only.
- **Tester — trigger event:** `t_inventorydeclaration_declare`
- **Checks that can refuse:** `sdc_material_known` — the code must be in the material master (`UNKNOWN_MATERIAL` otherwise; no unit is ever guessed); `inv_declare_batch_total` — when batches are present their quantities must sum exactly to the total. Before either, scope: the material must be one Paragon collaborates with you on (a relationship exists, or a publication has ever fanned it to you), else `SCOPE_DENIED`. The page and the grid pre-check the same things and refuse with a named reason before dispatching (empty total, missing batch number, invalid or ambiguous quantity, batches not summing, no rows).
- **Glossary:** `EMPTY_QTY` · `NOT_NUMERIC` · `AMBIGUOUS_QTY` (quantity refusals); `POLICY_REJECTED`; `SCOPE_DENIED`.
- **Honesty:** Seeded declarations are SIMULATED and the tab's pill says *Sample — awaiting live supplier feed*. The bulk grid is the fixture-first magic-link surface running on your signed-in session. The channel inbox is operator-fed — no live channel. A total-only declaration is honest about the floor but expiry-blind; the buyer's coverage marks it so rather than assuming no expiry risk. An Excel file never leaves the browser; it only pre-fills batch rows, and any quantity the parser cannot read imports blank and is listed before you import.
<!-- src: src/services/transitions/flows/inventoryDeclaration.flow.ts:79-91; src/services/data/mock/MockCommandService.ts:1397-1482; src/services/data/mock/MockCommandService.ts:1352-1389; src/pages-v2/SupplierForecasts.tsx:794-904; src/pages-v2/SupplierForecasts.tsx:1623-1684; src/pages-v2/SupplierForecasts.tsx:2198-2370; src/pages-v2/BulkStockEntryGrid.tsx:132-140; src/pages-v2/BulkStockEntryGrid.tsx:349-384; src/pages-v2/BulkStockEntryGrid.tsx:455-464; src/pages-v2/XlsxImportPanel.tsx:20-45; src/pages-v2/XlsxImportPanel.tsx:315-319; src/pages-v2/CommHubInbound.tsx:130-142; src/pages-v2/CommHubInbound.tsx:254-262; src/services/sdc/ingest.ts:189-252; src/services/sdc/parseWorkbook.ts:41-45; src/services/sdc/parseWorkbook.ts:166-182; src/lib/i18n/sdcSupplier.ts:175-298; src/services/query/sdcSupplierHooks.ts:370-396; src/services/sdc/inventory.ts:19-25 -->

### t_inventorydeclaration_record — Record a supplier's channel reply <!-- transition:t_inventorydeclaration_record -->

- **Step kind:** operator action (creation, recorded by Paragon on the supplier's behalf)
- **Role:** buyer · planning (the planner)
- **From → to:** ∅ → Declared
- **Operator — where:** `/buyer/comm-hub` → panel **Triage a channel reply** → *Whose conversation is this?* (select the supplier) → *Channel* (WhatsApp / Email / WeChat) → *Message text* → **Parse reply** → *Confirm what to record* (material and total per row) → **Confirm & record**
- **Operator — do:** Write down stock a supplier reported to you over chat or email, as Paragon's record of the supplier's words. You choose the supplier before pasting; that choice binds the message and cannot be changed at confirm.
- **Operator — fill:** the supplier (binding), the channel, the verbatim message (e.g. `STOK PK-PETB-8810 2.400 PCS`), then per proposed row the *Material* (from that supplier's collaborated materials; an unknown token stays unmapped and blocks confirm) and the *Total quantity* in the material's own unit. The triage records a total per material; batch detail is not entered here.
- **Tester — expected state:** Declared
- **Tester — confirm:** result line *Recorded by Paragon from {channel}: {material} — {qty}* and toast *Recorded from {channel}* / *The supplier's reply was recorded by Paragon as a governed declaration.* The subject supplier's own Stock (SOH) tab shows the new declaration as its current stock without a reload (the record invalidates that supplier's reads and the buyer consolidation, and nobody else's). The buyer's *Coverage* cell re-derives. In the event stream the actor is `buyer:all`, not the supplier.
- **Tester — trigger event:** `t_inventorydeclaration_record`
- **Checks that can refuse:** `sdc_material_known` — `UNKNOWN_MATERIAL` if the code is not in the master (the page shows *The material master does not know this code…*); `inv_declare_batch_total` — batches, when present, must sum to the total. Scope: this target requires a resolvable owner even for a buyer, so recording for a supplier × material the governed data never names is `SCOPE_DENIED`. A seat without the planning lane sees *Awaiting Planning* in place of **Confirm & record**.
- **Glossary:** `POLICY_REJECTED`; `SCOPE_DENIED`; `ROLE_NOT_PERMITTED`; `AMBIGUOUS_QTY`.
- **Honesty:** Operator-fed — no live channel; nothing is sent or received. The result is framed *Recorded by Paragon*, never *the supplier submitted it*, and the two verbs stay distinguishable forever in the event stream by verb, role and actor — no flag is stored on the declaration. A parsed reply is a suggestion until you confirm it.
<!-- src: src/services/transitions/flows/inventoryDeclaration.flow.ts:33-57; src/services/transitions/flows/inventoryDeclaration.flow.ts:101-110; src/services/data/mock/MockCommandService.ts:1407-1418; src/pages-v2/BuyerChannelTriage.tsx:43-69; src/pages-v2/BuyerChannelTriage.tsx:157-173; src/pages-v2/BuyerChannelTriage.tsx:275-302; src/pages-v2/BuyerChannelTriage.tsx:576-588; src/lib/i18n/buyerCommHub.ts:47-80; src/lib/i18n/commHubInbound.ts:47-48; src/services/query/sdcBuyerHooks.ts:108-177; src/services/channel/types.ts:30-39; src/services/transitions/dispatcher.ts:556-568 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Who declares (at creation).** Branch A — `t_inventorydeclaration_declare` — **When:** the supplier states its own stock through the portal, the bulk grid or its own channel inbox; the recorded actor is the supplier. Branch B — `t_inventorydeclaration_record` — **When:** the supplier replied over an ungoverned channel and the planner transcribes it; the recorded actor is the buyer.
- **Total only or batch detail (inside the declaration).** Branch A — total only — **When:** you know the floor but not the batches; legal and honest, but the buyer's coverage is marked *expiry-blind*. Branch B — batches given — **When:** you can itemise; the batch quantities must sum to the total or the declaration is refused (`inv_declare_batch_total`), and the coverage read becomes expiry-aware.
- **Correcting a wrong number.** Not a transition. There is no edit, verify or reject: declare again. The newest declaration becomes the current one; the earlier one stays on record.
- **Bulk grid refusals (before dispatch).** *Enter the total stock on hand* (empty total) · *A row has a quantity but no batch number* · *A batch quantity is not a valid number* · *A quantity could be read two ways (1.800 = 1,800 or 1.8)* · *batches must sum to the total* · *Enter a total, or one or more batches.* — **When:** the grid's adapter cannot fold the rows into one declaration; the offending rows are tinted and nothing is dispatched.
- **Excel import refusals (before the grid).** *That file isn't a readable .xlsx workbook* · *no usable sheet* · *no data rows* · *no header row* — **When:** the file tier fails; zero rows are imported and the grid is untouched.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Total only / Batch detail | derived at read | Declared | whether the declaration carries batches | `/supplier/forecasts` Stock (SOH) card chip |
| expiry-blind | derived at read | Declared (buyer coverage) | the current declaration is total-only, so expiry bridgeability cannot be assessed | `/buyer/collaboration` *Coverage* cell, italic marker; supplier card hint |
| No declaration | derived at read | no declaration for the pair | a supplier × material with Firm / Semi-firm demand and no SOH ever declared — an honest blank, never a zero | `/buyer/collaboration` *Coverage* cell |
| Covered · At risk · Uncovered | derived at read (modelled) | Declared | (current total + incoming Booked/Shipped legs) ÷ committed demand: ≥ 1 covered, ≥ 0.8 at risk, below uncovered | `/buyer/collaboration` *Coverage* chip with ratio, marked *Model* |
| lead time unbridgeable | derived at read | at risk / uncovered, distributor only | the shortest principal lead time exceeds the days left to the committed horizon's end | appended to the coverage chip |
| Sample — awaiting live supplier feed | SIMULATED marker | whole tab | seeded declarations are simulated | `/supplier/forecasts` Stock (SOH) tab pill |
| Fixture-first grid | SIMULATED marker | bulk grid | always in this build — magic-link delivery, tokens and identity are not built | bulk grid note |
| Operator-fed inbox — no live channel | SIMULATED marker | channel inboxes | always in this build | `/supplier/comm-hub` banner; `/buyer/comm-hub` triage honesty note |
| Awaiting Supplier Fulfilment / Awaiting Planning | role handoff | any control | the seat does not hold `inventorydeclaration:declare` / `:record` | in place of **Declare stock**, **Bulk stock entry** or **Confirm & record** |

<!-- src: src/services/sdc/inventory.ts:19-25; src/services/sdc/consolidation.ts:54; src/services/sdc/consolidation.ts:539-672; src/pages-v2/BuyerCollaboration.tsx:728-790; src/pages-v2/SupplierForecasts.tsx:1896-1900; src/lib/i18n/sdcSupplier.ts:180-186; src/lib/i18n/sdcSupplier.ts:228-230; src/lib/i18n/sdcConsolidation.ts:67-82; src/lib/i18n/widget.ts:51; src/lib/i18n/commHubInbound.ts:10-12; src/lib/i18n/buyerCommHub.ts:75-76; src/lib/i18n/roles.ts:48-52 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `inv-0001` (no document number — the store id is the number; supplier `sup-002`, material `RM-EMUL-3310` Glycerin USP 99.5%, declared 2026-08-03, total 4 000 KG).

| Joins to | By | Note |
|---|---|---|
| Material master entry | `materialCode` | the unit (KG) on the total and on every batch is copied from the master at creation; the payload never carries a unit |
| Supplier-material relationship | `supplierId` + `materialCode` | sup-002 is a manufacturer for this material; membership (relationship or any published line) is what admits the declaration at scope |
| Batches (children) | `batches[]` | `GLY-24A` 1 800 KG expires 2027-06-30; `GLY-24B` 2 200 KG expires 2027-09-30; 1 800 + 2 200 = 4 000 — the invariant the policy hook enforces |
| Supplier-coverage indicator | `supplierId` + `materialCode` | display-only projection: 4 000 declared + 6 000 incoming (`ish-0001`, Shipped) ÷ 6 000 Firm demand → **Covered · 1.67×**, expiry-aware |
| Incoming shipments | `supplierId` + `materialCode`, lifecycle Booked or Shipped | added to the declared total in the coverage read; Arrived and Cancelled legs never count |
| Submission session `ss-0001` | `attempted[].objectId` | the visit that also confirmed `rr-0001` and reported `ish-0001`; audit correlation only |
| Channel message (record path only) | `ChannelMessage.supplierId` | for `t_inventorydeclaration_record` the subject supplier is bound from the captured message, never from a form field |

Display-only: `declaredAt` is stamped by the store from the shared clock; "current" is decided by store insertion order, not by this date, so a fresh declaration always outranks a future-dated seed. `provenance` (`SUPPLIER` · `SIMULATED` · `committed`) is carried and never rewritten. No status field exists on the object.

<!-- src: src/services/sdc/fixtures.ts:1283-1296; src/services/sdc/fixtures.ts:862-868; src/services/sdc/fixtures.ts:1335-1348; src/services/sdc/fixtures.ts:1371-1381; src/services/sdc/types.ts:578-610; src/services/sdc/inventory.ts:44-66; src/services/sdc/consolidation.ts:609-650; src/services/data/mock/MockCommandService.ts:1426-1458 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `supplier:<supplierId>` for the supplier's own declaration or `buyer:all` for a planner's record, `ts` from the shared clock, `outcome` and a `correlationId`. In a multi-object supplier visit the first command's `correlationId` is the anchor and later commands carry it as `causationId`. Because the object has one state and no exits, its history is one event per declaration; the story of a material's stock is the sequence of declarations, each kept.

Worked sequence for `inv-0001`'s material (sup-002 × RM-EMUL-3310) as a tester would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Declared (`inv-0001`, seeded) | supplier · fulfilment | **Declare stock** with two batches summing to 4 000 KG | `t_inventorydeclaration_declare` |
| T+1 | ∅ → Declared (`inv-9001`) | supplier · fulfilment | **Declare stock** again, total only, e.g. 3 000 KG — becomes the current SOH; `inv-0001` stays on record | `t_inventorydeclaration_declare` |
| T+2 | ∅ → Declared (`inv-9002`) | buyer · planning | **Confirm & record** on `/buyer/comm-hub` after pasting the supplier's chat reply — actor `buyer:all`; becomes the current SOH | `t_inventorydeclaration_record` |

<!-- src: src/services/transitions/events.ts:26-60; src/services/transitions/events.ts:127-129; src/services/sdc/session.ts:15-27; src/services/sdc/inventory.ts:44-66; src/services/data/mock/MockCommandService.ts:1403-1406 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| Toast *Batch row {n} cannot be recorded* / *This row has a quantity or an expiry date but no batch number…* | the line under the batches names the same row; nothing is declared | a batch row with a quantity or an expiry but no number (before SDC-4 it was dropped silently, and the Σ check then misreported the sum) | enter the batch number, or clear the row completely |
| **Confirm & record** greyed out, with *Every row needs a material and a total before anything is recorded…* | a row's material reads *Select the material…*, or its total is blank | the reply named something that is not one of your materials, or a line carried no quantity | pick the material, or press **Remove row** — no row is left out without that act |
| Toast *Recorded {n} of {m} rows* / *… rows were not recorded — each one says why below.* | the result lines list every row; a refused one carries its reason | a row's quantity or material was refused at the gate | correct that row and record it again |
| `/supplier/inventory` shows a different figure from **Stock (SOH)** | the page's first section, *Stock you declared to Paragon*, lists your latest declaration per material; the table below it is a separate sample feed | two sources on one page, each labelled | the declared section is the figure Paragon plans with |
| No **Declare stock** / **Bulk stock entry**, only *Awaiting Supplier Fulfilment* | handoff notice in the buttons' slot | the supplier seat does not hold `inventorydeclaration:declare` (fulfilment) | a seat holding the fulfilment lane declares (`ROLE_NOT_PERMITTED` if forced) |
| No **Confirm & record** on the triage panel, only *Awaiting Planning* | handoff notice under the rows | the buyer seat lacks `inventorydeclaration:record` (planning) | switch to a planning seat |
| Toast *Total quantity required* with a "read two ways" message | typed `2.400` or `2,400` | `AMBIGUOUS_QTY` — the one parser refuses rather than guesses | type `2400` |
| Toast *Batches do not sum to the total* | *Batch total: {sum} of {total}* does not balance | the page's pre-check of the same rule the hook enforces | fix a batch quantity or the total |
| Toast *Stock not declared* + *batches must sum to the total* (bulk grid) | offending rows tinted | the grid adapter refused the fold | reconcile; the total is the stated floor, it is never derived from the batches |
| Toast *Stock not declared* + *A row has a quantity but no batch number* | a partially filled grid row | every itemised batch needs a number | add the batch number or clear the row |
| Import lists *Quantities that could not be read: N* | rows named with *no quantity* / *not a number* / *could mean two different numbers* | cells the parser refused import blank | retype them in the grid; if most rows are listed, check the Quantity column mapping |
| *That file isn't a readable .xlsx workbook* / *no usable sheet* / *no data rows* / *no header row* | import panel message, zero rows | file-tier refusal | fix the file; the grid is untouched |
| `POLICY_REJECTED:sdc_material_known` — *UNKNOWN_MATERIAL* | the material shows a dash for its unit | a collaborated code the master lacks | have the code added to the master; nothing is stored with a guessed unit |
| `POLICY_REJECTED:inv_declare_batch_total` | reached only by a caller that skipped the page's pre-check | batch sum ≠ total | resubmit with balanced figures |
| `MISSING_FIELDS` | dispatch without materialCode or totalQty | a caller outside the page | use the page or the grid |
| `SCOPE_DENIED` (thrown; shown in the toast) | supplier declaring a material Paragon does not collaborate with them on; planner recording for a supplier × material the data never names | scope gate ahead of the role gate | pick a material from the offered list — the lists are exactly the set the verb accepts |
| `ILLEGAL_TRANSITION` / `STALE_STATE` | never produced here | the flow has no non-creation verb and no caller supplies `expectedState` | n/a |
| Buyer coverage still shows the old number | *Coverage* cell unchanged after a supplier declared | reads are cached per seat; a supplier's own declare invalidates its scope and the buyer scope in the same session | reload the buyer page; a persona switch re-reads the live store |
| Coverage shows *No declaration* for a material the supplier says it declared | the pair carries Firm / Semi-firm demand and no declaration in the store | the declaration was made for a different material code, or was refused | check the Stock tab for the exact code; declare again |
| Coverage reads *Covered* but carries *expiry-blind* | current declaration is total-only | expiry bridgeability cannot be assessed from a total | declare batch detail (panel Step 3, or the bulk grid) |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SDC`, or `MODULE_INACTIVE:SDC.stockOnHand` when only *Stock on hand* is off; where the surface checks first, the control reads *"Switched off — Supplier collaboration"* | the Supplier collaboration module (or one of its parts) is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:556-568; src/lib/i18n/sdcSupplier.ts:119-124; src/lib/i18n/sdcSupplier.ts:211-298; src/lib/i18n/commHubInbound.ts:47-48; src/services/data/mock/MockCommandService.ts:1375-1389; src/services/data/mock/MockCommandService.ts:1466-1482; src/services/query/sdcSupplierHooks.ts:117-136; src/services/query/sdcBuyerHooks.ts:99-118; src/pages-v2/BuyerChannelTriage.tsx:153-157 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Declared | `inv-0001` | — | sup-002 · RM-EMUL-3310 (Glycerin USP 99.5%) · 4 000 KG · batch detail (`GLY-24A` 1 800 exp 2027-06-30, `GLY-24B` 2 200 exp 2027-09-30) · declared 2026-08-03; buyer coverage for the pair **Covered · 1.67×** (with `ish-0001` 6 000 KG Shipped) |
| Declared | `inv-0002` | — | sup-005 (distributor, principal lead time 45 days) · RM-EMUL-3310 · 1 500 KG · one batch `DST-1180` exp 2027-03-31 · declared 2026-08-03; coverage **Covered · 1.57×** (with `ish-0002` 4 000 KG Booked against 3 500 KG demand) |
| Declared | `inv-0003` | — | sup-007 · PK-PETB-8810 (PET Bottle 250ml) · 45 000 PCS · **Total only** · declared 2026-08-05; coverage **Covered · 1.13×** against 40 000 PCS Firm demand, marked *expiry-blind* |

Pairs with committed demand and no declaration at the shared clock (the honest blank on the buyer grid): sup-002 × RM-EMUL-3320, sup-005 × PK-PETB-8810, sup-007 × PK-CAPF-8820. Declarations created live are numbered from `inv-9001` and rank above every seed as the current SOH regardless of date. For the buyer triage, the worked example in the message box is `STOK PK-PETB-8810 2.400 PCS` with sup-007 as the subject supplier. The sample supplier seats hold all three supplier lanes.

<!-- src: src/services/sdc/fixtures.ts:1283-1324; src/services/sdc/fixtures.ts:862-884; src/services/sdc/fixtures.ts:1328-1363; src/services/sdc/consolidation.ts:576-672; src/services/sdc/inventory.ts:27-47; src/lib/i18n/buyerCommHub.ts:58-62; src/services/identity/sampleRoster.ts:132-134 -->
