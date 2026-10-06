---
entity: stageResponse
locale: en
title: Stage response (interest at RFI and RFP)
wired: true
owner: portal
source_sha: c3b7e77d98f5b24811dcbfc654d76b5e185e5f0c
transitions:
  - t_stageresponse_submit
---

<!-- section:summary -->
## 1 · What this process is

A stage response is a supplier's answer at the **RFI** or **RFP** stage of a sourcing event — the stages that come before prices are asked for. In this build the answer is an **acknowledgement of interest** and an optional **note**, and nothing else: the RFI questionnaire, the RFP proposal and their scoring are not built. The surface says so on the supplier's card and on the buyer's panel.

One role writes it: the supplier's **sales contact** (lane `commercial`), on `/supplier/rfqs`, on the card of an event that is Open at RFI or RFP and to which the supplier is invited. The buyer never edits it. The buyer reads the answers on `/buyer/sourcing`, in the event's panel under "Responses at RFI and RFP", and chooses the shortlist for the next stage from the suppliers who answered — which is what makes answering worth doing: a supplier that says nothing cannot be shortlisted.

There is no lifecycle to walk. A response is born in its one state, **Submitted**, and never leaves it. A supplier answers each stage once: an answer to the RFI does not stop it answering the RFP that follows. Whether the supplier was then carried forward is a fact about the event, read from the event's advance history, not a state of the response.

Honesty markers. The seeded responses are SIMULATED fixtures on one event (`rfq-018`). The response deadline is measured against the declared present, 31 Aug 2026; the day a response is recorded is stamped from the browser clock. Nothing is sent to Paragon outside the portal, and nobody is notified. No act here belongs to S/4HANA, TMS or the bank.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Submitted | operator action (creation) | supplier · commercial | `t_stageresponse_submit` |

<!-- src: src/services/transitions/flows/stageResponse.flow.ts:1-51; src/data/rfqStage.ts:1-100 -->

**Forks**

- **At Submitted:** no exits. Submitted is the flow's initial and only terminal state.

<!-- section:steps -->
## 3 · Step by step

### t_stageresponse_submit — Record interest at an RFI or RFP stage <!-- transition:t_stageresponse_submit -->

