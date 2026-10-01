---
entity: materialRequest
locale: en
title: Material request
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_materialrequest_submit
  - t_materialrequest_start_review
  - t_materialrequest_approve
  - t_materialrequest_reject
---

<!-- section:summary -->
## 1 · What this process is

The record that a buyer needs a material Paragon does not yet have a code for, who is looking at it, and what was decided. Fourteen of the materials the RFQ wizard offers have no code in the master; without this there was nowhere to ask for one, so the gap stayed open with nobody able to say it had been raised. A material request is the buyer's note to the people who keep the material master. It mints no code, writes nothing to the catalog and changes no sourcing event.

Two buyer lanes touch it. **Procurement** raises a request — either from the sourcing wizard, when a picked material turns out to have no master code, or directly from the *Material requests* page. **Planning** (the lane that owns master-data questions) picks the request up (*Start review*) and decides: *Accept for creation*, or *Decline* with a written reason. The requester is a buyer with a seat, so they read the outcome themselves on the same page.

It starts at **Submitted** and ends at **Approved** or **Rejected** — both are real endings. There is no draft: the form and the wizard are the draft. A declined request is not reopened; a better description is a new request, so the master-data team's refusal reasons stay countable. Acceptance records a decision and nothing else: the material itself is created in S/4HANA, which owns material identity, and the catalog gains it when SAP has a code. The status labels say exactly that — the machine state *Approved* is shown as **Accepted for creation**, never "created".

Honest markers. The queue is **SIMULATED** — the pill reads *"Sample — awaiting S/4 material master"*, and green would wrongly mean "the material now exists". The two rows on the pile were grown at start-up through the real verb, with plainly fictional labels marked *(illustrative)*; the first was raised from a sourcing event the seed itself created so its provenance is real. The four-eyes rule (the requester may not decide their own request) is built and admits every act while nobody is signed in; it can only refuse once two persons can be compared. No surface shows a waiting time in days, by ruling.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Submitted | creation (operator action) | procurement | `t_materialrequest_submit` |
| 2 | Submitted → Under Review | operator action | planning | `t_materialrequest_start_review` |
| 3a | Under Review → Approved | operator action (terminal) | planning | `t_materialrequest_approve` |
| 3b | Under Review → Rejected | operator action (terminal) | planning | `t_materialrequest_reject` |

**Forks**

- **At Under Review:** `t_materialrequest_approve` — planning — when master data accepts the request for creation in SAP; `t_materialrequest_reject` — planning — when master data declines, with a written reason (the material already exists under another name, or is not a material at all).

No other state has two exits.

<!-- section:steps -->
## 3 · Step by step

### t_materialrequest_submit — Submit request <!-- transition:t_materialrequest_submit -->

- **Step kind:** operator action (creation)
- **Role:** buyer · procurement
- **From → to:** ∅ → Submitted
- **Operator — where:** two entrances, one payload.
  1. `/buyer/material-requests` → **Raise a material request** (page header) → the panel *Raise a material request* → **Submit request** (or **Cancel**).
  2. `/buyer/sourcing` → the RFQ wizard → at the material step pick a material the catalog carries no code for and mark it for a request → finish the wizard. The request is dispatched *after* the RFQ has been created, one request per code-less pick, naming the new RFQ as its origin.
