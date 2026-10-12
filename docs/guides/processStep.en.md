---
entity: processStep
locale: en
title: Step added by a change to a process (process step)
wired: true
owner: portal
source_sha: 8da750995f72eae9967d9961193acdfc8a787077
transitions:
  - t_step_complete
  - t_step_decline
---

<!-- section:summary -->
## 1 · What this process is

The record of the steps that a change to a process added. A change, once it is in force, puts steps in front of acts a process already has: an approval, a confirmation, or a step that captures data. While such a step is open, the act behind it is refused and the document does not move. This process is where a step is completed, or — for an approval — declined. It is kept as an append-only **ledger**: one record per completion or decline, never edited and never removed.

What is commanded is **one step on one document**, named `<process>:<document>:<step>`. Nothing in the payload names any of the three, so the step commanded and the step recorded cannot disagree.

**A step is due** when three things hold: the version that defines it is in force; the document is where the act behind the step can be taken; and the steps ordered before it, in front of the same act, are done. A step has no deadline. It is due because of where the document is, never because of the day.

Who touches it: **every buyer-side lane** holds the one permission, `step:complete` — procurement, receiving, finance, compliance, planning and the requisitioner — and so do Admin and Super Admin. That permission is not what decides who may take a given step. **Which lane may take a step is the step's own lane**, set by the person who wrote the change. A seat holds a step's lane when it holds every permission that lane holds. No supplier seat may act here.

Honest markers, stated plainly:

- **No step exists until somebody puts a change in force.** Nothing is in force at seed, so the ledger opens empty and no document meets a step.
- **Step records are kept in memory.** They are lost on reload, with the documents they belong to. The versions themselves survive a reload in the browser; the record of who met their steps does not, until a backend exists.
- **A due step shows on the document.** On the document's panel a line reads **Added step** — *"{step}. Waiting for {lane}."* A seat that holds the step's lane gets **Open step**, which opens a pop-up with the instruction, any fields, the earlier steps and who completed them, and the buttons. The line stands on seven buyer pages: requisitions, purchase orders, goods receipts, invoices, sourcing events, material requests and supplier applications. The page's own button for the gated act is unchanged; pressed while a step is due, it answers with a sentence naming the step and the lane.
- **A declined approval keeps the act refused.** The step can be decided again, and the latest decision counts.
- **A completion is used up when the act behind it succeeds.** A document that comes round to the same act meets the step again.
- **A completion counts only under the version it was taken under.** When another version comes into force, steps completed under the earlier one do not count for it.
- A step is recorded against the person who took it. There is no user directory yet, so that person is a sample identity adopted on the identity panel. A seat that names nobody is refused.
<!-- src: src/services/transitions/flows/processStep.flow.ts:1-58; src/services/data/mock/processStepTarget.ts:1-32,95-116; src/services/flowBuilder/flowOverlay.ts:1-21,63-133,137-149; src/services/flowBuilder/stepLedger.ts:1-40; src/services/transitions/businessRoles.ts:150-155,281-292,309-311,387-391,437-439 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Recorded | a step exists because the version in force defines it and the document exists (no creation act; any other key is `NOT_FOUND`) | — | — |
| 1 | Recorded → same state | records a fact (state-preserving): one completion is appended to the ledger | buyer · the step's own lane | `t_step_complete` |
| 2 | Recorded → same state | records a fact (state-preserving): one decline is appended to the ledger; approval steps only | buyer · the step's own lane | `t_step_decline` |

Both acts repeat: a step can be decided again, and a step that was used up is due again the next time its document comes to the same act.

**Forks**

No state has two exits. The decision sits in which act is taken:

- **At Recorded, an approval step:** `t_step_complete` — the step's lane — when the approval is given; the act behind the step can then be taken. `t_step_decline` — the step's lane — when it is refused, with the reason; the act behind the step stays refused.
- **At Recorded, a confirmation or a data-capture step:** `t_step_complete` only. Such a step is completed, not declined.
<!-- src: src/services/transitions/flows/processStep.flow.ts:22-58; src/services/data/mock/processStepTarget.ts:23-32,84-96 -->

<!-- section:steps -->
## 3 · Step by step

### t_step_complete — Complete the step <!-- transition:t_step_complete -->

