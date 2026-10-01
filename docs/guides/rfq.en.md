---
entity: rfq
locale: en
title: Request for quotation (sourcing event)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_rfq_create
  - t_rfq_publish
  - t_rfq_close
  - t_rfq_award
  - t_rfq_fx_pin
  - t_rfq_cancel
  - t_rfq_reopen
---

<!-- section:summary -->
## 1 · What this process is

A sourcing event: Paragon asks several suppliers for an offer on the same requirement, so the comparison is like for like. The RFQ is the buyer's document. It names what is being sourced (a title, a material category, one or more material codes, a total quantity and unit), who is invited, when responses are due, when the award is due, and on what commercial terms (Incoterms, payment terms, currency). Suppliers never edit it; they answer it with a quotation, which is a separate document with its own guide.

One role drives it end to end: Paragon's **buyer** (lane `procurement`) drafts the event, publishes it to the invited suppliers, records the exchange-rate basis when bids arrive in more than one currency, and finally awards it to one quotation, or cancels it. A closed event can be reopened by the same role. The supplier's **sales contact** (lane `commercial`) only sees the event once it is published, and only if invited; their act — submitting a quotation — is described in the quotation guide. Nobody presses the close step: it is declared as the response window ending and nothing in this build fires it.

It starts at **Draft**, becomes visible to suppliers at **Open**, and ends at **Awarded** or **Cancelled**, the two terminal states. **Closed** is the state the machine reserves for an elapsed response window; every Closed RFQ in this build is seeded, because the step that would produce one has no caller. Awarding fans out onto the quotations under the platform's automation grant: the chosen quotation becomes Awarded and every other quotation on the same event becomes Rejected, in the same act.

Honesty markers a reader needs before using this guide. The demo RFQs and quotations are **SIMULATED** fixtures; the declared present the buyer board measures deadlines against is **31 Aug 2026**, and every response deadline in the fixture file falls before it, so the seeded Open events all read as overdue — the one exception is the Draft the platform raises for itself at boot, whose deadline is in November 2026. An award records the winning quotation and supplier on the RFQ and **mints nothing downstream** — no purchase order, no contract; the supplier's award tab honestly shows "PO issued —". An exchange-rate pin is recorded with liveness `SIMULATED` whether typed by hand or labelled as an SAP rate, because no rate feed is connected. Every human act is recorded without a named person (`UNATTRIBUTED: NO_PERSON_IN_SESSION`). The two rules that gate publication — invitee eligibility and the competition floor — are real and refuse at the machine; the exemption that lifts the floor is read from the preferred-supplier list, which is itself seeded at boot.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | operator action (creation); cascades to the requisition it was raised from | buyer · procurement | `t_rfq_create` |
| 2 | Draft → Open | operator action; two policy checks | buyer · procurement | `t_rfq_publish` |
| 3 | Open → Closed | declared computed (response window ends) — no caller | automation | `t_rfq_close` |
| 4 | Open, Closed → Awarded | operator action; cascades to the quotations | buyer · procurement | `t_rfq_award` |
| 5 | Open, Closed → same state | records a fact (state-preserving): the exchange-rate basis | buyer · procurement | `t_rfq_fx_pin` |
| 6 | Draft, Open, Closed → Cancelled | operator action (exception) | buyer · procurement | `t_rfq_cancel` |
| 7 | Closed → Open | operator action (exception) | buyer · procurement | `t_rfq_reopen` |

<!-- src: src/services/transitions/flows/rfq.flow.ts:20-196; src/services/transitions/cascades.ts:54-60 -->

**Forks**

- **At Draft:** `t_rfq_publish` — procurement — when the invited list is settled and the event should go in front of the suppliers; `t_rfq_cancel` — procurement — when the requirement or the budget went away before anyone was asked.
- **At Open:** `t_rfq_award` — procurement — when every invited supplier has answered and one quotation is chosen; `t_rfq_fx_pin` — procurement — when bids arrived in more than one currency and the comparison needs a recorded rate (the RFQ stays Open); `t_rfq_cancel` — procurement — when the event is called off before an award; `t_rfq_close` — automation — declared for the response deadline elapsing, fired by nothing today.
- **At Closed:** `t_rfq_reopen` — procurement — when more responses are wanted or the requirement moved; `t_rfq_award` — procurement — legal in the machine, but the buyer surface offers the award panel only on an Open event, so in practice reopen comes first; `t_rfq_fx_pin` — procurement — a rate may still be recorded (the RFQ stays Closed); `t_rfq_cancel` — procurement — when the closed event will not be awarded.

<!-- section:steps -->
## 3 · Step by step

### t_rfq_create — Save an RFQ draft <!-- transition:t_rfq_create -->

