---
entity: advanceShipNotice
locale: en
title: Advance ship notice
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_asn_create
  - t_asn_submit
  - t_asn_in_transit
  - t_asn_deliver
  - t_asn_discrepancy
  - t_asn_resolve_discrepancy
---

<!-- section:summary -->
## 1 · What this process is

The supplier's heads-up that goods are on their way, and what is on them. It is what lets a warehouse plan dock time instead of discovering a truck. An advance ship notice (ASN) always hangs off one **Confirmed** purchase order: the supplier drafts it against the PO, fills in who is carrying the goods, how to trace them and when to expect them, and submits it. From that moment the notice belongs to the logistics world.

Two seats touch it. The supplier's **fulfilment** contact drafts and submits (`/supplier/shipments`, **Shipments & ASN**). The buyer's **receiving** lane never edits an ASN, but it is the lane that clears a discrepancy — because a discrepancy is only ever raised by a goods-receipt disposition, and the authority that raised the problem is the authority that clears it (`/buyer/goods-receipt`, **Shipment discrepancies → Reconcile**).

Honesty markers: **In Transit** and **Delivered** are carrier facts owned by **TMS** (INT-TMS-01); nobody in the portal presses them and the demo rows in those states are **SIMULATED fixtures**. **Discrepancy** is not declared by anyone — it is the cascade fired when a receiver rejects or partially approves a receipt. The **Export EDI 856** button and the **Dock Appointments** tab are display-only (the export toast says no file was generated; the dock text is static copy). The page's meta line carries a provenance marker: create and submit genuinely dispatch; the POs being shipped against are fixtures.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | operator action · creation | supplier · fulfilment | `t_asn_create` |
| 2 | Draft → Submitted | operator action | supplier · fulfilment | `t_asn_submit` |
| 3 | Submitted → In Transit | external fact (TMS) | automation | `t_asn_in_transit` |
| 4 | In Transit → Delivered | external fact (TMS) | automation | `t_asn_deliver` |
| 5 | Submitted, In Transit, Delivered → Discrepancy | cascade (from `t_gr_reject` / `t_gr_partial_approve`) | automation (atom `asn:flag`, held by receiving) | `t_asn_discrepancy` |
| 6 | Discrepancy → Delivered | operator action | buyer · receiving | `t_asn_resolve_discrepancy` |
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:48-159 -->

This machine declares **no terminal**: every state after `Draft` has an exit (`Delivered` is left by the discrepancy cascade; `Discrepancy` is left by the reconcile).

**Forks**

- **At Submitted:** `t_asn_in_transit` — TMS — when the carrier feed reports departure; `t_asn_discrepancy` — cascade — when a receiver already dispositioned a receipt against this ASN with a mismatch (an ASN still `Submitted` at that moment was already inconsistent with its own receipt).
- **At In Transit:** `t_asn_deliver` — TMS — when the carrier feed reports delivery; `t_asn_discrepancy` — cascade — as above.
- **At Delivered:** `t_asn_discrepancy` — cascade — the ordinary case: the goods were received and the receipt found a mismatch.

<!-- section:steps -->
## 3 · Step by step

### t_asn_create — Create ASN <!-- transition:t_asn_create -->

- **Step kind:** operator action · creation
- **Role:** supplier · fulfilment (atom `asn:create`)
- **From → to:** ∅ → Draft
- **Operator — where:** `/supplier/shipments` (**Shipments & ASN**) → two doors:
  1. **My Shipments** tab → the amber panel "N confirmed purchase orders awaiting ASN" → **Create ASN** on the PO row. This drafts a bare ASN (carrier, tracking and ETA empty) and lands it in the list as `Draft`.
  2. **Create ASN** tab → three-step wizard **Select PO → Shipment details → Confirm & submit** → **Submit ASN**. This door drafts **and** submits in one go (see `t_asn_submit`).
