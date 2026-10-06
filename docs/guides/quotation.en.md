---
entity: quotation
locale: en
title: Quotation (supplier's offer)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_quotation_submit
  - t_quotation_review
  - t_quotation_award
  - t_quotation_reject
  - t_quotation_withdraw
---

<!-- section:summary -->
## 1 · What this process is

A supplier's offer against one sourcing request — the price and the delivery promise it is prepared to stand behind. A quotation belongs to exactly one RFQ and one supplier. It carries the unit price and the currency it is quoted in, an estimated lead time in whole days, an optional minimum order quantity, the date the offer is valid until, the payment terms offered, free-text notes, whether a sample batch can be provided and how long one takes, and the name of an attached quotation document (the name only — the portal holds no file). Its total price is arithmetic the platform does at submission: unit price × the RFQ's total quantity, in the quotation's own currency.

Two roles touch it, one on each side. The supplier's **sales contact** (lane `commercial`) makes the offer from the supplier portal, against an event it was invited to; that is the only supplier-owned creation verb in the sourcing lane. Paragon's **buyer** (lane `procurement`) reads every quotation on an event side by side, may move a freshly submitted one into evaluation, and decides the event on the RFQ. Nobody presses the last two steps: when the buyer awards the RFQ, the platform marks the chosen quotation **Awarded** and every other quotation on that event **Rejected**, under its automation grant, in the same act.

It starts at **Submitted** — the document is born submitted; there is no supplier-side draft — passes through **Under Review** when the buyer takes it into evaluation, and ends at **Awarded**, **Rejected** or **Withdrawn**, the three terminal states. Awarded and Rejected are consequences of the RFQ award; Withdrawn is the consequence of the RFQ being cancelled. None can be entered by hand against a single quotation, and there is no verb for a supplier to withdraw, revise or decline a quotation.

Honesty markers a reader needs before using this guide. The seeded quotations are **SIMULATED** fixtures against SIMULATED RFQs. A quotation created at runtime is stored with a flat **SIMULATED baseline of 50** for its compliance and reliability scores — no live compliance or on-time-delivery source exists — and its price, lead-time and composite scores are computed by the buyer's comparison at read, never stored; the comparison labels those axes "Simulated" and the lead time "Estimated". The supplier sees only its own quotations and only their facts and status — never a score, a rank, or a rival's bid. An award creates no purchase order; the supplier's award history says "PO issued —". The "Decline RFQ" and "Ask question" controls beside the submit button are toasts that say nothing was declined and nothing was sent. Every human act is recorded without a named person.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Submitted | operator action (creation); five policy checks | supplier · commercial | `t_quotation_submit` |
| 2 | Submitted → Under Review | operator action | buyer · procurement | `t_quotation_review` |
| 3 | Submitted, Under Review → Awarded | cascade (from `t_rfq_award`, the chosen quotation) | automation | `t_quotation_award` |
| 4 | Submitted, Under Review → Rejected | cascade (from `t_rfq_award`, every other quotation on the event) | automation | `t_quotation_reject` |
| 5 | Submitted, Under Review → Withdrawn | cascade (from `t_rfq_cancel`, every quotation still being weighed) | automation | `t_quotation_withdraw` |

<!-- src: src/services/transitions/flows/quotation.flow.ts:215-303; src/services/transitions/cascades.ts:57-60 -->

**Forks**

- **At Submitted:** `t_quotation_review` — procurement — when the buyer starts evaluating this offer; `t_quotation_award` — automation — when the buyer awards the RFQ to this quotation; `t_quotation_reject` — automation — when the buyer awards the RFQ to a different quotation on the same event; `t_quotation_withdraw` — automation — when the buyer cancels the RFQ. Review is optional: a Submitted quotation can be awarded, rejected or withdrawn directly.
- **At Under Review:** `t_quotation_award` — automation — this quotation was chosen on the RFQ; `t_quotation_reject` — automation — another quotation was chosen; `t_quotation_withdraw` — automation — the RFQ was cancelled. There is no exit back to Submitted and no buyer-side reject of one quotation.

<!-- section:steps -->
## 3 · Step by step

### t_quotation_submit — Submit a quotation <!-- transition:t_quotation_submit -->

- **Step kind:** operator action (creation)
- **Role:** supplier · commercial (atom `quotation:submit`)
- **From → to:** ∅ → Submitted
- **Operator — where:** `/supplier/rfqs` ("My Sourcing Events") → **Open events** tab → the RFQ card → **Submit quote** → side panel "Submit quotation — RFQ-…" → **Submit quotation**. A fulfilment or back-office seat sees "Awaiting Supplier Commercial" in the button's slot (`handoff-quotation-submit`); if the seat is narrowed while the panel stands open, the panel collapses back to the card.
- **Operator — do:** The supplier makes its offer: what it costs, in what money, and how long delivery takes. All three, because a price with no date is not comparable. Step 1 "Pricing": type the unit price (digits only — "e.g. 15000"), pick the **Bid currency** (IDR, USD or EUR; IDR is the default) and read the auto-calculated total. Step 2 "Timing & quantity": type the **Estimated lead time** in whole days or weeks (a 0 means same-day delivery and needs the confirmation tick "I confirm this quotation offers same-day delivery."), set **Quote valid until** (today or later — a date that has passed is refused on the field and the button is held), and optionally a **Minimum order quantity** (blank means "same as the RFQ quantity"). Step 3 lists the supplier's own halal, BPOM and quality documents from My Documents, each in the state it is in today (Valid, Expiring Soon, Expired, Awaiting Upload, Under Review, Rejected) with its expiry date; a supplier holding none reads "No halal, BPOM or quality document is on file. Add them on My Documents." Step 4 takes notes, whether a sample batch can be provided and its lead time, and an optional quotation PDF — the file's name is kept with the quotation; the file itself is not held, and the line under the box says so. Press Submit quotation. Toast: "Quotation submitted for RFQ-… · Paragon procurement team will review by <response deadline>."
- **Operator — fill:** required by the machine: the RFQ (`rfqId`, from the card), the unit price (`unitPrice`), the lead time in days (`leadTimeDays`) and the currency (`currency`). Required by the form: the valid-until date ("Required fields missing — Please fill: Quote valid until."). Each number goes through one parser and is refused with its own sentence: a blank, non-numeric, ambiguous ("1.500") or zero price; a blank, non-numeric, ambiguous or fractional lead time (a part-day cannot be a promise); a non-numeric, ambiguous or zero minimum order quantity (blank is legal). Step 1 also carries *Payment terms offered*, prefilled with the terms the buyer asked for and sent as `paymentTermsOffered`; the buyer reads it on the comparison's Payment Terms row.
- **Tester — expected state:** Submitted
- **Tester — confirm:** the panel closes and the page switches to **My Quotes**, where the new row shows a store-assigned number (`QUO-2026-901`, `-902`…), the submitted date, unit and total price in the bid currency, "N days" lead time, the minimum ("Same as RFQ qty" when none), the valid-until date and the pill **Submitted**; the RFQ leaves the Open events tab (an event you have quoted is pruned from it) and the "Awaiting Award" KPI counts it. On the buyer side, `/buyer/sourcing` → the RFQ's panel → "Quote comparison" gains a column with pill **Submitted** and the link **Move to review**, and its rows **Valid until**, **Sample batch** ("Can provide" / "Cannot provide"), **Sample lead time**, **Supplier notes** and **Quotation document** (tagged "Name only") read what the supplier typed; an answer nobody gave reads "Not stated". Use `rfq-011` (RFQ-2026-011) with the seeded supplier persona sup-007: the one Open event it is invited to, has not quoted, and that is still inside its response deadline. `rfq-010` (RFQ-2026-010) is the specimen of the other case — its response deadline was 28 Aug 2026, so its card reads "Response deadline passed" and offers no form.
- **Tester — trigger event:** `t_quotation_submit` (actor `supplier:<supplierId>`)
- **Checks that can refuse:** `quotation_submit_currency_permitted` — the currency must be one of the permitted bid currencies (IDR, USD, EUR), by membership, not merely present; the refusal reads `currency 'X' is not permitted (IDR, USD, EUR)` and the toast says "“X” is not a currency Paragon accepts for bids. Permitted: IDR, USD, EUR. Your quote was not submitted." Scope — the owner of a new quotation is the submitting supplier **only if it is on the RFQ's invited list**; a supplier not invited, or one naming another supplier's id, is refused `SCOPE_DENIED` before any other check. A buyer seat passes scope and is refused at the role gate. Then four checks on the event and the offer, in this order, each refused by name with its own toast. `quotation_submit_event_open` — the event must be Open; reads `QUOTE_EVENT_NOT_OPEN: RFQ-… is Closed. Quotations are taken only while a sourcing event is Open.`; toast "This sourcing event is no longer open, so quotations are not taken on it. Your quotation was not submitted." `quotation_submit_before_deadline` — the response deadline must not have passed at the declared present (the deadline day itself is still open); reads `QUOTE_DEADLINE_PASSED: the response deadline of RFQ-… was <date> (today is 2026-08-31). …`; toast "The response deadline of this event has passed. Your quotation was not submitted." `quotation_submit_one_per_supplier` — one quotation per supplier per event, whatever became of the first; reads `QUOTE_ALREADY_SUBMITTED: <supplier> already holds quotation <id> on this event. …`; toast "You have already submitted a quotation on this event. One quotation per event; a submitted quotation cannot be revised or replaced." `quotation_submit_validity_current` — a stated valid-until date must be today or later, and must be a date; reads `QUOTE_VALIDITY_PAST: the quotation is stated valid until '<value>', which is not a date on or after today (2026-08-31). …`; toast "The valid-until date has already passed. Choose a date from today onwards and submit again." Since stages (RFx-1), a sixth hook sits third in the order, after "is the event Open": `quotation_submit_at_rfq_stage` — an event at its RFI or RFP stage is refused `QUOTE_STAGE_NOT_RFQ`; there the card offers **Record interest** instead (the stage-response guide).
- **Glossary:** `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`, `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Honesty:** The quotation is born Submitted — there is no supplier draft and no edit or withdraw afterwards. The total is unit price × the RFQ's quantity, computed once at creation in the quotation's currency. Compliance and reliability are stored at the SIMULATED baseline of 50; price, lead-time and composite scores are stored as 0 and computed by the buyer's comparison at read. The submitted date is the browser's date, not the declared present. Who has answered an event is derived from its quotations, so the buyer's "Responses" count moves the moment a quotation lands. The card's day-count and every dated refusal are measured against the declared present (31 Aug 2026), the instant the buyer's board uses. A second quotation is refused rather than taken as a revision: nothing links a new quotation to the one it would replace, so two rows would be two awardable offers from one supplier. A quotation that states no valid-until date at all is not refused by the machine; the form requires one. The documents in step 3 are read from My Documents and are not copied into the quotation. Of an attached PDF only the file name is kept: this portal has no file store, and the buyer's comparison tags the row "Name only".
<!-- src: src/services/transitions/flows/quotation.flow.ts:237-253; src/services/transitions/policies.ts:189-206; src/pages-v2/SupplierRFQs.tsx:325-345; src/pages-v2/SupplierRFQs.tsx:430-460; src/pages-v2/SupplierRFQs.tsx:766-796; src/pages-v2/SupplierRFQs.tsx:830-1025; src/pages-v2/SupplierRFQs.tsx:1090-1125; src/pages-v2/SupplierRFQs.tsx:1195-1215; src/pages-v2/SupplierRFQs.tsx:1338; src/pages-v2/rfqs/quotationSubmitModel.ts:116-208; src/pages-v2/rfqs/quotationPrice.ts:67; src/pages-v2/rfqs/quotationLeadTime.ts:80; src/pages-v2/rfqs/quotationMoq.ts:78; src/services/query/commandHooks.ts:554-569; src/services/data/mock/MockCommandService.ts:589-672; src/services/data/mock/stores/quotationStore.ts:96-100; src/lib/currencyPolicy.ts:38-49; src/lib/i18n/rfqs.ts:47-49; src/lib/i18n/rfqs.ts:88-195; src/data/mockRfqs.ts:293-354 -->

### t_quotation_review — Move to review <!-- transition:t_quotation_review -->

- **Step kind:** operator action
- **Role:** buyer · procurement (atom `quotation:review`)
- **From → to:** Submitted → Under Review
- **Operator — where:** `/buyer/sourcing` → open the RFQ → "Quote comparison" → the **Status** row → **Move to review** under the quotation's pill. The link exists only under a **Submitted** quotation; a seat without `quotation:review` sees "Awaiting Procurement" in that cell instead (`handoff-rfq-review`), one notice per quotation.
- **Operator — do:** Buying takes the offer into evaluation. It separates what has been read from what is still in the pile. Press Move to review on the column. Toast: "Quote moved to review · The quotation is now under evaluation."
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Under Review
- **Tester — confirm:** the pill in the comparison's Status row flips in place from **Submitted** (neutral) to **Under Review** (info) and the link disappears; on the supplier side the row in **My Quotes** now reads **Under Review** and the "Awaiting Award" KPI is unchanged (it counts Submitted and Under Review together). Fixture: `qt-011a` on `rfq-011` (RFQ-2026-011) is the one seeded Submitted quotation.
- **Tester — trigger event:** `t_quotation_review` (actor `buyer:all`)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Review changes the state and nothing else — no score is computed or stored by it, and the award does not require it (a Submitted quotation can be awarded or rejected directly). There is no way back to Submitted and no buyer-side "reject this one" verb; the only exits from Under Review are the two cascades. Every seeded quotation on the Open events except `qt-011a` is already Under Review.
<!-- src: src/services/transitions/flows/quotation.flow.ts:256-265; src/pages-v2/BuyerSourcing.tsx:1227-1258; src/pages-v2/BuyerSourcing.tsx:3688-3728; src/pages-v2/SupplierRFQs.tsx:814-828; src/services/query/commandHooks.ts:572-591; src/services/data/mock/MockCommandService.ts:611-617; src/lib/i18n/sourcing.ts:196; src/lib/i18n/sourcing.ts:387-390; src/data/mockQuotations.ts:436-462 -->

### t_quotation_award — Quotation awarded (cascade) <!-- transition:t_quotation_award -->

- **Step kind:** cascade (system-driven); fired by `t_rfq_award`
- **Role:** automation (atom `quotation:award`; no human lane holds it)
- **From → to:** Submitted, Under Review → Awarded
- **Operator — where:** nobody presses this against a quotation. The buyer awards the RFQ at `/buyer/sourcing` → the RFQ's panel → tick **Award** on this quotation's column → **Award to selected**; the platform fires this on the chosen quotation.
- **Operator — do:** This offer won. It follows from the buying decision on the request, and is never entered against a single supplier by hand. The platform reads the winning quotation id from the award payload, finds it among the RFQ's quotations in the store, and dispatches this transition on it under the automation grant.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Awarded
- **Tester — confirm:** on the buyer side the comparison's Status row reads **Awarded** on this column and the RFQ's "Award summary" names the supplier and value; the supplier's `/supplier/rfqs` → **Awards & history** tab lists the RFQ with result **Awarded**, the note "Awarded — your quotation was selected", the award date, the contract value in the quotation's currency and "PO issued —", and the win-rate line moves. The row leaves **My Quotes**' awaiting count. Seeded examples: `qt-006a` (RFQ-2026-006, sup-001), `qt-007a` (RFQ-2026-007, sup-005).
- **Tester — trigger event:** `t_quotation_award` (its event carries `causationId` = the `t_rfq_award` correlationId; actor `buyer:all` under the automation grant)
- **Checks that can refuse:** none beyond role, legality and required fields. A quotation already in a terminal state is refused `ILLEGAL_TRANSITION`; the refusal is recorded with the award's `causationId` and never undoes the award.
- **Glossary:** `ILLEGAL_TRANSITION`; status label "Awarded".
- **Honesty:** Nothing downstream is created — no purchase order, no contract; the "PO issued" column is "—" by construction. The "Award date" shown to the supplier is the RFQ's award deadline, not the timestamp of the act. The fan-out runs inside a best-effort `catch {}`; a role or legality refusal is recorded on the audit sink, but a quotation that cannot be found is skipped without a trace (the resolver only hands over ids it found in the store). The supplier is not notified by any channel; the outcome is visible on the next read of the Awards tab.
<!-- src: src/services/transitions/flows/quotation.flow.ts:268-283; src/services/transitions/cascades.ts:57-60; src/services/data/mock/MockCommandService.ts:2935-2953; src/services/transitions/dispatcher.ts:838-907; src/pages-v2/BuyerSourcing.tsx:1181-1226; src/pages-v2/BuyerSourcing.tsx:3756-3794; src/pages-v2/SupplierRFQs.tsx:163-195; src/lib/i18n/rfqs.ts:73-87; src/data/mockQuotations.ts:282-300; src/data/mockQuotations.ts:338-356 -->

### t_quotation_reject — Quotation not awarded (cascade) <!-- transition:t_quotation_reject -->

- **Step kind:** cascade (system-driven); fired by `t_rfq_award`
- **Role:** automation (atom `quotation:reject`; no human lane holds it)
- **From → to:** Submitted, Under Review → Rejected
- **Operator — where:** nobody presses this against a quotation. It follows from the buyer awarding the RFQ to a **different** quotation at `/buyer/sourcing`.
- **Operator — do:** This offer did not win. It lands at the same moment as the winning one, so nobody is left wondering and no one has to be told individually. The platform dispatches this on every quotation of the event whose id is not the winner's, under the automation grant.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Rejected
- **Tester — confirm:** on the buyer side the comparison's Status row reads **Rejected** (danger) on each losing column; on the supplier side the **Awards & history** tab lists the RFQ with result **Not Awarded** and the note "Not awarded — another quotation was selected", contract value "—", "PO issued —". Seeded examples: `qt-006b`, `qt-006c` (RFQ-2026-006), `qt-007b`, `qt-007c` (RFQ-2026-007).
- **Tester — trigger event:** `t_quotation_reject` (one event per losing quotation, each with `causationId` = the award's correlationId)
- **Checks that can refuse:** none beyond role, legality and required fields. A sibling already Awarded or Rejected is refused `ILLEGAL_TRANSITION` — recorded, and the award stands.
- **Glossary:** `ILLEGAL_TRANSITION`; status labels "Rejected" (buyer) and "Not Awarded" (supplier's result column).
- **Honesty:** Losing quotations are not rejected one by one and cannot be: there is no buyer-side verb that rejects a single quotation, and no supplier-side verb that withdraws one. Cancelling an RFQ does **not** fire this — it fires `t_quotation_withdraw`, and the quotation ends Withdrawn, not Rejected. The supplier is not notified; the result appears on their next read.
<!-- src: src/services/transitions/flows/quotation.flow.ts:286-301; src/services/transitions/cascades.ts:24-86; src/services/data/mock/MockCommandService.ts:2935-2953; src/services/transitions/dispatcher.ts:838-907; src/pages-v2/BuyerSourcing.tsx:3673-3686; src/pages-v2/SupplierRFQs.tsx:163-195; src/lib/i18n/rfqs.ts:83-84; src/lib/statusLabel.ts:60; src/lib/statusLabel.ts:72; src/data/mockQuotations.ts:301-336; src/data/mockQuotations.ts:357-392 -->

### t_quotation_withdraw — Request withdrawn (cascade) <!-- transition:t_quotation_withdraw -->

- **Step kind:** cascade (system-driven); fired by `t_rfq_cancel` and by `t_rfq_conclude`
- **Role:** automation (atom `quotation:withdraw`; no human lane holds it)
- **From → to:** Submitted, Under Review → Withdrawn
- **Operator — where:** nobody presses this against a quotation. It follows from the buyer cancelling the RFQ at `/buyer/sourcing` (**Cancel RFQ**, then **Yes, cancel the event**).
- **Operator — do:** Paragon called the event off before choosing anyone, so the request is taken back for every offer still being weighed. No offer is judged; the supplier reads that the event ended, not that they lost.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Withdrawn
- **Tester — confirm:** on the supplier side the quotation leaves the "Awaiting Award" KPI and the "quotes pending evaluation" count; **My Quotes** shows the pill **Withdrawn**; **Awards & history** lists the RFQ with result **Event Cancelled**, award date "—", contract value "—" and the note "Paragon cancelled this event — no decision was made on your quotation". The win rate is unchanged: it counts decided events only.
- **Tester — trigger event:** `t_quotation_withdraw` (one event per quotation that was Submitted or Under Review, each with `causationId` = the cancel's correlationId)
- **Checks that can refuse:** none beyond role, legality and required fields. Only quotations still Submitted or Under Review are named by the cascade, so an Awarded or Rejected one is never asked.
- **Glossary:** status labels "Withdrawn" (the quotation) and "Event Cancelled" (the supplier's result column).
- **Honesty:** Withdrawn is not Rejected. Rejected says a buyer compared the offer and chose another; a cancelled event compared nothing. The word is Paragon's act, not the supplier's: a supplier still has no verb to withdraw an offer. The supplier is not notified; the result appears on their next read. An event concluded without an award withdraws its quotations the same way; the supplier's result column then reads *No Award* rather than *Event Cancelled*.
<!-- src: src/services/transitions/flows/quotation.flow.ts; src/services/transitions/cascades.ts; src/services/data/mock/MockCommandService.ts; src/pages-v2/SupplierRFQs.tsx; src/lib/i18n/rfqs.ts; src/lib/statusLabel.ts -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Review or decide (at Submitted).** Branch A — `t_quotation_review` — **When:** the buyer wants to mark this offer as read; optional. Branch B — `t_quotation_award` — **When:** the buyer awards the RFQ to this quotation; the award panel appears on the RFQ when it is Open or Closed and at least one quotation exists; who has answered is derived from the quotations themselves. Branch C — `t_quotation_reject` — **When:** the buyer awards the RFQ to another quotation on the same event.
- **Decide (at Under Review).** Branch A — `t_quotation_award` — **When:** chosen on the RFQ. Branch B — `t_quotation_reject` — **When:** not chosen. No other exit exists.
- **The event is cancelled instead.** `t_quotation_withdraw` — **When:** the buyer cancels the RFQ. Every quotation still Submitted or Under Review ends **Withdrawn**: it leaves the supplier's "Awaiting Award" KPI and appears under **Awards & history** as *Event Cancelled*, outside the win rate.
- **The offer cannot be made at all.** A supplier not on the RFQ's invited list is refused at scope; an unpublished (Draft) RFQ is not shown to any supplier; an event the supplier has already quoted is pruned from Open events, so a second quotation on the same event is not offered by the surface, and the machine refuses one by name (`QUOTE_ALREADY_SUBMITTED`). An event that is no longer Open (`QUOTE_EVENT_NOT_OPEN`), or past its response deadline (`QUOTE_DEADLINE_PASSED`), takes no quotation either; a card past its deadline says so in the Submit quote button's slot.
- **The form refuses before the machine does.** Price, lead time, minimum quantity and currency each have their own refusal sentence on the supplier form; the currency rule and the valid-until rule are also policy hooks; the currency toast names the permitted set, and the valid-until line names today's date.

<!-- src: src/services/transitions/flows/quotation.flow.ts:215-303; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/pages-v2/SupplierRFQs.tsx:786-796; src/pages-v2/SupplierRFQs.tsx:895-1025; src/services/data/mock/MockCommandService.ts:618-622; src/services/transitions/cascades.ts:24-86 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| **Awaiting Award / Decision pending** | derived | Submitted, Under Review | the supplier's own quotations not yet decided | `/supplier/rfqs` KPI "Awaiting Award" |
| **Quotes pending evaluation** | derived | Submitted, Under Review | count of the supplier's own quotations | the page's meta line and KPI "Quotes Submitted — Pending evaluation" |
| **Estimated** (lead time) | honesty marker | any | always, on the buyer's lead-time row | quote comparison: "Indicative at quote stage — the supplier confirms a firm delivery date at PO. Still scored and ranked on." |
| **Simulated** (compliance, reliability) | honesty marker | any | always — a runtime quotation stores the 50/50 baseline | quote comparison tag "Rehearsal — awaiting a live source (compliance & reliability data)" |
| **Top-ranked** | derived at read | Submitted, Under Review (on an Open RFQ) | the comparison could rank (same currency, or a usable exchange-rate pin) | the highlighted column in the quote comparison |
| **Not ranked — `FX_UNPINNED` / `FX_STALE`** | derived at read | any, on a mixed-currency event | the RFQ has no recorded rate for the foreign bid currency, or the rate is older than 7 days | the quote comparison header; the bids are shown as quoted |
| **Same-day commitment** | operator-raised (form) | before submit | a lead time of 0 days | the note and tick under the lead-time field; toast "Confirm the same-day commitment" if submitted unticked |
| **Awaiting Supplier Commercial** | derived handoff | Open events card | a supplier seat without `quotation:submit` | in the Submit quote button's slot (`handoff-quotation-submit`) |
| **Response deadline passed** | time-driven, derived at read (against the declared present, 31 Aug 2026) | Open events card | the event's response deadline is before the declared present | the card pill, and in the Submit quote button's slot for every seat: "The response deadline (…) has passed. Quotations are no longer taken on this event." (`rfq-deadline-passed`) |
| **Awaiting Procurement** | derived handoff | Submitted (buyer comparison) | a buyer seat without `quotation:review` | in the Move to review cell (`handoff-rfq-review`) |
| **Sample detail** | honesty marker | Open events card | always — delivery location, special requirements and channel on the card are illustrative | `/supplier/rfqs` card pill |
| **PARTLY REAL (provenance marker)** | honesty marker | page | always | the meta line: submit dispatches through the wired target against fixture RFQs |

<!-- src: src/pages-v2/SupplierRFQs.tsx:325-355; src/pages-v2/SupplierRFQs.tsx:700-737; src/pages-v2/SupplierRFQs.tsx:814-828; src/pages-v2/SupplierRFQs.tsx:1030-1060; src/pages-v2/BuyerSourcing.tsx:1459; src/lib/i18n/rfqs.ts:16-22; src/lib/i18n/rfqs.ts:127-130; src/lib/i18n/rfqs.ts:180-182; src/lib/i18n/sourcing.ts:99-108; src/lib/i18n/sourcing.ts:168-178; src/lib/i18n/roles.ts:38; src/lib/i18n/roles.ts:48; src/services/data/mock/MockCommandService.ts:589-595 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `qt-003a` (no separate number — seeded quotations are keyed by id; runtime ones by `QUO-2026-9xx`) — sup-001's offer on `rfq-003` (RFQ-2026-003), Under Review, IDR, one of three siblings.

| Joins to | By | Note |
|---|---|---|
| RFQ `rfq-003` / RFQ-2026-003 | `rfqId` | the event the offer answers; the total price was computed against its `totalQty` (12,000 KG × 44,500 = 534,000,000) |
| Supplier `sup-001` | `supplierId` | scope owner — the supplier sees only its own quotations; the buyer sees all; the award-integrity hook checks the awarded supplier against this field |
| Sibling quotations `qt-003b` (sup-002), `qt-003c` (sup-010) | same `rfqId` | the set the award fan-out splits into one Awarded and the rest Rejected |
| RFQ `awardedQuotationId` / `awardedSupplierId` | written by `t_rfq_award` | the winner is named on the RFQ; the quotation itself only changes state |
| RFQ `respondedSupplierIds` | fixture field on the RFQ | drives the buyer's "all responded" gate; not written by a quotation submit |
| RFQ `fxPins` | read at comparison time | only matters when the quotation's `currency` differs from a sibling's |
| `currency` | own field; absent = IDR | seeded quotations before the currency field are honestly silent and read as IDR; `qt-009a/b`, `qt-012b`, `qt-013b` carry USD |
| `unitPrice`, `leadTimeDays`, `moq`, `validUntil`, `paymentTermsOffered`, `notes`, `submittedAt` | raw facts written at creation | never edited afterwards — no revise verb |
| `complianceScore`, `reliabilityScore` | seeded per fixture; 50 on a runtime quotation | SIMULATED axes, passed through the buyer's engine and marked so |
| `priceScore`, `leadTimeScore`, `aiCompositeScore`, `aiRecommended` | fixture literals; 0 / false on a runtime quotation | derived by the buyer's comparison at read; the stored values are inert sentinels |

<!-- src: src/data/mockQuotations.ts:9-48; src/data/mockQuotations.ts:149-204; src/data/mockRfqs.ts:139-158; src/services/data/mock/MockCommandService.ts:611-672; src/services/data/mock/MockProcurementService.ts:331-343; src/services/data/rfqSourcingGate.ts:402-452; src/services/data/mock/stores/quotationStore.ts:84-87 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `supplier:<supplierId>` for the supplier's submit or `buyer:all` for the buyer's review, `ts`, `outcome` (`done` / `failed`), `correlationId` (`cmd_…`), and `causationId` on a cascaded event — the correlationId of the RFQ award that caused it. The two cascades run under the automation grant with a buyer scope, so their events read `actor` = `buyer:all` and carry no attribution. A `failed` event carries the refusal `reason`. Human acts carry the session's actor attribution, in this build always `UNATTRIBUTED: NO_PERSON_IN_SESSION`. Worked sequence for `qt-003a` and its siblings, as a tester would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | (seeded) `qt-003a`, `qt-003b`, `qt-003c` Under Review on RFQ-2026-003 | — | fixture, no event | — |
| T+1 | RFQ-2026-003: Open → Awarded (`awardedQuotationId` = `qt-003a`) | buyer · procurement (`buyer:all`) | tick **Award** on `qt-003a` → **Award to selected** | `t_rfq_award` |
| T+1 | `qt-003a`: Under Review → Awarded | automation (`buyer:all`, cascade) | fan-out of the award | `t_quotation_award` (`causationId` = the award's correlationId) |
| T+1 | `qt-003b`: Under Review → Rejected | automation (`buyer:all`, cascade) | fan-out of the award | `t_quotation_reject` (same `causationId`) |
| T+1 | `qt-003c`: Under Review → Rejected | automation (`buyer:all`, cascade) | fan-out of the award | `t_quotation_reject` (same `causationId`) |
| (a fresh offer) T+0′ | ∅ → Submitted (`QUO-2026-901` on RFQ-2026-011) | supplier · commercial (`supplier:sup-007`) | **Submit quote** → **Submit quotation** | `t_quotation_submit` |
| (a fresh offer) T+1′ | Submitted → Under Review | buyer · procurement (`buyer:all`) | **Move to review** | `t_quotation_review` |
| (a fresh offer) T+2′ | RFQ-2026-011: Open → Awarded; `QUO-2026-901` → Awarded | buyer · procurement, a named person | the board reads 2 / 2 the moment the offer lands; tick **Award** → **Award to selected** → **Yes, award** | `t_rfq_award`, then `t_quotation_award` |
| (a cancelled event) | RFQ-2026-002: Open → Cancelled; `qt-002a`, `qt-002b`: Under Review → Withdrawn | buyer · procurement, a named person; then automation (cascade) | **Cancel RFQ** → **Yes, cancel the event** | `t_rfq_cancel`, then `t_quotation_withdraw` ×2 (`causationId` = the cancel's correlationId) |

<!-- src: src/services/transitions/events.ts:26-61; src/services/transitions/events.ts:127-129; src/services/transitions/dispatcher.ts:453-532; src/services/transitions/dispatcher.ts:838-907; src/services/data/mock/MockCommandService.ts:2935-2953; src/pages-v2/BuyerSourcing.tsx:366-368; src/pages-v2/SupplierRFQs.tsx:786-796 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| "Submit quote" is replaced by "Awaiting Supplier Commercial" | a notice sits in the button's slot on the card | the supplier seat does not hold `quotation:submit` (fulfilment / back office) | a commercial seat submits; the identity panel shows the seat's lanes |
| The quote panel closed by itself | you were narrowing the seat while it was open | the panel is derived from the seat's authority and collapses when `quotation:submit` is lost | reopen from the card with a commercial seat |
| "Quotation not submitted — check the unit price" | toast names the price rule | blank, non-numeric, ambiguous ("1.500") or zero price | type digits only, e.g. 15000 |
| "Quotation not submitted — check the lead time" | toast names the lead-time rule | blank, non-numeric, ambiguous or fractional days | whole days (e.g. 14), or switch to weeks |
| "Confirm the same-day commitment" | toast after pressing submit with 0 days | the same-day tick is unticked | tick "I confirm this quotation offers same-day delivery." or enter a real lead time |
| "Quotation not submitted — check the minimum order quantity" | toast names the minimum rule | non-numeric, ambiguous or zero minimum | digits only, or leave blank for "same as RFQ qty" |
| "Required fields missing — Please fill: Quote valid until." | toast | the valid-until date is blank | set the date |
| "Quotation could not be submitted" with "“X” is not a currency Paragon accepts…" | toast names the currency and the permitted set | `quotation_submit_currency_permitted` refused (`POLICY_REJECTED`) — unreachable from the select, which only offers IDR / USD / EUR | choose one of the permitted currencies |
| "Quotation could not be submitted" with a scope message | "outside what your account may see" | the seat's supplier is not on the RFQ's invited list, or the payload names another supplier (`SCOPE_DENIED`) | only an invited supplier can quote; check the invitation |
| The RFQ is not in Open events | the tab is empty or lacks it | still Draft (unpublished); not invited; already quoted (moved to My Quotes); or the RFQ is Closed / Cancelled / Awarded (the tab shows Open only) | ask the buyer to publish; look under My Quotes or Awards & history |
| "Move to review" is missing on the buyer comparison | the Status cell shows a pill without the link | the quotation is not Submitted (already Under Review, Awarded or Rejected) | nothing to do; review is only from Submitted |
| "Move to review" is replaced by "Awaiting Procurement" | a notice in the Status cell | the buyer seat lacks `quotation:review` | a procurement seat does it |
| "Review failed" | toast with the refusal | `ILLEGAL_TRANSITION` — the quotation moved while the panel was open | reopen the RFQ panel |
| The quotation never becomes Awarded or Rejected | it stays Under Review for months | the RFQ has not been awarded or cancelled yet | the buyer awards from the RFQ (Open or Closed, any quotation received) or cancels it, which withdraws the quotation; there is no per-quotation decision |
| The quotation reads **Withdrawn** and the supplier did not withdraw it | My Quotes pill "Withdrawn"; Awards & history row *Event Cancelled* | Paragon cancelled the RFQ before any award (`t_quotation_withdraw`, a cascade) | nothing to do; no decision was made on the offer and it does not count in the win rate |
| A losing supplier's quote still says Under Review after an award | My Quotes tab | the cascade for that sibling was refused `ILLEGAL_TRANSITION` (already terminal) or the quotation id was not in the store at fan-out | read the audit sink for the award's `causationId`; not reachable from seeded data |
| "Decline RFQ" / "Ask question" do nothing | toasts "RFQ decline not available yet — … was not declined." / "Message not sent…" | not wired to any verb or channel | not a fault; use outside channels |
| "Response deadline passed" on a card, and no Submit quote | the card pill and the red line in the button's slot | the event's response deadline is before the declared present (31 Aug 2026) | nothing to submit on this event; the buyer can raise a new one. Seeded specimen: RFQ-2026-010 |
| "Quotation could not be submitted" with "The response deadline of this event has passed…" | toast | `quotation_submit_before_deadline` refused (`QUOTE_DEADLINE_PASSED`) — reachable when the deadline passes while the panel stands open, or by a hand-made dispatch | as above |
| "Quotation could not be submitted" with "This sourcing event is no longer open…" | toast | `quotation_submit_event_open` refused (`QUOTE_EVENT_NOT_OPEN`) — the buyer closed, cancelled or awarded the event while the panel stood open | ask the buyer; a Closed event can be reopened, a Cancelled or Awarded one cannot |
| "Quotation could not be submitted" with "You have already submitted a quotation on this event…" | toast | `quotation_submit_one_per_supplier` refused (`QUOTE_ALREADY_SUBMITTED`) | one quotation per supplier per event; it is not revised or replaced. Find it under My Quotes |
| "This date has already passed (today is 31 Aug 2026)…" under Quote valid until, and Submit quotation is greyed | the red line on the field | the valid-until date is before the declared present; the machine refuses the same (`QUOTE_VALIDITY_PAST`) | choose today or a later date |
| Step 3 says "No halal, BPOM or quality document is on file" | the line in the Compliance documents step | this supplier holds no document in those three categories | it does not stop the quotation; add them on My Documents |
| `STALE_STATE` | refusal names the expected and found states | a caller supplied `expectedState` and the document moved | no quotation screen supplies it today; re-open and decide again |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SRC`; where the surface checks first, the control reads *"Switched off — Sourcing & RFQ"* | the Sourcing & RFQ module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/lib/glossary/refusals.glossary.ts:32-130; src/pages-v2/SupplierRFQs.tsx:766-796; src/pages-v2/SupplierRFQs.tsx:830-1025; src/pages-v2/SupplierRFQs.tsx:1543; src/pages-v2/BuyerSourcing.tsx:1227-1258; src/pages-v2/BuyerSourcing.tsx:3688-3728; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/services/transitions/policies.ts:189-206; src/services/data/mock/MockCommandService.ts:618-622; src/services/data/mock/MockProcurementService.ts:299-328; src/lib/i18n/rfqs.ts:169-190 -->

<!-- section:testdata -->
## 9 · Test data

Fixtures are SIMULATED. Seeded quotations are keyed by id and have no separate number; a runtime quotation is numbered `QUO-2026-901`, `-902`… by the store. The seeded supplier persona is sup-007.

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Submitted | `qt-011a` | — | sup-005 on RFQ-2026-011 (`rfq-011`, Open): the one seeded quotation with **Move to review**. A fresh submit by sup-007 on `rfq-011` creates another; `rfq-010` is past its response deadline (28 Aug 2026) and refuses one |
| Under Review | `qt-001a`, `qt-001b`, `qt-001c`, `qt-002a`, `qt-002b`, `qt-003a`, `qt-003b`, `qt-003c`, `qt-004a`, `qt-004b`, `qt-005a`, `qt-005b`, `qt-009a`, `qt-009b`, `qt-012a`, `qt-012b`, `qt-013a`, `qt-013b` | — | on Open events RFQ-2026-001/002/003/009/012/013 and Closed events RFQ-2026-004/005. Awardable from the surface today: the three on `rfq-003` (IDR), the two on `rfq-009` (both USD), the two on `rfq-012` (IDR + USD, unpinned) and `rfq-013` (IDR + USD, stale pins). `qt-002a` and `qt-005a` are sup-007's own — visible under its My Quotes |
| Awarded | `qt-006a`, `qt-007a` | — | sup-001 on RFQ-2026-006; sup-005 on RFQ-2026-007 |
| Rejected | `qt-006b`, `qt-006c`, `qt-007b`, `qt-007c` | — | the losing siblings of the two awarded events; read as **Not Awarded** on the supplier's Awards & history |

<!-- src: src/data/mockQuotations.ts:50-578; src/data/mockRfqs.ts:91-531; src/services/data/mock/stores/quotationStore.ts:96-100; src/pages-v2/SupplierRFQs.tsx:163-195; _derived/guidefacts.json (quotation.fixtures) -->
