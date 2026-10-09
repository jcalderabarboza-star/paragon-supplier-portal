---
entity: purchaseRequisition
locale: en
title: Purchase requisition
wired: true
owner: portal
source_sha: 08e00f854463fde2d0bd333ec5c89e1e845c1746
transitions:
  - t_pr_create
  - t_pr_submit
  - t_pr_approve
  - t_pr_reject
  - t_pr_revise
  - t_pr_source
  - t_pr_convert
---

<!-- section:summary -->
## 1 · What this process is

The internal request that starts everything: somebody in the plant needs something bought, and says so where it can be reviewed and traced. A purchase requisition (PR) is a buyer-internal document. Suppliers never see one — the record has no supplier owner, and a supplier seat that tries to act on one is refused before the role is even checked.

Two roles touch it. The **requisitioner** raises a requisition, sends it for approval, and — if it comes back declined — revises it and sends it again. **Procurement** decides: approve or reject, and a rejection must carry a written reason the requester can read. Once approved, procurement may raise a sourcing event (an RFQ) from the requisition; the requisition then moves on by itself as a consequence of the RFQ being raised, not by a button on the requisition. The default buyer seat holds every buyer lane, so out of the box one seat can raise and approve the same document; the platform records this as an open segregation finding rather than pretending it is enforced.

It starts at **Draft** and, in the tree as built, ends at **Approved** or **Sourcing Event**. The state **PO Created** is the declared ending, but nothing can reach it today: the step that would close the loop (`t_pr_convert`) is authored as a cascade with no link behind it — a purchase order is raised in S/4HANA and is meant to arrive here as a fact. **Rejected** is deliberately not an ending: a rejected requisition returns to the requester's hands and goes round again.

Honest markers. The demo data is **SIMULATED**: the intake surfaces carry the pill *"Sample — awaiting live PR producer (SOMO / Grid)"* and the six fixture rows are authored samples; one further row (`PR-2026-901`) is grown through the real verbs at start-up. The seat opens naming nobody, and a seat that names nobody may neither approve nor reject (`pr_decider_named`): the panel says so before the act, and the act is refused with nothing recorded. Adopt a sample user on the identity panel and the decision is recorded against that person, whose label carries *(SAMPLE)* because there is no user directory yet. The *"Routes to"* band on a requisition is authored on the document, not computed from its value, and the panel says that too.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | creation (operator action; or cascade from `t_intake_commit`) | requisitioner (or automation, via the cascade) | `t_pr_create` |
| 2 | Draft → Pending Approval | operator action | requisitioner | `t_pr_submit` |
| 3a | Pending Approval → Approved | operator action | procurement | `t_pr_approve` |
| 3b | Pending Approval → Rejected | operator action | procurement | `t_pr_reject` |
| 4 | Rejected → Draft | operator action | requisitioner | `t_pr_revise` |
| 5 | Approved → Sourcing Event | cascade (fired by `t_rfq_create`) | automation | `t_pr_source` |
| 6 | Approved, Sourcing Event → PO Created | cascade — unauthored, cannot fire | automation | `t_pr_convert` |

**Forks**

- **At Pending Approval:** `t_pr_approve` — procurement — when the need is real and funded; `t_pr_reject` — procurement — when the decision is no, with a written reason.
- **At Approved:** `t_pr_source` — automation — when procurement raises an RFQ from this requisition in the sourcing wizard; `t_pr_convert` — automation — declared for the case where a source of supply already exists and a PO is raised in S/4HANA, but no link fires it today.
- **At Rejected:** `t_pr_revise` — requisitioner — the only way out; it lands at Draft, and `t_pr_submit` is what returns it to the queue.

<!-- section:steps -->
## 3 · Step by step

### t_pr_create — Create requisition <!-- transition:t_pr_create -->

