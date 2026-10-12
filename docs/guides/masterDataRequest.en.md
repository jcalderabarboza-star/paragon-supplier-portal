---
entity: masterDataRequest
locale: en
title: Master-data change request
wired: true
owner: portal
source_sha: b9b092eecc359fadde205154ea3d46352d6ff87f
transitions:
  - t_mdr_propose
  - t_mdr_start_review
  - t_mdr_return
  - t_mdr_approve
  - t_mdr_reject
  - t_mdr_withdraw
  - t_mdr_hand_off
  - t_mdr_sap_complete
  - t_mdr_sap_decline
---

<!-- section:summary -->
## 1 · What this process is

A proposal to change master data that SAP S/4HANA owns: a new material, a change to a material, or a change to a supplier. The portal holds a replica of SAP's master data and never changes a record. It proposes, a second person reviews, procurement hands the agreed request to SAP, and the request ends on SAP's answer.

**Agreed is not the same as existing.** *Agreed — not yet sent* means Paragon agreed to ask SAP. No step of this process writes a master record: a record changes only when a sync run delivers it, and the page says so in each state.

Three buyer lanes touch it. **Procurement** and **Planning** hold `masterdata:propose`. **Planning** and **Compliance** hold `masterdata:review`, and a check holds each to its own kind: materials are Planning's, suppliers Compliance's. **Procurement** holds `masterdata:handoff` and `masterdata:record-sap-answer`. The person who decides a request is never the person who proposed it; a Super Admin may pass that one check with a stated reason, which is recorded.

Honesty markers. SAP is not connected: **Send to SAP** produces the hand-off package and stops. On a demo or preview deployment a person may record a **sample** answer, which delivers its record through a sync run marked as sample; on production that is refused. Requests are kept in memory for the session and are gone on reload.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/masterData/changeRequest.ts:1-290; src/services/data/mock/masterDataRequestTarget.ts:1-190 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Proposed | creation (operator action) | buyer · procurement, planning | `t_mdr_propose` |
| 2 | Proposed → In Review | changes state (operator action) | buyer · planning, compliance | `t_mdr_start_review` |
| 3 | In Review → Proposed | changes state (operator action) | buyer · planning, compliance | `t_mdr_return` |
| 4 | In Review → Approved | changes state (operator action) | buyer · planning, compliance | `t_mdr_approve` |
| 5 | In Review → Rejected | changes state (operator action) | buyer · planning, compliance | `t_mdr_reject` |
| 6 | Proposed, Approved → Withdrawn | changes state (operator action) | buyer · procurement, planning | `t_mdr_withdraw` |
| 7 | Approved → Sent to SAP | changes state (operator action) | buyer · procurement | `t_mdr_hand_off` |
| 8 | Sent to SAP → Completed in SAP | external fact (operator action) | buyer · procurement | `t_mdr_sap_complete` |
| 9 | Sent to SAP → Declined by SAP | external fact (operator action) | buyer · procurement | `t_mdr_sap_decline` |

A request that is returned goes back to Proposed and can be reviewed again. Rejected, Withdrawn, Completed in SAP and Declined by SAP are endings.

**Forks**

- **At Proposed:** `t_mdr_start_review` (the reviewing lane takes it up) or `t_mdr_withdraw` (the proposer takes it back).
- **At In Review:** `t_mdr_approve`, `t_mdr_return` or `t_mdr_reject`.
- **At Approved:** `t_mdr_hand_off` or `t_mdr_withdraw`.
- **At Sent to SAP:** `t_mdr_sap_complete` or `t_mdr_sap_decline`.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150 -->

<!-- section:steps -->
## 3 · Step by step

### t_mdr_propose — Propose a change, or ask for a new material <!-- transition:t_mdr_propose -->

