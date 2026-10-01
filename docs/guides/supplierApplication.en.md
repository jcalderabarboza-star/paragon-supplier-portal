---
entity: supplierApplication
locale: en
title: Supplier application
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_application_submit
  - t_application_start_review
  - t_application_approve
  - t_application_reject
---

<!-- section:summary -->
## 1 · What this process is

The record that a company has asked to supply Paragon, who is handling it, and what was decided. Without it a company could finish the sign-up form and be handed a reference number that nothing anywhere stood behind — which is exactly what the `/register` walkthrough used to do. This machine is what makes an application number true: the number is assigned by the store at the moment a row is written, so the reference an applicant is given names a real row.

Two buyer lanes touch it, and the applicant touches nothing. **Procurement** raises an application on the applicant's behalf — the applicant holds no seat, no login and no verb on this machine. **Compliance** picks the file off the pile (*Start review*), then decides: approve, or refuse with a written reason that somebody could repeat to the applicant. There is no draft state: the form is the draft, and an application exists only from the moment somebody commits it.

It starts at **Submitted** and ends at **Approved** or **Rejected** — both are real endings. A refused application is not reopened; a second attempt is a second application. Approval records a decision and nothing else: it creates no supplier record, because the vendor master is raised in S/4HANA, which owns supplier identity.

Honest markers. The queue is **SIMULATED** — the pill reads *"Sample — awaiting real supplier identities"* — and the page's own meta line says it: *"Every application here was raised through the platform's own verbs, by a Paragon seat. None arrived from outside: the walkthrough at /register records nothing and reaches no queue."* The two rows on the pile were grown at start-up through the real verb, under a procurement seat, with plainly fictional company names marked *(illustrative)*. Nobody is signed in, so *Raised by* and *Decided by* read *"Unattributed — no person in session"*. The documents an applicant declares (NPWP, NIB, halal, ISO) are claims with a reference string; nothing here verifies them — that is the supplier-document lane's job.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Submitted | creation (operator action) | procurement | `t_application_submit` |
| 2 | Submitted → Under Review | operator action | compliance | `t_application_start_review` |
| 3a | Under Review → Approved | operator action (terminal) | compliance | `t_application_approve` |
| 3b | Under Review → Rejected | operator action (terminal) | compliance | `t_application_reject` |

**Forks**

- **At Under Review:** `t_application_approve` — compliance — when Paragon accepts the applicant; `t_application_reject` — compliance — when Paragon declines, with a reason in words somebody can repeat to the applicant.

No other state has two exits. *Submitted* has one (start review); *Approved* and *Rejected* have none.

<!-- section:steps -->
## 3 · Step by step

### t_application_submit — Raise an application <!-- transition:t_application_submit -->

- **Step kind:** operator action (creation)
- **Role:** buyer · procurement
- **From → to:** ∅ → Submitted
- **Operator — where:** `/buyer/supplier-applications` → **Raise an application** (page header) → the panel *Raise an application* → **Review before raising** → the confirmation *Raise this application?* → **Yes, raise it** (or **Back**).
- **Operator — do:** record that a company has asked to supply Paragon. You are recording their request; the applicant cannot do this themselves. Check the summary against what the applicant actually sent — nothing can be edited afterwards.
- **Operator — fill:** *Request type* (one of `External SR` — a company Paragon does not buy from yet; `Internal SR` — extend a vendor already on the roster; `KOL` — a creator or individual) and *Company* are required. For an `Internal SR` the company is not typed: pick the *Existing vendor* from the roster and the company name comes from the vendor you pick. *Declared documents* are optional — a reference number for any of NPWP, NIB, halal, ISO; a blank reference is simply not recorded.
- **Tester — expected state:** Submitted
- **Tester — confirm:** a new row appears at the top of the queue with a store-assigned number (`APP-2026-0003` for the first one raised after start-up); the *Waiting* tab and the *Waiting to be picked up* KPI count it; the panel's *Raised by* reads *"Unattributed — no person in session"*. Nothing appears on any supplier seat — the applicant has none, and an application is not visible to the vendor it names.
- **Tester — trigger event:** `t_application_submit`
- **Checks that can refuse:** `application_request_type_known` — the request type must be one of the three; `application_internal_vendor_resolved` — an `Internal SR` must name a vendor the governed roster actually holds (the picker can only produce such values, so this refusal is reachable by a hand-crafted dispatch); `application_declarations_well_formed` — if declarations are supplied, every one must name a known document kind and carry a non-blank reference; a malformed list is refused whole, never trimmed.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** the confirmation step says *"This will be recorded against no person…"* before you commit. The queue is **SIMULATED** and no external party can reach it by any route; the two rows already on it were grown by the start-up seed. The success toast names the raise, not the number — the number is minted in the store and read off the row below.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:174; src/services/transitions/flows/supplierApplication.flow.ts:80; src/services/transitions/flows/supplierApplication.flow.ts:114; src/services/transitions/policies.ts:607; src/services/transitions/policies.ts:641; src/services/transitions/policies.ts:690; src/pages-v2/BuyerSupplierApplications.tsx:496; src/pages-v2/BuyerSupplierApplications.tsx:253; src/pages-v2/BuyerSupplierApplications.tsx:632; src/services/data/mock/MockCommandService.ts:2006; src/services/data/mock/MockCommandService.ts:2021; src/services/data/mock/stores/supplierApplicationStore.ts:88; src/lib/i18n/supplierApplications.ts:124; src/lib/i18n/supplierApplications.ts:144; src/lib/i18n/supplierApplications.ts:151 -->

