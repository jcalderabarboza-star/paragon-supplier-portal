---
entity: stageResponse
locale: en
title: Stage response (RFI answers; interest at RFI and RFP)
wired: true
owner: portal
source_sha: a18da1b65c172dc400ead1fe8c7cb4a539e4a27a
transitions:
  - t_stageresponse_submit
  - t_stageresponse_save
  - t_stageresponse_resave
  - t_stageresponse_send
---

<!-- section:summary -->
## 1 · What this process is

A stage response is a supplier's answer at the **RFI** or **RFP** stage of a sourcing event — the stages that come before prices are asked for. At an RFI whose event carries a **questionnaire**, the answer is the supplier's answers to it, with an optional note; at an RFP whose event sets **evaluation criteria**, the answer is a **proposal** — a response to each criterion and the names of the documents it refers to; at a stage that asks neither, it is an **acknowledgement of interest** and an optional **note**. The supplier's card says which of the three its stage asks. Paragon's evaluators score proposals after the RFP is closed; a supplier is never shown a score, a ranking or another supplier's proposal.

One role writes it: the supplier's **sales contact** (lane `commercial`), on `/supplier/rfqs`, on the card of an event that is Open at RFI or RFP and to which the supplier is invited. The buyer never edits it. The buyer reads the answers on `/buyer/sourcing`, in the event's panel under "Responses at RFI and RFP" — and, for a questionnaire, in the answer matrix under "RFI questionnaire" — and chooses the shortlist for the next stage from the suppliers who answered — which is what makes answering worth doing: a supplier that says nothing cannot be shortlisted.

Two states. A response is **Submitted** in one act, or it is first saved as a **Draft** that the supplier saves again as often as it likes and then submits. A Draft is the supplier's own: the buyer's read does not carry it, it does not count as a response, and a supplier that only ever saved a draft cannot be shortlisted. Nothing leaves **Submitted** — a submitted answer is a record and is not edited or taken back. A supplier answers each stage once: an answer to the RFI does not stop it answering the RFP that follows. Whether the supplier was then carried forward is a fact about the event, read from the event's advance history, not a state of the response.

Honesty markers. The seeded responses are SIMULATED fixtures on one event (`rfq-018`). The response deadline is measured against the declared present, 31 Aug 2026; the day a response is recorded is stamped from the browser clock. Nothing is sent to Paragon outside the portal, and nobody is notified. No act here belongs to S/4HANA, TMS or the bank. A document question, and a document named on a proposal, record the file's name only: no file is uploaded or kept. A draft lives in the same in-memory store as every other record in this build and is lost when the browser tab is reloaded.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Submitted | operator action (creation) | supplier · commercial | `t_stageresponse_submit` |
| 2 | ∅ → Draft | operator action (creation) | supplier · commercial | `t_stageresponse_save` |
| 3 | Draft → Draft | operator action (state-preserving): the draft as it now stands | supplier · commercial | `t_stageresponse_resave` |
| 4 | Draft → Submitted | operator action | supplier · commercial | `t_stageresponse_send` |

<!-- src: src/services/transitions/flows/stageResponse.flow.ts:1-51; src/data/rfqStage.ts:1-100 -->

**Forks**

- **At Draft:** `t_stageresponse_resave` — commercial — when more has been answered and the supplier wants it kept (the response stays a Draft); `t_stageresponse_send` — commercial — when every required question — or, on a proposal, every required criterion — is answered and the answers should go to Paragon.
- **At Submitted:** no exits. Submitted is the flow's only terminal state.

<!-- section:steps -->
## 3 · Step by step

### t_stageresponse_submit — Submit a response in one act (interest, or the answers to the questionnaire) <!-- transition:t_stageresponse_submit -->