- **Step kind:** operator action
- **Role:** buyer · procurement, planning (atom `masterdata:propose`)
- **From → to:** ∅ → Proposed
- **Operator — where:** `/buyer/master-data` → header **Ask for a new material**; or open a material or a supplier → **Propose a change**. The request then opens on `/buyer/master-data/requests`.
- **Operator — do:** say what is asked for and why. For a change, alter only the fields that should move; the form sends only those.
- **Operator — fill:** `kind` (set by where the form was opened), `subjectKey` (the record, for a change; never for a new material), `proposed` (the fields), `reason` (required).
- **Tester — expected state:** Proposed
- **Tester — confirm:** toast **"Request raised. It waits for review; nothing in master data has changed."**; the request opens with its number, the proposed values beside what SAP holds, and one history row.
- **Tester — trigger event:** `t_mdr_propose`
- **Checks that can refuse:** `mdr_actor_named` (`MDR_ACTOR_UNATTRIBUTED`); `mdr_proposal_valid`, nine refusals — `MDR_KIND_UNKNOWN`, `MDR_REASON_BLANK`, `MDR_CREATE_CARRIES_KEY`, `MDR_SUBJECT_UNKNOWN`, `MDR_FIELD_NOT_PROPOSABLE`, `MDR_FIELD_MISSING`, `MDR_VALUE_NOT_IN_TABLE`, `MDR_NOTHING_CHANGES`, `MDR_DUPLICATE_OPEN`.
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** a request for a new material carries no key: SAP gives the key. A generated sample material has no SAP record, so no change can be proposed for it.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_start_review — Start the review <!-- transition:t_mdr_start_review -->

- **Step kind:** operator action
- **Role:** buyer · planning, compliance (atom `masterdata:review`)
- **From → to:** Proposed → In Review
- **Operator — where:** `/buyer/master-data/requests` → open the request → **Start review**.
- **Operator — do:** take the request up, so the proposer can see it is being looked at.
- **Operator — fill:** nothing.
- **Tester — expected state:** In Review
- **Tester — confirm:** toast **"Review started."**; the state reads *In review*.
- **Tester — trigger event:** `t_mdr_start_review`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_reviewer_lane` (`MDR_WRONG_LANE`: a material request is reviewed by Planning, a supplier request by Compliance).
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** a seat without the review atom reads who it waits for where the button would be.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_return — Return to the proposer <!-- transition:t_mdr_return -->

- **Step kind:** operator action
- **Role:** buyer · planning, compliance (atom `masterdata:review`)
- **From → to:** In Review → Proposed
- **Operator — where:** `/buyer/master-data/requests` → open the request → write the note → **Return to proposer**.
- **Operator — do:** say what is missing or unclear.
- **Operator — fill:** `note` (required).
- **Tester — expected state:** Proposed
- **Tester — confirm:** toast **"Returned to the person who asked."**; the note is in the history.
- **Tester — trigger event:** `t_mdr_return`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_reviewer_lane`; `mdr_note_authored` (`MDR_NOTE_BLANK`).
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** the button stays disabled until a note is written.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_approve — Agree to ask SAP <!-- transition:t_mdr_approve -->

- **Step kind:** operator action
- **Role:** buyer · planning, compliance (atom `masterdata:review`)
- **From → to:** In Review → Approved
- **Operator — where:** `/buyer/master-data/requests` → open the request → **Agree to ask SAP**.
- **Operator — do:** decide that Paragon should ask SAP for this. The person who proposed the request cannot.
- **Operator — fill:** nothing; a Super Admin approving their own request states a one-line reason.
- **Tester — expected state:** Approved
- **Tester — confirm:** toast **"Agreed. The request waits to be sent to SAP; the record has not changed."**; the state reads *Agreed — not yet sent* and the hand-off section appears.
- **Tester — trigger event:** `t_mdr_approve`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_reviewer_lane`; `mdr_approver_not_proposer` (`MDR_APPROVER_IS_PROPOSER`); `mdr_base_unchanged` (`MDR_SAP_CHANGED_FIRST`).
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** agreement is agreement to ask. The record is exactly what it was.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_reject — Reject the request <!-- transition:t_mdr_reject -->

- **Step kind:** operator action
- **Role:** buyer · planning, compliance (atom `masterdata:review`)
- **From → to:** In Review → Rejected
- **Operator — where:** `/buyer/master-data/requests` → open the request → write the note → **Reject**.
- **Operator — do:** decline the request and say why.
- **Operator — fill:** `note` (required).
- **Tester — expected state:** Rejected
- **Tester — confirm:** toast **"Request rejected. Nothing goes to SAP."**
- **Tester — trigger event:** `t_mdr_reject`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_reviewer_lane`; `mdr_note_authored`; `mdr_approver_not_proposer`.
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** an ending. A new request may be raised.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_withdraw — Withdraw the request <!-- transition:t_mdr_withdraw -->