- **Step kind:** operator action (creation); also fired as a cascade from `t_intake_commit`
- **Role:** buyer · requisitioner; `automation` when the intake commit's cascade fires it — the source verb requires `intake:triage`, the **planning** lane's (ruling R1, PLN-3), so a planner raises the requisition and **procurement** approves it
- **From → to:** ∅ → Draft
- **Operator — where:** four entrances, all reaching the same verb.
  1. `/buyer/purchase-requisition` → **New PR** (page header) → the three-step form *Material & quantity* · *Timing & cost center* · *Business justification* → **Create requisition**.
  2. `/buyer/plan-grid` → **Intake review** tab (the old `/buyer/intake-review` link lands here) → on a pending line → **Accept as delivered**. The quantity is the one the producer delivered; nothing else is asked. This commits the intake line (`t_intake_commit`), and that commit's cascade creates the requisition — see the intake-line guide.
  3. `/buyer/plan-grid` → select an intake line → the *Adjust & push — selected line* drawer → **Push to PR**. The accepted quantity is the one editable field and starts at the producer's delivered quantity; if you change it, a reason is required before the button enables. This too commits the line, and the cascade creates the requisition.
  4. `/buyer/plan-grid` → **Raw materials** or **Packaging** tab → type or paste an accepted quantity into a cell → the planned-changes panel → **Push** on the row, **Push selection (n)** or **Push all (n)**. One commit per row, each cascading into its own requisition; the lines are generated sample proposals.
- **Operator — do:** write down what the plant needs so it exists as a document. The New PR form is fresh authoring; the three intake entrances commit a planned requirement line, and the commit raises one Draft requisition — never a second for the same line. Whichever door you use, the result is a Draft in the requester's hands — nothing reaches an approver yet.
- **Operator — fill:** material and quantity are required. Quantity is digits only, no thousands separator (the form refuses a blank, a non-number, and an ambiguous token such as "4.500"). The New PR form also asks for required date and cost center before it enables; priority and justification are optional. The intake entrances carry the line's unit, estimated value and producer mark, the line's id (`intakeLineId`) and its planning bucket (`periodBucket` — never a required date), plus the planner's decision when they moved the quantity. An estimated value is written only when one was supplied — the New PR form has no such field, so requisitions raised there show a dash, never "Rp 0".
- **Tester — expected state:** Draft
- **Tester — confirm:** a new row with a store-assigned number in the `PR-2026-9xx` range appears at the top of `/buyer/purchase-requisition`; the toast reads *"{number} created — Saved as a draft. Submit it when it is ready for approval."*; the intake row reads *"Committed → {number}"* on the plan grid's *Intake review* view and *"Pushed → {number}"* in the plan-grid drawer. Nothing appears on any supplier seat — requisitions are buyer-internal.
- **Tester — trigger event:** `t_pr_create`
- **Checks that can refuse:** none beyond role, legality and required fields. A supplier seat is refused at scope (`SCOPE_DENIED`) before the role gate.
- **Glossary:** `MISSING_FIELDS`, `SCOPE_DENIED`, `EMPTY_QTY` / `NOT_NUMERIC` / `AMBIGUOUS_QTY` (the quantity refusals).
- **Honesty:** the intake lines and the resulting requisitions are **SIMULATED** — the pill *"Sample — awaiting live PR producer (SOMO / Grid)"* sits on the plan grid, and a pushed line is never a live procurement instruction. Dismissing a line on the *Intake review* view is a recorded act on the intake line (`t_intake_dismiss`) — it survives a reload — and raises no requisition.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:34; src/pages-v2/BuyerRequisitions.tsx:611; src/pages-v2/BuyerRequisitions.tsx:372; src/pages-v2/BuyerRequisitions.tsx:1433; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:435; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:579; src/pages-v2/requisitions/prCreatePayload.ts:656; src/services/data/mock/MockCommandService.ts:755; src/services/data/mock/stores/purchaseRequisitionStore.ts:42; src/lib/i18n/requisitions.ts:32; src/lib/i18n/requisitions.ts:191; src/lib/i18n/intakeReview.ts:36-37; src/lib/i18n/planGrid.ts:77-85; src/services/liveness/registry.ts:281; src/services/transitions/flows/intakeLine.flow.ts:184-197; src/services/transitions/cascades.ts:75-77; src/services/data/mock/MockCommandService.ts:2762-2800; src/services/transitions/businessRoles.ts:619-632; src/pages-v2/plan-grid/planGridModel.ts:182-199; src/pages-v2/requisitions/prCreatePayload.ts:139-147; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:105-123; src/lib/i18n/planGrid.ts:164-165,196-198,424-425,455-457 -->

