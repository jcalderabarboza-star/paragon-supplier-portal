---
entity: incomingShipment
locale: en
title: Incoming shipment (supply leg)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_incomingshipment_report
  - t_incomingshipment_ship
  - t_incomingshipment_arrive
  - t_incomingshipment_cancel
---

<!-- section:summary -->
## 1 · What this process is

An incoming shipment is a supply leg a supplier tells Paragon about — goods heading to Paragon, or goods moving between a principal and a distributor that Paragon's own supply depends on. It carries a direction, a material, a quantity in transit and, optionally, the ETD, the ETA and a carrier air waybill. A leg **To Paragon** must be linked to one of the supplier's own Advance Ship Notices (the ASN stays the tracker of record; the leg links, it does not duplicate). A **Principal → distributor** leg is the distributor's supply-assurance movement: Paragon is not the consignee, so it carries no ASN, and only a supplier whose relationship for that material is *distributor* may report one.

One role owns every step: the supplier's logistics contact (the `fulfilment` lane) reports the leg and later marks it shipped, arrived or cancelled on `/supplier/forecasts` → **Shipments**. The buyer never dispatches anything on this object; the planner reads it. On `/buyer/collaboration` every leg still **Booked** or **Shipped** — in either direction — is added to the supplier's declared stock in the supplier-coverage indicator, and drops out once it is Arrived or Cancelled.

The lifecycle is linear plus cancel: **Booked → Shipped → Arrived**, with **Cancelled** reachable from either in-flight state. Arrived and Cancelled are terminal. An ETA change is not a state: the ETA is a field, and the verb that would revise it is named but not built in this tree. On a To-Paragon leg the departure and arrival are tracked by the linked ASN, so the portal does not offer **Mark shipped** or **Mark arrived** there and points you to the ASN instead; **Cancel shipment** stays available because no ASN status means "cancelled".

Honesty markers. Seeded legs are SIMULATED and the page sits under the banner *Sample forecast — no live publication yet* with the pill *Sample — awaiting SOMO C8 feed*. All four verbs are wired through the portal's command spine; nothing here is an external fact from S/4HANA, TMS or the bank — the ASN's own In-Transit status beside a To-Paragon leg is Paragon's inbound observation, shown as a second axis, not a state of this object. Stamps come from the shared simulated clock (the app's "today" is 31 Aug 2026).

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Booked | operator action (creation) | supplier · fulfilment | `t_incomingshipment_report` |
| 2 | Booked → Shipped | operator action | supplier · fulfilment | `t_incomingshipment_ship` |
| 3 | Shipped → Arrived | operator action (terminal) | supplier · fulfilment | `t_incomingshipment_arrive` |
| 4 | Booked, Shipped → Cancelled | operator action (terminal) | supplier · fulfilment | `t_incomingshipment_cancel` |

**Forks**

- **At Booked:** `t_incomingshipment_ship` — supplier's logistics contact — when the leg has departed (Principal → distributor legs; on a To-Paragon leg the departure is marked on the ASN instead); `t_incomingshipment_cancel` — supplier's logistics contact — when the leg is called off before it moves.
- **At Shipped:** `t_incomingshipment_arrive` — supplier's logistics contact — when the leg has landed (again marked on the ASN for a To-Paragon leg); `t_incomingshipment_cancel` — supplier's logistics contact — when an in-flight leg is called off.
- **At Arrived / Cancelled:** no exits; the card reads *This leg has finished — no further updates.*

<!-- section:steps -->
## 3 · Step by step

### t_incomingshipment_report — Report an incoming shipment <!-- transition:t_incomingshipment_report -->