- **Step kind:** operator action (creation)
- **Role:** supplier · commercial (atom `stageresponse:submit`)
- **From → to:** ∅ → Submitted
- **Operator — where:** `/supplier/rfqs` → **Open events** tab → the card of an event at the RFI or RFP stage (the card carries a pill "RFI stage" or "RFP stage" and the "Stages" timeline) → **Record interest** → the note box on the card → **Record interest at <stage>** (or **Cancel**, which records nothing). A fulfilment or back-office seat sees "Awaiting Supplier Commercial" in the button's slot (`handoff-stageresponse-submit`).
- **Operator — do:** Tell Paragon you want to be considered at this stage. Add a note if there is something the buyer should know when it chooses the shortlist.
- **Operator — fill:** *Note to Paragon (optional)* — free text. Nothing else: the event and your supplier come from the card, and the stage is the event's own.
- **Tester — expected state:** Submitted
- **Tester — confirm:** toast "Interest recorded on RFQ-…" / "Paragon can now consider you for the shortlist of the <stage> stage." The card's button is replaced by "Interest recorded at <stage> on <date>"; the "Open RFQs" count drops by one. As the buyer, the event's panel lists the supplier under "Responses at RFI and RFP" with the stage, the day and the note (or "No note."), and "N of M invited suppliers have responded at the <stage> stage" rises by one. Created responses are numbered from `RSP-2026-901`.
- **Tester — trigger event:** `t_stageresponse_submit` (actor `supplier:<supplierId>`)
- **Checks that can refuse:** four hooks, in this order. `stage_response_event_open` — `INTEREST_EVENT_NOT_OPEN` when the event is not Open (the buyer closed bidding, or it ended). `stage_response_stage_takes_interest` — `INTEREST_STAGE_TAKES_QUOTATIONS` when the event is at its RFQ stage, which is answered with a quotation. `stage_response_before_deadline` — `INTEREST_DEADLINE_PASSED` when the stage's response deadline is before the declared present; the deadline day itself is still open. `stage_response_one_per_stage` — `INTEREST_ALREADY_RECORDED` when the supplier already answered this stage. Before them, scope: the supplier must be on the event's invite list, else `SCOPE_DENIED` — so a supplier left off a shortlist cannot answer the next stage. The card states each rule first: past the deadline it offers no button, and once answered it shows the record.
- **Glossary:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Interest and a note are all a response holds in this build; the card says "The questionnaire and the proposal are not built in this portal yet." A response cannot be edited or taken back. The stage is written by the store from the event, never taken from the request. Paragon is not notified; the buyer reads the response on its next visit to the event.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:30-48; src/services/transitions/policies.ts:286-342; src/services/data/mock/MockCommandService.ts:651-685; src/services/data/rfqSourcingGate.ts:453-492; src/pages-v2/SupplierRFQs.tsx:127-143; src/pages-v2/SupplierRFQs.tsx:560-600; src/pages-v2/SupplierRFQs.tsx:1135-1167; src/services/query/commandHooks.ts:619-642; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Interest or a quotation (by the event's stage).** Branch A — `t_stageresponse_submit` — **When:** the event is at RFI or RFP. Branch B — `t_quotation_submit` (the quotation guide) — **When:** the event is at RFQ. Each verb refuses the other's stage by name (`INTEREST_STAGE_TAKES_QUOTATIONS`, `QUOTE_STAGE_NOT_RFQ`), and the card offers only the one that applies.
- **What happens after the answer.** Not a transition of this flow. The buyer closes bidding and advances the event (`t_rfq_advance`) with a shortlist taken from the suppliers who answered: a shortlisted supplier finds the event on its card at the next stage and answers again; a supplier left out finds a "Not shortlisted" card with the buyer's reason. Or the buyer concludes the event without an award (`t_rfq_conclude`).
- **Not answering.** Not a transition. A supplier that records nothing cannot be shortlisted; when the event advances it reads "Not shortlisted" like any other supplier left out.

<!-- src: src/services/transitions/flows/rfq.flow.ts:186-233; src/services/data/rfqSupplierView.ts:60-89; src/pages-v2/SupplierRFQs.tsx:693-722 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| RFI stage / RFP stage | stored field on the event | an event with more than one stage on its path | always, on such an event | `/supplier/rfqs` card pill; "Stages" timeline on the card |
| Interest recorded at <stage> on <date> | derived at read | Submitted | the supplier holds a response at the event's current stage | the card, in the button's slot |
| Response deadline passed | time-driven, derived at read (declared present) | an Open event past its response deadline | the stage's deadline is before 31 Aug 2026 | the card pill, and the note in the button's slot — no way in, for any seat |
| Not shortlisted | derived from the event's advance history | after an advance that left the supplier out | the supplier was invited at a stage and not carried to the next | its own card on `/supplier/rfqs`, with the reason and no action |
| Interest and a note only | honesty marker | RFI, RFP | always | the supplier's card; the buyer's panel above the response list; the wizard under the start-stage choice |
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

Display-only: the buyer's "N of M invited suppliers have responded" counts responses at the event's current stage, so it restarts when the event advances. `respondedAt` is stamped by the store. No status field is stored on the object.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/rfqStore.ts:30-50; src/services/data/rfqSupplierView.ts:30-89 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = `t_stageresponse_submit`, `actor` = `supplier:<supplierId>`, a timestamp, the outcome and a `correlationId`. Because the object has one state and no exits, its history is one event per response; the story of a supplier on an event is its response at each stage, beside the event's own advances.

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
| No **Record interest**, only "Awaiting Supplier Commercial" | handoff notice in the button's slot | the seat does not hold `stageresponse:submit` (commercial) | a seat holding the commercial lane records it (`ROLE_NOT_PERMITTED` if forced) |
| No **Record interest**, only "The response deadline (…) has passed." | the card pill reads "Response deadline passed" | `INTEREST_DEADLINE_PASSED` — the stage's deadline is before the declared present | nothing to do on this stage; the buyer may reopen or advance the event |
| The card shows **Submit quote** instead | the pill reads "RFQ stage", or the card has no stage pill | the event is at RFQ, which takes a quotation (`INTEREST_STAGE_TAKES_QUOTATIONS` if forced) | submit a quotation |
| "Interest not recorded" with "Your interest is already recorded at this stage…" | the card already reads "Interest recorded at <stage> on <date>" | `INTEREST_ALREADY_RECORDED` — one response per stage | nothing to do; answer again when the event reaches its next stage |
| "Interest not recorded" with "This sourcing event is no longer open, so responses are not taken on it…" | the buyer's board shows the event Closed, Awarded, Concluded or Cancelled | `INTEREST_EVENT_NOT_OPEN` — bidding was closed while the card stood open | reload; the buyer may reopen the stage |
| The event is on the card list as "Not shortlisted" | the card states the stage, the day and the reason | the buyer advanced the event and did not carry this supplier | none in the portal; the reason is the buyer's |
| `SCOPE_DENIED` (thrown; shown in the toast) | a supplier answering an event it is not invited to, or one it was left off | scope gate ahead of the role gate | answer only the events on your own card list |
| `MISSING_FIELDS` | a dispatch without `rfqId` | a caller outside the page | use the card |
| `ILLEGAL_TRANSITION` / `STALE_STATE` | never produced here | the flow has no non-creation verb | n/a |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SRC`; where the surface checks first, the control reads *"Switched off — Sourcing & RFQ"* | the Sourcing & RFQ module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/policies.ts:286-342; src/pages-v2/SupplierRFQs.tsx:127-143; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:testdata -->
## 9 · Test data

Fixtures are SIMULATED and sit on one event, `rfq-018` (RFQ-2026-018, "PET Bottle 250ml Flip-Top — refill programme, new formats"), which started at RFI and is Open at RFP with a response deadline of 14 Sep 2026.

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Submitted | `rsp-001`, `rsp-002`, `rsp-003`, `rsp-004` | — | `rsp-001`: sup-002 at RFI, with a note — not carried to the RFP, so the sup-002 seat opens on a "Not shortlisted" card with the reason. `rsp-002`: sup-005 at RFI. `rsp-003`: sup-007 at RFI, no note. `rsp-004`: sup-005 at RFP — the sup-005 seat reads "Interest recorded at RFP". The sup-007 seat has not answered the RFP and can **Record interest** |

Responses created live are numbered from `RSP-2026-901`. To produce an RFI from nothing: as the buyer (with a sample person adopted), raise an event with "Start at stage" RFI, publish it, then record interest as each invited supplier seat.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/stageResponseStore.ts:1-46 -->
