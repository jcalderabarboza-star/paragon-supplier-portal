---
entity: requirementResponse
locale: en
title: Forecast commitment (requirement response)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_requirementresponse_submit
  - t_requirementresponse_acknowledge
  - t_requirementresponse_promote
  - t_requirementresponse_review
  - t_requirementresponse_accept
  - t_requirementresponse_dispute
  - t_requirementresponse_resolve
  - t_requirementresponse_revise
  - t_requirementresponse_supersede
---

<!-- section:summary -->
## 1 · What this process is

A requirement response is a supplier's answer to a published forecast line: how much of what Paragon asked for it can actually supply, in that period. Paragon publishes a forecast snapshot (a publication with a plan version and a horizon of monthly period buckets); each line in it is fanned to one supplier for one material in one period and carries a commitment class — **Firm**, **Semi-firm** or **Visibility only**. A Firm or Semi-firm line asks for a quantity commitment; a Visibility-only line asks only to be seen.

Two seats touch it. On the supplier side, the supplier's sales contact (the `commercial` lane) works out the commitment on `/supplier/forecasts`, saves it as a draft, reviews it under **My responses** and then sends it to Paragon; the supplier's admin contact (`back_office`) acknowledges Visibility-only lines. On the buyer side, the planner (`planning`) consolidates every supplier's answers on `/buyer/collaboration`, takes a submitted answer under review, and then either accepts it as the number to plan on or disputes it in words the supplier reads on their own line. A disputed answer comes back to the planner's desk through the planner's own resolution, or as a new version when the supplier revises it.

A commitment starts as a **Draft** that nobody at Paragon can see — the planner's board still reads *Awaiting* for that line until the supplier submits from the My responses tab; the flow's declared initial state is Draft. An acknowledgment skips the draft: there is no quantity to review, so it lands **Submitted** at once. The one terminal state is **Superseded** — a version a later version has replaced. **Accepted** is no longer terminal: the supplier may revise an accepted commitment. **Disputed** is not terminal either; it is left by the planner's resolution or by the supplier's revision. A supplier who wants to change a disputed or accepted number presses **Revise**, which mints the next version of the same answer as a Draft (linked to the one it revises) and retires the revised one to Superseded; a second fresh creation over an answer that is still open is refused. The flow definition itself records Disputed as a gap rather than an ending.

Honesty markers. Every forecast publication in this build is SIMULATED, and a simulated publication is never supplier-visible, so the supplier page shows the sample set under the banner **Sample forecast — no live publication yet** and the page's liveness pill reads *Sample — awaiting SOMO C8 feed*; the buyer page carries **Consolidation view — reads are simulated; the review lane writes**. All nine transitions are wired — eight a person presses and one cascade that follows a revision — and dispatch through the portal's own command spine; nothing here belongs to S/4HANA, TMS or the bank. Timestamps come from one shared simulated clock — the app's "today" is 31 Aug 2026 (12:00 UTC) — never the wall clock.

<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:56-70; src/services/transitions/flows/requirementResponse.flow.ts:132-139; src/services/transitions/flows/requirementResponse.flow.ts:278-340; src/services/transitions/cascades.ts:78-81; src/services/data/mock/MockCommandService.ts:907-942 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1a | ∅ → Draft | operator action (creation) | supplier · commercial | `t_requirementresponse_submit` |
| 1b | ∅ → Submitted | operator action (creation, Visibility-only lines) | supplier · back_office | `t_requirementresponse_acknowledge` |
| 2 | Draft → Submitted | operator action | supplier · commercial | `t_requirementresponse_promote` |
| 3 | Submitted → UnderReview | operator action | buyer · planning | `t_requirementresponse_review` |
| 4a | UnderReview → Accepted | operator action | buyer · planning | `t_requirementresponse_accept` |
| 4b | UnderReview → Disputed | operator action | buyer · planning | `t_requirementresponse_dispute` |
| 5 | Disputed → UnderReview | operator action | buyer · planning | `t_requirementresponse_resolve` |
| 6 | Disputed, Accepted → Draft (the NEXT version is minted in Draft; the revised one stays in force until that draft is sent — step 7) | operator action | supplier · commercial | `t_requirementresponse_revise` |
| 7 | Disputed, Accepted, UnderReview → Superseded | cascade (terminal; fired by step 2 when the draft sent is a revision) | automation | `t_requirementresponse_supersede` |

**Forks**

- **At creation (which verb opens the response):** `t_requirementresponse_submit` — supplier's sales contact — when the line is Firm or Semi-firm (a quantity is requested) and the supplier has no open answer on that line yet; `t_requirementresponse_acknowledge` — supplier's admin contact — when the line is Visibility only (no quantity is requested). The two are locked to the line's published class in both directions.
- **At UnderReview:** `t_requirementresponse_accept` — planner — when the commitment is the number to plan on; `t_requirementresponse_dispute` — planner — when the gap is too big or the stated reason does not hold, with an objection the supplier can answer.
- **At Disputed:** `t_requirementresponse_resolve` — planner — when the planner closes the disagreement; `t_requirementresponse_revise` — supplier's sales contact — when the supplier answers the objection with a new number.
- **At Accepted:** `t_requirementresponse_revise` — supplier's sales contact — when the accepted commitment changes; cutting it below the accepted quantity needs a root cause. Otherwise the answer stays Accepted.

<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:56-70; src/services/transitions/flows/requirementResponse.flow.ts:278-340; src/services/transitions/cascades.ts:78-81; src/services/transitions/businessRoles.ts:646-649 -->

<!-- section:steps -->
## 3 · Step by step

### t_requirementresponse_submit — Save a draft commitment <!-- transition:t_requirementresponse_submit -->