- **Step kind:** operator action (creation)
- **Role:** supplier · fulfilment (the supplier's logistics contact)
- **From → to:** ∅ → Booked
- **Operator — where:** `/supplier/forecasts` → tab **Shipments** → **Report shipment** → panel *Report incoming shipment* → **Report shipment**
- **Operator — do:** Tell Paragon a consignment exists, what is on it and how much, so supply visibility starts before the goods arrive.
- **Operator — fill:** Step 1 *Material & direction* — one of your collaborated materials, then *Direction*: **To Paragon** is always offered; **Principal → distributor** is offered only when your relationship for that material is distributor. Step 2 *Shipment detail* — *Quantity* (digits only, e.g. `6000`; the unit is the material's), optional *ETD* and *ETA*. Step 3 — for To Paragon, *Link your ASN*: pick one of your own ASNs (you never type the reference; the AWB is echoed from the ASN's tracking number); for Principal → distributor, an optional *AWB*.
- **Tester — expected state:** Booked
- **Tester — confirm:** toast *Shipment reported — {material}* / *Your shipment is recorded under Shipments.*; the Shipments tab shows the new card (`ish-9001`, `ish-9002`, …) with the direction chip, the state pill **Booked**, Quantity / ETA / ETD and either *Linked ASN* or *AWB*; a To-Paragon card also shows *Paragon inbound · {asn}* with the ASN's own status. On `/buyer/collaboration` the leg's quantity is now counted as incoming in that supplier × material's *Coverage* cell.
- **Tester — trigger event:** `t_incomingshipment_report`
- **Checks that can refuse:** `sdc_material_known` — the code must be in the material master (`UNKNOWN_MATERIAL` otherwise); `ish_toparagon_asn_linked` — a To-Paragon leg must carry an ASN reference that resolves to a known ASN belonging to you; `ish_p2d_no_asn` — a Principal → distributor leg must not carry an ASN reference; `ish_p2d_distributor_only` — Principal → distributor is legal only when your relationship for the material is distributor. Before these, scope: the material must be one Paragon collaborates with you on, else `SCOPE_DENIED`. The page refuses earlier with *Material required*, *Direction required*, *Quantity required* (empty, not a number, or readable two ways) and *ASN required — A shipment to Paragon must link one of your ASNs.*
- **Glossary:** To Paragon · Principal → distributor (direction); `EMPTY_QTY` · `NOT_NUMERIC` · `AMBIGUOUS_QTY`; `POLICY_REJECTED`; `SCOPE_DENIED`.
- **Honesty:** SIMULATED sample data; the ASN you link is one of your own seeded ASNs. If you have none the panel says *You have no ASNs to link. Create an Advance Ship Notice first.* — the ASN is created on `/supplier/shipments`, not here. Quantity is stored only if it is a finite number; the unit is never yours to pick.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:52-67; src/services/data/mock/MockCommandService.ts:1484-1571; src/services/data/mock/MockCommandService.ts:1375-1389; src/pages-v2/SupplierForecasts.tsx:1094-1103; src/pages-v2/SupplierForecasts.tsx:1686-1791; src/pages-v2/SupplierForecasts.tsx:2391-2580; src/lib/i18n/sdcSupplier.ts:343-387; src/services/query/sdcSupplierHooks.ts:400-426; src/services/sdc/objectSubmitModels.ts:191-206; src/services/sdc/consolidation.ts:631-639 -->

### t_incomingshipment_ship — Mark the leg shipped <!-- transition:t_incomingshipment_ship -->

- **Step kind:** operator action
- **Role:** supplier · fulfilment (the supplier's logistics contact)
- **From → to:** Booked → Shipped
- **Operator — where:** `/supplier/forecasts` → tab **Shipments** → on a **Booked** card → **Mark shipped**. On a To-Paragon leg the button is replaced by the line *Departure is tracked by ASN {asn} — mark it shipped there.*
- **Operator — do:** Record that the leg has departed; the landing date stops being a plan and becomes a travel estimate.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Shipped
- **Tester — confirm:** toast *Shipment {id} marked shipped*; the card's state pill reads **Shipped** and now offers **Mark arrived** and **Cancel shipment**. The buyer's coverage is unchanged — Booked and Shipped both count as incoming.
- **Tester — trigger event:** `t_incomingshipment_ship`
- **Checks that can refuse:** none beyond role, legality and required fields (`ILLEGAL_TRANSITION` from any state but Booked; another supplier's leg is `SCOPE_DENIED`).
- **Glossary:** `ILLEGAL_TRANSITION`; `SCOPE_DENIED`; `ROLE_NOT_PERMITTED`.
- **Honesty:** Not offered on a To-Paragon leg by design — the ASN already records departure and the portal will not keep two trackers of one movement. The line pointing to the ASN is a reason, not a role handoff: the seat holds the permission.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:70-79; src/pages-v2/SupplierForecasts.tsx:918-973; src/pages-v2/SupplierForecasts.tsx:1201-1244; src/lib/i18n/sdcSupplier.ts:316-337; src/services/query/sdcSupplierHooks.ts:457-484; src/services/data/mock/MockCommandService.ts:1488-1493 -->

### t_incomingshipment_arrive — Mark the leg arrived <!-- transition:t_incomingshipment_arrive -->

- **Step kind:** operator action (terminal)
- **Role:** supplier · fulfilment (the supplier's logistics contact)
- **From → to:** Shipped → Arrived
- **Operator — where:** `/supplier/forecasts` → tab **Shipments** → on a **Shipped** card → **Mark arrived**. On a To-Paragon leg the button is replaced by *Arrival is tracked by ASN {asn} — mark it arrived there.*
- **Operator — do:** Record that the leg has landed. For a supply-assurance (Principal → distributor) leg this is where Paragon's exposure eases.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Arrived (terminal)
- **Tester — confirm:** toast *Shipment {id} marked arrived*; the card's pill reads **Arrived** and the action bar reads *This leg has finished — no further updates.* On `/buyer/collaboration` the leg no longer counts as incoming, so the supplier's *Coverage* ratio falls unless a newer stock declaration covers it.
- **Tester — trigger event:** `t_incomingshipment_arrive`
- **Checks that can refuse:** none beyond role, legality and required fields (`ILLEGAL_TRANSITION` unless the leg is Shipped).
- **Glossary:** `ILLEGAL_TRANSITION`; `ROLE_NOT_PERMITTED`.
- **Honesty:** Arrival does not create a goods receipt or touch the ASN; for a To-Paragon leg the ASN machine remains the tracker of record and reconciliation of the two is a named display question, not built here.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:84-93; src/pages-v2/SupplierForecasts.tsx:1201-1251; src/lib/i18n/sdcSupplier.ts:321-335; src/services/query/sdcSupplierHooks.ts:486-489; src/services/sdc/consolidation.ts:631-639 -->

### t_incomingshipment_cancel — Cancel the leg <!-- transition:t_incomingshipment_cancel -->

- **Step kind:** operator action (terminal)
- **Role:** supplier · fulfilment (the supplier's logistics contact)
- **From → to:** Booked, Shipped → Cancelled
- **Operator — where:** `/supplier/forecasts` → tab **Shipments** → on a **Booked** or **Shipped** card → **Cancel shipment** (offered on both directions, including To Paragon)
- **Operator — do:** Record that the leg is called off while under way, rather than leaving it in the plan as stock that is never coming.
- **Operator — fill:** nothing to fill — the verb takes no reason field, and the page deliberately does not invent one.
- **Tester — expected state:** Cancelled (terminal)
- **Tester — confirm:** toast *Shipment {id} cancelled*; the pill reads **Cancelled** and the bar reads *This leg has finished — no further updates.* The leg drops out of the buyer's incoming total in *Coverage*.
- **Tester — trigger event:** `t_incomingshipment_cancel`
- **Checks that can refuse:** none beyond role, legality and required fields (`ILLEGAL_TRANSITION` on an Arrived or Cancelled leg).
- **Glossary:** `ILLEGAL_TRANSITION`; `ROLE_NOT_PERMITTED`.
- **Honesty:** Cancelling a To-Paragon leg does not cancel or change the linked ASN; the ASN's own status keeps showing beside the card as Paragon's observation.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:96-105; src/services/query/sdcSupplierHooks.ts:428-443; src/services/query/sdcSupplierHooks.ts:491-495; src/pages-v2/SupplierForecasts.tsx:943-946; src/pages-v2/SupplierForecasts.tsx:1245-1251; src/lib/i18n/sdcSupplier.ts:322-336 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Direction (at creation).** Branch A — **To Paragon** — **When:** the goods are consigned to Paragon; you must link one of your own ASNs and the leg's departure/arrival are then marked on that ASN. Branch B — **Principal → distributor** — **When:** you are a distributor for the material and the goods move from your principal to you; no ASN, optional AWB. The guards make direction and ASN linkage match one-to-one at birth.
- **Move or cancel (at Booked).** Branch A — `t_incomingshipment_ship` — **When:** the leg departed. Branch B — `t_incomingshipment_cancel` — **When:** it will not move.
- **Land or cancel (at Shipped).** Branch A — `t_incomingshipment_arrive` — **When:** the leg landed. Branch B — `t_incomingshipment_cancel` — **When:** it was called off in flight.
- **ETA slipped.** Not a transition and not built: the ETA is a field and no verb revises it in this tree. Report a new leg if the old one is superseded, and cancel the old one so the buyer's coverage stops counting it.
- **Wrong quantity or material.** Not a transition: there is no edit. Cancel the leg and report it again.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Booked · Shipped · Arrived · Cancelled | operator-raised (declared state) | all | the supplier's own declared state of the leg | `/supplier/forecasts` Shipments card pill |
| Paragon inbound · {asn} + ASN status | external-shaped observation, derived at read | To-Paragon legs with a resolvable ASN | the linked ASN's own status (Draft / Submitted / In Transit / Delivered / Discrepancy), shown beside — never instead of — the declared state | Shipments card, second axis |
| Departure / Arrival is tracked by ASN {asn} | derived at read | To-Paragon legs at Booked / Shipped | the movement is recorded on the ASN, so the leg-level verb is withheld to avoid a second tracker | in the verb's slot on the card |
| This leg has finished — no further updates. | derived at read | Arrived, Cancelled | no legal verb remains | card action bar |
| Counted as incoming | derived at read (modelled) | Booked, Shipped, both directions | the leg's quantity is added to declared stock in the supplier-coverage indicator | `/buyer/collaboration` *Coverage* (Covered / At risk / Uncovered, marked *Model*) |
| lead time unbridgeable | derived at read | at risk / uncovered, distributor only | the shortest principal lead time exceeds the days to the horizon end | appended to the coverage chip |
| Sample forecast — no live publication yet | SIMULATED marker | whole page | every fixture publication is simulated | `/supplier/forecasts` banner; pill *Sample — awaiting SOMO C8 feed* |
| Awaiting Supplier Fulfilment | role handoff | any control | the seat lacks `incomingshipment:report` / `:ship` / `:arrive` / `:cancel` (three distinct atoms for the advances) | in place of the button, per verb |

<!-- src: src/pages-v2/SupplierForecasts.tsx:907-916; src/pages-v2/SupplierForecasts.tsx:1132-1155; src/pages-v2/SupplierForecasts.tsx:1201-1251; src/services/sdc/shipment.ts:69-91; src/services/sdc/shipment.ts:105-112; src/services/sdc/consolidation.ts:631-672; src/lib/i18n/sdcSupplier.ts:306-337; src/lib/i18n/roles.ts:48-52 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `ish-0001` (number `ASN-2025-00301`, the linked ASN; supplier `sup-002`, material `RM-EMUL-3310` Glycerin USP 99.5%, To Paragon, Shipped, 6 000 KG).

| Joins to | By | Note |
|---|---|---|
| Advance Ship Notice `ASN-2025-00301` | `asnRef` = `asnNumber` | sup-002's own ASN, status *In Transit*; the tracker of record for this leg — the card shows *Paragon inbound · ASN-2025-00301 · In Transit* beside the declared **Shipped** |
| Material master entry | `materialCode` | unit KG copied from the master at creation; the ASN fixture's own line items use an older code space, so ownership, not material, is the honest join |
| Supplier-material relationship | `supplierId` + `materialCode` | sup-002 is a manufacturer here, which is why only **To Paragon** is offered for this material |
| Supplier-coverage indicator | `supplierId` + `materialCode`, lifecycle Booked / Shipped | 6 000 KG counted as incoming alongside `inv-0001`'s 4 000 KG against 6 000 KG Firm demand → **Covered · 1.67×** |
| Submission session `ss-0001` | `attempted[].objectId` | the visit that also confirmed `rr-0001` and declared `inv-0001`; audit correlation only |
| Carrier reference | `awb` = `AWB-77120043` | echoed from the ASN's tracking number on a To-Paragon leg; a TMS reference — linked, not tracked |

Display-only: `etd` 2026-08-10 and `eta` 2026-08-19 are fixture fields that nothing revises (no ETA verb exists). `provenance` (`SUPPLIER` · `SIMULATED` · `committed`) is carried and never rewritten. The ASN's status is read from the ASN store at render time; this object never stores it.

<!-- src: src/services/sdc/fixtures.ts:1328-1348; src/services/data/mock/fixtures/supplierShipments.ts:178-186; src/services/sdc/fixtures.ts:862-868; src/services/sdc/fixtures.ts:1371-1381; src/services/sdc/types.ts:621-649; src/services/sdc/shipment.ts:105-112; src/services/data/mock/MockCommandService.ts:1501-1532; src/services/sdc/consolidation.ts:609-650 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `supplier:<supplierId>` (all four verbs are supplier acts), `ts` from the shared clock, `outcome` and a `correlationId`. The report can be one command of a multi-object visit, in which case it carries the visit anchor as `causationId`; the three advance verbs deliberately do not ride that envelope — they change a leg that already exists — and are audited on their own.

Worked sequence for a Principal → distributor leg as a tester would produce it (the seeded `ish-0002`, sup-005 × RM-EMUL-3310, 4 000 KG, starts at Booked):

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Booked | supplier · fulfilment | **Report shipment**, direction Principal → distributor, 4 000 KG, ETD / ETA | `t_incomingshipment_report` |
| T+1 | Booked → Shipped | supplier · fulfilment | **Mark shipped** | `t_incomingshipment_ship` |
| T+2 | Shipped → Arrived | supplier · fulfilment | **Mark arrived** | `t_incomingshipment_arrive` |

Alternative ending: at T+1 or T+2, **Cancel shipment** → Cancelled (`t_incomingshipment_cancel`). For a To-Paragon leg such as `ish-0001` the portal records only T+0 and, if needed, the cancel; departure and arrival are events of the ASN.

<!-- src: src/services/transitions/events.ts:26-60; src/services/transitions/events.ts:127-129; src/services/query/sdcSupplierHooks.ts:428-443; src/services/sdc/fixtures.ts:1351-1362; src/services/data/mock/MockCommandService.ts:1488-1493 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Report shipment**, only *Awaiting Supplier Fulfilment* | handoff notice in the button's slot | the seat lacks `incomingshipment:report` (fulfilment) | a fulfilment seat reports (`ROLE_NOT_PERMITTED` if forced) |
| **Mark shipped** / **Mark arrived** missing on a To-Paragon card | the slot reads *Departure / Arrival is tracked by ASN {asn} — mark it … there.* | by design: the ASN records that movement | open `/supplier/shipments` and advance the ASN |
| One advance button shows *Awaiting Supplier Fulfilment* while another is live | per-verb handoff | the three advance atoms are distinct; a narrowed seat may hold one and not another | use a seat holding the missing atom |
| *Principal → distributor* is not in the Direction list | only *To Paragon* offered | your relationship for the material is manufacturer; the page never offers an illegal pairing | choose To Paragon, or report against a material you distribute |
| Toast *ASN required — A shipment to Paragon must link one of your ASNs.* | To Paragon chosen, no ASN picked | the page enforces the linkage before dispatch | pick one of your ASNs; if the list is empty, create the ASN first |
| `POLICY_REJECTED:ish_toparagon_asn_linked` — *does not resolve* or *belongs to another supplier* | dispatch outside the picker | a dangling or foreign ASN reference | select from your own ASNs; a foreign ASN is refused by name |
| `POLICY_REJECTED:ish_p2d_no_asn` | a Principal → distributor payload carrying an ASN reference | direction and linkage must match one-to-one | drop the reference or change the direction |
| `POLICY_REJECTED:ish_p2d_distributor_only` | Principal → distributor from a manufacturer relationship | no principal leg exists for a manufacturer | report as To Paragon |
| `POLICY_REJECTED:sdc_material_known` — *UNKNOWN_MATERIAL* | material shows a dash for its unit | a collaborated code the master lacks | have the code added to the master |
| Toast *Quantity required* with a "read two ways" message | typed `6.000` or `6,000` | `AMBIGUOUS_QTY` — refused, not guessed | type `6000` |
| `MISSING_FIELDS` | dispatch lacks materialCode, direction or qty | a caller outside the page | use the panel |
| `ILLEGAL_TRANSITION` | e.g. **Mark arrived** on a Booked leg, or any advance on a finished leg | the leg's state moved since render | reload; the card offers only the legal verbs |
| `SCOPE_DENIED` (thrown; toast *That update was refused*) | advancing a leg by an id that is not yours or does not exist, or reporting a material Paragon does not collaborate with you on | scope gate ahead of the role gate; foreign and non-existent look identical on purpose | act only on your own legs; the advance takes the store id (`ish-…`), never an ASN number |
| `STALE_STATE` | never produced here | no SDC caller supplies `expectedState` | n/a |
| Buyer coverage did not drop after **Mark arrived** | *Coverage* cell unchanged | reads are cached per seat within a session | reload the buyer page; a persona switch re-reads the live store |
| ETA on the card is wrong and cannot be changed | no edit control | no ETA revision verb exists in this tree | cancel and report a new leg |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SDC`, or `MODULE_INACTIVE:SDC.incomingShipments` when only *Incoming shipments* is off; where the surface checks first, the control reads *"Switched off — Supplier collaboration"* | the Supplier collaboration module (or one of its parts) is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:556-610; src/services/data/mock/MockCommandService.ts:1539-1571; src/pages-v2/SupplierForecasts.tsx:1045-1088; src/pages-v2/SupplierForecasts.tsx:1687-1690; src/pages-v2/SupplierForecasts.tsx:1716-1752; src/pages-v2/SupplierForecasts.tsx:2453-2456; src/lib/i18n/sdcSupplier.ts:357-387; src/services/query/sdcSupplierHooks.ts:445-452; src/services/transitions/flows/incomingShipment.flow.ts:5-13 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Booked | `ish-0002` | — | sup-005 (distributor) · RM-EMUL-3310 · Principal → distributor · 4 000 KG · ETD 2026-08-25 · ETA 2026-10-08 · no ASN; offers **Mark shipped** and **Cancel shipment**; counted as incoming in sup-005's coverage (**Covered · 1.57×** with `inv-0002`) |
| Shipped | `ish-0001` | `ASN-2025-00301` | sup-002 · RM-EMUL-3310 · To Paragon · 6 000 KG · ETD 2026-08-10 · ETA 2026-08-19 · AWB `AWB-77120043`; the ASN is sup-002's own, status *In Transit*; the card offers **Cancel shipment** only and points arrival to the ASN; counted as incoming (**Covered · 1.67×** with `inv-0001`) |
| Arrived | — | — | no fixture; reach it with **Mark shipped** then **Mark arrived** on `ish-0002`, or on a new Principal → distributor leg |
| Cancelled | — | — | no fixture; reach it with **Cancel shipment** on either seeded leg |

Legs created live are numbered from `ish-9001`. For a To-Paragon test the sample seat for sup-002 is the one with a seeded own ASN to link (`ASN-2025-00301`); for a Principal → distributor test use the sup-005 seat on RM-EMUL-3310, the only distributor relationship in the fixtures (principal lead time 45 days). The sample supplier seats hold all three supplier lanes.

<!-- src: src/services/sdc/fixtures.ts:1328-1363; src/services/sdc/fixtures.ts:862-884; src/services/data/mock/fixtures/supplierShipments.ts:178-186; src/services/sdc/consolidation.ts:609-650; src/services/identity/sampleRoster.ts:132-134 -->