- **Step kind:** operator action
- **Role:** buyer · procurement, planning (atom `masterdata:propose`)
- **From → to:** Proposed, Approved → Withdrawn
- **Operator — where:** `/buyer/master-data/requests` → open the request → write the note → **Withdraw**.
- **Operator — do:** take the request back before it goes to SAP, saying why.
- **Operator — fill:** `note` (required).
- **Tester — expected state:** Withdrawn
- **Tester — confirm:** toast **"Request withdrawn."**
- **Tester — trigger event:** `t_mdr_withdraw`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_note_authored`.
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** this is how a request held because SAP changed the record first is cleared.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_hand_off — Send to SAP <!-- transition:t_mdr_hand_off -->

- **Step kind:** operator action
- **Role:** buyer · procurement (atom `masterdata:handoff`)
- **From → to:** Approved → Sent to SAP
- **Operator — where:** `/buyer/master-data/requests` → open the request → read **Hand-off to SAP** → **Send to SAP**.
- **Operator — do:** send the agreed request. The request is checked again against the record as it stands now.
- **Operator — fill:** nothing.
- **Tester — expected state:** Sent to SAP
- **Tester — confirm:** toast **"Sent to SAP (sample: SAP is not connected)."**; the package shows the external reference, who agreed and the sync run it was written against.
- **Tester — trigger event:** `t_mdr_hand_off`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_base_unchanged`.
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** nothing is transmitted: SAP is not connected. The package is what would be sent.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_sap_complete — Record SAP's answer: completed <!-- transition:t_mdr_sap_complete -->