- **Step kind:** operator action (creation)
- **Role:** supplier · commercial (the supplier's sales contact)
- **From → to:** ∅ → Draft
- **Operator — where:** `/supplier/forecasts` → tab **Published lines** → on a Firm or Semi-firm line card press **Confirm** → panel *Confirm {material}* → **Save draft**. **Confirm** is offered only while you have no open answer on that line (any state but Superseded, against any publication); otherwise the card shows **Revise** (your open answer is Disputed or Accepted) or *An answer is already open for this line — continue it from the responses tab.*
- **Operator — do:** State how much of the requested quantity you commit to supply in that period. The panel saves a draft; it does not send anything to Paragon yet.
- **Operator — fill:** Step 1 *Confirmed quantity* — digits only, no thousands separators (e.g. `40000`); `0` is a valid answer when you cannot supply at all. Step 2 (optional) *Committed date* and *Capacity constraint*. Step 3 *Root cause* — a category (Capacity / Material availability / Logistics / Quality / Other) plus an optional note; the page requires the category whenever the quantity is below the requested amount. The publication, plan version, material and period are taken from the line you opened; your supplier identity comes from the session, never from the form.
- **Tester — expected state:** Draft
- **Tester — confirm:** toast *Draft saved — {material}* / *Not sent yet. Review it under My responses, then submit it to the buyer.*; the page switches to **My responses** where the new card (id `rr-9001`, `rr-9002`, …) shows status **Draft**, the line *Your turn — this is waiting on you* and a **Submit to buyer** button. On `/buyer/collaboration` the line still reads **Awaiting** — a draft is never shown to the planner, not even as a hint. Back on the line card, *Your latest response: {qty} {uom} · v{version} · Draft* appears, and **Confirm** gives way to *An answer is already open for this line — continue it from the responses tab.*
- **Tester — trigger event:** `t_requirementresponse_submit`
- **Checks that can refuse:** `sdc_material_known` — the material code must exist in the master the plan line was published from: the material master, or the generated sample materials a sample plan is split in, which the page marks **Sample material** (otherwise `UNKNOWN_MATERIAL`); `rr_submit_planversion_bound` — the plan version must be the referenced publication's own; `rr_submit_commitment_class` — the line must not be Visibility only (that class takes an acknowledgment instead); `rr_submit_qty_floor` — the quantity must be a finite number ≥ 0; `rr_submit_qty_agrees` — the number must agree with the token you typed when re-read by the one quantity parser (an ambiguous token such as `40.000` is refused rather than guessed); `rr_submit_no_open_sibling` — no answer of yours may still be open (any state but Superseded) for the same supplier × material × period, across publications; the refusal names the open answer and says *revise it, or submit the draft; a second creation would bury it*. Before any of these, scope: the line must have been fanned to your supplier, or the dispatch is refused as `SCOPE_DENIED`.
- **Glossary:** Firm · Semi-firm · Visibility only (commitment class); `EMPTY_QTY` · `NOT_NUMERIC` · `AMBIGUOUS_QTY` (quantity refusals); `POLICY_REJECTED`; `SCOPE_DENIED`.
- **Honesty:** The lines you are answering are SIMULATED sample data under the banner *Sample forecast — no live publication yet*. The verb's id still says "submit" although it now creates a draft — a recorded naming gap, not a behaviour. Drafting and sending share one permission, so the same sales contact does both.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:90-143; src/services/data/mock/MockCommandService.ts:1024-1123; src/services/data/mock/MockCommandService.ts:1130-1222; src/services/data/mock/MockCommandService.ts:1320-1328; src/services/data/mock/MockCommandService.ts:1375-1389; src/pages-v2/SupplierForecasts.tsx:364-395; src/pages-v2/SupplierForecasts.tsx:1393-1519; src/pages-v2/SupplierForecasts.tsx:1939-2117; src/lib/i18n/sdcSupplier.ts:97-173; src/services/query/sdcSupplierHooks.ts:150-176; src/services/sdc/consolidation.ts:249-261; src/services/transitions/policyHooks.ts:172-184; src/services/data/mock/MockCommandService.ts:1256-1279; src/pages-v2/SupplierForecasts.tsx:364-393; src/pages-v2/SupplierForecasts.tsx:534-550; src/lib/i18n/sdcSupplier.ts:55-57 -->

### t_requirementresponse_acknowledge — Acknowledge a visibility-only line <!-- transition:t_requirementresponse_acknowledge -->

- **Step kind:** operator action (creation)
- **Role:** supplier · back_office (the supplier's admin contact)
- **From → to:** ∅ → Submitted
- **Operator — where:** `/supplier/forecasts` → tab **Published lines** → on a Visibility-only line card (hint *Forward visibility only — no commitment requested.*) press **Acknowledge** → panel *Acknowledge {material}* → **Acknowledge**
- **Operator — do:** Tell Paragon you have seen the line. No quantity is asked for; the note is an optional early signal (stock sense, capacity outlook).
- **Operator — fill:** *Note (optional signal)* — free text, may be left empty. Publication, plan version, material and period come from the line.
- **Tester — expected state:** Submitted (no draft step — there is nothing to review before sending)
- **Tester — confirm:** toast *Acknowledged — {material}* / *Your visibility response is recorded under My responses.*; the My responses card shows **Response: Acknowledged**, a note if given, status **Submitted** and *Awaiting Paragon — nothing needed from you*. On `/buyer/collaboration` the line's response state reads **Acknowledged** (never *Confirmed*) with a dash in the Confirmed column, and the response appears under **Responses awaiting your review**.
- **Tester — trigger event:** `t_requirementresponse_acknowledge`
- **Checks that can refuse:** `sdc_material_known` — the code must be in the material master; `rr_submit_planversion_bound` — the plan version must match the publication; `rr_acknowledge_visibility_class` — the line must be Visibility only (an acknowledgment can never dodge the quantity floor on a Firm or Semi-firm line). Scope as for the draft: the line must be fanned to your supplier.
- **Glossary:** Visibility only (commitment class); `POLICY_REJECTED`; `SCOPE_DENIED`.
- **Honesty:** Same SIMULATED sample lines as above. The acknowledgment carries no quantity by design, so the consolidation can never mistake it for a commitment.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:155-171; src/services/data/mock/MockCommandService.ts:1065-1072; src/services/data/mock/MockCommandService.ts:1332-1340; src/pages-v2/SupplierForecasts.tsx:396-413; src/pages-v2/SupplierForecasts.tsx:1550-1582; src/pages-v2/SupplierForecasts.tsx:2131-2146; src/lib/i18n/sdcSupplier.ts:149-156; src/services/query/sdcSupplierHooks.ts:180-206; src/services/sdc/types.ts:423-425 -->

### t_requirementresponse_promote — Submit the draft to the buyer <!-- transition:t_requirementresponse_promote -->

- **Step kind:** operator action
- **Role:** supplier · commercial (the supplier's sales contact — the same permission as drafting)
- **From → to:** Draft → Submitted
- **Operator — where:** `/supplier/forecasts` → tab **My responses** → on a card with status **Draft** press **Submit to buyer**
- **Operator — do:** Send the reviewed commitment to Paragon's planner. Nothing is visible to planning before this; it is the act that makes the promise a promise.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Submitted
- **Tester — confirm:** toast *{responseId} submitted* / *The buyer can see this confirmation now.*; the card's status becomes **Submitted**, the *Submitted* column fills with the shared clock's date (stamped only on this crossing), and the actor line reads *Awaiting Paragon — nothing needed from you*. On `/buyer/collaboration` the line moves from **Awaiting** to **Confirmed** or **Short** (with the deficit) and the response is listed under **Responses awaiting your review**.
- **Tester — trigger event:** `t_requirementresponse_promote`; when the draft is a revision (*Revises {id}*), it also fires `t_requirementresponse_supersede` on the answer it revises — sending is what retires that answer, never drafting
- **Checks that can refuse:** none beyond role, legality and required fields — pressing it on anything but a Draft returns `ILLEGAL_TRANSITION`; a response owned by another supplier is `SCOPE_DENIED`.
- **Glossary:** `ILLEGAL_TRANSITION`; `SCOPE_DENIED`.
- **Honesty:** A commitment never reaches the buyer without this step. If a channel-ingested response were ever created through the draft verb it would rest unsubmitted, because no channel can promote — recorded in the flow, not built around. The supplier page now has a deadline slot — **Respond by** on every line card and *respond by {date}* / *overdue since {date}* beside the **Published lines** tab — but it shows only a deadline stored on the publication, which is stamped when a planner publishes through the publish verb. The seed publications never were, so on them it reads *No deadline set* (*no deadline set* on the tab), while the buyer's chase list still derives published date + 7 days.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:173-193; src/services/data/mock/MockCommandService.ts:1006-1015; src/pages-v2/SupplierForecasts.tsx:672-689; src/pages-v2/SupplierForecasts.tsx:1524-1547; src/lib/i18n/sdcSupplier.ts:77-78; src/lib/i18n/sdcSupplier.ts:168-169; src/services/query/sdcSupplierHooks.ts:217-239; src/pages-v2/SupplierForecasts.tsx:434-447; src/pages-v2/SupplierForecasts.tsx:1793-1799; src/pages-v2/SupplierForecasts.tsx:1855; src/services/sdc/types.ts:322-329; src/services/sdc/publication.ts:18-29; src/services/sdc/consolidation.ts:473-478; src/lib/i18n/sdcSupplier.ts:30-35 -->

### t_requirementresponse_review — Start review <!-- transition:t_requirementresponse_review -->

- **Step kind:** operator action
- **Role:** buyer · planning (the planner)
- **From → to:** Submitted → UnderReview
- **Operator — where:** `/buyer/collaboration` → section **Responses awaiting your review** → row (supplier · material · period · response id) → **Start review**
- **Operator — do:** Take the answer onto your desk for evaluation rather than taking it on sight. Reviewing does not decide it; it tells the supplier you have it.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** UnderReview
- **Tester — confirm:** toast *Under review — {material}* / *{supplier} can see that you have taken their response up.*; the row leaves **Responses awaiting your review** and appears under **Under review — accept or dispute**; the grid's state cell gains an **Under Review** chip beside the quantity state. On the supplier's **My responses** the card status reads **Under Review** with *Awaiting Paragon — nothing needed from you*, without a reload.
- **Tester — trigger event:** `t_requirementresponse_review`
- **Checks that can refuse:** none beyond role, legality and required fields. A seat without the planning lane sees *Awaiting Planning* in place of the button.
- **Glossary:** `ROLE_NOT_PERMITTED`; `ILLEGAL_TRANSITION`.
- **Honesty:** The section is derived from the machine (every row whose response state offers this verb), so it empties itself as rows move. Review is the front door but not the only way into UnderReview — a resolved dispute lands there too.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:195-206; src/pages-v2/BuyerCollaboration.tsx:514-521; src/pages-v2/BuyerCollaboration.tsx:986-1042; src/lib/i18n/sdcConsolidation.ts:133-146; src/services/query/sdcBuyerHooks.ts:203-238; src/services/query/sdcBuyerHooks.ts:323-324 -->

### t_requirementresponse_accept — Accept the commitment <!-- transition:t_requirementresponse_accept -->

- **Step kind:** operator action
- **Role:** buyer · planning (the planner)
- **From → to:** UnderReview → Accepted
- **Operator — where:** `/buyer/collaboration` → section **Under review — accept or dispute** → row → **Accept**
- **Operator — do:** Take the commitment as the number to plan on. This is the planner's last act on this version; the supplier can still revise it, which arrives back on your desk as a new version.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Accepted (not terminal — the supplier's revise leaves it)
- **Tester — confirm:** toast *Confirmation accepted — {material}* / *{supplier} is committed on this line. The supplier may still revise the commitment; a revision comes back to you for review.*; the row leaves the under-review section; the grid state cell shows an **Accepted** chip. The supplier's card reads **Accepted** with the receipt *Accepted by the buyer on {date}* (the shared clock's date, stamped once on this crossing), the actor line *Nothing needed from you — revise it only if your commitment changes*, and a **Revise** button.
- **Tester — trigger event:** `t_requirementresponse_accept`
- **Checks that can refuse:** `rr_review_actor_attributed` — the seat must be acting as a named sample user; a seat carrying no person is refused (*RR_REVIEW_ACTOR_UNATTRIBUTED*) with the remedy stated, and the page holds **Accept** back beforehand with *Accepting or disputing commits a supplier or sends them words to answer, so a person takes it — adopt a sample user in the identity panel first.* Beyond that, role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`; `ILLEGAL_TRANSITION`.
- **Honesty:** Accepted is no longer terminal: `t_requirementresponse_revise` leaves it, so the flow's only terminal is Superseded — derived from the flow, not asserted. The toast says so: the supplier may still revise, and a revision comes back for review. Downstream planning treats the number as real from here; in this build that consumer is the same simulated consolidation, which flags a later cut of this number as **Accepted {accepted}, revised to {now}**.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:63-70; src/services/transitions/flows/requirementResponse.flow.ts:208-218; src/pages-v2/BuyerCollaboration.tsx:529-536; src/pages-v2/BuyerCollaboration.tsx:1078-1097; src/lib/i18n/sdcConsolidation.ts:154-161; src/services/query/sdcBuyerHooks.ts:334-335; src/services/transitions/flows/requirementResponse.flow.ts:297-299; src/services/data/mock/MockCommandService.ts:1016-1018; src/services/sdc/types.ts:517-523; src/pages-v2/SupplierForecasts.tsx:492-518; src/pages-v2/SupplierForecasts.tsx:690-718; src/lib/i18n/sdcSupplier.ts:36; src/lib/i18n/sdcSupplier.ts:73-75 -->

### t_requirementresponse_dispute — Dispute the commitment <!-- transition:t_requirementresponse_dispute -->

- **Step kind:** operator action
- **Role:** buyer · planning (the planner)
- **From → to:** UnderReview → Disputed
- **Operator — where:** `/buyer/collaboration` → section **Under review — accept or dispute** → row → **Dispute** → panel *Dispute confirmation — {material}* → **Raise dispute**
- **Operator — do:** Say why you do not take the answer — the gap is too big, or the stated reason does not hold — in words the supplier can answer.
- **Operator — fill:** *Your objection* — required text; the commit button stays disabled while it is blank (*A dispute needs an objection the supplier can answer.*).
- **Tester — expected state:** Disputed
- **Tester — confirm:** toast *Dispute raised — {material}* / *{supplier} can now read your objection on their response.*; the row moves to **Disputes awaiting your resolution**; the grid state cell shows a **Disputed** chip (warning tint) beside the quantity state. On the supplier's My responses card the ledger line **Paragon disputed this** appears with the date and your text, status **Disputed**, actor line *Awaiting Paragon — or revise your answer yourself*, and a **Revise** button.
- **Tester — trigger event:** `t_requirementresponse_dispute`
- **Checks that can refuse:** `rr_review_actor_attributed` — as for accept: a named sample user is required, and **Dispute** is held back on a seat with no person. `rr_dispute_text_authored` — the objection must be a non-blank string (a space bar does not pass; presence alone is not substance).
- **Glossary:** `POLICY_REJECTED`; `ROLE_NOT_PERMITTED`.
- **Honesty:** The text lands as an entry in an append-only dispute ledger on the response — it is never edited, never translated, and never cleared by a resolution. No person is recorded against it: the session names a role and a company, not an individual. The supplier cannot answer inside the dispute; their move is **Revise**, which mints the next version and retires this one to Superseded with a third ledger entry, shown on the supplier's card as *You answered it with a revision*.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:219-247; src/services/data/mock/MockCommandService.ts:948-986; src/services/data/mock/MockCommandService.ts:1239-1254; src/services/sdc/types.ts:434-490; src/pages-v2/BuyerCollaboration.tsx:1098-1115; src/pages-v2/BuyerCollaboration.tsx:1273; src/lib/i18n/sdcConsolidation.ts:163-176; src/pages-v2/SupplierForecasts.tsx:587-612; src/services/query/sdcBuyerHooks.ts:348-351; src/pages-v2/SupplierForecasts.tsx:492-518; src/pages-v2/SupplierForecasts.tsx:690-708; src/lib/i18n/sdcSupplier.ts:74-75; src/services/data/mock/MockCommandService.ts:995-1005; src/lib/i18n/sdcSupplier.ts:89 -->

### t_requirementresponse_resolve — Resolve the dispute <!-- transition:t_requirementresponse_resolve -->

- **Step kind:** operator action
- **Role:** buyer · planning (the planner — the same permission that raises a dispute)
- **From → to:** Disputed → UnderReview
- **Operator — where:** `/buyer/collaboration` → section **Disputes awaiting your resolution** → row → **Resolve** → panel *Resolve dispute — {material}* (shows *The dispute so far* and *What the supplier said*) → **Resolve dispute**
- **Operator — do:** Close the disagreement and put the answer back on your desk for a decision, saying what you are accepting, changing or asking for.
- **Operator — fill:** *Your answer* — required text; the commit stays disabled while blank (*A resolution needs an answer the supplier can read.*).
- **Tester — expected state:** UnderReview
- **Tester — confirm:** toast *Dispute resolved — {material}* / *{supplier} can now read your answer on their response.*; the row leaves the disputes section and reappears under **Under review — accept or dispute**; the grid chip becomes **Under Review**. The supplier's card shows a second ledger line **Paragon resolved the dispute** beneath the raise, with the date and text — the raise stays visible.
- **Tester — trigger event:** `t_requirementresponse_resolve`
- **Checks that can refuse:** `rr_dispute_text_authored` — the answer must be a non-blank string.
- **Glossary:** `POLICY_REJECTED`; `ROLE_NOT_PERMITTED`.
- **Honesty:** A resolution returns the response to the one state a dispute can come from; it does not accept it. After resolving, accept or dispute again from the under-review section. The ledger keeps both entries: an answered dispute is not the same as one never raised.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:248-277; src/services/data/mock/MockCommandService.ts:979-986; src/pages-v2/BuyerCollaboration.tsx:502-509; src/pages-v2/BuyerCollaboration.tsx:1136-1165; src/pages-v2/BuyerCollaboration.tsx:1217; src/lib/i18n/sdcConsolidation.ts:104-131; src/services/query/sdcBuyerHooks.ts:268-271 -->

### t_requirementresponse_revise — Revise a disputed or accepted commitment <!-- transition:t_requirementresponse_revise -->

- **Step kind:** operator action
- **Role:** supplier · commercial (the supplier's sales contact — the same permission as drafting and submitting)
- **From → to:** Disputed, Accepted → Draft — dispatched against the answer being revised, but that answer does not move to Draft: the platform mints the NEXT version of the same answer in Draft, linked to it (`supersedes`). The revised answer stays exactly where it is — Disputed or Accepted — until the draft is SENT (`t_requirementresponse_promote`), which retires it to Superseded through `t_requirementresponse_supersede`
- **Operator — where:** `/supplier/forecasts` → tab **My responses** → on a card with status **Disputed** or **Accepted** press **Revise** (or press **Revise** on the line's card under **Published lines**) → panel *Revise {material} — replaces {id}* → **Save draft**
- **Operator — do:** Answer the planner's decision with a new number — after an objection, or when a commitment the planner already took can no longer be met. The revision is a new draft you submit like any other; the version you revise is kept as history, never edited.
- **Operator — fill:** the same three steps as a first draft — Step 1 *Confirmed quantity* (digits only; `0` is valid), Step 2 (optional) *Committed date* and *Capacity constraint*, Step 3 *Root cause*. Before the number, the panel says what you are answering: for a Disputed answer *This revision is your answer to Paragon’s dispute. {id} is kept as history, not replaced in place.*; for an Accepted one *Paragon accepted {qty} {uom} and is planning on it. Revising below that needs a root cause.* The root-cause category is required when the quantity is below the requested amount, and also when it is below the accepted quantity. The payload carries only what you say now; the line comes from the revised answer, bound to the latest publication that fans the same line.
- **Tester — expected state:** Draft (the new version, numbered from `rr-9001`); the revised answer still reads Disputed or Accepted
- **Tester — confirm:** toast *Revision saved as a draft — {material}* / *Submit it from the responses tab — {id} stays in force until you do, then is kept as history.*; the page switches to **My responses**, where the new card shows status **Draft**, *Revises {id}*, a version one higher, *Your turn — this is waiting on you* and **Submit to buyer**; the revised card keeps its status and reads *Revision {id} is drafted — submit it to answer this* in place of **Revise**. On `/buyer/collaboration` nothing moves while it is a draft: a disputed answer stays under **Disputes awaiting your resolution**, an accepted one keeps its figure. Once submitted, the revised answer reads **Superseded** with *Complete — no further action*, and the new one is listed under **Responses awaiting your review** with the chip *Revised in answer to your dispute — review v{version}* or *Revised after you accepted — review v{version}*; a revision that cut an accepted quantity reads **Accepted {accepted}, revised to {now}** in the grid and puts the supplier first on the chase list as *Accepted commitment cut*. The revise panel opens filled with what the revised answer said — quantity, committed date, capacity constraint and root cause — so a field left alone is kept, never dropped.
- **Tester — trigger event:** `t_requirementresponse_revise`
- **Checks that can refuse:** `sdc_material_known` — reads the revised answer's own material (the payload carries none); `rr_revise_commitment_only` — an acknowledgment cannot be revised (*{id} is an acknowledgment — it carries no quantity to revise*); `rr_submit_qty_floor` and `rr_submit_qty_agrees` — as for a first draft; `rr_revise_root_cause_when_cut` — revising an Accepted answer below its accepted quantity needs a non-blank root-cause category (*revising accepted {accepted} down to {next} requires a root cause — an accepted commitment is not cut without saying why*); revising up, or revising a Disputed answer, owes nothing here; `rr_revise_no_open_draft` — an answer already answered by a draft revision cannot be revised again (*RR_REVISION_ALREADY_DRAFTED: {id} is already answered by draft {draft} — submit or continue that draft*). Before these: another supplier's answer is `SCOPE_DENIED`, and an answer in any state other than Disputed or Accepted is `ILLEGAL_TRANSITION`.
- **Glossary:** `POLICY_REJECTED`; `ILLEGAL_TRANSITION`; `SCOPE_DENIED`.
- **Honesty:** The registry's `to: Draft` names where the answer's thread lands, not where the dispatched answer lands — the one edge in this machine whose destination is a sibling. Revising shares the drafting permission, so a seat without the commercial lane sees *Awaiting Supplier Commercial* in the button's slot. **Revise** on My responses is offered only when the answer's line is in the publication on screen. The lines are SIMULATED sample data.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:278-316; src/services/transitions/policyHooks.ts:185-202; src/services/data/mock/MockCommandService.ts:879-942; src/services/data/mock/MockCommandService.ts:944-956; src/services/data/mock/MockCommandService.ts:1281-1306; src/services/data/mock/MockCommandService.ts:1375-1389; src/services/query/sdcSupplierHooks.ts:240-280; src/pages-v2/SupplierForecasts.tsx:364-393; src/pages-v2/SupplierForecasts.tsx:492-550; src/pages-v2/SupplierForecasts.tsx:690-724; src/pages-v2/SupplierForecasts.tsx:1335-1349; src/pages-v2/SupplierForecasts.tsx:1375-1463; src/pages-v2/SupplierForecasts.tsx:1935-1945; src/pages-v2/SupplierForecasts.tsx:1997-2007; src/lib/i18n/sdcSupplier.ts:73-76; src/lib/i18n/sdcSupplier.ts:99-103; src/lib/i18n/sdcSupplier.ts:146; src/lib/i18n/sdcSupplier.ts:164-165; src/services/sdc/consolidation.ts:242-300; src/services/sdc/consolidation.ts:342-365; src/services/sdc/consolidation.ts:480-505; src/pages-v2/BuyerCollaboration.tsx:131-147; src/pages-v2/BuyerCollaboration.tsx:702-711; src/pages-v2/BuyerCollaboration.tsx:1005-1010; src/lib/i18n/sdcConsolidation.ts:63; src/lib/i18n/sdcConsolidation.ts:91; src/lib/i18n/sdcConsolidation.ts:140-141 -->

### t_requirementresponse_supersede — Retire the revised version <!-- transition:t_requirementresponse_supersede -->

- **Step kind:** cascade (fired by `t_requirementresponse_revise`)
- **Role:** automation (atom `requirementresponse:supersede`; no seat holds it — it runs under the automation grant)
- **From → to:** Disputed, Accepted, UnderReview → Superseded (UnderReview: the planner resolved the dispute while the revision was still a draft; the sent revision replaces the answer under review)
- **Operator — where:** nobody presses this. It fires when the supplier saves a revision (`/supplier/forecasts` → **Revise** → **Save draft**); the dispatcher fans it onto the answer that was revised, after checking it still sits in Disputed or Accepted.
- **Operator — do:** nothing directly. It records that a later version replaced this one, so the earlier answer is kept as history instead of reading as still open.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Superseded (terminal — the flow's only ending)
- **Tester — confirm:** after the supplier presses **Submit to buyer** on the revision, on the supplier's **My responses** the revised card's status reads **Superseded** with *Complete — no further action*; a revised Disputed answer gains a third ledger line *You answered it with a revision* (dated, no text). On `/buyer/collaboration` the retired answer leaves every section and the grid. The answer records which state it was retired from (`supersededFrom` — Disputed or Accepted; an answer retired from UnderReview records none), and the consolidation stops counting it. Its audit event carries `causationId` = the promote's correlation id.
- **Tester — trigger event:** `t_requirementresponse_supersede` (fired by `t_requirementresponse_promote` of a revision)
- **Checks that can refuse:** none of its own — no hooks and no required fields. The cascade is built only when the sent draft names the answer it revises and that answer still exists in Disputed, Accepted or UnderReview; a refusal (e.g. `ILLEGAL_TRANSITION`) would be recorded on the audit sink with the promote's `causationId`, never surfaced, and the revision itself is already sent.
- **Glossary:** `ILLEGAL_TRANSITION`.
- **Honesty:** `/buyer/process-flows` badges this step as computed — a consequence of a supplier revising, not something anybody declares. The ledger entry it writes is store-minted and textless, so "answered by revising" stays distinct from "resolved by the planner" and from "never answered". The event's actor is the buyer audit string (`buyer:all`), because the automation grant runs with no person and no supplier.
<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:317-340; src/services/transitions/cascades.ts:78-81; src/services/transitions/businessRoles.ts:646-649; src/services/transitions/dispatcher.ts:841-907; src/services/data/mock/MockCommandService.ts:2823-2837; src/services/data/mock/MockCommandService.ts:987-1005; src/services/sdc/types.ts:474-482; src/services/sdc/types.ts:547-562; src/services/sdc/consolidation.ts:242-262; src/pages-v2/SupplierForecasts.tsx:576-608; src/pages-v2/BuyerCollaboration.tsx:208-216; src/lib/i18n/sdcSupplier.ts:71; src/lib/i18n/sdcSupplier.ts:89; src/lib/i18n/sdcConsolidation.ts:120; src/lib/i18n/processFlowPurpose.ts:302-303; src/services/transitions/events.ts:127-129 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Which verb answers the line (at creation).** Branch A — `t_requirementresponse_submit` — **When:** the line's class is Firm or Semi-firm; the supplier's sales contact saves a draft with a quantity. Branch B — `t_requirementresponse_acknowledge` — **When:** the line's class is Visibility only; the supplier's admin contact acknowledges with an optional note. The class guards refuse the wrong pairing in both directions.
- **Full or short (inside the draft).** Branch A — quantity ≥ requested — **When:** you can supply the whole line; no root cause needed. Branch B — quantity < requested, including `0` — **When:** you cannot supply in full; the page requires a root-cause category, and the buyer's grid will read the line as **Short** with the deficit.
- **Accept or dispute (at UnderReview).** Branch A — `t_requirementresponse_accept` — **When:** the planner plans on the number. Branch B — `t_requirementresponse_dispute` — **When:** the planner objects; the text becomes the supplier's reading.
- **Dispute exception (at Disputed).** Branch A — `t_requirementresponse_resolve` — **When:** the planner has worked the disagreement through; the response returns to UnderReview. Branch B — `t_requirementresponse_revise` — **When:** the supplier answers the objection with a new number; the next version is minted as a Draft (from **Revise** on My responses or on the line card), the disputed one is retired to Superseded by `t_requirementresponse_supersede`, and the consolidation reads the new version as the current answer once submitted. A fresh **Confirm** on the line is not a branch: a second creation over an open answer is refused (`rr_submit_no_open_sibling`), and the page does not offer it.
- **Revise after accept (at Accepted).** `t_requirementresponse_revise` — **When:** an accepted commitment changes. Revising up owes nothing extra; revising below the accepted quantity needs a root cause, and until the planner takes the new number the grid reads **Accepted {accepted}, revised to {now}** and the chase list leads with the supplier as *Accepted commitment cut*, whatever the deadline.
- **Stale answer (a republication moved the line).** Not a transition. When a newer publication changes the quantity or the commitment class of a line already answered, the buyer's grid flags the response **Stale — answered {old}, now {new}**; if both are unchanged, the earlier answer is carried forward as presumed valid (the supplier's line card then reads *Carried — no re-confirmation needed* and *Your answer to {version} (v{v}, {qty} {uom}) still counts*). The supplier cannot file a fresh answer over a stale one that is still open — the line card reads *An answer is already open for this line — continue it from the responses tab.* — so the new number arrives through **Revise** once the planner has accepted or disputed, and a revision binds the latest publication that fans the line.

<!-- src: src/services/transitions/flows/requirementResponse.flow.ts:278-340; src/services/data/mock/MockCommandService.ts:886-942; src/services/data/mock/MockCommandService.ts:1256-1306; src/services/sdc/consolidation.ts:202-212; src/services/sdc/consolidation.ts:342-404; src/services/sdc/consolidation.ts:480-505; src/pages-v2/SupplierForecasts.tsx:283-305; src/pages-v2/SupplierForecasts.tsx:334-358; src/pages-v2/SupplierForecasts.tsx:364-393; src/pages-v2/SupplierForecasts.tsx:450-461; src/lib/i18n/sdcSupplier.ts:25-29; src/lib/i18n/sdcSupplier.ts:57 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Awaiting | time-driven, derived at read | no submitted response (Drafts and Superseded answers count as nothing) | the current publication's line has no response that is neither Draft nor Superseded; a revision still in draft leaves the revised answer counting as before | `/buyer/collaboration` grid, *Response state* |
| Short −{deficit} | derived at read | Submitted, UnderReview, Accepted, Disputed | confirmed quantity below the line's demand | grid *Response state* + *Deficit* column |
| Accepted {accepted}, revised to {now} | derived at read | Submitted, UnderReview (a revision not yet taken) | an earlier version of the answer was retired from Accepted with a higher quantity | grid *Response state* (danger chip) + *Deficit* column shows the cut against the accepted figure |
| Stale — answered X, now Y | derived at read | any submitted status | the answer binds a superseded plan version and the line's quantity or commitment class moved | grid *Response state* (warning chip) |
| carried forward | derived at read | any submitted status | the answer binds a superseded version but the line's quantity and class are unchanged | grid, muted token beside Confirmed / Short / Acknowledged |
| Under Review / Accepted / Disputed chip | operator-raised (lifecycle) | those states | the response has left Submitted | grid *Response state* (Disputed in warning tint); supplier card status pill |
| Superseded | cascade-raised (lifecycle) | Superseded | a revision replaced this version | supplier card status pill only — the grid never shows a retired answer |
| Revised in answer to your dispute — review v{n} / Revised after you accepted — review v{n} | derived at read | Submitted (a revision) | the answer revises a version retired from Disputed / Accepted | **Responses awaiting your review**, in place of the *Submitted* chip |
| Accepted commitment cut | derived at read | supplier level | any of the supplier's lines reads *Accepted {accepted}, revised to {now}* | **Chase list**, sorted first and listed whatever the deadline |
| Overdue | time-driven, derived at read | supplier level | shared clock is past published date + 7 days and the supplier still has awaiting lines | `/buyer/collaboration` **Chase list**, *Due {date}* |
| Partial response | time-driven, derived at read | supplier level | before the deadline, some lines answered and some awaiting (a silent supplier is not chased before the deadline) | **Chase list** |
| Responded / Partial / Silent | derived at read | supplier level | rollup of answered vs awaiting lines | chips above the chase list |
| Paragon disputed this / Paragon resolved the dispute | operator-raised | Disputed and after | ledger entries written by dispute and resolve | supplier **My responses** card; buyer resolve panel *The dispute so far* |
| You answered it with a revision | cascade-raised | Superseded from Disputed | textless ledger entry written when a revision retires a disputed answer | supplier **My responses** card (the buyer's label *The supplier answered with a revision* exists, but the resolve panel only opens on a live Disputed answer, so it never shows a retired one) |
| Accepted by the buyer on {date} | operator-raised (receipt) | Accepted and after | stamped once on the crossing into Accepted | supplier **My responses** card |
| Respond by {date} / Overdue | time-driven, derived at read | each line of the current publication | the publication's stored deadline, or published date + 7 days where none is stored (the seeds) — the date the buyer's chase reads; **Overdue** only on a line still awaiting an answer | `/supplier/forecasts` line card; tab label *Published lines · respond by {date}* / *overdue since {date}* / *all answered (due {date})* |
| Plan {version} published {date} — {changed} lines changed, {carried} carried; Carried — no re-confirmation needed / Changed — was {qty} {uom} / Changed — new in this plan | derived at read | each line, against the publication it superseded | quantity and class compared with the previous publication | `/supplier/forecasts` version banner and line-card chips |
| Sample forecast — no live publication yet | SIMULATED marker | whole page | every fixture publication is SIMULATED, so the live lane is empty | `/supplier/forecasts` banner; pill *Sample — awaiting SOMO C8 feed* on both pages |
| Consolidation view — reads are simulated; the review lane writes | SIMULATED marker | whole page | always in this build | `/buyer/collaboration` banner; meta line *sample clock, as of {date}* |
| Awaiting {owner} | role handoff | any control | the seat does not hold the verb's atom (e.g. *Awaiting Planning*, *Awaiting Supplier Commercial*, *Awaiting Supplier Back Office*) | in the control's own slot on both pages |

<!-- src: src/services/sdc/consolidation.ts:46; src/services/sdc/consolidation.ts:143-185; src/services/sdc/consolidation.ts:423-507; src/pages-v2/BuyerCollaboration.tsx:644-727; src/pages-v2/BuyerCollaboration.tsx:922-978; src/pages-v2/SupplierForecasts.tsx:1823-1831; src/services/sdc/visibility.ts:25-29; src/lib/i18n/roles.ts:48-52; src/lib/i18n/widget.ts:42; src/services/sdc/consolidation.ts:168-185; src/services/sdc/consolidation.ts:242-262; src/services/sdc/consolidation.ts:342-404; src/services/sdc/consolidation.ts:450-505; src/pages-v2/BuyerCollaboration.tsx:131-147; src/pages-v2/BuyerCollaboration.tsx:628-637; src/pages-v2/BuyerCollaboration.tsx:702-711; src/pages-v2/BuyerCollaboration.tsx:957-967; src/pages-v2/BuyerCollaboration.tsx:1005-1010; src/pages-v2/BuyerCollaboration.tsx:292-330; src/lib/i18n/sdcConsolidation.ts:63; src/lib/i18n/sdcConsolidation.ts:91; src/lib/i18n/sdcConsolidation.ts:120; src/lib/i18n/sdcConsolidation.ts:140-141; src/pages-v2/SupplierForecasts.tsx:334-358; src/pages-v2/SupplierForecasts.tsx:434-447; src/pages-v2/SupplierForecasts.tsx:576-608; src/pages-v2/SupplierForecasts.tsx:713-723; src/pages-v2/SupplierForecasts.tsx:1793-1855; src/lib/i18n/sdcSupplier.ts:22-36; src/lib/i18n/sdcSupplier.ts:89; src/lib/statusLabel.ts:99 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `rr-0002` (no document number — the store id is the number; supplier `sup-005`, material `RM-EMUL-3310` Glycerin USP 99.5%, period `2026-08`, status Disputed).

| Joins to | By | Note |
|---|---|---|
| Forecast publication `PUB-2026-08-RM` / plan version `PV-2026-08.1` | `publicationId` + `planVersion` | the exact snapshot answered; the current publication is `PUB-2026-08-RM-R2` (`PV-2026-08.2`, published 2026-08-15), whose 2026-08 glycerin line is unchanged, so the answer is carried forward |
| Forecast line (supplier × material × period) | `supplierId` + `materialCode` + `periodBucket` | demand 3 500 KG Firm; confirmed 3 000 KG → **Short −500 KG** |
| Material master entry | `materialCode` | the unit (KG) is copied from the master at creation; the payload never carries a unit |
| Root cause (child) | `rootCause.level1` / `level2` / `note` | `capacity` / `principal-allocation` — the supplier's own explanation, shown back on both seats |
| Dispute ledger | `disputeResponse[]` | one `raised` entry dated 2026-08-17; a resolution appends a `resolved` entry beside it, never over it |
| Submission session `ss-0002` | `attempted[].objectId` | the supplier visit that also declared `inv-0002` and reported `ish-0002`; audit correlation only, no status of its own |
| Supplier-coverage indicator | `supplierId` + `materialCode` | display-only projection on the buyer grid: declared stock + incoming legs ÷ committed demand, marked *Model* |
| `submissionVersion` | derived | prior max + 1 over the response thread — the same supplier × material × period, spanning publications (each answer's own `publicationId` still says which snapshot it bound); a revision versions up, never overwrites. Which answer is latest is ordered by the answered publication's date, then version, then submission time — never by insertion order |
| Revised / revising version | `supersedes` / `supersededFrom` | a revision names the version it revises in `supersedes` (store-minted, never from the payload); the retired version records whether it was Disputed or Accepted in `supersededFrom`. `rr-0002` has neither at seed |

Display-only: `provenance` (`SUPPLIER` · `SIMULATED` · `committed`) is carried on every response and rendered as the *Provenance* marker; nothing in the portal writes it after creation. No actor is stored on a dispute entry.

<!-- src: src/services/sdc/fixtures.ts:1189-1218; src/services/sdc/fixtures.ts:1023-1063; src/services/sdc/fixtures.ts:1383-1393; src/services/sdc/types.ts:507-565; src/services/data/mock/MockCommandService.ts:1057; src/services/data/mock/MockCommandService.ts:1113-1115; src/services/data/mock/stores/requirementResponseStore.ts:44-55; src/services/data/mock/stores/requirementResponseStore.ts:33-43; src/services/data/mock/MockCommandService.ts:879-884; src/services/sdc/consolidation.ts:216-262; src/services/sdc/types.ts:547-562 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `supplier:<supplierId>` for a supplier seat or `buyer:all` for the buyer, `ts` from the shared clock, `outcome` (done / failed) and a `correlationId`. When several objects are submitted in one supplier visit, the first command's `correlationId` becomes the visit's anchor and later commands carry it as `causationId`. The response itself keeps `submittedAt` (stamped once, at the Draft → Submitted crossing or at acknowledgment), `acceptedAt` (stamped once, on the crossing into Accepted) and the dispute ledger's `at` stamps.

Worked sequence for `rr-0002` as a tester would produce it from a fresh line (the fixture is seeded already Disputed; a live run starts at the draft):

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Draft | supplier · commercial | **Save draft** on the 2026-08 glycerin line, 3 000 of 3 500 KG, root cause Capacity | `t_requirementresponse_submit` |
| T+1 | Draft → Submitted | supplier · commercial | **Submit to buyer** on My responses (`submittedAt` stamped) | `t_requirementresponse_promote` |
| T+2 | Submitted → UnderReview | buyer · planning | **Start review** | `t_requirementresponse_review` |
| T+3 | UnderReview → Disputed | buyer · planning | **Raise dispute** with an objection (ledger entry `raised`) | `t_requirementresponse_dispute` |
| T+4 | Disputed → UnderReview | buyer · planning | **Resolve dispute** with an answer (ledger entry `resolved`) | `t_requirementresponse_resolve` |
| T+5 | UnderReview → Accepted | buyer · planning | **Accept** | `t_requirementresponse_accept` |

For a Visibility-only line the sequence is shorter: T+0 ∅ → Submitted by the supplier's admin contact (`t_requirementresponse_acknowledge`), then T+1 onward as above from **Start review**.

A revision branches the sequence. Had the supplier pressed **Revise** at T+4 instead of the planner resolving (or after T+5), the revise writes one event: `t_requirementresponse_revise` (actor `supplier:sup-005`, dispatched against `rr-0002`), and `rr-0002` stays Disputed. When the supplier then presses **Submit to buyer** on the new version (numbered from `rr-9001`, v2, bound to `PUB-2026-08-RM-R2`), that dispatch writes two: `t_requirementresponse_promote` and the cascaded `t_requirementresponse_supersede` (actor `buyer:all`, the automation grant; `causationId` = the promote's `correlationId`), which retires `rr-0002` to Superseded. The new version continues with the planner's review.

<!-- src: src/services/transitions/events.ts:26-60; src/services/transitions/events.ts:127-129; src/services/sdc/session.ts:15-27; src/services/data/mock/MockCommandService.ts:948-1020; src/services/data/mock/MockCommandService.ts:1103-1116; src/services/data/mock/MockCommandService.ts:907-942; src/services/data/mock/MockCommandService.ts:2823-2837; src/services/transitions/dispatcher.ts:841-907; src/services/data/mock/MockCommandService.ts:1016-1018 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Confirm** / **Acknowledge** / **Submit to buyer** / **Revise** button, only *Awaiting Supplier Commercial* or *Awaiting Supplier Back Office* | handoff notice in the button's slot; hover reads *Your role cannot take this action.* | the seat does not hold `requirementresponse:submit` (commercial) or `requirementresponse:acknowledge` (back_office) | a seat holding that lane performs the step (`ROLE_NOT_PERMITTED` if forced) |
| No **Confirm** on a Firm / Semi-firm line, only *An answer is already open for this line — continue it from the responses tab.* | My responses holds an answer for that material × period in Draft, Submitted or UnderReview | a second creation over an open answer is refused, so the card does not offer it | submit the draft from My responses, or wait for the planner; once the answer is Accepted or Disputed the card offers **Revise** |
| `POLICY_REJECTED:rr_submit_no_open_sibling` — *an answer is already open for this line (…) — revise it, or submit the draft; a second creation would bury it* | a creation dispatched over an open answer (a hand-built call, or a page rendered before the answer existed) | the thread already holds a non-Superseded answer, across publications | act on the named answer: **Submit to buyer** if it is a Draft, **Revise** if it is Disputed or Accepted |
| `POLICY_REJECTED:rr_review_actor_attributed:RR_REVIEW_ACTOR_UNATTRIBUTED` — toast *No person is named on this seat. Accepting or disputing is a person’s decision — adopt a sample user in the identity panel, then try again.* | **Accept** and **Dispute** are greyed out with the note above them | the seat carries no person (operator ruling: a supplier is never committed, or sent an objection, by nobody) | adopt a sample user in the identity panel (avatar → people) and take the act again |
| `POLICY_REJECTED:rr_revise_no_open_draft:RR_REVISION_ALREADY_DRAFTED` — toast *A revision of this answer is already drafted — submit or continue that draft instead of starting another.* | the revised card reads *Revision {id} is drafted — submit it to answer this* | one draft revision answers an answer; the first is still unsent | submit (or keep editing) the drafted revision |
| A supplier cannot **Confirm** a line it once acknowledged | — | fixed in SDC-3: an acknowledgment is no longer counted as an open answer on a commitment line; if this returns, it is a regression | the line card offers **Confirm**; the newer commitment is the line's answer |
| `POLICY_REJECTED:rr_revise_commitment_only` — *{id} is an acknowledgment — it carries no quantity to revise* | a revision dispatched against an acknowledgment | only a commitment can be revised | none on the page — **Revise** is never offered on an acknowledgment |
| `POLICY_REJECTED:rr_revise_root_cause_when_cut` — *revising accepted {accepted} down to {next} requires a root cause* | revising an Accepted answer below its accepted quantity with no category | an accepted commitment is not cut without saying why | pick a root-cause category in Step 3 (the page asks first, with *Root cause required*) |
| No **Start review** / **Accept** / **Dispute** / **Resolve**, only *Awaiting Planning* | handoff notice at the top of the section | the buyer seat lacks the planning lane | switch to a seat holding `planning` |
| Toast *Quantity required* with a "read two ways" message | typed `40.000` or `40,000` | ambiguous separator — the parser refuses rather than guesses (`AMBIGUOUS_QTY`) | type digits only: `40000` |
| Toast *Root cause required* | quantity below the requested amount — or, on a revision of an Accepted answer, below the accepted quantity | the page requires a category on a short confirmation and on a cut of an accepted one | pick a root-cause category in Step 3 |
| Toast *Confirmation not submitted* naming `POLICY_REJECTED:rr_submit_commitment_class` | pressed Confirm on a Visibility-only line by another route | the class guard refuses a commitment where none was requested | use **Acknowledge** on that line |
| `POLICY_REJECTED:rr_acknowledge_visibility_class` | acknowledging a Firm / Semi-firm line | symmetric class guard | use **Confirm** and give a quantity |
| `POLICY_REJECTED:rr_submit_planversion_bound` | payload plan version differs from the publication's | a stale or hand-built payload | reopen the line from the page so the snapshot keys come from the rendered publication |
| `POLICY_REJECTED:sdc_material_known` — *UNKNOWN_MATERIAL* | material code not in the master | a relationship or line names a code the master lacks | have the code added to the master; nothing is stored with a guessed unit |
| `POLICY_REJECTED:rr_submit_qty_floor` / `rr_submit_qty_agrees` | negative, non-finite, or a number that disagrees with its typed token | hand-built dispatch or a mis-parsed token | resubmit from the page; the number and its token come from one parse |
| `POLICY_REJECTED:rr_dispute_text_authored` | dispute or resolution with a blank text | presence is not substance | write the objection / answer; the panel keeps the commit disabled until you do |
| `MISSING_FIELDS` | dispatch lacks one of publicationId, planVersion, materialCode, periodBucket, confirmedQty, confirmedQtyRaw (or disputeReason / resolutionReason) | a caller outside the page | use the page's builders |
| `ILLEGAL_TRANSITION` | e.g. **Submit to buyer** on a non-Draft, or a buyer verb from the wrong state | the response moved since the screen rendered | reload; act from the section the machine now lists it in |
| `SCOPE_DENIED` (thrown, shown in the toast) | a supplier acting on a line not fanned to it, or on another supplier's response | scope gate, before the role gate; non-existent and foreign look identical on purpose | act only on your own lines and responses |
| `STALE_STATE` | never produced on these surfaces | none of the SDC callers supplies `expectedState` | n/a — reported for completeness |
| Buyer grid still reads **Awaiting** after a supplier "confirmed" | supplier card status is Draft | the draft was saved but not submitted | supplier presses **Submit to buyer** on My responses |
| Supplier's response shows **Disputed** and the planner has not resolved it | actor line *Awaiting Paragon — or revise your answer yourself* | the planner's resolve and the supplier's revise both exit Disputed | planner resolves; or the supplier presses **Revise** and submits the new version |
| A dispute (or an accepted figure) still shows although the supplier says they revised it | the supplier's newest card is a Draft that *Revises {id}*; the revised card reads *Revision {id} is drafted — submit it to answer this* | a revision replaces nothing until it is sent | supplier presses **Submit to buyer** on the revision |
| Line reads **Stale — answered 120 000, now 150 000** | the line's demand (or class) changed in the newer publication | the answer binds a superseded plan version | the supplier cannot answer the line afresh while the stale answer is open; the planner reviews it and accepts or disputes, after which the supplier's **Revise** binds the current publication |
| Chase list shows a supplier as **Overdue** | the supplier's line cards read **Respond by** with the same date and **Overdue** on each line still awaiting | both seats read one deadline — the stored one, or published date + 7 days; the chase counts exactly the lines the supplier's page marks **Overdue** | the supplier answers the marked lines; the entry leaves the chase when none is awaiting |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SDC`, or `MODULE_INACTIVE:SDC.confirmations` when only *Confirmations* is off; where the surface checks first, the control reads *"Switched off — Supplier collaboration"* | the Supplier collaboration module (or one of its parts) is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:556-610; src/services/transitions/dispatcher.ts:731; src/lib/i18n/roles.ts:48-52; src/lib/i18n/sdcSupplier.ts:109-124; src/lib/i18n/sdcSupplier.ts:159-173; src/services/data/mock/MockCommandService.ts:1130-1340; src/pages-v2/SupplierForecasts.tsx:492-518; src/services/sdc/consolidation.ts:473-507; src/services/data/mock/MockCommandService.ts:1256-1306; src/pages-v2/SupplierForecasts.tsx:364-393; src/pages-v2/SupplierForecasts.tsx:1375-1416; src/pages-v2/SupplierForecasts.tsx:434-447; src/services/sdc/consolidation.ts:249-262; src/services/sdc/consolidation.ts:380-404; src/services/sdc/types.ts:322-329; src/lib/i18n/sdcSupplier.ts:30-35; src/lib/i18n/sdcSupplier.ts:57; src/lib/i18n/sdcSupplier.ts:74 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | `rr-0003` | — | sup-002 · RM-EMUL-3320 (Cetearyl Alcohol) · 2026-09 · 2 000 KG against a Semi-firm 2 000 (now 2 600 in the current publication); no `submittedAt`; invisible to the buyer — the line reads **Awaiting** and puts sup-002 on the chase list as Overdue with 1 awaiting line; its line card offers no **Confirm**, only *An answer is already open for this line — continue it from the responses tab.* |
| Submitted | `rr-0001` | — | sup-002 · RM-EMUL-3310 (Glycerin USP 99.5%) · 2026-08 · 6 000 of 6 000 KG Firm, committed date 2026-08-20; answered `PV-2026-08.1`, line unchanged → **Confirmed · carried forward**; listed under *Responses awaiting your review* |
| Submitted | `rr-0004` | — | sup-005 · PK-PETB-8810 (PET Bottle 250ml) · 2026-09 · 120 000 PCS against a line that moved to 150 000 → **Stale — answered 120 000, now 150 000**; still counts as answered for the chase |
| Submitted | `rr-0005` | — | sup-007 · AI-NIAC-6601 (Niacinamide) · 2026-10 · acknowledgment with note against the current publication → **Acknowledged**, Confirmed column shows a dash |
| UnderReview | — | — | no fixture; reach it with **Start review** on any Submitted row, or by resolving `rr-0002` |
| Accepted | — | — | no fixture; reach it with **Accept** from UnderReview; the supplier's card then shows *Accepted by the buyer on {date}* and **Revise** |
| Disputed | `rr-0002` | — | sup-005 · RM-EMUL-3310 · 2026-08 · 3 000 of 3 500 KG Firm → **Short −500 KG · carried forward · Disputed**; root cause capacity / principal-allocation; one `raised` ledger entry dated 2026-08-17; the only row under *Disputes awaiting your resolution*; on a sup-005 seat both its My responses card and its line card offer **Revise** |
| Superseded | — | — | no fixture; reach it by pressing **Revise** on `rr-0002` as sup-005, saving the draft (`rr-0002` stays Disputed) and pressing **Submit to buyer** on it — `rr-0002` turns Superseded (ledger line *You answered it with a revision*) beside the submitted v2; or revise and submit on any Accepted answer |

Context for the tester: publications `PUB-2026-08-RM` (`PV-2026-08.1`, published 2026-08-01) and the current `PUB-2026-08-RM-R2` (`PV-2026-08.2`, published 2026-08-15); horizon 2026-08 (Firm, locked), 2026-09 (Semi-firm), 2026-10 (Visibility only). At the shared clock (2026-08-31 12:00 UTC) the response deadline 2026-08-22 has passed, so the chase list reads sup-007 Overdue · 2 awaiting lines (PK-PETB-8810 2026-08, PK-CAPF-8820 2026-09) and sup-002 Overdue · 1 awaiting line; sup-005 has answered both of its lines and is not chased. Rollups: sup-005 Responded, sup-002 Partial, sup-007 Partial. Responses created live are numbered from `rr-9001` and are stamped with the shared clock; a revision takes the next such number. The sample supplier seats hold all three supplier lanes. The supplier page shows *No deadline set* on every line, because the seed publications carry no stored deadline, and its version banner compares `PV-2026-08.2` with `PV-2026-08.1`.

<!-- src: src/services/sdc/fixtures.ts:891-1140; src/services/sdc/fixtures.ts:1146-1274; src/services/sdc/clock.ts:55; src/services/sdc/consolidation.ts:325-405; src/services/sdc/consolidation.ts:473-507; src/services/data/mock/stores/requirementResponseStore.ts:65-68; src/services/identity/sampleRoster.ts:132-134; src/services/data/mock/MockCommandService.ts:917-942; src/services/data/mock/MockCommandService.ts:995-1005; src/pages-v2/SupplierForecasts.tsx:364-393; src/pages-v2/SupplierForecasts.tsx:434-447; src/pages-v2/SupplierForecasts.tsx:1833-1851; src/services/sdc/types.ts:322-329; src/services/query/sdcSupplierHooks.ts:77-102 -->
