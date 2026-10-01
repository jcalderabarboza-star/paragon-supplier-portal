---
entity: deliveryRelease
locale: en
title: Delivery release (schedule line)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_delivery_release
  - t_delivery_adjust
  - t_delivery_confirm
---

<!-- section:summary -->
## 1 · What this process is

One dated line of a delivery schedule, from the moment it is drawn up to the moment a delivery is accepted against it. While it is internal, Paragon can move its date and its quantity and the supplier knows nothing about it. Sending it out is the act that turns a plan into a promise somebody will be chased for, which is why that act, and not the drawing-up, is where the accountability starts.

The document behind this process is the **scheduling agreement** — a child of a contract, modelled on the SAP scheduling agreement with release documentation (doc type LPA). An agreement holds one or more **items** (one per material, with an agreed total quantity, a cadence and a quantity per release); each item holds a calendar of **schedule lines** generated at signing. The schedule line is the thing with a lifecycle, so it is the entity here. Its id is the portal's `releaseRef` — `contract/agreement/item/release`, for example `ctr-013/sa-0002/10/3` — and that is deliberately distinct from any SAP release number: the portal never writes `sapReleaseNumber`, SAP assigns it when the S/4HANA feed lands. The call-off itself is the SAP release, by ruling; what this portal records is Paragon's decision to transmit.

Who touches it: the **buyer's procurement lane** releases a line, adjusts a draft line and confirms a delivery against a released line. The **supplier** sees its own agreements on a read-only mirror; releasing and confirming are Paragon's acts, and there is no supplier acknowledgement verb yet (one is being designed). The tolerance that the drawdown is measured against belongs to a separate, single-state process (`deliveryPolicy`) owned by the compliance lane — deliberately not the lane that releases.

Honest markers. Every agreement in the demo is **SIMULATED** (`liveness: 'SIMULATED'`); the SAP agreement numbers are illustrative. A release, an adjustment and a confirmation are **portal records only — nothing is posted to S/4HANA**, and a confirmation is not a goods receipt (the SAP posting date, `fulfilledDate`, is never written by the portal). Every act taken in a session must be recorded against a named sample identity: a seat that is acting as nobody is refused on all three verbs. Lines released while the demo data was built carry no person, and the change history says so rather than inventing one.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:1-55; src/services/delivery/types.ts:144-217; src/services/delivery/generator.ts:79-101; src/lib/i18n/processFlowPurpose.ts:398-406; src/pages-v2/SupplierDeliveryAgreements.tsx:20-40 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Draft | generated at signing (not a verb — the calendar generator emits every line as `draft`) | — | — |
| 1 | Draft → Draft | records a fact (state-preserving): the date and/or quantity of a draft line change | buyer · procurement | `t_delivery_adjust` |
| 2 | Draft → Released | operator action: the line is transmitted to the supplier | buyer · procurement | `t_delivery_release` |
| 3 | Released → Released | records a fact (state-preserving): a proposed shipment match is accepted as the delivery | buyer · procurement | `t_delivery_confirm` |

`Released` is terminal: nothing leaves it. A released line is frozen — an amendment would be a new release document, and that is deliberately not built.

**Forks**

- **At Draft:** `t_delivery_adjust` — procurement — when the plan has moved and the line has not been sent out yet (also the remedy when a release is refused as back-dated); `t_delivery_release` — procurement — when the date is today or later and the quantity is what Paragon wants the supplier to deliver.
- **At Released:** `t_delivery_confirm` — procurement — only when the platform has proposed a shipment match for the line (an inferred match, shown as *proposed*) and it has not been confirmed already. A released line with no match has no act available; it waits.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:68-151; src/services/delivery/generator.ts:96-97; src/services/delivery/release.ts:224-273 -->

<!-- section:steps -->
## 3 · Step by step

### t_delivery_release — Release <!-- transition:t_delivery_release -->