### t_application_start_review — Start review <!-- transition:t_application_start_review -->

- **Step kind:** operator action
- **Role:** buyer · compliance
- **From → to:** Submitted → Under Review
- **Operator — where:** `/buyer/supplier-applications` → open a *Submitted* row → side panel → **Start review**.
- **Operator — do:** take the file off the pile and put your name to it, so the queue can tell the applications nobody has opened yet from the ones already being worked.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Under Review
- **Tester — confirm:** status chip *Under Review*; the panel's *Decision* section gains a *Picked up* timestamp; the row moves from the *Waiting* tab to *In review*; toast *"Review started on {number} — It is now on your pile rather than the queue."* A seat without `application:review` sees *"Awaiting Compliance"* in that slot.
- **Tester — trigger event:** `t_application_start_review`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** the *Picked up* time is written by the store at the moment of the act; no name is recorded because none can be.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:195; src/pages-v2/BuyerSupplierApplications.tsx:930; src/services/query/commandHooks.ts:1357; src/services/data/mock/MockCommandService.ts:1959; src/lib/i18n/supplierApplications.ts:85; src/lib/i18n/supplierApplications.ts:106 -->

### t_application_approve — Approve <!-- transition:t_application_approve -->

- **Step kind:** operator action (terminal)
- **Role:** buyer · compliance
- **From → to:** Under Review → Approved
- **Operator — where:** `/buyer/supplier-applications` → open an *Under Review* row → **Approve** → the confirmation *Approve this applicant?* → **Yes, approve** (or **Cancel**).
- **Operator — do:** accept the applicant. The confirmation says what this does and does not do: *"This records the decision for {company}. It cannot be undone, and it creates no supplier record — the vendor master is raised in S/4HANA."*
- **Operator — fill:** nothing to fill — there is deliberately no text box on an approval.
- **Tester — expected state:** Approved
- **Tester — confirm:** status chip *Approved*; *Decided* and *Decided by* fill in (the latter *"Unattributed — no person in session"*); the row moves to the *Decided* tab; toast *"{number} approved — The decision is recorded. No supplier record was created."* The supplier directory does not change.
- **Tester — trigger event:** `t_application_approve`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** terminal and mints nothing. Creating the vendor master record is S/4HANA's act; a cascade from here into a supplier row would be this portal inventing master data it does not own. The consumer is named and the edge is not built.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:211; src/pages-v2/BuyerSupplierApplications.tsx:948; src/pages-v2/BuyerSupplierApplications.tsx:977; src/services/data/mock/MockCommandService.ts:1964; src/lib/i18n/supplierApplications.ts:91; src/lib/i18n/supplierApplications.ts:109 -->

### t_application_reject — Refuse <!-- transition:t_application_reject -->