- **Operator — do:** begin telling Paragon what is about to be sent, while the details are still the supplier's to change. Pick the confirmed PO; the store assigns the ASN number and copies the PO's lines (shipped quantity defaults to the ordered quantity).
- **Operator — fill:** `poReference` — the confirmed PO's number (chosen, never typed). The wizard door also carries carrier, tracking number and ETA into the draft.
- **Tester — expected state:** Draft
- **Tester — confirm:** toast **"ASN-… drafted — Draft created from PO-…. <correlationId> recorded."**; the list shows the new row with the `Draft` chip and a **Submit** button; the **Draft** KPI tile increments; the PO leaves the "awaiting ASN" panel. On the buyer side the ASN becomes visible to `/buyer/goods-receipt`'s wizard only once it is Submitted, In Transit or Delivered.
- **Tester — trigger event:** `t_asn_create`
- **Checks that can refuse:** `asn_create_po_confirmed` — the parent PO must exist and be `Confirmed` ("PO PO-… is not Confirmed" otherwise). Before that, creation scope: the PO's supplier must be the seat's own supplier, or the dispatcher throws `SCOPE_DENIED`.
- **Glossary:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Honesty:** the "awaiting ASN" panel lists only confirmed POs with **no** ASN yet; the wizard's **Select PO** step lists **every** confirmed PO of the supplier, so a second ASN for the same PO is possible through the wizard. A seat without `asn:create` sees **Awaiting Supplier Fulfilment** on the PO row and does not see the **Create ASN** tab at all (the tab needs both create and submit held). The draft's destination warehouse and temperature are fixed sample values written by the store.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:49-61; src/services/data/mock/MockCommandService.ts:171-233; src/pages-v2/SupplierShipments.tsx:252-307,697-728,769-813,1204-1211; src/services/query/commandHooks.ts:254-272; src/lib/i18n.ts:503-508 -->

### t_asn_submit — Submit ASN <!-- transition:t_asn_submit -->

- **Step kind:** operator action
- **Role:** supplier · fulfilment (atom `asn:submit`)
- **From → to:** Draft → Submitted
- **Operator — where:** `/supplier/shipments` → **My Shipments** → **Submit** on a `Draft` row → side panel **Submit ASN-…** → fill **Carrier**, **Tracking number**, **Estimated arrival** → **Submit ASN**. Or the wizard's last step (**Confirm & submit → Submit ASN**), which submits the draft it just created.
- **Operator — do:** hand the shipping details to Paragon's warehouse — who is carrying it, how to trace it, and when to expect it. The intro line names the PO ("Provide the carrier, tracking number, and ETA for PO-…").
- **Operator — fill:** `carrier` (a select; sample carriers plus **Other**), `trackingNumber` (free text), `eta` (a date). All three are required by the machine. The wizard additionally insists on a ship date and a batch number before it lets you reach the last step, and on the tick-box "I confirm all shipment details are accurate…"; those extra fields are not sent to the machine.
- **Tester — expected state:** Submitted
- **Tester — confirm:** toast **"ASN-… submitted — <correlationId> recorded. WMS transmission pending live channel."**; the row's chip reads `Submitted`, carrier / tracking / ETA columns fill in, the **Submitted** KPI tile increments and the **Submit** button disappears. On the buyer side the ASN now appears in `/buyer/goods-receipt` → **New GR** → **Source selection** (labelled "No dock appointment · Scheduled via TMS") and resolves under **Enter ASN number**.
- **Tester — trigger event:** `t_asn_submit`
- **Checks that can refuse:** none beyond role, legality and required fields — a blank carrier, tracking number or ETA is refused as `MISSING_FIELDS`, and the panel renders "Carrier, tracking number and ETA are required. (…)" naming the missing keys.
- **Glossary:** `MISSING_FIELDS`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** "WMS transmission pending live channel" is the toast's own admission: nothing is transmitted to a warehouse system. **Export EDI 856** is a toast ("No file was generated"). A seat without `asn:submit` sees **Awaiting Supplier Fulfilment** in the row's action cell.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:62-72; src/pages-v2/SupplierShipments.tsx:387-401,647-695,758-764,1261-1331; src/services/query/commandHooks.ts:280-298; src/lib/i18n.ts:509-518; src/lib/i18n/supplierShipments.ts:170-173 -->