- **Step kind:** operator action
- **Role:** buyer · procurement (atom `delivery:release`)
- **From → to:** Draft → Released
- **Operator — where:** `/buyer/contracts/:id` → tab **Delivery Agreements** → on an agreement item, either the **Transmit releases** toolbar (**Release through {date}**, a horizon) or the per-line **Release** button in the **Action** column of the release calendar. The cross-contract roll-up at `/buyer/delivery-agreements` opens the contract; it does not release.
- **Operator — do:** Tell the supplier that this quantity is wanted on this date. Before this the line is an internal plan; after it, the supplier is expected to deliver and the chase engine will push on the line. Releasing through a horizon sends one command per draft line dated on or before the chosen date; already-released lines in range are skipped silently, and a partial outcome (some lines released, some refused) is reported as such in the toast.
- **Operator — fill:** nothing to fill. The address carries the coordinates and the session carries the actor, so there is no field — and therefore nowhere a document number could be typed.
- **Tester — expected state:** Released
- **Tester — confirm:** the line's row shows the released state and its fulfilment reads *pending* (or a proposed match if an arrived shipment sits within 7 days); the **Released** KPI on the item climbs by the line's planned quantity and **Remaining** falls; the **Change history** gains a *Released to supplier* row naming the sample user; the supplier's `/supplier/delivery-agreements` mirror shows the line as released and, within 7 days of the date, lists it under *Upcoming*.
- **Tester — trigger event:** `t_delivery_release`
- **Checks that can refuse:** `delivery_actor_attributed` — the seat must be acting as a named sample user; a seat carrying no person is refused with the remedy stated. `delivery_release_not_backdated` — the line's date must be on or after the declared present (31 Aug 2026); a past-dated line is refused, because transmitting it would create a delivery that is overdue the moment the supplier hears of it. Move the date forward with an adjustment first.
- **Glossary:** ROLE_NOT_PERMITTED · POLICY_REJECTED · SCOPE_DENIED · NOT_FOUND · NO_PERSON_IN_SESSION
- **Honesty:** SIMULATED and portal-only — the toast reads *Released in the portal (simulated) — not posted to SAP.* No SAP release number is minted. A supplier seat is denied at scope on every schedule line, whether or not the line exists. In the demo agreement `sa-0002`, item 10's two remaining draft lines are dated 1 Apr and 1 May 2026, so releasing them as they stand is refused as back-dated; adjust the date first.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:78-97; src/services/transitions/policies.ts:1450-1515; src/services/data/mock/MockDeliveryService.ts:132-200; src/services/data/mock/MockCommandService.ts:2472-2519; src/services/query/deliveryHooks.ts:57-86; src/pages-v2/BuyerContractDetail.tsx:133-160; src/components/delivery/AgreementDrawdown.tsx:497-528,606-632; src/lib/i18n.ts:303-317; src/services/delivery/demoFixtures.ts:61-90 -->

### t_delivery_adjust — Adjust <!-- transition:t_delivery_adjust -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · procurement (atom `delivery:adjust`)
- **From → to:** Draft → same state
- **Operator — where:** `/buyer/contracts/:id` → **Delivery Agreements** → on a draft line, **Adjust** in the **Action** column → the inline editor **Adjust this draft line** → **Save adjustment**. A released line never offers it.
- **Operator — do:** Change the delivery date, the planned quantity, or both, on a line that has not been sent out. This is the reason Paragon uses the adjustable form of a scheduling agreement: plans move, and moving one before anybody has been told costs nothing. It is also the remedy the back-dating refusal names.
- **Operator — fill:** **Delivery date** and/or **Planned quantity** — at least one of the two. Neither is a required field at the verb (an adjustment legitimately carries either knob alone); the "at least one" rule is a policy check.
- **Tester — expected state:** Draft
- **Tester — confirm:** the line's date or quantity changes in the calendar; the **Change history** gains a *Draft line adjusted* row; the supplier mirror shows the new date (its cache refreshes on success). The item's **Agreed** total does not move — adjusting a line's quantity can make the sum of the lines differ from the envelope, and that is what the drawdown tolerance is for.
- **Tester — trigger event:** `t_delivery_adjust`
- **Checks that can refuse:** `delivery_actor_attributed` — a named sample user is required. `delivery_adjust_patch_valid` — the patch must change something (an empty patch is refused); a quantity must be a finite number greater than zero; a date must be readable `YYYY-MM-DD` and must not be in the past. Legality refuses a released line before any policy runs (`ILLEGAL_TRANSITION`), and the pure verb refuses it again as frozen.
- **Glossary:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · POLICY_REJECTED · SCOPE_DENIED
- **Honesty:** portal-only and SIMULATED (*Draft line adjusted in the portal (simulated) — not posted to SAP*). Dispatched directly from the page's hook rather than through the delivery service, because it is one command against one address. The editor closes itself if the seat stops holding the atom while it is open.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:98-128; src/services/transitions/policies.ts:1517-1573; src/services/query/deliveryHooks.ts:124-160; src/services/data/mock/MockCommandService.ts:2520-2534; src/services/delivery/release.ts:242-273; src/pages-v2/BuyerContractDetail.tsx:162-179; src/components/delivery/AgreementDrawdown.tsx:549-600,640-650; src/lib/i18n.ts:345-355 -->