- **Step kind:** operator action (terminal)
- **Role:** buyer · compliance
- **From → to:** Under Review → Rejected
- **Operator — where:** `/buyer/supplier-applications` → open an *Under Review* row → **Reject** → the confirmation *Refuse this applicant?* → the *Reason* box → **Yes, refuse** (or **Cancel**).
- **Operator — do:** decline, and say why in words somebody could repeat to the applicant. The button stays disabled until the box has text. The hint under it says why: *"The applicant holds no seat here, so this text is the only account of the decision that will exist."*
- **Operator — fill:** rejection reason (required, non-blank).
- **Tester — expected state:** Rejected
- **Tester — confirm:** status chip *Rejected*; *Decided*, *Decided by* and *Reason given* fill in; the row moves to the *Decided* tab; toast *"{number} refused — The decision and its reason are recorded."*
- **Tester — trigger event:** `t_application_reject`
- **Checks that can refuse:** `application_refusal_authored` — the reason must be a non-blank string; the required-field check alone would admit a string of spaces.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`.
- **Honesty:** terminal by ruling. There is no re-submit and no reopen — the applicant holds no verb, and an edge out of the refusal would be a Paragon person editing a decision Paragon already made. A second attempt is a second application through the same door, and the refused one stays exactly as decided.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:227; src/services/transitions/flows/supplierApplication.flow.ts:41; src/services/transitions/policies.ts:670; src/pages-v2/BuyerSupplierApplications.tsx:1002; src/services/data/mock/MockCommandService.ts:1972; src/lib/i18n/supplierApplications.ts:95; src/lib/i18n/supplierApplications.ts:101; src/lib/i18n/supplierApplications.ts:112 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **The decision (at Under Review).** Branch A — `t_application_approve` — **When:** compliance accepts the applicant; nothing is typed, and the record names the session's actor (today: unattributed). Branch B — `t_application_reject` — **When:** compliance declines; a written reason is required and is the only account the applicant will ever get.
- **Refusal is final.** There is no revise, reopen, withdraw or cancel on any state. **When** a refused company applies again: procurement raises a new application, which takes a new number; the refused row keeps its reason.
- **Extension of an existing vendor (at ∅ → Submitted).** **When** the request type is `Internal SR`: the vendor is picked from the roster and the platform resolves it; the application records both what was stated (`s4Vendor`) and what it resolved to (`resolvedSupplierId`). This does not make the application visible to that supplier.
- **No draft, no half-application.** **When** the raise panel is closed before **Yes, raise it**, nothing was recorded anywhere.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| SIMULATED — *"Sample — awaiting real supplier identities"* | external (liveness registry) | all states | always, until real supplier identities land (Stage F1) | `/buyer/supplier-applications` meta line (provenance marker) |
| *"Every application here was raised through the platform's own verbs, by a Paragon seat. None arrived from outside…"* | authored honesty note | all states | always | `/buyer/supplier-applications` meta line |
| *"Awaiting Procurement"* / *"Awaiting Compliance"* | derived at read (seat vs. atom) | ∅ → Submitted (raise); Submitted (review); Under Review (decide) | the seat does not hold the verb's atom | page header; raise panel body; side panel action slots |
| *"Unattributed — no person in session"* | derived at read | all states | always in the demo | panel *Raised by*, *Decided by*; the pre-act notice on the confirmation step |
| *"These are the applicant's own statements. Nothing here has been verified…"* | authored honesty note | all states | whenever declared documents are shown | panel *Declared documents* |
| *Waiting to be picked up* / *Being reviewed* / *Decided* | derived at read (state counts) | Submitted / Under Review / Approved+Rejected | always | KPI tiles and tabs |

No time-driven flag is derived: *Raised*, *Picked up* and *Decided* timestamps are displayed, and nothing compares them with the clock (measured — the lane joins no anchored date family).

<!-- src: src/services/liveness/registry.ts:312; src/lib/i18n/widget.ts:43; src/lib/i18n/supplierApplications.ts:18; src/lib/i18n/supplierApplications.ts:76; src/lib/i18n/supplierApplications.ts:81; src/lib/i18n/roles.ts:48; src/pages-v2/BuyerSupplierApplications.tsx:505 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `app-0001` (APP-2026-0001) — `External SR`, *PT Sample Emulsifiers (illustrative)*, three declared documents, in **Submitted**.

| Joins to | By | Note |
|---|---|---|
| Supplier roster (existing vendor) | `resolvedSupplierId` ← `s4Vendor` matched on the vendor's SAP business-partner number or id | Only for `Internal SR`; `null` for the other two types. Resolved at birth by the target, never echoed from the form. It says which supplier the application is *about*, not who owns the row. |
| Tenant / owner | `supplierId` — always `null` (the type says so literally) | An applicant is not a tenant; no supplier seat can see or act on an application, including the vendor an extension names. |
| Supplier documents (NPWP, NIB, halal, ISO) | `declarations[].kind` + `reference` | Claims with a reference string. No status, no verified flag, no expiry — verification is the `supplierDocument` lane's; nothing joins the two records by key. |
| Vendor master (S/4HANA) | none | Display-only expectation: approval records a decision; the vendor record is raised in S/4HANA and never arrives back here. |
| Actor | `submittedBy`, `decidedBy` (actor attributions, not names) | Written from the session; today always unattributed. |
| Timestamps | `submittedAt`, `reviewStartedAt`, `decidedAt` | Store-assigned at the moment of each act; `null` until then. |

<!-- src: src/services/data/types.ts:2330; src/services/data/mock/MockCommandService.ts:2006; src/services/data/mock/MockCommandService.ts:2021; src/services/data/mock/applicationSeed.ts:70 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` (the seat, not a person), `ts`, `outcome`, one `correlationId` per command; there are no cascades on this machine, so no event carries a `causationId`. Refusals are recorded with their reason.