- **Operator — do:** write down which material is missing and why it matters. Master data decides whether it already exists under another name; the *Why it is needed* text is what they read. From the wizard, the sourcing event goes ahead unchanged and will still require competitive bidding — the request is a separate note to master data, not an edit to the event.
- **Operator — fill:** *Material name* (your words; nothing checks it against the master — that is what the request is for), *Category* (one of `Fragrance`, `Active Ingredients`, `Packaging`, `Emulsifiers`, `Botanical`, `Other`) and *Why it is needed* are required. Optional: *Specification or link*, *Expected unit* (recorded as stated, validated against no unit list). The wizard also carries the catalog's own reason the pick has no code and the originating RFQ; the page sends neither.
- **Tester — expected state:** Submitted (shown as *Awaiting review*)
- **Tester — confirm:** a new row with a store-assigned `MR-2026-000n` number at the top of `/buyer/material-requests`; *Raised from* reads *Raised directly* or the RFQ number; toast *"Request {number} recorded — Master data will review it. The material does not exist yet."* From the wizard the toast reads *"{rfqNumber} raised — material request recorded"*, and the RFQ's detail carries the line *"A material request is pending for: {materials}. This event is unchanged and will still require competitive bidding."* Nothing changes on any supplier seat.
- **Tester — trigger event:** `t_materialrequest_submit`
- **Checks that can refuse:** `materialrequest_category_known` — the category must be one of the six, and a catalog reason, when present, one of the five the catalog knows; `materialrequest_need_authored` — *Why it is needed* must be a non-blank string; `materialrequest_rfq_resolved` — if an originating RFQ is named it must exist in the RFQ store (absent is fine — a standalone request names none).
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** the raise panel says *"This request will be recorded against no person…"* before the act. The queue is **SIMULATED** (*"Sample — awaiting S/4 material master"*). If the RFQ was created but the request was refused, the event stands and the toast says so — *"{rfqNumber} raised — material request was not"* — and the request can be raised again from this page.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:111; src/services/transitions/flows/materialRequest.flow.ts:94; src/services/transitions/policies.ts:728; src/services/transitions/policies.ts:760; src/services/transitions/policies.ts:794; src/pages-v2/BuyerMaterialRequests.tsx:445; src/pages-v2/BuyerMaterialRequests.tsx:595; src/pages-v2/BuyerMaterialRequests.tsx:706; src/pages-v2/BuyerSourcing.tsx:1780; src/pages-v2/sourcing/materialRequest.ts:88; src/services/data/mock/MockCommandService.ts:2134; src/services/data/mock/MockCommandService.ts:2142; src/services/data/mock/stores/materialRequestStore.ts:175; src/data/mockRfqs.ts:36; src/data/materialCatalogReason.ts:61; src/lib/i18n/materialRequests.ts:379; src/lib/i18n/materialRequests.ts:397; src/lib/i18n/materialRequests.ts:449; src/lib/i18n/sourcing.ts:302; src/lib/i18n/sourcing.ts:317 -->

### t_materialrequest_start_review — Start review <!-- transition:t_materialrequest_start_review -->

- **Step kind:** operator action
- **Role:** buyer · planning
- **From → to:** Submitted → Under Review
- **Operator — where:** `/buyer/material-requests` → open an *Awaiting review* row → side panel → **Start review**.
- **Operator — do:** take the request off the pile and put your name to it, so the queue can tell the requests nobody has opened yet from the ones already being worked.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Under Review (shown as *Under review*)
- **Tester — confirm:** status chip *Under review*; the panel's *The decision* section gains a *Picked up* timestamp; the row moves from the *Awaiting review* tab to *Under review*; toast *"Review started"*. A seat without `materialrequest:review` sees *"Awaiting Planning"* in that slot.
- **Tester — trigger event:** `t_materialrequest_start_review`
- **Checks that can refuse:** `materialrequest_decider_not_requester` — the person who submitted the request may not also pick it up. It compares the request's *Submitted by* with the session's actor and refuses only when both name the same person; with no person in the session it admits.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Honesty:** the four-eyes hook is built and typed for, and cannot fire from an unattributed session — an unattributed act is not evidence of self-approval. The two seeded rows were submitted under a sample identity (a procurement person from the demo roster); a seat that has adopted that same sample identity is refused here, which is the one way to see the rule bite today.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:131; src/services/transitions/policies.ts:874; src/services/transitions/policyHooks.ts:421; src/pages-v2/BuyerMaterialRequests.tsx:880; src/services/query/commandHooks.ts:1536; src/services/data/mock/MockCommandService.ts:2086; src/services/data/mock/materialRequestSeed.ts:150; src/lib/i18n/materialRequests.ts:429; src/lib/i18n/materialRequests.ts:454 -->

### t_materialrequest_approve — Accept for creation <!-- transition:t_materialrequest_approve -->