### t_delivery_confirm — Confirm match <!-- transition:t_delivery_confirm -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · procurement (atom `delivery:confirm`)
- **From → to:** Released → same state
- **Operator — where:** `/buyer/contracts/:id` → **Delivery Agreements** → on a released line whose fulfilment reads *proposed — matched by proximity*, **Confirm match** in the **Action** column.
- **Operator — do:** Accept that a particular arrived shipment was the delivery for this line. Until somebody says so, the match is only a suggestion the platform made because the shipment's arrival day sat within 7 days of the release date, and it is shown as one. Accepting it moves the item's **Delivered** total — the figure the drawdown is read from — so it is a judgement a person makes.
- **Operator — fill:** nothing to fill. The accepted shipment reference and quantity are re-derived by the platform from the same shipment pool the screen rendered; a caller cannot state a quantity nobody was shown.
- **Tester — expected state:** Released
- **Tester — confirm:** the line's match loses the *proposed* caption and becomes authoritative; **Delivered** climbs by the shipment's quantity (an over- or short delivery is visible as the variance, never hidden); the **Change history** gains a *Delivery confirmed* row; the supplier mirror's *awaiting Paragon confirmation* caption disappears.
- **Tester — trigger event:** `t_delivery_confirm`
- **Checks that can refuse:** `delivery_actor_attributed` — a named sample user is required. `delivery_confirm_has_match` — the line must not already carry a confirmed delivery (confirming twice would count it twice), and a shipment must actually be matched to it (no match, nothing to accept). A draft line is refused by legality before either runs.
- **Glossary:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · POLICY_REJECTED · SCOPE_DENIED
- **Honesty:** a confirmation is a **portal record, never a SAP goods receipt** — the toast says so. The on-time/late verdict is computed against the shipment's `eta`, an estimate, not a posted receipt date. In the demo, `ctr-013/sa-0002/20/2` carries a proposed over-delivery (210,000 against 200,000) and is the line to confirm; `ctr-013/sa-0002/20/1` was confirmed when the demo data was built.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:130-149; src/services/transitions/policies.ts:1575-1612; src/services/data/mock/MockDeliveryService.ts:209-230; src/services/data/mock/MockCommandService.ts:2535-2547; src/services/delivery/confirm.ts:106-138; src/services/delivery/fulfillment.ts:59-63,194-236; src/pages-v2/BuyerContractDetail.tsx:181-197; src/components/delivery/AgreementDrawdown.tsx:655-675; src/services/delivery/demoFixtures.ts:123-133,163-172 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Adjust or release (at Draft).** Branch A — `t_delivery_adjust` — **When:** the date or quantity is wrong for what Paragon now wants, or the line's date has already passed and it cannot be released as it stands. Branch B — `t_delivery_release` — **When:** the line is due today or later and Paragon is ready to make it a commitment. Both stay available until the line is released; after that neither is.
- **Back-dated release (exception).** `t_delivery_release` on a past-dated line — **When:** the line's date is before the declared present. The dispatcher refuses `POLICY_REJECTED:delivery_release_not_backdated` and the toast names the remedy: move the date forward, then release. A horizon release that meets some past lines and some future ones releases the future ones and reports the rest as refused.
- **Confirm or wait (at Released).** Branch A — `t_delivery_confirm` — **When:** an arrived shipment of the same material, from this supplier, sits within 7 days of the release date and the platform shows it as *proposed*. Branch B — no act — **When:** nothing has arrived: the line reads *pending* until 3 days past its date and *missed* after that, and the chase engine raises an alert. There is no "mark as missed" or "cancel" verb; those are derived at read.
- **Nothing to confirm / already confirmed (exception).** `t_delivery_confirm` is refused `POLICY_REJECTED:delivery_confirm_has_match` when no shipment is matched (no delivery to accept) or when the line already carries one (a repeat, surfaced rather than double-counted).
- **Unattributed seat (exception on every verb).** Any of the three verbs from a seat carrying no person is refused `POLICY_REJECTED:delivery_actor_attributed`; adopt a sample user on the identity panel and take the act again.
- **Not offered: release amendment, over-envelope block.** Changing a released line is a new release document and is not built. The `block` drawdown mode is declared but not enforced at release — releasing generated lines can never breach the envelope, so a breach requires an adjusted line and is flagged on the ledger, not stopped.
<!-- src: src/services/transitions/policies.ts:1450-1612; src/services/delivery/fulfillment.ts:59-63,138-143; src/services/delivery/types.ts:84-95; src/services/data/mock/MockDeliveryService.ts:152-199 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| SIMULATED / Sample | external (liveness) | all states | always — every agreement carries `liveness: 'SIMULATED'` and the capability's second gate waits on the S/4HANA schedule feed | `LivenessPill` on `/buyer/contracts/:id` (Delivery Agreements tab), `/buyer/delivery-agreements`, `/supplier/delivery-agreements` |
| Drafted — no releases transmitted yet | derived at read | Draft (whole item) | when no line of the agreement is released | agreement card note |
| Fulfilment *pending* | time-driven, derived at read | Released | no shipment matched and the date is not yet 3 days past | release calendar; roll-up tab **Pending** |
| Fulfilment *fulfilled* / *late* | derived at read | Released | a shipment is matched; arrival day on or before the release date → fulfilled, after → late | release calendar; roll-up tabs **On track** / **Late** |
| Fulfilment *missed* | time-driven, derived at read | Released | no shipment matched and today is more than 3 days past the release date | release calendar; roll-up tab **Missed** |
| Proposed — matched by proximity (inferred) | derived at read | Released | a shipment sits within the 7-day window but nobody has confirmed it; supplier wording *awaiting Paragon confirmation* | release calendar caption, both seats |
| Ambiguous match | derived at read | Released | more than one candidate shipment sat in the window; the pick is deterministic and the ambiguity is surfaced | fulfilment view (`ambiguous`) |
| Quantity variance | derived at read | Released | always present on a match — shipment quantity minus planned quantity | release calendar |
| Chase: Upcoming (anticipatory nudge) | time-driven, derived at read | Released, pending | release date is today to 7 days out | `/buyer/chase`; supplier mirror as *Upcoming* |
| Chase: Missed / late (non-compliance alert) | time-driven, derived at read | Released | fulfilment is late or missed | `/buyer/chase`; supplier mirror as *Overdue* |
| Chase: Drift | derived at read | item | 2 or more late-or-missed lines on one item; buyer-side only, never shown to the supplier | `/buyer/chase` |
| Severity Urgent (hard) / Advisory (soft) | derived at read | any chase entry | JIT (firm) lines are hard, FRC (semi-firm) lines are soft | `/buyer/chase` pill |
| Not recorded — no person in session | derived at read | any recorded act | the act was taken while the demo data was built, in no session | **Change history** actor column |
| Awaiting Procurement (handoff) | derived at read | Draft / Released | the seat does not hold `delivery:release`, `delivery:adjust` or `delivery:confirm` | the verb's own slot on the agreement card |
<!-- src: src/services/delivery/fulfillment.ts:59-63,131-143; src/services/chase/deliveryChase.ts:49-98,142-224; src/services/chase/supplierObligations.ts:11-32; src/services/delivery/history.ts:64-128; src/services/liveness/registry.ts:205,268-271; src/components/delivery/AgreementDrawdown.tsx:497-503,606-680; src/lib/i18n.ts:253,280-283,465-475 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `ctr-013/sa-0002/20/2` (SAP agreement 5500000456, item 20, release 2). A released line of the demo agreement, matched by proximity to an over-delivery and awaiting confirmation.