Worked sequence for `app-0001` (APP-2026-0001) — the seed raises it at start-up under a procurement seat; a compliance seat continues:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Submitted | procurement (`buyer:all`) | raise — `External SR`, *PT Sample Emulsifiers (illustrative)*, declarations NPWP · NIB · halal | `t_application_submit` |
| T+1 (tester) | Submitted → Under Review | compliance (`buyer:all`) | **Start review** | `t_application_start_review` |
| T+2 (tester) | Under Review → Approved | compliance (`buyer:all`) | **Approve** → **Yes, approve** | `t_application_approve` |

For the refusal branch, walk `app-0002` (APP-2026-0002) the same way and choose **Reject** at T+2 with a written reason; the event is `t_application_reject`. After T+2 no further event is possible on either row.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:127; src/services/data/mock/applicationSeed.ts:128 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Raise an application** button; header reads *"Awaiting Procurement"* | handoff notice in the page header (and inside the raise panel if it was already open) | the seat does not hold `application:submit` | act from a seat holding the procurement lane |
| No **Start review** / **Approve** / **Reject**; panel reads *"Awaiting Compliance"* | handoff notice in the panel's action slot | the seat does not hold `application:review` / `application:decide` | route to a compliance seat |
| **Yes, raise it** stays disabled | form incomplete | request type or company missing; for `Internal SR`, no vendor picked | complete the form; pick the vendor from the roster |
| Toast *"Could not raise the application"* naming *requestType* | `POLICY_REJECTED:application_request_type_known` | a hand-crafted dispatch sent a request type outside the three | use one of `External SR`, `Internal SR`, `KOL` |
| Toast *"Could not raise the application"* naming *s4Vendor* | `POLICY_REJECTED:application_internal_vendor_resolved` | an `Internal SR` named a vendor the roster does not hold (not reachable from the picker) | pick from the roster |
| Toast naming *declarations* | `POLICY_REJECTED:application_declarations_well_formed` | a declaration with an unknown kind or a blank reference reached the dispatcher | fix or drop the malformed entry; the surface never sends blanks |
| Toast *"Could not refuse {number}"* | `MISSING_FIELDS:rejectionReason` or `POLICY_REJECTED:application_refusal_authored` | the reason box was empty or only spaces | write the reason |
| *"…not in a state this action can be taken from"* | `ILLEGAL_TRANSITION` | acting on a row that already moved (e.g. approving a *Submitted* row without starting review) | open the row again and take the act its state offers |
| Approved, but the company is not in the supplier directory | no change on `/buyer/suppliers` | expected — approval records a decision and mints nothing; the vendor master is S/4HANA's | nothing to do in the portal |
| A company that was refused wants to try again | the refused row is terminal | by design — no reopen | raise a new application |
| An applicant completed `/register` and nothing is on the pile | queue unchanged | `/register` is a walkthrough; it records nothing and reaches no queue | procurement raises the application on their behalf |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:SUP`, or `MODULE_INACTIVE:SUP.applications` when only *Applications* is off; where the surface checks first, the control reads *"Switched off — Supplier network"* | the Supplier network module (or one of its parts) is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:324; src/services/transitions/policies.ts:607; src/services/transitions/policies.ts:641; src/lib/i18n/supplierApplications.ts:18 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Submitted | `app-0001`; `app-0002` | APP-2026-0001; APP-2026-0002 | grown at start-up by the seed through `t_application_submit` under a procurement seat: `External SR` *PT Sample Emulsifiers (illustrative)* with three declarations; `KOL` *PT Sample Creator Studio (illustrative)* with one |
| Under Review | — | — | no fixture — press **Start review** on either row |
| Approved | — | — | no fixture — approve a row under review |
| Rejected | — | — | no fixture — refuse a row under review with a reason |

The store opens empty by ruling (nobody has ever applied); every row is produced by the verb. No `Internal SR` row is seeded — choosing which vendor to extend is a person's act, so raise one from the door to see the vendor resolve. All data is SIMULATED (see §5).

<!-- src: src/services/data/mock/stores/supplierApplicationStore.ts:36; src/services/data/mock/applicationSeed.ts:70; src/services/data/mock/applicationSeed.ts:37 -->