- **Step kind:** operator action (terminal)
- **Role:** buyer · planning
- **From → to:** Under Review → Approved
- **Operator — where:** `/buyer/material-requests` → open an *Under review* row → **Accept for creation** → the confirmation *"This records that the request was accepted. It does not create the material."* → **Confirm acceptance** (or **Back**).
- **Operator — do:** accept the request for creation in SAP. What this records is the decision and nothing else — the material is created in S/4HANA, which owns material identity, and this portal never issues a code.
- **Operator — fill:** nothing to fill — there is deliberately no text box on an acceptance.
- **Tester — expected state:** Approved (shown as *Accepted for creation*)
- **Tester — confirm:** status chip *Accepted for creation*; the panel shows *"Accepted for creation in SAP. The material does not exist yet — the code is issued by SAP, not by this portal, and the catalog gains the material when it does."*; *Decided* and *Decided by* fill in; the row moves to the *Accepted* tab; toast *"Accepted for creation — Recorded. Creating the material in SAP is done outside this portal."* The RFQ it came from, if any, now reads *"A material request for {materials} was decided ({status}). This event is unchanged either way."* The material catalog does not change.
- **Tester — trigger event:** `t_materialrequest_approve`
- **Checks that can refuse:** `materialrequest_decider_not_requester` — as above; the requester may not accept their own request.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Honesty:** terminal and mints nothing. No date by which the material will exist is shown anywhere, because nothing in the portal observes S/4HANA issuing a code. The label is *Accepted for creation*, never *created*.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:153; src/services/transitions/policies.ts:874; src/pages-v2/BuyerMaterialRequests.tsx:897; src/pages-v2/BuyerMaterialRequests.tsx:920; src/services/data/mock/MockCommandService.ts:2093; src/lib/i18n/materialRequests.ts:430; src/lib/i18n/materialRequests.ts:438; src/lib/i18n/materialRequests.ts:443; src/lib/i18n/materialRequests.ts:455; src/lib/i18n/sourcing.ts:319 -->

### t_materialrequest_reject — Decline <!-- transition:t_materialrequest_reject -->