- **Step kind:** records a fact (state-preserving) · operator action
- **Role:** buyer · the step's own lane (atom `step:complete`, held by every buyer-side lane and by Admin and Super Admin; the seat must also hold every permission of the lane the step names)
- **From → to:** Recorded → same state
- **Operator — where:** the page of the document the step is on — `/buyer/purchase-requisition`, `/buyer/orders`, `/buyer/goods-receipt`, `/buyer/invoices`, `/buyer/sourcing`, `/buyer/material-requests` or `/buyer/supplier-applications` — → open the document → on its panel, the line **Added step** → **Open step** → the pop-up named after the step → **Complete step** (on an approval step the button reads **Approve**). **Open step** is shown only to a seat that holds the step's lane; any other seat reads which lane the step waits for.
- **Operator — do:** read the pop-up: under the title, *"Added by version {version} of this process · completed by {lane}"*, then the step's instruction, and the earlier steps as *"“{step}” — completed by {person}"*. Do what the instruction asks. For a data-capture step, fill in the fields; a required one is marked with an asterisk. Press **Complete step**, or **Approve** on an approval step. The act behind the step can then be taken with the page's own button.
- **Operator — fill:** `values` — for a data-capture step, one value per field the step defines; every field marked required must be given. Other steps need nothing. Who completed it comes from the session and when from the store; neither is a field, and which step and which document are the key the act is commanded on.
- **Tester — expected state:** Recorded (unchanged)
- **Tester — confirm:** toast *"Step completed: {step}."*; the pop-up closes and the line **Added step** leaves the panel, or shows the next step in front of the same act. The ledger gains one record: the process, the document and the step, the version it was taken under, the decision *completed*, who, when, and the values given. If no other step is open in front of the same act, the page's own button is no longer refused as `STEP_PENDING`. After the act succeeds, the record is marked used.
- **Tester — trigger event:** `t_step_complete`
- **Checks that can refuse:** in this order. `step_actor_named` — the seat must name a person (`STEP_ACTOR_UNATTRIBUTED`). `step_may_be_taken` — the key names no step of the version in force (`STEP_UNKNOWN`); the step is not due on this document — it is done, an earlier step is still open, or the document is not where the act behind it can be taken (`STEP_NOT_DUE`); the seat does not hold the step's lane (`STEP_LANE_NOT_HELD`); the person completed an earlier step that this step must be completed by a different person from (`STEP_COMPLETER_IS_EARLIER_COMPLETER` — route it to somebody else; a Super Admin passes with a recorded one-line reason, and without one is refused as `SUPER_ADMIN_REASON_REQUIRED`). `step_fields_given` — a required field of a data-capture step was left empty; the refusal names each (`STEP_FIELD_MISSING`). Before these: a supplier seat is refused at scope; a key that names no step of the version in force, or a document its process does not hold, is `NOT_FOUND`; a seat without `step:complete` is `ROLE_NOT_PERMITTED`; a payload carrying a key the platform keeps for the person acting is `ACTOR_IN_PAYLOAD`.
- **Glossary:** `STEP_PENDING` · `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Honesty:** the line and the pop-up grant nothing: **Open step** is shown by the same lane rule the dispatcher's check uses, and the act is still decided by the dispatcher. A refusal is shown as a toast in the reader's language and the pop-up stays open. Above the buttons the pop-up says which seat this is: *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."*, or that it will be recorded against the sample person. The record is kept in memory and is lost on reload. The time recorded is the portal's declared present, not the wall clock. Holding `step:complete` is not enough: a seat that holds another lane is refused by name.
<!-- src: src/services/transitions/flows/processStep.flow.ts:30-42; src/services/data/mock/processStepTarget.ts:23-82,95-116; src/services/transitions/policies.ts:2864-2873,2965-2972; src/services/flowBuilder/flowOverlay.ts:63-149,206-212; src/services/flowBuilder/stepLedger.ts:17-70; src/services/identity/superAdmin.ts:36-50 -->

### t_step_decline — Decline an approval step <!-- transition:t_step_decline -->

- **Step kind:** records a fact (state-preserving) · operator action
- **Role:** buyer · the step's own lane (atom `step:complete`, held by every buyer-side lane and by Admin and Super Admin; the seat must also hold every permission of the lane the step names)
- **From → to:** Recorded → same state
- **Operator — where:** the page of the document the step is on — `/buyer/purchase-requisition`, `/buyer/orders`, `/buyer/goods-receipt`, `/buyer/invoices`, `/buyer/sourcing`, `/buyer/material-requests` or `/buyer/supplier-applications` — → open the document → on its panel, the line **Added step** → **Open step** → the pop-up named after the step → **Decline** → write **Why it is declined** → **Confirm decline**. **Decline** stands on an approval step only, and **Open step** only for a seat that holds the step's lane.
- **Operator — do:** press **Decline**; the pop-up asks why. Write the reason and press **Confirm decline**, the destructive button; **Cancel** goes back to the step. The act behind the step stays refused until the step is decided again and completed.
- **Operator — fill:** **Why it is declined** (`reason`, required) — in words. **Confirm decline** stays disabled while it is empty.
- **Tester — expected state:** Recorded (unchanged)
- **Tester — confirm:** toast *"Step declined: {step}."*; the pop-up closes and the line now reads *"{step} was declined. Waiting for {lane} to decide again."* Opened again, the pop-up shows **This step was declined** — *"{person} declined it: “{reason}”. It can be decided again."* The ledger gains one record with the decision *declined*, who, when and the reason. The page's own button for the act answers *"Not yet: the step “{step}” was declined by {person} — “{reason}”. It waits for {lane} to decide again. Nothing was changed."* (`STEP_PENDING`, its detail ending in `:declined`). Completing the step afterwards lifts the refusal: the latest decision counts.
- **Tester — trigger event:** `t_step_decline`
- **Checks that can refuse:** in this order. `step_actor_named` — the seat must name a person (`STEP_ACTOR_UNATTRIBUTED`). `step_may_be_taken` — the same four as for completing: `STEP_UNKNOWN`, `STEP_NOT_DUE`, `STEP_LANE_NOT_HELD`, `STEP_COMPLETER_IS_EARLIER_COMPLETER`. `step_decline_reasoned` — the step is not an approval; a confirmation or a data-capture step is completed, not declined (`STEP_NOT_AN_APPROVAL`); or the reason is only spaces (`STEP_DECLINE_REASON_BLANK`). Before these: a payload with no `reason` is `MISSING_FIELDS:reason`; a key that names no step is `NOT_FOUND`; a seat without `step:complete` is `ROLE_NOT_PERMITTED`.
- **Glossary:** `STEP_PENDING` · `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Honesty:** declining does not move the document and does not end anything: it records that the approval was refused, and the step stays open. The record is kept in memory and is lost on reload.
<!-- src: src/services/transitions/flows/processStep.flow.ts:43-56; src/services/data/mock/processStepTarget.ts:34-72,84-116; src/services/transitions/policies.ts:2864-2873,2965-2972; src/services/flowBuilder/flowOverlay.ts:86-113,151-176 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Complete or decline (at Recorded, an approval step).** Branch A — `t_step_complete` — **When:** the lane gives the approval. Branch B — `t_step_decline` — **When:** the lane refuses it; the reason is required and the act behind the step stays refused.
- **Which lane may take the step (before the act).** The step names one lane. A seat holds it when it holds every permission that lane holds: a seat that adopted the lane does, a custom role built on that lane does, and Admin and Super Admin do. Any other seat is refused as `STEP_LANE_NOT_HELD`, even though it holds `step:complete`.
- **The step is not due (exception).** Refused as `STEP_NOT_DUE` when the step is already done, when a step ordered before it in front of the same act is still open, or when the document is not in a state the act behind the step can be taken from. Steps in front of one act are taken in their order.
- **A different person from an earlier step (exception).** Where the change rules that this step is completed by a different person from whoever completed a named earlier step, the same person is refused as `STEP_COMPLETER_IS_EARLIER_COMPLETER`. A Super Admin passes with a recorded one-line reason; the record and the event name the check that stood aside.
- **Seat names no person (exception).** Refused as `POLICY_REJECTED:step_actor_named` (`STEP_ACTOR_UNATTRIBUTED`). Nothing is recorded. Adopt a sample user on the identity panel, then take the act again.
- **A required field left empty (exception).** Completing a data-capture step without a value for a required field is refused as `STEP_FIELD_MISSING`, naming each field.
- **Declining a step that is not an approval (exception).** Refused as `STEP_NOT_AN_APPROVAL`. A decline with a reason of spaces only is refused as `STEP_DECLINE_REASON_BLANK`; with no reason at all, as `MISSING_FIELDS:reason`.
- **A key that names no step (exception).** A key whose process is not registered, whose document that process does not hold, or whose step the version in force does not define is `NOT_FOUND`. The check gives the same answer by name (`STEP_UNKNOWN`). A step is never created by naming it.
- **The gated act, while a step is open (at the act, not here).** The dispatcher refuses the act as `STEP_PENDING`, with `<process>:<document>:<step>` as its detail, and `:declined` after it when the latest decision on the step was a decline. The page's own button for the act is unchanged and answers *"Not yet: the step “{step}” must be completed first. It is waiting for {lane}. Nothing was changed."* It is asked after the role check and after legality, so a seat without the right learns nothing about the document, and before the checks the process already has.
- **Whoever completed the step may not then take the act (at the act, not here).** Where the change rules it, the person who completed the step is refused the act as `STEP_COMPLETER_MAY_NOT_ACT`, under the name `added_check`, after every check the process already has passed. A Super Admin passes with a recorded one-line reason.
- **The version is retired, replaced or set aside (derived, not an act).** Its steps are no longer due, and a key that names one is `NOT_FOUND`. Records already written are kept.
<!-- src: src/services/data/mock/processStepTarget.ts:23-96; src/services/flowBuilder/flowOverlay.ts:36-62,99-133,137-214; src/services/transitions/dispatcher.ts:319,881-889,923-936; src/services/transitions/refusals.ts:108-120; src/services/transitions/policies.ts:2965-2972 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| **Added step** — *"{step}. Waiting for {lane}."* with **Open step** | derived at read | Recorded | the version that defines the step is in force, the document is where the act behind it can be taken, the steps before it are done, and it has no unused completion; **Open step** only for a seat that holds the step's lane | the document's panel, ahead of the line that says who acts next, on the seven buyer pages |
| **Added step** — *"{step} was declined. Waiting for {lane} to decide again."* | derived at read | Recorded | the latest decision on the step was a decline | the document's panel; the pop-up adds **This step was declined** with who declined it and why |
| *"Not yet: the step “{step}” must be completed first. It is waiting for {lane}. Nothing was changed."* | refusal at the gated act (`STEP_PENDING` naming `<process>:<document>:<step>`) | — | the act behind an open step is attempted with the page's own button | the toast of that act |
| *"Not yet: the step “{step}” was declined by {person} — “{reason}”. It waits for {lane} to decide again. Nothing was changed."* | refusal at the gated act (`STEP_PENDING` with `:declined` after the step) | Recorded | the latest decision on the step was a decline | the toast of that act |
| Completion used | recorded by the platform | Recorded | the act behind the step succeeded after the step was completed | the ledger record (`used`); no surface |
| A check that stood aside for a Super Admin | recorded with the act | Recorded | a Super Admin completed a step that an earlier step of theirs barred, with a one-line reason | the ledger record and the event |
| The step's version, on every record | recorded with the act | Recorded | always | the ledger record (`versionLabel`); a completion counts only under that version |
<!-- src: src/services/flowBuilder/flowOverlay.ts:79-133,151-214; src/services/flowBuilder/stepLedger.ts:17-70; src/services/data/mock/processStepTarget.ts:101-115; src/lib/glossary/refusals.glossary.ts:78-83; src/services/transitions/refusals.ts:108-120 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** none exists at seed. A step's key is `<process>:<document>:<step>`: the process the change is about, the id of the document in that process, and the step's id in the change.

