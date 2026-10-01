---
entity: shipment
locale: en
title: Inbound shipment
wired: false
owner: tms
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_shipment_create
  - t_shipment_asn_received
  - t_shipment_depart
  - t_shipment_arrive_port
  - t_shipment_customs
  - t_shipment_dock
  - t_shipment_unload
  - t_shipment_deliver
---

<!-- section:summary -->
## 1 · What this process is

The inbound leg as logistics sees it — one physical movement tracked from the supplier's gate to Paragon's yard. A shipment record is opened for goods Paragon is expecting, picks up the supplier's advance notice, and then moves through the physical milestones: departure, port arrival, customs, dock, unloading, delivery. The receiving record (goods receipt) takes over where this one ends.

**This process is modelled but not active.** Every one of its eight steps is an external fact owned by the TMS (the Odyssey Control Tower, integration INT-TMS-01). The flow file says it plainly: the logistics lifecycle *"belongs to the TMS Control Tower … so every advance is system-triggered and NO verb is wired this stage."* There is no command target behind the shipment, nobody in the portal presses anything to move one, and no event is ever written for it. The planner and the receiver are readers here, not actors.

What the portal shows today: `/buyer/shipments` (**Shipments & ASN**) renders a frozen fixture of eighteen shipments with a status pill, a timeline, a dock schedule and a side panel. The page carries a **Sample data** provenance marker because the `shipments` capability is null-backed — no logistics feed sits behind it. `Delayed` is not a state of this machine; the page computes it at read from the ETA and the declared present.

<!-- src: src/services/transitions/flows/shipment.flow.ts:1-15; src/pages-v2/BuyerShipments.tsx:579; src/services/liveness/registry.ts:222; src/services/data/shipmentDisplayState.ts:126 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Pending ASN | external fact (TMS) · creation | automation | `t_shipment_create` |
| 2 | Pending ASN → ASN Received | external fact (TMS) | automation | `t_shipment_asn_received` |
| 3 | ASN Received → In Transit | external fact (TMS) | automation | `t_shipment_depart` |
| 4 | In Transit → Arrived at Port | external fact (TMS) | automation | `t_shipment_arrive_port` |
| 5 | Arrived at Port → Customs Clearance | external fact (TMS) | automation | `t_shipment_customs` |
| 6 | Customs Clearance → At Dock | external fact (TMS) | automation | `t_shipment_dock` |
| 7 | At Dock → Unloading | external fact (TMS) | automation | `t_shipment_unload` |
| 8 | Unloading → Delivered (terminal) | external fact (TMS) | automation | `t_shipment_deliver` |

**Forks**

- None. The machine is a single chain; no state has two exits. `Delayed` is a read-time projection (ETA passed, no actual arrival), not a branch.

<!-- src: src/services/transitions/flows/shipment.flow.ts:22-34 -->

<!-- section:steps -->
## 3 · Step by step

### t_shipment_create — Shipment record opened <!-- transition:t_shipment_create -->

- **Step kind:** external fact (TMS) · creation · modelled, not active (no target)
- **Role:** automation (atom `shipment:create`; no portal lane holds it)
- **From → to:** ∅ → Pending ASN
- **Operator — where:** nobody presses this in the portal.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** the record would need a PO number and a supplier id; nobody in the portal supplies them.
- **Tester — expected state:** Pending ASN — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_create` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"A shipment record originates in the TMS (INT-TMS-01); Paragon receives it."* The flow header adds that a "created by PO confirm" cascade was deferred and is not authored.
<!-- src: src/services/transitions/flows/shipment.flow.ts:39-55 -->

### t_shipment_asn_received — Supplier's advance notice landed <!-- transition:t_shipment_asn_received -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** Pending ASN → ASN Received
- **Operator — where:** nobody presses this in the portal. The supplier lodges the ASN on `/supplier/shipments`; that is the `advanceShipNotice` process.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** ASN Received — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_asn_received` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"The TMS records that the supplier lodged an ASN against this shipment. Paragon learns of it; nobody here declares it."* No fixture shipment sits in ASN Received.
<!-- src: src/services/transitions/flows/shipment.flow.ts:57-74; src/data/mockShipments.ts:71-520 -->

### t_shipment_depart — Goods left the supplier <!-- transition:t_shipment_depart -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** ASN Received → In Transit
- **Operator — where:** nobody presses this in the portal.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** In Transit — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_depart` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Departure is a carrier scan reported through the TMS. The buyer watching the shipment has nothing to press."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:76-92 -->

### t_shipment_arrive_port — Reached the port of entry <!-- transition:t_shipment_arrive_port -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** In Transit → Arrived at Port
- **Operator — where:** nobody presses this in the portal. The side panel's **Track shipment** button on this state opens a toast saying carrier tracking is not available; it does not move the shipment.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Arrived at Port — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_arrive_port` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Port arrival is a carrier/terminal event reported through the TMS, not a fact anybody in this portal asserts."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:94-110; src/pages-v2/BuyerShipments.tsx:452-470; src/lib/i18n/shipments.ts:123-124,132 -->

### t_shipment_customs — With the border authorities <!-- transition:t_shipment_customs -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** Arrived at Port → Customs Clearance
- **Operator — where:** nobody presses this in the portal. The side panel's next-act line reads **Awaiting TMS** for a shipment in this state.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Customs Clearance — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_customs` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Customs clearance is an authority outcome relayed by the forwarder through the TMS."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:112-128; src/pages-v2/BuyerShipments.tsx:274; src/lib/i18n/roles.ts:64 -->