- **Step kind:** operator action (terminal)
- **Role:** buyer · planning
- **From → to:** Under Review → Rejected
- **Operator — where:** `/buyer/material-requests` → open an *Under review* row → **Decline** → the *Why it is declined* box → **Confirm decline** (or **Back**).
- **Operator — do:** decline the request and write down why. The hint says what the text is for: *"The whole account of this decision. The buyer reads this and nothing else."* The button stays disabled until the box has text.
- **Operator — fill:** justification (required, non-blank).
- **Tester — expected state:** Rejected (shown as *Declined*)
- **Tester — confirm:** status chip *Declined*; the panel shows *"Declined. The reason below is the whole account of the decision."* with the text; *Decided* and *Decided by* fill in; the row moves to the *Declined* tab; toast *"Request declined — The reason is on the record."*
- **Tester — trigger event:** `t_materialrequest_reject`
- **Checks that can refuse:** `materialrequest_refusal_authored` — the justification must be a non-blank string; `materialrequest_decider_not_requester` — the requester may not decline their own request.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`.
- **Honesty:** terminal by ruling: *"This cannot be undone. A new request would be a new record."* The reason is what tells the buyer whether to ask again with a better description or stop asking.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:172; src/services/transitions/policies.ts:822; src/services/transitions/policies.ts:874; src/pages-v2/BuyerMaterialRequests.tsx:945; src/services/data/mock/MockCommandService.ts:2100; src/lib/i18n/materialRequests.ts:431; src/lib/i18n/materialRequests.ts:435; src/lib/i18n/materialRequests.ts:440; src/lib/i18n/materialRequests.ts:458 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **The decision (at Under Review).** Branch A — `t_materialrequest_approve` — **When:** master data accepts that the material is new and should be created in SAP; nothing is typed. Branch B — `t_materialrequest_reject` — **When:** the material already exists under another name, the description cannot be resolved, or it is not a material; a written reason is required.
- **Refusal is final.** No revise, reopen, withdraw or cancel on any state. **When** the buyer has a better description: raise a new request; the declined one keeps its reason.
- **Two entrances, one record (at ∅ → Submitted).** **When** raised from the wizard: the request carries the catalog's reason the pick had no code (one of `AMBIGUOUS_IN_MASTER`, `UNCONFIRMED_LOOSE_MATCH`, `NARROWS_THE_MEANING`, `NO_MASTER_TARGET`, `NOT_A_MATERIAL`) and the RFQ it was discovered on. **When** raised from the page: neither is present and *Raised from* reads *Raised directly*.
- **The event is never touched.** **When** the RFQ was created but the request was refused: the event stands, the toast says so, and the request is raised again from the page. **When** the RFQ itself was refused: no request is dispatched at all (*"The sourcing event was not created, so nothing was recorded."*).
- **Self-decision.** **When** the deciding seat is the same person who submitted (only possible today by adopting the same sample identity): review, accept and decline are all refused by name.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| SIMULATED — *"Sample — awaiting S/4 material master"* | external (liveness registry) | all states | always, until master data arrives back from S/4HANA | `/buyer/material-requests` meta line (provenance marker) |
| *"Raised from the RFQ wizard when a picked material has no master code, or here. A request never changes a sourcing event."* | authored honesty note | all states | always | `/buyer/material-requests` meta line |
| *"Awaiting Procurement"* / *"Awaiting Planning"* | derived at read (seat vs. atom) | ∅ → Submitted (raise); Submitted (review); Under Review (decide) | the seat does not hold the verb's atom | page header; raise panel body; side panel action slot |
| *"Not attributed — no person in session"* or a person label marked *(SAMPLE)* | derived at read | all states | always in the demo; the seeded rows carry a sample requester | panel *Submitted by*, *Decided by*; pre-act notice on the raise panel |
| *"A material request is pending for: …"* / *"… was decided ({status}) …"* | derived at read | Submitted, Under Review / Approved, Rejected | the RFQ detail of the event a request was raised from | `/buyer/sourcing` RFQ detail |
| *Why the catalog has no code* | authored (catalog reason) | all states | only on requests raised from the wizard | panel *The request* |
| *Awaiting review* / *Under review* / *Accepted for creation* / *Declined* | derived at read (state labels) | one per state | always | KPI tiles, tabs, status chips |

No time-driven flag exists and none is allowed: the store opens empty, every date is written at the moment of an act, and rendering a waiting time in days was refused by ruling.

<!-- src: src/services/liveness/registry.ts:322; src/lib/i18n/widget.ts:48; src/lib/i18n/materialRequests.ts:328; src/lib/i18n/materialRequests.ts:336; src/lib/i18n/materialRequests.ts:367; src/lib/i18n/materialRequests.ts:408; src/lib/i18n/sourcing.ts:317; src/lib/i18n/roles.ts:48; src/services/data/mock/stores/materialRequestStore.ts:130 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `mr-0001` (MR-2026-0001) — *PET Bottle 100ml*, category `Packaging`, catalog reason `AMBIGUOUS_IN_MASTER`, raised from the sourcing event the seed created, in **Submitted**.

| Joins to | By | Note |
|---|---|---|
| RFQ (sourcing event) | `raisedFromRfqId`, resolved against the RFQ store at birth | Provenance, not a dependency: the RFQ does not read it and cannot change because of it — an RFQ's materials cannot be edited after creation. `null` on a standalone request. The RFQ detail reads the requests pointing at it. |
| Material master | `materialCode` — always `null` (the type says so literally) | The row exists because there is no code. Nothing here ever holds one; when SAP issues a code the catalog changes, not this record. |
| Catalog code-less reason | `catalogReason` | One of the five reasons the catalog itself gives; `null` when raised from the page. |
| Category | `category` | The RFQ wizard's own closed category set, reused. |
| Requester / decider | `submittedBy`, `decidedBy` (actor attributions) | Written from the session. The two seeded rows carry a sample procurement identity as requester; a request raised in the demo carries *unattributed*. |
| Tenant / owner | none (`readScopeOwner` is null) | A request has no supplier owner; no supplier seat can see or act on it, including suppliers invited to the originating event. |
| Timestamps | `submittedAt`, `reviewStartedAt`, `decidedAt` | Store-assigned at each act; `null` until then. |
| Expected unit, specification | `expectedUom`, `specification` | The requester's claims, recorded as stated; `null` when not given. |

<!-- src: src/services/data/types.ts:2446; src/services/data/mock/MockCommandService.ts:2134; src/services/data/mock/MockCommandService.ts:2142; src/services/data/mock/materialRequestSeed.ts:100 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` (the seat, not a person), `ts`, `outcome`, one `correlationId` per command; no cascade touches this machine, so no `causationId` appears. A separate `attribution` field records who could be named. Refusals are recorded with their reason.