### t_pr_submit — Submit for approval <!-- transition:t_pr_submit -->

- **Step kind:** operator action
- **Role:** buyer · requisitioner
- **From → to:** Draft → Pending Approval
- **Operator — where:** `/buyer/purchase-requisition` → open a Draft row → side panel footer → **Submit for approval**.
- **Operator — do:** send the request out for a decision. Until this happens it is one person's note, not a claim on the budget; the panel's *"Draft — not yet in the approval queue"* section says nobody is waiting on it.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Pending Approval
- **Tester — confirm:** the status chip reads *Pending Approval*; the toast reads *"{number} submitted for approval — It is now in the approval queue and waiting on Procurement."*; the *Pending* tab and KPI count it. A seat without `pr:submit` sees *"Awaiting Requisitioner"* in that slot instead of the button.
- **Tester — trigger event:** `t_pr_submit`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** this verb existed for months with no caller; it was surfaced deliberately as the requester's act on a document that already exists, not as a second way to create one.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:61; src/pages-v2/BuyerRequisitions.tsx:861; src/pages-v2/BuyerRequisitions.tsx:465; src/services/query/commandHooks.ts:1076; src/lib/i18n/requisitions.ts:96; src/lib/i18n/requisitions.ts:169 -->

### t_pr_approve — Approve <!-- transition:t_pr_approve -->

- **Step kind:** operator action
- **Role:** buyer · procurement
- **From → to:** Pending Approval → Approved
- **Operator — where:** `/buyer/purchase-requisition` → open a *Pending Approval* row → side panel footer → **Approve**.
- **Operator — do:** agree the need is real and funded. Nothing is sourced or ordered before this.
- **Operator — fill:** nothing to fill. Who approved is taken from the session, never typed.
- **Tester — expected state:** Approved
- **Tester — confirm:** status chip *Approved*; the panel gains an *Approved by* line carrying the label of the person on the seat — a sample person is marked *(SAMPLE)*; the *Approved — ready to source* section appears with **Raise sourcing event**. Toast: *"{number} approved — Recorded against this requisition as approved by {person}."* Before the act the panel reads *"This will be recorded against {person}."* From a seat that names nobody it reads instead *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."*; **Approve** stays live, and pressing it leaves the row at *Pending Approval* with the toast *"{number} was not approved"* and *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* A requisitioner seat sees *"Awaiting Procurement"* instead of the button.
- **Tester — trigger event:** `t_pr_approve`
- **Checks that can refuse:** `pr_decider_named` — the seat must name a person (`PR_DECIDER_UNATTRIBUTED`); it runs first, and on a refusal nothing is recorded. A sample person is admitted. `pr_approval_attributed` runs second — two halves of one rule: the request must not try to say who approved (a payload key `approvedBy` is refused by name, whatever its value), and the session must carry an actor.
- **Glossary:** `POLICY_REJECTED`, `ACTOR_IN_PAYLOAD`, `NO_PERSON_IN_SESSION`.
- **Honesty:** every approval is recorded against a named person — in the demo a sample one, marked as such wherever it renders, because there is no user directory yet. The *"Routes to"* band shown on the document (Section Head / Procurement Head / VP Procurement) is authored on the fixture — it is not derived from the value and it does not decide who may approve.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:87; src/services/transitions/policies.ts:574; src/pages-v2/BuyerRequisitions.tsx:948; src/pages-v2/BuyerRequisitions.tsx:434; src/services/data/mock/MockCommandService.ts:740; src/lib/i18n/requisitions.ts:83; src/lib/i18n/requisitions.ts:175; src/lib/i18n/requisitions.ts:135; src/services/transitions/flows/purchaseRequisition.flow.ts:94; src/services/transitions/policyHooks.ts:1021; src/services/transitions/policies.ts:2850; src/services/transitions/policies.ts:2912; src/pages-v2/BuyerRequisitions.tsx:1294; src/pages-v2/BuyerRequisitions.tsx:543; src/pages-v2/BuyerRequisitions.tsx:612; src/lib/namedSeatRefusal.ts:21; src/lib/i18n/identity.ts:80-86; src/lib/i18n/requisitions.ts:195 -->