| Joins to | By | Note |
|---|---|---|
| Scheduling agreement `sa-0002` | second segment of `releaseRef` | header carries `contractId`, `supplierId`, `sapAgreementNumber`, `docType: 'LPA'`, `liveness` |
| Contract `ctr-013` (CTR-2026-021, PT Sample Packaging Scheduling Agreement 2026) | first segment of `releaseRef`; verified against the agreement's own `contractId` | a mis-addressed ref is `NOT_FOUND`, never an act on another contract's calendar |
| Agreement item 20 (`PK-CAPF-8820`, JIT, agreed 400,000) | third segment (`lineSeq`) | the item owns the drawdown policy; its address is `sa-0002#20` in the `deliveryPolicy` process |
| Supplier `sup-007` (PT Sample Packaging Indonesia) | `agreement.supplierId` | the shipment pool is filtered to this supplier before matching |
| Incoming shipment `ish-demo-4` | derived proximity match (`matchedRef` = its `asnRef` if present, else its id) | becomes the stored `fulfilledBy` only on confirmation |
| Drawdown ledger (agreed / released / delivered / remaining) | derived per item, never stored | `deliveredQty` sums only confirmed `actualQty` |
| Chase entries | derived from the released lines' fulfilment | commitment grain: supplier + agreement + item + release |