- **Step kind:** operator action (creation)
- **Role:** supplier · commercial (atom `stageresponse:submit`)
- **From → to:** ∅ → Submitted
- **Operator — where:** `/supplier/rfqs` → **Open events** tab → the card of an event at the RFI or RFP stage (the card carries a pill "RFI stage" or "RFP stage" and the "Stages" timeline) → **Record interest** → the note box on the card → **Record interest at <stage>** (or **Cancel**, which records nothing). A fulfilment or back-office seat sees "Awaiting Supplier Commercial" in the button's slot (`handoff-stageresponse-submit`). On an RFI that asks a questionnaire the button reads **Answer the questionnaire** and opens the answer form on the card; **Submit answers** on that form, with no draft saved before, fires this verb. On an RFP that sets criteria the button reads **Write your proposal** and opens the proposal form; **Submit proposal** on that form, with no draft saved before, fires this verb too. The card lists the event's own criteria with their weights under "Evaluation criteria", and says "Paragon scores proposals after the stage closes. Scores, rankings and other suppliers’ proposals are not shown in this portal."
- **Operator — do:** Tell Paragon you want to be considered at this stage. Add a note if there is something the buyer should know when it chooses the shortlist. At an RFI with a questionnaire, answer its questions: every question marked Required must be answered before the answers can be submitted. At an RFP with criteria, respond to each criterion; every criterion marked Required needs a response before the proposal can be submitted.
- **Operator — fill:** *Note to Paragon (optional)* — free text. Nothing else: the event and your supplier come from the card, and the stage is the event's own. On the answer form: one field per question, of the question's kind — Yes / No, one of the listed choices, any of the listed choices, a number in the stated unit, free text, or a file (only the file's name is recorded). On the proposal form: one text box per criterion, showing its weight, its part and Required / Optional; *Documents your proposal refers to (optional)* — one or more files, of which only the names are recorded.
- **Tester — expected state:** Submitted
- **Tester — confirm:** toast "Interest recorded on RFQ-…" / "Paragon can now consider you for the shortlist of the <stage> stage." The card's button is replaced by "Interest recorded at <stage> on <date>"; the "Open RFQs" count drops by one. As the buyer, the event's panel lists the supplier under "Responses at RFI and RFP" with the stage, the day and the note (or "No note."), and "N of M invited suppliers have responded at the <stage> stage" rises by one. Created responses are numbered from `RSP-2026-901`. For a questionnaire: toast "Answers submitted on RFQ-…"; the slot reads "Answers submitted at RFI on <date>" and the card lists the supplier's own answers under the stage note. As the buyer, the supplier is a row of the answer matrix. For a proposal: toast "Proposal submitted on RFQ-…"; the slot reads "Proposal submitted at RFP on <date>" and the card lists the supplier's own response per criterion and "Documents named: …". As the buyer, the supplier is a block under **Proposals** and a row of the ranking.
- **Tester — trigger event:** `t_stageresponse_submit` (actor `supplier:<supplierId>`)
- **Checks that can refuse:** eight hooks, in this order. `stage_response_event_open` — `INTEREST_EVENT_NOT_OPEN` when the event is not Open (the buyer closed bidding, or it ended). `stage_response_stage_takes_interest` — `INTEREST_STAGE_TAKES_QUOTATIONS` when the event is at its RFQ stage, which is answered with a quotation. `stage_response_before_deadline` — `INTEREST_DEADLINE_PASSED` when the stage's response deadline is before the declared present; the deadline day itself is still open. `stage_response_one_per_stage` — `INTEREST_ALREADY_RECORDED` when the supplier already answered this stage. `stage_response_answers_well_formed` — `RESPONSE_ANSWER_INVALID` when a stated answer is for a question the event does not ask at this stage, or is not of that question's kind. `stage_response_required_answered` — `RESPONSE_QUESTION_REQUIRED`, naming each one by number and wording, when a required question of the RFI questionnaire is unanswered; the toast reads "Required and not answered: Q4 “…”…" and each one is marked on the form. `stage_response_proposal_well_formed` — `PROPOSAL_INVALID` when a stated response is for a criterion the event does not set at this stage, is not text, or the documents are not a list of names. `stage_response_criteria_answered` — `PROPOSAL_CRITERION_REQUIRED`, naming each one by number and name, when a required criterion of the RFP has no response; the toast reads "Required and without a response: C2 “…”…" and each one is marked on the form. Before them, scope: the supplier must be on the event's invite list, else `SCOPE_DENIED` — so a supplier left off a shortlist cannot answer the next stage. The card states each rule first: past the deadline it offers no button, and once answered it shows the record.
- **Glossary:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Honesty:** What a response holds depends on the stage: the answers to the questionnaire at an RFI that asks one, the proposal at an RFP that sets criteria, interest and a note otherwise; the card says which. A proposal's documents are names only. A knock-out answer is not a refusal — the supplier is not told which answers are knock-outs, and submitting one succeeds; the buyer reads it in the matrix. A response cannot be edited or taken back. The stage is written by the store from the event, never taken from the request. Paragon is not notified; the buyer reads the response on its next visit to the event.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

### t_stageresponse_save — Save a draft of the answers <!-- transition:t_stageresponse_save -->

- **Step kind:** operator action (creation)
- **Role:** supplier · commercial (atom `stageresponse:submit`)
- **From → to:** ∅ → Draft
- **Operator — where:** `/supplier/rfqs` → **Open events** tab → the card of an event at its RFI stage that asks a questionnaire → **Answer the questionnaire** → the answer form on the card → **Save draft**. A fulfilment or back-office seat sees "Awaiting Supplier Commercial" in the button's slot and gets no form.
- **Operator — do:** Keep what you have answered so far. Nothing is sent to Paragon: a draft is yours until you submit it.
- **Operator — fill:** any of the questions, none of them required at this point; *Note to Paragon (optional)*.
- **Tester — expected state:** Draft
- **Tester — confirm:** toast "Draft saved on RFQ-…" / "Paragon does not see a draft. Submit it before the response deadline." The form closes; the button now reads **Continue your answers** and beside it "Draft saved on <date>. Not submitted — Paragon does not see a draft." The "Open RFQs" count does not drop. As the buyer, nothing changed: the supplier is not in the response count, not in the answer matrix, and cannot be ticked on the shortlist.
- **Tester — trigger event:** `t_stageresponse_save` (actor `supplier:<supplierId>`)
- **Checks that can refuse:** six hooks, in this order: `stage_response_event_open` (`INTEREST_EVENT_NOT_OPEN`), `stage_response_stage_takes_interest` (`INTEREST_STAGE_TAKES_QUOTATIONS`), `stage_response_before_deadline` (`INTEREST_DEADLINE_PASSED`), `stage_response_one_per_stage` (`INTEREST_ALREADY_RECORDED` — the supplier already holds a draft or a submitted response at this stage), `stage_response_answers_well_formed` (`RESPONSE_ANSWER_INVALID` — an answer that is not of its question's kind is refused even in a draft), `stage_response_proposal_well_formed` (`PROPOSAL_INVALID` — a response to a criterion the event does not set, or one that is not text, is refused even in a draft). The required questions and the required criteria are not checked. Scope as for the submit: an invited supplier only.
- **Glossary:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Honesty:** The draft is lost when the browser tab is reloaded, like every record made in this build. A document question keeps the file's name only. The machine also takes a draft at an RFP or at an RFI with no questionnaire (a note-only draft); the card offers **Save draft** only where there is a questionnaire or a proposal to write.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

### t_stageresponse_resave — Save the draft again <!-- transition:t_stageresponse_resave -->

- **Step kind:** operator action (state-preserving)
- **Role:** supplier · commercial (atom `stageresponse:submit`)
- **From → to:** Draft → Draft
- **Operator — where:** the same card → **Continue your answers** → the form opens filled with the draft → **Save draft**.
- **Operator — do:** Add to or change your answers and keep them. The draft is replaced by what the form now holds: an answer you cleared is gone, not kept.
- **Operator — fill:** as for the first save.
- **Tester — expected state:** Draft
- **Tester — confirm:** the same toast; the note beside the button shows the day of this save. Reopening the form shows the answers as last saved. The response keeps its `RSP-` number.
- **Tester — trigger event:** `t_stageresponse_resave` (actor `supplier:<supplierId>`)
- **Checks that can refuse:** five hooks, in this order: `stage_response_event_open` (`INTEREST_EVENT_NOT_OPEN`), `stage_response_draft_stage_current` (`RESPONSE_DRAFT_STAGE_OVER` — the event has moved to a later stage since the draft was written), `stage_response_before_deadline` (`INTEREST_DEADLINE_PASSED`), `stage_response_answers_well_formed` (`RESPONSE_ANSWER_INVALID`), `stage_response_proposal_well_formed` (`PROPOSAL_INVALID`). The event is the draft's own, read from the draft: naming another event in the request changes nothing. Scope: the draft's own supplier only (`SCOPE_DENIED` otherwise). On a Submitted response the verb is `ILLEGAL_TRANSITION`.
- **Glossary:** `POLICY_REJECTED`, `SCOPE_DENIED`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** The whole draft is replaced, never patched. Earlier saves are not kept on the draft; each save is one event in the trail.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

### t_stageresponse_send — Submit the draft <!-- transition:t_stageresponse_send -->

- **Step kind:** operator action
- **Role:** supplier · commercial (atom `stageresponse:submit`)
- **From → to:** Draft → Submitted
- **Operator — where:** the same card → **Continue your answers** → **Submit answers**.
- **Operator — do:** Finish the answers and send them to Paragon. After this they cannot be changed.
- **Operator — fill:** every question marked Required; the rest as you wish.
- **Tester — expected state:** Submitted
- **Tester — confirm:** toast "Answers submitted on RFQ-…" / "Paragon can now read your answers and consider you for the shortlist." The slot reads "Answers submitted at RFI on <date>", the card lists the answers, and the "Open RFQs" count drops by one. No second response is created: the draft itself becomes the answer, under the same `RSP-` number. As the buyer, the supplier is counted, appears in the answer matrix, and can be ticked on the shortlist.
- **Tester — trigger event:** `t_stageresponse_send` (actor `supplier:<supplierId>`)
- **Checks that can refuse:** seven hooks, in this order: `stage_response_event_open` (`INTEREST_EVENT_NOT_OPEN`), `stage_response_draft_stage_current` (`RESPONSE_DRAFT_STAGE_OVER`), `stage_response_before_deadline` (`INTEREST_DEADLINE_PASSED`), `stage_response_answers_well_formed` (`RESPONSE_ANSWER_INVALID`), `stage_response_required_answered` (`RESPONSE_QUESTION_REQUIRED` — the toast names each unanswered required question, each is marked on the form, and the draft stays a Draft with its last saved content), `stage_response_proposal_well_formed` (`PROPOSAL_INVALID`), `stage_response_criteria_answered` (`PROPOSAL_CRITERION_REQUIRED` — the toast names each required criterion with no response, each is marked on the form, and the draft stays a Draft). The answers checked and stored are the ones in the request — the form as it stands — never the draft as last saved.
- **Glossary:** `POLICY_REJECTED`, `SCOPE_DENIED`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Submitting a knock-out answer is not refused and the supplier is not told it is one. Paragon is not notified; the buyer reads the answers on its next visit to the event.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Interest or a quotation (by the event's stage).** Branch A — `t_stageresponse_submit` — **When:** the event is at RFI or RFP. Branch B — `t_quotation_submit` (the quotation guide) — **When:** the event is at RFQ. Each verb refuses the other's stage by name (`INTEREST_STAGE_TAKES_QUOTATIONS`, `QUOTE_STAGE_NOT_RFQ`), and the card offers only the one that applies.
- **What happens after the answer.** Not a transition of this flow. The buyer closes bidding and advances the event (`t_rfq_advance`) with a shortlist taken from the suppliers who answered: a shortlisted supplier finds the event on its card at the next stage and answers again; a supplier left out finds a "Not shortlisted" card with the buyer's reason. Or the buyer concludes the event without an award (`t_rfq_conclude`).
- **A proposal, and its scores.** Not a transition of this flow. At an RFP that sets criteria the supplier's response is a proposal; once the buyer closes bidding, Paragon's evaluators score it per criterion (`t_rfq_proposal_score`, the RFQ guide) and the buyer may start the shortlist from the ranking. None of that is shown to a supplier: its read of the event carries its own proposal and the criteria with their weights, and no score, total, rank, evaluator or other supplier.
- **Not answering.** Not a transition. A supplier that records nothing cannot be shortlisted; when the event advances it reads "Not shortlisted" like any other supplier left out.
- **Save a draft or submit (on the answer form).** Branch A — `t_stageresponse_save` (no draft yet) / `t_stageresponse_resave` (a draft exists) — **When:** the answers are unfinished; nothing reaches Paragon. Branch B — `t_stageresponse_submit` (no draft yet) / `t_stageresponse_send` (a draft exists) — **When:** every required question is answered. The form chooses the verb from whether a draft exists; the supplier presses the same two buttons either way.
- **A knock-out answer.** Not a transition and not a refusal. The buyer may mark one answer of a Yes / No or choice question as a knock-out; a supplier's read of the questionnaire does not carry it. A supplier that gives it is submitted like any other, is marked in the buyer's matrix, and is left unticked when the buyer opens the shortlist — which the buyer may still change.

<!-- src: src/services/transitions/flows/rfq.flow.ts:186-233; src/services/data/rfqSupplierView.ts:60-89; src/pages-v2/SupplierRFQs.tsx:693-722 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| RFI stage / RFP stage | stored field on the event | an event with more than one stage on its path | always, on such an event | `/supplier/rfqs` card pill; "Stages" timeline on the card |
| Interest recorded at <stage> on <date> | derived at read | Submitted | the supplier holds a response at the event's current stage | the card, in the button's slot |
| Response deadline passed | time-driven, derived at read (declared present) | an Open event past its response deadline | the stage's deadline is before 31 Aug 2026 | the card pill, and the note in the button's slot — no way in, for any seat |
| Not shortlisted | derived from the event's advance history | after an advance that left the supplier out | the supplier was invited at a stage and not carried to the next | its own card on `/supplier/rfqs`, with the reason and no action |
| What this stage asks | honesty marker | RFI, RFP | always | the supplier's card: "…asks a questionnaire of N questions…" / "…asks no questionnaire…" / at RFP, "The proposal is not built in this portal yet." |
| Draft saved on <date>. Not submitted — Paragon does not see a draft. | derived at read | Draft | the supplier holds an unsent draft at the event's current stage | the card, beside **Continue your answers** |
| This question is required and has no answer yet. | derived, after a refused submit | the answer form | a required question is unanswered when **Submit answers** is pressed | under that question on the form |
| Only the name of the file is recorded. | honesty marker | the answer form, document questions | always | under the file field |
| Awaiting Supplier Commercial | role handoff | the card's button slot | the seat does not hold `stageresponse:submit` | in place of **Record interest** |

<!-- src: src/pages-v2/SupplierRFQs.tsx:440-470; src/pages-v2/SupplierRFQs.tsx:693-722; src/pages-v2/BuyerSourcing.tsx:4040-4090; src/pages-v2/sourcing/StageTimeline.tsx:1-87; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `rsp-001` (supplier `sup-002`, event `rfq-018`, stage RFI, with a note).

| Joins to | By | Note |
|---|---|---|
| Sourcing event | `rfqId` | `rfq-018`, started at RFI and now Open at RFP; the event carries the stage, the deadline and the advance history |
| Stage | `stage` | written by the store from the event at the moment of the answer; one response per supplier per stage |
| Supplier | `supplierId` | the owner: a supplier reads its own responses only, attached to the event it reads |
| Shortlist outcome | the event's `stageHistory` | `sup-002` answered the RFI (`rsp-001`) and was not carried to the RFP; the reason is on the event, not on the response |
| Questionnaire | the event's `questionnaire` | written by the buyer on the draft event (`t_rfq_questionnaire_set`, the rfq guide); a supplier reads the questions without their knock-out answers |
| Answers | `answers`, keyed by question id | present on a response to an RFI that asks a questionnaire; a document answer is a file name |

Display-only: the buyer's "N of M invited suppliers have responded" counts responses at the event's current stage, so it restarts when the event advances. `respondedAt` is stamped by the store. `status` is stored on a Draft only; a response that states none is Submitted.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/rfqStore.ts:30-50; src/services/data/rfqSupplierView.ts:30-89 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id (`t_stageresponse_submit`, `_save`, `_resave` or `_send`), `actor` = `supplier:<supplierId>`, a timestamp, the outcome and a `correlationId`. A response submitted in one act has one event; one that was drafted has its save, each re-save and its send; the story of a supplier on an event is its response at each stage, beside the event's own advances.

Worked sequence for `sup-005` on `rfq-018`:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Submitted (`rsp-002`, seeded, RFI) | supplier · commercial | **Record interest** at the RFI stage | `t_stageresponse_submit` |
| T+1 | (the event) Closed → Open at RFP | buyer · procurement | **Advance to RFP** with sup-005 and sup-007 shortlisted | `t_rfq_advance` |
| T+2 | ∅ → Submitted (`rsp-004`, seeded, RFP) | supplier · commercial | **Record interest** at the RFP stage | `t_stageresponse_submit` |

<!-- src: src/services/transitions/events.ts:26-60; src/services/data/mock/MockCommandService.ts:651-685 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| "Proposal not submitted" with "Required and without a response: C2 “…”…" | the named criteria are marked on the form: "This criterion is required and has no response yet." | `PROPOSAL_CRITERION_REQUIRED` | write the response and submit again, or **Save draft** |
| "One of the responses could not be read as text, or answers a criterion this event does not set…" | the toast after Save draft or Submit proposal | `PROPOSAL_INVALID` — reachable only by a hand-made request; the form sends text for the event's own criteria | correct the request |
| The card shows no score for a submitted proposal | "Paragon scores proposals after the stage closes. Scores, rankings and other suppliers’ proposals are not shown in this portal." | by design: scores are the buyer's | ask your Paragon buyer |
| No **Record interest**, only "Awaiting Supplier Commercial" | handoff notice in the button's slot | the seat does not hold `stageresponse:submit` (commercial) | a seat holding the commercial lane records it (`ROLE_NOT_PERMITTED` if forced) |
| No **Record interest**, only "The response deadline (…) has passed." | the card pill reads "Response deadline passed" | `INTEREST_DEADLINE_PASSED` — the stage's deadline is before the declared present | nothing to do on this stage; the buyer may reopen or advance the event |
| The card shows **Submit quote** instead | the pill reads "RFQ stage", or the card has no stage pill | the event is at RFQ, which takes a quotation (`INTEREST_STAGE_TAKES_QUOTATIONS` if forced) | submit a quotation |
| "Interest not recorded" with "Your interest is already recorded at this stage…" | the card already reads "Interest recorded at <stage> on <date>" | `INTEREST_ALREADY_RECORDED` — one response per stage | nothing to do; answer again when the event reaches its next stage |
| "Interest not recorded" with "This sourcing event is no longer open, so responses are not taken on it…" | the buyer's board shows the event Closed, Awarded, Concluded or Cancelled | `INTEREST_EVENT_NOT_OPEN` — bidding was closed while the card stood open | reload; the buyer may reopen the stage |
| The event is on the card list as "Not shortlisted" | the card states the stage, the day and the reason | the buyer advanced the event and did not carry this supplier | none in the portal; the reason is the buyer's |
| `SCOPE_DENIED` (thrown; shown in the toast) | a supplier answering an event it is not invited to, or one it was left off | scope gate ahead of the role gate | answer only the events on your own card list |
| `MISSING_FIELDS` | a dispatch without `rfqId` | a caller outside the page | use the card |
| `ILLEGAL_TRANSITION` | a save or a submit aimed at a response that is already Submitted | a caller outside the page; the card offers neither once the answers are submitted | nothing to do — a submitted answer is not edited |
| "Answers not submitted" with "Required and not answered: Q… “…”" | the named questions are marked on the form | `RESPONSE_QUESTION_REQUIRED` — a required question has no answer | answer them and submit again, or **Save draft** |
| "Draft not saved" / "Answers not submitted" with "One of the answers is not of the kind its question asks for…" | a number field holds something that is not a number | `RESPONSE_ANSWER_INVALID` | correct the answer |
| "This draft was written for a stage the event has since left…" | the card shows the event at a later stage, or as "Not shortlisted" | `RESPONSE_DRAFT_STAGE_OVER` — the draft was never submitted and the buyer advanced the event | nothing to do; a draft is not an answer |
| The buyer does not see the answers | the card reads "Draft saved … Not submitted" | the response is still a Draft | **Continue your answers** → **Submit answers** |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SRC`; where the surface checks first, the control reads *"Switched off — Sourcing events"* | the Sourcing events module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/policies.ts:286-342; src/pages-v2/SupplierRFQs.tsx:127-143; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:testdata -->
## 9 · Test data

Fixtures are SIMULATED and sit on one event, `rfq-018` (RFQ-2026-018, "PET Bottle 250ml Flip-Top — refill programme, new formats"), which started at RFI and is Open at RFP with a response deadline of 14 Sep 2026.

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Submitted | `rsp-001`, `rsp-002`, `rsp-003`, `rsp-004` | — | `rsp-001`: sup-002 at RFI, with a note — not carried to the RFP, so the sup-002 seat opens on a "Not shortlisted" card with the reason. `rsp-002`: sup-005 at RFI. `rsp-003`: sup-007 at RFI, no note. `rsp-004`: sup-005 at RFP — the sup-005 seat reads "Interest recorded at RFP". The sup-007 seat has not answered the RFP and can **Record interest** |
| Draft | — | — | no fixture; as an invited supplier, open the questionnaire on an RFI and press **Save draft** |

Responses created live are numbered from `RSP-2026-901`. To produce an RFI from nothing: as the buyer (with a sample person adopted), raise an event with "Start at stage" RFI, publish it, then record interest as each invited supplier seat. To ask a questionnaire: before publishing, open the draft and use **Write questionnaire** (the rfq guide, `t_rfq_questionnaire_set`). No seeded event carries one.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/stageResponseStore.ts:1-46 -->