### t_pr_reject — Reject <!-- transition:t_pr_reject -->

- **Step kind:** operator action
- **Role:** buyer · procurement
- **From → to:** Pending Approval → Rejected
- **Operator — where:** `/buyer/purchase-requisition` → open a *Pending Approval* row → **Reject** → the *Reason for rejection* box → **Confirm rejection** (or **Cancel**).
- **Operator — do:** the decision is no. Write what the requester needs to change; the button stays disabled until the box has text.
- **Operator — fill:** rejection reason (required, must contain more than spaces).
- **Tester — expected state:** Rejected
- **Tester — confirm:** status chip *Rejected*; the panel shows *"Rejected because"* with the text verbatim; toast *"{number} rejected — The reason is recorded on the requisition."* From a seat that names nobody the panel says so before the act, and **Confirm rejection** toasts *"{number} was not rejected"* with the same refusal sentence as on **Approve**; the row stays *Pending Approval* and no reason is recorded.
- **Tester — trigger event:** `t_pr_reject`
- **Checks that can refuse:** `pr_decider_named` — the seat must name a person (`PR_DECIDER_UNATTRIBUTED`); it runs first, nothing is recorded, and the reason is not examined. `pr_reject_reason_authored` — the reason must be a non-blank string. The required-field check alone admits a string of spaces; this hook is what stops that.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`.
- **Honesty:** the reason is persisted on the document and stays there while the requester revises it — only a fresh rejection replaces it. Nothing can prove the text is true or responsive; the guard proves only that something was written.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:98; src/services/transitions/policies.ts:485; src/pages-v2/BuyerRequisitions.tsx:937; src/pages-v2/BuyerRequisitions.tsx:967; src/pages-v2/BuyerRequisitions.tsx:563; src/services/data/mock/MockCommandService.ts:718; src/lib/i18n/requisitions.ts:85; src/lib/i18n/requisitions.ts:87; src/services/transitions/flows/purchaseRequisition.flow.ts:121; src/services/transitions/policies.ts:2912; src/pages-v2/BuyerRequisitions.tsx:1294; src/lib/namedSeatRefusal.ts:21; src/lib/i18n/identity.ts:83-86 -->

### t_pr_revise — Revise and return to draft <!-- transition:t_pr_revise -->

- **Step kind:** operator action
- **Role:** buyer · requisitioner
- **From → to:** Rejected → Draft
- **Operator — where:** `/buyer/purchase-requisition` → open a *Rejected* row → **Revise and return to draft** → the *What changed* box → **Save revision** (or **Cancel**).
- **Operator — do:** take the declined request back, record what you changed in response to the rejection, and then submit it again. A bare reopen straight back to the queue was refused by ruling: the approver would see the same document they already declined.
- **Operator — fill:** revision note (required, non-blank) — what changed, not why it was rejected.
- **Tester — expected state:** Draft
- **Tester — confirm:** status chip *Draft*; the panel shows *"Revised — what changed"* beside the earlier *"Rejected because"*; toast *"{number} returned to draft — The note is recorded on the requisition. Submit it again when it is ready."*; **Submit for approval** is offered again.
- **Tester — trigger event:** `t_pr_revise`
- **Checks that can refuse:** `pr_revision_note_authored` — the note must be a non-blank string.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** a distinct permission (`pr:revise`) from creating a requisition; each revision replaces the previous note. No fixture ships in *Rejected* — reach it by rejecting `PR-2026-00344`.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:143; src/services/transitions/policies.ts:508; src/pages-v2/BuyerRequisitions.tsx:884; src/pages-v2/BuyerRequisitions.tsx:512; src/services/data/mock/MockCommandService.ts:732; src/lib/i18n/requisitions.ts:98; src/lib/i18n/requisitions.ts:100 -->

### t_pr_source — Raised as a sourcing event <!-- transition:t_pr_source -->

- **Step kind:** cascade (fired by `t_rfq_create`)
- **Role:** automation (`pr:source` is held by no seat; it runs under the automation grant)
- **From → to:** Approved → Sourcing Event
- **Operator — where:** nobody presses this on the requisition. Procurement starts it from `/buyer/purchase-requisition` → an *Approved* row → **Raise sourcing event**, which opens the sourcing wizard at `/buyer/sourcing` with the requisition pre-selected in **Raise from requisition** (the wizard's first, optional field); or from the wizard directly, choosing an approved requisition in that field. The cascade fires when the RFQ is actually created.
- **Operator — do:** the need is going out to several suppliers for offers rather than straight to a known one. Complete the wizard as for any RFQ (title, category, materials, quantity, invited suppliers, deadlines). Opening the wizard and closing it changes nothing on the requisition.
- **Operator — fill:** nothing on the requisition itself. The wizard's own fields are the RFQ's; the requisition prefill carries what it can (its category only when it is an exact RFQ category — `Fragrance`, `Active Ingredients`, `Packaging`, `Emulsifiers`, `Botanical`, `Other`).
- **Tester — expected state:** Sourcing Event
- **Tester — confirm:** status chip *Sourcing Event*; the *Linked doc* column and the panel's *Linked document* line show the new RFQ number; the *Sourcing* tab counts it. In the audit trail the requisition's event carries a `causationId` equal to the RFQ creation's `correlationId`. A requisitioner seat sees *"Awaiting Procurement"* in place of the button, because raising a sourcing event is `rfq:create`, a procurement atom.
- **Tester — trigger event:** `t_pr_source`
- **Checks that can refuse:** none of its own. The cascade only fires for an RFQ whose payload names an existing requisition; it is refused by legality (`ILLEGAL_TRANSITION`) if that requisition is not *Approved*, and that refusal is recorded. Most RFQs are not raised from a requisition and cascade onto nothing — that is the ordinary path, not a failure.
- **Glossary:** `ILLEGAL_TRANSITION`.
- **Honesty:** `/buyer/process-flows` badges this step as computed — decided by the source-of-supply data rather than by a person choosing it here. The *Source of supply* section on the panel (*PIR exists* / *No source*) is authored fixture text; nothing in the portal checks a PIR.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:162; src/services/transitions/cascades.ts:54; src/services/data/mock/MockCommandService.ts:2912; src/services/data/mock/MockCommandService.ts:749; src/pages-v2/BuyerRequisitions.tsx:559; src/pages-v2/BuyerRequisitions.tsx:1137; src/pages-v2/BuyerSourcing.tsx:1889; src/pages-v2/sourcing/requisitionPrefill.ts:145; src/lib/i18n/requisitions.ts:117; src/lib/i18n/sourcing.ts:256; src/services/transitions/businessRoles.ts:619-632 -->

### t_pr_convert — Converted to a purchase order <!-- transition:t_pr_convert -->

- **Step kind:** cascade — unauthored; not active (no link, no caller)
- **Role:** automation (`pr:convert` is held by no seat)
- **From → to:** Approved, Sourcing Event → PO Created
- **Operator — where:** not offered anywhere today. The panel's *Approved — ready to source* text says it plainly: *"Direct PO conversion is not available here: a purchase order is raised in S/4 and arrives as a fact."*
- **Operator — do:** nothing can be done in the portal. The requisition's loop closes when S/4HANA raises the order — an integration that has not landed.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** PO Created — **unreachable by any act today**. The two fixture rows in this state were authored there.
- **Tester — confirm:** only the fixtures `pr-001` / `pr-006` show *PO Created* with a linked PO number; no dispatch will produce a third.
- **Tester — trigger event:** `t_pr_convert` (never emitted by this tree)
- **Checks that can refuse:** not applicable — no cascade link exists in `cascades.ts`, so the dispatcher never constructs this command.
- **Glossary:** `UNKNOWN_TRANSITION` does not apply (the id is registered); the step is simply never fired.
- **Honesty:** declared, not emitted. The registry carries the transition so `/buyer/process-flows` can show where the machine ends, and the target writes no field for this state. It waits on the S/4HANA event seam (Stage F2).
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:180; src/services/transitions/cascades.ts:24; src/services/data/mock/MockCommandService.ts:701; src/lib/i18n/requisitions.ts:118; src/services/data/mock/fixtures/buyerRequisitions.ts:22 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **The decision (at Pending Approval).** Branch A — `t_pr_approve` — **When:** procurement accepts the need as real and funded; no text is asked for, and the record names the person on the seat. Branch B — `t_pr_reject` — **When:** the answer is no; a written reason is required and is shown to the requester verbatim. **When** the seat names no person: either branch is refused by name (`PR_DECIDER_UNATTRIBUTED`) before anything else is checked, nothing is recorded, and the requisition stays at *Pending Approval*.
- **Rejection and recourse (at Rejected).** `t_pr_revise` — **When:** the requester has changed the document in response to the reason. It lands at Draft, never straight back in the queue, and `t_pr_submit` is the second half of the revision. There is no other exit: a rejected requisition that nobody revises stays visible as *Rejected* with its reason.
- **What happens after approval (at Approved).** Branch A — `t_pr_source` — **When:** procurement raises an RFQ from the requisition (the *Raise from requisition* field in the sourcing wizard); the requisition records the RFQ number as its linked document. Branch B — `t_pr_convert` — **When:** never, today. The direct-PO path is declared for a source of supply that already exists and is owned by S/4HANA.
- **A dead end that is real.** *Sourcing Event* has one declared exit (`t_pr_convert`) and it cannot fire, so a requisition that reaches *Sourcing Event* stays there; the RFQ's own award and the resulting PO live on their own documents.
- **No cancel, no withdraw.** The machine has no cancel or withdraw edge on any state. A Draft nobody submits simply stays a Draft.

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| SIMULATED — *"Sample — awaiting live PR producer (SOMO / Grid)"* | external (liveness registry) | all states | always, until a real intake producer lands | `/buyer/plan-grid` header pill and cell markers |
| *"Awaiting Requisitioner"* / *"Awaiting Procurement"* | derived at read (seat vs. atom) | the state the withheld verb acts on | the seat does not hold the verb's atom | `/buyer/purchase-requisition` header (New PR) and panel footer; plan-grid drawer (an intake commit reads *"Awaiting Planning"* since PLN-3) |
| *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."* | derived at read (the seat's actor) | Pending Approval | the seat holds approve or reject and names no person; with a sample user adopted the line reads *"This will be recorded against {person}."* | panel, above the footer; on pressing the button, the failure toast |
| *(SAMPLE)* beside the approver | derived at read (the one person-label resolver) | Approved and later | the approver is a sample person — every approval taken in the demo | panel *Approved by* line; approval toast |
| *"Authored on the document — not derived from the estimated value."* | authored (display-only) | all states | whenever a *Routes to* band is present; *Not assigned* when it is empty | panel *Key facts* |
| *Committed → {number}* / *Refused: {reason}* (*Intake review* view); *Pushed → {number}* / *Push failed: {reason}* (plan-grid drawer) | derived at read — the number from the requisition that names the line; the refusal for this session only | ∅ → Draft | after an intake commit succeeds or is refused; a committed line whose requisition is not in this session's store reads *"Committed — its requisition is not in this session’s store"* | plan grid *Intake review* triage column; its drawer footer |
| *Dismissed* | operator-raised (recorded on the intake line — `t_intake_dismiss`) | intake lines (pre-PR) | a line was set aside on the *Intake review* view; it survives a reload until **Restore** | plan grid *Intake review* view; the line's plan-tab cell |

No time-driven flag is derived for a requisition: the required date is displayed but nothing compares it with the clock (measured — no relational read of `requiredDate` exists).

<!-- src: src/services/liveness/registry.ts:281; src/lib/i18n/widget.ts:25; src/lib/i18n/roles.ts:48; src/pages-v2/BuyerRequisitions.tsx:611; src/pages-v2/BuyerRequisitions.tsx:1368; src/lib/i18n/requisitions.ts:108; src/lib/i18n/requisitions.ts:135; src/lib/i18n/intakeReview.ts:45-49; src/lib/i18n/planGrid.ts:79-85; src/services/data/mock/stores/intakeLineStore.ts:1-56; src/pages-v2/BuyerRequisitions.tsx:1294; src/lib/i18n/identity.ts:80-86; src/services/identity/personLabel.ts -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `pr-003` (PR-2026-00343) — *Sample Floral Accord FG-2847*, 100 KG, in **Sourcing Event**, linked to `RFQ-2026-004`.

| Joins to | By | Note |
|---|---|---|
| RFQ (sourcing event) | `linkedDoc` = the RFQ's number | Written by the `t_pr_source` cascade from the raising RFQ's number; on the fixtures it was hand-authored. The RFQ carries `sourceRequisitionId` in its creation payload only — the RFQ record itself does not read the requisition back. |
| Purchase order | `linkedDoc` = a PO number (`PO-2026-00108` on `pr-001`) | Display-only. Nothing in the portal writes a PO number onto a requisition; the two *PO Created* rows are authored. |
| Intake line (plan grid · *Intake review* view) | `intakeLineId` = the line's id; `source` = `INTERNAL_GRID` or `SOMO`; `periodBucket` | Written only when the requisition came through an intake commit — the line's id, the producer mark and the planning bucket (a bucket, never a required date). The New PR form leaves all three absent. A committed line finds its requisition through `intakeLineId`; the line stores no PR number. |
| Approver | `approvedBy` (an actor attribution, not a name) | Written from the session on approval, and always a named person: a seat that names nobody is refused. In the demo that is a sample person. The fixture rows authored at *Approved* or later carry no approver, so their panel shows no *Approved by* line. |
| Cost center, requestor, category | plain fields | Authored on the fixture or typed on the form; nothing resolves them against a master. |
| Approval band | `approvalLevel` (*Routes to*) | Authored; `''` means *Not assigned*. Not a record of who approved. |
| Estimated value | `estimatedValue` (optional) | Present only when supplied; a dash otherwise. Never a fabricated zero. |
| Source of supply | `sourceOfSupply` (*PIR exists* / *No source*) | Authored fixture text; the portal does not query PIRs or outline agreements. |

<!-- src: src/services/data/types.ts:920; src/services/data/mock/fixtures/buyerRequisitions.ts:24; src/services/data/mock/MockCommandService.ts:749; src/services/data/mock/MockCommandService.ts:755 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` for every buyer seat (the audit actor names the seat, not a person), `ts`, `outcome`, a `correlationId` per command, and on a cascade a `causationId` pointing at the command that caused it. A separate `attribution` field carries who could be named: always a person on an accepted approval or rejection, and *unattributed* on the other verbs unless the seat has adopted a sample user. Refused commands are recorded too, with their reason.