Display-only fields the portal carries but never writes: `sapReleaseNumber` (declared, never seeded, assigned by SAP on transmission), `fulfilledDate` (the SAP goods-receipt posting date, reserved for the S/4HANA feed), `sapItemNumber` and `sapAgreementNumber` (SIMULATED literals on the fixtures).
<!-- src: src/services/delivery/addressing.ts:52-61,114-123; src/services/delivery/types.ts:144-263; src/services/delivery/ledger.ts:56-96; src/services/delivery/demoFixtures.ts:44-51,96-144,163-172; src/data/mockContracts.ts:376-383; src/data/mockSuppliers.ts:220-222 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` is the transition id, `actor` is `buyer:all` for a buyer seat (persona and tenancy, not a person), plus `ts`, `outcome` and a `correlationId`. Refusals are recorded too. The page's **Change history** is a different, narrower view: it folds the agreement's own stamps (`releasedAt`/`releasedBy`, `adjustedAt`/`adjustedBy`, `confirmedAt`/`confirmedBy`, and the policy's `activeChangedAt`) into rows, newest first, and resolves the person's label at render — a `(SAMPLE)` marker travels with a sample identity. Acts taken when the demo data was built carry `UNATTRIBUTED: NO_PERSON_IN_SESSION` and render as *Not recorded — no person in session*.

Worked sequence for `ctr-013/sa-0002/10/1` (a draft line dated 1 Apr 2026, item 10, PET bottles), as a tester holding procurement and acting as a sample user would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | Draft → Draft | buyer · procurement (sample user) | **Adjust** → date moved to a day on or after 31 Aug 2026 → **Save adjustment** | `t_delivery_adjust` |
| T+1 | Draft → Released | buyer · procurement (sample user) | per-line **Release** | `t_delivery_release` |
| T+2 | Released (no change) | — | no shipment arrives within 7 days; fulfilment reads *pending*, then *missed* 3 days after the date; the chase list raises an Advisory (FRC) alert | — (derived at read, no event) |

Had the tester released the line at T+0 without adjusting, the event would still be written — with `outcome: failed` and reason `POLICY_REJECTED:delivery_release_not_backdated`.

For the confirm half, `ctr-013/sa-0002/20/2` needs no preparation: **Confirm match** at T+0 writes `t_delivery_confirm`, and the history shows the seeded *Released to supplier* row (no person) above the new *Delivery confirmed* row (the sample user).
<!-- src: src/services/transitions/events.ts:127-129; src/services/delivery/history.ts:64-128; src/components/delivery/ChangeHistory.tsx:69-114; src/services/delivery/seedActor.ts:38-41; src/services/delivery/demoFixtures.ts:61-90; src/services/transitions/policies.ts:1501-1515 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| Release / Adjust / Confirm buttons are missing; a notice reads *Awaiting Procurement* | the notice sits in the verb's own slot on the agreement card | the seat does not hold the atom (`ROLE_NOT_PERMITTED` would be the dispatcher's answer) | adopt a seat holding procurement on the identity panel |
| Toast *Release not applied* — "This seat is not acting as anyone…" | `POLICY_REJECTED:delivery_actor_attributed` | the seat carries no person | pick a sample user on the identity panel, then release again |
| Toast — "This line is already past its delivery date…" | `POLICY_REJECTED:delivery_release_not_backdated` | the line's date is before 31 Aug 2026 (the declared present) | **Adjust** the date forward, then **Release** |
| Toast *Released in the portal* with a warning tone: "3 released, 2 refused" | partial horizon release | some lines in the horizon were past-dated | adjust the refused lines, or leave them as drafts |
| Toast *Adjustment not applied* — "Change the quantity, the date, or both" / "That date has already passed" / "…number greater than zero" | `POLICY_REJECTED:delivery_adjust_patch_valid` | empty patch, past date, or a bad quantity | correct the field and save again |
| Adjust refused on a released line | `ILLEGAL_TRANSITION` (from `Released`) | a released line is frozen | none — an amendment is not built; a new release document would be needed |
| Toast *Match not confirmed* — "No shipment has been matched…" | `POLICY_REJECTED:delivery_confirm_has_match` | no arrived shipment of that material from that supplier within 7 days of the date | wait for the shipment; nothing to confirm yet |
| Toast *Match not confirmed* — "already confirmed" | `POLICY_REJECTED:delivery_confirm_has_match` | the line already carries `fulfilledBy` / `actualQty` | none needed; the delivery is counted once |
| A supplier seat sees no buttons at all | supplier mirror | every delivery verb denies a supplier scope (`SCOPE_DENIED`); the mirror is read-only by ruling | expected; the supplier acknowledgement verb is being designed |
| "That release line could not be found" | `UNKNOWN_RELEASE_SEQ` from the service, or `NOT_FOUND` from the dispatcher | the address does not resolve, or its contract segment disagrees with the agreement | reload the agreement and act from the calendar row |
| A line reads *missed* though the supplier says it delivered | fulfilment derived at read from the shipment pool | no arrived `to-paragon` shipment of that material within the window (or the shipment is still *Shipped*, not *Arrived*) | the supplier reports and arrives the shipment on `/supplier/forecasts`; the match is then proposed |
| Change history shows *Not recorded — no person in session* | seeded release stamps | the act was taken at fixture build, not in a session | expected; acts taken in a session name the sample user |
<!-- src: src/services/transitions/policies.ts:1450-1612; src/components/delivery/deliveryRefusal.ts:52-84; src/lib/i18n.ts:310-343,354-355,378-386; src/services/data/mock/MockDeliveryService.ts:138-150,184-193; src/services/delivery/addressing.ts:114-123; src/services/delivery/fulfillment.ts:112-119 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | `ctr-003/sa-0001/10/1`, `ctr-003/sa-0001/10/2`, `ctr-003/sa-0001/10/3` (36 draft lines in the fact pack) | 5500000123 | `sa-0001` over contract ctr-003 (CTR-2025-018) is the pristine all-draft agreement; its calendar starts at the contract's start date, which is shifted to the declared present by the contract family anchor, so which of its lines are past-dated is not measured here. `ctr-013/sa-0002/10/1` and `/10/2` are drafts dated 1 Apr and 1 May 2026 — past, so they exercise the back-dating refusal and the adjust remedy. |
| Released | `ctr-013/sa-0002/10/3`, `ctr-013/sa-0002/10/4`, `ctr-013/sa-0002/10/5` (22 released lines in the fact pack) | 5500000456 | released at fixture build by the real verb, no person recorded. At the declared present: `/10/3` fulfilled (inferred), `/10/4` late (inferred, short by 5,000), `/10/5` missed, `/10/6` pending and within the 7-day nudge window; `/20/1` confirmed, `/20/2` proposed over-delivery (the line to confirm). Further agreements `sa-1001`–`sa-1007` exist for the roll-up (derive their count from `demoFixturesScale.ts`). |
<!-- src: src/services/delivery/fixtures.ts:35-122; src/services/delivery/demoFixtures.ts:44-172; src/services/delivery/demoFixturesScale.ts:1-30; src/services/data/fixturePresent.ts:198,391-400 -->