### t_asn_in_transit — The carrier reports departure (TMS) <!-- transition:t_asn_in_transit -->

- **Step kind:** external fact (TMS)
- **Role:** automation (TMS owns the act; atom `asn:carry`, held by no lane)
- **From → to:** Submitted → In Transit
- **Operator — where:** nobody presses this in the portal. A carrier feed reports departure (INT-TMS-01).
- **Operator — do:** nothing here. The goods have left the supplier; from here the arrival date is a logistics question, not a production one.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** In Transit
- **Tester — confirm:** fixtures only (`ASN-2025-00211`, `ASN-2025-00301`) — `In Transit` chip (warning tone) and the **In Transit** KPI tile; the buyer's GR wizard lists these under **Source selection**.
- **Tester — trigger event:** `t_asn_in_transit` (not emitted by any surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** none specific.
- **Honesty:** SIMULATED. No screen or feed in this tree moves a `Submitted` ASN forward; a tester who submits a draft will see it stay `Submitted`. This is the verb the flow's own comment uses to explain that "system" describes the seam, not the act.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:73-92; src/services/data/mock/fixtures/supplierShipments.ts:86-95,178-190 -->

### t_asn_deliver — The carrier reports delivery (TMS) <!-- transition:t_asn_deliver -->

- **Step kind:** external fact (TMS)
- **Role:** automation (TMS owns the act; atom `asn:carry`)
- **From → to:** In Transit → Delivered
- **Operator — where:** nobody presses this in the portal; the supplier who physically delivered it does not press it either.
- **Operator — do:** nothing here. The goods reached Paragon; the notice stops being a forecast and becomes something the receiving team can check against.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Delivered
- **Tester — confirm:** fixtures only (`ASN-2025-00198`, `ASN-2025-00302`) — `Delivered` chip (success tone) and the **Delivered** KPI tile. `Delivered` is also where a reconciled discrepancy lands.
- **Tester — trigger event:** `t_asn_deliver` (not emitted by any surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** none specific.
- **Honesty:** SIMULATED. A goods receipt created in the portal does **not** mark the ASN delivered; the receipt and the carrier fact are different documents.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:93-110; src/services/data/mock/fixtures/supplierShipments.ts:109-119,203-216 -->

### t_asn_discrepancy — A receipt flags the notice <!-- transition:t_asn_discrepancy -->

- **Step kind:** cascade
- **Role:** automation (fired under the automation grant; the atom `asn:flag` belongs to buyer · receiving)
- **From → to:** Submitted, In Transit, Delivered → Discrepancy
- **Operator — where:** nobody presses this. It fires when a receiver's goods receipt against this ASN lands on `t_gr_reject` or `t_gr_partial_approve` (`/buyer/goods-receipt` → the GR wizard's last step). The dispatcher fans it out onto the ASN named by the receipt's `asnNumber`.
- **Operator — do:** nothing directly. What turned up did not match what was announced; it follows from the receiving team's finding, and it is the supplier's cue that something needs explaining.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Discrepancy
- **Tester — confirm:** on `/supplier/shipments` the row's chip reads `Discrepancy` (danger tone), the **Discrepancy** KPI tile counts it, and the action cell reads **Awaiting Receiving**; on `/buyer/goods-receipt` a **Shipment discrepancies** section appears above the tabs listing the ASN with a **Reconcile** button. The audit event carries `causationId` = the receipt's correlation id.
- **Tester — trigger event:** `t_asn_discrepancy` (fired by `t_gr_reject` / `t_gr_partial_approve`)
- **Checks that can refuse:** none beyond role, legality and required fields — and the cascade runs inside a `catch {}`, so a refusal (an ASN that is `Draft`, or an ASN number the store does not hold) is silently a no-op; the receipt itself still completes.
- **Glossary:** `ILLEGAL_TRANSITION`, `NOT_FOUND` (the silent no-op cases).
- **Honesty:** to see this fire in the demo the receipt must be created **against a store ASN** (`ASN-2025-…`). The dock shipments the GR wizard lists (`ASN-2026-0xx`) are not in the ASN store, so a reject against one of those cascades onto nothing. The seeded `ASN-2025-00201` already sits in `Discrepancy` for the reconcile path.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:111-128; src/services/transitions/cascades.ts:24-30; src/services/data/mock/MockCommandService.ts:2884-2889; src/pages-v2/SupplierShipments.tsx:402-421; src/pages-v2/BuyerGoodsReceipt.tsx:845-870 -->

### t_asn_resolve_discrepancy — Reconcile <!-- transition:t_asn_resolve_discrepancy -->

- **Step kind:** operator action
- **Role:** buyer · receiving (atom `asn:flag`)
- **From → to:** Discrepancy → Delivered
- **Operator — where:** `/buyer/goods-receipt` (**Goods Receipt & Quality Control**) → the **Shipment discrepancies** section ("A receipt disposition flagged these advance ship notices. Reconcile each one to return it to Delivered.") → **Reconcile** on the ASN row (shows **Reconciling…** in flight).
- **Operator — do:** record that the mismatch has been talked through and settled, so the notice stops sitting in an unresolved pile. The receiver does this, not the supplier — no supplier lane holds `asn:flag`.
- **Operator — fill:** nothing to fill — payload-free by design; the receipt that raised the discrepancy already recorded its reason.
- **Tester — expected state:** Delivered
- **Tester — confirm:** toast **"ASN-… reconciled — The shipment is back at Delivered."**; the row leaves the **Shipment discrepancies** section (the section disappears when empty); on `/supplier/shipments` the chip reads `Delivered` and the **Discrepancy** tile decrements.
- **Tester — trigger event:** `t_asn_resolve_discrepancy`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** it lands at `Delivered` regardless of where the ASN was when flagged — the machine does not remember the prior state, and a discrepancy is only ever raised by a receipt, which exists only for goods that arrived. A buyer seat outside **receiving** sees **Awaiting Receiving** in the button's cell; the supplier's own row shows the same wait.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:129-158; src/pages-v2/BuyerGoodsReceipt.tsx:290-340,871-936; src/services/query/commandHooks.ts:323-346; src/lib/i18n/goodsReceipt.ts:289-306 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Two doors to a draft (at ∅).** Branch A — "awaiting ASN" panel → **Create ASN** — **When:** the supplier wants a draft now and the carrier details later. Branch B — **Create ASN** tab wizard — **When:** the supplier has carrier, tracking, ETA, ship date and batch number to hand; the wizard drafts and submits in one click.
- **Leaving Submitted / In Transit.** Branch A — `t_asn_in_transit` / `t_asn_deliver` — **When:** TMS reports movement (never in the demo). Branch B — `t_asn_discrepancy` — **When:** a receiver rejected or partially approved a receipt against this ASN before the carrier feed caught up.
- **Discrepancy (exception path).** Entered only by cascade. Exit — `t_asn_resolve_discrepancy` — **When:** receiving is satisfied the mismatch is explained; it returns to `Delivered`, never to `Submitted` or `In Transit`.
- **There is no cancel or withdraw** for an ASN, and no supplier-side way to edit a submitted notice.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Discrepancy chip / KPI tile | operator-raised (by the receiver's disposition, via cascade) | Discrepancy | the ASN was flagged by `t_gr_reject` / `t_gr_partial_approve` | `/supplier/shipments` row chip and **Discrepancy** tile; `/buyer/goods-receipt` **Shipment discrepancies** section |
| "N confirmed purchase orders awaiting ASN" | derived at read | (PO side) Confirmed | a confirmed PO of the supplier has no ASN referencing it | `/supplier/shipments` amber panel above the list |
| Awaiting Supplier Fulfilment | derived at read (handoff) | ∅, Draft | the seat lacks `asn:create` / `asn:submit` | PO row action; Draft row action; wizard body when narrowed mid-flow |
| Awaiting Receiving | derived at read (handoff) | Discrepancy | the seat lacks `asn:flag` (every supplier seat; buyer seats outside receiving) | `/supplier/shipments` action cell; `/buyer/goods-receipt` reconcile cell |
| Provenance marker | SIMULATED marker | all | always | `/supplier/shipments` meta line |
| Dock appointment notice | static copy | — | always | **Dock Appointments** tab (fixture text; nothing derives it) |
<!-- src: src/pages-v2/SupplierShipments.tsx:63-69,252-261,297-304,395-421,1191-1199,1236-1241; src/pages-v2/BuyerGoodsReceipt.tsx:871-936; src/lib/i18n/supplierShipments.ts:44-47,88-100 -->

The ASN page renders no next-act line; the state chip and the handoff notice are the only status cues on the supplier side.

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `ASN-2025-00201` (supplier `sup-007`, state `Discrepancy`). An ASN's id **is** its number; the store has no separate `id` field.

| Joins to | By | Note |
|---|---|---|
| Purchase order | `poReference` = `PO-2025-00107` (`po-007`, Confirmed) | creation scope is derived from this PO's `supplierId`; `asn_create_po_confirmed` reads its status |
| Supplier | `supplierId` = `sup-007` | scope owner for every later command on the ASN |
| Goods receipt | GR `asnNumber` = the ASN number | the cascade key: `t_gr_reject` / `t_gr_partial_approve` fan out onto `gr.asnNumber`. No seeded GR references `ASN-2025-00201` (seeded GRs reference `ASN-2026-0xx` shipments), so this row's discrepancy is authored, not produced |
| Line items | `lineItems[]` (`materialCode`, `orderedQty`, `shippedQty`, `lotNumber`) | copied from the PO at create; the GR wizard's `gr_inspection_materials_declared` hook checks a receipt's lines against these |
| `carrier`, `trackingNumber`, `eta` | written by `t_asn_submit` | fixture drafts hold `—` placeholders which the submit panel blanks |
| `details` (origin, destination warehouse, cartons, weight, temperature) | fixture / store constants | display-only; the create verb writes fixed sample values |
| Shipment (`/buyer/shipments`, `mockShipments`) | none | a **different** document: shipment rows carry `ASN-2026-0xx` numbers that do not exist in the ASN store |
<!-- src: src/services/data/mock/fixtures/supplierShipments.ts:132-141; src/services/data/mock/MockCommandService.ts:192-226,313-362,2884-2889; src/pages-v2/BuyerGoodsReceipt.tsx:853-863 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent` (`event`, `actor` = `supplier:<id>` or `buyer:all`, `ts`, `outcome`, `correlationId`). A cascaded `t_asn_discrepancy` carries `causationId` = the receipt command's correlation id and runs under the automation grant; a refused cascade still leaves a `failed` event with its `reason`. Nothing in this flow settles.

Worked sequence a tester can produce end-to-end, starting from `po-002` (PO-2025-00102, `sup-002`, Confirmed, no ASN yet):

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Draft | supplier · fulfilment (`supplier:sup-002`) | **Create ASN** on the awaiting-ASN row | `t_asn_create` · done (new `ASN-…` number returned) |
| T+1 | Draft → Submitted | supplier · fulfilment (`supplier:sup-002`) | **Submit** → carrier, tracking, ETA → **Submit ASN** | `t_asn_submit` · done |
| T+2 | Submitted → In Transit → Delivered | TMS | not reproducible in the portal | `t_asn_in_transit` / `t_asn_deliver` |
| T+3 | Submitted → Discrepancy | automation (cascade; `causationId` = the GR's correlation id) | receiver creates a GR under **Enter ASN number** with this ASN, rejects a line, presses **Create GR** | `t_asn_discrepancy` · done |
| T+4 | Discrepancy → Delivered | buyer · receiving (`buyer:all`) | **Reconcile** | `t_asn_resolve_discrepancy` · done |
<!-- src: src/services/transitions/events.ts:25-129; src/services/transitions/dispatcher.ts:453-473; src/services/data/mock/MockCommandService.ts:2884-2889 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| "Could not create ASN — A governing rule refused the action (…asn_create_po_confirmed: PO … is not Confirmed)" | error toast | the PO is not `Confirmed` | confirm the PO first on **My Orders** |
| "This is outside what your account may see — or there is no such record" | error (`SCOPE_DENIED`) | the PO named belongs to another supplier, or its owner could not be resolved | draft only against your own confirmed POs |
| "Could not submit ASN-… — Carrier, tracking number and ETA are required. (carrier,eta)" | warning toast naming the blank keys (`MISSING_FIELDS`) | a required field was left blank (a space counts as blank) | fill all three and submit again |
| **Awaiting Supplier Fulfilment** where **Create ASN** / **Submit** should be; no **Create ASN** tab | handoff notice | the seat lacks `asn:create` and/or `asn:submit` | use a supplier fulfilment seat |
| Row shows **Awaiting Receiving** and nothing to press | Discrepancy row on the supplier page | `asn:flag` is a receiving atom | the receiver reconciles on `/buyer/goods-receipt`; discuss the mismatch with them |
| ASN stays `Submitted` forever | no chip change | In Transit / Delivered are TMS facts with no feed in the demo | expected; the buyer can still receive against it |
| Rejected a receipt but no discrepancy appeared | supplier row unchanged; no **Shipment discrepancies** section | the GR was created from a dock shipment (`ASN-2026-0xx`), not a store ASN, or the ASN is still `Draft` | create the receipt under **Enter ASN number** with a Submitted / In Transit / Delivered `ASN-2025-…` |
| "The document is not in a state this action can be taken from" on **Reconcile** | toast (`ILLEGAL_TRANSITION`) | someone already reconciled it | refresh; the section re-derives |
| **Export EDI 856** did nothing | toast "No file was generated" | export is not wired to a real system | none; display-only control |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SHP`; where the surface checks first, the control reads *"Switched off — Shipments & ASN"* | the Shipments & ASN module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |
<!-- src: src/lib/glossary/refusals.glossary.ts:32-117; src/lib/i18n.ts:503-520; src/pages-v2/SupplierShipments.tsx:672-680; src/services/data/mock/MockCommandService.ts:228-233 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | `ASN-2025-00215` | ASN-2025-00215 | `sup-007`, PO-2025-00107; carrier/tracking/ETA are `—` placeholders — the natural **Submit** specimen |
| Submitted | none | — | reach it by submitting `ASN-2025-00215` or creating a new draft from `po-002` (PO-2025-00102, `sup-002`) |
| In Transit | `ASN-2025-00211`, `ASN-2025-00301` | ASN-2025-00211, ASN-2025-00301 | `sup-007` / PO-2025-00107 and `sup-002` / PO-2025-00116; SIMULATED TMS state; receivable by the buyer's GR wizard |
| Delivered | `ASN-2025-00198`, `ASN-2025-00302` | ASN-2025-00198, ASN-2025-00302 | `sup-007` / PO-2025-00107 and `sup-005` / PO-2025-00131; receivable by the GR wizard |
| Discrepancy | `ASN-2025-00201` | ASN-2025-00201 | `sup-007`, PO-2025-00107; the seeded **Reconcile** specimen on `/buyer/goods-receipt` |
<!-- src: src/services/data/mock/fixtures/supplierShipments.ts:84-216; _derived/guidefacts.json (advanceShipNotice.fixtures) -->
