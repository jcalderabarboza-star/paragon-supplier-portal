---
entity: purchaseOrder
locale: en
title: Purchase order
wired: true
owner: portal
source_sha: 81c98403a83a674df80959f7d2290898ddd822fa
transitions:
  - t_po_issue
  - t_po_view
  - t_po_acknowledge
  - t_po_confirm
  - t_po_partial_deliver
  - t_po_deliver
  - t_po_close
---

<!-- section:summary -->
## 1 · What this process is

Paragon's commitment to buy — what was ordered, at what price, for when. Every shipment, receipt and bill downstream hangs off this one document. A purchase order (PO) is the anchor every later document points back to: an advance ship notice names it in `poReference`, a goods receipt carries its number, and an invoice bills against it.

The portal is where a supplier **receives** a PO, never where Paragon issues one. The document is born in S/4HANA and arrives here as a fact (`Sent`). From there the supplier's **fulfilment** contact does the two things the portal offers: acknowledge that the order reached a person, and confirm the quantities the supplier will actually ship. Once confirmed, everything that moves the order onward — partial delivery, full delivery, closure — is again S/4HANA's act, read by the portal and shown as a wait ("Awaiting S/4HANA"). On the buyer side nobody presses anything on a PO; the buyer reads it at `/buyer/orders`.

Honesty markers a reader should carry through this guide: the order rows in the demo are **SIMULATED fixtures** (`mockPurchaseOrders.ts`), and the page carries a provenance marker saying so; the two supplier verbs (`t_po_acknowledge`, `t_po_confirm`) genuinely dispatch through the command spine and write the audit trail; `t_po_view` exists in the machine but **no screen fires it** — the two `Viewed` fixtures are the only way to see that state; the `+Nd overdue` badge on the buyer's list reads a stored fixture number, not a clock.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Sent | external fact (S/4HANA) | automation | `t_po_issue` |
| 2 | Sent → Viewed | not active (no caller) | supplier · fulfilment | `t_po_view` |
| 3 | Sent, Viewed → Acknowledged | operator action | supplier · fulfilment | `t_po_acknowledge` |
| 4 | Sent, Viewed, Acknowledged → Confirmed | operator action | supplier · fulfilment | `t_po_confirm` |
| 5 | Confirmed → Partially Delivered | external fact (S/4HANA) | automation | `t_po_partial_deliver` |
| 6 | Confirmed, Partially Delivered → Delivered | external fact (S/4HANA) | automation | `t_po_deliver` |
| 7 | Delivered → Closed | external fact (S/4HANA) | automation | `t_po_close` |
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:35-145 -->

**Forks**

- **At Sent:** `t_po_view` — fulfilment — never (no caller); `t_po_acknowledge` — fulfilment — when the supplier wants to say "received, working on it" before committing numbers; `t_po_confirm` — fulfilment — when the supplier is ready to commit line quantities straight away.
- **At Viewed:** `t_po_acknowledge` — fulfilment — as above; `t_po_confirm` — fulfilment — as above.
- **At Confirmed:** `t_po_partial_deliver` — S/4HANA — when a goods movement covers part of the order; `t_po_deliver` — S/4HANA — when the goods movement covers everything.

<!-- section:steps -->
## 3 · Step by step

### t_po_issue — The order is raised in S/4HANA <!-- transition:t_po_issue -->

- **Step kind:** external fact (S/4HANA) · creation
- **Role:** automation (S/4HANA owns the act)
- **From → to:** ∅ → Sent
- **Operator — where:** nobody presses this in the portal. The buyer reads the result at `/buyer/orders`; the supplier reads it at `/supplier/orders` (**My Orders**).
- **Operator — do:** nothing in the portal. Buying makes its decision binding in S/4HANA; until this document exists, a supplier has nothing it can safely start producing against.
- **Operator — fill:** the machine requires `supplierId` and `lineItems` on the record; both come from S/4HANA, not from a form here.
- **Tester — expected state:** Sent
- **Tester — confirm:** the row appears under the supplier's **My Orders** with the `Sent` chip and in the **Needs action** tab; the supplier dashboard widget **Orders to confirm** counts it.
- **Tester — trigger event:** `t_po_issue`
- **Checks that can refuse:** none beyond role, legality and required fields — and no portal caller exists to be refused.
- **Glossary:** `UNSUPPORTED_CREATION` (what the dispatcher would answer if something tried to create a PO here).
- **Honesty:** there is no write path for a PO in this portal. In the demo every `Sent` order is a **SIMULATED fixture**; a tester cannot mint a new one.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:36-54; src/data/mockPurchaseOrders.ts:131-142; src/lib/i18n/processFlows.ts:63 -->