### t_shipment_dock — At Paragon's gate, waiting for a slot <!-- transition:t_shipment_dock -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** Customs Clearance → At Dock
- **Operator — where:** nobody presses this in the portal. The page's **Dock Schedule** action expands the schedule section with a toast; it is not this verb.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** At Dock — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_dock` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Dock assignment is a warehouse/TMS scheduling event. The buyer page offers a dock-schedule toast at this state; it is not this verb."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:130-146; src/pages-v2/BuyerShipments.tsx:424-429; src/lib/i18n/shipments.ts:25,115-116 -->

### t_shipment_unload — Container being emptied <!-- transition:t_shipment_unload -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** At Dock → Unloading
- **Operator — where:** nobody presses this in the portal. On At Dock and Unloading the side panel offers **Begin GR process**, which navigates to `/buyer/goods-receipt` — the receiver's own process.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Unloading — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_unload` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Unloading is recorded by the warehouse through the TMS. The Paragon act that follows it is the goods receipt, which has its own flow."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:149-165; src/pages-v2/BuyerShipments.tsx:472-480; src/lib/i18n/shipments.ts:133 -->

### t_shipment_deliver — Goods physically in <!-- transition:t_shipment_deliver -->

- **Step kind:** external fact (TMS) · modelled, not active (no target)
- **Role:** automation (atom `shipment:advance`)
- **From → to:** Unloading → Delivered (terminal)
- **Operator — where:** nobody presses this in the portal. On Delivered the side panel offers **View GR**, a navigation to `/buyer/goods-receipt`.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Delivered — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_shipment_deliver` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"The buyer page renders a button on several of these states; every one of them is navigation or a toast, never this verb."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:168-184; src/pages-v2/BuyerShipments.tsx:482-489; src/lib/i18n/shipments.ts:134 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **None in the machine.** No hold, cancel or discrepancy edge exists on the shipment; **Delayed** is a read-time projection of the stored state (see §5), and dock discrepancies belong to the goods-receipt and ASN processes (`t_gr_reject` cascades to `t_asn_discrepancy`).
<!-- src: src/services/transitions/flows/shipment.flow.ts:13-14; src/services/data/shipmentDisplayState.ts:126-146; _derived/surfaces.md:12 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Delayed (`+Nd late`) | time-driven, derived at read | any non-arrived state | no actual arrival and the ETA is before the declared present (31 Aug 2026) | `/buyer/shipments` status pill, **Delayed** tab and KPI |
| Sample data · shipments | external / provenance | whole page | always — the `shipments` capability is null-backed | `/buyer/shipments` meta line |
<!-- src: src/services/data/shipmentDisplayState.ts:126-170; src/pages-v2/BuyerShipments.tsx:83-98,579; src/services/liveness/registry.ts:222 -->

<!-- section:linked -->
## 6 · Linked objects

**What the portal reads today:** the `mockShipments` fixture through `useShipments()`. No machine state governs these rows — the stored `status` is an authored literal that happens to use this flow's eight state names. A representative row is `shp-018` (`ASN-2026-018` against `PO-2025-00118`), stored **Customs Clearance** and rendered **Delayed** at the declared present.

| Joins to | By | Note |
|---|---|---|
| Purchase order | `poId` / `poNumber` | display-only; the PO is an S/4HANA document |
| Advance ship notice | `asnNumber` | display-only; the supplier's ASN is its own process (`advanceShipNotice`) |
| Supplier | `supplierId` | tenancy scope; the page joins to `useSuppliers()` for the name |
| Goods receipt | none by field — navigation only | **Begin GR process** / **View GR** go to `/buyer/goods-receipt` |
| Dock | `dockAssignment` / `dockTime` | display-only; the dock schedule is a read of the same fixture |

Dates in this family are re-timed to the declared present by `shiftFields`, so day-counts are stable across sessions.
<!-- src: src/data/mockShipments.ts:47-68,510-520; src/services/data/fixturePresent.ts:364; src/pages-v2/BuyerShipments.tsx:156,453 -->

<!-- section:history -->
## 7 · Status history

There is none. A status history is a sequence of `TransitionEvent`s written by the dispatcher, and nothing dispatches a shipment verb: the entity has no command target, so any dispatch naming `shipment` is refused as `UNKNOWN_ENTITY` before an event could be written. The timeline in the side panel is drawn from the stored status and dates, not from events.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | nothing dispatches | no events exist |
<!-- src: src/services/transitions/dispatcher.ts:548; src/pages-v2/BuyerShipments.tsx:276-365 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| A button on the shipment panel appears to offer one of these steps | the label is **Send reminder to supplier**, **Track shipment**, **Contact carrier**, **Begin GR process** or **View GR** | it is a read-only page: the first three open a toast saying the capability is not available, the last two navigate to goods receipt; the act of moving a shipment is the TMS's | nothing to resolve in the portal; the milestone arrives from the TMS when INT-TMS-01 lands |
| — (cannot occur yet) | `MODULE_INACTIVE:SHP` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Shipments & ASN module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |
<!-- src: src/pages-v2/BuyerShipments.tsx:434-506; src/lib/i18n/shipments.ts:111-135 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| all | — | — | no fixture — modelled, not active. The rows on `/buyer/shipments` are display fixtures that no machine state governs; nothing can be moved between states. |
<!-- src: src/services/transitions/flows/shipment.flow.ts:9-10; _derived/guidefacts.json (shipment.fixtures = "no store") -->