- **Step kind:** external fact, recorded here by an operator as a SAMPLE answer
- **Role:** buyer · procurement (atom `masterdata:record-sap-answer`)
- **From → to:** Sent to SAP → Completed in SAP
- **Operator — where:** `/buyer/master-data/requests` → open the request → **Record SAP's answer (sample): completed**. Shown on demo and preview deployments only.
- **Operator — do:** record that SAP made the change.
- **Operator — fill:** `sapRequestNumber` and `sample` (both set by the button).
- **Tester — expected state:** Completed in SAP
- **Tester — confirm:** toast **"Sample answer recorded: completed…"**; a notice names the record and says *Sample answer — SAP was not asked.*; the record on **Materials** or **Suppliers** shows the new value, stamped sample, and the **Sync log** has a new run.
- **Tester — trigger event:** `t_mdr_sap_complete`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_sap_answer_admissible` (`MDR_SAP_NUMBER_BLANK`, `MDR_SAMPLE_ANSWER_IN_PRODUCTION`, `MDR_SAP_NOT_CONNECTED`).
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** the record arrives through a sync run of its own, never from the request. A new material arrives under a sample key.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_sap_decline — Record SAP's answer: declined <!-- transition:t_mdr_sap_decline -->

- **Step kind:** external fact, recorded here by an operator as a SAMPLE answer
- **Role:** buyer · procurement (atom `masterdata:record-sap-answer`)
- **From → to:** Sent to SAP → Declined by SAP
- **Operator — where:** `/buyer/master-data/requests` → open the request → write SAP's reason in the note → **Record SAP's answer (sample): declined**.
- **Operator — do:** record that SAP declined, with SAP's reason.
- **Operator — fill:** `sapRequestNumber`, `sample`, `note` (required).
- **Tester — expected state:** Declined by SAP
- **Tester — confirm:** toast **"Sample answer recorded: declined by SAP."**; the notice shows the reason.
- **Tester — trigger event:** `t_mdr_sap_decline`
- **Checks that can refuse:** `mdr_actor_named`; `mdr_sap_answer_admissible`; `mdr_note_authored`.
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** nothing changes in master data. A new request may be raised.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Which lane reviews (at Proposed).** A material request is Planning's; a supplier request is Compliance's. The other lane is refused `MDR_WRONG_LANE`.
- **Agree, return or reject (at In Review).** Agree when Paragon should ask SAP; return when something is missing; reject when it should not be asked.
- **Proposer and decider are one person (exception).** Refused `MDR_APPROVER_IS_PROPOSER`. A Super Admin may pass it with a one-line reason; the event records the check and the reason. An Admin may not.
- **SAP changed the record first (exception).** A sync run moved a field the request proposes. Agreeing and sending are refused `MDR_SAP_CHANGED_FIRST`; withdraw and propose again.
- **The same ask is already open (exception).** Refused `MDR_DUPLICATE_OPEN`, naming the open request.
- **SAP completes or declines (at Sent to SAP).** Completed: the record is read back by sync. Declined: SAP's reason is shown and a new request may be raised.
<!-- src: src/services/masterData/changeRequest.ts:1-290; src/services/data/mock/masterDataRequestTarget.ts:1-190 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| *"Requests are kept for this session only…"* | standing statement | — | always | top of **Change requests**; the propose form |
| *"SAP changed this record after the request was written"* | derived at read | Proposed, In Review, Approved | a sync run changed a proposed field | the request drawer |
| *"Sample answer — SAP was not asked."* | derived at read | Completed in SAP, Declined by SAP | the answer was recorded as a sample | the answer notice in the drawer |
| *SAP holds: {value}* | derived at read | every state | the request is about an existing record | under each proposed value |
| *Awaiting {lane}* | derived at read (seat vs. atom) | — | the seat lacks the atom for the next act | where the button would be |
| *(SAMPLE)* after a person | derived at read | every state | the act was taken by a sample person | proposer, history, agreed by |
<!-- src: src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/lib/i18n/masterData.ts:150-290 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** none is seeded. The first request raised in a session is `mdr-0001`, number `MDR-2026-0001`.

| Joins to | By | Note |
|---|---|---|
| Master record | `subjectKey` | SAP's key of the material or supplier; null for a new material. The request never writes the record. |
| Reference tables | a proposed value | a unit, type, group, country, payment term or incoterm must be in its table. |
| Sync run | `base.syncRun` | what the request was written against; compared again before agreeing and sending. |
| SAP change request | `sap.sapRequestNumber` | SAP's own number, with the key of the record SAP changed or its reason for declining. |
| Tenant / owner | none (`readScopeOwner` is null) | a buyer document: a supplier scope is refused at scope. |
<!-- src: src/services/masterData/changeRequest.ts:1-290; src/services/data/mock/masterDataRequestTarget.ts:1-190 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all`, `ts`, `outcome`, its own `correlationId`, the session's person as `attribution`, and `subject` = `{ entity: 'masterDataRequest', entityId }`. The request also keeps its own history, shown in the drawer.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ (refused) | buyer · procurement, seat names nobody | **Propose a change** → **Raise the request** | `t_mdr_propose` |
| T+1 | ∅ → Proposed | buyer · procurement, a sample person | the same, after adopting a sample user | `t_mdr_propose` |
| T+2 | Proposed → In Review | buyer · planning, a second sample person | **Start review** | `t_mdr_start_review` |
| T+3 | In Review → Approved | buyer · planning | **Agree to ask SAP** | `t_mdr_approve` |
| T+4 | Approved → Sent to SAP | buyer · procurement | **Send to SAP** | `t_mdr_hand_off` |
| T+5 | Sent to SAP → Completed in SAP | buyer · procurement | **Record SAP's answer (sample): completed** | `t_mdr_sap_complete` |
<!-- src: src/services/data/mock/masterDataRequestTarget.ts:1-190; src/services/transitions/flows/masterDataRequest.flow.ts:1-150 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Propose a change** or **Ask for a new material**; a wait notice instead | handoff text where the control would be | the seat does not hold `masterdata:propose` | act from a seat holding procurement or planning |
| "This seat names no person…" | warning toast; the form said so first | `MDR_ACTOR_UNATTRIBUTED` | choose a sample user on the identity panel |
| "This kind of request is reviewed by another lane…" | error toast | `MDR_WRONG_LANE` | review materials from Planning, suppliers from Compliance |
| "The person who proposed a request may not also decide it…" | error toast | `MDR_APPROVER_IS_PROPOSER` | have a second person decide |
| "SAP changed this record after the request was written…" | error toast and a notice in the drawer | `MDR_SAP_CHANGED_FIRST` | withdraw the request and propose again |
| "An open request already asks for this…" | error toast | `MDR_DUPLICATE_OPEN` | open the existing request |
| No button to record SAP's answer | the drawer reads *Sent to SAP. The answer is recorded when SAP gives it…* | a production deployment: a sample answer is not recorded there | none; SAP answers through the feed when it is connected |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:MAT` | the Material requests module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin` |
| Every request is gone | the list is empty | the page was reloaded; requests are kept in memory | expected in the demo |
<!-- src: src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/pages-v2/BuyerMasterData.tsx:1-470 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Proposed | — | — | no fixture — nothing is seeded and the store opens empty. Raise one: adopt a sample user holding procurement, open a material on `/buyer/master-data`, press **Propose a change**, change the description, give a reason, **Raise the request**. |
<!-- src: src/services/data/mock/stores/masterDataRequestStore.ts:1-35; src/services/data/mock/documentIds.ts:79-84 -->