### t_po_view — The order is opened by a person <!-- transition:t_po_view -->

- **Step kind:** not active (no caller)
- **Role:** supplier · fulfilment (atom `po:view`)
- **From → to:** Sent → Viewed
- **Operator — where:** not offered anywhere today. Opening the order's side panel on `/supplier/orders` does **not** fire it.
- **Operator — do:** nothing — the verb tells the buyer the order reached a person and not just an inbox, but no screen records that moment.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Viewed (fixture-only)
- **Tester — confirm:** the two fixtures `po-006` / `po-020` show the `Viewed` chip on both seats; nothing a tester does moves a `Sent` order into `Viewed`.
- **Tester — trigger event:** `t_po_view` (never emitted by a surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ILLEGAL_TRANSITION` (what a hand-crafted dispatch from any state other than `Sent` would get).
- **Honesty:** **WIRED-NO-CALLER.** The transition is registered and dispatchable, but no hook and no page calls it. The surface still offers **Acknowledge receipt** on a `Viewed` order because the machine says that is legal.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:55-65; src/pages-v2/SupplierOrders.tsx:421-432; _derived/surfaces.md:8 -->

### t_po_acknowledge — Acknowledge receipt <!-- transition:t_po_acknowledge -->

- **Step kind:** operator action
- **Role:** supplier · fulfilment (atom `po:acknowledge`)
- **From → to:** Sent, Viewed → Acknowledged
- **Operator — where:** `/supplier/orders` → click a `Sent` or `Viewed` row (or its **View** button) → side panel footer → **Acknowledge receipt** (shows **Acknowledging…** while in flight).
- **Operator — do:** tell Paragon the order has been seen and is being worked through, without committing to any quantity yet. Useful when a real answer will take days. The button appears only where the machine says the verb is legal; on a `Sent` order it sits beside **Confirm order** in its own slot.
- **Operator — fill:** nothing to fill — the verb is payload-free by design.
- **Tester — expected state:** Acknowledged
- **Tester — confirm:** toast **"PO-… acknowledged — Paragon can see you have the order. Confirming quantities is still open."**; the status chip in the panel and the row reads `Acknowledged`; the order stays in **Needs action**; the buyer's `/buyer/orders` list shows the same chip; the supplier dashboard **Orders to confirm** widget still counts it (it counts `Sent` and `Acknowledged`).
- **Tester — trigger event:** `t_po_acknowledge`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `SCOPE_DENIED`.
- **Honesty:** a seat without `po:acknowledge` (commercial or back-office) sees **Awaiting Supplier Fulfilment** in that footer slot instead of the button. The row's quantities are untouched by this act.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:66-76; src/pages-v2/SupplierOrders.tsx:429-462,657-673; src/services/query/commandHooks.ts:218-234; src/lib/i18n/supplierOrders.ts:71-79 -->

### t_po_confirm — Confirm order <!-- transition:t_po_confirm -->

- **Step kind:** operator action
- **Role:** supplier · fulfilment (atom `po:confirm`)
- **From → to:** Sent, Viewed, Acknowledged → Confirmed
- **Operator — where:** two doors, both `/supplier/…`:
  1. `/supplier/orders` → the **Confirm** row button (or **Confirm order** in the panel footer) opens the panel in editing mode → **Line items — confirm quantities** → **Confirm order**.
  2. `/supplier/dashboard` → the **Orders to confirm** widget → **Confirm** on a row, or **Confirm orders** on the widget header. This door confirms **as ordered** (every line at the ordered quantity) with no editing.
- **Operator — do:** commit to the line amounts the supplier will actually ship. This is the promise the plant plans production around, and the figure every later shortfall is measured against. In the editing panel each line has a **Confirmed** cell pre-filled with the ordered quantity; type a smaller number to short-confirm. The **Confirmed delivery date** and **Notes for Paragon** fields are also offered; a banner warns "Confirmed values differ from the original PO" when anything changed. **Request change instead** opens a free-text change request — see Honesty.
- **Operator — fill:** `confirmedQuantities` — one number per line, each between 1 and the ordered quantity. The panel refuses before dispatch on a blank cell, a non-number, or an ambiguous separator ("1.500"), and greys the button while any line is out of bounds.
- **Tester — expected state:** Confirmed
- **Tester — confirm:** toast **"PO-… confirmed — <correlationId> recorded. Procurement notification pending live channel."**; the panel flips to the **Order confirmed** summary (Delivery · Total qty · Next: Create ASN); the row moves from **Needs action** to **In progress**; the buyer's `/buyer/orders` row reads `Confirmed`; the **Next** line under the status now reads **Awaiting S/4HANA**; on `/supplier/shipments` the order appears in the "confirmed purchase orders awaiting ASN" panel.
- **Tester — trigger event:** `t_po_confirm`
- **Checks that can refuse:** `po_confirm_qty_within_ordered` — the confirmation must cover every line, and each confirmed quantity must be a finite number greater than 0 and no more than the ordered quantity. The dispatcher's `MISSING_FIELDS` fires first if `confirmedQuantities` is absent.
- **Glossary:** `POLICY_REJECTED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Honesty:** the dashboard door has no per-line editing — it always confirms the ordered quantity. **Request change instead → Submit change request** is **not** a dispatch: the toast says "Change request for PO-… not submitted — nothing was sent — change requests are not wired to a real channel." The **Create ASN** / **Create ASN now** buttons on this page are also toasts ("ASN creation not available from this panel — nothing was created"); the real door is **Shipments & ASN**. A seat without `po:confirm` sees the row button relabelled **View** and **Awaiting Supplier Fulfilment** in the footer; the editing mode itself collapses to detail for such a seat, so no entrance bypasses the notice.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:77-90; src/services/transitions/policies.ts:96-132; src/pages-v2/SupplierOrders.tsx:288-336,357-369,465-472,683-730; src/pages-v2/widgets/OrdersToConfirmWidget.tsx:31-62,102-115,130-133; src/services/query/commandHooks.ts:176-192; src/lib/i18n.ts:488-495; src/lib/i18n/supplierOrders.ts:91-131 -->

### t_po_partial_deliver — Part of the order arrives (S/4HANA) <!-- transition:t_po_partial_deliver -->

- **Step kind:** external fact (S/4HANA)
- **Role:** automation (S/4HANA owns the act; atom `po:fulfil`, held by no lane)
- **From → to:** Confirmed → Partially Delivered
- **Operator — where:** nobody presses this in the portal. Goods movement is posted in S/4HANA against the PO.
- **Operator — do:** nothing here. Part of the order has physically arrived; a partly served order still owes something, and the shortfall is what buying chases.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Partially Delivered
- **Tester — confirm:** fixtures only (`po-003`, `po-016`) — the chip reads `Partially Delivered` on both seats and the **Next** line still reads **Awaiting S/4HANA**.
- **Tester — trigger event:** `t_po_partial_deliver` (not emitted by any surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** none specific.
- **Honesty:** the goods receipt a receiver posts in this portal (`t_gr_post`) does **not** advance the PO; the PO state is S/4HANA's. Demo rows in this state are SIMULATED.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:91-108; src/services/transitions/nextAct.ts:194-202 -->

### t_po_deliver — The whole order arrives (S/4HANA) <!-- transition:t_po_deliver -->

- **Step kind:** external fact (S/4HANA)
- **Role:** automation (S/4HANA owns the act; atom `po:fulfil`)
- **From → to:** Confirmed, Partially Delivered → Delivered
- **Operator — where:** nobody presses this in the portal.
- **Operator — do:** nothing here. Everything ordered has physically arrived; buying stops chasing and finance starts expecting a bill.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Delivered
- **Tester — confirm:** fixtures only — `Delivered` chip; on `/supplier/orders` the row sits under **Completed** and counts toward the **Delivered** KPI; the **Next** line reads **Awaiting S/4HANA** (closure is still S/4HANA's).
- **Tester — trigger event:** `t_po_deliver` (not emitted by any surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** none specific.
- **Honesty:** SIMULATED rows. An ASN reaching `Delivered` (a TMS fact) and a PO reaching `Delivered` (an S/4HANA fact) are two different facts on two different documents; neither drives the other in this tree.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:109-126; src/pages-v2/SupplierOrders.tsx:79-100 -->

### t_po_close — The order is closed (S/4HANA) <!-- transition:t_po_close -->

- **Step kind:** external fact (S/4HANA)
- **Role:** automation (S/4HANA owns the act; atom `po:close`)
- **From → to:** Delivered → Closed
- **Operator — where:** nobody presses this in the portal.
- **Operator — do:** nothing here. A PO closes in S/4HANA once delivery and invoicing reconcile; the portal reads the outcome. The order stops appearing in anybody's open work.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Closed (terminal)
- **Tester — confirm:** fixtures only (`po-011`, `po-015`) — `Closed` chip; no footer verb, no handoff notice, and the **Next** line renders nothing because the document is ended.
- **Tester — trigger event:** `t_po_close` (not emitted by any surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** none specific.
- **Honesty:** SIMULATED rows; the only terminal of this machine.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:33-34,127-144; src/services/transitions/nextAct.ts:170 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Acknowledge or confirm (at Sent and at Viewed).** Branch A — `t_po_acknowledge` — **When:** the supplier can say "received" today but needs days before committing quantities. Branch B — `t_po_confirm` — **When:** the supplier is ready to commit every line now; acknowledging first is optional, not required. Branch C — `t_po_view` — **When:** never in practice; no caller.
- **Short-confirm versus change request (inside `t_po_confirm`).** Branch A — type a reduced quantity per line and press **Confirm order** — **When:** the supplier will ship less than ordered but the rest of the order stands; the policy allows any quantity from 1 up to the ordered amount. Branch B — **Request change instead** — **When:** the supplier wants a different date or a different order; **this branch changes nothing** (toast: not submitted, no channel wired). The PO stays in its pre-confirm state.
- **Partial or full delivery (at Confirmed).** Branch A — `t_po_partial_deliver` — **When:** S/4HANA posts a goods movement covering part of the order. Branch B — `t_po_deliver` — **When:** the goods movement covers everything. Both are read, never pressed.
- **There is no cancel, reject or withdraw** on this machine. A supplier who cannot fulfil has no refusal verb here; the honest path today is the change-request text, which is not delivered anywhere.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Needs your action / "N orders need your confirmation" | derived at read | Sent, Acknowledged | any order of the seat's supplier is in `Sent` or `Acknowledged` | `/supplier/orders` — **Open Orders** KPI subtitle, **Needs action** tab, banner above the table |
| "N awaiting confirmation" (info under 3, warning at 3 or more) | derived at read | Sent, Acknowledged | as above, counted for the widget | `/supplier/dashboard` — **Orders to confirm** widget |
| Awaiting Supplier Fulfilment | derived at read (handoff) | Sent, Viewed, Acknowledged | the seat lacks `po:acknowledge` / `po:confirm` | `/supplier/orders` panel footer slots; widget action cell |
| Awaiting S/4HANA | derived at read (next act, external) | Confirmed, Partially Delivered, Delivered | every exit from the state is an S/4HANA fact | **Next** line under the status chip on `/supplier/orders` and `/buyer/orders` |
| Your move | derived at read (next act) | Sent, Viewed, Acknowledged | the seat holds a legal verb | same **Next** line, supplier fulfilment seat |
| `+Nd overdue` | **stored fixture field** (`daysOverdue`), display-only | any open state | `daysOverdue > 0` on the fixture row | `/buyer/orders` row and **Overdue** KPI |
| Provenance marker | SIMULATED marker | all | always | `/supplier/orders` meta line |
<!-- src: src/pages-v2/SupplierOrders.tsx:79-100,493-503; src/pages-v2/widgets/OrdersToConfirmWidget.tsx:39-40,129-130; src/pages-v2/BuyerOrders.tsx:99-100,537-539; src/services/transitions/nextAct.ts:165-207; src/data/mockPurchaseOrders.ts:18,55 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `po-007` (PO-2025-00107, supplier `sup-007`, state `Confirmed`).

| Joins to | By | Note |
|---|---|---|
| Supplier | `supplierId` = `sup-007` | scope owner: a supplier seat sees only its own POs; a mismatch on a command throws `SCOPE_DENIED` |
| Advance ship notices | ASN `poReference` = `PO-2025-00107` | four fixture ASNs point here (`ASN-2025-00211`, `-00198`, `-00201`, `-00215`); creation scope of an ASN is derived from this PO's supplier |
| Goods receipts | GR `poNumber` = `PO-2025-00107` | `gr-002` (GR-2026-002) references it through shipment `shp-012`; the GR state never writes back to the PO |
| Invoices | invoice `poNumber` | the GR-post 3-way match reads `confirmedQty × unitPrice` from this PO's lines |
| Line items | `lineItems[i].confirmedQty` | written by `t_po_confirm` only; `t_po_acknowledge` leaves it untouched |
| `confirmedDeliveryDate`, `daysOverdue` | fixture fields | display-only: the editing panel's **Confirmed delivery date** is not sent in the payload and nothing writes either field |
| `channel` | fixture field | display-only |
<!-- src: src/services/data/mock/MockCommandService.ts:141-160,183; src/services/data/mock/fixtures/supplierShipments.ts:86-167; src/data/mockGoodsReceipts.ts:88-93; src/services/data/mock/MockCommandService.ts:2500-2504; src/services/query/commandHooks.ts:176-192 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `personaType:supplierId` (a supplier seat writes `supplier:sup-007`; a buyer seat writes `buyer:all`), `ts`, `outcome` (`done` / `submitted` / `failed`), `correlationId`, and `causationId` only on a cascaded command. A refused command is also recorded, with `reason`. Nothing in this flow cascades or settles, so every PO event is a single `done` or `failed`. The sink is in-memory in the demo.

Worked sequence for `po-008` (PO-2025-00108, `sup-007`, fixture state `Sent`), as a tester would produce it on a supplier fulfilment seat:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Sent | S/4HANA (fixture) | seeded | `t_po_issue` (no event in the demo sink) |
| T+1 | Sent → Acknowledged | supplier · fulfilment (`supplier:sup-007`) | **Acknowledge receipt** | `t_po_acknowledge` · done |
| T+2 | Acknowledged → Confirmed | supplier · fulfilment (`supplier:sup-007`) | **Confirm order** with quantities | `t_po_confirm` · done |
| T+3 | Confirmed → (Partially) Delivered → Closed | S/4HANA | not reproducible in the portal | `t_po_partial_deliver` / `t_po_deliver` / `t_po_close` |
<!-- src: src/services/transitions/events.ts:25-104; src/services/transitions/dispatcher.ts:340-388 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| Footer shows **Awaiting Supplier Fulfilment** instead of a button; row button reads **View** | the notice sits where **Acknowledge receipt** / **Confirm order** would be | the seat does not hold `po:acknowledge` / `po:confirm` (`ROLE_NOT_PERMITTED` if forced) | act from a seat in the supplier **fulfilment** lane |
| "Could not confirm PO-… — A governing rule refused the action (…po_confirm_qty_within_ordered…)" | toast on confirm | a quantity is 0, above the ordered amount, or the array does not cover every line | fix the line; the panel's per-line messages name the bound (1 to ordered) |
| "Enter the quantity you are confirming" / "That is not a quantity" / "This can be read two ways" | inline under a Confirmed cell; button greyed | blank, non-numeric or ambiguous input | type digits only, no separators |
| "The document is not in a state this action can be taken from" | toast (`ILLEGAL_TRANSITION`) | the order was already confirmed (another tab, the dashboard widget) | reopen the order; the state chip is the truth |
| "This action was prepared against a different state…" | toast (`STALE_STATE`) | a caller supplied `expectedState` and the row moved | not raised by the shipped PO surfaces (they omit `expectedState`); reopen and decide again |
| "This is outside what your account may see — or there is no such record" | error (`SCOPE_DENIED`) | the command named another supplier's PO | act only on your own orders |
| **Submit change request** shows "not submitted" | info toast | change requests are not wired to a channel | contact the buyer outside the portal; the PO is unchanged |
| **Create ASN** here says "nothing was created" | info toast | ASN creation lives on **Shipments & ASN** | go to `/supplier/shipments` |
| Order stays `Confirmed` after goods arrived | **Next: Awaiting S/4HANA** | delivery and closure are S/4HANA facts | nothing to do in the portal; wait for the S/4HANA update |
| A `Viewed` order exists but you cannot produce one | only fixtures show it | `t_po_view` has no caller | expected; acknowledge or confirm from `Viewed` still works |
<!-- src: src/lib/glossary/refusals.glossary.ts:32-90; src/lib/i18n/supplierOrders.ts:91-101,124-131; src/services/transitions/refusals.ts:61-103 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Sent | `po-005`, `po-008`, `po-012`, `po-019` | PO-2025-00105, -00108, -00112, -00119 | `po-008` is `sup-007`'s and is the natural acknowledge/confirm specimen; `po-005` is `sup-005`'s |
| Viewed | `po-006`, `po-020` | PO-2025-00106, -00120 | fixture-only state (no caller); acknowledge and confirm are legal from here |
| Acknowledged | `po-004`, `po-010`, `po-014` | PO-2025-00104, -00110, -00114 | confirm is the only remaining supplier act |
| Confirmed | `po-002`, `po-007`, `po-017` | PO-2025-00102, -00107, -00117 | `po-002` (`sup-002`) has no ASN yet, so it shows in "awaiting ASN"; `po-007` (`sup-007`) already has four ASNs |
| Partially Delivered | `po-003`, `po-016` | PO-2025-00103, -00116 | S/4HANA-owned state; read only |
| Delivered | `po-001`, `po-009`, `po-013`, `po-018`, `po-131` | PO-2025-00101, -00109, -00113, -00118, -00131 | `po-131` is the authored parent of `ASN-2025-00302` |
| Closed | `po-011`, `po-015` | PO-2025-00111, -00115 | terminal; no footer verb, no next-act line |
<!-- src: src/data/mockPurchaseOrders.ts:5-556,596-604; _derived/guidefacts.json (purchaseOrder.fixtures) -->
