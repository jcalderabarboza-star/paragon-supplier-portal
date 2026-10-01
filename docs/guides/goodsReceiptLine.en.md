---
entity: goodsReceiptLine
locale: en
title: Goods receipt line
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_grline_inspect
  - t_grline_accept
  - t_grline_reject
  - t_grline_quarantine
  - t_grline_release
  - t_grline_return
---

<!-- section:summary -->
## 1 · What this process is

The per-item verdict behind a delivery's overall outcome. A delivery is only as good as its worst item, and this is where that is decided. Each line of a goods receipt is modelled as its own small machine — looked at, then accepted, rejected, quarantined, released or returned — and the receipt's header state (Approved / Partially Approved / Rejected) is defined as a **rollup** of these line states, never a separately asserted value.

**This process is modelled, not active.** The flow is authored and registered (its vocabulary validates and appears on `/buyer/process-flows` badged authored-unwired), but it has **no command target**: none of its six verbs can be dispatched, no screen offers them, and no store holds a line as an addressable entity. What the portal does today is record the per-line inspection **facts** at receipt creation (the `Quality checks` step of the GR wizard) and derive each line's state from those facts (`Pending` / `Accepted` / `Rejected` / `Partial`) to roll the header up. The owner of the act, in the sense this registry uses, is the **substrate**: the line machine is the schema the header's legality is proved against, and per-line commands are deferred until a line-level editing surface exists. The lane that would hold the verbs is buyer **receiving** (`gr:inspect` for looking and holding, `gr:disposition` for every verb that lands on an outcome).

There is **no fixture** for a line — the GR fixtures carry `inspectionResults` rows, not line documents — and nothing in the demo is SIMULATED at this grain because nothing renders a line's machine state.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | Pending → Inspected | modelled, not active (no target) | buyer · receiving (`gr:inspect`) | `t_grline_inspect` |
| 2a | Inspected → Accepted | modelled, not active (no target) | buyer · receiving (`gr:disposition`) | `t_grline_accept` |
| 2b | Inspected, Quarantined → Rejected | modelled, not active (no target) | buyer · receiving (`gr:disposition`) | `t_grline_reject` |
| 2c | Inspected → Quarantined | modelled, not active (no target) | buyer · receiving (`gr:inspect`) | `t_grline_quarantine` |
| 3 | Quarantined → Accepted | modelled, not active (no target) | buyer · receiving (`gr:disposition`) | `t_grline_release` |
| 2d | Inspected → Returned | modelled, not active (no target) | buyer · receiving (`gr:disposition`) | `t_grline_return` |
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:19-135 -->

Terminals: `Accepted`, `Rejected`, `Returned`. `Quarantined` is a holding state with two exits, deliberately not a terminal. `Pending` has no creation verb — a line comes into being with its receipt.

**Forks**

- **At Inspected:** `t_grline_accept` — receiving — when the item is fit for use; `t_grline_reject` — receiving — when it is not, with a reason; `t_grline_quarantine` — receiving — when it is doubtful and must be kept out of production until decided; `t_grline_return` — receiving — when it goes back to the supplier rather than being scrapped or kept.
- **At Quarantined:** `t_grline_release` — receiving — when the second look settles the doubt in the item's favour; `t_grline_reject` — receiving — when the second look confirms the item is not fit for use.

<!-- section:steps -->
## 3 · Step by step

### t_grline_inspect — Look at the item <!-- transition:t_grline_inspect -->