- **Step kind:** operator action (creation); cascade source (`t_pr_source` on the requisition it was raised from, when one was chosen)
- **Role:** buyer · procurement (atom `rfq:create`)
- **From → to:** ∅ → Draft
- **Operator — where:** `/buyer/sourcing` ("Sourcing & RFQ") → header button **New RFQ** → the four-step wizard **Define Scope** · **Invite Suppliers** · **Terms & Deadlines** · **Review & Submit** → **Save RFQ draft**. A seat without `rfq:create` sees "Awaiting Procurement" in the button's slot instead of the button.
- **Operator — do:** Buying starts shaping a request — what is needed, in what category, how much — while it is still internal. Step 1: optionally pick an approved requisition under "Raise from requisition" (it fills what it can; the review step lists what was "Not carried over"), type the RFQ title, choose the material category, tick the specific material(s), type the total quantity (digits only — "e.g. 2400") and unit, and optionally an estimated budget in IDR. Step 2: tick the suppliers to invite; the step refuses to advance while the invited set would fail publication (an ineligible invitee, or fewer than two eligible invitees without an exemption) and the same notice the publish step will give is shown here, while the list is still editable. Step 3: response deadline, award deadline (must be after the response deadline), Incoterms, payment terms, currency. Step 4: review and press Save RFQ draft. Toast: "RFQ-2026-9xx saved as a draft · Not sent yet — publish to open it to N invited suppliers".
- **Operator — fill:** the title (`title`), the material category (`materialCategory`) and the total quantity (`totalQty`) are required by the machine; the wizard additionally requires at least one material, a valid invited set, and both deadlines. The quantity and the budget go through one parser: a blank quantity, a non-number, or an ambiguous "2.400" is refused with its own message; a blank budget is stored as absent ("Not specified"), never as Rp 0.
- **Tester — expected state:** Draft
- **Tester — confirm:** the new row appears on the board (visible under the **All** tab only — Draft matches no other group), with a store-assigned number in the `RFQ-2026-9xx` range and status pill **Draft**; opening it shows **Publish RFQ** and **Cancel RFQ** under "Lifecycle actions" and the preferred-supplier gate notice for the event. On the supplier side nothing appears yet: the supplier read excludes Draft. If a requisition was chosen, `/buyer/purchase-requisition` now shows that requisition in **Sourcing Event** with the new RFQ number as its linked document.
- **Tester — trigger event:** `t_rfq_create` (and, when raised from an approved requisition, a cascaded `t_pr_source` on the requisition with `causationId` = the create's correlationId)
- **Checks that can refuse:** none beyond role, legality and required fields. Scope: RFQ creation is a buyer act — a supplier seat is refused `SCOPE_DENIED` before the role gate, because the RFQ target has no supplier owner. The wizard's own gates stop most bad input first: an unreadable quantity produces "RFQ not created — check the numbers".
- **Glossary:** `MISSING_FIELDS`, `SCOPE_DENIED`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Honesty:** Saving does not send anything — the label used to read as if it did and was corrected. The invited list is written once, at creation; no verb adds or removes an invitee afterwards, which is why the wizard refuses an unpublishable set at step 2 rather than letting publish refuse it later. A material picked without a master code puts no code on the event: the event then cannot be checked for a preferred-supplier exemption and will require competitive bidding (the wizard says so and offers to raise a material request after the RFQ exists). The platform itself raises one Draft through this verb at boot — `RFQ-2026-901`, the material-request seed's event — which is why a fresh session already shows a Draft that is not in the fixture file.
<!-- src: src/services/transitions/flows/rfq.flow.ts:58-67; src/pages-v2/BuyerSourcing.tsx:1067-1069; src/pages-v2/BuyerSourcing.tsx:1660-1698; src/pages-v2/BuyerSourcing.tsx:1699-1760; src/pages-v2/BuyerSourcing.tsx:2676-2723; src/pages-v2/sourcing/rfqCreateModel.ts:363-463; src/services/query/commandHooks.ts:355-370; src/services/data/mock/MockCommandService.ts:535-586; src/services/data/mock/MockCommandService.ts:2893-2934; src/services/transitions/cascades.ts:54-56; src/services/transitions/flows/purchaseRequisition.flow.ts:162-176; src/services/data/mock/MockProcurementService.ts:299-328; src/lib/i18n/sourcing.ts:17-20; src/lib/i18n/sourcing.ts:236-274; src/lib/i18n/sourcing.ts:401-415; src/services/data/mock/materialRequestSeed.ts:76-85; src/services/data/mock/materialRequestSeed.ts:183-190; src/main.tsx:99-108 -->

### t_rfq_publish — Publish the RFQ <!-- transition:t_rfq_publish -->

- **Step kind:** operator action
- **Role:** buyer · procurement (atom `rfq:publish`)
- **From → to:** Draft → Open
- **Operator — where:** `/buyer/sourcing` → open the Draft → "Lifecycle actions" → **Publish RFQ**. A seat without the atom sees "Awaiting Procurement" in that slot (`handoff-rfq-publish`); the slot exists only on a Draft.
- **Operator — do:** Puts the request in front of the invited suppliers. Nothing is visible to them before this, so it is the moment sourcing actually begins. Read the gate notice on the panel first — it says whether the event needs competitive bidding, whether it sits exactly at the floor ("Two eligible suppliers invited. Three is the standard for a competitive event."), or whether preferred-supplier standing could not be checked — then press Publish RFQ. Toast: "RFQ-… published · Now open to N invited suppliers."
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Open
- **Tester — confirm:** the pill reads **Open** and the row moves from the All-only Draft into the **Open** tab (or **Pending Award** if the fixture already records every invitee as responded); the panel's "Lifecycle actions" now show only **Cancel RFQ**; the timeline's "Sent to N suppliers" step completes. On the supplier side, each invited supplier's `/supplier/rfqs` ("My Sourcing Events") → **Open events** now lists the event with **Submit quote**.
- **Tester — trigger event:** `t_rfq_publish`
- **Checks that can refuse:** two hooks, evaluated in this order. `rfq_publish_invitees_eligible` — every invited supplier must be in a state that may be invited; today the only refusing status is **Suspended** (Onboarding suppliers may bid), and a supplier id the roster does not hold is neither refused nor counted. Refusal reads `INVITEE_NOT_ELIGIBLE: <supplier id> (Suspended) may not be invited to a sourcing event`. `rfq_publish_competition` — after eligibility, the event must have at least **2 eligible** invitees unless an exemption applies; an in-force **Mandatory** or **Sole Source** preferred-supplier listing held by any invited supplier for any material on the event removes the requirement. Refusal reads `COMPETITION_UNDER_FLOOR: N eligible supplier(s) invited, a competitive event needs at least 2`. Exactly two is allowed with the note that three is the standard; an event whose material codes no listing knows is not refused — the exemption is undecidable and the event simply competes.
- **Glossary:** `INVITEE_NOT_ELIGIBLE`, `COMPETITION_UNDER_FLOOR`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Publication is what exposes the event; it changes no other field. There is no value threshold anywhere in the tree, so every non-exempt event needs competition regardless of value. `rfq-008` (RFQ-2026-008) is a Draft with no invitees and is deliberately kept as the specimen of a draft that cannot be published — the refusal is `COMPETITION_UNDER_FLOOR` with 0 eligible, and no verb can add an invitee to it. `rfq-014` (RFQ-2026-014) publishes with the notice that competitive bidding is not required, because sup-005 holds an in-force Mandatory listing for `AI-NIAC-6601` and is invited. The exemption is decided the same whether or not the listing has been published to the supplier; the notice separately says whether the supplier has been told.
<!-- src: src/services/transitions/flows/rfq.flow.ts:84-96; src/services/transitions/policies.ts:957-997; src/services/data/rfqSourcingGate.ts:82-118; src/services/data/rfqSourcingGate.ts:171-185; src/services/data/rfqSourcingGate.ts:252-287; src/services/data/rfqSourcingGate.ts:318-365; src/pages-v2/BuyerSourcing.tsx:1265-1314; src/pages-v2/BuyerSourcing.tsx:3175-3183; src/pages-v2/BuyerSourcing.tsx:3308-3326; src/components/v2-features/PslGateNotice.tsx:79-162; src/lib/i18n/psl.ts:103-112; src/lib/i18n/sourcing.ts:217-218; src/lib/i18n/sourcing.ts:406-411; src/services/data/mock/MockProcurementService.ts:299-328; src/data/mockRfqs.ts:243-262; src/data/mockRfqs.ts:471-530; src/data/mockSuppliers.ts:361-368; src/services/data/mock/pslSeed.ts:209-218; src/lib/glossary/refusals.glossary.ts:244-252 -->

### t_rfq_close — Response window ends (declared, not fired) <!-- transition:t_rfq_close -->

- **Step kind:** not active (no caller) — declared computed
- **Role:** automation (atom `rfq:close`; no human lane holds it)
- **From → to:** Open → Closed
- **Operator — where:** not offered anywhere today. Nobody presses this in the portal, and nothing in the platform fires it either.
- **Operator — do:** The response window ends. Late offers are not compared, which is what makes the comparison fair to everyone who answered on time. In the machine this is the award deadline elapsing; it is modelled as a system step because a clock may not sit inside a transition table (law 0.5) — and no scheduler or boundary event is wired to raise it.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Closed — not reachable from Open in this build.
- **Tester — confirm:** no Open RFQ ever becomes Closed on its own; the two Closed fixtures (`rfq-004`, `rfq-005`) were seeded Closed. The buyer board's deadline column shows "Nd overdue" on every seeded Open event at the declared present, and the status stays **Open**. The panel timeline renders a "Closed" step for a Closed or Cancelled event only.
- **Tester — trigger event:** `t_rfq_close` (never fires today)
- **Checks that can refuse:** none beyond role, legality and required fields — and the role is the automation grant, which no person can hold.
- **Glossary:** none specific; the process-flows page marks the step as computed.
- **Honesty:** Because nothing closes an event, the eight seeded Open RFQs can only leave Open by a person awarding or cancelling them. The overdue reading is derived at read against the declared present (31 Aug 2026) and is never stored; it does not change the state. The flow file's own comment says the surface offers Award "from Open AND Closed" because of this gap — measured, the award panel renders only on an Open event (see the award step), so a Closed fixture is reopened first.
<!-- src: src/services/transitions/flows/rfq.flow.ts:100-117; _derived/surfaces.md:25; src/pages-v2/BuyerSourcing.tsx:2902-2918; src/pages-v2/BuyerSourcing.tsx:632-660; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/data/mockRfqs.ts:159-198 -->

### t_rfq_award — Award to the selected quotation <!-- transition:t_rfq_award -->

- **Step kind:** operator action; cascade source (`t_quotation_award` on the winner, `t_quotation_reject` on every other quotation of the event)
- **Role:** buyer · procurement (atom `rfq:award`)
- **From → to:** Open, Closed → Awarded (the surface offers it from Open only)
- **Operator — where:** `/buyer/sourcing` → open the RFQ → "Quote comparison" → tick **Award** on one quotation's column → the "Award action" section → **Award to selected**. The section appears only when the RFQ is Open, every invited supplier is recorded as having responded, and at least one quotation exists; until a quotation is ticked it reads "Select a quote above to enable the award action." A seat without `rfq:award` sees "Awaiting Procurement" in the button's slot (`handoff-rfq-award`).
- **Operator — do:** Buying picks the winning offer and records why. Everyone who bid learns where they stand, in one act rather than by rumour. Compare the quotations on the criteria rows (unit price, total price, lead time — tagged "Estimated" —, minimum order quantity, payment terms, compliance, scores, composite), note the "Top-ranked" column, tick the chosen one and press Award to selected. Toast: "RFQ-… awarded · <supplier> awarded — other quotations rejected."
- **Operator — fill:** nothing to type; the tick supplies the two required fields, the quotation id (`awardedQuotationId`) and its supplier (`awardedSupplierId`).
- **Tester — expected state:** Awarded
- **Tester — confirm:** the panel closes; the row moves to the **Awarded** tab and "Awards History" lists it with the awarded supplier; reopening the panel shows the "Award summary" (Awarded to, Awarded value, Award date, PO issued) and no lifecycle actions. The quotations re-derive in the same read: the chosen one reads **Awarded**, every sibling **Rejected**. On the supplier side, `/supplier/rfqs` → **Awards & history** shows "Awarded — your quotation was selected" for the winner and "Not awarded — another quotation was selected" for the others, with "PO issued —".
- **Tester — trigger event:** `t_rfq_award`, followed by one `t_quotation_award` and N−1 `t_quotation_reject` events whose `causationId` is the award's correlationId
- **Checks that can refuse:** `rfq_award_awardee_integrity` — the quotation named must have been submitted by the supplier named, and that supplier must be on the invited list. Refusals read `AWARDEE_NOT_THE_QUOTING_SUPPLIER: the award names <supplier>, but <quotation> was submitted by <other supplier>` (or "(no such quotation)") and `AWARDEE_NOT_INVITED: <supplier> was not invited to this event`. The surface always sends a matching pair, so these bite only a hand-crafted dispatch; the toast then reads "Award failed" with the glossary remedy.
- **Glossary:** `AWARDEE_NOT_THE_QUOTING_SUPPLIER`, `AWARDEE_NOT_INVITED`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`, `FX_UNPINNED`, `FX_STALE`.
- **Honesty:** The award records the chosen quotation and supplier on the RFQ and **mints no purchase order and no contract**; the supplier's "PO issued" column is honestly "—", and "Award date" on the supplier side is the RFQ's award deadline, not the moment of the act. The award section's condition does not read the exchange-rate verdict: a mixed-currency event whose comparison says "Not ranked" can still be awarded, on quotations shown as quoted. "All suppliers responded" is read from the RFQ's own responded list, which the supplier's live quotation submit does **not** update — so an event answered at runtime does not become awardable through that path (a registered finding). A Closed event has no award panel and is reopened first. The cascade re-dispatches under the automation grant inside a best-effort `catch {}`; a sibling already in a terminal state is refused `ILLEGAL_TRANSITION` — recorded, never breaking the award.
<!-- src: src/services/transitions/flows/rfq.flow.ts:123-136; src/services/transitions/policies.ts:1000-1023; src/services/data/rfqSourcingGate.ts:402-452; src/pages-v2/BuyerSourcing.tsx:366-368; src/pages-v2/BuyerSourcing.tsx:1181-1226; src/pages-v2/BuyerSourcing.tsx:3728-3794; src/pages-v2/SupplierRFQs.tsx:163-195; src/pages-v2/SupplierRFQs.tsx:786-796; src/services/query/commandHooks.ts:386-406; src/services/data/mock/MockCommandService.ts:485-500; src/services/data/mock/MockCommandService.ts:2935-2953; src/services/transitions/cascades.ts:57-60; src/services/transitions/dispatcher.ts:838-907; src/lib/i18n/sourcing.ts:94-99; src/lib/i18n/sourcing.ts:209-214; src/lib/i18n/sourcing.ts:380-386; src/lib/i18n/rfqs.ts:73-84; src/lib/glossary/refusals.glossary.ts:253-259 -->

### t_rfq_fx_pin — Record the exchange-rate basis <!-- transition:t_rfq_fx_pin -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · procurement (atom `rfq:fx-pin`, deliberately distinct from `rfq:award`)
- **From → to:** Open, Closed → same state
- **Operator — where:** `/buyer/sourcing` → open the RFQ → "Exchange rate basis" (inside the quote comparison) → **Record USD rate** (or **Supersede USD rate** when one is in force) → dialog "Record the USD exchange rate" / "Supersede the USD exchange rate" → **Record rate** / **Record new rate**. A seat without `rfq:fx-pin` sees "Awaiting Procurement" beside the dialog's Cancel button (`handoff-rfq-fxpin`).
- **Operator — do:** Records the exchange basis foreign offers are being compared on, so a decision taken today can still be explained a year from now. When the comparison refuses to rank — "Not ranked — quotes are priced in USD and no exchange rate has been recorded for this RFQ" or "… the recorded exchange rate for USD (as of <date>) is older than this comparison allows" — open the dialog, type the rate as "IDR per 1 USD" (digits only, e.g. 17250), give the date the rate was true, choose the source (**Entered manually** or **SAP exchange rate**, the latter with an optional SAP rate type), and confirm. Toast: "USD rate recorded · The comparison now ranks against it." or "New USD rate recorded · The previous rate is kept on the RFQ; comparisons now use the new one."
- **Operator — fill:** the currency being converted (`quote`: USD or EUR — never IDR, the base), the rate (`rate`, a finite number above zero), the rate date (`asOf`, a readable date not in the future) and the source (`source`: `MANUAL` or `SAP_EXHGRATE`). The dialog disables its own button on a blank, non-numeric, ambiguous ("17.250"), zero, empty-date, unreadable-date or future-date entry, each with its own message.
- **Tester — expected state:** unchanged (Open stays Open; Closed stays Closed)
- **Tester — confirm:** the "Exchange rate basis" block now shows the rate, "as of <date>", the source, and — after a supersede — "1 earlier rate kept"; the comparison ranks and the "Top-ranked" column appears. Use `rfq-012` (RFQ-2026-012: one IDR bid, one USD bid, no pin) to see `FX_UNPINNED` and then record a rate; use `rfq-013` (RFQ-2026-013: two pins dated 9 and 16 May 2026) to see `FX_STALE` at the declared present and supersede it.
- **Tester — trigger event:** `t_rfq_fx_pin`
- **Checks that can refuse:** `rfq_fx_pin_well_formed` — the quote currency must be a permitted bid currency (IDR, USD, EUR) and not the base IDR ("IDR is the comparison base — it has no rate to pin"); the rate must be a finite number greater than 0; `asOf` must be a readable date; `source` must be `MANUAL` or `SAP_EXHGRATE`. Every branch is already refused by the dialog; the hook is the structural twin.
- **Glossary:** `FX_UNPINNED`, `FX_STALE`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`, `POLICY_REJECTED`.
- **Honesty:** A pin is **appended, never edited**: the ledger on the RFQ keeps every rate ever recorded, the one in force is derived as the most recently recorded for that currency, and "Supersede" is the only way to move a rate. Staleness is measured from the rate's own date, not from when it was pinned: a rate older than **7 days** at the moment of reading refuses `FX_STALE`, which is why `rfq-013`'s seeded pins are stale by design and the ranked outcome is reached by recording a current rate. Every pin — manual or labelled SAP — is stored with liveness `SIMULATED`; no rate feed is connected. The recorded-at timestamp is store-assigned. A single-currency event never needs a pin.
<!-- src: src/services/transitions/flows/rfq.flow.ts:156-170; src/services/transitions/policies.ts:208-248; src/pages-v2/BuyerSourcing.tsx:1128-1180; src/pages-v2/BuyerSourcing.tsx:3898-3978; src/pages-v2/sourcing/fxRateInput.ts:39-76; src/services/query/commandHooks.ts:413-456; src/services/data/mock/MockCommandService.ts:501-532; src/lib/fxPin.ts:100-140; src/lib/currencyPolicy.ts:38-49; src/lib/currencyPolicy.ts:60-80; src/lib/quoteScore.ts:246-270; src/lib/i18n/sourcing.ts:100-167; src/data/mockRfqs.ts:355-470; src/lib/glossary/refusals.glossary.ts:155-165 -->

### t_rfq_cancel — Cancel the RFQ <!-- transition:t_rfq_cancel -->

- **Step kind:** operator action (exception path)
- **Role:** buyer · procurement (atom `rfq:cancel`)
- **From → to:** Draft, Open, Closed → Cancelled
- **Operator — where:** `/buyer/sourcing` → open the RFQ → "Lifecycle actions" → **Cancel RFQ** (offered on Draft, Open and Closed; absent on Awarded and Cancelled). A seat without the atom sees "Awaiting Procurement" in that slot (`handoff-rfq-cancel`).
- **Operator — do:** Buying calls the event off before picking anyone — the requirement changed, or the budget went. Press Cancel RFQ; there is no confirmation step and no reason field. Toast: "RFQ-… cancelled · The sourcing event was cancelled."
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Cancelled
- **Tester — confirm:** the panel closes; the row appears under the **Closed** tab (the tab groups Closed and Cancelled together) with pill **Cancelled**; reopening shows no lifecycle actions and the timeline's "Closed" step. No fixture is seeded Cancelled, so cancel one of the Drafts (`rfq-008`) or an Open event to see it.
- **Tester — trigger event:** `t_rfq_cancel`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** The purpose sentence says the suppliers "get told rather than left waiting"; in this build nothing tells them. Cancel has no cascade: the quotations on a cancelled event keep their state, so a supplier's quote still reads **Under Review** in "My Quotes", and the cancelled event simply leaves their Open events list (that tab shows Open only). A Draft that was never published can be cancelled without any supplier ever having seen it.
<!-- src: src/services/transitions/flows/rfq.flow.ts:173-182; src/pages-v2/BuyerSourcing.tsx:1318-1350; src/pages-v2/BuyerSourcing.tsx:3278-3290; src/pages-v2/BuyerSourcing.tsx:3348-3363; src/pages-v2/BuyerSourcing.tsx:883-892; src/services/query/commandHooks.ts:477-494; src/services/transitions/cascades.ts:24-86; src/pages-v2/SupplierRFQs.tsx:1543; src/lib/i18n/sourcing.ts:219-220; src/lib/i18n/sourcing.ts:391-395 -->

### t_rfq_reopen — Reopen a closed RFQ <!-- transition:t_rfq_reopen -->

- **Step kind:** operator action (exception path)
- **Role:** buyer · procurement (atom `rfq:reopen`)
- **From → to:** Closed → Open
- **Operator — where:** `/buyer/sourcing` → **Closed** tab → open the RFQ → "Lifecycle actions" → **Reopen RFQ** (offered on Closed only; state-exclusive with Publish). A seat without the atom sees "Awaiting Procurement" in that slot (`handoff-rfq-reopen`).
- **Operator — do:** Reopens a finished event for further responses — too few answers, or a requirement that moved. It reuses the request rather than starting a new one. Press Reopen RFQ. Toast: "RFQ-… reopened · The sourcing event is open for responses again."
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Open
- **Tester — confirm:** the panel closes; the row leaves the Closed tab for **Open** or **Pending Award** (both seeded Closed events record every invitee as responded, so they land in Pending Award); reopening the panel now offers Cancel RFQ and, because every invitee has responded, the "Award action" section. The invited suppliers see the event again under Open events unless they already quoted it (a quoted event is pruned from that tab).
- **Tester — trigger event:** `t_rfq_reopen`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Reopening does not move the response or award deadlines — both stay as authored (March 2026 on the two fixtures), so a reopened event reads as overdue immediately. Because the surface awards from Open only, reopening is the practical route to awarding a Closed fixture (`rfq-004` RFQ-2026-004, `rfq-005` RFQ-2026-005).
<!-- src: src/services/transitions/flows/rfq.flow.ts:185-194; src/pages-v2/BuyerSourcing.tsx:1352-1385; src/pages-v2/BuyerSourcing.tsx:3328-3347; src/pages-v2/BuyerSourcing.tsx:883-892; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/services/query/commandHooks.ts:521-536; src/pages-v2/SupplierRFQs.tsx:786-796; src/data/mockRfqs.ts:159-198; src/lib/i18n/sourcing.ts:221-222; src/lib/i18n/sourcing.ts:396-400 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Publish or cancel (at Draft).** Branch A — `t_rfq_publish` — **When:** the invited set passes both gates (no Suspended invitee; at least two eligible invitees, or an in-force Mandatory / Sole Source listing on an invited supplier for a material of the event). Branch B — `t_rfq_cancel` — **When:** the requirement went away, or the draft can never be published — `rfq-008` has no invitees and no verb can add one, so cancel is its only exit.
- **Award, pin, cancel or wait (at Open).** Branch A — `t_rfq_award` — **When:** every invited supplier is recorded as responded and one quotation is chosen; the winner and the losers are decided in the same act. Branch B — `t_rfq_fx_pin` — **When:** the comparison refuses `FX_UNPINNED` or `FX_STALE`; the RFQ stays Open and the pin is appended. Branch C — `t_rfq_cancel` — **When:** the event is abandoned before award. Branch D — `t_rfq_close` — **When:** the response window ends; declared, and fired by nothing, so an Open event waits for a person.
- **Reopen, award, pin or cancel (at Closed).** Branch A — `t_rfq_reopen` — **When:** more responses are wanted, or the buyer wants to award (the award panel is Open-only on the surface). Branch B — `t_rfq_award` — legal in the machine from Closed; not offered on the buyer surface. Branch C — `t_rfq_fx_pin` — **When:** a rate is recorded on a Closed event; the state is preserved. Branch D — `t_rfq_cancel` — **When:** the closed event will not be awarded.
- **The award fan-out.** After `t_rfq_award` succeeds, the platform dispatches `t_quotation_award` for the chosen quotation and `t_quotation_reject` for every other quotation on the event, under the automation grant. A sibling that is already Awarded or Rejected is refused `ILLEGAL_TRANSITION` and the refusal is recorded with the award's `causationId`; the award itself is never undone by a failed sibling.
- **The requisition cascade.** After `t_rfq_create` succeeds with a `sourceRequisitionId`, the platform dispatches `t_pr_source` on that requisition. **When** the requisition is Approved it moves to Sourcing Event with the new RFQ number as its linked document; **when** it is in any other state the cascade is refused `ILLEGAL_TRANSITION` and recorded; **when** no requisition was chosen (the common case) nothing is dispatched.
- **The competition floor is a wizard gate too.** The same decision the publish hooks take is rendered on wizard step 2 and on the panel: an ineligible invitee or fewer than two eligible invitees stops the step from advancing (the checkboxes stay live so the set can be corrected); exactly two advances with the note that three is the standard; an exempt event advances with one invitee.

<!-- src: src/services/transitions/flows/rfq.flow.ts:20-196; src/pages-v2/BuyerSourcing.tsx:1660-1698; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/services/data/mock/MockCommandService.ts:2893-2956; src/services/transitions/dispatcher.ts:838-907; src/services/data/rfqSourcingGate.ts:318-365 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| **Deadline: "Nd overdue" / "Due today" / "Nd remaining"** | time-driven, derived at read (against the declared present, 31 Aug 2026) | Open (any non-terminal row) | the response deadline is before / on / after the declared present; every seeded Open event reads overdue | buyer board "Response deadline" column, coloured by proximity; KPI "Awaiting Response — Deadline within 7 days" |
| **"N days remaining" (urgent under 7)** | time-driven, derived at read (against the browser clock, clamped at 0) | Open, on the supplier's cards | days to the response deadline; a past deadline renders "0 days remaining" | `/supplier/rfqs` → Open events → card pill |
| **Pending Award / Ready to Award** | derived | Open | every invited supplier is recorded in the RFQ's responded list | buyer board tab **Pending Award**; KPI "Ready to Award — All suppliers responded"; the "Award action" section |
| **Competitive bidding is not required** | derived (preferred-supplier list, in force at the declared present) | Draft (wizard step 2, panel), Open | an invited supplier holds an in-force Mandatory or Sole Source listing for a material of the event | `PslGateNotice` on the panel and in the wizard, naming supplier, status and code, and whether the supplier was informed |
| **At the floor** | derived | Draft | exactly two eligible invitees | the same notice: "Two eligible suppliers invited. Three is the standard for a competitive event." |
| **Under the floor / ineligible invitee** | derived, refused at publish | Draft | fewer than two eligible invitees; a Suspended invitee | the notice (wizard step 2 cannot advance); toast "Publish failed" with the remedy |
| **Standing could not be checked** | derived | Draft, Open | the event's material codes are unknown to every listing (or the event carries no code) | the notice: "…could not be checked for this event: <codes>. It will be competed as usual." |
| **Not ranked — `FX_UNPINNED` / `FX_STALE`** | derived at read | Open, Closed | bids in more than one currency with no recorded rate, or a rate older than 7 days | the quote comparison header; "Exchange rate basis" block with **Record / Supersede rate** |
| **Estimated** (lead time) | honesty marker | any | always, on the lead-time row | quote comparison "Lead Time" row tag: "Indicative at quote stage — the supplier confirms a firm delivery date at PO." |
| **Simulated** (compliance, reliability) | honesty marker | any | always, on the two externally-sourced score rows | quote comparison: "Rehearsal — awaiting a live source (compliance & reliability data)" |
| **Awaiting Procurement** | derived handoff | wherever a verb is legal but the seat lacks its atom | a seat without `rfq:create` / `rfq:publish` / `rfq:reopen` / `rfq:cancel` / `rfq:award` / `rfq:fx-pin` opens the surface | in the button's own slot (`handoff-rfq-create`, `-publish`, `-reopen`, `-cancel`, `-award`, `-fxpin`) |
| **PARTLY REAL (provenance marker)** | honesty marker | page | always | the meta line under the page title: the award dispatches through the wired target over a fixture RFQ set |

<!-- src: src/pages-v2/BuyerSourcing.tsx:192; src/pages-v2/BuyerSourcing.tsx:366-368; src/pages-v2/BuyerSourcing.tsx:883-892; src/pages-v2/BuyerSourcing.tsx:2724-2758; src/pages-v2/BuyerSourcing.tsx:2902-2918; src/pages-v2/SupplierRFQs.tsx:700-737; src/pages-v2/SupplierRFQs.tsx:1502; src/components/v2-features/PslGateNotice.tsx:79-162; src/lib/i18n/psl.ts:103-112; src/lib/i18n/sourcing.ts:25-32; src/lib/i18n/sourcing.ts:100-123; src/lib/i18n/sourcing.ts:168-178; src/lib/i18n/roles.ts:26; src/lib/i18n/roles.ts:48 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `rfq-003` (RFQ-2026-003, "Halal Glycerin 99.5% Kosher — Annual contract") — Open, three invited, three responded, three quotations Under Review, all in IDR: the one seeded event where the award panel is reachable without any preparation.

| Joins to | By | Note |
|---|---|---|
| Quotations `qt-003a` (sup-001), `qt-003b` (sup-002), `qt-003c` (sup-010) | `Quotation.rfqId` = `rfq-003` | the award fan-out reads this set from the store: the ticked one becomes Awarded, the other two Rejected |
| Suppliers `sup-001`, `sup-002`, `sup-010` | `invitedSupplierIds` | written once at creation; publication makes the event visible to exactly these ids; sup-010 is Onboarding and still eligible |
| `respondedSupplierIds` | fixture field | drives "all responded" on the buyer board; not updated by a runtime quotation submit (display-only in that sense) |
| Materials `RM-EMUL-3310`, `RM-EMUL-3320` | `materialIds` | real material-master codes; the preferred-supplier exemption is looked up by these — no listing names them, so the event competes |
| Preferred-supplier listings | supplier × material code, in force at the declared present | read by the publish gate and the panel notice; seeded at boot, not on this RFQ |
| `awardedQuotationId`, `awardedSupplierId` | written by `t_rfq_award` | award metadata only; nothing downstream is created |
| `fxPins` | appended by `t_rfq_fx_pin` | absent on this RFQ (single currency); present on `rfq-013` (two pins) |
| `estimatedValue`, `incoterms`, `paymentTerms`, `currency` (`IDR`), `responseDeadline`, `awardDeadline`, `buyerId` | fixture / wizard fields | display-only after creation — no verb edits an RFQ's terms, materials or invitees |
| Purchase requisition (optional) | `sourceRequisitionId` in the create payload → `PurchaseRequisition.linkedDoc` | only for an RFQ raised from an approved requisition; `rfq-003` has none |

<!-- src: src/data/mockRfqs.ts:49-89; src/data/mockRfqs.ts:139-158; src/data/mockQuotations.ts:149-204; src/services/data/mock/stores/quotationStore.ts:84-87; src/services/data/mock/MockCommandService.ts:485-532; src/services/data/mock/MockCommandService.ts:2893-2956; src/services/data/rfqSourcingGate.ts:252-287; src/pages-v2/SupplierRFQs.tsx:786-796 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` for a buyer seat (every RFQ verb is a buyer verb), `ts`, `outcome` (`done` / `failed`), `correlationId` (`cmd_…`), and `causationId` on a cascaded event — the correlationId of the command that caused it. The award fan-out runs under the automation grant with the same buyer scope, so its events also carry `actor` = `buyer:all`, distinguishable from the award only by their `causationId` and by the absence of an attribution. A `failed` event carries the refusal `reason`. Human acts also carry the session's actor attribution, which in this build is always `UNATTRIBUTED: NO_PERSON_IN_SESSION`. Worked sequence for `rfq-003`, as a tester would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | (seeded) Open; three quotations Under Review | — | fixture, no event | — |
| T+1 | Open → Open (state preserved) | buyer · procurement (`buyer:all`) | not needed here — single currency; on `rfq-012` this is **Record USD rate** | `t_rfq_fx_pin` (only on a mixed-currency event) |
| T+2 | Open → Awarded; `awardedQuotationId` = `qt-003a`, `awardedSupplierId` = `sup-001` | buyer · procurement (`buyer:all`) | tick **Award** on `qt-003a` → **Award to selected** | `t_rfq_award` |
| T+2 | quotation `qt-003a`: Under Review → Awarded | automation (`buyer:all`, cascade) | fan-out of the award | `t_quotation_award` (`causationId` = the award's correlationId) |
| T+2 | quotations `qt-003b`, `qt-003c`: Under Review → Rejected | automation (`buyer:all`, cascade) | fan-out of the award | `t_quotation_reject` × 2 (same `causationId`) |
| (alt.) T+2′ | Open → Cancelled | buyer · procurement | **Cancel RFQ** | `t_rfq_cancel` (no cascade; the three quotations stay Under Review) |
| (alt., a Draft) T+0″ | ∅ → Draft | buyer · procurement | wizard → **Save RFQ draft** | `t_rfq_create` (+ `t_pr_source` on the chosen requisition, if any) |
| (alt., a Draft) T+1″ | Draft → Open | buyer · procurement | **Publish RFQ** | `t_rfq_publish` |

<!-- src: src/services/transitions/events.ts:26-61; src/services/transitions/events.ts:127-129; src/services/transitions/dispatcher.ts:453-532; src/services/transitions/dispatcher.ts:838-907; src/services/data/mock/MockCommandService.ts:2935-2953 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| The button is replaced by "Awaiting Procurement" | a notice sits in the button's slot | your seat does not hold the verb's atom (`ROLE_NOT_PERMITTED` if dispatched anyway); all seven RFQ atoms are procurement's | a procurement seat does it; the identity panel shows your seat's roles |
| Wizard step 2 will not advance | the gate notice under the supplier list names an ineligible invitee or "needs at least 2 eligible suppliers" | a Suspended invitee, or fewer than two eligible invitees and no exemption | untick the Suspended supplier / tick another eligible one; an exempt event needs no floor |
| "Publish failed" | toast names `INVITEE_NOT_ELIGIBLE` or `COMPETITION_UNDER_FLOOR` (`POLICY_REJECTED:rfq_publish_…`) | the draft's invited set fails a gate — `rfq-008` has no invitees | no verb edits the invited list; cancel the draft and raise a new one |
| "RFQ not created — check the numbers" | toast names the quantity or budget rule | blank / non-numeric / ambiguous quantity ("2.400"); non-numeric or ambiguous budget | type digits only, e.g. 2400 |
| Create refused with a scope message | "outside what your account may see" | a supplier seat tried to raise an RFQ (`SCOPE_DENIED`: the RFQ target has no supplier owner) | RFQs are raised by the buyer |
| No "Award action" section on an Open event | the comparison shows quotes but no award panel | not every invited supplier is in the RFQ's responded list, or there are no quotations; a runtime quote submit does not update that list | use a fixture where all responded (`rfq-003`, `rfq-009`, `rfq-012`, `rfq-013`); the finding is registered |
| No "Award action" section on a Closed event | the panel offers Reopen RFQ and Cancel RFQ only | the surface renders the award panel for Open only, although the machine allows award from Closed | **Reopen RFQ**, then award |
| "Award to selected" is disabled | prompt "Select a quote above to enable the award action." | no quotation ticked | tick **Award** on one column |
| "Award failed" | toast with the awardee-integrity remedy (`POLICY_REJECTED:rfq_award_awardee_integrity`) | the quotation and supplier in the payload disagree, or the supplier was not invited — unreachable from the surface | hand-crafted dispatch only; send the quotation's own supplier |
| Comparison reads "Not ranked — … no exchange rate has been recorded" | header of the quote comparison names the currencies | mixed-currency bids and no pin (`FX_UNPINNED`) — `rfq-012` | **Record USD rate**; the bids stay shown as quoted meanwhile |
| Comparison reads "Not ranked — … older than this comparison allows" | header names the rate's "as of" date | the effective pin is older than 7 days at read (`FX_STALE`) — `rfq-013` at the declared present | **Supersede USD rate** with a current date; the old rate is kept |
| The rate dialog's button stays disabled | a field message under Rate or Rate date | blank / non-numeric / ambiguous / zero rate; blank, unreadable or future date | type e.g. 17250; give the date the rate was true |
| "Rate not recorded" | toast with the policy reason | `rfq_fx_pin_well_formed` — quote currency not permitted, IDR as quote, non-positive rate, unreadable date, unknown source | only reachable by a hand-crafted dispatch; the dialog already refuses each |
| "The document is not in a state this action can be taken from" (`ILLEGAL_TRANSITION`) | refusal names the current state | the panel was open while the state moved, or a verb fired from the wrong state | close and reopen the RFQ; act from the state shown |
| An Open event never closes | deadline column reads "Nd overdue", status still Open | `t_rfq_close` has no caller | award or cancel by hand |
| A supplier cannot see a published event | their Open events tab is empty or lacks it | not on `invitedSupplierIds`; still Draft; or they already quoted it (quoted events leave the Open tab) | check the invited list on the panel; publish; look under "My Quotes" |
| A supplier's quote still says Under Review after the RFQ was cancelled | "My Quotes" tab | cancel has no cascade onto quotations | not a fault in the machine; the supplier is not told in this build |
| "Comparison export not available yet" / "Export not available yet" / "Templates not available yet" | info toast saying no file or template was produced | these controls are not wired | not a fault; use outside channels |
| `STALE_STATE` | refusal names the expected and found states | a caller supplied `expectedState` and the document moved | no sourcing screen supplies it today; re-open and decide again |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SRC`, or `MODULE_INACTIVE:SRC.fxPin` when only *FX pin* is off; where the surface checks first, the control reads *"Switched off — Sourcing & RFQ"* | the Sourcing & RFQ module (or one of its parts) is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/lib/glossary/refusals.glossary.ts:32-98; src/lib/glossary/refusals.glossary.ts:155-165; src/lib/glossary/refusals.glossary.ts:244-259; src/pages-v2/BuyerSourcing.tsx:1128-1385; src/pages-v2/BuyerSourcing.tsx:1660-1760; src/pages-v2/BuyerSourcing.tsx:3756-3794; src/services/transitions/policies.ts:208-248; src/services/transitions/policies.ts:957-1023; src/services/data/mock/MockCommandService.ts:470-484; src/services/data/mock/MockProcurementService.ts:299-328; src/pages-v2/SupplierRFQs.tsx:786-796; src/lib/i18n/sourcing.ts:154-167; src/lib/i18n/sourcing.ts:380-415 -->

<!-- section:testdata -->
## 9 · Test data

Fixtures are SIMULATED. RFQ dates are authored literals (the RFQ family is not shifted onto the declared present), so every response deadline in the fixture file is before 31 Aug 2026. One Draft is not in the fixture file: the material-request seed raises it through `t_rfq_create` at boot.

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | `RFQ-2026-901`, `rfq-008`, `rfq-014` | RFQ-2026-901, RFQ-2026-008, RFQ-2026-014 | `RFQ-2026-901`: boot-seeded (Packaging, no material code, invites sup-002 / sup-005 / sup-007, deadlines Nov 2026) — publishable, competes as usual. `rfq-008`: no invitees — publish refuses `COMPETITION_UNDER_FLOOR`; cancel is its only exit. `rfq-014`: invites sup-005 / sup-006 / sup-009; publishes with "Competitive bidding is not required" (Mandatory listing on `AI-NIAC-6601`). Wizard-raised drafts continue the `RFQ-2026-9xx` range |
| Open | `rfq-001`, `rfq-002`, `rfq-003`, `rfq-009`, `rfq-010`, `rfq-011`, `rfq-012`, `rfq-013` | RFQ-2026-001, -002, -003, -009, -010, -011, -012, -013 | all responded (award panel reachable): `rfq-003` (3 IDR quotes), `rfq-009` (2 USD quotes — single currency, ranks without a pin), `rfq-012` (IDR + USD, no pin → `FX_UNPINNED`), `rfq-013` (IDR + USD, two stale pins → `FX_STALE`). Not all responded: `rfq-001` (3 of 4), `rfq-002` (2 of 3; invitee sup-012 is Suspended — publication was seeded, not gated), `rfq-010` (0 of 2; the supplier persona sup-007 can quote it), `rfq-011` (1 of 2; one quotation Submitted — the review step's specimen) |
| Closed | `rfq-004`, `rfq-005` | RFQ-2026-004, RFQ-2026-005 | seeded Closed; both record all invitees as responded — **Reopen RFQ** lands them in Pending Award with the award panel available |
| Awarded | `rfq-006`, `rfq-007` | RFQ-2026-006, RFQ-2026-007 | awarded to `qt-006a` (sup-001) and `qt-007a` (sup-005); the "Award summary" shows "PO issued" empty |
| Cancelled | — | — | no fixture; cancel any Draft, Open or Closed event to produce one |

<!-- src: src/data/mockRfqs.ts:91-531; src/data/mockQuotations.ts:50-578; src/services/data/mock/stores/rfqStore.ts:43-47; src/services/data/mock/materialRequestSeed.ts:76-85; src/data/mockSuppliers.ts:361-368; _derived/guidefacts.json (rfq.fixtures) -->