| Joins to | By | Note |
|---|---|---|
| The change that defines the step | the version in force for the process; `versionId`, `versionLabel` on each record | see the *Change to a process* guide. Only the version in force defines steps; a draft, an approved or a retired version defines none |
| The document the step is on | the middle part of the key | read through the command target of its own process; a document that process does not hold makes the key `NOT_FOUND` |
| The act the step stands in front of | `before`, on the step | the act is refused while the step is open, and uses up the completions in front of it when it succeeds |
| The lane that completes the step | `lane`, on the step | one buyer-side lane; the seat must hold every permission that lane holds |
| The steps before it | `order`, on each step in front of the same act | taken in order; a later step is not due while an earlier one is open |
| Who must be a different person | `differentFrom`, on the step | names earlier steps in front of the same act |
| Who may not then take the act | `completerMayNotAct`, on the step | asked when the act is taken, not when the step is completed |
| The fields a data-capture step asks for | `fields`, on the step | each has a name, a type and whether it is required; the values are kept on the record |
| Ledger record | `entity`, `docId`, `stepId`, `versionId`, `versionLabel`, `decision`, `by`, `at`, `reason`, `values`, `used` | append-only; `by` is the session's person, shown through the one person-label resolver, never a stored name; `at` is the portal's declared present |
| Tenant / owner | none | a buyer record: a supplier seat is refused at scope, the same way for a step that exists and one that does not |
| Audit trail | `TransitionEvent` for each act | one event per completion or decline, refusals included |
<!-- src: src/services/data/mock/processStepTarget.ts:23-32,95-116; src/services/flowBuilder/flowOverlay.ts:63-133,181-212; src/services/flowBuilder/stepLedger.ts:17-70; src/services/flowBuilder/flowVersion.ts:48-68 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` (the seat, not a person), `ts`, `outcome` (with the reason when refused), its own `correlationId`, and the session's person as `attribution`. The ledger itself is the history of each step: every completion and every decline is a record of its own, oldest first, and none is rewritten. No screen lists the ledger; the pop-up of a later step names who completed the earlier ones. The ledger is lost on reload.

Worked sequence, for an approval step in front of one act of a process, after a change that defines it was put in force. Each act on the step is taken from the line on the document's panel:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | (the gated process) | the lane that holds the gated act | take the act the step stands in front of | that act, `outcome: failed`, `STEP_PENDING` naming the step; the document does not move |
| T+1 | Recorded (refused) | a named person in a lane other than the step's | complete the step by a hand-crafted dispatch; the line offers that seat no **Open step** | `t_step_complete`, `outcome: failed`, `POLICY_REJECTED:step_may_be_taken` (`STEP_LANE_NOT_HELD`) |
| T+2 | Recorded → Recorded | a named person in the step's lane | decline the step, with a reason | `t_step_decline` — a record with the decision *declined* |
| T+3 | (the gated process) | the lane that holds the gated act | take the act again | that act, `outcome: failed`, `STEP_PENDING` naming the step with `:declined` |
| T+4 | Recorded → Recorded | a named person in the step's lane | complete the step | `t_step_complete` — a record with the decision *completed*; the latest decision counts |
| T+5 | (the gated process) | the lane that holds the gated act | take the act again | that act succeeds; the completion is marked used |
| T+6 | Recorded (refused) | a named person in the step's lane | complete the step again while the document is no longer where the act can be taken | `t_step_complete`, `outcome: failed`, `POLICY_REJECTED:step_may_be_taken` (`STEP_NOT_DUE`) |
<!-- src: src/services/transitions/events.ts:26-61,124-131; src/services/data/mock/processStepTarget.ts:34-116; src/services/flowBuilder/flowOverlay.ts:99-113,167-212; src/services/transitions/dispatcher.ts:881-889,991-993 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| The line **Added step** shows no **Open step** | the line reads *"{step}. Waiting for {lane}."* with no link | the seat does not hold the step's lane | act from a seat that holds that lane |
| The page's button answers *"Not yet: the step “{step}” must be completed first. It is waiting for {lane}. Nothing was changed."* | `STEP_PENDING` with `<process>:<document>:<step>` | a change in force adds a step in front of that act, and the step is open | the step's lane completes the step from the line **Added step**, then the act is taken again |
| The page's button answers *"Not yet: the step “{step}” was declined by {person} — “{reason}”. It waits for {lane} to decide again. Nothing was changed."* | `STEP_PENDING` with `:declined` after the step | the latest decision on the approval step was a decline | the step's lane decides it again; a completion lifts the refusal |
| Toast *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* | `POLICY_REJECTED:step_actor_named` (`STEP_ACTOR_UNATTRIBUTED`) | the seat names no person, and completing or declining a step is recorded against the person who did it | adopt a sample user on the identity panel, then take the act again |
| Toast *"Refused: the change in force does not define that step."* | `STEP_UNKNOWN`, or — first, in practice — thrown `NOT_FOUND`: the key is not a step the version in force defines | the process is not registered, the document is not one that process holds, the step id is not in the version in force, or no version is in force | use the key of a step the version in force defines, on a document that exists |
| Toast *"Refused: this step is not due. It is already done, an earlier step is still open, or the document has moved on."* | `POLICY_REJECTED:step_may_be_taken` (`STEP_NOT_DUE`) | the step is already done, an earlier step in front of the same act is still open, or the document is not where the act behind the step can be taken | complete the earlier step first, or wait until the document reaches the state the act starts from |
| Toast *"Refused: this step is completed by another lane, which this seat does not hold."* | `POLICY_REJECTED:step_may_be_taken` (`STEP_LANE_NOT_HELD`); the line names the lane the step waits for | the seat does not hold every permission of the lane the step names; `step:complete` alone is not enough | act from a seat that holds the step's lane |
| Toast *"{person} completed an earlier step on this document, and the change in force asks for a different person on this one. Somebody else completes it."* | `POLICY_REJECTED:step_may_be_taken` (`STEP_COMPLETER_IS_EARLIER_COMPLETER`); the pop-up lists the earlier steps and who completed them | the same person completed an earlier step, and the change rules that this step is completed by a different person | route the step to somebody else. A Super Admin passes with a one-line reason |
| Toast *"Refused: fill in every field the step marks as required."* | `POLICY_REJECTED:step_fields_given` (`STEP_FIELD_MISSING`); a required field is marked with an asterisk | a required field of a data-capture step was left empty | give a value for each required field |
| Toast *"Refused: only an approval step can be declined. This one is completed."* | `POLICY_REJECTED:step_decline_reasoned` (`STEP_NOT_AN_APPROVAL`) | a confirmation or a data-capture step was declined by a hand-crafted dispatch; the pop-up offers **Decline** on an approval step only | complete the step instead |
| Toast *"Refused: a declined approval says why, in words."* | `POLICY_REJECTED:step_decline_reasoned` (`STEP_DECLINE_REASON_BLANK`) | the decline's reason holds only spaces | say why the approval is declined |
| A failure naming the reason as missing | `MISSING_FIELDS:reason` | a decline was sent with no reason | send the reason with the decline |
| The page's button answers *"{person} completed the added step on this document, and the change in force rules that whoever completes it may not then take the act. Somebody else takes it."* | `POLICY_REJECTED:added_check` (`STEP_COMPLETER_MAY_NOT_ACT`) on the gated act | the person completed the step, and the change rules that whoever completes it may not then take the act | route the act to somebody else. A Super Admin passes with a one-line reason |
| Refused naming `SUPER_ADMIN_REASON_REQUIRED` | the refusal names the check that would stand aside | a Super Admin passed a two-person check and gave no one-line reason | take the act again and state the reason |
| A step that was completed is asked for again | the act is refused as `STEP_PENDING` on a document whose step was done before | the act behind the step succeeded since, so the completion was used up; or another version came into force, and a completion counts only under the version it was taken under; or the page was reloaded | complete the step again |
| Step records are gone | the ledger is empty | the page was reloaded; step records are kept in memory | expected until a backend exists |
| A step is no longer asked for | the act is not refused as `STEP_PENDING` | the version that defined the step was retired, replaced by another version, or set aside because it no longer obeys the rules | expected; the process runs as that version, or the shipped default, says |
| Thrown `SCOPE_DENIED` | `DataError` code | a supplier seat | buyer side only |
<!-- src: src/services/data/mock/processStepTarget.ts:23-116; src/services/flowBuilder/flowOverlay.ts:36-62,79-133,151-212; src/services/flowBuilder/stepLedger.ts:1-12,62-70; src/services/transitions/policies.ts:2864-2873,2965-2972; src/services/transitions/dispatcher.ts:319,709,881-889,923-936,948-953; src/lib/glossary/refusals.glossary.ts:78-83 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Recorded | — | — | no fixture — no version is in force at seed, so no step exists and the ledger opens empty. A step exists once a change that adds it is in force and a document of that process is where the act behind the step can be taken; its key is then `<process>:<document>:<step>`. The line **Added step** on the document's panel is where it is opened. Step records are lost on reload |
<!-- src: src/services/flowBuilder/stepLedger.ts:1-12,42-43; src/services/data/mock/processStepTarget.ts:23-32,95-96; src/services/flowBuilder/flowOverlay.ts:47-55 -->