Worked sequence for `PR-2026-901`, which the start-up seed grows through the real verbs (two scopes — a requisitioner seat that names nobody raises and submits, a procurement seat carrying a sample person approves):

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Draft | requisitioner (`buyer:all`) | creation — `Wardah Floral Accord`, 250 KG | `t_pr_create` |
| T+1 | Draft → Pending Approval | requisitioner (`buyer:all`) | submit | `t_pr_submit` |
| T+2 | Pending Approval → Approved | procurement (`buyer:all`) | approve, no `approvedBy` in the payload; recorded against the sample procurement person | `t_pr_approve` |
| T+3 (tester) | Approved → Sourcing Event | automation, `causationId` = the RFQ's `correlationId` | procurement raises an RFQ with *Raise from requisition* = `PR-2026-901` | `t_pr_source` |

A tester continuing from T+3 will find no further event: `t_pr_convert` is never emitted.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:127; src/services/data/mock/requisitionSeed.ts:23; src/services/data/mock/requisitionSeed.ts:119; src/services/data/mock/requisitionSeed.ts:90; src/services/transitions/dispatcher.ts:480 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **New PR** button; header shows *"Awaiting Requisitioner"* | handoff notice in the page header | the seat does not hold `pr:create` (e.g. a procurement-only seat) | act from a seat holding the requisitioner lane, or narrow/adopt on the identity panel |
| **Approve** / **Reject** missing; footer shows *"Awaiting Procurement"* | handoff notice in the panel footer on a *Pending Approval* row | the seat does not hold `pr:approve` / `pr:reject` — including a **planning** seat that raised the requisition from the grid: planning commits, procurement approves (R1, PLN-3) | route the decision to a procurement seat |
| Toast *"… was not approved"* or *"… was not rejected"* with *"Refused: this seat names nobody, and this act is recorded against the person who takes it…"* | `POLICY_REJECTED:pr_decider_named` (`PR_DECIDER_UNATTRIBUTED`); the panel said so before the act | the seat names nobody — no sample user is selected on the identity panel | adopt a sample user on the identity panel, then take the act again |
| Toast *"… was not approved"* with *"Your role is not allowed…"* | `ROLE_NOT_PERMITTED:pr:approve` | a hand-crafted dispatch without the atom (the surface withholds the button) | same as above |
| Toast *"… was not rejected"* naming *rejectionReason* | `MISSING_FIELDS:rejectionReason` or `POLICY_REJECTED:pr_reject_reason_authored` | the reason box was empty or only spaces | write the reason, then confirm |
| Toast *"… was not revised"* | `MISSING_FIELDS:revisionNote` / `POLICY_REJECTED:pr_revision_note_authored` | *What changed* left blank | write what changed |
| *"The request tried to say who performed it"* | `ACTOR_IN_PAYLOAD` or `POLICY_REJECTED:pr_approval_attributed` | a caller sent `approvedBy` in the payload | remove it — the session names the actor |
| *"…not in a state this action can be taken from"* | `ILLEGAL_TRANSITION` | the row moved after the panel opened (the panel re-reads the store, but a stale dispatch can still arrive) | re-open the row and act on its current state |
| Quantity refused in red under the field | *"a blank field is not a zero"* / *"not a quantity"* / *"can be read two ways"* | blank, non-numeric or separator-ambiguous quantity | type digits only, e.g. 4500 |
| Raised an RFQ but the requisition still says *Approved* | *Linked doc* empty; no `t_pr_source` event | the wizard's *Raise from requisition* field was left at *"Not from a requisition"*, or the chosen requisition was not *Approved* (recorded as `ILLEGAL_TRANSITION` on the cascade) | raise again from the requisition's own **Raise sourcing event** button, or pick it in the wizard |
| *"This is outside what your account may see — or there is no such record"* | `SCOPE_DENIED` | a supplier seat reached a requisition verb | requisitions are buyer-internal; nothing to do on the supplier side |
| Requisition stuck at *Sourcing Event* / never *PO Created* | no exit is offered | `t_pr_convert` has no link; PO conversion is S/4HANA's act | expected today; not a defect to chase |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:REQ`; where the surface checks first, the control reads *"Switched off — Requisitions"* | the Requisitions module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:324; src/lib/i18n/requisitions.ts:201; src/services/data/mock/MockCommandService.ts:2918; src/services/transitions/policies.ts:2912; src/lib/namedSeatRefusal.ts:21; src/lib/i18n/identity.ts:85 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | `pr-005` | PR-2026-00345 | *Folding Carton 150gsm Wardah*; use it to walk **Submit for approval** |
| Pending Approval | `pr-004` | PR-2026-00344 | *Halal Glycerin 99.5%*; use it to walk **Approve** or **Reject** |
| Approved | `PR-2026-901`; `pr-002` | PR-2026-901; PR-2026-00342 | `PR-2026-901` is grown at start-up through create → submit → approve, approved by a sample procurement person, and is the one whose category (`Fragrance`) the sourcing wizard can carry; `pr-002` (*Packaging Primary*) can be sourced but its category is not prefilled, and as an authored row it shows no *Approved by* line |
| Sourcing Event | `pr-003` | PR-2026-00343 | linked to `RFQ-2026-004` (authored) |
| PO Created | `pr-001`; `pr-006` | PR-2026-00341; PR-2026-00340 | authored endings; linked to `PO-2026-00108` / `PO-2026-00106`; unreachable by any act |
| Rejected | — | — | no fixture — reject `PR-2026-00344` to produce one |

All rows are SIMULATED sample data (see §5). Store-assigned numbers for new requisitions continue from `PR-2026-901` upward within a session.

<!-- src: src/services/data/mock/fixtures/buyerRequisitions.ts:22; src/services/data/mock/requisitionSeed.ts:60; src/services/data/mock/requisitionSeed.ts:90; src/services/data/mock/stores/purchaseRequisitionStore.ts:42 -->