Worked sequence for `mr-0001` (MR-2026-0001) — the seed runs T+0 under a procurement seat acting as a sample identity; a planning seat continues:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | (RFQ) ∅ → Draft | procurement (`buyer:all`) | the seed raises the sourcing event the request will name | `t_rfq_create` |
| T+0 | ∅ → Submitted | procurement (`buyer:all`, sample identity) | submit — *PET Bottle 100ml*, `Packaging`, reason `AMBIGUOUS_IN_MASTER`, raised from that RFQ | `t_materialrequest_submit` |
| T+1 (tester) | Submitted → Under Review | planning (`buyer:all`) | **Start review** | `t_materialrequest_start_review` |
| T+2 (tester) | Under Review → Approved | planning (`buyer:all`) | **Accept for creation** → **Confirm acceptance** | `t_materialrequest_approve` |

For the decline branch, walk `mr-0002` (MR-2026-0002, the standalone request) and choose **Decline** at T+2 with a reason; the event is `t_materialrequest_reject`. After T+2 no further event is possible on either row.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:127; src/services/data/mock/materialRequestSeed.ts:150; src/services/data/mock/materialRequestSeed.ts:190 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Raise a material request** button; header reads *"Awaiting Procurement"* | handoff notice in the page header (and inside the raise panel if already open) | the seat does not hold `materialrequest:submit` | act from a seat holding the procurement lane |
| No **Start review** / **Accept for creation** / **Decline**; panel reads *"Awaiting Planning"* | handoff notice in the panel's action slot | the seat does not hold `materialrequest:review` / `materialrequest:decide` | route to a planning seat |
| **Submit request** stays disabled | form incomplete | material name, category or *Why it is needed* blank | fill the three required fields |
| Toast *"Request not recorded"* naming *category* or *catalogReason* | `POLICY_REJECTED:materialrequest_category_known` | a hand-crafted dispatch sent a category outside the six, or a catalog reason outside the five | use the page's own controls |
| Toast *"Request not recorded"* naming *need* | `MISSING_FIELDS:need` / `POLICY_REJECTED:materialrequest_need_authored` | *Why it is needed* was blank or only spaces | write the need |
| Toast naming *raisedFromRfqId* | `POLICY_REJECTED:materialrequest_rfq_resolved` | the named sourcing event does not exist in the store | raise from the page (no event) or from a real event |
| Toast *"{rfqNumber} raised — material request was not"* | the RFQ toast, error variant | the event was created and the request refused afterwards | the event stands; raise the request from `/buyer/material-requests` |
| Toast *"No material request was raised"* | after the wizard | the RFQ itself was refused, so no request was dispatched | fix the RFQ refusal first |
| *"That did not go through"* with a refusal naming the requester | `POLICY_REJECTED:materialrequest_decider_not_requester` | the deciding seat is acting as the same sample identity that submitted the request | decide from a different identity, or unattributed |
| Toast *"That did not go through"* naming *justification* | `MISSING_FIELDS:justification` / `POLICY_REJECTED:materialrequest_refusal_authored` | *Why it is declined* was blank | write the reason |
| *"…not in a state this action can be taken from"* | `ILLEGAL_TRANSITION` | acting on a row that already moved | reopen the row and take the act its state offers |
| Accepted, but the material is still not in the catalog | no new code on the material picker | expected — acceptance records a decision; SAP issues the code, and nothing in the portal observes it | nothing to do in the portal |
| Wants to change a declined request | the declined row is terminal | by design — no reopen | raise a new request |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:324; src/services/transitions/policies.ts:728; src/services/transitions/policies.ts:874; src/lib/i18n/materialRequests.ts:452; src/lib/i18n/sourcing.ts:298 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Submitted | `mr-0001`; `mr-0002` | MR-2026-0001; MR-2026-0002 | grown at start-up by the seed through `t_materialrequest_submit` under a procurement seat: *PET Bottle 100ml* (`Packaging`, reason `AMBIGUOUS_IN_MASTER`, raised from the seed's own sourcing event); *Sample Amber Dropper 30ml (illustrative)* (`Packaging`, raised directly) |
| Under Review | — | — | no fixture — press **Start review** on either row |
| Approved | — | — | no fixture — accept a row under review |
| Rejected | — | — | no fixture — decline a row under review with a reason |

The store opens empty by ruling (nobody has ever asked for a material); every row is produced by the verb. The seed also creates one extra RFQ so that `mr-0001` has a real origin. All data is SIMULATED (see §5).

<!-- src: src/services/data/mock/stores/materialRequestStore.ts:110; src/services/data/mock/materialRequestSeed.ts:100; src/services/data/mock/materialRequestSeed.ts:75 -->