- **Step kind:** modelled, not active (no target)
- **Role:** buyer · receiving (atom `gr:inspect`)
- **From → to:** Pending → Inspected
- **Operator — where:** not offered anywhere today. The nearest thing is the GR wizard's **Quality checks** step on `/buyer/goods-receipt`, which records the same two facts per line at creation.
- **Operator — do:** somebody physically looks at one item — its condition and its packaging — and writes down what they saw.
- **Operator — fill:** would require `visualCheck` and `packagingCheck`.
- **Tester — expected state:** Inspected — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_grline_inspect` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** substrate flow, no command target. The rollup treats a line as still pending only while both checks are `Pending` and nothing has been accepted or rejected.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:31-41; src/services/transitions/grRollup.ts:18-22 -->

### t_grline_accept — Accept the item <!-- transition:t_grline_accept -->

- **Step kind:** modelled, not active (no target)
- **Role:** buyer · receiving (atom `gr:disposition`)
- **From → to:** Inspected → Accepted (terminal)
- **Operator — where:** not offered anywhere today.
- **Operator — do:** declare the item fit for use; it counts toward the delivery being cleared as a whole.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Accepted — not reachable by command. The rollup derives a line as Accepted when its accepted quantity is above zero, nothing was rejected and no check failed.
- **Tester — confirm:** indirectly only: a receipt whose every line derives Accepted rolls up to `Approved`.
- **Tester — trigger event:** `t_grline_accept` (never emitted)
- **Checks that can refuse:** none declared; `UNKNOWN_ENTITY` first.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** substrate flow, no command target.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:42-52; src/services/transitions/grRollup.ts:30-32 -->

### t_grline_reject — Reject the item <!-- transition:t_grline_reject -->

- **Step kind:** modelled, not active (no target)
- **Role:** buyer · receiving (atom `gr:disposition`)
- **From → to:** Inspected, Quarantined → Rejected (terminal)
- **Operator — where:** not offered anywhere today. The wizard's per-line **Rejected** quantity and **Rejection Reason** record the same fact at creation.
- **Operator — do:** declare the item not fit for use, with a reason attached. One such item is enough to stop a delivery being cleared whole. It is also the failing outcome of a quarantine's second look, which is why `Quarantined` is a from-state.
- **Operator — fill:** would require `rejectionReason`.
- **Tester — expected state:** Rejected — not reachable by command. The rollup derives a line as Rejected when nothing was accepted and something was rejected or a check failed.
- **Tester — confirm:** indirectly: all lines Rejected rolls the header up to `Rejected`; a mix rolls it to `Partially Approved`.
- **Tester — trigger event:** `t_grline_reject` (never emitted)
- **Checks that can refuse:** none declared; `UNKNOWN_ENTITY` first.
- **Glossary:** `UNKNOWN_ENTITY`, `MISSING_FIELDS`.
- **Honesty:** substrate flow, no command target.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:53-71; src/services/transitions/grRollup.ts:24-31 -->

### t_grline_quarantine — Set the item aside <!-- transition:t_grline_quarantine -->

- **Step kind:** modelled, not active (no target)
- **Role:** buyer · receiving (atom `gr:inspect`)
- **From → to:** Inspected → Quarantined
- **Operator — where:** not offered anywhere today.
- **Operator — do:** set the item aside until somebody decides — not usable yet, not refused either. It keeps doubtful stock out of production.
- **Operator — fill:** would require `holdReason`.
- **Tester — expected state:** Quarantined — not reachable. The rollup vocabulary has no quarantine state, so no receipt today derives a line as held.
- **Tester — confirm:** nothing to confirm.
- **Tester — trigger event:** `t_grline_quarantine` (never emitted)
- **Checks that can refuse:** none declared; `UNKNOWN_ENTITY` first.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** substrate flow, no command target. The fixture `gr-007`'s "Quarantine" disposition label is a header-level fixture string, not a line state.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:72-82; src/services/transitions/grRollup.ts:15; src/data/mockGoodsReceipts.ts:246 -->

### t_grline_release — Release the held item <!-- transition:t_grline_release -->

- **Step kind:** modelled, not active (no target)
- **Role:** buyer · receiving (atom `gr:disposition` — deliberately not `gr:inspect`, so a seat that may hold but not dispose has no back door to the cleared terminal)
- **From → to:** Quarantined → Accepted (terminal)
- **Operator — where:** not offered anywhere today.
- **Operator — do:** the second look settled the doubt in the item's favour, so the item stops being held and joins the stock the plant may draw on. It lands on the cleared terminal, not back at re-inspection, because the retest is the re-examination.
- **Operator — fill:** nothing to fill — the hold already recorded its reason.
- **Tester — expected state:** Accepted — not reachable.
- **Tester — confirm:** nothing to confirm.
- **Tester — trigger event:** `t_grline_release` (never emitted)
- **Checks that can refuse:** none declared; `UNKNOWN_ENTITY` first.
- **Glossary:** `UNKNOWN_ENTITY`, `ROLE_NOT_PERMITTED`.
- **Honesty:** substrate flow, no command target. This is the line-grain mirror of the header's `t_gr_request_retest`, with the opposite landing state by design.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:83-123 -->

### t_grline_return — Return the item to the supplier <!-- transition:t_grline_return -->

- **Step kind:** modelled, not active (no target)
- **Role:** buyer · receiving (atom `gr:disposition`)
- **From → to:** Inspected → Returned (terminal)
- **Operator — where:** not offered anywhere today.
- **Operator — do:** send the item back to the supplier rather than scrapping or keeping it, so ownership of the problem goes back with it.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Returned — not reachable. The rollup has no Returned state; the fixture `gr-011`'s "Return to Supplier" is a header-level label.
- **Tester — confirm:** nothing to confirm.
- **Tester — trigger event:** `t_grline_return` (never emitted)
- **Checks that can refuse:** none declared; `UNKNOWN_ENTITY` first.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** substrate flow, no command target.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:124-134; src/data/mockGoodsReceipts.ts:352 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Disposition of one item (at Inspected).** Branch A — `t_grline_accept` — **When:** fit for use. Branch B — `t_grline_reject` — **When:** not fit, reason attached. Branch C — `t_grline_quarantine` — **When:** doubtful; hold it. Branch D — `t_grline_return` — **When:** it goes back to the supplier. None is dispatchable today.
- **After quarantine (at Quarantined).** Branch A — `t_grline_release` — **When:** the second look clears it. Branch B — `t_grline_reject` — **When:** the second look fails it. Not dispatchable today.
- **What actually happens today:** the receiver records quantities and checks per line in the GR wizard; the portal derives Accepted / Rejected / Partial / Pending per line and rolls the header up. There is no hold, release or return at line grain.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| none at this grain | — | — | the line machine's states are never rendered; per-line check marks (V · P · H · B) and rejected quantities are shown on the receipt's **Line items** panel as facts, not as flags | `/buyer/goods-receipt` side panel |
<!-- src: src/pages-v2/BuyerGoodsReceipt.tsx:1158-1247; src/lib/i18n/goodsReceipt.ts:116-123 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** none — no fixture and no store hold a line as an entity. What the portal reads today is the `inspectionResults[]` array on a goods receipt (for example the two rows on `gr-002` / GR-2026-002).

| Joins to | By | Note |
|---|---|---|
| Goods receipt | `GoodsReceipt.inspectionResults[]` | each row (`materialCode`, `qtyExpected`, `qtyReceived`, `qtyAccepted`, `qtyRejected`, `rejectionReason`, `labResultId`, `visualCheck`, `packagingCheck`, `halalSealCheck`, `bpomLotCheck`) is the fact substrate; `deriveLineState` maps it to Pending / Accepted / Rejected / Partial, a **different vocabulary** from this machine's six states |
| Header disposition | `deriveHeaderDisposition` | any Pending → header Pending; all Accepted → Approved; all Rejected → Rejected; otherwise Partially Approved — the `gr_rollup_*` hooks re-run this |
| Shipment / ASN line items | `materialCode` | `gr_inspection_materials_declared` refuses a receipt whose lines name a material the parent never declared |
| Material master | `materialCode` | decides whether a halal-seal or BPOM-lot check is owed on the line |
<!-- src: src/data/mockGoodsReceipts.ts:27-40; src/services/transitions/grRollup.ts:15-58; src/services/data/mock/MockCommandService.ts:313-362; src/components/v2-features/GRInspectionWizard.tsx:388-404,536-539 -->

<!-- section:history -->
## 7 · Status history

No `TransitionEvent` is ever written for a line: the machine has no target, so no dispatch reaches the dispatcher's emit. The per-line facts are written once, inside the receipt's `t_gr_create` event, and never change afterwards. Worked sequence: none — modelled, not active.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | no line event exists; see the goods receipt guide's `t_gr_create` row | — |
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:11-14; _derived/surfaces.md:18 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| "The kind of document this action belongs to is not connected to the command system." | `UNKNOWN_ENTITY` on a hand-crafted dispatch | `goodsReceiptLine` has no command target | expected; act on the receipt header instead |
| A line's rejected quantity or failed check does not change the header the way you expected | header reads Partially Approved / Rejected | the header is rolled up from **every** line — one bad line makes a mix, all bad lines make a reject | review the lines on the wizard's quality step before pressing **Create GR** |
| You want to quarantine or return one item | no such control exists | line-level verbs are modelled, not active | record the fact in the line's rejection reason or the receipt notes |
| — (cannot occur yet) | `MODULE_INACTIVE:GRC` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Goods receipt & inspection module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |
<!-- src: src/lib/glossary/refusals.glossary.ts:37-40; src/services/transitions/grRollup.ts:49-58 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Pending | no fixture — modelled, not active | — | the rollup's Pending is derived on a receipt's `inspectionResults` rows, not stored |
| Inspected | no fixture — modelled, not active | — | |
| Accepted | no fixture — modelled, not active | — | |
| Rejected | no fixture — modelled, not active | — | |
| Quarantined | no fixture — modelled, not active | — | |
| Returned | no fixture — modelled, not active | — | |
<!-- src: _derived/guidefacts.json (goodsReceiptLine.fixtures = "no store") -->
